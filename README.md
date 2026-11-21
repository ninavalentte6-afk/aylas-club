# Ayla's Club 2.0

Site estático (HTML/CSS/JS) + Supabase (Auth, Postgres, Storage) + Netlify. Sem etapa de build.

## Estrutura preservada

- `index.html`: página pública, acessível sem login.
- `membros.html`: área autenticada dos membros.
- `admin.html`: painel protegido por `profiles.is_admin = true`.
- Supabase continua sendo a fonte de verdade de usuários, planos, assinaturas, pedidos e permissões de conteúdo.
- O frontend usa somente a chave publicável do Supabase. A `service_role` e as chaves Stripe ficam exclusivamente nas variáveis de ambiente da Netlify.

## Ativar Stripe

1. Faça backup do Supabase (banco e Storage) e do repositório GitHub.
2. Execute **`STRIPE-MIGRACAO.sql`** no SQL Editor do Supabase. É uma migração incremental; não executa `DROP POLICY`, não recria tabelas e não apaga registros.
3. Atualize o repositório GitHub com os arquivos deste ZIP, mantendo a estrutura de pastas. A Netlify publica a raiz, sem build command.
4. Em Netlify › Site configuration › Environment variables, configure:
   - `SUPABASE_URL`: URL do projeto Supabase.
   - `SUPABASE_ANON_KEY`: a chave publicável/anon usada no frontend.
   - `SUPABASE_SERVICE_ROLE_KEY`: chave `service_role` do Supabase. **Somente na Netlify; nunca no navegador, ZIP público ou GitHub.**
   - `STRIPE_SECRET_KEY`: use `sk_test_...` durante os testes. Não use chave live até concluir os testes.
   - `SITE_URL`: URL canônica do site, por exemplo `https://aylass-club.netlify.app`.
5. Publique/deploy novamente na Netlify.
6. No Stripe em modo de teste, cadastre o webhook `https://SEU-DOMINIO/.netlify/functions/payment-webhook`. Habilite os eventos listados abaixo. Copie o segredo `whsec_...` desse endpoint para a variável Netlify `STRIPE_WEBHOOK_SECRET` e faça novo deploy.
7. Ative o Customer Portal nas configurações de Billing do Stripe para que o membro possa gerenciar forma de pagamento e cancelamento.

### Eventos do webhook

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.payment_failed`
- `charge.refunded`

## Regras dos planos

- `months = 1`: recorrência mensal.
- `months = 6`: recorrência a cada seis meses.
- `months >= 9999`: pagamento único, acesso vitalício.
- Extras individuais: pagamento único.

O servidor consulta o preço no Supabase; nunca confia no valor enviado pelo navegador. Quando o preço de um plano for alterado no painel, o próximo checkout cria um novo Stripe Price e atualiza `plans.provider_price_id`. Os assinantes existentes permanecem no preço contratado anteriormente. Uma migração de assinantes para um preço novo deve ser uma decisão explícita.

O acesso só é liberado após webhook Stripe com assinatura validada. Eventos são registrados em `webhook_events` para idempotência. Estados Stripe `past_due`/`incomplete` não liberam conteúdo enquanto a cobrança não for regularizada. O cancelamento de assinatura recorrente é agendado no Stripe para o fim do período já pago; acessos manuais continuam sendo cancelados localmente pelo admin.

## Testes obrigatórios antes de usar cobranças reais

- Compra de teste do plano mensal.
- Compra de teste do plano semestral e confirmação de recorrência em seis meses.
- Compra única do vitalício.
- Compra de extra individual.
- Renovação de assinatura e falha de pagamento.
- Cancelamento pelo portal do membro e pelo painel admin.
- Reembolso de compra única.
- Verificação de que a assinatura manual já existente continua ativa e intacta.

## Limitações conhecidas

A integração foi validada por verificações locais de sintaxe e testes unitários de assinatura HMAC, conversão de valores BRL e mapeamento de estados. Não foi possível conectar ao seu Supabase, à Netlify ou à sua conta Stripe neste ambiente. Portanto, o fluxo real ainda precisa ser testado no modo Stripe Test antes de ativar `sk_live_...`.
