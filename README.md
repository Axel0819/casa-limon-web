# CasaLimón

Plataforma web (SPA React + Supabase) de alquiler de vivienda en la provincia de Limón, Costa Rica. Funciona con un **feed de solicitudes**: quien busca casa publica lo que necesita, los propietarios responden con ofertas y ambos conversan por chat.

- Fuente de verdad del proyecto: [`specs/000-project-constitution.md`](specs/000-project-constitution.md)
- Especificaciones por fase (spec, plan y tareas): [`specs/`](specs/)
- Contexto y reglas para trabajar con Claude Code: [`CLAUDE.md`](CLAUDE.md)

Stack: React 19 + TypeScript + Vite, React Router, TanStack Query, Zustand, Tailwind CSS v4 y Supabase (Auth, Postgres con RLS). Pruebas con Vitest + Testing Library.

## Requisitos

| Herramienta                                                       | Versión                                              | Para qué                                 |
| ----------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| [Node.js](https://nodejs.org/)                                    | 22.12 o superior                                     | Ejecutar Vite, las pruebas y la CLI      |
| [pnpm](https://pnpm.io/installation)                              | 12 (el repo fija `pnpm@12.15.0` en `packageManager`) | Gestor de paquetes                       |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Abierto y corriendo                                  | Supabase local (Postgres, Auth, Mailpit) |

La CLI de Supabase ya viene como dependencia de desarrollo: se usa con `pnpm supabase …`, no hace falta instalarla aparte.

## Puesta en marcha local

Seguí los pasos en orden desde la carpeta del proyecto.

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Levantar Supabase local

Con Docker Desktop abierto:

```bash
pnpm supabase start
```

La primera vez descarga las imágenes de Docker y tarda varios minutos. Al terminar, la base local queda con la migración y el seed aplicados.

Si la base ya existía y querés dejarla como recién creada (migraciones + seed):

```bash
pnpm supabase db reset
```

### 3. Crear `.env.local`

Copiá la plantilla:

```bash
# Git Bash, macOS o Linux
cp .env.example .env.local
```

```powershell
# PowerShell
Copy-Item .env.example .env.local
```

Mostrá los valores de tu Supabase local:

```bash
pnpm supabase status -o env
```

Completá `.env.local` con estos dos valores (copiá solo lo que está entre comillas):

| Variable en `.env.local` | Valor de `supabase status`                       |
| ------------------------ | ------------------------------------------------ |
| `VITE_SUPABASE_URL`      | `API_URL` (normalmente `http://127.0.0.1:54321`) |
| `VITE_SUPABASE_ANON_KEY` | `ANON_KEY`                                       |

`VITE_VAPID_PUBLIC_KEY` queda vacía hasta la fase de notificaciones.

> **Nunca** pongás en `.env.local` ni en ningún archivo del navegador la `SERVICE_ROLE_KEY`, la `SECRET_KEY` ni el `JWT_SECRET`: saltan la seguridad de RLS. `.env.local` está ignorado por git.

### 4. Arrancar la app

```bash
pnpm dev
```

Abrí <http://localhost:5173>. Tiene que ser `localhost:5173`, porque es la URL que el Auth local acepta para los enlaces de los correos.

### 5. Probar

- **Ingresar con un usuario de prueba:** `ana@casalimon.test` con la contraseña `CasaLimon-local-2026` entra directo al Feed (ver la sección siguiente).
- **Registrarte:** en `/registro` usá cualquier correo (por ejemplo `vos@casalimon.test`), una contraseña de 8 o más caracteres y marcá la casilla. El correo de confirmación llega a **Mailpit** (<http://127.0.0.1:54324>). Abrí el enlace del correo **en el mismo navegador**: quedás con sesión y pasás al onboarding para elegir tu rol.
- **Recuperar contraseña:** en `/recuperar`, y el enlace también llega a Mailpit.

## Usuarios de prueba (seed)

| Correo                | Contraseña             | Estado                                |
| --------------------- | ---------------------- | ------------------------------------- |
| `ana@casalimon.test`  | `CasaLimon-local-2026` | Rol `buscador`: entra directo al Feed |
| `beto@casalimon.test` | `CasaLimon-local-2026` | Sin rol: cae en el onboarding         |

Estos usuarios **solo existen en tu Supabase local**. Los crea `supabase/seed.sql`, que se aplica con `pnpm supabase start` (la primera vez) y con `pnpm supabase db reset`.

> El seed **nunca** se ejecuta contra el proyecto remoto: no uses `pnpm supabase db push --include-seed`. Si cambiás a los usuarios de prueba (por ejemplo, beto ya eligió rol), `pnpm supabase db reset` los deja como al principio.

## Mailpit (correos locales)

En local no se envía correo real: todos los correos de Auth (confirmación, recuperación, cambio de correo) quedan en Mailpit, en <http://127.0.0.1:54324>. Los correos están en español y usan las plantillas de `supabase/templates/`.

## Ingreso con Google en local

El proveedor Google está habilitado en `supabase/config.toml`, pero lee sus credenciales de variables de entorno. Sin ellas, "Continuar con Google" te lleva a una página de error de Google (cliente OAuth inválido): es lo esperado en local.

Para probarlo en local, creá `supabase/.env` (está ignorado por git) con las credenciales del cliente OAuth de Google Cloud (tarea T33 de la fase 1) y reiniciá Supabase (`pnpm supabase stop` y `pnpm supabase start`):

```bash
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=...
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
```

En el cliente OAuth de Google tiene que estar autorizada la URI de redirección `http://127.0.0.1:54321/auth/v1/callback`.

## Comandos

| Comando                              | Qué hace                                                      |
| ------------------------------------ | ------------------------------------------------------------- |
| `pnpm dev`                           | Servidor de desarrollo de Vite en <http://localhost:5173>     |
| `pnpm build`                         | Revisión de tipos (`tsc -b`) y build de producción en `dist/` |
| `pnpm preview`                       | Sirve el build de `dist/` para revisarlo                      |
| `pnpm test`                          | Pruebas con Vitest (una sola corrida)                         |
| `pnpm test:watch`                    | Pruebas en modo observación                                   |
| `pnpm lint`                          | ESLint                                                        |
| `pnpm format`                        | Formatea con Prettier                                         |
| `pnpm format:check`                  | Revisa el formato sin cambiar archivos (lo usa CI)            |
| `pnpm supabase start`                | Levanta Supabase local (necesita Docker)                      |
| `pnpm supabase status -o env`        | Muestra URLs y claves locales                                 |
| `pnpm supabase stop`                 | Detiene Supabase local (los datos se conservan)               |
| `pnpm supabase db reset`             | Reaplica las migraciones y el seed en la base local           |
| `pnpm supabase test db`              | Pruebas pgTAP de la base (RLS y triggers)                     |
| `pnpm supabase migration new <slug>` | Crea una migración nueva en `supabase/migrations/`            |
| `pnpm db:types`                      | Regenera `src/lib/database.types.ts` desde la base local      |

Después de cambiar el esquema, corré `pnpm supabase db reset` y luego `pnpm db:types`. Nunca edités una migración que ya se aplicó: creá una nueva.

## Integración continua

Cada pull request y cada push a `main` corren en GitHub Actions (`.github/workflows/ci.yml`) tres jobs: `lint` (ESLint + `format:check`), `build` y `test`.

## Proyecto gratuito de Supabase pausado

El proyecto remoto está en el plan gratuito de Supabase, que **pausa los proyectos después de unos días sin actividad**. Si el preview o producción no pueden ingresar ni cargar datos (errores de red o "No hay conexión"), entrá al [dashboard de Supabase](https://supabase.com/dashboard), abrí el proyecto y pulsá **Restore project**. Tarda unos minutos en volver. Esto no afecta al Supabase local.

## Estructura

```
src/
  components/   UI reutilizable sin lógica de dominio
  features/     acceso a datos por dominio (auth, profile) con TanStack Query
  lib/          cliente de Supabase, QueryClient, listener de auth, utilidades
  routes/       vistas por ruta, guardas (loaders) y layouts
  stores/       estado de UI y sesión (Zustand)
  test/         helpers de pruebas
supabase/       config local, migraciones, seed, plantillas de correo y pruebas pgTAP
specs/          constitución y specs por fase (flujo SDD)
```
