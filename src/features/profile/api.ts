import { supabase } from '@/lib/supabase'
import { normalizarNombre } from '@/features/auth/validation'
import { PROFILE_ERROR_CODES, ProfileError, toProfileError } from './errors'
import type {
  CompleteOnboardingInput,
  Profile,
  ProfileUpdate,
  UpdateProfileInput,
} from './types'

const COLUMNAS = 'id, nombre, avatar, rol, terminos_aceptados_at, created_at'

export async function fetchProfile(id: string): Promise<Profile> {
  const { data, error, status } = await supabase
    .from('users')
    .select(COLUMNAS)
    .eq('id', id)
    .single()
  if (error) throw toProfileError(error, status)
  return data
}

/** `patch` solo admite las columnas con grant de update (Nota T14, B-5). */
export async function updateProfile(
  id: string,
  patch: ProfileUpdate,
): Promise<Profile> {
  const { data, error, status } = await supabase
    .from('users')
    .update(patch)
    .eq('id', id)
    .select(COLUMNAS)
    .single()
  if (error) throw toProfileError(error, status)
  return data
}

/** Cambios desde Perfil: nunca toca `terminos_aceptados_at`. */
export function buildProfilePatch(input: UpdateProfileInput): ProfileUpdate {
  const patch: ProfileUpdate = {}
  if (input.nombre !== undefined) patch.nombre = normalizarNombre(input.nombre)
  if (input.rol !== undefined) patch.rol = input.rol
  return patch
}

/**
 * Un solo update con rol, nombre (si faltaba) y aceptación (si faltaba), para
 * que se guarden juntos o nada. La hora de aceptación la fija el servidor; si
 * el perfil ya la tiene, no se reenvía porque el trigger la rechaza (Nota T14).
 */
export function buildOnboardingPatch(
  input: CompleteOnboardingInput,
  actual: Pick<Profile, 'nombre' | 'terminos_aceptados_at'>,
): ProfileUpdate {
  const patch: ProfileUpdate = { rol: input.rol }

  if (input.nombre !== undefined && !actual.nombre) {
    patch.nombre = normalizarNombre(input.nombre)
  }

  if (!actual.terminos_aceptados_at) {
    if (!input.aceptaTerminos) {
      throw new ProfileError(PROFILE_ERROR_CODES.terminosRequeridos)
    }
    patch.terminos_aceptados_at = new Date().toISOString()
  }

  return patch
}

export async function completeOnboarding(
  id: string,
  input: CompleteOnboardingInput,
  actual: Pick<Profile, 'nombre' | 'terminos_aceptados_at'>,
): Promise<Profile> {
  return updateProfile(id, buildOnboardingPatch(input, actual))
}
