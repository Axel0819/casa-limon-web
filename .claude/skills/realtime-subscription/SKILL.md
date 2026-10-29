---
name: realtime-subscription
description: Patrón de suscripción Supabase Realtime integrado con la caché de TanStack Query para CasaLimón (mensajes del chat y notificaciones in-app). Úsala al implementar el chat en tiempo real o los avisos en vivo.
---

# Realtime + TanStack Query

Realtime no reemplaza a TanStack Query: la carga inicial es un `useQuery`, y la suscripción **escribe en la misma caché** cuando llegan cambios.

## Requisitos en la base de datos

- La tabla está en la publicación: `alter publication supabase_realtime add table public.messages;`
- RLS de `select` correcta (Realtime solo entrega filas que el usuario puede leer) — ver skill `supabase-rls-policy`.

## Hook de suscripción

```ts
// src/features/chat/useMessagesRealtime.ts
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { chatKeys } from './queries'
import type { Message } from './types'

export function useMessagesRealtime(conversationId: string) {
  const qc = useQueryClient()

  useEffect(() => {
    if (!conversationId) return
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on<Message>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        ({ new: msg }) => {
          qc.setQueryData<Message[]>(chatKeys.messages(conversationId), (old = []) =>
            old.some((m) => m.id === msg.id) ? old : [...old, msg],
          )
          qc.invalidateQueries({ queryKey: chatKeys.conversations() }) // último mensaje / orden
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId, qc])
}
```

Uso en la vista:

```ts
const { data: messages } = useMessages(conversationId) // useQuery inicial
useMessagesRealtime(conversationId)
```

## Envío optimista

En `useSendMessage`, inserta en `onMutate` un mensaje temporal con `id` `temp-<uuid>` y estado "enviando"; en `onSuccess` reemplázalo por la fila real. El deduplicado por `id` del hook evita duplicados cuando llega el evento Realtime.

## Notificaciones in-app

Mismo patrón con un canal por usuario: `notifications:<uid>`, filtro `user_id=eq.<uid>`, evento `INSERT`; actualiza `notificationKeys.list()` y el contador de no leídos. Monta el hook una sola vez en el layout autenticado.

## Reglas

- Siempre `removeChannel` en el cleanup (evita fugas y eventos duplicados con StrictMode).
- Un canal por recurso visible; no suscribirse a tablas completas sin `filter`.
- Al reconectar (`subscribe` callback con `SUBSCRIBED` tras `CHANNEL_ERROR`/`TIMED_OUT`), invalida la query para recuperar mensajes perdidos.
- Ordena por `created_at` al renderizar; no confíes en el orden de llegada.
