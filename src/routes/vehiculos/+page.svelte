<script>
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import {
		listarVehiculos,
		crearVehiculo,
		actualizarVehiculo,
		eliminarVehiculo,
		listarTiposVehiculo
	} from '#lib/service/vehiculos.js';
	import { errorMessage } from '#lib/service/client.js';
	import { preferences } from '#lib/stores/preferences.svelte.js';
	import { pushToast, toastError } from '#lib/stores/toasts.svelte.js';
	import { formatDate, formatDateTime, formatNumber, toDateTimeInput, fromDateTimeInput } from '#lib/utils/format.js';
	import { paginate, includesText } from '#lib/utils/data.js';

	let vehiculos = $state([]);
	let tipos = $state([]);
	let loading = $state(true);
	let error = $state('');
	let lastUpdated = $state(null);

	let search = $state('');
	let tipoFilter = $state('');
	let estadoFilter = $state('todos');
	let pageNumber = $state(1);

	let modalOpen = $state(false);
	let editing = $state(null);
	let form = $state(blankForm());
	let formErrors = $state({});
	let saving = $state(false);
	let deleteTarget = $state(null);
	let deleting = $state(false);

	function blankForm() {
		return {
			placa: '',
			marca: '',
			modelo: '',
			color: '',
			id_tipo: '',
			fechaInput: toDateTimeInput(new Date()),
			estado: true
		};
	}

	const tipoById = $derived(new Map(tipos.map((item) => [Number(item.id_tipo), item])));

	const filtered = $derived.by(() =>
		vehiculos
			.filter((item) => {
				if (tipoFilter && Number(item.id_tipo) !== Number(tipoFilter)) return false;
				if (estadoFilter === 'activos' && item.estado === false) return false;
				if (estadoFilter === 'inactivos' && item.estado !== false) return false;
				if (search) {
					const haystack = [item.placa, item.marca, item.modelo, item.color, item.id_vehiculo].filter(Boolean).join(' ');
					if (!includesText(haystack, search)) return false;
				}
				return true;
			})
			.sort((a, b) => String(a.placa || '').localeCompare(String(b.placa || ''), 'es', { numeric: true }))
	);
	const paged = $derived(paginate(filtered, pageNumber, Number(preferences.pageSize) || 10));

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';
		const [vehiclesResult, typesResult] = await Promise.allSettled([listarVehiculos(), listarTiposVehiculo()]);
		if (vehiclesResult.status === 'fulfilled') vehiculos = Array.isArray(vehiclesResult.value) ? vehiclesResult.value : [];
		else {
			vehiculos = [];
			error = errorMessage(vehiclesResult.reason);
		}
		if (typesResult.status === 'fulfilled') tipos = Array.isArray(typesResult.value) ? typesResult.value : [];
		else tipos = [];
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

	function openEdit(vehicle) {
		editing = vehicle;
		form = {
			placa: vehicle.placa || '',
			marca: vehicle.marca || '',
			modelo: vehicle.modelo || '',
			color: vehicle.color || '',
			id_tipo: String(vehicle.id_tipo ?? ''),
			fechaInput: toDateTimeInput(vehicle.fecha_registro || new Date()),
			estado: vehicle.estado !== false
		};
		formErrors = {};
		modalOpen = true;
	}

	function validate() {
		const errors = {};
		if (!form.placa.trim()) errors.placa = 'La placa es obligatoria.';
		else if (form.placa.trim().length > 10) errors.placa = 'La placa no debe superar 10 caracteres.';
		if (!form.marca.trim()) errors.marca = 'La marca es obligatoria.';
		if (!form.modelo.trim()) errors.modelo = 'El modelo es obligatorio.';
		if (!form.color.trim()) errors.color = 'El color es obligatorio.';
		if (!form.id_tipo) errors.id_tipo = 'Seleccione un tipo de vehículo.';
		if (!form.fechaInput) errors.fechaInput = 'Indique la fecha de registro.';
		formErrors = errors;
		return Object.keys(errors).length === 0;
	}

	async function save() {
		if (!validate()) return;
		saving = true;
		const payload = {
			placa: form.placa.trim().toUpperCase(),
			marca: form.marca.trim(),
			modelo: form.modelo.trim(),
			color: form.color.trim(),
			fecha_registro: fromDateTimeInput(form.fechaInput),
			estado: form.estado,
			id_tipo: Number(form.id_tipo),
			creado: editing?.creado ?? null,
			actualizado: editing?.actualizado ?? null
		};
		try {
			if (editing) {
				await actualizarVehiculo(editing.id_vehiculo, { ...payload, id_vehiculo: editing.id_vehiculo });
				pushToast({ title: 'Vehículo actualizado', message: `${payload.placa} se actualizó correctamente.` });
			} else {
				await crearVehiculo(payload);
				pushToast({ title: 'Vehículo registrado', message: `${payload.placa} se agregó al registro maestro.` });
			}
			modalOpen = false;
			await load(true);
		} catch (err) {
			toastError(editing ? 'No fue posible actualizar' : 'No fue posible registrar', errorMessage(err));
		} finally {
			saving = false;
		}
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			await eliminarVehiculo(deleteTarget.id_vehiculo);
			pushToast({ title: 'Vehículo eliminado', message: `${deleteTarget.placa} se eliminó del registro.` });
			deleteTarget = null;
			await load(true);
		} catch (err) {
			toastError('No fue posible eliminar', errorMessage(err));
		} finally {
			deleting = false;
		}
	}

	function resetFilters() {
		search = '';
		tipoFilter = '';
		estadoFilter = 'todos';
		pageNumber = 1;
	}
</script>

<PageHeader
	eyebrow="Registro maestro"
	title="Vehículos"
	description="Vehículos identificados que pueden asociarse a visitas y seguimientos. "
>
	{#snippet actions()}
		<button class="btn btn-quiet" type="button" onclick={() => load(true)}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
		<button class="btn btn-accent" type="button" onclick={openCreate}>
			<Icon name="plus" size={15} />
			Registrar vehículo
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel"><LoadingState rows={7} message="Consultando registro de vehículos…" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible cargar los vehículos" message={error} onretry={() => load()} />
		</div>
	</div>
{:else}
	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Vehículos registrados</div>
				<div class="stat-card__value mt-1">{formatNumber(vehiculos.length)}</div>
				<div class="fs-8 text-faint">registro maestro</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Activos</div>
				<div class="stat-card__value mt-1">{formatNumber(vehiculos.filter((item) => item.estado !== false).length)}</div>
				<div class="fs-8 text-faint">disponibles para asociación</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Tipos registrados</div>
				<div class="stat-card__value mt-1">{formatNumber(tipos.length)}</div>
				<div class="fs-8 text-faint">catálogo de tipos</div>
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

	{#if !tipos.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Catálogo de tipos no disponible</strong>
				<span>No se pudieron cargar los tipos de vehículo. El formulario no podrá registrar un vehículo sin un tipo válido.</span>
			</div>
		</div>
	{/if}

	<section class="panel">
		<div class="panel__head">
			<div>
				<h3>Registro de vehículos</h3>
				<p>{filtered.length} de {vehiculos.length} vehículos</p>
			</div>
		</div>

		<div class="filter-bar">
			<div class="filter-field filter-field--grow">
				<label for="veh-search">Buscar</label>
				<div class="input-group input-group-sm">
					<span class="input-group-text"><Icon name="search" size={14} /></span>
					<input id="veh-search" class="form-control form-control-sm" placeholder="Placa, marca, modelo o color" bind:value={search} oninput={() => (pageNumber = 1)} />
				</div>
			</div>
			<div class="filter-field filter-field--md">
				<label for="veh-tipo">Tipo</label>
				<select id="veh-tipo" class="form-select form-select-sm" bind:value={tipoFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todos los tipos</option>
					{#each tipos as tipo (tipo.id_tipo)}
						<option value={tipo.id_tipo}>{tipo.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="veh-estado">Estado</label>
				<select id="veh-estado" class="form-select form-select-sm" bind:value={estadoFilter} onchange={() => (pageNumber = 1)}>
					<option value="todos">Todos</option>
					<option value="activos">Activos</option>
					<option value="inactivos">Inactivos</option>
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
				title={vehiculos.length ? 'Sin coincidencias' : 'No hay vehículos registrados'}
				message={vehiculos.length
					? 'Ajuste la búsqueda o los filtros.'
					: 'Registre el primer vehículo para que pueda asociarse a visitas del sistema.'}
				actionLabel={vehiculos.length ? 'Limpiar filtros' : 'Registrar vehículo'}
				onaction={vehiculos.length ? resetFilters : openCreate}
			/>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Placa</th>
							<th>Marca / modelo</th>
							<th>Color</th>
							<th>Tipo</th>
							<th>Fecha de registro</th>
							<th>Estado</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each paged.items as vehiculo (vehiculo.placa)}
							<tr>
								<td><span class="plate">{vehiculo.placa}</span></td>
								<td><span class="cell-strong">{[vehiculo.marca, vehiculo.modelo].filter(Boolean).join(' ') || '—'}</span></td>
								<td>{vehiculo.color || '—'}</td>
								<td>{tipoById.get(Number(vehiculo.id_tipo))?.nombre || `Tipo ${vehiculo.id_tipo ?? '—'}`}</td>
								<td class="nowrap">{formatDate(vehiculo.fecha_registro)}</td>
								<td>
									<StatusPill tone={vehiculo.estado === false ? 'neutral' : 'ok'} label={vehiculo.estado === false ? 'Inactivo' : 'Activo'} dot={false} />
								</td>
								<td class="text-end nowrap">
									<button class="btn btn-quiet btn-icon btn-xs" type="button" onclick={() => openEdit(vehiculo)} title="Editar vehículo" aria-label={`Editar ${vehiculo.placa}`}>
										<Icon name="edit" size={14} />
									</button>
									<button class="btn btn-quiet-danger btn-icon btn-xs ms-1" type="button" onclick={() => (deleteTarget = vehiculo)} title="Eliminar vehículo" aria-label={`Eliminar ${vehiculo.placa}`}>
										<Icon name="trash" size={14} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination page={paged.page} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to} onchange={(next) => (pageNumber = next)} label="vehículos" />
		{/if}
	</section>

	
{/if}

<Modal open={modalOpen} onclose={() => (modalOpen = false)} title={editing ? 'Editar vehículo' : 'Registrar vehículo'} subtitle={editing ? `Actualice los datos de ${editing.placa}.` : 'El vehículo quedará disponible para asociarse a visitas detectadas.'} size="lg">
	<div class="row g-3">
		<div class="col-12 col-md-4">
			<label class="form-label" for="form-placa">Placa *</label>
			<input id="form-placa" class="form-control" class:is-invalid={formErrors.placa} bind:value={form.placa} placeholder="ABC123" maxlength="10" />
			{#if formErrors.placa}<div class="invalid-feedback d-block">{formErrors.placa}</div>{/if}
		</div>
		<div class="col-12 col-md-4">
			<label class="form-label" for="form-marca">Marca *</label>
			<input id="form-marca" class="form-control" class:is-invalid={formErrors.marca} bind:value={form.marca} placeholder="Toyota" />
			{#if formErrors.marca}<div class="invalid-feedback d-block">{formErrors.marca}</div>{/if}
		</div>
		<div class="col-12 col-md-4">
			<label class="form-label" for="form-modelo">Modelo *</label>
			<input id="form-modelo" class="form-control" class:is-invalid={formErrors.modelo} bind:value={form.modelo} placeholder="Corolla" />
			{#if formErrors.modelo}<div class="invalid-feedback d-block">{formErrors.modelo}</div>{/if}
		</div>
		<div class="col-12 col-md-4">
			<label class="form-label" for="form-color">Color *</label>
			<input id="form-color" class="form-control" class:is-invalid={formErrors.color} bind:value={form.color} placeholder="Blanco" />
			{#if formErrors.color}<div class="invalid-feedback d-block">{formErrors.color}</div>{/if}
		</div>
		<div class="col-12 col-md-4">
			<label class="form-label" for="form-tipo">Tipo de vehículo *</label>
			<select id="form-tipo" class="form-select" class:is-invalid={formErrors.id_tipo} bind:value={form.id_tipo}>
				<option value="">Seleccione…</option>
				{#each tipos as tipo (tipo.id_tipo)}
					<option value={tipo.id_tipo}>{tipo.nombre}</option>
				{/each}
			</select>
			{#if formErrors.id_tipo}<div class="invalid-feedback d-block">{formErrors.id_tipo}</div>{/if}
		</div>
		<div class="col-12 col-md-4">
			<label class="form-label" for="form-fecha">Fecha de registro *</label>
			<input id="form-fecha" type="datetime-local" class="form-control" class:is-invalid={formErrors.fechaInput} bind:value={form.fechaInput} />
			{#if formErrors.fechaInput}<div class="invalid-feedback d-block">{formErrors.fechaInput}</div>{/if}
		</div>
		<div class="col-12">
			<div class="form-check">
				<input id="form-estado" class="form-check-input" type="checkbox" bind:checked={form.estado} />
				<label class="form-check-label" for="form-estado">Vehículo activo</label>
			</div>
		</div>
	</div>
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (modalOpen = false)} disabled={saving}>Cancelar</button>
		<button class="btn btn-accent" type="button" onclick={save} disabled={saving}>
			{#if saving}<span class="spinner-inline"></span>{/if}
			{editing ? 'Guardar cambios' : 'Registrar vehículo'}
		</button>
	{/snippet}
</Modal>

<Modal open={Boolean(deleteTarget)} onclose={() => (deleteTarget = null)} title="Eliminar vehículo" subtitle="Esta acción elimina el registro del vehículo." size="sm">
	{#if deleteTarget}
		<p class="fs-7 text-soft">
			¿Confirma la eliminación de <strong>{deleteTarget.placa}</strong> (ID #{deleteTarget.id_vehiculo})? Si el vehículo tiene visitas asociadas, el backend puede rechazar la operación por integridad referencial.
		</p>
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (deleteTarget = null)} disabled={deleting}>Cancelar</button>
		<button class="btn btn-accent" type="button" style="background: var(--danger); border-color: var(--danger);" onclick={confirmDelete} disabled={deleting}>
			{#if deleting}<span class="spinner-inline"></span>{/if}
			Eliminar
		</button>
	{/snippet}
</Modal>
