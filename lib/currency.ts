// lib/currency.ts — Tarea 3.4 de TAREAS.md
//
// Se construyó antes que el resto del Nivel 3 porque la Tarea 2.1.d
// ("calcular `business_value_usd` con `lib/currency.ts`") lo consume desde el
// seed del Nivel 2. La alternativa era repetir la tasa dentro de
// `supabase/seed-data.ts` y terminar con dos números que se pueden desincronizar.

/**
 * Tasa de referencia USD/COP al 29 de julio de 2026, fuente Investing.com: 3.210.
 *
 * Es una tasa FIJA a propósito, no una consulta en vivo: la conversión en vivo
 * quedó fuera de alcance (ver `CLAUDE.md`). Un valor guardado con una tasa que
 * cambia cada día tampoco sería comparable entre proyectos.
 *
 * Si se actualiza este número, `business_value_usd` de los proyectos ya
 * sembrados NO se recalcula solo: hay que volver a correr el seed.
 */
export const TASA_USD_COP = 3210;

/**
 * Convierte un monto a USD. Devuelve `null` cuando no hay nada que convertir
 * (monto vacío) o cuando la moneda no es una de las dos del dataset: es mejor
 * dejar `business_value_usd` en NULL —la columna es nullable— que guardar una
 * cifra calculada con una suposición.
 *
 * El redondeo a 2 decimales es el de una cifra de dinero, y hace que el valor
 * que se siembra sea el mismo que se ve en pantalla.
 */
export function convertirAUSD(valor: number | null, moneda: string | null): number | null {
  if (valor === null || !Number.isFinite(valor)) return null;
  if (moneda === 'USD') return redondear(valor);
  if (moneda === 'COP') return redondear(valor / TASA_USD_COP);
  return null;
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
