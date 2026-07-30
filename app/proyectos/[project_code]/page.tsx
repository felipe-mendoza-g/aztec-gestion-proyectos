// app/proyectos/[project_code]/page.tsx — Tarea 5.3 de TAREAS.md
//
// Server Component: exige sesión, hace las tres lecturas (proyecto, sus tareas, sus
// notas) y reparte los datos entre los 5 componentes de `components/project-detail/`.
//
// `params` se `await`: en Next 16 es una promesa, igual que `cookies()` (misma razón
// por la que `createServerClient()` quedó asíncrona en la Tarea 3.1).

import { notFound } from 'next/navigation';

import { HealthBadge } from '@/components/badges';
import { BlockedBanner } from '@/components/project-detail/blocked-banner';
import { InfoModal } from '@/components/project-detail/info-modal';
import { Kanban } from '@/components/project-detail/kanban';
import { NotesPanel } from '@/components/project-detail/notes-panel';
import { Stepper } from '@/components/project-detail/stepper';
import { personasConRol } from '@/lib/forms';
import { exigirSesion } from '@/lib/session';
import type { Note, Project, Task } from '@/lib/types';

export default async function ProyectoPage({ params }: { params: Promise<{ project_code: string }> }) {
  const { project_code } = await params;
  const supabase = await exigirSesion();

  const { data: proyecto, error } = await supabase
    .from('projects')
    .select('*')
    .eq('project_code', project_code)
    .maybeSingle();

  if (error) {
    console.error(`[/proyectos/${project_code}]`, error.code, error.message, error.details);
    return (
      <p role="alert" className="rounded-xl bg-bloqueado-suave px-4 py-3 text-sm font-medium text-bloqueado">
        No se pudo cargar el proyecto. Recargá la página; si sigue igual, revisá la conexión con la base.
      </p>
    );
  }

  // Sin fila: `notFound()` y no un mensaje propio. Con sesión garantizada por
  // `exigirSesion()`, un `null` acá significa que el código no existe, no que el RLS
  // filtró (`APRENDIZAJES.md` #16: sin la puerta de sesión, las dos cosas se verían
  // igual).
  if (proyecto === null) {
    notFound();
  }

  const project = proyecto as Project;

  const [{ data: tareas }, { data: notas }, { data: asignados }] = await Promise.all([
    supabase.from('tasks').select('*').eq('project_code', project_code).order('task_code'),
    // Orden descendente acá, en la consulta: el panel de notas (5.3.e) las muestra
    // "ordenadas por fecha" y la Tarea 6.4 pide que una nota nueva aparezca al tope.
    supabase.from('notes').select('*').eq('project_code', project_code).order('created_at', { ascending: false }),
    // Los responsables posibles de una tarea (Tarea 6.2), de **todas** las tareas y
    // no solo de este proyecto: los formularios necesitan la lista de personas, no
    // las de acá. `assignee_role` viaja con el alias porque el rol se deriva de la
    // persona (decisión 2 del Nivel 6), no se pregunta.
    supabase.from('tasks').select('assignee_alias, assignee_role'),
  ]);

  const tasks = (tareas ?? []) as Task[];
  const notes = (notas ?? []) as Note[];

  // El responsable del proyecto va primero en la unión: un proyecto recién creado por
  // la Tarea 6.1 tiene 0 tareas, y sin él el `<select>` de responsable saldría vacío.
  const personas = personasConRol([
    { alias: project.owner_alias, role: project.owner_role },
    ...((asignados ?? []) as Pick<Task, 'assignee_alias' | 'assignee_role'>[]).map((fila) => ({
      alias: fila.assignee_alias,
      role: fila.assignee_role,
    })),
  ]);

  return (
    // `pb-24` deja aire para la barra fija de 5.3.g, que si no taparía el final del
    // panel de notas.
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {/* 5.3.a — código, nombre y pill, en ese orden. El pill es el mismo
              `HealthBadge` de la tabla, así que el "⚠️ Bloqueado" del criterio de
              esta tarea y el ⚠️ del criterio de la 5.2 no pueden desalinearse. */}
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-extrabold tracking-tight text-accent sm:text-2xl">
            <span className="text-primary">{project.project_code}</span>
            {project.project_name}
            <HealthBadge project={project} />
          </h1>
          <p className="mt-1 text-sm text-primary">
            {project.client_alias} · {project.owner_alias} ({project.owner_role})
          </p>
        </div>

        <InfoModal project={project} />
      </div>

      <Stepper stage={project.stage} />

      {/* Tarea 6.3: el banner es editable y **aloja la barra fija** de 5.3.g, que
          antes se renderizaba acá. Es la decisión 4 del Nivel 6: "Guardar" es el
          submit de ese formulario, así que el botón y el estado no pueden vivir en
          archivos distintos. En un proyecto no bloqueado ese componente renderiza
          solo la barra, con Guardar deshabilitado. */}
      <BlockedBanner project={project} personas={personas} />

      <Kanban project_code={project.project_code} tasks={tasks} personas={personas} />

      <NotesPanel project_code={project.project_code} notes={notes} />
    </div>
  );
}
