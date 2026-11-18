<script>
 let cargandoEdicion = false;
 let falloEdicion = '';
 let revisionEdicion = 0;

	import { onMount, tick } from 'svelte';
	import PageHeader, { modalFormulario, confirmarAccion, notificarResultado } from '#lib/components/PageHeader.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import {
		obtenerCamaras,
  obtenerActividadCamara,
		obtenerCamaraPorId,
		crearCamara,
		actualizarCamara
	} from '#lib/services/api_camaras.js';
	import { obtenerCatalogosCamaras } from '#lib/services/api_camaras.js';

	let camaras = [];
	let zonas = [];
	let cargando = true;
	let cargandoZonas = true;
	let errorCarga = '';
	let errorZonas = '';
	let mensajeExito = '';
	let mensajeError = '';

	let busqueda = '';
	let filtroZona = 'todas';
	let filtroEstado = 'todas';

	let mostrarFormulario = false;
	let idEditando = null;
	let guardando = false;

	let nombre = '';
	let ubicacion = '';
	let fechaRegistro = '';
	let idZona = '';
	let estado = true;

	$: camarasFiltradas = camaras.filter((camara) => {
		const texto = busqueda.trim().toLowerCase();
		const zona = zonas.find((item) => item.id_zona === camara.id_zona);
		const nombreZona = zona ? zona.nombre.toLowerCase() : '';
		const coincideTexto =
			!texto ||
			(camara.nombre || '').toLowerCase().includes(texto) ||
			(camara.ubicacion || '').toLowerCase().includes(texto) ||
			nombreZona.includes(texto);
		const coincideZona = filtroZona === 'todas' || String(camara.id_zona) === filtroZona;
		const coincideEstado =
			filtroEstado === 'todas' ||
			(filtroEstado === 'activas' ? camara.estado : !camara.estado);

		return coincideTexto && coincideZona && coincideEstado;
	});

	$: totalCamaras = camaras.length;
	$: camarasActivas = camaras.filter((camara) => camara.estado).length;
	$: zonasCubiertas = new Set(
		camaras
			.map((camara) => camara.id_zona)
			.filter((idZonaCamara) => idZonaCamara !== null && idZonaCamara !== undefined)
	).size;
	$: ultimaActualizacion = camaras.reduce((maximo, camara) => {
		const valor = new Date(camara.actualizado).getTime();
		return Number.isNaN(valor) ? maximo : Math.max(maximo, valor);
	}, 0);

 let dialogoActividad;
 let camaraActividad = null;
 let actividad = null;
 let cargandoActividad = false;
 let errorActividad = '';
 let inicioActividad = 0;
 let controladorActividad;
 let solicitudActividad = 0;
 $: gruposCamaras = agruparCamaras(camarasFiltradas, zonas);
 function agruparCamaras(lista, zonasDisponibles) {
  const grupos = new Map();
  for (const camara of lista) {
   const clave = camara.id_zona ?? 'sin-zona';
   if (!grupos.has(clave)) {
    const zona = zonasDisponibles.find(item => item.id_zona === camara.id_zona);
    grupos.set(clave, { clave, nombre: zona?.nombre || (camara.id_zona ? 'Zona ' + camara.id_zona : 'Sin zona asignada'), tipo: zona?.tipo || '', camaras: [] });
   }
   grupos.get(clave).camaras.push(camara);
  }
  return [...grupos.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
 }
 function tiempoDesdeEvento(valor) {
  const instante = new Date(valor).getTime();
  if (!valor || !Number.isFinite(instante)) return '';
  const minutos = Math.max(0, Math.floor((Date.now() - instante) / 60000));
  if (minutos >= 1440) return 'hace ' + Math.floor(minutos / 1440) + ' d';
  if (minutos >= 60) return 'hace ' + Math.floor(minutos / 60) + ' h';
  return minutos ? 'hace ' + minutos + ' min' : 'ahora';
 }
 function fechaRegistroCorta(valor) {
  const fecha = new Date(valor);
  return valor && !Number.isNaN(fecha.getTime()) ? fecha.toLocaleDateString('es-CO') : 'Sin registro';
 }
 async function abrirActividad(camara) {
  camaraActividad = camara; actividad = null; inicioActividad = 0;
  await tick();
  dialogoActividad?.showModal();
  consultarActividad(0);
 }
 async function consultarActividad(inicio = 0) {
  if (!camaraActividad) return;
  const solicitud = ++solicitudActividad;
  controladorActividad?.abort(); controladorActividad = new AbortController();
  cargandoActividad = true; errorActividad = ''; inicioActividad = inicio;
  try {
   const datos = await obtenerActividadCamara(camaraActividad.id_camara, inicio, controladorActividad.signal);
   if (solicitud !== solicitudActividad) return;
   if (!Array.isArray(datos?.eventos) || !Number.isInteger(datos.total)) throw new Error('No se pudo cargar la actividad.');
   actividad = datos;
  } catch (error) {
   if (solicitud === solicitudActividad && error.name !== 'AbortError') errorActividad = 'No se pudo cargar la actividad. Inténtalo de nuevo.';
  } finally { if (solicitud === solicitudActividad) cargandoActividad = false; }
 }
 function cerrarActividad() {
  ++solicitudActividad; controladorActividad?.abort();
  if (dialogoActividad?.open) dialogoActividad.close();
  camaraActividad = null; actividad = null; errorActividad = ''; cargandoActividad = false;
 }

	function nombreZona(idZonaCamara) {
		const zona = zonas.find((item) => item.id_zona === idZonaCamara);
		return zona ? zona.nombre : '—';
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

	function fechaHoraParaInput(valor) {
		if (!valor) {
			return '';
		}

		const fecha = new Date(valor);

		if (Number.isNaN(fecha.getTime())) {
			return '';
		}

		const dosDigitos = (numero) => String(numero).padStart(2, '0');

		return (
			fecha.getFullYear() +
			'-' +
			dosDigitos(fecha.getMonth() + 1) +
			'-' +
			dosDigitos(fecha.getDate()) +
			'T' +
			dosDigitos(fecha.getHours()) +
			':' +
			dosDigitos(fecha.getMinutes()) +
			':' +
			dosDigitos(fecha.getSeconds())
		);
	}

	function fechaHoraActualParaInput() {
		return fechaHoraParaInput(new Date());
	}

	async function cargarCamaras() {
		cargando = true;
		errorCarga = '';

		try {
			const datos = await obtenerCamaras();

			if (!Array.isArray(datos)) {
				throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
			}

			camaras = datos;
		} catch (error) {
			errorCarga = 'No se pudo cargar la información: ' + error.message;
		} finally {
			cargando = false;
		}
	}

	async function cargarZonas() {
		cargandoZonas = true;
		errorZonas = '';

		try {
			const catalogos = await obtenerCatalogosCamaras();
			const datos = catalogos.zonas;

			if (!Array.isArray(datos)) {
				throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
			}

			zonas = datos;
		} catch (error) {
			errorZonas = 'No se pudieron cargar las zonas: ' + error.message;
		} finally {
			cargandoZonas = false;
		}
	}

	onMount(() => {
		cargarCamaras();
		cargarZonas();
  return () => { ++solicitudActividad; controladorActividad?.abort(); };
	});

	function actualizarTodo() {
		mensajeExito = '';
		mensajeError = '';
		cargarCamaras();
		cargarZonas();
	}

	function limpiarFormulario() {
  revisionEdicion += 1; cargandoEdicion = false; falloEdicion = '';
		idEditando = null;
		nombre = '';
		ubicacion = '';
		fechaRegistro = '';
		idZona = '';
		estado = true;
	}

	function abrirCreacion() {
		mensajeExito = '';
		mensajeError = '';
		limpiarFormulario();
		fechaRegistro = fechaHoraActualParaInput();
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
			const camara = await obtenerCamaraPorId(id);
   if (revision !== revisionEdicion || !mostrarFormulario) return;

			idEditando = camara.id_camara;
			nombre = camara.nombre;
			ubicacion = camara.ubicacion;
			fechaRegistro = fechaHoraParaInput(camara.fecha_registro);
			idZona =
				camara.id_zona === null || camara.id_zona === undefined ? '' : String(camara.id_zona);
			estado = camara.estado;
			
		
  } catch {
   if (revision === revisionEdicion && mostrarFormulario) falloEdicion = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicion) { cargandoEdicion = false;  }
  }
 }

	async function guardarCamara(evento) {
		evento.preventDefault();

		mensajeExito = '';
		mensajeError = '';

		const fechaHora = new Date(fechaRegistro);

		if (!fechaRegistro || Number.isNaN(fechaHora.getTime())) {
			mensajeError = 'Seleccione una fecha de registro válida.';
			return;
		}

		guardando = true;

		const esEdicion = idEditando !== null;
		const datos = {
			nombre: nombre.trim(),
			ubicacion: ubicacion.trim(),
			fecha_registro: fechaHora.toISOString(),
			estado,
			id_zona: Number(idZona)
		};

		try {
			if (esEdicion) {
				const respuesta = await actualizarCamara(idEditando, datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Cámara actualizada correctamente.';
			} else {
				const respuesta = await crearCamara(datos);
				mensajeExito = (respuesta && respuesta.mensaje) || 'Cámara registrada correctamente.';
			}

			limpiarFormulario();
			mostrarFormulario = false;
			await cargarCamaras();
		} catch (error) {
			mensajeError =
				'No se pudo ' +
				(esEdicion ? 'actualizar' : 'registrar') +
				' la cámara: ' +
				error.message;
		} finally {
			guardando = false;
		}
	}

	async function desactivarCamara(camara) {
		const seguro = await confirmarAccion('¿Deseas desactivar la cámara "' + camara.nombre + '"?', 'Desactivar');

		if (!seguro) {
			return;
		}

		mensajeExito = '';
		mensajeError = '';

		try {
			const actual = await obtenerCamaraPorId(camara.id_camara);
			await actualizarCamara(actual.id_camara, {
				nombre: actual.nombre,
				ubicacion: actual.ubicacion,
				fecha_registro: actual.fecha_registro,
				estado: false,
				id_zona: actual.id_zona
			});

			mensajeExito = 'Cámara desactivada correctamente.';

			if (idEditando === camara.id_camara) {
				estado = false;
			}

			await cargarCamaras();
		} catch (error) {
			mensajeError = 'No se pudo desactivar la cámara: ' + error.message;
		}
	}

	function limpiarFiltros() {
		busqueda = '';
		filtroZona = 'todas';
		filtroEstado = 'todas';
	}
 $: if (mensajeExito) notificarResultado(mensajeExito, 'success');
 $: if (mensajeError) notificarResultado(mensajeError, 'error');
</script>

<PageHeader eyebrow="Infraestructura" title="Cámaras" description="Administra las cámaras y las zonas donde están ubicadas.">
	<svelte:fragment slot="actions">
		
		<button data-edicion class="btn btn-accent" type="button" on:click={abrirCreacion}>
			<Icon name="plus" size={15} />
			Registrar cámara
		</button>
	</svelte:fragment>
</PageHeader>





<div class="row mb-3">
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Cámaras registradas</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : totalCamaras}</div>
			<div class="fs-8 text-faint">inventario total</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Activas</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : camarasActivas}</div>
			<div class="fs-8 text-faint">según campo estado</div>
		</div>
	</div>
	<div class="col-6 col-lg-3">
		<div class="panel p-3 h-100">
			<div class="eyebrow-plain">Zonas cubiertas</div>
			<div class="stat-card__value mt-1">{cargando ? '—' : zonasCubiertas}</div>
			<div class="fs-8 text-faint">
				{cargandoZonas || errorZonas ? 'zonas disponibles' : 'de ' + zonas.length + ' zonas'}
			</div>
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
		<section class="panel h-100 camaras-panel">
			<div class="panel__head">
				<div>
					<h3>Cámaras por zona</h3>
					<p>{camarasFiltradas.length} de {camaras.length} cámaras · última actualización {ultimaActualizacion ? formatearFechaHora(ultimaActualizacion) : 'sin registro'}</p>
				</div>
				
			</div>

			<div class="filter-bar">
				<div class="filter-field filter-field--grow">
					<label for="cam-search">Buscar</label>
					<div class="input-group input-group-sm">
						<span class="input-group-text"><Icon name="search" size={14} /></span>
						<input
							id="cam-search"
							class="form-control form-control-sm"
							placeholder="Nombre, ubicación o zona"
							bind:value={busqueda}
						/>
					</div>
				</div>
				<div class="filter-field filter-field--md">
					<label for="cam-zona">Zona</label>
					<select id="cam-zona" class="form-select form-select-sm" bind:value={filtroZona}>
						<option value="todas">Todas las zonas</option>
						{#each zonas as zona (zona.id_zona)}
							<option value={String(zona.id_zona)}>{zona.nombre}</option>
						{/each}
					</select>
				</div>
				<div class="filter-field filter-field--sm">
					<label for="cam-estado">Estado</label>
					<select id="cam-estado" class="form-select form-select-sm" bind:value={filtroEstado}>
						<option value="todas">Todas</option>
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
					<p class="mt-2 mb-0">Cargando cámaras...</p>
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
					<button class="btn btn-quiet btn-sm" type="button" on:click={cargarCamaras}>
						<Icon name="refresh" size={14} />
						Reintentar
					</button>
				</div>
			{:else if camaras.length === 0}
				<EmptyState
					icon="camera"
					title="No hay cámaras registradas"
					message="Registre las cámaras del sistema para vincularlas a zonas y eventos."
				/>
			{:else if camarasFiltradas.length === 0}
				<EmptyState
					icon="search"
					title="Sin coincidencias"
					message="Ninguna cámara coincide con la búsqueda o los filtros seleccionados."
				/>
			{:else}
    <div class="camaras-grupos">
     {#each gruposCamaras as grupo (grupo.clave)}
      <section class="camaras-zona" aria-labelledby={'zona-camaras-' + grupo.clave}>
       <header class="camaras-zona__cabecera">
        <div><h4 id={'zona-camaras-' + grupo.clave}>{grupo.nombre}</h4>{#if grupo.tipo}<p>{grupo.tipo}</p>{/if}</div>
        <span class="pill pill--neutral">{grupo.camaras.length} {grupo.camaras.length === 1 ? 'cámara' : 'cámaras'}</span>
       </header>
       <div class="camaras-tarjetas">
        {#each grupo.camaras as camara (camara.id_camara)}
         <article class="camara-tarjeta" aria-labelledby={'camara-titulo-' + camara.id_camara}>
          <header class="camara-tarjeta__cabecera">
           <span class="camara-tarjeta__icono"><Icon name="camera" size={18} /></span>
           <div class="camara-tarjeta__identidad"><h5 id={'camara-titulo-' + camara.id_camara}>{camara.nombre}</h5><p>{camara.ubicacion || 'Sin ubicación'}</p></div>
           <StatusPill tone={camara.estado ? 'ok' : 'danger'} label={camara.estado ? 'Activa' : 'Inactiva'} dot={false} />
          </header>
          <dl class="camara-tarjeta__datos">
           <div><dt>Último evento</dt><dd title={camara.ultimo_evento ? formatearFechaHora(camara.ultimo_evento) : undefined}>{camara.ultimo_tipo_evento || (camara.eventos_registrados === undefined ? 'Sin información' : camara.eventos_registrados > 0 ? 'Sin tipo registrado' : 'Sin eventos')}{#if camara.ultimo_evento} · {tiempoDesdeEvento(camara.ultimo_evento)}{/if}</dd></div>
           <div><dt>Eventos registrados</dt><dd>{camara.eventos_registrados ?? '—'}</dd></div>
           <div><dt>Eventos hoy</dt><dd>{camara.eventos_hoy ?? '—'}</dd></div>
           <div><dt>Registrada</dt><dd><time datetime={camara.fecha_registro || undefined} title={formatearFechaHora(camara.fecha_registro)}>{fechaRegistroCorta(camara.fecha_registro)}</time></dd></div>
          </dl>
          <footer class="camara-tarjeta__acciones">
           <button class="btn btn-quiet btn-xs" type="button" aria-label={'Ver actividad de ' + camara.nombre} on:click={() => abrirActividad(camara)}><Icon name="eye" size={14} /> Actividad</button>
           <div>
            <button data-edicion class="btn btn-quiet btn-icon accion-registro" type="button" title="Editar cámara" aria-label={'Editar ' + camara.nombre} on:click={() => prepararEdicion(camara.id_camara)}><Icon name="edit" size={16} /></button>
            {#if camara.estado}<button data-edicion class="btn btn-quiet-danger btn-icon accion-registro" type="button" title="Desactivar cámara" aria-label={'Desactivar ' + camara.nombre} on:click={() => desactivarCamara(camara)}><Icon name="power" size={16} /></button>{/if}
           </div>
          </footer>
         </article>
        {/each}
       </div>
      </section>
     {/each}
    </div>
				<div class="panel__foot">
					Mostrando {camarasFiltradas.length} de {camaras.length} cámaras.
				</div>
			{/if}
		</section>
	</div>

	{#if mostrarFormulario}
 <dialog class="modal-app modal-formulario" aria-labelledby="formulario-camaras-titulo" use:modalFormulario={cancelarFormulario} aria-busy={cargandoEdicion}>
<div class="panel__head">
					<div>
						<h3 id="formulario-camaras-titulo">{idEditando === null ? 'Registrar cámara' : 'Editar cámara'}</h3>
						<p>
							{idEditando === null
								? 'Complete los datos de la nueva cámara.'
								: 'Actualice los datos de la cámara seleccionada.'}
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
<form data-edicion class="panel__body" on:submit={guardarCamara}>
 
					{#if errorZonas}
						<div class="alert-app alert-app--warn mb-3" role="alert">
							<Icon name="alert" size={16} />
							<div>
								<strong>Zonas no disponibles</strong>
								{errorZonas}
							</div>
						</div>
					{/if}

					<div class="mb-3">
						<label class="form-label" for="camara-nombre">Nombre</label>
						<input
							id="camara-nombre"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={nombre}
							required
						data-campo-api="nombre" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="camara-ubicacion">Ubicación</label>
						<input
							id="camara-ubicacion"
							class="form-control"
							type="text"
							autocomplete="off"
							bind:value={ubicacion}
							required
						data-campo-api="ubicacion" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="camara-fecha">Fecha de registro</label>
						<input
							id="camara-fecha"
							class="form-control"
							type="datetime-local"
							step="1"
							bind:value={fechaRegistro}
							required
						data-campo-api="fecha_registro" />
					</div>

					<div class="mb-3">
						<label class="form-label" for="camara-zona">Zona</label>
						<select id="camara-zona" class="form-select" bind:value={idZona} required data-campo-api="id_zona">
							<option value="" disabled>Seleccione una zona</option>
							{#each zonas as zona (zona.id_zona)}
								<option value={String(zona.id_zona)}>{zona.nombre}</option>
							{/each}
						</select>
					</div>

					<div class="form-check mb-3">
						<input
							id="camara-estado"
							class="form-check-input"
							type="checkbox"
							bind:checked={estado}
						data-campo-api="estado" />
						<label class="form-check-label" for="camara-estado">Cámara activa</label>
					</div>

					<div class="d-flex gap-2">
						<button class="btn btn-accent" type="submit" disabled={guardando}>
							{#if guardando}
								<span class="spinner-inline"></span>
							{/if}
							{idEditando === null ? 'Registrar cámara' : 'Guardar cambios'}
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

{#if camaraActividad}
 <dialog bind:this={dialogoActividad} class="modal-app modal-app--lg" aria-labelledby="actividad-camara-titulo" on:close={cerrarActividad}>
  <div class="modal-app__head"><div><h3 id="actividad-camara-titulo">Actividad de {camaraActividad.nombre}</h3><p>Últimos eventos registrados por esta cámara.</p></div><button class="modal-app__close" type="button" aria-label="Cerrar actividad" on:click={cerrarActividad}><Icon name="close" /></button></div>
  <div class="modal-app__body" aria-busy={cargandoActividad}>
   {#if cargandoActividad}<p role="status">Cargando actividad...</p>
   {:else if errorActividad}<p class="alert-app" role="alert">{errorActividad}</p><button class="btn btn-quiet" type="button" on:click={() => consultarActividad(inicioActividad)}>Reintentar</button>
   {:else if actividad?.eventos.length}
    <ol class="actividad-camara-lista">{#each actividad.eventos as evento (evento.id_evento)}<li><div><span class={'pill pill--' + (/fall|error/i.test(evento.tipo_evento || '') ? 'danger' : 'info')}>{evento.tipo_evento || 'Sin tipo'}</span><time datetime={evento.fecha_hora || undefined}>{formatearFechaHora(evento.fecha_hora)}</time></div><p>{evento.zona || 'Sin zona'} · {evento.placa || 'Sin placa'}{#if Number.isInteger(evento.id_visita)} · <a href={'/visitas/' + evento.id_visita} on:click={cerrarActividad}>Visita #{evento.id_visita}</a>{/if}</p></li>{/each}</ol>
   {:else}<EmptyState icon="camera" title="Sin eventos" message="Esta cámara aún no tiene eventos registrados." />{/if}
  </div>
  <div class="modal-app__foot"><span role="status">{actividad ? actividad.total + ' eventos' : ''}</span><button class="btn btn-quiet btn-sm" type="button" disabled={cargandoActividad || inicioActividad <= 0} on:click={() => consultarActividad(Math.max(0, inicioActividad - 10))}>Anterior</button><button class="btn btn-quiet btn-sm" type="button" disabled={cargandoActividad || !actividad || inicioActividad + 10 >= actividad.total} on:click={() => consultarActividad(inicioActividad + 10)}>Siguiente</button></div>
 </dialog>
{/if}
<style>
	.stat-updated {
		font-size: 1.05rem;
	}

 .camaras-grupos { padding: 1rem; display: grid; gap: 1.5rem; }
 .camaras-zona__cabecera { display: flex; justify-content: space-between; align-items: center; gap: .75rem; border-bottom: 1px solid var(--line); margin-bottom: .75rem; padding-bottom: .65rem; }
 .camaras-zona__cabecera h4 { font-size: 1.05rem; }
 .camaras-zona__cabecera p { font-size: .75rem; color: var(--text-soft); margin: .25rem 0 0; }
 .camaras-tarjetas { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .85rem; }
 .camara-tarjeta { min-width: 0; display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: var(--radius); background: var(--surface); overflow: hidden; }
 .camara-tarjeta__cabecera { display: flex; align-items: flex-start; gap: .6rem; padding: .9rem; }
 .camara-tarjeta__icono { display: grid; place-items: center; width: 34px; height: 34px; flex-shrink: 0; color: #fff; background: var(--ink-900); border-radius: var(--radius-sm); }
 .camara-tarjeta__identidad { flex: 1; min-width: 0; }
 .camara-tarjeta h5 { font-size: 1.05rem; overflow-wrap: anywhere; }
 .camara-tarjeta__identidad p { margin: .25rem 0 0; font-size: .72rem; color: var(--text-soft); overflow-wrap: anywhere; }
 .camara-tarjeta__cabecera :global(.pill) { flex-shrink: 0; }
 .camara-tarjeta__datos { display: grid; gap: .45rem; border-top: 1px solid var(--line); margin: 0; padding: .85rem .9rem; flex: 1; font-size: .75rem; }
 .camara-tarjeta__datos > div { display: flex; justify-content: space-between; align-items: baseline; gap: .75rem; }
 .camara-tarjeta__datos dt { color: var(--text-soft); font-weight: 400; }
 .camara-tarjeta__datos dd { margin: 0; text-align: right; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; min-width: 0; max-width: 60%; }
 .camara-tarjeta__acciones { display: flex; align-items: center; justify-content: space-between; gap: .5rem; padding: .5rem .9rem; border-top: 1px solid var(--line); background: var(--surface-soft); }
 .camara-tarjeta__acciones > div { display: flex; gap: .35rem; }
 .actividad-camara-lista { list-style: none; padding: 0; margin: 0; display: grid; gap: .75rem; }
 .actividad-camara-lista li { border-bottom: 1px solid var(--line); padding-bottom: .75rem; }
 .actividad-camara-lista li > div { display: flex; justify-content: space-between; flex-wrap: wrap; gap: .5rem; }
 .actividad-camara-lista p, .actividad-camara-lista time { margin: .35rem 0 0; font-size: .8rem; color: var(--text-soft); }
 @media (min-width: 1200px) { .col-xl-8 .camaras-tarjetas { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
 @media (min-width: 576px) and (max-width: 1199.98px) { .camaras-tarjetas { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
 @media (max-width: 575.98px) { .camaras-tarjetas { grid-template-columns: minmax(0, 1fr); } .camara-tarjeta__acciones .btn-icon { min-width: 44px; min-height: 44px; } .camara-tarjeta__datos, .camara-tarjeta__identidad p { font-size: .875rem; } }
</style>
