-- 001_tables.sql — Tarea 1.1 de TAREAS.md
--
-- Las 5 tablas base del sistema. Acá viven SOLO las tablas:
--   · los triggers de score y contadores van en 002_triggers_score.sql   (Tarea 1.2)
--   · los triggers de historial van en 003_triggers_history.sql          (Tarea 1.3)
--   · RLS y políticas van en 004_rls.sql                                (Tarea 1.4)
--
-- Los nombres de tablas y columnas son exactamente los de TAREAS.md 1.1.a–1.1.d.
-- No se renombra nada por preferencia propia (regla global de CLAUDE.md).


-- ============================================================
-- projects — 23 columnas (TAREAS.md 1.1.a)
-- ============================================================
create table projects (
  project_code        text primary key,
  engagement_type     text    not null,
  client_alias        text    not null,
  project_name        text    not null,
  project_type_api    text    not null,
  stage               text    not null check (stage  in ('Borrador', 'Descubrimiento', 'Ejecución', 'Cierre')),
  status              text    not null check (status in ('Activo', 'Cerrado')),
  health              text    not null check (health in ('Bloqueado', 'En riesgo', 'Sano')),
  owner_alias         text    not null,
  owner_role          text    not null,
  start_date          date,
  target_date         date,
  business_value      numeric,
  -- currency queda nullable a propósito: TAREAS.md 1.1.a no la marca nullable,
  -- pero `crearProyecto` (4.2.a) y el modal (6.1.a) no la reciben, y
  -- `business_value` sí es nullable. Una moneda sin monto no significa nada, así
  -- que exigirla rompería la creación de proyectos. Desviación documentada en
  -- APRENDIZAJES.md #6, pendiente de confirmación de Pipe.
  currency            text,
  business_value_usd  numeric,
  -- Derivadas: las mantiene el trigger de la Tarea 1.2, nunca se escriben a mano.
  -- El trigger de historial (1.3) las excluye por ser derivadas.
  open_tasks          integer not null default 0,
  overdue_tasks       integer not null default 0,
  next_step           text,
  blocker_reason      text,
  blocked_since       date,
  blocker_owner       text,
  score_proyecto      numeric not null default 0,
  summary             text
);


-- ============================================================
-- tasks — 11 columnas (TAREAS.md 1.1.b)
-- ============================================================
create table tasks (
  task_code             text    primary key,
  project_code          text    not null references projects (project_code),
  assignee_alias        text    not null,
  assignee_role         text    not null,
  priority              text    not null check (priority in ('Baja', 'Media', 'Alta', 'Crítica')),
  -- 5 valores. El dataset original del Excel solo usa los primeros 4;
  -- 'Finalizada' es un valor nuevo que el sistema necesita para poder evaluar
  -- la regla de dependencia entre tareas (ver APRENDIZAJES.md #2 y TAREAS.md 4.3.b).
  status                text    not null check (status in ('Por hacer', 'En progreso', 'En revisión', 'Bloqueada', 'Finalizada')),
  due_date              date    not null,
  -- default false: una tarea recién creada no puede estar vencida, y
  -- `crearTarea` (4.3.a) no recibe este campo.
  is_overdue            boolean not null default false,
  title                 text    not null,
  detail                text,
  -- Autorreferencia: una tarea depende de otra tarea. Se llena en el seed
  -- (Tarea 2.2) y desde el <select> del Kanban (Tarea 6.2.a).
  depends_on_task_code  text    references tasks (task_code)
);


-- ============================================================
-- notes (TAREAS.md 1.1.c)
-- ============================================================
create table notes (
  id            uuid        primary key default gen_random_uuid(),
  project_code  text        not null references projects (project_code),
  content       text        not null,
  created_at    timestamptz not null default now()
);


-- ============================================================
-- project_history y task_history (TAREAS.md 1.1.d)
-- Mismo patrón, cambia solo la columna de referencia.
-- valor_anterior y valor_nuevo son nullable porque un cambio válido puede venir
-- desde NULL o ir hacia NULL (ej. blocked_since que pasa de vacío a una fecha,
-- caso explícito de la Tarea 6.3).
-- ============================================================
create table project_history (
  id              uuid        primary key default gen_random_uuid(),
  project_code    text        not null references projects (project_code),
  campo           text        not null,
  valor_anterior  text,
  valor_nuevo     text,
  changed_at      timestamptz not null default now()
);

create table task_history (
  id              uuid        primary key default gen_random_uuid(),
  task_code       text        not null references tasks (task_code),
  campo           text        not null,
  valor_anterior  text,
  valor_nuevo     text,
  changed_at      timestamptz not null default now()
);


-- ============================================================
-- Índices en las llaves foráneas
-- Postgres no los crea solo. El trigger de la Tarea 1.2.c recuenta las tareas
-- de un proyecto en cada INSERT/UPDATE/DELETE sobre `tasks`, así que
-- tasks(project_code) se consulta constantemente.
-- ============================================================
create index tasks_project_code_idx            on tasks           (project_code);
create index tasks_depends_on_task_code_idx    on tasks           (depends_on_task_code);
create index notes_project_code_idx            on notes           (project_code);
create index project_history_project_code_idx  on project_history (project_code);
create index task_history_task_code_idx        on task_history    (task_code);
