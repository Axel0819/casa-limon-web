---
name: tanstack-crud
description: Patrón CRUD de CasaLimón con TanStack Query + supabase-js tipado (query keys, hooks de lectura con filtros, mutaciones con invalidación y actualización optimista). Úsala al crear el acceso a datos de un dominio en src/features/<dominio> (posts, properties, offers, profile).
---

# CRUD de dominio con TanStack Query

Los componentes **nunca** llaman a `supabase` directo: consumen hooks de `src/features/<dominio>/`.

## Archivos por dominio

```
src/features/posts/
  api.ts        → funciones puras que llaman a supabase y lanzan error
  queries.ts    → query keys + useQuery hooks
  mutations.ts  → useMutation hooks
  types.ts      → tipos derivados de database.types.ts
```

Cliente compartido en `src/lib/supabase.ts`:

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)
```

## types.ts

```ts
import type { Database } from '@/lib/database.types'
export type Post = Database['public']['Tables']['posts']['Row']
export type PostInsert = Database['public']['Tables']['posts']['Insert']
export type PostUpdate = Database['public']['Tables']['posts']['Update']
export type PostFilters = { zona?: string; presupuestoMax?: number; tags?: string[] }
```

## api.ts

```ts
import { supabase } from '@/lib/supabase'
import type { PostFilters, PostInsert, PostUpdate } from './types'

export async function fetchPosts(filters: PostFilters) {
  let q = supabase.from('posts').select('*').eq('estado', 'activa').order('created_at', { ascending: false })
  if (filters.zona) q = q.eq('zona', filters.zona)
  if (filters.presupuestoMax) q = q.lte('presupuesto_min', filters.presupuestoMax)
  if (filters.tags?.length) q = q.contains('tags', filters.tags)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function createPost(input: PostInsert) {
  const { data, error } = await supabase.from('posts').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updatePost(id: string, patch: PostUpdate) {
  const { data, error } = await supabase.from('posts').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}
```

## queries.ts — query keys jerárquicas

```ts
import { queryOptions, useQuery } from '@tanstack/react-query'
import { fetchPosts, fetchPost } from './api'
import type { PostFilters } from './types'

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (f: PostFilters) => [...postKeys.lists(), f] as const,
  detail: (id: string) => [...postKeys.all, 'detail', id] as const,
}

export const postsQuery = (f: PostFilters) =>
  queryOptions({ queryKey: postKeys.list(f), queryFn: () => fetchPosts(f) })

export const usePosts = (f: PostFilters) => useQuery(postsQuery(f))
export const usePost = (id: string) =>
  useQuery({ queryKey: postKeys.detail(id), queryFn: () => fetchPost(id), enabled: !!id })
```

Los `queryOptions` se reutilizan en `loader`s de React Router con `queryClient.ensureQueryData(postsQuery(f))`.

## mutations.ts

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createPost, updatePost } from './api'
import { postKeys } from './queries'
import type { Post, PostUpdate } from './types'

export function useCreatePost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPost,
    onSuccess: (post) => {
      qc.setQueryData(postKeys.detail(post.id), post)
      qc.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

// Optimista: útil para cerrar/resolver una solicitud
export function useUpdatePost(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: PostUpdate) => updatePost(id, patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: postKeys.detail(id) })
      const prev = qc.getQueryData<Post>(postKeys.detail(id))
      if (prev) qc.setQueryData(postKeys.detail(id), { ...prev, ...patch })
      return { prev }
    },
    onError: (_e, _p, ctx) => ctx?.prev && qc.setQueryData(postKeys.detail(id), ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: postKeys.all }),
  })
}
```

## Reglas

- `user_id`/`owner_id` se toman de la sesión, pero la garantía real es la RLS (skill `supabase-rls-policy`).
- Errores de Supabase se lanzan (`throw error`) para que TanStack Query los exponga en `error`; la UI muestra `ErrorState` con reintento.
- Listas largas del feed: considera `useInfiniteQuery` con `.range()` paginando por `created_at`.
- Prueba los hooks con Vitest mockeando `src/lib/supabase`.
