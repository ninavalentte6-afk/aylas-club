# Ayla’s Club — Checkout Pix (sandbox)

## Instalação
1. Suba os arquivos deste ZIP no repositório e aguarde o deploy da Netlify. Nenhuma migração SQL é necessária para este recurso.
2. Confirme que Pix está habilitado na conta Stripe correta e que a moeda BRL está disponível.
3. No Stripe, confira os eventos enviados ao webhook: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `charge.refunded`.
4. Teste cartão recorrente (Mensal e Semestral), Pix Mensal, Pix Semestral e Pix Vitalício, inclusive pagamento pendente, expirado e confirmado.
5. Confirme no Supabase que `orders.status` muda para `paid` somente após confirmação e que `subscriptions.current_period_end` é preenchido para Pix mensal/semestral e nulo para vitalício.
6. Para produção, configure chaves live, webhook live e segredo novo, e verifique que a conta Stripe permite Pix live. Não reutilize IDs de preços de teste: `plans.provider_price_id` deve apontar para preços da conta live (recriados automaticamente ao primeiro checkout).

## Atenção
- Não foi executado teste real na Stripe nem no Supabase: valide o fluxo ponta a ponta no sandbox antes de aceitar pagamentos reais.
- O prazo de Pix mensal/semestral é calculado em meses de calendário a partir da confirmação.
- Reembolsos são tratados pelo webhook existente, mas o tratamento de reembolso parcial e outras operações financeiras merece teste adicional.
- O Pix só aparece quando a Stripe habilita o método para aquela sessão/conta.
