-- ==========================================
-- ROYAL DESIRES
-- BASE DE DATOS INICIAL PARA SUPABASE
-- ==========================================

-- TABLA 1: DESEOS DE LOS USUARIOS

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 100),
  category text not null,
  description text not null default '' check (char_length(description) <= 500),
  status text not null default 'pending'
    check (status in ('pending', 'fulfilled')),
  created_at timestamptz not null default now()
);

-- TABLA 2: SOLICITUDES PARA CUMPLIR DESEOS

create table if not exists public.help_requests (
  id uuid primary key default gen_random_uuid(),
  wish_id uuid not null references public.wishes(id) on delete cascade,
  helper_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'sent'
    check (status in ('sent', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (wish_id, helper_id)
);

-- ACTIVAR SEGURIDAD RLS

alter table public.wishes enable row level security;
alter table public.help_requests enable row level security;

-- ==========================================
-- POLITICAS DE SEGURIDAD: DESEOS
-- ==========================================

-- Los usuarios autenticados pueden consultar deseos.

create policy "Authenticated users can read wishes"
on public.wishes
for select
to authenticated
using (true);

-- Cada usuario puede publicar sus propios deseos.

create policy "Users can publish their own wishes"
on public.wishes
for insert
to authenticated
with check (auth.uid() = user_id);

-- Cada usuario puede modificar sus propios deseos.

create policy "Owners can update their own wishes"
on public.wishes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Cada usuario puede eliminar sus propios deseos.

create policy "Owners can delete their own wishes"
on public.wishes
for delete
to authenticated
using (auth.uid() = user_id);

-- ==========================================
-- POLITICAS DE SEGURIDAD: SOLICITUDES
-- ==========================================

-- Los ayudantes pueden enviar solicitudes
-- para deseos pendientes de otras personas.

create policy "Helpers can send help requests"
on public.help_requests
for insert
to authenticated
with check (
  auth.uid() = helper_id
  and exists (
    select 1
    from public.wishes w
    where w.id = wish_id
      and w.user_id <> auth.uid()
      and w.status = 'pending'
  )
);

-- El ayudante y el propietario pueden
-- consultar las solicitudes correspondientes.

create policy "Wish owners and helpers can read requests"
on public.help_requests
for select
to authenticated
using (
  auth.uid() = helper_id
  or exists (
    select 1
    from public.wishes w
    where w.id = wish_id
      and w.user_id = auth.uid()
  )
);

-- Solo el propietario puede aceptar o rechazar
-- una solicitud y únicamente cambiar su estado.

create policy "Wish owners can update request status"
on public.help_requests
for update
to authenticated
using (
  exists (
    select 1
    from public.wishes w
    where w.id = wish_id
      and w.user_id = auth.uid()
  )
)
with check (
  status in ('accepted', 'declined')
  and exists (
    select 1
    from public.wishes w
    where w.id = wish_id
      and w.user_id = auth.uid()
  )
);

-- ==========================================
-- PERMISOS DE ACCESO
-- ==========================================

grant usage on schema public to authenticated;

grant select, insert, update, delete
on public.wishes to authenticated;

grant select, insert
on public.help_requests to authenticated;

revoke update on public.help_requests from authenticated;

grant update (status)
on public.help_requests to authenticated;

-- ==========================================
-- FIN DEL ESQUEMA ROYAL DESIRES
-- ==========================================