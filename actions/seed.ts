'use server';

// actions/seed.ts — Tarea 4.1 de TAREAS.md
//
// Carga los 22 proyectos y las 82 tareas de `supabase/seed-data.ts` (Nivel 2).
// La llama el botón "Cargar datos de ejemplo" de la Tarea 5.2.d, que solo se
// muestra si `projects` está vacía.
//
// Por qué las tareas van en dos pasadas (4.1.b, `APRENDIZAJES.md` #14):
// `tasks.depends_on_task_code` es una FK a `tasks.task_code` y Postgres la valida
// fila por fila. Medido sobre el array real: 9 de las 61 tareas con dependencia
// aparecen antes que la tarea de la que dependen, y `PRJ-04-T02` y `PRJ-04-T03`
// dependen la una de la otra (ciclo que trae el Excel). Con un ciclo no existe
// ningún orden de inserción que funcione: primero entran las 82 con la
// referencia en `null`, después se llenan las 61.
//
// Sobre el historial (4.1.c y 4.1.d): los triggers de la Tarea 1.3 son de solo
// `UPDATE`, así que los `INSERT` de las dos pasadas no generan ninguna fila. La
// segunda pasada sí, una por tarea con `campo='depends_on_task_code'` — 61 filas
// que 4.1.c ya declara esperadas y aceptables.

import { revalidatePath } from 'next/cache';

import type { Task } from '@/lib/types';
import { type SeedTask, dependenciasPendientes, seedProjects, seedTasks } from '@/supabase/seed-data';

import { type ActionResult, clienteConSesion, mensajeDeError } from './common';

/**
 * Pasa una tarea del seed a una fila de `tasks`: deja afuera `dependency`, el
 * texto crudo de la columna del Excel, que es la **entrada** de
 * `resolverDependencias` (Tarea 2.2) y no una columna de la tabla. El tipo de
 * retorno `Task` es lo que verifica que no falte ni sobre ninguna de las 11.
 */
function aFilaDeTarea(tarea: SeedTask): Task {
  return {
    task_code: tarea.task_code,
    project_code: tarea.project_code,
    assignee_alias: tarea.assignee_alias,
    assignee_role: tarea.assignee_role,
    priority: tarea.priority,
    status: tarea.status,
    due_date: tarea.due_date,
    is_overdue: tarea.is_overdue,
    title: tarea.title,
    detail: tarea.detail,
    depends_on_task_code: tarea.depends_on_task_code,
  };
}

/**
 * Inserta el dataset de ejemplo. Solo corre sobre una `projects` vacía (4.1.a).
 *
 * Devuelve cuántas filas quedaron insertadas de verdad, contadas sobre lo que
 * respondió la base, no sobre el largo de los arrays de entrada.
 */
export async function cargarDatosEjemplo(): Promise<ActionResult<{ proyectos: number; tareas: number }>> {
  // 4.1.b — cortar antes de tocar la base. Una dependencia sin resolver nace como
  // una tarea 'Bloqueada' equivocada en el Kanban (regla de 4.3.b), y eso no se ve
  // como un error: se ve como un dato.
  if (dependenciasPendientes.length > 0) {
    const codigos = dependenciasPendientes.map((d) => d.task_code).join(', ');
    return {
      ok: false,
      error:
        `El seed no corrió: ${dependenciasPendientes.length} dependencia(s) quedaron sin resolver ` +
        `en supabase/seed-data.ts (${codigos}). Revisarlas a mano antes de cargar los datos.`,
    };
  }

  const sesion = await clienteConSesion();
  if (!sesion.ok) return sesion;
  const { supabase } = sesion;

  // 4.1.a — verificar si `projects` ya tiene filas antes de insertar.
  const { count, error: errorConteo } = await supabase
    .from('projects')
    .select('project_code', { count: 'exact', head: true });

  if (errorConteo) {
    return { ok: false, error: mensajeDeError(errorConteo, 'No se pudo contar los proyectos existentes') };
  }
  if (count === null) {
    return { ok: false, error: 'No se pudo contar los proyectos existentes: la base no devolvió el total.' };
  }
  if (count > 0) {
    return {
      ok: false,
      error: `La base ya tiene ${count} proyecto(s). El seed solo corre sobre una base vacía.`,
    };
  }

  // ---- proyectos -----------------------------------------------------------
  // Los 22 en un solo statement: si uno falla, no entra ninguno. `score_proyecto`
  // lo escribe el trigger de INSERT de la Tarea 1.2.b (desviación de 1.2, sin la
  // cual los 22 quedarían en 0), y `open_tasks`/`overdue_tasks` los pone el
  // trigger de tareas al insertarlas abajo.
  const { data: proyectos, error: errorProyectos } = await supabase
    .from('projects')
    .insert(seedProjects)
    .select('project_code');

  if (errorProyectos) {
    return { ok: false, error: mensajeDeError(errorProyectos, 'No se pudieron insertar los proyectos') };
  }

  // ---- tareas, pasada 1: las 82 con la referencia en null -------------------
  const sinDependencia = seedTasks.map((tarea) => ({
    ...aFilaDeTarea(tarea),
    depends_on_task_code: null,
  }));

  const { data: tareas, error: errorTareas } = await supabase
    .from('tasks')
    .insert(sinDependencia)
    .select('task_code');

  if (errorTareas) {
    return {
      ok: false,
      error:
        `${mensajeDeError(errorTareas, 'No se pudieron insertar las tareas')} ` +
        `Quedaron ${proyectos.length} proyectos cargados sin sus tareas: vaciar \`projects\` antes de reintentar.`,
    };
  }

  // ---- tareas, pasada 2: llenar las 61 dependencias ------------------------
  // `upsert` con `onConflict: 'task_code'` en vez de 61 `update` sueltos: las 61
  // filas ya existen, así que las 61 caen por el camino del UPDATE, en un solo
  // viaje a la base. Reenvía todas las columnas, pero el trigger de historial
  // compara valores y no la lista del SET (verificado en la Tarea 1.3, paso 4):
  // solo `depends_on_task_code` cambió, así que salen 61 filas y no 61 × 11.
  const conDependencia = seedTasks.filter((tarea) => tarea.depends_on_task_code !== null).map(aFilaDeTarea);

  const { error: errorDependencias } = await supabase
    .from('tasks')
    .upsert(conDependencia, { onConflict: 'task_code' });

  if (errorDependencias) {
    return {
      ok: false,
      error:
        `${mensajeDeError(errorDependencias, 'No se pudieron resolver las dependencias entre tareas')} ` +
        `Los ${proyectos.length} proyectos y las ${tareas.length} tareas quedaron cargados, pero sin dependencias: ` +
        'vaciar `tasks` y `projects` antes de reintentar.',
    };
  }

  revalidatePath('/proyectos');

  return { ok: true, data: { proyectos: proyectos.length, tareas: tareas.length } };
}
