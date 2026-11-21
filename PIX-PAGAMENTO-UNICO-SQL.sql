-- AYLA'S CLUB | Permissões mínimas para o backend de pagamentos
-- Execute uma vez no Supabase SQL Editor. Não altera dados, RLS ou planos.
BEGIN;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON TABLE public.media TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.subscriptions TO service_role;
-- As permissões abaixo já podem existir; são idempotentes.
GRANT SELECT ON TABLE public.plans TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders TO service_role;
COMMIT;
