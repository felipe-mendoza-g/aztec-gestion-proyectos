// lib/supabase/client.ts — Tarea 3.1.a de TAREAS.md
//
// Cliente de Supabase para el navegador. Lo usan los componentes con `'use client'`:
// el login de la Tarea 5.1 (`signInWithPassword`) y cualquier lectura hecha desde el
// cliente en los Niveles 5 y 6.
//
// Guarda la sesión en cookies (no en localStorage) porque es lo que hace
// `createBrowserClient` de `@supabase/ssr`. Eso es lo que permite que
// `lib/supabase/server.ts` lea la misma sesión del lado del servidor: si el login
// dejara el token solo en localStorage, el servidor llegaría siempre como `anon` y
// el RLS de la Tarea 1.4 le devolvería 0 filas.
//
// Solo se usa la llave `anon`: viaja en el bundle del navegador, así que la
// `service_role` nunca puede entrar acá (ver la consecuencia anotada en la Tarea 7.1).

import { createBrowserClient } from '@supabase/ssr';

/**
 * Crea el cliente de Supabase del navegador.
 *
 * `createBrowserClient` ya devuelve la misma instancia en llamadas sucesivas, así
 * que llamarla en varios componentes no abre varias conexiones ni duplica la sesión.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copiar `.env.example` a `.env.local` y pegar las llaves del proyecto de Supabase.',
    );
  }

  return createBrowserClient(url, anonKey);
}
