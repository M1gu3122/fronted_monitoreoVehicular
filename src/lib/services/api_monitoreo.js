import { solicitarAPI } from '#lib/services/api_auth.js';

const URL_BASE = '/api/monitoreo/';

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

export async function obtenerMonitoreo(parametros = {}, signal) {
 const consulta = new URLSearchParams();
 for (const [nombre, valor] of Object.entries(parametros)) {
  if (valor !== '' && valor !== null && valor !== undefined) consulta.set(nombre, String(valor));
 }
 const respuesta = await solicitarAPI(URL_BASE + (consulta.size ? '?' + consulta.toString() : ''), { signal });
 return await procesarRespuesta(respuesta);
}
