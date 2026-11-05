// La sesión se gestiona con JWT en el almacenamiento del navegador y el
// sistema es una aplicación interna de monitoreo. Desactivar SSR evita
// desajustes de hidratación y hace explícito el modo SPA del frontend.
export const ssr = false;
