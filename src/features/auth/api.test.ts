import { AuthApiError } from '@supabase/supabase-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabaseMock } from '@/test/supabase-mock'
import {
  exchangeOAuthCode,
  parseEmailLinkType,
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  updatePassword,
  verifyEmailLink,
} from './api'
import { guardarVolverOAuth, tomarVolverOAuth } from './volver'

vi.mock('@/lib/supabase', async () => {
  const { supabaseMock } = await import('@/test/supabase-mock')
  return { supabase: supabaseMock.client }
})

const origen = window.location.origin
const sinError = { data: {}, error: null }

describe('api de auth', () => {
  beforeEach(() => {
    supabaseMock.reset()
    sessionStorage.clear()
  })

  it('signUp envía nombre normalizado, consentimiento y redirección a /auth/confirmar', async () => {
    supabaseMock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    })

    await signUp({
      nombre: '  Ana   Mora ',
      email: ' ana@example.com ',
      password: '12345678',
      aceptaTerminos: true,
    })

    expect(supabaseMock.auth.signUp).toHaveBeenCalledWith({
      email: 'ana@example.com',
      password: '12345678',
      options: {
        data: { nombre: 'Ana Mora', terminos_aceptados: true },
        emailRedirectTo: `${origen}/auth/confirmar`,
      },
    })
  })

  it('lanza el AuthError original para que la UI lo traduzca', async () => {
    const error = new AuthApiError('x', 400, 'invalid_credentials')
    supabaseMock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error,
    })

    await expect(
      signIn({ email: 'ana@example.com', password: 'mala' }),
    ).rejects.toBe(error)
  })

  it('Google usa /auth/callback como redirectTo', async () => {
    supabaseMock.auth.signInWithOAuth.mockResolvedValue({
      data: { provider: 'google', url: 'https://accounts.google.com' },
      error: null,
    })
    await signInWithGoogle()
    expect(supabaseMock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${origen}/auth/callback` },
    })
  })

  it('reenvío y recuperación vuelven a /auth/confirmar', async () => {
    supabaseMock.auth.resend.mockResolvedValue(sinError)
    supabaseMock.auth.resetPasswordForEmail.mockResolvedValue(sinError)

    await resendConfirmation('ana@example.com')
    await requestPasswordReset(' ana@example.com')

    expect(supabaseMock.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'ana@example.com',
      options: { emailRedirectTo: `${origen}/auth/confirmar` },
    })
    expect(supabaseMock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'ana@example.com',
      { redirectTo: `${origen}/auth/confirmar` },
    )
  })

  it('updatePassword, verifyEmailLink y exchangeOAuthCode llaman a supabase', async () => {
    supabaseMock.auth.updateUser.mockResolvedValue(sinError)
    supabaseMock.auth.verifyOtp.mockResolvedValue(sinError)
    supabaseMock.auth.exchangeCodeForSession.mockResolvedValue(sinError)

    await updatePassword('nueva-clave')
    await verifyEmailLink({ tokenHash: 'abc', type: 'recovery' })
    await exchangeOAuthCode('codigo')

    expect(supabaseMock.auth.updateUser).toHaveBeenCalledWith({
      password: 'nueva-clave',
    })
    expect(supabaseMock.auth.verifyOtp).toHaveBeenCalledWith({
      token_hash: 'abc',
      type: 'recovery',
    })
    expect(supabaseMock.auth.exchangeCodeForSession).toHaveBeenCalledWith(
      'codigo',
    )
  })

  it('parseEmailLinkType solo acepta los tipos de las plantillas', () => {
    expect(parseEmailLinkType('email')).toBe('email')
    expect(parseEmailLinkType('recovery')).toBe('recovery')
    expect(parseEmailLinkType('email_change')).toBe('email_change')
    expect(parseEmailLinkType('magiclink')).toBeNull()
    expect(parseEmailLinkType(null)).toBeNull()
  })

  describe('signOut', () => {
    it('cierra solo la sesión local', async () => {
      supabaseMock.auth.signOut.mockResolvedValue({ error: null })
      await signOut()
      expect(supabaseMock.auth.signOut).toHaveBeenCalledWith({ scope: 'local' })
    })

    it('no falla si el servidor no respondió pero la sesión local ya no existe', async () => {
      supabaseMock.auth.signOut.mockResolvedValue({
        error: new AuthApiError('x', 500, 'unexpected_failure'),
      })
      supabaseMock.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })
      await expect(signOut()).resolves.toBeUndefined()
    })

    it('falla si la sesión local sigue activa', async () => {
      const error = new AuthApiError('x', 500, 'unexpected_failure')
      supabaseMock.auth.signOut.mockResolvedValue({ error })
      supabaseMock.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 't' } },
        error: null,
      })
      await expect(signOut()).rejects.toBe(error)
    })
  })
})

describe('volver de OAuth', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('guarda una ruta interna y la entrega una sola vez', () => {
    guardarVolverOAuth('/chat')
    expect(tomarVolverOAuth()).toBe('/chat')
    expect(tomarVolverOAuth()).toBeNull()
  })

  it('no guarda rutas externas', () => {
    guardarVolverOAuth('//evil.com')
    expect(tomarVolverOAuth()).toBeNull()
  })

  it('valida de nuevo al leer', () => {
    sessionStorage.setItem('casalimon:volver-oauth', 'https://evil.com')
    expect(tomarVolverOAuth()).toBeNull()
  })
})
