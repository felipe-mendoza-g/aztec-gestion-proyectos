// app/api/proyectos/route.ts — Tarea 7.1 de TAREAS.md
//
// GET público (protegido por una API key fija) con los 22 proyectos, para
// integraciones tipo n8n. Sin sesión de usuario: se llama por `curl`, con un header
// propio en vez de la cookie de Supabase Auth.
//
// **No consume `lib/supabase/server.ts`** (corregido con Pipe al cerrar la Tarea
// 3.1): esta ruta arma su propio cliente `service_role` acá adentro, después de
// validar `API_KEY_PROYECTOS`. Dos motivos:
//   · Sin sesión, el RLS de la Tarea 1.4 deja pasar la lectura como `anon` y
//     devuelve **0 filas** (no un error): con la llave `anon` esta ruta respondería
//     siempre `{proyectos: []}` sin decir por qué.
//   · Que `server.ts` no exporte un cliente `service_role` es a propósito: si lo
//     hiciera, quedaría importable desde cualquier Server Component, y el día que
//     alguien lo traiga por autocompletado se salta el RLS sin darse cuenta —
//     justo lo que la Tarea 1.4 quería evitar. La llave que salta RLS queda
//     contenida en este único archivo.
//
// **El orden importa** (7.1.c): se valida la API key primero y se corta con 401 si
// no coincide; el cliente `service_role` se crea **solo después**. Así una key mala
// nunca llega a tener una conexión con permisos elevados en la mano.

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/** El nombre del header que trae la API key fija de 7.1.b. */
const HEADER_API_KEY = 'x-api-key';

export async function GET(request: Request) {
  const key = request.headers.get(HEADER_API_KEY);

  // 7.1.b. Comparación simple: es una llave fija de un solo valor, no un secreto por
  // usuario que necesite comparación en tiempo constante.
  if (key === null || key !== process.env.API_KEY_PROYECTOS) {
    return NextResponse.json({ error: 'API key inválida o ausente.' }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (url === undefined || serviceKey === undefined || serviceKey === '') {
    // Falta configuración del servidor, no un error del que llama: 500 y no 401.
    console.error('[/api/proyectos] falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL');
    return NextResponse.json({ error: 'El servidor no tiene la conexión a la base configurada.' }, { status: 500 });
  }

  // 7.1.c — cliente propio con `service_role`, creado recién acá, después de que la
  // API key ya se validó.
  const supabase = createClient(url, serviceKey);

  const { data, error } = await supabase.from('projects').select('*').order('project_code');

  if (error) {
    console.error('[/api/proyectos]', error.code, error.message, error.details);
    return NextResponse.json({ error: 'No se pudo leer la base de datos.' }, { status: 500 });
  }

  // 7.1.a
  return NextResponse.json({ proyectos: data });
}
