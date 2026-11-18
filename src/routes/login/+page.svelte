<script>
	import { onDestroy, onMount } from 'svelte';
 import { goto } from '$app/navigation';
 import { page } from '$app/state';
 import Icon from '#lib/components/Icon.svelte';
 import { iniciarSesion } from '#lib/services/api_auth.js';
 let correo = '';
 let contrasena = '';
 let mostrarContrasena = false;
 let ingresando = false;
 let montado = false;
 let mensajeError = '';
 let aviso = '';
 let controlador;
 function destinoSeguro() {
  try {
   const url = new URL(page.url.searchParams.get('redirigir') || '/', window.location.origin);
   if (url.origin !== window.location.origin || url.pathname.startsWith('/login') || url.pathname.startsWith('/api/')) return '/';
   return url.pathname + url.search + url.hash;
  } catch { return '/'; }
 }
 async function ingresar(evento) {
  evento.preventDefault(); if (ingresando) return;
  ingresando = true; mensajeError = ''; aviso = ''; controlador = new AbortController();
  try {
   const sesion = await iniciarSesion(correo.trim(), contrasena, controlador.signal);
   contrasena = '';
   const rutas = sesion.modulos.flatMap(modulo => modulo.rutas);
   let destino = destinoSeguro();
   const camino = new URL(destino, window.location.origin).pathname;
   if (!rutas.some(ruta => ruta === '/' ? camino === '/' : camino === ruta || camino.startsWith(ruta + '/'))) destino = rutas[0] || '/';
   await goto(destino, { replace: true, refreshAll: true });
  } catch (error) {
   if (error.name !== 'AbortError') mensajeError = error instanceof TypeError ? 'No pudimos iniciar sesión. Revisa tu conexión e inténtalo de nuevo.' : error.message;
  } finally { ingresando = false; }
 }
 onMount(() => { montado = true; if (page.url.searchParams.get('motivo') === 'sesion_expirada') aviso = 'Tu sesión ha expirado. Inicia sesión de nuevo.'; });
 onDestroy(() => controlador?.abort());
</script>

<svelte:head>
 <title>Iniciar sesión · LPR Control</title>
</svelte:head>

<div class="acceso">
 <header class="acceso__barra">
  <div class="acceso__marca">
   <Icon name="camera" size={19} stroke={1.7} />
   <span class="acceso__nombre">LPR Control</span>
   <span class="acceso__producto">Gestión vehicular</span>
  </div>
 </header>

 <main class="acceso__contenido">
  <section class="acceso__panel" aria-labelledby="acceso-titulo">
   <header class="acceso__cabecera">
    <h1 id="acceso-titulo">Iniciar sesión</h1>
    <p>Ingrese con su cuenta de trabajo.</p>
   </header>

   {#if mensajeError}
    <div id="acceso-error" class="acceso__error" role="alert">
     <Icon name="alert" size={17} />
     <span>{mensajeError}</span>
    </div>
   {/if}
   {#if aviso}<p class="acceso__aviso" role="status">{aviso}</p>{/if}

   <form class="acceso__formulario" on:submit={ingresar} aria-busy={ingresando || !montado} aria-describedby={mensajeError ? 'acceso-error' : undefined}>
    <div class="acceso__campo">
     <label for="correo">Correo electrónico</label>
     <input id="correo" name="correo" class="form-control" type="email" autocomplete="username" autocapitalize="none" spellcheck="false" bind:value={correo} required disabled={ingresando || !montado} data-campo-api="correo" />
    </div>
    <div class="acceso__campo">
     <label for="contrasena">Contraseña</label>
     <div class="acceso__contrasena">
      <input id="contrasena" class="form-control" type={mostrarContrasena ? 'text' : 'password'} autocomplete="current-password" bind:value={contrasena} required disabled={ingresando || !montado} data-campo-api="contrasena" />
      <button class="acceso__mostrar" type="button" on:click={() => (mostrarContrasena = !mostrarContrasena)} disabled={ingresando || !montado} aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={mostrarContrasena}>
       <Icon name="eye" size={17} />
      </button>
     </div>
    </div>
    <button class="acceso__entrar" type="submit" disabled={ingresando || !montado}>
     {#if ingresando}<span class="spinner-inline" aria-hidden="true"></span>{/if}
     {ingresando ? 'Iniciando sesión...' : 'Ingresar'}
    </button>
   </form>

   <p class="acceso__ayuda">Para solicitar acceso, contacte al administrador.</p>
  </section>
 </main>
</div>

<style>
 .acceso {
  min-height: 100vh;
  min-height: 100svh;
  display: grid;
  grid-template-rows: 56px 1fr;
  background: var(--canvas);
  color: var(--text);
  font-family: var(--font-ui);
 }
 .acceso__barra {
  display: flex;
  align-items: center;
  padding: 0 28px;
  background: var(--ink-950);
  color: #ffffff;
 }
 .acceso__marca { display: flex; align-items: center; gap: 10px; min-width: 0; }
 .acceso__nombre { font-size: 14px; font-weight: 600; letter-spacing: 0; white-space: nowrap; }
 .acceso__producto { margin-left: 10px; padding-left: 20px; border-left: 1px solid var(--ink-600); color: #bec6cc; font-size: 12px; }
 .acceso__contenido { display: flex; align-items: center; justify-content: center; padding: 48px 24px 96px; }
 .acceso__panel { width: 100%; max-width: 400px; padding: 32px; background: var(--surface); border: 1px solid var(--line-strong); border-radius: var(--radius); }
 .acceso__cabecera { margin-bottom: 28px; }
 .acceso__cabecera h1 { margin: 0; font-family: var(--font-ui); font-size: 22px; font-weight: 600; line-height: 1.3; letter-spacing: -0.02em; }
 .acceso__cabecera p { margin-top: 8px; font-size: 13px; line-height: 1.5; color: var(--text-soft); }
 .acceso__formulario { display: grid; gap: 20px; }
 .acceso__campo { display: grid; gap: 8px; }
 .acceso__campo label { font-size: 13px; font-weight: 500; line-height: 1.4; }
 .acceso__campo .form-control { height: 44px; min-width: 0; font-size: 14px; padding: 10px 12px; border-color: var(--line-strong); border-radius: var(--radius-sm); background: var(--surface); color: var(--text); }
 .acceso__campo .form-control:hover:not(:disabled) { border-color: var(--text-soft); }
 .acceso__campo .form-control:focus { border-color: var(--accent-strong); box-shadow: 0 0 0 2px var(--accent-soft); }
 .acceso__campo .form-control:disabled { background: var(--surface-soft); }
 .acceso__contrasena { position: relative; }
 .acceso__contrasena input { padding-right: 48px !important; }
 .acceso__mostrar { position: absolute; right: 1px; top: 1px; bottom: 1px; width: 42px; display: grid; place-items: center; border: 0; border-radius: var(--radius-sm); background: transparent; color: var(--text-soft); }
 .acceso__mostrar:hover:not(:disabled) { color: var(--text); background: var(--surface-soft); }
 .acceso__mostrar:disabled { opacity: 0.55; cursor: default; }
 .acceso__entrar { min-height: 44px; margin-top: 4px; padding: 10px 16px; display: flex; align-items: center; justify-content: center; gap: 10px; border: 1px solid var(--ink-900); border-radius: var(--radius-sm); background: var(--ink-900); color: #fff; font-size: 14px; font-weight: 500; line-height: 1.4; }
 .acceso__entrar:hover:not(:disabled) { background: var(--ink-700); border-color: var(--ink-700); }
 .acceso__entrar:active:not(:disabled) { background: var(--ink-950); }
 .acceso__entrar:disabled { opacity: 0.6; cursor: default; }
 .acceso__ayuda { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line); font-size: 12px; line-height: 1.6; color: var(--text-soft); }
 .acceso__error { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 20px; padding: 12px; border: 1px solid var(--danger); border-radius: var(--radius-sm); background: var(--danger-soft); color: var(--danger-strong); font-size: 13px; line-height: 1.5; overflow-wrap: anywhere; }
 .acceso__error :global(svg) { flex: 0 0 auto; margin-top: 1px; }
 .acceso__aviso { margin-bottom: 20px; padding: 12px; background: var(--surface-soft); border: 1px solid var(--line); border-radius: var(--radius-sm); font-size: 13px; line-height: 1.5; color: var(--text-soft); }
 @media (max-width: 575.98px) {
  .acceso { background: var(--surface); }
  .acceso__barra { padding: 0 20px; }
  .acceso__producto { margin-left: 4px; padding-left: 14px; }
  .acceso__contenido { align-items: flex-start; padding: 48px 24px; }
  .acceso__panel { max-width: 360px; padding: 0; border: 0; border-radius: 0; }
 }
 @media (max-height: 640px) { .acceso__contenido { align-items: flex-start; padding-top: 32px; padding-bottom: 32px; } }
</style>
