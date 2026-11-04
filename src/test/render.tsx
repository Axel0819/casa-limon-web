import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { profileKeys } from '@/features/profile/queries'
import type { Profile } from '@/features/profile/types'
import { queryClient } from '@/lib/query-client'
import { routes } from '@/router'
import { useSessionStore } from '@/stores/session'

/**
 * Helpers para probar rutas con el árbol real (`createMemoryRouter`) y el
 * QueryClient de la app. Las pruebas deben mockear `@/lib/supabase`:
 *
 *   vi.mock('@/lib/supabase', async () => {
 *     const { supabaseMock } = await import('@/test/supabase-mock')
 *     return { supabase: supabaseMock.client }
 *   })
 */

export const ANA_ID = 'a0000000-0000-4000-8000-00000000a0a0'

export function crearSesion(
  userId: string = ANA_ID,
  email = 'ana@casalimon.test',
): Session {
  return {
    access_token: `token-${userId}`,
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      email,
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-11-01T10:00:00Z',
    },
  }
}

export function crearPerfil(cambios: Partial<Profile> = {}): Profile {
  return {
    id: ANA_ID,
    nombre: 'Ana Prueba',
    avatar: null,
    rol: 'buscador',
    terminos_aceptados_at: '2026-11-01T10:00:00Z',
    created_at: '2026-11-01T10:00:00Z',
    ...cambios,
  }
}

export interface RenderAppOptions {
  /** `null` = sin sesión (por defecto); `'cargando'` = aún sin INITIAL_SESSION. */
  session?: Session | null | 'cargando'
  /** Perfil precargado en la caché para el usuario de la sesión. */
  perfil?: Profile | null
}

export function renderApp(ruta: string, opciones: RenderAppOptions = {}) {
  const { session = null, perfil = null } = opciones
  queryClient.clear()
  queryClient.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: 0 },
  })
  if (session === 'cargando') {
    useSessionStore.setState({ status: 'cargando', session: null })
  } else {
    useSessionStore.getState().setSession(session)
  }
  if (session && session !== 'cargando' && perfil) {
    queryClient.setQueryData(profileKeys.detail(session.user.id), perfil)
  }

  const router = createMemoryRouter(routes, { initialEntries: [ruta] })
  const user = userEvent.setup()
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )

  /** Ruta actual (pathname + search). */
  const ubicacion = () =>
    `${router.state.location.pathname}${router.state.location.search}`

  return { router, user, ubicacion, ...utils }
}

/** Espera a que aparezca un encabezado de nivel 1 con ese texto. */
export function findTitulo(nombre: string | RegExp) {
  return screen.findByRole('heading', { level: 1, name: nombre })
}
