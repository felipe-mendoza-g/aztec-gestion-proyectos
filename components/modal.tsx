'use client';

// components/modal.tsx — cascarón de diálogo compartido
//
// **Archivo que TAREAS.md no lista.** El comportamiento de un modal —cierra con
// Escape, cierra con click en el fondo, cierra con su botón, `role="dialog"` +
// `aria-modal`, foco al abrir— estaba escrito suelto adentro de `info-modal.tsx`
// (Tarea 5.3.f). El Nivel 6 agrega dos modales más: el de crear proyecto (6.1) y el
// de crear/editar tarea (6.2). Con tres copias, el día que una deje de cerrar con
// Escape no lo nota nadie.
//
// Solo el cascarón: qué hay adentro lo decide quien lo usa. No sabe de formularios
// ni de acciones.

import { type ReactNode, useEffect, useId, useRef } from 'react';

export function Modal({
  titulo,
  onCerrar,
  children,
  /**
   * Qué se enfoca al abrir. Por defecto el botón "Cerrar" (el comportamiento que
   * ya tenía el modal de info); un formulario pasa su primer campo, que es donde
   * quien navega con teclado espera caer.
   */
  enfocar,
  ancho = 'max-w-lg',
}: {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
  enfocar?: React.RefObject<HTMLElement | null>;
  ancho?: string;
}) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const tituloId = useId();

  useEffect(() => {
    // Si el foco se queda en el botón que abrió el modal, quien navega con teclado
    // sigue "parado" detrás del fondo.
    const destino = enfocar?.current ?? cerrarRef.current;
    destino?.focus();

    function alTeclado(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onCerrar();
    }

    window.addEventListener('keydown', alTeclado);
    return () => window.removeEventListener('keydown', alTeclado);
  }, [enfocar, onCerrar]);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      {/* Fondo como elemento aparte y no como `onClick` del contenedor: así el click
          dentro del panel no cierra el modal por burbujeo. */}
      <div className="absolute inset-0 bg-accent/40" onClick={onCerrar} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        className={`relative max-h-[85vh] w-full ${ancho} overflow-y-auto rounded-2xl bg-white p-5 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={tituloId} className="text-base font-bold text-accent">
            {titulo}
          </h2>
          <button
            ref={cerrarRef}
            type="button"
            onClick={onCerrar}
            className="rounded-full px-2 py-0.5 text-sm font-bold text-primary hover:bg-accent/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Cerrar
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
