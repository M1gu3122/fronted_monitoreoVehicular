# Matriz de trazabilidad del Parcial II

COM11 · Gestión vehicular en concesionario · 18 de noviembre de 2026

Los folios del informe corresponden a la numeración impresa después de la portada. **Verificado** identifica una comprobación sobre el archivo, el código o el entorno expresamente indicado. **Parcial** identifica evidencia que cubre solo parte del criterio. **Pendiente** identifica una condición sin evidencia suficiente. **En aula** reserva la valoración al acto de sustentación.

## Instrucciones, alcance y entrega

| Exigencia de la guía | Evidencia y criterio de aceptación | Resultado y ubicación |
|---|---|---|
| Caso asignado y avance de ambos componentes | Conectar ingreso, estacionamiento y mantenimiento con capacidades identificables en las fuentes. | Verificado. Informe 1–4 y 8; inventario. El reconocimiento por cámara forma parte de la propuesta. |
| Informe en español, un PDF por equipo | Abrir el PDF, comprobar portada, 8–12 páginas de cuerpo y referencias aparte. | Verificado. Un PDF de informe con 9 folios de cuerpo, portada y referencias. |
| Fuente legible, 11–12 pt e interlineado de 1,15 a 1,5 | Inspeccionar estilo del cuerpo y páginas renderizadas. | Verificado. Arial 11 pt, interlineado 1,36 en el cuerpo. Figuras y notas tienen rotulación propia. |
| Presentación en español, sobria y con poco texto, un PPTX por equipo | Abrir el paquete, comprobar de 10 a 15 diapositivas y revisar legibilidad visual. | Verificado en el archivo y sus previsualizaciones. 15 diapositivas. |
| Trabajo colectivo y aporte equitativo | Declaración con nombres y aportes reales por persona. | Pendiente por decisión del equipo. Informe 9. No se asignaron contribuciones supuestas. |
| Privacidad y autoría | Datos ficticios o anonimizados, capturas sin credenciales, procedencia de imágenes y citas verificables. | Verificado en el material preparado. Placa, roles y cuentas de ensayo; capturas y diagramas propios. Informe 2, 6–7 y referencias. |
| Un integrante sorteado; preparación de todos; puntualidad, plataforma y exposición presencial | Un ejemplar por equipo en la plataforma institucional y asistencia al turno del 18/11/2026 desde las 18:00. Todos deben poder ejecutar el recorrido. | En aula / pendiente de entrega institucional. Guion 1–5 listo para cualquier integrante. El equipo y el docente realizan entrega, sorteo y evaluación. |
| Rúbrica previa y retroalimentación respetuosa | Usar los seis indicadores publicados y atender al evaluador con precisión y cortesía. | Rúbrica contrastada abajo; guion 4–5 prepara la interacción. Publicación institucional y observación oral corresponden al docente. |

## Informe y pruebas

| Requisito | Evidencia necesaria y aceptación | Estado y localización |
|---|---|---|
| Introducción y problema | Explicar la decisión operativa y qué dato necesita cada actor. | Verificado. Informe 1. |
| Objetivo general y objetivos específicos | Formular objetivos verificables y vincular cada uno con una conclusión. | Verificado. O1–O3 en 1 y 9. |
| Descripción del caso y de la solución | Distinguir registro, visita, evento, medición y reconocimiento automático. | Verificado. 1–2, tabla 1. |
| Arquitectura, comunicación, despliegue y bases local/nube | Seguir una petición de formulario a repositorio y confirmar los componentes en ambos entornos. | Parcial. Figura 1 y ensayo local en 3 y 6–7. Nube sin prueba integral; el destino comentado no acredita despliegue. |
| Modelo relacional; tablas principales y secundarias | Identificar entidades operativas, catálogos, permisos y relaciones deducibles. Confirmar restricciones físicas si se atribuyen a la instalación. | Verificado como modelo lógico. Figura 2, tabla 2 e inventario. DDL institucional pendiente. |
| Tecnologías y justificación | Relacionar las decisiones de interfaz, API, base y tablas interactivas con el caso; discutir alternativas. | Verificado. 3–5, 9. |
| Tres roles y módulos | Vincular permisos observables con al menos tres perfiles; separar roles de ensayo del catálogo institucional. | Verificado en local. Tabla 3, nueve módulos en inventario. Catálogo institucional pendiente. |
| Autenticación | Iniciar sesión por frontend y observar módulos autorizados para el usuario. | Verificado con tres inicios de sesión en el entorno aislado. Informe 5–7, presentación 6 y 12–13. |
| CRUD por rol | Probar crear, leer, actualizar y eliminar para cada rol pertinente, comprobando sus permisos y el resultado persistido. | Parcial. Alta de vehículo, alta de visita, lectura y corrección realizadas con tres perfiles. No se ejecutó DELETE ni se probó todo el CRUD por rol. El inventario distingue métodos publicados de métodos ensayados. |
| Reflejo de un proceso en los demás roles | Ver la misma placa en el catálogo de otra sesión y recuperar la misma visita desde una tercera. | Verificado en local. SIM246, vehículo 1 y visita 1; figuras 4 y 5 y tabla 4. |
| DataTables | Interactuar con una tabla de la biblioteca e identificar su implementación. | Verificado. Filtro de placa en Visitas y lectura de la fila; 5 y 7. Siete pantallas instancian la biblioteca; el registro maestro tiene una tabla Svelte. |
| Verificación en BD de creado, actualizado y estado | Seleccionar la misma fila antes y después; verificar identidad y estado, conservación de creado y cambio de actualizado. | Parcial. SELECT posterior confirmó placa, visita, estado falso, salida y duración. El esquema mínimo no incluía las dos marcas; guion 4 prevé su contraste. |
| Capturas, diagramas y gráficos | Numerar, titular e interpretar cada figura y tabla; incluir arquitectura, datos y funcionamiento. | Verificado. Informe figuras 1–5 y tablas 1–5. La figura 3 cuantifica el contrato; las figuras 4–5 reproducen el navegador. |
| Conclusiones | Responder a los objetivos con resultados, límites y pruebas siguientes. | Verificado. 8–9, con brechas de visita abierta, alertas, auditoría, ocupación y cámaras. |
| Literatura y APA 7 | Al menos cinco referencias, tres técnicas o científicas, con correspondencia autor-fecha y enlaces contrastados. | Verificado en informe. Seis referencias, incluidas documentación oficial, RFC y artículo de congreso. |

## Presentación y sustentación

| Requisito | Evidencia y aceptación | Resultado |
|---|---|---|
| Inicio accesible y progresión técnica | Presentar el valor del sistema antes de las decisiones de implementación. | Verificado. Primeras láminas para el concesionario; parte intermedia para el evaluador técnico. Identificación nominal de equipo omitida según instrucción. |
| UML, arquitectura y diagrama de tablas | Reconocer actores, casos de uso, capas y relaciones entre entidades. | Verificado en el PPTX. Complemento detallado en figura 2 y tabla 2 del informe. |
| Cinco diagramas de flujo | Un diagrama legible por proceso, con pasos y decisiones verificables. | Verificado. Láminas 6–10: autenticación, alta de vehículo, visita, ocupación y alertas. El flujo de alertas identifica la interrupción de la escritura. |
| APIs implementadas y frontend | Identificar rutas y métodos reales; relacionarlos con pantallas desarrolladas. | Verificado. Láminas 6–13 e inventario. |
| Evidencia de funcionamiento | Incorporar capturas auténticas y comunicar con precisión qué operación se probó. | Verificado en local. Láminas 12–13, perfil de origen y efecto en otra sesión. |
| Cierre y referencias | Sintetizar alcance y siguientes pruebas; identificar fuentes técnicas. | Verificado. Láminas 14–15. |
| Exposición de 10–15 minutos más preguntas | Cronograma con apertura, desarrollo y cierre; preguntas fuera del tiempo principal. | Guion preparado para 12 minutos. Duración observada, dicción y dominio se califican en aula. |
| Adaptación a dos audiencias | Primeros 3 minutos orientados a personal o directivos; luego explicar arquitectura, motor, framework y permisos. | Verificado en guion 1–3 y 5. |
| Demostración en tiempo real desde frontend y consulta posterior en BD | Iniciar acciones de negocio en pantalla, contrastar la misma placa en la base y responder ante fallos. | Ensayo local acreditado en informe 6–7. Guion 3–4 contiene secuencia para la repetición; ejecución ante el evaluador y disponibilidad en nube pendientes. |
| Responder preguntas y justificar diseño | Incluir una reformulación sencilla y una comparación técnica con alternativas; gestionar incidentes. | Verificado en guion 5. La respuesta espontánea corresponde a la sustentación. |

## Correspondencia con el nivel Sobresaliente

| Indicador | Criterio para el nivel 4 | Evidencia y límite de evaluación |
|---|---|---|
| PI1. Redacción | Precisión, concisión, continuidad y adaptación a lectores no especializados. | Informe 1 explica vehículo, visita y evento mediante la entrega al taller; 3–5 usa términos técnicos en contexto. |
| PI2. Organización | Hilo conductor problema → solución → resultados, síntesis, alternativas y mejoras. | Informe 1–9 y presentación 1–14. Cada conclusión remite a un objetivo y al alcance probado. |
| PI3. Gráficos | Material numerado, legible, interpretado y apropiado para cada audiencia. | Arquitectura y datos en 3–4; contrato en 5; capturas en 6–7; cinco procesos en presentación 6–10. |
| PI4. Comunicación verbal | Ritmo, apertura y cierre, manejo del tiempo, analogía y defensa de decisiones. | Guion 1–5 con bloques y preguntas. El desempeño real requiere observación docente. |
| PI5. Comunicación no verbal | Uso intencional de pausas, mirada, postura, gestos y calma ante fallos. | Acotaciones del guion para señalar, mirar al público, pausar y gestionar contingencias. Evaluación en aula. |
| PI6. Bibliografía | Fuentes técnicas y científicas verificables, comparadas e integradas en el argumento. | Informe 3–5 y 9–10. La literatura sobre lectura automática fundamenta cómo evaluar cámaras; las fuentes técnicas fundamentan decisiones de arquitectura. |
