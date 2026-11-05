<script>
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Confidence from '#lib/components/Confidence.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import {
		listarCamaras,
		crearCamara,
		actualizarCamara,
		eliminarCamara
	} from '#lib/service/camaras.js';
	import { listarZonas } from '#lib/service/zonas.js';
	import { listarEventos } from '#lib/service/eventos.js';
	import { errorMessage } from '#lib/service/client.js';
	import { pushToast, toastError } from '#lib/stores/toasts.svelte.js';
	import {
		formatDate,
		formatDateTime,
		formatNumber,
		formatTime,
		isToday,
		parseDate,
		relativeTime,
		toDateTimeInput,
		fromDateTimeInput
	} from '#lib/utils/format.js';
	import { cameraConnection, eventLabel } from '#lib/utils/domain.js';
	import { includesText } from '#lib/utils/data.js';

	let camaras = $state([]);
	let zonas = $state([]);
	let eventos = $state([]);
	let loading = $state(true);
	let error = $state('');
	let warnings = $state([]);
	let lastUpdated = $state(null);

	let search = $state('');
	let zonaFilter = $state('todas');
	let estadoFilter = $state('todas');

	let modalOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());
	let formErrors = $state({});
	let saving = $state(false);
	let deleteTarget = $state(null);
	let deleting = $state(false);
	let detailCamera = $state(null);

	function blankForm() {
		return {
			nombre: '',
			ubicacion: '',
			id_zona: '',
			fechaInput: toDateTimeInput(new Date()),
			estado: true
		};
	}

	const zoneById = $derived(new Map(zonas.map((zona) => [Number(zona.id_zona), zona])));

	const eventStats = $derived.by(() => {
		const lastByCamera = new Map();
		const countByCamera = new Map();
		const todayCount = new Map();
		for (const evento of eventos) {
			if (evento.id_camara === null || evento.id_camara === undefined) continue;
			const key = Number(evento.id_camara);
			const stamp = parseDate(evento.fecha_hora)?.getTime() || 0;
			const current = lastByCamera.get(key);
			if (!current || stamp > (parseDate(current.fecha_hora)?.getTime() || 0)) lastByCamera.set(key, evento);
			countByCamera.set(key, (countByCamera.get(key) || 0) + 1);
			if (isToday(evento.fecha_hora)) todayCount.set(key, (todayCount.get(key) || 0) + 1);
		}
		return { lastByCamera, countByCamera, todayCount };
	});

	const enriched = $derived(
		camaras.map((camara) => {
			const key = Number(camara.id_camara);
			return {
				camara,
				zona: zoneById.get(Number(camara.id_zona)) || null,
				lastEvent: eventStats.lastByCamera.get(key) || null,
				eventCount: eventStats.countByCamera.get(key) || 0,
				todayCount: eventStats.todayCount.get(key) || 0,
				connection: cameraConnection(camara)
			};
		})
	);

	const filtered = $derived(
		enriched.filter((item) => {
			if (search && !includesText(`${item.camara.nombre} ${item.camara.ubicacion} ${item.zona?.nombre || ''}`, search)) return false;
			if (zonaFilter === 'sin-zona' && item.camara.id_zona !== null && item.camara.id_zona !== undefined) return false;
			if (zonaFilter !== 'todas' && zonaFilter !== 'sin-zona' && Number(item.camara.id_zona) !== Number(zonaFilter)) return false;
			if (estadoFilter === 'activas' && item.camara.estado === false) return false;
			if (estadoFilter === 'inactivas' && item.camara.estado !== false) return false;
			return true;
		})
	);

	const groups = $derived.by(() => {
		const buckets = new Map();
		for (const item of filtered) {
			const key = item.zona ? `zona-${item.zona.id_zona}` : 'sin-zona';
			if (!buckets.has(key)) {
				buckets.set(key, {
					key,
					zona: item.zona,
					title: item.zona?.nombre || 'Sin zona asignada',
					subtitle: item.zona?.tipo || 'Cámaras pendientes de ubicación lógica',
					items: []
				});
			}
			buckets.get(key).items.push(item);
		}
		return [...buckets.values()]
			.map((group) => ({ ...group, items: group.items.sort((a, b) => String(a.camara.nombre).localeCompare(String(b.camara.nombre), 'es')) }))
			.sort((a, b) => (a.zona ? String(a.zona.nombre) : 'zzz').localeCompare(b.zona ? String(b.zona.nombre) : 'zzz', 'es'));
	});

	const activeCount = $derived(camaras.filter((item) => item.estado !== false).length);
	const coveredZones = $derived(new Set(camaras.map((item) => item.id_zona).filter((id) => id !== null && id !== undefined)).size);
	const withoutZone = $derived(camaras.filter((item) => item.id_zona === null || item.id_zona === undefined).length);
	const eventsToday = $derived([...eventStats.todayCount.values()].reduce((total, count) => total + count, 0));

	const detailEvents = $derived.by(() => {
		if (!detailCamera) return [];
		return eventos
			.filter((evento) => Number(evento.id_camara) === Number(detailCamera.camara.id_camara))
			.sort((a, b) => (parseDate(b.fecha_hora)?.getTime() || 0) - (parseDate(a.fecha_hora)?.getTime() || 0))
			.slice(0, 30);
	});

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';
		warnings = [];
		const results = await Promise.allSettled([listarCamaras(), listarZonas(), listarEventos()]);
		if (results[0].status === 'fulfilled') camaras = Array.isArray(results[0].value) ? results[0].value : [];
		else {
			camaras = [];
			error = errorMessage(results[0].reason);
		}
		if (results[1].status === 'fulfilled') zonas = Array.isArray(results[1].value) ? results[1].value : [];
		else {
			zonas = [];
			warnings.push('Zonas');
		}
		if (results[2].status === 'fulfilled') eventos = Array.isArray(results[2].value) ? results[2].value : [];
		else {
			eventos = [];
			warnings.push('Eventos recientes');
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

	function openEdit(camara) {
		const target = camara?.camara || camara;
		const idZona = target?.id_zona ?? camara?.zona?.id_zona ?? target?.zona_id;
		editing = target;
		form = {
			nombre: target?.nombre || '',
			ubicacion: target?.ubicacion || '',
			id_zona: idZona !== null && idZona !== undefined && idZona !== '' ? String(idZona) : '',
			fechaInput: toDateTimeInput(target?.fecha_registro || new Date()),
			estado: target?.estado !== false
		};
		formErrors = {};
		modalOpen = true;
	}

	function validate() {
		const errors = {};
		if (!form.nombre.trim()) errors.nombre = 'El nombre de la cámara es obligatorio.';
		if (!form.ubicacion.trim()) errors.ubicacion = 'La ubicación es obligatoria para la API.';
		if (!form.id_zona) errors.id_zona = 'Seleccione una zona; el modelo exige id_zona.';
		if (!form.fechaInput) errors.fechaInput = 'Indique la fecha de registro.';
		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	async function save() {
		if (!validate()) return;
		saving = true;
		const payload = {
			nombre: form.nombre.trim(),
			ubicacion: form.ubicacion.trim(),
			id_zona: Number(form.id_zona),
			fecha_registro: fromDateTimeInput(form.fechaInput),
			estado: form.estado,
			creado: editing?.creado ?? null,
			actualizado: editing?.actualizado ?? null
		};
		try {
			if (editing) {
				await actualizarCamara(editing.id_camara, { ...payload, id_camara: editing.id_camara });
				pushToast({ title: 'Cámara actualizada', message: `${payload.nombre} se actualizó correctamente.` });
			} else {
				await crearCamara(payload);
				pushToast({ title: 'Cámara registrada', message: `${payload.nombre} se agregó al inventario.` });
			}
			modalOpen = false;
			await load(true);
		} catch (err) {
			toastError(editing ? 'No fue posible actualizar la cámara' : 'No fue posible registrar la cámara', errorMessage(err));
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await eliminarCamara(deleteTarget.camara.id_camara);
			pushToast({ title: 'Cámara eliminada', message: `${deleteTarget.camara.nombre} fue eliminada.` });
			deleteTarget = null;
			await load(true);
		} catch (err) {
			toastError('No fue posible eliminar la cámara', errorMessage(err));
		} finally {
			deleting = false;
		}
	}
</script>

<PageHeader
	eyebrow="Infraestructura"
	title="Cámaras"
	description="Inventario de cámaras y su zona lógica."
>
	{#snippet actions()}
		<button class="btn btn-quiet" type="button" onclick={() => load(true)}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
		<button class="btn btn-accent" type="button" onclick={openCreate}>
			<Icon name="plus" size={15} />
			Registrar cámara
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel"><LoadingState rows={7} message="Consultando cámaras, zonas y eventos…" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible cargar las cámaras" message={error} onretry={() => load()} />
		</div>
	</div>
{:else}
	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Información parcial</strong>
				<span>{warnings.join(', ')} no pudieron cargarse. La actividad por cámara puede estar incompleta.</span>
			</div>
		</div>
	{/if}

	{#if !zonas.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>No hay zonas disponibles</strong>
				<span>El modelo de cámara exige <code>id_zona</code>. Registre una zona antes de crear cámaras; la edición de cámaras existentes también requerirá asignarles una.</span>
			</div>
		</div>
	{/if}

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Cámaras registradas</div>
				<div class="stat-card__value mt-1">{formatNumber(camaras.length)}</div>
				<div class="fs-8 text-faint">inventario total</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Activas</div>
				<div class="stat-card__value mt-1">{formatNumber(activeCount)}</div>
				<div class="fs-8 text-faint">según campo estado</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Zonas cubiertas</div>
				<div class="stat-card__value mt-1">{formatNumber(coveredZones)}</div>
				<div class="fs-8 text-faint">{withoutZone} sin zona asignada</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Eventos hoy</div>
				<div class="stat-card__value mt-1">{formatNumber(eventsToday)}</div>
				<div class="fs-8 text-faint">asociados a cámaras</div>
			</div>
		</div>
	</div>

	<section class="panel">
		<div class="panel__head">
			<div>
				<h3>Cámaras por zona</h3>
				<p>{filtered.length} de {camaras.length} cámaras · última actualización {lastUpdated ? formatTime(lastUpdated) : '—'}</p>
			</div>
		</div>
		<div class="filter-bar">
			<div class="filter-field filter-field--grow">
				<label for="cam-search">Buscar</label>
				<div class="input-group input-group-sm">
					<span class="input-group-text"><Icon name="search" size={14} /></span>
					<input id="cam-search" class="form-control form-control-sm" placeholder="Nombre, ubicación o zona" bind:value={search} />
				</div>
			</div>
			<div class="filter-field filter-field--md">
				<label for="cam-zona">Zona</label>
				<select id="cam-zona" class="form-select form-select-sm" bind:value={zonaFilter}>
					<option value="todas">Todas las zonas</option>
					<option value="sin-zona">Sin zona asignada</option>
					{#each zonas as zona (zona.id_zona)}
						<option value={zona.id_zona}>{zona.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="cam-estado">Estado</label>
				<select id="cam-estado" class="form-select form-select-sm" bind:value={estadoFilter}>
					<option value="todas">Todas</option>
					<option value="activas">Activas</option>
					<option value="inactivas">Inactivas</option>
				</select>
			</div>
			<div class="filter-bar__end">
				<button class="btn btn-quiet btn-sm" type="button" onclick={() => { search = ''; zonaFilter = 'todas'; estadoFilter = 'todas'; }}>
					<Icon name="filter" size={14} />
					Limpiar
				</button>
			</div>
		</div>

		<div class="panel__body">
			{#if !filtered.length}
				<EmptyState
					icon="camera"
					title={camaras.length ? 'Sin cámaras que coincidan' : 'No hay cámaras registradas'}
					message={camaras.length
						? 'Ajuste la búsqueda, la zona o el estado.'
						: 'Registre las cámaras del sistema para vincularlas a zonas y eventos.'}
					actionLabel={camaras.length ? 'Limpiar filtros' : 'Registrar cámara'}
					onaction={camaras.length ? () => { search = ''; zonaFilter = 'todas'; estadoFilter = 'todas'; } : openCreate}
				/>
			{:else}
				<div class="d-grid gap-4">
					{#each groups as group (group.key)}
						<section>
							<div class="section-mini-head">
								<div>
									<h4>{group.title}</h4>
									<span>{group.subtitle}</span>
								</div>
								<span class="pill pill--neutral">{group.items.length} {group.items.length === 1 ? 'cámara' : 'cámaras'}</span>
							</div>
							<div class="camera-grid">
								{#each group.items as item (item.camara.id_camara)}
									<article class="camera-card">
										<div class="camera-card__head">
											<span class="camera-card__icon"><Icon name="camera" size={18} /></span>
											<div class="min-w-0 flex-grow-1">
												<h5 class="text-truncate" title={item.camara.nombre}>{item.camara.nombre}</h5>
												<div class="camera-card__loc">
													<Icon name="pin" size={12} />
													<span class="text-truncate">{item.camara.ubicacion || 'Sin ubicación registrada'}</span>
												</div>
											</div>
											<StatusPill tone={item.connection.tone} label={item.connection.label} dot={false} />
										</div>

										<div class="camera-card__rows">
											<div class="row-line">
												<span class="row-line__label">Último evento</span>
												<span class="row-line__value">
													{#if item.lastEvent}
														{eventLabel(item.lastEvent.tipo_evento).label} · {relativeTime(item.lastEvent.fecha_hora)}
													{:else}
														Sin eventos
													{/if}
												</span>
											</div>
											<div class="row-line">
												<span class="row-line__label">Eventos registrados</span>
												<span class="row-line__value">{formatNumber(item.eventCount)}</span>
											</div>
											<div class="row-line">
												<span class="row-line__label">Eventos hoy</span>
												<span class="row-line__value">{formatNumber(item.todayCount)}</span>
											</div>
											<div class="row-line">
												<span class="row-line__label">Registrada</span>
												<span class="row-line__value">{formatDate(item.camara.fecha_registro)}</span>
											</div>
										</div>

										<div class="camera-card__foot">
											<button class="btn btn-quiet btn-xs" type="button" onclick={() => (detailCamera = item)}>
												<Icon name="eye" size={13} />
												Actividad
											</button>
											<div class="ms-auto">
												<button class="btn btn-quiet btn-icon btn-xs" type="button" onclick={() => openEdit(item.camara)} title="Editar cámara" aria-label={`Editar ${item.camara.nombre}`}>
													<Icon name="edit" size={13} />
												</button>
												<button class="btn btn-quiet-danger btn-icon btn-xs ms-1" type="button" onclick={() => (deleteTarget = item)} title="Eliminar cámara" aria-label={`Eliminar ${item.camara.nombre}`}>
													<Icon name="trash" size={13} />
												</button>
											</div>
										</div>
									</article>
								{/each}
							</div>
						</section>
					{/each}
				</div>
			{/if}
		</div>
	
	</section>
{/if}

<Modal open={modalOpen} onclose={() => (modalOpen = false)} title={editing ? 'Editar cámara' : 'Registrar cámara'} subtitle="El modelo de la API exige ubicación y zona para toda cámara." size="lg">
	<div class="row g-3">
		<div class="col-12 col-md-6">
			<label class="form-label" for="cam-nombre">Nombre *</label>
			<input id="cam-nombre" class="form-control" class:is-invalid={formErrors.nombre} bind:value={form.nombre} placeholder="CAM-ENTRADA-01" />
			{#if formErrors.nombre}<div class="invalid-feedback d-block">{formErrors.nombre}</div>{/if}
		</div>
		<div class="col-12 col-md-6">
			<label class="form-label" for="cam-ubicacion">Ubicación *</label>
			<input id="cam-ubicacion" class="form-control" class:is-invalid={formErrors.ubicacion} bind:value={form.ubicacion} placeholder="Acceso principal, costado norte" />
			{#if formErrors.ubicacion}<div class="invalid-feedback d-block">{formErrors.ubicacion}</div>{/if}
		</div>
		<div class="col-12 col-md-6">
			<label class="form-label" for="cam-zona-form">Zona asignada *</label>
			<select id="cam-zona-form" class="form-select" class:is-invalid={formErrors.id_zona} bind:value={form.id_zona}>
				<option value="">Seleccione…</option>
				{#if editing && form.id_zona && !zonas.some((z) => String(z.id_zona) === String(form.id_zona))}
					<option value={String(form.id_zona)}>Zona actual (#{form.id_zona})</option>
				{/if}
				{#each zonas as zona (zona.id_zona)}
					<option value={String(zona.id_zona)}>{zona.nombre}</option>
				{/each}
			</select>
			{#if formErrors.id_zona}<div class="invalid-feedback d-block">{formErrors.id_zona}</div>{/if}
		</div>
		<div class="col-12 col-md-6">
			<label class="form-label" for="cam-fecha">Fecha de registro *</label>
			<input id="cam-fecha" type="datetime-local" class="form-control" class:is-invalid={formErrors.fechaInput} bind:value={form.fechaInput} />
			{#if formErrors.fechaInput}<div class="invalid-feedback d-block">{formErrors.fechaInput}</div>{/if}
		</div>
		<div class="col-12">
			<div class="form-check">
				<input id="cam-estado-form" class="form-check-input" type="checkbox" bind:checked={form.estado} />
				<label class="form-check-label" for="cam-estado-form">Cámara activa</label>
			</div>
		</div>
	</div>
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (modalOpen = false)} disabled={saving}>Cancelar</button>
		<button class="btn btn-accent" type="button" onclick={save} disabled={saving}>
			{#if saving}<span class="spinner-inline"></span>{/if}
			{editing ? 'Guardar cambios' : 'Registrar cámara'}
		</button>
	{/snippet}
</Modal>

<Modal open={Boolean(deleteTarget)} onclose={() => (deleteTarget = null)} title="Eliminar cámara" size="sm">
	{#if deleteTarget}
		<p class="fs-7 text-soft">
			¿Confirma eliminar <strong>{deleteTarget.camara.nombre}</strong>? Los eventos históricos que la referencian pueden impedir la operación. En ese caso, considere desactivarla en lugar de eliminarla.
		</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (deleteTarget = null)} disabled={deleting}>Cancelar</button>
		<button class="btn btn-accent" type="button" style="background: var(--danger); border-color: var(--danger);" onclick={confirmDelete} disabled={deleting}>
			{#if deleting}<span class="spinner-inline"></span>{/if}
			Eliminar cámara
		</button>
	{/snippet}
</Modal>

<Modal open={Boolean(detailCamera)} onclose={() => (detailCamera = null)} title={detailCamera ? detailCamera.camara.nombre : 'Actividad'} subtitle="Últimos 30 eventos registrados por esta cámara" size="lg">
	{#if detailCamera}
		<div class="kpi-inline mb-3">
			<div><dt>Zona</dt><dd>{detailCamera.zona?.nombre || 'Sin zona'}</dd></div>
			<div><dt>Eventos totales</dt><dd>{formatNumber(detailCamera.eventCount)}</dd></div>
			<div><dt>Eventos hoy</dt><dd>{formatNumber(detailCamera.todayCount)}</dd></div>
			<div><dt>Último evento</dt><dd>{detailCamera.lastEvent ? formatTime(detailCamera.lastEvent.fecha_hora) : '—'}</dd></div>
		</div>

		{#if !detailEvents.length}
			<EmptyState icon="events" title="Sin eventos registrados" message="Esta cámara no aparece como origen de eventos en el periodo consultado." />
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr><th>Fecha y hora</th><th>Evento</th><th>Confianza</th><th>Visita</th></tr>
					</thead>
					<tbody>
						{#each detailEvents as evento (evento.id_evento)}
							<tr>
								<td class="nowrap">{formatDateTime(evento.fecha_hora)}</td>
								<td><span class="cell-strong">{eventLabel(evento.tipo_evento).label}</span><span class="cell-sub">{evento.tipo_evento}</span></td>
								<td>
									{#if evento.confianza !== null && evento.confianza !== undefined}
										<Confidence value={evento.confianza} />
									{:else}
										<span class="text-faint">—</span>
									{/if}
								</td>
								<td>
									{#if evento.id_visita}
										<a class="text-link" href={`/visitas/${evento.id_visita}`}>#{evento.id_visita}</a>
									{:else}
										<span class="text-faint">—</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (detailCamera = null)}>Cerrar</button>
	{/snippet}
</Modal>
