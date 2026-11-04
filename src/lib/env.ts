/**
 * Lectura y validación de las variables `VITE_*` que llegan al navegador.
 * Solo claves públicas: la seguridad la da RLS, no el secreto de estas claves.
 */

export interface Env {
  supabaseUrl: string
  supabaseAnonKey: string
  /** Vacía hasta la fase 6 (notificaciones push). */
  vapidPublicKey: string | null
}

type EnvSource = Readonly<Record<string, unknown>>

function leer(source: EnvSource, nombre: string): string | null {
  const valor = source[nombre]
  if (typeof valor !== 'string') return null
  const limpio = valor.trim()
  return limpio === '' ? null : limpio
}

/**
 * Valida las variables y devuelve un objeto tipado. Lanza un error con la lista
 * completa de lo que falta para que el problema se vea en el primer intento.
 */
export function readEnv(source: EnvSource): Env {
  const supabaseUrl = leer(source, 'VITE_SUPABASE_URL')
  const supabaseAnonKey = leer(source, 'VITE_SUPABASE_ANON_KEY')

  const problemas: string[] = []
  if (!supabaseUrl) {
    problemas.push('falta VITE_SUPABASE_URL')
  } else if (!esUrlHttp(supabaseUrl)) {
    problemas.push('VITE_SUPABASE_URL no es una URL http(s) válida')
  }
  if (!supabaseAnonKey) problemas.push('falta VITE_SUPABASE_ANON_KEY')

  if (problemas.length > 0 || !supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      `Configuración incompleta: ${problemas.join('; ')}. ` +
        'Copiá .env.example a .env.local y completá los valores (en local salen de `pnpm supabase status`).',
    )
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    vapidPublicKey: leer(source, 'VITE_VAPID_PUBLIC_KEY'),
  }
}

function esUrlHttp(valor: string): boolean {
  try {
    const url = new URL(valor)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export const env: Env = readEnv(import.meta.env)
