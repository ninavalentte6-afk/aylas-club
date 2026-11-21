# Caminho curto para a Stripe OFICIAL

**Antes de mudar de teste para produção:** consulte o README e finalize o checklist de testes de webhook, Pix, liberação de acesso e e-mail confirmado.

1. Garanta que a conta Stripe esteja habilitada e elegível para o conteúdo oferecido. Aprovação e restrições são decididas pela Stripe, não pelo código.
2. Confira no Stripe Dashboard (modo live) se Pix e cartão estão disponíveis para cobranças únicas em BRL.
3. Na Netlify (contexto Production), configure **`STRIPE_SECRET_KEY=sk_live_...`** somente como segredo, nunca no repositório.
4. Crie um **novo destino de webhook live** em `https://SEU-DOMINIO/.netlify/functions/payment-webhook` e habilite os 11 eventos do README, em especial `checkout.session.async_payment_succeeded`.
5. Configure o novo **`STRIPE_WEBHOOK_SECRET=whsec_...`** desse destino live na Netlify, como segredo.
6. Atualize `SITE_URL` para o domínio publicado, confira URLs de redirecionamento do Supabase Auth e faça deploy.
7. Valide que a conta do Stripe live é a correta; não reutilize IDs de preços de teste. Nesta versão os preços novos são inline e cada Checkout lê o preço do Supabase.
8. Faça **uma compra real de baixo valor** com sua própria conta e confira o pedido pago no Supabase, a assinatura/período, o login confirmado e o estorno de teste.

**Nunca compartilhe no chat** chaves `sk_...`, `whsec_...`, `SUPABASE_SERVICE_ROLE_KEY`, tokens ou arquivos `.env`.

**Observações:** 1 mês é tratado como **um mês de calendário**, não necessariamente 30 dias. Novos pagamentos não renovam automaticamente. Assinaturas recorrentes antigas continuam vinculadas à Stripe e precisam manter o webhook de invoice/subscription funcionando.
