import type { ElementType } from 'react'

export interface UserNameProps {
  nombre: string | null | undefined
  /** Elemento que lo envuelve (`span`, `h1`, `p`…). */
  as?: ElementType
  className?: string
  /** Texto cuando el nombre está vacío. */
  respaldo?: string
}

/**
 * Nombre de usuario en una sola línea, recortado con puntos suspensivos
 * (Nota T14): `truncate` evita que marcas combinables apiladas ("zalgo"), que
 * la BD no filtra, se salgan de su línea. Siempre como texto, nunca HTML.
 */
export function UserName({
  nombre,
  as: Elemento = 'span',
  className = '',
  respaldo = 'Sin nombre',
}: UserNameProps) {
  const texto = nombre?.trim() ? nombre : respaldo
  return (
    <Elemento
      className={`block max-w-full truncate overflow-hidden ${className}`}
      title={texto}
    >
      {texto}
    </Elemento>
  )
}
