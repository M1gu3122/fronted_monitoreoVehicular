import { request } from './client.js';

/**
 * Obtiene los módulos permitidos para el rol actual del usuario desde la BD
 * @param {number|string} [rol] - ID del rol (1=admin, 2=operador). Si no se especifica, trae todos
 * @returns {Promise<Array<Object>>} - Lista de módulos con {id_rol, id_modulo, estado}
 */
export async function listarModulosPorRol(rol) {
    try {
        const modulos = await request('/modulo_x_rol/', { auth: false });
        const list = Array.isArray(modulos) ? modulos : [];
        if (rol !== undefined && rol !== null) {
            return list.filter((m) => Number(m.id_rol) === Number(rol) && m.estado !== false);
        }
        return list;
    } catch (error) {
        console.error('Error al listar módulos por rol:', error);
        return [];
    }
}

/**
 * Verifica si el usuario tiene permiso para acceder a un módulo específico
 * @param {number} idModulo - ID del módulo a verificar
 * @param {number|string} [userRol] - ID del rol del usuario
 * @returns {Promise<boolean>} - true si tiene permiso
 */
export async function tienePermisoModulo(idModulo, userRol) {
    const modulos = await listarModulosPorRol(userRol);
    return modulos.some((m) => Number(m.id_modulo) === Number(idModulo));
}
