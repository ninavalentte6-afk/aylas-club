# Cache e atualizações - Safari / Netlify

Esta entrega é baseada na versão **AYLAS-CLUB-VITRINE-OTIMIZADA**.

- `netlify.toml`: HTML não fica retido no cache do navegador; JS e CSS precisam de revalidação.
- HTMLs: referências locais JS/CSS incluem um parâmetro de versão para invalidar os arquivos da publicação anterior. Nas próximas alterações de código, atualizar o parâmetro de versão é opcional se os cabeçalhos forem respeitados, mas recomendado para deploys críticos.
- Não foi alterado o código de checkout, webhooks, Supabase, banco nem as regras de acesso.
- Dados e mídias continuam vindos do Supabase.

## Instalação
1. Faça backup e publique os arquivos deste ZIP no mesmo repositório do GitHub.
2. Confira que a Netlify está usando `netlify.toml` do diretório de publicação (configurado com `publish = "."`).
3. Faça o deploy e teste a página no Safari normal após fechar e reabrir a aba.
4. Verifique os cabeçalhos de resposta HTTP do `index.html` e de `js/public.js`: `Cache-Control` conforme este arquivo. Se não forem aplicados, verifique configurações de proxy/CDN, domínio personalizado ou sobrescrita de cabeçalhos.

**Limite:** não existe garantia universal de atualização instantânea em abas que já estão abertas/offline. Esta configuração reduz cache desatualizado em novas navegações e recarregamentos. Um Service Worker já instalado ou CDN externa precisaria ser tratado separadamente (não há registro de Service Worker no código desta versão).
