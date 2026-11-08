// test/run.mjs (lane I) — runs every test/*.test.mjs one by one in its own node process and sums up (DESIGN §7.11).
//   node test/run.mjs              all tests, short output (a failing file prints its ✗ lines and stderr)
//   node test/run.mjs -v           print every file's full output
//   node test/run.mjs 30 shell     only files whose name contains one of these words
// Exit code 0 only when every file exits 0 (and at least one file ran). Lanes add a test by adding test/NN-name.test.mjs;
// this file never needs to change. No dependencies.
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2), verbose = args.includes('-v') || args.includes('--verbose');
const words = args.filter(a => !a.startsWith('-'));
const files = readdirSync(HERE).filter(f => f.endsWith('.test.mjs')).sort()
  .filter(f => !words.length || words.some(w => f.includes(w)));
const LIMIT = 10 * 60 * 1000;   // per file

if (!files.length) { console.error('✗ ไม่พบไฟล์เทสต์ (test/*.test.mjs)' + (words.length ? ' ที่ตรงกับ ' + words.join(', ') : '')); process.exit(1); }
console.log(`รันเทสต์ ${files.length} ไฟล์ (node ${process.version})\n`);

const rows = [];
for (const f of files) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [join(HERE, f)], { encoding: 'utf8', timeout: LIMIT, maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  const lf = t => String(t || '').replace(/\r\n?/g, '\n'), so = lf(r.stdout), se = lf(r.stderr).trim();
  const ms = Date.now() - t0, out = so + (se ? '\n' + se : '');
  // lane tests end with "ผ่าน N · ไม่ผ่าน M" (the last such line counts) · otherwise count ✓ / ✗ lines
  const m = [...out.matchAll(/ผ่าน\s+(\d+)\s*·\s*ไม่ผ่าน\s+(\d+)/g)].pop();
  const p = m ? +m[1] : (out.match(/^\s*✓/gm) || []).length, x = m ? +m[2] : (out.match(/^\s*✗/gm) || []).length;
  const why = r.error ? (r.error.code === 'ETIMEDOUT' ? 'เกินเวลา ' + LIMIT / 60000 + ' นาที' : String(r.error.message))
    : r.status !== 0 ? 'exit ' + (r.status == null ? r.signal : r.status) : x > 0 ? 'มีข้อไม่ผ่านแต่ exit 0' : '';
  const good = !why;
  rows.push({ f, good, p, x, ms, why });
  console.log(`${good ? '✓' : '✗'} ${f.padEnd(26)} ผ่าน ${String(p).padStart(4)} · ไม่ผ่าน ${String(x).padStart(3)} · ${(ms / 1000).toFixed(1)} วิ${why ? ' · ' + why : ''}`);
  if (verbose) console.log(out.replace(/^/gm, '    ') + '\n');
  else if (!good) {
    const bad = so.split('\n').filter((l, i, a) => /^\s*✗/.test(l) || (i > 0 && /^\s*✗/.test(a[i - 1]) && /^\s{4,}\S/.test(l)));
    const body = bad.length ? bad.join('\n') : so.trim().split('\n').slice(-30).join('\n');
    if (body) console.log(body.replace(/^/gm, '    '));
    if (se) console.log(se.split('\n').slice(-15).join('\n').replace(/^/gm, '    ! '));
  }
}

const nBad = rows.filter(r => !r.good).length, sp = rows.reduce((a, r) => a + r.p, 0), sx = rows.reduce((a, r) => a + r.x, 0);
const secs = rows.reduce((a, r) => a + r.ms, 0) / 1000;
console.log(`\nสรุป: ${rows.length - nBad}/${rows.length} ไฟล์ผ่าน · ข้อทดสอบผ่าน ${sp} · ไม่ผ่าน ${sx} · ${secs.toFixed(1)} วิ`);
if (nBad) console.log('ไฟล์ที่ไม่ผ่าน: ' + rows.filter(r => !r.good).map(r => r.f).join(', '));
process.exit(nBad ? 1 : 0);
