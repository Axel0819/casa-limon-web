import { useRef, useState, type FormEvent } from 'react'
import { Link, useLoaderData } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { AlertIcon } from '@/components/icons'
import { PasswordField } from '@/components/PasswordField'
import { buttonClasses } from '@/components/styles'
import { mapAuthError } from '@/features/auth/errors'
import { useUpdatePassword } from '@/features/auth/mutations'
import { validatePassword } from '@/features/auth/validation'
import { useSessionStore } from '@/stores/session'
import { AuthShell } from './AuthLayout'
import type { RestablecerData } from './loaders'

type Campo = 'password' | 'confirmacion'
const ORDEN: readonly Campo[] = ['password', 'confirmacion']

/** `/restablecer`: nueva contraseña con la sesión de recuperación (RF-05, CA-14). */
export function RestablecerRoute() {
  const { conSesion: habiaSesion } = useLoaderData<RestablecerData>()
  const conSesion = useSessionStore((s) => s.session !== null)
  const actualizar = useUpdatePassword()
  const [password, setPassword] = useState('')
  const [confirmacion, setConfirmacion] = useState('')
  const [errores, setErrores] = useState<Partial<Record<Campo, string>>>({})
  const campos = useRef<Partial<Record<Campo, HTMLInputElement | null>>>({})

  if (actualizar.isSuccess) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-2xl font-bold">
            Listo, actualizamos tu contraseña
          </h1>
          <p className="text-texto-suave">
            Desde ahora ingresá con tu contraseña nueva.
          </p>
          <Link to="/" className={buttonClasses('primario', 'w-full')}>
            Ir a CasaLimón
          </Link>
        </div>
      </AuthShell>
    )
  }

  if (!habiaSesion || !conSesion) {
    return (
      <AuthShell>
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertIcon className="size-10 text-error" />
          <h1 className="text-2xl font-bold">Este enlace venció o ya se usó</h1>
          <p className="text-texto-suave">
            Para cambiar tu contraseña, pedí un enlace nuevo desde tu correo.
          </p>
          <Link to="/recuperar" className={buttonClasses('primario', 'w-full')}>
            Pedir otro enlace
          </Link>
        </div>
      </AuthShell>
    )
  }

  const enviar = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault()
    const nuevos: Partial<Record<Campo, string>> = {}
    const errorPassword = validatePassword(password)
    if (errorPassword) nuevos.password = errorPassword
    else if (confirmacion !== password) {
      nuevos.confirmacion = 'Las contraseñas no coinciden.'
    }
    setErrores(nuevos)
    const primero = ORDEN.find((c) => nuevos[c])
    if (primero) {
      campos.current[primero]?.focus()
      return
    }
    actualizar.mutate(password)
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Creá una contraseña nueva</h1>
          <p className="text-texto-suave">Usá al menos 8 caracteres.</p>
        </div>
        {actualizar.isError ? (
          <Alert>{mapAuthError(actualizar.error)}</Alert>
        ) : null}
        <form noValidate onSubmit={enviar} className="flex flex-col gap-4">
          <PasswordField
            ref={(el) => {
              campos.current.password = el
            }}
            label="Contraseña nueva"
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errores.password}
          />
          <PasswordField
            ref={(el) => {
              campos.current.confirmacion = el
            }}
            label="Repetí la contraseña"
            name="confirmacion"
            autoComplete="new-password"
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            error={errores.confirmacion}
          />
          <Button type="submit" anchoCompleto cargando={actualizar.isPending}>
            Guardar contraseña
          </Button>
        </form>
      </div>
    </AuthShell>
  )
}
