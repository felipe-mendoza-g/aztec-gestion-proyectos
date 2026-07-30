// app/page.tsx — raíz del sitio
//
// **Ninguna de las 27 tareas de TAREAS.md reemplaza este archivo**, pero la Tarea
// 0.1 lo creó con el boilerplate de `create-next-app` (logo de Next, "To get
// started, edit the page.tsx file", bloques `dark:` que la Tarea 3.5 sacó del
// resto del proyecto). Es la primera pantalla que ve quien abre la app, así que
// quedarse con eso era entregar el scaffold como si fuera producto. Es el patrón de
// `APRENDIZAJES.md` #4 otra vez: nadie lo tenía en su lista de "Crear".
//
// **Decidido con Pipe: `/` redirige al listado.** Con la puerta de sesión de
// `lib/session.ts`, quien no tiene sesión termina en `/login` y quien la tiene
// aterriza en `/proyectos`. Una sola puerta de entrada y ninguna pantalla huérfana.

import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/proyectos');
}
