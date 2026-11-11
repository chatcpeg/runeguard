// test/33-items.test.mjs (lane E) — items data, bag, equip, refine, runes, drops, shop, stash, loot pickup (DESIGN §9.4 criteria E)
//   node test/33-items.test.mjs
// Runs the real src/js files in node:vm (test/_vm.mjs) with an in-memory localStorage. No dependencies.
import { loadSrc, memStorage } from './_vm.mjs';

const FILES = ['04', '05', '06', '07', '08', '15', '16', '24', '25', '26', '26a', '27', '28', '30', '31', '33', '34', '35', '40', '41', '42', '50'];
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
const note = t => console.log('  · ' + t);
const deq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const KEY = 'runeguard.save.guest';
const CLASSES = ['swordsman', 'mage', 'archer', 'cleric', 'thief'];
// a fresh context · stubs for the run-side helpers 35 calls on pickup (17/18 are not loaded here)
function fresh() {
  const log = [];
  const ctx = loadSrc(FILES, { SCREENS: [], toast() {}, addText: (x, y, s, c) => log.push(['text', s, c]), sfx: n => log.push(['sfx', n]), burst() { log.push(['burst']); },
    healP: a => { ctx.__eval('P').hp = Math.min(ctx.__eval('P').maxHp, ctx.__eval('P').hp + a); log.push(['heal', a]); } });
  const X = e => ctx.__eval(e);
  X(`loadSaveFor(null)`);
  return { ctx, X, log, ls: ctx.localStorage };
}
// a character inside SAVE (saved on every action) · gold on the account
const MK = (cls, o = {}) => `(()=>{ if(SAVE.chars.length>=BAL.CAP.chars) SAVE.chars.splice(0,1); const r=createChar('ทดสอบ${Math.random().toString(36).slice(2, 6).replace(/[^a-z]/g, 'x')}','${cls}'); if(typeof r==='string') throw new Error(r);
  SAVE.acct.gold=${o.gold ?? 100000}; ${o.lv ? `r.lv=${o.lv};` : ''} saveNow('t'); return r; })()`;

// ------------------------------------------------------------------------------------------------
console.log('§4.1–4.7 ข้อมูลไอเทม');
{
  const { X } = fresh();
  const d = X(`(()=>{ const gear=Object.keys(ITEMS).filter(id=>ITEMS[id].slot), per={}; for(const id of gear){ const s=ITEMS[id].slot; per[s]=(per[s]||0)+1; }
    const w=gear.filter(id=>ITEMS[id].slot==='weapon');
    return {n:gear.length, m2:gear.filter(id=>id!=='c_pioneer').length, per, w:w.length, wids:w.sort().join(),
      runes:Object.keys(RUNES).length, tiers:[...new Set(gear.map(id=>ITEMS[id].tier))].sort().join(),
      noName:Object.keys(ITEMS).filter(id=>!/^[\\u0E00-\\u0E7F][\\u0E00-\\u0E7F ]*$/.test(ITEMS[id].n)),
      look:gear.filter(id=>['weapon','head','body','cloak','feet'].includes(ITEMS[id].slot)&&!ITEMS[id].look),
      hats:[...new Set(gear.filter(id=>ITEMS[id].look&&ITEMS[id].look.hat).map(id=>ITEMS[id].look.hat))],
      shards:Object.keys(RUNES).every(r=>ITEMS[RUNES[r].shard]&&ITEMS[RUNES[r].shard].makes===r&&ITEMS[r]&&ITEMS[r].kind==='rune'),
      starter:['swordsman','mage','archer','cleric','thief'].map(c=>SV_WEAPON[c]).every(id=>ITEMS[id]&&ITEMS[id].tier===1&&ITEMS[id].cls[0]&&ITEMS[id].sock===0),
      acc:gear.filter(id=>['neck','ring'].includes(ITEMS[id].slot)).every(id=>!ITEMS[id].refine),
      t4:ITEMS.w_bow_4.sockRoll, might:[1,2,3,4].map(T=>ITEMS['w_sword_'+T].st.might), sw:ITEMS.w_sword_3.st, dg:ITEMS.w_dagger_4.st,
      pio:ITEMS.c_pioneer, names:{sword:ITEMS.w_sword_3.n, dagger:ITEMS.w_dagger_4.n, staff1:ITEMS.w_staff_1.n} }; })()`);
  ok('อุปกรณ์ M2 = 73 ชิ้น (+ ผ้าคลุมผู้บุกเบิก) · อาวุธ 20 = 5 ชนิด × tier 1–4', d.m2 === 73 && d.n === 74 && d.w === 20 && d.tiers === '1,2,3,4', d);
  ok('ต่อช่อง: อาวุธ 20 · มือรอง 10 · หมวก 8 · หน้า 4 · เกราะ 8 · ผ้าคลุม 5+1 · ถุงมือ 5 · รองเท้า 5 · สร้อย 4 · แหวน 4',
    deq(d.per, { weapon: 20, off: 10, head: 8, face: 4, body: 8, cloak: 6, hands: 5, feet: 5, neck: 4, ring: 4 }), d.per);
  ok('ชื่อ <ชนิด><วัสดุ>: ดาบเหล็กกล้า · มีดสั้นเงินจันทร์ · ไม้เท้าฝึกหัด · ทุกชื่อเป็นภาษาไทย', d.names.sword === 'ดาบเหล็กกล้า' && d.names.dagger === 'มีดสั้นเงินจันทร์' && d.names.staff1 === 'ไม้เท้าฝึกหัด' && d.noName.length === 0, [d.names, d.noName]);
  ok('might ต่อ tier 0.05 / 0.15 / 0.28 / 0.42 · ดาบ T3 hp +30 · มีดสั้น T4 crit/speed +0.032', deq(d.might, [0.05, 0.15, 0.28, 0.42]) && d.sw.hp === 30 && d.dg.crit === 0.032 && d.dg.speed === 0.032, [d.might, d.sw, d.dg]);
  ok('รูน 10 แบบ · ทุกรูนมีเศษ (makes) และไอเทมรูน · tier 4 สุ่มช่องรูน [1, 2, 35%] · เครื่องประดับตีบวกไม่ได้', d.runes === 10 && d.shards && deq(d.t4, [1, 2, 0.35]) && d.acc, d);
  ok('ชุดเริ่มต้น §3.8: อาวุธฝึกหัดของทุกอาชีพ (w_<type>_1 · ไม่มีช่องรูน) · ผ้าคลุมผู้บุกเบิก ขายไม่ได้ · ตำนาน', d.starter && d.pio.noSell && d.pio.rar === 3 && d.pio.unique, d.pio);
  ok('ของที่เห็นบนตัว (อาวุธ หมวก เกราะ ผ้าคลุม รองเท้า) มี look ทุกชิ้น', d.look.length === 0, d.look);
  const painted = X(`(()=>{ const builtIn=['helm','wizard','cap','hood','bandana']; return ${JSON.stringify(d.hats)}.filter(h=>!builtIn.includes(h)&&typeof HAT_EXT[h]!=='function'); })()`);
  ok('หมวกทุกแบบมีตัววาด (ของเดิมใน 14 หรือ HAT_EXT): ' + d.hats.join(', '), painted.length === 0, painted);
  // run the extra painter on a recording context (no canvas in node)
  const calls = X(`(()=>{ const rec=[]; const c=new Proxy({}, {get:(t,k)=>k in t?t[k]:(...a)=>{ rec.push(k); }, set:(t,k,v)=>{ t[k]=v; return true; }});
    HAT_EXT.leafcrown(c, Object.assign({}, CLS.mage.look, ITEMS.h_silverleaf.look), .5); return rec.length; })()`);
  ok('HAT_EXT.leafcrown วาดได้ไม่ error (' + calls + ' คำสั่ง)', calls > 20);
}

// ------------------------------------------------------------------------------------------------
console.log('§4.8 กระเป๋า: ของซ้อน · เอาออก · ความจุ');
{
  const { X } = fresh();
  const r = X(`(()=>{ const ch=${MK('mage')}; ch.inv=ch.inv.filter(x=>x.u); const o={};
    o.a=invAdd(ch,'m_dust',999); o.n1=ch.inv.filter(x=>x.id==='m_dust').map(x=>x.n);
    o.b=invAdd(ch,'m_dust',1); o.n2=ch.inv.filter(x=>x.id==='m_dust').map(x=>x.n);
    o.c=invAdd(ch,'u_potion_s',100); o.p=ch.inv.filter(x=>x.id==='u_potion_s').map(x=>x.n);
    o.cnt=invCount(ch,'m_dust');
    o.over=invRemove(ch,'m_dust',1001); o.cnt2=invCount(ch,'m_dust');
    o.rm=invRemove(ch,'m_dust',1000); o.left=ch.inv.filter(x=>x.id==='m_dust').length;
    o.bad=[0,-1,1.5,'3',NaN,null].map(n=>invRemove(ch,'u_potion_s',n)).join(); o.pAfter=invCount(ch,'u_potion_s');
    o.badAdd=[0,-3,2.5].map(n=>invAdd(ch,'m_dust',n).ok).join();
    return o; })()`);
  ok('ผงรูนซ้อนเต็ม 999 ในช่องเดียว · ชิ้นที่ 1000 ขึ้นช่องใหม่', r.a.ok && deq(r.n1, [999]) && r.b.ok && deq(r.n2, [999, 1]), r);
  ok('ยาซ้อนได้ 99 · 100 ขวด = 99 + 1', r.c.ok && deq(r.p, [99, 1]), r.p);
  ok('เอาออกเกินที่มี (1001 จาก 1000) ถูกปฏิเสธ และไม่แตะของเลย · เอาออกพอดีแล้วช่องหาย', r.cnt === 1000 && r.over === false && r.cnt2 === 1000 && r.rm === true && r.left === 0, r);
  ok('จำนวนผิดรูป (0, −1, 1.5, "3", NaN) ถูกปฏิเสธ (null = 1 ชิ้น)', r.bad === 'false,false,false,false,false,true' && r.pAfter === 99 && r.badAdd === 'false,false,false', r);
  const cap = X(`(()=>{ const ch=${MK('swordsman')}; const o={used0:itBagUsed(ch), max:itBagMax(ch)};
    while(itBagFree(ch)>0) invAdd(ch,'h_straw',1);
    o.used=itBagUsed(ch); o.len=ch.inv.length; o.full=invAdd(ch,'h_leather',1); o.stackNew=invAdd(ch,'m_seal',1);
    o.inst=invAdd(ch,makeInst('w_sword_2',{}),1); o.potion=invAdd(ch,'u_potion_s',96); o.potion2=invAdd(ch,'u_potion_s',5);
    o.pc=invCount(ch,'u_potion_s'); return o; })()`);
  ok('ของที่สวมอยู่ไม่นับในกระเป๋า: ตัวใหม่ใช้ 1/80 (ยา 3) แม้มีอาวุธอยู่ใน inv', cap.used0 === 1 && cap.max === 80, cap);
  ok('กระเป๋าเต็ม 80: ของชิ้นใหม่ / ช่องใหม่ถูกปฏิเสธ (overflow) · ของซ้อนเติมช่องเดิมได้จนเต็ม 99 แล้วจึงล้น',
    cap.used === 80 && cap.len === 81 && !cap.full.ok && cap.full.overflow === 1 && !cap.stackNew.ok && !cap.inst.ok && cap.potion.ok && !cap.potion2.ok && cap.potion2.overflow === 5 && cap.pc === 99, cap);
  const dup = X(`(()=>{ const ch=${MK('thief')}, o2=${MK('mage')}; const it=makeInst('w_dagger_2',{}); it.r=99; const a=invAdd(ch,it,1), b=invAdd(ch,it,1), c=invAdd(o2,it,1);
    const twin=Object.assign({},it), d=invAdd(o2,twin,1); SAVE.acct.stash.push(makeInst('h_straw',{})); const e=invAdd(o2,Object.assign({},SAVE.acct.stash[0]),1);
    return {a:a.ok, b:b.ok, c:c.ok, d:d.ok, e:e.ok, n:ch.inv.filter(x=>x.u===it.u).length, same:ch.inv.find(x=>x.u===it.u)===it, r:it.r}; })()`);
  ok('ใส่ instance เดิม (uid เดิม) ซ้ำไม่ได้ ทั้งกระเป๋าเดิม กระเป๋าตัวละครอื่น และ uid ที่อยู่ในคลัง · เก็บเป็น object เดิม (r ถูก clamp เป็น 10)', dup.a && !dup.b && !dup.c && !dup.d && !dup.e && dup.n === 1 && dup.same && dup.r === 10, dup);
}

// ------------------------------------------------------------------------------------------------
console.log('สวมใส่ · gearBonus · look');
{
  const { X } = fresh();
  const e = X(`(()=>{ const ch=${MK('mage')}, o={};
    o.starter=ch.eq.weapon&&ch.inv.find(x=>x.u===ch.eq.weapon).id; o.pots=invCount(ch,'u_potion_s');
    const sw=makeInst('w_sword_2',{}), st=makeInst('w_staff_2',{}), hat=makeInst('h_bluewizard',{}), cape=makeInst('c_old',{});
    for(const x of [sw,st,hat,cape]) invAdd(ch,x,1);
    o.cls=equip(ch,sw.u); o.lv=equip(ch,st.u); ch.lv=12; o.lvOk=equip(ch,st.u); o.hat=equip(ch,hat.u); o.cape=equip(ch,cape.u);
    o.worn=ch.eq.weapon===st.u; o.bag=itBagUsed(ch);
    const r=${MK('swordsman')}; r.lv=30; invAdd(r,makeInst('h_bluewizard',{}),1); o.wiz=equip(r,r.inv[r.inv.length-1].u); o.heavy=invAdd(r,makeInst('b_chain',{}),1)&&equip(r,r.inv[r.inv.length-1].u);
    o.mageHeavy=(()=>{ const m=makeInst('b_chain',{}); invAdd(ch,m,1); ch.lv=30; return equip(ch,m.u); })();
    o.noslot=[unequip(ch,'__proto__'),unequip(ch,'constructor'),unequip(ch,'hat'),unequip(ch,'face')];
    return o; })()`);
  ok('ตัวใหม่ได้อาวุธฝึกหัดของอาชีพสวมอยู่ + ยาฟื้นพลังเล็ก ×3 (§3.8)', e.starter === 'w_staff_1' && e.pots === 3, e);
  ok('สวมอาวุธอาชีพอื่นถูกปฏิเสธ ("สวมได้เฉพาะนักดาบ") · เลเวลไม่ถึงถูกปฏิเสธ ("ต้องเลเวล 12") · ครบแล้วสวมได้',
    /^สวมได้เฉพาะนักดาบ/.test(e.cls) && /^ต้องเลเวล 12/.test(e.lv) && e.lvOk === '' && e.worn, e);
  ok('ของจำกัดอาชีพ: หมวกจอมเวทครามสวมได้แค่จอมเวท · เกราะหนักใส่ได้นักดาบ/นักบวช ไม่ใช่จอมเวท', e.hat === '' && /^สวมได้เฉพาะจอมเวท/.test(e.wiz) && e.heavy === '' && /^สวมได้เฉพาะนักดาบ \/ นักบวช/.test(e.mageHeavy), e);
  ok('ช่องที่ไม่มีจริง / ว่าง ถอดไม่ได้ (__proto__ · constructor · hat · ช่องว่าง)', e.noslot[0] === 'ไม่มีช่องนี้' && e.noslot[1] === 'ไม่มีช่องนี้' && e.noslot[2] === 'ไม่มีช่องนี้' && e.noslot[3] === 'ช่องนี้ว่างอยู่', e.noslot);
  const full = X(`(()=>{ const ch=${MK('archer')}; while(itBagFree(ch)>0) invAdd(ch,'h_straw',1);
    const a=unequip(ch,'weapon'); const w=ch.eq.weapon; invRemove(ch,'h_straw',1); const b=unequip(ch,'weapon');
    return {a, still:w, b, now:ch.eq.weapon, used:itBagUsed(ch), max:ch.bagMax}; })()`);
  ok('ถอดตอนกระเป๋าเต็มถูกปฏิเสธ (ของยังสวมอยู่) · มีที่ว่าง 1 ช่องแล้วถอดได้', /^กระเป๋าเต็ม/.test(full.a) && !!full.still && full.b === '' && full.now === null && full.used === 80, full);
  const swap = X(`(()=>{ const ch=${MK('archer')}; while(itBagFree(ch)>0) invAdd(ch,'h_straw',1); const b2=makeInst('w_bow_2',{}); ch.inv.push(b2); ch.lv=12;
    const used=itBagUsed(ch), r=equip(ch,b2.u); return {r, used, after:itBagUsed(ch), w:ch.eq.weapon===b2.u}; })()`);
  ok('สลับอาวุธตอนกระเป๋าเต็มได้ (ของเก่ากลับเข้าช่องที่ของใหม่ออกมา)', swap.r === '' && swap.w && swap.after === swap.used, swap);
  // gearBonus: cd multiplies, never adds
  const b = X(`(()=>{ const ch=${MK('mage')}; ch.lv=36; const add=id=>{ const x=makeInst(id,{}); invAdd(ch,x,1); return equip(ch,x.u); };
    const r=[add('o_orb_4'), add('b_runerobe'), add('n_dimrune'), add('g_archer'), add('w_staff_4')];
    const g=gearBonus(ch), run=buildRunBonus(ch), p=makePlayer(CLS.mage); p.bonus=run; recalc(p);
    return {r, cd:g.cd, area:g.area, might:g.might, runCd:run.cd, cdMul:p.cdMul}; })()`);
  const cdx = 0.96 * 0.97 * 0.97 * 0.97;
  ok(`gearBonus คูณ cd: 0.96 × 0.97³ = ${cdx.toFixed(6)} (ไม่ใช่ผลบวก) · เข้า P.cdMul ผ่าน buildRunBonus`, b.r.every(x => x === '') && Math.abs(b.cd - cdx) < 1e-6 && Math.abs(b.cdMul - cdx) < 1e-6 && b.runCd === b.cd, b);
  ok('ค่าอื่นบวกกัน: area ลูกแก้ว 0.08 + ไม้เท้า T4 0.08 = 0.16 · might ไม้เท้า T4 0.42', Math.abs(b.area - 0.16) < 1e-9 && b.might === 0.42, b);
  // look: the worn weapon appears in P.look and in the portrait look (shLook) · +7 glow 1 · +10 aura 2
  const l = X(`(()=>{ const ch=${MK('swordsman')}, out={}; ch.lv=36;
    const mk=()=>{ const p=makePlayer(CLS.swordsman); recalc(p); p.hp=p.maxHp; prepareRun({},p,ch,'survival'); return p.look; };
    out.t1=mk(); const s4=makeInst('w_sword_4',{}); invAdd(ch,s4,1); equip(ch,s4.u); const h=makeInst('h_silverleaf',{}); invAdd(ch,h,1); equip(ch,h.u);
    const c=makeInst('c_redsilk',{}); invAdd(ch,c,1); equip(ch,c.u);
    out.t4=mk(); out.portrait=shLook(ch); s4.r=7; out.g7=mk().glow; s4.r=10; out.g10=mk().glow; s4.r=6; out.g6=mk().glow;
    ch.job='knight'; s4.r=0; out.knight=mk(); return out; })()`);
  ok('อาวุธฝึกหัดใช้สีของอาชีพ (look เดิม) · สวมดาบเงินจันทร์แล้ว P.look.weapon = sword สีเงินจันทร์', l.t1.weapon === 'sword' && l.t1.wc === '#e6edf7' && l.t4.weapon === 'sword' && l.t4.wc === '#eef3ff', [l.t1, l.t4]);
  ok('หมวก / ผ้าคลุมที่สวมอยู่ใน P.look (leafcrown · ผ้าคลุมแดง) และ portrait (shLook) ได้ look เดียวกัน', l.t4.hat === 'leafcrown' && l.t4.cape === '#b02a3a' && l.portrait.hat === 'leafcrown' && l.portrait.wc === '#eef3ff' && l.portrait.weapon === 'sword', l.portrait);
  ok('ตีบวก +7 = glow 1 · +10 = glow 2 · +6 ไม่มี', l.g7 === 1 && l.g10 === 2 && l.g6 === undefined, [l.g6, l.g7, l.g10]);
  ok('อาวุธ / ผ้าคลุมที่สวมแทน look ของอาชีพขั้นสูง (พลหอกพิทักษ์ถือดาบที่สวม ไม่ใช่หอก · ผ้าคลุมแดงแทนผ้าคลุมของอาชีพ)', l.knight.weapon === 'sword' && l.knight.cape === '#b02a3a', l.knight);
}

// ------------------------------------------------------------------------------------------------
console.log('§4.9 ตีบวก: Monte Carlo 100,000 ครั้งต่อเป้าหมาย (rngUnit แบบ seed)');
{
  const { X } = fresh();
  X(`(()=>{ globalThis.__mrUsed=0; Math.random=()=>{ globalThis.__mrUsed++; return .5; };
    SAVE.acct.gold=1e9; const ch=newChar('มอนติคาร์โล','swordsman'); ch.inv=[]; ch.eq=svEmptyEq(); globalThis.__mc=ch;   // not in SAVE → no save per try
    const it=makeInst('w_sword_3',{}); ch.inv.push(it,{id:'m_dust',n:999},{id:'m_crystal',n:999}); globalThis.__it=it; })()`);
  const res = [];
  for (let t = 1; t <= 10; t++) {
    const r = X(`(()=>{ rngUnit=mulberry(${1000 + t}); const ch=__mc, it=__it, N=100000; let ok=0, fee=0, paid=0;
      const dust=ch.inv.find(x=>x.id==='m_dust'), cr=ch.inv.find(x=>x.id==='m_crystal');
      for(let i=0;i<N;i++){ it.r=${t - 1}; it.f=0; dust.n=999; cr.n=999; if(!ch.inv.includes(dust)) ch.inv.push(dust); if(!ch.inv.includes(cr)) ch.inv.push(cr); SAVE.acct.gold=1e9;
        const g0=SAVE.acct.gold, m0=dust.n+cr.n, q=refineTry(ch,it.u,{}); if(q.res==='ok') ok++; fee+=g0-SAVE.acct.gold; paid+=m0-(dust.n+cr.n); }
      return {t:${t}, p:BAL.REFINE.p[${t}], m:ok/N, fee:fee/N, mat:paid/N}; })()`);
    res.push(r);
  }
  for (const r of res) ok(`+${r.t}: p ${r.p.toFixed(2)} · วัดได้ ${r.m.toFixed(4)} · |ต่าง| ${Math.abs(r.m - r.p).toFixed(4)} ≤ 0.005 · ค่าธรรมเนียม ${r.fee} (= 20·3·${r.t}) · วัสดุ 1 ต่อครั้ง`,
    Math.abs(r.m - r.p) <= 0.005 && r.fee === 60 * r.t && r.mat === 1, r);
  ok('ตีบวกไม่ใช้ Math.random เลย (สุ่มด้วย rngUnit ทั้งหมด)', X('__mrUsed') === 0, X('__mrUsed'));
  // the real crypto path: DEV.refine.dist
  const dist = X(`(()=>{ rngUnit=function(){ const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]/4294967296; }; return DEV.refine.dist(3,8,100000); })()`);
  ok(`RG.refine.dist(3, 8, 100000) ด้วย crypto จริง: p 0.38 · วัดได้ ${dist.measured} (ต่าง ${dist.diff}) · ค่าธรรมเนียม 480`, Math.abs(dist.diff) <= 0.005 && dist.p === 0.38 && dist.fee === 480 && dist.mat === 'm_crystal', dist);
}

// ------------------------------------------------------------------------------------------------
console.log('§4.9 ความเพียร (pity) และกติกาล้มเหลว');
{
  const { X, ls } = fresh();
  const p = X(`(()=>{ const ch=${MK('swordsman')}; const it=makeInst('w_sword_2',{}); invAdd(ch,it,1); invAdd(ch,'m_crystal',50); invAdd(ch,'m_seal',20); it.r=7;
    rngUnit=()=>.99999; const ps=[], fs=[]; for(let k=0;k<8;k++){ const q=refineTry(ch,it.u,{seal:true}); ps.push(q.p); fs.push(it.f); }
    const before=refineInfo(it).p; rngUnit=()=>0; const s=refineTry(ch,it.u,{}); return {ps, fs, before, s, f:it.f, after:refineInfo(it).p, r:it.r}; })()`);
  const want = [0.38, 0.42, 0.46, 0.50, 0.54, 0.58, 0.58, 0.58];
  ok('ครั้งที่ k ติดกันใช้ p + 0.04k (สูงสุด +0.20): +8 = ' + p.ps.join(' → '), p.ps.every((v, i) => Math.abs(v - want[i]) < 1e-9) && deq(p.fs, [1, 2, 3, 4, 5, 5, 5, 5]), p);
  ok('สำเร็จแล้วความเพียรรีเซ็ตเป็น 0 (+7 → +8 ด้วย p 0.58 · ครั้งถัดไป +9 = 0.26)', p.s.res === 'ok' && p.s.p === 0.58 && p.f === 0 && p.r === 8 && p.after === 0.26, p);
  const mcp = X(`(()=>{ rngUnit=mulberry(77); const inst={u:'i_pity', id:'w_rod_3', r:7, f:3, s:[], lk:0}, ri=refineInfo(inst); let ok=0; for(let i=0;i<100000;i++) if(rngUnit()<ri.p) ok++; return {p:ri.p, m:ok/100000}; })()`);
  ok(`Monte Carlo ที่ความเพียร 3 (+8): p = 0.38 + 0.12 = ${mcp.p} · วัดได้ ${mcp.m.toFixed(4)}`, mcp.p === 0.5 && Math.abs(mcp.m - 0.5) <= 0.005, mcp);
  const fr = X(`(()=>{ const ch=${MK('cleric', { gold: 5000 })}; const it=makeInst('w_rod_3',{}); invAdd(ch,it,1); invAdd(ch,'m_dust',10); invAdd(ch,'m_crystal',10); invAdd(ch,'m_seal',2);
    const step=(r,o)=>{ it.r=r; it.f=0; const g=SAVE.acct.gold, d=invCount(ch,'m_dust'), c=invCount(ch,'m_crystal'), s=invCount(ch,'m_seal'), q=refineTry(ch,it.u,o||{});
      return {res:q.res, from:q.from, to:q.to, r:it.r, gold:g-SAVE.acct.gold, dust:d-invCount(ch,'m_dust'), cr:c-invCount(ch,'m_crystal'), seal:s-invCount(ch,'m_seal'), inBag:!!itFind(ch,it.u)}; };
    rngUnit=()=>.99999; const o={};
    o.k5=step(4); o.k6=step(5); o.d7=step(6); o.d10=step(9); o.s8=step(7,{seal:true}); o.s6=step(5,{seal:true});
    o.noSeal=(()=>{ invRemove(ch,'m_seal',invCount(ch,'m_seal')); it.r=8; return refineTry(ch,it.u,{seal:true}); })();
    rngUnit=()=>0; o.u4=step(3); o.max=(()=>{ it.r=10; return refineTry(ch,it.u,{}); })();
    o.poor=(()=>{ it.r=9; SAVE.acct.gold=599; const q=refineTry(ch,it.u,{}); return {q, gold:SAVE.acct.gold, r:it.r}; })();
    o.noMat=(()=>{ SAVE.acct.gold=5000; invRemove(ch,'m_crystal',invCount(ch,'m_crystal')); it.r=7; return refineTry(ch,it.u,{}); })();
    o.acc=(()=>{ const n=makeInst('n_fang',{}); invAdd(ch,n,1); return refineTry(ch,n.u,{}); })();
    return o; })()`);
  ok('+5/+6 ล้มเหลว: คงระดับเดิม · หักผงรูน 1 และทอง 20·3·เป้า', fr.k5.res === 'keep' && fr.k5.r === 4 && fr.k5.dust === 1 && fr.k5.gold === 300 && fr.k6.res === 'keep' && fr.k6.r === 5 && fr.k6.gold === 360, [fr.k5, fr.k6]);
  ok('+7 ถึง +10 ล้มเหลว: −1 (+6 → +7 พลาด = +5 · +9 → +10 พลาด = +8) · หักผลึกรูน 1', fr.d7.res === 'down' && fr.d7.r === 5 && fr.d7.cr === 1 && fr.d7.gold === 420 && fr.d10.res === 'down' && fr.d10.r === 8 && fr.d10.cr === 1, [fr.d7, fr.d10]);
  ok('มียันต์ผนึก: ไม่ลด (คง +7) · ใช้ยันต์ 1 · +5/+6 ติ๊กยันต์ไว้ก็ไม่เสียยันต์ (ไม่มีโอกาสลด)', fr.s8.res === 'keep' && fr.s8.r === 7 && fr.s8.seal === 1 && fr.s8.cr === 1 && fr.s6.seal === 0 && fr.s6.res === 'keep', [fr.s8, fr.s6]);
  ok('ติ๊กยันต์แต่ไม่มียันต์ → ไม่ตีให้ (ไม่เสียอะไร)', fr.noSeal.res === '' && fr.noSeal.why === 'ไม่มียันต์ผนึก', fr.noSeal);
  ok('+1 ถึง +4 สำเร็จเสมอ · +10 ตีต่อไม่ได้ · ทองไม่พอ/วัสดุไม่พอ ถูกปฏิเสธและไม่หักอะไร · สร้อยคอตีบวกไม่ได้',
    fr.u4.res === 'ok' && fr.u4.r === 4 && fr.max.res === '' && /\+10 แล้ว/.test(fr.max.why) && fr.poor.q.res === '' && fr.poor.gold === 599 && fr.poor.r === 9 && /^ต้องใช้ผลึกรูน/.test(fr.noMat.why) && fr.acc.why === 'ไอเทมนี้ตีบวกไม่ได้', fr);
  ok('ไม่มีไอเทมหายในทุกผลลัพธ์ (ยังอยู่ในกระเป๋า uid เดิม)', ['k5', 'k6', 'd7', 'd10', 's8', 's6', 'u4'].every(k => fr[k].inBag), fr);
  // never below +0: make +1 a failing "down" step in a copy of the table
  const floor = X(`(()=>{ const P0=BAL.REFINE.p.slice(), F0=BAL.REFINE.fail.slice(); BAL.REFINE.p[1]=0; BAL.REFINE.fail[1]='down';
    const ch=${MK('thief')}; const it=makeInst('w_dagger_1',{}); invAdd(ch,it,1); invAdd(ch,'m_dust',3); rngUnit=()=>.5; const q=refineTry(ch,it.u,{});
    BAL.REFINE.p=P0; BAL.REFINE.fail=F0; return {q, r:it.r}; })()`);
  ok('ระดับไม่มีวันต่ำกว่า +0 (บังคับให้ +0 → +1 ล้มเหลวแบบลดระดับ: ยังเป็น +0)', floor.q.res === 'down' && floor.r === 0 && floor.q.to === 0, floor);
  // write-ahead: the stored save already holds the result when refineTry returns (before any animation)
  const wa = X(`(()=>{ const ch=${MK('mage', { gold: 3000 })}; const it=makeInst('w_staff_3',{}); invAdd(ch,it,1); invAdd(ch,'m_crystal',2); it.r=8; saveNow('t');
    rngUnit=()=>.99999; const q=refineTry(ch,it.u,{}); const s=JSON.parse(STORE.get('${KEY}')), c=s.chars.find(x=>x.id===ch.id), si=c.inv.find(x=>x.u===it.u);
    return {q, r:si.r, f:si.f, gold:s.acct.gold, cr:(c.inv.find(x=>x.id==='m_crystal')||{n:0}).n, saved:q.saved}; })()`);
  ok('write-ahead: เซฟใน localStorage มีผลพลาด (+8 → +7 · ความเพียร 1) ทองและผลึกถูกหักแล้ว ตั้งแต่ก่อน refineTry คืนค่า', wa.q.res === 'down' && wa.r === 7 && wa.f === 1 && wa.gold === 3000 - 540 && wa.cr === 1 && wa.saved === true, wa);
  const raw0 = ls.getItem(KEY);
  // "reopen the tab": a fresh context on the same storage → the failure is still there, materials still gone
  const re = fresh(); for (const k of [KEY, KEY + '.bak']) { const v = ls.getItem(k); if (v != null) re.ls.setItem(k, v); }
  const back = re.X(`(()=>{ loadSaveFor(null); const c=SAVE.chars.find(x=>x.inv.some(i=>i.id==='w_staff_3')); const i=c.inv.find(x=>x.id==='w_staff_3'); return {r:i.r, f:i.f, cr:invCount(c,'m_crystal'), gold:SAVE.acct.gold}; })()`);
  ok('เปิดใหม่ (โหลดเซฟเดิม): ยังเป็น +7 ความเพียร 1 · ผลึกรูนเหลือ 1 · ไม่มีทางสุ่มใหม่', back.r === 7 && back.f === 1 && back.cr === 1 && back.gold === 2460 && !!raw0, back);
}

// ------------------------------------------------------------------------------------------------
console.log('§4.10 รูน: ฝัง · ถอด (ได้รูนคืน) · รวมเศษ');
{
  const { X } = fresh();
  const r = X(`(()=>{ const ch=${MK('archer', { gold: 2000 })}; ch.lv=24; const b=makeInst('w_bow_3',{}), h=makeInst('h_straw',{}), c=makeInst('b_leather',{sockets:1}); for(const x of [b,h,c]) invAdd(ch,x,1);
    invAdd(ch,'rn_spitter',1); invAdd(ch,'rn_brute',1); const o={};
    o.wrong=socketRune(ch,b.u,'rn_brute',0); o.none=socketRune(ch,h.u,'rn_spitter',0); o.idx=[socketRune(ch,b.u,'rn_spitter',1),socketRune(ch,b.u,'rn_spitter',-1),socketRune(ch,b.u,'rn_spitter','0')];
    o.ok=socketRune(ch,b.u,'rn_spitter',0); o.cnt=invCount(ch,'rn_spitter'); o.name=itemName(b); o.full=socketRune(ch,b.u,'rn_spitter',0);
    equip(ch,b.u); o.bonus=gearBonus(ch).crit; o.inst=itInstBonus(b);
    o.armor=socketRune(ch,c.u,'rn_brute',0);
    const g0=SAVE.acct.gold; o.un=unsocketRune(ch,b.u,0); o.back=invCount(ch,'rn_spitter'); o.fee=g0-SAVE.acct.gold; o.slot=b.s[0]; o.name2=itemName(b); o.empty=unsocketRune(ch,b.u,0);
    o.hostile=[socketRune(ch,b.u,'__proto__',0),socketRune(ch,b.u,'constructor',0),socketRune(ch,'__proto__','rn_spitter',0),unsocketRune(ch,'toString',0)];
    return o; })()`);
  ok('ฝังได้เฉพาะกลุ่มที่ตรง (รูนเกราะลงอาวุธไม่ได้) · ไอเทมไม่มีช่อง / ช่องผิด ถูกปฏิเสธ', /ใส่ได้เฉพาะช่องกลุ่มเกราะ/.test(r.wrong) && r.none === 'ไอเทมนี้ไม่มีช่องรูน' && r.idx.every(x => x === 'ไม่มีช่องรูนนี้') && r.armor === '', r);
  ok('ฝังฟรี: รูนออกจากกระเป๋า · ชื่อเป็น "ธนูเหล็กกล้า ◆" · ช่องที่มีรูนแล้วฝังซ้ำไม่ได้', r.ok === '' && r.cnt === 0 && r.name === 'ธนูเหล็กกล้า ◆' && /มีรูนอยู่แล้ว/.test(r.full), r);
  ok('รูนในอาวุธที่สวมเข้า gearBonus (ธนู T3 crit 0.03 + รูน 0.03)', Math.abs(r.bonus - 0.06) < 1e-9 && Math.abs(r.inst.crit - 0.06) < 1e-9, r);
  ok('ถอดรูน: ค่าบริการ 100·tier = 300 ทอง · ได้รูนคืนเข้ากระเป๋า · ช่องกลับเป็น ◇', r.un === '' && r.back === 1 && r.fee === 300 && r.slot === null && r.name2 === 'ธนูเหล็กกล้า ◇' && r.empty === 'ช่องนี้ว่างอยู่', r);
  ok('id แปลก (__proto__ / constructor / toString) ฝัง/ถอดไม่ได้', r.hostile[0] === 'ไม่พบรูนนี้' && r.hostile[1] === 'ไม่พบรูนนี้' && /ไม่พบไอเทม/.test(r.hostile[2]) && /ไม่พบไอเทม/.test(r.hostile[3]), r.hostile);
  const full = X(`(()=>{ const ch=${MK('swordsman', { gold: 1000 })}; ch.lv=12; const s=makeInst('w_sword_2',{}); invAdd(ch,s,1); invAdd(ch,'rn_spitter',1); socketRune(ch,s.u,'rn_spitter',0);
    while(itBagFree(ch)>0) invAdd(ch,'h_straw',1); const g=SAVE.acct.gold, a=unsocketRune(ch,s.u,0); return {a, gold:g-SAVE.acct.gold, still:s.s[0]}; })()`);
  ok('ถอดรูนตอนกระเป๋าเต็มถูกปฏิเสธ (ไม่หักทอง · รูนยังอยู่ในช่อง)', /^กระเป๋าเต็ม/.test(full.a) && full.gold === 0 && full.still === 'rn_spitter', full);
  const cb = X(`(()=>{ const ch=${MK('mage', { gold: 500 })}; const o={};
    invAdd(ch,'m_shard_bat',3); o.few=combineShards(ch,'m_shard_bat'); o.why=itCombineCheck(ch,'m_shard_bat');
    invAdd(ch,'m_shard_bat',5); o.r1=combineShards(ch,'m_shard_bat'); o.left=invCount(ch,'m_shard_bat'); o.rune=invCount(ch,'rn_bat'); o.gold=SAVE.acct.gold;
    o.r2=combineShards(ch,'m_shard_bat'); o.poor=itCombineCheck(ch,'m_shard_bat'); o.gold2=SAVE.acct.gold;
    o.hostile=[combineShards(ch,'__proto__'),combineShards(ch,'constructor'),combineShards(ch,'m_dust'),combineShards(ch,'rn_bat')].join('|');
    // bag full, but the 4 shards are the whole last stack → that slot frees up for the rune
    SAVE.acct.gold=1000; ch.inv=ch.inv.filter(x=>x.u); invAdd(ch,'m_shard_wraith',4); while(itBagFree(ch)>0) invAdd(ch,'h_straw',1);
    o.tight=combineShards(ch,'m_shard_wraith'); o.tr=invCount(ch,'rn_wraith'); return o; })()`);
  ok('รวมเศษ 4 ชิ้น + 300 ทอง → รูน 1 ชิ้น · เศษไม่พอ / ทองไม่พอ ถูกปฏิเสธ', cb.few === '' && /4 ชิ้น \(มี 3\)/.test(cb.why) && cb.r1 === 'rn_bat' && cb.left === 4 && cb.rune === 1 && cb.gold === 200 && cb.r2 === '' && /^ทองไม่พอ/.test(cb.poor) && cb.gold2 === 200, cb);
  ok('รวมเศษ: id แปลก / ไม่ใช่เศษ ไม่ได้รูน · กระเป๋าเต็มแต่เศษหมดกองพอดี = ได้รูน', cb.hostile === '|||' && cb.tight === 'rn_wraith' && cb.tr === 1, cb);
}

// ------------------------------------------------------------------------------------------------
console.log('§4.12 ตารางดรอป · rollDrops');
{
  const { X } = fresh();
  const d = X(`(()=>{ const o={}; Math.random=()=>{ throw new Error('Math.random ถูกเรียก'); };
    itDropRng=mulberry(9); const N=20000, h={}; let gear=0, tiers={};
    for(let i=0;i<N;i++) for(const it of rollDrops('surv.elite',1,{T:0})){ h[it.id]=(h[it.id]||0)+(it.n||1); if(it.u){ gear++; const t=ITEMS[it.id].tier; tiers[t]=(tiers[t]||0)+1; } }
    o.dust=h.m_dust/N; o.shard=Object.keys(h).filter(k=>k.startsWith('m_shard_')).reduce((a,k)=>a+h[k],0)/N; o.gear=gear/N; o.tiers=tiers;
    o.bossShards=['m_shard_colossus','m_shard_lich','m_shard_king'].some(k=>h[k]);
    o.luck=(()=>{ let s=0; for(let i=0;i<N;i++) s+=rollDrops('surv.elite',2,{T:0}).filter(it=>it.u).length; return s/N; })();
    o.gt=[0,1,2,3,4,5,6,7,8,10].map(T=>{ const x=rollDrops('surv.boss5',1,{T}).find(it=>it.u); return ITEMS[x.id].tier; });
    o.b20=[0,2,4,6].map(T=>{ const x=rollDrops('surv.boss20',1,{T}).find(it=>it.u); return ITEMS[x.id].tier; });
    o.b10=rollDrops('surv.boss10',1,{T:0}).map(x=>x.u?'gear':x.id+':'+x.n).join();
    o.b20c=rollDrops('surv.boss20',1,{T:0}).filter(x=>!x.u).map(x=>x.id+':'+x.n).join();
    itDropRng=mulberry(4); const a=JSON.stringify(rollDrops('surv.boss20',3,{T:3}).map(x=>[x.id,x.n,x.s])); itDropRng=mulberry(4); const b=JSON.stringify(rollDrops('surv.boss20',3,{T:3}).map(x=>[x.id,x.n,x.s]));
    o.same=a===b; o.hostile=['__proto__','constructor','surv.__proto__','surv.constructor','toString','surv','shardSets.surv',null,42].map(t=>rollDrops(t,1).length).join();
    o.t4sock=(()=>{ let two=0, n=4000; for(let i=0;i<n;i++) if(makeInst('w_bow_4',{}).s.length===2) two++; return two/n; })();
    o.c={}; for(const k in BAL.DROP.surv) o.c[k]=1; o.ref=['elite','boss5','boss10','boss15','boss20'].every(k=>Array.isArray(itTable('surv.'+k)));
    o.unique=Object.values(IT_POOL).flat().some(id=>ITEMS[id].unique);
    return o; })()`);
  ok(`elite: ผงรูน 1–2 (เฉลี่ย ${d.dust.toFixed(3)}) · เศษรูน 25% (${(d.shard * 100).toFixed(1)}%) · อุปกรณ์ 12% (${(d.gear * 100).toFixed(1)}%) · tier ตามระดับ (T0 = tier 1)`,
    Math.abs(d.dust - 1.5) < 0.02 && Math.abs(d.shard - 0.25) < 0.01 && Math.abs(d.gear - 0.12) < 0.008 && deq(Object.keys(d.tiers), ['1']) && !d.bossShards, d);
  ok(`โชค (luckMul 2) คูณโอกาส: อุปกรณ์ 12% → ${(d.luck * 100).toFixed(1)}%`, Math.abs(d.luck - 0.24) < 0.012, d.luck);
  ok('gearTier = min(5, 1 + floor(T/2)) · M2 มีถึง tier 4 (T8+ ได้ tier 4): T0–10 = ' + d.gt.join(','), deq(d.gt, [1, 1, 2, 2, 3, 3, 4, 4, 4, 4]), d.gt);
  ok('บอสคลื่น 20: อุปกรณ์ tier+1 · ผลึกรูน ×2 · บอสคลื่น 10: อุปกรณ์ + ผลึกรูน ×1', deq(d.b20, [2, 3, 4, 4]) && d.b20c.startsWith('m_crystal:2') && d.b10 === 'gear,m_crystal:1', d);
  ok('ใช้ rng ของดรอปเท่านั้น (Math.random ไม่ถูกเรียก) · seed เดียวกันได้ผลเดียวกัน · tier 4 ได้ 2 ช่อง ≈ 35% (' + (d.t4sock * 100).toFixed(1) + '%)', d.same && Math.abs(d.t4sock - 0.35) < 0.03, d);
  ok('ชื่อตารางแปลก / ไม่ใช่ตาราง → [] (ไม่หลุดไป Object.prototype)', d.hostile === '0,0,0,0,0,0,0,0,0', d.hostile);
  ok('ตาราง surv อ้างด้วยชื่อได้ครบ (surv.elite · boss5/10/15/20) · ของ unique ไม่อยู่ในกองดรอป', d.ref && !d.unique, d);
  note('BAL.DROP.surv ตอนนี้มี key: ' + (Object.keys(d.c).join(', ') || '(ว่าง · รอ CR ของ lane C ให้ชี้มาที่ DROPS)'));
  const sv = X(`(()=>{ const ch=${MK('cleric')}; G={char:ch, tier:2, wave:5, loot:[], gems:[]}; P={drop:0}; itDropRng=mulberry(3);
    BAL.DROP.surv={elite:'surv.elite', boss5:'surv.boss5'}; MODES.survival.onKill({boss:1}); const got=G.loot.slice(); BAL.DROP.surv={}; G=null; P=null;
    return got.map(x=>x.u?ITEMS[x.id].tier:x.id); })()`);
  ok('ทางของโหมดเอาชีวิตรอดจริง: BAL.DROP.surv.boss5 = "surv.boss5" → MODES.survival.onKill ใส่ของลง G.loot (T2 → tier 2)', sv.includes(2), sv);
}

// ------------------------------------------------------------------------------------------------
console.log('§4.11 ร้าน · ทอง · ราคา');
{
  const { X } = fresh();
  const s = X(`(()=>{ const o={}; const bad=[]; for(const id of SHOP.gold){ const b=itBuyPrice(id,'gold'); const d=ITEMS[id];
      const sMax=d.slot?(d.refine?itSellPrice({id, r:10}):itSellPrice({id, r:0})):itSellPrice(id); if(!(b>0)||!(sMax<b)) bad.push(id+':'+b+'/'+sMax); }
    o.bad=bad; o.n=SHOP.gold.length; o.prices=['u_potion_s','u_potion_l','m_dust','u_forget','w_sword_1','w_sword_2'].map(id=>itBuyPrice(id,'gold'));
    o.sells=['u_potion_s','m_dust','m_crystal','m_seal','m_shard_bat','rn_bat'].map(itSellPrice).concat([itSellPrice({id:'w_sword_3',r:0}), itSellPrice({id:'w_sword_3',r:7}), itSellPrice('c_pioneer'), itSellPrice('u_forget')]);
    o.marks=['m_seal','m_crystal','u_bag10','u_dye_red'].map(id=>itBuyPrice(id,'marks')); o.noGoldCrystal=itBuyPrice('m_crystal','gold');
    o.t3=SHOP.gold.some(id=>ITEMS[id].tier>2); o.pio=SHOP.gold.includes('c_pioneer');
    o.rune=itSellPrice('rn_bat')<4*itSellPrice('m_shard_bat')+BAL.PRICE.combine;
    return o; })()`);
  ok(`ร้านป้านวล ${s.n} รายการ: ทุกรายการราคาขายคืน (แม้ตีบวก +10) ต่ำกว่าราคาซื้อ`, s.bad.length === 0 && s.n > 40, s.bad);
  ok('ราคาตาม §4.6: ยาเล็ก 30 · ยาใหญ่ 120 · ผงรูน 80 · ม้วนลืมเลือน 2,000 · อุปกรณ์ T1 75 · T2 300 (15·tier² × 5)', deq(s.prices, [30, 120, 80, 2000, 75, 300]), s.prices);
  ok('ราคาขาย: ยา 8 · ผง 20 · ผลึก 150 · ยันต์ 300 · เศษ 10 · รูน 80 · ดาบ T3 135 → +7 = 230 · ผ้าคลุมผู้บุกเบิก / ม้วนลืมเลือน ขายไม่ได้',
    deq(s.sells, [8, 20, 150, 300, 10, 80, 135, 230, 0, 0]), s.sells);
  ok('ร้านตรา (M5): ยันต์ 50 · ผลึก 12 · ถุง 60 · สีย้อม 20 · ผลึกรูนไม่ขายด้วยทอง · ร้านทองมีแค่ tier 1–2 และไม่มีของ unique', deq(s.marks, [50, 12, 60, 20]) && s.noGoldCrystal === 0 && !s.t3 && !s.pio && s.rune, s);
  const b = X(`(()=>{ const ch=${MK('thief', { gold: 90 })}, o={};
    o.poor=buyItem(ch,'u_potion_l',1); o.g1=SAVE.acct.gold; o.exact=buyItem(ch,'u_potion_s',3); o.g2=SAVE.acct.gold; o.zero=buyItem(ch,'u_potion_s',1); o.g3=SAVE.acct.gold;
    o.cnt=invCount(ch,'u_potion_s');
    SAVE.acct.gold=1000; o.bad=[0,-2,1.5,1000,'2'].map(n=>buyItem(ch,'m_dust',n)); o.g4=SAVE.acct.gold;
    o.notSold=[buyItem(ch,'m_crystal',1), buyItem(ch,'w_sword_3',1), buyItem(ch,'c_pioneer',1), buyItem(ch,'m_shard_bat',1)];
    o.hostile=['__proto__','constructor','toString','hasOwnProperty'].map(id=>buyItem(ch,id,1)); o.g5=SAVE.acct.gold;
    o.marks=buyItem(ch,'m_seal',1,{cur:'marks'}); SAVE.acct.marks=60; o.marks2=buyItem(ch,'m_seal',1,{cur:'marks'}); o.mk=SAVE.acct.marks; o.seal=invCount(ch,'m_seal');
    while(itBagFree(ch)>0) invAdd(ch,'h_straw',1); o.fullGear=buyItem(ch,'h_leather',1); o.fullStack=buyItem(ch,'m_dust',1); o.okStack=buyItem(ch,'u_potion_s',2); o.g6=SAVE.acct.gold;
    const raw=JSON.parse(STORE.get('${KEY}')); o.stored=raw.acct.gold===SAVE.acct.gold;
    return o; })()`);
  ok('ทองไม่พอถูกปฏิเสธ · ซื้อพอดีทองหมด = 0 (ไม่ติดลบ) · หมดแล้วซื้อต่อไม่ได้', /^ทองไม่พอ/.test(b.poor) && b.g1 === 90 && b.exact === '' && b.g2 === 0 && /^ทองไม่พอ/.test(b.zero) && b.g3 === 0 && b.cnt === 6, b);
  ok('จำนวนผิดรูป (0, −2, 1.5, 1000, "2") ถูกปฏิเสธ ไม่หักทอง', b.bad.every(x => x === 'จำนวนไม่ถูกต้อง') && b.g4 === 1000, b.bad);
  ok('ของที่ร้านไม่ขาย / id แปลก (__proto__ constructor toString hasOwnProperty) ซื้อไม่ได้ ไม่หักทอง', b.notSold.every(x => /^ร้านนี้ไม่ได้ขาย/.test(x)) && b.hostile.every(x => x === 'ไม่พบสินค้านี้') && b.g5 === 1000, b);
  ok('ซื้อด้วยตรา: ตราไม่พอถูกปฏิเสธ · มี 60 ซื้อยันต์ 50 เหลือ 10', /^ตราผู้พิชิตไม่พอ/.test(b.marks) && b.marks2 === '' && b.mk === 10 && b.seal === 1, b);
  ok('กระเป๋าเต็ม: ซื้อของชิ้นใหม่ไม่ได้ (ไม่หักทอง) · ของที่ซ้อนกองเดิมได้ยังซื้อได้ · ทองในเซฟตรงกับในหน่วยความจำ (write-ahead)', /^กระเป๋าเต็ม/.test(b.fullGear) && /^กระเป๋าเต็ม/.test(b.fullStack) && b.okStack === '' && b.g6 === 1000 - 60 && b.stored, b);
  const se = X(`(()=>{ const ch=${MK('cleric', { gold: 0 })}, o={}; ch.lv=24;
    const a=makeInst('w_rod_3',{}), l=makeInst('h_steel',{}), r=makeInst('b_leather',{sockets:1}), p=makeInst('c_pioneer',{}); for(const x of [a,l,r,p]) invAdd(ch,x,1); a.r=7;
    o.worn=sellItem(ch,ch.eq.weapon); o.wornWhy=itSellCheck(ch,ch.eq.weapon);
    itLock(ch,l.u,true); o.lock=sellItem(ch,l.u); o.lockWhy=itSellCheck(ch,l.u);
    invAdd(ch,'rn_brute',1); socketRune(ch,r.u,'rn_brute',0); o.rune=sellItem(ch,r.u); o.runeWhy=itSellCheck(ch,r.u);
    o.pio=sellItem(ch,p.u); o.g0=SAVE.acct.gold;
    o.a=sellItem(ch,a.u); o.ga=SAVE.acct.gold; o.again=sellItem(ch,a.u); o.gone=!itFind(ch,a.u);
    o.potOver=sellItem(ch,'u_potion_s',4); o.pot=sellItem(ch,'u_potion_s',3); o.gp=SAVE.acct.gold; o.potLeft=invCount(ch,'u_potion_s');
    o.hostile=['__proto__','constructor','toString','valueOf'].map(x=>sellItem(ch,x,1)).join();
    SAVE.acct.gold=BAL.CAP.gold-10; invAdd(ch,'m_seal',1); o.cap=sellItem(ch,'m_seal',1); o.gcap=SAVE.acct.gold;
    SAVE.acct.gold=0; itLock(ch,l.u,false); invAdd(ch,'h_straw',2); const c=makeInst('c_old',{}); invAdd(ch,c,1); itLock(ch,c.u,true);
    o.all=sellAllCommon(ch); o.left=ch.inv.filter(x=>x.u).map(x=>x.id).sort().join();
    return o; })()`);
  ok('ขายไม่ได้: ของที่สวมอยู่ · ของล็อก · ของที่มีรูน (ต้องถอดก่อน) · ผ้าคลุมผู้บุกเบิก → ได้ 0 ทอง', se.worn === 0 && /^ถอดออกก่อน/.test(se.wornWhy) && se.lock === 0 && se.lockWhy === 'ไอเทมนี้ล็อกไว้' && se.rune === 0 && /^ถอดรูน/.test(se.runeWhy) && se.pio === 0 && se.g0 === 0, se);
  ok('ขายคทา T3 +7 = 230 ทอง · ขายซ้ำ uid เดิมไม่ได้ (ไม่มีเงินซ้ำ)', se.a === 230 && se.ga === 230 && se.again === 0 && se.gone, se);
  ok('ขายยาเกินที่มีถูกปฏิเสธ · ขาย 3 = 24 ทอง · id แปลกขายไม่ได้', se.potOver === 0 && se.pot === 24 && se.gp === 254 && se.potLeft === 0 && se.hostile === '0,0,0,0', se);
  ok('ทองไม่เกินเพดาน 999,999,999', se.cap === 300 && se.gcap === 999999999, se);
  ok('[ขายของธรรมดาทั้งหมด] ไม่รวมของล็อก / ที่สวม / ที่มีรูน / ขายไม่ได้: ได้ 165 (หมวกเหล็กกล้า 135 + หมวกฟาง 15 × 2)',
    se.all === 135 + 15 * 2 && se.left === ['b_leather', 'c_old', 'c_pioneer', 'w_rod_1'].sort().join(), se);
}

// ------------------------------------------------------------------------------------------------
console.log('§4.8 คลัง (ใช้ร่วมทั้งบัญชี) · ไม่มีของซ้ำจากการย้าย');
{
  const { X } = fresh();
  const m = X(`(()=>{ const a=${MK('swordsman')}, b=${MK('mage')}, o={}; a.lv=12;
    const s=makeInst('w_sword_2',{}); invAdd(a,s,1); invAdd(a,'m_dust',1500);
    o.worn=stashMove(a,a.eq.weapon,true);
    o.mv=stashMove(a,s.u,true); o.inBag=!!itFind(a,s.u); o.inStash=SAVE.acct.stash.filter(x=>x.u===s.u).length; o.same=SAVE.acct.stash.includes(s);
    o.twice=stashMove(a,s.u,true);
    o.other=stashMove(b,s.u,false); o.bBag=!!itFind(b,s.u); o.after=SAVE.acct.stash.filter(x=>x.u===s.u).length; o.back=stashMove(a,s.u,false);
    o.dust=stashMove(a,'m_dust',true,1200); o.dBag=invCount(a,'m_dust'); o.dSt=SAVE.acct.stash.filter(x=>x.id==='m_dust').map(x=>x.n);
    o.over=stashMove(a,'m_dust',true,301); o.all=stashMove(a,'m_dust',true); o.dBag2=invCount(a,'m_dust');
    o.toB=stashMove(b,'m_dust',false,1000); o.total=invCount(a,'m_dust')+invCount(b,'m_dust')+SAVE.acct.stash.filter(x=>x.id==='m_dust').reduce((n,x)=>n+x.n,0);
    o.hostile=['__proto__','constructor','toString'].map(x=>stashMove(a,x,true)).join('|'); o.stored=JSON.parse(STORE.get('${KEY}')).acct.stash.length===SAVE.acct.stash.length;
    SAVE.acct.stashMax=60; while(SAVE.acct.stash.length<60) SAVE.acct.stash.push(makeInst('h_straw',{})); const h=makeInst('h_leather',{}); invAdd(a,h,1);
    o.full=stashMove(a,h.u,true); o.fullBack=(()=>{ while(itBagFree(b)>0) invAdd(b,'h_straw',1); return stashMove(b,SAVE.acct.stash.find(x=>x.u).u,false); })();
    return o; })()`);
  ok('ของที่สวมอยู่ย้ายเข้าคลังไม่ได้', /^ถอดออกก่อน/.test(m.worn), m);
  ok('ย้ายเข้าคลัง: ชิ้นเดิม (object เดียวกัน) ออกจากกระเป๋า · อยู่ในคลัง 1 ชิ้น · ย้ายซ้ำไม่ได้', m.mv === '' && !m.inBag && m.inStash === 1 && m.same && /^ไม่พบ/.test(m.twice), m);
  ok('ตัวละครอีกตัวหยิบจากคลังได้ (คลังใช้ร่วม) · ไม่เหลือในคลัง · ตัวแรกหยิบซ้ำไม่ได้', m.other === '' && m.bBag && m.after === 0 && /^ไม่พบ/.test(m.back), m);
  ok('ของซ้อน: ย้าย 1,200 จาก 1,500 → คลัง [999, 201] · ย้ายเกินที่เหลือถูกปฏิเสธ · ย้ายทั้งหมด · รวมทุกที่ยังเป็น 1,500', m.dust === '' && m.dBag === 300 && deq(m.dSt, [999, 201]) && m.over === 'จำนวนไม่ถูกต้อง' && m.all === '' && m.dBag2 === 0 && m.toB === '' && m.total === 1500, m);
  ok('คลังเต็ม 60 / กระเป๋าเต็ม ถูกปฏิเสธ · id แปลกย้ายไม่ได้ · เซฟถูกเขียนแล้ว', m.full === 'คลังเต็ม' && m.fullBack === 'กระเป๋าเต็ม' && m.hostile === 'ไม่พบไอเทมนี้|ไม่พบไอเทมนี้|ไม่พบไอเทมนี้' && m.stored, m);
}

// ------------------------------------------------------------------------------------------------
console.log('id แปลกทุกทาง (own-property เท่านั้น)');
{
  const { X } = fresh();
  const h = X(`(()=>{ const ch=${MK('mage')}, bad=['__proto__','constructor','toString','hasOwnProperty','valueOf','isPrototypeOf'], o={};
    o.def=bad.map(itemDef).every(x=>x===null); o.add=bad.every(id=>!invAdd(ch,id,1).ok); o.cnt=bad.every(id=>invCount(ch,id)===0); o.rm=bad.every(id=>invRemove(ch,id,1)===false);
    o.inst=bad.every(id=>!invAdd(ch,{u:'i_evil1',id,r:0,s:[]},1).ok); o.mk=bad.every(id=>makeInst(id,{})===null);
    o.name=bad.every(id=>itemName({id})===''&&itemName({u:'i_x',id})===''); o.ri=bad.every(id=>refineInfo({u:'i_x',id,r:0})===null);
    o.eq=bad.every(id=>equip(ch,id)!=='') ; o.use=bad.every(id=>useConsumable(ch,id)===false);
    ch.inv.push({u:'i_evil2', id:'constructor', r:3, s:['__proto__','toString'], lk:0}); ch.eq.ring='i_evil2'; ch.eq.head='i_evil2';
    o.gb=JSON.stringify(gearBonus(ch))===JSON.stringify(gearBonus(Object.assign({},ch,{inv:ch.inv.filter(x=>x.u!=='i_evil2')})));
    o.gl=!('constructor' in gearLook(ch)&&gearLook(ch).hasOwnProperty('constructor'));
    o.buy=bad.every(id=>itBuyPrice(id,'gold')===0&&itBuyPrice(id,'marks')===0&&itSellPrice(id)===0);
    o.can=bad.map(id=>canEquip(ch,{u:'i_x',id})).every(x=>/^ไม่รู้จัก/.test(x));
    o.proto=({}).r===undefined&&({}).n===undefined&&Object.prototype.toString.call([])==='[object Array]';
    return o; })()`);
  for (const k of Object.keys(h)) ok('id แปลก: ' + { def: 'itemDef → null', add: 'invAdd ไม่ได้', cnt: 'invCount = 0', rm: 'invRemove ไม่ได้', inst: 'instance id แปลกใส่กระเป๋าไม่ได้', mk: 'makeInst → null', name: 'itemName → ""', ri: 'refineInfo → null', eq: 'equip ไม่ได้', use: 'useConsumable ไม่ได้', gb: 'gearBonus ไม่นับของ/รูน id แปลก', gl: 'gearLook ไม่ได้ key แปลก', buy: 'ราคาซื้อ/ขาย = 0', can: 'canEquip = ไม่รู้จัก', proto: 'Object.prototype ไม่ถูกแก้' }[k], h[k] === true, h);
}

// ------------------------------------------------------------------------------------------------
console.log('ของใช้ · ของตกในสนาม (ITEMKIND) · อ่านอย่างเดียว · สองแท็บ');
{
  const { X, log } = fresh();
  const u = X(`(()=>{ const ch=${MK('cleric')}, o={};
    o.outRun=useConsumable(ch,'u_potion_s'); o.why=itCanUse(ch,'u_potion_s');
    invAdd(ch,'u_bag10',5); o.bag=[useConsumable(ch,'u_bag10'),useConsumable(ch,'u_bag10'),useConsumable(ch,'u_bag10'),useConsumable(ch,'u_bag10'),useConsumable(ch,'u_bag10')]; o.bagMax=ch.bagMax; o.bagLeft=invCount(ch,'u_bag10');
    invAdd(ch,'u_forget',1); o.forget=itCanUse(ch,'u_forget'); invAdd(ch,'u_dye_red',1); o.hasDye=!!ch.dye&&typeof ch.dye==='object';
    o.noPart=itCanUse(ch,'u_dye_red',{}); o.dye=useConsumable(ch,'u_dye_red',{part:'body'}); o.dyeWhy=itCanUse(ch,'u_dye_red',{part:'body'}); o.dyed=ch.dye&&ch.dye.body; o.body=gearLook(ch).body;
    G={char:ch, t:10, over:false, gems:[], loot:[], goldRun:0}; P={x:0, y:0, hp:50, maxHp:115};
    o.pot=useConsumable(ch,'u_potion_s'); o.hp=P.hp; o.cd=useConsumable(ch,'u_potion_s'); G.t=18.1; o.pot2=useConsumable(ch,'u_potion_s'); o.left=invCount(ch,'u_potion_s');
    P.hp=P.maxHp; G.t=40; o.fullHp=useConsumable(ch,'u_potion_s');
    // pickups: loot → G.loot · gold → G.goldRun · chest → both · nothing reaches the save
    const before=STORE.get('${KEY}'); const items=rollDrops('surv.boss20',1,{T:1});
    dropLoot(10,10,items); dropGold(5,5,17); ltDropChest(0,0,[{id:'m_dust',n:3}],40); o.gems=G.gems.map(g=>g.kind).join();
    for(const g of G.gems) ITEMKIND[g.kind].collect(g);
    o.loot=G.loot.length; o.lootIds=G.loot.map(x=>x.id); o.goldRun=G.goldRun; o.chest=G.chest&&G.chest.list.length; o.same=STORE.get('${KEY}')===before;
    o.draw=['loot','gold','bosschest'].every(k=>typeof ITEMKIND[k].draw==='function');
    G=null; P=null; return o; })()`);
  ok('ยาใช้นอกสนามไม่ได้ ("ใช้ได้ระหว่างอยู่ในสนาม") · ในรอบตัวละคร: ฮีล 20% · คูลดาวน์ 8 วิ · HP เต็มไม่เสียยา', u.outRun === false && u.why === 'ใช้ได้ระหว่างอยู่ในสนาม' && u.pot === true && Math.abs(u.hp - 73) < 1e-9 && u.cd === false && u.pot2 === true && u.left === 1 && u.fullHp === false, u);
  ok('ถุงขยายกระเป๋า: +10 ต่อใบ สูงสุด 120 (ใบที่ 5 ใช้ไม่ได้ ไม่เสีย)', deq(u.bag, [true, true, true, true, false]) && u.bagMax === 120 && u.bagLeft === 1, u);
  ok('ม้วนลืมเลือนใช้ที่ปุ่มรีเซ็ต · สีย้อม (ch.dye ในเซฟของ lane C): ต้องเลือกส่วนก่อน · ย้อมเสื้อแล้วใช้ไป 1 · look.body = สีแดง',
    /รีเซ็ต/.test(u.forget) && (u.hasDye ? u.noPart === 'เลือกส่วนที่จะย้อมก่อน' && u.dye === true && u.dyed === 'u_dye_red' && u.body === '#c8343c' && /^ไม่มีสีย้อมแดง/.test(u.dyeWhy)
      : u.dye === false && u.dyeWhy === 'ระบบย้อมสียังไม่เปิด'), u);
  ok('ของตกพื้น: loot / gold / bosschest เป็น gem ใน G.gems · เก็บแล้วเข้า G.loot / G.goldRun · เซฟไม่ถูกแตะ', u.gems.split(',').filter(k => k === 'loot').length === u.lootIds.length - 1 && u.goldRun === 57 && u.chest === 1 && u.same && u.draw, u);
  ok('เก็บของมีข้อความลอยและเสียง', log.some(l => l[0] === 'text' && /กล่องสมบัติ/.test(l[1])) && log.some(l => l[0] === 'sfx' && l[1] === 'pickup'), log.slice(0, 6));
  const fort = X(`(()=>{ const ch=${MK('mage')}; const it=makeInst('w_staff_2',{sockets:1}); invAdd(ch,it,1); invAdd(ch,'m_dust',3); invAdd(ch,'rn_bloater',1); invAdd(ch,'m_shard_bat',4);
    G={char:ch, t:1, over:false, gems:[], loot:[]}; const g0=SAVE.acct.gold;
    const o=[refineTry(ch,it.u,{}).why, socketRune(ch,it.u,'rn_bloater',0), combineShards(ch,'m_shard_bat'), buyItem(ch,'m_dust',1), sellItem(ch,'m_dust',1), sellAllCommon(ch), stashMove(ch,'m_dust',true), itBuyBag(ch)];
    G.over=true; const after=refineTry(ch,it.u,{}).res; G=null; return {o, gold:g0, after, r:it.r}; })()`);
  ok('ระหว่างรอบตัวละคร: ตีบวก / ฝังรูน / รวมเศษ / ร้าน / คลัง / ขยายกระเป๋า ถูกปฏิเสธ ("ใช้ได้เฉพาะในป้อม") · จบรอบแล้วทำได้', [0, 1, 3, 6, 7].every(i => fort.o[i] === 'ใช้ได้เฉพาะในป้อม · กลับป้อมก่อน') && fort.o[2] === '' && fort.o[4] === 0 && fort.o[5] === 0 && fort.after === 'ok', fort);
  // read-only save: every action refuses
  const ro = X(`(()=>{ const ch=${MK('archer')}; const it=makeInst('w_bow_1',{}); invAdd(ch,it,1); invAdd(ch,'m_dust',3); Object.defineProperty(SAVE,'ro',{value:true, configurable:true});
    const o=[equip(ch,it.u), unequip(ch,'weapon'), refineTry(ch,it.u,{}).why, buyItem(ch,'m_dust',1), sellItem(ch,'m_dust',1), stashMove(ch,'m_dust',true), itLock(ch,it.u,true), combineShards(ch,'m_shard_bat')];
    delete SAVE.ro; return o; })()`);
  ok('เซฟอ่านอย่างเดียว (เวอร์ชันใหม่กว่า): สวม/ถอด/ตีบวก/ซื้อ/ขาย/คลัง/ล็อก ถูกปฏิเสธทั้งหมด', ro.slice(0, 4).every(x => x === 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้') && ro[4] === 0 && ro[5] === 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้' && ro[7] === '', ro);
  // two tabs: another tab saved more gold → the action reloads first, then refines on the reloaded character, keeping both changes
  const tt = X(`(()=>{ const ch=${MK('swordsman', { gold: 500 })}; const it=makeInst('w_sword_1',{}); invAdd(ch,it,1); invAdd(ch,'m_dust',2); saveNow('t');
    const other=JSON.parse(STORE.get('${KEY}')); other.acct.gold=9000; other.mt++; other.wc++; STORE.set('${KEY}',JSON.stringify(other));
    rngUnit=()=>0; const q=refineTry(ch,it.u,{}); const s=JSON.parse(STORE.get('${KEY}')), c=s.chars.find(x=>x.id===ch.id);
    return {res:q.res, gold:s.acct.gold, r:c.inv.find(x=>x.u===it.u).r, stale:ch!==SAVE.chars.find(x=>x.id===ch.id)}; })()`);
  ok('สองแท็บ: อีกแท็บเพิ่มทองเป็น 9,000 → ตีบวกโหลดใหม่ก่อน แล้วหักค่าธรรมเนียมจากของล่าสุด (8,980) ไม่เขียนทับ', tt.res === 'ok' && tt.gold === 8980 && tt.r === 1 && tt.stale, tt);
  // the old object used again with no new reload (lane C CR 3 · itLive + svlWasSaved): followed by id → applied to the live character and saved
  const t2 = X(`(()=>{ const ch=${MK('swordsman', { gold: 500 })}; const it=makeInst('w_sword_1',{}); invAdd(ch,it,1); invAdd(ch,'m_dust',4); saveNow('t');
    const other=JSON.parse(STORE.get('${KEY}')); other.mt++; other.wc++; STORE.set('${KEY}',JSON.stringify(other));   // a real write always bumps wc
    rngUnit=()=>0; refineTry(ch,it.u,{}); const q=refineTry(ch,it.u,{}); const s=JSON.parse(STORE.get('${KEY}')), c=s.chars.find(x=>x.id===ch.id), live=SAVE.chars.find(x=>x.id===ch.id);
    return {res:q.res, stored:c.inv.find(x=>x.u===it.u).r, live:live.inv.find(x=>x.u===it.u).r, old:ch.inv.find(x=>x.u===it.u).r, stale:ch!==live}; })()`);
  ok('ของเก่าจากการโหลดครั้งก่อน (ไม่มีการโหลดใหม่): ตามด้วย id → ตีบวกครั้งที่สองลงตัวล่าสุดและบันทึก (+2) ไม่ทำกับของเก่า', t2.res === 'ok' && t2.stored === 2 && t2.live === 2 && t2.old === 0 && t2.stale, t2);
}

// ------------------------------------------------------------------------------------------------
console.log('53-ui-char.js: แท็บ · บริการในป้อม · ตัวช่วยของหน้าจอ (ไม่ใช้ DOM ตอนโหลด)');
{
  const log = [];
  const ctx = loadSrc(FILES.concat(['53']), { SCREENS: [], toast() {}, addText() {}, sfx() {}, burst() {}, healP() {} });
  const X = e => ctx.__eval(e);
  X(`loadSaveFor(null)`);
  const reg = X(`({tabs:Object.keys(CHARTABS).map(k=>[k,CHARTABS[k].n,CHARTABS[k].order,typeof CHARTABS[k].render]),
    svc:SERVICES.map(s=>[s.id,s.npc,s.n,s.order,typeof s.open]), dev:Object.keys(DEV.charui).sort().join(),
    api:[openItemSheet,openRefine,openRuneScribe,openShop,openStash].map(f=>typeof f).join()})`);
  ok('CHARTABS.equip (อุปกรณ์ · 10) และ CHARTABS.bag (กระเป๋า · 20) ลงทะเบียนตอนโหลด · ฟังก์ชัน §7.8 ครบ', deq(reg.tabs, [['equip', 'อุปกรณ์', 10, 'function'], ['bag', 'กระเป๋า', 20, 'function']]) && reg.api === 'function,function,function,function,function', reg);
  ok('SERVICES ในป้อม 4 อย่าง (§5.1): ลุงบัณฑ์ช่างตีเหล็ก · แม่หมอศิลา · ร้านป้านวล · ผู้เฝ้าคลัง (ลำดับไม่ซ้ำ)',
    reg.svc.map(s => s[0]).join() === 'smith,scribe,shop,stash' && reg.svc.map(s => s[1]).join() === 'ลุงบัณฑ์,แม่หมอศิลา,ป้านวล,ผู้เฝ้าคลัง' && new Set(reg.svc.map(s => s[3])).size === 4 && reg.svc.every(s => s[4] === 'function' && /^[฀-๿ ·]+$/.test(s[2])), reg.svc);
  const cat = X(`['w_sword_1','h_straw','b_cotton','n_fang','u_potion_s','u_forget','u_bag10','u_dye_red','m_dust','m_crystal','m_seal','m_shard_bat','rn_bat'].map(id=>ucCat(itemDef(id))).join()`);
  ok('ตัวกรองกระเป๋า: อาวุธ · ชุด (ช่องอื่นทั้งหมด) · ใช้ (ยา ม้วน ถุง สีย้อม) · วัสดุ (ผง ผลึก ยันต์ เศษ) · รูน', cat === 'weapon,gear,gear,gear,use,use,use,use,mat,mat,mat,mat,rune', cat);
  const grp = X(`(()=>{ const ch=${MK('mage')}; invAdd(ch,'u_potion_s',97); invAdd(ch,'m_dust',5); ch.inv.push({id:'x_future', n:2, unk:1}); ch.inv.push({u:'i_zz9', id:'w_future', r:0, f:0, s:[], lk:0, unk:1});
    const g=ucGroup(ch.inv,itEqSet(ch)); return {g:g.map(e=>[e.id,e.n,!!e.inst,e.unk]), worn:ch.eq.weapon, entries:ch.inv.filter(x=>x.id==='u_potion_s').length}; })()`);
  ok('ucGroup: ของที่สวมอยู่ไม่แสดงในรายการ · ยา 99 + 1 (สองช่อง) รวมเป็นแถวเดียว ×100 · ของที่ไม่รู้จักแยกไว้ (ทำอะไรไม่ได้)',
    grp.entries === 2 && deq(grp.g, [['u_potion_s', 100, false, false], ['m_dust', 5, false, false], ['x_future', 2, false, true], ['w_future', 1, true, true]]), grp);
  const com = X(`(()=>{ const ch=${MK('swordsman')}; ch.lv=30; const add=(id,f)=>{ const x=makeInst(id,{}); if(f) f(x); invAdd(ch,x,1); return x; };
    add('h_straw'); add('h_straw',x=>{ x.r=4; }); add('h_leather',x=>{ x.lk=1; }); add('w_sword_2',x=>{ x.s=['rn_spitter']; }); const w=add('w_sword_3'); equip(ch,w.u); add('c_pioneer'); invAdd(ch,'m_dust',3);
    const p=ucCommon(ch), g0=SAVE.acct.gold, g=sellAllCommon(ch); return {p, g, got:SAVE.acct.gold-g0, left:ch.inv.map(x=>x.id).join()}; })()`);
  ok('ตัวอย่าง [ขายของธรรมดาทั้งหมด] = ที่ sellAllCommon ขายจริง (หมวกฟาง 2 · ไม่รวมดาบฝึกหัดเริ่มต้นที่ถอดออกมา (ของติดตัว) / ล็อก / สวมอยู่ / มีรูน / ตำนาน / ของซ้อน) · บอกจำนวนที่ตีบวกแล้ว',
    com.p.n === 2 && /w_sword_1/.test(com.left) && com.p.g === com.g && com.got === com.g && com.p.ref === 1 && /h_leather/.test(com.left) && /w_sword_2/.test(com.left) && /w_sword_3/.test(com.left) && /c_pioneer/.test(com.left), com);
  const shop = X(`(()=>{ const ch=${MK('archer')}, L=c=>ucShopList(ch,c,false), A=c=>ucShopList(ch,c,true), rows=['use','weapon','armor','acc'].flatMap(A);
    return {use:L('use').map(e=>e.id).join(), w:L('weapon').map(e=>e.id).join(), wAll:A('weapon').length, n:rows.length, all:SHOP.gold.length,
      bad:rows.filter(e=>!(e.price>0)||e.sell>=e.price).map(e=>e.id), other:L('armor').filter(e=>e.d.cls&&e.d.cls.indexOf('archer')<0).length}; })()`);
  ok('ร้านป้านวล [ซื้อ]: ของใช้ = ยาเล็ก ยาใหญ่ ผงรูน ม้วนลืมเลือน สีย้อม 8 สี (§4.6 · 1,500 ทอง) · นักธนูเห็นแค่ธนู T1–2 (ทุกอาชีพ = อาวุธ 10 ชิ้น) · ของจำกัดอาชีพอื่นซ่อน',
    shop.use === 'u_potion_s,u_potion_l,m_dust,u_forget,'+X('IT_DYES.map(d=>"u_dye_"+d[0]).join()') && shop.w === 'w_bow_1,w_bow_2' && shop.wAll === 10 && shop.other === 0, shop);
  ok('ทุกแถวในร้าน (' + shop.n + ' = ทุกชิ้นใน SHOP.gold) ราคาซื้อ > 0 และราคาขายคืนต่ำกว่าราคาซื้อ', shop.n === shop.all && shop.bad.length === 0, shop.bad);
  const txt = X(`(()=>{ const ri=t=>refineInfo({u:'i_t', id:'w_sword_3', r:t-1, f:0, s:[], lk:0});
    return {f1:ucFailText(ri(1)), f5:ucFailText(ri(5)), f8:ucFailText(ri(8)), g7:ucRefGain(itemDef('w_sword_3'),6,7), g1:ucRefGain(itemDef('b_leather'),0,1),
      d:[ucDiff('might',.06),ucDiff('cd',.03),ucDiff('hp',15),ucDiff('regen',.125),ucDiff('crit',.015)], pc:[ucPc(.38),ucPc(.08),ucPc(1)]}; })()`);
  ok('แผ่นงานตีบวก: +1 "ไม่มีทางล้มเหลว" · +5 "คงระดับ +4" · +8 "ลดเหลือ +6 (ของไม่พังและไม่หาย)"', /100%/.test(txt.f1) && txt.f5 === 'ล้มเหลว: คงระดับ +4' && /^ล้มเหลว: ลดเหลือ \+6 /.test(txt.f8), txt);
  ok('ค่าที่ได้ถ้าสำเร็จ: อาวุธ +6→+7 พลังโจมตี +12% → +15% (หน่วยเดียวกับหน้าสถานะ/สกิล) · เกราะ +0→+1 เกราะ +0.5 · HP +5 · ตัวเลข ▲▼ อ่านง่าย',
    txt.g7 === 'พลังโจมตี +12% → +15%' && txt.g1 === 'เกราะ +0 → +0.5 · HP +0 → +5' && deq(txt.d, ['6%', '3%', '15', '0.13', '1.5%']) && deq(txt.pc, ['38%', '8%', '100%']), txt);
  const cmp = X(`(()=>{ const ch=${MK('archer')}; ch.lv=12; const b=makeInst('w_bow_2',{}); invAdd(ch,b,1); return {c:ucCmpText(ch,b), worn:ucCmpText(ch,itEquipped(ch,'weapon'))}; })()`);
  ok('▲▼ เทียบกับของที่สวม: ธนูเหล็กเทียบธนูฝึกหัด = ▲พลังโจมตี 10% ▲คริติคอล 1% · ของที่สวมอยู่เองไม่มีลูกศร', cmp.c === '▲พลังโจมตี 10% ▲คริติคอล 1%' && cmp.worn === '', cmp);
  const src = (await import('node:fs')).readFileSync(new URL('../src/js/53-ui-char.js', import.meta.url), 'utf8');
  ok('53-ui-char.js ไม่ใช้ innerHTML / insertAdjacentHTML เลย (ชื่อไอเทมและข้อความทุกตัวผ่าน textContent)', !/\.innerHTML|insertAdjacentHTML|\.outerHTML/.test(src));
  ok('53-ui-char.js ไม่เรียก Math.random (การสุ่มทั้งหมดอยู่ใน 34 ด้วย crypto)', !/Math\.random/.test(src));
}

// ------------------------------------------------------------------------------------------------
console.log('M2 fix · ชุดเริ่มต้นไม่เป็นแหล่งทอง (สร้าง → ขาย → ลบ วนซ้ำ) · ตีบวกเมื่อบันทึกไม่ได้ · บริการป้อมในรอบ');
{
  const { X, ls } = fresh();
  // the tester's loop (§3.8 kit): create → unequip the training weapon → sell it → sell the 3 potions → delete · 20 times
  const L = X(`(()=>{ SAVE.acct.gold=0; let got=0; const why=[], pots=[];
    for(let i=0;i<20;i++){ const c=createChar('วนทอง'+'กขคงจฉชซฌญฎฏฐฑฒณดตถท'[i],CLASSES_T[i%5]); if(typeof c==='string') throw new Error(c);
      const w=c.eq.weapon; pots.push(invCount(c,'u_potion_s')); unequip(c,'weapon'); why.push(itSellCheck(c,w)); got+=sellItem(c,w); got+=sellItem(c,'u_potion_s',3); deleteChar(c.id); }
    const last=createChar('ตัวสุดท้าย','mage'), st=JSON.parse(localStorage.getItem('runeguard.save.guest'));
    return {got, gold:SAVE.acct.gold, why:[...new Set(why)], pots, kits:SAVE.acct.kits, lastPots:invCount(last,'u_potion_s'), lastQuick:last.quick[0],
      lastW:last.eq.weapon&&itFind(last,last.eq.weapon).id, b:itFind(last,last.eq.weapon).b, sell:itSellPrice(itFind(last,last.eq.weapon)),
      storedB:st.chars[0].inv.find(x=>x.u===last.eq.weapon).b, storedKits:st.acct.kits, v:validateSave(st).acct.kits, vb:validateSave(st).chars[0].inv.find(x=>x.u===last.eq.weapon).b,
      bad:[-1,'x',1e9,null].map(k=>validateSave({v:1, acct:{kits:k}, chars:[]}).acct.kits), plainT1:itSellPrice(makeInst('w_sword_1',{}))}; })()`.replace('CLASSES_T', JSON.stringify(CLASSES)));
  ok('20 รอบ สร้าง → ขาย → ลบ: อาวุธฝึกหัดขายไม่ได้ทุกรอบ ("ของติดตัวเริ่มต้น ขายไม่ได้") · ยาเล็กมาแค่ ' + X('BAL.KIT_POTS') + ' ตัวแรกของบัญชี → ทองรวม 144 (6 × 3 × 8) ไม่ใช่ 780',
    L.got === 144 && L.gold === 144 && L.why.length === 1 && L.why[0] === 'ของติดตัวเริ่มต้น ขายไม่ได้' && L.pots.join() === '3,3,3,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0' && L.kits === 21, L);
  ok('ตัวที่ 21: ยังได้อาวุธฝึกหัดสวมอยู่ (b:1 · ราคาขาย 0) แต่ไม่มียา · ช่องด่วนว่าง · acct.kits / b ลงเซฟและผ่าน validateSave · kits แปลก ๆ ถูก clamp',
    L.lastW === 'w_staff_1' && L.b === 1 && L.sell === 0 && L.lastPots === 0 && L.lastQuick === null && L.storedB === 1 && L.storedKits === 21 && L.v === 21 && L.vb === 1 && deq(L.bad, [0, 0, 999, 0]), L);
  ok('อาวุธฝึกหัดที่ดรอป / ซื้อ (ไม่ใช่ของเริ่มต้น) ยังขายได้ 15', L.plainT1 === 15, L.plainT1);

  // refine: storage refuses the write (quota) → the press is undone and refused, so a reload cannot reroll it (§9.4)
  const R = X(`(()=>{ const ch=${MK('swordsman')}; const w=makeInst('w_sword_2',{sockets:0}); w.r=7; invAdd(ch,w,1); invAdd(ch,'m_crystal',5); invAdd(ch,'m_seal',2); saveNow('t');
    const before=localStorage.getItem('runeguard.save.guest'), g0=SAVE.acct.gold, set=localStorage.setItem; itRefineRng=()=>0.999;
    localStorage.setItem=()=>{ throw new Error('QuotaExceededError'); };
    const r=refineTry(ch,w.u,{seal:false}), rs=refineTry(ch,w.u,{seal:true});
    const after=localStorage.getItem('runeguard.save.guest'), mem={r:w.r, f:w.f, gold:SAVE.acct.gold-g0, cr:invCount(ch,'m_crystal'), seal:invCount(ch,'m_seal'), n:ch.inv.length};
    localStorage.setItem=set; const ok2=refineTry(ch,w.u,{seal:false}); itRefineRng=null;
    return {r, rs, same:before===after, mem, ok2:{res:ok2.res, saved:ok2.saved, r:w.r, f:w.f, cr:invCount(ch,'m_crystal')}}; })()`);
  ok('ตีบวก +7→+8 ตอนบันทึกลงเครื่องไม่ได้: ถูกปฏิเสธ ("บันทึกลงเครื่องไม่ได้ …") · ระดับ / ความเพียร / ผลึก / ยันต์ / ทอง กลับเป็นเดิม · ที่เก็บไม่เปลี่ยนแม้แต่ไบต์เดียว',
    R.r.res === '' && /^บันทึกลงเครื่องไม่ได้/.test(R.r.why) && R.rs.res === '' && R.same && R.mem.r === 7 && R.mem.f === 0 && R.mem.gold === 0 && R.mem.cr === 5 && R.mem.seal === 2, R);
  ok('บันทึกได้อีกครั้ง: ตีบวกทำงานปกติ (ล้มเหลว → +6 · ความเพียร 1 · ผลึก −1 · saved)', R.ok2.res === 'down' && R.ok2.saved === true && R.ok2.r === 6 && R.ok2.f === 1 && R.ok2.cr === 4, R.ok2);
  const S = X(`(()=>{ const ch=${MK('cleric')}; DEV.profile.sandbox('copy'); const c=curChar(); const w=makeInst('w_rod_2',{sockets:0}); invAdd(c,w,1); invAdd(c,'m_dust',2);
    itRefineRng=()=>0; const r=refineTry(c,w.u,{}); itRefineRng=null; DEV.profile.sandbox(false); return {res:r.res, saved:r.saved, r:w.r}; })()`);
  ok('sandbox (RG.profile.sandbox): ไม่เขียนลงเครื่องโดยตั้งใจ → ไม่ย้อนผล (saved:false แต่ตีบวกได้)', S.res === 'ok' && S.saved === false && S.r === 1, S);

  // fort services mid-run (E1 decision §4.9 / §5.1): stash expansion and the bag pouch are refused like the rest
  const F = X(`(()=>{ const ch=${MK('thief')}; SAVE.acct.marks=500; invAdd(ch,'u_bag10',1); saveNow('t'); const m0=SAVE.acct.marks, s0=SAVE.acct.stashMax, b0=ch.bagMax;
    G={char:ch, over:false}; const o={stash:itBuyStash(ch), can:itCanUse(ch,'u_bag10'), use:useConsumable(ch,'u_bag10'), marks:SAVE.acct.marks-m0, stashMax:SAVE.acct.stashMax-s0, bag:ch.bagMax-b0, n:invCount(ch,'u_bag10')};
    G={char:ch, over:true}; o.fort=[itBuyStash(ch), useConsumable(ch,'u_bag10'), SAVE.acct.stashMax-s0, ch.bagMax-b0]; G=null; return o; })()`);
  ok('ในรอบ: ขยายคลัง / ใช้ถุงขยายกระเป๋า ถูกปฏิเสธ ("ใช้ได้เฉพาะในป้อม") ไม่หักตรา ไม่ใช้ถุง · จบรอบแล้วทำได้',
    F.stash === X('IT_FORT') && F.can === X('IT_FORT') && F.use === false && F.marks === 0 && F.stashMax === 0 && F.bag === 0 && F.n === 1 && deq(F.fort, ['', true, 20, 10]), F);
  const D = X(`[itBuyPrice('u_dye_red','gold'), itBuyPrice('u_dye_black','gold'), itSellPrice('u_dye_red'), SHOP.gold.filter(id=>id.startsWith('u_dye_')).length]`);
  ok('สีย้อม 8 สีขายที่ร้านป้านวล 1,500 ทอง (§4.6) · ขายคืนไม่ได้', deq(D, [1500, 1500, 0, 8]), D);
  const X2 = e => loadSrc(FILES.concat(['53']), { SCREENS: [], toast() {}, addText() {}, sfx() {}, burst() {}, healP() {} }).__eval(e);
  const T = X2(`[ucRefGain(itemDef('w_sword_1'),0,1), ucRefGain(itemDef('b_cotton'),0,1)]`);
  ok('แผ่นงานตีบวก +0→+1: "+0%" มีหน่วย (ไม่ใช่ "+0 → +2%")', T[0] === 'พลังโจมตี +0% → +2%' && T[1] === 'เกราะ +0 → +0.5 · HP +0 → +5', T);
}

// ------------------------------------------------------------------------------------------------
console.log('fix-r2 · ที่เก็บถูกบล็อก (§6.10 เล่นในหน่วยความจำ) · ล็อก / สวม / แต้ม / สกิล บันทึกทันที (สองแท็บ)');
{
  const STUB = { SCREENS: [], toast() {}, addText() {}, sfx() {}, burst() {}, healP() {} };
  const mk = st => { const c = loadSrc(FILES, Object.assign({}, STUB, { localStorage: st })); c.__eval('loadSaveFor(null)'); return c; };
  const thrower = () => { throw new Error('SecurityError'); };
  // 1) localStorage throws on every access (claude.ai artifact, blocked site data): nothing was ever stored → refine plays from memory
  const blocked = { getItem: thrower, setItem: thrower, removeItem: thrower, clear() {}, key: () => null, length: 0 };
  const A = mk(blocked);
  const b = A.__eval(`(()=>{ const s0=svlState(); const ch=${MK('swordsman')}; const w=makeInst('w_sword_2',{sockets:0}); w.r=4; invAdd(ch,w,1); invAdd(ch,'m_dust',5); invAdd(ch,'m_crystal',2);
    itRefineRng=()=>0; const a=refineTry(ch,w.u,{}); itRefineRng=()=>0.999; const k=refineTry(ch,w.u,{}); w.r=6; const d=refineTry(ch,w.u,{}); itRefineRng=null;
    const g0=SAVE.acct.gold, buy=buyItem(ch,'m_dust',1);
    return {s0:{stored:s0.stored, persist:s0.persist, from:s0.from}, s:{stored:svlState().stored, persist:svlState().persist}, a:[a.res,a.to,a.saved], k:[k.res,k.to,k.f], d:[d.res,d.to], r:w.r, f:w.f, cr:invCount(ch,'m_crystal'), dust:invCount(ch,'m_dust'), buy, dg:SAVE.acct.gold-g0}; })()`);
  ok('ที่เก็บถูกบล็อกตั้งแต่เปิด (persist:false): ตีบวกได้ในหน่วยความจำ (+4→+5 สำเร็จ · +5→+6 พลาดคงระดับ · +6→+7 พลาดลด) · ร้านค้ายังใช้ได้',
    b.s0.persist === false && b.s0.from === 'new' && b.s.stored === false && deq(b.a, ['ok', 5, false]) && deq(b.k, ['keep', 5, 1]) && deq(b.d, ['down', 5]) && b.r === 5 && b.cr === 1 && b.dust === 4 && b.buy === '' && b.dg === -80, b);
  const A2 = mk(blocked);
  ok('ที่เก็บถูกบล็อก: เปิดใหม่ = เซฟว่าง (ไม่มีผลเก่าให้สุ่มซ้ำ)', A2.__eval('SAVE.chars.length') === 0 && A2.__eval('svlState().persist') === false);
  // 2) storage still holds an older save but refuses writes (quota) from the first write on → refine is refused, nothing charged
  const ls = memStorage(), W = mk(ls);
  W.__eval(`(()=>{ const ch=${MK('mage')}; const w=makeInst('w_staff_2',{sockets:0}); w.r=6; invAdd(ch,w,1); invAdd(ch,'m_crystal',3); saveNow('t'); })()`);
  const stored = ls.getItem(KEY);
  const quota = { getItem: k => ls.getItem(k), setItem() { throw new Error('QuotaExceededError'); }, removeItem() {}, clear() {}, key: () => null, length: 0 };
  const Q = mk(quota).__eval(`(()=>{ const ch=curChar(), w=ch.inv.find(x=>x.id==='w_staff_2'), g0=SAVE.acct.gold; itRefineRng=()=>0.999; const q=refineTry(ch,w.u,{}); itRefineRng=null;
    return {s:svlState(), q:[q.res,q.why], r:w.r, f:w.f|0, cr:invCount(ch,'m_crystal'), dg:SAVE.acct.gold-g0}; })()`);
  ok('ที่เก็บมีเซฟเก่าแต่เขียนไม่ได้ตั้งแต่ครั้งแรก (persist:true): ตีบวกถูกปฏิเสธ ไม่หักอะไร (เปิดใหม่จะสุ่มซ้ำได้)',
    Q.s.persist === true && Q.s.from === 'main' && Q.s.stored === false && Q.q[0] === '' && /^บันทึกลงเครื่องไม่ได้/.test(Q.q[1]) && Q.r === 6 && Q.f === 0 && Q.cr === 3 && Q.dg === 0 && ls.getItem(KEY) === stored, Q);
  // 3) two tabs: tab 1 locks / equips / spends points, tab 2 saves within 800 ms → nothing of tab 1 is dropped
  const sh = memStorage(), T1 = mk(sh), T2 = mk(sh);
  const u = T1.__eval(`(()=>{ const ch=${MK('archer')}; const w=makeInst('w_bow_2',{sockets:0}), h=makeInst('h_straw',{}); invAdd(ch,w,1); invAdd(ch,h,1); saveNow('t'); return {w:w.u, h:h.u, id:ch.id}; })()`);
  T2.__eval(`svlOnStorage({key:'${KEY}'})`);
  const m1 = T1.__eval(`(()=>{ const ch=curChar(); const r=[itLock(ch,'${u.w}',true), equip(ch,'${u.h}'), commitStats(ch,{DEX:1}), learnSkill(ch,'arrow'), setLoadout(ch,['arrow'])];
    return {r, st:Object.assign({},ch.st), sk:Object.assign({},ch.sk), sp:ch.sp, pts:ch.pts}; })()`);
  const t2 = T2.__eval(`buyItem(curChar(),'m_dust',1)`);                       // tab 2 acts inside tab 1's old 800 ms window
  await new Promise(res => setTimeout(res, 900));
  const st = JSON.parse(sh.getItem(KEY)), c = st.chars.find(x => x.id === u.id), bow = c.inv.find(x => x.u === u.w);
  ok('สองแท็บ: ล็อก · สวม · แจกแต้ม · ฝึกสกิล ของแท็บ 1 อยู่ในเซฟครบหลังแท็บ 2 บันทึกภายใน 800 ms (เดิมหายเงียบ ๆ ตอนเซฟหน่วงเวลาชน)',
    deq(m1.r, ['', '', true, true, true]) && t2 === '' && !!bow && bow.lk === 1 && c.eq.head === u.h && deq(c.st, m1.st) && deq(c.sk, m1.sk) && c.sp === m1.sp && c.pts === m1.pts && (c.inv.find(x => x.id === 'm_dust') || {}).n >= 1,
    { m1, t2, lk: bow && bow.lk, head: c.eq.head, st: c.st, sk: c.sk });
  const sold = T1.__eval(`(()=>{ const g=sellAllCommon(curChar()); return {g, bow:!!itFind(curChar(),'${u.w}')}; })()`);
  ok('สองแท็บ: ขายของธรรมดาทั้งหมดในแท็บ 1 หลังจากนั้น ไม่ขายธนูที่ล็อกไว้', sold.bow === true, sold);
  const P = T1.__eval(`(()=>{ createChar('ตัวที่สอง','thief'); setActiveChar('${u.id}'); return JSON.parse(localStorage.getItem('${KEY}')).active; })()`);
  ok('เลือกตัวละคร (setActiveChar) บันทึกทันที', P === u.id, P);
}

// ------------------------------------------------------------------------------------------------
console.log('fix-r3 · ตีบวก: อีกแท็บเขียนเซฟระหว่างกด (เห็นช้ากว่า itLive) → ปฏิเสธ ไม่เล่นผลที่ไม่ได้บันทึก');
{
  const STUB = { SCREENS: [], toast() {}, addText() {}, sfx() {}, burst() {}, healP() {} };
  const sh = memStorage(), mk = () => { const c = loadSrc(FILES, Object.assign({}, STUB, { localStorage: sh })); c.__eval('loadSaveFor(null)'); return c; };
  const T1 = mk();
  const u = T1.__eval(`(()=>{ const ch=${MK('swordsman')}; const w=makeInst('w_sword_2',{sockets:0}); w.r=6; invAdd(ch,w,1); invAdd(ch,'m_crystal',3); saveNow('t'); return w.u; })()`);
  const T2 = mk();                                                     // opened after tab 1's last write
  // the other tab's write lands after itLive's check and before svlWrite (tabs in other renderer processes see writes a few ms late)
  T1.__other = () => T2.__eval(`buyItem(curChar(),'m_dust',1)`);
  const r = T1.__eval(`(()=>{ const g0=SAVE.acct.gold; itRefineRng=()=>{ globalThis.__other(); return 0.999; }; const q=refineTry(curChar(),'${u}',{}); itRefineRng=null;
    const ch=curChar(), w=itFind(ch,'${u}'); return {q:[q.res,q.why,q.to], r:w.r, f:w.f|0, cr:invCount(ch,'m_crystal'), dust:invCount(ch,'m_dust'), dg:SAVE.acct.gold-g0, same:JSON.stringify(SAVE)===localStorage.getItem('${KEY}')}; })()`);
  const st = JSON.parse(sh.getItem(KEY)), sw = st.chars[0].inv.find(x => x.u === u);
  ok('อีกแท็บเขียนระหว่างกดตีบวก: refineTry ปฏิเสธ (res "") · ไม่หักผลึก ไม่ลดระดับ · ของที่อีกแท็บซื้ออยู่ครบ · หน่วยความจำ = ที่เก็บ (เดิมคืนผล "down" ที่ไม่ได้บันทึก ให้กดสุ่มใหม่ได้)',
    r.q[0] === '' && /อีกแท็บ/.test(r.q[1]) && r.r === 6 && r.f === 0 && r.cr === 3 && r.dust >= 1 && r.dg === -80 && r.same && sw.r === 6 && (sw.f | 0) === 0, r);
  const again = T1.__eval(`(()=>{ itRefineRng=()=>0.999; const q=refineTry(curChar(),'${u}',{}); itRefineRng=null; return [q.res, q.to, q.saved]; })()`);
  ok('กดอีกครั้ง (ไม่มีแท็บอื่นเขียน) → ตีบวกได้ตามปกติและบันทึก', deq(again, ['down', 5, true]) && JSON.parse(sh.getItem(KEY)).chars[0].inv.find(x => x.u === u).r === 5, again);
}

// ------------------------------------------------------------------------------------------------
console.log('m2-orch · อีกแท็บเขียนแทรกหลัง itLive: สวม / ล็อก / เรียง / ซื้อ / ขาย / ย้ายคลัง / ใส่รูน ไม่รายงานว่าสำเร็จ');
{
  const STUB = { SCREENS: [], toast() {}, addText() {}, sfx() {}, burst() {}, healP() {} };
  const sh = memStorage(), mk = () => { const c = loadSrc(FILES, Object.assign({}, STUB, { localStorage: sh })); c.__eval('loadSaveFor(null)'); return c; };
  const T1 = mk();
  const u = T1.__eval(`(()=>{ const ch=${MK('swordsman', { lv: 20 })}; const w=makeInst('w_sword_2',{sockets:1}); invAdd(ch,w,1); invAdd(ch,'m_dust',5); invAdd(ch,Object.keys(RUNES).find(id=>itRuneFits(id,itemDef('w_sword_2'))),1); saveNow('t'); return w.u; })()`);
  const rn = T1.__eval(`Object.keys(RUNES).find(id=>itRuneFits(id,itemDef('w_sword_2')))`);
  const T2 = mk();
  const dustOf = st => JSON.parse(st).chars[0].inv.filter(x => x.id === 'm_dust').reduce((a, x) => a + (x.n | 0), 0);
  // itLive's svlFresh sees nothing (the other tab's write reaches this tab only after it) → svlWrite finds it, reloads, writes nothing
  const acts = {
    equip: `equip(curChar(),'${u}')`, lock: `itLock(curChar(),'${u}',true)`, sort: `itSortBag(curChar(),'tier')`,
    buy: `buyItem(curChar(),'u_potion_s',1)`, sell: `sellItem(curChar(),'m_dust',1)`, stash: `stashMove(curChar(),'m_dust',true,1)`,
    socket: `socketRune(curChar(),'${u}','${rn}',0)`,
  };
  const out = {};
  for (const k in acts) {
    T1.__eval('svlFresh()');                                                   // in step with storage first
    T2.__eval(`svlFresh(); buyItem(curChar(),'m_dust',1)`);                 // the other tab buys one dust
    const r = T1.__eval(`(()=>{ const f=svlFresh; svlFresh=()=>false; try{ return ${acts[k]}; } finally{ svlFresh=f; } })()`);
    const st = sh.getItem(KEY);
    out[k] = { r, same: T1.__eval('JSON.stringify(SAVE)') === st, dust: dustOf(st) };
  }
  const okAll = Object.keys(acts).every(k => (k === 'sell' ? out[k].r === 0 : /อีกแท็บ/.test(out[k].r)) && out[k].same);
  ok('ทุกคำสั่ง: คืน "ข้อมูลถูกแก้จากอีกแท็บ" (ขาย = 0) แทนสำเร็จ · หน่วยความจำ = ที่เก็บ', okAll, out);
  ok('ผงที่อีกแท็บซื้อสะสมครบทุกรอบ (5 + 7 = 12) · ไม่มีคำสั่งไหนเขียนทับ', out.socket.dust === 12, out.socket);
  const again = T1.__eval(`equip(curChar(),'${u}')`);
  ok('กดซ้ำเมื่อไม่มีแท็บอื่นเขียน → สวมได้ปกติและบันทึก', again === '' && JSON.parse(sh.getItem(KEY)).chars[0].eq.weapon === u, again);
}
console.log('m2-orch · grantRewards ไม่รับ runId ที่ validateSave จะทิ้ง (จ่ายซ้ำหลังโหลดใหม่ไม่ได้)');
{
  const { X } = fresh();
  const r = X(`(()=>{ const ch=${MK('mage')}; const out=[]; for(const id of ['R_UP','r_','r_'+'a'.repeat(25),'r-1','r_ok_1']) out.push(onRunEnd({char:ch, modeId:'survival', tier:0, wave:3, kills:5, t:30, runId:id, loot:[], goldRun:0, player:{hp:0}},false,{commit:true}).committed); return out; })()`);
  ok('runId R_UP / r_ / ยาวเกิน 24 / r-1 → ไม่จ่าย · r_ok_1 → จ่าย', deq(r, [false, false, false, false, true]), r);
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
