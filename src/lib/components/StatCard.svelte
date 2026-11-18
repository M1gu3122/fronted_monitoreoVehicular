<script>
	import Icon from './Icon.svelte';

	export let label = '';
	export let valor = '—';
	export let unit = '';
	export let icon = 'activity';
	export let foot = '';
	export let tone = '';
	export let href = null;

	$: etiqueta = href ? 'a' : 'div';
</script>

<svelte:element
	this={etiqueta}
	{href}
	class="stat-card"
	class:stat-card--accent={tone === 'accent'}
	class:stat-card--warn={tone === 'warn'}
	class:stat-card--danger={tone === 'danger'}
	class:stat-card--ok={tone === 'ok'}
	class:stat-card--info={tone === 'info'}
>
	<div class="stat-card__top">
		<span class="stat-card__icon"><Icon name={icon} size={15} /></span>
		<span>{label}</span>
	</div>
	<div class="stat-card__value">
		{valor ?? '—'}{#if unit}<small>{unit}</small>{/if}
	</div>
	{#if foot}
		<div class="stat-card__foot">{foot}</div>
	{/if}
</svelte:element>
