-- AYLA'S CLUB | Atualização funcional: catálogo, métricas e ordenação
-- Idempotente: pode ser executado mais de uma vez. Não apaga nem reescreve registos.
-- Execute no Supabase SQL Editor ANTES de publicar esta versão.

-- 1) Ordem persistente de mídias e reels.
alter table public.media
  add column if not exists sort_order integer not null default 0;

alter table public.reels
  add column if not exists sort_order integer not null default 0;

-- 2) Métricas editáveis guardadas na configuração já existente.
-- Formato esperado: JSON array com label, kind, value/source, visible e sort_order.
alter table public.site_settings
  add column if not exists metrics jsonb not null default '[]'::jsonb;

-- 3) Permitir que o catálogo público leia os metadados de conteúdos publicados.
-- IMPORTANTE: isto não concede acesso aos ficheiros do bucket privado.
-- Os objetos privados continuam protegidos pelas políticas de storage.objects.
drop policy if exists "public catalog published media metadata" on public.media;
create policy "public catalog published media metadata"
on public.media
for select
to anon, authenticated
using (published = true);

drop policy if exists "public catalog published reels metadata" on public.reels;
create policy "public catalog published reels metadata"
on public.reels
for select
to anon, authenticated
using (published = true);

-- 4) Permissões de leitura para o catálogo público.
grant select on table public.media to anon, authenticated;
grant select on table public.reels to anon, authenticated;
grant select on table public.site_settings to anon, authenticated;

-- Não são criadas permissões de escrita para utilizadores comuns.
-- As operações de escrita continuam sujeitas aos GRANTs existentes e às políticas
-- administrativas RLS já configuradas no projeto.

-- 5) Diagnóstico: resultados aqui indicam objetos cuja localização não corresponde
-- ao tipo de acesso. Corrija/mova esses arquivos no painel como administradora.
select id, title, access, storage_bucket, storage_path
from public.media
where (access in ('subs','extra') and storage_bucket = 'aylas-public')
   or (access = 'free' and storage_bucket <> 'aylas-public');

select id, title, is_free, storage_bucket, storage_path
from public.reels
where (is_free = false and storage_bucket = 'aylas-public')
   or (is_free = true and storage_bucket <> 'aylas-public');

-- 5) Pré-visualizações desfocadas para imagens privadas.
-- O original continua no bucket privado; somente a miniatura derivada fica pública.
alter table public.media
  add column if not exists preview_bucket text,
  add column if not exists preview_path text;

-- O bucket aylas-public é destinado a arquivos públicos e prévias.
-- Esta política permite leitura das miniaturas públicas; não concede leitura do bucket privado.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='storage' and tablename='objects'
      and policyname='Ayla public bucket preview read'
  ) then
    create policy "Ayla public bucket preview read"
      on storage.objects for select
      to anon, authenticated
      using (bucket_id = 'aylas-public');
  end if;
end $$;

-- 6) Conteúdo textual flexível da página.
alter table public.site_settings
  add column if not exists content jsonb not null default '{}'::jsonb;
