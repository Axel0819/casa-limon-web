import type { ReactNode } from 'react'

export interface ComingSoonProps {
  titulo: string
  descripcion: string
  icono?: ReactNode
}

/** Placeholder de las vistas núcleo en fase 1 (RF-19, CA-32). */
export function ComingSoon({ titulo, descripcion, icono }: ComingSoonProps) {
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 p-6 md:p-10">
      <h1 className="text-2xl font-bold text-texto">{titulo}</h1>
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-limon-celeste-claro p-8 text-center">
        {icono ? (
          <span className="text-limon-verde-oscuro">{icono}</span>
        ) : null}
        <p className="text-lg font-semibold text-limon-verde-oscuro">
          Próximamente
        </p>
        <p className="text-texto">{descripcion}</p>
      </div>
    </section>
  )
}
