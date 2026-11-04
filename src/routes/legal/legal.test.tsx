import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPerfil, crearSesion, findTitulo, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

beforeEach(() => {
  supabaseMock.reset()
})

describe('páginas legales (CA-44)', () => {
  it('/terminos sin sesión: título, secciones de T28 y enlace de regreso', async () => {
    renderApp('/terminos')
    expect(await findTitulo('Términos y condiciones')).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Edad mínima (18 años)' }),
    ).toBeTruthy()
    expect(
      screen
        .getByRole('link', { name: 'Volver al inicio' })
        .getAttribute('href'),
    ).toBe('/')
    expect(
      screen
        .getByRole('link', { name: 'el Aviso de Privacidad' })
        .getAttribute('href'),
    ).toBe('/privacidad')
  })

  it('/privacidad con sesión: secciones de datos, finalidad, derechos y contacto', async () => {
    renderApp('/privacidad', { session: crearSesion(), perfil: crearPerfil() })
    expect(await findTitulo('Aviso de Privacidad')).toBeTruthy()
    for (const titulo of [
      'Datos que recolectamos (nombre, correo y foto)',
      'Para qué usamos tus datos',
      'Tus derechos según la Ley 8968',
      'Contacto',
      'Edad mínima (18 años)',
    ]) {
      expect(
        screen.getByRole('heading', { level: 2, name: titulo }),
      ).toBeTruthy()
    }
  })
})
