-- 004_rls.sql — Tarea 1.4 de TAREAS.md
--
-- Cierra las 5 tablas con RLS y abre una sola puerta: el rol `authenticated`.
-- No hay distinción de rol de usuario (owner, admin, lector): el alcance del
-- reto es un único usuario que entra por el login de la Tarea 5.1, y los roles
-- de usuario quedaron declarados fuera de alcance en CLAUDE.md.
--
-- Qué pasa con cada rol después de este archivo:
--   · authenticated → SELECT / INSERT / UPDATE en las 5 tablas
--   · anon          → nada: sin política, RLS no le deja ver ni escribir una fila
--   · service_role  → RLS no aplica (BYPASSRLS), por eso los triggers y el
--                     editor SQL del dashboard siguen funcionando igual
--
-- DELETE queda **fuera a propósito**: 1.4.b enumera SELECT/INSERT/UPDATE, y
-- ninguna Server Action del Nivel 4 borra (`actions/projects.ts`,
-- `actions/tasks.ts` y `actions/notes.ts` solo crean y actualizan). El historial
-- de las Tareas 1.3 y 6.x pierde sentido si las filas se pueden borrar desde la
-- app. Si más adelante hace falta, se agrega una política nueva, no se abre acá.
--
-- Los triggers de 002 y 003 no necesitan política propia: corren con los
-- permisos del `UPDATE` que los disparó y sus funciones son `security invoker`,
-- pero las tablas de historial ya tienen política de INSERT para
-- `authenticated`, que es quien dispara los cambios desde la app.


-- ============================================================
-- 1.4.a — Habilitar RLS en las 5 tablas
-- ============================================================
alter table projects        enable row level security;
alter table tasks           enable row level security;
alter table notes           enable row level security;
alter table project_history enable row level security;
alter table task_history    enable row level security;


-- ============================================================
-- 1.4.b — Política de acceso total para `authenticated`
--
-- Una política por comando en vez de `for all`: `for all` incluiría DELETE.
-- `using (true)` / `with check (true)` = sin filtro por fila; el control de
-- acceso de este sistema es "hay sesión o no la hay", no "qué filas son tuyas".
-- ============================================================

-- projects
create policy "authenticated lee projects"      on projects for select to authenticated using (true);
create policy "authenticated inserta projects"  on projects for insert to authenticated with check (true);
create policy "authenticated edita projects"    on projects for update to authenticated using (true) with check (true);

-- tasks
create policy "authenticated lee tasks"         on tasks for select to authenticated using (true);
create policy "authenticated inserta tasks"     on tasks for insert to authenticated with check (true);
create policy "authenticated edita tasks"       on tasks for update to authenticated using (true) with check (true);

-- notes
create policy "authenticated lee notes"         on notes for select to authenticated using (true);
create policy "authenticated inserta notes"     on notes for insert to authenticated with check (true);
create policy "authenticated edita notes"       on notes for update to authenticated using (true) with check (true);

-- project_history
create policy "authenticated lee project_history"     on project_history for select to authenticated using (true);
create policy "authenticated inserta project_history" on project_history for insert to authenticated with check (true);
create policy "authenticated edita project_history"   on project_history for update to authenticated using (true) with check (true);

-- task_history
create policy "authenticated lee task_history"     on task_history for select to authenticated using (true);
create policy "authenticated inserta task_history" on task_history for insert to authenticated with check (true);
create policy "authenticated edita task_history"   on task_history for update to authenticated using (true) with check (true);


-- ============================================================
-- 1.4.c — Usuario admin
--
-- Desviación de lo que dice la tarea ("configuración manual: dashboard"): el
-- dashboard y la API de Auth rechazan la contraseña `123` con
-- `weak_password: Password should be at least 6 characters` (medido contra
-- /auth/v1/signup de este proyecto, HTTP 422). La contraseña `123` es requisito
-- de la Tarea 5.1, así que el usuario se crea por SQL, que no pasa por esa
-- validación. El login (`signInWithPassword`) sí funciona: solo compara el hash.
--
-- Queda en este archivo, y no como un paso manual suelto, para que el usuario
-- sea reproducible si hay que levantar el proyecto de cero.
--
-- `crypt`/`gen_salt` van calificados con `extensions.`: pgcrypto vive en el
-- esquema `extensions` en Supabase, no en `public`.
--
-- Las 4 columnas de token (`confirmation_token`, `recovery_token`,
-- `email_change_token_new`, `email_change`) van en cadena vacía, no en NULL:
-- son nullable en el esquema, pero GoTrue las lee como texto no-nulo y con NULL
-- el login devuelve HTTP 500 `Database error querying schema` (medido acá antes
-- de corregirlo). Las otras 4 columnas de token ya traen default `''`.
-- ============================================================
do $$
declare
  v_user_id uuid := gen_random_uuid();
begin
  if exists (select 1 from auth.users where email = 'admin@aztec.local') then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated',
    'authenticated',
    'admin@aztec.local',
    extensions.crypt('123', extensions.gen_salt('bf')),
    now(),  -- confirmado de entrada: no hay servidor de correo para .local
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  );

  -- La identidad `email` es lo que hace que el usuario aparezca como tal en el
  -- dashboard de Auth y lo que consulta GoTrue al resolver el proveedor.
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    v_user_id::text,
    format('{"sub": "%s", "email": "admin@aztec.local", "email_verified": true, "phone_verified": false}', v_user_id)::jsonb,
    'email',
    now(),
    now(),
    now()
  );
end;
$$;
