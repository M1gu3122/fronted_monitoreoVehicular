<script>
	import { formatNumber } from '#lib/utils/format.js';

	let {
		items = [],
		height = 190,
		valueLabel = 'Valor',
		emptyMessage = 'No hay datos para graficar en el período.',
		showEvery = 1
	} = $props();

	const width = 640;
	const pad = { top: 12, right: 10, bottom: 24, left: 32 };
	const plotWidth = $derived(width - pad.left - pad.right);
	const plotHeight = $derived(height - pad.top - pad.bottom);
	const maxValue = $derived(Math.max(1, ...items.map((item) => Number(item.value) || 0)));
	const ticks = $derived([0, 0.25, 0.5, 0.75, 1]);

	function x(index) {
		if (items.length <= 1) return pad.left + plotWidth / 2;
		return pad.left + (index / (items.length - 1)) * plotWidth;
	}

	function y(value) {
		return pad.top + plotHeight - (Number(value) / maxValue) * plotHeight;
	}

	const linePath = $derived(
		items.map((item, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(item.value).toFixed(1)}`).join(' ')
	);

	const areaPath = $derived(
		items.length
			? `${linePath} L${x(items.length - 1).toFixed(1)},${pad.top + plotHeight} L${pad.left},${pad.top + plotHeight} Z`
			: ''
	);
</script>

{#if !items.length}
	<div class="chart-empty">{emptyMessage}</div>
{:else}
	<div class="chart">
		<svg viewBox="0 0 {width} {height}" role="img" aria-label="Gráfica de evolución">
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

			<path class="area-path" d={areaPath}></path>
			<path class="line-path" d={linePath}></path>

			{#each items as item, index (item.label)}
				<circle class="point" cx={x(index)} cy={y(item.value)} r="3">
					<title>{item.label} · {valueLabel}: {formatNumber(item.value)}</title>
				</circle>
				{#if index % showEvery === 0 || items.length <= 12}
					<text class="axis-label" x={x(index)} y={height - 7} text-anchor="middle">{item.label}</text>
				{/if}
			{/each}
		</svg>
	</div>
{/if}
