# Relatório — Ayla's Club 2.0 + Stripe

## Integração incluída neste pacote

- Checkout Stripe para planos recorrentes, plano vitalício e extras individuais.
- Preços lidos no Supabase no servidor; nenhum valor de compra é confiado ao navegador.
- Criação de Stripe Product/Price sob demanda. Mensal usa recorrência mensal; semestral usa intervalo de seis meses; vitalício e extras são pagamento único.
- Webhook com validação HMAC do cabeçalho `Stripe-Signature`, tolerância temporal e registro idempotente em `webhook_events`.
- Atualização de pedidos e assinaturas após confirmação Stripe; renovações geram pedidos; falhas de pagamento suspendem o acesso até regularização.
- Customer Portal para o membro gerir cobrança e cancelamento.
- Cancelamento administrativo de assinatura Stripe agendado no fim do período pago; cancelamento manual continua local.
- Preço alterado no painel cria novo Stripe Price no próximo checkout, preservando o preço de assinantes existentes.
- SQL incremental `STRIPE-MIGRACAO.sql`, sem recriar políticas RLS ou apagar dados.

## Verificações locais executadas

- `node --check` em todos os arquivos JavaScript: OK.
- Teste de assinatura HMAC válida/inválida do webhook: OK.
- Conversão dos valores R$ 19,90, R$ 49,90 e R$ 179,00 para centavos Stripe: OK.
- Mapeamento dos estados Stripe `active`, `past_due` e `canceled`: OK.

## Ainda não testado externamente

- SQL no banco publicado (a migração precisa ser executada pelo proprietário).
- Deploy e variáveis de ambiente na Netlify.
- Checkout real em modo de teste Stripe, webhook público, Customer Portal, renovação, falha e reembolso.
- Compatibilidade operacional com os dados atuais após deploy.

**Não ativar chaves live antes de concluir todos os testes em modo test.**
