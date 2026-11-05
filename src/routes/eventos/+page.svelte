<script>
	import { onMount } from 'svelte';
	import PageHeader from '#lib/components/PageHeader.svelte';
	import Pagination from '#lib/components/Pagination.svelte';
	import Confidence from '#lib/components/Confidence.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import StatusPill from '#lib/components/StatusPill.svelte';
	import LoadingState from '#lib/components/LoadingState.svelte';
	import ErrorState from '#lib/components/ErrorState.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import { listarEventos } from '#lib/service/eventos.js';
	import { listarCamaras } from '#lib/service/camaras.js';
	import { listarZonas } from '#lib/service/zonas.js';
	import { errorMessage } from '#lib/service/client.js';
	import { preferences } from '#lib/stores/preferences.svelte.js';
	import { toastError } from '#lib/stores/toasts.svelte.js';
	import {
		formatDateTime,
		formatNumber,
		formatPercent,
		isToday,
		parseDate,
		dayKey
	} from '#lib/utils/format.js';
	import { eventLabel } from '#lib/utils/domain.js';
	import { includesText, paginate, toCsv, downloadCsv, dateToStamp } from '#lib/utils/data.js';

	let eventos = $state([]);
	let camaras = $state([]);
	let zonas = $state([]);
	let loading = $state(true);
	let error = $state('');
	let warnings = $state([]);
	let lastUpdated = $state(null);

	const today = new Date();
	const weekAgo = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
	const toDateInput = (date) =>
		`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

	let search = $state('');
	let tipoFilter = $state('');
	let camaraFilter = $state('');
	let zonaFilter = $state('');
	let desde = $state(toDateInput(weekAgo));
	let hasta = $state(toDateInput(today));
	let confianzaFilter = $state('todas');
	let pageNumber = $state(1);
	let detail = $state(null);

	const cameraById = $derived(new Map(camaras.map((item) => [Number(item.id_camara), item])));
	const zoneById = $derived(new Map(zonas.map((item) => [Number(item.id_zona), item])));

	const tipos = $derived(
		[...new Set(eventos.map((item) => item.tipo_evento).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'))
	);

	const filtered = $derived.by(() => {
		const fromStamp = desde ? new Date(`${desde}T00:00:00`).getTime() : null;
		const toStamp = hasta ? new Date(`${hasta}T23:59:59`).getTime() : null;
		return eventos
			.filter((evento) => {
				const stamp = parseDate(evento.fecha_hora)?.getTime() ?? null;
				if (fromStamp !== null && (stamp === null || stamp < fromStamp)) return false;
				if (toStamp !== null && (stamp === null || stamp > toStamp)) return false;
				if (tipoFilter && evento.tipo_evento !== tipoFilter) return false;
				if (camaraFilter && Number(evento.id_camara) !== Number(camaraFilter)) return false;
				if (zonaFilter && Number(zoneOf(evento)?.id_zona) !== Number(zonaFilter)) return false;
				if (confianzaFilter !== 'todas') {
					const value = Number(evento.confianza);
					if (!Number.isFinite(value) || value < Number(confianzaFilter)) return false;
				}
				if (search) {
					const camera = cameraById.get(Number(evento.id_camara));
					const haystack = [evento.tipo_evento, evento.id_evento, evento.id_visita, camera?.nombre, eventLabel(evento.tipo_evento).label]
						.filter(Boolean)
						.join(' ');
					if (!includesText(haystack, search)) return false;
				}
				return true;
			})
			.sort((a, b) => (parseDate(b.fecha_hora)?.getTime() || 0) - (parseDate(a.fecha_hora)?.getTime() || 0));
	});

	const paged = $derived(paginate(filtered, pageNumber, Number(preferences.pageSize) || 10));

	const stats = $derived.by(() => {
		const withConfidence = filtered.filter((item) => Number.isFinite(Number(item.confianza)) && item.confianza !== null);
		const avg = withConfidence.length
			? withConfidence.reduce((total, item) => total + Number(item.confianza), 0) / withConfidence.length
			: null;
		const high = withConfidence.filter((item) => Number(item.confianza) >= 0.85).length;
		const days = new Set(filtered.map((item) => dayKey(item.fecha_hora)).filter(Boolean));
		return {
			total: filtered.length,
			today: eventos.filter((item) => isToday(item.fecha_hora)).length,
			high,
			avg,
			days: days.size
		};
	});

	const typeBreakdown = $derived.by(() => {
		const counts = new Map();
		for (const evento of filtered) {
			const key = evento.tipo_evento || 'sin-tipo';
			counts.set(key, (counts.get(key) || 0) + 1);
		}
		const max = Math.max(1, ...counts.values());
		return [...counts.entries()]
			.map(([key, count]) => ({ key, count, width: Math.round((count / max) * 100) }))
			.sort((a, b) => b.count - a.count)
			.slice(0, 6);
	});

	function zoneOf(evento) {
		const direct = evento.id_zona ? zoneById.get(Number(evento.id_zona)) : null;
		if (direct) return direct;
		const camera = cameraById.get(Number(evento.id_camara));
		return camera ? zoneById.get(Number(camera.id_zona)) || null : null;
	}

	function cameraOf(evento) {
		return cameraById.get(Number(evento.id_camara)) || null;
	}

	async function load(silent = false) {
		if (!silent) loading = true;
		error = '';
		warnings = [];
		const results = await Promise.allSettled([listarEventos(), listarCamaras(), listarZonas()]);
		if (results[0].status === 'fulfilled') eventos = Array.isArray(results[0].value) ? results[0].value : [];
		else {
			eventos = [];
			error = errorMessage(results[0].reason);
		}
		if (results[1].status === 'fulfilled') camaras = Array.isArray(results[1].value) ? results[1].value : [];
		else warnings.push('Cámaras');
		if (results[2].status === 'fulfilled') zonas = Array.isArray(results[2].value) ? results[2].value : [];
		else warnings.push('Zonas');
		lastUpdated = new Date();
		loading = false;
	}

	onMount(() => {
		load();
		const handleRefresh = () => load(true);
		window.addEventListener('lpr:refresh', handleRefresh);
		return () => window.removeEventListener('lpr:refresh', handleRefresh);
	});

	function resetFilters() {
		search = '';
		tipoFilter = '';
		camaraFilter = '';
		zonaFilter = '';
		desde = toDateInput(weekAgo);
		hasta = toDateInput(today);
		confianzaFilter = 'todas';
		pageNumber = 1;
	}

	function clearDates() {
		desde = '';
		hasta = '';
		pageNumber = 1;
	}

	function exportCsv() {
		if (!filtered.length) {
			toastError('Sin datos para exportar', 'No hay eventos con los filtros actuales.');
			return;
		}
		const rows = filtered.map((evento) => {
			const camera = cameraOf(evento);
			const zona = zoneOf(evento);
			return {
				id_evento: evento.id_evento,
				fecha_hora: evento.fecha_hora,
				tipo_evento: evento.tipo_evento,
				etiqueta: eventLabel(evento.tipo_evento).label,
				camara: camera?.nombre || '',
				zona: zona?.nombre || '',
				id_visita: evento.id_visita ?? '',
				id_seguimiento: evento.id_seguimiento ?? '',
				confianza: evento.confianza ?? '',
				estado: evento.estado ?? ''
			};
		});
		const csv = toCsv(rows, [
			{ label: 'ID', value: 'id_evento' },
			{ label: 'Fecha y hora', value: 'fecha_hora' },
			{ label: 'Tipo', value: 'tipo_evento' },
			{ label: 'Etiqueta', value: 'etiqueta' },
			{ label: 'Cámara', value: 'camara' },
			{ label: 'Zona', value: 'zona' },
			{ label: 'Visita', value: 'id_visita' },
			{ label: 'Seguimiento', value: 'id_seguimiento' },
			{ label: 'Confianza', value: 'confianza' },
			{ label: 'Estado', value: 'estado' }
		]);
		downloadCsv(`eventos_${dateToStamp()}.csv`, csv);
	}
</script>

<PageHeader
	eyebrow="Trazabilidad"
	title="Eventos"
	description="Explorador de eventos generados por el sistema de visión. La confianza se muestra tal como la reporta el backend, sin recalcularla."
>
	{#snippet actions()}
		<button class="btn btn-quiet" type="button" onclick={() => load(true)}>
			<Icon name="refresh" size={15} />
			Actualizar
		</button>
		<button class="btn btn-quiet" type="button" onclick={exportCsv}>
			<Icon name="download" size={15} />
			Exportar CSV
		</button>
	{/snippet}
</PageHeader>

{#if loading}
	<div class="panel"><LoadingState rows={8} message="Consultando eventos…" /></div>
{:else if error}
	<div class="panel">
		<div class="panel__body">
			<ErrorState title="No fue posible cargar los eventos" message={error} onretry={() => load()} />
		</div>
	</div>
{:else}
	{#if warnings.length}
		<div class="alert-app alert-app--warn mb-3">
			<Icon name="alert" size={17} />
			<div>
				<strong>Información parcial</strong>
				<span>{warnings.join(' y ')} no pudieron cargarse. Algunos nombres de cámara o zona pueden no mostrarse.</span>
			</div>
		</div>
	{/if}

	<div class="row mb-3">
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Eventos en el filtro</div>
				<div class="stat-card__value mt-1">{formatNumber(stats.total)}</div>
				<div class="fs-8 text-faint">{stats.days} {stats.days === 1 ? 'día con registros' : 'días con registros'}</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Eventos hoy</div>
				<div class="stat-card__value mt-1">{formatNumber(stats.today)}</div>
				<div class="fs-8 text-faint">sin aplicar filtros de fecha</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Alta confianza</div>
				<div class="stat-card__value mt-1">{formatNumber(stats.high)}</div>
				<div class="fs-8 text-faint">≥ 85 % en el filtro</div>
			</div>
		</div>
		<div class="col-6 col-lg-3">
			<div class="panel p-3 h-100">
				<div class="eyebrow-plain">Confianza promedio</div>
				<div class="stat-card__value mt-1">{stats.avg !== null ? formatPercent(stats.avg * 100, 1) : '—'}</div>
				<div class="fs-8 text-faint">sobre eventos medidos</div>
			</div>
		</div>
	</div>

	<section class="panel">
		<div class="panel__head">
			<div>
				<h3>Explorador de eventos</h3>
				<p>{paged.total} eventos · última actualización {lastUpdated ? formatDateTime(lastUpdated) : '—'}</p>
			</div>
			{#if typeBreakdown.length}
				<div class="type-breakdown">
					{#each typeBreakdown as item (item.key)}
						<div class="type-breakdown__row">
							<span class="type-breakdown__label">{eventLabel(item.key).label}</span>
							<span class="type-breakdown__track"><span style={`width: ${item.width}%`}></span></span>
							<span class="type-breakdown__value">{item.count}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<div class="filter-bar">
			<div class="filter-field filter-field--grow">
				<label for="ev-search">Buscar</label>
				<div class="input-group input-group-sm">
					<span class="input-group-text"><Icon name="search" size={14} /></span>
					<input id="ev-search" class="form-control form-control-sm" placeholder="Tipo, etiqueta, cámara o visita" bind:value={search} oninput={() => (pageNumber = 1)} />
				</div>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="ev-tipo">Tipo</label>
				<select id="ev-tipo" class="form-select form-select-sm" bind:value={tipoFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todos</option>
					{#each tipos as tipo (tipo)}
						<option value={tipo}>{eventLabel(tipo).label}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="ev-camara">Cámara</label>
				<select id="ev-camara" class="form-select form-select-sm" bind:value={camaraFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todas</option>
					{#each camaras as camara (camara.id_camara)}
						<option value={camara.id_camara}>{camara.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--sm">
				<label for="ev-zona">Zona</label>
				<select id="ev-zona" class="form-select form-select-sm" bind:value={zonaFilter} onchange={() => (pageNumber = 1)}>
					<option value="">Todas</option>
					{#each zonas as zona (zona.id_zona)}
						<option value={zona.id_zona}>{zona.nombre}</option>
					{/each}
				</select>
			</div>
			<div class="filter-field filter-field--xs">
				<label for="ev-desde">Desde</label>
				<input id="ev-desde" type="date" class="form-control form-control-sm" bind:value={desde} onchange={() => (pageNumber = 1)} />
			</div>
			<div class="filter-field filter-field--xs">
				<label for="ev-hasta">Hasta</label>
				<input id="ev-hasta" type="date" class="form-control form-control-sm" bind:value={hasta} onchange={() => (pageNumber = 1)} />
			</div>
			<div class="filter-field filter-field--sm">
				<label for="ev-conf">Confianza</label>
				<select id="ev-conf" class="form-select form-select-sm" bind:value={confianzaFilter} onchange={() => (pageNumber = 1)}>
					<option value="todas">Todas</option>
					<option value="0.5">≥ 50 %</option>
					<option value="0.8">≥ 80 %</option>
					<option value="0.9">≥ 90 %</option>
				</select>
			</div>
			<div class="filter-bar__end">
				<button class="btn btn-quiet btn-sm" type="button" onclick={clearDates} title="Quitar límites de fecha">Sin fechas</button>
				<button class="btn btn-quiet btn-sm" type="button" onclick={resetFilters}>
					<Icon name="filter" size={14} />
					Limpiar
				</button>
			</div>
		</div>

		{#if !paged.total}
			<EmptyState
				icon="events"
				title={eventos.length ? 'Sin eventos con estos filtros' : 'No hay eventos registrados'}
				message={eventos.length
					? 'Amplíe el rango de fechas o reduzca las restricciones de tipo, cámara y confianza.'
					: 'El backend aún no reporta eventos de vehículos.'}
				actionLabel={eventos.length ? 'Restablecer filtros' : null}
				onaction={resetFilters}
			/>
		{:else}
			<div class="table-wrap">
				<table class="data-table">
					<thead>
						<tr>
							<th>Fecha y hora</th>
							<th>Evento</th>
							<th>Cámara</th>
							<th>Zona</th>
							<th>Visita</th>
							<th class="num">Confianza</th>
							<th></th>
						</tr>
					</thead>
					<tbody>
						{#each paged.items as evento (evento.id_evento)}
							{@const camera = cameraOf(evento)}
							{@const zona = zoneOf(evento)}
							<tr>
								<td class="nowrap">
									<span class="cell-strong">{formatDateTime(evento.fecha_hora)}</span>
									<span class="cell-sub">ID #{evento.id_evento}</span>
								</td>
								<td>
									<span class="cell-strong">{eventLabel(evento.tipo_evento).label}</span>
									<span class="cell-sub mono">{evento.tipo_evento || 'sin tipo'}</span>
								</td>
								<td class="fs-7">
									{#if camera}
										<span>{camera.nombre}</span>
										<span class="cell-sub">{camera.ubicacion || 'sin ubicación'}</span>
									{:else}
										<span class="text-faint">#{evento.id_camara ?? '—'}</span>
									{/if}
								</td>
								<td class="fs-7">{#if zona}{zona.nombre}{:else}<span class="text-faint">—</span>{/if}</td>
								<td>
									{#if evento.id_visita}
										<a class="text-link" href={`/visitas/${evento.id_visita}`}>#{evento.id_visita}</a>
									{:else}
										<span class="text-faint">—</span>
									{/if}
								</td>
								<td class="num">
									{#if evento.confianza !== null && evento.confianza !== undefined}
										<Confidence value={evento.confianza} />
									{:else}
										<span class="text-faint">—</span>
									{/if}
								</td>
								<td class="text-end">
									<button class="btn btn-quiet btn-icon btn-xs" type="button" onclick={() => (detail = evento)} title="Ver detalle" aria-label={`Ver evento ${evento.id_evento}`}>
										<Icon name="eye" size={14} />
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<Pagination page={paged.page} pages={paged.pages} total={paged.total} from={paged.from} to={paged.to} onchange={(next) => (pageNumber = next)} label="eventos" />
		{/if}
		<div class="panel__foot">
			El rango de fechas se aplica en zona local del navegador. Los eventos sin fecha válida se excluyen cuando hay un rango activo.
		</div>
	</section>
{/if}

<Modal open={Boolean(detail)} onclose={() => (detail = null)} title={detail ? eventLabel(detail.tipo_evento).label : 'Evento'} subtitle={detail ? `Registro #${detail.id_evento}` : ''} size="lg">
	{#if detail}
		{@const camera = cameraOf(detail)}
		{@const zona = zoneOf(detail)}
		<div class="row g-3">
			<div class="col-12 col-md-6">
				<div class="detail-grid">
					<div><dt>Fecha y hora</dt><dd>{formatDateTime(detail.fecha_hora)}</dd></div>
					<div><dt>Tipo</dt><dd><span class="mono">{detail.tipo_evento || '—'}</span></dd></div>
					<div>
						<dt>Confianza</dt>
						<dd>{#if detail.confianza !== null && detail.confianza !== undefined}<Confidence value={detail.confianza} />{:else}—{/if}</dd>
					</div>
					<div><dt>Estado</dt><dd>{detail.estado ?? '—'}</dd></div>
					<div><dt>Cámara</dt><dd>{camera?.nombre || `#${detail.id_camara ?? '—'}`}</dd></div>
					<div><dt>Zona</dt><dd>{zona?.nombre || `#${detail.id_zona ?? '—'}`}</dd></div>
				</div>
			</div>
			<div class="col-12 col-md-6">
				<div class="detail-grid">
					<div>
						<dt>Visita</dt>
						<dd>{#if detail.id_visita}<a class="text-link" href={`/visitas/${detail.id_visita}`}>#{detail.id_visita}</a>{:else}—{/if}</dd>
					</div>
					<div>
						<dt>Seguimiento</dt>
						<dd>{#if detail.id_seguimiento}<a class="text-link" href="/seguimientos">#{detail.id_seguimiento}</a>{:else}—{/if}</dd>
					</div>
					<div><dt>Registrado</dt><dd>{detail.creado ? formatDateTime(detail.creado) : '—'}</dd></div>
					<div><dt>Actualizado</dt><dd>{detail.actualizado ? formatDateTime(detail.actualizado) : '—'}</dd></div>
				</div>
			</div>
			<div class="col-12">
				<dl class="json-block">
					<dt>Detalle técnico</dt>
					<dd><pre>{JSON.stringify(detail, null, 2)}</pre></dd>
				</dl>
			</div>
		</div>
	{/if}
	{#snippet footer()}
		<button class="btn btn-quiet" type="button" onclick={() => (detail = null)}>Cerrar</button>
	{/snippet}
</Modal>
