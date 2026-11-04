-- Seed local de CasaLimón (solo para `pnpm supabase db reset` en la máquina de desarrollo).
--
-- Datos 100 % ficticios con dominio .test (no recibe correo real). Nunca se aplica al remoto.
--
-- Usuarios de prueba (ambos con email confirmado y términos aceptados):
--   ana@casalimon.test   rol 'buscador'   -> entra directo al Feed
--   beto@casalimon.test  sin rol          -> cae en el onboarding
--
-- Contraseña de prueba de ambos (solo local): CasaLimon-local-2026
--
-- El perfil en public.users lo crea el trigger on_auth_user_created a partir de
-- raw_user_meta_data (nombre + terminos_aceptados), igual que un registro real.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  -- GoTrue falla al leer nulos en las columnas de token: van como cadena vacía.
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  email_change_token_current,
  phone_change,
  phone_change_token,
  reauthentication_token
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'a0000000-0000-4000-8000-00000000a0a0',
    'authenticated',
    'authenticated',
    'ana@casalimon.test',
    extensions.crypt('CasaLimon-local-2026', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Ana Prueba", "terminos_aceptados": true}',
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b0000000-0000-4000-8000-00000000b0b0',
    'authenticated',
    'authenticated',
    'beto@casalimon.test',
    extensions.crypt('CasaLimon-local-2026', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"nombre": "Beto Prueba", "terminos_aceptados": true}',
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  );

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values
  (
    'a0000000-0000-4000-8000-00000000a0a0',
    'a0000000-0000-4000-8000-00000000a0a0',
    '{"sub": "a0000000-0000-4000-8000-00000000a0a0", "email": "ana@casalimon.test", "email_verified": true, "phone_verified": false}',
    'email',
    now(),
    now(),
    now()
  ),
  (
    'b0000000-0000-4000-8000-00000000b0b0',
    'b0000000-0000-4000-8000-00000000b0b0',
    '{"sub": "b0000000-0000-4000-8000-00000000b0b0", "email": "beto@casalimon.test", "email_verified": true, "phone_verified": false}',
    'email',
    now(),
    now(),
    now()
  );

-- Ana ya completó el onboarding; Beto no.
update public.users
set rol = 'buscador'
where id = 'a0000000-0000-4000-8000-00000000a0a0';
