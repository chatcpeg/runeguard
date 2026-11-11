// Vercel Function (Node, Web handler, no dependencies) · docs/PROPOSAL-shop.md §5 · docs/SETUP-payments.md
//   GET  /api/checkout                       → {configured}  (the game turns its buy buttons on with this)
//   POST /api/checkout {product}  + Authorization: Bearer <Supabase access token of the player>
//        → 200 {url} of a Stripe Checkout Session (THB · card + PromptPay) · the game sends the player there
// The price, runes and days come from api/_shop.js only (the body carries nothing but a product id). The player is whoever
// GoTrue says the token belongs to (GET /auth/v1/user) — never an id from the request. metadata {app, user_id, product} is what
// api/stripe-webhook.js checks before it records the purchase. No key is ever sent to the browser or written to a log.
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, APP_URL, UUID, product, keys, configured, testMode, testUsers, json, timedFetch, readBody, defaultDeps } from './_shop.js';

const ORIGIN_OK = [/^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/, /^https:\/\/runeguard-[a-z0-9-]{1,60}-chatcpegs-projects\.vercel\.app$/];
// where Stripe sends the player back: this deployment when it is the site, a preview of it or a local `vercel dev` · else the site
export function appOrigin(request) {
  let o = ''; try { o = new URL(request.url).origin; } catch (e) { /* keep '' */ }
  return o === APP_URL || ORIGIN_OK.some(re => re.test(o)) ? o : APP_URL;
}
// Stripe's form encoding of one Checkout Session (nested keys in brackets)
export function sessionForm(p, id, uid, origin, nowSec) {
  const f = new URLSearchParams(), md = { app: 'runeguard', user_id: uid, product: id };
  f.set('mode', 'payment');
  f.set('payment_method_types[0]', 'card');
  f.set('payment_method_types[1]', 'promptpay');
  f.set('line_items[0][quantity]', '1');
  f.set('line_items[0][price_data][currency]', 'thb');
  f.set('line_items[0][price_data][unit_amount]', String(p.thb * 100));   // satang
  f.set('line_items[0][price_data][product_data][name]', p.name);
  f.set('line_items[0][price_data][product_data][description]', p.desc);
  for (const [k, v] of Object.entries(md)) { f.set('metadata[' + k + ']', v); f.set('payment_intent_data[metadata][' + k + ']', v); }
  f.set('client_reference_id', uid);
  f.set('success_url', origin + '/?paid=1&sid={CHECKOUT_SESSION_ID}');
  f.set('cancel_url', origin + '/?paid=0');
  f.set('locale', 'th');
  f.set('submit_type', 'pay');
  f.set('expires_at', String(nowSec + 3600));   // an hour: a price change never meets a session left open for a day
  return f;
}

export async function handleCheckout(request, deps) {
  const { fetch, env, now, log } = Object.assign(defaultDeps(), deps);
  if (request.method === 'GET') return json(200, { configured: configured(env) });
  if (request.method !== 'POST') return json(405, { error: 'method' }, { Allow: 'GET, POST' });
  if (!configured(env)) return json(503, { error: 'not_configured' });
  const k = keys(env);

  const m = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(request.headers.get('authorization') || '');
  if (!m) return json(401, { error: 'auth' });
  let body;
  try { body = JSON.parse((await readBody(request, 2048)).toString('utf8')); } catch (e) { return json(400, { error: 'body' }); }
  const id = body && typeof body === 'object' ? body.product : null, p = product(id);
  if (!p) return json(400, { error: 'product' });

  let user;
  try {
    const r = await timedFetch(fetch, SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + m[1] } }, 6000);
    if (r.status === 401 || r.status === 403) return json(401, { error: 'auth' });
    if (!r.ok) { log.error('checkout: auth/v1/user', r.status); return json(502, { error: 'auth_upstream' }); }
    user = await r.json();
  } catch (e) { log.error('checkout: auth/v1/user', e && e.name); return json(502, { error: 'auth_upstream' }); }
  const uid = user && typeof user.id === 'string' ? user.id.toLowerCase() : '';
  if (!UUID.test(uid) || user.is_anonymous === true) return json(401, { error: 'auth' });
  if (testMode(env) && !testUsers(env).has(uid)) return json(503, { error: 'not_configured' });   // test keys: the owner's testers only

  let s;
  try {
    const r = await timedFetch(fetch, 'https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + k.stripe, 'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': crypto.randomUUID() },
      body: sessionForm(p, id, uid, appOrigin(request), now()).toString(),
    }, 8000);
    s = await r.json().catch(() => null);
    if (!r.ok) { log.error('checkout: stripe', r.status, s && s.error && s.error.code || ''); return json(502, { error: 'stripe' }); }
  } catch (e) { log.error('checkout: stripe', e && e.name); return json(502, { error: 'stripe' }); }
  if (!s || typeof s.url !== 'string' || !s.url.startsWith('https://checkout.stripe.com/')) { log.error('checkout: stripe answer without url'); return json(502, { error: 'stripe' }); }
  return json(200, { url: s.url });
}

export function GET(request) { return handleCheckout(request); }
export function POST(request) { return handleCheckout(request); }
