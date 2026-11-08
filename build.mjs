// Runeguard build: assemble src/ → runeguard.html (the artifact) → installable PWA in OUT. No dependencies.
//
//   node build.mjs                    assemble + lint (L1–L11) + write runeguard.html + PWA dist (OUT)
//   node build.mjs --lint             lint only, writes nothing
//   node build.mjs --check            lint + fail if runeguard.html on disk ≠ assembled src (forgot to build?)
//   node build.mjs --verify-split=F   assemble, compare sha256 (LF) with file F, writes nothing, no lint (P0 / S1)
//   node build.mjs --assemble=F       assemble + parse check, write only the page to F (no lint, no dist)
//   --root=DIR                        read DIR/src instead of this folder (only with the four modes above; tests use it)
//
//   OUT: D:/Comfy-Desktop/ComfyUI-Shared/output/Runeguard/dist locally · OUT_DIR=… anywhere · VERCEL=1 → ./dist
//   Output: index.html (+ CSP meta), manifest.webmanifest, sw.js, icons/*.png — icons are drawn in code below,
//   so the repo itself holds no image files.
//
// Page = src/head.html + css/* + '</style>\n' + markup/* + "<script>\n(()=>{\n'use strict';\n" + js/* + '})();\n</script>\n'
// Files are joined in file-name order (NN[-x]-name.ext); there is no separate order list (§7.4).
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
export const NAME = /^\d\d[a-z]?-[a-z0-9-]+\.(js|css|html)$/;
const DIRS = { js: 'js', css: 'css', markup: 'html' };
const lf = s => s.replace(/\r\n?/g, '\n');                       // every text read is compared/built as LF
const readText = p => lf(readFileSync(p, 'utf8'));
const sha = s => createHash('sha256').update(s, 'utf8').digest('hex');

/* ================= read + assemble ================= */
export function readSrc(root = HERE) {
  const base = join(root, 'src'), stray = [];
  const list = d => {
    const dir = join(base, d); if (!existsSync(dir)) return [];
    const all = readdirSync(dir).sort();
    for (const f of all) if (!NAME.test(f) || !f.endsWith('.' + DIRS[d]) || !statSync(join(dir, f)).isFile()) stray.push(d + '/' + f);
    return all.filter(f => NAME.test(f) && f.endsWith('.' + DIRS[d])).map(f => [d + '/' + f, readText(join(dir, f))]);
  };
  for (const f of existsSync(base) ? readdirSync(base) : []) if (!['head.html', 'js', 'css', 'markup'].includes(f)) stray.push(f);
  const head = existsSync(join(base, 'head.html')) ? readText(join(base, 'head.html')) : null;
  return { root, head, JS: list('js'), CSS: list('css'), MARK: list('markup'), stray };
}
export function assemble(src) {
  const body = src.JS.map(([, t]) => t).join('');
  return (src.head || '') + src.CSS.map(([, t]) => t).join('') + '</style>\n' + src.MARK.map(([, t]) => t).join('')
    + "<script>\n(()=>{\n'use strict';\n" + body + '})();\n</script>\n';
}
const gameScript = html => { const m = html.match(/<script>([\s\S]*)<\/script>/); return m ? m[1] : null; };

/* ================= JS lexer (for L3 and comment stripping) =================
   Skips comments, '…' "…" strings, template literals with nested ${…}, and regex literals.
   Tokens: {t:'id'|'num'|'str'|'tpl'|'re'|'p', v, line, nl}; nl = a newline came before this token. */
const REGEX_KW = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);
const isIdStart = c => /[A-Za-z_$\u0080-\uffff]/.test(c);
const isIdPart = c => /[\w$\u0080-\uffff]/.test(c);
export function lex(src, comments) {
  let i = 0, line = 1; const n = src.length;
  const regexOk = p => !p || (p.t === 'id' ? REGEX_KW.has(p.v) : p.t === 'p' ? !(p.v === ')' || p.v === ']' || p.v === '}') : false);
  function run(out, inTpl) {
    let depth = 0, nl = false;
    const emit = (t, v, l) => { out.push({ t, v, line: l, nl }); nl = false; };
    while (i < n) {
      const c = src[i];
      if (c === '\n') { line++; nl = true; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v' || c === '\u00a0' || c === '\ufeff') { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { const s = i; while (i < n && src[i] !== '\n') i++; if (comments) comments.push([s, i]); continue; }
      if (c === '/' && src[i + 1] === '*') {
        const e = src.indexOf('*/', i + 2); if (e < 0) throw new SyntaxError('comment ไม่ปิด (บรรทัด ' + line + ')');
        for (let k = i; k < e; k++) if (src[k] === '\n') { line++; nl = true; }
        if (comments) comments.push([i, e + 2]); i = e + 2; continue;
      }
      if (c === '"' || c === "'") {
        const l = line; i++;
        while (i < n && src[i] !== c) { if (src[i] === '\\') { if (src[i + 1] === '\n') line++; i += 2; continue; } if (src[i] === '\n') throw new SyntaxError('string ไม่ปิด (บรรทัด ' + l + ')'); i++; }
        i++; emit('str', '', l); continue;
      }
      if (c === '`') {
        const l = line; i++;
        for (;;) {
          if (i >= n) throw new SyntaxError('template ไม่ปิด (บรรทัด ' + l + ')');
          const d = src[i];
          if (d === '\\') { if (src[i + 1] === '\n') line++; i += 2; continue; }
          if (d === '`') { i++; break; }
          if (d === '\n') line++;
          if (d === '$' && src[i + 1] === '{') { i += 2; run([], true); continue; }
          i++;
        }
        emit('tpl', '', l); continue;
      }
      if (c === '/' && regexOk(out[out.length - 1])) {
        const l = line; i++; let cls = false;
        for (;;) {
          if (i >= n || src[i] === '\n') throw new SyntaxError('regex ไม่ปิด (บรรทัด ' + l + ')');
          const d = src[i];
          if (d === '\\') { i += 2; continue; }
          if (cls) { if (d === ']') cls = false; } else if (d === '[') cls = true; else if (d === '/') { i++; break; }
          i++;
        }
        while (i < n && /[a-z]/i.test(src[i])) i++;
        emit('re', '', l); continue;
      }
      if (isIdStart(c)) { let j = i + 1; while (j < n && isIdPart(src[j])) j++; emit('id', src.slice(i, j), line); i = j; continue; }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) { let j = i + 1; while (j < n && /[\w.]/.test(src[j])) j++; emit('num', '', line); i = j; continue; }
      if (c === '.' && src[i + 1] === '.' && src[i + 2] === '.') { emit('p', '...', line); i += 3; continue; }
      if (c === '=' && src[i + 1] === '>') { emit('p', '=>', line); i += 2; continue; }
      if (inTpl) { if (c === '{') depth++; else if (c === '}') { if (depth === 0) { i++; return; } depth--; } }
      emit('p', c, line); i++;
    }
    if (inTpl) throw new SyntaxError('template ไม่ปิด');
  }
  const out = []; run(out, false); return out;
}
export function stripComments(src) {   // comments → spaces (newlines kept, so line numbers stay right)
  const cm = []; lex(src, cm); let out = '', at = 0;
  for (const [a, b] of cm) { out += src.slice(at, a) + src.slice(a, b).replace(/[^\n]/g, ' '); at = b; }
  return out + src.slice(at);
}

/* top-level (depth 0) declarations: function / async function / function* / class / const / let / var,
   comma lists and destructuring patterns. Anything inside (), [], {} or a template is not top level. */
const EXPR_KW = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'yield', 'await', 'extends', 'else', 'do']);
export function topDecls(src) {
  const T = lex(src), out = [];
  const isP = (k, v) => T[k] && T[k].t === 'p' && T[k].v === v;
  const endish = p => p && (p.t === 'num' || p.t === 'str' || p.t === 'tpl' || p.t === 're' || (p.t === 'id' && !EXPR_KW.has(p.v)) || (p.t === 'p' && (p.v === ')' || p.v === ']' || p.v === '}')));
  const startish = t => t && (t.t === 'id' || t.t === 'num' || t.t === 'str' || (t.t === 'p' && (t.v === '!' || t.v === '~' || t.v === ';')));
  const stmtStart = k => {
    const p = T[k - 1]; if (!p) return true;
    if (p.t === 'p') return p.v === ';' || p.v === '}' || p.v === '{' || ((p.v === ')' || p.v === ']') && T[k].nl);
    if (p.t === 'id' && EXPR_KW.has(p.v)) return false;
    return T[k].nl;
  };
  // skip an expression until , ; (or ASI) at relative depth 0; returns the index of the terminator
  function skipExpr(k, stops) {
    let d = 0; const k0 = k;
    for (; k < T.length; k++) {
      const t = T[k];
      if (d === 0 && k > k0 && t.nl && endish(T[k - 1]) && startish(t)) return k;
      if (t.t !== 'p') continue;
      if (d === 0 && stops.includes(t.v)) return k;
      if (t.v === '(' || t.v === '[' || t.v === '{') d++;
      else if (t.v === ')' || t.v === ']' || t.v === '}') { if (d === 0) return k; d--; }
    }
    return k;
  }
  function skipBalanced(k) {   // T[k] is an opener; return the index after its closer
    let d = 0;
    for (; k < T.length; k++) { const t = T[k]; if (t.t !== 'p') continue; if (t.v === '(' || t.v === '[' || t.v === '{') d++; else if (t.v === ')' || t.v === ']' || t.v === '}') { d--; if (d === 0) return k + 1; } }
    return k;
  }
  function pattern(k, kind) {
    const t = T[k]; if (!t) return k;
    if (t.t === 'id') { out.push({ name: t.v, line: t.line, kind }); return k + 1; }
    if (isP(k, '{')) {
      k++;
      while (T[k] && !isP(k, '}')) {
        if (isP(k, '...')) k = pattern(k + 1, kind);
        else {
          const key = T[k]; let computed = false;
          if (isP(k, '[')) { k = skipBalanced(k); computed = true; } else k++;
          if (isP(k, ':')) k = pattern(k + 1, kind);
          else if (!computed && key.t === 'id') out.push({ name: key.v, line: key.line, kind });
          if (isP(k, '=')) k = skipExpr(k + 1, [',']);
        }
        if (isP(k, ',')) k++; else if (!isP(k, '}')) k++;   // malformed: move on
      }
      return k + 1;
    }
    if (isP(k, '[')) {
      k++;
      while (T[k] && !isP(k, ']')) {
        if (isP(k, ',')) { k++; continue; }
        k = isP(k, '...') ? pattern(k + 1, kind) : pattern(k, kind);
        if (isP(k, '=')) k = skipExpr(k + 1, [',']);
        if (isP(k, ',')) k++; else if (!isP(k, ']')) k++;
      }
      return k + 1;
    }
    return k + 1;
  }
  let depth = 0;
  for (let k = 0; k < T.length; k++) {
    const t = T[k];
    if (t.t === 'p') { if (t.v === '(' || t.v === '[' || t.v === '{') depth++; else if (t.v === ')' || t.v === ']' || t.v === '}') depth--; continue; }
    if (depth !== 0 || t.t !== 'id') continue;
    if (t.v === 'const' || t.v === 'let' || t.v === 'var') {
      let j = k + 1;
      for (;;) {
        j = pattern(j, t.v);
        if (isP(j, '=')) j = skipExpr(j + 1, [',', ';']);
        if (isP(j, ',')) { j++; continue; }
        break;
      }
      k = j - 1; continue;
    }
    const asyncFn = t.v === 'async' && T[k + 1] && T[k + 1].v === 'function' && !T[k + 1].nl;
    if ((t.v === 'function' || asyncFn) && stmtStart(k)) {
      let j = asyncFn ? k + 2 : k + 1;
      if (isP(j, '*')) j++;
      if (T[j] && T[j].t === 'id') out.push({ name: T[j].v, line: T[j].line, kind: 'function' });
      k = j; continue;
    }
    if (t.v === 'class' && stmtStart(k)) { if (T[k + 1] && T[k + 1].t === 'id') out.push({ name: T[k + 1].v, line: T[k + 1].line, kind: 'class' }); k++; continue; }
  }
  return out;
}

/* ================= lint (§7.3) ================= */
export const BANNED = ['ragnarok', 'midgard', 'yggdrasil', 'prontera', 'payon', 'geffen', 'morroc', 'izlude', 'alberta', 'aldebaran',
  'poring', 'baphomet', 'osiris', 'eddga', 'oridecon', 'elunium', 'emperium', 'zeny', 'kafra', 'novice', 'mvp', 'valkyrie', 'katar',
  'swordman', 'acolyte', 'zombie waves', 'zombiewaves',
  'แร็กนาร็อก', 'แรคนาร็อก', 'แรคน่าร้อค', 'พรอนเทรา', 'พรอนเทร่า', 'เพยอน', 'เกฟเฟน', 'มอรอค', 'โพริ่ง', 'บาโฟเมท', 'โอริเดคอน',
  'โอริดีคอน', 'เอลูเนียม', 'เอ็มพีเรียม', 'เซนี่', 'คาฟร่า', 'โนวิส', 'คาทาร์', 'วาลคิรี', 'มิดการ์ด', 'อิกดราซิล'];
const SECRETS = ['sb_secret_', 'service_role', 'eyJhbGci', '-----BEGIN'];
const PURE = ['30', '31', '33', '34', '40', '42', '60', '66'];
const PURE_RE = /(^|[^\w$.])(document|window|localStorage|sessionStorage|navigator|location)(?![\w$])/g;
const PURE_GLOBAL = /(^|[^\w$.])(globalThis|self|ctx)\s*[.[]/;   // globalThis.document / self.localStorage / ctx.fillRect
// L7 hit = a DOM name that is not an object key ({location: 1} / {a: 1, location: 2}) · obj.location never matches (the . before it)
function pureHit(ln) {
  if (PURE_GLOBAL.test(ln)) return true;
  for (const m of ln.matchAll(PURE_RE)) {
    const at = m.index + m[1].length, before = ln.slice(0, at), after = ln.slice(at + m[2].length);
    if (/[{,]\s*$/.test(before) && /^\s*:/.test(after)) continue;   // object key
    return true;
  }
  return false;
}
const XSS_WORDS = ['name', 'email', 'msg', 'err', 'text'];
export const SIZE_WARN = 600 * 1024, SIZE_FAIL = 800 * 1024;   // raised after M1 (353.8 KB raw = 113 KB gzip; Thai text is 3 bytes/char)
const lineOf = (text, idx) => text.slice(0, idx).split('\n').length;

// right-hand side of `…innerHTML = <rhs>;` on one line, reduced to the parts that are code, not string text:
// ${…} bodies and bare operands. Stops at the `;` (or unmatched closer) that ends the assignment.
function htmlCodeParts(s) {
  let out = '', i = 0; const n = s.length;
  function code(stopAtBrace) {
    let d = 0;
    while (i < n) {
      const c = s[i];
      if (c === '"' || c === "'") { out += ' '; i++; while (i < n && s[i] !== c) { if (s[i] === '\\') i++; i++; } i++; continue; }
      if (c === '`') { out += ' '; i++; tpl(); continue; }
      if (stopAtBrace) { if (c === '{') d++; else if (c === '}') { if (d === 0) { i++; out += ')'; return; } d--; } }
      else { if (c === '(' || c === '[' || c === '{') d++; else if (c === ')' || c === ']' || c === '}') { if (d === 0) return; d--; } else if (c === ';' && d === 0) return; }
      out += c; i++;
    }
  }
  function tpl() {
    while (i < n) {
      const c = s[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i++; return; }
      if (c === '$' && s[i + 1] === '{') { i += 2; out += '('; code(true); continue; }
      i++;
    }
  }
  code(false); return out;
}
function xssHits(code) {   // identifiers with a name/email/msg/err/text part that are not inside esc(…)
  const hits = [], stack = [];
  const re = /[A-Za-z_$][\w$]*|[()]/g; let m, prev = '';
  while ((m = re.exec(code))) {
    const w = m[0];
    if (w === '(') { stack.push(prev === 'esc'); prev = ''; continue; }
    if (w === ')') { stack.pop(); prev = ''; continue; }
    prev = w;
    if (w === 'esc' || stack.includes(true)) continue;
    const parts = w.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])/g) || [];
    if (parts.some(p => XSS_WORDS.some(x => p.toLowerCase().startsWith(x)))) hits.push(w);
  }
  return hits;
}

export function lintAll(src, html) {
  const errors = [], warnings = [];
  const E = (rule, msg) => errors.push({ rule, msg });
  const files = [];   // [rel, text, kind]
  if (src.head !== null) files.push(['head.html', src.head, 'html']); else E('L10', 'ไม่มีไฟล์ src/head.html');
  for (const [f, t] of src.CSS) files.push([f, t, 'css']);
  for (const [f, t] of src.MARK) files.push([f, t, 'markup']);
  for (const [f, t] of src.JS) files.push([f, t, 'js']);
  const base = f => f.split('/').pop();

  // L10 file names + trailing newline
  for (const f of src.stray) E('L10', `ชื่อไฟล์ผิดรูปแบบ (ต้องเป็น NN[-x]-name.ext ในโฟลเดอร์ที่ถูก): src/${f}`);
  for (const [f, t] of files) if (!t.endsWith('\n')) E('L10', `ไฟล์ต้องจบด้วยบรรทัดใหม่ (\\n): src/${f}`);

  // L1 one game <script>, first </style> before the markup
  const nOpen = (html.match(/<script/gi) || []).length, nClose = (html.match(/<\/script/gi) || []).length;
  if (nOpen !== 1 || nClose !== 1) E('L1', `มี <script> มากกว่าหนึ่ง (พบ <script ${nOpen} ครั้ง, </script ${nClose} ครั้ง)`);
  const cssEnd = (src.head || '').length + src.CSS.reduce((a, [, t]) => a + t.length, 0);
  if (html.indexOf('</style>') !== cssEnd) E('L1', '</style> อันแรกต้องเป็นอันที่ build เขียน (พบ </style> ใน head หรือ CSS) และต้องอยู่ก่อน markup');

  // L2 every JS file parses on its own (strict); then the whole script
  const parsed = new Set();
  for (const [f, t] of src.JS) {
    try { new Function("'use strict';\n" + t); parsed.add(f); } catch (e) { E('L2', `ไวยากรณ์ผิดที่ไฟล์ src/${f}: ${e.message}`); }
  }
  const script = gameScript(html);
  if (script !== null && parsed.size === src.JS.length) { try { new Function(script); } catch (e) { E('L2', `ไวยากรณ์ผิดเมื่อรวมทั้งก้อน: ${e.message}`); } }

  // L3 no top-level name declared twice (across files, and twice in one file)
  const seen = new Map();
  for (const [f, t] of src.JS) {
    if (!parsed.has(f)) continue;
    let decls; try { decls = topDecls(t); } catch (e) { E('L3', `อ่านไฟล์ src/${f} ไม่ได้: ${e.message}`); continue; }
    for (const d of decls) {
      const at = seen.get(d.name);
      if (at) E('L3', `ประกาศซ้ำ ${d.name}: src/${at.f}:${at.line} และ src/${f}:${d.line}`);
      else seen.set(d.name, { f, line: d.line });
    }
  }

  // L4 IP words · L5 secrets · L6 Supabase · L9 script/eval
  for (const [f, t] of files) {
    const low = t.toLowerCase();
    for (const w of BANNED) { const k = low.indexOf(w); if (k >= 0) E('L4', `IP: พบคำต้องห้าม "${w}" ใน src/${f} (บรรทัด ${lineOf(t, k)})`); }
    if (SECRETS.some(s => t.includes(s))) E('L5', `พบความลับใน src/${f}`);
    if (base(f) !== '43-auth.js' && /supabase\.co|sb_publishable_/i.test(t)) E('L6', `URL หรือคีย์ของ Supabase อยู่ได้เฉพาะใน 43-auth.js: src/${f}`);
    for (const m of t.matchAll(/\/rest\/v1\//g)) if (t.slice(m.index + 9, m.index + 12) !== 'rg_') E('L6', `REST path ไม่อนุญาต (ต้องเป็น /rest/v1/rg_…): src/${f}:${lineOf(t, m.index)}`);
    for (const m of t.matchAll(/\/auth\/v1\/logout/g)) { const ln = t.slice(m.index).split('\n')[0]; if (!/scope=local/.test(ln)) E('L6', `logout ต้อง scope=local: src/${f}:${lineOf(t, m.index)}`); }
    const code = (() => { if (kind(f) !== 'js') return t; try { return stripComments(t); } catch (e) { return t; } })();
    code.split('\n').forEach((ln, i) => {
      if (/<script[^>]*\ssrc\s*=/i.test(ln) || /(^|[^\w$.])eval\s*\(/.test(ln) || /\bnew\s+Function\s*\(/.test(ln)) E('L9', `ห้ามใช้ <script src / eval( / new Function( : src/${f}:${i + 1}`);
    });
    if (kind(f) === 'markup' && /<script/i.test(t)) E('L9', `ห้ามมี <script ในไฟล์ markup: src/${f}`);
  }
  function kind(f) { return f === 'head.html' ? 'html' : f.startsWith('js/') ? 'js' : f.startsWith('css/') ? 'css' : 'markup'; }

  // L7 pure files do not touch the DOM · L8 innerHTML with name/email/msg/err/text must go through esc(
  for (const [f, t] of src.JS) {
    if (!parsed.has(f)) continue;
    let code; try { code = stripComments(t); } catch (e) { code = t; }
    const pure = PURE.includes(base(f).slice(0, 2));
    code.split('\n').forEach((ln, i) => {
      if (pure && pureHit(ln)) E('L7', `ไฟล์ pure แตะ DOM: src/${f}:${i + 1}`);
      const hits = [];
      for (const m of ln.matchAll(/innerHTML\s*\+?=(?!=)/g)) hits.push(...xssHits(htmlCodeParts(ln.slice(m.index + m[0].length))));
      if (hits.length) E('L8', `อาจเกิด XSS: src/${f}:${i + 1} (${[...new Set(hits)].join(', ')} ต้องห่อ esc( )`);
    });
  }

  // L11 size
  const kb = Buffer.byteLength(html, 'utf8');
  if (kb > SIZE_FAIL) E('L11', `runeguard.html ใหญ่เกิน ${SIZE_FAIL / 1024} KB (${(kb / 1024).toFixed(1)} KB)`);
  else if (kb > SIZE_WARN) warnings.push({ rule: 'L11', msg: `คำเตือน: runeguard.html ใหญ่ ${(kb / 1024).toFixed(1)} KB (เกิน ${SIZE_WARN / 1024} KB)` });
  return { errors, warnings };
}

/* ================= PWA dist ================= */
const SUPA_ORIGIN = 'https://edmwctmnasggdtdbcxkb.supabase.co';
const cspHash = s => "'sha256-" + createHash('sha256').update(s, 'utf8').digest('base64') + "'";
export function buildDist(html, OUT) {
  // the page AND this builder (index/sw templates) decide the version, so a change to either ships a new worker + update toast
  const version = sha(html + readFileSync(fileURLToPath(import.meta.url), 'utf8')).slice(0, 10);
  // index.html — the artifact body split into <head> (title, fonts, styles) and <body>
  const cut = html.indexOf('</style>') + '</style>'.length;
  const headPart = html.slice(0, cut).replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '');
  const bodyPart = html.slice(cut);
  const reg = `
/* PWA: cache the game so it opens instantly and works offline (build ${version}) */
if ('serviceWorker' in navigator) {
  let hadCtrl = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadCtrl) { hadCtrl = true; return; }      // first install takes control: nothing new to load
    if (document.getElementById('swToast')) return;
    const b = document.createElement('button'); b.id = 'swToast'; b.type = 'button';
    b.textContent = 'อัปเดตพร้อม · แตะเพื่อโหลดใหม่';
    b.style.cssText = 'position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 84px);transform:translateX(-50%);z-index:60;min-height:44px;max-width:calc(100% - 32px);padding:0 18px;border-radius:12px;border:1px solid #f0b545;background:#1b2117;color:#efe4cc;font:600 14px Mali,Tahoma,sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.5);cursor:pointer';
    b.addEventListener('click', () => location.reload());
    document.body.appendChild(b);
  });
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').then(reg => {
    const ask = w => { if (w && navigator.serviceWorker.controller) w.postMessage({ t: 'skipWaiting' }); };
    ask(reg.waiting);
    reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') ask(w); }); });
  }).catch(() => {}));
}
`;
  const game = gameScript(bodyPart);
  const csp = ["default-src 'self'", `script-src 'self' ${cspHash(game)} ${cspHash(reg)}`, "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src https://fonts.gstatic.com', "img-src 'self' data: blob:", `connect-src 'self' ${SUPA_ORIGIN} https://fonts.googleapis.com https://fonts.gstatic.com`,
    "worker-src 'self'", "manifest-src 'self'", "base-uri 'none'", "form-action 'self'", "object-src 'none'"].join('; ');
  const index = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#10140e">
<meta name="description" content="เกมเอาชีวิตรอดจากฝูงซอมบี้ 20 คลื่น เลือก 5 อาชีพแฟนตาซี เก็บสกิล วิวัฒนาการ และเปลี่ยนอาชีพขั้นสอง">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Runeguard">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
${headPart}
</head>
<body>
${bodyPart}
<script>${reg}</script>
</body>
</html>
`;

  const manifest = {
    name: 'Runeguard · ศึกคลื่นอันเดด',
    short_name: 'Runeguard',
    description: 'เกมเอาชีวิตรอดจากฝูงซอมบี้ 20 คลื่น',
    lang: 'th',
    start_url: './',
    scope: './',
    display: 'fullscreen',
    display_override: ['fullscreen', 'standalone'],
    orientation: 'any',
    background_color: '#10140e',
    theme_color: '#10140e',
    categories: ['games'],
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };

  // service worker: open from cache instantly, refresh the cache in the background
  const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
  const fontCss = (html.match(/href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"/) || [])[1] || '';
  const sw = `// Runeguard service worker — build ${version}
const VERSION = 'runeguard-${version}';
const FONTS = 'runeguard-fonts';
const CORE = ${JSON.stringify(CORE)};
const FONT_CSS = ${JSON.stringify(fontCss)};
// fonts are fetched before this worker exists on the first visit, so pull them in during install
async function cacheFonts() {
  if (!FONT_CSS) return;
  try {
    const c = await caches.open(FONTS);
    if (await c.match(FONT_CSS, { ignoreVary: true })) return;
    const r = await fetch(FONT_CSS);
    if (!r.ok) return;
    const css = await r.clone().text();
    await c.put(FONT_CSS, r);
    const files = [...css.matchAll(/url\\((https:[^)]+)\\)/g)].map(m => m[1]);
    await Promise.all(files.map(u => fetch(u).then(f => f.ok && c.put(u, f)).catch(() => {})));
  } catch (e) { /* offline during install: fonts get cached on the next online visit */ }
}
self.addEventListener('install', e => {
  e.waitUntil(Promise.all([caches.open(VERSION).then(c => c.addAll(CORE)), cacheFonts()]).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// the page asks a waiting worker to take over (see the registration script in index.html)
self.addEventListener('message', e => e.data && e.data.t === 'skipWaiting' && self.skipWaiting());
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.startsWith('/api/')) return;
  if (url.origin === location.origin) {
    const key = req.mode === 'navigate' ? './index.html' : req;
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(key);
      const net = fetch(req).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    }));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req, { ignoreVary: true });
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
  }
});
`;

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(join(OUT, 'icons'), { recursive: true });
  writeFileSync(join(OUT, 'index.html'), index);
  writeFileSync(join(OUT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
  writeFileSync(join(OUT, 'sw.js'), sw);
  writeFileSync(join(OUT, 'icons/icon-192.png'), drawIcon(192, { rounded: true, s: 1 }));
  writeFileSync(join(OUT, 'icons/icon-512.png'), drawIcon(512, { rounded: true, s: 1 }));
  writeFileSync(join(OUT, 'icons/maskable-512.png'), drawIcon(512, { rounded: false, s: .78 }));
  writeFileSync(join(OUT, 'icons/apple-touch-icon.png'), drawIcon(180, { rounded: false, s: .9 }));
  return version;
}

/* ================= icons — tiny software rasteriser (4x4 supersampling) + PNG encoder ================= */
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const inPoly = (x, y, pts) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; };
// unit coordinates: 0..1 across the icon; `s` shrinks the emblem for maskable icons
function drawIcon(size, { rounded, s }) {
  const c = (v) => 0.5 + (v - 0.5) * s;
  const gold = hex('#f0b545'), goldDeep = hex('#9a6a1c'), steel = hex('#e6edf7'), steelDark = hex('#9fb0c4'), grip = hex('#5a3a22'), rune = hex('#5fd3c3');
  const layers = [
    // runes ring
    { col: gold, hit: (x, y) => { const d = Math.hypot(x - .5, y - .5); return d > .355 * s && d < .395 * s; } },
    { col: goldDeep, hit: (x, y) => { const d = Math.hypot(x - .5, y - .5); return d > .315 * s && d < .33 * s; } },
    { col: rune, hit: (x, y) => { const a = Math.atan2(y - .5, x - .5), d = Math.hypot(x - .5, y - .5); const k = ((a / (Math.PI * 2)) * 12 + 12) % 1; return d > .415 * s && d < .445 * s && Math.abs(k - .5) < .12; } },
    // sword blade (two tones), guard, grip, pommel
    { col: steelDark, hit: (x, y) => inPoly(x, y, [[c(.5), c(.17)], [c(.545), c(.27)], [c(.545), c(.66)], [c(.455), c(.66)], [c(.455), c(.27)]]) },
    { col: steel, hit: (x, y) => inPoly(x, y, [[c(.5), c(.17)], [c(.545), c(.27)], [c(.545), c(.66)], [c(.5), c(.66)]]) },
    { col: gold, hit: (x, y) => x > c(.355) && x < c(.645) && y > c(.645) && y < c(.69) },
    { col: grip, hit: (x, y) => x > c(.474) && x < c(.526) && y > c(.69) && y < c(.79) },
    { col: gold, hit: (x, y) => Math.hypot(x - c(.5), y - c(.81)) < .035 * s },
  ];
  const buf = Buffer.alloc(size * size * 4), SS = 4, r0 = .2;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let R = 0, Gc = 0, B = 0, A = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const x = (px + (sx + .5) / SS) / size, y = (py + (sy + .5) / SS) / size;
      if (rounded) { const qx = Math.max(Math.abs(x - .5) - (.5 - r0), 0), qy = Math.max(Math.abs(y - .5) - (.5 - r0), 0); if (Math.hypot(qx, qy) > r0) continue; }
      const d = Math.hypot(x - .5, y - .45);
      let col = [16 + 22 * Math.max(0, 1 - d * 1.8), 20 + 26 * Math.max(0, 1 - d * 1.8), 14 + 16 * Math.max(0, 1 - d * 1.8)];
      for (const l of layers) if (l.hit(x, y)) col = l.col;
      R += col[0]; Gc += col[1]; B += col[2]; A += 255;
    }
    const i = (py * size + px) * 4;
    if (A > 0) { const k = 255 / A; buf[i] = Math.round(R * k); buf[i + 1] = Math.round(Gc * k); buf[i + 2] = Math.round(B * k); }
    buf[i + 3] = Math.round(A / (SS * SS));
  }
  return png(size, buf);
}

/* ================= main ================= */
function parseParseChecks(src, html) {   // L2 only — used by the modes that skip the full lint
  const bad = [];
  for (const [f, t] of src.JS) { try { new Function("'use strict';\n" + t); } catch (e) { bad.push(`ไวยากรณ์ผิดที่ไฟล์ src/${f}: ${e.message}`); } }
  if (!bad.length) { try { new Function(gameScript(html)); } catch (e) { bad.push('ไวยากรณ์ผิดเมื่อรวมทั้งก้อน: ' + e.message); } }
  return bad;
}
function main(argv) {
  const opt = {};
  for (const a of argv) { const m = a.match(/^--([a-z-]+)(?:=(.*))?$/); if (!m) { console.error('ไม่รู้จักตัวเลือก: ' + a); process.exit(2); } opt[m[1]] = m[2] ?? true; }
  const only = opt['verify-split'] || opt.assemble || opt.lint || opt.check;
  if (opt.root && !only) { console.error('--root ใช้ได้กับ --lint / --check / --verify-split / --assemble เท่านั้น'); process.exit(2); }
  const root = opt.root ? resolve(opt.root) : HERE;
  const src = readSrc(root), html = assemble(src);
  const fail = msgs => { for (const m of msgs) console.error('✗ ' + m); process.exit(1); };

  if (opt['verify-split'] || opt.assemble) {
    const bad = parseParseChecks(src, html);
    console.log(`ไฟล์ JS ${src.JS.length} ไฟล์ parse เดี่ยวได้: ${bad.length ? 'ไม่ผ่าน' : 'ผ่าน'}`);
    if (bad.length) fail(bad);
  }
  if (opt['verify-split']) {
    const F = resolve(String(opt['verify-split'])), rawF = readFileSync(F, 'utf8'), want = lf(rawF);
    const a = sha(html), b = sha(want);
    if (rawF !== want) console.log('หมายเหตุ: ไฟล์เทียบมี CRLF — เทียบหลังแปลงเป็น LF');
    console.log(`sha256 ผลประกอบ  ${a}  (${Buffer.byteLength(html)} ไบต์)`);
    console.log(`sha256 ${F}  ${b}  (${Buffer.byteLength(want)} ไบต์)`);
    if (a !== b) fail(['ไม่ตรงกัน: ผลประกอบจาก src ≠ ' + F]);
    console.log('ตรงกันทุกไบต์'); return;
  }
  if (opt.assemble) { const F = resolve(String(opt.assemble)); writeFileSync(F, html); console.log(`assemble → ${F} (sha256 ${sha(html)})`); return; }

  const { errors, warnings } = lintAll(src, html);
  for (const w of warnings) console.warn('! ' + w.rule + ' ' + w.msg);
  if (errors.length) fail(errors.map(e => e.rule + ' ' + e.msg));
  if (opt.lint) { console.log(`lint ผ่าน (L1–L11) · ${src.JS.length} js · ${src.CSS.length} css · ${src.MARK.length} markup · ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`); return; }
  if (opt.check) {
    const p = join(root, 'runeguard.html'), cur = existsSync(p) ? readText(p) : '';
    if (cur !== html) fail([`runeguard.html ไม่ตรงกับ src/ (sha256 ไฟล์ ${sha(cur).slice(0, 12)} · ผลประกอบ ${sha(html).slice(0, 12)}) — ลืมรัน node build.mjs หรือแก้ runeguard.html ด้วยมือ`]);
    console.log(`check ผ่าน: runeguard.html ตรงกับ src/ (sha256 ${sha(html)})`); return;
  }
  writeFileSync(join(HERE, 'runeguard.html'), html);           // code, not media → may live in the repo
  const OUT = process.env.OUT_DIR || (process.env.VERCEL ? join(HERE, 'dist') : 'D:/Comfy-Desktop/ComfyUI-Shared/output/Runeguard/dist');
  const version = buildDist(html, OUT);
  console.log(`build ${version} → runeguard.html (${(Buffer.byteLength(html) / 1024).toFixed(1)} KB) + ${OUT}`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
