---
name: push-notification
description: Flujo completo de notificaciones de CasaLimón: trigger en Postgres que crea la fila en notifications al insertar una oferta o mensaje, Edge Function que envía Web Push con VAPID, registro de push_subscriptions desde el navegador y manejo en el Service Worker (vite-plugin-pwa). Úsala en la fase 6 o al agregar un nuevo tipo de notificación.
---

# Notificaciones: in-app + Web Push

```
INSERT offers/messages ─► trigger crea fila en notifications ─► (Realtime: aviso in-app)
                                    └─► Database Webhook / pg_net ─► Edge Function send-push
                                                                     └─► web-push a cada push_subscription del usuario
```

## 1. Trigger (migración, agente schema-rls)

```sql
create or replace function public.notificar_nueva_oferta()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notifications (user_id, tipo, referencia_id)
  select p.user_id, 'nueva_oferta', new.id from public.posts p where p.id = new.post_id;
  return new;
end $$;

create trigger offers_notificar after insert on public.offers
  for each row execute function public.notificar_nueva_oferta();
```

Análogo para `messages` → `nuevo_mensaje`, destinatario = el participante que **no** es `sender_id`.

Para el push, configura un **Database Webhook** de Supabase sobre `INSERT` en `public.notifications` apuntando a la Edge Function `send-push`.

## 2. Edge Function `supabase/functions/send-push/index.ts`

```ts
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3'

webpush.setVapidDetails(
  'mailto:' + Deno.env.get('VAPID_CONTACT_EMAIL'),
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

const textos = {
  nueva_oferta: { title: 'Nueva oferta', body: 'Un propietario respondió a tu solicitud.' },
  nuevo_mensaje: { title: 'Nuevo mensaje', body: 'Tenés un mensaje nuevo.' },
} as const

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('WEBHOOK_SECRET')) {
    return new Response('forbidden', { status: 403 })
  }
  const { record } = await req.json() // fila de notifications
  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('user_id', record.user_id)

  const payload = JSON.stringify({ ...textos[record.tipo as keyof typeof textos], tipo: record.tipo, referenciaId: record.referencia_id })
  await Promise.all((subs ?? []).map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload)
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 410 || (e as { statusCode?: number }).statusCode === 404) {
        await admin.from('push_subscriptions').delete().eq('id', s.id) // suscripción caducada
      }
    }
  }))
  return new Response('ok')
})
```

Secrets: `pnpm supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_CONTACT_EMAIL=... WEBHOOK_SECRET=...`. La clave privada VAPID y la service role **nunca** van al frontend. Genera VAPID con `npx web-push generate-vapid-keys`.

## 3. Suscripción desde el navegador (`src/features/notifications/push.ts`)

```ts
export async function suscribirPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'no-soportado'
  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') return 'denegado'
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
  })
  const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
  const { error } = await supabase.from('push_subscriptions')
    .upsert({ user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth }, { onConflict: 'endpoint' })
  if (error) throw error
  return 'ok'
}
```

Pide permiso **tras una acción del usuario** (botón "Activar avisos"), nunca al cargar la página.

## 4. Service Worker (vite-plugin-pwa con `strategies: 'injectManifest'`)

```ts
// src/sw.ts
/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'
declare const self: ServiceWorkerGlobalScope
precacheAndRoute(self.__WB_MANIFEST)

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(self.registration.showNotification(data.title ?? 'CasaLimón', {
    body: data.body, icon: '/icons/icon-192.png', badge: '/icons/badge-72.png',
    data: { url: data.tipo === 'nuevo_mensaje' ? `/chat` : `/perfil/ofertas` },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(self.clients.openWindow(event.notification.data.url))
})
```

## iOS

Web Push en iPhone solo funciona con la PWA **instalada** (iOS 16.4+). Detecta iOS sin `display-mode: standalone` y muestra una guía "Agregar a pantalla de inicio" en lugar del botón de activar avisos. Respaldo por email: decisión a declarar en la spec.
