// app/login/page.tsx — Tarea 5.1 de TAREAS.md
//
// Es Server Component para poder hacer lo contrario de la puerta de
// `lib/session.ts`: **si ya hay sesión, manda al listado** en vez de volver a pedir
// credenciales. El formulario en sí es de cliente (`components/login-form.tsx`),
// porque `signInWithPassword` tiene que correr en el navegador: ahí es donde se
// escribe la cookie que después leen los Server Components de las Tareas 5.2 y 5.3
// (verificado en la Tarea 3.1, pruebas B y D).
//
// **5.1.c — sin widget de chat.** No hace falta ninguna regla: el widget de la
// Tarea 7.2 se monta en `app/proyectos/layout.tsx`, y esta ruta no cuelga de ese
// layout. La exclusión es estructural.

import { redirect } from 'next/navigation';

import { LoginForm } from '@/components/login-form';
import { haySesion } from '@/lib/session';

export const metadata = {
  title: 'Entrar — Aztec',
};

export default async function LoginPage() {
  if (await haySesion()) {
    redirect('/proyectos');
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-accent">
          aztec
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 text-secondary">
            <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
            </g>
          </svg>
        </div>

        <h1 className="text-xl font-bold text-accent">Gestión de proyectos</h1>
        {/* Tono de `docs/brand-guide.md` §7: directo, sin rodeos. */}
        <p className="mt-1 mb-6 text-sm text-primary">Entrá para ver el portafolio y sus bloqueos.</p>

        <LoginForm />
      </div>
    </div>
  );
}
