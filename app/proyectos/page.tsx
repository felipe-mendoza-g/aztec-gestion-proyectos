// app/proyectos/page.tsx — Tarea 5.2 de TAREAS.md
//
// Server Component. Hace tres cosas y ninguna más: exige sesión, lee los
// proyectos, y se los pasa al componente de cliente que los muestra.
//
// **La lectura va en el servidor, siempre.** Con el RLS de la Tarea 1.4 llega
// autenticada por la cookie que dejó el login (Tarea 3.1, prueba C). Sin sesión
// devolvería `[]` con `error: null` —indistinguible de una base vacía
// (`APRENDIZAJES.md` #16)—, y por eso la puerta de `exigirSesion()` va **antes** de
// consultar: acá una tabla vacía tiene un significado concreto (el botón de la
// 5.2.d), así que no puede confundirse con "no hay sesión".
//
// **Nota de la Tarea 3.3:** para ordenar y filtrar alcanza con el `score_proyecto`
// que ya viene de la base; esta pantalla no llama a `calcularScore`. De
// `lib/scoring.ts` solo usa `priorityFromScore`, dentro de la tabla.

import { ProjectsTable } from '@/components/projects-table';
import { hoyUTC } from '@/lib/scoring';
import { exigirSesion } from '@/lib/session';
import type { Project } from '@/lib/types';

export const metadata = {
  title: 'Proyectos — Aztec',
};

export default async function ProyectosPage() {
  const supabase = await exigirSesion();

  // Orden inicial en la base y no en el cliente: así el HTML que se sirve ya sale
  // ordenado por score descendente, sin depender de que el JS corra. El orden por
  // click de encabezado sí es del cliente.
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('score_proyecto', { ascending: false });

  if (error) {
    console.error('[/proyectos]', error.code, error.message, error.details);
    return (
      <p role="alert" className="rounded-xl bg-bloqueado-suave px-4 py-3 text-sm font-medium text-bloqueado">
        No se pudieron cargar los proyectos. Recargá la página; si sigue igual, revisá la conexión con la base.
      </p>
    );
  }

  const projects = (data ?? []) as Project[];

  return (
    <>
      <div className="mb-5">
        <h1 className="text-2xl font-extrabold tracking-tight text-accent">Portafolio</h1>
        <p className="mt-1 text-sm text-primary">
          Ordenado por score de priorización. Lo más arriba es lo que hay que mirar primero.
        </p>
      </div>

      {/* `hoy` se calcula acá, en el servidor, y viaja como prop: si la tabla lo
          calculara sola, el HTML del servidor y el del cliente podrían caer en
          días distintos justo en la medianoche UTC y React marcaría el desajuste.
          Es la fecha UTC de `lib/scoring.ts` (`APRENDIZAJES.md` #19). */}
      <ProjectsTable projects={projects} hoy={hoyUTC()} />
    </>
  );
}
