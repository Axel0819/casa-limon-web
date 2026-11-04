import { LegalPage, type LegalSeccion } from './LegalPage'

/*
 * Estructura de T29. El texto lo entrega el autor en T28 (Ley 8968, D-16);
 * hasta entonces cada sección muestra el marcador y la fase no se cierra.
 */
const PENDIENTE = <p>[Texto pendiente del autor]</p>

const SECCIONES: readonly LegalSeccion[] = [
  {
    id: 'responsable',
    titulo: 'Quién es responsable de tus datos',
    contenido: PENDIENTE,
  },
  {
    id: 'datos',
    titulo: 'Datos que recolectamos (nombre, correo y foto)',
    contenido: PENDIENTE,
  },
  {
    id: 'finalidad',
    titulo: 'Para qué usamos tus datos',
    contenido: PENDIENTE,
  },
  { id: 'edad-minima', titulo: 'Edad mínima (18 años)', contenido: PENDIENTE },
  {
    id: 'terceros',
    titulo: 'Con quién compartimos tus datos',
    contenido: PENDIENTE,
  },
  {
    id: 'derechos',
    titulo: 'Tus derechos según la Ley 8968',
    contenido: PENDIENTE,
  },
  {
    id: 'conservacion',
    titulo: 'Cuánto tiempo guardamos tus datos',
    contenido: PENDIENTE,
  },
  { id: 'contacto', titulo: 'Contacto', contenido: PENDIENTE },
]

export function PrivacidadRoute() {
  return (
    <LegalPage
      titulo="Aviso de Privacidad"
      actualizado="[Texto pendiente del autor]"
      secciones={SECCIONES}
      otro={{ to: '/terminos', label: 'los Términos y condiciones' }}
    />
  )
}
