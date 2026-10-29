# CasaLimón — contexto para Claude Code

Plataforma web (SPA React + Supabase, PWA) de alquiler de vivienda en la provincia de Limón, Costa Rica. Modelo de **feed de solicitudes**: el buscador publica lo que necesita, los propietarios responden con ofertas y ambos conversan por chat en tiempo real.

**Fuente de verdad:** [specs/000-project-constitution.md](specs/000-project-constitution.md) — principios, alcance del MVP, stack, modelo de datos, matriz RLS, fases y riesgos. Léela antes de cualquier tarea no trivial.

## Comandos

```bash
pnpm dev                 # servidor de desarrollo (Vite)
pnpm build               # tsc -b && vite build
pnpm lint                # ESLint
pnpm vitest run          # pruebas
pnpm supabase start      # Supabase local
pnpm supabase db reset   # reaplica migraciones + seed
pnpm supabase migration new <slug>
pnpm supabase gen types typescript --local > src/lib/database.types.ts
```

## Flujo de trabajo (SDD)

1. Toda feature vive en `specs/NNN-<slug>/` con `spec.md`, `plan.md`, `tasks.md` (skill `sdd-feature`).
2. **No generes plan ni código si la spec no tiene `Estado: Aprobada`.** Si el usuario pide implementar algo sin spec aprobada, avísale y ofrece redactarla.
3. Delegación a subagentes (`.claude/agents/`):
   - `spec-writer` → redacta specs · `planner` → plan y tareas
   - `schema-rls` → todo lo de `supabase/` · `ui-screens` → vistas y componentes en `src/`
   - `security-reviewer` → antes de cerrar fases que toquen datos/auth/deploy · `qa-reviewer` → al cerrar tareas y fases
4. Marca tareas `[x]` en `tasks.md` solo después de verificar (lint, build, tests, revisión).

## Reglas clave

- **Seguridad en RLS**: toda tabla con RLS habilitado según la matriz de la constitución (skill `supabase-rls-policy`). El frontend no es una barrera de seguridad.
- **Secretos**: en el navegador solo `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_VAPID_PUBLIC_KEY`, en `.env.local`. La service role key y la clave privada VAPID solo como secrets de Edge Functions.
- **Datos**: los componentes nunca llaman a `supabase` directo; usan hooks de `src/features/<dominio>/` con TanStack Query (skill `tanstack-crud`). Zustand solo para estado de UI.
- **Realtime**: escribe en la caché de TanStack Query y limpia los canales (skill `realtime-subscription`).
- **Notificaciones**: trigger → `notifications` → Edge Function `send-push` (skill `push-notification`).
- **UI**: mobile-first, pestañas inferiores en celular y barra lateral en escritorio, tokens de color de Limón, estados de carga/vacío/error (skill `responsive-view`).
- **Esquema**: solo vía migraciones nuevas; nunca edites una migración aplicada. Regenera tipos tras cada cambio.
- **Idioma**: columnas y valores de dominio en español (`presupuesto_min`, `estado = 'activa'`); textos de interfaz en español de Costa Rica.
- **Alcance**: pagos, mapa, reseñas, verificación de identidad, contratos, app nativa y panel de admin están fuera del MVP. No los implementes sin una spec que los incluya.
- No agregues dependencias de runtime sin justificarlas en el `plan.md`.

## Estado actual

- Plantilla de Vite + React + TS recién creada; dependencias del stack ya instaladas (`@supabase/supabase-js`, `@tanstack/react-query`, `react-router`, `zustand`, `tailwindcss`, `vite-plugin-pwa`, `vitest`, CLI `supabase`).
- Aún no configurados: plugin de Tailwind y PWA en `vite.config.ts`, alias `@/` → `src/`, carpeta `supabase/`, cliente en `src/lib/`.
- Siguiente paso: spec de la **fase 1 — Setup base** (`specs/001-setup-base/`), incluyendo la decisión de hosting y las decisiones de moderación/confianza que afectan al registro.
