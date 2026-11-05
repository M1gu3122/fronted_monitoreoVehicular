// La sesión se gestiona con JWT en el almacenamiento del navegador y el
// sistema es una aplicación interna de monitoreo. Desactivar SSR evita
// desajustes de hidratación y hace explícito el modo SPA del frontend.
export const ssr = false;

// La app se compila como salida estatica (adapter-static). El shell se
// prerenderiza una vez y `fallback: 'index.html'` resuelve el resto de rutas
// en el cliente.
export const prerender = true;
