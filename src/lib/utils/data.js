export function normalizeText(value) {
	return String(value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

export function includesText(value, query) {
	const needle = normalizeText(query);
	if (!needle) return true;
	return normalizeText(value).includes(needle);
}

export function sortBy(items, selector, direction = 'asc') {
	const factor = direction === 'desc' ? -1 : 1;
	return [...(items || [])].sort((a, b) => {
		const av = selector(a);
		const bv = selector(b);
		if (av === bv) return 0;
		if (av === null || av === undefined) return 1;
		if (bv === null || bv === undefined) return -1;
		if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
		return String(av).localeCompare(String(bv), 'es', { numeric: true }) * factor;
	});
}

export function paginate(items, page = 1, pageSize = 10) {
	const total = (items || []).length;
	const pages = Math.max(1, Math.ceil(total / pageSize));
	const safePage = Math.min(Math.max(1, page), pages);
	const start = (safePage - 1) * pageSize;
	return {
		items: (items || []).slice(start, start + pageSize),
		total,
		pages,
		page: safePage,
		from: total === 0 ? 0 : start + 1,
		to: Math.min(start + pageSize, total)
	};
}

export function countBy(items, selector) {
	const map = new Map();
	for (const item of items || []) {
		const key = selector(item);
		map.set(key, (map.get(key) || 0) + 1);
	}
	return map;
}

export function sumBy(items, selector) {
	return (items || []).reduce((total, item) => total + (Number(selector(item)) || 0), 0);
}

export function groupSum(items, keySelector, valueSelector = () => 1) {
	const map = new Map();
	for (const item of items || []) {
		const key = keySelector(item);
		map.set(key, (map.get(key) || 0) + (Number(valueSelector(item)) || 0));
	}
	return map;
}

export function uniqueBy(items, selector) {
	const seen = new Set();
	const result = [];
	for (const item of items || []) {
		const key = selector(item);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(item);
	}
	return result;
}

export function toCsv(rows, columns) {
	const escapeCell = (value) => {
		const text = value === null || value === undefined ? '' : String(value);
		return `"${text.replace(/"/g, '""')}"`;
	};
	const header = columns.map((column) => escapeCell(column.label)).join(';');
	const body = rows.map((row) =>
		columns
			.map((column) => {
				const raw = typeof column.value === 'function' ? column.value(row) : row[column.value];
				return escapeCell(raw);
			})
			.join(';')
	);
	return `\uFEFF${[header, ...body].join('\r\n')}`;
}

export function downloadCsv(filename, content) {
	const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function dateToStamp(date = new Date()) {
	const pad = (value) => String(value).padStart(2, '0');
	return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}
