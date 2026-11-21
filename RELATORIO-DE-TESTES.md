# Relatório de revisão e testes — Ayla's Club

## Implementado nesta revisão

- Catálogo público separado por vistas de banco com projeção limitada de campos.
- Não expõe `storage_path` do original privado nas vistas públicas.
- RLS de mídias/Reels revista para gratuito, assinante ativo e administrador.
- Política Storage privada revista para validar associação do objeto a mídia/Reel autorizado.
- Leads com consentimento, estados, observações, exclusão e exportação CSV.
- Upload/substituição/remoção da referência de foto de perfil e capa.
- Modal de interesse em extra individual com preço e registo de lead, sem desbloqueio.
- Formulário de interesse em plano grava lead, sem fingir contratação.
- Métricas públicas deixam de contar automaticamente ficheiros cadastrados; valores apresentados são manuais.
- Mudança de bucket de mídia/Reel passou a atualizar a linha no banco antes de remover o objeto antigo, reduzindo risco de perda do ficheiro.
- Área de membros utiliza carregamento autenticado separado e não apresenta o link de administração para membros comuns.

## Verificações executadas

| Verificação | Resultado |
|---|---|
| `node --check` em `admin.js` | Aprovado |
| `node --check` em `config.js` | Aprovado |
| `node --check` em `db.js` | Aprovado |
| `node --check` em `main.js` | Aprovado |
| `node --check` em `members.js` | Aprovado |
| `node --check` em `public.js` | Aprovado |
| Referências locais de CSS/JS nos três HTML | Aprovado |
| Integridade do ZIP original | Aprovado |
| Verificação estática dos fluxos adicionados | Aprovado |

## Não executado / depende do ambiente real

- Execução da migração SQL no Supabase remoto.
- Teste de RLS com visitante anónimo, membro ativo, membro expirado e administrador.
- Teste de URLs assinadas e privacidade de Storage.
- Upload real de foto/capa, mídia e prévias no Supabase Storage.
- Teste de login real e recuperação de senha.
- Teste em iOS, Android e navegadores móveis reais.
- Deploy e validação no domínio Netlify.
- Teste de checkout, webhooks, assinatura e compra individual (não implementados).

## Problemas conhecidos e limitações

- A migração SQL pressupõe que o setup inicial e a função `public.aylas_is_admin()` já existem.
- Antes de aplicar, faça backup e confira os diagnósticos de arquivos privados guardados no bucket público.
- As vistas públicas são desenhadas para expor metadados de catálogo, não originais privados. A segurança final depende de executar a migração e validar as políticas no projeto real.
- As miniaturas desfocadas são geradas no cliente durante upload; para maior garantia e padronização, recomenda-se processamento server-side.
- Os arquivos antigos de foto/capa não são removidos automaticamente do Storage.
- A integração de pagamento e os gráficos/KPIs continuam pendentes. Não utilizar a plataforma para cobrar ou conceder extras até implementar checkout e confirmação por webhook confiável.
