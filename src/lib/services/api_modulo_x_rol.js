import { solicitarAPI } from '#lib/services/api_auth.js';

const URL_BASE = '/api/modulo_x_rol/';

function obtenerDetalle(cuerpo) {
	if (!cuerpo) {
		return '';
	}

	if (typeof cuerpo === 'string') {
		return cuerpo;
	}

	if (typeof cuerpo.detail === 'string') {
		return cuerpo.detail;
	}

	if (Array.isArray(cuerpo.detail)) {
		return cuerpo.detail
			.map((detalle) => detalle.msg || JSON.stringify(detalle))
			.join('; ');
	}

	if (typeof cuerpo.mensaje === 'string') {
		return cuerpo.mensaje;
	}

	return '';
}

async function procesarRespuesta(respuesta) {
	const texto = await respuesta.text();
	let cuerpo = null;

	if (texto) {
		try {
			cuerpo = JSON.parse(texto);
		} catch {
			cuerpo = texto;
		}
	}

	if (!respuesta.ok) {
		const detalle = obtenerDetalle(cuerpo);
		throw new Error('Error ' + respuesta.status + ': ' + (detalle || respuesta.statusText));
	}

	return cuerpo;
}

export async function obtenerPermisos() {
 return await procesarRespuesta(await solicitarAPI(URL_BASE));
}
export async function obtenerPermisoPorId(idRol, idModulo) {
 return await procesarRespuesta(await solicitarAPI(URL_BASE + idRol + '/' + idModulo));
}
export async function crearPermiso(datos) {
 return await procesarRespuesta(await solicitarAPI(URL_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) }));
}
export async function actualizarPermiso(idRol, idModulo, datos) {
 return await procesarRespuesta(await solicitarAPI(URL_BASE + idRol + '/' + idModulo, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(datos) }));
}
export async function eliminarPermiso(idRol, idModulo) {
 return await procesarRespuesta(await solicitarAPI(URL_BASE + idRol + '/' + idModulo, { method: 'DELETE' }));
}
