import { request } from './client.js';

const BASE = '/zonas';

export const listarZonas = () => request(`${BASE}/`);
export const obtenerZona = (id) => request(`${BASE}/${id}`);
export const crearZona = (payload) => request(`${BASE}/`, { method: 'POST', body: payload });
export const actualizarZona = (id, payload) => request(`${BASE}/${id}`, { method: 'PUT', body: payload });
export const eliminarZona = (id) => request(`${BASE}/${id}`, { method: 'DELETE' });
