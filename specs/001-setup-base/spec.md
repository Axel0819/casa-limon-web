# 001 — Setup base
Estado: Borrador · Fase: 1 · Fecha: 2026-10-28

## Objetivo

Dejar CasaLimón listo para construir funcionalidades: proyecto React + Vite configurado, Supabase local y remoto, autenticación funcional (email + contraseña y OAuth), perfil mínimo con rol, shell de navegación responsive con rutas protegidas, deploy con previews por PR y CI que bloquee cambios rotos.

Al cerrar la fase, una persona puede registrarse, confirmar su correo, elegir su rol (buscador, propietario o ambos), navegar por las cuatro vistas núcleo (todavía vacías) y cerrar sesión, tanto en celular como en escritorio, sobre una URL pública desplegada. Todo cambio posterior llega por PR con preview y checks verdes.

Esta fase también cierra las decisiones de la constitución que afectan al registro: hosting, proveedores OAuth, confirmación de email, captcha (moderación) y verificación (confianza).

## Alcance

### Incluido

- **Proyecto:** plugins de Tailwind v4 y alias `@/` → `src/` en Vite/TS; tokens de color de Limón en `src/index.css`; Prettier; script de pruebas para Vitest; cliente Supabase único en `src/lib/` con tipos generados.
- **Supabase:** `supabase/` inicializado (config, migraciones, seed), entorno local funcional y proyecto remoto enlazado.
- **Auth:** registro e inicio de sesión con email + contraseña, OAuth (ver D-02), confirmación de email, recuperación y restablecimiento de contraseña, cierre de sesión, persistencia y renovación de sesión.
- **Perfil mínimo:** tabla `public.users` (`id`, `nombre`, `avatar`, `rol`, `created_at`) vinculada a `auth.users`, creada automáticamente al registrarse, con RLS.
- **Onboarding de rol** tras el primer inicio de sesión y **cambio de rol** posterior desde Perfil.
- **Shell:** layout autenticado con pestañas inferiores (celular) y barra lateral (escritorio); rutas protegidas con placeholders para Feed, Publicar, Chat y Perfil; vistas de auth públicas; página 404; estados de carga y error globales.
- **Infra:** `.env.example` versionado y `.env.local` ignorado; deploy en hosting con previews por PR; CI (lint + build + tests) en GitHub Actions; CSP y cabeceras de seguridad; reescritura SPA; URLs de redirección de Auth restringidas.

### Fuera de alcance

- Feed, posts, propiedades, ofertas, chat, notificaciones y Web Push (fases 3–6).
- Resto del modelo de datos y su RLS (`posts`, `properties`, `offers`, `conversations`, `messages`, `notifications`, `push_subscriptions`) → fase 2. En fase 1 solo existe `users`.
- Subida de avatar a Storage y edición completa de perfil (publicaciones, ofertas) → fase 7. En fase 1 solo se edita `nombre` y `rol`; `avatar` se rellena con la foto del proveedor OAuth si existe.
- PWA instalable: manifest, íconos y Service Worker → fase 6/7 (ver D-08).
- Verificación de teléfono o identidad, reseñas, pagos, contratos, mapa, app nativa y panel de administración (fuera del MVP).
- Eliminación de cuenta por el usuario (ver Preguntas abiertas).
- Aplicación automática de migraciones al remoto desde CI (en fase 1 es manual, ver D-11).

## Usuarios y casos de uso

- Como **visitante**, quiero crear una cuenta con mi correo o con Google para empezar a usar CasaLimón sin trámites largos.
- Como **usuario registrado**, quiero que mi sesión se mantenga al cerrar y reabrir el navegador para no ingresar cada vez.
- Como **usuario que olvidó su contraseña**, quiero recuperarla por correo.
- Como **usuario nuevo**, quiero indicar si busco casa, si alquilo una propiedad o ambas cosas, para que la app se adapte a mí.
- Como **buscador** que también tiene una propiedad, quiero cambiar mi rol a "ambos" sin crear otra cuenta.
- Como **desarrollador**, quiero que cada PR tenga un preview desplegado y checks automáticos para revisar cada fase antes de producción.

## Requisitos funcionales

### Autenticación

- **RF-01** Registro con email, contraseña y nombre. Contraseña mínima de 8 caracteres [PENDIENTE: confirmar política; Supabase permite exigir mayúsculas/números/símbolos].
- **RF-02** Tras el registro con email, el usuario recibe un correo de confirmación y no puede iniciar sesión hasta confirmar (D-03). La pantalla posterior al registro indica revisar el correo y permite reenviar el enlace.
- **RF-03** Inicio de sesión con email + contraseña.
- **RF-04** Inicio de sesión / registro con OAuth (D-02). Si el email del proveedor coincide con una cuenta existente confirmada, se vincula a la misma cuenta (comportamiento estándar de Supabase); no se crea un segundo perfil.
- **RF-05** Recuperación de contraseña: el usuario pide un enlace por email y define una nueva contraseña en la pantalla de restablecimiento. La respuesta a la solicitud es la misma exista o no el email (no se revela si la cuenta existe).
- **RF-06** Cierre de sesión desde Perfil (celular) y desde la barra lateral o Perfil (escritorio); limpia la sesión local y la caché de datos y lleva al inicio de sesión.
- **RF-07** La sesión persiste entre recargas y reaperturas del navegador y se renueva automáticamente mientras el refresh token sea válido.
- **RF-08** Todos los correos de Auth (confirmación, recuperación, cambio de email si aplica) están en español de Costa Rica con la marca CasaLimón (D-07).
- **RF-09** Los mensajes de error de Auth se muestran en español y sin detalles técnicos (credenciales inválidas, email ya registrado, email sin confirmar, enlace vencido, OAuth cancelado, error de red, demasiados intentos).

### Perfil y rol

- **RF-10** Al crearse un usuario en `auth.users` se crea automáticamente su fila en `public.users` con el mismo `id`. `nombre` se toma del formulario de registro o del nombre del proveedor OAuth; `avatar` de la foto del proveedor si existe; `rol` queda sin definir.
- **RF-11** Un usuario autenticado sin `rol` es redirigido al **onboarding de rol** desde cualquier ruta protegida. El onboarding ofrece tres opciones con una breve explicación: "Busco dónde vivir" (`buscador`), "Tengo una propiedad para alquilar" (`propietario`), "Ambas" (`ambos`). Si el `nombre` está vacío (p. ej., OAuth sin nombre), el onboarding también lo pide.
- **RF-12** Tras completar el onboarding, el usuario llega al Feed y no vuelve a ver el onboarding.
- **RF-13** En Perfil (placeholder), el usuario ve su nombre, avatar (o iniciales), email, rol actual y fecha de alta, y puede cambiar su `nombre` y su `rol` entre los tres valores. El cambio se refleja sin recargar.
- **RF-14** En fase 1 el rol no cambia la navegación: las cuatro pestañas se muestran a todos. Qué ve cada rol se define en las specs de fases 3 y 4.

### Shell y navegación

- **RF-15** Rutas públicas: inicio de sesión, registro, recuperar contraseña, restablecer contraseña, callback de Auth. Un usuario con sesión que entra a ellas es enviado al Feed (o al onboarding si no tiene rol).
- **RF-16** Rutas protegidas: Feed (`/`), Publicar (`/publicar`), Chat (`/chat`), Perfil (`/perfil`) y onboarding. Sin sesión redirigen a inicio de sesión y, tras ingresar, vuelven a la ruta solicitada.
- **RF-17** Mientras se resuelve la sesión inicial se muestra un estado de carga a pantalla completa (sin parpadeo del formulario de login para usuarios con sesión).
- **RF-18** Layout autenticado: en celular, pestañas inferiores fijas con Feed, Publicar, Chat y Perfil; en escritorio (≥ `md`), barra lateral con logo CasaLimón y los mismos destinos. La pestaña/enlace activo se distingue visualmente y con `aria-current`.
- **RF-19** Cada vista núcleo muestra un placeholder con título y un mensaje de "Próximamente" en español; no realiza consultas de dominio.
- **RF-20** Ruta inexistente → página 404 con enlace al inicio. Error inesperado de renderizado → pantalla de error con opción de reintentar/volver al inicio. Fallo al leer el perfil → estado de error con reintentar.

### Infraestructura

- **RF-21** `supabase start` + `supabase db reset` levantan un entorno local con la migración de `users`, su trigger y RLS, y un seed con al menos dos usuarios de prueba (uno con rol y otro sin rol).
- **RF-22** Proyecto Supabase remoto enlazado con la misma migración aplicada, proveedor OAuth configurado, plantillas de correo en español, SMTP propio (D-04) y lista de URLs de redirección restringida a producción, previews del proyecto y `localhost` de desarrollo.
- **RF-23** `.env.example` versionado con `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_VAPID_PUBLIC_KEY` (vacía hasta fase 6). `.env`, `.env.*` y `.env.local` ignorados por git (salvo `.env.example`); también se ignoran los artefactos locales de `supabase/` (p. ej. `.temp`, `.branches`).
- **RF-24** Deploy en el hosting elegido (D-01): rama `master` → producción; cada PR → preview con URL propia. Las variables `VITE_*` se configuran en el hosting por entorno.
- **RF-25** El hosting sirve `index.html` para cualquier ruta de la SPA (deep links y recargas no dan 404 del servidor).
- **RF-26** Cabeceras de seguridad en todas las respuestas: CSP restrictiva (solo orígenes propios, el proyecto Supabase por HTTPS y WSS, y los dominios de avatares del proveedor OAuth), `frame-ancestors 'none'`, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` y `Permissions-Policy` mínima.
- **RF-27** GitHub Actions ejecuta en cada PR y en push a `master`: instalación con pnpm (lockfile congelado), `pnpm lint`, `pnpm build` y `pnpm vitest run`. Un fallo marca el PR en rojo. [PENDIENTE: ¿se activa protección de rama en `master` exigiendo checks verdes?]

## Requisitos no funcionales

- **Responsive:** mobile-first; probado a 375 px y a ≥ 1024 px. Pestañas inferiores respetan `safe-area-inset-bottom`; layout usa `min-h-dvh`.
- **Accesibilidad:** formularios con `label` asociados, errores anunciados (`aria-live`/`aria-describedby`), foco visible, objetivos táctiles ≥ 44 px, contraste AA con los tokens de Limón, navegación completa por teclado. Navegación con `nav` y `aria-label`.
- **Seguridad:** RLS habilitado en `public.users` con políticas por operación y `with check`; en el navegador solo la anon key; la service role key nunca aparece en el repo ni en variables `VITE_*`; flujo OAuth con PKCE; contenido de usuario (nombre) renderizado como texto.
- **Rendimiento:** la pantalla de login es usable en < 3 s en 4G móvil típico (Lighthouse móvil, preview). [PENDIENTE: confirmar umbral]
- **Calidad:** TypeScript estricto sin `any`; lint, build y tests en verde; al menos pruebas de: guardas de rutas protegidas, redirección a onboarding sin rol y render del layout en ambos breakpoints.
- **Idioma:** textos de UI y correos en español de Costa Rica; columnas y valores de dominio en español (`nombre`, `rol = 'buscador'`).

## Criterios de aceptación

### Registro e inicio de sesión

- **CA-01** Dado un visitante en `/registro`, cuando envía nombre, email válido y contraseña de ≥ 8 caracteres, entonces ve "Revisá tu correo para confirmar la cuenta" (texto final según D-12), se envía un correo en español y existe una fila en `public.users` con ese `id`, `nombre` y `rol` nulo.
- **CA-02** Dado un visitante que se registró y no confirmó, cuando intenta iniciar sesión, entonces ve un mensaje de que debe confirmar su correo y una opción para reenviar el enlace.
- **CA-03** Dado un usuario que hace clic en el enlace de confirmación, cuando se abre la app, entonces queda con sesión iniciada y llega al onboarding de rol.
- **CA-04** Dado un visitante en `/registro`, cuando usa un email ya registrado, entonces no se crea un segundo usuario ni perfil y ve un mensaje genérico en español sin datos técnicos.
- **CA-05** Dado un visitante en `/registro`, cuando deja campos vacíos, usa un email mal formado o una contraseña de < 8 caracteres, entonces el formulario muestra el error junto al campo, no se envía la solicitud y el foco va al primer campo con error.
- **CA-06** Dado un usuario confirmado, cuando ingresa email y contraseña correctos en `/ingresar`, entonces llega al Feed (o al onboarding si no tiene rol).
- **CA-07** Dado un usuario en `/ingresar`, cuando ingresa una contraseña incorrecta o un email inexistente, entonces ve "Correo o contraseña incorrectos" (mismo mensaje en ambos casos) y permanece en la pantalla con el email conservado.
- **CA-08** Dado un usuario que supera el límite de intentos de Supabase Auth, cuando vuelve a intentar, entonces ve un mensaje de "Demasiados intentos, probá en unos minutos".
- **CA-09** Dado un visitante, cuando pulsa "Continuar con Google" y autoriza, entonces vuelve a la app con sesión iniciada; si es su primer ingreso se crea su perfil con nombre y avatar de Google y llega al onboarding.
- **CA-10** Dado un visitante en la pantalla del proveedor OAuth, cuando cancela o deniega el permiso, entonces vuelve a `/ingresar` con el mensaje "No se completó el ingreso con Google" y sin sesión.
- **CA-11** Dado un usuario registrado con email + contraseña y confirmado, cuando ingresa con Google usando el mismo email, entonces entra a la misma cuenta y existe una sola fila en `public.users`.
- **CA-12** Dado que la app no puede contactar a Supabase (sin red), cuando el usuario intenta ingresar o registrarse, entonces ve "No hay conexión. Revisá tu internet e intentá de nuevo" y el botón vuelve a estar disponible.

### Recuperación y sesión

- **CA-13** Dado un usuario en `/recuperar`, cuando envía cualquier email (exista o no), entonces ve el mismo mensaje de confirmación; si la cuenta existe recibe un correo en español con el enlace.
- **CA-14** Dado un usuario que abre el enlace de recuperación válido, cuando define una nueva contraseña válida, entonces queda con sesión iniciada, ve una confirmación y puede ingresar luego solo con la nueva contraseña.
- **CA-15** Dado un enlace de recuperación o confirmación vencido o ya usado, cuando el usuario lo abre, entonces ve un mensaje de enlace inválido con opción de solicitar uno nuevo.
- **CA-16** Dado un usuario con sesión iniciada, cuando cierra el navegador y lo vuelve a abrir en la app, entonces sigue con sesión y no ve el formulario de login (ni un parpadeo de él).
- **CA-17** Dado un usuario con sesión, cuando pulsa "Cerrar sesión", entonces vuelve a `/ingresar`, y al presionar "Atrás" o abrir `/perfil` es redirigido a `/ingresar`.

### Onboarding y rol

- **CA-18** Dado un usuario autenticado sin rol, cuando intenta abrir `/`, `/publicar`, `/chat` o `/perfil`, entonces es redirigido al onboarding.
- **CA-19** Dado un usuario en el onboarding, cuando elige una opción y confirma, entonces su `rol` queda guardado, llega al Feed y al recargar no vuelve a ver el onboarding.
- **CA-20** Dado un usuario en el onboarding, cuando intenta confirmar sin elegir rol (o sin nombre si se le pidió), entonces el botón está deshabilitado o se muestra el error en el campo.
- **CA-21** Dado un usuario con rol `buscador`, cuando cambia su rol a `ambos` en Perfil, entonces ve el nuevo rol de inmediato y persiste tras recargar.
- **CA-22** Dado que falla el guardado del rol o del nombre (error de red o servidor), cuando el usuario confirma, entonces ve un mensaje de error, el valor anterior se conserva y puede reintentar.

### Seguridad de datos (RLS)

- **CA-23** Dados los usuarios A y B autenticados, cuando A intenta actualizar `nombre`, `rol` o `avatar` de la fila de B usando la anon key, entonces la operación no modifica ninguna fila.
- **CA-24** Dado el usuario A, cuando intenta insertar una fila en `public.users` con cualquier `id` o borrar cualquier fila (incluida la suya), entonces la operación es rechazada.
- **CA-25** Dado el usuario A, cuando intenta actualizar su propio `id` o `created_at`, o asignar un `rol` fuera de `buscador`/`propietario`/`ambos`, entonces la operación es rechazada.
- **CA-26** Dado un cliente sin sesión (anon), cuando consulta `public.users`, entonces no obtiene filas.
- **CA-27** Dado un usuario autenticado, cuando consulta `public.users`, entonces puede leer `id`, `nombre`, `avatar`, `rol` y `created_at` de otros usuarios (necesario en fases 3–5), pero nunca su email (el email solo vive en `auth.users`).

### Shell y navegación

- **CA-28** Dado un visitante sin sesión, cuando abre directamente `/chat`, entonces es enviado a `/ingresar` y, tras ingresar, llega a `/chat`.
- **CA-29** Dado un usuario con sesión, cuando abre `/ingresar` o `/registro`, entonces es enviado al Feed.
- **CA-30** Dado un usuario autenticado en un celular (375 px), cuando navega, entonces ve pestañas inferiores Feed, Publicar, Chat y Perfil, la activa resaltada, sin barra lateral, y el contenido no queda oculto detrás de las pestañas.
- **CA-31** Dado un usuario autenticado en escritorio (≥ 1024 px), cuando navega, entonces ve la barra lateral con logo y los cuatro destinos, sin pestañas inferiores.
- **CA-32** Dado un usuario autenticado, cuando abre cada vista núcleo, entonces ve su placeholder con título en español y "Próximamente".
- **CA-33** Dada cualquier URL inexistente, cuando se abre (también recargando en el preview desplegado), entonces se muestra la 404 de la app con enlace al inicio, no un 404 del hosting.
- **CA-34** Dado un usuario con teclado, cuando recorre login, registro, onboarding y la navegación, entonces todos los controles son alcanzables, el foco es visible y los errores de formulario se anuncian a lectores de pantalla.

### Infraestructura

- **CA-35** Dado un clon limpio con `.env.local` copiado de `.env.example` y apuntando al Supabase local, cuando se ejecuta `pnpm install`, `pnpm supabase start`, `pnpm supabase db reset` y `pnpm dev`, entonces se puede registrar e ingresar localmente (correos visibles en el buzón de pruebas local).
- **CA-36** Dado un PR abierto, cuando termina el pipeline, entonces el PR muestra los checks de lint, build y tests y un enlace al preview desplegado; si cualquiera falla, el check queda en rojo.
- **CA-37** Dado el preview de un PR, cuando se completa el flujo de registro, confirmación, OAuth y recuperación, entonces todas las redirecciones vuelven al mismo preview (no a producción ni a `localhost`).
- **CA-38** Dada una URL de redirección arbitraria (dominio ajeno), cuando se pasa como `redirectTo` a Supabase Auth, entonces Supabase no redirige a ella.
- **CA-39** Dada cualquier respuesta del preview o producción, cuando se inspeccionan las cabeceras, entonces incluyen CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` y `frame-ancestors 'none'`, y la consola del navegador no muestra violaciones de CSP durante login, OAuth y navegación.
- **CA-40** Dado el repositorio, cuando se buscan secretos, entonces no hay ningún `.env` con valores reales versionado ni la service role key en código, configuración o variables `VITE_*`.

## Decisiones y riesgos

| ID | Tema | Decisión | Justificación |
|---|---|---|---|
| D-01 | Hosting | **Vercel** (previews por PR nativos con GitHub, cabeceras y rewrites en `vercel.json`). [PENDIENTE: confirmación final] | Es lo propuesto en la constitución; menor configuración para un solo desarrollador. Netlify y Cloudflare Pages son equivalentes funcionales; Cloudflare tiene ancho de banda más generoso pero no es decisivo en beta. Riesgo: plan Hobby es para uso no comercial; si CasaLimón se monetiza habrá que pasar a Pro o migrar. La toolbar de Vercel en previews inyecta scripts: se desactiva o se contempla en la CSP de previews. |
| D-02 | Proveedor(es) OAuth | **Google** como único proveedor en el MVP. [PENDIENTE: confirmar; evaluar Facebook] | Google es el más universal en Android (mayoría del mercado en CR) y el más simple de configurar. Facebook es muy usado en Limón, pero su revisión de app agrega fricción; se puede añadir después sin cambios de modelo. Apple no se incluye (solo obligatorio en apps nativas iOS). |
| D-03 | Confirmación de email | **Obligatoria** para cuentas email + contraseña. Cuentas OAuth llegan con email verificado por el proveedor. | Confianza (riesgo de la constitución): garantiza un contacto real y reduce cuentas desechables y spam. Coste: fricción en el registro y dependencia de la entrega de correos (ver D-04). |
| D-04 | Envío de correos | **SMTP propio** en el proyecto remoto (no el servidor de correo por defecto de Supabase). [PENDIENTE: proveedor (p. ej. Resend, Brevo) y dominio remitente] | El servicio por defecto de Supabase tiene un límite muy bajo de envíos por hora y no es apto para usuarios reales; con confirmación obligatoria (D-03) un fallo de correo bloquea el registro. Requiere un dominio propio con SPF/DKIM. |
| D-05 | Moderación — captcha en registro | **No se activa en fase 1.** Mitigación: confirmación de email (D-03) + rate limits de Supabase Auth. Se reevalúa antes de la beta (fase 8) o al detectar abuso; Supabase soporta Turnstile/hCaptcha sin cambiar el modelo. [PENDIENTE: confirmar] | En fase 1 no hay contenido publicable (no hay posts), así que el spam no tiene superficie. Un captcha agrega fricción y un tercero en la CSP. La moderación de contenido (reportar, límite de posts) se decide en fase 3. |
| D-06 | Confianza — verificación de teléfono | **Fuera del MVP.** | Requiere proveedor SMS de pago y aumenta fricción. La confianza en el MVP se apoya en email verificado (D-03) y en mostrar la antigüedad de la cuenta (`created_at`) en el perfil (se expone en fase 7). Verificación de identidad está explícitamente fuera del MVP. |
| D-07 | Idioma de correos de Auth | **Español de Costa Rica**, con plantillas personalizadas en Supabase (local en `supabase/config.toml` y remoto en el proyecto), asunto y remitente "CasaLimón". | Coherencia con la UI; el correo en inglés por defecto genera desconfianza y parece spam. |
| D-08 | PWA / manifest en fase 1 | **No se registra manifest ni Service Worker en fase 1**; solo favicon, `<title>`, `lang="es-CR"` y `theme-color`. El manifest y la instalación van en fase 7; el SW se introduce en fase 6 junto con Web Push. | Un SW con caché durante las fases tempranas complica la verificación de previews (versiones viejas servidas). Agruparlo con push evita registrar dos veces la estrategia de SW. Web Push en iOS depende de la PWA instalada: no aplica en esta fase, se decide en 6–7. |
| D-09 | Datos mínimos de perfil | **`nombre` obligatorio** (texto, longitud 2–60 [PENDIENTE: confirmar]); **`avatar` opcional** (URL del proveedor OAuth en fase 1; subida propia en fase 7); `rol` obligatorio tras onboarding. Sin teléfono, sin apellidos separados. | Mínimo para identificar a la contraparte en feed y chat. Menos datos personales = menos obligaciones bajo la Ley 8968 de protección de datos. |
| D-10 | Frontera con fase 2 | Fase 1 crea solo `public.users` + trigger de alta + RLS (lectura: autenticados; actualización: solo el propio usuario, sin cambiar `id`/`created_at`; insert solo por trigger; sin delete). Fase 2 crea el resto de tablas y puede ajustar `users` solo mediante migraciones nuevas. | Auth y onboarding necesitan el perfil desde ya; el resto del modelo no se usa hasta fase 3. La lectura por autenticados anticipa la necesidad de mostrar autor en feed/chat. |
| D-11 | Entornos Supabase | **Un solo proyecto remoto** compartido por previews y producción durante fases 1–7; antes de la beta (fase 8) se evalúa separar staging y producción. Migraciones al remoto con `supabase db push` manual. [PENDIENTE: confirmar] | Plan gratuito limitado a pocos proyectos activos y no hay usuarios reales hasta la beta. Riesgo: un preview con migración rota afecta a "producción"; mitigado porque solo se hace push tras merge. Nota: proyectos gratuitos se pausan tras inactividad. |
| D-12 | Tratamiento en la UI | [PENDIENTE: ¿"vos" o "usted"?] Los ejemplos de esta spec usan voseo provisionalmente. | Afecta todos los textos y correos; conviene fijarlo antes de escribir las plantillas. |
| D-13 | Retención | No aplica en fase 1. | No hay posts ni ofertas. |
| D-14 | Adopción | No aplica en fase 1, salvo: el registro con Google reduce fricción de entrada. Enlaces compartibles por WhatsApp se tratan en fase 3/8. | — |
| D-15 | Web Push en iOS | No aplica en fase 1 (ver D-08). | — |
| D-16 | Privacidad y términos | [PENDIENTE] ¿El registro exige aceptar Términos y Aviso de Privacidad (Ley 8968)? Si sí, ¿quién redacta los textos y dónde se alojan? | Recolectamos nombre, email y foto; en beta con usuarios reales probablemente sea necesario. No bloquea la estructura técnica pero sí los CA de registro. |

## Preguntas abiertas

- [PENDIENTE: D-01] ¿Se confirma Vercel como hosting (plan Hobby en el MVP)?
- [PENDIENTE: D-02] ¿Google es el único proveedor OAuth del MVP o se agrega Facebook?
- [PENDIENTE: D-04] ¿Qué proveedor SMTP y qué dominio/remitente se usan para los correos de Auth? ¿Existe ya un dominio propio (también para producción en el hosting)?
- [PENDIENTE: D-05] ¿Se acepta posponer el captcha de registro hasta antes de la beta?
- [PENDIENTE: D-09] ¿Longitud permitida para `nombre` (propuesta 2–60) y se pide nombre completo o solo como quiere que lo vean?
- [PENDIENTE: D-11] ¿Un solo proyecto Supabase remoto hasta la beta, o staging + producción desde ya?
- [PENDIENTE: D-12] Tratamiento en textos de UI y correos: ¿"vos" o "usted"?
- [PENDIENTE: D-16] ¿Se requiere aceptación de Términos y Aviso de Privacidad en el registro? ¿Hay edad mínima?
- [PENDIENTE: RF-01] Política de contraseña: ¿solo mínimo 8 caracteres o también exigir letras y números?
- [PENDIENTE: RF-27] ¿Se activa protección de rama en `master` con checks obligatorios y merge solo por PR?
- [PENDIENTE: RNF rendimiento] ¿Se acepta el umbral de < 3 s en 4G para la pantalla de login?
- [PENDIENTE] Eliminación de cuenta por el propio usuario: ¿fuera del MVP o se incluye en fase 7? (relevante para Ley 8968).

---

Esta spec está en **Borrador** y requiere **aprobación humana** (cambiar a `Estado: Aprobada`) antes de pasar al subagente `planner`.
