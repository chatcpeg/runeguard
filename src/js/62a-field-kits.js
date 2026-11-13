/* ================= 62a-field-kits.js · lane F · field monster AI: home / wander / chase / leash + reusable behaviour kits ================= */
// core 20 hands every enemy with e.ai.home to MODES.field.steer = fdSteer (classic enemies never have it). One state per monster
// (e.fm): 0 = at home (wander around it, never attacks first), 1 = aggro (chase + kits), 2 = leash (run home ×1.4, full HP).
// Kits (MOBS[id].kit, 60) are small blocks used by many monsters: tick() each frame (may take over the movement), death() when
// killed. Monster projectiles / ground hazards live in G.fd.shots / G.fd.haz (62) — the undead's G.eprojs are left alone.
const FK={};
const FD_M={tx:0, ty:0, sp:0, acc:5, face:0};                      // movement intent, reused every call
const FD_NOKIT={};
function fdSteer(e,dt,d,dx,dy){
  const F=e.fm; if(!F) return false; const D=e.d, K=D.kit||FD_NOKIT, Fd=BAL.FIELD;
  if(D.struct){ e.x=F.hx; e.y=F.hy; e.vx=e.vy=e.kx=e.ky=0; e.atkCd=9; return true; }
  if(F.tele){ F.tele.t+=dt; if(F.tele.t>F.tele.dur+.05) F.tele=null; }
  const atk=e.atkCd>F.cd0+.3;                                         // core playerCollide just hit the player (atkCd jumped to .75)
  let hurt=false; if(e.ai.hurtT!=null&&e.ai.hurtT!==F.h0){ F.h0=e.ai.hurtT; hurt=true; }
  if(F.tower){ fdOnTower(e,F,K,dt,d,dx,dy,hurt); F.cd0=e.atkCd; return true; }
  // state
  if(F.st===0){ const ag=D.aggro>0, nest=F.nest&&ag&&F.nest.alert>G.t-1.5&&d<D.aggro*2.4;
    if(hurt||(ag&&d<D.aggro)||nest) fdAggro(e,F); }
  else if(F.st===1){ if(G.t>F.free){ const h=(e.x-F.hx)**2+(e.y-F.hy)**2; if(h>Fd.leash*Fd.leash||d>1600){ F.st=2; F.tele=null; if(F.ch) F.ch.s=0; } } }
  else if(F.st===2){ if((e.x-F.hx)**2+(e.y-F.hy)**2<48*48){ F.st=0; e.hp=e.maxHp; F.wt=0; } }
  if(F.st!==1||!D.dmg) e.atkCd=Math.max(e.atkCd,.3);                  // passive / at home / leashing: never hits
  // ร่างล่อมรณะ (25a lureAt): a chasing melee monster walks at the decoy · chase / go-home above were decided on the player
  if(F.st===1&&G.lures&&!K.ranged&&typeof lureAt==='function'){ const z=lureAt(e); if(z){ const lx=z.x-e.x, ly=z.y-e.y; d=Math.hypot(lx,ly)||1; dx=lx/d; dy=ly/d; } }
  const M=FD_M; M.tx=0; M.ty=0; M.acc=D.accel||5; M.face=0;
  let sp=e.speed*e.slowF*(e.tSlow||1)*(F.buffT>G.t?1+F.buffV:1)*(F.spdMul||1); if(e.freezeT>0||e.stunT>0) sp=0; M.sp=sp;
  if(F.st===0){ F.wt-=dt;
    if(F.wt<=0){ if(Math.random()<.35){ F.wx=e.x; F.wy=e.y; F.wt=rand(1.2,3); } else { const a=rand(0,TAU), r=rand(20,Fd.wander); F.wx=F.hx+Math.cos(a)*r; F.wy=F.hy+Math.sin(a)*r; F.wt=rand(2.5,5); } }
    const wx=F.wx-e.x, wy=F.wy-e.y, wl=Math.hypot(wx,wy); if(wl>10){ M.tx=wx/wl; M.ty=wy/wl; M.sp=sp*.4; } else M.sp=0; }
  else if(F.st===2){ const hx=F.hx-e.x, hy=F.hy-e.y, hl=Math.hypot(hx,hy)||1; M.tx=hx/hl; M.ty=hy/hl; M.sp=e.speed*1.4; }
  else { M.tx=dx; M.ty=dy; if(D.erratic){ const w=Math.sin(G.t*3.1+e.id*1.7)*1.1, c=Math.cos(w), s=Math.sin(w), n=M.tx*c-M.ty*s; M.ty=M.tx*s+M.ty*c; M.tx=n; } }
  let own=false;
  for(const k in K){ const f=FK[k]; if(f&&f.tick&&f.tick(e,F,K[k],dt,d,dx,dy,M,atk,hurt)){ own=true; break; } }
  if(!own&&e.rank===3&&F.st===1) own=fdEliteSlam(e,F,dt,d,M);
  if(!own) fdMove(e,dt,M);
  F.cd0=e.atkCd; return true; }
function fdAggro(e,F){ F.st=1; if(F.nest) F.nest.alert=G.t; }
// velocity toward the intent, knockback decay, face, walk frames · bounds + terrain like the core loop does after its own steering
function fdMove(e,dt,M){ const acc=1-Math.exp(-dt*M.acc), kd=Math.exp(-dt*6.5);
  e.vx+=(M.tx*M.sp-e.vx)*acc; e.vy+=(M.ty*M.sp-e.vy)*acc; e.kx*=kd; e.ky*=kd;
  e.x+=(e.vx+e.kx)*dt; e.y+=(e.vy+e.ky)*dt;
  if(M.face) e.face=M.face; else if(Math.abs(e.vx)>3) e.face=e.vx<0?-1:1;
  e.walk+=e.d.fly?dt*14:Math.hypot(e.vx,e.vy)*dt/(e.d.r*.9);
  fdKeepIn(e); }
function fdKeepIn(e){ if(G.bounds) clampToBounds(e); if(G.obstacles&&!e.d.fly){ e.tSlow=1; pushOutObstacles(e); } }
// shield kits: a hit only meets the shield when it comes against the heading (core 18 damageEnemy asks this when e.shArc)
function fdFront(e,o){ const F=e.fm; if(!F||F.ang==null||e.stunT>0||e.freezeT>0) return false;
  let nx=o&&o.nx, ny=o&&o.ny;
  if(nx===undefined){ nx=e.x-(o&&o.ox!=null?o.ox:P.x); ny=e.y-(o&&o.oy!=null?o.oy:P.y); const l=Math.hypot(nx,ny)||1; nx/=l; ny/=l; }
  return nx*Math.cos(F.ang)+ny*Math.sin(F.ang)<-.2; }

/* ---- kits ---- */
FK.ranged={tick(e,F,K,dt,d,dx,dy,M){ if(F.st!==1) return false;
  if(d<K.keep*.8){ M.tx=-dx; M.ty=-dy; } else if(d<K.keep*1.15){ const sg=(e.id&1)?1:-1; M.tx=-dy*sg; M.ty=dx*sg; M.sp*=.6; }
  if(F.burst>0){ F.bt-=dt; M.sp*=.3; if(F.bt<=0){ F.burst--; F.bt=K.gap||.15; fdShoot(e,K); } return false; }
  F.sc=(F.sc==null?rand(.8,1.8):F.sc)-dt;
  if(F.sc<=0&&d<K.keep*1.6&&!(e.stunT>0||e.freezeT>0)){ F.sc=K.cd*rand(.85,1.15); if(K.burst>1){ F.burst=K.burst-1; F.bt=K.gap||.15; } fdShoot(e,K); }
  return false; }};
FK.keep={tick(e,F,K,dt,d,dx,dy,M){ if(F.st!==1) return false;
  if(d<K.d*.85){ M.tx=-dx; M.ty=-dy; } else if(d<K.d*1.3){ const sg=(e.id&1)?1:-1; M.tx=-dy*sg; M.ty=dx*sg; M.sp*=.5; } return false; }};
FK.charge={tick(e,F,K,dt,d,dx,dy,M){
  const C=F.ch||(F.ch={s:0, cd:rand(1,2.5), t:0, cx:0, cy:0, hit:0});
  if(C.s===2){ C.t-=dt; const sp=K.sp*(F.spdMul||1), ox=e.x, oy=e.y; e.x+=C.cx*sp*dt; e.y+=C.cy*sp*dt; e.face=C.cx<0?-1:1; e.walk+=dt*12; fdKeepIn(e);
    if(!C.hit){ const px=P.x-e.x, py=P.y-e.y; if(px*px+py*py<(e.r+P.r+4)**2){ C.hit=1; hurtPlayer(e.dmg*K.dmg); P.kx+=C.cx*420; P.ky+=C.cy*420; if(G.over) return true; } }
    if(K.stun&&Math.hypot(e.x-ox,e.y-oy)<sp*dt*.35){ e.stunT=K.stun; C.s=0; C.cd=K.cd; G.shake=Math.max(G.shake,5); addText(e.x,e.y-e.r-14,'มึน!','#ffe14a'); sfx('hit'); return true; }   // ran into a rock / wall
    e.vx=C.cx*sp*.3; e.vy=C.cy*sp*.3; if(C.t<=0){ C.s=0; C.cd=K.cd*rand(.85,1.15); } return true; }
  if(F.st!==1){ C.s=0; return false; }
  if(C.s===1){ C.t-=dt; M.sp=0; if(e.stunT>0||e.freezeT>0){ C.s=0; F.tele=null; C.cd=1.2; return false; } if(C.t<=0){ C.s=2; C.t=K.dur; C.hit=0; F.tele=null; sfx('swing'); } return false; }
  C.cd-=dt; if(C.cd<=0&&d<K.range&&d>e.r+P.r+8&&!(e.stunT>0||e.freezeT>0)){ C.s=1; C.t=K.aim; C.cx=dx; C.cy=dy; F.tele={k:'line', ang:Math.atan2(dy,dx), len:K.sp*K.dur, t:0, dur:K.aim, w:e.r}; M.sp=0; }
  return false; }};
// steal: 12% of the trip's gold (at least K.min) but never more than FIELD.steal.cap kills' worth of gold at its level · killed in
// time it gives back what it took + a fixed FIELD.steal.back kills' worth (not ×2: that grew the trip's gold 12% per thief, compounding)
function fdStealCap(e){ return Math.max(1,Math.round(BAL.FIELD.goldF(e.lv,.5)*BAL.FIELD.steal.cap)); }
FK.steal={tick(e,F,K,dt,d,dx,dy,M,atk){
  if(atk&&!F.loot&&F.st===1){ const g=G.goldRun|0, n=Math.min(g,fdStealCap(e),Math.max(K.min,Math.round(g*K.pct)));
    if(n>0){ G.goldRun=g-n; F.loot=n; addText(P.x,P.y-52,'โดนขโมย '+n+' ทอง!','#ff9a7a',true); sfx('hurt'); } F.flee=G.t+K.run; F.free=G.t+K.run+2; }
  if(F.flee>G.t){ M.tx=-dx; M.ty=-dy; M.sp=e.speed*1.15*e.slowF*(e.freezeT>0||e.stunT>0?0:1); e.atkCd=Math.max(e.atkCd,.5);
    if(F.loot&&(d>950||F.flee-G.t<.05)){ addText(e.x,e.y-e.r-14,'หนีไปพร้อมทอง!','#ff9a7a'); fdVanish(e,true); return true; } }
  return false; },
  death(e,F){ if(F.loot){ const n=F.loot+Math.round(BAL.FIELD.goldF(e.lv,.5)*BAL.FIELD.steal.back); for(let i=0;i<4;i++) dropGold(e.x,e.y,Math.floor(n/4)+(i<n%4?1:0));
    F.loot=0; addText(e.x,e.y-e.r-16,'ได้ทองคืน +'+n+'!','#f0c75a',true); } }};
FK.ram={tick(e,F,K,dt,d,dx,dy,M,atk){ if(atk){ P.kx+=dx*K.knock; P.ky+=dy*K.knock; G.shake=Math.max(G.shake,4); } return false; }};
FK.dismount={tick(e,F,K){ if(F.dis||e.hp>e.maxHp*K.at) return false; F.dis=1;
  const lv=e.lv, rk=e.rank|0, b=fdExtra(K.mount,e.x+14,e.y,e,{aggro:1, lv, rank:rk}), g=fdExtra(K.foot,e.x-12,e.y,e,{aggro:1, lv, rank:rk});
  if(g&&F.rec){ F.rec.e=g; g.fm.rec=F.rec; F.rec=null; }
  burst(e.x,e.y,10,'#a87a5a',160,.5,3,'rock'); addText(e.x,e.y-e.r-14,'ตกหลังหมู!','#ffe14a'); fdVanish(e); return true; }};
FK.heal={tick(e,F,K,dt){ F.hc=(F.hc==null?rand(1,K.cd):F.hc)-dt; if(F.hc>0) return false; F.hc=K.cd; if(F.st!==1){ F.hc=1; return false; }
  let best=null, bw=1, n=0;
  for(const o of query(e.x,e.y,K.r)){ if(o.dead||o.boss||!o.fm||o.d.fam!==e.d.fam||o.hp>=o.maxHp) continue; if((o.x-e.x)**2+(o.y-e.y)**2>K.r*K.r) continue;
    if(K.toss){ const w=o.hp/o.maxHp; if(w<bw){ bw=w; best=o; } continue; }
    o.hp=Math.min(o.maxHp,o.hp+o.maxHp*K.pct); n++; if(!G.auto&&n<6) addText(o.x,o.y-o.r-8,'+','#7dffa8'); }
  if(K.toss&&best){ G.fd.haz.push({k:'meat', x0:e.x, y0:e.y-10, x:best.x, y:best.y, tg:best, t:0, dur:.7, pct:K.pct}); return false; }
  if(n){ G.fx.push({k:'ring', x:e.x, y:e.y, r0:10, r1:K.r, t:0, dur:.5, c:'#7dffa8', w:6, dead:false}); F.healT=G.t; } return false; }};
FK.buff={tick(e,F,K,dt){ F.bf=(F.bf||0)-dt; if(F.bf>0) return false; F.bf=.5; if(F.st!==1&&!F.ramp) return false; F.drum=G.t;
  for(const o of query(e.x,e.y,K.r)){ if(o.dead||o===e||!o.fm||o.d.fam!==e.d.fam) continue; if((o.x-e.x)**2+(o.y-e.y)**2<K.r*K.r){ o.fm.buffT=G.t+.75; o.fm.buffV=K.spd; } }
  return false; }};
FK.trap={tick(e,F,K,dt){ if(F.st!==1) return false; F.tc=(F.tc==null?rand(1,2):F.tc)-dt; if(F.tc>0) return false; F.tc=K.cd*rand(.9,1.2);
  let mine=0; for(const h of G.fd.haz) if(h.k==='trap'&&h.own===e.id) mine++; if(mine>=K.max) return false;
  const x=e.x+(P.x-e.x)*.35, y=e.y+(P.y-e.y)*.35; G.fd.haz.push({k:'trap', x, y, r:15, t:0, arm:.6, life:30, dmg:K.dmg*e.fdK, own:e.id}); return false; }};
FK.shield={tick(e,F,K,dt,d,dx,dy){ const a=Math.atan2(dy,dx); if(F.ang==null) F.ang=a; const mx=K.turn*dt; F.ang+=clamp(angDiff(a,F.ang),-mx,mx);
  e.def=(e.stunT>0||e.freezeT>0)?0:K.red; e.shArc=1; return false; }};
FK.row={tick(e,F,K,dt,d,dx,dy,M){ if(F.st!==1||F.slot==null) return false;
  const tx=P.x-dy*F.slot*K.gap-e.x, ty=P.y+dx*F.slot*K.gap-e.y, l=Math.hypot(tx,ty)||1; M.tx=tx/l; M.ty=ty/l; return false; }};
FK.split={death(e,F,K){ for(let i=0;i<K.n;i++){ const a=i*TAU/K.n+rand(-.3,.3), c=fdExtra(K.into,e.x+Math.cos(a)*e.r*.6,e.y+Math.sin(a)*e.r*.6,e,{aggro:1, el:e.el, child:1});
  if(c){ c.kx=Math.cos(a)*260; c.ky=Math.sin(a)*260; } } }};
FK.push={death(e,F,K){ G.fx.push({k:'ring', x:e.x, y:e.y, r0:10, r1:K.r, t:0, dur:.45, c:'#dcffe8', w:10, dead:false}); burst(e.x,e.y,12,'#dcffe8',260,.5,2.5);
  const px=P.x-e.x, py=P.y-e.y, pl=Math.hypot(px,py)||1; if(pl<K.r+P.r){ P.kx+=px/pl*K.knock; P.ky+=py/pl*K.knock; }
  for(const o of query(e.x,e.y,K.r)){ if(o.dead||o===e||o.boss) continue; const l=Math.hypot(o.x-e.x,o.y-e.y)||1; if(l<K.r){ o.kx+=(o.x-e.x)/l*K.knock*.6; o.ky+=(o.y-e.y)/l*K.knock*.6; } } }};
FK.skitter={tick(e,F,K,dt,d,dx,dy,M,atk,hurt){ if(hurt){ const a=rand(0,TAU); F.sk={x:Math.cos(a), y:Math.sin(a), t:.45}; }
  if(F.sk&&F.sk.t>0){ F.sk.t-=dt; M.tx=F.sk.x; M.ty=F.sk.y; M.sp=K.sp*e.slowF; M.acc=12; } return false; }};
FK.hide={tick(e,F,K,dt,d){ const hid=F.st===0&&d>K.r&&e.hp>=e.maxHp; e.alpha=hid?.16:undefined; if(F.hid&&!hid&&!G.auto) addText(e.x,e.y-e.r-10,'!','#9fe08a'); F.hid=hid; return false; }};
FK.ghost={tick(e,F,K){ e.alpha=K.a; return false; }};
FK.swap={tick(e,F,K,dt){ F.sw=(F.sw==null?K.every:F.sw)-dt; if(F.sw>0) return false; F.sw=K.every; const i=K.els.indexOf(e.el); e.el=K.els[(i+1)%K.els.length]; F.swT=G.t; return false; }};
FK.trail={tick(e,F,K,dt){ F.tr=(F.tr||0)-dt; if(F.tr>0) return false; F.tr=K.every; if(Math.hypot(e.vx,e.vy)<12) return false; fdFire(e.x,e.y+e.r*.5,K.r,K.dmg*e.fdK,K.life); return false; }};
FK.gems={}; FK.potion={};                                              // handled by the kill reward (62 fdOnKill): extra XP gems · a potion drop
FK.hop={tick(e,F,K,dt,d,dx,dy,M){ M.sp*=.35+1.3*Math.max(0,Math.sin(G.t*6.5+e.id)); return false; }};
FK.merge={tick(e,F,K,dt){ if(F.merged||F.st===2) return false; F.mg=(F.mg||0)-dt; if(F.mg>0) return false; F.mg=.5;
  const near=[]; for(const o of query(e.x,e.y,K.r)){ if(o===e||o.dead||o.boss||!o.fm||o.fm.merged||o.d.fam!=='slime'||o.el!==e.el||o.d.struct) continue; if((o.x-e.x)**2+(o.y-e.y)**2<K.r*K.r) near.push(o); }
  if(near.length<K.n-1){ F.mt=0; return false; }
  F.mt=(F.mt||0)+.5; if(F.mt<K.t) return false;
  near.sort((a,b)=>((a.x-e.x)**2+(a.y-e.y)**2)-((b.x-e.x)**2+(b.y-e.y)**2));
  for(const o of near.slice(0,K.n-1)){ burst(o.x,o.y,8,o.d.goo,120,.4,3); fdVanish(o); }
  if(!(e.rank>=2)){ const k=e.rank|0; if(k) { e.hp/=RANK[k].hp; e.maxHp/=RANK[k].hp; e.dmg/=RANK[k].dmg; e.r/=RANK[k].r; e.speed/=RANK[k].sp; e.mass/=RANK[k].r*RANK[k].r; e.rank=0; } rankApply(e,2); e.fdK=BAL.FIELD.dmgByLv(e.lv)*RANK[2].dmg; }
  e.hp=e.maxHp; F.merged=1; fdAggro(e,F); G.fx.push({k:'ring', x:e.x, y:e.y, r0:6, r1:90, t:0, dur:.5, c:'#c07aff', w:10, dead:false}); addText(e.x,e.y-e.r-18,'รวมร่าง!','#c07aff',true); sfx('level'); return false; }};
FK.berserk={tick(e,F,K){ if(F.rage||e.hp>e.maxHp*K.at) return false; F.rage=1; F.spdMul=(F.spdMul||1)*K.spd; e.dmg*=K.dmg; e.fdK*=K.dmg; fdAggro(e,F); addText(e.x,e.y-e.r-16,'คลั่ง!','#ff5a3a',true); return false; }};
FK.summon={tick(e,F,K,dt){ if(F.st!==1) return false; F.sm=(F.sm==null?rand(2,K.cd*.6):F.sm)-dt; if(F.sm>0) return false; F.sm=K.cd;
  F.kids=(F.kids||[]).filter(k=>!k.dead); const n=Math.min(K.n,K.max-F.kids.length); if(n<=0) return false;
  for(let i=0;i<n;i++){ let x,y; if(K.edge){ const a=Math.atan2(e.y-P.y,e.x-P.x)+rand(-.9,.9), R=Math.hypot(VW,VH)/2+40; x=P.x+Math.cos(a)*R; y=P.y+Math.sin(a)*R; }
    else { const a=i*TAU/n+rand(-.3,.3); x=e.x+Math.cos(a)*60; y=e.y+Math.sin(a)*60; }
    const k=fdExtra(K.type,x,y,e,{aggro:1, sum:1}); if(k){ F.kids.push(k); if(!K.edge) burst(x,y,6,'#d8d0c0',100,.4,3,'rock'); } }
  G.fx.push({k:'ring', x:e.x, y:e.y, r0:10, r1:K.edge?140:90, t:0, dur:.5, c:K.edge?'#f0c75a':'#a46bff', w:8, dead:false});
  addText(e.x,e.y-e.r-16,K.edge?'เป่าเขาศึก!':'ปลุกหมาป่า!',K.edge?'#f0c75a':'#c9a7ff',true); return false; }};
FK.boom={tick(e,F,K,dt,d,dx,dy,M){
  if(F.fuse!=null){ F.fuse-=dt; M.sp=0; e.flash=((F.fuse*12)|0)%2?.06:0; if(F.fuse<=0){ fdBoom(e,F,K,true); return true; } return false; }
  if(F.st===1&&d<K.r*.7){ F.fuse=K.fuse; addText(e.x,e.y-e.r-12,'!!','#ff6a3a',true); } return false; },
  death(e,F,K){ if(!F.blown) fdBoom(e,F,K,false); }};
function fdBoom(e,F,K,self){ F.blown=1; const R=K.r, dmg=K.dmg*e.fdK;
  G.fx.push({k:'boom', x:e.x, y:e.y, r:R, t:0, dur:.45, c:'#ff8a3a', dead:false}); G.fx.push({k:'ring', x:e.x, y:e.y, r0:R*.3, r1:R*1.2, t:0, dur:.32, c:'#fff2d0', w:6, dead:false});
  burst(e.x,e.y,14,'#ffb050',260,.5,4); G.shake=Math.max(G.shake,8); sfx('boom');
  if(self){ const px=P.x-e.x, py=P.y-e.y; if(px*px+py*py<(R+P.r)**2) hurtPlayer(dmg); }
  for(const o of query(e.x,e.y,R+60)){ if(o.dead||o===e) continue; const ox=o.x-e.x, oy=o.y-e.y, l=Math.hypot(ox,oy); if(l-o.r>R) continue;
    damageEnemy(o,(self?1:3)*dmg/Math.max(.5,P.might),null,{knock:260, nx:l?ox/l:1, ny:l?oy/l:0, quiet:true}); }
  if(self&&!e.dead){ e.fdNoLoot=1; e.xp=0; killEnemy(e); } }
FK.quake={tick(e,F,K,dt,d,dx,dy,M){ const Q=F.qk||(F.qk={cd:rand(2,K.cd), t:0, a:0});
  if(Q.t>0){ Q.t-=dt; M.sp=0; if(e.stunT>0||e.freezeT>0){ Q.t=0; F.tele=null; Q.cd=1.5; return false; }
    if(Q.t<=0){ G.fd.haz.push({k:'quake', x:e.x, y:e.y, ang:Q.a, len:K.len, w:K.w, t:0, sp:640, dmg:e.dmg*K.dmg, hit:0}); G.shake=Math.max(G.shake,7); sfx('boom'); F.tele=null; Q.cd=K.cd; } return false; }
  if(F.st!==1) return false; Q.cd-=dt;
  if(Q.cd<=0&&d<K.len*.9){ Q.t=K.aim; Q.a=Math.atan2(dy,dx); F.tele={k:'line', ang:Q.a, len:K.len, t:0, dur:K.aim, w:K.w}; M.sp=0; } return false; }};
// gold-rank (ยอดฝีมือ) monsters: one extra move — a ground slam ring (telegraphed)
function fdEliteSlam(e,F,dt,d,M){ const S=F.es||(F.es={cd:rand(3,5), t:0});
  if(S.t>0){ S.t-=dt; M.sp=0; fdMove(e,dt,M); if(S.t<=0){ const R=125; G.fx.push({k:'ring', x:e.x, y:e.y, r0:20, r1:R, t:0, dur:.4, c:'#f0c75a', w:12, dead:false}); G.shake=Math.max(G.shake,6); sfx('boom');
      const px=P.x-e.x, py=P.y-e.y, pl=Math.hypot(px,py)||1; if(pl<R+P.r){ hurtPlayer(e.dmg*1.2); P.kx+=px/pl*380; P.ky+=py/pl*380; } S.cd=6; F.tele=null; } return true; }
  S.cd-=dt; if(S.cd<=0&&d<200&&!(e.stunT>0||e.freezeT>0)){ S.t=.9; F.tele={k:'circle', r:125, t:0, dur:.9}; } return false; }
// an archer on a watch tower: stays up there, shoots further, takes half damage · the tower falls → it drops down (stunned, hurt)
function fdOnTower(e,F,K,dt,d,dx,dy,hurt){ const T=F.tower;
  if(!T||T.dead){ F.tower=null; e.lift=0; e.def=0; e.stunT=1.5; e.hp=Math.max(1,e.hp-e.maxHp*.15); fdAggro(e,F); addText(e.x,e.y-e.r-14,'ตกหอ!','#ffe14a',true); return; }
  e.x=T.x; e.y=T.y+3; e.vx=e.vy=e.kx=e.ky=0; e.lift=T.r*1.85; e.def=.5; e.atkCd=Math.max(e.atkCd,.5); e.face=P.x<e.x?-1:1;
  if(F.st===0&&(d<(e.d.aggro||260)*1.4||hurt)) fdAggro(e,F);
  const R=K.ranged; if(F.st!==1||!R) return;
  if(F.burst>0){ F.bt-=dt; if(F.bt<=0){ F.burst--; F.bt=R.gap||.15; fdShoot(e,R); } return; }
  F.sc=(F.sc==null?rand(.8,1.8):F.sc)-dt; if(F.sc<=0&&d<R.keep*2.1){ F.sc=R.cd*rand(.9,1.2); if(R.burst>1){ F.burst=R.burst-1; F.bt=R.gap||.15; } fdShoot(e,R); } }

/* ---- monster attacks: shots (straight / boomerang) and ground hazards (lobbed rock, trap, fire, quake wave, tossed meat) ---- */
const FD_SHOT_C={fire:'#ff8a3a', arrow:'#e8d8b0', curse:'#a46bff', rock:'#a49a86', crown:'#d8a050', orb:'#c39cff'};
function fdShoot(e,K){ const F=G.fd; if(!F) return; const sh=F.shots.length<160;
  if(K.kind==='lob'){ const t=K.t||1, lx=P.x+P.vx*t*.45, ly=P.y+P.vy*t*.45; F.haz.push({k:'lob', x0:e.x, y0:e.y-8, x:lx, y:ly, t:0, dur:t, r:K.r||32, dmg:K.dmg*e.fdK}); return; }
  if(!sh) return; const a=Math.atan2(P.y-e.y,P.x-e.x)+(K.burst>1?rand(-.09,.09):0), sp=K.sp||220;
  F.shots.push({x:e.x, y:e.y-(e.lift||0)*.4-6, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:K.kind==='arrow'?5:7, dmg:K.dmg*e.fdK, life:3.5, kind:K.kind, el:e.el, slow:K.slow||0, slowT:K.slowT||0}); }
function fdShot(x,y,a,sp,dmg,kind,o){ const F=G.fd; if(!F||F.shots.length>=200) return null; const s=Object.assign({x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:8, dmg, life:4, kind},o||{}); F.shots.push(s); return s; }
function fdFire(x,y,r,dmg,life){ const F=G.fd; if(!F) return; let n=0; for(const h of F.haz) if(h.k==='fire') n++; if(n>=90) return; F.haz.push({k:'fire', x, y, r, dmg, t:0, life, tick:0}); }
function fdShotTick(dt){ const F=G.fd, pr=P.r*.8;
  for(const s of F.shots){ if(s.dead) continue; s.life-=dt; s.t=(s.t||0)+dt;
    if(s.ret){ const o=s.ret; if(s.t>s.out&&o&&!o.dead){ const ax=o.x-s.x, ay=o.y-s.y, l=Math.hypot(ax,ay)||1; s.vx+=(ax/l*s.sp-s.vx)*Math.min(1,dt*4); s.vy+=(ay/l*s.sp-s.vy)*Math.min(1,dt*4); if(l<o.r) s.dead=true; } s.rot=(s.rot||0)+dt*14; }
    s.x+=s.vx*dt; s.y+=s.vy*dt;
    if(s.life<=0||(!s.ret&&G.obstacles&&terBlocks(s.x,s.y,s.r))){ s.dead=true; continue; }
    const dx=s.x-P.x, dy=s.y-(P.y-6); if(dx*dx+dy*dy<(s.r+pr)**2&&!s.hitP){ if(s.ret) s.hitP=1; else s.dead=true; hurtPlayer(s.dmg); if(s.slow&&!G.over){ F.curseT=G.t+s.slowT; F.curseV=s.slow; } if(G.over) return; } }
  compact(F.shots); }
function fdHazTick(dt){ const F=G.fd;
  for(const h of F.haz){ if(h.dead) continue; h.t+=dt;
    switch(h.k){
      case 'lob': if(h.t>=h.dur){ h.dead=true; burst(h.x,h.y,8,'#8a7a5a',150,.4,3,'rock'); if((P.x-h.x)**2+(P.y-h.y)**2<(h.r+P.r*.5)**2) hurtPlayer(h.dmg); } break;
      case 'trap': if(h.t>h.life){ h.dead=true; break; } if(h.t>h.arm&&(P.x-h.x)**2+(P.y-h.y)**2<(h.r+P.r*.6)**2){ h.dead=true; hurtPlayer(h.dmg); F.curseT=Math.max(F.curseT||0,G.t+.8); F.curseV=Math.max(F.curseV||0,.5); burst(h.x,h.y,8,'#c9a57a',140,.4,3,'rock'); sfx('hit'); }
        break;
      case 'fire': if(h.t>h.life){ h.dead=true; break; } h.tick-=dt; if(h.tick<=0&&(P.x-h.x)**2+(P.y-h.y)**2<(h.r+P.r*.5)**2){ h.tick=.5; hurtPlayer(h.dmg); } break;
      case 'quake': { const f=h.t*h.sp; if(f>h.len+40){ h.dead=true; break; } if(!h.hit){ const c=Math.cos(h.ang), s=Math.sin(h.ang), px=P.x-h.x, py=P.y-h.y, al=px*c+py*s, lat=Math.abs(-px*s+py*c);
          if(al>f-40&&al<f+10&&lat<h.w+P.r){ h.hit=1; hurtPlayer(h.dmg); P.kx+=c*300; P.ky+=s*300; } }
        if(!G.auto&&Math.random()<dt*30){ const c=Math.cos(h.ang), s=Math.sin(h.ang); burst(h.x+c*f,h.y+s*f,2,'#8a6e4e',120,.4,3,'rock'); } break; }
      case 'meat': { const o=h.tg; if(o&&!o.dead){ h.x=o.x; h.y=o.y; } if(h.t>=h.dur){ h.dead=true; if(o&&!o.dead){ o.hp=Math.min(o.maxHp,o.hp+o.maxHp*h.pct); addText(o.x,o.y-o.r-8,'+','#7dffa8'); burst(o.x,o.y,5,'#ffcf8a',90,.4,2.5); } } break; } } }
  compact(F.haz); }
// rampage / split / summons / dismount: a monster with no spawn point of its own (gone when it is far away and calm)
function fdExtra(type,x,y,src,o){ o=o||{}; const sf=src&&src.fm;
  const e=fdSpawn(type,x,y,{lv:o.lv||(EN[type]&&EN[type].lv)||(src&&src.lv)||1, rank:o.rank|0, el:o.el, aggro:o.aggro, hx:sf?sf.hx:x, hy:sf?sf.hy:y, free:o.free||0});
  if(e){ e.fm.sum=o.sum?1:0; e.fm.child=o.child||EN[type].child?1:0; if(o.ramp) e.fm.ramp=o.ramp; } return e; }
// remove a monster without a kill (asleep, merged, escaped, dismounted) · its spawn point remembers HP (asleep) or waits to respawn
function fdVanish(e,escaped){ if(e.dead) return; e.dead=true; e.gone=true; const F=e.fm, r=F&&F.rec;
  if(r){ r.e=null; if(escaped){ r.st='dead'; r.t=G.t+rand(BAL.FIELD.respawn[0],BAL.FIELD.respawn[1]); r.rank=null; r.hpF=1; } else r.hpF=Math.max(.05,e.hp/e.maxHp); } }
