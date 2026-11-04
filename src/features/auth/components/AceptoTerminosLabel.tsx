import { Link } from 'react-router'

const enlace =
  'font-medium text-limon-verde-oscuro underline underline-offset-2'

/**
 * Texto de la casilla de consentimiento (D-16). Los enlaces abren en otra
 * pestaña para no perder lo escrito en el formulario.
 */
export function AceptoTerminosLabel() {
  return (
    <>
      Acepto los{' '}
      <Link to="/terminos" target="_blank" rel="noopener" className={enlace}>
        Términos
      </Link>{' '}
      y el{' '}
      <Link to="/privacidad" target="_blank" rel="noopener" className={enlace}>
        Aviso de Privacidad
      </Link>
      , y confirmo que soy mayor de 18 años.
    </>
  )
}
