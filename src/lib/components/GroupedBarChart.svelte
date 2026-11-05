<script>
	import { formatNumber } from '#lib/utils/format.js';

	let {
		items = [],
		series = [],
		height = 190,
		emptyMessage = 'No hay datos para graficar en el período.',
		showEvery = 1
	} = $props();

	const width = 640;
	const pad = { top: 12, right: 8, bottom: 24, left: 32 };
	const plotWidth = $derived(width - pad.left - pad.right);
	const plotHeight = $derived(height - pad.top - pad.bottom);
	const maxValue = $derived(
		Math.max(
			1,
			...items.flatMap((item) => series.map((serie) => Number(item.values?.[serie.key]) || 0))
		)
	);
	const ticks = $derived([0, 0.25, 0.5, 0.75, 1]);
	const groupWidth = $derived(items.length ? plotWidth / items.length : plotWidth);
	const barWidth = $derived(Math.max(3, Math.min(16, (groupWidth - 6) / Math.max(series.length, 1))));

	function y(value) {
		return pad.top + plotHeight - (Number(value) / maxValue) * plotHeight;
	}

	function xGroup(index) {
		return pad.left + index * groupWidth + groupWidth / 2;
	}
</script>

{#if !items.length}
	<div class="chart-empty">{emptyMessage}</div>
{:else}
	<div class="chart">
		<svg viewBox="0 0 {width} {height}" role="img" aria-label="Gráfica de barras agrupadas">
			{#each ticks as tick (tick)}
				<line
					class="grid-line"
					x1={pad.left}
					x2={width - pad.right}
					y1={pad.top + plotHeight * (1 - tick)}
					y2={pad.top + plotHeight * (1 - tick)}
				/>
				<text class="axis-label" x={pad.left - 6} y={pad.top + plotHeight * (1 - tick) + 3} text-anchor="end">
					{formatNumber(Math.round(maxValue * tick))}
				</text>
			{/each}

			{#each items as item, index (item.label)}
				{#each series as serie, serieIndex (serie.key)}
					{@const value = Number(item.values?.[serie.key]) || 0}
					{@const totalBars = series.length}
					{@const offset = (serieIndex - (totalBars - 1) / 2) * barWidth}
					<rect
						class="bar {serie.tone === 'accent' ? 'bar--accent' : serie.tone === 'alt' ? 'bar--alt' : ''}"
						x={xGroup(index) + offset - barWidth / 2}
						y={y(value)}
						width={barWidth}
						height={Math.max(0, pad.top + plotHeight - y(value))}
						rx="1.5"
					>
						<title>{serie.label} · {item.label}: {formatNumber(value)}</title>
					</rect>
				{/each}
				{#if index % showEvery === 0 || items.length <= 14}
					<text
						class="axis-label"
						x={xGroup(index)}
						y={height - 7}
						text-anchor="middle"
					>{item.label}</text>
				{/if}
			{/each}
		</svg>
		<div class="chart-legend mt-2">
			{#each series as serie (serie.key)}
				<span><i class:accent={serie.tone === 'accent'} class:alt={serie.tone === 'alt'}></i>{serie.label}</span>
			{/each}
		</div>
	</div>
{/if}
