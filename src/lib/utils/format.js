const dateFormatter = new Intl.DateTimeFormat('es-CO', {
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

const dateLongFormatter = new Intl.DateTimeFormat('es-CO', {
	weekday: 'short',
	year: 'numeric',
	month: 'short',
	day: '2-digit'
});

const timeFormatter = new Intl.DateTimeFormat('es-CO', {
	hour: '2-digit',
	minute: '2-digit',
	hour12: false
});

const numberFormatter = new Intl.NumberFormat('es-CO');

/**
 * Convierte un valor del backend en Date. El backend puede enviar
 * ISO con o sin zona horaria; ambos se interpretan como hora local.
 * @param {string|number|Date|null|undefined} value
 * @returns {Date|null}
 */
export function parseDate(value) {
	if (value === null || value === undefined || value === '') return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
	const date = parseDate(value);
	return date ? dateFormatter.format(date) : '—';
}

export function formatLongDate(value) {
	const date = parseDate(value);
	return date ? dateLongFormatter.format(date) : '—';
}

export function formatTime(value) {
	const date = parseDate(value);
	return date ? timeFormatter.format(date) : '—';
}

export function formatDateTime(value) {
	const date = parseDate(value);
	return date ? `${dateFormatter.format(date)} · ${timeFormatter.format(date)}` : '—';
}

export function formatDateTimeLong(value) {
	const date = parseDate(value);
	return date ? `${dateLongFormatter.format(date)} · ${timeFormatter.format(date)}` : '—';
}

/**
 * Diferencia en minutos entre dos fechas. Si no hay fecha final,
 * se usa el instante actual.
 */
export function minutesBetween(start, end = null) {
	const from = parseDate(start);
	const to = end ? parseDate(end) : new Date();
	if (!from || !to) return null;
	return Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
}

export function formatDuration(minutes) {
	if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return '—';
	const total = Math.max(0, Math.round(minutes));
	if (total < 1) return 'menos de 1 min';
	if (total < 60) return `${total} min`;
	const hours = Math.floor(total / 60);
	const rest = total % 60;
	if (hours < 24) return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
	const days = Math.floor(hours / 24);
	const restHours = hours % 24;
	return restHours === 0 ? `${days} d` : `${days} d ${restHours} h`;
}

export function elapsedSince(value) {
	return formatDuration(minutesBetween(value));
}

export function formatNumber(value) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
	return numberFormatter.format(Number(value));
}

export function formatPercent(value, decimals = 0) {
	if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
	return `${Number(value).toFixed(decimals)}%`;
}

export function formatConfidence(value) {
	if (value === null || value === undefined || value === '') return null;
	const num = Number(value);
	if (Number.isNaN(num)) return null;
	const normalized = num > 1 ? num / 100 : num;
	return {
		ratio: Math.min(1, Math.max(0, normalized)),
		label: `${Math.round(normalized * 100)}%`
	};
}

export function confidenceClass(ratio) {
	if (ratio >= 0.85) return '';
	if (ratio >= 0.7) return 'mid';
	return 'low';
}

export function toDateTimeInput(value) {
	const date = parseDate(value);
	if (!date) return '';
	const pad = (n) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeInput(value) {
	if (!value) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function todayStart() {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isToday(value) {
	const date = parseDate(value);
	if (!date) return false;
	const now = new Date();
	return (
		date.getFullYear() === now.getFullYear() &&
		date.getMonth() === now.getMonth() &&
		date.getDate() === now.getDate()
	);
}

export function isSameDay(a, b) {
	const first = parseDate(a);
	const second = parseDate(b);
	if (!first || !second) return false;
	return (
		first.getFullYear() === second.getFullYear() &&
		first.getMonth() === second.getMonth() &&
		first.getDate() === second.getDate()
	);
}

export function dayKey(value) {
	const date = parseDate(value);
	if (!date) return '';
	const pad = (n) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function hourLabel(hour) {
	return `${String(hour).padStart(2, '0')}:00`;
}

export function pluralize(count, singular, plural) {
	return count === 1 ? singular : plural;
}

export function relativeTime(value) {
	const date = parseDate(value);
	if (!date) return '—';
	const diff = Math.round((date.getTime() - Date.now()) / 60000);
	const abs = Math.abs(diff);
	if (abs < 1) return 'ahora';
	if (abs < 60) return diff > 0 ? `en ${abs} min` : `hace ${abs} min`;
	const hours = Math.round(abs / 60);
	if (hours < 24) return diff > 0 ? `en ${hours} h` : `hace ${hours} h`;
	const days = Math.round(hours / 24);
	return diff > 0 ? `en ${days} d` : `hace ${days} d`;
}
