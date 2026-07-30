// lib/forms.ts — las dos decisiones puras que comparten los formularios del Nivel 6
//
// **Archivo que TAREAS.md no lista.** Está separado por un motivo de verificación y
// no de estética, igual que `lib/project-list.ts`: los tres formularios de escritura
// (6.1, 6.2, 6.3) son componentes de cliente, y adentro de uno de ellos estas dos
// reglas solo se pueden revisar leyendo código. Acá se pueden **medir** contra los
// datos reales.
//
// Lo que vive acá:
//   · `personasConRol` — el mapa persona → rol de la decisión 2 del nivel. Las
//     Tareas 6.1 y 6.2 piden un responsable pero el rol es una columna aparte
//     (`owner_role`, `assignee_role`), y medido sobre el dataset cada una de las 6
//     personas tiene un solo rol, así que el rol se deriva y no se pregunta.
//   · `textoONull` + `soloLoQueCambio` — cómo se arma el parche que viaja al
//     servidor. Es la mitad de "el CRUD no rompe otros campos" que el filtro de
//     `actions/common.ts` no puede cubrir: ese filtro descarta campos no editables,
//     pero no sabe cuáles el usuario tocó de verdad.
//
// Sin JSX y sin `'use client'` a propósito: lo importan los componentes y también el
// script de verificación.

/** Una persona del dataset con el rol que le corresponde. */
export type PersonaConRol = {
  alias: string;
  role: string;
};

/**
 * Las personas distintas de una lista de pares, con un solo rol cada una, ordenadas
 * por nombre.
 *
 * Se derivan de los datos y no se escriben a mano: si el dataset cambia, el `<select>`
 * cambia con él (mismo criterio que `opcionesDe` de `lib/project-list.ts`).
 *
 * **Si una persona apareciera con dos roles distintos, gana el primero en orden
 * alfabético.** Hoy no pasa —medido: las 6 personas del dataset tienen un rol único,
 * Daniel Rojas `Commercial / Delivery` y las otras 5 `Delivery`— y el `<select>`
 * muestra el rol en la etiqueta de cada opción, así que el que se va a guardar está
 * a la vista y no queda una decisión invisible.
 */
export function personasConRol(pares: PersonaConRol[]): PersonaConRol[] {
  const porAlias = new Map<string, string>();

  const ordenados = [...pares].sort(
    (a, b) => a.alias.localeCompare(b.alias, 'es') || a.role.localeCompare(b.role, 'es'),
  );

  for (const par of ordenados) {
    if (!porAlias.has(par.alias)) {
      porAlias.set(par.alias, par.role);
    }
  }

  return [...porAlias].map(([alias, role]) => ({ alias, role }));
}

/**
 * El texto de un control a valor de columna: vacío o de solo espacios → `null`.
 *
 * Un `blocker_owner` guardado como `''` sería peor que un `null`: la columna es
 * nullable, y el ⚠️ de la UI y el componente `health` del score preguntan si el dato
 * está o no está. La cadena vacía dice "está" y no dice nada.
 *
 * Es el mismo criterio con el que `sinSiguientePaso` (`lib/scoring.ts`) cuenta un
 * `next_step` de puros espacios como vacío, aplicado en el otro extremo: acá se evita
 * que ese valor llegue a existir.
 */
export function textoONull(valor: string): string | null {
  const limpio = valor.trim();
  return limpio === '' ? null : limpio;
}

/**
 * Las llaves cuyo valor cambió, y ninguna más.
 *
 * Los dos objetos tienen las mismas llaves: `base` es lo que devolvió la base de
 * datos y `valores` lo que hay en el formulario, ya normalizado con `textoONull`.
 * Un campo que el usuario no tocó no viaja, y uno que volvió solo a su valor
 * original tampoco.
 *
 * No es una optimización. Es lo que hace que el trigger de historial de la Tarea 1.3
 * registre exactamente los campos que se editaron: mandar las 4 columnas del banner
 * cuando se cambió una sola no rompería nada (el trigger compara valores, verificado
 * en el paso 4 de la 1.3), pero deja al `UPDATE` escribiendo columnas que nadie pidió
 * escribir.
 */
export function soloLoQueCambio<T extends object>(base: T, valores: T): Partial<T> {
  const parche: Partial<T> = {};

  for (const campo of Object.keys(valores) as (keyof T)[]) {
    if (valores[campo] !== base[campo]) {
      parche[campo] = valores[campo];
    }
  }

  return parche;
}
