# Ayla's Club — Vitrine pública compacta (23/11/2026)

Esta atualização parte do ZIP `aylas-club-main.zip` enviado pelo proprietário.

## O que muda

- Na página pública, a galeria mostra **4 prévias por padrão** (limite configurável entre 1 e 24), mais um cartão de conversão com texto editável (padrão: `+200 mídias`).
- No painel **Personalizar meu site → Vitrine pública**, é possível escolher quais mídias aparecem, ordenar manualmente, buscar pelo título e ajustar a quantidade e os textos do cartão.
- O modo automático usa a ordem das mídias publicadas. O modo manual usa exatamente as mídias escolhidas, respeitando o limite configurado.
- Os filtros da galeria (`Tudo`, `Grátis`, `Exclusivos`, `Extras`) atuam apenas sobre a seleção de prévias da vitrine. A área de membros mantém toda a biblioteca publicada.
- Os botões de chamada para assinar **fora da caixa de planos** passam a rolar suavemente até a seção de planos. **Somente o botão de compra dentro da seção de planos** inicia o checkout.
- Reels continuam como trilho horizontal, sem alterações no seu carregamento.

## Implantação

1. Faça backup do repositório atual e confirme que o ZIP contém os arquivos da última versão publicada.
2. Substitua os arquivos do projeto no GitHub pelos arquivos desta atualização (sem incluir segredos em commits).
3. Espere a Netlify concluir um novo deploy.
4. No admin, abra `Personalizar meu site → Vitrine pública`; ajuste a quantidade, o texto e a seleção das prévias; depois clique **Guardar alterações**.
5. Teste em celular: botão superior, botão abaixo da galeria e botão fixo devem rolar aos planos; escolha um plano e confirme que o botão na caixa de planos abre a Stripe.

**Banco de dados:** nenhuma migração SQL é necessária. Os novos campos são guardados em `site_settings.content`, que já é `jsonb` na versão atual.

**Pagamentos:** não foram modificadas as Netlify Functions, chaves, lógica de webhook, preços, nem tabelas de pagamento. A alteração não exige trocar chaves da Stripe.

## Notas

- O texto `+200 mídias` é **manual e editável**: ajuste-o para que reflita o volume real/anunciado de conteúdos.
- Esta atualização não remove mídias do Supabase e não impede o armazenamento de novos itens.
- Os testes locais verificam sintaxe JavaScript e o fluxo automatizado de pagamento existente; é necessário testar a interface no site publicado.
