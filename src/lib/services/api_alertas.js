import { solicitarAPI } from '#lib/services/api_auth.js';

const URL_BASE = '/api/alertas/';

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

// LOGGING DEBUG: Descomentar las siguientes líneas para depurar llamadas API
 console.log('🛰 API ALERTAS: llamada a', URL_BASE);

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
console.log('🛰 API ALERTAS: obteniendo alertas...');

export async function obtenerAlertas() {
	try {
		console.log('🛰 API ALERTAS: obteniendo alertas...');
		const respuesta = await solicitarAPI(URL_BASE);
		console.log('🛰 API ALERTAS: respuesta status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		console.log('🛰 API ALERTAS: alertas obtenidas', datos?.length, 'registros');
		return datos;
	} catch (e) {
		// console.error('❌ API ALERTAS: error', e.message);
		throw e;
	}
}

export async function obtenerAlertaPorId(id) {
	try {
		console.log('🛰 API ALERTAS: obteniendo alerta', id);
		const respuesta = await solicitarAPI(URL_BASE + id);
		console.log('🛰 API ALERTAS: alerta status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		console.log('🛰 API ALERTAS: alerta obtenida', datos);
		return datos;
	} catch (e) {
		// console.error('❌ API ALERTAS: error alerta', e.message);
		throw e;
	}
}

export async function crearAlerta(datos) {
	try {
		console.log('🛰 API ALERTAS: creando alerta', datos.mensaje);
		const respuesta = await solicitarAPI(URL_BASE, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(datos)
		});
		console.log('🛰 API ALERTAS: crear status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		console.log('🛰 API ALERTAS: alerta creada', datos?.id_alerta);
		return datos;
	} catch (e) {
		// console.error('❌ API ALERTAS: error crear', e.message);
		throw e;
	}
}

export async function actualizarAlerta(id, datos) {
	try {
		console.log('🛰 API ALERTAS: actualizando alerta', id);
		const respuesta = await solicitarAPI(URL_BASE + id, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(datos)
		});
		console.log('🛰 API ALERTAS: actualizar status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		console.log('🛰 API ALERTAS: alerta actualizada', datos?.id_alerta);
		return datos;
	} catch (e) {
		// console.error('❌ API ALERTAS: error actualizar', e.message);
		throw e;
	}
}

export async function eliminarAlerta(id) {
	try {
		console.log('🛰 API ALERTAS: eliminando alerta', id);
		const respuesta = await solicitarAPI(URL_BASE + id, {
			method: 'DELETE'
		});
		console.log('🛰 API ALERTAS: eliminar status', respuesta.status);
		const datos = await procesarRespuesta(respuesta);
		console.log('🛰 API ALERTAS: alerta eliminada', datos);
		return datos;
	} catch (e) {
		// console.error('❌ API ALERTAS: error eliminar', e.message);
		throw e;
	}
}