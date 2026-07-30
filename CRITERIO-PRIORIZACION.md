# Criterio de priorización

Fórmula completa (fijada en Fase 2, ampliada en Fase 4). La usan la Tarea 1.2 (trigger SQL) y la Tarea 3.3 (espejo en JS) de `TAREAS.md` — ambas apuntan acá, no la repiten.

```
score_proyecto = 0.325 × score_health + 0.325 × score_tareas + 0.25 × score_fecha_limite + 0.10 × score_business_value
```

## `score_health`
Considera `next_step` en cualquier estado de salud, no solo cuando está bloqueado:

| health | con next_step | sin next_step |
|---|---|---|
| Bloqueado | 70 | 100 |
| En riesgo | 50 | 65 |
| Sano | 10 | 25 |

## `priority` (derivada de `score_proyecto`)
- Crítica: ≥75
- Alta: 50-74
- Media: 25-49
- Baja: <25

## Notas de implementación
- `score_health` es el único componente detallado acá porque fue el que se amplió con la regla de `next_step`. Los demás componentes (`score_tareas`, `score_fecha_limite`, `score_business_value`) usan directamente `open_tasks`, `overdue_tasks`, `target_date` y `business_value_usd` de `projects`, sin subfórmula categórica aparte.
- `score_proyecto` se recalcula vía trigger cuando cambian `health`, tareas, `target_date` o `business_value` (Tarea 1.2), no vía cron ni recálculo diario.
- `score_proyecto` está excluido del historial de auditoría por ser un valor derivado (Tarea 1.3).
