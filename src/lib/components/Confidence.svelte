<script>
	import { formatConfidence, confidenceClass } from '#lib/utils/format.js';

	let { value = null } = $props();
	const parsed = $derived(formatConfidence(value));
</script>

{#if parsed}
	<span class="confidence {confidenceClass(parsed.ratio)}" title="Nivel de confianza reportado por el backend">
		<span class="confidence__bar"><span style="width: {Math.round(parsed.ratio * 100)}%"></span></span>
		{parsed.label}
	</span>
{:else}
	<span class="text-faint fs-8">—</span>
{/if}
