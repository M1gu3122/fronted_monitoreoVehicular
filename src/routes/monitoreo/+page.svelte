<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { listarVisitas } from '#lib/service/visitas.js';
	import { listarVehiculos } from '#lib/service/vehiculos.js';
	import { listarZonas } from '#lib/service/zonas.js';
	import { listarCamaras } from '#lib/service/camaras.js';
	import { listarEventos } from '#lib/service/eventos.js';
	import { errorMessage } from '#lib/service/client.js';
	import { preferences } from '#lib/stores/preferences.svelte.js';
	import {
		formatDateTime,
		formatDuration,
		formatNumber,
		minutesBetween,
		parseDate
	} from '#lib/utils/format.js';
	import { visitStatus, eventLabel } from '#lib/utils/domain.js';
	import { paginate, includesText } from '#lib/utils/data.js';

	let visitas = $state([]);
	let vehiculos = $state([]);
	let zonas = $state([]);
	let camaras = $state([]);
	let eventos = $state([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state('');
	let warnings = $state([]);
	let lastUpdated = $state(null);

	let search = $state('');
	let estadoFilter = $state(page.url.searchParams.get('estado') || 'abierta');
	let zonaFilter = $state(page.url.searchParams.get('zona') || '');
	let permanenciaFilter = $state(page.url.searchParams.get('permanencia') || 'todas');
	let pageNumber = $state(1);

	const vehiculoById = $derived(new Map(vehiculos.map((item) => [Number(item.id_vehiculo), item])));
	const zonaById = $derived(new Map(zonas.map((item) => [Number(item.id_zona), item])));
	const camaraById = $derived(new Map(camaras.map((item) => [Number(item.id_camara), item])));

	const latestEventByVisit = $derived.by(() => {
		const map = new Map();
		for (const evento of eventos) {
			const key = Number(evento.id_visita);
			const current = map.get(key);
			const date = parseDate(evento.fecha_hora);
			const currentDate = current ? parseDate(current.fecha_hora) : null;
			if (!current || (date && (!currentDate || date > currentDate))) map.set(key, evento);
		}
		return map;
	});

	const enriched = $derived(
		visitas.map((visita) => {
			const vehiculo = vehiculoById.get(Number(visita.id_vehiculo)) || null;
			const lastEvent = latestEventByVisit.get(Number(visita.id_visita)) || null;
			const zona = lastEvent ? zonaById.get(Number(lastEvent.id_zona)) : null;
			const camara = lastEvent ? camaraById.get(Number(lastEvent.id_camara)) : null;
			const status = visitStatus(visita);
			const minutes = minutesBetween(visita.fecha_entrada, visita.fecha_salida || null);
			return {
				visita,
				vehiculo,
				lastEvent,
				zona,
				camara,
				status,
				minutes,
				exceeded: status.key === 'abierta' && minutes !== null && minutes > Number(preferences.umbralPermanenciaMin)
			};
		})
	);

	const inside = $derived(enriched.filter((item) => item.status.key === 'abierta'));

	const filtered = $derived.by(() => {
		return enriched
			.filter((item) => {
				if (estadoFilter === 'abierta' && item.status.key !== 'abierta') return false;
				if (estadoFilter === 'finalizada' && item.status.key !== 'finalizada') return false;
				if (estadoFilter === 'sin-identificar' && item.vehiculo) return false;
				if (zonaFilter && Number(item.lastEvent?.id_zona) !== Number(zonaFilter)) return false;
				if (permanenciaFilter === 'excedida' && !item.exceeded) return false;
				if (permanenciaFilter === 'sin-salida' && item.status.key !== 'abierta') return false;
				if (search) {
					const haystack = [
						item.visita.id_visita,
						item.vehiculo?.placa,
						item.vehiculo?.marca,
						item.vehiculo?.modelo,
						item.vehiculo?.color,
						item.zona?.nombre,
						item.camara?.nombre
					]
						.filter(Boolean)
						.join(' ');
					if (!includesText(haystack, search)) return false;
				}
				return true;
			})
			.sort((a, b) => (parseDate(b.visita.fecha_entrada)?.getTime() || 0) - (parseDate(a.visita.fecha_entrada)?.getTime() || 0));
	});

	const paged = $derived(paginate(filtered, pageNumber, Number(preferences.pageSize) || 10));

	const identified = $derived(filtered.filter((item) => item.vehiculo).length);
	const unidentified = $derived(filtered.filter((item) => !item.vehiculo).length);

	async function load(silent = false) {
		if (refreshing) return;
		if (silent) refreshing = true;
		else loading = true;
		error = '';
		warnings = [];

		const requests = [
			['visitas', listarVisitas, 'Visitas', true],
			['vehiculos', listarVehiculos, 'Vehículos', false],
			['zonas', listarZonas, 'Zonas', false],
			['camaras', listarCamaras, 'Cámaras', false],
			['eventos', listarEventos, 'Eventos', false]
		];
		const results = await Promise.allSettled(requests.map(([, fn]) => fn()));
		const next = { visitas, vehiculos, zonas, camaras, eventos };
		const failures = [];

		results.forEach((result, index) => {
			const [key, , label, critical] = requests[index];
			if (result.status === 'fulfilled') {
				next[key] = Array.isArray(result.value) ? result.value : [];
			} else {
				next[key] = [];
				failures.push({ label, message: errorMessage(result.reason), critical });
			}
		});

		visitas = next.visitas;
		vehiculos = next.vehiculos;
		zonas = next.zonas;
		camaras = next.camaras;
		eventos = next.eventos;
		warnings = failures.filter((item) => !item.critical);
		const critical = failures.find((item) => item.critical);
		if (critical) error = critical.message;
		lastUpdated = new Date();
		loading = false;
		refreshing = false;
	}

	onMount(() => {
		load();
		const handleRefresh = () => load(true);
		window.addEventListener('lpr:refresh', handleRefresh);
		return () => window.removeEventListener('lpr:refresh', handleRefresh);
	});

	$effect(() => {
		const seconds = Math.max(10, Number(preferences.refreshIntervalSec) || 30);
		const interval = setInterval(() => {
			if (!document.hidden && !loading) load(true);
		}, seconds * 1000);
		return () => clearInterval(interval);
	});

	function resetFilters() {
		search = '';
		estadoFilter = 'abierta';
		zonaFilter = '';
		permanenciaFilter = 'todas';
		pageNumber = 1;
	}

	function openVisit(id) {
		goto(`/visitas/${id}`);
	}

	const activeAverage = $derived.by(() => {
		const values = inside.map((item) => item.minutes).filter((value) => value !== null);
		if (!values.length) return null;
		return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
	});
</script>

<PageHeader
	eyebrow="Operación en vivo"
	title="Monitoreo vehicular"
	description="Vehículos observados por el sistema dentro del área supervisada. La zona y la cámara corresponden al último evento asociado a la visita."
>
	{#snippet actions()}
		{#if lastUpdated}
			<span class="text-faint fs-8">Actualizado {formatDateTime(lastUpdated)}</span>
		{/if}
		<button class="btn btn-quiet" type="button" onclick={() => load(true)} disabled={refreshing}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel"><LoadingState rows={7} message="Cargando visitas y eventos recientes…" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState
				title="No fue posible cargar el monitoreo"
				message={error}
				hint="El listado de visitas es la fuente principal del monitoreo. Revise el backend y PostgreSQL."
				onretry={() => load()}
			/>
		</div>
	</div>
{:else}
	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Información parcial</strong>
				<span>{warnings.map((item) => item.label).join(', ')} no pudieron cargarse. La zona, cámara o identificación pueden aparecer incompletas.</span>
			</div>
		</div>
	{/if}

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Dentro del área</div>
				<div class="stat-card__value mt-1">{formatNumber(inside.length)}</div>
				<div class="fs-8 text-faint">visitas abiertas en la API</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Permanencia media</div>
				<div class="stat-card__value mt-1">{activeAverage !== null ? formatDuration(activeAverage) : '—'}</div>
				<div class="fs-8 text-faint">solo visitas abiertas</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Sobre el umbral</div>
				<div class="stat-card__value mt-1">{formatNumber(inside.filter((item) => item.exceeded).length)}</div>
				<div class="fs-8 text-faint">umbral local {preferences.umbralPermanenciaMin} min</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Sin identificación</div>
				<div class="stat-card__value mt-1">{formatNumber(inside.filter((item) => !item.vehiculo).length)}</div>
				<div class="fs-8 text-faint">visitas sin vehículo asociado</div>
			</div>
		</div>
	</div>

	<section class="panel">
		<div class="panel__head">
			<div>
				<h3>Vehículos observados</h3>
				<p>{filtered.length} de {enriched.length} visitas · {identified} identificadas{unidentified ? ` · ${unidentified} sin identificar` : ''}</p>
			</div>
			<div class="panel__head-tools">
				<span class="pill pill--outline">Auto: {preferences.refreshIntervalSec}s</span>
			</div>
		</div>

		<div class="filter-bar">
			<div class="filter-field filter-field--grow">
				<label for="mon-search">Buscar</label>
				<div class="input-group input-group-sm">
					<span class="input-group-text"><Icon name="search" size={14} /></span>
					<input
						id="mon-search"
						class="form-control form-control-sm"
						placeholder="Placa, marca, modelo o visita"
						bind:value={search}
						oninput={() => (pageNumber = 1)}
					/>
				</div>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="mon-estado">Estado</label>
				<select
					id="mon-estado"
					class="form-select form-select-sm"
					bind:value={estadoFilter}
					onchange={() => (pageNumber = 1)}
				>
					<option value="abierta">Dentro del área</option>
					<option value="finalizada">Finalizadas</option>
					<option value="sin-identificar">Sin identificar</option>
					<option value="todas">Todas</option>
				</select>
			</div>
			<div class="filter-field filter-field--md">
				<label for="mon-zona">Última zona</label>
				<select id="mon-zona" class="form-select form-select-sm" bind:value={zonaFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todas las zonas</option>
					{#each zonas as zona (zona.id_zona)}
						<option value={zona.id_zona}>{zona.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--md">
				<label for="mon-perm">Permanencia</label>
				<select
					id="mon-perm"
					class="form-select form-select-sm"
					bind:value={permanenciaFilter}
					onchange={() => (pageNumber = 1)}
				>
					<option value="todas">Cualquier tiempo</option>
					<option value="excedida">Excede {preferences.umbralPermanenciaMin} min</option>
					<option value="sin-salida">Sin salida registrada</option>
				</select>
			</div>
			<div class="filter-bar__end">
				<button class="btn btn-quiet btn-sm" type="button" onclick={resetFilters}>
					<Icon name="filter" size={14} />
					Limpiar
				</button>
			</div>
		</div>

		{#if !filtered.length}
			<EmptyState
				icon="car"
				title={enriched.length ? 'Sin coincidencias' : 'No hay visitas dentro del área'}
				message={enriched.length
					? 'Ajuste la búsqueda o los filtros para consultar otras visitas.'
					: 'El backend no reporta visitas sin salida. Verifique que el procesamiento de visión artificial esté registrando entradas.'}
				actionLabel={enriched.length ? 'Limpiar filtros' : ''}
				onaction={resetFilters}
			/>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Visita</th>
							<th>Vehículo</th>
							<th>Última zona</th>
							<th>Entrada</th>
							<th>Permanencia</th>
							<th>Última cámara</th>
							<th>Estado</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each paged.items as item (item.visita.id_visita)}
							<tr class="is-clickable" onclick={() => openVisit(item.visita.id_visita)}>
								<td class="nowrap">
									<span class="cell-strong">#{item.visita.id_visita}</span>
									<span class="cell-sub">ID de visita</span>
								</td>
								<td>
									{#if item.vehiculo}
										<div class="d-flex align-items-center gap-2">
											<span class="plate">{item.vehiculo.placa}</span>
											{#if item.exceeded}
												<span class="pill pill--danger" title="Supera el umbral local de permanencia">Umbral</span>
											{/if}
										</div>
										<span class="cell-sub">
											{[item.vehiculo.marca, item.vehiculo.modelo, item.vehiculo.color].filter(Boolean).join(' · ') || 'Sin datos de vehículo'}
										</span>
									{:else}
										<span class="plate plate--pending">Placa pendiente</span>
										<span class="cell-sub">Vehículo no disponible en el registro</span>
									{/if}
								</td>
								<td>
									{#if item.zona}
										<span class="cell-strong">{item.zona.nombre}</span>
										<span class="cell-sub">{item.lastEvent ? formatDateTime(item.lastEvent.fecha_hora) : 'Sin evento'}</span>
									{:else}
										<span class="text-faint">Sin evento reciente</span>
									{/if}
								</td>
								<td class="nowrap">
									{formatDateTime(item.visita.fecha_entrada)}
									<span class="cell-sub">{item.visita.fecha_salida ? `Salida ${formatDateTime(item.visita.fecha_salida)}` : 'Sin salida'}</span>
								</td>
								<td class="nowrap">
									<span class="cell-strong">{formatDuration(item.minutes)}</span>
									{#if item.status.key === 'abierta'}
										<span class="cell-sub">En curso</span>
									{/if}
								</td>
								<td>
									{#if item.camara}
										<span class="cell-strong">{item.camara.nombre}</span>
										<span class="cell-sub">{item.lastEvent ? eventLabel(item.lastEvent.tipo_evento).label : '—'}</span>
									{:else}
										<span class="text-faint">No reportada</span>
									{/if}
								</td>
								<td><StatusPill tone={item.status.tone} label={item.status.label} /></td>
								<td class="text-end">
									<button
										class="btn btn-quiet btn-xs"
										type="button"
										onclick={(event) => { event.stopPropagation(); openVisit(item.visita.id_visita); }}
									>
										Detalle
										<Icon name="chevron-right" size={13} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination
				page={paged.page}
				pages={paged.pages}
				total={paged.total}
				from={paged.from}
				to={paged.to}
				onchange={(next) => (pageNumber = next)}
				label="visitas"
			/>
		{/if}
	</section>


{/if}
