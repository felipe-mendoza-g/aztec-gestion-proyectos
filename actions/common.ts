// actions/common.ts — piezas compartidas por las Server Actions del Nivel 4
//
// **Archivo que TAREAS.md no lista.** El Nivel 4 declara 4 archivos
// (`seed.ts`, `projects.ts`, `tasks.ts`, `notes.ts`) y las 6 acciones que viven
// en ellos necesitan las mismas tres cosas: un tipo de resultado que la UI del
// Nivel 6 pueda leer, la verificación de sesión, y la traducción de los errores
// de Postgres a algo mostrable. Escribirlas 4 veces era la única alternativa.
// No agrega ninguna feature: no hay tabla, pantalla ni verbo CRUD nuevo acá.
//
// **No lleva `'use server'`**: un archivo con esa directiva solo puede exportar
// funciones async, y acá se exportan tipos. Los 4 archivos de acciones sí la
// llevan. Este módulo es de servidor de todas formas, porque importa
// `lib/supabase/server.ts`, que lee `cookies()` de `next/headers`.

import type { PostgrestError } from '@supabase/supabase-js';

import { createServerClient } from '@/lib/supabase/server';

/** El cliente que devuelve `createServerClient()`, sin repetir sus genéricos. */
export type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Lo que devuelve toda Server Action del Nivel 4.
 *
 * Unión discriminada y no una excepción, porque quien las llama es un formulario:
 * la Tarea 6.1 pide que el modal se cierre "solo tras guardar exitosamente", así
 * que el componente necesita distinguir los dos casos y tener un texto que
 * mostrar. `error` es texto para el usuario, ya limpio de detalles de Supabase.
 */
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };

/**
 * Devuelve el cliente del servidor solo si hay sesión.
 *
 * Existe por `APRENDIZAJES.md` #16: con el RLS de la Tarea 1.4, una lectura sin
 * sesión devuelve `[]` con `error: null`, indistinguible de una tabla vacía. Eso
 * rompería sobre todo a la Tarea 4.1.a ("verificar si `projects` ya tiene filas
 * antes de insertar"), que sin sesión vería 0 filas y concluiría que la base está
 * vacía. Las escrituras sí fallan solas (42501), pero con un mensaje que no
 * explica que el problema es la sesión.
 */
export async function clienteConSesion(): Promise<
  { ok: true; supabase: SupabaseServerClient } | { ok: false; error: string }
> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return { ok: false, error: 'La sesión no está activa. Volver a entrar en /login e intentar de nuevo.' };
  }

  return { ok: true, supabase };
}

/**
 * Mensajes por código de error de Postgres. Solo los que estas 6 acciones pueden
 * producir de verdad contra el esquema de la Tarea 1.1.
 */
const MENSAJES: Record<string, string> = {
  '23502': 'falta un campo obligatorio',
  '23503': 'el registro referenciado no existe',
  '23505': 'ya existe un registro con ese código',
  '23514': 'un valor no está entre los permitidos',
  '42501': 'la base rechazó la escritura por permisos (RLS): revisar que la sesión siga activa',
};

/**
 * Traduce un error de PostgREST a una frase mostrable.
 *
 * El detalle técnico va al log del servidor, no a la pantalla: es el mismo
 * criterio de la Tarea 5.1 ("error sin detalles técnicos de Supabase"), y un
 * `new row violates row-level security policy for table "projects"` no le dice
 * nada a quien está llenando un formulario.
 */
export function mensajeDeError(error: PostgrestError, contexto: string): string {
  console.error(`[${contexto}]`, error.code, error.message, error.details);

  const detalle = MENSAJES[error.code] ?? 'error inesperado de la base de datos';
  return `${contexto}: ${detalle}.`;
}

/**
 * Siguiente código consecutivo de una serie tipo `PRJ-07` o `PRJ-07-T03`.
 *
 * Ni `crearProyecto` (4.2.a) ni `crearTarea` (4.3.a) reciben la llave primaria,
 * así que hay que generarla. Se sigue el formato del dataset porque el código es
 * texto visible: hipervínculo de la tabla (5.2.a) y tarjeta del Kanban (5.3.d).
 *
 * Se calcula sobre el máximo **numérico**, no sobre el orden alfabético de los
 * códigos: `'PRJ-9' > 'PRJ-10'` como texto. Lo que no parsea a entero (por
 * ejemplo un `PRJ-RLS-TEST` sembrado a mano) se ignora en vez de romper.
 *
 * Con dos escrituras simultáneas los dos lados pueden calcular el mismo número;
 * el índice único de la PK rechaza al segundo con 23505 y el usuario reintenta.
 * Es aceptable acá: el sistema tiene un solo usuario (`admin`, Tarea 1.4.c).
 */
export function siguienteCodigo(codigos: string[], prefijo: string): string {
  const numeros = codigos
    .filter((codigo) => codigo.startsWith(prefijo))
    .map((codigo) => Number(codigo.slice(prefijo.length)))
    .filter((numero) => Number.isInteger(numero));

  const siguiente = (numeros.length > 0 ? Math.max(...numeros) : 0) + 1;
  return `${prefijo}${String(siguiente).padStart(2, '0')}`;
}

/**
 * Deja del objeto de cambios solo las llaves editables y descarta las que llegan
 * en `undefined`.
 *
 * Es el guardarraíl del criterio del `verifier` para el Nivel 4 ("el CRUD hace lo
 * que dice sin romper otros campos"): el tipo `Partial<...>` ya excluye las
 * columnas derivadas en tiempo de compilación, pero los cambios salen de un
 * formulario, y un objeto armado dinámicamente no lo revisa el compilador.
 */
export function soloCamposEditables<T extends object>(
  cambios: T,
  permitidos: readonly (keyof T)[],
): Partial<T> {
  const parche: Partial<T> = {};

  for (const campo of permitidos) {
    if (cambios[campo] !== undefined) {
      parche[campo] = cambios[campo];
    }
  }

  return parche;
}
