import { act, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { initAuthListener } from '@/lib/auth-listener'
import { queryClient } from '@/lib/query-client'
import { useSessionStore } from '@/stores/session'
import { crearPerfil, crearSesion, findTitulo, renderApp } from '@/test/render'
import { postgrestError, supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

const conSesion = () => ({ session: crearSesion(), perfil: crearPerfil() })

beforeEach(() => {
  supabaseMock.reset()
})

afterEach(() => {
  useSessionStore.setState({ status: 'cargando', session: null })
})

describe('guardas de rutas', () => {
  it('sin sesión, /chat → /ingresar?volver=/chat (CA-28)', async () => {
    const { ubicacion } = renderApp('/chat')
    await waitFor(() => expect(ubicacion()).toBe('/ingresar?volver=%2Fchat'))
    const params = new URLSearchParams(ubicacion().split('?')[1])
    expect(params.get('volver')).toBe('/chat')
  })

  it('sin sesión, / → /ingresar sin volver', async () => {
    const { ubicacion } = renderApp('/')
    await waitFor(() => expect(ubicacion()).toBe('/ingresar'))
  })

  it.each([
    ['sin rol (CA-18)', { rol: null }],
    ['sin términos (CA-43)', { terminos_aceptados_at: null }],
    ['sin nombre (RF-11)', { nombre: null }],
  ])('%s → /bienvenida', async (_caso, cambios) => {
    const { ubicacion } = renderApp('/perfil', {
      session: crearSesion(),
      perfil: crearPerfil(cambios),
    })
    await waitFor(() => expect(ubicacion()).toBe('/bienvenida'))
  })

  it.each(['/', '/publicar', '/chat', '/perfil'])(
    'sin rol, %s → /bienvenida (CA-18)',
    async (ruta) => {
      const { ubicacion } = renderApp(ruta, {
        session: crearSesion(),
        perfil: crearPerfil({ rol: null }),
      })
      await waitFor(() => expect(ubicacion()).toBe('/bienvenida'))
    },
  )

  it('perfil completo en /bienvenida → / (RF-12)', async () => {
    const { ubicacion } = renderApp('/bienvenida', conSesion())
    await waitFor(() => expect(ubicacion()).toBe('/'))
  })

  it.each(['/ingresar', '/registro', '/recuperar'])(
    'con sesión, %s → / (CA-29)',
    async (ruta) => {
      const { ubicacion } = renderApp(ruta, conSesion())
      await waitFor(() => expect(ubicacion()).toBe('/'))
      expect(await findTitulo('Feed de solicitudes')).toBeTruthy()
    },
  )

  it.each(['/terminos', '/privacidad'])(
    '%s se muestra con y sin sesión (CA-44)',
    async (ruta) => {
      const sin = renderApp(ruta)
      await waitFor(() => expect(sin.ubicacion()).toBe(ruta))
      sin.unmount()
      const con = renderApp(ruta, conSesion())
      await waitFor(() => expect(con.ubicacion()).toBe(ruta))
    },
  )

  it('ruta inexistente → 404 con enlace al inicio (CA-33)', async () => {
    renderApp('/no-existe')
    expect(await findTitulo('No encontramos esta página')).toBeTruthy()
    expect(
      screen.getByRole('link', { name: 'Ir al inicio' }).getAttribute('href'),
    ).toBe('/')
  })

  it('tras cerrar sesión, /perfil lleva a /ingresar (CA-17)', async () => {
    const { router, ubicacion } = renderApp('/perfil', conSesion())
    await waitFor(() => expect(ubicacion()).toBe('/perfil'))
    const cancelar = initAuthListener(router, queryClient)

    act(() => {
      supabaseMock.emitAuth('SIGNED_OUT', null)
    })

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/ingresar'),
    )
    // Ningún dato del usuario anterior queda en caché (la vista que se desmonta
    // puede dejar una consulta vacía y deshabilitada, sin datos).
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.data !== undefined),
    ).toHaveLength(0)

    // Volver a abrir /perfil sigue llevando al ingreso.
    await act(() => router.navigate('/perfil'))
    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/ingresar'),
    )
    cancelar()
  })

  it('mientras se resuelve la sesión muestra la carga y nunca el login (CA-16)', async () => {
    const { router, ubicacion } = renderApp('/ingresar', {
      session: 'cargando',
    })
    expect(screen.getByRole('status').textContent).toContain('Cargando')

    act(() => {
      queryClient.setQueryData(
        ['profile', 'detail', crearSesion().user.id],
        crearPerfil(),
      )
      useSessionStore.getState().setSession(crearSesion())
    })

    await waitFor(() => expect(ubicacion()).toBe('/'))
    expect(screen.queryByRole('heading', { name: /Ingres/ })).toBeNull()
    expect(router.state.location.pathname).toBe('/')
  })

  it('carga el perfil desde Supabase si no está en caché', async () => {
    supabaseMock.queueResult({ data: crearPerfil() })
    const { ubicacion } = renderApp('/chat', { session: crearSesion() })
    await waitFor(() => expect(ubicacion()).toBe('/chat'))
    expect(await findTitulo('Chat')).toBeTruthy()
  })

  it('si falla la lectura del perfil muestra error con reintentar (RF-20)', async () => {
    supabaseMock.queueResult({ error: postgrestError('XX000'), status: 500 })
    const { user } = renderApp('/', { session: crearSesion() })
    expect(await findTitulo('No pudimos cargar tu perfil')).toBeTruthy()

    supabaseMock.queueResult({ data: crearPerfil() })
    await user.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(await findTitulo('Feed de solicitudes')).toBeTruthy()
  })

  it('un token_hash que llega a / se reenvía a /auth/confirmar (R-2)', async () => {
    supabaseMock.auth.verifyOtp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })
    renderApp('/?token_hash=abc&type=email')
    await waitFor(() =>
      expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledWith({
        token_hash: 'abc',
        type: 'email',
      }),
    )
  })
})
