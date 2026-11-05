<script>
	import Icon from './Icon.svelte';

	let {
		title = 'No fue posible cargar la información',
		message = 'Verifique la conexión con el backend e intente nuevamente.',
		onretry = () => {},
		retryLabel = 'Reintentar',
		hint = ''
	} = $props();
</script>

<div class="alert-app mb-3" role="alert">
	<Icon name="alert" size={18} />
	<div>
		<strong>{title}</strong>
		<span>{message}</span>
		{#if hint}
			<div class="fs-8 text-faint mt-2">{hint}</div>
		{/if}
	</div>
</div>
{#if onretry}
	<button class="btn btn-quiet" type="button" onclick={onretry}>
		<Icon name="refresh" size={15} />
		{retryLabel}
	</button>
{/if}
