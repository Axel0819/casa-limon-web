import { describe, expect, it } from 'vitest'
import { safeVolver } from './redirect'

describe('safeVolver', () => {
  it.each([
    ['/chat', '/chat'],
    ['/', '/'],
    ['/perfil?tab=rol', '/perfil?tab=rol'],
    ['/publicar#inicio', '/publicar#inicio'],
    ['/a/../chat', '/chat'],
  ])('acepta la ruta interna %s', (entrada, esperado) => {
    expect(safeVolver(entrada)).toBe(esperado)
  })

  it.each([
    '//evil.com',
    '///evil.com',
    '/\\evil.com',
    '\\\\evil.com',
    'https://x',
    'http://evil.com/chat',
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,hola',
    'chat',
    '',
    '/\t/evil.com',
    '/\n/evil.com',
    '/auth/callback?code=123',
    '/auth/confirmar',
    '/' + 'a'.repeat(2048),
  ])('rechaza %j', (entrada) => {
    expect(safeVolver(entrada)).toBeNull()
  })

  it('rechaza valores ausentes', () => {
    expect(safeVolver(null)).toBeNull()
    expect(safeVolver(undefined)).toBeNull()
  })
})
