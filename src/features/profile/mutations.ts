import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSessionStore } from '@/stores/session'
import { buildProfilePatch, completeOnboarding, updateProfile } from './api'
import { PROFILE_ERROR_CODES, ProfileError } from './errors'
import { profileKeys, profileQuery } from './queries'
import type {
  CompleteOnboardingInput,
  Profile,
  UpdateProfileInput,
} from './types'

/**
 * Mutaciones del perfil propio, **sin actualización optimista**: la caché solo
 * cambia en `onSuccess` con la fila que devolvió el servidor (RF-13, CA-21). Si
 * fallan, la caché conserva el valor anterior (CA-22) y la UI muestra el error
 * con `mapProfileError`.
 */

function requireUserId(): string {
  const id = useSessionStore.getState().session?.user.id
  if (!id) throw new ProfileError(PROFILE_ERROR_CODES.sinSesion, 401)
  return id
}

/** Perfil: cambiar `nombre` y/o `rol`. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateProfileInput) =>
      updateProfile(requireUserId(), buildProfilePatch(input)),
    onSuccess: (perfil: Profile) => {
      queryClient.setQueryData(profileKeys.detail(perfil.id), perfil)
    },
  })
}

/** Onboarding: rol + nombre (si faltaba) + términos (si faltaban). */
export function useCompleteOnboarding() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: CompleteOnboardingInput) => {
      const id = requireUserId()
      // Normalmente ya está en caché (lo cargó la guarda del onboarding).
      const actual = await queryClient.ensureQueryData(profileQuery(id))
      return completeOnboarding(id, input, actual)
    },
    onSuccess: (perfil: Profile) => {
      queryClient.setQueryData(profileKeys.detail(perfil.id), perfil)
    },
  })
}
