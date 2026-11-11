/* ================= 64-boss-patterns.js · lane F · BOSS_PAT (reusable boss moves) + BOSSAI of the 3 field bosses ================= */
// core 20 bossAI() calls BOSSAI[e.d.ai] for any boss with its own AI and then only adds walk frames, bounds and terrain.
// A field boss = bossPattern(e, …, cfg): leash to its nest (800 → walks home, full HP), then the moves cfg lists
// (charge · slam · ring · summon at HP thresholds · rage) in that order, then a chase. Telegraphs use e.ai.tele, so core 22
// drawBossTele and the RG.sim bot's dodging work as for the undead bosses. Shots go to G.fd.shots (62a).
const BOSS_PAT={
  move(e,dt,tx,ty,sp){ const acc=1-Math.exp(-dt*4), kd=Math.exp(-dt*6); e.kx*=kd; e.ky*=kd; e.vx+=(tx*sp-e.vx)*acc; e.vy+=(ty*sp-e.vy)*acc;
    e.x+=(e.vx+e.kx)*dt; e.y+=(e.vy+e.ky)*dt; if(Math.abs(e.vx)>3) e.face=e.vx<0?-1:1; },
  tele(A,dt){ if(A.tele){ A.tele.t+=dt; if(A.tele.t>=A.tele.dur) A.tele=null; } },
  // too far from the nest: walk back (×1.4) and heal to full on arrival · moves are dropped
  leash(e,A,dt){ const H=e.fb; if(!H) return false; const hx=H.hx-e.x, hy=H.hy-e.y, h=Math.hypot(hx,hy);
    if(!A.home&&h>BAL.FIELD.boss.leash){ A.home=1; A.tele=null; A.wind=0; A.charge=0; A.slam=0; addText(e.x,e.y-e.r-20,'กลับรัง','#c8c0b0'); }
    if(!A.home) return false; if(h<40){ A.home=0; e.hp=e.maxHp; return false; }
    BOSS_PAT.move(e,dt,hx/(h||1),hy/(h||1),e.speed*1.4); return true; },
  // straight dash after a line telegraph · o.n dashes in a row (o.gap s apart) · hits once per dash
  charge(e,A,dt,d,dx,dy,o,k){
    if(A.charge>0){ A.charge-=dt; const sp=o.sp*(A.rage?1.2:1); e.x+=A.cx*sp*dt; e.y+=A.cy*sp*dt; e.face=A.cx<0?-1:1;
      for(const q of query(e.x,e.y,e.r+40)){ if(q.boss||q.dead) continue; const l=Math.hypot(q.x-e.x,q.y-e.y)||1; q.kx+=(q.x-e.x)/l*60; q.ky+=(q.y-e.y)/l*60; }
      const px=P.x-e.x, py=P.y-e.y; if(!A.hitP&&px*px+py*py<(e.r+P.r)**2){ A.hitP=1; hurtPlayer(e.dmg*1.5); P.kx+=A.cx*620; P.ky+=A.cy*620; }
      if(A.rage&&Math.random()<dt*14) fdFire(e.x,e.y+e.r*.6,26,e.fdK*9,2.2);
      if(Math.random()<.5) part({x:e.x+rand(-20,20), y:e.y+e.r*.8, vx:-A.cx*60, vy:rand(-30,-5), life:.6, s:8, grow:22, c:'#6a5a4a', g:0, drag:2, k:'puff', add:false, a:.5});
      if(A.charge<=0){ A.left=(A.left|0)-1; if(A.left>0) A.chGap=o.gap||.35; else A.chargeCd=o.cd*k; } return true; }
    if(A.chGap>0){ A.chGap-=dt; if(A.chGap<=0){ A.wind=o.wind*.7; A.cx=dx; A.cy=dy; A.tele={k:'line', len:o.sp*o.dur, t:0, dur:A.wind, ang:Math.atan2(dy,dx)}; } BOSS_PAT.move(e,dt,0,0,0); return true; }
    if(A.wind>0){ A.wind-=dt; BOSS_PAT.move(e,dt,0,0,0); if(A.wind<=0){ A.charge=o.dur; A.hitP=0; sfx('boom'); } return true; }
    A.chargeCd=(A.chargeCd==null?3:A.chargeCd)-dt;
    if(A.chargeCd<=0&&d<o.sp*o.dur*.95&&d>e.r+40){ A.wind=o.wind*k; A.cx=dx; A.cy=dy; A.left=o.n||1; A.tele={k:'line', len:o.sp*o.dur, t:0, dur:A.wind, ang:Math.atan2(dy,dx)}; A.chargeCd=99; return true; }
    return false; },
  // a wind-up ring then a slam (r) · pushes the player and nearby monsters away
  slam(e,A,dt,d,o,k){
    if(A.slam>0){ A.slam-=dt; if(A.slam<=0){ const R=o.r; G.fx.push({k:'ring', x:e.x, y:e.y, r0:20, r1:R, t:0, dur:.45, c:o.c||'#e8d6a8', w:14, dead:false}); G.shake=Math.max(G.shake,10); sfx('boom');
        burst(e.x,e.y+20,18,'#bfae8a',300,.6,5,'rock'); addDecal(crackTex(),e.x,e.y+20,R*.8,6,.8);
        const px=P.x-e.x, py=P.y-e.y, pl=Math.hypot(px,py)||1; if(pl<R+P.r){ hurtPlayer(e.dmg*(o.dmg||1.3)); P.kx+=px/pl*520; P.ky+=py/pl*520; }
        A.slamCd=o.cd*k; } return true; }
    A.slamCd=(A.slamCd==null?2.5:A.slamCd)-dt; if(A.slamCd<=0&&d<o.near){ A.slam=o.wind*k; A.tele={k:'circle', r:o.r, t:0, dur:A.slam}; return true; } return false; },
  ring(e,o,el,off){ const n=o.n, sp=o.sp, dmg=e.dmg*(o.dmg||.45); off=off==null?rand(0,TAU):off; for(let i=0;i<n;i++) fdShot(e.x,e.y-8,off+i*TAU/n,sp,dmg,'orb',{el:el||e.el, r:o.r||8}); sfx('zap'); },
  summon(e,list,R){ for(const [type,n] of list) for(let i=0;i<n;i++){ const a=rand(0,TAU), r=R*(.7+Math.random()*.5), x=e.x+Math.cos(a)*r, y=e.y+Math.sin(a)*r;
    const m=fdExtra(type,x,y,null,{aggro:1, sum:1, free:G.t+20}); if(m) burst(x,y,6,'#6a5a4a',120,.5,3,'rock'); }
    G.fx.push({k:'ring', x:e.x, y:e.y, r0:20, r1:R*1.2, t:0, dur:.5, c:'#f0c75a', w:10, dead:false}); }};
// cfg: {charge, slam, ring:{n,sp,cd,dmg}, summon:[{at, list, say}], rage:{at, say}, keep, extra(e,A,dt,d,dx,dy,k)}
function bossPattern(e,dt,d,dx,dy,cfg){ const A=e.ai; BOSS_PAT.tele(A,dt);
  if(BOSS_PAT.leash(e,A,dt)) return;
  if(cfg.rage&&!A.rage&&e.hp<e.maxHp*cfg.rage.at){ A.rage=1; banner(e.d.n+' คลั่ง!',cfg.rage.say||'ทุกท่าเร็วขึ้น'); sfx('boss'); }
  const k=A.rage?.62:1;
  if(cfg.summon){ for(let i=0;i<cfg.summon.length;i++){ const s=cfg.summon[i]; if(!(A['sm'+i])&&e.hp<e.maxHp*s.at){ A['sm'+i]=1; BOSS_PAT.summon(e,s.list,150); banner(e.d.n,s.say||'เรียกลูกน้อง!'); } } }
  if(cfg.extra&&cfg.extra(e,A,dt,d,dx,dy,k)) return;
  if(cfg.charge&&BOSS_PAT.charge(e,A,dt,d,dx,dy,cfg.charge,k)) return;
  if(cfg.slam&&BOSS_PAT.slam(e,A,dt,d,cfg.slam,k)){ BOSS_PAT.move(e,dt,0,0,0); return; }
  if(cfg.ring){ A.ringCd=(A.ringCd==null?2:A.ringCd)-dt; if(A.ringCd<=0){ A.ringCd=cfg.ring.cd*k; BOSS_PAT.ring(e,cfg.ring,e.el); } }
  let tx=dx, ty=dy, sp=e.speed*e.slowF*(A.rage?1.3:1);
  if(cfg.keep){ if(d<cfg.keep*.8){ tx=-dx; ty=-dy; sp*=.7; } else if(d<cfg.keep*1.2){ const sg=Math.sin(G.t*.6)>0?1:-1; tx=-dy*sg; ty=dx*sg; sp*=.55; } }
  BOSS_PAT.move(e,dt,tx,ty,sp); }

/* ---- ราชาก็อบลินมงกุฎสนิม (g1): throne charge · club slam r 170 · minions at 60 % / 30 % · crown boomerang under 25 % ---- */
const FB_KING={charge:{sp:760, wind:.9, dur:.6, cd:5}, slam:{r:170, wind:1, cd:4.5, near:240, dmg:1.3},
  summon:[{at:.6, list:[['g_sprout',6],['g_shaman',1]], say:'เรียกก็อบลินจิ๋ว 6 ตัว + หมอผี!'}, {at:.3, list:[['g_sprout',6],['g_shaman',1]], say:'เรียกลูกน้องอีกระลอก!'}],
  extra(e,A,dt,d,dx,dy){ if(e.hp>=e.maxHp*.25) return false; A.crown=(A.crown==null?1:A.crown)-dt;
    if(A.crown<=0&&!A.wind&&!(A.charge>0)&&!(A.slam>0)){ A.crown=4.2; const a=Math.atan2(dy,dx); fdShot(e.x,e.y-30,a,520,e.dmg*.8,'crown',{r:14, ret:e, out:.6, sp:560, life:3.2});
      if(!A.crownSaid){ A.crownSaid=1; banner('ปามงกุฎ!','บูมเมอแรงโค้งกลับ · หลบทั้งขาไปและขากลับ'); } sfx('swing'); } return false; }};
BOSSAI.fb_king=(e,dt,d,dx,dy)=>bossPattern(e,dt,d,dx,dy,FB_KING);

/* ---- ราชินีวุ้นหกสี (s1): element every 12 s (2-s warning) · ring of 16 element jellies · splits into 3 at 50 % ---- */
const FB_Q_EL=['fire','wind','earth','water','light','dark'];
const FB_QUEEN={ring:{n:16, sp:185, cd:3.2, dmg:.42}, keep:190, slam:{r:150, wind:.9, cd:5, near:180, dmg:1.1, c:'#c8a0ff'},
  extra(e,A,dt){ A.elT=(A.elT==null?0:A.elT)+dt;
    if(A.elT>=10&&!A.nextEl){ A.nextEl=FB_Q_EL[(FB_Q_EL.indexOf(e.el)+1)%FB_Q_EL.length]; }
    if(A.elT>=12){ A.elT=0; e.el=A.nextEl||e.el; A.nextEl=null; G.fx.push({k:'ring', x:e.x, y:e.y, r0:20, r1:160, t:0, dur:.5, c:EL[e.el].c, w:12, dead:false}); addText(e.x,e.y-e.r-30,'ธาตุ'+EL[e.el].n+' '+EL[e.el].i,EL[e.el].c,true); }
    if(!A.split&&e.hp<e.maxHp*.5){ A.split=1; fbQueenSplit(e); return true; } return false; }};
function fbQueenSplit(e){ const i=FB_Q_EL.indexOf(e.el), els=[e.el,FB_Q_EL[(i+2)%6],FB_Q_EL[(i+4)%6]], hp=e.hp/3*1.15, out=[];
  for(let k=0;k<3;k++){ const a=-PI/2+k*TAU/3, s=fdBossMake('sb_shard',e.x+Math.cos(a)*70,e.y+Math.sin(a)*70,1,els[k]); s.hp=s.maxHp=hp; s.fb={hx:e.fb.hx, hy:e.fb.hy}; s.kx=Math.cos(a)*300; s.ky=Math.sin(a)*300; out.push(s); }
  burst(e.x,e.y,40,'#c8a0ff',340,.7,5); G.shake=Math.max(G.shake,12); sfx('boss'); banner('ราชินีแยกร่าง!','3 ร่าง 3 ธาตุ: '+els.map(k=>EL[k].i+EL[k].n).join(' · '));
  fdVanish(e); G.bosses=G.bosses.concat(out); }
BOSSAI.fb_queen=(e,dt,d,dx,dy)=>bossPattern(e,dt,d,dx,dy,FB_QUEEN);
const FB_SHARD={ring:{n:8, sp:200, cd:3, dmg:.4}, slam:{r:110, wind:.8, cd:4, near:150, dmg:1, c:'#c8a0ff'}};
BOSSAI.fb_shard=(e,dt,d,dx,dy)=>bossPattern(e,dt,d,dx,dy,FB_SHARD);

/* ---- แม่ทัพออร์คเขี้ยวเหล็ก (o1): 3 charges in a row · twin-axe slam r 200 · horn calls at 70 % / 40 % · rage at 25 % (fire trail) ---- */
const FB_WARLORD={charge:{sp:820, wind:.75, dur:.5, cd:6.5, n:3, gap:.35}, slam:{r:200, wind:1, cd:5, near:270, dmg:1.4, c:'#ffb07a'},
  summon:[{at:.7, list:[['o_grunt',6],['o_archer',2]], say:'เป่าแตรเรียกทหาร 6 + นักธนู 2!'}, {at:.4, list:[['o_grunt',6],['o_archer',2]], say:'กองหนุนมาแล้ว!'}],
  rage:{at:.25, say:'ตัวแดง · ทุกท่าเร็วขึ้น · ทิ้งรอยไฟ'},
  extra(e,A,dt){ if(A.rage){ A.tr=(A.tr||0)-dt; if(A.tr<=0&&Math.hypot(e.vx,e.vy)>20){ A.tr=.3; fdFire(e.x,e.y+e.r*.6,26,e.fdK*9,2.4); } } return false; }};
BOSSAI.fb_warlord=(e,dt,d,dx,dy)=>bossPattern(e,dt,d,dx,dy,FB_WARLORD);
