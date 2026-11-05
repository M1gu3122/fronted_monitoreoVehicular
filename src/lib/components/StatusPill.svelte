<script>
	let { tone = 'neutral', label = '', dot = true } = $props();
</script>

<span class="pill pill--{tone}">
	{#if dot}<span class="dot"></span>{/if}
	{label}
</span>
