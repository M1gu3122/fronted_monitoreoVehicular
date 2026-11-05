<script>
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatCard from '#lib/components/StatCard.svelte';
	import GroupedBarChart from '#lib/components/GroupedBarChart.svelte';
	import LineChart from '#lib/components/LineChart.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { listarVisitas } from '#lib/service/visitas.js';
	import { listarEventos } from '#lib/service/eventos.js';
	import { listarZonas } from '#lib/service/zonas.js';
	import { listarCamaras } from '#lib/service/camaras.js';
	import { listarOcupacion } from '#lib/service/ocupacion.js';
	import { listarAlertas } from '#lib/service/alertas.js';
	import { errorMessage } from '#lib/service/client.js';
	import { toastError } from '#lib/stores/toasts.svelte.js';
	import {
		dayKey,
		formatDuration,
		formatNumber,
		formatPercent,
		formatTime,
		hourLabel,
		minutesBetween,
		parseDate,
		relativeTime
	} from '#lib/utils/format.js';
	import {
		alertIsOpen,
		eventLabel,
		latestOccupancyByZone,
		occupancyStatus
	} from '#lib/utils/domain.js';
	import { toCsv, downloadCsv, dateToStamp } from '#lib/utils/data.js';

	let visitas = $state([]);
	let eventos = $state([]);
	let zonas = $state([]);
	let camaras = $state([]);
	let ocupaciones = $state([]);
	let alertas = $state([]);
	let loading = $state(true);
	let error = $state('');
	let warnings = $state([]);
	let lastUpdated = $state(null);

	const today = new Date();
	const monthAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
	const toDateInput = (date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

	let desde = $state(toDateInput(monthAgo));
	let hasta = $state(toDateInput(today));
	let zonaFilter = $state('');

	const zoneById = $derived(new Map(zonas.map((item) => [Number(item.id_zona), item])));
	const cameraById = $derived(new Map(camaras.map((item) => [Number(item.id_camara), item])));

	const range = $derived.by(() => {
		const start = desde ? new Date(`${desde}T00:00:00`) : null;
		const end = hasta ? new Date(`${hasta}T23:59:59`) : null;
		return {
			start,
			end,
			startStamp: start ? start.getTime() : null,
			endStamp: end ? end.getTime() : null
		};
	});

	function inRange(value) {
		const stamp = parseDate(value)?.getTime();
		if (stamp === undefined) return false;
		if (range.startStamp !== null && stamp < range.startStamp) return false;
		if (range.endStamp !== null && stamp > range.endStamp) return false;
		return true;
	}

	function eventZone(evento) {
		if (evento.id_zona) return Number(evento.id_zona);
		const camera = cameraById.get(Number(evento.id_camara));
		return camera?.id_zona ? Number(camera.id_zona) : null;
	}

	const visitsInRange = $derived(visitas.filter((visita) => inRange(visita.fecha_entrada)));
	const eventsInRange = $derived(
		eventos.filter((evento) => inRange(evento.fecha_hora) && (!zonaFilter || eventZone(evento) === Number(zonaFilter)))
	);
	const alertsInRange = $derived(
		alertas.filter(
			(alerta) =>
				inRange(alerta.fecha_deteccion) && (!zonaFilter || Number(alerta.id_zona) === Number(zonaFilter))
		)
	);
	const occupancyInRange = $derived(
		ocupaciones.filter((item) => inRange(item.fecha_hora) && (!zonaFilter || Number(item.id_zona) === Number(zonaFilter)))
	);
	const zonesScoped = $derived(zonaFilter ? zonas.filter((zona) => Number(zona.id_zona) === Number(zonaFilter)) : zonas);

	const kpis = $derived.by(() => {
		const durations = visitsInRange
			.map((visita) => minutesBetween(visita.fecha_entrada, visita.fecha_salida || null))
			.filter((value) => value !== null);
		const avgDuration = durations.length ? durations.reduce((total, value) => total + value, 0) / durations.length : null;
		const measured = occupancyInRange.filter((item) => Number.isFinite(Number(item.cantidad_vehiculos)));
		const avgOccupancy = measured.length
			? measured.reduce((total, item) => total + Number(item.cantidad_vehiculos), 0) / measured.length
			: null;
		const capacity = zonesScoped.reduce((total, zona) => total + (Number(zona.capacidad_maxima) || 0), 0);
		return {
			visits: visitsInRange.length,
			openVisits: visitsInRange.filter((visita) => !visita.fecha_salida).length,
			avgDuration,
			events: eventsInRange.length,
			alerts: alertsInRange.length,
			openAlerts: alertsInRange.filter((alerta) => alertIsOpen(alerta)).length,
			avgOccupancy,
			capacity
		};
	});

	const daily = $derived.by(() => {
		const days = [];
		if (!range.start || !range.end) return days;
		const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
		const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
		const entries = new Map();
		const exits = new Map();
		for (const visita of visitas) {
			const entryKey = dayKey(visita.fecha_entrada);
			if (entryKey) entries.set(entryKey, (entries.get(entryKey) || 0) + 1);
			const exitKey = dayKey(visita.fecha_salida);
			if (exitKey) exits.set(exitKey, (exits.get(exitKey) || 0) + 1);
		}
		while (cursor <= end && days.length < 180) {
			const key = dayKey(cursor);
			days.push({
				label: new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short' }).format(cursor),
				key,
				values: { entradas: entries.get(key) || 0, salidas: exits.get(key) || 0 }
			});
			cursor.setDate(cursor.getDate() + 1);
		}
		return days;
	});

	const hourly = $derived.by(() => {
		const entries = new Array(24).fill(0);
		const exits = new Array(24).fill(0);
		for (const visita of visitsInRange) {
			const entry = parseDate(visita.fecha_entrada);
			if (entry) entries[entry.getHours()] += 1;
			const exit = parseDate(visita.fecha_salida);
			if (exit) exits[exit.getHours()] += 1;
		}
		return Array.from({ length: 24 }, (_, hour) => ({
			label: hourLabel(hour),
			values: { entradas: entries[hour], salidas: exits[hour] }
		}));
	});

	const occupancySeries = $derived.by(() => {
		if (!zonaFilter) return [];
		const records = [...occupancyInRange].sort(
			(a, b) => (parseDate(a.fecha_hora)?.getTime() || 0) - (parseDate(b.fecha_hora)?.getTime() || 0)
		);
		return records.slice(-30).map((item) => ({
			label: formatTime(item.fecha_hora),
			value: Number(item.cantidad_vehiculos) || 0
		}));
	});

	const typeBreakdown = $derived.by(() => {
		const counts = new Map();
		for (const evento of eventsInRange) {
			const key = evento.tipo_evento || 'sin-tipo';
			counts.set(key, (counts.get(key) || 0) + 1);
		}
		const total = eventsInRange.length || 1;
		return [...counts.entries()]
			.map(([key, count]) => ({ key, count, share: (count / total) * 100, label: eventLabel(key).label }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 6);
	});

	const occupancyByZone = $derived.by(() => {
		const latest = latestOccupancyByZone(ocupaciones);
		return zonesScoped
			.map((zona) => {
				const latestRecord = latest.get(Number(zona.id_zona)) || null;
				const zoneRecords = occupancyInRange.filter((item) => Number(item.id_zona) === Number(zona.id_zona));
				const avg = zoneRecords.length
					? zoneRecords.reduce((total, item) => total + (Number(item.cantidad_vehiculos) || 0), 0) / zoneRecords.length
					: null;
				const capacity = Number(zona.capacidad_maxima) || 0;
				return {
					zona,
					latest: latestRecord,
					vehicles: latestRecord ? Number(latestRecord.cantidad_vehiculos) : null,
					avg,
					capacity,
					status: occupancyStatus(avg, capacity)
				};
			})
			.sort((a, b) => (b.status.percent ?? -1) - (a.status.percent ?? -1));
	});

	const zoneSummary = $derived(
		zonesScoped.map((zona) => {
			const zoneEvents = eventsInRange.filter((evento) => eventZone(evento) === Number(zona.id_zona));
			const uniqueVisits = new Set(zoneEvents.map((evento) => evento.id_visita).filter(Boolean)).size;
			const zoneAlerts = alertsInRange.filter((alerta) => Number(alerta.id_zona) === Number(zona.id_zona));
			const zoneRecords = occupancyInRange.filter((item) => Number(item.id_zona) === Number(zona.id_zona));
			const avg = zoneRecords.length
				? zoneRecords.reduce((total, item) => total + (Number(item.cantidad_vehiculos) || 0), 0) / zoneRecords.length
				: null;
			const capacity = Number(zona.capacidad_maxima) || 0;
			return {
				zona,
				events: zoneEvents.length,
				visits: uniqueVisits,
				alerts: zoneAlerts.length,
				openAlerts: zoneAlerts.filter((alerta) => alertIsOpen(alerta)).length,
				avg,
				capacity,
				status: occupancyStatus(avg, capacity),
				cameras: camaras.filter((camara) => Number(camara.id_zona) === Number(zona.id_zona)).length
			};
		})
	);

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';
		warnings = [];
		const results = await Promise.allSettled([
			listarVisitas(),
			listarEventos(),
			listarZonas(),
			listarCamaras(),
			listarOcupacion(),
			listarAlertas()
		]);
		const [vis, evt, zon, cam, ocu, ale] = results;
		if (vis.status === 'fulfilled') visitas = Array.isArray(vis.value) ? vis.value : [];
		else {
			visitas = [];
			error = errorMessage(vis.reason);
		}
		eventos = evt.status === 'fulfilled' && Array.isArray(evt.value) ? evt.value : [];
		if (evt.status !== 'fulfilled') warnings.push('Eventos');
		zonas = zon.status === 'fulfilled' && Array.isArray(zon.value) ? zon.value : [];
		if (zon.status !== 'fulfilled') warnings.push('Zonas');
		camaras = cam.status === 'fulfilled' && Array.isArray(cam.value) ? cam.value : [];
		if (cam.status !== 'fulfilled') warnings.push('Cámaras');
		ocupaciones = ocu.status === 'fulfilled' && Array.isArray(ocu.value) ? ocu.value : [];
		if (ocu.status !== 'fulfilled') warnings.push('Ocupación');
		alertas = ale.status === 'fulfilled' && Array.isArray(ale.value) ? ale.value : [];
		if (ale.status !== 'fulfilled') warnings.push('Alertas');
		lastUpdated = new Date();
		loading = false;
	}

	onMount(() => {
		load();
		const handleRefresh = () => load(true);
		window.addEventListener('lpr:refresh', handleRefresh);
		return () => window.removeEventListener('lpr:refresh', handleRefresh);
	});

	function setRange(days) {
		const end = new Date();
		const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
		desde = toDateInput(start);
		hasta = toDateInput(end);
	}

	function exportSummary() {
		if (!zoneSummary.length) {
			toastError('Sin datos para exportar', 'No hay zonas para el reporte actual.');
			return;
		}
		const rows = zoneSummary.map((item) => ({
			zona: item.zona.nombre,
			tipo: item.zona.tipo || '',
			capacidad: item.capacity,
			ocupacion_promedio: item.avg !== null ? Number(item.avg).toFixed(1) : '',
			ocupacion_pct: item.status.percent ?? '',
			eventos: item.events,
			visitas: item.visits,
			alertas: item.alerts,
			alertas_abiertas: item.openAlerts,
			camaras: item.cameras
		}));
		const csv = toCsv(rows, [
			{ label: 'Zona', value: 'zona' },
			{ label: 'Tipo', value: 'tipo' },
			{ label: 'Capacidad', value: 'capacidad' },
			{ label: 'Ocupación promedio', value: 'ocupacion_promedio' },
			{ label: 'Ocupación %', value: 'ocupacion_pct' },
			{ label: 'Eventos', value: 'eventos' },
			{ label: 'Visitas únicas', value: 'visitas' },
			{ label: 'Alertas', value: 'alertas' },
			{ label: 'Alertas abiertas', value: 'alertas_abiertas' },
			{ label: 'Cámaras', value: 'camaras' }
		]);
		downloadCsv(`reporte_operativo_${dateToStamp()}.csv`, csv);
	}
</script>

<PageHeader
	eyebrow="Análisis operativo"
	title="Reportes"
	
>
	{#snippet actions()}
		<button class="btn btn-quiet" type="button" onclick={() => load(true)}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
		<button class="btn btn-quiet" type="button" onclick={exportSummary}>
			<Icon name="download" size={15} />
			Exportar resumen
		</button>
		<button class="btn btn-accent" type="button" onclick={() => window.print()}>
			<Icon name="print" size={15} />
			Imprimir
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel"><LoadingState rows={8} message="Preparando reporte operativo&" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible preparar el reporte" message={error} onretry={() => load()} />
		</div>
	</div>
{:else}
	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Reporte parcial</strong>
				<span>{warnings.join(', ')} no pudieron cargarse. Las secciones dependientes quedarán vacías o incompletas.</span>
			</div>
		</div>
	{/if}

	<section class="panel mb-3">
		<div class="filter-bar filter-bar--report">
			<div class="filter-field filter-field--xs">
				<label for="rep-desde">Desde</label>
				<input id="rep-desde" type="date" class="form-control form-control-sm" bind:value={desde} />
			</div>
			<div class="filter-field filter-field--xs">
				<label for="rep-hasta">Hasta</label>
				<input id="rep-hasta" type="date" class="form-control form-control-sm" bind:value={hasta} />
			</div>
			<div class="filter-field filter-field--md">
				<label for="rep-zona">Zona</label>
				<select id="rep-zona" class="form-select form-select-sm" bind:value={zonaFilter}>
					<option value="">Todas las zonas</option>
					{#each zonas as zona (zona.id_zona)}
						<option value={zona.id_zona}>{zona.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-bar__end">
				<button class="btn btn-quiet btn-sm" type="button" onclick={() => setRange(0)}>Hoy</button>
				<button class="btn btn-quiet btn-sm" type="button" onclick={() => setRange(6)}>7 días</button>
				<button class="btn btn-quiet btn-sm" type="button" onclick={() => setRange(29)}>30 días</button>
			</div>
		</div>
		
	</section>

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<StatCard label="Visitas en el rango" value={formatNumber(kpis.visits)} foot={`${kpis.openVisits} sin salida registrada`} icon="car" tone="ink" />
		</div>
		<div class="col-6 col-lg-3">
			<StatCard label="Duración media" value={kpis.avgDuration !== null ? formatDuration(kpis.avgDuration) : '—'} foot="visitas del rango" icon="clock" tone="accent" />
		</div>
		<div class="col-6 col-lg-3">
			<StatCard label="Eventos" value={formatNumber(kpis.events)} foot={`${typeBreakdown.length} tipos principales`} icon="events" tone="info" />
		</div>
		<div class="col-6 col-lg-3">
			<StatCard label="Alertas" value={formatNumber(kpis.alerts)} foot={`${kpis.openAlerts} abiertas`} icon="alert" tone={kpis.openAlerts ? 'warn' : 'ok'} />
		</div>
	</div>

	<div class="row g-3 mb-3">
		<div class="col-12 col-xl-7">
			<section class="panel h-100">
				<div class="panel__head">
					<div><h3>Entradas y salidas por día</h3><p>Conteo de visitas por fecha de entrada y salida</p></div>
				</div>
				<div class="panel__body">
					<GroupedBarChart
						items={daily}
						series={[
							{ key: 'entradas', label: 'Entradas', tone: 'accent' },
							{ key: 'salidas', label: 'Salidas', tone: 'alt' }
						]}
						height={210}
						showEvery={Math.max(1, Math.ceil(daily.length / 10))}
					/>
				</div>
			</section>
		</div>
		<div class="col-12 col-xl-5">
			<section class="panel h-100">
				<div class="panel__head">
					<div><h3>Distribución por hora</h3><p>Entradas y salidas según hora del día</p></div>
				</div>
				<div class="panel__body">
					<GroupedBarChart
						items={hourly}
						series={[
							{ key: 'entradas', label: 'Entradas', tone: 'accent' },
							{ key: 'salidas', label: 'Salidas', tone: 'alt' }
						]}
						height={210}
						showEvery={3}
					/>
				</div>
			</section>
		</div>
	</div>

	<div class="row g-3 mb-3">
		<div class="col-12 col-xl-7">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Ocupación por zona</h3>
						<p>{zonaFilter ? 'Evolución de la zona seleccionada' : 'Promedio del periodo y última medición'}</p>
					</div>
					{#if kpis.avgOccupancy !== null}
						<span class="pill pill--neutral">Promedio global: {kpis.avgOccupancy.toFixed(1)} vehículos</span>
					{/if}
				</div>
				<div class="panel__body">
					{#if zonaFilter}
						{#if occupancySeries.length}
							<LineChart items={occupancySeries} valueLabel="vehículos" height={210} showEvery={Math.max(1, Math.ceil(occupancySeries.length / 8))} />
						{:else}
							<EmptyState icon="chart" title="Sin mediciones en el rango" message="Seleccione otro periodo o revise la zona." />
						{/if}
					{:else if !occupancyByZone.length}
						<EmptyState icon="zones" title="Sin zonas configuradas" message="No hay zonas para comparar." />
					{:else}
						<div class="bars">
							{#each occupancyByZone as item (item.zona.id_zona)}
								<div class="bar-row">
									<span class="bar-row__label" title={item.zona.nombre}>{item.zona.nombre}</span>
									<span class="bar-row__track">
										<span class="bar-row__fill {item.status.tone}" style={`width: ${Math.min(100, item.status.percent ?? 0)}%`}></span>
									</span>
									<span class="bar-row__value">{item.status.percent !== null ? formatPercent(item.status.percent) : '—'}</span>
								</div>
							{/each}
						</div>
						<div class="chart-note">Porcentaje calculado con la última medición disponible de cada zona, no con el promedio del periodo.</div>
					{/if}
				</div>
			</section>
		</div>
		<div class="col-12 col-xl-5">
			<section class="panel h-100">
				<div class="panel__head">
					<div><h3>Tipos de evento</h3><p>Participación en el rango filtrado</p></div>
				</div>
				<div class="panel__body">
					{#if !typeBreakdown.length}
						<EmptyState icon="events" title="Sin eventos en el rango" message="Ajuste las fechas o la zona." />
					{:else}
						<div class="type-breakdown type-breakdown--stack">
							{#each typeBreakdown as item (item.key)}
								<div class="type-breakdown__row">
									<span class="type-breakdown__label">{item.label}</span>
									<span class="type-breakdown__track"><span style={`width: ${item.share}%`}></span></span>
									<span class="type-breakdown__value">{formatNumber(item.count)}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		</div>
	</div>

	<section class="panel">
		<div class="panel__head">
			<div>
				<h3>Resumen por zona</h3>
				<p>Eventos, visitas únicas y alertas del rango</p>
			</div>
		</div>
		{#if !zoneSummary.length}
			<EmptyState icon="zones" title="Sin zonas para resumir" message="Configure zonas para obtener el desglose operativo." />
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Zona</th>
							<th>Tipo</th>
							<th class="num">Capacidad</th>
							<th class="num">Ocupación promedio</th>
							<th>Estado de ocupación</th>
							<th class="num">Eventos</th>
							<th class="num">Visitas únicas</th>
							<th class="num">Alertas</th>
							<th class="num">Cámaras</th>
						</tr>
					</thead>
					<tbody>
						{#each zoneSummary as item (item.zona.id_zona)}
							<tr>
								<td><span class="cell-strong">{item.zona.nombre}</span></td>
								<td class="fs-7">{item.zona.tipo || '—'}</td>
								<td class="num">{formatNumber(item.capacity)}</td>
								<td class="num">{item.avg !== null ? item.avg.toFixed(1) : '—'}</td>
								<td><StatusPill tone={item.status.tone} label={item.status.percent !== null ? `${item.status.label} · ${formatPercent(item.status.percent)}` : item.status.label} dot={false} /></td>
								<td class="num">{formatNumber(item.events)}</td>
								<td class="num">{formatNumber(item.visits)}</td>
								<td class="num">
									{formatNumber(item.alerts)}
									{#if item.openAlerts}<span class="cell-sub text-warn">{item.openAlerts} abiertas</span>{/if}
								</td>
								<td class="num">{formatNumber(item.cameras)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
		
	</section>

	
{/if}

