<script>
	import { gsap } from 'gsap';
	function animarGrafico(nodo) {
		const medios = gsap.matchMedia();
		medios.add('(prefers-reduced-motion: no-preference)', () => {
			gsap.from(nodo.querySelectorAll('rect'), {
				scaleY: 0.96, transformOrigin: '50% 100%', duration: 0.22,
				stagger: { amount: 0.03 }, ease: 'power2.out', clearProps: 'transform,transformOrigin'
			});
		}, nodo);
		return { destroy: () => medios.revert() };
	}
	export let message = 'No hay datos para graficar en el período.';
	export let legend = [];
	export let filas = [];
	export let series = [];
	export let campoEtiqueta = 'hora';
	export let titulo = 'Movimientos registrados';
	$: maximo = Math.max(1, ...filas.flatMap((fila) => series.map((serie) => Number(fila[serie.clave]) || 0)));
	$: hayDatos = filas.some((fila) => series.some((serie) => Number(fila[serie.clave]) > 0));
</script>

{#if hayDatos}
<svg use:animarGrafico class="grafico" viewBox="0 0 720 250" role="img" aria-label={titulo}>
	<title>{titulo}</title>
	<line x1="42" y1="210" x2="710" y2="210" class="eje" />
	<line x1="42" y1="20" x2="42" y2="210" class="eje" />
	<text x="34" y="25" text-anchor="end">{maximo}</text>
	<text x="34" y="212" text-anchor="end">0</text>
	{#each filas as fila, indice (fila[campoEtiqueta])}
		{#each series as serie, numeroSerie (serie.clave)}
			{#if fila[serie.clave] !== null && fila[serie.clave] !== undefined}
				<rect x={44 + indice * 660 / filas.length + numeroSerie * 660 / filas.length / series.length}
					y={210 - Number(fila[serie.clave]) / maximo * 180}
					width={Math.max(0.4, 660 / filas.length / series.length - 1)}
					height={Math.max(0, Number(fila[serie.clave]) / maximo * 180)}
					class:alternativa={numeroSerie === 1}>
					<title>{fila[campoEtiqueta]} · {serie.label}: {fila[serie.clave]}</title>
				</rect>
			{/if}
		{/each}
		{#if indice % Math.max(1, Math.ceil(filas.length / 8)) === 0}
			<text x={44 + indice * 660 / filas.length} y="233">{campoEtiqueta === 'hora' ? String(fila[campoEtiqueta]).padStart(2, '0') + ':00' : String(fila[campoEtiqueta]).slice(5)}</text>
		{/if}
	{/each}
</svg>
<details class="grafico-datos">
 <summary>Ver datos de {titulo.toLowerCase()}</summary>
 <p>Valores de {series.map(serie => serie.label).join(' y ')} por {campoEtiqueta === 'hora' ? 'hora' : 'fecha'}.</p>
 <div class="table-wrap" role="region" aria-label={'Datos de ' + titulo}>
  <table class="data-table"><caption class="visually-hidden">{titulo}</caption>
   <thead><tr><th scope="col">{campoEtiqueta === 'hora' ? 'Hora' : 'Fecha'}</th>{#each series as serie (serie.clave)}<th scope="col">{serie.label}</th>{/each}</tr></thead>
   <tbody>{#each filas as fila (fila[campoEtiqueta])}<tr><th scope="row">{campoEtiqueta === 'hora' ? String(fila[campoEtiqueta]).padStart(2, '0') + ':00' : fila[campoEtiqueta]}</th>{#each series as serie (serie.clave)}<td>{fila[serie.clave] ?? 'Sin datos'}</td>{/each}</tr>{/each}</tbody>
  </table>
 </div>
</details>
{:else}
<div class="chart-empty">{message}</div>
{/if}
{#if legend.length}
	<div class="chart-legend mt-2">
		{#each legend as item (item.label)}
			<span><i class:accent={item.tone === 'accent'} class:alt={item.tone === 'alt'}></i>{item.label}</span>
		{/each}
	</div>
{/if}

<style>
 .grafico-datos { margin-top: .75rem; }
 summary { cursor: pointer; padding: .5rem 0; min-height: 44px; color: var(--accent-strong); }
	.grafico { width: 100%; height: auto; min-height: 160px; display: block; }
	.eje { stroke: var(--line-strong); stroke-width: 1; }
	text { fill: var(--text-soft); font: 11px var(--font-ui); }
	rect { fill: var(--accent); }
	rect.alternativa { fill: var(--info); }
</style>
