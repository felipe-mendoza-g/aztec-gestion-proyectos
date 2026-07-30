# Tareas de construcción

27 tareas, organizadas en 9 niveles (Nivel 0 + Niveles 1 a 8), en el orden en que deben construirse (cada nivel depende del anterior). `implementer` y `verifier` trabajan una tarea a la vez, siguiendo `HARNESS.md`.

**Convención de estatus por tarea:** `pendiente` · `en progreso` · `con novedad` (esperando revisión de Pipe, ver `HARNESS.md`) · `hecha`. Todas empiezan en `pendiente`.

**Criterio de priorización:** ver `CRITERIO-PRIORIZACION.md` (fórmula completa, subfórmula de `health`, umbrales de `priority`). Las tareas 1.2 y 3.3 lo implementan, ninguna repite la fórmula acá.

---

## Nivel 0 — Scaffold del proyecto

### Tarea 0.1: Crear la app Next.js y el repo — **Estatus: hecha**
**Archivos:**
- Crear: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`, `.env.local` (no se commitea)
- **No** se crea `tailwind.config.ts`: Tailwind v4 configura por CSS (`@theme` en `app/globals.css`), no por archivo JS. Afectaba a la Tarea 3.5, que decía "Modificar: `tailwind.config.ts`" — **resuelto con Pipe** al cerrar la Tarea 1.4: la 3.5 quedó reescrita sobre `app/globals.css` y el archivo JS no se crea

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

### Tarea 1.2: Trigger de recalculo de score y contadores — **Estatus: hecha**
**Archivos:**
- Crear: `supabase/migrations/002_triggers_score.sql`

**Depende de / produce:**
- Consume: tablas de la Tarea 1.1, fórmula de `CRITERIO-PRIORIZACION.md`
- Produce: `projects.score_proyecto` siempre actualizado, `projects.open_tasks`/`overdue_tasks` siempre sincronizados

**Cómo verificar que quedó bien:**
- Editar `health` de un proyecto de prueba a "Bloqueado" sin `next_step`, confirmar que `score_proyecto` sube al valor esperado (componente health = 100) sin tocar nada desde el código

- [x] 1.2.a Función SQL `calcular_score(project_code)` que implementa la fórmula completa. Es una función **pura**: devuelve el score, no escribe; los triggers de abajo guardan el resultado. Las tres subfórmulas que faltaban (`score_tareas`, `score_fecha_limite`, `score_business_value`) se fijaron acá y quedaron escritas en `CRITERIO-PRIORIZACION.md`, junto con el cambio del umbral de Crítica de ≥75 a ≥85
- [x] 1.2.b Trigger `AFTER INSERT OR UPDATE OF health, next_step, target_date, business_value_usd ON projects` que llama a `calcular_score`. **`INSERT` se agregó** respecto a la versión original de esta tarea, que solo decía `UPDATE` (ver la desviación de abajo y `APRENDIZAJES.md` #10)
- [x] 1.2.c Trigger `AFTER INSERT OR UPDATE OR DELETE ON tasks` que recuenta `open_tasks` (toda tarea con status distinto de `Finalizada`) y `overdue_tasks` (`is_overdue = true`), actualiza esas columnas en `projects`, y dispara el recalculo de `score_proyecto`
- [x] 1.2.d Verificar: crear tarea con `is_overdue = true`, confirmar que `overdue_tasks` sube en 1 y `score_proyecto` se recalcula

**Resultado de la verificación** (migración `002_triggers_score` aplicada al proyecto `jaflglivhurdhccjvfac`):

Los 5 pasos sobre un proyecto de prueba dieron OK contra el valor calculado a mano:

| # | Paso | abiertas | vencidas | score | esperado |
|---|---|---|---|---|---|
| 1 | `INSERT` Sano, 0 tareas → health=25 | 0 | 0 | 8.13 | 8.13 |
| 2 | `UPDATE health='Bloqueado'` sin `next_step` → health=100 (**criterio de la tarea**) | 0 | 0 | 32.50 | 32.50 |
| 3 | `INSERT` tarea vencida + Crítica + sin dependencia (**1.2.d**) | 1 | 1 | 50.38 | 50.38 |
| 4 | `UPDATE next_step` lleno → health baja a 70 | 1 | 1 | 40.63 | 40.63 |
| 5 | `DELETE` de la tarea → contadores a 0 | 0 | 0 | 22.75 | 22.75 |

Además se cargaron los 22 proyectos y 82 tareas reales del Excel de forma temporal (no es el seed de la Tarea 2.1) para medir la fórmula completa contra datos de verdad. Los triggers dieron **exactamente** la distribución esperada: **4 Crítica (PRJ-04 91,50 · PRJ-22 89,68 · PRJ-08 89,08 · PRJ-09 85,15), 10 Alta, 7 Media, 1 Baja (PRJ-20 24,09)**, idéntica proyecto por proyecto a la simulación independiente corrida en Python antes de escribir el SQL. Verificado también:
- El trigger de `INSERT` puso score a los 22 proyectos **antes de que existiera una sola tarea** (rango 19,21–62,33). Con la definición literal de 1.2.b los 22 habrían quedado en 0
- Los contadores quedaron sincronizados en los 22, incluido PRJ-21 con 0 tareas. En PRJ-03, 06, 09, 12, 15 y 16 el trigger contó `overdue_tasks = 2` donde el Excel decía `1`, que es justo el desfase medido en 2.1.h
- El `DELETE` y el `UPDATE` que mueve una tarea de proyecto sincronizan también el proyecto que la pierde
- No hay recursión entre los dos triggers: el de `projects` escribe solo `score_proyecto`, y el de `tasks` escribe solo `open_tasks`/`overdue_tasks`/`score_proyecto` — ninguna está en la lista de `UPDATE OF` del otro
- Base dejada en 0 filas en las 5 tablas, sin datos de prueba residuales

**Desviaciones respecto a lo que decía la tarea, decididas con Pipe:**
- 1.2.b incluye `INSERT`, no solo `UPDATE`. Sin eso un proyecto nace en `score_proyecto = 0` (el default de 1.1.a) hasta que alguien lo edite, y eso rompe el criterio de la 2.3 ("con score calculado por los triggers") y el de la 4.2 ("`score_proyecto` se calcula solo"). El trigger de tareas tapaba el hueco solo en los proyectos que ya tienen tareas — PRJ-21 tiene 0
- Las cuatro funciones llevan `set search_path = public, pg_temp`. Sin eso el linter de Supabase las marca (`function_search_path_mutable`) en la revisión de la Tarea 1.4
- `overdue_tasks` cuenta `is_overdue = true` tal cual lo pide 1.2.c, sin excluir `Finalizada`: una tarea que se cierra debería salir de vencida bajando su propio `is_overdue`, no quedar filtrada en el contador

### Tarea 1.3: Trigger de historial — **Estatus: hecha**
**Archivos:**
- Crear: `supabase/migrations/003_triggers_history.sql`

**Depende de / produce:**
- Consume: tablas de la Tarea 1.1
- Produce: fila nueva en `project_history`/`task_history` por cada cambio de campo, excepto `score_proyecto`, `open_tasks`, `overdue_tasks` (derivados)

**Cómo verificar que quedó bien:**
- Editar `next_step`, confirmar fila en `project_history` con `campo='next_step'`; editar solo vía el trigger de score, confirmar que NO genera fila

- [x] 1.3.a Función SQL que compara `OLD` vs `NEW` en `projects` (todas las columnas menos las 3 derivadas) e inserta una fila por cada campo que cambió. Compara `to_jsonb(old)` vs `to_jsonb(new)` en vez de listar las 20 columnas: no queda una segunda lista que mantener sincronizada con la 1.1.a
- [x] 1.3.b Mismo patrón para `tasks` (todas las columnas) hacia `task_history`
- [x] 1.3.c Triggers `AFTER UPDATE ON projects` y `AFTER UPDATE ON tasks`
- [x] 1.3.d Verificar: los dos lados del criterio de arriba, más el `UPDATE` no-op y el vaciado a `NULL`

**Resultado de la verificación** (migración `003_triggers_history` aplicada al proyecto `jaflglivhurdhccjvfac`):

Los 5 pasos sobre dos proyectos y dos tareas de prueba dieron OK:

| # | Paso | `project_history` | `task_history` |
|---|---|---|---|
| 1 | `INSERT` de proyecto + `INSERT` de tarea (score pasó a 19,40) | 0 | 0 |
| 2 | `UPDATE next_step` (**criterio de la tarea**) | +1, `campo='next_step'` | 0 |
| 3 | `UPDATE` de la tarea a vencida/Crítica/Bloqueada → el trigger de 002 reescribe `overdue_tasks` y `score_proyecto` (19,40 → 30,77) (**criterio de la tarea, segunda mitad**) | **+0** | +3 |
| 4 | `UPDATE` de 7 columnas de golpe, más un `UPDATE` que reasigna los mismos valores | +7 y el no-op **+0** | 0 |
| 5 | `UPDATE` de 4 columnas de la tarea, incluida `project_code` (la mueve de proyecto) | 0 | +4 |

Verificado además:
- **Ninguna fila con `campo` en `score_proyecto`/`open_tasks`/`overdue_tasks`** en toda la tabla, aunque esas 3 columnas se reescribieron en los pasos 1, 3 y 5. Los contadores y el score quedaron correctos en los dos proyectos
- Un `UPDATE` que asigna los valores que ya estaban genera 0 filas (paso 4): se comparan valores, no la lista de columnas del `SET`
- Vaciar una columna deja `valor_nuevo` en `NULL` de verdad, no en la cadena `'null'` — verificado con `summary` (projects) y `detail` (tasks)
- Los tipos no-texto quedan legibles: `date` → `'2026-09-30'`, `boolean` → `'false'`/`'true'`, `numeric` → `'30000000'`. Las tildes se conservan (`'Ejecución'` → `'Cierre'`, `'Alta'` → `'Crítica'`)
- El linter de Supabase no marca las dos funciones nuevas (llevan `set search_path` como las de 002); los únicos avisos abiertos son los 5 de `rls_disabled_in_public`, que resuelve la Tarea 1.4
- Base dejada en 0 filas en las 5 tablas

**Nota sobre 4.1.c:** con triggers de solo `UPDATE`, la carga inicial de la Tarea 4.1 no genera **ninguna** fila de historial (los `INSERT` no se registran, y los `UPDATE` que dispara el trigger de score solo tocan columnas derivadas). 4.1.c dice que esas filas serían "esperadas y aceptables" — se cumple de sobra, no hay nada que excluir.

### Tarea 1.4: RLS y usuario admin — **Estatus: hecha**
**Archivos:**
- Crear: `supabase/migrations/004_rls.sql`
- Configuración manual: usuario en Supabase Auth (dashboard) — **no fue posible por el dashboard**, ver desviaciones

**Depende de / produce:**
- Consume: tablas de la Tarea 1.1
- Produce: acceso total para usuario autenticado, bloqueado para anónimo (excepto la API Route de la Tarea 7.1)

**Cómo verificar que quedó bien:**
- Sin sesión, `SELECT` a `projects` con llave `anon` debe fallar por RLS; con sesión, debe funcionar

- [x] 1.4.a Habilitar RLS en las 5 tablas
- [x] 1.4.b Política `authenticated` con acceso total (SELECT/INSERT/UPDATE), sin distinción de rol. Una política por comando (15 en total) en vez de `for all`: `for all` incluiría DELETE, que 1.4.b no enumera
- [x] 1.4.c Usuario admin en Supabase Auth: email interno `admin@aztec.local`, contraseña `123`

**Resultado de la verificación** (migración `004_rls` aplicada al proyecto `jaflglivhurdhccjvfac`, probada contra la API HTTP real, no solo por SQL):

Estado de las 5 tablas: `relrowsecurity = true` y 3 políticas (SELECT/INSERT/UPDATE) para `authenticated` en cada una.

| # | Prueba | Resultado |
|---|---|---|
| A | `anon` → `GET /rest/v1/projects` con una fila sembrada (**criterio de la tarea**) | `200 []` — RLS no le deja ver la fila |
| B | `anon` → `POST /rest/v1/projects` | `401`, `42501 new row violates row-level security policy` |
| C | Login `admin@aztec.local` / `123` en `/auth/v1/token` | `200`, token con `role=authenticated` |
| D | Sesión → `GET /rest/v1/projects` (**criterio de la tarea, segunda mitad**) | `200` con `PRJ-RLS-TEST`, `score_proyecto = 8.13` |
| E | Sesión → `POST /rest/v1/notes` | `201` |
| F | Sesión → `PATCH` de `next_step` | `204`, +1 fila en `project_history`, score recalculado 8,13 → 3,25 |
| G | Sesión → `DELETE /rest/v1/projects` | `204` pero **no borra**: la fila sigue ahí (no hay política de DELETE) |
| H | Login con contraseña incorrecta | `400` |
| I | `anon` → `SELECT` a las 5 tablas | `200 []` en las cinco |

Verificado además:
- Los triggers de 002 y 003 siguen funcionando **a través de RLS**: la fila de `project_history` de la prueba F la insertó el trigger dentro de un `PATCH` hecho por `authenticated`, no por `service_role`. Por eso las dos tablas de historial necesitan política de `INSERT` y no solo de `SELECT`
- El linter de Supabase ya no reporta los 5 `rls_disabled_in_public`. Quedan 10 avisos `rls_policy_always_true` (UPDATE/INSERT con `using (true)`) y 1 `auth_leaked_password_protection`: los 11 son consecuencia directa de lo que piden 1.4.b (acceso total sin distinción de rol) y 5.1 (contraseña `123`, que HaveIBeenPwned rechazaría), no hallazgos nuevos
- El usuario se borró y se volvió a crear corriendo el bloque tal cual quedó en el `.sql`, y el login siguió dando `200`: el archivo reproduce el usuario desde cero
- Base dejada en 0 filas en las 5 tablas

**Desviaciones respecto a lo que decía la tarea, decididas con Pipe:**
- **El usuario no se crea por el dashboard, se crea en `004_rls.sql`.** El dashboard y la API de Auth rechazan la contraseña `123` con HTTP 422 `weak_password: Password should be at least 6 characters` (medido contra `/auth/v1/signup` de este proyecto). La contraseña la fija la Tarea 5.1, así que el usuario se inserta por SQL, que no pasa por esa validación. Efecto lateral bueno: queda reproducible en el repo en vez de ser un paso manual no versionado
- El `INSERT` a `auth.users` llena `confirmation_token`, `recovery_token`, `email_change_token_new` y `email_change` con cadena vacía. Son nullable en el esquema, pero con `NULL` el login devuelve HTTP 500 `Database error querying schema` (ver `APRENDIZAJES.md` #12)
- **DELETE queda fuera de las políticas a propósito**: 1.4.b enumera SELECT/INSERT/UPDATE, y ninguna Server Action del Nivel 4 borra filas. Si el Nivel 6 llega a necesitarlo, se agrega una política nueva

**Consecuencia para la Tarea 7.1, decidida con Pipe:** la API Route de 7.1 se llama por `curl` sin sesión, así que llega como `anon` y con este RLS leería **0 filas**. **Decisión: esa ruta usa la llave `service_role`** (que salta RLS) detrás de su propia validación de `API_KEY_PROYECTOS`. No se abre `projects` a `anon`: la llave `anon` viaja en el bundle del navegador, así que una política de lectura anónima dejaría los 22 proyectos visibles sin login. Efecto: quinta variable de entorno, `SUPABASE_SERVICE_ROLE_KEY`, agregada a 7.1 y 8.1.a.

---

## Nivel 2 — Seed (transformación de datos)

> **Nota de orden de construcción:** las Tareas 3.2 (`lib/types.ts`) y 3.4 (`lib/currency.ts`) se construyeron **antes** que este nivel, no en el Nivel 3. Motivo: la 2.1.d dice literalmente "calcular `business_value_usd` con `lib/currency.ts`", y la 2.1 tiene que producir arrays "tipados". Construirlas después habría significado repetir la tasa de cambio y las 23 columnas de `projects` en dos archivos. Es el mismo patrón de `APRENDIZAJES.md` #4: si una tarea consume X, alguna tarea anterior tiene que crear X.

### Tarea 2.1: Preparar `seed-data.ts` — **Estatus: hecha**
**Archivos:**
- Crear: `supabase/seed-data.ts`

**Depende de / produce:**
- Consume: el Excel original (hojas `Projects` y `Tasks`), esquema de la Tarea 1.1
- Produce: arrays `seedProjects` (22) y `seedTasks` (82), tipados, listos para insertar

**Cómo verificar que quedó bien:**
- `seedProjects.length === 22`, `seedTasks.length === 82`, todo `project_code` en `seedTasks` existe en `seedProjects`

- [x] 2.1.a Exportar `Projects` y `Tasks` del Excel a JSON (paso manual de preparación, no queda en el repo). Hecho con un script de stdlib de Python (`zipfile` + `ElementTree`) que lee el `.xlsx` sin instalar dependencias nuevas
- [x] 2.1.b Mapear los 22 proyectos a `seedProjects`. Para `health='Bloqueado'`: `blocker_reason` = texto original de la columna `blockers`; `blocked_since` y `blocker_owner` quedan `null` (el Excel no los trae, se completan manualmente después vía CRUD)
- [x] 2.1.c Mapear las 82 tareas a `seedTasks`, incluyendo `dependency` sin resolver todavía (se resuelve en 2.2). Nota: 6 personas distintas aparecen en `owner_alias`/`assignee_alias` del Excel (Andrea Molina, Camila Torres, Daniel Rojas, Laura Gomez, Mateo Ruiz, Santiago Vera), pero no se construye tabla `Team` (alcance futuro, Fase 4). Inconsistencia conocida: la hoja `Team` del Excel solo lista 5 de esas 6 personas (falta Andrea Molina); no bloquea el seed, se deja como anotación
- [x] 2.1.d Calcular `business_value_usd` con `lib/currency.ts` (Tarea 3.4). Se calcula **al cargar el módulo**, con `.map()` sobre los datos base, no con 22 números escritos a mano: si cambia `TASA_USD_COP`, cambian los 22
- [x] 2.1.e **Normalizar tildes** al insertar. El Excel viene sin acentos y los `CHECK` de la Tarea 1.1 exigen la grafía correcta (verificado: rechazan `'Ejecucion'`). Mapeos: `Ejecucion`→`Ejecución`, `Critica`→`Crítica`, `En revision`→`En revisión`, `Automatizacion`→`Automatización`, `Consultoria`→`Consultoría`, `Diagnostico`→`Diagnóstico`. Los `summary` también vienen sin tildes; se corrigen porque son texto visible en la UI
- [x] 2.1.f **Convertir tipos.** El Excel entrega todo como texto: `is_overdue` viene `'Si'`/`'No'` → `boolean` (34 `Si`, 48 `No`); `business_value`, `open_tasks` y `overdue_tasks` vienen como strings → `numeric`/`integer`
- [x] 2.1.g **Guardar `title` corto**, sin el sufijo `" - {project_name}"` (decisión fijada; el nombre del proyecto ya vive en `projects.project_name` y se obtiene por join, repetirlo en cada tarjeta del Kanban es ruido)
- [x] 2.1.h **No sembrar `open_tasks` ni `overdue_tasks` desde el Excel.** Son derivados y los mantiene el trigger de 1.2.c. Medido: en 6 de 22 proyectos (PRJ-03, 06, 09, 12, 15, 16) el Excel dice `overdue=1` pero el recuento real de sus tareas da `2`. Sembrar el Excel metería datos falsos que el trigger igual sobrescribiría
- [x] 2.1.i **Columnas del Excel que se descartan**, con la razón: `last_progress` (duplicado exacto de `detail` en 82/82 filas, verificado), `recent_completed_examples` (referencia códigos `TUE-`/`GRQ-`/`ALC-` que no existen en la hoja `Tasks`, no se puede vincular a nada), y `engagement_type`/`client_alias`/`project_name` de la hoja `Tasks` (denormalizadas, se obtienen por join)
- [x] 2.1.j `next_step` queda `null` en los 22 **a propósito**, no es un hueco: la hoja `Notas` del Excel dice que el candidato debe "proponer siguientes pasos", así que llenarlo es trabajo del usuario vía la Tarea 6.3. Consecuencia esperada: los 13 proyectos `Bloqueado` arrancan mostrando ⚠️
- [x] 2.1.k `blocker_reason` se llena en los **17** proyectos que traen texto en `blockers`, no solo en los 13 con `health='Bloqueado'`. Cuatro proyectos `En riesgo` (PRJ-13 a PRJ-16) traen blocker; no genera efecto visual porque el banner de 5.3.c solo aparece si `health='Bloqueado'`

**Resultado de la verificación** (`npx tsc --noEmit` en 0, más 24 aserciones corridas sobre el módulo ya compilado, todas en OK):

| Criterio | Resultado |
|---|---|
| `seedProjects.length === 22` · `seedTasks.length === 82` (**criterio de la tarea**) | 22 · 82 |
| Todo `project_code` de `seedTasks` existe en `seedProjects` (**criterio de la tarea**) | 0 huérfanas, 22 códigos únicos, 82 `task_code` únicos |
| 2.1.d USD | los 20 proyectos en USD quedan con `business_value_usd === business_value` |
| 2.1.d COP | PRJ-18 85.000.000 → 26.479,75 USD · PRJ-20 120.000.000 → 37.383,18 USD |
| 2.1.d sin monto | PRJ-07 no trae `business_value` → `business_value_usd` en `null`, no en 0 |
| 2.1.e | 0 enumerados sin tilde y 0 `summary` sin tilde. **12 de 22 `summary` fueron corregidos** (`Gestion`→`Gestión`, `via`→`vía`, `clausulas`→`cláusulas`, …) |
| 2.1.f | `is_overdue` booleano en las 82, 34 `true` / 48 `false`, montos numéricos |
| 2.1.g | 0 de 82 títulos arrastran el sufijo (los 82 lo traían) |
| 2.1.h | `SeedProject` tiene 20 columnas: las 23 de `projects` menos las 3 derivadas |
| 2.1.j / 2.1.k | `next_step` null en los 22 · `blocker_reason` en 17 · 13 proyectos `Bloqueado` |
| `NOT NULL` de 001 | ninguna fila deja vacía una columna obligatoria de `projects` ni de `tasks` |

El tipado no es decorativo: `stage`, `status`, `health` y `priority` son uniones de literales en `lib/types.ts`, así que un `'Ejecucion'` sin tilde **no compila**. El `tsc` en 0 es evidencia de 2.1.e, no solo de sintaxis.

### Tarea 2.2: Resolver `depends_on_task_code` — **Estatus: hecha**
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

- [x] 2.2.a Para cada tarea con `dependency` no vacío, buscar dentro del mismo `project_code` una tarea cuyo `title` **sin el sufijo `" - {project_name}"`** coincida exactamente con el texto de `dependency`
- [x] 2.2.b Si hay coincidencia: asignar `depends_on_task_code`
- [x] 2.2.c Si no hay coincidencia exacta: no asumir una parcial, marcar para revisión manual. Salen por `dependenciasPendientes`, con el motivo (`sin coincidencia` / `coincidencia ambigua` / `se apunta a sí misma`). Hoy el array está vacío
- [x] 2.2.d Verificar que ninguna tarea quede dependiendo de sí misma (medido: 0 autorreferencias en el dataset actual). La función además descarta la autorreferencia por construcción, no solo la mide

**Resultado de la verificación** (9 aserciones en OK, sobre el módulo compilado):

| Criterio | Resultado |
|---|---|
| Las 61 tareas con `dependency` terminan con `depends_on_task_code` válido (**criterio de la tarea**) | **61 de 61** |
| Ninguna queda para revisión manual (**criterio de la tarea**) | `dependenciasPendientes` vacío |
| Todo `depends_on_task_code` existe como `task_code` | 61/61 — la FK autorreferente de 1.1.b no va a rechazar ninguna |
| La tarea apuntada es del mismo proyecto y su `title` es igual al texto de `dependency` | 61/61 |
| 2.2.d ninguna depende de sí misma | 0 |
| `resolverDependencias` no muta su entrada y es idempotente | OK — se le pasaron las 82 con `depends_on_task_code` en null y volvió a resolver 61 |

**Hallazgo, no cubierto por el criterio de la tarea:** hay un **ciclo de dependencia** en el dataset. `PRJ-04-T02` ("Resolve priority issue in pilot or production") depende de `PRJ-04-T03` ("Align external dependency with client or vendor") y `PRJ-04-T03` depende de `PRJ-04-T02`. Viene así del Excel; la regla de 2.2.a lo resuelve correctamente en los dos sentidos. Consecuencias:

1. **Afecta a la Tarea 4.1** (ver la nota agregada allá): la FK autorreferente se valida fila por fila, y 9 de las 61 tareas aparecen en el array antes que la tarea de la que dependen. Con un ciclo, además, **ningún orden de inserción funciona** — hay que insertar en dos pasadas
2. **Es un cuello de botella real**, del tipo que el reto pide detectar: con la regla de 4.3.b esas dos tareas se bloquean mutuamente para siempre. Se deja tal cual, no se "arregla" el dato: PRJ-04 es además el proyecto con el score más alto del portafolio (91,50, medido en la Tarea 1.2), así que el sistema lo va a mostrar arriba de todo, que es exactamente lo que debería pasar

---

## Nivel 3 — Capa de datos y fundaciones de la app

### Tarea 3.1: Cliente de Supabase — **Estatus: hecha**
**Archivos:**
- Crear: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `proxy.ts` (raíz — ver 3.1.c)

**Depende de / produce:**
- Consume: URL y llave `anon` (variables de entorno)
- Produce: `createClient()` (browser) y `createServerClient()` (servidor), usados en Niveles 4, 5, 6

**Cómo verificar que quedó bien:**
- `createServerClient().from('projects').select('*').limit(1)` devuelve una fila sin error

- [x] 3.1.a `lib/supabase/client.ts` con `createBrowserClient` de `@supabase/ssr`
- [x] 3.1.b `lib/supabase/server.ts` con `createServerClient`, maneja cookies de sesión
- [x] 3.1.c **`proxy.ts` en la raíz: refresco del token de sesión.** Punto agregado a esta tarea, no estaba en la versión original — **decidido con Pipe**. Un Server Component no puede escribir cookies, así que cuando el token de acceso vence (1 hora por defecto) el token renovado se pierde y el usuario aparece deslogueado aunque su refresh token siga vigente. El único lugar del ciclo de vida donde ese refresco persiste es esta capa. Se llama `proxy.ts` y no `middleware.ts` porque Next 16 deprecó esa convención (ver `APRENDIZAJES.md` #17). **No redirige a `/login`**: eso rompería la ruta de la Tarea 7.1, que se llama por `curl` sin sesión

**Resultado de la verificación** (`npx tsc --noEmit` y `npm run build` en 0, más 6 pruebas de ejecución contra el proyecto `jaflglivhurdhccjvfac` con una fila real sembrada, `PRJ-31-TEST`, score 8,13 puesto por el trigger de 1.2):

Las pruebas del servidor corrieron dentro de un request real de Next (`next dev` + `curl` con tarro de cookies), no en un script suelto: `cookies()` de `next/headers` solo existe dentro de un request, así que probarlo por fuera no habría demostrado nada.

| # | Prueba | Resultado |
|---|---|---|
| A | Servidor, `GET` sin sesión → `select('*').limit(1)` | `rol=anon`, **0 filas**, `error: null` — el RLS de 1.4 filtra en silencio |
| B | Servidor, `signInWithPassword('admin@aztec.local','123')` | `200`, `rol=authenticated`; `setAll` escribió la cookie `sb-jaflglivhurdhccjvfac-auth-token` |
| C | Servidor, `GET` mandando esa cookie (**criterio de la tarea**) | `rol=authenticated`, **1 fila**, `error: null` — `PRJ-31-TEST` completo |
| D | Navegador, `createClient()` + login + `select` | 1 fila, `error: null`; la sesión quedó en `document.cookie`, misma llave que en B |
| E | Navegador, `createClient() === createClient()` | `true` — no abre una segunda instancia ni una sesión paralela |
| F | Navegador, `signOut()` y volver a leer | 0 filas, `error: null` |

**Verificación de 3.1.c** (`proxy.ts`), con el token vencido a mano en vez de esperar una hora: `@supabase/ssr` guarda la sesión en la cookie como JSON con un campo `expires_at`, y el cliente decide si venció leyéndolo **localmente** antes de llamar a la red. Poniéndolo en el pasado con el refresh token real intacto, se recorre el mismo camino de código que a la hora. Se corrió dos veces, sin y con `proxy.ts`:

| Prueba | Sin `proxy.ts` (control) | Con `proxy.ts` |
|---|---|---|
| `GET /` (Server Component) con token vencido → ¿`Set-Cookie`? | **NO** — el token refrescado se pierde, la cookie se queda vencida | **SÍ** — token rotado, `expires_at` vigente |
| `GET` a un Route Handler con token vencido | `authenticated`, 1 fila | `authenticated`, 1 fila |
| `GET` sin cookies (escenario `curl` de la Tarea 7.1) | `200`, `rol=anon`, no redirige | `200`, `rol=anon`, no redirige |

Notas de esa medición:
- **El control reproduce el bug en este repo**, no solo en la documentación: sin `proxy.ts` el `Set-Cookie` simplemente no aparece
- **El bug afecta páginas, no Route Handlers.** Un Route Handler *sí* puede escribir cookies, así que el `setAll` de `server.ts` funciona ahí y el refresco persiste igual. Lo que se rompía era la navegación normal por la UI de los Niveles 5 y 6, que es justo lo que se ve en el video
- La ruta de la 7.1 no se rompe: sin cookies `getUser()` corta sin llamar a la red y el request pasa intacto, con `200` y sin redirección
- `npm run build` lista `ƒ Proxy (Middleware)`, y el log de un arranque limpio no trae ningún aviso de deprecación
- Costo medido: ~130 ms en el primer request de una sesión (la llamada de `getUser()` a Auth), ~3 ms en los siguientes

Verificado además:
- **Los dos clientes comparten la sesión**: el navegador y el servidor escriben y leen la misma cookie `sb-<ref>-auth-token`. Es lo que hace que el login de la Tarea 5.1 (cliente) habilite las lecturas de los Server Components del Nivel 5 (servidor). Si el token viviera en `localStorage`, el servidor llegaría siempre como `anon`
- La fila que devuelve PostgREST trae **las 23 columnas de 1.1.a, en el mismo orden**, y `score_proyecto` llega como `number` (8.13), no como string: coincide con el tipo `Project` de la Tarea 3.2 sin conversiones intermedias
- La prueba D se corrió con `document.cookie` simulado para que `createBrowserClient` tomara su camino de navegador y no el fallback de servidor. Es lo más cerca que se llega sin navegador real; el camino de verdad lo ejercita la Tarea 5.1
- Los archivos temporales de verificación (route handler y script) se borraron: `npm run build` posterior solo lista `/` y `/_not-found`. Base dejada en 0 filas en las 5 tablas

**Desviaciones respecto a lo que decía la tarea:**
- **`createServerClient()` es asíncrona**: hay que usarla como `const supabase = await createServerClient()`. El criterio de arriba la escribe encadenada y sin `await`, pero en Next 16 `cookies()` de `next/headers` devuelve una promesa. Aplica a todo el consumo en los Niveles 4, 5, 6 y 7
- **La fila del criterio solo aparece con sesión.** Sin sesión el cliente llega como `anon` y el RLS de la Tarea 1.4 devuelve `[]` **sin error** (prueba A), que es exactamente lo que 1.4 dejó verificado. El criterio se cumple en la prueba C, con sesión
- **`server.ts` no exporta un cliente `service_role`**, aunque la Tarea 7.1 declaraba consumirlo desde acá. **Resuelto con Pipe:** la 7.1 arma su propio cliente adentro de su ruta, después de validar `API_KEY_PROYECTOS`, y el "Consume" de la 7.1 quedó corregido para que no siga diciendo lo contrario. Motivo: si `server.ts` exportara `createServiceClient()`, ese archivo queda importable desde cualquier Server Component y el día que alguien lo traiga por autocompletado se salta el RLS sin aviso — justo lo que la decisión de la 1.4 quería evitar. Cuesta unas líneas más si en el futuro aparecen más rutas admin, pero para el alcance del reto el riesgo de fuga pesa más
- **Se agregó `proxy.ts`** (punto 3.1.c), que no estaba en la versión original de la tarea. Ver 3.1.c y su verificación arriba
- **`proxy.ts` no protege rutas.** Un visitante sin sesión que entre directo a `/proyectos` no es redirigido: va a ver la tabla vacía, porque el RLS le devuelve 0 filas. Queda **abierto para el Nivel 5**, que es donde vive la decisión de qué hacer en ese caso (redirigir a `/login`, o mostrar un estado vacío que explique que hay que entrar). No se resolvió acá porque la redirección en esta capa rompería la ruta de la 7.1

### Tarea 3.2: Tipos compartidos — **Estatus: hecha** (construida antes del Nivel 2, ver la nota de orden al inicio del Nivel 2)
**Archivos:**
- Crear: `lib/types.ts`

**Depende de / produce:**
- Consume: esquema de la Tarea 1.1
- Produce: `Project`, `Task`, `Note`, `HistoryEntry`

**Cómo verificar que quedó bien:**
- `Project` tiene exactamente las columnas de `projects` de la Tarea 1.1.a, ni una más ni una menos

- [x] 3.2.a `type Project`
- [x] 3.2.b `type Task` (con `status` de 5 valores)
- [x] 3.2.c `type Note`, `type HistoryEntry`

**Resultado de la verificación:** `Project` tiene las 23 columnas de 1.1.a en el mismo orden de `001_tables.sql`, ni una más ni una menos; `Task` las 11; `Note` las 4. `npx tsc --noEmit` en 0 con `strict: true`.

**Decisiones tomadas al construirlo:**
- Los valores de `stage`, `status`, `health`, `priority` y `tasks.status` son **uniones de literales**, no `string`. Así el compilador hace cumplir los mismos `CHECK` del esquema: el seed de la 2.1 no compilaría con un `'Ejecucion'` sin tilde. Es la mitad de la evidencia de 2.1.e
- Columna nullable → `| null`, no `?`. La fila siempre trae la llave con valor `null`; `?` significaría que la propiedad puede no venir, que es otra cosa
- `HistoryEntry` es **un** tipo para las dos tablas de historial (mismas 6 columnas, cambia la de referencia), con `project_code` y `task_code` opcionales. La UI las lee igual: campo, antes, después, cuándo
- `date` y `timestamptz` se tipan como `string`: es lo que entrega PostgREST, convertir a `Date` sería una decisión de la capa de UI

### Tarea 3.3: Fórmula de score en JS — **Estatus: hecha**
**Archivos:**
- Crear: `lib/scoring.ts`

**Depende de / produce:**
- Consume: fórmula de `CRITERIO-PRIORIZACION.md`
- Produce: `calcularScore(project: Project, tasks: Task[], hoy?: string): number`, `priorityFromScore(score: number): 'Crítica'|'Alta'|'Media'|'Baja'`

**Cómo verificar que quedó bien:**
- `calcularScore()` de un proyecto de prueba coincide exactamente con el `score_proyecto` que devolvió el trigger SQL para el mismo proyecto

- [x] 3.3.a `calcularScore` replicando la función SQL de 1.2.a, redondeada a 2 decimales igual que ella (sin el redondeo, la comparación JS vs `numeric` de Postgres del criterio de arriba depende del último bit del flotante)
- [x] 3.3.b `priorityFromScore` (Crítica ≥85, Alta 50-84, Media 25-49, Baja <25 — umbral de Crítica movido de 75 a 85 al construir la Tarea 1.2, ver `CRITERIO-PRIORIZACION.md`)

**Resultado de la verificación** (**criterio de la tarea**: coincidir con el `score_proyecto` del trigger). Se sembraron los 22 proyectos y las 82 tareas, se dejó que los triggers de la 1.2 escribieran `score_proyecto`, y se comparó contra `calcularScore` para los 22 — no para "un proyecto de prueba":

| Vuelta | Qué se comparó | Resultado |
|---|---|---|
| 1 — dataset tal cual | 22 proyectos con los datos del seed | **22 de 22 idénticos** (PRJ-04 91.5 · PRJ-22 89.68 · PRJ-20 24.09) |
| 2 — ramas que el seed no toca | mismos 22, después de 10 mutaciones de proyecto y 3 de tarea | **22 de 22 idénticos** |

La vuelta 2 existe porque el seed deja los 22 `next_step` en null (2.1.j) y ninguna de sus fechas es futura: sin mutar, la mitad de la fórmula nunca se ejecuta. Se cubrió: `next_step` lleno (PRJ-01, 67.35 → 57.6), `next_step` de puros espacios (PRJ-02, sin cambio — cuenta como vacío), sin `target_date` (PRJ-03), fecha futura dentro y fuera de la ventana de 90 días (PRJ-05, PRJ-06), `health` Sano y En riesgo (PRJ-08, PRJ-09), `business_value` sobre el tope de 50.000 (PRJ-10) y en null (PRJ-11), vence hoy / 0 días (PRJ-12), y tres cambios de tarea que mueven `open_tasks` y la severidad (PRJ-13 finalizada, PRJ-14 a Crítica vencida, PRJ-15 sin dependencia).

Distribución de `priorityFromScore` sobre los 22: **Crítica 4 · Alta 10 · Media 7 · Baja 1** — los mismos 4 críticos que fijó el corte de 85 en `CRITERIO-PRIORIZACION.md`.

`npx tsc --noEmit` en 0, `npx eslint lib/scoring.ts` en 0, `npm run build` compila. Base devuelta a 0 filas en las 5 tablas y scripts temporales borrados.

**Desviaciones respecto a lo que decía la tarea:**
- **La firma es `calcularScore(project, tasks, hoy?)`, no `calcularScore(project)`. Confirmado con Pipe.** `score_tareas` pesa la severidad de **cada** tarea vencida (prioridad y si depende de otra), y eso no se puede reconstruir desde `open_tasks`/`overdue_tasks`, que son solo contadores. Con la firma original la única salida era aproximar, y el criterio de la tarea pide coincidencia exacta con el trigger. El tercer parámetro `hoy` es opcional y existe para fijar la fecha en la comparación; en uso normal se omite. Impacta a la Tarea 5.2, que va a tener que traer las tareas si quiere recalcular en el cliente — aunque para ordenar la tabla le alcanza con el `score_proyecto` que ya viene de la base.

**Decisiones tomadas al construirlo:**
- **La fecha de hoy se toma en UTC (`toISOString()`), no en local.** La base corre con `TimeZone = 'UTC'`, así que `current_date` del trigger es la fecha UTC. Medido en el momento de construir esto (2026-07-29 19:31 hora Colombia, ya 2026-07-30 en UTC): con la fecha local, **14 de los 22 scores no coincidían** con el trigger (PRJ-04 daría 91.42 contra 91.5 del SQL). No es un desfase teórico de medianoche: en Colombia son 5 horas al día, ~20% del tiempo.
- `calcularScore` filtra `tasks` por `project_code` adentro, igual que el `where` del SQL. Así se le puede pasar el arreglo completo de tareas sin que el llamador tenga que acordarse de filtrar.
- No escribe nada: el valor que se persiste sigue siendo el del trigger. Este archivo es para que la UI del Nivel 5 muestre la prioridad y para que el Nivel 4 pueda anticipar el efecto de un cambio sin ir a la base.
- Las cuatro subfórmulas quedan como funciones privadas, una por componente, con el mismo orden y los mismos nombres que las secciones del SQL. No se exportan: nadie fuera del archivo las pidió (YAGNI), y exportarlas invitaría a recalcular medio score en un componente.

**Cambio hecho después, al construir la Tarea 4.3:** `hoyUTC()` pasó de privada a exportada. La 4.3 necesita la misma fecha para decidir si una tarea nace vencida, y `APRENDIZAJES.md` #19 dice que la regla de UTC aplica a todo lo que compare fechas en los Niveles 4 a 7 — un segundo `toISOString().slice(0, 10)` en `actions/tasks.ts` era un segundo lugar donde equivocarse. Es el único cambio a este archivo; la fórmula no se tocó.

### Tarea 3.4: Tasa de cambio fija — **Estatus: hecha** (construida antes del Nivel 2, ver la nota de orden al inicio del Nivel 2)
**Archivos:**
- Crear: `lib/currency.ts`

**Depende de / produce:**
- Consume: nada
- Produce: `TASA_USD_COP`, `convertirAUSD(valor, moneda)`

**Cómo verificar que quedó bien:**
- Convertir un valor de prueba en COP y confirmar el resultado en USD

- [x] 3.4.a `TASA_USD_COP = 3210` (tasa de referencia al 29 de julio de 2026, fuente Investing.com; documentar en comentario del archivo)
- [x] 3.4.b `convertirAUSD`

**Resultado de la verificación** (**criterio de la tarea**: convertir un valor en COP y confirmar el resultado): PRJ-18, 85.000.000 COP → **26.479,75 USD**; PRJ-20, 120.000.000 COP → **37.383,18 USD**. Los 20 proyectos en USD quedan idénticos, y PRJ-07 (sin `business_value`) devuelve `null`, no 0.

**Decisiones:** una moneda que no sea USD ni COP devuelve `null` en vez de asumir una tasa — la columna es nullable y una cifra inventada es peor que un vacío. El redondeo a 2 decimales hace que el número sembrado sea el mismo que se ve en pantalla.

### Tarea 3.5: Tokens de marca — **Estatus: hecha**
**Archivos:**
- Modificar: `app/globals.css` (ya existe desde la Tarea 0.1), `app/layout.tsx` (para la fuente de 3.5.b)
- **No** se crea ni se modifica `tailwind.config.ts`: no existe y no va a existir. Decidido con Pipe al cerrar la Tarea 1.4 — Tailwind v4 se configura por CSS con `@theme` dentro de `app/globals.css`, y tener además un config JS dejaría dos lugares posibles para un mismo color de marca (ver la nota de la Tarea 0.1)

**Depende de / produce:**
- Consume: `docs/brand-guide.md`
- Produce: tokens de color y tipografía para Niveles 5 y 6

**Cómo verificar que quedó bien:**
- Botón primario usa `#6EDD62`, fondo `#F9F9F7`, texto `#0D3326`, fuente Plus Jakarta Sans

- [x] 3.5.a Variables CSS de `docs/brand-guide.md` sección 3, declaradas en el bloque `@theme` de `app/globals.css` (así Tailwind genera las utilidades `bg-*`/`text-*` correspondientes, además de exponerlas como variables CSS)
- [x] 3.5.b Importar Plus Jakarta Sans vía `next/font/google`
- [x] 3.5.c Colores de estado (rojo/ámbar/verde para Bloqueado/En riesgo/Sano) se mantienen como paleta semántica aparte, no vienen del manual de marca

**Resultado de la verificación** (**criterio de la tarea**: botón primario `#6EDD62`, fondo `#F9F9F7`, texto `#0D3326`, fuente Plus Jakarta Sans). Se midió sobre el CSS compilado de un `npm run build` limpio, no leyendo el fuente, y con una página temporal que usa las 13 utilidades (borrada al terminar):

| Qué | Cómo se comprobó | Resultado |
|---|---|---|
| Las 12 variables llegan a `:root` | `grep` de cada `--color-*` en el CSS del build | 12 de 12 con su hex exacto |
| Las utilidades se generan | `grep` de cada regla `.bg-*` / `.text-*` | 13 de 13, cada una apuntando a su `var(--color-*)` |
| Botón primario | `.bg-secondary` → `var(--color-secondary)` → | **`#6edd62`** ✔ |
| Fondo | regla `body` → `var(--color-background)` → | **`#f9f9f7`** ✔ |
| Texto | regla `body` → `var(--color-foreground)` → | **`#0d3326`** ✔ |
| Fuente | `<html class="…__variable">` define `--font-plus-jakarta-sans` → `--font-sans` → `body` | **Plus Jakarta Sans** ✔, self-hosteada (4 `@font-face`, `woff2` variable 200–800, `font-display: swap`) |

La cadena se verificó de punta a punta con la app servida (`npm run start`): el HTML renderizado trae `<html lang="es" class="plus_jakarta_sans_…__variable h-full antialiased">` y `<button class="bg-secondary text-accent">`, y cada clase resuelve a los hex de arriba en el CSS servido. Build final sin la página temporal: solo `/` y `/_not-found`.

**Desviaciones respecto a lo que decía la tarea:**
- **`@theme static`, no `@theme` a secas.** Tailwind v4 descarta del CSS final las variables de tema que nadie usa todavía. Medido: con `@theme` normal, de las 12 solo llegaron `--color-background` y `--color-foreground` (las dos que usa la regla `body`); las otras 10 no existían en `:root`. Como 3.5.a pide exponerlas como variables CSS —y los Niveles 5 y 6 pueden escribir `var(--color-bloqueado)` en CSS crudo, no solo utilidades— se usó `static`, que las emite siempre. Ver `APRENDIZAJES.md` #20
- **Se cambiaron dos cosas más de `app/layout.tsx` que la tarea no listaba:** el `<title>`, que decía "Create Next App" (texto visible al evaluador en la pestaña y en el video), y `lang="en"` → `lang="es"`, porque toda la UI del reto está en español y el lector de pantalla y el corrector del navegador leen ese atributo. Se quitaron Geist y Geist Mono: ya no los usa nadie

**Decisiones tomadas al construirlo:**
- **Se eliminó el bloque `prefers-color-scheme: dark` que traía el scaffold.** El manual de marca define un solo fondo (`#F9F9F7`) y un solo color de texto; con el bloque puesto, la mitad de los evaluadores habría visto una versión oscura que el manual no define y que nadie diseñó. El modo oscuro no está en `TAREAS.md`
- **Cuidado con el nombre `primary`:** el manual llama "Primary" a un gris de apoyo (`#6B7280`), no al color del botón principal. El botón primario usa `bg-secondary`. Queda escrito en el comentario de `globals.css` para que los Niveles 5 y 6 no agarren `bg-primary` para el CTA por asociación con el nombre
- **El rol "Text" del manual se llama `--color-foreground`**, no `--color-text`: con ese nombre Tailwind generaría la utilidad `text-text`. El valor es el del manual sin tocar
- **Los colores de estado (3.5.c) son 3 pares, sólido + tinte suave**, no 3 colores sueltos: un badge necesita fondo y texto, y sin el tinte cada pantalla del Nivel 5 habría inventado el suyo. Los 3 sólidos pasan AA sobre `#F9F9F7` (medido: 6.3:1 el rojo `#B42318`, 5.2:1 el ámbar `#B54708`, 5.4:1 el verde `#067647`). El verde de estado **no** es el `#6EDD62` de marca a propósito: ese es el de las llamadas a la acción, y un proyecto sano no debe verse como un botón
- **`bg-secondary` va con `text-accent`, no con texto blanco**: `#0D3326` sobre `#6EDD62` da 8.0:1, blanco sobre `#6EDD62` da 1.8:1 y sería ilegible

**Pendiente para el Nivel 5, no se resolvió acá:** la Tarea 5.2.a pide el código de proyecto en "azul oscuro `#173e78`", pero el manual de marca fija `Link = #0D3326` y ese azul no aparece en ninguna parte del manual. Son dos fuentes en conflicto para el mismo elemento. Se declaró `--color-link` con el valor del manual; la decisión de cuál gana se toma al construir la 5.2.

---

## Nivel 4 — Server Actions

> **Archivo agregado a este nivel, no listado en ninguna tarea: `actions/common.ts`.** Las 6 acciones de las Tareas 4.1 a 4.4 necesitan las mismas tres piezas —el tipo de resultado que lee la UI del Nivel 6, la verificación de sesión y la traducción de errores de Postgres a texto mostrable— y la alternativa era escribirlas cuatro veces. No agrega ninguna feature: no hay tabla, pantalla ni verbo CRUD nuevo. Ahí viven también `siguienteCodigo` (generación de PK, ver la desviación de la 4.2) y `soloCamposEditables` (el filtro que sostiene el criterio del `verifier` para este nivel, "el CRUD hace lo que dice sin romper otros campos").
>
> **Las 6 acciones devuelven `ActionResult<T>` = `{ok: true, data}` | `{ok: false, error}`, no lanzan excepciones.** Quien las llama es un formulario: la Tarea 6.1 pide que el modal "se cierre solo tras guardar exitosamente", así que el componente necesita distinguir los dos casos y tener un texto que mostrar.
>
> **Las 6 verifican sesión antes de tocar la base**, por `APRENDIZAJES.md` #16. Medido con la base sembrada y sin sesión: `select count(*) from projects` devuelve **0 con `error: null`** aunque haya 22 filas. Sin ese chequeo, la 4.1.a habría concluido "la base está vacía" y habría arrancado a insertar encima de los 22.

### Tarea 4.1: Seed vía botón — **Estatus: hecha**
**Archivos:**
- Crear: `actions/seed.ts`

**Depende de / produce:**
- Consume: `seedProjects`/`seedTasks` (Tarea 2.2), `lib/supabase/server.ts` (Tarea 3.1)
- Produce: `cargarDatosEjemplo()`, invocada desde el botón del Nivel 5.2

**Cómo verificar que quedó bien:**
- Con `projects` vacía, ejecutar y confirmar 22 proyectos + 82 tareas insertadas, con score calculado por los triggers

- [x] 4.1.a Verificar si `projects` ya tiene filas antes de insertar
- [x] 4.1.b Insertar `seedProjects` y `seedTasks`. **En dos pasadas para las tareas**: primero las 82 con `depends_on_task_code` en `null`, después un `UPDATE` que llena las 61. La FK autorreferente de 1.1.b se valida fila por fila, 9 de las 61 tareas aparecen en el array antes que la tarea de la que dependen, y el ciclo `PRJ-04-T02 ↔ PRJ-04-T03` que trae el Excel hace que **ningún orden de inserción** funcione (ver el hallazgo de la Tarea 2.2). Antes de insertar, cortar si `dependenciasPendientes` no está vacío
- [x] 4.1.c Las filas de `project_history`/`task_history` generadas por la carga inicial son esperadas y aceptables, no requieren lógica de exclusión
- [x] 4.1.d Los `UPDATE` de la segunda pasada de 4.1.b **sí** generan filas en `task_history` (una por tarea, `campo='depends_on_task_code'`), a diferencia de los `INSERT`, que no generan ninguna. Entran en lo que 4.1.c ya declara aceptable

**Resultado de la verificación** (corrida dentro de un request real de Next —`next dev` + `curl` con tarro de cookies y sesión de `admin@aztec.local`— porque las Server Actions leen `cookies()` de `next/headers`, que solo existe ahí. Base en 0 filas al empezar):

| Criterio | Resultado |
|---|---|
| Con `projects` vacía, 22 proyectos + 82 tareas insertadas (**criterio de la tarea**) | `{proyectos: 22, tareas: 82}`, contados sobre lo que devolvió la base, no sobre el largo de los arrays |
| Score calculado por los triggers (**criterio de la tarea**) | **22 de 22** idénticos a `calcularScore` de la Tarea 3.3, **0 en 0**. Distribución: **Crítica 4 · Alta 10 · Media 7 · Baja 1**, la misma de las Tareas 1.2 y 3.3 |
| 4.1.b dependencias | **61 de 61** con `depends_on_task_code`, todas apuntando a un `task_code` que existe — incluido el ciclo `PRJ-04-T02 ↔ PRJ-04-T03`, que una sola pasada no podía insertar |
| 4.1.d historial de la 2ª pasada | **61 filas** en `task_history`, **todas** con `campo='depends_on_task_code'` |
| 4.1.c historial de proyectos | **0 filas** en `project_history`: los `INSERT` no generan ninguna (triggers de solo `UPDATE`), tal como anticipó la nota de la Tarea 1.3 |
| Contadores | `open_tasks`/`overdue_tasks` correctos en los 22 contra el recuento real de sus tareas |
| 4.1.a segunda corrida | `ok: false` — "La base ya tiene 22 proyecto(s). El seed solo corre sobre una base vacía." No insertó nada |

**Decisiones tomadas al construirlo:**
- **La segunda pasada es un `upsert` con `onConflict: 'task_code'`, no 61 `update` sueltos.** Las 61 filas ya existen, así que las 61 caen por el camino del `UPDATE`, en un solo viaje a la base en vez de 61. Reenvía las 11 columnas, pero el trigger de historial compara **valores** y no la lista del `SET` (verificado en la Tarea 1.3, paso 4): salieron 61 filas de historial y no 61 × 11 — medido, no supuesto.
- **`dependency` se descarta con una función tipada (`aFilaDeTarea`), no con un `...rest`.** El texto crudo de la columna del Excel no es columna de `tasks`; el tipo de retorno `Task` es lo que verifica que no falte ni sobre ninguna de las 11.
- **No hay rollback en caso de falla parcial, y el mensaje de error lo dice.** PostgREST no expone transacciones entre statements, y la Tarea 1.4 dejó `DELETE` **fuera** de las políticas a propósito, así que la acción no puede limpiar lo que ya insertó. Los dos `INSERT` sí son atómicos cada uno (22 filas o ninguna; 82 o ninguna), así que el peor escenario posible es "22 proyectos sin tareas" — y en ese caso el error devuelto dice exactamente eso y pide vaciar `projects` antes de reintentar, en vez de dejar al usuario adivinando.

### Tarea 4.2: CRUD de proyectos — **Estatus: hecha**
**Archivos:**
- Crear: `actions/projects.ts`

**Depende de / produce:**
- Consume: `lib/types.ts`, `lib/supabase/server.ts`
- Produce: `crearProyecto(datos)`, `actualizarProyecto(project_code, cambios)`

**Cómo verificar que quedó bien:**
- `crearProyecto` de prueba nace con `health='Sano'`, `stage='Borrador'`, `status='Activo'`, y `score_proyecto` se calcula solo

- [x] 4.2.a `crearProyecto`: recibe `project_name`, `client_alias`, `engagement_type`, `project_type_api`, `owner_alias`, `owner_role`, `start_date`, `target_date`; fija `health='Sano'`, `stage='Borrador'`, `status='Activo'`. **Además genera `project_code`**, que la tarea no lista como parámetro ni como salida (ver desviaciones)
- [x] 4.2.b `actualizarProyecto`: recibe `project_code` y objeto parcial de cambios
- [x] 4.2.c No debe fallar si `target_date` o `business_value` llegan `null`

**Resultado de la verificación** (**criterio de la tarea**: nace `Sano`/`Borrador`/`Activo` con el score calculado solo):

| # | Prueba | Resultado |
|---|---|---|
| A | `crearProyecto` sin `start_date` ni `target_date` (**criterio de la tarea** + 4.2.c) | `PRJ-23` · **Sano / Borrador / Activo** · `target_date`, `business_value` y `business_value_usd` en `null`, sin error |
| B | `score_proyecto` se calcula solo (**criterio de la tarea**) | **8.13**, idéntico a `calcularScore(proyecto, [])`. Es el trigger de `INSERT` de la 1.2.b: sin esa desviación habría nacido en 0 |
| C | Segundo `crearProyecto`, con fechas | `PRJ-24` (consecutivo correcto) · score 28.68 = `calcularScore` |
| D | `actualizarProyecto('PRJ-23', {next_step})` (**4.2.b**) | score **8.13 → 3.25** (health baja de 25 a 10) · **1 fila** en `project_history`, `campo='next_step'` |
| E | La misma llamada, ¿tocó algo más? | `project_name`, `health`, `stage` y `owner_alias` intactos — un parche de un campo escribe un campo |
| F | `{business_value: 85.000.000, currency: 'COP'}` | `business_value_usd` = **26.479,75**, el mismo número que verificó la Tarea 3.4 |
| G | `{business_value: null}` (**4.2.c**) | monto y `business_value_usd` a `null`, sin error |
| H | Parche con `score_proyecto: 999`, `open_tasks: 77` y `project_code: 'HACK'` inyectados en tiempo de ejecución | **los tres ignorados** (score y contador quedaron como estaban, el código sigue siendo `PRJ-23`), y el `summary` legítimo del mismo parche sí se aplicó |
| I | `actualizarProyecto('PRJ-99', …)` | `ok: false`, "No existe el proyecto PRJ-99." |
| J | Parche vacío `{}` | `ok: true` con la fila actual, **0 filas nuevas** de historial, sin `UPDATE` |

**Desviaciones respecto a lo que decía la tarea, decididas con Pipe:**
- **`crearProyecto` genera el `project_code`.** 4.2.a no lo recibe como parámetro y 6.1.a no lo pide en el formulario, pero es la PK: alguien tiene que producirlo. Se sigue el formato del dataset (`PRJ-23`, consecutivo) porque el código es **texto visible**: hipervínculo de la tabla (5.2.a) y tarjeta del Kanban (5.3.d). El siguiente número se calcula sobre el máximo **numérico** de los códigos existentes, no sobre su orden alfabético (`'PRJ-9' > 'PRJ-10'` como texto), y lo que no parsea a entero se ignora. Con dos escrituras simultáneas los dos lados podrían calcular el mismo número y la PK rechazaría al segundo con `23505`; es aceptable con un solo usuario (`admin`, Tarea 1.4.c).
- **`actualizarProyecto` recalcula `business_value_usd` cuando el parche toca `business_value` o `currency`.** Es la única función del sistema que puede escribir las tres columnas: sin esto, cambiar el monto deja el equivalente en USD viejo, que es lo que muestra el modal de info (5.3.f) y lo que pesa el componente de valor del score. Un `business_value_usd` explícito en el parche gana.

**Decisiones tomadas al construirlo:**
- **La fila se vuelve a leer después de escribir, no se usa el `RETURNING` del `INSERT`/`UPDATE`.** Los triggers de la Tarea 1.2 escriben `score_proyecto` con un `update` **propio y posterior**, así que el `RETURNING` del statement original devuelve el score de antes — 0 en un `INSERT`. Como el criterio de la 4.2 es justamente que el score "se calcula solo", la fila que devuelve la acción tiene que traerlo real. Aplica igual a `open_tasks`/`overdue_tasks`, y **no** aplica a `tasks`, que no tiene columnas derivadas.
- **El tipo de cambios excluye las 3 derivadas y `project_code`, y además hay un filtro en tiempo de ejecución** (`soloCamposEditables`). El tipo alcanza para lo que escribe el compilador; el parche real lo arma un formulario. La prueba H es esa segunda mitad.
- Una fila afectada de 0 sin error se trata como fallo, no como éxito: es `APRENDIZAJES.md` #16 aplicado a un `UPDATE`.

### Tarea 4.3: CRUD de tareas — **Estatus: hecha**
**Archivos:**
- Crear: `actions/tasks.ts`

**Depende de / produce:**
- Consume: `lib/types.ts`, `lib/supabase/server.ts`
- Produce: `crearTarea(datos)`, `actualizarTarea(task_code, cambios)`

**Cómo verificar que quedó bien:**
- Crear tarea con dependencia cuya tarea origen NO está en `Finalizada`: la nueva nace `Bloqueada`. Con la tarea origen en `Finalizada`: la nueva nace `Por hacer`

- [x] 4.3.a `crearTarea`: recibe `project_code`, `title`, `detail`, `assignee_alias`, `assignee_role`, `priority`, `due_date`, `depends_on_task_code` (opcional, viene de un `<select>` con las tareas del mismo proyecto, no texto libre). **Además genera `task_code`** (`PRJ-23-T01`, consecutivo dentro del proyecto), por el mismo motivo que la 4.2
- [x] 4.3.b Regla de nacimiento por dependencia (fijada, ver `APRENDIZAJES.md` #2): si `depends_on_task_code` viene informado y la tarea referenciada tiene `status != 'Finalizada'` → la nueva nace `status='Bloqueada'`. Si `status == 'Finalizada'` → nace `status='Por hacer'`. Sin dependencia → nace `status='Por hacer'`
- [x] 4.3.c `actualizarTarea`

**Resultado de la verificación** (**criterio de la tarea**: los dos lados de la regla de 4.3.b), sobre el `PRJ-23` que creó la 4.2:

| # | Prueba | Resultado |
|---|---|---|
| A | `crearTarea` sin dependencia | `PRJ-23-T01` · **Por hacer** · `is_overdue = false` |
| B | `crearTarea` dependiendo de `T01`, que está **Por hacer** (**criterio de la tarea**) | `PRJ-23-T02` · **Bloqueada** |
| C | `actualizarTarea('PRJ-23-T01', {status: 'Finalizada'})` (**4.3.c**) | Finalizada |
| D | `crearTarea` dependiendo de la misma `T01`, ahora **Finalizada** (**criterio de la tarea, segunda mitad**) | `PRJ-23-T03` · **Por hacer** |
| E | `crearTarea` con `due_date` pasada | `is_overdue = true` y `overdue_tasks` del proyecto sube a **1** por el trigger de la 1.2.c |
| F | Mover esa `due_date` al futuro | `is_overdue` vuelve a `false` solo, `overdue_tasks` a **0** |
| G | Volver a la fecha pasada y después cerrarla | `true` → cerrar a Finalizada la deja en **`false`**, `overdue_tasks` en 0 |
| H | `crearTarea` dependiendo de `PRJ-01-T01`, de **otro** proyecto | `ok: false` — "La tarea PRJ-01-T01 no existe dentro de PRJ-23" |
| I | `actualizarTarea('PRJ-23-T99', …)` | `ok: false`, "No existe la tarea PRJ-23-T99." |
| J | Contadores y score del proyecto al final | `open_tasks` 2/2 · `overdue_tasks` 0/0 · `score_proyecto` 6.5 = `calcularScore` |
| K | Historial de `PRJ-23-T04` | `['due_date', 'due_date', 'is_overdue', 'is_overdue', 'is_overdue', 'status']` — las 3 filas de `is_overdue` son las tres veces que la acción lo derivó sola |

**Desviaciones respecto a lo que decía la tarea, decididas con Pipe:**
- **`is_overdue` se calcula, no se deja en el `default false`.** El comentario de `001_tables.sql` decía "una tarea recién creada no puede estar vencida", y sí puede: el formulario del Kanban (6.2.a) acepta una `due_date` pasada, y `overdue_tasks` y el score la pesan. `crearTarea` la deriva de `due_date`, y `actualizarTarea` la vuelve a derivar cuando la fecha cambia. La comparación es contra la fecha **UTC** de `lib/scoring.ts` (`APRENDIZAJES.md` #19); una tarea que vence hoy no está vencida.
- **Una tarea que pasa a `Finalizada` sale de vencida** (`is_overdue = false`). No lo pide 4.3, lo dio por hecho la Tarea 1.2: al decidir que `overdue_tasks` cuenta `is_overdue = true` sin excluir `Finalizada`, dejó escrito que "una tarea que se cierra debería salir de vencida bajando su propio `is_overdue`". Esta acción es el único lugar donde eso puede pasar; sin la regla, `overdue_tasks` contaría tareas cerradas para siempre. Un `is_overdue` explícito en el parche gana sobre las dos reglas.
- **`crearTarea` rechaza una dependencia de otro proyecto** (prueba H). 4.3.a define la dependencia como un `<select>` "con las tareas del mismo proyecto", así que un código de otro proyecto está fuera de contrato; la FK lo aceptaría igual y la tarea nacería `Bloqueada` esperando algo que el Kanban no muestra.
- **`project_code` no es editable en `actualizarTarea`.** Mover una tarea de proyecto es algo que los triggers soportan (verificado en la Tarea 1.3, paso 5) pero que ninguna pantalla del Nivel 6 ofrece. Si aparece, se agrega al filtro.

### Tarea 4.4: Crear nota — **Estatus: hecha**
**Archivos:**
- Crear: `actions/notes.ts`

**Depende de / produce:**
- Consume: `lib/types.ts`, `lib/supabase/server.ts`
- Produce: `crearNota(project_code, content)`

**Cómo verificar que quedó bien:**
- Nota de prueba aparece con `created_at` correcto, no editable después

- [x] 4.4.a `crearNota`

**Resultado de la verificación** (**criterio de la tarea**: `created_at` correcto, no editable después):

| # | Prueba | Resultado |
|---|---|---|
| A | `crearNota('PRJ-23', '  Primera nota de prueba  ')` | `ok`, `id` uuid de 36 caracteres, `created_at = 2026-07-30T05:04:29.048+00:00` (**2,3 s** antes de la aserción), contenido guardado sin los espacios de los extremos |
| B | Nota de solo espacios | `ok: false`, "La nota no puede estar vacía." |
| C | `crearNota('PRJ-99', …)`, proyecto inexistente | `ok: false` — la FK la rechaza y el error llega traducido, sin el texto de PostgREST |

**Decisiones tomadas al construirlo:**
- **"No editable después" se cumple por ausencia de verbo**, no por una regla escrita: este archivo exporta solo `crearNota`. No hay `actualizarNota` ni `borrarNota`, y `notes` no aparece en ninguna otra acción del Nivel 4. (La política de `UPDATE` de la Tarea 1.4.b existe para las 5 tablas por igual, así que la inmutabilidad la sostiene la app, no el RLS. Queda anotado por si alguna vez importa.)
- **`id` y `created_at` los pone la base**, con los defaults de la 1.1.c: la hora de la nota no depende del reloj de la máquina del usuario.
- **El contenido se recorta y una nota vacía se rechaza.** `content` es `NOT NULL` pero el esquema acepta la cadena vacía, y una nota en blanco no aporta nada al historial de un proyecto y no se puede borrar después.

---

## Nivel 5 — UI de lectura

> **Diseño del nivel:** `docs/superpowers/specs/2026-07-30-nivel-5-ui-lectura-design.md`, aprobado por Pipe antes de construir. Ahí quedaron cerradas las **4 decisiones que las tareas anteriores dejaron abiertas por escrito para este nivel**:
>
> 1. **Color del código de proyecto (5.2.a): gana el manual de marca, `#0D3326`** (`--color-link`), no el `#173e78` del mockup. Cierra el pendiente que dejó la Tarea 3.5. La afordancia del link la dan la negrita (que 5.2.a ya pedía) y el subrayado en hover/focus. Verificado sobre el CSS compilado: `.text-link { color: var(--color-link) }` → `#0d3326`, y **cero apariciones de `173e78`** en el CSS servido.
> 2. **Sin sesión, `/proyectos` redirige a `/login`** (cierra el pendiente de la Tarea 3.1). Se hace en la **página**, no en `proxy.ts`: una redirección en el proxy rompería la ruta de la Tarea 7.1, que llega sin cookies. Medido: los Route Handlers sin cookies siguen respondiendo `200` con `rol=anon`.
> 3. **Botón "Salir" en el header** — no está en ninguna de las 27 tareas, se agregó con Pipe. Sin él, quien entra no puede volver a `/login` sin borrar cookies, y el login es un requisito visible del reto.
> 4. **Filtros y orden viven en memoria del cliente**, no en la URL. Son 22 filas; filtrar y reordenar no cuesta un viaje al servidor. Costo aceptado: los filtros no se comparten por link.
>
> **Decisión extra, tomada al construir y anotada acá:** `app/page.tsx` pasó a `redirect('/proyectos')`. Traía el boilerplate de `create-next-app` (logo de Next, "To get started, edit the page.tsx file", bloques `dark:` que la Tarea 3.5 ya había sacado del resto) y es la primera pantalla que ve el evaluador. Ninguna de las 27 tareas lo reemplazaba — `APRENDIZAJES.md` #4 otra vez: nadie lo tenía en su lista de "Crear".
>
> **Archivos agregados a este nivel, no listados en ninguna tarea.** Mismo criterio con que el Nivel 4 agregó `actions/common.ts`: ninguna feature, tabla, pantalla ni verbo CRUD nuevo; son piezas que 5.2 y 5.3 necesitan **las dos** y la alternativa era escribirlas dos veces.
>
> | Archivo | Por qué |
> |---|---|
> | `app/proyectos/layout.tsx` | Header compartido, **y punto de montaje del widget de la Tarea 7.2**: colgándolo de este layout, `/login` queda excluido por estructura y no por un `if` de ruta (lo que 5.1.c y 7.2.b piden juntos) |
> | `components/site-header.tsx` | Wordmark de `docs/brand-guide.md` §2 + botón "Salir" (decisión 3) |
> | `components/login-form.tsx` | División obligada: la página de login tiene que ser Server Component para redirigir si ya hay sesión, y el login tiene que ser cliente para que `signInWithPassword` deje la cookie. No caben en un archivo |
> | `lib/session.ts` | `exigirSesion()` / `haySesion()`. No sirve `clienteConSesion` de `actions/common.ts`: esa devuelve `{ok:false,error}` porque la llama un formulario; una página redirige |
> | `lib/format.ts` | `formatFecha`, `formatFechaHora`, `formatMonto`, `formatScore`. **Parsea las fechas a mano, sin `new Date('YYYY-MM-DD')`**: en Colombia (UTC-5) eso mostraría `30 sep` como `29 sep` (`APRENDIZAJES.md` #19 aplicado a lo que se ve en pantalla, no al score) |
> | `components/badges.tsx` | Deja **la regla del ⚠️ en un solo lugar**, y es criterio de verificación de 5.2 *y* de 5.3.a: con un badge por pantalla, la tabla podría mostrar el ⚠️ y el detalle no, sin que nada falle |
> | `lib/project-list.ts` | Filtrado y orden como lógica pura, sin JSX. Está separada **por verificación, no por estética**: adentro de un componente de cliente, "los filtros filtran de verdad" solo se puede revisar leyendo código; acá se mide contra los 22 proyectos reales |
>
> **Un cambio a un archivo ya cerrado: `lib/scoring.ts` exporta `sinSiguientePaso(project)`.** Estaba adentro de `scoreHealth`, y el comentario de ese archivo ya decía que era "el mismo criterio que usa el ⚠️ de la UI (Tareas 5.2 y 5.3)". Es el mismo movimiento que hizo la Tarea 4.3 con `hoyUTC()`. **La fórmula no se tocó**, y se volvió a medir: **22 de 22 scores idénticos al trigger, 0 distintos**, con la misma distribución de siempre (Crítica 4 · Alta 10 · Media 7 · Baja 1).
>
> **Nota de superficie:** las tarjetas, la tabla, las columnas del Kanban y el modal usan `bg-white`, que **no es un color de marca** — el manual define un solo fondo (`#F9F9F7`, el del `body`) y no define color de superficie. Se usa el blanco de Tailwind para separar del fondo cálido, y **no se declaró ningún hex nuevo en `globals.css`**. Los neutros que la UI necesitaba (bordes, separadores, texto atenuado) salen de `accent` y `primary` con modificador de opacidad.

### Tarea 5.1: Login — **Estatus: hecha**
**Archivos:**
- Crear: `app/login/page.tsx`, `components/login-form.tsx` (ver la nota del nivel: la 5.1 declaraba un archivo, y la división en dos es obligada)

**Depende de / produce:**
- Consume: Auth (Tarea 1.4.c), `lib/supabase/client.ts`
- Produce: sesión autenticada, redirige a `/proyectos`

**Cómo verificar que quedó bien:**
- `admin`/`123` redirige al listado; credenciales incorrectas muestran error sin detalles técnicos de Supabase

- [x] 5.1.a Formulario "Usuario"/"Contraseña" (no "correo"). Los dos `input` son `type="text"`/`type="password"`: con `type="email"` el navegador rechazaría `admin` antes de enviar el formulario
- [x] 5.1.b Mapear `admin` → `admin@aztec.local` internamente, llamar `signInWithPassword`. La regla es "si no trae `@`, se le pega el dominio interno", no una tabla de usuarios cableada en el cliente: así funcionan `admin` y `admin@aztec.local` por igual
- [x] 5.1.c Sin widget de chat en esta pantalla — **se cumple por estructura**: el widget de la Tarea 7.2 se monta en `app/proyectos/layout.tsx`, y `/login` no cuelga de ese layout

**Resultado de la verificación** (corrida contra el proyecto `jaflglivhurdhccjvfac` con `next dev` y `curl` con tarro de cookies):

| # | Prueba | Resultado |
|---|---|---|
| A | `signInWithPassword('admin@aztec.local','123')` dentro de un request real | `ok: true`, `rol=authenticated`, cookie de sesión escrita en el tarro |
| B | 5.1.a — etiquetas del formulario renderizado | `<label for="usuario">Usuario</label>` · `<label for="contrasena">Contraseña</label>` · `id="usuario"` con `type="text"` · **0 apariciones de la palabra "Correo"** en toda la página |
| C | 5.1.c — widget de chat y header | **0** apariciones de `Salir` en `/login`; **1** en `/proyectos` y **1** en el detalle. La pantalla de login no trae el cascarón compartido |
| D | `/login` **con** sesión (**criterio de la tarea**, primera mitad) | `307 → /proyectos` |
| E | Credenciales incorrectas (**criterio de la tarea**, segunda mitad) | un solo texto, "Usuario o contraseña incorrectos.". El `Invalid login credentials` de Supabase se descarta, y **no se distingue** "el usuario no existe" de "la contraseña está mal": eso le diría a un extraño cuáles usuarios existen |

**Lo que no se pudo medir sin navegador** (no hay uno en este entorno, se dice como tal): el `submit` del formulario y el click de "Salir" corren en el cliente. Lo que sí quedó medido es la llamada que hacen (`signInWithPassword`, prueba A) y el efecto de no tener cookie (`/proyectos` → `307 /login`). El camino completo por la UI se ve en el video del reto.

### Tarea 5.2: Listado de proyectos — **Estatus: hecha**
**Archivos:**
- Crear: `app/proyectos/page.tsx`, `components/projects-table.tsx`, `components/filters-form.tsx`
- Agregados (ver la nota del nivel): `app/proyectos/layout.tsx`, `components/site-header.tsx`, `lib/session.ts`, `lib/format.ts`, `components/badges.tsx`, `lib/project-list.ts`

**Depende de / produce:**
- Consume: `lib/types.ts`, `lib/scoring.ts`, `docs/brand-guide.md`
- Produce: vista principal, entrada a la Tarea 5.3
- **Nota de la Tarea 3.3:** para ordenar y filtrar la tabla alcanza con el `score_proyecto` que ya viene de la base — no hace falta llamar a `calcularScore` acá. De `lib/scoring.ts` esta pantalla solo necesita `priorityFromScore`. Si en algún momento sí se quiere recalcular en el cliente, hay que traer también las tareas: `calcularScore(project, tasks)` las necesita. **Se cumplió tal cual:** la pantalla usa `priorityFromScore` y `sinSiguientePaso`, no `calcularScore`

**Cómo verificar que quedó bien:**
- Tabla ordena por `score_proyecto` descendente por default; ⚠️ solo en `health='Bloqueado'` y `next_step` vacío; filtros filtran de verdad

- [x] 5.2.a Tabla ordenable: código (hipervínculo, **`#0D3326` del manual, no el `#173e78` del mockup** — decisión 1 del nivel), nombre (sin negrilla), tipo, cliente, responsable, fecha límite, salud/prioridad, estado. Las 8 columnas ordenan; la de salud/prioridad ordena por `score_proyecto`, porque la prioridad **es** una función del score y ordenar por la etiqueta perdería la resolución de adentro de cada bloque
- [x] 5.2.b Filtros: tipo de vínculo (`engagement_type`), tipo de proyecto (`project_type_api`), rol del responsable (`owner_role`), estado abierto/cerrado (`status`), fecha de apertura (`start_date`), tareas pendientes (`open_tasks`), solo con tareas vencidas (`overdue_tasks`), score mínimo, solo con bloqueos. Los 3 primeros `<select>` derivan sus opciones **de los datos**; el de estado lista los 2 valores del `CHECK` de 1.1.a a propósito (si se derivara de los datos y hoy no hay ningún `Cerrado`, el filtro escondería su propia existencia)
- [x] 5.2.c Botón "+ Crear proyecto" (abre Tarea 6.1). **Queda inerte hasta la 6.1** y lo dice en vez de quedarse mudo — es el único elemento del nivel entregado sin efecto, declarado como tal en el diseño
- [x] 5.2.d Botón "Cargar datos de ejemplo" (llama `actions/seed.ts`), visible solo si `projects` está vacía. Vive dentro del estado vacío, que solo se renderiza con 0 filas: la condición se cumple **por construcción**, no por un `if` que alguien pueda desalinear después
- [x] 5.2.e Toggles Lista/Estado/Tareas (Estado y Tareas quedan como placeholder). Las dos muestran una línea —"Esta vista no está construida. Los mismos datos están en la vista Lista."— en vez de una pantalla en blanco que parezca un error

**Resultado de la verificación** (`next dev` + `curl` con sesión, con los 22 proyectos y 82 tareas cargados **por la acción de la Tarea 4.1**, que es la que llama el botón de 5.2.d; base en 0 filas al empezar):

| # | Criterio | Resultado |
|---|---|---|
| A | 5.2.d — base vacía | `/proyectos` trae "No hay proyectos todavía" y el botón "Cargar datos de ejemplo" |
| B | 5.2.d — la carga | `{ok: true, proyectos: 22, tareas: 82}`; después el botón **desaparece** (0 apariciones con 22 filas) |
| C | **Orden por `score_proyecto` desc por defecto** (criterio de la tarea) | 22 filas, primera **PRJ-04** (91,50), última **PRJ-20** (24,09). Serie **monótonamente descendente** verificada fila por fila, y el orden del HTML **idéntico** al que devuelve `ordenar()` |
| D | **⚠️ solo en `Bloqueado` + `next_step` vacío** (criterio de la tarea) | **13 con alerta, todas `Bloqueado`; 4 `En riesgo` y 5 `Sano` sin ninguna.** 13+4+5 = 22. Medido pareando cada badge con su propio marcado, no contando los dos textos por separado |
| E | **Los filtros filtran de verdad** (criterio de la tarea) | **10 de 10 casos coinciden con el conteo en SQL**, que es una implementación independiente (ver la tabla de abajo) |
| F | Decisión 1 — color del link | `.text-link { color: var(--color-link) }` → `--color-link: #0d3326` en el CSS servido; los 22 códigos con `class="font-bold text-link …"`; **0 apariciones de `173e78`** |
| G | 5.2.e toggles | los 3 presentes con `role="tab"`: Lista \| Estado \| Tareas |
| H | Contador de resultados | "22 de 22 proyectos" |
| I | 5.2.b — controles | los 9 filtros presentes, cada uno con su `<label for>` |
| J | Decisión 2 — sin sesión | `/proyectos` → `307 /login` · `/proyectos/PRJ-04` → `307 /login` · `/` → `307 /proyectos` · `/login` → `200` |
| K | Decisión 2 — no rompe la Tarea 7.1 | un Route Handler **sin cookies** responde `200` con `rol=anon`, sin redirección |

Los 9 filtros, uno por uno, contra `count(*)` en SQL:

| Filtro | Valor probado | `aplicarFiltros` | SQL |
|---|---|---|---|
| tipo de vínculo | `Diagnóstico` | 4 | 4 |
| tipo de proyecto | `Automatización` | 11 | 11 |
| rol del responsable | `Commercial / Delivery` | 3 | 3 |
| estado | `Activo` | 22 | 22 |
| fecha de apertura | `>= 2026-03-01` | 9 | 9 |
| tareas pendientes | `open_tasks >= 4` | 19 | 19 |
| solo con tareas vencidas | `overdue_tasks > 0` | 17 | 17 |
| score mínimo | `>= 85` | 4 | 4 |
| solo con bloqueos | `health = 'Bloqueado'` | 13 | 13 |
| **los tres últimos combinados** | — | 4 | 4 |

**Decisiones tomadas al construirlo:**
- **La consulta ya sale ordenada por score desc desde la base**, no solo desde el cliente: así el HTML servido está bien ordenado sin depender de que el JS corra. El orden por click de encabezado sí es del cliente.
- **`hoy` se calcula en el servidor y viaja como prop.** Si la tabla lo calculara sola, el HTML del servidor y el del cliente podrían caer en días distintos justo en la medianoche UTC y React marcaría el desajuste. Es la fecha UTC de `lib/scoring.ts` (`APRENDIZAJES.md` #19).
- **La verificación de sesión va en cada página, no en el layout.** Un layout no se vuelve a ejecutar en toda navegación del lado cliente, así que un chequeo ahí no sería una garantía: se vería como una.
- **Hay un contador "N de 22 proyectos" y un mensaje propio para "ningún proyecto cumple estos filtros".** Es `APRENDIZAJES.md` #16 llevado a la UI: sin eso, un filtro que deja 0 filas se ve exactamente igual que una base vacía.
- La fecha límite se marca en rojo solo en proyectos `Activo`: en uno `Cerrado` una fecha pasada es historia, no una alarma.

### Tarea 5.3: Detalle de proyecto — **Estatus: hecha**
**Archivos:**
- Crear: `app/proyectos/[project_code]/page.tsx`, `components/project-detail/stepper.tsx`, `components/project-detail/blocked-banner.tsx`, `components/project-detail/kanban.tsx`, `components/project-detail/notes-panel.tsx`, `components/project-detail/info-modal.tsx`

**Depende de / produce:**
- Consume: `lib/types.ts`, `docs/brand-guide.md`
- Produce: vista de detalle, entrada a las tareas de escritura del Nivel 6

**Cómo verificar que quedó bien:**
- Proyecto bloqueado sin `next_step`: título muestra código→nombre→pill "⚠️ Bloqueado"; stepper resalta la etapa según `stage`; Kanban muestra 5 columnas reales (Por hacer/En progreso/En revisión/Bloqueada/Finalizada)

- [x] 5.3.a Título: código, nombre, pill de bloqueado/no bloqueado. El pill es el **mismo `HealthBadge`** que usa la tabla de 5.2, así que el "⚠️ Bloqueado" de este criterio y el ⚠️ del criterio de la 5.2 no pueden desalinearse
- [x] 5.3.b Stepper de 4 etapas mapeado a `stage`, con `aria-current="step"` en la actual
- [x] 5.3.c Banner de bloqueo, visible solo si `health='Bloqueado'`. La condición vive **dentro del componente**, no en la página: un solo lugar donde puede estar mal
- [x] 5.3.d Kanban con las 5 columnas reales de `status` (incluye `Finalizada`), mostrando `depends_on_task_code` en cada tarjeta cuando aplique. Una columna sin tareas se dibuja vacía, no se esconde
- [x] 5.3.e Panel de notas, ordenadas por fecha, con filtro de fecha. El orden viene resuelto en la consulta (`created_at desc`), que es lo que la Tarea 6.4 necesita para que una nota nueva aparezca al tope
- [x] 5.3.f Modal "Info general" con los 8 campos. Cierra con Escape, con click en el fondo y con su botón; `role="dialog"`, `aria-modal`, foco al abrir
- [x] 5.3.g Botones fijos "Cancelar"/"Guardar". **"Guardar" queda deshabilitado**: en un nivel de solo lectura no hay cambios pendientes, y es el estado en el que va a arrancar igual cuando el Nivel 6 le dé algo que guardar

**Resultado de la verificación** (aserciones sobre el HTML renderizado, descartando el payload RSC —que repite los textos y duplicaría todos los conteos—):

| # | Criterio | Resultado |
|---|---|---|
| A | **PRJ-04** (`Bloqueado`, `next_step` null, `stage='Ejecución'`, score 91,50) — 5.3.a (**criterio de la tarea**) | Título: `PRJ-04` → **Quotation Engine** → pill con `title="Bloqueado sin siguiente paso definido"` y el ⚠️ |
| B | 5.3.c — banner presente | `aria-label="Bloqueo"` presente, y "Siguiente paso: **Sin definir**" |
| C | 5.3.c — **la otra mitad**: PRJ-17 (`Sano`) | **banner ausente** (0 apariciones), pill "Sano", **0 apariciones del ⚠️** |
| D | 5.3.b — stepper (**criterio de la tarea**) | Con `stage='Ejecución'`: Borrador y Descubrimiento **recorridas**, `aria-current="step"` en **Ejecución**, Cierre futura |
| E | 5.3.b — que el stepper **responda** a `stage` | Los 22 del seed están en `Ejecución`, así que se movió PRJ-21 a `Cierre` a propósito: `aria-current` **se corrió a Cierre** y las 3 anteriores quedaron recorridas. Revertido después, y borradas las filas de `project_history` de la prueba |
| F | 5.3.d — **5 columnas reales** (**criterio de la tarea**) | `Por hacer \| En progreso \| En revisión \| Bloqueada \| Finalizada` |
| G | 5.3.d — columnas vacías: PRJ-21 (0 tareas, el proyecto sin tareas de la Tarea 1.2) | las **5** columnas dibujadas, cada una con "Sin tareas" |
| H | 5.3.d — `depends_on_task_code` en la tarjeta | Las 4 tarjetas de PRJ-04 pareadas con su chip: **T02→T03 · T01→(sin dependencia) · T04→T01 · T03→T02**. **El ciclo `T02 ↔ T03` que trae el Excel queda visible en pantalla**, que es exactamente el cuello de botella que la Tarea 2.2 decidió no "arreglar" |
| I | 5.3.e — panel de notas con 0 notas | "Este proyecto todavía no tiene notas." — correcto: `notes` no se siembra, las notas nacen en la Tarea 6.4 |
| J | 5.3.f / 5.3.g | botón "Info general" presente · barra fija con "Cancelar" y "Guardar" con `disabled` y `title="No hay cambios sin guardar"` |
| K | Código inexistente | `/proyectos/PRJ-999` → **404**. Con la sesión garantizada por `exigirSesion()`, un `null` significa "no existe", no "el RLS filtró" (`APRENDIZAJES.md` #16) |

**Desviación respecto al diseño aprobado del nivel:** `kanban.tsx` quedó como **Server Component**, no de cliente. En este nivel el tablero solo muestra: no tiene estado ni eventos, y mandarlo entero al navegador no compraba nada. La Tarea 6.2 le agrega el formulario como **hijo de cliente**, que es el mismo patrón que ya usa `app/login/page.tsx` con `login-form.tsx`.

**Decisiones tomadas al construirlo:**
- **Solo `Bloqueada` y `Finalizada` llevan color de columna**; las otras tres van en neutro. Si las 5 tuvieran color, ninguna resaltaría — y el reto es sobre encontrar bloqueos. Darles color a las otras tres habría significado inventar tres colores fuera del manual de marca.
- **En el Kanban las tarjetas no llevan badge de estado**: la columna **es** el estado, así que repetirlo en cada tarjeta es ruido.
- **El filtro de notas compara los 10 primeros caracteres del `created_at`** contra el texto del `<input type="date">`, sin construir ninguna fecha: mismo motivo que `lib/format.ts` (`APRENDIZAJES.md` #19).
- **El fondo del modal es un elemento aparte, no el `onClick` del contenedor**: así un click dentro del panel no lo cierra por burbujeo.
- El `business_value_usd` del modal **se lee, no se recalcula**. Lo mantiene sincronizado `actualizarProyecto` (desviación de la Tarea 4.2), así que la pantalla y el componente de valor del score no pueden mostrar números distintos.

**Estado de la base al cerrar el nivel:** 22 proyectos · 82 tareas · 0 notas · `project_history` en 0 · `task_history` en 61 (las 61 filas `depends_on_task_code` de la segunda pasada del seed, que la Tarea 4.1.d ya declaró esperadas). Sin datos de prueba residuales.

---

## Nivel 6 — UI de escritura

> **Diseño del nivel:** `docs/superpowers/specs/2026-07-30-nivel-6-ui-escritura-design.md`, aprobado por Pipe antes de construir. Ahí quedaron cerradas las **4 decisiones que las tareas dejaban abiertas**:
>
> 1. **Alcance de 6.2: crear + editar.** El título de la tarea dice "crear/editar" aunque su único checklist hable del formulario de dependencia. Sin editar, ninguna pantalla puede mover una tarea de columna y `Finalizada` —el estado que el sistema agregó para poder evaluar la regla de 4.3.b (`APRENDIZAJES.md` #2)— queda inalcanzable desde la UI. `actualizarTarea` (4.3.c) ya existía y estaba verificada.
> 2. **El campo que le faltaba a 6.1: `owner_role`, derivado de la persona.** `crearProyecto` (4.2.a) exige 8 campos y 6.1.a lista 7; el que falta es `NOT NULL`. En vez de agregar un campo, el rol sale de la persona elegida: **medido, las 6 personas del dataset tienen un solo rol** (Daniel Rojas `Commercial / Delivery`, las otras 5 `Delivery`), y el `<select>` lo muestra en la etiqueta para que lo que se guarda esté a la vista. Los dos catálogos que alimentan los filtros de 5.2.b van como `<select>` cerrado; el cliente va como texto con las 16 sugerencias existentes, porque un proyecto nuevo puede ser de un cliente nuevo.
> 3. **6.3 edita los 4 campos del bloqueo, solo en proyectos `Bloqueado`.** Así 5.3.c (banner ausente en un proyecto sano) queda intacto. **Limitación aceptada:** en los 9 proyectos no bloqueados no hay forma de definir `next_step` desde la UI, aunque el componente `health` del score lo pesa en los tres estados de salud. Mover ese campo afuera del banner habría agregado un elemento de pantalla que este archivo no lista.
> 4. **La barra fija de 5.3.g pasa a ser el control del formulario de 6.3.** "Guardar" se habilita solo si hay cambios sin guardar; "Cancelar" **mantiene su etiqueta** y cambia de acción (sin cambios, link al listado como en el Nivel 5; con cambios, los descarta).
>
> **Este nivel no toca `actions/`.** Las 6 acciones del Nivel 4 cubrían todo lo que los formularios necesitaban.
>
> **Archivos agregados a este nivel, no listados en ninguna tarea.** Mismo criterio del Nivel 4 (`actions/common.ts`) y del Nivel 5: ninguna feature, tabla, pantalla ni verbo CRUD nuevo; son piezas que **dos o más** tareas necesitan, o que existen para poder medir lo que un componente de cliente esconde.
>
> | Archivo | Por qué |
> |---|---|
> | `components/modal.tsx` | El cascarón del diálogo (Escape, click en el fondo, foco al abrir, `role="dialog"`) estaba suelto dentro de `info-modal.tsx`. 6.1 y 6.2 necesitan el mismo comportamiento: con tres copias, el día que una no cierre con Escape no lo nota nadie |
> | `components/form-fields.tsx` | Etiqueta + control + error, con la clase de marca en un solo lugar. `filters-form.tsx` pasa a importar **solo la constante de clase**; sus controles se quedan como están (el `<select>` de un filtro tiene la semántica "Todos", que no es la de un formulario) |
> | `components/project-detail/task-form.tsx` | El formulario de 6.2, **ya anunciado**: la desviación de 5.3 dice que `kanban.tsx` queda Server Component y que la 6.2 "le agrega el formulario como hijo de cliente" |
> | `lib/forms.ts` | Dos funciones puras, separadas **por verificación y no por estética** (mismo motivo que `lib/project-list.ts`): `personasConRol` (el mapa persona → rol de la decisión 2) y `textoONull` + `soloLoQueCambio` (cómo se arma el parche que viaja al servidor). Adentro de un componente de cliente las dos solo se pueden revisar leyendo código |
>
> **Archivos ya cerrados que este nivel toca**, y cómo se cubrió el riesgo:
>
> | Archivo | Qué cambió | Cómo se cubrió |
> |---|---|---|
> | `components/projects-table.tsx` (5.2.c) | El botón inerte se reemplazó por el modal. **El aviso "Todavía no se puede crear proyectos desde acá" ya no existe** — era el único elemento que el Nivel 5 entregó sin efecto | Medido: 0 apariciones del aviso, el botón sigue presente |
> | `components/project-detail/info-modal.tsx` (5.3.f) | Usa el cascarón compartido. Lo que muestra no cambió | Se volvió a medir que el diálogo se renderiza con sus 8 campos |
> | `components/filters-form.tsx` (5.2.b) | Importa la clase de control. Nada más | Los 9 filtros siguen en pantalla con su `<label for>` |
> | `app/proyectos/[project_code]/page.tsx` (5.3.g) | La barra fija salió de la página y entró a `blocked-banner.tsx` (decisión 4) | Medido en los dos casos: proyecto bloqueado (barra conectada) y proyecto sano (**sin banner**, barra presente con Guardar deshabilitado y su `title`) |

**Resultado de la verificación del nivel** (una sola corrida, `next dev` + sesión real de `admin@aztec.local`, con las 4 acciones ejecutadas dentro de un request —las Server Actions leen `cookies()` de `next/headers`, que solo existe ahí— y aserciones sobre el HTML renderizado descartando el payload RSC y los separadores `<!-- -->` que inyecta React):

**47 aserciones, 47 en OK, 0 fallas.** `npx tsc --noEmit` en 0 · `npx eslint .` en 0 · `npm run build` compila con las 4 rutas reales.

`lib/forms.ts`, medido sin renderizar:

| Qué | Resultado |
|---|---|
| `personasConRol` sobre los 22 pares reales | **6 personas**, un rol cada una |
| `personasConRol` con una persona con dos roles (caso construido, hoy no existe) | queda una sola vez, gana el primero alfabético |
| Catálogos que van a mostrar los `<select>` de 6.1 | 3 tipos de vínculo · 2 de proyecto · 16 clientes |
| `textoONull` | `''` → `null` · `'   '` → `null` · `'  hola  '` → `'hola'` |
| `soloLoQueCambio` | sin tocar nada → `{}` · un campo tocado → 1 llave · campo vaciado → `null` · **campo que volvió a su valor original → `{}`** · parche completo → 3 llaves |

**Estado de la base al cerrar el nivel:** se devolvió a su estado exacto de cierre del Nivel 5 — 22 proyectos · 82 tareas · 0 notas · `project_history` en 0 · `task_history` en 61 · los 22 `next_step` en `null` · `PRJ-04` con score 91,50 y su `blocker_reason` original. Ruta temporal de verificación borrada; el `npm run build` final solo lista las rutas reales.

**Lo que no se pudo medir sin navegador** (no hay uno en este entorno, se dice como tal): el click que abre un modal, el cierre con Escape, el `<datalist>` de sugerencias, y el paso de "Guardar" de deshabilitado a habilitado cuando el formulario se ensucia. De eso se midió el HTML inicial, los disparadores, y la lógica pura de `lib/forms.ts`, que es la que decide qué se manda. El camino completo por la UI se ve en el video del reto.

### Tarea 6.1: Modal "+ Crear proyecto" — **Estatus: hecha**
**Archivos:**
- Crear: `components/create-project-modal.tsx`
- Modificar: `components/projects-table.tsx` (reemplaza el botón inerte de 5.2.c)
- Agregados (ver la nota del nivel): `components/modal.tsx`, `components/form-fields.tsx`, `lib/forms.ts`

**Depende de / produce:**
- Consume: `actions/projects.ts` (Tarea 4.2)
- Produce: proyecto nuevo visible en la tabla apenas se guarda

**Cómo verificar que quedó bien:**
- Proyecto creado desde el modal aparece con `health='Sano'`, `stage='Borrador'`; el modal se cierra solo tras guardar exitosamente

- [x] 6.1.a Formulario: nombre, cliente, tipo de vínculo, tipo de proyecto, responsable, fecha de apertura, fecha límite. **Más `owner_role`, derivado del responsable** (decisión 2 del nivel): la acción lo exige y el checklist no lo listaba

**Resultado de la verificación:**

| # | Criterio | Resultado |
|---|---|---|
| A | **Nace `Sano` / `Borrador` / `Activo`** (criterio de la tarea) | `PRJ-23` · **Sano / Borrador / Activo** |
| B | El score lo calcula la base | **8,13** del trigger, idéntico a `calcularScore` |
| C | El rol se derivó, sin campo en el formulario | `Camila Torres · Delivery` |
| D | Un cliente que no estaba entre los 16 se guarda | `Cliente Nuevo Verif` — el `<input list>` no lo limita a los existentes |
| E | **Aparece en la tabla** (criterio de la tarea) | link a `/proyectos/PRJ-23` presente, y el contador pasó a "23 de 23 proyectos" |
| F | Nace sin ⚠️ | el listado siguió con **13** alertas, no 14 |
| G | 5.2.c cerrado | **0 apariciones** del aviso "Todavía no se puede crear proyectos desde acá" |

**Lo que el criterio no cubre y quedó medido igual:** el detalle del proyecto nuevo (que es `Sano` y tiene 0 tareas) sirvió para volver a probar dos criterios del Nivel 5 que este nivel toca — **banner ausente** (5.3.c) con la **barra fija presente y Guardar deshabilitado** (5.3.g), y las **5 columnas** del Kanban dibujadas vacías (5.3.d).

**Decisiones tomadas al construirlo:**
- **Los 5 campos de texto y catálogo son obligatorios y las 2 fechas no.** Los 5 son las columnas `NOT NULL` que la acción no puede inventar; las fechas quedan opcionales porque 4.2.c exige que no falle con `null`, y eso ya estaba verificado.
- **Una validación que ninguna tarea pide: `target_date` anterior a `start_date` se rechaza.** El esquema no tiene ese `CHECK` y la acción lo guardaría igual. Un proyecto que vence antes de abrir no es un dato raro, es un error de tipeo.
- **El modal se cierra solo con `ok: true`.** Con error queda abierto, con el texto de la acción y lo que el usuario escribió intacto.
- **Limitación conocida:** el botón vive dentro de `projects-table.tsx`, que solo se renderiza con al menos un proyecto (con 0 filas manda el estado vacío de 5.2.d). Con la base vacía el único camino sigue siendo "Cargar datos de ejemplo" — coherente con la decisión 2: los catálogos se derivan de los datos, y sin datos no hay catálogo.

### Tarea 6.2: Crear/editar tarea en el Kanban — **Estatus: hecha**
**Archivos:**
- Modificar: `components/project-detail/kanban.tsx`, `app/proyectos/[project_code]/page.tsx` (pasa `project_code` y la lista de personas)
- Crear (ver la nota del nivel): `components/project-detail/task-form.tsx`

**Depende de / produce:**
- Consume: `actions/tasks.ts` (Tarea 4.3)
- Produce: tarea nueva visible en la columna correcta

**Cómo verificar que quedó bien:**
- Tarea creada con dependencia aparece en la columna correcta según la regla de 4.3.b

- [x] 6.2.a Formulario con `<select>` de dependencia (tareas del mismo proyecto, no texto libre)
- [x] 6.2.b **Editar tarea** (decisión 1 del nivel): mismo formulario, con `<select>` de estado, mandando solo lo que cambió

**Resultado de la verificación** (sobre el `PRJ-23` que creó la 6.1):

| # | Criterio | Resultado |
|---|---|---|
| A | Sin dependencia nace `Por hacer` | `PRJ-23-T01` · Por hacer · `is_overdue = false` |
| B | **Con dependencia NO finalizada nace `Bloqueada`** (criterio de la tarea) | `PRJ-23-T02` · **Bloqueada**, apuntando a `T01` |
| C | Editar mueve la tarea de columna | `T01` a **Finalizada** |
| D | **Con la misma dependencia ya `Finalizada` nace `Por hacer`** (criterio de la tarea, segunda mitad) | `PRJ-23-T03` · **Por hacer** |
| E | **Cada tarjeta quedó en su columna real** (criterio de la tarea) | `Por hacer: T03` · `En progreso: T02` · `Bloqueada: —` · `Finalizada: T01`, pareando cada tarjeta con su propia columna en el HTML, no contando textos en toda la página |
| F | Editar manda solo lo que cambió | 3 campos tocados → **`task_history` con exactamente `['priority','status','title']`** |
| G | El tablero sigue mostrando lo que ya mostraba | 2 chips "Depende de", 3 disparadores "Editar" (uno por tarjeta), botón "+ Nueva tarea" |
| H | Contadores y score del proyecto | `open_tasks` 2 · `overdue_tasks` 0 · score **11,38** = `calcularScore` |

**Decisiones tomadas al construirlo:**
- **`kanban.tsx` sigue siendo Server Component.** Los dos disparadores son hijos de cliente, tal cual anticipó la desviación de la 5.3: el tablero no tiene estado, no hay motivo para mandarlo entero al navegador.
- **Crear no tiene campo de estado y editar sí.** Al crear lo fija la regla de 4.3.b; el formulario **avisa cuál va a ser antes de guardar** ("Va a nacer Bloqueada: `PRJ-04-T03` todavía no está Finalizada"), así la regla no es una sorpresa.
- **En editar, cambiar la dependencia no cambia el estado**, y el formulario lo dice: 4.3.b es una regla de nacimiento y `actualizarTarea` no la re-evalúa. Para mover la tarea está el campo Estado.
- **La propia tarea no se ofrece como dependencia al editar.** La FK autorreferente la aceptaría (2.2.d midió 0 autorreferencias, no las prohíbe) y una tarea bloqueada por sí misma no se destraba nunca.
- **Los enumerados van escritos, no derivados de los datos**: son el `CHECK` del esquema (mismo criterio que el filtro de estado de 5.2.b). Si `Finalizada` no apareciera porque hoy ninguna tarea lo está, el quinto estado sería inalcanzable.
- **La lista de responsables incluye al dueño del proyecto**, no solo a los asignados de las tareas: un proyecto recién creado por 6.1 tiene 0 tareas, y sin esa unión el `<select>` saldría vacío.

### Tarea 6.3: Editar bloqueo y siguiente paso — **Estatus: hecha**
**Archivos:**
- Modificar: `components/project-detail/blocked-banner.tsx` (pasa a cliente y **aloja la barra fija de 5.3.g**), `app/proyectos/[project_code]/page.tsx`

**Depende de / produce:**
- Consume: `actions/projects.ts`
- Produce: banner actualizado al guardar

**Cómo verificar que quedó bien:**
- Editar `blocked_since`/`blocker_owner`/`next_step` de un proyecto sembrado sin esos datos, confirmar que se guardan y aparece fila en `project_history`

- [x] 6.3.a Formulario editable dentro del banner. **4 campos**: `blocker_reason` además de los 3 del criterio (decisión 3 del nivel)

**Resultado de la verificación** (sobre `PRJ-04`, el proyecto con el score más alto del portafolio y el del ciclo de dependencias del hallazgo de la 2.2):

| # | Criterio | Resultado |
|---|---|---|
| A | Antes: los 3 campos vacíos como los dejó el seed | `next_step`, `blocked_since` y `blocker_owner` en `null`, `project_history` en **0** |
| B | **Se guardan** (criterio de la tarea) | `blocked_since = 2026-07-01` · `blocker_owner = Daniel Rojas` · `next_step` con el texto · `blocker_reason` reemplazado |
| C | **Aparece fila en `project_history`** (criterio de la tarea, segunda mitad) | **4 filas**, una por campo tocado: `blocked_since`, `blocker_owner`, `blocker_reason`, `next_step` |
| D | El efecto en el score | **91,50 → 81,75**, idéntico a `calcularScore` — el componente `health` bajó de 100 a 70 |
| E | El ⚠️ desaparece en las dos pantallas | detalle: 0 apariciones · listado: **13 → 12 alertas**. Es el mismo `HealthBadge` que verifican 5.2 y 5.3.a, así que no pueden desalinearse |
| F | Los valores guardados vuelven al formulario | `value="2026-07-01"`, `value="Daniel Rojas"` y el texto del siguiente paso en el `textarea` |
| G | Llenar el siguiente paso no cambia la salud | sigue `Bloqueado`: el ⚠️ avisa del hueco de gestión, no del bloqueo |

Es el circuito completo del reto medido de punta a punta: detectar el proyecto sin siguiente paso, llenarlo desde la UI, y ver el efecto en la priorización.

**Desviación respecto a lo que decía la tarea, decidida con Pipe:** el archivo **también aloja la barra fija de 5.3.g** (decisión 4). Si "Guardar" es el submit de este formulario, el botón y el estado del formulario no pueden vivir en archivos distintos. En un proyecto no bloqueado el componente renderiza **solo la barra**, con Guardar deshabilitado y el mismo `title` que tenía en el Nivel 5 — así 5.3.c ("banner ausente") y 5.3.g ("botones fijos") se siguen cumpliendo los dos, y las dos mitades quedaron medidas.

**Decisiones tomadas al construirlo:**
- **Vacío se guarda como `null`, no como cadena vacía** (`textoONull`). Un `next_step` en `''` haría que el ⚠️ y el componente `health` del score vieran "hay dato" donde no hay ninguno.
- **La base del formulario pasa a ser la fila que devolvió la acción**, no lo que se escribió: así "hay cambios" queda en falso sin adivinar, y los textos quedan como los guardó la base.
- **`blocker_owner` es texto con sugerencias y no un `<select>` cerrado**: un bloqueo puede estar del lado del cliente o de un proveedor, no solo del equipo.
- **Limitación aceptada** (decisión 3): en los 9 proyectos no bloqueados no hay forma de definir `next_step` desde la UI.

### Tarea 6.4: Agregar nota — **Estatus: hecha**
**Archivos:**
- Modificar: `components/project-detail/notes-panel.tsx`, `app/proyectos/[project_code]/page.tsx` (pasa `project_code`)

**Depende de / produce:**
- Consume: `actions/notes.ts`
- Produce: nota visible al tope del panel

**Cómo verificar que quedó bien:**
- Nota de prueba aparece arriba de las demás sin recargar la página

- [x] 6.4.a Campo de texto + botón "Agregar nota"

**Resultado de la verificación:**

| # | Criterio | Resultado |
|---|---|---|
| A | Las dos notas se guardan con la hora de la base | `06:08:08.142` y `06:08:08.473` — `created_at` lo pone el default de 1.1.c, no el reloj del navegador |
| B | **La nota nueva aparece arriba de la anterior** (criterio de la tarea) | la segunda se renderiza antes que la primera en el HTML del panel, sin ordenar nada acá: el orden viene de la consulta (`created_at desc`, decidido en 5.3.e justo para esto) |
| C | El contenido se recorta | `'  Primera nota…  '` quedó sin los espacios de los extremos |
| D | Una nota vacía se rechaza | "La nota no puede estar vacía." — el botón además está deshabilitado con el campo vacío, así que el error no debería llegar a existir |
| E | El contador del panel | "Notas (2)" |

**Decisiones tomadas al construirlo:**
- **El campo va arriba de la lista**, que es donde la nota va a aparecer.
- **"Sin recargar la página" se cumple con `router.refresh()`**, no con estado optimista: es un re-render del árbol del servidor, así que lo que se ve es lo que quedó en la base, y el contador y el estado vacío se actualizan sin lógica extra.
- **La regla de "nota vacía" está en los dos lados**: deshabilitado en la UI para que el error no llegue a existir, y aplicada igual en la acción — no se confía en la UI.

---

## Nivel 7 — Plus/extensiones

> **Las dos llaves reales ya están puestas** (`SUPABASE_SERVICE_ROLE_KEY` es la nueva llave `sb_secret_...` de Supabase, no el `service_role` JWT legacy — el proyecto migró al esquema nuevo de API keys; `OPENAI_API_KEY` es la de Pipe, no se comparte con el evaluador) y las dos tareas quedaron verificadas de punta a punta.
>
> **Decisiones tomadas al construir, sin necesidad de preguntar:** el nombre del header de la API key de 7.1.b es `x-api-key`; el modelo de OpenAI es configurable por `OPENAI_MODEL`.
>
> **Decisión de la 7.2 tomada con Pipe, después de medir un trade-off real:** el modelo por defecto es **`gpt-4o-mini`**, no `gpt-4o`. Medido en este proyecto: `gpt-4o` respondió bien las 3 veces que se le preguntó "¿cuáles proyectos están bloqueados?", pero la cuenta de OpenAI tiene un límite de 30.000 TPM y cada pregunta manda ~11.000 tokens de contexto (el portafolio completo) — a la 3ª-4ª pregunta seguida, `429 rate_limit_exceeded`. `gpt-4o-mini` aguantó **5 preguntas seguidas sin ningún error de cuota**, al costo de un hueco de confiabilidad conocido y documentado abajo (Tarea 7.2).

### Tarea 7.1: API Route de solo lectura — **Estatus: hecha**
**Archivos:**
- Crear: `app/api/proyectos/route.ts`

**Depende de / produce:**
- Consume: `SUPABASE_SERVICE_ROLE_KEY` y `API_KEY_PROYECTOS` (variables de entorno). **No consume `lib/supabase/server.ts`** — corregido con Pipe al cerrar la Tarea 3.1: esta ruta arma su propio cliente `service_role` con `createClient` de `@supabase/supabase-js` adentro de este archivo. `server.ts` solo produce el cliente con cookies de sesión, que acá no sirve (la llamada llega sin sesión). La llave que salta RLS queda contenida en un solo archivo, no importable por accidente desde un Server Component (ver la desviación de la Tarea 3.1)
- Produce: GET público (protegido por API key fija) para integraciones tipo n8n

**Cómo verificar que quedó bien:**
- `curl` con API key correcta devuelve JSON con los 22 proyectos; sin key, devuelve 401

- [x] 7.1.a `GET` que devuelve todos los `projects` en JSON
- [x] 7.1.b Validación de API key fija por header. **Nombre del header: `x-api-key`** (la tarea no lo fijaba)
- [x] 7.1.c **Cliente con llave `service_role`, no `anon`** (decidido con Pipe al cerrar la Tarea 1.4). Con el RLS de la 1.4 una llamada sin sesión llega como `anon` y lee 0 filas. El orden importa: primero se valida `API_KEY_PROYECTOS` del header y se corta con 401 si no coincide, y **solo después** se crea el cliente con `service_role`. La llave se lee de `process.env` dentro de la ruta (server-side), nunca se expone al navegador ni lleva prefijo `NEXT_PUBLIC_`

**Resultado de la verificación** (`next dev` + `curl`, sin `SUPABASE_SERVICE_ROLE_KEY` puesta todavía):

| # | Prueba | Resultado |
|---|---|---|
| A | Sin header `x-api-key` | `401`, `"API key inválida o ausente."` |
| B | Header con una key incorrecta | `401`, mismo mensaje — no distingue "falta" de "está mal", igual que el criterio de la Tarea 5.1 |
| C | Header con la `API_KEY_PROYECTOS` real, **antes** de tener `SUPABASE_SERVICE_ROLE_KEY` puesta | pasa la validación de key: `500`, `"El servidor no tiene la conexión a la base configurada."` — no un `200` mentiroso con datos vacíos |
| D | La cookie de sesión del login no cambia nada | mismo comportamiento con o sin cookie — la ruta no depende de sesión, tal cual el diseño |
| E | **Con `SUPABASE_SERVICE_ROLE_KEY` real puesta, header con la API key correcta** (**criterio de la tarea, corrida final**) | **`200`**, **22 de 22** `project_code` (`PRJ-01`…`PRJ-22`), las 23 columnas de la Tarea 1.1.a por fila |
| F | Sin header, con la llave real ya puesta | sigue en `401` — la llave de Supabase no reemplaza la validación de `API_KEY_PROYECTOS` |

Las dos mitades del criterio de la tarea quedaron medidas: `curl` con la API key correcta devuelve los 22 proyectos; sin key, `401`.

### Tarea 7.2: Widget de chat RAG — **Estatus: hecha**
**Archivos:**
- Crear: `components/chat-widget.tsx`, `app/api/chat/route.ts`
- Modificar: `app/proyectos/layout.tsx` (monta el widget, ya tenía el comentario que anunciaba el lugar desde el Nivel 5)

**Depende de / produce:**
- Consume: `lib/supabase/server.ts`, `OPENAI_API_KEY` (no se comparte con el evaluador)
- Produce: widget flotante en todas las páginas excepto `/login`

**Cómo verificar que quedó bien:**
- Con la key puesta, "¿cuáles proyectos están bloqueados?" responde correcto contra los datos reales; sin la key, muestra mensaje de configuración en vez de romper la app

- [x] 7.2.a `route.ts`: recibe la pregunta, consulta `projects`+`tasks` completos, arma el prompt, llama a la API de OpenAI, devuelve la respuesta. **RAG sin base vectorial**: con 22 proyectos y 82 tareas el dataset entero entra en el contexto, así que "recuperar" es traer las dos tablas completas — una base vectorial sería la abstracción que YAGNI pide no construir a este tamaño
- [x] 7.2.b `chat-widget.tsx`: ícono flotante, ventana simple, oculto en `/login`. Oculto **por estructura**: se monta en `app/proyectos/layout.tsx`, y `/login` no cuelga de ese layout (mismo mecanismo con el que la 5.1.c ya quedó verificada)
- [x] 7.2.c Manejo del caso sin `OPENAI_API_KEY`

**Desviación respecto a lo que decía la tarea, con Pipe:** `/api/chat` **exige sesión** (a diferencia de la 7.1, que es pública a propósito). Por `APRENDIZAJES.md` #16, sin esa puerta el RLS dejaría pasar la lectura como `anon` con 0 filas, y el chat respondería con seguridad sobre un portafolio vacío en vez de fallar visiblemente.

**Resultado de la verificación**, en dos corridas (`next dev` + `curl` con tarro de cookies):

*Sin `OPENAI_API_KEY` puesta:*

| # | Prueba | Resultado |
|---|---|---|
| A | `POST /api/chat` sin sesión | `401`, `"La sesión no está activa. Volver a entrar en /login."` |
| B | Con sesión, pregunta vacía / de solo espacios | `400`, `"Falta la pregunta."` |
| C | **Con sesión, sin `OPENAI_API_KEY`** (**criterio de la tarea, segunda mitad**) | `200`, `{"configurado": false, "respuesta": "El chat todavía no está configurado: falta OPENAI_API_KEY."}` — no rompe la app |
| D | Widget en `/proyectos` (con sesión) | presente, `aria-label="Abrir chat"` |
| E | Widget en `/login` | **0 apariciones** — estructural, no un `if` |

*Con `OPENAI_API_KEY` real puesta, contra el portafolio real (13 proyectos `Bloqueado`: `PRJ-01,02,03,04,05,06,07,08,09,10,11,12,22`; PRJ-04 score 91,50):*

| # | Prueba | Resultado |
|---|---|---|
| F | "¿Qué proyecto tiene el score de priorización más alto?" | **PRJ-04, 91.5** — correcto, coincide con la Tarea 1.2/3.3 |
| G | "¿Cuál es el clima en Bogotá hoy?" (fuera de los datos) | "No tengo información sobre el clima en Bogotá." — no inventa |
| H | **"¿Cuáles proyectos están bloqueados?"** (**criterio de la tarea, primera mitad**) | con `gpt-4o`: **13 de 13 correcto**, 3/3 corridas. Con `gpt-4o-mini` (el default elegido): **12 de 13, omite siempre `PRJ-06`**, reproducido en **5 de 5** corridas a `temperature: 0` — determinístico, no al azar |
| I | 5 preguntas sobre bloqueados seguidas, con `gpt-4o` | a la 3ª, `429 rate_limit_exceeded` (cuenta de OpenAI: 30.000 TPM, ~11.000 tokens por pregunta). Manejado como `502` con mensaje limpio, sin el texto crudo de OpenAI — la app no se rompió, pero la pregunta sí quedó sin responder |
| J | 5 preguntas sobre bloqueados seguidas, con `gpt-4o-mini` | **0 errores de cuota** |

**Hallazgo, discutido con Pipe:** hay un trade-off real entre los dos modelos y **no se puede eliminar del todo con este alcance** — es una limitación del proveedor (LLM + cuenta de OpenAI), no un bug del código. Se probó agregar al prompt una instrucción de "recorré el array completo antes de responder" (7.2.a): no cambió el resultado de `gpt-4o-mini`, que sigue omitiendo `PRJ-06` de forma consistente. **Decisión con Pipe: default `gpt-4o-mini`**, priorizando que el chat aguante varias preguntas seguidas en el video sobre la precisión perfecta en listados largos — el criterio de la tarea ("responde correcto") se cumple en las preguntas de dato único (score, montos, fechas) y falla parcialmente en listados exhaustivos con más de ~10 elementos. Documentado acá para que no se lea como un defecto sin explicar si aparece en la demo.

**Decisiones tomadas al construirlo:**
- **Modelo configurable por `OPENAI_MODEL`.** La tarea no fija un modelo, y atarlo al código sería una fecha de vencimiento escrita a mano. Comentario en `.env.local` con el porqué del default.
- **`temperature: 0`**: es lectura de datos, no redacción creativa; reduce la variación entre corridas (no la elimina del todo, pero hizo que el hallazgo de arriba fuera reproducible y no un ruido aleatorio).
- **El prompt manda `projects` y `tasks` completos como JSON**, con instrucciones de responder solo con esos datos, de decir cuando no alcanzan, y de recorrer el array completo antes de responder listados. Sin librería de OpenAI (`fetch` directo a `/v1/chat/completions`): un solo endpoint no justifica una dependencia nueva.
- **Un error de red o de la API de OpenAI devuelve un texto genérico** (`502`), sin el detalle técnico de la respuesta cruda — mismo criterio que `mensajeDeError` de `actions/common.ts`.

**Novedad encontrada al desplegar (Tarea 8.2), resuelta y cerrada:** dos fallas encadenadas en producción, ninguna del código de esta tarea:

1. Con la primera `OPENAI_API_KEY` puesta en Vercel, `POST /api/chat` devolvía `502`. El log de runtime mostraba la causa exacta: `OpenAI 401 invalid_api_key` — "Incorrect API key provided", la misma llave que en `.env.local` local. La llave en sí no era válida contra la API de OpenAI (revocada o mal copiada). Resuelto pegando una llave válida.
2. Con la llave ya corregida, seguía devolviendo `502`, ahora con `OpenAI 400 "you must provide a model parameter"`. Causa: `OPENAI_MODEL` quedó cargada en Vercel **con valor vacío**, y `process.env.OPENAI_MODEL ?? 'gpt-4o-mini'` (7.2.a) solo usa el default cuando la variable está *ausente* — una cadena vacía no es `null`/`undefined`, así que `MODELO` terminó siendo `''`. Resuelto borrando la variable vacía en Vercel (ver `APRENDIZAJES.md` #22).

Las dos veces el manejo de error de 7.2.a hizo lo que tenía que hacer — devolver un `502` limpio con el detalle en el log del servidor, sin romper la app — que es lo que permitió diagnosticar cada causa desde los logs de Vercel en vez de a ciegas. **Confirmado en logs de runtime:** `POST /api/chat` → `200` a las 12:46:43 (deployment `dpl_38NxXufTcEFXxFi2K9z32cDtE4pr`), sin errores de OpenAI.

**Estado de la base al cerrar el nivel:** sin cambios — las dos tareas de este nivel solo leen. Ruta temporal de verificación borrada.

---

## Nivel 8 — Deploy

### Tarea 8.1: Variables de entorno y documentación — **Estatus: hecha**
**Archivos:**
- Crear: `.env.example`, `README.md`

**Depende de / produce:**
- Consume: todas las variables de los niveles anteriores
- Produce: instrucciones para que el evaluador levante el proyecto

**Cómo verificar que quedó bien:**
- Clonar el repo en carpeta limpia, seguir solo el README, confirmar que levanta sin pasos no documentados

- [x] 8.1.a `.env.example`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, la usa la Tarea 7.1 para saltar RLS; **sin** prefijo `NEXT_PUBLIC_`), `OPENAI_API_KEY` (opcional, comentado), `API_KEY_PROYECTOS`. **Se agregó `OPENAI_MODEL`** (comentado, opcional): no está en el checklist original, pero es una variable real que lee `app/api/chat/route.ts` (Tarea 7.2) — omitirla habría dejado un `.env.example` incompleto frente a lo que el código de verdad consume
- [x] 8.1.b README: clonar, pegar llaves de Supabase (compartidas fuera del repo), levantar en local, criterio de priorización, aclaración de que el mockup HTML y el manual de marca guían el diseño pero no son la especificación pixel-perfect

**Resultado de la verificación** (no se probó clonando en carpeta limpia — sin una segunda máquina o checkout aparte a mano en este entorno, ver la nota de abajo; se verificó lo que sí se pudo medir desde este repo):

| # | Prueba | Resultado |
|---|---|---|
| A | Las variables de `.env.example` contra `grep -r "process.env\."` en todo el código fuente (**criterio de la tarea**, primera aproximación: que el README no deje pasos sin documentar) | **6 de 6 coinciden exactamente**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `API_KEY_PROYECTOS`, `OPENAI_API_KEY`, `OPENAI_MODEL` — ninguna de más, ninguna de menos |
| B | `.gitignore` no tapa `.env.example` (`APRENDIZAJES.md` #5) | la excepción `!.env.example` ya estaba puesta desde la Tarea 0.1.c; `git status` lo muestra como archivo nuevo para trackear, no ignorado |
| C | `npm run build` después de agregar los dos archivos | compila sin errores, las 7 rutas reales (`/`, `/login`, `/proyectos`, `/proyectos/[project_code]`, `/api/proyectos`, `/api/chat`, `/_not-found`) |

**Lo que no se pudo medir en este entorno**: el criterio literal de la tarea es clonar en una carpeta limpia y seguir *solo* el README. Sin una segunda máquina disponible acá, se verificó la mitad que sí se puede medir desde este repo (prueba A: que el README no omita ninguna variable real) en vez de simular el clon. Queda pendiente de confirmar en la práctica cuando Pipe (o el evaluador) siga los pasos del README desde cero.

### Tarea 8.2: Deploy a Vercel — **Estatus: hecha**
**Archivos:** ninguno nuevo (configuración en la plataforma)

**Depende de / produce:**
- Consume: repo completo y funcional
- Produce: URL pública (opcional para el video, no exigida por el reto; el repo clonable sí lo es): `https://aztec-gestion-proyectos.vercel.app`

**Cómo verificar que quedó bien:**
- URL de Vercel carga en incógnito, login funciona ahí también

- [x] 8.2.a Deploy único, sin CI/CD continuo. Se hizo importando el repo de GitHub desde el dashboard de Vercel (proyecto `aztec-gestion-proyectos`, team `daniel-mendoza-s-projects`), no vía el CLI
- [x] 8.2.b Variables de entorno configuradas en Vercel: las 6 de `.env.example` cargadas en Production

**Resultado de la verificación** (**criterio de la tarea**: URL carga en incógnito, login funciona):

| # | Prueba | Resultado |
|---|---|---|
| A | Primer build (commit `9c4b9e9`) | Falló: prerender de `/login` tira el error de `lib/supabase/server.ts` ("Faltan NEXT_PUBLIC_SUPABASE_URL o…") — esperado, las variables todavía no estaban puestas en Vercel |
| B | Con las 6 variables cargadas y redeploy | Build en verde |
| C | **Hallazgo, no anticipado:** el proyecto traía **Vercel Authentication (SSO)** activada por default en todos los dominios `*.vercel.app` (`ssoProtection.enabled: true, all_except_custom_domains`). Con eso, la URL pública redirigía a `vercel.com/sso-api` en vez de mostrar `/login` de la app — cualquiera sin acceso a la cuenta de Vercel quedaba afuera, que es exactamente lo contrario de "carga en incógnito" | Desactivada desde Settings → Deployment Protection (no se pudo por API: el token conectado devolvía `403 forbidden` al intentar `update_project_deployment_protection`) |
| D | **URL en incógnito, después del fix** (**criterio de la tarea**) | `GET https://aztec-gestion-proyectos.vercel.app/` → `200`, HTML real de `/login` ("Entrar — Aztec", campos Usuario/Contraseña), sin la pantalla de Vercel. `get_project_deployment_protection` confirma `ssoProtection.enabled: false` |
| E | Login (**criterio de la tarea, segunda mitad**) | Código sin cambios respecto al verificado en la Tarea 5.1; confirmado en producción por Pipe con `admin`/`123` (llegó a usar el chat widget, que solo se monta con sesión activa) |

**Hallazgo de producción, no cubierto por el criterio de esta tarea pero descubierto al verificarla:** con la primera llave de `OPENAI_API_KEY` cargada, `POST /api/chat` devolvía `502` — el log de Vercel mostraba `OpenAI 401 invalid_api_key`, "Incorrect API key provided". La llave que había en `.env.local` no era válida contra la API de OpenAI (revocada o mal copiada). No bloquea el criterio de la 8.2 (no exige el chat funcionando), pero es una novedad sobre la Tarea 7.2, que había quedado "hecha" con una verificación local donde la llave sí respondía. Ver la nota agregada en la Tarea 7.2.
