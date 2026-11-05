<script>
	let { rows = 5, message = 'Cargando información…' } = $props();
</script>

<div class="panel__body" aria-busy="true" aria-live="polite">
	<p class="text-faint fs-8 mb-3">{message}</p>
	<div class="stack-sm">
		{#each Array(rows) as _, index (index)}
			<div class="skeleton" style="height: {index === 0 ? 20 : 34}px;"></div>
		{/each}
	</div>
</div>
