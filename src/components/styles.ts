/** Utilidades de estilo y texto compartidas por los componentes base. */

export type ButtonVariant = 'primario' | 'secundario' | 'texto'

const VARIANTES: Record<ButtonVariant, string> = {
  primario:
    'bg-limon-verde-oscuro text-fondo hover:brightness-95 active:brightness-90',
  secundario:
    'border-2 border-limon-verde-oscuro bg-fondo text-limon-verde-oscuro hover:bg-limon-celeste-claro',
  texto:
    'text-limon-verde-oscuro underline-offset-4 hover:bg-limon-celeste-claro hover:underline',
}

/** Clases compartidas con los enlaces que se ven como botón. */
export function buttonClasses(
  variante: ButtonVariant = 'primario',
  extra = '',
): string {
  return [
    'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold',
    'disabled:cursor-not-allowed disabled:opacity-60',
    VARIANTES[variante],
    extra,
  ].join(' ')
}

export const inputClasses =
  'min-h-11 w-full rounded-lg border-2 border-borde bg-fondo px-3 py-2 text-base text-texto placeholder:text-texto-suave aria-invalid:border-error'

/** Iniciales de hasta dos palabras ("Ana Mora" → "AM"). */
export function iniciales(nombre: string | null | undefined): string {
  const palabras = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  const letras = palabras
    .slice(0, 2)
    .map((p) => [...p][0] ?? '')
    .join('')
  return letras.toLocaleUpperCase('es-CR') || '?'
}
