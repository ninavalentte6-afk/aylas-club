'use strict';
const { json, parseBody, authenticate, assertAdmin, sbGet, sbPatch, stripeRequest } = require('./lib/shared');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  try {
    const user = await authenticate(event);
    await assertAdmin(user.id);
    const body = parseBody(event);
    if (!UUID.test(String(body.subscription_id || ''))) return json(400, { error: 'Assinatura inválida.' });
    const rows = await sbGet('subscriptions', { id: `eq.${body.subscription_id}` }, '*', { limit: '1' });
    const sub = rows[0];
    if (!sub) return json(404, { error: 'Assinatura não encontrada.' });
    if (sub.provider === 'stripe' && String(sub.provider_ref || '').startsWith('sub_')) {
      const updated = await stripeRequest('POST', `/subscriptions/${encodeURIComponent(sub.provider_ref)}`, { cancel_at_period_end: 'true' });
      const end = updated.current_period_end || updated.items?.data?.[0]?.current_period_end;
      await sbPatch('subscriptions', { id: `eq.${sub.id}` }, {
        cancel_at_period_end: true,
        current_period_end: end ? new Date(Number(end) * 1000).toISOString() : sub.current_period_end
      });
      return json(200, { ok: true, scheduled: true });
    }
    await sbPatch('subscriptions', { id: `eq.${sub.id}` }, { status: 'canceled', cancel_at_period_end: false });
    return json(200, { ok: true, scheduled: false });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Não foi possível cancelar a assinatura.' });
  }
};
