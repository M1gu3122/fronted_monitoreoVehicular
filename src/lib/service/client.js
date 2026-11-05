const TOKEN_KEY = 'lpr.access_token';
const BASE_URL_KEY = 'lpr.api_base_url';

const DEFAULT_BASE_URL = 'https://api-carro.vercel.app';
const DEFAULT_TIMEOUT = 15000;

export class ApiError extends Error {
	/**
	 * @param {string} message
	 * @param {{status?: number, detail?: unknown, path?: string, cause?: unknown}} [meta]
	 */
	constructor(message, meta = {}) {
		super(message);
		this.name = 'ApiError';
		this.status = meta.status ?? 0;
		this.detail = meta.detail ?? null;
		this.path = meta.path ?? '';
		this.cause = meta.cause;
	}
}

export function getApiBaseUrl() {
	if (typeof localStorage !== 'undefined') {
		const stored = localStorage.getItem(BASE_URL_KEY);
		if (stored) return stored.replace(/\/+$/, '');
	}
	const configured = import.meta.env?.VITE_API_BASE_URL || import.meta.env?.PUBLIC_API_BASE_URL;
	if (configured) return String(configured).replace(/\/+$/, '');
	return DEFAULT_BASE_URL;
}

export function setApiBaseUrl(url) {
	if (typeof localStorage === 'undefined') return;
	const clean = String(url || '').trim().replace(/\/+$/, '');
	if (!clean) {
		localStorage.removeItem(BASE_URL_KEY);
		return;
	}
	if (!/^https?:\/\//i.test(clean)) {
		throw new Error('La URL debe iniciar con http:// o https://');
	}
	localStorage.setItem(BASE_URL_KEY, clean);
}

export function hasCustomApiBaseUrl() {
	if (typeof localStorage === 'undefined') return false;
	return Boolean(localStorage.getItem(BASE_URL_KEY));
}

function getAccessToken() {
	if (typeof localStorage === 'undefined') return null;
	return localStorage.getItem(TOKEN_KEY);
}

function describeDetail(detail) {
	if (!detail) return '';
	if (typeof detail === 'string') return detail;
	if (Array.isArray(detail)) {
		return detail
			.map((item) => {
				if (typeof item === 'string') return item;
				const location = Array.isArray(item?.loc) ? item.loc.filter((part) => part !== 'body').join('.') : '';
				return location ? `${location}: ${item?.msg ?? 'valor inválido'}` : item?.msg ?? '';
			})
			.filter(Boolean)
			.join(' · ');
	}
	if (typeof detail === 'object') {
		return detail.mensaje || detail.message || JSON.stringify(detail);
	}
	return String(detail);
}

/**
 * Cliente HTTP centralizado. Ningún componente debe llamar a fetch directamente.
 * @param {string} path
 * @param {{method?: string, body?: unknown, auth?: boolean, timeout?: number, headers?: Record<string,string>}} [options]
 */
export async function request(path, options = {}) {
	const { method = 'GET', body, auth = true, timeout = DEFAULT_TIMEOUT, headers = {} } = options;
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);
	const url = `${getApiBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

	const requestHeaders = { Accept: 'application/json', ...headers };
	if (body !== undefined && !(body instanceof FormData)) {
		requestHeaders['Content-Type'] = 'application/json';
	}
	if (auth) {
		const token = getAccessToken();
		if (token) requestHeaders.Authorization = `Bearer ${token}`;
	}

	try {
		const response = await fetch(url, {
			method,
			headers: requestHeaders,
			body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
			signal: controller.signal,
			cache: 'no-store'
		});

		const contentType = response.headers.get('content-type') || '';
		const payload = contentType.includes('application/json')
			? await response.json().catch(() => null)
			: await response.text().catch(() => '');

		if (!response.ok) {
			const detail = payload && typeof payload === 'object' ? payload.detail ?? payload : payload;
			const message = describeDetail(detail) || `Error HTTP ${response.status}`;
			if (response.status === 401 && typeof window !== 'undefined' && getAccessToken()) {
				window.dispatchEvent(new CustomEvent('lpr:unauthorized'));
			}
			throw new ApiError(message, { status: response.status, detail, path: url });
		}

		return payload;
	} catch (error) {
		if (error instanceof ApiError) throw error;
		if (error?.name === 'AbortError') {
			throw new ApiError('La solicitud excedió el tiempo de espera.', {
				status: 0,
				detail: 'timeout',
				path: url,
				cause: error
			});
		}
		throw new ApiError('No fue posible conectar con el backend. Verifique que el servicio esté activo y la URL configurada.', {
			status: 0,
			detail: error?.message,
			path: url,
			cause: error
		});
	} finally {
		clearTimeout(timer);
	}
}

export function errorMessage(error) {
	if (error instanceof ApiError) return error.message;
	return error?.message || 'Ocurrió un error inesperado.';
}

/**
 * Comprueba de forma liviana si el backend responde. No consulta la base
 * de datos: solo verifica que el servicio HTTP esté disponible.
 * @param {number} [timeout]
 * @returns {Promise<boolean>}
 */
export async function probeBackend(timeout = 4000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeout);
	try {
		const response = await fetch(`${getApiBaseUrl()}/openapi.json`, {
			method: 'GET',
			signal: controller.signal,
			cache: 'no-store'
		});
		return response.ok;
	} catch {
		return false;
	} finally {
		clearTimeout(timer);
	}
}
