<script>
 import { onMount, tick } from 'svelte';
 import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
 import PageHeader from '#lib/components/PageHeader.svelte';
 import StatCard from '#lib/components/StatCard.svelte';
 import EmptyState from '#lib/components/EmptyState.svelte';
 import PlaceholderChart from '#lib/components/PlaceholderChart.svelte';
 import Icon from '#lib/components/Icon.svelte';
 import { obtenerReportes } from '#lib/services/api_reportes.js';
 let reporte = null;
 let desde = '';
 let hasta = '';
 let idZona = '';
 let cargando = true;
 let errorCarga = '';
 let controlador;
 let desmontado = false;
 const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
 const series = [{ clave: 'entradas', label: 'Entradas' }, { clave: 'salidas', label: 'Salidas' }];
 const leyenda = [{ label: 'Entradas', tone: 'accent' }, { label: 'Salidas', tone: 'alt' }];
 const numero = valor => valor === null || valor === undefined ? '—' : Number(valor).toLocaleString('es-CO', { maximumFractionDigits: 1 });
 async function cargarReporte() {
  controlador?.abort(); const actual = new AbortController(); controlador = actual;
  cargando = true; errorCarga = '';
  try {
   const datos = await obtenerReportes({ desde, hasta, id_zona: idZona, zona_horaria: zonaHoraria }, actual.signal);
   if (desmontado || actual !== controlador) return;
   if (!datos?.periodo || !datos.resumen || !Array.isArray(datos.movimientos_dia) || !Array.isArray(datos.movimientos_hora) || !Array.isArray(datos.resumen_zonas) || !Array.isArray(datos.tipos_evento) || !Array.isArray(datos.zonas_disponibles)) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   reporte = datos; desde = datos.periodo.desde; hasta = datos.periodo.hasta;
  } catch (error) { if (!desmontado && actual === controlador && error.name !== 'AbortError') errorCarga = 'No se pudo cargar el reporte: ' + error.message; }
  finally { if (!desmontado && actual === controlador) cargando = false; }
 }
 function fechaLocal(fecha) { return new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
 function elegirPeriodo(dias) { const fin = new Date(); const inicio = new Date(fin); inicio.setDate(inicio.getDate() - dias + 1); desde = fechaLocal(inicio); hasta = fechaLocal(fin); cargarReporte(); }
 async function cambiarZona() { await tick(); cargarReporte(); }
 function tablaZonas(nodo, datos) {
  let tabla; let destruida = false; let filas = datos;
  import('datatables.net-bs5').then(({ default: DataTable }) => {
   if (destruida) return;
   tabla = new DataTable(nodo, { data: filas, ordering: false, searching: false, paging: false, autoWidth: false,
    layout: { topStart: null, topEnd: null, bottomStart: null, bottomEnd: null }, language: { aria: { orderable: ': Activar para ordenar', orderableReverse: ': Activar para invertir el orden', orderableRemove: ': Activar para quitar la ordenación' }, emptyTable: 'No hay zonas para resumir.' },
    columns: [{ title: 'Zona', data: 'nombre', render: DataTable.render.text() }, { title: 'Eventos', data: 'eventos' }, { title: 'Visitas únicas', data: 'visitas_unicas' },
     { title: 'Alertas', data: 'alertas' }, { title: 'Abiertas', data: 'alertas_abiertas' }, { title: 'Ocupación media', data: 'ocupacion_promedio', render: numero },
     { title: 'Máxima', data: 'ocupacion_maxima', render: numero }, { title: 'Mediciones', data: 'mediciones' }]
   });
  }).catch(error => { if (!destruida) errorCarga = 'No se pudo preparar la tabla: ' + error.message; });
  return { update(datos) { filas = datos; if (tabla) { tabla.clear(); tabla.rows.add(filas); tabla.draw(); } }, destroy() { destruida = true; tabla?.destroy(); } };
 }
 function exportarResumen() {
  if (!reporte) return;
  const escapar = valor => { let texto = String(valor ?? ''); if (/^[=+@\-\t\r]/.test(texto.trimStart())) texto = "'" + texto; return '"' + texto.replaceAll('"', '""') + '"'; };
  const filas = [['Reporte', reporte.periodo.desde, reporte.periodo.hasta, reporte.zona_horaria], ['Visitas', reporte.resumen.visitas], ['Duración media (min)', reporte.resumen.duracion_media], ['Eventos', reporte.resumen.eventos], ['Alertas', reporte.resumen.alertas], [], ['Zona', 'Eventos', 'Visitas únicas', 'Alertas', 'Alertas abiertas', 'Ocupación media', 'Ocupación máxima', 'Mediciones'], ...reporte.resumen_zonas.map(zona => [zona.nombre, zona.eventos, zona.visitas_unicas, zona.alertas, zona.alertas_abiertas, zona.ocupacion_promedio, zona.ocupacion_maxima, zona.mediciones])];
  const contenido = '\uFEFF' + filas.map(fila => fila.map(escapar).join(';')).join('\r\n');
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }));
  const enlace = document.createElement('a'); enlace.href = url; enlace.download = 'reporte-' + reporte.periodo.desde + '-' + reporte.periodo.hasta + '.csv'; enlace.click(); setTimeout(() => URL.revokeObjectURL(url), 0);
 }
 function imprimir() { window.print(); }
 onMount(() => { cargarReporte(); return () => { desmontado = true; controlador?.abort(); }; });
</script>
<PageHeader eyebrow="Análisis operativo" title="Reportes" description="Consulta los resultados por fecha y zona.">
 <svelte:fragment slot="actions"><button class="btn btn-quiet" type="button" on:click={cargarReporte} disabled={cargando}><Icon name="refresh" size={15} /> Actualizar</button><button class="btn btn-quiet" type="button" on:click={exportarResumen} disabled={cargando || !reporte || !!errorCarga}><Icon name="download" size={15} /> Exportar resumen</button><button class="btn btn-accent" type="button" on:click={imprimir} disabled={cargando || !reporte || !!errorCarga}><Icon name="file-chart" size={15} /> Imprimir</button></svelte:fragment>
</PageHeader>
<section class="panel mb-3"><form class="filter-bar filter-bar--report" on:submit|preventDefault={cargarReporte}>
 <div class="filter-field filter-field--xs"><label for="rep-desde">Desde</label><input id="rep-desde" type="date" class="form-control form-control-sm" bind:value={desde} required /></div>
 <div class="filter-field filter-field--xs"><label for="rep-hasta">Hasta</label><input id="rep-hasta" type="date" class="form-control form-control-sm" bind:value={hasta} required /></div>
 <div class="filter-field filter-field--md"><label for="rep-zona">Zona</label><select id="rep-zona" class="form-select form-select-sm" bind:value={idZona} on:change={cambiarZona} data-campo-api="id_zona"><option value="">Todas las zonas</option>{#each reporte?.zonas_disponibles || [] as zona (zona.id_zona)}<option value={String(zona.id_zona)}>{zona.nombre}</option>{/each}</select></div>
 <button class="btn btn-quiet btn-sm" type="submit" disabled={cargando}>Aplicar</button><div class="filter-bar__end"><button class="btn btn-quiet btn-sm" type="button" on:click={() => elegirPeriodo(1)} disabled={cargando}>Hoy</button><button class="btn btn-quiet btn-sm" type="button" on:click={() => elegirPeriodo(7)} disabled={cargando}>7 días</button><button class="btn btn-quiet btn-sm" type="button" on:click={() => elegirPeriodo(30)} disabled={cargando}>30 días</button></div>
</form></section>
{#if cargando}<p class="mb-3" role="status"><span class="spinner-inline"></span> Cargando reporte...</p>{/if}
{#if errorCarga}<div class="alert-app mb-3" role="alert">{errorCarga}</div><button class="btn btn-quiet" type="button" on:click={cargarReporte}>Reintentar</button>
{:else if reporte}
 <p class="text-faint fs-8 mb-3">Periodo: {reporte.periodo.desde} a {reporte.periodo.hasta} · {reporte.zona_horaria} · Generado {new Date(reporte.periodo.generado_en).toLocaleString('es-CO')}</p>
 <div class="row g-3 mb-3"><div class="col-6 col-lg-3"><StatCard label="Visitas en el rango" valor={reporte.resumen.visitas} foot={reporte.resumen.visitas_abiertas + ' sin salida registrada'} icon="car" /></div><div class="col-6 col-lg-3"><StatCard label="Duración media" valor={numero(reporte.resumen.duracion_media)} unit="min" foot="Visitas finalizadas del rango de entrada" icon="clock" tone="accent" /></div><div class="col-6 col-lg-3"><StatCard label="Eventos" valor={reporte.resumen.eventos} foot={reporte.resumen.tipos_evento + ' tipos registrados'} icon="events" tone="info" /></div><div class="col-6 col-lg-3"><StatCard label="Alertas" valor={reporte.resumen.alertas} foot={reporte.resumen.alertas_abiertas + ' abiertas'} icon="alert" tone={reporte.resumen.alertas_abiertas ? 'warn' : 'ok'} /></div></div>
 <div class="row g-3 mb-3"><div class="col-12 col-xl-7"><section class="panel h-100"><div class="panel__head"><div><h3>Entradas y salidas por día</h3><p>Visitas por fecha de entrada y salida</p></div></div><div class="panel__body"><PlaceholderChart filas={reporte.movimientos_dia} {series} legend={leyenda} campoEtiqueta="fecha" titulo="Movimientos por día" /></div></section></div><div class="col-12 col-xl-5"><section class="panel h-100"><div class="panel__head"><div><h3>Distribución por hora</h3><p>Entradas y salidas según hora del día</p></div></div><div class="panel__body"><PlaceholderChart filas={reporte.movimientos_hora} {series} legend={leyenda} titulo="Movimientos por hora" /></div></section></div></div>
 <div class="row g-3 mb-3"><div class="col-12 col-xl-7"><section class="panel h-100"><div class="panel__head"><div><h3>Ocupación por zona</h3><p>Ocupación promedio y último dato del periodo</p></div></div><div class="panel__body">{#if reporte.resumen_zonas.length}<dl class="ocupacion-lista">{#each reporte.resumen_zonas as zona (zona.id_zona)}<div><dt>{zona.nombre}</dt><dd>Media: {numero(zona.ocupacion_promedio)} · Última: {numero(zona.ultima_ocupacion)}<small>{zona.ultima_medicion ? new Date(zona.ultima_medicion).toLocaleString('es-CO') : 'Sin información disponible'} · {zona.mediciones} mediciones en el periodo</small></dd></div>{/each}</dl>{:else}<EmptyState icon="zones" title="Sin zonas para comparar" message="No hay zonas en la selección." />{/if}</div></section></div><div class="col-12 col-xl-5"><section class="panel h-100"><div class="panel__head"><div><h3>Tipos de evento</h3><p>Conteo en el rango filtrado</p></div></div><div class="panel__body">{#if reporte.tipos_evento.length}<dl class="ocupacion-lista">{#each reporte.tipos_evento as tipo (tipo.tipo_evento)}<div><dt>{tipo.tipo_evento}</dt><dd>{tipo.cantidad}</dd></div>{/each}</dl>{:else}<EmptyState icon="events" title="Sin eventos en el rango" message="Ajuste las fechas o la zona." />{/if}</div></section></div></div>
 <section class="panel reportes-tablas"><div class="panel__head"><div><h3>Resumen por zona</h3><p>Eventos, visitas únicas y alertas del rango. Cada visita se cuenta una vez por zona.</p></div></div><div class="table-wrap" role="region" aria-label="Tabla desplazable"><table class="data-table" use:tablaZonas={reporte.resumen_zonas} aria-label="Resumen por zona"><caption class="visually-hidden">Resumen operativo por zona</caption></table></div><div class="panel__foot">La duración promedio corresponde a las visitas iniciadas en las fechas elegidas. Al filtrar por zona, se incluyen las visitas con movimientos en ella durante ese periodo. Puedes consultar hasta 366 días.</div></section>
{/if}
<style>
 .ocupacion-lista { margin: 0; display: grid; gap: 0.8rem; }
 .ocupacion-lista > div { display: flex; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--line); padding-bottom: 0.5rem; }
 .ocupacion-lista dt, .ocupacion-lista dd { font-size: 0.8rem; margin: 0; } .ocupacion-lista dd { text-align: right; }
 .ocupacion-lista small { display: block; color: var(--text-soft); font-size: 0.68rem; }
 .reportes-tablas :global(.dt-container), .reportes-tablas :global(.dt-layout-row), .reportes-tablas :global(.dt-layout-cell) { margin: 0; padding: 0; }
 .reportes-tablas :global(table.dataTable) { margin: 0 !important; width: 100% !important; }
</style>
