import type { ComponentType, SVGProps } from 'react'
import { NavLink, Outlet } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import {
  ChatIcon,
  HomeIcon,
  LogoutIcon,
  PlusIcon,
  UserIcon,
} from '@/components/icons'
import { Logo } from '@/components/Logo'
import { mapAuthError } from '@/features/auth/errors'
import { useCerrarSesion } from '@/features/auth/useCerrarSesion'

interface Destino {
  to: string
  label: string
  icono: ComponentType<SVGProps<SVGSVGElement>>
}

/** RF-14: en fase 1 todos los roles ven los cuatro destinos. */
const DESTINOS: readonly Destino[] = [
  { to: '/', label: 'Feed', icono: HomeIcon },
  { to: '/publicar', label: 'Publicar', icono: PlusIcon },
  { to: '/chat', label: 'Chat', icono: ChatIcon },
  { to: '/perfil', label: 'Perfil', icono: UserIcon },
]

/**
 * Layout autenticado (skill responsive-view, RF-18): barra lateral en `md+`,
 * pestañas inferiores fijas en celular. `main` deja espacio para las pestañas
 * y el área segura (CA-30).
 */
export function AppLayout() {
  const { cerrar, signOut } = useCerrarSesion()

  return (
    <div className="min-h-dvh bg-fondo text-texto md:grid md:grid-cols-[240px_1fr]">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-fondo focus:p-3"
      >
        Saltar al contenido
      </a>

      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:flex-col md:gap-6 md:border-r md:border-borde/40 md:p-4">
        <Logo className="px-3" />
        <nav aria-label="Principal" className="flex flex-col gap-1">
          {DESTINOS.map(({ to, label, icono: Icono }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 ${
                  isActive
                    ? 'bg-limon-celeste-claro font-semibold text-limon-verde-oscuro'
                    : 'text-texto-suave hover:bg-limon-celeste-claro hover:text-texto'
                }`
              }
            >
              <Icono className="size-5" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2">
          {signOut.isError ? (
            <Alert>{mapAuthError(signOut.error)}</Alert>
          ) : null}
          <Button
            variante="texto"
            icono={<LogoutIcon className="size-5" />}
            onClick={() => void cerrar()}
            cargando={signOut.isPending}
            className="justify-start"
          >
            Cerrar sesión
          </Button>
        </div>
      </aside>

      <main
        id="contenido"
        tabIndex={-1}
        className="min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0"
      >
        <Outlet />
      </main>

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 border-t border-borde/40 bg-fondo pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {DESTINOS.map(({ to, label, icono: Icono }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                isActive
                  ? 'font-semibold text-limon-verde-oscuro'
                  : 'text-texto-suave'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icono className="size-6" />
                <span>{label}</span>
                <span
                  aria-hidden="true"
                  className={`h-1 w-8 rounded-full ${isActive ? 'bg-limon-verde-oscuro' : 'bg-fondo'}`}
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
