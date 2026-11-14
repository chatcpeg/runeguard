// test/67-clock.test.mjs — tester r6 (ล่าบอส): the day / week of the daily counters only moves forward · leaving a boss run keeps
// what is won · one element rune per body piece · bsUsed with two keys · fake boss times · hit cap · แม่เถาวัลย์ takes root
//   node test/67-clock.test.mjs
// Runs the whole game headless (test/_headless.mjs). The clock is moved with Date.now (whole days: the same time of day).
import { loadGame } from './_headless.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
// a fresh game + one character + a movable clock (CLK(k) = the clock k days from now)
function game(o = {}) {
  const g = loadGame(), X = g.X, lv = o.lv || 30;
  X(`(()=>{ const real=Date.now.bind(Date); globalThis.__off=0; Date.now=()=>real()+globalThis.__off*864e5;
    SAVE=newSave(null); const ch=newChar('นาฬิกา','${o.cls || 'mage'}'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.lv=${lv}; ch.pts=BAL.ptsAt(ch.lv);
    const d=pgAutoStats(ch,ch.pts); for(const k in d) ch.st[k]=(ch.st[k]|0)+d[k]; ch.pts=0;
    const c=CLS[ch.cls]; ch.sk={}; for(const id of c.skills.slice(0,5)) ch.sk[id]=5; ch.load=c.skills.slice(0,5);
    SAVE.acct.bossUnlock={colossus:1,lich:1,king:1}; SAVE.acct.fboss={g1:{next:0,kills:1}}; return ch.id; })()`);
  g.CLK = k => X(`(()=>{ globalThis.__off=${k}; return svDay(); })()`);
  return g;
}
// one won fight on colossus (ปกติ): the boss fights 3.5 s (a real time for the record), then dies · → {full, left}
const fight = X => X(`(()=>{ initAudio(); bossStart('colossus',0); G.god=true; for(let i=0;i<60*2.2&&G.bs.phase==='wait';i++) update(1/60); for(let i=0;i<60*3.5;i++) update(1/60);
  for(const b of G.bosses) if(!b.dead) damageEnemy(b,1e12,null,{}); for(let i=0;i<60*4&&!G.over;i++){ update(1/60); if(G.ui==='level'){ G.ui=null; G.pendingLv=0; } }
  const R=G.rewards, k=R&&R.boss.kills[0]; toTitle(); return {won:!!(R&&R.st.won), full:!!(k&&k.full), committed:!!(R&&R.committed), left:bsFullLeft('colossus'), day:SAVE.acct.daily.day}; })()`);

console.log('กติกาวัน: svDayState / svDayCur · วันในเซฟล้ำหน้ากี่วันก็นับเป็นวันนี้ (≤ 400) · เกินนั้น = ขยะ · validate');
{
  const { X } = game();
  const r = X(`(()=>{ const t='2026-11-14', a=n=>svDayAdd(t,n);
    return {st:[svDayState(t,t), svDayState(a(1),t), svDayState(a(7),t), svDayState(a(400),t), svDayState(a(401),t), svDayState(a(-1),t), svDayState('',t), svDayState(null,t), svDayState('2026-02-30',t), svDayState('2026-13-01',t), svDayState('abc',t)],
      cur:[svDayCur(a(30),t), svDayCur(a(-1),t)],
      wk:[svWeekState(svWeek(), undefined), svWeekState(svWeek(Date.now()+7*864e5)), svWeekState(svWeek(Date.now()-7*864e5)), svWeekState(svWeek(Date.now()+500*864e5)), svWeekState(''), svWeekState('2026-W60')],
      v:['2026-11-14','2026-02-30','2026-1-1','2150-01-01','9999-12-31',' 2026-11-14',42].map(d=>validateSave({v:8, acct:{daily:{day:d}}, chars:[]}).acct.daily.day),
      w:['2026-W46','2026-W00','2026-W54','2150-W10','x'].map(w=>validateSave({v:8, acct:{daily:{rushWeek:w}}, chars:[]}).acct.daily.rushWeek),
      clock2101:svDayState('2100-12-31','2101-03-01'), idem:JSON.stringify(validateSave(validateSave({v:8, acct:{daily:{day:'2150-01-01', rushWeek:'2150-W10'}}, chars:[]})).acct.daily)}; })()`);
  ok('วันเดียวกัน / ล้ำหน้า 1 · 7 · 400 วัน = วันนี้ · 401 วัน = ขยะ · ย้อนหลัง / ว่าง / วันที่ไม่มีจริง = วันใหม่',
    JSON.stringify(r.st) === JSON.stringify(['cur', 'cur', 'cur', 'cur', 'junk', 'old', 'old', 'old', 'old', 'old', 'old']), r.st);
  ok('svDayCur: ล้ำหน้า 30 วันยังเป็นวันนี้ (เดิมเกิน 1 วัน = รีเซ็ต) · เมื่อวาน = ไม่ใช่', r.cur[0] === true && r.cur[1] === false, r.cur);
  ok('สัปดาห์: สัปดาห์นี้ / ล้ำหน้า = ใช้แล้ว · ก่อนหน้า / ว่าง / ขยะรูปแบบ = ใหม่ · ล้ำหน้าเกิน 400 วัน = ขยะ', JSON.stringify(r.wk) === JSON.stringify(['cur', 'cur', 'old', 'junk', 'old', 'old']), r.wk);
  ok('validateSave: วันจริงเท่านั้น · เกินปี 2100 → 2100-12-31 (ขยะ ไม่ใช่วันว่างที่ได้สิทธิ์ใหม่)', JSON.stringify(r.v) === JSON.stringify(['2026-11-14', '', '', '2100-12-31', '2100-12-31', '', '']), r.v);
  ok('validateSave: สัปดาห์ W01–W53 · เกินปี 2100 → 2100-W52 · validate ซ้ำได้ผลเดิม', JSON.stringify(r.w) === JSON.stringify(['2026-W46', '', '', '2100-W52', '']) && r.idem === '{"day":"2100-12-31","surv":{},"boss":{},"rushWeek":"2100-W52","dg":{}}', [r.w, r.idem]);
  ok('นาฬิกาเลยปี 2100: วันในเซฟ 2100-12-31 ยังเป็นวันนี้ (ไม่ได้สิทธิ์ใหม่ทุกครั้งที่โหลด)', r.clock2101 === 'cur', r.clock2101);
}

console.log('ล่าบอส: เลื่อนนาฬิกา +7 / กลับ / −7 / +2 / +7 ไม่ได้รางวัลเต็มซ้ำ · +8 ได้ใหม่ · ขยะ +500 → วันนี้ใช้ครบ');
{
  const g = game({ lv: 22 }), { X, CLK } = g, seq = [];
  const run = (off, n) => { CLK(off); for (let i = 0; i < n; i++) seq.push(Object.assign({ off }, fight(X))); };
  run(0, 4); run(7, 4); run(0, 2); run(-7, 1); run(2, 1); run(7, 1);
  const fulls = seq.filter(s => s.full).length, firstBad = seq.findIndex(s => !s.won || !s.committed);
  ok('ทุกรอบจบชนะและบันทึกรางวัล', firstBad < 0, seq[firstBad]);
  ok('วันจริง: รางวัลเต็ม 3 ครั้ง ครั้งที่ 4 ไม่เต็ม', seq.slice(0, 4).map(s => s.full).join() === 'true,true,true,false', seq.slice(0, 4));
  ok('+7 วัน: วันใหม่ ได้เต็มอีก 3 (ยืมวันอนาคต)', seq.slice(4, 8).map(s => s.full).join() === 'true,true,true,false' && seq[7].day === CLK(7), seq.slice(4, 8));
  ok('ถอยกลับวันจริง / −7 / +2 / +7: ไม่ได้รางวัลเต็มเลย · วันในเซฟค้างที่ +7', seq.slice(8).every(s => !s.full && s.left === 0 && s.day === CLK(7)), seq.slice(8));
  ok('รวมทั้งชุด = 6 ครั้ง (ไม่ใช่ 3 ต่อการเลื่อนนาฬิกาแต่ละครั้ง)', fulls === 6, fulls);
  CLK(8); const d8 = fight(X);
  ok('+8 วัน (เลยวันในเซฟแล้ว): รางวัลเต็มกลับมา', d8.full && d8.left === 2, d8);
  CLK(600); const j1 = fight(X); CLK(8); const j2 = X(`bsFullLeft('colossus')`), j3 = fight(X); CLK(9); const j4 = X(`bsFullLeft('colossus')`);
  ok('ขยะ (+600 แล้วกลับ): วันนี้ถือว่าใช้ครบ (เหลือ 0) · รอบนั้นได้ 15% · เซฟจดวันนี้ · พรุ่งนี้กลับมาเต็ม 3', j1.full && j2 === 0 && !j3.full && j3.day === CLK(8) && j4 === 3, { j1, j2, j3, j4 });
}

console.log('ฝ่าด่านบอส: โบนัสสัปดาห์เดินหน้าอย่างเดียว');
{
  const { X, CLK } = game({ lv: 26 });
  const bonus = () => X(`(()=>{ const A=SAVE.acct, f=bsRushFree(); bsCommit(curChar(),{boss:{kills:[], rushBonus:f}},A); return f; })()`);
  const out = [];
  CLK(7); out.push(['+7', bonus()]);
  for (const k of [0, -7, 2, 7]) { CLK(k); out.push([k, bonus()]); }
  CLK(14); out.push(['+14', bonus()]); CLK(14); out.push(['+14 อีกครั้ง', bonus()]);
  ok('+7 รับโบนัส · กลับ 0 / −7 / +2 / +7 ไม่ได้ · +14 (สัปดาห์ถัดไป) ได้ครั้งเดียว', out.map(x => x[1]).join() === 'true,false,false,false,false,true,false', out);
  const j = X(`(()=>{ const A=SAVE.acct; globalThis.__off=0; A.daily.rushWeek=svWeek(Date.now()+500*864e5); const a=bsRushFree(); svDayRoll(A); const b=[A.daily.rushWeek===svWeek(), bsRushFree()]; globalThis.__off=7; return [a, b, bsRushFree()]; })()`);
  ok('สัปดาห์ขยะ (+500 วัน): สัปดาห์นี้ไม่ได้ · จดเป็นสัปดาห์นี้ตอนบันทึกถัดไป · สัปดาห์หน้าได้', JSON.stringify(j) === '[false,[true,false],true]', j);
  const m = X(`(()=>{ const A=SAVE.acct; globalThis.__off=0; A.daily.rushWeek=svWeek(Date.now()+14*864e5); bsCommit(curChar(),{boss:{kills:[], rushBonus:true}},A); return A.daily.rushWeek===svWeek(Date.now()+14*864e5); })()`);
  ok('bsCommit ไม่ถอยสัปดาห์ในเซฟกลับ', m === true, m);
}

console.log('ด่านรายวัน: เลื่อนนาฬิกา +7 / กลับ / −7 / +2 / +7 ไม่ได้สิทธิ์ซ้ำ · +8 ได้ใหม่');
{
  const { X, CLK } = game({ lv: 30 });
  const enter = () => X(`(()=>{ const ok=dgEnter('exp',0); if(G) toTitle(); return ok; })()`);
  const seq = [];
  for (const [k, n] of [[0, 3], [7, 3], [0, 1], [-7, 1], [2, 1], [7, 1], [8, 3]]) { CLK(k); for (let i = 0; i < n; i++) seq.push(enter()); }
  ok('วันจริง 2 · +7 อีก 2 · กลับ 0 / −7 / +2 / +7 = 0 · +8 ได้ 2', seq.join() === 'true,true,false,true,true,false,false,false,false,false,true,true,false', seq);
  const j = X(`(()=>{ globalThis.__off=0; const A=SAVE.acct; A.daily.day=svDay(Date.now()+700*864e5); A.daily.dg={}; const a=dgLeft('exp'); const e=dgEnter('exp',0); if(G) toTitle();
    globalThis.__off=1; const b=dgLeft('exp'); globalThis.__off=0; const fix=dgDayFix(), st=[A.daily.day===svDay(), dgLeft('exp')]; globalThis.__off=1; return [a, e, b, fix, st, dgLeft('exp')]; })()`);
  ok('วันขยะ (+700): วันนี้ถือว่าใช้ครบ (พรุ่งนี้ก็ยังขยะถ้าไม่มีการบันทึก) · เปิดหน้าด่านรายวัน = จดวันนี้ใช้ครบ · พรุ่งนี้ได้ 2', JSON.stringify(j) === '[0,false,0,true,[true,0],2]', j);
}

console.log('เอาชีวิตรอด: โบนัส ×2 รายวันต่อระดับ ไม่ได้ซ้ำเมื่อเลื่อนนาฬิกา');
{
  const { X, CLK } = game({ lv: 12 });
  let n = 0; const surv = () => X(`(()=>{ const ch=curChar(); const r=onRunEnd({char:ch, modeId:'survival', tier:0, wave:10, kills:50, t:200, runId:'r_clock'+(++globalThis.__n), loot:[], goldRun:0, player:{hp:10}},false,{commit:true}); return {d:r.daily, hub:hbSurvInfo(ch,0,SAVE.acct,svDay()).daily}; })()`);
  X('globalThis.__n=0');
  const seq = [];
  for (const [k, m] of [[0, 2], [7, 2], [0, 1], [-7, 1], [2, 1], [7, 1], [8, 1]]) { CLK(k); for (let i = 0; i < m; i++) { seq.push(surv().d); n++; } }
  ok('วันจริง ×2 ครั้งแรก · +7 ครั้งแรก · กลับ 0 / −7 / +2 / +7 ไม่มี · +8 มี', seq.join() === 'true,false,true,false,false,false,false,false,true', seq);
  CLK(8); const h = X(`hbSurvInfo(curChar(),0,SAVE.acct,svDay()).daily`); CLK(9); const h2 = X(`hbSurvInfo(curChar(),0,SAVE.acct,svDay()).daily`);
  ok('หน้าเลือกระดับบอกตรงกัน (+8 ใช้แล้ว · +9 ยังไม่ใช้)', h === false && h2 === true, [h, h2]);
}

console.log('ออกกลางรอบล่าบอส: ปุ่มบอกว่ารับรางวัลหรือไม่ · กลับป้อม/เริ่มใหม่ หลังปราบแล้วได้รางวัล · ไม่จ่ายซ้ำ');
{
  const { X } = game({ lv: 30 });
  const r = X(`(()=>{ initAudio(); Math.random=mulberry(7); const A=SAVE.acct, o={};
    bossStart('colossus',0); G.god=true; o.m0=Object.assign({},G.mode.menuText); for(let i=0;i<60*2.2;i++) update(1/60);
    const g0=A.gold; toTitle(); o.leave0={gold:A.gold-g0, used:bsUsed('colossus'), g:G===null};
    bossStart('colossus',0); G.god=true; for(let i=0;i<60*5.5;i++) update(1/60); for(const b of G.bosses) damageEnemy(b,1e12,null,{}); for(let i=0;i<30;i++) update(1/60);
    o.phase=G.bs.phase; o.over=G.over; o.m1=Object.assign({},G.mode.menuText); const g1=A.gold, m1=A.marks; toTitle();
    o.leave1={gold:A.gold-g1, marks:A.marks-m1, used:bsUsed('colossus'), rec:!!bsRec('colossus',0)};
    bossStart('colossus',0); G.god=true; for(let i=0;i<60*5.5;i++) update(1/60); for(const b of G.bosses) damageEnemy(b,1e12,null,{}); for(let i=0;i<60*4&&!G.over;i++) update(1/60);
    const g2=A.gold; o.end=G.over; toTitle(); o.leave2={gold:A.gold-g2, used:bsUsed('colossus')};
    return o; })()`);
  ok('ยังไม่ปราบ: ปุ่ม "กลับป้อม (ไม่รับรางวัล)" / "เริ่มใหม่ (ไม่รับรางวัล)" · ออกแล้วไม่มีรางวัล', /ไม่รับรางวัล/.test(r.m0.btnMenuP) && /ไม่รับรางวัล/.test(r.m0.btnRestartP) && r.leave0.gold === 0 && r.leave0.used === 0 && r.leave0.g, r);
  ok('บอสเดี่ยว: ล้มแล้ว (ช่วง 1.6 วิก่อนหน้าจบ) ปุ่มบอก "รับรางวัล 1 ตัว"', r.phase === 'done' && !r.over && /รับรางวัล 1 ตัว/.test(r.m1.btnMenuP) && /รับรางวัล 1 ตัว/.test(r.m1.btnRestartP), r);
  ok('กลับป้อมในช่วง 1.6 วินั้น: ได้ทอง + ตรา 4 · นับสิทธิ์ 1 · เก็บสถิติเวลา', r.leave1.gold > 0 && r.leave1.marks === 4 && r.leave1.used === 1 && r.leave1.rec, r.leave1);
  ok('จบรอบตามปกติแล้วกดกลับป้อม: ไม่จ่ายซ้ำ', r.end && r.leave2.gold === 0 && r.leave2.used === 2, r.leave2);
  const q = X(`(()=>{ initAudio(); Math.random=mulberry(8); SAVE.acct.fboss.g1={next:0,kills:1}; curChar().lv=26; const A=SAVE.acct, o={};
    bossRushStart(); const S=G.bs; G.god=true; o.list=S.list.slice(); for(let i=0;i<60*5.5;i++) update(1/60); for(const b of G.bosses) damageEnemy(b,1e12,null,{}); for(let i=0;i<20;i++){ update(1/60); G.pendingLv=0; if(G.ui==='level') G.ui=null; }
    o.phase=S.phase; o.m=Object.assign({},G.mode.menuText); const g0=A.gold, u0=bsUsed(o.list[0]), first=o.list[0];
    startRun(G.cls.id,G.modeId,G.opts);                                  // = เมนูพัก → เริ่มใหม่ (23: no mode.again for boss)
    o.restart={gold:A.gold-g0, used:bsUsed(first)-u0, fresh:G.bs.kills.length===0&&G.bs.i===0&&!G.over};
    for(let i=0;i<60*2.2;i++) update(1/60); const g1=A.gold; toTitle(); o.noKill=A.gold-g1;
    return o; })()`);
  ok('ฝ่าด่าน: ปราบตัวแรกแล้ว ปุ่มบอก "รับรางวัล 1 ตัว"', q.phase === 'gap' && /รับรางวัล 1 ตัว/.test(q.m.btnMenuP), q);
  ok('ฝ่าด่าน: เริ่มใหม่หลังปราบตัวแรก = ได้รางวัลตัวนั้นก่อน แล้วเริ่มรอบใหม่สะอาด · ออกรอบใหม่ที่ยังไม่ปราบ = ไม่มีรางวัล', q.restart.gold > 0 && q.restart.used === 1 && q.restart.fresh && q.noKill === 0, q);
}

console.log('เซฟแก้เอง: รูนธาตุ 1 อันต่อชิ้น · bsUsed key ซ้ำ = ค่าสูงสุด · สถิติเวลาปลอมไม่ปลดความยาก');
{
  const { X } = game({ lv: 30 });
  const s = X(`(()=>{ const body=Object.keys(ITEMS).find(id=>ITEMS[id].slot==='body'&&((ITEMS[id].sockRoll?ITEMS[id].sockRoll[1]:ITEMS[id].sock)|0)>=2);
    const fits=id=>RUNE_GROUP[RUNES[id].g].slots.indexOf('body')>=0, el=Object.keys(RUNES).filter(id=>RUNES[id].el&&fits(id)), pl=Object.keys(RUNES).filter(id=>!RUNES[id].el&&fits(id));
    const v=sock=>{ const s=newSave(null), ch=newChar('รูน','mage'); ch.inv.push({u:'i_body1', id:body, r:0, f:0, s:sock, lk:0}); s.chars.push(ch); return validateSave(s).chars[0].inv.find(x=>x.u==='i_body1').s; };
    return {body, n:[el.length, pl.length], two:v([el[0],el[1]]), same:v([el[0],el[0]]), mix:v([pl[0],el[0]]), mix2:v([el[0],pl[0]]), one:v([el[1],null]), want:[el[0],el[1],pl[0]]}; })()`);
  ok('เสื้อที่มีรูนธาตุ 2 อัน: อันที่สองเป็น null', s.body && s.n[0] >= 2 && JSON.stringify(s.two) === JSON.stringify([s.want[0], null]) && JSON.stringify(s.same) === JSON.stringify([s.want[0], null]), s);
  ok('รูนธรรมดา + รูนธาตุ อยู่ได้ทั้งคู่ (ลำดับไหนก็ได้) · รูนธาตุอันเดียวไม่ถูกแตะ', JSON.stringify(s.mix) === JSON.stringify([s.want[2], s.want[0]]) && JSON.stringify(s.mix2) === JSON.stringify([s.want[0], s.want[2]]) && JSON.stringify(s.one) === JSON.stringify([s.want[1], null]), s);
  const u = X(`(()=>{ const A=SAVE.acct; A.daily.day=svDay(); A.daily.boss={'colossus:1':1, 'colossus:3':1, 'lich:2':1}; const a=[bsUsed('colossus'), bsUsed('lich'), bsFullLeft('colossus')];
    A.daily.boss={'colossus:3':1, 'colossus:1':1}; const b=bsUsed('colossus'); bsCountAdd(A,'colossus'); const c=Object.keys(A.daily.boss).join();
    A.daily.boss={'all:99':1, 'lich:1':1}; const d=[bsUsed('colossus'), bsUsed('lich')]; return {a, b, c, d}; })()`);
  ok('bsUsed: colossus:1 กับ colossus:3 → 3 (ลำดับไหนก็ได้) · บวกต่อ = colossus:4 อันเดียว', JSON.stringify(u.a) === '[3,2,0]' && u.b === 3 && u.c === 'colossus:4', u);
  ok('all:99 (วันขยะ) นับเป็นใช้ครบทุกบอส', u.d[0] === 99 && u.d[1] === 99, u.d);
  const f = X(`(()=>{ const A=SAVE.acct; const s=JSON.parse(JSON.stringify(SAVE)); s.acct.records.boss={colossus:{0:{sec:0.0001, medal:'S'}}, lich:{0:{sec:2.9, medal:'S'}, 1:{sec:3, medal:'A'}}};
    const o=validateSave(s); const out={v:o.acct.records.boss};
    A.records.boss={colossus:{0:{sec:0.0001, medal:'S'}}}; out.mem=[bsDiffWhy('colossus',1)!=='', !!bsRec('colossus',0)];
    bsCommit(curChar(),{boss:{kills:[{id:'colossus', d:0, sec:41, full:false}, {id:'lich', d:0, sec:1, full:false}]}},A); out.after=[A.records.boss.colossus[0].sec, bsDiffWhy('colossus',1), !!(A.records.boss.lich&&A.records.boss.lich[0])];
    A.records.boss.colossus[0]={sec:3, medal:'S'}; out.three=bsDiffWhy('colossus',1); return out; })()`);
  ok('validateSave: เวลาต่ำกว่า 3 วิ → 0 เหรียญ B · 3 วิขึ้นไปเก็บไว้', f.v.colossus[0].sec === 0 && f.v.colossus[0].medal === 'B' && f.v.lich[0].sec === 0 && f.v.lich[1].sec === 3 && f.v.lich[1].medal === 'A', f.v);
  ok('สถิติ {sec:0.0001} ในหน่วยความจำ: ไม่ปลดยาก · เวลาจริง 41 วิแทนที่ได้ · เวลาจริงต่ำกว่า 3 วิไม่ถูกบันทึก · 3 วิ = ปลด', f.mem.join() === 'true,false' && f.after[0] === 41 && f.after[1] === '' && f.after[2] === false && f.three === '', f);
}

console.log('ดาเมจต่อครั้งในล่าบอส: ปกติ/ยาก ≤ 30% HP สูงสุด · ฝันร้าย / โหมดอื่นไม่จำกัด · แม่เถาวัลย์หยั่งราก');
{
  const { X } = game({ lv: 40 });
  const h = X(`(()=>{ initAudio(); Math.random=mulberry(3); const out={};
    const hit=(d,dmg)=>{ DEV.boss.start('colossus',d); P.dodge=0; P.shield=0; P.hp=P.maxHp; hurtPlayer(dmg,null); const r=(P.maxHp-P.hp)/P.maxHp; toTitle(); return Math.round(r*1000)/1000; };
    out.n=hit(0,1e6); out.h=hit(1,1e6); out.nm=hit(2,1e6); out.small=hit(1,5);
    startRun('mage'); P.dodge=0; P.shield=0; const hp=P.hp; hurtPlayer(1e6,null); out.classic=P.hp<=0; G=null; P=null;
    return out; })()`);
  ok('ปกติ / ยาก: ดาเมจก้อนใหญ่เหลือ 30% ของ HP สูงสุด', Math.abs(h.n - .3) < .002 && Math.abs(h.h - .3) < .002, h);
  ok('ฝันร้ายไม่จำกัด · ดาเมจเล็กไม่ถูกแตะ · คลาสสิกไม่จำกัด', h.nm >= .99 && h.small < .05 && h.small > 0 && h.classic, h);
  const v = X(`(()=>{ initAudio(); Math.random=mulberry(4); DEV.boss.start('fb_vinemother',0); G.god=true; const seen={}; let kn=0, rootF=0;
    for(let i=0;i<60*20;i++){ update(1/60); const e=G.bosses.find(b=>!b.dead); if(!e) continue; seen[BS_VINE.keep]=1; if(e.ai.root>0){ rootF++; if(e.kx||e.ky) kn++; } }
    toTitle(); return {keeps:Object.keys(seen).sort().join(), rootF, kn}; })()`);
  ok('แม่เถาวัลย์: ระยะถอย 120 สลับกับหยั่งราก (ไม่ถอย · ไม่โดนกระเด็น) ใน 20 วิ', v.keeps === '0,120' && v.rootF > 60 * 3 && v.kn === 0, v);
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
