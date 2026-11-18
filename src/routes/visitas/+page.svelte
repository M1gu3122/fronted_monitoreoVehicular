<script>
 let cargandoEdicion = false;
 let falloEdicion = '';
 let revisionEdicion = 0;

 import { onMount, tick } from 'svelte';
 import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
 import PageHeader, { modalFormulario, confirmarAccion, notificarResultado } from '#lib/components/PageHeader.svelte';
 import Icon, { iconoAccionHTML } from '#lib/components/Icon.svelte';
 import { obtenerVisitas, obtenerCatalogosVisitas, obtenerVisitaPorId, crearVisita, actualizarVisita, eliminarVisita } from '#lib/services/api_visitas.js';

 let visitas = [];
 let vehiculos = [];
 let cargando = true;
 let errorCarga = '';
 let mensajeExito = '';
 let mensajeError = '';
 let mostrarFormulario = false;
 let idEditando = null;
 let guardando = false;
 let preparando = false;
 let fechaEntrada = '';
 let fechaSalida = '';
 let estado = true;
 let idVehiculo = '';
 let ultimaActualizacion = '';
 let visitasVisibles = 0;
 let busqueda = '';
 let cantidadPagina = 10;
 let paginacion = { start: 0, end: 0, recordsDisplay: 0, page: 0, pages: 0 };
 let elementoTabla;
 let tablaVisitas;
 let desmontado = false;

 $: visitasDentro = visitas.filter((visita) => !visita.fecha_salida).length;
 $: duraciones = visitas.map(duracionMinutos).filter((minutos) => minutos !== null);
 $: promedio = duraciones.length ? (duraciones.reduce((suma, minutos) => suma + minutos, 0) / duraciones.length).toFixed(1) + ' min' : '—';

 function duracionMinutos(visita) {
  if (!visita.fecha_entrada || !visita.fecha_salida) return null;
  const minutos = (new Date(visita.fecha_salida) - new Date(visita.fecha_entrada)) / 60000;
  return Number.isFinite(minutos) && minutos >= 0 ? minutos : null;
 }

 function fechaLocal(fecha) {
  if (!fecha) return '';
  const valor = new Date(fecha);
  if (Number.isNaN(valor.getTime())) return '';
  return new Date(valor.getTime() - valor.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
 }

 async function cargarVisitas() {
  if (desmontado) return;
  cargando = true;
  errorCarga = '';
  try {
   const [datosVisitas, catalogos] = await Promise.all([obtenerVisitas(), obtenerCatalogosVisitas()]);
   const datosVehiculos = catalogos.vehiculos;
   if (!Array.isArray(datosVisitas) || !Array.isArray(datosVehiculos)) throw new Error('No se pudieron cargar las visitas. Actualiza la página e inténtalo de nuevo.');
   if (desmontado) return;
   visitas = datosVisitas;
   vehiculos = datosVehiculos;
   tablaVisitas.clear();
   tablaVisitas.rows.add(visitas);
   tablaVisitas.draw(false);
   ultimaActualizacion = new Date().toLocaleTimeString('es-CO');
  } catch (error) {
   errorCarga = 'No se pudieron cargar las visitas: ' + error.message;
  } finally {
   cargando = false;
  }
 }

 onMount(() => {
  desmontado = false;
  async function iniciarTabla() {
   try {
    const { default: DataTable } = await import('datatables.net-bs5');
    if (desmontado) return;
    const textoSeguro = DataTable.render.text();
    const fechaColumna = (valor, tipo) => {
     if (!valor) return tipo === 'display' ? 'Sin salida' : '';
     return tipo === 'display' ? new Date(valor).toLocaleString('es-CO') : valor;
    };
    tablaVisitas = new DataTable(elementoTabla, {
     data: [],
     order: [[3, 'desc']],
     pageLength: cantidadPagina,
     autoWidth: false,
     layout: { topStart: null, topEnd: null, bottomStart: null, bottomEnd: null },
     language: { aria: { orderable: ': Activar para ordenar', orderableReverse: ': Activar para invertir el orden', orderableRemove: ': Activar para quitar la ordenación' },
      search: 'Buscar:', lengthMenu: 'Mostrar _MENU_ visitas',
      info: 'Mostrando _START_ a _END_ de _TOTAL_ visitas',
      infoEmpty: 'No hay visitas registradas', infoFiltered: '(de _MAX_ visitas en total)',
      emptyTable: 'No hay visitas registradas', zeroRecords: 'No hay visitas que coincidan con la búsqueda',
      paginate: { first: 'Primera', last: 'Última', next: 'Siguiente', previous: 'Anterior' }
     },
     columns: [
      { title: 'ID visita', data: 'id_visita', render: textoSeguro },
      { title: 'Vehículo', data: 'id_vehiculo', render: textoSeguro },
      { title: 'Placa', data: null, render: (_, tipo, visita) => { const placa = textoSeguro.display(vehiculos.find((vehiculo) => vehiculo.id_vehiculo === visita.id_vehiculo)?.placa || 'Sin placa'); return tipo === 'display' ? '<span class="placa-etiqueta">' + placa + '</span>' : placa; } },
      { title: 'Entrada', data: 'fecha_entrada', className: 'nowrap', render: fechaColumna },
      { title: 'Salida', data: 'fecha_salida', defaultContent: '', className: 'nowrap', render: fechaColumna },
      { title: 'Estado', data: 'estado', render: (valor, tipo) => tipo === 'display' ? '<span class="pill pill--' + (valor ? 'ok' : 'neutral') + '">' + (valor ? 'Activa' : 'Inactiva') + '</span>' : valor ? 'Activa' : 'Inactiva' },
      { title: 'Duración (min)', data: null, className: 'num', render: (_, tipo, visita) => { const minutos = duracionMinutos(visita); return minutos === null ? (tipo === 'display' ? '—' : '') : Number(minutos.toFixed(1)); } },
      { title: 'Acciones', data: 'id_visita', orderable: false, searchable: false, className: 'nowrap', render: (id) => {
       if (!Number.isInteger(id)) return '';
       return '<div class="d-flex gap-1"><a class="btn btn-quiet btn-xs" href="/visitas/' + id + '">Detalle</a><button class="btn btn-quiet btn-icon accion-registro" type="button" data-edicion data-accion="editar" data-id="' + id + '" title="Editar" aria-label="Editar visita ' + id + '">' + iconoAccionHTML('editar') + '</button></div>';
      } }
     ]
    });
    tablaVisitas.on('draw', () => {
     paginacion = tablaVisitas.page.info();
     visitasVisibles = paginacion.recordsDisplay;
    });
    elementoTabla.addEventListener('click', manejarAccion);
    await cargarVisitas();
   } catch (error) {
    errorCarga = 'No se pudo inicializar la tabla de visitas: ' + error.message;
    cargando = false;
   }
  }
  iniciarTabla();
  return () => {
   desmontado = true;
   elementoTabla.removeEventListener('click', manejarAccion);
   tablaVisitas?.destroy();
  };
 });

 async function buscarVisitas() { await tick(); if (!desmontado) tablaVisitas?.search(busqueda).draw(); }
 function limpiarBusqueda() { busqueda = ''; tablaVisitas?.search('').draw(); }
 function cambiarPagina(direccion) { tablaVisitas?.page(direccion).draw('page'); }
 async function cambiarCantidad() { await tick(); if (!desmontado) tablaVisitas?.page.len(Number(cantidadPagina)).draw(); }

 function manejarAccion(evento) {
  const boton = evento.target.closest('button[data-accion]');
  if (!boton || guardando || preparando || cargando) return;
  const id = Number(boton.dataset.id);
  if (boton.dataset.accion === 'editar') prepararEdicion(id);
  if (boton.dataset.accion === 'eliminar') borrarVisita(id);
 }

 function limpiarFormulario() {
  revisionEdicion += 1; cargandoEdicion = false; falloEdicion = ''; preparando = false;
  idEditando = null;
  fechaEntrada = '';
  fechaSalida = '';
  estado = true;
  idVehiculo = '';
  mostrarFormulario = false;
 }

 function abrirCreacion() {
  limpiarFormulario();
  mensajeError = '';
  mensajeExito = '';
  mostrarFormulario = true;
 }

 async function prepararEdicion(id) {
  limpiarFormulario();
  const revision = ++revisionEdicion;
  cargandoEdicion = true; falloEdicion = ''; idEditando = id; mostrarFormulario = true;

  preparando = true;
  mensajeError = '';
  mensajeExito = '';
  try {
   const visita = await obtenerVisitaPorId(id);
   if (revision !== revisionEdicion || !mostrarFormulario) return;
   idEditando = visita.id_visita;
   fechaEntrada = fechaLocal(visita.fecha_entrada);
   fechaSalida = fechaLocal(visita.fecha_salida);
   estado = visita.estado;
   idVehiculo = visita.id_vehiculo;
   
  
  } catch {
   if (revision === revisionEdicion && mostrarFormulario) falloEdicion = 'No se pudieron cargar los datos. Inténtalo de nuevo.';
  } finally {
   if (revision === revisionEdicion) { cargandoEdicion = false; preparando = false; }
  }
 }

 async function guardarVisita(evento) {
  evento.preventDefault();
  if (guardando) return;
  guardando = true;
  mensajeError = '';
  mensajeExito = '';
  try {
   const datos = {
    fecha_entrada: new Date(fechaEntrada).toISOString(),
    fecha_salida: new Date(fechaSalida).toISOString(),
    estado,
    id_vehiculo: Number(idVehiculo)
   };
   if (idEditando === null) await crearVisita(datos);
   else await actualizarVisita(idEditando, datos);
   mensajeExito = idEditando === null ? 'Visita registrada correctamente.' : 'Visita actualizada correctamente.';
   limpiarFormulario();
   await cargarVisitas();
  } catch (error) {
   mensajeError = 'No se pudo guardar la visita: ' + error.message;
  } finally {
   guardando = false;
  }
 }

 async function borrarVisita(id) {
  if (!await confirmarAccion('¿Deseas eliminar la visita ' + id + '?', 'Eliminar')) return;
  guardando = true;
  mensajeError = '';
  mensajeExito = '';
  try {
   await eliminarVisita(id);
   if (idEditando === id) limpiarFormulario();
   mensajeExito = 'Visita eliminada correctamente.';
   await cargarVisitas();
  } catch (error) {
   mensajeError = 'No se pudo eliminar la visita: ' + error.message;
  } finally {
   guardando = false;
  }
 }
 $: if (mensajeExito) notificarResultado(mensajeExito, 'success');
 $: if (mensajeError) notificarResultado(mensajeError, 'error');
</script>

<PageHeader eyebrow="Trazabilidad" title="Historial de visitas" description="Consulta y administra las estancias registradas dentro del área supervisada.">
 <svelte:fragment slot="actions">
  
  <button data-edicion class="btn btn-accent" type="button" on:click={abrirCreacion} disabled={cargando || !!errorCarga || guardando || preparando}><Icon name="plus" size={15} /> Nueva visita</button>
 </svelte:fragment>
</PageHeader>



{#if preparando}<p role="status">Consultando la visita...</p>{/if}

<div class="row g-3 mb-3">
 {#each [ ['Visitas en la búsqueda', visitasVisibles], ['Dentro del área', visitasDentro], ['Permanencia promedio', promedio], ['Última actualización', ultimaActualizacion || '—'] ] as indicador (indicador[0])}
  <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">{indicador[0]}</div><div class="stat-card__value mt-1">{cargando || errorCarga ? '—' : indicador[1]}</div></div></div>
 {/each}
</div>

{#if mostrarFormulario}
 <dialog class="modal-app modal-formulario modal-formulario--amplio" aria-labelledby="formulario-visitas-titulo" use:modalFormulario={limpiarFormulario} aria-busy={cargandoEdicion}>
<div class="panel__head"><h3 id="formulario-visitas-titulo">{idEditando === null ? 'Nueva visita' : 'Editar visita ' + idEditando}</h3><button class="modal-app__close" type="button" aria-label="Cerrar formulario" on:click={limpiarFormulario}><Icon name="close" size={16} /></button></div>
  {#if cargandoEdicion}<div class="panel__body estado-edicion" role="status"><span class="spinner-inline" aria-hidden="true"></span><p>Cargando datos...</p><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div>
{:else if falloEdicion}<div class="panel__body estado-edicion"><p role="alert">{falloEdicion}</p><div class="d-flex gap-2"><button class="btn btn-accent" type="button" on:click={() => prepararEdicion(idEditando)}>Reintentar</button><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div></div>
{:else}
<form data-edicion class="panel__body" on:submit={guardarVisita}>
 
   <fieldset disabled={guardando || preparando || cargando}>
    <div class="row g-3">
     <div class="col-md-4"><label class="form-label" for="vis-vehiculo">Vehículo</label><select id="vis-vehiculo" class="form-select" bind:value={idVehiculo} required data-campo-api="id_vehiculo"><option value="">Seleccione un vehículo</option>{#if idVehiculo && !vehiculos.some((vehiculo) => vehiculo.id_vehiculo === Number(idVehiculo))}<option value={idVehiculo}>Vehículo {idVehiculo}</option>{/if}{#each vehiculos as vehiculo (vehiculo.id_vehiculo)}<option value={vehiculo.id_vehiculo}>{vehiculo.placa} · {vehiculo.id_vehiculo}</option>{/each}</select></div>
     <div class="col-md-4"><label class="form-label" for="vis-entrada">Fecha de entrada</label><input id="vis-entrada" class="form-control" type="datetime-local" step="any" bind:value={fechaEntrada} required data-campo-api="fecha_entrada" /></div>
     <div class="col-md-4"><label class="form-label" for="vis-salida">Fecha de salida</label><input id="vis-salida" class="form-control" type="datetime-local" step="any" bind:value={fechaSalida} required data-campo-api="fecha_salida" /><small class="text-faint">La fecha de salida es obligatoria.</small></div>
     <div class="col-12"><div class="form-check"><input id="vis-activa" class="form-check-input" type="checkbox" bind:checked={estado} data-campo-api="estado" /><label for="vis-activa" class="form-check-label">Visita activa</label></div></div>
     <div class="col-12 d-flex gap-2"><button class="btn btn-accent" type="submit">{guardando ? 'Guardando...' : 'Guardar visita'}</button><button class="btn btn-quiet" type="button" on:click={limpiarFormulario}>Cancelar</button></div>
    </div>
   </fieldset>
  </form>
{/if}

 </dialog>
{/if}

<section class="panel visitas-panel">
 <div class="panel__head"><div><h3>Visitas registradas</h3><p>{visitas.length} registros · {visitasVisibles} visibles</p></div></div>
 <div class="filter-bar">
  <div class="filter-field filter-field--grow"><label for="vis-search">Buscar</label><div class="input-group input-group-sm"><span class="input-group-text"><Icon name="search" size={14} /></span><input id="vis-search" class="form-control form-control-sm" placeholder="Placa, vehículo o número de visita" bind:value={busqueda} on:input={buscarVisitas} disabled={cargando} /></div></div>
  <div class="filter-bar__end"><button class="btn btn-quiet btn-sm" type="button" on:click={limpiarBusqueda} disabled={cargando}><Icon name="filter" size={14} /> Limpiar</button></div>
 </div>
 {#if cargando}<div class="state-block" role="status"><span class="spinner-inline"></span><p>Cargando visitas...</p></div>{/if}
 {#if errorCarga}<div class="alert-app m-3" role="alert">{errorCarga}</div>{/if}
 <div hidden={cargando || !!errorCarga} aria-busy={guardando || preparando}>
  <div class="table-wrap" role="region" aria-label="Tabla desplazable"><table bind:this={elementoTabla} class="data-table" aria-label="Visitas registradas"><caption class="visually-hidden">Historial de visitas</caption></table></div>
  <div class="panel__foot tabla-pie"><span role="status">Mostrando {paginacion.recordsDisplay ? paginacion.start + 1 : 0}–{paginacion.end} de {paginacion.recordsDisplay} visitas</span><div class="tabla-paginacion"><label for="vis-cantidad">Mostrar</label><select id="vis-cantidad" class="form-select form-select-sm" bind:value={cantidadPagina} on:change={cambiarCantidad}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option></select><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPagina('previous')} disabled={paginacion.page <= 0}>Anterior</button><span>{paginacion.pages ? paginacion.page + 1 : 0} / {paginacion.pages}</span><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPagina('next')} disabled={paginacion.page + 1 >= paginacion.pages}>Siguiente</button></div></div>
 </div>
</section>

<style>
 fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
 .tabla-pie, .tabla-paginacion { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; }
 .tabla-pie { justify-content: space-between; }
 .tabla-paginacion select { width: 4.5rem; min-width: 4.5rem; }
 .visitas-panel :global(.dt-container) { margin: 0; }
 .visitas-panel :global(.dt-layout-row), .visitas-panel :global(.dt-layout-cell) { margin: 0; padding: 0; }
 .visitas-panel :global(table.dataTable) { margin: 0 !important; width: 100% !important; }
 .visitas-panel :global(table.dataTable thead th) { background: var(--surface-soft); color: var(--text-faint); border-color: var(--line); font-size: 0.65rem; padding: 0.55rem 1.6rem 0.55rem 0.7rem; }
 .visitas-panel :global(table.dataTable tbody td) { padding: 0.6rem 0.7rem; color: var(--text); background: var(--surface); border-color: var(--line); }
 .visitas-panel :global(table.dataTable tbody tr:hover td) { background: #fbfbf9; }
 .visitas-panel :global(.dt-column-order) { color: var(--text-soft); }
 @media (max-width: 575.98px) { .tabla-pie, .tabla-paginacion { align-items: flex-start; } .tabla-paginacion { width: 100%; } }
</style>
