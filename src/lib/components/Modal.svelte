<script>
	let {
		open = false,
		title = '',
		subtitle = '',
		onclose = () => {},
		children,
		footer,
		size = 'md'
	} = $props();

	let dialogEl = $state(null);
	const titleId = `modal-title-${Math.random().toString(36).slice(2, 8)}`;

	$effect(() => {
		if (!dialogEl) return;
		if (open && !dialogEl.open) {
			dialogEl.showModal();
		}
		if (!open && dialogEl.open) {
			dialogEl.close();
		}
	});

	function handleCancel(event) {
		event.preventDefault();
		onclose();
	}

	function handleBackdrop(event) {
		if (event.target === dialogEl) onclose();
	}
</script>

<dialog
	bind:this={dialogEl}
	class="modal-app"
	class:modal-app--lg={size === 'lg'}
	class:modal-app--sm={size === 'sm'}
	oncancel={handleCancel}
	onclick={handleBackdrop}
	aria-labelledby={titleId}
>
	<div class="modal-app__head">
		<div>
			<h3 id={titleId}>{title}</h3>
			{#if subtitle}<p>{subtitle}</p>{/if}
		</div>
		<button class="modal-app__close" type="button" onclick={onclose} aria-label="Cerrar ventana">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
		</button>
	</div>
	<div class="modal-app__body">
		{@render children()}
	</div>
	{#if footer}
		<div class="modal-app__foot">
			{@render footer()}
		</div>
	{/if}
</dialog>
