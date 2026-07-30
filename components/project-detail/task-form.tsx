'use client';

// components/project-detail/task-form.tsx — Tarea 6.2 de TAREAS.md
//
// **Archivo que TAREAS.md no lista, ya anunciado.** La desviación de la Tarea 5.3 dice
// que `kanban.tsx` queda Server Component y que "la Tarea 6.2 le agrega el formulario
// como **hijo de cliente**". Es este archivo: el tablero sigue siendo servidor y solo
// estos dos disparadores viajan al navegador.
//
// **Decisión 1 del Nivel 6, con Pipe:** se construyen crear **y** editar. El título de
// la 6.2 dice "crear/editar" aunque su único checklist hable del formulario de
// dependencia, y sin editar ninguna pantalla puede mover una tarea de columna: el
// estado `Finalizada` —el que el sistema agregó para poder evaluar la regla de 4.3.b
// (`APRENDIZAJES.md` #2)— quedaría inalcanzable desde la UI.
//
// Los dos formularios son el mismo salvo en dos cosas:
//   · **crear no tiene campo de estado**: lo fija la regla de 4.3.b según la
//     dependencia, y el formulario avisa cuál va a ser antes de guardar;
//   · **editar manda solo lo que cambió** (`soloLoQueCambio`), así el trigger de
//     historial de la 1.3 registra los campos que se tocaron y ninguno más.
//
// `is_overdue` no es un campo de ninguno de los dos: lo derivan las acciones de
// `due_date`, contra la fecha **UTC** de `lib/scoring.ts` (`APRENDIZAJES.md` #19).

import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';

import { actualizarTarea, crearTarea } from '@/actions/tasks';
import {
  AccionesFormulario,
  CampoFecha,
  CampoSelect,
  CampoTexto,
  CampoTextarea,
  ErrorFormulario,
  type Opcion,
} from '@/components/form-fields';
import { Modal } from '@/components/modal';
import { type PersonaConRol, soloLoQueCambio, textoONull } from '@/lib/forms';
import type { Priority, Task, TaskStatus } from '@/lib/types';

/** Los 4 valores del `CHECK` de `tasks.priority` (1.1.b), de menor a mayor. */
const PRIORIDADES: Priority[] = ['Baja', 'Media', 'Alta', 'Crítica'];

/**
 * Los 5 valores del `CHECK` de `tasks.status` (1.1.b), en orden de flujo.
 *
 * Van escritos y no derivados de los datos, igual que el filtro de estado de 5.2.b:
 * son un enumerado del esquema. Si `Finalizada` no apareciera acá porque hoy ninguna
 * tarea lo está, el estado que el sistema agregó a propósito sería inalcanzable.
 */
const ESTADOS: TaskStatus[] = ['Por hacer', 'En progreso', 'En revisión', 'Bloqueada', 'Finalizada'];

/** Lo que el formulario tiene en pantalla. Todo texto: sale de controles. */
type Valores = {
  title: string;
  detail: string;
  assignee_alias: string;
  priority: Priority;
  status: TaskStatus;
  due_date: string;
  /** `''` = sin dependencia. */
  depends_on_task_code: string;
};

/** Las columnas de `tasks` que este formulario puede escribir, ya normalizadas. */
type CamposEditables = Pick<
  Task,
  'title' | 'detail' | 'assignee_alias' | 'assignee_role' | 'priority' | 'status' | 'due_date' | 'depends_on_task_code'
>;

type Comunes = {
  /** Las tareas del proyecto: de acá sale el `<select>` de dependencia (4.3.a). */
  tasks: Task[];
  personas: PersonaConRol[];
};

// ---------------------------------------------------------------------------
// Disparadores que cuelga el Kanban
// ---------------------------------------------------------------------------

export function NuevaTareaBoton({
  project_code,
  tasks,
  personas,
}: Comunes & {
  project_code: string;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-full bg-secondary px-3 py-1.5 text-sm font-bold text-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        + Nueva tarea
      </button>

      {abierto && (
        <DialogoCrear
          project_code={project_code}
          tasks={tasks}
          personas={personas}
          onCerrar={() => setAbierto(false)}
        />
      )}
    </>
  );
}

export function EditarTareaBoton({ task, tasks, personas }: Comunes & { task: Task }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-[11px] font-bold text-primary underline underline-offset-2 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Editar
        <span className="sr-only"> {task.task_code}</span>
      </button>

      {abierto && (
        <DialogoEditar task={task} tasks={tasks} personas={personas} onCerrar={() => setAbierto(false)} />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Crear (4.3.a + regla de nacimiento de 4.3.b)
// ---------------------------------------------------------------------------

function DialogoCrear({
  project_code,
  tasks,
  personas,
  onCerrar,
}: Comunes & {
  project_code: string;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const primerCampo = useRef<HTMLInputElement>(null);
  const [valores, setValores] = useState<Valores>({
    title: '',
    detail: '',
    assignee_alias: '',
    priority: 'Media',
    // No se muestra: lo decide la regla de 4.3.b según la dependencia elegida.
    status: 'Por hacer',
    due_date: '',
    depends_on_task_code: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  const origen = tareaOrigen(tasks, valores.depends_on_task_code);

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    const problema = validar(valores);
    if (problema !== null) {
      setError(problema);
      return;
    }

    setError(null);

    empezar(async () => {
      const resultado = await crearTarea({
        project_code,
        title: valores.title.trim(),
        detail: textoONull(valores.detail),
        assignee_alias: valores.assignee_alias,
        assignee_role: rolDe(valores.assignee_alias, personas, ''),
        priority: valores.priority,
        due_date: valores.due_date,
        depends_on_task_code: valores.depends_on_task_code === '' ? null : valores.depends_on_task_code,
      });

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      onCerrar();
      router.refresh();
    });
  }

  return (
    <Modal titulo="Nueva tarea" onCerrar={onCerrar} enfocar={primerCampo} ancho="max-w-2xl">
      <form onSubmit={enviar} className="mt-4 space-y-4">
        <Campos
          prefijo="nt"
          valores={valores}
          onChange={setValores}
          personas={personas}
          dependencias={opcionesDeDependencia(tasks, null)}
          conEstado={false}
          primerCampo={primerCampo}
        />

        {/* La regla de 4.3.b deja de ser una sorpresa: se dice qué estado va a tener
            la tarea antes de crearla. Es el criterio de verificación de esta tarea. */}
        {origen !== undefined && (
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-xs text-accent" role="status">
            {origen.status === 'Finalizada' ? (
              <>
                Va a nacer <strong className="font-bold">Por hacer</strong>: {origen.task_code} ya está Finalizada.
              </>
            ) : (
              <>
                Va a nacer <strong className="font-bold">Bloqueada</strong>: {origen.task_code} todavía no está
                Finalizada (está en {origen.status}).
              </>
            )}
          </p>
        )}

        {error !== null && <ErrorFormulario>{error}</ErrorFormulario>}

        <AccionesFormulario
          onCancelar={onCerrar}
          guardando={guardando}
          puedeGuardar
          etiquetaGuardar="Crear tarea"
        />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Editar (4.3.c)
// ---------------------------------------------------------------------------

function DialogoEditar({
  task,
  tasks,
  personas,
  onCerrar,
}: Comunes & {
  task: Task;
  onCerrar: () => void;
}) {
  const router = useRouter();
  const primerCampo = useRef<HTMLInputElement>(null);
  const [base, setBase] = useState<Valores>(valoresDe(task));
  const [valores, setValores] = useState<Valores>(valoresDe(task));
  const [error, setError] = useState<string | null>(null);
  const [guardando, empezar] = useTransition();

  const parche = soloLoQueCambio(aCampos(base, personas, task), aCampos(valores, personas, task));
  const hayCambios = Object.keys(parche).length > 0;
  const cambioLaDependencia = 'depends_on_task_code' in parche;

  function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    const problema = validar(valores);
    if (problema !== null) {
      setError(problema);
      return;
    }

    setError(null);

    empezar(async () => {
      const resultado = await actualizarTarea(task.task_code, parche);

      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      // La base pasa a ser la fila que devolvió la acción, no lo que se escribió:
      // `is_overdue` lo derivó ella, y así "hay cambios" queda en falso sin adivinar.
      setBase(valoresDe(resultado.data));
      onCerrar();
      router.refresh();
    });
  }

  return (
    <Modal titulo={`Editar ${task.task_code}`} onCerrar={onCerrar} enfocar={primerCampo} ancho="max-w-2xl">
      <form onSubmit={enviar} className="mt-4 space-y-4">
        <Campos
          prefijo={`et-${task.task_code}`}
          valores={valores}
          onChange={setValores}
          personas={personas}
          // La propia tarea no se ofrece como dependencia: la FK autorreferente la
          // aceptaría (2.2.d midió 0 autorreferencias, no las prohíbe) y una tarea
          // bloqueada por sí misma no se destraba nunca.
          dependencias={opcionesDeDependencia(tasks, task.task_code)}
          conEstado
          primerCampo={primerCampo}
        />

        {cambioLaDependencia && (
          <p className="rounded-lg bg-accent/5 px-3 py-2 text-xs text-accent">
            Cambiar la dependencia no cambia el estado: la regla de nacimiento corre solo al crear la tarea. Si
            hace falta, movelo con el campo Estado.
          </p>
        )}

        {error !== null && <ErrorFormulario>{error}</ErrorFormulario>}

        <AccionesFormulario
          onCancelar={onCerrar}
          guardando={guardando}
          puedeGuardar={hayCambios}
          motivoBloqueado="No hay cambios sin guardar"
          etiquetaGuardar="Guardar cambios"
        />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Campos compartidos por los dos modos
// ---------------------------------------------------------------------------

function Campos({
  prefijo,
  valores,
  onChange,
  personas,
  dependencias,
  conEstado,
  primerCampo,
}: {
  prefijo: string;
  valores: Valores;
  onChange: (valores: Valores) => void;
  personas: PersonaConRol[];
  dependencias: Opcion[];
  conEstado: boolean;
  primerCampo: React.RefObject<HTMLInputElement | null>;
}) {
  function cambiar<C extends keyof Valores>(campo: C, valor: Valores[C]) {
    onChange({ ...valores, [campo]: valor });
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <CampoTexto
          id={`${prefijo}-titulo`}
          etiqueta="Título"
          valor={valores.title}
          onChange={(valor) => cambiar('title', valor)}
          obligatorio
          ref={primerCampo}
        />
      </div>

      <div className="sm:col-span-2">
        <CampoTextarea
          id={`${prefijo}-detalle`}
          etiqueta="Detalle"
          valor={valores.detail}
          onChange={(valor) => cambiar('detail', valor)}
          filas={2}
        />
      </div>

      <CampoSelect
        id={`${prefijo}-responsable`}
        etiqueta="Responsable"
        valor={valores.assignee_alias}
        opciones={personas.map(({ alias, role }) => ({ valor: alias, etiqueta: `${alias} · ${role}` }))}
        onChange={(valor) => cambiar('assignee_alias', valor)}
        obligatorio
        vacia="Elegir…"
      />

      <CampoSelect
        id={`${prefijo}-prioridad`}
        etiqueta="Prioridad"
        valor={valores.priority}
        opciones={PRIORIDADES.map((prioridad) => ({ valor: prioridad, etiqueta: prioridad }))}
        onChange={(valor) => cambiar('priority', valor as Priority)}
      />

      <CampoFecha
        id={`${prefijo}-fecha`}
        etiqueta="Fecha límite"
        valor={valores.due_date}
        onChange={(valor) => cambiar('due_date', valor)}
        obligatorio
      />

      {conEstado ? (
        <CampoSelect
          id={`${prefijo}-estado`}
          etiqueta="Estado"
          valor={valores.status}
          opciones={ESTADOS.map((estado) => ({ valor: estado, etiqueta: estado }))}
          onChange={(valor) => cambiar('status', valor as TaskStatus)}
        />
      ) : (
        <div />
      )}

      <div className="sm:col-span-2">
        <CampoSelect
          id={`${prefijo}-dependencia`}
          etiqueta="Depende de"
          valor={valores.depends_on_task_code}
          opciones={dependencias}
          onChange={(valor) => cambiar('depends_on_task_code', valor)}
          vacia="Sin dependencia"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Piezas puras del formulario
// ---------------------------------------------------------------------------

function valoresDe(task: Task): Valores {
  return {
    title: task.title,
    detail: task.detail ?? '',
    assignee_alias: task.assignee_alias,
    priority: task.priority,
    status: task.status,
    due_date: task.due_date,
    depends_on_task_code: task.depends_on_task_code ?? '',
  };
}

/**
 * Los valores del formulario como columnas de `tasks`.
 *
 * `assignee_role` sale de la persona elegida (decisión 2 del nivel): no es un campo,
 * se deriva. El respaldo es el rol que la tarea ya tenía, para el caso teórico de un
 * alias que no esté en la lista — la lista se arma con los asignados de todas las
 * tareas más el responsable del proyecto, así que el actual siempre está.
 */
function aCampos(valores: Valores, personas: PersonaConRol[], task: Task): CamposEditables {
  return {
    title: valores.title.trim(),
    detail: textoONull(valores.detail),
    assignee_alias: valores.assignee_alias,
    assignee_role: rolDe(valores.assignee_alias, personas, task.assignee_role),
    priority: valores.priority,
    status: valores.status,
    due_date: valores.due_date,
    depends_on_task_code: valores.depends_on_task_code === '' ? null : valores.depends_on_task_code,
  };
}

function rolDe(alias: string, personas: PersonaConRol[], respaldo: string): string {
  return personas.find((persona) => persona.alias === alias)?.role ?? respaldo;
}

function tareaOrigen(tasks: Task[], codigo: string): Task | undefined {
  if (codigo === '') return undefined;
  return tasks.find((task) => task.task_code === codigo);
}

/**
 * Las tareas del **mismo proyecto** como opciones (4.3.a: un `<select>`, no texto
 * libre). `excluir` saca la tarea que se está editando.
 */
function opcionesDeDependencia(tasks: Task[], excluir: string | null): Opcion[] {
  return tasks
    .filter((task) => task.task_code !== excluir)
    .map((task) => ({ valor: task.task_code, etiqueta: `${task.task_code} · ${task.title}` }));
}

/** Los dos campos que `tasks` tiene como `NOT NULL` y el usuario puede dejar vacíos. */
function validar(valores: Valores): string | null {
  if (valores.title.trim() === '') return 'Falta el título de la tarea.';
  if (valores.assignee_alias === '') return 'Falta el responsable.';
  if (valores.due_date === '') return 'Falta la fecha límite.';
  return null;
}
