import type { ComponentPropsWithRef, ReactNode } from 'react'
import { SpinnerIcon } from './icons'
import { buttonClasses, type ButtonVariant } from './styles'

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variante?: ButtonVariant
  /** Deshabilita el botón y muestra un indicador mientras dura la acción. */
  cargando?: boolean
  icono?: ReactNode
  anchoCompleto?: boolean
}

export function Button({
  variante = 'primario',
  cargando = false,
  icono,
  anchoCompleto = false,
  className = '',
  disabled,
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={buttonClasses(
        variante,
        `${anchoCompleto ? 'w-full' : ''} ${className}`,
      )}
      {...props}
    >
      {cargando ? <SpinnerIcon className="size-5" /> : icono}
      {children}
    </button>
  )
}
