/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Vitest no procesa CSS (`?raw` llega vacío): se lee el archivo desde la raíz.
const css = readFileSync('src/index.css', 'utf8')

/** Tokens definidos en `@theme` de src/index.css. */
function leerTokens(): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const m of css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]{6});/gi)) {
    const [, nombre, valor] = m
    if (nombre && valor) tokens[nombre] = valor
  }
  return tokens
}

function luminancia(hex: string): number {
  const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = canales.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  ) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [
    number,
    number,
  ]
  return (l1 + 0.05) / (l2 + 0.05)
}

const tokens = leerTokens()
const t = (nombre: string): string => {
  const valor = tokens[nombre]
  if (!valor) throw new Error(`Token inexistente: ${nombre}`)
  return valor
}

describe('contraste de los pares usados (AA)', () => {
  // [texto, fondo] — texto normal: >= 4.5:1
  it.each([
    ['texto', 'fondo'],
    ['texto-suave', 'fondo'],
    ['limon-verde-oscuro', 'fondo'],
    ['fondo', 'limon-verde-oscuro'],
    ['limon-verde-oscuro', 'limon-celeste-claro'],
    ['texto', 'limon-celeste-claro'],
    ['texto-suave', 'limon-celeste-claro'],
    ['error', 'fondo'],
    ['error', 'error-claro'],
  ])('%s sobre %s >= 4.5:1', (texto, fondo) => {
    expect(contraste(t(texto), t(fondo))).toBeGreaterThanOrEqual(4.5)
  })

  // Componentes no textuales (bordes de campos, foco): >= 3:1
  it.each([
    ['borde', 'fondo'],
    ['limon-verde-oscuro', 'limon-celeste-claro'],
    ['error', 'fondo'],
  ])('%s sobre %s >= 3:1', (a, b) => {
    expect(contraste(t(a), t(b))).toBeGreaterThanOrEqual(3)
  })

  it('limon-verde y limon-celeste no alcanzan AA para texto normal (uso restringido)', () => {
    expect(contraste(t('limon-verde'), t('fondo'))).toBeLessThan(4.5)
    expect(contraste(t('limon-celeste'), t('fondo'))).toBeLessThan(4.5)
  })
})

describe('solo colores de los tokens', () => {
  // Se listan con fs y no con import.meta.glob: el resultado del glob puede quedar
  // en la caché de Vitest y omitir archivos nuevos.
  const fuentes: Record<string, string> = Object.fromEntries(
    readdirSync('src', { recursive: true, encoding: 'utf8' })
      .map((ruta) => ruta.replaceAll('\\', '/'))
      .filter((ruta) => ruta.endsWith('.tsx') && !ruta.endsWith('.test.tsx'))
      .sort()
      .map((ruta) => [`src/${ruta}`, readFileSync(`src/${ruta}`, 'utf8')]),
  )
  const nombres = Object.keys(tokens)
  const UTILIDADES =
    /\b(?:bg|text|border|ring|outline|fill|stroke|accent|decoration|from|to|via|divide|placeholder|caret|shadow)-([a-z]+(?:-[a-z]+)*)(?:\/\d+)?\b/g
  const NO_COLORES = new Set([
    // utilidades que no son colores
    'base',
    'xs',
    'sm',
    'md',
    'lg',
    'xl',
    'center',
    'left',
    'right',
    'none',
    'current',
    'transparent',
    'inherit',
    'l',
    'r',
    't',
    'b',
    'x',
    'y',
    'hidden',
    'offset',
    'solid',
    'dashed',
    'clip',
    'cover',
    'contain',
  ])

  it('hay archivos que revisar', () => {
    expect(Object.keys(fuentes)).toContain('src/routes/AppLayout.tsx')
    expect(Object.keys(fuentes).length).toBeGreaterThan(30)
  })

  it.each(Object.entries(fuentes))('%s', (_ruta, codigo) => {
    // Sin colores hexadecimales, rgb() ni hsl() en los componentes.
    expect(codigo).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(codigo).not.toMatch(/\b(?:rgb|hsl)a?\(/)
    for (const m of codigo.matchAll(UTILIDADES)) {
      const valor = m[1] ?? ''
      if (NO_COLORES.has(valor) || /^\d/.test(valor)) continue
      expect(nombres, `clase ${m[0]}`).toContain(valor)
    }
  })
})
