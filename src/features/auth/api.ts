import { supabase } from '@/lib/supabase'
import { normalizarEmail, normalizarNombre } from './validation'

/**
 * Llamadas a Supabase Auth. Lanzan el `AuthError` original para que
 * TanStack Query lo exponga en `error`; la UI lo traduce con `mapAuthError`.
 *
 * Los enlaces de correo vuelven a `/auth/confirmar`: las plantillas arman
 * `{{ .RedirectTo }}?token_hash=…&type=…` (supabase/templates/).
 */

export const RUTA_CONFIRMAR = '/auth/confirmar'
export const RUTA_CALLBACK_OAUTH = '/auth/callback'

/** URL absoluta dentro del origen actual (preview, producción o localhost). */
export function appUrl(ruta: string): string {
  return new URL(ruta, window.location.origin).toString()
}

export interface SignUpInput {
  nombre: string
  email: string
  password: string
  /** La UI solo llama al registro con la casilla marcada (CA-42). */
  aceptaTerminos: true
}

export async function signUp(input: SignUpInput) {
  const { data, error } = await supabase.auth.signUp({
    email: normalizarEmail(input.email),
    password: input.password,
    options: {
      // El trigger handle_new_user lee estas claves (nombre y consentimiento).
      data: {
        nombre: normalizarNombre(input.nombre),
        terminos_aceptados: input.aceptaTerminos,
      },
      emailRedirectTo: appUrl(RUTA_CONFIRMAR),
    },
  })
  if (error) throw error
  return data
}

export interface SignInInput {
  email: string
  password: string
}

export async function signIn(input: SignInInput) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizarEmail(input.email),
    password: input.password,
  })
  if (error) throw error
  return data
}

/** Redirige a Google (PKCE). Al volver, `/auth/callback` intercambia el código. */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: appUrl(RUTA_CALLBACK_OAUTH) },
  })
  if (error) throw error
  return data
}

export async function resendConfirmation(email: string) {
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalizarEmail(email),
    options: { emailRedirectTo: appUrl(RUTA_CONFIRMAR) },
  })
  if (error) throw error
}

/** Misma respuesta exista o no el correo (CA-13): Supabase no lo revela. */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(
    normalizarEmail(email),
    { redirectTo: appUrl(RUTA_CONFIRMAR) },
  )
  if (error) throw error
}

/** Requiere la sesión de recuperación que deja `verifyEmailLink('recovery')`. */
export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  return data
}

export const EMAIL_LINK_TYPES = ['email', 'recovery', 'email_change'] as const
export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number]

export function parseEmailLinkType(
  valor: string | null | undefined,
): EmailLinkType | null {
  return EMAIL_LINK_TYPES.find((tipo) => tipo === valor) ?? null
}

export interface VerifyEmailLinkInput {
  tokenHash: string
  type: EmailLinkType
}

export async function verifyEmailLink(input: VerifyEmailLinkInput) {
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: input.tokenHash,
    type: input.type,
  })
  if (error) throw error
  return data
}

export async function exchangeOAuthCode(code: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) throw error
  return data
}

/**
 * Cierra la sesión de este navegador (RF-06). supabase-js borra la sesión local
 * aunque falle la llamada al servidor y emite `SIGNED_OUT`; el listener limpia
 * store y caché. Solo se lanza el error si la sesión local sigue existiendo.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (!error) return
  const { data } = await supabase.auth.getSession()
  if (data.session) throw error
}
