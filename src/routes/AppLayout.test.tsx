import { screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPerfil, crearSesion, findTitulo, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

const conSesion = () => ({ session: crearSesion(), perfil: crearPerfil() })
const DESTINOS = ['Feed', 'Publicar', 'Chat', 'Perfil']

beforeEach(() => {
  supabaseMock.reset()
})

describe('AppLayout', () => {
  it('tiene dos nav "Principal" con los 4 destinos (RF-18)', async () => {
    renderApp('/chat', conSesion())
    await findTitulo('Chat')
    const navs = screen.getAllByRole('navigation', { name: 'Principal' })
    expect(navs).toHaveLength(2)
    for (const nav of navs) {
      const enlaces = within(nav).getAllByRole('link')
      expect(enlaces.map((a) => a.textContent?.trim())).toEqual(DESTINOS)
    }
  })

  it('aria-current="page" solo en el destino activo', async () => {
    renderApp('/chat', conSesion())
    await findTitulo('Chat')
    for (const nav of screen.getAllByRole('navigation', {
      name: 'Principal',
    })) {
      const actuales = within(nav)
        .getAllByRole('link')
        .filter((a) => a.getAttribute('aria-current') === 'page')
      expect(actuales.map((a) => a.textContent?.trim())).toEqual(['Chat'])
    }
  })

  it('el Feed (/) no queda activo en otras rutas (NavLink con end)', async () => {
    renderApp('/perfil', conSesion())
    await waitFor(() =>
      expect(
        screen
          .getAllByRole('link', { name: 'Feed' })
          .every((a) => !a.hasAttribute('aria-current')),
      ).toBe(true),
    )
  })

  it('contrato de clases: pestañas solo en celular, barra lateral en md+ (CA-30, CA-31)', async () => {
    const { container } = renderApp('/', conSesion())
    await findTitulo('Feed de solicitudes')
    const [lateral, pestanas] = screen.getAllByRole('navigation', {
      name: 'Principal',
    })
    const aside = lateral?.closest('aside')
    expect(aside?.className).toMatch(/(^|\s)hidden(\s|$)/)
    expect(aside?.className).toContain('md:flex')
    expect(pestanas?.className).toContain('md:hidden')
    expect(pestanas?.className).toContain('fixed')
    expect(pestanas?.className).toContain('pb-[env(safe-area-inset-bottom)]')

    const main = container.querySelector('main')
    expect(main?.className).toContain(
      'pb-[calc(4.5rem+env(safe-area-inset-bottom))]',
    )
    expect(main?.className).toContain('md:pb-0')
    // Las pestañas miden 4rem (min-h-16) + 1 px de borde; main deja 4.5rem.
    for (const enlace of within(pestanas as HTMLElement).getAllByRole('link')) {
      expect(enlace.className).toContain('min-h-16')
    }
  })

  it('la barra lateral tiene logo y "Cerrar sesión" (RF-06)', async () => {
    renderApp('/', conSesion())
    await findTitulo('Feed de solicitudes')
    const aside = screen
      .getAllByRole('navigation', { name: 'Principal' })[0]
      ?.closest('aside') as HTMLElement
    expect(within(aside).getByText('CasaLimón')).toBeTruthy()
    expect(
      within(aside).getByRole('button', { name: 'Cerrar sesión' }),
    ).toBeTruthy()
  })

  it.each([
    ['/', 'Feed de solicitudes'],
    ['/publicar', 'Publicar'],
    ['/chat', 'Chat'],
  ])(
    'placeholder %s con título y "Próximamente" (CA-32)',
    async (ruta, titulo) => {
      renderApp(ruta, conSesion())
      expect(await findTitulo(titulo)).toBeTruthy()
      expect(screen.getByText('Próximamente')).toBeTruthy()
      expect(supabaseMock.client.from).not.toHaveBeenCalled()
    },
  )

  it('navegar con las pestañas cambia la vista sin recargar', async () => {
    const { user, ubicacion } = renderApp('/', conSesion())
    await findTitulo('Feed de solicitudes')
    const pestanas = screen.getAllByRole('navigation', { name: 'Principal' })[1]
    await user.click(
      within(pestanas as HTMLElement).getByRole('link', { name: 'Publicar' }),
    )
    expect(await findTitulo('Publicar')).toBeTruthy()
    expect(ubicacion()).toBe('/publicar')
  })
})
