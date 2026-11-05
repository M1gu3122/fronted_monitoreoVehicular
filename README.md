# LPR Control

Panel web para consultar el monitoreo y el flujo vehicular de un concesionario a partir de la API LPR (FastAPI + PostgreSQL). El frontend no genera datos de prueba ni simula conexiones: cada vista consulta la API real y muestra estados de carga, error o información parcial.

## Stack

- SvelteKit 3 con Svelte 5 en modo runes.
- Vite 8 y `adapter-static` (salida estática, modo SPA).
- Bootstrap 5.3 (solo CSS; sin JavaScript de Bootstrap).
- Componentes propios: modales con `<dialog>`, iconos SVG, gráficas SVG y paginación.
- Sin librerías de gráficas ni de estado externas.

## Requisitos

- Node.js 20 o superior.
- Backend LPR disponible y con CORS habilitado para el origen del frontend.
- Base de datos PostgreSQL inicializada con el esquema y datos del backend.

## Desarrollo

```sh
npm install
npm run dev
```

La aplicación abre en `http://localhost:5173`. Por defecto consume la API desplegada en
`https://api-carro.vercel.app`; para apuntar a un backend local, defina `PUBLIC_API_BASE_URL`.

## Compilación

```sh
npm run build   # genera la carpeta build/
npm run preview # sirve build/ en http://localhost:4173
```

La app es una SPA pura (`ssr = false` en `src/routes/+layout.js`), por lo que `adapter-static`
genera un `build/` estático con `index.html` como fallback para las rutas del cliente.

## Despliegue en Vercel

El repositorio ya incluye `vercel.json` con la configuración de build y las reglas de
enrutado SPA. El flujo en el panel de Vercel es:

1. **Add New → Project → Import** y seleccionar el repositorio `M1gu3122/fronted_monitoreoVehicular`.
2. En *Framework Preset* seleccionar **Other** (la configuración de `vercel.json` ya lo fija).
3. En *Build & Deployment* verificar:
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm ci`
4. Opcional en *Settings → Environment Variables*: `PUBLIC_API_BASE_URL = https://api-carro.vercel.app`
   (no es necesario, ya es el valor por defecto del cliente).
5. **Deploy**. Cada `push` a `main` dispara un despliegue nuevo.

Para publicar un build ya generado desde el equipo local, comprime la carpeta `build/`
y súbela con la CLI de Vercel (`vercel deploy --prod`) o arrástrala al panel.

Las rutas profundas (por ejemplo `/visitas/12`) dependen del `rewrite` de `vercel.json`:
sin él, Vercel respondería 404 porque solo existen archivos `.html` prerenderizados.

## Conexión con la API

El orden de resolución de la URL base es:

1. Valor guardado en el navegador en `lpr.api_base_url` (clave de `localStorage`).
2. Variable de entorno `PUBLIC_API_BASE_URL` o `VITE_API_BASE_URL`.
3. Valor por defecto `https://api-carro.vercel.app`.

Para configurar el backend, copie el archivo de ejemplo y ajuste la URL:

```sh
cp .env.example .env
```

```sh
PUBLIC_API_BASE_URL=https://api-carro.vercel.app
```

> **Nota:** el cliente expone `setApiBaseUrl(url)` en `src/lib/service/client.js`, pero
> todavía no existe la vista `/configuracion` que lo invoque. Por ahora la URL se
> define por variable de entorno o escribiendo `lpr.api_base_url` en `localStorage`.

La comprobación de disponibilidad consulta `GET /openapi.json`. No valida la base de datos ni la salud de cada módulo.

## Sesión y acceso

- Login: `POST /auth/login` con `correo` y `contrasena`.
- Perfil: `GET /auth/perfil`.
- Los tokens se guardan en `localStorage` (`lpr.access_token`, `lpr.refresh_token`) y el usuario en `lpr.user`.
- También existe un modo invitado para explorar la interfaz sin token. El módulo **Administración** exige sesión.
- Las alertas solo pueden cambiar de estado con una sesión que exponga `id_usuario`, porque el backend exige `id_usuario_resuelve`.

## Rutas

- `/`: dashboard operativo.
- `/monitoreo`: vehículos dentro del área y permanencia.
- `/visitas` y `/visitas/[id]`: historial y detalle con eventos, seguimientos y alertas.
- `/vehiculos`: registro maestro y CRUD.
- `/zonas`: capacidad, ocupación e historial por zona.
- `/camaras`: inventario, actividad y asociación con zonas.
- `/eventos`: explorador de eventos con exportación CSV.
- `/seguimientos`: trayectorias, eventos y asociaciones.
- `/alertas`: bandeja y cambio de estado de resolución.
- `/reportes`: resumen operativo por rango de fechas y zona.
- `/administracion`: usuarios, roles, permisos y diagnóstico de la API.
- `/configuracion`: *pendiente de implementar* (preferencias locales y URL de la API).

## Datos y cálculos

- Los indicadores, promedios, agrupaciones y exportaciones se calculan en el navegador con los listados de la API.
- La ocupación porcentual usa `cantidad_vehiculos / capacidad_maxima`.
- La permanencia de visitas abiertas se calcula contra la hora actual.
- El umbral de permanencia es una preferencia local y no altera reglas del backend.
- No se muestran imágenes ni video porque el contrato actual de la API no expone streaming.

## Preferencias locales

Clave `lpr.preferences.v1`:

- `umbralPermanenciaMin`
- `refreshIntervalSec`
- `pageSize`
- `compactTables`

Aplican al dashboard, a Monitoreo y a los listados paginados. No se sincronizan entre equipos.

## Limitaciones conocidas del backend

Verificadas contra la API desplegada en `https://api-carro.vercel.app` (OpenAPI 3.1, 25 rutas).
Estas brechas se reflejan en la interfaz y deben corregirse en la API:

### Endpoints ausentes (404)

- `GET/POST /vehiculos/` y `GET/PUT/DELETE /vehiculos/{id}` no existen. La vista **Vehículos**
  queda sin datos y el dashboard y Monitoreo pierden ese indicador. La API solo expone
  `/tipos_vehiculo/` (catálogo de tipos).
- `GET/POST /visitas/` y `GET/PUT /visitas/{id}` no existen. Las vistas **Visitas** y el detalle
  `/visitas/[id]` quedan sin datos. `visitas` solo aparece como clave foránea
  (`id_visita`) en alertas, eventos y seguimientos.
- `GET /auth/perfil` no existe. El frontend lo resuelve por su cuenta: decodifica el `sub` del
  JWT y consulta `/usuarios/` para refrescar el rol.
- `POST /auth/logout` no existe. El cierre de sesión es local (se borran los tokens del navegador).

### Autorización y datos sensibles (crítico)

- `GET /usuarios/` responde **sin token** y devuelve el campo `contrasena_hash`. Cualquiera que
  conozca la URL puede descargar los hashes de contraseña.
- `POST /usuarios/` responde **sin token** y crea usuarios. No hay control de acceso ni de rol.
- Los endpoints de escritura (`POST/PUT/DELETE`) no aplican autorización por rol ni por token.
  La restricción de la interfaz no sustituye la seguridad del backend.

### Errores del servidor

- `PUT /usuarios/{id}` y `DELETE /usuarios/{id}` devuelven **500 Internal Server Error** en
  cualquier registro. Probablemente faltan importaciones (`status`, `RealDictCursor`) o la
  dependencia de base de datos en `rutas_usuarios.py`. Por eso no se pueden depurar usuarios
  desde la interfaz.
- `PUT /roles/{id_rol}` pasa la clase `Roles` en lugar de una instancia al repositorio.

### Contrato de autenticación

- `TokenResponse` solo declara `access_token`; **no existe `refresh_token`**. El frontend
  guarda la clave `lpr.refresh_token` en `localStorage`, pero nunca recibe un valor: la
  sesión no tiene renovación silenciosa.
- `PUT /roles/{id_rol}` y `PUT /usuarios/{id_usuario}` devuelven 500.
- `camaras` exige `ubicacion` e `id_zona`; el formulario lo refleja.

### Verificado como correcto

- `POST /auth/login` valida credenciales y responde `401` con mensaje claro.
- CORS refleja cualquier origen (`Access-Control-Allow-Origin` dinámico) y admite
  `authorization` y `content-type`.
- Los 14 listados (`zonas`, `camaras`, `eventos_vehiculo`, `seguimientos`, `alertas`,
  `ocupacion_zona`, `roles`, `usuarios`, `modulo`, `modulo_x_rol`, `tipos_vehiculo`,
  `asociaciones_seguimiento`) responden `200` con datos.

## Estructura relevante

```text
src/
  app.css                     sistema visual
  app.html                    plantilla HTML
  lib/
    components/               shell, UI, modales, gráficas e iconos
    service/                  cliente HTTP y servicios por recurso
    stores/                   sesión, preferencias y notificaciones
    utils/                    formato, dominio y transformación de datos
    nav.js                    definición del menú lateral
  routes/                     vistas de la aplicación
static/                       archivos servidos tal cual (favicon, robots.txt)
```

## Verificación

```sh
npm run build
npm run preview
```

## ✅ Qué se ha completado

- Compilación de producción (`npm run build`) sin errores y salida estática en `build/`.
- Vistas implementadas: dashboard, monitoreo, visitas (listado y detalle), vehículos, zonas, cámaras, eventos, seguimientos, alertas, reportes y administración.
- Corrección de encoding en `reportes` (reemplazo de mojibake y caracteres de control `\x14`).
- Migración de `client.js` a `import.meta.env` (`VITE_`/`PUBLIC_`) y eliminación de `$env/dynamic/public`.
- Implementación de `probeBackend()` como `boolean`, `formatNumber` ignora segundo argumento (se usa `.toFixed(1)` en reportes).
- Limpieza de imports no utilizados en `reportes`, `eventos`, `dashboard` y `monitoreo`.
- Ajustes de accesibilidad (`label` asociados a inputs, ARIA adecuada).
- Favicon personalizado (`static\favicon.svg`).
- Modo SPA (`ssr = false`) con `adapter-static`, fallback `index.html` y reescrituras SPA en `vercel.json`.
- URL de la API apuntando a `https://api-carro.vercel.app` por defecto.
- Documentación de brechas del backend verificadas contra la API desplegada.

No hay suite de pruebas automatizadas en el proyecto.

## Estado del repositorio

- Rama principal: `main`, remoto `origin` → `github.com/M1gu3122/fronted_monitoreoVehicular`.
- `node_modules/`, `.svelte-kit/`, `build/` y los archivos `.env` están excluidos.
- `.env.example` documenta las variables disponibles.
- `.gitattributes` normaliza los finales de línea a `LF`.
- `vercel.json` define build, directorio de salida y reescrituras SPA.

Pendientes conocidos:

- Falta la vista `/configuracion`; la URL de la API se configura por `.env` o por `localStorage`.
- La API no expone `/vehiculos/` ni `/visitas/`: esas dos vistas quedan sin datos.
- No hay archivo `LICENSE`; el paquete es privado (`"private": true`).
- `npm audit` reporta 4 vulnerabilidades **bajas** en `deepmerge`, dependencia de build de
  `@sveltejs/vite-plugin-svelte`. No existe versión corregida publicada; no afecta al runtime
  del navegador porque es una dependencia exclusiva de `devDependencies`.
