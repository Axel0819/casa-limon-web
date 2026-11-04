import { LegalPage, type LegalSeccion } from './LegalPage'

/*
 * Estructura de T29. El texto lo entrega el autor en T28; hasta entonces cada
 * sección muestra el marcador y la fase no se cierra (plan, "Páginas legales").
 */
const PENDIENTE = <p>[Texto pendiente del autor]</p>

const SECCIONES: readonly LegalSeccion[] = [
  {
    id: 'aceptacion',
    titulo: 'Aceptación de los términos',
    contenido: PENDIENTE,
  },
  { id: 'edad-minima', titulo: 'Edad mínima (18 años)', contenido: PENDIENTE },
  { id: 'servicio', titulo: 'Qué ofrece CasaLimón', contenido: PENDIENTE },
  {
    id: 'uso',
    titulo: 'Uso aceptable y responsabilidades',
    contenido: PENDIENTE,
  },
  { id: 'cuenta', titulo: 'Tu cuenta', contenido: PENDIENTE },
  { id: 'cambios', titulo: 'Cambios a estos términos', contenido: PENDIENTE },
  { id: 'contacto', titulo: 'Contacto', contenido: PENDIENTE },
]

export function TerminosRoute() {
  return (
    <LegalPage
      titulo="Términos y condiciones"
      actualizado="[Texto pendiente del autor]"
      secciones={SECCIONES}
      otro={{ to: '/privacidad', label: 'el Aviso de Privacidad' }}
    />
  )
}
