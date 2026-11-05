import { iniciarSesion, obtenerPerfil, cerrarSesion as cerrarSesionApi } from '../service/auth.js';

const TOKEN_KEY = 'lpr.access_token';
const REFRESH_KEY = 'lpr.refresh_token';
const USER_KEY = 'lpr.user';
const GUEST_KEY = 'lpr.guest';

export const session = $state({
	token: null,
	refreshToken: null,
	user: null,
	guest: false,
	ready: false,
	profileError: null
});

function readStored(key) {
	try {
		return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
	} catch {
		return null;
	}
}

function writeStored(key, value) {
	try {
		if (typeof localStorage === 'undefined') return;
		if (value === null || value === undefined) localStorage.removeItem(key);
		else localStorage.setItem(key, value);
	} catch {
		// El almacenamiento puede estar bloqueado por el navegador.
	}
}

function decodeJwt(token) {
	if (!token) return null;
	try {
		const part = token.split('.')[1];
		if (!part) return null;
		const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
		const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
		const json = decodeURIComponent(
			atob(padded)
				.split('')
				.map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
				.join('')
		);
		return JSON.parse(json);
	} catch {
		return null;
	}
}

function fallbackUserFromToken(token) {
	const payload = decodeJwt(token);
	if (!payload) return null;
	const roles = Array.isArray(payload.roles) ? payload.roles : [];
	// Mapear roles: 1=administrador, 2=operador
	let idRol = 2; // default: operador
	let rolNombre = 'operador';
	if (roles.includes('administrador')) {
		idRol = 1;
		rolNombre = 'administrador';
	} else if (roles.includes('operador')) {
		idRol = 2;
		rolNombre = 'operador';
	}
	return {
		id_usuario: Number(payload.sub) || null,
		nombre: roles.length ? `Sesión ${roles[0]}` : 'Sesión activa',
		correo: '',
		id_rol: idRol,
		rol: idRol,
		rol_nombre: rolNombre,
		estado: true,
		derived: true
	};
}

export async function refreshProfile() {
	if (!session.token) return null;
	try {
		const profile = await obtenerPerfil();
		if (profile) {
			const idRol = Number(profile.id_rol ?? profile.rol ?? 2);
			session.user = {
				...profile,
				id_rol: idRol,
				rol: idRol,
				rol_nombre: profile.rol_nombre || (idRol === 1 ? 'administrador' : 'operador')
			};
			writeStored(USER_KEY, JSON.stringify(session.user));
			return session.user;
		}
	} catch (error) {
		console.warn('Error al refrescar perfil:', error);
	}
	return session.user;
}

export function initSession() {
	if (session.ready) return;
	const token = readStored(TOKEN_KEY);
	const refreshToken = readStored(REFRESH_KEY);
	const storedUser = readStored(USER_KEY);
	const guest = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(GUEST_KEY) === '1';

	session.token = token || null;
	session.refreshToken = refreshToken || null;
	session.guest = !token && guest;
	const parsedUser = storedUser ? safeParse(storedUser) : token ? fallbackUserFromToken(token) : null;
	if (parsedUser) {
		const idRol = Number(parsedUser.id_rol ?? parsedUser.rol ?? (parsedUser.rol_nombre === 'administrador' ? 1 : 2));
		parsedUser.id_rol = idRol;
		parsedUser.rol = idRol;
	}
	session.user = parsedUser;
	session.ready = true;

	// Sincronizar inmediatamente con la BD si hay una sesión activa para reflejar cambios de rol recientes
	if (session.token) {
		refreshProfile();
	}
}

function safeParse(value) {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

export function isAuthenticated() {
	return Boolean(session.token);
}

export function isGuest() {
	return !session.token && session.guest;
}

export function isAdmin() {
	if (!session.user) return false;
	const role = String(session.user.rol_nombre || '').toLowerCase();
	return Number(session.user.id_rol) === 1 || role === 'administrador' || role === 'admin';
}

export function isOperador() {
	if (!session.user) return false;
	const role = String(session.user.rol_nombre || '').toLowerCase();
	return Number(session.user.id_rol) === 2 || role === 'operador' || role === 'operator';
}

export function sessionLabel() {
	if (session.user?.nombre) return session.user.nombre;
	if (session.guest) return 'Acceso sin sesión';
	return 'Sin sesión';
}

export function sessionRoleLabel() {
	if (session.guest) return 'Consulta';
	if (session.user?.rol_nombre) return session.user.rol_nombre;
	return 'Sin rol';
}

export function setSessionTokens(tokens) {
	session.token = tokens?.access_token || null;
	session.refreshToken = tokens?.refresh_token || null;
	session.guest = false;
	session.profileError = null;
	writeStored(TOKEN_KEY, session.token);
	writeStored(REFRESH_KEY, session.refreshToken);
	if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(GUEST_KEY);
}

/**
 * Inicia sesión con correo y contraseña.
 * Decodifica el token recibido y lo almacena.
 */
export async function login(correo, contrasena) {
	const tokens = await iniciarSesion({ correo, contrasena });
	setSessionTokens(tokens);
	const fallbackUser = fallbackUserFromToken(tokens.access_token);
	session.user = fallbackUser;
	try {
		const profile = await obtenerPerfil();
		if (profile) {
			const idRol = Number(profile.id_rol ?? profile.rol ?? fallbackUser?.id_rol ?? 2);
			session.user = {
				...profile,
				id_rol: idRol,
				rol: idRol,
				rol_nombre:
					profile.rol_nombre ||
					(idRol === 1 ? 'administrador' : 'operador')
			};
			writeStored(USER_KEY, JSON.stringify(session.user));
		}
	} catch (error) {
		session.profileError = error?.message || 'No se pudo cargar el perfil.';
		session.user = fallbackUser;
		writeStored(USER_KEY, JSON.stringify(session.user));
	}
	return session.user;
}

export function enterAsGuest() {
	session.token = null;
	session.refreshToken = null;
	session.user = null;
	session.guest = true;
	session.profileError = null;
	writeStored(TOKEN_KEY, null);
	writeStored(REFRESH_KEY, null);
	writeStored(USER_KEY, null);
	if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(GUEST_KEY, '1');
}

export function clearSession() {
	session.token = null;
	session.refreshToken = null;
	session.user = null;
	session.guest = false;
	session.profileError = null;
	writeStored(TOKEN_KEY, null);
	writeStored(REFRESH_KEY, null);
	writeStored(USER_KEY, null);
	if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(GUEST_KEY);
}

/**
 * Cierra la sesión.
 * Como el backend no tiene endpoint /auth/logout, limpiamos localmente
 * y dispachamos un evento para que el layout redirija al login.
 */
export async function logout() {
	try {
		// Intentar cerrar sesión en el backend (fallará 404, pero intentamos)
		await cerrarSesionApi();
	} catch (error) {
		// El endpoint /auth/logout no existe en el backend,
		// así que procedemos con el cierre local
		console.log('Endpoint /auth/logout no disponible, cerrando sesión localmente');
	}
	
	// Cerrar sesión localmente sin depender del backend
	clearSession();
	
	// Dispatch event para notificar al layout que debe redirigir
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('lpr:logout', { detail: { source: 'local' } }));
	}
}