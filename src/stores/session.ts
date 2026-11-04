import type { Session } from '@supabase/supabase-js'
import { create } from 'zustand'

export type SessionStatus = 'cargando' | 'con-sesion' | 'sin-sesion'

export interface SessionState {
  status: SessionStatus
  session: Session | null
  /** Guarda la sesión que entrega `onAuthStateChange` (o `null` si no hay). */
  setSession: (session: Session | null) => void
  /** Cierre de sesión: deja el store en `sin-sesion`. */
  reset: () => void
}

/**
 * Sesión de Supabase como estado de cliente (supabase-js ya la persiste en
 * `localStorage`). La alimenta un único listener (`src/lib/auth-listener.ts`);
 * los loaders la leen con `useSessionStore.getState()`.
 */
export const useSessionStore = create<SessionState>()((set) => ({
  status: 'cargando',
  session: null,
  setSession: (session) =>
    set({ session, status: session ? 'con-sesion' : 'sin-sesion' }),
  reset: () => set({ session: null, status: 'sin-sesion' }),
}))

/** Id del usuario con sesión, o `null`. */
export function selectUserId(state: SessionState): string | null {
  return state.session?.user.id ?? null
}
