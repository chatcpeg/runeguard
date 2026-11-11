// Vercel Function (Node, Web handler, no dependencies) · Stripe → POST /api/stripe-webhook · docs/SETUP-payments.md
// 1. Stripe-Signature: t=<unix s>,v1=<hex> · v1 = HMAC-SHA256(STRIPE_WEBHOOK_SECRET, `${t}.${raw body}`) over the exact bytes
//    received (the Web Request body is read raw, nothing parses it first) · compared timing-safe · |now − t| ≤ 300 s.
// 2. Only checkout.session.completed / checkout.session.async_payment_succeeded with payment_status 'paid' and
//    metadata.app 'runeguard' (the account is Runeguard's own; other events → 200 and nothing happens).
// 3. product / amount / currency / user are checked against api/_shop.js and the session (a mismatch is answered 400 and not
//    recorded: it shows as a failed delivery in the Stripe dashboard for the owner to look at).
// 4. One row in public.rg_purchases per Checkout Session (PostgREST on_conflict=session_id + resolution=ignore-duplicates):
//    Stripe's retries and replays never grant twice. Written with SUPABASE_SECRET_KEY (server only).
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SUPABASE_URL, UUID, SESSION_ID, product, keys, configured, testMode, supabaseServiceHeaders, json, timedFetch, readBody, defaultDeps } from './_shop.js';

export const TOLERANCE = 300;
const PAID_EVENTS = ['checkout.session.completed', 'checkout.session.async_payment_succeeded'];

// → {ok:true, t} | {ok:false, why:'no_signature'|'bad_header'|'bad_signature'|'stale'} · secrets: one, or several split by , / space
export function verifySignature(raw, header, secrets, nowSec, tolerance = TOLERANCE) {
  if (typeof header !== 'string' || !header) return { ok: false, why: 'no_signature' };
  let t = ''; const v1 = [];
  for (const part of header.split(',')) {
    const i = part.indexOf('='); if (i < 1) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 't') t = v; else if (k === 'v1' && /^[0-9a-f]{64}$/i.test(v)) v1.push(Buffer.from(v, 'hex'));
  }
  if (!/^\d{1,12}$/.test(t) || !v1.length) return { ok: false, why: 'bad_header' };
  const body = Buffer.concat([Buffer.from(t + '.', 'utf8'), Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), 'utf8')]);
  let good = false;
  for (const sec of String(secrets || '').split(/[\s,]+/).filter(Boolean)) {
    const want = createHmac('sha256', sec).update(body).digest();
    for (const got of v1) if (got.length === want.length && timingSafeEqual(got, want)) good = true;   // no early exit
  }
  if (!good) return { ok: false, why: 'bad_signature' };
  if (!(Math.abs(nowSec - Number(t)) <= tolerance)) return { ok: false, why: 'stale' };
  return { ok: true, t: Number(t) };
}

// the row to store for a paid Runeguard session · → {row} | {skip:'why'} (not ours / not paid: 200) | {bad:'why'} (400)
export function purchaseRow(ev) {
  if (!ev || typeof ev !== 'object' || !PAID_EVENTS.includes(ev.type)) return { skip: 'type' };
  const s = ev.data && ev.data.object;
  if (!s || typeof s !== 'object' || s.object !== 'checkout.session') return { skip: 'object' };
  const md = s.metadata && typeof s.metadata === 'object' ? s.metadata : {};
  if (md.app !== 'runeguard') return { skip: 'app' };
  if (s.payment_status !== 'paid') return { skip: 'unpaid' };   // PromptPay may finish later: async_payment_succeeded
  const p = product(md.product), uid = typeof md.user_id === 'string' ? md.user_id.toLowerCase() : '';
  if (!p) return { bad: 'product' };
  if (!UUID.test(uid) || (s.client_reference_id != null && String(s.client_reference_id).toLowerCase() !== uid)) return { bad: 'user' };
  if (typeof s.id !== 'string' || !SESSION_ID.test(s.id)) return { bad: 'session' };
  if (s.mode !== 'payment' || s.currency !== 'thb' || s.amount_total !== p.thb * 100) return { bad: 'amount' };
  return { row: { user_id: uid, session_id: s.id, product: md.product, runes: p.runes, days: p.days, amount: s.amount_total, currency: 'thb',
    livemode: ev.livemode === true, payment_intent: typeof s.payment_intent === 'string' ? s.payment_intent.slice(0, 200) : null } };
}

export async function handleWebhook(request, deps) {
  const { fetch, env, now, log } = Object.assign(defaultDeps(), deps);
  if (request.method !== 'POST') return json(405, { error: 'method' }, { Allow: 'POST' });
  if (!configured(env)) return json(503, { error: 'not_configured' });   // Stripe retries for 3 days: nothing is lost
  const k = keys(env), sig = request.headers.get('stripe-signature');
  if (!sig) return json(400, { error: 'no_signature' });
  let raw; try { raw = await readBody(request, 1024 * 1024); } catch (e) { return json(413, { error: 'too_big' }); }
  const v = verifySignature(raw, sig, k.whsec, now());
  if (!v.ok) { log.warn('webhook: signature', v.why); return json(400, { error: v.why }); }
  let ev; try { ev = JSON.parse(raw.toString('utf8')); } catch (e) { return json(400, { error: 'json' }); }

  if (!testMode(env) && !(ev && ev.livemode === true)) return json(200, { received: true, ignored: 'testmode' });   // live keys never record a test event
  const r = purchaseRow(ev);
  if (r.skip) return json(200, { received: true, ignored: r.skip });
  if (r.bad) { log.error('webhook: not recorded', r.bad, ev && ev.id); return json(400, { error: 'mismatch', why: r.bad }); }

  let res;
  try {
    res = await timedFetch(fetch, SUPABASE_URL + '/rest/v1/rg_purchases?on_conflict=session_id', {
      method: 'POST',
      headers: Object.assign(supabaseServiceHeaders(k.supa), { 'Content-Type': 'application/json', 'Content-Profile': 'public', Prefer: 'resolution=ignore-duplicates,return=minimal' }),
      body: JSON.stringify(r.row),
    }, 8000);
  } catch (e) { log.error('webhook: rg_purchases', e && e.name); return json(500, { error: 'store' }); }   // Stripe sends it again later
  if (res.ok) return json(200, { received: true });
  let code = ''; try { const d = await res.json(); code = d && typeof d.code === 'string' ? d.code : ''; } catch (e) { /* none */ }
  if (res.status === 409 && code === '23503') { log.error('webhook: the account no longer exists', ev.id); return json(200, { received: true, ignored: 'no_user' }); }
  log.error('webhook: rg_purchases', res.status, code); return json(500, { error: 'store' });
}

export function POST(request) { return handleWebhook(request); }
export function GET() { return json(405, { error: 'method' }, { Allow: 'POST' }); }
