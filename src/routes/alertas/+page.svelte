<script>
 let cargandoEdicion = false;
 let falloEdicion = '';
 let revisionEdicion = 0;

	import { onMount } from 'svelte';
	import PageHeader, { modalFormulario, confirmarAccion, notificarResultado } from '#lib/components/PageHeader.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import { obtenerAlertas, obtenerAlertaPorId, crearAlerta, actualizarAlerta, eliminarAlerta } from '#lib/services/api_alertas.js';

	let alertas = [];
	let cargando = true;
	let errorCarga = '';
	let mensajeExito = '';
	let mensajeError = '';

	let busqueda = '';
	let filtroResolucion = 'todas';
	let filtroTipo = 'todos';
	let filtroZona = 'todas';
	let filtroDesde = '';
	let filtroHasta = '';

	let mostrarFormulario = false;
	let idEditando = null;
	let guardando = false;

	let tipo = '';
	let mensaje = '';
	let fechaDeteccion = '';
	let estado = true;
	let fechaResolucion = '';
	let idUsuarioResuelve = '';
	let idVisita = '';
	let idZona = '';

	$: alertasFiltradas = alertas.filter((alerta) => {
		const texto = busqueda.trim().toLowerCase();
		const resolucion = filtroResolucion === 'todas' ? true : filtroResolucion === 'activas' ? alerta.estado : !alerta.estado;
		const tipoMatch = filtroTipo === 'todos' || (alerta.tipo && alerta.tipo.toLowerCase() === filtroTipo);
		const zonaMatch = filtroZona === 'todas' || (alerta.id_zona && String(alerta.id_zona) === filtroZona);

		let fechaAlert = alerta.fecha_deteccion ? new Date(alerta.fecha_deteccion) : null;
		let desde = filtroDesde ? new Date(filtroDesde) : null;
		let hasta = filtroHasta ? new Date(filtroHasta) : null;

		const enRango = !filtroDesde || !filtroHasta || (fechaAlert && fechaAlert >= desde && fechaAlert <= hasta);

		const textoZona = idZona ? String(alerta.id_zona).includes(idZona) : true;

		const textoMatch = !texto || alerta.mensaje.toLowerCase().includes(texto) || alerta.id_visita.toString().includes(texto) || String(alerta.id_zona).includes(texto);

		return textoMatch && resolucion && tipoMatch && zonaMatch && enRango && textoZona;
	});

	$: totalAlertas = alertas.length;
	$: alertasAbiertas = alertas.filter((a) => !a.estado).length;
	$: alertasResueltas = alertas.filter((a) => a.estado).length;

	async function cargarAlertas() {
		cargando = true;
		errorCarga = '';

		try {
			const datos = await obtenerAlertas();

			if (!Array.isArray(datos)) {
				throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
			}

			alertas = datos;
		} catch (error) {
			errorCarga = 'No se pudo cargar la información: ' + error.message;
		} finally {
			cargando = false;
		}
	}

	onMount(cargarAlertas);

	function limpiarFormulario() {
  revisionEdicion += 1; cargandoEdicion = false; falloEdicion = '';
		idEditando = null;
		tipo = '';
		mensaje = '';
		fechaDeteccion = '';
		estado = true;
		fechaResolucion = '';
		idUsuarioResuelve = '';
		idVisita = '';
		idZona = '';
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
			const alerta = await obtenerAlertaPorId(id);
   if (revision !== revisionEdicion || !mostrarFormulario) return;

			idEditando = alerta.id_alerta;
			tipo = alerta.tipo || '';
			mensaje = alerta.mensaje || '';
			fechaDeteccion = alerta.fecha_deteccion || '';
			estado = alerta.estado;
			fechaResolucion = alerta.fecha_resolucion || '';
			idUsuarioResuelve = alerta.id_usuario_resuelve || '';
			idVisita = alerta.id_visita || '';
			idZona = alerta.id_zona || '';

			
		
  } catch {
   if (revision === revisionEdicion && mostrarFormulario) falloEdicion = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicion) { cargandoEdicion = false;  }
  }
 }

	async function guardarAlerta(evento) {
		evento.preventDefault();

		mensajeExito = '';
		mensajeError = '';
		guardando = true;

		const esEdicion = idEditando !== null;

		const datos = {
			tipo: tipo.trim(),
			mensaje: mensaje.trim(),
			fecha_deteccion: fechaDeteccion,
			estado,
			fecha_resolucion: fechaResolucion || undefined,
			id_usuario_resuelve: idUsuarioResuelve.trim() || undefined,
			id_visita: idVisita.trim() ? Number(idVisita) : undefined,
			id_zona: idZona.trim() ? Number(idZona) : undefined
		};

		try {
			if (esEdicion) {
				const respuesta = await actualizarAlerta(idEditando, datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Alerta actualizada correctamente.';
			} else {
				const respuesta = await crearAlerta(datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Alerta registrada correctamente.';
			}

			limpiarFormulario();
			mostrarFormulario = false;
			await cargarAlertas();
		} catch (error) {
			mensajeError = 'No se pudo ' + (esEdicion ? 'actualizar' : 'registrar') + ' la alerta: ' + error.message;
		} finally {
			guardando = false;
		}
	}

 async function cambiarEstadoAlerta(alerta, habilitado) {
  const accion = habilitado ? 'Activar' : 'Desactivar';
  if (!await confirmarAccion(accion + ' la alerta «' + alerta.mensaje + '»?', accion)) return;
  mensajeExito = ''; mensajeError = '';
  try {
   const actual = await obtenerAlertaPorId(alerta.id_alerta);
   await actualizarAlerta(alerta.id_alerta, { ...actual, estado: habilitado });
   mensajeExito = habilitado ? 'Alerta activada correctamente.' : 'Alerta desactivada correctamente.';
   if (idEditando === alerta.id_alerta) estado = habilitado;
   await cargarAlertas();
  } catch { mensajeError = 'No se pudo cambiar el estado de la alerta. Inténtalo de nuevo.'; }
 }
 function desactivarAlerta(alerta) { return cambiarEstadoAlerta(alerta, false); }
 function activarAlerta(alerta) { return cambiarEstadoAlerta(alerta, true); }

	async function borrarAlerta(alerta) {
		const seguro = await confirmarAccion('¿Deseas eliminar la alerta con mensaje "' + alerta.mensaje + '"?', 'Eliminar');

		if (!seguro) {
			return;
		}

		mensajeExito = '';
		mensajeError = '';

		try {
			await eliminarAlerta(alerta.id_alerta);
			mensajeExito = 'Alerta eliminada correctamente.';

			if (idEditando === alerta.id_alerta) {
				cancelarFormulario();
			}

			await cargarAlertas();
		} catch (error) {
			mensajeError = 'No se pudo eliminar la alerta: ' + error.message;
		}
	}

	function limpiarFiltros() {
		busqueda = '';
		filtroResolucion = 'todas';
		filtroTipo = 'todos';
		filtroZona = 'todas';
		filtroDesde = '';
		filtroHasta = '';
	}
 $: if (mensajeExito) notificarResultado(mensajeExito, 'success');
 $: if (mensajeError) notificarResultado(mensajeError, 'error');
</script>

<PageHeader eyebrow="Atención operativa" title="Alertas" description="Revisa las alertas y actualiza su estado de atención.">
	<svelte:fragment slot="actions">
		
		<button data-edicion class="btn btn-accent" type="button" on:click={abrirCreacion}>
			<Icon name="plus" size={15} />
			Nueva alerta
		</button>
	</svelte:fragment>
</PageHeader>





<div class="row mb-3">
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Alertas abiertas</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : alertasAbiertas}</div>
			<div class="fs-8 text-faint">pendientes o en proceso</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Resueltas</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : alertasResueltas}</div>
			<div class="fs-8 text-faint">— descartadas</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Total registradas</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : totalAlertas}</div>
			<div class="fs-8 text-faint">histórico de alertas</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Tiempo medio de atención</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : '—'}</div>
			<div class="fs-8 text-faint">con fecha de resolución</div>
		</div>
	</div>
</div>

<div class="row g-3">
	<div class="col-12">
		<section class="panel h-100">
			<div class="panel__head">
				<div>
					<h3>Bandeja de alertas</h3>
					<p>{alertas.length} alertas · {alertasFiltradas.length} visibles</p>
				</div>

				
			</div>

			<div class="filter-bar">
				<div class="filter-field filter-field--grow">
					<label for="al-search">Buscar</label>
					<div class="input-group input-group-sm">
						<span class="input-group-text"><Icon name="search" size={14} /></span>
						<input id="al-search" class="form-control form-control-sm" placeholder="Mensaje, tipo, visita o zona" bind:value={busqueda} />
					</div>
				</div>
				<div class="filter-field filter-field--md">
					<label for="al-resolucion">Resolución</label>
					<select id="al-resolucion" class="form-select form-select-sm" bind:value={filtroResolucion}>
						<option value="todas">Todas</option>
						<option value="activas">Abiertas</option>
						<option value="inactivas">Resueltas</option>
					</select>
				</div>
				<div class="filter-field filter-field--md">
					<label for="al-tipo">Tipo</label>
					<select id="al-tipo" class="form-select form-select-sm" bind:value={filtroTipo}>
						<option value="todos">Todos</option>
					</select>
				</div>
				<div class="filter-field filter-field--sm">
					<label for="al-zona">Zona</label>
					<select id="al-zona" class="form-select form-select-sm" bind:value={filtroZona}>
						<option value="todas">Todas</option>
					</select>
				</div>
				<div class="filter-field filter-field--xs">
					<label for="al-desde">Desde</label>
					<input id="al-desde" type="date" class="form-control form-control-sm" bind:value={filtroDesde} />
				</div>
				<div class="filter-field filter-field--xs">
					<label for="al-hasta">Hasta</label>
					<input id="al-hasta" type="date" class="form-control form-control-sm" bind:value={filtroHasta} />
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
					<p class="mt-2 mb-0">Cargando alertas...</p>
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
					<button class="btn btn-quiet btn-sm" type="button" on:click={cargarAlertas}>
						<Icon name="refresh" size={14} />
						Reintentar
					</button>
				</div>
			{:else if alertas.length === 0 || alertasFiltradas.length === 0}
				<EmptyState
					icon="alert"
					title="No hay alertas registradas"
					message="El sistema no reporta alertas en este momento."
				/>
			{:else}
				<div class="table-wrap" role="region" aria-label="Tabla desplazable">
					<table class="data-table" aria-label="Alertas registradas"><caption class="visually-hidden">Alertas registradas</caption>
						<thead>
							<tr>
								<th>Alerta</th>
								<th>Tipo</th>
								<th>Zona</th>
								<th>Fecha detección</th>
								<th>Estado</th>
								<th>Visita</th>
								<th class="solo-edicion">Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each alertasFiltradas as alerta (alerta.id_alerta)}
								<tr>
									<td>
										<div class="cell-strong">{alerta.mensaje}</div>
										<div class="cell-sub">{alerta.id_alerta}</div>
									</td>
									<td><span class="pill pill--warn">{alerta.tipo_alerta || '—'}</span></td>
									<td>{alerta.id_zona || '—'}</td>
									<td class="nowrap">{alerta.fecha_deteccion ? new Date(alerta.fecha_deteccion).toLocaleString('es-CO') : '—'}</td>
									<td>
										<StatusPill
											tone={alerta.estado ? 'ok' : 'neutral'}
											label={alerta.estado ? 'Activa' : 'Inactiva'}
										/>
									</td>
									<td>{alerta.id_visita || '—'}</td>
									<td class="nowrap solo-edicion">
										<div class="d-flex gap-1">
											<button
												class="btn btn-quiet btn-icon accion-registro"
												type="button"
												title="Editar alerta"
												data-edicion on:click={() => prepararEdicion(alerta.id_alerta)}
											 aria-label={'Editar alerta ' + alerta.mensaje}><Icon name="edit" size={16} /></button>
											<button
												class="btn btn-quiet-danger btn-icon accion-registro"
												type="button"
												title="Desactivar alerta"
												data-edicion on:click={() => desactivarAlerta(alerta)}
											 aria-label={'Desactivar alerta ' + alerta.mensaje}><Icon name="power" size={16} /></button>
											<button
												class="btn btn-quiet btn-icon accion-registro accion-registro--activar"
												type="button"
												title="Activar alerta"
												data-edicion on:click={() => activarAlerta(alerta)}
											 aria-label={'Activar alerta ' + alerta.mensaje}><Icon name="check" size={16} /></button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					<div class="panel__foot">
						Mostrando {alertasFiltradas.length} de {alertas.length} alertas.
					</div>
				</div>
			{/if}
		</section>
	</div>

	{#if mostrarFormulario}
 <dialog class="modal-app modal-formulario" aria-labelledby="formulario-alertas-titulo" use:modalFormulario={cancelarFormulario} aria-busy={cargandoEdicion}>
<div class="panel__head">
					<div>
						<h3 id="formulario-alertas-titulo">{idEditando === null ? 'Nueva alerta' : 'Editar alerta'}</h3>
						<p>
							{idEditando === null
								? 'Complete los datos de la nueva alerta.'
								: 'Actualice los datos de la alerta seleccionada.'}
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
<form data-edicion class="panel__body" on:submit={guardarAlerta}>
 
					{#if errorCarga}
						<div class="alert-app alert-app--warn mb-3" role="alert">
							<Icon name="alert" size={16} />
							<div>
								<strong>Alertas no disponibles</strong>
								{errorCarga}
							</div>
						</div>
					{/if}

					<div class="mb-3">
						<label class="form-label" for="al-tipo-form">Tipo</label>
						<input
							id="al-tipo-form"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={tipo}
							required
						data-campo-api="tipo" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="al-mensaje">Mensaje</label>
						<input
							id="al-mensaje"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={mensaje}
							required
						data-campo-api="mensaje" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="al-fecha-detección">Fecha de detección</label>
						<input
							id="al-fecha-detección"
							class="form-control"
							type="date"
							bind:value={fechaDeteccion}
							required
						data-campo-api="fecha_deteccion" />
					</div>

					<div class="form-check mb-3">
						<input
							id="al-estado"
							class="form-check-input"
							type="checkbox"
							bind:checked={estado}
						data-campo-api="estado" />
						<label class="form-check-label" for="al-estado">Alerta activa</label>
					</div>

					<div class="mb-3">
						<label class="form-label" for="al-fecha-resolución">Fecha de resolución</label>
						<input
							id="al-fecha-resolución"
							class="form-control"
							type="date"
							bind:value={fechaResolucion} data-campo-api="fecha_resolucion" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="al-id-usuario">ID Usuario que resuelve</label>
						<input
							id="al-id-usuario"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={idUsuarioResuelve} data-campo-api="id_usuario_resuelve" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="al-id-visita">ID Visita</label>
						<input
							id="al-id-visita"
							class="form-control"
							type="number"
							bind:value={idVisita}
						data-campo-api="id_visita" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="al-id-zona">ID Zona</label>
						<input
							id="al-id-zona"
							class="form-control"
							type="number"
							bind:value={idZona}
						data-campo-api="id_zona" />
					</div>

					<div class="d-flex gap-2">
						<button class="btn btn-accent" type="submit" disabled={guardando}>
							{#if guardando}
								<span class="spinner-inline"></span>
							{/if}
							{idEditando === null ? 'Registrar alerta' : 'Guardar cambios'}
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
</style>