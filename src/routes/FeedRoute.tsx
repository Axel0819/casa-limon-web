import { ComingSoon } from '@/components/ComingSoon'
import { HomeIcon } from '@/components/icons'

export function FeedRoute() {
  return (
    <ComingSoon
      titulo="Feed de solicitudes"
      descripcion="Acá vas a ver lo que las personas buscan para alquilar en Limón y vas a poder responder con ofertas."
      icono={<HomeIcon className="size-10" />}
    />
  )
}
