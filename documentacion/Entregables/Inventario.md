# Inventario técnico del sistema de gestión vehicular

**Corte del 18 de noviembre de 2026.** La interfaz de gestión de un concesionario incluye trece páginas. Su API expone 79 operaciones sobre datos operativos y de acceso. El código permite reconstruir qué campos intercambian los componentes. El ensayo local con tres perfiles sintéticos acreditó el alta y la corrección de una visita. El informe documenta la comprobación independiente en la base de ensayo; la instalación del concesionario queda pendiente de contraste.

## Alcance y evidencia reproducible

Las rutas que comienzan por `src/` son relativas a `gestionVehicular`. Las que comienzan por `app/` y el archivo `main.py` pertenecen a `api-lpr`. Se revisaron los registros de routers, modelos Pydantic, SQL, servicios JavaScript y componentes Svelte. En un proceso Python del entorno virtual del backend se importó la aplicación y se generó su contrato en memoria con `app.openapi()`. Esta prueba ejercita la construcción del esquema. En esta comprobación el proceso no abrió puertos ni leyó filas de clientes.

| Medición del contrato | Resultado observado |
| --- | --- |
| Especificación generada | OpenAPI 3.1.0 |
| Patrones de ruta distintos | 37 |
| Operaciones registradas | 36 GET, 15 POST, 14 PUT y 14 DELETE |
| Campos obligatorios de Visitas | `fecha_entrada`, `fecha_salida`, `id_vehiculo` |
| Campos obligatorios de Alertas | `tipo_alerta`, `mensaje`, `estado_resolucion`, `fecha_resolucion`, `id_usuario_resuelve`, `id_visita`, `id_zona` |
| Campos de auditoría declarados en el modelo Alertas | Ninguno de los dos atributos `creado` y `actualizado` que lee el repositorio |

La cuenta de operaciones se reprodujo también sobre los decoradores de `app/api` y el registro en `main.py` a partir de la línea 43. Excluye las páginas internas de documentación del framework.

## Componentes y despliegue

| Componente | Evidencia en el proyecto | Función verificable |
| --- | --- | --- |
| Svelte, SvelteKit y Vite | `package.json`, `vite.config.js`, `src/routes` | Componentes y rutas de interfaz. Versiones declaradas con rango de compatibilidad Svelte 5, SvelteKit 3 y Vite 8. |
| Bootstrap, DataTables y GSAP | `package.json`, `src/routes/+layout.svelte`, `src/routes/monitoreo/+page.svelte:49` | Estilos, tablas interactivas y animación. |
| Cliente HTTP | `src/lib/services/api_auth.js`, `vite.config.js:8` | Añade el token de sesión y envía solicitudes a `/api`. El proxy de desarrollo elimina ese prefijo y reenvía a la API local en el puerto 8000. |
| FastAPI, Pydantic y Uvicorn | `main.py`, `requirements.txt`, `app/api`, `app/models` | Enrutamiento, control de acceso y validación del contrato. Uvicorn figura como servidor ASGI. |
| PostgreSQL y psycopg2 | `app/core/database.py:17`, `app/repositories` | Conexiones configurables y SQL parametrizado. Las consultas analíticas usan agregaciones y lecturas en transacción. |
| Instalación en nube | `vite.config.js:10` | Hay un destino alternativo comentado. La disponibilidad de la aplicación, la API y una base en nube requiere comprobación en el entorno desplegado. |

## Autenticación y acceso

El usuario inicia sesión con correo y contraseña. La API verifica el estado del usuario, comprueba el hash bcrypt y emite un JWT HS256 con vigencia de treinta minutos. El navegador conserva el token en `sessionStorage` y solicita el perfil con `GET /auth/sesion`. En las rutas protegidas se vuelve a consultar el perfil y la asignación vigente. El guardián exige usuario, rol, vínculo y módulo activos. Un 401 corresponde a una sesión inválida y un 403 en rutas protegidas indica que falta el módulo. El login también puede responder 403 para un usuario inactivo. Véanse `app/api/auth_routes.py:9`, `app/core/security.py:15`, `app/repositories/modulo_x_rol_repo.py:68` y `src/lib/services/api_auth.js:23`.

| ID del módulo en el controlador | Páginas de la interfaz | Recursos API sometidos a la asignación |
| --- | --- | --- |
| 1 | `/` | dashboard |
| 2 | `/vehiculos` | vehiculos, tipos_vehiculo |
| 3 | `/visitas`, `/visitas/[id]` | visitas |
| 4 | `/monitoreo`, `/camaras` | monitoreo, camaras |
| 5 | `/zonas` | zonas, ocupacion_zona |
| 6 | `/eventos`, `/seguimientos` | eventos_vehiculo, seguimientos, asociaciones_seguimiento |
| 7 | `/alertas` | alertas |
| 8 | `/reportes` | reportes |
| 9 | `/administracion` | usuarios, roles, modulo, modulo_x_rol |

La página pública adicional es `/login`. Las nueve asignaciones proceden de `app/core/security.py:19`. Un rol puede agrupar varios módulos y un módulo puede pertenecer a varios roles. El controlador comprueba la asignación para todo el router. La evidencia del código permite describir perfiles de ensayo, por ejemplo, administración, operación de visitas y supervisión. Los nombres efectivos, la existencia de al menos tres roles activos y los permisos de sus cuentas deben acreditarse con el catálogo de la instalación.

## Operaciones por recurso

En las catorce filas siguientes cada colección admite `GET` y `POST` en `/recurso/`. Cada ruta de detalle admite `GET`, `PUT` y `DELETE`. Las cuatro rutas de catálogo admiten únicamente `GET`. Los nombres de los parámetros reproducen los routers de `app/api/rutas_*.py`. La interfaz puede ofrecer menos acciones que el router.

| Colección | Sufijo del detalle | Catálogo adicional | Uso en las páginas |
| --- | --- | --- | --- |
| vehiculos | `{id_vehiculo}` | — | Registro, edición, consulta y eliminación. |
| tipos_vehiculo | `{id_tipo}` | — | Selección de tipo en Vehículos. |
| visitas | `{id_visita}` | `/visitas/catalogos` | Registro con entrada y salida, listado, detalle y edición o eliminación. |
| zonas | `{id_zona}` | — | Registro y edición de zonas, capacidad y polígono. |
| camaras | `{id_camara}` | `/camaras/catalogos` | Inventario, registro, edición y selección de zona. |
| ocupacion_zona | `{id_ocupacion}` | — | Servicio cliente presente. El tablero muestra mediciones a través de su consulta agregada. |
| eventos_vehiculo | `{id_evento}` | `/eventos_vehiculo/catalogos` | Gestión de eventos ligados a visita, cámara, zona y seguimiento opcional. |
| seguimientos | `{id_seguimiento}` | `/seguimientos/catalogos` | Gestión de trayectorias registradas por cámara y visita. |
| asociaciones_seguimiento | `{id_asociacion}` | — | API de asociación de trayectorias. No se localizó pantalla dedicada. |
| alertas | `{id_alerta}` | — | Listado y formulario de gestión. La escritura presenta los defectos descritos más abajo. |
| usuarios | `{id_usuario}` | — | Alta, edición y cambio de estado desde Administración. |
| roles | `{id_rol}` | — | Gestión de roles en Administración. |
| modulo | `{id_modulo}` | — | Catálogo para la matriz de permisos. |
| modulo_x_rol | `{id_rol}/{id_modulo}` | — | Activación y retirada de vínculos en la matriz de permisos. |

Los otros cinco métodos y rutas son `POST /auth/login`, `GET /auth/sesion`, `GET /dashboard/`, `GET /monitoreo/` y `GET /reportes/`. El monitoreo acepta filtros, paginación y ordenación en servidor. Los reportes agregan datos por período, con zona opcional. El tablero reúne entradas, salidas, alertas y última ocupación disponible.

## Modelo lógico reconstruido

Las catorce tablas anteriores se identifican por las sentencias SQL de los repositorios homónimos. El identificador de la ruta de detalle identifica la fila consultada por la aplicación. Estas relaciones están sustentadas por uniones o campos de modelos y escrituras SQL. Sin el esquema físico de la instalación quedan pendientes las restricciones declaradas, los índices, las acciones en cascada y los valores por defecto.

| Tabla dependiente | Tablas de referencia y columnas |
| --- | --- |
| vehiculos | tipos_vehiculo por `id_tipo` |
| visitas | vehiculos por `id_vehiculo` |
| camaras, ocupacion_zona | zonas por `id_zona` en cada tabla |
| seguimientos | visitas por `id_visita` y camaras por `id_camara` |
| asociaciones_seguimiento | Dos referencias lógicas a seguimientos, `id_seguimiento_origen` e `id_seguimiento_destino` |
| eventos_vehiculo | visitas, camaras, zonas y opcionalmente seguimientos mediante sus identificadores |
| alertas | visitas, zonas y usuarios mediante `id_visita`, `id_zona` e `id_usuario_resuelve` |
| usuarios | roles mediante `id_rol` |
| modulo_x_rol | roles y modulo mediante el par `id_rol`, `id_modulo` |

## Hallazgos que condicionan la demostración

1. **Registro y visita.** La pantalla de vehículos construye los seis campos que escribe el repositorio. La API devuelve el ID tras el commit. Una segunda sesión con acceso a visitas puede recargar el catálogo y buscar esa placa. Crear una visita desde su pantalla exige ambas marcas temporales. El monitoreo sí consulta visitas abiertas preexistentes. Trazas en `src/routes/vehiculos/+page.svelte:223`, `app/repositories/vehiculos_repo.py:28`, `src/routes/visitas/+page.svelte:182`, `app/models/visitas.py:9` y `app/repositories/visitas_repo.py:71`.
2. **Ocupación y permanencia.** El tablero recupera la última medición activa no futura de cada zona y conserva el estado «Sin información» cuando falta una medición. El monitoreo vincula la visita con su último evento activo y calcula minutos desde la entrada. Esto permite explicar la última zona conocida y la duración de la visita. Para afirmar permanencia por zona y plaza individual se requiere evidencia adicional. Trazas en `app/repositories/dashboard_repo.py:55`, `app/repositories/monitoreo_repo.py:20` y `src/routes/+page.svelte:70`.
3. **Gestión de alertas.** En el cliente, las funciones de alta y edición usan la variable local `datos` antes de inicializarla. El formulario envía `tipo` y el modelo exige `tipo_alerta` y `estado_resolucion`. Además, el SQL intenta leer del modelo los campos ausentes `creado` y `actualizado`. La vista cuenta resueltas mediante `estado`; el tablero combina `estado` con `estado_resolucion`. No se puede acreditar una resolución exitosa ni la actualización de sus marcas con ese flujo. Trazas en `src/lib/services/api_alertas.js:85`, `src/routes/alertas/+page.svelte:53`, `src/routes/alertas/+page.svelte:132`, `app/models/alertas.py:7` y `app/repositories/alertas_repo.py:31`.
4. **Captura multicámara.** Se registran cámaras, eventos y seguimientos; la asociación distingue origen y destino. En la inserción de asociaciones, la columna `actualizado` recibe el booleano `estado`. No se identificó un proceso de captura de video, reconocimiento de placas, detección de estacionamiento indebido o generación autónoma de alertas en las dos aplicaciones. La simultaneidad de cámaras y la mejora en los tiempos de espera quedan sin medir. Trazas en `app/models/seguimientos.py:7`, `app/models/eventos_vehiculo.py:6` y `app/repositories/asociaciones_seguimiento_repo.py:28`.
5. **Uso de DataTables.** Siete páginas invocan el constructor de la biblioteca: tablero, monitoreo, visitas, eventos, seguimientos, reportes y administración. En monitoreo, el refresco periódico está programado cada treinta segundos y depende de la visibilidad, la actividad de la tabla y el foco. Trazas en `src/routes/monitoreo/+page.svelte:49` y línea 77. La pantalla de vehículos usa una tabla Svelte.
6. **Auditoría y despliegue.** La escritura de vehículos incluye `fecha_registro` y `estado`; la de visitas incluye entrada, salida y estado. Su SQL no establece `creado` ni `actualizado`. Es preciso consultar el esquema físico y observar una fila antes y después de editar para acreditar marcas automáticas de base de datos. La prueba local se ejecutó sobre un esquema mínimo con tres perfiles sintéticos. La verificación en nube y las marcas de auditoría del esquema institucional siguen pendientes.
7. **Documentación histórica.** `lista_tareas_pending.md` marca como ausentes la gestión de roles y los permisos. La interfaz actual sí gestiona roles y asociaciones y consulta módulos dentro de Administración. El flujo Vehículos–Visitas se probó con tres roles en el entorno aislado. El catálogo de roles activos de la instalación institucional queda por comprobar. Trazas en `src/routes/administracion/+page.svelte:24`, línea 138 y línea 231.
