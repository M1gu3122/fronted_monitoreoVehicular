<script>
	import 'bootstrap/dist/css/bootstrap.min.css';
 import 'sweetalert2/dist/sweetalert2.min.css';
	import { gsap } from 'gsap';

	import { page } from '$app/state';
 import { onMount, tick, untrack } from 'svelte';
 import { goto } from '$app/navigation';
 import { obtenerSesion, cerrarSesion as terminarSesion } from '#lib/services/api_auth.js';
	import favicon from '#lib/assets/favicon.svg';
	import Navbar from '#lib/components/Navbar.svelte';
	import Header from '#lib/components/Header.svelte';

	const navegacion = [
		{
			label: 'Operación',
			items: [
				{ label: 'Dashboard', href: '/', icon: 'dashboard', section: 'Centro de control' },
				{ label: 'Monitoreo vehicular', href: '/monitoreo', icon: 'car', section: 'Operación en vivo' },
				{ label: 'Visitas', href: '/visitas', icon: 'history', section: 'Trazabilidad' },
				{ label: 'Vehículos', href: '/vehiculos', icon: 'car', section: 'Registro maestro' },
				{ label: 'Zonas y ocupación', href: '/zonas', icon: 'zones', section: 'Distribución del área' },
				{ label: 'Cámaras', href: '/camaras', icon: 'camera', section: 'Infraestructura' }
			]
		},
		{
			label: 'Análisis',
			items: [
				{ label: 'Eventos', href: '/eventos', icon: 'events', section: 'Registro de detecciones' },
				{ label: 'Seguimientos', href: '/seguimientos', icon: 'route', section: 'Visión multi-cámara' },
				{ label: 'Alertas', href: '/alertas', icon: 'alert', section: 'Atención requerida' },
				{ label: 'Reportes', href: '/reportes', icon: 'chart', section: 'Análisis histórico' }
			]
		},
		{
			label: 'Sistema',
			items: [
				{ label: 'Administración', href: '/administracion', icon: 'users', section: 'Control de acceso' }
			]
		}
	];

	const elementosNav = navegacion.flatMap((grupo) =>
		grupo.items.map((item) => ({ ...item, grupo: grupo.label }))
	);

	let { children } = $props();
	let menuAbierto = $state(false);
 let pantallaPequena = $state(false);
 let formularioEnviado;
 let ultimoDisparador;
 let controlesRestaurables = [];
 let observadorAccesibilidad;
 let movimientoReducido;
 let movimientoMenu;
 let revisionMenu = 0;
 const superficiesAnimadas = new WeakSet();
 const movimientosActivos = new Map();
 function limpiarMovimientos() {
  for (const contexto of movimientosActivos.values()) contexto.revert();
  movimientosActivos.clear();
 }
 function prepararMovimiento() {
  // Revertir también los tweens de superficies retiradas durante una navegación.
  for (const [nodo, contexto] of movimientosActivos) {
   if (!nodo.isConnected) { contexto.revert(); movimientosActivos.delete(nodo); }
  }
  document.querySelectorAll('main form.panel__body, main .alert-app').forEach(nodo => {
   if (superficiesAnimadas.has(nodo)) return;
   superficiesAnimadas.add(nodo);
   if (movimientoReducido?.matches) return;
   const formulario = nodo.matches('form');
   let contexto;
   contexto = gsap.context(() => {
    gsap.fromTo(nodo, { y: formulario ? 8 : -4, opacity: 0.9 }, {
     y: 0, opacity: 1, duration: formulario ? 0.22 : 0.18, ease: 'power2.out',
     onComplete: () => { contexto.revert(); movimientosActivos.delete(nodo); }
    });
   }, nodo);
   movimientosActivos.set(nodo, contexto);
  });
 }
 function enfocarDisponible(nodo) {
  const campo = nodo.querySelector('input:not([type="hidden"]):not(:disabled), select:not(:disabled), textarea:not(:disabled), button:not(:disabled)');
  if (campo) { campo.focus(); return true; }
  return false;
 }
 function volverAlDisparador() {
  if (document.activeElement?.getAttribute('role') === 'tab') return;
  const original = ultimoDisparador;
  const coincidencia = original?.dataset.accion && original?.dataset.id
   ? [...document.querySelectorAll('main button[data-accion][data-id]')].find(control => control.dataset.accion === original.dataset.accion && control.dataset.id === original.dataset.id)
   : controlesRestaurables.find(control => control.isConnected);
  (original?.isConnected ? original : coincidencia)?.focus();
 }
 async function cerrarMenu() {
  const revision = ++revisionMenu;
  movimientoMenu?.kill();
  const nodo = document.querySelector('#navegacion-principal');
  if (nodo && pantallaPequena && menuAbierto && !movimientoReducido?.matches) {
   await new Promise(resolve => {
    movimientoMenu = gsap.to(nodo, { xPercent: -100, duration: 0.18, ease: 'power2.in', onComplete: resolve, onInterrupt: resolve });
   });
  }
  if (revision !== revisionMenu) return;
  menuAbierto = false;
  await tick();
  if (nodo) gsap.set(nodo, { clearProps: 'transform' });
  document.querySelector('.mobile-menu-btn')?.focus();
 }
 async function abrirMenu() {
  ++revisionMenu;
  movimientoMenu?.kill();
  menuAbierto = true;
  await tick();
  const nodo = document.querySelector('#navegacion-principal');
  if (nodo && pantallaPequena && !movimientoReducido?.matches) {
   movimientoMenu = gsap.fromTo(nodo, { xPercent: -100 }, { xPercent: 0, duration: 0.24, ease: 'power2.out', onComplete: () => gsap.set(nodo, { clearProps: 'transform' }) });
  }
  nodo?.querySelector('a')?.focus();
 }
 function tecladoMenu(evento) {
  if (!pantallaPequena || !menuAbierto) return;
  if (evento.key === 'Escape') { evento.preventDefault(); cerrarMenu(); }
  if (evento.key === 'Tab') {
   const elementos = [...document.querySelectorAll('#navegacion-principal a[href], #navegacion-principal button')].filter(n => !n.disabled);
   const primero = elementos[0], ultimo = elementos.at(-1);
   if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo?.focus(); }
   else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero?.focus(); }
  }
 }
 function asociarDescripcion(campo, id) {
  const ids = new Set((campo.getAttribute('aria-describedby') || '').split(' ').filter(Boolean));
  ids.add(id); campo.setAttribute('aria-describedby', [...ids].join(' '));
 }
 function limpiarErrorCampo(campo) {
  const error = document.getElementById(campo.id + '-error');
  if (error) {
   error.remove();
   const ids = (campo.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== campo.id + '-error');
   if (ids.length) campo.setAttribute('aria-describedby', ids.join(' ')); else campo.removeAttribute('aria-describedby');
  }
  campo.removeAttribute('aria-invalid');
 }
 function mostrarErrorCampo(campo, mensaje) {
  if (!campo?.id) return;
  limpiarErrorCampo(campo);
  const ayuda = document.createElement('span'); ayuda.id = campo.id + '-error'; ayuda.className = 'error-campo'; ayuda.textContent = mensaje;
  campo.insertAdjacentElement('afterend', ayuda); campo.setAttribute('aria-invalid', 'true'); asociarDescripcion(campo, ayuda.id);
 }
 function prepararAccesibilidad() {
  document.querySelectorAll('main .table-wrap').forEach(region => { region.tabIndex = 0; if (region.getAttribute('aria-label') === 'Tabla desplazable') region.setAttribute('aria-label', region.querySelector('table')?.getAttribute('aria-label') || region.querySelector('caption')?.textContent || 'Tabla desplazable'); });
  document.querySelectorAll('main form').forEach(formulario => {
   formulario.dataset.rutaFormulario = window.location.pathname;
   formulario.querySelectorAll('input[id], select[id], textarea[id]').forEach(campo => {
    const contenedor = campo.closest('.mb-3, [class*="col-"], .filter-field, .acceso__campo');
    const ayuda = contenedor?.querySelector('.form-text, small');
    if (ayuda && contenedor.querySelector('input, select, textarea') === campo) {
     if (!ayuda.id) ayuda.id = campo.id + '-ayuda'; asociarDescripcion(campo, ayuda.id);
    }
   });
   const tituloFormulario = formulario.closest('section')?.querySelector('h3')?.textContent || '';
   if (formulario.dataset.tituloAccesible !== tituloFormulario) { delete formulario.dataset.focoPreparado; formulario.dataset.tituloAccesible = tituloFormulario; }
   if (!formulario.dataset.focoPreparado && formulario.classList.contains('panel__body')) {
    requestAnimationFrame(() => { if (formulario.isConnected && enfocarDisponible(formulario)) formulario.dataset.focoPreparado = 'true'; });
   }
  });
  document.querySelectorAll('main table tbody tr').forEach(fila => {
   const identidad = fila.querySelector('td')?.textContent.trim().replace(/\s+/g, ' ');
   if (!identidad) return;
   fila.querySelectorAll('button, a.btn').forEach(control => {
    if (!control.hasAttribute('aria-label') || control.dataset.nombreContextual) { control.dataset.nombreContextual = 'true'; control.setAttribute('aria-label', control.textContent.trim() + ': ' + identidad); }
   });
  });
  prepararMovimiento();
 }

 let usuario = $state(null);
 let modulosPermitidos = $state([]);
 let comprobandoSesion = $state(true);
 let falloSesion = $state('');
 let cerrandoSesion = $state(false);
 let montado = $state(false);
 let controladorSesion;
 let temporizadorSesion;
 let numeroComprobacion = 0;
 async function comprobarSesion(ruta = page.url.pathname, login = esLogin, mostrarCarga = true) {
  const revision = ++numeroComprobacion;
  controladorSesion?.abort(); controladorSesion = new AbortController();
  if (mostrarCarga) comprobandoSesion = true;
  falloSesion = '';
  try {
   const sesion = await obtenerSesion(controladorSesion.signal);
   if (!montado || revision !== numeroComprobacion) return;
   clearTimeout(temporizadorSesion); usuario = sesion?.usuario || null; modulosPermitidos = sesion?.modulos || [];
   if (!sesion) {
    if (!login) await goto('/login?redirigir=' + encodeURIComponent(ruta + page.url.search), { replace: true });
    return;
   }
   temporizadorSesion = setTimeout(expirarSesion, Math.max(0, sesion.expira_en * 1000 - Date.now()));
   if (login) await goto(rutaInicial, { replace: true });
  } catch (error) {
   if (montado && revision === numeroComprobacion && error.name !== 'AbortError') falloSesion = error instanceof TypeError ? 'No pudimos comprobar tu sesión. Revisa tu conexión e inténtalo de nuevo.' : error.message;
  } finally { if (montado && revision === numeroComprobacion) comprobandoSesion = false; }
 }
 function expirarSesion() {
  numeroComprobacion += 1; controladorSesion?.abort(); comprobandoSesion = false;
  terminarSesion(); usuario = null; modulosPermitidos = []; menuAbierto = false; clearTimeout(temporizadorSesion);
  if (!page.url.pathname.startsWith('/login')) goto('/login?motivo=sesion_expirada', { replace: true });
 }
 async function salir() {
  if (cerrandoSesion) return;
  cerrandoSesion = true; falloSesion = '';
  try {
   numeroComprobacion += 1; controladorSesion?.abort();
   terminarSesion(); usuario = null; modulosPermitidos = []; menuAbierto = false; clearTimeout(temporizadorSesion);
   await goto('/login', { replace: true, refreshAll: true });
  } catch (error) { falloSesion = 'No se pudo cerrar la sesión: ' + error.message; }
  finally { cerrandoSesion = false; }
 }
 onMount(() => {
  montado = true;
  movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)');
  const cambiarMovimiento = () => {
   if (!movimientoReducido.matches) return;
   limpiarMovimientos(); movimientoMenu?.kill();
   const nodo = document.querySelector('#navegacion-principal');
   if (nodo) gsap.set(nodo, { clearProps: 'transform' });
  };
  movimientoReducido.addEventListener('change', cambiarMovimiento);
  const media = window.matchMedia('(max-width: 991.98px)');
  const cambiarPantalla = () => {
   pantallaPequena = media.matches;
   if (!media.matches) {
    ++revisionMenu; movimientoMenu?.kill(); menuAbierto = false;
    const nodo = document.querySelector('#navegacion-principal');
    if (nodo) gsap.set(nodo, { clearProps: 'transform' });
   }
  };
  cambiarPantalla(); media.addEventListener('change', cambiarPantalla);
  const recordarControl = evento => {
   const control = evento.target.closest('button, a');
   if (control && !control.closest('form, dialog, .swal2-container')) {
    ultimoDisparador = control;
    const nombre = control.getAttribute('aria-label') || control.textContent.trim();
    controlesRestaurables = [...document.querySelectorAll('main button, main a')].filter(n => (n.getAttribute('aria-label') || n.textContent.trim()) === nombre);
   }
  };
  const enviarFormulario = evento => { formularioEnviado = evento.target; formularioEnviado.querySelectorAll('[aria-invalid="true"]').forEach(limpiarErrorCampo); };
  const invalidarCampo = evento => mostrarErrorCampo(evento.target, evento.target.validationMessage);
  const editarCampo = evento => { if (evento.target.matches('input,select,textarea')) limpiarErrorCampo(evento.target); };
  const erroresAPI = evento => {
   if (!formularioEnviado?.isConnected) return;
   let primero;
   for (const error of evento.detail || []) {
    const nombre = error.loc?.at(-1);
    const campo = [...formularioEnviado.querySelectorAll('[data-campo-api]')].find(n => n.dataset.campoApi === nombre);
    if (campo) { mostrarErrorCampo(campo, error.msg || 'Revisa este campo.'); primero ||= campo; }
   }
   requestAnimationFrame(() => { if (primero?.isConnected) primero.focus(); });
  };
  let pendiente;
  observadorAccesibilidad = new MutationObserver(registros => {
   if (registros.some(r => [...r.removedNodes].some(n => n.nodeType === 1 && ((n.matches?.('form.panel__body') && n.dataset.rutaFormulario === window.location.pathname) || [...(n.querySelectorAll?.('form.panel__body') || [])].some(f => f.dataset.rutaFormulario === window.location.pathname))))) requestAnimationFrame(volverAlDisparador);
   cancelAnimationFrame(pendiente); pendiente = requestAnimationFrame(prepararAccesibilidad);
  });
  observadorAccesibilidad.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] }); prepararAccesibilidad();
  document.addEventListener('click', recordarControl, true);
  document.addEventListener('submit', enviarFormulario, true);
  document.addEventListener('invalid', invalidarCampo, true);
  document.addEventListener('input', editarCampo, true);
  document.addEventListener('change', editarCampo, true);
  document.addEventListener('keydown', tecladoMenu);
  window.addEventListener('lpr:errores-validacion', erroresAPI);
  const revisar = () => { if (!cerrandoSesion) comprobarSesion(page.url.pathname, esLogin, false); };
  window.addEventListener('focus', revisar);
  window.addEventListener('lpr:sesion-expirada', expirarSesion);
  window.addEventListener('lpr:permisos-cambiados', revisar);
  return () => { ++revisionMenu; movimientoMenu?.kill(); limpiarMovimientos(); movimientoReducido.removeEventListener('change', cambiarMovimiento); observadorAccesibilidad?.disconnect(); cancelAnimationFrame(pendiente); media.removeEventListener('change', cambiarPantalla); document.removeEventListener('click', recordarControl, true); document.removeEventListener('submit', enviarFormulario, true); document.removeEventListener('invalid', invalidarCampo, true); document.removeEventListener('input', editarCampo, true); document.removeEventListener('change', editarCampo, true); document.removeEventListener('keydown', tecladoMenu); window.removeEventListener('lpr:errores-validacion', erroresAPI); montado = false; numeroComprobacion += 1; controladorSesion?.abort(); clearTimeout(temporizadorSesion); window.removeEventListener('focus', revisar); window.removeEventListener('lpr:sesion-expirada', expirarSesion); window.removeEventListener('lpr:permisos-cambiados', revisar); };
 });
 $effect(() => {
  const ruta = page.url.pathname;
  const login = esLogin;
  if (montado) {
   // La primera validación bloquea el acceso; las siguientes conservan la pantalla.
   untrack(() => comprobarSesion(ruta, login, !usuario));
  }
 });

 const rutasPermitidas = $derived(modulosPermitidos.flatMap(modulo => modulo.rutas));
 const navegacionPermitida = $derived(navegacion.map(grupo => ({ ...grupo, items: grupo.items.filter(item => rutasPermitidas.includes(item.href)) })).filter(grupo => grupo.items.length));
 const rutaInicial = $derived(elementosNav.find(item => rutasPermitidas.includes(item.href))?.href || '/');
 const rutaActual = $derived(page.url.pathname);
 const accesoPermitido = $derived(rutasPermitidas.some(ruta => ruta === '/' ? rutaActual === '/' : rutaActual === ruta || rutaActual.startsWith(ruta + '/')));
	const esLogin = $derived(rutaActual === '/login' || rutaActual.startsWith('/login/'));

	const actual = $derived.by(() => {
		if (!rutaActual || rutaActual === '/') return elementosNav[0];

		const coincidencia = elementosNav
			.filter((item) => item.href !== '/' && rutaActual.startsWith(item.href))
			.sort((a, b) => b.href.length - a.href.length)[0];

		return coincidencia || elementosNav[0];
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link
		href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
	{#if !esLogin}
		<title>{`${actual.label} · LPR Control`}</title>
	{/if}
</svelte:head>

{#if esLogin}
 {@render children()}
{:else if comprobandoSesion || !usuario}
 <div class="state-block" role="status">
  {#if falloSesion}<div class="alert-app m-3" role="alert">{falloSesion}</div><button class="btn btn-quiet" type="button" onclick={() => comprobarSesion()}>Reintentar</button>
  {:else}<span class="spinner-inline"></span><p>Comprobando sesión...</p>{/if}
 </div>
{:else}
	<div class="app-shell" class:solo-consulta={usuario?.solo_lectura === true}>
		<Navbar grupos={navegacionPermitida} path={rutaActual} open={menuAbierto} movil={pantallaPequena} oncerrar={cerrarMenu} inicio={rutaInicial} />

		{#if menuAbierto}
			<button
				class="sidebar-scrim"
				type="button"
				aria-label="Cerrar navegación"
				onclick={cerrarMenu}
			></button>
		{/if}

		<div class="app-main" inert={pantallaPequena && menuAbierto}>
			<Header seccion={actual.section} titulo={actual.label} onmenu={abrirMenu} menuAbierto={menuAbierto} {usuario} onsalir={salir} saliendo={cerrandoSesion} />
			<a class="saltar-contenido" href="#contenido-principal">Saltar al contenido principal</a>
			<main id="contenido-principal" tabindex="-1" class="app-content">
    {#if falloSesion}<div class="alert-app mb-3" role="alert">{falloSesion}</div>{/if}
    {#if accesoPermitido}
     {@render children()}
    {:else}
     <section class="panel"><div class="panel__body">
      <h2>{rutasPermitidas.length ? 'Acceso restringido' : 'Sin módulos asignados'}</h2>
      <p class="mt-2">{rutasPermitidas.length ? 'Tu rol no tiene habilitado este módulo.' : 'Tu rol no tiene módulos activos. Contacta al administrador para solicitar acceso.'}</p>
      {#if rutasPermitidas.length}<a class="btn btn-quiet mt-3" href={rutaInicial}>Ir a un módulo autorizado</a>
      {:else}<button class="btn btn-quiet mt-3" type="button" onclick={salir} disabled={cerrandoSesion}>Cerrar sesión</button>{/if}
     </div></section>
    {/if}
			</main>
		</div>
	</div>
{/if}

<style>
	:global(:root) {
	--ink-950: #111518;
	--ink-900: #171c21;
	--ink-850: #1c2228;
	--ink-800: #232a31;
	--ink-700: #303941;
	--ink-600: #46515a;

	--canvas: #f2f3f0;
	--canvas-strong: #e9ebe6;
	--surface: #ffffff;
	--surface-soft: #f8f9f6;
	--surface-muted: #f1f2ef;

	--line: #e1e4de;
	--line-strong: #818c85;
	--text: #1b2126;
	--text-soft: #5a646b;
	--text-faint: #606b72;

	--accent: #a95020;
	--accent-strong: #a64f1c;
	--accent-soft: #fbede2;
	--accent-line: #ecc7ae;

	--ok: #2e7457;
	--ok-strong: #235c45;
	--ok-soft: #e7f2eb;
	--warn: #a97917;
	--warn-strong: #835d0f;
	--warn-soft: #faf1db;
	--danger: #a93f39;
	--danger-strong: #86302b;
	--danger-soft: #f9eae8;
	--info: #356b87;
	--info-strong: #29546a;
	--info-soft: #e8f0f4;

	--radius: 6px;
	--radius-sm: 4px;
	--radius-lg: 10px;
	--shadow-sm: 0 1px 2px rgba(17, 21, 24, 0.05);
	--shadow-pop: 0 18px 44px rgba(17, 21, 24, 0.18);

	--font-ui: 'IBM Plex Sans', 'Segoe UI', system-ui, -apple-system, sans-serif;
	--font-display: 'Barlow Condensed', 'Bahnschrift', 'Arial Narrow', sans-serif;

	--sidebar-width: 252px;
	--topbar-height: 62px;

	--bs-body-font-family: var(--font-ui);
	--bs-body-color: var(--text);
	--bs-body-bg: var(--canvas);
	--bs-border-color: var(--line);
	--bs-link-color: var(--accent-strong);
	--bs-link-hover-color: var(--accent);
}:global(*) {
	box-sizing: border-box;
}:global(html) {
	-webkit-text-size-adjust: 100%;
}:global(body) {
	margin: 0;
	background: var(--canvas);
	color: var(--text);
	font-family: var(--font-ui);
	font-size: 0.9rem;
	line-height: 1.5;
	-webkit-font-smoothing: antialiased;
}:global(::selection) {
	background: var(--accent-soft);
	color: var(--accent-strong);
}:global(:focus-visible) {
	outline: 2px solid var(--accent);
	outline-offset: 2px;
}:global(h1), :global(h2), :global(h3), :global(h4), :global(h5), :global(h6) {
	margin: 0;
	font-family: var(--font-display);
	font-weight: 600;
	letter-spacing: 0.01em;
	color: var(--ink-950);
}:global(p) {
	margin: 0;
}:global(a) {
	color: var(--accent-strong);
	text-decoration-thickness: 1px;
	text-underline-offset: 2px;
}:global(a:hover) {
	color: var(--accent);
}:global(code), :global(kbd), :global(.mono) {
	font-family: 'Cascadia Mono', 'Consolas', monospace;
	font-size: 0.82em;
}:global(.app-shell) {
	min-height: 100vh;
	display: flex;
	background: var(--canvas);
}:global(.app-sidebar) {
	position: fixed;
	inset: 0 auto 0 0;
	z-index: 1045;
	width: var(--sidebar-width);
	display: flex;
	flex-direction: column;
	background: var(--ink-950);
	color: #dfe3e0;
	border-right: 1px solid #0c0f11;
	transition: transform 0.22s ease;
}:global(.app-sidebar__brand) {
	display: flex;
	align-items: center;
	gap: 0.7rem;
	height: var(--topbar-height);
	padding: 0 1.15rem;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	flex: 0 0 auto;
}:global(.brand-mark) {
	width: 34px;
	height: 34px;
	display: grid;
	place-items: center;
	border: 1px solid var(--accent);
	color: var(--accent);
	border-radius: var(--radius-sm);
	flex: 0 0 auto;
}:global(.brand-copy) {
	min-width: 0;
}:global(.brand-copy strong) {
	display: block;
	font-family: var(--font-display);
	font-size: 1.18rem;
	line-height: 1;
	letter-spacing: 0.06em;
	color: #fff;
	font-weight: 600;
}:global(.brand-copy span) {
	display: block;
	margin-top: 0.2rem;
	font-size: 0.66rem;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: #8d969b;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}:global(.app-sidebar__scroll) {
	flex: 1 1 auto;
	overflow-y: auto;
	padding: 0.9rem 0.7rem 1.2rem;
	scrollbar-width: thin;
	scrollbar-color: #39424a transparent;
}:global(.nav-section) {
	margin-top: 1.1rem;
}:global(.nav-section:first-child) {
	margin-top: 0.2rem;
}:global(.nav-section__title) {
	padding: 0 0.6rem 0.45rem;
	font-size: 0.63rem;
	font-weight: 600;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: #949ea4;
}:global(.nav-link-app) {
	position: relative;
	display: flex;
	align-items: center;
	gap: 0.65rem;
	padding: 0.52rem 0.6rem;
	margin-bottom: 0.12rem;
	border-radius: var(--radius-sm);
	color: #b9c2c5;
	font-size: 0.845rem;
	font-weight: 500;
	text-decoration: none;
	line-height: 1.2;
	transition:
		background-color 0.15s ease,
		color 0.15s ease;
}:global(.nav-link-app svg) {
	flex: 0 0 auto;
	color: #77838a;
	transition: color 0.15s ease;
}:global(.nav-link-app:hover) {
	background: rgba(255, 255, 255, 0.055);
	color: #fff;
}:global(.nav-link-app:hover svg) {
	color: #c8d0d2;
}:global(.nav-link-app.active) {
	background: #232a31;
	color: #fff;
	box-shadow: inset 2px 0 0 var(--accent);
}:global(.nav-link-app.active svg) {
	color: var(--accent);
}:global(.nav-link-app__count) {
	margin-left: auto;
	min-width: 1.35rem;
	padding: 0.05rem 0.34rem;
	border-radius: 999px;
	background: var(--accent);
	color: #fff;
	font-size: 0.66rem;
	font-weight: 600;
	text-align: center;
	line-height: 1.25rem;
}:global(.app-sidebar__foot) {
	flex: 0 0 auto;
	padding: 0.85rem 1rem;
	border-top: 1px solid rgba(255, 255, 255, 0.08);
	font-size: 0.7rem;
	color: #7d878d;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}:global(.app-sidebar__foot .dot) {
	width: 7px;
	height: 7px;
	border-radius: 50%;
	background: var(--ok);
	box-shadow: 0 0 0 3px rgba(46, 116, 87, 0.18);
	flex: 0 0 auto;
}:global(.app-sidebar__foot.is-offline .dot) {
	background: var(--danger);
	box-shadow: 0 0 0 3px rgba(169, 63, 57, 0.18);
}:global(.app-main) {
	flex: 1 1 auto;
	min-width: 0;
	margin-left: var(--sidebar-width);
	display: flex;
	flex-direction: column;
	min-height: 100vh;
}:global(.app-topbar) {
	position: sticky;
	top: 0;
	z-index: 1030;
	height: var(--topbar-height);
	display: flex;
	align-items: center;
	gap: 0.9rem;
	padding: 0 1.4rem;
	background: rgba(242, 243, 240, 0.94);
	backdrop-filter: blur(8px);
	border-bottom: 1px solid var(--line);
}:global(.app-topbar__title) {
	min-width: 0;
}:global(.app-topbar__title .eyebrow) {
	font-size: 0.62rem;
	font-weight: 600;
	letter-spacing: 0.12em;
	text-transform: uppercase;
	color: var(--text-faint);
}:global(.app-topbar__title h1) {
	font-size: 1.15rem;
	line-height: 1.1;
	margin-top: 0.12rem;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}:global(.app-topbar__tools) {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: 0.5rem;
}:global(.topbar-status) {
	display: inline-flex;
	align-items: center;
	gap: 0.42rem;
	padding: 0.28rem 0.55rem;
	border: 1px solid var(--line);
	border-radius: 999px;
	background: var(--surface);
	font-size: 0.7rem;
	color: var(--text-soft);
	white-space: nowrap;
}:global(.topbar-status .dot) {
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--ok);
}:global(.topbar-status.is-offline .dot) {
	background: var(--danger);
}:global(.topbar-status.is-guest .dot) {
	background: var(--warn);
}:global(.user-chip) {
	display: inline-flex;
	align-items: center;
	gap: 0.55rem;
	padding: 0.25rem 0.55rem 0.25rem 0.3rem;
	border: 1px solid var(--line);
	border-radius: 999px;
	background: var(--surface);
	color: var(--text);
	font-size: 0.78rem;
	line-height: 1.1;
	white-space: nowrap;
}:global(.user-chip__avatar) {
	width: 28px;
	height: 28px;
	border-radius: 50%;
	display: grid;
	place-items: center;
	background: var(--ink-800);
	color: #fff;
	font-family: var(--font-display);
	font-size: 0.8rem;
	letter-spacing: 0.04em;
}:global(.user-chip__meta) {
	min-width: 0;
}:global(.user-chip__meta strong) {
	display: block;
	font-weight: 600;
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
}:global(.user-chip__meta span) {
	display: block;
	font-size: 0.66rem;
	color: var(--text-faint);
	text-transform: capitalize;
}:global(.app-content) {
	width: 100%;
	max-width: 1500px;
	margin: 0 auto;
	padding: 1.35rem 1.4rem 2.6rem;
	flex: 1 1 auto;
}:global(.mobile-menu-btn) {
	display: none;
}:global(.sidebar-scrim) {
	display: none;
}@media (max-width: 991.98px) {:global(.app-sidebar) {
		transform: translateX(-100%);
		box-shadow: var(--shadow-pop);
	}:global(.app-sidebar.open) {
		transform: translateX(0);
	}:global(.app-main) {
		margin-left: 0;
	}:global(.mobile-menu-btn) {
		display: inline-flex;
	}:global(.sidebar-scrim) {
		display: block;
		position: fixed;
		inset: 0;
		background: rgba(11, 14, 16, 0.5);
		z-index: 1040;
		border: 0;
		padding: 0;
	}:global(.app-content) {
		padding: 1rem 0.85rem 2.2rem;
	}:global(.app-topbar) {
		padding: 0 0.85rem;
	}:global(.user-chip__meta) {
		display: none;
	}
}@media (max-width: 575.98px) {:global(.topbar-status) {
		display: none;
	}:global(.app-topbar__title h1) {
		font-size: 1rem;
	}
}:global(.page-header) {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 1rem;
	margin-bottom: 1.15rem;
}:global(.page-header__copy) {
	min-width: 0;
}:global(.page-header .eyebrow) {
	display: flex;
	align-items: center;
	gap: 0.45rem;
	font-size: 0.64rem;
	font-weight: 600;
	letter-spacing: 0.13em;
	text-transform: uppercase;
	color: var(--accent-strong);
	margin-bottom: 0.28rem;
}:global(.page-header .eyebrow::before) {
	content: '';
	width: 16px;
	height: 2px;
	background: var(--accent);
	display: inline-block;
}:global(.page-header h2) {
	font-size: clamp(1.5rem, 2.2vw, 1.95rem);
	line-height: 1.05;
}:global(.page-header p) {
	margin-top: 0.35rem;
	color: var(--text-soft);
	max-width: 78ch;
	font-size: 0.84rem;
}:global(.page-header__actions) {
	display: flex;
	align-items: center;
	gap: 0.45rem;
	flex-wrap: wrap;
	justify-content: flex-end;
	flex: 0 0 auto;
}@media (max-width: 767.98px) {:global(.page-header) {
		align-items: flex-start;
		flex-direction: column;
	}:global(.page-header__actions) {
		justify-content: flex-start;
	}
}:global(.panel) {
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--radius);
}:global(.panel--flush) {
	overflow: hidden;
}:global(.panel__head) {
	display: flex;
	align-items: center;
	gap: 0.8rem;
	padding: 0.85rem 1rem;
	border-bottom: 1px solid var(--line);
}:global(.panel__head h3) {
	font-size: 1.02rem;
	line-height: 1.15;
}:global(.panel__head p) {
	margin-top: 0.16rem;
	font-size: 0.75rem;
	color: var(--text-soft);
}:global(.panel__head-tools) {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: 0.4rem;
}:global(.panel__body) {
	padding: 1rem;
}:global(.panel__body--flush) {
	padding: 0;
}:global(.panel__foot) {
	padding: 0.65rem 1rem;
	border-top: 1px solid var(--line);
	background: var(--surface-soft);
	font-size: 0.75rem;
	color: var(--text-soft);
}:global(.panel-note) {
	display: flex;
	gap: 0.55rem;
	align-items: flex-start;
	padding: 0.7rem 0.85rem;
	background: var(--surface-soft);
	border: 1px solid var(--line);
	border-radius: var(--radius-sm);
	color: var(--text-soft);
	font-size: 0.76rem;
	line-height: 1.45;
}:global(.panel-note svg) {
	flex: 0 0 auto;
	margin-top: 1px;
	color: var(--text-faint);
}:global(.section-title) {
	display: flex;
	align-items: baseline;
	gap: 0.55rem;
	margin: 1.45rem 0 0.7rem;
}:global(.section-title h3) {
	font-size: 1.08rem;
}:global(.section-title span) {
	font-size: 0.72rem;
	color: var(--text-faint);
}:global(.stat-grid) {
	display: grid;
	grid-template-columns: repeat(12, 1fr);
	gap: 0.7rem;
}:global(.stat-card) {
	position: relative;
	grid-column: span 3;
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--radius);
	padding: 0.85rem 0.95rem 0.8rem;
	min-height: 118px;
	display: flex;
	flex-direction: column;
	text-decoration: none;
	color: inherit;
	transition:
		border-color 0.15s ease,
		background-color 0.15s ease;
}:global(a.stat-card:hover) {
	border-color: var(--line-strong);
	background: var(--surface-soft);
	color: inherit;
}:global(.stat-card__top) {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	color: var(--text-soft);
	font-size: 0.71rem;
	font-weight: 500;
	letter-spacing: 0.02em;
}:global(.stat-card__icon) {
	width: 26px;
	height: 26px;
	display: grid;
	place-items: center;
	border-radius: var(--radius-sm);
	background: var(--surface-muted);
	color: var(--ink-700);
	flex: 0 0 auto;
}:global(.stat-card__value) {
	margin-top: auto;
	padding-top: 0.65rem;
	font-family: var(--font-display);
	font-size: 2.05rem;
	font-weight: 600;
	line-height: 0.95;
	letter-spacing: 0.01em;
	color: var(--ink-950);
	font-variant-numeric: tabular-nums;
}:global(.stat-card__value small) {
	font-family: var(--font-ui);
	font-size: 0.72rem;
	font-weight: 500;
	color: var(--text-faint);
	letter-spacing: 0;
	margin-left: 0.25rem;
}:global(.stat-card__foot) {
	margin-top: 0.4rem;
	font-size: 0.72rem;
	color: var(--text-soft);
	display: flex;
	align-items: center;
	gap: 0.35rem;
}:global(.stat-card--accent .stat-card__icon) {
	background: var(--accent-soft);
	color: var(--accent-strong);
}:global(.stat-card--warn .stat-card__icon) {
	background: var(--warn-soft);
	color: var(--warn-strong);
}:global(.stat-card--danger .stat-card__icon) {
	background: var(--danger-soft);
	color: var(--danger-strong);
}:global(.stat-card--ok .stat-card__icon) {
	background: var(--ok-soft);
	color: var(--ok-strong);
}:global(.stat-card--info .stat-card__icon) {
	background: var(--info-soft);
	color: var(--info-strong);
}@media (max-width: 1199.98px) {:global(.stat-card) {
		grid-column: span 4;
	}
}@media (max-width: 767.98px) {:global(.stat-card) {
		grid-column: span 6;
	}
}@media (max-width: 479.98px) {:global(.stat-card) {
		grid-column: span 12;
	}
}:global(.btn) {
	font-family: var(--font-ui);
	font-size: 0.8rem;
	font-weight: 500;
	border-radius: var(--radius-sm);
	padding: 0.4rem 0.75rem;
	line-height: 1.35;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.4rem;
}:global(.btn svg) {
	flex: 0 0 auto;
}:global(.btn-accent) {
	--bs-btn-color: #fff;
	--bs-btn-bg: var(--accent);
	--bs-btn-border-color: var(--accent);
	--bs-btn-hover-color: #fff;
	--bs-btn-hover-bg: var(--accent-strong);
	--bs-btn-hover-border-color: var(--accent-strong);
	--bs-btn-active-color: #fff;
	--bs-btn-active-bg: var(--accent-strong);
	--bs-btn-active-border-color: var(--accent-strong);
	--bs-btn-disabled-color: #fff;
	--bs-btn-disabled-bg: #d7a98f;
	--bs-btn-disabled-border-color: #d7a98f;
	border-width: 1px;
}:global(.btn-ink) {
	--bs-btn-color: #fff;
	--bs-btn-bg: var(--ink-850);
	--bs-btn-border-color: var(--ink-850);
	--bs-btn-hover-color: #fff;
	--bs-btn-hover-bg: var(--ink-700);
	--bs-btn-hover-border-color: var(--ink-700);
	--bs-btn-active-color: #fff;
	--bs-btn-active-bg: var(--ink-900);
	--bs-btn-active-border-color: var(--ink-900);
	--bs-btn-disabled-color: #fff;
	--bs-btn-disabled-bg: #6f787e;
	--bs-btn-disabled-border-color: #6f787e;
	border-width: 1px;
}:global(.btn-quiet) {
	--bs-btn-color: var(--text-soft);
	--bs-btn-bg: var(--surface);
	--bs-btn-border-color: var(--line);
	--bs-btn-hover-color: var(--text);
	--bs-btn-hover-bg: var(--surface-soft);
	--bs-btn-hover-border-color: var(--line-strong);
	--bs-btn-active-color: var(--text);
	--bs-btn-active-bg: var(--surface-muted);
	--bs-btn-active-border-color: var(--line-strong);
	border-width: 1px;
}:global(.btn-quiet-danger) {
	--bs-btn-color: var(--danger-strong);
	--bs-btn-bg: var(--surface);
	--bs-btn-border-color: var(--line);
	--bs-btn-hover-color: #fff;
	--bs-btn-hover-bg: var(--danger);
	--bs-btn-hover-border-color: var(--danger);
	--bs-btn-active-color: #fff;
	--bs-btn-active-bg: var(--danger-strong);
	--bs-btn-active-border-color: var(--danger-strong);
	border-width: 1px;
}:global(.btn-icon) {
	width: 32px;
	height: 32px;
	padding: 0;
	display: inline-grid;
	place-items: center;
}:global(.btn-xs) {
	font-size: 0.72rem;
	padding: 0.24rem 0.5rem;
}:global(.btn:focus-visible) {
	box-shadow: 0 0 0 3px rgba(200, 103, 44, 0.22);
}:global(.form-label) {
	font-size: 0.73rem;
	font-weight: 600;
	color: var(--text-soft);
	margin-bottom: 0.28rem;
	letter-spacing: 0.01em;
}:global(.form-control), :global(.form-select) {
	font-size: 0.82rem;
	border-radius: var(--radius-sm);
	border-color: var(--line-strong);
	background-color: var(--surface);
	color: var(--text);
	padding: 0.44rem 0.6rem;
	min-height: 36px;
}:global(.form-control::placeholder) {
	color: #68747b;
}:global(.form-control:focus), :global(.form-select:focus) {
	border-color: var(--accent);
	box-shadow: 0 0 0 3px rgba(200, 103, 44, 0.14);
	background-color: var(--surface);
}:global(.form-control-sm), :global(.form-select-sm) {
	font-size: 0.78rem;
	min-height: 32px;
	padding: 0.28rem 0.5rem;
}:global(.form-text) {
	font-size: 0.7rem;
	color: var(--text-faint);
}:global(.form-check-input:checked) {
	background-color: var(--accent);
	border-color: var(--accent);
}:global(.form-check-input:focus) {
	border-color: var(--accent);
	box-shadow: 0 0 0 3px rgba(200, 103, 44, 0.14);
}:global(.form-check-label) {
	font-size: 0.8rem;
}:global(.input-group-text) {
	font-size: 0.78rem;
	background: var(--surface-muted);
	border-color: var(--line-strong);
	color: var(--text-soft);
	border-radius: var(--radius-sm);
}:global(.invalid-feedback) {
	font-size: 0.7rem;
}:global(.filter-bar) {
	display: flex;
	align-items: flex-end;
	gap: 0.55rem;
	flex-wrap: wrap;
	padding: 0.7rem 0.9rem;
	border-bottom: 1px solid var(--line);
	background: var(--surface-soft);
}:global(.filter-field) {
	display: flex;
	flex-direction: column;
	min-width: 0;
}:global(.filter-field--grow) {
	flex: 1 1 190px;
}:global(.filter-field--sm) {
	flex: 0 1 130px;
}:global(.filter-field--md) {
	flex: 0 1 170px;
}:global(.filter-field label) {
	font-size: 0.66rem;
	font-weight: 600;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--text-faint);
	margin-bottom: 0.22rem;
}:global(.filter-bar__end) {
	margin-left: auto;
	display: flex;
	align-items: center;
	gap: 0.35rem;
}:global(.filter-count) {
	font-size: 0.71rem;
	color: var(--text-faint);
	padding: 0.3rem 0;
}:global(.table-wrap) {
	overflow-x: auto;
}:global(.data-table) {
	width: 100%;
	margin: 0;
	font-size: 0.8rem;
	border-collapse: separate;
	border-spacing: 0;
	color: var(--text);
}:global(.data-table thead th) {
	position: sticky;
	top: 0;
	z-index: 1;
	padding: 0.55rem 0.7rem;
	background: var(--surface-soft);
	border-bottom: 1px solid var(--line);
	color: var(--text-faint);
	font-size: 0.65rem;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	white-space: nowrap;
	text-align: left;
}:global(.data-table tbody td) {
	padding: 0.6rem 0.7rem;
	border-bottom: 1px solid var(--line);
	vertical-align: middle;
}:global(.data-table tbody tr:last-child td) {
	border-bottom: 0;
}:global(.data-table tbody tr:hover td) {
	background: #fbfbf9;
}:global(.data-table tbody tr.is-clickable) {
	cursor: pointer;
}:global(.data-table .num) {
	text-align: right;
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}:global(.data-table .nowrap) {
	white-space: nowrap;
}:global(.data-table .cell-strong) {
	font-weight: 600;
	color: var(--ink-950);
}:global(.data-table .cell-sub) {
	display: block;
	font-size: 0.7rem;
	color: var(--text-faint);
	margin-top: 0.1rem;
}:global(.table-empty) {
	padding: 2.2rem 1rem;
	text-align: center;
	color: var(--text-soft);
}:global(.table-empty strong) {
	display: block;
	font-family: var(--font-display);
	font-size: 1.1rem;
	color: var(--text);
	margin-bottom: 0.25rem;
}:global(.table-foot) {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.7rem;
	padding: 0.6rem 0.9rem;
	border-top: 1px solid var(--line);
	font-size: 0.73rem;
	color: var(--text-soft);
	flex-wrap: wrap;
}:global(.plate) {
	display: inline-flex;
	align-items: center;
	padding: 0.12rem 0.36rem;
	border: 1px solid var(--line-strong);
	border-radius: 3px;
	background: var(--surface-soft);
	font-family: 'Cascadia Mono', 'Consolas', monospace;
	font-size: 0.76rem;
	font-weight: 600;
	letter-spacing: 0.06em;
	color: var(--ink-900);
	white-space: nowrap;
}:global(.plate--pending) {
	font-family: var(--font-ui);
	font-weight: 500;
	letter-spacing: 0;
	color: var(--text-faint);
	border-style: dashed;
	background: transparent;
}:global(.pill) {
	display: inline-flex;
	align-items: center;
	gap: 0.32rem;
	padding: 0.15rem 0.45rem;
	border-radius: 999px;
	font-size: 0.68rem;
	font-weight: 600;
	line-height: 1.45;
	white-space: nowrap;
	border: 1px solid transparent;
}:global(.pill .dot) {
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: currentColor;
	flex: 0 0 auto;
}:global(.pill--ok) {
	color: var(--ok-strong);
	background: var(--ok-soft);
	border-color: #c6dfd2;
}:global(.pill--warn) {
	color: var(--warn-strong);
	background: var(--warn-soft);
	border-color: #ebd9ae;
}:global(.pill--danger) {
	color: var(--danger-strong);
	background: var(--danger-soft);
	border-color: #efcac6;
}:global(.pill--info) {
	color: var(--info-strong);
	background: var(--info-soft);
	border-color: #c8dce7;
}:global(.pill--neutral) {
	color: var(--text-soft);
	background: var(--surface-muted);
	border-color: var(--line);
}:global(.pill--accent) {
	color: var(--accent-strong);
	background: var(--accent-soft);
	border-color: var(--accent-line);
}:global(.pill--outline) {
	color: var(--text-soft);
	background: transparent;
	border-color: var(--line-strong);
}:global(.badge-soft) {
	font-weight: 500;
	font-size: 0.68rem;
	padding: 0.2rem 0.45rem;
	border-radius: var(--radius-sm);
}:global(.confidence) {
	display: inline-flex;
	align-items: center;
	gap: 0.4rem;
	font-variant-numeric: tabular-nums;
	font-size: 0.75rem;
	white-space: nowrap;
}:global(.confidence__bar) {
	width: 42px;
	height: 4px;
	border-radius: 999px;
	background: var(--surface-muted);
	overflow: hidden;
}:global(.confidence__bar span) {
	display: block;
	height: 100%;
	background: var(--ok);
	border-radius: inherit;
}:global(.confidence.low .confidence__bar span) {
	background: var(--danger);
}:global(.confidence.mid .confidence__bar span) {
	background: var(--warn);
}:global(.state-block) {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	padding: 3rem 1.2rem;
	color: var(--text-soft);
}:global(.state-block__icon) {
	width: 46px;
	height: 46px;
	display: grid;
	place-items: center;
	border-radius: 50%;
	background: var(--surface-muted);
	color: var(--text-faint);
	margin-bottom: 0.8rem;
}:global(.state-block h4) {
	font-size: 1.15rem;
	margin-bottom: 0.28rem;
}:global(.state-block p) {
	font-size: 0.8rem;
	max-width: 52ch;
}:global(.state-block .btn) {
	margin-top: 0.9rem;
}:global(.state-block--danger .state-block__icon) {
	background: var(--danger-soft);
	color: var(--danger-strong);
}:global(.state-block--warn .state-block__icon) {
	background: var(--warn-soft);
	color: var(--warn-strong);
}:global(.skeleton) {
	position: relative;
	overflow: hidden;
	background: var(--surface-muted);
	border-radius: var(--radius-sm);
}:global(.skeleton::after) {
	content: '';
	position: absolute;
	inset: 0;
	background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.6), transparent);
	transform: translateX(-100%);
	animation: shimmer 1.4s infinite;
}@keyframes -global-shimmer {
	to {
		transform: translateX(100%);
	}
}@media (prefers-reduced-motion: reduce) {:global(.skeleton::after) {
		animation: none;
	}:global(*) {
		scroll-behavior: auto !important;
	}
}:global(.spinner-inline) {
	width: 14px;
	height: 14px;
	border: 2px solid currentColor;
	border-right-color: transparent;
	border-radius: 50%;
	display: inline-block;
	animation: spin 0.7s linear infinite;
	flex: 0 0 auto;
}@keyframes -global-spin {
	to {
		transform: rotate(360deg);
	}
}:global(.alert-app) {
	display: flex;
	gap: 0.65rem;
	align-items: flex-start;
	padding: 0.7rem 0.85rem;
	border: 1px solid var(--line);
	border-left: 3px solid var(--danger);
	background: var(--surface);
	border-radius: var(--radius-sm);
	font-size: 0.8rem;
	color: var(--text-soft);
}:global(.alert-app svg) {
	flex: 0 0 auto;
	margin-top: 1px;
	color: var(--danger);
}:global(.alert-app strong) {
	display: block;
	color: var(--text);
	font-weight: 600;
	margin-bottom: 0.1rem;
}:global(.alert-app--warn) {
	border-left-color: var(--warn);
	background: #fffdf7;
}:global(.alert-app--warn svg) {
	color: var(--warn-strong);
}:global(.alert-app--info) {
	border-left-color: var(--info);
	background: #f8fcfd;
}:global(.alert-app--info svg) {
	color: var(--info-strong);
}:global(.chart) {
	width: 100%;
}:global(.chart svg) {
	display: block;
	width: 100%;
	height: auto;
	overflow: visible;
}:global(.chart .grid-line) {
	stroke: var(--line);
	stroke-width: 1;
	stroke-dasharray: 2 3;
}:global(.chart .axis-label) {
	fill: var(--text-faint);
	font-size: 9px;
	font-family: var(--font-ui);
}:global(.chart .bar) {
	fill: var(--ink-700);
	transition: fill 0.15s ease;
}:global(.chart .bar--accent) {
	fill: var(--accent);
}:global(.chart .bar--alt) {
	fill: #9aa4a9;
}:global(.chart .line-path) {
	fill: none;
	stroke: var(--accent);
	stroke-width: 2;
	stroke-linejoin: round;
	stroke-linecap: round;
}:global(.chart .area-path) {
	fill: var(--accent-soft);
	opacity: 0.55;
}:global(.chart .point) {
	fill: var(--surface);
	stroke: var(--accent);
	stroke-width: 2;
}:global(.chart-legend) {
	display: flex;
	gap: 0.9rem;
	flex-wrap: wrap;
	font-size: 0.71rem;
	color: var(--text-soft);
}:global(.chart-legend span) {
	display: inline-flex;
	align-items: center;
	gap: 0.35rem;
}:global(.chart-legend i) {
	width: 9px;
	height: 9px;
	border-radius: 2px;
	display: inline-block;
	background: var(--ink-700);
}:global(.chart-legend i.accent) {
	background: var(--accent);
}:global(.chart-legend i.alt) {
	background: #9aa4a9;
}:global(.chart-empty) {
	display: grid;
	place-items: center;
	min-height: 170px;
	padding: 1rem;
	font-size: 0.78rem;
	color: var(--text-faint);
	background: var(--surface-soft);
	border: 1px dashed var(--line-strong);
	border-radius: var(--radius-sm);
	text-align: center;
}:global(.occupancy) {
	display: flex;
	align-items: center;
	gap: 0.55rem;
	min-width: 130px;
}:global(.occupancy__track) {
	flex: 1 1 auto;
	height: 6px;
	border-radius: 999px;
	background: var(--surface-muted);
	overflow: hidden;
}:global(.occupancy__fill) {
	height: 100%;
	border-radius: inherit;
	background: var(--ok);
	transition: none;
}:global(.occupancy__fill.warn) {
	background: var(--warn);
}:global(.occupancy__fill.danger) {
	background: var(--danger);
}:global(.occupancy__fill.unknown) {
	background: var(--line-strong);
}:global(.occupancy__value) {
	font-size: 0.73rem;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	color: var(--text);
	white-space: nowrap;
	min-width: 45px;
	text-align: right;
}:global(.zone-card-grid) {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
	gap: 0.8rem;
}:global(.zone-card) {
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--radius);
	padding: 0.9rem 0.95rem;
	display: flex;
	flex-direction: column;
	gap: 0.65rem;
	min-height: 190px;
}:global(.zone-card__head) {
	display: flex;
	align-items: flex-start;
	gap: 0.6rem;
}:global(.zone-card__index) {
	width: 32px;
	height: 32px;
	display: grid;
	place-items: center;
	border-radius: var(--radius-sm);
	background: var(--ink-900);
	color: #fff;
	font-family: var(--font-display);
	font-size: 0.9rem;
	flex: 0 0 auto;
}:global(.zone-card h4) {
	font-size: 1.05rem;
	line-height: 1.1;
}:global(.zone-card__meta) {
	margin-top: 0.18rem;
	font-size: 0.71rem;
	color: var(--text-faint);
	text-transform: capitalize;
}:global(.zone-card__stats) {
	display: flex;
	align-items: baseline;
	gap: 0.4rem;
}:global(.zone-card__stats .big) {
	font-family: var(--font-display);
	font-size: 1.75rem;
	font-weight: 600;
	line-height: 1;
	color: var(--ink-950);
	font-variant-numeric: tabular-nums;
}:global(.zone-card__stats span) {
	font-size: 0.73rem;
	color: var(--text-faint);
}:global(.zone-card__foot) {
	margin-top: auto;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.4rem;
	padding-top: 0.55rem;
	border-top: 1px solid var(--line);
	font-size: 0.7rem;
	color: var(--text-faint);
}:global(.zone-card__actions) {
	display: flex;
	gap: 0.2rem;
}:global(.timeline) {
	position: relative;
	margin: 0;
	padding: 0;
	list-style: none;
}:global(.timeline::before) {
	content: '';
	position: absolute;
	left: 10px;
	top: 4px;
	bottom: 4px;
	width: 1px;
	background: var(--line-strong);
}:global(.timeline-item) {
	position: relative;
	padding: 0 0 1rem 2.1rem;
}:global(.timeline-item:last-child) {
	padding-bottom: 0;
}:global(.timeline-item__dot) {
	position: absolute;
	left: 3px;
	top: 3px;
	width: 15px;
	height: 15px;
	border-radius: 50%;
	background: var(--surface);
	border: 2px solid var(--line-strong);
	z-index: 1;
}:global(.timeline-item__dot.ok) {
	border-color: var(--ok);
	background: var(--ok-soft);
}:global(.timeline-item__dot.warn) {
	border-color: var(--warn);
	background: var(--warn-soft);
}:global(.timeline-item__dot.danger) {
	border-color: var(--danger);
	background: var(--danger-soft);
}:global(.timeline-item__dot.accent) {
	border-color: var(--accent);
	background: var(--accent-soft);
}:global(.timeline-item__top) {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	flex-wrap: wrap;
}:global(.timeline-item__top strong) {
	font-size: 0.82rem;
	font-weight: 600;
}:global(.timeline-item__time) {
	font-size: 0.7rem;
	color: var(--text-faint);
	font-variant-numeric: tabular-nums;
}:global(.timeline-item__body) {
	margin-top: 0.2rem;
	font-size: 0.76rem;
	color: var(--text-soft);
}:global(.timeline-item__meta) {
	display: flex;
	flex-wrap: wrap;
	gap: 0.4rem 0.8rem;
	margin-top: 0.35rem;
	font-size: 0.7rem;
	color: var(--text-faint);
}:global(.definition-grid) {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
	gap: 1px;
	background: var(--line);
	border: 1px solid var(--line);
	border-radius: var(--radius);
	overflow: hidden;
}:global(.definition-grid > div) {
	background: var(--surface);
	padding: 0.65rem 0.8rem;
}:global(.definition-grid dt) {
	font-size: 0.65rem;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--text-faint);
	margin-bottom: 0.15rem;
}:global(.definition-grid dd) {
	margin: 0;
	font-size: 0.82rem;
	color: var(--text);
	font-weight: 500;
	overflow-wrap: anywhere;
}:global(.camera-card) {
	background: var(--surface);
	border: 1px solid var(--line);
	border-radius: var(--radius);
	overflow: hidden;
	display: flex;
	flex-direction: column;
}:global(.camera-card__feed) {
	position: relative;
	aspect-ratio: 16 / 9;
	background: var(--ink-950);
	display: grid;
	place-items: center;
	color: #6f7a80;
	text-align: center;
	padding: 1rem;
}:global(.camera-card__feed svg) {
	color: #556169;
	margin-bottom: 0.45rem;
}:global(.camera-card__feed p) {
	font-size: 0.7rem;
	max-width: 30ch;
	line-height: 1.4;
}:global(.camera-card__feed .pill) {
	position: absolute;
	top: 0.5rem;
	left: 0.5rem;
}:global(.camera-card__body) {
	padding: 0.8rem 0.9rem;
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
	flex: 1 1 auto;
}:global(.camera-card h4) {
	font-size: 1rem;
}:global(.camera-card__where) {
	font-size: 0.72rem;
	color: var(--text-faint);
}:global(.camera-card__foot) {
	margin-top: auto;
	padding-top: 0.55rem;
	border-top: 1px solid var(--line);
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.4rem;
}:global(.camera-card__foot span) {
	font-size: 0.68rem;
	color: var(--text-faint);
}:global(.modal-app) {
	border: 0;
	padding: 0;
	width: min(560px, calc(100vw - 2rem));
	max-height: calc(100vh - 3rem);
	background: var(--surface);
	color: var(--text);
	border-radius: var(--radius-lg);
	box-shadow: var(--shadow-pop);
}:global(.modal-app--lg) {
	width: min(820px, calc(100vw - 2rem));
}:global(.modal-app--sm) {
	width: min(430px, calc(100vw - 2rem));
}:global(.modal-app::backdrop) {
	background: rgba(11, 14, 16, 0.55);
	backdrop-filter: blur(2px);
}:global(.modal-app__head) {
	display: flex;
	align-items: flex-start;
	gap: 0.8rem;
	padding: 1rem 1.1rem;
	border-bottom: 1px solid var(--line);
}:global(.modal-app__head h3) {
	font-size: 1.2rem;
	line-height: 1.1;
}:global(.modal-app__head p) {
	margin-top: 0.2rem;
	font-size: 0.75rem;
	color: var(--text-soft);
}:global(.modal-app__close) {
	margin-left: auto;
	background: transparent;
	border: 0;
	color: var(--text-faint);
	padding: 0.2rem;
	border-radius: var(--radius-sm);
	display: grid;
	place-items: center;
}:global(.modal-app__close:hover) {
	color: var(--text);
	background: var(--surface-muted);
}:global(.modal-app__body) {
	padding: 1.05rem 1.1rem;
	overflow-y: auto;
	max-height: calc(100vh - 15rem);
}:global(.modal-app__foot) {
	display: flex;
	justify-content: flex-end;
	gap: 0.45rem;
	padding: 0.8rem 1.1rem;
	border-top: 1px solid var(--line);
	background: var(--surface-soft);
}:global(.toast-stack) {
	position: fixed;
	right: 1rem;
	bottom: 1rem;
	z-index: 1090;
	display: flex;
	flex-direction: column;
	gap: 0.45rem;
	width: min(360px, calc(100vw - 2rem));
}:global(.toast-app) {
	display: flex;
	align-items: flex-start;
	gap: 0.55rem;
	padding: 0.65rem 0.75rem;
	background: var(--ink-950);
	color: #e7ebe8;
	border-radius: var(--radius);
	box-shadow: var(--shadow-pop);
	font-size: 0.78rem;
	animation: toast-in 0.18s ease both;
}:global(.toast-app svg) {
	flex: 0 0 auto;
	margin-top: 1px;
	color: var(--ok);
}:global(.toast-app.error svg) {
	color: #e28a84;
}:global(.toast-app .toast-body-text) {
	flex: 1 1 auto;
}:global(.toast-app strong) {
	display: block;
	font-size: 0.78rem;
	margin-bottom: 0.05rem;
}:global(.toast-app button) {
	background: transparent;
	border: 0;
	color: #9aa3a8;
	padding: 0;
	margin-left: 0.2rem;
}@keyframes -global-toast-in {
	from {
		opacity: 0;
		transform: translateY(6px);
	}
}:global(.text-soft) {
	color: var(--text-soft);
}:global(.text-faint) {
	color: var(--text-faint);
}:global(.text-ink) {
	color: var(--ink-950);
}:global(.fs-7) {
	font-size: 0.78rem;
}:global(.fs-8) {
	font-size: 0.71rem;
}:global(.eyebrow-plain) {
	font-size: 0.65rem;
	font-weight: 600;
	letter-spacing: 0.1em;
	text-transform: uppercase;
	color: var(--text-faint);
}:global(.divider) {
	height: 1px;
	background: var(--line);
	margin: 0.9rem 0;
}:global(.hairline) {
	border-top: 1px solid var(--line);
}:global(.sep) {
	width: 1px;
	height: 22px;
	background: var(--line);
}:global(.min-w-0) {
	min-width: 0;
}:global(.truncate) {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}:global(.num-tab) {
	font-variant-numeric: tabular-nums;
}:global(.spacer) {
	flex: 1 1 auto;
}:global(.stack-sm) {
	display: flex;
	flex-direction: column;
	gap: 0.5rem;
}:global(.stack-md) {
	display: flex;
	flex-direction: column;
	gap: 0.85rem;
}:global(.inline-list) {
	display: flex;
	align-items: center;
	gap: 0.4rem;
	flex-wrap: wrap;
}:global(.muted-box) {
	background: var(--surface-soft);
	border: 1px solid var(--line);
	border-radius: var(--radius-sm);
	padding: 0.7rem 0.8rem;
	font-size: 0.78rem;
	color: var(--text-soft);
}:global(.kpi-inline) {
	display: flex;
	gap: 1.2rem;
	flex-wrap: wrap;
}:global(.kpi-inline > div) {
	min-width: 90px;
}:global(.kpi-inline dt) {
	font-size: 0.65rem;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--text-faint);
	font-weight: 600;
}:global(.kpi-inline dd) {
	margin: 0.1rem 0 0;
	font-family: var(--font-display);
	font-size: 1.5rem;
	font-weight: 600;
	line-height: 1;
	color: var(--ink-950);
	font-variant-numeric: tabular-nums;
}:global(.alert-rule-list) {
	display: flex;
	flex-direction: column;
	gap: 0.55rem;
}:global(.alert-rule) {
	display: flex;
	align-items: flex-start;
	gap: 0.6rem;
	padding: 0.65rem 0.75rem;
	border: 1px solid var(--line);
	border-radius: var(--radius-sm);
	background: var(--surface);
}:global(.alert-rule__sev) {
	width: 3px;
	align-self: stretch;
	border-radius: 999px;
	background: var(--warn);
	flex: 0 0 auto;
}:global(.alert-rule__sev.danger) {
	background: var(--danger);
}:global(.alert-rule__sev.info) {
	background: var(--info);
}:global(.alert-rule strong) {
	font-size: 0.8rem;
	font-weight: 600;
}:global(.alert-rule p) {
	font-size: 0.73rem;
	color: var(--text-soft);
	margin-top: 0.1rem;
}:global(.alert-rule__meta) {
	margin-left: auto;
	text-align: right;
	font-size: 0.68rem;
	color: var(--text-faint);
	white-space: nowrap;
}:global(.settings-row) {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 1rem;
	padding: 0.85rem 0;
	border-bottom: 1px solid var(--line);
}:global(.settings-row:last-child) {
	border-bottom: 0;
}:global(.settings-row h4) {
	font-size: 0.92rem;
}:global(.settings-row p) {
	font-size: 0.75rem;
	color: var(--text-soft);
	margin-top: 0.15rem;
	max-width: 62ch;
}:global(.settings-row__control) {
	flex: 0 0 auto;
	min-width: 130px;
}:global(.tab-strip) {
	display: flex;
	gap: 0.2rem;
	border-bottom: 1px solid var(--line);
	margin-bottom: 1rem;
	overflow-x: auto;
}:global(.tab-strip button) {
	background: transparent;
	border: 0;
	border-bottom: 2px solid transparent;
	padding: 0.5rem 0.75rem;
	font-size: 0.78rem;
	font-weight: 500;
	color: var(--text-soft);
	white-space: nowrap;
}:global(.tab-strip button:hover) {
	color: var(--text);
}:global(.tab-strip button.active) {
	color: var(--accent-strong);
	border-bottom-color: var(--accent);
}:global(.permission-matrix) {
	overflow-x: auto;
}:global(.permission-matrix table) {
	width: 100%;
	border-collapse: collapse;
	font-size: 0.78rem;
}:global(.permission-matrix th), :global(.permission-matrix td) {
	padding: 0.5rem 0.6rem;
	border-bottom: 1px solid var(--line);
	text-align: center;
}:global(.permission-matrix th:first-child), :global(.permission-matrix td:first-child) {
	text-align: left;
}:global(.permission-matrix thead th) {
	font-size: 0.66rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-faint);
	background: var(--surface-soft);
}:global(.tab__dot) {
	display: inline-block;
	width: 6px;
	height: 6px;
	margin-left: 0.35rem;
	border-radius: 50%;
	background: var(--danger);
	vertical-align: middle;
}:global(.section-mini-head) {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	margin-bottom: 0.6rem;
	padding-bottom: 0.45rem;
	border-bottom: 1px solid var(--line);
}:global(.section-mini-head h4) {
	font-size: 0.92rem;
	line-height: 1.2;
}:global(.section-mini-head span) {
	font-size: 0.7rem;
	color: var(--text-faint);
}:global(.camera-grid) {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
	gap: 0.8rem;
}:global(.camera-card__head) {
	display: flex;
	align-items: flex-start;
	gap: 0.6rem;
	padding: 0.85rem 0.9rem 0.7rem;
}:global(.camera-card__icon) {
	width: 34px;
	height: 34px;
	flex: 0 0 auto;
	display: grid;
	place-items: center;
	border-radius: var(--radius-sm);
	background: var(--ink-900);
	color: #fff;
}:global(.camera-card h5) {
	font-size: 0.94rem;
	line-height: 1.2;
}:global(.camera-card__loc) {
	display: flex;
	align-items: center;
	gap: 0.25rem;
	margin-top: 0.18rem;
	font-size: 0.69rem;
	color: var(--text-faint);
	min-width: 0;
}:global(.camera-card__rows) {
	display: grid;
	gap: 0.38rem;
	padding: 0.6rem 0.9rem 0.75rem;
	border-top: 1px solid var(--line);
}:global(.row-line) {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 0.6rem;
	font-size: 0.72rem;
}:global(.row-line__label) {
	color: var(--text-faint);
}:global(.row-line__value) {
	color: var(--text);
	text-align: right;
	font-variant-numeric: tabular-nums;
}:global(.camera-card__foot) {
	padding: 0.55rem 0.9rem;
	background: var(--surface-soft);
}:global(.type-breakdown) {
	display: grid;
	gap: 0.35rem;
	min-width: 280px;
	max-width: 360px;
}:global(.type-breakdown--stack) {
	min-width: 0;
	max-width: none;
}:global(.type-breakdown__row) {
	display: grid;
	grid-template-columns: 112px 1fr 34px;
	align-items: center;
	gap: 0.45rem;
}:global(.type-breakdown__label) {
	font-size: 0.68rem;
	color: var(--text-soft);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}:global(.type-breakdown__track) {
	display: block;
	height: 5px;
	border-radius: 3px;
	background: var(--line);
	overflow: hidden;
}:global(.type-breakdown__track > span) {
	display: block;
	height: 100%;
	border-radius: 3px;
	background: var(--accent);
}:global(.type-breakdown__value) {
	font-size: 0.68rem;
	color: var(--text-faint);
	text-align: right;
	font-variant-numeric: tabular-nums;
}:global(.detail-grid) {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
	gap: 1px;
	background: var(--line);
	border: 1px solid var(--line);
	border-radius: var(--radius);
	overflow: hidden;
}:global(.detail-grid > div) {
	background: var(--surface);
	padding: 0.55rem 0.7rem;
	min-width: 0;
}:global(.detail-grid dt) {
	font-size: 0.63rem;
	font-weight: 600;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--text-faint);
	margin-bottom: 0.12rem;
}:global(.detail-grid dd) {
	margin: 0;
	font-size: 0.79rem;
	color: var(--text);
	overflow-wrap: anywhere;
}:global(.json-block) {
	margin: 0;
}:global(.json-block dt) {
	font-size: 0.63rem;
	font-weight: 600;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--text-faint);
	margin-bottom: 0.3rem;
}:global(.json-block pre) {
	margin: 0;
	padding: 0.75rem;
	max-height: 260px;
	overflow: auto;
	background: var(--ink-950);
	color: #d7ddd9;
	border-radius: var(--radius);
	font-size: 0.68rem;
	line-height: 1.5;
}:global(.mini-card) {
	border: 1px solid var(--line);
	border-radius: var(--radius-sm);
	padding: 0.55rem 0.65rem;
	background: var(--surface-soft);
}:global(.clamp-2) {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}:global(.plate--sm) {
	font-size: 0.66rem;
	padding: 0.08rem 0.35rem;
}:global(.filter-field--xs) {
	width: 132px;
	flex: 0 0 auto;
}:global(.bars) {
	display: grid;
	gap: 0.5rem;
}:global(.bar-row) {
	display: grid;
	grid-template-columns: 120px 1fr 48px;
	align-items: center;
	gap: 0.5rem;
}:global(.bar-row__label) {
	font-size: 0.7rem;
	color: var(--text-soft);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}:global(.bar-row__track) {
	display: block;
	height: 9px;
	border-radius: 3px;
	background: var(--line);
	overflow: hidden;
}:global(.bar-row__fill) {
	display: block;
	height: 100%;
	border-radius: 3px;
	background: var(--ok);
}:global(.bar-row__fill.warn) {
	background: var(--warn);
}:global(.bar-row__fill.danger) {
	background: var(--danger);
}:global(.bar-row__fill.neutral) {
	background: var(--line-strong);
}:global(.bar-row__value) {
	font-size: 0.7rem;
	font-weight: 600;
	color: var(--text);
	text-align: right;
	font-variant-numeric: tabular-nums;
}:global(.chart-note) {
	margin-top: 0.6rem;
	font-size: 0.66rem;
	color: var(--text-faint);
	line-height: 1.45;
}:global(.alert-app--ok) {
	background: var(--ok-soft);
	border-color: #c6dfd0;
}:global(.alert-app--ok svg) {
	color: var(--ok-strong);
}:global(.clean-list) {
	margin: 0;
	padding: 0;
	list-style: none;
	display: grid;
	gap: 0.45rem;
}:global(.clean-list li) {
	position: relative;
	padding-left: 1.1rem;
	font-size: 0.78rem;
	color: var(--text-soft);
	line-height: 1.5;
}:global(.clean-list li::before) {
	content: '';
	position: absolute;
	left: 0;
	top: 0.5em;
	width: 5px;
	height: 5px;
	border-radius: 50%;
	background: var(--accent);
}:global(.font-monospace) {
	font-family: 'Cascadia Mono', 'Consolas', monospace;
	font-size: 0.78rem;
}:global(.text-warn) {
	color: var(--warn-strong);
}:global(.permission-matrix .form-check-input) {
	margin: 0;
	cursor: pointer;
}:global(.compact-tables .data-table tbody td) {
	padding-top: 0.35rem;
	padding-bottom: 0.35rem;
}:global(.compact-tables .data-table .cell-sub) {
	margin-top: 0;
}:global(.filter-bar--report) {
	border-bottom: 0;
}:global(.panel__head .type-breakdown) {
	flex: 0 0 300px;
}@media (max-width: 991.98px) {:global(.panel__head .type-breakdown) {
		display: none;
	}
}@media (max-width: 575.98px) {:global(.filter-field--xs) {
		width: 100%;
	}:global(.bar-row) {
		grid-template-columns: 84px 1fr 40px;
	}:global(.camera-grid), :global(.zone-card-grid) {
		grid-template-columns: 1fr;
	}
}@media print {:global(.app-sidebar), :global(.app-topbar), :global(.page-header__actions), :global(.filter-bar), :global(.toast-stack) {
		display: none !important;
	}:global(.app-main) {
		margin-left: 0;
	}:global(.app-content) {
		padding: 0;
	}:global(.panel) {
		break-inside: avoid;
	}
}

 :global(.btn-icon), :global(.modal-app__close) { min-width: 44px; min-height: 44px; }
 :global(.btn), :global(.tab-strip button), :global(.nav-link-app) { min-height: 36px; }
 :global(.permission-matrix .permiso-celda) { padding: 0; }
 :global(.permiso-control) { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; cursor: pointer; }
 :global(.error-campo) { display: block; color: var(--danger-strong); font-size: .875rem; margin-top: .25rem; }
 :global([aria-invalid="true"]) { border-color: var(--danger); }
 :global(.saltar-contenido) { position: fixed; left: 1rem; top: -10rem; z-index: 1100; padding: .75rem 1rem; background: var(--surface); color: var(--text); }
 :global(.saltar-contenido:focus) { top: .5rem; }
 :global(.app-topbar__title h1) { white-space: normal; overflow-wrap: anywhere; }
 :global(.panel__head), :global(.page-header), :global(.panel__head-tools), :global(.modal-app__foot) { flex-wrap: wrap; }
 :global(.app-main), :global(.page-header__copy), :global(.panel) { min-width: 0; }
 :global(.table-wrap:focus-visible) { outline-offset: -3px; }
 @media (max-width: 991.98px) {
  :global(body) { font-size: 1rem; }
  :global(.btn), :global(.tab-strip button), :global(.nav-link-app), :global(.form-control), :global(.form-select) { min-height: 44px; }
  :global(.form-control), :global(.form-select) { font-size: 1rem; }
  :global(.data-table), :global(.form-label), :global(.filter-field label), :global(.cell-sub), :global(.form-text), :global(.text-faint), :global(.data-table thead th) { font-size: .875rem; }
 }
 @media (prefers-reduced-motion: reduce) {
  :global(.toast-app) { animation: none; }
  :global(.spinner-inline) { animation: none; border-style: dotted; }
  :global(.occupancy__fill), :global(.occupancy__bar), :global(.toast-app), :global(.nav-link-app), :global(.nav-link-app svg) { transition: none; }
 }

 /* La API aplica la restricción; esta clase evita ofrecer acciones no permitidas. */
 :global(.solo-consulta [data-edicion]), :global(.solo-consulta .solo-edicion), :global(.solo-consulta a[href="/camaras"]), :global(.solo-consulta a[href="/zonas"]) { display: none !important; }

 :global(.data-table .placa-etiqueta) { display: inline-block; padding: .18rem .4rem; border: 1px solid var(--line-strong); border-radius: var(--radius-sm); background: var(--surface-soft); color: var(--text); font-size: .75rem; font-weight: 600; letter-spacing: .06em; white-space: nowrap; }
 :global(.data-table .codigo-etiqueta) { display: inline-block; padding: .15rem .4rem; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--surface-soft); font-size: .78rem; font-weight: 600; }
 :global(.data-table .pill) { max-width: 100%; padding: .18rem .5rem; border-radius: 999px; font-size: .7rem; line-height: 1.4; }
 :global(.data-table .pill--info) { border-color: #c6dce8; }
 :global(.data-table .pill--ok) { border-color: #c6dfd0; }
 :global(.data-table .pill--warn) { border-color: #ecd7a0; }
 :global(.data-table .pill--danger) { border-color: #ecc9c5; }
 :global(.data-table .pill--neutral) { border-color: var(--line); }
 :global(.data-table .cell-sub) { color: var(--text-soft); }
 @media (max-width: 991.98px) { :global(.data-table .placa-etiqueta), :global(.data-table .codigo-etiqueta) { font-size: .875rem; } }

 :global(.accion-registro) { width: 44px; height: 44px; min-width: 44px; min-height: 44px; padding: 0; flex: 0 0 44px; }
 :global(.accion-registro--activar) { color: var(--ok-strong); }
 :global(.accion-registro--activar:hover), :global(.accion-registro--activar:focus-visible) { color: var(--ok-strong); background: var(--ok-soft); border-color: var(--ok); }

 :global(body:has(dialog.modal-formulario[open])) { overflow: hidden; }
 :global(.modal-formulario) { width: min(600px, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow-y: auto; overscroll-behavior: contain; }
 :global(.modal-formulario--amplio) { width: min(900px, calc(100vw - 2rem)); }
 :global(.modal-formulario > .panel__head) { position: sticky; top: 0; z-index: 2; background: var(--surface); align-items: center; flex-wrap: nowrap; }
 :global(.modal-formulario > .panel__head > div) { min-width: 0; }
 :global(.modal-formulario .panel__body) { padding: 1.1rem; }
 :global(.modal-formulario .d-flex.gap-2) { flex-wrap: wrap; }
 @media (max-width: 575.98px) { :global(.modal-formulario) { width: calc(100vw - 1rem); max-height: calc(100dvh - 1rem); } }

 :global(.swal2-container) { z-index: 2000; }
 :global(.aviso-aplicacion) { font-family: var(--font-ui); color: var(--text); background: var(--surface); border-radius: var(--radius-lg); }
 :global(.aviso-aplicacion .swal2-title) { font-family: var(--font-display); color: var(--text); font-size: 1.6rem; }
 :global(.aviso-aplicacion .swal2-html-container) { font-size: .9rem; line-height: 1.5; overflow-wrap: anywhere; }
 :global(.aviso-aplicacion__acciones) { gap: .65rem; }
 :global(.aviso-aplicacion .btn) { min-height: 44px; padding: .55rem 1rem; }
 :global(.aviso-aplicacion.swal2-toast .swal2-title) { font-family: var(--font-ui); font-size: .9rem; }
 :global(dialog .swal2-container) { border-radius: inherit; }
 @media (prefers-reduced-motion: reduce) { :global(.swal2-popup), :global(.swal2-icon), :global(.swal2-icon *) { animation: none !important; transition: none !important; } }

 :global(.estado-edicion) { min-height: 180px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .75rem; text-align: center; }
 :global(.estado-edicion p) { margin: 0; }
 :global(.estado-edicion .spinner-inline) { width: 22px; height: 22px; color: var(--accent-strong); }
</style>
