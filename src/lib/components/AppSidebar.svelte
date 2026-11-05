<script>
	import { page } from '$app/state';
	import Icon from './Icon.svelte';

	let { open = false, onclose = () => {}, apiOnline = null, filteredNavigation = [], path = '' } = $props();

	const currentPath = $derived(path || page.url.pathname || '/');

	function isItemActive(href) {
		if (!currentPath || !href) return false;
		if (href === '/') return currentPath === '/';
		return currentPath === href || currentPath.startsWith(href + '/');
	}

	// Usar la navegación filtrada proporcionada por el layout
	const groups = $derived(
		(filteredNavigation || [])
			.map((group) => ({
				...group,
				items: group.items || []
			}))
			.filter((group) => group.items.length > 0)
	);
</script>

<aside class="app-sidebar" class:open aria-label="Navegación principal">
	<a class="app-sidebar__brand" href="/" onclick={onclose} aria-label="Ir al dashboard">
		<span class="brand-mark">
			<Icon name="camera" size={19} stroke={1.7} />
		</span>
		<span class="brand-copy">
			<strong>LPR CONTROL</strong>
			<span>Flujo vehicular · concesionario</span>
		</span>
	</a>

	<div class="app-sidebar__scroll">
		{#each groups as group (group.label)}
			<div class="nav-section">
				<div class="nav-section__title">{group.label}</div>
				<nav>
					{#each group.items as item (item.href)}
						<a
							href={item.href}
							class:active={isItemActive(item.href)}
							class="nav-link-app"
							aria-current={isItemActive(item.href) ? 'page' : undefined}
							onclick={onclose}
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