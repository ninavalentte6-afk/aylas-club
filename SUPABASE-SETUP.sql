-- AVISO: SETUP INICIAL APENAS para projeto Supabase NOVO. NÃO EXECUTAR sobre o banco Ayla’s Club já existente.
-- Consulte AYLAS-CLUB-MIGRACAO-COMPATIVEL.sql para a migração da versão atual.

-- AYLA'S CLUB | Estrutura inicial de produção
-- Execute uma única vez no Supabase > SQL Editor > New query.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.aylas_new_profile()
returns trigger language plpgsql security definer set search_path = public
as $$ begin
  insert into public.profiles(id, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'display_name',''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists ayla_auth_user_created on auth.users;
create trigger ayla_auth_user_created after insert on auth.users
for each row execute procedure public.aylas_new_profile();

create or replace function public.aylas_is_admin()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.profiles where id = auth.uid() and is_admin = true); $$;

create table if not exists public.site_settings (
  id integer primary key check (id=1),
  name text not null default 'Ayla''s Club',
  handle text not null default 'aylasclub',
  bio text not null default 'Bem-vindo ao Ayla''s Club! Novidades, conteúdos exclusivos e atualizações da comunidade.',
  accent text not null default '#ff3d62',
  banner integer not null default 0,
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values (1) on conflict (id) do nothing;

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(10,2) not null default 0 check(price >= 0),
  months integer not null default 1 check(months > 0),
  active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check(type in ('photo','video')),
  album text not null default 'Novidades',
  access text not null default 'subs' check(access in ('free','subs','extra')),
  price numeric(10,2) not null default 0 check(price >= 0),
  storage_bucket text not null check(storage_bucket in ('aylas-public','aylas-private')),
  storage_path text not null,
  is_new boolean not null default true,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reels (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  storage_bucket text not null check(storage_bucket in ('aylas-public','aylas-private')),
  storage_path text not null,
  is_free boolean not null default false,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id uuid references public.plans(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','active','canceled','expired')),
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.plans enable row level security;
alter table public.media enable row level security;
alter table public.reels enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profile self or admin read" on public.profiles;
create policy "profile self or admin read" on public.profiles for select to authenticated using (id=auth.uid() or public.aylas_is_admin());
drop policy if exists "admin update profiles" on public.profiles;
create policy "admin update profiles" on public.profiles for update to authenticated using (public.aylas_is_admin()) with check (public.aylas_is_admin());

drop policy if exists "public read settings" on public.site_settings;
create policy "public read settings" on public.site_settings for select to anon,authenticated using (true);
drop policy if exists "admin manage settings" on public.site_settings;
create policy "admin manage settings" on public.site_settings for all to authenticated using (public.aylas_is_admin()) with check (public.aylas_is_admin());

drop policy if exists "public read active plans" on public.plans;
create policy "public read active plans" on public.plans for select to anon,authenticated using (active=true or public.aylas_is_admin());
drop policy if exists "admin manage plans" on public.plans;
create policy "admin manage plans" on public.plans for all to authenticated using (public.aylas_is_admin()) with check (public.aylas_is_admin());

drop policy if exists "read public media or own access" on public.media;
create policy "read public media or own access" on public.media for select to anon,authenticated using (
  (published=true and access='free') or public.aylas_is_admin() or
  (auth.uid() is not null and exists(select 1 from public.subscriptions s where s.user_id=auth.uid() and s.status='active' and (s.current_period_end is null or s.current_period_end>now())) and published=true)
);
drop policy if exists "admin manage media" on public.media;
create policy "admin manage media" on public.media for all to authenticated using (public.aylas_is_admin()) with check (public.aylas_is_admin());

drop policy if exists "read published reels" on public.reels;
create policy "read published reels" on public.reels for select to anon,authenticated using (published=true and (is_free=true or public.aylas_is_admin() or exists(select 1 from public.subscriptions s where s.user_id=auth.uid() and s.status='active' and (s.current_period_end is null or s.current_period_end>now()))));
drop policy if exists "admin manage reels" on public.reels;
create policy "admin manage reels" on public.reels for all to authenticated using (public.aylas_is_admin()) with check (public.aylas_is_admin());

drop policy if exists "read own subscriptions or admin" on public.subscriptions;
create policy "read own subscriptions or admin" on public.subscriptions for select to authenticated using (user_id=auth.uid() or public.aylas_is_admin());
drop policy if exists "admin manage subscriptions" on public.subscriptions;
create policy "admin manage subscriptions" on public.subscriptions for all to authenticated using (public.aylas_is_admin()) with check (public.aylas_is_admin());

-- Buckets: conteúdo gratuito público; conteúdo de membros privado.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('aylas-public','aylas-public',true,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=true;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('aylas-private','aylas-private',false,52428800,array['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'])
on conflict (id) do update set public=false;

drop policy if exists "admin upload ayla files" on storage.objects;
create policy "admin upload ayla files" on storage.objects for insert to authenticated with check (bucket_id in ('aylas-public','aylas-private') and public.aylas_is_admin());
drop policy if exists "admin update ayla files" on storage.objects;
create policy "admin update ayla files" on storage.objects for update to authenticated using (bucket_id in ('aylas-public','aylas-private') and public.aylas_is_admin()) with check (bucket_id in ('aylas-public','aylas-private') and public.aylas_is_admin());
drop policy if exists "admin delete ayla files" on storage.objects;
create policy "admin delete ayla files" on storage.objects for delete to authenticated using (bucket_id in ('aylas-public','aylas-private') and public.aylas_is_admin());
drop policy if exists "public read free files" on storage.objects;
create policy "public read free files" on storage.objects for select to anon,authenticated using (bucket_id='aylas-public');
drop policy if exists "active members read private files" on storage.objects;
create policy "active members read private files" on storage.objects for select to authenticated using (bucket_id='aylas-private' and (public.aylas_is_admin() or exists(select 1 from public.subscriptions s where s.user_id=auth.uid() and s.status='active' and (s.current_period_end is null or s.current_period_end>now()))));

-- Depois de criar sua conta pelo fluxo de cadastro do Supabase Auth, torne-a administradora:
-- update public.profiles set is_admin=true where id=(select id from auth.users where email='SEU_EMAIL');
