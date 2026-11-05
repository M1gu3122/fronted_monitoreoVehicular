<script>
	import { onMount } from "svelte";
	import PageHeader from "#lib/components/PageHeader.svelte";
	import StatCard from "#lib/components/StatCard.svelte";
	import StatusPill from "#lib/components/StatusPill.svelte";
	import Confidence from "#lib/components/Confidence.svelte";
	import GroupedBarChart from "#lib/components/GroupedBarChart.svelte";
	import LineChart from "#lib/components/LineChart.svelte";
	import LoadingState from "#lib/components/LoadingState.svelte";
	import ErrorState from "#lib/components/ErrorState.svelte";
	import EmptyState from "#lib/components/EmptyState.svelte";
	import Icon from "#lib/components/Icon.svelte";
	import { listarVisitas } from "#lib/service/visitas.js";
	import { listarVehiculos } from "#lib/service/vehiculos.js";
	import { listarZonas } from "#lib/service/zonas.js";
	import { listarCamaras } from "#lib/service/camaras.js";
	import { listarAlertas } from "#lib/service/alertas.js";
	import { listarEventos } from "#lib/service/eventos.js";
	import { listarOcupacion } from "#lib/service/ocupacion.js";
	import { preferences } from "#lib/stores/preferences.svelte.js";
	import { errorMessage } from "#lib/service/client.js";
	import {
		formatDate,
		formatDateTime,
		formatTime,
		formatNumber,
		formatPercent,
		minutesBetween,
		parseDate,
		isToday,
	} from "#lib/utils/format.js";
	import {
		eventLabel,
		latestOccupancyByZone,
		alertIsOpen,
		alertResolution,
		occupancyStatus,
		occupancyFillClass,
	} from "#lib/utils/domain.js";

	let data = $state({
		visitas: [],
		vehiculos: [],
		zonas: [],
		camaras: [],
		alertas: [],
		eventos: [],
		ocupacion: [],
	});
	let loading = $state(true);
	let refreshing = $state(false);
	let failures = $state([]);
	let fatal = $state(null);
	let lastUpdated = $state(null);

	const vehiculoById = $derived(
		new Map(data.vehiculos.map((item) => [Number(item.id_vehiculo), item])),
	);
	const zonaById = $derived(
		new Map(data.zonas.map((item) => [Number(item.id_zona), item])),
	);
	const camaraById = $derived(
		new Map(data.camaras.map((item) => [Number(item.id_camara), item])),
	);

	const activeVisits = $derived(
		data.visitas.filter(
			(visita) => visita.estado !== false && !visita.fecha_salida,
		),
	);
	const todayEntries = $derived(
		data.visitas.filter((visita) => isToday(visita.fecha_entrada)),
	);
	const todayExits = $derived(
		data.visitas.filter((visita) => isToday(visita.fecha_salida)),
	);
	const openAlerts = $derived(data.alertas.filter(alertIsOpen));
	const prolonged = $derived(
		activeVisits.filter((visita) => {
			const minutes = minutesBetween(visita.fecha_entrada);
			return (
				minutes !== null &&
				minutes > Number(preferences.umbralPermanenciaMin)
			);
		}),
	);
	const activeCameras = $derived(
		data.camaras.filter((camara) => camara.estado !== false),
	);

	const latestOccupancy = $derived(latestOccupancyByZone(data.ocupacion));
	const zoneSnapshot = $derived(
		data.zonas
			.map((zona) => {
				const record =
					latestOccupancy.get(Number(zona.id_zona)) || null;
				const vehicles = record
					? Number(record.cantidad_vehiculos)
					: null;
				const capacity = Number(zona.capacidad_maxima) || 0;
				const state = occupancyStatus(vehicles, capacity);
				return { zona, record, vehicles, capacity, state };
			})
			.sort((a, b) => {
				const av = a.state.percent;
				const bv = b.state.percent;
				if (av === null && bv === null)
					return a.zona.nombre.localeCompare(b.zona.nombre);
				if (av === null) return 1;
				if (bv === null) return -1;
				return bv - av;
			}),
	);
	const zonesOccupied = $derived(
		zoneSnapshot.filter((item) => (item.vehicles ?? 0) > 0),
	);
	const zonesWithoutData = $derived(
		zoneSnapshot.filter((item) => item.vehicles === null),
	);

	const recentEvents = $derived(
		[...data.eventos]
			.sort(
				(a, b) =>
					(parseDate(b.fecha_hora)?.getTime() || 0) -
					(parseDate(a.fecha_hora)?.getTime() || 0),
			)
			.slice(0, 8),
	);

	const recentAlerts = $derived(
		[...data.alertas]
			.filter(alertIsOpen)
			.sort(
				(a, b) =>
					(parseDate(b.fecha_deteccion)?.getTime() || 0) -
					(parseDate(a.fecha_deteccion)?.getTime() || 0),
			)
			.slice(0, 5),
	);

	const hourlyFlow = $derived.by(() => {
		const hours = Array.from({ length: 24 }, (_, hour) => ({
			label: `${String(hour).padStart(2, "0")}h`,
			values: { entradas: 0, salidas: 0 },
		}));
		for (const visita of todayEntries) {
			const date = parseDate(visita.fecha_entrada);
			if (date) hours[date.getHours()].values.entradas += 1;
		}
		for (const visita of todayExits) {
			const date = parseDate(visita.fecha_salida);
			if (date) hours[date.getHours()].values.salidas += 1;
		}
		return hours;
	});

	const hourlyEvolution = $derived.by(() => {
		return Array.from({ length: 24 }, (_, hour) => {
			const cutoff = new Date();
			cutoff.setHours(hour, 59, 59, 999);
			const count = data.visitas.filter((visita) => {
				const entry = parseDate(visita.fecha_entrada);
				if (!entry || entry > cutoff) return false;
				const exit = parseDate(visita.fecha_salida);
				return !exit || exit > cutoff;
			}).length;
			return { label: `${String(hour).padStart(2, "0")}h`, value: count };
		});
	});

	const flowTotal = $derived({
		entries: todayEntries.length,
		exits: todayExits.length,
		net: todayEntries.length - todayExits.length,
	});

	function vehicleLabel(visita) {
		const vehiculo = vehiculoById.get(Number(visita?.id_vehiculo));
		if (!vehiculo) return null;
		return vehiculo;
	}

	async function load(silent = false) {
		if (refreshing) return;
		if (silent) refreshing = true;
		else loading = true;
		fatal = null;

		const requests = [
			["visitas", listarVisitas, "Visitas"],
			["vehiculos", listarVehiculos, "Vehículos"],
			["zonas", listarZonas, "Zonas"],
			["camaras", listarCamaras, "Cámaras"],
			["alertas", listarAlertas, "Alertas"],
			["eventos", listarEventos, "Eventos"],
			["ocupacion", listarOcupacion, "Ocupación"],
		];

		const results = await Promise.allSettled(
			requests.map(([, fn]) => fn()),
		);
		const nextData = { ...data };
		const errors = [];

		results.forEach((result, index) => {
			const [key, , label] = requests[index];
			if (result.status === "fulfilled") {
				nextData[key] = Array.isArray(result.value) ? result.value : [];
			} else {
				nextData[key] = [];
				errors.push({ label, message: errorMessage(result.reason) });
			}
		});

		data = nextData;
		failures = errors;
		if (errors.length === requests.length) fatal = errors[0];
		lastUpdated = new Date();
		loading = false;
		refreshing = false;
	}

	onMount(() => {
		load();
		const handleRefresh = () => load(true);
		window.addEventListener("lpr:refresh", handleRefresh);
		return () => window.removeEventListener("lpr:refresh", handleRefresh);
	});

	$effect(() => {
		const seconds = Math.max(
			10,
			Number(preferences.refreshIntervalSec) || 30,
		);
		const interval = setInterval(() => {
			if (!document.hidden && !loading) load(true);
		}, seconds * 1000);
		return () => clearInterval(interval);
	});
</script>

<PageHeader
	eyebrow="Centro de control"
	title="Estado del área de mantenimiento"
	description="Lectura consolidada del flujo vehicular, ocupación por zona y alertas abiertas."
>
	{#snippet actions()}
		<span class="text-faint fs-8">
			{#if lastUpdated}
				Actualizado {formatTime(lastUpdated)}
				{#if refreshing}<span class="spinner-inline ms-1"></span>{/if}
			{/if}
		</span>
		<button
			class="btn btn-quiet"
			type="button"
			onclick={() => load(true)}
			disabled={refreshing}
		>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel">
		<LoadingState
			rows={8}
			message="Consultando visitas, zonas, cámaras y alertas…"
		/>
	</div>
{:else if fatal}
	<div class="panel">
		<div class="panel__body">
			<ErrorState
				title="El dashboard no pudo obtener datos del backend"
				message={fatal.message}
				hint="El frontend está conectado a la API configurada. Si el backend está activo, revise que PostgreSQL esté disponible y que los endpoints respondan."
				onretry={() => load()}
			/>
		</div>
	</div>
{:else}
	{#if failures.length}
		<div class="alert-app alert-app--warn mb-3" role="status">
			<Icon name="alert" size={18} />
			<div>
				<strong>Algunos indicadores no pudieron cargarse</strong>
				<span>
					{#each failures as failure, index (failure.label)}
						{failure.label}: {failure.message}{index <
						failures.length - 1
							? " · "
							: ""}
					{/each}
				</span>
			</div>
		</div>
	{/if}

	<div class="row mb-3">
		<div class="col-12 col-md-6 col-lg-3">
			<StatCard
				class="col-6 col-lg-3"
				label="Vehículos dentro del área"
				value={formatNumber(activeVisits.length)}
				icon="car"
				tone="accent"
				foot="Visitas sin salida registrada"
				href="/monitoreo"
			/>
		</div>
		<div class="col-12 col-md col-lg-3">
			<StatCard
				label="Entradas hoy"
				value={formatNumber(todayEntries.length)}
				icon="arrow-right"
				tone="ok"
				foot={formatDate(new Date())}
				href="/visitas?date=today"
			/>
		</div>

		<div class="col-12 col-md-6 col-lg-3">
			<StatCard
				label="Salidas hoy"
				value={formatNumber(todayExits.length)}
				icon="logout"
				tone="info"
				foot={`Balance del día: ${flowTotal.net >= 0 ? "+" : ""}${flowTotal.net}`}
				href="/visitas?date=today"
			/>
		</div>
		<div class="col-12 col-md-6 col-lg-3">
			<StatCard
				label="Alertas pendientes"
				value={formatNumber(openAlerts.length)}
				icon="alert"
				tone={openAlerts.length ? "warn" : "ok"}
				foot={openAlerts.length
					? "Requieren revisión"
					: "Sin alertas abiertas"}
				href="/alertas?estado=pendiente"
			/>
		</div>
	</div>

	<div class="row mb-3 mt-3">
		<div class="col-12 col-md-6 col-lg-3">
			<StatCard
				label="Permanencia prolongada"
				value={formatNumber(prolonged.length)}
				icon="clock"
				tone={prolonged.length ? "danger" : "ok"}
				foot={`Umbral local: ${preferences.umbralPermanenciaMin} min`}
				href="/monitoreo?permanencia=excedida"
			/>
		</div>
		<div class="col-12 col-md-6 col-lg-3">
			<StatCard
				label="Zonas ocupadas"
				value={`${zonesOccupied.length}/${data.zonas.length}`}
				icon="zones"
				tone="info"
				foot={zonesWithoutData.length
					? `${zonesWithoutData.length} sin medición reciente`
					: "Con medición de ocupación"}
				href="/zonas"
			/>
		</div>
		<div class="col-12 col-md-6 col-lg-3">
			<StatCard
				label="Cámaras activas"
				value={`${activeCameras.length}/${data.camaras.length}`}
				icon="camera"
				tone="ok"
				foot="Estado de conexión reportado"
				href="/camaras"
			/>
		</div>
		<div class="col-12 col-md-6 col-lg-3">
			<StatCard
				label="Visitas registradas"
				value={formatNumber(data.visitas.length)}
				icon="history"
				tone=""
				foot="Total disponible en la API"
				href="/visitas"
			/>
		</div>
	</div>

	<div class="row g-3 mb-3">
		<div class="col-12 col-xl-7">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Entradas y salidas por hora</h3>
						<p>
							Movimientos registrados hoy · {formatDate(
								new Date(),
							)}
						</p>
					</div>
					<div class="panel__head-tools">
						<span class="pill pill--neutral"
							>{flowTotal.entries} entradas · {flowTotal.exits} salidas</span
						>
					</div>
				</div>
				<div class="panel__body">
					<GroupedBarChart
						items={hourlyFlow}
						series={[
							{
								key: "entradas",
								label: "Entradas",
								tone: "accent",
							},
							{ key: "salidas", label: "Salidas", tone: "alt" },
						]}
						showEvery={3}
						emptyMessage="No hay movimientos registrados hoy."
					/>
				</div>
			</section>
		</div>
		<div class="col-12 col-xl-5">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Vehículos dentro por hora</h3>
						<p>Estimación a partir de entradas y salidas del día</p>
					</div>
				</div>
				<div class="panel__body">
					<LineChart
						items={hourlyEvolution}
						valueLabel="visitas dentro"
						showEvery={3}
						emptyMessage="No hay visitas para estimar la evolución del día."
					/>
					<p class="fs-8 text-faint mt-2 mb-0">
						La curva considera visitas con entrada registrada y sin
						salida al cierre de cada hora.
					</p>
				</div>
			</section>
		</div>
	</div>

	<div class="row g-3 mb-3">
		<div class="col-12 col-xl-5">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Ocupación por zona</h3>
						<p>
							Última medición disponible en <code
								>ocupacion_zona</code
							>
						</p>
					</div>
					<a class="btn btn-quiet btn-xs" href="/zonas">Ver zonas</a>
				</div>
				<div class="panel__body panel__body--flush">
					{#if !zoneSnapshot.length}
						<EmptyState
							icon="zones"
							title="Sin zonas configuradas"
							message="Registre zonas para consultar su capacidad y ocupación."
						/>
					{:else}
						<div class="p-2">
							{#each zoneSnapshot as item (item.zona.id_zona)}
								<div
									class="d-flex align-items-center gap-2 px-2 py-2 border-bottom"
									style="border-color: var(--line) !important;"
								>
									<div
										class="min-w-0"
										style="flex: 1 1 auto;"
									>
										<div
											class="fw-semibold text-truncate"
											style="font-size: 0.8rem;"
										>
											{item.zona.nombre}
										</div>
										<div class="fs-8 text-faint">
											{item.record
												? `${item.vehicles} de ${item.capacity} cupos · ${formatDateTime(item.record.fecha_hora)}`
												: `Capacidad ${item.capacity} · sin medición`}
										</div>
									</div>
									<div
										class="occupancy"
										style="flex: 0 0 150px;"
									>
										<span class="occupancy__track">
											<span
												class="occupancy__fill {occupancyFillClass(
													item.state.percent,
												)}"
												style={`width: ${Math.min(100, item.state.percent ?? 0)}%`}
											></span>
										</span>
										<span class="occupancy__value">
											{item.state.percent !== null
												? formatPercent(
														item.state.percent,
													)
												: "—"}
										</span>
									</div>
									<StatusPill
										tone={item.state.tone}
										label={item.state.label}
										dot={false}
									/>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<div class="panel__foot">
					Una zona sin medición reciente no se presenta como vacía.
				</div>
			</section>
		</div>

		<div class="col-12 col-xl-7">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Últimos eventos registrados</h3>
						<p>
							Detecciones puntuales del sistema de visión
							artificial
						</p>
					</div>
					<a class="btn btn-quiet btn-xs" href="/eventos">Ver todos</a
					>
				</div>
				<div class="panel__body panel__body--flush">
					{#if !recentEvents.length}
						<EmptyState
							icon="events"
							title="Sin eventos disponibles"
							message="El backend no reporta eventos de vehículo. Verifique que el procesamiento de visión artificial esté activo."
						/>
					{:else}
						<div class="table-wrap">
							<table class="data-table">
								<thead>
									<tr>
										<th>Evento</th>
										<th>Fecha y hora</th>
										<th>Cámara</th>
										<th>Zona</th>
										<th>Visita</th>
										<th>Confianza</th>
									</tr>
								</thead>
								<tbody>
									{#each recentEvents as evento (evento.id_evento)}
										{@const meta = eventLabel(
											evento.tipo_evento,
										)}
										{@const camara = camaraById.get(
											Number(evento.id_camara),
										)}
										{@const zona = zonaById.get(
											Number(evento.id_zona),
										)}
										<tr>
											<td
												><StatusPill
													tone={meta.tone}
													label={meta.label}
													dot={false}
												/></td
											>
											<td class="nowrap"
												>{formatDateTime(
													evento.fecha_hora,
												)}</td
											>
											<td
												class="truncate"
												style="max-width: 130px;"
												>{camara?.nombre ||
													`Cámara ${evento.id_camara ?? "—"}`}</td
											>
											<td
												class="truncate"
												style="max-width: 130px;"
												>{zona?.nombre ||
													`Zona ${evento.id_zona ?? "—"}`}</td
											>
											<td
												><a
													href={`/visitas/${evento.id_visita}`}
													>#{evento.id_visita}</a
												></td
											>
											<td
												><Confidence
													value={evento.confianza}
												/></td
											>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</div>
			</section>
		</div>
	</div>

	<div class="row g-3">
		<div class="col-12 col-xl-7">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Alertas abiertas</h3>
						<p>Situaciones que requieren atención operativa</p>
					</div>
					<a
						class="btn btn-quiet btn-xs"
						href="/alertas?estado=pendiente">Gestionar alertas</a
					>
				</div>
				<div class="panel__body panel__body--flush">
					{#if !recentAlerts.length}
						<EmptyState
							icon="check"
							title="Sin alertas abiertas"
							message="No hay alertas pendientes o en proceso reportadas por el backend."
						/>
					{:else}
						<div class="p-2 alert-rule-list">
							{#each recentAlerts as alerta (alerta.id_alerta)}
								{@const resolution = alertResolution(alerta)}
								{@const zona = zonaById.get(
									Number(alerta.id_zona),
								)}
								<div class="alert-rule">
									<span
										class="alert-rule__sev {resolution.tone ===
										'danger'
											? 'danger'
											: resolution.tone === 'info'
												? 'info'
												: ''}"
									></span>
									<div class="min-w-0">
										<strong
											>{alerta.tipo_alerta ||
												"Alerta"}</strong
										>
										<p class="text-truncate">
											{alerta.mensaje ||
												"Sin descripción"}
										</p>
										<div class="fs-8 text-faint mt-1">
											{zona?.nombre ||
												`Zona ${alerta.id_zona ?? "—"}`}
											{#if alerta.id_visita}
												· <a
													href={`/visitas/${alerta.id_visita}`}
													>Visita #{alerta.id_visita}</a
												>{/if}
										</div>
									</div>
									<div class="alert-rule__meta">
										<StatusPill
											tone={resolution.tone}
											label={resolution.label}
											dot={false}
										/>
										<div class="mt-1">
											{formatDateTime(
												alerta.fecha_deteccion,
											)}
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</section>
		</div>

		<div class="col-12 col-xl-5">
			<section class="panel h-100">
				<div class="panel__head">
					<div>
						<h3>Estado de cámaras</h3>
						
					</div>
					<a class="btn btn-quiet btn-xs" href="/camaras"
						>Ver cámaras</a
					>
				</div>
				<div class="panel__body">
					<div class="kpi-inline mb-3">
						<dl>
							<dt>Activas</dt>
							<dd>{activeCameras.length}</dd>
						</dl>
						<dl>
							<dt>Inactivas</dt>
							<dd>
								{data.camaras.length - activeCameras.length}
							</dd>
						</dl>
						<dl>
							<dt>Total</dt>
							<dd>{data.camaras.length}</dd>
						</dl>
					</div>
					<div class="stack-sm">
						{#each data.camaras.slice(0, 6) as camara (camara.id_camara)}
							{@const zona = zonaById.get(Number(camara.id_zona))}
							<div class="d-flex align-items-center gap-2">
								<Icon name="camera" size={15} />
								<div class="min-w-0 flex-grow-1">
									<div
										class="text-truncate"
										style="font-size: 0.78rem;"
									>
										{camara.nombre}
									</div>
									<div class="fs-8 text-faint text-truncate">
										{zona?.nombre ||
											camara.ubicacion ||
											"Sin zona"}
									</div>
								</div>
								<StatusPill
									tone={camara.estado === false
										? "danger"
										: "ok"}
									label={camara.estado === false
										? "Inactiva"
										: "Activa"}
									dot={false}
								/>
							</div>
						{/each}
						{#if !data.camaras.length}
							<p class="fs-8 text-faint mb-0">
								No hay cámaras registradas.
							</p>
						{/if}
					</div>
					
				</div>
			</section>
		</div>
	</div>

	
{/if}
