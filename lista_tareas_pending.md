# Lista de Tareas Pendientes - Módulos por Implementar

Basado en la documentación de la API (`rutas_api_carro.md`) y el estado actual del proyecto.

## Alto Prioridad

### 1. Módulo Módulos ( #14 )
- **Ruta API:** `/modulo/`
- **Operaciones:** GET (listar), POST (crear), GET individual, PUT (actualizar), DELETE
- **Archivos necesarios:**
  - `src/lib/services/api_modulos.js` - Servicio HTTP
  - `src/routes/modulo/+page.svelte` - Página CRUD con tabla, formulario, filtros
- **Estado actual:** Ningún archivo creado

### 2. Módulo Módulos por Rol ( #15 )
- **Ruta API:** `/modulo_x_rol/`
- **Operaciones:** GET (listar), POST (crear asociación), GET individual, PUT (actualizar), DELETE
- **Body incluye:** `id_rol`, `id_modulo`, `estado`
- **Archivos necesarios:**
  - `src/lib/services/api_modulo_x_rol.js` - Servicio HTTP
  - `src/routes/modulo_x_rol/+page.svelte` - Página con formulario de asociación
- **Estado actual:** Ningún archivo creado

### 3. Asociaciones de Seguimiento ( #9 )
- **Ruta API:** `/asociaciones_seguimiento/`
- **Operaciones:** GET, POST, GET individual, PUT, DELETE
- **Body incluye:** `metodo`, `confianza`, `resultado`, `fecha_evaluacion`, `id_seguimiento_origen`, `id_seguimiento_destino`, `estado`
- **Archivos necesarios:**
  - `src/lib/services/api_asociaciones_seguimiento.js` - Servicio HTTP
  - `src/routes/asociaciones_seguimiento/+page.svelte` - Página CRUD
- **Estado actual:** Ningún archivo creado

## Media Prioridad

### 4. Ocupación de Zona ( #11 )
- **Ruta API:** `/ocupacion_zona/`
- **Estado actual:** ✅ Servicio creado (`api_ocupacion_zona.js`)
- **Falta:** Página `src/routes/ocupacion_zona/+page.svelte` para listado, crear y editar ocupaciones

### 5. Roles ( #13 )
- **Ruta API:** `/roles/`
- **Estado actual:** ✅ Servicio creado (`api_roles.js`)
- **Página:** `src/routes/administracion/+page.svelte` existe pero es "placeholder"
- **Falta:** Completar el módulo de roles en la página de administración (tabs como placeholders según el resumen inicial)

### 6. Usuarios ( #2 )
- **Ruta API:** `/usuarios/`
- **Estado actual:** ✅ Servicio creado (`api_usuarios.js`)
- **Página:** `src/routes/administracion/+page.svelte` existe
- **Falta:** Según el objetivo original: "Implementar el módulo usuarios conectado a la API con CRUD completo". Requiere validar el estado actual de la página de administrador.

## Baja Prioridad / Verificar

### 7. Autenticación ( #1 )
- **Ruta API:** `/auth/login`
- **Nota:** El enfoque del proyecto es el frontend de módulos; la autenticación puede ser manejada por otra capa o ya estar configurada.

---

## Resumen Ejecutivo

| Prioridad | Módulo | Servicios | Páginas |
|---|---|---|---|
| **Alta** | Módulos | ❌ Falta | ❌ Falta |
| **Alta** | Módulos por rol | ❌ Falta | ❌ Falta |
| **Alta** | Asociaciones seguimiento | ❌ Falta | ❌ Falta |
| **Media** | Ocupación zona | ✅ Servicio | ❌ Falta página |
| **Media** | Roles | ✅ Servicio | ⚠️ Placeholder |
| **Media** | Usuarios | ✅ Servicio | ⚠️ Revisar estado |

**Total:** 6 tareas pendientes (3 altas, 3 medias)