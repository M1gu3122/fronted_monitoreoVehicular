/**
 * Utilidades del módulo de usuarios.
 *
 * El backend expone un único modelo (`nombre`, `correo`, `contrasena_hash`,
 * `id_rol`, `estado`) para crear y para actualizar. Por eso el frontend debe
 * enviar siempre el payload completo: una actualización que solo cambia el
 * estado o el rol también debe reenviar el resto de campos, incluido el hash
 * vigente de la contraseña.
 */

const BCRYPT_PATTERN = /^\$2[aby]?\$/;

/**
 * Indica si un valor ya es un hash bcrypt (para no volver a cifrarlo).
 * @param {unknown} valor
 * @returns {boolean}
 */
export function esHashContrasena(valor) {
	return typeof valor === 'string' && BCRYPT_PATTERN.test(valor);
}

/**
 * Normaliza el registro que devuelve la API.
 * @param {Object|null} usuario
 * @returns {Object|null}
 */
export function normalizeUsuario(usuario) {
	if (!usuario) return null;
	return {
		id_usuario: usuario.id_usuario ?? null,
		nombre: usuario.nombre || '',
		correo: usuario.correo || '',
		contrasena_hash: usuario.contrasena_hash || '',
		id_rol: usuario.id_rol ?? null,
		estado: usuario.estado !== false
	};
}

/**
 * Payload completo para `PUT /usuarios/{id}`.
 * Si no se escribe una contraseña nueva se reenvía el hash vigente para no
 * alterarla; el backend exige el campo en cada actualización.
 * @param {Object} usuario Registro original (lista o detalle).
 * @param {Object} form Estado del formulario.
 * @param {string} [nuevaContrasena]
 * @returns {Object}
 */
export function construirPayloadActualizacion(usuario, form = {}, nuevaContrasena = '') {
	const base = normalizeUsuario(usuario) || {};
	const contrasena = String(nuevaContrasena || '').trim();
	return {
		nombre: String(form.nombre ?? base.nombre ?? '').trim(),
		correo: String(form.correo ?? base.correo ?? '').trim(),
		contrasena_hash: contrasena || String(form.contrasena_hash || base.contrasena_hash || ''),
		estado: form.estado !== false,
		id_rol: Number(form.id_rol ?? base.id_rol ?? 0)
	};
}

/**
 * Payload para `POST /usuarios/`.
 * La contraseña viaja en `contrasena_hash` (nombre del campo del modelo del
 * backend) y también en `contrasena` para compatibilidad con routers que
 * usan ese nombre. El backend se encarga de cifrarla.
 * @param {Object} form
 * @returns {Object}
 */
export function construirPayloadCreacion(form = {}) {
	const contrasena = String(form.contrasena || '');
	return {
		nombre: String(form.nombre || '').trim(),
		correo: String(form.correo || '').trim(),
		contrasena_hash: contrasena,
		contrasena,
		id_rol: Number(form.id_rol || 0),
		estado: form.estado !== false
	};
}

/**
 * Valida el formulario de usuario.
 * @param {Object} form
 * @param {{editing?: boolean}} [options]
 * @returns {Record<string, string>} Errores por campo.
 */
export function validarUsuarioForm(form = {}, { editing = false } = {}) {
	const errors = {};
	const nombre = String(form.nombre || '').trim();
	const correo = String(form.correo || '').trim();
	const contrasena = String(form.contrasena || '');

	if (!nombre) errors.nombre = 'El nombre es obligatorio.';
	if (!correo || !correo.includes('@')) errors.correo = 'Indique un correo válido.';
	if (!form.id_rol) errors.id_rol = 'Seleccione un rol.';

	if (editing) {
		if (contrasena && contrasena.length < 6) {
			errors.contrasena = 'Si cambia la contraseña, use al menos 6 caracteres.';
		}
	} else if (!contrasena || contrasena.length < 6) {
		errors.contrasena = 'Use al menos 6 caracteres.';
	}

	return errors;
}
