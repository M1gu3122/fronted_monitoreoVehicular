<script>
	export let tone = 'neutral';
	export let label = '';
	export let dot = true;
</script>

<span class="pill pill--{tone}">
	{#if dot}<span class="dot"></span>{/if}
	{label}
</span>
