import { AuthApiError } from '@supabase/supabase-js'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPerfil, crearSesion, findTitulo, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

const recuperacion = () => ({ session: crearSesion(), perfil: crearPerfil() })

beforeEach(() => {
  supabaseMock.reset()
})

describe('/restablecer', () => {
  it('sin sesión de recuperación → enlace inválido con "Pedir otro enlace" (CA-15)', async () => {
    renderApp('/restablecer')
    expect(await findTitulo('Este enlace venció o ya se usó')).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Pedir otro enlace' })
        .getAttribute('href'),
    ).toBe('/recuperar')
  })

  it('contraseña nueva válida → confirmación y entrada a la app (CA-14)', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({
      data: { user: crearSesion().user },
      error: null,
    })
    const { user } = renderApp('/restablecer', recuperacion())
    await findTitulo('Creá una contraseña nueva')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'nueva-clave-1')
    await user.type(
      screen.getByLabelText('Repetí la contraseña'),
      'nueva-clave-1',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))

    expect(await findTitulo('Listo, actualizamos tu contraseña')).toBeTruthy()
    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
      password: 'nueva-clave-1',
    })
    await user.click(screen.getByRole('link', { name: 'Ir a CasaLimón' }))
    expect(await findTitulo('Feed de solicitudes')).toBeTruthy()
  })

  it('valida largo y coincidencia antes de llamar a Supabase', async () => {
    const { user } = renderApp('/restablecer', recuperacion())
    await findTitulo('Creá una contraseña nueva')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'corta')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(
      screen.getByText('La contraseña debe tener al menos 8 caracteres.'),
    ).toBeTruthy()

    await user.clear(screen.getByLabelText('Contraseña nueva'))
    await user.type(screen.getByLabelText('Contraseña nueva'), 'nueva-clave-1')
    await user.type(screen.getByLabelText('Repetí la contraseña'), 'otra-clave')
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect(screen.getByText('Las contraseñas no coinciden.')).toBeTruthy()
    expect(document.activeElement).toBe(
      screen.getByLabelText('Repetí la contraseña'),
    )
    expect(supabaseMock.auth.updateUser).not.toHaveBeenCalled()
  })

  it('misma contraseña que la anterior → mensaje en español', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue({
      data: { user: null },
      error: new AuthApiError(
        'New password should be different',
        422,
        'same_password',
      ),
    })
    const { user } = renderApp('/restablecer', recuperacion())
    await findTitulo('Creá una contraseña nueva')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'misma-clave')
    await user.type(
      screen.getByLabelText('Repetí la contraseña'),
      'misma-clave',
    )
    await user.click(screen.getByRole('button', { name: 'Guardar contraseña' }))
    expect((await screen.findByRole('alert')).textContent).toContain(
      'La nueva contraseña tiene que ser distinta de la anterior.',
    )
  })
})
