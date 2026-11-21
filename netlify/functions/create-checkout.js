// Checkout — PREPARADO, NÃO ATIVO. Sem as variáveis de ambiente abaixo responde 501 e o site mostra "pagamento em breve".
// Nunca liberta conteúdo: só o webhook (payment-webhook.js), após confirmação do gateway, grava orders.status='paid'.
// Variáveis: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PAYMENT_PROVIDER ('stripe'|'mercadopago'), credenciais do gateway.
exports.handler=async()=>{
  const need=['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','PAYMENT_PROVIDER'];
  if(need.some(k=>!process.env[k]))return {statusCode:501,body:JSON.stringify({error:'not_configured'})};
  // TODO (após escolher o gateway): validar o JWT do utilizador, criar linha em orders (status 'pending'),
  // criar a sessão de pagamento no gateway com preço lido da base (nunca do cliente) e devolver {url}.
  return {statusCode:501,body:JSON.stringify({error:'not_configured',detail:'adaptador do gateway por implementar'})};
};
