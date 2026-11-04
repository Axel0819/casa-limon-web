import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from './icons'
import { TextField, type TextFieldProps } from './TextField'

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'accesorio'>

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      accesorio={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label="Mostrar contraseña"
          className="inline-flex size-11 items-center justify-center rounded-lg text-texto-suave hover:text-texto"
        >
          {visible ? (
            <EyeOffIcon className="size-5" />
          ) : (
            <EyeIcon className="size-5" />
          )}
        </button>
      }
    />
  )
}
