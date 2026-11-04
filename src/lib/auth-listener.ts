import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import type { QueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/stores/session'
import { supabase } from './supabase'

/** Lo único que el listener necesita del data router de React Router. */
export interface RevalidatingRouter {
  revalidate: () => Promise<void>
}

/**
 * Resuelve cuando ya se conoce el estado inicial de la sesión (evento
 * `INITIAL_SESSION`). `rootLoader` lo espera para no mostrar ni un instante el
 * formulario de ingreso a quien ya tiene sesión (CA-16). Se deriva del store,
 * así que no depende del orden en que se creen el router y el listener.
 */
export function sessionReady(): Promise<Session | null> {
  const actual = useSessionStore.getState()
  if (actual.status !== 'cargando') return Promise.resolve(actual.session)

  return new Promise((resolve) => {
    const cancelar = useSessionStore.subscribe((estado) => {
      if (estado.status === 'cargando') return
      cancelar()
      resolve(estado.session)
    })
  })
}

let cancelarAnterior: (() => void) | null = null

/**
 * Único listener de `onAuthStateChange` de la app (se llama una vez en
 * `main.tsx`). Devuelve la función para cancelar la suscripción.
 *
 * Regla de supabase-js (R-7): el callback es síncrono y no hace `await` de
 * llamadas a supabase; el trabajo asíncrono (revalidar loaders, que pueden
 * consultar el perfil) se difiere con `setTimeout`.
 */
export function initAuthListener(
  router: RevalidatingRouter,
  queryClient: QueryClient,
): () => void {
  cancelarAnterior?.()

  const { data } = supabase.auth.onAuthStateChange(
    (event: AuthChangeEvent, session: Session | null) => {
      const store = useSessionStore.getState()

      if (event === 'SIGNED_OUT') {
        store.reset()
        queryClient.clear()
        setTimeout(() => {
          void router.revalidate()
        }, 0)
        return
      }

      const idAnterior = store.session?.user.id ?? null
      const idNuevo = session?.user.id ?? null
      if (idAnterior !== null && idAnterior !== idNuevo) {
        // Otro usuario en la misma pestaña: nada de la caché anterior le pertenece.
        queryClient.clear()
      }
      store.setSession(session)
    },
  )

  const cancelar = () => {
    data.subscription.unsubscribe()
    if (cancelarAnterior === cancelar) cancelarAnterior = null
  }
  cancelarAnterior = cancelar
  return cancelar
}
