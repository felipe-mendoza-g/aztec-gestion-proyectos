'use client';

// components/create-project-modal.tsx — Tarea 6.1 de TAREAS.md
//
// El modal "+ Crear proyecto". Reemplaza al botón inerte que el Nivel 5 entregó a
// propósito (5.2.c, §8 de su diseño): ese aviso —"Todavía no se puede crear proyectos
// desde acá"— desaparece con esta tarea.
//
// **Decisión 2 del Nivel 6, con Pipe:** `crearProyecto` (4.2.a) exige 8 campos y el
// checklist 6.1.a lista 7. El que falta es `owner_role`, que es `NOT NULL`. En vez de
// agregar un campo, **el rol se deriva de la persona elegida**: medido sobre el
// dataset, cada una de las 6 personas tiene un solo rol. El `<select>` muestra el rol
// en la etiqueta de la opción, así que lo que se va a guardar está a la vista.
//
// Los catálogos que alimentan los filtros del listado (5.2.b) van como `<select>`
// cerrado —un valor nuevo dejaría una opción suelta en el filtro—; el cliente va como
// texto con sugerencias, porque un proyecto nuevo puede ser de un cliente nuevo.
//
// `stage`, `status` y `health` no están en el formulario: los fija `crearProyecto` en
// Borrador / Activo / Sano, que es justo el criterio de verificación de esta tarea.

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import {
  AccionesFormulario,
  CampoFecha,
  CampoSelect,
  CampoTexto,
  ErrorFormulario,
  type Opcion,
} from '@/components/form-fields';
import { Modal } from '@/components/modal';
import { crearProyecto } from '@/actions/projects';
import { personasConRol } from '@/lib/forms';
import { opcionesDe } from '@/lib/project-list';
import type { Project } from '@/lib/types';

export function CreateProjectModal({ projects }: { projects: Project[] }) {
  const [abierto, setAbierto] = useState(false);
  const [creado, setCreado] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {creado !== null && (
        <span role="status" className="text-sm font-semibold text-sano">
          {creado} creado.
        </span>
      )}

      <button
        type="button"
        onClick={() => {
          setCreado(null);
          setAbierto(true);
        }}
        className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        + Crear proyecto
      </button>

      {abierto && (
        <Formulario
          projects={projects}
          onCerrar={() => setAbierto(false)}
          onCreado={(project_code) => {
            // El modal se cierra **solo tras guardar exitosamente**, criterio literal
            // de la tarea. Un error lo deja abierto con lo que el usuario escribió.
            setCreado(project_code);
            setAbierto(false);
          }}
        />
      )}
    </div>
  );
}

/** Los 7 campos de 6.1.a. El octavo (`owner_role`) se deriva de `owner_alias`. */
type Valores = {
  project_name: string;
  client_alias: string;
  engagement_type: string;
  project_type_api: string;
  owner_alias: string;
  start_date: string;
  target_date: string;
};

const VALORES_VACIOS: Valores = {
  project_name: '',
  client_alias: '',
  engagement_type: '',
  project_type_api: '',
  owner_alias: '',
  start_date: '',
  target_date: '',
};

function Formulario({
  projects,
  onCerrar,
  onCreado,
}: {
  projects: Project[];
  onCerrar: () => void;
  onCreado: (project_code: string) => void;
}) {
  const router = useRouter();
  const [valores, setValores] = useState<Valores>(VALORES_VACIOS);
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();
  const primerCampo = useRef<HTMLInputElement>(null);

  // Las opciones se derivan de los 22 proyectos que ya trajo el Server Component: si
  // el dataset cambia, cambian con él (mismo criterio que los filtros de 5.2.b).
  const personas = personasConRol(
    projects.map((project) => ({ alias: project.owner_alias, role: project.owner_role })),
  );
  const clientes = [...new Set(projects.map((project) => project.client_alias))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );

  function cambiar<C extends keyof Valores>(campo: C, valor: Valores[C]) {
    setValores({ ...valores, [campo]: valor });
  }

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    const problema = validar(valores);
    if (problema !== null) {
      setError(problema);
      return;
    }

    const persona = personas.find((candidata) => candidata.alias === valores.owner_alias);
    if (persona === undefined) {
      setError('Elegí un responsable de la lista.');
      return;
    }

    setError(null);

    empezar(async () => {
      const resultado = await crearProyecto({
        project_name: valores.project_name.trim(),
        client_alias: valores.client_alias.trim(),
        engagement_type: valores.engagement_type,
        project_type_api: valores.project_type_api,
        owner_alias: persona.alias,
        // El campo que 6.1.a no pide y el esquema exige (decisión 2 del nivel).
        owner_role: persona.role,
        // Las dos fechas son opcionales: 4.2.c exige que la acción no falle con
        // `null`, y eso ya quedó verificado en la prueba A de la 4.2.
        start_date: valores.start_date === '' ? null : valores.start_date,
        target_date: valores.target_date === '' ? null : valores.target_date,
      });

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      onCreado(resultado.data.project_code);
      // La acción ya hizo `revalidatePath('/proyectos')`; `refresh()` es lo que vuelve
      // a renderizar la tabla con la fila nueva, en la posición que le da su score.
      router.refresh();
    });
  }

  return (
    <Modal titulo="Crear proyecto" onCerrar={onCerrar} enfocar={primerCampo} ancho="max-w-2xl">
      <form onSubmit={enviar} className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <CampoTexto
              id="np-nombre"
              etiqueta="Nombre del proyecto"
              valor={valores.project_name}
              onChange={(valor) => cambiar('project_name', valor)}
              obligatorio
              ref={primerCampo}
            />
          </div>

          <CampoTexto
            id="np-cliente"
            etiqueta="Cliente"
            valor={valores.client_alias}
            onChange={(valor) => cambiar('client_alias', valor)}
            obligatorio
            sugerencias={clientes}
            placeholder="Existente o nuevo"
          />

          <CampoSelect
            id="np-responsable"
            etiqueta="Responsable"
            valor={valores.owner_alias}
            opciones={opcionesDePersonas(personas)}
            onChange={(valor) => cambiar('owner_alias', valor)}
            obligatorio
            vacia="Elegir…"
          />

          <CampoSelect
            id="np-vinculo"
            etiqueta="Tipo de vínculo"
            valor={valores.engagement_type}
            opciones={aOpciones(opcionesDe(projects, 'engagement_type'))}
            onChange={(valor) => cambiar('engagement_type', valor)}
            obligatorio
            vacia="Elegir…"
          />

          <CampoSelect
            id="np-tipo"
            etiqueta="Tipo de proyecto"
            valor={valores.project_type_api}
            opciones={aOpciones(opcionesDe(projects, 'project_type_api'))}
            onChange={(valor) => cambiar('project_type_api', valor)}
            obligatorio
            vacia="Elegir…"
          />

          <CampoFecha
            id="np-apertura"
            etiqueta="Fecha de apertura"
            valor={valores.start_date}
            onChange={(valor) => cambiar('start_date', valor)}
          />

          <CampoFecha
            id="np-limite"
            etiqueta="Fecha límite"
            valor={valores.target_date}
            onChange={(valor) => cambiar('target_date', valor)}
          />
        </div>

        <p className="text-xs text-primary">
          Nace en <strong className="font-semibold text-accent">Borrador</strong>, activo y sano. El score de
          priorización lo calcula la base.
        </p>

        {error !== null && <ErrorFormulario>{error}</ErrorFormulario>}

        <AccionesFormulario
          onCancelar={onCerrar}
          guardando={guardando}
          puedeGuardar
          etiquetaGuardar="Crear proyecto"
        />
      </form>
    </Modal>
  );
}

/**
 * Los 5 obligatorios son las 5 columnas `NOT NULL` que la acción no puede inventar.
 *
 * La última regla no la pide ninguna tarea y el esquema no tiene ese `CHECK`: un
 * proyecto que vence antes de abrir no es un dato raro, es un error de tipeo, y la
 * acción lo guardaría igual.
 */
function validar(valores: Valores): string | null {
  if (valores.project_name.trim() === '') return 'Falta el nombre del proyecto.';
  if (valores.client_alias.trim() === '') return 'Falta el cliente.';
  if (valores.engagement_type === '') return 'Falta el tipo de vínculo.';
  if (valores.project_type_api === '') return 'Falta el tipo de proyecto.';
  if (valores.owner_alias === '') return 'Falta el responsable.';

  if (valores.start_date !== '' && valores.target_date !== '' && valores.target_date < valores.start_date) {
    return 'La fecha límite no puede ser anterior a la de apertura.';
  }

  return null;
}

function aOpciones(valores: string[]): Opcion[] {
  return valores.map((valor) => ({ valor, etiqueta: valor }));
}

/** La etiqueta trae el rol porque es el dato que se va a guardar sin preguntarlo. */
function opcionesDePersonas(personas: { alias: string; role: string }[]): Opcion[] {
  return personas.map(({ alias, role }) => ({ valor: alias, etiqueta: `${alias} · ${role}` }));
}
