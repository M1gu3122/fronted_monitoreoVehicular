import { solicitarAPI } from '#lib/services/api_auth.js';

const URL_BASE = '/api/zonas/';

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

// LOGGING DEBUG: Descomentar las siguientes líneas para depurar llamadas API
 console.log('🛰 API ZONAS: llamada a', URL_BASE);

export async function obtenerZonas() {
	try {
		console.log('🛰 API ZONAS: obteniendo zonas...');
		const respuesta = await solicitarAPI(URL_BASE);
		// console.log('🛰 API ZONAS: respuesta status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		console.log('🛰 API ZONAS: zonas obtenidas', datos?.length, 'registros');
		return datos;
	} catch (e) {
		console.error('❌ API ZONAS: error', e.message);
		throw e;
	}
}

export async function obtenerZonaPorId(id) {
	try {
		// console.log('🛰 API ZONAS: obteniendo zona', id);
		const respuesta = await solicitarAPI(URL_BASE + id);
		// console.log('🛰 API ZONAS: zona status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		// console.log('🛰 API ZONAS: zona obtenida', datos);
		return datos;
	} catch (e) {
		// console.error('❌ API ZONAS: error zona', e.message);
		throw e;
	}
}

export async function crearZona(datos) {
	try {
		// console.log('🛰 API ZONAS: creando zona', datos.nombre);
		const respuesta = await solicitarAPI(URL_BASE, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(datos)
		});
		// console.log('🛰 API ZONAS: crear status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		// console.log('🛰 API ZONAS: zona creada', datos?.id);
		return datos;
	} catch (e) {
		// console.error('❌ API ZONAS: error crear', e.message);
		throw e;
	}
}

export async function actualizarZona(id, datos) {
	try {
		// console.log('🛰 API ZONAS: actualizando zona', id);
		const respuesta = await solicitarAPI(URL_BASE + id, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(datos)
		});
		// console.log('🛰 API ZONAS: actualizar status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		// console.log('🛰 API ZONAS: zona actualizada', datos?.id);
		return datos;
	} catch (e) {
		// console.error('❌ API ZONAS: error actualizar', e.message);
		throw e;
	}
}