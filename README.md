# Ayla's Club 2.0

Site estático (HTML/CSS/JS) + Supabase (Auth, Postgres, Storage) + Netlify. Sem build.

## Instalar
1. **Backup** do Supabase (banco e Storage) e do repositório GitHub.
2. Supabase › SQL Editor: execute **`AYLAS-CLUB-2.0-MIGRACAO.sql`** (único SQL necessário; idempotente). Não apaga dados, a conta admin, planos, mídias, reels, assinaturas nem buckets. Atenção: **recria todas as políticas RLS** das tabelas do projeto e as de `storage.objects` que mencionam buckets `aylas-*`.
3. Veja o resultado dos 2 SELECTs finais: (a) deve vir vazio — senão há originais pagos no bucket público (mude o acesso no painel para os mover); (b) deve listar a sua conta admin.
4. Substitua os ficheiros do repositório por este ZIP (raiz: `index.html`, `membros.html`, `admin.html`, `css/`, `js/`, `netlify/`, `netlify.toml`, `manifest.webmanifest`). A Netlify publica a raiz, sem build command. `js/config.js` mantém a URL e a chave pública atuais.
5. Supabase › Authentication › URL Configuration: defina *Site URL* e *Redirect URLs* para o domínio da Netlify (necessário para registo e recuperação de senha). Decida se exige confirmação de e-mail.

## Como funciona
- **Visitante** (`index.html`): vê só as *views* públicas; fotos gratuitas nítidas; exclusivos e extras com miniatura desfocada irrecuperável (gerada a ~28 px e ampliada) + preço individual nos extras.
- **Membro** (`membros.html`): qualquer conta autenticada entra; o acesso aos originais é decidido pelo Supabase (assinatura válida → “exclusivos”; compra paga → o extra). Links assinados de 1 h.
- **Admin** (`admin.html`): exige `profiles.is_admin = true` (a sua conta existente é preservada). O admin também pré-visualiza a área de membros (como admin / assinante / visitante). Entrar já **não** redireciona todos para o painel.
- **Personalizar meu site**: cores, fontes, tamanhos, arredondamentos, colunas, perfil, capa, ONLINE AGORA, métricas e todos os textos, com pré-visualização desktop/mobile em tempo real. Guardar/Cancelar/Restaurar. Tudo persiste em `site_settings.content`.

## Variáveis de ambiente (Netlify) — só quando ativar pagamentos
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (**nunca** no frontend), `PAYMENT_PROVIDER`, e as credenciais do gateway (ex.: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` ou `MP_ACCESS_TOKEN`). Sem elas o checkout responde “não configurado”.

## Pendente / não incluído (ver RELATORIO-DE-TESTES.md)
Checkout e webhook reais (funções em `netlify/functions` são esqueletos que devolvem 501), ícones/PWA completo (manifesto sem ícones), traduções PT/EN/ES, pipeline de miniaturas no servidor, testes reais no seu Supabase.
