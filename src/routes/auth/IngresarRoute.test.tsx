import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/stores/session'
import { crearPerfil, crearSesion, findTitulo, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'
import { queryClient } from '@/lib/query-client'
import { profileKeys } from '@/features/profile/queries'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

const sinDatos = { data: { user: null, session: null } }

async function abrir(ruta = '/ingresar') {
  const utils = renderApp(ruta)
  await findTitulo('Ingresá a CasaLimón')
  return utils
}

async function ingresar(
  user: ReturnType<typeof renderApp>['user'],
  email = 'ana@casalimon.test',
  password = 'CasaLimon-local-2026',
) {
  await user.type(screen.getByLabelText('Correo electrónico'), email)
  await user.type(screen.getByLabelText('Contraseña'), password)
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

function fallarCon(error: Error) {
  supabaseMock.auth.signInWithPassword.mockResolvedValue({ ...sinDatos, error })
}

beforeEach(() => {
  supabaseMock.reset()
  sessionStorage.clear()
})

describe('/ingresar', () => {
  it('campos vacíos: errores junto a cada campo y foco al correo', async () => {
    const { user } = await abrir()
    await user.click(screen.getByRole('button', { name: 'Ingresar' }))
    expect(supabaseMock.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      screen.getByLabelText('Correo electrónico'),
    )
    expect(screen.getByText('Escribí tu contraseña.')).toBeTruthy()
  })

  it.each([
    ['contraseña incorrecta', 'ana@casalimon.test'],
    ['correo inexistente', 'nadie@casalimon.test'],
  ])(
    '%s → "Correo o contraseña incorrectos" y el correo se conserva (CA-07)',
    async (_caso, email) => {
      fallarCon(
        new AuthApiError(
          'Invalid login credentials',
          400,
          'invalid_credentials',
        ),
      )
      const { user, ubicacion } = await abrir()
      await ingresar(user, email, 'incorrecta')

      expect((await screen.findByRole('alert')).textContent).toContain(
        'Correo o contraseña incorrectos.',
      )
      expect(screen.getByLabelText('Correo electrónico')).toHaveProperty(
        'value',
        email,
      )
      expect(ubicacion()).toBe('/ingresar')
    },
  )

  it('correo sin confirmar → mensaje y botón para reenviar (CA-02)', async () => {
    fallarCon(
      new AuthApiError('Email not confirmed', 400, 'email_not_confirmed'),
    )
    supabaseMock.auth.resend.mockResolvedValue({ data: {}, error: null })
    const { user } = await abrir()
    await ingresar(user, 'carla@example.com', '12345678')

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Tenés que confirmar tu correo',
    )
    await user.click(screen.getByRole('button', { name: 'Reenviar enlace' }))
    await waitFor(() =>
      expect(supabaseMock.auth.resend).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'signup', email: 'carla@example.com' }),
      ),
    )
  })

  it('límite de intentos → "Demasiados intentos" (CA-08)', async () => {
    fallarCon(new AuthApiError('Too many', 429, 'over_request_rate_limit'))
    const { user } = await abrir()
    await ingresar(user)
    expect((await screen.findByRole('alert')).textContent).toContain(
      'Demasiados intentos, probá en unos minutos.',
    )
  })

  it('sin red → mensaje y botón habilitado de nuevo (CA-12)', async () => {
    fallarCon(new AuthRetryableFetchError('Failed to fetch', 0))
    const { user } = await abrir()
    await ingresar(user)
    expect((await screen.findByRole('alert')).textContent).toContain(
      'No hay conexión. Revisá tu internet e intentá de nuevo.',
    )
    expect(screen.getByRole('button', { name: 'Ingresar' })).toHaveProperty(
      'disabled',
      false,
    )
  })

  it('éxito con volver=/chat → /chat (CA-06, CA-28)', async () => {
    const sesion = crearSesion()
    supabaseMock.auth.signInWithPassword.mockImplementation(() => {
      // Lo que hace el listener al recibir SIGNED_IN.
      useSessionStore.getState().setSession(sesion)
      queryClient.setQueryData(
        profileKeys.detail(sesion.user.id),
        crearPerfil(),
      )
      return Promise.resolve({
        data: { user: sesion.user, session: sesion },
        error: null,
      })
    })
    const { user, ubicacion } = await abrir('/ingresar?volver=%2Fchat')
    await ingresar(user)

    expect(await findTitulo('Chat')).toBeTruthy()
    expect(ubicacion()).toBe('/chat')
  })

  it('ignora un volver externo y va al Feed', async () => {
    const sesion = crearSesion()
    supabaseMock.auth.signInWithPassword.mockImplementation(() => {
      useSessionStore.getState().setSession(sesion)
      queryClient.setQueryData(
        profileKeys.detail(sesion.user.id),
        crearPerfil(),
      )
      return Promise.resolve({
        data: { user: sesion.user, session: sesion },
        error: null,
      })
    })
    const { user, ubicacion } = await abrir('/ingresar?volver=%2F%2Fevil.com')
    await ingresar(user)
    await waitFor(() => expect(ubicacion()).toBe('/'))
  })

  it('usuario sin rol tras ingresar → onboarding', async () => {
    const sesion = crearSesion()
    supabaseMock.auth.signInWithPassword.mockImplementation(() => {
      useSessionStore.getState().setSession(sesion)
      queryClient.setQueryData(
        profileKeys.detail(sesion.user.id),
        crearPerfil({ rol: null }),
      )
      return Promise.resolve({
        data: { user: sesion.user, session: sesion },
        error: null,
      })
    })
    const { user, ubicacion } = await abrir()
    await ingresar(user)
    await waitFor(() => expect(ubicacion()).toBe('/bienvenida'))
  })

  it('Google guarda volver en sessionStorage y usa /auth/callback', async () => {
    supabaseMock.auth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com' },
      error: null,
    })
    const { user } = await abrir('/ingresar?volver=%2Fperfil')
    await user.click(
      screen.getByRole('button', { name: 'Continuar con Google' }),
    )

    await waitFor(() =>
      expect(supabaseMock.auth.signInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      }),
    )
    expect(sessionStorage.getItem('casalimon:volver-oauth')).toBe('/perfil')
  })

  it('aviso de OAuth cancelado (CA-10)', async () => {
    await abrir('/ingresar?aviso=oauth-cancelado')
    expect(screen.getByRole('alert').textContent).toContain(
      'No se completó el ingreso con Google.',
    )
  })
})
