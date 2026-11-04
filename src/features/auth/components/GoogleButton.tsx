import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { GoogleIcon } from '@/components/icons'
import { mapAuthError } from '../errors'
import { useGoogleSignIn } from '../mutations'

export interface GoogleButtonProps {
  /** Ruta a la que volver después del callback (se valida con `safeVolver`). */
  volver?: string | null
}

/** "Continuar con Google" (RF-04). El navegador sale hacia Google si todo va bien. */
export function GoogleButton({ volver }: GoogleButtonProps) {
  const google = useGoogleSignIn()
  return (
    <div className="flex flex-col gap-2">
      <Button
        variante="secundario"
        anchoCompleto
        icono={<GoogleIcon className="size-5" />}
        cargando={google.isPending}
        onClick={() => google.mutate(volver)}
      >
        Continuar con Google
      </Button>
      {google.isError ? <Alert>{mapAuthError(google.error)}</Alert> : null}
    </div>
  )
}
