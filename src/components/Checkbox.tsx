import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'

export interface CheckboxProps extends Omit<
  ComponentPropsWithRef<'input'>,
  'type' | 'id'
> {
  /** Puede incluir enlaces (p. ej., Términos y Privacidad). */
  label: ReactNode
  error?: string | null
  id?: string
}

export function Checkbox({
  label,
  error,
  id,
  className = '',
  ...props
}: CheckboxProps) {
  const generado = useId()
  const inputId = id ?? generado
  const errorId = `${inputId}-error`

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex min-h-11 items-start gap-3">
        <input
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 size-6 shrink-0 accent-limon-verde-oscuro"
          {...props}
        />
        <label htmlFor={inputId} className="text-texto">
          {label}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
