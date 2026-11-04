import { Link } from 'react-router'
import { Logo } from '@/components/Logo'
import { buttonClasses } from '@/components/styles'

/** 404 de la app (RF-20, CA-33). */
export function NotFoundRoute() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo />
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <p className="max-w-md text-texto-suave">
        Puede que el enlace esté mal escrito o que la página ya no exista.
      </p>
      <Link to="/" className={buttonClasses('primario')}>
        Ir al inicio
      </Link>
    </main>
  )
}
