import { request } from './client.js';

/**
 * Obtiene el perfil del usuario actual consultando la base de datos (/usuarios/).
 * Utiliza el ID (sub) decodificado del JWT para encontrar los datos actualizados del usuario en la BD.
 * Si la BD no está disponible, utiliza los datos derivados del token como fallback.
 * @returns {Promise<Object|null>} - Perfil actualizado del usuario
 */
export async function obtenerPerfil() {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('lpr.access_token') : null;
    if (!token) return null;

    let subId = null;
    let tokenRoles = [];

    // 1. Extraer sub (ID de usuario) y roles del token
    try {
        const part = token.split('.')[1];
        if (part) {
            const normalized = part.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
            const json = decodeURIComponent(
                atob(padded)
                    .split('')
                    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
                    .join('')
            );
            const payload = JSON.parse(json);
            subId = payload.sub ? Number(payload.sub) : null;
            tokenRoles = Array.isArray(payload.roles) ? payload.roles : [];
        }
    } catch (err) {
        console.error('Error al decodificar token para perfil:', err);
    }

    // 2. Consultar datos actualizados directamente desde la base de datos (/usuarios/)
    if (subId !== null) {
        try {
            const usuarios = await request('/usuarios/', { auth: false });
            if (Array.isArray(usuarios)) {
                const dbUser = usuarios.find((u) => Number(u.id_usuario) === Number(subId));
                if (dbUser) {
                    const idRol = Number(dbUser.id_rol ?? (tokenRoles.includes('administrador') ? 1 : 2));
                    const rolNombre = idRol === 1 ? 'administrador' : 'operador';
                    return {
                        id_usuario: dbUser.id_usuario,
                        nombre: dbUser.nombre || `Usuario #${dbUser.id_usuario}`,
                        correo: dbUser.correo || '',
                        id_rol: idRol,
                        rol: idRol,
                        rol_nombre: rolNombre,
                        estado: dbUser.estado !== false,
                        derived: false
                    };
                }
            }
        } catch (dbErr) {
            console.warn('No fue posible consultar /usuarios/ para refrescar rol:', dbErr);
        }
    }

    // 3. Fallback en caso de que la BD no responda
    let fallbackIdRol = 2;
    let fallbackRolNombre = 'operador';
    if (tokenRoles.includes('administrador')) {
        fallbackIdRol = 1;
        fallbackRolNombre = 'administrador';
    } else if (tokenRoles.includes('operador')) {
        fallbackIdRol = 2;
        fallbackRolNombre = 'operador';
    }

    return {
        id_usuario: subId,
        nombre: tokenRoles.length ? `Sesión ${tokenRoles[0]}` : 'Sesión activa',
        correo: '',
        id_rol: fallbackIdRol,
        rol: fallbackIdRol,
        rol_nombre: fallbackRolNombre,
        estado: true,
        derived: true
    };
}

/**
 * Cierra la sesión actual. 
 * Como el endpoint /auth/logout no existe en el backend,
 * limpiamos la sesión local y dispatchamos el evento para que el layout pueda redirigir.
 */
export function cerrarSesion() {
    // Limpiar tokens localmente
    localStorage.removeItem('lpr.access_token');
    localStorage.removeItem('lpr.refresh_token');
    localStorage.removeItem('lpr.user');
    sessionStorage.removeItem('lpr.guest');
    
    // Actualizar store global
    if (typeof session !== 'undefined') {
        session.token = null;
        session.refreshToken = null;
        session.user = null;
        session.guest = false;
    }
    
    // Dispatch event para que el layout sepa que debe redirigir
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('lpr:logout', { detail: { source: 'local' } }));
    }
    
    return Promise.resolve();
}

/**
 * Intenta hacer login. Si el backend no tiene endpoint de logout/perfil,
 * esta función aún funciona para el login.
 * @param {{{correo: string, contrasena: string}}} credentials 
 */
export function iniciarSesion(credentials) {
    return request('/auth/login', { method: 'POST', body: credentials, auth: false });
}