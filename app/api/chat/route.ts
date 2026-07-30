// app/api/chat/route.ts — Tarea 7.2 de TAREAS.md
//
// Recibe una pregunta, arma un prompt con el portafolio completo y llama a la API
// de OpenAI. **RAG sin recuperación por similitud**: no hay base vectorial ni
// embeddings — con 22 proyectos y 82 tareas el dataset entero cabe en el contexto
// del modelo, así que "recuperar" es traer las dos tablas completas. Si el dataset
// creciera órdenes de magnitud, esto dejaría de alcanzar; para el tamaño del reto,
// una base vectorial sería la abstracción que YAGNI pide no construir.
//
// **Requiere sesión**, a diferencia de la Tarea 7.1: este endpoint lo llama el
// widget del navegador, no `curl` de un tercero, y por `APRENDIZAJES.md` #16 sin
// esa puerta el RLS dejaría pasar la lectura como `anon` con 0 filas — el chat
// respondería con seguridad sobre un portafolio vacío. `lib/supabase/server.ts` sí
// sirve acá (a diferencia de la 7.1): un Route Handler puede leer `cookies()`, así
// que la sesión del login llega igual que en cualquier página del Nivel 5.
//
// **7.2.c — sin `OPENAI_API_KEY` la app no se rompe**: se detecta antes de armar
// nada y se devuelve `configurado: false` con un texto que el widget muestra tal
// cual, en vez de dejar que la llamada a OpenAI falle con un error genérico.

import { NextResponse } from 'next/server';

import { createServerClient } from '@/lib/supabase/server';
import type { Project, Task } from '@/lib/types';

/** Configurable por si el modelo por defecto se retira; no atado al código. */
const MODELO = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: usuario, error: errorSesion } = await supabase.auth.getUser();

  if (errorSesion || !usuario.user) {
    return NextResponse.json({ error: 'La sesión no está activa. Volver a entrar en /login.' }, { status: 401 });
  }

  const cuerpo = (await request.json().catch(() => null)) as { pregunta?: unknown } | null;
  const pregunta = typeof cuerpo?.pregunta === 'string' ? cuerpo.pregunta.trim() : '';

  if (pregunta === '') {
    return NextResponse.json({ error: 'Falta la pregunta.' }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  // 7.2.c — el caso sin key se resuelve acá, antes de tocar la red: la app entera
  // sigue funcionando, y el widget muestra este texto en vez de romperse.
  if (apiKey === undefined || apiKey === '') {
    return NextResponse.json({
      configurado: false,
      respuesta: 'El chat todavía no está configurado: falta OPENAI_API_KEY.',
    });
  }

  const [{ data: proyectos, error: errorProyectos }, { data: tareas, error: errorTareas }] = await Promise.all([
    supabase.from('projects').select('*'),
    supabase.from('tasks').select('*'),
  ]);

  if (errorProyectos || errorTareas) {
    console.error('[/api/chat]', errorProyectos?.message, errorTareas?.message);
    return NextResponse.json({ error: 'No se pudo leer el portafolio.' }, { status: 500 });
  }

  const respuesta = await preguntarAOpenAI({
    apiKey,
    pregunta,
    projects: (proyectos ?? []) as Project[],
    tasks: (tareas ?? []) as Task[],
  });

  if (!respuesta.ok) {
    return NextResponse.json({ error: respuesta.error }, { status: 502 });
  }

  return NextResponse.json({ configurado: true, respuesta: respuesta.texto });
}

/**
 * El prompt: instrucciones + el portafolio completo en JSON, y la pregunta del
 * usuario. Se le pide que responda solo con lo que está en los datos —sin
 * inventar proyectos ni fechas— y en el tono directo de `docs/brand-guide.md` §7.
 */
function armarSystemPrompt(projects: Project[], tasks: Task[]): string {
  return [
    'Sos el asistente de un sistema de gestión de proyectos de Aztec, una consultora de IA y automatización.',
    'Respondé en español, directo y sin rodeos, con datos concretos (códigos de proyecto, nombres, fechas, números).',
    'Usá **solo** la información de projects y tasks de abajo. Si la pregunta no se puede responder con esos datos, decilo en vez de inventar.',
    '`health` indica la salud (Bloqueado / En riesgo / Sano); `score_proyecto` es el score de priorización, más alto = más urgente; `next_step` en null significa que no hay siguiente paso definido.',
    'Cuando la pregunta pida una lista o un conteo (por ejemplo "cuáles proyectos están X"), recorré el array **completo** de projects o tasks y verificá contra cada fila antes de responder: no te quedes con los primeros que recuerdes, y no omitas ninguno que cumpla la condición.',
    '',
    `projects (${projects.length}): ${JSON.stringify(projects)}`,
    '',
    `tasks (${tasks.length}): ${JSON.stringify(tasks)}`,
  ].join('\n');
}

async function preguntarAOpenAI({
  apiKey,
  pregunta,
  projects,
  tasks,
}: {
  apiKey: string;
  pregunta: string;
  projects: Project[];
  tasks: Task[];
}): Promise<{ ok: true; texto: string } | { ok: false; error: string }> {
  let respuestaHttp: Response;

  try {
    respuestaHttp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODELO,
        // Al mínimo: esto es lectura de datos, no redacción creativa. Reduce la
        // variación entre corridas, aunque no la elimina (ver la nota de 7.2 sobre
        // listados largos).
        temperature: 0,
        messages: [
          { role: 'system', content: armarSystemPrompt(projects, tasks) },
          { role: 'user', content: pregunta },
        ],
      }),
    });
  } catch (excepcion) {
    console.error('[/api/chat] red', excepcion);
    return { ok: false, error: 'No se pudo conectar con OpenAI. Intentá de nuevo.' };
  }

  if (!respuestaHttp.ok) {
    const detalle = await respuestaHttp.text();
    console.error('[/api/chat] OpenAI', respuestaHttp.status, detalle);
    return { ok: false, error: 'OpenAI no pudo responder la pregunta en este momento.' };
  }

  const json = (await respuestaHttp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const texto = json.choices?.[0]?.message?.content?.trim();

  if (texto === undefined || texto === '') {
    return { ok: false, error: 'OpenAI devolvió una respuesta vacía.' };
  }

  return { ok: true, texto };
}
