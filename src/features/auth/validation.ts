/**
 * Validación en cliente de los formularios de auth y perfil (CA-05, CA-42).
 * Refleja las restricciones del servidor: contraseña mínima de 8 (config de
 * Auth, RF-01), nombre de 2 a 60 caracteres con al menos una letra o número
 * tras normalizar (check `users_nombre_check` + `normalizar_nombre`, D-09).
 *
 * Cada función devuelve el mensaje de error o `null`. Los `validate*` de
 * formulario devuelven solo los campos con error, en el orden del formulario,
 * para que la UI mueva el foco al primero.
 */

export const NOMBRE_MIN = 2
export const NOMBRE_MAX = 60
export const PASSWORD_MIN = 8
/** GoTrue rechaza contraseñas de más de 72 bytes (límite de bcrypt). */
export const PASSWORD_MAX_BYTES = 72
const EMAIL_MAX = 254

export type FieldErrors<Campo extends string> = Partial<Record<Campo, string>>

// Mismo conjunto que quita `public.normalizar_nombre` (invisibles y de dirección).
// CGJ (U+034F) y las vocales inherentes jemer (U+17B4, U+17B5) son marcas
// combinables: van fuera de la clase para no confundir a la regla de ESLint.
const INVISIBLES =
  /[\u{061C}\u{200B}-\u{200F}\u{202A}-\u{202E}\u{2060}-\u{2064}\u{2066}-\u{2069}\u{FEFF}\u{00AD}\u{115F}\u{1160}\u{180E}\u{3164}\u{FFA0}\u{E0000}-\u{E007F}]|\u{034F}|\u{17B4}|\u{17B5}/gu
// Espacios y caracteres de control: se convierten en un solo espacio (`\s` ya
// incluye NBSP y los separadores de línea y párrafo U+2028 y U+2029).
// eslint-disable-next-line no-control-regex -- se normalizan justamente los caracteres de control
const ESPACIOS = /[\s\u{0000}-\u{001F}\u{007F}-\u{009F}]+/gu
const ALFANUMERICO = /[\p{L}\p{N}]/u
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Normaliza el nombre igual que el servidor: quita invisibles, colapsa
 * espacios y caracteres de control en un espacio y recorta los extremos.
 */
export function normalizarNombre(nombre: string): string {
  return nombre.replace(INVISIBLES, '').replace(ESPACIOS, ' ').trim()
}

/** Normaliza el correo para enviarlo: sin espacios en los extremos. */
export function normalizarEmail(email: string): string {
  return email.trim()
}

export function validateNombre(nombre: string): string | null {
  const limpio = normalizarNombre(nombre)
  if (limpio === '') return 'Escribí tu nombre.'
  // char_length de Postgres cuenta puntos de código, igual que el spread.
  const largo = [...limpio].length
  if (largo < NOMBRE_MIN || largo > NOMBRE_MAX) {
    return `El nombre debe tener entre ${NOMBRE_MIN} y ${NOMBRE_MAX} caracteres.`
  }
  if (!ALFANUMERICO.test(limpio)) {
    return 'El nombre tiene que incluir al menos una letra o un número.'
  }
  return null
}

export function validateEmail(email: string): string | null {
  const limpio = normalizarEmail(email)
  if (limpio === '') return 'Escribí tu correo.'
  if (limpio.length > EMAIL_MAX || !EMAIL.test(limpio)) {
    return 'Revisá el correo: debe tener la forma nombre@dominio.com.'
  }
  return null
}

/** Contraseña nueva (registro y restablecimiento). */
export function validatePassword(password: string): string | null {
  if (password === '') return 'Escribí una contraseña.'
  if ([...password].length < PASSWORD_MIN) {
    return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return 'La contraseña es demasiado larga. Usá una más corta.'
  }
  return null
}

export function validateAceptaTerminos(acepta: boolean): string | null {
  return acepta
    ? null
    : 'Tenés que aceptar los Términos y el Aviso de Privacidad y confirmar que sos mayor de 18 años.'
}

export interface RegistroValues {
  nombre: string
  email: string
  password: string
  aceptaTerminos: boolean
}

export type RegistroCampo = keyof RegistroValues

export function validateRegistro(
  values: RegistroValues,
): FieldErrors<RegistroCampo> {
  return compactar({
    nombre: validateNombre(values.nombre),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    aceptaTerminos: validateAceptaTerminos(values.aceptaTerminos),
  })
}

export interface IngresoValues {
  email: string
  password: string
}

export type IngresoCampo = keyof IngresoValues

/** En el ingreso solo se exige que haya contraseña (no se revela la regla). */
export function validateIngreso(
  values: IngresoValues,
): FieldErrors<IngresoCampo> {
  return compactar({
    email: validateEmail(values.email),
    password: values.password === '' ? 'Escribí tu contraseña.' : null,
  })
}

/** Primer campo con error según el orden dado (para mover el foco, CA-05). */
export function primerCampoConError<Campo extends string>(
  errores: FieldErrors<Campo>,
  orden: readonly Campo[],
): Campo | null {
  return orden.find((campo) => errores[campo] !== undefined) ?? null
}

export function hayErrores<Campo extends string>(
  errores: FieldErrors<Campo>,
): boolean {
  return Object.keys(errores).length > 0
}

function compactar<Campo extends string>(
  resultado: Record<Campo, string | null>,
): FieldErrors<Campo> {
  const errores: FieldErrors<Campo> = {}
  for (const campo of Object.keys(resultado) as Campo[]) {
    const mensaje = resultado[campo]
    if (mensaje !== null) errores[campo] = mensaje
  }
  return errores
}
