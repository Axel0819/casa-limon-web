import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ErrorState } from '@/components/ErrorState'
import { buttonClasses } from '@/components/styles'
import { NotFoundRoute } from './NotFoundRoute'

/** Pantalla de error inesperado: reintentar o ir al inicio (RF-20). */
export function UnexpectedError() {
  return (
    <main className="flex min-h-dvh items-center justify-center">
      <ErrorState
        titulo="Algo salió mal"
        mensaje="Tuvimos un problema al mostrar esta pantalla. Intentá de nuevo o volvé al inicio."
        onRetry={() => window.location.reload()}
      >
        {/* Recarga completa: el router puede estar en mal estado. */}
        <a href="/" className={buttonClasses('secundario')}>
          Ir al inicio
        </a>
      </ErrorState>
    </main>
  )
}

export function RootErrorBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundRoute />
  }
  return <UnexpectedError />
}
