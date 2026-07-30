// components/project-detail/kanban.tsx — Tarea 5.3.d de TAREAS.md
//
// Las **5 columnas reales** de `tasks.status`, incluida `Finalizada` — el quinto
// estado que el sistema agregó para poder evaluar la regla de dependencia
// (`APRENDIZAJES.md` #2). Una columna sin tareas se dibuja vacía, no se esconde: el
// criterio de la tarea es que estén las 5.
//
// **No lleva `'use client'`**: el tablero solo muestra. La Tarea 6.2 le agregó el
// formulario de crear/editar tarea, y es un hijo de cliente
// (`components/project-detail/task-form.tsx`) — no hace falta mandar todo el tablero
// al navegador para eso. Es lo que la desviación de la 5.3 había anunciado.
//
// Los colores de columna: solo `Bloqueada` y `Finalizada` llevan color, del set de
// estado de la Tarea 3.5.c. Los otros tres van en neutro. No es pereza: si las 5
// columnas tuvieran color, ninguna resaltaría, y el reto es sobre encontrar
// bloqueos. Inventar tres colores más habría significado salir del manual de marca.

import { PriorityBadge } from '@/components/badges';
import { EditarTareaBoton, NuevaTareaBoton } from '@/components/project-detail/task-form';
import { formatFecha } from '@/lib/format';
import type { PersonaConRol } from '@/lib/forms';
import type { Task, TaskStatus } from '@/lib/types';

/** Los 5 valores de `tasks.status` (CHECK de 1.1.b), en orden de flujo de trabajo. */
const COLUMNAS: TaskStatus[] = ['Por hacer', 'En progreso', 'En revisión', 'Bloqueada', 'Finalizada'];

const TONO_COLUMNA: Record<TaskStatus, string> = {
  'Por hacer': 'text-primary',
  'En progreso': 'text-primary',
  'En revisión': 'text-primary',
  Bloqueada: 'text-bloqueado',
  Finalizada: 'text-sano',
};

export function Kanban({
  project_code,
  tasks,
  personas,
}: {
  project_code: string;
  tasks: Task[];
  /** Responsables posibles: los asignados de todas las tareas más el dueño del proyecto. */
  personas: PersonaConRol[];
}) {
  return (
    <section aria-label="Tareas">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-accent">
          Tareas <span className="font-normal text-primary">({tasks.length})</span>
        </h2>

        <NuevaTareaBoton project_code={project_code} tasks={tasks} personas={personas} />
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {COLUMNAS.map((estado) => {
          const deLaColumna = tasks.filter((task) => task.status === estado);

          return (
            <div key={estado} className="flex w-64 shrink-0 flex-col rounded-2xl border border-accent/10 bg-white">
              <h3
                className={`flex items-baseline justify-between gap-2 border-b border-accent/10 px-3 py-2 text-xs font-bold tracking-wide uppercase ${TONO_COLUMNA[estado]}`}
              >
                {estado}
                <span className="text-sm font-semibold">{deLaColumna.length}</span>
              </h3>

              <div className="flex flex-1 flex-col gap-2 p-2">
                {deLaColumna.length === 0 ? (
                  <p className="px-1 py-4 text-center text-xs text-primary">Sin tareas</p>
                ) : (
                  deLaColumna.map((task) => (
                    <Tarjeta key={task.task_code} task={task} tasks={tasks} personas={personas} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Tarjeta({ task, tasks, personas }: { task: Task; tasks: Task[]; personas: PersonaConRol[] }) {
  return (
    <article className="rounded-xl border border-accent/10 bg-background p-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-bold tracking-wide text-primary">{task.task_code}</span>
        <PriorityBadge priority={task.priority} />
      </div>

      <p className="mt-1 text-sm font-medium text-accent">{task.title}</p>

      <p className="mt-1.5 text-xs text-primary">
        {task.assignee_alias} · {task.assignee_role}
      </p>

      <p className={`mt-1 text-xs ${task.is_overdue ? 'font-semibold text-bloqueado' : 'text-primary'}`}>
        Vence {formatFecha(task.due_date)}
        {task.is_overdue && ' · vencida'}
      </p>

      {/* La dependencia se muestra cuando existe (criterio de 5.3.d). Es lo que hace
          visible el ciclo `PRJ-04-T02 ↔ PRJ-04-T03` que trae el dataset y que la
          Tarea 2.2 decidió no "arreglar": en PRJ-04 las dos tarjetas se muestran
          esperándose la una a la otra, que es el cuello de botella que el reto pide
          detectar. */}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        {task.depends_on_task_code !== null ? (
          <p className="inline-flex rounded-md bg-accent/5 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
            Depende de {task.depends_on_task_code}
          </p>
        ) : (
          <span />
        )}

        {/* Tarea 6.2: el único pedazo de cliente del tablero. */}
        <EditarTareaBoton task={task} tasks={tasks} personas={personas} />
      </div>
    </article>
  );
}
