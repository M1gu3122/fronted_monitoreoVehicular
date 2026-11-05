<script>
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Confidence from '#lib/components/Confidence.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { listarSeguimientos, listarAsociaciones } from '#lib/service/seguimientos.js';
	import { listarCamaras } from '#lib/service/camaras.js';
	import { listarZonas } from '#lib/service/zonas.js';
	import { listarVisitas } from '#lib/service/visitas.js';
	import { listarVehiculos } from '#lib/service/vehiculos.js';
	import { listarEventos } from '#lib/service/eventos.js';
	import { errorMessage } from '#lib/service/client.js';
	import { preferences } from '#lib/stores/preferences.svelte.js';
	import { toastError } from '#lib/stores/toasts.svelte.js';
	import {
		formatDateTime,
		formatDuration,
		formatNumber,
		formatPercent,
		formatTime,
		minutesBetween,
		parseDate
	} from '#lib/utils/format.js';
	import { eventLabel, associationResult } from '#lib/utils/domain.js';
	import { includesText, paginate, toCsv, downloadCsv, dateToStamp } from '#lib/utils/data.js';

	let seguimientos = $state([]);
	let asociaciones = $state([]);
	let camaras = $state([]);
	let zonas = $state([]);
	let visitas = $state([]);
	let vehiculos = $state([]);
	let eventos = $state([]);
	let loading = $state(true);
	let error = $state('');
	let warnings = $state([]);
	let lastUpdated = $state(null);

	let search = $state('');
	let camaraFilter = $state('');
	let zonaFilter = $state('');
	let estadoFilter = $state('todos');
	let desde = $state('');
	let hasta = $state('');
	let pageNumber = $state(1);
	let detail = $state(null);

	const cameraById = $derived(new Map(camaras.map((item) => [Number(item.id_camara), item])));
	const zoneById = $derived(new Map(zonas.map((item) => [Number(item.id_zona), item])));
	const visitById = $derived(new Map(visitas.map((item) => [Number(item.id_visita), item])));
	const vehicleById = $derived(new Map(vehiculos.map((item) => [Number(item.id_vehiculo), item])));

	function plateOf(seguimiento) {
		const visita = visitById.get(Number(seguimiento.id_visita));
		const vehiculo = visita ? vehicleById.get(Number(visita.id_vehiculo)) : null;
		return vehiculo?.placa || null;
	}

	function zoneOf(seguimiento) {
		const camera = cameraById.get(Number(seguimiento.id_camara));
		return camera ? zoneById.get(Number(camera.id_zona)) || null : null;
	}

	const enriched = $derived(
		seguimientos.map((seguimiento) => {
			const start = parseDate(seguimiento.inicio);
			const end = parseDate(seguimiento.fin);
			const minutes = start ? minutesBetween(start, end || null) : null;
			const events = eventos.filter((evento) => Number(evento.id_seguimiento) === Number(seguimiento.id_seguimiento));
			const related = asociaciones.filter(
				(item) =>
					Number(item.id_seguimiento_origen) === Number(seguimiento.id_seguimiento) ||
					Number(item.id_seguimiento_destino) === Number(seguimiento.id_seguimiento)
			);
			return {
				seguimiento,
				camera: cameraById.get(Number(seguimiento.id_camara)) || null,
				zona: zoneOf(seguimiento),
				visita: visitById.get(Number(seguimiento.id_visita)) || null,
				plate: plateOf(seguimiento),
				minutes,
				events,
				associations: related,
				open: !seguimiento.fin
			};
		})
	);

	const filtered = $derived.by(() => {
		const fromStamp = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
		const toStamp = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;
		return enriched
			.filter((item) => {
				const stamp = parseDate(item.seguimiento.inicio)?.getTime() ?? null;
				if (fromStamp !== null && (stamp === null || stamp < fromStamp)) return false;
				if (toStamp !== null && (stamp === null || stamp > toStamp)) return false;
				if (camaraFilter && Number(item.seguimiento.id_camara) !== Number(camaraFilter)) return false;
				if (zonaFilter && Number(item.zona?.id_zona) !== Number(zonaFilter)) return false;
				if (estadoFilter === 'en-curso' && !item.open) return false;
				if (estadoFilter === 'finalizados' && item.open) return false;
				if (search) {
					const haystack = [
						item.seguimiento.id_tracking,
						item.seguimiento.id_seguimiento,
						item.seguimiento.id_visita,
						item.plate,
						item.camera?.nombre,
						item.zona?.nombre
					]
						.filter(Boolean)
						.join(' ');
					if (!includesText(haystack, search)) return false;
				}
				return true;
			})
			.sort((a, b) => (parseDate(b.seguimiento.inicio)?.getTime() || 0) - (parseDate(a.seguimiento.inicio)?.getTime() || 0));
	});

	const paged = $derived(paginate(filtered, pageNumber, Number(preferences.pageSize) || 10));

	const stats = $derived.by(() => {
		const closed = enriched.filter((item) => !item.open && item.minutes !== null);
		const avgMinutes = closed.length ? closed.reduce((total, item) => total + item.minutes, 0) / closed.length : null;
		const withConfidence = enriched.filter((item) => Number.isFinite(Number(item.seguimiento.confianza_promedio)) && item.seguimiento.confianza_promedio !== null);
		const avgConfidence = withConfidence.length
			? withConfidence.reduce((total, item) => total + Number(item.seguimiento.confianza_promedio), 0) / withConfidence.length
			: null;
		return {
			total: enriched.length,
			open: enriched.filter((item) => item.open).length,
			avgMinutes,
			avgConfidence,
			pendingAssociations: asociaciones.filter((item) => associationResult(item).label === 'Pendiente de revisión').length
		};
	});

	const detailEvents = $derived.by(() => {
		if (!detail) return [];
		return [...detail.events].sort((a, b) => (parseDate(a.fecha_hora)?.getTime() || 0) - (parseDate(b.fecha_hora)?.getTime() || 0));
	});

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';
		warnings = [];
		const results = await Promise.allSettled([
			listarSeguimientos(),
			listarAsociaciones(),
			listarCamaras(),
			listarZonas(),
			listarVisitas(),
			listarVehiculos(),
			listarEventos()
		]);
		const [seg, asoc, cam, zon, vis, veh, evt] = results;
		if (seg.status === 'fulfilled') seguimientos = Array.isArray(seg.value) ? seg.value : [];
		else {
			seguimientos = [];
			error = errorMessage(seg.reason);
		}
		asociaciones = asoc.status === 'fulfilled' && Array.isArray(asoc.value) ? asoc.value : [];
		if (asoc.status !== 'fulfilled') warnings.push('Asociaciones');
		camaras = cam.status === 'fulfilled' && Array.isArray(cam.value) ? cam.value : [];
		if (cam.status !== 'fulfilled') warnings.push('Cámaras');
		zonas = zon.status === 'fulfilled' && Array.isArray(zon.value) ? zon.value : [];
		if (zon.status !== 'fulfilled') warnings.push('Zonas');
		visitas = vis.status === 'fulfilled' && Array.isArray(vis.value) ? vis.value : [];
		if (vis.status !== 'fulfilled') warnings.push('Visitas');
		vehiculos = veh.status === 'fulfilled' && Array.isArray(veh.value) ? veh.value : [];
		if (veh.status !== 'fulfilled') warnings.push('Vehículos');
		eventos = evt.status === 'fulfilled' && Array.isArray(evt.value) ? evt.value : [];
		if (evt.status !== 'fulfilled') warnings.push('Eventos');
		lastUpdated = new Date();
		loading = false;
	}

	onMount(() => {
		load();
		const handleRefresh = () => load(true);
		window.addEventListener('lpr:refresh', handleRefresh);
		return () => window.removeEventListener('lpr:refresh', handleRefresh);
	});

	function resetFilters() {
		search = '';
		camaraFilter = '';
		zonaFilter = '';
		estadoFilter = 'todos';
		desde = '';
		hasta = '';
		pageNumber = 1;
	}

	function exportCsv() {
		if (!filtered.length) {
			toastError('Sin datos para exportar', 'No hay seguimientos con los filtros actuales.');
			return;
		}
		const rows = filtered.map((item) => ({
			id_seguimiento: item.seguimiento.id_seguimiento,
			id_tracking: item.seguimiento.id_tracking,
			placa: item.plate || '',
			id_visita: item.seguimiento.id_visita ?? '',
			camara: item.camera?.nombre || '',
			zona: item.zona?.nombre || '',
			inicio: item.seguimiento.inicio,
			fin: item.seguimiento.fin || '',
			duracion_min: item.minutes ?? '',
			confianza: item.seguimiento.confianza_promedio ?? '',
			eventos: item.events.length
		}));
		const csv = toCsv(rows, [
			{ label: 'ID', value: 'id_seguimiento' },
			{ label: 'Tracking', value: 'id_tracking' },
			{ label: 'Placa', value: 'placa' },
			{ label: 'Visita', value: 'id_visita' },
			{ label: 'Cámara', value: 'camara' },
			{ label: 'Zona', value: 'zona' },
			{ label: 'Inicio', value: 'inicio' },
			{ label: 'Fin', value: 'fin' },
			{ label: 'Duración (min)', value: 'duracion_min' },
			{ label: 'Confianza promedio', value: 'confianza' },
			{ label: 'Eventos', value: 'eventos' }
		]);
		downloadCsv(`seguimientos_${dateToStamp()}.csv`, csv);
	}
</script>

<PageHeader
	eyebrow="Trayectorias"
	title="Seguimientos"
	description="Trayectorias continuas construidas por el sistema de visión. Cada seguimiento agrupa eventos de una visita y una cámara; la duración se calcula con inicio y fin reportados."
>
	{#snippet actions()}
		<button class="btn btn-quiet" type="button" onclick={() => load(true)}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
		<button class="btn btn-quiet" type="button" onclick={exportCsv}>
			<Icon name="download" size={15} />
			Exportar CSV
			
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel"><LoadingState rows={8} message="Consultando seguimientos, asociaciones y eventos…" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible cargar los seguimientos" message={error} onretry={() => load()} />
		</div>
	</div>
{:else}
	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Información parcial</strong>
				<span>{warnings.join(', ')} no pudieron cargarse. Algunos vínculos y conteos pueden aparecer incompletos.</span>
			</div>
		</div>
	{/if}

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Seguimientos</div>
				<div class="stat-card__value mt-1">{formatNumber(stats.total)}</div>
				<div class="fs-8 text-faint">trayectorias registradas</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">En curso</div>
				<div class="stat-card__value mt-1">{formatNumber(stats.open)}</div>
				<div class="fs-8 text-faint">sin fecha de fin</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Duración promedio</div>
				<div class="stat-card__value mt-1">{stats.avgMinutes !== null ? formatDuration(stats.avgMinutes) : '—'}</div>
				<div class="fs-8 text-faint">solo seguimientos finalizados</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Confianza promedio</div>
				<div class="stat-card__value mt-1">{stats.avgConfidence !== null ? formatPercent(stats.avgConfidence * 100, 0) : '—'}</div>
				<div class="fs-8 text-faint">{stats.pendingAssociations} asociaciones pendientes</div>
			</div>
		</div>
	</div>

	<section class="panel">
		<div class="panel__head">
			<div>
				<h3>Trayectorias registradas</h3>
				<p>{paged.total} de {seguimientos.length} seguimientos · última actualización {lastUpdated ? formatDateTime(lastUpdated) : '—'}</p>
			</div>
		</div>

		<div class="filter-bar">
			<div class="filter-field filter-field--grow">
				<label for="seg-search">Buscar</label>
				<div class="input-group input-group-sm">
					<span class="input-group-text"><Icon name="search" size={14} /></span>
					<input id="seg-search" class="form-control form-control-sm" placeholder="Tracking, placa, visita o cámara" bind:value={search} oninput={() => (pageNumber = 1)} />
				</div>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="seg-camara">Cámara</label>
				<select id="seg-camara" class="form-select form-select-sm" bind:value={camaraFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todas</option>
					{#each camaras as camara (camara.id_camara)}
						<option value={camara.id_camara}>{camara.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="seg-zona">Zona</label>
				<select id="seg-zona" class="form-select form-select-sm" bind:value={zonaFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todas</option>
					{#each zonas as zona (zona.id_zona)}
						<option value={zona.id_zona}>{zona.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="seg-estado">Estado</label>
				<select id="seg-estado" class="form-select form-select-sm" bind:value={estadoFilter} onchange={() => (pageNumber = 1)}>
					<option value="todos">Todos</option>
					<option value="en-curso">En curso</option>
					<option value="finalizados">Finalizados</option>
				</select>
			</div>
			<div class="filter-field filter-field--xs">
				<label for="seg-desde">Desde</label>
				<input id="seg-desde" type="date" class="form-control form-control-sm" bind:value={desde} onchange={() => (pageNumber = 1)} />
			</div>
			<div class="filter-field filter-field--xs">
				<label for="seg-hasta">Hasta</label>
				<input id="seg-hasta" type="date" class="form-control form-control-sm" bind:value={hasta} onchange={() => (pageNumber = 1)} />
			</div>
			<div class="filter-bar__end">
				<button class="btn btn-quiet btn-sm" type="button" onclick={resetFilters}>
					<Icon name="filter" size={14} />
					Limpiar
				</button>
			</div>
		</div>

		{#if !paged.total}
			<EmptyState
				icon="route"
				title={seguimientos.length ? 'Sin seguimientos con estos filtros' : 'No hay seguimientos registrados'}
				message={seguimientos.length
					? 'Ajuste la búsqueda, la cámara, la zona o el rango de fechas.'
					: 'El backend aún no reporta trayectorias de vehículos.'}
				actionLabel={seguimientos.length ? 'Restablecer filtros' : null}
				onaction={resetFilters}
			/>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Tracking</th>
							<th>Vehículo / visita</th>
							<th>Cámara</th>
							<th>Zona</th>
							<th>Inicio</th>
							<th>Duración</th>
							<th class="num">Confianza</th>
							<th>Estado</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each paged.items as item (item.seguimiento.id_seguimiento)}
							<tr>
								<td>
									<span class="cell-strong mono">{item.seguimiento.id_tracking}</span>
									<span class="cell-sub">ID #{item.seguimiento.id_seguimiento} · {item.events.length} eventos</span>
								</td>
								<td>
									{#if item.plate}<span class="plate">{item.plate}</span>{/if}
									<span class="cell-sub">
										Visita <a class="text-link" href={`/visitas/${item.seguimiento.id_visita}`}>#{item.seguimiento.id_visita}</a>
									</span>
								</td>
								<td class="fs-7">{item.camera?.nombre || `#${item.seguimiento.id_camara}`}</td>
								<td class="fs-7">{item.zona?.nombre || '—'}</td>
								<td class="nowrap fs-7">
									{formatDateTime(item.seguimiento.inicio)}
									{#if item.seguimiento.fin}<span class="cell-sub">Fin: {formatDateTime(item.seguimiento.fin)}</span>{/if}
								</td>
								<td class="nowrap fs-7">{item.minutes !== null ? formatDuration(item.minutes) : 'En curso'}</td>
								<td class="num">
									{#if item.seguimiento.confianza_promedio !== null && item.seguimiento.confianza_promedio !== undefined}
										<Confidence value={item.seguimiento.confianza_promedio} />
									{:else}
										<span class="text-faint">—</span>
									{/if}
								</td>
								<td><StatusPill tone={item.open ? 'info' : 'ok'} label={item.open ? 'En curso' : 'Finalizado'} dot={false} /></td>
								<td class="text-end">
									<button class="btn btn-quiet btn-icon btn-xs" type="button" onclick={() => (detail = item)} title="Ver trayectoria" aria-label={`Ver seguimiento ${item.seguimiento.id_seguimiento}`}>
										<Icon name="eye" size={14} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination page={paged.page} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to} onchange={(next) => (pageNumber = next)} label="seguimientos" />
		{/if}
		
	</section>
{/if}

<Modal open={Boolean(detail)} onclose={() => (detail = null)} title={detail ? `Seguimiento ${detail.seguimiento.id_tracking}` : 'Seguimiento'} subtitle={detail ? `Registro #${detail.seguimiento.id_seguimiento} · visita #${detail.seguimiento.id_visita}` : ''} size="xl">
	{#if detail}
		<div class="kpi-inline mb-3">
			<div><dt>Cámara</dt><dd>{detail.camera?.nombre || `#${detail.seguimiento.id_camara}`}</dd></div>
			<div><dt>Zona</dt><dd>{detail.zona?.nombre || '—'}</dd></div>
			<div><dt>Duración</dt><dd>{detail.minutes !== null ? formatDuration(detail.minutes) : 'En curso'}</dd></div>
			<div><dt>Eventos</dt><dd>{detail.events.length}</dd></div>
			<div><dt>Confianza promedio</dt><dd>{detail.seguimiento.confianza_promedio !== null ? formatPercent(Number(detail.seguimiento.confianza_promedio) * 100, 1) : '—'}</dd></div>
		</div>

		<div class="row g-4">
			<div class="col-12 col-lg-7">
				<div class="eyebrow-plain mb-2">Eventos de la trayectoria</div>
				{#if !detailEvents.length}
					<EmptyState icon="events" title="Sin eventos asociados" message="Ningún evento referencia este seguimiento." />
				{:else}
					<ol class="timeline">
						{#each detailEvents as evento (evento.id_evento)}
							{@const meta = eventLabel(evento.tipo_evento)}
							<li class="timeline-item">
								<span class="timeline-item__dot {meta.tone === 'danger' ? 'danger' : meta.tone === 'ok' ? 'ok' : meta.tone === 'accent' ? 'accent' : meta.tone === 'warn' ? 'warn' : ''}"></span>
								<div class="timeline-item__top">
									<strong>{meta.label}</strong>
									<span class="timeline-item__time">{formatTime(evento.fecha_hora)}</span>
								</div>
								<div class="timeline-item__body">
									<span>{formatDateTime(evento.fecha_hora)}</span>
									{#if evento.confianza !== null && evento.confianza !== undefined}
										<span class="ms-2">· <Confidence value={evento.confianza} /></span>
									{/if}
								</div>
							</li>
						{/each}
					</ol>
				{/if}
			</div>
			<div class="col-12 col-lg-5">
				<div class="eyebrow-plain mb-2">Datos del registro</div>
				<div class="detail-grid mb-3">
					<div><dt>Inicio</dt><dd>{formatDateTime(detail.seguimiento.inicio)}</dd></div>
					<div><dt>Fin</dt><dd>{detail.seguimiento.fin ? formatDateTime(detail.seguimiento.fin) : 'Sin cierre'}</dd></div>
					<div><dt>Estado</dt><dd>{detail.seguimiento.estado === false ? 'Inactivo' : 'Activo'}</dd></div>
					<div><dt>Creado</dt><dd>{detail.seguimiento.creado ? formatDateTime(detail.seguimiento.creado) : '—'}</dd></div>
				</div>

				<div class="eyebrow-plain mb-2">Asociaciones de seguimiento</div>
				{#if !detail.associations.length}
					<p class="fs-8 text-faint">Sin asociaciones evaluadas para esta trayectoria.</p>
				{:else}
					<div class="d-grid gap-2">
						{#each detail.associations as asociacion (asociacion.id_asociacion)}
							{@const result = associationResult(asociacion)}
							<div class="mini-card">
								<div class="d-flex justify-content-between align-items-start gap-2">
									<div>
										<div class="fs-8 text-faint">Asociación #{asociacion.id_asociacion}</div>
										<div class="fs-7"><span class="mono">{asociacion.metodo}</span></div>
									</div>
									<StatusPill tone={result.tone} label={result.label} dot={false} />
								</div>
								<div class="fs-8 text-faint mt-2">
									Origen #{asociacion.id_seguimiento_origen} → destino #{asociacion.id_seguimiento_destino}
									{#if asociacion.confianza !== null && asociacion.confianza !== undefined}
										· <Confidence value={asociacion.confianza} />
									{/if}
								</div>
								<div class="fs-8 text-faint">{formatDateTime(asociacion.fecha_evaluacion)}</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}
	{#snippet footer()}
		{#if detail}
			<a class="btn btn-quiet" href={`/visitas/${detail.seguimiento.id_visita}`}>Abrir visita</a>
		{/if}
		<button class="btn btn-quiet" type="button" onclick={() => (detail = null)}>Cerrar</button>
	{/snippet}
</Modal>
