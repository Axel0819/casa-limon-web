import { Link, useLoaderData } from 'react-router'
import { AlertIcon } from '@/components/icons'
import { buttonClasses } from '@/components/styles'
import { useSessionStore } from '@/stores/session'
import { AuthShell } from './AuthLayout'
import type { ConfirmarData } from './loaders'

/**
 * `/auth/confirmar` sin token válido: el enlace venció, ya se usó o está
 * incompleto (CA-15). Ofrece pedir uno nuevo según el tipo de enlace.
 */
export function ConfirmarRoute() {
  const { tipo } = useLoaderData<ConfirmarData>()
  const conSesion = useSessionStore((s) => s.session !== null)

  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-4 text-center">
        <AlertIcon className="size-10 text-error" />
        <h1 className="text-2xl font-bold">Este enlace venció o ya se usó</h1>
        <p className="text-texto-suave">
          {tipo === 'recovery'
            ? 'Pedí un enlace nuevo para restablecer tu contraseña. Cada enlace sirve una sola vez.'
            : 'Si todavía no confirmaste tu cuenta, ingresá con tu correo y contraseña para que te reenviemos el enlace. Cada enlace sirve una sola vez.'}
        </p>
        <div className="flex w-full flex-col gap-2">
          {conSesion ? (
            <Link to="/" className={buttonClasses('primario', 'w-full')}>
              Ir al inicio
            </Link>
          ) : null}
          {tipo === 'recovery' ? (
            <Link
              to="/recuperar"
              className={buttonClasses(
                conSesion ? 'secundario' : 'primario',
                'w-full',
              )}
            >
              Pedir otro enlace
            </Link>
          ) : (
            <>
              {conSesion ? null : (
                <Link
                  to="/ingresar"
                  className={buttonClasses('primario', 'w-full')}
                >
                  Ingresar y reenviar la confirmación
                </Link>
              )}
              <Link
                to="/recuperar"
                className={buttonClasses('secundario', 'w-full')}
              >
                Recuperar contraseña
              </Link>
            </>
          )}
        </div>
      </div>
    </AuthShell>
  )
}
