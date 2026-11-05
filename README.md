# LPR Control

Panel web para consultar el monitoreo y el flujo vehicular de un concesionario a partir de la API LPR (FastAPI + PostgreSQL). El frontend no genera datos de prueba ni simula conexiones: cada vista consulta la API real y muestra estados de carga, error o información parcial.

## Stack

- SvelteKit 3 con Svelte 5 en modo runes.
- Vite 8 y `adapter-auto`.
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

La aplicación abre en `http://localhost:5173`. El backend por defecto es `http://127.0.0.1:8000`.

## Compilación

```sh
npm run build
npm run preview
```

La compilación de producción fue verificada con `npm run build`. Para desplegar, configure el adaptador de SvelteKit que corresponda al entorno.

## Conexión con la API

El orden de resolución de la URL base es:

1. Valor guardado en el navegador en `lpr.api_base_url` (se edita en **Configuración**).
2. Variable de entorno `PUBLIC_API_BASE_URL` o `VITE_API_BASE_URL`.
3. Valor por defecto `http://127.0.0.1:8000`.

Ejemplo de `.env`:

```sh
PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

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
- `/configuracion`: preferencias locales y URL de la API.

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

Estas brechas se reflejan en la interfaz y deben corregirse en la API:

- `app/api/rutas_auth.py` usa `RealDictCursor` y `status` sin importarlos, por lo que el login puede fallar.
- `app/api/rutas_usuarios.py` declara `db_conn: object = Body(...)` en lugar de una dependencia de base de datos, además de usar `RealDictCursor` y `status` sin importar. Los endpoints de usuarios no funcionan en ese estado.
- `PUT /roles/{id}` pasa la clase `Roles` en lugar de una instancia al repositorio.
- Faltan dependencias declaradas en `requirements.txt` (`passlib`, `PyJWT`, `sqlalchemy`, entre otras).
- Los endpoints de administración no aplican autorización por rol. La restricción de la interfaz no sustituye la seguridad del backend.
- `camaras` exige `ubicacion` e `id_zona`; el formulario lo refleja.

## Estructura relevante

```text
src/
  app.css                     sistema visual
  lib/api/                    cliente HTTP y servicios por recurso
  lib/components/             shell, UI, modales, gráficas e iconos
  lib/stores/                 sesión, preferencias y notificaciones
  lib/utils/                  formato, dominio y transformación de datos
  routes/                     vistas de la aplicación
```

## Verificación

```sh
npm run build
```

## ✅ Qué se ha completado

- Compilación de producción (`npm run build`) sin errores (188 módulos transformados).
- Todas las vistas principales (dashboard, monitoreo, vehículos, zonas, cámaras, eventos, seguimientos, alertas, reportes, administración, configuración) renderizadas y funcionales.
- Corrección de encoding en `reportes` (reemplazo de mojibake y caracteres de control `\x14`).
- Migración de `client.js` a `import.meta.env` (`VITE_`/`PUBLIC_`) y eliminación de `$env/dynamic/public`.
- Implementación de `probeBackend()` como `boolean`, `formatNumber` ignora segundo argumento (se usa `.toFixed(1)` en reportes).
- Limpieza de imports no utilizados en `reportes`, `configuracion`, `eventos`, `dashboard` y `monitoreo`.
- Ajustes de accesibilidad (`label` asociados a inputs, ARIA adecuada).
- Favicon personalizado (`static\favicon.svg`).
- Documentación de brechas del backend (autenticación, usuarios, roles PUT, dependencias faltantes).

No hay suite de pruebas automatizadas en el proyecto.
