<script>
 let cargandoEdicion = false;
 let falloEdicion = '';
 let revisionEdicion = 0;

 import { onMount, tick } from 'svelte';
 import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
 import PageHeader, { modalFormulario, confirmarAccion, notificarResultado } from '#lib/components/PageHeader.svelte';
 import EmptyState from '#lib/components/EmptyState.svelte';
 import Icon, { iconoAccionHTML } from '#lib/components/Icon.svelte';
 import { obtenerSeguimientos, obtenerCatalogosSeguimientos, obtenerSeguimientoPorId, crearSeguimiento, actualizarSeguimiento, eliminarSeguimiento } from '#lib/services/api_seguimientos.js';

 let seguimientos = [];
 let visitas = [];
 let vehiculos = [];
 let camaras = [];
 let zonas = [];
 let cargando = true;
 let errorCarga = '';
 let avisoCatalogos = '';
 let mensajeExito = '';
 let mensajeError = '';
 let ultimaActualizacion = '—';
 let busqueda = '';
 let filtroCamara = '';
 let filtroZona = '';
 let filtroEstado = '';
 let filtroDesde = '';
 let filtroHasta = '';
 let cantidadPagina = 10;
 let paginacion = { start: 0, end: 0, recordsDisplay: 0, page: 0, pages: 0 };
 let elementoTabla;
 let tablaSeguimientos;
 let textoSeguro;
 let desmontado = false;
 let numeroCarga = 0;
 let guardando = false;
 let preparando = false;
 let mostrarFormulario = false;
 let idEditando = null;
 let tracking = '';
 let inicio = '';
 let fin = '';
 let confianza = '';
 let estado = true;
 let idVisita = '';
 let idCamara = '';

 $: enCurso = seguimientos.filter((seguimiento) => !seguimiento.fin).length;
 $: duraciones = seguimientos.map(duracionMinutos).filter((valor) => valor !== null);
 $: duracionPromedio = duraciones.length ? (duraciones.reduce((suma, valor) => suma + valor, 0) / duraciones.length).toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' min' : '—';
 $: confianzas = seguimientos.map((seguimiento) => seguimiento.confianza_promedio).filter((valor) => valor !== null && valor !== undefined && valor !== '' && Number.isFinite(Number(valor))).map(Number);
 $: confianzaPromedio = confianzas.length ? (confianzas.reduce((suma, valor) => suma + valor, 0) / confianzas.length).toLocaleString('es-CO', { maximumFractionDigits: 4 }) : '—';

 function duracionMinutos(seguimiento) {
  if (!seguimiento.inicio || !seguimiento.fin) return null;
  const minutos = (new Date(seguimiento.fin) - new Date(seguimiento.inicio)) / 60000;
  return Number.isFinite(minutos) && minutos >= 0 ? minutos : null;
 }

 function fechaFormulario(fecha) {
  if (!fecha) return '';
  const valor = new Date(fecha);
  if (!Number.isFinite(valor.getTime())) return '';
  return new Date(valor.getTime() - valor.getTimezoneOffset() * 60000).toISOString().slice(0, 23);
 }

 function placaVisita(seguimiento) {
  const visita = visitas.find((registro) => registro.id_visita === seguimiento.id_visita);
  return vehiculos.find((vehiculo) => vehiculo.id_vehiculo === visita?.id_vehiculo)?.placa || '';
 }

 function camaraSeguimiento(seguimiento) {
  return camaras.find((camara) => camara.id_camara === seguimiento.id_camara);
 }

 function zonaSeguimiento(seguimiento) {
  return zonas.find((zona) => zona.id_zona === camaraSeguimiento(seguimiento)?.id_zona);
 }

 function mostrarFecha(valor, tipo) {
  if (!valor) return tipo === 'display' ? 'En curso' : '';
  const fecha = new Date(valor);
  return tipo === 'display' ? fecha.toLocaleString('es-CO') : tipo === 'sort' || tipo === 'type' ? fecha.getTime() : valor + ' ' + fecha.toLocaleString('es-CO');
 }

 async function inicializarPagina() {
  cargando = true;
  errorCarga = '';
  try {
   if (!tablaSeguimientos) {
    const { default: DataTable } = await import('datatables.net-bs5');
    if (desmontado) return;
    textoSeguro = DataTable.render.text();
    tablaSeguimientos = new DataTable(elementoTabla, {
     data: [], autoWidth: false, order: [[4, 'desc']], pageLength: cantidadPagina,
     layout: { topStart: null, topEnd: null, bottomStart: null, bottomEnd: null },
     language: { emptyTable: 'No hay seguimientos registrados', zeroRecords: 'No hay seguimientos que coincidan con los filtros', aria: { orderable: ': Activar para ordenar', orderableReverse: ': Activar para invertir el orden', orderableRemove: ': Activar para quitar la ordenación' } },
     columns: [
      { title: 'Código de seguimiento', data: 'id_tracking', render: (valor, tipo, fila) => tipo === 'display' ? '<span class="cell-strong codigo-etiqueta">' + textoSeguro.display(valor) + '</span><span class="cell-sub">Seguimiento ' + Number(fila.id_seguimiento) + '</span>' : valor },
      { title: 'Visita / placa', data: 'id_visita', render: (id, tipo, fila) => tipo === 'display' ? '<a href="/visitas/' + Number(id) + '">Visita ' + Number(id) + '</a><span class="cell-sub">' + textoSeguro.display(placaVisita(fila) || 'Sin placa disponible') + '</span>' : id + ' ' + placaVisita(fila) },
      { title: 'Cámara', data: 'id_camara', render: (id, tipo, fila) => textoSeguro.display((camaraSeguimiento(fila)?.nombre || 'Cámara') + ' · ' + id) },
      { title: 'Zona', data: null, render: (_, tipo, fila) => textoSeguro.display(zonaSeguimiento(fila)?.nombre || (camaraSeguimiento(fila)?.id_zona ? 'Zona ' + camaraSeguimiento(fila).id_zona : 'No disponible')) },
      { title: 'Inicio', data: 'inicio', className: 'nowrap', render: mostrarFecha },
      { title: 'Fin', data: 'fin', defaultContent: '', className: 'nowrap', render: mostrarFecha },
      { title: 'Duración (min)', data: null, className: 'num', render: (_, tipo, fila) => { const minutos = duracionMinutos(fila); return minutos === null ? (tipo === 'display' ? '—' : '') : tipo === 'display' ? minutos.toLocaleString('es-CO', { maximumFractionDigits: 1 }) : minutos; } },
      { title: 'Confianza', data: 'confianza_promedio', defaultContent: '', className: 'num', render: (valor, tipo) => valor === null || valor === '' ? (tipo === 'display' ? '—' : '') : tipo === 'display' ? Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 4 }) : Number(valor) },
      { title: 'Estado', data: 'estado', render: (valor, tipo) => tipo === 'display' ? '<span class="pill pill--' + (valor ? 'ok' : 'neutral') + '">' + (valor ? 'Activo' : 'Inactivo') + '</span>' : valor ? 'Activo' : 'Inactivo' },
      { title: 'Acciones', data: 'id_seguimiento', orderable: false, searchable: false, className: 'nowrap solo-edicion', render: (id) => Number.isInteger(id) ? '<div class="d-flex gap-1"><button class="btn btn-quiet btn-icon accion-registro" type="button" data-edicion data-accion="editar" data-id="' + id + '" title="Editar" aria-label="Editar seguimiento ' + id + '">' + iconoAccionHTML('editar') + '</button></div>' : '' },
      { name: 'camara_id', data: 'id_camara', visible: false },
      { name: 'zona_id', data: null, visible: false, render: (_, tipo, fila) => camaraSeguimiento(fila)?.id_zona ?? '' },
      { name: 'situacion', data: 'fin', visible: false, render: (valor) => valor ? 'finalizados' : 'en_curso' }
     ]
    });
    tablaSeguimientos.on('draw', () => { paginacion = tablaSeguimientos.page.info(); });
    elementoTabla.addEventListener('click', manejarAccion);
   }
   await cargarSeguimientos();
  } catch (error) {
   errorCarga = 'No se pudo inicializar el módulo: ' + error.message;
   cargando = false;
  }
 }

 async function cargarSeguimientos() {
  const carga = ++numeroCarga;
  cargando = true;
  errorCarga = '';
  avisoCatalogos = '';
  try {
   const [principal, referencias] = await Promise.allSettled([obtenerSeguimientos(), obtenerCatalogosSeguimientos()]);
   const resultados = [principal, ...["visitas","vehiculos","camaras","zonas"].map(clave => referencias.status === 'fulfilled'
    ? { status: 'fulfilled', value: referencias.value?.[clave] }
    : { status: 'rejected', reason: referencias.reason })];
   if (desmontado || carga !== numeroCarga) return;
   if (resultados[0].status === 'rejected') throw resultados[0].reason;
   if (!Array.isArray(resultados[0].value)) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   seguimientos = resultados[0].value;
   const nombres = ['visitas', 'vehículos', 'cámaras', 'zonas'];
   const catalogos = resultados.slice(1).map((resultado, indice) => {
    if (resultado.status === 'fulfilled' && Array.isArray(resultado.value)) return resultado.value;
    avisoCatalogos += (avisoCatalogos ? ' ' : '') + 'No se pudo cargar la lista de ' + nombres[indice] + '.';
    return [];
   });
   [visitas, vehiculos, camaras, zonas] = catalogos;
   tablaSeguimientos.clear();
   tablaSeguimientos.rows.add(seguimientos);
   aplicarFiltros(false);
   ultimaActualizacion = new Date().toLocaleTimeString('es-CO');
  } catch (error) {
   if (!desmontado && carga === numeroCarga) errorCarga = 'No se pudieron cargar los seguimientos: ' + error.message;
  } finally {
   if (!desmontado && carga === numeroCarga) cargando = false;
  }
 }

 function aplicarFiltros(reiniciarPagina = true) {
  if (!tablaSeguimientos) return;
  tablaSeguimientos.search(busqueda);
  tablaSeguimientos.column('camara_id:name').search(filtroCamara, { exact: true });
  tablaSeguimientos.column('zona_id:name').search(filtroZona, { exact: true });
  tablaSeguimientos.column('situacion:name').search(filtroEstado, { exact: true });
  // DataTables combina el rango con las búsquedas de columnas y la búsqueda general.
  tablaSeguimientos.search.fixed('rangoInicio', !filtroDesde && !filtroHasta ? null : (_, seguimiento) => {
   const dia = fechaFormulario(seguimiento.inicio).slice(0, 10);
   return !!dia && (!filtroDesde || dia >= filtroDesde) && (!filtroHasta || dia <= filtroHasta);
  });
  tablaSeguimientos.draw(reiniciarPagina);
 }

 async function actualizarFiltros() {
  await tick();
  if (!desmontado) aplicarFiltros();
 }

 function limpiarFiltros() {
  busqueda = ''; filtroCamara = ''; filtroZona = ''; filtroEstado = ''; filtroDesde = ''; filtroHasta = '';
  aplicarFiltros();
 }

 function cambiarPagina(direccion) { tablaSeguimientos?.page(direccion).draw('page'); }
 async function cambiarCantidad() { await tick(); if (!desmontado) tablaSeguimientos?.page.len(Number(cantidadPagina)).draw(); }

 function manejarAccion(evento) {
  const boton = evento.target.closest('button[data-accion]');
  if (!boton || cargando || guardando || preparando) return;
  const id = Number(boton.dataset.id);
  if (boton.dataset.accion === 'editar') prepararEdicion(id);
  if (boton.dataset.accion === 'eliminar') borrarSeguimiento(id);
 }

 function limpiarFormulario() {
  revisionEdicion += 1; cargandoEdicion = false; falloEdicion = ''; preparando = false;
  idEditando = null; tracking = ''; inicio = ''; fin = ''; confianza = ''; estado = true; idVisita = ''; idCamara = ''; mostrarFormulario = false;
 }
 function abrirCreacion() { limpiarFormulario(); mensajeExito = ''; mensajeError = ''; mostrarFormulario = true; }

 async function prepararEdicion(id) {
  limpiarFormulario();
  const revision = ++revisionEdicion;
  cargandoEdicion = true; falloEdicion = ''; idEditando = id; mostrarFormulario = true;

  preparando = true; mensajeError = ''; mensajeExito = '';
  try {
   const seguimiento = await obtenerSeguimientoPorId(id);
   if (revision !== revisionEdicion || !mostrarFormulario) return;
   if (desmontado) return;
   if (!seguimiento || seguimiento.id_seguimiento === undefined) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   idEditando = seguimiento.id_seguimiento;
   tracking = seguimiento.id_tracking;
   inicio = fechaFormulario(seguimiento.inicio);
   fin = fechaFormulario(seguimiento.fin);
   confianza = seguimiento.confianza_promedio ?? '';
   estado = seguimiento.estado;
   idVisita = seguimiento.id_visita;
   idCamara = seguimiento.id_camara;
   
  
  } catch {
   if (revision === revisionEdicion && mostrarFormulario) falloEdicion = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicion) { cargandoEdicion = false; preparando = false; }
  }
 }

 async function guardarSeguimiento(evento) {
  evento.preventDefault();
  if (guardando) return;
  guardando = true; mensajeError = ''; mensajeExito = '';
  try {
   const datos = { id_tracking: tracking.trim(), inicio: new Date(inicio).toISOString(), fin: fin ? new Date(fin).toISOString() : null, confianza_promedio: confianza === '' || confianza === undefined || confianza === null ? null : Number(confianza), estado, id_visita: Number(idVisita), id_camara: Number(idCamara) };
   if (idEditando === null) await crearSeguimiento(datos);
   else await actualizarSeguimiento(idEditando, datos);
   mensajeExito = idEditando === null ? 'Seguimiento registrado correctamente.' : 'Seguimiento actualizado correctamente.';
   limpiarFormulario();
   await cargarSeguimientos();
  } catch (error) { mensajeError = 'No se pudo guardar el seguimiento: ' + error.message; }
  finally { guardando = false; }
 }

 async function borrarSeguimiento(id) {
  if (!await confirmarAccion('¿Deseas eliminar el seguimiento ' + id + '?', 'Eliminar')) return;
  guardando = true; mensajeError = ''; mensajeExito = '';
  try {
   await eliminarSeguimiento(id);
   if (idEditando === id) limpiarFormulario();
   mensajeExito = 'Seguimiento eliminado correctamente.';
   await cargarSeguimientos();
  } catch (error) { mensajeError = 'No se pudo eliminar el seguimiento: ' + error.message; }
  finally { guardando = false; }
 }

 function exportarCSV() {
  if (!tablaSeguimientos) return;
  const filas = tablaSeguimientos.rows({ search: 'applied', order: 'applied' }).data().toArray();
  const escapar = (valor) => { let texto = String(valor ?? ''); if (/^[=+@\-\t\r]/.test(texto.trimStart())) texto = "'" + texto; return '"' + texto.replaceAll('"', '""') + '"'; };
  const datos = [['Número', 'Código de seguimiento', 'Visita', 'Placa', 'Cámara', 'Zona', 'Inicio', 'Fin', 'Confianza', 'Activo'], ...filas.map((fila) => [fila.id_seguimiento, fila.id_tracking, fila.id_visita, placaVisita(fila), camaraSeguimiento(fila)?.nombre || fila.id_camara, zonaSeguimiento(fila)?.nombre || '', fila.inicio, fila.fin, fila.confianza_promedio, fila.estado])];
  const contenido = '\uFEFF' + datos.map((fila) => fila.map(escapar).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }));
  const enlace = document.createElement('a'); enlace.href = url; enlace.download = 'seguimientos.csv'; enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
 }

 onMount(() => {
  desmontado = false;
  inicializarPagina();
  return () => { desmontado = true; numeroCarga += 1; elementoTabla.removeEventListener('click', manejarAccion); tablaSeguimientos?.destroy(); };
 });
 $: if (mensajeExito) notificarResultado(mensajeExito, 'success');
 $: if (mensajeError) notificarResultado(mensajeError, 'error');
</script>

<PageHeader eyebrow="Trayectorias" title="Seguimientos" description="Consulta el recorrido de los vehículos durante sus visitas.">
 <svelte:fragment slot="actions">
  
  <button class="btn btn-quiet" type="button" on:click={exportarCSV} disabled={cargando || !!errorCarga || !paginacion.recordsDisplay}><Icon name="download" size={15} /> Exportar CSV</button>
  <button data-edicion class="btn btn-accent" type="button" on:click={abrirCreacion} disabled={cargando || !!errorCarga || guardando || preparando}><Icon name="plus" size={15} /> Nuevo seguimiento</button>
 </svelte:fragment>
</PageHeader>


{#if avisoCatalogos}<div class="alert-app alert-app--warn mb-3" role="alert"><Icon name="info" size={16} /><div>{avisoCatalogos} Puedes consultar los recorridos. Puedes reintentar la carga de los datos que faltan. <button class="btn btn-quiet btn-sm" type="button" on:click={inicializarPagina} disabled={cargando}>Reintentar</button></div></div>{/if}
{#if preparando}<p class="mb-3" role="status">Consultando seguimiento...</p>{/if}

<div class="row mb-3">
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Seguimientos</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : seguimientos.length}</div><div class="fs-8 text-faint">trayectorias registradas</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">En curso</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : enCurso}</div><div class="fs-8 text-faint">sin fecha de fin</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Duración promedio</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : duracionPromedio}</div><div class="fs-8 text-faint">solo seguimientos finalizados</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Confianza promedio</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : confianzaPromedio}</div><div class="fs-8 text-faint">sobre valores disponibles</div></div></div>
</div>

{#if mostrarFormulario}
 <dialog class="modal-app modal-formulario modal-formulario--amplio" aria-labelledby="formulario-seguimientos-titulo" use:modalFormulario={limpiarFormulario} aria-busy={cargandoEdicion}>
<div class="panel__head"><div><h3 id="formulario-seguimientos-titulo">{idEditando === null ? 'Nuevo seguimiento' : 'Editar seguimiento ' + idEditando}</h3><p>Completa los datos del recorrido del vehículo.</p></div><button class="modal-app__close" type="button" aria-label="Cerrar formulario" on:click={limpiarFormulario}><Icon name="close" size={16} /></button></div>
  {#if cargandoEdicion}<div class="panel__body estado-edicion" role="status"><span class="spinner-inline" aria-hidden="true"></span><p>Cargando datos...</p><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div>
{:else if falloEdicion}<div class="panel__body estado-edicion"><p role="alert">{falloEdicion}</p><div class="d-flex gap-2"><button class="btn btn-accent" type="button" on:click={() => prepararEdicion(idEditando)}>Reintentar</button><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div></div>
{:else}
<form data-edicion class="panel__body" on:submit={guardarSeguimiento}>
 
   <fieldset disabled={guardando || preparando || cargando}>
    <div class="row g-3">
     <div class="col-md-4"><label class="form-label" for="seg-tracking">Código de seguimiento</label><input id="seg-tracking" class="form-control" type="text" bind:value={tracking} required data-campo-api="id_tracking" /></div>
     <div class="col-md-4"><label class="form-label" for="seg-inicio">Inicio</label><input id="seg-inicio" class="form-control" type="datetime-local" step="any" bind:value={inicio} required data-campo-api="inicio" /></div>
     <div class="col-md-4"><label class="form-label" for="seg-fin">Fin (opcional)</label><input id="seg-fin" class="form-control" type="datetime-local" step="any" bind:value={fin} data-campo-api="fin" /></div>
     <div class="col-md-4"><label class="form-label" for="seg-visita">Visita</label>{#if visitas.length}<select id="seg-visita" class="form-select" bind:value={idVisita} required data-campo-api="id_visita"><option value="">Seleccione una visita</option>{#if idVisita && !visitas.some((visita) => visita.id_visita === Number(idVisita))}<option value={idVisita}>Visita {idVisita}</option>{/if}{#each visitas as visita (visita.id_visita)}<option value={visita.id_visita}>Visita {visita.id_visita} · vehículo {visita.id_vehiculo}</option>{/each}</select>{:else}<input id="seg-visita" class="form-control" type="number" step="1" bind:value={idVisita} required data-campo-api="id_visita" />{/if}</div>
     <div class="col-md-4"><label class="form-label" for="seg-camara-form">Cámara</label>{#if camaras.length}<select id="seg-camara-form" class="form-select" bind:value={idCamara} required data-campo-api="id_camara"><option value="">Seleccione una cámara</option>{#if idCamara && !camaras.some((camara) => camara.id_camara === Number(idCamara))}<option value={idCamara}>Cámara {idCamara}</option>{/if}{#each camaras as camara (camara.id_camara)}<option value={camara.id_camara}>{camara.nombre} · {camara.id_camara}</option>{/each}</select>{:else}<input id="seg-camara-form" class="form-control" type="number" step="1" bind:value={idCamara} required data-campo-api="id_camara" />{/if}</div>
     <div class="col-md-4"><label class="form-label" for="seg-confianza">Confianza promedio (opcional)</label><input id="seg-confianza" class="form-control" type="number" step="any" bind:value={confianza} data-campo-api="confianza_promedio" /></div>
     <div class="col-12"><div class="form-check"><input id="seg-activo" class="form-check-input" type="checkbox" bind:checked={estado} data-campo-api="estado" /><label class="form-check-label" for="seg-activo">Seguimiento activo</label></div></div>
     <div class="col-12 d-flex gap-2"><button class="btn btn-accent" type="submit">{guardando ? 'Guardando...' : idEditando === null ? 'Registrar seguimiento' : 'Guardar cambios'}</button><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div>
    </div>
   </fieldset>
  </form>
{/if}

 </dialog>
{/if}

<section class="panel seguimientos-panel">
 <div class="panel__head"><div><h3>Trayectorias registradas</h3><p>{cargando || errorCarga ? '—' : paginacion.recordsDisplay} de {cargando || errorCarga ? '—' : seguimientos.length} seguimientos · última actualización {ultimaActualizacion}</p></div></div>
 <div class="filter-bar" aria-busy={cargando}>
  <div class="filter-field filter-field--grow"><label for="seg-search">Buscar</label><div class="input-group input-group-sm"><span class="input-group-text"><Icon name="search" size={14} /></span><input id="seg-search" class="form-control form-control-sm" placeholder="Código de seguimiento, placa, visita o cámara" bind:value={busqueda} on:input={actualizarFiltros} disabled={cargando} /></div></div>
  <div class="filter-field filter-field--sm"><label for="seg-camara">Cámara</label><select id="seg-camara" class="form-select form-select-sm" bind:value={filtroCamara} on:change={actualizarFiltros} disabled={cargando}><option value="">Todas</option>{#each camaras as camara (camara.id_camara)}<option value={String(camara.id_camara)}>{camara.nombre}</option>{/each}</select></div>
  <div class="filter-field filter-field--sm"><label for="seg-zona">Zona</label><select id="seg-zona" class="form-select form-select-sm" bind:value={filtroZona} on:change={actualizarFiltros} disabled={cargando}><option value="">Todas</option>{#each zonas as zona (zona.id_zona)}<option value={String(zona.id_zona)}>{zona.nombre}</option>{/each}</select></div>
  <div class="filter-field filter-field--sm"><label for="seg-estado">Estado</label><select id="seg-estado" class="form-select form-select-sm" bind:value={filtroEstado} on:change={actualizarFiltros} disabled={cargando}><option value="">Todos</option><option value="en_curso">En curso</option><option value="finalizados">Finalizados</option></select></div>
  <div class="filter-field filter-field--xs"><label for="seg-desde">Desde</label><input id="seg-desde" type="date" class="form-control form-control-sm" bind:value={filtroDesde} on:change={actualizarFiltros} disabled={cargando} /></div>
  <div class="filter-field filter-field--xs"><label for="seg-hasta">Hasta</label><input id="seg-hasta" type="date" class="form-control form-control-sm" bind:value={filtroHasta} on:change={actualizarFiltros} disabled={cargando} /></div>
  <div class="filter-bar__end"><button class="btn btn-quiet btn-sm" type="button" on:click={limpiarFiltros} disabled={cargando}><Icon name="filter" size={14} /> Limpiar</button></div>
 </div>
 {#if cargando}<div class="state-block" role="status"><span class="spinner-inline"></span><p class="mt-2 mb-0">Cargando seguimientos...</p></div>
 {:else if errorCarga}<div class="alert-app m-3" role="alert"><Icon name="alert" size={16} /><div>{errorCarga}</div></div><div class="px-3 pb-3"><button class="btn btn-quiet btn-sm" type="button" on:click={inicializarPagina}>Reintentar</button></div>
 {:else if seguimientos.length === 0}<EmptyState icon="route" title="No hay seguimientos registrados" message="El sistema aún no reporta trayectorias de vehículos." />{/if}
 <div hidden={cargando || !!errorCarga || seguimientos.length === 0}>
  <div class="table-wrap" role="region" aria-label="Tabla desplazable"><table bind:this={elementoTabla} class="data-table" aria-label="Seguimientos registrados"><caption class="visually-hidden">Trayectorias registradas</caption></table></div>
  <div class="panel__foot tabla-pie">
   <span role="status">Mostrando {paginacion.recordsDisplay ? paginacion.start + 1 : 0}–{paginacion.end} de {paginacion.recordsDisplay} seguimientos</span>
   <div class="tabla-paginacion"><label for="seg-cantidad">Mostrar</label><select id="seg-cantidad" class="form-select form-select-sm" bind:value={cantidadPagina} on:change={cambiarCantidad}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPagina('previous')} disabled={paginacion.page <= 0}>Anterior</button><span>{paginacion.pages ? paginacion.page + 1 : 0} / {paginacion.pages}</span><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPagina('next')} disabled={paginacion.page + 1 >= paginacion.pages}>Siguiente</button></div>
  </div>
 </div>
</section>

<style>
 fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
 .tabla-pie, .tabla-paginacion { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; }
 .tabla-pie { justify-content: space-between; }
 .tabla-paginacion select { width: 4.5rem; min-width: 4.5rem; }
 .seguimientos-panel :global(.dt-container) { margin: 0; }
 .seguimientos-panel :global(.dt-layout-row), .seguimientos-panel :global(.dt-layout-cell) { margin: 0; padding: 0; }
 .seguimientos-panel :global(table.dataTable) { margin: 0 !important; width: 100% !important; }
 .seguimientos-panel :global(table.dataTable thead th) { background: var(--surface-soft); color: var(--text-faint); border-color: var(--line); font-size: 0.65rem; padding: 0.55rem 1.6rem 0.55rem 0.7rem; }
 .seguimientos-panel :global(table.dataTable tbody td) { padding: 0.6rem 0.7rem; color: var(--text); background: var(--surface); border-color: var(--line); }
 .seguimientos-panel :global(table.dataTable tbody tr:hover td) { background: #fbfbf9; }
 .seguimientos-panel :global(.dt-column-order) { color: var(--text-soft); }
 @media (max-width: 575.98px) { .tabla-pie, .tabla-paginacion { align-items: flex-start; } .tabla-paginacion { width: 100%; } }
</style>
