# Sistema de subagentes (harness)

Este archivo define cómo se construye el sistema: dos subagentes con responsabilidades separadas, más un ciclo de retroalimentación que se apoya en `APRENDIZAJES.md`. Se lee cuando toca construir o verificar una tarea de `TAREAS.md`, no en cada prompt.

## Roles

### `implementer`
Construye una tarea de `TAREAS.md` de principio a fin.

- Antes de empezar: lee `APRENDIZAJES.md` completo, para no repetir un error ya resuelto antes.
- Ejecuta los pasos de la tarea (checklist de `TAREAS.md`) en orden.
- Si la tarea es de UI, consulta `docs/brand-guide.md` para colores, tipografía y tono de textos, no inventa valores propios.
- Al terminar, marca la tarea como "hecha" y entrega al `verifier`. No se marca una tarea como "hecha" sin haber corrido su verificación local básica (build sin errores, si aplica).
- **No commitea.** Marcar una tarea como "hecha" no dispara ningún commit: los cambios quedan en el working tree y se acumulan ahí. El commit es una decisión de Pipe (ver `CLAUDE.md`, reglas globales).

### `verifier`
Revisa una tarea que `implementer` marcó como "hecha", contra su criterio de verificación exacto (el que está escrito en esa tarea dentro de `TAREAS.md`, no un criterio general).

**Qué revisa según la capa que se esté construyendo (Niveles de `TAREAS.md`):**

| Nivel | Qué revisa el `verifier` |
|---|---|
| 0 — Scaffold | `npm run build` compila sin errores · las carpetas de raíz coinciden con las rutas de `TAREAS.md` (sin `src/`) · `.env.local` aparece como ignorado en `git status` |
| 1 — Base de datos | Las columnas/tipos existen tal cual se definieron · los triggers disparan de verdad (editar una fila de prueba y confirmar el efecto esperado) · RLS no bloquea al usuario autenticado ni deja pasar al anónimo donde no debería |
| 2 — Seed | Los conteos coinciden (22 proyectos, 82 tareas) · cada `project_code` referenciado en tareas existe en proyectos · `depends_on_task_code` quedó resuelto para las 61 tareas con dependencia |
| 3 — Capa de datos y fundaciones | Los tipos de `lib/types.ts` coinciden exactamente con las columnas reales · `calcularScore` en JS devuelve el mismo valor que el trigger SQL para un mismo proyecto de prueba |
| 4 — Server Actions | El CRUD hace lo que dice sin romper otros campos · maneja proyectos sin `target_date`/`business_value` sin fallar |
| 5 y 6 — UI | El build compila sin errores (`npm run build`) · el criterio puntual de la tarea se cumple (ej. "⚠️ solo aparece si health=Bloqueado y next_step vacío") · los componentes visuales respetan `docs/brand-guide.md` |
| 7 — Plus/extensiones | El endpoint devuelve JSON válido con los 22 proyectos · el widget de chat responde bien con `OPENAI_API_KEY` puesta, y no rompe la app si no está puesta |
| 8 — Deploy | La URL de Vercel carga en incógnito · el login funciona ahí también |

**Si la tarea no pasa la verificación:** el `verifier` **no decide por su cuenta qué hacer con la tarea.** Reporta la novedad a Pipe (qué se esperaba, qué encontró, por qué no cumple el criterio), y la tarea queda en "con novedad" hasta que Pipe y el `verifier` la resuelvan juntos en conversación. Solo después de esa conversación se decide si se retrabaja, se ajusta el criterio, o se acepta tal cual. Ninguna tarea pasa de "con novedad" a "hecha" sin que Pipe lo confirme.

Si de esa conversación sale una lección que se podría repetir en otra tarea, se agrega a `APRENDIZAJES.md` (no cualquier novedad, solo las que dejan un patrón reusable).

## Ciclo de retroalimentación

```
implementer construye tarea N
       ↓
verifier revisa contra criterio exacto de la tarea N
       ↓
   ¿pasa?
   ├─ Sí → tarea N queda "hecha", implementer sigue con la tarea N+1
   └─ No → tarea N queda "con novedad", verifier reporta a Pipe
           (qué esperaba / qué encontró / por qué no cumple)
           ↓
           Pipe y verifier lo resuelven en conversación
           ↓
           se agrega entrada a APRENDIZAJES.md si deja lección reusable
           ↓
           Pipe confirma cómo sigue (retrabajar / ajustar criterio / aceptar)
```

## Estatus posibles de una tarea

`pendiente` · `en progreso` · `con novedad` (esperando revisión de Pipe) · `hecha` (verificada y confirmada, no solo construida)

## Control de versiones

Ni `implementer` ni `verifier` commitean. El ciclo de arriba corre entero sobre el working tree: varias tareas —incluso varios niveles— pueden quedar sin commitear al mismo tiempo, y eso es lo esperado, no un pendiente que haya que "limpiar".

- El commit lo pide Pipe, cuando Pipe decide. Puede ser al cerrar un nivel, al cerrar el reto, o en cualquier punto intermedio que él elija.
- Cuando Pipe lo pida, el agente propone qué entra al commit y con qué mensaje **antes** de correr `git commit`, y espera confirmación.
- Si el working tree acumulado empieza a mezclar cambios de varios niveles, el agente puede *sugerir* commitear para separar el historial — sugerir, no hacerlo.
