import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { initAuthListener } from '@/lib/auth-listener'
import { queryClient } from '@/lib/query-client'
import { useSessionStore } from '@/stores/session'
import { crearPerfil, crearSesion, renderApp } from '@/test/render'
import { postgrestError, supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

function abrir(cambios: Parameters<typeof crearPerfil>[0] = {}) {
  return renderApp('/perfil', {
    session: crearSesion(),
    perfil: crearPerfil(cambios),
  })
}

/** Valor mostrado en la lista de datos ("Rol", "Miembro desde"). */
function dato(termino: string) {
  const dt = screen.getByText(termino, { selector: 'dt' })
  return dt.nextElementSibling?.textContent
}

const updates = () => supabaseMock.calls.filter((c) => c.method === 'update')

beforeEach(() => {
  supabaseMock.reset()
})

describe('/perfil', () => {
  it('muestra nombre, iniciales, email, rol y fecha de alta (RF-13)', async () => {
    abrir()
    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.textContent).toBe('Ana Prueba')
    expect(screen.getByText('ana@casalimon.test')).toBeTruthy()
    expect(screen.getByText('AP')).toBeTruthy()
    expect(dato('Rol')).toBe('Busco dónde vivir')
    expect(dato('Miembro desde')).toMatch(/2026/)
  })

  it('el nombre se muestra como texto en una línea (sin HTML)', async () => {
    abrir({ nombre: '<img src=x onerror=alert(1)>' })
    const titulo = await screen.findByRole('heading', { level: 1 })
    expect(titulo.querySelector('img')).toBeNull()
    expect(titulo.textContent).toBe('<img src=x onerror=alert(1)>')
    expect(titulo.querySelector('.truncate')).not.toBeNull()
  })

  it('cambiar el rol a "Ambas" se ve al instante (CA-21)', async () => {
    const { user } = abrir()
    await screen.findByRole('heading', { level: 1 })
    supabaseMock.queueResult({ data: crearPerfil({ rol: 'ambos' }) })

    await user.click(screen.getByRole('radio', { name: 'Ambas' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => expect(dato('Rol')).toBe('Ambas'))
    expect(screen.getByRole('status').textContent).toContain(
      'Guardamos tus cambios.',
    )
    expect(updates()[0]?.args).toEqual([{ rol: 'ambos' }])
  })

  it('error al guardar conserva el valor anterior y permite reintentar (CA-22)', async () => {
    const { user } = abrir()
    await screen.findByRole('heading', { level: 1 })
    supabaseMock.queueResult({ error: postgrestError(''), status: 0 })

    await user.click(screen.getByRole('radio', { name: 'Ambas' }))
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta.textContent).toContain('No hay conexión')
    expect(dato('Rol')).toBe('Busco dónde vivir')
    expect(screen.getByRole('radio', { name: 'Ambas' })).toHaveProperty(
      'checked',
      true,
    )

    supabaseMock.queueResult({ data: crearPerfil({ rol: 'ambos' }) })
    await user.click(within(alerta).getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(dato('Rol')).toBe('Ambas'))
  })

  it('cambiar el nombre: valida en cliente y guarda el valor normalizado', async () => {
    const { user } = abrir()
    await screen.findByRole('heading', { level: 1 })
    const campo = screen.getByLabelText('Nombre')

    await user.clear(campo)
    await user.type(campo, 'A')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(
      screen.getByText('El nombre debe tener entre 2 y 60 caracteres.'),
    ).toBeTruthy()
    expect(updates()).toHaveLength(0)

    supabaseMock.queueResult({ data: crearPerfil({ nombre: 'Ana María' }) })
    await user.clear(campo)
    await user.type(campo, '  Ana   María ')
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
        'Ana María',
      ),
    )
    expect(updates()[0]?.args).toEqual([{ nombre: 'Ana María' }])
  })

  it('cerrar sesión lleva a /ingresar y /perfil ya no se abre (CA-17, RF-06)', async () => {
    const { router, user, ubicacion } = abrir()
    await screen.findByRole('heading', { level: 1 })
    const cancelar = initAuthListener(router, queryClient)
    supabaseMock.auth.signOut.mockImplementation(() => {
      supabaseMock.emitAuth('SIGNED_OUT', null)
      return Promise.resolve({ error: null })
    })

    const botones = screen.getAllByRole('button', { name: 'Cerrar sesión' })
    await user.click(botones[botones.length - 1] as HTMLElement)

    await waitFor(() =>
      expect(router.state.location.pathname).toBe('/ingresar'),
    )
    expect(supabaseMock.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(useSessionStore.getState().status).toBe('sin-sesion')
    // Ningún dato del usuario anterior queda en caché (la vista que se desmonta
    // puede dejar una consulta vacía y deshabilitada, sin datos).
    expect(
      queryClient
        .getQueryCache()
        .getAll()
        .filter((q) => q.state.data !== undefined),
    ).toHaveLength(0)

    await act(() => router.navigate('/perfil'))
    await waitFor(() => expect(ubicacion()).toBe('/ingresar?volver=%2Fperfil'))
    cancelar()
  })
})
