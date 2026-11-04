import { AuthApiError, AuthRetryableFetchError } from '@supabase/supabase-js'
import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { findTitulo, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

async function pedir(email: string) {
  const utils = renderApp('/recuperar')
  await findTitulo('Recuperá tu contraseña')
  await utils.user.type(screen.getByLabelText('Correo electrónico'), email)
  await utils.user.click(screen.getByRole('button', { name: 'Enviar enlace' }))
  return utils
}

beforeEach(() => {
  supabaseMock.reset()
})

describe('/recuperar', () => {
  it('correo existente → mensaje genérico y redirección a /auth/confirmar (CA-13)', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({
      data: {},
      error: null,
    })
    await pedir('ana@casalimon.test')
    expect(await findTitulo('Revisá tu correo')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(
      'Si existe una cuenta con ana@casalimon.test',
    )
    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'ana@casalimon.test',
      { redirectTo: `${window.location.origin}/auth/confirmar` },
    )
  })

  it('cualquier error que no sea de red o límite → el mismo mensaje (CA-13)', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: new AuthApiError('User not found', 404, 'user_not_found'),
    })
    await pedir('nadie@casalimon.test')
    expect(await findTitulo('Revisá tu correo')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain(
      'Si existe una cuenta con nadie@casalimon.test',
    )
  })

  it('sin red → error visible y el formulario se mantiene', async () => {
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue({
      data: null,
      error: new AuthRetryableFetchError('Failed to fetch', 0),
    })
    await pedir('ana@casalimon.test')
    expect((await screen.findByRole('alert')).textContent).toContain(
      'No hay conexión',
    )
    expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeTruthy()
  })

  it('correo mal formado: no llama a Supabase', async () => {
    await pedir('ana@')
    expect(supabaseMock.auth.resetPasswordForEmail).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(
      screen.getByLabelText('Correo electrónico'),
    )
  })
})
