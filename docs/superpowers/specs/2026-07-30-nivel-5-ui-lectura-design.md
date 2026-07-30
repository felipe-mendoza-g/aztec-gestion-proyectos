# Diseño — Nivel 5: UI de lectura (Tareas 5.1, 5.2, 5.3)

Fecha: 2026-07-30 · Estado: **esperando aprobación de Pipe**

Este documento no reescribe `TAREAS.md`: los checklists de 5.1, 5.2 y 5.3 siguen siendo la
fuente de verdad de *qué* se construye. Acá se fija *cómo*, y sobre todo se cierran las
decisiones que las tareas anteriores dejaron abiertas por escrito para este nivel.

---

## 1. Las 4 decisiones abiertas, ya cerradas con Pipe

| # | Decisión pendiente | Dónde quedó abierta | Resolución |
|---|---|---|---|
| 1 | Color del código de proyecto en la tabla | Tarea 3.5, "Pendiente para el Nivel 5": mockup pide `#173e78`, manual fija `Link = #0D3326` | **Gana el manual: `#0D3326`** (`--color-link`, ya declarado). El link se distingue por negrita —que 5.2.a ya pide— más subrayado en `hover`/`focus`. No se declara ningún token nuevo fuera de la paleta aprobada |
| 2 | Qué pasa sin sesión en `/proyectos` | Tarea 3.1, desviación: "`proxy.ts` no protege rutas… queda abierto para el Nivel 5" | **`redirect('/login')`, hecho en la página, no en `proxy.ts`**. Así la ruta de la Tarea 7.1 (llamada por `curl`, sin cookies) sigue intacta |
| 3 | Cerrar sesión | No aparece en ninguna de las 27 tareas | **Se agrega botón "Salir" en el header compartido.** Desviación documentada. Sin él el evaluador no puede volver a `/login` sin borrar cookies, y el login es un requisito visible del reto |
| 4 | Dónde vive el estado de filtros y orden | Ambigüedad de 5.2.a/5.2.b | **En memoria del cliente**, sobre los 22 proyectos que trae el Server Component. Dataset chico y cerrado; filtrar y reordenar sin viaje al servidor. Costo aceptado: los filtros no quedan en la URL |

Decisión adicional, menor, que tomo y dejo anotada: **`app/page.tsx` pasa a `redirect('/proyectos')`.**
Hoy tiene el boilerplate de `create-next-app` (logo de Next, "To get started, edit the page.tsx file",
bloques `dark:`). Es la primera pantalla que ve el evaluador y ninguna tarea lo reemplaza —
mismo patrón de `APRENDIZAJES.md` #4: nadie lo tenía en su lista de "Crear". Con la decisión 2,
`/` sin sesión termina en `/login` y con sesión en el listado.

---

## 2. Arquitectura

Un patrón, repetido en las dos pantallas de datos:

```
app/proyectos/layout.tsx          (server)  header + Salir  →  acá monta el widget de 7.2
  └─ app/proyectos/page.tsx       (server)  exige sesión, lee los 22 proyectos
       └─ components/projects-table.tsx     (client)  dueño del estado: filtros, orden, vista
            └─ components/filters-form.tsx  (client)  solo controles, sin estado propio

  └─ app/proyectos/[project_code]/page.tsx  (server)  exige sesión, lee proyecto + tareas + notas
       ├─ stepper.tsx          (server)  presentacional puro
       ├─ blocked-banner.tsx   (server)  presentacional en el Nivel 5; 6.3 lo vuelve cliente
       ├─ kanban.tsx           (client)  6.2 le agrega el formulario
       ├─ notes-panel.tsx      (client)  filtro de fecha = estado local; 6.4 le agrega el campo
       └─ info-modal.tsx       (client)  abrir/cerrar = estado local
```

**Por qué el header vive en `app/proyectos/layout.tsx` y no en `app/layout.tsx`:** la Tarea 5.1.c
pide que `/login` no tenga widget de chat, y la 7.2.b pide el widget "en todas las páginas excepto
`/login`". Montándolo en este layout, la exclusión es estructural — no hay que preguntar por la
ruta en tiempo de ejecución ni acordarse de nada en el Nivel 7.

**La verificación de sesión va en cada página, no en el layout.** Un layout no se vuelve a
ejecutar en toda navegación del lado cliente, así que un chequeo ahí no es una garantía.

**Los datos se leen en el servidor, siempre.** Con el RLS de la Tarea 1.4 la lectura llega
autenticada por la cookie que dejó el login. Ninguna pantalla de este nivel lee desde el
navegador.

### 2.1 Archivos que `TAREAS.md` no lista

Mismo criterio con que el Nivel 4 agregó `actions/common.ts`: no agregan ninguna feature, tabla,
pantalla ni verbo CRUD. Son piezas que 5.2 y 5.3 necesitan **las dos**, y la alternativa era
escribirlas dos veces.

| Archivo | Por qué | Lo consumen |
|---|---|---|
| `app/proyectos/layout.tsx` | Header compartido + punto de montaje del widget de 7.2 | 5.2, 5.3 |
| `components/site-header.tsx` | Wordmark + botón "Salir" (decisión 3). Cliente: `signOut()` corre en el navegador, que es donde vive la cookie de sesión | layout |
| `lib/session.ts` | `exigirSesion()`: devuelve el cliente del servidor o redirige a `/login`. No sirve `clienteConSesion` de `actions/common.ts`: esa devuelve texto de error porque quien la llama es un formulario; una página redirige | 5.2, 5.3 |
| `lib/format.ts` | `formatFecha`, `formatFechaHora`, `formatMonto`. Fechas y montos se muestran en las dos pantallas | 5.2, 5.3 |
| `components/badges.tsx` | `HealthBadge`, `PriorityBadge`, `TaskStatusBadge`, `AlertaSiguientePaso`. **La regla del ⚠️ queda en un solo lugar**, y es criterio de verificación de 5.2 *y* de 5.3.a | 5.2, 5.3 |

### 2.2 Un cambio a `lib/scoring.ts`

`scoreHealth` ya implementa el predicado "`next_step` vacío, contando el de solo espacios como
vacío", y su propio comentario dice que es "el mismo criterio que usa el ⚠️ de la UI (Tareas 5.2
y 5.3)". Se extrae a una función exportada `sinSiguientePaso(project)` y `scoreHealth` la usa.
Es el mismo movimiento que hizo la Tarea 4.3 con `hoyUTC()`: una regla, un lugar. **La fórmula
no se toca**, así que los 22 scores verificados en 1.2 / 3.3 / 4.1 no cambian — y eso se
vuelve a medir.

### 2.3 Reglas de estilo

- **Ningún hex nuevo.** Todo sale de los 12 tokens de `app/globals.css`. Los neutros que la UI
  necesita y el manual no define (bordes, separadores, texto atenuado) salen de `accent` y
  `primary` con modificador de opacidad: `border-accent/10`, `text-primary`. Si algo no se puede
  expresar así, se pregunta en vez de inventar un color.
- **El botón primario es `bg-secondary text-accent`**, nunca `bg-primary` (es un gris de apoyo) ni
  texto blanco sobre el verde (1.8:1, ilegible). Ya está anotado en `globals.css`.
- **Las fechas se formatean parseando en UTC**, con `Date.UTC`, no con `new Date('2026-09-30')`
  interpretado en local. `APRENDIZAJES.md` #19: en Colombia (UTC-5) eso corre la fecha un día
  hacia atrás y `30 sep` se vería como `29 sep`. Aplica a `due_date`, `target_date`, `start_date`
  y `blocked_since`.
- Tono de los textos según `docs/brand-guide.md` §7: directo, sin rodeos. Nada de "¡Ups!" ni
  "Algo salió mal".

---

## 3. Tarea 5.1 — Login

`app/login/page.tsx` (server) + `components/login-form.tsx` (client).

La página es Server Component para poder hacer lo contrario de la decisión 2: **si ya hay sesión,
redirige a `/proyectos`** en vez de mostrar el formulario. El formulario es cliente porque
`signInWithPassword` corre en el navegador — es lo que deja la cookie que después leen los
Server Components (Tarea 3.1, prueba D).

- **5.1.a** Campos etiquetados "Usuario" y "Contraseña". `type="text"`, no `type="email"`: con
  `email` el navegador rechazaría `admin` antes de enviar el formulario.
- **5.1.b** `admin` → `admin@aztec.local`. Regla: si lo escrito no tiene `@`, se le pega
  `@aztec.local`. Así `admin` y `admin@aztec.local` funcionan los dos y no hay una tabla de
  usuarios cableada en el cliente.
- **5.1.c** Sin widget de chat: estructural, ver §2.
- Error: un solo texto, **"Usuario o contraseña incorrectos."**, para cualquier fallo de
  credenciales. Nada de `Invalid login credentials` ni códigos de Supabase (criterio de la tarea).
  Un fallo que no sea de credenciales (red, llaves mal puestas) muestra su propio mensaje genérico.
- Botón en estado "Entrando…" mientras la promesa está en vuelo, y deshabilitado, para que no se
  disparen dos logins.

**Criterio de la tarea:** `admin`/`123` redirige al listado; credenciales incorrectas muestran
error sin detalles técnicos.

---

## 4. Tarea 5.2 — Listado de proyectos

`app/proyectos/page.tsx` + `components/projects-table.tsx` + `components/filters-form.tsx`.

La página exige sesión, trae los 22 proyectos con `select('*')` ordenados por
`score_proyecto desc` desde la base, y se los pasa al componente cliente. De `lib/scoring.ts`
solo se usa `priorityFromScore` — nota de la Tarea 3.3: para ordenar y filtrar alcanza el
`score_proyecto` que ya viene de la base, no hace falta recalcular.

### 5.2.a — Columnas

| Columna | Campo | Notas |
|---|---|---|
| Código | `project_code` | Hipervínculo a `/proyectos/[code]`, **negrita**, `#0D3326` (decisión 1), subrayado en hover/focus |
| Nombre | `project_name` | Sin negrilla, tal cual pide la tarea |
| Tipo | `project_type_api` | |
| Cliente | `client_alias` | |
| Responsable | `owner_alias` + `owner_role` | El rol en línea secundaria, atenuado |
| Fecha límite | `target_date` | `—` si es `null`. Marcada si ya pasó |
| Salud / prioridad | `health` + `priorityFromScore(score)` + score | Badge de salud, badge de prioridad, y el número del score: sin el número, el orden por defecto no se puede leer |
| Estado | `status` | Activo / Cerrado |

Las 8 son ordenables (click en el encabezado alterna asc/desc, con indicador visible).
**Orden por defecto: `score_proyecto` descendente** — criterio de la tarea. Con el dataset real
eso pone `PRJ-04` (91,50) arriba, que es el proyecto del cuello de botella del hallazgo de la
Tarea 2.2.

El **⚠️** aparece en la celda de salud/prioridad, y solo si `health === 'Bloqueado'` **y**
`next_step` está vacío (`sinSiguientePaso`, §2.2). Lleva `title` y `aria-label`
"Bloqueado sin siguiente paso definido" — un emoji solo no le dice nada a un lector de pantalla.
Con el seed, la 2.1.j deja los 22 `next_step` en `null`, así que se espera **⚠️ en exactamente los
13 proyectos `Bloqueado`** y en ninguno más.

### 5.2.b — Los 9 filtros

| Filtro | Control | Regla |
|---|---|---|
| Tipo de vínculo | `<select>` de valores distintos de `engagement_type` | igualdad |
| Tipo de proyecto | `<select>` de `project_type_api` | igualdad |
| Rol del responsable | `<select>` de `owner_role` | igualdad |
| Estado | `<select>` Activo / Cerrado | igualdad |
| Fecha de apertura | `<input type="date">` | `start_date >= valor` (los `null` quedan fuera cuando el filtro está puesto) |
| Tareas pendientes | `<input type="number">` | `open_tasks >= valor` |
| Solo con tareas vencidas | checkbox | `overdue_tasks > 0` |
| Score mínimo | `<input type="number">` | `score_proyecto >= valor` |
| Solo con bloqueos | checkbox | `health === 'Bloqueado'` |

Las opciones de los tres `<select>` se derivan de los datos, no se escriben a mano: si el seed
cambia, las opciones cambian. Botón "Limpiar filtros" y un contador "N de 22 proyectos" — sin él,
un filtro que deja 0 filas se ve igual que una base vacía (`APRENDIZAJES.md` #16 aplicado a la UI).

### 5.2.c / 5.2.d / 5.2.e

- **5.2.c** Botón "+ Crear proyecto" (`bg-secondary text-accent`), arriba a la derecha de la tabla.
  El modal es la Tarea 6.1 y no existe todavía: en este nivel el botón queda **inerte**, con el
  handler ya en su lugar para que 6.1 sea un cambio chico. Lo dejo anotado como estado
  intermedio conocido, no como algo terminado.
- **5.2.d** Con `projects` vacía no se dibuja tabla: se muestra un estado vacío con el botón
  "Cargar datos de ejemplo", que llama a `cargarDatosEjemplo()` de la Tarea 4.1. Muestra el
  resultado ("22 proyectos y 82 tareas cargados") o el texto de error de la acción. Con filas, el
  botón no se renderiza — criterio de 5.2.d.
- **5.2.e** Toggles Lista / Estado / Tareas. "Lista" es la vista real. Las otras dos muestran un
  panel con una línea: *"Vista no construida. Los mismos datos están en la vista Lista."* Es lo
  que la tarea pide (placeholder), dicho sin rodeos.

**Criterio de la tarea:** ordena por `score_proyecto` desc por defecto; ⚠️ solo en `Bloqueado`
con `next_step` vacío; los filtros filtran de verdad.

---

## 5. Tarea 5.3 — Detalle de proyecto

`app/proyectos/[project_code]/page.tsx` + los 5 componentes de `components/project-detail/`.

La página exige sesión y hace tres lecturas: el proyecto (`maybeSingle`, `notFound()` si no
existe), sus tareas, y sus notas ordenadas por `created_at desc`.

- **5.3.a Título:** `PRJ-04` → `Global Contract Management` → pill. El pill es el badge de salud;
  cuando la regla del ⚠️ se cumple, muestra **"⚠️ Bloqueado"**. Un proyecto `Bloqueado` que sí
  tiene `next_step` muestra "Bloqueado" sin ⚠️; uno sano muestra "Sano". Es el mismo componente
  compartido de §2.1, así que no puede desalinearse con la tabla.
- **5.3.b Stepper:** Borrador → Descubrimiento → Ejecución → Cierre, mapeado a `stage`. La etapa
  actual resaltada, las anteriores marcadas como recorridas, las siguientes atenuadas.
  `aria-current="step"` en la actual.
- **5.3.c Banner de bloqueo:** solo si `health === 'Bloqueado'`. Muestra `blocker_reason`,
  `blocked_since`, `blocker_owner` y `next_step`. Con el seed, `blocked_since` y `blocker_owner`
  vienen `null` (2.1.b) y `next_step` también (2.1.j): se muestran como `—` y ese hueco es
  exactamente lo que la Tarea 6.3 viene a llenar. Presentacional en este nivel.
- **5.3.d Kanban:** las 5 columnas reales de `tasks.status`, **incluida `Finalizada`**, cada una
  con su contador. Tarjeta: `task_code`, `title`, badge de prioridad, `assignee_alias` + rol,
  `due_date` (marcada si `is_overdue`), y un chip **"Depende de `PRJ-04-T03`"** cuando
  `depends_on_task_code` no es `null`. Una columna sin tareas se dibuja vacía, no se esconde: el
  Kanban tiene que mostrar las 5 (criterio de la tarea).
- **5.3.e Panel de notas:** ordenadas por fecha descendente, con `<input type="date">` que filtra
  desde esa fecha. Estado vacío propio. Con el seed hay 0 notas — el panel se ve vacío y eso es lo
  correcto: las notas nacen en la Tarea 6.4.
- **5.3.f Modal "Info general":** botón que abre un diálogo con `engagement_type`,
  `project_type_api`, `client_alias`, `owner_role`, `start_date`, `target_date`,
  `business_value` + `currency` + `business_value_usd`, y `summary`. Cierra con Escape, con click
  en el fondo y con su botón. `role="dialog"`, `aria-modal`, foco al abrir.
- **5.3.g Botones fijos "Cancelar" / "Guardar":** barra pegada abajo. "Cancelar" vuelve al
  listado. **"Guardar" queda deshabilitado**, porque en un nivel de solo lectura no hay cambios
  pendientes que guardar — el Nivel 6 es el que le da algo que hacer. Deshabilitado y no oculto
  porque la tarea pide que los botones estén fijos ahí.

**Criterio de la tarea:** proyecto bloqueado sin `next_step` → título con código, nombre y pill
"⚠️ Bloqueado"; stepper resalta la etapa según `stage`; Kanban con las 5 columnas reales.

---

## 6. Lo que este nivel NO construye

- El modal de crear proyecto (6.1), el formulario de tarea (6.2), la edición del banner (6.3) y
  el campo de nota (6.4). Los componentes quedan con la forma que esas tareas van a necesitar,
  sin adelantar la escritura.
- Las vistas "Estado" y "Tareas" a fondo (5.2.e las declara placeholder).
- El widget de chat (7.2). El layout ya tiene su lugar.
- Modo oscuro: el manual define un solo fondo y un solo color de texto (decisión de la Tarea 3.5).
- Paginación: son 22 filas.

---

## 7. Cómo se verifica

No hay runner de tests en el proyecto (`package.json` trae `dev`, `build`, `lint`), así que se
sigue el patrón de los Niveles 3 y 4: medición real, no inspección de código.

1. `npx tsc --noEmit` → 0 · `npx eslint .` → 0 · `npm run build` → 0, con las rutas `/`, `/login`,
   `/proyectos` y `/proyectos/[project_code]` listadas.
2. **Decisión 2 y 3:** `next dev` + `curl` con tarro de cookies. Sin cookie, `/proyectos` y
   `/proyectos/PRJ-04` responden redirección a `/login`; `/` redirige; y **`/api/…` sin cookies
   sigue pasando intacto** (que es lo que la Tarea 7.1 necesita). Con cookie, las tres cargan.
3. La base está hoy en **0 filas**: primero se ejercita **5.2.d** cargando el seed por la acción de
   la 4.1 dentro de un request real, y se confirma 22 + 82 y que el botón desaparece después.
4. **Aserciones sobre el HTML renderizado**, no sobre el fuente:
   - orden por defecto: la primera fila del `<tbody>` es `PRJ-04`, y los 22 salen en score desc;
   - **⚠️ en exactamente 13 filas**, las 13 con `health='Bloqueado'`, y en 0 de las otras 9;
   - el `<a>` del código resuelve al `#0d3326` del token en el CSS servido, no a un hex escrito a mano;
   - cada uno de los 9 filtros, uno por uno, contra el conteo esperado calculado aparte sobre el
     dataset — "filtran de verdad" es un número, no una impresión;
   - detalle de un proyecto `Bloqueado` sin `next_step`: pill "⚠️ Bloqueado", banner presente,
     stepper con la etapa de su `stage` marcada, **5 encabezados de columna** en el Kanban, y los
     chips "Depende de" en las tareas que tienen `depends_on_task_code`;
   - detalle de un proyecto `Sano`: **banner ausente** (la otra mitad de 5.3.c);
   - `PRJ-04-T02` y `PRJ-04-T03` se muestran dependiendo la una de la otra: el ciclo del dataset
     tiene que ser visible en pantalla, que es el punto del hallazgo de la Tarea 2.2.
5. **Los 22 scores se vuelven a medir** contra `calcularScore` después del cambio de §2.2, para
   probar que extraer `sinSiguientePaso` no movió la fórmula.
6. Se borra todo archivo temporal de verificación y se confirma con un `npm run build` final que
   solo quedan las rutas reales.

Lo que no se puede verificar sin navegador (que no hay en este entorno) se dice como tal: el orden
por click en encabezado y el filtrado en memoria viven en el cliente, así que se verifican sobre la
lógica pura extraída y sobre el HTML inicial, y se marca explícitamente en el reporte qué quedó
comprobado por medición y qué por revisión.

---

## 8. Riesgo conocido

El botón "+ Crear proyecto" (5.2.c) queda inerte entre este nivel y la Tarea 6.1. Es la única
pieza de este diseño que se entrega sin efecto. Se declara acá para que no aparezca después como
un hallazgo del `verifier`.
