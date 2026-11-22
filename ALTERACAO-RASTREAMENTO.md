# Ajuste do rastreamento Meta

- Removida a condição `META_TRACKING_ENABLED` do envio `Purchase` no webhook.
- O envio depende agora de `META_CAPI_ACCESS_TOKEN`, consentimento registrado no checkout, confirmação `paid` e pedido elegível de assinatura.
- O token deve ser configurado como segredo nas variáveis de ambiente do Netlify para Functions.
- Não é necessário definir `META_TRACKING_ENABLED`.
- Sem consentimento ou sem token o evento não é enviado; isso não afeta o pagamento.
- Valide as políticas aplicáveis da Meta e faça testes com Stripe em modo teste antes de usar em produção.
