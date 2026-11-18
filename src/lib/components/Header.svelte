<script>
	import Icon from './Icon.svelte';

	export let seccion = 'Operación';
	export let titulo = 'Dashboard';
	export let onmenu = () => {};
 export let menuAbierto = false;
 export let usuario = null;
 export let onsalir = () => {};
 export let saliendo = false;
 $: iniciales = (usuario?.nombre || '').trim().split(/\s+/).slice(0, 2).map(parte => parte.charAt(0)).join('').toUpperCase();
</script>

<header class="app-topbar">
	<button
		class="btn btn-quiet btn-icon mobile-menu-btn"
		type="button"
		on:click={onmenu}
  aria-expanded={menuAbierto} aria-controls="navegacion-principal"
		aria-label="Abrir navegación"
	>
		<Icon name="menu" size={18} />
	</button>

	<div class="app-topbar__title">
		<div class="eyebrow">{seccion}</div>
		<h1>{titulo}</h1>
	</div>

	<div class="app-topbar__tools">
		

		<div class="user-chip">
			<span class="user-chip__avatar">{iniciales}</span>
			<span class="user-chip__meta">
				<strong>{usuario?.nombre || 'Usuario'}</strong>
				<span>{usuario?.rol || 'Sin rol asignado'}</span>
			</span>
		</div>
		<button class="btn btn-quiet btn-icon" type="button" title="Cerrar sesión" aria-label="Cerrar sesión" on:click={onsalir} disabled={saliendo}>
			<Icon name="logout" size={16} />
		</button>
	</div>
</header>
