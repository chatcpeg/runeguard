// test/61-classic-headless.test.mjs (lane F) — classic must stay bit-identical: the golden recipe (seed 42 · 600 s · 5 classes)
// run headless (test/_headless.mjs) and compared with test/golden/headless.json, which was recorded from the code before
// ท่องแดนรูน (v2 7d5c656). Headless ≠ browser numbers (the fake DOM / no AudioContext path differs a little), so this does not
// replace the browser golden (test/golden/README.md) — it is a fast guard that every core seam of a lane keeps classic as it was.
//   node test/61-classic-headless.test.mjs
import { loadGame, goldenRun } from './_headless.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + info : '')); } };
const want = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'golden', 'headless.json'), 'utf8'));
console.log('คลาสสิก seed 42 · 600 วิ (headless) = ผลที่บันทึกจากโค้ดก่อนโหมดแผนที่ทุกตัวอักษร');
const { X } = loadGame();
for (const c of Object.keys(want)) { const got = goldenRun(X, c); ok(c, got === want[c], 'ได้ ' + got.slice(0, 200)); }
console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
