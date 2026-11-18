const URL_BASE = '/api/auth';
const CLAVE_TOKEN = 'lpr_access_token';

function obtenerToken() {
 if (typeof window === 'undefined') return null;
 return window.sessionStorage.getItem(CLAVE_TOKEN);
}
export function cerrarSesion() {
 if (typeof window !== 'undefined') window.sessionStorage.removeItem(CLAVE_TOKEN);
}
async function procesarRespuesta(respuesta) {
 const texto = await respuesta.text();
 let cuerpo;
 try { cuerpo = texto ? JSON.parse(texto) : null; } catch { cuerpo = null; }
 if (!respuesta.ok) {
  const detalle = typeof cuerpo?.detail === 'string' ? cuerpo.detail : Array.isArray(cuerpo?.detail) ? cuerpo.detail.map(error => error.msg).join('; ') : '';
  const error = new Error(respuesta.status >= 500 ? 'El servicio no está disponible en este momento. Inténtalo de nuevo.' : detalle || 'No se pudo completar la autenticación.');
  error.estado = respuesta.status;
  throw error;
 }
 return cuerpo;
}
export async function solicitarAPI(url, opciones = {}) {
 const token = obtenerToken();
 const headers = new Headers(opciones.headers);
 if (token) headers.set('Authorization', 'Bearer ' + token);
 const respuesta = await fetch(url, { ...opciones, headers });
 if (respuesta.status === 422 && typeof window !== 'undefined') {
  try {
   const cuerpo = await respuesta.clone().json();
   if (Array.isArray(cuerpo.detail)) window.dispatchEvent(new CustomEvent('lpr:errores-validacion', { detail: cuerpo.detail }));
  } catch { /* El servicio conserva el manejo de respuestas no JSON. */ }
 }

 if (respuesta.status === 401 && token && obtenerToken() === token) {
  cerrarSesion();
  window.dispatchEvent(new Event('lpr:sesion-expirada'));
 }
 if (token && obtenerToken() === token && typeof window !== 'undefined') {
  const cambiaPermisos = respuesta.ok && !['GET', 'HEAD'].includes((opciones.method || 'GET').toUpperCase()) && ['/api/modulo_x_rol/', '/api/modulo/', '/api/roles/', '/api/usuarios/'].some(ruta => String(url).startsWith(ruta));
  if (respuesta.status === 403 || cambiaPermisos) window.dispatchEvent(new Event('lpr:permisos-cambiados'));
 }
 return respuesta;
}
export async function obtenerSesion(signal) {
 if (!obtenerToken()) return null;
 const respuesta = await solicitarAPI(URL_BASE + '/sesion', { cache: 'no-store', signal });
 if (respuesta.status === 401) return null;
 const sesion = await procesarRespuesta(respuesta);
 if (!sesion?.usuario || !Number.isInteger(sesion.usuario.id_usuario) || !Number.isFinite(sesion.expira_en) || !Array.isArray(sesion.modulos) || sesion.modulos.some(modulo => !Number.isInteger(modulo.id_modulo) || !Array.isArray(modulo.rutas) || modulo.rutas.some(ruta => typeof ruta !== 'string' || !ruta.startsWith('/')))) throw new Error('No pudimos comprobar tu sesión. Vuelve a ingresar.');
 return sesion;
}
export async function iniciarSesion(correo, contrasena, signal) {
 const respuesta = await fetch(URL_BASE + '/login', {
  method: 'POST', cache: 'no-store', signal,
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ correo, contrasena })
 });
 const datos = await procesarRespuesta(respuesta);
 if (typeof datos?.access_token !== 'string' || datos.token_type?.toLowerCase() !== 'bearer') throw new Error('No pudimos iniciar sesión. Inténtalo de nuevo.');
 try { window.sessionStorage.setItem(CLAVE_TOKEN, datos.access_token); }
 catch { throw new Error('No pudimos mantener tu sesión abierta. Revisa si tu navegador permite guardar datos de este sitio.'); }
 try {
  const sesion = await obtenerSesion(signal);
  if (!sesion) throw new Error('No se pudo validar la sesión. Inicia sesión de nuevo.');
  return sesion;
 } catch (error) { cerrarSesion(); throw error; }
}
