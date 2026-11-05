<script>
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { listarAlertas, actualizarAlerta } from '#lib/service/alertas.js';
	import { listarZonas } from '#lib/service/zonas.js';
	import { listarVisitas } from '#lib/service/visitas.js';
	import { listarVehiculos } from '#lib/service/vehiculos.js';
	import { errorMessage } from '#lib/service/client.js';
	import { preferences } from '#lib/stores/preferences.svelte.js';
	import { session } from '#lib/stores/session.svelte.js';
	import { pushToast, toastError } from '#lib/stores/toasts.svelte.js';
	import {
		formatDateTime,
		formatDuration,
		formatNumber,
		minutesBetween,
		parseDate
	} from '#lib/utils/format.js';
	import { alertResolution, alertResolutionKey, alertIsOpen } from '#lib/utils/domain.js';
	import { includesText, paginate, toCsv, downloadCsv, dateToStamp } from '#lib/utils/data.js';

	let alertas = $state([]);
	let zonas = $state([]);
	let visitas = $state([]);
	let vehiculos = $state([]);
	let loading = $state(true);
	let error = $state('');
	let warnings = $state([]);
	let lastUpdated = $state(null);

	let search = $state('');
	let resolucionFilter = $state('abiertas');
	let tipoFilter = $state('');
	let zonaFilter = $state('');
	let desde = $state('');
	let hasta = $state('');
	let pageNumber = $state(1);
	let detail = $state(null);
	let updating = $state(false);

	const zoneById = $derived(new Map(zonas.map((item) => [Number(item.id_zona), item])));
	const visitById = $derived(new Map(visitas.map((item) => [Number(item.id_visita), item])));
	const vehicleById = $derived(new Map(vehiculos.map((item) => [Number(item.id_vehiculo), item])));

	function plateOf(alerta) {
		const visita = visitById.get(Number(alerta.id_visita));
		const vehiculo = visita ? vehicleById.get(Number(visita.id_vehiculo)) : null;
		return vehiculo?.placa || null;
	}

	const tipos = $derived(
		[...new Set(alertas.map((item) => item.tipo_alerta).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
	);

	const enriched = $derived(
		alertas.map((alerta) => ({
			alerta,
			resolution: alertResolution(alerta),
			abierta: alertIsOpen(alerta),
			zona: zoneById.get(Number(alerta.id_zona)) || null,
			visita: visitById.get(Number(alerta.id_visita)) || null,
			plate: plateOf(alerta)
		}))
	);

	const filtered = $derived.by(() => {
		const fromStamp = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
		const toStamp = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;
		return enriched
			.filter((item) => {
				const stamp = parseDate(item.alerta.fecha_deteccion)?.getTime() ?? null;
				if (fromStamp !== null && (stamp === null || stamp < fromStamp)) return false;
				if (toStamp !== null && (stamp === null || stamp > toStamp)) return false;
				if (zonaFilter && Number(item.alerta.id_zona) !== Number(zonaFilter)) return false;
				if (tipoFilter && item.alerta.tipo_alerta !== tipoFilter) return false;
				if (resolucionFilter === 'abiertas' && !item.abierta) return false;
				if (resolucionFilter === 'resueltas' && alertResolutionKey(item.alerta) !== 'resuelta') return false;
				if (resolucionFilter === 'descartadas' && alertResolutionKey(item.alerta) !== 'descartada') return false;
				if (search) {
					const haystack = [item.alerta.tipo_alerta, item.alerta.mensaje, item.alerta.id_alerta, item.alerta.id_visita, item.plate]
						.filter(Boolean)
						.join(' ');
					if (!includesText(haystack, search)) return false;
				}
				return true;
			})
			.sort(
				(a, b) =>
					(parseDate(b.alerta.fecha_deteccion)?.getTime() || 0) -
					(parseDate(a.alerta.fecha_deteccion)?.getTime() || 0)
			);
	});

	const paged = $derived(paginate(filtered, pageNumber, Number(preferences.pageSize) || 10));

	const stats = $derived.by(() => {
		const open = enriched.filter((item) => item.abierta).length;
		const resolved = enriched.filter((item) => alertResolutionKey(item.alerta) === 'resuelta').length;
		const discarded = enriched.filter((item) => alertResolutionKey(item.alerta) === 'descartada').length;
		const finalStates = new Set(['resuelta', 'descartada']);
		const timed = enriched.filter(
			(item) =>
				finalStates.has(alertResolutionKey(item.alerta)) &&
				item.alerta.fecha_resolucion &&
				item.alerta.fecha_deteccion
		);
		const avgMinutes = timed.length
			? timed.reduce((total, item) => {
					const start = parseDate(item.alerta.fecha_deteccion);
					const end = parseDate(item.alerta.fecha_resolucion);
					const minutes = start && end ? minutesBetween(start, end) : null;
					return total + (minutes || 0);
				}, 0) / timed.length
			: null;
		return { open, resolved, discarded, avgMinutes, total: enriched.length };
	});

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';
		warnings = [];
		const results = await Promise.allSettled([listarAlertas(), listarZonas(), listarVisitas(), listarVehiculos()]);
		if (results[0].status === 'fulfilled') alertas = Array.isArray(results[0].value) ? results[0].value : [];
		else {
			alertas = [];
			error = errorMessage(results[0].reason);
		}
		zonas = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];
		if (results[1].status !== 'fulfilled') warnings.push('Zonas');
		visitas = results[2].status === 'fulfilled' && Array.isArray(results[2].value) ? results[2].value : [];
		if (results[2].status !== 'fulfilled') warnings.push('Visitas');
		vehiculos = results[3].status === 'fulfilled' && Array.isArray(results[3].value) ? results[3].value : [];
		if (results[3].status !== 'fulfilled') warnings.push('Vehículos');
		lastUpdated = new Date();
		loading = false;
	}

	onMount(() => {
		load();
		const handleRefresh = () => load(true);
		window.addEventListener('lpr:refresh', handleRefresh);
		return () => window.removeEventListener('lpr:refresh', handleRefresh);
	});

	async function changeResolution(nextState) {
		if (!detail) return;
		const userId = Number(session.user?.id_usuario);
		if (!session.token || !Number.isFinite(userId) || !userId) {
			toastError('Se requiere una sesión con usuario', 'El backend exige id_usuario_resuelve para actualizar una alerta. Inicie sesión con un usuario válido.');
			return;
		}
		updating = true;
		const alerta = detail.alerta;
		const finalStates = ['resuelta', 'descartada'];
		const payload = {
			...alerta,
			estado_resolucion: nextState,
			fecha_resolucion: finalStates.includes(nextState) ? new Date().toISOString() : '',
			id_usuario_resuelve: userId
		};
		try {
			await actualizarAlerta(alerta.id_alerta, payload);
			pushToast({
				title: 'Alerta actualizada',
				message: `La alerta #${alerta.id_alerta} quedó en estado “${alertResolution(payload).label}”.`
			});
			detail = null;
			await load(true);
		} catch (err) {
			toastError('No fue posible actualizar la alerta', errorMessage(err));
		} finally {
			updating = false;
		}
	}

	function resetFilters() {
		search = '';
		resolucionFilter = 'abiertas';
		tipoFilter = '';
		zonaFilter = '';
		desde = '';
		hasta = '';
		pageNumber = 1;
	}

	function exportCsv() {
		if (!filtered.length) {
			toastError('Sin datos para exportar', 'No hay alertas con los filtros actuales.');
			return;
		}
		const rows = filtered.map((item) => ({
			id_alerta: item.alerta.id_alerta,
			fecha_deteccion: item.alerta.fecha_deteccion || '',
			tipo_alerta: item.alerta.tipo_alerta,
			mensaje: item.alerta.mensaje,
			zona: item.zona?.nombre || '',
			placa: item.plate || '',
			id_visita: item.alerta.id_visita ?? '',
			resolucion: item.resolution.label,
			fecha_resolucion: item.alerta.fecha_resolucion || '',
			id_usuario_resuelve: item.alerta.id_usuario_resuelve ?? ''
		}));
		const csv = toCsv(rows, [
			{ label: 'ID', value: 'id_alerta' },
			{ label: 'Detección', value: 'fecha_deteccion' },
			{ label: 'Tipo', value: 'tipo_alerta' },
			{ label: 'Mensaje', value: 'mensaje' },
			{ label: 'Zona', value: 'zona' },
			{ label: 'Placa', value: 'placa' },
			{ label: 'Visita', value: 'id_visita' },
			{ label: 'Resolución', value: 'resolucion' },
			{ label: 'Fecha de resolución', value: 'fecha_resolucion' },
			{ label: 'Usuario', value: 'id_usuario_resuelve' }
		]);
		downloadCsv(`alertas_${dateToStamp()}.csv`, csv);
	}
</script>

<PageHeader
	eyebrow="Atención operativa"
	title="Alertas"
	description="Alertas generadas por el sistema y su estado de resolución. Cambiar el estado requiere una sesión con usuario, porque el backend registra quién resuelve."
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
	<div class="panel"><LoadingState rows={8} message="Consultando alertas…" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible cargar las alertas" message={error} onretry={() => load()} />
		</div>
	</div>
{:else}
	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Información parcial</strong>
				<span>{warnings.join(', ')} no pudieron cargarse. Algunas alertas pueden mostrar datos de contexto incompletos.</span>
			</div>
		</div>
	{/if}

	{#if !session.token}
		<div class="alert-app alert-app--info mb-3">
			<Icon name="lock" size={17} />
			<div>
				<strong>Modo consulta</strong>
				<span>Puede revisar las alertas, pero no cambiar su estado. Inicie sesión con un usuario para registrar la resolución.</span>
			</div>
		</div>
	{/if}

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Alertas abiertas</div>
				<div class="stat-card__value mt-1">{formatNumber(stats.open)}</div>
				<div class="fs-8 text-faint">pendientes o en proceso</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Resueltas</div>
				<div class="stat-card__value mt-1">{formatNumber(stats.resolved)}</div>
				<div class="fs-8 text-faint">{stats.discarded} descartadas</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Total registradas</div>
				<div class="stat-card__value mt-1">{formatNumber(stats.total)}</div>
				<div class="fs-8 text-faint">histórico de alertas</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Tiempo medio de atención</div>
				<div class="stat-card__value mt-1">{stats.avgMinutes !== null ? formatDuration(stats.avgMinutes) : '—'}</div>
				<div class="fs-8 text-faint">con fecha de resolución</div>
			</div>
		</div>
	</div>

	<section class="panel">
		<div class="panel__head">
			<div>
				<h3>Bandeja de alertas</h3>
				<p>{paged.total} de {alertas.length} alertas · última actualización {lastUpdated ? formatDateTime(lastUpdated) : '—'}</p>
			</div>
		</div>

		<div class="filter-bar">
			<div class="filter-field filter-field--grow">
				<label for="al-search">Buscar</label>
				<div class="input-group input-group-sm">
					<span class="input-group-text"><Icon name="search" size={14} /></span>
					<input id="al-search" class="form-control form-control-sm" placeholder="Mensaje, tipo, placa o visita" bind:value={search} oninput={() => (pageNumber = 1)} />
				</div>
			</div>
			<div class="filter-field filter-field--md">
				<label for="al-resolucion">Resolución</label>
				<select id="al-resolucion" class="form-select form-select-sm" bind:value={resolucionFilter} onchange={() => (pageNumber = 1)}>
					<option value="todas">Todas</option>
					<option value="abiertas">Abiertas</option>
					<option value="resueltas">Resueltas</option>
					<option value="descartadas">Descartadas</option>
				</select>
			</div>
			<div class="filter-field filter-field--md">
				<label for="al-tipo">Tipo</label>
				<select id="al-tipo" class="form-select form-select-sm" bind:value={tipoFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todos</option>
					{#each tipos as tipo (tipo)}
						<option value={tipo}>{tipo.replaceAll('_', ' ')}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="al-zona">Zona</label>
				<select id="al-zona" class="form-select form-select-sm" bind:value={zonaFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todas</option>
					{#each zonas as zona (zona.id_zona)}
						<option value={zona.id_zona}>{zona.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--xs">
				<label for="al-desde">Desde</label>
				<input id="al-desde" type="date" class="form-control form-control-sm" bind:value={desde} onchange={() => (pageNumber = 1)} />
			</div>
			<div class="filter-field filter-field--xs">
				<label for="al-hasta">Hasta</label>
				<input id="al-hasta" type="date" class="form-control form-control-sm" bind:value={hasta} onchange={() => (pageNumber = 1)} />
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
				icon="alert"
				title={alertas.length ? 'Sin alertas con estos filtros' : 'No hay alertas registradas'}
				message={alertas.length
					? 'Cambie la resolución, el tipo, la zona o el rango de fechas.'
					: 'El backend no reporta alertas en este momento.'}
				actionLabel={alertas.length ? 'Restablecer filtros' : null}
				onaction={resetFilters}
			/>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Detección</th>
							<th>Tipo</th>
							<th>Mensaje</th>
							<th>Zona</th>
							<th>Visita</th>
							<th>Resolución</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each paged.items as item}
							<tr>
								<td class="nowrap">
									<span class="cell-sub">{formatDateTime(item.alerta.fecha_deteccion)}</span>
								</td>
								<td><span class="cell-strong">{item.alerta.tipo_alerta?.replaceAll('_', ' ') || '—'}</span></td>
								<td class="fs-7">
									<span class="clamp-2">{item.alerta.mensaje || 'Sin mensaje'}</span>
									{#if item.plate}<span class="cell-sub mt-1"><span class="plate plate--sm">{item.plate}</span></span>{/if}
								</td>
								<td class="fs-7">{item.zona?.nombre || '—'}</td>
								<td>
									{#if item.alerta.id_visita}
										<a class="text-link" href={`/visitas/${item.alerta.id_visita}`}>#{item.alerta.id_visita}</a>
									{:else}
										<span class="text-faint">—</span>
									{/if}
								</td>
								<td><StatusPill tone={item.resolution.tone} label={item.resolution.label} dot={false} /></td>
								<td class="text-end">
									<button class="btn btn-quiet btn-xs" type="button" onclick={() => (detail = item)}>
										Atender
										<Icon name="chevron-right" size={12} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination page={paged.page} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to} onchange={(next) => (pageNumber = next)} label="alertas" />
		{/if}
		
	</section>
{/if}

<Modal open={Boolean(detail)} onclose={() => (detail = null)} title={detail ? `Alerta #${detail.alerta.id_alerta}` : 'Alerta'} subtitle={detail ? `${detail.alerta.tipo_alerta?.replaceAll('_', ' ')} · ${formatDateTime(detail.alerta.fecha_deteccion)}` : ''} size="lg">
	{#if detail}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={18} />
			<div>
				<strong>{detail.resolution.label}</strong>
				<span>{detail.alerta.mensaje || 'La alerta no incluye mensaje.'}</span>
			</div>
		</div>

		<div class="detail-grid mb-3">
			<div><dt>Tipo</dt><dd>{detail.alerta.tipo_alerta?.replaceAll('_', ' ') || '—'}</dd></div>
			<div><dt>Zona</dt><dd>{detail.zona?.nombre || `#${detail.alerta.id_zona ?? '—'}`}</dd></div>
			<div>
				<dt>Visita</dt>
				<dd>{#if detail.alerta.id_visita}<a class="text-link" href={`/visitas/${detail.alerta.id_visita}`}>#{detail.alerta.id_visita}</a>{:else}—{/if}</dd>
			</div>
			<div><dt>Placa</dt><dd>{detail.plate || '—'}</dd></div>
			<div><dt>Detección</dt><dd>{formatDateTime(detail.alerta.fecha_deteccion)}</dd></div>
			<div><dt>Resolución</dt><dd>{detail.alerta.fecha_resolucion ? formatDateTime(detail.alerta.fecha_resolucion) : 'Sin fecha'}</dd></div>
			<div><dt>Usuario que resuelve</dt><dd>{detail.alerta.id_usuario_resuelve ?? '—'}</dd></div>
			<div><dt>Estado del registro</dt><dd>{detail.alerta.estado === false ? 'Inactivo' : 'Activo'}</dd></div>
		</div>

		<div class="eyebrow-plain mb-2">Cambiar estado de resolución</div>
		{#if !session.token}
			<p class="fs-8 text-faint mb-0">Inicie sesión para modificar el estado. El modo invitado es solo de consulta.</p>
		{:else if !session.user?.id_usuario}
			<p class="fs-8 text-faint mb-0">La sesión no expone un identificador de usuario utilizable. Vuelva a iniciar sesión.</p>
		{:else}
			<div class="d-flex flex-wrap gap-2">
				<button class="btn btn-quiet btn-sm" type="button" onclick={() => changeResolution('en_proceso')} disabled={updating || alertResolutionKey(detail.alerta) === 'en_proceso'}>
					Tomar en proceso
				</button>
				<button class="btn btn-accent btn-sm" type="button" onclick={() => changeResolution('resuelta')} disabled={updating || alertResolutionKey(detail.alerta) === 'resuelta'}>
					Marcar resuelta
				</button>
				<button class="btn btn-quiet btn-sm" type="button" onclick={() => changeResolution('descartada')} disabled={updating || alertResolutionKey(detail.alerta) === 'descartada'}>
					Descartar
				</button>
				<button class="btn btn-quiet btn-sm" type="button" onclick={() => changeResolution('pendiente')} disabled={updating || alertResolutionKey(detail.alerta) === 'pendiente'}>
					Reabrir
				</button>
			</div>
			<p class="fs-8 text-faint mt-2 mb-0">La operación se registrará con el usuario de la sesión actual.</p>
		{/if}
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (detail = null)} disabled={updating}>Cerrar</button>
	{/snippet}
</Modal>
