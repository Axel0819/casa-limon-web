import {
  AuthApiError,
  AuthError,
  AuthPKCECodeVerifierMissingError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
  AuthUnknownError,
  AuthWeakPasswordError,
} from '@supabase/supabase-js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  AUTH_ERROR_MESSAGES,
  getAuthErrorKind,
  mapAuthError,
  type AuthErrorKind,
} from './errors'

const CRUDO = 'Mensaje técnico en inglés que nunca se muestra'
const api = (code: string, status = 400) =>
  new AuthApiError(CRUDO, status, code)

const casos: Array<[string, unknown, AuthErrorKind]> = [
  [
    'invalid_credentials (CA-07)',
    api('invalid_credentials'),
    'credenciales-invalidas',
  ],
  ['user_not_found', api('user_not_found', 404), 'credenciales-invalidas'],
  [
    'email_not_confirmed (CA-02)',
    api('email_not_confirmed'),
    'email-sin-confirmar',
  ],
  [
    'over_request_rate_limit (CA-08)',
    api('over_request_rate_limit', 429),
    'demasiados-intentos',
  ],
  [
    'over_email_send_rate_limit (CA-08)',
    api('over_email_send_rate_limit', 429),
    'demasiados-intentos',
  ],
  [
    '429 sin código (CA-08)',
    new AuthApiError(CRUDO, 429, undefined),
    'demasiados-intentos',
  ],
  [
    'AuthRetryableFetchError sin red (CA-12)',
    new AuthRetryableFetchError(CRUDO, 0),
    'sin-conexion',
  ],
  [
    'AuthRetryableFetchError 503 (CA-12)',
    new AuthRetryableFetchError(CRUDO, 503),
    'sin-conexion',
  ],
  [
    'TypeError de fetch (CA-12)',
    new TypeError('Failed to fetch'),
    'sin-conexion',
  ],
  ['otp_expired (CA-15)', api('otp_expired', 403), 'enlace-invalido'],
  ['bad_oauth_callback (CA-10)', api('bad_oauth_callback'), 'oauth-fallido'],
  [
    'flow_state_not_found (CA-10)',
    api('flow_state_not_found', 404),
    'oauth-fallido',
  ],
  ['bad_code_verifier (CA-10)', api('bad_code_verifier'), 'oauth-fallido'],
  [
    'verificador PKCE ausente (CA-10)',
    new AuthPKCECodeVerifierMissingError(),
    'oauth-fallido',
  ],
  [
    'weak_password (AuthApiError)',
    api('weak_password', 422),
    'contrasena-debil',
  ],
  [
    'AuthWeakPasswordError',
    new AuthWeakPasswordError(CRUDO, 422, ['length']),
    'contrasena-debil',
  ],
  ['same_password', api('same_password', 422), 'misma-contrasena'],
  [
    'user_already_exists (CA-04)',
    api('user_already_exists', 422),
    'cuenta-existente',
  ],
  ['email_exists (CA-04)', api('email_exists', 422), 'cuenta-existente'],
  ['email_address_invalid', api('email_address_invalid'), 'email-invalido'],
  ['signup_disabled', api('signup_disabled', 422), 'registro-deshabilitado'],
  ['session_not_found', api('session_not_found', 403), 'sesion-vencida'],
  ['AuthSessionMissingError', new AuthSessionMissingError(), 'sesion-vencida'],
  ['código desconocido', api('unexpected_failure', 500), 'desconocido'],
  ['AuthError sin código ni estado', new AuthError(CRUDO), 'desconocido'],
  [
    'AuthUnknownError',
    new AuthUnknownError(CRUDO, new Error(CRUDO)),
    'desconocido',
  ],
  ['Error genérico', new Error(CRUDO), 'desconocido'],
  ['valor que no es error', CRUDO, 'desconocido'],
  ['null', null, 'desconocido'],
]

describe('mapAuthError', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each(casos)('%s', (_nombre, error, tipo) => {
    expect(getAuthErrorKind(error)).toBe(tipo)
    expect(mapAuthError(error)).toBe(AUTH_ERROR_MESSAGES[tipo])
  })

  it('nunca devuelve el mensaje crudo del error', () => {
    const textos = new Set(Object.values(AUTH_ERROR_MESSAGES))
    for (const [, error] of casos) {
      const mensaje = mapAuthError(error)
      expect(mensaje).not.toContain(CRUDO)
      expect(mensaje).not.toBe('Failed to fetch')
      expect(textos.has(mensaje)).toBe(true)
    }
  })

  it('usa los textos exactos de la spec', () => {
    expect(AUTH_ERROR_MESSAGES['credenciales-invalidas']).toBe(
      'Correo o contraseña incorrectos.',
    )
    expect(AUTH_ERROR_MESSAGES['demasiados-intentos']).toBe(
      'Demasiados intentos, probá en unos minutos.',
    )
    expect(AUTH_ERROR_MESSAGES['sin-conexion']).toBe(
      'No hay conexión. Revisá tu internet e intentá de nuevo.',
    )
    expect(AUTH_ERROR_MESSAGES['oauth-fallido']).toBe(
      'No se completó el ingreso con Google.',
    )
    expect(AUTH_ERROR_MESSAGES.desconocido).toBe(
      'Algo salió mal. Intentá de nuevo.',
    )
  })

  it('con el navegador sin conexión siempre informa falta de red (CA-12)', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    expect(getAuthErrorKind(api('invalid_credentials'))).toBe('sin-conexion')
  })
})
