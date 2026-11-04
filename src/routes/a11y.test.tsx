/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearPerfil, crearSesion, findTitulo, renderApp } from '@/test/render'
import { supabaseMock } from '@/test/supabase-mock'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

type Usuario = ReturnType<typeof renderApp>['user']

const ENFOCABLES =
  'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

/** Controles que deberían recibir foco con Tab, en orden del documento. */
function controlesEsperados(): Element[] {
  const radiosVistos = new Set<string>()
  return [...document.querySelectorAll(ENFOCABLES)].filter((el) => {
    if (el.getAttribute('tabindex') === '-1') return false
    if ((el as HTMLButtonElement).disabled) return false
    if (el instanceof HTMLInputElement && el.type === 'radio') {
      // Un grupo de radios es una sola parada de Tab.
      if (radiosVistos.has(el.name)) return false
      radiosVistos.add(el.name)
    }
    return true
  })
}

/** Recorre la pantalla solo con Tab hasta volver al inicio. */
async function recorrerConTab(user: Usuario): Promise<Element[]> {
  const vistos: Element[] = []
  for (let i = 0; i < 80; i++) {
    await user.tab()
    const activo = document.activeElement
    if (!activo || activo === document.body || vistos.includes(activo)) break
    vistos.push(activo)
  }
  return vistos
}

function nombre(el: Element): string {
  return (
    el.getAttribute('aria-label') ??
    (el.id
      ? document.querySelector(`label[for="${el.id}"]`)?.textContent
      : null) ??
    el.textContent?.trim() ??
    el.tagName
  )
}

async function esperarRecorridoCompleto(user: Usuario) {
  const recorrido = await recorrerConTab(user)
  expect(recorrido.map(nombre)).toEqual(controlesEsperados().map(nombre))
  return recorrido
}

/** Botones y campos de texto con objetivo táctil >= 44 px (min-h-11 / size-11 / min-h-16). */
function objetivosTactiles() {
  const pequenos = [
    ...document.querySelectorAll(
      'button, input:not([type="checkbox"]):not([type="radio"])',
    ),
  ].filter((el) => !/\b(min-h-11|size-11|min-h-16)\b/.test(el.className))
  expect(pequenos.map(nombre)).toEqual([])
}

beforeEach(() => {
  supabaseMock.reset()
})

describe('accesibilidad con teclado (CA-34)', () => {
  it('foco visible global definido en index.css', () => {
    const css = readFileSync('src/index.css', 'utf8')
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*3px solid/)
  })

  it('ingreso: todos los controles alcanzables en orden y errores anunciados', async () => {
    const { user } = renderApp('/ingresar')
    await findTitulo('Ingresá a CasaLimón')
    const recorrido = await esperarRecorridoCompleto(user)
    expect(recorrido.map(nombre)).toEqual([
      'Correo electrónico',
      'Contraseña',
      'Mostrar contraseña',
      '¿Olvidaste tu contraseña?',
      'Ingresar',
      'Continuar con Google',
      'Registrate',
    ])
    objetivosTactiles()

    // Enviar con Enter desde el campo de correo, sin mouse.
    screen.getByLabelText('Correo electrónico').focus()
    await user.keyboard('{Enter}')
    const correo = screen.getByLabelText('Correo electrónico')
    expect(document.activeElement).toBe(correo)
    const descrito = correo.getAttribute('aria-describedby') ?? ''
    expect(document.getElementById(descrito)?.textContent).toBe(
      'Escribí tu correo.',
    )
  })

  it('registro: recorrido completo y la casilla se marca con Espacio', async () => {
    const { user } = renderApp('/registro')
    await findTitulo('Creá tu cuenta')
    const recorrido = await esperarRecorridoCompleto(user)
    expect(recorrido.map(nombre).slice(0, 4)).toEqual([
      'Nombre',
      'Correo electrónico',
      'Contraseña',
      'Mostrar contraseña',
    ])
    objetivosTactiles()

    const casilla = screen.getByRole('checkbox')
    casilla.focus()
    await user.keyboard(' ')
    expect(casilla).toHaveProperty('checked', true)
  })

  it('registro: errores con aria-describedby y el error de la casilla junto a ella', async () => {
    const { user } = renderApp('/registro')
    await findTitulo('Creá tu cuenta')
    screen.getByRole('button', { name: 'Crear cuenta' }).focus()
    await user.keyboard('{Enter}')
    for (const campo of ['Nombre', 'Correo electrónico', 'Contraseña']) {
      const input = screen.getByLabelText(campo)
      expect(input.getAttribute('aria-invalid')).toBe('true')
      const ids = (input.getAttribute('aria-describedby') ?? '').split(' ')
      expect(ids.some((id) => document.getElementById(id)?.textContent)).toBe(
        true,
      )
    }
    expect(screen.getByRole('checkbox').getAttribute('aria-invalid')).toBe(
      'true',
    )
  })

  it('onboarding: se completa solo con teclado (radios con flechas)', async () => {
    supabaseMock.queueResult({
      data: crearPerfil({ rol: 'ambos', nombre: 'Dani' }),
    })
    const { user, ubicacion } = renderApp('/bienvenida', {
      session: crearSesion(),
      perfil: crearPerfil({
        rol: null,
        nombre: null,
        terminos_aceptados_at: null,
      }),
    })
    await findTitulo('Te damos la bienvenida a CasaLimón')
    await esperarRecorridoCompleto(user)
    objetivosTactiles()

    // Tab al grupo de radios, flechas para elegir, Tab al nombre, etc.
    ;(document.activeElement as HTMLElement | null)?.blur()
    await user.tab()
    expect(document.activeElement?.getAttribute('type')).toBe('radio')
    await user.keyboard(' ')
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(screen.getByRole('radio', { name: 'Ambas' })).toHaveProperty(
      'checked',
      true,
    )
    await user.tab()
    expect(document.activeElement).toBe(screen.getByLabelText('Tu nombre'))
    await user.keyboard('Dani')
    await user.tab() // casilla (los enlaces de la etiqueta van después)
    expect(document.activeElement).toBe(screen.getByRole('checkbox'))
    await user.keyboard(' ')

    const continuar = screen.getByRole('button', { name: 'Continuar' })
    continuar.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(ubicacion()).toBe('/'))
  })

  it('navegación: saltar al contenido, barra lateral, cerrar sesión y pestañas', async () => {
    const { user } = renderApp('/chat', {
      session: crearSesion(),
      perfil: crearPerfil(),
    })
    await findTitulo('Chat')
    const recorrido = await esperarRecorridoCompleto(user)
    expect(recorrido.map(nombre)).toEqual([
      'Saltar al contenido',
      'Feed',
      'Publicar',
      'Chat',
      'Perfil',
      'Cerrar sesión',
      'Feed',
      'Publicar',
      'Chat',
      'Perfil',
    ])
    objetivosTactiles()
    for (const nav of screen.getAllByRole('navigation')) {
      expect(nav.getAttribute('aria-label')).toBe('Principal')
    }

    // Enter en un enlace navega.
    const publicar = recorrido[2] as HTMLElement
    publicar.focus()
    await user.keyboard('{Enter}')
    expect(await findTitulo('Publicar')).toBeTruthy()
  })
})
