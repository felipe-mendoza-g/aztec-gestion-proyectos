// lib/project-list.ts — filtrado y orden del listado de la Tarea 5.2
//
// **Archivo que TAREAS.md no lista.** Es la lógica pura detrás de
// `components/projects-table.tsx`, y está separada por un motivo de verificación,
// no de estética: el criterio de la Tarea 5.2 es que "los filtros filtran de
// verdad" y que la tabla "ordena por `score_proyecto` descendente por default".
// Adentro de un componente de cliente eso solo se puede revisar leyendo código;
// acá se puede **medir** contra los 22 proyectos reales y contra conteos
// calculados aparte, que es lo que pide `HARNESS.md` para este nivel.
//
// Sin JSX y sin `'use client'` a propósito: lo importa el componente y también el
// script de verificación.
//
// **Decidido con Pipe (Nivel 5, decisión 4): el estado vive en memoria del
// cliente, no en la URL.** Son 22 filas, un dataset chico y cerrado; filtrar y
// reordenar no cuesta un viaje al servidor. Costo aceptado: los filtros no se
// pueden compartir por link.

import type { Project } from '@/lib/types';

/**
 * Los 9 filtros de la Tarea 5.2.b.
 *
 * Los numéricos y las fechas se guardan como `string` porque salen de un `<input>`:
 * `''` significa "sin filtro", que es distinto de `0` (un `score_min` de 0 es un
 * filtro puesto que no descarta nada, y hay que poder distinguirlos para el botón
 * de limpiar).
 */
export type Filtros = {
  /** Tipo de vínculo. `''` = todos. */
  engagement_type: string;
  /** Tipo de proyecto. `''` = todos. */
  project_type_api: string;
  /** Rol del responsable. `''` = todos. */
  owner_role: string;
  /** Estado abierto/cerrado. `''` = todos. */
  status: string;
  /** Fecha de apertura: incluye los proyectos que abrieron en esa fecha o después. */
  start_date_desde: string;
  /** Tareas pendientes: mínimo de `open_tasks`. */
  open_tasks_min: string;
  /** Solo proyectos con `overdue_tasks > 0`. */
  solo_vencidas: boolean;
  /** Score mínimo. */
  score_min: string;
  /** Solo proyectos con `health = 'Bloqueado'`. */
  solo_bloqueos: boolean;
};

export const FILTROS_VACIOS: Filtros = {
  engagement_type: '',
  project_type_api: '',
  owner_role: '',
  status: '',
  start_date_desde: '',
  open_tasks_min: '',
  solo_vencidas: false,
  score_min: '',
  solo_bloqueos: false,
};

/** `true` si no hay ningún filtro puesto (para esconder el botón de limpiar). */
export function hayFiltros(filtros: Filtros): boolean {
  return Object.entries(filtros).some(([clave, valor]) => valor !== FILTROS_VACIOS[clave as keyof Filtros]);
}

/**
 * Aplica los 9 filtros. Cada uno se ignora si está vacío, así que se combinan sin
 * orden ni casos especiales.
 *
 * Los `null` quedan **fuera** cuando el filtro correspondiente está puesto: un
 * proyecto sin `start_date` no cumple "abrió desde el 1 de marzo", no se le puede
 * dar el beneficio de la duda.
 */
export function aplicarFiltros(projects: Project[], filtros: Filtros): Project[] {
  const openTasksMin = aNumero(filtros.open_tasks_min);
  const scoreMin = aNumero(filtros.score_min);

  return projects.filter((project) => {
    if (filtros.engagement_type !== '' && project.engagement_type !== filtros.engagement_type) return false;
    if (filtros.project_type_api !== '' && project.project_type_api !== filtros.project_type_api) return false;
    if (filtros.owner_role !== '' && project.owner_role !== filtros.owner_role) return false;
    if (filtros.status !== '' && project.status !== filtros.status) return false;

    if (filtros.start_date_desde !== '') {
      // Comparación de textos 'YYYY-MM-DD', que es ordenable como texto y no
      // necesita construir ninguna fecha. Un `null` no pasa el filtro.
      if (project.start_date === null || project.start_date < filtros.start_date_desde) return false;
    }

    if (openTasksMin !== null && project.open_tasks < openTasksMin) return false;
    if (scoreMin !== null && project.score_proyecto < scoreMin) return false;
    if (filtros.solo_vencidas && project.overdue_tasks === 0) return false;
    if (filtros.solo_bloqueos && project.health !== 'Bloqueado') return false;

    return true;
  });
}

/** Las 8 columnas ordenables de la Tarea 5.2.a, por el campo que ordena cada una. */
export type ColumnaOrden =
  | 'project_code'
  | 'project_name'
  | 'project_type_api'
  | 'client_alias'
  | 'owner_alias'
  | 'target_date'
  /** Ordena la columna "Salud / prioridad": la prioridad **es** una función del score. */
  | 'score_proyecto'
  | 'status';

export type Direccion = 'asc' | 'desc';

/**
 * Orden por defecto de la tabla: **score descendente**, que es el criterio de
 * verificación de la Tarea 5.2. Con el dataset real deja `PRJ-04` (91,50) arriba.
 */
export const ORDEN_POR_DEFECTO: { columna: ColumnaOrden; direccion: Direccion } = {
  columna: 'score_proyecto',
  direccion: 'desc',
};

/**
 * Ordena una copia, no la entrada: el arreglo que llega es el que renderizó el
 * Server Component y `sort` muta.
 *
 * Los `null` de `target_date` van siempre al final, en las dos direcciones: un
 * proyecto sin fecha límite no es "el más urgente" ni "el menos urgente", no
 * participa de esa escala.
 */
export function ordenar(projects: Project[], columna: ColumnaOrden, direccion: Direccion): Project[] {
  const signo = direccion === 'asc' ? 1 : -1;

  return [...projects].sort((a, b) => {
    if (columna === 'score_proyecto') {
      return signo * (a.score_proyecto - b.score_proyecto);
    }

    const valorA = a[columna];
    const valorB = b[columna];

    if (valorA === null && valorB === null) return 0;
    if (valorA === null) return 1;
    if (valorB === null) return -1;

    // `localeCompare` con 'es' para que las tildes y las mayúsculas no manden los
    // nombres al final, como haría una comparación por código de carácter.
    return signo * valorA.localeCompare(valorB, 'es');
  });
}

/**
 * Valores distintos de una columna, ordenados, para llenar un `<select>` de
 * filtro. Se derivan de los datos y no se escriben a mano: si el dataset cambia,
 * las opciones cambian con él.
 */
export function opcionesDe(projects: Project[], columna: 'engagement_type' | 'project_type_api' | 'owner_role'): string[] {
  return [...new Set(projects.map((project) => project[columna]))].sort((a, b) => a.localeCompare(b, 'es'));
}

/** Texto de un `<input type="number">` a número, o `null` si no hay filtro puesto. */
function aNumero(texto: string): number | null {
  if (texto.trim() === '') return null;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : null;
}
