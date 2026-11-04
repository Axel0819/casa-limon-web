import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import {
  getAuthErrorKind,
  mapAuthError,
  type AuthErrorKind,
} from '@/features/auth/errors'
import { useRequestPasswordReset } from '@/features/auth/mutations'
import { validateEmail } from '@/features/auth/validation'

const enlace =
  'font-medium text-limon-verde-oscuro underline underline-offset-2'

/** Solo la red y el límite de envíos muestran algo distinto (CA-13). */
const ERRORES_VISIBLES = new Set<AuthErrorKind>([
  'sin-conexion',
  'demasiados-intentos',
])

export function RecuperarRoute() {
  const reset = useRequestPasswordReset()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const campo = useRef<HTMLInputElement>(null)

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const mensaje = validateEmail(email)
    setError(mensaje)
    if (mensaje) {
      campo.current?.focus()
      return
    }
    reset.mutate(email, {
      onSuccess: () => setEnviado(true),
      onError: (e) => {
        if (!ERRORES_VISIBLES.has(getAuthErrorKind(e))) setEnviado(true)
      },
    })
  }

  if (enviado) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Revisá tu correo</h1>
        <Alert tono="exito">
          Si existe una cuenta con{' '}
          <strong className="break-all">{email.trim()}</strong>, te enviamos un
          enlace para restablecer tu contraseña.
        </Alert>
        <p className="text-texto-suave">
          El enlace sirve una sola vez. Si no te llega en unos minutos, revisá
          la carpeta de spam.
        </p>
        <Link to="/ingresar" className={`${enlace} text-center`}>
          Volver a ingresar
        </Link>
      </div>
    )
  }

  const errorVisible =
    reset.isError && ERRORES_VISIBLES.has(getAuthErrorKind(reset.error))
      ? mapAuthError(reset.error)
      : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Recuperá tu contraseña</h1>
        <p className="text-texto-suave">
          Escribí el correo de tu cuenta y te enviamos un enlace para crear una
          contraseña nueva.
        </p>
      </div>
      {errorVisible ? <Alert>{errorVisible}</Alert> : null}
      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <TextField
          ref={campo}
          label="Correo electrónico"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
        <Button type="submit" anchoCompleto cargando={reset.isPending}>
          Enviar enlace
        </Button>
      </form>
      <Link to="/ingresar" className={`${enlace} text-center`}>
        Volver a ingresar
      </Link>
    </div>
  )
}
