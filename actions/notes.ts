'use server';

// actions/notes.ts — Tarea 4.4 de TAREAS.md
//
// Crear notas de un proyecto. Lo consume el panel de notas del detalle (Tarea 6.4).
//
// Solo hay una acción, y es a propósito: la 4.4 pide que la nota "no sea editable
// después" (criterio de verificación de la tarea). Por eso no existe
// `actualizarNota` ni `borrarNota` — la inmutabilidad la da la ausencia de un
// verbo, no una regla escrita. `id` y `created_at` los pone la base con los
// defaults de la Tarea 1.1.c, así que la hora no depende del reloj del cliente.

import { revalidatePath } from 'next/cache';

import type { Note } from '@/lib/types';

import { type ActionResult, clienteConSesion, mensajeDeError } from './common';

/** Tarea 4.4.a — agrega una nota a un proyecto. */
export async function crearNota(project_code: string, content: string): Promise<ActionResult<Note>> {
  // `content` es NOT NULL pero el esquema acepta la cadena vacía: una nota en
  // blanco no aporta nada al historial del proyecto y no se puede borrar después.
  const texto = content.trim();
  if (texto === '') {
    return { ok: false, error: 'La nota no puede estar vacía.' };
  }

  const sesion = await clienteConSesion();
  if (!sesion.ok) return sesion;
  const { supabase } = sesion;

  const { data, error } = await supabase
    .from('notes')
    .insert({ project_code, content: texto })
    .select('*')
    .maybeSingle();

  if (error) {
    return { ok: false, error: mensajeDeError(error, `No se pudo agregar la nota a ${project_code}`) };
  }
  if (data === null) {
    return { ok: false, error: 'No se pudo agregar la nota: la base no devolvió la fila insertada.' };
  }

  // El panel de notas vive en el detalle; el listado no muestra notas.
  revalidatePath(`/proyectos/${project_code}`);

  return { ok: true, data: data as Note };
}
