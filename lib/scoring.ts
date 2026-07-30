// lib/scoring.ts — Tarea 3.3 de TAREAS.md
//
// Espejo en JS de la función SQL `calcular_score` de
// `supabase/migrations/002_triggers_score.sql` (Tarea 1.2.a). La fuente de
// verdad de la fórmula es `CRITERIO-PRIORIZACION.md`: si cambia allá, cambian
// los dos a la vez.
//
// Para qué existe un espejo si el trigger ya escribe `score_proyecto`: la UI
// (Nivel 5) necesita mostrar la prioridad de un proyecto y explicar de dónde
// sale, y las Server Actions del Nivel 4 necesitan poder anticipar el efecto de
// un cambio sin ir a la base. El valor que se persiste sigue siendo el del
// trigger; este archivo nunca lo escribe.
//
// Dos cosas que hay que respetar para que los dos números coincidan:
//   · El redondeo a 2 decimales, igual que el `round(..., 2)` del SQL.
//   · La fecha "de hoy" en UTC. La base corre en UTC (`TimeZone = 'UTC'`), así
//     que `current_date` allá es la fecha UTC, no la local de quien mira la
//     pantalla. Medido el 2026-07-29 19:31 hora Colombia: en Postgres
//     `current_date` ya era 2026-07-30. Usar la fecha local habría dado un día
//     de diferencia en `score_fecha_limite`.

import type { Priority, Project, Task } from '@/lib/types';

/** Pesos de `CRITERIO-PRIORIZACION.md`. Suman 1, así que el score va de 0 a 100. */
const PESO_HEALTH = 0.325;
const PESO_TAREAS = 0.325;
const PESO_FECHA = 0.25;
const PESO_VALOR = 0.1;

/** Ventana en días dentro de la cual crece la urgencia antes del vencimiento. */
const VENTANA_DIAS = 90;

/** USD que valen 1 punto de `score_business_value` (topa en 100 a los 50.000). */
const USD_POR_PUNTO = 500;

/**
 * Calcula el `score_proyecto` de un proyecto, igual que el trigger de la Tarea 1.2.
 *
 * `tasks` puede ser el arreglo completo de tareas: adentro se filtra por
 * `project_code`, igual que el `where` de la consulta del SQL. Es obligatorio
 * porque `score_tareas` pesa la severidad de **cada** tarea vencida (prioridad y
 * si depende de otra), y eso no se puede reconstruir desde los contadores
 * `open_tasks`/`overdue_tasks` que trae el proyecto.
 *
 * `hoy` (formato 'YYYY-MM-DD') existe para poder fijar la fecha al comparar
 * contra el trigger; en uso normal se omite y toma la fecha UTC del momento.
 */
export function calcularScore(project: Project, tasks: Task[], hoy: string = hoyUTC()): number {
  const total =
    PESO_HEALTH * scoreHealth(project) +
    PESO_TAREAS * scoreTareas(project, tasks) +
    PESO_FECHA * scoreFechaLimite(project.target_date, hoy) +
    PESO_VALOR * scoreBusinessValue(project.business_value_usd);

  return redondear2(total);
}

/**
 * Traduce un score a la escala de prioridad. Los cortes son una decisión de
 * selectividad, no un quiebre en los datos: ver `CRITERIO-PRIORIZACION.md`.
 */
export function priorityFromScore(score: number): Priority {
  if (score >= 85) return 'Crítica';
  if (score >= 50) return 'Alta';
  if (score >= 25) return 'Media';
  return 'Baja';
}

/**
 * `true` si el proyecto no tiene siguiente paso definido. Un `next_step` de solo
 * espacios cuenta como vacío, igual que en el SQL (`coalesce(..., '') = ''` sobre
 * el valor recortado).
 *
 * Se exporta desde la Tarea 5.2: la UI necesita exactamente este predicado para
 * el ⚠️ ("solo si `health='Bloqueado'` y `next_step` vacío", criterio de 5.2 y de
 * 5.3.a), y `scoreHealth` ya lo tenía adentro. Es el mismo movimiento que hizo la
 * Tarea 4.3 con `hoyUTC()`: una regla en un solo lugar, en vez de un segundo
 * `.trim() === ''` en un componente donde equivocarse.
 *
 * Recibe un `Pick` y no un `Project` entero para que la pueda llamar cualquier
 * cosa que tenga el campo, sin armar un proyecto completo.
 */
export function sinSiguientePaso(project: Pick<Project, 'next_step'>): boolean {
  return (project.next_step ?? '').trim() === '';
}

/**
 * `score_health`: la salud del proyecto, agravada cuando no hay siguiente paso.
 */
function scoreHealth(project: Project): number {
  const sinNextStep = sinSiguientePaso(project);

  switch (project.health) {
    case 'Bloqueado':
      return sinNextStep ? 100 : 70;
    case 'En riesgo':
      return sinNextStep ? 65 : 50;
    case 'Sano':
      return sinNextStep ? 25 : 10;
  }
}

/**
 * `score_tareas`: 5 puntos por tarea abierta más la severidad de cada tarea
 * vencida. No cuenta tareas, pesa qué tan grave es cada atraso.
 */
function scoreTareas(project: Project, tasks: Task[]): number {
  const delProyecto = tasks.filter((t) => t.project_code === project.project_code);

  const abiertas = delProyecto.filter((t) => t.status !== 'Finalizada').length;
  const severidad = delProyecto.reduce((suma, t) => suma + severidadTarea(t), 0);

  return Math.min(100, abiertas * 5 + severidad);
}

/**
 * Severidad de una tarea vencida: 20 de base, +15 si es Crítica y +15 si no
 * depende de ninguna otra — una tarea atrasada que no espera a nadie es atraso
 * propio, no el efecto de un bloqueo aguas arriba.
 */
function severidadTarea(task: Task): number {
  if (!task.is_overdue) return 0;

  const porPrioridad = task.priority === 'Crítica' ? 15 : 0;
  const porIndependencia = task.depends_on_task_code === null ? 15 : 0;

  return 20 + porPrioridad + porIndependencia;
}

/**
 * `score_fecha_limite`: sin fecha no hay presión de calendario. Antes del
 * vencimiento la urgencia crece dentro de la ventana de 90 días; pasado el
 * vencimiento arranca en 50 y crece con el atraso hasta topar en 100.
 */
function scoreFechaLimite(targetDate: string | null, hoy: string): number {
  if (targetDate === null) return 0;

  const diasRestantes = diasEntre(hoy, targetDate);

  if (diasRestantes > 0) {
    return Math.max(0, 100 * (1 - diasRestantes / VENTANA_DIAS));
  }
  return Math.min(100, 50 + -diasRestantes / 3);
}

/** `score_business_value`: escala lineal que topa en 100 a los 50.000 USD. */
function scoreBusinessValue(businessValueUsd: number | null): number {
  if (businessValueUsd === null) return 0;
  return Math.min(100, businessValueUsd / USD_POR_PUNTO);
}

/**
 * Fecha de hoy en UTC, en el mismo formato 'YYYY-MM-DD' de las columnas `date`.
 * UTC y no local: es la zona en la que corre Postgres, y con eso `current_date`
 * del trigger y esta función devuelven el mismo día.
 *
 * Se exporta desde la Tarea 4.3, que necesita la misma fecha para decidir si una
 * tarea nueva nace vencida. `APRENDIZAJES.md` #19 dice que la regla aplica a todo
 * lo que compare fechas en los Niveles 4 a 7, y tener un segundo
 * `toISOString().slice(0, 10)` en `actions/tasks.ts` era un segundo lugar donde
 * equivocarse.
 */
export function hoyUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Días enteros entre dos fechas 'YYYY-MM-DD', equivalente a la resta de `date`
 * de Postgres. Se construyen en UTC a medianoche, así que la diferencia es
 * siempre un múltiplo exacto de 24 horas y no la corre ningún horario de verano.
 */
function diasEntre(desde: string, hasta: string): number {
  const MS_POR_DIA = 86_400_000;
  return (aUTC(hasta) - aUTC(desde)) / MS_POR_DIA;
}

function aUTC(fecha: string): number {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  return Date.UTC(anio, mes - 1, dia);
}

/**
 * Mismo redondeo que el `round(numeric, 2)` del SQL. Los scores nunca son
 * negativos (el mínimo de `score_health` es 10), así que "medio hacia arriba" y
 * "medio lejos del cero" coinciden.
 */
function redondear2(valor: number): number {
  return Math.round(valor * 100) / 100;
}
