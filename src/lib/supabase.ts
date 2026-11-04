import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env } from './env'

/**
 * Cliente único de Supabase. Solo lo usan las funciones `api.ts` de cada dominio
 * y el listener de auth; los componentes nunca lo importan.
 *
 * `detectSessionInUrl: false`: la app decide cuándo intercambiar el código OAuth
 * (`/auth/callback`) o verificar un enlace de correo (`/auth/confirmar`).
 */
export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      flowType: 'pkce',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)
