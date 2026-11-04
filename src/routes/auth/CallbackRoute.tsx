import { FullScreenLoader } from '@/components/FullScreenLoader'

/**
 * `/auth/callback`: todo el trabajo ocurre en `oauthCallbackLoader`, que siempre
 * redirige. Esta vista solo cubre el instante de la transición.
 */
export function CallbackRoute() {
  return <FullScreenLoader mensaje="Completando el ingreso con Google…" />
}
