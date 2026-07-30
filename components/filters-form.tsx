'use client';

// components/filters-form.tsx — los 9 filtros de la Tarea 5.2.b
//
// Solo controles: no tiene estado propio ni sabe cómo se filtra. Recibe los
// valores y avisa los cambios; el estado vive en `components/projects-table.tsx` y
// la lógica en `lib/project-list.ts`. Así la parte que hay que verificar ("los
// filtros filtran de verdad") es medible sin renderizar nada.

// La clase de los controles se importa de `components/form-fields.tsx` desde el
// Nivel 6: los formularios de escritura usan los mismos, y dos definiciones del
// mismo `<input>` se desincronizan solas. Los controles de este archivo se quedan
// acá: el `<select>` de un filtro tiene una opción "Todos" que significa "sin
// filtro", que no es la semántica de un formulario.
import { CLASE_CONTROL } from '@/components/form-fields';
import type { Filtros } from '@/lib/project-list';
import { hayFiltros, opcionesDe } from '@/lib/project-list';
import type { Project } from '@/lib/types';

export function FiltersForm({
  projects,
  filtros,
  onChange,
  onLimpiar,
}: {
  /** Los proyectos **sin filtrar**: las opciones de los `<select>` no deben achicarse al filtrar. */
  projects: Project[];
  filtros: Filtros;
  onChange: (filtros: Filtros) => void;
  onLimpiar: () => void;
}) {
  function cambiar<C extends keyof Filtros>(campo: C, valor: Filtros[C]) {
    onChange({ ...filtros, [campo]: valor });
  }

  return (
    <section aria-label="Filtros" className="mb-4 rounded-2xl border border-accent/10 bg-white p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          id="f-engagement"
          etiqueta="Tipo de vínculo"
          valor={filtros.engagement_type}
          opciones={opcionesDe(projects, 'engagement_type')}
          onChange={(valor) => cambiar('engagement_type', valor)}
        />
        <Select
          id="f-tipo"
          etiqueta="Tipo de proyecto"
          valor={filtros.project_type_api}
          opciones={opcionesDe(projects, 'project_type_api')}
          onChange={(valor) => cambiar('project_type_api', valor)}
        />
        <Select
          id="f-rol"
          etiqueta="Rol del responsable"
          valor={filtros.owner_role}
          opciones={opcionesDe(projects, 'owner_role')}
          onChange={(valor) => cambiar('owner_role', valor)}
        />
        {/* Los dos únicos valores posibles de `projects.status` (CHECK de 1.1.a).
            Van escritos porque son un enumerado del esquema, no un dato del
            dataset: si un filtro derivado de los datos no ofreciera "Cerrado"
            porque hoy no hay ninguno, el filtro estaría escondiendo su propia
            existencia. */}
        <Select
          id="f-estado"
          etiqueta="Estado"
          valor={filtros.status}
          opciones={['Activo', 'Cerrado']}
          onChange={(valor) => cambiar('status', valor)}
        />

        <Campo
          id="f-apertura"
          etiqueta="Abiertos desde"
          tipo="date"
          valor={filtros.start_date_desde}
          onChange={(valor) => cambiar('start_date_desde', valor)}
        />
        <Campo
          id="f-pendientes"
          etiqueta="Tareas pendientes (mínimo)"
          tipo="number"
          valor={filtros.open_tasks_min}
          onChange={(valor) => cambiar('open_tasks_min', valor)}
        />
        <Campo
          id="f-score"
          etiqueta="Score mínimo"
          tipo="number"
          valor={filtros.score_min}
          onChange={(valor) => cambiar('score_min', valor)}
        />

        <div className="flex flex-col justify-end gap-2 pb-1">
          <Check
            id="f-vencidas"
            etiqueta="Solo con tareas vencidas"
            valor={filtros.solo_vencidas}
            onChange={(valor) => cambiar('solo_vencidas', valor)}
          />
          <Check
            id="f-bloqueos"
            etiqueta="Solo con bloqueos"
            valor={filtros.solo_bloqueos}
            onChange={(valor) => cambiar('solo_bloqueos', valor)}
          />
        </div>
      </div>

      {hayFiltros(filtros) && (
        <button
          type="button"
          onClick={onLimpiar}
          className="mt-3 text-sm font-semibold text-accent underline underline-offset-2 hover:opacity-70"
        >
          Limpiar filtros
        </button>
      )}
    </section>
  );
}

function Etiqueta({ para, texto }: { para: string; texto: string }) {
  return (
    <label htmlFor={para} className="mb-1 block text-xs font-semibold text-primary">
      {texto}
    </label>
  );
}

function Select({
  id,
  etiqueta,
  valor,
  opciones,
  onChange,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: string[];
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <Etiqueta para={id} texto={etiqueta} />
      <select id={id} value={valor} onChange={(evento) => onChange(evento.target.value)} className={CLASE_CONTROL}>
        <option value="">Todos</option>
        {opciones.map((opcion) => (
          <option key={opcion} value={opcion}>
            {opcion}
          </option>
        ))}
      </select>
    </div>
  );
}

function Campo({
  id,
  etiqueta,
  tipo,
  valor,
  onChange,
}: {
  id: string;
  etiqueta: string;
  tipo: 'date' | 'number';
  valor: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <Etiqueta para={id} texto={etiqueta} />
      <input
        id={id}
        type={tipo}
        value={valor}
        min={tipo === 'number' ? 0 : undefined}
        onChange={(evento) => onChange(evento.target.value)}
        className={CLASE_CONTROL}
      />
    </div>
  );
}

function Check({
  id,
  etiqueta,
  valor,
  onChange,
}: {
  id: string;
  etiqueta: string;
  valor: boolean;
  onChange: (valor: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-accent">
      <input
        id={id}
        type="checkbox"
        checked={valor}
        onChange={(evento) => onChange(evento.target.checked)}
        className="h-4 w-4 rounded border-accent/30 accent-secondary"
      />
      {etiqueta}
    </label>
  );
}
