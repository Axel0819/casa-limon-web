import type { ReactNode } from 'react'
import { Button } from './Button'
import { AlertIcon } from './icons'

export interface ErrorStateProps {
  titulo: string
  mensaje: string
  onRetry?: () => void
  reintentando?: boolean
  /** Acciones adicionales (p. ej., "Ir al inicio" o "Cerrar sesión"). */
  children?: ReactNode
  /** Nivel del título: `h1` si es la pantalla completa. */
  comoTitulo?: 'h1' | 'h2'
}

export function ErrorState({
  titulo,
  mensaje,
  onRetry,
  reintentando = false,
  children,
  comoTitulo = 'h1',
}: ErrorStateProps) {
  const Titulo = comoTitulo
  return (
    <section
      role="alert"
      className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center"
    >
      <AlertIcon className="size-10 text-error" />
      <Titulo className="text-xl font-bold text-texto">{titulo}</Titulo>
      <p className="text-texto-suave">{mensaje}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry ? (
          <Button onClick={onRetry} cargando={reintentando}>
            Reintentar
          </Button>
        ) : null}
        {children}
      </div>
    </section>
  )
}
