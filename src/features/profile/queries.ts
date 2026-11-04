import { queryOptions, skipToken, useQuery } from '@tanstack/react-query'
import { selectUserId, useSessionStore } from '@/stores/session'
import { fetchProfile } from './api'

export const profileKeys = {
  all: ['profile'] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (id: string) => [...profileKeys.details(), id] as const,
}

/**
 * El perfil propio solo cambia con las mutaciones de este dominio, que escriben
 * la caché: se considera fresco 5 minutos para no repetir la lectura al montar.
 */
export const PROFILE_STALE_TIME = 5 * 60_000

/** Reutilizable en loaders: `queryClient.ensureQueryData(profileQuery(uid))`. */
export const profileQuery = (id: string) =>
  queryOptions({
    queryKey: profileKeys.detail(id),
    queryFn: () => fetchProfile(id),
    staleTime: PROFILE_STALE_TIME,
  })

/** Perfil del usuario con sesión (deshabilitado si no hay sesión). */
export function useProfile() {
  const userId = useSessionStore(selectUserId)
  return useQuery({
    queryKey: profileKeys.detail(userId ?? ''),
    queryFn: userId ? () => fetchProfile(userId) : skipToken,
    staleTime: PROFILE_STALE_TIME,
  })
}
