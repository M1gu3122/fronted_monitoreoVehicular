<script>
 import { onMount, tick } from 'svelte';
 import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
 import PageHeader from '#lib/components/PageHeader.svelte';
 import Icon from '#lib/components/Icon.svelte';
 import { obtenerMonitoreo } from '#lib/services/api_monitoreo.js';
 let resumen = null;
 let zonas = [];
 let cargando = true;
 let errorCarga = '';
 let busqueda = '';
 let filtroEstado = 'dentro';
 let filtroZona = '';
 let filtroPermanencia = 'todas';
 let umbral = '';
 let automatico = true;
 let cantidadPagina = 10;
 let elementoTabla;
 let tabla;
 let controlador;
 let desmontado = false;
 let temporizadorBusqueda;
 let paginacion = { start: 0, end: 0, recordsDisplay: 0, page: 0, pages: 0 };
 const numero = valor => valor === null || valor === undefined ? '—' : Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 1 });
 const fecha = valor => valor ? new Date(valor).toLocaleString('es-CO') : 'Sin registro';
 const camposOrden = ['id_visita', 'placa', 'fecha_entrada', 'duracion_minutos', 'zona', 'camara'];
 async function cargarPagina(solicitud, responder) {
  controlador?.abort(); const actual = new AbortController(); controlador = actual;
  cargando = true; errorCarga = '';
  try {
   const datos = await obtenerMonitoreo({ busqueda: solicitud.search.value, estado: filtroEstado, id_zona: filtroZona,
    permanencia: filtroPermanencia, umbral_minutos: umbral, inicio: solicitud.start, limite: solicitud.length,
    ordenar: camposOrden[solicitud.order[0]?.column] || 'fecha_entrada', direccion: solicitud.order[0]?.dir || 'desc' }, actual.signal);
   if (desmontado || actual !== controlador) return;
   if (!datos?.resumen || !Array.isArray(datos.registros) || !Array.isArray(datos.zonas)) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   resumen = datos.resumen; zonas = datos.zonas;
   responder({ draw: solicitud.draw, recordsTotal: Number(resumen.total), recordsFiltered: Number(resumen.total_filtrado), data: datos.registros });
  } catch (error) {
   if (!desmontado && actual === controlador && error.name !== 'AbortError') {
    errorCarga = 'No se pudo cargar el monitoreo: ' + error.message;
    responder({ draw: solicitud.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
   }
  } finally { if (!desmontado && actual === controlador) cargando = false; }
 }
 async function iniciarPagina() {
  if (tabla) { tabla.ajax.reload(null, false); return; }
  cargando = true; errorCarga = '';
  try {
   const { default: DataTable } = await import('datatables.net-bs5');
   if (desmontado) return;
   const texto = valor => DataTable.render.text().display(String(valor ?? ''));
   tabla = new DataTable(elementoTabla, { serverSide: true, ajax: cargarPagina, pageLength: cantidadPagina, autoWidth: false, order: [[2, 'desc']],
    layout: { topStart: null, topEnd: null, bottomStart: null, bottomEnd: null },
    language: { aria: { orderable: ': Activar para ordenar', orderableReverse: ': Activar para invertir el orden', orderableRemove: ': Activar para quitar la ordenación' }, emptyTable: 'No hay visitas para mostrar', zeroRecords: 'No hay visitas que coincidan con los filtros' },
    columns: [
     { title: 'Visita', data: 'id_visita', render: id => '<a href="/visitas/' + Number(id) + '">Visita ' + Number(id) + '</a>' },
     { title: 'Vehículo', data: null, render: (_, tipo, fila) => '<span class="cell-strong placa-etiqueta">' + texto(fila.placa || 'Sin identificar') + '</span><span class="cell-sub">' + texto([fila.marca, fila.modelo, fila.color].filter(Boolean).join(' · ')) + '</span>' },
     { title: 'Entrada', data: 'fecha_entrada', className: 'nowrap', render: fecha },
     { title: 'Permanencia (min)', data: 'duracion_minutos', className: 'num', render: numero },
     { title: 'Última zona', data: 'zona', defaultContent: 'Sin evento asociado', render: DataTable.render.text() },
     { title: 'Última cámara', data: 'camara', defaultContent: 'Sin evento asociado', render: DataTable.render.text() },
     { title: 'Último evento', data: 'ultimo_evento', orderable: false, render: fecha },
     { title: 'Alertas abiertas', data: 'alertas_abiertas', orderable: false, render: (valor, tipo) => tipo === 'display' ? '<span class="pill pill--' + (Number(valor) > 0 ? 'warn' : 'neutral') + '">' + texto(valor) + '</span>' : valor },
     { title: 'Estado', data: 'fecha_salida', defaultContent: '', orderable: false, render: (valor, tipo) => tipo === 'display' ? '<span class="pill pill--' + (valor ? 'neutral' : 'ok') + '">' + (valor ? 'Finalizada' : 'Sin salida registrada') + '</span>' : valor ? 'Finalizada' : 'Sin salida registrada' }
    ]
   });
   tabla.on('draw', () => { paginacion = tabla.page.info(); });
  } catch (error) { if (!desmontado) { errorCarga = 'No se pudo inicializar el monitoreo: ' + error.message; cargando = false; } }
 }
 async function aplicarFiltros() { await tick(); if (!desmontado) tabla?.search(busqueda).draw(); }
 function programarBusqueda() { clearTimeout(temporizadorBusqueda); temporizadorBusqueda = setTimeout(aplicarFiltros, 250); }
 function limpiarFiltros() { busqueda = ''; filtroEstado = 'dentro'; filtroZona = ''; filtroPermanencia = 'todas'; umbral = ''; aplicarFiltros(); }
 function cambiarPagina(direccion) { tabla?.page(direccion).draw('page'); }
 async function cambiarCantidad() { await tick(); if (!desmontado) tabla?.page.len(Number(cantidadPagina)).draw(); }
 onMount(() => {
  iniciarPagina();
  const intervalo = setInterval(() => { if (automatico && !document.hidden && !cargando && !elementoTabla?.closest('.panel')?.contains(document.activeElement)) tabla?.ajax.reload(null, false); }, 30000);
  return () => { desmontado = true; clearInterval(intervalo); clearTimeout(temporizadorBusqueda); controlador?.abort(); tabla?.destroy(); };
 });
</script>
<PageHeader eyebrow="Operación en vivo" title="Monitoreo vehicular" description="Consulta los vehículos y su última ubicación registrada.">
 <svelte:fragment slot="actions"><span class="text-faint fs-8">{resumen ? 'Actualizado ' + fecha(resumen.generado_en) : 'Sin actualizar'}</span></svelte:fragment>
</PageHeader>
<div class="row g-3 mb-3">
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Dentro del área</div><div class="stat-card__value mt-1">{errorCarga || !resumen ? '—' : resumen.dentro}</div><div class="fs-8 text-faint">visitas activas sin salida</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Permanencia media</div><div class="stat-card__value mt-1">{errorCarga || !resumen ? '—' : numero(resumen.permanencia_media)}</div><div class="fs-8 text-faint">minutos · visitas abiertas</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Superan el tiempo límite</div><div class="stat-card__value mt-1">{errorCarga || !resumen ? '—' : resumen.sobre_umbral ?? '—'}</div><div class="fs-8 text-faint">{umbral ? 'Límite: ' + umbral + ' minutos' : 'Indica el tiempo límite en minutos'}</div></div></div>
 <div class="col-6 col-lg-3"><div class="panel p-3 h-100"><div class="eyebrow-plain">Sin identificación</div><div class="stat-card__value mt-1">{errorCarga || !resumen ? '—' : resumen.sin_identificacion}</div><div class="fs-8 text-faint">visitas abiertas sin placa disponible</div></div></div>
</div>
<section class="panel monitoreo-panel"><div class="panel__head"><div><h3>Vehículos observados</h3><p>{errorCarga || !resumen ? '—' : resumen.total_filtrado} de {resumen?.total ?? '—'} visitas · {errorCarga || !resumen ? '—' : resumen.identificadas} identificadas</p></div><div class="panel__head-tools"><label class="auto-control" for="mon-auto"><input id="mon-auto" class="form-check-input" type="checkbox" bind:checked={automatico} /> Actualizar cada 30 s</label></div></div>
 <div class="filter-bar">
  <div class="filter-field filter-field--grow"><label for="mon-search">Buscar</label><div class="input-group input-group-sm"><span class="input-group-text"><Icon name="search" size={14} /></span><input id="mon-search" class="form-control form-control-sm" placeholder="Placa, marca, modelo o visita" maxlength="200" bind:value={busqueda} on:input={programarBusqueda} /></div></div>
  <div class="filter-field filter-field--sm"><label for="mon-estado">Estado</label><select id="mon-estado" class="form-select form-select-sm" bind:value={filtroEstado} on:change={aplicarFiltros}><option value="dentro">Dentro del área</option><option value="finalizadas">Finalizadas</option><option value="sin_identificar">Sin identificar</option><option value="todas">Todas</option></select></div>
  <div class="filter-field filter-field--md"><label for="mon-zona">Última zona</label><select id="mon-zona" class="form-select form-select-sm" bind:value={filtroZona} on:change={aplicarFiltros}><option value="">Todas las zonas</option>{#each zonas as zona (zona.id_zona)}<option value={String(zona.id_zona)}>{zona.nombre}</option>{/each}</select></div>
  <div class="filter-field filter-field--md"><label for="mon-perm">Permanencia</label><select id="mon-perm" class="form-select form-select-sm" bind:value={filtroPermanencia} on:change={aplicarFiltros}><option value="todas">Cualquier tiempo</option><option value="excede">Supera el tiempo límite</option><option value="abiertas">Sin salida registrada</option></select></div>
  <div class="filter-field filter-field--xs"><label for="mon-umbral">Tiempo límite (min)</label><input id="mon-umbral" class="form-control form-control-sm" type="number" min="1" max="525600" step="1" placeholder="Sin configurar" bind:value={umbral} on:change={aplicarFiltros} /></div>
  <div class="filter-bar__end"><button class="btn btn-quiet btn-sm" type="button" on:click={limpiarFiltros}><Icon name="filter" size={14} /> Limpiar</button></div>
 </div>
 {#if cargando}<div class="state-block" role="status"><span class="spinner-inline"></span><p>Cargando monitoreo...</p></div>{/if}
 {#if errorCarga}<div class="alert-app m-3" role="alert">{errorCarga}</div><div class="px-3 pb-3"><button class="btn btn-quiet btn-sm" type="button" on:click={iniciarPagina}>Reintentar</button></div>{/if}
 <div hidden={!resumen && (cargando || !!errorCarga)} aria-busy={cargando}><div class="table-wrap" role="region" aria-label="Tabla desplazable"><table bind:this={elementoTabla} class="data-table" aria-label="Monitoreo vehicular"><caption class="visually-hidden">Visitas con su último evento</caption></table></div><div class="panel__foot tabla-pie"><span role="status">Mostrando {paginacion.recordsDisplay ? paginacion.start + 1 : 0}–{paginacion.end} de {paginacion.recordsDisplay} visitas</span><div class="tabla-paginacion"><label for="mon-cantidad">Mostrar</label><select id="mon-cantidad" class="form-select form-select-sm" bind:value={cantidadPagina} on:change={cambiarCantidad}><option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option></select><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPagina('previous')} disabled={paginacion.page <= 0}>Anterior</button><span>{paginacion.pages ? paginacion.page + 1 : 0} / {paginacion.pages}</span><button class="btn btn-quiet btn-sm" type="button" on:click={() => cambiarPagina('next')} disabled={paginacion.page + 1 >= paginacion.pages}>Siguiente</button></div></div></div>
</section>

<style>
 .tabla-pie, .tabla-paginacion { display: flex; align-items: center; flex-wrap: wrap; gap: 0.6rem; }
 .tabla-pie { justify-content: space-between; }
 .tabla-paginacion select { width: 4.5rem; min-width: 4.5rem; }
 .monitoreo-panel :global(.dt-container) { margin: 0; }
 .monitoreo-panel :global(.dt-layout-row), .monitoreo-panel :global(.dt-layout-cell) { margin: 0; padding: 0; }
 .monitoreo-panel :global(table.dataTable) { margin: 0 !important; width: 100% !important; }
 .monitoreo-panel :global(table.dataTable thead th) { background: var(--surface-soft); color: var(--text-faint); border-color: var(--line); font-size: 0.65rem; padding: 0.55rem 1.6rem 0.55rem 0.7rem; }
 .monitoreo-panel :global(table.dataTable tbody td) { padding: 0.6rem 0.7rem; color: var(--text); background: var(--surface); border-color: var(--line); }
 .monitoreo-panel :global(table.dataTable tbody tr:hover td) { background: #fbfbf9; }
 .monitoreo-panel :global(.dt-column-order) { color: var(--text-soft); }
 @media (max-width: 575.98px) { .tabla-pie, .tabla-paginacion { align-items: flex-start; } .tabla-paginacion { width: 100%; } }

.auto-control { display: flex; gap: 0.45rem; align-items: center; font-size: 0.75rem; }
.auto-control input { margin: 0; }

</style>
