// lib/types.ts — Tarea 3.2 de TAREAS.md
//
// Espejo exacto del esquema de `supabase/migrations/001_tables.sql` (Tarea 1.1).
// Si cambia una columna allá, cambia acá: no hay generación automática de tipos
// en este proyecto.
//
// Se construyó antes que el resto del Nivel 3 porque el seed del Nivel 2
// (`supabase/seed-data.ts`) tiene que producir arrays "tipados" y la alternativa
// era declarar las mismas 23 columnas dos veces.
//
// Convenciones de mapeo Postgres → TypeScript:
//   · date        → string en formato 'YYYY-MM-DD' (así lo entrega PostgREST)
//   · timestamptz → string ISO 8601
//   · numeric     → number
//   · columna nullable → `| null` (no `?`): la fila siempre trae la llave, con
//     valor null. `?` significaría "puede no venir la propiedad", que es otra cosa.

/** Los 4 valores de `projects.stage` (CHECK de 1.1.a). */
export type Stage = 'Borrador' | 'Descubrimiento' | 'Ejecución' | 'Cierre';

/** Los 2 valores de `projects.status`. */
export type ProjectStatus = 'Activo' | 'Cerrado';

/** Los 3 valores de `projects.health`. */
export type Health = 'Bloqueado' | 'En riesgo' | 'Sano';

/** Los 4 valores de `tasks.priority`. Es también la escala de `priorityFromScore` (Tarea 3.3). */
export type Priority = 'Baja' | 'Media' | 'Alta' | 'Crítica';

/**
 * Los 5 valores de `tasks.status`. El dataset del Excel solo usa los primeros 4;
 * 'Finalizada' es el estado que agregó el sistema para poder evaluar la regla de
 * dependencia entre tareas (ver `APRENDIZAJES.md` #2 y `TAREAS.md` 4.3.b).
 */
export type TaskStatus = 'Por hacer' | 'En progreso' | 'En revisión' | 'Bloqueada' | 'Finalizada';

/** Tabla `projects` — 23 columnas, en el mismo orden que 001_tables.sql. */
export type Project = {
  project_code: string;
  engagement_type: string;
  client_alias: string;
  project_name: string;
  project_type_api: string;
  stage: Stage;
  status: ProjectStatus;
  health: Health;
  owner_alias: string;
  owner_role: string;
  start_date: string | null;
  target_date: string | null;
  business_value: number | null;
  currency: string | null;
  business_value_usd: number | null;
  /** Derivada: la mantiene el trigger de la Tarea 1.2.c, nunca se escribe a mano. */
  open_tasks: number;
  /** Derivada: la mantiene el trigger de la Tarea 1.2.c, nunca se escribe a mano. */
  overdue_tasks: number;
  next_step: string | null;
  blocker_reason: string | null;
  blocked_since: string | null;
  blocker_owner: string | null;
  /** Derivada: la mantiene el trigger de la Tarea 1.2.b, nunca se escribe a mano. */
  score_proyecto: number;
  summary: string | null;
};

/** Tabla `tasks` — 11 columnas. */
export type Task = {
  task_code: string;
  project_code: string;
  assignee_alias: string;
  assignee_role: string;
  priority: Priority;
  status: TaskStatus;
  due_date: string;
  is_overdue: boolean;
  title: string;
  detail: string | null;
  depends_on_task_code: string | null;
};

/** Tabla `notes` — 4 columnas. */
export type Note = {
  id: string;
  project_code: string;
  content: string;
  created_at: string;
};

/**
 * Una fila de `project_history` o de `task_history`: mismas 6 columnas, cambia
 * solo la de referencia. Se modela con un solo tipo y las dos llaves opcionales
 * porque las dos tablas se leen igual en la UI (campo, antes, después, cuándo).
 */
export type HistoryEntry = {
  id: string;
  campo: string;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  changed_at: string;
  /** Presente solo si la fila viene de `project_history`. */
  project_code?: string;
  /** Presente solo si la fila viene de `task_history`. */
  task_code?: string;
};
