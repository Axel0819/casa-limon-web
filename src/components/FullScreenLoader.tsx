import { Logo } from './Logo'
import { SpinnerIcon } from './icons'

/** Carga a pantalla completa mientras se resuelve la sesión inicial (RF-17). */
export function FullScreenLoader({
  mensaje = 'Cargando…',
}: {
  mensaje?: string
}) {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-fondo p-6"
    >
      <Logo />
      <SpinnerIcon className="size-8 text-limon-verde-oscuro" />
      <span className="sr-only">{mensaje}</span>
    </div>
  )
}
