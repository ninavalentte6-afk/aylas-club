-- AYLA'S CLUB 2.0 | PREPARAÇÃO INCREMENTAL PARA STRIPE
-- Somente estrutura auxiliar. Não altera usuários, planos, valores, assinaturas,
-- pedidos, mídias, reels, Storage, políticas RLS ou configurações existentes.
-- Faça backup antes de executar. Pode ser executado novamente.
BEGIN;

-- O campo já existe na migração 2.0; IF NOT EXISTS mantém compatibilidade
-- caso este SQL seja aplicado em uma instalação ligeiramente anterior.
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS provider_price_id text;

-- Evita duplicar a mesma assinatura Stripe se o Stripe reenviar eventos
-- diferentes referentes ao mesmo objeto. A assinatura manual existente,
-- cujo provider é NULL, não é afetada.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_provider_ref_uidx
  ON public.subscriptions (provider, provider_ref)
  WHERE provider = 'stripe' AND provider_ref IS NOT NULL;

-- Índice para localizar rapidamente eventos já recebidos. A restrição única
-- (provider, event_id) existente continua sendo a garantia principal.
CREATE INDEX IF NOT EXISTS webhook_events_provider_received_idx
  ON public.webhook_events (provider, received_at DESC);

COMMIT;

-- Verificação somente leitura: deve mostrar os índices criados e os preços atuais.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('subscriptions', 'webhook_events')
  AND indexname IN ('subscriptions_stripe_provider_ref_uidx', 'webhook_events_provider_received_idx')
ORDER BY indexname;

SELECT id, name, price, months, active, provider_price_id
FROM public.plans
ORDER BY sort_order;
