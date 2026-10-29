---
name: supabase-rls-policy
description: Patrones estándar de migración SQL y políticas Row Level Security de Supabase para CasaLimón (dueño, lectura autenticada, participantes de conversación, Storage por carpeta de usuario). Úsala al crear o modificar tablas, políticas o buckets en supabase/migrations.
---

# Tabla + políticas RLS estándar

Crea la migración con `pnpm supabase migration new <slug>`. Después: `pnpm supabase db reset` y regenera tipos con `pnpm supabase gen types typescript --local > src/lib/database.types.ts`.

## Reglas

- RLS habilitado en **todas** las tablas.
- Una política por operación (`select`, `insert`, `update`, `delete`), dirigida `to authenticated`.
- `with check` en `insert` y `update` para impedir suplantar el dueño.
- Usa `(select auth.uid())` envuelto en `select` (Postgres lo evalúa una sola vez).
- Indexa toda columna usada en políticas (`user_id`, `owner_id`, participantes).
- Nombres de política descriptivos en español: `"posts: autor puede editar"`.

## Patrón 1 — Recurso con dueño y lectura autenticada (posts, properties)

```sql
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 10 and 2000),
  presupuesto_min integer not null check (presupuesto_min >= 0),
  presupuesto_max integer not null,
  zona text not null,
  tags text[] not null default '{}',
  estado text not null default 'activa' check (estado in ('activa','resuelta','cerrada')),
  created_at timestamptz not null default now(),
  check (presupuesto_max >= presupuesto_min)
);
create index posts_user_id_idx on public.posts (user_id);
create index posts_feed_idx on public.posts (estado, zona, created_at desc);

alter table public.posts enable row level security;

create policy "posts: autenticados pueden leer" on public.posts
  for select to authenticated using (true);
create policy "posts: autor puede crear" on public.posts
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "posts: autor puede editar" on public.posts
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "posts: autor puede borrar" on public.posts
  for delete to authenticated using ((select auth.uid()) = user_id);
```

## Patrón 2 — Solo el dueño ve y gestiona (notifications, push_subscriptions)

```sql
alter table public.notifications enable row level security;
create policy "notifications: dueño lee" on public.notifications
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "notifications: dueño marca leído" on public.notifications
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- inserts solo desde triggers security definer / service role: sin política de insert
```

## Patrón 3 — Visibilidad entre dos partes (offers)

```sql
create policy "offers: owner o autor del post leen" on public.offers
  for select to authenticated using (
    (select auth.uid()) = owner_id
    or exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()))
  );
create policy "offers: owner oferta con propiedad propia" on public.offers
  for insert to authenticated with check (
    (select auth.uid()) = owner_id
    and exists (select 1 from public.properties pr where pr.id = property_id and pr.owner_id = (select auth.uid()))
    and exists (select 1 from public.posts p where p.id = post_id and p.estado = 'activa')
  );
```

## Patrón 4 — Participantes de conversación (conversations, messages)

```sql
create or replace function public.es_participante(conv_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv_id and (select auth.uid()) in (c.buscador_id, c.propietario_id)
  );
$$;

create policy "messages: participantes leen" on public.messages
  for select to authenticated using (public.es_participante(conversation_id));
create policy "messages: participante envía como sí mismo" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and public.es_participante(conversation_id));
```

Para Realtime: `alter publication supabase_realtime add table public.messages, public.notifications;` (Realtime respeta RLS).

## Patrón 5 — Storage por carpeta de usuario

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('property-photos', 'property-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "property-photos: usuario sube a su carpeta" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'property-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy "property-photos: usuario borra lo suyo" on storage.objects
  for delete to authenticated using (
    bucket_id = 'property-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  );
```

## Checklist antes de terminar

- [ ] RLS habilitado y probado con dos usuarios distintos.
- [ ] Ninguna política de escritura con `using (true)`.
- [ ] Funciones `security definer` con `set search_path = ''`.
- [ ] Tipos regenerados.
