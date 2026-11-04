import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { Checkbox } from '@/components/Checkbox'
import { PasswordField } from '@/components/PasswordField'
import { TextField } from '@/components/TextField'
import { AceptoTerminosLabel } from '@/features/auth/components/AceptoTerminosLabel'
import { GoogleButton } from '@/features/auth/components/GoogleButton'
import { ReenviarConfirmacion } from '@/features/auth/components/ReenviarConfirmacion'
import { getAuthErrorKind, mapAuthError } from '@/features/auth/errors'
import { useSignUp } from '@/features/auth/mutations'
import {
  hayErrores,
  primerCampoConError,
  validateRegistro,
  type FieldErrors,
  type RegistroCampo,
  type RegistroValues,
} from '@/features/auth/validation'

const ORDEN: readonly RegistroCampo[] = [
  'nombre',
  'email',
  'password',
  'aceptaTerminos',
]

const enlace =
  'font-medium text-limon-verde-oscuro underline underline-offset-2'

export function RegistroRoute() {
  const signUp = useSignUp()
  const [valores, setValores] = useState<RegistroValues>({
    nombre: '',
    email: '',
    password: '',
    aceptaTerminos: false,
  })
  const [errores, setErrores] = useState<FieldErrors<RegistroCampo>>({})
  const [enviadoA, setEnviadoA] = useState<string | null>(null)
  const campos = useRef<
    Partial<Record<RegistroCampo, HTMLInputElement | null>>
  >({})

  const cambiar = <K extends RegistroCampo>(
    campo: K,
    valor: RegistroValues[K],
  ) => {
    setValores((v) => ({ ...v, [campo]: valor }))
    setErrores((e) => {
      if (!e[campo]) return e
      const resto = { ...e }
      delete resto[campo]
      return resto
    })
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const nuevos = validateRegistro(valores)
    setErrores(nuevos)
    if (hayErrores(nuevos)) {
      const primero = primerCampoConError(nuevos, ORDEN)
      if (primero) campos.current[primero]?.focus()
      return
    }
    signUp.mutate(
      {
        nombre: valores.nombre,
        email: valores.email,
        password: valores.password,
        aceptaTerminos: true,
      },
      {
        onSuccess: () => setEnviadoA(valores.email.trim()),
        onError: (error) => {
          // CA-04: un correo ya registrado ve lo mismo que un registro exitoso.
          if (getAuthErrorKind(error) === 'cuenta-existente') {
            setEnviadoA(valores.email.trim())
          }
        },
      },
    )
  }

  if (enviadoA) return <RevisaTuCorreo email={enviadoA} />

  const errorGeneral =
    signUp.isError && getAuthErrorKind(signUp.error) !== 'cuenta-existente'
      ? mapAuthError(signUp.error)
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Creá tu cuenta</h1>
        <p className="text-texto-suave">
          Publicá lo que buscás o respondé con tu propiedad en Limón.
        </p>
      </div>

      {errorGeneral ? <Alert>{errorGeneral}</Alert> : null}

      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <TextField
          ref={(el) => {
            campos.current.nombre = el
          }}
          label="Nombre"
          name="nombre"
          autoComplete="nickname"
          ayuda="El nombre con el que te van a ver (entre 2 y 60 caracteres)."
          value={valores.nombre}
          onChange={(e) => cambiar('nombre', e.target.value)}
          error={errores.nombre}
        />
        <TextField
          ref={(el) => {
            campos.current.email = el
          }}
          label="Correo electrónico"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={valores.email}
          onChange={(e) => cambiar('email', e.target.value)}
          error={errores.email}
        />
        <PasswordField
          ref={(el) => {
            campos.current.password = el
          }}
          label="Contraseña"
          name="password"
          autoComplete="new-password"
          ayuda="Al menos 8 caracteres."
          value={valores.password}
          onChange={(e) => cambiar('password', e.target.value)}
          error={errores.password}
        />
        <Checkbox
          ref={(el) => {
            campos.current.aceptaTerminos = el
          }}
          name="aceptaTerminos"
          label={<AceptoTerminosLabel />}
          checked={valores.aceptaTerminos}
          onChange={(e) => cambiar('aceptaTerminos', e.target.checked)}
          error={errores.aceptaTerminos}
        />
        <Button type="submit" anchoCompleto cargando={signUp.isPending}>
          Crear cuenta
        </Button>
      </form>

      <div className="flex items-center gap-3 text-sm text-texto-suave">
        <span className="h-px flex-1 bg-borde/40" aria-hidden="true" />o
        <span className="h-px flex-1 bg-borde/40" aria-hidden="true" />
      </div>
      <GoogleButton />

      <p className="text-center">
        ¿Ya tenés cuenta?{' '}
        <Link to="/ingresar" className={enlace}>
          Ingresá
        </Link>
      </p>
    </div>
  )
}

/** Pantalla posterior al registro (CA-01, CA-04): siempre la misma. */
function RevisaTuCorreo({ email }: { email: string }) {
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titulo.current?.focus()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <h1 ref={titulo} tabIndex={-1} className="text-2xl font-bold">
        Revisá tu correo para confirmar la cuenta
      </h1>
      <p>
        Te enviamos un enlace a <strong className="break-all">{email}</strong>.
        Abrilo desde este dispositivo para entrar a CasaLimón.
      </p>
      <p className="text-texto-suave">
        Si ya tenías una cuenta con este correo, ingresá o recuperá tu
        contraseña.
      </p>
      <ReenviarConfirmacion email={email} />
      <div className="flex flex-wrap justify-center gap-4">
        <Link to="/ingresar" className={enlace}>
          Ir a ingresar
        </Link>
        <Link to="/recuperar" className={enlace}>
          Recuperar contraseña
        </Link>
      </div>
    </div>
  )
}
