<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Confidence from '#lib/components/Confidence.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { obtenerVisita, listarVisitas } from '#lib/service/visitas.js';
	import { listarVehiculos } from '#lib/service/vehiculos.js';
	import { listarEventos } from '#lib/service/eventos.js';
	import { listarSeguimientos } from '#lib/service/seguimientos.js';
	import { listarZonas } from '#lib/service/zonas.js';
	import { listarCamaras } from '#lib/service/camaras.js';
	import { listarAlertas } from '#lib/service/alertas.js';
	import { errorMessage, ApiError } from '#lib/service/client.js';
	import {
		formatDateTime,
		formatDuration,
		formatNumber,
		minutesBetween,
		parseDate
	} from '#lib/utils/format.js';
	import { visitStatus, eventLabel, alertResolution, alertIsOpen } from '#lib/utils/domain.js';

	const id = $derived(Number(page.params.id));

	let visita = $state(null);
	let vehiculo = $state(null);
	let eventos = $state([]);
	let seguimientos = $state([]);
	let zonas = $state([]);
	let camaras = $state([]);
	let alertas = $state([]);
	let loading = $state(true);
	let error = $state('');
	let notFound = $state(false);
	let warnings = $state([]);
	let loadedId = $state(null);

	const zonaById = $derived(new Map(zonas.map((item) => [Number(item.id_zona), item])));
	const camaraById = $derived(new Map(camaras.map((item) => [Number(item.id_camara), item])));
	const status = $derived(visitStatus(visita));
	const duration = $derived(visita ? minutesBetween(visita.fecha_entrada, visita.fecha_salida || null) : null);

	const visitEvents = $derived(
		eventos
			.filter((evento) => Number(evento.id_visita) === Number(id))
			.sort((a, b) => (parseDate(a.fecha_hora)?.getTime() || 0) - (parseDate(b.fecha_hora)?.getTime() || 0))
	);
	const visitTracks = $derived(
		seguimientos
			.filter((item) => Number(item.id_visita) === Number(id))
			.sort((a, b) => (parseDate(a.inicio)?.getTime() || 0) - (parseDate(b.inicio)?.getTime() || 0))
	);
	const visitAlerts = $derived(
		alertas
			.filter((item) => Number(item.id_visita) === Number(id))
			.sort((a, b) => (parseDate(b.fecha_deteccion)?.getTime() || 0) - (parseDate(a.fecha_deteccion)?.getTime() || 0))
	);
	const observedZones = $derived.by(() => {
		const ids = new Set();
		for (const evento of visitEvents) ids.add(Number(evento.id_zona));
		for (const track of visitTracks) {
			const camara = camaraById.get(Number(track.id_camara));
			if (camara) ids.add(Number(camara.id_zona));
		}
		return [...ids].filter(Boolean).map((zoneId) => zonaById.get(zoneId)).filter(Boolean);
	});
	const observedCameras = $derived.by(() => {
		const ids = new Set();
		for (const evento of visitEvents) ids.add(Number(evento.id_camara));
		for (const track of visitTracks) ids.add(Number(track.id_camara));
		return [...ids].filter(Boolean).map((cameraId) => camaraById.get(cameraId)).filter(Boolean);
	});

	async function load() {
		loading = true;
		error = '';
		notFound = false;
		warnings = [];
		try {
			visita = await obtenerVisita(id);
			loadedId = id;
		} catch (err) {
			if (err instanceof ApiError && err.status === 404) {
				notFound = true;
			} else {
				error = errorMessage(err);
			}
			loading = false;
			return;
		}

		const sources = [
			['vehiculos', listarVehiculos, 'Vehículos'],
			['eventos', listarEventos, 'Eventos'],
			['seguimientos', listarSeguimientos, 'Seguimientos'],
			['zonas', listarZonas, 'Zonas'],
			['camaras', listarCamaras, 'Cámaras'],
			['alertas', listarAlertas, 'Alertas']
		];
		const results = await Promise.allSettled(sources.map(([, fn]) => fn()));
		const failures = [];
		results.forEach((result, index) => {
			const [key, , label] = sources[index];
			if (result.status === 'fulfilled') {
				const items = Array.isArray(result.value) ? result.value : [];
				if (key === 'vehiculos') {
					vehiculo = items.find((item) => Number(item.id_vehiculo) === Number(visita.id_vehiculo)) || null;
				}
				if (key === 'eventos') eventos = items;
				if (key === 'seguimientos') seguimientos = items;
				if (key === 'zonas') zonas = items;
				if (key === 'camaras') camaras = items;
				if (key === 'alertas') alertas = items;
			} else {
				failures.push({ label, message: errorMessage(result.reason) });
			}
		});
		warnings = failures;
		loading = false;
	}

	$effect(() => {
		const current = id;
		if (Number.isFinite(current) && current > 0 && current !== loadedId) {
			load();
		}
	});

	function printPage() {
		window.print();
	}
</script>

{#if loading}
	<div class="panel"><LoadingState rows={7} message="Cargando detalle de la visita…" /></div>
{:else if notFound}
	<PageHeader eyebrow="Trazabilidad" title="Visita no encontrada" description="El identificador solicitado no existe en el backend." />
	<div class="panel">
		<EmptyState
			icon="history"
			title="Visita no disponible"
			message="Puede volver al historial y seleccionar otra visita."
			actionLabel="Volver al historial"
			onaction={() => goto('/visitas')}
		/>
	</div>
{:else if error}
	<PageHeader eyebrow="Trazabilidad" title={`Visita #${id}`} />
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible cargar la visita" message={error} onretry={load} />
		</div>
	</div>
{:else if visita}
	<div class="mb-3">
		<a href="/visitas" class="btn btn-quiet btn-xs">
			<Icon name="chevron-left" size={13} />
			Volver al historial
		</a>
	</div>

	<PageHeader eyebrow="Detalle de visita" title={`Visita #${visita.id_visita}`} description="Eventos, seguimientos y zonas observadas asociados a esta estancia. La información refleja lo registrado por el backend.">
		{#snippet actions()}
			<StatusPill tone={status.tone} label={status.label} />
			<button class="btn btn-quiet" type="button" onclick={printPage}>
				<Icon name="file-chart" size={15} />
				Imprimir
			</button>
			<button class="btn btn-quiet" type="button" onclick={load}>
				<Icon name="refresh" size={15} />
				Actualizar
			</button>
		{/snippet}
	</PageHeader>

	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Información parcial</strong>
				<span>{warnings.map((item) => item.label).join(', ')} no pudieron cargarse.</span>
			</div>
		</div>
	{/if}

	<div class="row g-3 mb-3">
		<div class="col-12 col-xl-7">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Resumen de la estancia</h3>
						<p>Datos calculados a partir de los tiempos registrados</p>
					</div>
				</div>
				<div class="panel__body">
					<div class="kpi-inline mb-3">
						<div>
							<dt>Entrada</dt>
							<dd style="font-size: 1rem;">{formatDateTime(visita.fecha_entrada)}</dd>
						</div>
						<div>
							<dt>Salida</dt>
							<dd style="font-size: 1rem;">{visita.fecha_salida ? formatDateTime(visita.fecha_salida) : 'Sin salida'}</dd>
						</div>
						<div>
							<dt>Duración</dt>
							<dd>{formatDuration(duration)}</dd>
						</div>
					</div>

					<dl class="definition-grid">
						<div>
							<dt>ID de visita</dt>
							<dd>#{visita.id_visita}</dd>
						</div>
						<div>
							<dt>Estado</dt>
							<dd>{status.label}</dd>
						</div>
						<div>
							<dt>ID de vehículo</dt>
							<dd>{visita.id_vehiculo ?? 'No disponible'}</dd>
						</div>
						<div>
							<dt>Placa</dt>
							<dd>{vehiculo?.placa || 'No reconocida'}</dd>
						</div>
						<div>
							<dt>Marca / modelo</dt>
							<dd>{[vehiculo?.marca, vehiculo?.modelo].filter(Boolean).join(' ') || 'Sin datos'}</dd>
						</div>
						<div>
							<dt>Color</dt>
							<dd>{vehiculo?.color || 'Sin datos'}</dd>
						</div>
					</dl>

					<div class="panel-note mt-3">
						<Icon name="info" size={15} />
						<span>
							La placa y los datos del vehículo provienen del registro asociado a la visita. No constituyen por sí solos una confirmación de identidad cuando la confianza de detección es baja.
						</span>
					</div>
				</div>
			</section>
		</div>

		<div class="col-12 col-xl-5">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Indicadores vinculados</h3>
						<p>Conteos reportados para esta visita</p>
					</div>
				</div>
				<div class="panel__body">
					<div class="kpi-inline">
						<div>
							<dt>Eventos</dt>
							<dd>{formatNumber(visitEvents.length)}</dd>
						</div>
						<div>
							<dt>Seguimientos</dt>
							<dd>{formatNumber(visitTracks.length)}</dd>
						</div>
						<div>
							<dt>Zonas</dt>
							<dd>{formatNumber(observedZones.length)}</dd>
						</div>
						<div>
							<dt>Alertas</dt>
							<dd>{formatNumber(visitAlerts.length)}</dd>
						</div>
					</div>

					<div class="divider"></div>

					<div class="eyebrow-plain mb-2">Zonas observadas</div>
					{#if observedZones.length}
						<div class="inline-list">
							{#each observedZones as zona (zona.id_zona)}
								<span class="pill pill--neutral">{zona.nombre}</span>
							{/each}
						</div>
					{:else}
						<p class="fs-8 text-faint mb-0">No hay zonas asociadas a los eventos de esta visita.</p>
					{/if}

					<div class="eyebrow-plain mt-3 mb-2">Cámaras participantes</div>
					{#if observedCameras.length}
						<div class="inline-list">
							{#each observedCameras as camara (camara.id_camara)}
								<span class="pill pill--neutral">{camara.nombre}</span>
							{/each}
						</div>
					{:else}
						<p class="fs-8 text-faint mb-0">No hay cámaras asociadas.</p>
					{/if}
				</div>
			</section>
		</div>
	</div>

	<div class="row g-3 mb-3">
		<div class="col-12 col-xl-7">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Línea de tiempo de eventos</h3>
						<p>Orden cronolónico · {visitEvents.length} registros</p>
					</div>
				</div>
				<div class="panel__body">
					{#if !visitEvents.length}
						<EmptyState icon="events" title="Sin eventos asociados" message="El backend no reporta eventos para esta visita." />
					{:else}
						<ol class="timeline">
							{#each visitEvents as evento (evento.id_evento)}
								{@const meta = eventLabel(evento.tipo_evento)}
								{@const zona = zonaById.get(Number(evento.id_zona))}
								{@const camara = camaraById.get(Number(evento.id_camara))}
								<li class="timeline-item">
									<span class="timeline-item__dot {meta.tone === 'danger' ? 'danger' : meta.tone === 'ok' ? 'ok' : meta.tone === 'accent' ? 'accent' : meta.tone === 'warn' ? 'warn' : ''}"></span>
									<div class="timeline-item__top">
										<strong>{meta.label}</strong>
										<StatusPill tone={meta.tone} label={`Evento #${evento.id_evento}`} dot={false} />
										<span class="timeline-item__time">{formatDateTime(evento.fecha_hora)}</span>
									</div>
									<div class="timeline-item__body">
										{#if camara || zona}
											{camara?.nombre || `Cámara ${evento.id_camara ?? '—'}`}
											{#if zona} · {zona.nombre}{/if}
										{:else}
											Sin cámara o zona reportada.
										{/if}
									</div>
									<div class="timeline-item__meta">
										{#if evento.id_seguimiento}<span>Seguimiento #{evento.id_seguimiento}</span>{/if}
										{#if evento.confianza !== null && evento.confianza !== undefined}
											<span>Confianza: <Confidence value={evento.confianza} /></span>
										{/if}
									</div>
								</li>
							{/each}
						</ol>
					{/if}
				</div>
			</section>
		</div>

		<div class="col-12 col-xl-5">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Alertas de la visita</h3>
						<p>Situaciones que requieren atención</p>
					</div>
					<a class="btn btn-quiet btn-xs" href="/alertas">Ver alertas</a>
				</div>
				<div class="panel__body panel__body--flush">
					{#if !visitAlerts.length}
						<EmptyState icon="check" title="Sin alertas" message="No hay alertas asociadas a esta visita." />
					{:else}
						<div class="p-2 alert-rule-list">
							{#each visitAlerts as alerta (alerta.id_alerta)}
								{@const resolution = alertResolution(alerta)}
								<div class="alert-rule">
									<span class="alert-rule__sev {resolution.tone === 'danger' ? 'danger' : resolution.tone === 'info' ? 'info' : ''}"></span>
									<div class="min-w-0">
										<strong>{alerta.tipo_alerta}</strong>
										<p>{alerta.mensaje}</p>
										<div class="fs-8 text-faint mt-1">{formatDateTime(alerta.fecha_deteccion)}</div>
									</div>
									<div class="alert-rule__meta">
										<StatusPill tone={resolution.tone} label={resolution.label} dot={false} />
									</div>
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
				<h3>Seguimientos asociados</h3>
				<p>Segmentos de detección local por cámara</p>
			</div>
		</div>
		{#if !visitTracks.length}
			<EmptyState icon="route" title="Sin seguimientos asociados" message="El backend no reporta segmentos de seguimiento para esta visita." />
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>ID</th>
							<th>Tracking</th>
							<th>Cámara</th>
							<th>Inicio</th>
							<th>Fin</th>
							<th>Duración</th>
							<th>Confianza prom.</th>
						</tr>
					</thead>
					<tbody>
						{#each visitTracks as track (track.id_seguimiento)}
							{@const camara = camaraById.get(Number(track.id_camara))}
							<tr>
								<td><span class="cell-strong">#{track.id_seguimiento}</span></td>
								<td><code>{track.id_tracking || '—'}</code></td>
								<td>{camara?.nombre || `Cámara ${track.id_camara ?? '—'}`}</td>
								<td class="nowrap">{formatDateTime(track.inicio)}</td>
								<td class="nowrap">{track.fin ? formatDateTime(track.fin) : 'En curso'}</td>
								<td class="nowrap">{formatDuration(minutesBetween(track.inicio, track.fin || null))}</td>
								<td><Confidence value={track.confianza_promedio} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</section>
{/if}
