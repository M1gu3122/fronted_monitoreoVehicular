<script>
 let cargandoEdicion = false;
 let falloEdicion = '';
 let revisionEdicion = 0;

	import { onMount } from 'svelte';
	import PageHeader, { modalFormulario, confirmarAccion, notificarResultado } from '#lib/components/PageHeader.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import { obtenerZonas, obtenerZonaPorId, crearZona, actualizarZona } from '#lib/services/api_zonas.js';

	let zonas = [];
	let cargando = true;
	let errorCarga = '';
	let mensajeExito = '';
	let mensajeError = '';

	let busqueda = '';
	let filtroTipo = 'todos';
	let filtroEstado = 'todos';

	let mostrarFormulario = false;
	let idEditando = null;
	let guardando = false;

	let nombre = '';
	let tipo = '';
	let capacidadMaxima = '';
	let poligono = '';
	let estado = true;

	onMount(() => {
		cargarZonas();
	});

	function formatearFechaHoraISO(valor) {
		if (!valor) { return '—'; }
		const fecha = new Date(valor);
		if (Number.isNaN(fecha.getTime())) { return '—'; }
		return fecha.toLocaleString('es-CO', {
			year: 'numeric',
			month: 'short',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	$: zonasFiltradas = zonas.filter((zona) => {
		const texto = busqueda.trim().toLowerCase();
		const coincideTexto =
			!texto ||
			zona.nombre.toLowerCase().includes(texto) ||
			(zona.tipo && zona.tipo.toLowerCase().includes(texto)) ||
			(zona.capacidad_maxima && String(zona.capacidad_maxima).includes(texto));

		const coincideTipo = filtroTipo === 'todos' || (zona.tipo && zona.tipo === filtroTipo);
		const coincideEstado =
			filtroEstado === 'todos' ||
			(filtroEstado === 'activas' ? zona.estado : !zona.estado);

		return coincideTexto && coincideTipo && coincideEstado;
	});

	$: totalZonas = zonas.length;
	$: zonasActivas = zonas.filter((zona) => zona.estado).length;

	async function cargarZonas() {
		cargando = true;
		errorCarga = '';

		// Ejecutar siempre el finally aunque obtenerZonas lance error sincronamente
		try {
			const datos = await obtenerZonas();

			if (!Array.isArray(datos)) {
				throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
			}

			zonas = datos;
		} catch (error) {
			// Asegurar mensaje de error aunque datos sea undefined/null
			errorCarga = 'No se pudo cargar la información: ' + (error.message || error.toString() || 'error desconocido');
		} finally {
			// Ocultar siempre el loader después de intentar cargar
			cargando = false;
		}
	}

	async function prepararEdicion(id) {
  limpiarFormulario();
  const revision = ++revisionEdicion;
  cargandoEdicion = true; falloEdicion = ''; idEditando = id; mostrarFormulario = true;

		mensajeExito = '';
		mensajeError = '';

		try {
			const zona = await obtenerZonaPorId(id);
   if (revision !== revisionEdicion || !mostrarFormulario) return;

			idEditando = zona.id_zona;
			nombre = zona.nombre;
			tipo = zona.tipo || '';
			capacidadMaxima = String(zona.capacidad_maxima || '');
			poligono = zona.poligono ? JSON.stringify(zona.poligono) : '';
			estado = zona.estado;

			
		
  } catch {
   if (revision === revisionEdicion && mostrarFormulario) falloEdicion = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicion) { cargandoEdicion = false;  }
  }
 }

	function limpiarFormulario() {
  revisionEdicion += 1; cargandoEdicion = false; falloEdicion = '';
		idEditando = null;
		nombre = '';
		tipo = '';
		capacidadMaxima = '';
		poligono = '';
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

	async function guardarZona(evento) {
		evento.preventDefault();

		mensajeExito = '';
		mensajeError = '';
		guardando = true;

		const esEdicion = idEditando !== null;

	// Construir objeto de envío: enviar poligono como null u omitirlo para evitar error 500
  let poligonoEnvio;
  try { poligonoEnvio = poligono.trim() ? JSON.parse(poligono) : null; }
  catch {
   mensajeError = 'Las coordenadas no tienen un formato válido. Corrígelas o deja el campo vacío.';
   guardando = false;
   return;
  }

		const datos = {
			nombre: nombre.trim(),
			tipo: tipo.trim() || undefined,
			capacidad_maxima: capacidadMaxima ? Number(capacidadMaxima) : undefined,
			poligono: poligonoEnvio,
			estado
		};

		try {
			if (esEdicion) {
				const respuesta = await actualizarZona(idEditando, datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Zona actualizada correctamente.';
			} else {
				const respuesta = await crearZona(datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Zona registrada correctamente.';
			}

			limpiarFormulario();
			mostrarFormulario = false;
			await cargarZonas();
		} catch (error) {
			mensajeError = 'No se pudo ' + (esEdicion ? 'actualizar' : 'registrar') + ' la zona: ' + error.message;
		} finally {
			guardando = false;
		}
	}

	async function desactivarZona(zona) {
		const seguro = await confirmarAccion('¿Deseas desactivar la zona \"' + zona.nombre + '\"?', 'Desactivar');

		if (!seguro) { return; }

		mensajeExito = '';
		mensajeError = '';

		try {
			await actualizarZona(zona.id_zona, { nombre: zona.nombre, estado: false });

			mensajeExito = 'Zona desactivada correctamente.';

			if (idEditando === zona.id_zona) {
				estado = false;
			}

			await cargarZonas();
		} catch (error) {
			mensajeError = 'No se pudo desactivar la zona: ' + error.message;
		}
	}

 async function activarZona(zona) {
  if (!await confirmarAccion('¿Deseas activar la zona «' + zona.nombre + '»?', 'Activar')) return;
  mensajeExito = ''; mensajeError = '';
  try {
   await actualizarZona(zona.id_zona, { nombre: zona.nombre, estado: true });
   mensajeExito = 'Zona activada correctamente.';
   await cargarZonas();
  } catch { mensajeError = 'No se pudo activar la zona. Inténtalo de nuevo.'; }
 }

	function limpiarFiltros() {
		busqueda = '';
		filtroTipo = 'todos';
		filtroEstado = 'todos';
	}
 $: if (mensajeExito) notificarResultado(mensajeExito, 'success');
 $: if (mensajeError) notificarResultado(mensajeError, 'error');
</script>

<PageHeader eyebrow="Distribución del área" title="Zonas y ocupación">
	<svelte:fragment slot="actions">
		
		<button data-edicion class="btn btn-accent" type="button" on:click={abrirCreacion}>
			<Icon name="plus" size={15} />
			Nueva zona
		</button>
	</svelte:fragment>
</PageHeader>





<div class="row mb-3">
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Zonas configuradas</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : totalZonas}</div>
			<div class="fs-8 text-faint">total registrado</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Activas</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : zonasActivas}</div>
			<div class="fs-8 text-faint">según campo estado</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Sin información</div>
			<div class="stat-card__value mt-1">{totalZonas > 0 ? totalZonas - zonasActivas : '—'}</div>
			<div class="fs-8 text-faint">zonas desactivadas</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Última actualización</div>
			<div class="stat-card__value mt-1 stat-updated">
				{cargando || !totalZonas ? '—' : new Date(zonas.reduce((maximo, zona) => {
					const valor = new Date(zona.actualizado).getTime();
					return Number.isNaN(valor) ? maximo : Math.max(maximo, valor);
				}, 0)).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
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
					<h3>Zonas supervisadas</h3>
					<p>{zonas.length} registros · {zonasFiltradas.length} visibles</p>
				</div>

				
			</div>

			<div class="filter-bar">
				<div class="filter-field filter-field--grow">
					<label for="zona-search">Buscar</label>
					<div class="input-group input-group-sm">
						<span class="input-group-text"><Icon name="search" size={14} /></span>
						<input id="zona-search" class="form-control form-control-sm" placeholder="Nombre, tipo o capacidad" bind:value={busqueda} />
					</div>
				</div>
				<div class="filter-field filter-field--md">
					<label for="zona-tipo">Tipo</label>
					<select id="zona-tipo" class="form-select form-select-sm" bind:value={filtroTipo}>
						<option value="todos">Todos los tipos</option>
						{#each new Set(zonas.map((z) => z.tipo).filter(Boolean)) as tipo (tipo)}
							<option value={tipo}>{tipo}</option>
						{/each}
					</select>
				</div>
				<div class="filter-field filter-field--sm">
					<label for="zona-estado">Estado</label>
					<select id="zona-estado" class="form-select form-select-sm" bind:value={filtroEstado}>
						<option value="todos">Todas</option>
						<option value="activas">Activas</option>
						<option value="inactivas">Inactivas</option>
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
					<p class="mt-2 mb-0">Cargando zonas...</p>
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
					<button class="btn btn-quiet btn-sm" type="button" on:click={cargarZonas}>
						<Icon name="refresh" size={14} />
						Reintentar
					</button>
				</div>
			{:else if zonas.length === 0}
				<EmptyState
					icon="zones"
					title="No hay zonas registradas"
					message="Registre las zonas del área de mantenimiento para asociar cámaras y medir ocupación."
					actionLabel="Nueva zona"
				/>
			{:else if zonasFiltradas.length === 0}
				<EmptyState
					icon="search"
					title="Sin coincidencias"
					message="Ninguna zona coincide con la búsqueda o los filtros seleccionados."
				/>
			{:else}
				<div class="table-wrap" role="region" aria-label="Tabla desplazable">
					<table class="data-table" aria-label="Zonas registradas"><caption class="visually-hidden">Zonas registradas</caption>
						<thead>
							<tr>
								<th>Zona</th>
								<th>Tipo</th>
								<th>Capacidad máxima</th>
								<th>Fecha de registro</th>
								<th>Estado</th>
								<th>Acciones</th>
							</tr>
						</thead>
						<tbody>
							{#each zonasFiltradas as zona (zona.id_zona)}
								<tr>
									<td>
										<div class="cell-strong">{zona.nombre}</div>
										<div class="cell-sub">{zona.tipo || '—'}</div>
									</td>
									<td><span class="pill pill--info">{zona.tipo || '—'}</span></td>
									<td class="nowrap">{zona.capacidad_maxima || '—'}</td>
									<td class="nowrap">{formatearFechaHoraISO(zona.creado)}</td>
									<td>
										<StatusPill
											tone={zona.estado ? 'ok' : 'neutral'}
											label={zona.estado ? 'Activa' : 'Inactiva'}
										/>
									</td>
									<td class="nowrap">
										<div class="d-flex gap-1">
											<button
												class="btn btn-quiet btn-icon accion-registro"
												type="button"
												title="Editar zona"
												data-edicion on:click={() => prepararEdicion(zona.id_zona)}
											 aria-label={'Editar zona ' + zona.nombre}><Icon name="edit" size={16} /></button>
											{#if zona.estado}
												<button
													class="btn btn-quiet-danger btn-icon accion-registro"
													type="button"
													title="Desactivar zona"
													data-edicion on:click={() => desactivarZona(zona)}
												 aria-label={'Desactivar zona ' + zona.nombre}><Icon name="power" size={16} /></button>
											{:else}
												<button
													class="btn btn-quiet btn-icon accion-registro accion-registro--activar"
													type="button"
													title="Activar zona"
													data-edicion on:click={() => activarZona(zona)}
												 aria-label={'Activar zona ' + zona.nombre}><Icon name="check" size={16} /></button>
											{/if}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
					<div class="panel__foot">
						Mostrando {zonasFiltradas.length} de {zonas.length} zonas.
					</div>
				</div>
			{/if}
		</section>
	</div>

	{#if mostrarFormulario}
 <dialog class="modal-app modal-formulario" aria-labelledby="formulario-zonas-titulo" use:modalFormulario={cancelarFormulario} aria-busy={cargandoEdicion}>
<div class="panel__head">
					<div>
						<h3 id="formulario-zonas-titulo">{idEditando === null ? 'Registrar zona' : 'Editar zona'}</h3>
						<p>
							{idEditando === null
								? 'Complete los datos de la nueva zona.'
								: 'Actualice los datos de la zona seleccionada.'}
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
<form data-edicion class="panel__body" on:submit={guardarZona}>
 
					{#if errorCarga}
						<div class="alert-app alert-app--warn mb-3" role="alert">
							<Icon name="alert" size={16} />
							<div>
								<strong>Zonas no disponibles</strong>
								{errorCarga}
							</div>
						</div>
					{/if}

					<div class="mb-3">
						<label class="form-label" for="zona-nombre">Nombre</label>
						<input
							id="zona-nombre"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={nombre}
							required
						data-campo-api="nombre" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="zona-tipo-form">Tipo</label>
						<select id="zona-tipo-form" class="form-select" bind:value={tipo} required data-campo-api="tipo">
							<option value="" disabled>Seleccione un tipo</option>
							<option value="entrada">entrada</option>
							<option value="mantenimiento">mantenimiento</option>
							<option value="espera">espera</option>
						</select>
					</div>

					<div class="mb-3">
						<label class="form-label" for="zona-capacidad">Capacidad máxima</label>
						<input
							id="zona-capacidad"
							class="form-control"
							type="number"
							bind:value={capacidadMaxima}
							required
						data-campo-api="capacidad_maxima" />
					</div>

					<details class="mb-3"><summary class="py-2">Configurar límites de la zona (opcional)</summary><div class="mt-2">
						<label class="form-label" for="zona-poligono">Límites de la zona</label>
						<p class="form-text small">Si necesitas delimitar la zona, introduce sus coordenadas en formato GeoJSON. Puedes dejar este campo vacío.</p>
						<input
							id="zona-poligono"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={poligono}
							placeholder="Coordenadas de la zona"
						data-campo-api="poligono" />
					</div></details>

					<div class="form-check mb-3">
						<input
							id="zona-estado-form"
							class="form-check-input"
							type="checkbox"
							bind:checked={estado}
						data-campo-api="estado" />
						<label class="form-check-label" for="zona-estado-form">Zona activa</label>
					</div>

					<div class="d-flex gap-2">
						<button class="btn btn-accent" type="submit" disabled={guardando}>
							{#if guardando}
								<span class="spinner-inline"></span>
							{/if}
							{idEditando === null ? 'Registrar zona' : 'Guardar cambios'}
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