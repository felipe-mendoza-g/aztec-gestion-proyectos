# Tareas de construcción

27 tareas, organizadas en 9 niveles (Nivel 0 + Niveles 1 a 8), en el orden en que deben construirse (cada nivel depende del anterior). `implementer` y `verifier` trabajan una tarea a la vez, siguiendo `HARNESS.md`.

**Convención de estatus por tarea:** `pendiente` · `en progreso` · `con novedad` (esperando revisión de Pipe, ver `HARNESS.md`) · `hecha`. Todas empiezan en `pendiente`.

**Criterio de priorización:** ver `CRITERIO-PRIORIZACION.md` (fórmula completa, subfórmula de `health`, umbrales de `priority`). Las tareas 1.2 y 3.3 lo implementan, ninguna repite la fórmula acá.

---

## Nivel 0 — Scaffold del proyecto

### Tarea 0.1: Crear la app Next.js y el repo — **Estatus: hecha**
**Archivos:**
- Crear: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `.env.local` (no se commitea)
- **No** se crea `tailwind.config.ts`: Tailwind v4 configura por CSS (`@theme` en `app/globals.css`), no por archivo JS. Afecta a la Tarea 3.5, que todavía dice "Modificar: `tailwind.config.ts`" — pendiente de decisión de Pipe, no se cambió por cuenta propia

**Depende de / produce:**
- Consume: nada
- Produce: proyecto Next.js (App Router) + TypeScript + Tailwind compilando, repo `git` inicializado, `@supabase/ssr` instalado, `.env.local` con las llaves reales. Es prerrequisito de la Tarea 3.1 (`lib/supabase/client.ts`) y de la 3.5 (que dice "Modificar: `tailwind.config.ts`", archivo que solo existe después de esta tarea)

**Cómo verificar que quedó bien:**
- `npm run build` compila sin errores, y `git status` corre sin error mostrando `.env.local` como ignorado

- [x] 0.1.a `create-next-app` con TypeScript, Tailwind, App Router, ESLint y **sin** directorio `src/` — las rutas de `TAREAS.md` son de raíz (`app/`, `lib/`, `components/`, `actions/`). Gestor de paquetes: **npm** (decisión fijada; `pnpm` no está instalado y el README de 8.1.b apunta a un evaluador externo que clona el repo). Resultado: Next.js 16.2.12, React 19.2.4, Tailwind v4, TypeScript 5
- [x] 0.1.b Instalar `@supabase/supabase-js` (^2.111.0) y `@supabase/ssr` (^0.12.4)
- [x] 0.1.c `git init` + `.gitignore` que excluya `node_modules/`, `.next/` y `.env.local`. Se agregó `!.env.example` porque el patrón `.env*` de Next también ignoraba el `.env.example` que la Tarea 8.1.a exige commitear
- [x] 0.1.d `.env.local` con las 4 variables de 8.1.a: `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` reales, `API_KEY_PROYECTOS` generada, `OPENAI_API_KEY` vacía hasta el Nivel 7
- [x] 0.1.e Verificar: `npm run build` compila sin errores — exit code 0, "Compiled successfully in 2.3s", rutas `/` y `/_not-found` prerenderizadas, `.env.local` detectado

---

## Nivel 1 — Base de datos (Supabase)

### Tarea 1.1: Esquema de tablas — **Estatus: hecha**
**Archivos:**
- Crear: `supabase/migrations/001_tables.sql`

**Depende de / produce:**
- Consume: nada
- Produce: tablas `projects`, `tasks`, `notes`, `project_history`, `task_history`

**Cómo verificar que quedó bien:**
- Correr la migración en Supabase, confirmar en el editor de tablas que las 5 tablas existen con las columnas exactas de abajo

- [x] 1.1.a Tabla `projects`: `project_code` (text, PK), `engagement_type` (text), `client_alias` (text), `project_name` (text), `project_type_api` (text), `stage` (text, valores: Borrador/Descubrimiento/Ejecución/Cierre), `status` (text, valores: Activo/Cerrado), `health` (text, valores: Bloqueado/En riesgo/Sano), `owner_alias` (text), `owner_role` (text), `start_date` (date, nullable), `target_date` (date, nullable), `business_value` (numeric, nullable), `currency` (text), `business_value_usd` (numeric, nullable), `open_tasks` (integer, default 0), `overdue_tasks` (integer, default 0), `next_step` (text, nullable), `blocker_reason` (text, nullable), `blocked_since` (date, nullable), `blocker_owner` (text, nullable), `score_proyecto` (numeric, default 0), `summary` (text, nullable)
- [x] 1.1.b Tabla `tasks`: `task_code` (text, PK), `project_code` (text, FK a `projects.project_code`), `assignee_alias` (text), `assignee_role` (text), `priority` (text, valores: Baja/Media/Alta/Crítica), `status` (text, **valores: Por hacer/En progreso/En revisión/Bloqueada/Finalizada**, 5 valores — el dataset original solo usa los primeros 4, `Finalizada` es un valor nuevo que el sistema necesita, ver `APRENDIZAJES.md` #2), `due_date` (date), `is_overdue` (boolean), `title` (text), `detail` (text, nullable), `depends_on_task_code` (text, nullable, FK a `tasks.task_code`)
- [x] 1.1.c Tabla `notes`: `id` (uuid, PK, default `gen_random_uuid()`), `project_code` (text, FK), `content` (text), `created_at` (timestamptz, default `now()`)
- [x] 1.1.d Tablas `project_history` (`id` uuid PK, `project_code` text FK, `campo` text, `valor_anterior` text, `valor_nuevo` text, `changed_at` timestamptz default `now()`) y `task_history` (mismo patrón con `task_code`)
- [x] 1.1.e Verificar: insertar fila de prueba en `tasks` con `project_code` inexistente, confirmar que la FK lo rechaza

**Resultado de la verificación** (migración `001_tables` aplicada al proyecto `jaflglivhurdhccjvfac`, 12/12 aserciones en OK):
- Conteo de columnas real, leído de `information_schema`: `projects` 23 · `tasks` 11 · `notes` 4 · `project_history` 6 · `task_history` 6
- 1.1.e cumplido: `foreign_key_violation` al insertar `tasks` con `project_code` inexistente
- Extras verificados: FK autorreferente de `depends_on_task_code` rechaza códigos inexistentes · los `CHECK` rechazan `stage='Ejecucion'` sin tilde y `health='Regular'` · aceptan `Ejecución`, `Crítica`, `En revisión` y `Finalizada` · defaults `open_tasks=0`, `overdue_tasks=0`, `score_proyecto=0`, `is_overdue=false` · `NOT NULL` rechaza `engagement_type` nulo · `gen_random_uuid()` genera id en `notes` e historial
- Base dejada en 0 filas, sin funciones de prueba residuales

**Desviaciones respecto a 1.1.a, decididas con Pipe:**
- `currency` quedó **nullable** aunque 1.1.a no la marca así (ver `APRENDIZAJES.md` #6)
- Se agregaron `CHECK` a `stage`, `status`, `health`, `tasks.priority` y `tasks.status` para hacer cumplir las listas de valores que 1.1.a y 1.1.b ya declaraban, e índices en las 5 llaves foráneas (Postgres no los crea solo, y el trigger de 1.2.c consulta `tasks(project_code)` en cada escritura)

### Tarea 1.2: Trigger de recalculo de score y contadores — **Estatus: pendiente**
**Archivos:**
- Crear: `supabase/migrations/002_triggers_score.sql`

**Depende de / produce:**
- Consume: tablas de la Tarea 1.1, fórmula de `CRITERIO-PRIORIZACION.md`
- Produce: `projects.score_proyecto` siempre actualizado, `projects.open_tasks`/`overdue_tasks` siempre sincronizados

**Cómo verificar que quedó bien:**
- Editar `health` de un proyecto de prueba a "Bloqueado" sin `next_step`, confirmar que `score_proyecto` sube al valor esperado (componente health = 100) sin tocar nada desde el código

- [ ] 1.2.a Función SQL `calcular_score(project_code)` que implementa la fórmula completa
- [ ] 1.2.b Trigger `AFTER UPDATE OF health, next_step, target_date, business_value_usd ON projects` que llama a `calcular_score`
- [ ] 1.2.c Trigger `AFTER INSERT OR UPDATE OR DELETE ON tasks` que recuenta `open_tasks` (toda tarea con status distinto de `Finalizada`) y `overdue_tasks` (`is_overdue = true`), actualiza esas columnas en `projects`, y dispara el recalculo de `score_proyecto`
- [ ] 1.2.d Verificar: crear tarea con `is_overdue = true`, confirmar que `overdue_tasks` sube en 1 y `score_proyecto` se recalcula

### Tarea 1.3: Trigger de historial — **Estatus: pendiente**
**Archivos:**
- Crear: `supabase/migrations/003_triggers_history.sql`

**Depende de / produce:**
- Consume: tablas de la Tarea 1.1
- Produce: fila nueva en `project_history`/`task_history` por cada cambio de campo, excepto `score_proyecto`, `open_tasks`, `overdue_tasks` (derivados)

**Cómo verificar que quedó bien:**
- Editar `next_step`, confirmar fila en `project_history` con `campo='next_step'`; editar solo vía el trigger de score, confirmar que NO genera fila

- [ ] 1.3.a Función SQL que compara `OLD` vs `NEW` en `projects` (todas las columnas menos las 3 derivadas) e inserta una fila por cada campo que cambió
- [ ] 1.3.b Mismo patrón para `tasks` (todas las columnas) hacia `task_history`
- [ ] 1.3.c Triggers `AFTER UPDATE ON projects` y `AFTER UPDATE ON tasks`

### Tarea 1.4: RLS y usuario admin — **Estatus: pendiente**
**Archivos:**
- Crear: `supabase/migrations/004_rls.sql`
- Configuración manual: usuario en Supabase Auth (dashboard)

**Depende de / produce:**
- Consume: tablas de la Tarea 1.1
- Produce: acceso total para usuario autenticado, bloqueado para anónimo (excepto la API Route de la Tarea 7.1)

**Cómo verificar que quedó bien:**
- Sin sesión, `SELECT` a `projects` con llave `anon` debe fallar por RLS; con sesión, debe funcionar

- [ ] 1.4.a Habilitar RLS en las 5 tablas
- [ ] 1.4.b Política `authenticated` con acceso total (SELECT/INSERT/UPDATE), sin distinción de rol
- [ ] 1.4.c Usuario admin en Supabase Auth: email interno `admin@aztec.local`, contraseña `123`

---

## Nivel 2 — Seed (transformación de datos)

### Tarea 2.1: Preparar `seed-data.ts` — **Estatus: pendiente**
**Archivos:**
- Crear: `supabase/seed-data.ts`

**Depende de / produce:**
- Consume: el Excel original (hojas `Projects` y `Tasks`), esquema de la Tarea 1.1
- Produce: arrays `seedProjects` (22) y `seedTasks` (82), tipados, listos para insertar

**Cómo verificar que quedó bien:**
- `seedProjects.length === 22`, `seedTasks.length === 82`, todo `project_code` en `seedTasks` existe en `seedProjects`

- [ ] 2.1.a Exportar `Projects` y `Tasks` del Excel a JSON (paso manual de preparación, no queda en el repo)
- [ ] 2.1.b Mapear los 22 proyectos a `seedProjects`. Para `health='Bloqueado'`: `blocker_reason` = texto original de la columna `blockers`; `blocked_since` y `blocker_owner` quedan `null` (el Excel no los trae, se completan manualmente después vía CRUD)
- [ ] 2.1.c Mapear las 82 tareas a `seedTasks`, incluyendo `dependency` sin resolver todavía (se resuelve en 2.2). Nota: 6 personas distintas aparecen en `owner_alias`/`assignee_alias` del Excel (Andrea Molina, Camila Torres, Daniel Rojas, Laura Gomez, Mateo Ruiz, Santiago Vera), pero no se construye tabla `Team` (alcance futuro, Fase 4). Inconsistencia conocida: la hoja `Team` del Excel solo lista 5 de esas 6 personas (falta Andrea Molina); no bloquea el seed, se deja como anotación
- [ ] 2.1.d Calcular `business_value_usd` con `lib/currency.ts` (Tarea 3.4)
- [ ] 2.1.e **Normalizar tildes** al insertar. El Excel viene sin acentos y los `CHECK` de la Tarea 1.1 exigen la grafía correcta (verificado: rechazan `'Ejecucion'`). Mapeos: `Ejecucion`→`Ejecución`, `Critica`→`Crítica`, `En revision`→`En revisión`, `Automatizacion`→`Automatización`, `Consultoria`→`Consultoría`, `Diagnostico`→`Diagnóstico`. Los `summary` también vienen sin tildes; se corrigen porque son texto visible en la UI
- [ ] 2.1.f **Convertir tipos.** El Excel entrega todo como texto: `is_overdue` viene `'Si'`/`'No'` → `boolean` (34 `Si`, 48 `No`); `business_value`, `open_tasks` y `overdue_tasks` vienen como strings → `numeric`/`integer`
- [ ] 2.1.g **Guardar `title` corto**, sin el sufijo `" - {project_name}"` (decisión fijada; el nombre del proyecto ya vive en `projects.project_name` y se obtiene por join, repetirlo en cada tarjeta del Kanban es ruido)
- [ ] 2.1.h **No sembrar `open_tasks` ni `overdue_tasks` desde el Excel.** Son derivados y los mantiene el trigger de 1.2.c. Medido: en 6 de 22 proyectos (PRJ-03, 06, 09, 12, 15, 16) el Excel dice `overdue=1` pero el recuento real de sus tareas da `2`. Sembrar el Excel metería datos falsos que el trigger igual sobrescribiría
- [ ] 2.1.i **Columnas del Excel que se descartan**, con la razón: `last_progress` (duplicado exacto de `detail` en 82/82 filas, verificado), `recent_completed_examples` (referencia códigos `TUE-`/`GRQ-`/`ALC-` que no existen en la hoja `Tasks`, no se puede vincular a nada), y `engagement_type`/`client_alias`/`project_name` de la hoja `Tasks` (denormalizadas, se obtienen por join)
- [ ] 2.1.j `next_step` queda `null` en los 22 **a propósito**, no es un hueco: la hoja `Notas` del Excel dice que el candidato debe "proponer siguientes pasos", así que llenarlo es trabajo del usuario vía la Tarea 6.3. Consecuencia esperada: los 13 proyectos `Bloqueado` arrancan mostrando ⚠️
- [ ] 2.1.k `blocker_reason` se llena en los **17** proyectos que traen texto en `blockers`, no solo en los 13 con `health='Bloqueado'`. Cuatro proyectos `En riesgo` (PRJ-13 a PRJ-16) traen blocker; no genera efecto visual porque el banner de 5.3.c solo aparece si `health='Bloqueado'`

### Tarea 2.2: Resolver `depends_on_task_code` — **Estatus: pendiente**
**Archivos:**
- Modificar: `supabase/seed-data.ts` (función `resolverDependencias`)

**Depende de / produce:**
- Consume: `seedTasks` de la Tarea 2.1
- Produce: `seedTasks` con `depends_on_task_code` resuelto (texto de `dependency` → `task_code` real)

**Cómo verificar que quedó bien:**
- Las 61 tareas con `dependency` no vacío terminan con `depends_on_task_code` válido; las que no encuentren coincidencia exacta quedan listadas para revisión manual antes de correr el seed real

> **Corrección de la regla original** (medida contra el dataset real, ver `APRENDIZAJES.md` #7): la 2.2.a decía comparar `dependency` contra `title` tal cual. Aplicada así resuelve **0 de 61**, porque los 82 `title` del Excel traen `" - {project_name}"` pegado al final:
> `title = 'Plan next delivery iteration - Global Contract Management'` vs `dependency = 'Plan next delivery iteration'`.
> Quitando ese sufijo antes de comparar resuelve **61 de 61**, que es justo el número que exige el criterio de arriba. Los 82 títulos traen el sufijo, así que la regla corregida no tiene excepciones.

- [ ] 2.2.a Para cada tarea con `dependency` no vacío, buscar dentro del mismo `project_code` una tarea cuyo `title` **sin el sufijo `" - {project_name}"`** coincida exactamente con el texto de `dependency`
- [ ] 2.2.b Si hay coincidencia: asignar `depends_on_task_code`
- [ ] 2.2.c Si no hay coincidencia exacta: no asumir una parcial, marcar para revisión manual
- [ ] 2.2.d Verificar que ninguna tarea quede dependiendo de sí misma (medido: 0 autorreferencias en el dataset actual)

---

## Nivel 3 — Capa de datos y fundaciones de la app

### Tarea 3.1: Cliente de Supabase — **Estatus: pendiente**
**Archivos:**
- Crear: `lib/supabase/client.ts`, `lib/supabase/server.ts`

**Depende de / produce:**
- Consume: URL y llave `anon` (variables de entorno)
- Produce: `createClient()` (browser) y `createServerClient()` (servidor), usados en Niveles 4, 5, 6

**Cómo verificar que quedó bien:**
- `createServerClient().from('projects').select('*').limit(1)` devuelve una fila sin error

- [ ] 3.1.a `lib/supabase/client.ts` con `createBrowserClient` de `@supabase/ssr`
- [ ] 3.1.b `lib/supabase/server.ts` con `createServerClient`, maneja cookies de sesión

### Tarea 3.2: Tipos compartidos — **Estatus: pendiente**
**Archivos:**
- Crear: `lib/types.ts`

**Depende de / produce:**
- Consume: esquema de la Tarea 1.1
- Produce: `Project`, `Task`, `Note`, `HistoryEntry`

**Cómo verificar que quedó bien:**
- `Project` tiene exactamente las columnas de `projects` de la Tarea 1.1.a, ni una más ni una menos

- [ ] 3.2.a `type Project`
- [ ] 3.2.b `type Task` (con `status` de 5 valores)
- [ ] 3.2.c `type Note`, `type HistoryEntry`

### Tarea 3.3: Fórmula de score en JS — **Estatus: pendiente**
**Archivos:**
- Crear: `lib/scoring.ts`

**Depende de / produce:**
- Consume: fórmula de `CRITERIO-PRIORIZACION.md`
- Produce: `calcularScore(project: Project): number`, `priorityFromScore(score: number): 'Crítica'|'Alta'|'Media'|'Baja'`

**Cómo verificar que quedó bien:**
- `calcularScore()` de un proyecto de prueba coincide exactamente con el `score_proyecto` que devolvió el trigger SQL para el mismo proyecto

- [ ] 3.3.a `calcularScore` replicando la función SQL de 1.2.a
- [ ] 3.3.b `priorityFromScore` (Crítica ≥75, Alta 50-74, Media 25-49, Baja <25)

### Tarea 3.4: Tasa de cambio fija — **Estatus: pendiente**
**Archivos:**
- Crear: `lib/currency.ts`

**Depende de / produce:**
- Consume: nada
- Produce: `TASA_USD_COP`, `convertirAUSD(valor, moneda)`

**Cómo verificar que quedó bien:**
- Convertir un valor de prueba en COP y confirmar el resultado en USD

- [ ] 3.4.a `TASA_USD_COP = 3210` (tasa de referencia al 29 de julio de 2026, fuente Investing.com; documentar en comentario del archivo)
- [ ] 3.4.b `convertirAUSD`

### Tarea 3.5: Tokens de marca — **Estatus: pendiente**
**Archivos:**
- Crear: `app/globals.css`
- Modificar: `tailwind.config.ts`

**Depende de / produce:**
- Consume: `docs/brand-guide.md`
- Produce: tokens de color y tipografía para Niveles 5 y 6

**Cómo verificar que quedó bien:**
- Botón primario usa `#6EDD62`, fondo `#F9F9F7`, texto `#0D3326`, fuente Plus Jakarta Sans

- [ ] 3.5.a Variables CSS de `docs/brand-guide.md` sección 3
- [ ] 3.5.b Importar Plus Jakarta Sans vía `next/font/google`
- [ ] 3.5.c Colores de estado (rojo/ámbar/verde para Bloqueado/En riesgo/Sano) se mantienen como paleta semántica aparte, no vienen del manual de marca

---

## Nivel 4 — Server Actions

### Tarea 4.1: Seed vía botón — **Estatus: pendiente**
**Archivos:**
- Crear: `actions/seed.ts`

**Depende de / produce:**
- Consume: `seedProjects`/`seedTasks` (Tarea 2.2), `lib/supabase/server.ts` (Tarea 3.1)
- Produce: `cargarDatosEjemplo()`, invocada desde el botón del Nivel 5.2

**Cómo verificar que quedó bien:**
- Con `projects` vacía, ejecutar y confirmar 22 proyectos + 82 tareas insertadas, con score calculado por los triggers

- [ ] 4.1.a Verificar si `projects` ya tiene filas antes de insertar
- [ ] 4.1.b Insertar `seedProjects` y `seedTasks`
- [ ] 4.1.c Las filas de `project_history`/`task_history` generadas por la carga inicial son esperadas y aceptables, no requieren lógica de exclusión

### Tarea 4.2: CRUD de proyectos — **Estatus: pendiente**
**Archivos:**
- Crear: `actions/projects.ts`

**Depende de / produce:**
- Consume: `lib/types.ts`, `lib/supabase/server.ts`
- Produce: `crearProyecto(datos)`, `actualizarProyecto(project_code, cambios)`

**Cómo verificar que quedó bien:**
- `crearProyecto` de prueba nace con `health='Sano'`, `stage='Borrador'`, `status='Activo'`, y `score_proyecto` se calcula solo

- [ ] 4.2.a `crearProyecto`: recibe `project_name`, `client_alias`, `engagement_type`, `project_type_api`, `owner_alias`, `owner_role`, `start_date`, `target_date`; fija `health='Sano'`, `stage='Borrador'`, `status='Activo'`
- [ ] 4.2.b `actualizarProyecto`: recibe `project_code` y objeto parcial de cambios
- [ ] 4.2.c No debe fallar si `target_date` o `business_value` llegan `null`

### Tarea 4.3: CRUD de tareas — **Estatus: pendiente**
**Archivos:**
- Crear: `actions/tasks.ts`

**Depende de / produce:**
- Consume: `lib/types.ts`, `lib/supabase/server.ts`
- Produce: `crearTarea(datos)`, `actualizarTarea(task_code, cambios)`

**Cómo verificar que quedó bien:**
- Crear tarea con dependencia cuya tarea origen NO está en `Finalizada`: la nueva nace `Bloqueada`. Con la tarea origen en `Finalizada`: la nueva nace `Por hacer`

- [ ] 4.3.a `crearTarea`: recibe `project_code`, `title`, `detail`, `assignee_alias`, `assignee_role`, `priority`, `due_date`, `depends_on_task_code` (opcional, viene de un `<select>` con las tareas del mismo proyecto, no texto libre)
- [ ] 4.3.b Regla de nacimiento por dependencia (fijada, ver `APRENDIZAJES.md` #2): si `depends_on_task_code` viene informado y la tarea referenciada tiene `status != 'Finalizada'` → la nueva nace `status='Bloqueada'`. Si `status == 'Finalizada'` → nace `status='Por hacer'`. Sin dependencia → nace `status='Por hacer'`
- [ ] 4.3.c `actualizarTarea`

### Tarea 4.4: Crear nota — **Estatus: pendiente**
**Archivos:**
- Crear: `actions/notes.ts`

**Depende de / produce:**
- Consume: `lib/types.ts`, `lib/supabase/server.ts`
- Produce: `crearNota(project_code, content)`

**Cómo verificar que quedó bien:**
- Nota de prueba aparece con `created_at` correcto, no editable después

- [ ] 4.4.a `crearNota`

---

## Nivel 5 — UI de lectura

### Tarea 5.1: Login — **Estatus: pendiente**
**Archivos:**
- Crear: `app/login/page.tsx`

**Depende de / produce:**
- Consume: Auth (Tarea 1.4.c), `lib/supabase/client.ts`
- Produce: sesión autenticada, redirige a `/proyectos`

**Cómo verificar que quedó bien:**
- `admin`/`123` redirige al listado; credenciales incorrectas muestran error sin detalles técnicos de Supabase

- [ ] 5.1.a Formulario "Usuario"/"Contraseña" (no "correo")
- [ ] 5.1.b Mapear `admin` → `admin@aztec.local` internamente, llamar `signInWithPassword`
- [ ] 5.1.c Sin widget de chat en esta pantalla

### Tarea 5.2: Listado de proyectos — **Estatus: pendiente**
**Archivos:**
- Crear: `app/proyectos/page.tsx`, `components/projects-table.tsx`, `components/filters-form.tsx`

**Depende de / produce:**
- Consume: `lib/types.ts`, `lib/scoring.ts`, `docs/brand-guide.md`
- Produce: vista principal, entrada a la Tarea 5.3

**Cómo verificar que quedó bien:**
- Tabla ordena por `score_proyecto` descendente por default; ⚠️ solo en `health='Bloqueado'` y `next_step` vacío; filtros filtran de verdad

- [ ] 5.2.a Tabla ordenable: código (hipervínculo, azul oscuro `#173e78`, negrita), nombre (sin negrilla), tipo, cliente, responsable, fecha límite, salud/prioridad, estado
- [ ] 5.2.b Filtros: tipo de vínculo (`engagement_type`), tipo de proyecto (`project_type_api`), rol del responsable (`owner_role`), estado abierto/cerrado (`status`), fecha de apertura (`start_date`), tareas pendientes (`open_tasks`), solo con tareas vencidas (`overdue_tasks`), score mínimo, solo con bloqueos
- [ ] 5.2.c Botón "+ Crear proyecto" (abre Tarea 6.1)
- [ ] 5.2.d Botón "Cargar datos de ejemplo" (llama `actions/seed.ts`), visible solo si `projects` está vacía
- [ ] 5.2.e Toggles Lista/Estado/Tareas (Estado y Tareas quedan como placeholder, no se construyen a fondo salvo que sobre tiempo)

### Tarea 5.3: Detalle de proyecto — **Estatus: pendiente**
**Archivos:**
- Crear: `app/proyectos/[project_code]/page.tsx`, `components/project-detail/stepper.tsx`, `components/project-detail/blocked-banner.tsx`, `components/project-detail/kanban.tsx`, `components/project-detail/notes-panel.tsx`, `components/project-detail/info-modal.tsx`

**Depende de / produce:**
- Consume: `lib/types.ts`, `docs/brand-guide.md`
- Produce: vista de detalle, entrada a las tareas de escritura del Nivel 6

**Cómo verificar que quedó bien:**
- Proyecto bloqueado sin `next_step`: título muestra código→nombre→pill "⚠️ Bloqueado"; stepper resalta la etapa según `stage`; Kanban muestra 5 columnas reales (Por hacer/En progreso/En revisión/Bloqueada/Finalizada)

- [ ] 5.3.a Título: código, nombre, pill de bloqueado/no bloqueado
- [ ] 5.3.b Stepper de 4 etapas mapeado a `stage`
- [ ] 5.3.c Banner de bloqueo, visible solo si `health='Bloqueado'`
- [ ] 5.3.d Kanban con las 5 columnas reales de `status` (incluye `Finalizada`), mostrando `depends_on_task_code` en cada tarjeta cuando aplique
- [ ] 5.3.e Panel de notas, ordenadas por fecha, con filtro de fecha
- [ ] 5.3.f Modal "Info general": `engagement_type`, `project_type_api`, `client_alias`, `owner_role`, `start_date`, `target_date`, `business_value`/`currency`/`business_value_usd`, `summary`
- [ ] 5.3.g Botones fijos "Cancelar"/"Guardar"

---

## Nivel 6 — UI de escritura

### Tarea 6.1: Modal "+ Crear proyecto" — **Estatus: pendiente**
**Archivos:**
- Crear: `components/create-project-modal.tsx`

**Depende de / produce:**
- Consume: `actions/projects.ts` (Tarea 4.2)
- Produce: proyecto nuevo visible en la tabla apenas se guarda

**Cómo verificar que quedó bien:**
- Proyecto creado desde el modal aparece con `health='Sano'`, `stage='Borrador'`; el modal se cierra solo tras guardar exitosamente

- [ ] 6.1.a Formulario: nombre, cliente, tipo de vínculo, tipo de proyecto, responsable, fecha de apertura, fecha límite

### Tarea 6.2: Crear/editar tarea en el Kanban — **Estatus: pendiente**
**Archivos:**
- Modificar: `components/project-detail/kanban.tsx`

**Depende de / produce:**
- Consume: `actions/tasks.ts` (Tarea 4.3)
- Produce: tarea nueva visible en la columna correcta

**Cómo verificar que quedó bien:**
- Tarea creada con dependencia aparece en la columna correcta según la regla de 4.3.b

- [ ] 6.2.a Formulario con `<select>` de dependencia (tareas del mismo proyecto, no texto libre)

### Tarea 6.3: Editar bloqueo y siguiente paso — **Estatus: pendiente**
**Archivos:**
- Modificar: `components/project-detail/blocked-banner.tsx`

**Depende de / produce:**
- Consume: `actions/projects.ts`
- Produce: banner actualizado al guardar

**Cómo verificar que quedó bien:**
- Editar `blocked_since`/`blocker_owner`/`next_step` de un proyecto sembrado sin esos datos, confirmar que se guardan y aparece fila en `project_history`

- [ ] 6.3.a Formulario editable dentro del banner

### Tarea 6.4: Agregar nota — **Estatus: pendiente**
**Archivos:**
- Modificar: `components/project-detail/notes-panel.tsx`

**Depende de / produce:**
- Consume: `actions/notes.ts`
- Produce: nota visible al tope del panel

**Cómo verificar que quedó bien:**
- Nota de prueba aparece arriba de las demás sin recargar la página

- [ ] 6.4.a Campo de texto + botón "Agregar nota"

---

## Nivel 7 — Plus/extensiones

### Tarea 7.1: API Route de solo lectura — **Estatus: pendiente**
**Archivos:**
- Crear: `app/api/proyectos/route.ts`

**Depende de / produce:**
- Consume: `lib/supabase/server.ts`
- Produce: GET público (protegido por API key fija) para integraciones tipo n8n

**Cómo verificar que quedó bien:**
- `curl` con API key correcta devuelve JSON con los 22 proyectos; sin key, devuelve 401

- [ ] 7.1.a `GET` que devuelve todos los `projects` en JSON
- [ ] 7.1.b Validación de API key fija por header

### Tarea 7.2: Widget de chat RAG — **Estatus: pendiente**
**Archivos:**
- Crear: `components/chat-widget.tsx`, `app/api/chat/route.ts`

**Depende de / produce:**
- Consume: `lib/supabase/server.ts`, `OPENAI_API_KEY` (no se comparte con el evaluador)
- Produce: widget flotante en todas las páginas excepto `/login`

**Cómo verificar que quedó bien:**
- Con la key puesta, "¿cuáles proyectos están bloqueados?" responde correcto contra los datos reales; sin la key, muestra mensaje de configuración en vez de romper la app

- [ ] 7.2.a `route.ts`: recibe la pregunta, consulta `projects`+`tasks` completos, arma el prompt, llama a la API de OpenAI, devuelve la respuesta
- [ ] 7.2.b `chat-widget.tsx`: ícono flotante, ventana simple, oculto en `/login`
- [ ] 7.2.c Manejo del caso sin `OPENAI_API_KEY`

---

## Nivel 8 — Deploy

### Tarea 8.1: Variables de entorno y documentación — **Estatus: pendiente**
**Archivos:**
- Crear: `.env.example`, `README.md`

**Depende de / produce:**
- Consume: todas las variables de los niveles anteriores
- Produce: instrucciones para que el evaluador levante el proyecto

**Cómo verificar que quedó bien:**
- Clonar el repo en carpeta limpia, seguir solo el README, confirmar que levanta sin pasos no documentados

- [ ] 8.1.a `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` (opcional, comentado), `API_KEY_PROYECTOS`
- [ ] 8.1.b README: clonar, pegar llaves de Supabase (compartidas fuera del repo), levantar en local, criterio de priorización, aclaración de que el mockup HTML y el manual de marca guían el diseño pero no son la especificación pixel-perfect

### Tarea 8.2: Deploy a Vercel — **Estatus: pendiente**
**Archivos:** ninguno nuevo (configuración en la plataforma)

**Depende de / produce:**
- Consume: repo completo y funcional
- Produce: URL pública (opcional para el video, no exigida por el reto; el repo clonable sí lo es)

**Cómo verificar que quedó bien:**
- URL de Vercel carga en incógnito, login funciona ahí también

- [ ] 8.2.a Deploy único, sin CI/CD continuo
- [ ] 8.2.b Variables de entorno configuradas en Vercel
