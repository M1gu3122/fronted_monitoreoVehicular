<script>
	import Icon from './Icon.svelte';

	export let open = false;
 export let movil = false;
 export let oncerrar = () => {};
	export let path = '/';
	export let grupos = [];
 export let inicio = '/';

	function estaActivo(ruta, href) {
		if (href === '/') return ruta === '/';
		return ruta === href || ruta.startsWith(href + '/');
	}
</script>

<aside id="navegacion-principal" class="app-sidebar" class:open inert={movil && !open} aria-label="Navegación principal">
 {#if movil && open}<button class="btn btn-quiet btn-icon align-self-end m-2" type="button" aria-label="Cerrar navegación" on:click={oncerrar}><Icon name="close" /></button>{/if}
	<a class="app-sidebar__brand" href={inicio} aria-label="Ir al inicio">
		<span class="brand-mark">
			<Icon name="camera" size={19} stroke={1.7} />
		</span>
		<span class="brand-copy">
			<strong>LPR CONTROL</strong>
			<span>Flujo vehicular · concesionario</span>
		</span>
	</a>

	<div class="app-sidebar__scroll">
		{#each grupos as grupo (grupo.label)}
			<div class="nav-section">
				<div class="nav-section__title">{grupo.label}</div>
				<nav aria-label={grupo.label}>
					{#each grupo.items as item (item.href)}
						<a
							href={item.href}
							class="nav-link-app"
							class:active={estaActivo(path, item.href)}
							aria-current={estaActivo(path, item.href) ? 'page' : undefined}
						>
							<Icon name={item.icon} size={17} />
							<span>{item.label}</span>
						</a>
					{/each}
				</nav>
			</div>
		{/each}
	</div>
</aside>
