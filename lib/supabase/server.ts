// lib/supabase/server.ts — Tarea 3.1.b de TAREAS.md
//
// Cliente de Supabase para el servidor: Server Components (Niveles 5 y 6),
// Server Actions (Nivel 4) y Route Handlers (Nivel 7). Lee la sesión de las cookies
// que dejó el login del navegador (`lib/supabase/client.ts`), así que las consultas
// llegan a Postgres como `authenticated` y el RLS de la Tarea 1.4 las deja pasar.
//
// Sin sesión el cliente llega como `anon` y el RLS devuelve 0 filas **sin error**
// (medido en la Tarea 1.4, prueba A: `200 []`). Eso es lo esperado, no una falla.
//
// Usa la llave `anon`, igual que el navegador. La `service_role` no se expone acá:
// la única pieza que la necesita es la API Route de la Tarea 7.1, que la lee de
// `process.env` dentro de la propia ruta y solo después de validar su API key.

import { createServerClient as createSupabaseServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crea el cliente de Supabase del servidor, atado a las cookies del request actual.
 *
 * **Es asíncrona**: en Next 16 `cookies()` devuelve una promesa, así que hay que
 * `await` en el punto de uso — `const supabase = await createServerClient()`.
 * No se puede guardar el resultado en una constante de módulo: cada request trae
 * sus propias cookies.
 */
export async function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
        'Copiar `.env.example` a `.env.local` y pegar las llaves del proyecto de Supabase.',
    );
  }

  const cookieStore = await cookies();

  return createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies: Next solo lo permite en
          // Server Actions y Route Handlers. Se ignora a propósito — la sesión se
          // renueva igual en la próxima escritura que sí tenga permiso.
        }
      },
    },
  });
}
