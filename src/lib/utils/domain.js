import { minutesBetween, parseDate } from './format.js';

export const VISIT_OPEN = 'abierta';
export const VISIT_CLOSED = 'finalizada';

export function visitStatus(visita) {
	if (!visita) return { key: 'desconocido', label: 'Sin información', tone: 'neutral' };
	if (visita.estado === false) return { key: 'inactiva', label: 'Inactiva', tone: 'neutral' };
	if (!visita.fecha_salida) return { key: VISIT_OPEN, label: 'Dentro del área', tone: 'ok' };
	return { key: VISIT_CLOSED, label: 'Finalizada', tone: 'neutral' };
}

export function visitDuration(visita) {
	if (!visita) return null;
	return minutesBetween(visita.fecha_entrada, visita.fecha_salida || null);
}

export const ALERT_RESOLUTION = {
	pendiente: { label: 'Pendiente', tone: 'warn' },
	en_proceso: { label: 'En proceso', tone: 'info' },
	resuelta: { label: 'Resuelta', tone: 'ok' },
	descartada: { label: 'Descartada', tone: 'neutral' }
};

function normalizeKey(value) {
	return String(value || '')
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '_');
}

export function alertResolutionKey(alerta) {
	return normalizeKey(alerta?.estado_resolucion) || 'pendiente';
}

export function alertResolution(alerta) {
	if (!alerta) return ALERT_RESOLUTION.pendiente;
	return ALERT_RESOLUTION[alertResolutionKey(alerta)] || {
		label: alerta.estado_resolucion || 'Sin estado',
		tone: 'neutral'
	};
}

export function alertIsOpen(alerta) {
	const key = alertResolutionKey(alerta);
	return key === 'pendiente' || key === 'en_proceso';
}

export const EVENT_LABELS = {
	entrada: { label: 'Entrada al área', tone: 'ok' },
	ingreso: { label: 'Ingreso', tone: 'ok' },
	salida: { label: 'Salida del área', tone: 'neutral' },
	entrada_zona: { label: 'Entrada a zona', tone: 'info' },
	salida_zona: { label: 'Salida de zona', tone: 'info' },
	deteccion: { label: 'Detección de vehículo', tone: 'accent' },
	seguimiento_inicio: { label: 'Inicio de seguimiento', tone: 'info' },
	seguimiento_fin: { label: 'Fin de seguimiento', tone: 'neutral' },
	cambio_zona: { label: 'Cambio de zona', tone: 'accent' },
	anomalia: { label: 'Posible anomalía', tone: 'danger' },
	mantenimiento: { label: 'Mantenimiento', tone: 'info' },
	lavado: { label: 'Lavado', tone: 'info' },
	revision: { label: 'Revisión', tone: 'info' },
	estacionamiento: { label: 'Estacionamiento', tone: 'neutral' },
	fallido: { label: 'Detección fallida', tone: 'danger' }
};

export function eventLabel(tipo) {
	if (!tipo) return { label: 'Sin tipo', tone: 'neutral' };
	const key = String(tipo).toLowerCase().replace(/\s+/g, '_');
	if (EVENT_LABELS[key]) return EVENT_LABELS[key];
	const normalized = key
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (letter) => letter.toUpperCase());
	return { label: normalized, tone: 'neutral' };
}

export const ASSOCIATION_RESULTS = {
	pendiente: { label: 'Pendiente de revisión', tone: 'warn' },
	aceptada: { label: 'Aceptada', tone: 'ok' },
	rechazada: { label: 'Rechazada', tone: 'danger' }
};

export function associationResult(item) {
	const key = normalizeKey(item?.resultado);
	return ASSOCIATION_RESULTS[key] || { label: item?.resultado || 'Sin estado', tone: 'neutral' };
}

export function occupancyStatus(vehicles, capacity) {
	if (vehicles === null || vehicles === undefined || !capacity) {
		return { key: 'sin-datos', label: 'Sin información', tone: 'neutral', percent: null };
	}
	const percent = Math.round((vehicles / capacity) * 100);
	if (percent > 100) return { key: 'saturada', label: 'Sobre capacidad', tone: 'danger', percent };
	if (percent >= 85) return { key: 'alta', label: 'Ocupación alta', tone: 'warn', percent };
	if (percent >= 60) return { key: 'moderada', label: 'Ocupación moderada', tone: 'warn', percent };
	return { key: 'libre', label: 'Con disponibilidad', tone: 'ok', percent };
}

export function occupancyFillClass(percent) {
	if (percent === null || percent === undefined) return 'unknown';
	if (percent > 100 || percent >= 85) return 'danger';
	if (percent >= 60) return 'warn';
	return '';
}

export function cameraConnection(camara) {
	if (!camara) return { label: 'Sin información', tone: 'neutral' };
	return camara.estado === false
		? { label: 'Inactiva', tone: 'danger' }
		: { label: 'Activa', tone: 'ok' };
}

export function visitLastEvent(visita, eventos) {
	if (!visita || !eventos?.length) return null;
	const items = eventos.filter((evento) => Number(evento.id_visita) === Number(visita.id_visita));
	if (!items.length) return null;
	return items.reduce((latest, item) => {
		const current = parseDate(item.fecha_hora);
		const previous = parseDate(latest.fecha_hora);
		if (!current) return latest;
		if (!previous) return item;
		return current > previous ? item : latest;
	});
}

export function latestOccupancyByZone(ocupaciones) {
	const map = new Map();
	for (const item of ocupaciones || []) {
		const key = Number(item.id_zona);
		const current = map.get(key);
		const date = parseDate(item.fecha_hora);
		const currentDate = current ? parseDate(current.fecha_hora) : null;
		if (!current || (date && (!currentDate || date > currentDate))) {
			map.set(key, item);
		}
	}
	return map;
}

export function roleLabel(idRol, roles = []) {
	const role = roles.find((item) => Number(item.id_rol) === Number(idRol));
	if (role) return role.nombre;
	if (Number(idRol) === 1) return 'Administrador';
	if (Number(idRol) === 2) return 'Operador';
	return `Rol ${idRol ?? '—'}`;
}

export function initials(name) {
	if (!name) return '—';
	const parts = String(name).trim().split(/\s+/).filter(Boolean);
	if (!parts.length) return '—';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
