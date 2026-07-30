# Aprendizajes

Errores ya resueltos, para no repetirlos. `implementer` lo lee completo antes de cada tarea nueva de `TAREAS.md`. Se agrega una entrada solo cuando `verifier` y Pipe cierran una "novedad" (ver `HARNESS.md`) y esa novedad deja una lección reusable, no cualquier ajuste menor.

Formato por entrada: una línea de qué pasó, una de la solución.

---

1. **"Crear proyecto" sin lugar en la UI.** Se definió el CRUD como requisito en Fase 3 pero nunca se dijo dónde vivía el botón. Solución: botón "+ Crear proyecto" con modal de campos iniciales, definido recién en Fase 4. → Al cerrar una fase de features, confirmar que cada verbo CRUD tiene un lugar concreto en la UI.

2. **`tasks.status` sin un estado que significara "terminada".** La regla de dependencia entre tareas necesitaba comparar contra "ya terminó", pero los 4 estados del Excel no cubren eso. Solución: se agregó un quinto estado, `Finalizada`. → Si una regla de negocio necesita "algo completo" y el dataset no lo tiene, agregar el estado que falta en vez de forzar una aproximación ambigua con los que ya existen.

3. **Tasa de cambio sin fuente verificada.** `business_value_usd` necesitaba una tasa fija; la tentación fue poner un número de memoria. Solución: se buscó la tasa real (29 jul 2026, Investing.com, ≈3.210) y se documentó con fecha y fuente. → Cualquier cifra que dependa de datos externos actuales se busca antes de escribirla, nunca se aproxima de memoria.

4. **`TAREAS.md` daba por hecho un proyecto que nadie creaba.** Los 8 niveles arrancaban en la base de datos, pero la Tarea 3.1 crea archivos dentro de la app y la 3.5 dice "Modificar: `tailwind.config.ts`" — un archivo que solo nace con `create-next-app`. Ninguna tarea lo producía. Solución: se agregó el Nivel 0 (Tarea 0.1) con el scaffold, `git init` y `.env.local`, en vez de ejecutarlo por fuera del plan. → Si una tarea dice "Modificar X", confirmar que alguna tarea anterior tiene a X en su lista de "Crear". Lo que no aparece en "Crear" de nadie, no existe.

5. **`.gitignore` de Next ignoraba un entregable.** El patrón `.env*` que trae `create-next-app` cubre también `.env.example`, que la Tarea 8.1.a exige commitear para que el evaluador sepa qué variables llenar. Solución: excepción explícita `!.env.example`. → Cuando un archivo de configuración generado trae reglas amplias (`.env*`, `*.log`), revisar si alguna tapa un archivo que el proyecto sí necesita versionar.

6. **`NOT NULL` en una columna que nadie llena.** `TAREAS.md` 1.1.a no marca `currency` como nullable, pero ni `crearProyecto` (4.2.a) ni el modal (6.1.a) la reciben, así que exigirla habría roto la creación de proyectos desde la UI. Solución: quedó nullable, con el motivo escrito en el `.sql`. → Antes de poner `NOT NULL`, buscar qué función o formulario escribe esa columna. Si nadie la llena y no tiene default, el `NOT NULL` es una bomba de tiempo, no una garantía.

7. **Una regla de matcheo que resolvía 0 de 61.** La Tarea 2.2.a decía comparar `dependency` contra `title` "exactamente". Medido contra el Excel real: **0 de 61** coincidencias, porque los 82 títulos traen `" - {project_name}"` pegado al final. Quitando el sufijo: **61 de 61**, justo el número que el propio criterio de verificación de la tarea exigía. Solución: se corrigió 2.2.a y se dejó la evidencia. → Cuando una tarea trae una regla de transformación Y un número esperado, correr la regla contra los datos reales antes de construir. Si el número no sale, el error casi siempre está en la regla, no en los datos — y el número esperado es la pista de cuál era la intención.

8. **El Excel entrega todo como texto y sin tildes.** `is_overdue` venía `'Si'`/`'No'` en vez de booleano; `business_value` y los contadores como strings; y los valores enumerados sin acentos (`'Ejecucion'`, `'Critica'`, `'En revision'`) contra unos `CHECK` que exigían la grafía correcta. Nada de esto se ve leyendo los encabezados: aparece al mirar los valores. Solución: se midieron los valores distintos de cada columna contra los `CHECK` y los `NOT NULL` **antes** de aplicar la migración, y las conversiones quedaron fijadas en 2.1.e y 2.1.f. → Validar un dataset es revisar valores y tipos, no encabezados. Hacerlo antes de aplicar el esquema, no después de que falle la carga.

9. **Los campos derivados del origen estaban desactualizados.** El Excel trae `open_tasks` y `overdue_tasks` por proyecto, pero en 6 de 22 proyectos no cuadran con el recuento real de sus propias tareas (dice `overdue=1`, la cuenta da `2`). Solución: no se siembran; los calcula el trigger de 1.2.c. → Si un campo es derivable de otros datos que ya tenés, calcularlo, no copiarlo del origen. Un valor precalculado en una exportación es una foto vieja.
