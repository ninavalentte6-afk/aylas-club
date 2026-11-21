'use strict';
const {
  json, requiredEnv, getHeader, sbGet, sbInsert, sbPatch, stripeRequest,
  unixIso, syncStripeSubscription, verifyStripeSignature
} = require('./lib/shared');

async function setOrder(orderId, patch) {
  if (!orderId) return;
  await sbPatch('orders', { id: `eq.${orderId}` }, patch);
}
async function getSubscriptionId(invoice) {
  return invoice.subscription || invoice.parent?.subscription_details?.subscription || null;
}
async function markCheckoutPaid(session) {
  const md = session.metadata || {};
  if (session.mode === 'subscription' && session.subscription) {
    const sub = typeof session.subscription === 'string'
      ? await stripeRequest('GET', `/subscriptions/${encodeURIComponent(session.subscription)}`)
      : session.subscription;
    await syncStripeSubscription(sub);
    if (session.payment_status === 'paid' || sub.status === 'active' || sub.status === 'trialing') {
      await setOrder(md.order_id, { status: 'paid', paid_at: new Date().toISOString(), provider_ref: session.id });
    }
    return;
  }
  if (session.payment_status !== 'paid') return;
  await setOrder(md.order_id, { status: 'paid', paid_at: new Date().toISOString(), provider_ref: session.id });
  // O plano vitalício é uma compra única, mas libera acesso permanente pela tabela subscriptions.
  if (md.kind === 'subscription' && md.plan_id && md.user_id && session.payment_intent) {
    const pi = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent.id;
    const existing = await sbGet('subscriptions', { provider: 'eq.stripe', provider_ref: `eq.${pi}` }, 'id', { limit: '1' });
    const row = {
      user_id: md.user_id, plan_id: md.plan_id, status: 'active', current_period_end: null,
      source: 'stripe', provider: 'stripe', provider_ref: pi, cancel_at_period_end: false
    };
    if (existing[0]) await sbPatch('subscriptions', { id: `eq.${existing[0].id}` }, row);
    else await sbInsert('subscriptions', row);
  }
}
async function handleInvoicePaid(invoice) {
  const stripeSubId = await getSubscriptionId(invoice);
  if (!stripeSubId) return;
  const sub = await stripeRequest('GET', `/subscriptions/${encodeURIComponent(stripeSubId)}`);
  const dbSub = await syncStripeSubscription(sub);
  // A primeira cobrança já foi registrada pelo checkout.session.completed.
  if (invoice.billing_reason === 'subscription_create') return;
  const md = sub.metadata || {};
  const invoiceId = invoice.id;
  if (!invoiceId || !md.user_id || !md.plan_id || Number(invoice.amount_paid || 0) <= 0) return;
  const existing = await sbGet('orders', { provider: 'eq.stripe', provider_ref: `eq.${invoiceId}` }, 'id', { limit: '1' });
  if (existing[0]) return;
  await sbInsert('orders', {
    user_id: md.user_id,
    kind: 'subscription',
    plan_id: md.plan_id,
    amount: Number(invoice.amount_paid) / 100,
    currency: String(invoice.currency || 'brl').toUpperCase(),
    status: 'paid',
    provider: 'stripe',
    provider_ref: invoiceId,
    paid_at: unixIso(invoice.status_transitions?.paid_at) || new Date().toISOString()
  });
  return dbSub;
}
async function handleInvoiceFailed(invoice) {
  const stripeSubId = await getSubscriptionId(invoice);
  if (!stripeSubId) return;
  try {
    const sub = await stripeRequest('GET', `/subscriptions/${encodeURIComponent(stripeSubId)}`);
    await syncStripeSubscription(sub);
  } catch {
    await sbPatch('subscriptions', { provider: 'eq.stripe', provider_ref: `eq.${stripeSubId}` }, { status: 'pending' });
  }
}
async function handleRefund(charge) {
  let order = null;
  if (charge.invoice) {
    const rows = await sbGet('orders', { provider: 'eq.stripe', provider_ref: `eq.${charge.invoice}` }, '*', { limit: '1' });
    order = rows[0] || null;
  }
  let paymentIntent = charge.payment_intent;
  if (!order && paymentIntent) {
    const pi = await stripeRequest('GET', `/payment_intents/${encodeURIComponent(paymentIntent)}`);
    const orderId = pi.metadata?.order_id;
    if (orderId) {
      const rows = await sbGet('orders', { id: `eq.${orderId}` }, '*', { limit: '1' });
      order = rows[0] || null;
    }
  }
  if (!order) return;
  await setOrder(order.id, { status: 'refunded', refunded_at: new Date().toISOString() });
  if (order.kind === 'subscription' && paymentIntent) {
    await sbPatch('subscriptions', { provider: 'eq.stripe', provider_ref: `eq.${paymentIntent}` }, { status: 'expired' });
  }
}
async function processEvent(event) {
  const obj = event.data?.object || {};
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded':
      await markCheckoutPaid(obj); break;
    case 'checkout.session.expired':
      await setOrder(obj.metadata?.order_id, { status: 'canceled' }); break;
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncStripeSubscription(obj); break;
    case 'invoice.paid':
      await handleInvoicePaid(obj); break;
    case 'invoice.payment_failed':
      await handleInvoiceFailed(obj); break;
    case 'payment_intent.payment_failed':
      await setOrder(obj.metadata?.order_id, { status: 'failed' }); break;
    case 'charge.refunded':
      await handleRefund(obj); break;
    default:
      break;
  }
}
exports.handler = async event => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'method_not_allowed' });
  try {
    const rawBody = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
    const signature = getHeader(event, 'stripe-signature');
    if (!verifyStripeSignature(rawBody, signature, requiredEnv('STRIPE_WEBHOOK_SECRET'))) return json(400, { error: 'invalid_signature' });
    const stripeEvent = JSON.parse(rawBody);
    const inserted = await sbInsert('webhook_events', {
      provider: 'stripe', event_id: stripeEvent.id, payload: stripeEvent
    }, 'resolution=ignore-duplicates,return=representation');
    if (!inserted) {
      const prior = await sbGet('webhook_events', { provider: 'eq.stripe', event_id: `eq.${stripeEvent.id}` }, 'processed_at', { limit: '1' });
      if (prior[0]?.processed_at) return json(200, { received: true, duplicate: true });
    }
    await processEvent(stripeEvent);
    await sbPatch('webhook_events', { provider: 'eq.stripe', event_id: `eq.${stripeEvent.id}` }, { processed_at: new Date().toISOString() });
    return json(200, { received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error.message);
    return json(500, { error: 'webhook_processing_failed' });
  }
};
