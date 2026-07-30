# Aprendizajes

Errores ya resueltos, para no repetirlos. `implementer` lo lee completo antes de cada tarea nueva de `TAREAS.md`. Se agrega una entrada solo cuando `verifier` y Pipe cierran una "novedad" (ver `HARNESS.md`) y esa novedad deja una lección reusable, no cualquier ajuste menor.

Formato por entrada: una línea de qué pasó, una de la solución.

---

1. **"Crear proyecto" sin lugar en la UI.** Se definió el CRUD como requisito en Fase 3 pero nunca se dijo dónde vivía el botón. Solución: botón "+ Crear proyecto" con modal de campos iniciales, definido recién en Fase 4. → Al cerrar una fase de features, confirmar que cada verbo CRUD tiene un lugar concreto en la UI.

2. **`tasks.status` sin un estado que significara "terminada".** La regla de dependencia entre tareas necesitaba comparar contra "ya terminó", pero los 4 estados del Excel no cubren eso. Solución: se agregó un quinto estado, `Finalizada`. → Si una regla de negocio necesita "algo completo" y el dataset no lo tiene, agregar el estado que falta en vez de forzar una aproximación ambigua con los que ya existen.

3. **Tasa de cambio sin fuente verificada.** `business_value_usd` necesitaba una tasa fija; la tentación fue poner un número de memoria. Solución: se buscó la tasa real (29 jul 2026, Investing.com, ≈3.210) y se documentó con fecha y fuente. → Cualquier cifra que dependa de datos externos actuales se busca antes de escribirla, nunca se aproxima de memoria.

4. **`TAREAS.md` daba por hecho un proyecto que nadie creaba.** Los 8 niveles arrancaban en la base de datos, pero la Tarea 3.1 crea archivos dentro de la app y la 3.5 dice "Modificar: `tailwind.config.ts`" — un archivo que solo nace con `create-next-app`. Ninguna tarea lo producía. Solución: se agregó el Nivel 0 (Tarea 0.1) con el scaffold, `git init` y `.env.local`, en vez de ejecutarlo por fuera del plan. → Si una tarea dice "Modificar X", confirmar que alguna tarea anterior tiene a X en su lista de "Crear". Lo que no aparece en "Crear" de nadie, no existe.

5. **`.gitignore` de Next ignoraba un entregable.** El patrón `.env*` que trae `create-next-app` cubre también `.env.example`, que la Tarea 8.1.a exige commitear para que el evaluador sepa qué variables llenar. Solución: excepción explícita `!.env.example`. → Cuando un archivo de configuración generado trae reglas amplias (`.env*`, `*.log`), revisar si alguna tapa un archivo que el proyecto sí necesita versionar.
