# Ayla's Club — Relatório de revisão e testes

## Alterações implementadas nesta revisão

- Mantida a arquitetura HTML/CSS/JavaScript com Supabase Auth, Database e Storage e publicação estática na Netlify.
- Página pública continua sendo a rota raiz (`index.html`) e não depende de autenticação para abrir.
- Falha de consulta remota não substitui mais toda a página pública por uma tela de erro; a interface-base é renderizada com aviso discreto.
- Editor de aparência com cores para fundo geral, cartões, cartões secundários, texto principal/secundário, destaque, botões, texto dos botões, etiquetas e bordas; persistência dentro de `site_settings.content.theme`.
- Métricas manuais com prefixo e sufixo para exibir, por exemplo, `+400` sem expor contagens reais do armazenamento.
- Cards de extras com preço e chamada de desbloqueio mais destacados.
- Reels e vídeos públicos/membros com autoplay silencioso e loop, respeitando políticas do navegador; `controlsList=nodownload`, bloqueio de menu contextual no elemento e desativação de picture-in-picture quando suportado.
- Cards da área de membros com prévia em movimento para vídeos e carregamento lazy para fotos.
- Migração incremental atualizada para conceder `SELECT` público controlado por RLS em `site_settings` e `plans` ativos, além das estruturas já descritas no README.

## Testes executados localmente

- `node --check` em todos os arquivos `js/*.js` — aprovado.
- Inspeção dos caminhos de entrada `index.html`, `admin.html`, `membros.html` — estrutura presente.
- Inspeção do ZIP de origem e do ZIP de revisão anterior — concluída; alterações anteriores foram auditadas e reaproveitadas como base.
- Verificação de integridade do ZIP final — executada após empacotamento.

## Testes que NÃO foram possíveis neste ambiente

- Login com as contas reais do Supabase e confirmação de papéis admin/membro.
- Execução da migração no banco remoto e validação de políticas RLS/Storage efetivas.
- Upload e leitura real de fotos/vídeos no Storage remoto.
- Teste de navegação no domínio publicado da Netlify em aparelho Android/iPhone.
- Teste de checkout e webhooks (gateway ainda não foi integrado).

## Segurança e limitações importantes

- `controlsList=nodownload`, ausência de botão de download e bloqueio de menu contextual reduzem o download casual, mas não impedem captura de tela, gravação de tela, ferramentas de desenvolvedor ou extração de uma URL que o navegador precisa reproduzir. Proteção absoluta contra cópia não existe em conteúdo entregue ao navegador.
- Autoplay depende do navegador, economia de dados/bateria e condições de rede. Os vídeos são iniciados mutados para maximizar compatibilidade.
- A prévia desfocada de fotos é derivada no navegador no fluxo de upload; para conteúdo antigo é necessário executar a rotina de geração de prévias no painel. A implementação atual não substitui um pipeline de processamento confiável no servidor.
- O botão de assinatura e o botão de extra pago ainda registram interesse; não cobram nem liberam conteúdo. A liberação exige gateway e confirmação de pagamento no servidor.
- Se o Supabase continuar negando acesso ou estiver sem configuração, a página pública abre com estado-base/aviso, mas não pode carregar dados reais até a correção do projeto Supabase.

## Antes de publicar

1. Fazer backup do repositório, banco e Storage.
2. Conferir as duas consultas de diagnóstico no final da migração e corrigir objetos privados encontrados no bucket público.
3. Executar `AYLAS-CLUB-MIGRACAO-ULTRA.sql` apenas no projeto Supabase existente e validar o resultado.
4. Substituir os arquivos do repositório pela estrutura do ZIP e aguardar o deploy Netlify.
5. Testar anon, admin e membro com contas distintas antes de divulgar o endereço.
