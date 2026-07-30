// app/proyectos/layout.tsx — cascarón compartido de las Tareas 5.2 y 5.3
//
// **Archivo que TAREAS.md no lista.** Dos motivos, los dos concretos:
//
// 1. El header con el botón "Salir" lo necesitan las dos pantallas.
// 2. **Es el punto de montaje del widget de chat de la Tarea 7.2**, que va "en
//    todas las páginas excepto `/login`" (7.2.b) y que la 5.1.c prohíbe en la
//    pantalla de login. Colgándolo de este layout, la exclusión es estructural: no
//    hay que preguntar por la ruta en tiempo de ejecución ni acordarse de nada
//    cuando se construya el Nivel 7.
//
// **La verificación de sesión NO va acá, va en cada página** (`exigirSesion()` de
// `lib/session.ts`). Un layout no se vuelve a ejecutar en toda navegación del lado
// cliente, así que un chequeo en este archivo no sería una garantía, solo se
// vería como una.

import { ChatWidget } from '@/components/chat-widget';
import { SiteHeader } from '@/components/site-header';

export default function ProyectosLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      {/* Tarea 7.2.b — montado acá y no en app/layout.tsx: la exclusión de /login es
          estructural, esa ruta no cuelga de este layout. */}
      <ChatWidget />
    </>
  );
}
