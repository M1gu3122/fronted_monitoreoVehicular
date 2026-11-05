import { request } from './client.js';

const BASE = '/camaras';

export const listarCamaras = () => request(`${BASE}/`);
export const obtenerCamara = (id) => request(`${BASE}/${id}`);
export const crearCamara = (payload) => request(`${BASE}/`, { method: 'POST', body: payload });
export const actualizarCamara = (id, payload) => request(`${BASE}/${id}`, { method: 'PUT', body: payload });
export const eliminarCamara = (id) => request(`${BASE}/${id}`, { method: 'DELETE' });
