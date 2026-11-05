<script>
	import Icon from './Icon.svelte';

	let {
		icon = 'search',
		title = 'Sin resultados',
		message = 'No hay información para mostrar con los criterios actuales.',
		actionLabel = '',
		onaction = () => {},
		tone = ''
	} = $props();
</script>

<div class="state-block" class:state-block--warn={tone === 'warn'} class:state-block--danger={tone === 'danger'}>
	<div class="state-block__icon"><Icon name={icon} size={22} /></div>
	<h4>{title}</h4>
	<p>{message}</p>
	{#if actionLabel}
		<button class="btn btn-quiet" type="button" onclick={onaction}>{actionLabel}</button>
	{/if}
</div>
