-- Fase 1 · 001-setup-base
-- Perfil público de cada cuenta de Auth: public.users (D-09, D-10, D-16).
-- Defensa en dos capas: privilegios de tabla/columna + políticas RLS (CA-23..CA-27).

-- ---------------------------------------------------------------------------
-- 1. Tabla
-- ---------------------------------------------------------------------------

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Nombre visible (no necesariamente el completo). Nulo solo para OAuth sin nombre;
  -- el onboarding lo exige (D-09: 2–60 caracteres). El check mide el valor guardado:
  -- ya recortado, sin caracteres de control (C0, DEL, C1, separadores de línea) ni
  -- invisibles/de dirección de texto (ALM, ZWSP..RLM, LRE..RLO, WJ..U+2064, LRI..PDI,
  -- BOM, guion suave, CGJ, rellenos Hangul, vocales inherentes jemer, MVS y etiquetas
  -- U+E0000..U+E007F) y con al menos una letra o número. Los triggers normalizan antes
  -- de guardar. Las clases de regex se evalúan con collate pg_c_utf8 (Unicode, igual en
  -- cualquier datctype; con "C" se rechazarían nombres sin letras ASCII).
  nombre text constraint users_nombre_check check (
    nombre is null or (
      char_length(nombre) between 2 and 60
      and nombre = btrim(nombre)
      and (nombre collate pg_c_utf8) !~ '[\u0000-\u001F\u007F-\u009F\u061C\u200B-\u200F\u2028-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u00AD\u034F\u115F\u1160\u17B4\u17B5\u180E\u3164\uFFA0\U000E0000-\U000E007F]'
      and (nombre collate pg_c_utf8) ~ '[[:alnum:]]'
    )
  ),
  -- Foto del proveedor OAuth (fase 1). Solo el CDN de fotos de perfil de Google, sin
  -- espacios, comillas ni < >, y con longitud acotada (M-1 de T14).
  avatar text constraint users_avatar_check check (
    avatar is null or (
      char_length(avatar) <= 2048
      and (avatar collate pg_c_utf8) ~ '^https://lh3\.googleusercontent\.com/[^\s"''<>]*$'
    )
  ),
  -- Nulo = onboarding pendiente.
  rol text check (rol in ('buscador', 'propietario', 'ambos')),
  -- Aceptación de Términos, Aviso de Privacidad y edad mínima (D-16, Ley 8968).
  -- La hora la fija el servidor y es inmutable una vez puesta (ver trigger de protección).
  terminos_aceptados_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table public.users is
  'Perfil público de cada cuenta. Se crea por trigger al insertar en auth.users; el email vive solo en auth.users.';

-- Sin índices adicionales: en fase 1 solo se filtra por la PK.

-- ---------------------------------------------------------------------------
-- 2. Privilegios y RLS
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;

-- Sin privilegios por defecto para los roles de la Data API (CA-24, CA-26).
revoke all on public.users from anon, authenticated;

-- Lectura de todas las columnas para autenticados (CA-27; no hay columna de email).
grant select on public.users to authenticated;

-- Actualización solo de las columnas editables por el usuario. id, created_at y avatar
-- quedan fuera (CA-23, CA-25): cualquier intento da "permission denied".
grant update (nombre, rol, terminos_aceptados_at) on public.users to authenticated;

create policy "users: autenticados pueden leer" on public.users
  for select to authenticated
  using (true);

create policy "users: cada quien edita su perfil" on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Sin políticas de insert ni delete: el insert lo hace solo el trigger de alta
-- (security definer) y el delete ocurre solo por cascada desde auth.users.

-- ---------------------------------------------------------------------------
-- 3. Normalización del nombre
-- ---------------------------------------------------------------------------
-- Quita caracteres invisibles y de dirección de texto (el mismo conjunto que prohíbe
-- users_nombre_check, sin contar los de control, que se vuelven espacio), convierte cualquier secuencia de
-- espacios en blanco o caracteres de control (tabs, saltos de línea, NBSP, etc.) en un
-- solo espacio y recorta los extremos. No recorta la longitud: el alta trunca a 60 y el
-- update deja que falle el check. Pura e inmutable; la usan ambos triggers.
-- authenticated necesita EXECUTE porque users_proteger_columnas es security invoker y se
-- ejecuta con el rol de quien hace el update (no expone datos: solo transforma texto).

create function public.normalizar_nombre(p_nombre text)
returns text
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select btrim(
    regexp_replace(
      regexp_replace(
        p_nombre collate pg_c_utf8,
        '[\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF\u00AD\u034F\u115F\u1160\u17B4\u17B5\u180E\u3164\uFFA0\U000E0000-\U000E007F]', '', 'g'
      ),
      '[\s\u0000-\u001F\u007F-\u009F\u2028\u2029]+', ' ', 'g'
    )
  );
$$;

revoke execute on function public.normalizar_nombre(text) from public, anon;
grant execute on function public.normalizar_nombre(text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Trigger de protección de columnas (before update)
-- ---------------------------------------------------------------------------
-- Segunda barrera tras los privilegios por columna; aplica también a roles con más
-- privilegios (postgres, service_role) salvo que desactiven el trigger.
--   * id y created_at son inmutables.
--   * terminos_aceptados_at: solo pasa de nulo a la hora del servidor (se ignora el valor
--     que mande el cliente) y no cambia después (CA-25, D-16).
--   * rol y nombre no vuelven a nulo una vez definidos.
--   * nombre se normaliza (normalizar_nombre) al cambiar; si aun así no cumple el check,
--     falla con check_violation (23514) y un mensaje en español.

create function public.users_proteger_columnas()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'No se puede cambiar el id del perfil'
      using errcode = 'insufficient_privilege';
  end if;

  if new.created_at is distinct from old.created_at then
    raise exception 'No se puede cambiar la fecha de creación del perfil'
      using errcode = 'insufficient_privilege';
  end if;

  if old.terminos_aceptados_at is not null then
    if new.terminos_aceptados_at is distinct from old.terminos_aceptados_at then
      raise exception 'La aceptación de los términos no se puede modificar'
        using errcode = 'insufficient_privilege';
    end if;
  elsif new.terminos_aceptados_at is not null then
    new.terminos_aceptados_at := now();
  end if;

  if old.rol is not null and new.rol is null then
    raise exception 'El rol no puede quedar vacío'
      using errcode = 'check_violation';
  end if;

  if old.nombre is not null and new.nombre is null then
    raise exception 'El nombre no puede quedar vacío'
      using errcode = 'check_violation';
  end if;

  if new.nombre is distinct from old.nombre and new.nombre is not null then
    new.nombre := public.normalizar_nombre(new.nombre);
    if char_length(new.nombre) not between 2 and 60 or (new.nombre collate pg_c_utf8) !~ '[[:alnum:]]' then
      raise exception 'El nombre debe tener entre 2 y 60 caracteres y al menos una letra o número'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.users_proteger_columnas() from public, anon, authenticated;

create trigger users_proteger_columnas
  before update on public.users
  for each row
  execute function public.users_proteger_columnas();

-- ---------------------------------------------------------------------------
-- 5. Trigger de alta (after insert on auth.users)
-- ---------------------------------------------------------------------------
-- Crea el perfil con el mismo id (RF-10, CA-01, CA-09). Lee raw_user_meta_data:
--   * nombre: la primera de 'nombre' (registro por email), 'full_name' o 'name' (Google)
--     que sea string JSON y que, normalizada y truncada a 60, cumpla el check; si ninguna
--     cumple, nulo (el onboarding lo pide). Nunca lanza error.
--   * avatar: 'avatar_url' o 'picture' solo si el proveedor real (raw_app_meta_data, que
--     el cliente no controla) no es 'email', el valor es string, mide ≤ 2048 y es del CDN
--     de Google (misma regla que el check); si no, nulo.
--   * terminos_aceptados_at: now() solo si 'terminos_aceptados' = true (lo envía el
--     formulario de registro). Para Google la clave no existe y el onboarding la exige.
--   * rol: nulo (onboarding pendiente).
-- raw_user_meta_data lo controla el cliente; solo se usa para datos que el propio usuario
-- declara y todos pasan por los check de la tabla.

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_proveedor text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_clave text;
  v_valor text;
  v_nombre text;
  v_avatar text;
begin
  foreach v_clave in array array['nombre', 'full_name', 'name'] loop
    if jsonb_typeof(meta -> v_clave) = 'string' then
      v_valor := btrim(left(public.normalizar_nombre(meta ->> v_clave), 60));
      if char_length(v_valor) between 2 and 60 and (v_valor collate pg_c_utf8) ~ '[[:alnum:]]' then
        v_nombre := v_valor;
        exit;
      end if;
    end if;
  end loop;

  if v_proveedor <> 'email' then
    foreach v_clave in array array['avatar_url', 'picture'] loop
      if jsonb_typeof(meta -> v_clave) = 'string' then
        v_valor := meta ->> v_clave;
        if char_length(v_valor) <= 2048
           and (v_valor collate pg_c_utf8) ~ '^https://lh3\.googleusercontent\.com/[^\s"''<>]*$' then
          v_avatar := v_valor;
          exit;
        end if;
      end if;
    end loop;
  end if;

  insert into public.users (id, nombre, avatar, rol, terminos_aceptados_at)
  values (
    new.id,
    v_nombre,
    v_avatar,
    null,
    case when meta ->> 'terminos_aceptados' = 'true' then now() end
  );

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
