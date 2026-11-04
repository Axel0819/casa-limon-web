import { useId } from 'react'
import { ROL_OPCIONES } from '../roles'
import type { Rol } from '../types'

export interface RolSelectorProps {
  valor: Rol | null
  onChange: (rol: Rol) => void
  leyenda: string
  disabled?: boolean
}

/** Grupo de radios con las tres opciones de rol y su explicación (RF-11). */
export function RolSelector({
  valor,
  onChange,
  leyenda,
  disabled = false,
}: RolSelectorProps) {
  const nombre = useId()
  return (
    <fieldset className="flex flex-col gap-3" disabled={disabled}>
      <legend className="mb-2 font-semibold text-texto">{leyenda}</legend>
      {ROL_OPCIONES.map((opcion) => {
        const id = `${nombre}-${opcion.valor}`
        const elegido = valor === opcion.valor
        return (
          <label
            key={opcion.valor}
            htmlFor={id}
            className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 p-4 ${
              elegido
                ? 'border-limon-verde-oscuro bg-limon-celeste-claro'
                : 'border-borde/60 bg-fondo hover:bg-limon-celeste-claro'
            }`}
          >
            <input
              id={id}
              type="radio"
              name={nombre}
              value={opcion.valor}
              checked={elegido}
              onChange={() => onChange(opcion.valor)}
              aria-labelledby={`${id}-titulo`}
              aria-describedby={`${id}-desc`}
              className="mt-1 size-5 shrink-0 accent-limon-verde-oscuro"
            />
            <span className="flex flex-col gap-1">
              <span id={`${id}-titulo`} className="font-semibold text-texto">
                {opcion.titulo}
              </span>
              <span id={`${id}-desc`} className="text-sm text-texto-suave">
                {opcion.descripcion}
              </span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
