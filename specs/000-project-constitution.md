# 000 — Constitución del proyecto CasaLimón

Estado: Aprobada · Versión: 1.0 · Fecha: 2026-10-27
Fuente: *CasaLimón — Documento de Proyecto Web MVP v1.1* (13/10/2026). Autor: Axel Chavarría Montoya.

Este documento fija los principios, convenciones y restricciones que toda spec, plan y línea de código debe respetar. Si una spec necesita romper una regla de aquí, debe declararlo explícitamente y actualizar esta constitución.

---

## 1. Propósito

CasaLimón es una plataforma web de alquiler de vivienda para la provincia de Limón, Costa Rica, dirigida a estudiantes y trabajadores. Funciona como un **feed de solicitudes**: el buscador publica lo que necesita (presupuesto, zona, características) y los propietarios responden con ofertas de sus propiedades; luego ambos conversan por chat en tiempo real.

**Objetivo del MVP:** validar el matching buscador–propietario con el mínimo de funcionalidades que permita publicar, ofrecer y conversar.

## 2. Principios

1. **Spec antes que código.** Ninguna feature se implementa sin `spec.md` aprobada por un humano (ver §9).
2. **Mobile-first.** Se diseña primero para celular; el escritorio es una adaptación.
3. **La seguridad vive en la base de datos.** Toda regla de acceso se garantiza con RLS en Postgres; el frontend nunca es la barrera de seguridad.
4. **Sin backend propio.** Supabase cubre Auth, base de datos, Storage, Realtime y lógica de servidor (triggers / Edge Functions). Agregar un servidor requiere decisión explícita.
5. **Alcance mínimo.** Lo que no está en §3.1 está fuera del MVP. Ante la duda, se deja fuera y se anota.
6. **Decisiones explícitas.** Riesgos y preguntas abiertas se declaran en la spec afectada, aunque la decisión sea "no se resuelve en el MVP".
7. **Incrementos verificables.** Cada fase produce algo funcional, probado y desplegado en un preview antes de seguir.
8. **Simplicidad para un solo desarrollador.** Se prefiere la solución más simple y estándar del stack sobre la más flexible.

## 3. Alcance

### 3.1 Incluido en el MVP

| Funcionalidad | Descripción |
|---|---|
| Registro / login | Email + OAuth; rol buscador, propietario o ambos |
| Feed de solicitudes | Listado con texto, presupuesto, zona y tags; filtros básicos |
| Publicar solicitud | El buscador crea, edita y cierra sus solicitudes |
| Gestión de propiedades | El propietario registra propiedades con fotos, precio, zona y descripción |
| Ofertas | El propietario responde a una solicitud ofreciendo una de sus propiedades |
| Chat en tiempo real | Conversación 1 a 1 a partir de una oferta |
| Perfil | Datos básicos, publicaciones activas, ofertas enviadas/recibidas |
| Notificaciones | In-app en tiempo real y Web Push (nueva oferta, nuevo mensaje) |
| Imágenes | Fotos de propiedades y avatar |
| Responsive + PWA | Cómodo en celular y escritorio; instalable |

### 3.2 Fuera del MVP

Pagos y depósitos · mapa interactivo y búsqueda geoespacial · reseñas y calificaciones · verificación de identidad y documentos · contratos digitales · app móvil nativa · panel de administración.

### 3.3 Criterios de éxito (beta cerrada)

- % de solicitudes que reciben al menos una oferta.
- Tiempo promedio entre publicación y primera oferta.
- % de ofertas que derivan en conversación activa.
- Usuarios que regresan durante la semana siguiente a su registro.

Valores objetivo: `[PENDIENTE: definir antes de la fase 8]`.

## 4. Usuarios y flujo

- **Buscador:** publica lo que necesita y recibe opciones que encajen.
- **Propietario:** encuentra demanda real y contacta rápido.
- **Ambos:** un mismo usuario puede tener los dos roles y cambiar sin crear otra cuenta.

Flujo principal: **Publicar → Descubrir → Ofertar → Notificar → Conversar → Acordar** (el acuerdo ocurre fuera de la plataforma; el buscador marca la solicitud como resuelta).

Vistas núcleo: Feed, Publicar solicitud, Chat, Perfil. Vistas de soporte: login/registro, onboarding de rol, detalle de solicitud, detalle de propiedad, formulario de propiedad, estados vacíos y de error.

## 5. Stack (fijo para el MVP)

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite |
| Navegación | React Router (paquete `react-router`) |
| Estilos | Tailwind CSS v4 |
| Estado de servidor | TanStack Query |
| Estado de UI local | Zustand |
| Backend / DB | Supabase (Postgres + RLS) |
| Auth / Storage / Realtime | Supabase Auth, Storage, Realtime |
| Lógica de servidor | Triggers Postgres + Supabase Edge Functions (Deno) |
| PWA / Push | `vite-plugin-pwa` + Service Worker + Web Push (VAPID) |
| Pruebas | Vitest + Testing Library |
| Hosting | Vercel (previews por PR) — `[PENDIENTE: confirmar vs. Netlify / Cloudflare Pages]` |
| CI | GitHub Actions (lint + tests) |
| Paquetes | pnpm |

Agregar una dependencia de runtime nueva requiere justificarla en el `plan.md` de la feature.

## 6. Arquitectura y convenciones de código

### 6.1 Estructura de carpetas

```
src/routes/      vistas de React Router ((auth), feed, chat, perfil)
src/components/  componentes de UI reutilizables, sin lógica de dominio
src/features/    lógica por dominio: posts, properties, offers, chat, notifications, profile
src/lib/         cliente Supabase, tipos generados, helpers, constantes
src/stores/      stores de Zustand
public/          manifest PWA, íconos
supabase/        migraciones SQL, seed, Edge Functions
specs/           specs SDD por feature
```

### 6.2 Reglas de código

- TypeScript estricto; sin `any`. Tipos de BD generados en `src/lib/database.types.ts` (no se editan a mano).
- **Los componentes nunca llaman a `supabase` directamente**: usan hooks de `src/features/<dominio>/` (`api.ts`, `queries.ts`, `mutations.ts`, `types.ts`).
- Todo dato remoto pasa por TanStack Query con query keys jerárquicas por dominio. Zustand solo para estado de UI (modales, filtros activos, sesión).
- Suscripciones Realtime escriben en la caché de TanStack Query y siempre se limpian en el unmount.
- Toda vista con datos maneja carga, vacío y error.
- Código (identificadores) en inglés para lo técnico estándar; **nombres de columnas y valores de dominio en español**, como en el modelo de datos. Textos de interfaz en español de Costa Rica.
- Formato con Prettier; lint con ESLint. `pnpm lint` y `pnpm build` deben pasar antes de cerrar una tarea.

### 6.3 Diseño

- Identidad visual: blanco, verde y celeste (colores de Limón), definidos como tokens en `@theme` de `src/index.css`.
- Celular: navegación inferior por pestañas; chat a pantalla completa.
- Escritorio: barra lateral; chat dividido (lista + mensajes).
- Accesibilidad: HTML semántico, labels, foco visible, objetivos táctiles ≥ 44px, contraste AA.

## 7. Modelo de datos

PK `uuid` en todas las tablas; usuarios referenciados por el `id` de Supabase Auth; `created_at timestamptz default now()`.

| Tabla | Campos | Notas |
|---|---|---|
| users | id, nombre, avatar, rol, created_at | rol: `buscador` / `propietario` / `ambos` |
| posts | id, user_id, texto, presupuesto_min, presupuesto_max, zona, tags[], estado, created_at | estado: `activa` / `resuelta` / `cerrada` |
| properties | id, owner_id, titulo, precio, zona, fotos[], descripcion, disponible, created_at | fotos = rutas en Storage |
| offers | id, post_id, property_id, owner_id, mensaje, estado, created_at | estado: `enviada` / `vista` / `aceptada` / `rechazada` |
| conversations | id, post_id, buscador_id, propietario_id, created_at | una por par buscador–propietario y solicitud |
| messages | id, conversation_id, sender_id, texto, created_at | fuente del canal Realtime |
| notifications | id, user_id, tipo, referencia_id, leido, created_at | tipo: `nueva_oferta` / `nuevo_mensaje` |
| push_subscriptions | id, user_id, endpoint, p256dh, auth, created_at | una por navegador/dispositivo |

Cambios de esquema solo mediante migraciones nuevas en `supabase/migrations/`; nunca se edita una migración aplicada.

## 8. Seguridad

### 8.1 Matriz RLS (obligatoria)

| Recurso | Lectura | Escritura |
|---|---|---|
| posts | autenticados | solo el autor |
| properties | autenticados | solo el owner |
| offers | owner que la envió + autor del post | owner, solo con propiedad propia y post activo |
| conversations / messages | solo los dos participantes | solo los participantes, como sí mismos |
| notifications / push_subscriptions | solo el dueño | solo el dueño (inserts de notifications vía trigger) |
| Storage | público en fotos de propiedades | cada usuario solo en su carpeta `<uid>/` |

RLS habilitado en todas las tablas, políticas por operación y `with check` en inserts/updates.

### 8.2 Claves y web

- En el navegador solo vive la anon/publishable key. La service role key y la clave privada VAPID existen únicamente como secrets de Edge Functions.
- Variables locales en `.env.local` (ignorado por git). Nunca se versionan `.env` con secretos.
- CSP y cabeceras de seguridad configuradas en el hosting.
- URLs de redirección OAuth restringidas a producción y previews.
- Contenido de usuario se renderiza como texto, nunca como HTML.

## 9. Metodología (SDD)

Cada fase se trabaja como una o más features en `specs/NNN-<slug>/` con:

- `spec.md` — qué y por qué; requisitos, criterios de aceptación, decisiones y riesgos.
- `plan.md` — cómo; diseño técnico, datos, componentes, riesgos.
- `tasks.md` — tareas concretas y verificables.

**Checkpoint humano:** la spec se aprueba (`Estado: Aprobada`) antes de generar plan o código.

### 9.1 Agentes

Claude Code es el agente principal, con `CLAUDE.md` como contexto persistente. Subagentes en `.claude/agents/`:

| Subagente | Responsabilidad |
|---|---|
| spec-writer | Redacta specs |
| planner | Spec aprobada → plan + tareas |
| schema-rls | Migraciones, RLS, Storage, Edge Functions |
| ui-screens | Vistas y componentes React + Tailwind |
| security-reviewer | Revisión de RLS, claves, CSP, auth |
| qa-reviewer | Revisión de código, pruebas y criterios de aceptación |

Patrones repetidos como skills en `.claude/skills/`: `sdd-feature`, `supabase-rls-policy`, `tanstack-crud`, `realtime-subscription`, `push-notification`, `responsive-view`.

## 10. Fases

| # | Fase | Entregable |
|---|---|---|
| 1 | Setup base | React + Vite, Supabase configurado, auth funcional, deploy inicial |
| 2 | Modelo de datos + RLS | Tablas y políticas por usuario |
| 3 | Feed + publicar solicitud | CRUD de posts y listado con filtros |
| 4 | Ofertas | Propiedades y envío de oferta a un post |
| 5 | Chat en tiempo real | Conversaciones vía Realtime |
| 6 | Notificaciones | In-app + Web Push |
| 7 | Perfil, PWA y pulido | Perfil, manifest, responsive, estados vacíos, errores, QA |
| 8 | Beta cerrada | Pruebas con usuarios reales en Limón |

Las fases son secuenciales; cada una se revisa en un preview antes de pasar a producción.

## 11. Riesgos y decisiones pendientes

Cada uno debe resolverse (o declararse "no se resuelve en el MVP") en la spec de la fase que afecta.

| Riesgo | Pregunta | Opciones mínimas | Fase sugerida |
|---|---|---|---|
| Moderación | ¿Cómo evitar publicaciones falsas o spam? | Reportar, límite de posts por usuario, captcha en registro, revisión manual en beta | 1 y 3 |
| Confianza | Sin verificación de identidad, ¿qué genera confianza? | Verificación de email/teléfono, antigüedad de cuenta visible, fotos obligatorias | 1 y 4 |
| Retención | ¿Qué pasa con posts y ofertas al resolverse? | Cierre manual, expiración automática, archivo en perfil | 3 y 7 |
| Adopción | ¿Cómo lograr masa crítica de ambos lados? | Beta enfocada en una zona y estudiantes; enlaces compartibles por WhatsApp | 8 |
| Push en iOS | Web Push solo con PWA instalada | Guiar la instalación; email como respaldo | 6 y 7 |

Decisiones de stack pendientes: hosting (Vercel vs. alternativas) — se confirma en la spec de la fase 1.

## 12. Evolución futura (fuera del MVP)

App nativa (p. ej. React Native + Expo) si la PWA no basta; fase 2 con mapa, reseñas, verificación, pagos y contratos; panel de administración. Todas reutilizan el mismo backend de Supabase y tendrán su propio documento.
