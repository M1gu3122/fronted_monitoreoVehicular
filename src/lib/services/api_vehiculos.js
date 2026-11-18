import { solicitarAPI } from '#lib/services/api_auth.js';

const URL_BASE = '/api/vehiculos/';

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

export async function obtenerVehiculos() {
	const respuesta = await solicitarAPI(URL_BASE);
	return await procesarRespuesta(respuesta);
}

export async function obtenerVehiculoPorId(id) {
	const respuesta = await solicitarAPI(URL_BASE + id);
	return await procesarRespuesta(respuesta);
}

export async function crearVehiculo(datos) {
	const respuesta = await solicitarAPI(URL_BASE, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(datos)
	});

	return await procesarRespuesta(respuesta);
}

export async function actualizarVehiculo(id, datos) {
	const respuesta = await solicitarAPI(URL_BASE + id, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(datos)
	});

	return await procesarRespuesta(respuesta);
}

export async function eliminarVehiculo(id) {
	const respuesta = await solicitarAPI(URL_BASE + id, {
		method: 'DELETE'
	});

	return await procesarRespuesta(respuesta);
}
