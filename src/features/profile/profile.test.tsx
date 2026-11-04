import type { Session } from '@supabase/supabase-js'
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryClient } from '@/lib/query-client'
import { useSessionStore } from '@/stores/session'
import { postgrestError, supabaseMock } from '@/test/supabase-mock'
import { buildOnboardingPatch, buildProfilePatch, fetchProfile } from './api'
import { mapProfileError, ProfileError } from './errors'
import { useCompleteOnboarding, useUpdateProfile } from './mutations'
import { profileKeys, useProfile } from './queries'
import { needsOnboarding, type Profile } from './types'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

const ANA = '00000000-0000-0000-0000-00000000000a'

const perfilAna: Profile = {
  id: ANA,
  nombre: 'Ana',
  avatar: null,
  rol: 'buscador',
  terminos_aceptados_at: '2026-11-01T10:00:00Z',
  created_at: '2026-11-01T10:00:00Z',
}

function iniciarSesion(userId: string) {
  useSessionStore.getState().setSession({
    access_token: 't',
    refresh_token: 'r',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: userId,
      aud: 'authenticated',
      app_metadata: {},
      user_metadata: {},
      created_at: '2026-11-01T10:00:00Z',
    },
  } satisfies Session)
}

function llamadas(metodo: string) {
  return supabaseMock.calls.filter((c) => c.method === metodo)
}

let queryClient: QueryClient

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

beforeEach(() => {
  supabaseMock.reset()
  queryClient = createQueryClient()
  // Sin reintentos para que los errores se vean de inmediato.
  queryClient.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: 0 },
  })
  iniciarSesion(ANA)
})

afterEach(() => {
  queryClient.clear()
  useSessionStore.getState().reset()
  vi.restoreAllMocks()
})

describe('needsOnboarding', () => {
  it('perfil completo no necesita onboarding', () => {
    expect(needsOnboarding(perfilAna)).toBe(false)
  })

  it.each([
    ['sin rol (CA-18)', { rol: null }],
    ['rol fuera de los tres valores', { rol: 'admin' }],
    ['sin nombre', { nombre: null }],
    ['sin términos (CA-43)', { terminos_aceptados_at: null }],
  ])('%s → onboarding', (_caso, cambio) => {
    expect(needsOnboarding({ ...perfilAna, ...cambio })).toBe(true)
  })

  it('sin perfil → onboarding', () => {
    expect(needsOnboarding(null)).toBe(true)
  })
})

describe('patches (Nota T14, B-5)', () => {
  it('Perfil nunca envía terminos_aceptados_at y normaliza el nombre', () => {
    expect(
      buildProfilePatch({ nombre: '  Ana   María ', rol: 'ambos' }),
    ).toEqual({ nombre: 'Ana María', rol: 'ambos' })
    expect(buildProfilePatch({ rol: 'propietario' })).toEqual({
      rol: 'propietario',
    })
  })

  it('onboarding sin términos previos los envía junto con rol y nombre', () => {
    const patch = buildOnboardingPatch(
      { rol: 'propietario', nombre: ' Beto ', aceptaTerminos: true },
      { nombre: null, terminos_aceptados_at: null },
    )
    expect(patch).toMatchObject({ rol: 'propietario', nombre: 'Beto' })
    expect(typeof patch.terminos_aceptados_at).toBe('string')
  })

  it('onboarding con términos ya aceptados no los reenvía', () => {
    const patch = buildOnboardingPatch(
      { rol: 'ambos', nombre: 'Otro', aceptaTerminos: true },
      { nombre: 'Ana', terminos_aceptados_at: '2026-11-01T10:00:00Z' },
    )
    expect(patch).toEqual({ rol: 'ambos' })
  })

  it('onboarding sin términos previos exige la casilla (CA-43)', () => {
    expect(() =>
      buildOnboardingPatch(
        { rol: 'ambos', aceptaTerminos: false },
        { nombre: 'Ana', terminos_aceptados_at: null },
      ),
    ).toThrow(ProfileError)
  })
})

describe('mapProfileError', () => {
  it.each([
    [new ProfileError('23514', 400), 'El nombre debe tener entre 2 y 60'],
    [new ProfileError('42501', 403), 'No podés modificar ese dato'],
    [new ProfileError('PGRST116', 406), 'No encontramos tu perfil'],
    [new ProfileError('PGRST301', 401), 'Tu sesión venció'],
    [new ProfileError('SIN_CONEXION', 0), 'No hay conexión'],
    [new ProfileError('TERMINOS_REQUERIDOS'), 'Tenés que aceptar'],
    [new ProfileError('XX000', 500), 'No pudimos guardar los cambios'],
    [new TypeError('Failed to fetch'), 'No hay conexión'],
    [new Error('mensaje técnico'), 'No pudimos guardar los cambios'],
  ])('%s', (error, esperado) => {
    const mensaje = mapProfileError(error)
    expect(mensaje).toContain(esperado)
    expect(mensaje).not.toContain('mensaje técnico')
  })

  it('distingue cargar de guardar en errores genéricos', () => {
    expect(mapProfileError(new ProfileError('XX000', 500), 'cargar')).toBe(
      'No pudimos cargar tu perfil. Intentá de nuevo.',
    )
  })

  it('sin conexión según el navegador', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(mapProfileError(new ProfileError('23514', 400))).toBe(
      'No hay conexión. Revisá tu internet e intentá de nuevo.',
    )
  })
})

describe('fetchProfile', () => {
  it('consulta solo la fila propia con las columnas del plan', async () => {
    supabaseMock.queueResult({ data: perfilAna })
    await expect(fetchProfile(ANA)).resolves.toEqual(perfilAna)
    expect(llamadas('select')[0]?.args).toEqual([
      'id, nombre, avatar, rol, terminos_aceptados_at, created_at',
    ])
    expect(llamadas('eq')[0]?.args).toEqual(['id', ANA])
  })

  it('un fallo de red se convierte en SIN_CONEXION sin el texto técnico', async () => {
    supabaseMock.queueResult({
      error: postgrestError('', { message: 'TypeError: Failed to fetch' }),
      status: 0,
    })
    const error = await fetchProfile(ANA).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ProfileError)
    expect(error).toMatchObject({ code: 'SIN_CONEXION', status: 0 })
    expect((error as ProfileError).message).not.toContain('Failed to fetch')
  })
})

describe('useProfile', () => {
  it('carga el perfil del usuario con sesión', async () => {
    supabaseMock.queueResult({ data: perfilAna })
    const { result } = renderHook(() => useProfile(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(perfilAna)
  })

  it('sin sesión no consulta', () => {
    useSessionStore.getState().reset()
    const { result } = renderHook(() => useProfile(), { wrapper })
    expect(result.current.fetchStatus).toBe('idle')
    expect(supabaseMock.client.from).not.toHaveBeenCalled()
  })
})

describe('useUpdateProfile (sin optimismo)', () => {
  beforeEach(() => {
    queryClient.setQueryData(profileKeys.detail(ANA), perfilAna)
  })

  it('en éxito la caché refleja la fila devuelta (CA-21)', async () => {
    const actualizado = { ...perfilAna, rol: 'ambos' }
    supabaseMock.queueResult({ data: actualizado })
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    await act(() => result.current.mutateAsync({ rol: 'ambos' }))

    expect(llamadas('update')[0]?.args).toEqual([{ rol: 'ambos' }])
    expect(llamadas('eq')[0]?.args).toEqual(['id', ANA])
    expect(queryClient.getQueryData(profileKeys.detail(ANA))).toEqual(
      actualizado,
    )
  })

  it('en error la caché conserva el valor anterior (CA-22)', async () => {
    supabaseMock.queueResult({ error: postgrestError('23514'), status: 400 })
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    await act(async () => {
      await result.current
        .mutateAsync({ nombre: 'Ana Actualizada' })
        .catch(() => undefined)
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(profileKeys.detail(ANA))).toEqual(perfilAna)
    expect(mapProfileError(result.current.error)).toContain(
      'El nombre debe tener entre 2 y 60',
    )
  })

  it('mientras está pendiente la caché no cambia (no hay optimismo)', async () => {
    let resolver: (() => void) | undefined
    const pendiente = new Promise<void>((r) => {
      resolver = r
    })
    supabaseMock.client.from.mockImplementationOnce((table: string) => {
      const chain: Record<string, unknown> = {}
      for (const m of ['update', 'eq', 'select', 'single']) {
        chain[m] = () => chain
      }
      chain.then = (ok: (r: unknown) => unknown) =>
        pendiente.then(() =>
          ok({
            data: { ...perfilAna, rol: 'ambos' },
            error: null,
            status: 200,
          }),
        )
      void table
      return chain
    })
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })

    act(() => {
      result.current.mutate({ rol: 'ambos' })
    })
    await waitFor(() => expect(result.current.isPending).toBe(true))
    expect(
      queryClient.getQueryData<Profile>(profileKeys.detail(ANA))?.rol,
    ).toBe('buscador')

    resolver?.()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(
      queryClient.getQueryData<Profile>(profileKeys.detail(ANA))?.rol,
    ).toBe('ambos')
  })

  it('sin sesión falla sin llamar a supabase', async () => {
    useSessionStore.getState().reset()
    const { result } = renderHook(() => useUpdateProfile(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({ rol: 'ambos' }).catch(() => undefined)
    })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error).toMatchObject({ code: 'SIN_SESION' })
    expect(supabaseMock.client.from).not.toHaveBeenCalled()
  })
})

describe('useCompleteOnboarding', () => {
  it('OAuth sin términos: un solo update con rol, nombre y términos; la caché queda completa (CA-19)', async () => {
    const pendiente: Profile = {
      ...perfilAna,
      nombre: null,
      rol: null,
      terminos_aceptados_at: null,
    }
    queryClient.setQueryData(profileKeys.detail(ANA), pendiente)
    const completo = { ...perfilAna, rol: 'propietario', nombre: 'Ana' }
    supabaseMock.queueResult({ data: completo })
    const { result } = renderHook(() => useCompleteOnboarding(), { wrapper })

    await act(() =>
      result.current.mutateAsync({
        rol: 'propietario',
        nombre: 'Ana',
        aceptaTerminos: true,
      }),
    )

    const updates = llamadas('update')
    expect(updates).toHaveLength(1)
    expect(updates[0]?.args[0]).toMatchObject({
      rol: 'propietario',
      nombre: 'Ana',
      terminos_aceptados_at: expect.any(String) as unknown,
    })
    const enCache = queryClient.getQueryData<Profile>(profileKeys.detail(ANA))
    expect(enCache).toEqual(completo)
    expect(needsOnboarding(enCache)).toBe(false)
  })

  it('con términos ya aceptados no reenvía terminos_aceptados_at', async () => {
    queryClient.setQueryData(profileKeys.detail(ANA), {
      ...perfilAna,
      rol: null,
    })
    supabaseMock.queueResult({ data: { ...perfilAna, rol: 'ambos' } })
    const { result } = renderHook(() => useCompleteOnboarding(), { wrapper })

    await act(() =>
      result.current.mutateAsync({ rol: 'ambos', aceptaTerminos: false }),
    )

    expect(llamadas('update')[0]?.args).toEqual([{ rol: 'ambos' }])
  })

  it('si el perfil no está en caché lo carga antes del update', async () => {
    supabaseMock.queueResult({ data: { ...perfilAna, rol: null } })
    supabaseMock.queueResult({ data: { ...perfilAna, rol: 'buscador' } })
    const { result } = renderHook(() => useCompleteOnboarding(), { wrapper })

    await act(() =>
      result.current.mutateAsync({ rol: 'buscador', aceptaTerminos: false }),
    )

    expect(llamadas('select')).toHaveLength(2)
    expect(llamadas('update')[0]?.args).toEqual([{ rol: 'buscador' }])
  })

  it('en error conserva la caché anterior (CA-22)', async () => {
    const pendiente: Profile = { ...perfilAna, rol: null }
    queryClient.setQueryData(profileKeys.detail(ANA), pendiente)
    supabaseMock.queueResult({ error: postgrestError('42501'), status: 403 })
    const { result } = renderHook(() => useCompleteOnboarding(), { wrapper })

    await act(async () => {
      await result.current
        .mutateAsync({ rol: 'ambos', aceptaTerminos: true })
        .catch(() => undefined)
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(queryClient.getQueryData(profileKeys.detail(ANA))).toEqual(pendiente)
    expect(mapProfileError(result.current.error)).toBe(
      'No podés modificar ese dato. Recargá la página e intentá de nuevo.',
    )
  })
})
