// test/names.test.mjs (lane I) — every display name `n` in the game must be unique (DESIGN §7.11 · ภาคผนวก ก).
//   node test/names.test.mjs
// Collects n from SK (+ evo.n), PASSIVES, ITEMS, RUNES, EN (core + lanes that merge into EN at load), MOBS, ZONES,
// BOSS_LIST, classes and advanced jobs, by running the real src/js data files in node:vm (test/_vm.mjs).
// Two names that are equal after normalising (NFC, trim, one space, lower case, no zero-width chars) fail, unless both
// entries are the same thing: ITEMS / RUNES / EN / MOBS / BOSS_LIST share one id space (a rune item and its RUNES
// entry, a boss in EN and in BOSS_LIST), and BOSS_LIST / ITEMS may point at that id with `en` / `type` / `rune`.
import { loadSrc } from './_vm.mjs';

// data files + the lane files that add to EN at load (58 trial warden · 60 zone mobs · 66 arena bosses)
const FILES = ['04', '05', '06', '07', '08', '13', '24', '30', '31', '33', '58', '60', '66'];
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info ? '\n      ' + info : '')); } };

const norm = s => String(s).normalize('NFC').replace(/[​-‍⁠﻿]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

// rows: [{src, id, n, key}] → [{n, rows}] for every name used by two different keys
function dupes(rows) {
  const by = new Map();
  for (const r of rows) { const k = norm(r.n); if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  const out = [];
  for (const [k, rs] of by) if (new Set(rs.map(r => r.key)).size > 1) out.push({ n: k, rows: rs });
  return out;
}

// read every registry inside the vm (plain objects / arrays) · a registry a lane has not shipped yet is skipped
function collect(ctx) {
  return ctx.__eval(`(() => {
    const rows = [], isObj = x => x && typeof x === 'object';
    const add = (src, id, n, key) => rows.push({ src, id: String(id), n, key });
    const each = (reg, f) => { if (Array.isArray(reg)) reg.forEach((x, i) => f(x, isObj(x) && x.id != null ? x.id : i));
      else if (isObj(reg)) for (const id of Object.keys(reg)) f(reg[id], id); };
    each((typeof SK !== 'undefined' ? SK : undefined), (s, id) => { add('SK', id, s && s.n, 'sk:' + id); if (s && s.evo) add('SK.evo', id, s.evo.n, 'evo:' + id); });
    each((typeof PASSIVES !== 'undefined' ? PASSIVES : undefined), (p, id) => add('PASSIVES', id, p && p.n, 'pas:' + id));
    each((typeof ITEMS !== 'undefined' ? ITEMS : undefined), (x, id) => add('ITEMS', id, x && x.n, 'obj:' + (x && x.rune || id)));
    each((typeof RUNES !== 'undefined' ? RUNES : undefined), (x, id) => add('RUNES', id, x && x.n, 'obj:' + id));
    each((typeof EN !== 'undefined' ? EN : undefined), (x, id) => add('EN', id, x && x.n, 'obj:' + id));
    const EN0 = (typeof EN !== 'undefined' ? EN : undefined) || {};
    each((typeof MOBS !== 'undefined' ? MOBS : undefined), (x, id) => { if (!Object.prototype.hasOwnProperty.call(EN0, id)) add('MOBS', id, x && x.n, 'obj:' + id); });
    each((typeof ZONES !== 'undefined' ? ZONES : undefined), (x, id) => add('ZONES', id, x && x.n, 'zone:' + id));
    each((typeof BOSS_LIST !== 'undefined' ? BOSS_LIST : undefined), (x, id) => add('BOSS_LIST', id, x && x.n, 'obj:' + (x && (x.en || x.type) || id)));
    each((typeof CLASSES !== 'undefined' ? CLASSES : undefined), c => { add('CLASSES', c.id, c.n, 'cls:' + c.id); for (const a of c.adv || []) add('CLASSES.adv', a.id, a.n, 'adv:' + a.id); });
    return rows; })()`);
}

console.log('ตัวตรวจเอง (ตัวอย่างสังเคราะห์)');
{
  const r = (src, id, n, key) => ({ src, id, n, key });
  ok('ชื่อเดียวกันคนละสิ่ง = ซ้ำ', dupes([r('SK', 'a', 'ดาบ', 'sk:a'), r('EN', 'b', 'ดาบ', 'obj:b')]).length === 1);
  ok('ต่างกันแค่ช่องว่าง / ตัวพิมพ์ / zero-width = ซ้ำ', dupes([r('SK', 'a', ' Rune  Blade', 'sk:a'), r('ITEMS', 'b', 'rune blade​', 'obj:b')]).length === 1);
  ok('สิ่งเดียวกันในสอง registry (id เดียวกัน) ไม่นับว่าซ้ำ', dupes([r('ITEMS', 'r_x', 'รูนลม', 'obj:r_x'), r('RUNES', 'r_x', 'รูนลม', 'obj:r_x')]).length === 0);
  ok('ชื่อไม่ซ้ำ = ผ่าน', dupes([r('SK', 'a', 'ก', 'sk:a'), r('SK', 'b', 'ข', 'sk:b')]).length === 0);
}

console.log('ชื่อจริงใน src/js');
let rows = [];
try { rows = collect(loadSrc(FILES)); ok(`โหลดไฟล์ข้อมูลได้ (${FILES.length} ไฟล์)`, true); }
catch (e) { ok('โหลดไฟล์ข้อมูลได้', false, String(e && e.stack || e)); }
if (rows.length) {
  const count = {}; for (const r of rows) count[r.src] = (count[r.src] || 0) + 1;
  console.log('  · ' + rows.length + ' ชื่อ: ' + Object.entries(count).map(([k, v]) => k + ' ' + v).join(' · '));
  const bad = rows.filter(r => typeof r.n !== 'string' || !norm(r.n));
  ok('ทุกตัวมีชื่อ n เป็นข้อความไม่ว่าง', bad.length === 0, bad.map(r => r.src + '.' + r.id).join(', '));
  ok('มีครบทุกหมวดที่ส่งแล้ว (SK, SK.evo, PASSIVES, ITEMS, RUNES, EN, CLASSES, CLASSES.adv)', ['SK', 'SK.evo', 'PASSIVES', 'ITEMS', 'RUNES', 'EN', 'CLASSES', 'CLASSES.adv'].every(k => count[k] > 0), JSON.stringify(count));
  ok('อาชีพ 5 + อาชีพขั้นสูง 10', count.CLASSES === 5 && count['CLASSES.adv'] === 10, JSON.stringify(count));
  // M2 (§9.4): 73+ gear pieces + materials · 10 survival runes, each sold as one rune item that carries the same name
  const it = loadSrc(FILES).__eval(`(() => { const gear = Object.keys(ITEMS).filter(k => ITEMS[k].slot).length, bad = [];
    for (const id of Object.keys(RUNES)) { const m = Object.keys(ITEMS).filter(k => ITEMS[k].rune === id);
      if (m.length !== 1 || ITEMS[m[0]].n !== RUNES[id].n) bad.push(id + ':' + m.join('/')); }
    const shard = Object.keys(RUNES).filter(id => !RUNES[id].shard || !Object.prototype.hasOwnProperty.call(ITEMS, RUNES[id].shard));
    return { gear, runes: Object.keys(RUNES).length, bad, shard }; })()`);
  ok('ไอเทม M2: อุปกรณ์ ≥ 73 ชิ้น · รูน 10 แบบ · รูนแต่ละแบบมีไอเทมรูน 1 ชิ้นชื่อตรงกัน และมีเศษรูนใน ITEMS', it.gear >= 73 && it.runes === 10 && !it.bad.length && !it.shard.length, JSON.stringify(it));
  const d = dupes(rows.filter(r => typeof r.n === 'string' && norm(r.n)));
  ok('ไม่มีชื่อที่แสดงซ้ำกัน', d.length === 0, d.map(x => '"' + x.n + '": ' + x.rows.map(r => r.src + '.' + r.id).join(' · ')).join(' | '));
  // end to end: copy a real name onto another registry in a fresh context → must be caught with both places named
  const ctx2 = loadSrc(FILES); ctx2.__eval("SK.slash.n = ' ' + CLASSES[1].adv[0].n.toUpperCase() + ' '");
  const d2 = dupes(collect(ctx2));
  ok('จับได้จริงเมื่อทำให้ชื่อในข้อมูลจริงซ้ำ (SK.slash = ชื่ออาชีพขั้นสูง)', d2.length === 1 && d2[0].rows.map(r => r.src + '.' + r.id).sort().join() === ['CLASSES.adv.' + ctx2.__eval('CLASSES[1].adv[0].id'), 'SK.slash'].sort().join(), JSON.stringify(d2));
  // same for the item registries: a gear piece renamed to a rune's name, and a material renamed to an enemy's name
  const ctx3 = loadSrc(FILES), ids3 = ctx3.__eval(`(() => { const g = Object.keys(ITEMS).find(k => ITEMS[k].slot), m = Object.keys(ITEMS).find(k => ITEMS[k].kind === 'mat'), r = Object.keys(RUNES)[0];
    ITEMS[g].n = RUNES[r].n; ITEMS[m].n = EN.shambler.n; return [g, m, r]; })()`);
  const d3 = dupes(collect(ctx3)), got3 = d3.map(x => x.rows.map(r => r.src + '.' + r.id).sort().join()).sort();
  ok('จับได้จริงในไอเทม (อุปกรณ์ = ชื่อรูน · วัสดุ = ชื่อศัตรู)', d3.length === 2 && got3.some(s => s.includes('ITEMS.' + ids3[0]) && s.includes('RUNES.' + ids3[2])) && got3.some(s => s.includes('ITEMS.' + ids3[1]) && s.includes('EN.shambler')), JSON.stringify(got3));
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
