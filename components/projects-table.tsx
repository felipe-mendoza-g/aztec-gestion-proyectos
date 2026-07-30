'use client';

// components/projects-table.tsx — Tarea 5.2 de TAREAS.md (tabla, toggles, botones)
//
// Es el dueño del estado de la pantalla: filtros, columna y dirección de orden, y
// vista activa. Los datos llegan ya leídos desde el Server Component; este archivo
// no consulta la base.
//
// **Decidido con Pipe (decisión 4 del Nivel 5): el estado vive acá, en memoria, no
// en la URL.** Son 22 filas: filtrar y reordenar es instantáneo y no cuesta un
// viaje al servidor. Costo aceptado: los filtros no se comparten por link.
//
// La lógica de filtrar y ordenar está en `lib/project-list.ts` para poder medirla
// sin renderizar (ver el encabezado de ese archivo).
//
// Nota de superficie: las tarjetas y la tabla usan `bg-white`, que **no** es un
// color de marca — el manual define un solo fondo (`#F9F9F7`, el del `body`) y no
// define color de superficie. Se usa el blanco de Tailwind para separar la tabla
// del fondo cálido, sin declarar ningún hex nuevo en `globals.css`.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { cargarDatosEjemplo } from '@/actions/seed';
import { HealthBadge, PriorityBadge, StatusBadge } from '@/components/badges';
import { CreateProjectModal } from '@/components/create-project-modal';
import { FiltersForm } from '@/components/filters-form';
import { formatFecha, formatScore } from '@/lib/format';
import {
  type ColumnaOrden,
  type Direccion,
  FILTROS_VACIOS,
  type Filtros,
  ORDEN_POR_DEFECTO,
  aplicarFiltros,
  ordenar,
} from '@/lib/project-list';
import { priorityFromScore } from '@/lib/scoring';
import type { Project } from '@/lib/types';

/** Las 8 columnas de la Tarea 5.2.a, en el orden en que la tarea las enumera. */
const COLUMNAS: { clave: ColumnaOrden; etiqueta: string }[] = [
  { clave: 'project_code', etiqueta: 'Código' },
  { clave: 'project_name', etiqueta: 'Nombre' },
  { clave: 'project_type_api', etiqueta: 'Tipo' },
  { clave: 'client_alias', etiqueta: 'Cliente' },
  { clave: 'owner_alias', etiqueta: 'Responsable' },
  { clave: 'target_date', etiqueta: 'Fecha límite' },
  // Ordena por `score_proyecto`: la prioridad **es** una función del score
  // (`priorityFromScore`), así que ordenar por la etiqueta daría el mismo
  // resultado en bloques y perdería la resolución de adentro de cada bloque.
  { clave: 'score_proyecto', etiqueta: 'Salud / prioridad' },
  { clave: 'status', etiqueta: 'Estado' },
];

/** Los 3 toggles de la Tarea 5.2.e. "Estado" y "Tareas" quedan como placeholder. */
const VISTAS = [
  { clave: 'lista', etiqueta: 'Lista' },
  { clave: 'estado', etiqueta: 'Estado' },
  { clave: 'tareas', etiqueta: 'Tareas' },
] as const;

type Vista = (typeof VISTAS)[number]['clave'];

export function ProjectsTable({ projects, hoy }: { projects: Project[]; hoy: string }) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [columna, setColumna] = useState<ColumnaOrden>(ORDEN_POR_DEFECTO.columna);
  const [direccion, setDireccion] = useState<Direccion>(ORDEN_POR_DEFECTO.direccion);
  const [vista, setVista] = useState<Vista>('lista');

  const visibles = useMemo(
    () => ordenar(aplicarFiltros(projects, filtros), columna, direccion),
    [projects, filtros, columna, direccion],
  );

  // 5.2.d — con la base vacía no hay tabla ni filtros que mostrar, solo la puerta
  // de entrada al dataset de ejemplo.
  if (projects.length === 0) {
    return <EstadoVacio />;
  }

  function ordenarPor(clave: ColumnaOrden) {
    if (clave === columna) {
      setDireccion(direccion === 'asc' ? 'desc' : 'asc');
      return;
    }
    setColumna(clave);
    // Al cambiar de columna se arranca por el orden útil de esa columna: los
    // números interesan de mayor a menor (un score alto es lo urgente), los textos
    // alfabéticamente.
    setDireccion(clave === 'score_proyecto' ? 'desc' : 'asc');
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Toggles vista={vista} onVista={setVista} />
        {/* 5.2.c + Tarea 6.1: el botón abre el modal de crear proyecto. Recibe los
            proyectos **sin filtrar** porque de ahí salen los catálogos del
            formulario, que no deben achicarse cuando alguien filtra la tabla. */}
        <CreateProjectModal projects={projects} />
      </div>

      {vista !== 'lista' ? (
        <VistaPendiente />
      ) : (
        <>
          <FiltersForm
            projects={projects}
            filtros={filtros}
            onChange={setFiltros}
            onLimpiar={() => setFiltros(FILTROS_VACIOS)}
          />

          {/* El contador existe por `APRENDIZAJES.md` #16 aplicado a la UI: sin él,
              un filtro que deja 0 filas se ve igual que una base vacía. */}
          <p className="mb-2 text-sm text-primary" role="status">
            {visibles.length} de {projects.length} proyectos
          </p>

          <div className="overflow-x-auto rounded-2xl border border-accent/10 bg-white">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-accent/10">
                  {COLUMNAS.map(({ clave, etiqueta }) => (
                    <Encabezado
                      key={clave}
                      etiqueta={etiqueta}
                      activa={clave === columna}
                      direccion={direccion}
                      onClick={() => ordenarPor(clave)}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibles.map((project) => (
                  <Fila key={project.project_code} project={project} hoy={hoy} />
                ))}
              </tbody>
            </table>
          </div>

          {visibles.length === 0 && (
            <p className="mt-4 rounded-xl border border-accent/10 bg-white px-4 py-6 text-center text-sm text-primary">
              Ningún proyecto cumple estos filtros. Hay {projects.length} en total.
            </p>
          )}
        </>
      )}
    </>
  );
}

function Encabezado({
  etiqueta,
  activa,
  direccion,
  onClick,
}: {
  etiqueta: string;
  activa: boolean;
  direccion: Direccion;
  onClick: () => void;
}) {
  return (
    <th
      scope="col"
      // `aria-sort` es lo que le dice a un lector de pantalla por dónde está
      // ordenada la tabla; la flechita sola solo sirve a quien la ve.
      aria-sort={activa ? (direccion === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="whitespace-nowrap px-3 py-2 text-xs font-bold tracking-wide text-primary uppercase"
    >
      <button type="button" onClick={onClick} className="flex items-center gap-1 hover:text-accent">
        {etiqueta}
        <span aria-hidden="true" className={activa ? 'text-accent' : 'opacity-30'}>
          {activa && direccion === 'asc' ? '↑' : '↓'}
        </span>
      </button>
    </th>
  );
}

function Fila({ project, hoy }: { project: Project; hoy: string }) {
  // Se marca la fecha vencida solo en proyectos abiertos: en uno `Cerrado` la fecha
  // pasada es historia, no una alarma.
  const vencida = project.target_date !== null && project.target_date < hoy && project.status === 'Activo';

  return (
    <tr className="border-b border-accent/5 last:border-0 hover:bg-accent/[0.02]">
      <td className="px-3 py-2.5">
        {/* 5.2.a — hipervínculo en negrita. El color es `--color-link` (#0D3326) del
            manual de marca, no el azul del mockup: decisión 1 del Nivel 5, que
            cierra el pendiente que dejó abierto la Tarea 3.5. Como el link comparte
            tono con el texto, la afordancia la dan la negrita y el subrayado. */}
        <Link
          href={`/proyectos/${project.project_code}`}
          className="font-bold text-link underline-offset-2 hover:underline focus-visible:underline"
        >
          {project.project_code}
        </Link>
      </td>
      {/* "sin negrilla", tal cual lo pide 5.2.a. */}
      <td className="px-3 py-2.5 font-normal text-accent">{project.project_name}</td>
      <td className="px-3 py-2.5 text-accent">{project.project_type_api}</td>
      <td className="px-3 py-2.5 text-accent">{project.client_alias}</td>
      <td className="px-3 py-2.5">
        <span className="text-accent">{project.owner_alias}</span>
        <span className="block text-xs text-primary">{project.owner_role}</span>
      </td>
      <td className={`px-3 py-2.5 whitespace-nowrap ${vencida ? 'font-semibold text-bloqueado' : 'text-accent'}`}>
        {formatFecha(project.target_date)}
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* El ⚠️ lo decide `HealthBadge`, que es el mismo componente que usa el
              detalle (5.3.a): una sola regla para los dos criterios. */}
          <HealthBadge project={project} />
          <PriorityBadge priority={priorityFromScore(project.score_proyecto)} />
          <span className="text-xs text-primary">{formatScore(project.score_proyecto)}</span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <StatusBadge status={project.status} />
      </td>
    </tr>
  );
}

/** 5.2.e — toggles Lista / Estado / Tareas. */
function Toggles({ vista, onVista }: { vista: Vista; onVista: (vista: Vista) => void }) {
  return (
    <div role="tablist" aria-label="Vista" className="inline-flex rounded-full border border-accent/15 bg-white p-0.5">
      {VISTAS.map(({ clave, etiqueta }) => (
        <button
          key={clave}
          type="button"
          role="tab"
          aria-selected={vista === clave}
          onClick={() => onVista(clave)}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold transition-colors ${
            vista === clave ? 'bg-accent text-background' : 'text-accent hover:bg-accent/5'
          }`}
        >
          {etiqueta}
        </button>
      ))}
    </div>
  );
}

/**
 * Lo que muestran los toggles "Estado" y "Tareas". 5.2.e las declara placeholder:
 * "no se construyen a fondo salvo que sobre tiempo". Se dice así, sin rodeos, en
 * vez de dejar una pantalla en blanco que parezca un error.
 */
function VistaPendiente() {
  return (
    <p className="rounded-2xl border border-accent/10 bg-white px-4 py-10 text-center text-sm text-primary">
      Esta vista no está construida. Los mismos datos están en la vista Lista.
    </p>
  );
}

/**
 * 5.2.d — estado vacío con el botón "Cargar datos de ejemplo".
 *
 * Solo se renderiza cuando `projects` está vacía, así que el botón "visible solo si
 * `projects` está vacía" que pide la tarea se cumple por construcción: no hay una
 * condición que alguien pueda desalinear más adelante.
 *
 * Llama a `cargarDatosEjemplo()` de la Tarea 4.1, que ya verifica sesión, corta si
 * la base tiene filas y devuelve `{ok, error}` en vez de lanzar.
 */
function EstadoVacio() {
  const router = useRouter();
  const [cargando, empezarCarga] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function cargar() {
    setError(null);
    empezarCarga(async () => {
      const resultado = await cargarDatosEjemplo();
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      // La acción ya hizo `revalidatePath('/proyectos')`; `refresh()` es lo que
      // hace que este componente se vuelva a renderizar con los 22 proyectos y
      // deje de mostrar este estado vacío.
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-accent/10 bg-white px-6 py-12 text-center">
      <h2 className="text-lg font-bold text-accent">No hay proyectos todavía</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-primary">
        Cargá el dataset de ejemplo: 22 proyectos y 82 tareas, con el score de priorización calculado por la base.
      </p>

      <button
        type="button"
        onClick={cargar}
        disabled={cargando}
        className="mt-5 rounded-full bg-secondary px-5 py-2.5 text-sm font-bold text-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      >
        {cargando ? 'Cargando…' : 'Cargar datos de ejemplo'}
      </button>

      {error !== null && (
        <p role="alert" className="mx-auto mt-4 max-w-md rounded-lg bg-bloqueado-suave px-3 py-2 text-sm font-medium text-bloqueado">
          {error}
        </p>
      )}
    </div>
  );
}
