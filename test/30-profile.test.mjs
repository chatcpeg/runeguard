// test/30-profile.test.mjs (lane C) — balance, job data, save schema, local save, progression (DESIGN §9.3 criteria C)
//   node test/30-profile.test.mjs
// Runs the real src/js files in node:vm (test/_vm.mjs) with an in-memory localStorage. No dependencies.
import { loadSrc, memStorage } from './_vm.mjs';

const FILES = ['04', '05', '06', '07', '08', '15', '16', '24', '25', '30', '31', '33', '34', '40', '41', '42'];
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
const note = t => console.log('  · ' + t);
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, q) => (o[q] = x[q], o), {}) : x));
const deq = (a, b) => canon(a) === canon(b);
function fresh(stubs = {}) {
  const notes = [];
  const ctx = loadSrc(FILES, Object.assign({ toast: (t, k) => notes.push([t, k]) }, stubs));
  const X = e => ctx.__eval(e);
  const ls = ctx.localStorage;
  const dump = () => { const o = {}; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); o[k] = ls.getItem(k); } return o; };
  return { ctx, X, ls, dump, notes };
}
const CLASSES = ['swordsman', 'mage', 'archer', 'cleric', 'thief'];

// ------------------------------------------------------------------------------------------------
console.log('§3.2 เลเวลและ EXP');
{
  const { X } = fresh();
  const TBL = { 1: [6, 290, 0.0], 5: [15, 1800, 0.2], 10: [31, 6510, 0.7], 15: [48, 14400, 1.4], 20: [67, 26130, 2.4], 30: [109, 62130, 5.1], 40: [155, 116250, 8.9], 50: [203, 188790, 13.6], 59: [249, 271910, 18.7] };
  const got = X(`(()=>{ const o={}; for(const L of [1,5,10,15,20,30,40,50,59]){ let m=0; for(let l=1;l<=L;l++) m+=BAL.minPerLv(l); o[L]=[BAL.mobExp(L),BAL.bxpNeed(L),m/60]; } return o; })()`);
  for (const L in TBL) ok(`Lv${L}: mobExp ${TBL[L][0]} · bxpNeed ${TBL[L][1]} · ชั่วโมงสะสม ≈ ${TBL[L][2]}`,
    got[L][0] === TBL[L][0] && got[L][1] === TBL[L][1] && Math.abs(got[L][2] - TBL[L][2]) <= 0.05 + 1e-9, got[L]);
  note('คอลัมน์ "ชั่วโมงสะสม" ของ §3.2 = Σ minPerLv(1..L)/60 (เวลาจนจบ Lv L) · ค่าจริง ' + Object.keys(TBL).map(L => L + ':' + got[L][2].toFixed(3)).join(' '));
  const inc = X(`(()=>{ const bad=[]; for(let L=2;L<=60;L++) if(!(BAL.bxpNeed(L)>BAL.bxpNeed(L-1))) bad.push('b'+L);
    for(let J=2;J<=19;J++) if(!(BAL.jxpNeed(J,1)>BAL.jxpNeed(J-1,1))) bad.push('j1:'+J);
    for(let J=2;J<=24;J++) if(!(BAL.jxpNeed(J,2)>BAL.jxpNeed(J-1,2))) bad.push('j2:'+J); return bad; })()`);
  ok('bxpNeed เพิ่มทุกเลเวล (1–60) · jxpNeed ขั้นต้น (1–19) และขั้นสูง (1–24) เพิ่มทุกเลเวล', inc.length === 0, inc);
  ok('jxpNeed1(J) = round(0.72·bxpNeed(J)/10)·10 · jxpNeed2(J) = round(0.8·bxpNeed(min(59, round(20+1.6J)))/10)·10',
    X(`BAL.jxpNeed(10,1)===Math.round(.72*6510/10)*10 && BAL.jxpNeed(1,2)===Math.round(.8*BAL.bxpNeed(22)/10)*10 && BAL.jxpNeed(24,2)===Math.round(.8*BAL.bxpNeed(58)/10)*10`));
  ok('diffMul: +8 = 1.32 (เพดาน) · +20 = 1.32 · −5 = 0.65 · −20 = 0.15', X(`Math.abs(BAL.diffMul(8)-1.32)<1e-9&&Math.abs(BAL.diffMul(20)-1.32)<1e-9&&Math.abs(BAL.diffMul(-5)-.65)<1e-9&&BAL.diffMul(-20)===.15`));
  // pacing claims of §3.2 from the formulas (Job EXP = 0.8 × Base EXP)
  const pace = X(`(()=>{ const B=BAL, cum=L=>{ let s=0; for(let l=1;l<L;l++) s+=B.bxpNeed(l); return s; };
    const jobAt=(exp,tier,cap)=>{ let J=1; while(J<cap&&exp>=B.jxpNeed(J,tier)){ exp-=B.jxpNeed(J,tier); J++; } return J; };
    return {j1:[10,20].map(L=>jobAt(cum(L)*B.JOB_EXP,1,20)), j2:[30,40,50,60].map(L=>jobAt((cum(L)-cum(20))*B.JOB_EXP,2,25))}; })()`);
  ok('จังหวะ: Base 10 → Job 10 · Base 20 → Job 20', deq(pace.j1, [10, 20]), pace);
  ok('จังหวะ: เลื่อนที่ Base 20 → Job ขั้นสูง 8 / 16 / 23 / 25 ที่ Base 30 / 40 / 50 / 60', deq(pace.j2, [8, 16, 23, 25]), pace);
  const g = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','mage'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.lv=59; ch.xp=BAL.bxpNeed(59)-10;
    const r=pgGrantExp(ch,10+5000,0); return [ch.lv,ch.xp,r.gold,SAVE.acct.gold,JSON.stringify(grantExp(ch,1,1))]; })()`);
  ok('ถึง Base 60: EXP ที่เกินแปลงเป็นทอง 2% (5000 → 100 ทอง) · xp = 0 · grantExp คืนรูป {lvUp, jobUp} ตาม §7.8', deq(g, [60, 0, 100, 100, '{"lvUp":0,"jobUp":0}']), g);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.3 แต้มสถานะ');
{
  const { X } = fresh();
  ok('ผลรวม statCost 0→50 = 98 · 0→35 = 45 · 0→25 = 25 · 0→40 = 60', deq(X(`[50,35,25,40].map(x=>BAL.statSpent(x))`), [98, 45, 25, 60]));
  ok('statCost: x 0–24 = 1 · 25–34 = 2 · 35–42 = 3 · 43–48 = 4 · 49 = 5', X(`[0,24,25,34,35,42,43,48,49].map(BAL.statCost).join()`) === '1,1,2,2,3,3,4,4,5');
  ok('แต้มสะสม (รวม 5 แต้มเริ่ม) Lv20 / 40 / 60 = 44 / 105 / 186', deq(X(`[20,40,60].map(L=>BAL.ptsAt(L))`), [44, 105, 186]));
  ok('แต้มต่อเลเวล 2 + floor(L/20): Lv2 = 2 · 19 = 2 · 20 = 3 · 40 = 4 · 60 = 5', X(`[2,19,20,40,60].map(BAL.statPtsFor).join()`) === '2,2,3,4,5');
  const sim = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','swordsman'); SAVE.chars.push(ch); const out=[];
    for(const L of [20,40,60]){ while(ch.lv<L) grantExp(ch,BAL.bxpNeed(ch.lv)-ch.xp,0); out.push(ch.pts); } return out; })()`);
  ok('grantExp ไล่เลเวลจริงแล้วได้แต้ม 44 / 105 / 186', deq(sim, [44, 105, 186]), sim);
  const cs = X(`(()=>{ const ch=newChar('ทดสอบ','mage'), out={};
    out.over=commitStats(ch,{STR:6}); out.st0=ch.st.STR;
    out.exact=commitStats(ch,{STR:3,VIT:2}); out.pts0=ch.pts;
    ch.pts=1000; out.cap=commitStats(ch,{INT:51}); out.cap2=commitStats(ch,{INT:50}); out.cap3=commitStats(ch,{INT:1}); out.int=ch.st.INT; out.pts1=ch.pts;
    out.neg=commitStats(ch,{AGI:-1}); out.frac=commitStats(ch,{AGI:1.5}); out.key=commitStats(ch,{HP:1}); out.mix=commitStats(ch,{AGI:1,DEX:-1});
    out.none=commitStats(ch,{}); out.agi=ch.st.AGI; ch.pts=2; ch.st.LUK=25; out.c25=commitStats(ch,{LUK:1}); out.p25=ch.pts; out.c26=commitStats(ch,{LUK:1});
    return out; })()`);
  ok('commitStats ไม่ยอมเกินแต้มที่มี (6 แต้มจาก 5) และไม่แตะค่าใด ๆ', cs.over === false && cs.st0 === 0, cs);
  ok('commitStats ใช้แต้มพอดีได้ (STR 3 + VIT 2 = 5 แต้ม → เหลือ 0)', cs.exact === true && cs.pts0 === 0, cs);
  ok('commitStats ไม่ยอมเกินเพดาน 50 (INT +51 ไม่ได้ · +50 ได้ใช้ 98 แต้ม · +1 ต่อไม่ได้)', cs.cap === false && cs.cap2 === true && cs.cap3 === false && cs.int === 50 && cs.pts1 === 1000 - 98, cs);
  ok('commitStats ปฏิเสธค่าลบ / เศษ / คีย์แปลก / ชุดที่มีตัวผิดปน (ทั้งก้อน) / delta ว่าง', !cs.neg && !cs.frac && !cs.key && !cs.mix && !cs.none && cs.agi === 0, cs);
  ok('commitStats คิดราคาตาม statCost (25 → 26 ใช้ 2 แต้ม)', cs.c25 === true && cs.p25 === 0 && cs.c26 === false, cs);
  const rs = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','thief'); SAVE.chars.push(ch); ch.lv=25; ch.pts=BAL.ptsAt(25);
    const all=ch.pts; commitStats(ch,{AGI:20}); const a=resetStats(ch,{}); const p1=ch.pts, f1=ch.resets.free; commitStats(ch,{AGI:3});
    const b=resetStats(ch,{}); const c=resetStats(ch,{scroll:true}); ch.lv=10; const d=resetStats(ch,{}); return [all,a,p1,f1,b,c,d,ch.pts,ch.st.AGI]; })()`);
  ok('resetStats: Base ≥ 20 ฟรีครั้งเดียว แต้มคืนครบ · ครั้งต่อไปต้องใช้ม้วน (ไม่มีม้วน = ไม่ได้) · Base < 20 ฟรีเสมอ',
    rs[1] === true && rs[2] === rs[0] && rs[3] === 0 && rs[4] === false && rs[5] === false && rs[6] === true && rs[7] === rs[0] && rs[8] === 0, rs);
  const auto = X(`(()=>{ const ch=newChar('ทดสอบ','cleric'); return pgAutoStats(ch); })()`);
  ok('[แจกอัตโนมัติ] 5 แต้มเริ่มของนักบวช = PRESETS (VIT 2 · INT 2 · LUK 1)', deq(auto, { VIT: 2, INT: 2, LUK: 1 }), auto);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.7 ตัวใหม่ = คลาสสิกทุก field');
{
  const { X } = fresh();
  for (const c of CLASSES) {
    const r = X(`(()=>{ const ch=newChar('ทดสอบ','${c}'); ch.inv=[]; ch.eq=svEmptyEq();
      const m=metaBonus(ch), b=buildRunBonus(ch);
      const A=makePlayer(CLS['${c}']); recalc(A); A.hp=A.maxHp;                          // classic newRun
      const B=makePlayer(CLS['${c}']); recalc(B); B.hp=B.maxHp; const g={}; prepareRun(g,B,ch,'survival');
      const skip=new Set(['bonus','rank','loadout','advOffered']), diff=[];
      for(const k of new Set(Object.keys(A).concat(Object.keys(B)))) if(!skip.has(k)&&JSON.stringify(A[k])!==JSON.stringify(B[k])) diff.push(k);
      return {m:JSON.stringify(m), b:JSON.stringify(b), diff, n:Object.keys(A).length, bonus:B.bonus, adv:B.adv, offered:B.advOffered}; })()`);
    ok(`${c}: metaBonus(ตัวใหม่) = {} · buildRunBonus(ตัวใหม่ ไม่มีของ) = {}`, r.m === '{}' && r.b === '{}', r);
    ok(`${c}: recalc หลัง prepareRun เท่าคลาสสิกทุก field (${r.n} field ยกเว้น bonus/rank/loadout/advOffered)`, r.diff.length === 0 && r.adv === null && r.offered === true, r.diff);
  }
  const adv = X(`(()=>{ const out=[]; for(const c of CLASSES) for(const a of c.adv){ const ch=newChar('ทดสอบ',c.id); ch.job=a.id;
      const A=makePlayer(c); A.adv=a; recalc(A); A.hp=A.maxHp; const B=makePlayer(c); recalc(B); B.hp=B.maxHp; prepareRun({},B,ch,'survival');
      const keys=['maxHp','hp','speed','armor','crit','critMult','regen','might','area','durMul','cdMul','magnet','xpMul','extraProj','dodge','rage','steal','drop','bossDmg','fam'];
      const bad=keys.filter(k=>JSON.stringify(A[k])!==JSON.stringify(B[k])); if(bad.length||B.adv!==a) out.push(a.id+':'+bad.join('/')); } return out; })()`);
  ok('ตัวที่เลื่อนอาชีพแล้ว (สถานะ 0 · Lv1): ค่าเท่าคลาสสิกที่ได้ adv เดียวกัน ทั้ง 10 อาชีพ · P.adv เป็น object เดียวกับ CLS', adv.length === 0, adv);
  const m50 = X(`(()=>{ const o={}; for(const k of STAT_ORDER){ const ch=newChar('ทดสอบ','mage'); ch.st[k]=50; o[k]=metaBonus(ch); } const c=newChar('ทดสอบ','mage'); c.lv=60; o.LV=metaBonus(c);
    const d=newChar('ทดสอบ','mage'); d.st.DEX=39; o.D39=metaBonus(d); return o; })()`);
  ok('META_K ที่ 50: ATK might +0.40 · อึด hp +200 regen +0.75 armor +3', deq(m50.STR, { might: 0.4 }) && deq(m50.VIT, { hp: 200, regen: 0.75, armor: 3 }), m50);
  ok('META_K ที่ 50: ว่องไว speed +0.15 cd ×0.82 · แม่นยำ cd ×0.86 proj +1 (≥ 40 · ที่ 39 ไม่มี)',
    m50.AGI.speed === 0.15 && Math.abs(m50.AGI.cd - 0.8184) < 1e-3 && Math.abs(m50.DEX.cd - 0.8605) < 1e-3 && m50.DEX.proj === 1 && m50.D39.proj === undefined, m50);
  ok('META_K ที่ 50: ปัญญา area/dur +0.30 · โชค crit +0.15 critMult +0.30 drop +0.60 xp +0.20 · Lv60 hp +236 might +0.236',
    deq(m50.INT, { area: 0.3, dur: 0.3 }) && deq(m50.LUK, { crit: 0.15, critMult: 0.3, drop: 0.6, xp: 0.2 }) && deq(m50.LV, { might: 0.236, hp: 236 }), m50);
  const pb = X(`(()=>{ const ch=newChar('ทดสอบ','mage'); ch.pas={p_runefocus:5, p_manasea:5}; const a=passiveBonus(ch); ch.job='archmage'; const b=passiveBonus(ch);
    const t=newChar('ทดสอบ','thief'); t.job='nightblade'; t.pas={p_thinsmoke:2, p_catstep:1}; return {a,b,t:buildRunBonus(t)}; })()`);
  ok('passive: ค่าบวกคูณ ★ · cd ยกกำลัง ★ (สมาธิแห่งรูน ★5 = area +0.10 · cd ×0.99⁵) · passive ขั้นสูงนับเมื่อเลื่อนแล้วเท่านั้น',
    deq(pb.a, { area: 0.1, cd: 0.95099 }) && Math.abs(pb.b.area - 0.25) < 1e-9 && pb.b.cd === 0.95099, pb);
  ok('buildRunBonus รวม adv.bonus + passive: magnet คูณ (1.4 × 1.04²) · xp บวก (0.2 + 0.06) · dodge/speed จากฝีเท้าแมว',
    Math.abs(pb.t.magnet - 1.4 * 1.04 * 1.04) < 1e-6 && Math.abs(pb.t.xp - 0.26) < 1e-9 && pb.t.dodge === 0.01 && pb.t.speed === 0.015, pb.t);
  const T0 = X(`(()=>{ G={tier:0}; const bad=[]; for(let w=1;w<=20;w++){ if(JSON.stringify(MODES.survival.cfgFor(w))!==JSON.stringify(waveCfg(w))) bad.push(w); } G=null;
    return {k:BAL.SURV.defK(0), h:BAL.SURV.hpMul(0), d:BAL.SURV.dmgMul(0), bad}; })()`);
  ok('ระดับนรก T0: defK 22 · hpMul 1 · dmgMul 1 (เท่ากันแบบ ===) · cfgFor(w) = waveCfg(w) ทุกคลื่น', T0.k === 22 && T0.h === 1 && T0.d === 1 && T0.bad.length === 0, T0);
  const tiers = X(`[1,3,10].map(T=>[BAL.SURV.recLv(T),+BAL.SURV.hpMul(T).toFixed(2),+BAL.SURV.dmgMul(T).toFixed(2),BAL.SURV.defK(T),BAL.SURV.goldPerWave(T),BAL.SURV.gearTier(T)])`);
  ok('ตารางระดับนรก T1 / T3 / T10 ตรง §2.2', deq(tiers, [[6, 1.3, 1.12, 25, 20, 1], [18, 1.9, 1.36, 31, 30, 2], [60, 4, 2.2, 52, 65, 5]]), tiers);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.5 สกิล ★ · SKILL_REQ · loadout');
{
  const { X } = fresh();
  const rc = X(`(()=>{ const ch=newChar('ทดสอบ','swordsman'); ch.sp=100; const out=[];
    for(const id of ['slash','slam']){ for(let i=0;i<6;i++){ const before=ch.sp, okk=learnSkill(ch,id); out.push(id+':'+(okk?before-ch.sp:'x')+':'+(ch.sk[id]|0)); } }
    return {out, why:canLearn(ch,'slam')}; })()`);
  ok('learnSkill คิดแต้มตาม RANK_COST (ฟันดาบ ★1 ฟรี: ★2–5 = 1,1,2,2 · ทุบธรณี ★1–5 = 1,1,1,2,2) และไม่เกิน ★5',
    rc.out.join(' ') === 'slash:1:2 slash:1:3 slash:2:4 slash:2:5 slash:x:5 slash:x:5 slam:1:1 slam:1:2 slam:1:3 slam:2:4 slam:2:5 slam:x:5' && /★5/.test(rc.why), rc);
  const poor = X(`(()=>{ const ch=newChar('ทดสอบ','mage'); ch.sp=1; ch.sk.mbolt=3; const a=canLearn(ch,'mbolt'); const b=learnSkill(ch,'mbolt'); return [a,b,ch.sp,ch.sk.mbolt]; })()`);
  ok('learnSkill ไม่ทำงานเมื่อแต้มไม่พอ (★3 → ★4 ต้องใช้ 2)', /แต้มสกิลไม่พอ/.test(poor[0]) && poor[1] === false && poor[2] === 1 && poor[3] === 3, poor);
  const req = X(`(()=>{ const out=[]; for(const c of CLASSES) for(const a of c.adv){ const [s1,s2]=a.skills, q1=SKILL_REQ[s1], q2=SKILL_REQ[s2];
      const ch=newChar('ทดสอบ',c.id); ch.sp=999;
      const pre=canLearn(ch,s1);                                                       // before advancing
      ch.job=a.id; ch.sk[q1.need]=q1.r-1; const lo=canLearn(ch,s1); ch.sk[q1.need]=q1.r; const hi=canLearn(ch,s1);
      const lo2=canLearn(ch,s2); learnSkill(ch,s1); const mid2=canLearn(ch,s2); learnSkill(ch,s1); const hi2=canLearn(ch,s2);
      out.push({a:a.id, s1, need:q1.need, r1:q1.r, s2, need2:q2.need, r2:q2.r, inBase:c.skills.indexOf(q1.need)>=0, pre, lo, hi, lo2, mid2, hi2}); } return out; })()`);
  ok('SKILL_REQ ครบ 20 สกิลขั้นสูง: ตัวแรก ← สกิลพื้นฐาน ★3 · ตัวที่สอง ← ตัวแรก ★2', req.length === 10 && req.every(q => q.r1 === 3 && q.inBase && q.need2 === q.s1 && q.r2 === 2), req.map(q => q.a + ':' + q.s1 + '←' + q.need + '★' + q.r1 + ' ' + q.s2 + '←' + q.need2 + '★' + q.r2));
  ok('ยังไม่เลื่อนอาชีพ: สกิลขั้นสูงเรียนไม่ได้ ("ต้องเลื่อนเป็น…ก่อน")', req.every(q => /^ต้องเลื่อนเป็น/.test(q.pre)), req.map(q => q.pre));
  ok('learnSkill เคารพ SKILL_REQ: ตัวแรกต้องมี ★3 · ตัวที่สองต้องมีตัวแรก ★2 (★1 ยังไม่พอ)',
    req.every(q => /^ต้องฝึก/.test(q.lo) && q.hi === '' && /^ต้องฝึก/.test(q.lo2) && /^ต้องฝึก/.test(q.mid2) && q.hi2 === ''), req.map(q => [q.a, q.lo, q.hi, q.lo2, q.mid2, q.hi2]));
  const ps = X(`(()=>{ const ch=newChar('ทดสอบ','archer'); ch.sp=10; const a=learnPassive(ch,'p_huntereye'), b=learnSkill(ch,'p_huntereye'), c=canLearn(ch,'p_heavyarms'), d=canLearn(ch,'p_hawkbond');
    ch.job='ranger'; const e=learnPassive(ch,'p_hawkbond'), f=canLearn(ch,'p_stillbreath'); for(let i=0;i<5;i++) learnPassive(ch,'p_underwing'); const g=canLearn(ch,'p_underwing');
    return {a,b,c,d,e,f,g,pas:ch.pas,sp:ch.sp}; })()`);
  ok('passive: ของอาชีพตัวเองเรียนได้ 1 แต้มต่อ ★ · ของอาชีพอื่นไม่ได้ · ขั้นสูงต้องเลื่อนก่อน · ไม่เกิน ★5',
    ps.a && ps.b && ps.c !== '' && /^ต้องเลื่อนเป็น/.test(ps.d) && ps.e && ps.f !== '' && /★5/.test(ps.g) && deq(ps.pas, { p_huntereye: 2, p_hawkbond: 1, p_underwing: 5 }) && ps.sp === 2, ps);
  const lo = X(`(()=>{ const ch=newChar('ทดสอบ','cleric'); ch.sp=99; const out={};
    learnSkill(ch,'heal'); learnSkill(ch,'sacred'); learnSkill(ch,'cross'); out.auto=ch.load.slice();
    out.dup=setLoadout(ch,['holy','holy']); out.zero=setLoadout(ch,['holy','judgment']); out.empty=setLoadout(ch,[]); out.five=setLoadout(ch,['holy','heal','sacred','cross','holy']);
    out.okk=setLoadout(ch,['cross','holy']); out.after=ch.load.slice();
    ch.job='highcleric'; ch.sk.sacred=0; ch.sk.holy=3; learnSkill(ch,'judgment'); learnSkill(ch,'judgment'); learnSkill(ch,'aegis'); ch.sk.sacred=1;
    out.adv5=setLoadout(ch,['holy','heal','sacred','judgment','aegis']); out.adv6=setLoadout(ch,['holy','heal','sacred','cross','judgment','aegis']); out.final=ch.load.slice();
    out.foreign=setLoadout(ch,['slash']); return out; })()`);
  ok('loadout: สกิลที่เรียน ★1 ใหม่เข้าช่องว่างเอง · ช่องแรกยังเป็นสกิลแรก', deq(lo.auto, ['holy', 'heal', 'sacred', 'cross']), lo);
  ok('setLoadout ปฏิเสธ: ซ้ำ / ★0 / ว่าง / เกิน 4 ช่อง (ขั้นต้น) / สกิลของอาชีพอื่น · รับได้: ลำดับใหม่', !lo.dup && !lo.zero && !lo.empty && !lo.five && lo.okk && deq(lo.after, ['cross', 'holy']) && !lo.foreign, lo);
  ok('setLoadout ขั้นสูง 5 ช่องได้ · 6 ช่องไม่ได้', lo.adv5 && !lo.adv6 && lo.final.length === 5, lo);
  const rsk = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','thief'); SAVE.chars.push(ch); ch.sp=20; learnSkill(ch,'dagger'); learnSkill(ch,'fan'); learnSkill(ch,'p_catstep');
    const sp0=ch.sp, spent=pgSpSpent(ch); const a=resetSkills(ch,{}); return {a, sp:ch.sp, sum:sp0+spent, sk:ch.sk, pas:ch.pas, load:ch.load}; })()`);
  ok('resetSkills: แต้มคืนครบ · ★1 ฟรีของสกิลแรกยังอยู่ · loadout ตัดสกิลที่เป็น ★0', rsk.a && rsk.sp === rsk.sum && rsk.sp === 20 && deq(rsk.sk, { dagger: 1 }) && deq(rsk.pas, {}) && deq(rsk.load, ['dagger']), rsk);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.5 แต้มสกิลรวม 43 · ใช้ได้รวม 56 (จากข้อมูลจริง)');
{
  const { X } = fresh();
  const earn = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','archer'); SAVE.chars.push(ch); SAVE.acct.gold=500; const sp=[];
    while(ch.jlv<20) grantExp(ch,0,BAL.jxpNeed(ch.jlv,1)-ch.jxp); sp.push(ch.sp); grantExp(ch,0,1e9); sp.push(ch.sp,ch.jlv);
    ch.lv=20; ch.trial.t2=1; advanceJob(ch,'ranger'); while(ch.jlv<25) grantExp(ch,0,BAL.jxpNeed(ch.jlv,2)-ch.jxp); sp.push(ch.sp); grantExp(ch,0,1e9); sp.push(ch.sp,ch.jlv); return sp; })()`);
  ok('แต้มที่ได้: Job ขั้นต้น 2–20 = 19 · ขั้นสูง 2–25 = 24 · รวม 43 (EXP เกินเพดานไม่ให้แต้มเพิ่ม)', deq(earn, [19, 19, 20, 43, 43, 25]), earn);
  const spend = X(`(()=>{ const out=[]; for(const c of CLASSES) for(const a of c.adv){
      const ch=newChar('ทดสอบ',c.id); ch.sp=999; let t1=0, t2=0, n=0;
      const learnAll=()=>{ let any=true, s=0; while(any){ any=false; for(const id of pgSkillPool(ch).concat(pgPasPool(ch))){ const b=ch.sp; if(learnSkill(ch,id)){ s+=b-ch.sp; any=true; } } } return s; };
      t1=learnAll(); ch.job=a.id; t2=learnAll();
      const data1=c.skills.length*BAL.rankSpent(5)-BAL.RANK_COST[1]+pgPasPool({cls:c.id,job:null}).length*5*BAL.PAS_COST;
      const data2=a.skills.length*BAL.rankSpent(5)+Object.values(PASSIVES).filter(p=>p.own===a.id).length*5*BAL.PAS_COST;
      out.push({a:a.id,t1,t2,data1,data2,all:pgSpSpent(ch)}); } return out; })()`);
  ok('ใช้ได้: ขั้นต้น 32 (สกิล 4 ตัว ★5 − ★1 ฟรี + passive ★5) · ขั้นสูง 24 (สกิล 2 ตัว + passive 2 ตัว) · รวม 56 ทั้ง 10 สาย',
    spend.length === 10 && spend.every(s => s.t1 === 32 && s.t2 === 24 && s.data1 === 32 && s.data2 === 24 && s.all === 56), spend);
  ok('ขาด 13 แต้มเมื่อตัน (56 − 43) · ตอนจบขั้นต้นขาด 13 (32 − 19)', 56 - earn[3] === 13 && 32 - earn[0] === 13);
  ok('PASSIVES ครบ 25 ตัว: อาชีพขั้นต้นละ 1 · ขั้นสูงละ 2 · ชื่อไม่ซ้ำ', X(`(()=>{ const ids=Object.keys(PASSIVES), names=new Set(ids.map(k=>PASSIVES[k].n));
    return ids.length===25&&names.size===25&&CLASSES.every(c=>ids.filter(k=>PASSIVES[k].own===c.id).length===1&&c.adv.every(a=>ids.filter(k=>PASSIVES[k].own===a.id).length===2)); })()`));
}

// ------------------------------------------------------------------------------------------------
console.log('§3.4 เลื่อนอาชีพ');
{
  const { X } = fresh();
  const jr = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','swordsman'); SAVE.chars.push(ch); SAVE.active=ch.id; const out={};
    const flags=()=>jobReqs(ch,'knight').map(q=>q.ok?1:0).join('');
    out.n=jobReqs(ch,'knight').length; out.f0=flags(); out.a0=advanceJob(ch,'knight');
    ch.lv=20; out.f1=flags(); ch.jlv=20; out.f2=flags(); ch.trial.t2=1; out.f3=flags(); out.a1=advanceJob(ch,'knight');
    SAVE.acct.gold=499; out.a2=advanceJob(ch,'knight'); SAVE.acct.gold=650; out.f4=flags();
    out.bad=advanceJob(ch,'archmage'); out.a3=advanceJob(ch,'knight'); out.job=ch.job; out.jlv=ch.jlv; out.jxp=ch.jxp; out.gold=SAVE.acct.gold;
    ch.jlv=25; SAVE.acct.gold=5000; out.again=advanceJob(ch,'berserker'); out.again2=advanceJob(ch,'knight'); out.job2=ch.job; out.gold2=SAVE.acct.gold;
    out.f5=flags(); out.texts=jobReqs(ch,'knight').map(q=>q.t);
    const v=validateSave(JSON.parse(JSON.stringify(SAVE))); out.vjob=v.chars[0].job; return out; })()`);
  ok('jobReqs คืน 4 ข้อ (Base 20 · Job 20 · บททดสอบ · 500 ทอง) และแต่ละข้อเปิดตามเงื่อนไขของตัวเอง',
    jr.n === 4 && jr.f0 === '0000' && jr.f1 === '1000' && jr.f2 === '1100' && jr.f3 === '1110' && jr.f4 === '1111', jr);
  ok('advanceJob ไม่ได้ถ้าเงื่อนไขไม่ครบ (ทอง 499) · ได้เมื่อครบ: job = knight · jlv 1 · jxp 0 · หักทอง 500',
    !jr.a0 && !jr.a1 && !jr.a2 && !jr.bad && jr.a3 && jr.job === 'knight' && jr.jlv === 1 && jr.jxp === 0 && jr.gold === 150, jr);
  ok('advanceJob ทำได้ครั้งเดียว เปลี่ยนสายไม่ได้ ไม่หักทองซ้ำ · validateSave ยังคง job', !jr.again && !jr.again2 && jr.job2 === 'knight' && jr.gold2 === 5000 && jr.vjob === 'knight' && jr.f5[1] === '0', jr);
  const js = X(`(()=>{ const ch=newChar('ทดสอบ','mage'); ch.job='elementalist'; return [pgTier(ch), pgJobCap(ch), pgSkillPool(ch).join(), BAL.LOADOUT[pgTier(ch)]]; })()`);
  ok('หลังเลื่อน: เพดาน Job 25 · ปลดสกิลขั้นสูง 2 ตัว · loadout 5 ช่อง', deq(js, [2, 25, 'mbolt,flame,frost,thunder,vortex,spikes', 5]), js);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.6 prepareRun');
{
  const { X } = fresh();
  const pr = X(`(()=>{ const out={}; const ch=newChar('ทดสอบ','archer'); ch.job='sharpshooter'; ch.lv=30; ch.st.DEX=30;
    ch.sk={arrow:5, spread:2, rain:0, trap:1, deadeye:3, blast:1}; ch.load=['deadeye','arrow','trap','blast','spread'];
    const mk=m=>{ const p=makePlayer(CLS.archer); recalc(p); p.hp=p.maxHp; const g={}; prepareRun(g,p,ch,m); return {p,g}; };
    let {p,g}=mk('survival'); out.adv=p.adv===CLS.archer.adv[1]; out.offered=p.advOffered; out.rank=p.rank; out.load=p.loadout; out.lv=p.lv;
    out.surv=p.skills.map(s=>s.id+':'+s.lv); out.bonus=JSON.stringify(p.bonus)===JSON.stringify(buildRunBonus(ch)); out.might=p.might; out.tip=g.charTip; out.gold=g.goldRun;
    out.look=p.look.weapon; out.field=mk('field').p.skills.map(s=>s.id+':'+s.lv).join(' ');
    out.trial=mk('trial').p.skills.map(s=>s.id+':'+s.lv+(s.evolved?'E':'')).join(' ');
    ch.st.DEX=25; out.boss=mk('boss').p.skills.map(s=>s.id+':'+s.lv+(s.evolved?'E':'')).join(' ');
    ch.st.DEX=24; out.boss24=mk('boss').p.skills.map(s=>s.id+':'+s.lv+(s.evolved?'E':'')).join(' ');
    ch.play=12; out.tip2=mk('survival').g.charTip; return out; })()`);
  ok('P.adv = อาชีพสูงสุด (object เดียวกับ CLS) · P.advOffered = true · P.lv = 1', pr.adv && pr.offered === true && pr.lv === 1, pr);
  ok('P.rank = ★ ที่ฝึก (เฉพาะ ★ ≥ 1) · P.loadout = load', deq(pr.rank, { arrow: 5, spread: 2, trap: 1, deadeye: 3, blast: 1 }) && deq(pr.load, ['deadeye', 'arrow', 'trap', 'blast', 'spread']), pr);
  ok('P.bonus = buildRunBonus(ch) และเข้า recalc (might > 1)', pr.bonus && pr.might > 1 && pr.look === 'longbow', pr);
  ok('เริ่มรอบ: เอาชีวิตรอด = load[0] Lv1 · ท่องแดน = ทุกช่อง Lv1', deq(pr.surv, ['deadeye:1']) && pr.field === 'deadeye:1 arrow:1 trap:1 blast:1 spread:1', pr);
  ok('เริ่มรอบ: บททดสอบ / ล่าบอส = Lv ★ · ★5 วิวัฒน์เองเมื่อสถานะถาวร evo.s ≥ 25 (DEX 30/25 ได้ · 24 ไม่ได้)',
    pr.trial === 'deadeye:3 arrow:5E trap:1 blast:1 spread:2' && pr.boss === pr.trial && pr.boss24 === 'deadeye:3 arrow:5 trap:1 blast:1 spread:2', pr);
  ok('ข้อความแนะนำเฉพาะรอบแรกของตัวละคร · G.goldRun เริ่ม 0', /ความชำนาญเริ่มที่ 1/.test(pr.tip) && pr.tip2 === '' && pr.gold === 0, pr);
}

// ------------------------------------------------------------------------------------------------
console.log('§6.3 migrateSave');
{
  const { X } = fresh();
  const m = X(`(()=>{ const best={swordsman:{score:12345,wave:14,kills:900,won:false}, mage:{score:99999,wave:20,kills:4000,won:true}, ghost:{score:1}};
    const a=migrateSave(null,best), b=migrateSave({},JSON.stringify(best)), c=migrateSave(undefined,null), d=migrateSave('junk',best), e=migrateSave({v:'x'},null);
    return {a:a.acct, bv:b.v, bc:b.acct.records.classic, bp:b.acct.flags.pioneer, c:c.acct.flags, d:d.acct.flags.pioneer, e:e.v, ev:e.chars}; })()`);
  ok('migrateSave(v0 + best): นำเข้าสถิติไป acct.records.classic · pioneer = true · migratedBest = true · คลาสที่ไม่รู้จักถูกตัด',
    deq(m.a.records.classic, { swordsman: { score: 12345, wave: 14, kills: 900, won: false }, mage: { score: 99999, wave: 20, kills: 4000, won: true } }) && m.a.flags.pioneer === true && m.a.flags.migratedBest === true, m.a);
  ok('migrateSave: {} (ไม่มี v) + best แบบ string ก็นำเข้า · ไม่มี best → pioneer = false · ไม่ใช่ object → เซฟใหม่ v1',
    m.bv === 1 && m.bc.mage.score === 99999 && m.bp === true && m.c.pioneer === false && m.c.migratedBest === false && m.d === true && m.e === 1 && deq(m.ev, []), m);
  const ro = X(`(()=>{ const o={v:2, sid:'s_abc', chars:[{id:'c_x', name:'ใหม่กว่า', cls:'mage', lv:70, future:1}], acct:{gold:5}, extra:{a:1}};
    const s=migrateSave(o,null); return {v:s.v, ro:s.ro, enumerable:Object.keys(s).includes('ro'), json:JSON.stringify(s).includes('"ro"'), lv:s.chars[0].lv, src:o.chars[0].lv}; })()`);
  ok('migrateSave(v > SCHEMA_V) → อ่านอย่างเดียว (s.ro, ไม่ติดไปกับ JSON) · ข้อมูลต้นฉบับไม่ถูกแก้', ro.v === 2 && ro.ro === true && !ro.enumerable && !ro.json && ro.lv === 60 && ro.src === 70, ro);
}

// ------------------------------------------------------------------------------------------------
console.log('§6.3 validateSave clamp');
{
  const { X } = fresh();
  const v = X(`(()=>{ const evil={v:1, sid:'<b>', owner:'me@mail.com', created:-5, mt:'x', play:-1, app:'<script>',
    acct:{gold:-50, marks:1e15, stashMax:999, survTier:99, stash:[{id:'m_dust', n:0}], runIds:['r_ok','bad id',5,'r_ok'].concat(Array.from({length:40},(_,i)=>'r_'+i)),
      records:{classic:{swordsman:{score:-1,wave:99,kills:'7',won:'yes'}, nope:{score:1}, __proto__:{polluted:1}},
        survival:{c_good:{0:{wave:5,kills:3,won:true}, 99:{wave:1}}, '../x':{}}, boss:{lich:{0:{sec:-3,medal:'Z'}, 9:{}}}},
      daily:{day:'tomorrow', surv:{0:1, x:1}}, flags:{pioneer:'true', tips:{a:1, __proto__:1}}},
    chars:[
      {id:'c_aaa', name:'\\u0000ลูน่า\\n<img src=x onerror=alert(1)>', cls:'mage', job:'knight', lv:999, xp:-4, pts:9999, st:{STR:80, VIT:-3, AGI:'12', DEX:2.7, INT:null, LUK:50, HAX:9},
       jlv:44, jxp:1e9, sp:999, sk:{mbolt:9, flame:2, meteor:5, slash:3}, pas:{p_runefocus:7, p_heavyarms:2}, load:['meteor','flame','flame','slash','frost'],
       eq:{weapon:'i_missing', body:'i_b1', head:'i_b1', hat:'i_b1'}, bagMax:5,
       inv:[{u:'i_b1',id:'b_cotton',r:15,f:99,s:['x_rune','BAD',1,2],lk:'y'},{id:'m_dust',n:-4},{id:'<x>',n:1},{u:'i_b1',id:'w_dup',r:1}, 'str', null,
            {id:'u_potion_s',n:5000},{u:'i_c1',id:'c_old'},{u:'i_c2',id:'c_old'},{u:'i_c3',id:'c_old'},{u:'i_c4',id:'c_old'}],
       quick:['u_potion_s','<b>',3], trial:{t2:5}, zone:'Z!', visited:['z1','z1','z2'], bestiary:{beetle:-1, Bad:3}, resets:{free:0}},
      {id:'c_aaa', name:'a', cls:'thief'},
      {id:'c_bbb', name:'ผู้กล้า', cls:'necromancer'},
      {id:'c_ccc', name:'สาม', cls:'cleric'},
      {id:'c_ddd', name:'สี่', cls:'archer'},
    ], active:'c_zzz'};
    const s=validateSave(evil), c=s.chars[0];
    return {s, c, ids:s.chars.map(x=>x.id), names:s.chars.map(x=>x.name), polluted:({}).polluted, again:JSON.stringify(validateSave(JSON.parse(JSON.stringify(s))))===JSON.stringify(s)}; })()`);
  const s = v.s, c = v.c;
  ok('เซฟ: sid/owner/เวลา/app ผิดรูป → ค่าที่ปลอดภัย · owner ที่เป็นอีเมล → null', /^s_[a-z0-9]+$/.test(s.sid) && s.owner === null && s.created === 0 && s.play === 0 && s.app === '2.0.0-m1', s);
  ok('acct: gold ≥ 0 · marks ≤ เพดาน · stashMax ≤ 120 · survTier ≤ 10 · ของซ้อน n ≥ 1 · runIds เฉพาะรูปแบบถูก ไม่ซ้ำ เก็บ 30 ล่าสุด',
    s.acct.gold === 0 && s.acct.marks === 999999 && s.acct.stashMax === 120 && s.acct.survTier === 10 && s.acct.stash[0].n === 1 && s.acct.runIds.length === 30 && s.acct.runIds[29] === 'r_39' && !s.acct.runIds.includes('bad id'), s.acct);
  ok('records/daily/flags: ค่าถูก clamp · key แปลกถูกตัด · ไม่มี prototype pollution',
    deq(s.acct.records.classic, { swordsman: { score: 0, wave: 20, kills: 7, won: false } }) && deq(s.acct.records.survival, { c_good: { 0: { wave: 5, kills: 3, won: true } } })
    && deq(s.acct.records.boss, { lich: { 0: { sec: 0, medal: 'B' } } }) && s.acct.daily.day === '' && deq(s.acct.daily.surv, { 0: 1 }) && s.acct.flags.pioneer === false
    && deq(s.acct.flags.tips, { a: 1 }) && v.polluted === undefined, s.acct);
  ok('ตัวละครไม่เกิน 3 · อาชีพที่ไม่รู้จักถูกตัด · id ซ้ำได้ id ใหม่ · active ที่ไม่มีอยู่ → ตัวแรก',
    s.chars.length === 3 && v.ids[0] === 'c_aaa' && v.ids[1] !== 'c_aaa' && v.ids[2] === 'c_ccc' && s.active === 'c_aaa', v.ids);
  ok('ชื่อ: ตัดอักขระควบคุมและสัญลักษณ์ · ไม่เกิน 16 ตัวอักษร · สั้นเกินใช้ชื่ออาชีพ', c.name === 'ลูน่าimg srcx on' && [...c.name].length <= 16 && /^[\p{L}\p{M}\p{N} ]{2,16}$/u.test(c.name) && v.names[1] === 'โจร', v.names);
  ok('ตัวละคร: lv 1–60 · xp ≥ 0 · job ที่ไม่ใช่ของอาชีพ → null · jlv ≤ 20 · st 0–50 (สตริง/เศษ/null ถูกแปลง) · คีย์แปลกถูกตัด',
    c.lv === 60 && c.xp === 0 && c.job === null && c.jlv === 20 && c.jxp === 0 && deq(c.st, { STR: 50, VIT: 0, AGI: 12, DEX: 2, INT: 0, LUK: 50 }), c);
  ok('แต้มสถานะ ≤ แต้มที่ได้ − ที่ใช้แล้ว (ใช้เกิน → 0) · แต้มสกิล ≤ 19 − ที่ใช้แล้ว 13 = 6',
    c.pts === Math.max(0, 186 - (98 + 98 + 12 + 2)) && c.sp === 19 - (7 - 1 + 2 + 5), [c.pts, c.sp]);
  ok('sk / pas: ★ 0–5 · เฉพาะสกิลของอาชีพ (สกิลขั้นสูงต้องมี job) · passive ของอาชีพอื่นถูกตัด · ★1 ฟรีของสกิลแรกคงอยู่',
    deq(c.sk, { mbolt: 5, flame: 2 }) && deq(c.pas, { p_runefocus: 5 }), [c.sk, c.pas]);
  ok('load: ไม่ซ้ำ · ★ ≥ 1 เท่านั้น · ไม่เกินช่อง', deq(c.load, ['flame']), c.load);
  ok('inv: r 0–10 · ช่องรูนไม่เกิน 2 · uid ซ้ำได้ uid ใหม่ · ของซ้อน n 1–999 · id ผิดรูปถูกตัด · id ที่ไม่รู้จักเก็บไว้แบบ unk:1 · ไม่เกิน bagMax (80)',
    c.inv[0].r === 10 && c.inv[0].f === 20 && deq(c.inv[0].s, ['x_rune', null]) && c.inv[0].lk === 1 && c.inv[0].unk === 1 && c.inv[1].n === 1 && c.inv[2].id === 'w_dup' && c.inv[2].u !== 'i_b1'
    && c.inv.find(x => x.id === 'u_potion_s').n === 999 && !c.inv.some(x => x.id === '<x>') && c.bagMax === 80 && c.inv.length === 8, c.inv);
  ok('eq: uid ที่ไม่มีใน inv → null · uid เดียวสวมสองช่องไม่ได้ (ช่องแรกตามลำดับได้ไป เมื่อไม่รู้จักไอเทม) · ช่องแปลกถูกตัด', c.eq.weapon === null && c.eq.head === 'i_b1' && c.eq.body === null && !('hat' in c.eq) && Object.keys(c.eq).length === 10, c.eq);
  ok('quick / trial / zone / visited / bestiary / resets ถูก clamp', deq(c.quick, ['u_potion_s', null]) && c.trial.t2 === 0 && c.zone === 'z1' && deq(c.visited, ['z1', 'z2']) && deq(c.bestiary, { beetle: 0 }) && c.resets.free === 0 && c.resets.skFree === 1, c);
  ok('validateSave ซ้ำได้ผลเดิม (idempotent)', v.again === true);
  const trim = X(`(()=>{ const ch=newChar('ทดสอบ','mage'); ch.bagMax=80; ch.inv=[]; for(let i=0;i<90;i++) ch.inv.push({u:'i_'+i, id:'w_x'}); ch.eq.weapon='i_85';
    const c=validateSave({v:1, chars:[ch]}).chars[0]; return [c.inv.length, c.eq.weapon, c.inv.some(x=>x.u==='i_85')]; })()`);
  ok('inv เกิน bagMax: ตัดส่วนเกิน แต่ของที่สวมอยู่ไม่หาย', deq(trim, [80, 'i_85', true]), trim);
}

// ------------------------------------------------------------------------------------------------
console.log('§6.2 เซฟในเครื่อง: คีย์ · write-ahead · .bak · ผู้เล่นเก่า · อ่านอย่างเดียว · sandbox');
{
  const best = '{"swordsman":{"score":4321,"wave":12,"kills":777,"won":false}}';
  const { X, ls, dump, notes } = fresh();
  ls.setItem('runeguard.best', best); ls.setItem('runeguard.quality', 'low');
  const r = X(`(()=>{ const s=loadSaveFor(null); return {pioneer:s.acct.flags.pioneer, rec:s.acct.records.classic.swordsman, owner:s.owner, cur:curChar()}; })()`);
  ok('ผู้เล่นเก่า (มี runeguard.best ไม่มีเซฟ): นำเข้าสถิติ · pioneer = true · บันทึกเป็น runeguard.save.guest', r.pioneer === true && r.rec.score === 4321 && r.owner === null && r.cur === null && !!ls.getItem('runeguard.save.guest'), r);
  X(`createChar('ลูน่า','mage'); createChar('บอส','swordsman'); setActiveChar(SAVE.chars[0].id); deleteChar(SAVE.chars[1].id); saveNow('t');`);
  X(`importSave(exportSave()); DEV.profile.gold(10); resetStats(curChar(),{}); saveNow('t2');`);
  ok('คีย์เดิม runeguard.best และ runeguard.quality ไม่เปลี่ยนแม้แต่ไบต์เดียว หลังโหลด/สร้าง/ลบ/นำเข้า/บันทึก', ls.getItem('runeguard.best') === best && ls.getItem('runeguard.quality') === 'low');
  const keys = Object.keys(dump()).sort();
  ok('ใช้เฉพาะคีย์ใน §6.2', keys.every(k => ['runeguard.best', 'runeguard.quality', 'runeguard.save.guest', 'runeguard.save.guest.bak', 'runeguard.settings'].includes(k)), keys);
  const main1 = ls.getItem('runeguard.save.guest');
  X(`curChar().kills=5; saveNow('t3');`);
  ok('write-ahead: ก่อนเขียนค่าใหม่ ค่าเดิม (ที่ parse ได้) ถูกคัดลอกไป .bak', ls.getItem('runeguard.save.guest.bak') === main1 && ls.getItem('runeguard.save.guest') !== main1);
  // newer classic record → folded into records on the next load; the key stays read only
  const best2 = '{"swordsman":{"score":9000,"wave":15,"kills":800,"won":false}}'; ls.setItem('runeguard.best', best2);
  ok('สถิติคลาสสิกที่ใหม่กว่าใน runeguard.best ถูกรวมเข้า records ตอนโหลดครั้งต่อไป (คีย์ไม่ถูกแตะ)', X(`loadSaveFor(null).acct.records.classic.swordsman.score`) === 9000 && ls.getItem('runeguard.best') === best2);
  // corrupt main → .bak · both corrupt → new + toast
  const goodBak = ls.getItem('runeguard.save.guest.bak');
  ls.setItem('runeguard.save.guest', '{"v":1,"chars":[');
  const fb = X(`(()=>{ const s=loadSaveFor(null); return {n:s.chars.length, kills:s.chars[0]&&s.chars[0].kills, st:svlState().from}; })()`);
  ok('คีย์หลักเสีย → ใช้ .bak + toast "เซฟในเครื่องเสีย ใช้สำรองแทน" · คีย์หลักถูกเขียนใหม่ · .bak เดิมยังอยู่',
    fb.n === 1 && fb.st === 'bak' && notes.some(n => n[0] === 'เซฟในเครื่องเสีย ใช้สำรองแทน') && ls.getItem('runeguard.save.guest.bak') === goodBak && JSON.parse(ls.getItem('runeguard.save.guest')).v === 1, fb);
  ls.setItem('runeguard.save.guest', 'garbage'); ls.setItem('runeguard.save.guest.bak', '[1,2]');
  const nw = X(`(()=>{ const s=loadSaveFor(null); return {n:s.chars.length, st:svlState().from, rec:s.acct.records.classic.swordsman.score}; })()`);
  ok('เสียทั้งคู่ → เซฟใหม่ (ยังนำเข้าสถิติคลาสสิก) + toast', nw.n === 0 && nw.st === 'lost' && nw.rec === 9000 && notes.some(n => /เซฟในเครื่องเสีย/.test(n[0])), nw);
  // user key
  X(`loadSaveFor('0b1c-uid'); createChar('ออนไลน์','thief');`);
  ok('เซฟของบัญชีอยู่ที่ runeguard.save.u.<uid> · owner = uid', JSON.parse(ls.getItem('runeguard.save.u.0b1c-uid')).owner === '0b1c-uid' && X(`SAVE.owner`) === '0b1c-uid');
}
{
  const { X, ls, dump, notes } = fresh();
  const future = JSON.stringify({ v: 2, sid: 's_future', owner: null, acct: { gold: 77 }, chars: [{ id: 'c_f1', name: 'อนาคต', cls: 'mage', lv: 5 }], active: 'c_f1', newField: { x: 1 } });
  ls.setItem('runeguard.save.guest', future);
  const before = JSON.stringify(dump());
  const ro = X(`(()=>{ const s=loadSaveFor(null); const out={ro:saveReadOnly(), lv:curChar().lv, gold:s.acct.gold};
    out.now=saveNow('x'); saveLocal('y'); out.create=createChar('ใหม่','mage'); out.del=deleteChar('c_f1'); out.commit=commitStats(curChar(),{STR:1});
    out.learn=canLearn(curChar(),'flame'); out.imp=importSave(JSON.stringify(newSave(null))); out.reset=DEV.profile.reset(); out.exp=grantExp(curChar(),9999,9999).lvUp;
    out.rw=grantRewards(curChar(),{runId:'r_ro1',baseXp:500,gold:5}); return out; })()`);
  ok('เซฟ v > SCHEMA_V: อ่านอย่างเดียว · แสดงผลได้ · toast "มีเวอร์ชันใหม่ แตะเพื่ออัปเดต"', ro.ro === true && ro.lv === 5 && ro.gold === 77 && notes.some(n => n[0] === 'มีเวอร์ชันใหม่ แตะเพื่ออัปเดต'), ro);
  ok('อ่านอย่างเดียว: saveNow / สร้าง / ลบ / แจกแต้ม / เรียนสกิล / นำเข้า / reset / EXP / รางวัล ถูกปฏิเสธทั้งหมด',
    ro.now === false && typeof ro.create === 'string' && ro.del === false && ro.commit === false && ro.learn !== '' && ro.imp.ok === false && ro.reset === 'read only' && ro.exp === 0 && ro.rw === false, ro);
  await new Promise(res => setTimeout(res, 900));
  ok('อ่านอย่างเดียว: localStorage ไม่เปลี่ยนเลย (รวมหลัง debounce 800 ms)', JSON.stringify(dump()) === before);
}
{
  const { X, ls, dump } = fresh();
  ls.setItem('runeguard.best', '{"mage":{"score":5,"wave":1,"kills":2,"won":false}}');
  const before = JSON.stringify(dump());
  const sb = X(`(()=>{ DEV.profile.sandbox(true); DEV.profile.char({cls:'mage', lv:20, jlv:20, sk:{flame:3, frost:1}}); const ch=curChar();
    DEV.profile.gold(800); ch.trial.t2=1; const adv=advanceJob(ch,'archmage'); learnSkill(ch,'meteor'); saveSettings({mute:true}); saveLocal('x'); saveNow('y');
    const r=onRunEnd({char:ch, modeId:'survival', tier:0, wave:20, kills:10, t:500, runId:'r_sb1', loot:[], goldRun:0, player:{hp:1}}, true, {commit:true});
    return {adv, job:ch.job, lv:ch.lv, load:ch.load, gold:SAVE.acct.gold, state:svlState(), committed:r.committed}; })()`);
  await new Promise(res => setTimeout(res, 900));
  ok('sandbox: แก้ตัวละคร/เลื่อนอาชีพ/รับรางวัล/ตั้งค่าได้ในหน่วยความจำ', sb.adv === true && sb.job === 'archmage' && sb.lv === 20 && sb.committed === true && sb.state.sandbox === true, sb);
  ok('sandbox: ไม่เขียน localStorage เลยแม้แต่คีย์เดียว (รวมหลัง debounce)', JSON.stringify(dump()) === before);
  const back = X(`(()=>{ DEV.profile.sandbox(false); return {n:SAVE.chars.length, sb:svlState().sandbox}; })()`);
  ok('sandbox(false): กลับมาใช้เซฟในเครื่อง (ตัวละครใน sandbox หายไป)', back.n === 0 && back.sb === false, back);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.8 / §6.3 ตัวละคร: สร้าง · เลือก · ลบ · ชื่อ');
{
  const { X } = fresh();
  const c = X(`(()=>{ loadSaveFor(null); const o={};
    o.short=createChar('ก','mage'); o.long=createChar('12345678901234567','mage'); o.ctl=createChar('ab\\u0007cd','mage'); o.html=createChar('<b>bad</b>','mage');
    o.cls=createChar('ลูน่า','necromancer'); const a=createChar('  ลูน่า   ดาว ','mage'); o.a=a.name; o.dup=createChar('ลูน่า ดาว','thief');
    const b=createChar('Hero 2','swordsman'), d=createChar('ธนูไว','archer'); o.full=createChar('เกิน','cleric');
    o.new=JSON.parse(JSON.stringify(a)); o.active=SAVE.active===d.id; o.set=setActiveChar(a.id); o.cur=curChar().id===a.id; o.setBad=setActiveChar('c_nope');
    o.del=deleteChar(a.id); o.after=SAVE.active===SAVE.chars[0].id&&SAVE.chars.length===2; o.del2=deleteChar(a.id); o.sum=saveSummary(SAVE); o.trivial=isTrivialSave(SAVE);
    curChar().lv=2; o.trivial2=isTrivialSave(SAVE); return o; })()`);
  ok('ชื่อ 2–16 ตัวอักษร (ไทย/อังกฤษ/ตัวเลข/เว้นวรรค): สั้น/ยาว/อักขระควบคุม/HTML ถูกปฏิเสธพร้อมเหตุผล · อาชีพไม่รู้จักถูกปฏิเสธ',
    [c.short, c.long, c.ctl, c.html].every(x => /^ชื่อต้องยาว/.test(x)) && c.cls === 'ไม่พบอาชีพนี้', c);
  ok('เว้นวรรคซ้ำ/หัวท้ายถูกตัด · ชื่อซ้ำไม่ได้ · ครบ 3 ตัวแล้วสร้างไม่ได้', c.a === 'ลูน่า ดาว' && c.dup === 'มีตัวละครชื่อนี้แล้ว' && /สูงสุด 3/.test(c.full), c);
  ok('ตัวใหม่ (§3.8): Lv1 · แต้มสถานะ 5 · สกิลแรก ★1 · load = [skills[0]] · trial.t2 = 0 · ตัวที่สร้างล่าสุดเป็นตัวที่เลือก',
    c.new.lv === 1 && c.new.pts === 5 && deq(c.new.sk, { mbolt: 1 }) && deq(c.new.load, ['mbolt']) && c.new.trial.t2 === 0 && c.new.jlv === 1 && c.new.sp === 0 && c.new.job === null && c.active, c.new);
  ok('setActiveChar / curChar / deleteChar (ลบตัวที่เลือก → เลือกตัวแรกแทน · ลบซ้ำไม่ได้)', c.set && c.cur && c.setBad === false && c.del && c.after && c.del2 === false, c);
  ok('saveSummary · isTrivialSave', c.sum.chars.length === 2 && c.sum.chars[0].lv === 1 && c.sum.appVer === '2.0.0-m1' && c.trivial === true && c.trivial2 === false, c.sum);
  const st = X(`(()=>{ const a=loadSettings(); const b=saveSettings({autoPot:5, mute:1, cardAuto:true, haptics:false}); const c=saveSettings({autoPot:0}); return [a,b,c]; })()`);
  ok('ตั้งค่า: ค่าเริ่มต้น {mute:false, autoPot:0.35, cardAuto:false, haptics:true} · clamp ค่าแปลก · autoPot 0 = ปิด',
    deq(st[0], { mute: false, autoPot: 0.35, cardAuto: false, haptics: true }) && deq(st[1], { mute: false, autoPot: 0.9, cardAuto: true, haptics: false }) && st[2].autoPot === 0, st);
}

// ------------------------------------------------------------------------------------------------
console.log('§2.2 / §11.2 รางวัลจบรอบ: commit · runId ครั้งเดียว');
{
  const { X } = fresh();
  const rw = X(`(()=>{ loadSaveFor(null); const ch=createChar('รางวัล','swordsman'); const out={};
    const G0={char:ch, modeId:'survival', tier:0, wave:20, kills:3000, t:540, runId:'r_win1', loot:[], goldRun:40, player:{hp:10}};
    const r0=onRunEnd(Object.assign({},G0,{runId:'r_auto1'}),true,{commit:false});
    out.noCommit={xp:ch.xp, lv:ch.lv, gold:SAVE.acct.gold, kills:ch.kills, ids:SAVE.acct.runIds.length, committed:r0.committed, base:r0.baseXp};
    const r1=onRunEnd(G0,true,{commit:true}); out.r1={base:r1.baseXp, job:r1.jobXp, gold:r1.gold, daily:r1.daily, lvUp:r1.lvUp, committed:r1.committed, unlocks:r1.unlocks};
    out.after1={lv:ch.lv, xp:ch.xp, jlv:ch.jlv, jxp:ch.jxp, gold:SAVE.acct.gold, kills:ch.kills, play:ch.play, rec:SAVE.acct.records.survival[ch.id], tier:SAVE.acct.survTier, boss:SAVE.acct.bossUnlock, daily:SAVE.acct.daily.surv};
    out.again=grantRewards(ch,r1); out.again2=grantRewards(ch,Object.assign({},r1)); out.after2={xp:ch.xp, gold:SAVE.acct.gold, kills:ch.kills};
    const r2=onRunEnd(Object.assign({},G0,{runId:'r_win2', goldRun:0}),true,{commit:true}); out.r2={base:r2.baseXp, gold:r2.gold, daily:r2.daily};
    const r3=onRunEnd(Object.assign({},G0,{runId:'r_lose', wave:7, kills:300, goldRun:0, player:{hp:0}}),false,{commit:true}); out.r3={base:r3.baseXp, gold:r3.gold, deaths:ch.deaths, rec:SAVE.acct.records.survival[ch.id][0]};
    ch.lv=20; const r4=onRunEnd(Object.assign({},G0,{runId:'r_over', goldRun:0}),true,{commit:false}); out.r4=r4.baseXp;
    const t=onRunEnd({char:ch, modeId:'trial', wave:0, kills:5, t:80, runId:'r_trial', loot:[], player:{hp:3}},true,{commit:true}); out.trial={t2:ch.trial.t2, base:t.baseXp, unlocks:t.unlocks};
    out.classic=onRunEnd({char:null, modeId:'classic'},true,{commit:true}); out.ids=SAVE.acct.runIds.slice();
    return out; })()`);
  ok('commit:false (G.auto โดยไม่ตั้ง RG.commit): คำนวณรางวัลได้ แต่เซฟไม่เปลี่ยน', rw.noCommit.xp === 0 && rw.noCommit.lv === 1 && rw.noCommit.gold === 0 && rw.noCommit.kills === 0 && rw.noCommit.ids === 0 && rw.noCommit.committed === false && rw.noCommit.base > 0, rw.noCommit);
  ok('ชนะ T0 ครบ 20 คลื่น: Base EXP = bxpNeed(1) × 1.1 × 2 (โบนัสรายวัน) = 638 · Job = 0.8× · ทอง = (15×20 + 15×10 + การ์ด 40) × 2 = 980',
    rw.r1.base === 638 && rw.r1.job === 510 && rw.r1.gold === 980 && rw.r1.daily === true && rw.r1.committed === true, rw.r1);
  ok('รางวัลเข้าเซฟ: ทองของบัญชี · EXP/เลเวล · สถิติ survival · ปลดระดับนรก T1 · ปลดบอส', rw.after1.gold === 980 && rw.after1.lv === 2 && rw.after1.kills === 3000 && rw.after1.play === 540
    && rw.after1.rec[0].wave === 20 && rw.after1.rec[0].won === true && rw.after1.tier === 1 && rw.after1.boss.king === 1 && rw.after1.daily[0] === 1, rw.after1);
  ok('grantRewards ด้วย runId เดิม (ทั้ง object เดิมและสำเนา) ไม่ให้รางวัลซ้ำ', rw.again === false && rw.again2 === false && rw.after2.xp === rw.after1.xp && rw.after2.gold === rw.after1.gold && rw.after2.kills === rw.after1.kills, rw.after2);
  ok('รอบที่สองของวันในระดับเดิม: ไม่มี ×2 (319 EXP · 450 ทอง)', rw.r2.base === 319 && rw.r2.gold === 450 && rw.r2.daily === false, rw.r2);
  ok('แพ้ที่คลื่น 7 (ผ่าน 6): EXP = round(290 × 0.24) = 70 · ทอง 90 · deaths +1 · สถิติดีสุดไม่ถูกทับ', rw.r3.base === 70 && rw.r3.gold === 90 && rw.r3.deaths === 1 && rw.r3.rec.wave === 20, rw.r3);
  ok('overLv: Lv20 เล่น T0 (recLv 1) ได้ EXP × 0.2', rw.r4 === Math.round(290 * 1.1 * 0.2), rw.r4);
  ok('บททดสอบชนะ (commit): ตั้ง trial.t2 = 1 · ไม่ให้ EXP · คลาสสิก (ไม่มี char) ไม่มีรางวัล', rw.trial.t2 === 1 && rw.trial.base === 0 && rw.classic === null, rw.trial);
  ok('runIds ของบัญชีเก็บทุกรอบที่ commit แล้ว', deq(rw.ids, ['r_win1', 'r_win2', 'r_lose', 'r_trial']), rw.ids);
  const fk = X(`(()=>{ const ch=newChar('ทุ่ง','mage'); ch.lv=10; const a=fieldKillExp(ch,{lv:10}), b=fieldKillExp(ch,{lv:18}), c=fieldKillExp(ch,{lv:1});
    ch.xp=50; const loss=pgFieldDeath(ch); return {a,b,c,loss,xp:ch.xp}; })()`);
  ok('fieldKillExp = mobExp · diffMul (Lv10 vs มอน 10 = 31 · มอน 18 = 60×1.32 · มอน 1 = 6×0.37) · Job 0.8× · ตายในทุ่งเสีย 1% ไม่ต่ำกว่า 0',
    fk.a.base === 31 && fk.a.job === 25 && fk.b.base === Math.round(60 * 1.32) && fk.b.job === Math.round(fk.b.base * 0.8) && fk.c.base === Math.round(6 * 0.37) && fk.loss === 50 && fk.xp === 0, fk);
}

// ------------------------------------------------------------------------------------------------
console.log('§10 / §6.10 ส่งออก → นำเข้า');
{
  const { X, ls } = fresh();
  const ex = X(`(()=>{ loadSaveFor(null); const a=createChar('ส่งออก','cleric'); createChar('สอง','thief'); setActiveChar(a.id);
    DEV.profile.char({lv:22, jlv:20, sk:{holy:3, heal:2}, st:{VIT:10}, trial:1}); SAVE.acct.gold=1234; SAVE.acct.records.survival[a.id]={0:{wave:9,kills:50,won:false}};
    SAVE.acct.runIds.push('r_x1'); a.inv.push({u:'i_t1', id:'b_cotton', r:3, f:0, s:[], lk:1}); a.eq.body='i_t1'; saveNow('pre');
    loadSaveFor(null);                                              // the stored (validated) form, as after any reload
    const json=exportSave(), before=JSON.parse(json);
    SAVE.chars[0].lv=1; SAVE.acct.gold=0; saveNow('mod');           // change and save, then import the export back
    const r=importSave(json); const after=JSON.parse(exportSave());
    const bad=[importSave('{'), importSave('[]'), importSave(JSON.stringify({v:9, chars:[], acct:{}})), importSave(''), importSave('x'.repeat(300000))];
    return {r, same:JSON.stringify(before), after:JSON.stringify(after), bad, still:SAVE.acct.gold}; })()`);
  ok('export → import ได้ค่าเท่าเดิมทุก field', ex.r.ok === true && deq(JSON.parse(ex.same), JSON.parse(ex.after)), ex.r);
  ok('import ที่ผิด (JSON พัง / ไม่ใช่เซฟ / เวอร์ชันใหม่กว่า / ว่าง / ใหญ่เกิน 256 KB) ถูกปฏิเสธพร้อมเหตุผลไทย และไม่แตะเซฟ',
    ex.bad.every(b => b.ok === false && typeof b.err === 'string' && /[ก-๙]/.test(b.err)) && ex.still === 1234, ex.bad);
  ok('import เขียนผ่าน write-ahead (เซฟก่อนนำเข้าอยู่ใน .bak)', JSON.parse(ls.getItem('runeguard.save.guest.bak')).acct.gold === 0);
}
{
  // straight from play (no reload): every mutator leaves the save in its validated form, so the round trip is exact too
  const { X } = fresh();
  const rt = X(`(()=>{ loadSaveFor(null); const ch=createChar('เล่นจริง','archer'); commitStats(ch,{DEX:3,AGI:2}); while(ch.jlv<7) grantExp(ch,0,BAL.jxpNeed(ch.jlv,1)-ch.jxp); learnSkill(ch,'arrow'); learnSkill(ch,'spread'); learnSkill(ch,'p_huntereye');
    setLoadout(ch,['spread','arrow']); onRunEnd({char:ch, modeId:'survival', tier:0, wave:12, kills:900, t:400, runId:'r_rt1', loot:[], goldRun:25, player:{hp:0}},false,{commit:true});
    SAVE.acct.flags.tips.first=1; const before=exportSave(); const r=importSave(before); return {r, eq:before, after:exportSave()}; })()`);
  ok('export → import หลังเล่นจริง (แจกแต้ม · เรียนสกิล · loadout · รางวัลจบรอบ) ได้ค่าเท่าเดิมทุก field', rt.r.ok && deq(JSON.parse(rt.eq), JSON.parse(rt.after)), rt.r);
}

// ------------------------------------------------------------------------------------------------
console.log('dev hook RG.profile.*');
{
  const { X } = fresh();
  const d = X(`(()=>{ DEV.profile.sandbox(true); const ch=DEV.profile.char({cls:'swordsman', lv:20, jlv:20, sk:{slash:5, slam:3, blades:3, bulwark:1}});
    const a={lv:ch.lv, jlv:ch.jlv, load:ch.load.slice(), pts:ch.pts, sp:ch.sp, sk:ch.sk};
    const k=DEV.profile.char({job:'knight', jlv:3, sk:{lance:2}}); const b={job:k.job, jlv:k.jlv, load:k.load.slice(), same:k===ch};
    const m=DEV.profile.char({cls:'mage'}); return {a, b, n:SAVE.chars.length, cls:m.cls, keys:Object.keys(DEV.profile).sort().join(), gold:DEV.profile.gold(42), get:DEV.profile.get()===SAVE, json:typeof DEV.profile.json()}; })()`);
  ok('RG.profile.char({lv:20, jlv:20, sk}) สร้าง/แก้ตัวที่เลือก · load = สกิลที่ ★ ≥ 1 (≤ 4 ช่อง) · แต้มที่เหลือคำนวณเอง',
    d.a.lv === 20 && d.a.jlv === 20 && deq(d.a.load, ['slash', 'slam', 'blades', 'bulwark']) && d.a.pts === 44 && d.a.sp === 19 - (7 - 1) - 3 - 3 - 1, d.a);
  ok('RG.profile.char({job, sk}) แก้ตัวเดิม (object เดิม) · cls ใหม่ → สร้างตัวใหม่', d.b.job === 'knight' && d.b.jlv === 3 && d.b.load.includes('lance') && d.b.same && d.n === 2 && d.cls === 'mage', d.b);
  ok('RG.profile มี sandbox/get/json/reset/char/give/gold/exp/state', d.keys === 'char,exp,get,give,gold,json,reset,sandbox,state' && d.gold === 42 && d.get && d.json === 'string', d.keys);
}

// ------------------------------------------------------------------------------------------------
console.log('fix-r1 · สองแท็บ · เซฟหลักพังแบบ parse ได้ · .bak · export อ่านอย่างเดียว · ชื่อ · คีย์ prototype');
{
  const shared = memStorage(), K = 'runeguard.save.guest';
  const A = fresh({ localStorage: shared }), B = fresh({ localStorage: shared });
  A.X(`loadSaveFor(null)`); B.X(`loadSaveFor(null)`);                  // B loads, then A moves on
  A.X(`createChar('แท็บหนึ่ง','mage'); DEV.profile.gold(5000); DEV.profile.exp(30000)`);
  const lvA = A.X(`curChar().lv`);
  const b1 = B.X(`(()=>{ const r=createChar('แท็บสอง','thief'); return {ok:typeof r==='object', n:SAVE.chars.length, gold:SAVE.acct.gold}; })()`);
  const m1 = JSON.parse(shared.getItem(K));
  ok('สองแท็บ: แท็บที่ค้างสร้างตัวละคร → โหลดของแท็บอื่นก่อน แล้วเพิ่มต่อ (ทอง/เลเวลของอีกแท็บไม่หาย)',
    b1.ok && b1.n === 2 && b1.gold === 5000 && m1.chars.length === 2 && m1.acct.gold === 5000 && m1.chars[0].lv === lvA && lvA > 1, { b1, gold: m1.acct.gold });
  A.X(`loadSaveFor(null); DEV.profile.gold(6000)`);                     // A writes again; B is stale
  const w = B.X(`(()=>{ SAVE.acct.flags.tips.stale=1; const r=saveNow('stale'); return {r, gold:SAVE.acct.gold, tip:!!SAVE.acct.flags.tips.stale}; })()`);
  const m2 = JSON.parse(shared.getItem(K));
  ok('สองแท็บ: แท็บที่ค้างเขียนทับไม่ได้ → โหลดใหม่ + toast · ทองในเครื่องยังเป็นของอีกแท็บ',
    w.r === false && w.gold === 6000 && w.tip === false && m2.acct.gold === 6000 && B.notes.some(n => /อีกแท็บ/.test(n[0])), { w, gold: m2.acct.gold });
  ok('สองแท็บ: .bak ยังเป็นเซฟที่ดีของแท็บนั้น', JSON.parse(shared.getItem(K + '.bak')).acct.gold >= 5000);
  A.X(`DEV.profile.gold(7000)`);
  B.X(`svlOnStorage({key:'runeguard.save.guest'})`);
  ok('สองแท็บ: event "storage" ตอนว่าง → โหลดของอีกแท็บทันที', B.X(`SAVE.acct.gold`) === 7000);
  // mid-run: the storage event waits; onRunEnd re-reads, then pays onto the other tab's data
  B.X(`G={char:curChar(), over:false}`); A.X(`DEV.profile.gold(8000)`); B.X(`svlOnStorage({key:'runeguard.save.guest'})`);
  const mid = B.X(`SAVE.acct.gold`);
  const rr = B.X(`(()=>{ const g={char:G.char, modeId:'survival', tier:0, wave:7, kills:10, t:60, runId:'r_tab1', loot:[], goldRun:0, player:{hp:0}};
    const r=onRunEnd(g,false,{commit:true}); return {c:r.committed, gold:r.gold, same:g.char===curChar(), inSave:SAVE.chars.indexOf(g.char)>=0}; })()`);
  const m3 = JSON.parse(shared.getItem(K));
  ok('สองแท็บ: ระหว่างรอบไม่โหลดทับ · จบรอบแล้วรางวัลลงบนข้อมูลล่าสุด (8000 + ทองรางวัล)',
    mid === 7000 && rr.c && rr.inSave && m3.acct.gold === 8000 + rr.gold && m3.acct.runIds.includes('r_tab1'), { mid, rr, gold: m3.acct.gold });
}
{
  const goodSrc = fresh(); goodSrc.X(`loadSaveFor(null); createChar('สำรอง','mage'); DEV.profile.gold(1234);`);
  const good = goodSrc.ls.getItem('runeguard.save.guest');
  for (const bad of ['{"v":1}', '{"v":1,"chars":null}', '{"v":0}', '{"v":-1}', '{"v":1.5,"acct":{},"chars":[]}', '{"v":1e999,"acct":{},"chars":[]}', '{"v":"1","acct":{},"chars":[]}']) {
    const { X, ls, notes } = fresh();
    ls.setItem('runeguard.save.guest', bad); ls.setItem('runeguard.save.guest.bak', good);
    const r = X(`(()=>{ const s=loadSaveFor(null); const o={from:svlState().from, ro:saveReadOnly(), gold:s.acct.gold, n:s.chars.length}; createChar('ใหม่','thief'); return o; })()`);
    ok('เซฟหลัก ' + bad + ' → ใช้ .bak + toast · .bak ไม่ถูกขยะทับหลังเขียน',
      r.from === 'bak' && !r.ro && r.gold === 1234 && r.n === 1 && notes.some(n => n[0] === 'เซฟในเครื่องเสีย ใช้สำรองแทน') && JSON.parse(ls.getItem('runeguard.save.guest.bak')).acct.gold === 1234, r);
  }
  const { X, ls } = fresh();
  ls.setItem('runeguard.save.guest', '{"v":1,"acct":{"gold":"x"},"chars":[{"cls":"nope"}]}'); ls.setItem('runeguard.save.guest.bak', good);
  X(`loadSaveFor(null); createChar('ใหม่','thief'); saveNow('again');`);
  ok('เซฟหลักว่างเปล่า (โครงถูกแต่ไม่มีความคืบหน้า) ไม่ทับ .bak ที่มีความคืบหน้า', JSON.parse(ls.getItem('runeguard.save.guest.bak')).acct.gold === 1234);
}
{
  const { X, ls } = fresh();
  const future = JSON.stringify({ v: 2, sid: 's_future', acct: { gold: 77, gems: 5 }, chars: [{ id: 'c_f1', name: 'อนาคต', cls: 'mage', lv: 5, pet: 'cat', st: { WIS: 3 } }], active: 'c_f1' });
  ls.setItem('runeguard.save.guest', future);
  ok('export ของเซฟอ่านอย่างเดียว = ข้อความที่เก็บไว้เดิม (ไม่ตัด field ของเวอร์ชันใหม่)', X(`(loadSaveFor(null), exportSave())`) === future);
  ok('migrateSave: v ไม่ใช่จำนวนเต็ม (1.5) = ขยะ ไม่ใช่เวอร์ชันใหม่', X(`(()=>{ const s=migrateSave({v:1.5, acct:{gold:5}, chars:[]}); return !s.ro&&s.v===1; })()`));
}
{
  const { X } = fresh();
  const n = X(`(()=>{ loadSaveFor(null); const M='\u0301'; return {marks:createChar(M+M,'mage'), zalgo:createChar('a'+M.repeat(15),'mage'), one:createChar('a'+M+M,'mage'),
    thai:typeof createChar('กิ่งน้ำผึ้ง','mage'), clean:svCleanName('ab'+M.repeat(10)), lead:svCleanName(' '+M+'ab'), thai2:svCleanName('น้ำผึ้ง')}; })()`);
  ok('ชื่อ: มีแต่เครื่องหมาย / Zalgo / ตัวอักษรเดียว ถูกปฏิเสธ · ชื่อไทยมีวรรณยุกต์ใช้ได้ · validate ตัดเครื่องหมายเกิน 3 และที่ไม่มีตัวอักษรนำ',
    /^ชื่อต้องยาว/.test(n.marks) && /^ชื่อต้องยาว/.test(n.zalgo) && /^ชื่อต้องยาว/.test(n.one) && n.thai === 'object' && n.clean === 'ab\u0301\u0301\u0301' && n.lead === 'ab' && n.thai2 === 'น้ำผึ้ง', n);
  const p = X(`(()=>{ const s=validateSave(JSON.parse('{"v":1,"acct":{"fboss":{"constructor":{"next":1},"z1":{}},"records":{"boss":{"constructor":{}}},"bossUnlock":{"constructor":1},"flags":{"tips":{"toString":1,"hasOwnProperty":1,"constructor":1,"ok":1}}},"chars":[{"cls":"mage","bestiary":{"constructor":3,"beetle":2}}]}'));
    return {fb:Object.keys(s.acct.fboss), rb:Object.keys(s.acct.records.boss), bu:Object.keys(s.acct.bossUnlock).includes('constructor'), tips:Object.keys(s.acct.flags.tips), be:Object.keys(s.chars[0].bestiary)}; })()`);
  ok('validateSave: คีย์ชื่อเดียวกับของ Object.prototype (constructor / toString / hasOwnProperty) ถูกทิ้งทุก map',
    deq(p.fb, ['z1']) && p.rb.length === 0 && !p.bu && deq(p.tips, ['ok']) && deq(p.be, ['beetle']), p);
}

// ------------------------------------------------------------------------------------------------
console.log('fix-r2 · ตัวละครที่รอบถือไว้หลังโหลดใหม่จากอีกแท็บ · รางวัลต้องลงเซฟ · ค่าติดลบ');
{
  // end screen → other tab saves → storage event reloads → [เล่นอีกครั้ง] restarts with the old G.opts.char
  const shared = memStorage(), K = 'runeguard.save.guest';
  const A = fresh({ localStorage: shared }), B = fresh({ localStorage: shared });
  A.X(`loadSaveFor(null); createChar('สองแท็บ','swordsman')`);
  const run = (id, kills, ch) => `{char:${ch}, opts:{char:${ch}}, over:false, modeId:'survival', tier:0, wave:7, kills:${kills}, t:60, runId:'${id}', loot:[], goldRun:0, player:{hp:0}}`;
  const r1 = A.X(`(()=>{ const ch=curChar(); G=${run('r_o1', 64, 'ch')}; const r=onRunEnd(G,false,{commit:true}); G.over=true; globalThis.stale=ch; return r.committed; })()`);
  B.X(`loadSaveFor(null); DEV.profile.gold(SAVE.acct.gold+500)`);
  const g1 = JSON.parse(shared.getItem(K)).acct.gold;
  A.X(`svlOnStorage({key:'${K}'})`);
  const re = A.X(`({follow:G.char===curChar()&&G.opts.char===G.char, orphan:SAVE.chars.indexOf(stale)<0})`);
  ok('สองแท็บ: โหลดใหม่ตอนอยู่หน้าจบรอบ → G.char / G.opts.char ตามตัวละครใน SAVE ใหม่', r1 && re.follow && re.orphan, re);
  const r2 = A.X(`(()=>{ const g=${run('r_o2', 76, 'stale')}; const p=makePlayer(CLS.swordsman); recalc(p); p.hp=p.maxHp; prepareRun(g,p,stale,'survival');
    const live=g.char===curChar()&&g.opts.char===g.char; const r=onRunEnd(g,false,{commit:true}); return {live, c:r.committed, gold:r.gold}; })()`);
  const m = JSON.parse(shared.getItem(K));
  ok('สองแท็บ: เริ่มรอบใหม่ด้วยตัวละครเก่า (G.opts.char) → prepareRun หาตัวจริงตาม id · รางวัลลงเซฟ (kills 64+76 · runId · ทองของอีกแท็บ + รางวัล)',
    r2.live && r2.c && m.chars[0].kills === 140 && m.acct.runIds.includes('r_o2') && m.acct.gold === g1 + r2.gold, { r2, kills: m.chars[0].kills, ids: m.acct.runIds, gold: m.acct.gold, g1 });
}
{
  // the running tab's own debounced write (setActiveChar 800 ms) fires mid-run after another tab saved → reload mid-run
  const shared = memStorage(), K = 'runeguard.save.guest';
  const A = fresh({ localStorage: shared }), B = fresh({ localStorage: shared });
  A.X(`loadSaveFor(null); createChar('หนึ่ง','mage'); createChar('สอง','thief')`);
  B.X(`loadSaveFor(null)`);
  A.X(`(()=>{ setActiveChar(SAVE.chars[0].id); const ch=curChar(); G={char:ch, opts:{char:ch}, over:false, modeId:'survival', tier:0, wave:6, kills:50, t:45, runId:'r_d1', loot:[], goldRun:0, player:{hp:0}}; })()`);
  B.X(`DEV.profile.gold(700)`); A.X(`svlOnStorage({key:'${K}'})`);           // mid-run: the event waits
  await new Promise(res => setTimeout(res, 900));                           // A's debounce fires → refused → reload mid-run
  const mid = A.X(`({gold:SAVE.acct.gold, held:SAVE.chars.indexOf(G.char)>=0})`);
  const rr = A.X(`(()=>{ const r=onRunEnd(G,false,{commit:true}); return {c:r.committed, gold:r.gold}; })()`);
  const m = JSON.parse(shared.getItem(K)), one = m.chars.find(c => c.name === 'หนึ่ง');
  ok('สองแท็บ: เซฟหน่วงเวลาของแท็บตัวเองโหลดใหม่กลางรอบ → รอบตามตัวละครใหม่ · รางวัลลงเซฟ',
    mid.gold === 700 && mid.held && rr.c && m.acct.runIds.includes('r_d1') && one.kills === 50 && m.acct.gold === 700 + rr.gold, { mid, rr, kills: one.kills, ids: m.acct.runIds });
  // another tab deletes the running character → nothing is paid, nothing written
  A.X(`(()=>{ const ch=SAVE.chars.find(c=>c.name==='สอง'); G={char:ch, opts:{char:ch}, over:false, modeId:'survival', tier:0, wave:9, kills:80, t:90, runId:'r_del', loot:[], goldRun:0, player:{hp:0}}; })()`);
  B.X(`(()=>{ loadSaveFor(null); deleteChar(SAVE.chars.find(c=>c.name==='สอง').id); })()`);
  const before = shared.getItem(K);
  const del = A.X(`(()=>{ const r=onRunEnd(G,false,{commit:true}); return r.committed; })()`);
  ok('สองแท็บ: อีกแท็บลบตัวละครที่กำลังเล่น → ไม่จ่ายรางวัล · ไม่เขียนเซฟ', del === false && shared.getItem(K) === before && !JSON.parse(before).acct.runIds.includes('r_del'));
}
{
  const { X } = fresh();
  const n = X(`(()=>{ loadSaveFor(null); const ch=createChar('ติดลบ','archer'); ch.play=10; ch.kills=3;
    const a=grantRewards(ch,{runId:'r_neg_1', mode:'survival', tier:0, st:{t:-100, kills:-5, wave:-3}}); const b=grantRewards(ch,{runId:'r_neg_2', st:{t:Infinity, kills:2}});
    return {a, b, play:ch.play, kills:ch.kills, rec:SAVE.acct.records.survival[ch.id][0], sp:SAVE.play}; })()`);
  ok('grantRewards: เวลา / kills / คลื่นติดลบหรือ Infinity ไม่ลดค่าสะสม', n.a && n.b && n.play === 10 && n.kills === 5 && n.rec.kills === 0 && n.rec.wave === 0 && Number.isFinite(n.sp), n);
}

console.log(`\nผล: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
