import { createBrowserRouter, type RouteObject } from 'react-router'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { AppLayout } from '@/routes/AppLayout'
import { AuthLayout } from '@/routes/auth/AuthLayout'
import { CallbackRoute } from '@/routes/auth/CallbackRoute'
import { ConfirmarRoute } from '@/routes/auth/ConfirmarRoute'
import { IngresarRoute } from '@/routes/auth/IngresarRoute'
import {
  confirmLinkLoader,
  oauthCallbackLoader,
  restablecerLoader,
} from '@/routes/auth/loaders'
import { RecuperarRoute } from '@/routes/auth/RecuperarRoute'
import { RegistroRoute } from '@/routes/auth/RegistroRoute'
import { RestablecerRoute } from '@/routes/auth/RestablecerRoute'
import { ChatRoute } from '@/routes/ChatRoute'
import { FeedRoute } from '@/routes/FeedRoute'
import {
  guestOnlyLoader,
  onboardingLoader,
  requireAuthLoader,
  requireProfileLoader,
  rootLoader,
} from '@/routes/guards'
import { PrivacidadRoute } from '@/routes/legal/PrivacidadRoute'
import { TerminosRoute } from '@/routes/legal/TerminosRoute'
import { NotFoundRoute } from '@/routes/NotFoundRoute'
import { OnboardingRoute } from '@/routes/OnboardingRoute'
import { PerfilRoute } from '@/routes/PerfilRoute'
import { ProfileErrorState } from '@/routes/ProfileErrorState'
import { PublicarRoute } from '@/routes/PublicarRoute'
import { RootErrorBoundary } from '@/routes/RootErrorBoundary'

/** Árbol de rutas del plan ("Rutas y guardas"). Lo usan la app y las pruebas. */
export const routes: RouteObject[] = [
  {
    id: 'root',
    path: '/',
    loader: rootLoader,
    HydrateFallback: FullScreenLoader,
    ErrorBoundary: RootErrorBoundary,
    children: [
      {
        loader: guestOnlyLoader,
        Component: AuthLayout,
        children: [
          { path: 'ingresar', Component: IngresarRoute },
          { path: 'registro', Component: RegistroRoute },
          { path: 'recuperar', Component: RecuperarRoute },
        ],
      },
      {
        path: 'restablecer',
        loader: restablecerLoader,
        Component: RestablecerRoute,
      },
      {
        path: 'auth/callback',
        loader: oauthCallbackLoader,
        Component: CallbackRoute,
      },
      {
        path: 'auth/confirmar',
        loader: confirmLinkLoader,
        Component: ConfirmarRoute,
      },
      { path: 'terminos', Component: TerminosRoute },
      { path: 'privacidad', Component: PrivacidadRoute },
      {
        loader: requireAuthLoader,
        children: [
          {
            path: 'bienvenida',
            loader: onboardingLoader,
            Component: OnboardingRoute,
            ErrorBoundary: ProfileErrorState,
          },
          {
            loader: requireProfileLoader,
            Component: AppLayout,
            ErrorBoundary: ProfileErrorState,
            children: [
              { index: true, Component: FeedRoute },
              { path: 'publicar', Component: PublicarRoute },
              { path: 'chat', Component: ChatRoute },
              { path: 'perfil', Component: PerfilRoute },
            ],
          },
        ],
      },
      { path: '*', Component: NotFoundRoute },
    ],
  },
]

export function createAppRouter() {
  return createBrowserRouter(routes)
}
