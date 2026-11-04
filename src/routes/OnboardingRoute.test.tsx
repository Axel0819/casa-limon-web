import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { profileKeys } from '@/features/profile/queries'
import { queryClient } from '@/lib/query-client'
import { crearPerfil, crearSesion, findTitulo, renderApp } from '@/test/render'
import { postgrestError, supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

const TITULO = 'Te damos la bienvenida a CasaLimón'

function abrir(cambios: Parameters<typeof crearPerfil>[0]) {
  return renderApp('/bienvenida', {
    session: crearSesion(),
    perfil: crearPerfil(cambios),
  })
}

const continuar = () => screen.getByRole('button', { name: 'Continuar' })

function updates() {
  return supabaseMock.calls.filter((c) => c.method === 'update')
}

beforeEach(() => {
  supabaseMock.reset()
})

describe('/bienvenida', () => {
  it('ofrece las tres opciones con descripción', async () => {
    abrir({ rol: null })
    await findTitulo(TITULO)
    for (const nombre of [
      'Busco dónde vivir',
      'Tengo una propiedad para alquilar',
      'Ambas',
    ]) {
      const radio = screen.getByRole('radio', { name: nombre })
      expect(radio.getAttribute('aria-describedby')).toBeTruthy()
    }
    // Usuario de email: ya tiene nombre y términos, no se piden.
    expect(screen.queryByLabelText('Tu nombre')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('botón deshabilitado sin rol (CA-20) y éxito → / (CA-19)', async () => {
    const { user, ubicacion } = abrir({ rol: null })
    await findTitulo(TITULO)
    expect(continuar()).toHaveProperty('disabled', true)
    expect(screen.getByText(/elegí una opción/)).toBeTruthy()

    supabaseMock.queueResult({ data: crearPerfil({ rol: 'propietario' }) })
    await user.click(
      screen.getByRole('radio', { name: 'Tengo una propiedad para alquilar' }),
    )
    expect(continuar()).toHaveProperty('disabled', false)
    await user.click(continuar())

    expect(await findTitulo('Feed de solicitudes')).toBeTruthy()
    expect(ubicacion()).toBe('/')
    expect(updates()).toHaveLength(1)
    expect(updates()[0]?.args).toEqual([{ rol: 'propietario' }])
    expect(
      queryClient.getQueryData(profileKeys.detail(crearSesion().user.id)),
    ).toMatchObject({ rol: 'propietario' })
  })

  it('OAuth sin nombre ni términos: los pide y no deja continuar sin la casilla (CA-43)', async () => {
    const { user } = abrir({
      rol: null,
      nombre: null,
      terminos_aceptados_at: null,
    })
    await findTitulo(TITULO)
    await user.click(screen.getByRole('radio', { name: 'Ambas' }))
    expect(continuar()).toHaveProperty('disabled', true)

    await user.type(screen.getByLabelText('Tu nombre'), 'Dani')
    expect(continuar()).toHaveProperty('disabled', true)
    expect(screen.getByText(/aceptá los Términos/)).toBeTruthy()

    supabaseMock.queueResult({
      data: crearPerfil({ rol: 'ambos', nombre: 'Dani' }),
    })
    await user.click(screen.getByRole('checkbox'))
    expect(continuar()).toHaveProperty('disabled', false)
    await user.click(continuar())

    await findTitulo('Feed de solicitudes')
    expect(updates()).toHaveLength(1)
    expect(updates()[0]?.args[0]).toMatchObject({
      rol: 'ambos',
      nombre: 'Dani',
      terminos_aceptados_at: expect.any(String) as unknown,
    })
  })

  it('nombre inválido mantiene el botón deshabilitado y muestra el error al salir del campo', async () => {
    const { user } = abrir({ rol: null, nombre: null })
    await findTitulo(TITULO)
    await user.click(screen.getByRole('radio', { name: 'Ambas' }))
    await user.type(screen.getByLabelText('Tu nombre'), 'D')
    await user.tab()
    expect(
      screen.getByText('El nombre debe tener entre 2 y 60 caracteres.'),
    ).toBeTruthy()
    expect(continuar()).toHaveProperty('disabled', true)
  })

  it('error al guardar: mensaje, valores conservados y reintento (CA-22)', async () => {
    const { user, ubicacion } = abrir({ rol: null })
    await findTitulo(TITULO)
    supabaseMock.queueResult({ error: postgrestError('XX000'), status: 500 })
    await user.click(screen.getByRole('radio', { name: 'Busco dónde vivir' }))
    await user.click(continuar())

    expect((await screen.findByRole('alert')).textContent).toContain(
      'No pudimos guardar los cambios',
    )
    expect(ubicacion()).toBe('/bienvenida')
    expect(
      screen.getByRole('radio', { name: 'Busco dónde vivir' }),
    ).toHaveProperty('checked', true)

    supabaseMock.queueResult({ data: crearPerfil({ rol: 'buscador' }) })
    await user.click(continuar())
    await waitFor(() => expect(ubicacion()).toBe('/'))
  })
})
