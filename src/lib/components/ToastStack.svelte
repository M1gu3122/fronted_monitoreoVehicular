<script>
	import Icon from './Icon.svelte';
	import { toasts, dismissToast } from '#lib/stores/toasts.svelte.js';
</script>

<div class="toast-stack" aria-live="polite" aria-atomic="false">
	{#each toasts as toast (toast.id)}
		<div class="toast-app" class:error={toast.type === 'error'} role="status">
			<Icon name={toast.type === 'error' ? 'alert' : 'check'} size={17} />
			<div class="toast-body-text">
				<strong>{toast.title}</strong>
				{#if toast.message}<span>{toast.message}</span>{/if}
			</div>
			<button type="button" onclick={() => dismissToast(toast.id)} aria-label="Cerrar notificación">
				<Icon name="close" size={14} />
			</button>
		</div>
	{/each}
</div>
