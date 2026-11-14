// test/62-items-field.test.mjs (lane E/F) — ท่องแดนรูน named items + boss runes + element runes ("ธาตุชุดเกราะ")
//   node test/62-items-field.test.mjs
// docs/PROPOSAL-maps-daily.md §1.2 (มอนตีเรา) · §3–5 (ของดี / ดรอปจ้าวถิ่น). Runs the whole game headless (test/_headless.mjs).
import { loadGame } from './_headless.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
const deq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function game(o = {}) {
  const g = loadGame(), X = g.X;
  X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','${o.cls || 'swordsman'}'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.lv=${o.lv || 40}; SAVE.acct.gold=1e6; return ch.id; })()`);
  return g;
}
const EL6 = ['fire', 'water', 'wind', 'earth', 'light', 'dark'];

console.log('ข้อมูล: ของดีประจำแผนที่ · ของ ★ จ้าวถิ่น · รูนจ้าวถิ่น · รูนธาตุ 6 ชนิด');
{
  const { X } = game();
  const d = X(`(()=>{ const N=IT_NAMED.map(r=>r[0]), o={};
    for(const id of N){ const x=ITEMS[id]; o[id]={slot:x.slot, rar:x.rar, lv:x.lv, tier:x.tier, sock:x.sock, roll:x.sockRoll, st:x.st, zone:x.zone, from:x.from||'', cls:x.cls||null, look:!!x.look, refine:x.refine}; }
    const pool=Object.values(IT_POOL).flat(), shop=SHOP.gold.concat(SHOP.marks);
    return {o, ids:N, inPool:N.filter(id=>pool.includes(id)), inShop:N.filter(id=>shop.includes(id)),
      runes:['rn_gbking','rn_sbqueen','rn_obwarlord'].map(r=>RUNES[r]&&[RUNES[r].g,RUNES[r].mob,!!ITEMS[r],!!ITEMS[RUNES[r].shard]]),
      el:${JSON.stringify(EL6)}.map(k=>{ const R=RUNES['rn_el_'+k]; return R&&[R.el,R.g,!!ITEMS['rn_el_'+k],ITEMS[R.shard]&&ITEMS[R.shard].makes]; }),
      elGroup:RUNE_GROUP.elem, elIcons:${JSON.stringify(EL6)}.every(k=>ITEMS['rn_el_'+k].i===EL[k].i&&IT_EL_RUNE[k][0]===EL[k].n),
      fitsBody:itRuneFits('rn_el_fire',ITEMS.b_orchide), fitsOff:itRuneFits('rn_el_fire',ITEMS.o_shield_2), fitsHead:itRuneFits('rn_el_fire',ITEMS.h_rustcrown),
      crownPaint:(()=>{ const rec=[]; const c=new Proxy({}, {get:(t,k)=>k in t?t[k]:(...a)=>{ rec.push(k); }, set:(t,k,v)=>{ t[k]=v; return true; }});
        HAT_EXT.crown(c, Object.assign({}, CLS.mage.look, ITEMS.h_jellycrown.look), .5); return rec.length; })() }; })()`);
  const o = d.o;
  ok('ของดี 8 ชิ้นตามเอกสาร (g1 3 · s1 2 · o1 3)', d.ids.length === 8 && d.ids.filter(i => o[i].zone === 'g1').length === 3 && d.ids.filter(i => o[i].zone === 's1').length === 2 && d.ids.filter(i => o[i].zone === 'o1').length === 3, d.ids);
  ok('มงกุฎสนิมราชา: หมวก ★ (ตำนาน) จาก gb_king · ช่องรูน 1 ตายตัว', o.h_rustcrown.slot === 'head' && o.h_rustcrown.rar === 3 && o.h_rustcrown.from === 'gb_king' && o.h_rustcrown.sock === 1 && o.h_rustcrown.roll === null, o.h_rustcrown);
  ok('หนังสติ๊กก็อบลิน: อาวุธนักธนู (ดี) · ผ้าโพกหัวโจร: หมวก ทองจากมอน +10%', o.w_gobsling.slot === 'weapon' && deq(o.w_gobsling.cls, ['archer']) && o.w_gobsling.rar === 1 && o.h_thiefwrap.slot === 'head' && o.h_thiefwrap.st.gold === 0.1, [o.w_gobsling, o.h_thiefwrap]);
  ok('มงกุฎวุ้นหกสี: หมวก ★ จาก sb_queen (สลับธาตุ) · ไม้เท้าแกนวุ้น: อาวุธนักเวท area +0.06', o.h_jellycrown.rar === 3 && o.h_jellycrown.from === 'sb_queen' && X('ITEMS.h_jellycrown.elCycle') === 1 && deq(o.w_jellystaff.cls, ['mage']) && o.w_jellystaff.st.area === 0.06, [o.h_jellycrown, o.w_jellystaff]);
  ok('ขวานเขี้ยวเหล็ก: อาวุธ ★ จาก ob_warlord ช่องรูน 2 · เกราะหนังออร์ค hp +60 armor +2 · กำไลกระดูกหมอผี crit +0.02 (ตีบวกไม่ได้)',
    o.w_ironfang.slot === 'weapon' && o.w_ironfang.rar === 3 && o.w_ironfang.from === 'ob_warlord' && o.w_ironfang.sock === 2 &&
    o.b_orchide.slot === 'body' && o.b_orchide.st.hp === 60 && o.b_orchide.st.armor === 2 && o.r_shamanbone.st.crit === 0.02 && o.r_shamanbone.refine === false, [o.w_ironfang, o.b_orchide, o.r_shamanbone]);
  ok('ของดีทุกชิ้นไม่อยู่ในกองดรอปทั่วไป (IT_POOL) และไม่ขายในร้าน', d.inPool.length === 0 && d.inShop.length === 0, [d.inPool, d.inShop]);
  ok('รูนจ้าวถิ่น 3 แบบ (ราชาก็อบลิน / ราชินีวุ้น / แม่ทัพออร์ค) มีไอเทมรูน + เศษรูน', d.runes.every(r => r && r[2] && r[3]) && deq(d.runes.map(r => r[1]), ['gb_king', 'sb_queen', 'ob_warlord']), d.runes);
  ok('รูนธาตุ 6 ชนิด: กลุ่ม elem (เสื้อเกราะเท่านั้น) · มีเศษรูนรวม 4 ชิ้นได้ · ไอคอน/ชื่อตรงกับ EL', d.el.every((r, i) => r && r[0] === EL6[i] && r[1] === 'elem' && r[2] && r[3] === 'rn_el_' + EL6[i]) && deq(d.elGroup.slots, ['body']) && d.elIcons, d);
  ok('รูนธาตุใส่ได้ที่เสื้อ ไม่ได้ที่มือรอง / หมวก', d.fitsBody && !d.fitsOff && !d.fitsHead, [d.fitsBody, d.fitsOff, d.fitsHead]);
  ok('HAT_EXT.crown วาดได้ไม่ error (' + d.crownPaint + ' คำสั่ง)', d.crownPaint > 20);
}

console.log('ธาตุเกราะ: ตารางคูณทุกคู่ (มอนตีเรา) สมมาตรกับฝั่งเราตีมอน');
{
  const { X } = game();
  const t = X(`(()=>{ const out=[]; P={armorEl:null, armorCyc:false};
    for(const a of ${JSON.stringify(EL6)}) for(const m of ${JSON.stringify(EL6)}.concat([null])){ P.armorEl=a; out.push([a,m,elHurtMul(m?{el:m}:{}),elHurtMul(m),m?elMul(m,a):1]); }
    P.armorEl=null; const none=${JSON.stringify(EL6)}.map(m=>elHurtMul({el:m})); P=null; return {out, none}; })()`);
  const want = (m, a) => { if (!m) return 1; if (m === a) return 0.75; const B = { fire: 'wind', wind: 'earth', earth: 'water', water: 'fire', light: 'dark', dark: 'light' };
    if (B[m] === a) return 1.5; if (B[a] === m) return 0.6; return 1; };
  const bad = t.out.filter(([a, m, x, y, z]) => x !== want(m, a) || y !== x || z !== x);
  ok('42 คู่ (6 ธาตุเกราะ × 6 ธาตุมอน + ไม่มีธาตุ) = ตาราง §1.2: ชนะ ×1.5 · ต้าน ×0.6 · เหมือน ×0.75 · อื่น ×1', bad.length === 0 && t.out.length === 42, bad);
  const pairs = t.out.filter(([a, m]) => m && m !== a && !(a === 'light' && m === 'dark') && !(a === 'dark' && m === 'light'));
  const sym = pairs.filter(([a, m, x]) => { const atk = X(`elMul('${a}','${m}')`); return !((atk === 1.5 && x === 0.6) || (atk === 0.6 && x === 1.5) || (atk === 1 && x === 1)); });
  ok('สมมาตร: ธาตุที่เราตีแรง ×1.5 = ธาตุมอนนั้นตีเราเบา ×0.6 (และกลับกัน) · แสง ⇄ มืด ชนะกันทั้งสองทาง', sym.length === 0 && X(`elMul('light','dark')`) === 1.5 && t.out.find(r => r[0] === 'light' && r[1] === 'dark')[2] === 1.5, sym);
  ok('ไม่มีธาตุเกราะ = ×1 กับทุกธาตุมอน', t.none.every(x => x === 1), t.none);
  const cyc = X(`(()=>{ P={armorEl:null, armorCyc:true}; const g0=G; G={t:0}; const s=[]; for(let i=0;i<7;i++){ G.t=i*12+1; s.push(elArmor()); } G=g0; P=null; return s; })()`);
  ok('มงกุฎวุ้นหกสี (armorCyc): ธาตุเกราะสลับทุก 12 วิ ไฟ → ลม → ดิน → น้ำ → แสง → มืด → ไฟ', deq(cyc, ['fire', 'wind', 'earth', 'water', 'light', 'dark', 'fire']), cyc);
  const vs = X(`[elArmorVs('water'), elBestArmor(['fire','water','wind','earth','light','dark']), elBestArmor(['fire','earth','wind']), elBestArmor(['earth','dark','fire']), elBestArmor(['water'])]`);
  ok('elArmorVs(น้ำ): ต้าน ไฟ · แพ้ ดิน · แนะนำ: ค่ายออร์ค (ไฟ ดิน ลม) = ไฟ · มอนน้ำล้วน = ดิน · เสมอกันหลายธาตุ (บึง / ป่า) = ไม่แนะนำ', deq(vs[0].res, ['fire']) && deq(vs[0].same, ['water']) && deq(vs[0].weak, ['earth']) && vs[1] === null && vs[2] === 'fire' && vs[3] === null && vs[4] === 'earth', vs);
}

console.log('ธาตุเกราะในรอบจริง: gearElement → prepareRun → hurtPlayer (ชน / กระสุน / พื้นไฟ) · คลาสสิกไม่เปลี่ยน');
{
  const { X } = game();
  const r = X(`(()=>{ const ch=curChar(), o={};
    const body=makeInst('b_orchide',{}); body.s=[null]; invAdd(ch,body,1); o.eq=equip(ch,body.u);
    o.ge0=gearElement(ch);
    invAdd(ch,'rn_el_water',2); invAdd(ch,'rn_brute',1);
    o.sock=socketRune(ch,body.u,'rn_el_water',0); o.ge1=gearElement(ch);
    const b2=makeInst('b_moonplate',{sockets:2}); invAdd(ch,b2,1);
    o.s2a=socketRune(ch,b2.u,'rn_el_water',0); o.s2b=socketRune(ch,b2.u,'rn_el_water',1); o.s2c=socketRune(ch,b2.u,'rn_brute',1);
    const sh=makeInst('o_shield_4',{sockets:1}); invAdd(ch,sh,1); o.off=socketRune(ch,sh.u,'rn_el_water',0);
    const cr=makeInst('h_jellycrown',{}); invAdd(ch,cr,1); equip(ch,cr.u); o.ge2=gearElement(ch);
    unequip(ch,'body'); o.ge3=gearElement(ch); equip(ch,body.u); unequip(ch,'head');
    startRun(ch.cls,'field',{char:ch, zone:'s1'}); o.run={el:P.armorEl, cyc:P.armorCyc};
    G.god=false; P.dodge=0; P.shield=0; P.armor=0; P.maxHp=P.hp=1e6; G.defK=22;
    const hit=src=>{ P.hp=1e6; hurtPlayer(100,src); return Math.round((1e6-P.hp)*1000)/1000; };
    o.dmg={none:hit(null), fire:hit({el:'fire'}), earth:hit({el:'earth'}), water:hit({el:'water'}), wind:hit({el:'wind'}), str:hit('fire'), junk:hit({el:'__proto__'})};
    for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const rr of G.fd.recs){ rr.st='dead'; rr.t=1e9; rr.e=null; } G.fd.ramp.at=1e9; G.fd.boss.at=1e9;
    const e=fdExtra('s_ember',P.x+10,P.y,null,{aggro:1}); e.atkCd=0; e.freezeT=0; e.stunT=0; P.hp=1e6; buildGrid(); playerCollide(); o.touch={got:Math.round((1e6-P.hp)*1000)/1000, want:Math.round(e.dmg*.6*1000)/1000};
    e.dead=true; G.fd.shots.length=0; P.hp=1e6; fdShot(P.x,P.y-6,0,0,100,'orb',{el:'earth', r:20}); fdShotTick(1/60); o.shot=Math.round((1e6-P.hp)*1000)/1000;
    P.hp=1e6; G.fd.haz.length=0; fdFire(P.x,P.y,40,100,5); fdHazTick(1/60); o.fire=Math.round((1e6-P.hp)*1000)/1000;
    toTitle(); startRun(ch.cls,'classic'); o.classic={el:P.armorEl, cyc:P.armorCyc}; G.god=false; P.dodge=0; P.shield=0; P.armor=0; P.maxHp=P.hp=1e6; G.defK=22;
    o.cl=[hit({el:'fire'}),hit({el:'earth'}),hit(null)];
    return o; })()`);
  ok('เสื้อไม่มีรูนธาตุ = ไม่มีธาตุเกราะ · ฝังรูนธาตุน้ำที่เสื้อ → ธาตุเกราะน้ำ', r.eq === '' && r.ge0.el === null && r.sock === '' && r.ge1.el === 'water' && r.ge1.src === 'rn_el_water', r);
  ok('เสื้อ 1 ตัวใส่รูนธาตุได้ 1 อัน (ช่องที่ 2 ใส่รูนอื่นได้) · มือรองใส่รูนธาตุไม่ได้', r.s2a === '' && /รูนธาตุอยู่แล้ว/.test(r.s2b) && r.s2c === '' && /ใส่ได้เฉพาะ/.test(r.off), [r.s2a, r.s2b, r.s2c, r.off]);
  ok('มงกุฎวุ้นหกสี: เสื้อมีรูนธาตุ → ใช้ของเสื้อ · ไม่มี → สลับ (cyc)', r.ge2.el === 'water' && !r.ge2.cyc && r.ge3.el === null && r.ge3.cyc === true, [r.ge2, r.ge3]);
  ok('prepareRun ใส่ P.armorEl = water (ท่องแดนรูน)', r.run.el === 'water' && r.run.cyc === false, r.run);
  ok('hurtPlayer 100: ไม่มีธาตุ 100 · ไฟ 60 (ต้าน) · ดิน 150 (แพ้) · น้ำ 75 · ลม 100 · id ธาตุตรง ๆ ได้ · ธาตุขยะ = 100',
    deq(r.dmg, { none: 100, fire: 60, earth: 150, water: 75, wind: 100, str: 60, junk: 100 }), r.dmg);
  ok('ชนตัว (playerCollide) วุ้นถ่านแดง 🔥 → ×0.6', r.touch.got === r.touch.want && r.touch.got > 0, r.touch);
  ok('กระสุนธาตุดิน (fdShot el) → ×1.5 · พื้นไฟ (fdFire) → ×0.6', r.shot === 150 && r.fire === 60, [r.shot, r.fire]);
  ok('คลาสสิก: ไม่มี P.armorEl · ทุกธาตุ ×1', !r.classic.el && !r.classic.cyc && deq(r.cl, [100, 100, 100]), r);
}

console.log('ดรอป: เศษรูนธาตุจากมอนธาตุ · ของดีจากมอน/หีบ/กล่องจ้าวถิ่น · ครั้งแรกได้รูนจ้าวถิ่นแน่นอน');
{
  const { X } = game({ lv: 30 });
  const t = X(`(()=>{ const ch=curChar(); startRun(ch.cls,'field',{char:ch, zone:'s1'}); const o={};
    const pick=(tb,id)=>{ const e=tb.find(x=>x.id===id); return e?e.p:0; };
    o.ember=pick(fdDropTable('s_ember','fire'),'m_shard_el_fire'); o.twin=pick(fdDropTable('s_twin','water'),'m_shard_el_water');
    o.moss=pick(fdDropTable('s_moss','wind'),'m_shard_el_wind'); o.crab=pick(fdDropTable('m_mistcrab',EN.m_mistcrab.el),'m_shard_el_'+EN.m_mistcrab.el);
    o.plainEl=fdDropTable('s_big',null).filter(x=>x.id&&/^m_shard_el_/.test(x.id)).length;
    o.goods=fdDropTable('s_drop','water').find(x=>Array.isArray(x.pick)&&x.pick.includes('w_jellystaff'));
    o.chest=fdChestTable().find(x=>Array.isArray(x.pick)); o.chestZ=fdChestTable().some(x=>x.pick==='Z');
    fdZone('g1',null,true); o.thief=pick(fdDropTable('g_thief','dark'),'m_shard_el_dark'); o.grunt=fdDropTable('g_grunt',null).filter(x=>x.id&&/^m_shard_el_/.test(x.id)).length;
    o.g1goods=fdGoods('g1'); o.o1goods=itZoneGoods('o1');
    const bt=FD_BOSSDROP.g1; o.b={crown:bt.find(x=>x.id==='h_rustcrown').p, rune:bt.find(x=>x.id==='rn_gbking'), shard:bt.find(x=>x.id==='m_shard_gb_king').p};
    o.allBoss=FD_ORDER.map(z=>FD_BOSSDROP[z].filter(x=>x.id&&itemDef(x.id)&&itemDef(x.id).from).map(x=>x.id+':'+x.p));
    // first kill of the account: the tables fdBossDone rolls (p→1 only for first:1 entries)
    const first=FD_BOSSDROP.g1.map(e=>e.first?Object.assign({},e,{p:1}):e); o.firstSure=first.filter(e=>e.p===1&&(e.id==='rn_gbking'||Array.isArray(e.pick)&&e.pick[0]==='rn_brute')).length;
    o.firstCrown=first.find(x=>x.id==='h_rustcrown').p;
    // Monte Carlo of the real boss box (seeded): ★ ≈ 25% · own rune ≈ 12% · goods ≈ 15%
    DEV.loot.seed(7); const n=20000, c={}; for(let i=0;i<n;i++) for(const it of rollDrops(FD_BOSSDROP.o1,1)) c[it.id]=(c[it.id]||0)+(it.n||1);
    DEV.loot.seed(null); o.mc={axe:c.w_ironfang/n, rune:(c.rn_obwarlord||0)/n, goods:((c.b_orchide||0)+(c.r_shamanbone||0))/n, shard:(c.m_shard_ob_warlord||0)/n};
    return o; })()`);
  ok('วุ้นธาตุใน s1 ดรอปเศษรูนธาตุของตัวเอง 1.5% (ไฟ น้ำ ลม ตามธาตุตอนตาย)', t.ember === 0.015 && t.twin === 0.015 && t.moss === 0.015, t);
  ok('มอนธาตุอื่น (ปูหมอก · ก็อบลินโจร 🌑) 0.5% · มอนไม่มีธาตุไม่ดรอป', t.crab === 0.005 && t.thief === 0.005 && t.grunt === 0 && t.plainEl === 0, t);
  ok('ของดีจากมอนในแผนที่ 0.15% · หีบค่าย 5% (pick Z → ของดีของแผนที่)', t.goods && t.goods.p === 0.0015 && t.chest && t.chest.p === 0.05 && !t.chestZ && deq(t.g1goods.sort(), ['h_thiefwrap', 'w_gobsling']) && deq(t.o1goods.sort(), ['b_orchide', 'r_shamanbone']), t);
  ok('กล่องจ้าวถิ่น: ★ 25% · รูนจ้าวถิ่น 12% · เศษรูนจ้าวถิ่น 50% · ทุกแผนที่มี ★ ของตัวเอง', t.b.crown === 0.25 && t.b.rune.p === 0.12 && t.b.rune.first === 1 && t.b.shard === 0.5 &&
    deq(t.allBoss, [['h_rustcrown:0.25'], ['h_jellycrown:0.25'], ['w_ironfang:0.25']]), t);
  ok('ล้มครั้งแรกของบัญชี: รูนจ้าวถิ่น + รูนเอาชีวิตรอดได้แน่นอน แต่ ★ ยังเป็น 25% (ไม่แจกฟรี)', t.firstSure === 2 && t.firstCrown === 0.25, t);
  ok('สุ่มกล่องแม่ทัพจริง 20,000 ครั้ง: ขวาน ≈ 25% · รูน ≈ 12% · ของดี ≈ 15% · เศษ ≈ 50%', Math.abs(t.mc.axe - .25) < .015 && Math.abs(t.mc.rune - .12) < .012 && Math.abs(t.mc.goods - .15) < .012 && Math.abs(t.mc.shard - .5) < .02, t.mc);
}

console.log('ฆ่าจริงในแผนที่ + จ้าวถิ่นจริง + ทองจากมอน');
{
  const { X } = game({ lv: 30 });
  const r = X(`(()=>{ const ch=curChar(); startRun(ch.cls,'field',{char:ch, zone:'s1'}); G.god=true; P.skills.length=0; const o={};
    for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const rr of G.fd.recs){ rr.st='dead'; rr.t=1e9; rr.e=null; } G.fd.ramp.at=1e9; G.fd.boss.at=1e9;
    itDropRng=()=>0;                                                   // every chance passes: the table decides what can drop
    const e=fdExtra('s_ember',P.x+200,P.y,null,{aggro:1}); const g0=G.gems.length; damageEnemy(e,1e9,null,{});
    o.loot=G.gems.slice(g0).filter(g=>g.kind==='loot').map(g=>g.it.id).filter(id=>/^m_shard_el_|^w_jellystaff$/.test(id)).sort();
    const s=fdExtra('s_drop',P.x+200,P.y,null,{aggro:1}); s.fm.child=1; const g1=G.gems.length; damageEnemy(s,1e9,null,{}); o.child=G.gems.slice(g1).filter(g=>g.kind==='loot').length;
    itDropRng=null;
    // the real field boss: kill → its box holds the account-first rune for sure
    fdZone('g1',null,true); for(const q of G.enemies) if(!q.dead) fdVanish(q); for(const rr of G.fd.recs){ rr.st='dead'; rr.t=1e9; rr.e=null; } G.fd.ramp.at=1e9;
    DEV.field.boss(); const b=G.bosses[0]; damageEnemy(b,1e9,null,{}); update(1/60);
    const box=G.gems.find(g=>g.kind==='bosschest'&&!g.dead); o.box=box?box.list.map(x=>x.id):null;
    // gold "ทองจากมอน": the same kill with and without +10% (Math.random fixed → no rounding noise)
    const mr=Math.random; Math.random=()=>.999999; const gold=(bonus)=>{ P.bonus.gold=bonus; const q=fdExtra('g_grunt',P.x+200,P.y,null,{aggro:1, lv:60}); q.rank=0; const k=G.gems.length; damageEnemy(q,1e9,null,{});
      return [G.gems.slice(k).filter(g=>g.kind==='gold').reduce((a,g)=>a+g.gold,0), Math.floor(BAL.FIELD.goldF(q.lv)*(G.fd.z.k.gold||1)*(1+Math.min(1,bonus))+1e-9)]; };
    const ga=gold(0), gb=gold(.1), gc=gold(50); Math.random=mr; o.g0=ga[0]; o.w0=ga[1]; o.g1=gb[0]; o.want=gb[1]; o.gBig=gc[0]; o.wBig=gc[1];
    return o; })()`);
  ok('วุ้นถ่านแดงตาย (โอกาสผ่านทุกช่อง) → ได้เศษรูนธาตุไฟ + ไม้เท้าแกนวุ้น · ร่างแยก (child) ไม่ดรอป', deq(r.loot, ['m_shard_el_fire', 'w_jellystaff']) && r.child === 0, r);
  ok('ล้มราชาก็อบลินครั้งแรกของบัญชี: กล่องมีรูนราชาก็อบลินแน่นอน', Array.isArray(r.box) && r.box.includes('rn_gbking'), r.box);
  ok('ผ้าโพกหัวโจร +10%: ทองต่อตัว ' + r.g0 + ' → ' + r.g1 + ' · ค่าปลอม (+5000%) ถูกจำกัดที่ +100%', r.g0 === r.w0 && r.g1 === r.want && r.g1 > r.g0 && r.gBig === r.wBig, r);
}

console.log('เซฟ: ไอเทม/รูนใหม่เป็น id ในระบบเดิม · validate เข้ม');
{
  const { X } = game();
  const v = X(`(()=>{ const ch=curChar(), o={};
    ch.inv.push({u:'i_body1', id:'b_orchide', r:99, f:99, s:['rn_el_fire','rn_el_dark','rn_brute'], lk:0},
      {u:'i_ring1', id:'r_shamanbone', r:7, f:3, s:['rn_bat'], lk:0},
      {u:'i_cot', id:'b_cotton', r:0, f:0, s:['rn_el_fire'], lk:0},
      {u:'i_sh', id:'o_shield_4', r:0, f:0, s:['rn_el_fire'], lk:0},
      {u:'i_axe', id:'w_ironfang', r:3, f:0, s:['rn_obwarlord','rn_sbqueen','rn_king'], lk:0},
      {u:'i_new', id:'b_future', r:0, f:0, s:['rn_el_void'], lk:0},
      {id:'rn_el_water', n:5000}, {id:'m_shard_el_light', n:12});
    ch.eq.body='i_body1'; ch.eq.ring='i_ring1';
    const s=validateSave(JSON.parse(JSON.stringify(SAVE))), c=s.chars[0], f=u=>c.inv.find(x=>x.u===u);
    o.v=s.v; o.body=f('i_body1'); o.ring=f('i_ring1'); o.cot=f('i_cot'); o.sh=f('i_sh'); o.axe=f('i_axe'); o.fut=f('i_new');
    o.stack=c.inv.find(x=>x.id==='rn_el_water'); o.shard=c.inv.find(x=>x.id==='m_shard_el_light');
    o.idem=JSON.stringify(validateSave(s).chars[0].inv)===JSON.stringify(c.inv);
    o.ge=gearElement(c); o.SV=SCHEMA_V; return o; })()`);
  ok('เซฟเวอร์ชันปัจจุบัน (ไอเทม/รูนใหม่ = id ใหม่ในระบบเดิม · หัวไฟล์ 40: id ที่แอปเก่าไม่รู้จักยังรอด → ไม่ต้อง bump)', v.v === v.SV, v);
  ok('เกราะหนังออร์ค +99 → +10 · ช่องรูนตามแม่แบบ (1) · รูนธาตุเก็บได้', v.body.r === 10 && v.body.f === 5 && deq(v.body.s, ['rn_el_fire']), v.body);
  ok('กำไล (เครื่องประดับ) ตีบวก → 0 · ช่องรูน 1', v.ring.r === 0 && v.ring.f === 0 && deq(v.ring.s, ['rn_bat']), v.ring);
  ok('เสื้อ tier 1 (0 ช่อง) ฝังรูนปลอม → ตัดทิ้ง · โล่ฝังรูนธาตุ (ผิดกลุ่ม) → null', deq(v.cot.s, []) && deq(v.sh.s, [null]), [v.cot, v.sh]);
  ok('ขวานเขี้ยวเหล็ก 2 ช่องตายตัว: เกินตัดทิ้ง · รูนผิดกลุ่ม (เกราะ) → null', deq(v.axe.s, [null, 'rn_sbqueen']), v.axe);
  ok('id ไอเทม/รูนที่ไม่รู้จัก (เวอร์ชันใหม่กว่า) เก็บไว้ unk · รูนธาตุซ้อนไม่เกิน 99 · เศษซ้อนได้', v.fut.unk === 1 && deq(v.fut.s, ['rn_el_void']) && v.stack.n === 99 && v.shard.n === 12, [v.fut, v.stack, v.shard]);
  ok('validateSave ซ้ำได้ผลเดิม · ธาตุเกราะหลังโหลด = fire', v.idem && v.ge.el === 'fire', v.ge);
}

console.log(`\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
