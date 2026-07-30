# CLAUDE.md — Sistema de gestión de proyectos (reto Aztec)

Este archivo es el punto de entrada. Es corto a propósito: se lee en cada prompt, así que no repite lo que ya vive en otros archivos. Antes de construir o verificar cualquier tarea, consultar el archivo correspondiente de abajo.

## Qué es esto
Sistema de gestión de proyectos para una operación tipo Aztec: crear/actualizar proyectos y tareas, detectar bloqueos y falta de siguiente paso, priorizar automáticamente, con historial de cambios.

## Stack
Next.js (App Router) + Supabase (Postgres, Auth, triggers) + Server Actions + Vercel. Chatbot con **OpenAI** (no Anthropic). Ver `TAREAS.md` para el detalle exacto de cada pieza.

## Antes de empezar cualquier tarea
1. Leer `APRENDIZAJES.md` completo (corto, no toma tiempo, evita repetir errores ya resueltos).
2. Ir a `TAREAS.md`, ubicar la tarea del nivel correspondiente, seguir su checklist exacto.
3. Si la tarea es de UI: consultar `docs/brand-guide.md` para colores, tipografía y tono. No inventar valores.
4. Al terminar: pasar por `verifier` según `HARNESS.md` antes de marcar la tarea como hecha.

## Archivos de referencia (no se leen completos salvo que la tarea actual los necesite)

| Archivo | Cuándo consultarlo |
|---|---|
| `TAREAS.md` | Siempre — es la fuente de verdad de qué construir, en qué orden, con qué criterio de verificación. 27 tareas en 9 niveles (Nivel 0 de scaffold + Niveles 1 a 8). |
| `CRITERIO-PRIORIZACION.md` | Al construir o revisar las Tareas 1.2 y 3.3 (cálculo de `score_proyecto` y `priority`). |
| `HARNESS.md` | Al construir (rol `implementer`) o revisar (rol `verifier`) cualquier tarea. |
| `APRENDIZAJES.md` | Antes de cada tarea nueva, y para agregar una entrada si `verifier` encuentra un fallo con lección reusable. |
| `docs/brand-guide.md` | Cualquier tarea de UI (Niveles 5 y 6), o cualquier texto visible para el usuario. |

## Reglas globales, no negociables
- Nombres de campos, tablas y funciones deben ser exactamente los que aparecen en `TAREAS.md`. No renombrar por preferencia propia a mitad de la construcción.
- No agregar features, tablas o pantallas que no estén en `TAREAS.md`. Si parece faltar algo, señalarlo en `APRENDIZAJES.md` y preguntar, no decidir solo.
- Todo lo que se dejó fuera del alcance a propósito (roles de usuario, usuarios de `Team`, tasa de cambio en vivo, deploy continuo) queda documentado como tal, no se construye "por si acaso".
