// components/project-detail/stepper.tsx — Tarea 5.3.b de TAREAS.md
//
// Las 4 etapas de `projects.stage` (CHECK de la Tarea 1.1.a), en orden, con la
// actual resaltada. Presentacional puro: no lleva `'use client'` porque no tiene
// estado ni eventos.

import type { Stage } from '@/lib/types';

/**
 * El orden de las etapas. Es el mismo del `CHECK` de 1.1.a, y ese orden es el que
 * decide qué etapas quedan "recorridas": todo lo anterior al índice de `stage`.
 */
const ETAPAS: Stage[] = ['Borrador', 'Descubrimiento', 'Ejecución', 'Cierre'];

/** Etapa actual en el verde profundo del manual, recorridas en verde de estado, futuras en neutro. */
function tono(esActual: boolean, recorrida: boolean): string {
  if (esActual) return 'bg-accent text-background';
  if (recorrida) return 'bg-sano-suave text-sano';
  return 'bg-primary/10 text-primary';
}

export function Stepper({ stage }: { stage: Stage }) {
  const actual = ETAPAS.indexOf(stage);

  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Etapa del proyecto">
      {ETAPAS.map((etapa, indice) => {
        const esActual = indice === actual;
        const recorrida = indice < actual;

        return (
          <li key={etapa} className="flex items-center gap-2">
            <span
              // `aria-current="step"` es lo que le dice a un lector de pantalla en
              // qué etapa está el proyecto; el color solo se lo dice a quien lo ve.
              aria-current={esActual ? 'step' : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${tono(esActual, recorrida)}`}
            >
              {recorrida && <span aria-hidden="true">✓</span>}
              {etapa}
            </span>
            {indice < ETAPAS.length - 1 && (
              <span aria-hidden="true" className="h-px w-4 bg-accent/20 sm:w-6" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
