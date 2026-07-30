'use client';

// components/project-detail/blocked-banner.tsx — Tareas 5.3.c y 6.3 de TAREAS.md
//
// Banner de bloqueo, ahora editable. **Se renderiza solo si `health === 'Bloqueado'`**
// — la otra mitad del criterio de la 5.3.c es que en un proyecto sano no aparezca, y
// por eso la condición vive acá adentro y no en la página: un solo lugar donde puede
// estar mal.
//
// **Este archivo también aloja la barra fija de la Tarea 5.3.g**, que antes vivía en
// `app/proyectos/[project_code]/page.tsx`. Es la decisión 4 del Nivel 6, tomada con
// Pipe: 5.3.g dejó "Guardar" deshabilitado "hasta que el Nivel 6 le dé algo que
// guardar", y lo que tiene para guardar es este formulario. Si "Guardar" es el submit
// de este formulario, el estado del formulario y el botón que lo dispara no pueden
// vivir en archivos distintos.
//
// Qué se ve, según el proyecto:
//   · `Bloqueado`  → banner editable + barra con Guardar habilitado si hay cambios
//   · otro `health` → **sin banner** (5.3.c) + barra con Guardar deshabilitado (5.3.g)
//
// **Decisión 3 del Nivel 6, con Pipe:** los 4 campos del bloqueo se editan solo acá,
// así que en los proyectos no bloqueados no hay forma de definir `next_step` desde la
// UI. Es una limitación aceptada y documentada, no un pendiente: mover ese campo
// afuera del banner habría agregado un elemento de pantalla que `TAREAS.md` no lista.
//
// Lo que el seed deja vacío es justo lo que esta tarea viene a llenar: `blocked_since`
// y `blocker_owner` porque el Excel no los trae (2.1.b), y `next_step` porque
// proponerlo es trabajo del usuario (2.1.j). Al llenar `next_step` el ⚠️ desaparece y
// el componente `health` del score baja de 100 a 70 — el circuito completo del reto.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { actualizarProyecto } from '@/actions/projects';
import {
  CampoFecha,
  CampoTexto,
  CampoTextarea,
  ErrorFormulario,
} from '@/components/form-fields';
import { type PersonaConRol, soloLoQueCambio, textoONull } from '@/lib/forms';
import { sinSiguientePaso } from '@/lib/scoring';
import type { Project } from '@/lib/types';

/** Las 4 columnas que 6.3 hace editables, en el orden en que se muestran. */
type CamposBloqueo = Pick<Project, 'blocker_reason' | 'blocked_since' | 'blocker_owner' | 'next_step'>;

/** Lo mismo, como texto: es lo que entregan los controles. */
type Valores = Record<keyof CamposBloqueo, string>;

export function BlockedBanner({ project, personas }: { project: Project; personas: PersonaConRol[] }) {
  if (project.health !== 'Bloqueado') {
    // 5.3.c: sin banner. 5.3.g: la barra sigue ahí, con Guardar deshabilitado.
    return <BarraAcciones guardando={false} hayCambios={false} onDescartar={() => {}} />;
  }

  return <Editor project={project} personas={personas} />;
}

function Editor({ project, personas }: { project: Project; personas: PersonaConRol[] }) {
  const router = useRouter();
  const [base, setBase] = useState<Valores>(valoresDe(project));
  const [valores, setValores] = useState<Valores>(valoresDe(project));
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [guardando, empezar] = useTransition();

  const parche = soloLoQueCambio(aCampos(base), aCampos(valores));
  const hayCambios = Object.keys(parche).length > 0;
  const faltaSiguientePaso = sinSiguientePaso(project);

  function cambiar<C extends keyof Valores>(campo: C, valor: string) {
    setGuardado(false);
    setValores({ ...valores, [campo]: valor });
  }

  function guardar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    empezar(async () => {
      const resultado = await actualizarProyecto(project.project_code, parche);

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      // La base pasa a ser la fila que devolvió la acción, no lo que se escribió: así
      // "hay cambios" queda en falso sin adivinar, y los textos quedan como los
      // guardó la base (recortados, y vacíos como `null`).
      setBase(valoresDe(resultado.data));
      setValores(valoresDe(resultado.data));
      setGuardado(true);
      // La acción ya revalidó las dos rutas; `refresh()` es lo que vuelve a renderizar
      // el pill de salud (con o sin ⚠️) y el score, que este `UPDATE` acaba de mover.
      router.refresh();
    });
  }

  function descartar() {
    setValores(base);
    setError(null);
    setGuardado(false);
  }

  return (
    <form onSubmit={guardar}>
      <section
        aria-label="Bloqueo"
        className="rounded-2xl border border-bloqueado/20 bg-bloqueado-suave p-4 sm:p-5"
      >
        <h2 className="flex items-center gap-2 text-sm font-bold text-bloqueado">
          <span aria-hidden="true">⚠️</span>
          Proyecto bloqueado
        </h2>

        {faltaSiguientePaso && (
          <p className="mt-1 text-xs font-semibold text-bloqueado">
            Sin siguiente paso definido. Es lo que más pesa en el score de este proyecto.
          </p>
        )}

        <div className="mt-4 space-y-3">
          <CampoTextarea
            id="bl-motivo"
            etiqueta="Motivo del bloqueo"
            valor={valores.blocker_reason}
            onChange={(valor) => cambiar('blocker_reason', valor)}
            filas={2}
            placeholder="Qué está trabando el proyecto"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <CampoFecha
              id="bl-desde"
              etiqueta="Bloqueado desde"
              valor={valores.blocked_since}
              onChange={(valor) => cambiar('blocked_since', valor)}
            />

            {/* Texto con sugerencias y no un `<select>` cerrado: un bloqueo puede
                estar del lado del cliente o de un proveedor, no solo del equipo. */}
            <CampoTexto
              id="bl-responsable"
              etiqueta="Responsable del bloqueo"
              valor={valores.blocker_owner}
              onChange={(valor) => cambiar('blocker_owner', valor)}
              sugerencias={personas.map((persona) => persona.alias)}
              placeholder="Quién lo destraba"
            />
          </div>

          <CampoTextarea
            id="bl-siguiente"
            etiqueta="Siguiente paso"
            valor={valores.next_step}
            onChange={(valor) => cambiar('next_step', valor)}
            filas={2}
            placeholder="La próxima acción concreta, con responsable si aplica"
          />
        </div>

        {error !== null && <div className="mt-3">
          <ErrorFormulario>{error}</ErrorFormulario>
        </div>}

        {guardado && !hayCambios && (
          <p role="status" className="mt-3 text-sm font-semibold text-sano">
            Cambios guardados.
          </p>
        )}
      </section>

      <BarraAcciones guardando={guardando} hayCambios={hayCambios} onDescartar={descartar} />
    </form>
  );
}

/**
 * 5.3.g — la barra fija de "Cancelar" / "Guardar", ahora conectada (decisión 4).
 *
 * "Cancelar" **mantiene su etiqueta** —5.3.g la dejó verificada con ese texto— y
 * cambia de acción: sin cambios pendientes es el link al listado que ya era; con
 * cambios pendientes los descarta y vuelve a los valores del servidor.
 *
 * Se renderiza siempre, también en un proyecto que no está bloqueado: ahí no hay
 * formulario, así que "Guardar" queda deshabilitado con el mismo `title` que tenía en
 * el Nivel 5.
 */
function BarraAcciones({
  guardando,
  hayCambios,
  onDescartar,
}: {
  guardando: boolean;
  hayCambios: boolean;
  onDescartar: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-accent/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-end gap-3 px-4 py-3 sm:px-6">
        {hayCambios ? (
          <button
            type="button"
            onClick={onDescartar}
            disabled={guardando}
            title="Descartar los cambios sin guardar"
            className="rounded-full border border-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/5 disabled:opacity-50"
          >
            Cancelar
          </button>
        ) : (
          <Link
            href="/proyectos"
            className="rounded-full border border-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/5"
          >
            Cancelar
          </Link>
        )}

        <button
          type="submit"
          disabled={guardando || !hayCambios}
          title={hayCambios ? undefined : 'No hay cambios sin guardar'}
          className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

function valoresDe(project: Project): Valores {
  return {
    blocker_reason: project.blocker_reason ?? '',
    blocked_since: project.blocked_since ?? '',
    blocker_owner: project.blocker_owner ?? '',
    next_step: project.next_step ?? '',
  };
}

/**
 * Los valores del formulario como columnas: vacío → `null`, no cadena vacía.
 *
 * Un `next_step` en `''` haría que el ⚠️ y el componente `health` del score vieran
 * "hay dato" donde no hay ninguno (ver `textoONull` en `lib/forms.ts`).
 */
function aCampos(valores: Valores): CamposBloqueo {
  return {
    blocker_reason: textoONull(valores.blocker_reason),
    blocked_since: textoONull(valores.blocked_since),
    blocker_owner: textoONull(valores.blocker_owner),
    next_step: textoONull(valores.next_step),
  };
}
