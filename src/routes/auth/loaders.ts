import { redirect, type LoaderFunctionArgs } from 'react-router'
import {
  exchangeOAuthCode,
  parseEmailLinkType,
  verifyEmailLink,
  type EmailLinkType,
} from '@/features/auth/api'
import { tomarVolverOAuth } from '@/features/auth/volver'
import { sessionReady } from '@/lib/auth-listener'

export const AVISO_OAUTH = 'oauth-cancelado'
const INGRESAR_CON_AVISO = `/ingresar?aviso=${AVISO_OAUTH}`

/**
 * `/auth/callback` (PKCE). Con `?code` intercambia el código y vuelve a la ruta
 * guardada antes de ir a Google; con `?error` (cancelado o denegado) o si el
 * intercambio falla, vuelve a `/ingresar` con un aviso de texto fijo (CA-10).
 * Nunca muestra `error_description`.
 */
export async function oauthCallbackLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const volver = tomarVolverOAuth()

  if (url.searchParams.has('error') || !code) throw redirect(INGRESAR_CON_AVISO)

  await sessionReady()
  let ok = true
  try {
    await exchangeOAuthCode(code)
  } catch {
    ok = false
  }
  throw redirect(ok ? (volver ?? '/') : INGRESAR_CON_AVISO)
}

export interface ConfirmarData {
  /** Tipo de enlace inválido, para ofrecer la acción correcta. */
  tipo: EmailLinkType | null
}

/** Quita `token_hash` y `type` de la barra de direcciones (Nota T14, B-3). */
function limpiarTokenDeLaUrl() {
  const actual = new URL(window.location.href)
  if (!actual.searchParams.has('token_hash')) return
  actual.searchParams.delete('token_hash')
  actual.searchParams.delete('type')
  window.history.replaceState(
    window.history.state,
    '',
    `${actual.pathname}${actual.search}${actual.hash}`,
  )
}

/**
 * `/auth/confirmar?token_hash=…&type=…` (plantillas de correo). Verifica el
 * enlace una sola vez: `email` → `/` (la guarda manda al onboarding, CA-03),
 * `recovery` → `/restablecer` (CA-14). Si falla, redirige a la misma ruta sin
 * token (`?tipo=`), que muestra "enlace inválido" (CA-15), así el token nunca
 * queda en la URL final.
 */
export async function confirmLinkLoader({
  request,
}: LoaderFunctionArgs): Promise<ConfirmarData> {
  const url = new URL(request.url)
  const tokenHash = url.searchParams.get('token_hash')
  const tipo = parseEmailLinkType(
    url.searchParams.get('type') ?? url.searchParams.get('tipo'),
  )

  if (!tokenHash || !tipo) return { tipo }

  await sessionReady()
  const verificacion = verifyEmailLink({ tokenHash, type: tipo })
  limpiarTokenDeLaUrl()

  let ok = true
  try {
    await verificacion
  } catch {
    ok = false
  }
  if (!ok) throw redirect(`/auth/confirmar?tipo=${tipo}`)
  throw redirect(tipo === 'recovery' ? '/restablecer' : '/')
}

export interface RestablecerData {
  conSesion: boolean
}

/** `/restablecer` exige la sesión de recuperación; sin ella, "enlace inválido". */
export async function restablecerLoader(): Promise<RestablecerData> {
  const session = await sessionReady()
  return { conSesion: session !== null }
}
