'use strict';
const { createHmac, timingSafeEqual } = require('crypto');

function json(statusCode, body) {
  return { statusCode, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(body) };
}
function getHeader(event, name) {
  const headers = event.headers || {};
  const key = Object.keys(headers).find(k => k.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}
function parseBody(event) {
  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  return raw ? JSON.parse(raw) : {};
}
function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Configuração ausente no servidor: ${name}`);
  return value;
}
function siteUrl() {
  const raw = process.env.SITE_URL || process.env.URL;
  if (!raw) throw new Error('Configure SITE_URL nas variáveis da Netlify.');
  const u = new URL(raw);
  if (!['https:', 'http:'].includes(u.protocol)) throw new Error('SITE_URL inválida.');
  return u.origin;
}
async function supabaseRequest(path, options = {}) {
  const base = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const key = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) {
    const detail = data && (data.message || data.error || data.hint);
    throw new Error(`Supabase (${response.status}): ${detail || 'falha na operação'}`);
  }
  return data;
}
function queryString(values) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(values)) if (v !== undefined && v !== null) p.set(k, v);
  return p.toString();
}
async function sbGet(table, filters, select = '*', extra = {}) {
  const q = queryString({ select, ...filters, ...extra });
  return (await supabaseRequest(`${table}?${q}`, { method: 'GET' })) || [];
}
async function sbInsert(table, row, prefer = 'return=representation') {
  const data = await supabaseRequest(table, { method: 'POST', headers: { Prefer: prefer }, body: JSON.stringify(row) });
  return Array.isArray(data) ? data[0] : data;
}
async function sbPatch(table, filters, patch) {
  const q = queryString(filters);
  return supabaseRequest(`${table}?${q}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(patch) });
}
async function authenticate(event) {
  const auth = getHeader(event, 'authorization');
  const token = /^Bearer\s+(.+)$/i.exec(auth || '')?.[1];
  if (!token) throw Object.assign(new Error('Entre na sua conta para continuar.'), { statusCode: 401 });
  const base = requiredEnv('SUPABASE_URL').replace(/\/$/, '');
  const apiKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${base}/auth/v1/user`, { headers: { apikey: apiKey, authorization: `Bearer ${token}` } });
  const user = await response.json().catch(() => null);
  if (!response.ok || !user?.id) throw Object.assign(new Error('Sessão inválida ou expirada. Entre novamente.'), { statusCode: 401 });
  return user;
}
async function assertAdmin(userId) {
  const rows = await sbGet('profiles', { id: `eq.${userId}` }, 'is_admin');
  if (!rows[0]?.is_admin) throw Object.assign(new Error('Acesso restrito à administração.'), { statusCode: 403 });
}
async function stripeRequest(method, path, params) {
  const key = requiredEnv('STRIPE_SECRET_KEY');
  const options = { method, headers: { authorization: `Bearer ${key}` } };
  if (params) {
    options.headers['content-type'] = 'application/x-www-form-urlencoded';
    options.body = new URLSearchParams(params).toString();
  }
  const response = await fetch(`https://api.stripe.com/v1${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Stripe (${response.status}): ${data?.error?.message || 'falha na operação'}`);
  return data;
}
function moneyToCents(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error('O preço deste item não é válido.');
  return Math.round((n + Number.EPSILON) * 100);
}
async function ensurePlanPrice(plan) {
  const cents = moneyToCents(plan.price);
  const months = Number(plan.months || 1);
  const recurring = months < 9999;
  let old = null;
  if (plan.provider_price_id) {
    try { old = await stripeRequest('GET', `/prices/${encodeURIComponent(plan.provider_price_id)}`); } catch { old = null; }
  }
  const cadenceMatches = recurring
    ? old?.recurring?.interval === 'month' && Number(old?.recurring?.interval_count) === months
    : !old?.recurring;
  if (old?.active && Number(old.unit_amount) === cents && old.currency === 'brl' && cadenceMatches) return old.id;

  let productId = typeof old?.product === 'string' ? old.product : old?.product?.id;
  if (!productId) {
    const product = await stripeRequest('POST', '/products', {
      name: String(plan.name || 'Ayla\'s Club').slice(0, 250),
      'metadata[aylas_plan_id]': String(plan.id)
    });
    productId = product.id;
  }
  const priceParams = { product: productId, currency: 'brl', unit_amount: String(cents), 'metadata[aylas_plan_id]': String(plan.id) };
  if (recurring) {
    priceParams['recurring[interval]'] = 'month';
    priceParams['recurring[interval_count]'] = String(months);
  }
  const price = await stripeRequest('POST', '/prices', priceParams);
  await sbPatch('plans', { id: `eq.${plan.id}` }, { provider_price_id: price.id });
  return price.id;
}
function unixIso(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? new Date(Number(value) * 1000).toISOString() : null;
}
function mapSubscriptionStatus(status) {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'canceled') return 'canceled';
  if (status === 'unpaid' || status === 'incomplete_expired') return 'expired';
  return 'pending'; // past_due / incomplete / paused: não libera conteúdo enquanto o pagamento não normaliza.
}
async function syncStripeSubscription(sub) {
  const stripeId = sub?.id;
  if (!stripeId) return null;
  const existing = await sbGet('subscriptions', { provider: 'eq.stripe', provider_ref: `eq.${stripeId}` }, '*', { limit: '1' });
  const userId = sub.metadata?.user_id || existing[0]?.user_id;
  const planId = sub.metadata?.plan_id || existing[0]?.plan_id;
  if (!userId || !planId) return existing[0] || null;
  const periodEnd = sub.current_period_end || sub.items?.data?.[0]?.current_period_end || null;
  const row = {
    user_id: userId,
    plan_id: planId,
    status: mapSubscriptionStatus(sub.status),
    current_period_end: unixIso(periodEnd),
    source: 'stripe',
    provider: 'stripe',
    provider_ref: stripeId,
    cancel_at_period_end: !!sub.cancel_at_period_end
  };
  if (existing[0]) {
    await sbPatch('subscriptions', { id: `eq.${existing[0].id}` }, row);
    return { ...existing[0], ...row };
  }
  return sbInsert('subscriptions', row);
}
function verifyStripeSignature(rawBody, signature, secret) {
  if (!signature) return false;
  const parts = signature.split(',').map(x => x.trim().split('='));
  const timestamp = parts.find(x => x[0] === 't')?.[1];
  const signatures = parts.filter(x => x[0] === 'v1').map(x => x[1]);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return signatures.some(sig => {
    try { const got = Buffer.from(sig, 'hex'); return got.length === expectedBuffer.length && timingSafeEqual(got, expectedBuffer); }
    catch { return false; }
  });
}
module.exports = {
  json, getHeader, parseBody, requiredEnv, siteUrl, supabaseRequest, queryString, sbGet, sbInsert, sbPatch,
  authenticate, assertAdmin, stripeRequest, moneyToCents, ensurePlanPrice, unixIso, mapSubscriptionStatus,
  syncStripeSubscription, verifyStripeSignature
};
