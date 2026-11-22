# Correção dos eventos automáticos do Meta Pixel

O código desta versão não envia `Subscribe` manualmente. Os cliques em botões "Assinar" podem estar sendo detectados automaticamente pela Meta.

## Alteração feita
- Em `js/marketing.js`, `fbq('set', 'autoConfig', false, ID)` é executado **antes** de `fbq('init', ID)`, para desativar a configuração automática do Pixel.
- Permanecem os disparos manuais `PageView`, `ViewContent` e `InitiateCheckout`, sujeitos ao consentimento.
- O evento `Purchase` continua dependente do webhook de pagamento confirmado e das condições previstas em `netlify/functions/lib/meta.js`.
- A alteração não modifica a seleção de planos, Stripe, Supabase, a área de membros nem os preços.

## Passo necessário no Gerenciador de Eventos
No conjunto de dados do Pixel 1373316378073444, entre em **Configurações** → **Configuração de eventos** e **desative "Rastrear eventos automaticamente sem código"**, se estiver ligado. Confira também se a ferramenta de configuração de eventos não tem uma regra `Subscribe` associada aos botões. Remova essa regra específica caso exista. Essas opções podem variar conforme a versão do painel.

## Teste
1. Publicar os arquivos no GitHub e aguardar Netlify Published.
2. Acessar o site com consentimento de marketing aceito e abrir Eventos de teste.
3. Alternar entre planos diversas vezes: não deve aparecer novo `Subscribe`.
4. Confirmar `PageView` e `ViewContent` e iniciar checkout válido para verificar `InitiateCheckout`.
5. Confirmar `Purchase` separadamente com webhook Stripe em ambiente de teste; não fazer cobranças reais só para testar.

Se `Subscribe` persistir, verificar se há outro Pixel, regras da ferramenta de configuração de eventos ou scripts externos carregados fora deste ZIP.
