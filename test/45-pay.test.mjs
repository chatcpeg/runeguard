// test/45-pay.test.mjs (step ค.) — Stripe purchases without any network:   node test/45-pay.test.mjs
//   ก. api/checkout.js: env ไม่ครบ → 503 · ตรวจผู้ใช้ด้วย GoTrue · รับแค่ product id · ราคา/รูน/วันจากตารางฝั่ง server · form ของ Stripe
//   ข. api/stripe-webhook.js: ลายเซ็น (ถูก / ผิด / หมดเวลา / ไม่มี header / body ถูกแก้) · event ที่ไม่เกี่ยว · product / amount ไม่ตรง ·
//      บันทึกซ้ำ (on_conflict=session_id + ignore-duplicates) · PostgREST ล่ม / ผู้ใช้ถูกลบ · env ไม่ครบ → 503
//   ค. ตารางราคา api/_shop.js = RSHOP ใน src/js/28-shop.js · URL / publishable key = 43-auth.js
//   ง. ฝั่งเกม: entFromRows (ต่อวันผู้สนับสนุน) · shopClamp (Σ rb ≤ ru ≤ ที่ซื้อ + ต้นไม้ที่จ่ายไม่ไหวหลุด) · เซฟ v6
//   จ. ฝั่งเกม 59a: ปุ่มซื้อ → ล็อกอินก่อน → /api/checkout → Stripe · ?paid=1 → โหลดรายการซื้อจนเจอ · ?paid=0 · artifact · #dev
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadSrc, JS_DIR } from './_vm.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = f => import(pathToFileURL(join(ROOT, 'api', f)).href);
const { handleCheckout, sessionForm, appOrigin } = await api('checkout.js');
const { handleWebhook, verifySignature, purchaseRow, TOLERANCE } = await api('stripe-webhook.js');
const SHOP = await api('_shop.js');
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ได้: ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
const tick = ms => new Promise(r => setTimeout(r, ms));
const THAI = /[฀-๿]/;
const UID = '0a0a0a0a-0000-4000-8000-00000000000a', UID2 = '0b0b0b0b-0000-4000-8000-00000000000b';
// fake values only (shape of the real ones · never a real key)
const ENV = { STRIPE_SECRET_KEY: 'sk_test_FAKEfakeFAKE123', STRIPE_WEBHOOK_SECRET: 'whsec_FAKEfakeFAKE456', SUPABASE_SECRET_KEY: 'sb_secret_FAKEfakeFAKEfake789' };
const quiet = { error() {}, warn() {}, log() {} };
const NOW = 1762900000;
const req = (url, init) => new Request(url, init);

function upstream() {   // fake GoTrue + Stripe + PostgREST · records every call
  const U = { log: [], users: { tok_good_0123456789abc: { id: UID, email: 'a@example.com' }, tok_anon_0123456789abc: { id: UID2, is_anonymous: true } }, rows: [], stripe: null, pg: null, fail: '' };
  U.fetch = async (url, init = {}) => {
    const u = new URL(url), h = init.headers || {}, e = { url, origin: u.origin, path: u.pathname, q: Object.fromEntries(u.searchParams), h, body: init.body, method: init.method || 'GET' };
    U.log.push(e);
    if (U.fail === u.origin) throw new TypeError('fetch failed');
    if (u.origin === SHOP.SUPABASE_URL && u.pathname === '/auth/v1/user') {
      const t = (h.Authorization || '').replace(/^Bearer /, ''), us = U.users[t];
      return us ? Response.json(us) : Response.json({ error_code: 'bad_jwt' }, { status: 401 });
    }
    if (u.origin === 'https://api.stripe.com' && u.pathname === '/v1/checkout/sessions') {
      if (U.stripe) return U.stripe(e);
      return Response.json({ id: 'cs_test_NEW1', url: 'https://checkout.stripe.com/c/pay/cs_test_NEW1#abc' });
    }
    if (u.origin === SHOP.SUPABASE_URL && u.pathname === '/rest/v1/rg_purchases') {
      if (U.pg) { const r = U.pg(e); if (r) return r; }
      const row = JSON.parse(init.body);
      if (u.searchParams.get('on_conflict') === 'session_id' && /resolution=ignore-duplicates/.test(h.Prefer || '')) { if (!U.rows.some(r => r.session_id === row.session_id)) U.rows.push(row); return new Response(null, { status: 201 }); }
      if (U.rows.some(r => r.session_id === row.session_id)) return Response.json({ code: '23505' }, { status: 409 });
      U.rows.push(row); return new Response(null, { status: 201 });
    }
    return new Response('nope', { status: 404 });
  };
  return U;
}
const deps = (U, env = ENV, now = NOW) => ({ fetch: U.fetch, env, now: () => now, log: quiet });
const co = (U, init, env, url = 'https://runeguard-lac.vercel.app/api/checkout') => handleCheckout(req(url, init), deps(U, env));
const post = (body, token = 'tok_good_0123456789abc') => ({ method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, token ? { Authorization: 'Bearer ' + token } : {}), body: typeof body === 'string' ? body : JSON.stringify(body) });

/* ================= ก. checkout ================= */
console.log('ก. api/checkout.js');
{
  const U = upstream();
  let r = await co(U, { method: 'GET' }, {}); ok('GET ไม่มี env → 200 {configured:false}', r.status === 200 && (await r.json()).configured === false);
  r = await co(U, { method: 'GET' }); ok('GET env ครบ 3 ตัว → {configured:true} · Cache-Control: no-store', (await r.json()).configured === true && r.headers.get('cache-control') === 'no-store');
  for (const miss of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_SECRET_KEY']) {
    const env = Object.assign({}, ENV); delete env[miss];
    r = await co(U, post({ product: 'rune60' }), env); const j = await r.json();
    ok(`POST ขาด ${miss} → 503 {error:'not_configured'} · ไม่ยิง upstream`, r.status === 503 && j.error === 'not_configured' && U.log.length === 0, [r.status, j, U.log.length]);
  }
  r = await co(U, { method: 'GET' }, { STRIPE_SECRET_KEY: 'sk_test_short', STRIPE_WEBHOOK_SECRET: 'nothook', SUPABASE_SECRET_KEY: 'x' });
  ok('ค่าผิดรูป (ไม่ใช่ sk_ / whsec_) → configured false', (await r.json()).configured === false);
  r = await co(U, { method: 'GET' }, { STRIPE_SECRET_KEY: '  ' + ENV.STRIPE_SECRET_KEY + '\n', STRIPE_WEBHOOK_SECRET: ENV.STRIPE_WEBHOOK_SECRET + ' ', SUPABASE_SECRET_KEY: ENV.SUPABASE_SECRET_KEY });
  ok('ค่าที่มีช่องว่าง/ขึ้นบรรทัดติดมา → ตัดแล้วใช้ได้', (await r.json()).configured === true);
  r = await co(U, { method: 'PUT' }); ok('PUT → 405', r.status === 405);
  r = await co(U, post({ product: 'rune60' }, null)); ok('ไม่มี Authorization → 401 · ไม่ยิง upstream', r.status === 401 && U.log.length === 0);
  r = await co(U, post({ product: 'rune60' }, 'tok_bad_00000000000000')); ok('token ที่ GoTrue ไม่รับ → 401 · ไม่ถึง Stripe', r.status === 401 && !U.log.some(x => x.origin === 'https://api.stripe.com'));
  r = await co(U, post({ product: 'rune60' }, 'tok_anon_0123456789abc')); ok('ผู้ใช้ anonymous → 401', r.status === 401);
  for (const p of ['rune9999', '__proto__', 'toString', 'constructor', '', null, 60]) {
    const U2 = upstream(); r = await co(U2, post({ product: p }));
    ok(`product ${JSON.stringify(p)} → 400 · ไม่ถึง GoTrue/Stripe`, r.status === 400 && U2.log.length === 0, [r.status, U2.log.length]);
  }
  r = await co(upstream(), post('{bad json')); ok('body ไม่ใช่ JSON → 400', r.status === 400);
  r = await co(upstream(), post('x'.repeat(5000))); ok('body ใหญ่เกิน 2 KB → 400', r.status === 400);

  const U3 = upstream();
  r = await co(U3, post({ product: 'rune200', thb: 1, unit_amount: 100, runes: 99999, user_id: UID2, days: 366 }));
  const j = await r.json(), sx = U3.log.find(x => x.origin === 'https://api.stripe.com'), gt = U3.log.find(x => x.path === '/auth/v1/user');
  ok('สำเร็จ → 200 {url} ของ checkout.stripe.com', r.status === 200 && j.url === 'https://checkout.stripe.com/c/pay/cs_test_NEW1#abc', j);
  ok('GoTrue: GET /auth/v1/user · apikey = publishable · Bearer = token ของผู้เล่น (ไม่ส่งคีย์ลับไป Supabase)', gt.method === 'GET' && gt.h.apikey === SHOP.SUPABASE_PUBLISHABLE_KEY && gt.h.Authorization === 'Bearer tok_good_0123456789abc' && !JSON.stringify(gt).includes('sk_test') && !JSON.stringify(gt).includes('sb_secret'));
  const f = new URLSearchParams(sx.body);
  ok('Stripe: POST /v1/checkout/sessions · Bearer sk · form-encoded · Idempotency-Key', sx.method === 'POST' && sx.h.Authorization === 'Bearer ' + ENV.STRIPE_SECRET_KEY && sx.h['Content-Type'] === 'application/x-www-form-urlencoded' && /^[0-9a-f-]{36}$/.test(sx.h['Idempotency-Key']));
  ok('ราคามาจากตารางฝั่ง server (99 บาท = 9900 สตางค์) ไม่ใช่จาก body · thb · quantity 1', f.get('line_items[0][price_data][unit_amount]') === '9900' && f.get('line_items[0][price_data][currency]') === 'thb' && f.get('line_items[0][quantity]') === '1' && f.get('mode') === 'payment');
  ok('วิธีจ่าย card + promptpay', f.get('payment_method_types[0]') === 'card' && f.get('payment_method_types[1]') === 'promptpay');
  ok('metadata {app:runeguard, user_id: ผู้ใช้จาก GoTrue (ไม่ใช่จาก body), product} · ทั้ง session และ payment_intent · client_reference_id',
    f.get('metadata[app]') === 'runeguard' && f.get('metadata[user_id]') === UID && f.get('metadata[product]') === 'rune200' && f.get('payment_intent_data[metadata][user_id]') === UID && f.get('client_reference_id') === UID
    && ![...f.keys()].some(k => /runes|days/.test(k)));
  ok('success_url / cancel_url กลับเกม · {CHECKOUT_SESSION_ID} คงไว้ · หมดอายุ 1 ชม.', f.get('success_url') === 'https://runeguard-lac.vercel.app/?paid=1&sid={CHECKOUT_SESSION_ID}' && f.get('cancel_url') === 'https://runeguard-lac.vercel.app/?paid=0' && f.get('expires_at') === String(NOW + 3600));
  ok('ไม่ส่ง token ของผู้เล่นหรืออีเมลไป Stripe', !sx.body.includes('tok_good') && !sx.body.includes('@'));
  ok('ทั้ง GoTrue และ Stripe มี signal (มีเวลาตัด)', U3.log.length === 2);
  eq2('ปลายทางกลับเกม: preview ของโปรเจกต์ / localhost ใช้ได้ · โฮสต์อื่นกลับเว็บหลัก', [
    appOrigin(req('https://runeguard-git-v2-chatcpegs-projects.vercel.app/api/checkout')), appOrigin(req('http://localhost:3000/api/checkout')),
    appOrigin(req('https://evil.example/api/checkout')), appOrigin(req('https://runeguard-lac.vercel.app.evil.example/api/checkout'))],
    ['https://runeguard-git-v2-chatcpegs-projects.vercel.app', 'http://localhost:3000', 'https://runeguard-lac.vercel.app', 'https://runeguard-lac.vercel.app']);
  const U4 = upstream(); U4.stripe = () => Response.json({ error: { code: 'payment_method_unactivated', message: 'PromptPay is not activated' } }, { status: 400 });
  r = await co(U4, post({ product: 'sup30' })); ok('Stripe ปฏิเสธ (เช่น ยังไม่เปิด PromptPay) → 502 {error:stripe} ไม่เผยข้อความของ Stripe', r.status === 502 && JSON.stringify(await r.json()) === '{"error":"stripe"}');
  const U5 = upstream(); U5.stripe = () => Response.json({ id: 'cs_test_x', url: 'https://evil.example/pay' });
  r = await co(U5, post({ product: 'sup30' })); ok('Stripe ตอบ url ที่ไม่ใช่ checkout.stripe.com → 502', r.status === 502);
  const U6 = upstream(); U6.fail = 'https://api.stripe.com';
  r = await co(U6, post({ product: 'sup30' })); ok('ต่อ Stripe ไม่ได้ → 502', r.status === 502);
  const U7 = upstream(); U7.fail = SHOP.SUPABASE_URL;
  r = await co(U7, post({ product: 'sup30' })); ok('ต่อ GoTrue ไม่ได้ → 502 · ไม่ถึง Stripe', r.status === 502 && !U7.log.some(x => x.origin === 'https://api.stripe.com'));
  const sf = new URLSearchParams(sessionForm(SHOP.PRODUCTS.sup30, 'sup30', UID, 'https://runeguard-lac.vercel.app', NOW).toString());
  ok('แพคสนับสนุน: 35 บาท (3500) · ชื่อไทย', sf.get('line_items[0][price_data][unit_amount]') === '3500' && THAI.test(sf.get('line_items[0][price_data][product_data][name]')));
}
function eq2(name, got, want) { ok(name, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got)); }

/* ================= ข. webhook ================= */
console.log('\nข. api/stripe-webhook.js');
const sign = (body, t = NOW, secret = ENV.STRIPE_WEBHOOK_SECRET) => 't=' + t + ',v1=' + createHmac('sha256', secret).update(t + '.' + body).digest('hex');
const session = (o = {}) => Object.assign({ id: 'cs_test_PAID1', object: 'checkout.session', mode: 'payment', payment_status: 'paid', currency: 'thb', amount_total: 9900,
  client_reference_id: UID, payment_intent: 'pi_123', metadata: { app: 'runeguard', user_id: UID, product: 'rune200' } }, o);
const event = (s = session(), type = 'checkout.session.completed', extra = {}) => Object.assign({ id: 'evt_1', object: 'event', type, livemode: false, data: { object: s } }, extra);
const hook = (U, body, sig, env = ENV, now = NOW) => handleWebhook(req('https://runeguard-lac.vercel.app/api/stripe-webhook', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, sig === undefined ? {} : { 'Stripe-Signature': sig }), body }), deps(U, env, now));
{
  console.log(' ลายเซ็น');
  const body = JSON.stringify(event());
  ok('verifySignature ถูก → ok', verifySignature(Buffer.from(body), sign(body), ENV.STRIPE_WEBHOOK_SECRET, NOW).ok === true);
  ok('ไม่มี header → no_signature', verifySignature(Buffer.from(body), '', ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'no_signature');
  ok('header ไม่มี t หรือ v1 → bad_header', verifySignature(Buffer.from(body), 'v1=' + 'a'.repeat(64), ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'bad_header' && verifySignature(Buffer.from(body), 't=' + NOW, ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'bad_header');
  ok('คีย์ผิด → bad_signature', verifySignature(Buffer.from(body), sign(body, NOW, 'whsec_other'), ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'bad_signature');
  ok('body ถูกแก้ 1 ตัวอักษร → bad_signature', verifySignature(Buffer.from(body.replace('9900', '9901')), sign(body), ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'bad_signature');
  ok(`เวลาคลาด ${TOLERANCE} วิพอดี → ok · ${TOLERANCE + 1} วิ (ย้อน/ล่วงหน้า) → stale`, verifySignature(Buffer.from(body), sign(body, NOW - TOLERANCE), ENV.STRIPE_WEBHOOK_SECRET, NOW).ok
    && verifySignature(Buffer.from(body), sign(body, NOW - TOLERANCE - 1), ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'stale' && verifySignature(Buffer.from(body), sign(body, NOW + TOLERANCE + 1), ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'stale');
  ok('ลายเซ็นผิดแต่ t เก่า → bad_signature (ไม่บอกว่าใกล้ถูก)', verifySignature(Buffer.from(body), sign(body, NOW - 999, 'whsec_other'), ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'bad_signature');
  const good = sign(body).split(',v1=')[1];
  ok('หลาย v1 (หนึ่งในนั้นถูก) + v0 → ok', verifySignature(Buffer.from(body), `t=${NOW},v1=${'0'.repeat(64)},v1=${good},v0=${'1'.repeat(64)}`, ENV.STRIPE_WEBHOOK_SECRET, NOW).ok);
  ok('v1 ยาวผิด / ไม่ใช่ hex → ไม่นับ', verifySignature(Buffer.from(body), `t=${NOW},v1=${good}00`, ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'bad_header' && verifySignature(Buffer.from(body), `t=${NOW},v1=${'z'.repeat(64)}`, ENV.STRIPE_WEBHOOK_SECRET, NOW).why === 'bad_header');
  ok('คีย์สองตัว (ช่วงหมุนคีย์ "whsec_a,whsec_b") → ตัวไหนถูกก็ผ่าน', verifySignature(Buffer.from(body), sign(body), 'whsec_old111111 , ' + ENV.STRIPE_WEBHOOK_SECRET, NOW).ok);
  const thai = JSON.stringify(event(session({ metadata: { app: 'runeguard', user_id: UID, product: 'rune200', note: 'รูน ✦' } })));
  ok('ลงชื่อบนไบต์ดิบ (UTF-8 ไทย/อีโมจิ) → ok', verifySignature(Buffer.from(thai, 'utf8'), sign(thai), ENV.STRIPE_WEBHOOK_SECRET, NOW).ok);
  const src = readFileSync(join(ROOT, 'api', 'stripe-webhook.js'), 'utf8');
  ok('เทียบด้วย timingSafeEqual · อ่าน body ดิบ (arrayBuffer) ไม่ parse ก่อนตรวจ', /timingSafeEqual\(got, want\)/.test(src) && /readBody\(request/.test(readFileSync(join(ROOT, 'api', 'stripe-webhook.js'), 'utf8')) && /arrayBuffer\(\)/.test(readFileSync(join(ROOT, 'api', '_shop.js'), 'utf8')) && src.indexOf('verifySignature(raw') < src.indexOf('JSON.parse(raw'));

  console.log(' handler');
  let U = upstream(), r = await hook(U, body, undefined); ok('ไม่มี Stripe-Signature → 400 · ไม่ยิง PostgREST', r.status === 400 && (await r.json()).error === 'no_signature' && U.log.length === 0);
  r = await hook(U, body, sign(body, NOW, 'whsec_wrong')); ok('ลายเซ็นผิด → 400 bad_signature', r.status === 400 && (await r.json()).error === 'bad_signature' && U.log.length === 0);
  r = await hook(U, body, sign(body, NOW - 301)); ok('หมดเวลา (301 วิ) → 400 stale', r.status === 400 && (await r.json()).error === 'stale' && U.log.length === 0);
  for (const miss of ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'SUPABASE_SECRET_KEY']) {
    const env = Object.assign({}, ENV); delete env[miss]; r = await hook(U, body, sign(body), env);
    ok(`ขาด ${miss} → 503 not_configured`, r.status === 503 && (await r.json()).error === 'not_configured' && U.log.length === 0);
  }
  r = await handleWebhook(req('https://runeguard-lac.vercel.app/api/stripe-webhook', { method: 'GET' }), deps(U)); ok('GET → 405', r.status === 405);

  U = upstream(); r = await hook(U, body, sign(body));
  const ins = U.log.find(x => x.path === '/rest/v1/rg_purchases'), row = JSON.parse(ins.body);
  ok('ถูกต้อง → 200 {received:true} · บันทึก 1 แถว', r.status === 200 && (await r.json()).received === true && U.rows.length === 1);
  ok('POST /rest/v1/rg_purchases?on_conflict=session_id · Prefer resolution=ignore-duplicates,return=minimal · Content-Profile public',
    ins.method === 'POST' && ins.q.on_conflict === 'session_id' && ins.h.Prefer === 'resolution=ignore-duplicates,return=minimal' && ins.h['Content-Profile'] === 'public');
  ok('ใช้ SUPABASE_SECRET_KEY ใน apikey เท่านั้น (sb_secret_ ไม่ใช่ JWT จึงไม่ใส่ Authorization)', ins.h.apikey === ENV.SUPABASE_SECRET_KEY && !ins.h.Authorization);
  ok('แถว = {user_id, session_id, product, runes 200 / days 0 จากตาราง server, amount 9900, thb, livemode, payment_intent}',
    JSON.stringify(row) === JSON.stringify({ user_id: UID, session_id: 'cs_test_PAID1', product: 'rune200', runes: 200, days: 0, amount: 9900, currency: 'thb', livemode: false, payment_intent: 'pi_123' }), row);
  ok('ไม่ส่ง STRIPE key ไป Supabase', !JSON.stringify(U.log).includes(ENV.STRIPE_SECRET_KEY));
  const r2 = await hook(U, body, sign(body)), r3 = await hook(U, body, sign(body, NOW + 5));
  ok('event เดิมส่งซ้ำ 2 ครั้ง (Stripe retry) → 200 ทุกครั้ง · ยังมี 1 แถว', r2.status === 200 && r3.status === 200 && U.rows.length === 1 && U.log.filter(x => x.path === '/rest/v1/rg_purchases').length === 3);
  const b2 = JSON.stringify(event(session(), 'checkout.session.async_payment_succeeded', { id: 'evt_2' }));
  ok('async_payment_succeeded ของ session เดิม → 200 · ไม่บันทึกซ้ำ', (await hook(U, b2, sign(b2))).status === 200 && U.rows.length === 1);
  const sup = JSON.stringify(event(session({ id: 'cs_live_SUP9', amount_total: 3500, metadata: { app: 'runeguard', user_id: UID, product: 'sup30' } }), 'checkout.session.completed', { livemode: true }));
  r = await hook(U, sup, sign(sup)); const srow = U.rows.find(x => x.session_id === 'cs_live_SUP9');
  ok('แพคสนับสนุน (live) → days 30 · runes 0 · livemode true', r.status === 200 && srow && srow.days === 30 && srow.runes === 0 && srow.livemode === true && srow.amount === 3500, srow);

  console.log(' event ที่ไม่เกี่ยว → 200 ไม่บันทึก');
  const skip = [['charge.refunded', event(session(), 'charge.refunded')], ['payment_intent.succeeded', event(session(), 'payment_intent.succeeded')],
    ['แอปอื่น (BAZI: metadata ไม่มี app)', event(session({ metadata: { userId: UID, credits: '100' } }))], ['metadata.app อื่น', event(session({ metadata: { app: 'bazi', user_id: UID, product: 'rune200' } }))],
    ['ยังไม่จ่าย (PromptPay รอสแกน)', event(session({ payment_status: 'unpaid', id: 'cs_test_WAIT' }))], ['object ไม่ใช่ checkout.session', event({ object: 'payment_intent', id: 'pi_x' })]];
  for (const [n, ev] of skip) { const U2 = upstream(), b = JSON.stringify(ev), rr = await hook(U2, b, sign(b)), jj = await rr.json();
    ok(n + ' → 200 ignored · ไม่ยิง PostgREST', rr.status === 200 && jj.received === true && jj.ignored && U2.log.length === 0, [rr.status, jj]); }
  r = await hook(upstream(), '{not json', sign('{not json')); ok('JSON เสีย (ลายเซ็นถูก) → 400', r.status === 400);

  console.log(' product / amount / ผู้ใช้ไม่ตรง → 400 ไม่บันทึก');
  const bad = [['product ไม่รู้จัก', session({ metadata: { app: 'runeguard', user_id: UID, product: 'rune9999' } })],
    ['product = __proto__', session({ metadata: { app: 'runeguard', user_id: UID, product: '__proto__' } })],
    ['จ่ายไม่ครบ (rune2500 แต่ 9900)', session({ metadata: { app: 'runeguard', user_id: UID, product: 'rune2500' } })],
    ['amount_total แก้ต่ำ', session({ amount_total: 100 })], ['สกุลเงิน usd', session({ currency: 'usd' })], ['mode subscription', session({ mode: 'subscription' })],
    ['user_id ไม่ใช่ UUID', session({ metadata: { app: 'runeguard', user_id: "x' or 1=1", product: 'rune200' } })],
    ['client_reference_id ≠ user_id', session({ client_reference_id: UID2 })], ['session id ผิดรูป', session({ id: 'evil' })]];
  for (const [n, s] of bad) { const U2 = upstream(), b = JSON.stringify(event(s)), rr = await hook(U2, b, sign(b)), jj = await rr.json();
    ok(n + ' → 400 mismatch · ไม่ยิง PostgREST', rr.status === 400 && jj.error === 'mismatch' && U2.log.length === 0, [rr.status, jj]); }
  ok('purchaseRow ไม่เชื่อ runes/days ใน metadata', purchaseRow(event(session({ metadata: { app: 'runeguard', user_id: UID, product: 'rune60', runes: '99999', days: '366' }, amount_total: 3500 }))).row.runes === 60);

  console.log(' PostgREST');
  U = upstream(); U.fail = SHOP.SUPABASE_URL; r = await hook(U, body, sign(body)); ok('ต่อ Supabase ไม่ได้ → 500 (Stripe ส่งซ้ำทีหลัง)', r.status === 500);
  U = upstream(); U.pg = () => Response.json({ code: '23503', message: 'fk' }, { status: 409 }); r = await hook(U, body, sign(body));
  ok('ผู้ใช้ถูกลบไปแล้ว (409 23503) → 200 ignored no_user (ไม่วนส่งซ้ำ)', r.status === 200 && (await r.json()).ignored === 'no_user');
  U = upstream(); U.pg = () => Response.json({ code: '42501' }, { status: 403 }); r = await hook(U, body, sign(body)); ok('สิทธิ์ไม่พอ (ตารางยังไม่สร้าง / คีย์ผิด) → 500', r.status === 500);
  U = upstream(); U.pg = () => Response.json({ code: 'PGRST205' }, { status: 404 }); r = await hook(U, body, sign(body)); ok('ยังไม่มีตาราง rg_purchases → 500', r.status === 500);
  const legacy = Object.assign({}, ENV, { SUPABASE_SECRET_KEY: 'eyJ' + 'x'.repeat(40) }); U = upstream(); await hook(U, body, sign(body), legacy);
  ok('คีย์ service_role แบบเก่า (JWT) → ใส่ทั้ง apikey และ Bearer', U.log[0].h.apikey === legacy.SUPABASE_SECRET_KEY && U.log[0].h.Authorization === 'Bearer ' + legacy.SUPABASE_SECRET_KEY);
}

/* ================= ค. ตารางราคา ================= */
console.log('\nค. ตารางราคาฝั่ง server = ฝั่งเกม');
{
  const g = loadSrc(['24-hooks', '28-shop'], { location: { hostname: 'runeguard-lac.vercel.app', hash: '' } });
  const rs = g.__eval('RSHOP.products').map(p => ({ id: p.id, thb: p.thb, days: p.days || 0, runes: p.runes || 0 }));
  const sv = Object.entries(SHOP.PRODUCTS).map(([id, p]) => ({ id, thb: p.thb, days: p.days, runes: p.runes }));
  ok('id / ราคา / วัน / รูน ตรงกันทุกสินค้า (ลำดับเดียวกัน)', JSON.stringify(rs) === JSON.stringify(sv), { rs, sv });
  ok('ตามเอกสาร: sup30 35฿ 30 วัน · rune60 35฿ · rune200 99฿ · rune700 299฿ · rune2500 899฿', JSON.stringify(sv) === JSON.stringify([
    { id: 'sup30', thb: 35, days: 30, runes: 0 }, { id: 'rune60', thb: 35, days: 0, runes: 60 }, { id: 'rune200', thb: 99, days: 0, runes: 200 }, { id: 'rune700', thb: 299, days: 0, runes: 700 }, { id: 'rune2500', thb: 899, days: 0, runes: 2500 }]));
  const sql = readFileSync(join(ROOT, 'sql', 'rg_002_purchases.sql'), 'utf8');
  ok('check ของ product ใน rg_002 = รายการเดียวกัน', sql.includes("check (product in (" + sv.map(p => "'" + p.id + "'").join(',') + "))"));
  const auth = readFileSync(join(JS_DIR, '43-auth.js'), 'utf8');
  ok('SUPABASE_URL / publishable key ของ api = ของเกม (43-auth.js)', auth.includes("url:'" + SHOP.SUPABASE_URL + "'") && auth.includes("key:'" + SHOP.SUPABASE_PUBLISHABLE_KEY + "'"));
  const all = ['_shop.js', 'checkout.js', 'stripe-webhook.js'].map(f => readFileSync(join(ROOT, 'api', f), 'utf8')).join('\n');
  ok('ไฟล์ api ไม่มีคีย์ลับ (sk_live / sk_test_ ยาว / whsec_ ยาว / sb_secret_ ยาว / JWT)', !/sk_(live|test)_[A-Za-z0-9]{12,}|whsec_[A-Za-z0-9]{12,}|sb_secret_[A-Za-z0-9]{12,}|eyJhbGci/.test(all));
  ok('ไม่มี dependency (import แค่ node: และไฟล์ในโฟลเดอร์)', [...all.matchAll(/from '([^']+)'/g)].every(m => m[1].startsWith('node:') || m[1].startsWith('./')));
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  ok('package.json: type module (api/*.js เป็น ESM) · ไม่มี dependencies', pkg.type === 'module' && !pkg.dependencies && !pkg.devDependencies);
}

/* ================= ง. ฝั่งเกม: ENT + clamp ================= */
console.log('\nง. ฝั่งเกม: รายการซื้อ → สิทธิ์ · clamp');
const FILES = ['04', '05', '06', '07', '08', '15', '16', '24', '25', '26', '27', '28', '29', '30', '31', '33', '34', '40', '41', '42'];
{
  const g = loadSrc(FILES, { location: { hostname: 'runeguard-lac.vercel.app', hash: '' }, toast() {} }), X = e => g.__eval(e);
  const d = 864e5, t0 = Date.parse('2026-11-01T00:00:00Z'), iso = t => new Date(t).toISOString();
  const E = rows => X(`entFromRows(${JSON.stringify(rows)})`);
  let e = E([{ product: 'sup30', runes: 0, days: 30, created_at: iso(t0), session_id: 'cs_test_a' }, { product: 'sup30', runes: 0, days: 30, created_at: iso(t0 + 5 * d), session_id: 'cs_test_b' }]);
  ok('ซื้อแพคสนับสนุนซ้ำระหว่างยังไม่หมด → ต่อจากวันหมดเดิม (60 วันจากครั้งแรก)', e.sup === t0 + 60 * d && e.n === 2 && JSON.stringify(e.sids) === '["cs_test_a","cs_test_b"]', e);
  e = E([{ product: 'sup30', days: 30, created_at: iso(t0) }, { product: 'sup30', days: 30, created_at: iso(t0 + 40 * d) }]);
  ok('ซื้ออีกครั้งหลังหมดไปแล้ว → นับจากวันซื้อใหม่', e.sup === t0 + 70 * d, e);
  e = E([{ product: 'sup30', days: 30, created_at: iso(t0 + 5 * d) }, { product: 'sup30', days: 30, created_at: iso(t0) }]);
  ok('ลำดับแถวสลับ → เรียงตามเวลาก่อน (ผลเท่าเดิม)', e.sup === t0 + 60 * d);
  e = E([{ product: 'rune200', runes: 200, created_at: iso(t0) }, { product: 'rune60', runes: 60, created_at: iso(t0) }, { product: 'hack', runes: 99999, created_at: iso(t0) }, { product: 'rune700', runes: 700, created_at: 'not a date' }, null, 'x']);
  ok('รูนรวมเฉพาะแถวที่ถูกต้อง (สินค้าไม่รู้จัก / วันที่เสีย / ขยะ ข้าม)', e.runes === 260 && e.n === 2, e);
  ok('ไม่มีแถว → 0', JSON.stringify(E([])) === JSON.stringify({ sup: 0, runes: 0, n: 0, sids: [] }));

  X(`createChar('ลูน่า','mage'); DEV.profile.char({lv:40}); createChar('ผาง','swordsman'); DEV.profile.char({lv:30})`);
  ok('เซฟ v6 · ตัวละคร 2 ตัว', X('SAVE.v') === 6 && X('SAVE.chars.length') === 2);
  // character 2 bought 50 runes and spent everything on its tree; character 1 got 30 · then the save is edited by hand
  X(`SAVE.acct.ru=80; SAVE.chars[0].rb=30; SAVE.chars[1].rb=50`);
  const id = X(`SAVE.chars[1].load[0]`);
  X(`(()=>{ const ch=SAVE.chars[1]; ch.sk[${JSON.stringify(id)}]=5; ch.tr={}; ch.tr[${JSON.stringify(id)}]={}; let n=0; for(const nd of tfNodes(${JSON.stringify(id)})){ ch.tr[${JSON.stringify(id)}][nd.id]=nd.max; } tfSanitize(ch); })()`);
  const spent0 = X('tfSpent(SAVE.chars[1])'), total0 = X('tfTotal(SAVE.chars[1])');
  ok('ตัวที่ 2: ใช้แต้มรูนในต้นไม้ ' + spent0 + ' จาก ' + total0 + ' (รวมรูนที่ซื้อ 50)', spent0 > 30 && spent0 <= total0, [spent0, total0]);
  let c = X('shopClamp(SAVE,80)');
  ok('ซื้อจริง 80 = ru 80 = Σrb 80 → ไม่แตะอะไร', JSON.stringify(c) === '{"ru":0,"rb":0}' && X('SAVE.chars[1].rb') === 50);
  X('SAVE.chars[1].rb=500; SAVE.acct.ru=900');   // hand edit
  c = X('shopClamp(SAVE,80)');
  ok('แก้เซฟ (rb 500 · ru 900) แต่ซื้อจริง 80 → ru 80 · Σrb ≤ 80 (หักจากตัวท้ายก่อน)', X('SAVE.acct.ru') === 80 && X('SAVE.chars[0].rb+SAVE.chars[1].rb') <= 80 && c.ru === 820 && c.rb === 450, c);
  ok('ต้นไม้ที่จ่ายไม่ไหวแล้วหลุด (ใช้แต้ม ≤ แต้มที่มี)', X('tfSpent(SAVE.chars[1])') <= X('tfTotal(SAVE.chars[1])'), [X('tfSpent(SAVE.chars[1])'), X('tfTotal(SAVE.chars[1])')]);
  X('SAVE.chars[0].rb=30; SAVE.chars[1].rb=50; SAVE.acct.ru=80');
  const spentB = X('tfSpent(SAVE.chars[1])');
  c = X('shopClamp(SAVE,0)');
  ok('ไม่มีรายการซื้อเลย (เช่น สิทธิ์ #dev ติดมา) → ru 0 · rb 0 ทุกตัว', X('SAVE.acct.ru') === 0 && X('SAVE.chars[0].rb') === 0 && X('SAVE.chars[1].rb') === 0 && c.rb === 80);
  ok('ตัวที่ 2 เหลือแต้มรูน 30 (Lv) จากที่ใช้ไป ' + spentB + ' → ต้นไม้ที่จ่ายไม่ไหวหลุด (tfSanitize)', spentB > 30 && X('tfSpent(SAVE.chars[1])') <= 30 && X('tfTotal(SAVE.chars[1])') === 30, [spentB, X('tfSpent(SAVE.chars[1])')]);
  X('SAVE.acct.ru=100; SAVE.chars[0].rb=10; SAVE.chars[1].rb=20');
  c = X('shopClamp(SAVE,150)');
  ok('ลบตัวละครที่มีรูนไปแล้ว (Σrb 30 < ru 100 ≤ ซื้อ 150) → ถูกต้อง ไม่แตะ', JSON.stringify(c) === '{"ru":0,"rb":0}' && X('shopWallet()') === 0);
  const v = X('JSON.stringify(validateSave(JSON.parse(JSON.stringify(SAVE))))');
  ok('หลัง clamp เซฟยังผ่าน validateSave เท่าเดิม (idempotent)', v === X('JSON.stringify(validateSave(JSON.parse(JSON.stringify(validateSave(SAVE)))))'));
  ok('ไม่ล็อกอิน: ENT ว่าง · กระเป๋า 0 · ไม่ใช่ผู้สนับสนุน', X('entGet().src') === 'none' && X('isSupporter()') === false && X('shopWallet()') === 0);
}

/* ================= จ. ฝั่งเกม 59a: ซื้อ / กลับจาก Stripe ================= */
console.log('\nจ. ฝั่งเกม: ปุ่มซื้อ · ?paid=1');
function shopCtx({ host = 'runeguard-lac.vercel.app', hash = '', search = '', signed = true, files = ['24-hooks', '28-shop', '43-auth', '59a-ui-shop'], api = null, rows = [] } = {}) {
  const T = { toasts: [], assigned: [], confirms: [], auth: [], closed: 0, replaced: [], fetch: [], saves: 0 };
  const box = { innerHTML: '', addEventListener() {}, querySelector: () => null };
  const loc = { hostname: host, protocol: host === 'localhost' ? 'http:' : 'https:', origin: (host === 'localhost' ? 'http://' : 'https://') + host, pathname: '/', search, hash,
    assign: u => T.assigned.push(u) };
  const fetch = async (url, init = {}) => { T.fetch.push([init.method || 'GET', url, init.headers || {}, init.body]);
    const u = new URL(url);
    if (u.pathname === '/api/checkout') { if (api) return api(init, T); return init.method === 'POST' ? Response.json({ url: 'https://checkout.stripe.com/c/pay/cs_test_Z' }) : Response.json({ configured: true }); }
    if (u.pathname === '/rest/v1/rg_purchases') return Response.json(typeof rows === 'function' ? rows(T) : rows);
    return new Response('{}', { status: 404 }); };
  const stubs = { location: loc, fetch, AbortController, Response, URLSearchParams, setTimeout, clearTimeout,
    history: { state: { rg: 'root', d: 0 }, replaceState: (s, t, u) => { T.replaced.push([s, u]); const x = new URL(u, loc.origin); loc.search = x.search; loc.hash = x.hash; } },
    document: { addEventListener() {}, visibilityState: 'visible' }, addEventListener() {}, navigator: { onLine: true, userAgent: 'test' },
    shMk: () => box, sheet: () => box, closeSheet: () => { T.closed++; }, toast: (t, k) => T.toasts.push([t, k]),
    confirmBox: (t, o) => { T.confirms.push([t, o]); return Promise.resolve(true); }, tfE: s => String(s), tfRow: (a, b) => a + b, tfHelp() {}, TF_HELP: {},
    uiaOpenAuth: (v, m, after) => { T.auth.push([v, m, typeof after]); return true; }, saveNow: () => { T.saves++; return true; }, cloudInit() {}, SAVE: null, G: null };
  const ctx = loadSrc(files, stubs), X = e => ctx.__eval(e);
  if (signed) X(`AUTH.s={access_token:'acc_tok_123', refresh_token:'r', expires_at:Date.now()+3600e3, user:{id:'${UID}', email:'a@example.com'}}; AUTH.state='in'`);
  return { X, T, box, ctx };
}
const click = (c, buy) => c.X(`shopClick({target:{closest:s=>s.includes('data-buy')?{dataset:{buy:'${buy}'}, disabled:false}:null}})`);
{
  let c = shopCtx({ host: 'claude.ai', signed: false });
  click(c, 'rune200'); await tick(5);
  ok('artifact (claude.ai): ซื้อ → บอกให้ไปซื้อที่ runeguard-lac.vercel.app · ไม่มี fetch', c.T.toasts.some(([t]) => t.includes('runeguard-lac.vercel.app')) && c.T.fetch.length === 0, c.T);
  c = shopCtx({ signed: false });
  c.X("shopOpen('')"); click(c, 'rune200'); await tick(5);
  ok('ยังไม่ล็อกอิน: ปิดร้าน → หน้าล็อกอิน (พร้อมข้อความ + กลับมาที่ร้านหลังล็อกอิน) · ไม่มี fetch', c.T.closed === 1 && c.T.auth.length === 1 && THAI.test(c.T.auth[0][1]) && c.T.auth[0][2] === 'function' && c.T.fetch.length === 0, c.T);
  ok('ร้าน (ยังไม่ล็อกอิน) บอกว่าต้องเข้าสู่ระบบก่อน · มีปุ่ม ? อธิบายการชำระเงิน', /ต้องเข้าสู่ระบบก่อนซื้อ/.test(c.box.innerHTML) && /data-help="pay"/.test(c.box.innerHTML));
  ok('TF_HELP.pay เป็นภาษาไทย อธิบายขั้นตอน/ความปลอดภัย/สิทธิ์ไม่ขึ้น', THAI.test(c.X('TF_HELP.pay[1]()')) && /พร้อมเพย์/.test(c.X('TF_HELP.pay[1]()')) && /แก้เซฟ/.test(c.X('TF_HELP.pay[1]()')));

  c = shopCtx();
  c.X("shopOpen('')"); await tick(10);
  ok('ล็อกอินแล้ว เปิดร้าน → GET /api/checkout (ถาม configured) + GET rg_purchases ของตัวเอง', c.T.fetch.some(([m, u]) => m === 'GET' && u === 'https://runeguard-lac.vercel.app/api/checkout') && c.T.fetch.some(([m, u]) => m === 'GET' && u.includes('/rest/v1/rg_purchases?') && u.includes('user_id=eq.' + UID)), c.T.fetch.map(f => f[1]));
  ok('SHOP_PAY = true · ข้อความ "จ่ายผ่าน Stripe"', c.X('SHOP_PAY') === true && /จ่ายผ่าน Stripe/.test(c.box.innerHTML));
  click(c, 'rune200'); await tick(10);
  const p = c.T.fetch.find(([m, u]) => m === 'POST' && u.endsWith('/api/checkout'));
  ok('ซื้อ → ยืนยัน (ชื่อ + ราคา) → POST /api/checkout {product} อย่างเดียว + Bearer ของผู้เล่น', c.T.confirms.length === 1 && /รูน 200/.test(c.T.confirms[0][0]) && /99 บาท/.test(c.T.confirms[0][0])
    && p && p[3] === '{"product":"rune200"}' && p[2].Authorization === 'Bearer acc_tok_123', [c.T.confirms, p]);
  ok('ได้ url ของ Stripe → บันทึกเซฟก่อน → location.assign ไป checkout.stripe.com', c.T.saves === 1 && JSON.stringify(c.T.assigned) === '["https://checkout.stripe.com/c/pay/cs_test_Z"]');

  c = shopCtx({ api: (init) => init.method === 'POST' ? Response.json({ url: 'https://evil.example/x' }) : Response.json({ configured: true }) });
  c.X("shopOpen('')"); await tick(10); click(c, 'sup30'); await tick(10);
  ok('server ตอบ url ที่ไม่ใช่ Stripe → ไม่ไป · แจ้งไทย', c.T.assigned.length === 0 && c.T.toasts.some(([t, k]) => k === 'bad' && THAI.test(t)));
  c = shopCtx({ api: (init) => init.method === 'POST' ? Response.json({ error: 'not_configured' }, { status: 503 }) : Response.json({ configured: true }) });
  c.X("shopOpen('')"); await tick(10); click(c, 'sup30'); await tick(10);
  ok('POST ได้ 503 → ปิดปุ่มจ่าย (SHOP_PAY false) · "ระบบชำระเงินยังไม่เปิด"', c.X('SHOP_PAY') === false && c.T.toasts.some(([t]) => /ยังไม่เปิด/.test(t)) && c.T.assigned.length === 0);
  c = shopCtx({ api: () => Response.json({ configured: false }) });
  c.X("shopOpen('')"); await tick(10); click(c, 'rune60'); await tick(10);
  ok('server ยังไม่ตั้งค่า (configured false) → ไม่ POST · แจ้งว่ายังไม่เปิด', !c.T.fetch.some(([m]) => m === 'POST') && c.T.toasts.some(([t]) => /ยังไม่เปิด/.test(t)));
  c = shopCtx({ host: 'localhost', hash: '#dev', api: () => Response.json({ configured: false }), files: ['24-hooks', '28-shop', '43-auth', '59a-ui-shop'] });
  c.X('DEV.shop.clear()'); c.X("shopOpen('')"); await tick(10); click(c, 'rune60'); await tick(5);
  ok('localhost #dev + จ่ายจริงยังไม่เปิด → มอบสิทธิ์ทดสอบ (ไม่ POST)', !c.T.fetch.some(([m]) => m === 'POST') && c.T.toasts.some(([t]) => /ทดสอบ/.test(t)));
  c = shopCtx({ host: 'runeguard-lac.vercel.app', hash: '#dev', signed: false });
  ok('เว็บจริง + #dev → ไม่มีสิทธิ์ทดสอบ (DEV.shop.grant ปฏิเสธ)', c.X("DEV.shop.grant('sup30')") === 'local dev only' && c.X('isSupporter()') === false);

  console.log(' กลับจาก Stripe');
  let n = 0;
  c = shopCtx({ search: '?paid=1&sid=cs_test_PAID1', rows: () => (++n >= 3 ? [{ session_id: 'cs_test_PAID1', product: 'sup30', runes: 0, days: 30, created_at: new Date().toISOString() }] : []) });
  c.X('SHOP_WAIT.fill(5)'); c.X('shopReturn()');
  ok('?paid=1&sid= → ลบออกจาก URL ทันที (history.state เดิม)', c.T.replaced.length === 1 && c.T.replaced[0][1] === '/' && c.T.replaced[0][0].rg === 'root', c.T.replaced);
  await tick(120);
  ok('โหลดรายการซื้อซ้ำจนเจอ session นี้ → "ได้รับสิทธิ์แล้ว" · เป็นผู้สนับสนุน', c.T.toasts.some(([t, k]) => k === 'good' && /ได้รับสิทธิ์แล้ว/.test(t)) && c.X('isSupporter()') === true && n >= 3, [c.T.toasts, n]);
  c = shopCtx({ search: '?paid=1&sid=cs_test_NEVER', rows: [] });
  c.X('SHOP_WAIT.fill(2)'); c.X('shopReturn()'); await tick(150);
  ok('webhook ยังไม่มา (หมดรอบรอ) → บอกให้เปิดร้านอีกครั้ง · ไม่ใช่ผู้สนับสนุน', c.T.toasts.some(([t]) => /ยังไม่พบรายการซื้อ/.test(t)) && c.X('isSupporter()') === false);
  c = shopCtx({ search: '?paid=0' }); c.X('shopReturn()'); await tick(5);
  ok('?paid=0 → "ยกเลิกการชำระเงินแล้ว" · URL สะอาด', c.T.toasts.some(([t]) => /ยกเลิก/.test(t)) && c.T.replaced[0][1] === '/');
  c = shopCtx({ search: '?paid=1&sid=cs_test_X', signed: false }); c.X('SHOP_WAIT.fill(2)'); c.X('shopReturn()'); await tick(80);
  ok('กลับมาแต่ยังไม่ล็อกอิน → ไม่ยิงอะไร · บอกให้เข้าสู่ระบบบัญชีที่ใช้ซื้อ', c.T.fetch.length === 0 && c.T.toasts.some(([t]) => /เข้าสู่ระบบบัญชีที่ใช้ซื้อ/.test(t)));
  c = shopCtx({ search: '?paid=1&sid=%3Cscript%3E', rows: [{ session_id: 'x', product: 'rune60', runes: 60, days: 0, created_at: new Date().toISOString() }] });
  c.X('SHOP_WAIT.fill(2)'); c.X('shopReturn()'); await tick(60);
  ok('sid ผิดรูป → ไม่ใช้ (ดูแค่ว่ามีรายการซื้อ) · ไม่ได้ใส่ลง HTML', c.T.toasts.some(([t]) => /ได้รับสิทธิ์แล้ว/.test(t)) && !c.box.innerHTML.includes('<script'));
  c = shopCtx({ signed: false }); c.X('shopReturn()'); await tick(5);
  ok('boot ไม่ล็อกอิน + ไม่มี ?paid → ไม่มี fetch', c.T.fetch.length === 0);
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
