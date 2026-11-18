<script>
	import Icon from './Icon.svelte';

	export let label = 'registros';
</script>

<div class="table-foot">
	<span>Sin {label}</span>
	<nav class="d-flex align-items-center gap-1" aria-label="Paginación">
		<button class="btn btn-quiet btn-icon btn-xs" type="button" disabled aria-label="Página anterior">
			<Icon name="chevron-left" size={14} />
		</button>
		<button class="btn btn-xs btn-ink" type="button" aria-current="page">1</button>
		<button class="btn btn-quiet btn-icon btn-xs" type="button" disabled aria-label="Página siguiente">
			<Icon name="chevron-right" size={14} />
		</button>
	</nav>
</div>
