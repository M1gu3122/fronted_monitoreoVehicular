import { request } from './client.js';

const BASE = '/ocupacion_zona';

export const listarOcupacion = () => request(`${BASE}/`);
