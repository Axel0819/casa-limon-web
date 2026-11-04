import { vi } from 'vitest'

/**
 * Doble del cliente `supabase` para pruebas (auth + `from().select/update`).
 *
 * Uso:
 *   vi.mock('@/lib/supabase', async () => {
 *     const { supabaseMock } = await import('@/test/supabase-mock')
 *     return { supabase: supabaseMock.client }
 *   })
 *
 * Las consultas de `from()` se resuelven, en orden, con los resultados que se
 * encolen con `queueResult`. `calls` registra cada método encadenado.
 */

export interface MockPostgrestError {
  code: string
  message: string
  details: string
  hint: string
}

export interface MockQueryResult {
  data: unknown
  error: MockPostgrestError | null
  status: number
}

export interface MockCall {
  table: string
  method: string
  args: unknown[]
}

type AuthCallback = (event: string, session: unknown) => void

const METODOS_ENCADENABLES = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'neq',
  'in',
  'order',
  'limit',
  'range',
  'single',
  'maybeSingle',
] as const

function crearAuth() {
  const listeners: AuthCallback[] = []
  return {
    listeners,
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    resend: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    verifyOtp: vi.fn(),
    exchangeCodeForSession: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    onAuthStateChange: vi.fn((callback: AuthCallback) => {
      listeners.push(callback)
      return {
        data: {
          subscription: {
            id: `mock-${listeners.length}`,
            callback,
            unsubscribe: vi.fn(() => {
              const i = listeners.indexOf(callback)
              if (i >= 0) listeners.splice(i, 1)
            }),
          },
        },
      }
    }),
  }
}

export function createSupabaseMock() {
  const resultados: MockQueryResult[] = []
  const calls: MockCall[] = []
  let auth = crearAuth()

  function builder(table: string) {
    const chain: Record<string, unknown> = {}
    for (const metodo of METODOS_ENCADENABLES) {
      chain[metodo] = (...args: unknown[]) => {
        calls.push({ table, method: metodo, args })
        return chain
      }
    }
    // Thenable, como los builders de postgrest-js.
    chain.then = (
      onFulfilled?: (r: MockQueryResult) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => {
      const resultado = resultados.shift()
      const promesa = resultado
        ? Promise.resolve(resultado)
        : Promise.reject(
            new Error(`supabase-mock: no hay resultado encolado para ${table}`),
          )
      return promesa.then(onFulfilled, onRejected)
    }
    return chain
  }

  const client = {
    get auth() {
      return auth
    },
    from: vi.fn((table: string) => {
      calls.push({ table, method: 'from', args: [table] })
      return builder(table)
    }),
  }

  return {
    client,
    get auth() {
      return auth
    },
    calls,
    /** Encola el resultado de la próxima consulta `from()`. */
    queueResult(resultado: Partial<MockQueryResult>) {
      resultados.push({ data: null, error: null, status: 200, ...resultado })
    },
    /** Emite un evento de auth a los listeners registrados. */
    emitAuth(event: string, session: unknown) {
      for (const cb of [...auth.listeners]) cb(event, session)
    },
    reset() {
      resultados.length = 0
      calls.length = 0
      auth = crearAuth()
      client.from.mockClear()
    },
  }
}

export function postgrestError(
  code: string,
  extra: Partial<MockPostgrestError> = {},
): MockPostgrestError {
  return { code, message: 'mensaje técnico', details: '', hint: '', ...extra }
}

/** Instancia compartida que usan los `vi.mock('@/lib/supabase')`. */
export const supabaseMock = createSupabaseMock()
