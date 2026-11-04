-- Pruebas pgTAP de public.users: estructura, privilegios, RLS y triggers.
-- Ejecutar con: pnpm supabase test db
-- Todo corre dentro de una transacción que se revierte al final.

begin;

create extension if not exists pgtap with schema extensions;

select plan(101);

-- ---------------------------------------------------------------------------
-- Datos de prueba (como postgres). El trigger on_auth_user_created crea los perfiles.
--   A: registro por email con términos aceptados
--   B: registro por email con términos aceptados
--   C: Google (full_name + picture, sin términos)
--   D: registro por API sin la bandera de términos, usa la clave 'name'
--   E: casos borde (nombre de 1 carácter, avatar http)
--   F: nombre de 70 caracteres; registro por email con avatar_url de Google (-> nulo)
--   G: Google; full_name no string, name válido, avatar_url de host ajeno, picture válida
--   H: Google; nombre "\n\n", full_name numérico, avatar con comillas (inyección de atributo)
--   I: Google; name con tab, RLO y ZWSP; avatar de Google de más de 2048 caracteres
--   J: email; nombre con tildes, ñ, apóstrofe y guion; avatar_url de Google (-> nulo)
--   K: email; nombre = objeto JSON, name = "ab" (solo name es string válido)
--   L: email; nombre con más de 100 000 caracteres de relleno (espacios y ZWSP) alrededor de "Lu"
--   M: email; nombre y name solo con rellenos Hangul (invisibles pero [[:alnum:]]) -> nulo
--   N: email; nombre con guion suave, MVS, etiqueta U+E0041, CGJ, rellenos y jemer -> 'AB'
-- raw_app_meta_data.provider lo fija GoTrue (el cliente no lo controla); si falta, se
-- trata como 'email'.
-- ---------------------------------------------------------------------------

insert into auth.users (id, email, aud, role, raw_app_meta_data, raw_user_meta_data)
values
  ('aaaaaaaa-0000-4000-8000-000000000001', 'a@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "email"}',
   '{"nombre": "  Ana Test  ", "terminos_aceptados": true}'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'b@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "email"}',
   '{"nombre": "Beto Test", "terminos_aceptados": true}'),
  ('cccccccc-0000-4000-8000-000000000003', 'c@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "google"}',
   '{"full_name": "Carla Google", "name": "Carla", "picture": "https://lh3.googleusercontent.com/a/foto"}'),
  ('dddddddd-0000-4000-8000-000000000004', 'd@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "email"}',
   '{"name": "Diego Api"}'),
  ('eeeeeeee-0000-4000-8000-000000000005', 'e@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "google"}',
   '{"nombre": " x ", "avatar_url": "http://inseguro.test/a.png", "terminos_aceptados": "false"}'),
  ('ffffffff-0000-4000-8000-000000000006', 'f@prueba.test', 'authenticated', 'authenticated',
   null,
   jsonb_build_object('nombre', repeat('n', 70), 'avatar_url', 'https://lh3.googleusercontent.com/a/f')),
  ('11111111-0000-4000-8000-000000000007', 'g@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "google"}',
   '{"full_name": {"a": 1}, "name": "Gabi", "avatar_url": "https://tracker.evil.test/pixel.gif",
     "picture": "https://lh3.googleusercontent.com/a/gabi=s96-c"}'),
  ('22222222-0000-4000-8000-000000000008', 'h@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "google"}',
   jsonb_build_object('nombre', E'\n\n', 'full_name', 123,
     'avatar_url', 'https://lh3.googleusercontent.com/" onerror=alert(1) x="')),
  ('33333333-0000-4000-8000-000000000009', 'i@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "google"}',
   jsonb_build_object('name', E'  Iván\t\u202E  Núñez\u200B ',
     'avatar_url', 'https://lh3.googleusercontent.com/' || repeat('a', 3000))),
  ('44444444-0000-4000-8000-00000000000a', 'j@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "email"}',
   '{"nombre": "José O''Brien-Peña", "avatar_url": "https://lh3.googleusercontent.com/a/j"}'),
  ('55555555-0000-4000-8000-00000000000b', 'k@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "email"}',
   '{"nombre": {"a": 1}, "full_name": ["x", "y"], "name": "ab"}'),
  ('66666666-0000-4000-8000-00000000000c', 'l@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "email"}',
   jsonb_build_object('nombre', repeat(' ', 50000) || repeat(E'\u200B', 50000) || 'Lu' || repeat(E'\n', 3))),
  ('77777777-0000-4000-8000-00000000000d', 'm@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "email"}',
   jsonb_build_object('nombre', E'\u3164\u3164', 'name', E'\uFFA0\u115F')),
  ('88888888-0000-4000-8000-00000000000e', 'n@prueba.test', 'authenticated', 'authenticated',
   '{"provider": "email"}',
   jsonb_build_object('nombre', E'A\u00AD\u180E\U000E0041\u034FB\u115F\u1160\u17B4\u17B5\uFFA0'));

-- ---------------------------------------------------------------------------
-- Estructura, RLS y privilegios
-- ---------------------------------------------------------------------------

select has_table('public', 'users', 'existe public.users');
select hasnt_column('public', 'users', 'email', 'CA-27: public.users no tiene columna de email');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.users'::regclass),
  'RLS habilitado en public.users'
);
select table_privs_are('public', 'users', 'anon', array[]::text[],
  'CA-26: anon no tiene privilegios sobre public.users');
select table_privs_are('public', 'users', 'authenticated', array['SELECT'],
  'authenticated solo tiene SELECT a nivel de tabla');
select column_privs_are('public', 'users', 'nombre', 'authenticated', array['SELECT', 'UPDATE'],
  'authenticated puede leer y actualizar nombre');
select column_privs_are('public', 'users', 'rol', 'authenticated', array['SELECT', 'UPDATE'],
  'authenticated puede leer y actualizar rol');
select column_privs_are('public', 'users', 'terminos_aceptados_at', 'authenticated', array['SELECT', 'UPDATE'],
  'authenticated puede leer y actualizar terminos_aceptados_at');
select column_privs_are('public', 'users', 'avatar', 'authenticated', array['SELECT'],
  'authenticated no puede actualizar avatar');
select column_privs_are('public', 'users', 'id', 'authenticated', array['SELECT'],
  'authenticated no puede actualizar id');
select column_privs_are('public', 'users', 'created_at', 'authenticated', array['SELECT'],
  'authenticated no puede actualizar created_at');
select policies_are('public', 'users',
  array['users: autenticados pueden leer', 'users: cada quien edita su perfil'],
  'Solo hay políticas de select y update (sin insert ni delete)');
select policy_cmd_is('public', 'users', 'users: cada quien edita su perfil', 'update',
  'La política de edición es solo para update');

-- Funciones
select ok(
  (select prosecdef from pg_proc where oid = 'public.handle_new_user()'::regprocedure),
  'handle_new_user es security definer'
);
select is(
  (select proconfig from pg_proc where oid = 'public.handle_new_user()'::regprocedure),
  array['search_path=""'],
  'handle_new_user fija search_path vacío'
);
select is(
  (select proconfig from pg_proc where oid = 'public.users_proteger_columnas()'::regprocedure),
  array['search_path=""'],
  'users_proteger_columnas fija search_path vacío'
);
select ok(
  not has_function_privilege('anon', 'public.handle_new_user()', 'execute')
  and not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'anon y authenticated no pueden ejecutar handle_new_user'
);
select ok(
  not has_function_privilege('anon', 'public.users_proteger_columnas()', 'execute')
  and not has_function_privilege('authenticated', 'public.users_proteger_columnas()', 'execute'),
  'B-4: anon y authenticated no pueden ejecutar users_proteger_columnas'
);
select ok(
  not has_function_privilege('anon', 'public.normalizar_nombre(text)', 'execute'),
  'anon no puede ejecutar normalizar_nombre'
);
select ok(
  has_function_privilege('authenticated', 'public.normalizar_nombre(text)', 'execute'),
  'authenticated puede ejecutar normalizar_nombre (la llama users_proteger_columnas, security invoker)'
);
select ok(
  (select provolatile = 'i' and not prosecdef and proconfig = array['search_path=""']
   from pg_proc where oid = 'public.normalizar_nombre(text)'::regprocedure),
  'normalizar_nombre es immutable, security invoker y fija search_path vacío'
);
select ok(
  not (('李明' collate "C") ~ '[[:alnum:]]')
  and (('李明' collate "C") collate pg_c_utf8) ~ '[[:alnum:]]',
  'B-2: con collate "C" [[:alnum:]] no reconoce 李明; con pg_c_utf8 sí'
);
select is(
  public.normalizar_nombre(E'  李明\u00A0\u3000' collate "C"),
  '李明',
  'B-2: normalizar_nombre trata NBSP e ideográfico como espacio aunque la entrada sea collate "C"'
);
select ok(
  (select pg_get_constraintdef(oid) like '%pg_c_utf8%' from pg_constraint
   where conname = 'users_nombre_check' and conrelid = 'public.users'::regclass)
  and (select pg_get_constraintdef(oid) like '%pg_c_utf8%' from pg_constraint
   where conname = 'users_avatar_check' and conrelid = 'public.users'::regclass),
  'B-2: los checks de nombre y avatar evalúan las regex con pg_c_utf8'
);
select has_trigger('auth', 'users', 'on_auth_user_created', 'Trigger de alta en auth.users');
select has_trigger('public', 'users', 'users_proteger_columnas', 'Trigger de protección en public.users');

-- ---------------------------------------------------------------------------
-- Trigger de alta (CA-01, CA-09)
-- ---------------------------------------------------------------------------

select results_eq(
  $$ select nombre, rol, terminos_aceptados_at is not null
     from public.users where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  $$ values ('Ana Test'::text, null::text, true) $$,
  'CA-01: registro con bandera crea fila con nombre recortado, rol nulo y términos aceptados'
);
select results_eq(
  $$ select nombre, avatar, rol, terminos_aceptados_at
     from public.users where id = 'cccccccc-0000-4000-8000-000000000003' $$,
  $$ values ('Carla Google'::text, 'https://lh3.googleusercontent.com/a/foto'::text, null::text, null::timestamptz) $$,
  'CA-09: Google toma full_name y picture; términos y rol nulos'
);
select results_eq(
  $$ select nombre, terminos_aceptados_at from public.users where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  $$ values ('Diego Api'::text, null::timestamptz) $$,
  'Sin la bandera terminos_aceptados queda nulo; usa la clave name'
);
select results_eq(
  $$ select nombre, avatar, terminos_aceptados_at from public.users where id = 'eeeeeeee-0000-4000-8000-000000000005' $$,
  $$ values (null::text, null::text, null::timestamptz) $$,
  'Nombre de menos de 2 caracteres, avatar http y bandera "false" quedan nulos'
);
select results_eq(
  $$ select char_length(nombre), avatar from public.users where id = 'ffffffff-0000-4000-8000-000000000006' $$,
  $$ values (60, null::text) $$,
  'Nombre largo se recorta a 60; sin proveedor OAuth (email) el avatar_url se ignora'
);

-- M-1 y M-2 en el alta
select results_eq(
  $$ select nombre, avatar from public.users where id = '11111111-0000-4000-8000-000000000007' $$,
  $$ values ('Gabi'::text, 'https://lh3.googleusercontent.com/a/gabi=s96-c'::text) $$,
  'M-1/M-2: full_name no string se ignora; avatar de host ajeno se ignora y se usa picture de Google'
);
select results_eq(
  $$ select nombre, avatar from public.users where id = '22222222-0000-4000-8000-000000000008' $$,
  $$ values (null::text, null::text) $$,
  'M-1/M-2: nombre "\n\n" y full_name numérico -> nulo; avatar con comillas -> nulo'
);
select results_eq(
  $$ select nombre, avatar from public.users where id = '33333333-0000-4000-8000-000000000009' $$,
  $$ values ('Iván Núñez'::text, null::text) $$,
  'M-2: name con tab, RLO y ZWSP se normaliza; M-1: avatar de más de 2048 caracteres -> nulo'
);
select results_eq(
  $$ select nombre, avatar from public.users where id = '44444444-0000-4000-8000-00000000000a' $$,
  $$ values ('José O''Brien-Peña'::text, null::text) $$,
  'Nombre con tildes, ñ, apóstrofe y guion se conserva; registro por email con avatar -> nulo'
);
select is(
  (select nombre from public.users where id = '55555555-0000-4000-8000-00000000000b'),
  'ab',
  'M-2: nombre objeto JSON y full_name arreglo se ignoran (no se guarda {"a": 1} como texto)'
);
select is(
  (select nombre from public.users where id = '66666666-0000-4000-8000-00000000000c'),
  'Lu',
  'M-2: más de 100 000 caracteres de relleno (espacios, ZWSP, saltos) se eliminan en el alta'
);
select is(
  (select nombre from public.users where id = '77777777-0000-4000-8000-00000000000d'),
  null,
  'B-1: nombre solo con rellenos Hangul (U+3164, U+FFA0, U+115F) -> nulo en el alta'
);
select is(
  (select nombre from public.users where id = '88888888-0000-4000-8000-00000000000e'),
  'AB',
  'B-1: guion suave, CGJ, rellenos Hangul, jemer, MVS y etiquetas se borran en el alta'
);

-- ---------------------------------------------------------------------------
-- Checks de tabla sobre el valor guardado (con triggers desactivados, como postgres)
-- ---------------------------------------------------------------------------

set local session_replication_role = replica;

select throws_ok(
  $$ update public.users set nombre = E'\n\n' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'Check: nombre "\n\n" rechazado'
);
select throws_ok(
  $$ update public.users set nombre = E'Ana\u202Etxt' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'Check: nombre con U+202E (RLO) rechazado'
);
select throws_ok(
  $$ update public.users set nombre = E'Ana\u200BBeto' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'Check: nombre con espacio de ancho cero rechazado'
);
select throws_ok(
  $$ update public.users set nombre = 'Ana' || repeat(' ', 100000) where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'Check: nombre con relleno sin recortar rechazado (mide el valor guardado)'
);
select throws_ok(
  $$ update public.users set nombre = E'\u3164\u3164' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'B-1 check: nombre solo con rellenos Hangul rechazado'
);
select throws_ok(
  $$ update public.users set nombre = E'A\u00ADB' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'B-1 check: nombre con guion suave rechazado'
);
select throws_ok(
  $$ update public.users set nombre = E'A\U000E0041B' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'B-1 check: nombre con carácter de etiqueta (U+E0041) rechazado'
);
select lives_ok(
  $$ update public.users set nombre = '李明' collate "C" where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  'B-2 check: nombre solo con caracteres chinos aceptado aunque el valor venga con collate "C"'
);
select throws_ok(
  $$ update public.users set nombre = ' Ana' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'Check: nombre sin recortar rechazado'
);
select throws_ok(
  $$ update public.users set nombre = '-- !!' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'Check: nombre sin letras ni números rechazado'
);
select throws_ok(
  $$ update public.users set avatar = 'https://tracker.evil.test/pixel.gif' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'M-1 check: avatar de host ajeno rechazado'
);
select throws_ok(
  $$ update public.users set avatar = 'https://" onerror=alert(1) x="' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'M-1 check: avatar con comillas rechazado'
);
select throws_ok(
  $$ update public.users set avatar = 'https://lh3.googleusercontent.com/a/x" onerror="y' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'M-1 check: avatar de Google con comillas rechazado'
);
select throws_ok(
  $$ update public.users set avatar = 'https://lh3.googleusercontent.com/' || repeat('a', 200000) where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'M-1 check: avatar de más de 2048 caracteres rechazado'
);
select throws_ok(
  $$ update public.users set avatar = 'https://lh3.googleusercontent.com.evil.test/a' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null, 'M-1 check: dominio que solo empieza como el de Google rechazado'
);
select lives_ok(
  $$ update public.users set avatar = 'https://lh3.googleusercontent.com/a/ACg8oc-x_Y=s96-c' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  'M-1 check: avatar real de Google aceptado'
);

set local session_replication_role = origin;

-- ---------------------------------------------------------------------------
-- Usuario A autenticado
-- ---------------------------------------------------------------------------

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}', true);

-- CA-27: lectura de columnas públicas de otros usuarios
select results_eq(
  $$ select nombre, avatar, rol from public.users where id = 'cccccccc-0000-4000-8000-000000000003' $$,
  $$ values ('Carla Google'::text, 'https://lh3.googleusercontent.com/a/foto'::text, null::text) $$,
  'CA-27: A lee nombre, avatar y rol de C'
);
select isnt_empty(
  $$ select id, created_at from public.users where id = 'bbbbbbbb-0000-4000-8000-000000000002' $$,
  'CA-27: A lee id y created_at de B'
);
select is(
  (select count(*)::int from public.users where id in (
    'aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002',
    'cccccccc-0000-4000-8000-000000000003', 'dddddddd-0000-4000-8000-000000000004',
    'eeeeeeee-0000-4000-8000-000000000005', 'ffffffff-0000-4000-8000-000000000006')),
  6,
  'CA-27: A ve las filas de todos los usuarios'
);

-- CA-23: A no puede editar la fila de B
select is_empty(
  $$ update public.users set nombre = 'Hackeado' where id = 'bbbbbbbb-0000-4000-8000-000000000002' returning id $$,
  'CA-23: A actualiza nombre de B -> 0 filas'
);
select is_empty(
  $$ update public.users set rol = 'propietario' where id = 'bbbbbbbb-0000-4000-8000-000000000002' returning id $$,
  'CA-23: A actualiza rol de B -> 0 filas'
);
select throws_ok(
  $$ update public.users set avatar = 'https://malo.test/x.png' where id = 'bbbbbbbb-0000-4000-8000-000000000002' $$,
  '42501', null,
  'CA-23: A actualiza avatar de B -> permiso denegado'
);

-- CA-24: insert y delete rechazados
select throws_ok(
  $$ insert into public.users (id, nombre) values ('aaaaaaaa-0000-4000-8000-000000000001', 'Otra') $$,
  '42501', null,
  'CA-24: A no puede insertar su propia fila'
);
select throws_ok(
  $$ insert into public.users (id, nombre) values (gen_random_uuid(), 'Fantasma') $$,
  '42501', null,
  'CA-24: A no puede insertar una fila con otro id'
);
select throws_ok(
  $$ delete from public.users where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null,
  'CA-24: A no puede borrar su propia fila'
);
select throws_ok(
  $$ delete from public.users where id = 'bbbbbbbb-0000-4000-8000-000000000002' $$,
  '42501', null,
  'CA-24: A no puede borrar la fila de B'
);

-- CA-25: columnas protegidas y dominio de rol
select throws_ok(
  $$ update public.users set id = gen_random_uuid() where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null,
  'CA-25: A no puede cambiar su id'
);
select throws_ok(
  $$ update public.users set created_at = now() - interval '1 year' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null,
  'CA-25: A no puede cambiar su created_at'
);
select throws_ok(
  $$ update public.users set avatar = 'https://propio.test/a.png' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null,
  'CA-25: A no puede cambiar su propio avatar en fase 1'
);
select throws_ok(
  $$ update public.users set rol = 'admin' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '23514', null,
  'CA-25: rol fuera de dominio -> violación del check'
);
select throws_ok(
  $$ update public.users set nombre = ' a ' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '23514', null,
  'D-09: nombre de menos de 2 caracteres -> violación del check'
);

-- A sí puede editar su propio perfil
select results_eq(
  $$ update public.users set nombre = 'Ana Editada', rol = 'buscador'
     where id = 'aaaaaaaa-0000-4000-8000-000000000001' returning nombre, rol $$,
  $$ values ('Ana Editada'::text, 'buscador'::text) $$,
  'A edita su propio nombre y rol'
);

-- rol y nombre no vuelven a nulo
select throws_ok(
  $$ update public.users set rol = null where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '23514', 'El rol no puede quedar vacío',
  'rol definido no vuelve a nulo'
);
select throws_ok(
  $$ update public.users set nombre = null where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '23514', 'El nombre no puede quedar vacío',
  'nombre definido no vuelve a nulo'
);

-- Términos inmutables una vez aceptados
select throws_ok(
  $$ update public.users set terminos_aceptados_at = null where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', 'La aceptación de los términos no se puede modificar',
  'terminos_aceptados_at no se puede borrar'
);
select throws_ok(
  $$ update public.users set terminos_aceptados_at = '2000-01-01' where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', 'La aceptación de los términos no se puede modificar',
  'terminos_aceptados_at no se puede reescribir'
);

-- ---------------------------------------------------------------------------
-- Usuario B autenticado: tampoco puede tocar la fila de A
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "bbbbbbbb-0000-4000-8000-000000000002", "role": "authenticated"}', true);

select is_empty(
  $$ update public.users set nombre = 'Hackeado por B', rol = 'ambos'
     where id = 'aaaaaaaa-0000-4000-8000-000000000001' returning id $$,
  'CA-23: B actualiza nombre y rol de A -> 0 filas'
);
select results_eq(
  $$ update public.users set nombre = 'Beto Editado' returning id $$,
  $$ values ('bbbbbbbb-0000-4000-8000-000000000002'::uuid) $$,
  'CA-23: un update sin filtro de B solo afecta su propia fila'
);

-- ---------------------------------------------------------------------------
-- Usuario D: normalización del nombre en updates propios (M-2)
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "dddddddd-0000-4000-8000-000000000004", "role": "authenticated"}', true);

select results_eq(
  $$ update public.users set nombre = E'  Diego \t\n  Nuevo  ' where id = 'dddddddd-0000-4000-8000-000000000004' returning nombre $$,
  $$ values ('Diego Nuevo'::text) $$,
  'M-2: espacios extra, tab y salto de línea se normalizan en el update'
);
select results_eq(
  $$ update public.users set nombre = 'Dí' || repeat(' ', 50000) || repeat(E'\u200B', 50000) || 'ego' || repeat(E'\u00A0', 3)
     where id = 'dddddddd-0000-4000-8000-000000000004' returning nombre $$,
  $$ values ('Dí ego'::text) $$,
  'M-2: más de 100 000 caracteres de relleno se limpian en el update (no quedan guardados)'
);
select results_eq(
  $$ update public.users set nombre = E'Die\u202Ego' where id = 'dddddddd-0000-4000-8000-000000000004' returning nombre $$,
  $$ values ('Diego'::text) $$,
  'M-2: U+202E (RLO) se elimina en el update'
);
select throws_ok(
  $$ update public.users set nombre = E'\n\n' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', 'El nombre debe tener entre 2 y 60 caracteres y al menos una letra o número',
  'M-2: nombre "\n\n" en update -> check_violation con mensaje en español'
);
select throws_ok(
  $$ update public.users set nombre = E'\u202E' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', 'El nombre debe tener entre 2 y 60 caracteres y al menos una letra o número',
  'M-2: nombre solo con U+202E en update -> check_violation'
);
select throws_ok(
  $$ update public.users set nombre = repeat('d', 61) where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', 'El nombre debe tener entre 2 y 60 caracteres y al menos una letra o número',
  'M-2: nombre de 61 caracteres en update -> check_violation (no se trunca)'
);
select throws_ok(
  $$ update public.users set nombre = 'D' || repeat('x', 100002) where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null,
  'M-2: nombre de 100 003 caracteres en update -> check_violation'
);
select throws_ok(
  $$ update public.users set nombre = '-- ..' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', null,
  'M-2: nombre sin letras ni números en update -> check_violation'
);
select results_eq(
  $$ update public.users set nombre = 'María-José Ñúñez O''Connor 😀' where id = 'dddddddd-0000-4000-8000-000000000004' returning nombre $$,
  $$ values ('María-José Ñúñez O''Connor 😀'::text) $$,
  'Nombres legítimos con tildes, ñ, guion, apóstrofe y emoji se aceptan sin cambios'
);
select throws_ok(
  $$ update public.users set nombre = E'\u3164\u3164' where id = 'dddddddd-0000-4000-8000-000000000004' $$,
  '23514', 'El nombre debe tener entre 2 y 60 caracteres y al menos una letra o número',
  'B-1: nombre solo con rellenos Hangul en update -> check_violation'
);
select results_eq(
  $$ update public.users set nombre = E'D\u00AD\u180E\U000E0041\u034Fi\u115F\u1160\u17B4\u17B5\uFFA0ego' where id = 'dddddddd-0000-4000-8000-000000000004' returning nombre $$,
  $$ values ('Diego'::text) $$,
  'B-1: los invisibles nuevos se borran en el update'
);
select results_eq(
  $$ update public.users set nombre = '李明' collate "C" where id = 'dddddddd-0000-4000-8000-000000000004' returning nombre $$,
  $$ values ('李明'::text) $$,
  'B-2: nombre solo con caracteres chinos aceptado en update aunque venga con collate "C"'
);
select results_eq(
  $$ update public.users set nombre = repeat('d', 60) where id = 'dddddddd-0000-4000-8000-000000000004' returning char_length(nombre) $$,
  $$ values (60) $$,
  'Nombre de exactamente 60 caracteres se acepta'
);

-- ---------------------------------------------------------------------------
-- Usuario C (Google) acepta términos en el onboarding: la hora la pone el servidor
-- ---------------------------------------------------------------------------

select set_config('request.jwt.claims',
  '{"sub": "cccccccc-0000-4000-8000-000000000003", "role": "authenticated"}', true);

select results_eq(
  $$ update public.users set rol = 'propietario', terminos_aceptados_at = '2000-01-01'
     where id = 'cccccccc-0000-4000-8000-000000000003' returning rol, terminos_aceptados_at $$,
  $$ values ('propietario'::text, now()) $$,
  'D-16/CA-43: onboarding fija rol y términos en un update; la hora es now() del servidor'
);
select throws_ok(
  $$ update public.users set terminos_aceptados_at = now() + interval '1 day'
     where id = 'cccccccc-0000-4000-8000-000000000003' $$,
  '42501', 'La aceptación de los términos no se puede modificar',
  'Tras aceptar, terminos_aceptados_at es inmutable'
);

-- ---------------------------------------------------------------------------
-- Comprobación como postgres: las filas de A y B quedaron como las dejó cada dueño
-- ---------------------------------------------------------------------------

reset role;

select results_eq(
  $$ select id, nombre, rol from public.users
     where id in ('aaaaaaaa-0000-4000-8000-000000000001', 'bbbbbbbb-0000-4000-8000-000000000002')
     order by id $$,
  $$ values ('aaaaaaaa-0000-4000-8000-000000000001'::uuid, 'Ana Editada'::text, 'buscador'::text),
            ('bbbbbbbb-0000-4000-8000-000000000002'::uuid, 'Beto Editado'::text, null::text) $$,
  'CA-23: ningún usuario modificó la fila del otro'
);

-- El trigger de protección también aplica a roles privilegiados
select throws_ok(
  $$ update public.users set created_at = now() - interval '1 day'
     where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', 'No se puede cambiar la fecha de creación del perfil',
  'El trigger bloquea created_at incluso para postgres'
);
-- B-4: la rama del id solo es alcanzable con un rol que tenga UPDATE sobre id
-- (authenticated choca antes con el permiso de columna).
select throws_ok(
  $$ update public.users set id = 'bbbbbbbb-0000-4000-8000-000000000002'
     where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', 'No se puede cambiar el id del perfil',
  'B-4: el trigger bloquea cambiar el id incluso para postgres'
);

-- El delete en cascada desde auth.users sí elimina el perfil
delete from auth.users where id = 'ffffffff-0000-4000-8000-000000000006';
select is_empty(
  $$ select 1 from public.users where id = 'ffffffff-0000-4000-8000-000000000006' $$,
  'Borrar la cuenta de Auth borra el perfil (cascada)'
);

-- ---------------------------------------------------------------------------
-- CA-26: anon
-- ---------------------------------------------------------------------------

set local role anon;
select set_config('request.jwt.claims', '{"role": "anon"}', true);

select throws_ok(
  $$ select * from public.users $$,
  '42501', null,
  'CA-26: anon no puede consultar public.users (sin filas)'
);
select throws_ok(
  $$ update public.users set nombre = 'Anon' $$,
  '42501', null,
  'CA-26: anon no puede actualizar public.users'
);
select throws_ok(
  $$ insert into public.users (id, nombre) values (gen_random_uuid(), 'Anon') $$,
  '42501', null,
  'B-4: anon no puede insertar en public.users'
);
select throws_ok(
  $$ delete from public.users where id = 'aaaaaaaa-0000-4000-8000-000000000001' $$,
  '42501', null,
  'B-4: anon no puede borrar de public.users'
);
select throws_ok(
  $$ select public.normalizar_nombre('x') $$,
  '42501', null,
  'anon no puede llamar a normalizar_nombre'
);

reset role;

select * from finish();

rollback;
