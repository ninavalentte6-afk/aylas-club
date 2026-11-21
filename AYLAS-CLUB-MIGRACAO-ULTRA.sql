-- AYLA'S CLUB | Migração incremental de catálogo seguro, leads e identidade visual
-- Não elimina tabelas nem registos existentes. Fazer backup antes de executar.

begin;

alter table public.site_settings
  add column if not exists profile_image_url text,
  add column if not exists cover_image_url text,
  add column if not exists metrics jsonb not null default '[]'::jsonb,
  add column if not exists content jsonb not null default '{}'::jsonb;

alter table public.media
  add column if not exists sort_order integer not null default 0,
  add column if not exists preview_bucket text,
  add column if not exists preview_path text;

alter table public.reels
  add column if not exists sort_order integer not null default 0;

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'subscription_interest',
  plan_id uuid references public.plans(id) on delete set null,
  media_id uuid references public.media(id) on delete set null,
  consent_at timestamptz not null,
  status text not null default 'new'
    check (status in ('new','contacted','interested','converted','not_converted')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists source text not null default 'subscription_interest',
  add column if not exists plan_id uuid references public.plans(id) on delete set null,
  add column if not exists media_id uuid references public.media(id) on delete set null,
  add column if not exists consent_at timestamptz,
  add column if not exists status text not null default 'new',
  add column if not exists notes text,
  add column if not exists created_at timestamptz not null default now();

alter table public.leads enable row level security;

drop policy if exists "lead insert with consent" on public.leads;
create policy "lead insert with consent"
on public.leads for insert to anon, authenticated
with check (
  length(trim(email)) between 5 and 320
  and position('@' in email) > 1
  and consent_at is not null
  and source in ('subscription_interest','extra_interest')
);

drop policy if exists "admin read leads" on public.leads;
create policy "admin read leads" on public.leads for select to authenticated
using (public.aylas_is_admin());

drop policy if exists "admin update leads" on public.leads;
create policy "admin update leads" on public.leads for update to authenticated
using (public.aylas_is_admin()) with check (public.aylas_is_admin());

drop policy if exists "admin delete leads" on public.leads;
create policy "admin delete leads" on public.leads for delete to authenticated
using (public.aylas_is_admin());

grant insert on public.leads to anon, authenticated;
grant select, update, delete on public.leads to authenticated;

-- Views de catálogo: expõem apenas metadados comerciais seguros.
-- Os caminhos dos originais só são expostos para conteúdo gratuito armazenado no bucket público.
create or replace view public.public_media_catalog
with (security_barrier = true) as
select
  id, title, type, album, access, price, published, sort_order, created_at,
  case when access='free' and storage_bucket='aylas-public' then storage_bucket else null end as storage_bucket,
  case when access='free' and storage_bucket='aylas-public' then storage_path else null end as storage_path,
  case when access<>'free' then preview_bucket else null end as preview_bucket,
  case when access<>'free' then preview_path else null end as preview_path
from public.media
where published=true;

create or replace view public.public_reels_catalog
with (security_barrier = true) as
select
  id, title, is_free, published, sort_order, created_at,
  case when is_free=true and storage_bucket='aylas-public' then storage_bucket else null end as storage_bucket,
  case when is_free=true and storage_bucket='aylas-public' then storage_path else null end as storage_path
from public.reels
where published=true;

grant select on public.media, public.reels to anon, authenticated;
grant select on public.public_media_catalog to anon, authenticated;
grant select on public.public_reels_catalog to anon, authenticated;

-- Remove políticas permissivas antigas: políticas RLS permissivas são combinadas com OR.
drop policy if exists "public catalog published media metadata" on public.media;
drop policy if exists "read public media or own access" on public.media;
drop policy if exists "read published reels" on public.reels;
drop policy if exists "public catalog published reels metadata" on public.reels;

create policy "read free or subscribed media"
on public.media for select to anon, authenticated
using (
  (published=true and access='free' and storage_bucket='aylas-public')
  or public.aylas_is_admin()
  or (
    auth.uid() is not null
    and published=true
    and access='subs'
    and storage_bucket='aylas-private'
    and exists (
      select 1 from public.subscriptions s
      where s.user_id=auth.uid()
        and s.status='active'
        and (s.current_period_end is null or s.current_period_end>now())
    )
  )
);

create policy "read free or subscribed reels"
on public.reels for select to anon, authenticated
using (
  (published=true and is_free=true and storage_bucket='aylas-public')
  or public.aylas_is_admin()
  or (
    auth.uid() is not null
    and published=true
    and is_free=false
    and storage_bucket='aylas-private'
    and exists (
      select 1 from public.subscriptions s
      where s.user_id=auth.uid()
        and s.status='active'
        and (s.current_period_end is null or s.current_period_end>now())
    )
  )
);

-- Restringe objetos privados aos ficheiros associados a conteúdos publicados autorizados.
drop policy if exists "active members read private files" on storage.objects;
create policy "members read entitled private media"
on storage.objects for select to authenticated
using (
  bucket_id='aylas-private'
  and (
    public.aylas_is_admin()
    or exists (
      select 1 from public.media m
      where m.storage_bucket='aylas-private'
        and m.storage_path=storage.objects.name
        and m.published=true
        and m.access='subs'
        and exists (
          select 1 from public.subscriptions s
          where s.user_id=auth.uid()
            and s.status='active'
            and (s.current_period_end is null or s.current_period_end>now())
        )
    )
    or exists (
      select 1 from public.reels r
      where r.storage_bucket='aylas-private'
        and r.storage_path=storage.objects.name
        and r.published=true
        and r.is_free=false
        and exists (
          select 1 from public.subscriptions s
          where s.user_id=auth.uid()
            and s.status='active'
            and (s.current_period_end is null or s.current_period_end>now())
        )
    )
  )
);

commit;

-- Diagnóstico obrigatório: qualquer linha encontrada pode indicar original privado no bucket público.
select id,title,access,storage_bucket,storage_path
from public.media
where access in ('subs','extra') and storage_bucket='aylas-public';

select id,title,is_free,storage_bucket,storage_path
from public.reels
where is_free=false and storage_bucket='aylas-public';

-- Confirme também que a chave service_role nunca está no frontend.
