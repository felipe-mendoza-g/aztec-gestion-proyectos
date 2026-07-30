'use client';

// components/project-detail/info-modal.tsx — Tarea 5.3.f de TAREAS.md
//
// Modal "Info general" con los 8 campos que la tarea enumera. Cliente por el
// abrir/cerrar.
//
// El cascarón del diálogo (Escape, fondo, foco, `role="dialog"`) salió de acá a
// `components/modal.tsx` al construir el Nivel 6: los modales de 6.1 y 6.2 necesitan
// el mismo comportamiento y no tiene sentido tenerlo escrito tres veces. Lo que este
// archivo muestra no cambió.
//
// El `business_value_usd` que muestra es el que calculó `lib/currency.ts` y que
// `actualizarProyecto` mantiene sincronizado cuando cambia el monto o la moneda
// (desviación de la Tarea 4.2): acá se lee, no se recalcula, para que la pantalla y
// la columna del score no puedan mostrar números distintos.

import { useState } from 'react';

import { Modal } from '@/components/modal';
import { VACIO, formatFecha, formatMonto } from '@/lib/format';
import type { Project } from '@/lib/types';

export function InfoModal({ project }: { project: Project }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full border border-accent/15 bg-white px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Info general
      </button>

      {abierto && <Dialogo project={project} onCerrar={() => setAbierto(false)} />}
    </>
  );
}

function Dialogo({ project, onCerrar }: { project: Project; onCerrar: () => void }) {
  return (
    <Modal titulo="Info general" onCerrar={onCerrar}>
      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <Dato etiqueta="Tipo de vínculo" valor={project.engagement_type} />
        <Dato etiqueta="Tipo de proyecto" valor={project.project_type_api} />
        <Dato etiqueta="Cliente" valor={project.client_alias} />
        <Dato etiqueta="Rol del responsable" valor={project.owner_role} />
        <Dato etiqueta="Fecha de apertura" valor={formatFecha(project.start_date)} />
        <Dato etiqueta="Fecha límite" valor={formatFecha(project.target_date)} />
        <Dato etiqueta="Valor de negocio" valor={formatMonto(project.business_value, project.currency)} />
        <Dato etiqueta="Equivalente en USD" valor={formatMonto(project.business_value_usd, 'USD')} />
      </dl>

      <div className="mt-4 border-t border-accent/10 pt-3">
        <dt className="text-xs font-semibold text-primary">Resumen</dt>
        <dd className="mt-1 text-sm text-accent">{project.summary ?? VACIO}</dd>
      </div>
    </Modal>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-primary">{etiqueta}</dt>
      <dd className="mt-0.5 text-accent">{valor}</dd>
    </div>
  );
}
