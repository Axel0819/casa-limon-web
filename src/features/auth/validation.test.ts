import { describe, expect, it } from 'vitest'
import {
  hayErrores,
  normalizarNombre,
  primerCampoConError,
  validateEmail,
  validateIngreso,
  validateNombre,
  validatePassword,
  validateRegistro,
  type RegistroCampo,
} from './validation'

const registroValido = {
  nombre: 'Ana Mora',
  email: 'ana@example.com',
  password: '12345678',
  aceptaTerminos: true,
}

const ORDEN_REGISTRO: RegistroCampo[] = [
  'nombre',
  'email',
  'password',
  'aceptaTerminos',
]

describe('validateRegistro', () => {
  it('acepta un registro completo', () => {
    expect(validateRegistro(registroValido)).toEqual({})
  })

  it('marca todos los campos vacíos y la casilla sin marcar (CA-05)', () => {
    const errores = validateRegistro({
      nombre: '',
      email: '',
      password: '',
      aceptaTerminos: false,
    })
    expect(errores).toEqual({
      nombre: 'Escribí tu nombre.',
      email: 'Escribí tu correo.',
      password: 'Escribí una contraseña.',
      aceptaTerminos:
        'Tenés que aceptar los Términos y el Aviso de Privacidad y confirmar que sos mayor de 18 años.',
    })
    expect(primerCampoConError(errores, ORDEN_REGISTRO)).toBe('nombre')
  })

  it('exige la casilla aunque lo demás esté bien (CA-42)', () => {
    const errores = validateRegistro({
      ...registroValido,
      aceptaTerminos: false,
    })
    expect(Object.keys(errores)).toEqual(['aceptaTerminos'])
    expect(primerCampoConError(errores, ORDEN_REGISTRO)).toBe('aceptaTerminos')
  })

  it('el foco va al primer campo con error en orden del formulario', () => {
    const errores = validateRegistro({
      ...registroValido,
      email: 'mal',
      password: '1234567',
    })
    expect(primerCampoConError(errores, ORDEN_REGISTRO)).toBe('email')
    expect(hayErrores(errores)).toBe(true)
    expect(hayErrores({})).toBe(false)
  })
})

describe('validateEmail', () => {
  it.each(['ana@example.com', '  ana@example.co.cr  ', 'a+b@c.io'])(
    'acepta %j',
    (email) => {
      expect(validateEmail(email)).toBeNull()
    },
  )

  it.each(['ana', 'ana@', '@example.com', 'ana@example', 'ana @example.com'])(
    'rechaza el correo mal formado %j',
    (email) => {
      expect(validateEmail(email)).toBe(
        'Revisá el correo: debe tener la forma nombre@dominio.com.',
      )
    },
  )

  it('rechaza el correo vacío o con solo espacios', () => {
    expect(validateEmail('   ')).toBe('Escribí tu correo.')
  })
})

describe('validatePassword', () => {
  it('rechaza 7 caracteres', () => {
    expect(validatePassword('1234567')).toBe(
      'La contraseña debe tener al menos 8 caracteres.',
    )
  })

  it('acepta 8 caracteres sin reglas de composición (RF-01)', () => {
    expect(validatePassword('abcdefgh')).toBeNull()
  })

  it('rechaza contraseñas de más de 72 bytes', () => {
    expect(validatePassword('a'.repeat(72))).toBeNull()
    expect(validatePassword('a'.repeat(73))).toBe(
      'La contraseña es demasiado larga. Usá una más corta.',
    )
    // 37 "ñ" = 74 bytes en UTF-8.
    expect(validatePassword('ñ'.repeat(37))).not.toBeNull()
  })
})

describe('validateNombre (D-09: 2–60 tras normalizar)', () => {
  it('rechaza 1 carácter', () => {
    expect(validateNombre('A')).toBe(
      'El nombre debe tener entre 2 y 60 caracteres.',
    )
  })

  it('acepta 2 y 60 caracteres', () => {
    expect(validateNombre('Al')).toBeNull()
    expect(validateNombre('a'.repeat(60))).toBeNull()
  })

  it('rechaza 61 caracteres', () => {
    expect(validateNombre('a'.repeat(61))).toBe(
      'El nombre debe tener entre 2 y 60 caracteres.',
    )
  })

  it('mide después de recortar y colapsar espacios', () => {
    expect(validateNombre('   A   ')).not.toBeNull()
    expect(validateNombre(`  ${'a'.repeat(60)}  `)).toBeNull()
  })

  it('cuenta puntos de código como char_length de Postgres', () => {
    expect(validateNombre('😀'.repeat(30) + 'a'.repeat(30))).toBeNull()
  })

  it('exige al menos una letra o número', () => {
    expect(validateNombre('---')).toBe(
      'El nombre tiene que incluir al menos una letra o un número.',
    )
    expect(validateNombre('Ñu')).toBeNull()
    expect(validateNombre('42')).toBeNull()
  })

  it('el vacío y los invisibles cuentan como vacío', () => {
    expect(validateNombre('')).toBe('Escribí tu nombre.')
    expect(validateNombre('\u{200B}\u{200B} ')).toBe('Escribí tu nombre.')
  })
})

describe('normalizarNombre (igual que public.normalizar_nombre)', () => {
  it('quita invisibles y de dirección, colapsa espacios y control, recorta', () => {
    expect(normalizarNombre('  Ana\u{200B}   María\t\nMora\u{202E} ')).toBe(
      'Ana María Mora',
    )
    expect(normalizarNombre('Beto\u{00A0}Rojas')).toBe('Beto Rojas')
    expect(normalizarNombre('Luis\u0007Vega')).toBe('Luis Vega')
    expect(normalizarNombre('Eva\u{034F}\u{17B4} Solís\u{2028}')).toBe(
      'Eva Solís',
    )
  })
})

describe('validateIngreso', () => {
  it('pide correo y contraseña', () => {
    expect(validateIngreso({ email: '', password: '' })).toEqual({
      email: 'Escribí tu correo.',
      password: 'Escribí tu contraseña.',
    })
  })

  it('no aplica la regla de largo al ingresar', () => {
    expect(
      validateIngreso({ email: 'ana@example.com', password: '1' }),
    ).toEqual({})
  })
})
