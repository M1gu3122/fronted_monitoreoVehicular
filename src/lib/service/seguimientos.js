import { request } from './client.js';

const BASE = '/seguimientos';
const ASSOCIATIONS = '/asociaciones_seguimiento';

export const listarSeguimientos = () => request(`${BASE}/`);
export const listarAsociaciones = () => request(`${ASSOCIATIONS}/`);
export const actualizarAsociacion = (id, payload) =>
	request(`${ASSOCIATIONS}/${id}`, { method: 'PUT', body: payload });
