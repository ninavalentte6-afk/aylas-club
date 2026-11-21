-- AYLA'S CLUB 2.0 | MIGRAÇÃO INCREMENTAL (Supabase SQL Editor)
-- NÃO apaga dados, utilizadores, a conta admin (profiles), planos, mídias, reels, assinaturas nem buckets.
-- Idempotente: pode ser executada mais de uma vez. FAÇA BACKUP ANTES (banco + Storage).
-- Substitui TODAS as políticas RLS das tabelas do projeto (e as de storage.objects dos buckets aylas-*)
-- por um conjunto único e coerente, porque o estado real das políticas antigas é desconhecido.
-- Substitui os scripts anteriores (COMPATIVEL, ULTRA, ATUALIZACAO, HARDENING, SETUP).
BEGIN;

-- 1. COLUNAS NOVAS ---------------------------------------------------------
ALTER TABLE public.profiles      ADD COLUMN IF NOT EXISTS email text, ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.plans         ADD COLUMN IF NOT EXISTS highlighted boolean NOT NULL DEFAULT false,
                                 ADD COLUMN IF NOT EXISTS badge text,
                                 ADD COLUMN IF NOT EXISTS benefits jsonb NOT NULL DEFAULT '[]'::jsonb,
                                 ADD COLUMN IF NOT EXISTS provider_price_id text;
ALTER TABLE public.media         ADD COLUMN IF NOT EXISTS description text, ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT true;
ALTER TABLE public.reels         ADD COLUMN IF NOT EXISTS description text, ADD COLUMN IF NOT EXISTS album text,
                                 ADD COLUMN IF NOT EXISTS access text NOT NULL DEFAULT 'subs',
                                 ADD COLUMN IF NOT EXISTS preview_bucket text, ADD COLUMN IF NOT EXISTS preview_path text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
                                 ADD COLUMN IF NOT EXISTS provider text, ADD COLUMN IF NOT EXISTS provider_ref text,
                                 ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

UPDATE public.reels SET access = CASE WHEN is_free THEN 'free' ELSE 'subs' END WHERE access = 'subs' AND is_free;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reels_access_chk') THEN
    ALTER TABLE public.reels ADD CONSTRAINT reels_access_chk CHECK (access IN ('free','subs','extra')); END IF;
  -- Conteúdo pago nunca pode ficar no bucket público (vale para novas gravações; linhas antigas: ver diagnóstico no fim).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='media_paid_private_chk') THEN
    ALTER TABLE public.media ADD CONSTRAINT media_paid_private_chk CHECK (access='free' OR storage_bucket='aylas-private') NOT VALID; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='reels_paid_private_chk') THEN
    ALTER TABLE public.reels ADD CONSTRAINT reels_paid_private_chk CHECK (access='free' OR storage_bucket='aylas-private') NOT VALID; END IF;
END $$;

-- Mantém reels.is_free (legado) e reels.access sincronizados.
CREATE OR REPLACE FUNCTION public.aylas_reels_sync() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF new.access='subs' AND new.is_free THEN new.access:='free'; END IF;
  ELSIF new.is_free IS DISTINCT FROM old.is_free AND new.access IS NOT DISTINCT FROM old.access THEN
    new.access := CASE WHEN new.is_free THEN 'free' ELSE 'subs' END;
  END IF;
  new.is_free := (new.access='free'); RETURN new;
END $$;
DROP TRIGGER IF EXISTS aylas_reels_sync_t ON public.reels;
CREATE TRIGGER aylas_reels_sync_t BEFORE INSERT OR UPDATE ON public.reels FOR EACH ROW EXECUTE FUNCTION public.aylas_reels_sync();

-- 2. TABELAS NOVAS ---------------------------------------------------------
-- Pedidos: ÚNICA fonte de verdade de compras e receita. Só o servidor (webhook, service_role) grava.
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('subscription','extra')),
  plan_id uuid REFERENCES public.plans(id) ON DELETE SET NULL,
  media_id uuid REFERENCES public.media(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','canceled','refunded')),
  provider text, provider_ref text,
  created_at timestamptz NOT NULL DEFAULT now(), paid_at timestamptz, refunded_at timestamptz,
  UNIQUE (provider, provider_ref)
);
CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS orders_media_idx ON public.orders(media_id) WHERE kind='extra';

CREATE TABLE IF NOT EXISTS public.webhook_events (   -- idempotência dos webhooks
  id bigserial PRIMARY KEY, provider text NOT NULL, event_id text NOT NULL, payload jsonb,
  received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz, UNIQUE (provider, event_id)
);
CREATE TABLE IF NOT EXISTS public.favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id uuid NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (user_id, media_id)
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'subscription_interest';
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 3. FUNÇÕES DE AUTORIZAÇÃO (SECURITY DEFINER; usadas por RLS e Storage) --------
CREATE OR REPLACE FUNCTION public.aylas_is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id=auth.uid() AND is_admin=true) $$;

CREATE OR REPLACE FUNCTION public.aylas_has_sub() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT EXISTS(SELECT 1 FROM public.subscriptions s WHERE s.user_id=auth.uid() AND s.status='active'
                  AND (s.current_period_end IS NULL OR s.current_period_end>now())) $$;

CREATE OR REPLACE FUNCTION public.aylas_owns_media(mid uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT EXISTS(SELECT 1 FROM public.orders o WHERE o.user_id=auth.uid() AND o.kind='extra' AND o.media_id=mid AND o.status='paid') $$;

-- Regra única de acesso ao ORIGINAL privado: assinatura válida (subs) ou compra paga (extra).
CREATE OR REPLACE FUNCTION public.aylas_can_read_object(bkt text, obj text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS
$$ SELECT public.aylas_is_admin()
   OR EXISTS(SELECT 1 FROM public.media m WHERE m.storage_bucket=bkt AND m.storage_path=obj AND m.published
        AND ((m.access='subs' AND public.aylas_has_sub()) OR (m.access='extra' AND public.aylas_owns_media(m.id))))
   OR EXISTS(SELECT 1 FROM public.reels r WHERE r.storage_bucket=bkt AND r.storage_path=obj AND r.published
        AND r.access='subs' AND public.aylas_has_sub()) $$;
GRANT EXECUTE ON FUNCTION public.aylas_is_admin(), public.aylas_has_sub(), public.aylas_owns_media(uuid),
  public.aylas_can_read_object(text,text) TO anon, authenticated;

-- Perfil automático com e-mail (a conta admin existente não é tocada).
CREATE OR REPLACE FUNCTION public.aylas_new_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS
$$ BEGIN INSERT INTO public.profiles(id, display_name, email)
   VALUES (new.id, coalesce(new.raw_user_meta_data->>'display_name',''), new.email) ON CONFLICT (id) DO NOTHING; RETURN new; END $$;
UPDATE public.profiles p SET email = u.email FROM auth.users u WHERE u.id=p.id AND p.email IS NULL;

-- 4. POLÍTICAS RLS: remove as antigas (nomes desconhecidos) e recria ---------
DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT schemaname, tablename, policyname FROM pg_policies
    WHERE (schemaname='public' AND tablename IN ('profiles','site_settings','plans','media','reels','subscriptions','leads','orders','favorites','webhook_events'))
       OR (schemaname='storage' AND tablename='objects' AND (coalesce(qual,'')||coalesce(with_check,'')) ILIKE '%aylas-%')
  LOOP EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename); END LOOP; END $$;

CREATE POLICY profiles_read   ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid() OR public.aylas_is_admin());
CREATE POLICY profiles_update ON public.profiles FOR UPDATE TO authenticated USING (id=auth.uid() OR public.aylas_is_admin()) WITH CHECK (id=auth.uid() OR public.aylas_is_admin());
CREATE POLICY settings_read   ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY settings_admin  ON public.site_settings FOR ALL TO authenticated USING (public.aylas_is_admin()) WITH CHECK (public.aylas_is_admin());
CREATE POLICY plans_read      ON public.plans FOR SELECT TO anon, authenticated USING (active OR public.aylas_is_admin());
CREATE POLICY plans_admin     ON public.plans FOR ALL TO authenticated USING (public.aylas_is_admin()) WITH CHECK (public.aylas_is_admin());
-- Tabelas base: visitantes NÃO as leem (usam as views). Membros só leem o que podem abrir.
CREATE POLICY media_read ON public.media FOR SELECT TO authenticated USING (public.aylas_is_admin() OR
  (published AND (access='free' OR (access='subs' AND public.aylas_has_sub()) OR (access='extra' AND public.aylas_owns_media(id)))));
CREATE POLICY media_admin ON public.media FOR ALL TO authenticated USING (public.aylas_is_admin()) WITH CHECK (public.aylas_is_admin());
CREATE POLICY reels_read ON public.reels FOR SELECT TO authenticated USING (public.aylas_is_admin() OR
  (published AND (access='free' OR (access='subs' AND public.aylas_has_sub()))));
CREATE POLICY reels_admin ON public.reels FOR ALL TO authenticated USING (public.aylas_is_admin()) WITH CHECK (public.aylas_is_admin());
CREATE POLICY subs_read  ON public.subscriptions FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.aylas_is_admin());
CREATE POLICY subs_admin ON public.subscriptions FOR ALL TO authenticated USING (public.aylas_is_admin()) WITH CHECK (public.aylas_is_admin());
CREATE POLICY orders_read ON public.orders FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.aylas_is_admin());
CREATE POLICY fav_own ON public.favorites FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
CREATE POLICY leads_insert ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (consent_at IS NOT NULL AND length(trim(email))>3);
CREATE POLICY leads_admin  ON public.leads FOR ALL TO authenticated USING (public.aylas_is_admin()) WITH CHECK (public.aylas_is_admin());
-- webhook_events e escrita em orders: sem política = só service_role (servidor).

-- 5. PRIVILÉGIOS (mínimos) -------------------------------------------------
REVOKE ALL ON public.profiles, public.site_settings, public.plans, public.media, public.reels, public.subscriptions,
              public.leads, public.orders, public.favorites, public.webhook_events FROM anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.site_settings, public.plans TO anon, authenticated;
GRANT INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media, public.reels, public.subscriptions, public.leads TO authenticated;
GRANT INSERT ON public.leads TO anon;
GRANT SELECT ON public.profiles, public.orders TO authenticated;
GRANT UPDATE (display_name, avatar_url) ON public.profiles TO authenticated;   -- is_admin nunca editável pelo cliente
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;

-- 6. CATÁLOGOS PÚBLICOS (views sem caminho de nenhum original pago) ----------
DROP VIEW IF EXISTS public.public_media_catalog; DROP VIEW IF EXISTS public.public_reels_catalog;
CREATE VIEW public.public_media_catalog WITH (security_barrier=true) AS
SELECT id, title, description, type, album, access, price, published, is_new, sort_order, created_at,
  CASE WHEN access='free' AND storage_bucket='aylas-public' THEN storage_bucket END AS storage_bucket,
  CASE WHEN access='free' AND storage_bucket='aylas-public' THEN storage_path END   AS storage_path,
  CASE WHEN access<>'free' THEN preview_bucket END AS preview_bucket,
  CASE WHEN access<>'free' THEN preview_path END   AS preview_path
FROM public.media WHERE published;
CREATE VIEW public.public_reels_catalog WITH (security_barrier=true) AS
SELECT id, title, description, album, access, is_free, published, sort_order, created_at,
  CASE WHEN access='free' AND storage_bucket='aylas-public' THEN storage_bucket END AS storage_bucket,
  CASE WHEN access='free' AND storage_bucket='aylas-public' THEN storage_path END   AS storage_path,
  preview_bucket, preview_path
FROM public.reels WHERE published;
GRANT SELECT ON public.public_media_catalog, public.public_reels_catalog TO anon, authenticated;

-- 7. STORAGE -----------------------------------------------------------------
INSERT INTO storage.buckets(id,name,public) VALUES ('aylas-public','aylas-public',true),('aylas-private','aylas-private',false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;   -- só garante público/privado; limites já existentes são mantidos
CREATE POLICY aylas_pub_read   ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id='aylas-public');
CREATE POLICY aylas_priv_read  ON storage.objects FOR SELECT TO authenticated USING (bucket_id='aylas-private' AND public.aylas_can_read_object(bucket_id, name));
CREATE POLICY aylas_adm_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('aylas-public','aylas-private') AND public.aylas_is_admin());
CREATE POLICY aylas_adm_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('aylas-public','aylas-private') AND public.aylas_is_admin()) WITH CHECK (bucket_id IN ('aylas-public','aylas-private') AND public.aylas_is_admin());
CREATE POLICY aylas_adm_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id IN ('aylas-public','aylas-private') AND public.aylas_is_admin());
-- Membros só gravam o PRÓPRIO avatar.
CREATE POLICY aylas_avatar_write ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='aylas-public' AND name LIKE 'avatars/'||auth.uid()::text||'/%');
CREATE POLICY aylas_avatar_upd   ON storage.objects FOR UPDATE TO authenticated USING (bucket_id='aylas-public' AND name LIKE 'avatars/'||auth.uid()::text||'/%');

COMMIT;

-- 8. DIAGNÓSTICO (resultado vazio = tudo certo). Não altera nada. ---------------
-- Originais pagos ainda no bucket público (devem ser movidos pelo painel):
SELECT 'media' AS tabela, id, title, access, storage_bucket FROM public.media WHERE access<>'free' AND storage_bucket='aylas-public'
UNION ALL SELECT 'reels', id, title, access, storage_bucket FROM public.reels WHERE access<>'free' AND storage_bucket='aylas-public';
-- Contas admin (confirme que a sua continua presente):
SELECT id, email, is_admin FROM public.profiles WHERE is_admin;
