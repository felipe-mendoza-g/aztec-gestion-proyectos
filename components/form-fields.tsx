'use client';

// components/form-fields.tsx — controles de formulario del Nivel 6
//
// **Archivo que TAREAS.md no lista.** Los tres formularios de escritura (6.1, 6.2,
// 6.3) usan los mismos controles con el mismo look, y la clase de marca de un
// `<input>` no puede vivir en tres archivos: el día que cambie el foco o el borde,
// cambia en uno y queda distinto en los otros dos.
//
// `components/filters-form.tsx` (Tarea 5.2.b) importa de acá **solo la constante de
// clase**. Sus controles se quedan como están: el `<select>` de un filtro tiene otra
// semántica (una opción "Todos" que significa "sin filtro"), y la 5.2 ya está
// verificada — no hay motivo para reescribirla.
//
// Ningún hex escrito acá: todo sale de los tokens de `app/globals.css` (Tarea 3.5),
// con los neutros armados con opacidad sobre `accent` y `primary`.

import type { ReactNode } from 'react';

export const CLASE_CONTROL =
  'w-full rounded-lg border border-accent/15 bg-white px-3 py-2 text-sm text-accent outline-none focus:border-accent/40 focus:ring-2 focus:ring-secondary/40';

export function Etiqueta({
  para,
  texto,
  obligatorio = false,
}: {
  para: string;
  texto: string;
  obligatorio?: boolean;
}) {
  return (
    <label htmlFor={para} className="mb-1 block text-xs font-semibold text-primary">
      {texto}
      {obligatorio && (
        <>
          {' '}
          <span aria-hidden="true" className="text-bloqueado">
            *
          </span>
          <span className="sr-only">(obligatorio)</span>
        </>
      )}
    </label>
  );
}

/**
 * Campo de texto de una línea.
 *
 * Con `sugerencias` se le cuelga un `<datalist>`: sigue siendo texto libre, pero
 * ofrece los valores que ya existen en la base. Es lo que la decisión 2 del nivel
 * pide para el cliente de un proyecto nuevo (16 sugerencias, y se puede escribir uno
 * que no esté) y para el responsable de un bloqueo (que puede no ser del equipo).
 */
export function CampoTexto({
  id,
  etiqueta,
  valor,
  onChange,
  obligatorio = false,
  sugerencias,
  placeholder,
  /** Para que un modal pueda enfocar el primer campo del formulario al abrirse. */
  ref,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  obligatorio?: boolean;
  sugerencias?: string[];
  placeholder?: string;
  ref?: React.Ref<HTMLInputElement>;
}) {
  const listaId = sugerencias === undefined ? undefined : `${id}-lista`;

  return (
    <div>
      <Etiqueta para={id} texto={etiqueta} obligatorio={obligatorio} />
      <input
        ref={ref}
        id={id}
        type="text"
        value={valor}
        list={listaId}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(evento) => onChange(evento.target.value)}
        className={CLASE_CONTROL}
      />
      {listaId !== undefined && (
        <datalist id={listaId}>
          {sugerencias?.map((sugerencia) => (
            <option key={sugerencia} value={sugerencia} />
          ))}
        </datalist>
      )}
    </div>
  );
}

/** Fecha. El valor entra y sale como 'YYYY-MM-DD', que es lo que esperan las acciones. */
export function CampoFecha({
  id,
  etiqueta,
  valor,
  onChange,
  obligatorio = false,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  obligatorio?: boolean;
}) {
  return (
    <div>
      <Etiqueta para={id} texto={etiqueta} obligatorio={obligatorio} />
      <input
        id={id}
        type="date"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className={CLASE_CONTROL}
      />
    </div>
  );
}

export type Opcion = {
  valor: string;
  etiqueta: string;
};

/**
 * Lista cerrada de opciones.
 *
 * `vacia` es el texto de la opción sin elegir; si no se pasa, el `<select>` no
 * ofrece ninguna (para un campo que siempre tiene que tener un valor, como la
 * prioridad de una tarea).
 */
export function CampoSelect({
  id,
  etiqueta,
  valor,
  opciones,
  onChange,
  obligatorio = false,
  vacia,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  opciones: Opcion[];
  onChange: (valor: string) => void;
  obligatorio?: boolean;
  vacia?: string;
}) {
  return (
    <div>
      <Etiqueta para={id} texto={etiqueta} obligatorio={obligatorio} />
      <select
        id={id}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className={CLASE_CONTROL}
      >
        {vacia !== undefined && <option value="">{vacia}</option>}
        {opciones.map((opcion) => (
          <option key={opcion.valor} value={opcion.valor}>
            {opcion.etiqueta}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CampoTextarea({
  id,
  etiqueta,
  valor,
  onChange,
  filas = 3,
  placeholder,
}: {
  id: string;
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  filas?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <Etiqueta para={id} texto={etiqueta} />
      <textarea
        id={id}
        rows={filas}
        value={valor}
        placeholder={placeholder}
        onChange={(evento) => onChange(evento.target.value)}
        className={`${CLASE_CONTROL} resize-y`}
      />
    </div>
  );
}

/**
 * El error de un formulario: el texto que devolvió la acción, tal cual.
 *
 * Ya viene limpio de detalles de Supabase (`mensajeDeError` de `actions/common.ts`),
 * así que no hay nada que traducir acá. `role="alert"` para que un lector de pantalla
 * lo anuncie sin que el usuario tenga que ir a buscarlo.
 */
export function ErrorFormulario({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-lg bg-bloqueado-suave px-3 py-2 text-sm font-medium text-bloqueado"
    >
      {children}
    </p>
  );
}

/**
 * El par Cancelar / Guardar de los dos modales de este nivel.
 *
 * "Guardar" queda deshabilitado mientras la acción está en vuelo (para que no se
 * disparen dos escrituras) y cuando no hay nada que guardar, con el motivo en el
 * `title` en vez de sin explicación.
 */
export function AccionesFormulario({
  onCancelar,
  guardando,
  puedeGuardar,
  motivoBloqueado,
  etiquetaGuardar = 'Guardar',
}: {
  onCancelar: () => void;
  guardando: boolean;
  puedeGuardar: boolean;
  motivoBloqueado?: string;
  etiquetaGuardar?: string;
}) {
  return (
    <div className="flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={onCancelar}
        disabled={guardando}
        className="rounded-full border border-accent/15 px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/5 disabled:opacity-50"
      >
        Cancelar
      </button>
      <button
        type="submit"
        disabled={guardando || !puedeGuardar}
        title={!puedeGuardar && !guardando ? motivoBloqueado : undefined}
        className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
      >
        {guardando ? 'Guardando…' : etiquetaGuardar}
      </button>
    </div>
  );
}
