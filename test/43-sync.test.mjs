// test/43-sync.test.mjs (lane N) — auth / cloud sync without any network:   node test/43-sync.test.mjs
//   ก. ประตู: claude.ai artifact (CLOUD_OK=false) และสวิตช์ AUTH_ON=false → ไม่มี fetch / timer / listener / localStorage / DOM ·
//      บนเว็บจริงแต่ยังไม่ล็อกอิน → ไม่มี fetch เลย (รวมรายการซื้อ 28 และ /api/checkout 59a)
//   ข. ฟังก์ชัน pure: syncDecide (+ F2 fast-forward · F6 แถวหาย) · linkDecide · PKCE (RFC 7636 ภาคผนวก B) + ช่องแยกตามชนิด (F10) ·
//      แปลง error เป็นไทย · summary ไม่มีอีเมล · redirect จาก location.origin เท่านั้น · request builder (+ F11 profile header)
//   ค. จำลองกับเซิร์ฟเวอร์ปลอมในไฟล์นี้ (ชั้นเซฟแบบย่อ): timeout 4 วิ · ล้าง URL · PKCE · CAS / ชนกัน / slot 1 · 401 ลองใหม่ ·
//      refresh ครั้งเดียว · keepalive · logout scope=local · ผูกผู้เยี่ยมชม
//   ง. ไฟล์ sql/ ตรงกับข้อความในเอกสาร (rg_001 = DESIGN §6.4–§6.6 · rg_002 = PROPOSAL-shop §5)
//   จ. ชั้นเซฟจริง (40/41 · เซฟ v6) + 27/28: F1 boot · F12 สายเซฟใหม่ตอนรับจากคลาวด์ · F2 · F3 · F4 · F6 · F7 · F8 · รายการซื้อ + clamp
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto, createHash } from 'node:crypto';
import { loadSrc, memStorage, resolveFiles, JS_DIR } from './_vm.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ได้: ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
const eq = (name, got, want) => ok(name, JSON.stringify(got) === JSON.stringify(want), JSON.stringify(got) + '  ต้องเป็น ' + JSON.stringify(want));
const THAI = /[\u0E00-\u0E7F]/;
const KEY = 'sb_publishable_uSbGPoK1lGd6PMUUGpu4uw_N_HfOIbF';
const SUPA_URL = 'https://edmwctmnasggdtdbcxkb.supabase.co';
const UID_A = '0a0a0a0a-0000-4000-8000-00000000000a', UID_B = '0b0b0b0b-0000-4000-8000-00000000000b';
const EMAIL = 'luna.test@example.com';
const b64u = buf => Buffer.from(buf).toString('base64url');
const s256 = v => b64u(createHash('sha256').update(v).digest());
const tick = ms => new Promise(r => setTimeout(r, ms));

function mkLocation(href) {
  const u = new URL(href);
  const loc = { hostname: u.hostname, protocol: u.protocol, origin: u.origin, pathname: u.pathname, search: u.search, hash: u.hash, assigned: [],
    get href() { return this.origin + this.pathname + this.search + this.hash; }, assign(x) { this.assigned.push(x); }, reload() {} };
  return loc;
}
const srcOf = names => "'use strict';\n" + resolveFiles(names).map(n => readFileSync(join(JS_DIR, n), 'utf8')).join('');

/* ================= ก. ประตู ================= */
console.log('ก. ประตู: artifact / สวิตช์ปิด → ไม่มีอะไรวิ่งออกไป · เว็บจริงแต่ยังไม่ล็อกอิน → ไม่มี fetch');
function gateStubs(spy, extra = {}) {
  return Object.assign({
    location: mkLocation('https://claude.ai/?code=abc&redirect_to=https%3A%2F%2Fevil.example&paid=1#dev'),
    fetch: () => { spy.fetch++; return new Promise(() => {}); },
    setTimeout: (f, ms) => { spy.timers.push(ms); return 0; }, setInterval: (f, ms) => { spy.timers.push(ms); return 0; },
    addEventListener: t => { spy.listeners.push(t); },
    document: { addEventListener: t => { spy.listeners.push('document:' + t); }, visibilityState: 'visible',
      querySelector: () => { spy.dom++; return null; }, createElement: () => { spy.dom++; return {}; } },
    $: () => { spy.dom++; return null; },
    history: { replaceState: (a, b, u) => { spy.replace.push(u); } },
    navigator: { locks: { request: () => { spy.locks++; return Promise.resolve('ok'); } }, onLine: true, userAgent: 'test',
      serviceWorker: { getRegistration: () => { spy.fetch++; return Promise.resolve(null); } } },
    AbortController, Response, URLSearchParams, SCHEMA_V: 6,
    saveSummary: () => ({ chars: [], play: 0, mt: 0, appVer: '' }), saveReadOnly: () => false, loadSaveFor: () => { spy.loads++; return null; },
    svlFromCloud: () => { spy.loads++; return false; }, isTrivialSave: () => true,
    exportSave: () => '', toast() {}, sheet() {}, closeSheet() {}, confirmBox: () => Promise.resolve(false), UI: { go() { spy.dom++; }, home() {}, back() {} },
    CLS: {}, SCREENS: [], curScreen: () => null,
  }, extra);
}
async function gateRun(ctx, noUi) {
  const X = ctx.__eval;
  const calls = {
    authSignUp: () => ctx.authSignUp(EMAIL, 'password123'), authSignIn: () => ctx.authSignIn(EMAIL, 'password123'),
    authGoogle: () => ctx.authGoogle(), authHandleRedirect: () => ctx.authHandleRedirect(), authResend: () => ctx.authResend(EMAIL),
    authRecover: () => ctx.authRecover(EMAIL), authSetPassword: () => ctx.authSetPassword('password123'), authSignOut: () => ctx.authSignOut(),
    authToken: () => ctx.authToken(), authFetch: () => ctx.authFetch('/rest/v1/rg_saves', {}).then(() => 'resolved', e => 'reject:' + e.code),
    authApi: () => ctx.authApi('/api/checkout', { auth: false }).then(() => 'resolved', e => 'reject:' + e.code),
    authWantsScreen: () => ctx.authWantsScreen(), authChooseGuest: () => ctx.authChooseGuest(), authEmailMasked: () => ctx.authEmailMasked(), authBootOwner: () => ctx.authBootOwner(),
    cloudStatus: () => ctx.cloudStatus(), cloudPull: () => ctx.cloudPull(), cloudPush: () => ctx.cloudPush('test'), cloudSyncNow: () => ctx.cloudSyncNow(),
    cloudOnLogin: () => ctx.cloudOnLogin(), cloudResolve: () => ctx.cloudResolve('local'), cloudRestoreBackup: () => ctx.cloudRestoreBackup(),
    cloudWipe: () => ctx.cloudWipe(), cloudBackupInfo: () => ctx.cloudBackupInfo(), cloudConflictInfo: () => ctx.cloudConflictInfo(), cloudInit: () => ctx.cloudInit(),
    entRefresh: () => ctx.entRefresh(), entSummaryTh: () => ctx.entSummaryTh(),
    'DEV.auth.useSession': () => X('DEV').auth.useSession({ access_token: 'x', refresh_token: 'y', expires_in: 3600, user: { id: UID_A } }),
    'DEV.sync.push': () => X('DEV').sync.push(), 'DEV.sync.pull': () => X('DEV').sync.pull(), 'DEV.sync.peek': () => X('DEV').sync.peek(),
    uiaInit: () => ctx.uiaInit(), uiaWire: () => ctx.uiaWire(), uiaOpenAuth: () => ctx.uiaOpenAuth('in'), uiaOpenAccount: () => ctx.uiaOpenAccount(),
    uiaStatusTap: () => ctx.uiaStatusTap(), uiaChoiceSheet: () => ctx.uiaChoiceSheet(), uiaRedirectResult: () => ctx.uiaRedirectResult({ kind: 'recovery' }),
    uiaAcctRender: () => ctx.uiaAcctRender(),
  };
  const got = {};
  if (noUi) for (const n of Object.keys(calls)) if (/^uia|^DEV.auth|^authGoogle$|^authSign|^authRe|^authSetPassword|^authApi$/.test(n)) delete calls[n];   // site guest: forms / screens need a DOM (a sign-in sends by design)
  for (const [n, f] of Object.entries(calls)) { const v = await Promise.race([Promise.resolve(f()), tick(50).then(() => 'pending')]); got[n] = v && typeof v === 'object' ? JSON.stringify(v) : String(v); }
  return got;
}
for (const mode of ['artifact', 'killswitch']) {
  const spy = { fetch: 0, timers: [], listeners: [], dom: 0, replace: [], locks: 0, loads: 0 };
  const stubs = gateStubs(spy, mode === 'killswitch' ? { location: mkLocation('https://runeguard-lac.vercel.app/?code=abc&paid=1#dev') } : {});
  let ctx;
  if (mode === 'artifact') ctx = loadSrc(['24-hooks', '28-shop', '43-auth', '44-cloud-sync', '51-ui-auth'], stubs);
  else {   // AUTH_ON=false (text replaced in memory only): the switch still closes every path
    const code = srcOf(['24-hooks', '28-shop', '43-auth', '44-cloud-sync', '51-ui-auth']), off = code.replace('const AUTH_ON=true;', 'const AUTH_ON=false;');
    if (off === code) throw new Error('หา "const AUTH_ON=true;" ใน 43-auth.js ไม่เจอ');
    ctx = vm.createContext(Object.assign({ console, crypto: webcrypto, localStorage: memStorage(), TextEncoder, URL, structuredClone, queueMicrotask }, stubs)); ctx.self = ctx;
    vm.runInContext(off, ctx); ctx.__eval = e => vm.runInContext(e, ctx); ctx.localStorage = ctx.localStorage;
  }
  const L = ctx.localStorage, tag = mode === 'artifact' ? 'artifact (claude.ai)' : 'AUTH_ON=false';
  console.log(' ' + tag);
  if (mode === 'artifact') ok('AUTH_ON === true ในไฟล์ · CLOUD_OK === false บน claude.ai', ctx.__eval('AUTH_ON===true&&CLOUD_OK===false'));
  else ok('AUTH_ON=false → CLOUD_OK === false แม้อยู่บน runeguard-lac.vercel.app', ctx.__eval('AUTH_ON===false&&CLOUD_OK===false'));
  ok('ตอนโหลดไฟล์: ไม่มี timer / listener / fetch / DOM / localStorage', spy.timers.length === 0 && spy.listeners.length === 0 && spy.fetch === 0 && spy.dom === 0 && L.length === 0, JSON.stringify({ ...spy, ls: L.length }));
  ok('ตอนโหลดไฟล์: regScreen ' + (mode === 'artifact' ? 'scrAuth / scrAccount (แค่ชื่อ ไม่แตะ DOM)' : 'ไม่มี (if(AUTH_ON))'), JSON.stringify(ctx.SCREENS) === (mode === 'artifact' ? '["scrAuth","scrAccount"]' : '[]'), ctx.SCREENS);
  const got = await gateRun(ctx);
  ok('เรียกทุกฟังก์ชัน (' + Object.keys(got).length + ' ตัว) แล้ว fetch = 0', spy.fetch === 0, String(spy.fetch));
  ok('timer = 0 · listener = 0 · navigator.locks = 0', spy.timers.length === 0 && spy.listeners.length === 0 && spy.locks === 0, JSON.stringify(spy));
  ok('ไม่แตะ DOM · ไม่เขียน localStorage · ไม่แก้ URL · ไม่สลับเซฟ', spy.dom === 0 && L.length === 0 && spy.replace.length === 0 && ctx.location.assigned.length === 0 && spy.loads === 0, JSON.stringify({ spy, ls: L.length }));
  ok('authFetch / authApi ปฏิเสธด้วย off · cloudPush ได้ offline · cloudPull ได้ none · entRefresh false',
    got.authFetch === 'reject:off' && got.authApi === 'reject:off' && got.cloudPush === 'offline' && got.cloudPull === 'none' && got.entRefresh === 'false', JSON.stringify(got));
  ok('หน้า UI ทุกทางเข้าคืน false', ['uiaOpenAuth', 'uiaOpenAccount', 'uiaStatusTap', 'uiaChoiceSheet', 'DEV.auth.useSession', 'authWantsScreen', 'authChooseGuest', 'authGoogle'].every(n => got[n] === 'false'), JSON.stringify(got));
  eq('cloudStatus()', ctx.cloudStatus(), mode === 'artifact' ? { k: 'artifact', text: 'บัญชีออนไลน์ใช้ได้ที่ runeguard-lac.vercel.app' } : { k: 'off', text: 'เล่นในเครื่องเท่านั้น' });
}
{
  console.log(' เว็บจริง · ยังไม่ล็อกอิน (ผู้เยี่ยมชม)');
  const spy = { fetch: 0, timers: [], listeners: [], dom: 0, replace: [], locks: 0, loads: 0 };
  const ctx = loadSrc(['24-hooks', '28-shop', '43-auth', '44-cloud-sync', '51-ui-auth'], gateStubs(spy, { location: mkLocation('https://runeguard-lac.vercel.app/#dev'), setTimeout, clearTimeout }));
  ok('CLOUD_OK === true บน https://runeguard-lac.vercel.app', ctx.__eval('CLOUD_OK') === true);
  const got = await gateRun(ctx, true);
  ok('ยังไม่ล็อกอิน: เรียกทุกฟังก์ชันที่ไม่ใช่ฟอร์มล็อกอิน แล้ว fetch = 0', spy.fetch === 0, String(spy.fetch));
  ok('authWantsScreen true (ยังไม่เลือกผู้เยี่ยมชม) · cloudStatus guest · authBootOwner null',
    got.authWantsScreen === 'true' && JSON.parse(got.cloudStatus).k === 'guest' && got.authBootOwner === 'null', JSON.stringify(got));
  ok('ไม่เขียน session / pkce / device', ctx.localStorage.getItem('runeguard.auth') === null && ctx.localStorage.getItem('runeguard.device') === null);
}
{
  // static: lane N has exactly one fetch( (athRaw) and it starts with the CLOUD_OK guard · 28 / 59a go through authFetch / authApi
  const srcN = ['43-auth.js', '44-cloud-sync.js', '51-ui-auth.js', '28-shop.js', '59a-ui-shop.js'].map(f => readFileSync(join(JS_DIR, f), 'utf8'));
  const codeN = srcN.join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'])\/\/[^\n]*/g, '$1');
  const fetches = codeN.match(/(^|[^\w.])fetch\(/g) || [];
  ok('43/44/51/28/59a รวมกันมี fetch( ที่เดียว (athRaw)', fetches.length === 1, String(fetches.length));
  ok('athRaw บรรทัดแรกคือ if(!CLOUD_OK) return Promise.reject(…off…)', /function athRaw\(url,init\)\{[^\n]*\n\s*if\(!CLOUD_OK\) return Promise\.reject\(athErr\('off'\)\);/.test(srcN[0]));
  ok('addEventListener / setInterval ของ 43–44 อยู่ใน athInit / cloudInit เท่านั้น', (() => {
    for (const t of srcN.slice(0, 2)) {
      let fn = '';
      for (const ln of t.split('\n')) { const m = ln.match(/^(?:async )?function (\w+)/); if (m) fn = m[1]; if (/addEventListener\(|setInterval\(/.test(ln) && !['athInit', 'cloudInit'].includes(fn)) return false; }
    }
    return true; })());
  ok('authApi ส่งได้แค่ location.origin + /api/…', /athRaw\(location\.origin\+path,/.test(srcN[0]) && /\^\\\/api\\\/\[a-z\]/.test(srcN[0]));
}

/* ================= ข. pure ================= */
console.log('\nข. ฟังก์ชัน pure');
const sumHook = { f: null };
const P = loadSrc(['24-hooks', '43-auth', '44-cloud-sync'], gateStubs({ fetch: 0, timers: [], listeners: [], dom: 0, replace: [], locks: 0, loads: 0 }, {
  location: mkLocation('https://runeguard-lac.vercel.app/play/?redirect_to=https%3A%2F%2Fevil.example&next=//evil.example#dev'),
  saveSummary: s => (sumHook.f ? sumHook.f(s) : null), setTimeout, clearTimeout,
}));
{
  console.log(' syncDecide (§6.8 · F2 · F6)');
  const D = (l, h) => P.syncDecide(l, h);
  const prog = { progress: true }, none = { progress: false };
  const rows = [
    ['1 ไม่มีของค้าง · rev > baseRev → รับของ server', D({ dirty: false, baseRev: 3, ...prog }, { rev: 5, schema_v: 1 }), 'adopt'],
    ['2 มีของค้าง · rev = baseRev → ส่ง', D({ dirty: true, baseRev: 5, ...prog }, { rev: 5, schema_v: 1 }), 'push'],
    ['3 มีของค้าง · rev > baseRev → ชนกัน', D({ dirty: true, baseRev: 3, ...prog }, { rev: 5, schema_v: 1 }), 'conflict'],
    ['4 ไม่มีแถว · ไม่เคยซิงก์ · มีความคืบหน้า → สร้าง', D({ dirty: false, baseRev: 0, ...prog }, null), 'create'],
    ['5 ไม่มีแถว · ไม่มีความคืบหน้า → ไม่ทำอะไร', D({ dirty: true, baseRev: 0, ...none }, null), 'noop'],
    ['6 ไม่มีของค้าง · rev = baseRev → ไม่ทำอะไร', D({ dirty: false, baseRev: 5, ...prog }, { rev: 5, schema_v: 1 }), 'noop'],
    ['7 ไม่มีของค้าง · rev < baseRev (แถวถูกแทนที่) → รับของ server', D({ dirty: false, baseRev: 9, ...prog }, { rev: 2, schema_v: 1 }), 'adopt'],
    ['8 มีของค้าง · rev < baseRev → ชนกัน', D({ dirty: true, baseRev: 9, ...prog }, { rev: 2, schema_v: 1 }), 'conflict'],
    ['กันเวอร์ชัน: schema_v บน server > SCHEMA_V · มีของค้าง → ห้ามส่ง', D({ dirty: true, baseRev: 5, ...prog }, { rev: 5, schema_v: 99 }), 'noop'],
    ['กันเวอร์ชัน: schema_v > SCHEMA_V · ไม่มีของค้าง → ห้ามรับ', D({ dirty: false, baseRev: 3, ...prog }, { rev: 5, schema_v: 99 }), 'noop'],
    ['ยังไม่เคยซิงก์ (baseRev 0) · มีแถว · มีของค้าง → ชนกัน', D({ dirty: true, baseRev: 0, ...prog }, { rev: 1, schema_v: 1 }), 'conflict'],
    ['F6 เคยซิงก์ (baseRev 5) · แถวหาย → gone (ห้ามสร้างใหม่เอง)', D({ dirty: true, baseRev: 5, ...prog }, null), 'gone'],
    ['F6 เคยซิงก์ · แถวหาย · ไม่มีความคืบหน้า → gone', D({ dirty: false, baseRev: 5, ...none }, null), 'gone'],
    ['F2 แถวเป็นสำเนาเก่าของสายเซฟเดียวกัน (wb ตรง · wc 7 ≤ 9) · มีของค้าง → ff', D({ dirty: true, baseRev: 3, wb: 'w_abc', wc: 9, ...prog }, { rev: 5, schema_v: 6, wb: 'w_abc', wc: 7 }), 'ff'],
    ['F2 wc เท่ากัน · ไม่มีของค้าง → ff (แค่เลื่อน baseRev)', D({ dirty: false, baseRev: 3, wb: 'w_abc', wc: 9, ...prog }, { rev: 5, schema_v: 6, wb: 'w_abc', wc: 9 }), 'ff'],
    ['F2 สายเดียวกันแต่ wc ของแถวมากกว่า (ใหม่กว่าเรา) · มีของค้าง → ชนกัน', D({ dirty: true, baseRev: 3, wb: 'w_abc', wc: 9, ...prog }, { rev: 5, schema_v: 6, wb: 'w_abc', wc: 10 }), 'conflict'],
    ['F2 คนละสายเซฟ · มีของค้าง → ชนกัน', D({ dirty: true, baseRev: 3, wb: 'w_abc', wc: 9, ...prog }, { rev: 5, schema_v: 6, wb: 'w_xyz', wc: 1 }), 'conflict'],
    ['F2 wb ของเครื่องว่าง/ผิดรูป → ไม่ ff', D({ dirty: true, baseRev: 3, wb: '', wc: 9, ...prog }, { rev: 5, schema_v: 6, wb: '', wc: 1 }), 'conflict'],
    ['F2 wc ของแถวไม่ใช่ตัวเลข → ไม่ ff', D({ dirty: true, baseRev: 3, wb: 'w_abc', wc: 9, ...prog }, { rev: 5, schema_v: 6, wb: 'w_abc', wc: 'x' }), 'conflict'],
  ];
  for (const [n, g, w] of rows) eq(n, g, w);
  const all = new Set(); for (const d of [false, true]) for (const b of [0, 1, 5, 9]) for (const h of [null, { rev: 1, schema_v: 1 }, { rev: 5, schema_v: 1 }, { rev: 5, schema_v: 99 }, { rev: 5, schema_v: 6, wb: 'w_a', wc: 1 }]) for (const p of [false, true]) all.add(D({ dirty: d, baseRev: b, progress: p, wb: 'w_a', wc: 3 }, h));
  ok('ทุกผลอยู่ในชุด adopt|push|conflict|create|noop|ff|gone', [...all].every(x => ['adopt', 'push', 'conflict', 'create', 'noop', 'ff', 'gone'].includes(x)), [...all].join(','));

  console.log(' linkDecide (§6.9 · ความคืบหน้า = มีตัวละคร Lv ≥ 3)');
  const g0 = { chars: [{ lv: 2 }, { lv: 1 }] }, g1 = { chars: [{ lv: 1 }, { lv: 3 }] }, row = { rev: 4, schema_v: 1 };
  eq('ไม่มีความคืบหน้า · มีแถว → รับ s', P.linkDecide(g0, row), 'adopt');
  eq('มีความคืบหน้า · ไม่มีแถว → ถามย้าย', P.linkDecide(g1, null), 'askMove');
  eq('มีความคืบหน้า · มีแถว → หน้าเลือก', P.linkDecide(g1, row), 'choose');
  eq('ไม่มีความคืบหน้า · ไม่มีแถว → ไม่ทำอะไร', P.linkDecide(g0, null), 'noop');
  eq('ไม่มีเซฟผู้เยี่ยมชมเลย (null) · มีแถว → รับ s', P.linkDecide(null, row), 'adopt');
  eq('แถวบน server เป็น schema ใหม่กว่า → ไม่ทำอะไร', P.linkDecide(g1, { rev: 4, schema_v: 99 }), 'noop');

  console.log(' PKCE (RFC 7636 ภาคผนวก B) · ช่องแยกตามชนิด (F10)');
  const rfc = [116, 24, 223, 180, 151, 153, 224, 37, 79, 250, 96, 125, 216, 173, 187, 186, 22, 212, 37, 77, 105, 214, 191, 240, 91, 88, 5, 88, 83, 132, 141, 121];
  eq('base64url(32 ไบต์ของ RFC) = verifier ของ RFC', P.athB64url(new Uint8Array(rfc)), 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
  eq('S256(dBjftJeZ…) = E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM', await P.athChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'), 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  let b64ok = true; for (let n = 0; n < 40; n++) { const a = webcrypto.getRandomValues(new Uint8Array(n)); if (P.athB64url(a) !== b64u(a)) b64ok = false; }
  ok('base64url ตรงกับ Buffer ทุกความยาว 0–39 ไบต์', b64ok);
  const vs = Array.from({ length: 200 }, () => P.athVerifier());
  ok('verifier ยาว 43 ตัว · อักษร [A-Za-z0-9-_] · 200 ตัวไม่ซ้ำ', vs.every(v => /^[A-Za-z0-9_-]{43}$/.test(v)) && new Set(vs).size === 200);
  const chS = await P.athPkceNew('signup'), chR = await P.athPkceNew('recovery'), st = JSON.parse(P.localStorage.getItem('runeguard.auth.pkce'));
  P.localStorage.setItem('runeguard.auth.pkce', JSON.stringify({ signup: { v: st.signup.v, ts: Date.now() - 5000 }, recovery: { v: st.recovery.v, ts: Date.now() - 1000 } }));   // same ms → set the order
  ok('ขอลืมรหัสหลังสมัคร → ช่อง signup ยังอยู่ (ไม่ถูกทับ) · challenge = S256(v) ของแต่ละช่อง', st.signup && st.recovery && chS === s256(st.signup.v) && chR === s256(st.recovery.v) && st.signup.v !== st.recovery.v);
  const t1 = P.athPkceTake();
  ok('athPkceTake: ทั้งสองช่องยังใช้ได้ เรียงใหม่สุดก่อน (recovery, signup)', JSON.stringify(t1.live.map(x => x.kind)) === '["recovery","signup"]' && t1.live[0].v === st.recovery.v);
  P.athPkceDrop('recovery');
  ok('athPkceDrop(recovery) ลบเฉพาะช่องนั้น', JSON.stringify(Object.keys(JSON.parse(P.localStorage.getItem('runeguard.auth.pkce')))) === '["signup"]');
  P.localStorage.setItem('runeguard.auth.pkce', JSON.stringify({ google: { v: st.signup.v, ts: Date.now() - 601000 }, signup: { v: st.signup.v, ts: Date.now() - 23 * 3600e3 } }));
  const t2 = P.athPkceTake();
  ok('Google เกิน 10 นาที → ลบ · ลิงก์อีเมล 23 ชม. → ยังใช้ได้', JSON.stringify(t2.live.map(x => x.kind)) === '["signup"]' && JSON.stringify(t2.kinds) === '["google","signup"]' && !JSON.parse(P.localStorage.getItem('runeguard.auth.pkce')).google);
  P.localStorage.setItem('runeguard.auth.pkce', JSON.stringify({ signup: { v: st.signup.v, ts: Date.now() - 25 * 3600e3 } }));
  const t3 = P.athPkceTake();
  ok('ลิงก์อีเมลเกิน 24 ชม. → ไม่มีช่องที่ใช้ได้ แต่ยังรู้ชนิด (ข้อความถูก) · คีย์ถูกลบ', t3.live.length === 0 && JSON.stringify(t3.kinds) === '["signup"]' && P.localStorage.getItem('runeguard.auth.pkce') === null);
  P.localStorage.setItem('runeguard.auth.pkce', '{bad json'); const t4 = P.athPkceTake();
  ok('ข้อมูลเสีย → ว่าง', t4.live.length === 0 && t4.kinds.length === 0);
  P.localStorage.setItem('runeguard.auth.pkce', JSON.stringify({ signup: { v: 'short', ts: Date.now() }, hacker: { v: st.signup.v, ts: Date.now() } }));
  ok('verifier ผิดรูป / ชนิดแปลก → ไม่ใช้', P.athPkceTake().live.length === 0);

  console.log(' error code → ข้อความไทย (§6.7)');
  const LINK = 'ลิงก์หมดอายุหรือใช้ไปแล้ว ขอลิงก์ใหม่', OFF = 'เชื่อมต่อไม่ได้ · เล่นต่อแบบออฟไลน์ได้', BADMAIL = 'รูปแบบอีเมลไม่ถูกต้อง';
  const table = {
    invalid_credentials: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', email_not_confirmed: 'ยังไม่ได้ยืนยันอีเมล',
    over_email_send_rate_limit: 'ส่งอีเมลถี่เกินไป รอสักครู่ หรือเข้าด้วย Google', over_request_rate_limit: 'ลองใหม่อีกครั้งในอีกสักครู่',
    weak_password: 'รหัสผ่านสั้นเกินไป (อย่างน้อย 8 ตัว)', email_address_invalid: BADMAIL, validation_failed: BADMAIL,
    flow_state_expired: LINK, flow_state_not_found: LINK, bad_code_verifier: LINK, timeout: OFF, network: OFF,
  };
  for (const [c, m] of Object.entries(table)) eq('  ' + c, P.athErrTh(c, 400), m);
  for (const s of [500, 502, 503, 504]) eq('  ' + s + ' (5xx ไม่มี code)', P.athErrTh(P.athCode(s, null), s), 'ระบบบัญชีขัดข้องชั่วคราว');
  eq('  429 ไม่มี code', P.athErrTh(P.athCode(429, {}), 429), 'ลองใหม่อีกครั้งในอีกสักครู่');
  eq('  GoTrue แบบใหม่ {error_code}', P.athCode(400, { code: 400, error_code: 'invalid_credentials', msg: 'Invalid login credentials' }), 'invalid_credentials');
  eq('  GoTrue แบบเก่า invalid_grant + Email not confirmed', P.athCode(400, { error: 'invalid_grant', error_description: 'Email not confirmed' }), 'email_not_confirmed');
  eq('  code ที่ไม่รู้จัก → ข้อความกลางภาษาไทย ไม่เอาข้อความจาก server มาแสดง', P.athErrTh(P.athCode(400, { error_code: 'zzz', msg: '<img src=x> call 555' }), 400), 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง');
  const msgs = Object.values(P.__eval('ATH_MSG')).concat(Object.values(P.__eval('ATH_NOVER')), [P.__eval('ATH_NEUTRAL')], Object.values(P.__eval('SYN_ERR_TH')));
  ok('ทุกข้อความใน ATH_MSG / ATH_NOVER / ข้อความกลาง / SYN_ERR_TH เป็นภาษาไทย (' + msgs.length + ' ข้อความ)', msgs.every(m => THAI.test(m)), msgs.filter(m => !THAI.test(m)));
  eq('ข้อความกลางของสมัคร/ลืมรหัส = ข้อความใน §6.7', P.__eval('ATH_NEUTRAL'), 'ถ้าอีเมลนี้ใช้ได้ เราส่งลิงก์ไปแล้ว ตรวจกล่องจดหมาย (รวมถึงสแปม) · ถ้ามีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ');

  console.log(' summary / data ไม่มีอีเมล (§6.8)');
  const save = { v: 6, sid: 's_1', owner: UID_A, mt: 1762560000000, play: 7200, acct: { gold: 5, note: EMAIL },
    chars: [{ id: 'c_1', name: 'ลูน่า', cls: 'mage', job: null, lv: 23 }, { id: 'c_2', name: EMAIL, cls: 'thief', job: 'nightblade', lv: 7 },
      { id: 'c_3', name: 'Ab 12', cls: 'constructor<b>', job: 'x y', lv: 999 }, { id: 'c_4', name: 'เกิน', cls: 'mage', lv: 1 }] };
  sumHook.f = s => ({ chars: s.chars.map(c => ({ n: c.name, cls: c.cls, job: c.job, lv: c.lv, email: EMAIL })), play: s.play, mt: s.mt, appVer: 'v2', email: EMAIL, owner: s.owner, token: 'tokTOKtok' });
  const sm = P.synSummary(save), smj = JSON.stringify(sm);
  ok('saveSummary ที่ "ใส่อีเมลมาเอง" ก็ยังไม่หลุด: ไม่มี @ / อีเมล / owner / token', !smj.includes('@') && !smj.includes('luna') && !smj.includes(UID_A) && !smj.includes('tok'), smj);
  eq('ตัวละคร {n, cls, job, lv} · ไม่เกิน 3 ตัว · ชื่อผิดกฎ = ? · cls/job แปลก = null · lv 1–60', sm.chars,
    [{ n: 'ลูน่า', cls: 'mage', job: null, lv: 23 }, { n: '?', cls: 'thief', job: 'nightblade', lv: 7 }, { n: 'Ab 12', cls: null, job: null, lv: 60 }]);
  sumHook.f = null;
  P.__eval(`AUTH.s={access_token:'acc_tok_123456', refresh_token:'ref_tok_654321', expires_at:Date.now()+3600e3, user:{id:'${UID_A}', email:'${EMAIL}'}}`);
  const pl = P.synPayload(save);
  ok('synPayload: เซฟที่มีอีเมลของผู้ใช้ซ่อนอยู่ → ไม่ยอมส่ง (why=private)', pl.ok === false && pl.why === 'private', JSON.stringify(pl));
  const clean = JSON.parse(JSON.stringify(save)); delete clean.acct.note; clean.chars[1].name = 'มิว';
  const pl2 = P.synPayload(clean), body = JSON.parse(pl2.body);
  ok('synPayload: เซฟสะอาด → data ไม่มี owner · key = {schema_v, device, summary, data} · schema_v = 6', pl2.ok && !('owner' in body.data) && JSON.stringify(Object.keys(body)) === '["schema_v","device","summary","data"]' && body.schema_v === 6, pl2.why);
  const big = JSON.parse(JSON.stringify(clean)); big.pad = 'x'.repeat(270000);
  ok('synPayload: เกิน 256 KB → ไม่ส่ง (why=big)', P.synPayload(big).why === 'big');
  P.__eval('AUTH.s=null');

  console.log(' redirect / request builder (§6.7 · §11.2 · F11)');
  const R = 'https://runeguard-lac.vercel.app/';
  eq('RURL = location.origin + "/" (ไม่สน path / query / hash)', P.__eval('RURL'), R);
  const enc = encodeURIComponent(R);
  const q = op => P.athReq(op, { email: EMAIL, pw: 'password123', ch: 'CHAL', code: 'CODE', v: 'VER', rt: 'RT', token: 'TK' });
  eq('signup → /auth/v1/signup?redirect_to=RURL', q('signup').path, '/auth/v1/signup?redirect_to=' + enc);
  eq('Google → /authorize?provider=google&redirect_to=RURL&code_challenge=C&code_challenge_method=s256', P.athGoogleUrl('CHAL'),
    SUPA_URL + '/auth/v1/authorize?provider=google&redirect_to=' + enc + '&code_challenge=CHAL&code_challenge_method=s256');
  eq('logout → /auth/v1/logout?scope=local (POST, ใช้ JWT)', [q('logout').path, q('logout').opts.method, q('logout').opts.auth], ['/auth/v1/logout?scope=local', 'POST', undefined]);
  const ops = ['signup', 'resend', 'password', 'pkce', 'refresh', 'recover', 'setpw', 'user', 'logout'];
  ok('ไม่มี op ไหนใส่อีเมล/รหัสผ่านใน URL', ops.every(o => !q(o).path.includes('@') && !q(o).path.includes('luna') && !q(o).path.includes('password123')));
  const u = 'user_id=eq.' + UID_A, sq = (op, a) => P.synReq(op, Object.assign({ uid: UID_A }, a));
  eq('ดูหัว: + device และ wb / wc ของเซฟ (F2) ด้วย JSON path', sq('head').path, '/rest/v1/rg_saves?select=slot,schema_v,rev,device,summary,updated_at,wb:data->>wb,wc:data->wc&' + u);
  eq('ส่ง (CAS): PATCH ?user_id&slot=eq.0&rev=eq.<baseRev>&select=rev,updated_at + return=representation',
    [sq('cas', { rev: 7, body: '{}' }).path, sq('cas', { rev: 7, body: '{}' }).opts.method, sq('cas', { rev: 7, body: '{}' }).opts.headers.Prefer],
    ['/rest/v1/rg_saves?' + u + '&slot=eq.0&rev=eq.7&select=rev,updated_at', 'PATCH', 'return=representation']);
  eq('ลบทั้งหมด: DELETE ?user_id=eq.<uid>', [sq('wipe').path, sq('wipe').opts.method], ['/rest/v1/rg_saves?' + u, 'DELETE']);
  P.__eval(`AUTH.s={access_token:'a', refresh_token:'r', expires_at:0, user:{id:'${UID_A}', email:'lu@gmail.com'}}`);
  eq('authEmailMasked: lu@gmail.com → l***@gmail.com', P.authEmailMasked(), 'l***@gmail.com');
  P.__eval(`AUTH.s.user.id='x" OR 1=1'`); eq('synUid ไม่ยอมรับ uid ที่ไม่ใช่ UUID (กัน query injection)', P.synUid(), '');
  P.__eval('AUTH.s=null');
}

/* ================= ค. จำลองกับเซิร์ฟเวอร์ปลอม (ชั้นเซฟแบบย่อ) ================= */
console.log('\nค. จำลองกับเซิร์ฟเวอร์ปลอม');
function fakeServer() {
  const S = { log: [], users: { [EMAIL]: { pw: 'password123', id: UID_A }, 'mew@example.com': { pw: 'password456', id: UID_B } }, access: new Map(), refresh: new Map(),
    codes: new Map(), rows: [], purchases: [], n: 0, refreshes: 0, kill: false, noRefresh: false, logoutScope: null, hook: null, codeErr: null };
  const session = uid => { const id = ++S.n, at = 'acc_' + id + '_' + uid.slice(0, 4), rt = 'ref_' + id + '_' + uid.slice(0, 4); S.access.set(at, uid); S.refresh.set(rt, uid);
    return { access_token: at, refresh_token: rt, expires_in: 3600, token_type: 'bearer', user: { id: uid, email: Object.keys(S.users).find(e => S.users[e].id === uid) } }; };
  const res = (status, obj) => new Response(obj === undefined || [204].includes(status) ? null : JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
  const pick = (row, sel) => { if (!sel) return row; const o = {}; for (const k of sel.split(',')) { const m = /^(\w+):(\w+)->(>?)(\w+)$/.exec(k);   // alias:col->key / ->>key
    if (m) { const v = row[m[2]] && row[m[2]][m[4]]; o[m[1]] = v === undefined ? null : m[3] ? (v === null ? null : String(v)) : v; } else o[k] = row[k]; } return o; };
  async function handle(url, init) {
    const U = new URL(url), p = U.pathname, Q = U.searchParams, h = init.headers || {}, body = init.body ? JSON.parse(init.body) : null;
    const e = { m: init.method, url, p, q: Object.fromEntries(Q), h, body, keepalive: init.keepalive }; S.log.push(e);
    if (U.origin !== SUPA_URL || h.apikey !== KEY) return res(401, { message: 'bad origin/apikey' });
    if (S.hook) { const r = S.hook(e); if (r) return r; }
    const bearer = (h.Authorization || '').replace(/^Bearer /, ''), who = S.kill ? null : S.access.get(bearer);
    if (p === '/auth/v1/token') {
      const g = Q.get('grant_type');
      if (g === 'password') { const us = S.users[body.email]; return us && us.pw === body.password ? res(200, session(us.id)) : res(400, { code: 400, error_code: 'invalid_credentials' }); }
      if (g === 'pkce') { if (S.codeErr) return res(422, { error_code: S.codeErr }); const c = S.codes.get(body.auth_code); if (!c) return res(404, { error_code: 'flow_state_not_found' });
        if (s256(body.code_verifier) !== c.ch) return res(403, { error_code: 'bad_code_verifier' });   // GoTrue keeps the flow on a wrong verifier
        S.codes.delete(body.auth_code); return res(200, session(c.uid)); }
      if (g === 'refresh_token') { S.refreshes++; const uid = S.refresh.get(body.refresh_token); if (!uid || S.noRefresh) return res(400, { error_code: 'refresh_token_not_found' });
        S.refresh.delete(body.refresh_token); S.kill = false; return res(200, session(uid)); }
    }
    if (p === '/auth/v1/signup') return res(200, { id: UID_A, email: body.email, identities: [] });
    if (p === '/auth/v1/recover' || p === '/auth/v1/resend') return res(200, {});
    if (p === '/auth/v1/user') return who ? res(200, { id: who, email: EMAIL }) : res(401, { error_code: 'bad_jwt' });
    if (p === '/auth/v1/logout') { S.logoutScope = Q.get('scope'); return res(204); }
    if (p.startsWith('/rest/v1/') && (init.method === 'GET' ? h['Accept-Profile'] : h['Content-Profile']) !== 'public') return res(406, { code: 'PGRST106', message: 'profile header missing' });
    if (p === '/rest/v1/rg_purchases') {
      if (!who) return res(401, { code: 'PGRST301' });
      if (init.method !== 'GET') return res(403, { code: '42501' });
      return res(200, S.purchases.filter(r => r.user_id === who).map(r => pick(r, Q.get('select'))));
    }
    if (p === '/rest/v1/rg_saves') {
      if (!who) return res(401, { code: 'PGRST301' });
      const mine = S.rows.filter(r => r.user_id === who);   // RLS
      const f = r => (!Q.get('user_id') || 'eq.' + r.user_id === Q.get('user_id')) && (!Q.get('slot') || 'eq.' + r.slot === Q.get('slot')) && (!Q.get('rev') || 'eq.' + r.rev === Q.get('rev'));
      const now = new Date(Date.now() + S.n * 1000).toISOString();
      if (init.method === 'GET') return res(200, mine.filter(f).sort((a, b) => a.slot - b.slot).map(r => pick(r, Q.get('select'))));
      if (init.method === 'DELETE') { S.rows = S.rows.filter(r => !(r.user_id === who && f(r))); return res(204); }
      if (body && JSON.stringify(body.data || {}).length > 262144) return res(400, { code: '23514' });
      if (init.method === 'PATCH') { const hit = mine.filter(f); for (const r of hit) { Object.assign(r, { schema_v: body.schema_v, device: body.device, summary: body.summary, data: body.data }); r.rev++; r.updated_at = now; }
        return res(200, hit.map(r => pick(r, Q.get('select')))); }
      if (init.method === 'POST') {
        const ex = mine.find(r => r.slot === body.slot), row = { user_id: who, slot: body.slot, schema_v: body.schema_v, device: body.device, summary: body.summary, data: body.data, updated_at: now };
        if (Q.get('on_conflict')) { if (ex) { Object.assign(ex, row, { rev: ex.rev + 1 }); } else S.rows.push(Object.assign(row, { rev: 1 })); return res(201); }
        if (ex) return res(409, { code: '23505' });
        S.rows.push(Object.assign(row, { rev: 1 })); return res(201, [pick(row, Q.get('select'))]);
      }
    }
    return res(404, {});
  }
  S.fetchImpl = (url, init) => new Promise((ok_, no) => {
    if (init.signal) init.signal.addEventListener('abort', () => no(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    handle(url, init).then(ok_, no);
  });
  return S;
}
// the light save layer of the hold tests (section ค) · the real 40/41 layer is section จ
const LIGHT = `
const SCHEMA_V=6;
function loadSaveFor(owner){ const k=owner?'runeguard.save.u.'+owner:'runeguard.save.guest'; let o=null; try{ o=JSON.parse(STORE.get(k)||'null'); }catch(e){}
  if(!o) o={v:6, sid:'s_new', owner:null, created:1, mt:1, play:0, acct:{gold:0}, chars:[]}; o.owner=owner||null; SAVE=o; __T.loads.push(owner); return SAVE; }
function svlFromCloud(owner,obj){ const k='runeguard.save.u.'+owner, old=STORE.get(k); if(old!==null) STORE.set(k+'.bak',old);
  const o=Object.assign(JSON.parse(JSON.stringify(obj)),{owner}); STORE.set(k,JSON.stringify(o)); SAVE=o; __T.loads.push('cloud:'+owner); return true; }
function isTrivialSave(s){ return !(s&&Array.isArray(s.chars)&&s.chars.length); }
function saveReadOnly(){ return false; }
function saveSummary(s){ return {chars:(s.chars||[]).map(c=>({n:c.name, cls:c.cls, job:c.job, lv:c.lv})), play:s.play||0, mt:s.mt||0, appVer:'t'}; }
`;
function simCtx({ href = 'http://localhost:8793/#dev', fetch, storage, fireFetchTimeout = false, locks = null, files = ['24-hooks', '43-auth', '44-cloud-sync'], light = true, extra = {} } = {}) {
  const T = { timers: [], ev: [], loads: [], replaced: [], order: [], docL: {}, winL: {}, toasts: [] };
  const loc = mkLocation(href), ls = storage || memStorage();
  let code = srcOf(files);
  if (!/const AUTH_ON=true;/.test(code)) throw new Error('43-auth.js ต้องส่งด้วย AUTH_ON=true');
  if (light) code += LIGHT;
  code += "\nBUS.on('sync',e=>__T.ev.push('sync:'+e)); BUS.on('auth',e=>__T.ev.push('auth:'+e));\n";
  const g = Object.assign({
    console, crypto: webcrypto, localStorage: ls, sessionStorage: memStorage(), structuredClone, TextEncoder, TextDecoder, URL, URLSearchParams,
    AbortController, Response, queueMicrotask, performance, clearTimeout, clearInterval, __T: T, location: loc,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    setTimeout: (f, ms) => { T.timers.push(ms); if (ms === 4000) return fireFetchTimeout ? setTimeout(f, 20) : 0; if (ms <= 250) return setTimeout(f, ms); return 0; },
    setInterval: (f, ms) => { T.timers.push('i' + ms); return 0; },
    fetch: (u, i) => { T.order.push('fetch ' + new URL(u).pathname); return fetch(u, i); },
    history: { state: { rg: 'root', d: 0 }, replaceState: (a, b, u) => { T.order.push('replace ' + u); T.replaced.push([a, u]); const x = new URL(u, loc.origin); loc.pathname = x.pathname; loc.search = x.search; loc.hash = x.hash; } },
    addEventListener: (t, f) => { (T.winL[t] = T.winL[t] || []).push(f); },
    document: { visibilityState: 'visible', addEventListener: (t, f) => { (T.docL[t] = T.docL[t] || []).push(f); } },
    navigator: { onLine: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', locks: locks || undefined },
    toast: (t, k) => T.toasts.push([t, k]),
  }, extra);
  const ctx = vm.createContext(g); ctx.self = ctx;
  vm.runInContext(code, ctx, { filename: 'sim{' + files.join(',') + '}' });
  ctx.__eval = e => vm.runInContext(e, ctx);
  ctx.T = T; ctx.ls = ls;
  ctx.settle = async () => { for (let i = 0; i < 8; i++) { await ctx.__eval('SYN.q'); await new Promise(r => setImmediate(r)); } };
  return ctx;
}
const guestSave = (lv = 5) => ({ v: 6, sid: 's_guest', owner: null, created: 1, mt: 1000, play: 3000, acct: { gold: 40 }, chars: [{ id: 'c_g', name: 'ลูน่า', cls: 'mage', job: null, lv }] });
{
  console.log(' timeout 4 วิ');
  const never = (u, i) => new Promise((_, no) => i.signal.addEventListener('abort', () => no(Object.assign(new Error('a'), { name: 'AbortError' }))));
  const c = simCtx({ fetch: never, fireFetchTimeout: true });
  ok('CLOUD_OK = true ที่ localhost', c.__eval('CLOUD_OK') === true);
  const r = await c.authSignIn(EMAIL, 'password123');
  ok('fetch ถูกตั้ง AbortController 4000 ms', c.T.timers.includes(4000), JSON.stringify(c.T.timers));
  eq('หมดเวลา → "เชื่อมต่อไม่ได้ · เล่นต่อแบบออฟไลน์ได้" (code timeout)', [r.ok, r.msg, r.code], [false, 'เชื่อมต่อไม่ได้ · เล่นต่อแบบออฟไลน์ได้', 'timeout']);
  ok('ล้มแล้ว state กลับเป็น guest และไม่มี session ใน localStorage', c.__eval('AUTH.state') === 'guest' && c.ls.getItem('runeguard.auth') === null);
}
{
  console.log(' ล็อกอิน → ผูกผู้เยี่ยมชม (askMove → ย้าย) → CAS → ชนกัน → slot 1');
  const S = fakeServer(); const ls = memStorage(); ls.setItem('runeguard.save.guest', JSON.stringify(guestSave(5)));
  const c = simCtx({ fetch: S.fetchImpl, storage: ls });
  c.loadSaveFor(null);
  ok('authWantsScreen() = true ตอนยังไม่ล็อกอิน', c.authWantsScreen() === true);
  ok('init แล้วมี listener storage + visibilitychange + online/offline และ interval 5 นาที', !!c.T.winL.storage && c.T.docL.visibilitychange.length === 2 && !!c.T.winL.online && c.T.timers.includes('i300000'));
  const r = await c.authSignIn(EMAIL, 'password123'); await c.settle();
  const tok = S.log.find(x => x.p === '/auth/v1/token');
  ok('ล็อกอินสำเร็จ · state in · session อยู่ใน runeguard.auth', r.ok && c.__eval('AUTH.state') === 'in' && JSON.parse(ls.getItem('runeguard.auth')).user.id === UID_A);
  ok('คำขอ token: apikey = publishable key · ไม่มี Authorization · อีเมลอยู่ใน body', tok.h.apikey === KEY && !tok.h.Authorization && tok.body.email === EMAIL && !tok.url.includes('@'));
  ok('ไม่มีแถวบน server + ผู้เยี่ยมชม Lv 5 → askMove', c.T.ev.includes('sync:askMove') && c.cloudConflictInfo().kind === 'askMove', c.T.ev.join(','));
  eq('cloudResolve("local") = ย้าย → ok', await c.cloudResolve('local'), 'ok');
  const row0 = S.rows.find(x => x.slot === 0), create = S.log.find(x => x.m === 'POST' && x.p === '/rest/v1/rg_saves');
  ok('สร้างแถว slot 0 ด้วยข้อมูลของผู้เยี่ยมชม (ไม่มี owner) · Content-Profile: public (F11)', row0 && row0.data.chars[0].lv === 5 && !('owner' in row0.data) && row0.user_id === UID_A && create.h['Content-Profile'] === 'public');
  ok('POST สร้าง: Bearer = access token (ไม่ใช่ publishable key)', create.h.Authorization.startsWith('Bearer acc_') && create.h.Authorization !== 'Bearer ' + KEY && create.h.Prefer === 'return=representation');
  ok('เซฟผู้เยี่ยมชมยังอยู่ · มีแคชของบัญชี (ผ่าน svlFromCloud)', ls.getItem('runeguard.save.guest') !== null && JSON.parse(ls.getItem('runeguard.save.u.' + UID_A)).owner === UID_A && c.T.loads.includes('cloud:' + UID_A));
  ok('cloudStatus = ☁ ซิงก์แล้ว HH:MM', /^☁ ซิงก์แล้ว \d\d:\d\d$/.test(c.cloudStatus().text), c.cloudStatus().text);

  c.__eval("SAVE.chars[0].lv=6; SAVE.mt=2000; BUS.emit('save','test')");
  eq('แก้เซฟ → cloudPush = ok', await c.cloudPush('test'), 'ok');
  const other = { v: 6, sid: 's_guest', created: 1, mt: 5000, play: 9000, acct: { gold: 999 }, chars: [{ id: 'c_g', name: 'ลูน่า', cls: 'mage', job: null, lv: 9 }] };
  Object.assign(S.rows.find(x => x.slot === 0), { rev: 3, data: other, device: 'd_zzzzzz Android', summary: { chars: [{ n: 'ลูน่า', cls: 'mage', job: null, lv: 9 }], play: 9000, mt: 5000, appVer: 't' } });
  c.__eval("SAVE.chars[0].lv=7; SAVE.mt=3000; BUS.emit('save','test')");
  eq('อีกเครื่องส่งไปก่อน → PATCH ได้ [] → conflict', await c.cloudPush('test'), 'conflict');
  const ci = c.cloudConflictInfo();
  ok('หน้าเลือก: คลาวด์ Lv 9 · Android · เครื่องนี้ Lv 7 · status conflict', ci.kind === 'conflict' && ci.srv.sum.chars[0].lv === 9 && ci.srv.dev.endsWith('Android') && ci.local.sum.chars[0].lv === 7 && c.cloudStatus().k === 'conflict');
  eq('เลือก "เครื่องนี้" → ok', await c.cloudResolve('local'), 'ok');
  const s0 = S.rows.find(x => x.slot === 0), s1 = S.rows.find(x => x.slot === 1);
  ok('slot 1 = ของอีกเครื่อง (Lv 9 · gold 999) · slot 0 = เครื่องนี้ (Lv 7) · ไม่ผสมกัน', s1 && s1.data.chars[0].lv === 9 && s1.data.acct.gold === 999 && s0.data.chars[0].lv === 7 && s0.data.acct.gold === 40);

  Object.assign(s0, { rev: s0.rev + 1, data: other });
  c.__eval("SAVE.chars[0].lv=8; SAVE.mt=4000; BUS.emit('save','test')");
  eq('ชนกันอีกครั้ง → conflict', await c.cloudPush('test'), 'conflict');
  eq('เลือก "บนคลาวด์" → ok', await c.cloudResolve('cloud'), 'ok');
  ok('slot 1 = เครื่องนี้ (Lv 8) · SAVE = ของคลาวด์ (Lv 9 · gold 999) · owner = uid · dirty false',
    S.rows.find(x => x.slot === 1).data.chars[0].lv === 8 && c.__eval('SAVE.chars[0].lv') === 9 && c.__eval('SAVE.acct.gold') === 999 && c.__eval('SAVE.owner') === UID_A
    && JSON.parse(ls.getItem('runeguard.cloud.u.' + UID_A)).dirty === false);

  console.log(' 401 → ต่ออายุ → ลองใหม่ 1 ครั้ง · refresh ครั้งเดียว');
  S.kill = true; const nRef = S.refreshes, nPatch = S.log.filter(x => x.m === 'PATCH').length;
  c.__eval("SAVE.chars[0].lv=10; SAVE.mt=6000; BUS.emit('save','test')");
  eq('token ใช้ไม่ได้ (401) → ต่ออายุแล้วส่งซ้ำ → ok', await c.cloudPush('test'), 'ok');
  eq('refresh 1 ครั้ง · PATCH 2 ครั้ง', [S.refreshes - nRef, S.log.filter(x => x.m === 'PATCH').length - nPatch], [1, 2]);
  c.__eval('AUTH.s.expires_at=Date.now()-1000'); const nRef2 = S.refreshes;
  const toks = await Promise.all([c.authToken(), c.authToken(), c.authToken()]);
  ok('authToken พร้อมกัน 3 ครั้ง → refresh 1 ครั้ง ได้ token เดียวกัน', S.refreshes - nRef2 === 1 && new Set(toks).size === 1 && toks[0].startsWith('acc_'), JSON.stringify(toks));

  console.log(' keepalive ตอนซ่อนหน้า');
  c.__eval("SAVE.chars[0].lv=11; SAVE.mt=7000; BUS.emit('save','test')");
  const nk = S.log.length; c.__eval("document.visibilityState='hidden'"); for (const f of c.T.docL.visibilitychange) f(); await c.settle(); await tick(20);
  const ka = S.log.slice(nk).find(x => x.m === 'PATCH');
  ok('body < 60 KB → PATCH แบบ keepalive:true', ka && ka.keepalive === true);
  c.__eval("document.visibilityState='visible'");

  console.log(' schema ใหม่กว่าบน server → อ่านอย่างเดียว');
  S.rows.find(x => x.slot === 0).schema_v = 99;
  await c.cloudPull(); const np = S.log.filter(x => x.m === 'PATCH').length;
  c.__eval("SAVE.mt=9000; BUS.emit('save','test')");
  eq('cloudPush = readonly · ไม่มี PATCH · status newer', [await c.cloudPush('test'), S.log.filter(x => x.m === 'PATCH').length - np, c.cloudStatus().k], ['readonly', 0, 'newer']);
  S.rows.find(x => x.slot === 0).schema_v = 6;

  console.log(' ออกจากระบบ');
  const out = await c.authSignOut(); const lo = S.log.filter(x => x.p === '/auth/v1/logout').pop();
  ok('POST /auth/v1/logout?scope=local พร้อม Bearer ของผู้ใช้', out.ok && lo && lo.q.scope === 'local' && S.logoutScope === 'local' && lo.h.Authorization.startsWith('Bearer acc_'));
  ok('ลบ runeguard.auth · ตั้ง guestOK · แคชบัญชียังอยู่ · กลับไปเซฟผู้เยี่ยมชม', ls.getItem('runeguard.auth') === null && ls.getItem('runeguard.guestOK') === '1'
    && ls.getItem('runeguard.save.u.' + UID_A) !== null && c.__eval('SAVE.owner') === null && c.__eval('AUTH.state') === 'guest');
  ok('ไม่มีคำขอไหนมีอีเมลใน URL หรือ Authorization = publishable key', S.log.every(x => !x.url.includes('@') && x.h.Authorization !== 'Bearer ' + KEY));
  ok('ทุกคำขอไปที่ ' + SUPA_URL + ' และ REST ไปแค่ /rest/v1/rg_saves', S.log.every(x => x.url.startsWith(SUPA_URL + '/') && (!x.p.startsWith('/rest/') || x.p === '/rest/v1/rg_saves')));

  console.log(' ต่ออายุไม่ได้ → expired (เล่นต่อได้ · owner เดิม)');
  await c.authSignIn(EMAIL, 'password123'); await c.settle();
  S.noRefresh = true; c.__eval('AUTH.s.expires_at=Date.now()-1000');
  ok('authToken = null · state expired · uid เดิม · status expired',
    (await c.authToken()) === null && c.__eval('AUTH.state') === 'expired' && c.__eval('AUTH.s.user.id') === UID_A && c.cloudStatus().k === 'expired');
}
{
  console.log(' ผูกผู้เยี่ยมชม: choose / adopt');
  const S = fakeServer(); const ls = memStorage();
  ls.setItem('runeguard.save.guest', JSON.stringify(guestSave(4)));
  S.rows.push({ user_id: UID_A, slot: 0, rev: 7, schema_v: 6, device: 'd_aaaaaa Windows', summary: { chars: [{ n: 'ผาง', cls: 'swordsman', job: 'knight', lv: 30 }], play: 1, mt: 1, appVer: '' },
    data: { v: 6, sid: 's_acct', created: 1, mt: 50, play: 1, acct: { gold: 7 }, chars: [{ id: 'c_a', name: 'ผาง', cls: 'swordsman', job: 'knight', lv: 30 }] }, updated_at: new Date().toISOString() });
  const c = simCtx({ fetch: S.fetchImpl, storage: ls }); c.loadSaveFor(null);
  await c.authSignIn(EMAIL, 'password123'); await c.settle();
  ok('ผู้เยี่ยมชม Lv 4 + มีแถว → choose', c.cloudConflictInfo().kind === 'choose' && c.cloudStatus().k === 'conflict');
  eq('[ใช้ของบัญชี] → ok', await c.cloudResolve('cloud'), 'ok');
  ok('slot 1 = ผู้เยี่ยมชม (Lv 4) · SAVE = ของบัญชี (Lv 30) · เซฟผู้เยี่ยมชมยังอยู่',
    S.rows.find(x => x.slot === 1).data.chars[0].lv === 4 && c.__eval('SAVE.chars[0].lv') === 30 && c.__eval('SAVE.owner') === UID_A && ls.getItem('runeguard.save.guest') !== null);
  const S3 = fakeServer(); const ls3 = memStorage(); ls3.setItem('runeguard.save.guest', JSON.stringify(guestSave(6)));
  S3.rows.push(JSON.parse(JSON.stringify(S.rows.find(x => x.slot === 0))));
  const c3 = simCtx({ fetch: S3.fetchImpl, storage: ls3 }); c3.loadSaveFor(null);
  await c3.authSignIn(EMAIL, 'password123'); await c3.settle();
  eq('[ใช้ของในเครื่อง] → ok', await c3.cloudResolve('local'), 'ok');
  const r0 = S3.rows.find(x => x.slot === 0), r1 = S3.rows.find(x => x.slot === 1);
  ok('slot 1 = ของบัญชีเดิม (Lv 30) · slot 0 = เซฟในเครื่อง (Lv 6)', r1.data.chars[0].lv === 30 && r0.data.chars[0].lv === 6 && c3.__eval('SAVE.owner') === UID_A);
}
{
  console.log(' redirect ตอน boot (§6.7 · F10)');
  const S = fakeServer(); const ls = memStorage(); const V = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', V2 = 'x'.repeat(43);
  ls.setItem('runeguard.auth.pkce', JSON.stringify({ google: { v: V, ts: Date.now() - 30000 } })); S.codes.set('CODE1', { ch: s256(V), uid: UID_A });
  const c = simCtx({ href: 'http://localhost:8793/?code=CODE1&paid=1#dev', fetch: S.fetchImpl, storage: ls });
  const r = await c.authHandleRedirect();
  eq('?code= + verifier → แลก code → kind google', [r.kind, r.msg], ['google', 'เข้าสู่ระบบเรียบร้อย']);
  ok('ลบ code ออกจาก URL ก่อนยิงคำขอแรก · ?paid=1 และ #dev ยังอยู่ · history.state เดิม', c.T.order[0] === 'replace /?paid=1#dev' && c.T.order[1] === 'fetch /auth/v1/token' && c.T.replaced[0][0].rg === 'root', c.T.order.join(' | '));
  ok('pkce ช่อง google ถูกลบ · session = uid A', ls.getItem('runeguard.auth.pkce') === null && c.__eval('AUTH.s.user.id') === UID_A);

  const S2 = fakeServer(), ls2 = memStorage();   // two flows pending: sign-up (newer) and reset (older) · the link is the reset's
  ls2.setItem('runeguard.auth.pkce', JSON.stringify({ recovery: { v: V, ts: Date.now() - 60000 }, signup: { v: V2, ts: Date.now() - 1000 } })); S2.codes.set('CODER', { ch: s256(V), uid: UID_A });
  const c2 = simCtx({ href: 'http://localhost:8793/?code=CODER', fetch: S2.fetchImpl, storage: ls2 });
  const r2 = await c2.authHandleRedirect();
  ok('สองฟลว์ค้าง: ลอง verifier ของ signup ก่อน (ผิด) แล้วของ recovery → สำเร็จ · kind recovery · ช่อง signup ยังอยู่',
    r2.kind === 'recovery' && S2.log.filter(x => x.p === '/auth/v1/token').length === 2 && JSON.stringify(Object.keys(JSON.parse(ls2.getItem('runeguard.auth.pkce')))) === '["signup"]', [r2, S2.log.map(x => x.p)]);
  const S3 = fakeServer(); S3.codeErr = 'flow_state_expired'; const ls3 = memStorage(); ls3.setItem('runeguard.auth.pkce', JSON.stringify({ signup: { v: V2, ts: Date.now() - 20 * 60000 } }));
  const r3 = await simCtx({ href: 'http://localhost:8793/?code=C3', fetch: S3.fetchImpl, storage: ls3 }).authHandleRedirect();
  eq('ยืนยันอีเมลหลัง 20 นาที (GoTrue: flow หมดอายุ) → "ยืนยันอีเมลสำเร็จ · เข้าสู่ระบบด้วยรหัสผ่านได้เลย" (ไม่ใช่ "ลิงก์หมดอายุ")', [r3.kind, r3.msg], ['nover', 'ยืนยันอีเมลสำเร็จ · เข้าสู่ระบบด้วยรหัสผ่านได้เลย']);
  const c4 = simCtx({ href: 'http://localhost:8793/?code=CODE2', fetch: fakeServer().fetchImpl });
  const r4 = await c4.authHandleRedirect();
  ok('?code= แต่ไม่มี verifier → nover · ไม่ยิงคำขอเลย · URL สะอาด', r4.kind === 'nover' && THAI.test(r4.msg) && !c4.T.order.some(x => x.startsWith('fetch')) && c4.location.href === 'http://localhost:8793/');
  const S5 = fakeServer(); S5.access.set('acc_imp', UID_A); S5.refresh.set('ref_imp', UID_A);
  const ls5 = memStorage(); ls5.setItem('runeguard.auth.resent', String(Date.now() - 60000));   // this browser asked for the e-mail itself (authResend)
  const c5 = simCtx({ href: 'http://localhost:8793/#access_token=acc_imp&refresh_token=ref_imp&expires_in=3600&token_type=bearer&type=signup', fetch: S5.fetchImpl, storage: ls5 });
  const r5 = await c5.authHandleRedirect();
  ok('#access_token (implicit) → ล้าง hash → GET /auth/v1/user ก่อน → รับ session', r5.kind === 'signup' && c5.T.order[0] === 'replace /' && S5.log[0].p === '/auth/v1/user' && c5.__eval('AUTH.state') === 'in' && !c5.location.href.includes('token'));
  const ls6 = memStorage(); ls6.setItem('runeguard.auth.resent', String(Date.now()));
  const c6 = simCtx({ href: 'http://localhost:8793/#access_token=forged&refresh_token=x&type=signup', fetch: fakeServer().fetchImpl, storage: ls6 });
  const r6 = await c6.authHandleRedirect();
  ok('token ปลอมใน hash → GoTrue 401 → ไม่รับ session', r6.kind === 'error' && c6.__eval('AUTH.s') === null && c6.ls.getItem('runeguard.auth') === null);
  { const S8 = fakeServer(); S8.access.set('acc_evil', UID_A); S8.refresh.set('ref_evil', UID_A);   // login CSRF: a link made by someone else (no resend mark here)
    const c8 = simCtx({ href: 'http://localhost:8793/#access_token=acc_evil&refresh_token=ref_evil&expires_in=3600&type=signup', fetch: S8.fetchImpl });
    const r8 = await c8.authHandleRedirect();
    ok('ลิงก์ #access_token ที่เครื่องนี้ไม่ได้ขอเอง (login CSRF) → nover · ไม่ถาม GoTrue · ไม่รับ session · URL สะอาด', r8.kind === 'nover' && S8.log.length === 0 && c8.__eval('AUTH.s') === null && !c8.location.href.includes('token'), r8); }
  const c7 = simCtx({ href: 'http://localhost:8793/?error=access_denied&error_code=otp_expired&error_description=%3Cb%3ECall%20555%3C%2Fb%3E#dev', fetch: fakeServer().fetchImpl });
  const r7 = await c7.authHandleRedirect();
  ok('?error= → ข้อความไทยจาก code (ไม่เอา error_description) · #dev ยังอยู่', r7.kind === 'error' && r7.msg === 'ลิงก์หมดอายุหรือใช้ไปแล้ว ขอลิงก์ใหม่' && c7.location.href === 'http://localhost:8793/#dev');
  const c8 = simCtx({ href: 'http://localhost:8793/?code=Z#dev', fetch: fakeServer().fetchImpl });
  ok('มี ?code= ใน URL → authWantsScreen false (ไม่โชว์หน้าล็อกอินทับระหว่างแลก code)', c8.authWantsScreen() === false);
  const c9 = simCtx({ href: 'http://localhost:8793/#dev', fetch: fakeServer().fetchImpl });
  ok('URL ไม่มีอะไรของ auth และไม่ได้ล็อกอิน → null · ไม่แตะ URL · ไม่ยิงอะไร', (await c9.authHandleRedirect()) === null && c9.T.replaced.length === 0 && !c9.T.order.some(x => x.startsWith('fetch')));

  console.log(' สมัคร / ลืมรหัส: ข้อความกลางเสมอ');
  const S10 = fakeServer(); const c10 = simCtx({ fetch: S10.fetchImpl });
  const su = await c10.authSignUp(EMAIL, 'password123'), rc = await c10.authRecover(EMAIL);
  const N = 'ถ้าอีเมลนี้ใช้ได้ เราส่งลิงก์ไปแล้ว ตรวจกล่องจดหมาย (รวมถึงสแปม) · ถ้ามีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ';
  ok('สมัคร (identities ว่าง = มีบัญชีแล้ว) และลืมรหัส ได้ข้อความเดียวกัน', su.ok && rc.ok && su.msg === N && rc.msg === N);
  const sp = S10.log.find(x => x.p === '/auth/v1/signup');
  ok('สมัคร/ลืมรหัส ส่ง code_challenge (s256) · redirect_to = origin + "/" · เก็บ pkce สองช่อง', sp.body.code_challenge_method === 's256' && sp.q.redirect_to === 'http://localhost:8793/'
    && JSON.stringify(Object.keys(JSON.parse(c10.ls.getItem('runeguard.auth.pkce'))).sort()) === '["recovery","signup"]');
  const gi = simCtx({ fetch: fakeServer().fetchImpl }); await gi.authGoogle();
  ok('authGoogle → location.assign /authorize?provider=google … s256 · pkce ช่อง google', gi.location.assigned.length === 1 && gi.location.assigned[0].startsWith(SUPA_URL + '/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A8793%2F&code_challenge=')
    && !!JSON.parse(gi.ls.getItem('runeguard.auth.pkce')).google);
}

/* ================= ง. SQL = ข้อความในเอกสาร ================= */
console.log('\nง. sql/ ตรงกับเอกสาร');
{
  const doc = readFileSync(join(ROOT, 'docs', 'DESIGN.md'), 'utf8').replace(/\r\n/g, '\n');
  const block = (after, nth = 0) => { let i = doc.indexOf(after); for (let k = 0; k <= nth; k++) i = doc.indexOf('```sql\n', i) + 7; return doc.slice(i, doc.indexOf('```', i)); };
  const want = { 'rg_001_init.sql': block('### 6.4'), 'rg_001_down.sql': block('### 6.4', 1), 'test_rls_two_users.sql': block('### 6.5'), 'preflight_readonly.sql': block('### 6.6') };
  const sqlOf = f => { try { return readFileSync(join(ROOT, 'sql', f), 'utf8').replace(/\r\n/g, '\n'); } catch (e) { return '(ไม่มีไฟล์)'; } };
  for (const [f, w] of Object.entries(want)) { const got = sqlOf(f); ok(`sql/${f} = ข้อความใน DESIGN (${w.length} ตัวอักษร)`, got === w, got === '(ไม่มีไฟล์)' ? got : 'ต่างกัน'); }
  const prop = readFileSync(join(ROOT, 'docs', 'PROPOSAL-shop.md'), 'utf8').replace(/\r\n/g, '\n'), up2 = sqlOf('rg_002_purchases.sql');
  ok('sql/rg_002_purchases.sql = บล็อก SQL ใน PROPOSAL-shop.md §5 ทุกตัวอักษร (ข้อความที่เจ้าของจะอนุมัติ)', prop.includes('```sql\n' + up2 + '```'));
  for (const [f, s] of [['rg_001_init.sql', want['rg_001_init.sql']], ['rg_002_purchases.sql', up2]]) {
    const t = s.replace(/--[^\n]*/g, '');
    ok(`${f}: ไม่มี trigger บน auth.users · ไม่มี security definer · revoke ก่อน grant · แตะเฉพาะ rg_*`,
      !/on auth\.users/i.test(t) && !/security definer/i.test(t) && t.indexOf('revoke all on table') < t.indexOf('grant select')
      && [...t.matchAll(/\b(?:create|drop)\s+(?:table|sequence|function|index|policy|trigger)\s+(?:if exists\s+)?(?:public\.)?(\w+)/gi), ...t.matchAll(/\b(?:on|table|sequence|function)\s+public\.(\w+)/gi)].map(m => m[1]).every(n => n.startsWith('rg_')),
      [...t.matchAll(/\b(?:on|table|sequence|function)\s+public\.(\w+)/gi)].map(m => m[1]));
  }
  const t2 = up2.replace(/--[^\n]*/g, '');
  ok('rg_002: ผู้เล่นได้ SELECT อย่างเดียว · service_role ได้ select + insert (ไม่ update/delete) · RLS เปิด · policy select ของเจ้าของ',
    /grant select on table public\.rg_purchases to authenticated;/.test(t2) && /grant select, insert on table public\.rg_purchases to service_role;/.test(t2)
    && !/grant[^;]*(update|delete|all)[^;]*rg_purchases/i.test(t2) && /enable row level security/.test(t2) && /using \(user_id = \(select auth\.uid\(\)\)\)/.test(t2) && (t2.match(/create policy/g) || []).length === 1);
  const down2 = sqlOf('rg_002_down.sql'), test2 = sqlOf('test_rls_rg_002.sql');
  ok('rg_002_down: lock_timeout + drop table rg_purchases เท่านั้น', /set local lock_timeout = '2s';/.test(down2) && (down2.replace(/--[^\n]*/g, '').match(/drop /g) || []).length === 1 && /drop table if exists public\.rg_purchases;/.test(down2));
  ok('test_rls_rg_002: จบด้วย ALL_PASS + rollback · มีกรณีสองผู้ใช้ / anon / ซ้ำ session', /raise exception 'ALL_PASS'; end \$\$;\nrollback;\n$/.test(test2) && /FAIL A reads B/.test(test2) && /FAIL anon can read/.test(test2) && /FAIL same session recorded twice/.test(test2));
}

/* ================= จ. ชั้นเซฟจริง (40/41 · เซฟ v6) ================= */
console.log('\nจ. ชั้นเซฟจริง (เซฟ v6) + รายการซื้อ');
const REAL = ['04', '05', '06', '07', '08', '15', '16', '24', '25', '26', '27', '28', '29', '30', '31', '33', '34', '40', '41', '42', '43', '44'];
const device = (S, ls, href) => { const c = simCtx({ fetch: S.fetchImpl, storage: ls, files: REAL, light: false, href }); return c; };
const X = (c, e) => c.__eval(e);
async function player(c, name, cls, lv) {   // a real character through 41 (createChar) · levelled with the dev hook (svChar keeps it valid)
  X(c, `createChar(${JSON.stringify(name)},${JSON.stringify(cls)})`); X(c, `DEV.profile.char({lv:${lv}})`);
}
{
  const S = fakeServer(), ls1 = memStorage(), ls2 = memStorage();
  const d1 = device(S, ls1);
  d1.authWantsScreen(); X(d1, 'loadSaveFor(authBootOwner())');
  await player(d1, 'ลูน่า', 'mage', 12);
  const guestWb = X(d1, 'SAVE.wb');
  ok('ผู้เยี่ยมชม: เซฟจริงเวอร์ชันล่าสุด (SCHEMA_V) · ตัวละคร Lv 12', X(d1, 'SAVE.v') === X(d1, 'SCHEMA_V') && X(d1, 'SAVE.chars[0].lv') === 12 && X(d1, 'SAVE.owner') === null);
  await d1.authSignIn(EMAIL, 'password123'); await d1.settle();
  ok('ล็อกอินครั้งแรกบนเครื่องนี้ + ไม่มีแถว → askMove', d1.cloudConflictInfo() && d1.cloudConflictInfo().kind === 'askMove');
  eq('[ย้าย] → ok', await d1.cloudResolve('local'), 'ok');
  const r0 = S.rows.find(x => x.slot === 0);
  ok('F12: เซฟบัญชีได้สายเซฟใหม่ (wb ≠ ของผู้เยี่ยมชม) · owner = uid · ผ่าน migrate/validate · schema_v ล่าสุดบน server', X(d1, 'SAVE.owner') === UID_A && X(d1, 'SAVE.wb') !== guestWb
    && X(d1, 'svlState().from') === 'cloud' && r0 && r0.schema_v === X(d1, 'SCHEMA_V') && r0.data.v === X(d1, 'SCHEMA_V') && r0.data.wb === X(d1, 'SAVE.wb') && !('owner' in r0.data), [X(d1, 'SAVE.wb'), guestWb, r0 && r0.schema_v]);
  ok('summary บน server: appVer ของแอป · ไม่มีอีเมล', r0.summary.appVer === X(d1, 'SV_APP') && !JSON.stringify(r0).includes('@'));
  ok('เซฟผู้เยี่ยมชมยังอยู่ไม่ถูกแตะ', JSON.parse(ls1.getItem('runeguard.save.guest')).wb === guestWb);

  console.log(' F2: เขียนถึง server แล้วแต่คำตอบหาย → ไม่ใช่ "ชนกัน"');
  S.hook = e => { if (e.m === 'PATCH') { S.hook = null; S.fetchImpl(e.url, { method: 'PATCH', headers: e.h, body: JSON.stringify(e.body) }); return Promise.reject(new TypeError('network')); } return null; };
  X(d1, "curChar().xp=7; saveNow('t')");
  const lost = await d1.cloudPush('t'), revAfterLost = S.rows.find(x => x.slot === 0).rev;
  ok('PATCH ไปถึง server (rev ขยับ) แต่ฝั่งเกมไม่ได้คำตอบ → offline', lost === 'offline' && revAfterLost === r0.rev, [lost, revAfterLost]);
  X(d1, "curChar().xp=9; saveNow('t')");
  const nPatch = S.log.filter(x => x.m === 'PATCH').length, ff = await d1.cloudPush('t');
  ok('ส่งครั้งถัดไป: CAS ได้ [] → แถวเป็นสำเนาเก่าของสายเดียวกัน → เลื่อน baseRev แล้วส่ง → ok (ไม่ขึ้นหน้าเลือก · slot 1 ว่าง)',
    ff === 'ok' && !d1.cloudConflictInfo() && !S.rows.some(x => x.slot === 1) && S.rows.find(x => x.slot === 0).data.chars[0].xp === 9 && S.log.filter(x => x.m === 'PATCH').length - nPatch === 2, [ff, d1.cloudConflictInfo()]);

  console.log(' F8 + adopt บนเครื่องที่สอง');
  const d2 = device(S, ls2);
  d2.authWantsScreen(); X(d2, 'loadSaveFor(authBootOwner())');
  ok('F8: เซฟว่างที่ไม่เคยซิงก์ไม่นับว่าค้าง', X(d2, 'isTrivialSave(SAVE)') === true);
  await d2.authSignIn(EMAIL, 'password123'); await d2.settle();
  ok('เครื่องสอง (ผู้เยี่ยมชมว่าง) → รับของบัญชีทันที ไม่ถาม · ตัวละครเดียวกัน · สายเซฟของเครื่องนี้เอง', !d2.cloudConflictInfo() && X(d2, 'SAVE.owner') === UID_A && X(d2, 'SAVE.chars[0].name') === 'ลูน่า'
    && X(d2, 'SAVE.chars[0].lv') === 12 && X(d2, 'SAVE.wb') !== X(d1, 'SAVE.wb') && d2.T.ev.includes('sync:adopt'), [d2.cloudConflictInfo(), X(d2, 'SAVE.wb')]);
  ok('รับแล้ว: dirty false · baseRev = rev บน server', JSON.parse(ls2.getItem('runeguard.cloud.u.' + UID_A)).dirty === false && JSON.parse(ls2.getItem('runeguard.cloud.u.' + UID_A)).baseRev === S.rows.find(x => x.slot === 0).rev);
  X(d2, "curChar().xp=20; saveNow('t')"); eq('เครื่องสองส่ง → ok', await d2.cloudPush('t'), 'ok');
  X(d1, "curChar().xp=30; saveNow('t')");
  eq('เครื่องหนึ่ง (ค้าง · คนละสายเซฟ) ส่ง → conflict จริง', await d1.cloudPush('t'), 'conflict');

  console.log(' F7: กู้ข้อมูลสำรองตอนยังมีของที่ยังไม่ส่ง');
  eq('เลือก "บนคลาวด์" (ของเครื่องหนึ่ง xp 30 → slot 1)', await d1.cloudResolve('cloud'), 'ok');
  X(d1, "curChar().xp=40; saveNow('t')");   // progress made after that, not pushed yet
  eq('กู้คืนข้อมูลสำรอง → ok', await d1.cloudRestoreBackup(), 'ok');
  ok('slot 0 = ข้อมูลสำรอง (xp 30) · slot 1 = ของในเครื่องที่ยังไม่ส่ง (xp 40) ไม่หาย · SAVE = xp 30', S.rows.find(x => x.slot === 0).data.chars[0].xp === 30
    && S.rows.find(x => x.slot === 1).data.chars[0].xp === 40 && X(d1, 'curChar().xp') === 30, [S.rows.map(x => [x.slot, x.data.chars[0].xp])]);

  console.log(' F6: ลบข้อมูลคลาวด์ที่เครื่องหนึ่ง → เครื่องสองไม่สร้างกลับเอง');
  eq('เครื่องหนึ่ง: ลบข้อมูลบนคลาวด์ → ok', await d1.cloudWipe(), 'ok');
  ok('แถวของผู้เล่นหายหมด (สองช่อง)', !S.rows.some(x => x.user_id === UID_A));
  X(d2, "curChar().xp=50; saveNow('t')"); const nPost = S.log.filter(x => x.m === 'POST' && x.p === '/rest/v1/rg_saves').length;
  await d2.cloudPull(); await d2.cloudPush('t');
  ok('เครื่องสอง: ดึง/ส่งแล้วไม่ POST สร้างใหม่ · status wiped (แตะเพื่ออัปโหลด)', S.log.filter(x => x.m === 'POST' && x.p === '/rest/v1/rg_saves').length === nPost && !S.rows.some(x => x.user_id === UID_A) && d2.cloudStatus().k === 'wiped', d2.cloudStatus());
  eq('ซิงก์ตอนนี้ (กดเอง) → อัปโหลดอีกครั้ง → ok', await d2.cloudSyncNow(), 'ok');
  ok('แถว slot 0 กลับมา (xp 50)', S.rows.some(x => x.user_id === UID_A && x.slot === 0 && x.data.chars[0].xp === 50));

  console.log(' F4: server ปฏิเสธ (400) → สถานะบอก · ไม่ลองซ้ำไม่จบ');
  S.hook = e => (e.m === 'PATCH' ? new Response(JSON.stringify({ code: 'PGRST204', message: 'x' }), { status: 400 }) : null);
  X(d2, "curChar().xp=51; saveNow('t')"); const tm0 = d2.T.timers.length;
  eq('cloudPush → error', await d2.cloudPush('t'), 'error');
  ok('cloudStatus = err (ไม่ใช่ "ซิงก์แล้ว")', d2.cloudStatus().k === 'err' && THAI.test(d2.cloudStatus().text), d2.cloudStatus());
  for (let i = 0; i < 4; i++) await d2.cloudPush('t');
  const retries = d2.T.timers.slice(tm0).filter(ms => [5000, 15000, 60000, 300000].includes(ms)).length;
  ok('ตั้งเวลาลองซ้ำไม่เกิน 3 ครั้ง', retries <= 3, d2.T.timers.slice(tm0));
  S.hook = null; eq('server กลับมาปกติ → ซิงก์ตอนนี้ → ok · สถานะกลับเป็นซิงก์แล้ว', [await d2.cloudSyncNow(), d2.cloudStatus().k], ['ok', 'ok']);

  console.log(' F3: บัญชีถูกลบแต่ token ยังใช้ได้ (409 23503) → หยุด');
  const d3 = device(S, memStorage()); d3.authWantsScreen(); X(d3, 'loadSaveFor(null)'); await player(d3, 'มิวมิว', 'thief', 5);
  S.hook = e => (e.m === 'POST' && e.p === '/rest/v1/rg_saves' ? new Response(JSON.stringify({ code: '23503' }), { status: 409 }) : e.m === 'GET' && e.p === '/rest/v1/rg_saves' ? new Response('[]', { status: 200 }) : null);
  await d3.authSignIn('mew@example.com', 'password456'); await d3.settle();
  await d3.cloudResolve('local'); const nLog = S.log.length;
  ok('status dead · ไม่มีคำขอเพิ่มจาก push/pull', d3.cloudStatus().k === 'dead' && (await d3.cloudPush('t')) === 'offline' && (await d3.cloudPull()) === 'none' && S.log.length === nLog, [d3.cloudStatus(), S.log.length - nLog]);
  S.hook = null;

  console.log(' F1: เปิดแอปตอนมี session ค้าง → เล่นเซฟบัญชีทันที');
  const d1b = device(S, ls1);
  ok('authBootOwner = uid (มีแคชบัญชี) → loadSaveFor(uid)', X(d1b, 'authBootOwner()') === UID_A && X(d1b, 'loadSaveFor(authBootOwner()).owner') === UID_A);
  const n0 = S.log.length; await d1b.authHandleRedirect(); await d1b.settle();
  ok('authHandleRedirect (URL ว่าง) → ดึงหัวจาก server (cloudPull) ด้วยเซฟบัญชี', S.log.slice(n0).some(x => x.m === 'GET' && x.p === '/rest/v1/rg_saves') && X(d1b, 'SAVE.owner') === UID_A);

  console.log(' รายการซื้อ (rg_purchases) → ENT · clamp รูนที่แก้เอง');
  const t0 = Date.parse('2026-11-01T00:00:00Z');
  S.purchases.push({ user_id: UID_A, session_id: 'cs_test_r1', product: 'rune200', runes: 200, days: 0, created_at: new Date(t0).toISOString() },
    { user_id: UID_A, session_id: 'cs_test_s1', product: 'sup30', runes: 0, days: 30, created_at: new Date(t0 + 864e5).toISOString() },
    { user_id: UID_A, session_id: 'cs_test_s2', product: 'sup30', runes: 0, days: 30, created_at: new Date(t0 + 10 * 864e5).toISOString() },
    { user_id: UID_B, session_id: 'cs_test_b', product: 'rune2500', runes: 2500, days: 0, created_at: new Date(t0).toISOString() });
  X(d1b, 'curChar().rb=250; SAVE.acct.ru=500; curChar().tr={}; saveNow("cheat")');   // a hand-edited save: more than was ever bought
  const got = await X(d1b, 'entRefresh()'); await tick(5);
  const pr = S.log.filter(x => x.p === '/rest/v1/rg_purchases').pop();
  ok('GET /rest/v1/rg_purchases?select=…&user_id=eq.<uid> ด้วย Bearer ของผู้เล่น + Accept-Profile', got === true && pr.q.user_id === 'eq.' + UID_A && pr.h.Authorization.startsWith('Bearer acc_') && pr.h['Accept-Profile'] === 'public' && pr.q.select === 'session_id,product,runes,days,created_at');
  ok('ENT จาก server: รูน 200 (ไม่ใช่ของ B) · ผู้สนับสนุนต่อจากวันหมดเดิม = ซื้อครั้งแรก + 60 วัน', X(d1b, 'ENTS.runes') === 200 && X(d1b, 'ENTS.sup') === t0 + 864e5 + 60 * 864e5 && X(d1b, 'entGet().src') === 'server', [X(d1b, 'ENTS.runes'), X(d1b, 'ENTS.sup')]);
  ok('clamp: acct.ru 500 → 200 · ch.rb 250 → 200 · บันทึกลงเครื่องแล้ว · กระเป๋า = 0', X(d1b, 'SAVE.acct.ru') === 200 && X(d1b, 'curChar().rb') === 200 && JSON.parse(ls1.getItem('runeguard.save.u.' + UID_A)).acct.ru === 200 && X(d1b, 'shopWallet()') === 0,
    [X(d1b, 'SAVE.acct.ru'), X(d1b, 'curChar().rb')]);
  ok('มีข้อความแจ้งปรับรูน (ไทย)', d1b.T.toasts.some(([t]) => /ปรับรูนที่ซื้อ/.test(t)), d1b.T.toasts);
  X(d1b, 'SAVE.acct.ru=120; curChar().rb=100; saveNow("ok")'); X(d1b, 'shopClampLater()'); await tick(5);
  ok('ซื้อ 200 ย้ายเข้าตัวละคร 100 (ru 120) → ไม่แตะ · กระเป๋า 80', X(d1b, 'SAVE.acct.ru') === 120 && X(d1b, 'curChar().rb') === 100 && X(d1b, 'shopWallet()') === 80);
  const out = await d1b.authSignOut();
  ok('ออกจากระบบ → ENT ล้าง (ไม่ใช่ผู้สนับสนุนอีก) · เซฟผู้เยี่ยมชม', out.ok && X(d1b, 'ENTS.uid') === '' && X(d1b, 'isSupporter()') === false && X(d1b, 'SAVE.owner') === null);
  const nP = S.log.filter(x => x.p === '/rest/v1/rg_purchases').length; await X(d1b, 'entRefresh()');
  ok('ผู้เยี่ยมชม: entRefresh ไม่ยิงอะไร', S.log.filter(x => x.p === '/rest/v1/rg_purchases').length === nP);
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
