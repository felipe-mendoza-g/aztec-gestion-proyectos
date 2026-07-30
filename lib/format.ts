// lib/format.ts — piezas de formato compartidas por las Tareas 5.2 y 5.3
//
// **Archivo que TAREAS.md no lista.** Las dos pantallas del Nivel 5 muestran las
// mismas fechas (`target_date`, `start_date`, `due_date`, `blocked_since`) y los
// mismos montos (`business_value` + `currency` + `business_value_usd`), así que la
// alternativa era escribir el mismo formateo dos veces. No agrega ninguna feature.
//
// **Lo importante de este archivo son las fechas, no los montos.** Las columnas
// `date` de Postgres llegan como 'YYYY-MM-DD', y `new Date('2026-09-30')` las
// interpreta como medianoche **UTC**; formatearlas después en la zona local
// (Colombia, UTC-5) las corre 5 horas hacia atrás y `30 sep` se muestra como
// `29 sep`. Es el mismo problema que `APRENDIZAJES.md` #19 midió en el score, y
// acá se ve peor porque el número equivocado queda en pantalla. Por eso todo se
// parsea a mano y se formatea con `timeZone: 'UTC'`.

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** Lo que se muestra donde la base tiene `null`. Un guion largo, no una cadena vacía. */
export const VACIO = '—';

/**
 * Una columna `date` ('2026-09-30') como '30 sep 2026'.
 *
 * Se arma con las tres partes del texto en vez de pasar por `Date`: no hay zona
 * horaria en juego, así que no hay forma de que el día se corra. `null` → `'—'`.
 */
export function formatFecha(fecha: string | null): string {
  if (fecha === null) return VACIO;

  const [anio, mes, dia] = fecha.split('-');
  const nombreMes = MESES[Number(mes) - 1];

  // Una fecha que no tenga la forma esperada se muestra tal cual en vez de como
  // 'undefined': es un dato raro, no un error de la UI.
  if (nombreMes === undefined || dia === undefined) return fecha;

  return `${Number(dia)} ${nombreMes} ${anio}`;
}

/**
 * Un `timestamptz` ('2026-07-30T05:04:29.048+00:00') como '30 jul 2026, 05:04'.
 *
 * La hora se muestra en UTC, la misma zona en la que la base la escribió
 * (`TimeZone = 'UTC'`, medido en la Tarea 3.3). Mostrarla en la zona del
 * navegador daría un texto distinto según quién mire la pantalla, y el
 * `created_at` de una nota es un dato de auditoría: tiene que leerse igual para
 * todos.
 */
export function formatFechaHora(instante: string): string {
  const fecha = new Date(instante);
  if (Number.isNaN(fecha.getTime())) return instante;

  const dia = fecha.getUTCDate();
  const mes = MESES[fecha.getUTCMonth()];
  const anio = fecha.getUTCFullYear();
  const hora = String(fecha.getUTCHours()).padStart(2, '0');
  const minuto = String(fecha.getUTCMinutes()).padStart(2, '0');

  return `${dia} ${mes} ${anio}, ${hora}:${minuto} UTC`;
}

/**
 * Un monto con su moneda: `85000000` + `'COP'` → 'COP 85.000.000'.
 *
 * Separador de miles con punto y decimal con coma (es-CO). Los montos del dataset
 * son enteros, así que no se fuerzan dos decimales donde no hay centavos; el
 * `business_value_usd` calculado sí los trae (26.479,75) y se muestran.
 */
export function formatMonto(valor: number | null, moneda: string | null): string {
  if (valor === null) return VACIO;

  const numero = new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(valor);

  return moneda === null ? numero : `${moneda} ${numero}`;
}

/** El score con dos decimales, con coma: `91.5` → '91,50'. */
export function formatScore(score: number): string {
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(score);
}
