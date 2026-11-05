<script>
	import { goto } from '$app/navigation';
	import Icon from './Icon.svelte';
	import { initials } from '#lib/utils/domain.js';
	import {
		session,
		isGuest,
		sessionLabel,
		sessionRoleLabel,
		logout
	} from '#lib/stores/session.svelte.js';

	let { section = 'Operación', title = 'Dashboard', onmenu = () => {}, apiOnline = null } = $props();

	let busy = $state(false);

	async function handleLogout() {
		busy = true;
		await logout();
		busy = false;
		await goto('/login', { replace: true });
	}

	function refresh() {
		window.dispatchEvent(new CustomEvent('lpr:refresh'));
	}
</script>

<header class="app-topbar">
	<button
		class="btn btn-quiet btn-icon mobile-menu-btn"
		type="button"
		onclick={onmenu}
		aria-label="Abrir navegación"
	>
		<Icon name="menu" size={18} />
	</button>

	<div class="app-topbar__title">
		<div class="eyebrow">{section}</div>
		<h1>{title}</h1>
	</div>

	<div class="app-topbar__tools">


		<button class="btn btn-quiet btn-icon d-none d-md-inline-grid" type="button" onclick={refresh} title="Actualizar datos de la página" aria-label="Actualizar datos">
			<Icon name="refresh" size={16} />
		</button>

		{#if isGuest()}
			<a href="/login" class="user-chip text-decoration-none">
				<span class="user-chip__avatar">
					<Icon name="lock" size={14} />
				</span>
				<span class="user-chip__meta">
					<strong>Sin sesión</strong>
					<span>Acceso limitado</span>
				</span>
			</a>
		{:else}
			<div class="user-chip" title={session.user?.correo || sessionLabel()}>
				<span class="user-chip__avatar">{initials(sessionLabel())}</span>
				<span class="user-chip__meta">
					<strong>{sessionLabel()}</strong>
					<span>{sessionRoleLabel()}</span>
				</span>
			</div>
			<button
				class="btn btn-quiet btn-icon"
				type="button"
				onclick={handleLogout}
				disabled={busy}
				title="Cerrar sesión"
				aria-label="Cerrar sesión"
			>
				{#if busy}
					<span class="spinner-inline"></span>
				{:else}
					<Icon name="logout" size={16} />
				{/if}
			</button>
		{/if}
	</div>
</header>
