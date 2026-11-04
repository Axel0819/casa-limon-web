import { QueryClient } from '@tanstack/react-query'

/** Configuración compartida por la app y las pruebas. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: 1 },
      mutations: { retry: 0 },
    },
  })
}

/** QueryClient único de la app (lo usan `main.tsx`, los loaders y el listener de auth). */
export const queryClient = createQueryClient()
