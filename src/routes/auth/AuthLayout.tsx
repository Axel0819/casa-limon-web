import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { Logo } from '@/components/Logo'

/** Marco de las pantallas sin sesión: logo y tarjeta centrada. */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center bg-limon-celeste-claro px-4 py-8 md:justify-center">
      <header className="mb-6">
        <Logo />
      </header>
      <main className="w-full max-w-md rounded-2xl bg-fondo p-6 shadow-sm md:p-8">
        {children}
      </main>
    </div>
  )
}

/** Layout de `/ingresar`, `/registro` y `/recuperar`. */
export function AuthLayout() {
  return (
    <AuthShell>
      <Outlet />
    </AuthShell>
  )
}
