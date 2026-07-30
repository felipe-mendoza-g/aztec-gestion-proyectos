'use client';

// components/login-form.tsx — formulario de la Tarea 5.1
//
// **Archivo que TAREAS.md no lista**, y es una división obligada, no una
// preferencia: la 5.1 declara un solo archivo (`app/login/page.tsx`), pero esa
// página tiene que ser Server Component para poder redirigir a `/proyectos` si ya
// hay sesión, y el login tiene que ser cliente para que `signInWithPassword` deje
// la cookie en el navegador. Las dos cosas no caben en un archivo.

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createClient } from '@/lib/supabase/client';

/**
 * Dominio interno del usuario admin (Tarea 1.4.c). El reto pide entrar con
 * `admin`/`123`, pero Supabase Auth se autentica por email.
 */
const DOMINIO_INTERNO = '@aztec.local';

/**
 * 5.1.b — `admin` → `admin@aztec.local`.
 *
 * La regla es "si no trae `@`, se le pega el dominio interno", en vez de una tabla
 * de usuarios cableada en el cliente: así funcionan tanto `admin` como
 * `admin@aztec.local`, y el día que exista un segundo usuario no hay que tocar
 * esto.
 */
function aEmailInterno(usuario: string): string {
  const limpio = usuario.trim();
  return limpio.includes('@') ? limpio : `${limpio}${DOMINIO_INTERNO}`;
}

export function LoginForm() {
  const router = useRouter();
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setEntrando(true);
    setError(null);

    try {
      const { error: errorAuth } = await createClient().auth.signInWithPassword({
        email: aEmailInterno(usuario),
        password: contrasena,
      });

      if (errorAuth) {
        // **Criterio de la tarea: sin detalles técnicos de Supabase.** Un solo
        // texto para cualquier fallo de credenciales; el original
        // (`Invalid login credentials`, y su código) va al log del servidor de
        // nadie: se descarta a propósito, no le sirve a quien está escribiendo su
        // usuario. Tampoco se distingue "el usuario no existe" de "la contraseña
        // está mal": eso le diría a un extraño cuáles usuarios existen.
        setError('Usuario o contraseña incorrectos.');
        setEntrando(false);
        return;
      }

      // La cookie ya quedó escrita, así que el render de `/proyectos` llega
      // autenticado. `refresh()` además invalida lo que el router tenga en caché
      // de esta misma ruta renderizada sin sesión.
      router.replace('/proyectos');
      router.refresh();
    } catch {
      // Acá caen los fallos que no son de credenciales: sin red, o llaves de
      // Supabase mal puestas (`client.ts` lanza con su propio mensaje).
      setError('No se pudo conectar con el servidor. Revisá la conexión e intentá de nuevo.');
      setEntrando(false);
    }
  }

  return (
    <form onSubmit={entrar} className="rounded-2xl border border-accent/10 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <Campo
          id="usuario"
          // 5.1.a — la etiqueta dice "Usuario", no "Correo". Y el `type` es `text`:
          // con `type="email"` el navegador rechazaría `admin` antes de enviar.
          etiqueta="Usuario"
          tipo="text"
          valor={usuario}
          onChange={setUsuario}
          autoComplete="username"
        />
        <Campo
          id="contrasena"
          etiqueta="Contraseña"
          tipo="password"
          valor={contrasena}
          onChange={setContrasena}
          autoComplete="current-password"
        />
      </div>

      {error !== null && (
        <p role="alert" className="mt-4 rounded-lg bg-bloqueado-suave px-3 py-2 text-sm font-medium text-bloqueado">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={entrando}
        className="mt-6 w-full rounded-full bg-secondary px-4 py-2.5 text-sm font-bold text-accent transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
      >
        {entrando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}

function Campo({
  id,
  etiqueta,
  tipo,
  valor,
  onChange,
  autoComplete,
}: {
  id: string;
  etiqueta: string;
  tipo: 'text' | 'password';
  valor: string;
  onChange: (valor: string) => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold text-accent">
        {etiqueta}
      </label>
      <input
        id={id}
        name={id}
        type={tipo}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        autoComplete={autoComplete}
        required
        className="w-full rounded-lg border border-accent/15 bg-background px-3 py-2 text-sm text-accent outline-none focus:border-accent/40 focus:ring-2 focus:ring-secondary/40"
      />
    </div>
  );
}
