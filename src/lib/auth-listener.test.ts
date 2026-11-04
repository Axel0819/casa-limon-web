import type { Session } from '@supabase/supabase-js'
import { QueryClient } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/stores/session'
import { supabaseMock } from '@/test/supabase-mock'
import { initAuthListener, sessionReady } from './auth-listener'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

function sesion(userId: string): Session {
  return {
    access_token: `token-${userId}`,
    refresh_token: 'refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-11-03T00:00:00Z',
    },
  }
}

describe('initAuthListener', () => {
  let queryClient: QueryClient
  let router: { revalidate: ReturnType<typeof vi.fn<() => Promise<void>>> }
  let cancelar: () => void

  beforeEach(() => {
    supabaseMock.reset()
    useSessionStore.setState({ status: 'cargando', session: null })
    queryClient = new QueryClient()
    router = { revalidate: vi.fn(() => Promise.resolve()) }
    cancelar = initAuthListener(router, queryClient)
  })

  afterEach(() => {
    cancelar()
    vi.useRealTimers()
  })

  it('registra un único listener aunque se inicialice dos veces', () => {
    cancelar = initAuthListener(router, queryClient)
    expect(supabaseMock.auth.listeners).toHaveLength(1)
  })

  it('INITIAL_SESSION con sesión resuelve sessionReady con la sesión', async () => {
    const pendiente = sessionReady()
    expect(useSessionStore.getState().status).toBe('cargando')

    supabaseMock.emitAuth('INITIAL_SESSION', sesion('ana'))

    await expect(pendiente).resolves.toMatchObject({ user: { id: 'ana' } })
    expect(useSessionStore.getState().status).toBe('con-sesion')
  })

  it('INITIAL_SESSION sin sesión resuelve sessionReady con null', async () => {
    const pendiente = sessionReady()
    supabaseMock.emitAuth('INITIAL_SESSION', null)

    await expect(pendiente).resolves.toBeNull()
    expect(useSessionStore.getState().status).toBe('sin-sesion')
  })

  it('sessionReady resuelve de inmediato si la sesión ya se conoce', async () => {
    supabaseMock.emitAuth('INITIAL_SESSION', null)
    await expect(sessionReady()).resolves.toBeNull()
  })

  it('SIGNED_OUT deja el store en sin-sesion, vacía la caché y revalida el router', () => {
    vi.useFakeTimers()
    supabaseMock.emitAuth('INITIAL_SESSION', sesion('ana'))
    queryClient.setQueryData(['profile', 'detail', 'ana'], { nombre: 'Ana' })

    supabaseMock.emitAuth('SIGNED_OUT', null)

    expect(useSessionStore.getState()).toMatchObject({
      status: 'sin-sesion',
      session: null,
    })
    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    // La revalidación se difiere fuera del callback (R-7).
    expect(router.revalidate).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(router.revalidate).toHaveBeenCalledTimes(1)
  })

  it('el callback es síncrono y no llama a supabase', () => {
    const callback = supabaseMock.auth.listeners[0]
    expect(callback).toBeDefined()
    const resultado: unknown = callback?.('SIGNED_IN', sesion('ana'))

    expect(resultado).toBeUndefined()
    expect(supabaseMock.client.from).not.toHaveBeenCalled()
    expect(supabaseMock.auth.getSession).not.toHaveBeenCalled()
  })

  it('TOKEN_REFRESHED del mismo usuario conserva la caché', () => {
    supabaseMock.emitAuth('INITIAL_SESSION', sesion('ana'))
    queryClient.setQueryData(['profile', 'detail', 'ana'], { nombre: 'Ana' })

    supabaseMock.emitAuth('TOKEN_REFRESHED', sesion('ana'))

    expect(queryClient.getQueryData(['profile', 'detail', 'ana'])).toEqual({
      nombre: 'Ana',
    })
    expect(useSessionStore.getState().session?.access_token).toBe('token-ana')
  })

  it('SIGNED_IN de otro usuario vacía la caché del anterior', () => {
    supabaseMock.emitAuth('INITIAL_SESSION', sesion('ana'))
    queryClient.setQueryData(['profile', 'detail', 'ana'], { nombre: 'Ana' })

    supabaseMock.emitAuth('SIGNED_IN', sesion('beto'))

    expect(queryClient.getQueryCache().getAll()).toHaveLength(0)
    expect(useSessionStore.getState().session?.user.id).toBe('beto')
  })

  it('cancelar deja de escuchar eventos', () => {
    cancelar()
    supabaseMock.emitAuth('INITIAL_SESSION', sesion('ana'))
    expect(useSessionStore.getState().status).toBe('cargando')
  })
})
