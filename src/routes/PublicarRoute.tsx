import { ComingSoon } from '@/components/ComingSoon'
import { PlusIcon } from '@/components/icons'

export function PublicarRoute() {
  return (
    <ComingSoon
      titulo="Publicar"
      descripcion="Pronto vas a poder publicar lo que necesitás o la propiedad que tenés para alquilar."
      icono={<PlusIcon className="size-10" />}
    />
  )
}
