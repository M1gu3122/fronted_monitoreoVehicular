<script>
 import { onMount, tick } from 'svelte';
 import 'datatables.net-bs5/css/dataTables.bootstrap5.css';
 import PageHeader from '#lib/components/PageHeader.svelte';
 import StatCard from '#lib/components/StatCard.svelte';
 import EmptyState from '#lib/components/EmptyState.svelte';
 import PlaceholderChart from '#lib/components/PlaceholderChart.svelte';
 import Icon from '#lib/components/Icon.svelte';
 import { obtenerDashboard } from '#lib/services/api_dashboard.js';
 let datos = null;
 let cargando = true;
 let errorCarga = '';
 let umbral = '';
 let controlador;
 let desmontado = false;
 const zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota';
 const seriesMovimientos = [{ clave: 'entradas', label: 'Entradas' }, { clave: 'salidas', label: 'Salidas' }];
 const leyenda = [{ label: 'Entradas', tone: 'accent' }, { label: 'Salidas', tone: 'alt' }];
 function porcentajeValido(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  return Number.isFinite(numero) && numero >= 0 ? numero : null;
 }
 function estadoOcupacion(zona) {
  const porcentaje = porcentajeValido(zona.porcentaje);
  if (porcentaje === null) return { tono: 'neutral', etiqueta: 'Sin información' };
  if (porcentaje >= 100) return { tono: 'danger', etiqueta: 'Capacidad completa' };
  if (porcentaje >= 70) return { tono: 'warn', etiqueta: 'Ocupación moderada' };
  return { tono: 'ok', etiqueta: 'Con disponibilidad' };
 }
 function confianzaPorcentaje(valor) {
  const numero = porcentajeValido(valor);
  if (numero === null || numero > 100) return null;
  return numero <= 1 ? numero * 100 : numero;
 }
 const fecha = valor => valor ? new Date(valor).toLocaleString('es-CO') : 'Sin información';
 async function cargarDashboard() {
  controlador?.abort(); const actual = new AbortController(); controlador = actual;
  cargando = true; errorCarga = '';
  try {
   const respuesta = await obtenerDashboard({ zona_horaria: zonaHoraria, umbral_minutos: umbral }, actual.signal);
   if (desmontado || actual !== controlador) return;
   if (!respuesta?.resumen || !Array.isArray(respuesta.movimientos_hora) || !Array.isArray(respuesta.ocupacion_zonas) || !Array.isArray(respuesta.ultimos_eventos) || !Array.isArray(respuesta.alertas_abiertas)) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   datos = respuesta;
  } catch (error) { if (!desmontado && error.name !== 'AbortError' && actual === controlador) errorCarga = 'No se pudo cargar el dashboard: ' + error.message; }
  finally { if (!desmontado && actual === controlador) cargando = false; }
 }
 async function cambiarUmbral() { await tick(); cargarDashboard(); }
 function tablaEventos(nodo, registros) {
  let tabla; let destruida = false; let filas = registros;
  import('datatables.net-bs5').then(({ default: DataTable }) => {
   if (destruida) return;
   const texto = DataTable.render.text();
   tabla = new DataTable(nodo, { data: filas, ordering: false, searching: false, paging: false, autoWidth: false,
    layout: { topStart: null, topEnd: null, bottomStart: null, bottomEnd: null }, language: { aria: { orderable: ': Activar para ordenar', orderableReverse: ': Activar para invertir el orden', orderableRemove: ': Activar para quitar la ordenación' }, emptyTable: 'Sin eventos para mostrar.' },
    columns: [{ title: 'Evento', data: 'tipo_evento', render: (valor, tipo) => {
     if (tipo !== 'display') return valor;
     const tono = /fall|error/i.test(String(valor)) ? 'danger' : 'info';
     return '<span class="pill pill--' + tono + ' evento-etiqueta">' + texto.display(valor ?? 'Sin tipo') + '</span>';
    } }, { title: 'Fecha y hora', data: 'fecha_hora', render: valor => valor ? fecha(valor) : 'Sin fecha' },
     { title: 'Cámara', data: 'camara', defaultContent: 'Sin cámara', render: texto }, { title: 'Zona', data: 'zona', defaultContent: 'Sin zona', render: texto },
     { title: 'Visita', data: 'id_visita', render: id => Number.isInteger(id) ? '<a href="/visitas/' + id + '">Visita ' + id + '</a>' : 'Sin visita' },
     { title: 'Confianza', data: 'confianza', defaultContent: '', render: (valor, tipo) => {
      if (tipo !== 'display') return valor;
      const porcentaje = confianzaPorcentaje(valor);
      if (porcentaje === null) return '<span class="text-faint">Sin información</span>';
      const etiqueta = porcentaje.toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' %';
      return '<span class="confianza-dato"><span class="confianza-barra" aria-hidden="true"><span style="width:' + porcentaje + '%;background:var(--' + (porcentaje >= 85 ? 'ok' : 'warn') + ')"></span></span><span>' + etiqueta + '</span></span>';
     } }]
   });
  }).catch(error => { if (!destruida) errorCarga = 'No se pudo preparar la tabla: ' + error.message; });
  return { update(registros) { filas = registros; if (tabla) { tabla.clear(); tabla.rows.add(filas); tabla.draw(); } }, destroy() { destruida = true; tabla?.destroy(); } };
 }
 onMount(() => { cargarDashboard(); return () => { desmontado = true; controlador?.abort(); }; });
</script>
<PageHeader eyebrow="Centro de control" title="Estado del área de mantenimiento" description="Consulta las entradas, salidas, ocupación de zonas y alertas pendientes.">
 <svelte:fragment slot="actions"><div class="umbral-control"><label for="dash-umbral">Tiempo límite (min)</label><input id="dash-umbral" class="form-control form-control-sm" type="number" min="1" max="525600" step="1" placeholder="Sin configurar" bind:value={umbral} on:change={cambiarUmbral} /></div><span class="text-faint fs-8">{datos ? 'Actualizado ' + fecha(datos.resumen.generado_en) : 'Sin actualizar'}</span><button class="btn btn-quiet" type="button" on:click={cargarDashboard} disabled={cargando}><Icon name="refresh" size={15} /> Actualizar</button></svelte:fragment>
</PageHeader>
{#if cargando}<div class="mb-3" role="status"><span class="spinner-inline"></span> Cargando dashboard...</div>{/if}
{#if errorCarga}<div class="alert-app mb-3" role="alert">{errorCarga}</div><button class="btn btn-quiet" on:click={cargarDashboard} type="button">Reintentar</button>
{:else if datos}
 <div class="row g-3 mb-3">
  <div class="col-12 col-md-6 col-lg-3"><StatCard label="Vehículos dentro del área" valor={datos.resumen.vehiculos_dentro} icon="car" tone="accent" foot="Visitas activas sin salida registrada" href="/monitoreo" /></div>
  <div class="col-12 col-md-6 col-lg-3"><StatCard label="Entradas hoy" valor={datos.resumen.entradas_hoy} icon="arrow-right" tone="ok" foot="Movimientos del día" href="/visitas" /></div>
  <div class="col-12 col-md-6 col-lg-3"><StatCard label="Salidas hoy" valor={datos.resumen.salidas_hoy} icon="logout" tone="info" foot="Balance del día" href="/visitas" /></div>
  <div class="col-12 col-md-6 col-lg-3"><StatCard label="Alertas pendientes" valor={datos.resumen.alertas_pendientes} icon="alert" tone={datos.resumen.alertas_pendientes ? 'warn' : 'ok'} foot="Pendientes o en proceso" href="/alertas" /></div>
  <div class="col-12 col-md-6 col-lg-3"><StatCard label="Permanencia prolongada" valor={datos.resumen.permanencia_prolongada} icon="clock" foot={datos.umbral_minutos ? 'Límite: ' + datos.umbral_minutos + ' minutos' : 'Indica el tiempo límite en minutos'} href="/monitoreo" /></div>
  <div class="col-12 col-md-6 col-lg-3"><StatCard label="Zonas ocupadas" valor={datos.resumen.zonas_ocupadas} icon="zones" tone="info" foot="Último dato de ocupación" href="/zonas" /></div>
  <div class="col-12 col-md-6 col-lg-3"><StatCard label="Cámaras activas" valor={datos.resumen.camaras_activas} icon="camera" tone="ok" foot="Estado registrado en el sistema" href="/camaras" /></div>
  <div class="col-12 col-md-6 col-lg-3"><StatCard label="Visitas registradas" valor={datos.resumen.visitas_total} icon="history" foot="Total del sistema" href="/visitas" /></div>
 </div>
 <div class="row g-3 mb-3">
  <div class="col-12 col-xl-7"><section class="panel h-100"><div class="panel__head"><div><h3>Entradas y salidas por hora</h3><p>Movimientos registrados hoy · {datos.zona_horaria}</p></div><span class="pill pill--neutral">{datos.resumen.entradas_hoy} entradas · {datos.resumen.salidas_hoy} salidas</span></div><div class="panel__body"><PlaceholderChart filas={datos.movimientos_hora} series={seriesMovimientos} legend={leyenda} message="No hay movimientos registrados hoy." /></div></section></div>
  <div class="col-12 col-xl-5"><section class="panel h-100"><div class="panel__head"><div><h3>Vehículos dentro por hora</h3><p>Vehículos que permanecían en el área al finalizar cada hora</p></div></div><div class="panel__body"><PlaceholderChart filas={datos.movimientos_hora} series={[{ clave: 'dentro', label: 'Dentro del área' }]} titulo="Vehículos dentro por hora" message="No hay visitas para mostrar la evolución del día." /><p class="fs-8 text-faint mt-2">Los datos de hoy incluyen los movimientos registrados hasta ahora.</p></div></section></div>
 </div>
 <div class="row g-3 mb-3">
  <div class="col-12 col-xl-5"><section class="panel h-100"><div class="panel__head"><div><h3>Ocupación por zona</h3><p>Último dato de ocupación</p></div><a class="btn btn-quiet btn-xs" href="/zonas">Ver zonas</a></div><div class="panel__body">{#if datos.ocupacion_zonas.length}<dl class="lista-zonas">
 {#each datos.ocupacion_zonas as zona (zona.id_zona)}
  {@const porcentaje = porcentajeValido(zona.porcentaje)}
  {@const estado = estadoOcupacion(zona)}
  <div class="zona-fila">
   <dt>{zona.nombre}<small>{zona.cantidad_vehiculos === null ? 'Capacidad: ' + (zona.capacidad_maxima ?? 'sin definir') : zona.cantidad_vehiculos + ' de ' + (zona.capacidad_maxima ?? 'sin definir') + ' cupos'} · {fecha(zona.fecha_medicion)}</small></dt>
   <dd>
    <div class="zona-barra" role={porcentaje !== null ? 'meter' : undefined} aria-label={porcentaje !== null ? 'Ocupación de ' + zona.nombre : undefined} aria-valuemin={porcentaje !== null ? 0 : undefined} aria-valuemax={porcentaje !== null ? 100 : undefined} aria-valuenow={porcentaje !== null ? Math.min(100, porcentaje) : undefined} aria-valuetext={porcentaje !== null ? porcentaje + ' % · ' + estado.etiqueta : undefined}>
     <span class={'zona-barra__relleno zona-barra__relleno--' + estado.tono} style:width={(porcentaje === null ? 0 : Math.min(100, porcentaje)) + '%'}></span>
    </div>
    <span class="zona-porcentaje">{porcentaje === null ? '—' : porcentaje.toLocaleString('es-CO', { maximumFractionDigits: 1 }) + ' %'}</span>
    <span class={'pill pill--' + estado.tono}>{estado.etiqueta}</span>
   </dd>
  </div>
 {/each}
</dl>{:else}<EmptyState icon="zones" title="Sin zonas activas" message="No hay zonas activas para consultar." />{/if}</div><div class="panel__foot">Si no hay datos de ocupación, se muestra «Sin información».</div></section></div>
  <div class="col-12 col-xl-7"><section class="panel h-100 dashboard-tablas"><div class="panel__head"><div><h3>Últimos eventos registrados</h3><p>Los diez eventos más recientes</p></div><a class="btn btn-quiet btn-xs" href="/eventos">Ver todos</a></div><div class="table-wrap" role="region" aria-label="Tabla desplazable"><table class="data-table" use:tablaEventos={datos.ultimos_eventos} aria-label="Últimos eventos"><caption class="visually-hidden">Últimos eventos registrados</caption></table></div></section></div>
 </div>
 <div class="row g-3"><div class="col-12 col-xl-7"><section class="panel h-100"><div class="panel__head"><div><h3>Alertas abiertas</h3><p>Hasta diez alertas pendientes o en proceso</p></div><a class="btn btn-quiet btn-xs" href="/alertas">Gestionar alertas</a></div><div class="panel__body">{#if datos.alertas_abiertas.length}<ul class="alertas-dashboard">
 {#each datos.alertas_abiertas as alerta (alerta.id_alerta)}
  {@const enProceso = String(alerta.estado_resolucion).toLowerCase() === 'en_proceso'}
  <li class:alerta-en-proceso={enProceso}>
   <div class="alerta-dashboard__cabecera"><strong>{alerta.tipo_alerta}</strong><span class={'pill pill--' + (enProceso ? 'info' : 'warn')}>{enProceso ? 'En proceso' : 'Pendiente'}</span></div>
   <p>{alerta.mensaje}</p>
   <div class="alerta-dashboard__detalle"><span>{alerta.zona || 'Sin zona'}{#if Number.isInteger(alerta.id_visita)} · <a href={'/visitas/' + alerta.id_visita}>Visita #{alerta.id_visita}</a>{/if}</span><time datetime={alerta.fecha_deteccion || undefined}>{fecha(alerta.fecha_deteccion)}</time></div>
  </li>
 {/each}
</ul>{:else}<EmptyState icon="check" title="Sin alertas abiertas" message="No hay alertas pendientes o en proceso." />{/if}</div></section></div><div class="col-12 col-xl-5"><section class="panel h-100"><div class="panel__head"><h3>Estado de cámaras</h3><a class="btn btn-quiet btn-xs" href="/camaras">Ver cámaras</a></div><div class="panel__body"><div class="kpi-inline"><dl><dt>Activas</dt><dd>{datos.resumen.camaras_activas}</dd></dl><dl><dt>Inactivas</dt><dd>{datos.resumen.camaras_inactivas}</dd></dl><dl><dt>Total</dt><dd>{datos.resumen.camaras_total}</dd></dl></div><p class="fs-8 text-faint mt-2">Una cámara activa puede no estar transmitiendo video.</p></div></section></div></div>
{/if}
<style>
 .umbral-control { display: grid; gap: 0.2rem; width: 130px; font-size: 0.7rem; }
 .lista-zonas { margin: 0; display: grid; gap: 0; }
 .zona-fila { display: grid; grid-template-columns: minmax(0, 1fr) minmax(190px, 1fr); align-items: center; gap: 1rem; padding: .75rem 0; border-bottom: 1px solid var(--line); }
 .zona-fila:first-child { padding-top: 0; }
 .zona-fila:last-child { border-bottom: 0; padding-bottom: 0; }
 .zona-fila dt { min-width: 0; font-size: .8rem; font-weight: 600; overflow-wrap: anywhere; }
 .zona-fila small { display: block; margin-top: .2rem; color: var(--text-soft); font-size: .72rem; font-weight: 400; }
 .zona-fila dd { margin: 0; display: grid; grid-template-columns: minmax(32px, 1fr) 44px auto; align-items: center; gap: .5rem; }
 .zona-barra { height: 6px; overflow: hidden; background: var(--surface-muted); border-radius: 999px; }
 .zona-barra__relleno { display: block; height: 100%; border-radius: inherit; background: var(--ok); }
 .zona-barra__relleno--warn { background: var(--warn); }
 .zona-barra__relleno--danger { background: var(--danger); }
 .zona-porcentaje { font-size: .75rem; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
 .zona-fila .pill { font-size: .68rem; white-space: nowrap; }
 .alertas-dashboard { display: grid; gap: .65rem; list-style: none; margin: 0; padding: 0; }
 .alertas-dashboard li { position: relative; padding: .75rem .8rem .75rem 1.1rem; border: 1px solid var(--line); border-radius: var(--radius-sm); }
 .alertas-dashboard li::before { content: ''; position: absolute; left: .55rem; top: .7rem; bottom: .7rem; width: 3px; background: var(--warn); border-radius: 2px; }
 .alertas-dashboard .alerta-en-proceso::before { background: var(--info); }
 .alerta-dashboard__cabecera { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; font-size: .8rem; }
 .alertas-dashboard p { margin: .3rem 0; font-size: .78rem; color: var(--text-soft); overflow-wrap: anywhere; }
 .alerta-dashboard__detalle { display: flex; flex-wrap: wrap; justify-content: space-between; gap: .3rem .75rem; font-size: .72rem; color: var(--text-soft); }
 .dashboard-tablas :global(.evento-etiqueta) { white-space: nowrap; }
 .dashboard-tablas :global(.confianza-dato) { display: inline-flex; align-items: center; gap: .45rem; white-space: nowrap; font-size: .75rem; font-variant-numeric: tabular-nums; }
 .dashboard-tablas :global(.confianza-barra) { display: inline-block; width: 38px; height: 4px; background: var(--surface-muted); border-radius: 99px; overflow: hidden; }
 .dashboard-tablas :global(.confianza-barra > span) { display: block; height: 100%; border-radius: inherit; }
 @media (max-width: 575.98px) { .zona-fila { grid-template-columns: minmax(0, 1fr); gap: .5rem; } .zona-fila dd { grid-template-columns: minmax(40px, 1fr) 48px auto; } .zona-fila dt, .alertas-dashboard p { font-size: .875rem; } }
 .dashboard-tablas :global(.dt-container), .dashboard-tablas :global(.dt-layout-row), .dashboard-tablas :global(.dt-layout-cell) { margin: 0; padding: 0; }
 .dashboard-tablas :global(table.dataTable) { margin: 0 !important; width: 100% !important; }
</style>
