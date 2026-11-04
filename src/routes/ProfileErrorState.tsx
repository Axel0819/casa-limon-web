import { useRevalidator, useRouteError } from 'react-router'
import { Button } from '@/components/Button'
import { ErrorState } from '@/components/ErrorState'
import { useCerrarSesion } from '@/features/auth/useCerrarSesion'
import { mapProfileError, ProfileError } from '@/features/profile/errors'
import { UnexpectedError } from './RootErrorBoundary'

/**
 * ErrorBoundary del layout y del onboarding: si falló la lectura del perfil,
 * "No pudimos cargar tu perfil" con Reintentar (RF-20); cualquier otro error,
 * la pantalla de error inesperado.
 */
export function ProfileErrorState() {
  const error = useRouteError()
  const revalidator = useRevalidator()
  const { cerrar, signOut } = useCerrarSesion()

  if (!(error instanceof ProfileError)) return <UnexpectedError />

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <ErrorState
        titulo="No pudimos cargar tu perfil"
        mensaje={mapProfileError(error, 'cargar')}
        onRetry={() => void revalidator.revalidate()}
        reintentando={revalidator.state === 'loading'}
      >
        <Button
          variante="secundario"
          onClick={() => void cerrar()}
          cargando={signOut.isPending}
        >
          Cerrar sesión
        </Button>
      </ErrorState>
    </main>
  )
}
