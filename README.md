# Ayla's Club — pacote integrado

Este repositório contém o site público, o painel administrativo e a área de membros numa única publicação estática da Netlify. As páginas utilizam o mesmo cliente Supabase configurado em `js/config.js`.

## O que está ligado

- **Site público (`index.html`)**: lê dados institucionais, planos ativos, catálogo publicado, métricas e Reels gratuitos do Supabase. Conteúdos exclusivos sem miniatura pública aparecem como cartões bloqueados genéricos.
- **Painel (`admin.html`)**: exige sessão Supabase Auth e valida `profiles.is_admin`; permite gerir planos, textos, aparência, mídias e reels. A listagem de assinaturas lê os registos reais e apresenta o estado efetivo, considerando a data de término.
- **Área de membros (`membros.html`)**: exige sessão e assinatura ativa/não expirada. Os conteúdos de assinantes são obtidos através do bucket privado e URLs assinadas temporárias.
- **Armazenamento**: uploads administrativos são gravados em `aylas-public` para prévias grátis e `aylas-private` para conteúdos exclusivos.
- **Pagamentos**: não há checkout, cobrança, desbloqueio de extras nem confirmação simulada. A arquitetura permanece dependente de uma função/webhook de servidor para criar/ativar assinaturas após confirmação real.

## Atualização funcional (novembro de 2026)

Esta versão acrescenta:
- Catálogo público com cartões bloqueados para conteúdos exclusivos. Sem miniatura pública específica, é mostrada uma prévia gráfica genérica; o ficheiro privado não é descarregado nem recebe URL assinada para visitantes.
- Reels gratuitos com player HTML5 real (`video`, `controls`, `playsinline`); Reels exclusivos permanecem bloqueados no catálogo público e só são reproduzidos após autorização.
- Gestão de métricas manuais e automáticas no painel, persistidas em `site_settings.metrics`.
- Ordenação de mídias e Reels com controlos de subir/descer, persistida em `sort_order`.

### SQL obrigatório desta atualização

Antes de publicar, execute **uma vez** `ATUALIZACAO-SUPABASE.sql` no SQL Editor. O script:
1. Adiciona `sort_order` a `media` e `reels`, se ainda não existir.
2. Adiciona `metrics` JSONB a `site_settings`, se ainda não existir.
3. Permite leitura dos metadados de conteúdos publicados para apresentar os cartões bloqueados. Não concede acesso aos ficheiros privados.
4. Mantém a escrita protegida pelas permissões e políticas administrativas já existentes.

O SQL inclui duas consultas de diagnóstico para identificar ficheiros guardados no bucket errado. Se devolver linhas, corrija o armazenamento antes de considerar o conteúdo privado: objetos dentro de `aylas-public` são acessíveis publicamente, independentemente do RLS da tabela.


1. Confirme no Supabase que existem as tabelas `profiles`, `site_settings`, `plans`, `media`, `subscriptions` e `reels`, e os buckets `aylas-public` e `aylas-private`.
2. **Não volte a executar `SUPABASE-SETUP.sql` sobre uma base já configurada.** Esse ficheiro é o setup inicial histórico e contém operações de criação/alteração de políticas.
3. Se ainda não executou, aplique também `SUPABASE-SECURITY-HARDENING.sql` conforme as instruções abaixo. Não o reexecute sem necessidade. A migração não apaga dados; restringe o acesso aos conteúdos de assinantes, mantém extras bloqueados até ao gateway e limita a leitura do bucket privado a objetos associados a conteúdos autorizados.
Antes de aplicar a migração, verifique se existem registos de conteúdo exclusivo indevidamente guardados no bucket público. Objetos num bucket público podem ser acedidos por URL sem passar pelas políticas RLS:

```sql
select id, title, access, storage_bucket, storage_path
from public.media
where (access in ('subs','extra') and storage_bucket = 'aylas-public')
   or (access = 'free' and storage_bucket <> 'aylas-public');

select id, title, is_free, storage_bucket, storage_path
from public.reels
where (is_free = false and storage_bucket = 'aylas-public')
   or (is_free = true and storage_bucket <> 'aylas-public');
```

Se a primeira condição de qualquer consulta devolver linhas, mova os ficheiros para o bucket correto antes de considerar o conteúdo privado. A migração SQL não consegue tornar privados objetos que já estejam num bucket público.

4. Confirme que o utilizador administrativo existente tem `profiles.is_admin = true`.
5. Em `js/config.js`, confirme a URL do projeto e a chave **publishable**. A chave publishable pode estar no frontend. Nunca coloque uma chave `service_role` ou secret key em ficheiros públicos.

## Publicar no GitHub e Netlify

1. Descompacte o ZIP e carregue **todo o conteúdo** para a raiz do repositório GitHub ligado à Netlify. `index.html`, `admin.html` e `membros.html` devem ficar na raiz.
2. Faça commit/push para o branch de produção.
3. Na Netlify, confirme que o repositório correto está ligado e que o diretório de publicação é a raiz (`.`). Não é necessário build command para esta versão estática.
4. Aguarde o deploy e teste:
   - `https://aylas-club.netlify.app/`
   - `https://aylas-club.netlify.app/admin.html`
   - `https://aylas-club.netlify.app/membros.html`

## Métricas e ordenação

No painel, abra **Métricas** para criar métricas manuais ou automáticas. As fontes automáticas disponíveis são fotos publicadas, vídeos publicados, Reels publicados e conteúdos exclusivos. Os valores automáticos não são editáveis. A ordem pode ser alterada com as setas no painel de Mídias e Reels; carregue em **Salvar alterações** para persistir a nova ordem.

A área pública não recebe URLs assinadas para conteúdos privados. A prévia desfocada é apenas gráfica quando não existe uma miniatura pública autorizada; não é aplicado blur ao ficheiro original privado.

## Operação

- Crie/edite planos no painel e marque como ativos apenas planos com preço superior a zero.
- Faça uploads de conteúdos gratuitos ou exclusivos escolhendo o tipo de acesso antes de enviar.
- Um conteúdo `extra` permanece bloqueado e não é apresentado como desbloqueável até existir checkout real.
- Assinaturas são apenas consultadas no painel. A ativação manual não foi exposta no frontend.
- A expiração é aplicada pelo `current_period_end`, mesmo que o campo `status` ainda esteja como `active`.

## Limites e testes

Foi possível validar estaticamente a estrutura e a sintaxe JavaScript. Não foi possível autenticar no projeto Supabase, consultar os dados reais, executar uploads no Storage, validar RLS em ambiente remoto, nem testar o deploy na Netlify a partir deste ambiente. Esses testes dependem das credenciais e do ambiente externo.

## Etapa futura: gateway de pagamento

Ainda será necessário implementar uma Netlify Function ou Supabase Edge Function com segredo guardado no ambiente do servidor, criar a assinatura como `pending`, validar a notificação assinada do gateway, e só então mudar o estado para `active` e atualizar `current_period_end`. Cancelamentos, reembolsos e expirações também devem ser processados no servidor. Nunca permita que o browser confirme o pagamento ou altere diretamente o próprio estado de assinatura.
