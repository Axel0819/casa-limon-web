import type { ReactNode } from 'react'
import { AlertIcon, CheckIcon } from './icons'

export type AlertTono = 'error' | 'exito' | 'info'

const ESTILOS: Record<AlertTono, string> = {
  error: 'border-error bg-error-claro text-error',
  exito: 'border-limon-verde-oscuro bg-limon-celeste-claro text-texto',
  info: 'border-limon-celeste bg-limon-celeste-claro text-texto',
}

export interface AlertProps {
  tono?: AlertTono
  children: ReactNode
  /** Acciones (p. ej., "Reenviar enlace" o "Reintentar"). */
  acciones?: ReactNode
  className?: string
}

/**
 * Mensaje general. Los errores usan `role="alert"` (se anuncian de inmediato);
 * los avisos de éxito o información, `role="status"`.
 */
export function Alert({
  tono = 'error',
  children,
  acciones,
  className = '',
}: AlertProps) {
  return (
    <div
      role={tono === 'error' ? 'alert' : 'status'}
      className={`flex flex-col gap-3 rounded-lg border-l-4 p-4 ${ESTILOS[tono]} ${className}`}
    >
      <div className="flex items-start gap-2">
        {tono === 'error' ? (
          <AlertIcon className="mt-0.5 size-5 shrink-0" />
        ) : (
          <CheckIcon className="mt-0.5 size-5 shrink-0 text-limon-verde-oscuro" />
        )}
        <div className="font-medium">{children}</div>
      </div>
      {acciones ? <div className="flex flex-wrap gap-2">{acciones}</div> : null}
    </div>
  )
}
