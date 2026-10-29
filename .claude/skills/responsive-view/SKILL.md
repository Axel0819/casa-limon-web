---
name: responsive-view
description: Patrón de vista mobile-first de CasaLimón con React Router + Tailwind CSS v4 - layout con navegación inferior en celular y barra lateral en escritorio, tokens de color de Limón (blanco, verde, celeste) y estados de carga/vacío/error. Úsala al crear una ruta o pantalla nueva.
---

# Vista responsive

## Tokens de diseño (`src/index.css`)

```css
@import "tailwindcss";

@theme {
  --color-limon-verde: #1f9d55;
  --color-limon-verde-oscuro: #157a41;
  --color-limon-celeste: #38b6e8;
  --color-limon-celeste-claro: #e6f6fd;
  --color-fondo: #ffffff;
  --color-texto: #1b2a22;
  --color-texto-suave: #5b6b62;
  --font-sans: "Inter", system-ui, sans-serif;
}
```

Usa `bg-limon-verde`, `text-limon-celeste`, etc. Ningún color fuera de los tokens. (Valores iniciales; ajústalos si se define una guía visual.)

## Layout autenticado (`src/routes/AppLayout.tsx`)

```tsx
import { NavLink, Outlet } from 'react-router'

const tabs = [
  { to: '/', label: 'Feed', icon: HomeIcon },
  { to: '/publicar', label: 'Publicar', icon: PlusIcon },
  { to: '/chat', label: 'Chat', icon: ChatIcon },
  { to: '/perfil', label: 'Perfil', icon: UserIcon },
]

export function AppLayout() {
  return (
    <div className="min-h-dvh bg-fondo text-texto md:grid md:grid-cols-[240px_1fr]">
      {/* Escritorio: barra lateral */}
      <aside className="hidden md:flex md:flex-col md:gap-1 md:border-r md:p-4">
        <span className="mb-6 text-xl font-bold text-limon-verde">CasaLimón</span>
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? 'bg-limon-celeste-claro text-limon-verde-oscuro font-semibold' : 'text-texto-suave hover:bg-limon-celeste-claro'}`}>
            <t.icon aria-hidden className="size-5" /> {t.label}
          </NavLink>
        ))}
      </aside>

      <main className="pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Celular: pestañas inferiores */}
      <nav aria-label="Principal"
        className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t bg-fondo pb-[env(safe-area-inset-bottom)] md:hidden">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center text-xs ${isActive ? 'text-limon-verde' : 'text-texto-suave'}`}>
            <t.icon aria-hidden className="size-6" /> {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
```

Las rutas que deben ir a pantalla completa en celular (conversación abierta) usan un layout propio sin pestañas.

## Chat: dividido en escritorio, pantalla completa en celular

```tsx
<div className="h-dvh md:grid md:grid-cols-[320px_1fr]">
  <ConversationList className={conversationId ? 'hidden md:block' : 'block'} />
  <section className={conversationId ? 'block' : 'hidden md:flex md:items-center md:justify-center'}>
    {conversationId ? <MessageThread id={conversationId} /> : <p className="text-texto-suave">Elegí una conversación</p>}
  </section>
</div>
```

## Esqueleto de una vista con datos

```tsx
export function FeedRoute() {
  const filtros = useFeedFilters()           // Zustand
  const { data, isPending, isError, refetch } = usePosts(filtros)

  if (isPending) return <FeedSkeleton />
  if (isError) return <ErrorState mensaje="No pudimos cargar las solicitudes." onRetry={refetch} />
  if (!data.length) return <EmptyState titulo="Todavía no hay solicitudes en esta zona" accion={{ label: 'Cambiar filtros', ... }} />

  return (
    <ul className="mx-auto grid max-w-3xl gap-3 p-4 md:grid-cols-2">
      {data.map((p) => <li key={p.id}><PostCard post={p} /></li>)}
    </ul>
  )
}
```

## Checklist

- [ ] Se ve bien a 375px y a ≥1024px.
- [ ] Carga, vacío y error cubiertos.
- [ ] Objetivos táctiles ≥ 44px, `label` en inputs, foco visible, contraste AA.
- [ ] `min-h-dvh` / `safe-area-inset` para PWA instalada.
- [ ] Textos en español.
