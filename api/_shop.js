// Runeguard · shared by the Vercel Functions in api/ (a file starting with "_" is not a route of its own) · no dependencies.
// The price table here is the only one that counts: the game (src/js/28-shop.js RSHOP) shows the same numbers and sends nothing
// but a product id; what a purchase grants is decided here and by the webhook (test/45-pay.test.mjs keeps the two tables equal).
// Secrets come only from process.env (set by the owner in Vercel): STRIPE_SECRET_KEY · STRIPE_WEBHOOK_SECRET · SUPABASE_SECRET_KEY.
export const SUPABASE_URL = 'https://edmwctmnasggdtdbcxkb.supabase.co';
// public, like the one in the game (43-auth.js): only identifies the project to Supabase's gateway for GET /auth/v1/user
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_uSbGPoK1lGd6PMUUGpu4uw_N_HfOIbF';
export const APP_URL = 'https://runeguard-lac.vercel.app';

// thb = price in baht (Stripe gets satang: thb × 100) · days = supporter days · runes = runes for the account wallet
export const PRODUCTS = Object.freeze({
  sup30:    Object.freeze({ thb: 35,  days: 30, runes: 0,    name: 'Runeguard · แพคสนับสนุน 30 วัน', desc: 'สุ่มการ์ดใหม่ไม่จำกัด · เลือกการ์ดได้ทั้ง 5 ใบ · ไม่ต่ออายุอัตโนมัติ' }),
  rune60:   Object.freeze({ thb: 35,  days: 0,  runes: 60,   name: 'Runeguard · รูน 60', desc: 'รูน 60 เข้ากระเป๋าบัญชี' }),
  rune200:  Object.freeze({ thb: 99,  days: 0,  runes: 200,  name: 'Runeguard · รูน 200', desc: 'รูน 200 เข้ากระเป๋าบัญชี' }),
  rune700:  Object.freeze({ thb: 299, days: 0,  runes: 700,  name: 'Runeguard · รูน 700', desc: 'รูน 700 เข้ากระเป๋าบัญชี' }),
  rune2500: Object.freeze({ thb: 899, days: 0,  runes: 2500, name: 'Runeguard · รูน 2500', desc: 'รูน 2500 เข้ากระเป๋าบัญชี' }),
});
export function product(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(PRODUCTS, id) ? PRODUCTS[id] : null; }

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{1,190}$/;

// the three keys, trimmed (a value pasted with a space or a newline around it still works)
export function keys(env) {
  const e = env || {}, g = k => (typeof e[k] === 'string' ? e[k].trim() : '');
  return { stripe: g('STRIPE_SECRET_KEY'), whsec: g('STRIPE_WEBHOOK_SECRET'), supa: g('SUPABASE_SECRET_KEY') };
}
// all three are needed for a purchase to be recorded: without the webhook or the Supabase key a player could pay for nothing
export function configured(env) {
  const k = keys(env);
  return /^(sk|rk)_(test|live)_\S{8,}$/.test(k.stripe) && /^whsec_\S{8,}/.test(k.whsec) && /^\S{20,}$/.test(k.supa);
}
// a Supabase secret key goes in apikey only (an sb_secret_ key is not a JWT) · a legacy service_role JWT also as Bearer
export function supabaseServiceHeaders(key) {
  const h = { apikey: key };
  if (/^eyJ/.test(key)) h.Authorization = 'Bearer ' + key;
  return h;
}

export function json(status, obj, extra) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, extra || {}) });
}
// fetch with a deadline (the upstream may hang; Stripe waits ~10 s for the webhook's answer)
export async function timedFetch(fetchImpl, url, init, ms) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), ms || 8000);
  try { return await fetchImpl(url, Object.assign({}, init, { signal: ac.signal })); } finally { clearTimeout(t); }
}
export async function readBody(request, max) {   // → Buffer · throws 'too_big' past max bytes
  const buf = Buffer.from(await request.arrayBuffer());
  if (buf.length > max) throw Object.assign(new Error('too_big'), { code: 'too_big' });
  return buf;
}
export function defaultDeps() {
  return { fetch: globalThis.fetch, env: process.env, now: () => Math.floor(Date.now() / 1000), log: console };
}
