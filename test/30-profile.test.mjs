// test/30-profile.test.mjs (lane C) — balance, job data, save schema, local save, progression (DESIGN §9.3 criteria C)
//   node test/30-profile.test.mjs
// Runs the real src/js files in node:vm (test/_vm.mjs) with an in-memory localStorage. No dependencies.
import { loadSrc, memStorage } from './_vm.mjs';

const FILES = ['04', '05', '06', '07', '08', '15', '16', '24', '25', '26', '26a', '27', '28', '29', '30', '31', '33', '34', '40', '41', '42', '69'];
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
const SKILL_TOTAL = 64;   // 40 + the character-only skills shipped so far (docs/PROPOSAL-skill-trees.md §3 → 70)

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
      const skip=new Set(['bonus','rank','loadout','advOffered','sx','permSt','tree','sl','rangeMul','mxDodge','mxDrop']), diff=[];   // sx/permSt/tree: character-run flags of 26/27 · skill.cx = character numbers flag
      const J=(k,v)=>k==='skills'?JSON.stringify(v.map(s=>Object.assign({},s,{cx:undefined}))):JSON.stringify(v);
      for(const k of new Set(Object.keys(A).concat(Object.keys(B)))) if(!skip.has(k)&&J(k,A[k])!==J(k,B[k])) diff.push(k);
      return {m:JSON.stringify(m), b:JSON.stringify(b), diff, n:Object.keys(A).length, bonus:B.bonus, adv:B.adv, offered:B.advOffered}; })()`);
    ok(`${c}: metaBonus(ตัวใหม่) = {} · buildRunBonus(ตัวใหม่ ไม่มีของ) = {}`, r.m === '{}' && r.b === '{}', r);
    ok(`${c}: recalc หลัง prepareRun เท่าคลาสสิกทุก field (${r.n} field ยกเว้น bonus/rank/loadout/advOffered)`, r.diff.length === 0 && r.adv === null && r.offered === true, r.diff);
  }
  const adv = X(`(()=>{ const out=[]; for(const c of CLASSES) for(const a of c.adv){ const ch=newChar('ทดสอบ',c.id); ch.inv=[]; ch.eq=svEmptyEq(); ch.job=a.id;
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
    const t=newChar('ทดสอบ','thief'); t.inv=[]; t.eq=svEmptyEq(); t.job='nightblade'; t.pas={p_thinsmoke:2, p_catstep:1}; return {a,b,t:buildRunBonus(t)}; })()`);
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
    out.adv7=setLoadout(ch,['holy','heal','sacred','cross','judgment','aegis','holy']);
    out.foreign=setLoadout(ch,['slash']); return out; })()`);
  ok('loadout: สกิลที่เรียน ★1 ใหม่เข้าช่องว่างเอง · ช่องแรกยังเป็นสกิลแรก', deq(lo.auto, ['holy', 'heal', 'sacred', 'cross']), lo);
  ok('setLoadout ปฏิเสธ: ซ้ำ / ★0 / ว่าง / สกิลของอาชีพอื่น · รับได้: ลำดับใหม่', !lo.dup && !lo.zero && !lo.empty && !lo.five && lo.okk && deq(lo.after, ['cross', 'holy']) && !lo.foreign, lo);
  ok('setLoadout ขั้นสูง 6 ช่องได้ (เดิม 5) · 7 ช่องไม่ได้', lo.adv5 && lo.adv6 && !lo.adv7 && lo.final.length === 6, lo);
  const rsk = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','thief'); SAVE.chars.push(ch); ch.sp=20; learnSkill(ch,'dagger'); learnSkill(ch,'fan'); learnSkill(ch,'p_catstep');
    const sp0=ch.sp, spent=pgSpSpent(ch); const a=resetSkills(ch,{}); return {a, sp:ch.sp, sum:sp0+spent, sk:ch.sk, pas:ch.pas, load:ch.load}; })()`);
  ok('resetSkills: แต้มคืนครบ · ★1 ฟรีของสกิลแรกยังอยู่ · loadout ตัดสกิลที่เป็น ★0', rsk.a && rsk.sp === rsk.sum && rsk.sp === 20 && deq(rsk.sk, { dagger: 1 }) && deq(rsk.pas, {}) && deq(rsk.load, ['dagger']), rsk);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.5 แต้มสกิลรวม 49 (เริ่ม 6 + ขั้นต้น 19 + ขั้นสูง 24) · ใช้ได้รวม 56 (จากข้อมูลจริง)');
{
  const { X } = fresh();
  const earn = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','archer'); SAVE.chars.push(ch); SAVE.acct.gold=500; const sp=[];
    while(ch.jlv<20) grantExp(ch,0,BAL.jxpNeed(ch.jlv,1)-ch.jxp); sp.push(ch.sp); grantExp(ch,0,1e9); sp.push(ch.sp,ch.jlv);
    ch.lv=20; ch.trial.t2=1; advanceJob(ch,'ranger'); while(ch.jlv<25) grantExp(ch,0,BAL.jxpNeed(ch.jlv,2)-ch.jxp); sp.push(ch.sp); grantExp(ch,0,1e9); sp.push(ch.sp,ch.jlv); return sp; })()`);
  ok('แต้มที่ได้: ตัวใหม่เริ่ม 6 (BAL.START_SP) · Job ขั้นต้น 2–20 = 19 · ขั้นสูง 2–25 = 24 · รวม 49 (EXP เกินเพดานไม่ให้แต้มเพิ่ม)', deq(earn, [25, 25, 20, 49, 49, 25]), earn);
  ok('แต้มเริ่มต้น 6 = ★1 ฟรี → ★5 ของสกิลแรกพอดี · spAt(1,1) = 6 · spAt(1,20) = 25 = spAt(2,1) · spAt(2,25) = 49',
    X(`BAL.START_SP===6&&BAL.rankSpent(5)-BAL.RANK_COST[1]===BAL.START_SP&&BAL.spAt(1,1)===6&&BAL.spAt(1,20)===25&&BAL.spAt(2,1)===25&&BAL.spAt(2,25)===49`));
  const spend = X(`(()=>{ const out=[]; for(const c of CLASSES) for(const a of c.adv){
      const ch=newChar('ทดสอบ',c.id); ch.sp=999; let t1=0, t2=0, n=0;
      const learnAll=()=>{ let any=true, s=0; while(any){ any=false; for(const id of pgSkillPool(ch).concat(pgPasPool(ch))){ const b=ch.sp; if(learnSkill(ch,id)){ s+=b-ch.sp; any=true; } } } return s; };
      t1=learnAll(); ch.job=a.id; t2=learnAll();
      const data1=c.skills.length*BAL.rankSpent(5)-BAL.RANK_COST[1]+pgPasPool({cls:c.id,job:null}).length*5*BAL.PAS_COST;
      const data2=a.skills.length*BAL.rankSpent(5)+Object.values(PASSIVES).filter(p=>p.own===a.id).length*5*BAL.PAS_COST;
      out.push({a:a.id,t1,t2,data1,data2,all:pgSpSpent(ch)}); } return out; })()`);
  ok('ใช้ได้: ขั้นต้น 32 (สกิล 4 ตัว ★5 − ★1 ฟรี + passive ★5) · ขั้นสูง 24 (สกิล 2 ตัว + passive 2 ตัว) + ★6–8 ของสกิลขั้นต้น 4 × 7 · รวม 84 ทั้ง 10 สาย',
    spend.length === 10 && spend.every(s => s.t1 === 32 && s.t2 === 24 + 4 * 7 && s.data1 === 32 && s.data2 === 24 && s.all === 56 + 28), spend);
  ok('ขาด 7 แต้มเมื่อตัน (56 − 49) · ตอนจบขั้นต้นขาด 7 (32 − 25)', 56 - earn[3] === 7 && 32 - earn[0] === 7);
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
  const js = X(`(()=>{ const ch=newChar('ทดสอบ','mage'); ch.job='elementalist'; return [pgTier(ch), pgJobCap(ch), pgSkillPool(ch).join(), BAL.LOADOUT[pgTier(ch)], BAL.LOADOUT[1]]; })()`);
  ok('หลังเลื่อน: เพดาน Job 25 · ปลดสกิลขั้นสูง · loadout 6 ช่อง (ขั้นต้น 5)', js[0] === 2 && js[1] === 25 && js[2].startsWith('mbolt,flame,frost,thunder,') && js[2].includes('vortex,spikes') && js[3] === 6 && js[4] === 5, js);
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
    out.look=p.look.weapon; const nog=JSON.parse(JSON.stringify(ch)); nog.inv=[]; nog.eq=svEmptyEq(); const q=makePlayer(CLS.archer); recalc(q); prepareRun({},q,nog,'survival'); out.look0=q.look.weapon; out.field=mk('field').p.skills.map(s=>s.id+':'+s.lv).join(' ');
    out.trial=mk('trial').p.skills.map(s=>s.id+':'+s.lv+(s.evolved?'E':'')).join(' ');
    ch.st.DEX=25; out.boss=mk('boss').p.skills.map(s=>s.id+':'+s.lv+(s.evolved?'E':'')).join(' ');
    ch.st.DEX=24; out.boss24=mk('boss').p.skills.map(s=>s.id+':'+s.lv+(s.evolved?'E':'')).join(' ');
    ch.play=12; out.tip2=mk('survival').g.charTip; return out; })()`);
  ok('P.adv = อาชีพสูงสุด (object เดียวกับ CLS) · P.advOffered = true · P.lv = 1', pr.adv && pr.offered === true && pr.lv === 1, pr);
  ok('P.rank = ★ ที่ฝึก (เฉพาะ ★ ≥ 1) · P.loadout = load', deq(pr.rank, { arrow: 5, spread: 2, trap: 1, deadeye: 3, blast: 1 }) && deq(pr.load, ['deadeye', 'arrow', 'trap', 'blast', 'spread']), pr);
  ok('P.bonus = buildRunBonus(ch) และเข้า recalc (might > 1) · P.look: ไม่มีของ = ธนูยาวของอาชีพ · สวมธนูฝึกหัด = ธนู (gearLook ทับ)', pr.bonus && pr.might > 1 && pr.look0 === 'longbow' && pr.look === 'bow', pr);
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
  ok('migrateSave: {} (ไม่มี v) + best แบบ string ก็นำเข้า · ไม่มี best → pioneer = false · ไม่ใช่ object → เซฟใหม่ v3',
    m.bv === 7 && m.bc.mage.score === 99999 && m.bp === true && m.c.pioneer === false && m.c.migratedBest === false && m.d === true && m.e === 7 && deq(m.ev, []), m);
  const ro = X(`(()=>{ const o={v:8, sid:'s_abc', chars:[{id:'c_x', name:'ใหม่กว่า', cls:'mage', lv:70, future:1}], acct:{gold:5}, extra:{a:1}};
    const s=migrateSave(o,null); return {v:s.v, ro:s.ro, enumerable:Object.keys(s).includes('ro'), json:JSON.stringify(s).includes('"ro"'), lv:s.chars[0].lv, src:o.chars[0].lv}; })()`);
  ok('migrateSave(v > SCHEMA_V) → อ่านอย่างเดียว (s.ro, ไม่ติดไปกับ JSON) · ข้อมูลต้นฉบับไม่ถูกแก้', ro.v === 8 && ro.ro === true && !ro.enumerable && !ro.json && ro.lv === 60 && ro.src === 70, ro);
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
       inv:[{u:'i_b1',id:'b_unk_x',r:15,f:99,s:['x_rune','BAD',1,2],lk:'y'},{id:'m_dust',n:-4},{id:'<x>',n:1},{u:'i_b1',id:'w_dup',r:1}, 'str', null,
            {id:'u_unk_x',n:5000},{u:'i_c1',id:'c_unk_x'},{u:'i_c2',id:'c_unk_x'},{u:'i_c3',id:'c_unk_x'},{u:'i_c4',id:'c_unk_x'}],
       quick:['u_potion_s','<b>',3], trial:{t2:5}, zone:'Z!', visited:['z1','z1','z2'], bestiary:{beetle:-1, Bad:3}, resets:{free:0}},
      {id:'c_aaa', name:'a', cls:'thief'},
      {id:'c_bbb', name:'ผู้กล้า', cls:'necromancer'},
      {id:'c_ccc', name:'สาม', cls:'cleric'},
      {id:'c_ddd', name:'สี่', cls:'archer'},
    ], active:'c_zzz'};
    const s=validateSave(evil), c=s.chars[0];
    return {s, c, ids:s.chars.map(x=>x.id), names:s.chars.map(x=>x.name), polluted:({}).polluted, again:JSON.stringify(validateSave(JSON.parse(JSON.stringify(s))))===JSON.stringify(s)}; })()`);
  const s = v.s, c = v.c;
  ok('เซฟ: sid/owner/เวลา/app ผิดรูป → ค่าที่ปลอดภัย · owner ที่เป็นอีเมล → null', /^s_[a-z0-9]+$/.test(s.sid) && s.owner === null && s.created === 0 && s.play === 0 && s.app === '2.5.0', s);
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
  ok('แต้มสถานะ ≤ แต้มที่ได้ − ที่ใช้แล้ว (ใช้เกิน → 0) · แต้มสกิล ≤ (6 + 19) − ที่ใช้แล้ว 13 = 12',
    c.pts === Math.max(0, 186 - (98 + 98 + 12 + 2)) && c.sp === 6 + 19 - (7 - 1 + 2 + 5), [c.pts, c.sp]);
  ok('sk / pas: ★ 0–5 · เฉพาะสกิลของอาชีพ (สกิลขั้นสูงต้องมี job) · passive ของอาชีพอื่นถูกตัด · ★1 ฟรีของสกิลแรกคงอยู่',
    deq(c.sk, { mbolt: 5, flame: 2 }) && deq(c.pas, { p_runefocus: 5 }), [c.sk, c.pas]);
  ok('load: ไม่ซ้ำ · ★ ≥ 1 เท่านั้น · ไม่เกินช่อง', deq(c.load, ['flame']), c.load);
  ok('inv: r 0–10 · f 0–5 · ช่องรูนไม่เกิน 2 · uid ซ้ำได้ uid ใหม่ · ของซ้อน n 1–999 · id ผิดรูปถูกตัด · id ที่ไม่รู้จักเก็บไว้แบบ unk:1 · ไม่เกิน bagMax (80)',
    c.inv[0].r === 10 && c.inv[0].f === 5 && deq(c.inv[0].s, ['x_rune', null]) && c.inv[0].lk === 1 && c.inv[0].unk === 1 && c.inv[1].n === 1 && c.inv[2].id === 'w_dup' && c.inv[2].u !== 'i_b1'
    && c.inv.find(x => x.id === 'u_unk_x').n === 999 && !c.inv.some(x => x.id === '<x>') && c.bagMax === 80 && c.inv.length === 8, c.inv);
  ok('eq: uid ที่ไม่มีใน inv → null · uid เดียวสวมสองช่องไม่ได้ (ช่องแรกตามลำดับได้ไป เมื่อไม่รู้จักไอเทม) · ช่องแปลกถูกตัด', c.eq.weapon === null && c.eq.head === 'i_b1' && c.eq.body === null && !('hat' in c.eq) && Object.keys(c.eq).length === 10, c.eq);
  ok('quick / trial / zone / visited / bestiary / resets ถูก clamp', deq(c.quick, ['u_potion_s', null]) && c.trial.t2 === 0 && c.zone === 'z1' && deq(c.visited, ['z1', 'z2']) && deq(c.bestiary, { beetle: 0 }) && c.resets.free === 0 && c.resets.skFree === 1, c);
  ok('validateSave ซ้ำได้ผลเดิม (idempotent)', v.again === true);
  const trim = X(`(()=>{ const ch=newChar('ทดสอบ','mage'); ch.bagMax=80; ch.inv=[]; for(let i=0;i<90;i++) ch.inv.push({u:'i_'+i, id:'w_x'}); ch.eq.weapon='i_85';
    const c=validateSave({v:1, chars:[ch]}).chars[0]; return [c.inv.length, c.eq.weapon, c.inv.some(x=>x.u==='i_85')]; })()`);
  ok('inv เกิน bagMax: ตัดส่วนเกิน (เหลือ 80 ช่อง + ของที่สวม 1) · ของที่สวมอยู่ไม่หาย', deq(trim, [81, 'i_85', true]), trim);
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
    fb.n === 1 && fb.st === 'bak' && notes.some(n => n[0] === 'เซฟในเครื่องเสีย ใช้สำรองแทน') && ls.getItem('runeguard.save.guest.bak') === goodBak && JSON.parse(ls.getItem('runeguard.save.guest')).v === 7, fb);
  ls.setItem('runeguard.save.guest', 'garbage'); ls.setItem('runeguard.save.guest.bak', '[1,2]');
  const nw = X(`(()=>{ const s=loadSaveFor(null); return {n:s.chars.length, st:svlState().from, rec:s.acct.records.classic.swordsman.score}; })()`);
  ok('เสียทั้งคู่ → เซฟใหม่ (ยังนำเข้าสถิติคลาสสิก) + toast', nw.n === 0 && nw.st === 'lost' && nw.rec === 9000 && notes.some(n => /เซฟในเครื่องเสีย/.test(n[0])), nw);
  // user key
  X(`loadSaveFor('0b1c-uid'); createChar('ออนไลน์','thief');`);
  ok('เซฟของบัญชีอยู่ที่ runeguard.save.u.<uid> · owner = uid', JSON.parse(ls.getItem('runeguard.save.u.0b1c-uid')).owner === '0b1c-uid' && X(`SAVE.owner`) === '0b1c-uid');
}
{
  const { X, ls, dump, notes } = fresh();
  const future = JSON.stringify({ v: 8, sid: 's_future', owner: null, acct: { gold: 77 }, chars: [{ id: 'c_f1', name: 'อนาคต', cls: 'mage', lv: 5 }], active: 'c_f1', newField: { x: 1 } });
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
  ok('ตัวใหม่ (§3.8): Lv1 · แต้มสถานะ 5 · แต้มสกิล 6 · สกิลแรก ★1 · load = [skills[0]] · trial.t2 = 0 · ตัวที่สร้างล่าสุดเป็นตัวที่เลือก',
    c.new.lv === 1 && c.new.pts === 5 && deq(c.new.sk, { mbolt: 1 }) && deq(c.new.load, ['mbolt']) && c.new.trial.t2 === 0 && c.new.jlv === 1 && c.new.sp === 6 && c.new.job === null && c.active, c.new);
  ok('setActiveChar / curChar / deleteChar (ลบตัวที่เลือก → เลือกตัวแรกแทน · ลบซ้ำไม่ได้)', c.set && c.cur && c.setBad === false && c.del && c.after && c.del2 === false, c);
  ok('saveSummary · isTrivialSave', c.sum.chars.length === 2 && c.sum.chars[0].lv === 1 && c.sum.appVer === '2.5.0' && c.trivial === true && c.trivial2 === false, c.sum);
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
  // m2-orch: an import starts its own lineage (wb new) and counts one write past this tab's wc · mt = wall clock
  const exB = JSON.parse(ex.same), exA = JSON.parse(ex.after), wcB = exB.wc, wcA = exA.wc, wbNew = exA.wb !== exB.wb && /^w_/.test(exA.wb); const wpOk = Array.isArray(exA.wp) && exA.wp[0] && exA.wp[0].wb === exB.wb; for (const o of [exB, exA]) { delete o.mt; delete o.wc; delete o.wb; delete o.wp; }
  ok('export → import ได้ค่าเท่าเดิมทุก field (ยกเว้น wc ที่นับเพิ่ม · wb สายใหม่ · mt = เวลาที่นำเข้า)', ex.r.ok === true && deq(exB, exA) && wcA > wcB && wbNew && wpOk, { r: ex.r, wcA, wcB, wbNew, wpOk });
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
  // m2-orch: an import starts a new lineage and stamps wc/mt, so those are compared on their own (mt was flaky when run-end and import fell in one ms)
  const rtB = JSON.parse(rt.eq), rtA = JSON.parse(rt.after), rtWc = [rtB.wc, rtA.wc], rtWb = rtA.wb !== rtB.wb && rtA.wp[0].wb === rtB.wb; for (const o of [rtB, rtA]) { delete o.mt; delete o.wc; delete o.wb; delete o.wp; }
  ok('export → import หลังเล่นจริง (แจกแต้ม · เรียนสกิล · loadout · รางวัลจบรอบ) ได้ค่าเท่าเดิมทุก field (wc ใหม่ > เดิม · wb สายใหม่)', rt.r.ok && deq(rtB, rtA) && rtWc[1] > rtWc[0] && rtWb, { r: rt.r, wc: rtWc, rtWb });
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
    d.a.lv === 20 && d.a.jlv === 20 && deq(d.a.load, ['slash', 'slam', 'blades', 'bulwark']) && d.a.pts === 44 && d.a.sp === 6 + 19 - (7 - 1) - 3 - 3 - 1, d.a);
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
  const future = JSON.stringify({ v: 8, sid: 's_future', acct: { gold: 77, gems: 5 }, chars: [{ id: 'c_f1', name: 'อนาคต', cls: 'mage', lv: 5, pet: 'cat', st: { WIS: 3 } }], active: 'c_f1' });
  ls.setItem('runeguard.save.guest', future);
  ok('export ของเซฟอ่านอย่างเดียว = ข้อความที่เก็บไว้เดิม (ไม่ตัด field ของเวอร์ชันใหม่)', X(`(loadSaveFor(null), exportSave())`) === future);
  ok('migrateSave: v ไม่ใช่จำนวนเต็ม (1.5) = ขยะ ไม่ใช่เวอร์ชันใหม่', X(`(()=>{ const s=migrateSave({v:1.5, acct:{gold:5}, chars:[]}); return !s.ro&&s.v===7; })()`));
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
  // the running tab's own debounced write (saveLocal 800 ms: a tip dismissal, a field EXP tick) fires mid-run after another tab saved
  // → reload mid-run (player actions such as setActiveChar save at once since fix-r2, so the debounce is started directly here)
  const shared = memStorage(), K = 'runeguard.save.guest';
  const A = fresh({ localStorage: shared }), B = fresh({ localStorage: shared });
  A.X(`loadSaveFor(null); createChar('หนึ่ง','mage'); createChar('สอง','thief')`);
  B.X(`loadSaveFor(null)`);
  A.X(`(()=>{ setActiveChar(SAVE.chars[0].id); const ch=curChar(); G={char:ch, opts:{char:ch}, over:false, modeId:'survival', tier:0, wave:6, kills:50, t:45, runId:'r_d1', loot:[], goldRun:0, player:{hp:0}}; saveLocal('t'); })()`);
  B.X(`svlOnStorage({key:'${K}'}); DEV.profile.gold(700)`); A.X(`svlOnStorage({key:'${K}'})`);   // B follows A's pick · A mid-run: the event waits
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

// ================================================================================================
// M2 (§9.4 C) · hell tiers · survival drops · rewards with items · starter kit · pioneer cloak · item validation
// ================================================================================================
console.log('M2 · §2.2 ระดับนรก T0–T10 (ตารางในเอกสาร) · ตารางดรอปเอาชีวิตรอด');
{
  const { X } = fresh();
  //            T  recLv HP×  ดาเมจ× defK ทอง/คลื่น tier
  const TBL = [[0, 1, 1.0, 1.00, 22, 15, 1], [1, 6, 1.3, 1.12, 25, 20, 1], [2, 12, 1.6, 1.24, 28, 25, 2], [3, 18, 1.9, 1.36, 31, 30, 2],
    [4, 24, 2.2, 1.48, 34, 35, 3], [5, 30, 2.5, 1.60, 37, 40, 3], [6, 36, 2.8, 1.72, 40, 45, 4], [7, 42, 3.1, 1.84, 43, 50, 4],
    [8, 48, 3.4, 1.96, 46, 55, 5], [9, 54, 3.7, 2.08, 49, 60, 5], [10, 60, 4.0, 2.20, 52, 65, 5]];
  const got = X(`[0,1,2,3,4,5,6,7,8,9,10].map(T=>{ const S=BAL.SURV; return [T,S.recLv(T),S.hpMul(T),S.dmgMul(T),S.defK(T),S.goldPerWave(T),S.gearTier(T)]; })`);
  for (const row of TBL) ok(`T${row[0]}: เลเวลแนะนำ ${row[1]} · HP× ${row[2].toFixed(1)} · ดาเมจ× ${row[3].toFixed(2)} · defK ${row[4]} · ทอง/คลื่น ${row[5]} · tier ของ ${row[6]} (=== ตรงตาราง)`,
    row.every((v, i) => got[row[0]][i] === v), got[row[0]]);
  const f = X(`(()=>{ const S=BAL.SURV, bad=[]; for(let T=0;T<=10;T++){
      if(S.recLv(T)!==Math.max(1,6*T)) bad.push('rec'+T); if(S.goldPerWave(T)!==15+5*T) bad.push('gold'+T); if(S.gearTier(T)!==Math.min(5,1+Math.floor(T/2))) bad.push('gear'+T);
      if(Math.abs(S.hpMul(T)-(1+.3*T))>1e-12) bad.push('hp'+T); if(Math.abs(S.dmgMul(T)-(1+.12*T))>1e-12) bad.push('dmg'+T); if(S.defK(T)!==22+3*T) bad.push('k'+T); }
    return {bad, clamp:[S.tier(-1),S.tier(11),S.tier('3'),S.tier(NaN),S.tier(2.7),S.tier(undefined),S.hpMul(99),S.defK(-4)]}; })()`);
  ok('สูตร §2.2: recLv = max(1, 6T) · goldPerWave = 15 + 5T · gearTier = min(5, 1 + floor(T/2)) · HP× 1 + 0.3T · ดาเมจ× 1 + 0.12T · defK 22 + 3T', f.bad.length === 0, f.bad);
  ok('T นอกช่วงถูก clamp เป็นจำนวนเต็ม 0–10 (−1 → 0 · 11 → 10 · "3" → 3 · NaN → 0 · 2.7 → 2)', deq(f.clamp, [0, 10, 3, 0, 2, 0, 4, 22]), f.clamp);
  const c3 = X(`(()=>{ G={tier:3}; const a=MODES.survival.cfgFor(7), b=waveCfg(7); G=null; return [a.hpMul/b.hpMul, a.dmgMul/b.dmgMul]; })()`);
  ok('cfgFor(w) ที่ T3: HP ศัตรู ×1.9 · ดาเมจ ×1.36', Math.abs(c3[0] - 1.9) < 1e-12 && Math.abs(c3[1] - 1.36) < 1e-12, c3);
  const d = X(`(()=>{ const out={}; out.names=BAL.DROP.surv; out.res={}; for(const k in BAL.DROP.surv) out.res[k]=itTable(BAL.DROP.surv[k])===DROPS.surv[k];
    itDropRng=mulberry(99); const mr=Math.random; let calls=0; Math.random=()=>{ calls++; return mr(); };
    const kill=(T,w,e)=>{ G={tier:T, wave:w, loot:[]}; P={drop:0}; MODES.survival.onKill(e); return G.loot; };
    out.plain=kill(3,4,{}).length;
    out.b5=kill(3,5,{boss:true}).filter(x=>x.u).map(x=>ITEMS[x.id].tier);
    out.b10=kill(3,10,{boss:true}).map(x=>x.u?'gear'+ITEMS[x.id].tier:x.id+'×'+x.n);
    out.b20=kill(10,20,{boss:true}).filter(x=>x.u).map(x=>ITEMS[x.id].tier);
    const el=[]; for(let i=0;i<400;i++) el.push(...kill(6,8,{elite:true}));
    out.dust=el.filter(x=>x.id==='m_dust').every(x=>x.n>=1&&x.n<=2); out.eGear=[...new Set(el.filter(x=>x.u).map(x=>ITEMS[x.id].tier))];
    out.shard=el.some(x=>/^m_shard_/.test(x.id)); out.calls=calls; Math.random=mr; itDropRng=null; G=null; P=null; return out; })()`);
  ok('BAL.DROP.surv ชี้ตารางของ lane E ครบ 5 ตัว (elite · บอสคลื่น 5/10/15/20)', deq(Object.keys(d.names).sort(), ['boss10', 'boss15', 'boss20', 'boss5', 'elite']) && Object.values(d.res).every(Boolean), d);
  ok('onKill: มอนธรรมดาไม่ดรอป · บอสคลื่น 5 ที่ T3 = อุปกรณ์ tier 2 · คลื่น 10 = อุปกรณ์ + ผลึกรูน ×1 · คลื่น 20 ที่ T10 = tier+1 (ตันที่ 4 ใน M2)',
    d.plain === 0 && deq(d.b5, [2]) && d.b10.includes('gear2') && d.b10.includes('m_crystal×1') && deq(d.b20, [4]), d);
  ok('elite (T6, 400 ตัว): ผงรูน 1–2 ทุกตัว · มีเศษรูน · อุปกรณ์ tier 4 เท่านั้น · Math.random ไม่ถูกเรียกเลย', d.dust && d.shard && deq(d.eGear, [4]) && d.calls === 0, d);
}

console.log('M2 · §3.8 ชุดเริ่มต้น (อาวุธฝึกหัดสวมอยู่ + ยาเล็ก ×3) · prepareRun ใช้ gearBonus / gearLook');
{
  const { X } = fresh();
  const k = X(`(()=>{ const mr=Math.random; let calls=0; Math.random=()=>{ calls++; return mr(); }; const out={};
    for(const c of ['swordsman','mage','archer','cleric','thief']){ const ch=newChar('ชุดเริ่ม',c), w=ch.inv[0], d=ITEMS[w.id];
      const p=makePlayer(CLS[c]); recalc(p); p.hp=p.maxHp; prepareRun({},p,ch,'survival');
      out[c]={n:ch.inv.length, id:w.id, tier:d.tier, cls:d.cls, worn:ch.eq.weapon===w.u, clean:w.r===0&&w.f===0&&w.s.length===0&&w.lk===0&&/^i_[a-z0-9]{8}$/.test(w.u),
        pot:JSON.stringify(ch.inv[1]), quick:ch.quick[0], can:canEquip(ch,w), used:itBagUsed(ch), gear:JSON.stringify(gearBonus(ch)), st:JSON.stringify(d.st),
        bonus:JSON.stringify(p.bonus), might:p.might, look:p.look.weapon, clsLook:CLS[c].look.weapon, dye:JSON.stringify(ch.dye),
        ch:JSON.parse(JSON.stringify(ch)), v:validateSave({v:1,chars:[ch]}).chars[0]}; }
    Math.random=mr; out.calls=calls; return out; })()`);
  for (const c of CLASSES) {
    const r = k[c];
    ok(`${c}: อาวุธฝึกหัดของอาชีพ (${r.id} · tier 1 · ${r.cls}) สวมอยู่ · ยาฟื้นพลังเล็ก ×3 ในช่องด่วน 1 · กระเป๋าใช้ 1/80 (ของที่สวมไม่นับ)`,
      r.n === 2 && r.tier === 1 && deq(r.cls, [c]) && r.worn && r.clean && r.pot === '{"id":"u_potion_s","n":3}' && r.quick === 'u_potion_s' && r.can === '' && r.used === 1 && r.dye === '{}', r);
    ok(`${c}: P.bonus = gearBonus = ค่าของอาวุธ (${r.st}) · might ${r.might} · P.look.weapon = ${r.look} · validateSave ไม่เปลี่ยนอะไร`,
      r.bonus === r.gear && r.gear === r.st && Math.abs(r.might - 1.05) < 1e-9 && r.look === r.clsLook && deq(r.v, r.ch), r);
  }
  ok('สร้างตัวละคร 5 อาชีพไม่เรียก Math.random (uid ใช้ crypto)', k.calls === 0, k.calls);
  const g = X(`(()=>{ const ch=newChar('อุปกรณ์','swordsman'); ch.lv=40; ch.pas={p_heavyarms:2};
    const w=makeInst('w_sword_3',{sockets:1}); w.r=7; w.s=['rn_spitter']; ch.inv.push(w); ch.eq.weapon=w.u;
    const gl=makeInst('g_archer',{}); ch.inv.push(gl); ch.eq.hands=gl.u;
    const p=makePlayer(CLS.swordsman); recalc(p); p.hp=p.maxHp; prepareRun({},p,ch,'survival');
    const lo=newChar('เลเวลต่ำ','swordsman'); const w2=makeInst('w_sword_3',{sockets:0}); lo.inv.push(w2); lo.eq.weapon=w2.u;
    return {bonus:p.bonus, want:buildRunBonus(ch), might:p.might, cd:p.cdMul, crit:p.crit, base:CLS.swordsman.crit, look:p.look, gb:gearBonus(ch), lo:gearBonus(lo)}; })()`);
  ok('P.bonus = mergeBonus(adv, meta, passive, gear) · cd ของถุงมือนักยิง (×0.97) เข้า P.cdMul · คริจากรูนโครงกระดูกนักธนู +3%',
    deq(g.bonus, g.want) && g.bonus.cd === 0.97 && Math.abs(g.cd - 0.97) < 1e-9 && Math.abs(g.crit - g.base - 0.03) < 1e-9 && Math.abs(g.might - 1 - g.bonus.might) < 1e-9, g);
  ok('P.look ได้อาวุธที่สวม (ดาบเหล็กกล้า สี tier 3) และแสง +7 (glow 1)', g.look.weapon === 'sword' && g.look.wc === '#a9c1dc' && g.look.glow === 1, g.look);
  ok('อาวุธที่เลเวลยังไม่ถึง (Lv1 สวม tier 3) ไม่ให้ค่าใน gearBonus', deq(g.lo, {}), g.lo);
}

console.log('M2 · รางวัลจบรอบ: ของจาก G.loot เข้าเซฟครั้งเดียวต่อ runId · ระดับนรก · ปลดล็อก · กระเป๋าเต็ม');
{
  const { X } = fresh();
  const r = X(`(()=>{ loadSaveFor(null); const ch=createChar('ของรางวัล','mage'); SAVE.acct.survTier=2; const out={};
    const staff=makeInst('w_staff_2',{sockets:1}); const loot=[staff,{id:'m_dust',n:3},{id:'m_crystal',n:1},{id:'m_shard_bat',n:1}], before=JSON.stringify(loot);
    const G0={char:ch, modeId:'survival', tier:2, wave:12, kills:400, t:300, runId:'r_it1', loot, goldRun:0, player:{hp:0}};
    const nc=onRunEnd(Object.assign({},G0,{runId:'r_it0'}),false,{commit:false}); out.nc={inv:ch.inv.length, items:nc.items.length};
    const r1=onRunEnd(G0,false,{commit:true});
    out.r1={base:r1.baseXp, want:Math.round(BAL.bxpNeed(12)*BAL.SURV.expMul(11,false))*2, gold:r1.gold, daily:r1.daily, unlocks:r1.unlocks, tier:r1.tier, lost:r1.lost.length, st:r1.stashed.length};
    const inv=()=>ch.inv.map(x=>x.u?x.id+':'+x.u:x.id+'×'+x.n).join(' ');
    out.inv1=inv(); out.copy=ch.inv.some(x=>x===staff); out.lootSame=JSON.stringify(loot)===before; out.staffIn=ch.inv.some(x=>x.u===staff.u);
    out.again=grantRewards(ch,r1); out.again2=grantRewards(ch,Object.assign({},r1,{items:loot.slice()})); out.inv2=inv();
    out.survTier=SAVE.acct.survTier; out.rec=SAVE.acct.records.survival[ch.id]; out.daily=SAVE.acct.daily.surv;
    const r2=onRunEnd(Object.assign({},G0,{runId:'r_it2', loot:[], wave:10}),false,{commit:true}); out.r2={daily:r2.daily, unlocks:r2.unlocks, gold:r2.gold};
    const r3=onRunEnd(Object.assign({},G0,{runId:'r_it3', loot:[], tier:1, wave:10}),false,{commit:true}); out.r3={daily:r3.daily, unlocks:r3.unlocks, gold:r3.gold};
    const r4=onRunEnd(Object.assign({},G0,{runId:'r_it4', loot:[], tier:7, wave:15}),false,{commit:true}); out.r4={unlocks:r4.unlocks, gold:r4.gold, base:r4.baseXp};
    const r5=onRunEnd(Object.assign({},G0,{runId:'r_it5', loot:[], tier:3, wave:9}),false,{commit:true}); out.r5={unlocks:r5.unlocks};
    out.tierEnd=SAVE.acct.survTier;
    const m=JSON.parse(localStorage.getItem('runeguard.save.guest')); out.stored=m.chars[0].inv.some(x=>x.u===staff.u)&&m.acct.runIds.includes('r_it1');
    return out; })()`);
  ok('commit:false: คำนวณของได้ แต่กระเป๋าไม่เปลี่ยน', r.nc.inv === 2 && r.nc.items === 4, r.nc);
  ok('T2 แพ้ที่คลื่น 12 (ผ่าน 11): Base EXP = bxpNeed(12) × 0.44 × 2 (รายวัน) · ทอง = 25 × 11 × 2 = 550 · ปลด T3 (ระดับสูงสุดที่ปลดคือ T2)',
    r.r1.base === r.r1.want && r.r1.gold === 550 && r.r1.daily && deq(r.r1.unlocks.filter(u => /^survTier/.test(u)), ['survTier:3']) && r.r1.tier === 2 && r.survTier === 3, r.r1);
  ok('ของใน G.loot เข้ากระเป๋า: ไม้เท้า (uid เดิม · เป็นสำเนา ไม่ใช่ object ใน G.loot) · ผงรูน ×3 · ผลึก ×1 · เศษรูน ×1 · G.loot ไม่ถูกแก้',
    r.staffIn && !r.copy && r.lootSame && /m_dust×3/.test(r.inv1) && /m_crystal×1/.test(r.inv1) && /m_shard_bat×1/.test(r.inv1) && r.r1.lost === 0 && r.r1.st === 0, r.inv1);
  ok('grantRewards ซ้ำด้วย runId เดิม (object เดิม / สำเนาที่ items ใหม่) ไม่ให้ของซ้ำ', r.again === false && r.again2 === false && r.inv2 === r.inv1, [r.inv1, r.inv2]);
  ok('บันทึกสถิติต่อระดับ (records.survival[ตัวละคร]["2"]) และโบนัสรายวันต่อระดับ', r.rec[2].wave === 12 && r.rec[2].kills === 400 && r.daily[2] === 1, r.rec);
  ok('รอบที่สองของวันใน T2: ไม่มี ×2 · ไม่ปลดซ้ำ · T1 (ต่ำกว่า): ได้ ×2 ของ T1 ครั้งแรกของวัน แต่ไม่ปลดอะไร',
    !r.r2.daily && !r.r2.unlocks.some(u => /^survTier/.test(u)) && r.r2.gold === 25 * 9 && r.r3.daily && !r.r3.unlocks.some(u => /^survTier/.test(u)) && r.r3.gold === 20 * 9 * 2, [r.r2, r.r3]);
  ok('ระดับที่ยังไม่ปลด (T7 ตอนปลดถึง T3) ไม่ข้ามขั้น · ไม่ถึงคลื่น 10 ไม่ปลด · ทอง/EXP ใช้ตัวเลขของ T7',
    !r.r4.unlocks.some(u => /^survTier/.test(u)) && !r.r5.unlocks.some(u => /^survTier/.test(u)) && r.tierEnd === 3 && r.r4.gold === 50 * 14 * 2, [r.r4, r.r5, r.tierEnd]);
  ok('ของและ runId ลงเซฟจริงใน localStorage', r.stored === true);
  const o = X(`(()=>{ const ch=createChar('กระเป๋าเต็ม','thief'); const A=SAVE.acct, out={};
    while(itBagUsed(ch)<ch.bagMax) ch.inv.push(makeInst('h_straw',{}));
    const run=(id,loot)=>onRunEnd({char:ch, modeId:'survival', tier:0, wave:3, kills:5, t:30, runId:id, loot, goldRun:0, player:{hp:0}},false,{commit:true});
    const d2=makeInst('w_dagger_2',{sockets:1}); const r1=run('r_full1',[d2,{id:'m_dust',n:5}]);
    out.r1={st:r1.stashed.map(x=>x.u?x.id:x.id+'×'+x.n), lost:r1.lost.length, inStash:A.stash.some(x=>x.u===d2.u), dust:A.stash.find(x=>x.id==='m_dust').n, bag:itBagUsed(ch)};
    while(A.stash.length<A.stashMax) A.stash.push(makeInst('h_straw',{}));
    const d3=makeInst('w_dagger_3',{sockets:1}), cr={id:'m_crystal',n:2}; const r2=run('r_full2',[d3,cr,{id:'m_dust',n:4}]);
    out.r2={st:r2.stashed.map(x=>x.id+'×'+x.n), lost:r2.lost, lostRef:r2.lost[0]===d3&&r2.lost[1]===cr, dust:A.stash.find(x=>x.id==='m_dust').n, held:A.stash.some(x=>x.u===d3.u)||ch.inv.some(x=>x.u===d3.u)};
    ch.inv.push({id:'m_seal', n:97}); for(let i=0;i<2;i++) ch.inv.splice(ch.inv.findIndex(x=>x.id==='h_straw'),1);
    const r3=run('r_full3',[{id:'m_seal',n:5}]); out.r3={seal:invCount(ch,'m_seal'), stacks:ch.inv.filter(x=>x.id==='m_seal').map(x=>x.n), st:r3.stashed.length, lost:r3.lost.length};
    return out; })()`);
  ok('กระเป๋าเต็ม: ของที่ได้ไปอยู่คลัง (r.stashed) ไม่หาย · ผงรูน ×5 ซ้อนในคลัง', deq(o.r1.st, ['w_dagger_2', 'm_dust×5']) && o.r1.lost === 0 && o.r1.inStash && o.r1.dust === 5 && o.r1.bag === 80, o.r1);
  ok('กระเป๋าและคลังเต็ม: ของที่ซ้อนเข้ากองในคลังได้ยังเข้า (ผงรูน 5 → 9) · ที่เหลืออยู่ใน r.lost (object เดิมจาก G.loot) ไม่เงียบ',
    deq(o.r2.st, ['m_dust×4']) && o.r2.lostRef && o.r2.lost.length === 2 && o.r2.dust === 9 && !o.r2.held, o.r2);
  ok('กองที่ใส่ได้บางส่วน: ยันต์ผนึก 97 + 5 → กองเดิมเต็ม 99 + กองใหม่ 3 ในช่องว่าง · ไม่มีอะไรหาย', o.r3.seal === 102 && deq(o.r3.stacks, [99, 3]) && o.r3.st === 0 && o.r3.lost === 0, o.r3);
}
{
  const { X, notes } = fresh();
  X(`(()=>{ loadSaveFor(null); const ch=createChar('แจ้งเตือน','cleric'); while(itBagUsed(ch)<ch.bagMax) ch.inv.push(makeInst('h_straw',{}));
    while(SAVE.acct.stash.length<SAVE.acct.stashMax) SAVE.acct.stash.push(makeInst('h_straw',{}));
    onRunEnd({char:ch, modeId:'survival', tier:0, wave:3, kills:5, t:30, runId:'r_toast', loot:[makeInst('w_rod_2',{sockets:1}),{id:'m_crystal',n:2}], goldRun:0, player:{hp:0}},false,{commit:true}); })()`);
  ok('ของที่เก็บไม่ได้มี toast บอกผู้เล่น ("กระเป๋าและคลังเต็ม · ของ 3 ชิ้นเก็บไม่ได้")', notes.some(t => t[0] === 'กระเป๋าและคลังเต็ม · ของ 3 ชิ้นเก็บไม่ได้' && t[1] === 'bad'), notes);
}

console.log('M2 · ผ้าคลุมผู้บุกเบิก ครั้งเดียว');
{
  const { X, ls, notes } = fresh();
  ls.setItem('runeguard.best', '{"archer":{"score":777,"wave":9,"kills":300,"won":false}}');
  const p = X(`(()=>{ loadSaveFor(null); const a=createChar('รุ่นแรก','archer'), b=createChar('รุ่นสอง','mage'); const cl=a.inv.find(x=>x.id==='c_pioneer');
    const all=()=>SAVE.chars.reduce((n,c)=>n+c.inv.filter(x=>x.id==='c_pioneer').length,0);
    const out={worn:!!cl&&a.eq.cloak===cl.u, b:b.inv.some(x=>x.id==='c_pioneer'), flag:SAVE.acct.flags.pioneerCloak, n:all()};
    loadSaveFor(null); out.n2=all(); createChar('รุ่นสาม','thief'); out.n3=all(); return out; })()`);
  ok('ผู้เล่นเก่า: ตัวละครตัวแรกได้ผ้าคลุมผู้บุกเบิก (สวมอยู่) · ตัวที่สอง/สามไม่ได้ · โหลดใหม่ยังมีชิ้นเดียว · toast',
    p.worn && !p.b && p.flag === true && p.n === 1 && p.n2 === 1 && p.n3 === 1 && notes.some(t => /ผ้าคลุมผู้บุกเบิก/.test(t[0])), p);
}
{
  // M1 pioneer: made a character before items existed → the next load gives it once
  const { X, ls, notes } = fresh();
  const m1 = X(`(()=>{ const s=newSave(null); s.acct.flags.pioneer=true; s.acct.flags.migratedBest=true; const ch=newChar('ผู้บุกเบิก','swordsman'); ch.inv=[]; ch.eq=svEmptyEq(); ch.quick=[null,null]; delete ch.dye;
    const c2=newChar('ตัวที่สอง','mage'); c2.inv=[]; c2.eq=svEmptyEq(); s.chars.push(ch,c2); s.active=ch.id; return JSON.stringify(s); })()`);
  ls.setItem('runeguard.save.guest', m1);
  const q = X(`(()=>{ const s=loadSaveFor(null), a=s.chars[0], c=a.inv.find(x=>x.id==='c_pioneer');
    const stored=JSON.parse(localStorage.getItem('runeguard.save.guest')); const out={worn:!!c&&a.eq.cloak===c.u, other:s.chars[1].inv.length, flag:s.acct.flags.pioneerCloak,
      stored:stored.chars[0].inv.filter(x=>x.id==='c_pioneer').length, flagStored:stored.acct.flags.pioneerCloak};
    loadSaveFor(null); out.after=SAVE.chars[0].inv.filter(x=>x.id==='c_pioneer').length; return out; })()`);
  ok('ผู้บุกเบิกที่สร้างตัวละครไว้แล้วใน M1: โหลดครั้งแรกตัวแรกได้ผ้าคลุม (สวม) + เขียนลงเครื่อง · โหลดซ้ำไม่ได้เพิ่ม · ตัวที่สองไม่ได้',
    q.worn && q.other === 0 && q.flag && q.stored === 1 && q.flagStored === true && q.after === 1 && notes.some(t => /ผ้าคลุมผู้บุกเบิก/.test(t[0])), q);
}
{
  const { X, ls } = fresh();
  const full = X(`(()=>{ const s=newSave(null); s.acct.flags.pioneer=true; const ch=newChar('เต็มมือ','thief'); const old=makeInst('c_old',{}); ch.inv.push(old); ch.eq.cloak=old.u;
    while(svBagUsed(ch)<ch.bagMax) ch.inv.push(makeInst('h_straw',{})); s.chars.push(ch); s.active=ch.id; return JSON.stringify(s); })()`);
  ls.setItem('runeguard.save.guest', full);
  const z = X(`(()=>{ const out={}; loadSaveFor(null); const ch=curChar(); out.a=ch.inv.some(x=>x.id==='c_pioneer'); out.fa=SAVE.acct.flags.pioneerCloak;
    ch.inv.splice(ch.inv.findIndex(x=>x.id==='h_straw'),1); saveNow('room'); loadSaveFor(null); const c2=curChar(), cl=c2.inv.find(x=>x.id==='c_pioneer');
    out.b=!!cl; out.wornOld=c2.eq.cloak!==(cl&&cl.u); out.fb=SAVE.acct.flags.pioneerCloak;
    const s2=newSave(null); s2.acct.flags.pioneer=true; const k=newChar('มีแล้ว','mage'); s2.chars.push(k); s2.acct.stash.push(makeInst('c_pioneer',{})); out.own=svPioneerGift(s2,null); out.ownN=k.inv.filter(x=>x.id==='c_pioneer').length; out.ownF=s2.acct.flags.pioneerCloak;
    const s3=newSave(null); const k3=newChar('ไม่ใช่','mage'); s3.chars.push(k3); out.no=svPioneerGift(s3,null); return out; })()`);
  ok('ช่องผ้าคลุมไม่ว่าง + กระเป๋าเต็ม: ยังไม่ให้ (flag ยังไม่ตั้ง) · มีที่ว่างแล้วโหลดใหม่: ได้ในกระเป๋า (ไม่ถอดของเดิม)', !z.a && z.fa === false && z.b && z.wornOld && z.fb === true, z);
  ok('มีผ้าคลุมผู้บุกเบิกอยู่แล้ว (ในคลัง): ตั้ง flag อย่างเดียว ไม่ให้ชิ้นที่สอง · ไม่ใช่ผู้เล่นเก่า: ไม่ได้', z.own === true && z.ownN === 0 && z.ownF === true && z.no === false, z);
}

console.log('M2 · validateSave กับข้อมูลไอเทมที่เป็นพิษ');
{
  const { X } = fresh();
  const v = X(`(()=>{ const straw=[]; for(let i=0;i<70;i++) straw.push({u:'i_st'+i, id:'h_straw'});
    const evil={v:1, acct:{stashMax:60, stash:[{u:'i_s1', id:'w_sword_2', r:'7', f:'2', s:['rn_spitter','rn_shambler']}, {u:'i_dupe1', id:'n_fang', r:9, f:4, s:['rn_bat']},
        {id:'constructor', n:3}, {id:'__proto__'}, {u:'__proto__', id:'h_straw'}].concat(straw)},
      chars:[{cls:'swordsman', bagMax:80, eq:{weapon:'i_w', cloak:'i_dupe1', head:'constructor', toString:'i_w', ring:'i_ring', body:'i_t2'},
          quick:['constructor','toString'], zone:'constructor', visited:['constructor','z1'], dye:{body:'u_dye_red', trim:'constructor', cape:'w_sword_1', hatC:'u_dye_zzz', toString:'u_dye_red'},
          sk:{constructor:5, slash:2}, bestiary:{constructor:1, valueOf:3, beetle:1},
          inv:[{u:'i_w', id:'w_sword_4', r:1e9, f:-3, s:['rn_zzz','rn_shambler','rn_spitter'], lk:'1'},
            {u:'i_ring', id:'r_traveler', r:5, f:2, s:['rn_bat','rn_bat']},
            {u:'i_t2', id:'w_staff_2', r:NaN, f:99, s:['rn_bloater','rn_bloater','rn_bloater']},
            {u:'i_t3', id:'w_sword_3', s:['constructor']},
            {u:'i_dupe1', id:'c_old'},
            {id:'hasOwnProperty', n:1}, {id:'valueOf'}, {id:'toString'}, {u:'i_x', id:'constructor'}, {id:'isPrototypeOf'}, {id:'__defineGetter__'},
            {id:'m_dust', n:'50'}, {id:'m_dust', n:1e9}, {id:'m_seal', n:500}, {u:'i_bad', id:'m_dust', n:2}, {id:'w_sword_1', n:5}, {id:'m_crystal', n:-7}]},
        {cls:'mage', inv:[{u:'i_w', id:'w_staff_1'}], eq:{weapon:'i_w'}}]};
    const raw=JSON.parse(JSON.stringify(evil)); raw.chars[0].bestiary.__proto__=2;
    const s=validateSave(raw), c=s.chars[0], c2=s.chars[1];
    const all=[...s.chars.flatMap(x=>x.inv), ...s.acct.stash].filter(x=>x.u).map(x=>x.u);
    return {inv:c.inv, eq:c.eq, quick:c.quick, zone:c.zone, vis:c.visited, dye:c.dye, sk:c.sk, be:Object.keys(c.bestiary), c2:{inv:c2.inv, eq:c2.eq.weapon},
      stash:s.acct.stash.slice(0,4), stashN:s.acct.stash.length, uniq:new Set(all).size===all.length, polluted:({}).polluted!==undefined||Object.prototype.hasOwnProperty.call(Object.prototype,'n_fang'),
      again:JSON.stringify(validateSave(JSON.parse(JSON.stringify(s))))===JSON.stringify(s)}; })()`);
  const by = u => v.inv.find(x => x.u === u) || null;
  ok('ref 1e9 → +10 · f −3 → 0 · ช่องรูนตาม template (tier 4 สูงสุด 2): รูนที่ไม่รู้จักเก็บไว้ · รูนผิดกลุ่ม (เกราะในอาวุธ) → ว่าง · lk → 1',
    deq(by('i_w'), { u: 'i_w', id: 'w_sword_4', r: 10, f: 0, s: ['rn_zzz', null], lk: 1 }), by('i_w'));
  ok('เครื่องประดับตีบวกไม่ได้: r/f → 0 · tier 1 ไม่มีช่องรูน → [] · tier 2 ช่องเดียว · f 99 → 5 · r NaN → 0 · รูนชื่อ constructor → ว่าง',
    deq(by('i_ring'), { u: 'i_ring', id: 'r_traveler', r: 0, f: 0, s: [], lk: 0 }) && deq(by('i_t2'), { u: 'i_t2', id: 'w_staff_2', r: 0, f: 5, s: ['rn_bloater'], lk: 0 }) && deq(by('i_t3').s, [null]), [by('i_ring'), by('i_t2'), by('i_t3')]);
  const ids = v.inv.map(x => x.id);
  ok('id ชื่อเดียวกับสมาชิก Object.prototype (constructor · toString · valueOf · hasOwnProperty · isPrototypeOf · __proto__ · __defineGetter__) ถูกทิ้ง ไม่กลายเป็น unk',
    !ids.some(i => ['constructor', 'toString', 'valueOf', 'hasOwnProperty', 'isPrototypeOf', '__proto__', '__defineGetter__'].includes(i)) && !v.inv.some(x => x.unk), ids);
  ok('ของซ้อน: n "50" → 50 · 1e9 → 999 · ยันต์ผนึก 500 → 99 · n ติดลบ → 1 · ของซ้อนที่มี u → ไม่มี u · อาวุธในรูปของซ้อน → instance ใหม่ 1 ชิ้น',
    deq(v.inv.filter(x => !x.u).map(x => x.id + '×' + x.n), ['m_dust×50', 'm_dust×999', 'm_seal×99', 'm_dust×2', 'm_crystal×1']) && v.inv.some(x => x.id === 'w_sword_1' && /^i_[a-z0-9]{8}$/.test(x.u) && x.r === 0), v.inv);
  ok('eq: อาวุธ/ผ้าคลุม/แหวนที่ถูกช่องสวมอยู่ · "constructor" → null · ไม้เท้าในช่องเสื้อ (ผิดช่อง) → null · คีย์ toString ไม่เข้า eq',
    v.eq.weapon === 'i_w' && v.eq.cloak === 'i_dupe1' && v.eq.ring === 'i_ring' && v.eq.head === null && v.eq.body === null && Object.keys(v.eq).length === 10, v.eq);
  ok('quick / zone / visited / bestiary / sk ที่เป็นชื่อ prototype ถูกทิ้ง', deq(v.quick, [null, null]) && v.zone === 'z1' && deq(v.vis, ['z1']) && deq(v.be, ['beetle']) && deq(v.sk, { slash: 2 }), [v.quick, v.zone, v.vis, v.be, v.sk]);
  ok('dye: เฉพาะ body/trim/cape/hatC ที่เป็น id u_dye_* (สีที่ไม่รู้จักเก็บไว้)', deq(v.dye, { body: 'u_dye_red', hatC: 'u_dye_zzz' }), v.dye);
  ok('uid ซ้ำข้ามตัวละคร/คลัง → ตัวหลังได้ uid ใหม่ (ทั้งเซฟไม่มี uid ซ้ำ) · eq ของตัวที่สองที่ชี้ uid ซ้ำ → null แต่ของยังอยู่',
    v.uniq && v.c2.eq === null && v.c2.inv.length === 1 && v.c2.inv[0].u !== 'i_w' && v.stash[1].id === 'n_fang' && v.stash[1].u !== 'i_dupe1', v.c2);
  ok('คลัง: r "7" → 7 · f "2" → 2 · ช่องรูน tier 2 = 1 · เครื่องประดับ r/f → 0 · id prototype ถูกทิ้ง · uid "__proto__" → uid ใหม่ · ไม่เกิน stashMax 60',
    deq(v.stash[0], { u: 'i_s1', id: 'w_sword_2', r: 7, f: 2, s: ['rn_spitter'], lk: 0 }) && v.stash[1].r === 0 && v.stash[1].f === 0 && deq(v.stash[1].s, []) && v.stash[2].id === 'h_straw' && /^i_[a-z0-9]{8}$/.test(v.stash[2].u) && v.stashN === 60, v.stash);
  ok('ไม่มี prototype pollution · validateSave ซ้ำได้ผลเดิม', !v.polluted && v.again, v);
  const w = X(`(()=>{ const ch=newChar('สวมห้า','swordsman'); ch.inv=[]; ch.eq=svEmptyEq();
    for(const [slot,id] of [['weapon','w_sword_1'],['head','h_straw'],['body','b_cotton'],['cloak','c_old'],['feet','s_sandal']]){ const x=makeInst(id,{}); ch.inv.push(x); ch.eq[slot]=x.u; }
    for(let i=0;i<80;i++) ch.inv.push(makeInst('h_leather',{})); const a=validateSave({v:1, chars:[ch]}).chars[0];
    ch.inv.push(makeInst('h_leather',{})); const b=validateSave({v:1, chars:[ch]}).chars[0];
    return {a:a.inv.length, aw:Object.values(a.eq).filter(Boolean).length, used:itBagUsed(a), b:b.inv.length, bw:Object.values(b.eq).filter(Boolean).length}; })()`);
  ok('85 ชิ้น สวม 5 (lane E CR 1): โหลดใหม่ไม่หายสักชิ้น (กระเป๋า 80/80 + สวม 5) · 86 ชิ้น: ตัดเฉพาะชิ้นที่ไม่ได้สวม', w.a === 85 && w.aw === 5 && w.used === 80 && w.b === 85 && w.bw === 5, w);
}

// ================================================================================================
// M1 carry-over (tester): each case below fails on the M1 code (checked against the pristine files)
// ================================================================================================
console.log('carry-over (a) · เซฟหลักอ่านไม่ได้และไม่มี .bak: ข้อความเดิมไปอยู่ .bak ก่อนเขียนเซฟใหม่');
{
  const K = 'runeguard.save.guest', raw = '{"v":1,"acct":{"gold":5000},"chars":[{"cls":"mage","lv":30,"name":"เกือบหาย"';
  const { X, ls } = fresh();
  ls.setItem(K, raw);
  const a = X(`(()=>{ const s=loadSaveFor(null); return {from:svlState().from, n:s.chars.length}; })()`);
  ok('โหลด: เริ่มเซฟใหม่ (lost) · .bak = ข้อความเดิมของเซฟหลักทุกไบต์ · เซฟหลักเป็นเซฟใหม่ที่อ่านได้', a.from === 'lost' && ls.getItem(K + '.bak') === raw && JSON.parse(ls.getItem(K)).v === 7, a);
  X(`createChar('หลังพัง','mage'); saveNow('t1'); curChar().quick[1]='u_potion_s'; saveNow('t2');`);
  ok('เขียนเซฟที่ยังไม่มีความคืบหน้าซ้ำ ๆ ไม่ทับ .bak ที่เก็บข้อความเสียไว้', ls.getItem(K + '.bak') === raw);
  X(`curChar().kills=3; saveNow('p1'); curChar().kills=4; saveNow('p2');`);
  ok('มีความคืบหน้าจริงแล้ว: write-ahead กลับมาทำงานปกติ (.bak = เซฟก่อนหน้าที่มี kills 3)', JSON.parse(ls.getItem(K + '.bak')).chars[0].kills === 3);
}
{
  const K = 'runeguard.save.guest';
  const { X, ls } = fresh();
  ls.setItem(K, 'garbage-main'); ls.setItem(K + '.bak', 'garbage-bak');
  X(`loadSaveFor(null)`);
  ok('เสียทั้งคู่: .bak = ข้อความของเซฟหลัก (ใหม่กว่า) · เซฟหลักใหม่อ่านได้', ls.getItem(K + '.bak') === 'garbage-main' && JSON.parse(ls.getItem(K)).v === 7);
  const base = memStorage(), lsx = { getItem: k => base.getItem(k), removeItem: k => base.removeItem(k), clear: () => base.clear(), key: i => base.key(i), get length() { return base.length; },
    setItem: (k, v) => { if (String(k).endsWith('.bak')) throw new Error('QuotaExceededError'); base.setItem(k, v); } };
  const F = fresh({ localStorage: lsx });
  base.setItem(K, 'garbage-only');
  const st = F.X(`(()=>{ loadSaveFor(null); createChar('ในหน่วยความจำ','thief'); return {stored:svlState().stored, n:SAVE.chars.length}; })()`);
  ok('คัดลอกไป .bak ไม่ได้ (โควต้าเต็ม): ไม่เขียนทับเซฟหลักที่อ่านไม่ได้ · เล่นต่อในหน่วยความจำ', base.getItem(K) === 'garbage-only' && st.stored === false && st.n === 1, st);
}

console.log('carry-over (b) · อีกแท็บล้าง localStorage: เขียนเซฟในหน่วยความจำคืน ไม่โหลดเซฟว่าง');
{
  const shared = memStorage(), K = 'runeguard.save.guest';
  const A = fresh({ localStorage: shared }), B = fresh({ localStorage: shared });
  A.X(`loadSaveFor(null); createChar('ล้างข้อมูล','mage'); DEV.profile.gold(4321); DEV.profile.exp(20000);`);
  const lv = A.X(`curChar().lv`), sid = A.X(`SAVE.sid`);
  shared.clear(); A.X(`svlOnStorage({key:null})`);
  const a = A.X(`({gold:SAVE.acct.gold, lv:curChar().lv, n:SAVE.chars.length})`), m = JSON.parse(shared.getItem(K));
  ok('localStorage.clear() ในอีกแท็บ (event key null): เซฟในแท็บนี้ยังอยู่ และถูกเขียนคืนลงเครื่อง + toast',
    a.gold === 4321 && a.lv === lv && lv > 1 && m.acct.gold === 4321 && m.sid === sid && A.notes.some(t => /ถูกล้าง/.test(t[0])), { a, gold: m.acct.gold });
  shared.removeItem(K); A.X(`svlOnStorage({key:'${K}'})`);
  ok('คีย์หลักถูกลบ (removeItem): เขียนคืนเหมือนกัน', JSON.parse(shared.getItem(K) || 'null')?.acct.gold === 4321);
  shared.clear(); B.X(`loadSaveFor(null)`);                                   // a tab that started over writes an empty save first
  const bSid = JSON.parse(shared.getItem(K)).sid; A.X(`svlOnStorage({key:'${K}'})`);
  const m2 = JSON.parse(shared.getItem(K));
  ok('อีกแท็บเริ่มเซฟว่างใหม่หลังล้าง (sid อื่น ไม่มีความคืบหน้า): แท็บนี้เขียนเซฟที่มีความคืบหน้าคืน', bSid !== sid && m2.sid === sid && m2.acct.gold === 4321 && A.X(`SAVE.acct.gold`) === 4321, m2.sid);
  B.X(`loadSaveFor(null); DEV.profile.gold(9999)`); A.X(`svlOnStorage({key:'${K}'})`);
  ok('อีกแท็บเขียนเซฟเดียวกันตามปกติ: ยังโหลดของอีกแท็บ (ไม่เขียนทับ)', A.X(`SAVE.acct.gold`) === 9999 && JSON.parse(shared.getItem(K)).acct.gold === 9999);
  A.X(`G={char:curChar(), over:false}`); shared.clear(); A.X(`svlOnStorage({key:null})`);
  const mid = JSON.parse(shared.getItem(K) || 'null');
  const rr = A.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:4, kills:9, t:40, runId:'r_clear1', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); return {c:r.committed, gold:r.gold}; })()`);
  const m3 = JSON.parse(shared.getItem(K));
  // fix-r3: was "waits until the run ends" (mid === null) — see the next block for the progress that waiting lost
  ok('ล้างระหว่างรอบ: เขียนเซฟคืนทันที (ไม่รอจบรอบ) · จบรอบแล้วรางวัลลงเซฟ', !!mid && mid.sid === sid && mid.acct.gold === 9999 && rr.c && m3.acct.gold === 9999 + rr.gold && m3.acct.runIds.includes('r_clear1'), { mid: mid && mid.acct.gold, rr, gold: m3.acct.gold });
  A.X(`G=null`);
}
console.log('fix-r3 · ล้าง localStorage ระหว่างรอบ แล้วอีกแท็บเล่นต่อก่อนรอบนี้จบ: เซฟของแท็บนี้ไม่หาย');
{
  const sh = memStorage(), K = 'runeguard.save.guest';
  const A = fresh({ localStorage: sh }), B = fresh({ localStorage: sh });
  A.X(`loadSaveFor(null); createChar('จอมเวทเอ','mage'); DEV.profile.gold(88888); DEV.profile.exp(200000);`);
  const lvA = A.X('curChar().lv'), sidA = A.X('SAVE.sid'), idA = A.X('curChar().id');
  A.X(`G={char:curChar(), over:false}`); sh.clear(); A.X(`svlOnStorage({key:null})`);          // tab A is mid-run
  B.X(`loadSaveFor(null); createChar('แท็บบี','thief')`);                                      // tab B opens and plays
  const rb = B.X(`onRunEnd({char:curChar(), modeId:'survival', tier:0, wave:6, kills:40, t:80, runId:'r_b3', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}).committed`);
  const ra = A.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:5, kills:30, t:60, runId:'r_a3', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return {c:r.committed, gold:r.gold}; })()`);
  const m = JSON.parse(sh.getItem(K)), a = m.chars.find(c => c.id === idA);
  ok('ล้างกลางรอบ → อีกแท็บสร้างตัวละครและจบรอบก่อน → จบรอบนี้: เซฟเดิม (Lv · 88,888 ทอง) + ตัวละครของอีกแท็บ + รางวัลทั้งสองรอบอยู่ครบ (เดิมเหลือแค่เซฟของอีกแท็บ)',
    lvA > 1 && m.sid === sidA && !!a && a.lv === lvA && m.chars.some(c => c.name === 'แท็บบี') && rb === true && ra.c === true && m.acct.gold >= 88888 + ra.gold && m.acct.runIds.includes('r_a3') && m.acct.runIds.includes('r_b3'),
    { sid: m.sid === sidA, a: a && a.lv, lvA, chars: m.chars.map(c => c.name), gold: m.acct.gold, runIds: m.acct.runIds, rb, ra });
}
console.log('m2-orch · ล้างข้อมูลตอนอีกแท็บอยู่กลางรอบ: สำเนาเก่าของแท็บกลางรอบไม่ทับของใหม่ของแท็บที่อยู่ในป้อม (3 ลำดับเหตุการณ์)');
{
  // A = in the fort (buys + refines) · B = mid-run, its copy is older · one clock for both tabs, every Date.now() +7 ms
  const K = 'runeguard.save.guest';
  const setup = () => {
    let t = 1.9e12; const clk = () => (t += 7);
    const sh = memStorage(), A = fresh({ localStorage: sh, __clk: clk }), B = fresh({ localStorage: sh, __clk: clk });
    for (const T of [A, B]) T.X(`Date.now=()=>__clk()`);
    A.X(`loadSaveFor(null); createChar('ป้อมเอ','swordsman'); DEV.profile.gold(50000); DEV.profile.give('w_sword_2',1,{r:7}); DEV.profile.give('m_crystal',30)`);
    B.X(`loadSaveFor(null); G={char:curChar(), over:false}`);                    // B starts a run on the same save
    const uid = A.X(`curChar().inv.find(x=>x.id==='w_sword_2').u`);
    A.X(`buyItem(curChar(),'m_dust',10)`); B.X(`svlOnStorage({key:'${K}'})`);    // mid-run: B does not reload (by design)
    const rf = A.X(`(()=>{ itRefineRng=()=>.99; try{ return refineTry(curChar(),'${uid}',{}); } finally{ itRefineRng=null; } })()`);   // a fail: +7→+8 drops to +6, pity 1
    B.X(`svlOnStorage({key:'${K}'})`);
    const want = A.X(`({gold:SAVE.acct.gold, dust:invCount(curChar(),'m_dust'), cr:invCount(curChar(),'m_crystal'), r:itFind(curChar(),'${uid}').r, f:itFind(curChar(),'${uid}').f})`);
    const got = () => { const s = JSON.parse(sh.getItem(K)), c = s.chars[0], w = c.inv.find(x => x.u === uid), n = id => c.inv.filter(x => x.id === id).reduce((a, x) => a + (x.n | 0), 0);
      return { gold: s.acct.gold, dust: n('m_dust'), cr: n('m_crystal'), r: w && w.r, f: w && w.f }; };
    const endB = () => B.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:6, kills:20, t:70, runId:'r_wipe_b', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return {c:r.committed, gold:r.gold}; })()`);
    return { sh, A, B, uid, rf, want, got, endB };
  };
  const same = (a, b) => a.gold === b.gold && a.dust === b.dust && a.cr === b.cr && a.r === b.r && a.f === b.f;
  // 1 · tab A clears (A gets no event) → B (mid-run) writes its older copy back → A gets B's event and writes its newer copy over it
  {
    const S = setup();
    ok('ตั้งต้น: ตีบวก +7→+8 ล้ม (ตกเหลือ +6 · ความเพียร 1) · ซื้อผง 10 · B ยังถือสำเนาก่อนซื้อ', S.rf.res === 'down' && S.want.r === 6 && S.want.f === 1 && S.want.dust === 10, { rf: S.rf, want: S.want });
    S.sh.clear(); S.B.X(`svlOnStorage({key:null})`);
    const mid = S.got();
    S.A.X(`svlOnStorage({key:'${K}'})`);
    const afterA = S.got();
    S.B.X(`svlOnStorage({key:'${K}'})`);                                         // A's write reaches B mid-run: B waits
    const rr = S.endB(), fin = S.got();
    ok('ลำดับ 1 (แท็บ A ล้างเอง): B กลางรอบเคยเห็นของใหม่ของ A (svlSeen) → เขียนของใหม่นั้นคืน ไม่ใช่สำเนาเก่าของตัวเอง (ทอง ผง คริสตัล +6/ความเพียรครบตั้งแต่แรก)',
      same(mid, S.want) && same(afterA, S.want), { mid, afterA, want: S.want });
    ok('ลำดับ 1: จบรอบของ B โหลดของ A แล้วจ่ายรางวัลทับ · ผลตีบวกที่ล้มไม่หาย (ตีซ้ำไม่ได้)',
      rr.c && fin.gold === S.want.gold + rr.gold && fin.dust === S.want.dust && fin.r === S.want.r && fin.f === S.want.f, { rr, fin, want: S.want });
    ok('ลำดับ 1: แท็บ A ไม่โหลดสำเนาเก่า (หน่วยความจำยังเป็นของใหม่) · ไม่มีเตือนแดง', S.A.X(`SAVE.acct.gold`) === S.want.gold && S.A.X(`itFind(curChar(),'${S.uid}').f`) === 1 && !S.A.notes.some(t => t[1] === 'bad'), S.A.X(`SAVE.acct.gold`));
  }
  // 1b · same, but A only notices on its next action (no storage event reached it): that action writes the newer copy back
  {
    const S = setup();
    S.sh.clear(); S.B.X(`svlOnStorage({key:null})`);
    const r = S.A.X(`buyItem(curChar(),'u_potion_s',1)`);
    const g = S.got();
    ok('ลำดับ 1b (A ไม่ได้รับ event · กดซื้อครั้งถัดไป): ไม่โหลดสำเนาเก่า · ของใหม่ + ยา 1 ขวดลงเครื่อง',
      r === '' && g.dust === S.want.dust && g.r === S.want.r && g.f === S.want.f && g.cr === S.want.cr && g.gold === S.want.gold - S.A.X(`itBuyPrice('u_potion_s')`), { r, g, want: S.want });
  }
  // 2 · external clear, B (mid-run) handles the event first, then A
  {
    const S = setup();
    S.sh.clear(); S.B.X(`svlOnStorage({key:null})`); S.A.X(`svlOnStorage({key:null})`);
    S.B.X(`svlOnStorage({key:'${K}'})`);
    const g = S.got(), rr = S.endB(), fin = S.got();
    ok('ลำดับ 2 (ล้างจากภายนอก · B ได้ event ก่อน): ของใหม่ของ A ชนะ · จบรอบ B รางวัลลงบนของใหม่', same(g, S.want) && rr.c && fin.gold === S.want.gold + rr.gold && fin.f === S.want.f, { g, fin, rr });
  }
  // 3 · external clear, A (idle) handles the event first, then B
  {
    const S = setup();
    S.sh.clear(); S.A.X(`svlOnStorage({key:null})`); S.B.X(`svlOnStorage({key:null})`);
    const g = S.got(), rr = S.endB(), fin = S.got();
    ok('ลำดับ 3 (ล้างจากภายนอก · A ได้ event ก่อน): A เขียนคืน · B ไม่เขียนทับ · จบรอบ B รางวัลลงบนของใหม่', same(g, S.want) && rr.c && fin.gold === S.want.gold + rr.gold && fin.f === S.want.f, { g, fin, rr });
  }
  // import of an older export: mt is stamped, so the other tab (same sid, later copy) reloads it instead of writing its own back
  {
    const S = setup(); S.B.X(`G=null`);
    const old = S.B.X(`exportSave()`);                                            // B's copy: before the purchase and the refine
    S.B.X(`svlFresh()`);                                                          // B catches up (reload)
    const imp = S.B.X(`importSave(${JSON.stringify(old)}).ok`);
    S.A.X(`svlOnStorage({key:'${K}'})`);
    const g = S.got();
    ok('นำเข้าเซฟเก่า (sid เดียวกัน): แท็บอื่นโหลดเซฟที่นำเข้า ไม่เขียนสำเนาของตัวเองทับ', imp === true && g.dust === 0 && S.A.X(`invCount(curChar(),'m_dust')`) === 0, { imp, g });
  }
}

console.log('m2-orch · นาฬิกาเครื่องถอยหลังตอนเปิดสองแท็บ: การกระทำไม่ถูกย้อน (ลำดับเซฟใช้ตัวนับ wc ไม่ใช้นาฬิกา)');
{
  const K = 'runeguard.save.guest';
  let t = 1.9e12; const clk = () => (t += 7);
  const sh = memStorage(), A = fresh({ localStorage: sh, __clk: clk }), B = fresh({ localStorage: sh, __clk: clk });
  for (const T of [A, B]) T.X(`Date.now=()=>__clk()`);
  A.X(`loadSaveFor(null); createChar('นาฬิกาถอย','mage'); DEV.profile.gold(50000)`);
  B.X(`loadSaveFor(null)`);
  const wc0 = JSON.parse(sh.getItem(K)).wc, pot0 = A.X(`invCount(curChar(),'u_potion_s')`);
  t -= 3600e3;                                                                  // the clock steps back 1 h (NTP / date changed by hand)
  const r1 = A.X(`buyItem(curChar(),'m_dust',10)`); B.X(`svlOnStorage({key:'${K}'})`);
  const r2 = B.X(`buyItem(curChar(),'u_potion_s',1)`); A.X(`svlOnStorage({key:'${K}'})`);
  const r3 = A.X(`buyItem(curChar(),'m_dust',5)`); B.X(`svlOnStorage({key:'${K}'})`);
  const s = JSON.parse(sh.getItem(K)), c = s.chars[0], n = id => c.inv.filter(x => x.id === id).reduce((a, x) => a + (x.n | 0), 0);
  const mem = T => T.X(`JSON.stringify(SAVE)`) === sh.getItem(K);
  ok('นาฬิกาถอย 1 ชม.: ซื้อสลับกันสองแท็บ 3 ครั้ง ของอยู่ครบ (ผง 15 · ยา +1) · wc +3 · หน่วยความจำทั้งสองแท็บ = ที่เก็บ (ถ้าเรียงด้วยเวลา แท็บที่ถือเวลาสูงกว่าจะเขียนทับทุกครั้ง)',
    r1 === '' && r2 === '' && r3 === '' && n('m_dust') === 15 && n('u_potion_s') === pot0 + 1 && s.wc === wc0 + 3 && mem(A) && mem(B), { r: [r1, r2, r3], dust: n('m_dust'), pot: n('u_potion_s'), pot0, wc: s.wc - wc0, a: mem(A), b: mem(B) });
  t -= 3600e3;                                                                  // and back again, then an import in A
  const json = A.X(`exportSave()`), wc1 = JSON.parse(sh.getItem(K)).wc;
  const imp = A.X(`importSave(${JSON.stringify(json)}).ok`); B.X(`svlOnStorage({key:'${K}'})`);
  const s2 = JSON.parse(sh.getItem(K));
  ok('นาฬิกาถอยอีกครั้งแล้วนำเข้าเซฟ: wc ของเซฟที่นำเข้า > เดิม · อีกแท็บโหลดตาม ไม่เขียนสำเนาของตัวเองทับ', imp === true && s2.wc > wc1 && mem(B) && mem(A), { imp, d: s2.wc - wc1 });
}
console.log('m2-orch r2 · เขียนทับสำเนาเก่าใน svlWrite · แท็บใหม่กว่ากลางรอบ · นำเข้าหลังล้าง · เขียนไม่ผ่าน · เซฟหลักเสีย · บันทึกพร้อมกัน · รางวัล/สร้างตัวชนกัน');
{
  const K = 'runeguard.save.guest';
  // two tabs on one storage · tab A can be made to fail its writes (quota) · one shared fake clock
  const pair = () => {
    let t = 1.9e12; const clk = () => (t += 7);
    const base = memStorage(), failA = { on: false };
    const lsA = { getItem: k => base.getItem(k), removeItem: k => base.removeItem(k), clear: () => base.clear(), key: i => base.key(i), get length() { return base.length; },
      setItem: (k, v) => { if (failA.on) throw new Error('QuotaExceededError'); base.setItem(k, v); } };
    const A = fresh({ localStorage: lsA, __clk: clk }), B = fresh({ localStorage: base, __clk: clk });
    for (const T of [A, B]) T.X(`Date.now=()=>__clk()`);
    A.X(`loadSaveFor(null); createChar('สองแท็บ','swordsman'); DEV.profile.gold(50000)`); B.X(`loadSaveFor(null)`);
    const got = () => { const s = JSON.parse(base.getItem(K) || 'null'); if (!s) return null; const c = s.chars[0], n = id => c.inv.filter(x => x.id === id).reduce((a, x) => a + (x.n | 0), 0);
      return { gold: s.acct.gold, dust: n('m_dust'), pot: n('u_potion_s'), wc: s.wc, chars: s.chars.length, runIds: s.acct.runIds.slice(), sid: s.sid }; };
    return { base, A, B, got, failA, step: d => { t += d; } };
  };
  // H1 · after a wipe the stale tab wrote its copy back; the newer tab's next write sees it only inside svlWrite (no svlFresh first)
  {
    const P = pair();
    P.A.X(`buyItem(curChar(),'m_dust',10)`);                                   // A newer (B has not seen it)
    P.base.clear(); P.B.X(`svlOnStorage({key:null})`);                          // B writes its older copy back
    const w = P.A.X(`DEV.profile.gold(SAVE.acct.gold+1)`);                      // a plain saveNow in A, no svlFresh before it
    const g = P.got();
    ok('H1: เขียนธรรมดา (saveNow) ทับสำเนาเก่าที่อีกแท็บเขียนคืน · ผง 10 ของแท็บใหม่ยังอยู่ (ถ้า svlWrite โหลดสำเนาเก่าแทน ผงหาย)', g.dust === 10 && g.gold === w, { g, w });
    P.base.clear(); P.B.X(`svlFresh(); svlOnStorage({key:null})`);
    const r = P.A.X(`(()=>{ const f=svlFresh; svlFresh=()=>false; try{ return buyItem(curChar(),'u_potion_s',1); } finally{ svlFresh=f; } })()`);
    const g2 = P.got();
    ok('H1b: คำสั่งซื้อที่ itLive ไม่เห็นสำเนาเก่า ก็ยังเขียนของใหม่ทับ (ไม่คืน "อีกแท็บ") · ของเดิมครบ', r === '' && g2.dust === 10 && g2.pot === 4, { r, g2 });
  }
  // H2 · the newer tab is mid-run, the stale tab writes its copy back and acts before the run ends
  {
    const P = pair();
    P.A.X(`buyItem(curChar(),'m_dust',10); buyItem(curChar(),'m_dust',1); G={char:curChar(), over:false}`);   // A: 2 writes ahead, then a run
    P.base.clear(); P.B.X(`svlFresh()`);                                         // B (idle, behind) restores its copy on its next action…
    P.B.X(`buyItem(curChar(),'u_potion_s',1)`);                                 // …and buys on it (wc only 1 past its old copy)
    P.A.X(`svlOnStorage({key:'${K}'})`);                                       // A mid-run sees an older copy of its save → writes its own back
    const mid = P.got();
    const rr = P.A.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:4, kills:9, t:40, runId:'r_h2run', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return r.committed; })()`);
    const fin = P.got();
    ok('H2: แท็บใหม่กว่าอยู่กลางรอบ เขียนของตัวเองทับสำเนาเก่าที่อีกแท็บใช้ซื้อต่อ · ผง 11 ของแท็บใหม่ไม่หาย · จบรอบรางวัลลง', mid.dust === 11 && rr === true && fin.dust === 11 && fin.runIds.includes('r_h2run'), { mid, fin, rr });
    ok('H2: แท็บที่ช้ากว่าโหลดของใหม่ในคำสั่งถัดไป (ยาที่ซื้อบนสำเนาเก่าหาย = ข้อจำกัดที่ยอมรับ ไม่มีของซ้ำ)', P.B.X(`(svlFresh(), invCount(curChar(),'m_dust'))`) === 11, P.B.X(`invCount(curChar(),'m_dust')`));
  }
  // import right after a wipe: wc starts above this tab's own copy, so the other tab (same wc as this one) reloads the import
  {
    const P = pair();
    const old = P.A.X(`exportSave()`);
    P.A.X(`buyItem(curChar(),'m_dust',5)`); P.B.X(`svlOnStorage({key:'${K}'})`);            // both tabs in step, wc k
    P.base.clear();                                                                // wiped; nobody restored yet
    const imp = P.A.X(`importSave(${JSON.stringify(old)}).ok`); P.B.X(`svlOnStorage({key:'${K}'})`);
    const g = P.got();
    ok('นำเข้าเซฟเก่าทันทีหลังล้าง: wc ตั้งเหนือสำเนาของแท็บนี้ → อีกแท็บ (wc เท่ากัน) โหลดเซฟที่นำเข้า ไม่เขียนทับ', imp === true && g.dust === 0 && P.B.X(`invCount(curChar(),'m_dust')`) === 0, { imp, g });
  }
  // a failed write (quota) puts wc back: the other tab's later write still wins
  {
    const P = pair();
    const wc0 = P.got().wc;
    P.failA.on = true; const ra = P.A.X(`buyItem(curChar(),'m_dust',3)`); const wcA = P.A.X(`SAVE.wc`); P.failA.on = false;
    P.step(-3600e3);
    const rb = P.B.X(`buyItem(curChar(),'u_potion_s',2)`); P.A.X(`svlOnStorage({key:'${K}'})`);
    const g = P.got();
    ok('เขียนไม่ผ่าน (โควตาเต็ม) แล้ว wc ไม่ขยับ · อีกแท็บซื้อต่อ → แท็บนี้โหลดของอีกแท็บ (ยา +2 อยู่ · ผงที่ไม่เคยบันทึกไม่โผล่)', ra === '' && wcA === wc0 && rb === '' && g.pot === 5 && g.dust === 0 && P.A.X(`invCount(curChar(),'u_potion_s')`) === 5, { ra, wcA, wc0, rb, g });
  }
  // the main text no longer parses while a tab is open: that tab's copy goes back (not .bak, which is one write behind)
  {
    const P = pair();
    const u = P.A.X(`(()=>{ const it=makeInst('w_sword_2',{}); it.r=7; invAdd(curChar(),it,1); invAdd(curChar(),'m_crystal',5); saveNow('t'); return it.u; })()`);
    P.B.X(`svlOnStorage({key:'${K}'})`);
    const rf = P.A.X(`(()=>{ itRefineRng=()=>.99; try{ return refineTry(curChar(),'${u}',{}).res; } finally{ itRefineRng=null; } })()`);
    P.base.setItem(K, '{"v":1,"acct":{"gold":'); P.A.X(`svlOnStorage({key:'${K}'})`);
    const s = JSON.parse(P.base.getItem(K)), w = s.chars[0].inv.find(x => x.u === u);
    ok('เซฟหลักเสียระหว่างเปิดเกม: แท็บที่เปิดอยู่เขียนสำเนาของตัวเองคืน (ผลตีบวกที่ล้มยังอยู่ +6 ความเพียร 1) · ไม่ถอยไป .bak · toast "เซฟในเครื่องเสีย"',
      rf === 'down' && w && w.r === 6 && (w.f | 0) === 1 && P.A.notes.some(n => /เซฟในเครื่องเสีย/.test(n[0])), { rf, r: w && w.r, f: w && w.f });
  }
  // two writes on the same base at once (a busy tab read a stale cache): the tab whose action was overwritten is told so
  {
    const P = pair();
    const tk = P.base.getItem(K);
    P.B.X(`buyItem(curChar(),'u_potion_s',1)`);                                // B: wc k+1
    const tb = P.base.getItem(K); P.base.setItem(K, tk);                           // A still sees the old text (stale cache)…
    P.A.X(`buyItem(curChar(),'m_dust',1)`);                                      // …and writes wc k+1 on it
    P.B.X(`svlOnStorage({key:'${K}'})`);
    ok('บันทึกพร้อมกันบนฐานเดียวกัน (wc เท่ากัน): แท็บที่ถูกทับโหลดใหม่และได้ toast เตือนว่าการกระทำล่าสุดอาจหาย', tb !== tk && P.B.notes.some(n => n[1] === 'bad' && /บันทึกทับพร้อมกัน/.test(n[0])), P.B.notes.slice(-2));
  }
  // onRunEnd whose write finds another tab's save: the reward is paid once onto the reloaded save, not lost and not twice
  {
    const P = pair();
    P.A.X(`G={char:curChar(), over:false}`);
    P.B.X(`buyItem(curChar(),'m_dust',4)`);
    const r = P.A.X(`(()=>{ const f=svlFresh; svlFresh=()=>false; try{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:5, kills:20, t:50, runId:'r_race1', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); return {c:r.committed, gold:r.gold}; } finally{ svlFresh=f; G=null; } })()`);
    const g = P.got();
    ok('จบรอบตอนอีกแท็บเพิ่งเขียน: รางวัลจ่ายลงเซฟที่โหลดใหม่ครั้งเดียว (committed · runId 1 ครั้ง · ผงของอีกแท็บอยู่)', r.c === true && g.runIds.filter(x => x === 'r_race1').length === 1 && g.dust === 4 && g.gold === 50000 + r.gold - P.A.X(`itBuyPrice('m_dust')`) * 4, { r, g });
    const again = P.A.X(`grantRewards(curChar(),{runId:'r_race1', baseXp:10, jobXp:5, gold:999, items:[], st:{}})`);
    ok('ส่งรางวัลรอบเดิมซ้ำ → ปฏิเสธ', again === false && P.got().gold === g.gold, again);
  }
  // createChar / deleteChar / setActiveChar whose write finds another tab's save: not reported as done
  {
    const P = pair();
    P.B.X(`buyItem(curChar(),'m_dust',2)`);
    const c = P.A.X(`(()=>{ const f=svlFresh; svlFresh=()=>false; try{ const r=createChar('ชนกันตอนสร้าง','mage'); return typeof r==='string'?r:'OK'; } finally{ svlFresh=f; } })()`);
    const g = P.got();
    ok('สร้างตัวละครตอนอีกแท็บเพิ่งเขียน: คืนข้อความ "อีกแท็บ" ไม่ใช่ตัวละคร · ในเครื่องยังมีตัวเดียว + ผงของอีกแท็บ', /อีกแท็บ/.test(c) && g.chars === 1 && g.dust === 2, { c, g });
  }
}
console.log('m2-orch r3 · แอปคนละรุ่น (สายเซฟ wb) · ไม่มีเตือนแดงปลอม · .bak ใหม่กว่า · นำเข้า wc ตัน · toast รางวัลครั้งเดียว');
{
  const K = 'runeguard.save.guest';
  const tabs = n => {
    let t = 1.9e12; const clk = () => (t += 7); const sh = memStorage(), T = [];
    for (let i = 0; i < n; i++) { const x = fresh({ localStorage: sh, __clk: clk }); x.X(`Date.now=()=>__clk()`); T.push(x); }
    T[0].X(`loadSaveFor(null); createChar('หลายรุ่น','swordsman'); DEV.profile.gold(50000)`); for (const x of T.slice(1)) x.X(`loadSaveFor(null)`);
    const got = () => { const s = JSON.parse(sh.getItem(K) || 'null'); if (!s) return null; const c = s.chars[0], q = id => c.inv.filter(x => x.id === id).reduce((a, x) => a + (x.n | 0), 0);
      return { gold: s.acct.gold, dust: q('m_dust'), pot: q('u_potion_s'), wc: s.wc, wb: s.wb }; };
    const red = x => x.notes.filter(n => n[1] === 'bad' && /บันทึกทับพร้อมกัน/.test(n[0])).length;
    return { sh, T, got, red };
  };
  // an older build (no wc / wb) writes: its copy is a new lineage, never "older" than a tab that still holds a high wc
  {
    const { sh, T: [A, C], got } = tabs(2);
    for (let i = 0; i < 4; i++) { A.X(`buyItem(curChar(),'u_potion_s',1)`); C.X(`svlOnStorage({key:'${K}'})`); }
    C.X(`G={char:curChar(), over:false}`);                                        // C mid-run, wc high
    const old = JSON.parse(sh.getItem(K)); delete old.wc; delete old.wb; old.app = '2.0.0-m1'; old.acct.gold += 777; sh.setItem(K, JSON.stringify(old));   // the M1 build's write
    A.X(`svlOnStorage({key:'${K}'})`); A.X(`buyItem(curChar(),'m_dust',5)`);       // A reloads it (new lineage, wc 0) and buys
    C.X(`svlOnStorage({key:'${K}'})`);
    const g = got();
    ok('แอปรุ่นเก่า (ไม่มี wc/wb) เขียน → แท็บรุ่นนี้โหลดเป็นสายใหม่แล้วซื้อ → แท็บกลางรอบที่ถือ wc สูงกว่าไม่เขียนทับ (ทอง +777 และผง 5 อยู่ครบ)', g.dust === 5 && g.gold === 50000 - 4 * 30 + 777 - A.X(`itBuyPrice('m_dust')`) * 5 && C.X(`SAVE.wb`) !== g.wb, { g, cwb: C.X(`SAVE.wb`) });
    const rr = C.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:3, kills:5, t:30, runId:'r_mix1', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return r.committed; })()`);
    ok('จบรอบของแท็บกลางรอบ: โหลดสายใหม่แล้วจ่ายรางวัลทับ (ผง 5 ยังอยู่)', rr === true && got().dust === 5, got());
  }
  // no false red toast: wipes / broken main in every event order with idle tabs, a pending debounced change, a restored copy whose text differs
  {
    const flows = {
      'ล้างจากภายนอก ลำดับ AB': (A, B, sh) => { sh.clear(); A.X(`svlOnStorage({key:null})`); B.X(`svlOnStorage({key:null})`); A.X(`svlOnStorage({key:'${K}'})`); B.X(`svlOnStorage({key:'${K}'})`); },
      'ล้างจากภายนอก ลำดับ BA': (A, B, sh) => { sh.clear(); B.X(`svlOnStorage({key:null})`); A.X(`svlOnStorage({key:null})`); B.X(`svlOnStorage({key:'${K}'})`); A.X(`svlOnStorage({key:'${K}'})`); },
      'A ล้างเอง แล้ว B': (A, B, sh) => { sh.clear(); B.X(`svlOnStorage({key:null})`); A.X(`svlOnStorage({key:'${K}'})`); },
      'เซฟหลักเสีย ลำดับ BA': (A, B, sh) => { sh.setItem(K, '{"v":1,"acct":'); B.X(`svlOnStorage({key:'${K}'})`); A.X(`svlOnStorage({key:'${K}'})`); B.X(`svlOnStorage({key:'${K}'})`); },
      'A มีบันทึกค้าง (debounce) แล้วล้าง AB': (A, B, sh) => { A.X(`SAVE.acct.flags.tips.t1=1; saveLocal('tip')`); sh.clear(); A.X(`svlOnStorage({key:null})`); B.X(`svlOnStorage({key:null})`); B.X(`svlOnStorage({key:'${K}'})`); A.X(`saveNow('flush')`); B.X(`svlOnStorage({key:'${K}'})`); },   // the pending write goes out after the restore
      'A มีบันทึกค้าง (debounce) แล้วล้าง BA': (A, B, sh) => { A.X(`SAVE.acct.flags.tips.t1=1; saveLocal('tip')`); sh.clear(); B.X(`svlOnStorage({key:null})`); A.X(`svlOnStorage({key:null})`); A.X(`svlOnStorage({key:'${K}'})`); B.X(`svlOnStorage({key:'${K}'})`); A.X(`saveNow('flush')`); B.X(`svlOnStorage({key:'${K}'})`); },
    };
    const res = {};
    for (const k in flows) {
      const { sh, T: [A, B], got, red } = tabs(2);
      A.X(`buyItem(curChar(),'m_dust',2)`); B.X(`svlOnStorage({key:'${K}'})`);   // in step
      flows[k](A, B, sh);
      const g = got(), tip = /debounce/.test(k) ? JSON.parse(sh.getItem(K)).acct.flags.tips.t1 === 1 : true;
      res[k] = { red: red(A) + red(B), dust: g && g.dust, tip, memA: A.X(`JSON.stringify(SAVE)`) === sh.getItem(K) || A.X(`svlFresh(), JSON.stringify(SAVE)`) === sh.getItem(K) };
    }
    ok('ล้าง / เซฟหลักเสีย ทุกลำดับ (แท็บว่าง · มีบันทึกค้าง): ไม่มีเตือนแดง "บันทึกทับพร้อมกัน" · ผง 2 อยู่ · บันทึกค้างไม่หาย', Object.values(res).every(r => r.red === 0 && r.dust === 2 && r.tip), res);
  }
  // a broken main with only an older tab open and a newer .bak: the older tab loads .bak, it does not write its older copy back
  {
    const { sh, T: [A, M], got } = tabs(2);
    M.X(`G={char:curChar(), over:false}`);                                         // M mid-run, behind from here on
    A.X(`buyItem(curChar(),'m_dust',3); buyItem(curChar(),'m_dust',2)`);         // .bak = dust 3 · main = dust 5 · A then closes
    sh.setItem(K, '{"v":1,"acct":{"gold":'); M.X(`svlOnStorage({key:'${K}'})`);
    const mid = sh.getItem(K);
    const rr = M.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:2, kills:3, t:20, runId:'r_bak1', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return r.committed; })()`);
    const g = got();
    ok('เซฟหลักเสีย เหลือแท็บเก่ากลางรอบ + .bak ใหม่กว่า: ไม่เขียนสำเนาเก่าคืนกลางรอบ · จบรอบโหลด .bak (ผง 3) แล้วจ่ายรางวัลทับ', mid === '{"v":1,"acct":{"gold":' && rr === true && g.dust === 3, { g, rr, mid: mid.slice(0, 20) });
  }
  // an import never pins wc (a hand-edited 9e15): it gets this tab's wc + 1 and a new lineage
  {
    const { T: [A, B], got, red } = tabs(2);
    const ex = JSON.parse(A.X(`exportSave()`)); ex.wc = 9e15; ex.wb = 'w_hand';
    const wc0 = got().wc, imp = A.X(`importSave(${JSON.stringify(JSON.stringify(ex))}).ok`);
    B.X(`svlOnStorage({key:'${K}'})`); B.X(`buyItem(curChar(),'m_dust',1)`); A.X(`svlOnStorage({key:'${K}'})`);
    const g = got();
    ok('นำเข้าไฟล์ที่ wc = 9e15: wc ใหม่ = ของแท็บนี้ + 1 (ไม่ตัน) · wb สายใหม่ · ซื้อต่อในอีกแท็บได้ ไม่มีเตือนแดง', imp === true && g.wc === wc0 + 2 && g.wb !== 'w_hand' && g.dust === 1 && red(A) + red(B) === 0, { imp, g, wc0 });
  }
  // a reward whose write raced: the bag/stash toasts come once (from the attempt that stuck)
  {
    const { T: [A, B] } = tabs(2);
    A.X(`(()=>{ const ch=curChar(); while(itBagFree(ch)>0) invAdd(ch,makeInst('w_sword_1',{}),1); saveNow('full'); })()`); B.X(`svlOnStorage({key:'${K}'})`);   // a really full bag (validated bagMax 80)
    A.X(`G={char:curChar(), over:false}`); B.X(`buyItem(curChar(),'u_potion_s',1)`);
    const n0 = A.notes.length;
    const r = A.X(`(()=>{ const f=svlFresh; svlFresh=()=>false; try{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:3, kills:5, t:30, runId:'r_note1', loot:[{id:'m_dust', n:2}], goldRun:0, player:{hp:0}},false,{commit:true}); return r.committed; } finally{ svlFresh=f; G=null; } })()`);
    const notes = A.notes.slice(n0).map(n => n[0]).filter(x => /เก็บเข้าคลัง|เก็บไม่ได้/.test(x));
    ok('รางวัลที่ต้องจ่ายใหม่เพราะชนกับอีกแท็บ: toast ของที่เข้าคลังขึ้นครั้งเดียว', r === true && notes.length === 1, { r, notes });
  }
}
console.log('m2-orch r4 · เขียนคืนล้มไม่วนทับกัน · แท็บกลางรอบเขียนเซฟล่าสุดที่เห็นคืน · นำเข้าไม่หายหลังล้าง · สถิติคลาสสิกไม่ทำให้เตือนแดง · แดงเฉพาะแท็บที่เขียน');
{
  const K = 'runeguard.save.guest';
  const world = n => {
    let t = 1.9e12; const clk = () => (t += 7); const base = memStorage(), fail = []; let writes = 0;
    const T = [];
    for (let i = 0; i < n; i++) {
      fail.push({ on: false });
      const f = fail[i], ls = { getItem: k => base.getItem(k), removeItem: k => base.removeItem(k), clear: () => base.clear(), key: j => base.key(j), get length() { return base.length; },
        setItem: (k, v) => { if (f.on) throw new Error('QuotaExceededError'); if (k === K) writes++; base.setItem(k, v); } };
      const x = fresh({ localStorage: ls, __clk: clk }); x.X(`Date.now=()=>__clk()`); T.push(x);
    }
    T[0].X(`loadSaveFor(null); createChar('รอบสี่','swordsman'); DEV.profile.gold(50000)`); for (const x of T.slice(1)) x.X(`loadSaveFor(null)`);
    const got = () => { const s = JSON.parse(base.getItem(K) || 'null'); if (!s) return null; const c = s.chars[0], q = id => c.inv.filter(x => x.id === id).reduce((a, x) => a + (x.n | 0), 0);
      return { gold: s.acct.gold, dust: q('m_dust'), pot: q('u_potion_s'), wc: s.wc, wb: s.wb }; };
    const red = x => x.notes.filter(m => m[1] === 'bad' && /บันทึกทับพร้อมกัน/.test(m[0])).length;
    const ev = (...xs) => { for (const x of xs) x.X(`svlOnStorage({key:'${K}'})`); };
    return { base, T, fail, got, red, ev, writes: () => writes };
  };
  // 1c · the mid-run tab has NOT seen the newer writes: it writes its older copy back, the newer tab writes its own over it (stale)
  {
    const W = world(2), [A, B] = W.T;
    B.X(`G={char:curChar(), over:false}`);
    A.X(`buyItem(curChar(),'m_dust',4); buyItem(curChar(),'m_dust',3)`);        // B gets no events
    W.base.clear(); B.X(`svlOnStorage({key:null})`); const mid = W.got(); W.ev(A);
    ok('ลำดับ 1c (แท็บกลางรอบไม่เคยเห็นของใหม่): เขียนสำเนาเก่าคืน → แท็บใหม่กว่าเขียนของตัวเองทับ (ผง 7) · toast "เก่ากว่าทับ"', mid.dust === 0 && W.got().dust === 7 && A.notes.some(m => /เก่ากว่าทับ/.test(m[0])), { mid, now: W.got() });
  }
  // restore write refused (quota) must not leave svlLast on another tab's text: no ping-pong
  {
    const W = world(2), [A, B] = W.T;
    A.X(`buyItem(curChar(),'m_dust',2); buyItem(curChar(),'m_dust',3)`);        // A ahead by 2 writes, B behind
    W.base.clear(); B.X(`svlOnStorage({key:null})`);                           // B writes its older copy back
    W.fail[0].on = true; W.ev(A); W.fail[0].on = false;                         // A's restore is refused
    B.X(`buyItem(curChar(),'u_potion_s',1)`);                                   // B acts on its restored copy
    const w0 = W.writes(); for (let i = 0; i < 20; i++) W.ev(A, B); const dw = W.writes() - w0;
    const g = W.got();
    ok('เขียนคืนถูกปฏิเสธ (โควตา) แล้วอีกแท็บเขียนต่อ: ไม่วนเขียนทับกัน (≤ 2 ครั้งใน 20 รอบ event) · ผง 5 ของแท็บใหม่กว่าอยู่', dw <= 2 && g.dust === 5, { dw, g });
  }
  // a mid-run tab of another lineage writes back the newest text it saw, not its own copy (an M1-build write broke the lineage)
  {
    const W = world(2), [A, C] = W.T;
    const u = A.X(`(()=>{ const it=makeInst('w_sword_2',{}); it.r=7; invAdd(curChar(),it,1); invAdd(curChar(),'m_crystal',5); saveNow('t'); return it.u; })()`);
    W.ev(C); C.X(`G={char:curChar(), over:false}`);                              // C mid-run in the old lineage
    const old = JSON.parse(W.base.getItem(K)); delete old.wc; delete old.wb; delete old.wp; old.app = '2.0.0-m1'; old.acct.gold += 500; W.base.setItem(K, JSON.stringify(old));   // the M1 build writes
    W.ev(A, C);                                                                 // A reloads it (new lineage) · C (mid-run) remembers it
    const rf = A.X(`(()=>{ itRefineRng=()=>.99; try{ return refineTry(curChar(),'${u}',{}).res; } finally{ itRefineRng=null; } })()`);
    A.X(`buyItem(curChar(),'m_dust',3)`); W.ev(C);
    W.base.clear(); W.ev(C, A);                                                  // C handles the wipe first
    const s = JSON.parse(W.base.getItem(K)), w = s.chars[0].inv.find(x => x.u === u), d = s.chars[0].inv.filter(x => x.id === 'm_dust').reduce((a, x) => a + x.n, 0);
    ok('แท็บกลางรอบคนละสายเซฟ: ล้างแล้วเขียนเซฟล่าสุดที่เห็นคืน (ตีบวกที่ล้ม +6 ความเพียร 1 · ผง 3 · ทอง +500 อยู่) · ตีซ้ำจาก +7 ไม่ได้', rf === 'down' && w.r === 6 && (w.f | 0) === 1 && d === 3 && A.X(`itFind(curChar(),'${u}').r`) === 6, { rf, r: w.r, f: w.f, d });
    const rr = C.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:2, kills:4, t:20, runId:'r_seen1', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return r.committed; })()`);
    const s2 = JSON.parse(W.base.getItem(K));
    ok('จบรอบของแท็บนั้น: โหลดเซฟล่าสุดแล้วจ่ายรางวัลทับ (ผลตีบวกยังเป็น +6)', rr === true && s2.chars[0].inv.find(x => x.u === u).r === 6 && s2.acct.runIds.includes('r_seen1'), { rr });
  }
  // an import is newer than the lineage it replaced (wp): a lagging tab that writes the pre-import copy back after a wipe does not win
  {
    const W = world(2), [A, B] = W.T;
    const ex = A.X(`exportSave()`);
    A.X(`buyItem(curChar(),'m_dust',1)`); W.ev(B); A.X(`buyItem(curChar(),'m_dust',1)`);        // B one write behind, then lags
    const imp = A.X(`importSave(${JSON.stringify(ex)}).ok`); A.X(`buyItem(curChar(),'u_potion_s',2)`);
    W.base.clear(); B.X(`svlOnStorage({key:null})`); W.ev(A);                    // B (pre-import lineage) first, then A
    const g = W.got();
    ok('นำเข้าแล้วซื้อต่อ → ล้าง → แท็บที่ยังไม่เห็นการนำเข้าเขียนสำเนาก่อนนำเข้าคืนก่อน: แท็บที่นำเข้าเขียนของตัวเองทับ (เซฟที่นำเข้า + ยา 2 อยู่)', imp === true && g.dust === 0 && g.pot === 5 && A.notes.some(m => /เก่ากว่าทับ/.test(m[0])), { imp, g });
  }
  // classic records merged at load (runeguard.best) do not make a restored copy look like a tie with other content
  {
    const W = world(2), [A, B] = W.T;
    A.X(`buyItem(curChar(),'m_dust',1)`); W.ev(B);
    W.base.setItem('runeguard.best', JSON.stringify({ swordsman: { score: 98765, wave: 14, kills: 900, won: false } }));
    B.X(`loadSaveFor(null)`);                                                    // B merges the record in memory only
    W.base.removeItem(K); B.X(`svlOnStorage({key:'${K}'})`); W.ev(A);
    ok('สถิติคลาสสิกที่รวมตอนโหลด: เขียนคืนแล้วอีกแท็บไม่เตือนแดง · รับสถิตินั้นเข้าเซฟของตัวเอง', W.red(A) === 0 && W.red(B) === 0 && A.X(`(SAVE.acct.records.classic.swordsman||{}).score`) === 98765 && W.got().dust === 1, { a: A.notes.slice(-2), score: A.X(`(SAVE.acct.records.classic.swordsman||{}).score`) });
  }
  // a broken main while only an older mid-run tab is open, which HAS seen the newest write: that write goes back (newer than .bak)
  {
    const W = world(2), [A, M] = W.T;
    M.X(`G={char:curChar(), over:false}`);
    A.X(`buyItem(curChar(),'m_dust',3); buyItem(curChar(),'m_dust',2)`); W.ev(M);   // .bak = dust 3 · main = dust 5 · M saw it · A closes
    W.base.setItem(K, '{"v":1,"acct":{"gold":'); W.ev(M);
    const mid = W.got();
    const rr = M.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:2, kills:3, t:20, runId:'r_seen2', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return r.committed; })()`);
    ok('เซฟหลักเสีย เหลือแท็บกลางรอบที่เคยเห็นการเขียนล่าสุด: เขียนอันล่าสุดนั้นคืนทันที (ผง 5 ใหม่กว่า .bak) · จบรอบจ่ายรางวัลทับ', mid && mid.dust === 5 && rr === true && W.got().dust === 5, { mid, rr });
  }
  // the red toast goes to the tab whose own write was overwritten, not to a tab that only read that copy
  {
    const W = world(3), [A, B, C] = W.T;
    const tk = W.base.getItem(K);
    A.X(`buyItem(curChar(),'m_dust',1)`); W.ev(B);                             // A wrote k+1 · B read it · C still at k
    const ta = W.base.getItem(K); W.base.setItem(K, tk);                          // C's stale cache…
    C.X(`buyItem(curChar(),'u_potion_s',1)`);                                   // …C writes k+1 on base k
    W.ev(A, B);
    ok('บันทึกทับพร้อมกัน: เตือนแดงในแท็บที่เขียน wc นั้นเอง (A) · แท็บที่แค่อ่าน (B) ได้แค่แจ้งโหลดใหม่', ta !== tk && W.red(A) === 1 && W.red(B) === 0, { a: W.red(A), b: W.red(B) });
  }
}
console.log('m2-orch r5 · นำเข้าเซฟว่างไม่วนเขียนทับ · สถิติคลาสสิกไม่หายในทาง svlWrite · นำเข้าไม่ล้มกับ wp เสีย · svlSeen ไม่ถอยหลัง');
{
  const K = 'runeguard.save.guest';
  const two = () => {
    let t = 1.9e12; const clk = () => (t += 7); const base = memStorage(); let writes = 0;
    const ls = { getItem: k => base.getItem(k), removeItem: k => base.removeItem(k), clear: () => base.clear(), key: j => base.key(j), get length() { return base.length; },
      setItem: (k, v) => { if (k === K) writes++; base.setItem(k, v); } };
    const mk = () => { const x = fresh({ localStorage: ls, __clk: clk }); x.X(`Date.now=()=>__clk()`); return x; };
    const A = mk(), B = mk();
    A.X(`loadSaveFor(null); createChar('ของจริง','swordsman'); DEV.profile.gold(50000); buyItem(curChar(),'m_dust',3)`); B.X(`loadSaveFor(null)`);
    return { base, A, B, writes: () => writes, ev: (...xs) => { for (const x of xs) x.X(`svlOnStorage({key:'${K}'})`); } };
  };
  // an export from a fresh device (no progress, another sid) imported while another tab holds progress: the import is meant, no fight
  for (const [label, setup, mid] of [['เซฟว่าง', `(()=>{ loadSaveFor(null); return exportSave(); })()`, false],
                                     ['ตัวใหม่ Lv1 ทอง 0', `(()=>{ loadSaveFor(null); createChar('มือใหม่','mage'); return exportSave(); })()`, false],
                                     ['ตัวใหม่ Lv1 · อีกแท็บกลางรอบ', `(()=>{ loadSaveFor(null); createChar('มือใหม่','mage'); return exportSave(); })()`, true]]) {
    const W = two(); const other = fresh(); const triv = other.X(setup);
    if (mid) W.B.X(`G={char:curChar(), over:false}`);
    const imp = W.A.X(`importSave(${JSON.stringify(triv)}).ok`);
    const w0 = W.writes(); for (let i = 0; i < 20; i++) W.ev(W.B, W.A); const dw = W.writes() - w0;
    const s = JSON.parse(W.base.getItem(K));
    ok('นำเข้าเซฟที่ยังไม่มีความคืบหน้า (' + label + ') ตอนอีกแท็บมีของ: ไม่วนเขียนทับ (≤ 2 ครั้งใน 20 รอบ) · เซฟที่นำเข้าอยู่ (ทอง 0)', imp === true && dw <= 2 && s.acct.gold === 0, { imp, dw, gold: s.acct.gold });
  }
  // a 'same' copy met inside svlWrite (a debounced write fires before the storage event): its classic records are kept
  {
    const W = two();
    W.base.setItem('runeguard.best', JSON.stringify({ swordsman: { score: 99999, wave: 12, kills: 300, won: false } }));
    W.B.X(`loadSaveFor(null)`);                                                   // B merged the record in memory only
    W.A.X(`DEV.profile.give('m_crystal',1)`);                                     // A: a debounced write pending
    W.base.removeItem(K); W.base.removeItem('runeguard.best');                     // site data cleared (records too)
    W.ev(W.B);                                                                     // B writes its copy back (with the record)
    W.A.X(`saveNow('flush')`);                                                    // A's write meets B's copy first
    const s = JSON.parse(W.base.getItem(K));
    ok('สำเนาเดียวกันที่เจอในทางเขียน (svlWrite): สถิติคลาสสิกของอีกแท็บไม่หาย · ของที่ค้างของแท็บนี้ลงด้วย', (s.acct.records.classic.swordsman || {}).score === 99999 && s.chars[0].inv.some(x => x.id === 'm_crystal'), s.acct.records.classic);
  }
  // a stored copy with a broken wp list (hand-edited) does not break importSave
  {
    const W = two(); const ex = W.A.X(`exportSave()`);
    const st = JSON.parse(W.base.getItem(K)); st.wp = [null, { wb: 'w_abc', wc: 'nope' }, { wb: 'w_ok1', wc: 1e300 }]; W.base.setItem(K, JSON.stringify(st)); W.ev(W.A);
    let r; try { r = W.A.X(`importSave(${JSON.stringify(ex)})`); } catch (e) { r = { threw: e.message }; }
    const wp = JSON.parse(W.base.getItem(K)).wp;
    ok('นำเข้าตอนเซฟในเครื่องมี wp เสีย: ไม่ล้ม · เก็บเฉพาะรายการที่ถูกรูปแบบ (wc จำกัดที่เพดาน)', r && r.ok === true && Array.isArray(wp) && wp.every(p => typeof p.wb === 'string' && Number.isInteger(p.wc) && p.wc <= 9e15), { r, wp });
  }
  // mid-run: an older copy of the save svlSeen holds (a lagging tab put it back) does not replace svlSeen
  {
    const W = two();
    W.B.X(`G={char:curChar(), over:false}`);
    const old = W.base.getItem(K);
    W.A.X(`buyItem(curChar(),'m_dust',4)`); W.ev(W.B);                             // B mid-run sees the newer text
    const newer = W.base.getItem(K);
    W.base.setItem(K, old); W.ev(W.B);                                              // an older copy shows up (lagging tab)
    ok('กลางรอบ: สำเนาที่เก่ากว่าของสายเดียวกันไม่แทนที่เซฟล่าสุดที่จำไว้ (svlSeen) · เขียนอันล่าสุดคืน', W.base.getItem(K) === newer && W.B.X(`svlSeen`) === newer, { stored: JSON.parse(W.base.getItem(K)).wc, seenWc: JSON.parse(W.B.X(`svlSeen`) || '{}').wc });
  }
}
console.log('m2-orch r6 · ที่เก็บเต็มตอนถือเซฟล่าสุดที่เห็น (svlSeen): จบรอบไม่ค้าง · คีย์ว่างแล้วเขียนไม่ผ่านไม่ได้เซฟว่าง · คำสั่งแรกหลังเขียนคืนสำเร็จ');
{
  const K = 'runeguard.save.guest';
  const tabs = () => {
    let t = 1.9e12; const clk = () => (t += 7); const base = memStorage(), fail = [{ on: false }, { on: false }];
    const T = fail.map(f => { const ls = { getItem: k => base.getItem(k), removeItem: k => base.removeItem(k), clear: () => base.clear(), key: j => base.key(j), get length() { return base.length; },
      setItem: (k, v) => { if (f.on) throw new Error('QuotaExceededError'); base.setItem(k, v); } };
      const x = fresh({ localStorage: ls, __clk: clk }); x.X(`Date.now=()=>__clk()`); return x; });
    T[0].X(`loadSaveFor(null); createChar('เต็ม','swordsman'); DEV.profile.gold(50000)`); T[1].X(`loadSaveFor(null)`);
    const got = () => { const s = JSON.parse(base.getItem(K) || 'null'); if (!s) return null; const c = s.chars[0]; return { gold: s.acct.gold, chars: s.chars.length, dust: c ? c.inv.filter(x => x.id === 'm_dust').reduce((a, x) => a + x.n, 0) : -1, runIds: s.acct.runIds }; };
    return { base, T, fail, got, ev: x => x.X(`svlOnStorage({key:'${K}'})`) };
  };
  const endRun = (x, id) => x.X(`(()=>{ try{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:2, kills:3, t:20, runId:'${id}', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return r.committed; }catch(e){ G=null; return 'THREW '+e.message; } })()`);
  // storage back to C's own older text while C (mid-run) holds B's newer one, and C's writes keep failing: no endless recursion at run end
  {
    const W = tabs(), [B, C] = W.T;
    C.X(`G={char:curChar(), over:false}`); const t1 = W.base.getItem(K);
    B.X(`buyItem(curChar(),'m_dust',2)`); W.ev(C);                                 // C remembers B's text
    W.fail[1].on = true; W.base.setItem(K, t1); W.ev(C);                             // a lagging tab put C's own text back · C cannot write
    const r = endRun(C, 'r_q1');
    ok('จบรอบตอนที่เก็บปฏิเสธการเขียนคืน (ถือเซฟล่าสุดที่เห็นไว้): ไม่ล้ม ไม่วนเรียกตัวเอง', r !== undefined && !/THREW/.test(String(r)), r);
  }
  // the key is gone, C (mid-run) holds B's newer text, B closed, C's write fails: C keeps its memory and that text, puts it back later
  {
    const W = tabs(), [B, C] = W.T;
    C.X(`G={char:curChar(), over:false}`);
    B.X(`buyItem(curChar(),'m_dust',1)`); W.ev(C);                                 // C remembers B's text · B then closes
    W.base.clear();
    W.fail[1].on = true; C.X(`saveNow('potion')`); W.fail[1].on = false;          // C writes into the empty key and storage refuses
    const mem = C.X(`({chars:SAVE.chars.length, gold:SAVE.acct.gold, seen:!!svlSeen})`);
    W.ev(C); const rr = endRun(C, 'r_q2'); const g = W.got();
    ok('คีย์ว่างแล้วเขียนไม่ผ่าน: ไม่โหลดเซฟว่างมาแทน (ยังถือตัวละครและเซฟล่าสุดที่เห็น) · event ถัดไปเขียนคืน · จบรอบได้ทั้งผงของอีกแท็บและรางวัล', mem.chars === 1 && mem.gold > 0 && mem.seen && rr === true && g.dust === 1 && g.runIds.includes('r_q2'), { mem, rr, g });
  }
  // an idle tab that still holds svlSeen (a run left without onRunEnd) and meets the wipe first through an action: the action works at once
  {
    const W = tabs(), [B, C] = W.T;
    C.X(`G={char:curChar(), over:false}`); B.X(`buyItem(curChar(),'m_dust',3)`); W.ev(C); C.X(`G=null`);   // run quit without onRunEnd
    W.base.clear();
    const r = C.X(`buyItem(curChar(),'u_potion_s',1)`); const g = W.got();
    ok('แท็บที่ยังถือเซฟล่าสุดที่เห็น เจอการล้างผ่านคำสั่งซื้อ: เขียนเซฟนั้นคืนแล้วซื้อได้ทันที (ไม่ต้องกดซ้ำ) · ผงของอีกแท็บอยู่', r === '' && g.dust === 3, { r, g });
  }
}
console.log('m2-orch r7 · เซฟหลักเสียตอนแท็บกลางรอบบันทึก ใช้เซฟล่าสุดที่จำไว้ · เตือนแดงเมื่อโหลดเซฟที่จำไว้แล้วการบันทึกของตัวเองถูกทับ');
{
  const K = 'runeguard.save.guest';
  const pair = () => {
    let t = 1.9e12; const clk = () => (t += 7); const base = memStorage(), stale = { on: false, text: null };
    const mk = isB => { const ls = { getItem: k => (isB && stale.on && k === K ? stale.text : base.getItem(k)), removeItem: k => base.removeItem(k), clear: () => base.clear(), key: j => base.key(j), get length() { return base.length; }, setItem: (k, v) => base.setItem(k, v) };
      const x = fresh({ localStorage: ls, __clk: clk }); x.X(`Date.now=()=>__clk()`); return x; };
    const A = mk(false), B = mk(true);
    A.X(`loadSaveFor(null); createChar('ซีน','swordsman'); DEV.profile.gold(50000)`); B.X(`loadSaveFor(null)`);
    const pots = id => { const s = JSON.parse(base.getItem(K) || 'null'); return s && s.chars ? s.chars[0].inv.filter(i => i.id === id).reduce((a, i) => a + (i.n | 0), 0) : null; };
    return { base, A, B, stale, pots, ev: (...xs) => { for (const x of xs) x.X(`svlOnStorage({key:'${K}'})`); } };
  };
  // A mid-run holds B's newer text (svlSeen); the main key breaks and A writes before it handles that event
  {
    const W = pair(), { A, B } = W;
    A.X(`G={char:curChar(), over:false}`);
    B.X(`buyItem(curChar(),'u_potion_l',2)`); W.ev(A);                            // A remembers B's purchase
    W.base.setItem(K, '{"v":1,"acct":');                                            // broken · A has not handled it
    A.X(`itSortBag(curChar(),'tier')`);                                            // A writes mid-run
    const mid = W.pots('u_potion_l'); W.ev(B, A, B, A);
    ok('เซฟหลักเสีย แล้วแท็บกลางรอบบันทึกก่อนรู้ตัว: เขียนเซฟล่าสุดที่จำไว้คืน ไม่ใช่สำเนาเก่าของตัวเอง (ยา 2 ขวดที่อีกแท็บซื้ออยู่) · ไม่มีเตือนแดง', mid === 2 && W.pots('u_potion_l') === 2 && !B.notes.some(m => m[1] === 'bad'), { mid, fin: W.pots('u_potion_l'), b: B.notes.slice(-2) });
  }
  // C (= A here) wrote a potion mid-run; B, reading a stale cache, wrote another copy at the same wc; A holds it as svlSeen; wipe; run end
  {
    const W = pair(), { A, B } = W;
    const t3 = W.base.getItem(K);
    A.X(`G={char:curChar(), over:false}; invRemove(G.char,'u_potion_s',1); saveNow('potion')`);     // A's own write (wc k+1)
    W.stale.on = true; W.stale.text = t3; B.X(`buyItem(curChar(),'m_dust',1)`); W.stale.on = false;   // B writes k+1 on base k
    W.ev(A);                                                                          // A (mid-run) remembers B's copy
    W.base.clear();                                                                   // wiped before the run ends · event not handled
    const e = A.X(`(()=>{ const r=onRunEnd({char:G.char, modeId:'survival', tier:0, wave:3, kills:5, t:30, runId:'r_t7', loot:[], goldRun:0, player:{hp:0}},false,{commit:true}); G=null; return r&&r.committed; })()`);
    ok('โหลดเซฟที่จำไว้ (ของอีกแท็บที่เขียนทับบนฐานเดียวกัน) ตอนจบรอบ: เตือนแดงว่าการบันทึกล่าสุดของแท็บนี้อาจหาย', e === true && A.notes.some(m => m[1] === 'bad' && /บันทึกทับพร้อมกัน/.test(m[0])), A.notes.slice(-3));
  }
}
console.log('carry-over (c) · id ที่เป็นชื่อสมาชิก Object.prototype ถูกปฏิเสธ');
{
  const { X } = fresh();
  const c = X(`[svStr('constructor',SV_ID,null), svStr('valueof',SV_ID,null), svStr('__proto__',/.*/,null), svStr('toString',/^[A-Za-z]+$/,null),
    svStr('hasOwnProperty',/^[A-Za-z]+$/,null), svStr('isPrototypeOf',/^[A-Za-z]+$/,null), svStr('toLocaleString',/^[A-Za-z]+$/,null), svStr('w_sword_1',SV_ID,null)]`);
  ok('svStr: constructor / __proto__ / toString / hasOwnProperty / isPrototypeOf / toLocaleString → ค่าเริ่มต้น · ชื่อปกติผ่าน', deq(c, [null, 'valueof', null, null, null, null, null, 'w_sword_1']), c);
  const z = X(`(()=>{ const c=validateSave({v:1, acct:{records:{boss:{constructor:{0:{sec:5}}}}, fboss:{constructor:{next:1}}}, chars:[{cls:'thief', zone:'constructor', quick:['constructor',null], inv:[{id:'constructor', n:2}]}]}); return {zone:c.chars[0].zone, q:c.chars[0].quick, inv:c.chars[0].inv.length, rb:Object.keys(c.acct.records.boss), fb:Object.keys(c.acct.fboss)}; })()`);
  ok('validateSave: zone / quick / item id "constructor" ไม่ถูกเก็บ', z.zone === 'z1' && deq(z.q, [null, null]) && z.inv === 0 && z.rb.length === 0 && z.fb.length === 0, z);
}

console.log('carry-over (d) · แท็บที่ค้าง: ทุกคำสั่งโหลดของอีกแท็บก่อนแก้ แล้วการกระทำไม่หาย');
{
  const shared = memStorage(), K = 'runeguard.save.guest';
  const A = fresh({ localStorage: shared }), B = fresh({ localStorage: shared });
  A.X(`(()=>{ loadSaveFor(null); const ch=createChar('แท็บค้าง','swordsman'); ch.lv=25; ch.pts=BAL.ptsAt(25); ch.jlv=20; ch.sp=19; ch.trial.t2=1; SAVE.acct.gold=1000; saveNow('setup'); globalThis.held=ch; })()`);
  let g = 1000;
  const step = code => { g += 1; B.X(`loadSaveFor(null); DEV.profile.gold(${g})`);    // the other tab saves → tab A is stale
    const res = A.X(`(()=>{ const r=${code}; saveNow('flush'); return r; })()`); return { res, m: JSON.parse(shared.getItem(K)) }; };
  const ch0 = m => m.chars[0];
  const s1 = step(`commitStats(held,{STR:2})`);
  ok('commitStats (ตัวละคร object เดิม): โหลดของอีกแท็บก่อน · ค่าที่แจกลงเซฟ · ทองของอีกแท็บไม่หาย', s1.res === true && ch0(s1.m).st.STR === 2 && s1.m.acct.gold === g, { res: s1.res, st: ch0(s1.m).st, gold: s1.m.acct.gold });
  const s2 = step(`learnSkill(held,'slam')`);
  ok('learnSkill (object ที่ค้างจากการโหลดก่อนหน้า → ตามด้วย id)', s2.res === true && ch0(s2.m).sk.slam === 1 && s2.m.acct.gold === g && ch0(s2.m).st.STR === 2, ch0(s2.m).sk);
  const s3 = step(`learnPassive(held,'p_heavyarms')`);
  ok('learnPassive', s3.res === true && ch0(s3.m).pas.p_heavyarms === 1 && s3.m.acct.gold === g, ch0(s3.m).pas);
  const s4 = step(`setLoadout(held,['slam','slash'])`);
  ok('setLoadout', s4.res === true && deq(ch0(s4.m).load, ['slam', 'slash']) && s4.m.acct.gold === g, ch0(s4.m).load);
  const s5 = step(`resetStats(held,{})`);
  ok('resetStats', s5.res === true && ch0(s5.m).st.STR === 0 && ch0(s5.m).resets.free === 0 && s5.m.acct.gold === g, ch0(s5.m).st);
  const s6 = step(`resetSkills(held,{})`);
  ok('resetSkills', s6.res === true && deq(ch0(s6.m).sk, { slash: 1 }) && deq(ch0(s6.m).pas, {}) && s6.m.acct.gold === g, ch0(s6.m).sk);
  const s7 = step(`advanceJob(held,'knight')`);
  ok('advanceJob: เลื่อนอาชีพลงเซฟ · หักค่าพิธีจากทองล่าสุดของอีกแท็บ', s7.res === true && ch0(s7.m).job === 'knight' && s7.m.acct.gold === g - 500, { job: ch0(s7.m).job, gold: s7.m.acct.gold, g });
  const s8 = step(`grantRewards(held,{runId:'r_stale1', baseXp:10, jobXp:8, gold:7, mode:'survival', tier:0, items:[{id:'m_dust',n:2}], st:{t:1, kills:1, wave:1}})`);
  ok('grantRewards: รางวัลและของลงบนข้อมูลล่าสุดของอีกแท็บ', s8.res === true && s8.m.acct.runIds.includes('r_stale1') && s8.m.acct.gold === g + 7 && ch0(s8.m).inv.some(x => x.id === 'm_dust' && x.n === 2), s8.m.acct);
  B.X(`loadSaveFor(null); deleteChar(SAVE.chars[0].id)`);
  const before = shared.getItem(K);
  const del = A.X(`[commitStats(held,{VIT:1}), learnSkill(held,'slash'), setLoadout(held,['slash']), advanceJob(held,'berserker'), resetStats(held,{}), grantRewards(held,{runId:'r_gone', gold:5})]`);
  ok('อีกแท็บลบตัวละครแล้ว: ทุกคำสั่งถูกปฏิเสธ (แม้ส่ง object เก่าที่ค้างอยู่) · ไม่เขียนเซฟ', deq(del, [false, false, false, false, false, false]) && shared.getItem(K) === before, del);
}

console.log('carry-over (e) · RG.profile.sandbox(true) เขียนเซฟที่รอ debounce ก่อน ไม่ทิ้ง');
{
  const { X, ls } = fresh();
  X(`loadSaveFor(null); createChar('ก่อนแซนด์บ็อกซ์','cleric'); SAVE.acct.flags.tips.pending=1; saveLocal('pending'); DEV.profile.sandbox(true);`);
  const now = JSON.parse(ls.getItem('runeguard.save.guest')).acct.flags.tips.pending;
  await new Promise(res => setTimeout(res, 900));
  const back = X(`(()=>{ DEV.profile.sandbox(false); return SAVE.acct.flags.tips.pending; })()`);
  ok('sandbox(true): การแก้ที่รอ 800 ms ถูกเขียนลงเครื่องทันที · กลับจาก sandbox แล้วยังอยู่', now === 1 && back === 1, { now, back });
}

console.log('M2 fix · validateSave ตัดชิ้นที่ซ้ำทั้ง uid และ id (ไม่กลายเป็นของเพิ่ม) · pgCommitItems ไม่ข้ามของแบบเงียบ ๆ');
{
  const { X } = fresh();
  const v = X(`(()=>{ const w={u:'i_twin1', id:'w_sword_2', r:3, f:0, s:[null], lk:0}, h={u:'i_twin2', id:'h_iron', r:0, f:0, s:[null], lk:0};
    const s={v:1, acct:{stash:[Object.assign({},w,{r:5}), {u:'i_twin2', id:'b_leather', r:0, f:0, s:[], lk:0}]}, chars:[
      {id:'c_aa', cls:'swordsman', name:'ซ้ำกัน', lv:20, inv:[w, Object.assign({},w), h], eq:{weapon:'i_twin1'}},
      {id:'c_bb', cls:'mage', name:'อีกตัว', inv:[Object.assign({},w,{r:9}), Object.assign({},h,{id:'h_straw'})], eq:{}}]};
    const o=validateSave(s), all=[...o.chars.flatMap(c=>c.inv), ...o.acct.stash].filter(x=>x.u);
    return {n:all.length, ids:all.map(x=>x.id).sort().join(), uniq:new Set(all.map(x=>x.u)).size, sword:all.filter(x=>x.id==='w_sword_2').map(x=>x.r+':'+x.u),
      worn:o.chars[0].eq.weapon, again:JSON.stringify(validateSave(o))===JSON.stringify(o)}; })()`);
  ok('ดาบ uid เดียวกัน 4 ก้อน (กระเป๋า ×2 · อีกตัว · คลัง) → เหลือชิ้นแรกชิ้นเดียว (+3 ที่สวมอยู่) · uid ซ้ำแต่ id ต่างกัน (หมวกฟาง · เกราะหนัง) ได้ uid ใหม่และอยู่ครบ · validate ซ้ำได้ผลเดิม',
    v.n === 4 && v.ids === 'b_leather,h_iron,h_straw,w_sword_2' && v.uniq === 4 && deq(v.sword, ['3:i_twin1']) && v.worn === 'i_twin1' && v.again, v);
  const c = X(`(()=>{ loadSaveFor(null); const ch=createChar('รับของ','thief'), held=ch.inv[0];
    const r={runId:'r_fixlost1', baseXp:0, jobXp:0, gold:0, mode:'survival', tier:0, st:{t:1, kills:0, wave:1},
      items:[{u:held.u, id:held.id, r:0, f:0, s:[], lk:0}, {u:'i_stackish', id:'m_dust', n:3}, {u:'i_newgear1', id:'h_straw', r:0, f:0, s:[], lk:0}]};
    const okk=grantRewards(ch,r), c2=SAVE.chars[0];
    return {ok:okk, lost:r.lost.map(x=>x.u||x.id), dust:invCount(c2,'m_dust'), straw:invCount(c2,'h_straw'), same:c2.inv.filter(x=>x.u===held.u).length,
      stack:c2.inv.filter(x=>x.id==='m_dust').every(x=>typeof x.u!=='string')}; })()`);
  ok('ของรางวัลที่ uid มีอยู่แล้วในเซฟ → ลง r.lost (จอสรุป/toast บอก) ไม่ข้ามเงียบและไม่ซ้ำ · ของซ้อน (ผงรูน) ที่ติด u มาเข้ากระเป๋าเป็นของซ้อน ×3',
    c.ok === true && c.lost.length === 1 && c.same === 1 && c.dust === 3 && c.stack && c.straw === 1, c);
}

// ================================================================================================
// v2: account upgrades (acct.up · BAL.UP · buyUpgrade) and survival loot boxes (BAL.BOX)
// ================================================================================================
console.log('อัปเกรดถาวร (acct.up) · เซฟ v2');
{
  const { X } = fresh();
  const u = X(`(()=>{ loadSaveFor(null); const ch=createChar('อัป','swordsman'); const A=SAVE.acct, o={};
    o.poor=buyUpgrade('xp'); o.poorUp=JSON.stringify(A.up); A.gold=10000; saveNow('t');
    o.bad=[buyUpgrade('nope'), buyUpgrade('__proto__'), buyUpgrade('constructor')]; o.badUp=JSON.stringify(SAVE.acct.up);
    o.ok1=buyUpgrade('xp'); o.g1=SAVE.acct.gold; o.lv1=SAVE.acct.up.xp; o.stored=JSON.parse(localStorage.getItem('runeguard.save.guest')).acct.up.xp;
    SAVE.acct.gold=1e7; let n=0; while(buyUpgrade('dmg')===''&&n<20) n++; o.dmgN=n; o.dmgLv=SAVE.acct.up.dmg; o.full=buyUpgrade('dmg');
    o.spent=1e7-SAVE.acct.gold; o.sum=0; for(let l=0;l<BAL.UP.max;l++) o.sum+=BAL.UP.cost(l);
    o.c=[BAL.UP.cost(0),BAL.UP.cost(1),BAL.UP.cost(9)];
    G={char:ch, over:false}; o.inRun=buyUpgrade('mag'); G=null;
    return o; })()`);
  ok('ทองไม่พอ → ไม่ซื้อ ไม่เปลี่ยน · หัวข้อที่ไม่มี (รวม __proto__/constructor) → ปฏิเสธ', /ทองไม่พอ/.test(u.poor) && u.poorUp === '{}' && u.bad.every(x => x === 'ไม่มีหัวข้อนี้') && u.badUp === '{}', u);
  ok('ซื้อ 1 ขั้น: หักทอง 500 · ขั้น 1 · เขียนลงเครื่องทันที', u.ok1 === '' && u.g1 === 9500 && u.lv1 === 1 && u.stored === 1, u);
  ok('ซื้อจนเต็ม 10 ขั้นแล้วหยุด · ราคารวมตรงสูตร · ขั้นที่ 11 = เต็มแล้ว', u.dmgN === 10 && u.dmgLv === 10 && u.full === 'อัปเกรดเต็มแล้ว' && u.spent === u.sum, u);
  ok('ราคา: 500 · 750 · … ขั้นสุดท้าย 19,220', deq(u.c, [500, 750, 19220]), u.c);
  ok('ระหว่างอยู่ในรอบซื้อไม่ได้', u.inRun === 'อัปเกรดได้ที่ป้อมเท่านั้น', u.inRun);
  const b = X(`(()=>{ loadSaveFor(null); const ch=createChar('โบนัส','swordsman'); SAVE.acct.up={}; const base=buildRunBonus(ch), before=JSON.stringify(base);
    SAVE.acct.up={xp:2, mag:5, dmg:4, drop:1, hp:10, gold:5}; const after=buildRunBonus(ch);
    const G0={char:ch, modeId:'survival', tier:0, wave:20, kills:10, t:60, runId:'r_upg1', loot:[], goldRun:40, player:{hp:10}};
    const r=onRunEnd(G0,true,{commit:false}); SAVE.acct.up={}; const r0=onRunEnd(Object.assign({},G0,{runId:'r_upg2'}),true,{commit:false});
    return {before, base, after, hp:CLS.swordsman.hp, g:r.gold, g0:r0.gold, fresh:JSON.stringify(upBonus())}; })()`);
  ok('ไม่มีอัปเกรด → upBonus ว่าง · ไม่มีคีย์ xp/magnet/drop เพิ่ม', b.fresh === '{}' && b.base.xp === undefined && b.base.magnet === undefined && b.base.drop === undefined, b);
  ok('โบนัสรอบ: EXP +6% · ดูดของ ×1.2 (+2.5 ม.) · ดาเมจ +6% · ดรอป +1% · HP +20% ของ HP อาชีพ+อุปกรณ์', Math.abs(b.after.xp - .06) < 1e-9 && Math.abs(b.after.magnet - 1.2) < 1e-9 &&
    Math.abs(b.after.might - ((b.base.might || 0) + .06)) < 1e-9 && Math.abs(b.after.drop - .01) < 1e-9 && b.after.hp === (b.base.hp || 0) + Math.round(.2 * (b.hp + (b.base.hp || 0))), b);
  ok('ทองจบรอบ ×1.05 เมื่ออัปเกรดทอง 5 ขั้น (+1% ต่อขั้น)', b.g === Math.round(b.g0 * 1.05) && b.g0 > 0, b);
  const v = X(`(()=>{ const a=validateSave(JSON.parse('{"v":2,"acct":{"up":{"xp":99,"mag":-3,"gold":"4","hp":2.7,"nope":5,"__proto__":{"xp":1}}},"chars":[]}')).acct.up;
    const m=migrateSave({v:1, acct:{gold:50}, chars:[]}); const n=newSave(null), one=validateSave({v:2,acct:{up:{dmg:3}},chars:[]});
    return {a, mv:m.v, mup:m.acct.up, mg:m.acct.gold, nv:n.v, nup:n.acct.up, again:JSON.stringify(validateSave(one))===JSON.stringify(one)}; })()`);
  ok('validateSave: ขั้นถูกบีบ 0–10 · ทศนิยมปัดลง · ชื่อหัวข้ออนาคต (a–z) เก็บไว้ · __proto__ ทิ้ง · idempotent', deq(v.a, { xp: 10, gold: 4, hp: 2, nope: 5 }) && v.again, v);
  ok('เซฟ v1 → ย้ายเป็น v3 (ทองไม่หาย · up ว่าง) · เซฟใหม่ = v3 + up ว่าง', v.mv === 7 && v.mg === 50 && deq(v.mup, {}) && v.nv === 7 && deq(v.nup, {}), v);
}
{
  const { X, ls } = fresh();
  const t = X(`(()=>{ const s=newSave(null), a=isTrivialSave(s); s.acct.up={xp:3}; const b=isTrivialSave(s); s.acct.up={xp:0}; return [a, b, isTrivialSave(s)]; })()`);
  ok('isTrivialSave: เซฟที่มีแค่อัปเกรดที่ซื้อแล้ว = ไม่ใช่เซฟว่าง (tester ข้อ 2)', deq(t, [true, false, true]), t);
  X(`loadSaveFor(null); createChar('อ่าน','mage'); SAVE.acct.gold=5000; saveNow('t')`);
  const st = JSON.parse(ls.getItem('runeguard.save.guest')); st.v = 99; ls.setItem('runeguard.save.guest', JSON.stringify(st));
  const ro = X(`(()=>{ const r=buyUpgrade('xp'); return {r, ro:!!SAVE.ro, up:JSON.stringify(SAVE.acct.up), gold:SAVE.acct.gold}; })()`);
  ok('อีกแท็บเป็นแอปใหม่กว่า (v99): svlFresh โหลดเป็นอ่านอย่างเดียว → ซื้อไม่ได้ · ไม่หักทอง (tester ข้อ 1)', ro.r === 'เซฟนี้อ่านอย่างเดียว' && ro.ro && ro.up === '{}' && ro.gold === 5000, ro);
}
console.log('กล่องสุ่มเอาชีวิตรอด (BAL.BOX)');
{
  const { X } = fresh({ addText() {}, burst() {}, sfx() {} });
  const r = X(`(()=>{ const o={}; P={x:0, y:0, drop:0}; G={tier:0, goldRun:0, loot:[], gems:[], t:0};
    globalThis.ltGem=(x,y,kind,q)=>{ const g=Object.assign({x,y,kind,dead:false},q); G.gems.push(g); return g; };
    const W=BAL.BOX.w, keep=Object.assign({},W), only=k=>{ for(const q in W) W[q]=0; W[k]=1; BAL.BOX.gearPerT=0; };
    only('gold'); svBoxOpen({x:0,y:0}); o.gold=G.goldRun; G.goldRun=0; svBoxOpen({x:0,y:0,small:true}); o.goldS=G.goldRun;
    only('potion'); svBoxOpen({}); G.tier=4; svBoxOpen({}); o.pot=G.loot.map(x=>x.id); G.loot.length=0; G.tier=0;
    only('dust'); svBoxOpen({}); o.dust=G.loot[0]; G.loot.length=0;
    only('gear'); svBoxOpen({}); o.gear=G.loot.map(x=>x.id+':'+(typeof x.u)); G.loot.length=0;
    Object.assign(W,keep); BAL.BOX.gearPerT=1.5;
    G.boxT=null; svBoxTick(0); const t0=G.boxT; svBoxTick(t0+.01); o.t0=t0; o.n1=G.gems.length;
    const g=G.gems[0]; o.d=g?Math.hypot(g.x,g.y):0; o.small=g&&g.small;
    for(let i=0;i<6;i++){ G.boxT=0; svBoxTick(.01); } o.cap=G.gems.length;
    G=null; P=null; return o; })()`);
  ok('ทอง: goldPerWave(T) × 2–4 · กล่องเล็กครึ่งหนึ่ง', r.gold >= 30 && r.gold <= 60 && r.goldS >= 15 && r.goldS <= 30, r);
  ok('ยา: T<4 ยาเล็ก · T≥4 ยาใหญ่ · ผงรูน 1–2 · อุปกรณ์จริงเข้า G.loot (มี uid)', deq(r.pot, ['u_potion_s', 'u_potion_l']) && r.dust.id === 'm_dust' && r.dust.n >= 1 && r.dust.n <= 2 && r.gear.length === 1 && /:string$/.test(r.gear[0]), r);
  ok('ตัวจับเวลา 45–60 วิ → กล่องเกิดห่าง 380–600 · ไม่เกิน 3 กล่องบนพื้น', r.t0 >= 45 && r.t0 <= 60 && r.n1 === 1 && r.d >= 380 && r.d <= 600 && r.small === false && r.cap === 3, r);
}

console.log('การ์ดค่าสถานะ = ความชำนาญ (26 + 26a · docs/PROPOSAL-mastery.md)');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={}, F=['maxHp','regen','speed','crit','critMult','might','area','durMul','cdMul','magnet','xpMul','extraProj','armor'];
    const mk=(sx,st,cls)=>{ const p=makePlayer(CLS[cls||'mage']); Object.assign(p.stats,st); if(sx){ p.sx=true; p.permSt={}; } recalc(p); return p; };
    const a0=mk(false,{}), b0=mk(true,{}); o.zero=F.filter(f=>Math.abs(a0[f]-b0[f])>1e-9);
    const c=CLS.mage, g=(st)=>mk(true,st);
    const S=g({STR:10}), V=g({VIT:10}), A=g({AGI:10}), D=g({DEX:10}), I=g({INT:10}), L=g({LUK:10});
    o.str=[+(S.maxHp/c.hp).toFixed(3), S.armor-c.armor, S.might]; o.vit=[+(V.maxHp/c.hp).toFixed(3), +(V.regen-c.regen).toFixed(3)];
    o.agi=[+(A.speed/c.speed).toFixed(3), +A.dodge.toFixed(3)]; o.dex=[+D.cdMul.toFixed(4), +D.rangeMul.toFixed(3), +(D.speed/c.speed).toFixed(3)];
    o.int=[+I.area.toFixed(3), +I.durMul.toFixed(3)]; o.luk=[+(L.crit-c.crit).toFixed(3), +L.critMult.toFixed(3), +L.drop.toFixed(3)];
    const cap=g({AGI:40, DEX:60, INT:90, LUK:90}); o.cap=[+(cap.speed/c.speed).toFixed(3), +cap.cdMul.toFixed(3), +cap.rangeMul.toFixed(3), +cap.area.toFixed(3), +cap.crit.toFixed(3)];
    const p=g({INT:10}); p.skills.push(makeSkill('thunder'), makeSkill('flame')); recalc(p);
    const th=p.skills.find(s=>s.id==='thunder'), raw=SK.thunder.p; o.th=[+(pv(th,'dmg')/raw.dmg[0]).toFixed(4), +(pv(th,'jump')/raw.jump).toFixed(4), th.mxL];
    const q=g({INT:20}); q.skills.push(makeSkill('flame')); recalc(q); const fl=q.skills.find(s=>s.id==='flame');
    o.fl=[+(pv(fl,'dmg')/SK.flame.p.dmg[0]).toFixed(4), !!fl.mxLook.haze, !!fl.mxLook.blue, !!(fl.fx&&fl.fx.ignite), !!(fl.fx&&fl.fx.shards), q.tf===true];
    const st=g({}); st.bonus={mxStart:3}; st.skills.push(makeSkill('thunder')); recalc(st); o.start=+(pv(st.skills[1],'dmg')/raw.dmg[0]).toFixed(4);
    const pm=g({}); pm.permSt={INT:25}; pm.skills.push(makeSkill('thunder')); recalc(pm); o.perm=pm.skills[1].mxL;
    const f=g({}); f.skills.push(makeSkill('thunder')); recalc(f); o.freshMod=f.skills.some(s=>s.mod);
    const n5=g({INT:5}); n5.skills.push(makeSkill('flame')); recalc(n5); o.next=sxNext(n5,'INT').map(x=>x.n+':'+x.s.id+':'+x.lv);
    const sw=mk(true,{STR:10},'swordsman'); recalc(sw); const sl=sw.skills[0]; o.slash=[+(pv(sl,'dmg')/SK.slash.p.dmg[0]).toFixed(4), +(pv(sl,'arc')/SK.slash.p.arc).toFixed(4), +(pv(sl,'range')/SK.slash.p.range[0]).toFixed(4), sl.mxL];
    return o; })()`);
  ok('ไม่มีการ์ด: ทุก field เท่าคลาสสิก', r.zero.length === 0, r.zero);
  ok('STR 10 (จอมเวท): HP ×1.2 · DEF +10 · ไม่เพิ่มดาเมจ (might 1)', JSON.stringify(r.str) === '[1.2,10,1]', r.str);
  ok('VIT 10: HP ×1.4 · ฟื้น +2.5/วิ', JSON.stringify(r.vit) === '[1.4,2.5]', r.vit);
  ok('AGI 10: เดิน ×1.3 · หลบ 8%', JSON.stringify(r.agi) === '[1.3,0.08]', r.agi);
  ok('DEX 10: คูลดาวน์ ×1/1.3 · ระยะ ×1.4 · เดิน ×1.1', r.dex[0] === +(1 / 1.3).toFixed(4) && r.dex[1] === 1.4 && r.dex[2] === 1.1, r.dex);
  ok('INT 10: พื้นที่ ×1.2 · ระยะเวลา ×1.2', JSON.stringify(r.int) === '[1.2,1.2]', r.int);
  ok('LUK 10: คริ +15% · แรงคริ 2.05 · ดรอป +10%', JSON.stringify(r.luk) === '[0.15,2.05,0.1]', r.luk);
  ok('เพดาน: เดิน ≤ +60% · คูลดาวน์ ≥ ×0.45 · ระยะ ≤ +80% · พื้นที่ ≤ ×2 · คริ ≤ 75%', JSON.stringify(r.cap) === '[1.6,0.45,1.8,2,0.75]', r.cap);
  ok('สายฟ้า ความชำนาญ INT 10: แรง ×1.4 · ระยะกระโดด ×1.2 (ลูกเล่น Lv10)', r.th[0] === 1.4 && r.th[1] === 1.2 && r.th[2] === 10, r.th);
  ok('หอกเพลิง ความชำนาญ 20: แรง ×1.8×1.25 · ไอร้อน · ไฟน้ำเงิน · ติดไฟ · สะเก็ด · เปิดระบบผลพิเศษ', r.fl[0] === +(1.8 * 1.25).toFixed(4) && r.fl.slice(1).every(Boolean), r.fl);
  ok('อัปถาวร 🧬 ขั้น 3 = เริ่มรอบด้วยความชำนาญ +3 (แรง ×1.12) · INT ถาวร 25 = +5 ระดับ', r.start === 1.12 && r.perm === 5, r);
  ok('ตัวละครใหม่ไม่มีการ์ด: ไม่มี s.mod', r.freshMod === false, r.freshMod);
  ok('ใบถัดไปของ INT 5: หอกเพลิงได้ลูกเล่น Lv6 (อีก 1 ใบ)', r.next.includes('1:flame:6'), r.next);
  ok('นักดาบ ฟันดาบ ความชำนาญ STR 10: แรง ×1.4 · มุมฟัน ×1.25 (Lv10) · ระยะ ×1.1 (Lv6)', r.slash[0] === 1.4 && r.slash[1] === 1.25 && r.slash[2] === 1.1 && r.slash[3] === 10, r.slash);
}

console.log('บันไดความชำนาญครบทุกอาชีพ (26a MX_T)');
{
  const { X } = fresh();
  const r = X(`(()=>{ const bad=[], FX={burst:1,shock:1,chill:1,ignite:1,trail:1,pull:1,leech:1,feast:1,mend:1,execute:1,vsStun:1,shards:1,echo:1,radial:1,fork:1,hitboom:1};
    const ids=[]; for(const c of CLASSES) ids.push(...clsSkills(c), ...c.adv.flatMap(a=>advSkills(a)));
    for(const id of ids){ const T=MX_T[id], d=SK[id]; if(!T){ bad.push(id+': ไม่มีบันได'); continue; }
      let last=0; for(const [lv,t,o] of T){ if(!(lv>last)) bad.push(id+': ระดับไม่เรียง '+lv); last=lv; if(!t) bad.push(id+': ไม่มีข้อความ '+lv);
        for(const k of Object.keys(o.add||{}).concat(Object.keys(o.mul||{}))) if(d.p[k]==null) bad.push(id+' Lv'+lv+': ไม่มีค่า '+k);
        for(const f in o.fx||{}){ if(!FX[f]) bad.push(id+' Lv'+lv+': fx '+f); if(f==='echo'&&!TF_ECHO[d.type]) bad.push(id+' Lv'+lv+': echo ใช้กับ '+d.type+' ไม่ได้'); if(f==='fork'&&d.type!=='chain') bad.push(id+': fork'); } }
      if(last!==35) bad.push(id+': ระดับสุดท้ายไม่ใช่ 35'); }
    const p=makePlayer(CLS.thief); p.sx=true; p.permSt={}; p.stats.AGI=40; p.stats.LUK=40; p.stats.DEX=40; p.stats.INT=40;
    for(const id of ['fan','venom','shadow','phantom','whirl','clones','smoke']) p.skills.push(makeSkill(id)); recalc(p);
    const nums=[]; for(const s of p.skills) for(const k in s.def.p){ const v=pv(s,k); if(typeof v==='number'&&!isFinite(v)) nums.push(s.id+'.'+k); }
    return {bad, n:ids.length, nums, tf:p.tf===true, sh:+pv(p.skills.find(s=>s.id==='shadow'),'dodge').toFixed(3)}; })()`);
  ok('ทุกสกิลของ 5 อาชีพ (รวมสกิลเฉพาะโหมดตัวละคร) มีบันได 35 ระดับ · ใช้แต่ค่าที่สกิลมีจริง · fx อยู่ในคลัง · echo เฉพาะชนิดที่ร่ายซ้ำได้', r.bad.length === 0 && r.n === SKILL_TOTAL, [r.n, r.bad.slice(0, 8)]);
  ok('โจร ความชำนาญ 40 ทุกค่า: ทุกตัวเลขของ 8 สกิลเป็นจำนวนจริง · เปิดระบบผลพิเศษ', r.nums.length === 0 && r.tf, r);
  ok('เงาพริ้ว Lv40: หลบ 0.08 + 0.02 + 0.03 + 0.03 + 0.05 = 0.21', r.sh === .21, r.sh);
}

console.log('สกิลเพิ่ม 30 ตัว (CLASSES skx · โหมดตัวละครเท่านั้น · PROPOSAL-skill-trees §3)');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={bad:[]}, B=o.bad, skx=[];
    for(const c of CLASSES){ for(const id of c.skx||[]) skx.push(id); for(const a of c.adv) for(const id of a.skx||[]) skx.push(id); }
    o.n=skx.length; o.total=Object.keys(SK).length; o.dup=skx.length!==new Set(skx).size;
    o.classic=CLASSES.every(c=>c.skills.length===4&&c.adv.every(a=>a.skills.length===2));                       // classic lists untouched
    for(const id of skx){ const d=SK[id]; if(!d){ B.push(id+': ไม่มีใน SK'); continue; }
      if(!SX.main[id]) B.push(id+': ไม่มีค่าหลัก'); if(!MX_T[id]) B.push(id+': ไม่มีบันได'); if(tfNodes(id).length!==10) B.push(id+': ต้นไม้ไม่ครบ');
      if(!SKILL_REQ[id]) B.push(id+': ไม่มีเงื่อนไขปลด'); if(!d.n||!d.d||!d.i) B.push(id+': ไม่มีชื่อ/คำอธิบาย'); }
    // every numeric tree node of every skill points at a number the skill really has
    // (a × node on a missing number does nothing · new skills: every node key must exist)
    for(const id of Object.keys(SK)) for(const nd of tfNodes(id)) if(nd.kind==='num'){ const k=nd.op==='c'?'cd':nd.k; if(SK[id].p[k]==null&&(nd.op!=='+'||skx.indexOf(id)>=0)) B.push(id+' '+nd.id+': ไม่มีค่า '+k); }
    for(const id of Object.keys(TFD)) for(const nd of tfNodes(id)) if(nd.kind==='fx'&&nd.fx==='mod') for(const k in Object.assign({},nd.p.add,nd.p.mul)) if(SK[id].p[k]==null) B.push(id+' '+nd.id+': mod '+k);
    // mastery 40 on every stat: every number of every new skill stays a real number
    for(const c of CLASSES){ const p=makePlayer(c); p.sx=true; p.permSt={}; for(const k of STAT_ORDER) p.stats[k]=40;
      const ids=(c.skx||[]).concat(...c.adv.map(a=>a.skx||[])); for(const id of ids) p.skills.push(makeSkill(id)); for(const s of p.skills) s.lv=5; recalc(p);
      for(const s of p.skills) for(const k in s.def.p){ const v=pv(s,k); if(typeof v==='number'&&!isFinite(v)) B.push(s.id+'.'+k+' = '+v); } }
    return o; })()`);
  ok('สกิลเพิ่มทุกตัว: มีใน SK · ค่าหลัก · บันไดความชำนาญ · ต้นไม้ 10 โหนด · เงื่อนไขปลด · ชื่อ/คำอธิบาย · โหนดตัวเลขชี้ค่าที่สกิลมีจริง · ความชำนาญ 40 ไม่มีค่าแปลก', r.bad.length === 0 && !r.dup, r.bad.slice(0, 10));
  ok('จำนวนสกิลทั้งเกม = ' + SKILL_TOTAL + ' · รายการคลาสสิก (skills) ยัง 4 + 2 + 2 ต่ออาชีพ', r.total === SKILL_TOTAL && r.n === SKILL_TOTAL - 40 && r.classic, r);
  const g = X(`(()=>{ SAVE=newSave(null); const o={}, ch=newChar('ปลดสกิล','swordsman'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.sp=99;
    o.lv1=canLearn(ch,'flyblade'); ch.lv=8; o.lv8=canLearn(ch,'flyblade'); o.r15=canLearn(ch,'riposte'); o.learn=learnSkill(ch,'flyblade'); o.load=ch.load.slice();
    o.pool=pgSkillPool(ch).join(); o.slots=BAL.LOADOUT[pgTier(ch)];
    ch.lv=20; ch.job='knight'; ch.jlv=1; o.cap8=rankCap(ch,'flyblade'); o.adv=[canLearn(ch,'palisade')]; ch.sk.lance=3; o.adv.push(canLearn(ch,'palisade')); ch.jlv=5; o.adv.push(canLearn(ch,'palisade'));
    o.pool2=pgSkillPool(ch).join();
    // fake saves: a gated skill below its Base / Job Lv is dropped · another path's skill is dropped · ★ clamped like every first-job skill
    const raw=(o2)=>svChar(JSON.parse(JSON.stringify(Object.assign({cls:'swordsman', name:'ปลอม', lv:1, jlv:1, job:null, sk:{slash:1}}, o2))));
    o.f1=raw({sk:{slash:1, flyblade:5, riposte:3}}).sk;
    o.f2=raw({lv:15, sk:{slash:1, flyblade:9, riposte:3}}).sk;
    o.f3=raw({lv:30, job:'knight', jlv:4, sk:{slash:1, flyblade:9, lance:3, palisade:2, bloodrite:2}}).sk;
    o.f4=raw({lv:30, job:'knight', jlv:9, sk:{slash:1, lance:3, palisade:2, valor:2, thrust:1}}).sk;
    o.f5=raw({lv:30, job:'knight', jlv:12, sk:{slash:1, lance:3, palisade:2, valor:3, thrust:4}, load:['thrust','palisade','lance','slash','x','slash']}).load;
    // an old v6 save keeps its character · gets the new slots and can learn the new skills by playing on
    const old=migrateSave({v:6, acct:{gold:5}, chars:[{id:'c_old1', cls:'swordsman', name:'เก่า', lv:16, jlv:14, sp:9, sk:{slash:5, slam:2, blades:1, bulwark:1}, load:['slash','slam','blades','bulwark']}], active:'c_old1'});
    const oc=old.chars[0]; o.old=[old.v, oc.load.join(), oc.sp, canLearn(oc,'flyblade'), canLearn(oc,'riposte'), BAL.LOADOUT[pgTier(oc)]];
    return o; })()`);
  ok('ปลดตามเลเวล: ดาบบินคืนมือต้อง Base 8 · ดาบสวนกลับต้อง Base 15 · ฝึกแล้วเข้าช่องว่างเอง', /เลเวลตัวละคร 8/.test(g.lv1) && g.lv8 === '' && /เลเวลตัวละคร 15/.test(g.r15) && g.learn === true && deq(g.load, ['slash', 'flyblade']), g);
  ok('สกิลเพิ่มอยู่ใน pgSkillPool (ขั้นต้น 6) · ช่องติดตัว 5 · หลังเลื่อน ★8 ได้เหมือนสกิลขั้นต้นเดิม', g.pool === 'slash,slam,blades,bulwark,flyblade,riposte' && g.slots === 5 && g.cap8 === 8, g);
  ok('ปลดตามอาชีพ: ปราการหอกต้อง หอกพุ่ง ★3 แล้ว Job Lv 5 · pool ขั้นสูง = 4 สกิล', /หอกพุ่งทะยาน ถึง ★3/.test(g.adv[0]) && /เลเวลอาชีพ 5/.test(g.adv[1]) && g.adv[2] === '' && g.pool2.endsWith('lance,valor,palisade,thrust'), g);
  ok('เซฟปลอม: สกิลที่ Base Lv ไม่ถึงถูกทิ้ง · ★ เกินถูกตัด (ก่อนเลื่อน 5 · หลังเลื่อน 8) · Job Lv ไม่ถึง/สกิลสายอื่นถูกทิ้ง',
    deq(g.f1, { slash: 1 }) && deq(g.f2, { slash: 1, flyblade: 5, riposte: 3 }) && deq(g.f3, { slash: 1, flyblade: 8, lance: 3 }) && deq(g.f4, { slash: 1, lance: 3, palisade: 2, valor: 2 }), g);
  ok('เซฟปลอม: loadout 6 ช่องหลังเลื่อน · ตัดซ้ำ/ไม่รู้จัก', deq(g.f5, ['thrust', 'palisade', 'lance', 'slash']), g.f5);
  ok('เซฟเก่า v6 → v7: ตัวละครครบ · ช่องเพิ่มเป็น 5 · ปลดสกิลใหม่ตามเลเวล (Lv16 = ทั้งสองตัว)', g.old[0] === 7 && g.old[1] === 'slash,slam,blades,bulwark' && g.old[2] === 9 && g.old[3] === '' && g.old[4] === '' && g.old[5] === 5, g.old);
}

console.log('ค่าสถานะ: ข้อที่ tester รอบ 2 เจอ (F1–F8)');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={}, mk=(cls,st,bonus)=>{ const p=makePlayer(CLS[cls]); Object.assign(p.stats,st); p.sx=true; p.permSt={}; if(bonus) p.bonus=bonus; recalc(p); return p; };
    const sw=mk('swordsman',{VIT:5}); sw.skills.push(makeSkill('bulwark')); recalc(sw); const bw=sw.skills.find(s=>s.id==='bulwark');
    o.nova=pv(bw,'nova')/SK.bulwark.p.nova[0]; o.bwHave=sxHave(sw,bw);
    const fr=mk('swordsman',{STR:5}); fr.skills.push(makeSkill('frenzy')); recalc(fr); o.frenzy=sxHave(fr,fr.skills.find(s=>s.id==='frenzy')).pk;
    const big=mk('swordsman',{VIT:40}); big.skills.push(makeSkill('bulwark')); recalc(big); o.abs=pv(big.skills.find(s=>s.id==='bulwark'),'absorb')/SK.bulwark.p.absorb[0];
    const mg=mk('mage',{AGI:100, INT:100}); mg.skills.push(makeSkill('frost'), makeSkill('blizzard')); recalc(mg); o.slow=mg.skills.filter(s=>s.def.p.slow!=null).map(s=>pv(s,'slow'));
    const th=mk('thief',{AGI:400}); th.skills.push(makeSkill('shadow')); recalc(th); o.dodge=pv(th.skills.find(s=>s.id==='shadow'),'dodge');
    const g1=makePlayer(CLS.archer); g1.bonus={crit:.7}; g1.stats.LUK=5; recalc(g1); const g2=mk('archer',{LUK:5},{crit:.7}); o.crit=[g1.crit,g2.crit];
    const g3=mk('archer',{LUK:30},{crit:.7}); o.critOver=g3.crit;
    o.ver=[SCHEMA_V, migrateSave({v:2, acct:{gold:9, up:{xp:2, stat:4}}, chars:[]}).acct.up];
    const junk={}; for(let i=0;i<30;i++) junk['zz'+String.fromCharCode(97+i%26)+String.fromCharCode(97+(i/26|0))]=1; Object.assign(junk,{xp:3, stat:2});
    o.keys=validateSave({v:3, acct:{up:junk}, chars:[]}).acct.up;
    return o; })()`);
  ok('ปราการเหล็ก: ความชำนาญ VIT ไปเพิ่มดาเมจระเบิดโล่ (nova ×1.2 ที่ VIT 5) · หน้าพักเกมบอกว่าเป็นระเบิดโล่', Math.abs(r.nova - 1.2) < 1e-9 && r.bwHave.pk === 'nova' && r.bwHave.main === 'VIT', r);
  ok('เลือดคลั่ง (ไม่มีดาเมจ): ไม่ขึ้นบรรทัดความแรง', r.frenzy === null, r.frenzy);
  ok('บันไดปราการเหล็ก: VIT 40 → ดูดซับ ×1.15 (Lv6) ×1.25 (Lv25) ×1.3 (Lv35) ไม่ทบต้นต่อใบ', Math.abs(r.abs - 1.15 * 1.25 * 1.3) < 1e-9, r.abs);
  ok('ชะลอไม่เกิน 80% แม้การ์ด 100 ใบ (ศัตรูไม่หยุด/ไม่ถอยหลัง)', r.slow.length === 2 && r.slow.every(v => v <= .8 + 1e-9), r.slow);
  ok('หลบจากเงาพริ้วไม่เกิน 50%', r.dodge <= .5 + 1e-9, r.dodge);
  ok('คริจากอุปกรณ์สูง (70%) + การ์ด LUK: การ์ดดันได้ถึง 75% เท่านั้น · อุปกรณ์อย่างเดียวไม่ถูกตัด', r.crit[1] < r.crit[0] && Math.abs(r.critOver - r.crit[1]) < 1e-9 && Math.abs(r.crit[0] - r.crit[1] - .25) < 1e-9, r);
  ok('เซฟ v3: v2 → v3 ไม่เสีย up.stat · คีย์ขยะ 30 ตัวไม่ดัน xp/stat ออก', r.ver[0] === 7 && r.ver[1].stat === 4 && r.ver[1].xp === 2 && r.keys.xp === 3 && r.keys.stat === 2, r);
}

console.log('ต้นไม้สกิล (27) · ★6–8 · เซฟ v4');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={}; SAVE=newSave(null); const ch=newChar('ต้นไม้','mage'); SAVE.chars.push(ch); SAVE.active=ch.id;
    o.all=Object.keys(SK).every(id=>tfNodes(id).length===10) && Object.keys(TFD).length===Object.keys(SK).length;
    o.free0=tfFree(ch); ch.lv=30; o.free30=tfFree(ch);
    o.r1=tfWhy(ch,'thunder','A1'); ch.sk.thunder=2; o.ok1=tfBuy(ch,'thunder','A1'); o.lvA1=tfLv(ch,'thunder','A1');
    o.b2=tfWhy(ch,'thunder','B2'); ch.sk.thunder=4; ch.tr.thunder.B1=3; o.b2x=tfWhy(ch,'thunder','B2'); ch.tr.thunder.A1=2; o.b2ok=tfWhy(ch,'thunder','B2');
    o.crown=tfWhy(ch,'thunder','K');
    o.spent=tfSpentOne(ch,'thunder');
    ch.lv=3; o.poor=tfWhy(ch,'thunder','C1'); ch.lv=30;
    o.reset=tfReset(ch,'thunder'); o.after=tfSpentOne(ch,'thunder'); o.freeFlag=ch.resets.trFree;
    // save: junk nodes / levels / skills are dropped · tr survives a round trip
    ch.tr={thunder:{A1:9, ZZ:2, B1:'2', A3:1}, slash:{A1:1}, __proto__x:{A1:1}};
    const v=svChar(JSON.parse(JSON.stringify(ch))); o.tr=v.tr;
    o.mig=migrateSave({v:3, acct:{}, chars:[Object.assign({},ch,{sk:Object.assign({},ch.sk,{flame:2}), tr:{flame:{A1:2}}})]}).chars[0].tr;
    o.v=SCHEMA_V;
    // ★ caps: 5 before the advance · 8 for first-job skills after it · advanced skills stay 5
    o.cap=[rankCap(ch,'mbolt'), (ch.job='archmage', rankCap(ch,'mbolt')), rankCap(ch,'meteor')];
    ch.sk.mbolt=8; o.sv8=svChar(JSON.parse(JSON.stringify(ch))).sk.mbolt; ch.job=null; o.sv5=svChar(JSON.parse(JSON.stringify(ch))).sk.mbolt;
    return o; })()`);
  ok('ต้นไม้ครบ 40 สกิล สกิลละ 10 โหนด', r.all, r);
  ok('แต้มรูน = Base Lv (Lv1 = 1 · Lv30 = 30)', r.free0 === 1 && r.free30 === 30, r);
  ok('ชั้น 1 ต้องลำต้น ★2 · ซื้อได้แล้วขึ้นขั้น 1', /★2/.test(r.r1) && r.ok1 === true && r.lvA1 === 1, r);
  ok('สายกลางชั้น 2 ต้องลำต้น ★4 + ชั้น 1 เต็ม + ข้ามสาย A1 ขั้น 2', /★4/.test(r.b2) && /ข้ามสาย/.test(r.b2x) && r.b2ok === '', r);
  ok('มงกุฎต้องเลื่อนอาชีพก่อน', /เลื่อนอาชีพ/.test(r.crown), r.crown);
  ok('แต้มไม่พอ = ฝึกไม่ได้ (บอกจำนวน)', /แต้มรูนไม่พอ/.test(r.poor), r.poor);
  ok('รีเซ็ตต้นไม้ (Lv 30 ใช้สิทธิ์ฟรี 1 ครั้ง) → แต้มคืนครบ · trFree = 0', r.reset === true && r.after === 0 && r.freeFlag === 0, r);
  ok('เซฟ: โหนดแปลก/ขั้นเกินถูกตัด · ขั้นเกิน max = max · สกิลต่างอาชีพถูกทิ้ง · A3 ที่ A2 ยังไม่เต็มถูกตัด', JSON.stringify(r.tr) === JSON.stringify({thunder:{A1:3, B1:2}}), r.tr);
  ok('เซฟ v3 → v4 ไม่เสียต้นไม้ · SCHEMA_V = 4', r.v === 7 && JSON.stringify(r.mig) === JSON.stringify({flame:{A1:2}}), r);
  ok('เพดาน ★: ก่อนเลื่อน 5 · หลังเลื่อนสกิลขั้นต้น 8 · สกิลขั้นสูง 5 · เซฟเก็บ ★8 เฉพาะตอนเลื่อนแล้ว', JSON.stringify(r.cap) === '[5,8,5]' && r.sv8 === 8 && r.sv5 === 5, r);
}
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={};
    const s={def:SK.mbolt, lv:5}; o.classic=[pv(s,'count'), pv(s,'dmg')];
    s.cx=true; o.char=[pv(s,'count'), pv(s,'dmg')];
    s.lv=8; o.lv8=[pv(s,'count'), pv(s,'pierce'), +pv(s,'cd').toFixed(4), +(pv(s,'dmg')/22).toFixed(3)];
    const f={def:SK.flame, lv:7}; o.flame=[+(pv(f,'dmg')/SK.flame.p.dmg[4]).toFixed(3), +(pv(f,'cd')/SK.flame.p.cd[4]).toFixed(4)];
    const e={def:SK.mbolt, lv:7, evolved:true, cx:true}; o.evo=pv(e,'count');
    // in-run: a tree node lands in s.mod · effects in s.fx · passive effects in p.tfg
    const p=makePlayer(CLS.mage); p.sx=true; p.permSt={}; p.skills.push(makeSkill('thunder')); p.tree={thunder:{A1:3, B1:2, A3:1}}; recalc(p);
    const t=p.skills.find(x=>x.id==='thunder'); o.mod=[+t.mod.mul.dmg.toFixed(3), t.mod.add.bounces, !!t.fx.burst, p.tf];
    const q=makePlayer(CLS.swordsman); q.sx=true; q.permSt={}; q.skills.push(makeSkill('frenzy')); q.tree={frenzy:{B3:1, A3:1}}; recalc(q);
    o.glob=[!!q.tfg&&!!q.tfg.feast&&!!q.tfg.execute, !q.skills.find(x=>x.id==='frenzy').fx, q.tf];
    const c=makePlayer(CLS.mage); recalc(c); o.classicTf=c.tf===undefined&&!c.skills[0].cx;
    return o; })()`);
  ok('คลาสสิกใช้ตัวเลขเดิม (ศรเวท Lv5 = 3 ลูก) · โหมดตัวละคร ศรเวท Lv5 = 2 ลูก ดาเมจ 22', JSON.stringify(r.classic) === '[3,26]' && JSON.stringify(r.char) === '[2,22]', r);
  ok('★8 ศรเวท: 4 ลูก ทะลุ 2 · คูลดาวน์ ×0.95³ · ดาเมจ +36%', r.lv8[0] === 4 && r.lv8[1] === 2 && Math.abs(r.lv8[2] - .42 * Math.pow(.95, 3)) < 1e-4 && r.lv8[3] === 1.36, r.lv8);
  ok('Lv7 สกิลอื่น: ดาเมจ ×1.24 · คูลดาวน์ ×0.9025 · ร่างวิวัฒนาการไม่ถูก p2 ทับ (ศรดวงดาว 6 ลูก)', r.flame[0] === 1.24 && r.flame[1] === .9025 && r.evo === 6, r);
  ok('ในรอบ: ต้นไม้เข้า s.mod (ดาเมจ ×1.24 · ชิ่ง +2) · ความพิเศษเข้า s.fx · P.tf เปิด', JSON.stringify(r.mod) === '[1.24,2,true,true]', r.mod);
  ok('สกิลติดตัว: ความพิเศษไปอยู่ P.tfg (ทำงานกับทุกสกิล) ไม่ใช่ s.fx', JSON.stringify(r.glob) === '[true,true,true]', r.glob);
  ok('คลาสสิก: ไม่มี P.tf และไม่มี s.cx', r.classicTf === true, r);
}

console.log('ต้นไม้สกิล: ข้อที่ tester รอบ 1 เจอ');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={}; const full={}; for(const n of tfNodes('holy')) full[n.id]=n.max;
    const raw={cls:'cleric', name:'โกง', lv:1, job:null, sk:{holy:1}, tr:{holy:full, heal:full}};
    const v=svChar(raw); o.f1=[tfSpent(v), JSON.stringify(v.tr)];
    const ok={cls:'mage', name:'ดี', lv:40, job:'archmage', sk:{mbolt:8}, tr:{mbolt:{A1:3,A2:2,A3:1,B1:2,B2:2,C1:3}}};
    const w=svChar(ok); o.keep=tfSpent(w);
    SAVE=newSave(null); SAVE.chars.push(w); SAVE.active=w.id; w.sp=0; resetSkills(w); o.f2=JSON.stringify(w.tr);
    return o; })()`);
  ok('เซฟ: ต้นไม้ที่เงื่อนไขไม่ครบ/แต้มรูนเกิน Base Lv ถูกตัด (Lv1 ★1 = ไม่มีโหนด)', r.f1[0] === 0 && r.f1[1] === '{}', r.f1);
  ok('เซฟ: ต้นไม้ที่ถูกกติกายังอยู่ครบ', r.keep === 3 + 4 + 4 + 2 + 4 + 3, r.keep);
  ok('รีเซ็ตสกิล (★ เหลือ 1): โหนดที่ต้อง ★2/★4 ถูกล้าง แต้มรูนกลับมา', r.f2 === '{}', r.f2);
}

console.log('ร้านรูน (28): กระเป๋ารูน · ระดับเริ่มต้น · การ์ด 5 ใบ · เซฟ v5');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={}; SAVE=newSave(null); const ch=newChar('ร้าน','mage'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.lv=10;
    o.noSup=isSupporter()===false && shopWallet()===0;
    ch.sk.mbolt=5; o.w0=slWhy(ch,'mbolt'); o.b1=slBuy(ch,'mbolt'); o.sl=slOf(ch,'mbolt'); o.free=tfFree(ch);
    o.w1=slWhy(ch,'mbolt');                              // 0 left, Lv3 costs 15
    ENT={sup:0, runes:100, src:'test'}; entOk=true;      // bought 100 runes
    o.w2=slWhy(ch,'mbolt'); o.b2=slBuy(ch,'mbolt'); o.after=[slOf(ch,'mbolt'), ch.rb, SAVE.acct.ru, shopWallet(), tfFree(ch)];
    ch.sk.flame=2; o.tb=tfBuy(ch,'flame','A1'); o.after2=[ch.rb, SAVE.acct.ru];
    o.reset=tfReset(ch,'mbolt'); o.after3=[slOf(ch,'mbolt'), tfFree(ch), ch.rb];
    ch.sl={mbolt:9, flame:2, zz:3}; ch.sk.mbolt=3; ch.lv=40; const v=svChar(JSON.parse(JSON.stringify(ch))); o.sv=[JSON.stringify(v.sl), v.rb];
    o.acct=validateSave(JSON.parse(JSON.stringify(SAVE))).acct.ru;
    const g={rerolls:3}, P1=makePlayer(CLS.mage); ch.sl={mbolt:3}; ch.load=['mbolt']; recalc(P1); prepareRun(g,P1,ch,'survival'); o.run=[P1.skills[0].lv, P1.sl.mbolt, g.rerolls];
    ENT={sup:Date.now()+864e5, runes:100, src:'test'}; const g2={rerolls:3}, P2=makePlayer(CLS.mage); recalc(P2); prepareRun(g2,P2,ch,'survival'); o.supRr=g2.rerolls;
    G={char:ch, mode:{cards:true}}; o.cards=[cardCount(), cardLocked(2), cardLocked(3)]; ENT.sup=0; o.lock=[cardLocked(2), cardLocked(3), cardLocked(4)];
    G={char:null, mode:{}}; o.classic=[cardCount(), cardLocked(3)];
    o.v=SCHEMA_V; return o; })()`);
  ok('เริ่มต้น: ไม่ใช่ผู้สนับสนุน · กระเป๋ารูน 0', r.noSup, r);
  ok('ระดับเริ่มต้น: Lv2 ราคา 10 รูน (Lv10 มี 10) → ซื้อได้ · รูนเหลือ 0', r.w0 === '' && r.b1 === true && r.sl === 2 && r.free === 0, r);
  ok('รูนตัวละครหมด: Lv3 (15) ซื้อไม่ได้ · มีรูนที่ซื้อ 100 → ซื้อได้ ดึงจากกระเป๋า 15', /รูนไม่พอ/.test(r.w1) && r.w2 === '' && r.b2 === true && JSON.stringify(r.after) === '[3,15,15,85,0]', r);
  ok('ฝึกโหนดต้นไม้เมื่อรูนไม่พอ ดึงจากกระเป๋าเช่นกัน', r.tb === true && JSON.stringify(r.after2) === '[16,16]', r);
  ok('รีเซ็ตต้นไม้ = ล้างระดับเริ่มต้นของสกิลนั้น · รูนคืนเข้าตัวละคร (ไม่คืนกระเป๋า)', r.reset === true && r.after3[0] === 1 && r.after3[1] === 25 && r.after3[2] === 16, r);
  ok('เซฟ: ระดับเริ่มต้นเกิน ★ ถูกตัดลง · สกิลไม่รู้จัก/★ ต่ำกว่า 2 ถูกทิ้ง · rb/ru อยู่ครบ', r.sv[0] === '{"mbolt":3,"flame":2}' && r.sv[1] === 16 && r.acct === 16, r);
  ok('ในรอบ: สกิลแรกเริ่มที่ Lv3 · สุ่มใหม่ 2 ครั้ง · ผู้สนับสนุน = ไม่จำกัด', JSON.stringify(r.run) === '[3,3,2]' && r.supRr > 99, r);
  ok('การ์ด: โหมดตัวละคร 5 ใบ · ผู้สนับสนุนไม่ล็อก · คนทั่วไปล็อกใบ 4–5 · คลาสสิก 3 ใบไม่ล็อก', JSON.stringify(r.cards) === '[5,false,false]' && JSON.stringify(r.lock) === '[false,true,true]' && JSON.stringify(r.classic) === '[3,false]', r);
  ok('SCHEMA_V = 7 (v7 = สกิลเฉพาะโหมดตัวละคร)', r.v === 7, r.v);
}

console.log('เฟส A: ธาตุ · สีชั้น · ด่านรายวัน · เซฟ v6');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={};
    o.mul=[elMul('fire','wind'), elMul('wind','fire'), elMul('fire','fire'), elMul('light','dark'), elMul('dark','light'), elMul('fire','light'), elMul(null,'fire'), elMul('fire',null)];
    o.el=[SK.thunder.el, SK.flame.el, SK.mbolt.el||null, skEl({id:'mbolt', def:SK.mbolt, evolved:true}), skEl({id:'flame', def:SK.flame})];
    o.undead=['shambler','runner','bat','spitter','bloater','brute','wraith','colossus','lich','king'].every(k=>!EN[k].el);
    G={cfg:waveCfg(3), enemies:[], eid:0, t:0}; const e=spawnEnemy('dg_raider',0,0), hp=e.hp, dm=e.dmg, xp=e.xp; rankApply(e,2); o.rank=[e.rank, +(e.hp/hp).toFixed(2), +(e.dmg/dm).toFixed(2), e.xp/xp];
    SAVE=newSave(null); const ch=newChar('รายวัน','mage'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.lv=12;
    o.left0=[dgLeft('exp'), dgLeft('gold'), dgLeft('rare')<=2];
    o.why=[dgWhy('exp',0,ch), dgWhy('exp',2,ch), dgWhy('nope',0,ch)];
    SAVE.acct.daily.day=svDay(); SAVE.acct.daily.dg={exp:2, gold:1}; o.left1=[dgLeft('exp'), dgLeft('gold')]; o.full=dgWhy('exp',0,ch);
    SAVE.acct.daily.day='2000-01-01'; o.newDay=dgLeft('exp');
    const v=validateSave({v:6, acct:{daily:{day:'2026-11-10', dg:{exp:2, gold:'1', rare:99, zz:3, __proto__x:1}}}, chars:[]}); o.dg=JSON.stringify(v.acct.daily.dg);
    o.mig=migrateSave({v:5, acct:{daily:{day:'2026-11-10', surv:{}}}, chars:[]}); o.migV=o.mig.v; o.migDg=JSON.stringify(o.mig.acct.daily.dg);
    o.modes=['dexp','dgold','drare'].every(k=>MODES[k]&&typeof MODES[k].rewards==='function'&&PG_START[k]==='all1');
    return o; })()`);
  ok('ตารางธาตุ: ชนะ ×1.5 · แพ้ ×0.6 · เหมือนกัน ×0.75 · แสง⇄มืด ×1.5 ทั้งคู่ · ไม่มีธาตุ ×1', JSON.stringify(r.mul) === '[1.5,0.6,0.75,1.5,1.5,1,1,1]', r.mul);
  ok('ธาตุสกิล: สายฟ้า = ลม · หอกเพลิง = ไฟ · ศรเวทไม่มีธาตุ แต่ร่างวิวัฒนาการเป็นแสง', JSON.stringify(r.el) === '["wind","fire",null,"light","fire"]', r.el);
  ok('อันเดดทุกตัว (คลาสสิก/เอาชีวิตรอด) ไม่มีธาตุ → สมดุลเดิม', r.undead, r.undead);
  ok('สีชั้นหัวหน้า (ม่วง): HP ×3.5 · ดาเมจ ×1.5 · EXP ×4', JSON.stringify(r.rank) === '[2,3.5,1.5,4]', r.rank);
  ok('สิทธิ์รายวัน: วิญญาณ 2 · ทอง 2 · ห้องสมบัติ 1 (เสาร์อาทิตย์ 2) · Lv12 เข้ายากไม่ได้', r.left0[0] === 2 && r.left0[1] === 2 && r.left0[2] && r.why[0] === '' && /เลเวล 25/.test(r.why[1]) && /ไม่พบ/.test(r.why[2]), r);
  ok('ใช้ครบแล้วเข้าไม่ได้ · ข้ามวันได้สิทธิ์ใหม่', JSON.stringify(r.left1) === '[0,1]' && /ครบแล้ว/.test(r.full) && r.newDay === 2, r);
  ok('เซฟ: daily.dg เก็บเฉพาะ exp/gold/rare 0–9 · v5 → v6 ได้ dg ว่าง', r.dg === '{"exp":2,"gold":1,"rare":9}' && r.migV === 7 && r.migDg === '{}', r);
  ok('โหมด dexp/dgold/drare มีรางวัล และเริ่มทุกสกิลที่ Lv1 (หรือระดับเริ่มต้น)', r.modes, r.modes);
}

console.log('ด่านรายวัน: ข้อที่ tester รอบ 4 เจอ');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={}; SAVE=newSave(null); const ch=newChar('ตั๋ว','mage'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.lv=30;
    const t=dgTicket(); o.t=[DG_TICKETS.has(t), DG_TICKETS.delete(t), DG_TICKETS.delete(t)];
    G={char:ch, dgPaid:false, diff:DG.diff[1], goldRun:500, dgPts:100}; const r1={baseXp:0, gold:500, items:[{id:'m_dust', n:3}]}; MODES.dgold.rewards(r1,true); o.unpaid=[r1.gold, r1.items.length, !!r1.unpaid];
    G.dgPaid=true; const r2={gold:500, items:[]}; MODES.dgold.rewards(r2,true); o.paid=[r2.gold, r2.daily===undefined];
    SAVE.acct.daily.day=svDay(Date.now()+864e5); SAVE.acct.daily.dg={gold:2}; o.future=dgLeft('gold');
    o.again=['dexp','dgold','drare'].every(k=>MODES[k].again===dgAgain&&MODES[k].daily===true);
    o.proto=[dgWhy('constructor',0,ch), dgPer('__proto__')];
    return o; })()`);
  ok('ตั๋วเข้าด่านใช้ได้ครั้งเดียว', JSON.stringify(r.t) === '[true,true,false]', r.t);
  ok('รอบที่ไม่ได้ใช้สิทธิ์ (เล่นอีกครั้ง/เริ่มใหม่/dev) ไม่ได้รางวัลเลย', JSON.stringify(r.unpaid) === '[0,0,true]', r.unpaid);
  ok('รอบที่ใช้สิทธิ์: ทอง ×10 × ความยาก · ไม่ขึ้นป้าย ×2 ของเอาชีวิตรอด', r.paid[0] === 7500 && r.paid[1], r.paid);
  ok('ถอยนาฬิกาเครื่องกลับ ไม่ได้สิทธิ์คืน', r.future === 0, r.future);
  ok('เล่นอีกครั้ง/เริ่มใหม่ ในด่านรายวัน = กลับหน้าด่านรายวัน · ชื่อแปลก (constructor/__proto__) ไม่ผ่าน', r.again && /ไม่พบ/.test(r.proto[0]) && r.proto[1] === 0, r);
}

console.log('วันของรายวัน: ข้อที่ tester รอบ 5 เจอ');
{
  const { X } = fresh();
  const r = X(`(()=>{ const o={}, d=k=>svDay(Date.now()+k*864e5);
    o.cur=[svDayCur(d(0)), svDayCur(d(1)), svDayCur(d(2)), svDayCur(d(-1)), svDayCur(''), svDayCur(null)];
    SAVE=newSave(null); const ch=newChar('วัน','mage'); SAVE.chars.push(ch); SAVE.active=ch.id;
    SAVE.acct.daily.day=d(1); SAVE.acct.daily.dg={gold:2}; o.ahead1=dgLeft('gold');
    SAVE.acct.daily.day=d(30); o.ahead30=dgLeft('gold');
    return o; })()`);
  ok('วันในเซฟนับเป็นวันนี้: วันเดียวกัน หรือล่วงหน้าไม่เกิน 1 วัน (เกินนั้น = นาฬิกาเคยผิด → รีเซ็ต)', JSON.stringify(r.cur) === '[true,true,false,false,false,false]', r.cur);
  ok('เซฟล่วงหน้า 1 วัน: สิทธิ์ที่ใช้ไปยังนับ · ล่วงหน้า 30 วัน: ไม่ล็อกด่าน', r.ahead1 === 0 && r.ahead30 === 2, r);
}

console.log(`\nผล: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
