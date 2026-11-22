# Ayla's Club 3.0 — Meta Pixel e conversões

ID do Pixel: `1373316378073444`.
Domínio: `https://aylassclub.dev`.

## Implementado neste pacote

- `index.html`, `conheca.html`: carregam `js/marketing.js`, sem script-base duplicado e sem fallback `noscript` que contorne a recusa.
- `membros.html`: disponibiliza a escolha de marketing e rastreamento do início de checkout, mas não registra `PageView` na área de membros.
- Consentimento de marketing opcional, armazenado no navegador (`aylas_marketing_consent_v1`). A escolha 'Recusar' não bloqueia compras. O botão 'Preferências de marketing' está no rodapé da página pública e da apresentação.
- `PageView` somente após consentimento na página pública e na página de apresentação.
- `ViewContent` genérico ao carregar catálogo com planos, sem passar títulos, IDs, URLs específicos de mídia nem categorias de conteúdo.
- `InitiateCheckout` somente quando a função do servidor efetivamente devolve uma URL válida do Stripe, sem informação de produtos/conteúdos.
- `Purchase` genérico, pelo servidor após pedido pago confirmado pelo Stripe, somente para `kind=subscription` e com consentimento registrado no início do checkout. Nunca envia compras de `extra` nem nomes/IDs de mídia; não envia email ou telefone.
- `Purchase` tem `event_id` estável por pedido, para resiliência contra duplicações. Como só é enviado pelo servidor, não existe duplicação com o navegador nesta versão.
- Falha de API da Meta não impede confirmar pedido nem liberar acesso.
- A integração preserva Stripe, Pix, Supabase, painel administrativo e a página principal.

## Requisitos antes de habilitar CAPI

**IMPORTANTE**: O site contém ensaios sensuais não explícitos. A Meta pode restringir o uso de ferramentas de rastreamento para categorias e informações sensíveis, inclusive eventos de transação. **Antes de usar o envio de Purchase, confirme que a sua operação e os dados enviados são permitidos nas regras atuais da Meta, e que o consentimento e a política de privacidade atendem à legislação aplicável.** O envio de Purchase não possui mais uma chave manual de ativação. Ele depende de consentimento registrado, token configurado, pedido elegível e pagamento confirmado.

No Netlify > Site configuration > Environment variables (escopo Functions), configure:

- `SITE_URL` = `https://aylassclub.dev` (confira se já existe).
- `META_PIXEL_ID` = `1373316378073444` (público; opcional, tem fallback no código).
- `META_CAPI_ACCESS_TOKEN` = token gerado no Gerenciador de Eventos; marcar como segredo. Não coloque no HTML nem em `js/config.js`.
- `META_CAPI_TEST_EVENT_CODE` = opcional, temporário para o Gerenciador de Eventos; remova após os testes.

Salve as variáveis e faça novo deploy. O token NÃO é necessário para testar PageView, ViewContent e InitiateCheckout no navegador.

## Testes manuais

1. Publique o ZIP no repositório (preservando as variáveis existentes do Stripe e Supabase). Aguarde Published.
2. Use aba anônima e acesse `/conheca.html`; clique Recusar. Na extensão Meta Pixel Helper, não deve carregar o Pixel. Reabra preferências e aceite marketing.
3. Após aceitar, verifique `PageView` em Eventos de teste. Acesse a página principal e veja `PageView` e `ViewContent`.
4. Inicie o checkout de um plano com pagamento real ou ambiente Stripe de teste: `InitiateCheckout` deve ocorrer apenas quando houver URL da sessão Stripe. Simular clique sem retorno de URL não conta como checkout.
5. **Após confirmar a conformidade da operação e configurar o token**, use modo de teste Stripe e `META_CAPI_TEST_EVENT_CODE` para confirmar o envio de Purchase. Confirme que compra cancelada/pendente não gera Purchase; confirme que compra paga sim. Não use transações reais só para testar o pixel.
6. No painel Meta, confira diagnósticos de dados e permissões de uso. Atribuição não é garantida em 100% dos navegadores (bloqueadores, consentimento e limitações da plataforma).

## Limitações honestas

- Não executamos transações externas reais nem validamos a entrega de eventos ao gerenciador da Meta aqui.
- A telemetria CAPI é best effort e não tem fila persistente de reenvio; erro após confirmação financeira pode perder o evento. `event_id` é estável em eventuais novas tentativas.
- O código existente neste ZIP cobra **pagamento único**, mesmo para planos de período mensal/semestral. Não representa cobrança recorrente no Stripe.
- A política de privacidade do site é ainda um modelo e precisa incluir dados do controlador, contato, retenção, cookies/Meta e exercício de direitos.
- A página `/conheca.html` é pública e idêntica para todos os usuários, sem detecção de crawlers/revisores nem redirecionamentos ocultos. Não é cloaking, nem garante aprovação de anúncios.
