# Manual operativo para construir el frontend con SvelteKit

**Tipo de documento:** instrucciones obligatorias para un agente de desarrollo  
**Alcance:** construcción y mantenimiento del frontend de aplicaciones conectadas a una API REST  
**Tecnologías base:** SvelteKit, Svelte, JavaScript, HTML y CSS  
**Idioma del código:** nombres descriptivos en español, salvo nombres que deban coincidir exactamente con el contrato de la API o con las convenciones obligatorias de SvelteKit.

---

## 0. Instrucción principal para el agente

Actúa como un agente de desarrollo que debe construir el frontend de acuerdo con este manual y con los requisitos concretos entregados para el proyecto.

Tu prioridad es **seguir la estructura, las responsabilidades y el alcance definidos**, no proponer una arquitectura alternativa ni introducir decisiones por iniciativa propia.

Debes cumplir todas estas reglas:

1. Implementa únicamente las páginas, componentes, servicios y operaciones que estén contemplados en los requisitos del proyecto y en este manual.
2. Respeta exactamente la estructura de carpetas y archivos definida en la sección 2.
3. No crees carpetas, archivos, capas, módulos, abstracciones ni componentes adicionales por conveniencia personal.
4. No cambies la responsabilidad de un archivo para resolver rápidamente una tarea que pertenece a otra parte de la arquitectura.
5. No escribas llamadas `fetch()` en páginas ni en componentes visuales. Toda comunicación HTTP debe estar centralizada en `src/lib/services/`.
6. No inventes rutas de la API, métodos HTTP, nombres de propiedades, identificadores, formatos de datos, dependencias ni reglas de negocio.
7. No modifiques el backend. El alcance de este manual es el frontend y su configuración de comunicación con la API.
8. No agregues funciones, pantallas o mejoras que no hayan sido solicitadas. Una mejora que parezca útil sigue siendo una modificación de alcance si no está autorizada.
9. Trabaja por etapas. Comprueba cada etapa antes de continuar con la siguiente.
10. Si una instrucción necesaria entra en conflicto con la estructura obligatoria, no la resuelvas creando archivos nuevos ni cambiando la arquitectura. Expón el conflicto concreto y solicita la decisión que falte.
11. Antes de modificar cualquier archivo existente, inspecciona su contenido y conserva lo que ya funcione. Realiza el cambio mínimo necesario.
12. No declares una tarea terminada si no has comprobado el comportamiento correspondiente.

### 0.1. Jerarquía para resolver instrucciones

Cuando encuentres varias instrucciones, aplica este orden:

1. Requisitos explícitos del usuario para el proyecto actual.
2. Restricciones estructurales y técnicas de este manual.
3. Contrato real y documentado de la API.
4. Convenciones de SvelteKit y Svelte utilizadas por el proyecto.
5. Buenas prácticas descritas en este manual.

Una práctica general de desarrollo nunca autoriza a ignorar una restricción explícita del proyecto.

### 0.2. Regla de no improvisación

Antes de implementar algo que no aparezca expresamente en los requisitos, responde internamente estas preguntas:

- ¿Es indispensable para cumplir una función solicitada?
- ¿Está contemplado en la estructura permitida?
- ¿Existe evidencia de que la API lo soporta?
- ¿Se puede resolver dentro del archivo que ya tiene esa responsabilidad?
- ¿La decisión cambia el alcance o el comportamiento esperado?

Si no puedes justificar la modificación con los requisitos, el manual o el contrato de la API, **no la implementes**.

---

## 1. Objetivo y alcance del frontend

El frontend es la interfaz con la que interactúa el usuario. Su responsabilidad es:

- Mostrar la información recibida desde la API.
- Capturar datos mediante formularios.
- Enviar solicitudes a los endpoints documentados.
- Presentar los resultados de las operaciones.
- Informar al usuario cuando una operación está cargando, cuando no hay información o cuando ocurre un error.
- Actualizar la información visible después de una operación para reflejar el estado real del servidor.

El frontend **no es el lugar donde se almacenan de forma definitiva los datos del sistema**. La fuente de verdad es el backend y la información persistida por este.

### 1.1. Responsabilidades que no corresponden al frontend

No debes:

- Conectarte directamente a la base de datos.
- Reproducir en JavaScript reglas que deben validarse en el backend, como sustituto de la validación de la API.
- Crear endpoints o modificar los existentes.
- Cambiar modelos, tablas, relaciones o esquemas del backend.
- Simular respuestas exitosas cuando la API no responde.
- Mantener listas locales como si fueran la fuente definitiva después de una operación de escritura.
- Duplicar en el frontend una función que ya pertenece al backend.

La validación básica del formulario mejora la experiencia del usuario, pero el backend sigue siendo responsable de validar y aceptar los datos.

### 1.2. Operaciones HTTP

Cuando la API documente las operaciones correspondientes, la comunicación seguirá este significado general:

| Operación | Método HTTP | Responsabilidad del frontend |
|---|---|---|
| Consultar una colección | `GET` | Solicitar y mostrar los registros disponibles. |
| Consultar un registro | `GET` | Solicitar un registro mediante su identificador. |
| Crear un registro | `POST` | Enviar los datos del formulario. |
| Actualizar un registro | `PUT` | Enviar los datos modificados del registro indicado. |
| Eliminar un registro | `DELETE` | Solicitar la eliminación después de confirmar la acción. |

Esta tabla no autoriza a inventar endpoints. Implementa únicamente las operaciones que existan en la documentación de la API y que estén dentro del alcance solicitado.

---

## 2. Estructura obligatoria del proyecto

Esta estructura es un contrato. No debe sustituirse por otra arquitectura.

```text
proyecto/
│
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Navbar.svelte
│   │   │   ├── Footer.svelte
│   │   │   ├── Header.svelte
│   │   │   └── Card.svelte
│   │   │
│   │   └── services/
│   │       └── api_<recurso>.js
│   │
│   └── routes/
│       ├── +layout.svelte
│       ├── +page.svelte
│       │
│       ├── <modulo-1>/
│       │   └── +page.svelte
│       │
│       └── <modulo-2>/
│           └── +page.svelte
│
├── static/
│   └── <archivos-publicos-existentes>
│
├── package.json
├── svelte.config.js
└── vite.config.js
```

Los nombres entre `< >` son marcadores que deben sustituirse por los nombres reales definidos para el proyecto. No son nombres de archivos que deban crearse literalmente.

### 2.1. Regla de rutas: una carpeta por cada ruta

- Cada ruta distinta de la raíz debe tener su propia carpeta dentro de `src/routes/`.
- Dentro de la carpeta de cada ruta debe existir el archivo `+page.svelte`.
- La carpeta determina la dirección web.
- El archivo `+page.svelte` contiene la página correspondiente a esa dirección.
- El nombre de la carpeta debe derivarse de la ruta solicitada y seguir el formato de nombres ya usado por el proyecto.
- No crees una carpeta para una ruta que no esté contemplada en los requisitos.
- No pongas páginas dentro de `src/lib/`.

**Excepción obligatoria de SvelteKit para la ruta raíz:** la dirección `/` se define mediante `src/routes/+page.svelte`, directamente dentro de `routes`. No debe crearse una carpeta artificial para la ruta raíz.

Ejemplo abstracto:

| Dirección | Ubicación obligatoria |
|---|---|
| `/` | `src/routes/+page.svelte` |
| `/configuracion` | `src/routes/configuracion/+page.svelte` |
| `/reportes` | `src/routes/reportes/+page.svelte` |

Si los requisitos necesitan rutas anidadas, representa cada segmento mediante las carpetas correspondientes y coloca `+page.svelte` en la carpeta que represente la ruta solicitada. No agregues archivos de ruta de otros tipos sin autorización expresa.

### 2.2. Responsabilidad exacta de cada ubicación

| Carpeta o archivo | Responsabilidad exclusiva | Quién lo utiliza |
|---|---|---|
| `src/` | Contener el código fuente del frontend. | El proyecto SvelteKit. |
| `src/routes/` | Definir las páginas y las direcciones web. | El navegador mediante SvelteKit. |
| `src/routes/+layout.svelte` | Definir el marco común de las páginas. | Todas las páginas que estén dentro de ese layout. |
| `src/routes/+page.svelte` | Contener la página de inicio `/`. | El navegador. |
| `src/routes/<ruta>/+page.svelte` | Contener la interfaz y la lógica de esa ruta. | El navegador; importa componentes y servicios. |
| `src/lib/` | Agrupar el código reutilizable. | Las rutas y los componentes que lo importen. |
| `src/lib/components/` | Contener componentes visuales reutilizables. | `+layout.svelte` y las páginas. |
| `src/lib/services/` | Centralizar las funciones que se comunican con la API. | Las páginas mediante importaciones. |
| `static/` | Contener archivos públicos que se sirven sin procesar. | El navegador. |
| `vite.config.js` | Configurar Vite y, cuando corresponda, el proxy de la API. | El servidor de desarrollo. |
| `svelte.config.js` | Mantener la configuración propia de SvelteKit. | SvelteKit. |
| `package.json` | Mantener dependencias y scripts del proyecto. | npm y las herramientas del proyecto. |

### 2.3. Lista de ubicaciones permitidas para código de aplicación

El agente puede crear o modificar código de aplicación únicamente en estas ubicaciones:

1. `src/routes/+layout.svelte`.
2. `src/routes/+page.svelte`.
3. `src/routes/<ruta>/+page.svelte`, una carpeta por cada ruta aprobada.
4. `src/lib/components/<NombreComponente>.svelte`.
5. `src/lib/services/api_<recurso>.js`.
6. `static/`, únicamente para archivos públicos que el proyecto necesite y que estén autorizados.
7. `vite.config.js`, exclusivamente cuando sea necesario configurar o corregir el proxy.

Los archivos base de SvelteKit que el asistente de creación genere, como `package.json` y `svelte.config.js`, se conservan. No son una invitación a añadir nuevas capas o carpetas.

Las carpetas o archivos generados automáticamente por npm, SvelteKit o el control de versiones no se consideran código de aplicación creado manualmente. No los edites para resolver una tarea de interfaz.

### 2.4. Prohibiciones estructurales

No crees, salvo autorización explícita del usuario:

- `src/lib/stores/`.
- `src/lib/utils/`.
- `src/lib/types/`.
- `src/lib/config/`.
- `src/lib/models/`.
- `src/lib/constants/`.
- `src/lib/hooks/`.
- `src/lib/actions/`.
- Carpetas `api/`, `helpers/`, `common/`, `shared/` o equivalentes.
- Archivos `+page.js`, `+page.server.js`, `+layout.js`, `+layout.server.js`, `+server.js` o equivalentes.
- Archivos CSS externos para una página o componente.
- Archivos JavaScript externos para separar la lógica de una página o componente.
- Componentes nuevos para cada campo, botón, tabla o fragmento que pueda permanecer en el archivo de la página.
- Servicios adicionales que dupliquen las funciones de `api_<recurso>.js`.
- Carpetas de pruebas, documentación, maquetas o prototipos dentro del código fuente.

Si una necesidad real exige una ubicación no contemplada, no la crees por iniciativa propia. Informa qué requisito no puede resolverse con la estructura autorizada y espera una decisión.

---

## 3. Reglas de implementación que nunca se pueden romper

### 3.1. Componentes autocontenidos

Cada componente visual debe mantener su contenido en un único archivo `.svelte`, con las partes que necesite:

1. `<script>`: JavaScript, importaciones, propiedades, variables y funciones del componente.
2. HTML/Svelte: estructura y contenido que se muestra.
3. `<style>`: estilos propios del componente.

No separes esas partes en archivos externos.

El uso de CSS puro es la opción predeterminada porque es el enfoque desarrollado en la guía técnica. Bootstrap solo puede utilizarse cuando ya esté disponible en el proyecto o cuando el usuario lo autorice expresamente. No instales Bootstrap ni otra dependencia visual por iniciativa propia.

### 3.2. Convenciones de nombres

- Los nombres de componentes comienzan con mayúscula: `Navbar.svelte`, `Header.svelte`, `Card.svelte`.
- Las carpetas de rutas utilizan nombres claros, en minúsculas y derivados de la dirección web.
- Los servicios siguen el patrón `api_<recurso>.js`.
- Las variables y funciones deben tener nombres descriptivos en español.
- Evita nombres ambiguos como `x`, `data`, `item1` o `funcion2` cuando exista un nombre que describa su función.
- Las propiedades que deban coincidir con la API se escriben exactamente como estén documentadas, aunque la API utilice otro idioma.

### 3.3. Responsabilidad única

Cada función debe cumplir una sola responsabilidad identificable.

Ejemplos de responsabilidades correctas:

- `cargarRegistros()`: solicitar la colección y actualizar su estado.
- `limpiarFormulario()`: vaciar los campos y salir del modo de edición.
- `prepararEdicion(id)`: consultar el registro indicado y cargar sus datos en el formulario.
- `guardarRegistro(evento)`: validar el envío, construir el objeto y decidir entre crear o actualizar.
- `borrarRegistro(registro)`: confirmar la acción, solicitar la eliminación y actualizar la vista.

Estos nombres son orientativos. Usa el nombre del recurso real del proyecto cuando sea necesario, sin cambiar las responsabilidades.

### 3.4. Estado y reactividad

- Declara las variables al comienzo del bloque `<script>`, después de las importaciones.
- Usa `let` para los valores que cambian durante la interacción.
- Usa `const` para valores que no se reasignan.
- Cambia las variables de estado mediante asignaciones para que Svelte actualice la interfaz.
- No manipules el DOM manualmente para sincronizar los campos o las listas.
- No dependas de modificar un arreglo con `push()` o `splice()` sin reasignarlo. La actualización debe producir una asignación observable.
- Usa `bind:value={variable}` para vincular los campos de un formulario con sus variables.

### 3.5. Sintaxis Svelte

La guía técnica utiliza la sintaxis tradicional de Svelte. Mantén esa misma sintaxis para que el código del proyecto sea uniforme:

- `export let` para propiedades de componentes.
- `on:click` para eventos de clic.
- `on:submit` para el envío de formularios.
- `bind:value` para enlazar campos.
- `{#if}`, `{:else if}`, `{:else}` y `{/if}` para condiciones.
- `{#each}` y `{/each}` para recorrer colecciones.
- `<slot />` para insertar la página en el layout y para recibir contenido en componentes contenedores.

No migres el proyecto a otra sintaxis, a runes, a TypeScript o a otro patrón de Svelte sin autorización expresa. No mezcles estilos de programación de distintas versiones dentro del mismo proyecto.

### 3.6. Comunicación con la API

- `fetch()` solo puede aparecer en los archivos de `src/lib/services/`.
- Las páginas importan funciones del servicio correspondiente.
- Los componentes visuales no deben comunicarse directamente con la API.
- No repitas una URL absoluta del backend en distintas páginas.
- Cada servicio debe concentrar la dirección de su recurso en una constante `URL_BASE`.
- Comprueba `respuesta.ok` antes de utilizar el contenido de la respuesta.
- Convierte el JSON recibido mediante `respuesta.json()` cuando el contrato indique que la respuesta contiene JSON.
- Envía los objetos como JSON cuando el endpoint lo requiera, usando `JSON.stringify()` y `Content-Type: application/json`.
- Utiliza `async` y `await` de forma coherente.
- Maneja los fallos de las operaciones asíncronas con `try/catch` en la lógica de página.

### 3.7. Presentación de estados

En toda página que consulte una colección deben existir, como mínimo, estos estados:

1. **Carga:** se informa que se están obteniendo los datos.
2. **Vacío:** se informa que la consulta fue exitosa, pero no hay registros.
3. **Con datos:** se muestra la información recibida.
4. **Error:** se informa cuando no se pudo completar la solicitud.

No confundas un error de red con una colección vacía. Si la petición falla, no presentes el error como si el servidor hubiera respondido correctamente con cero registros.

### 3.8. Fuente de verdad

Después de crear, actualizar o eliminar, solicita nuevamente la colección al servidor. La vista debe mostrar lo que realmente existe en la API, no una suposición construida localmente.

---

## 4. Etapas de trabajo

El agente debe ejecutar las etapas en el orden indicado. Una etapa no se considera finalizada hasta superar su criterio de salida.

---

## ETAPA 0. Reconocimiento del proyecto y de los requisitos

### Objetivo

Comprender qué existe, qué debe construirse y qué restricciones ya están presentes antes de modificar archivos.

### Acciones obligatorias

1. Inspecciona la raíz del proyecto.
2. Comprueba si ya existe una aplicación SvelteKit.
3. Identifica la versión de SvelteKit/Svelte a partir de los archivos y dependencias existentes.
4. Inspecciona `package.json`, `svelte.config.js` y `vite.config.js` si existen.
5. Inspecciona `src/routes/`, `src/lib/components/`, `src/lib/services/` y `static/` si existen.
6. Identifica las páginas solicitadas por el usuario.
7. Identifica los módulos o recursos que cada página representa.
8. Identifica qué componentes visuales comunes se necesitan realmente.
9. Identifica qué operaciones de la API requiere cada página.
10. Revisa la documentación de la API entregada por el usuario o disponible en el proyecto.
11. Registra los datos faltantes que impidan implementar una función correctamente.

### No debes hacer en esta etapa

- No crear archivos todavía.
- No cambiar configuraciones.
- No instalar dependencias.
- No rediseñar la estructura que ya existe.
- No asumir que una ruta o endpoint existe porque su nombre parezca obvio.

### Criterio de salida

Debes poder describir:

- Las rutas web necesarias.
- Los archivos existentes que se reutilizarán.
- Los archivos permitidos que se necesitan crear.
- Los recursos de la API implicados.
- Las operaciones y los contratos confirmados.
- Las dudas que bloquean la implementación, si existen.

Si falta una definición indispensable, no la inventes. Continúa únicamente con las partes que no dependan de esa información y señala el bloqueo de forma concreta.

---

## ETAPA 1. Verificación del entorno y creación del proyecto

### Objetivo

Asegurar que existe un proyecto SvelteKit ejecutable.

### Requisitos técnicos

- Node.js 18 o superior, según la guía de referencia.
- npm disponible.
- Editor de código.
- API disponible para las pruebas de integración cuando corresponda.

### Comprobación

```bash
node -v
npm -v
```

### Si el proyecto todavía no existe

Créalo con el asistente oficial de Svelte:

```bash
npx sv create nombre-del-proyecto
```

Selecciona:

- SvelteKit minimal.
- JavaScript.
- Sin TypeScript.

Después ejecuta:

```bash
cd nombre-del-proyecto
npm install
npm run dev
```

Abre la dirección local que indique la terminal. En la configuración habitual de desarrollo suele ser `http://localhost:5173`.

### Si el proyecto ya existe

- No vuelvas a ejecutar la creación del proyecto.
- No reemplaces la aplicación existente por una nueva.
- No reinstales dependencias sin una razón comprobada.
- Verifica primero que `npm install` y `npm run dev` funcionen.
- Conserva los archivos de configuración y las dependencias existentes.

### Criterio de salida

El proyecto inicia correctamente y SvelteKit puede cargar una página. Si no inicia, resuelve el error del entorno antes de construir funcionalidades.

---

## ETAPA 2. Confirmación y congelamiento de la estructura

### Objetivo

Preparar exclusivamente las ubicaciones de archivos aprobadas.

### Acciones obligatorias

1. Compara la estructura real con la estructura obligatoria de la sección 2.
2. Crea únicamente las carpetas que correspondan a rutas solicitadas.
3. Crea dentro de cada carpeta de ruta su `+page.svelte`.
4. Conserva la excepción de la ruta raíz: `src/routes/+page.svelte`.
5. Crea `src/lib/components/` solamente si hacen falta componentes reutilizables.
6. Crea `src/lib/services/` solamente si hay comunicación con la API.
7. Crea un archivo `api_<recurso>.js` por cada recurso de API que la aplicación necesite consumir.
8. Reutiliza los componentes existentes si ya cumplen la responsabilidad requerida.
9. No agregues archivos alternativos para dividir la lógica, los estilos o el marcado.

### Regla sobre carpetas de módulos

La carpeta de una ruta contiene su página `+page.svelte`. La lógica de comunicación con la API no se guarda dentro de esa carpeta: pertenece al servicio correspondiente en `src/lib/services/`.

### Criterio de salida

La estructura coincide con el contrato y cada archivo tiene una responsabilidad inequívoca. No debe existir código de aplicación nuevo fuera de las ubicaciones autorizadas.

---

## ETAPA 3. Inspección del contrato de la API

### Objetivo

Conocer exactamente cómo debe comunicarse el frontend con el backend antes de escribir los servicios o formularios.

### Información que debes obtener

Para cada recurso requerido, identifica:

1. Dirección base y prefijo de la API.
2. Ruta exacta del endpoint de colección.
3. Ruta exacta del endpoint individual, si existe.
4. Método HTTP permitido para cada operación.
5. Si la ruta utiliza barra final.
6. Parámetros de ruta, consulta o cabeceras requeridos.
7. Nombres exactos de las propiedades del objeto.
8. Tipos de datos de cada propiedad.
9. Campos obligatorios y opcionales.
10. Formato de la respuesta de colección.
11. Formato de la respuesta individual.
12. Formato de la respuesta después de crear o actualizar.
13. Formato de la respuesta después de eliminar.
14. Códigos HTTP de éxito y error relevantes.
15. Requisitos de autenticación, si existen.
16. Campo que identifica de forma única cada registro.

### Fuentes permitidas

Utiliza la documentación proporcionada por el usuario, los archivos existentes del proyecto o la documentación real publicada por la API. Si la API ofrece una interfaz OpenAPI, puedes consultarla para verificar rutas, esquemas y respuestas.

### Reglas estrictas

- No inventes nombres de propiedades.
- No supongas que todos los recursos tienen los mismos campos.
- No supongas que todos los endpoints usan la misma barra final.
- No conviertas un campo a número o texto sin comprobar el tipo esperado.
- No supongas que el identificador se llama `id` si la API utiliza otro nombre.
- No inventes una respuesta JSON para una operación.
- No crees funciones para métodos que la API no ofrece.
- No agregues autenticación ficticia ni tokens de ejemplo como si fueran reales.
- No ocultes una incompatibilidad entre el formulario y el esquema de la API.

### Tabla de contrato antes de programar

Completa una tabla de trabajo con los datos reales. No sustituyas información desconocida por suposiciones.

| Recurso | Operación | Método | Ruta exacta | Datos enviados | Respuesta esperada |
|---|---|---|---|---|---|
| Nombre real | Consultar colección | Según API | Según API | Ninguno, salvo que se documente | Esquema real |
| Nombre real | Consultar registro | Según API | Según API | Identificador documentado | Esquema real |
| Nombre real | Crear | Según API | Según API | Esquema real | Esquema real |
| Nombre real | Actualizar | Según API | Según API | Identificador y esquema real | Esquema real |
| Nombre real | Eliminar | Según API | Según API | Identificador documentado | Esquema real |

Elimina de la tabla las operaciones que no existan o no formen parte del alcance.

### Criterio de salida

No empieces el servicio de un recurso hasta conocer la información que necesita. Las propiedades y los endpoints usados en el frontend deben poder rastrearse a una fuente real.

---

## ETAPA 4. Configuración del proxy de Vite

### Objetivo

Permitir que el frontend envíe solicitudes a la API a través de la ruta `/api`, cuando el entorno lo requiera.

### Fundamento

En desarrollo, el frontend y el backend pueden ejecutarse en orígenes o puertos diferentes. El navegador puede bloquear una llamada directa por CORS. El proxy de Vite puede reenviar las solicitudes que comienzan por `/api` al origen real del backend.

### Archivo responsable

`vite.config.js`, ubicado en la raíz del proyecto.

### Regla de configuración

La guía utiliza este patrón de proxy:

```javascript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
});
```

El destino `http://localhost:8000` es un valor de referencia, no una dirección universal. Debes sustituirlo por el origen real documentado para el backend del proyecto.

### Reglas para modificarlo

1. Inspecciona el archivo antes de editarlo.
2. Conserva los plugins y ajustes ya necesarios.
3. Añade o corrige únicamente la propiedad `server.proxy` cuando haga falta.
4. Usa el prefijo que corresponda a la API documentada.
5. No configures un destino inventado.
6. No dupliques configuraciones proxy equivalentes.
7. No modifiques la configuración del backend para compensar un error del frontend.
8. No coloques llamadas `fetch()` en `vite.config.js`.
9. No agregues otros archivos de configuración para el proxy.

### Reinicio obligatorio

Cuando cambies `vite.config.js`:

1. Detén el servidor de desarrollo con `Ctrl + C`.
2. Ejecuta nuevamente `npm run dev`.
3. Comprueba que el servidor inicia sin errores.

### Criterio de salida

Una solicitud de prueba dirigida a una ruta `/api/...` llega al backend mediante el proxy, y la terminal no muestra errores de configuración.

---

## ETAPA 5. Construcción de componentes reutilizables y layout

### Objetivo

Crear las piezas visuales comunes que deben compartirse entre páginas.

### Componentes contemplados

Los componentes base definidos por la guía son:

| Archivo | Responsabilidad |
|---|---|
| `Navbar.svelte` | Barra de navegación común. |
| `Footer.svelte` | Pie de página común. |
| `Header.svelte` | Encabezado de página que recibe título y subtítulo. |
| `Card.svelte` | Contenedor visual que recibe contenido mediante `<slot />`. |

Crea solo los que sean necesarios para los requisitos del proyecto. Si ya existen y cumplen su función, reutilízalos.

### 5.1. Navbar.svelte

Debe:

- Mostrar únicamente las opciones de navegación que correspondan a rutas existentes y aprobadas.
- Utilizar enlaces con las direcciones reales del frontend.
- Mantener el HTML y el CSS en el mismo archivo.
- Tener un nombre de componente con mayúscula inicial.
- Evitar enlaces a páginas que no existen.
- No contener solicitudes HTTP.

### 5.2. Header.svelte

Debe:

- Mostrar el título de la página.
- Mostrar un subtítulo cuando se reciba uno.
- Recibir los textos mediante propiedades del componente.
- Tener el bloque `<script>`, el HTML y el `<style>` dentro del mismo archivo.

La guía utiliza `export let` para declarar propiedades. Mantén esta convención en el proyecto.

### 5.3. Card.svelte

Debe:

- Actuar como contenedor visual reutilizable.
- Insertar el contenido recibido mediante `<slot />`.
- Mantener su CSS en el mismo archivo.
- No conocer los datos ni la lógica de la página que lo utiliza.

### 5.4. Footer.svelte

Debe:

- Mostrar el contenido de pie de página definido para el proyecto.
- Mantener HTML y CSS en el mismo archivo.
- No incorporar lógica que pertenezca a una página o a un servicio.

### 5.5. `src/routes/+layout.svelte`

Es el marco común de la aplicación. Debe:

1. Importar los componentes comunes necesarios desde `$lib/components/`.
2. Mostrar la barra de navegación.
3. Incluir `<slot />` dentro del área principal para insertar la página activa.
4. Mostrar el pie de página.
5. Mantener sus estilos dentro del mismo archivo.
6. Usar `:global(body)` únicamente cuando necesite aplicar estilos globales al documento.

Esquema de referencia:

```svelte
<script>
  import Navbar from '$lib/components/Navbar.svelte';
  import Footer from '$lib/components/Footer.svelte';
</script>

<div class="contenedor-app">
  <Navbar />

  <main class="contenido">
    <slot />
  </main>

  <Footer />
</div>

<style>
  :global(body) {
    margin: 0;
  }

  .contenedor-app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .contenido {
    flex: 1;
  }
</style>
```

El fragmento es una estructura de referencia. Conserva los estilos y convenciones que ya tenga el proyecto, sin crear hojas de estilo externas.

### 5.6. `src/routes/+page.svelte`

Debe contener la página de inicio. Si los requisitos no definen una funcionalidad específica para ella, no inventes un panel, indicadores o accesos que no hayan sido solicitados. Puede mostrar un encabezado y una navegación hacia las rutas aprobadas.

### Criterio de salida

El layout envuelve las páginas, el contenido aparece dentro de `<slot />`, la navegación apunta a rutas reales y los componentes no contienen comunicación con la API.

---

## ETAPA 6. Creación del servicio de API

### Objetivo

Centralizar en un único archivo por recurso todas las solicitudes HTTP que necesite la interfaz.

### Ubicación

```text
src/lib/services/api_<recurso>.js
```

No crees el servicio dentro de `routes`, `components` o la raíz del proyecto.

### 6.1. Dirección base

Declara una constante para la ruta base del recurso:

```javascript
const URL_BASE = '/api/<ruta-real-del-recurso>/';
```

Sustituye el marcador por la ruta confirmada en el contrato de la API. Respeta la barra final cuando la API la requiera.

La ruta relativa `/api/...` debe utilizar el proxy configurado cuando corresponda. No repitas la dirección absoluta del backend en cada función.

### 6.2. Función auxiliar para procesar respuestas

El servicio debe tener una función auxiliar responsable de revisar el resultado HTTP y convertir la respuesta cuando corresponda.

Patrón base de la guía:

```javascript
async function procesarRespuesta(respuesta) {
  if (!respuesta.ok) {
    throw new Error(
      'Error ' + respuesta.status + ': ' + respuesta.statusText
    );
  }

  return await respuesta.json();
}
```

Reglas:

- Nunca uses datos de una respuesta fallida como si fuera exitosa.
- `respuesta.ok` debe comprobarse antes de utilizar los datos.
- El error debe conservar información útil del estado HTTP.
- Convierte a JSON cuando la API realmente devuelva un cuerpo JSON.
- Si la documentación confirma que una operación no devuelve cuerpo, maneja ese caso de acuerdo con el contrato. No intentes interpretar como JSON una respuesta vacía.
- No inventes mensajes o propiedades de respuesta.

### 6.3. Funciones que puede contener el servicio

Implementa exclusivamente las funciones necesarias y soportadas por la API.

| Función orientativa | Método | Responsabilidad |
|---|---|---|
| `obtenerRegistros()` | `GET` | Obtener la colección. |
| `obtenerRegistroPorId(id)` | `GET` | Obtener un registro específico. |
| `crearRegistro(datos)` | `POST` | Enviar un nuevo registro. |
| `actualizarRegistro(id, datos)` | `PUT` | Enviar la actualización de un registro. |
| `eliminarRegistro(id)` | `DELETE` | Solicitar la eliminación de un registro. |

Los nombres pueden adaptarse al recurso real, pero la responsabilidad de cada función debe mantenerse.

### 6.4. GET de colección

Patrón:

```javascript
export async function obtenerRegistros() {
  const respuesta = await fetch(URL_BASE);
  return await procesarRespuesta(respuesta);
}
```

### 6.5. GET individual

Patrón:

```javascript
export async function obtenerRegistroPorId(id) {
  const respuesta = await fetch(URL_BASE + id);
  return await procesarRespuesta(respuesta);
}
```

La forma exacta de construir la ruta debe coincidir con el endpoint documentado.

### 6.6. POST

Patrón:

```javascript
export async function crearRegistro(datos) {
  const respuesta = await fetch(URL_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(datos)
  });

  return await procesarRespuesta(respuesta);
}
```

### 6.7. PUT

Patrón:

```javascript
export async function actualizarRegistro(id, datos) {
  const respuesta = await fetch(URL_BASE + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(datos)
  });

  return await procesarRespuesta(respuesta);
}
```

### 6.8. DELETE

Patrón:

```javascript
export async function eliminarRegistro(id) {
  const respuesta = await fetch(URL_BASE + id, {
    method: 'DELETE'
  });

  return await procesarRespuesta(respuesta);
}
```

El tratamiento final de la respuesta debe respetar el contrato real, especialmente si el backend devuelve JSON o una respuesta sin cuerpo.

### 6.9. Reglas del servicio

- Todas las llamadas HTTP de la aplicación deben pasar por los servicios.
- La página no debe conocer el detalle de `fetch()`.
- Cada función debe hacer una solicitud con una responsabilidad definida.
- No mezcles en el servicio código HTML, mensajes de interfaz o estilos.
- No agregues lógica de navegación al servicio.
- No agregues datos ficticios de respaldo.
- No devuelvas una lista inventada cuando la API falle.
- No dupliques funciones con nombres distintos que hagan la misma solicitud.
- Usa `await` para esperar las solicitudes y procesar correctamente su resultado.

### Criterio de salida

El servicio utiliza los endpoints reales, valida las respuestas y exporta las funciones que necesitará la página. Ninguna página o componente contiene `fetch()`.

---

## ETAPA 7. Construcción de la página y declaración del estado

### Objetivo

Preparar la página que contiene la interfaz y la lógica de interacción del módulo.

### Ubicación

```text
src/routes/<ruta>/+page.svelte
```

### Orden recomendado dentro de `<script>`

1. Importaciones de Svelte.
2. Importaciones de componentes.
3. Importaciones del servicio correspondiente.
4. Variables de estado.
5. Funciones de consulta.
6. Registro de `onMount`.
7. Funciones del formulario.
8. Funciones de edición y eliminación, cuando estén requeridas.

Las variables deben declararse antes de las funciones que las utilizan.

### Variables de estado habituales

Utiliza solo las que correspondan a la funcionalidad solicitada:

```javascript
let registros = [];
let mensaje = '';
let cargando = false;
let idEditando = null;
```

Las variables para campos de formulario deben representar los nombres de los datos reales y mantenerse descriptivas.

### Reglas

- La página importa el servicio desde `$lib/services/`.
- La página importa los componentes desde `$lib/components/` cuando los utiliza.
- No implementes las peticiones HTTP directamente en el `<script>` de la página.
- La página gestiona el estado de la interfaz y llama a las funciones del servicio.
- Una función de página no debe asumir responsabilidades de varias capas.

### Criterio de salida

La página tiene una estructura clara, sus dependencias corresponden a archivos autorizados y todas las operaciones de comunicación pasan por el servicio.

---

## ETAPA 8. Captura de datos mediante formularios

### Objetivo

Permitir que el usuario introduzca datos y que Svelte los mantenga sincronizados con las variables de la página.

### 8.1. Declaración de variables

Declara una variable por cada campo editable que requiera el formulario. Utiliza nombres claros y valores iniciales adecuados al tipo de dato.

### 8.2. Vinculación con `bind:value`

Cada campo debe vincularse con su variable:

```svelte
<input
  id="nombre-del-campo"
  type="text"
  bind:value={variableCorrespondiente}
/>
```

No escribas `bind:value="variableCorrespondiente"`. La variable se enlaza mediante llaves.

### 8.3. Etiquetas y tipos de campo

- Usa un `<label>` para cada campo.
- El atributo `for` de la etiqueta debe coincidir con el `id` del control.
- Utiliza el tipo de campo adecuado: `text`, `number`, `email`, `date`, etc., únicamente cuando el dato real lo requiera.
- Usa `required` para los campos que el contrato o las reglas del formulario definan como obligatorios.
- Usa `min`, `max`, `step`, `maxlength` u otros atributos nativos solo cuando sus límites estén definidos.
- No inventes restricciones de negocio.
- Los nombres de variables deben ser descriptivos y corresponder con el dato que representan.

### 8.4. Conversión de tipos

El valor de un campo numérico debe transformarse al tipo que espera la API antes de enviarlo. La guía utiliza `Number()` como ejemplo.

No conviertas todos los campos indiscriminadamente. Comprueba el tipo de cada propiedad en el esquema real.

### 8.5. Envío del formulario

El formulario debe escuchar `on:submit`:

```svelte
<form on:submit={guardarRegistro}>
  <!-- Campos definidos para el proyecto -->
  <button type="submit">Guardar</button>
</form>
```

La función que recibe el evento debe cancelar el comportamiento tradicional de recarga de la página:

```javascript
async function guardarRegistro(evento) {
  evento.preventDefault();
  // Continuar con la operación documentada.
}
```

También puede utilizarse el modificador de evento `on:submit|preventDefault` si se mantiene de forma consistente en el proyecto. No combines ambas formas de cancelación en el mismo formulario.

### 8.6. Mensajes

Muestra un mensaje cuando la operación termine correctamente o cuando ocurra un error:

```svelte
{#if mensaje}
  <p>{mensaje}</p>
{/if}
```

El texto debe describir lo que realmente ocurrió. No muestres éxito antes de recibir confirmación de la API.

### Criterio de salida

Cada campo está vinculado a una variable, las etiquetas corresponden a sus controles, los tipos coinciden con el contrato y el formulario no recarga la página al enviarse.

---

## ETAPA 9. Implementación de creación (POST)

### Objetivo

Enviar a la API un registro nuevo mediante el servicio correspondiente.

### Flujo obligatorio

1. El usuario completa el formulario.
2. El navegador ejecuta las validaciones nativas configuradas.
3. Se dispara el evento `submit`.
4. La función cancela la recarga normal del formulario.
5. La página construye un objeto JavaScript con los nombres de propiedades exactos que exige la API.
6. Convierte los valores al tipo correcto.
7. Ejecuta la función de creación del servicio.
8. El servicio envía el `POST` con los headers y el cuerpo que exige el endpoint.
9. El servicio comprueba la respuesta HTTP.
10. Si la API confirma el éxito, la página muestra un mensaje adecuado.
11. Se limpian los campos del formulario.
12. Se solicita nuevamente la colección para actualizar la pantalla.
13. Si ocurre un error, se muestra un mensaje de error y no se presenta la operación como exitosa.

### Estructura orientativa de la función

```javascript
async function guardarRegistro(evento) {
  evento.preventDefault();

  const datos = {
    // Incluir únicamente propiedades documentadas por la API.
  };

  try {
    await crearRegistro(datos);
    mensaje = 'Registro creado correctamente';
    limpiarFormulario();
    await cargarRegistros();
  } catch (error) {
    mensaje = 'No se pudo crear el registro: ' + error.message;
  }
}
```

El comentario dentro del objeto no debe sustituirse por campos inventados. Añade las propiedades reales del contrato.

### Buenas prácticas obligatorias

- Usa `try/catch`.
- Convierte los tipos antes de enviar.
- Informa el resultado al usuario.
- Limpia el formulario después de una creación confirmada.
- Actualiza la colección desde el servidor después de crear.

### Errores que debes investigar

- **Error 422:** compara las propiedades y tipos enviados con el esquema de la API.
- **Error 404:** revisa la ruta del endpoint y el proxy.
- **Error de red:** verifica que el backend esté disponible y que el proxy funcione.
- **Datos no guardados:** revisa el cuerpo de la petición en Network y la respuesta real del backend.
- **Página recargada:** comprueba `preventDefault()`.

### Criterio de salida

La creación funciona con datos válidos, la API confirma el resultado, se muestra el mensaje correspondiente, el formulario se limpia y la colección se vuelve a consultar.

---

## ETAPA 10. Implementación del listado (GET) y renderizado con `{#each}`

### Objetivo

Mostrar en pantalla la colección que devuelve la API.

### 10.1. Estado inicial

La colección comienza como un arreglo vacío. También debe existir una variable que permita identificar cuándo se están cargando los datos.

```javascript
let registros = [];
let cargando = false;
```

### 10.2. Función de carga

La función debe:

1. Activar el estado de carga.
2. Llamar a la función GET del servicio.
3. Asignar el resultado a la variable de la colección.
4. Capturar los errores.
5. Finalizar el estado de carga tanto si la solicitud fue exitosa como si falló.

Estructura orientativa:

```javascript
async function cargarRegistros() {
  cargando = true;

  try {
    registros = await obtenerRegistros();
  } catch (error) {
    mensaje = 'No se pudo cargar la información: ' + error.message;
  }

  cargando = false;
}
```

Puedes utilizar `finally` para garantizar que el estado de carga finalice si mantienes el mismo comportamiento. No dejes la interfaz bloqueada en estado de carga después de un error.

### 10.3. Carga inicial con `onMount`

La consulta inicial debe ejecutarse cuando el componente ya esté montado:

```javascript
import { onMount } from 'svelte';

onMount(cargarRegistros);
```

Pasa la referencia de la función, sin paréntesis. No escribas `onMount(cargarRegistros())`, porque eso ejecutaría la función al evaluar el argumento.

### 10.4. Estados visuales obligatorios

La página debe distinguir carga, vacío y datos:

```svelte
{#if cargando}
  <p>Cargando...</p>
{:else if registros.length === 0}
  <p>No hay registros disponibles.</p>
{:else}
  <!-- Renderizar la colección -->
{/if}
```

El bloque de error debe mostrarse de forma que el usuario pueda distinguirlo del estado vacío.

### 10.5. Renderizado con `{#each}`

Utiliza una tabla HTML cuando el contenido sea tabular y el diseño requerido lo justifique:

```svelte
<table>
  <thead>
    <tr>
      <th>Identificador</th>
      <th>Datos</th>
      <th>Acciones</th>
    </tr>
  </thead>

  <tbody>
    {#each registros as registro (registro.id)}
      <tr>
        <td>{registro.id}</td>
        <td>{registro.nombre}</td>
        <td>
          <!-- Acciones solicitadas -->
        </td>
      </tr>
    {/each}
  </tbody>
</table>
```

El ejemplo ilustra la estructura. Debes sustituir los campos por las propiedades reales y utilizar el identificador único documentado. Si el identificador real no se llama `id`, usa el campo único confirmado por la API.

### 10.6. Clave única

Todo `{#each}` que represente registros debe utilizar una clave única y estable:

```svelte
{#each registros as registro (registro.id)}
```

No utilices el índice de la posición como sustituto de un identificador cuando la API proporciona un identificador único.

### 10.7. Refresco después de cambios

Después de crear, actualizar o eliminar un registro, ejecuta nuevamente `cargarRegistros()`.

No supongas que el registro local equivale al registro definitivo. La API puede normalizar, completar o modificar valores.

### Errores frecuentes

- **`map is not a function` o error al recorrer:** revisa si la API devuelve un arreglo o un objeto contenedor.
- **Tabla vacía:** revisa la respuesta GET y los nombres de propiedades en Network.
- **Identificador vacío:** comprueba el nombre real del identificador.
- **Lista que no se actualiza:** comprueba que reasignas la variable y que ejecutas la consulta después de la operación.
- **Error al abrir la página:** revisa la importación de `onMount` y la referencia entregada a esta función.

### Criterio de salida

La página realiza la consulta inicial, muestra los estados correspondientes y renderiza todos los registros con una clave única y propiedades correctas.

---

## ETAPA 11. Implementación de edición (PUT)

### Objetivo

Permitir modificar un registro existente utilizando el mismo formulario empleado para la creación.

### 11.1. Un único formulario

No crees un segundo formulario para editar. El mismo formulario cambia su comportamiento según una variable de estado.

```javascript
let idEditando = null;
```

- `idEditando === null`: modo de creación.
- `idEditando !== null`: modo de edición del identificador almacenado.

### 11.2. Preparar la edición

Cuando el usuario pulse el botón de edición:

1. Recibe el identificador del registro.
2. Consulta el registro individual a través del servicio.
3. Espera la respuesta de la API.
4. Guarda el identificador real en `idEditando`.
5. Copia las propiedades documentadas a las variables vinculadas con los campos.
6. Limpia mensajes anteriores que puedan confundir al usuario.
7. Cambia el título y el texto del botón para indicar que se encuentra en modo de edición.

Estructura orientativa:

```javascript
async function prepararEdicion(id) {
  try {
    const registro = await obtenerRegistroPorId(id);

    idEditando = registro.id;
    // Copiar las propiedades reales a las variables del formulario.
    mensaje = '';
  } catch (error) {
    mensaje = 'No se pudo cargar el registro: ' + error.message;
  }
}
```

Consulta los datos recientes de la API. No dependas de una copia antigua si el endpoint individual está disponible y forma parte del contrato.

### 11.3. Mismo formulario, comportamiento condicional

El título y el texto del botón cambian según el modo:

```svelte
<h2>
  {idEditando === null ? 'Crear registro' : 'Editar registro'}
</h2>

<button type="submit">
  {idEditando === null ? 'Crear' : 'Guardar cambios'}
</button>
```

### 11.4. Guardado condicional

En `guardarRegistro(evento)`:

- Si `idEditando === null`, llama al servicio de creación mediante `POST`.
- Si `idEditando !== null`, llama al servicio de actualización mediante `PUT` con el identificador y los datos.
- Usa el mismo objeto de datos que corresponde al contrato de la API.
- No dupliques el formulario.
- No dupliques innecesariamente la lógica de captura de campos.

### 11.5. Limpiar y cancelar

La función de limpieza debe vaciar las variables de formulario y devolver el modo a creación:

```javascript
function limpiarFormulario() {
  // Vaciar las variables reales del formulario.
  idEditando = null;
}
```

Cuando el usuario esté editando, muestra un botón para cancelar:

```svelte
{#if idEditando !== null}
  <button type="button" on:click={limpiarFormulario}>
    Cancelar
  </button>
{/if}
```

El botón de cancelar debe ser `type="button"` para no enviar el formulario.

### 11.6. Flujo después de actualizar

1. La API confirma la actualización.
2. Se informa el resultado.
3. Se limpia el formulario.
4. `idEditando` vuelve a `null`.
5. Se solicita de nuevo la colección.
6. La tabla muestra los datos actualizados desde el servidor.

### Buenas prácticas obligatorias

- Un solo formulario para crear y editar.
- Una sola fuente de verdad para los valores del formulario.
- Una salida clara mediante el botón de cancelar.
- Título y botón coherentes con el modo activo.
- No permitir que el siguiente envío permanezca accidentalmente en modo de edición.
- Refrescar la colección después de una actualización confirmada.

### Errores frecuentes

- No reiniciar `idEditando` después de guardar o cancelar.
- Utilizar `=` donde se necesita comparar con `===`.
- Ejecutar una función de edición al renderizar por llamar con paréntesis directamente al manejador.
- Enviar un identificador incorrecto.
- No cargar los datos reales antes de editar.
- No refrescar la lista después del PUT.

### Criterio de salida

El usuario puede abrir un registro existente, modificarlo en el mismo formulario, guardar los cambios, cancelar la edición y ver la colección actualizada desde la API.

---

## ETAPA 12. Implementación de eliminación (DELETE)

### Objetivo

Permitir eliminar un registro mediante la API, protegiendo la operación con confirmación.

### 12.1. Confirmación obligatoria

La eliminación debe pedir confirmación antes de enviar la solicitud:

```javascript
const seguro = confirm('¿Deseas eliminar este registro?');

if (!seguro) {
  return;
}
```

Si el usuario cancela, la función debe terminar inmediatamente. No se debe enviar ninguna solicitud DELETE.

### 12.2. Función de eliminación

La función debe:

1. Recibir el registro o su identificador, según lo que necesite para mostrar la confirmación.
2. Solicitar confirmación.
3. Terminar con `return` si el usuario cancela.
4. Llamar a la función DELETE del servicio.
5. Mostrar el mensaje confirmado por la API o un mensaje coherente con la respuesta documentada.
6. Si el registro eliminado era el que estaba en edición, limpiar el formulario.
7. Consultar nuevamente la colección.
8. Capturar y mostrar errores.

Estructura orientativa:

```javascript
async function borrarRegistro(registro) {
  const seguro = confirm('¿Eliminar este registro?');

  if (!seguro) {
    return;
  }

  try {
    const respuesta = await eliminarRegistro(registro.id);
    // Mostrar la respuesta real, si el contrato incluye un mensaje.

    if (idEditando === registro.id) {
      limpiarFormulario();
    }

    await cargarRegistros();
  } catch (error) {
    mensaje = 'No se pudo eliminar el registro: ' + error.message;
  }
}
```

Los nombres de campos y el tratamiento de la respuesta deben coincidir con la API real.

### 12.3. Botón de eliminación

Dentro de la fila correspondiente:

```svelte
<button on:click={() => borrarRegistro(registro)}>
  Eliminar
</button>
```

Utiliza una función flecha cuando necesites pasar argumentos al manejador. No escribas `on:click={borrarRegistro(registro)}`, porque ejecutaría la función al evaluar el marcado.

### Buenas prácticas obligatorias

- Confirmar antes de eliminar.
- Cancelar sin ejecutar ninguna petición.
- Informar el resultado.
- Refrescar la colección desde el servidor.
- Limpiar el formulario si se estaba editando el registro eliminado.

### Errores frecuentes

- Olvidar el `return` después de cancelar.
- Enviar un identificador incorrecto.
- Confundir el objeto completo con el identificador.
- No revisar el método HTTP enviado en Network.
- Intentar interpretar una respuesta vacía como JSON cuando el contrato indica que DELETE no devuelve cuerpo.

### Criterio de salida

La confirmación controla la operación, el DELETE utiliza el identificador correcto, la interfaz informa el resultado y la colección se actualiza desde el backend.

---

## ETAPA 13. Aplicación de estilos CSS

### Objetivo

Dar una presentación clara y consistente a la interfaz sin separar los estilos en archivos externos.

### 13.1. Ubicación

El CSS pertenece al bloque `<style>` del componente `.svelte` correspondiente.

- Los estilos de `Navbar.svelte` pertenecen a `Navbar.svelte`.
- Los estilos de `Header.svelte` pertenecen a `Header.svelte`.
- Los estilos de `Card.svelte` pertenecen a `Card.svelte`.
- Los estilos de una página pertenecen a su `+page.svelte`.
- Los estilos globales estrictamente necesarios pueden definirse desde `+layout.svelte` con `:global(...)`.

No crees archivos `.css` independientes para repartir los estilos.

### 13.2. Fundamentos permitidos

Utiliza las reglas CSS necesarias para el diseño definido:

- Selectores por etiqueta, como `table`, `h2` o `input`.
- Selectores por clase, como `.campo` o `.botones`.
- Selectores combinados, como `th, td`.
- Estados como `:hover` y `:focus`.
- Colores de texto y fondo.
- `width`, `margin`, `padding` y `border`.
- `border-radius` cuando corresponda al diseño definido.
- Flexbox mediante `display: flex`, `gap` y `flex-direction`.

### 13.3. Convenciones

- Usa clases con nombres que expliquen la función: `.btn-borrar`, no `.rojo`.
- Reutiliza una clase base y variantes cuando sea apropiado.
- Mantén consistencia entre los componentes.
- Prueba los estados `:hover` y `:focus`.
- Cada componente debe tener sus propios estilos.
- No asumas que el CSS de la página afecta a los componentes hijos: los estilos de Svelte están delimitados al componente.
- Corrige advertencias de selectores CSS que no coincidan con elementos reales.

### 13.4. Restricciones visuales

- No agregues estilos, animaciones, librerías ni efectos que no sean necesarios para los requisitos.
- No instales un framework CSS por iniciativa propia.
- No crees hojas de estilo adicionales.
- No cambies el contenido funcional de una página para acomodarlo a un estilo.
- No sustituyas estilos existentes sin revisar primero cómo se utilizan.

### Criterio de salida

Cada componente mantiene su HTML, JavaScript y CSS en el mismo archivo, los estilos se aplican al componente correcto y no hay advertencias de selectores sin uso que deban resolverse.

---

## ETAPA 14. Integración y flujo completo de ejecución

### Objetivo

Comprobar que todas las partes trabajan juntas sin alterar las responsabilidades definidas.

### Flujo de lectura

```text
Usuario abre una ruta
        |
        v
SvelteKit carga +layout.svelte y la página +page.svelte
        |
        v
La página ejecuta onMount()
        |
        v
La función de carga llama al servicio
        |
        v
El servicio ejecuta fetch()
        |
        v
Vite reenvía /api al backend cuando se configuró el proxy
        |
        v
La API procesa la solicitud y responde
        |
        v
El servicio comprueba respuesta.ok y procesa la respuesta
        |
        v
La página asigna los datos a sus variables
        |
        v
Svelte actualiza la interfaz
        |
        v
El usuario ve la información
```

### Flujo de escritura

```text
Usuario interactúa con un formulario o botón
        |
        v
Se ejecuta el manejador de la página
        |
        v
La página valida la interacción y construye los datos
        |
        v
La página llama a una función del servicio
        |
        v
El servicio ejecuta el método HTTP documentado
        |
        v
La API procesa la operación y responde
        |
        v
El servicio valida y devuelve la respuesta
        |
        v
La página presenta el resultado
        |
        v
La página solicita nuevamente la colección
        |
        v
Svelte actualiza la interfaz con los datos del servidor
```

### Responsabilidades en el flujo

| Archivo | Qué hace | Qué no debe hacer |
|---|---|---|
| `vite.config.js` | Reenvía las solicitudes del proxy configurado. | Construir interfaces o ejecutar operaciones CRUD. |
| `+layout.svelte` | Enmarca las páginas con componentes comunes y `<slot />`. | Consultar directamente la API. |
| `+page.svelte` de una ruta | Gestiona la interfaz, variables y eventos de la página. | Ejecutar `fetch()` directamente. |
| `api_<recurso>.js` | Ejecuta las solicitudes HTTP y procesa las respuestas. | Renderizar HTML o administrar CSS. |
| Componentes de `lib/components/` | Renderizan piezas visuales reutilizables. | Contener llamadas HTTP o lógica de negocio de una página. |

### Criterio de salida

El flujo completo se puede seguir desde el navegador hasta la API y de regreso, y cada archivo conserva su responsabilidad.

---

## ETAPA 15. Pruebas funcionales y depuración

### Objetivo

Verificar que la interfaz realiza las operaciones requeridas y maneja los errores previsibles.

### 15.1. Pruebas de inicio

- La API está disponible.
- La aplicación inicia con `npm run dev`.
- La página raíz carga.
- Cada ruta aprobada abre su `+page.svelte`.
- El layout aparece alrededor del contenido.
- La navegación dirige a las rutas correctas.

### 15.2. Pruebas del listado

- La página solicita los datos iniciales mediante `onMount`.
- Se muestra un estado de carga.
- Si la API devuelve una colección vacía, se muestra el estado vacío.
- Si hay información, se muestran todos los registros recibidos.
- Cada fila utiliza un identificador único.
- Si la API falla, se muestra un error y no un estado vacío falso.

### 15.3. Pruebas del formulario y creación

- Cada campo tiene una etiqueta.
- Cada campo está vinculado a su variable.
- Los controles tienen el tipo adecuado.
- Los campos obligatorios están marcados correctamente.
- El formulario no recarga la página.
- El objeto enviado coincide con el esquema de la API.
- Los valores numéricos se envían como números cuando corresponde.
- Se informa el resultado real.
- El formulario se limpia después de una creación confirmada.
- La colección se consulta nuevamente.

### 15.4. Pruebas de edición

- El botón de edición corresponde a la fila correcta.
- Se consulta el registro individual mediante el servicio.
- Los campos se llenan con los datos devueltos.
- El título y el botón cambian al modo de edición.
- La operación utiliza PUT y el identificador correcto.
- Cancelar no envía el formulario.
- Guardar limpia el modo de edición.
- La colección se actualiza desde el servidor.

### 15.5. Pruebas de eliminación

- La confirmación aparece antes de enviar la solicitud.
- Cancelar no genera una petición DELETE.
- Aceptar envía DELETE con el identificador correcto.
- Se informa el resultado de la API.
- Si se elimina el registro que estaba en edición, el formulario se limpia.
- La colección se consulta nuevamente.

### 15.6. Pruebas de error

- Apaga temporalmente la API en un entorno de prueba y verifica que el frontend informe el error.
- Comprueba que un endpoint inexistente no se presente como éxito.
- Comprueba que un dato inválido muestre el error devuelto por la API.
- Verifica que un error no deje el estado de carga activo permanentemente.
- Verifica que no se muestren datos simulados como si fueran reales.

### 15.7. Herramientas de depuración

**Consola del navegador (F12 → Console):**

- Errores de JavaScript.
- Errores de importación.
- Errores de sintaxis de Svelte.
- Mensajes de depuración puntuales.

**Pestaña Network:**

- Método HTTP real.
- URL solicitada.
- Estado HTTP.
- Headers.
- Payload enviado.
- Response recibido.

**Terminal:**

- Errores de compilación.
- Errores de importación.
- Errores de configuración.
- Errores del servidor de desarrollo.

No ocultes errores con valores por defecto. Investiga el origen y corrige la causa.

### Criterio de salida

Todas las operaciones solicitadas pasan las pruebas correspondientes y los errores previsibles se muestran al usuario sin falsificar resultados.

---

## ETAPA 16. Revisión final antes de entregar

### 16.1. Revisión de estructura

- [ ] Cada ruta solicitada tiene su carpeta y su `+page.svelte`.
- [ ] La ruta raíz utiliza `src/routes/+page.svelte`.
- [ ] Existe un único layout común en `src/routes/+layout.svelte`, de acuerdo con la estructura definida.
- [ ] Los componentes reutilizables están en `src/lib/components/`.
- [ ] Los servicios de API están en `src/lib/services/`.
- [ ] Cada servicio corresponde a un recurso real utilizado por la aplicación.
- [ ] No se crearon carpetas no autorizadas.
- [ ] No se crearon archivos con responsabilidades distintas de las definidas.
- [ ] No hay archivos CSS o JavaScript externos para separar el contenido de los componentes.

### 16.2. Revisión de componentes

- [ ] Los componentes tienen mayúscula inicial.
- [ ] El HTML, JavaScript y CSS permanecen dentro del mismo archivo `.svelte`.
- [ ] `Navbar` solo enlaza rutas reales.
- [ ] `Header` recibe sus propiedades de forma coherente.
- [ ] `Card` utiliza `<slot />` cuando se usa como contenedor.
- [ ] `Footer` mantiene únicamente la responsabilidad de pie de página.
- [ ] El layout importa los componentes y contiene `<slot />`.

### 16.3. Revisión de servicios

- [ ] Todas las llamadas HTTP están centralizadas.
- [ ] Ninguna página ni componente contiene `fetch()`.
- [ ] Cada servicio tiene su constante `URL_BASE`.
- [ ] Los endpoints coinciden con la documentación real.
- [ ] Los métodos HTTP coinciden con las operaciones reales.
- [ ] Se comprueba `respuesta.ok`.
- [ ] El JSON se procesa solo cuando existe una respuesta JSON.
- [ ] POST y PUT envían el cuerpo y los headers requeridos.
- [ ] DELETE utiliza el identificador correcto y no envía un cuerpo si la API no lo requiere.
- [ ] Las funciones utilizan `async` y `await` correctamente.

### 16.4. Revisión de páginas

- [ ] Las variables se declaran al principio del `<script>`.
- [ ] Los nombres son descriptivos.
- [ ] Cada función tiene una sola responsabilidad.
- [ ] Los datos iniciales se solicitan mediante `onMount`.
- [ ] Existe estado de carga.
- [ ] Existe estado vacío.
- [ ] Existe tratamiento de error.
- [ ] Los listados usan `{#each}` con clave única.
- [ ] Los formularios utilizan `bind:value`.
- [ ] Cada campo tiene su `<label>`.
- [ ] Las operaciones HTTP se ejecutan llamando al servicio.
- [ ] Las operaciones asíncronas tienen `try/catch`.
- [ ] Después de cada cambio se vuelve a consultar la colección.
- [ ] La edición reutiliza el mismo formulario.
- [ ] La eliminación pide confirmación.

### 16.5. Revisión de ejecución

- [ ] La API responde en la dirección documentada.
- [ ] El proxy está configurado cuando hace falta.
- [ ] El servidor se reinició después de modificar `vite.config.js`.
- [ ] La aplicación inicia correctamente.
- [ ] Las rutas solicitadas cargan.
- [ ] Las operaciones se verificaron en el navegador.
- [ ] Los mensajes de error aparecen cuando la API no está disponible.
- [ ] No existen errores de compilación pendientes.

### 16.6. Resultado de entrega

Al finalizar, informa de manera concreta:

1. Qué rutas quedaron implementadas.
2. Qué componentes se crearon o reutilizaron.
3. Qué servicios se crearon o modificaron.
4. Qué operaciones de API quedaron conectadas.
5. Qué archivos existentes fueron modificados y por qué.
6. Qué pruebas se ejecutaron y cuáles pasaron.
7. Qué problemas permanecen pendientes, si los hay.

No afirmes que una función está probada si solo revisaste el código y no ejecutaste la prueba correspondiente.

---

## 5. Tabla de errores frecuentes y resolución obligatoria

| Síntoma | Causa que debes investigar | Acción correcta |
|---|---|---|
| La página no aparece | Ruta o nombre de `+page.svelte` incorrecto. | Comprobar la ubicación dentro de `src/routes/`. |
| El contenido de las páginas no aparece | Falta `<slot />` o el layout tiene un error. | Revisar `src/routes/+layout.svelte`. |
| No se encuentra un componente | Importación o ruta `$lib` incorrecta. | Comparar la importación con la ubicación real. |
| La petición no llega a la API | API apagada o proxy incorrecto. | Comprobar el backend y `vite.config.js`. |
| Error de CORS | Se está llamando directamente a otro origen o el proxy no se usa correctamente. | Revisar el destino y utilizar la ruta relativa configurada. |
| Error 404 | Endpoint, identificador o barra final incorrectos. | Comparar la solicitud con el contrato de la API. |
| Error 307 | Posible diferencia de barra final o redirección definida por el backend. | Comprobar la ruta exacta documentada. |
| Error 422 | Campos, tipos o contenido del body incompatibles. | Comparar el Payload con el esquema real. |
| `Promise { <pending> }` | Falta esperar una operación asíncrona. | Utilizar `await` dentro de una función `async`. |
| La pantalla no se actualiza | El estado no se reasignó o no se volvió a consultar. | Reasignar la variable y recargar desde la API. |
| El listado no se puede recorrer | La respuesta no tiene la estructura que espera `{#each}`. | Inspeccionar el Response y adaptar el acceso a la estructura real. |
| El identificador aparece vacío | El frontend utiliza un nombre de propiedad incorrecto. | Verificar el campo identificador de la respuesta. |
| Una operación se ejecuta al cargar la página | Se llamó al manejador con paréntesis en el marcado. | Pasar la función o utilizar una función flecha para argumentos. |
| El formulario se recarga | No se canceló el envío tradicional. | Añadir `evento.preventDefault()` o el modificador correspondiente. |
| El mensaje de éxito aparece con error HTTP | No se comprueba `respuesta.ok` o se ignora el error. | Corregir el procesamiento de respuesta en el servicio. |
| El estado de carga nunca termina | El estado no se restablece tras un error. | Garantizar su finalización en todos los caminos de ejecución. |
| Los estilos no afectan a un componente hijo | El CSS de Svelte está delimitado al componente. | Definir los estilos en el archivo del componente hijo. |
| Advertencia de selector CSS sin uso | El selector no coincide con el HTML. | Corregir o retirar el selector. |

---

## 6. Funcionalidades que no se deben añadir automáticamente

La guía de referencia menciona ejercicios y retos que sirven para practicar o ampliar el sistema, pero no forman parte automática de la implementación base.

Por lo tanto, **no agregues sin una solicitud expresa**:

- Búsquedas o filtros.
- Ordenamiento de columnas.
- Paginación.
- Contadores o indicadores agregados.
- Cálculos o estadísticas.
- Gráficos o dashboards.
- Exportación o importación de archivos.
- Notificaciones temporales.
- Modales personalizados.
- Autenticación o autorización no especificada.
- Preferencias de usuario.
- Nuevos módulos o rutas.
- Operaciones adicionales de la API.
- Bibliotecas o frameworks nuevos.
- Animaciones o interacciones decorativas.

Que una función sea sencilla de programar no significa que esté autorizada.

---

## 7. Reglas de cambios en proyectos existentes

Cuando trabajes sobre un proyecto que ya tiene código:

1. Revisa el archivo antes de cambiarlo.
2. Identifica qué partes ya funcionan.
3. Respeta las importaciones y convenciones existentes que sean compatibles con este manual.
4. Modifica solo el contenido necesario para implementar el requisito.
5. No reemplaces todo el archivo sin una razón técnica clara.
6. No cambies nombres de rutas, componentes o servicios que ya sean utilizados por otros archivos sin revisar sus referencias.
7. No elimines archivos porque parezcan innecesarios sin comprobar su uso.
8. No migres dependencias ni versiones como parte de una tarea funcional común.
9. No cambies la estructura para adaptarla a tus preferencias.
10. Comprueba las referencias después de cada modificación.

Si el proyecto existente incumple una regla estructural, informa el incumplimiento y plantea la corrección mínima. No ejecutes una reorganización general sin autorización.

---

## 8. Política de dependencias y herramientas

- La base del proyecto es SvelteKit con JavaScript.
- No utilices TypeScript.
- No incorpores React, Vue, Angular ni otro framework de interfaz.
- No incorpores Bootstrap salvo que el usuario lo haya autorizado o que ya esté integrado y se haya decidido utilizarlo.
- No instales librerías de formularios, tablas, iconos, estilos, estado, peticiones HTTP o notificaciones sin autorización.
- No añadas una dependencia para resolver algo que puede implementarse con las herramientas ya presentes y que esté contemplado en este manual.
- No edites `package.json` para introducir scripts o dependencias no solicitados.
- No ejecutes comandos destructivos ni limpiezas generales como solución automática a un error.

Si una dependencia es imprescindible para un requisito explícito, explica por qué no puede resolverse con las herramientas permitidas y solicita autorización antes de incorporarla.

---

## 9. Reglas de seguridad y confiabilidad

1. No escribas secretos, contraseñas o tokens directamente en el código del navegador.
2. No expongas credenciales del backend mediante variables o constantes visibles para el cliente.
3. No inventes mecanismos de autenticación.
4. Si el contrato exige autenticación y la estructura permitida no contempla cómo gestionarla de manera segura, detente y explica el conflicto. No crees una capa nueva por tu cuenta.
5. No muestres información sensible en mensajes de error.
6. No simules operaciones exitosas.
7. No elimines datos sin confirmación del usuario final mediante el flujo de confirmación establecido.
8. No ignores códigos HTTP de error.
9. No conviertas fallos de conexión en listas vacías.
10. No alteres los datos recibidos para que parezcan cumplir un esquema distinto del real.

---

## 10. Protocolo de actuación del agente en cada tarea

Antes de comenzar una tarea, sigue esta secuencia:

### A. Entender

- Lee el requisito completo.
- Identifica las rutas afectadas.
- Identifica los recursos de la API involucrados.
- Identifica las operaciones solicitadas.
- Identifica las restricciones particulares.

### B. Verificar

- Inspecciona la estructura actual.
- Inspecciona los archivos que se van a modificar.
- Verifica el contrato de la API.
- Comprueba si los componentes o servicios necesarios ya existen.

### C. Planificar

- Enumera los archivos existentes que modificarás.
- Enumera los archivos permitidos que crearás.
- Describe la responsabilidad de cada cambio.
- Señala cualquier dato indispensable que no esté disponible.

No incluyas archivos fuera de la estructura autorizada.

### D. Implementar

- Trabaja por etapas.
- Modifica lo mínimo indispensable.
- Mantén JavaScript, HTML y CSS del componente en el mismo `.svelte`.
- Mantén todo `fetch()` en `src/lib/services/`.
- Usa nombres descriptivos en español.
- Respeta los endpoints y esquemas documentados.
- No añadas funcionalidades ajenas al requisito.

### E. Comprobar

- Revisa errores de compilación.
- Ejecuta el proyecto.
- Prueba las rutas afectadas.
- Revisa Console y Network.
- Prueba los estados de carga, vacío y error.
- Prueba las operaciones solicitadas contra la API real.
- Comprueba que la lista se refresque después de cada modificación.
- Revisa otra vez que no se hayan creado ubicaciones no autorizadas.

### F. Informar

Entrega un resumen con:

- Resultado de la tarea.
- Archivos creados.
- Archivos modificados.
- Operaciones de API utilizadas.
- Validaciones ejecutadas.
- Errores pendientes o información que faltó.

No ocultes las tareas que no pudiste completar.

---

## 11. Lista de verificación maestra

Antes de declarar finalizado cualquier frontend, verifica todas las reglas aplicables:

### Arquitectura

- [ ] `routes` contiene únicamente páginas y el layout definido.
- [ ] Hay una carpeta por cada ruta no raíz.
- [ ] Cada carpeta de ruta contiene su `+page.svelte`.
- [ ] La página raíz está en `src/routes/+page.svelte`.
- [ ] `lib/components` contiene las piezas visuales reutilizables.
- [ ] `lib/services` contiene las funciones que hablan con la API.
- [ ] No se crearon carpetas ni archivos con responsabilidades no autorizadas.

### Componentes

- [ ] Cada componente mantiene script, HTML y estilo en el mismo archivo.
- [ ] Los nombres de componentes empiezan con mayúscula.
- [ ] Las propiedades y el contenido se pasan mediante las convenciones de Svelte indicadas.
- [ ] El layout utiliza `<slot />`.
- [ ] No hay llamadas HTTP en componentes visuales.

### Servicios

- [ ] Existe un servicio por recurso requerido.
- [ ] La URL base está centralizada en el servicio.
- [ ] `fetch()` aparece únicamente dentro de servicios.
- [ ] Los métodos, rutas y propiedades coinciden con la API.
- [ ] Se comprueba `respuesta.ok`.
- [ ] Los datos JSON se procesan según la respuesta real.
- [ ] Las funciones son claras y tienen una sola responsabilidad.

### Páginas

- [ ] Las variables se declaran al inicio del script.
- [ ] Los nombres son descriptivos.
- [ ] Los datos iniciales se solicitan con `onMount`.
- [ ] Las colecciones muestran carga, vacío, datos y error.
- [ ] Los formularios utilizan `bind:value`.
- [ ] Los campos tienen etiquetas y tipos adecuados.
- [ ] Las operaciones asíncronas tienen tratamiento de errores.
- [ ] Los listados usan una clave única.
- [ ] Crear y editar reutilizan el mismo formulario.
- [ ] Eliminar requiere confirmación.
- [ ] La colección se vuelve a consultar después de crear, actualizar y eliminar.

### Configuración y pruebas

- [ ] El proxy utiliza el origen real de la API.
- [ ] El servidor se reinició después de modificar la configuración.
- [ ] La aplicación inicia sin errores.
- [ ] Las rutas requeridas funcionan.
- [ ] Las operaciones se comprobaron en Network.
- [ ] Los errores del backend se comunican correctamente.
- [ ] No existen datos ficticios presentados como reales.
- [ ] No se agregaron dependencias ni funcionalidades no autorizadas.

---

## 12. Regla final e innegociable

**La estructura definida es inmutable durante la implementación.**

El agente debe resolver cada responsabilidad dentro de la ubicación que le corresponde:

- Las páginas viven en `src/routes/`.
- Los componentes visuales reutilizables viven en `src/lib/components/`.
- Las funciones que se comunican con la API viven en `src/lib/services/`.
- El layout común vive en `src/routes/+layout.svelte`.
- Los archivos públicos viven en `static/`.
- La configuración del proxy vive en `vite.config.js`.
- Cada componente contiene su propio JavaScript, HTML y CSS o las clases del framework visual autorizado, en un único archivo `.svelte`.
- Cada ruta no raíz tiene su carpeta y su `+page.svelte`.

No se permite crear carpetas o archivos nuevos para introducir responsabilidades que no estén definidas aquí. No se permite trasladar código a ubicaciones distintas porque parezca más cómodo. No se permite añadir funcionalidades por iniciativa propia.

Cuando una necesidad real no pueda resolverse respetando estas reglas, el agente debe detener únicamente la parte bloqueada, explicar el motivo con precisión y solicitar la autorización necesaria. **Nunca debe modificar la arquitectura por decisión propia.**
