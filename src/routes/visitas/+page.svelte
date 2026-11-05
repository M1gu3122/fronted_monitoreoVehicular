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
	import { listarEventos } from '#lib/service/eventos.js';
	import { errorMessage } from '#lib/service/client.js';
	import { preferences } from '#lib/stores/preferences.svelte.js';
	import { pushToast } from '#lib/stores/toasts.svelte.js';
	import {
		formatDate,
		formatDateTime,
		formatDuration,
		formatNumber,
		minutesBetween,
		parseDate,
		dayKey
	} from '#lib/utils/format.js';
	import { visitStatus, eventLabel } from '#lib/utils/domain.js';
	import { paginate, includesText, toCsv, downloadCsv, dateToStamp } from '#lib/utils/data.js';

	const presetToday = page.url.searchParams.get('date') === 'today';
	let dateFrom = $state(presetToday ? dayKey(new Date()) : '');
	let dateTo = $state(presetToday ? dayKey(new Date()) : '');
	let search = $state('');
	let estadoFilter = $state(page.url.searchParams.get('estado') || 'todas');
	let minMinutes = $state('');
	let maxMinutes = $state('');
	let pageNumber = $state(1);

	let visitas = $state([]);
	let vehiculos = $state([]);
	let eventos = $state([]);
	let loading = $state(true);
	let refreshing = $state(false);
	let error = $state('');
	let warnings = $state([]);
	let lastUpdated = $state(null);

	const vehiculoById = $derived(new Map(vehiculos.map((item) => [Number(item.id_vehiculo), item])));

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
		visitas.map((visita) => ({
			visita,
			vehiculo: vehiculoById.get(Number(visita.id_vehiculo)) || null,
			status: visitStatus(visita),
			minutes: minutesBetween(visita.fecha_entrada, visita.fecha_salida || null),
			lastEvent: latestEventByVisit.get(Number(visita.id_visita)) || null
		}))
	);

	const filtered = $derived.by(() =>
		enriched
			.filter((item) => {
				if (estadoFilter === 'abierta' && item.status.key !== 'abierta') return false;
				if (estadoFilter === 'finalizada' && item.status.key !== 'finalizada') return false;
				const entry = parseDate(item.visita.fecha_entrada);
				if (dateFrom && entry && dayKey(entry) < dateFrom) return false;
				if (dateTo && entry && dayKey(entry) > dateTo) return false;
				if (dateFrom && !entry) return false;
				if (minMinutes !== '' && (item.minutes === null || item.minutes < Number(minMinutes))) return false;
				if (maxMinutes !== '' && (item.minutes === null || item.minutes > Number(maxMinutes))) return false;
				if (search) {
					const haystack = [
						item.visita.id_visita,
						item.vehiculo?.placa,
						item.vehiculo?.marca,
						item.vehiculo?.modelo,
						item.vehiculo?.color,
						item.lastEvent?.tipo_evento
					]
						.filter(Boolean)
						.join(' ');
					if (!includesText(haystack, search)) return false;
				}
				return true;
			})
			.sort((a, b) => (parseDate(b.visita.fecha_entrada)?.getTime() || 0) - (parseDate(a.visita.fecha_entrada)?.getTime() || 0))
	);

	const paged = $derived(paginate(filtered, pageNumber, Number(preferences.pageSize) || 10));
	const histogram = $derived.by(() => {
		const buckets = [
			{ label: 'Hasta 30 min', count: 0 },
			{ label: '30 min – 2 h', count: 0 },
			{ label: '2 h – 8 h', count: 0 },
			{ label: 'Más de 8 h', count: 0 },
			{ label: 'Sin salida', count: 0 }
		];
		for (const item of filtered) {
			if (item.status.key === 'abierta') buckets[4].count += 1;
			else if (item.minutes === null) continue;
			else if (item.minutes <= 30) buckets[0].count += 1;
			else if (item.minutes <= 120) buckets[1].count += 1;
			else if (item.minutes <= 480) buckets[2].count += 1;
			else buckets[3].count += 1;
		}
		return buckets;
	});
	const averageStay = $derived.by(() => {
		const values = filtered
			.filter((item) => item.status.key === 'finalizada' && item.minutes !== null)
			.map((item) => item.minutes);
		if (!values.length) return null;
		return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
	});

	async function load(silent = false) {
		if (refreshing) return;
		if (silent) refreshing = true;
		else loading = true;
		error = '';
		warnings = [];

		const requests = [
			[listarVisitas, 'Visitas', true],
			[listarVehiculos, 'Vehículos', false],
			[listarEventos, 'Eventos', false]
		];
		const results = await Promise.allSettled(requests.map(([fn]) => fn()));
		const failures = [];
		results.forEach((result, index) => {
			const [, label, critical] = requests[index];
			if (result.status === 'fulfilled') {
				const items = Array.isArray(result.value) ? result.value : [];
				if (index === 0) visitas = items;
				if (index === 1) vehiculos = items;
				if (index === 2) eventos = items;
			} else {
				if (index === 0) visitas = [];
				if (index === 1) vehiculos = [];
				if (index === 2) eventos = [];
				failures.push({ label, message: errorMessage(result.reason), critical });
			}
		});
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

	function resetFilters() {
		search = '';
		estadoFilter = 'todas';
		dateFrom = '';
		dateTo = '';
		minMinutes = '';
		maxMinutes = '';
		pageNumber = 1;
	}

	function exportCsv() {
		if (!filtered.length) {
			pushToast({ type: 'info', title: 'Sin datos para exportar', message: 'Ajuste los filtros e intente nuevamente.' });
			return;
		}
		const rows = filtered.map((item) => ({
			id: item.visita.id_visita,
			placa: item.vehiculo?.placa || 'Sin identificar',
			vehiculo: [item.vehiculo?.marca, item.vehiculo?.modelo, item.vehiculo?.color].filter(Boolean).join(' '),
			entrada: item.visita.fecha_entrada,
			salida: item.visita.fecha_salida || '',
			duracion_min: item.minutes ?? '',
			estado: item.status.label,
			ultimo_evento: item.lastEvent ? eventLabel(item.lastEvent.tipo_evento).label : ''
		}));
		const csv = toCsv(rows, [
			{ label: 'ID visita', value: 'id' },
			{ label: 'Placa', value: 'placa' },
			{ label: 'Vehículo', value: 'vehiculo' },
			{ label: 'Entrada', value: 'entrada' },
			{ label: 'Salida', value: 'salida' },
			{ label: 'Duración (min)', value: 'duracion_min' },
			{ label: 'Estado', value: 'estado' },
			{ label: 'Último evento', value: 'ultimo_evento' }
		]);
		downloadCsv(`visitas-${dateToStamp()}.csv`, csv);
		pushToast({ title: 'Exportación generada', message: `${filtered.length} visitas exportadas en CSV.` });
	}
</script>

<PageHeader
	eyebrow="Trazabilidad"
	title="Historial de visitas"
	description="Cada estancia registrada dentro del área supervisada. Una visita sin placa reconocida sigue siendo consultable mediante su identificador."
>
	{#snippet actions()}
		<button class="btn btn-quiet" type="button" onclick={exportCsv}>
			<Icon name="download" size={15} />
			Exportar CSV
		</button>
		<button class="btn btn-quiet" type="button" onclick={() => load(true)} disabled={refreshing}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel"><LoadingState rows={7} message="Cargando historial de visitas…" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible cargar las visitas" message={error} onretry={() => load()} />
		</div>
	</div>
{:else}
	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Información parcial</strong>
				<span>{warnings.map((item) => item.label).join(', ')} no pudieron cargarse. Las placas o el último evento pueden aparecer incompletos.</span>
			</div>
		</div>
	{/if}

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Visitas en el filtro</div>
				<div class="stat-card__value mt-1">{formatNumber(filtered.length)}</div>
				<div class="fs-8 text-faint">de {formatNumber(visitas.length)} registradas</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Dentro del área</div>
				<div class="stat-card__value mt-1">{formatNumber(filtered.filter((item) => item.status.key === 'abierta').length)}</div>
				<div class="fs-8 text-faint">sin salida registrada</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Permanencia promedio</div>
				<div class="stat-card__value mt-1">{averageStay !== null ? formatDuration(averageStay) : '—'}</div>
				<div class="fs-8 text-faint">solo visitas finalizadas</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Última actualización</div>
				<div class="stat-card__value mt-1" style="font-size: 1.15rem;">{lastUpdated ? formatDateTime(lastUpdated) : '—'}</div>
				<div class="fs-8 text-faint">datos de la API</div>
			</div>
		</div>
	</div>

	<section class="panel">
		<div class="panel__head">
			<div>
				<h3>Visitas registradas</h3>
				<p>Ordenadas por entrada más reciente</p>
			</div>
			<div class="panel__head-tools">
				{#each histogram as bucket (bucket.label)}
					<span class="pill pill--outline" title={bucket.label}>{bucket.count} · {bucket.label}</span>
				{/each}
			</div>
		</div>

		<div class="filter-bar">
			<div class="filter-field filter-field--grow">
				<label for="vis-search">Buscar</label>
				<div class="input-group input-group-sm">
					<span class="input-group-text"><Icon name="search" size={14} /></span>
					<input
						id="vis-search"
						class="form-control form-control-sm"
						placeholder="Placa, vehículo o ID de visita"
						bind:value={search}
						oninput={() => (pageNumber = 1)}
					/>
				</div>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="vis-estado">Estado</label>
				<select id="vis-estado" class="form-select form-select-sm" bind:value={estadoFilter} onchange={() => (pageNumber = 1)}>
					<option value="todas">Todas</option>
					<option value="abierta">Dentro del área</option>
					<option value="finalizada">Finalizadas</option>
				</select>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="vis-from">Desde</label>
				<input id="vis-from" type="date" class="form-control form-control-sm" bind:value={dateFrom} onchange={() => (pageNumber = 1)} />
			</div>
			<div class="filter-field filter-field--sm">
				<label for="vis-to">Hasta</label>
				<input id="vis-to" type="date" class="form-control form-control-sm" bind:value={dateTo} onchange={() => (pageNumber = 1)} />
			</div>
			<div class="filter-field filter-field--sm">
				<label for="vis-min">Duración mín. (min)</label>
				<input id="vis-min" type="number" min="0" class="form-control form-control-sm" bind:value={minMinutes} oninput={() => (pageNumber = 1)} placeholder="0" />
			</div>
			<div class="filter-field filter-field--sm">
				<label for="vis-max">Duración máx. (min)</label>
				<input id="vis-max" type="number" min="0" class="form-control form-control-sm" bind:value={maxMinutes} oninput={() => (pageNumber = 1)} placeholder="Sin límite" />
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
				icon="history"
				title={visitas.length ? 'Sin visitas que coincidan' : 'Aún no hay visitas registradas'}
				message={visitas.length
					? 'Modifique el rango de fechas, la placa o el estado para ampliar los resultados.'
					: 'El sistema de visión artificial aún no ha registrado entradas o el backend no está devolviendo visitas.'}
				actionLabel={visitas.length ? 'Limpiar filtros' : ''}
				onaction={resetFilters}
			/>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>ID visita</th>
							<th>Vehículo / placa</th>
							<th>Entrada</th>
							<th>Salida</th>
							<th>Duración</th>
							<th>Estado</th>
							<th>Último evento</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each paged.items as item}
							<tr class="is-clickable" onclick={() => goto(`/visitas`)}>
								<td class="nowrap"><span class="cell-sub">#{item.visita.id_visita}</span></td>
								<td>
									{#if item.vehiculo}
										<span class="plate">{item.vehiculo.placa}</span>
										<span class="cell-sub">{[item.vehiculo.marca, item.vehiculo.modelo, item.vehiculo.color].filter(Boolean).join(' · ') || 'Sin datos'}</span>
									{:else}
										<span class="plate plate--pending">Sin identificar</span>
										<span class="cell-sub">Consulte por ID de visita</span>
									{/if}
								</td>
								<td class="nowrap">
									{formatDateTime(item.visita.fecha_entrada)}
									<span class="cell-sub">{formatDate(item.visita.fecha_entrada)}</span>
								</td>
								<td class="nowrap">
									{#if item.visita.fecha_salida}
										{formatDateTime(item.visita.fecha_salida)}
									{:else}
										<span class="text-faint">Sin salida</span>
									{/if}
								</td>
								<td class="nowrap">
									<span class="cell-strong">{formatDuration(item.minutes)}</span>
									<span class="cell-sub">{item.status.key === 'abierta' ? 'En curso' : 'Total'}</span>
								</td>
								<td><StatusPill tone={item.status.tone} label={item.status.label} /></td>
								<td>
									{#if item.lastEvent}
										<span class="cell-strong">{eventLabel(item.lastEvent.tipo_evento).label}</span>
										<span class="cell-sub">{formatDateTime(item.lastEvent.fecha_hora)}</span>
									{:else}
										<span class="text-faint">Sin eventos</span>
									{/if}
								</td>
								<td class="text-end">
									<button
										class="btn btn-quiet btn-xs"
										type="button"
										onclick={(event) => { event.stopPropagation(); goto(`/visitas/${item.visita.id_visita}`); }}
									>
										Ver detalle
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
