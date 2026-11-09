// test/54-progress.test.mjs (lane P) — stats tab, skills page, job page, trial mode (DESIGN §2.5 · §3.3–3.6 · §8.8–8.10 · §9.3)
//   node test/54-progress.test.mjs
// Runs the real src/js files in node:vm (test/_vm.mjs). Lane B's shell (UI, toast, confirmBox …) and the DOM are stubbed;
// the screens themselves are checked in the browser. No dependencies.
import { loadSrc } from './_vm.mjs';

const FILES = ['04', '05', '06', '07', '08', '15', '16', '17', '18', '24', '25', '26', '30', '31', '33', '34', '40', '41', '42', '54', '56', '57', '58'];
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
const canon = v => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x) ? Object.keys(x).sort().reduce((o, q) => (o[q] = x[q], o), {}) : x));
const deq = (a, b) => canon(a) === canon(b);
// the parts of 21-ui.js the skills page reads (labels/units of the level-up cards), copied as stubs
const UI21 = {
  PL: { cd: 'คูลดาวน์', dmg: 'ดาเมจ', count: 'จำนวน', range: 'ระยะ', r: 'รัศมี' },
  fmtP: (k, v) => (k === 'cd' ? (+v.toFixed(2)) + ' วิ' : String(+(+v).toFixed(2))),
};
function fresh(extra = {}) {
  const log = { toast: [], go: [], show: [], end: [], start: [], confirm: [] };
  const stubs = Object.assign({
    SCREENS: ['scrTitle', 'scrLevel', 'scrAdv', 'scrPause', 'scrEnd'], VW: 1280, VH: 800,
    UI: { go: id => log.go.push(id), back() {}, home() {}, stack: () => [] },
    show: id => log.show.push(id), toast: (t, k) => log.toast.push([t, k]), confirmBox: t => { log.confirm.push(t); return Promise.resolve(true); },
    sheet() { return null; }, closeSheet() {}, sysLog() {}, openCharWindow() {},
    banner() {}, sfx() {}, getSpr() {}, initAudio() {}, portrait() {}, endRun: won => log.end.push(won),
  }, UI21, extra);
  const ctx = loadSrc(FILES, stubs);
  return { ctx, X: e => ctx.__eval(e), log, ls: ctx.localStorage };
}
const CLASSES = ['swordsman', 'mage', 'archer', 'cleric', 'thief'];

// ------------------------------------------------------------------------------------------------
console.log('§7.4 โหลดไฟล์ + registry');
{
  let err = null, X;
  try { ({ X } = fresh()); } catch (e) { err = e; }
  ok('โหลด 54/56/57/58 ได้โดยไม่มี document (ไม่แตะ DOM / localStorage / G ตอนโหลด)', !err, err && String(err));
  const r = X(`({tab:CHARTABS.stats&&[CHARTABS.stats.n,CHARTABS.stats.order,typeof CHARTABS.stats.render], scr:SCREENS.slice(-2), 
    mode:[MODES.trial.id,MODES.trial.cards,MODES.trial.relocate,typeof MODES.trial.init,typeof MODES.trial.update,typeof MODES.trial.hud,typeof MODES.trial.end,typeof MODES.trial.pauseTitle],
    ls:localStorage.length, save:SAVE, ts:typeof trialStart, dev:typeof DEV.prog.open})`);
  ok('CHARTABS.stats = {n:"สถานะ", order, render} · regScreen scrSkills + scrJob', deq(r.tab, ['สถานะ', 30, 'function']) && deq(r.scr, ['scrSkills', 'scrJob']), r);
  ok('MODES.trial: cards:false · relocate:false · มี init/update/hud/end/pauseTitle (ModeDef §7.6) · trialStart · DEV.prog', deq(r.mode, ['trial', false, false, 'function', 'function', 'function', 'function', 'function']) && r.ts === 'function' && r.dev === 'function', r);
  ok('ตอนโหลดไม่เขียน localStorage และไม่โหลดเซฟ', r.ls === 0 && r.save === null, r);
  const w = X(`(()=>{ const d=EN.trial_warden, names={}; let dup=[]; for(const k in EN){ const n=EN[k].n; if(names[n]) dup.push(n); names[n]=1; }
    return {boss:d.boss, lazy:d.lazy, base:d.base, ai:d.ai, tint:/^#[0-9a-f]{6}$/i.test(d.tint), n:d.n, hp:d.hp, r:d.r, dup}; })()`);
  ok('EN.trial_warden: "ผู้คุมบททดสอบรูน" · colossus ย้อมสี (base + tint) · AI colossus (d.ai) · HP ฐาน 700 · boss + lazy (ไม่สร้างตอน boot)',
    w.boss === 1 && w.lazy === 1 && w.base === 'colossus' && w.ai === 'colossus' && w.tint && w.n === 'ผู้คุมบททดสอบรูน' && w.hp === 700 && w.r === 44, w);
  ok('ชื่อใน EN ไม่ซ้ำกัน', w.dup.length === 0, w.dup);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.3 แท็บสถานะ (ค่ารอยืนยัน)');
{
  const { X } = fresh();
  const s = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','mage'); SAVE.chars.push(ch); SAVE.active=ch.id; const o={};
    o.left0=pstLeft(ch); o.add=pstStep(ch,'STR',10); o.left1=pstLeft(ch); o.dec=pstStep(ch,'STR',-2); o.d=Object.assign({},pstD(ch)); o.left2=pstLeft(ch);
    o.under=pstStep(ch,'VIT',-1); o.st0=ch.st.STR;
    o.ok=commitStats(ch,Object.assign({},pstD(ch))); pstPend=null; o.st1=ch.st.STR; o.pts1=ch.pts;
    ch.pts=6; ch.st.LUK=24; o.c24=pstStep(ch,'LUK',5); o.leftL=pstLeft(ch);               // 24→25 = 1, then 2 each: 1+2+2 = 5 → 3 points, 1 left
    pstPend=null; ch.pts=100; ch.st.DEX=48; o.cap=pstStep(ch,'DEX',5); o.capD=pstD(ch).DEX;  // 48→50 only
    pstPend=null; ch.pts=5; ch.st={STR:0,VIT:0,AGI:0,DEX:0,INT:0,LUK:0}; pstStep(ch,'STR',1); o.auto=pstAuto(ch); o.autoD=Object.assign({},pstD(ch)); o.autoLeft=pstLeft(ch);
    const other=newChar('อีกคน','thief'); o.otherD=JSON.stringify(pstD(other)); o.back=JSON.stringify(pstD(ch));
    return o; })()`);
  ok('ตัวใหม่มีแต้ม 5 · +10 ATK เพิ่มได้แค่ 5 (แต้มหมด) · −2 คืน 2 แต้ม', s.left0 === 5 && s.add === 5 && s.left1 === 0 && s.dec === 2 && s.left2 === 2 && deq(s.d, { STR: 3 }), s);
  ok('ลดค่าที่ไม่ได้รอยืนยันไม่ได้ · ยังไม่ยืนยัน = ยังไม่แตะ ch.st', s.under === 0 && s.st0 === 0, s);
  ok('ยืนยัน → commitStats ด้วยค่ารอยืนยัน (ATK 3 · เหลือ 2)', s.ok === true && s.st1 === 3 && s.pts1 === 2, s);
  ok('ราคาตาม statCost: โชค 24 → 27 ใช้ 1+2+2 = 5 แต้ม (จาก 6 เหลือ 1 · แต้มถัดไปราคา 2 จึงหยุด)', s.c24 === 3 && s.leftL === 1, s);
  ok('ไม่เกินเพดาน 50: แม่นยำ 48 +5 ได้แค่ 2', s.cap === 2 && s.capD === 2, s);
  ok('[แจกอัตโนมัติ] แจกแต้มที่เหลือตามแบบแนะนำต่อจากค่าที่รอยืนยัน (จอมเวท INT/DEX)', s.auto === 4 && s.autoLeft === 0 && s.autoD.STR === 1 && (s.autoD.INT | 0) + (s.autoD.DEX | 0) === 4, s);
  ok('ค่ารอยืนยันเป็นของตัวละครตัวเดียว (เปลี่ยนตัว = เริ่มว่าง)', s.otherD === '{}', s);
  const calc = X(`(()=>{ const out={}; for(const c of ${JSON.stringify(CLASSES)}){ const ch=newChar('ทดสอบ',c); ch.inv=[]; ch.eq=svEmptyEq(); const A=pstCalc(ch,ch.st), p=makePlayer(CLS[c]); recalc(p);
      out[c]={a:A.find(r=>r[0]==='พลังโจมตี')[1], hp:A.find(r=>r[0]==='HP')[1], php:Math.round(p.maxHp), spd:A.find(r=>r[0]==='ความเร็ว')[1], pspd:Math.round(p.speed)}; }
    const m=newChar('ทดสอบ','mage'); m.inv=[]; m.eq=svEmptyEq(); const B=pstCalc(m,{STR:10,VIT:5,AGI:0,DEX:40,INT:0,LUK:0}); out.p=B.find(r=>r[0]==='พลังโจมตี')[1]; out.hp=B.find(r=>r[0]==='HP')[1]; out.proj=B.find(r=>r[0]==='กระสุน')[1];
    return out; })()`);
  ok('ตัวอย่างค่าที่คำนวณได้ = recalc จริงของคลาสสิก (ตัวใหม่ทั้ง 5 อาชีพ: พลังโจมตี 100 · HP · ความเร็ว)', CLASSES.every(c => calc[c].a === 100 && calc[c].hp === calc[c].php && calc[c].spd === calc[c].pspd), calc);
  ok('ผลถ้ายืนยัน: ATK 10 → พลังโจมตี 108 · อึด 5 → HP 90+20 · แม่นยำ 40 → กระสุน +1', calc.p === 108 && calc.hp === 110 && calc.proj === '+1', calc);
  const hint = X(`STAT_ORDER.map(pstHint)`);
  ok('คำอธิบายต่อแต้มมาจาก BAL.META_K (ATK +0.8% · อึด HP +4 · ว่องไวสูงสุด 15% · แม่นยำครบ 40 กระสุน +1 · โชค ดรอป +1.2%)',
    /พลังโจมตี \+0\.8%/.test(hint[0]) && /HP \+4/.test(hint[1]) && /สูงสุด 15%/.test(hint[2]) && /ครบ 40 แต้ม: กระสุน \+1/.test(hint[3]) && /ดรอป \+1\.2%/.test(hint[5]), hint);
}

// ------------------------------------------------------------------------------------------------
console.log('§3.5 หน้าสกิล (ข้อมูลที่หน้าแสดง)');
{
  const { X, log } = fresh();
  const m = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','mage'); ch.sp=0; SAVE.chars.push(ch); SAVE.active=ch.id; const o={};
    const t1=pksModel(ch,1), t2=pksModel(ch,2); o.t1=t1.map(g=>[g.a,g.sk.map(r=>r.id+':'+r.r+':'+r.cost+':'+(r.can?1:0)+':'+(r.lock?1:0)),g.pas.map(r=>r.id)]);
    o.t2=t2.map(g=>[g.a.id,g.sk.map(r=>r.id+':'+(r.lock?'L':'-')),g.pas.map(r=>r.id)]); o.lock2=t2[0].sk[0].lock;
    ch.sp=10; ch.sk.flame=2; ch.job='archmage'; const a=pksModel(ch,2); o.job=a.map(g=>g.a.id); o.req=a[0].sk[0].lock; o.reqCan=a[0].sk[0].can;
    ch.sk.flame=3; const b=pksModel(ch,2)[0]; o.met=[b.sk[0].lock,b.sk[0].can,b.sk[0].cost]; o.blz=b.sk[1].lock;
    ch.sk.mbolt=3; o.r3=pksRow(ch,'mbolt',false).cost; ch.sk.mbolt=5; const mx=pksRow(ch,'mbolt',false); o.max=[mx.max,mx.can,mx.cost];
    o.poor=(ch.sp=1,pksRow(ch,'flame',false)); o.next=pksNext(SK.flame,3); o.lv=pksLv(SK.mbolt,1); o.stars=prgStars(3);
    return o; })()`);
  ok('ขั้นต้น (จอมเวท): 4 สกิลของอาชีพ (ศรเวท ★1 ฟรี) + passive สมาธิแห่งรูน · แต้ม 0 = ฝึกไม่ได้แต่ไม่ล็อก',
    deq(m.t1, [[null, ['mbolt:1:1:0:0', 'flame:0:1:0:0', 'frost:0:1:0:0', 'thunder:0:1:0:0'], ['p_runefocus']]]), m.t1);
  ok('ขั้นสูงก่อนเลื่อน: แสดงทั้งสองสาย (สกิล 2 + passive 2 ต่อสาย) ล็อกด้วย "ต้องเลื่อนเป็น…ก่อน"',
    deq(m.t2, [['archmage', ['meteor:L', 'blizzard:L'], ['p_manasea', 'p_starcalm']], ['elementalist', ['vortex:L', 'spikes:L'], ['p_elemweave', 'p_earthpull']]]) && /^ต้องเลื่อนเป็น/.test(m.lock2), m);
  ok('เลื่อนแล้วเหลือสายเดียว · SKILL_REQ: อุกกาบาตต้องหอกเพลิง ★3 (★2 = ล็อก) · ครบแล้วฝึกได้ราคา 1 · พายุหิมะยังล็อก (อุกกาบาต ★2)',
    deq(m.job, ['archmage']) && /ต้องฝึก/.test(m.req) && m.reqCan === false && m.met[0] === '' && m.met[1] === true && m.met[2] === 1 && /ต้องฝึก/.test(m.blz), m);
  ok('ราคา ★: ★3 → ★4 = 2 แต้ม · ★5 = ตัน ฝึกต่อไม่ได้ · แต้มไม่พอ = ฝึกไม่ได้แต่ไม่ล็อก', m.r3 === 2 && m.max[0] === true && m.max[1] === false && m.max[2] === 0 && m.poor.can === false && m.poor.lock === '', m);
  ok('ข้อความ ★ ถัดไปเทียบค่าจาก SK (หอกเพลิง ★3 → ★4) และดาว ★★★☆☆', /→/.test(m.next) && /ดาเมจ/.test(m.lv) && m.stars === '★★★☆☆', m);
  const L = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','thief'); SAVE.chars.push(ch); SAVE.active=ch.id; const ids=CLS.thief.skills, o={ids}; ch.sk={}; for(const id of ids) ch.sk[id]=1; ch.load=[ids[0]];
    o.a1=pksLoadAdd(ch,ids[1],-1); o.a2=pksLoadAdd(ch,ids[2],-1); o.a3=pksLoadAdd(ch,ids[3],-1); o.full=ch.load.slice();
    o.dupe=pksLoadAdd(ch,ids[1],-1);
    o.sw=pksLoadSwap(ch,0,2); o.afterSw=ch.load.slice(); o.swBad=pksLoadSwap(ch,1,1);
    o.del=pksLoadDel(ch,ids[1]); o.afterDel=ch.load.slice();
    ch.load=[ids[0]]; o.last=pksLoadDel(ch,ids[0]);
    ch.job=CLS.thief.adv[0].id; const s=CLS.thief.adv[0].skills; ch.sk[s[0]]=1; ch.sk[s[1]]=1; ch.load=ids.slice();
    o.s=s; o.a5=pksLoadAdd(ch,s[0],-1); o.full5=pksLoadAdd(ch,s[1],-1); o.rep=pksLoadAdd(ch,s[1],0); o.load5=ch.load.slice();
    const m2=newChar('ทดสอบ','mage'); SAVE.chars.push(m2); o.unl=pksLoadAdd(m2,'flame',-1);
    return o; })()`);
  const T = L.ids;
  ok('ใส่สกิลลง loadout (setLoadout) ได้จนเต็ม 4 ช่อง · ใส่ซ้ำไม่ได้', L.a1 && L.a2 && L.a3 && deq(L.full, T) && L.dupe === false, L);
  ok('สลับช่อง 1 ↔ 3 (ช่องแรก = สกิลเริ่มรอบ) · สลับช่องเดียวกันไม่ได้', L.sw === true && L.afterSw[0] === T[2] && L.afterSw[2] === T[0] && L.swBad === false, L);
  ok('ถอดได้ · ถอดตัวสุดท้ายไม่ได้ (ต้องมีอย่างน้อย 1)', L.del === true && L.afterDel.indexOf(T[1]) < 0 && L.last === false, L);
  ok('ขั้นสูง 5 ช่อง: ช่องที่ 5 ใส่ได้ · เต็มแล้วต้องเลือกช่องที่จะแทน · แทนช่อง 1 ได้', L.a5 === true && L.full5 === false && L.rep === true && L.load5[0] === L.s[1] && L.load5.length === 5, L);
  ok('สกิลที่ ★0 ใส่ loadout ไม่ได้', L.unl === false, L);
  // reset through the page: Base < 20 free · confirmBox → resetSkills
  const r = await_(X(`(async()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','mage'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.sp=5; learnSkill(ch,'flame'); learnSkill(ch,'flame');
    const i=prgResetInfo(ch,'sk'); let done=0; prgReset(ch,'sk',()=>done=1); await new Promise(r=>setTimeout(r,5));
    const z=prgResetInfo(ch,'sk'); ch.lv=25; ch.sp=3; learnSkill(ch,'frost'); const f=prgResetInfo(ch,'sk'); ch.resets.skFree=0; const s=prgResetInfo(ch,'sk');
    return {i, done, sk:ch.sk, z, f:[f.way,f.can], s:[s.way,s.can,s.label]}; })()`));
  r.then(v => {
    ok('รีเซ็ตสกิล: Base < 20 ฟรี (confirmBox → resetSkills) แต้มคืนครบ ★1 ฟรียังอยู่ · ไม่มีอะไรให้คืน = ปุ่มปิด',
      v.i.way === 'free' && v.i.can && v.i.spent === 2 && v.done === 1 && v.sk.flame === undefined && v.sk.mbolt === 1 && v.z.can === false, v);
    ok('Base ≥ 20: ฟรีครั้งเดียว แล้วต้องใช้ม้วนลืมเลือน (ไม่มีม้วน = ปุ่มปิด)', deq(v.f, ['freeOnce', true]) && v.s[0] === 'scroll' && v.s[1] === false && /ม้วนลืมเลือน/.test(v.s[2]), v);
  });
  await r;
}

// ------------------------------------------------------------------------------------------------
console.log('§3.4 หน้าอาชีพ (เงื่อนไข · เลื่อนครั้งเดียว)');
{
  const { X, log } = fresh({ document: { querySelector: () => null } });
  const j = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','archer'); SAVE.chars.push(ch); SAVE.active=ch.id; const o={};
    ch.lv=19; ch.jlv=20; o.s19=pjbState(ch,null); ch.lv=20; o.s20=pjbState(ch,null);
    ch.trial.t2=1; SAVE.acct.gold=499; o.poor=pjbState(ch,'ranger'); SAVE.acct.gold=800; o.no=pjbState(ch,null); o.yes=pjbState(ch,'ranger'); o.bad=pjbState(ch,'knight');
    pjbSel='ranger'; pjbAdvance(); o.job=[ch.job,ch.jlv,ch.jxp,SAVE.acct.gold,pjbSel];
    pjbSel='sharpshooter'; pjbAdvance(); o.again=[ch.job,SAVE.acct.gold]; o.after=pjbState(ch,'sharpshooter');
    return o; })()`);
  const sh = s => ({ reqs: s.reqs.map(q => q.ok), all: s.all, trial: s.trial, can: s.can, a: s.a && s.a.id });
  ok('Base 19: บททดสอบยังไม่เปิด · Base 20 + Job 20: ปุ่ม [ไปบททดสอบ] เปิด · เงื่อนไขครบ 4 ข้อจาก jobReqs', sh(j.s19).trial === false && sh(j.s20).trial === true && j.s20.reqs.length === 4 && deq(sh(j.s20).reqs, [true, true, false, false]), [sh(j.s19), sh(j.s20)]);
  ok('ผ่านบททดสอบแต่ทองไม่ถึง 500 = กดค้างไม่ได้ · ครบแล้วต้องเลือกสายก่อน · เลือกสายของอาชีพอื่นไม่ได้', sh(j.poor).can === false && sh(j.no).all === true && sh(j.no).can === false && sh(j.yes).can === true && sh(j.bad).can === false, [sh(j.poor), sh(j.no), sh(j.yes)]);
  ok('กดค้างครบ → advanceJob: เป็นพรานเหยี่ยวลม · Job 1 · หัก 500 ทอง', deq(j.job, ['ranger', 1, 0, 300, null]), j.job);
  ok('เลื่อนซ้ำไม่ได้ (อาชีพเดิม · ทองไม่ลด) · หน้าไม่มีปุ่มกดค้างอีก', deq(j.again, ['ranger', 300]) && j.after.can === false && j.after.a.id === 'ranger' && j.after.reqs.length === 0, j);
  ok('บันทึกทันที (saveNow) · แจ้ง toast', JSON.parse(X(`localStorage.getItem('runeguard.save.guest')`)).chars[0].job === 'ranger' && log.toast.some(t => /พรานเหยี่ยวลม/.test(t[0])), log.toast);
}

// ------------------------------------------------------------------------------------------------
console.log('§2.5 บททดสอบเลื่อนขั้น (MODES.trial)');
{
  const { X, log } = fresh({ document: { querySelector: () => null } });
  // prgGo: the M0 router stub shows nothing → show(); a router that refuses (returns false, e.g. during a run) → no show()
  X(`UI.go=id=>{ return id==='scrNo'?false:undefined; }; prgGo('scrSkills'); prgGo('scrNo'); UI.go=id=>{};`);
  ok('prgGo: router ที่ไม่แสดงหน้า (stub) → show() เอง · router ปฏิเสธ (false ระหว่างรอบ) → ไม่ฝืนแสดง', deq(log.show, ['scrSkills']), log.show);
  X(`SAVE=newSave(null); var TCH=newChar('ทดสอบ','mage'); SAVE.chars.push(TCH); SAVE.active=TCH.id; TCH.lv=20; TCH.jlv=20; TCH.sk={mbolt:5,flame:3,frost:2}; TCH.load=['mbolt','flame','frost'];
    newRun(CLS.mage,'trial',{char:TCH}); G.auto=true;`);
  const a = X(`({b:G.bounds, defK:G.defK, cfg:G.cfg, n:G.enemies.length, sk:P.skills.map(s=>s.id+':'+s.lv), adv:P.adv, p:G.trial.phase, hud:MODES.trial.hud(), cards:G.mode.cards})`);
  const F = X(`[BAL.FIELD.hpByLv(20),BAL.FIELD.dmgByLv(20)]`);
  ok('สนามวงกลม r 650 · defK = 22 + 0.8·Lv (Lv20 = 38) · HP ศัตรู × hpByLv(20) · อัตรา 3 ตัว/วิ · ชนิด shambler/runner/bat/spitter',
    deq(a.b, { k: 'circle', x: 0, y: 0, r: 650 }) && a.defK === 38 && a.cfg.rate === 3 && a.cfg.hpMul === F[0] && a.cfg.dmgMul === F[1] && deq(Object.keys(a.cfg.W).sort(), ['bat', 'runner', 'shambler', 'spitter']), a);
  ok('สกิลเริ่มที่ระดับ ★ ทุกช่องใน loadout (prepareRun rank) · ไม่มีการ์ด · ไม่มีอาชีพกลางรอบ', deq(a.sk, ['mbolt:5', 'flame:3', 'frost:2']) && a.adv === null && a.cards === false && a.n === 6, a);
  ok('HUD: ช่วง 1/2 · เหลือ 1:00', a.hud.wave === 'ช่วง 1/2 · เอาตัวรอด' && a.hud.time === 'เหลือ 1:00' && /บททดสอบ · Lv 20/.test(a.hud.lv), a.hud);
  // 60 s of the mode loop (the parts of update() that matter: clock, mode, timers)
  const s = X(`(()=>{ const out={spawn:0, out:0, types:{}, hpOk:true, wAt:null}; let seen=G.enemies.length;
    for(let i=0;i<60*62;i++){ G.t+=1/60; G.mode.update(1/60); updateTimers(1/60);
      for(let j=seen;j<G.enemies.length;j++){ const e=G.enemies[j]; if(e.boss) continue; out.spawn++; out.types[e.type]=1; if(Math.hypot(e.x,e.y)>650) out.out++;
        if(Math.abs(e.hp-e.d.hp*BAL.FIELD.hpByLv(20))>1e-9) out.hpOk=false; }
      seen=G.enemies.length; if(G.trial.warden&&out.wAt===null) out.wAt=+G.t.toFixed(2); if(G.t<59.9) out.at60=out.spawn; }
    const w=G.trial.warden; return Object.assign(out,{w:w&&{type:w.type,hp:w.hp,boss:w.boss,ai:w.d.ai,base:w.d.base}, bosses:G.bosses.length, boss:G.boss, hud:MODES.trial.hud(), p:G.trial.phase}); })()`);
  ok('60 วิแรก: ศัตรูเกิด ~3 ตัว/วิ (180 ± 3) อยู่ในวงสนามทั้งหมด · HP × hpByLv(20) ทุกตัว', Math.abs(s.at60 - 180) <= 3 && s.out === 0 && s.hpOk && deq(Object.keys(s.types).sort(), ['bat', 'runner', 'shambler', 'spitter']), s);
  ok('ครบ 60 วิ: ผู้คุมเกิด 1 ตัว · HP 700·hpByLv(20) · colossus AI · แถบบอส', Math.abs(s.wAt - 60) < 0.05 && s.w.type === 'trial_warden' && Math.abs(s.w.hp - 700 * F[0]) < 1e-6 && s.w.ai === 'colossus' && s.w.boss === true && s.bosses === 1 && s.boss === true && s.hud.time === 'บอส!', s);
  const d = X(`(()=>{ const o={}; o.d1=MODES.trial.onDeath(); G.trial.warden.dead=true; G.t+=1/60; G.mode.update(1/60); o.p=G.trial.phase; o.d3=MODES.trial.onDeath(); o.hp=P.hp;
    for(let i=0;i<100;i++){ G.t+=1/60; G.mode.update(1/60); updateTimers(1/60); } return o; })()`);
  ok('ล้มผู้คุม → ช่วงจบ · ตายในช่วงนี้ไม่กลายเป็นแพ้ (onDeath) · endRun(true) หลัง 1.4 วิ', d.d1 === false && d.p === 3 && d.d3 === true && d.hp === 1 && deq(log.end, [true]), [d, log.end]);
  const rw = X(`(()=>{ const sim=onRunEnd(G,true,{commit:false}); const t0=TCH.trial.t2; const g0=SAVE.acct.gold, x0=TCH.xp;
    G.runId='r_test_1'; const r=onRunEnd(G,true,{commit:true}); return {sim:[sim.unlocks,sim.committed,t0], r:[r.unlocks,r.committed,r.baseXp,r.jobXp,r.gold,r.items.length], t2:TCH.trial.t2, gold:SAVE.acct.gold-g0, xp:TCH.xp-x0,
      stored:JSON.parse(localStorage.getItem('runeguard.save.guest')).chars[0].trial.t2, end:MODES.trial.end(true).rows().map(q=>q.join(':'))}; })()`);
  ok('ชนะ (ไม่ commit เช่น sim): ปลดไว้ใน Reward แต่ยังไม่ตั้ง t2', deq(rw.sim, [['trial:t2'], false, 0]), rw.sim);
  ok('ชนะ (commit): ch.trial.t2 = 1 ผ่าน onRunEnd/grantRewards ของ lane C · บันทึกลงเซฟ · ไม่มี EXP / ทอง / ของ', rw.t2 === 1 && rw.stored === 1 && deq(rw.r, [['trial:t2'], true, 0, 0, 0, 0]) && rw.gold === 0 && rw.xp === 0, rw);
  ok('หน้าจบ: "ปลดการเลื่อนอาชีพแล้ว"', rw.end[0] === 'ผล:ปลดการเลื่อนอาชีพแล้ว', rw.end);
  // loss: free retry, nothing changes
  const lo = X(`(()=>{ TCH.trial.t2=0; const before=JSON.stringify(TCH); newRun(CLS.mage,'trial',{char:TCH}); G.auto=true; G.runId='r_test_2'; const r=onRunEnd(G,false,{commit:true});
    const a=JSON.parse(before), b=JSON.parse(JSON.stringify(TCH)); const diff=Object.keys(a).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));
    return {u:r.unlocks, t2:TCH.trial.t2, xp:[r.baseXp,r.jobXp,r.gold], diff, rows:MODES.trial.end(false).rows()[0][1]}; })()`);
  ok('แพ้: ไม่ปลด · ไม่มีค่าปรับ (EXP/ทอง/ของไม่ลด · เปลี่ยนแค่สถิติเวลาเล่น/การตาย)', lo.u.length === 0 && lo.t2 === 0 && deq(lo.xp, [0, 0, 0]) && lo.diff.every(k => ['play', 'kills', 'deaths'].includes(k)) && /ลองใหม่ได้ฟรี/.test(lo.rows), lo);
  // trialStart guard + dispose → job page
  const ts = await_(X(`(async()=>{ const calls=[]; startRun=(...a)=>calls.push([a[0],a[1],a[2]&&a[2].char===TCH]); const o={};
    TCH.lv=19; o.lo=trialStart(TCH); TCH.lv=20; o.hi=trialStart(TCH); TCH.job='archmage'; o.adv=trialStart(TCH); TCH.job=null;
    o.calls=calls; return o; })()`));
  ts.then(v => {
    ok('trialStart: ก่อน Base 20 + Job 20 หรือหลังเลื่อนอาชีพ = ไม่เริ่ม (toast) · ครบ = startRun(cls, "trial", {char})', v.lo === false && v.hi === true && v.adv === false && deq(v.calls, [['mage', 'trial', true]]), v);
  });
  await ts;
}

function await_(p) { return Promise.resolve(p); }
console.log(`\nผล: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
