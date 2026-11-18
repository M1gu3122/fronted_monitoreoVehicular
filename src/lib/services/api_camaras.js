import { solicitarAPI } from '#lib/services/api_auth.js';

const URL_BASE = '/api/camaras/';

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

export async function obtenerCamaras() {
	const respuesta = await solicitarAPI(URL_BASE);
	return await procesarRespuesta(respuesta);
}

export async function obtenerCamaraPorId(id) {
	const respuesta = await solicitarAPI(URL_BASE + id);
	return await procesarRespuesta(respuesta);
}

export async function crearCamara(datos) {
	const respuesta = await solicitarAPI(URL_BASE, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(datos)
	});

	return await procesarRespuesta(respuesta);
}

export async function actualizarCamara(id, datos) {
	const respuesta = await solicitarAPI(URL_BASE + id, {
		method: 'PUT',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(datos)
	});

	return await procesarRespuesta(respuesta);
}

export async function obtenerCatalogosCamaras() {
 return await procesarRespuesta(await solicitarAPI(URL_BASE + 'catalogos'));
}

export async function obtenerActividadCamara(id, inicio = 0, signal) {
 const parametros = new URLSearchParams({ inicio: String(inicio), limite: '10' });
 return await procesarRespuesta(await solicitarAPI(URL_BASE + id + '/actividad?' + parametros, { signal }));
}
