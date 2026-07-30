// proxy.ts — Tarea 3.1.c de TAREAS.md
//
// Refresca el token de sesión de Supabase y guarda el token nuevo en la cookie.
//
// **Se llama `proxy.ts`, no `middleware.ts`.** Next 16 deprecó la convención
// `middleware` y la renombró a `proxy` (misma API: `NextRequest`, `NextResponse` y
// `config.matcher` no cambian, solo el nombre del archivo y de la función export).
// Con `middleware.ts` el dev server arranca pero avisa que la convención está
// deprecada. La documentación de Supabase todavía usa el nombre viejo.
//
// Por qué existe: el token de acceso vence (1 hora por defecto). Cuando vence,
// `@supabase/ssr` lo renueva solo usando el refresh token — pero necesita escribir
// la cookie con el token nuevo, y **un Server Component no puede escribir cookies**
// (por eso `lib/supabase/server.ts` traga el error en su `setAll`). Sin este
// archivo el token renovado se pierde en cada request, la cookie se queda con el
// vencido, y el usuario aparece deslogueado aunque su refresh token siga siendo
// válido. El proxy sí puede escribir cookies, así que es el lugar donde el refresco
// persiste. Es el patrón que prescribe la documentación de Supabase para Next.js,
// no un parche de este proyecto.
//
// Next recomienda evitar esta capa "salvo que no exista otra opción". Este es
// exactamente ese caso: no hay otro lugar en el ciclo de vida de un Server Component
// donde se pueda persistir la cookie refrescada.
//
// **No redirige a `/login`.** El ejemplo oficial incluye esa redirección, pero acá
// se dejó afuera a propósito: la API Route de la Tarea 7.1 se llama por `curl` sin
// sesión y una redirección la rompería. Proteger rutas es una decisión aparte, del
// Nivel 5, no de esta tarea.

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sin llaves configuradas se deja pasar el request en vez de tumbar el sitio
  // entero: acá un throw rompería hasta `/login`. El error claro lo dan
  // `client.ts` y `server.ts` cuando la página intenta consultar.
  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Doble escritura a propósito: en `request` para que lo que corra después
        // en este mismo request ya vea el token nuevo, y en `response` para que
        // llegue al navegador y persista. Escribir solo una de las dos deja el
        // refresco a medias.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // No meter código entre `createServerClient` y `getUser()`: es lo que dispara el
  // refresco, y cualquier `await` intermedio puede dejar la sesión a medio renovar.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Corre en todo menos archivos estáticos. Las rutas de `app/api/` quedan
  // **adentro** a propósito: el chat de la Tarea 7.2 lee `projects` con la sesión
  // del usuario y también necesita el refresco. La ruta de la 7.1 llega sin cookies,
  // así que `getUser()` corta sin llamar a la red y el request pasa intacto.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
