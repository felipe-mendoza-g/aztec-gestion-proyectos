'use client';

// components/project-detail/notes-panel.tsx — Tareas 5.3.e y 6.4 de TAREAS.md
//
// Notas ordenadas por fecha, con filtro de fecha y el campo para agregar una nueva.
// Es componente de cliente por el filtro y por el formulario: los dos son estado
// local.
//
// El orden viene ya resuelto desde la página (`created_at desc` en la consulta), así
// que la nota más nueva queda arriba sin que este archivo tenga que ordenar nada. Es
// lo que pide el criterio de la **Tarea 6.4**: "nota visible al tope del panel".
//
// El campo va **arriba de la lista**, que es donde la nota va a aparecer. Al guardar
// se limpia el campo y se pide un `refresh()`: es un re-render del árbol del servidor,
// no una recarga de la página — la otra mitad del criterio de 6.4.

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { crearNota } from '@/actions/notes';
import { ErrorFormulario } from '@/components/form-fields';
import { formatFechaHora } from '@/lib/format';
import type { Note } from '@/lib/types';

export function NotesPanel({ project_code, notes }: { project_code: string; notes: Note[] }) {
  const [desde, setDesde] = useState('');

  // Comparación de textos: `created_at` es ISO ('2026-07-30T05:04:29…') y `desde`
  // es 'YYYY-MM-DD', así que los 10 primeros caracteres son comparables tal cual,
  // sin construir ninguna fecha ni arriesgar el corrimiento de zona horaria de
  // `APRENDIZAJES.md` #19.
  const visibles = desde === '' ? notes : notes.filter((note) => note.created_at.slice(0, 10) >= desde);

  return (
    <section aria-label="Notas" className="rounded-2xl border border-accent/10 bg-white p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-bold text-accent">
          Notas <span className="font-normal text-primary">({notes.length})</span>
        </h2>

        <div>
          <label htmlFor="notas-desde" className="mb-1 block text-xs font-semibold text-primary">
            Desde
          </label>
          <input
            id="notas-desde"
            type="date"
            value={desde}
            onChange={(evento) => setDesde(evento.target.value)}
            className="rounded-lg border border-accent/15 bg-background px-2.5 py-1.5 text-sm text-accent outline-none focus:border-accent/40 focus:ring-2 focus:ring-secondary/40"
          />
        </div>
      </div>

      <NuevaNota project_code={project_code} />

      <Contenido notes={notes} visibles={visibles} />
    </section>
  );
}

/**
 * 6.4.a — campo de texto + botón "Agregar nota".
 *
 * El botón está deshabilitado con el campo vacío o de solo espacios: es la misma regla
 * que `crearNota` ya aplica (prueba B de la 4.4), puesta antes para que el error no
 * llegue a existir. La acción la sigue aplicando igual — no se confía en la UI.
 *
 * `id` y `created_at` los pone la base (defaults de la 1.1.c), así que la hora de la
 * nota no depende del reloj de esta máquina.
 */
function NuevaNota({ project_code }: { project_code: string }) {
  const router = useRouter();
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  const vacia = texto.trim() === '';

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    empezar(async () => {
      const resultado = await crearNota(project_code, texto);

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      setTexto('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="mt-4 space-y-2">
      <label htmlFor="nota-nueva" className="block text-xs font-semibold text-primary">
        Nueva nota
      </label>
      <textarea
        id="nota-nueva"
        rows={2}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        placeholder="Qué pasó, qué se decidió, qué sigue"
        className="w-full resize-y rounded-lg border border-accent/15 bg-white px-3 py-2 text-sm text-accent outline-none focus:border-accent/40 focus:ring-2 focus:ring-secondary/40"
      />

      {error !== null && <ErrorFormulario>{error}</ErrorFormulario>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={guardando || vacia}
          title={vacia ? 'Escribí algo antes de agregar la nota' : undefined}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {guardando ? 'Agregando…' : 'Agregar nota'}
        </button>
      </div>
    </form>
  );
}

/**
 * Los tres estados del panel, separados en una función en vez de encadenados en el
 * JSX: "no hay notas" y "el filtro no dejó ninguna" son mensajes distintos a
 * propósito (`APRENDIZAJES.md` #16 aplicado a la UI — una lista vacía no debería
 * poder confundirse con un filtro que no matcheó).
 */
function Contenido({ notes, visibles }: { notes: Note[]; visibles: Note[] }) {
  if (notes.length === 0) {
    return <p className="mt-4 text-sm text-primary">Este proyecto todavía no tiene notas.</p>;
  }

  if (visibles.length === 0) {
    return <p className="mt-4 text-sm text-primary">Ninguna nota desde esa fecha. Hay {notes.length} en total.</p>;
  }

  return (
    <ol className="mt-4 space-y-3">
      {visibles.map((note) => (
        <li key={note.id} className="rounded-xl border border-accent/10 bg-background p-3">
          <p className="text-sm whitespace-pre-line text-accent">{note.content}</p>
          <p className="mt-1.5 text-xs text-primary">{formatFechaHora(note.created_at)}</p>
        </li>
      ))}
    </ol>
  );
}
