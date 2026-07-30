# Aztec — Sistema de gestión de proyectos

Sistema de gestión de proyectos para una operación tipo Aztec: crear/actualizar proyectos y
tareas, detectar bloqueos y falta de siguiente paso, priorizar automáticamente, con historial de
cambios. Construido para el reto "Desarrollador de Soluciones con IA" de Aztec.

**Stack:** Next.js (App Router) + Supabase (Postgres, Auth, triggers) + Server Actions,
desplegable en Vercel. Chatbot con la API de OpenAI.

## Levantar en local

1. Clonar el repo e instalar dependencias:

   ```bash
   git clone <url-del-repo>
   cd aztec-gestion-proyectos
   npm install
   ```

2. Copiar `.env.example` a `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

3. Pegar los valores reales en `.env.local`. Las llaves de Supabase
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) y `API_KEY_PROYECTOS` se comparten fuera de este
   repositorio, no viven en ningún archivo versionado. `OPENAI_API_KEY` es opcional: sin
   ella la app funciona igual, el chatbot solo muestra un mensaje de configuración en vez
   de responder.

4. Levantar el servidor:

   ```bash
   npm run dev
   ```

5. Entrar a `http://localhost:3000`. Redirige a `/login`. Usuario de prueba:
   `admin` / `123`.

6. Con la base vacía, el listado de proyectos muestra un botón "Cargar datos de ejemplo"
   que siembra los 22 proyectos y 82 tareas del dataset original.

No hay CI/CD continuo ni build de producción necesario para probar en local: `npm run dev`
alcanza para ejercitar todo el flujo.

## Criterio de priorización

Cada proyecto tiene un `score_proyecto` (0-100), calculado por un trigger de Postgres y
espejado en `lib/scoring.ts` para la UI:

```
score_proyecto = 0.325 × score_health + 0.325 × score_tareas + 0.25 × score_fecha_limite + 0.10 × score_business_value
```

- **`score_health`**: pesa el estado de salud del proyecto (Bloqueado/En riesgo/Sano) y si
  tiene un `next_step` definido — un proyecto bloqueado *sin* siguiente paso pesa el máximo.
- **`score_tareas`**: no cuenta tareas abiertas, pesa qué tan grave es cada atraso (prioridad
  de la tarea, si depende de otra).
- **`score_fecha_limite`**: crece a medida que se acerca o pasa la fecha límite del proyecto.
- **`score_business_value`**: escala con el valor comercial del proyecto en USD.

`priority` se deriva del score: Crítica ≥85, Alta 50-84, Media 25-49, Baja <25. El detalle
completo de cada subfórmula, con los valores exactos y el porqué de cada umbral, está en
`CRITERIO-PRIORIZACION.md`.

## Sobre el diseño visual

El mockup HTML y el manual de marca (`docs/brand-guide.md`) que acompañaron el reto guían el
diseño de la interfaz, pero no son la especificación pixel-perfect: donde los dos entraban en
conflicto (por ejemplo, el color del código de proyecto en la tabla de listado), se siguió el
manual de marca y la decisión quedó documentada en `TAREAS.md`, Nivel 5.
