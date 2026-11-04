import { useMutation } from '@tanstack/react-query'
import {
  requestPasswordReset,
  resendConfirmation,
  signIn,
  signInWithGoogle,
  signOut,
  signUp,
  updatePassword,
} from './api'
import { guardarVolverOAuth } from './volver'

/**
 * Mutaciones de auth. La sesión la actualiza el listener de `onAuthStateChange`
 * (store de Zustand y limpieza de caché), así que aquí no se toca la caché.
 * La navegación posterior la decide cada vista en `onSuccess`.
 */

export function useSignUp() {
  return useMutation({ mutationFn: signUp })
}

export function useSignIn() {
  return useMutation({ mutationFn: signIn })
}

/** `volver`: ruta a la que regresar tras el callback (se valida con `safeVolver`). */
export function useGoogleSignIn() {
  return useMutation({
    mutationFn: async (volver: string | null | undefined) => {
      guardarVolverOAuth(volver)
      return signInWithGoogle()
    },
  })
}

export function useResendConfirmation() {
  return useMutation({ mutationFn: resendConfirmation })
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: requestPasswordReset })
}

export function useUpdatePassword() {
  return useMutation({ mutationFn: updatePassword })
}

/** Tras el éxito, la vista navega a `/ingresar` con `replace` (CA-17). */
export function useSignOut() {
  return useMutation({ mutationFn: signOut })
}
