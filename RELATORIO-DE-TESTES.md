# Relatório — Ayla's Club 2.0

## Implementado (ficheiros reais do projeto reescritos)
- `css/style.css` novo design system (variáveis editáveis, mobile-first, navegação inferior na área de membros e no admin).
- `js/db.js`, `js/core.js` (substitui `main.js`), `js/public.js`, `js/members.js`, `js/admin.js`; HTML das 3 páginas.
- Site público: capa, perfil, ONLINE AGORA, bio, métricas manuais, reels, galeria com filtros (Tudo/Grátis/Exclusivos/Extras), planos com destaque e benefícios, visualizador com anterior/seguinte/zoom/swipe.
- Área de membros: início personalizado, galeria com busca, reels, extras (adquiridos/disponíveis), favoritos persistentes, conta (perfil, avatar, assinatura, histórico de compras, sair), pré-visualização admin.
- Admin: dashboard com dados reais e filtros de período, personalizar site, mídias (editar, substituir ficheiro mantendo dados, filtros, ordem, publicar, excluir), extras, reels, planos (benefícios, destaque, ordem, exclusão com aviso), membros (concessão/cancelamento manual), leads (estado, notas, CSV), configurações.
- Auth: registo, login, recuperação de senha; sem redirecionamento forçado ao painel.
- SQL: `AYLAS-CLUB-2.0-MIGRACAO.sql` (compras `orders`, RLS, Storage, views públicas).

## Testado (executado)
- `node --check` em todos os JS: OK.
- Matriz de regras de desfoque (13 verificações em Node): gratuito nítido; exclusivo/extra desfocados para visitante; assinante vê exclusivo; extra só para comprador; modos do admin; preço individual no extra; tile bloqueado não expõe URL original. **Todas passaram.**

## NÃO testado (limitações reais)
- Nada foi executado contra o seu Supabase (sem rede neste ambiente): o SQL não foi corrido num Postgres; login/registo, uploads, URLs assinadas e RLS **precisam ser testados por si** com contas visitante/membro/admin.
- Sem testes em navegador/aparelho real (layout mobile, Safari, visualizador, pré-visualização em iframe). Sem verificação de scroll horizontal.
- Edição simultânea de textos longos e a migração de temas antigos (`themePages`) foram só revistas no código.
- Pagamentos: não implementados (esqueletos 501). Extras não podem ser desbloqueados até existir webhook real.
- Sem PWA completo (falta service worker e ícones), sem traduções, sem “Reordenar” por arrastar (usa setas), sem editor de textos adicionar/ocultar itens livres além dos campos listados.
- Miniaturas desfocadas são geradas no navegador do admin; não impedem captura de ecrã de quem já tem acesso.

## Pendências externas
Gateway (escolha, aprovação do tipo de conteúdo, credenciais, webhook), URLs do Supabase Auth, domínio, ícones PWA.
