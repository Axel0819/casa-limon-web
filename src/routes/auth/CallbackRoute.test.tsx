import { AuthApiError } from '@supabase/supabase-js'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { profileKeys } from '@/features/profile/queries'
import { queryClient } from '@/lib/query-client'
import { useSessionStore } from '@/stores/session'
import { crearPerfil, crearSesion, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

function intercambioExitoso(perfil = crearPerfil()) {
  const sesion = crearSesion()
  supabaseMock.auth.exchangeCodeForSession.mockImplementation(() => {
    useSessionStore.getState().setSession(sesion)
    queryClient.setQueryData(profileKeys.detail(sesion.user.id), perfil)
    return Promise.resolve({
      data: { user: sesion.user, session: sesion },
      error: null,
    })
  })
}

beforeEach(() => {
  supabaseMock.reset()
  sessionStorage.clear()
})

describe('/auth/callback', () => {
  it('?code → intercambia el código y vuelve a la ruta guardada (CA-09)', async () => {
    intercambioExitoso()
    sessionStorage.setItem('casalimon:volver-oauth', '/chat')
    const { ubicacion } = renderApp('/auth/callback?code=abc')

    await waitFor(() => expect(ubicacion()).toBe('/chat'))
    expect(supabaseMock.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(sessionStorage.getItem('casalimon:volver-oauth')).toBeNull()
  })

  it('primer ingreso con Google (sin rol ni términos) → onboarding (CA-09)', async () => {
    intercambioExitoso(crearPerfil({ rol: null, terminos_aceptados_at: null }))
    const { ubicacion } = renderApp('/auth/callback?code=abc')
    await waitFor(() => expect(ubicacion()).toBe('/bienvenida'))
  })

  it('?error=access_denied → /ingresar con aviso y sin intercambio (CA-10)', async () => {
    const { ubicacion } = renderApp(
      '/auth/callback?error=access_denied&error_description=The+user+denied',
    )
    await waitFor(() =>
      expect(ubicacion()).toBe('/ingresar?aviso=oauth-cancelado'),
    )
    expect((await screen.findByRole('alert')).textContent).toContain(
      'No se completó el ingreso con Google.',
    )
    expect(screen.queryByText(/denied/)).toBeNull()
    expect(supabaseMock.auth.exchangeCodeForSession).not.toHaveBeenCalled()
    expect(useSessionStore.getState().session).toBeNull()
  })

  it('si el intercambio falla → /ingresar con aviso', async () => {
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError('bad', 400, 'flow_state_not_found'),
    })
    const { ubicacion } = renderApp('/auth/callback?code=vencido')
    await waitFor(() =>
      expect(ubicacion()).toBe('/ingresar?aviso=oauth-cancelado'),
    )
  })
})
