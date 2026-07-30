'use server';

// actions/tasks.ts — Tarea 4.3 de TAREAS.md
//
// CRUD de tareas. Lo consume el Kanban del detalle de proyecto (Tarea 6.2).
//
// Los contadores del proyecto (`open_tasks`, `overdue_tasks`) y su
// `score_proyecto` no se tocan desde acá: los recalcula el trigger de la Tarea
// 1.2.c en cada INSERT/UPDATE/DELETE sobre `tasks`.

import { revalidatePath } from 'next/cache';

import { hoyUTC } from '@/lib/scoring';
import type { Priority, Task, TaskStatus } from '@/lib/types';

import {
  type ActionResult,
  clienteConSesion,
  mensajeDeError,
  siguienteCodigo,
  soloCamposEditables,
} from './common';

/** Los campos que recibe `crearTarea` (TAREAS.md 4.3.a). */
export type DatosNuevaTarea = {
  project_code: string;
  title: string;
  detail: string | null;
  assignee_alias: string;
  assignee_role: string;
  priority: Priority;
  due_date: string;
  /**
   * Opcional. Viene de un `<select>` con las tareas del mismo proyecto (4.3.a),
   * no de texto libre: una dependencia mal apuntada nace como una tarea
   * 'Bloqueada' equivocada y eso no se ve como un error, se ve como un dato.
   */
  depends_on_task_code?: string | null;
};

/** Cambios que acepta `actualizarTarea`: todo menos las dos llaves. */
export type CambiosTarea = Partial<Omit<Task, 'task_code' | 'project_code'>>;

/**
 * Espejo en tiempo de ejecución de `CambiosTarea`.
 *
 * `project_code` queda fuera: mover una tarea de proyecto es algo que los
 * triggers soportan (verificado en la Tarea 1.3, paso 5) pero que ninguna
 * pantalla del Nivel 6 ofrece. Si aparece, se agrega acá.
 */
const CAMPOS_EDITABLES = [
  'assignee_alias',
  'assignee_role',
  'priority',
  'status',
  'due_date',
  'is_overdue',
  'title',
  'detail',
  'depends_on_task_code',
] as const satisfies readonly (keyof CambiosTarea)[];

/**
 * Tarea 4.3.a — crea una tarea, con el estado que manda la regla de 4.3.b.
 */
export async function crearTarea(datos: DatosNuevaTarea): Promise<ActionResult<Task>> {
  const sesion = await clienteConSesion();
  if (!sesion.ok) return sesion;
  const { supabase } = sesion;

  // Una sola lectura para las dos cosas que hacen falta: los códigos ya usados
  // dentro del proyecto (para generar el siguiente) y el estado de la tarea de la
  // que se depende (para la regla de 4.3.b).
  const { data, error: errorLectura } = await supabase
    .from('tasks')
    .select('task_code, status')
    .eq('project_code', datos.project_code);

  if (errorLectura) {
    return { ok: false, error: mensajeDeError(errorLectura, 'No se pudieron leer las tareas del proyecto') };
  }

  const delProyecto = data as Pick<Task, 'task_code' | 'status'>[];
  const dependencia = datos.depends_on_task_code ?? null;
  let status: TaskStatus = 'Por hacer';

  if (dependencia !== null) {
    const origen = delProyecto.find((tarea) => tarea.task_code === dependencia);

    // El `<select>` de 4.3.a solo ofrece tareas del mismo proyecto, así que no
    // encontrarla acá significa que el código llegó por otra vía.
    if (origen === undefined) {
      return {
        ok: false,
        error: `La tarea ${dependencia} no existe dentro de ${datos.project_code}: no puede ser su dependencia.`,
      };
    }

    // 4.3.b — nace 'Bloqueada' salvo que la tarea de la que depende ya esté
    // 'Finalizada' (el quinto estado que se agregó justo para esto,
    // `APRENDIZAJES.md` #2).
    status = origen.status === 'Finalizada' ? 'Por hacer' : 'Bloqueada';
  }

  const fila: Task = {
    task_code: siguienteCodigo(
      delProyecto.map((tarea) => tarea.task_code),
      `${datos.project_code}-T`,
    ),
    project_code: datos.project_code,
    assignee_alias: datos.assignee_alias,
    assignee_role: datos.assignee_role,
    priority: datos.priority,
    status,
    due_date: datos.due_date,
    is_overdue: estaVencida(datos.due_date),
    title: datos.title,
    detail: datos.detail,
    depends_on_task_code: dependencia,
  };

  const { data: insertada, error } = await supabase.from('tasks').insert(fila).select('*').maybeSingle();

  if (error) {
    return { ok: false, error: mensajeDeError(error, 'No se pudo crear la tarea') };
  }
  if (insertada === null) {
    return { ok: false, error: 'No se pudo crear la tarea: la base no devolvió la fila insertada.' };
  }

  revalidarProyecto(datos.project_code);

  return { ok: true, data: insertada as Task };
}

/**
 * Tarea 4.3.c — aplica un parche sobre una tarea existente.
 *
 * `tasks` no tiene columnas derivadas, así que la fila que devuelve el `RETURNING`
 * del UPDATE ya es la definitiva (a diferencia de `projects`, donde el score lo
 * escribe un trigger posterior).
 */
export async function actualizarTarea(task_code: string, cambios: CambiosTarea): Promise<ActionResult<Task>> {
  const sesion = await clienteConSesion();
  if (!sesion.ok) return sesion;
  const { supabase } = sesion;

  const { data: actual, error: errorLectura } = await supabase
    .from('tasks')
    .select('*')
    .eq('task_code', task_code)
    .maybeSingle();

  if (errorLectura) {
    return { ok: false, error: mensajeDeError(errorLectura, `No se pudo leer la tarea ${task_code}`) };
  }
  if (actual === null) {
    return { ok: false, error: `No existe la tarea ${task_code}.` };
  }

  const parche: CambiosTarea = soloCamposEditables(cambios, CAMPOS_EDITABLES);

  if (Object.keys(parche).length === 0) {
    return { ok: true, data: actual as Task };
  }

  aplicarReglasDeVencimiento(parche);

  const { data, error } = await supabase
    .from('tasks')
    .update(parche)
    .eq('task_code', task_code)
    .select('*')
    .maybeSingle();

  if (error) {
    return { ok: false, error: mensajeDeError(error, `No se pudo actualizar la tarea ${task_code}`) };
  }
  // Sin fila y sin error: el RLS dejó pasar la lectura pero no la escritura
  // (`APRENDIZAJES.md` #16 aplicado a un UPDATE).
  if (data === null) {
    return { ok: false, error: `No se pudo actualizar la tarea ${task_code}: la base no aplicó el cambio.` };
  }

  revalidarProyecto((actual as Task).project_code);

  return { ok: true, data: data as Task };
}

/**
 * Mantiene `is_overdue` coherente con el resto del parche. Un `is_overdue`
 * explícito gana siempre: el llamador ya decidió.
 *
 * Dos reglas, las dos derivadas de decisiones ya tomadas y no de 4.3:
 *   · Si cambia `due_date`, se recalcula. El formulario del Kanban (6.2.a) puede
 *     mover la fecha al pasado o al futuro, y `overdue_tasks` y el score dependen
 *     de este flag.
 *   · Si la tarea pasa a 'Finalizada', deja de estar vencida. Es el mecanismo que
 *     la Tarea 1.2 dio por hecho al decidir que `overdue_tasks` cuenta
 *     `is_overdue = true` sin excluir 'Finalizada': "una tarea que se cierra
 *     debería salir de vencida bajando su propio `is_overdue`". Este es el único
 *     lugar donde puede pasar.
 */
function aplicarReglasDeVencimiento(parche: CambiosTarea): void {
  if ('is_overdue' in parche) return;

  if (parche.status === 'Finalizada') {
    parche.is_overdue = false;
    return;
  }

  if (parche.due_date !== undefined) {
    parche.is_overdue = estaVencida(parche.due_date);
  }
}

/**
 * Una tarea está vencida si su fecha límite ya pasó. La de hoy no lo está.
 *
 * La comparación es de cadenas 'YYYY-MM-DD', que para ese formato ordena igual
 * que las fechas, contra la fecha **UTC** de `lib/scoring.ts`: es la zona en la
 * que corre Postgres, y usar la local daría un día de diferencia durante 5 horas
 * de cada día en Colombia (`APRENDIZAJES.md` #19).
 */
function estaVencida(dueDate: string): boolean {
  return dueDate < hoyUTC();
}

/** El listado muestra contadores y score del proyecto, así que los dos cambian. */
function revalidarProyecto(project_code: string): void {
  revalidatePath('/proyectos');
  revalidatePath(`/proyectos/${project_code}`);
}
