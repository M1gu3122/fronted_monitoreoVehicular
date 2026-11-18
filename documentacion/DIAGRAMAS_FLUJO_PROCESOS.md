# Diagramas de flujo de los cinco procesos principales

Estos diagramas describen la aplicación actual. Los permisos efectivos dependen de `modulo_x_rol`; los roles de solo consulta no pueden modificar registros. No se modificaron datos ni código de la aplicación para elaborarlos.

Abre `DIAGRAMAS_FLUJO_PROCESOS.drawio` en diagrams.net: contiene una página por proceso. Este documento también incluye los diagramas en Mermaid.

## 1. Autenticación y acceso por rol

**Participantes:** administrador, operador y supervisor.

La sesión usa JWT. Los módulos se obtienen de modulo_x_rol y supervisor conserva solo consulta.

```mermaid
flowchart TD
    a(["Inicio"])
    b["Ingresar correo y contraseña"]
    c{"¿Credenciales válidas?"}
    d["Mostrar error"]
    e["Emitir JWT"]
    f[("Consultar rol y permisos")]
    g["Mostrar módulos permitidos"]
    h["Seleccionar módulo"]
    i{"¿Acceso autorizado?"}
    j["Mostrar módulo"]
    k["Acceso denegado"]
    l(["Fin"])
    a --> b
    b --> c
    c -->|"No"| d
    d -->|"Reintentar"| b
    c -->|"Sí"| e
    e --> f
    f --> g
    g --> h
    h --> i
    i -->|"No"| k
    k --> l
    i -->|"Sí"| j
    j --> l
```

## 2. Registro y actualización de vehículos

**Participantes:** administrador y operador con acceso a Vehículos.

Proceso de registro y edición. El botón Eliminar queda bloqueado si hay visitas; el backend local conserva el registro al desactivarlo.

```mermaid
flowchart TD
    a(["Inicio"])
    b["Abrir Vehículos"]
    c{"¿Puede modificar?"}
    d["Acceso restringido"]
    e["Registrar o editar"]
    f["Completar datos"]
    g{"¿Datos válidos?"}
    h["Corregir campos"]
    i[("Guardar en base de datos")]
    j{"¿Guardado correcto?"}
    k["Mostrar error y reintentar"]
    l["Confirmar y actualizar listado"]
    m(["Fin"])
    a --> b
    b --> c
    c -->|"No"| d
    d --> m
    c -->|"Sí"| e
    e --> f
    f --> g
    g -->|"No"| h
    h --> f
    g -->|"Sí"| i
    i --> j
    j -->|"No"| k
    k --> f
    j -->|"Sí"| l
    l --> m
    f -->|"Cancelar"| m
```

## 3. Registro y consulta de visitas

**Participantes:** administrador y operador gestionan; supervisor consulta.

El formulario actual solicita vehículo, fecha de entrada y fecha de salida. La eliminación no se ofrece en la interfaz.

```mermaid
flowchart TD
    a(["Inicio"])
    b["Abrir Visitas"]
    c{"¿Solo consulta?"}
    d["Buscar y consultar detalle"]
    e["Nueva visita o editar"]
    f["Seleccionar vehículo y fechas"]
    g{"¿Datos válidos?"}
    h["Corregir datos"]
    i[("Guardar visita")]
    j{"¿Guardado correcto?"}
    k["Mostrar error"]
    l["Actualizar visitas y confirmar"]
    m(["Fin"])
    a --> b
    b --> c
    c -->|"Sí"| d
    d --> m
    c -->|"No"| e
    e --> f
    f --> g
    g -->|"No"| h
    h --> f
    g -->|"Sí"| i
    i --> j
    j -->|"No"| k
    k --> f
    j -->|"Sí"| l
    l --> m
    f -->|"Cancelar"| m
```

## 4. Monitoreo y consulta vehicular

**Participantes:** administrador, operador y supervisor con acceso a Monitoreo.

Consulta datos registrados; no representa detección de cámaras ni generación automática de alertas. La actualización cada 30 s es opcional y se pausa al interactuar.

```mermaid
flowchart TD
    a(["Inicio"])
    b["Abrir Monitoreo"]
    c["Buscar o aplicar filtros"]
    d[("Consultar visitas y último evento")]
    e{"¿Consulta correcta?"}
    f["Error: reintentar"]
    g{"¿Hay resultados?"}
    h["Mostrar sin resultados"]
    i["Mostrar tabla y permanencia"]
    j["Consultar detalle de visita"]
    k{"¿Seguir consultando?"}
    l(["Fin"])
    a --> b
    b --> c
    c --> d
    d --> e
    e -->|"No"| f
    f -->|"Reintentar"| d
    e -->|"Sí"| g
    g -->|"No"| h
    h --> k
    g -->|"Sí"| i
    i -->|"Opcional"| j
    i --> k
    j --> k
    k -->|"Sí"| c
    k -->|"No"| l
```

## 5. Consulta y gestión de alertas

**Participantes:** administrador gestiona; supervisor consulta; operador sin acceso por defecto.

Se representan las consultas, edición y activación/desactivación disponibles. No se inventa un proceso de resolución automática.

```mermaid
flowchart TD
    a(["Inicio"])
    b["Solicitar acceso a Alertas"]
    c{"¿Módulo habilitado?"}
    d["Acceso denegado"]
    e["Buscar y revisar alerta"]
    f{"¿Solo consulta?"}
    g["Seleccionar edición o estado"]
    h{"¿Confirmar cambios?"}
    i["Cancelar"]
    j[("Validar y guardar cambios")]
    k{"¿Guardado correcto?"}
    l["Mostrar error y corregir"]
    m["Actualizar alertas y confirmar"]
    n(["Fin"])
    a --> b
    b --> c
    c -->|"No"| d
    d --> n
    c -->|"Sí"| e
    e --> f
    f -->|"Sí"| n
    f -->|"No"| g
    g --> h
    h -->|"No"| i
    i --> n
    h -->|"Sí"| j
    j --> k
    k -->|"No"| l
    l -->|"Reintentar"| g
    k -->|"Sí"| m
    m --> n
```


