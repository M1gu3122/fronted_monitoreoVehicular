<script>
	import Icon from './Icon.svelte';

	let {
		label = '',
		value = '—',
		unit = '',
		icon = 'activity',
		foot = '',
		tone = '',
		href = null,
		disabled = false
	} = $props();

	const tag = $derived(href && !disabled ? 'a' : 'div');
</script>

<svelte:element this={tag} href={href} class="stat-card" class:stat-card--accent={tone === 'accent'} class:stat-card--warn={tone === 'warn'} class:stat-card--danger={tone === 'danger'} class:stat-card--ok={tone === 'ok'} class:stat-card--info={tone === 'info'} class:stat-card--disabled={disabled}>
	<div class="stat-card__top">
		<span class="stat-card__icon"><Icon name={icon} size={15} /></span>
		<span>{label}</span>
	</div>
	<div class="stat-card__value">
		{value}{#if unit}<small>{unit}</small>{/if}
	</div>
	{#if foot}
		<div class="stat-card__foot">{foot}</div>
	{/if}
</svelte:element>
