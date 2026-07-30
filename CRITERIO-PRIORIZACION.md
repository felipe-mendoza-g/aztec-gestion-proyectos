# Criterio de priorización

Fórmula completa (fijada en Fase 2, ampliada en Fase 4, subfórmulas de `tareas`/`fecha`/`valor` detalladas al construir la Tarea 1.2). La usan la Tarea 1.2 (trigger SQL) y la Tarea 3.3 (espejo en JS) de `TAREAS.md` — ambas apuntan acá, no la repiten.

```
score_proyecto = 0.325 × score_health + 0.325 × score_tareas + 0.25 × score_fecha_limite + 0.10 × score_business_value
```

Los cuatro componentes van de 0 a 100, así que `score_proyecto` también.

## `score_health`
Considera `next_step` en cualquier estado de salud, no solo cuando está bloqueado:

| health | con next_step | sin next_step |
|---|---|---|
| Bloqueado | 70 | 100 |
| En riesgo | 50 | 65 |
| Sano | 10 | 25 |

`next_step` vacío (`''` o solo espacios) cuenta igual que `NULL`, el mismo criterio de "vacío" que usa el ⚠️ de la UI (Tareas 5.2 y 5.3).

## `score_tareas`
No cuenta tareas: pesa qué tan grave es cada atraso.

```
score_tareas = min(100, open_tasks × 5 + Σ severidad(tarea vencida))

severidad de una tarea con is_overdue = true:
    20  base
  + 15  si priority = 'Crítica'
  + 15  si depends_on_task_code is null
```

El `+15` por no tener dependencia es deliberado: una tarea atrasada que no espera a ninguna otra es atraso propio, no el efecto de un bloqueo aguas arriba. Una tarea vencida pesa entre 20 y 50; una abierta al día, 5.

## `score_fecha_limite`
```
target_date is null        →  0
target_date en el futuro   →  max(0, 100 × (1 − días_restantes / 90))
target_date ya pasó        →  min(100, 50 + días_vencido / 3)
```

Sin fecha no hay presión de calendario. Antes del vencimiento la urgencia crece dentro de una ventana de 90 días. Pasado el vencimiento arranca en 50 (vence hoy) y sigue creciendo con el atraso hasta topar en 100 a los 150 días: vencer no es un estado binario, un proyecto con 5 meses de atraso no pesa igual que uno que venció ayer.

## `score_business_value`
```
business_value_usd is null →  0
resto                      →  min(100, business_value_usd / 500)
```

Escala lineal que topa en 100 a los 50.000 USD. El máximo real del dataset es 38.000, así que el tope deja aire: un proyecto más grande no revienta la escala.

## `priority` (derivada de `score_proyecto`)
- Crítica: ≥85
- Alta: 50-84
- Media: 25-49
- Baja: <25

**El corte de 85 es una decisión de selectividad, no un hallazgo en los datos.** Entre 75 y 91 los scores no tienen ningún quiebre natural — están repartidos casi de forma continua. Se eligió 85 para que Crítica sea ~20% del portafolio (4 de 22) en vez de ~55% (12 de 22, que es lo que daba el corte anterior de 75). Una lista donde más de la mitad es "Crítica" no prioriza nada. Si el portafolio crece y esa proporción se desarma, el número se vuelve a mover a mano; no se recalibra solo.

## Notas de implementación
- `score_proyecto` se recalcula vía trigger cuando cambian `health`, `next_step`, `target_date`, `business_value_usd` o las tareas del proyecto (Tarea 1.2), no vía cron ni recálculo diario.
- El trigger de `projects` también corre en `INSERT`, no solo en `UPDATE`: un proyecto nuevo nace con su score calculado (ver `APRENDIZAJES.md` #10).
- `score_fecha_limite` lee `current_date`, así que `score_proyecto` **queda viejo con el paso del tiempo si nada más cambia en el proyecto**. Es el precio de no tener cron: aceptado a propósito, porque cualquier edición del proyecto o de sus tareas lo refresca. Consecuencia práctica: la distribución de `priority` se corre unos décimos de un día para otro.
- `score_proyecto` está excluido del historial de auditoría por ser un valor derivado (Tarea 1.3), igual que `open_tasks` y `overdue_tasks`.
- **"Hoy" es la fecha UTC en las dos implementaciones.** El trigger lee `current_date` de un Postgres configurado en UTC; `calcularScore` usa `toISOString()`, no la fecha local del equipo. Con la fecha local, 14 de los 22 scores dejaban de coincidir (ver `APRENDIZAJES.md` #19).
- El resultado se redondea a 2 decimales. No es cosmético: el verifier del Nivel 3 compara la salida de `calcular_score` (SQL, `numeric`) contra `calcularScore` (JS, flotante), y sin redondeo esa comparación depende del último bit.
