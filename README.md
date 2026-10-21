# Mis pendientes — modelo de referencia

Este es el sistema que uso a diario como Jefa de Proyectos para dar seguimiento a todo lo que sale de las juntas. Te lo comparto como **referencia de cómo necesito el control** en el sistema que vas a crear para las asistentes.

> **Todos los datos de esta copia son de ejemplo.** No hay pendientes, minutas, nombres ni montos reales. El código es el mismo que uso, pero guarda su información en otro espacio del navegador (`centroPendientesMODELO_v1`), así que no se mezcla con mi sistema real.

**Para verlo:** abre `index.html` en Chrome. No necesita servidor ni instalación.

---

## 1. Para qué existe

Mi trabajo es **dar seguimiento** a lo que se acuerda en las juntas, mío y de Gabriel (Gerente General), y que nada se quede en el aire. El sistema me responde tres preguntas cada mañana:

1. ¿Qué tengo que hacer **yo** hoy?
2. ¿A quién le tengo que **dar seguimiento** o **recordarle** algo hoy?
3. ¿Qué **minutas** me faltan por mandar y qué **temas** están en rojo?

## 2. La regla más importante: quién hace qué

Cada pendiente dice **quién entrega** y **cuál es mi papel**. Esa distinción es lo que más me sirve y lo que tiene que conservar el sistema nuevo.

| Tipo | Quién entrega | Mi papel |
|---|---|---|
| ✦ Yo lo hago | Daray | Lo hago yo |
| 🔔 Recordarle a Gabriel | Gabriel | Recordarle |
| ◆ Gabriel lo hace | Gabriel | Esperar y dar seguimiento |
| ↻ Dar seguimiento | Otra persona | Darle seguimiento |
| ◎ Verificar que ocurra | Otra persona | Verificar que cumpla |
| ⚑ Escalar bloqueo | (a quién bloquea) | Escalarlo con Gabriel |
| ◇ Decisión de Gabriel | Gabriel | Monitorear la decisión |

Además, cada pendiente tiene:
- **Estado:** pendiente, esperando o terminado.
- **Fecha de compromiso** y, aparte, **cuándo me lo muestra** a mí, para actuar antes de que venza.
- **Prioridad** (normal o urgente), si **se repite** (semanal o mensual) y si hay que **agendarlo**.
- La **reunión de la que salió**, el **tema** al que pertenece y un **historial de avances** con fecha.

Los pendientes con fecha lejana **se ocultan hasta que se acercan**, para no ensuciar la vista. No se deben perder al migrar.

## 3. Pantallas

- **Inicio:** semáforos (atrasados, de hoy, esperando, minutas por enviar, temas en rojo), mi checklist del día, los seguimientos de hoy, los pendientes de Gabriel y la semana de las 17 semanas.
- **Pendientes:** tablero por columnas (por hacer, esperando, terminado), con filtros por persona, tema y fecha. Incluye un botón para **copiar la lista de Gabriel en formato WhatsApp**.
- **Dominós:** los frentes estratégicos del año. Algunos están **en pausa** porque ya se ven dentro de las señales.
- **Temas:** las **señales** semanales (con semáforo, el "delta" comprometido de la semana y su checklist) y los **temas comunes** de seguimiento mensual. Cada uno guarda su historial de estatus.
- **Agenda:** la semana del calendario, el control de **minutas por enviar** y el historial de reuniones.

## 4. Ciclo de la semana

- **Lunes (LOOPS):** Subdirección baja el **plan de la semana** por señal: delta comprometido y pasos.
- **Durante la semana:** las juntas generan pendientes, avances y estatus.
- **Viernes (cierre):** se presenta el **avance** contra el plan. El sistema me arma un borrador del cierre, pero el informe final **lo reviso y lo resumo yo**.

## 5. Minutas (de la junta al correo)

1. Gemini toma notas en Meet y deja el documento en Drive (carpeta "Google Meet"), con dos pestañas: resumen y transcript.
2. La minuta se arma **a partir del transcript**, no solo del resumen de Gemini. El resumen se equivoca de persona cuando hay un solo micrófono, junta temas y se salta acuerdos.
3. **No se inventa nada.** Lo que no está claro dice "Pendiente por confirmar". Las decisiones empiezan con "Decisión:" y los riesgos con "Riesgo:" más su mitigación.
4. Yo **reviso la minuta en el sistema** antes de mandarla: asunto, destinatarios, resumen, decisiones y acciones. Puedo editar, borrar o agregar acciones.
5. Con un botón se copia con formato y se abre Gmail con los destinatarios y el asunto. Pego y envío.
6. **Cada acción de la minuta está ligada a un pendiente.** Si cambio el responsable o la fecha en la minuta, cambia en Pendientes. Si agrego una, se crea el pendiente. Si borro una, me pregunta si también la quito de Pendientes.
7. El sistema mide el **cumplimiento de minutas**: cuántas se mandaron y cuántas en 1 día hábil.

En esta copia hay un borrador de ejemplo en **Agenda → Minutas por enviar → Revisar minuta**.

## 6. Reglas de los datos (lo que más me ha costado)

- **Nunca perder mis ajustes.** Lo que yo cambio a mano gana siempre sobre lo que llega de las juntas.
- **Sin duplicados.** Si una junta repite una acción que ya existe (abierta o cerrada), se agrega como **avance** de la existente, no como una nueva. Me llegaron a entrar 20 a 35 acciones de un día para otro, y varias ya las había cerrado.
- **Lo cerrado se queda cerrado.** Volver a leer un transcript viejo no debe reabrir nada.
- **Cada cambio de una junta se aplica una sola vez.**
- Lo que borro no regresa en la siguiente actualización.

## 7. Qué ve cada nivel

- **Justin (Dirección):** el estatus general de cada tema.
- **Yuri (Subdirección):** las próximas acciones de cada tema y si se están cumpliendo.
- **Gabriel (Gerencia General):** los pendientes de cada tema.
- **Información sensible** (por ejemplo, sueldos): se ve **por nivel**. No toda la información de dirección debe llegar a todas las asistentes.

## 8. Qué no debe automatizarse

- Los **informes y reportes semanales** que se entregan. La IA puede dar el borrador, pero el texto final lo reviso y lo resumo yo.
- El **envío de minutas**: siempre se revisa antes de mandar.

## 9. Lo que me gustaría y todavía no tengo

- **Recordatorios automáticos** al responsable de cada pendiente (correo o WhatsApp), un día o una hora antes de la fecha.
- **Varias usuarias** con su propia vista y permisos. Hoy es un archivo para una sola persona.
- Una **base de datos** real. Hoy la información vive dentro del mismo HTML y en el navegador.

---

## Para la parte técnica

- `index.html`: toda la app (HTML, CSS y JavaScript en un solo archivo). Los datos van en `<script id="datos-incrustados" type="application/json">` y lo que la usuaria cambia se guarda en `localStorage`. Al abrir, ambas copias se combinan por id; lo de la usuaria gana si es más reciente (`upd`, `minutaTs`, `borrados`).
- `herramientas/actualizar.js`: script de Node que mete en el HTML lo que llega de las juntas. Se corre con `node herramientas/actualizar.js` y es seguro correrlo varias veces. Lee:
  - `cargas/juntas/*.json`: una por junta, con la reunión, estatus por tema, pendientes nuevos y cambios o avances sobre pendientes existentes (ver el ejemplo).
  - `cargas/minutas-borrador/*.json`: el borrador de cada minuta, con las acciones ligadas a su pendiente (`itemId`). Solo se carga si no existe, para no pisar lo que ya edité.
  - `cargas/calendario/*.json`: la respuesta de Google Calendar.
  - `cargas/minutas-enviadas.json`: las minutas encontradas en Gmail (enviados).
  - `cargas/config.json`: los dominós en pausa y las rutas opcionales (Excel de dominós, archivo de KPIs).
- Hoy el actualizador lo corre Claude (Claude Code), que lee Drive, Calendar y Gmail, escribe los JSON de `cargas/` y ejecuta el script.

## Checklist de preparación por reunión (agregado el 21-oct-2026)

Cada reunión puede traer `prep`: una lista de lo que hay que **preguntar**, **revisar** o **llevar** a esa junta (`{id, texto, tipo, ok, item, de}`). Si el punto se refiere a un pendiente, `item` guarda el id de ese pendiente.

- En Inicio y Agenda, las reuniones **del día de hoy** con puntos llevan el botón 📋 (palomeados / total).
- Al abrir la reunión, la lista aparece arriba. Ahí se palomea, se agrega con Enter y se quita con ✕. Con "Copiar checklist" se copia para WhatsApp.
- Debajo de la lista salen solos los pendientes abiertos de la misma serie del calendario (mismo `calId` antes del `_`).
- El actualizador lee `cargas/prep/*.json` (`[{reunion, puntos:[…]}]`) y solo suma puntos con id nuevo. Lo que el usuario palomea, agrega o quita se respeta.
