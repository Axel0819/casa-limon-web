import {
  isAuthError,
  isAuthPKCECodeVerifierMissingError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
} from '@supabase/supabase-js'

/**
 * Traducción de errores de Supabase Auth a mensajes en español de Costa Rica
 * (RF-09). Nunca se devuelve `error.message`: solo textos fijos de esta tabla.
 */

export type AuthErrorKind =
  | 'credenciales-invalidas'
  | 'email-sin-confirmar'
  | 'demasiados-intentos'
  | 'sin-conexion'
  | 'enlace-invalido'
  | 'oauth-fallido'
  | 'contrasena-debil'
  | 'misma-contrasena'
  | 'cuenta-existente'
  | 'email-invalido'
  | 'registro-deshabilitado'
  | 'sesion-vencida'
  | 'desconocido'

export const AUTH_ERROR_MESSAGES: Readonly<Record<AuthErrorKind, string>> = {
  'credenciales-invalidas': 'Correo o contraseña incorrectos.',
  'email-sin-confirmar':
    'Tenés que confirmar tu correo antes de ingresar. Revisá tu bandeja de entrada o pedí que te reenviemos el enlace.',
  'demasiados-intentos': 'Demasiados intentos, probá en unos minutos.',
  'sin-conexion': 'No hay conexión. Revisá tu internet e intentá de nuevo.',
  'enlace-invalido':
    'Este enlace venció o ya se usó. Pedí uno nuevo para continuar.',
  'oauth-fallido': 'No se completó el ingreso con Google.',
  'contrasena-debil':
    'Esa contraseña no es lo suficientemente segura. Usá al menos 8 caracteres y evitá contraseñas comunes.',
  'misma-contrasena':
    'La nueva contraseña tiene que ser distinta de la anterior.',
  'cuenta-existente':
    'No pudimos completar el registro con ese correo. Si ya tenés una cuenta, ingresá o recuperá tu contraseña.',
  'email-invalido': 'Revisá el correo: debe tener la forma nombre@dominio.com.',
  'registro-deshabilitado':
    'El registro no está disponible en este momento. Intentá más tarde.',
  'sesion-vencida': 'Tu sesión venció. Ingresá de nuevo para continuar.',
  desconocido: 'Algo salió mal. Intentá de nuevo.',
}

const POR_CODIGO: Readonly<Record<string, AuthErrorKind>> = {
  invalid_credentials: 'credenciales-invalidas',
  user_not_found: 'credenciales-invalidas',
  email_not_confirmed: 'email-sin-confirmar',
  over_request_rate_limit: 'demasiados-intentos',
  over_email_send_rate_limit: 'demasiados-intentos',
  over_sms_send_rate_limit: 'demasiados-intentos',
  otp_expired: 'enlace-invalido',
  otp_disabled: 'enlace-invalido',
  bad_oauth_state: 'oauth-fallido',
  bad_oauth_callback: 'oauth-fallido',
  flow_state_not_found: 'oauth-fallido',
  flow_state_expired: 'oauth-fallido',
  bad_code_verifier: 'oauth-fallido',
  oauth_provider_not_supported: 'oauth-fallido',
  weak_password: 'contrasena-debil',
  same_password: 'misma-contrasena',
  user_already_exists: 'cuenta-existente',
  email_exists: 'cuenta-existente',
  identity_already_exists: 'cuenta-existente',
  email_address_invalid: 'email-invalido',
  signup_disabled: 'registro-deshabilitado',
  email_provider_disabled: 'registro-deshabilitado',
  provider_disabled: 'registro-deshabilitado',
  session_not_found: 'sesion-vencida',
  session_expired: 'sesion-vencida',
  refresh_token_not_found: 'sesion-vencida',
  refresh_token_already_used: 'sesion-vencida',
}

function sinConexion(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** Clasifica el error para que la UI decida acciones (p. ej., botón de reenviar). */
export function getAuthErrorKind(error: unknown): AuthErrorKind {
  if (sinConexion()) return 'sin-conexion'
  if (!isAuthError(error)) {
    // `fetch` lanza TypeError cuando no hay red y no pasó por supabase-js.
    return error instanceof TypeError ? 'sin-conexion' : 'desconocido'
  }
  if (isAuthRetryableFetchError(error)) return 'sin-conexion'
  if (isAuthWeakPasswordError(error)) return 'contrasena-debil'
  if (isAuthSessionMissingError(error)) return 'sesion-vencida'
  if (isAuthPKCECodeVerifierMissingError(error)) return 'oauth-fallido'

  const porCodigo = error.code ? POR_CODIGO[error.code] : undefined
  if (porCodigo) return porCodigo
  if (error.status === 429) return 'demasiados-intentos'
  return 'desconocido'
}

/** Mensaje en español para mostrar al usuario. */
export function mapAuthError(error: unknown): string {
  return AUTH_ERROR_MESSAGES[getAuthErrorKind(error)]
}
