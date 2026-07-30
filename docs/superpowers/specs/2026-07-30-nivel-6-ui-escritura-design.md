# Diseño — Nivel 6: UI de escritura (Tareas 6.1, 6.2, 6.3, 6.4)

Fecha: 2026-07-30 · Estado: **esperando aprobación de Pipe**

Este documento no reescribe `TAREAS.md`: los checklists de 6.1 a 6.4 siguen siendo la fuente de
verdad de *qué* se construye. Acá se fija *cómo*, y se cierran las decisiones que las tareas
dejaban abiertas.

Punto de partida medido en la base (`jaflglivhurdhccjvfac`), el mismo estado con que cerró el
Nivel 5: **22 proyectos · 82 tareas · 0 notas · `project_history` 0 · `task_history` 61**.
16 clientes distintos · 3 `engagement_type` · 2 `project_type_api` · 13 proyectos `Bloqueado` ·
los **22 `next_step` en `null`** (2.1.j).

---

## 1. Las 4 decisiones abiertas, ya cerradas con Pipe

| # | Decisión | Dónde estaba abierta | Resolución |
|---|---|---|---|
| 1 | Alcance de 6.2 | El título dice "Crear/**editar** tarea" pero el único checklist (6.2.a) solo habla del formulario con `<select>` de dependencia | **Crear + editar.** Sin editar, ninguna pantalla puede mover una tarea de columna y `Finalizada` queda inalcanzable desde la UI — y es el estado del que depende la regla de 4.3.b. `actualizarTarea` (4.3.c) ya existe y está verificada |
| 2 | El campo que le falta a 6.1 | `crearProyecto` (4.2.a) exige **8** campos; 6.1.a lista **7**. Falta `owner_role`, que es `NOT NULL` | **Catálogos cerrados, cliente abierto, rol derivado.** `<select>` cerrado para tipo de vínculo (3 valores) y tipo de proyecto (2) — alimentan los filtros de 5.2.b y un valor nuevo dejaría opciones sueltas. Cliente con `<input list>` (16 sugerencias, admite uno nuevo). Responsable: `<select>` de las 6 personas y **el rol se deriva de la persona**, sin campo extra. Medido: las 6 personas tienen un solo rol cada una (Daniel Rojas `Commercial / Delivery`, las otras 5 `Delivery`) |
| 3 | Alcance de 6.3 | El banner solo se renderiza si `health='Bloqueado'` (criterio verificado de 5.3.c) | **Los 4 campos del bloqueo editables** (`blocker_reason`, `blocked_since`, `blocker_owner`, `next_step`), **solo en proyectos bloqueados**. 5.3.c queda intacto. Limitación aceptada y documentada: en los 9 proyectos no bloqueados no hay forma de definir `next_step` desde la UI, aunque el componente `health` del score lo pesa en los tres estados de salud |
| 4 | Qué hace la barra fija "Cancelar / Guardar" | 5.3.g la dejó con Guardar deshabilitado "hasta que el Nivel 6 le dé algo que guardar" | **Guardar es el submit del formulario del banner (6.3)**: se habilita cuando hay cambios sin guardar. "Cancelar" mantiene su etiqueta y cambia de acción según el estado: sin cambios vuelve al listado (como en el Nivel 5), con cambios los descarta. Tarea y nota guardan con su propio botón |

---

## 2. Arquitectura

Cuatro superficies de escritura sobre las dos pantallas que ya existen. Ninguna pantalla nueva,
ninguna ruta nueva, ninguna tabla nueva.

```
app/proyectos/page.tsx                  (server)  sin cambios
  └─ components/projects-table.tsx      (client)  ← 6.1: reemplaza el botón inerte
       └─ components/create-project-modal.tsx     (client, NUEVO — 6.1)

app/proyectos/[project_code]/page.tsx   (server)  ← pasa 2 props nuevas, saca la barra fija
  ├─ blocked-banner.tsx                 (client)  ← 6.3: pasa a cliente, y aloja la barra fija
  ├─ kanban.tsx                          (server)  ← 6.2: cuelga los disparadores de cliente
  │    └─ project-detail/task-form.tsx  (client, NUEVO — 6.2)
  ├─ notes-panel.tsx                    (client)  ← 6.4: campo + botón
  └─ info-modal.tsx                     (client)  ← pasa a usar el cascarón compartido

components/modal.tsx        (NUEVO)  cascarón de diálogo: Escape, fondo, foco, role="dialog"
components/form-fields.tsx  (NUEVO)  controles de formulario con un solo look
lib/forms.ts                (NUEVO)  las 2 decisiones puras que comparten los formularios
```

### 2.1 Archivos que `TAREAS.md` no lista

Mismo criterio con que el Nivel 4 agregó `actions/common.ts` y el Nivel 5 sus 7 piezas: ninguna
feature, tabla, pantalla ni verbo CRUD nuevo. Son piezas que **dos o más** tareas de este nivel
necesitan, o que existen para poder medir lo que un componente de cliente esconde.

| Archivo | Por qué | Lo consumen |
|---|---|---|
| `components/modal.tsx` | El cascarón de diálogo (Escape, click en el fondo, foco al abrir, `role="dialog"` + `aria-modal`) hoy vive suelto dentro de `info-modal.tsx`. 6.1 y 6.2 necesitan exactamente el mismo comportamiento. Con tres copias, el día que una no cierre con Escape nadie lo nota | 6.1, 6.2, 5.3.f |
| `components/form-fields.tsx` | Etiqueta + control + estado de error, con las clases de marca en un solo lugar. `filters-form.tsx` tiene hoy sus propios controles con la clase escrita adentro; se le deja el `<select>` de filtro tal cual (su semántica es "Todos", no la de un formulario) y solo pasa a **importar la constante de clase** desde acá, para que no queden dos definiciones del mismo control | 6.1, 6.2, 6.3, 6.4, 5.2.b |
| `components/project-detail/task-form.tsx` | El formulario de 6.2. **Ya estaba anunciado**: la desviación de 5.3 dice que `kanban.tsx` queda Server Component y que "la Tarea 6.2 le agrega el formulario como hijo de cliente" | 6.2 |
| `lib/forms.ts` | Dos funciones puras, **separadas por verificación y no por estética** (mismo motivo que `lib/project-list.ts`): `personasConRol()` — el mapa persona → rol de la decisión 2, que hay que poder medir contra los 6 pares reales del dataset; y `soloLoQueCambio()` — el parche que se manda al servidor, que es lo que sostiene "el CRUD no rompe otros campos" cuando el parche lo arma un formulario. Adentro de un componente de cliente las dos solo se pueden revisar leyendo código | 6.1, 6.2, 6.3 |

### 2.2 Patrones comunes a las cuatro tareas

- **Una acción del Nivel 4 por formulario, ninguna consulta desde el navegador.** 6.1 → `crearProyecto`; 6.2 → `crearTarea` / `actualizarTarea`; 6.3 → `actualizarProyecto`; 6.4 → `crearNota`. Las 6 acciones ya verifican sesión, filtran campos no editables y devuelven `ActionResult<T>`. Este nivel **no toca `actions/`**.
- **`useTransition` + `router.refresh()`**, el patrón que ya usa el estado vacío de 5.2.d. La acción hace su `revalidatePath`; `refresh()` es lo que vuelve a renderizar el árbol del servidor con la fila nueva. Es un re-render, no una recarga: eso es lo que pide el criterio de 6.4 ("sin recargar la página").
- **El estado del formulario se resincroniza con lo que devolvió la acción**, no con lo que se escribió. Las acciones devuelven la fila real (con el `score_proyecto` que puso el trigger), así que al guardar se toma esa fila como nueva base y el estado "hay cambios" queda en falso sin adivinar.
- **Nada se deshabilita en silencio.** Botón en "Guardando…" y deshabilitado mientras la promesa está en vuelo; error de la acción en un `role="alert"` con su texto tal cual (ya viene limpio de detalles de Supabase, `actions/common.ts`); confirmación en un `role="status"`.
- **Un error no cierra el formulario.** Los modales se cierran **solo** tras un `ok: true` — criterio literal de 6.1.
- **Ningún hex nuevo** (§2.3 del diseño del Nivel 5 sigue vigente): todo sale de los 12 tokens de `app/globals.css`; los neutros de `accent`/`primary` con opacidad. Botón primario `bg-secondary text-accent`.
- **Las fechas siguen siendo texto `'YYYY-MM-DD'`** de punta a punta: `<input type="date">` entrega ese formato y las acciones lo esperan así. No se construye ningún `Date` (`APRENDIZAJES.md` #19).
- **Campo vacío → `null`, no cadena vacía.** Un `blocker_owner` en `''` haría que el ⚠️ y el score vieran "hay dato" donde no hay ninguno. `soloLoQueCambio()` normaliza.

---

## 3. Tarea 6.1 — Modal "+ Crear proyecto"

`components/create-project-modal.tsx` (cliente), montado en `projects-table.tsx` **en lugar de**
`BotonCrearProyecto`, el único elemento que el Nivel 5 entregó inerte (§8 de su diseño). Ese
aviso — "Todavía no se puede crear proyectos desde acá" — desaparece con esta tarea.

Recibe `projects: Project[]` (los 22 sin filtrar) para derivar los catálogos.

| Campo (6.1.a) | Control | Obligatorio |
|---|---|---|
| Nombre del proyecto | texto | sí |
| Cliente | `<input list>` con los 16 clientes existentes, admite uno nuevo | sí |
| Tipo de vínculo | `<select>` de `opcionesDe(projects,'engagement_type')` (3 valores) | sí |
| Tipo de proyecto | `<select>` de `opcionesDe(projects,'project_type_api')` (2 valores) | sí |
| Responsable | `<select>` de `personasConRol()`, etiqueta "Camila Torres · Delivery" | sí |
| Fecha de apertura | `<input type="date">` | no |
| Fecha límite | `<input type="date">` | no |

- **El rol no es un campo**: se deriva de la persona elegida (decisión 2) y se muestra en la etiqueta de la opción, así que lo que se va a guardar está a la vista y no es magia invisible.
- Los 5 obligatorios son las 5 columnas `NOT NULL` que `crearProyecto` no puede inventar. Las 2 fechas quedan opcionales porque 4.2.c exige que la acción no falle con `null` — y eso ya está verificado (prueba A de la 4.2).
- Validación propia, además de los obligatorios: **`target_date` no puede ser anterior a `start_date`**. El esquema no tiene ese `CHECK` y la acción no lo revisa; un proyecto que vence antes de abrir no es un dato, es un error de tipeo.
- `stage`, `status` y `health` **no** están en el formulario: los fija `crearProyecto` en `Borrador`/`Activo`/`Sano` (4.2.a), que es justo el criterio de verificación de esta tarea.
- Al guardar bien: se cierra el modal, `router.refresh()`, y queda una línea `role="status"` al lado del botón con el código que devolvió la acción — "PRJ-23 creado.". El proyecto aparece en la tabla en la posición que le da su score (nace en 8,13 con las dos fechas vacías, medido en la 4.2).

**Criterio de la tarea:** el proyecto creado desde el modal aparece con `health='Sano'` y
`stage='Borrador'`; el modal se cierra solo tras guardar exitosamente.

**Limitación conocida:** el botón vive dentro de `projects-table.tsx`, que solo se renderiza con
al menos un proyecto (con 0 filas manda el estado vacío de 5.2.d). Con la base vacía el único
camino sigue siendo "Cargar datos de ejemplo" — que además es lo coherente con la decisión 2: los
tres catálogos se derivan de los datos, y sin datos no hay catálogo.

---

## 4. Tarea 6.2 — Crear / editar tarea en el Kanban

`components/project-detail/kanban.tsx` (sigue **Server Component**) + `task-form.tsx` (cliente).

El tablero no necesita estado: los dos disparadores son hijos de cliente, tal cual lo anticipó la
desviación de 5.3.

```
Kanban (server)
  ├─ encabezado ─ <NuevaTareaBoton project_code tasks personas />      (client)
  └─ Tarjeta ──── <EditarTareaBoton task tasks personas />             (client)
```

Los dos abren el mismo diálogo (`components/modal.tsx`), en modo crear o editar.

| Campo | Crear (4.3.a) | Editar (4.3.c) |
|---|---|---|
| Título | texto, obligatorio | ídem |
| Detalle | textarea, opcional | ídem |
| Responsable | `<select>` de `personasConRol()`, rol derivado | ídem |
| Prioridad | `<select>` de los 4 valores del `CHECK` de 1.1.b | ídem |
| Fecha límite | `<input type="date">`, obligatoria (`due_date` es `NOT NULL`) | ídem |
| Dependencia | `<select>` de las tareas del **mismo proyecto** + "Sin dependencia" | ídem, **excluyendo la propia tarea** |
| Estado | **no está**: lo fija la regla de 4.3.b | `<select>` de los 5 valores |
| `is_overdue` | **no está**: lo deriva `crearTarea` de `due_date` | lo deriva `actualizarTarea` |

- **Los enumerados van escritos, no derivados de los datos**: son el `CHECK` del esquema, no un dato del dataset. Mismo criterio con el que 5.2.b escribió `Activo`/`Cerrado` — si `Finalizada` no apareciera en el `<select>` porque hoy ninguna tarea lo está, el estado que el sistema agregó a propósito (`APRENDIZAJES.md` #2) sería inalcanzable.
- **Las personas incluyen al responsable del proyecto**, no solo a los asignados de sus tareas: un proyecto recién creado por 6.1 tiene 0 tareas, y sin esa unión el `<select>` saldría vacío. La página lee los pares `assignee_alias`/`assignee_role` de todas las tareas (una consulta chica) y los une con el `owner_alias`/`owner_role` del proyecto.
- **El `<select>` de dependencia avisa la consecuencia antes de guardar**: al elegir una tarea que no está `Finalizada`, aparece una línea "Va a nacer **Bloqueada**: `PRJ-04-T03` todavía no está Finalizada". La regla de 4.3.b deja de ser una sorpresa, y es exactamente lo que el criterio de esta tarea verifica.
- **En modo editar, la propia tarea no se ofrece como dependencia.** La FK autorreferente la aceptaría (2.2.d midió 0 autorreferencias en el dataset, no las prohíbe) y una tarea bloqueada por sí misma no se destraba nunca.
- **Editar manda solo lo que cambió** (`soloLoQueCambio`), así que el trigger de historial de la 1.3 deja una fila por campo tocado y ninguna por los demás.
- El ciclo `PRJ-04-T02 ↔ PRJ-04-T03` del dataset queda editable como cualquier otra tarea: se puede romper cambiando una dependencia, y eso es una decisión del usuario, no algo que el sistema haga solo (Tarea 2.2, `APRENDIZAJES.md` #15).

**Criterio de la tarea:** una tarea creada con dependencia aparece en la columna correcta según la
regla de 4.3.b — `Bloqueada` si la tarea de la que depende no está `Finalizada`, `Por hacer` si
sí.

---

## 5. Tarea 6.3 — Editar bloqueo y siguiente paso

`components/project-detail/blocked-banner.tsx` pasa de Server Component a cliente y **se queda con
la barra fija** de 5.3.g, que sale de `app/proyectos/[project_code]/page.tsx`. Es la consecuencia
directa de la decisión 4: si "Guardar" es el submit de este formulario, el estado del formulario y
el botón que lo dispara no pueden vivir en archivos distintos.

Qué renderiza, según el proyecto:

| `health` | Banner | Barra fija |
|---|---|---|
| `Bloqueado` | editable, con los 4 campos | Guardar habilitado solo si hay cambios; Cancelar los descarta |
| `En riesgo` / `Sano` | **ausente** (criterio de 5.3.c, intacto) | presente, Guardar deshabilitado con `title="No hay cambios sin guardar"` (5.3.g, intacto) |

| Campo | Control |
|---|---|
| `blocker_reason` | textarea |
| `blocked_since` | `<input type="date">` |
| `blocker_owner` | `<input list>` con las 6 personas, admite un valor de afuera (un bloqueo puede ser del cliente o de un proveedor) |
| `next_step` | textarea |

- **"Cancelar" no cambia de etiqueta** (5.3.g la dejó verificada con ese texto): cambia de acción. Sin cambios pendientes es el link al listado que ya era; con cambios pendientes los descarta y vuelve a los valores del servidor.
- El efecto de guardar es visible en tres lugares y los tres se verifican: el ⚠️ del pill desaparece (regla de `HealthBadge`, un solo lugar para las dos pantallas), el `score_proyecto` baja porque el componente `health` pasa de 100 a 70 (`CRITERIO-PRIORIZACION.md`), y el listado reordena. Es el circuito completo del reto: detectar el hueco, llenarlo, ver el efecto en la priorización.
- Cada campo tocado deja su fila en `project_history` (trigger de la 1.3); un guardado que no cambia nada no genera ninguna y `actualizarProyecto` ni dispara el `UPDATE` (prueba J de la 4.2).

**Criterio de la tarea:** editar `blocked_since` / `blocker_owner` / `next_step` de un proyecto
sembrado sin esos datos, confirmar que se guardan y que aparece fila en `project_history`.

---

## 6. Tarea 6.4 — Agregar nota

`components/project-detail/notes-panel.tsx`, que ya es cliente por el filtro de fecha. Recibe
`project_code` como prop nueva.

- Textarea + botón "Agregar nota" **arriba de la lista**, que es donde va a aparecer la nota.
- El botón está deshabilitado con el campo vacío o de solo espacios: es la misma regla que la acción ya aplica (prueba B de la 4.4), puesta antes para que el error no llegue a existir. La acción la sigue aplicando igual — no se confía en la UI.
- Al guardar bien: se limpia el textarea, `router.refresh()`, y la nota aparece **al tope** sin recargar. El orden ya viene resuelto en la consulta de la página (`created_at desc`, decidido en 5.3.e justo para esto); este componente no ordena nada.
- `id` y `created_at` los pone la base (defaults de 1.1.c), así que la hora no depende del reloj del navegador. Se muestra en UTC, igual que el resto (`lib/format.ts`).
- El contador del encabezado ("Notas (0)") y el estado vacío se actualizan con el refresh, sin lógica extra.

**Criterio de la tarea:** la nota de prueba aparece arriba de las demás sin recargar la página.

---

## 7. Lo que este nivel NO construye

- **Borrar**: nada. La Tarea 1.4 dejó `DELETE` fuera de las políticas de RLS a propósito, y ninguna de las 4 tareas de este nivel pide borrar. Una nota sigue siendo inmutable por ausencia de verbo (4.4).
- **Editar `stage`, `status`, `health`, `business_value`, `summary`, `owner_*` de un proyecto.** `actualizarProyecto` los soporta, pero ninguna tarea del Nivel 6 pide una pantalla para ellos. El modal de info (5.3.f) sigue siendo de lectura.
- **Mover tareas arrastrando** entre columnas del Kanban. El cambio de columna es el `<select>` de estado del formulario de edición.
- **`next_step` en proyectos no bloqueados** (decisión 3, limitación aceptada).
- La vista "Estado" y la vista "Tareas" del listado (5.2.e las declaró placeholder).
- El widget de chat (7.2) y la API Route (7.1): Nivel 7.

---

## 8. Cómo se verifica

No hay runner de tests en el proyecto, así que se sigue el patrón de los Niveles 3, 4 y 5:
medición real contra la base y contra el HTML renderizado, no inspección de código. Y con las tres
trampas de instrumento que dejó `APRENDIZAJES.md` #21 presentes desde el principio: la ruta
temporal **no** va en una carpeta que empiece con `_` (Next la excluiría del enrutado), los patrones
toleran el `<!-- -->` que React inyecta entre texto estático y expresión, y los conteos se hacen
sobre el HTML del `<body>` descartando el payload RSC, que repite todos los textos.

1. `npx tsc --noEmit` → 0 · `npx eslint .` → 0 · `npm run build` → 0, con las 4 rutas reales.
2. **Las 4 acciones, corridas dentro de un request real** (`next dev` + `curl` con tarro de cookies y sesión de `admin@aztec.local`), con el payload exacto que arma cada formulario:
   - **6.1** → `crearProyecto` con los 8 campos del modal (rol derivado incluido): `PRJ-23` nace **Sano / Borrador / Activo** con `score_proyecto` puesto por el trigger, y aparece en el HTML de `/proyectos`.
   - **6.2** → `crearTarea` con dependencia de una tarea **no** `Finalizada` → nace `Bloqueada`, y la tarjeta se renderiza **dentro de la columna "Bloqueada"** (pareando tarjeta con su columna, no contando el texto en toda la página). Después `actualizarTarea` de esa dependencia a `Finalizada` → la tarjeta de esa tarea **cambia de columna**, y una tarea nueva que dependa de ella nace `Por hacer`. Los dos lados de 4.3.b, que es el criterio de 6.2.
   - **6.3** → `actualizarProyecto` con los 4 campos del banner sobre un proyecto sembrado `Bloqueado`: valores guardados, **filas en `project_history`** con su `campo`, el ⚠️ desaparece del pill y de la fila del listado, y el `score_proyecto` baja el delta esperado (se mide antes y después contra `calcularScore`).
   - **6.4** → dos `crearNota` seguidas: las dos quedan con su `created_at` de la base y la **segunda aparece primera** en el HTML del panel.
3. **HTML de los formularios**: cada control con su `<label for>`; el `<select>` de tipo de vínculo con 3 opciones, el de tipo de proyecto con 2, el de personas con 6 y su rol en la etiqueta, el de dependencia con las tareas del proyecto; el de estado con los 5 valores incluido `Finalizada`. Y **0 apariciones** del aviso inerte de 5.2.c ("Todavía no se puede crear proyectos desde acá"), que esta tarea cierra.
4. **Lo que 5.3 dejó verificado sigue igual**: banner **ausente** en un proyecto `Sano` con la barra fija **presente** y Guardar deshabilitado con su `title`; el modal de info sigue cerrando con Escape, con el fondo y con su botón después de pasar al cascarón compartido; los 22 códigos del listado siguen en `--color-link`.
5. **`lib/forms.ts` medido aparte**, sin renderizar: `personasConRol` contra los 6 pares reales del dataset (y contra un caso construido con una persona con dos roles, para fijar qué hace), y `soloLoQueCambio` contra los casos que importan — campo sin tocar (no viaja), campo vaciado (`''` → `null`), campo que vuelve a su valor original (no viaja), parche completo.
6. **Marca**: `grep` sobre el CSS compilado para confirmar que no entró ningún hex nuevo y que los controles usan los tokens existentes.
7. **La base se devuelve a su estado de cierre del Nivel 5** — 22 proyectos · 82 tareas · 0 notas · `project_history` 0 · `task_history` 61 — borrando por SQL las filas de prueba y las de historial que generaron. Se borran los archivos temporales de verificación y un `npm run build` final confirma que solo quedan las rutas reales.

**Lo que no se puede medir sin navegador** (no hay uno en este entorno, se dice como tal): el
click que abre un modal, el Escape, el `<datalist>`, y el paso de "Guardar" de deshabilitado a
habilitado cuando el formulario se ensucia. De eso se verifica el HTML inicial y la lógica pura de
`lib/forms.ts`, que es la que decide qué se manda; el camino completo por la UI se ve en el video
del reto. El reporte va a decir explícitamente qué quedó comprobado por medición y qué por revisión.

---

## 9. Riesgos conocidos

1. **`info-modal.tsx` y `filters-form.tsx` son código ya verificado que este nivel toca** (para usar el cascarón y la constante de clase compartidos). Es un cambio de forma, no de comportamiento, y por eso el punto 4 de §8 vuelve a medir los criterios de 5.2 y 5.3.f en vez de darlos por buenos.
2. **La barra fija de 5.3.g cambia de archivo** (de la página a `blocked-banner.tsx`). El riesgo concreto es que quede duplicada o ausente según el `health`; se verifica en los dos casos, bloqueado y sano.
3. **`next_step` sigue sin editarse en los 9 proyectos no bloqueados** (decisión 3). Es una limitación aceptada, no un hallazgo pendiente.
