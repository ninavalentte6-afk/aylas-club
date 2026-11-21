-- AYLA'S CLUB | MIGRAÇÃO COMPATÍVEL COM O BLOCO JÁ EXECUTADO
-- Esta versão NÃO remove nem recria políticas RLS.
-- Não apaga usuários, assinaturas, planos, mídias, reels ou arquivos do Storage.
-- Pode ser executada novamente: colunas são adicionadas apenas se estiverem ausentes.
--
-- IMPORTANTE:
-- 1) Faça backup do banco e do Storage antes de executar.
-- 2) Este script pressupõe as tabelas existentes e a função ay las_is_admin()
--    (nome correto: public.aylas_is_admin()) do projeto atual.
-- 3) As políticas RLS existentes são preservadas integralmente.

BEGIN;

-- A. Colunas já introduzidas pelo bloco enviado pelo usuário.
-- IF NOT EXISTS torna a operação segura se o bloco anterior já foi executado.
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS profile_image_url text,
  ADD COLUMN IF NOT EXISTS cover_image_url text,
  ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS content jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_bucket text,
  ADD COLUMN IF NOT EXISTS preview_path text;

ALTER TABLE public.reels
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'subscription_interest',
  ADD COLUMN IF NOT EXISTS plan_id uuid,
  ADD COLUMN IF NOT EXISTS media_id uuid,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- B. Privilégios SQL necessários ao frontend.
-- RLS continua sendo aplicada nas tabelas base.
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.site_settings, public.plans TO anon, authenticated;
GRANT SELECT ON public.media, public.reels TO anon, authenticated;
GRANT INSERT ON public.leads TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.leads TO authenticated;

-- C. Catálogo público. Só retorna conteúdos publicados.
-- O caminho do original só é retornado quando o conteúdo é gratuito
-- e está armazenado no bucket público.
CREATE OR REPLACE VIEW public.public_media_catalog
WITH (security_barrier = true) AS
SELECT
  id,
  title,
  type,
  album,
  access,
  price,
  published,
  sort_order,
  created_at,
  CASE
    WHEN access = 'free' AND storage_bucket = 'aylas-public'
    THEN storage_bucket
    ELSE NULL
  END AS storage_bucket,
  CASE
    WHEN access = 'free' AND storage_bucket = 'aylas-public'
    THEN storage_path
    ELSE NULL
  END AS storage_path,
  CASE
    WHEN access <> 'free'
    THEN preview_bucket
    ELSE NULL
  END AS preview_bucket,
  CASE
    WHEN access <> 'free'
    THEN preview_path
    ELSE NULL
  END AS preview_path
FROM public.media
WHERE published = true;

CREATE OR REPLACE VIEW public.public_reels_catalog
WITH (security_barrier = true) AS
SELECT
  id,
  title,
  is_free,
  published,
  sort_order,
  created_at,
  CASE
    WHEN is_free = true AND storage_bucket = 'aylas-public'
    THEN storage_bucket
    ELSE NULL
  END AS storage_bucket,
  CASE
    WHEN is_free = true AND storage_bucket = 'aylas-public'
    THEN storage_path
    ELSE NULL
  END AS storage_path
FROM public.reels
WHERE published = true;

GRANT SELECT ON public.public_media_catalog TO anon, authenticated;
GRANT SELECT ON public.public_reels_catalog TO anon, authenticated;

COMMIT;

-- FIM DA MIGRAÇÃO.
-- Não há DROP POLICY nem CREATE POLICY neste arquivo.
