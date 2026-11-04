import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/Logo'

export interface LegalSeccion {
  id: string
  titulo: string
  contenido: ReactNode
}

export interface LegalPageProps {
  titulo: string
  actualizado: string
  secciones: readonly LegalSeccion[]
  /** Enlace al otro documento legal. */
  otro: { to: string; label: string }
}

const enlace =
  'font-medium text-limon-verde-oscuro underline underline-offset-2'

/** Página legal estática (texto en JSX, sin HTML inyectado), con o sin sesión. */
export function LegalPage({
  titulo,
  actualizado,
  secciones,
  otro,
}: LegalPageProps) {
  return (
    <div className="min-h-dvh bg-fondo">
      <header className="border-b border-borde/40 px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <Link
            to="/"
            aria-label="CasaLimón, ir al inicio"
            className="min-h-11 py-1"
          >
            <Logo />
          </Link>
          <Link to="/" className={`${enlace} py-2`}>
            Volver al inicio
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{titulo}</h1>
          <p className="text-texto-suave">
            Última actualización: {actualizado}
          </p>
        </div>
        <nav
          aria-label="Contenido"
          className="rounded-2xl bg-limon-celeste-claro p-4"
        >
          <ol className="flex list-decimal flex-col gap-1 pl-5">
            {secciones.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className={enlace}>
                  {s.titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        {secciones.map((s) => (
          <section
            key={s.id}
            id={s.id}
            aria-labelledby={`${s.id}-titulo`}
            className="flex flex-col gap-3"
          >
            <h2 id={`${s.id}-titulo`} className="text-xl font-bold">
              {s.titulo}
            </h2>
            <div className="flex flex-col gap-3 leading-relaxed">
              {s.contenido}
            </div>
          </section>
        ))}
        <p>
          Consultá también{' '}
          <Link to={otro.to} className={enlace}>
            {otro.label}
          </Link>
          .
        </p>
      </main>
    </div>
  )
}
