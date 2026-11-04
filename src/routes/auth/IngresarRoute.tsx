import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { PasswordField } from '@/components/PasswordField'
import { TextField } from '@/components/TextField'
import { GoogleButton } from '@/features/auth/components/GoogleButton'
import { ReenviarConfirmacion } from '@/features/auth/components/ReenviarConfirmacion'
import {
  AUTH_ERROR_MESSAGES,
  getAuthErrorKind,
  mapAuthError,
} from '@/features/auth/errors'
import { useSignIn } from '@/features/auth/mutations'
import {
  hayErrores,
  primerCampoConError,
  validateIngreso,
  type FieldErrors,
  type IngresoCampo,
} from '@/features/auth/validation'
import { safeVolver } from '@/lib/redirect'
import { AVISO_OAUTH } from './loaders'

const ORDEN: readonly IngresoCampo[] = ['email', 'password']
const enlace =
  'font-medium text-limon-verde-oscuro underline underline-offset-2'

export function IngresarRoute() {
  const [params] = useSearchParams()
  const volver = safeVolver(params.get('volver'))
  const avisoOAuth = params.get('aviso') === AVISO_OAUTH

  const navigate = useNavigate()
  const signIn = useSignIn()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errores, setErrores] = useState<FieldErrors<IngresoCampo>>({})
  const campos = useRef<Partial<Record<IngresoCampo, HTMLInputElement | null>>>(
    {},
  )

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const nuevos = validateIngreso({ email, password })
    setErrores(nuevos)
    if (hayErrores(nuevos)) {
      const primero = primerCampoConError(nuevos, ORDEN)
      if (primero) campos.current[primero]?.focus()
      return
    }
    signIn.mutate(
      { email, password },
      {
        // El listener ya guardó la sesión; la guarda del layout decide si
        // falta el onboarding (CA-06).
        onSuccess: () => void navigate(volver ?? '/', { replace: true }),
        onError: () => setPassword(''),
      },
    )
  }

  const tipoError = signIn.isError ? getAuthErrorKind(signIn.error) : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Ingresá a CasaLimón</h1>
        <p className="text-texto-suave">
          Encontrá o publicá alquileres en la provincia de Limón.
        </p>
      </div>

      {avisoOAuth && !signIn.isError ? (
        <Alert>{AUTH_ERROR_MESSAGES['oauth-fallido']}</Alert>
      ) : null}

      {tipoError ? (
        <Alert
          acciones={
            tipoError === 'email-sin-confirmar' ? (
              <ReenviarConfirmacion email={email} variante="primario" />
            ) : null
          }
        >
          {mapAuthError(signIn.error)}
        </Alert>
      ) : null}

      <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
        <TextField
          ref={(el) => {
            campos.current.email = el
          }}
          label="Correo electrónico"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errores.email}
        />
        <PasswordField
          ref={(el) => {
            campos.current.password = el
          }}
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errores.password}
        />
        <div className="flex justify-end">
          <Link to="/recuperar" className={`${enlace} py-2`}>
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <Button type="submit" anchoCompleto cargando={signIn.isPending}>
          Ingresar
        </Button>
      </form>

      <div className="flex items-center gap-3 text-sm text-texto-suave">
        <span className="h-px flex-1 bg-borde/40" aria-hidden="true" />o
        <span className="h-px flex-1 bg-borde/40" aria-hidden="true" />
      </div>
      <GoogleButton volver={volver} />

      <p className="text-center">
        ¿No tenés cuenta?{' '}
        <Link to="/registro" className={enlace}>
          Registrate
        </Link>
      </p>
    </div>
  )
}
