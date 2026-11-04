import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import { inputClasses } from './styles'

export interface TextFieldProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'id'
> {
  label: string
  /** Mensaje de error del campo; activa `aria-invalid`. */
  error?: string | null
  /** Ayuda visible bajo el campo. */
  ayuda?: ReactNode
  /** Contenido a la derecha dentro del campo (p. ej., mostrar contraseña). */
  accesorio?: ReactNode
  id?: string
}

export function TextField({
  label,
  error,
  ayuda,
  accesorio,
  id,
  className = '',
  ...props
}: TextFieldProps) {
  const generado = useId()
  const inputId = id ?? generado
  const errorId = `${inputId}-error`
  const ayudaId = `${inputId}-ayuda`
  const describedBy =
    [error ? errorId : null, ayuda ? ayudaId : null]
      .filter(Boolean)
      .join(' ') || undefined

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <label htmlFor={inputId} className="font-medium text-texto">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${inputClasses} ${accesorio ? 'pr-14' : ''}`}
          {...props}
        />
        {accesorio ? (
          <div className="absolute inset-y-0 right-0 flex items-center">
            {accesorio}
          </div>
        ) : null}
      </div>
      {ayuda ? (
        <p id={ayudaId} className="text-sm text-texto-suave">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
