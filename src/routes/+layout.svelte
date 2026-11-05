<script>
	import 'bootstrap/dist/css/bootstrap.min.css';
	import '../app.css';

	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '#lib/components/Icon.svelte';
	import AppSidebar from '#lib/components/AppSidebar.svelte';
	import AppTopbar from '#lib/components/AppTopbar.svelte';
	import ToastStack from '#lib/components/ToastStack.svelte';
	import { findNavItem, navigation, getModuleIdForPath } from '#lib/nav.js';
	import { probeBackend } from '#lib/service/client.js';
	import { session, initSession, clearSession, refreshProfile } from '#lib/stores/session.svelte.js';
	import { preferences } from '#lib/stores/preferences.svelte.js';
	import { pushToast } from '#lib/stores/toasts.svelte.js';
	import { listarModulosPorRol } from '#lib/service/modulos_x_rol.js';

	let { children } = $props();

	let mobileOpen = $state(false);
	let apiOnline = $state(null);
	let allowedModuleIds = $state([]); // IDs de módulos permitidos según el rol

	const path = $derived(page.url.pathname);
	const isLogin = $derived(path === '/login' || path.startsWith('/login/'));

	// Determinar el ID de rol del usuario de forma robusta
	const userRol = $derived.by(() => {
		if (!session.user) return null;
		const id = session.user.id_rol ?? session.user.rol;
		if (id !== undefined && id !== null && !isNaN(Number(id))) {
			return Number(id);
		}
		const name = String(session.user.rol_nombre || '').toLowerCase();
		if (name.includes('admin')) return 1;
		if (name.includes('oper') || name.includes('docen') || name.includes('estud')) return 2;
		return null;
	});

	// IDs de módulos por rol como respaldo si la BD no responde
	// Admin (id_rol=1): todos los módulos del sistema
	// Operador (id_rol=2): módulos asignados por defecto
	const adminFallback = [1, 2, 3, 4, 5, 6, 7, 8, 9];
	const operadorFallback = [1, 4, 5, 8];
	const guestFallback = [1];

	// Registra para qué rol se han cargado los módulos permitidos
	let loadedRol = $state(null);

	// Obtener módulos permitidos dinámicamente desde la BD filtrando por el rol del usuario
	$effect(() => {
		if (isLogin) {
			allowedModuleIds = [];
			loadedRol = null;
			return;
		}

		if (!session.ready) return;

		// Si es acceso como invitado
		if (session.guest) {
			allowedModuleIds = guestFallback;
			loadedRol = 'guest';
			return;
		}

		// Si no hay usuario en sesión
		if (!session.user) {
			allowedModuleIds = [];
			loadedRol = null;
			return;
		}

		const currentRol = userRol;

		// Si aún no está resuelto el rol, asignar panel principal temporalmente
		if (currentRol === null) {
			console.warn('Rol de usuario no determinado aún en sesión, esperando rol...');
			allowedModuleIds = [1];
			return;
		}

		// Si ya se cargaron los módulos para este rol, evitar peticiones duplicadas
		if (loadedRol === currentRol) {
			return;
		}

		// Consultar módulos permitidos desde la BD para este rol
		listarModulosPorRol(currentRol)
			.then((modulos) => {
				const permitted = (modulos || [])
					.filter((m) => Number(m.id_rol) === Number(currentRol) && m.estado !== false)
					.map((m) => Number(m.id_modulo));

				if (permitted.length > 0) {
					allowedModuleIds = permitted;
					console.log(`Módulos cargados desde BD para rol ${currentRol}:`, permitted);
				} else {
					const fallback = currentRol === 1 ? adminFallback : operadorFallback;
					allowedModuleIds = fallback;
					console.log(`Usando fallback por rol (${currentRol}):`, fallback);
				}
				loadedRol = currentRol;
			})
			.catch((err) => {
				console.error('Error cargando módulos desde BD:', err);
				const fallback = currentRol === 1 ? adminFallback : operadorFallback;
				allowedModuleIds = fallback;
				loadedRol = currentRol;
			});
	});

	// Función para verificar si el usuario tiene acceso a un módulo
	function tieneAccesoModulo(idModulo) {
		if (idModulo === undefined || idModulo === null) return true;
		return allowedModuleIds.includes(Number(idModulo));
	}

	// Filtrar navegación del sidebar según los módulos permitidos en la BD
	const filteredNavigation = $derived(
		navigation
			.map((group) => ({
				...group,
				items: group.items.filter((item) => {
					if (session.guest) {
						return item.href === '/' || (!item.requiresAuth && allowedModuleIds.includes(Number(item.id_modulo)));
					}
					if (!session.user) return false;

					// Si la opción requiere explícitamente rol administrador
					if (item.adminOnly && userRol !== 1) {
						return false;
					}

					// Si tiene id_modulo asignado, verificar contra los permitidos de la BD
					if (item.id_modulo !== undefined) {
						return tieneAccesoModulo(item.id_modulo);
					}

					return true;
				})
			}))
			.filter((group) => group.items.length > 0)
	);

	const current = $derived(findNavItem(path));
	const currentModuleId = $derived(getModuleIdForPath(path));

	// Determinar de manera estricta si la ruta actual está autorizada para el usuario
	const isAuthorized = $derived.by(() => {
		if (isLogin) return true;
		if (!session.ready) return false;

		// Si es invitado
		if (session.guest) {
			return path === '/' || (!current.requiresAuth && allowedModuleIds.includes(Number(currentModuleId)));
		}

		// Si no hay usuario
		if (!session.user) return false;

		// Mientras se están resolviendo los permisos de la BD
		if (loadedRol === null) return false;

		// Sección de administración exclusiva para rol 1
		if (path.startsWith('/administracion') && userRol !== 1) {
			return false;
		}

		// Verificar permiso del módulo requerido
		if (currentModuleId !== null && allowedModuleIds.length > 0) {
			return allowedModuleIds.includes(Number(currentModuleId));
		}

		return true;
	});

	async function checkApi() {
		apiOnline = await probeBackend();
		if (session.token) {
			refreshProfile();
		}
	}

	onMount(() => {
		initSession();
		checkApi();
		refreshProfile();

		const handleUnauthorized = () => {
			clearSession();
			loadedRol = null;
			allowedModuleIds = [];
			pushToast({
				type: 'error',
				title: 'Sesión finalizada',
				message: 'El backend rechazó las credenciales. Inicie sesión nuevamente.',
				timeout: 8000
			});
			goto(`/login?next=${encodeURIComponent(page.url.pathname)}`, { replace: true });
		};

		const handleLogout = () => {
			loadedRol = null;
			allowedModuleIds = [];
			goto('/login', { replace: true });
		};

		const handlePermissionsChanged = async () => {
			await refreshProfile();
			loadedRol = null; // Fuerza recargar permisos desde BD
		};

		const interval = setInterval(checkApi, 60000);
		window.addEventListener('lpr:unauthorized', handleUnauthorized);
		window.addEventListener('lpr:logout', handleLogout);
		window.addEventListener('lpr:permissions-changed', handlePermissionsChanged);

		return () => {
			clearInterval(interval);
			window.removeEventListener('lpr:unauthorized', handleUnauthorized);
			window.removeEventListener('lpr:logout', handleLogout);
			window.removeEventListener('lpr:permissions-changed', handlePermissionsChanged);
		};
	});

	// Guardia de navegación: redirige inmediatamente si el usuario intenta acceder a un módulo prohibido
	$effect(() => {
		if (!session.ready || isLogin) return;

		// Si no tiene credenciales ni acceso como invitado
		if (!session.token && !session.guest) {
			goto(`/login?next=${encodeURIComponent(path)}`, { replace: true });
			return;
		}

		// Esperar a que los módulos para el rol hayan terminado de cargar desde la BD
		if (session.user && loadedRol === null) return;

		// Si la ruta solicitada no está permitida para este usuario
		if (!isAuthorized) {
			const label = current?.label || 'solicitada';
			pushToast({
				type: 'warning',
				title: 'Acceso no permitido',
				message: `Su rol no tiene autorización para acceder al módulo "${label}".`,
				timeout: 5000
			});
			goto('/', { replace: true });
		}
	});

	$effect(() => {
		path;
		mobileOpen = false;
	});
</script>

<svelte:head>
	<title>{isLogin ? 'Iniciar sesión' : `${current.label} · LPR Control`}</title>
</svelte:head>

{#if isLogin}
	{@render children()}
{:else if !session.ready || (session.user && loadedRol === null)}
	<div class="state-block" style="min-height: 100vh;">
		<div class="state-block__icon"><Icon name="camera" size={22} /></div>
		<h4>LPR Control</h4>
		<p>Verificando permisos y cargando módulos…</p>
	</div>
{:else if !isAuthorized}
	<div class="app-shell" class:compact-tables={preferences.compactTables}>
		<AppSidebar {filteredNavigation} {path} open={mobileOpen} onclose={() => (mobileOpen = false)} {apiOnline} />
		<div class="app-main">
			<AppTopbar
				section="Acceso restringido"
				title="Módulo no permitido"
				onmenu={() => (mobileOpen = true)}
				{apiOnline}
			/>
			<main class="app-content p-4">
				<div class="state-block" style="min-height: 50vh;">
					<div class="state-block__icon text-warning">
						<Icon name="shield" size={28} />
					</div>
					<h4>Acceso restringido por rol</h4>
					<p>
						Su cuenta actual (<strong>{session.user?.rol_nombre || 'operador'}</strong>) no cuenta con permisos
						para acceder al módulo <strong>{current.label}</strong>.
					</p>
					<a href="/" class="btn btn-primary mt-3">
						<Icon name="dashboard" size={16} />
						Volver al Dashboard
					</a>
				</div>
			</main>
		</div>
	</div>
{:else}
	<div class="app-shell" class:compact-tables={preferences.compactTables}>
		<AppSidebar {filteredNavigation} {path} open={mobileOpen} onclose={() => (mobileOpen = false)} {apiOnline} />

		{#if mobileOpen}
			<button
				class="sidebar-scrim"
				type="button"
				aria-label="Cerrar navegación"
				onclick={() => (mobileOpen = false)}
			></button>
		{/if}

		<div class="app-main">
			<AppTopbar
				section={current.section}
				title={current.label}
				onmenu={() => (mobileOpen = true)}
				{apiOnline}
			/>
			<main class="app-content">
				{@render children()}
			</main>
		</div>
	</div>
{/if}

<ToastStack />