-- 002_triggers_score.sql — Tarea 1.2 de TAREAS.md
--
-- Mantiene tres columnas derivadas de `projects` sin que nadie las escriba a mano:
--   · score_proyecto  (fórmula completa de CRITERIO-PRIORIZACION.md)
--   · open_tasks      (tareas con status distinto de 'Finalizada')
--   · overdue_tasks   (tareas con is_overdue = true)
--
-- La fórmula NO se repite acá como documentación: la fuente de verdad es
-- CRITERIO-PRIORIZACION.md, y `lib/scoring.ts` (Tarea 3.3) es el espejo en JS de
-- `calcular_score`. Si cambia la fórmula, cambian los tres a la vez.
--
-- El trigger de historial (Tarea 1.3) excluye estas tres columnas, así que las
-- escrituras de este archivo no generan filas en `project_history`.


-- ============================================================
-- calcular_score(project_code) — TAREAS.md 1.2.a
--
-- Función pura: calcula y devuelve el score, no escribe nada. Los triggers de
-- abajo son los que guardan el resultado. `lib/scoring.ts` (3.3) replica esta
-- función, y el verifier del Nivel 3 compara ambas salidas, así que el
-- redondeo a 2 decimales es parte del contrato: sin él, la comparación
-- JS vs numeric de Postgres depende del último bit del flotante.
--
-- STABLE, no IMMUTABLE: lee `projects`, `tasks` y `current_date`.
--
-- `set search_path` explícito: sin él el linter de Supabase
-- (function_search_path_mutable) marca la función en la Tarea 1.4.
-- ============================================================
create or replace function calcular_score(p_project_code text)
returns numeric
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_proyecto  projects;
  v_sin_next  boolean;
  v_health    numeric;
  v_tareas    numeric;
  v_fecha     numeric;
  v_valor     numeric;
  v_dias      integer;
begin
  select * into v_proyecto from projects where project_code = p_project_code;
  if not found then
    return null;
  end if;

  -- ---- score_health ----------------------------------------------------
  -- next_step vacío ('' o solo espacios) cuenta igual que NULL: el seed lo deja
  -- NULL (2.1.j) pero el textarea de la Tarea 6.3 puede mandar cadena vacía, y
  -- el ⚠️ de la UI (5.2 / 5.3) usa el mismo criterio de "vacío".
  v_sin_next := coalesce(trim(v_proyecto.next_step), '') = '';

  v_health := case v_proyecto.health
    when 'Bloqueado' then case when v_sin_next then 100 else 70 end
    when 'En riesgo'  then case when v_sin_next then  65 else 50 end
    when 'Sano'       then case when v_sin_next then  25 else 10 end
  end;

  -- ---- score_tareas ----------------------------------------------------
  -- 5 puntos por tarea abierta, más una severidad por cada tarea vencida:
  -- 20 base, +15 si es Crítica, +15 si no depende de otra tarea (su atraso es
  -- responsabilidad propia, no el efecto de un bloqueo aguas arriba).
  select least(
           100,
           (count(*) filter (where status <> 'Finalizada'))::numeric * 5
           + coalesce(sum(
               case when is_overdue then
                 20
                 + case when priority = 'Crítica'            then 15 else 0 end
                 + case when depends_on_task_code is null    then 15 else 0 end
               else 0 end
             ), 0)
         )
    into v_tareas
    from tasks
   where project_code = p_project_code;

  -- ---- score_fecha_limite ----------------------------------------------
  -- Sin fecha no hay presión de calendario. Antes del vencimiento la urgencia
  -- crece dentro de una ventana de 90 días. Pasado el vencimiento arranca en 50
  -- y sigue creciendo con el atraso, hasta topar en 100 a los 150 días.
  if v_proyecto.target_date is null then
    v_fecha := 0;
  else
    v_dias := v_proyecto.target_date - current_date;
    if v_dias > 0 then
      v_fecha := greatest(0, 100 * (1 - v_dias::numeric / 90));
    else
      v_fecha := least(100, 50 + (-v_dias)::numeric / 3);
    end if;
  end if;

  -- ---- score_business_value --------------------------------------------
  -- Escala lineal que topa en 100 a los 50.000 USD (el máximo real del dataset
  -- es 38.000, así que un proyecto más grande no revienta la escala).
  v_valor := case
    when v_proyecto.business_value_usd is null then 0
    else least(100, v_proyecto.business_value_usd / 500)
  end;

  return round(
    0.325 * v_health
  + 0.325 * v_tareas
  + 0.25  * v_fecha
  + 0.10  * v_valor
  , 2);
end;
$$;


-- ============================================================
-- Trigger sobre projects — TAREAS.md 1.2.b
--
-- Desviación respecto a la letra de 1.2.b, decidida con Pipe: incluye INSERT,
-- no solo UPDATE. Sin INSERT un proyecto nace en score_proyecto = 0 (el default
-- de 1.1.a) hasta que alguien lo edite, y eso rompe dos criterios ya escritos:
-- 2.3 ("con score calculado por los triggers") y 4.2 ("score_proyecto se
-- calcula solo"). El trigger de tareas tapaba el hueco por accidente solo en
-- los proyectos que ya tienen tareas — PRJ-21 tiene 0 y quedaba en 0.
-- Ver APRENDIZAJES.md #10.
--
-- No se recursa: el UPDATE de acá toca solo score_proyecto, que no está en la
-- lista de `update of`.
-- ============================================================
create or replace function recalcular_score_proyecto()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update projects
     set score_proyecto = calcular_score(new.project_code)
   where project_code = new.project_code;
  return null;  -- trigger AFTER: el valor de retorno se ignora
end;
$$;

create trigger projects_recalcular_score
after insert or update of health, next_step, target_date, business_value_usd
on projects
for each row
execute function recalcular_score_proyecto();


-- ============================================================
-- Trigger sobre tasks — TAREAS.md 1.2.c
--
-- Recuenta los contadores del proyecto afectado y recalcula su score en un solo
-- UPDATE. El orden no importa: `calcular_score` saca score_tareas de la tabla
-- `tasks`, no de projects.open_tasks, así que no depende de que los contadores
-- ya estén escritos.
--
-- `overdue_tasks` cuenta is_overdue = true tal cual lo pide 1.2.c, sin excluir
-- 'Finalizada'. Una tarea que se cierra debería salir de vencida bajando su
-- propio is_overdue, no quedar filtrada acá.
--
-- No se recursa: el UPDATE toca open_tasks, overdue_tasks y score_proyecto,
-- ninguna en la lista de `update of` del trigger de projects.
-- ============================================================
create or replace function sincronizar_proyecto_de_tarea(p_project_code text)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update projects
     set open_tasks     = (select count(*)::integer from tasks
                            where project_code = p_project_code
                              and status <> 'Finalizada'),
         overdue_tasks  = (select count(*)::integer from tasks
                            where project_code = p_project_code
                              and is_overdue),
         score_proyecto = calcular_score(p_project_code)
   where project_code = p_project_code;
end;
$$;

create or replace function sincronizar_contadores_tareas()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then
    perform sincronizar_proyecto_de_tarea(new.project_code);
  end if;

  -- En DELETE, y en el UPDATE que mueve una tarea de proyecto, hay que
  -- sincronizar también el proyecto que la pierde.
  if tg_op = 'DELETE' or (tg_op = 'UPDATE' and old.project_code <> new.project_code) then
    perform sincronizar_proyecto_de_tarea(old.project_code);
  end if;

  return null;  -- trigger AFTER: el valor de retorno se ignora
end;
$$;

create trigger tasks_sincronizar_contadores
after insert or update or delete
on tasks
for each row
execute function sincronizar_contadores_tareas();
