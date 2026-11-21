'use strict';
// Vincula compras feitas como visitante à identidade de email já verificado no Supabase.
const { json, authenticate, sbGet, sbPatch, sbInsert } = require('./lib/shared');

function endOfPeriod(paidAt, months) {
  if (months >= 9999) return null;
  const start = new Date(paidAt);
  if (!Number.isFinite(start.valueOf()) || !Number.isInteger(months) || months < 1) throw new Error('Período inválido.');
  const day = start.getUTCDate();
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1, start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end.toISOString();
}

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  try {
    const user = await authenticate(event);
    const email = String(user.email || '').trim().toLowerCase();
    // Não permitir que emails arbitrários/sequências não verificadas recebam conteúdo pago.
    if (!email || !user.email_confirmed_at) return json(403, { error: 'Confirme o email da sua conta para ativar compras anteriores.' });

    const eligible = await sbGet('orders', {
      guest_email: `eq.${email}`, status: 'eq.paid', kind: 'in.(subscription,extra)',
      'or': `(user_id.is.null,user_id.eq.${user.id})`
    }, 'id,user_id,kind,plan_id,media_id,provider_ref,paid_at,purchased_months');
    let linked = 0;
    for (const order of eligible) {
      if (!order.user_id) {
        const changed = await sbPatch('orders', {
          id: `eq.${order.id}`, user_id: 'is.null', status: 'eq.paid', guest_email: `eq.${email}`
        }, { user_id: user.id });
        if (!Array.isArray(changed) || !changed.length) continue;
        linked++;
      }
      if (order.kind !== 'subscription' || !order.plan_id) continue;
      const reference = order.provider_ref; // checkout session id, imutável e exclusivo
      if (!reference) continue;
      const existing = await sbGet('subscriptions', { provider:'eq.stripe', provider_ref:`eq.${reference}` }, 'id', { limit:'1' });
      if (existing[0]) continue;
      const pl = await sbGet('plans', { id:`eq.${order.plan_id}` }, 'id,months', { limit:'1' });
      if (!pl[0]) throw new Error('Plano da compra não encontrado.');
      const months = Number(order.purchased_months || pl[0].months);
      const current_period_end = endOfPeriod(order.paid_at, months);
      try {
        await sbInsert('subscriptions', { user_id:user.id, plan_id:order.plan_id, status:'active',
          current_period_end, source:'stripe',provider:'stripe',provider_ref:reference,cancel_at_period_end:false });
      } catch (err) {
        // Corrida entre duas abas: índice único protege o acesso da duplicação.
        const raced = await sbGet('subscriptions', { provider:'eq.stripe', provider_ref:`eq.${reference}` }, 'id', { limit:'1' });
        if (!raced[0]) throw err;
      }
    }
    return json(200, { ok:true, linked });
  } catch (error) {
    console.error('Claim purchase:', error.message);
    const status = error.statusCode || 500;
    return json(status, { error:status===401?error.message:'Não foi possível vincular suas compras. Tente novamente.' });
  }
};
