-- AYLA'S CLUB | Compra sem cadastro, com vínculo posterior ao email verificado.
-- Execute UMA VEZ no SQL Editor, DEPOIS de fazer backup.
-- Não recria políticas, não remove dados, contas, mídias nem assinaturas.
BEGIN;
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS purchased_months integer;
-- Impede duplicar assinaturas Stripe inclusive em dois cliques concorrentes.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_provider_ref_uidx
  ON public.subscriptions (provider, provider_ref)
  WHERE provider = 'stripe' AND provider_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_guest_email_paid_idx
  ON public.orders (guest_email, status) WHERE guest_email IS NOT NULL;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT ON TABLE public.plans, public.media TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.orders, public.subscriptions TO service_role;
COMMIT;
