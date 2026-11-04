/**
 * Errores del dominio de perfil. `ProfileError` guarda solo el código y el
 * estado HTTP: el texto técnico de PostgREST no viaja a la UI.
 */

export const PROFILE_ERROR_CODES = {
  /** Sin respuesta del servidor (fetch falló). */
  sinConexion: 'SIN_CONEXION',
  sinSesion: 'SIN_SESION',
  terminosRequeridos: 'TERMINOS_REQUERIDOS',
} as const

export class ProfileError extends Error {
  readonly code: string
  readonly status: number | null

  constructor(code: string, status: number | null = null) {
    super(`Error de perfil (${code || 'sin código'})`)
    this.name = 'ProfileError'
    this.code = code
    this.status = status
  }
}

interface PostgrestLikeError {
  code?: string
}

/** Convierte el error de PostgREST en `ProfileError` sin conservar su mensaje. */
export function toProfileError(
  error: PostgrestLikeError,
  status: number,
): ProfileError {
  if (status === 0 && !error.code) {
    return new ProfileError(PROFILE_ERROR_CODES.sinConexion, 0)
  }
  return new ProfileError(error.code ?? '', status)
}

export type ProfileAccion = 'cargar' | 'guardar'

const MENSAJES = {
  sinConexion: 'No hay conexión. Revisá tu internet e intentá de nuevo.',
  nombreInvalido:
    'El nombre debe tener entre 2 y 60 caracteres y al menos una letra o un número.',
  sinPermiso:
    'No podés modificar ese dato. Recargá la página e intentá de nuevo.',
  noEncontrado:
    'No encontramos tu perfil. Recargá la página e intentá de nuevo.',
  sesionVencida: 'Tu sesión venció. Ingresá de nuevo para continuar.',
  terminos:
    'Tenés que aceptar los Términos y el Aviso de Privacidad y confirmar que sos mayor de 18 años.',
  cargar: 'No pudimos cargar tu perfil. Intentá de nuevo.',
  guardar: 'No pudimos guardar los cambios. Intentá de nuevo.',
} as const

/** Mensaje en español para mostrar al usuario (nunca `error.message`). */
export function mapProfileError(
  error: unknown,
  accion: ProfileAccion = 'guardar',
): string {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return MENSAJES.sinConexion
  }
  if (error instanceof TypeError) return MENSAJES.sinConexion
  if (!(error instanceof ProfileError)) return MENSAJES[accion]

  switch (error.code) {
    case PROFILE_ERROR_CODES.sinConexion:
      return MENSAJES.sinConexion
    case PROFILE_ERROR_CODES.terminosRequeridos:
      return MENSAJES.terminos
    case PROFILE_ERROR_CODES.sinSesion:
    case 'PGRST301':
    case 'PGRST303':
      return MENSAJES.sesionVencida
    // check_violation: users_nombre_check o el trigger de protección.
    case '23514':
      return MENSAJES.nombreInvalido
    // insufficient_privilege: columna sin grant o dato inmutable (términos).
    case '42501':
      return MENSAJES.sinPermiso
    // .single() sin filas: no existe o la RLS no lo deja ver/editar.
    case 'PGRST116':
      return MENSAJES.noEncontrado
    default:
      return error.status === 401 ? MENSAJES.sesionVencida : MENSAJES[accion]
  }
}
