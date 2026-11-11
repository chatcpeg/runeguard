/* ================= 25a-skx-beh.js · lane B · behaviours of the 30 character-only skills (CLASSES skx · docs/PROPOSAL-skill-trees.md §3) ================= */
// These skills sit only in CLASSES[].skx / adv.skx, which classic never reads → nothing here runs in classic (golden unchanged).
// Every cast aims once at the target and goes straight (docs/PROPOSAL-mastery.md §2) · reach grows with DEX (P.rangeMul) like the old
// skills. Hooks into the shared loops are one guarded line each: fireProj → pxFire · updateProjs → pxRet / pxEnd · projHit → pxHit ·
// BEH.zone → zxCast · updateZones → zxTick / zxEnd (zones with x2).

/* ---- new skill types ---- */
// counter (ดาบสวนกลับ): HP + shield dropped since last frame = we were hit → a 360° slash round the hero (on its cooldown)
BEH.counter=(s,dt)=>{ const st=s.st, cur=P.hp+P.shield; s.cdT-=dt;
  const hit=st.last!=null&&cur<st.last-.01; st.last=cur;
  if(!hit||s.cdT>0) return;
  s.cdT=cdOf(s); const r=pv(s,'range')*P.area*(1+((P.rangeMul||1)-1)*.5);
  aoe(P.x,P.y,r,pv(s,'dmg'),s,{knock:pv(s,'knock'),stun:pv(s,'stun')});
  G.fx.push({k:'slash',a:P.aim,arc:TAU,r,t:0,dur:.28,c:s.def.c,flip:false,follow:true,x:P.x,y:P.y,dead:false});
  G.fx.push({k:'ring',x:P.x,y:P.y,r0:r*.4,r1:r*1.05,t:0,dur:.25,c:'#ffffff',w:4,follow:true,dead:false});
  burst(P.x,P.y-6,qLv()?10:4,s.def.c,r*2.2,.35,3,'shard'); P.atkT=.12; sfx('swing'); };
// thrust (ทวนสามแทง): `count` straight thrusts along the aim, each hits everything on the line (width = size)
BEH.thrust=(s,dt)=>{ s.cdT-=dt; if(s.cdT>0) return;
  const range=pv(s,'range')*P.area*(1+((P.rangeMul||1)-1)*.5);
  if(!G.near||G.nearD>range+G.near.r){ s.cdT=.1; return; }
  s.cdT=cdOf(s); const a=Math.atan2(G.near.y-P.y,G.near.x-P.x), n=pv(s,'count')||1;
  for(let i=0;i<n;i++){ const go=()=>thrustOnce(s,a,range,i); if(i===0) go(); else later(i*.12,go); } };
function thrustOnce(s,a,range,i){ if(!P||G.over) return;
  const w=(pv(s,'size')||14)*(1+(P.area-1)*.5), ca=Math.cos(a), sa=Math.sin(a), x0=P.x, y0=P.y-4, x1=x0+ca*range, y1=y0+sa*range, dmg=pv(s,'dmg'), kn=pv(s,'knock');
  for(const e of query((x0+x1)/2,(y0+y1)/2,range/2+w+60)){ if(e.dead) continue; const rr=w+e.r; if(segD2(e.x,e.y,x0,y0,x1,y1)>rr*rr) continue;
    damageEnemy(e,dmg,s,{knock:kn,nx:ca,ny:sa}); }
  const o=(i%3-1)*.035; G.fx.push({k:'beamline',x:x0,y:y0,a:a+o,len:range,t:0,dur:.16,c:s.def.c,dead:false});
  if(!G.auto) for(let k=0;k<(qLv()?4:2);k++) part({x:x1,y:y1,vx:ca*rand(60,160)+rand(-40,40),vy:sa*rand(60,160)+rand(-40,40),life:.25,s:2.4,c:'#ffffff',g:0,drag:4,k:'streak',add:true});
  P.swing={t:0,dur:.12,a0:a-.15,a1:a+.15}; P.atkT=.12; sfx('swing'); }
// rite (สังเวยโลหิต): pay `cost` of the current HP (never below 1), blast round the hero, heal `drain` of the damage it just did
BEH.rite=(s,dt)=>{ s.cdT-=dt; if(s.cdT>0) return; const r=pv(s,'r')*P.area;
  if(!G.near||G.nearD>r*1.1){ s.cdT=.15; return; }
  s.cdT=cdOf(s); const pay=Math.min(Math.max(0,P.hp-1),P.hp*(pv(s,'cost')||0)); if(pay>0){ P.hp-=pay; if(pay>=2) addNum(P.x+rand(-6,6),P.y-30,Math.round(pay),'h'); }
  const d0=s.dealt; aoe(P.x,P.y,r,pv(s,'dmg'),s,{knock:pv(s,'knock')});
  const got=(s.dealt-d0)*(pv(s,'drain')||0); if(got>0) healP(got);
  G.fx.push({k:'ring',x:P.x,y:P.y,r0:14,r1:r,t:0,dur:.42,c:s.def.c,w:14,follow:true,dead:false}); G.fx.push({k:'boom',x:P.x,y:P.y,r:r*.7,t:0,dur:.35,c:'#ff2a2a',dead:false});
  burst(P.x,P.y-4,qLv()?16:6,'#c41a1a',r*2.4,.5,3.5); if(!G.auto&&qLv()>=1) addDecal(splatTex('#6a0d0d',1),P.x,P.y+6,r*.55,4,.5);
  G.shake=Math.max(G.shake,5); P.atkT=.12; sfx('boom'); };
// seal (ตราประทับแสง): stamps up to `targets` enemies round the aimed one · each stamp follows its enemy and bursts after `delay`
// (a pillar of light, r round it) · a stamp whose enemy already died bursts where it fell
BEH.seal=(s,dt)=>{ const st=s.st, Q=st.q||(st.q=[]);
  if(Q.length){ for(const m of Q){ if(!m.e.dead){ m.x=m.e.x; m.y=m.e.y; } if(G.t>=m.at){ m.done=1; sealBoom(s,m); if(G.over) return; } } st.q=Q.filter(m=>!m.done); }
  s.cdT-=dt; if(s.cdT>0) return;
  const R=Math.min((pv(s,'range')||380)*(P.rangeMul||1),aimReach()), t=G.near&&G.nearD<R?G.near:null; if(!t){ s.cdT=.2; return; }
  s.cdT=cdOf(s); const n=Math.max(1,Math.round(pv(s,'targets')||3)), dl=pv(s,'delay')||1, L=[];
  for(const e of query(t.x,t.y,240)) if(!e.dead&&!st.q.some(m=>m.e===e)) L.push(e);
  L.sort((a,b)=>((a.x-t.x)**2+(a.y-t.y)**2)-((b.x-t.x)**2+(b.y-t.y)**2));
  for(const e of L.slice(0,n)) st.q.push({e, x:e.x, y:e.y, at:G.t+dl, t0:G.t});
  G.fx.push({k:'ring',x:t.x,y:t.y,r0:10,r1:60,t:0,dur:.3,c:s.def.c,w:4,dead:false}); P.atkT=.12; if(!G.auto) sfx('shield'); };
function sealBoom(s,m){ const r=pv(s,'r')*P.area; aoe(m.x,m.y,r,pv(s,'dmg'),s,{knock:120});
  G.fx.push({k:'pillar',x:m.x,y:m.y,r:Math.min(40,r*.6),t:0,dur:.45,c:s.def.c,dead:false}); G.fx.push({k:'ring',x:m.x,y:m.y,r0:r*.3,r1:r,t:0,dur:.3,c:'#fff6c8',w:5,dead:false}); if(!G.auto) sfx('boom'); }
// ward (ม่านอรุณ): erases every enemy shot inside r (heal per shot), then a light wave that pushes and slows · wakes for shots too
BEH.ward=(s,dt)=>{ s.cdT-=dt; if(s.cdT>0) return; const r=pv(s,'r')*P.area, r2=r*r;
  let shots=0; for(const b of G.eprojs) if(!b.dead&&(b.x-P.x)**2+(b.y-P.y)**2<r2) shots++;
  if(!shots&&(!G.near||G.nearD>r*.9)){ s.cdT=.15; return; }
  s.cdT=cdOf(s); let n=0;
  for(const b of G.eprojs){ if(b.dead||(b.x-P.x)**2+(b.y-P.y)**2>=r2) continue; b.dead=true; b.life=-1; n++; if(!G.auto&&n<14) burst(b.x,b.y,3,'#ffe9b0',70,.3,2); }   // life −1: gone before it can hit this frame
  if(n) healP(n*(pv(s,'heal')||2));
  aoe(P.x,P.y,r,pv(s,'dmg'),s,{knock:pv(s,'knock'),slow:pv(s,'slow'),slowDur:1.5});
  G.fx.push({k:'ring',x:P.x,y:P.y,r0:20,r1:r,t:0,dur:.45,c:s.def.c,w:10,follow:true,dead:false}); G.fx.push({k:'ring',x:P.x,y:P.y,r0:r*.6,r1:r*1.08,t:0,dur:.5,c:'#ffffff',w:3,follow:true,dead:false});
  P.atkT=.12; if(!G.auto) sfx('shield'); };
// combo (ห้าหมัดสุริยัน): quick punches (the swing of 19) · every `fin`-th cast a sun blast in front instead (boom × dmg, stun)
BEH.combo=(s,dt)=>{ s.cdT-=dt; if(s.cdT>0) return; const range=pv(s,'range')*P.area;
  if(!G.near||G.nearD>range*1.6+G.near.r){ s.cdT=.1; return; }
  s.cdT=cdOf(s); s.st.n=(s.st.n|0)+1; const fin=Math.max(2,Math.round(pv(s,'fin')||5));
  if(s.st.n%fin){ doSwing(s,s.st.n); return; }
  const a=Math.atan2(G.near.y-P.y,G.near.x-P.x), x=P.x+Math.cos(a)*range*.7, y=P.y+Math.sin(a)*range*.7, r=pv(s,'r')*P.area;
  aoe(x,y,r,pv(s,'dmg')*(pv(s,'boom')||3),s,{knock:(pv(s,'knock')||100)*2,stun:pv(s,'stun')});
  G.fx.push({k:'boom',x,y,r,t:0,dur:.4,c:s.def.c,dead:false}); G.fx.push({k:'ring',x,y,r0:r*.2,r1:r*1.1,t:0,dur:.3,c:'#fff2c0',w:7,dead:false});
  burst(x,y,qLv()?16:6,'#ffb347',r*2.6,.45,3.5); G.shake=Math.max(G.shake,6); P.atkT=.16; sfx('boom'); };

/* ---- projectiles (fireProj → pxFire when SK[id].px) ---- */
// ret: boomerang (out to its range, then back to the hand, hitting everything again) · hook: knock < 0 = pulled to the hero ·
// slow: slows what it hits · drip: leaves burning ground on its way (the 26a fire trail) · def.pass: flies through everything and
// only explodes where its range ends · hold: a net that freezes everything round the hit (or the end) · split: the first hit bursts into
// `split` star shards that fly on ahead (shard × dmg each)
function pxFire(s,p){ const v=k=>pv(s,k);
  if(v('ret')) p.ret=1;
  const ho=v('hold'); if(ho){ p.hold=ho; p.x2=1; }
  const sp=v('split'); if(sp){ p.split=sp; p.shard=v('shard')||.4; p.x2=1; }
  const bo=v('bounce'); if(bo){ p.bounce=bo; p.jump=(v('jump')||200)*P.area; p.x2=1; }   // ricochet: on a hit, on to the nearest enemy not hit yet
  const hk=v('hook'); if(hk) p.knock=-hk;
  const sl=v('slow'); if(sl){ p.slow=sl; p.x2=1; }
  const dr=v('drip'); if(dr||s.def.pass){ const m=p.mx||(p.mx={lv:0, look:{}, ht:0, dd:0, ph:0}); if(dr) m.drip=Math.max(m.drip||0,dr*P.durMul); if(s.def.pass) m.pass=999; } }
// orbit extras (BEH.orbit when SK[id].ox): radius breathes in and out (wave) · own hit rate · slow
function orbX(s,R0){ const w=pv(s,'wave'), R=w?R0*(1+w*Math.sin(G.t*2.2)):R0; s.st.R=R; return {R, rate:pv(s,'rate')||.5, slow:pv(s,'slow')||0}; }
// projHit → true = handled here (the shared code stops)
function pxHit(p,e){
  if(p.slow&&!e.dead){ const f=1-p.slow*(e.boss?.5:1); if(f<e.slowF) e.slowF=f; e.slowT=Math.max(e.slowT,1.2); }
  if(p.hold){ netBurst(p); p.dead=true; return true; }
  if(p.bounce>0){ let nx=null, bd=p.jump*p.jump;
    for(const q of query(e.x,e.y,p.jump+60)){ if(q.dead||q===e||p.hit.indexOf(q.id)>=0) continue; const d=(q.x-e.x)**2+(q.y-e.y)**2; if(d<bd){ bd=d; nx=q; } }
    if(nx){ p.bounce--; const sp=Math.hypot(p.vx,p.vy)||600, a=Math.atan2(nx.y-e.y,nx.x-e.x); p.x=e.x; p.y=e.y; p.vx=Math.cos(a)*sp; p.vy=Math.sin(a)*sp; p.life=p.max; return true; } }
  if(p.split&&!p.splitDone){ p.splitDone=1; const n=p.split, a0=Math.atan2(p.vy,p.vx), sp=620, life=.34;
    for(let i=0;i<n;i++){ const a=a0+(n>1?(i/(n-1)-.5)*.9:0);
      G.projs.push({x:e.x,y:e.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:4,dmg:p.dmg*p.shard,pierce:1,life,max:life,knock:40,explode:0,homing:0,crit:p.crit,shape:'star',c:p.c,src:p.src,burn:0,hit:[e.id],tg:null,dead:false,t:0,fxd:true}); } }
  return false; }
// updateProjs, end of range → true = handled here (the shared end is skipped)
function pxEnd(p){ if(p.hold){ netBurst(p); return true; } return false; }
// the net: freezes (hold s) and hurts everything in explode · no knock-back (they stay caught) · bosses only take the damage
function netBurst(p){ const r=p.explode||60; aoe(p.x,p.y,r,p.dmg,p.src,{freeze:p.hold});
  G.fx.push({k:'netx',x:p.x,y:p.y,r,t:0,dur:Math.max(.5,p.hold),c:p.c,dead:false}); G.fx.push({k:'ring',x:p.x,y:p.y,r0:r*.3,r1:r,t:0,dur:.25,c:p.c,w:4,dead:false}); sfx('hit'); }
// boomerang flight: when the outward life runs out it turns, hits can repeat, and it homes on the hero until caught (true = gone)
function pxRet(p,dt){
  if(!p.back){ if(p.life>0) return false; p.back=true; p.hit=null; p.life=p.max=2; }
  const dx=P.x-p.x, dy=(P.y-6)-p.y, d=Math.hypot(dx,dy)||1, sp=Math.hypot(p.vx,p.vy)||400;
  if(d<P.r+14){ p.dead=true; return true; }
  const k=Math.min(1,dt*7); p.vx+=(dx/d*sp-p.vx)*k; p.vy+=(dy/d*sp-p.vy)*k; return false; }

/* ---- summons (BEH.summon: modes other than hawk / clone) ---- */
function skxUnit(s,u,dt,i,n){ if(s.def.mode==='wolf') wolfUpdate(s,u,dt,i,n); else if(s.def.mode==='lantern') lanternUpdate(s,u,dt,i,n); }
// lantern: floats over the shoulder, a light ray (pierce) at the enemy nearest to it, aimed once, straight
function lanternUpdate(s,u,dt,i,n){ const fa=G.t*1.1+i*TAU/n, fx=P.x+Math.cos(fa)*30, fy=P.y-46+Math.sin(fa)*8, k=Math.min(1,dt*6);
  u.x+=(fx-u.x)*k; u.y+=(fy-u.y)*k; u.cd-=dt; if(u.fl>0) u.fl-=dt; if(u.cd>0) return;
  const reach=430*(P.rangeMul||1), t=nearestTo(u.x,u.y,reach); if(!t){ u.cd=.2; return; }
  u.cd=cdOf(s); u.fl=.15; const a=Math.atan2(t.y-u.y,t.x-u.x), sp=pv(s,'speed')||900, life=(pv(s,'life')||.5)*(P.rangeMul||1);
  G.projs.push({x:u.x,y:u.y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,dmg:pv(s,'dmg'),pierce:pv(s,'pierce')||1,life,max:life,knock:50,explode:0,homing:0,crit:0,shape:'beam',c:s.def.c,src:s,burn:0,hit:null,tg:null,dead:false,t:0});
  G.fx.push({k:'beamline',x:u.x,y:u.y,a,len:sp*life,t:0,dur:.18,c:s.def.c,dead:false}); if(!G.auto) sfx('shoot'); }
// wolf: runs at the nearest enemy (within 420 of the hero), bites on its cooldown (slow · the skill's bleed), else trots at heel
function wolfUpdate(s,u,dt,i,n){
  if((u.x-P.x)**2+(u.y-P.y)**2>700*700){ u.x=P.x; u.y=P.y; u.tg=null; }
  u.cd-=dt; u.rt=(u.rt||0)-dt; if(u.bite>0) u.bite-=dt;
  if(u.tg&&(u.tg.dead||(u.tg.x-P.x)**2+(u.tg.y-P.y)**2>420*420)) u.tg=null;
  if(!u.tg&&u.rt<=0){ u.rt=.25; const t=nearestTo(u.x,u.y,360); u.tg=t&&(t.x-P.x)**2+(t.y-P.y)**2<420*420?t:null; }
  const hx=P.x+Math.cos(i*TAU/n+PI*.75)*36, hy=P.y+14+Math.sin(i*TAU/n+PI*.75)*12, tx=u.tg?u.tg.x:hx, ty=u.tg?u.tg.y:hy;
  const dx=tx-u.x, dy=ty-u.y, d=Math.hypot(dx,dy)||1, reach=u.tg?(pv(s,'r')||24)+u.tg.r*.6:4, sp=u.tg?360:300;
  if(d>reach){ const st=Math.min(d-reach*.8,sp*dt); u.x+=dx/d*st; u.y+=dy/d*st; u.run=1; if(Math.abs(dx)>2) u.face=dx<0?-1:1; } else u.run=0;
  if(u.tg&&d<=reach+2&&u.cd<=0){ u.cd=cdOf(s); u.bite=.18; const sl=pv(s,'slow')||0;
    damageEnemy(u.tg,pv(s,'dmg'),s,{knock:60,nx:dx/d,ny:dy/d,slow:sl,slowDur:1});
    G.fx.push({k:'xcut',x:u.tg.x,y:u.tg.y-u.tg.r*.3,r:u.tg.r*.7,t:0,dur:.18,c:'#e6eeff',dead:false}); if(!G.auto) sfx('slice'); } }

/* ---- zones (BEH.zone → zxCast when SK[id].zx · updateZones → zxTick every frame, zxEnd when the time is up) ---- */
// place: 'self' = on the hero (follow: stays on the hero) · 'aim' = rolls straight down the aim, slowing (speed) · 'enemy' = on the
// aimed target, the rest round it · 'feet' = under the feet, a line along the way walked · 'mid' = halfway to the target ·
// lure: enemies within it walk at this zone instead of the hero (lureAt) · zone params: rep (push out) · pull · stun · boom × dmg / explode (blast when it ends) ·
// def.shoot: fires shots bolts every tick at the nearest enemy in reach · def.lob: lobs a lava bomb every tick
function zxCast(s){
  const v=k=>pv(s,k), pl=s.def.place, far=pl==='aim'||pl==='enemy'||pl==='mid', wake=far?Math.min(520*(P.rangeMul||1),aimReach()):(s.def.wake||300)*(P.rangeMul||1);
  if(!G.near||G.nearD>wake){ s.cdT=.2; return; }
  s.cdT=cdOf(s); const n=countOf(s), r=v('r')*P.area, t=G.near, a=Math.atan2(t.y-P.y,t.x-P.x), mv=Math.hypot(P.vx,P.vy), ba=mv>20?Math.atan2(-P.vy,-P.vx):a+PI;
  for(let i=0;i<n;i++){ let x=P.x, y=P.y; const o={};
    if(s.def.maxZ){ let c=0, first=-1; for(let j=0;j<G.zones.length;j++){ const q=G.zones[j]; if(q.src===s&&!q.dead){ c++; if(first<0) first=j; } }   // many small zones (caltrops): drop our own
      if(c>=s.def.maxZ&&first>=0) G.zones.splice(first,1); }                                                               // oldest, never another skill's
    if(pl==='self'){ if(i||s.def.shoot){ const b=s.def.shoot?a+PI+(i-(n-1)/2)*1.2:i*TAU/n, d=s.def.shoot?28:r*.6; x+=Math.cos(b)*d; y+=Math.sin(b)*d*.75; } if(s.def.follow||v('follow')) o.follow=1; }   // a turret stands just behind the hero
    else if(pl==='aim'){ const b=a+(i-(n-1)/2)*.35, sp=v('speed')||200; x+=Math.cos(b)*36; y+=Math.sin(b)*36; o.aim={vx:Math.cos(b)*sp, vy:Math.sin(b)*sp}; }
    else if(pl==='enemy'){ const q=aimCluster(t,i,r*2); x=q[0]; y=q[1]; }
    else if(pl==='feet'){ x+=Math.cos(ba)*(10+i*r*1.1)+Math.cos(ba+PI/2)*(i%2?r*.5:-r*.5)*(i?1:0); y+=Math.sin(ba)*(10+i*r*1.1)+Math.sin(ba+PI/2)*(i%2?r*.5:-r*.5)*(i?1:0); }
    else if(pl==='mid'){ const d=Math.min(160,G.nearD*.5), b=a+(i-(n-1)/2)*.6; x+=Math.cos(b)*d; y+=Math.sin(b)*d; }
    addZone(Object.assign({x,y,r,dur:(v('dur')||4)*P.durMul,tick:(v('tick')||.4)*(s.def.cdTick?P.cdMul:1),dmg:v('dmg')||0,slow:v('slow')||0,kind:s.def.fx,src:s,x2:1,
      rep:v('rep')||0,stun:v('stun')||0,heal:v('heal')||0,pull:v('pull')||0,boom:v('boom')||0,explode:(v('explode')||0)*P.area,bk:s.def.bk==null?220:s.def.bk,
      shoot:s.def.shoot?(v('shots')||1):0,lob:s.def.lob?1:0,reach:(v('reach')||300)*(P.rangeMul||1),pierce:v('pierce')||1,tt:s.def.shoot||s.def.lob?.2:0,
      lure:(v('lure')||0)*P.area,seen:G.t},o));
    const z=G.zones[G.zones.length-1]; if(z&&z.lure&&z.src===s) (G.lures||(G.lures=[])).push(z); }
  if(s.def.fx==='palisade'){ G.fx.push({k:'ring',x:P.x,y:P.y,r0:r*.3,r1:r,t:0,dur:.3,c:s.def.c,w:6,follow:true,dead:false}); sfx('shield'); } }
// updateEnemies: the decoy an enemy walks at instead of the hero (null = the hero) · ranged enemies and boss AI are never lured ·
// G.lures drops zones that ended (or were pushed out of G.zones) once a frame and goes back to null when empty
function lureAt(e){ const L=G.lures; if(!L) return null;
  if(G.lureT!==G.t){ G.lureT=G.t; for(let i=L.length-1;i>=0;i--){ const z=L[i]; if(z.dead||z.t>=z.dur||z.seen<G.t-.1) L.splice(i,1); } if(!L.length){ G.lures=null; return null; } }
  for(const z of L){ const dx=z.x-e.x, dy=z.y-e.y; if(dx*dx+dy*dy<z.lure*z.lure) return z; } return null; }
// one frame of an x2 zone: movement, push / pull, its own ticks → always true (the classic zone code never sees it)
function zxTick(z,dt){
  z.seen=G.t;
  if(z.follow){ z.x=P.x; z.y=P.y; }
  else if(z.aim){ z.x+=z.aim.vx*dt; z.y+=z.aim.vy*dt; const k=Math.exp(-dt*.7); z.aim.vx*=k; z.aim.vy*=k; }
  if(z.rep){ const R=z.r; for(const e of query(z.x,z.y,R+60)){ if(e.dead||e.boss) continue; const dx=e.x-z.x, dy=e.y-z.y, d=Math.hypot(dx,dy)||1, rr=R+e.r*.3;
      if(d<rr){ const f=Math.min(rr-d,z.rep*dt/Math.max(.6,e.mass)); e.x+=dx/d*f; e.y+=dy/d*f; } } }
  if(z.pull){ const R=z.r*2; for(const e of query(z.x,z.y,R+60)){ if(e.dead||e.boss) continue; const dx=z.x-e.x, dy=z.y-e.y, d=Math.hypot(dx,dy)||1;
      if(d<R&&d>4){ const f=Math.min(d-2,z.pull*dt/Math.max(.6,e.mass)); e.x+=dx/d*f; e.y+=dy/d*f; } } }
  z.tt-=dt; if(z.tt<=0){ z.tt=z.tick;
    if(z.shoot) zxShoot(z); else if(z.lob) zxLob(z);
    else if(z.dmg&&!z.lure) for(const e of query(z.x,z.y,z.r+60)){ if(e.dead) continue; const rr=z.r+e.r*.5; if((e.x-z.x)**2+(e.y-z.y)**2>rr*rr) continue;
      damageEnemy(e,z.dmg,z.src,{slow:z.slow,slowDur:.5,stun:z.stun,quiet:true,fxd:z.fxd}); }
    if(z.heal&&(P.x-z.x)**2+(P.y-z.y)**2<(z.r+P.r)**2&&P.hp<P.maxHp){ healP(z.heal,true); if(!G.auto) part({x:P.x+rand(-12,12),y:P.y+rand(-8,8),vx:0,vy:rand(-70,-40),life:.6,s:3,c:'#9dffb8',g:0,drag:1,k:'plus',add:true}); } }   // standing inside: heal
  if(z.fl>0) z.fl-=dt;
  if(!G.auto&&qLv()&&Math.random()<dt*10){ const k=z.kind;
    if(k==='grav'){ const b=rand(0,TAU), d=z.r*rand(1.2,2); part({x:z.x+Math.cos(b)*d,y:z.y+Math.sin(b)*d*.8,vx:-Math.cos(b)*d*2,vy:-Math.sin(b)*d*1.6,life:.45,s:2,c:'#c8b4ff',g:0,drag:0,k:'streak',add:true}); }
    else if(k==='lava') part({x:z.x+rand(-z.r*.4,z.r*.4),y:z.y-8,vx:rand(-20,20),vy:rand(-90,-50),life:.6,s:rand(2,3.5),c:pick(['#ff7a2a','#ffb050','#ffe28a']),g:120,drag:1,k:'sq',add:true}); }
  return true; }
// the time is up: an end blast (boom × dmg in explode) · bk < 0 = an implosion that pulls everything to the middle
function zxEnd(z){ if(!z.boom) return; const R=z.explode||z.r*1.4, c=z.src&&z.src.def.c||'#ffae4a';
  aoe(z.x,z.y,R,z.dmg*z.boom,z.src,{knock:z.bk});
  G.fx.push({k:'boom',x:z.x,y:z.y,r:R*.8,t:0,dur:.4,c,dead:false}); G.fx.push({k:'ring',x:z.x,y:z.y,r0:z.bk<0?R:R*.3,r1:z.bk<0?R*.2:R*1.1,t:0,dur:.32,c:'#ffffff',w:6,dead:false});
  burst(z.x,z.y,qLv()?14:5,c,R*2.4,.5,3); G.shake=Math.max(G.shake,Math.min(6,R/20)); sfx('boom'); }
// shooter zones: `shoot` bolts at the nearest enemy in reach, aimed once, straight (they carry the skill: tree effects work)
function zxShoot(z){ const t=nearestTo(z.x,z.y,z.reach); if(!t) return; const s=z.src, n=z.shoot, a0=Math.atan2(t.y-z.y,t.x-z.x), sp=640, life=z.reach/sp*1.1, arrow=z.kind==='turret';
  for(let i=0;i<n;i++){ const a=a0+(i-(n-1)/2)*.16;
    G.projs.push({x:z.x,y:z.y-(arrow?14:4),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5,dmg:z.dmg,pierce:z.pierce,life,max:life,knock:40,explode:0,homing:0,crit:0,shape:arrow?'arrow':'star',c:s.def.c,src:s,burn:0,hit:null,tg:null,dead:false,t:0}); }
  z.fl=.15; z.aa=a0; if(!G.auto) sfx('shoot'); }
// volcano: a lava bomb on a random enemy in reach (a 'lava' strike: falls, bursts, leaves a small fire)
function zxLob(z){ const e=randomNear(z.x,z.y,z.reach); if(!e) return; const q=mkStrike(e.x+rand(-10,10),e.y+rand(-10,10),z.r*.75,.5,z.dmg,z.src,'lava',{knock:140}); q.ox=z.x; q.oy=z.y-10; G.strikes.push(q); z.fl=.2; }
function zxLava(s){ explode(s.x,s.y,s.r,s.dmg,s.src,{knock:s.knock,c:'#ff7a2a'}); addZone({x:s.x,y:s.y,r:s.r*.6,dur:1.2*P.durMul,tick:.3,dmg:s.dmg*.05,kind:'fire',src:s.src}); }

/* ---- dev (#dev only, through RG.skx) · balance runs: skills at ★lv, mastery L on each one's main stat, a 10M-HP hero (being hit
   still counts, nothing dies), no level-up cards, from wave `wave` · solo = one skill for `sec` s → the damage it did ---- */
DEV.skx={
  setup(ids,o){ o=Object.assign({lv:5, L:0, wave:6, seed:42, tier:0},o); const ch=typeof curChar==='function'?curChar():null; if(!ch) return 'no char';
    if(typeof RG!=='undefined'&&RG.seed) RG.seed(o.seed); startRun(ch.cls,'survival',{char:ch, tier:o.tier});
    P.skills=ids.filter(id=>SK[id]).map(id=>{ const s=makeSkill(id); s.lv=o.lv; return s; }); for(const k of STAT_ORDER) P.stats[k]=0;
    for(const s of P.skills){ const m=SX.main[s.id]; if(m) P.stats[m]=o.L; } if(o.st) Object.assign(P.stats,o.st);
    P.need=1e12; recalc(P); P.hp=P.maxHp=1e7; G.god=false; G.wave=o.wave-1; G.waveT=.01; refreshSkillBar(); return P.skills.map(s=>s.id).join(); },
  solo(id,o){ o=Object.assign({sec:60},o); if(!SK[id]) return 'no skill'; const w=this.setup([id],o); if(w==='no char') return w; const s=P.skills[0]; G.auto=true;
    const steps=Math.round(o.sec*60); for(let i=0;i<steps&&!G.over;i++){ update(1/60); autoUI(); } G.auto=false;
    const r={id, L:o.L|0, lv:s.lv, dmg:Math.round(s.dealt), dps:Math.round(s.dealt/o.sec), kills:G.kills, hp:Math.round(P.hp), wave:G.wave}; G.ui='pause'; return r; } };
