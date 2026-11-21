# AYLA'S CLUB 3.0 — PREMIUM (NOVO CHECKOUT SEM CADASTRO)

**Versão do código:** 21/11/2026. Esta versão parte do ZIP `AYLAS-CLUB-2.0-CHECKOUT-UNICO(1).zip` enviado pelo proprietário. Não recria tabelas e não remove recursos existentes.

## IMPORTANTE — Instalar nesta ordem

1. **Faça backup** do banco Supabase, do Storage e da versão anterior do GitHub.
2. Abra **Supabase → SQL Editor** e execute **`AYLAS-CLUB-3.0-MIGRACAO-PIX-CONVIDADO.sql`**. Esse é o **único SQL novo desta versão**. Não reexecute as antigas migrações 2.0: elas são arquivos históricos.
3. Envie **os arquivos deste ZIP** para o repositório GitHub, preservando os caminhos. A Netlify publica o site a partir da raiz, sem build.
4. Confira na Netlify a presença de `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `SITE_URL` **somente nos ambientes corretos**. Nunca salve chaves secretas no GitHub.
5. Faça deploy, teste com `sk_test_...` e webhook de teste. **Não mude para `sk_live_...` antes de terminar os testes de pagamento e ativação.**

## Mudanças de experiência

- Página pública reformulada: cabeçalho reduzido, imagem de capa, perfil, destaques, preços, garantias informativas, layout refinado para celular e desktop.
- Área de membros: apresentação, navegação, cards e experiência responsiva melhorados.
- Admin: hierarquia visual melhor, seção de cores ampliada e paletas **Noite elegante**, **Rosé** e **Minimal claro**. O editor mantém cores individuais, tipografia, raio de bordas, textos, capas, métricas, prévia, mídias, reels, membros, leads e planos.
- Campos de formulário, balões de extras, etiquetas, bordas de planos e cartões agora usam **cores independentes**, configuráveis no painel.
- Os botões vinculados a um plano levam **diretamente para Stripe Checkout**, sem modal extra ou login prévio.
- Pix/cartão continuam disponíveis conforme a habilitação/eligibilidade da sessão Stripe. As **novas compras são avulsas** (sem renovação). Assinaturas Stripe recorrentes criadas em versões anteriores permanecem administráveis; nenhuma foi apagada.

## Como funciona a compra sem criar conta

1. A pessoa escolhe um plano ou extra e entra diretamente no Stripe Checkout. O backend captura **o preço oficial no Supabase**, nunca do navegador.
2. A Stripe confirma o pagamento via **webhook assinado**. Pagamentos pendentes, como Pix ainda não concluído, **não dão acesso**.
3. Se a pessoa já estava logada, o acesso segue o fluxo normal. Se era visitante, o pedido pago aguarda vinculação à conta.
4. Na tela de retorno, ela cria uma conta ou entra **com o mesmo e-mail que informou no Checkout**. O servidor exige **e-mail confirmado no Supabase** antes de associar a compra.
5. O backend vincula o pedido à conta e cria o período de acesso. O período começa na **data de confirmação do pagamento**, não na data do cadastro. Compras de extras ficam vinculadas por status `paid`.
6. Em “Conta → Verificar compras anteriores”, a pessoa pode recuperar um pagamento confirmado, por exemplo se o webhook demorou ou se criou a conta depois.

**Obrigatório para esse fluxo:** no Supabase Auth, habilite verificação de e-mail e configure/teste **SMTP próprio** para produção. Sem recebimento de e-mail de confirmação, usuários podem pagar e não conseguir liberar o acesso. Garanta os URLs de redirecionamento de Auth para o domínio correto.

## SQL desta versão

`AYLAS-CLUB-3.0-MIGRACAO-PIX-CONVIDADO.sql`:
- permite `orders.user_id` nulo enquanto a compra é de visitante;
- adiciona `orders.guest_email` e `orders.purchased_months`;
- cria um índice de busca de compras;
- mantém a RLS atual e as assinaturas anteriores;
- **não altera nem apaga linhas existentes**.

## Eventos para manter habilitados no webhook Stripe

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed` **(novo; adicionar na Stripe)**
- `checkout.session.expired`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`
- `payment_intent.payment_failed`
- `charge.refunded`

Acesse o Stripe Dashboard da **mesma conta** vinculada à chave `STRIPE_SECRET_KEY`. Os endereços de teste e produção requerem **webhook signing secrets diferentes**.

## Checklist mínimo antes de trocar para cobranças reais

- [ ] Backup do banco, Storage e repositório concluído.
- [ ] Novo SQL executado **antes** do novo deploy.
- [ ] Comprar mensal como visitante por cartão e validar a mensagem de retorno.
- [ ] Criar conta com o mesmo e-mail, confirmar e validar `orders.user_id` e `subscriptions.current_period_end`.
- [ ] Testar Pix pendente: **sem** liberar acesso antes de `async_payment_succeeded`.
- [ ] Testar Pix confirmado, falha e expiração.
- [ ] Testar plano semestral e vitalício; conferir respectivamente prazo de 6 meses e `current_period_end = null`.
- [ ] Testar **extras com preços diferentes**, verificar que só o comprado é liberado.
- [ ] Testar usuário já autenticado, conta de admin e assinatura recorrente anterior.
- [ ] Testar reembolso completo (o acesso correspondente deve ser removido).
- [ ] Configurar SMTP, confirmação de e-mail e links de redirecionamento.
- [ ] Personalizar Termos/Privacidade no admin com dados legais e canal de suporte reais.
- [ ] **Verificar com a Stripe a elegibilidade do tipo de conteúdo/negócio** antes do go-live. A Stripe restringe certas modalidades de conteúdo adulto e pode exigir análise adicional.
- [ ] Rotacionar o segredo de webhook que tenha sido compartilhado fora da Netlify; configurar chave e destino **live**, testar compra real de baixo valor e confirmar webhook.

## Validação efetuada aqui

- `node --check` nos arquivos JS alterados.
- `node tests/payment-flow.test.js` (simulações locais: Checkout convidado, webhook pago, identificação por e-mail verificado, repetição/idempotência e estorno).
- Checagem de parsing das folhas CSS e visualização local da página pública com **dados simulados** em desktop e mobile.

**Não foram executados pagamentos reais nem requisições autenticadas ao seu Supabase/Stripe.** Os testes simulados não substituem o fluxo end-to-end no sandbox. No navegador, nenhum mecanismo pode impedir de modo absoluto a cópia de mídia exibida; o isolamento dos originais depende da RLS e do Storage privados no Supabase.

Arquivos históricos 2.0 e documentação das versões anteriores são mantidos como referência. **Não execute SQL histórico** para instalar esta versão.
