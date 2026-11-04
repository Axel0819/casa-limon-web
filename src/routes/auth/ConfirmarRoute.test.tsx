import { AuthApiError } from '@supabase/supabase-js'
import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { profileKeys } from '@/features/profile/queries'
import { queryClient } from '@/lib/query-client'
import { useSessionStore } from '@/stores/session'
import { crearPerfil, crearSesion, findTitulo, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

function verificacionExitosa(perfil = crearPerfil({ rol: null })) {
  const sesion = crearSesion()
  supabaseMock.auth.verifyOtp.mockImplementation(() => {
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
})

afterEach(() => {
  window.history.replaceState(null, '', '/')
  vi.restoreAllMocks()
})

describe('/auth/confirmar', () => {
  it('type=email → sesión iniciada y onboarding (CA-03)', async () => {
    verificacionExitosa()
    const { ubicacion } = renderApp('/auth/confirmar?token_hash=abc&type=email')
    await waitFor(() => expect(ubicacion()).toBe('/bienvenida'))
    expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'abc',
      type: 'email',
    })
  })

  it('type=recovery → /restablecer (CA-14)', async () => {
    verificacionExitosa(crearPerfil())
    const { ubicacion } = renderApp(
      '/auth/confirmar?token_hash=abc&type=recovery',
    )
    await waitFor(() => expect(ubicacion()).toBe('/restablecer'))
  })

  it('otp_expired → "enlace inválido" sin token en la URL (CA-15)', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError('Token has expired', 403, 'otp_expired'),
    })
    const { ubicacion } = renderApp(
      '/auth/confirmar?token_hash=viejo&type=recovery',
    )
    expect(await findTitulo('Este enlace venció o ya se usó')).toBeTruthy()
    expect(ubicacion()).toBe('/auth/confirmar?tipo=recovery')
    expect(
      screen
        .getByRole('link', { name: 'Pedir otro enlace' })
        .getAttribute('href'),
    ).toBe('/recuperar')
    expect(screen.queryByText(/expired/)).toBeNull()
  })

  it('enlace de confirmación vencido ofrece ingresar para reenviar', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError('Token has expired', 403, 'otp_expired'),
    })
    renderApp('/auth/confirmar?token_hash=viejo&type=email')
    expect(await findTitulo('Este enlace venció o ya se usó')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Ingresar y reenviar la confirmación' }),
    ).toBeTruthy()
  })

  it('sin parámetros → enlace inválido sin llamar a Supabase', async () => {
    renderApp('/auth/confirmar')
    expect(await findTitulo('Este enlace venció o ya se usó')).toBeTruthy()
    expect(supabaseMock.auth.verifyOtp).not.toHaveBeenCalled()
  })

  it('borra token_hash de la barra de direcciones al verificar (Nota T14, B-3)', async () => {
    window.history.replaceState(
      { idx: 0 },
      '',
      '/auth/confirmar?token_hash=secreto&type=email',
    )
    const replace = vi.spyOn(window.history, 'replaceState')
    verificacionExitosa()
    renderApp('/auth/confirmar?token_hash=secreto&type=email')

    await waitFor(() => expect(replace).toHaveBeenCalled())
    expect(window.location.search).not.toContain('secreto')
    const ordenVerify =
      supabaseMock.auth.verifyOtp.mock.invocationCallOrder[0] ?? 0
    const ordenReplace = replace.mock.invocationCallOrder[0] ?? 0
    expect(ordenVerify).toBeGreaterThan(0)
    expect(ordenReplace).toBeGreaterThan(ordenVerify)
  })
})
