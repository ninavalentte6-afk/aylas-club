# Ayla's Club — pacote atualizado

Este pacote mantém a arquitetura estática existente (HTML, CSS e JavaScript), Supabase Auth/Database/Storage e publicação Netlify. Não cria uma base de dados nova nem substitui os ficheiros de utilizadores existentes.

## O que esta revisão altera

- A página pública passa a consumir vistas de catálogo com campos limitados, em vez de ler diretamente todos os campos das tabelas de mídia.
- O caminho do ficheiro original só é disponibilizado no catálogo público quando o conteúdo é gratuito e está no bucket `aylas-public`.
- A área de membros carrega os registos diretamente das tabelas, sob RLS, para obter URLs assinadas dos conteúdos a que a conta tem direito.
- As políticas conhecidas e permissivas de leitura de mídia/Reels são removidas e substituídas por regras de conteúdo gratuito, assinatura ativa ou administração.
- O acesso aos ficheiros privados é limitado a originais associados a mídias/Reels publicados e autorizados.
- A fotografia de perfil e a capa podem ser carregadas, substituídas e removidas no painel. As URLs são guardadas em `site_settings`; as imagens ficam no bucket público `aylas-public`.
- O formulário de interesse em planos e o modal de interesse em extras passam a registar leads com consentimento no Supabase.
- O painel inclui uma secção de leads com pesquisa visual básica, atualização de estado, observações, exclusão e exportação CSV.
- O perfil público deixa de apresentar automaticamente contagens reais de fotos e vídeos. Métricas públicas são apresentadas como valores manuais editáveis.
- Extras individuais apresentam preço e um modal próprio. O modal regista interesse, mas não desbloqueia o ficheiro: o checkout ainda não existe.
- O menu da área de membros só apresenta a ligação administrativa quando a sessão tem o papel de administradora.

## O que continua pendente

Esta entrega não equivale à implementação integral de todos os requisitos do documento de especificação. Permanecem pendentes:

1. Integração de gateway (Stripe, Mercado Pago ou outro), checkout de assinatura e checkout individual, webhooks assinados, idempotência, reembolsos, renovações e ativação automática. Não há cobrança funcional nesta versão.
2. Dashboard com KPIs reais, receita, funil, gráficos por período, analytics de visualizações e desempenho dos planos.
3. Editor visual completo com todas as cores, tipografia, estilos de botões, bordas e pré-visualização de publicação.
4. Editor completo de textos para todos os rótulos, mensagens e termos. O editor atual cobre apenas os campos definidos em `CONTENT_FIELDS`.
5. Edição/substituição de ficheiros de mídia existentes por uma interface dedicada. O painel existente permite editar metadados, publicar, ordenar, excluir e enviar novos ficheiros.
6. Reels com miniaturas personalizadas, descrição e gestão completa de substituição.
7. Miniaturas de vídeo privadas e processamento de imagem no servidor. A miniatura desfocada de fotos é gerada no browser durante o upload; isto não é um pipeline de processamento de confiança no backend.
8. Métricas com ícones, cores e descrições individuais.
9. Presença online real. O indicador atual é configurável/visual, não uma presença em tempo real.
10. Remoção física automática das antigas imagens de perfil/capa no Storage após substituição ou remoção. A referência no banco é atualizada; ficheiros antigos podem precisar de limpeza manual.
11. Fluxos completos de cadastro/recuperação e gestão de contas de membros, além do login existente.
12. Testes de ponta a ponta com contas reais e dispositivo móvel.

## Pré-requisitos

- O projeto Supabase atual e as tabelas originais devem continuar disponíveis.
- O setup inicial `SUPABASE-SETUP.sql` deve já ter sido executado anteriormente.
- Devem existir os buckets `aylas-public` (público) e `aylas-private` (privado).
- A conta administradora deve ter `profiles.is_admin = true`.
- `js/config.js` deve conter a URL do projeto e uma chave publishable/anon apropriada. Nunca inserir `service_role` no frontend.

## Migração SQL

1. Faça backup do projeto Supabase (banco e Storage).
2. Execute **`AYLAS-CLUB-MIGRACAO-ULTRA.sql`** no SQL Editor do projeto Supabase existente.
3. Esta migração é incremental: adiciona colunas, cria a tabela `leads`, cria vistas de catálogo e substitui políticas RLS conhecidas. Não elimina tabelas nem registos.
4. Leia os dois resultados de diagnóstico no final do SQL. Se aparecer qualquer conteúdo exclusivo no bucket `aylas-public`, mova o original para `aylas-private` antes de publicar. Um objeto num bucket público pode ser descarregado por URL pública, independentemente de RLS na tabela.
5. Não execute scripts antigos de endurecimento depois desta migração sem rever as políticas: alguns scripts anteriores recriam políticas permissivas que esta migração remove.

A migração pressupõe que a função `public.aylas_is_admin()` e as tabelas originais `profiles`, `site_settings`, `plans`, `media`, `reels` e `subscriptions` já existem.

## Publicação

1. Descompacte o ZIP.
2. Faça backup do repositório GitHub atual.
3. Substitua os ficheiros do projeto pela estrutura completa deste ZIP, mantendo `index.html`, `admin.html` e `membros.html` na raiz.
4. Confirme que o diretório de publicação da Netlify é a raiz do repositório (`.`) e que não há build command necessário.
5. Faça commit/push e aguarde o deploy.
6. Teste:
   - `/` — página pública
   - `/admin.html` — painel
   - `/membros.html` — área de membros

## Configuração e operação

- A configuração do Supabase está em `js/config.js`.
- Para promover uma conta existente a administradora, confirme primeiro o e-mail e o ID da conta e execute uma atualização controlada em `profiles.is_admin` no Supabase.
- Os uploads de identidade e conteúdo são feitos com a sessão administrativa e políticas Storage.
- As imagens de perfil/capa ficam públicas. Não carregue ficheiros privados nestes campos.
- Os leads só são registados quando o utilizador envia o formulário e assinala o consentimento.
- O registo de lead não representa uma compra nem ativa uma assinatura.
- Conteúdos `extra` continuam bloqueados até existir checkout e confirmação de pagamento confiável no servidor.
- Conteúdos de assinantes exigem assinatura `active` e `current_period_end` nulo ou futuro.
- Não conceda `service_role` ao browser, nem crie políticas `USING (true)` para operações administrativas.

## Testes executados nesta revisão

- Verificação de sintaxe dos seis ficheiros JavaScript com `node --check`.
- Inspeção da estrutura do ZIP e dos caminhos locais referenciados nos HTML.
- Revisão estática do fluxo de autorização, catálogo público, leads e Storage.
- Revisão estática da migração SQL e das políticas RLS propostas.

## Testes não executados

Não foi possível autenticar no Supabase real, executar a migração no banco remoto, testar as políticas com contas anon/membro/admin, enviar ficheiros para o Storage remoto, testar no domínio Netlify, validar o comportamento em iPhone/Android ou executar testes reais de checkout. Não declarar esses testes aprovados até serem realizados no ambiente do projeto.

## Ficheiros relevantes

- `AYLAS-CLUB-MIGRACAO-ULTRA.sql` — migração incremental desta revisão.
- `SUPABASE-SETUP.sql` — setup histórico inicial; não executar sobre uma base já configurada.
- `ATUALIZACAO-SUPABASE.sql` e `SUPABASE-SECURITY-HARDENING.sql` — scripts anteriores; rever antes de usar, e não executar depois da nova migração sem verificar as políticas recriadas.
