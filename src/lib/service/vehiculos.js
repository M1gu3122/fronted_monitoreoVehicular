import { request } from './client.js';

const BASE = '/vehiculos';

export const listarVehiculos = () => request(`${BASE}/`);
export const obtenerVehiculo = (id) => request(`${BASE}/${id}`);
export const crearVehiculo = (payload) => request(`${BASE}/`, { method: 'POST', body: payload });
export const actualizarVehiculo = (id, payload) => request(`${BASE}/${id}`, { method: 'PUT', body: payload });
export const eliminarVehiculo = (id) => request(`${BASE}/${id}`, { method: 'DELETE' });

export const listarTiposVehiculo = () => request('/tipos_vehiculo/');
