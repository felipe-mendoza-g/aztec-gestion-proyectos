'use client';

// components/site-header.tsx — header compartido de las pantallas con sesión
//
// **Archivo que TAREAS.md no lista, y el botón "Salir" tampoco está en ninguna de
// las 27 tareas. Se agregó con Pipe.** Motivo: la Tarea 5.1 hace del login un
// requisito visible del reto, y sin una salida el evaluador que entra una vez no
// puede volver a `/login` sin borrar cookies a mano — ni mostrar el login dos
// veces en el video.
//
// Es componente de cliente porque `signOut()` tiene que correr en el navegador:
// ahí es donde `@supabase/ssr` escribe y borra la cookie de sesión (Tarea 3.1,
// prueba F). Hacerlo en el servidor dejaría la cookie del navegador viva.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

export function SiteHeader() {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    await createClient().auth.signOut();
    // `refresh()` antes de navegar: tira el caché de Server Components, que se
    // renderizaron con sesión. Sin él, volver atrás mostraría los 22 proyectos
    // desde caché aunque la sesión ya no exista.
    router.refresh();
    router.replace('/login');
  }

  return (
    <header className="sticky top-0 z-20 border-b border-accent/10 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Wordmark />
        <button
          type="button"
          onClick={salir}
          disabled={saliendo}
          className="rounded-full border border-accent/15 px-3 py-1.5 text-sm font-semibold text-accent transition-colors hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          {saliendo ? 'Saliendo…' : 'Salir'}
        </button>
      </div>
    </header>
  );
}

/**
 * Wordmark de `docs/brand-guide.md` §2: "aztec" en minúsculas, trazo grueso, verde
 * profundo, con el asterisco geométrico en el verde de acento. Se dibuja en SVG y
 * no se usa un archivo de imagen porque el logo oficial no está en el repo.
 */
function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-accent">
      aztec
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 text-secondary">
        <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
        </g>
      </svg>
      <span className="sr-only">Gestión de proyectos</span>
    </span>
  );
}
