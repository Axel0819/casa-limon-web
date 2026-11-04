import { describe, expect, it } from 'vitest'
import { readEnv } from './env'

const validas = {
  VITE_SUPABASE_URL: 'http://127.0.0.1:54321',
  VITE_SUPABASE_ANON_KEY: 'clave-publica',
}

describe('readEnv', () => {
  it('devuelve los valores tipados cuando están completos', () => {
    expect(readEnv({ ...validas, VITE_VAPID_PUBLIC_KEY: '' })).toEqual({
      supabaseUrl: 'http://127.0.0.1:54321',
      supabaseAnonKey: 'clave-publica',
      vapidPublicKey: null,
    })
  })

  it('lista todas las variables que faltan en un solo error', () => {
    expect(() => readEnv({})).toThrow(
      /falta VITE_SUPABASE_URL; falta VITE_SUPABASE_ANON_KEY/,
    )
  })

  it('trata los valores vacíos o con solo espacios como faltantes', () => {
    expect(() =>
      readEnv({ ...validas, VITE_SUPABASE_ANON_KEY: '   ' }),
    ).toThrow(/falta VITE_SUPABASE_ANON_KEY/)
  })

  it('rechaza una URL de Supabase que no es http(s)', () => {
    expect(() =>
      readEnv({ ...validas, VITE_SUPABASE_URL: 'javascript:alert(1)' }),
    ).toThrow(/VITE_SUPABASE_URL no es una URL/)
    expect(() =>
      readEnv({ ...validas, VITE_SUPABASE_URL: 'no-es-url' }),
    ).toThrow(/VITE_SUPABASE_URL no es una URL/)
  })

  it('indica cómo resolverlo', () => {
    expect(() => readEnv({})).toThrow(/\.env\.local/)
  })
})
