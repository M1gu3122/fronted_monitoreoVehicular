<script>
	let { eyebrow = '', title = '', description = '', actions } = $props();
</script>

<header class="page-header">
	<div class="page-header__copy">
		{#if eyebrow}<div class="eyebrow">{eyebrow}</div>{/if}
		<h2>{title}</h2>
		{#if description}<p>{description}</p>{/if}
	</div>
	{#if actions}
		<div class="page-header__actions">
			{@render actions()}
		</div>
	{/if}
</header>
