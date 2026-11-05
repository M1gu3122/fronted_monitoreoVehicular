import { request } from './client.js';

const BASE = '/eventos_vehiculo';

export const listarEventos = () => request(`${BASE}/`);
export const obtenerEvento = (id) => request(`${BASE}/${id}`);
