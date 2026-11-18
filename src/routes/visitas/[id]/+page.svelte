<script>
 import { onMount } from 'svelte';
 import { page } from '$app/state';
 import { afterNavigate } from '$app/navigation';
 import PageHeader from '#lib/components/PageHeader.svelte';
 import Icon from '#lib/components/Icon.svelte';
 import StatusPill from '#lib/components/StatusPill.svelte';
 import { obtenerVisitaPorId } from '#lib/services/api_visitas.js';

 let visita = null;
 let vehiculo = null;
 let cargando = true;
 let errorCarga = '';
 let montado = false;
 let idCargado = '';
 let solicitudActual = 0;

 afterNavigate(() => {
  if (montado && page.params.id !== idCargado) cargarVisita(page.params.id);
 });

 async function cargarVisita(id = page.params.id) {
  idCargado = id;
  const solicitud = ++solicitudActual;
  cargando = true;
  errorCarga = '';
  visita = null;
  vehiculo = null;
  try {
   if (!/^\d+$/.test(id)) throw new Error('El número de visita no es válido. Vuelve a la lista y selecciona una visita.');
   const datos = await obtenerVisitaPorId(id);
   if (solicitud !== solicitudActual) return;
   if (!datos || datos.id_visita === undefined) throw new Error('No se pudieron cargar los datos. Actualiza la página e inténtalo de nuevo.');
   visita = datos;
   vehiculo = datos.id_vehiculo === null ? null : { placa: datos.placa, marca: datos.marca, modelo: datos.modelo, color: datos.color };
  } catch (error) {
   if (solicitud === solicitudActual) errorCarga = 'No se pudo consultar la visita: ' + error.message;
  } finally {
   if (solicitud === solicitudActual) cargando = false;
  }
 }

 function mostrarFecha(fecha) {
  return fecha ? new Date(fecha).toLocaleString('es-CO') : 'Sin salida registrada';
 }

 function mostrarDuracion() {
  if (!visita?.fecha_salida) return 'En curso';
  const minutos = (new Date(visita.fecha_salida) - new Date(visita.fecha_entrada)) / 60000;
  return Number.isFinite(minutos) && minutos >= 0 ? minutos.toFixed(1) + ' min' : 'No disponible';
 }

 onMount(() => {
  montado = true;
  cargarVisita(page.params.id);
  return () => { montado = false; solicitudActual += 1; };
 });
</script>

<div class="mb-3"><a href="/visitas" class="btn btn-quiet btn-xs"><Icon name="chevron-left" size={13} /> Volver al historial</a></div>
<PageHeader eyebrow="Detalle de visita" title={visita ? 'Visita ' + visita.id_visita : 'Visita'} description="Consulta los datos de la visita y del vehículo.">
 
</PageHeader>

{#if cargando}
 <div class="state-block" role="status"><span class="spinner-inline"></span><p>Cargando visita...</p></div>
{:else if errorCarga}
 <div class="alert-app mb-3" role="alert">{errorCarga}</div>
 <button class="btn btn-quiet" type="button" on:click={() => cargarVisita()}>Reintentar</button>
{:else if visita}
 <section class="panel">
  <div class="panel__head"><h3>Resumen de la estancia</h3><StatusPill tone={visita.estado ? 'ok' : 'neutral'} label={visita.estado ? 'Activa' : 'Inactiva'} /></div>
  <div class="panel__body">
   <dl class="definition-grid">
    <div><dt>ID de visita</dt><dd>{visita.id_visita}</dd></div>
    <div><dt>Entrada</dt><dd>{mostrarFecha(visita.fecha_entrada)}</dd></div>
    <div><dt>Salida</dt><dd>{mostrarFecha(visita.fecha_salida)}</dd></div>
    <div><dt>Duración</dt><dd>{mostrarDuracion()}</dd></div>
    <div><dt>ID de vehículo</dt><dd>{visita.id_vehiculo}</dd></div>
    <div><dt>Placa</dt><dd>{vehiculo?.placa || 'No disponible'}</dd></div>
    <div><dt>Marca / modelo</dt><dd>{vehiculo ? vehiculo.marca + ' / ' + vehiculo.modelo : 'No disponible'}</dd></div>
    <div><dt>Color</dt><dd>{vehiculo?.color || 'No disponible'}</dd></div>
   </dl>
  </div>
 </section>
{/if}
