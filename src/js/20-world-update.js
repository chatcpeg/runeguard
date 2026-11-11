/* ================= world updates ================= */
function updatePlayer(dt){
  let ix=0,iy=0;
  if(G.auto){ const b=(G.mode.bot&&G.mode.bot())||botInput(); ix=b[0]; iy=b[1]; }
  else { if(keys.KeyA||keys.ArrowLeft) ix-=1; if(keys.KeyD||keys.ArrowRight) ix+=1; if(keys.KeyW||keys.ArrowUp) iy-=1; if(keys.KeyS||keys.ArrowDown) iy+=1; if(joy.on){ ix+=joy.dx; iy+=joy.dy; } }
  let m=Math.hypot(ix,iy); if(m>1){ ix/=m; iy/=m; m=1; }
  const k=1-Math.exp(-dt*(m>.05?12:9));
  const ps=P.speed*(P.tSlow||1);                                         // bush / water slow (29a terrain)
  P.vx+=(ix*ps-P.vx)*k; P.vy+=(iy*ps-P.vy)*k;
  const kd=Math.exp(-dt*9); P.kx*=kd; P.ky*=kd;
  P.x+=(P.vx+P.kx)*dt; P.y+=(P.vy+P.ky)*dt;
  P.moving=Math.hypot(P.vx,P.vy)>25;
  if(Math.abs(P.vx)>8&&m>.05) P.face=P.vx<0?-1:1; else if(!P.moving&&G.near) P.face=Math.cos(P.aim)<0?-1:1;
  if(P.regen>0&&P.hp<P.maxHp) P.hp=Math.min(P.maxHp,P.hp+P.regen*dt);
  P.hurtT=Math.max(0,P.hurtT-dt); P.atkT=Math.max(0,P.atkT-dt); P.dodgeCd-=dt;
  if(P.swing){ P.swing.t+=dt; if(P.swing.t>P.swing.dur) P.swing=null; }
  if(P.moving){ P.stepT-=dt; if(P.stepT<=0){ P.stepT=.16; part({x:P.x+rand(-5,5),y:P.y+15,vx:-P.vx*.15+rand(-10,10),vy:rand(-14,-4),life:.45,s:3,grow:9,c:'#7a7a5e',g:0,drag:3,k:'puff',add:false,a:.35}); } }
  if(G.bounds) clampToBounds(P); if(G.obstacles){ P.tSlow=1; pushOutObstacles(P); }
}
/* world edge for modes that set G.bounds = {k:'rect',x0,y0,x1,y1} | {k:'circle',x,y,r} (null in classic) */
function clampToBounds(o){ const b=G.bounds,r=o.r||0;
  if(b.k==='circle'){ const dx=o.x-b.x,dy=o.y-b.y,d=Math.hypot(dx,dy),m=Math.max(0,b.r-r); if(d>m){ const k=m/(d||1); o.x=b.x+dx*k; o.y=b.y+dy*k; } }
  else { const x0=b.x0+r,x1=b.x1-r,y0=b.y0+r,y1=b.y1-r; if(o.x<x0) o.x=x0; else if(o.x>x1) o.x=x1; if(o.y<y0) o.y=y0; else if(o.y>y1) o.y=y1; } }
/* G.obstacles = {list:[{x,y,r}], grid:Map(gkey(cx,cy) → [obstacle])} · the mode files each obstacle under every CELL its box
   touches; without a grid the whole list is checked. Pushes a circle (player or enemy) out of any obstacle it overlaps. */
function pushOutObstacles(o){ const ob=G.obstacles,r=o.r||0; let list=ob.list;
  if(ob.grid){ const cx=Math.floor(o.x/CELL),cy=Math.floor(o.y/CELL); list=null;
    for(let ox=-1;ox<=1;ox++) for(let oy=-1;oy<=1;oy++){ const a=ob.grid.get(gkey(cx+ox,cy+oy)); if(a) for(const s of a) pushOutOne(o,s,r); } }
  if(list) for(const s of list) pushOutOne(o,s,r); }
function pushOutOne(o,s,r){ const dx=o.x-s.x,dy=o.y-s.y;
  if(s.soft){ if(s.k==='water'&&o.el==='water') return; if(dx*dx+dy*dy<s.r*s.r&&s.soft<(o.tSlow||1)) o.tSlow=s.soft; return; }   // soft feature (bush / water): slows, never pushes
  const rr=s.r+r,d2=dx*dx+dy*dy; if(d2>=rr*rr) return; const d=Math.sqrt(d2);
  if(d<.01){ o.x=s.x+rr; return; } o.x=s.x+dx/d*rr; o.y=s.y+dy/d*rr; }
function updateEnemies(dt){
  const kd=Math.exp(-dt*6.5),far=Math.hypot(VW,VH)/2+320;
  for(const e of G.enemies){
    if(e.dead) continue;
    if(e.sleep) continue;
    e.flash-=dt; e.atkCd-=dt; e.hitT=Math.max(0,e.hitT-dt);
    if(e.freezeT>0) e.freezeT-=dt;
    if(e.stunT>0) e.stunT-=dt;
    if(e.slowT>0){ e.slowT-=dt; if(e.slowT<=0) e.slowF=1; }
    let dx=P.x-e.x,dy=P.y-e.y; const d=Math.hypot(dx,dy)||1; dx/=d; dy/=d;
    if(e.boss){ bossAI(e,dt,d,dx,dy); e.walk+=Math.hypot(e.vx,e.vy)*dt/(e.d.r*.9); if(G.bounds) clampToBounds(e); if(G.obstacles&&!e.d.fly) pushOutObstacles(e); continue; }
    if(d>far){ if(G.mode.relocate){ relocate(e); continue; } if(G.mode.far&&G.mode.far(e,d)) continue; }
    if(e.ai.home&&G.mode.steer&&G.mode.steer(e,dt,d,dx,dy)) continue;
    let sp=e.speed*e.slowF*(e.tSlow||1); if(e.freezeT>0||e.stunT>0) sp=0;
    let tx=dx,ty=dy;
    if(e.d.ranged){
      if(d<e.d.keep*.8){ tx=-dx; ty=-dy; }
      else if(d<e.d.keep*1.15){ const sg=(e.id&1)?1:-1; tx=-dy*sg; ty=dx*sg; sp*=.6; }
      e.shotCd-=dt; if(e.shotCd<=0&&d<e.d.keep*1.6&&sp>0){ e.shotCd=e.d.shotCd*rand(.85,1.15); enemyShoot(e,Math.atan2(P.y-e.y,P.x-e.x),e.d.shotSp,e.d.shotDmg*G.cfg.dmgMul,'bone'); }
    } else if(e.d.erratic){ const w=Math.sin(G.t*3.1+e.id*1.7)*1.1,c=Math.cos(w),s=Math.sin(w),ntx=tx*c-ty*s; ty=tx*s+ty*c; tx=ntx; }
    const acc=1-Math.exp(-dt*(e.d.accel||5));
    e.vx+=(tx*sp-e.vx)*acc; e.vy+=(ty*sp-e.vy)*acc;
    e.kx*=kd; e.ky*=kd;
    e.x+=(e.vx+e.kx)*dt; e.y+=(e.vy+e.ky)*dt;
    if(Math.abs(e.vx)>3) e.face=e.vx<0?-1:1;
    e.walk+=e.d.fly?dt*14:Math.hypot(e.vx,e.vy)*dt/(e.d.r*.9);
    if(G.bounds) clampToBounds(e);
    if(G.obstacles&&!e.d.fly){ e.tSlow=1; pushOutObstacles(e); }          // terrain (29a): walk around rocks / trunks · slowed in bush and water
  }
}
function bossAI(e,dt,d,dx,dy){
  const x=BOSSAI[e.d.ai||e.type]; if(x){ x(e,dt,d,dx,dy); return; }   // lane bosses register BOSSAI[name]
  const A=e.ai,kd=Math.exp(-dt*6),ai=e.d.ai||e.type; e.kx*=kd; e.ky*=kd;
  let tx=dx,ty=dy,sp=e.speed*e.slowF;
  if(ai==='colossus'){
    A.slamCd=(A.slamCd??3)-dt;
    if(A.slam>0){ A.slam-=dt; sp=0;
      if(A.slam<=0){ const R=170; G.fx.push({k:'ring',x:e.x,y:e.y,r0:20,r1:R,t:0,dur:.45,c:'#e8d6a8',w:14,dead:false}); G.shake=Math.max(G.shake,10); sfx('boom'); burst(e.x,e.y+20,20,'#bfae8a',300,.6,5,'rock'); addDecal(crackTex(),e.x,e.y+20,R*.8,6,.8);
        const px=P.x-e.x,py=P.y-e.y,pl=Math.hypot(px,py)||1; if(pl<R+P.r){ hurtPlayer(e.dmg*1.3); P.kx+=px/pl*520; P.ky+=py/pl*520; }
        for(const o of query(e.x,e.y,R)){ if(o.boss||o.dead) continue; const l=Math.hypot(o.x-e.x,o.y-e.y)||1; o.kx+=(o.x-e.x)/l*300; o.ky+=(o.y-e.y)/l*300; }
        A.slamCd=4.5; } }
    else if(A.slamCd<=0&&d<260){ A.slam=1; A.tele={k:'circle',r:170,t:0,dur:1}; }
  } else if(ai==='lich'){
    if(d<170){ tx=-dx; ty=-dy; sp*=.8; } else if(d<330){ const sg=Math.sin(G.t*.7)>0?1:-1; tx=-dy*sg; ty=dx*sg; sp*=.6; }
    A.ring=(A.ring??2)-dt; if(A.ring<=0){ A.ring=2.8; const n=16,off=rand(0,TAU); for(let i=0;i<n;i++) enemyShoot(e,off+i*TAU/n,150,9*G.cfg.dmgMul,'orb'); sfx('zap'); }
    A.sum=(A.sum??5)-dt; if(A.sum<=0){ A.sum=8; const ns=Math.min(6,CAP+40-G.enemies.length); for(let i=0;i<ns;i++){ const a=i*TAU/6; spawnEnemy(i%2?'spitter':'shambler',e.x+Math.cos(a)*64,e.y+Math.sin(a)*64); burst(e.x+Math.cos(a)*64,e.y+Math.sin(a)*64,6,'#6a5a4a',120,.5,3,'rock'); } G.fx.push({k:'ring',x:e.x,y:e.y,r0:20,r1:110,t:0,dur:.5,c:'#a46bff',w:10,dead:false}); }
    A.tp=(A.tp??6)-dt; if(A.tp<=0&&d<110){ A.tp=7; burst(e.x,e.y,20,'#a46bff',220,.5,4); const a=rand(0,TAU); e.x=P.x+Math.cos(a)*260; e.y=P.y+Math.sin(a)*260; e.vx=e.vy=0; burst(e.x,e.y,20,'#a46bff',220,.5,4); }
  } else if(ai==='king'){
    if(A.charge>0){ A.charge-=dt; e.x+=A.cx*880*dt; e.y+=A.cy*880*dt;
      for(const o of query(e.x,e.y,e.r+40)){ if(o.boss||o.dead) continue; const l=Math.hypot(o.x-e.x,o.y-e.y)||1; o.kx+=(o.x-e.x)/l*60; o.ky+=(o.y-e.y)/l*60; }
      const px=P.x-e.x,py=P.y-e.y; if(!A.hitP&&px*px+py*py<(e.r+P.r)*(e.r+P.r)){ A.hitP=true; hurtPlayer(e.dmg*1.5); P.kx+=A.cx*620; P.ky+=A.cy*620; }
      if(Math.random()<.6) part({x:e.x+rand(-20,20),y:e.y+e.r*.8,vx:-A.cx*60,vy:rand(-30,-5),life:.6,s:8,grow:22,c:'#6a5a4a',g:0,drag:2,k:'puff',add:false,a:.5});
      if(A.charge<=0) A.chargeCd=5.5;
      e.face=A.cx<0?-1:1; return; }
    if(A.wind>0){ A.wind-=dt; sp=0; if(A.wind<=0){ A.charge=.6; A.hitP=false; sfx('boom'); } }
    else { A.chargeCd=(A.chargeCd??4)-dt; if(A.chargeCd<=0&&d<520){ A.wind=.9; A.cx=dx; A.cy=dy; A.tele={k:'line',len:540,t:0,dur:.9,ang:Math.atan2(dy,dx)}; A.chargeCd=99; } }
    A.ring=(A.ring??3)-dt; if(A.ring<=0){ A.ring=3.6; const n=22,off=G.t; for(let i=0;i<n;i++) enemyShoot(e,off+i*TAU/n,170,11*G.cfg.dmgMul,'orb'); sfx('zap'); }
    if(!A.summoned&&e.hp<e.maxHp*.5){ A.summoned=true; for(let i=0;i<14;i++){ const a=i*TAU/14; spawnEnemy(i%3?'runner':'brute',e.x+Math.cos(a)*120,e.y+Math.sin(a)*120); } banner('จักรพรรดิเรียกกองทัพ!','ศัตรูโผล่ล้อมรอบตัวบอส'); }
  }
  if(A.tele){ A.tele.t+=dt; if(A.tele.t>=A.tele.dur) A.tele=null; }
  const acc=1-Math.exp(-dt*4); e.vx+=(tx*sp-e.vx)*acc; e.vy+=(ty*sp-e.vy)*acc;
  e.x+=(e.vx+e.kx)*dt; e.y+=(e.vy+e.ky)*dt; if(Math.abs(e.vx)>3) e.face=e.vx<0?-1:1;
}
function separate(){
  for(const e of G.enemies){
    if(e.dead||e.d.phase) continue;
    const cx=Math.floor(e.x/CELL),cy=Math.floor(e.y/CELL);
    for(let ox=-1;ox<=1;ox++) for(let oy=-1;oy<=1;oy++){
      const arr=grid.get(gkey(cx+ox,cy+oy)); if(!arr) continue;
      for(let i=0;i<arr.length;i++){ const o=arr[i]; if(o.id<=e.id||o.dead||o.d.phase) continue;
        let dx=o.x-e.x,dy=o.y-e.y; const rr=e.r+o.r,d2=dx*dx+dy*dy; if(d2>=rr*rr) continue;
        let d=Math.sqrt(d2); if(d<.01){ dx=Math.random()-.5; dy=Math.random()-.5; d=Math.hypot(dx,dy)||1; }
        const ov=(rr-d)*.5,nx=dx/d,ny=dy/d,tm=e.mass+o.mass,ae=o.mass/tm,ao=e.mass/tm;
        e.x-=nx*ov*ae; e.y-=ny*ov*ae; o.x+=nx*ov*ao; o.y+=ny*ov*ao; } }
  }
}
function playerCollide(){
  for(const e of query(P.x,P.y,P.r+60)){
    if(e.dead) continue;
    const dx=e.x-P.x,dy=e.y-P.y,rr=P.r+e.r,d2=dx*dx+dy*dy; if(d2>=rr*rr) continue;
    const d=Math.sqrt(d2)||.01,nx=dx/d,ny=dy/d,ov=rr-d;
    if(!e.d.phase){ const pm=e.boss?.6:Math.min(.35,e.mass*.04); e.x+=nx*ov*(1-pm); e.y+=ny*ov*(1-pm); P.x-=nx*ov*pm; P.y-=ny*ov*pm; }
    if(e.atkCd<=0&&e.freezeT<=0&&e.stunT<=0){ e.atkCd=.75; hurtPlayer(e.dmg); if(G.over) return; }
  }
}
function updateProjs(dt){
  for(const p of G.projs){
    if(p.dead) continue;
    p.t+=dt; p.life-=dt;
    if(p.homing){ if(!p.tg||p.tg.dead||(p.hit&&p.hit.indexOf(p.tg.id)>=0)) p.tg=nearestTo(p.x,p.y,360,p.hit);
      if(p.tg){ const a=Math.atan2(p.vy,p.vx),ta=Math.atan2(p.tg.y-p.y,p.tg.x-p.x),na=a+clamp(angDiff(ta,a),-p.homing*dt,p.homing*dt),sp=Math.hypot(p.vx,p.vy); p.vx=Math.cos(na)*sp; p.vy=Math.sin(na)*sp; } }
    const ox=p.x,oy=p.y; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.mx) mxProjTick(p,dt);   // mastery: heat haze / fire trail (26a)
    const mx=(ox+p.x)/2,my=(oy+p.y)/2,hl=Math.hypot(p.x-ox,p.y-oy)/2;
    for(const e of query(mx,my,hl+p.r+60)){
      if(e.dead) continue; if(p.hit&&p.hit.indexOf(e.id)>=0) continue;
      const rr=e.r+p.r; if(segD2(e.x,e.y,ox,oy,p.x,p.y)>rr*rr) continue;
      projHit(p,e); if(p.dead) break;
    }
    if(!p.dead&&G.obstacles&&p.pierce<99&&terBlocks(p.x,p.y,p.r)){ if(p.mx) projEnd(p); else { p.dead=true; if(p.explode) explode(p.x,p.y,p.explode,p.dmg*.7,p.src,{c:p.c}); } if(!p.explode&&!G.auto) burst(p.x,p.y,4,'#a49a86',120,.35,2,'rock'); }   // a rock stops it (29a) · pierce ≥ 99 flies through
    if(!p.dead&&p.life<=0) projEnd(p);
    if(!p.dead&&!G.auto){ const q=qLv();
      if(p.shape==='fire'&&Math.random()<dt*(q?40:12)) part({x:p.x,y:p.y,vx:rand(-30,30)-p.vx*.1,vy:rand(-40,10),life:.35,s:3,c:pick(['#ffb050','#ff7a2a','#ffe28a']),g:-40,drag:2,k:'sq',add:true});
      else if((p.shape==='holy'||p.shape==='bolt')&&q>=1&&Math.random()<dt*20) part({x:p.x,y:p.y,vx:rand(-20,20),vy:rand(-20,20),life:.3,s:2,c:p.c,g:0,drag:2,k:'sq',add:true}); }
  }
  compact(G.projs);
}
// a projectile ends (range or rock): split (26a) · its blast · mastery shots that passed through someone also leave the second wave + fire field
function projEnd(p){ p.dead=true; if(p.mx&&p.mx.split) mxSplit(p); if(!p.explode) return; explode(p.x,p.y,p.explode,p.dmg*.7,p.src,{c:p.c});
  if(p.mx&&p.hit&&p.hit.length){ mxBoom2(p); if(p.burn) addZone({x:p.x,y:p.y,r:p.explode*.8,dur:2*P.durMul,tick:.3,dmg:p.dmg*.12,kind:'fire',src:p.src}); } }
function projHit(p,e){
  const sp=Math.hypot(p.vx,p.vy)||1;
  damageEnemy(e,p.dmg,p.src,{knock:p.knock,nx:p.vx/sp,ny:p.vy/sp,crit:p.crit,fxd:p.fxd});
  (p.hit||(p.hit=[])).push(e.id);
  if(p.explode){ if(p.mx&&mxPassHit(p)) return; p.dead=true; explode(p.x,p.y,p.explode,p.dmg*.7,p.src,{c:p.c}); if(p.mx) mxBoom2(p); if(p.burn) addZone({x:p.x,y:p.y,r:p.explode*.8,dur:2*P.durMul,tick:.3,dmg:p.dmg*.12,kind:'fire',src:p.src}); return; }
  p.pierce--; if(p.pierce<=0) p.dead=true;
}
function updateEProjs(dt){
  for(const b of G.eprojs){ b.life-=dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.rot+=dt*10; if(b.life<=0||G.obstacles&&terBlocks(b.x,b.y,b.r)){ b.dead=true; continue; }
    const dx=b.x-P.x,dy=b.y-(P.y-6),rr=b.r+P.r*.8; if(dx*dx+dy*dy<rr*rr){ b.dead=true; hurtPlayer(b.dmg); if(G.over) break; } }
  compact(G.eprojs);
}
function updateZones(dt){
  const q=qLv();
  for(const z of G.zones){
    if(z.dead) continue;
    z.t+=dt; if(z.t>=z.dur){ z.dead=true; continue; }
    if(z.aim){ z.x+=z.aim.vx*dt; z.y+=z.aim.vy*dt; const k=Math.exp(-dt*.7); z.aim.vx*=k; z.aim.vy*=k; }   // aimed vortex (19): straight, slowing
    else if(z.drift){ z.retarget-=dt; if(z.retarget<=0||!z.tg||z.tg.dead){ z.tg=nearestTo(z.x,z.y,520); z.retarget=.8; }
      let tx,ty; if(z.tg){ tx=z.tg.x-z.x; ty=z.tg.y-z.y; } else { tx=Math.cos(z.wa); ty=Math.sin(z.wa); } const l=Math.hypot(tx,ty)||1, k=Math.min(1,dt*2);
      z.vx+=(tx/l*z.drift-z.vx)*k; z.vy+=(ty/l*z.drift-z.vy)*k; z.x+=z.vx*dt; z.y+=z.vy*dt; }
    if(z.trap){ if(z.t<.4) continue; let trig=false; for(const e of query(z.x,z.y,z.r*.5+60)){ if(e.dead) continue; const rr=z.r*.45+e.r; if((e.x-z.x)**2+(e.y-z.y)**2<rr*rr){ trig=true; break; } }
      if(trig){ z.dead=true; explode(z.x,z.y,z.r,z.trap,z.src,{c:'#ffb35c',knock:z.knock}); } continue; }
    if(z.pull){ const R=z.r*1.6; for(const e of query(z.x,z.y,R+60)){ if(e.dead||e.boss) continue; const dx=z.x-e.x,dy=z.y-e.y,d=Math.hypot(dx,dy)||1; if(d<R&&d>4){ const f=Math.min(d,z.pull*dt/Math.max(.6,e.mass)); e.x+=dx/d*f; e.y+=dy/d*f; } } }
    if(!G.auto&&Math.random()<dt*(q?14:5)){ const a=rand(0,TAU),d=Math.sqrt(Math.random())*z.r,px=z.x+Math.cos(a)*d,py=z.y+Math.sin(a)*d;
      if(z.kind==='fire') part({x:px,y:py,vx:rand(-10,10),vy:rand(-70,-30),life:.6,s:rand(2,3.5),c:pick(['#ffb050','#ff7a2a','#ffe28a']),g:-20,drag:1,k:'sq',add:true});
      else if(z.kind==='ice') part({x:px,y:py-20,vx:rand(-8,8),vy:rand(15,35),life:.8,s:2.2,c:'#e6f8ff',g:0,drag:0,k:'sq',add:true});
      else if(z.kind==='poison') part({x:px,y:py,vx:0,vy:rand(-25,-10),life:.7,s:rand(2,4),grow:4,c:'#a8ff7a',g:0,drag:1,k:'puff',add:true,a:.6});
      else if(z.kind==='wind'){ const ta=a+PI/2; part({x:px,y:py,vx:Math.cos(ta)*170+z.vx,vy:Math.sin(ta)*170+z.vy,life:.4,s:2,c:'#dcffe8',g:0,drag:1,k:'streak',add:true}); } }
    z.tt-=dt; if(z.tt<=0){ z.tt=z.tick; for(const e of query(z.x,z.y,z.r+60)){ if(e.dead) continue; const rr=z.r+e.r*.5; if((e.x-z.x)**2+(e.y-z.y)**2>rr*rr) continue; damageEnemy(e,z.dmg,z.src,{slow:z.slow,slowDur:.5,quiet:true,fxd:z.fxd}); } }
  }
  compact(G.zones);
}
function strikeImpact(s){
  const x=s.x,y=s.y,q=qLv();
  if(s.kind==='arrows'){ aoe(x,y,s.r,s.dmg,s.src,{knock:s.knock,quiet:true}); for(let i=0;i<4;i++){ const a=rand(0,TAU),d=Math.sqrt(Math.random())*s.r,ax=x+Math.cos(a)*d,ay=y+Math.sin(a)*d; G.fx.push({k:'arrowhit',x:ax,y:ay,t:0,dur:.25,c:'#e8f5c0',dead:false}); if(q>=1&&i<2) addDecal(arrowStuckTex(),ax,ay-10,10,1.1,1,true); } sfx('hit'); return; }
  if(s.kind==='meteor'){ explode(x,y,s.r,s.dmg,s.src,{knock:s.knock,c:'#ff7a2a'}); addZone({x,y,r:s.r*.7,dur:1.6*P.durMul,tick:.3,dmg:s.dmg*.06,kind:'fire',src:s.src}); addDecal(crackTex(),x,y,s.r*.9,7,.8); burst(x,y,q?14:6,'#6a5040',s.r*3,.7,5,'rock'); G.shake=Math.max(G.shake,9); return; }
  aoe(x,y,s.r,s.dmg,s.src,{knock:s.knock,stun:s.stun});
  if(s.kind==='cross'){ G.fx.push({k:'cross',x,y,r:s.r,t:0,dur:.45,c:'#fff3c4',dead:false}); burst(x,y,q?12:5,'#fff3c4',s.r*2.5,.5,3); }
  else if(s.kind==='pillar'){ G.fx.push({k:'pillar',x,y,r:s.r,t:0,dur:.5,c:'#fffbe0',dead:false}); burst(x,y,q?10:4,'#fffbe0',s.r*2,.6,2.5); }
  else if(s.kind==='spike'){ G.fx.push({k:'spike',x,y,r:s.r,t:0,dur:.5,dead:false}); burst(x,y+4,q?5:2,'#8a6e4e',s.r*3,.5,3,'rock'); if(q>=1) part({x,y:y+2,vx:0,vy:-10,life:.5,s:s.r*.3,grow:s.r*.8,c:'#7a6a50',g:0,drag:2,k:'puff',add:false,a:.4}); }
  sfx(s.kind==='spike'?'hit':'boom');
}
function updateStrikes(dt){
  for(const s of G.strikes){ s.t+=dt;
    if(s.kind==='meteor'&&s.t<s.delay&&!G.auto&&Math.random()<dt*(qLv()?50:15)){ const k=s.t/s.delay,mx=s.x+(1-k)*220,my=s.y-(1-k)*420; part({x:mx+rand(-6,6),y:my+rand(-6,6),vx:rand(30,70),vy:rand(-120,-60),life:.4,s:rand(2,4),c:pick(['#ffb050','#ff7a2a','#ffe28a']),g:0,drag:2,k:'sq',add:true}); }
    while(s.done<s.hits&&s.t>=s.delay+s.done*s.hitInt){ s.done++; strikeImpact(s); if(G.over) return; } if(s.done>=s.hits&&s.t>s.delay+s.hits*s.hitInt+.35) s.dead=true; }
  compact(G.strikes);
}
function gainXp(v){ if(G.mode.cards===false) return; P.xp+=v*P.xpMul; while(P.xp>=P.need){ P.xp-=P.need; P.lv++; P.need=xpNeed(P.lv); G.pendingLv++; G.fx.push({k:'lvup',x:P.x,y:P.y,t:0,dur:.9,follow:true,dead:false}); } }
function collect(g){
  g.dead=true;
  switch(g.kind){
    case 'xp': gainXp(g.v); sfx('pickup'); break;
    case 'heart': healP(P.maxHp*.3); sfx('heal'); break;
    case 'magnet': for(const o of G.gems) if(o.kind==='xp'&&!o.dead){ o.mag=true; o.sp=200; } addText(P.x,P.y-44,'ดูดทั้งหมด!','#5fd3c3',true); sfx('level'); break;
    case 'bomb': { const hw=VW/2+40,hh=VH/2+40; for(const e of G.enemies){ if(e.dead||Math.abs(e.x-P.x)>hw||Math.abs(e.y-P.y)>hh) continue; if(e.boss||e.elite) damageEnemy(e,e.maxHp*.08/P.might,null,{}); else killEnemy(e); } G.flash=.25; G.shake=Math.max(G.shake,12); sfx('boom'); break; }
    case 'chest': G.pendingChest++; sfx('level'); break;
    default:{ const k=ITEMKIND[g.kind]; if(k) k.collect(g); }
  }
}
function updateGems(dt){
  const M2=P.magnet*P.magnet,fr=Math.exp(-dt*5),cr=(P.r+10)*(P.r+10);
  for(const g of G.gems){
    if(g.dead) continue; g.t+=dt;
    let dx=P.x-g.x,dy=(P.y-4)-g.y,d2=dx*dx+dy*dy;
    if(!g.mag&&g.t>.3&&d2<M2){ g.mag=true; const d=Math.sqrt(d2)||1; g.vx-=dx/d*130; g.vy-=dy/d*130; g.sp=0; }
    if(g.mag){ const d=Math.sqrt(d2)||1; g.sp=Math.min(1200,g.sp+dt*1500); const step=Math.min(d,g.sp*dt); g.x+=dx/d*step; g.y+=dy/d*step; }
    g.x+=g.vx*dt; g.y+=g.vy*dt; g.vx*=fr; g.vy*=fr;
    dx=P.x-g.x; dy=(P.y-4)-g.y; if(dx*dx+dy*dy<cr) collect(g);
  }
  compact(G.gems);
}
function updateFx(dt){
  for(const f of G.fx){ f.t+=dt; if(f.t>=f.dur) f.dead=true; } compact(G.fx);
  for(const p of G.parts){ p.t+=dt; if(p.t>=p.life){ p.dead=true; continue; } const k=Math.exp(-dt*(p.drag??4)); p.vx*=k; p.vy*=k; p.vy+=(p.g||0)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.grow) p.s+=p.grow*dt; if(p.vr) p.rot+=p.vr*dt; } compact(G.parts);
  for(const t of G.texts){ t.t+=dt; t.y-=38*dt; if(t.t>=.8) t.dead=true; } compact(G.texts);
  for(const c of G.corpses){ c.t+=dt; if(c.t>=c.dur) c.dead=true; } compact(G.corpses);
  for(const d of G.decals){ d.t+=dt; if(d.t>=d.life) d.dead=true; } compact(G.decals);
}
function update(dt){
  qi=0;
  G.t+=dt; P.t+=dt; G.hitSfxT-=dt;
  G.mode.update(dt); if(G.over) return;
  updateTimers(dt); if(G.over) return;
  updatePlayer(dt);
  updateEnemies(dt); if(G.over) return;
  buildGrid();
  separate();
  playerCollide(); if(G.over) return;
  findNearest();
  if(P.tf) tfRun(dt); else for(const s of P.skills) BEH[s.def.type](s,dt);   // tfRun: same loop + skill-tree casts / burns (27)
  updateProjs(dt);
  updateZones(dt);
  updateStrikes(dt); if(G.over) return;
  updateEProjs(dt); if(G.over) return;
  updateGems(dt);
  updateFx(dt);
  compact(G.enemies);
  if(G.hordeWarn){ G.hordeWarn.t-=dt; if(G.hordeWarn.t<=0) G.hordeWarn=null; }
  const tx=P.x+P.vx*.12,ty=P.y+P.vy*.12,ck=1-Math.exp(-dt*7); cam.x+=(tx-cam.x)*ck; cam.y+=(ty-cam.y)*ck;
  G.shake=Math.max(0,G.shake-dt*22); G.hurtFlash=Math.max(0,G.hurtFlash-dt); G.flash=Math.max(0,G.flash-dt);
}
let BOT_R=0;
function botInput(){
  let fx=0,fy=0; const RR=BOT_R||(P.cls.id==='swordsman'||(P.adv&&P.adv.id==='templar')?70:170);
  for(const e of query(P.x,P.y,RR+60)){ if(e.dead) continue; const dx=P.x-e.x,dy=P.y-e.y,d2=dx*dx+dy*dy+50; if(d2>RR*RR) continue; const w=(e.boss?8:e.d.blast?3:1)/d2; fx+=dx*w; fy+=dy*w; }
  for(const b of G.eprojs){ const dx=P.x-b.x,dy=P.y-b.y,d2=dx*dx+dy*dy+50; if(d2<14400){ fx+=dx/d2*2; fy+=dy/d2*2; } }
  let boss=null; for(const b of G.bosses){ if(b.dead) continue; boss=b; const dx=P.x-b.x,dy=P.y-b.y,d2=dx*dx+dy*dy; if(d2<(b.r+RR*.6+20)**2){ const w=10/(d2+1); fx+=dx*w; fy+=dy*w; } }
  const m=Math.hypot(fx,fy);
  if(boss){ const dx=boss.x-P.x,dy=boss.y-P.y,d=Math.hypot(dx,dy)||1;
    if(boss.ai.tele||boss.ai.charge>0){ if(d<boss.r+260){ const s=boss.ai.tele&&boss.ai.tele.k==='line'?1:0; return s?[-dy/d,dx/d]:[-dx/d,-dy/d]; } }
    else if(P.hp>P.maxHp*.45){ const want=boss.r+RR*.8; let ax=d>want?dx/d:-dx/d*.5,ay=d>want?dy/d:-dy/d*.5; if(m>1e-6){ ax+=fx/m*.5; ay+=fy/m*.5; } const l=Math.hypot(ax,ay)||1; return [ax/l,ay/l]; } }
  if(m<1e-6){ let g=null,bd=450*450; for(const o of G.gems){ const d=(o.x-P.x)**2+(o.y-P.y)**2; if(d<bd){ bd=d; g=o; } }
    if(g){ const dx=g.x-P.x,dy=g.y-P.y,d=Math.hypot(dx,dy)||1; return [dx/d,dy/d]; }
    if(G.near&&G.nearD>RR*1.2){ const dx=G.near.x-P.x,dy=G.near.y-P.y,d=Math.hypot(dx,dy)||1; return [dx/d*.7,dy/d*.7]; }
    return [0,0]; }
  fx/=m; fy/=m; const ox=fx-fy*.7,oy=fy+fx*.7,l=Math.hypot(ox,oy)||1; return [ox/l,oy/l];
}

