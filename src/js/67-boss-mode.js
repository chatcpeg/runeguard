/* ================= 67-boss-mode.js · lane H · MODES.boss (ล่าบอส): one boss or the rush, the arena, rewards + daily cap ================= */
// DESIGN §2.4 · §7.6 · §7.8. A run = an arena (a circle r 700 with a ring of pillars for its wall, 4 pillars of cover, the boss's floor)
// and one boss that appears 2 s after entering · its minions come only from its own moves. Rush = every unlocked boss in level order
// (ปกติ): between two bosses 25 % HP + one free card. The character plays with its ★ skills (prepareRun 'rank') + proficiency cards
// from the gems (P.sx stat cards are uncapped). Field bosses (64) and their minions run with a small G.fd (shots / ground hazards ·
// no map, no nest: no leash, no "stuck → home" reset). Rewards: onRunEnd → mode.rewards (gold / EXP / marks of every kill + its chest
// picked up into G.loot) · the first BS.FULL kills of a boss each local day pay in full, later ones BS.CUT (svDayCur rule like the
// daily dungeons) · grantRewards → bsCommit counts them (acct.daily.boss '<id>:<n>') and keeps the best time (acct.records.boss).
// Logic of the core stays untouched: everything here runs only when G.mode is MODES.boss.

/* ---- the three old field bosses: moves on BOSS_PAT (64) ---- */
const BS_RAM={charge:{sp:800, wind:.9, dur:.55, cd:5}, slam:{r:160, wind:.9, cd:5, near:220, dmg:1.3, c:'#d8c8a0'},
  summon:[{at:.5, list:[['m_embersquirrel',4]], say:'เรียกกระรอกหางถ่าน 4 ตัว!'}]};
const BS_VINE={ring:{n:12, sp:200, cd:3, dmg:.4}, keep:170, slam:{r:150, wind:1, cd:5.5, near:200, dmg:1.1, c:'#7fbf5a'},
  extra(e,A,dt){
    if(A.vs>0&&!(A.slam>0)&&(P.x-e.x)**2+(P.y-e.y)**2<(150+P.r)**2) bsSlowP(1.4,.6,'รากพันธนาการ!');   // the root slam that just landed binds
    A.vs=A.slam||0;
    A.sumT=(A.sumT==null?6:A.sumT)-dt; if(A.sumT<=0){ A.sumT=10; if(bsMinions()<9){ BOSS_PAT.summon(e,[['m_amberbee',3]],130); addText(e.x,e.y-e.r-24,'เรียกผึ้งอำพัน!','#ffd36a',true); } }
    return false; }};
const BS_ISLE={ring:{n:18, sp:175, cd:3.6, dmg:.42}, slam:{r:200, wind:1.1, cd:3.6, near:260, dmg:1.25, c:'#9fd8ff'},
  summon:[{at:.66, list:[['m_mistcrab',4]], say:'เรียกปูเปลือกหมอก 4 ตัว!'}, {at:.33, list:[['m_mistcrab',4]], say:'ปูอีกระลอก!'}]};
BOSSAI.bs_ramking=(e,dt,d,dx,dy)=>bossPattern(e,dt,d,dx,dy,BS_RAM);
BOSSAI.bs_vinemother=(e,dt,d,dx,dy)=>bossPattern(e,dt,d,dx,dy,BS_VINE);
BOSSAI.bs_isleback=(e,dt,d,dx,dy)=>bossPattern(e,dt,d,dx,dy,BS_ISLE);
// ราชินีวุ้น in the arena: the same moves, but the split needs no nest (the field split copies e.fb) · field bosses keep 64 as it is
const BS_QUEEN=Object.assign({},FB_QUEEN,{extra(e,A,dt,d,dx,dy,k){ if(!A.split&&e.hp<e.maxHp*.5){ A.split=1; bsQueenSplit(e); return true; } return FB_QUEEN.extra(e,A,dt,d,dx,dy,k); }});
{ const q0=BOSSAI.fb_queen; BOSSAI.fb_queen=(e,dt,d,dx,dy)=>e.bsA?bossPattern(e,dt,d,dx,dy,BS_QUEEN):q0(e,dt,d,dx,dy); }
function bsQueenSplit(e){ const i=FB_Q_EL.indexOf(e.el), els=[e.el||'fire',FB_Q_EL[(i+2+6)%6],FB_Q_EL[(i+4+6)%6]], hp=Math.max(1,e.hp/3*1.15), out=[];
  for(let k=0;k<3;k++){ const a=-PI/2+k*TAU/3, s=bsMake('sb_shard',e.x+Math.cos(a)*70,e.y+Math.sin(a)*70); s.el=els[k]; s.hp=s.maxHp=hp; s.kx=Math.cos(a)*300; s.ky=Math.sin(a)*300; out.push(s); }
  burst(e.x,e.y,40,'#c8a0ff',340,.7,5); G.shake=Math.max(G.shake,12); sfx('boss'); banner('ราชินีแยกร่าง!','3 ร่าง 3 ธาตุ: '+els.map(q=>EL[q].i+EL[q].n).join(' · '));
  fdVanish(e); G.bosses=G.bosses.concat(out); }
// the player slowed for t s by v (field curse of G.fd: 62 fdUpdate reads it the same way)
function bsSlowP(t,v,say){ const F=G.fd; if(!F||G.over) return; F.curseT=Math.max(F.curseT||0,G.t+t); F.curseV=Math.max(F.curseV||0,v); if(say) addText(P.x,P.y-50,say,'#9fe08a',true); }
function bsMinions(){ let n=0; for(const e of G.enemies) if(!e.dead&&!e.boss) n++; return n; }

/* ---- account state: unlocks, today's full rewards, records ---- */
function bsAcct(){ return typeof pgAcct==='function'?pgAcct():null; }
function bsKilledOnMap(z){ const A=bsAcct(); if(A&&svObj(A.fboss)&&svHas(A.fboss,z)&&(A.fboss[z].kills|0)>0) return true;
  for(const c of SAVE&&Array.isArray(SAVE.chars)?SAVE.chars:[]) if(c&&svObj(c.fz)&&svHas(c.fz,z)&&(c.fz[z].b|0)>0) return true;
  return false; }
// why boss id is still locked for ch ('' = open)
function bsLockWhy(id,ch){ const B=bsDef(id); if(!B) return 'ไม่พบบอส'; const u=B.unlock, A=bsAcct();
  if(u.bu) return A&&A.bossUnlock&&A.bossUnlock[u.bu]?'':'ไปให้ถึงคลื่น '+u.wave+' ในโหมดเอาชีวิตรอดก่อน';
  if(u.zone) return bsKilledOnMap(u.zone)?'':'ล้ม'+B.n+'ในแผนที่'+(typeof ZONES!=='undefined'&&ZONES[u.zone]?ZONES[u.zone].n:'')+'ก่อน';
  if(u.lv) return ch&&(ch.lv|0)>=u.lv?'':'ต้องเลเวลตัวละคร '+u.lv+' ขึ้นไป';
  return ''; }
function bsRec(id,d){ const A=bsAcct(), m=A&&A.records&&svObj(A.records.boss)&&svHas(A.records.boss,id)?A.records.boss[id]:null, k=String(bsDi(d));
  return m&&svHas(m,k)&&m[k]&&m[k].sec>0?m[k]:null; }
// difficulty d of boss id: '' = open · ยาก needs a win on ปกติ, ฝันร้าย a win on ยาก
function bsDiffWhy(id,d){ const di=bsDi(d); if(!di) return ''; return bsRec(id,di-1)?'':'ชนะระดับ'+BAL.BOSS.diff[di-1].n+'ก่อน'; }
function bsWhy(id,d,ch){ if(!ch) return 'ต้องมีตัวละครก่อน'; if(typeof pgRO==='function'&&pgRO()) return 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้';
  return bsLockWhy(id,ch)||bsDiffWhy(id,d); }
// today's full rewards used on boss id: acct.daily.boss holds one key '<id>:<n>' per boss (flag map · validateSave keeps 1/0 only)
function bsUsed(id,A){ A=A||bsAcct(); if(!A||!A.daily||!svDayCur(A.daily.day)||!svObj(A.daily.boss)) return 0; const p=id+':';
  for(const k in A.daily.boss) if(k.indexOf(p)===0&&A.daily.boss[k]){ const n=+k.slice(p.length); if(Number.isInteger(n)&&n>0) return Math.min(99,n); } return 0; }
function bsFullLeft(id){ return Math.max(0,BS.FULL-bsUsed(id)); }
function bsCountAdd(A,id){ if(!svObj(A.daily.boss)) A.daily.boss={}; const n=bsUsed(id,A), p=id+':';
  for(const k of Object.keys(A.daily.boss)) if(k.indexOf(p)===0) delete A.daily.boss[k];
  A.daily.boss[p+Math.min(99,n+1)]=1; }
function bsUnlocked(ch){ return BOSS_LIST.filter(B=>!bsLockWhy(B.id,ch)).map(B=>B.id); }
function bsRushFree(){ const A=bsAcct(); return !!A&&A.daily&&A.daily.rushWeek!==svWeek(); }
// grantRewards (42) → once per runId: today's full-reward count of every boss paid in full + best time + medal + the weekly rush bonus
function bsCommit(ch,r,A){ const b=r&&r.boss; if(!b||!A||!Array.isArray(b.kills)||r.unpaid) return;
  if(!svObj(A.records)) return; if(!svObj(A.records.boss)) A.records.boss={};
  for(const k of b.kills.slice(0,BOSS_LIST.length)){ if(!k||!bsDef(k.id)) continue; const di=bsDi(k.d), sec=svNum(+k.sec,0,1e6,0); if(!(sec>0)) continue;
    if(k.full) bsCountAdd(A,k.id);
    const m=svObj(A.records.boss[k.id])?A.records.boss[k.id]:(A.records.boss[k.id]={}), o=m[di];
    if(!o||!(o.sec>0)||sec<o.sec) m[di]={sec:Math.round(sec*10)/10, medal:bsMedal(k.id,di,sec)}; }
  if(b.rushBonus) A.daily.rushWeek=svWeek(); }

/* ---- the arena ---- */
// a fixed terrain (29a look, G.terrain.fixed like the maps): pillars around the edge + 4 pillars of cover + 4 bushes
function bsArena(biome){ const b=TER_BIOME[biome]?biome:'ruins', B=TER_BIOME[b], T=G.terrain={b, seed:1, chunks:new Map(), t:0, fixed:true}, cx=BS.CX, cy=BS.CY, R=BS.R;
  G.obstacles={list:null, grid:new Map()};
  const add=f=>{ const kx=Math.floor(f.x/TER.CH), ky=Math.floor(f.y/TER.CH), key=kx+','+ky; let C=T.chunks.get(key); if(!C) T.chunks.set(key,C={cx:kx, cy:ky, list:[]});
    f.ch=key; C.list.push(f); terCellsOf(f,g=>{ const a=G.obstacles.grid.get(g); if(a) a.push(f); else G.obstacles.grid.set(g,[f]); }); };
  for(let i=0;i<24;i++){ const a=i*TAU/24; add({k:'rock', rk:'pillar', hard:1, v:i%3, r:26, x:cx+Math.cos(a)*(R+42), y:cy+Math.sin(a)*(R+42)}); }
  for(let i=0;i<4;i++){ const a=PI/4+i*PI/2; add({k:'rock', rk:'pillar', hard:1, v:(i+1)%3, r:28, x:cx+Math.cos(a)*380, y:cy+Math.sin(a)*380}); }
  for(let i=0;i<4;i++){ const a=i*PI/2; add({k:'bush', bk:B.bk, soft:TER.slowBush, v:i%3, r:30, x:cx+Math.cos(a)*500, y:cy+Math.sin(a)*500}); }
  if(typeof artPreload==='function') artPreload(terArtKeys(b)); }
// one boss of the arena at the run's level and difficulty (BAL.BOSS: HP 900 · hpByLv · HP× · k · damage dmgByLv · dmg×)
function bsMake(type,x,y){ const S=G.bs, d=EN[type], lv=S.lv, F=BAL.FIELD;
  const e=spawnEnemy(type,x,y,{hp:Math.max(1,Math.round(BAL.BOSS.hp(lv,S.di)*S.B.k*BS.HP*BS.HPD[S.di]))}); e.boss=true; e.bsA=1; e.lv=lv;
  e.dmg=d.dmg*F.dmgByLv(lv)*S.D.dmg; e.fdK=F.dmgByLv(lv)*S.D.dmg; e.el=d.el||null; e.def=d.def||0; e.xp=d.xp; return e; }
// set the run up for boss id (rush: again for every boss) · minions spawned by the core AI read G.cfg
function bsSetup(id){ const S=G.bs, F=BAL.FIELD; S.B=bsDef(id); S.lv=bsLv(id,S.di); S.D=bsDiff(S.di);
  G.defK=22+.8*S.lv; G.cfg={W:{}, rate:0, hpMul:F.hpByLv(S.lv)*Math.sqrt(S.D.hp), dmgMul:F.dmgByLv(S.lv)*S.D.dmg, spdMul:1};
  try{ getSpr(S.B.en); if(S.B.id==='sb_queen') getSpr('sb_shard'); if(typeof artPreload==='function'&&EN[S.B.en].art) artPreload([EN[S.B.en].art]); }catch(e){ console.error(e); } }
function bsSpawn(){ const S=G.bs, cx=BS.CX, cy=BS.CY; let a=Math.atan2(cy-P.y,cx-P.x); if((P.x-cx)**2+(P.y-cy)**2<120*120) a=-PI/2;
  const x=cx+Math.cos(a)*320, y=cy+Math.sin(a)*320, e=bsMake(S.B.en,x,y);
  G.bosses=[e]; G.boss=true; S.phase='fight'; S.t0=G.t;
  burst(x,y,30,e.d.goo||'#e8d6a8',300,.7,4); G.shake=Math.max(G.shake,10); sfx('boss');
  banner(S.B.i+' '+S.B.n,'Lv '+S.lv+' · '+S.D.n+(S.rush?' · ฝ่าด่าน '+(S.i+1)+'/'+S.list.length:'')); return e; }
// field minions (BOSS_PAT.summon → fdExtra) come at their own level: lift them to the boss's level − BS.MIN, never leash home
function bsScale(e){ const S=G.bs, F=BAL.FIELD, l0=Math.max(1,e.lv|0), lv=Math.max(l0,S.lv-BS.MIN);
  const kh=F.hpByLv(lv)/F.hpByLv(l0)*Math.sqrt(S.D.hp), kd=F.dmgByLv(lv)/F.dmgByLv(l0)*S.D.dmg;
  e.hp*=kh; e.maxHp*=kh; e.dmg*=kd; e.fdK=(e.fdK||1)*kd; e.lv=lv; e.bsK=1; if(e.fm){ e.fm.free=1e9; e.fm.st=1; } }
// every chest left on the ground → picked up (rush: before the next boss · and when the run ends)
function bsCollect(){ if(!Array.isArray(G.gems)) return; for(const g of G.gems) if(!g.dead&&g.kind==='bosschest'){ ITEMKIND.bosschest.collect(g); g.dead=true; } }
function bsDown(){ const S=G.bs, B=S.B, sec=Math.max(.1,G.t-S.t0), last=G.bosses.filter(b=>!b.gone).pop()||G.bosses[0]||{x:BS.CX, y:BS.CY};
  const used=S.kills.filter(k=>k.id===B.id).length, full=S.paid&&bsFullLeft(B.id)-used>0, medal=bsMedal(B.id,S.di,sec);
  S.kills.push({id:B.id, d:S.di, sec:Math.round(sec*100)/100, full, medal});
  if(S.paid){ const list=rollDrops(bsDropTable(B.id,S.di,full),1+(P.drop||0)); if(list.length) ltDropChest(last.x,last.y,list,0); }
  G.boss=false; G.bosses=[];
  for(const e of G.enemies) if(!e.dead&&!e.boss){ e.dead=true; e.gone=true; burst(e.x,e.y,6,e.d.goo||'#c8c0b0',120,.4,3); }   // its minions leave with it (no kill, no reward)
  G.eprojs.length=0; if(G.fd){ G.fd.shots.length=0; G.fd.haz.length=0; }
  banner('ปราบ'+B.n+'แล้ว!','เวลา '+fmtClock(sec)+' · เหรียญ '+medal+(S.paid&&!full?' · วันนี้รางวัลเต็มครบแล้ว':''));
  if(S.i+1<S.list.length){ S.phase='gap'; S.at=G.t+BS.rushGap; healP(P.maxHp*BAL.BOSS.rush.heal); G.pendingLv++; sfx('level'); return; }
  S.phase='done'; G.waveEnding=true; healP(P.maxHp*.25); sfx('win'); later(1.6,()=>{ if(G&&!G.over&&G.modeId==='boss') endRun(true); }); }
// RG.sim bot: the core bot (undead shots + boss tells) + the field shots / fire of G.fd + stay off the wall
function bsBot(){ let b=botInput(), x=b[0], y=b[1]; const F=G.fd;
  if(F){ for(const s of F.shots){ if(s.dead) continue; const dx=P.x-s.x, dy=P.y-s.y, d2=dx*dx+dy*dy+50; if(d2<130*130){ x+=dx/d2*60; y+=dy/d2*60; } }
    for(const h of F.haz){ if(h.dead||h.k!=='fire') continue; const dx=P.x-h.x, dy=P.y-h.y, d2=dx*dx+dy*dy+50; if(d2<(h.r+40)**2){ x+=dx/d2*40; y+=dy/d2*40; } } }
  const cx=BS.CX-P.x, cy=BS.CY-P.y, c=Math.hypot(cx,cy)||1; if(c>BS.R-90){ x+=cx/c*.8; y+=cy/c*.8; }
  const l=Math.hypot(x,y); return l>1?[x/l,y/l]:[x,y]; }

MODES.boss={
  id:'boss', n:'ล่าบอส', cards:'auto', relocate:false,
  init(opts){ opts=opts||{}; const ch=G.char, S=G.bs={rush:!!opts.rush, di:opts.rush?0:bsDi(opts.diff), list:[], i:0, kills:[], phase:'wait', at:BS.spawn, t0:0, paid:true, B:null};
    if(S.rush){ S.list=bsUnlocked(ch).sort((a,b)=>bsDef(a).lv-bsDef(b).lv); if(S.list.length<BS.rushMin&&!opts.dev) S.paid=false; if(!S.list.length) S.list=['colossus']; }
    else { const id=bsDef(opts.boss)?opts.boss:'colossus'; S.list=[id]; if(!opts.dev&&bsWhy(id,S.di,ch)) S.paid=false; }   // only bossStart / the dev hook start a paid fight
    G.wave=1; bsSetup(S.list[0]);
    G.bounds={k:'circle', x:BS.CX, y:BS.CY, r:BS.R};
    G.fd={id:'arena', z:{id:'arena', n:'ลานประลอง', w:BS.CX*2, h:BS.CY*2}, shots:[], haz:[], portals:[], chests:[], recs:[], boss:null, rc:null, curseT:0, curseV:0, ramp:{on:null}};
    bsArena(S.rush?'ruins':S.B.biome);
    P.x=BS.CX; P.y=BS.CY+260; P.vx=P.vy=P.kx=P.ky=0; cam.x=P.x; cam.y=P.y;
    banner(S.rush?'⚔ ฝ่าด่านบอส':'👑 ล่าบอส',S.rush?S.list.length+' ตัวต่อเนื่อง · ระหว่างตัวฟื้น 25% + การ์ด 1 ใบ':S.B.n+' · '+S.D.n+' · จะปรากฏใน '+BS.spawn+' วิ'); },
  update(dt){ const S=G.bs, F=G.fd;
    if(F.curseT>G.t) P.tSlow=(P.tSlow||1)*(1-F.curseV);                 // before core updatePlayer reads it (as 62 fdUpdate)
    fdHazTick(dt); if(G.over) return; fdShotTick(dt); if(G.over) return;
    for(const e of G.enemies) if(e.fm&&!e.bsK&&!e.dead) bsScale(e);
    if(S.phase==='wait'){ if(G.t>=S.at) bsSpawn(); }
    else if(S.phase==='fight'){ if(G.bosses.length&&G.bosses.every(b=>b.dead)) bsDown(); }
    else if(S.phase==='gap'&&G.t>=S.at){ bsCollect(); S.i++; bsSetup(S.list[S.i]); S.phase='wait'; S.at=G.t+1; } },
  steer:fdSteer, bot(){ return bsBot(); },
  onDeath(){ if(G.bs&&G.bs.phase==='done'){ P.hp=1; return true; } return false; },   // the last boss is down: a parting hit cannot turn it into a loss
  hud(){ const S=G.bs, cls=P.adv?P.adv.n:P.cls.n;
    return {lv:'ชำนาญ Lv '+P.lv+' · '+cls, wave:(S.rush?'⚔ '+(S.i+1)+'/'+S.list.length+' · ':'👑 ')+S.B.n+' · '+S.D.n,
      time:S.phase==='fight'?fmtClock(G.t-S.t0):S.phase==='wait'?'เตรียมตัว '+fmtTime(S.at-G.t):S.phase==='gap'?'ตัวถัดไป '+fmtTime(S.at-G.t):'ชนะ!'}; },
  pauseTitle(){ const S=G.bs; return (S.rush?'ฝ่าด่านบอส '+(S.i+1)+'/'+S.list.length+' · ':'ล่าบอส · ')+S.B.n+' Lv '+S.lv+' · '+S.D.n+' · เวลา '+fmtClock(G.t); },
  end(won){ bsCollect(); const S=G.bs, B=S.B, k=S.kills, last=k[k.length-1], one=!S.rush;
    const prev=one&&last?bsRec(last.id,last.d):null, best=!!(one&&won&&last&&(!prev||last.sec<prev.sec));
    const left=one?bsFullLeft(B.id)-k.filter(q=>q.full).length:0;
    return {eyebrow:(S.rush?'ฝ่าด่านบอส · ปราบ '+k.length+'/'+S.list.length:'ล่าบอส · '+B.n+' · '+S.D.n)+(S.paid?'':' · ไม่ได้รับรางวัล'),
      title:won?(S.rush?'ฝ่าด่านสำเร็จ!':'ปราบสำเร็จ!'):G.retreat?'ถอยทัพ':'พ่ายแพ้',
      rows:()=>{ const R=[];
        if(one) R.push(['บอส',B.n+' · Lv '+S.lv],['ความยาก',S.D.n],['เวลา',won&&last?fmtClock(last.sec)+' · เหรียญ '+last.medal+(best?' · สถิติใหม่!':''):fmtClock(G.t)]);
        else { R.push(['ปราบได้',k.length+'/'+S.list.length+' ตัว'],['เวลารวม',fmtClock(G.t)]); if(k.length) R.push(['ตัวล่าสุด',bsDef(last.id).n+' · '+fmtClock(last.sec)+' · '+last.medal]); }
        if(S.paid&&k.length){ const nf=k.filter(q=>q.full).length; R.push(['รางวัลเต็ม',nf+'/'+k.length+' ตัว'+(nf<k.length?' (ที่เหลือได้ '+Math.round(BS.CUT*100)+'%)':'')]); }
        if(one&&S.paid) R.push(['รางวัลเต็มวันนี้','เหลือ '+Math.max(0,left)+'/'+BS.FULL+' ครั้ง']);
        R.push(['สังหาร',fmtNum(G.kills)],['ชำนาญ','Lv '+P.lv]); return R; }}; },
  rewards(r,won){ const S=G.bs, ch=G.char; r.boss={kills:[], rush:S.rush, rushBonus:false};
    if(!S.paid){ r.baseXp=0; r.gold=0; r.items=[]; r.unpaid=true; return; }
    let gold=0, exp=0, marks=0;
    for(const k of S.kills){ const lv=bsLv(k.id,k.d), m=(k.full?1:BS.CUT)*BAL.SURV.overLv((ch&&ch.lv)|0,lv);   // a boss far below the character pays less (as survival)
      gold+=BAL.BOSS.gold(lv,k.d)*BS.GOLD*m; exp+=BAL.BOSS.exp(lv,k.d)*BS.EXP*m; if(k.full) marks+=BAL.BOSS.marks[k.d];
      r.boss.kills.push({id:k.id, d:k.d, sec:k.sec, full:k.full, medal:k.medal}); }
    if(S.rush&&won&&S.kills.length===S.list.length&&S.list.length>=BS.rushMin&&bsRushFree()){ marks+=BAL.BOSS.rush.marks; r.boss.rushBonus=true; }
    r.gold=(r.gold|0)+Math.round(gold); r.baseXp=Math.round(exp); r.marks=marks; },
  pauseExtra(box){ const S=G.bs; if(!S||!S.rush||!S.kills.length||!box||typeof shBtn!=='function') return;   // the rush: leave with what is already won
    box.append(shBtn('🏳️ ถอยทัพ · รับรางวัล '+S.kills.length+' ตัวที่ปราบแล้ว','btn ghost sh-wide',()=>{ if(!G||G.over||G.ui!=='pause') return; G.retreat=true; G.ui=null; show(null); endRun(false); })); },
  drawGround(L,T,R,B){ if(typeof artGround==='function') artGround(L,T,R,B); else { ctx.fillStyle=groundPat; ctx.fillRect(L,T,R-L,B-T); } },
  drawWorld(L,T,R,B){ const A=G.bounds; ctx.save(); ctx.beginPath(); ctx.rect(L,T,R-L,B-T); ctx.arc(A.x,A.y,A.r,0,TAU); ctx.fillStyle='rgba(6,5,8,.58)'; ctx.fill('evenodd');
    ctx.beginPath(); ctx.arc(A.x,A.y,A.r,0,TAU); ctx.setLineDash([22,12]); ctx.lineDashOffset=-G.t*10; ctx.lineWidth=5; ctx.strokeStyle='rgba(240,181,69,.55)'; ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth=2; ctx.strokeStyle='rgba(240,181,69,.18)'; ctx.beginPath(); ctx.arc(A.x,A.y,A.r*.18,0,TAU); ctx.stroke(); ctx.restore();
    fdDrawWorld(L,T,R,B); },
  drawOver(L,T,R,B){ fdDrawOver(L,T,R,B); }};
// after the run the router lands on scrBoss again (50 SH_RET · lane B's map, filled by the mode that owns the screen)
if(typeof SH_RET!=='undefined') SH_RET.boss='scrBoss';

/* ---- API (§7.8) ---- */
function bsGo(opts){ if(typeof svlFresh==='function') try{ svlFresh(); }catch(e){}
  const ch=typeof pgFresh==='function'?pgFresh(curChar()):curChar(); if(!ch) return false;
  if(typeof closeSheet==='function') closeSheet(); if(typeof shChrome==='function') shChrome(null);
  startRun(ch.cls,'boss',Object.assign({char:ch},opts)); return true; }
function bossStart(id,diff){ const ch=curChar(), why=bsWhy(id,diff,ch); if(why){ if(typeof toast==='function') toast(why,'bad'); return false; }
  return bsGo({boss:id, diff:bsDi(diff)}); }
function bossRushStart(){ const ch=curChar(); if(!ch){ if(typeof toast==='function') toast('ต้องมีตัวละครก่อน','bad'); return false; }
  const n=bsUnlocked(ch).length; if(n<BS.rushMin){ if(typeof toast==='function') toast('ปลดบอสอย่างน้อย '+BS.rushMin+' ตัวก่อน','bad'); return false; }
  if(typeof pgRO==='function'&&pgRO()){ if(typeof toast==='function') toast('ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้','bad'); return false; }
  return bsGo({rush:true}); }

/* ---- dev (§7.9): RG.boss.* · 90 merges DEV into window.RG only on localhost / 127.0.0.1 with #dev ---- */
DEV.boss={
  start(id,d){ if(!bsDef(id)) return 'no boss'; if(!curChar()) return 'no char'; bsGo({boss:id, diff:bsDi(d), dev:true}); return this.state(); },
  rush(){ if(!curChar()) return 'no char'; bsGo({rush:true, dev:true}); return this.state(); },
  kill(){ if(!G||G.modeId!=='boss') return 0; let n=0; for(const b of G.bosses) if(!b.dead){ killEnemy(b); n++; } return n; },
  list(){ const ch=curChar(); return BOSS_LIST.map(B=>({id:B.id, lv:B.lv, lock:bsLockWhy(B.id,ch), used:bsUsed(B.id), best:[0,1,2].map(d=>bsRec(B.id,d))})); },
  state(){ const S=G&&G.modeId==='boss'&&G.bs; if(!S) return null; const b=G.bosses.find(q=>!q.dead);
    return {boss:S.B.id, lv:S.lv, diff:S.di, phase:S.phase, i:S.i, n:S.list.length, kills:S.kills.slice(), paid:S.paid, t:+G.t.toFixed(1), hp:b?Math.round(b.hp)+'/'+Math.round(b.maxHp):null,
      bosses:G.bosses.filter(q=>!q.dead).length, minions:bsMinions(), shots:G.fd.shots.length, me:Math.round(P.hp)+'/'+Math.round(P.maxHp), over:G.over, won:G.won}; }};
