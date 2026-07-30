'use client';

// components/chat-widget.tsx — Tarea 7.2 de TAREAS.md
//
// Ícono flotante + ventana simple. **Oculto en `/login` por estructura, no por un
// `if` de ruta**: se monta en `app/proyectos/layout.tsx` (Tarea 5.2/5.3, decidido en
// el diseño del Nivel 5), y `/login` no cuelga de ese layout — es el mismo mecanismo
// con el que la 5.1.c ya quedó verificada.
//
// Llama a `POST /api/chat` con `credentials` implícitas de same-origin, así que la
// cookie de sesión viaja sola. **7.2.c**: si la API dice `configurado: false`, se
// muestra ese texto como si fuera una respuesta más — no hay una pantalla de error
// distinta, la app no se rompe, solo contesta que falta configuración.

import { useRef, useState } from 'react';

type Mensaje = {
  autor: 'usuario' | 'asistente';
  texto: string;
};

export function ChatWidget() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [pregunta, setPregunta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const texto = pregunta.trim();
    if (texto === '' || enviando) return;

    setMensajes((actuales) => [...actuales, { autor: 'usuario', texto }]);
    setPregunta('');
    setEnviando(true);

    try {
      const respuesta = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pregunta: texto }),
      });
      const json = (await respuesta.json()) as { respuesta?: string; error?: string };

      const contenido = json.respuesta ?? json.error ?? 'No se pudo obtener una respuesta.';
      setMensajes((actuales) => [...actuales, { autor: 'asistente', texto: contenido }]);
    } catch {
      setMensajes((actuales) => [
        ...actuales,
        { autor: 'asistente', texto: 'No se pudo conectar con el chat. Intentá de nuevo.' },
      ]);
    } finally {
      setEnviando(false);
      requestAnimationFrame(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  }

  return (
    <div className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6">
      {abierto && (
        <div
          role="dialog"
          aria-label="Chat del portafolio"
          className="mb-3 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-accent/10 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-accent/10 px-4 py-3">
            <h2 className="text-sm font-bold text-accent">Preguntale al portafolio</h2>
            <button
              type="button"
              onClick={() => setAbierto(false)}
              className="rounded-full px-2 py-0.5 text-sm font-bold text-primary hover:bg-accent/5"
            >
              Cerrar
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {mensajes.length === 0 && (
              <p className="text-sm text-primary">
                Preguntá sobre el portafolio: &ldquo;¿cuáles proyectos están bloqueados?&rdquo;, &ldquo;¿qué tareas
                vencen esta semana?&rdquo;.
              </p>
            )}

            {mensajes.map((mensaje, indice) => (
              <Burbuja key={indice} mensaje={mensaje} />
            ))}

            {enviando && <p className="text-xs text-primary">Pensando…</p>}
            <div ref={finRef} />
          </div>

          <form onSubmit={enviar} className="flex items-center gap-2 border-t border-accent/10 p-3">
            <input
              type="text"
              value={pregunta}
              onChange={(evento) => setPregunta(evento.target.value)}
              placeholder="Escribí tu pregunta…"
              className="flex-1 rounded-full border border-accent/15 bg-background px-3 py-2 text-sm text-accent outline-none focus:border-accent/40 focus:ring-2 focus:ring-secondary/40"
            />
            <button
              type="submit"
              disabled={enviando || pregunta.trim() === ''}
              className="rounded-full bg-secondary px-4 py-2 text-sm font-bold text-accent transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-label={abierto ? 'Cerrar chat' : 'Abrir chat'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-accent shadow-lg transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true" className="text-2xl">
          {abierto ? '✕' : '💬'}
        </span>
      </button>
    </div>
  );
}

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  const esUsuario = mensaje.autor === 'usuario';
  return (
    <div className={`flex ${esUsuario ? 'justify-end' : 'justify-start'}`}>
      <p
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
          esUsuario ? 'bg-secondary text-accent' : 'bg-background text-accent'
        }`}
      >
        {mensaje.texto}
      </p>
    </div>
  );
}
