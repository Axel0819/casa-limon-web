import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findTitulo, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

const respuestaVacia = { data: { user: null, session: null }, error: null }

async function abrir() {
  const utils = renderApp('/registro')
  await findTitulo('Creá tu cuenta')
  return utils
}

async function completar(
  user: ReturnType<typeof renderApp>['user'],
  { acepta = true } = {},
) {
  await user.type(screen.getByLabelText('Nombre'), 'Carla Vargas')
  await user.type(
    screen.getByLabelText('Correo electrónico'),
    'carla@example.com',
  )
  await user.type(screen.getByLabelText('Contraseña'), '12345678')
  if (acepta) await user.click(screen.getByRole('checkbox'))
}

beforeEach(() => {
  supabaseMock.reset()
})

describe('/registro', () => {
  it('con campos vacíos no llama a signUp y enfoca el primer campo (CA-05)', async () => {
    const { user } = await abrir()
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled()
    const nombre = screen.getByLabelText('Nombre')
    expect(document.activeElement).toBe(nombre)
    expect(nombre.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Escribí tu nombre.')).toBeTruthy()
    expect(screen.getByText('Escribí tu correo.')).toBeTruthy()
  })

  it('email mal formado y contraseña corta: foco al email', async () => {
    const { user } = await abrir()
    await user.type(screen.getByLabelText('Nombre'), 'Carla')
    await user.type(screen.getByLabelText('Correo electrónico'), 'carla@')
    await user.type(screen.getByLabelText('Contraseña'), '1234567')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      screen.getByLabelText('Correo electrónico'),
    )
    expect(
      screen.getByText('La contraseña debe tener al menos 8 caracteres.'),
    ).toBeTruthy()
  })

  it('sin marcar la casilla: error junto a ella y sin llamada (CA-42)', async () => {
    const { user } = await abrir()
    await completar(user, { acepta: false })
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(supabaseMock.auth.signUp).not.toHaveBeenCalled()
    const casilla = screen.getByRole('checkbox')
    expect(document.activeElement).toBe(casilla)
    const id = casilla.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(id)?.textContent).toMatch(
      /Tenés que aceptar los Términos/,
    )
  })

  it('la casilla enlaza a Términos y Privacidad en otra pestaña', async () => {
    await abrir()
    const casilla = screen.getByRole('checkbox')
    const contenedor = casilla.parentElement as HTMLElement
    const terminos = within(contenedor).getByRole('link', { name: 'Términos' })
    const privacidad = within(contenedor).getByRole('link', {
      name: 'Aviso de Privacidad',
    })
    expect(terminos.getAttribute('href')).toBe('/terminos')
    expect(privacidad.getAttribute('href')).toBe('/privacidad')
    expect(terminos.getAttribute('target')).toBe('_blank')
  })

  it('éxito → "Revisá tu correo…" con reenviar (CA-01, RF-02)', async () => {
    supabaseMock.auth.signUp.mockResolvedValue(respuestaVacia)
    supabaseMock.auth.resend.mockResolvedValue({ data: {}, error: null })
    const { user } = await abrir()
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    const titulo = await findTitulo('Revisá tu correo para confirmar la cuenta')
    expect(document.activeElement).toBe(titulo)
    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'carla@example.com',
        options: expect.objectContaining({
          data: { nombre: 'Carla Vargas', terminos_aceptados: true },
        }) as unknown,
      }),
    )

    await user.click(screen.getByRole('button', { name: 'Reenviar enlace' }))
    expect(await screen.findByText(/Te enviamos un enlace nuevo/)).toBeTruthy()
    expect(supabaseMock.auth.resend).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'signup', email: 'carla@example.com' }),
    )
  })

  it('correo ya registrado → mismo mensaje que el éxito (CA-04)', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthApiError(
        'User already registered',
        422,
        'user_already_exists',
      ),
    })
    const { user } = await abrir()
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect(
      await findTitulo('Revisá tu correo para confirmar la cuenta'),
    ).toBeTruthy()
    expect(screen.queryByText(/already/)).toBeNull()
  })

  it('sin red: mensaje en español y el botón vuelve a estar disponible (CA-12)', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    })
    const { user } = await abrir()
    await completar(user)
    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))

    expect((await screen.findByRole('alert')).textContent).toContain(
      'No hay conexión. Revisá tu internet e intentá de nuevo.',
    )
    const boton = screen.getByRole('button', { name: 'Crear cuenta' })
    expect(boton).toHaveProperty('disabled', false)
    expect(screen.getByLabelText('Correo electrónico')).toHaveProperty(
      'value',
      'carla@example.com',
    )
  })
})
