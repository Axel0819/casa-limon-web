import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { mapAuthError } from '../errors'
import { useResendConfirmation } from '../mutations'

export interface ReenviarConfirmacionProps {
  email: string
  variante?: 'primario' | 'secundario'
}

/** Botón "Reenviar enlace" con su resultado (RF-02, CA-02). */
export function ReenviarConfirmacion({
  email,
  variante = 'secundario',
}: ReenviarConfirmacionProps) {
  const reenviar = useResendConfirmation()
  return (
    <div className="flex flex-col gap-3">
      <Button
        variante={variante}
        cargando={reenviar.isPending}
        onClick={() => reenviar.mutate(email)}
      >
        Reenviar enlace
      </Button>
      {reenviar.isSuccess ? (
        <Alert tono="exito">
          Te enviamos un enlace nuevo. Revisá también la carpeta de spam.
        </Alert>
      ) : null}
      {reenviar.isError ? <Alert>{mapAuthError(reenviar.error)}</Alert> : null}
    </div>
  )
}
