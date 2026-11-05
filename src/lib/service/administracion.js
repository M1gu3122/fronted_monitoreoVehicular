import { request } from './client.js';

const USERS = '/usuarios';
const ROLES = '/roles';
const MODULES = '/modulo';
const PERMISSIONS = '/modulo_x_rol';

export const listarUsuarios = () => request(`${USERS}/`);

/**
 * Consulta el registro completo de un usuario.
 * La API exige este dato antes de actualizar porque el payload debe incluir
 * todos los campos del usuario (incluido el hash vigente de la contraseña).
 * @param {number|string} id
 */
export const obtenerUsuario = (id) => request(`${USERS}/${id}`);

export const crearUsuario = (payload) => request(`${USERS}/`, { method: 'POST', body: payload });

/**
 * Actualiza un usuario. El backend exige el payload completo del usuario,
 * por lo que `payload` debe incluir nombre, correo, contrasena_hash, id_rol y estado.
 * @param {number|string} id
 * @param {Object} payload
 */
export const actualizarUsuario = (id, payload) => request(`${USERS}/${id}`, { method: 'PUT', body: payload });

/**
 * Desactiva un usuario. Se usa `PUT` con `estado: false` en lugar de `DELETE`
 * porque la API no ofrece un borrado lógico: `DELETE` elimina el registro.
 * @param {number|string} id
 * @param {Object} payload Payload completo del usuario con `estado: false`.
 */
export const desactivarUsuario = (id, payload) => request(`${USERS}/${id}`, { method: 'PUT', body: payload });

export const listarRoles = () => request(`${ROLES}/`);
export const crearRol = (payload) => request(`${ROLES}/`, { method: 'POST', body: payload });
export const actualizarRol = (id, payload) => request(`${ROLES}/${id}`, { method: 'PUT', body: payload });

export const listarModulos = () => request(`${MODULES}/`);
export const listarPermisos = () => request(`${PERMISSIONS}/`);
export const crearPermiso = (payload) => request(`${PERMISSIONS}/`, { method: 'POST', body: payload });
export const eliminarPermiso = (idRol, idModulo) =>
	request(`${PERMISSIONS}/${idRol}/${idModulo}`, { method: 'DELETE' });
