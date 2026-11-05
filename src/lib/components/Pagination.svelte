<script>
	import Icon from './Icon.svelte';

	let {
		page = 1,
		pages = 1,
		total = 0,
		from = 0,
		to = 0,
		onchange = () => {},
		label = 'registros'
	} = $props();

	const visiblePages = $derived.by(() => {
		const list = [];
		const start = Math.max(1, page - 2);
		const end = Math.min(pages, page + 2);
		for (let index = start; index <= end; index += 1) list.push(index);
		return list;
	});
</script>

<div class="table-foot">
	<span>
		{#if total === 0}
			Sin {label}
		{:else}
			Mostrando <strong>{from}–{to}</strong> de <strong>{total}</strong> {label}
		{/if}
	</span>
	<nav class="d-flex align-items-center gap-1" aria-label="Paginación">
		<button
			class="btn btn-quiet btn-icon btn-xs"
			type="button"
			onclick={() => onchange(page - 1)}
			disabled={page <= 1}
			aria-label="Página anterior"
		>
			<Icon name="chevron-left" size={14} />
		</button>
		{#each visiblePages as number (number)}
			<button
				class="btn btn-xs {number === page ? 'btn-ink' : 'btn-quiet'}"
				type="button"
				onclick={() => onchange(number)}
				aria-current={number === page ? 'page' : undefined}
			>
				{number}
			</button>
		{/each}
		<button
			class="btn btn-quiet btn-icon btn-xs"
			type="button"
			onclick={() => onchange(page + 1)}
			disabled={page >= pages}
			aria-label="Página siguiente"
		>
			<Icon name="chevron-right" size={14} />
		</button>
	</nav>
</div>
