import { useState } from 'react'
import { iniciales } from './styles'

export interface AvatarProps {
  src: string | null | undefined
  nombre: string | null | undefined
  /** Tamaño en píxeles (ancho = alto). */
  tamano?: number
  className?: string
}

/**
 * Foto del proveedor OAuth o iniciales de respaldo (también si la imagen falla,
 * R-8). `referrerPolicy="no-referrer"` evita que Google bloquee la imagen y no
 * filtra la URL de la app.
 */
export function Avatar({
  src,
  nombre,
  tamano = 48,
  className = '',
}: AvatarProps) {
  const [fallo, setFallo] = useState(false)
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${className}`
  const estilo = { width: tamano, height: tamano }

  if (src && !fallo) {
    return (
      <img
        src={src}
        alt={nombre ? `Foto de perfil de ${nombre}` : 'Foto de perfil'}
        width={tamano}
        height={tamano}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFallo(true)}
        className={`${base} object-cover`}
        style={estilo}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={`${base} bg-limon-verde-oscuro font-semibold text-fondo`}
      style={{ ...estilo, fontSize: Math.round(tamano * 0.4) }}
    >
      {iniciales(nombre)}
    </span>
  )
}
