# Tareas — 001 Setup base

Spec: ./spec.md · Plan: ./plan.md

Convenciones:
- Orden por dependencias: tooling → datos → lógica → UI → infra → revisión.
- `@autor` = paso manual del autor (credenciales, paneles web o decisiones). Los agentes no los ejecutan.
- "Verde" = `pnpm lint`, `pnpm build` y `pnpm test` pasan.
- Una tarea se marca `[x]` solo después de pasar su verificación (y, al cierre, tras el veredicto de los revisores).
- Pasos `@autor` que se pueden adelantar en paralelo desde el inicio: T32, T33 y T28.

## A. Tooling del proyecto

- [x] T01 Configurar Tailwind v4 (`@tailwindcss/vite`) y el alias `@/` → `src/` en Vite y TypeScript; declarar `"strict": true` — `vite.config.ts`, `tsconfig.app.json` — @ui-screens — RF: Incluido/Proyecto — Verificación: `pnpm build` pasa; un import `@/…` de prueba compila; `vite.config.ts` **no** registra `VitePWA` (D-08).
- [x] T02 Reemplazar la plantilla de Vite: borrar `App.tsx`, `App.css`, `src/assets/*` y `public/icons.svg`; `src/index.css` con `@import "tailwindcss"` y `@theme` con los tokens de Limón (fuente del sistema, sin modo oscuro); `index.html` con `lang="es-CR"`, `<title>CasaLimón</title>`, `theme-color` y favicon propio; `main.tsx` mínimo — `src/index.css`, `src/main.tsx`, `index.html`, `public/favicon.svg` — @ui-screens — D-08 — Verificación: verde; `grep -r "aa3bff\|casalimon-web</title>" src index.html` sin resultados; la página carga en `pnpm dev` sin errores en consola.
- [x] T03 Agregar Prettier (`.prettierrc.json`: sin `;`, comillas simples, como el código actual; `.prettierignore` con `dist`, `pnpm-lock.yaml`, `src/lib/database.types.ts`, `supabase/.temp`), scripts `format` y `format:check`, y formatear el repo — `.prettierrc.json`, `.prettierignore`, `package.json` — @ui-screens — Verificación: `pnpm format:check` pasa.
- [x] T04 Preparar el entorno de pruebas: `pnpm add -D jsdom @testing-library/user-event` (justificación en plan.md), bloque `test` en `vite.config.ts` (`defineConfig` de `vitest/config`, `environment: 'jsdom'`, `setupFiles`, `env` con `VITE_*` ficticias), `src/test/setup.ts` (cleanup), scripts `test` (`vitest run`) y `test:watch`, y una prueba de humo — `vite.config.ts`, `package.json`, `src/test/setup.ts`, `src/test/smoke.test.tsx` — @ui-screens — RNF Calidad — Verificación: `pnpm test` ejecuta y pasa 1 prueba que renderiza un componente con Testing Library; `pnpm build` sigue pasando (tsc revisa también las pruebas).
- [x] T05 Higiene de entorno: `.gitignore` con `.env`, `.env.*`, `!.env.example`, `.vercel`, `coverage`, `supabase/.temp`, `supabase/.branches`, `supabase/.env`; `.env.example` con `VITE_SUPABASE_URL=`, `VITE_SUPABASE_ANON_KEY=`, `VITE_VAPID_PUBLIC_KEY=` (vacía hasta fase 6) y comentarios; `package.json` con `packageManager: "pnpm@12.15.0"` y `engines.node: ">=22.12"`; `eslint.config.js` ignora `coverage` y `supabase/functions` — `.gitignore`, `.env.example`, `package.json`, `eslint.config.js` — @ui-screens — RF-23, CA-40 — Verificación: `git check-ignore -v .env .env.local .env.production supabase/.temp supabase/.env` marca todos; `git check-ignore .env.example` no lo marca; verde.

## B. Supabase local (datos y RLS)

- [x] T06 Inicializar Supabase (`pnpm supabase init`) y configurar `config.toml`: `site_url` y `additional_redirect_urls` de `localhost:5173`, `enable_confirmations = true`, `minimum_password_length = 8`, Google con `env(...)`, Mailpit, seed habilitado — `supabase/config.toml`, `supabase/.gitignore` — @schema-rls — RF-21, D-02, D-03 — Verificación: `pnpm supabase start` levanta sin errores (sin credenciales de Google en `supabase/.env` el arranque no falla); `pnpm supabase status` muestra la API y Mailpit.
- [x] T07 Plantillas de correo en español con voseo y marca CasaLimón (confirmación, recuperación, cambio de email) con enlaces `{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=…`; asuntos en `config.toml` — `supabase/templates/confirmacion.html`, `recuperacion.html`, `cambio-email.html`, `supabase/config.toml` — @schema-rls — RF-08, D-07, D-12 — Verificación: tras `supabase stop && supabase start`, un `POST /auth/v1/signup` local (curl con la anon key local y `redirect_to=http://localhost:5173/auth/confirmar`) deja en Mailpit un correo en español cuyo enlace es `http://localhost:5173/auth/confirmar?token_hash=…&type=email`; lo mismo con `/auth/v1/recover` y `type=recovery`.
- [x] T08 Migración `crear_users`, parte 1: tabla `public.users` (checks de `nombre` 2–60, `avatar` https, `rol` en dominio), RLS habilitado, `revoke all` a `anon`/`authenticated`, `grant select` y `grant update (nombre, rol, terminos_aceptados_at)` a `authenticated`, políticas de select (autenticados) y de update (propia fila, `using` + `with check`) — `supabase/migrations/<ts>_crear_users.sql` — @schema-rls — RF-10, D-09, D-10, CA-23..CA-27 — Verificación: `pnpm supabase db reset` sin errores; `\dp public.users` muestra solo los privilegios esperados.
- [x] T09 Migración `crear_users`, parte 2: trigger `before update` `users_proteger_columnas` (bloquea cambios de `id`/`created_at`; `terminos_aceptados_at` solo de nulo a `now()` del servidor e inmutable después; `rol`/`nombre` no vuelven a nulo) — mismo archivo — @schema-rls — CA-25, D-16 — Verificación: `db reset` sin errores; prueba manual en `psql`: como dueño, poner `terminos_aceptados_at = null` después de fijada → excepción.
- [x] T10 Migración `crear_users`, parte 3: función `handle_new_user()` (`security definer`, `set search_path = ''`, `revoke execute` a `public`/`anon`/`authenticated`) y trigger `after insert on auth.users`; lee `nombre`/`full_name`/`name`, `avatar_url`/`picture` y `terminos_aceptados` de `raw_user_meta_data` — mismo archivo — @schema-rls — RF-10, CA-01, CA-09 — Verificación: `db reset`; un signup local por API con `data: {nombre, terminos_aceptados: true}` crea la fila con `nombre`, `rol` nulo y `terminos_aceptados_at` no nulo; sin la bandera queda nulo.
- [x] T11 Seed con dos usuarios confirmados en `auth.users` + `auth.identities`: `ana@casalimon.test` (rol `buscador`) y `beto@casalimon.test` (sin rol), ambos con términos aceptados y contraseña de prueba documentada en el archivo — `supabase/seed.sql` — @schema-rls — RF-21 — Verificación: `pnpm supabase db reset`; `select nombre, rol from public.users` devuelve 2 filas (una con rol nulo); `POST /auth/v1/token?grant_type=password` con cada usuario devuelve sesión.
- [x] T12 Pruebas pgTAP de RLS y triggers: CA-23 (A no edita a B: 0 filas), CA-24 (insert/delete rechazados), CA-25 (`id`/`created_at`/`avatar` → permiso denegado; `rol` inválido → check), CA-26 (anon sin filas), CA-27 (autenticado lee columnas públicas; no existe columna de email), alta (CA-01), términos inmutables, `rol` no vuelve a nulo — `supabase/tests/database/users.test.sql` — @schema-rls — CA-01, CA-23..CA-27 — Verificación: `pnpm supabase test db` con todas las aserciones en verde; en la respuesta se listan los casos A/B verificados.
- [x] T13 Generar tipos y agregar el script `db:types` — `src/lib/database.types.ts`, `package.json` — @schema-rls — Verificación: el archivo incluye `users` con `terminos_aceptados_at`; `pnpm build` pasa; el archivo se versiona.
- [x] T14 Revisión de seguridad de la migración (antes de aplicarla al remoto): RLS, privilegios por columna, triggers, `security definer`/`search_path`, seed sin datos reales — `supabase/` — @security-reviewer — CA-23..CA-27 — Verificación: reporte sin hallazgos Críticos/Altos abiertos (los que aparezcan vuelven a @schema-rls como tarea nueva).
  - Resultado (2026-11-03): sin Críticos ni Altos; **no apta** hasta corregir M-1 y M-2 (→ T14b). M-3, B-1 y B-2 → T35. B-3 → T24. B-5 → T18.
- [x] T14b Corregir los hallazgos de T14 en la migración `crear_users` (aún no aplicada): M-1 (`avatar` solo `https://lh3.googleusercontent.com/…`, ≤ 2048 caracteres y solo si el proveedor en `raw_app_meta_data` no es `email`; check de tabla + trigger, sin lanzar error), M-2 (check de `nombre` sobre el valor guardado: recortado, 2–60, sin caracteres de control ni de dirección, al menos un alfanumérico; `handle_new_user` exige `jsonb_typeof = 'string'` y normaliza; `users_proteger_columnas` normaliza `nombre` en updates), B-4 (pgTAP: rama del trigger para `id`, insert/delete como `anon`, `has_function_privilege` de `users_proteger_columnas`, casos de M-1 y M-2); regenerar tipos — `supabase/migrations/20261103175600_crear_users.sql`, `supabase/tests/database/users.test.sql`, `src/lib/database.types.ts` — @schema-rls — Verificación: `db reset` y `test db` en verde; nueva revisión de security-reviewer con veredicto **apta para `supabase db push`**.

## C. Lógica de frontend

- [x] T15 Cliente y utilidades base: `env.ts` (valida `VITE_*`), `supabase.ts` (`createClient<Database>` con `flowType: 'pkce'`, `persistSession`, `autoRefreshToken`, `detectSessionInUrl: false`), `query-client.ts`, `redirect.ts` (`safeVolver`) + pruebas — `src/lib/*.ts`, `src/lib/env.test.ts`, `src/lib/redirect.test.ts` — @ui-screens — RF-07, RNF Seguridad, CA-28 — Verificación: verde; `safeVolver('//evil.com')`, `('https://x')` y `('javascript:…')` → `null`; `('/chat')` → `/chat`.
- [x] T16 Store de sesión (Zustand) y listener único de `onAuthStateChange` (`sessionReady`; `SIGNED_OUT` → `reset` + `queryClient.clear()` + `router.revalidate()`; sin `await` a supabase dentro del callback) + pruebas — `src/stores/session.ts`, `src/lib/auth-listener.ts`, `src/lib/auth-listener.test.ts` — @ui-screens — RF-06, RF-07, RF-17, CA-16, CA-17 — Verificación: verde; la prueba confirma que `INITIAL_SESSION` resuelve `sessionReady` y que `SIGNED_OUT` deja la caché vacía y el store en `sin-sesion`.
- [x] T17 Dominio `auth`: `api.ts` (signUp con `options.data: { nombre, terminos_aceptados: true }` y `emailRedirectTo`, signIn, Google con `redirectTo` a `/auth/callback`, resend, resetPassword, updatePassword, verifyOtp, exchangeCodeForSession, signOut local), `mutations.ts`, `errors.ts` (`mapAuthError`), `validation.ts` + pruebas — `src/features/auth/*` — @ui-screens · skill `tanstack-crud` — RF-01..RF-09, CA-02, CA-04, CA-05, CA-07, CA-08, CA-10, CA-12, CA-15, CA-42 — Verificación: verde; `errors.test.ts` cubre cada código del plan y nunca devuelve `error.message` crudo; `validation.test.ts` cubre vacíos, email mal formado, contraseña de 7 y de 8 caracteres, nombre de 1 y de 61 caracteres, casilla sin marcar.
- [x] T18 Dominio `profile`: `types.ts` (`Profile`, `Rol`, `needsOnboarding`), `api.ts`, `queries.ts` (`profileKeys.detail(id)`, `profileQuery`), `mutations.ts` (`useUpdateProfile`, `useCompleteOnboarding`, sin optimismo, `setQueryData` en éxito) + pruebas con supabase mockeado — `src/features/profile/*` — @ui-screens · skill `tanstack-crud` — RF-10..RF-13, CA-19, CA-21, CA-22 — Verificación: verde; la prueba confirma que en error la caché conserva el valor anterior y en éxito refleja el nuevo. Nota T14 (B-5): las mutaciones tipan el update como `Pick<TablesUpdate<'users'>, 'nombre' | 'rol' | 'terminos_aceptados_at'>`; si el perfil ya tiene `terminos_aceptados_at`, no reenviar ese campo (el trigger lo rechaza).

## D. UI

- [x] T19 Componentes base accesibles: `Button` (estado cargando, ≥ 44 px), `TextField`/`PasswordField` (label, `aria-invalid`, `aria-describedby`), `Checkbox`, `Alert` (`role="alert"`), `FullScreenLoader`, `ErrorState` (reintentar), `ComingSoon`, `Avatar` (iniciales de respaldo, `referrerPolicy="no-referrer"`), `Logo`, íconos SVG inline; foco visible global — `src/components/*` — @ui-screens · skill `responsive-view` — RNF Accesibilidad — Verificación: verde; solo se usan clases de tokens (sin colores fuera de `@theme`); pares de texto/fondo con contraste ≥ 4.5:1 (verde oscuro para texto y botones). Nota T14: los nombres de usuario se muestran en una sola línea con `truncate`/`overflow-hidden` (defensa contra texto "zalgo" de marcas combinables que la BD no filtra).
- [x] T20 Router y guardas: `router.tsx` con el árbol del plan, `guards.ts` (`rootLoader` espera `sessionReady` y reenvía `token_hash`, `guestOnlyLoader`, `requireAuthLoader` con `volver`, `requireProfileLoader`, `onboardingLoader`), `HydrateFallback`, `RootErrorBoundary`, `ProfileErrorState`, `NotFoundRoute`; `main.tsx` con `QueryClientProvider` + `RouterProvider` + `initAuthListener`; helpers `src/test/render.tsx` y `src/test/supabase-mock.ts` + `guards.test.tsx` — `src/router.tsx`, `src/routes/guards.ts`, `src/routes/*Boundary*.tsx`, `src/routes/NotFoundRoute.tsx`, `src/main.tsx`, `src/test/*` — @ui-screens — RF-11, RF-15, RF-16, RF-17, RF-20, CA-16, CA-17, CA-18, CA-28, CA-29, CA-33, CA-43, CA-44 — Verificación: verde; `guards.test.tsx` cubre todos los casos listados en el plan (sin sesión → `/ingresar?volver=/chat`, sin rol → `/bienvenida`, sin términos → `/bienvenida`, con sesión en `/ingresar` y `/registro` → `/`, `/terminos` con y sin sesión, 404, `/perfil` tras cerrar sesión → `/ingresar`).
- [x] T21 `AppLayout` (barra lateral `md+` con logo, 4 destinos y "Cerrar sesión"; pestañas inferiores fijas en celular con `safe-area-inset-bottom`; `main` con padding inferior; `aria-current`) y placeholders Feed, Publicar, Chat y Perfil con "Próximamente" + `AppLayout.test.tsx` — `src/routes/AppLayout.tsx`, `src/routes/FeedRoute.tsx`, `PublicarRoute.tsx`, `ChatRoute.tsx` — @ui-screens · skill `responsive-view` — RF-14, RF-18, RF-19, CA-30, CA-31, CA-32 — Verificación: verde; la prueba encuentra dos `nav` "Principal" con 4 enlaces, `aria-current="page"` solo en el activo, clases `md:hidden` / `hidden md:flex` y padding inferior en `main`; revisión visual en `pnpm dev` a 375 px y 1280 px sin contenido oculto detrás de las pestañas.
- [x] T22 `/registro`: nombre, email, contraseña, casilla con enlaces a `/terminos` y `/privacidad`; validación en cliente con foco al primer error; pantalla posterior "Revisá tu correo para confirmar la cuenta" + línea genérica + "Reenviar enlace"; `AuthLayout` compartido + pruebas — `src/routes/auth/RegistroRoute.tsx`, `AuthLayout.tsx`, `RegistroRoute.test.tsx` — @ui-screens — RF-01, RF-02, RF-09, CA-01, CA-04, CA-05, CA-12, CA-42 — Verificación: verde; las pruebas confirman que con errores no se llama a `signUp`, el foco va al primer campo inválido y el error de la casilla aparece junto a ella; con respuesta de usuario existente se muestra el mismo mensaje que en éxito; en local (T11/T07) un registro real deja fila en `public.users` y correo en Mailpit.
- [x] T23 `/ingresar`: email + contraseña, "Continuar con Google", enlaces a registro y recuperar; mensajes de `mapAuthError`; reenviar confirmación si `email_not_confirmed`; email conservado tras error; botón rehabilitado tras error de red; navegación a `safeVolver(volver)`; guarda `volver` en `sessionStorage` antes de ir a Google + pruebas — `src/routes/auth/IngresarRoute.tsx`, `IngresarRoute.test.tsx` — @ui-screens — RF-03, RF-04, RF-09, CA-02, CA-06, CA-07, CA-08, CA-12, CA-28 — Verificación: verde; las pruebas cubren credenciales inválidas (mismo mensaje para email inexistente), sin confirmar con botón de reenviar, 429, sin red y éxito hacia `/chat` cuando `volver=/chat`; en local, `ana@casalimon.test` llega al Feed y `beto@casalimon.test` al onboarding.
- [x] T24 `/auth/callback` (intercambio PKCE; `error`/`access_denied` → `/ingresar` con "No se completó el ingreso con Google") y `/auth/confirmar` (`verifyOtp` con `token_hash`; `email` → `/`, `recovery` → `/restablecer`, vencido o inválido → pantalla de enlace inválido con acciones) + pruebas — `src/routes/auth/CallbackRoute.tsx`, `ConfirmarRoute.tsx`, sus `.test.tsx` — @ui-screens — RF-02, RF-04, CA-03, CA-09, CA-10, CA-14, CA-15, CA-37 — Verificación: verde; en local, el enlace de confirmación de Mailpit deja la sesión iniciada y lleva a `/bienvenida`; abrir el mismo enlace por segunda vez muestra "enlace inválido". Nota T14 (B-3): `/auth/confirmar` borra `token_hash` de la URL con `history.replaceState` apenas llama a `verifyOtp` y no carga recursos de terceros antes.
- [x] T25 `/recuperar` (mismo mensaje siempre) y `/restablecer` (nueva contraseña ≥ 8 con confirmación; sin sesión → enlace inválido con "Pedir otro enlace"; al terminar, confirmación y entrada a la app) + pruebas — `src/routes/auth/RecuperarRoute.tsx`, `RestablecerRoute.tsx`, sus `.test.tsx` — @ui-screens — RF-05, CA-13, CA-14, CA-15 — Verificación: verde; en local, recuperar `ana@…` → correo en Mailpit → nueva contraseña → la vieja falla y la nueva funciona; un email inexistente muestra el mismo mensaje y no genera correo.
- [x] T26 Onboarding `/bienvenida`: 3 opciones de rol con descripción; nombre solo si es nulo; casilla de Términos/Privacidad/18+ solo si `terminos_aceptados_at` es nulo (enlaces en pestaña nueva); botón deshabilitado hasta completar; `useCompleteOnboarding` en un solo `update`; error con reintento conservando lo elegido; éxito → `/` + pruebas — `src/routes/OnboardingRoute.tsx`, `OnboardingRoute.test.tsx` — @ui-screens — RF-11, RF-12, D-16, CA-19, CA-20, CA-22, CA-43 — Verificación: verde; en local, `beto@…` elige rol, llega al Feed y al recargar no vuelve a ver el onboarding; un usuario con `terminos_aceptados_at` nulo no puede continuar sin la casilla; tras aceptar, `terminos_aceptados_at` queda con hora del servidor.
- [x] T27 `/perfil`: avatar o iniciales, nombre, email (de la sesión), rol, "Miembro desde"; edición de nombre y rol con `useUpdateProfile`; error con reintento; botón "Cerrar sesión" (también en la barra lateral) + pruebas — `src/routes/PerfilRoute.tsx`, `PerfilRoute.test.tsx` — @ui-screens — RF-06, RF-13, CA-17, CA-21, CA-22 — Verificación: verde; en local, cambiar `buscador` → `ambos` se ve al instante y persiste tras recargar; tras cerrar sesión, "Atrás" y `/perfil` llevan a `/ingresar`; el nombre se muestra como texto (sin `dangerouslySetInnerHTML`).
- [ ] T28 Redactar los textos de Términos y del Aviso de Privacidad (fase 1: textos simples; incluir edad mínima de 18 años, datos recolectados —nombre, email, foto—, finalidad, derechos de la Ley 8968 y contacto) y entregarlos en el PR o en el chat — @autor — D-16, CA-44 — Verificación: el texto existe y el autor lo aprueba.
- [ ] T29 Páginas `/terminos` y `/privacidad` (texto en JSX, accesibles con o sin sesión, enlace de regreso), con el texto de T28 — `src/routes/legal/TerminosRoute.tsx`, `PrivacidadRoute.tsx` — @ui-screens — RF-15, CA-44 — Verificación: verde; `guards.test.tsx` ya cubre el acceso con y sin sesión; no queda el marcador `[Texto pendiente del autor]` (`grep` sin resultados).
- [x] T30 Pasada de accesibilidad y teclado: orden de tabulación, foco visible, anuncios de errores, objetivos ≥ 44 px, `nav` con `aria-label` + `a11y.test.tsx` con `user.tab()` en login, registro, onboarding y navegación — `src/routes/a11y.test.tsx` y ajustes en `src/` — @ui-screens — RNF Accesibilidad, CA-34 — Verificación: verde; la prueba recorre cada pantalla solo con teclado y alcanza todos los controles; revisión manual con teclado en `pnpm dev`.
- [x] T31 Reemplazar `README.md` (plantilla de Vite) con la puesta en marcha local: requisitos (Node ≥ 22.12, pnpm, Docker), `.env.local` desde `.env.example` con valores de `supabase status`, comandos, usuarios del seed, Mailpit, y aviso de proyecto gratuito pausado — `README.md` — @ui-screens — RF-21, CA-35 — Verificación: en un clon limpio (`git clone` a una carpeta temporal), seguir el README al pie de la letra permite registrarse, confirmar desde Mailpit e ingresar.

## E. Infraestructura y despliegue

- [ ] T32 Crear el proyecto Supabase remoto (plan gratuito, región más cercana a CR, p. ej. `us-east-1`); guardar la contraseña de la BD en el gestor de contraseñas; comunicar a los agentes **solo** el `project ref` y la URL (nunca la service role key) — @autor — RF-22, D-11 — Verificación: el dashboard muestra el proyecto activo; ref y URL disponibles para T36.
- [ ] T33 Google Cloud: pantalla de consentimiento (External, nombre CasaLimón, scopes `openid`, `email`, `profile`, usuarios de prueba si sigue en "Testing") y cliente OAuth tipo Web con URI de redirección `https://<ref>.supabase.co/auth/v1/callback` (y `http://127.0.0.1:54321/auth/v1/callback` si se probará en local; esas credenciales van en `supabase/.env`, ignorado) — @autor — RF-04, D-02 — Verificación: client ID y secret creados y guardados en el gestor de contraseñas.
- [ ] T34 Enlazar y aplicar la migración al remoto después de T14 aprobada (ver Pregunta abierta 1 del plan): `pnpm supabase login`, `pnpm supabase link --project-ref <ref>`, `pnpm supabase db push` — @autor — RF-22, D-11 — Verificación: `pnpm supabase migration list` muestra la migración en local y remoto; en el dashboard, `public.users` tiene RLS activado. Nota T14b: la migración usa la collation `pg_c_utf8`, que requiere PostgreSQL 17; antes del push confirmar en el SQL editor del remoto que `select version()` es 17 o superior (los proyectos nuevos de Supabase lo son). Nunca `--include-seed`.
- [ ] T35 Configurar Auth remoto en el dashboard: Site URL = producción de Vercel; Redirect URLs = `https://<prod-host>/**`, `https://casalimon-web-*-<scope>.vercel.app/**`, `http://localhost:5173/**` (nada más); confirmación de email obligatoria; contraseña mínima 8; proveedor Google con el client ID y secret de T33; pegar asuntos y plantillas de `supabase/templates/`; SMTP por defecto (D-04) — @autor — RF-08, RF-22, D-03, D-04, D-07, CA-37, CA-38 — Verificación: captura o lista de la configuración revisada en T42; un correo de prueba al autor llega en español. Depende de T38 para conocer el host de producción y el scope (puede completarse en dos pasos). Nota T14 (M-3, B-1, B-2): `config.toml` no viaja con `db push`; en el remoto confirmar contraseña mínima 8 (el remoto trae 6), plantillas con `token_hash` (no `{{ .ConfirmationURL }}`), `secure_password_change = true` y frecuencia mínima de correos ≥ 60 s. Nunca ejecutar `seed.sql` contra el remoto (`db push` sin `--include-seed`).
- [ ] T36 `vercel.json`: `framework: "vite"`, `installCommand: "pnpm install --frozen-lockfile"`, `buildCommand`, `outputDirectory: "dist"`, rewrite SPA `/((?!assets/).*)` → `/index.html`, cabeceras de seguridad y CSP del plan con el `<ref>` de T32, `Cache-Control` inmutable en `/assets/(.*)` — `vercel.json` — @ui-screens — RF-25, RF-26, CA-33, CA-39 — Verificación: JSON válido (`node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))"`); la CSP contiene `https://<ref>.supabase.co`, `wss://<ref>.supabase.co`, `https://lh3.googleusercontent.com` y `frame-ancestors 'none'`, y ningún `'unsafe-inline'`/`'unsafe-eval'`; verificación real en T44.
- [ ] T37 GitHub Actions: `.github/workflows/ci.yml` en `pull_request` y `push` a `main`; jobs separados `lint` (incluye `pnpm format:check`), `build` y `test`, cada uno con `pnpm/action-setup` (lee `packageManager`), `actions/setup-node` (Node 22, caché pnpm) y `pnpm install --frozen-lockfile`; `permissions: contents: read`; `concurrency` que cancela ejecuciones viejas del mismo PR — `.github/workflows/ci.yml` — @ui-screens — RF-27, CA-36 — Verificación: al hacer push de la rama, los tres jobs corren y quedan en verde en GitHub; un commit de prueba con un error de lint pone el check `lint` en rojo (y luego se revierte). Estado (2026-11-03): workflow y `.gitattributes` creados; YAML válido y los cuatro comandos en verde en un clon limpio. Falta la parte que solo se comprueba en GitHub (primer run y el commit de prueba con error de lint).
- [ ] T38 Vercel: importar el repo de GitHub (framework Vite), variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (anon/publishable key) en Production y Preview, `VITE_VAPID_PUBLIC_KEY` vacía, `ENABLE_EXPERIMENTAL_COREPACK=1`; **desactivar la Vercel Toolbar** en el proyecto; anotar el host de producción y el scope del equipo para T35 — @autor — RF-24, D-01, R-5 — Verificación: el deploy de producción desde `main` responde; ninguna variable del proyecto contiene `service_role` ni `sb_secret_`.
- [ ] T39 Abrir el PR `001-setup-base` → `main` y comprobar checks + preview — @autor — RF-24, RF-27, CA-36 — Verificación: el PR muestra los checks `lint`, `build` y `test` en verde y el enlace al preview de Vercel.
- [ ] T40 Proteger `main` en GitHub (Settings → Branches/Rulesets): exigir PR antes de integrar, exigir los checks `lint`, `build` y `test` (y opcionalmente el deploy de Vercel), bloquear force-push y borrado, y no permitir bypass a administradores (0 aprobaciones requeridas, porque el autor trabaja solo) — @autor — RF-27, CA-41 — Verificación: `git push origin main` directo es rechazado; un PR con un check rojo no puede integrarse.
- [ ] T41 Borrar la rama remota vieja `master` (verificado: `git log origin/main..origin/master` está vacío, no tiene commits propios): `git push origin --delete master`; confirmar que la rama por defecto en GitHub es `main` — @autor — Verificación: `git ls-remote --heads origin` ya no lista `master`.

## F. Revisión y cierre

- [ ] T42 Revisión de seguridad final: `vercel.json` (CSP y cabeceras), flujos de auth (PKCE, `safeVolver`, `token_hash`, mensajes sin enumeración, `signOut` + limpieza de caché), configuración remota de Auth de T35 (allowlist, riesgo R-1), búsqueda de secretos en el árbol y en el historial (`git grep`/`git log -p` de `service_role`, `sb_secret_`, `SERVICE_ROLE`, secretos de Google), permisos del workflow de CI — repo completo — @security-reviewer — RF-26, RNF Seguridad, CA-38, CA-39, CA-40 — Verificación: reporte sin hallazgos Críticos/Altos abiertos; R-1 aceptado o mitigado por escrito.
- [ ] T43 Revisión QA: `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm format:check`, `pnpm supabase test db`; tabla CA-01..CA-44 con ✅/❌/⚠️ y evidencia; agregar pruebas faltantes — `specs/001-setup-base/`, `src/**/*.test.tsx` — @qa-reviewer — CA-01..CA-44 — Verificación: veredicto **Listo**; cada CA ⚠️ remite a un punto de la checklist de T44.
- [ ] T44 Verificación manual en el preview del PR y en dispositivos (checklist):
  - CA-09: primer ingreso con Google crea perfil con nombre y avatar y lleva al onboarding con la casilla de términos (CA-43).
  - CA-10: cancelar en Google → `/ingresar` con aviso y sin sesión.
  - CA-11: cuenta email confirmada + Google con el mismo email → una sola fila en `public.users`.
  - CA-37: registro, confirmación, recuperación y OAuth vuelven al mismo preview.
  - CA-38: `resetPasswordForEmail` con `redirectTo: 'https://example.com'` no genera un enlace a example.com.
  - CA-39: `curl -I <preview>/` y `curl -I <preview>/perfil` muestran todas las cabeceras; consola sin violaciones de CSP durante login, OAuth y navegación.
  - CA-33: recargar `/no-existe` y `/perfil` en el preview → 404 de la app / app (no 404 de Vercel).
  - CA-16: cerrar y reabrir el navegador → sigue la sesión sin parpadeo del login.
  - CA-08: repetir ingresos fallidos hasta el límite → "Demasiados intentos…".
  - CA-30 y CA-31: celular real a ~375 px y escritorio ≥ 1024 px.
  - CA-34: recorrido solo con teclado.
  - RNF Rendimiento: Lighthouse móvil del login en el preview.
  - CA-01 y CA-13: el correo remoto llega en español.

  — @autor (con apoyo de @qa-reviewer para registrar resultados) — Verificación: todos los puntos marcados como OK en el PR.
- [ ] T45 Integrar el PR a `main` con checks en verde y confirmar el deploy de producción; actualizar "Estado actual" en `CLAUDE.md` y el párrafo final de la spec (Pregunta abierta 6) — @autor — RF-24 — Verificación: producción responde con las cabeceras de CA-39 y el flujo de registro funciona en la URL de producción.

---

## Cobertura de criterios de aceptación

| CA | Tareas |
|---|---|
| CA-01 | T07, T10, T12, T22, T44 |
| CA-02 | T17, T23 |
| CA-03 | T24 |
| CA-04 | T17, T22, T43 |
| CA-05 | T17, T22 |
| CA-06 | T20, T23 |
| CA-07 | T17, T23 |
| CA-08 | T17, T23, T44 |
| CA-09 | T10, T24, T33, T35, T44 |
| CA-10 | T17, T24, T44 |
| CA-11 | T10, T44 |
| CA-12 | T17, T22, T23 |
| CA-13 | T07, T25, T44 |
| CA-14 | T24, T25 |
| CA-15 | T17, T24, T25 |
| CA-16 | T16, T20, T44 |
| CA-17 | T16, T20, T27 |
| CA-18 | T20 |
| CA-19 | T18, T26 |
| CA-20 | T26 |
| CA-21 | T18, T27 |
| CA-22 | T18, T26, T27 |
| CA-23 | T08, T12, T14 |
| CA-24 | T08, T12, T14 |
| CA-25 | T08, T09, T12, T14 |
| CA-26 | T08, T12, T14 |
| CA-27 | T08, T12, T14 |
| CA-28 | T15, T20, T23 |
| CA-29 | T20 |
| CA-30 | T21, T44 |
| CA-31 | T21, T44 |
| CA-32 | T21 |
| CA-33 | T20, T36, T44 |
| CA-34 | T19, T30, T44 |
| CA-35 | T05, T06, T11, T31 |
| CA-36 | T37, T39 |
| CA-37 | T07, T24, T35, T44 |
| CA-38 | T35, T42, T44 |
| CA-39 | T36, T42, T44 |
| CA-40 | T05, T38, T42 |
| CA-41 | T40 |
| CA-42 | T17, T22 |
| CA-43 | T20, T26, T44 |
| CA-44 | T20, T28, T29 |

## Resumen por responsable

| Responsable | Tareas | Total |
|---|---|---|
| @ui-screens | T01–T05, T15–T27, T29–T31, T36, T37 | 23 |
| @schema-rls | T06–T13 | 8 |
| @security-reviewer | T14, T42 | 2 |
| @qa-reviewer | T43 | 1 |
| @autor | T28, T32–T35, T38–T41, T44, T45 | 11 |
