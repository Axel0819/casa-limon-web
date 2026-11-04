import type { Tables, TablesUpdate } from '@/lib/database.types'

export type Profile = Tables<'users'>

export const ROLES = ['buscador', 'propietario', 'ambos'] as const
export type Rol = (typeof ROLES)[number]

export function isRol(valor: unknown): valor is Rol {
  return ROLES.some((rol) => rol === valor)
}

/**
 * Columnas que el usuario puede actualizar (grant por columna de la migración).
 * Nota T14 (B-5): las mutaciones nunca envían otra columna.
 */
export type ProfileUpdate = Pick<
  TablesUpdate<'users'>,
  'nombre' | 'rol' | 'terminos_aceptados_at'
>

/** Cambios desde Perfil (RF-13). */
export interface UpdateProfileInput {
  nombre?: string
  rol?: Rol
}

/** Datos del onboarding (RF-11). `nombre` solo si el perfil no lo tiene. */
export interface CompleteOnboardingInput {
  rol: Rol
  nombre?: string
  /** Casilla de Términos, Privacidad y 18+; obligatoria si aún no aceptó. */
  aceptaTerminos: boolean
}

/** Falta rol, nombre o aceptación de términos (RF-11, CA-18, CA-43). */
export function needsOnboarding(perfil: Profile | null | undefined): boolean {
  if (!perfil) return true
  return !isRol(perfil.rol) || !perfil.nombre || !perfil.terminos_aceptados_at
}
