<script>
 let cargandoEdicion = false;
 let falloEdicion = '';
 let revisionEdicion = 0;

	import { onMount } from 'svelte';
	import PageHeader, { modalFormulario, confirmarAccion, notificarResultado } from '#lib/components/PageHeader.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import {
		obtenerVehiculos,
		obtenerVehiculoPorId,
		crearVehiculo,
		actualizarVehiculo,
		eliminarVehiculo
	} from '#lib/services/api_vehiculos.js';
	import { obtenerTiposVehiculo } from '#lib/services/api_tipos_vehiculo.js';

	let vehiculos = [];
	let tipos = [];
	let cargando = true;
	let cargandoTipos = true;
	let errorCarga = '';
	let errorTipos = '';
	let mensajeExito = '';
	let mensajeError = '';

	let busqueda = '';
	let filtroTipo = 'todos';
	let filtroEstado = 'todos';

	let mostrarFormulario = false;
	let idEditando = null;
	let guardando = false;

	let placa = '';
	let marca = '';
	let modelo = '';
	let color = '';
	let fechaRegistro = '';
	let idTipo = '';
	let estado = true;

	$: vehiculosFiltrados = vehiculos.filter((vehiculo) => {
		const texto = busqueda.trim().toLowerCase();
		const coincideTexto =
			!texto ||
			vehiculo.placa.toLowerCase().includes(texto) ||
			vehiculo.marca.toLowerCase().includes(texto) ||
			vehiculo.modelo.toLowerCase().includes(texto) ||
			vehiculo.color.toLowerCase().includes(texto);
		const coincideTipo = filtroTipo === 'todos' || String(vehiculo.id_tipo) === filtroTipo;
		const coincideEstado =
			filtroEstado === 'todos' ||
			(filtroEstado === 'activos' ? vehiculo.estado : !vehiculo.estado);

		return coincideTexto && coincideTipo && coincideEstado;
	});

	$: totalVehiculos = vehiculos.length;
	$: vehiculosActivos = vehiculos.filter((vehiculo) => vehiculo.estado).length;
	$: ultimaActualizacion = vehiculos.reduce((maximo, vehiculo) => {
		const valor = new Date(vehiculo.actualizado).getTime();
		return Number.isNaN(valor) ? maximo : Math.max(maximo, valor);
	}, 0);

	function nombreTipo(idTipoVehiculo) {
		const tipo = tipos.find((item) => item.id_tipo === idTipoVehiculo);
		return tipo ? tipo.nombre : '—';
	}

	function formatearFecha(valor) {
		if (!valor) {
			return '—';
		}

		const texto = String(valor);
		const fecha = /^\d{4}-\d{2}-\d{2}$/.test(texto)
			? new Date(texto + 'T00:00:00')
			: new Date(texto);

		if (Number.isNaN(fecha.getTime())) {
			return '—';
		}

		return fecha.toLocaleDateString('es-CO', {
			year: 'numeric',
			month: 'short',
			day: '2-digit'
		});
	}

	function formatearFechaHora(valor) {
		if (!valor) {
			return '—';
		}

		const fecha = new Date(valor);

		if (Number.isNaN(fecha.getTime())) {
			return '—';
		}

		return fecha.toLocaleString('es-CO', {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function normalizarFechaParaInput(valor) {
		if (!valor) {
			return '';
		}

		return String(valor).slice(0, 10);
	}

	async function cargarVehiculos() {
		cargando = true;
		errorCarga = '';

		try {
			const datos = await obtenerVehiculos();

			if (!Array.isArray(datos)) {
				throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
			}

			vehiculos = datos;
		} catch (error) {
			errorCarga = 'No se pudo cargar la información: ' + error.message;
		} finally {
			cargando = false;
		}
	}

	async function cargarTipos() {
		cargandoTipos = true;
		errorTipos = '';

		try {
			const datos = await obtenerTiposVehiculo();

			if (!Array.isArray(datos)) {
				throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
			}

			tipos = datos;
		} catch (error) {
			errorTipos = 'No se pudieron cargar los tipos de vehículo: ' + error.message;
		} finally {
			cargandoTipos = false;
		}
	}

	onMount(() => {
		cargarVehiculos();
		cargarTipos();
	});

	function actualizarTodo() {
		mensajeExito = '';
		mensajeError = '';
		cargarVehiculos();
		cargarTipos();
	}

	function limpiarFormulario() {
  revisionEdicion += 1; cargandoEdicion = false; falloEdicion = '';
		idEditando = null;
		placa = '';
		marca = '';
		modelo = '';
		color = '';
		fechaRegistro = '';
		idTipo = '';
		estado = true;
	}

	function abrirCreacion() {
		mensajeExito = '';
		mensajeError = '';
		limpiarFormulario();
		mostrarFormulario = true;
	}

	function cancelarFormulario() {
		limpiarFormulario();
		mostrarFormulario = false;
	}

	async function prepararEdicion(id) {
  limpiarFormulario();
  const revision = ++revisionEdicion;
  cargandoEdicion = true; falloEdicion = ''; idEditando = id; mostrarFormulario = true;

		mensajeExito = '';
		mensajeError = '';

		try {
			const vehiculo = await obtenerVehiculoPorId(id);
   if (revision !== revisionEdicion || !mostrarFormulario) return;

			idEditando = vehiculo.id_vehiculo;
			placa = vehiculo.placa;
			marca = vehiculo.marca;
			modelo = vehiculo.modelo;
			color = vehiculo.color;
			fechaRegistro = normalizarFechaParaInput(vehiculo.fecha_registro);
			idTipo =
				vehiculo.id_tipo === null || vehiculo.id_tipo === undefined
					? ''
					: String(vehiculo.id_tipo);
			estado = vehiculo.estado;
			
		
  } catch {
   if (revision === revisionEdicion && mostrarFormulario) falloEdicion = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicion) { cargandoEdicion = false;  }
  }
 }

	async function guardarVehiculo(evento) {
		evento.preventDefault();

		mensajeExito = '';
		mensajeError = '';
		guardando = true;

		const esEdicion = idEditando !== null;
		const datos = {
			placa: placa.trim(),
			marca: marca.trim(),
			modelo: modelo.trim(),
			color: color.trim(),
			fecha_registro: fechaRegistro,
			estado,
			id_tipo: Number(idTipo)
		};

		try {
			if (esEdicion) {
				const respuesta = await actualizarVehiculo(idEditando, datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Vehículo actualizado correctamente.';
			} else {
				const respuesta = await crearVehiculo(datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Vehículo registrado correctamente.';
			}

			limpiarFormulario();
			mostrarFormulario = false;
			await cargarVehiculos();
		} catch (error) {
			mensajeError =
				'No se pudo ' +
				(esEdicion ? 'actualizar' : 'registrar') +
				' el vehículo: ' +
				error.message;
		} finally {
			guardando = false;
		}
	}

	async function borrarVehiculo(vehiculo) {
  if (vehiculo.tiene_visitas !== false) {
   mensajeError = vehiculo.tiene_visitas ? 'No puedes eliminar este vehículo porque tiene visitas asociadas.' : 'No se pudo comprobar si el vehículo tiene visitas. Vuelve a abrir el módulo e inténtalo de nuevo.';
   return;
  }
		const seguro = await confirmarAccion('¿Deseas eliminar el vehículo con placa "' + vehiculo.placa + '"?', 'Eliminar');

		if (!seguro) {
			return;
		}

		mensajeExito = '';
		mensajeError = '';

		try {
			const respuesta = await eliminarVehiculo(vehiculo.id_vehiculo);
			mensajeExito = (respuesta && respuesta.mensaje) || 'Vehículo eliminado correctamente.';

			if (idEditando === vehiculo.id_vehiculo) {
				cancelarFormulario();
			}

			await cargarVehiculos();
		} catch (error) {
			mensajeError = 'No se pudo eliminar el vehículo: ' + error.message;
		}
	}

	function limpiarFiltros() {
		busqueda = '';
		filtroTipo = 'todos';
		filtroEstado = 'todos';
	}
 $: if (mensajeExito) notificarResultado(mensajeExito, 'success');
 $: if (mensajeError) notificarResultado(mensajeError, 'error');
</script>

<PageHeader
	eyebrow="Registro maestro"
	title="Vehículos"
	description="Consulta y administra los vehículos registrados."
>
	<svelte:fragment slot="actions">
		
		<button data-edicion class="btn btn-accent" type="button" on:click={abrirCreacion}>
			<Icon name="plus" size={15} />
			Registrar vehículo
		</button>
	</svelte:fragment>
</PageHeader>





<div class="row mb-3">
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Vehículos registrados</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : totalVehiculos}</div>
			<div class="fs-8 text-faint">total registrado</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Activos</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : vehiculosActivos}</div>
			<div class="fs-8 text-faint">disponibles para asociación</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Tipos registrados</div>
			<div class="stat-card__value mt-1">{cargandoTipos || errorTipos ? '—' : tipos.length}</div>
			<div class="fs-8 text-faint">tipos disponibles</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Última actualización</div>
			<div class="stat-card__value mt-1 stat-updated">
				{cargando || !ultimaActualizacion ? '—' : formatearFechaHora(ultimaActualizacion)}
			</div>
			<div class="fs-8 text-faint">datos del sistema</div>
		</div>
	</div>
</div>

<div class="row g-3">
	<div class="col-12">
		<section class="panel h-100">
			<div class="panel__head">
				<div>
					<h3>Registro de vehículos</h3>
					<p>{vehiculos.length} registros · {vehiculosFiltrados.length} visibles</p>
				</div>
				
			</div>

			<div class="filter-bar">
				<div class="filter-field filter-field--grow">
					<label for="veh-search">Buscar</label>
					<div class="input-group input-group-sm">
						<span class="input-group-text"><Icon name="search" size={14} /></span>
						<input
							id="veh-search"
							class="form-control form-control-sm"
							placeholder="Placa, marca, modelo o color"
							bind:value={busqueda}
						/>
					</div>
				</div>
				<div class="filter-field filter-field--md">
					<label for="veh-tipo">Tipo</label>
					<select id="veh-tipo" class="form-select form-select-sm" bind:value={filtroTipo}>
						<option value="todos">Todos los tipos</option>
						{#each tipos as tipo (tipo.id_tipo)}
							<option value={String(tipo.id_tipo)}>{tipo.nombre}</option>
						{/each}
					</select>
				</div>
				<div class="filter-field filter-field--sm">
					<label for="veh-estado">Estado</label>
					<select id="veh-estado" class="form-select form-select-sm" bind:value={filtroEstado}>
						<option value="todos">Todos</option>
						<option value="activos">Activos</option>
						<option value="inactivos">Inactivos</option>
					</select>
				</div>
				<div class="filter-bar__end">
					<button class="btn btn-quiet btn-sm" type="button" on:click={limpiarFiltros}>
						<Icon name="filter" size={14} />
						Limpiar
					</button>
				</div>
			</div>

			{#if cargando}
				<div class="state-block">
					<span class="spinner-inline"></span>
					<p class="mt-2 mb-0">Cargando vehículos...</p>
				</div>
			{:else if errorCarga}
				<div class="alert-app m-3" role="alert">
					<Icon name="alert" size={16} />
					<div>
						<strong>No se pudo cargar la información</strong>
						{errorCarga}
					</div>
				</div>
				<div class="px-3 pb-3">
					<button class="btn btn-quiet btn-sm" type="button" on:click={cargarVehiculos}>
						<Icon name="refresh" size={14} />
						Reintentar
					</button>
				</div>
			{:else if vehiculos.length === 0}
				<EmptyState
					icon="car"
					title="No hay vehículos registrados"
					message="Registre el primer vehículo para que pueda asociarse a visitas del sistema."
				/>
			{:else if vehiculosFiltrados.length === 0}
				<EmptyState
					icon="search"
					title="Sin coincidencias"
					message="Ningún vehículo coincide con la búsqueda o los filtros seleccionados."
				/>
			{:else}
				<div class="table-wrap" role="region" aria-label="Tabla desplazable">
					<table class="data-table" aria-label="Veh?culos registrados"><caption class="visually-hidden">Veh?culos registrados</caption>
						<thead>
							<tr>
								<th>Vehículo</th>
								<th>Tipo</th>
								<th>Color</th>
								<th>Fecha de registro</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each vehiculosFiltrados as vehiculo (vehiculo.id_vehiculo)}
								<tr>
									<td>
										<div class="cell-strong placa-etiqueta">{vehiculo.placa}</div>
										<div class="cell-sub">{vehiculo.marca} · {vehiculo.modelo}</div>
									</td>
									<td><span class="pill pill--info">{nombreTipo(vehiculo.id_tipo)}</span></td>
									<td>{vehiculo.color}</td>
									<td class="nowrap">{formatearFecha(vehiculo.fecha_registro)}</td>
									<td>
										<StatusPill
											tone={vehiculo.estado ? 'ok' : 'neutral'}
											label={vehiculo.estado ? 'Activo' : 'Inactivo'}
										/>
									</td>
									<td class="nowrap">
										<div class="d-flex gap-1">
											<button
												class="btn btn-quiet btn-icon accion-registro"
												type="button"
												title="Editar vehículo"
												data-edicion on:click={() => prepararEdicion(vehiculo.id_vehiculo)}
											 aria-label={'Editar vehículo ' + vehiculo.placa}><Icon name="edit" size={16} /></button>
											<button
												class="btn btn-quiet-danger btn-icon accion-registro"
												type="button"
												title={vehiculo.tiene_visitas ? 'No se puede eliminar: tiene visitas asociadas' : vehiculo.tiene_visitas === false ? 'Eliminar vehículo' : 'No se ha podido comprobar si tiene visitas'}
            disabled={vehiculo.tiene_visitas !== false}
            aria-describedby={vehiculo.tiene_visitas !== false ? 'motivo-eliminar-' + vehiculo.id_vehiculo : undefined}
												data-edicion on:click={() => borrarVehiculo(vehiculo)}
											 aria-label={'Eliminar vehículo ' + vehiculo.placa}><Icon name="trash" size={16} /></button>{#if vehiculo.tiene_visitas !== false}<span data-edicion class="motivo-eliminar" id={'motivo-eliminar-' + vehiculo.id_vehiculo}>{vehiculo.tiene_visitas ? 'Tiene visitas asociadas' : 'Visitas sin verificar'}</span>{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
				<div class="panel__foot">
					Mostrando {vehiculosFiltrados.length} de {vehiculos.length} vehículos.
				</div>
			{/if}
		</section>
	</div>

	{#if mostrarFormulario}
 <dialog class="modal-app modal-formulario" aria-labelledby="formulario-vehiculos-titulo" use:modalFormulario={cancelarFormulario} aria-busy={cargandoEdicion}>
<div class="panel__head">
					<div>
						<h3 id="formulario-vehiculos-titulo">{idEditando === null ? 'Registrar vehículo' : 'Editar vehículo'}</h3>
						<p>
							{idEditando === null
								? 'Complete los datos del nuevo vehículo.'
								: 'Actualice los datos del vehículo seleccionado.'}
						</p>
					</div>
					<button
						class="modal-app__close"
						type="button"
						title="Cerrar formulario" aria-label="Cerrar formulario"
						on:click={cancelarFormulario}
					>
						<Icon name="close" size={16} />
					</button>
				</div>

				{#if cargandoEdicion}<div class="panel__body estado-edicion" role="status"><span class="spinner-inline" aria-hidden="true"></span><p>Cargando datos...</p><button class="btn btn-quiet" type="button" on:click={cancelarFormulario}>Cancelar</button></div>
{:else if falloEdicion}<div class="panel__body estado-edicion"><p role="alert">{falloEdicion}</p><div class="d-flex gap-2"><button class="btn btn-accent" type="button" on:click={() => prepararEdicion(idEditando)}>Reintentar</button><button class="btn btn-quiet" type="button" on:click={cancelarFormulario}>Cancelar</button></div></div>
{:else}
<form data-edicion class="panel__body" on:submit={guardarVehiculo}>
 
					{#if errorTipos}
						<div class="alert-app alert-app--warn mb-3" role="alert">
							<Icon name="alert" size={16} />
							<div>
								<strong>Tipos no disponibles</strong>
								{errorTipos}
							</div>
						</div>
					{/if}

					<div class="mb-3">
						<label class="form-label" for="vehiculo-placa">Placa</label>
						<input
							id="vehiculo-placa"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={placa}
							required
						data-campo-api="placa" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="vehiculo-marca">Marca</label>
						<input
							id="vehiculo-marca"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={marca}
							required
						data-campo-api="marca" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="vehiculo-modelo">Modelo</label>
						<input
							id="vehiculo-modelo"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={modelo}
							required
						data-campo-api="modelo" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="vehiculo-color">Color</label>
						<input
							id="vehiculo-color"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={color}
							required
						data-campo-api="color" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="vehiculo-fecha">Fecha de registro</label>
						<input
							id="vehiculo-fecha"
							class="form-control"
							type="date"
							bind:value={fechaRegistro}
							required
						data-campo-api="fecha_registro" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="vehiculo-tipo">Tipo de vehículo</label>
						<select id="vehiculo-tipo" class="form-select" bind:value={idTipo} required data-campo-api="id_tipo">
							<option value="" disabled>Seleccione un tipo</option>
							{#each tipos as tipo (tipo.id_tipo)}
								<option value={String(tipo.id_tipo)}>{tipo.nombre}</option>
							{/each}
						</select>
					</div>

					<div class="form-check mb-3">
						<input
							id="vehiculo-estado"
							class="form-check-input"
							type="checkbox"
							bind:checked={estado}
						data-campo-api="estado" />
						<label class="form-check-label" for="vehiculo-estado">Vehículo activo</label>
					</div>

					<div class="d-flex gap-2">
						<button class="btn btn-accent" type="submit" disabled={guardando}>
							{#if guardando}
								<span class="spinner-inline"></span>
							{/if}
							{idEditando === null ? 'Registrar vehículo' : 'Guardar cambios'}
						</button>
						<button class="btn btn-quiet" type="button" on:click={cancelarFormulario}>
							Cancelar
						</button>
					</div>
				</form>
{/if}

 </dialog>
{/if}
</div>

<style>
	.stat-updated {
		font-size: 1.05rem;
	}

 .motivo-eliminar { align-self: center; max-width: 135px; white-space: normal; font-size: .72rem; line-height: 1.35; color: var(--text-soft); }
</style>
