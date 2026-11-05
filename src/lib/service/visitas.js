import { request } from './client.js';

const BASE = '/visitas';

export const listarVisitas = () => request(`${BASE}/`);
export const obtenerVisita = (id) => request(`${BASE}/${id}`);
export const crearVisita = (payload) => request(`${BASE}/`, { method: 'POST', body: payload });
export const actualizarVisita = (id, payload) => request(`${BASE}/${id}`, { method: 'PUT', body: payload });
