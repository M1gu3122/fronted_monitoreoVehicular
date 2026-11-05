import { request } from './client.js';

const BASE = '/alertas';

export const listarAlertas = () => request(`${BASE}/`);
export const obtenerAlerta = (id) => request(`${BASE}/${id}`);
export const actualizarAlerta = (id, payload) => request(`${BASE}/${id}`, { method: 'PUT', body: payload });
