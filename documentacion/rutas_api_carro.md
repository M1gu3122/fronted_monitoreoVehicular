# Documentación de rutas de la API

**URL base:** `https://api-carro.vercel.app`  
**Formato de contenido:** `application/json`

---

# 1. Autenticación

## Iniciar sesión

**POST**

`/auth/login`

Iniciar Sesión

Body:
- `correo`: string (email)
- `contrasena`: string

---

## Consultar sesión JWT

**GET** `/auth/sesion`

Requiere `Authorization: Bearer <access_token>`. Devuelve `usuario` (identificador, nombre, correo y rol, sin contraseña ni hash) y `expira_en` (segundos Unix). También devuelve `modulos`: los módulos activos asignados al rol actual, con `id_modulo`, `nombre_modulo` y sus `rutas` del frontend. Un token inválido, expirado o de un usuario desactivado produce HTTP 401.

El login devuelve el JWT en `access_token`, con `token_type: bearer` y duración de 30 minutos. No establece cookies. El frontend conserva el token en `sessionStorage` durante la sesión de la pestaña, lo envía con las solicitudes y lo elimina al cerrar sesión. Las rutas de datos requieren el token; `/auth/login` permanece público.

---

# 2. Usuarios

## Listar usuarios

**GET**

`/usuarios/`

Listar Usuarios

## Crear usuario

**POST**

`/usuarios/`

Crear Usuario

Body:
- `nombre`: string
- `correo`: string (email)
- `contrasena_hash`: string
- `estado`: boolean
- `id_rol`: integer

## Obtener usuario

**GET**

`/usuarios/{id_usuario}`

Obtener Usuario

Parameters:
- `id_usuario`: integer (path)

## Actualizar usuario

**PUT**

`/usuarios/{id_usuario}`

Actualizar Usuario

Parameters:
- `id_usuario`: integer (path)

Body:
- `nombre`: string
- `correo`: string (email)
- `contrasena_hash`: string
- `estado`: boolean
- `id_rol`: integer

## Eliminar usuario

**DELETE**

`/usuarios/{id_usuario}`

Eliminar Usuario

Parameters:
- `id_usuario`: integer (path)

---

# 3. Vehículos

## Listar vehículos

**GET**

`/vehiculos/`

Listar Vehículos

## Crear vehículo

**POST**

`/vehiculos/`

Crear Vehículo

Body:
- `placa`: string
- `marca`: string
- `modelo`: string
- `color`: string
- `fecha_registro`: datetime
- `estado`: boolean
- `id_tipo`: integer

## Obtener vehículo

**GET**

`/vehiculos/{id_vehiculo}`

Obtener Vehículo

Parameters:
- `id_vehiculo`: integer (path)

## Actualizar vehículo

**PUT**

`/vehiculos/{id_vehiculo}`

Actualizar Vehículo

Parameters:
- `id_vehiculo`: integer (path)

Body:
- `placa`: string
- `marca`: string
- `modelo`: string
- `color`: string
- `fecha_registro`: datetime
- `estado`: boolean
- `id_tipo`: integer

## Eliminar vehículo

**DELETE**

`/vehiculos/{id_vehiculo}`

Eliminar Vehículo

Parameters:
- `id_vehiculo`: integer (path)

---

# 4. Visitas

## Listar visitas

**GET**

`/visitas/`

Listar Visitas

## Crear visita

**POST**

`/visitas/`

Crear Visita

Body:
- `fecha_entrada`: datetime
- `fecha_salida`: datetime
- `estado`: boolean
- `id_vehiculo`: integer

## Obtener visita

**GET**

`/visitas/{id_visita}`

Obtener Visita

Parameters:
- `id_visita`: integer (path)

## Actualizar visita

**PUT**

`/visitas/{id_visita}`

Actualizar Visita

Parameters:
- `id_visita`: integer (path)

Body:
- `fecha_entrada`: datetime
- `fecha_salida`: datetime
- `estado`: boolean
- `id_vehiculo`: integer

## Eliminar visita

**DELETE**

`/visitas/{id_visita}`

Eliminar Visita

Parameters:
- `id_visita`: integer (path)

---

# 5. Tipos de vehículo

## Listar tipos de vehículo

**GET**

`/tipos_vehiculo/`

Listar Tipos Vehículo

## Crear tipo de vehículo

**POST**

`/tipos_vehiculo/`

Crear Tipo Vehículo

Body:
- `nombre`: string
- `descripcion`: string
- `estado`: boolean

## Obtener tipo de vehículo

**GET**

`/tipos_vehiculo/{id_tipo}`

Obtener Tipo Vehículo

Parameters:
- `id_tipo`: integer (path)

## Actualizar tipo de vehículo

**PUT**

`/tipos_vehiculo/{id_tipo}`

Actualizar Tipo Vehículo

Parameters:
- `id_tipo`: integer (path)

Body:
- `nombre`: string
- `descripcion`: string
- `estado`: boolean

## Eliminar tipo de vehículo

**DELETE**

`/tipos_vehiculo/{id_tipo}`

Eliminar Tipo Vehículo

Parameters:
- `id_tipo`: integer (path)

---

# 6. Zonas

## Listar zonas

**GET**

`/zonas/`

Listar Zonas

## Crear zona

**POST**

`/zonas/`

Crear Zona

Body:
- `nombre`: string
- `tipo`: string
- `capacidad_maxima`: integer
- `poligono`: object
- `estado`: boolean

## Obtener zona

**GET**

`/zonas/{id_zona}`

Obtener Zona

Parameters:
- `id_zona`: integer (path)

## Actualizar zona

**PUT**

`/zonas/{id_zona}`

Actualizar Zona

Parameters:
- `id_zona`: integer (path)

Body:
- `nombre`: string
- `tipo`: string
- `capacidad_maxima`: integer
- `poligono`: object
- `estado`: boolean

## Eliminar zona

**DELETE**

`/zonas/{id_zona}`

Eliminar Zona

Parameters:
- `id_zona`: integer (path)

---

# 7. Cámaras

## Listar cámaras

**GET**

`/camaras/`

Listar Cámaras

## Crear cámara

**POST**

`/camaras/`

Crear Cámara

Body:
- `nombre`: string
- `ubicacion`: string
- `fecha_registro`: datetime
- `estado`: boolean
- `id_zona`: integer

## Obtener cámara

**GET**

`/camaras/{id_camara}`

Obtener Cámara

Parameters:
- `id_camara`: integer (path)

## Actualizar cámara

**PUT**

`/camaras/{id_camara}`

Actualizar Cámara

Parameters:
- `id_camara`: integer (path)

Body:
- `nombre`: string
- `ubicacion`: string
- `fecha_registro`: datetime
- `estado`: boolean
- `id_zona`: integer

## Eliminar cámara

**DELETE**

`/camaras/{id_camara}`

Eliminar Cámara

Parameters:
- `id_camara`: integer (path)

---

# 8. Seguimientos

## Listar seguimientos

**GET**

`/seguimientos/`

Listar Seguimientos

## Crear seguimiento

**POST**

`/seguimientos/`

Crear Seguimiento

Body:
- `id_tracking`: string
- `inicio`: datetime
- `fin`: datetime
- `confianza_promedio`: decimal
- `estado`: boolean
- `id_visita`: integer
- `id_camara`: integer

## Obtener seguimiento

**GET**

`/seguimientos/{id_seguimiento}`

Obtener Seguimiento

Parameters:
- `id_seguimiento`: integer (path)

## Actualizar seguimiento

**PUT**

`/seguimientos/{id_seguimiento}`

Actualizar Seguimiento

Parameters:
- `id_seguimiento`: integer (path)

Body:
- `id_tracking`: string
- `inicio`: datetime
- `fin`: datetime
- `confianza_promedio`: decimal
- `estado`: boolean
- `id_visita`: integer
- `id_camara`: integer

## Eliminar seguimiento

**DELETE**

`/seguimientos/{id_seguimiento}`

Eliminar Seguimiento

Parameters:
- `id_seguimiento`: integer (path)

---

# 9. Asociaciones de seguimiento

## Listar asociaciones

**GET**

`/asociaciones_seguimiento/`

Listar Asociaciones Seguimiento

## Crear asociación

**POST**

`/asociaciones_seguimiento/`

Crear Asociación Seguimiento

Body:
- `metodo`: string
- `confianza`: decimal
- `resultado`: string
- `fecha_evaluacion`: datetime
- `estado`: boolean
- `id_seguimiento_origen`: integer
- `id_seguimiento_destino`: integer

## Obtener asociación

**GET**

`/asociaciones_seguimiento/{id_asociacion}`

Obtener Asociación Seguimiento

Parameters:
- `id_asociacion`: integer (path)

## Actualizar asociación

**PUT**

`/asociaciones_seguimiento/{id_asociacion}`

Actualizar Asociación Seguimiento

Parameters:
- `id_asociacion`: integer (path)

Body:
- `metodo`: string
- `confianza`: decimal
- `resultado`: string
- `fecha_evaluacion`: datetime
- `estado`: boolean
- `id_seguimiento_origen`: integer
- `id_seguimiento_destino`: integer

## Eliminar asociación

**DELETE**

`/asociaciones_seguimiento/{id_asociacion}`

Eliminar Asociación Seguimiento

Parameters:
- `id_asociacion`: integer (path)

---

# 10. Eventos de vehículo

## Listar eventos

**GET**

`/eventos_vehiculo/`

Listar Eventos Vehículo

## Crear evento

**POST**

`/eventos_vehiculo/`

Crear Evento Vehículo

Body:
- `tipo_evento`: string
- `fecha_hora`: datetime
- `confianza`: decimal
- `estado`: boolean
- `id_visita`: integer
- `id_camara`: integer
- `id_seguimiento`: integer
- `id_zona`: integer

## Obtener evento

**GET**

`/eventos_vehiculo/{id_evento}`

Obtener Evento Vehículo

Parameters:
- `id_evento`: integer (path)

## Actualizar evento

**PUT**

`/eventos_vehiculo/{id_evento}`

Actualizar Evento Vehículo

Parameters:
- `id_evento`: integer (path)

Body:
- `tipo_evento`: string
- `fecha_hora`: datetime
- `confianza`: decimal
- `estado`: boolean
- `id_visita`: integer
- `id_camara`: integer
- `id_seguimiento`: integer
- `id_zona`: integer

## Eliminar evento

**DELETE**

`/eventos_vehiculo/{id_evento}`

Eliminar Evento Vehículo

Parameters:
- `id_evento`: integer (path)

---

# 11. Ocupación de zona

## Listar ocupaciones

**GET**

`/ocupacion_zona/`

Listar Ocupación Zona

## Crear ocupación

**POST**

`/ocupacion_zona/`

Crear Ocupación Zona

Body:
- `fecha_hora`: datetime
- `cantidad_vehiculos`: integer
- `estado`: boolean
- `id_zona`: integer

## Obtener ocupación

**GET**

`/ocupacion_zona/{id_ocupacion}`

Obtener Ocupación Zona

Parameters:
- `id_ocupacion`: integer (path)

## Actualizar ocupación

**PUT**

`/ocupacion_zona/{id_ocupacion}`

Actualizar Ocupación Zona

Parameters:
- `id_ocupacion`: integer (path)

Body:
- `fecha_hora`: datetime
- `cantidad_vehiculos`: integer
- `estado`: boolean
- `id_zona`: integer

## Eliminar ocupación

**DELETE**

`/ocupacion_zona/{id_ocupacion}`

Eliminar Ocupación Zona

Parameters:
- `id_ocupacion`: integer (path)

---

# 12. Alertas

## Listar alertas

**GET**

`/alertas/`

Listar Alertas

## Crear alerta

**POST**

`/alertas/`

Crear Alerta

Body:
- `tipo_alerta`: string
- `mensaje`: string
- `fecha_deteccion`: datetime
- `estado`: boolean
- `estado_resolucion`: string
- `fecha_resolucion`: string
- `id_usuario_resuelve`: integer
- `id_visita`: integer
- `id_zona`: integer

## Obtener alerta

**GET**

`/alertas/{id_alerta}`

Obtener Alerta

Parameters:
- `id_alerta`: integer (path)

## Actualizar alerta

**PUT**

`/alertas/{id_alerta}`

Actualizar Alerta

Parameters:
- `id_alerta`: integer (path)

Body:
- `tipo_alerta`: string
- `mensaje`: string
- `fecha_deteccion`: datetime
- `estado`: boolean
- `estado_resolucion`: string
- `fecha_resolucion`: string
- `id_usuario_resuelve`: integer
- `id_visita`: integer
- `id_zona`: integer

## Eliminar alerta

**DELETE**

`/alertas/{id_alerta}`

Eliminar Alerta

Parameters:
- `id_alerta`: integer (path)

---

# 13. Roles

## Listar roles

**GET**

`/roles/`

Listar Roles

## Crear rol

**POST**

`/roles/`

Crear Rol

Body:
- `nombre`: string
- `descripcion`: string
- `estado`: boolean

## Obtener rol

**GET**

`/roles/{id_rol}`

Obtener Rol

Parameters:
- `id_rol`: integer (path)

## Actualizar rol

**PUT**

`/roles/{id_rol}`

Actualizar Rol

Parameters:
- `id_rol`: integer (path)

Body:
- `nombre`: string
- `descripcion`: string
- `estado`: boolean

## Eliminar rol

**DELETE**

`/roles/{id_rol}`

Eliminar Rol

Parameters:
- `id_rol`: integer (path)

---

# 14. Módulos

## Listar módulos

**GET**

`/modulo/`

Listar Módulos

## Crear módulo

**POST**

`/modulo/`

Crear Módulo

Body:
- `nombre_modulo`: string
- `estado`: boolean

## Obtener módulo

**GET**

`/modulo/{id_modulo}`

Obtener Módulo

Parameters:
- `id_modulo`: integer (path)

## Actualizar módulo

**PUT**

`/modulo/{id_modulo}`

Actualizar Módulo

Parameters:
- `id_modulo`: integer (path)

Body:
- `nombre_modulo`: string
- `estado`: boolean

## Eliminar módulo

**DELETE**

`/modulo/{id_modulo}`

Eliminar Módulo

Parameters:
- `id_modulo`: integer (path)

---

# 15. Módulos por rol

## Listar módulos por rol

**GET**

`/modulo_x_rol/`

Listar Módulos Por Rol

## Crear asociación módulo-rol

**POST**

`/modulo_x_rol/`

Crear Módulo Por Rol

Body:
- `id_rol`: integer
- `id_modulo`: integer
- `estado`: boolean

## Obtener asociación módulo-rol

**GET**

`/modulo_x_rol/{id_rol}/{id_modulo}`

Obtener Módulo Por Rol

Parameters:
- `id_rol`: integer (path)
- `id_modulo`: integer (path)

## Actualizar asociación módulo-rol

**PUT**

`/modulo_x_rol/{id_rol}/{id_modulo}`

Actualizar Módulo Por Rol

Parameters:
- `id_rol`: integer (path)
- `id_modulo`: integer (path)

Body:
- `id_rol`: integer
- `id_modulo`: integer
- `estado`: boolean

## Eliminar asociación módulo-rol

**DELETE**

`/modulo_x_rol/{id_rol}/{id_modulo}`

Eliminar Módulo Por Rol

Parameters:
- `id_rol`: integer (path)
- `id_modulo`: integer (path)

---

# 16. Dashboard (consulta agregada)

**GET** `/dashboard/`

Parámetros de consulta opcionales:
- `zona_horaria`: nombre IANA; predeterminado `America/Bogota`.
- `umbral_minutos`: entero de 1 a 525600. Sin este parámetro, el indicador de permanencia prolongada es `null`.

Respuesta: `resumen`, `movimientos_hora`, `ocupacion_zonas`, `ultimos_eventos`, `alertas_abiertas`, `umbral_minutos` y `zona_horaria`.
Los conteos y cruces se calculan en PostgreSQL. La ocupación utiliza la última medición activa de cada zona; si no existe, conserva `null`. Los eventos y alertas recientes se limitan a diez registros.

# 17. Reportes (consulta agregada)

**GET** `/reportes/`

Parámetros opcionales: `desde` y `hasta` (YYYY-MM-DD), `id_zona` y `zona_horaria`.
Sin fechas se consultan los últimos 30 días, incluyendo hoy. El rango admite un máximo de 366 días y su fecha final es inclusiva en la zona horaria indicada.

Respuesta: `periodo`, `resumen`, `movimientos_dia`, `movimientos_hora`, `tipos_evento`, `resumen_zonas`, `zonas_disponibles`, `zona_horaria` e `id_zona`.
Las visitas del resumen y su duración se seleccionan por fecha de entrada. Las salidas de las series se seleccionan por fecha de salida. Al filtrar por zona, las visitas deben tener al menos un evento en esa zona y periodo. El resumen por zona cuenta visitas distintas y agrega eventos y alertas antes de unirlos, evitando duplicaciones. La última ocupación corresponde a la última medición disponible al cierre del rango.

# 18. Monitoreo vehicular (filtrado y paginación en servidor)

**GET** `/monitoreo/`

Parámetros opcionales:
- `busqueda`: placa, marca, modelo o identificador de visita; máximo 200 caracteres.
- `estado`: `dentro` (predeterminado), `finalizadas`, `sin_identificar` o `todas`.
- `id_zona`: última zona observada, identificada mediante el último evento activo de la visita.
- `permanencia`: `todas`, `excede` o `abiertas`. `excede` requiere `umbral_minutos`.
- `umbral_minutos`: entero entre 1 y 525600, opcional.
- `inicio`: desplazamiento desde cero; `limite`: de 1 a 100, predeterminado 10.
- `ordenar`: `id_visita`, `placa`, `fecha_entrada`, `duracion_minutos`, `zona` o `camara`.
- `direccion`: `asc` o `desc` (predeterminado).

Respuesta: `resumen`, `registros`, `zonas` y `umbral_minutos`.
`resumen.total` indica todas las visitas y `resumen.total_filtrado` las que cumplen los filtros. Los indicadores de visitas abiertas se calculan globalmente; requieren visita activa, entrada no futura y ausencia de salida. Una visita sin evento conserva su zona y cámara como `null`. La identificación se considera ausente si no hay placa disponible.

Estas rutas están implementadas en el backend local. Para utilizarlas en un servidor remoto debe desplegarse también esa versión del backend. Fechas o parámetros inválidos producen HTTP 422; los fallos de consulta producen HTTP 503.

---

# 19. Autorización por módulo

Todas las rutas de datos requieren JWT y una asignación activa en `modulo_x_rol`. La consulta utiliza el rol actual de `usuarios`, unido con `roles` y `modulo`; usuario, rol, módulo y asignación deben estar activos. Un nombre de rol como administrador no concede privilegios por sí mismo. Los cambios se aplican en la siguiente solicitud con el mismo JWT.

| ID del módulo | Pantallas | Recursos API |
|---|---|---|
| 1 | Dashboard | dashboard |
| 2 | Vehículos | vehiculos, tipos_vehiculo |
| 3 | Visitas y detalle | visitas |
| 4 | Monitoreo vehicular y Cámaras | monitoreo, camaras |
| 5 | Zonas y ocupación | zonas, ocupacion_zona |
| 6 | Eventos y Seguimientos | eventos_vehiculo, seguimientos, asociaciones_seguimiento |
| 7 | Alertas | alertas |
| 8 | Reportes | reportes |
| 9 | Administración | usuarios, roles, modulo, modulo_x_rol |

No hay excepciones de acceso implícitas para el administrador. Una sesión válida sin módulos asignados puede consultar su perfil y cerrar sesión en el navegador, pero no accede a datos de los módulos. HTTP 401 identifica una sesión inválida; HTTP 403 identifica falta de permiso y no cierra una sesión válida.

Los formularios obtienen únicamente sus referencias mediante `GET /visitas/catalogos`, `GET /camaras/catalogos`, `GET /seguimientos/catalogos` y `GET /eventos_vehiculo/catalogos`. Estas rutas exigen el permiso de su módulo y no habilitan el CRUD del recurso relacionado. El detalle de visita incluye placa, marca, modelo y color mediante un LEFT JOIN para evitar solicitar Gestión de vehículos.

---

# Consideraciones de integración

- Las operaciones CRUD `GET` de listado no requieren parámetros ni cuerpo JSON; las consultas agregadas admiten los filtros documentados.
- Las operaciones `GET` individuales y `DELETE` reciben el identificador mediante la ruta.
- Las operaciones `POST` y `PUT` reciben un cuerpo JSON.
- Los modelos actuales de actualización esperan el objeto completo; no se implementa actualización parcial mediante `PATCH`.
- Al crear usuarios, `contrasena_hash` recibe la contraseña sin cifrar, ya que el backend genera el hash.
- Para actualizar un usuario sin cambiar su contraseña, el backend permite enviar `contrasena_hash` como cadena vacía para conservar el hash existente.
- El endpoint `PUT /roles/{id_rol}` presenta un error en la implementación actual del backend: se pasa la clase `Roles` al repositorio en lugar del objeto recibido. Debe corregirse para que la actualización funcione.


## Rol `supervisor` y acceso de solo consulta

- `supervisor` tiene asignados los módulos 1, 3, 4, 6, 7 y 8 en `modulo_x_rol`: Dashboard, Visitas, Monitoreo, Seguimientos/Eventos, Alertas y Reportes.
- `roles.solo_lectura` es un booleano obligatorio, con valor predeterminado `false`. `supervisor` tiene `true`; los roles existentes conservan `false`.
- El modelo de creación y edición de roles acepta `solo_lectura`. En Administración → Roles se muestra como **Solo consulta**.
- `GET /auth/sesion` incluye `usuario.solo_lectura`, tomado del rol actual en la base de datos. No depende del nombre del rol ni del `id_rol` del JWT.
- Para roles de solo consulta, las rutas protegidas rechazan POST, PUT, PATCH y DELETE con 403. Administración y configuración de cámaras/zonas quedan restringidas. El inicio de sesión sigue disponible.
- La interfaz oculta acciones de modificación y mantiene búsquedas, consultas de detalle, exportaciones e impresión. La API aplica el bloqueo aunque se intente una petición manual.
- No se crearon cuentas ni se reasignaron usuarios. El administrador puede asignar `supervisor` a una cuenta existente desde Usuarios.

Si se despliega el backend contra otra base de datos, antes de iniciarlo debe existir la columna:

```sql
ALTER TABLE roles ADD COLUMN IF NOT EXISTS solo_lectura BOOLEAN NOT NULL DEFAULT FALSE;
```

El rol y sus asignaciones ya se crearon en la base de datos configurada durante esta implementación. No se modificó la gestión de conexiones ni el rendimiento del backend.

Los nombres de roles se guardan en minúsculas y sin espacios al inicio o al final. Esta normalización se aplica al crear y editar roles.


## Vista de cámaras agrupadas por zona

`GET /camaras/` conserva los datos de cada cámara y añade `eventos_registrados`, `eventos_hoy`, `ultimo_tipo_evento` y `ultimo_evento`. Los contadores se calculan con agregaciones en el repositorio, sobre eventos activos cuya fecha no está en el futuro; los eventos sin fecha cuentan en el total, pero no en el día. El día se interpreta en `America/Bogota`.

`GET /camaras/catalogos` incluye `tipo` de zona, además de `id_zona` y `nombre`.

`GET /camaras/{id_camara}/actividad?inicio=0&limite=10` devuelve `camara`, `total`, `inicio`, `limite` y `eventos`, ordenados por fecha descendente. Acepta inicio desde cero y límite entre 1 y 100; devuelve 404 si no existe la cámara. Cada evento incluye tipo, fecha, visita, placa, zona y confianza.

Las rutas conservan la autorización del módulo de Cámaras: administrador y operador pueden consultar la actividad sin habilitar el CRUD de Eventos. El rol `supervisor` mantiene su restricción de acceso a Cámaras. No se añadieron carpetas ni se modificaron registros de la base de datos.


## Vehículos con visitas asociadas

`GET /vehiculos/` y `GET /vehiculos/{id_vehiculo}` incluyen `tiene_visitas`, calculado con `EXISTS` sobre todas las visitas asociadas, sin excluir las históricas o inactivas. No es una nueva columna de la base de datos.

La interfaz deshabilita la acción Eliminar si `tiene_visitas` es verdadero, muestra el motivo y también la bloquea cuando el indicador no está disponible. Las demás acciones y columnas se conservan.

El backend local ya implementa `DELETE /vehiculos/{id_vehiculo}` como desactivación (`estado = FALSE`); esa lógica se conservó. No se añadió borrado físico ni se modificaron registros existentes.
