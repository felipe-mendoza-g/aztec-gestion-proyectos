'use server';

// actions/projects.ts — Tarea 4.2 de TAREAS.md
//
// CRUD de proyectos. Lo consume el modal "+ Crear proyecto" (Tarea 6.1) y el
// formulario del banner de bloqueo (Tarea 6.3).
//
// Las tres columnas derivadas —`score_proyecto`, `open_tasks`, `overdue_tasks`—
// no se escriben nunca desde acá: las mantienen los triggers de la Tarea 1.2, y
// el tipo de cambios las excluye para que ni por descuido lleguen en un parche.

import { revalidatePath } from 'next/cache';

import { convertirAUSD } from '@/lib/currency';
import type { Project } from '@/lib/types';

import {
  type ActionResult,
  type SupabaseServerClient,
  clienteConSesion,
  mensajeDeError,
  siguienteCodigo,
  soloCamposEditables,
} from './common';

/** Los 8 campos que recibe `crearProyecto` (TAREAS.md 4.2.a), ni uno más. */
export type DatosNuevoProyecto = {
  project_name: string;
  client_alias: string;
  engagement_type: string;
  project_type_api: string;
  owner_alias: string;
  owner_role: string;
  /** Nullable: el formulario de 6.1.a puede dejarla vacía. */
  start_date: string | null;
  /** Nullable — 4.2.c exige que no falle si llega `null`. */
  target_date: string | null;
};

/**
 * Una fila lista para insertar en `projects`: las 23 columnas de la Tarea 1.1.a
 * menos las 3 derivadas. Es la misma forma que `SeedProject` de
 * `supabase/seed-data.ts`; se declara acá en vez de importarla porque este
 * archivo no tiene nada que ver con el dataset del Excel.
 *
 * Está anotada a propósito: sin genéricos de base de datos, `insert()` acepta
 * cualquier objeto, así que este tipo es lo único que verifica que un proyecto
 * nuevo nazca con las 20 columnas y con los valores que 4.2.a fija.
 */
type FilaNuevoProyecto = Omit<Project, 'open_tasks' | 'overdue_tasks' | 'score_proyecto'>;

/**
 * Cambios que acepta `actualizarProyecto`. `Partial` porque 4.2.b recibe "objeto
 * parcial de cambios"; sin `project_code` (es la llave, no un campo editable) y
 * sin las 3 derivadas.
 */
export type CambiosProyecto = Partial<Omit<Project, 'project_code' | 'open_tasks' | 'overdue_tasks' | 'score_proyecto'>>;

/** Espejo en tiempo de ejecución de `CambiosProyecto`, para filtrar parches armados por un formulario. */
const CAMPOS_EDITABLES = [
  'engagement_type',
  'client_alias',
  'project_name',
  'project_type_api',
  'stage',
  'status',
  'health',
  'owner_alias',
  'owner_role',
  'start_date',
  'target_date',
  'business_value',
  'currency',
  'business_value_usd',
  'next_step',
  'blocker_reason',
  'blocked_since',
  'blocker_owner',
  'summary',
] as const satisfies readonly (keyof CambiosProyecto)[];

/**
 * Tarea 4.2.a — crea un proyecto en `Borrador`, `Activo` y `Sano`.
 *
 * `score_proyecto` no se pasa: lo calcula el trigger de INSERT de la Tarea 1.2.b.
 * Por eso la fila se vuelve a leer después de insertar (ver `leerProyecto`).
 */
export async function crearProyecto(datos: DatosNuevoProyecto): Promise<ActionResult<Project>> {
  const sesion = await clienteConSesion();
  if (!sesion.ok) return sesion;
  const { supabase } = sesion;

  const { data: existentes, error: errorCodigos } = await supabase.from('projects').select('project_code');
  if (errorCodigos) {
    return { ok: false, error: mensajeDeError(errorCodigos, 'No se pudo generar el código del proyecto') };
  }

  const project_code = siguienteCodigo(
    existentes.map((fila) => fila.project_code),
    'PRJ-',
  );

  const fila: FilaNuevoProyecto = {
    project_code,
    engagement_type: datos.engagement_type,
    client_alias: datos.client_alias,
    project_name: datos.project_name,
    project_type_api: datos.project_type_api,
    // Los tres valores que fija 4.2.a. No son parámetros: un proyecto nuevo
    // siempre nace así, y el usuario los mueve después desde el detalle.
    stage: 'Borrador',
    status: 'Activo',
    health: 'Sano',
    owner_alias: datos.owner_alias,
    owner_role: datos.owner_role,
    start_date: datos.start_date,
    target_date: datos.target_date,
    // 4.2.a no recibe el monto: el proyecto nace sin valor de negocio y se
    // completa después. `currency` quedó nullable por esto (`APRENDIZAJES.md` #6).
    business_value: null,
    currency: null,
    business_value_usd: null,
    // Vacíos a propósito: un proyecto sano recién creado no tiene bloqueo, y
    // `next_step` lo propone el usuario (mismo criterio que el seed, 2.1.j).
    next_step: null,
    blocker_reason: null,
    blocked_since: null,
    blocker_owner: null,
    summary: null,
  };

  const { error } = await supabase.from('projects').insert(fila);
  if (error) {
    return { ok: false, error: mensajeDeError(error, 'No se pudo crear el proyecto') };
  }

  revalidatePath('/proyectos');

  return leerProyecto(supabase, project_code);
}

/**
 * Tarea 4.2.b — aplica un parche sobre un proyecto existente.
 *
 * Solo escribe las llaves que llegan informadas, así que un cambio de
 * `next_step` (Tarea 6.3) no toca ninguna otra columna. Cada campo que cambie de
 * valor deja su fila en `project_history` por el trigger de la Tarea 1.3; un
 * parche que reasigna los mismos valores no genera ninguna.
 */
export async function actualizarProyecto(
  project_code: string,
  cambios: CambiosProyecto,
): Promise<ActionResult<Project>> {
  const sesion = await clienteConSesion();
  if (!sesion.ok) return sesion;
  const { supabase } = sesion;

  const actual = await leerProyecto(supabase, project_code);
  if (!actual.ok) return actual;

  const parche: CambiosProyecto = soloCamposEditables(cambios, CAMPOS_EDITABLES);

  // Nada que escribir: se devuelve la fila como está en vez de disparar un UPDATE
  // vacío. Un no-op no rompe nada (el historial compara valores) pero igual haría
  // recalcular el score.
  if (Object.keys(parche).length === 0) {
    return actual;
  }

  // `business_value_usd` es derivada de `business_value` + `currency`, y este es
  // el único lugar que puede escribir las tres. Sin esto, cambiar el monto deja el
  // equivalente en USD viejo, que es lo que muestra el modal de info (5.3.f) y lo
  // que pesa el componente de valor del score (Tarea 1.2). Un `business_value_usd`
  // explícito en el parche gana: el llamador ya decidió.
  const tocaElMonto = 'business_value' in parche || 'currency' in parche;
  if (tocaElMonto && !('business_value_usd' in parche)) {
    const monto = 'business_value' in parche ? (parche.business_value ?? null) : actual.data.business_value;
    const moneda = 'currency' in parche ? (parche.currency ?? null) : actual.data.currency;
    parche.business_value_usd = convertirAUSD(monto, moneda);
  }

  const { data: afectada, error } = await supabase
    .from('projects')
    .update(parche)
    .eq('project_code', project_code)
    .select('project_code')
    .maybeSingle();

  if (error) {
    return { ok: false, error: mensajeDeError(error, `No se pudo actualizar ${project_code}`) };
  }
  // Sin fila afectada y sin error: el RLS dejó pasar la lectura pero no la
  // escritura (`APRENDIZAJES.md` #16 aplicado a un UPDATE).
  if (afectada === null) {
    return { ok: false, error: `No se pudo actualizar ${project_code}: la base no aplicó el cambio.` };
  }

  revalidatePath('/proyectos');
  revalidatePath(`/proyectos/${project_code}`);

  return leerProyecto(supabase, project_code);
}

/**
 * Lee un proyecto completo, con las columnas derivadas ya actualizadas.
 *
 * Es una lectura aparte y no un `.select()` encadenado al INSERT/UPDATE porque
 * los triggers de la Tarea 1.2 escriben `score_proyecto` con un `update` propio,
 * posterior: el `RETURNING` del statement original devolvería el score de antes
 * (0 en un INSERT). El criterio de la 4.2 es justamente que "`score_proyecto` se
 * calcula solo", así que la fila que se devuelve tiene que traerlo real.
 */
async function leerProyecto(
  supabase: SupabaseServerClient,
  project_code: string,
): Promise<ActionResult<Project>> {
  const { data, error } = await supabase.from('projects').select('*').eq('project_code', project_code).maybeSingle();

  if (error) {
    return { ok: false, error: mensajeDeError(error, `No se pudo leer ${project_code}`) };
  }
  if (data === null) {
    return { ok: false, error: `No existe el proyecto ${project_code}.` };
  }

  return { ok: true, data: data as Project };
}
