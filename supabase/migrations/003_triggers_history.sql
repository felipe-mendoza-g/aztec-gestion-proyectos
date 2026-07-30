-- 003_triggers_history.sql — Tarea 1.3 de TAREAS.md
--
-- Registra una fila en `project_history` / `task_history` por cada campo que
-- cambió en un UPDATE. Solo UPDATE: un INSERT no es "un cambio de valor", no
-- tiene `valor_anterior` que registrar, y la 4.1.c ya deja dicho que la carga
-- inicial no necesita lógica de exclusión (con estos triggers no genera ni una
-- fila, que es el caso más limpio de los dos).
--
-- Columnas excluidas en `projects`: score_proyecto, open_tasks, overdue_tasks.
-- Son derivadas y las escribe el archivo 002 en cada INSERT/UPDATE de `tasks`;
-- registrarlas llenaría el historial de ruido que nadie editó a mano.
-- En `tasks` no se excluye ninguna: sus 11 columnas las escribe una persona.
--
-- Se comparan `old` vs `new` convertidos a jsonb en vez de listar las columnas
-- una por una: así el trigger sigue siendo correcto si el esquema crece, y no
-- hay una segunda lista de columnas que mantener sincronizada con la 1.1.


-- ============================================================
-- projects → project_history — TAREAS.md 1.3.a + 1.3.c
--
-- El corto circuito de arriba es lo que hace cumplir el criterio de la tarea
-- ("editar solo vía el trigger de score, confirmar que NO genera fila"): quitando
-- las 3 derivadas, los UPDATE que dispara el archivo 002 quedan idénticos a la
-- fila anterior y salen sin recorrer nada.
--
-- `#>> '{}'` extrae el texto plano del valor jsonb (sin las comillas que dejaría
-- un cast a text) y devuelve NULL cuando el valor es json null, así que una
-- columna que se vacía queda con `valor_nuevo` NULL, no con la cadena 'null'.
-- ============================================================
create or replace function registrar_historial_proyecto()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_derivadas constant text[] := array['score_proyecto', 'open_tasks', 'overdue_tasks'];
  v_old  jsonb := to_jsonb(old) - v_derivadas;
  v_new  jsonb := to_jsonb(new) - v_derivadas;
  v_campo text;
begin
  if v_old = v_new then
    return null;
  end if;

  for v_campo in select jsonb_object_keys(v_new) loop
    if v_old -> v_campo is distinct from v_new -> v_campo then
      insert into project_history (project_code, campo, valor_anterior, valor_nuevo)
      values (
        new.project_code,
        v_campo,
        (v_old -> v_campo) #>> '{}',
        (v_new -> v_campo) #>> '{}'
      );
    end if;
  end loop;

  return null;  -- trigger AFTER: el valor de retorno se ignora
end;
$$;

create trigger projects_registrar_historial
after update on projects
for each row
execute function registrar_historial_proyecto();


-- ============================================================
-- tasks → task_history — TAREAS.md 1.3.b + 1.3.c
--
-- Mismo patrón, sin exclusiones. `is_overdue` sí se registra: lo cambia el
-- usuario (o el CRUD de la 4.3), no un trigger, y es la columna de la que
-- cuelga `overdue_tasks`, así que su historial es justamente el que sirve para
-- explicar por qué se movió el score de un proyecto.
-- ============================================================
create or replace function registrar_historial_tarea()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_old  jsonb := to_jsonb(old);
  v_new  jsonb := to_jsonb(new);
  v_campo text;
begin
  if v_old = v_new then
    return null;
  end if;

  for v_campo in select jsonb_object_keys(v_new) loop
    if v_old -> v_campo is distinct from v_new -> v_campo then
      insert into task_history (task_code, campo, valor_anterior, valor_nuevo)
      values (
        new.task_code,
        v_campo,
        (v_old -> v_campo) #>> '{}',
        (v_new -> v_campo) #>> '{}'
      );
    end if;
  end loop;

  return null;  -- trigger AFTER: el valor de retorno se ignora
end;
$$;

create trigger tasks_registrar_historial
after update on tasks
for each row
execute function registrar_historial_tarea();
