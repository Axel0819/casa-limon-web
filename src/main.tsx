import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router/dom'
import { initAuthListener } from '@/lib/auth-listener'
import { queryClient } from '@/lib/query-client'
import { createAppRouter } from '@/router'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('No se encontró el elemento #root')

// Orden: crear el router (sus loaders esperan sessionReady()), luego el único
// listener de auth (emite INITIAL_SESSION) y por último renderizar.
const router = createAppRouter()
initAuthListener(router, queryClient)

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
