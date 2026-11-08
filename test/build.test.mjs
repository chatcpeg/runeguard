// test/build.test.mjs (lane A) — every lint rule L1–L11 of build.mjs must fire on a bad example, with the right Thai
// message, and stay quiet on the real src/. Also: end-to-end runs of `node build.mjs` on a temp copy, and test/_vm.mjs.
//   node test/build.test.mjs
import { readSrc, assemble, lintAll, topDecls, SIZE_WARN, SIZE_FAIL } from '../build.mjs';
import { loadSrc } from './_vm.mjs';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, writeFileSync, rmSync, readFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const base = readSrc(ROOT);
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info ? '\n      ' + info : '')); } };
const clone = s => ({ ...s, JS: s.JS.map(x => x.slice()), CSS: s.CSS.map(x => x.slice()), MARK: s.MARK.map(x => x.slice()), stray: s.stray.slice() });
const sortIn = a => a.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
function lint(mod) { const s = clone(base); mod(s); return lintAll(s, assemble(s)); }
const addJs = (s, f, t) => sortIn(s.JS).push(['js/' + f, t]) && sortIn(s.JS);
const addCss = (s, f, t) => { s.CSS.push(['css/' + f, t]); sortIn(s.CSS); };
const addMark = (s, f, t) => { s.MARK.push(['markup/' + f, t]); sortIn(s.MARK); };
const appendJs = (s, f, t) => { const e = s.JS.find(x => x[0] === 'js/' + f); if (!e) throw new Error('no ' + f); e[1] += t; };
const has = (r, rule, sub) => r.errors.some(e => e.rule === rule && e.msg.includes(sub));
const show = r => r.errors.map(e => e.rule + ' ' + e.msg).join(' | ') || '(ไม่มี error)';
const fires = (name, r, rule, sub) => ok(`${rule} จับได้: ${name}`, has(r, rule, sub), 'ได้: ' + show(r));
const quiet = (name, r, rule, sub = '') => ok(`${rule} ไม่จับ: ${name}`, !r.errors.some(e => e.rule === rule && e.msg.includes(sub)), 'ได้: ' + show(r));

console.log('src/ จริง');
{
  const r = lintAll(base, assemble(base));
  ok('src/ จริงผ่าน lint ครบ (0 error)', r.errors.length === 0, show(r));
  const names = new Map(); let n = 0;
  for (const [f, t] of base.JS) for (const d of topDecls(t)) { n++; names.set(d.name, (names.get(d.name) || 0) + 1); }
  ok(`L3 scanner อ่าน src/ ได้ ${n} ชื่อ ไม่มีชื่อซ้ำ`, n > 300 && [...names.values()].every(v => v === 1));
  ok('L3 scanner เห็นชื่อสำคัญ (TAU, PI, W, H, heroSil, SPR_SS, MODES, BAL, boot)', ['TAU', 'PI', 'W', 'H', 'heroSil', 'SPR_SS', 'MODES', 'BAL', 'boot'].every(k => names.has(k)));
}

console.log('L1 · <script> เดียว / </style> แรก');
fires('</style> ใน CSS', lint(s => addCss(s, '70-x.css', 'a{}\n</style>\n')), 'L1', '</style>');
fires('"</script>" ใน JS', lint(s => addJs(s, '97-x.js', "const tagHolder='</script>';\n")), 'L1', 'มี <script> มากกว่าหนึ่ง');
fires('<script> ใน markup', lint(s => addMark(s, '70-x.html', '<script>alert(1)</script>\n')), 'L1', 'มี <script> มากกว่าหนึ่ง');

console.log('L2 · ไวยากรณ์ของแต่ละไฟล์');
fires('ไฟล์ parse ไม่ได้', lint(s => addJs(s, '97-bad.js', 'const a = ;\n')), 'L2', 'ไวยากรณ์ผิดที่ไฟล์ src/js/97-bad.js');
fires('ไฟล์ใช้ with (strict mode ห้าม)', lint(s => addJs(s, '97-bad.js', 'with({}){ }\n')), 'L2', 'ไวยากรณ์ผิดที่ไฟล์ src/js/97-bad.js');

console.log('L3 · ประกาศ top-level ซ้ำข้ามไฟล์');
const two = (a, b) => lint(s => { addJs(s, '97-a.js', a); addJs(s, '98-b.js', b); });
fires('function × function', two('function dupA(){}\n', 'function dupA(){ return 1; }\n'), 'L3', 'ประกาศซ้ำ dupA: src/js/97-a.js:1 และ src/js/98-b.js:1');
fires('var × function', two('var dupB = 1;\n', 'function dupB(){}\n'), 'L3', 'ประกาศซ้ำ dupB');
fires('let a,b × const b', two('let la = 1, dupC = f(1, 2);\nfunction f(){}\n', 'const dupC = 3;\n'), 'L3', 'ประกาศซ้ำ dupC');
{
  const r = two('const {dx1, y: dupD} = {dx1: 1, y: 2};\nconst [dupE, , ...dupF] = [1, 2, 3];\n', 'function dupD(){}\nfunction dupF(){}\n');
  fires('destructuring {x, y:z} × function', r, 'L3', 'ประกาศซ้ำ dupD');
  fires('destructuring [a, , ...b] × function', r, 'L3', 'ประกาศซ้ำ dupF');
}
fires('class × let', two('class DupG {}\n', 'let DupG = 1;\n'), 'L3', 'ประกาศซ้ำ DupG');
{
  const r = two('const tplHolder = `function dupH(){} const dupH = ${ (() => { const dupH = 1; return dupH; })() } ${`nested ${"function dupH(){}"}`}`;\n'
    + '// function dupH(){}\n/* const dupH = 2 */\nconst reHolder = /function dupH\\(\\)\\/[}{]/g;\nconst strHolder = \'const dupH = 1\', str2 = "let dupH";\n', 'function dupH(){}\n');
  quiet('ชื่อซ้ำที่อยู่ใน template string / comment / regex / string', r, 'L3', 'dupH');
  ok('ไฟล์ตัวอย่าง template ไม่มี error อื่น', r.errors.length === 0, show(r));
}
quiet('const ใน block (depth > 0)', two('if (true) { const dupI = 1; }\nfor (const dupI of []) {}\n', 'function dupI(){}\n'), 'L3', 'dupI');
quiet('function expression ที่มีชื่อ', two('const fx = function dupJ(){};\nconst o = { dupJ(){} };\n', 'function dupJ(){}\n'), 'L3', 'dupJ');
fires('ประกาศที่จบด้วยการขึ้นบรรทัด (ไม่มี ;)', two('const asiA = 1\nconst dupK = 2\n', 'function dupK(){}\n'), 'L3', 'ประกาศซ้ำ dupK');
fires('async function / function* × const', two('async function dupL(){}\nfunction* dupM(){}\n', 'const dupL = 1, dupM = 2;\n'), 'L3', 'ประกาศซ้ำ dupM');
fires('ชนกับชื่อใน core (เช่น startRun)', lint(s => addJs(s, '97-a.js', 'function startRun(){}\n')), 'L3', 'ประกาศซ้ำ startRun: src/js/16-run-spawn.js');

console.log('L4 · คำต้องห้ามด้าน IP');
fires('ละติน ไม่สนตัวพิมพ์ ใน CSS', lint(s => addCss(s, '70-x.css', '/* Katar style */\n')), 'L4', 'IP: พบคำต้องห้าม "katar" ใน src/css/70-x.css');
fires('ไทย ใน markup', lint(s => addMark(s, '70-x.html', '<p>โพริ่ง</p>\n')), 'L4', 'IP: พบคำต้องห้าม "โพริ่ง"');
fires('ละติน ใน JS string', lint(s => addJs(s, '97-x.js', "const zoneHolder='RAGNAROK online';\n")), 'L4', '"ragnarok"');
fires('คำสองคำ "zombie waves"', lint(s => addJs(s, '97-x.js', "// Zombie Waves clone\n")), 'L4', '"zombie waves"');

console.log('L5 · ความลับ');
fires('sb_secret_', lint(s => addJs(s, '97-x.js', "const k1='sb_secret_abc';\n")), 'L5', 'พบความลับใน src/js/97-x.js');
fires('JWT (eyJhbGci…)', lint(s => addJs(s, '97-x.js', "const k2='eyJhbGciOiJIUzI1NiJ9.x.y';\n")), 'L5', 'พบความลับ');
fires('service_role', lint(s => appendJs(s, '43-auth.js', "// service_role\n")), 'L5', 'พบความลับใน src/js/43-auth.js');
fires('-----BEGIN', lint(s => addCss(s, '70-x.css', '/* -----BEGIN PRIVATE KEY----- */\n')), 'L5', 'พบความลับ');

console.log('L6 · Supabase');
fires('URL Supabase นอก 43-auth.js', lint(s => addJs(s, '97-x.js', "const u2='https://edmwctmnasggdtdbcxkb.supabase.co';\n")), 'L6', 'URL หรือคีย์ของ Supabase อยู่ได้เฉพาะใน 43-auth.js');
fires('publishable key นอก 43-auth.js', lint(s => addJs(s, '97-x.js', "const k3='sb_publishable_x';\n")), 'L6', '43-auth.js');
fires('/rest/v1/ ที่ไม่ใช่ rg_', lint(s => appendJs(s, '43-auth.js', "const p1='/rest/v1/profiles';\n")), 'L6', 'REST path ไม่อนุญาต');
fires('logout ไม่มี scope=local', lint(s => appendJs(s, '43-auth.js', "const p2='/auth/v1/logout';\n")), 'L6', 'logout ต้อง scope=local');
quiet('rg_ และ logout?scope=local ใน 43-auth.js', lint(s => appendJs(s, '43-auth.js', "const p3='/rest/v1/rg_saves', p4='/auth/v1/logout?scope=local';\n")), 'L6');

console.log('L7 · ไฟล์ pure ไม่แตะ DOM');
fires('window ใน 30-balance.js', lint(s => appendJs(s, '30-balance.js', 'const wHolder = window.innerWidth;\n')), 'L7', 'ไฟล์ pure แตะ DOM: src/js/30-balance.js:');
fires('ctx. ใน 60-zones-data.js', lint(s => appendJs(s, '60-zones-data.js', 'function paintZ(){ ctx.fillRect(0,0,1,1); }\n')), 'L7', 'src/js/60-zones-data.js');
fires('localStorage ใน 42-progression.js', lint(s => appendJs(s, '42-progression.js', "function saveZ(){ localStorage.setItem('a','b'); }\n")), 'L7', '42-progression.js');
quiet('คำใน comment และ property (obj.location)', lint(s => appendJs(s, '31-jobs-data.js', '// never touch document here\nconst locHolder = {location: 1}.location;\n')), 'L7');
fires('window ในเงื่อนไข ? : ของไฟล์ pure', lint(s => appendJs(s, '30-balance.js', 'const t7 = 1 ? window : null;\n')), 'L7', '30-balance.js');
fires('globalThis.localStorage ในไฟล์ pure', lint(s => appendJs(s, '34-items-logic.js', 'const t8 = globalThis.localStorage;\n')), 'L7', '34-items-logic.js');
fires('self.document ในไฟล์ pure', lint(s => appendJs(s, '66-boss-data.js', 'const t9 = self.document;\n')), 'L7', '66-boss-data.js');
quiet('key ของ object หลายตัว ({a:1, location:2})', lint(s => appendJs(s, '33-items-data.js', 'const t10 = {a: 1, location: 2, window : 3};\n')), 'L7');
quiet('ไฟล์ที่ไม่ pure ใช้ document ได้', lint(s => appendJs(s, '50-ui-shell.js', "function q1(){ return document.body; }\n")), 'L7');

console.log('L8 · innerHTML กับค่าจากผู้ใช้');
fires('ต่อ string กับ userName', lint(s => addJs(s, '97-x.js', "function r1(el,userName){ el.innerHTML = '<b>' + userName + '</b>'; }\n")), 'L8', 'อาจเกิด XSS: src/js/97-x.js:1');
fires('template ${p.msg}', lint(s => addJs(s, '97-x.js', 'function r2(el,p){ el.innerHTML = `<p>${p.msg}</p>`; }\n')), 'L8', 'อาจเกิด XSS');
fires('+= กับ err', lint(s => addJs(s, '97-x.js', 'function r3(el,err){ el.innerHTML += `<i>${err}</i>`; }\n')), 'L8', 'อาจเกิด XSS');
quiet('ห่อ esc( แล้ว', lint(s => addJs(s, '97-x.js', 'function r4(el,p){ el.innerHTML = `<p>${esc(p.name)} ${esc(p.email)}</p>`; }\n')), 'L8');
quiet('คำต้องห้ามหลัง ; ของ statement อื่น', lint(s => addJs(s, '97-x.js', "function r5(el,b){ el.innerHTML = ''; b.className = 'x'; }\n")), 'L8');

console.log('L9 · <script src / eval / new Function');
fires('eval(', lint(s => addJs(s, '97-x.js', "function r6(){ return eval('1'); }\n")), 'L9', 'ห้ามใช้');
fires('new Function(', lint(s => addJs(s, '97-x.js', "const mk = () => new Function('return 1');\n")), 'L9', 'ห้ามใช้');
fires('<script src ใน head.html', lint(s => { s.head += '<script src="x.js"></script>\n'; }), 'L9', 'src/head.html');
fires('<script ในไฟล์ markup', lint(s => addMark(s, '70-x.html', '<script src="x.js"></script>\n')), 'L9', 'ห้ามมี <script ในไฟล์ markup: src/markup/70-x.html');
quiet('คำว่า eval ใน comment', lint(s => addJs(s, '97-x.js', '// eval( is not used\n')), 'L9');

console.log('L10 · ชื่อไฟล์และบรรทัดสุดท้าย');
fires('ไฟล์ไม่จบด้วย \\n', lint(s => addJs(s, '97-x.js', 'const noNl = 1;')), 'L10', 'ไฟล์ต้องจบด้วยบรรทัดใหม่ (\\n): src/js/97-x.js');
fires('ชื่อไฟล์ผิดรูปแบบ', lint(s => s.stray.push('js/9-bad.js')), 'L10', 'ชื่อไฟล์ผิดรูปแบบ');

console.log('L11 · ขนาด');
{
  // padding is relative to the real bundle, so each sample stays in its band while src/ grows (CR-A1, M1)
  const big = n => '/*' + 'x'.repeat(n * 1024) + '*/\n';
  const cur = Buffer.byteLength(assemble(base)), padTo = lim => Math.max(0, Math.ceil((lim - cur) / 1024)) + 2;
  const r1 = lint(s => addJs(s, '97-x.js', big(padTo(SIZE_FAIL))));
  fires(`เกิน ${SIZE_FAIL / 1024} KB`, r1, 'L11', `ใหญ่เกิน ${SIZE_FAIL / 1024} KB`);
  const r2 = lint(s => addJs(s, '97-x.js', big(padTo(SIZE_WARN))));
  ok(`L11 เตือนเมื่อเกิน ${SIZE_WARN / 1024} KB (ไม่ fail)`, r2.errors.length === 0 && r2.warnings.some(w => w.rule === 'L11' && w.msg.includes(`เกิน ${SIZE_WARN / 1024} KB`)), show(r2));
}

console.log('end-to-end: node build.mjs บนสำเนาชั่วคราว');
{
  const tmp = mkdtempSync(join(tmpdir(), 'rg-build-'));
  try {
    cpSync(join(ROOT, 'src'), join(tmp, 'src'), { recursive: true });
    const run = (...a) => spawnSync(process.execPath, [join(ROOT, 'build.mjs'), ...a, '--root=' + tmp], { encoding: 'utf8' });
    let r = run('--lint');
    ok('--lint ผ่านบนสำเนา (exit 0)', r.status === 0 && r.stdout.includes('lint ผ่าน'), r.stderr);
    writeFileSync(join(tmp, 'src/js/9-bad.js'), 'const x = 1;\n');
    r = run('--lint');
    ok('--lint fail เมื่อมีไฟล์ชื่อผิด (exit 1 + ข้อความ L10)', r.status === 1 && r.stderr.includes('ชื่อไฟล์ผิดรูปแบบ (ต้องเป็น NN[-x]-name.ext ในโฟลเดอร์ที่ถูก): src/js/9-bad.js'), r.stderr);
    unlinkSync(join(tmp, 'src/js/9-bad.js'));
    writeFileSync(join(tmp, 'src/js/97-a.js'), 'var dupZ = 1;\n'); writeFileSync(join(tmp, 'src/js/98-b.js'), 'function dupZ(){}\n');
    r = run('--lint');
    ok('--lint fail เมื่อประกาศซ้ำ (exit 1 + ข้อความ L3)', r.status === 1 && r.stderr.includes('ประกาศซ้ำ dupZ: src/js/97-a.js:1 และ src/js/98-b.js:1'), r.stderr);
    unlinkSync(join(tmp, 'src/js/97-a.js')); unlinkSync(join(tmp, 'src/js/98-b.js'));
    writeFileSync(join(tmp, 'runeguard.html'), readFileSync(join(ROOT, 'runeguard.html'), 'utf8'));
    r = run('--check');
    ok('--check ผ่านเมื่อ runeguard.html ตรงกับ src/', r.status === 0 && r.stdout.includes('check ผ่าน'), r.stderr || r.stdout);
    writeFileSync(join(tmp, 'runeguard.html'), readFileSync(join(ROOT, 'runeguard.html'), 'utf8').replace('Runeguard', 'Runeguarb'));
    r = run('--check');
    ok('--check fail เมื่อ runeguard.html ถูกแก้ด้วยมือ', r.status === 1 && r.stderr.includes('runeguard.html ไม่ตรงกับ src/'), r.stderr);
    r = run('--verify-split=' + join(ROOT, 'runeguard.html'));
    ok('--verify-split เทียบ sha256 กับ runeguard.html ได้ตรงกัน', r.status === 0 && r.stdout.includes('ตรงกันทุกไบต์'), r.stderr || r.stdout);
    writeFileSync(join(tmp, 'src/js/97-x.js'), "const k4='sb_secret_1';\n");
    r = run('--lint');
    ok('--lint fail เมื่อมีความลับ (exit 1 + ข้อความ L5)', r.status === 1 && r.stderr.includes('พบความลับใน src/js/97-x.js'), r.stderr);
    r = spawnSync(process.execPath, [join(ROOT, 'build.mjs'), '--root=' + tmp], { encoding: 'utf8' });
    ok('--root ห้ามใช้กับการ build เต็ม (ไม่เขียนทับ dist)', r.status === 2, r.stderr);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

console.log('test/_vm.mjs');
{
  const ctx = loadSrc(['24-hooks', '30-balance', '31-jobs-data', '33-items-data', '34-items-logic', '40-save-schema', '42-progression', '60-zones-data', '66-boss-data']);
  const v = ctx.__eval;
  ok('โหลดไฟล์ pure + 24-hooks ใน vm ได้', ctx.__files.length === 9);
  ok('stub คืนค่ากลาง: metaBonus({}) → {}', JSON.stringify(v('metaBonus({})')) === '{}');
  ok('stub คืนค่ากลาง: grantExp → {lvUp:0, jobUp:0} · rollDrops → []', JSON.stringify(v('[grantExp({},1,1), rollDrops({},1)]')) === '[{"lvUp":0,"jobUp":0},[]]');
  ok('BAL.CAP.base = 60 · BAL.SURV.defK(0) = 22', v('BAL.CAP.base') === 60 && v('BAL.SURV.defK(0)') === 22);
  ok('mergeBonus คูณ cd / magnet และบวก fam', JSON.stringify(v('mergeBonus({cd:.5,hp:3,fam:{undead:.1}},{cd:.5,hp:2,fam:{undead:.2}})')) === '{"cd":0.25,"hp":5,"fam":{"undead":0.30000000000000004}}');
  ok("esc('<a \"b\">&\\'') ถูกต้อง", v(`esc('<a "b">&\\'')`) === '&lt;a &quot;b&quot;&gt;&amp;&#39;');
  const u = v('rngUnit()'); ok('rngUnit() ใช้ crypto ได้และอยู่ใน [0,1)', typeof u === 'number' && u >= 0 && u < 1);
  ok('STORE เก็บในหน่วยความจำ', v("STORE.set('k','v') && STORE.get('k')") === 'v' && ctx.localStorage.getItem('k') === 'v');
  ok('ชื่อ top-level ไม่รั่วออกนอก context', typeof globalThis.BAL === 'undefined');
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
