'use strict';
const {
  json, parseBody, getHeader, siteUrl, sbGet, sbInsert, sbPatch, authenticate,
  stripeRequest, moneyToCents
} = require('./lib/shared');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  let order = null;
  try {
    // Guest checkout: Stripe recolhe o email; a conta é vinculada depois da compra.
    const user = getHeader(event, 'authorization') ? await authenticate(event) : null;
    const body = parseBody(event);
    const kind = body.kind;
    if (!['subscription', 'extra'].includes(kind)) return json(400, { error: 'Tipo de compra inválido.' });
    const baseUrl = siteUrl();
    let amount, plan = null, media = null, stripePriceId = null, mode = 'payment';
    if (kind === 'subscription') {
      if (!UUID.test(String(body.plan_id || ''))) return json(400, { error: 'Plano inválido.' });
      const rows = await sbGet('plans', { id: `eq.${body.plan_id}`, active: 'eq.true' }, 'id,name,description,price,months,provider_price_id', { limit: '1' });
      plan = rows[0];
      if (!plan) return json(404, { error: 'Este plano não está disponível.' });
      amount = Number(plan.price);
      if (!(amount > 0)) return json(400, { error: 'O preço deste plano ainda não foi configurado.' });
      const months = Number(plan.months || 1);
      // Novo checkout: todos os novos planos são compras únicas (Pix ou cartão).
      mode = 'payment';
    } else {
      if (!UUID.test(String(body.media_id || ''))) return json(400, { error: 'Conteúdo inválido.' });
      const rows = await sbGet('media', { id: `eq.${body.media_id}`, published: 'eq.true', access: 'eq.extra' }, 'id,title,description,price', { limit: '1' });
      media = rows[0];
      if (!media) return json(404, { error: 'Este conteúdo não está disponível para compra.' });
      amount = Number(media.price);
      if (!(amount > 0)) return json(400, { error: 'O preço deste conteúdo não é válido.' });
    }

    order = await sbInsert('orders', {
      user_id: user?.id || null,
      kind,
      plan_id: plan?.id || null,
      media_id: media?.id || null,
      amount,
      currency: 'BRL',
      status: 'pending',
      purchased_months: plan ? Number(plan.months) : null,
      provider: 'stripe'
    });
    if (!order?.id) throw new Error('Não foi possível registrar o pedido.');

    const metadata = {
      order_id: String(order.id),
      ...(user ? { user_id: String(user.id) } : {}),
      kind,
      ...(plan ? { plan_id: String(plan.id), months: String(plan.months), payment_method: 'one_time' } : {}),
      ...(media ? { media_id: String(media.id) } : {})
    };
    const params = {
      mode,
      success_url: `${baseUrl}/membros.html?checkout=success&session_id={CHECKOUT_SESSION_ID}#acc`,
      cancel_url: `${baseUrl}/membros.html?checkout=cancelled#acc`,
      ...(user ? { client_reference_id: String(user.id) } : {}),
      locale: 'pt-BR',
      'metadata[order_id]': metadata.order_id,
      'metadata[kind]': metadata.kind,
      'line_items[0][quantity]': '1'
    };
    if (user?.email) params.customer_email = user.email;
    if (metadata.user_id) params['metadata[user_id]'] = metadata.user_id;
    if (metadata.plan_id) params['metadata[plan_id]'] = metadata.plan_id;
    if (metadata.media_id) params['metadata[media_id]'] = metadata.media_id;
    if (metadata.months) params['metadata[months]'] = metadata.months;
    if (metadata.payment_method) params['metadata[payment_method]'] = metadata.payment_method;

    if (plan) {
      // Preço avulso criado a partir do valor atual do plano. Não reutilizar
      // provider_price_id: ele pode representar um preço recorrente antigo.
      params['line_items[0][price_data][currency]'] = 'brl';
      params['line_items[0][price_data][unit_amount]'] = String(moneyToCents(plan.price));
      params['line_items[0][price_data][product_data][name]'] = String(plan.name || "Ayla's Club").slice(0, 250);
      for (const [key, value] of Object.entries(metadata)) params[`payment_intent_data[metadata][${key}]`] = value;
    } else {
      const cents = moneyToCents(media.price);
      params['line_items[0][price_data][currency]'] = 'brl';
      params['line_items[0][price_data][unit_amount]'] = String(cents);
      params['line_items[0][price_data][product_data][name]'] = String(media.title || 'Conteúdo exclusivo').slice(0, 250);
      if (media.description) params['line_items[0][price_data][product_data][description]'] = String(media.description).slice(0, 500);
      for (const [key, value] of Object.entries(metadata)) params[`payment_intent_data[metadata][${key}]`] = value;
    }

    const session = await stripeRequest('POST', '/checkout/sessions', params);
    await sbPatch('orders', { id: `eq.${order.id}` }, { provider_ref: session.id });
    return json(200, { url: session.url });
  } catch (error) {
    if (order?.id) {
      try { await sbPatch('orders', { id: `eq.${order.id}` }, { status: 'failed' }); } catch { /* o webhook ainda pode reconciliar o pedido */ }
    }
    const status = error.statusCode || 500;
    return json(status, { error: status === 401 ? error.message : (error.message || 'Não foi possível iniciar o pagamento.') });
  }
};
