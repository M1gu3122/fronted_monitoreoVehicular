<script>
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import LineChart from '#lib/components/LineChart.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import {
		listarZonas,
		crearZona,
		actualizarZona,
		eliminarZona
	} from '#lib/service/zonas.js';
	import { listarCamaras } from '#lib/service/camaras.js';
	import { listarOcupacion } from '#lib/service/ocupacion.js';
	import { errorMessage } from '#lib/service/client.js';
	import { pushToast, toastError } from '#lib/stores/toasts.svelte.js';
	import {
		formatDateTime,
		formatNumber,
		formatPercent,
		formatTime,
		parseDate
	} from '#lib/utils/format.js';
	import {
		occupancyStatus,
		occupancyFillClass,
		latestOccupancyByZone
	} from '#lib/utils/domain.js';
	import { includesText } from '#lib/utils/data.js';

	let zonas = $state([]);
	let camaras = $state([]);
	let ocupaciones = $state([]);
	let loading = $state(true);
	let error = $state('');
	let warnings = $state([]);
	let lastUpdated = $state(null);

	let search = $state('');
	let ocupacionFilter = $state('todas');

	let modalOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());
	let formErrors = $state({});
	let saving = $state(false);
	let deleteTarget = $state(null);
	let deleting = $state(false);
	let historyZone = $state(null);

	function blankForm() {
		return { nombre: '', tipo: '', capacidad_maxima: '', estado: true };
	}

	const latestByZone = $derived(latestOccupancyByZone(ocupaciones));

	const enriched = $derived(
		zonas.map((zona) => {
			const record = latestByZone.get(Number(zona.id_zona)) || null;
			const vehicles = record ? Number(record.cantidad_vehiculos) : null;
			const capacity = Number(zona.capacidad_maxima) || 0;
			const state = occupancyStatus(vehicles, capacity);
			const cameras = camaras.filter((camara) => Number(camara.id_zona) === Number(zona.id_zona));
			return { zona, record, vehicles, capacity, state, cameras };
		})
	);

	const filtered = $derived(
		enriched
			.filter((item) => {
				if (search && !includesText(`${item.zona.nombre} ${item.zona.tipo}`, search)) return false;
				if (ocupacionFilter === 'con-datos' && item.vehicles === null) return false;
				if (ocupacionFilter === 'sin-datos' && item.vehicles !== null) return false;
				if (ocupacionFilter === 'alta' && !['alta', 'saturada'].includes(item.state.key)) return false;
				return true;
			})
			.sort((a, b) => String(a.zona.nombre).localeCompare(String(b.zona.nombre), 'es'))
	);

	const totalCapacity = $derived(zonas.reduce((total, zona) => total + (Number(zona.capacidad_maxima) || 0), 0));
	const observedVehicles = $derived(
		[...latestByZone.values()].reduce((total, item) => total + (Number(item.cantidad_vehiculos) || 0), 0)
	);
	const withoutData = $derived(zonas.filter((zona) => !latestByZone.has(Number(zona.id_zona))).length);

	const historyRecords = $derived.by(() => {
		if (!historyZone) return [];
		return ocupaciones
			.filter((item) => Number(item.id_zona) === Number(historyZone.zona.id_zona))
			.sort((a, b) => (parseDate(a.fecha_hora)?.getTime() || 0) - (parseDate(b.fecha_hora)?.getTime() || 0));
	});
	const historyChart = $derived(
		historyRecords.slice(-24).map((item) => ({
			label: formatTime(item.fecha_hora),
			value: Number(item.cantidad_vehiculos) || 0
		}))
	);

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';
		warnings = [];
		const results = await Promise.allSettled([listarZonas(), listarCamaras(), listarOcupacion()]);
		if (results[0].status === 'fulfilled') zonas = Array.isArray(results[0].value) ? results[0].value : [];
		else {
			zonas = [];
			error = errorMessage(results[0].reason);
		}
		if (results[1].status === 'fulfilled') camaras = Array.isArray(results[1].value) ? results[1].value : [];
		else {
			camaras = [];
			warnings.push('Cámaras asociadas');
		}
		if (results[2].status === 'fulfilled') ocupaciones = Array.isArray(results[2].value) ? results[2].value : [];
		else {
			ocupaciones = [];
			warnings.push('Ocupación histórica');
		}
		lastUpdated = new Date();
		loading = false;
	}

	onMount(() => {
		load();
		const handleRefresh = () => load(true);
		window.addEventListener('lpr:refresh', handleRefresh);
		return () => window.removeEventListener('lpr:refresh', handleRefresh);
	});

	function openCreate() {
		editing = null;
		form = blankForm();
		formErrors = {};
		modalOpen = true;
	}

	function openEdit(zona) {
		editing = zona;
		form = {
			nombre: zona.nombre || '',
			tipo: zona.tipo || '',
			capacidad_maxima: String(zona.capacidad_maxima ?? ''),
			estado: zona.estado !== false
		};
		formErrors = {};
		modalOpen = true;
	}

	function validate() {
		const errors = {};
		if (!form.nombre.trim()) errors.nombre = 'El nombre de la zona es obligatorio.';
		if (!form.tipo.trim()) errors.tipo = 'El tipo de zona es obligatorio.';
		if (form.capacidad_maxima === '' || Number(form.capacidad_maxima) <= 0) errors.capacidad_maxima = 'La capacidad debe ser mayor que cero.';
		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	async function save() {
		if (!validate()) return;
		saving = true;
		const payload = {
			nombre: form.nombre.trim(),
			tipo: form.tipo.trim(),
			capacidad_maxima: Number(form.capacidad_maxima),
			poligono: editing?.poligono ?? null,
			estado: form.estado,
			creado: editing?.creado ?? null,
			actualizado: editing?.actualizado ?? null
		};
		try {
			if (editing) {
				await actualizarZona(editing.id_zona, { ...payload, id_zona: editing.id_zona });
				pushToast({ title: 'Zona actualizada', message: `${payload.nombre} se actualizó correctamente.` });
			} else {
				await crearZona(payload);
				pushToast({ title: 'Zona registrada', message: `${payload.nombre} se agregó a las zonas supervisadas.` });
			}
			modalOpen = false;
			await load(true);
		} catch (err) {
			toastError(editing ? 'No fue posible actualizar la zona' : 'No fue posible registrar la zona', errorMessage(err));
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await eliminarZona(deleteTarget.zona.id_zona);
			pushToast({ title: 'Zona eliminada', message: `${deleteTarget.zona.nombre} fue eliminada.` });
			deleteTarget = null;
			await load(true);
		} catch (err) {
			toastError('No fue posible eliminar la zona', errorMessage(err));
		} finally {
			deleting = false;
		}
	}
</script>

<PageHeader
	eyebrow="Distribución del área"
	title="Zonas y ocupación"
	
>
	{#snippet actions()}
		<button class="btn btn-quiet" type="button" onclick={() => load(true)}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
		<button class="btn btn-accent" type="button" onclick={openCreate}>
			<Icon name="plus" size={15} />
			Nueva zona
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel"><LoadingState rows={7} message="Consultando zonas, cámaras y ocupación…" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible cargar las zonas" message={error} onretry={() => load()} />
		</div>
	</div>
{:else}
	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Información parcial</strong>
				<span>{warnings.join(', ')} no pudieron cargarse. La ocupación o las cámaras asociadas pueden aparecer incompletas.</span>
			</div>
		</div>
	{/if}

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Zonas configuradas</div>
				<div class="stat-card__value mt-1">{formatNumber(zonas.length)}</div>
				<div class="fs-8 text-faint">registro maestro</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Capacidad total</div>
				<div class="stat-card__value mt-1">{formatNumber(totalCapacity)}</div>
				<div class="fs-8 text-faint">cupos configurados</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Vehículos observados</div>
				<div class="stat-card__value mt-1">{formatNumber(observedVehicles)}</div>
				<div class="fs-8 text-faint">suma de últimas mediciones</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Sin medición</div>
				<div class="stat-card__value mt-1">{formatNumber(withoutData)}</div>
				<div class="fs-8 text-faint">zonas sin registro de ocupación</div>
			</div>
		</div>
	</div>

	<section class="panel mb-3">
		<div class="panel__head">
			<div>
				<h3>Zonas supervisadas</h3>
				<p>{filtered.length} de {zonas.length} zonas · última actualización {lastUpdated ? formatTime(lastUpdated) : '—'}</p>
			</div>
		</div>
		<div class="filter-bar">
			<div class="filter-field filter-field--grow">
				<label for="zona-search">Buscar</label>
				<div class="input-group input-group-sm">
					<span class="input-group-text"><Icon name="search" size={14} /></span>
					<input id="zona-search" class="form-control form-control-sm" placeholder="Nombre o tipo de zona" bind:value={search} />
				</div>
			</div>
			<div class="filter-field filter-field--md">
				<label for="zona-ocup">Ocupación</label>
				<select id="zona-ocup" class="form-select form-select-sm" bind:value={ocupacionFilter}>
					<option value="todas">Todas</option>
					<option value="con-datos">Con medición</option>
					<option value="sin-datos">Sin medición</option>
					<option value="alta">Ocupación alta o saturada</option>
				</select>
			</div>
			<div class="filter-bar__end">
				<button class="btn btn-quiet btn-sm" type="button" onclick={() => { search = ''; ocupacionFilter = 'todas'; }}>
					<Icon name="filter" size={14} />
					Limpiar
				</button>
			</div>
		</div>
		<div class="panel__body">
			{#if !filtered.length}
				<EmptyState
					icon="zones"
					title={zonas.length ? 'Sin zonas que coincidan' : 'No hay zonas configuradas'}
					message={zonas.length
						? 'Ajuste la búsqueda o el filtro de ocupación.'
						: 'Registre las zonas del área de mantenimiento para asociar cámaras y medir ocupación.'}
					actionLabel={zonas.length ? 'Limpiar filtros' : 'Nueva zona'}
					onaction={zonas.length ? () => { search = ''; ocupacionFilter = 'todas'; } : openCreate}
				/>
			{:else}
				<div class="zone-card-grid">
					{#each filtered as item, index (item.zona.id_zona)}
						<article class="zone-card">
							<div class="zone-card__head">
								<span class="zone-card__index">{String(index + 1).padStart(2, '0')}</span>
								<div class="min-w-0 flex-grow-1">
									<h4 class="text-truncate">{item.zona.nombre}</h4>
									<div class="zone-card__meta">
										{item.zona.tipo || 'Sin tipo'}
										{#if item.zona.estado === false} · inactiva{/if}
									</div>
								</div>
								<div class="zone-card__actions">
									<button class="btn btn-quiet btn-icon btn-xs" type="button" onclick={() => openEdit(item.zona)} title="Editar zona" aria-label={`Editar ${item.zona.nombre}`}>
										<Icon name="edit" size={13} />
									</button>
									<button class="btn btn-quiet-danger btn-icon btn-xs" type="button" onclick={() => (deleteTarget = item)} title="Eliminar zona" aria-label={`Eliminar ${item.zona.nombre}`}>
										<Icon name="trash" size={13} />
									</button>
								</div>
							</div>

							<div class="zone-card__stats">
								<span class="big">{item.vehicles !== null ? item.vehicles : '—'}</span>
								<span>/ {item.capacity} cupos</span>
								<span class="ms-auto"><StatusPill tone={item.state.tone} label={item.state.label} dot={false} /></span>
							</div>

							<div class="occupancy">
								<span class="occupancy__track">
									<span class="occupancy__fill {occupancyFillClass(item.state.percent)}" style={`width: ${Math.min(100, item.state.percent ?? 0)}%`}></span>
								</span>
								<span class="occupancy__value">{item.state.percent !== null ? formatPercent(item.state.percent) : '—'}</span>
							</div>

							<div class="fs-8 text-faint">
								{item.record
									? `Última medición: ${formatDateTime(item.record.fecha_hora)}`
									: 'Sin medición de ocupación disponible'}
							</div>

							<div class="zone-card__foot">
								<span class="d-inline-flex align-items-center gap-1">
									<Icon name="camera" size={13} />
									{item.cameras.length} {item.cameras.length === 1 ? 'cámara' : 'cámaras'}
								</span>
								<button class="btn btn-quiet btn-xs" type="button" onclick={() => (historyZone = item)}>
									Historial
									<Icon name="chevron-right" size={12} />
								</button>
							</div>
						</article>
					{/each}
				</div>
			{/if}
		</div>
		
	</section>

	
{/if}

<Modal open={modalOpen} onclose={() => (modalOpen = false)} title={editing ? 'Editar zona' : 'Nueva zona'} subtitle="Los nombres y tipos son configurables; no se asumen zonas existentes.">
	<div class="row g-3">
		<div class="col-12 col-md-6">
			<label class="form-label" for="zona-nombre">Nombre *</label>
			<input id="zona-nombre" class="form-control" class:is-invalid={formErrors.nombre} bind:value={form.nombre} placeholder="Bahía de mantenimiento 1" />
			{#if formErrors.nombre}<div class="invalid-feedback d-block">{formErrors.nombre}</div>{/if}
		</div>
		<div class="col-12 col-md-6">
			<label class="form-label" for="zona-tipo">Tipo *</label>
			<input id="zona-tipo" class="form-control" class:is-invalid={formErrors.tipo} bind:value={form.tipo} list="tipos-zona" placeholder="mantenimiento" />
			<datalist id="tipos-zona">
				<option value="recepción"></option>
				<option value="espera"></option>
				<option value="diagnóstico"></option>
				<option value="mantenimiento"></option>
				<option value="salida"></option>
				<option value="inspección"></option>
			</datalist>
			{#if formErrors.tipo}<div class="invalid-feedback d-block">{formErrors.tipo}</div>{/if}
		</div>
		<div class="col-12 col-md-6">
			<label class="form-label" for="zona-capacidad">Capacidad máxima *</label>
			<input id="zona-capacidad" type="number" min="1" class="form-control" class:is-invalid={formErrors.capacidad_maxima} bind:value={form.capacidad_maxima} placeholder="8" />
			{#if formErrors.capacidad_maxima}<div class="invalid-feedback d-block">{formErrors.capacidad_maxima}</div>{/if}
		</div>
		<div class="col-12 col-md-6 d-flex align-items-end">
			<div class="form-check mb-2">
				<input id="zona-estado" class="form-check-input" type="checkbox" bind:checked={form.estado} />
				<label class="form-check-label" for="zona-estado">Zona activa</label>
			</div>
		</div>
	</div>
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (modalOpen = false)} disabled={saving}>Cancelar</button>
		<button class="btn btn-accent" type="button" onclick={save} disabled={saving}>
			{#if saving}<span class="spinner-inline"></span>{/if}
			{editing ? 'Guardar cambios' : 'Registrar zona'}
		</button>
	{/snippet}
</Modal>

<Modal open={Boolean(deleteTarget)} onclose={() => (deleteTarget = null)} title="Eliminar zona" size="sm">
	{#if deleteTarget}
		<p class="fs-7 text-soft">
			¿Confirma eliminar <strong>{deleteTarget.zona.nombre}</strong>? Se perderá la configuración de capacidad. Las cámaras y mediciones asociadas pueden impedir la operación si existen referencias en la base de datos.
		</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (deleteTarget = null)} disabled={deleting}>Cancelar</button>
		<button class="btn btn-accent" type="button" style="background: var(--danger); border-color: var(--danger);" onclick={confirmDelete} disabled={deleting}>
			{#if deleting}<span class="spinner-inline"></span>{/if}
			Eliminar zona
		</button>
	{/snippet}
</Modal>

<Modal open={Boolean(historyZone)} onclose={() => (historyZone = null)} title={historyZone ? `Historial de ocupación · ${historyZone.zona.nombre}` : 'Historial'} subtitle="Registros de ocupacion_zona ordenados por fecha" size="lg">
	{#if historyZone}
		<div class="kpi-inline mb-3">
			<div><dt>Capacidad</dt><dd>{historyZone.capacity}</dd></div>
			<div><dt>Última medición</dt><dd>{historyZone.vehicles !== null ? historyZone.vehicles : '—'}</dd></div>
			<div><dt>Registros</dt><dd>{historyRecords.length}</dd></div>
		</div>

		{#if !historyRecords.length}
			<EmptyState icon="chart" title="Sin historial de ocupación" message="El backend no reporta mediciones para esta zona." />
		{:else}
			<LineChart items={historyChart} valueLabel="vehículos" height={170} showEvery={Math.max(1, Math.ceil(historyChart.length / 8))} />
			<div class="table-wrap mt-3">
				<table class="data-table">
					<thead>
						<tr><th>Fecha y hora</th><th class="num">Vehículos</th><th class="num">Ocupación</th><th>Estado</th></tr>
					</thead>
					<tbody>
						{#each [...historyRecords].reverse() as record (record.id_ocupacion)}
							{@const state = occupancyStatus(Number(record.cantidad_vehiculos), historyZone.capacity)}
							<tr>
								<td class="nowrap">{formatDateTime(record.fecha_hora)}</td>
								<td class="num">{formatNumber(record.cantidad_vehiculos)}</td>
								<td class="num">{state.percent !== null ? formatPercent(state.percent) : '—'}</td>
								<td><StatusPill tone={state.tone} label={state.label} dot={false} /></td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<div class="divider"></div>
		<div class="eyebrow-plain mb-2">Cámaras asociadas</div>
		{#if historyZone.cameras.length}
			<div class="inline-list">
				{#each historyZone.cameras as camara (camara.id_camara)}
					<span class="pill pill--neutral">{camara.nombre} · {camara.ubicacion || 'sin ubicación'}</span>
				{/each}
			</div>
		{:else}
			<p class="fs-8 text-faint mb-0">No hay cámaras asociadas a esta zona.</p>
		{/if}
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (historyZone = null)}>Cerrar</button>
	{/snippet}
</Modal>
