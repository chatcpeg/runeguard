// test/66-boss.test.mjs (lane H) — ล่าบอส (MODES.boss): data, unlocks, arena + bounds, field bosses in the arena, rush,
// rewards + daily full-reward cap, records, save validation, classic untouched
//   node test/66-boss.test.mjs
// Runs the whole game headless (test/_headless.mjs: real src/js + a fake DOM) — real startRun / update() / endRun / grantRewards.
import { loadGame } from './_headless.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
// a fresh game + one character (level, ★ of its first skills, stats auto) · o.open = unlock every boss on the account
function game(o = {}) {
  const g = loadGame(), X = g.X, lv = o.lv || 30, r = o.sk || (lv >= 20 ? 5 : 4);
  X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','${o.cls || 'mage'}'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.lv=${lv}; ch.pts=BAL.ptsAt(ch.lv);
    const d=pgAutoStats(ch,ch.pts); for(const k in d) ch.st[k]=(ch.st[k]|0)+d[k]; ch.pts=0;
    const c=CLS[ch.cls]; ch.sk={}; for(const id of c.skills.slice(0,${lv >= 20 ? 5 : 4})) ch.sk[id]=${r}; ch.load=c.skills.slice(0,5).filter(id=>ch.sk[id]);
    ${o.open ? "SAVE.acct.bossUnlock={colossus:1,lich:1,king:1}; SAVE.acct.fboss={g1:{next:0,kills:1},s1:{next:0,kills:1},o1:{next:0,kills:1}};" : ''} return ch.id; })()`);
  return g;
}
const step = (X, sec, auto) => X(`(()=>{ ${auto ? 'G.auto=true;' : ''} for(let i=0;i<${Math.round(sec * 60)}&&!G.over;i++){ update(1/60); ${auto ? 'autoUI();' : ''} } ${auto ? 'G.auto=false;' : ''} return G.over; })()`);
// a fight that the test decides: god mode, the boss killed outright after it appears, then the frames that end the run (not auto → committed)
const winNow = X => X(`(()=>{ G.god=true; for(let i=0;i<60*3&&G.bs.phase==='wait';i++) update(1/60); for(const b of G.bosses) if(!b.dead) damageEnemy(b,1e12,null,{});
    for(let i=0;i<60*4&&!G.over;i++){ update(1/60); if(G.ui==='level'){ G.ui=null; G.pendingLv=0; } if(G.bs.phase==='fight'&&G.bosses.length&&G.bosses.some(b=>!b.dead)) for(const b of G.bosses) if(!b.dead) damageEnemy(b,1e12,null,{}); }
    return {over:G.over, won:G.won, r:G.rewards}; })()`);

console.log('ข้อมูล: บอส 9 ตัว · ภาพจาก 12a · ตัววาดสำรอง · AI · ชื่อไทย');
{
  const { X } = game();
  const r = X(`(()=>{ const bad=[], ids=BOSS_LIST.map(b=>b.id);
    for(const B of BOSS_LIST){ const d=EN[B.en]; if(!d){ bad.push(B.id+':EN'); continue; } if(!d.boss) bad.push(B.id+':boss'); if(d.n!==B.n) bad.push(B.id+':n');
      if(!artKeyEN(B.en)) bad.push(B.id+':art'); if(!(EDRAW[d.base||B.en])) bad.push(B.id+':paint'); if(d.ai&&!BOSSAI[d.ai]) bad.push(B.id+':ai');
      if(!/^[\\u0E00-\\u0E7F ]+$/.test(B.n)) bad.push(B.id+':thai'); if(B.par.length!==BAL.BOSS.diff.length) bad.push(B.id+':par'); if(!TER_BIOME[B.biome]) bad.push(B.id+':biome'); }
    return {n:BOSS_LIST.length, bad, uniq:new Set(ids).size, ids, art:BOSS_LIST.map(B=>artKeyEN(B.en)), sorted:BOSS_LIST.every((b,i)=>!i||b.lv>=BOSS_LIST[i-1].lv)}; })()`);
  ok('BOSS_LIST: คลาสสิก 3 + จ้าวถิ่นแผนที่ 3 + จ้าวถิ่นรุ่นเก่า 3 · id ไม่ซ้ำ · เรียงตามเลเวล', r.n === 9 && r.uniq === 9 && r.sorted && ['colossus', 'lich', 'king', 'gb_king', 'sb_queen', 'ob_warlord', 'fb_ramking', 'fb_vinemother', 'fb_isleback'].every(i => r.ids.includes(i)), r.ids);
  ok('ทุกตัวอยู่ใน EN (boss:1) ชื่อไทยตรงกัน · ใช้ภาพ b_* / gb_king / sb_queen / ob_warlord / fb_* ผ่าน d.art · มีตัววาดเวกเตอร์ · AI มีตัวทำงาน', !r.bad.length && r.art.join() === 'fb_ramking,gb_king,fb_vinemother,b_colossus,sb_queen,fb_isleback,b_lich,ob_warlord,b_king', [r.bad, r.art]);
  const v = X(`(()=>{ const out={}; for(const t of ['fb_ramking','fb_vinemother','fb_isleback']){ delete SPR[t]; const S=getSpr(t); out[t]=!!S; } return out; })()`);
  ok('จ้าวถิ่นรุ่นเก่าสร้าง sprite ได้ (เวกเตอร์สำรองตอนภาพยังไม่โหลด)', Object.values(v).every(Boolean), v);
}

console.log('ปลดล็อก: คลาสสิกตามคลื่นเอาชีวิตรอด · จ้าวถิ่นตามการล้มในแผนที่ · รุ่นเก่าตามเลเวล · ความยากถัดไปเมื่อชนะ');
{
  const { X } = game({ lv: 10 });
  const r = X(`(()=>{ const ch=curChar(), w=id=>bsLockWhy(id,ch); const a={c:w('colossus'), g:w('gb_king'), ram:w('fb_ramking'), vine:w('fb_vinemother'), open:bsUnlocked(ch).join()};
    SAVE.acct.bossUnlock.colossus=1; SAVE.acct.fboss.g1={next:0, kills:1}; ch.fz.s1={k:3, b:1, t:10}; ch.lv=15;
    const b={c:w('colossus'), l:w('lich'), g:w('gb_king'), q:w('sb_queen'), o:w('ob_warlord'), vine:w('fb_vinemother'), open:bsUnlocked(ch).join()};
    const d={d1:bsDiffWhy('colossus',1), d2:bsDiffWhy('colossus',2)}; SAVE.acct.records.boss.colossus={0:{sec:50, medal:'S'}}; d.d1b=bsDiffWhy('colossus',1); d.d2b=bsDiffWhy('colossus',2);
    return {a, b, d, start:bossStart('lich',0), g:!!G}; })()`);
  ok('ตัวละครใหม่ Lv10: เปิดแค่ราชาแพะเขาหิน · ที่เหลือบอกเหตุผล (คลื่น 5 · ล้มในแผนที่ · เลเวล 15)', r.a.open === 'fb_ramking' && /คลื่น 5/.test(r.a.c) && /แผนที่/.test(r.a.g) && r.a.ram === '' && /15/.test(r.a.vine), r.a);
  ok('acct.bossUnlock / acct.fboss.kills / ch.fz.b / เลเวล ปลดตัวที่ตรงกัน (ลิชกับแม่ทัพยังล็อก)', r.b.c === '' && r.b.g === '' && r.b.q === '' && r.b.vine === '' && r.b.l !== '' && r.b.o !== '', r.b);
  ok('ความยาก: ยากเปิดเมื่อชนะปกติ · ฝันร้ายเปิดเมื่อชนะยาก', r.d.d1 !== '' && r.d.d2 !== '' && r.d.d1b === '' && r.d.d2b !== '', r.d);
  ok('bossStart บอสที่ยังล็อก = ไม่เริ่มรอบ', r.start === false && !r.g, r);
}

console.log('สนาม: วงกลม r 700 · บอสโผล่หลัง 2 วิ · ตัวละครเริ่มที่ ★ · การ์ดความชำนาญ · ขอบไม่ให้ออก');
{
  const { X } = game({ lv: 30, open: true });
  const r = X(`(()=>{ initAudio(); Math.random=mulberry(3); bossStart('lich',0); const S=G.bs, t1=[G.bosses.length, S.phase];
    for(let i=0;i<60*2.1;i++) update(1/60); const t2=[G.bosses.length, S.phase, G.boss];
    let out=0, bout=0; G.auto=true; for(let i=0;i<60*25&&!G.over;i++){ update(1/60); autoUI(); const d=Math.hypot(P.x-BS.CX,P.y-BS.CY); if(d>BS.R+.5) out++; for(const b of G.bosses) if(!b.dead&&Math.hypot(b.x-BS.CX,b.y-BS.CY)>BS.R+.5) bout++;
      for(const e of G.enemies) if(!e.dead&&Math.hypot(e.x-BS.CX,e.y-BS.CY)>BS.R+.5) bout++; } G.auto=false;
    const ch=G.char, sk=P.skills.map(s=>s.id+':'+s.lv), want=ch.load.map(id=>id+':'+ch.sk[id]);
    return {t1, t2, out, bout, sk, want, bounds:G.bounds, cards:G.mode.cards, sx:P.sx, plv:P.lv, defK:G.defK, lv:S.lv, pillars:[...G.terrain.chunks.values()].reduce((n,C)=>n+C.list.filter(f=>f.k==='rock').length,0), relocate:G.mode.relocate}; })()`);
  ok('บอสยังไม่เกิดตอนเข้า · เกิดหลัง 2 วิ (ตัวเดียว)', r.t1[0] === 0 && r.t1[1] === 'wait' && r.t2[0] === 1 && r.t2[1] === 'fight' && r.t2[2], [r.t1, r.t2]);
  ok('ขอบวงกลม r 700 ทำงาน: ผู้เล่น บอส และลูกน้องไม่ออกนอกวงเลย (25 วิของบอท)', r.bounds.k === 'circle' && r.bounds.r === 700 && r.out === 0 && r.bout === 0, r);
  ok('สกิลในช่องติดตัวเริ่มที่ ★ ที่ฝึก · โหมดตัวละคร (P.sx) · การ์ด auto · ไม่ย้ายศัตรูไกล', r.sk.sort().join() === r.want.sort().join() && r.sx === true && r.cards === 'auto' && r.relocate === false, r);
  ok('ได้การ์ดความชำนาญจากเพชรของลูกน้อง/บอส (ชำนาญ Lv > 1)', r.plv > 1, r.plv);
  ok('defK = 22 + 0.8 × Lv บอส · ขอบเป็นแนวเสา 24 ต้น + เสากำบัง 4 ต้น', Math.abs(r.defK - (22 + .8 * r.lv)) < 1e-9 && r.pillars === 28, r);
}

console.log('ชนะ: RG.god + บอท ล้มลิชได้ภายใน 120 วิ · รางวัลครั้งเดียว · สถิติเวลา + เหรียญ');
{
  const { X } = game({ lv: 30, open: true });
  const r = X(`(()=>{ initAudio(); Math.random=mulberry(9); const A=SAVE.acct, g0=A.gold, m0=A.marks, ch=curChar(), x0=ch.xp, l0=ch.lv; DEV.boss.start('lich',0); G.god=true;
    for(let i=0;i<60*120&&!G.over;i++){ update(1/60); if(G.ui==='level'){ G.auto=true; autoUI(); G.auto=false; } } const R=G.rewards;
    return {over:G.over, won:G.won, t:G.t, committed:R&&R.committed, gold:A.gold-g0, marks:A.marks-m0, rg:R&&R.gold, rm:R&&R.marks, rx:R&&R.baseXp, xpUp:ch.lv>l0||ch.xp>x0, rec:A.records.boss.lich, used:bsUsed('lich'),
      day:A.daily.boss, items:R&&R.items.length, again:grantRewards(ch,R), gold2:A.gold-g0, kills:R&&R.boss.kills}; })()`);
  ok('god + บอท: ล้มลิช (ปกติ) จบรอบชนะภายใน 120 วิของเวลาจำลอง', r.over && r.won && r.t <= 120, r);
  ok('รางวัลเข้าบัญชีจริง: ทอง ตรา (4) EXP · กล่องของบอสเข้ากระเป๋า', r.committed && r.gold === r.rg && r.gold > 0 && r.marks === 4 && r.rm === 4 && r.rx > 0 && r.xpUp && r.items > 0, r);
  ok('grantRewards ซ้ำด้วย runId เดิม = ปฏิเสธ (ไม่ได้ซ้ำ)', r.again === false && r.gold2 === r.gold, r);
  ok('บันทึกเวลาที่ดีที่สุด + เหรียญ (records.boss.lich[0]) · นับรางวัลเต็มวันนี้ 1 ครั้ง', r.rec && r.rec[0] && r.rec[0].sec > 0 && /^[SAB]$/.test(r.rec[0].medal) && r.used === 1 && r.day['lich:1'] === 1, r);
}

console.log('เพดานกันปั่น: รางวัลเต็มวันละ 3 ครั้งต่อบอส · ครั้งที่ 4 ได้ 15% ไม่มีตรา · วันใหม่กลับมาเต็ม');
{
  const { X } = game({ lv: 22, open: true });
  const runs = [];
  for (let i = 0; i < 5; i++) {
    if (i === 4) X(`(()=>{ SAVE.acct.daily.day='2001-01-01'; })()`);   // a new local day (svDayCur: an old stamp = stale → reset)
    X(`(()=>{ initAudio(); Math.random=mulberry(${20 + i}); bossStart('colossus',0); return 1; })()`);
    const w = winNow(X);
    runs.push(X(`(()=>{ const R=G.rewards, k=R.boss.kills[0]; return {gold:R.gold, marks:R.marks, xp:R.baseXp, full:k.full, items:R.items.length, used:bsUsed('colossus'), committed:R.committed}; })()`));
    ok(`ครั้งที่ ${i + 1}: จบรอบชนะ`, w.over && w.won, w);
  }
  const [a, b, c, d, e] = runs;
  ok('ครั้งที่ 1–3: รางวัลเต็ม (ตรา 4 · กล่องของ) · นับ 1 → 3', a.full && b.full && c.full && a.marks === 4 && c.marks === 4 && a.used === 1 && c.used === 3 && a.items > 0, runs.slice(0, 3));
  ok('ครั้งที่ 4: ทองและ EXP ≈ 15% · ไม่มีตรา · นับค้างที่ 3', !d.full && d.marks === 0 && d.gold <= Math.ceil(a.gold * .15) + 1 && d.gold >= Math.floor(a.gold * .15) - 1 && Math.abs(d.xp - a.xp * .15) <= 1 && d.used === 3, [a, d]);
  ok('วันใหม่ (ข้ามวัน): รางวัลเต็มอีกครั้ง · นับใหม่เป็น 1', e.full && e.marks === 4 && e.used === 1 && e.committed, e);
  const ov = X(`(()=>{ const r={gold:0}; const S0=G.bs; G.char.lv=60; S0.kills=[{id:'colossus', d:0, sec:40, full:true, medal:'S'}]; MODES.boss.rewards(r,true); return {gold:r.gold, xp:r.baseXp, full:Math.round(BAL.BOSS.gold(20,0)*BS.GOLD)}; })()`);
  ok('บอสที่ต่ำกว่าตัวละครมาก (Lv60 ตี Lv20): รางวัลลดตาม overLv ของเอาชีวิตรอด (เหลือ 20%)', ov.gold === Math.round(ov.full * .2), ov);
}

console.log('จ้าวถิ่นในสนาม: ลูกน้องตามท่า (เลเวลตามบอส) · กระสุน G.fd · ราชินีแยกร่าง · ไม่มีสายจูง/กลับรัง');
{
  const { X } = game({ lv: 24, open: true });
  const k = X(`(()=>{ initAudio(); Math.random=mulberry(4); DEV.boss.start('gb_king',0); G.god=true; for(let i=0;i<60*2.2;i++) update(1/60); const e=G.bosses[0];
    P.skills.length=0; e.hp=e.maxHp*.55; let shots=0, mins=[]; for(let i=0;i<60*3;i++){ update(1/60); shots=Math.max(shots,G.fd.shots.length); }
    for(const m of G.enemies) if(!m.dead&&!m.boss) mins.push({t:m.type, lv:m.lv, free:m.fm&&m.fm.free, st:m.fm&&m.fm.st});
    return {mins, fb:e.fb||null, lv:G.bs.lv, hp:e.hp/e.maxHp, shots}; })()`);
  ok('ราชาก็อบลิน HP < 60%: เรียกก็อบลินจิ๋ว + หมอผี · เลเวลยกตามบอส (≥ Lv บอส − 6) · ไล่ตลอด ไม่กลับรัง', k.mins.length >= 5 && k.mins.every(m => m.lv >= k.lv - 6 && m.free >= 1e9 && m.st === 1), k);
  ok('บอสในสนามไม่มีรัง (e.fb) จึงไม่โดนสายจูง / "ติด → กลับรังฟื้นเต็ม"', k.fb === null, k.fb);
  const q = X(`(()=>{ initAudio(); Math.random=mulberry(5); DEV.boss.start('sb_queen',0); G.god=true; for(let i=0;i<60*2.2;i++) update(1/60); const e=G.bosses[0], hp0=e.maxHp; let shots=0;
    for(let i=0;i<60*4;i++){ update(1/60); shots=Math.max(shots,G.fd.shots.length); }
    e.hp=e.maxHp*.45; update(1/60); const live=G.bosses.filter(b=>!b.dead), els=live.map(b=>b.el), phase1=G.bs.phase;
    for(const b of live) damageEnemy(b,1e12,null,{}); for(let i=0;i<60*3&&!G.over;i++) update(1/60);
    return {n:live.length, types:live.map(b=>b.type), els, shots, phase1, over:G.over, won:G.won, hp:live.map(b=>Math.round(b.maxHp)), hp0:Math.round(hp0)}; })()`);
  ok('ราชินีวุ้นยิงวุ้นธาตุเป็นวง (กระสุนใน G.fd.shots)', q.shots >= 8, q.shots);
  ok('ราชินีที่ HP < 50%: แยกเป็น 3 ร่าง 3 ธาตุ · ยังสู้อยู่จนล้มครบ 3 แล้วจบรอบชนะ', q.n === 3 && q.types.every(t => t === 'sb_shard') && new Set(q.els).size === 3 && q.phase1 === 'fight' && q.over && q.won, q);
  for (const id of ['fb_ramking', 'fb_vinemother', 'fb_isleback', 'ob_warlord', 'colossus', 'king']) {
    const z = X(`(()=>{ initAudio(); Math.random=mulberry(6); DEV.boss.start('${id}',0); G.god=true; G.auto=true; let mx=0, tele=0; for(let i=0;i<60*20&&!G.over;i++){ update(1/60); autoUI(); mx=Math.max(mx,bsMinions()); const b=G.bosses[0]; if(b&&b.ai.tele) tele++;
        if(i===60*8&&b) b.hp=b.maxHp*.3; } G.auto=false; let err=null; try{ render(); }catch(e){ err=String(e); } return {mx, tele, err, alive:G.bosses.some(b=>!b.dead), over:G.over}; })()`);
    ok(`${id}: เดินท่าได้ 20 วิไม่พัง (มีท่าเตือน · ลูกน้องตามท่า) · วาดภาพได้`, !z.err && z.tele > 0 && (['colossus'].includes(id) || z.mx > 0), z);
  }
}

console.log('ฝ่าด่านบอส: ทุกตัวที่ปลดแล้วต่อเนื่อง · ระหว่างตัวฟื้น 25% + การ์ด 1 ใบ · โบนัสสัปดาห์ละครั้ง');
{
  const { X } = game({ lv: 26 });
  const r = X(`(()=>{ SAVE.acct.bossUnlock.colossus=1; SAVE.acct.fboss.g1={next:0, kills:2}; const A=SAVE.acct, m0=A.marks;
    initAudio(); Math.random=mulberry(8); const ok=bossRushStart(); const S=G.bs, list=S.list.slice(); G.god=true; let heals=[], cards=0, seen=[];
    for(let i=0;i<60*120&&!G.over;i++){ const ph=S.phase; update(1/60); if(ph==='fight'&&S.phase==='gap'&&G.pendingLv>0) cards++; G.pendingLv=0;
      if(S.phase==='fight'&&G.bosses.some(b=>!b.dead)){ if(!seen.includes(S.B.id)) seen.push(S.B.id); for(const b of G.bosses) if(!b.dead) damageEnemy(b,1e12,null,{}); }
      if(ph==='fight'&&S.phase==='gap'){ heals.push(P.hp); } }
    const R=G.rewards; return {ok, list, seen, cards, over:G.over, won:G.won, kills:R.boss.kills.map(k=>k.id), bonus:R.boss.rushBonus, marks:A.marks-m0, week:A.daily.rushWeek, cur:svWeek(), free:bsRushFree()}; })()`);
  ok('เริ่มได้เมื่อปลด ≥ 2 ตัว · ลำดับตามเลเวล: แพะ → ราชาก็อบลิน → แม่เถาวัลย์ → ยักษ์กระดูก (Lv 26)', r.ok && r.list.join() === 'fb_ramking,gb_king,fb_vinemother,colossus,fb_isleback' && r.seen.join() === r.list.join(), r);
  ok('ปราบครบทุกตัว · ได้การ์ดฟรี 1 ใบทุกช่วงพัก (4 ช่วง)', r.over && r.won && r.kills.join() === r.list.join() && r.cards === 4, r);
  ok('ครบทุกตัว: โบนัสตรา +30 (ตราเต็มของแต่ละตัว 4×5 + 30) · จดสัปดาห์แล้วรับซ้ำไม่ได้', r.bonus && r.marks === 4 * 5 + 30 && r.week === r.cur && r.free === false, r);
  const h = X(`(()=>{ initAudio(); Math.random=mulberry(9); bossRushStart(); const S=G.bs; G.god=true; for(let i=0;i<60*3;i++) update(1/60); for(const b of G.bosses) damageEnemy(b,1e12,null,{});
    G.god=false; P.hp=P.maxHp*.2; const before=P.hp; for(let i=0;i<60*.5;i++){ update(1/60); if(S.phase==='gap') break; } return {phase:S.phase, before:Math.round(before), after:Math.round(P.hp), max:Math.round(P.maxHp), pend:G.pendingLv+(G.ui==='level'?1:0)}; })()`);
  ok('ระหว่างตัว: ฟื้น 25% ของ HP สูงสุด + การ์ด 1 ใบ', h.phase === 'gap' && h.after - h.before >= Math.floor(h.max * .25) - 1 && h.pend >= 1, h);
  const b2 = X(`(()=>{ const r={gold:0}; MODES.boss.rewards(r,true); return r.boss.rushBonus; })()`);
  ok('ฝ่าด่านรอบที่สองในสัปดาห์เดียวกัน: ไม่มีโบนัส +30', b2 === false, b2);
}

console.log('รอบที่ไม่ผ่านประตูเข้า (ล็อก) ไม่ได้รางวัล · แพ้ = ไม่มีรางวัลของบอส');
{
  const { X } = game({ lv: 12 });
  const r = X(`(()=>{ const ch=curChar(), A=SAVE.acct, g0=A.gold; initAudio(); startRun(ch.cls,'boss',{char:ch, boss:'king', diff:2}); const paid=G.bs.paid;
    G.god=true; for(let i=0;i<60*3;i++) update(1/60); for(const b of G.bosses) damageEnemy(b,1e12,null,{}); for(let i=0;i<60*3&&!G.over;i++) update(1/60);
    const R=G.rewards; return {paid, won:G.won, gold:A.gold-g0, unpaid:R&&R.unpaid, rec:A.records.boss.king||null, used:bsUsed('king')}; })()`);
  ok('startRun ตรงไปที่บอสที่ยังล็อก (ไม่ผ่าน bossStart): จบได้แต่ไม่จ่ายอะไร ไม่บันทึกสถิติ', r.paid === false && r.won && r.gold === 0 && r.unpaid && !r.rec && r.used === 0, r);
  const l = X(`(()=>{ const A=SAVE.acct, g0=A.gold; initAudio(); Math.random=mulberry(2); bossStart('fb_ramking',0); for(let i=0;i<60*3;i++) update(1/60); P.hp=1; hurtPlayer(1e6); for(let i=0;i<10&&!G.over;i++) update(1/60);
    const R=G.rewards; return {over:G.over, won:G.won, gold:A.gold-g0, kills:R.boss.kills.length, marks:R.marks, used:bsUsed('fb_ramking')}; })()`);
  ok('แพ้: จบรอบ ไม่มีรางวัลบอส ไม่นับสิทธิ์', l.over && !l.won && l.kills === 0 && l.marks === 0 && l.used === 0, l);
}

console.log('เซฟ: ไม่เพิ่ม field ใหม่ (SCHEMA_V เดิม) · validateSave เก็บตัวนับ/สถิติ และตัดของปลอม');
{
  const { X } = game({ lv: 20 });
  const v = X(`(()=>{ const s=JSON.parse(JSON.stringify(SAVE)); s.acct.daily={day:svDay(), boss:{'colossus:3':1, 'lich:2':1, 'x<y':1, 'king:99999999999999999999999999999999999999999':1}, surv:{}, dg:{}};
    s.acct.records.boss={colossus:{0:{sec:41.5, medal:'S'}, 1:{sec:'abc', medal:'Z'}, 7:{sec:1}}, '__proto__':{0:{sec:1}}};
    const o=validateSave(s); SAVE=o; return {v:o.v, day:o.acct.daily.boss, rec:o.acct.records.boss, used:[bsUsed('colossus'), bsUsed('lich'), bsUsed('king')], left:bsFullLeft('colossus'), SV:SCHEMA_V}; })()`);
  ok('SCHEMA_V ยังเป็น 8 (ใช้ acct.daily.boss / acct.records.boss ที่มีอยู่แล้ว)', v.SV === 8 && v.v === 8, v);
  ok('ตัวนับรางวัลเต็มรอด validate · key แปลกถูกตัด · ใช้ครบแล้ว = เหลือ 0', v.day['colossus:3'] === 1 && v.day['lich:2'] === 1 && !('x<y' in v.day) && v.used[0] === 3 && v.used[1] === 2 && v.left === 0, v);
  ok('สถิติบอส: ค่าขยะถูก clamp (sec ไม่ใช่ตัวเลข = 0 · เหรียญแปลก = B · ความยากเกิน 2 ทิ้ง · __proto__ ทิ้ง)', v.rec.colossus[0].sec === 41.5 && v.rec.colossus[0].medal === 'S' && v.rec.colossus[1].sec === 0 && v.rec.colossus[1].medal === 'B' && !v.rec.colossus[7] && Object.keys(v.rec).join() === 'colossus', v.rec);
  const c = X(`(()=>{ const ch=curChar(), A=SAVE.acct; bsCommit(ch,{boss:{kills:[{id:'colossus', d:0, sec:30, full:true}, {id:'nope', d:0, sec:5, full:true}, {id:'lich', d:9, sec:-4, full:true}, {id:'lich', d:1, sec:1e99, full:true}]}},A);
    return {rec:A.records.boss, day:A.daily.boss}; })()`);
  ok('bsCommit กับรางวัลขยะ: บอสที่ไม่มีไม่ถูกบันทึก · เวลาติดลบไม่นับ · ค่าใหญ่ถูก clamp', c.rec.colossus[0].sec === 30 && !c.rec.nope && c.rec.lich && c.rec.lich[1] && c.rec.lich[1].sec === 1e6 && !c.rec.lich[2] && c.day['colossus:4'] === 1, c);
}

console.log('คลาสสิกไม่แตะ: ไม่มี G.fd / G.bs · ราชินีในแผนที่ยังแยกร่างแบบเดิม (มีรัง)');
{
  const { X } = game({ lv: 22 });
  const r = X(`(()=>{ initAudio(); Math.random=mulberry(42); startRun('mage'); for(let i=0;i<60*5;i++) update(1/60); const c={fd:G.fd===undefined, bs:G.bs===undefined, bounds:G.bounds, mode:G.modeId};
    const ch=curChar(); startRun(ch.cls,'field',{char:ch, zone:'s1'}); DEV.field.bossIn(0); update(1/60); const q=G.bosses[0]; G.god=true; q.hp=q.maxHp*.45; update(1/60);
    return {c, field:G.bosses.filter(b=>!b.dead).map(b=>b.type+':'+(!!b.fb)).join()}; })()`);
  ok('รอบคลาสสิก: ไม่มี G.fd / G.bs / ขอบ', r.c.fd && r.c.bs && r.c.bounds === null && r.c.mode === 'classic', r.c);
  ok('ราชินีวุ้นในท่องแดนรูน: แยกร่างด้วยรังของแผนที่ตามเดิม (ร่างแยกมี fb)', r.field === 'sb_shard:true,sb_shard:true,sb_shard:true', r.field);
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
