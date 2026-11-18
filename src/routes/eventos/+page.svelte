<script>
 let cargandoEdicion = false;
 let falloEdicion = '';
 let revisionEdicion = 0;

 import { onMount, tick } from 'svelte';
 import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
 import PageHeader, { modalFormulario, confirmarAccion, notificarResultado } from '#lib/components/PageHeader.svelte';
 import EmptyState from '#lib/components/EmptyState.svelte';
 import Icon, { iconoAccionHTML } from '#lib/components/Icon.svelte';
 import { obtenerEventos, obtenerCatalogosEventos, obtenerEventoPorId, crearEvento, actualizarEvento, eliminarEvento } from '#lib/services/api_eventos_vehiculo.js';

 let eventos = [];
 let eventosFiltrados = [];
 let visitas = [];
 let camaras = [];
 let zonas = [];
 let seguimientos = [];
 let vehiculos = [];
 let cargando = true;
 let errorCarga = '';
 let avisoCatalogos = '';
 let mensajeExito = '';
 let mensajeError = '';
 let ultimaActualizacion = '—';
 let diaActual = '';
 let busqueda = '';
 let filtroTipo = '';
 let filtroCamara = '';
 let filtroZona = '';
 let filtroDesde = '';
 let filtroHasta = '';
 let filtroConfianza = '';
 let cantidadPagina = 10;
 let paginacion = { start: 0, end: 0, recordsDisplay: 0, page: 0, pages: 0 };
 let elementoTabla;
 let tablaEventos;
 let textoSeguro;
 let desmontado = false;
 let numeroCarga = 0;
 let guardando = false;
 let preparando = false;
 let mostrarFormulario = false;
 let idEditando = null;
 let tipoEvento = '';
 let fechaHora = '';
 let confianza = '';
 let estado = true;
 let idVisita = '';
 let idCamara = '';
 let idSeguimiento = '';
 let idZona = '';

 $: tiposEvento = [...new Set(eventos.map((evento) => evento.tipo_evento))].sort((primero, segundo) => String(primero).localeCompare(String(segundo), 'es'));
 $: diasConRegistros = new Set(eventosFiltrados.map((evento) => fechaLocal(evento.fecha_hora).slice(0, 10)).filter(Boolean)).size;
 $: eventosHoy = eventos.reduce((total, evento) => total + (fechaLocal(evento.fecha_hora).slice(0, 10) === diaActual ? 1 : 0), 0);
 $: altaConfianza = eventosFiltrados.reduce((total, evento) => total + (confianzaNumerica(evento.confianza) !== null && confianzaNumerica(evento.confianza) >= 0.85 ? 1 : 0), 0);
 $: valoresConfianza = eventosFiltrados.map((evento) => confianzaNumerica(evento.confianza)).filter((valor) => valor !== null);
 $: confianzaPromedio = valoresConfianza.length ? (valoresConfianza.reduce((suma, valor) => suma + valor, 0) / valoresConfianza.length).toLocaleString('es-CO', { maximumFractionDigits: 4 }) : '—';

 function confianzaNumerica(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
 }

 function fechaLocal(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (!Number.isFinite(fecha.getTime())) return '';
  return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 23);
 }

 function placaEvento(evento) {
  const visita = visitas.find((registro) => registro.id_visita === evento.id_visita);
  return vehiculos.find((vehiculo) => vehiculo.id_vehiculo === visita?.id_vehiculo)?.placa || '';
 }
 function nombreCamara(id) { return camaras.find((camara) => camara.id_camara === id)?.nombre || 'Cámara ' + id; }
 function nombreZona(id) { return zonas.find((zona) => zona.id_zona === id)?.nombre || 'Zona ' + id; }
 function trackingEvento(id) { return seguimientos.find((seguimiento) => seguimiento.id_seguimiento === id)?.id_tracking || ''; }

 async function inicializarPagina() {
  cargando = true; errorCarga = '';
  try {
   if (!tablaEventos) {
    const { default: DataTable } = await import('datatables.net-bs5');
    if (desmontado) return;
    textoSeguro = DataTable.render.text();
    tablaEventos = new DataTable(elementoTabla, {
     data: [], autoWidth: false, pageLength: cantidadPagina, order: [[2, 'desc']],
     layout: { topStart: null, topEnd: null, bottomStart: null, bottomEnd: null },
     language: { emptyTable: 'No hay eventos registrados', zeroRecords: 'No hay eventos que coincidan con los filtros', aria: { orderable: ': Activar para ordenar', orderableReverse: ': Activar para invertir el orden', orderableRemove: ': Activar para quitar la ordenación' } },
     columns: [
      { title: 'Número', data: 'id_evento', render: textoSeguro },
      { title: 'Tipo', name: 'tipo_evento', data: 'tipo_evento', render: (valor, tipo) => tipo === 'display' ? '<span class="pill pill--' + (/fall|error/i.test(String(valor)) ? 'danger' : 'info') + '">' + textoSeguro.display(valor) + '</span>' : valor },
      { title: 'Fecha y hora', data: 'fecha_hora', defaultContent: '', className: 'nowrap', render: (valor, tipo) => {
       const fecha = valor ? new Date(valor) : null;
       const valida = fecha && Number.isFinite(fecha.getTime());
       if (tipo === 'sort' || tipo === 'type') return valida ? fecha.getTime() : 0;
       return valida ? tipo === 'display' ? fecha.toLocaleString('es-CO') : valor + ' ' + fecha.toLocaleString('es-CO') : 'Sin fecha válida';
      } },
      { title: 'Visita / placa', data: 'id_visita', render: (id, tipo, evento) => tipo === 'display' ? '<a href="/visitas/' + Number(id) + '">Visita ' + Number(id) + '</a><span class="cell-sub">' + textoSeguro.display(placaEvento(evento) || 'Sin placa disponible') + '</span>' : id + ' ' + placaEvento(evento) },
      { title: 'Cámara', data: 'id_camara', render: (id) => textoSeguro.display(nombreCamara(id)) },
      { title: 'Zona', data: 'id_zona', render: (id) => textoSeguro.display(nombreZona(id)) },
      { title: 'Seguimiento', data: 'id_seguimiento', defaultContent: '', render: (id, tipo) => id === null || id === undefined ? 'Sin seguimiento' : tipo === 'display' ? textoSeguro.display(trackingEvento(id) || 'Seguimiento ' + id) + '<span class="cell-sub">' + Number(id) + '</span>' : id + ' ' + trackingEvento(id) },
      { title: 'Confianza', data: 'confianza', defaultContent: '', className: 'num', render: (valor, tipo) => confianzaNumerica(valor) === null ? tipo === 'display' ? '—' : '' : tipo === 'sort' || tipo === 'type' ? Number(valor) : textoSeguro.display(String(valor)) },
      { title: 'Estado', data: 'estado', render: (valor, tipo) => tipo === 'display' ? '<span class="pill pill--' + (valor ? 'ok' : 'neutral') + '">' + (valor ? 'Activo' : 'Inactivo') + '</span>' : valor ? 'Activo' : 'Inactivo' },
      { title: 'Acciones', data: 'id_evento', orderable: false, searchable: false, className: 'nowrap solo-edicion', render: (id) => Number.isInteger(id) ? '<div class="d-flex gap-1"><button class="btn btn-quiet btn-icon accion-registro" type="button" data-edicion data-accion="editar" data-id="' + id + '" title="Editar" aria-label="Editar evento ' + id + '">' + iconoAccionHTML('editar') + '</button><button class="btn btn-quiet-danger btn-icon accion-registro" type="button" data-edicion data-accion="eliminar" data-id="' + id + '" title="Eliminar" aria-label="Eliminar evento ' + id + '">' + iconoAccionHTML('eliminar') + '</button></div>' : '' },
      { name: 'camara_id', data: 'id_camara', visible: false },
      { name: 'zona_id', data: 'id_zona', visible: false }
     ]
    });
    tablaEventos.on('draw', () => {
     paginacion = tablaEventos.page.info();
     eventosFiltrados = tablaEventos.rows({ search: 'applied' }).data().toArray();
    });
    elementoTabla.addEventListener('click', manejarAccion);
   }
   await cargarEventos();
  } catch (error) { if (!desmontado) { errorCarga = 'No se pudo inicializar el módulo: ' + error.message; cargando = false; } }
 }

 async function cargarEventos() {
  if (desmontado) return;
  const carga = ++numeroCarga;
  cargando = true; errorCarga = ''; avisoCatalogos = '';
  try {
   const [principal, referencias] = await Promise.allSettled([obtenerEventos(), obtenerCatalogosEventos()]);
   const resultados = [principal, ...["visitas","camaras","zonas","seguimientos","vehiculos"].map(clave => referencias.status === 'fulfilled'
    ? { status: 'fulfilled', value: referencias.value?.[clave] }
    : { status: 'rejected', reason: referencias.reason })];
   if (desmontado || carga !== numeroCarga) return;
   if (resultados[0].status === 'rejected') throw resultados[0].reason;
   if (!Array.isArray(resultados[0].value)) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   eventos = resultados[0].value;
   const nombres = ['visitas', 'cámaras', 'zonas', 'seguimientos', 'vehículos'];
   const catalogos = resultados.slice(1).map((resultado, indice) => {
    if (resultado.status === 'fulfilled' && Array.isArray(resultado.value)) return resultado.value;
    avisoCatalogos += (avisoCatalogos ? ' ' : '') + 'No se pudo cargar la lista de ' + nombres[indice] + '.';
    return [];
   });
   [visitas, camaras, zonas, seguimientos, vehiculos] = catalogos;
   diaActual = fechaLocal(new Date().toISOString()).slice(0, 10);
   tablaEventos.clear(); tablaEventos.rows.add(eventos); aplicarFiltros(false);
   ultimaActualizacion = new Date().toLocaleTimeString('es-CO');
  } catch (error) { if (!desmontado && carga === numeroCarga) errorCarga = 'No se pudieron cargar los eventos: ' + error.message; }
  finally { if (!desmontado && carga === numeroCarga) cargando = false; }
 }

 function aplicarFiltros(reiniciarPagina = true) {
  if (!tablaEventos || desmontado) return;
  tablaEventos.search(busqueda);
  tablaEventos.column('tipo_evento:name').search(filtroTipo, { exact: true });
  tablaEventos.column('camara_id:name').search(filtroCamara, { exact: true });
  tablaEventos.column('zona_id:name').search(filtroZona, { exact: true });
  tablaEventos.search.fixed('fechaLocal', !filtroDesde && !filtroHasta ? null : (_, evento) => {
   const dia = fechaLocal(evento.fecha_hora).slice(0, 10);
   return !!dia && (!filtroDesde || dia >= filtroDesde) && (!filtroHasta || dia <= filtroHasta);
  });
  tablaEventos.search.fixed('confianzaMinima', filtroConfianza === '' ? null : (_, evento) => {
   const valor = confianzaNumerica(evento.confianza);
   return valor !== null && valor >= Number(filtroConfianza);
  });
  tablaEventos.draw(reiniciarPagina);
 }
 async function actualizarFiltros() { await tick(); aplicarFiltros(); }
 function limpiarFechas() { filtroDesde = ''; filtroHasta = ''; aplicarFiltros(); }
 function limpiarFiltros() { busqueda = ''; filtroTipo = ''; filtroCamara = ''; filtroZona = ''; filtroDesde = ''; filtroHasta = ''; filtroConfianza = ''; aplicarFiltros(); }
 function cambiarPagina(direccion) { tablaEventos?.page(direccion).draw('page'); }
 async function cambiarCantidad() { await tick(); if (!desmontado) tablaEventos?.page.len(Number(cantidadPagina)).draw(); }

 function manejarAccion(evento) {
  const boton = evento.target.closest('button[data-accion]');
  if (!boton || cargando || guardando || preparando) return;
  const id = Number(boton.dataset.id);
  if (boton.dataset.accion === 'editar') prepararEdicion(id);
  if (boton.dataset.accion === 'eliminar') borrarEvento(id);
 }
 function limpiarFormulario() {
  revisionEdicion += 1; cargandoEdicion = false; falloEdicion = ''; preparando = false; idEditando = null; tipoEvento = ''; fechaHora = ''; confianza = ''; estado = true; idVisita = ''; idCamara = ''; idSeguimiento = ''; idZona = ''; mostrarFormulario = false; }
 function abrirCreacion() { limpiarFormulario(); mensajeExito = ''; mensajeError = ''; mostrarFormulario = true; }
 async function prepararEdicion(id) {
  limpiarFormulario();
  const revision = ++revisionEdicion;
  cargandoEdicion = true; falloEdicion = ''; idEditando = id; mostrarFormulario = true;

  preparando = true; mensajeError = ''; mensajeExito = '';
  try {
   const evento = await obtenerEventoPorId(id);
   if (revision !== revisionEdicion || !mostrarFormulario) return;
   if (desmontado) return;
   if (!evento || evento.id_evento === undefined) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   idEditando = evento.id_evento; tipoEvento = evento.tipo_evento; fechaHora = fechaLocal(evento.fecha_hora); confianza = evento.confianza ?? ''; estado = evento.estado; idVisita = evento.id_visita; idCamara = evento.id_camara; idSeguimiento = evento.id_seguimiento ?? ''; idZona = evento.id_zona; 
  
  } catch {
   if (revision === revisionEdicion && mostrarFormulario) falloEdicion = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicion) { cargandoEdicion = false; preparando = false; }
  }
 }
 async function guardarEvento(evento) {
  evento.preventDefault(); if (guardando) return;
  guardando = true; mensajeError = ''; mensajeExito = '';
  try {
   const datos = {
    tipo_evento: tipoEvento.trim(), fecha_hora: fechaHora ? new Date(fechaHora).toISOString() : null,
    confianza: confianza === '' || confianza === null || confianza === undefined ? null : Number(confianza), estado,
    id_visita: Number(idVisita), id_camara: Number(idCamara), id_seguimiento: idSeguimiento === '' || idSeguimiento === null || idSeguimiento === undefined ? null : Number(idSeguimiento), id_zona: Number(idZona)
   };
   if (idEditando === null) await crearEvento(datos);
   else await actualizarEvento(idEditando, datos);
   if (desmontado) return;
   mensajeExito = idEditando === null ? 'Evento registrado correctamente.' : 'Evento actualizado correctamente.';
   limpiarFormulario(); await cargarEventos();
  } catch (error) { if (!desmontado) mensajeError = 'No se pudo guardar el evento: ' + error.message; }
  finally { guardando = false; }
 }
 async function borrarEvento(id) {
  if (!await confirmarAccion('¿Deseas eliminar el evento ' + id + '?', 'Eliminar')) return;
  guardando = true; mensajeError = ''; mensajeExito = '';
  try {
   await eliminarEvento(id);
   if (desmontado) return;
   if (idEditando === id) limpiarFormulario();
   mensajeExito = 'Evento eliminado correctamente.'; await cargarEventos();
  } catch (error) { if (!desmontado) mensajeError = 'No se pudo eliminar el evento: ' + error.message; }
  finally { guardando = false; }
 }
 function exportarCSV() {
  if (!tablaEventos) return;
  const escapar = (valor) => { let texto = String(valor ?? ''); if (/^[=+@\-\t\r]/.test(texto.trimStart())) texto = "'" + texto; return '"' + texto.replaceAll('"', '""') + '"'; };
  const filas = tablaEventos.rows({ search: 'applied', order: 'applied' }).data().toArray();
  const datos = [['Número', 'Tipo', 'Fecha y hora', 'Confianza', 'Activo', 'Visita', 'Placa', 'Cámara', 'Zona', 'Seguimiento'], ...filas.map((evento) => [evento.id_evento, evento.tipo_evento, evento.fecha_hora, evento.confianza, evento.estado, evento.id_visita, placaEvento(evento), nombreCamara(evento.id_camara), nombreZona(evento.id_zona), evento.id_seguimiento])];
  const contenido = '\uFEFF' + datos.map((fila) => fila.map(escapar).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }));
  const enlace = document.createElement('a'); enlace.href = url; enlace.download = 'eventos.csv'; enlace.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
 }
 onMount(() => {
  desmontado = false; inicializarPagina();
  return () => { desmontado = true; numeroCarga += 1; elementoTabla.removeEventListener('click', manejarAccion); tablaEventos?.destroy(); };
 });
 $: if (mensajeExito) notificarResultado(mensajeExito, 'success');
 $: if (mensajeError) notificarResultado(mensajeError, 'error');
</script>

<PageHeader eyebrow="Trazabilidad" title="Eventos" description="Consulta los movimientos de vehículos registrados por las cámaras.">
 <svelte:fragment slot="actions">
  
  <button class="btn btn-quiet" type="button" on:click={exportarCSV} disabled={cargando || !!errorCarga || !paginacion.recordsDisplay}><Icon name="download" size={15} /> Exportar CSV</button>
  <button data-edicion class="btn btn-accent" type="button" on:click={abrirCreacion} disabled={cargando || !!errorCarga || guardando || preparando}><Icon name="plus" size={15} /> Nuevo evento</button>
 </svelte:fragment>
</PageHeader>


{#if avisoCatalogos}<div class="alert-app alert-app--warn mb-3" role="alert"><Icon name="info" size={16} /><div>{avisoCatalogos} Puedes consultar los eventos. Puedes reintentar la carga de los datos que faltan. <button class="btn btn-quiet btn-sm" type="button" on:click={inicializarPagina} disabled={cargando}>Reintentar</button></div></div>{/if}
{#if preparando}<p class="mb-3" role="status">Consultando evento...</p>{/if}
<div class="row mb-3">
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Eventos en el filtro</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : paginacion.recordsDisplay}</div><div class="fs-8 text-faint">{cargando || errorCarga ? '—' : diasConRegistros} días con registros</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Eventos hoy</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : eventosHoy}</div><div class="fs-8 text-faint">sin aplicar filtros de fecha</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Alta confianza</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : altaConfianza}</div><div class="fs-8 text-faint">≥ 85 % en el filtro</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Confianza promedio</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : confianzaPromedio}</div><div class="fs-8 text-faint">sobre eventos medidos</div></div></div>
</div>

{#if mostrarFormulario}
 <dialog class="modal-app modal-formulario modal-formulario--amplio" aria-labelledby="formulario-eventos-titulo" use:modalFormulario={limpiarFormulario} aria-busy={cargandoEdicion}>
<div class="panel__head"><div><h3 id="formulario-eventos-titulo">{idEditando === null ? 'Nuevo evento' : 'Editar evento ' + idEditando}</h3><p>Completa los datos del movimiento registrado.</p></div><button class="modal-app__close" type="button" aria-label="Cerrar formulario" on:click={limpiarFormulario}><Icon name="close" size={16} /></button></div>
 {#if cargandoEdicion}<div class="panel__body estado-edicion" role="status"><span class="spinner-inline" aria-hidden="true"></span><p>Cargando datos...</p><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div>
{:else if falloEdicion}<div class="panel__body estado-edicion"><p role="alert">{falloEdicion}</p><div class="d-flex gap-2"><button class="btn btn-accent" type="button" on:click={() => prepararEdicion(idEditando)}>Reintentar</button><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div></div>
{:else}
<form data-edicion class="panel__body" on:submit={guardarEvento}>
 <fieldset disabled={guardando || preparando || cargando}><div class="row g-3">
  <div class="col-md-4"><label class="form-label" for="ev-tipo-form">Tipo de evento</label><input id="ev-tipo-form" class="form-control" type="text" list="ev-tipos-disponibles" bind:value={tipoEvento} required data-campo-api="tipo_evento" /><datalist id="ev-tipos-disponibles">{#each tiposEvento as tipo (tipo)}<option value={tipo}></option>{/each}</datalist></div>
  <div class="col-md-4"><label class="form-label" for="ev-fecha-form">Fecha y hora (opcional)</label><input id="ev-fecha-form" class="form-control" type="datetime-local" step="any" bind:value={fechaHora} data-campo-api="fecha_hora" /></div>
  <div class="col-md-4"><label class="form-label" for="ev-confianza-form">Confianza (opcional)</label><input id="ev-confianza-form" class="form-control" type="number" step="any" bind:value={confianza} data-campo-api="confianza" /></div>
  <div class="col-md-3"><label class="form-label" for="ev-visita-form">Visita</label>{#if visitas.length}<select id="ev-visita-form" class="form-select" bind:value={idVisita} required data-campo-api="id_visita"><option value="">Seleccione una visita</option>{#if idVisita && !visitas.some((visita) => visita.id_visita === Number(idVisita))}<option value={idVisita}>Visita {idVisita}</option>{/if}{#each visitas as visita (visita.id_visita)}<option value={visita.id_visita}>Visita {visita.id_visita} · vehículo {visita.id_vehiculo}</option>{/each}</select>{:else}<input id="ev-visita-form" class="form-control" type="number" step="1" bind:value={idVisita} required data-campo-api="id_visita" />{/if}</div>
  <div class="col-md-3"><label class="form-label" for="ev-camara-form">Cámara</label>{#if camaras.length}<select id="ev-camara-form" class="form-select" bind:value={idCamara} required data-campo-api="id_camara"><option value="">Seleccione una cámara</option>{#if idCamara && !camaras.some((camara) => camara.id_camara === Number(idCamara))}<option value={idCamara}>Cámara {idCamara}</option>{/if}{#each camaras as camara (camara.id_camara)}<option value={camara.id_camara}>{camara.nombre}</option>{/each}</select>{:else}<input id="ev-camara-form" class="form-control" type="number" step="1" bind:value={idCamara} required data-campo-api="id_camara" />{/if}</div>
  <div class="col-md-3"><label class="form-label" for="ev-zona-form">Zona</label>{#if zonas.length}<select id="ev-zona-form" class="form-select" bind:value={idZona} required data-campo-api="id_zona"><option value="">Seleccione una zona</option>{#if idZona && !zonas.some((zona) => zona.id_zona === Number(idZona))}<option value={idZona}>Zona {idZona}</option>{/if}{#each zonas as zona (zona.id_zona)}<option value={zona.id_zona}>{zona.nombre}</option>{/each}</select>{:else}<input id="ev-zona-form" class="form-control" type="number" step="1" bind:value={idZona} required data-campo-api="id_zona" />{/if}</div>
  <div class="col-md-3"><label class="form-label" for="ev-seguimiento-form">Seguimiento (opcional)</label>{#if seguimientos.length}<select id="ev-seguimiento-form" class="form-select" bind:value={idSeguimiento} data-campo-api="id_seguimiento"><option value="">Sin seguimiento</option>{#if idSeguimiento && !seguimientos.some((seguimiento) => seguimiento.id_seguimiento === Number(idSeguimiento))}<option value={idSeguimiento}>Seguimiento {idSeguimiento}</option>{/if}{#each seguimientos as seguimiento (seguimiento.id_seguimiento)}<option value={seguimiento.id_seguimiento}>{seguimiento.id_tracking} · {seguimiento.id_seguimiento}</option>{/each}</select>{:else}<input id="ev-seguimiento-form" class="form-control" type="number" step="1" bind:value={idSeguimiento} data-campo-api="id_seguimiento" />{/if}</div>
  <div class="col-12"><div class="form-check"><input id="ev-activo" class="form-check-input" type="checkbox" bind:checked={estado} data-campo-api="estado" /><label class="form-check-label" for="ev-activo">Evento activo</label></div></div>
  <div class="col-12 d-flex gap-2"><button class="btn btn-accent" type="submit">{guardando ? 'Guardando...' : idEditando === null ? 'Registrar evento' : 'Guardar cambios'}</button><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div>
 </div></fieldset></form>
{/if}

 </dialog>
{/if}

<section class="panel eventos-panel">
 <div class="panel__head"><div><h3>Explorador de eventos</h3><p>{cargando || errorCarga ? '—' : paginacion.recordsDisplay} eventos · última actualización {ultimaActualizacion}</p></div></div>
 <div class="filter-bar" aria-busy={cargando}>
  <div class="filter-field filter-field--grow"><label for="ev-search">Buscar</label><div class="input-group input-group-sm"><span class="input-group-text"><Icon name="search" size={14} /></span><input id="ev-search" class="form-control form-control-sm" placeholder="Número, tipo, placa, cámara o visita" bind:value={busqueda} on:input={actualizarFiltros} disabled={cargando} /></div></div>
  <div class="filter-field filter-field--sm"><label for="ev-tipo">Tipo</label><select id="ev-tipo" class="form-select form-select-sm" bind:value={filtroTipo} on:change={actualizarFiltros} disabled={cargando}><option value="">Todos</option>{#each tiposEvento as tipo (tipo)}<option value={tipo}>{tipo}</option>{/each}</select></div>
  <div class="filter-field filter-field--sm"><label for="ev-camara">Cámara</label><select id="ev-camara" class="form-select form-select-sm" bind:value={filtroCamara} on:change={actualizarFiltros} disabled={cargando}><option value="">Todas</option>{#each camaras as camara (camara.id_camara)}<option value={String(camara.id_camara)}>{camara.nombre}</option>{/each}</select></div>
  <div class="filter-field filter-field--sm"><label for="ev-zona">Zona</label><select id="ev-zona" class="form-select form-select-sm" bind:value={filtroZona} on:change={actualizarFiltros} disabled={cargando}><option value="">Todas</option>{#each zonas as zona (zona.id_zona)}<option value={String(zona.id_zona)}>{zona.nombre}</option>{/each}</select></div>
  <div class="filter-field filter-field--xs"><label for="ev-desde">Desde</label><input id="ev-desde" type="date" class="form-control form-control-sm" bind:value={filtroDesde} on:change={actualizarFiltros} disabled={cargando} /></div>
  <div class="filter-field filter-field--xs"><label for="ev-hasta">Hasta</label><input id="ev-hasta" type="date" class="form-control form-control-sm" bind:value={filtroHasta} on:change={actualizarFiltros} disabled={cargando} /></div>
  <div class="filter-field filter-field--sm"><label for="ev-conf">Confianza</label><select id="ev-conf" class="form-select form-select-sm" bind:value={filtroConfianza} on:change={actualizarFiltros} disabled={cargando}><option value="">Todas</option><option value="0.5">≥ 50 %</option><option value="0.8">≥ 80 %</option><option value="0.9">≥ 90 %</option></select></div>
  <div class="filter-bar__end"><button class="btn btn-quiet btn-sm" type="button" title="Quitar límites de fecha" on:click={limpiarFechas} disabled={cargando}>Sin fechas</button><button class="btn btn-quiet btn-sm" type="button" on:click={limpiarFiltros} disabled={cargando}><Icon name="filter" size={14} /> Limpiar</button></div>
 </div>
 {#if cargando}<div class="state-block" role="status"><span class="spinner-inline"></span><p class="mt-2 mb-0">Cargando eventos...</p></div>
 {:else if errorCarga}<div class="alert-app m-3" role="alert"><Icon name="alert" size={16} /><div>{errorCarga}</div></div><div class="px-3 pb-3"><button class="btn btn-quiet btn-sm" type="button" on:click={inicializarPagina}>Reintentar</button></div>
 {:else if eventos.length === 0}<EmptyState icon="events" title="No hay eventos registrados" message="El sistema aún no reporta eventos de vehículos." />{/if}
 <div hidden={cargando || !!errorCarga || eventos.length === 0}>
  <div class="table-wrap" role="region" aria-label="Tabla desplazable"><table bind:this={elementoTabla} class="data-table" aria-label="Eventos registrados"><caption class="visually-hidden">Explorador de eventos</caption></table></div>
  <div class="panel__foot tabla-pie"><span role="status">Mostrando {paginacion.recordsDisplay ? paginacion.start + 1 : 0}–{paginacion.end} de {paginacion.recordsDisplay} eventos</span><div class="tabla-paginacion"><label for="ev-cantidad">Mostrar</label><select id="ev-cantidad" class="form-select form-select-sm" bind:value={cantidadPagina} on:change={cambiarCantidad}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPagina('previous')} disabled={paginacion.page <= 0}>Anterior</button><span>{paginacion.pages ? paginacion.page + 1 : 0} / {paginacion.pages}</span><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPagina('next')} disabled={paginacion.page + 1 >= paginacion.pages}>Siguiente</button></div></div>
 </div>
 <div class="panel__foot">Al filtrar por fechas, se muestran solo los eventos con fecha registrada. Se usa la hora local.</div>
</section>

<style>
 fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
 .tabla-pie, .tabla-paginacion { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; }
 .tabla-pie { justify-content: space-between; }
 .tabla-paginacion select { width: 4.5rem; min-width: 4.5rem; }
 .eventos-panel :global(.dt-container) { margin: 0; }
 .eventos-panel :global(.dt-layout-row), .eventos-panel :global(.dt-layout-cell) { margin: 0; padding: 0; }
 .eventos-panel :global(table.dataTable) { margin: 0 !important; width: 100% !important; }
 .eventos-panel :global(table.dataTable thead th) { background: var(--surface-soft); color: var(--text-faint); border-color: var(--line); font-size: 0.65rem; padding: 0.55rem 1.6rem 0.55rem 0.7rem; }
 .eventos-panel :global(table.dataTable tbody td) { padding: 0.6rem 0.7rem; color: var(--text); background: var(--surface); border-color: var(--line); }
 .eventos-panel :global(table.dataTable tbody tr:hover td) { background: #fbfbf9; }
 .eventos-panel :global(.dt-column-order) { color: var(--text-soft); }
 @media (max-width: 575.98px) { .tabla-pie, .tabla-paginacion { align-items: flex-start; } .tabla-paginacion { width: 100%; } }
</style>
