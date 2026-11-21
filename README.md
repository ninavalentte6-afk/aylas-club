# Ayla's Club — revisão compatível com o Supabase atual

Este pacote é uma revisão incremental do projeto HTML/CSS/JavaScript já existente. Mantém a arquitetura atual: Supabase Auth, Database e Storage, com publicação estática na Netlify.

## O que foi ajustado nesta revisão

- A página inicial continua pública; o visitante não precisa entrar para visualizar o perfil e o catálogo público.
- A área de membros não usa mais o e-mail como título principal. Mostra o nome de exibição e deixa o e-mail em tamanho discreto.
- As etiquetas de conteúdo exclusivo ficam ancoradas no topo do cartão, sem a transformação que as deslocava para fora.
- Os botões de bloqueio/desbloqueio foram limitados ao cartão e ajustados para telas pequenas.
- O painel agora permite guardar temas separados para página inicial, área de membros e painel administrativo, em `site_settings.content.themePages`.
- O nome do logotipo pode ser editado separadamente em Textos e conteúdo (`logoText`), sem alterar o nome principal do perfil.
- A migração SQL desta entrega é compatível com o bloco informado como já executado e não remove nem recria políticas RLS.

## SQL correto para a base atual

Use **somente** `AYLAS-CLUB-MIGRACAO-COMPATIVEL.sql` no Supabase SQL Editor.

Características:
- `ADD COLUMN IF NOT EXISTS` para colunas já criadas ou ausentes;
- atualiza os privilégios SQL necessários;
- cria/substitui os catálogos públicos com os mesmos campos usados pelo frontend;
- não executa `DROP POLICY`;
- não executa `CREATE POLICY`;
- não apaga registros, usuários, assinaturas ou objetos do Storage.

O SQL que você informou já ter executado criou as colunas e as duas views. Portanto, a migração compatível será em grande parte idempotente, reforçando grants e garantindo que as views estejam no formato esperado.

**Não execute** `ATUALIZACAO-SUPABASE.sql` nem `SUPABASE-SECURITY-HARDENING.sql`: são scripts históricos de versões anteriores e podem alterar políticas. `SUPABASE-SETUP.sql` é apenas para criar um projeto novo, nunca para rodar no projeto atual.

## O que permanece pendente — não declarar como concluído

1. Seletor de idioma na primeira visita e traduções completas em português, inglês e espanhol. A decisão de UX está definida, mas a tradução de todas as páginas, modais, mensagens e textos dinâmicos ainda precisa ser implementada e testada.
2. Gateway. Stripe e Mercado Pago ainda precisam ser comparados e aprovados para o tipo exato de conteúdo e país de operação. Não há checkout, webhook, cobrança, renovação nem ativação automática nesta entrega.
3. Editor visual de fontes, tamanhos, espaçamentos e pré-visualização completa.
4. Testes reais no Supabase remoto, em contas anônima/membro/admin e em aparelhos físicos.
5. Processamento de miniaturas privadas no servidor. As prévias atuais são geradas no navegador e não impedem captura de tela.

## Segurança e preservação de dados

- Não foi adicionada chave `service_role` ao frontend.
- Os arquivos originais de conteúdo pago devem permanecer no bucket privado `aylas-private`.
- As prévias públicas devem conter somente versões derivadas/desfocadas, nunca o original pago.
- A área de membros continua consultando as tabelas base sob RLS; a página pública usa `public_media_catalog` e `public_reels_catalog`.
- Não há integração de pagamento nesta entrega. Não marque leads como compras nem ative assinaturas manualmente por retorno de navegador.

## Publicação

1. Faça backup do repositório GitHub e do Supabase (banco e Storage).
2. Execute `AYLAS-CLUB-MIGRACAO-COMPATIVEL.sql` no projeto Supabase atual.
3. Confirme que a execução terminou sem erro.
4. Substitua os arquivos do site pela estrutura deste ZIP, mantendo `index.html`, `admin.html`, `membros.html`, `css/` e `js/` na raiz.
5. Confirme que a Netlify publica a raiz do repositório, sem build command.
6. Teste `/`, `/admin.html` e `/membros.html` antes de divulgar.

## Configuração

A URL e a chave pública do Supabase estão em `js/config.js`. A chave publishable/anon pode estar no frontend; nunca coloque `service_role` nesse arquivo.
