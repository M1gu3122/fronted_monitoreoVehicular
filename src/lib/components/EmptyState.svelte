<script>
	import Icon from './Icon.svelte';

	export let icon = 'search';
	export let title = 'Sin resultados';
	export let message = 'No hay información para mostrar con los criterios actuales.';
	export let actionLabel = '';
	export let tone = '';
</script>

<div
	class="state-block"
	class:state-block--warn={tone === 'warn'}
	class:state-block--danger={tone === 'danger'}
>
	<div class="state-block__icon"><Icon name={icon} size={22} /></div>
	<h4>{title}</h4>
	<p>{message}</p>
	{#if actionLabel}
		<button class="btn btn-quiet" type="button">{actionLabel}</button>
	{/if}
</div>
