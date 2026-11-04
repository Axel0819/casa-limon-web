import { useNavigate } from 'react-router'
import { useSignOut } from './mutations'

/** Cierra la sesión y lleva a `/ingresar` sin dejar la ruta protegida en el historial. */
export function useCerrarSesion() {
  const signOut = useSignOut()
  const navigate = useNavigate()
  const cerrar = async () => {
    try {
      await signOut.mutateAsync()
      await navigate('/ingresar', { replace: true })
    } catch {
      // El error queda en signOut.error y se muestra junto al botón.
    }
  }
  return { cerrar, signOut }
}
