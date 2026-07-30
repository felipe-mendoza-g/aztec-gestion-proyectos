// lib/session.ts — puerta de sesión de las páginas del Nivel 5
//
// **Archivo que TAREAS.md no lista.** Resuelve la decisión que la Tarea 3.1 dejó
// abierta por escrito para este nivel: "un visitante sin sesión que entre directo
// a `/proyectos` no es redirigido… queda **abierto para el Nivel 5**".
//
// **Decidido con Pipe: se redirige a `/login`.** Y se hace acá, en la capa de
// página, no en `proxy.ts`: una redirección en el proxy rompería la API Route de
// la Tarea 7.1, que se llama por `curl` sin cookies y tiene que responder 200.
//
// Por qué no sirve `clienteConSesion` de `actions/common.ts`, que hace la misma
// pregunta: esa devuelve `{ok: false, error}` porque quien la llama es un
// formulario y necesita un texto que mostrar. Una página no muestra texto, se va
// a otra ruta. Mismo chequeo, dos formas de fallar.

import { redirect } from 'next/navigation';

import { createServerClient } from '@/lib/supabase/server';

/** El cliente que devuelve `createServerClient()`, sin repetir sus genéricos. */
type SupabaseServerClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Devuelve el cliente del servidor ya autenticado, o redirige a `/login`.
 *
 * `redirect()` de Next lanza una excepción interna que Next captura, así que
 * nunca devuelve: todo lo que venga después en la página ya tiene sesión
 * garantizada, sin un `if` extra.
 *
 * Se apoya en `getUser()` y no en `getSession()`: `getUser()` valida el token
 * contra el servidor de Auth, mientras que `getSession()` se conforma con lo que
 * diga la cookie — que es un dato que manda el navegador.
 */
export async function exigirSesion(): Promise<SupabaseServerClient> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    redirect('/login');
  }

  return supabase;
}

/**
 * `true` si hay sesión activa. Lo usa `/login` para el caso inverso: si alguien ya
 * entró y vuelve a la pantalla de login, se lo manda al listado en vez de pedirle
 * las credenciales otra vez.
 */
export async function haySesion(): Promise<boolean> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.getUser();

  return !error && data.user !== null;
}
