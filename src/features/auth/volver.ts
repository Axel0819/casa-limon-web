import { safeVolver } from '@/lib/redirect'

/**
 * Ruta de retorno durante el ingreso con Google: se guarda en `sessionStorage`
 * antes de salir hacia Google y se lee una sola vez en `/auth/callback`, para no
 * depender de query strings en la allowlist de redirecciones.
 */
const CLAVE = 'casalimon:volver-oauth'

export function guardarVolverOAuth(volver: string | null | undefined): void {
  try {
    const seguro = safeVolver(volver)
    if (seguro) sessionStorage.setItem(CLAVE, seguro)
    else sessionStorage.removeItem(CLAVE)
  } catch {
    // Almacenamiento no disponible (modo privado estricto): se vuelve a "/".
  }
}

/** Devuelve la ruta guardada (validada de nuevo) y la borra. */
export function tomarVolverOAuth(): string | null {
  try {
    const valor = sessionStorage.getItem(CLAVE)
    sessionStorage.removeItem(CLAVE)
    return safeVolver(valor)
  } catch {
    return null
  }
}
