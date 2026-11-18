# Diagrama de casos de uso del sistema LPR

El archivo `DIAGRAMA_CASOS_DE_USO.drawio` contiene el diagrama UML editable. Representa las funciones verificadas de los roles actuales; no es un diagrama de flujo ni una secuencia de pasos.

## Actores

- **administrador:** accede a todos los módulos y realiza la gestión de usuarios, roles y permisos.
- **operador:** realiza la operación diaria de vehículos, visitas, cámaras y zonas; consulta Dashboard y Monitoreo.
- **supervisor:** consulta Dashboard, Monitoreo, Visitas, Seguimientos, Eventos, Alertas y Reportes. Puede exportar o imprimir donde la interfaz lo permite, pero no modificar registros.

## Matriz de casos de uso

| Código | Caso de uso | administrador | operador | supervisor |
|---|---|---|---|---|
| CU01 | Iniciar sesión | Sí | Sí | Sí |
| CU02 | Consultar Dashboard | Sí | Sí | Sí |
| CU03 | Consultar monitoreo vehicular | Sí | Sí | Sí |
| CU04 | Consultar visitas y detalle | Sí | Sí | Sí |
| CU05 | Gestionar vehículos | Sí | Sí | — |
| CU06 | Registrar y editar visitas | Sí | Sí | — |
| CU07 | Gestionar cámaras | Sí | Sí | — |
| CU08 | Gestionar zonas | Sí | Sí | — |
| CU09 | Consultar seguimientos | Sí | — | Sí |
| CU10 | Consultar eventos | Sí | — | Sí |
| CU11 | Consultar alertas | Sí | — | Sí |
| CU12 | Consultar y exportar reportes | Sí | — | Sí |
| CU13 | Gestionar seguimientos | Sí | — | — |
| CU14 | Gestionar eventos | Sí | — | — |
| CU15 | Gestionar alertas | Sí | — | — |
| CU16 | Gestionar usuarios | Sí | — | — |
| CU17 | Gestionar roles y permisos | Sí | — | — |

## Alcance de los casos de uso

- **CU01 — Iniciar sesión:** Ingresar con credenciales válidas. La aplicación comprueba el usuario y obtiene sus módulos permitidos.
- **CU02 — Consultar Dashboard:** Consultar indicadores generales de entradas, salidas, ocupación y alertas.
- **CU03 — Consultar monitoreo vehicular:** Buscar vehículos, filtrar visitas, consultar permanencia y última ubicación registrada.
- **CU04 — Consultar visitas y detalle:** Buscar visitas y consultar sus datos y los del vehículo asociado.
- **CU05 — Gestionar vehículos:** Registrar y editar vehículos. La acción Eliminar se bloquea si hay visitas asociadas; el backend local implementa desactivación, no borrado físico.
- **CU06 — Registrar y editar visitas:** Registrar visitas y modificar sus datos. No incluye eliminación desde la interfaz.
- **CU07 — Gestionar cámaras:** Registrar, editar y desactivar cámaras; consultar sus contadores y actividad por zona.
- **CU08 — Gestionar zonas:** Registrar, editar, activar y desactivar zonas.
- **CU09 — Consultar seguimientos:** Consultar recorridos, aplicar filtros y exportar resultados.
- **CU10 — Consultar eventos:** Consultar movimientos registrados, filtrar y exportar resultados.
- **CU11 — Consultar alertas:** Revisar alertas y sus datos asociados sin modificar registros.
- **CU12 — Consultar y exportar reportes:** Consultar resultados por fechas y zona, exportar e imprimir reportes.
- **CU13 — Gestionar seguimientos:** Registrar y editar seguimientos. No incluye eliminación desde la interfaz.
- **CU14 — Gestionar eventos:** Registrar, editar y eliminar eventos, según los permisos del módulo.
- **CU15 — Gestionar alertas:** Registrar, editar y activar o desactivar alertas; no implica resolución automática.
- **CU16 — Gestionar usuarios:** Crear, editar y desactivar usuarios; asignarles un rol.
- **CU17 — Gestionar roles y permisos:** Crear y editar roles, configurar Solo consulta y asignar acceso a módulos mediante modulo_x_rol.

## Lectura del diagrama

- Las figuras humanas son los actores externos.
- Las elipses representan objetivos o funciones que utilizan los actores.
- El rectángulo delimita el sistema de gestión vehicular.
- Las líneas sin flecha indican que un actor participa en un caso de uso. Los colores distinguen actores, no estados ni permisos adicionales.
- Los grupos de columnas ayudan a leer; no representan sistemas independientes.
- No se usa herencia entre roles: los permisos reales se consultan en `modulo_x_rol`, junto con el atributo `solo_lectura`.
- Iniciar sesión es el acceso inicial. Los otros casos requieren una sesión válida y autorización para el módulo.
- No se modelan como actores la base de datos, JWT ni DataTables porque forman parte de la implementación interna.
- No se atribuye al frontend la detección automática de placas ni la generación automática de alertas.

## Para incorporarlo al informe

1. Abre el `.drawio` en diagrams.net.
2. Exporta el diagrama como SVG o PDF para mantener su legibilidad; también puedes exportar a PNG.
3. Usa el título **Diagrama de casos de uso del sistema de gestión y monitoreo vehicular**.
4. Acompáñalo con los actores y la matriz anterior para explicar los permisos.

Los permisos se verificaron mediante consultas de solo lectura. No se modificaron cuentas, asignaciones ni código de la aplicación.

