import { redirect, type LoaderFunctionArgs } from 'react-router'
import { RUTA_CONFIRMAR } from '@/features/auth/api'
import { profileQuery } from '@/features/profile/queries'
import { needsOnboarding, type Profile } from '@/features/profile/types'
import { sessionReady } from '@/lib/auth-listener'
import { queryClient } from '@/lib/query-client'
import { useSessionStore } from '@/stores/session'

/**
 * Guardas como loaders (plan, "Rutas y guardas"). React Router ejecuta en
 * paralelo los loaders de todas las rutas que coinciden, así que cada guarda
 * espera la sesión inicial por su cuenta en vez de depender de `rootLoader`.
 * Además, como gana la redirección de la ruta más profunda, todas reenvían un
 * `token_hash` que llegue fuera de `/auth/confirmar`.
 */

/**
 * Si Supabase usó el Site URL (R-2), el enlace de correo llega a otra ruta con
 * `token_hash`: se reenvía la query a `/auth/confirmar`.
 */
function reenviarEnlaceDeCorreo(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.has('token_hash') && url.pathname !== RUTA_CONFIRMAR) {
    throw redirect(`${RUTA_CONFIRMAR}${url.search}`)
  }
}

/** Raíz: espera la sesión inicial (CA-16) y reenvía enlaces de correo (R-2). */
export async function rootLoader({ request }: LoaderFunctionArgs) {
  reenviarEnlaceDeCorreo(request)
  await sessionReady()
  return null
}

/** `/ingresar`, `/registro`, `/recuperar`: con sesión → Feed (CA-29). */
export async function guestOnlyLoader({ request }: LoaderFunctionArgs) {
  reenviarEnlaceDeCorreo(request)
  const session = await sessionReady()
  if (session) throw redirect('/')
  return null
}

/** Ruta de ingreso con la ruta actual como `volver` (RF-16, CA-28). */
export function rutaIngresar(request: Request): string {
  const url = new URL(request.url)
  const volver = `${url.pathname}${url.search}`
  if (volver === '/') return '/ingresar'
  return `/ingresar?${new URLSearchParams({ volver }).toString()}`
}

async function requireUserId(request: Request): Promise<string> {
  reenviarEnlaceDeCorreo(request)
  await sessionReady()
  const id = useSessionStore.getState().session?.user.id
  if (!id) throw redirect(rutaIngresar(request))
  return id
}

async function cargarPerfil(request: Request): Promise<Profile> {
  const id = await requireUserId(request)
  return queryClient.ensureQueryData(profileQuery(id))
}

/** Rutas protegidas: sin sesión → `/ingresar?volver=…`. */
export async function requireAuthLoader({ request }: LoaderFunctionArgs) {
  await requireUserId(request)
  return null
}

/** Layout de la app: perfil incompleto → onboarding (CA-18, CA-43). */
export async function requireProfileLoader({ request }: LoaderFunctionArgs) {
  const perfil = await cargarPerfil(request)
  if (needsOnboarding(perfil)) throw redirect('/bienvenida')
  return null
}

/** `/bienvenida`: perfil completo → Feed (RF-12). */
export async function onboardingLoader({ request }: LoaderFunctionArgs) {
  const perfil = await cargarPerfil(request)
  if (!needsOnboarding(perfil)) throw redirect('/')
  return null
}
