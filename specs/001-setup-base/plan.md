# Plan — 001 Setup base
Spec: ./spec.md (Estado: Aprobada · 2026-10-28)

## Resumen técnico

La fase deja el proyecto listo para construir funcionalidades sobre cuatro piezas:

1. **Tooling:** Tailwind v4 vía `@tailwindcss/vite`, alias `@/` → `src/`, Prettier, Vitest con entorno DOM (jsdom) y Testing Library, `strict` explícito en TypeScript.
2. **Supabase:** carpeta `supabase/` con `config.toml` (Auth con confirmación obligatoria, Google, plantillas en español), una migración que crea `public.users` con dos triggers (alta y protección de columnas), RLS + privilegios por columna, seed con dos usuarios y pruebas pgTAP de RLS. Tipos generados en `src/lib/database.types.ts`.
3. **Frontend:** data router de React Router v8 con **loaders como guardas**, sesión en un store de Zustand alimentado por un único listener de `onAuthStateChange`, perfil en TanStack Query, flujo PKCE para OAuth y verificación por `token_hash` para enlaces de correo. Layout responsive con pestañas inferiores / barra lateral y placeholders.
4. **Infra:** `vercel.json` (rewrites SPA + cabeceras + CSP), GitHub Actions (lint, build, tests en jobs separados), configuración manual de Supabase remoto, Google Cloud, Vercel y protección de `main`.

### Estado real del repo (verificado el 2026-11-02)

| Archivo | Estado | Acción en esta fase |
|---|---|---|
| `package.json` | Scripts `dev`, `build`, `lint`, `preview`. Sin `test` ni `format`. Sin `packageManager`/`engines`. React 19.3, `react-router` 8.5, Vite 8.3, `@tailwindcss/vite` 4.3, Vitest 5.0, TS ~6.0.3, ESLint 10, `supabase` CLI 2.121 (dev), `vite-plugin-pwa` 2.0 (sin usar, D-08), `@testing-library/react` 16.3, `prettier` 3.9. | Agregar scripts, `packageManager: "pnpm@12.15.0"`, `engines.node >= 22.12`, dos devDependencies (ver abajo). |
| `vite.config.ts` | Solo `react()`. | Agregar `tailwindcss()`, alias `@`, bloque `test`. **No** registrar `VitePWA` (D-08). |
| `tsconfig.app.json` | Sin `strict` explícito (TS 6 lo activa por defecto, pero se declara), sin `paths`. | `"strict": true`, `"paths": { "@/*": ["./src/*"] }`. |
| `tsconfig.node.json` | Incluye solo `vite.config.ts`. | Sin cambios (la config de Vitest vive en `vite.config.ts`). |
| `eslint.config.js` | Recomendados de JS, typescript-eslint (incluye `no-explicit-any`), react-hooks, react-refresh. Ignora `dist`. | Ignorar también `coverage` y `supabase/functions` (Deno, fases futuras). |
| `.gitignore` | Cubre `*.local` (→ `.env.local`), pero **no** `.env`, `.env.*`, `.vercel`, ni artefactos de `supabase/`. | Completar (RF-23). |
| `index.html` | `lang="en"`, título `casalimon-web`. | `lang="es-CR"`, `<title>CasaLimón</title>`, `theme-color`, favicon propio. |
| `src/` | Plantilla Vite: `App.tsx`, `App.css`, `assets/`, `index.css` con variables de la plantilla y modo oscuro. | Reemplazar por la estructura del proyecto. |
| `public/` | `favicon.svg`, `icons.svg` (plantilla). | Favicon propio; borrar `icons.svg`. |
| `supabase/`, `.github/`, `vercel.json`, `.env.example` | No existen. | Crear. |
| Ramas | `main`, `001-setup-base`, remota `origin/master`. `git log origin/main..origin/master` está vacío: `master` no tiene commits propios. | El autor puede borrar `origin/master` (tarea manual). |

`@testing-library/dom@10.4.2` ya está en el lockfile como peer de `@testing-library/react` (lo instaló pnpm automáticamente); se usa a través de los re-exports de `@testing-library/react`, así que no se agrega como dependencia directa.

### Dependencias nuevas (solo de desarrollo; **ninguna de runtime**)

| Paquete | Tipo | Justificación |
|---|---|---|
| `jsdom` | dev | Vitest necesita un entorno DOM para Testing Library (es peer opcional de Vitest y hoy no está instalado). Se elige jsdom sobre happy-dom por ser el entorno de referencia de Testing Library, con mejor fidelidad en foco, formularios y `aria-*`, que es justo lo que prueban CA-05, CA-34 y CA-42. |
| `@testing-library/user-event` | dev | CA-05 (foco al primer campo con error) y CA-34 (navegación por teclado) requieren simular `Tab`, escritura y envío como lo hace un usuario. `fireEvent` no mueve el foco con `Tab`. |

Descartadas: `@testing-library/jest-dom` (los asserts se hacen con `document.activeElement`, `getAttribute` y `toBeDisabled` vía propiedades; se puede reconsiderar si las pruebas se vuelven verbosas), `happy-dom`, librerías de formularios (zod, react-hook-form: los formularios de la fase tienen 1–4 campos), librerías de íconos (4–6 íconos SVG inline), `eslint-config-prettier` (las configs actuales no traen reglas de estilo), `prettier-plugin-tailwindcss`, Playwright (la verificación visual de breakpoints es manual en esta fase).

## Datos (tablas, índices, RLS, Storage, triggers, Edge Functions)

Una sola migración: `supabase/migrations/<timestamp>_crear_users.sql` (creada con `pnpm supabase migration new crear_users`). Se construye en varias tareas mientras no se haya aplicado al remoto; una vez aplicada, no se edita.

### Tabla `public.users`

```sql
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text check (nombre is null or char_length(btrim(nombre)) between 2 and 60),
  avatar text check (avatar is null or avatar ~ '^https://'),
  rol text check (rol in ('buscador', 'propietario', 'ambos')),
  terminos_aceptados_at timestamptz,
  created_at timestamptz not null default now()
);
```

- `nombre` admite `null` solo para el caso OAuth sin nombre (RF-11); el onboarding lo exige (D-09: 2–60 caracteres).
- `rol` nulo = onboarding pendiente.
- **No hay columna `email`**: el email vive solo en `auth.users` (CA-27). La UI lo toma de la sesión (`session.user.email`).
- Índices: solo la PK (no hay filtros por otras columnas en fase 1).

### Privilegios y RLS (D-10, CA-23..CA-27)

Defensa en dos capas: privilegios de tabla/columna + políticas RLS.

```sql
alter table public.users enable row level security;

revoke all on public.users from anon, authenticated;           -- CA-24, CA-26
grant select on public.users to authenticated;
grant update (nombre, rol, terminos_aceptados_at) on public.users to authenticated;  -- no id, created_at, avatar

create policy "users: autenticados pueden leer" on public.users
  for select to authenticated using (true);
create policy "users: cada quien edita su perfil" on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);
-- Sin políticas de insert ni delete: insert solo por trigger, delete solo por cascada desde auth.users.
```

- CA-23: A intenta editar la fila de B → `using` filtra → 0 filas afectadas. Editar `avatar` de cualquiera → `permission denied` (sin grant de columna; en fase 1 el avatar solo viene del proveedor).
- CA-24: `insert`/`delete` → `permission denied` (privilegio revocado; además no hay política).
- CA-25: `update ... set id = ...` o `created_at = ...` → `permission denied` (sin grant de columna); el trigger de protección lo repite como segunda barrera. `rol` fuera de dominio → violación del `check`.
- CA-26: anon no tiene `select` → error de permiso / sin filas.
- CA-27: `select` de autenticados sobre todas las columnas; no existe columna de email.

### Trigger de protección `public.users_proteger_columnas()` (before update)

`security invoker`, `set search_path = ''`. Reglas:

- `new.id <> old.id` o `new.created_at <> old.created_at` → `raise exception`.
- `terminos_aceptados_at`:
  - si `old` no es nulo y `new` es distinto → `raise exception` (no se puede borrar ni reescribir);
  - si `old` es nulo y `new` no es nulo → `new.terminos_aceptados_at := now()` (la hora la fija el servidor, se ignora la del cliente).
- `rol` y `nombre`: si `old` no es nulo, `new` no puede ser nulo (no se “des-onboardea” un perfil).

### Trigger de alta `public.handle_new_user()` (after insert on `auth.users`)

`language plpgsql security definer set search_path = ''`; `revoke execute ... from public, anon, authenticated`.

- `nombre`: primer valor no vacío de `raw_user_meta_data->>'nombre'` (registro por email), `->>'full_name'`, `->>'name'` (Google); `btrim`, recortado a 60; si queda con < 2 caracteres → `null`.
- `avatar`: `->>'avatar_url'` o `->>'picture'`, solo si empieza por `https://`; si no, `null`.
- `terminos_aceptados_at`: `now()` solo si `raw_user_meta_data->>'terminos_aceptados' = 'true'` (lo envía el formulario de registro en `options.data`). Para Google la clave no existe → `null` → el onboarding la exige.
- `rol`: `null`.

Notas:
- `raw_user_meta_data` lo controla el cliente; para el consentimiento es aceptable porque es una declaración del propio usuario. Quien se registre por API sin la bandera queda con `terminos_aceptados_at` nulo y el onboarding se la pide igual.
- La guarda de onboarding usa **`terminos_aceptados_at is null` para cualquier proveedor**, no “es OAuth”. Es más simple y cubre el caso anterior.
- CA-04 / CA-11: un email repetido (con confirmación activa) o la vinculación de Google a una cuenta confirmada con el mismo email no insertan una nueva fila en `auth.users`, así que el trigger no corre y no hay perfil duplicado.

### Aceptación de términos en el onboarding (OAuth)

Un único `update` del propio perfil en la mutación de onboarding: `{ rol, nombre?, terminos_aceptados_at: <cualquier timestamp> }`. El grant de columna lo permite solo para la fila propia (RLS); el trigger de protección pone `now()` y la deja inmutable. Al ser una sola sentencia, rol y aceptación se guardan juntos o nada. No hace falta una RPC.

### Seed `supabase/seed.sql`

Dos usuarios confirmados en `auth.users` + `auth.identities` (proveedor `email`; `email_confirmed_at = now()`; contraseña con `extensions.crypt(..., extensions.gen_salt('bf'))`; columnas de token como `''` para que GoTrue no falle al leer nulos), con `raw_user_meta_data` que incluye `nombre` y `terminos_aceptados: true`:

- `ana@casalimon.test` — luego `update public.users set rol = 'buscador'`.
- `beto@casalimon.test` — sin rol (cae en onboarding).

Contraseña de prueba común documentada en el propio `seed.sql` (valor solo local). El dominio `.test` no recibe correo real.

### Pruebas de base de datos (pgTAP)

`supabase/tests/database/users.test.sql`, ejecutadas con `pnpm supabase test db` (pgTAP viene en el stack local; no agrega dependencias npm). Simulan usuarios con `set local role authenticated` + `set local request.jwt.claims = '{"sub":"<uuid>","role":"authenticated"}'`. Casos: CA-23, CA-24, CA-25, CA-26, CA-27; trigger de alta (CA-01: fila con `nombre`, `rol` nulo y `terminos_aceptados_at` según la bandera; nombre/avatar de Google simulados); inmutabilidad de `terminos_aceptados_at`; `rol`/`nombre` no vuelven a nulo.

### Storage, Realtime, Edge Functions

Ninguno en fase 1.

### `supabase/config.toml` (local)

- `[auth]` `site_url = "http://localhost:5173"`, `additional_redirect_urls = ["http://localhost:5173/**"]`, `minimum_password_length = 8`, `password_requirements = ""`.
- `[auth.email]` `enable_signup = true`, `enable_confirmations = true`, `double_confirm_changes = true`, `secure_password_change = false`.
- `[auth.external.google]` `enabled = true`, `client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"`, `secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"`, `skip_nonce_check = false`. Las variables viven en `supabase/.env` (ignorado). Si el autor no configura credenciales locales de Google, OAuth se prueba solo en el preview; el resto del flujo local no depende de ello.
- `[auth.email.template.confirmation|recovery|email_change]` con `subject` en español y `content_path = "./supabase/templates/<archivo>.html"`.
- Mailpit/Inbucket habilitado (correos visibles en `http://127.0.0.1:54324`, CA-35).
- `[db.seed]` habilitado con `./seed.sql`.

### Plantillas de correo (`supabase/templates/`)

`confirmacion.html`, `recuperacion.html`, `cambio-email.html`; español de Costa Rica con voseo (D-12), marca CasaLimón, texto plano + botón, sin imágenes externas. **Enlace por `token_hash`**, no `{{ .ConfirmationURL }}`:

```
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email          (confirmación)
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery       (recuperación)
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email_change   (cambio de email)
```

- `{{ .RedirectTo }}` es el `emailRedirectTo`/`redirectTo` que manda la app, `${window.location.origin}/auth/confirmar` (sin query), ya validado contra la allowlist. Así cada preview recibe sus propios enlaces (CA-37).
- `token_hash` + `verifyOtp` funciona aunque el correo se abra en otro dispositivo o navegador. El intercambio PKCE de `?code=` exige el `code_verifier` del navegador que inició el flujo, y eso rompe el caso típico de registrarse en la PC y confirmar en el celular.
- Las mismas plantillas se pegan en el proyecto remoto (tarea manual).

## Frontend (rutas, componentes, hooks, query keys, stores)

### Estructura

```
src/
  main.tsx                  QueryClientProvider + RouterProvider; arranca el listener de auth
  router.tsx                árbol de rutas (createBrowserRouter)
  index.css                 @import "tailwindcss" + @theme (tokens Limón)
  lib/
    env.ts                  lectura y validación de VITE_* (error claro si faltan)
    supabase.ts             createClient<Database>(url, key, { auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
    query-client.ts         QueryClient único (retry 1 en queries, 0 en mutations)
    auth-listener.ts        initAuthListener(router, queryClient) + sessionReady (Promise)
    redirect.ts             safeVolver(): solo rutas internas "/x" (no "//", no "http")
    database.types.ts       generado (no se edita a mano)
  stores/
    session.ts              Zustand: { status: 'cargando'|'con-sesion'|'sin-sesion', session, setSession, reset }
  features/
    auth/
      api.ts                signUp, signIn, signInWithGoogle, resendConfirmation, requestPasswordReset,
                            updatePassword, verifyEmailLink, exchangeOAuthCode, signOut
      mutations.ts          useSignUp, useSignIn, useGoogleSignIn, useResendConfirmation,
                            useRequestPasswordReset, useUpdatePassword, useSignOut
      errors.ts             mapAuthError(error) → mensaje en español (RF-09)
      validation.ts         validateRegistro, validateIngreso, validateNombre, validatePassword
    profile/
      types.ts              Profile = Tables<'users'>; Rol = 'buscador'|'propietario'|'ambos'; needsOnboarding(p)
      api.ts                fetchProfile(id), updateProfile(id, patch), completeOnboarding(id, input)
      queries.ts            profileKeys, profileQuery(id), useProfile()
      mutations.ts          useUpdateProfile(), useCompleteOnboarding()
  routes/
    guards.ts               rootLoader, guestOnlyLoader, requireAuthLoader, requireProfileLoader, onboardingLoader
    RootErrorBoundary.tsx   error inesperado: Reintentar / Ir al inicio (RF-20)
    NotFoundRoute.tsx       404 con enlace al inicio
    AppLayout.tsx           pestañas inferiores (celular) + barra lateral (escritorio)
    ProfileErrorState.tsx   ErrorBoundary del layout: "No pudimos cargar tu perfil" + Reintentar
    auth/IngresarRoute.tsx, RegistroRoute.tsx, RecuperarRoute.tsx, RestablecerRoute.tsx,
         CallbackRoute.tsx (OAuth), ConfirmarRoute.tsx (enlaces de correo), AuthLayout.tsx
    OnboardingRoute.tsx
    FeedRoute.tsx, PublicarRoute.tsx, ChatRoute.tsx, PerfilRoute.tsx
    legal/TerminosRoute.tsx, PrivacidadRoute.tsx
  components/
    Button, TextField, PasswordField, Checkbox, Alert (aria-live), FullScreenLoader, ErrorState,
    ComingSoon, Avatar (img con fallback a iniciales), Logo, icons.tsx (SVG inline)
  test/
    setup.ts                cleanup de Testing Library tras cada prueba
    supabase-mock.ts        doble del cliente supabase (auth + from().select/update)
    render.tsx              helper: createMemoryRouter + QueryClientProvider
```

### Rutas y guardas (React Router v8, data router + loaders)

Se usan **loaders** (y no componentes guardia) porque:
- se ejecutan **antes** de renderizar, así que nunca aparece el formulario de login para un usuario con sesión (RF-17, CA-16), y el `HydrateFallback` de la raíz cubre la carga inicial a pantalla completa;
- sirven para el intercambio de código OAuth y la verificación de `token_hash`, que ocurren una sola vez por navegación (un `useEffect` con StrictMode los ejecutaría dos veces y el segundo intercambio fallaría);
- reutilizan `queryClient.ensureQueryData(profileQuery(uid))`, como pide la skill `tanstack-crud`.

React Router v8 también expone `middleware`; no se usa en fase 1 porque los loaders bastan. ui-screens debe confirmar las rutas de import contra los tipos instalados (`react-router` / `react-router/dom` para `RouterProvider`).

```
root (loader: rootLoader → await sessionReady; HydrateFallback: FullScreenLoader; ErrorBoundary: RootErrorBoundary)
├─ AuthLayout (loader: guestOnlyLoader → con sesión: redirect("/"))
│  ├─ /ingresar          IngresarRoute
│  ├─ /registro          RegistroRoute (incluye el estado "Revisá tu correo" + reenviar)
│  └─ /recuperar         RecuperarRoute
├─ /restablecer          RestablecerRoute (exige sesión de recuperación; sin sesión → "Enlace inválido" + pedir otro)
├─ /auth/callback        loader: oauthCallbackLoader
├─ /auth/confirmar       loader: confirmLinkLoader
├─ /terminos             TerminosRoute (con o sin sesión)
├─ /privacidad           PrivacidadRoute (con o sin sesión)
├─ (loader: requireAuthLoader → sin sesión: redirect("/ingresar?volver=<ruta>"))
│  ├─ /bienvenida        OnboardingRoute (loader: onboardingLoader → perfil completo: redirect("/"))
│  └─ AppLayout (loader: requireProfileLoader → needsOnboarding: redirect("/bienvenida"); ErrorBoundary: ProfileErrorState)
│     ├─ index "/"       FeedRoute
│     ├─ /publicar       PublicarRoute
│     ├─ /chat           ChatRoute
│     └─ /perfil         PerfilRoute
└─ *                     NotFoundRoute
```

- `needsOnboarding(p) = !p.rol || !p.nombre || !p.terminos_aceptados_at` (RF-11, CA-18, CA-43).
- **Interpretación de RF-15:** la redirección "con sesión → Feed" aplica a `/ingresar`, `/registro` y `/recuperar` (CA-29). `/terminos` y `/privacidad` se muestran con o sin sesión (CA-44). `/restablecer` y `/auth/*` gestionan la sesión por su cuenta. Ver "Preguntas abiertas".
- Ruta de retorno (RF-16, CA-28): `requireAuthLoader` redirige a `/ingresar?volver=<pathname+search>`. Tras ingresar se navega a `safeVolver(volver) ?? "/"`, y si falta el onboarding la guarda lo intercepta. Para Google, `volver` se guarda en `sessionStorage` antes de salir a Google y se lee en el callback, para no depender de query strings en la allowlist.
- Fallback: si llega a `/` un `token_hash` (por ejemplo, porque Supabase usó el Site URL al no aceptar el `redirectTo`), `rootLoader` reenvía la query a `/auth/confirmar`.

### Callback de OAuth y enlaces de correo

- `signInWithGoogle`: `signInWithOAuth({ provider: 'google', options: { redirectTo: origin + '/auth/callback' } })`, con PKCE (`flowType: 'pkce'`).
- `oauthCallbackLoader`:
  - con `?code=` → `exchangeCodeForSession(code)` → redirect a `volver` o `/`;
  - con `?error=` / `error_description` (cancelado o denegado) → redirect a `/ingresar` con el aviso "No se completó el ingreso con Google" (CA-10), pasado por `state` de navegación o `?aviso=oauth-cancelado` con texto fijo (nunca se muestra el `error_description` crudo).
- `confirmLinkLoader`: lee `token_hash` y `type` (`email` | `recovery` | `email_change`) → `verifyOtp({ token_hash, type })`:
  - `email` → sesión → redirect `/` (la guarda manda al onboarding, CA-03);
  - `recovery` → redirect `/restablecer` (CA-14);
  - error `otp_expired` o falta de parámetros → pantalla "Este enlace venció o ya se usó" con botones para pedir otro (`/recuperar`) o reenviar la confirmación (`/registro` / `/ingresar`) (CA-15).
- `detectSessionInUrl: false`: la app controla de forma explícita cuándo intercambia código o verifica enlaces.

### Sesión: dónde vive y cómo se escucha

- **Store de Zustand `useSessionStore`** (`src/stores/session.ts`). La sesión es estado del cliente que supabase-js ya persiste en `localStorage`; no es caché de servidor, así que no va en TanStack Query. La constitución reserva Zustand para "sesión", y los loaders (fuera de React) la leen con `useSessionStore.getState()`. No se usa Context: añadiría un provider y no se puede leer desde loaders.
- **Un único listener** (`src/lib/auth-listener.ts`), iniciado en `main.tsx` antes de montar el router: `supabase.auth.onAuthStateChange((event, session) => …)`.
  - `INITIAL_SESSION` → `setSession` y resolver `sessionReady` (el `rootLoader` lo espera: no hay parpadeo, CA-16).
  - `SIGNED_IN`, `TOKEN_REFRESHED`, `USER_UPDATED` → `setSession`; si cambió el `user.id` → `queryClient.clear()`.
  - `SIGNED_OUT` (local, otra pestaña o refresh token inválido) → `reset()`, `queryClient.clear()`, `router.revalidate()` (las guardas redirigen a `/ingresar`).
  - Regla de supabase-js: **no** se hacen `await` de llamadas a supabase dentro del callback (puede bloquearse); el trabajo asíncrono se difiere (`setTimeout(…, 0)`).
- `persistSession` y `autoRefreshToken` en `true` (RF-07).
- **Cerrar sesión** (`useSignOut`): `supabase.auth.signOut({ scope: 'local' })` → el listener limpia store y caché → `navigate('/ingresar', { replace: true })`. Volver con "Atrás" a `/perfil` pasa por `requireAuthLoader` y redirige (CA-17). Se usa `scope: 'local'` porque RF-06 habla de la sesión local; cerrar todas las sesiones queda para fase 7.

### Perfil (TanStack Query, skill `tanstack-crud`)

- `profileKeys = { all: ['profile'], detail: (id) => ['profile', 'detail', id] }`. El perfil propio es `detail(session.user.id)`; fases 3–5 reutilizan la misma clave para otros usuarios.
- `fetchProfile`: `select('id, nombre, avatar, rol, terminos_aceptados_at, created_at').eq('id', id).single()`.
- `useUpdateProfile` (Perfil: `nombre`, `rol`) y `useCompleteOnboarding` (`rol`, `nombre?`, `terminos_aceptados_at`): **sin actualización optimista**. En `onSuccess` hacen `setQueryData(detail(id), fila devuelta)`, y el cambio se ve sin recargar (RF-13, CA-21). Si fallan, la caché no se tocó, así que el valor anterior se conserva (CA-22) y la UI muestra error con reintento.
- Tras el onboarding: `setQueryData` y luego `navigate('/', { replace: true })` (RF-12, CA-19).

### Formularios y errores

- `noValidate` y validación propia (`features/auth/validation.ts`): email con formato básico, contraseña ≥ 8 (RF-01), nombre 2–60 (D-09), casilla obligatoria (CA-42). Si hay errores, no se llama a la API y el foco va al primer campo con error (CA-05).
- Cada campo con `<label>`, `aria-invalid`, `aria-describedby` → mensaje; errores generales en `Alert` con `role="alert"` (CA-34).
- `mapAuthError` (RF-09), por `error.code` / `status` de supabase-js:
  - `invalid_credentials` → "Correo o contraseña incorrectos" (CA-07)
  - `email_not_confirmed` → "Tenés que confirmar tu correo…" + botón de reenviar (CA-02)
  - `over_request_rate_limit`, `over_email_send_rate_limit`, `429` → "Demasiados intentos, probá en unos minutos" (CA-08)
  - `AuthRetryableFetchError` / `navigator.onLine === false` → "No hay conexión. Revisá tu internet e intentá de nuevo" (CA-12)
  - `otp_expired` → enlace inválido (CA-15)
  - `weak_password` → mensaje de contraseña
  - `user_already_exists` / `email_exists` → mensaje genérico (CA-04)
  - cualquier otro → "Algo salió mal. Intentá de nuevo."
  - Nunca se muestra `error.message` crudo.
- **Registro con email ya existente (CA-04):** con la confirmación activa, Supabase responde sin error con un usuario ofuscado (`identities` vacío) y no envía correo. Para no revelar si la cuenta existe, la pantalla posterior al registro es siempre la misma: **"Revisá tu correo para confirmar la cuenta"** (CA-01) más una línea genérica: "Si ya tenías una cuenta con este correo, ingresá o recuperá tu contraseña."
- **Recuperar (CA-13):** el mismo mensaje exista o no el correo; solo los errores de red o de límite muestran algo distinto.

### Layout y vistas (skill `responsive-view`)

- `AppLayout` según la skill: `<aside>` con `<nav aria-label="Principal">` (`hidden md:flex`) con logo, 4 destinos y "Cerrar sesión" (RF-06); pestañas inferiores `<nav aria-label="Principal">` (`md:hidden`) fijas con `pb-[env(safe-area-inset-bottom)]`; `<main>` con `pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0` para que nada quede oculto detrás de las pestañas (CA-30); `min-h-dvh`; `NavLink` con `end` en `/` (pone `aria-current="page"` en el activo, RF-18).
- Placeholders `ComingSoon` con `<h1>` y "Próximamente" (RF-19, CA-32), sin consultas de dominio.
- Perfil: avatar (con `referrerPolicy="no-referrer"` y fallback a iniciales), nombre, email de la sesión, rol y "Miembro desde" (`Intl.DateTimeFormat('es-CR')`). Formulario de nombre + selector de rol (radio group). Botón "Cerrar sesión" visible en celular (en escritorio también está en la barra lateral).
- Onboarding: radio group de 3 opciones con descripción; campo nombre solo si es nulo; casilla de Términos/Privacidad/18+ solo si `terminos_aceptados_at` es nulo, con enlaces a `/terminos` y `/privacidad` (`target="_blank"`, `rel="noopener"`, para no perder el formulario). Botón deshabilitado hasta completar todo (CA-20).
- **Tokens y contraste:** `src/index.css` con los tokens de la skill, con un ajuste de accesibilidad. `#1f9d55` sobre blanco da ≈ 3.5:1 y `#38b6e8` ≈ 2.3:1, ambos por debajo de AA para texto normal. Por eso el texto y los botones primarios usan `limon-verde-oscuro` (`#157a41`, ≈ 5.4:1); `limon-verde` se reserva para texto grande o decoración y `limon-celeste` para fondos y acentos no textuales. ui-screens debe comprobar cada par de colores usado.
- Fuente: pila del sistema (`system-ui, …`) en fase 1, en vez de Inter desde Google Fonts. Evita sumar `fonts.googleapis.com`/`fonts.gstatic.com` a la CSP y una petición en 4G (requisito de rendimiento). Se sobrescribe `--font-sans` en `@theme`.
- Sin modo oscuro en fase 1 (se elimina el de la plantilla); `color-scheme: light`.
- `index.html`: `lang="es-CR"`, `<title>CasaLimón</title>`, `<meta name="theme-color" content="#157a41">`, favicon SVG propio. **Sin manifest ni Service Worker** (D-08).

### Páginas legales

`/terminos` y `/privacidad`: componentes estáticos con texto en JSX (no HTML inyectado). El autor redacta el texto; ui-screens crea la estructura con encabezados y un marcador visible `[Texto pendiente del autor]` hasta recibirlo. La fase no se cierra con el marcador.

## Realtime / notificaciones

No aplica en fase 1. El único "tiempo real" es `onAuthStateChange` (sincronización de sesión entre pestañas que hace supabase-js).

## Seguridad

Qué revisa `security-reviewer`:

1. **RLS y privilegios de `public.users`:** RLS habilitado; `revoke all` a `anon`/`authenticated`; grant de `update` solo en `nombre`, `rol`, `terminos_aceptados_at`; sin políticas de insert/delete; `with check` en update; pruebas pgTAP pasando (CA-23..CA-27).
2. **Funciones:** `handle_new_user` con `security definer` + `set search_path = ''` + `revoke execute`; nombres totalmente calificados; trigger de protección sin efectos laterales.
3. **Claves:** solo `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (puede ser la publishable key `sb_publishable_…`) y `VITE_VAPID_PUBLIC_KEY` en el frontend; `git grep -nE "service_role|SERVICE_ROLE|sb_secret_|SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET"` sin coincidencias con valores; `.env*` ignorados salvo `.env.example` (CA-40).
4. **Auth:** PKCE (`flowType: 'pkce'`), `detectSessionInUrl: false`, sin tokens guardados a mano, `safeVolver` contra open redirect, allowlist de URLs de redirección (CA-38), mensajes sin enumeración de cuentas (CA-04, CA-07, CA-13), `signOut` limpia la caché.
5. **Cabeceras y CSP en `vercel.json`** (RF-26, CA-39), aplicadas a `/(.*)`:
   ```
   Content-Security-Policy:
     default-src 'self';
     script-src 'self';
     style-src 'self';
     img-src 'self' data: https://lh3.googleusercontent.com;
     font-src 'self';
     connect-src 'self' https://<ref>.supabase.co wss://<ref>.supabase.co;
     manifest-src 'self';
     worker-src 'self';
     object-src 'none';
     base-uri 'self';
     form-action 'self';
     frame-ancestors 'none';
     upgrade-insecure-requests
   Strict-Transport-Security: max-age=63072000; includeSubDomains
   X-Content-Type-Options: nosniff
   X-Frame-Options: DENY
   Referrer-Policy: strict-origin-when-cross-origin
   Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
   ```
   - `<ref>` es el ref del único proyecto remoto (D-11): la URL no es secreta y se escribe literal.
   - Vite en producción no emite scripts ni estilos inline, y React aplica `style` vía CSSOM (no lo bloquea `style-src`).
   - La redirección a Google es navegación de nivel superior y la CSP no la restringe.
   - **Toolbar de Vercel:** se **desactiva** en el proyecto (tarea manual) para que la CSP sea la misma en previews y producción. Alternativa si el autor la quiere: segundo bloque de `headers` con condición `has: host` para previews que agregue `https://vercel.live` a `script-src`, `connect-src`, `img-src`, `style-src`, `font-src` y `frame-src`. No se recomienda.
6. **Rewrites:** `{ "source": "/((?!assets/).*)", "destination": "/index.html" }`. Vercel sirve primero los archivos existentes; excluir `/assets/` hace que un asset inexistente dé 404 real en vez de `index.html` (CA-33). `Cache-Control: public, max-age=31536000, immutable` para `/assets/(.*)`.
7. **CI:** `permissions: contents: read`, sin secretos (el build no necesita variables reales).

### URLs de redirección de Auth (remoto, CA-37, CA-38)

- Site URL: URL de producción de Vercel (p. ej. `https://casalimon-web.vercel.app`).
- Redirect URLs:
  - `https://<prod-host>/**`
  - `https://casalimon-web-*-<scope-vercel>.vercel.app/**` (previews por hash y por rama)
  - `http://localhost:5173/**`
- Google Cloud: URI de redirección autorizado `https://<ref>.supabase.co/auth/v1/callback` (y `http://127.0.0.1:54321/auth/v1/callback` si se prueba OAuth en local).

## Pruebas

### Unitarias / integración (Vitest + Testing Library, jsdom)

`vite.config.ts` importa `defineConfig` desde `vitest/config`: `test: { environment: 'jsdom', setupFiles: ['./src/test/setup.ts'], env: { VITE_SUPABASE_URL: 'http://localhost:54321', VITE_SUPABASE_ANON_KEY: 'test-anon-key' } }`. Sin globals (imports explícitos desde `vitest`, así `tsc -b` no necesita tipos extra). Siempre se mockea `@/lib/supabase`.

| Archivo | Cubre |
|---|---|
| `src/lib/env.test.ts` | Error claro si falta `VITE_*` |
| `src/lib/redirect.test.ts` | `safeVolver` rechaza `//evil`, `https://…`, `javascript:`; acepta `/chat` (CA-28) |
| `src/lib/auth-listener.test.ts` | `INITIAL_SESSION` resuelve `sessionReady`; `SIGNED_OUT` limpia store y `queryClient` (CA-16, CA-17) |
| `src/features/auth/errors.test.ts` | Cada código → mensaje en español (CA-02, 04, 07, 08, 10, 12, 15) |
| `src/features/auth/validation.test.ts` | Campos vacíos, email mal formado, contraseña < 8, nombre 2–60, casilla (CA-05, CA-42) |
| `src/features/profile/profile.test.ts` | `needsOnboarding`; mutaciones actualizan la caché en éxito y no la tocan en error (CA-21, CA-22) |
| `src/routes/guards.test.tsx` | Con `createMemoryRouter`: sin sesión `/chat` → `/ingresar?volver=/chat` (CA-28); sin rol → `/bienvenida` (CA-18); sin términos → `/bienvenida` (CA-43); con sesión `/ingresar` y `/registro` → `/` (CA-29); `/terminos` con y sin sesión (CA-44); ruta inexistente → 404 (CA-33); tras `signOut`, `/perfil` → `/ingresar` (CA-17) |
| `src/routes/AppLayout.test.tsx` | Dos `nav` "Principal" con los 4 destinos; `aria-current="page"` en el activo; contrato de clases (`md:hidden` en pestañas, `hidden md:flex` en la barra lateral; padding inferior de `main`) (CA-30, CA-31); placeholders con título y "Próximamente" (CA-32) |
| `src/routes/auth/RegistroRoute.test.tsx` | Errores por campo, foco al primero, sin llamada a la API (CA-05, CA-42); éxito → "Revisá tu correo…" + reenviar (CA-01, RF-02); email existente → mismo mensaje (CA-04) |
| `src/routes/auth/IngresarRoute.test.tsx` | Credenciales inválidas → mensaje y email conservado (CA-07); sin confirmar → reenviar (CA-02); 429 (CA-08); sin red y botón habilitado de nuevo (CA-12); éxito → `volver` (CA-06, CA-28) |
| `src/routes/auth/CallbackRoute.test.tsx` | `?code` → intercambio y redirect (CA-09); `?error=access_denied` → `/ingresar` con aviso (CA-10) |
| `src/routes/auth/ConfirmarRoute.test.tsx` | `type=email` → `/` (CA-03); `type=recovery` → `/restablecer` (CA-14); `otp_expired` → enlace inválido (CA-15) |
| `src/routes/auth/RecuperarRoute.test.tsx` / `RestablecerRoute.test.tsx` | Mismo mensaje siempre (CA-13); nueva contraseña válida → confirmación (CA-14); sin sesión → enlace inválido (CA-15) |
| `src/routes/OnboardingRoute.test.tsx` | Botón deshabilitado sin rol, nombre o casilla (CA-20, CA-43); éxito → `/` (CA-19); error → mensaje y valores conservados (CA-22) |
| `src/routes/PerfilRoute.test.tsx` | Cambio de rol visible sin recargar (CA-21); error conserva el valor (CA-22); cerrar sesión (CA-17, RF-06) |
| `src/routes/a11y.test.tsx` | Recorrido con `user.tab()` de login, registro, onboarding y navegación: todos los controles alcanzables en orden; errores con `role="alert"` / `aria-describedby` (CA-34) |

La spec exige como mínimo: guardas de rutas protegidas, redirección a onboarding sin rol y render del layout en ambos breakpoints. jsdom no calcula CSS, así que "ambos breakpoints" se prueba como **contrato de clases + estructura** y se confirma visualmente a mano.

### Base de datos

`pnpm supabase test db` (pgTAP): CA-01 (fila creada), CA-23..CA-27, inmutabilidad de términos. Se ejecuta en local; en fase 1 no corre en CI (ver Preguntas abiertas).

### Verificación manual

- **Local (CA-35):** clon limpio → `pnpm install` → `pnpm supabase start` → `pnpm supabase db reset` → `.env.local` desde `.env.example` con valores de `supabase status` → `pnpm dev` → registro, confirmación desde Mailpit (`:54324`), onboarding, navegación, cierre de sesión. Ingreso con los usuarios del seed.
- **Preview (autor):**
  - CA-09 y CA-11 con Google;
  - CA-37: confirmación, recuperación y OAuth vuelven al mismo preview;
  - CA-38: `resetPasswordForEmail` con `redirectTo: 'https://example.com'` → el enlace no apunta a example.com;
  - CA-39: `curl -I` de `/` y de una ruta profunda + consola sin violaciones de CSP durante login, OAuth y navegación;
  - CA-33: recargar `/no-existe`;
  - CA-16: cerrar y reabrir el navegador;
  - CA-08: repetir intentos hasta el límite;
  - CA-30/31: celular real a 375 px y escritorio ≥ 1024 px;
  - Lighthouse móvil del login (< 3 s);
  - CA-36: checks + enlace al preview en el PR; CA-41: push directo a `main` rechazado.
- Correos remotos: el SMTP por defecto de Supabase solo entrega a direcciones de miembros del equipo del proyecto. El autor prueba con su correo o invita a los testers a la organización.

## Riesgos técnicos

| # | Riesgo | Mitigación |
|---|---|---|
| R-1 | **Allowlist de previews con comodín.** `*` en Supabase acepta guiones, así que `casalimon-web-*-<scope>.vercel.app` también aceptaría un host de un tercero cuyo scope termine en `-<scope>`. Con plantillas basadas en `{{ .RedirectTo }}`, un atacante podría pedir un correo de recuperación para la víctima apuntando a su host y robar el `token_hash`. | Riesgo bajo en fases 1–7 (sin usuarios reales, previews solo del equipo). security-reviewer lo evalúa. Antes de la beta (fase 8, D-04/D-11): dominio propio, previews en subdominio propio o proyecto Supabase de staging separado sin previews en el allowlist de producción. |
| R-2 | Si `redirectTo` no está en la allowlist, Supabase usa el Site URL, y el enlace del correo cae en producción o en `/`. | Allowlist correcta (tarea manual) + reenvío de `token_hash` desde `rootLoader` a `/auth/confirmar`; verificar CA-37 en el preview. |
| R-3 | Un solo proyecto Supabase para previews y producción (D-11): una migración aplicada antes del merge afecta a "producción". | Push solo tras la revisión de security-reviewer; en fase 1 no hay usuarios reales. Ver Preguntas abiertas. |
| R-4 | SMTP por defecto con límite muy bajo (pocos correos por hora) y solo a miembros del equipo: las pruebas de registro y recuperación en el preview pueden bloquearse. | Probar con pocas cuentas; usar Mailpit en local para el grueso de las pruebas; SMTP propio antes de la beta (D-04). |
| R-5 | pnpm 12 con lockfile v9: Vercel elige la versión de pnpm por el lockfile y podría usar otra. | Campo `packageManager: "pnpm@12.15.0"` + variable `ENABLE_EXPERIMENTAL_COREPACK=1` en Vercel; `installCommand: "pnpm install --frozen-lockfile"`. Si falla, fijar en Vercel la versión compatible. CI usa `pnpm/action-setup` (lee `packageManager`). |
| R-6 | Versiones muy nuevas (React Router 8, Vite 8, Vitest 5, TS 6, ESLint 10): las APIs pueden diferir de la documentación conocida (imports de `RouterProvider`, `HydrateFallback`, config de Vitest). | ui-screens comprueba contra los `.d.ts` instalados. El plan describe comportamiento, no firmas exactas. |
| R-7 | El callback de `onAuthStateChange` con `await` a supabase puede bloquear el cliente. | Regla explícita: sin `await` en el callback; diferir con `setTimeout`. Cubierto por `auth-listener.test.ts`. |
| R-8 | Avatares de Google fuera de `lh3.googleusercontent.com` (otros subdominios `lh*`) violarían la CSP. | `Avatar` cae a iniciales en `onError`; si aparecen violaciones en CA-39 se amplía a `https://*.googleusercontent.com` (ver Preguntas abiertas). |
| R-9 | Proyecto gratuito de Supabase pausado por inactividad → preview "roto". | Reactivarlo desde el dashboard; documentarlo en el README. |
| R-10 | Vercel Deployment Protection (por defecto en previews) exige login de Vercel para ver previews: los testers externos no entran. | Suficiente en fase 1 (solo el autor). Revisar en fase 8. |
| R-11 | Contraste insuficiente de los tokens verde/celeste. | Uso restringido de tokens (ver Frontend) y revisión AA en QA. |

## Asignación (subagente · skill)

| Subagente | Alcance | Skills |
|---|---|---|
| `schema-rls` | `supabase/` (init, `config.toml`, plantillas, migración, seed, pgTAP), generación de `src/lib/database.types.ts` | `supabase-rls-policy` |
| `ui-screens` | Tooling (`vite.config.ts`, `tsconfig.app.json`, `eslint.config.js`, Prettier, Vitest, `package.json`, `.gitignore`, `.env.example`, `index.html`), `src/`, `vercel.json`, `.github/workflows/ci.yml`, `README.md` | `responsive-view`, `tanstack-crud` |
| `security-reviewer` | Revisión de la migración antes del push remoto; revisión final de auth, CSP/cabeceras, secretos, CI | — |
| `qa-reviewer` | lint/build/tests + tabla CA-01..CA-44 | — |
| `@autor` (manual) | Supabase remoto, Google Cloud, Vercel, protección de `main`, textos legales, rama `master`, verificación manual en el preview, merge | — |

Las skills `realtime-subscription` y `push-notification` no aplican en esta fase.

## Decisiones del autor (2026-11-03)

El autor aceptó las recomendaciones para las preguntas 1–4 y para el riesgo R-1:

1. **`supabase db push`:** en fase 1 se hace después de la aprobación de security-reviewer (T14) y **antes** del merge, para que el preview pueda probar registro, OAuth y recuperación.
2. **RF-15:** "con sesión → Feed" aplica solo a `/ingresar`, `/registro` y `/recuperar`. `/terminos` y `/privacidad` se ven con o sin sesión.
3. **`terminos_aceptados_at` legible por autenticados:** se acepta en fase 1 y se revisa en fase 2 con el resto de la matriz RLS.
4. **CSP de avatares:** solo `https://lh3.googleusercontent.com`; se amplía a `*.googleusercontent.com` solo si aparecen violaciones (R-8).
5. **R-1 (comodín de previews):** se acepta hasta la beta. Se mitiga en fase 8 con dominio propio o un proyecto de staging separado. security-reviewer lo registra en T42.

Resueltas también: pgTAP en CI queda para fase 2 (propuesta 5); el pie de la spec y el modelo de datos del agente `schema-rls` ya se actualizaron (6 y 7).

## Preguntas abiertas (texto original del plan)

1. **Momento del `supabase db push` (D-11 vs. CA-37).** D-11 dice "solo se hace push tras merge", pero el preview del PR de esta fase necesita `public.users` en el remoto para probar registro, OAuth y recuperación (CA-09, CA-11, CA-37) **antes** de integrar. Propuesta: en fase 1, el autor hace el push tras el visto bueno de security-reviewer a la migración y antes del merge (no hay usuarios reales). El plan sigue esta propuesta salvo que el autor indique otra cosa.
2. **Alcance de "Un usuario con sesión que entra a ellas es enviado al Feed" (RF-15).** El plan lo aplica solo a `/ingresar`, `/registro` y `/recuperar`, porque CA-44 exige que `/terminos` y `/privacidad` se vean con sesión. Confirmar.
3. **Visibilidad de `terminos_aceptados_at` de otros usuarios.** Con lectura de todas las columnas para autenticados (D-10), cualquier usuario autenticado puede ver cuándo otro aceptó los términos. CA-27 no lo lista. Es de baja sensibilidad; restringirlo exigiría una vista o RPC para el propio perfil. Propuesta: aceptarlo en fase 1 y revisarlo en fase 2 junto con el resto de la matriz.
4. **Comodín de avatares:** `lh3.googleusercontent.com` (como dice la spec) o `*.googleusercontent.com`. El plan usa `lh3` y lo amplía solo si aparecen violaciones.
5. **pgTAP en CI:** las pruebas de RLS solo corren en local en fase 1 (RF-27 define CI = lint + build + tests). Propuesta: agregar un job con `supabase start` + `supabase test db` en fase 2, cuando la matriz RLS crezca.
6. **Pie de la spec:** el encabezado dice `Estado: Aprobada`, pero el párrafo final todavía dice "Esta spec está en **Borrador**…". Conviene actualizar ese párrafo (cambio editorial, no afecta al plan).
7. **Agente `schema-rls`:** su tabla de modelo de datos (`.claude/agents/schema-rls.md`) no incluye `terminos_aceptados_at`. La constitución sí. Conviene actualizarla para que el agente no la omita.
