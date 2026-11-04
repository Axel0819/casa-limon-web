export interface LogoProps {
  className?: string
  /** Oculta el texto (solo el ícono, con nombre accesible). */
  soloIcono?: boolean
}

export function Logo({ className = '', soloIcono = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 64 64"
        width="32"
        height="32"
        aria-hidden={soloIcono ? undefined : 'true'}
        role={soloIcono ? 'img' : undefined}
        aria-label={soloIcono ? 'CasaLimón' : undefined}
        focusable="false"
        className="shrink-0"
      >
        <rect
          width="64"
          height="64"
          rx="14"
          className="fill-limon-verde-oscuro"
        />
        <path d="M32 13 12 30h6v19h28V30h6z" className="fill-fondo" />
        <ellipse
          cx="32"
          cy="38"
          rx="8"
          ry="6.5"
          className="fill-limon-celeste"
        />
      </svg>
      {soloIcono ? null : (
        <span className="text-xl font-bold text-limon-verde-oscuro">
          CasaLimón
        </span>
      )}
    </span>
  )
}
