// components/badges.tsx — badges compartidos por las Tareas 5.2 y 5.3
//
// **Archivo que TAREAS.md no lista.** Existe por una razón concreta y no por
// prolijidad: la regla del ⚠️ es criterio de verificación de **dos** tareas
// ("⚠️ solo en `health='Bloqueado'` y `next_step` vacío" en 5.2, y el pill
// "⚠️ Bloqueado" de 5.3.a). Con un badge por pantalla, las dos podrían dejar de
// coincidir sin que nada falle: la tabla mostraría el ⚠️ y el detalle no.
//
// No lleva `'use client'`: son componentes sin estado ni efectos, así que sirven
// igual dentro de un Server Component (el detalle) y dentro de uno de cliente
// (la tabla).
//
// Los colores salen de los 6 tokens de estado de `app/globals.css` (Tarea 3.5.c) y
// del gris de apoyo `--color-primary`. **Ningún hex escrito acá**: si un estado
// necesitara un color que el manual no tiene, se pregunta.

import type { Health, Priority, Project, ProjectStatus } from '@/lib/types';
import { sinSiguientePaso } from '@/lib/scoring';

/** Forma común de todos los badges: pastilla chica, texto en negrita, sin cortar. */
const BASE =
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ring-1';

/** Neutro: tinte del gris de apoyo con texto en el verde profundo del manual. */
const NEUTRO = 'bg-primary/10 text-accent ring-accent/10';

const TONO_HEALTH: Record<Health, string> = {
  Bloqueado: 'bg-bloqueado-suave text-bloqueado ring-bloqueado/20',
  'En riesgo': 'bg-riesgo-suave text-riesgo ring-riesgo/20',
  Sano: 'bg-sano-suave text-sano ring-sano/20',
};

/**
 * Prioridad y salud comparten paleta a propósito: las dos responden "qué tan
 * urgente es esto". `Media` y `Baja` quedan en neutro para que en una tabla de 22
 * filas el ojo caiga solo en lo que arde.
 */
const TONO_PRIORIDAD: Record<Priority, string> = {
  Crítica: 'bg-bloqueado-suave text-bloqueado ring-bloqueado/20',
  Alta: 'bg-riesgo-suave text-riesgo ring-riesgo/20',
  Media: NEUTRO,
  Baja: NEUTRO,
};

/**
 * Badge de salud del proyecto, con el ⚠️ cuando falta el siguiente paso.
 *
 * **Acá vive la regla que 5.2 y 5.3.a verifican**, en un solo lugar: el ⚠️ aparece
 * si y solo si `health === 'Bloqueado'` **y** `next_step` está vacío. Un proyecto
 * bloqueado que ya tiene siguiente paso muestra "Bloqueado" sin ⚠️ — el aviso es
 * sobre el hueco de gestión, no sobre el bloqueo.
 *
 * El emoji va con `aria-hidden` y el sentido en `title` + texto invisible: un ⚠️
 * suelto no le dice nada a un lector de pantalla.
 */
export function HealthBadge({ project }: { project: Pick<Project, 'health' | 'next_step'> }) {
  const alerta = project.health === 'Bloqueado' && sinSiguientePaso(project);

  return (
    <span
      className={`${BASE} ${TONO_HEALTH[project.health]}`}
      title={alerta ? 'Bloqueado sin siguiente paso definido' : undefined}
    >
      {alerta && (
        <>
          <span aria-hidden="true">⚠️</span>
          <span className="sr-only">Sin siguiente paso definido.</span>
        </>
      )}
      {project.health}
    </span>
  );
}

/**
 * Badge de prioridad. Sirve para las dos escalas, que son la misma:
 * `priorityFromScore(score_proyecto)` de un proyecto (Tarea 5.2.a) y
 * `tasks.priority` de una tarea (5.3.d).
 */
export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={`${BASE} ${TONO_PRIORIDAD[priority]}`}>{priority}</span>;
}

/** Badge de `projects.status`: abierto en verde, cerrado en neutro. */
export function StatusBadge({ status }: { status: ProjectStatus }) {
  const tono = status === 'Activo' ? 'bg-sano-suave text-sano ring-sano/20' : NEUTRO;
  return <span className={`${BASE} ${tono}`}>{status}</span>;
}
