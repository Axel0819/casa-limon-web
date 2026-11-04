import { ComingSoon } from '@/components/ComingSoon'
import { ChatIcon } from '@/components/icons'

export function ChatRoute() {
  return (
    <ComingSoon
      titulo="Chat"
      descripcion="Acá vas a conversar en tiempo real con quienes respondan a tus solicitudes u ofertas."
      icono={<ChatIcon className="size-10" />}
    />
  )
}
