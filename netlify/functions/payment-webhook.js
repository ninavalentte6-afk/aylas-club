// Webhook — PREPARADO, NÃO ATIVO. Deve: 1) verificar a assinatura do gateway; 2) gravar em webhook_events (idempotência);
// 3) marcar orders.status='paid'/'refunded'; 4) criar/renovar subscriptions (source='gateway'). Usa service_role SÓ aqui (servidor).
exports.handler=async()=>({statusCode:501,body:JSON.stringify({error:'not_configured'})});
