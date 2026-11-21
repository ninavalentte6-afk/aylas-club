'use strict';
const { json, siteUrl, authenticate, sbGet, stripeRequest } = require('./lib/shared');
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  try {
    const user = await authenticate(event);
    const rows = await sbGet('subscriptions', { user_id: `eq.${user.id}`, provider: 'eq.stripe', status: 'in.(active,pending,expired)' }, 'provider_ref,created_at', { order: 'created_at.desc', limit: '20' });
    const subRow = rows.find(x => String(x.provider_ref || '').startsWith('sub_'));
    if (!subRow) return json(404, { error: 'Não encontramos uma assinatura recorrente Stripe ativa nesta conta.' });
    const sub = await stripeRequest('GET', `/subscriptions/${encodeURIComponent(subRow.provider_ref)}`);
    if (!sub.customer) return json(400, { error: 'Esta assinatura não possui um cliente Stripe associado.' });
    const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
    const portal = await stripeRequest('POST', '/billing_portal/sessions', {
      customer: customerId,
      return_url: `${siteUrl()}/membros.html#acc`
    });
    return json(200, { url: portal.url });
  } catch (error) {
    return json(error.statusCode || 500, { error: error.message || 'Não foi possível abrir o portal de cobrança.' });
  }
};
