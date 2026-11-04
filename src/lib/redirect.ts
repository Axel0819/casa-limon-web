/**
 * Valida el parámetro `volver` (ruta de retorno tras ingresar, RF-16, CA-28).
 *
 * Solo acepta rutas internas absolutas ("/chat", "/perfil?tab=1"). Rechaza URLs
 * absolutas, rutas relativas al protocolo ("//evil.com", "/\\evil.com"),
 * esquemas como `javascript:`, caracteres de control y las rutas `/auth/*`
 * (callback y confirmación se ejecutan una sola vez y no deben repetirse).
 * Devuelve la ruta normalizada o `null`.
 */
const ORIGEN_BASE = 'https://casalimon.invalid'

export function safeVolver(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null
  if (valor.length === 0 || valor.length > 2048) return null
  if (!valor.startsWith('/')) return null
  if (valor.startsWith('//')) return null
  if (valor.includes('\\')) return null
  // eslint-disable-next-line no-control-regex -- se buscan justamente caracteres de control
  if (/[\u0000-\u001F\u007F]/.test(valor)) return null

  let url: URL
  try {
    url = new URL(valor, ORIGEN_BASE)
  } catch {
    return null
  }
  if (url.origin !== ORIGEN_BASE) return null

  const ruta = `${url.pathname}${url.search}${url.hash}`
  if (ruta === '/auth' || ruta.startsWith('/auth/')) return null
  return ruta
}
