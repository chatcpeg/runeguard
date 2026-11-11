/* ================= skill behaviours ================= */
function fireProj(s,a){ const sp=pv(s,'speed'),life=(pv(s,'life')||1)*(P.sx&&P.rangeMul||1),size=(pv(s,'size')||6)*(1+(P.area-1)*.5);   // character runs: DEX range · no homing (aimed once, straight)
  const p0={x:P.x+Math.cos(a)*10,y:P.y-6+Math.sin(a)*10,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:size,dmg:pv(s,'dmg'),pierce:pv(s,'pierce')||1,life,max:life,knock:pv(s,'knock')||50,
    explode:(pv(s,'explode')||0)*P.area,homing:P.sx?0:pv(s,'homing')||0,crit:pv(s,'crit')||0,shape:s.def.shape||'bolt',c:s.def.c,src:s,burn:pv(s,'burn')||0,hit:null,tg:null,dead:false,t:0}; G.projs.push(p0);
  if(P.sx&&(s.def.p.homing||0)>0){ p0.pierce+=1; p0.r*=1.2; }           // ศรเวท / ลูกแสง no longer seek: +1 pierce · 20 % bigger
  if(P.sx&&s.mxLook&&typeof mxProj==='function') mxProj(s,p0);           // mastery tricks of this shot (26a)
  if(P.sx&&s.def.px) pxFire(s,p0);                                       // boomerang / ricochet / hook … of the character-only skills (25a)
  if(s.def.shape==='beam') G.fx.push({k:'beamline',x:P.x,y:P.y-6,a,len:sp*life,t:0,dur:.2,c:s.def.c,dead:false});
  P.atkT=.12; }
BEH.proj=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return;
  const range=pv(s,'speed')*(pv(s,'life')||1)*1.05*(P.sx&&P.rangeMul||1), radial=pv(s,'radial');
  let tg=null;
  if(radial){ if(!G.near||G.nearD>420){ s.cdT=.12; return; } }
  else { tg=s.def.target==='strongest'?strongest(range):(G.near&&G.nearD<range?G.near:null); if(!tg){ s.cdT=.12; return; } }
  s.cdT=cdOf(s);
  const n=countOf(s),spread=pv(s,'spread')||.16,volley=pv(s,'volley');
  const base=radial?rand(0,TAU):Math.atan2(tg.y-P.y,tg.x-P.x);
  for(let i=0;i<n;i++){
    if(radial) fireProj(s,base+i*TAU/n);
    else if(volley){ if(i===0) fireProj(s,base); else later(i*.075,()=>{ const t=G.near; fireProj(s,t?Math.atan2(t.y-P.y,t.x-P.x)+rand(-.06,.06):base); }); }
    else fireProj(s,base+(i-(n-1)/2)*spread);
  }
  sfx('shoot');
};
function doSwing(s,i){
  const range=pv(s,'range')*P.area*(P.sx?1+((P.rangeMul||1)-1)*.5:1),arc=pv(s,'arc'),full=arc>=6;   // DEX reach: half of the range bonus for melee
  const a=G.near?Math.atan2(G.near.y-P.y,G.near.x-P.x):P.aim;
  const dmg=pv(s,'dmg'),kn=pv(s,'knock');
  for(const e of query(P.x,P.y,range+60)){
    if(e.dead) continue; const dx=e.x-P.x,dy=e.y-P.y,d=Math.hypot(dx,dy)||1;
    if(d-e.r>range) continue;
    if(!full&&Math.abs(angDiff(Math.atan2(dy,dx),a))>arc/2+Math.atan2(e.r,d)) continue;
    damageEnemy(e,dmg,s,{knock:kn,nx:dx/d,ny:dy/d});
  }
  const flip=i%2===1;
  G.fx.push({k:'slash',a,arc:full?TAU:arc,r:range,t:0,dur:full?.28:.22,c:s.def.c,flip,follow:true,x:P.x,y:P.y,dead:false});
  if(!full) P.swing={t:0,dur:.16,a0:a+(flip?1:-1)*arc/2,a1:a-(flip?1:-1)*arc/2};
  if(pv(s,'crescent')){ const sp=560; G.projs.push({x:P.x,y:P.y-4,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:24*(1+(P.area-1)*.5),dmg:pv(s,'dmg')*.8,pierce:99,life:.5,max:.5,knock:200,explode:0,homing:0,crit:0,shape:'crescent',c:'#bfe4ff',src:s,burn:0,hit:null,tg:null,dead:false,t:0}); }
  P.atkT=.12; sfx('swing');
}
BEH.swing=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return;
  const range=pv(s,'range')*P.area,full=pv(s,'arc')>=6;
  if(!G.near||G.nearD>range*(full?1.1:1.6)+G.near.r){ s.cdT=.1; return; }
  s.cdT=cdOf(s);
  const n=pv(s,'count')||1;
  for(let i=0;i<n;i++){ if(i===0) doSwing(s,0); else later(i*.14,()=>doSwing(s,i)); }
};
BEH.nova=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return;
  const r=pv(s,'r')*P.area;
  if(!G.near||G.nearD>r*1.15){ s.cdT=.15; return; }
  s.cdT=cdOf(s);
  aoe(P.x,P.y,r,pv(s,'dmg'),s,{knock:pv(s,'knock'),slow:pv(s,'slow'),slowDur:pv(s,'slowDur')||1.5,freeze:pv(s,'freeze'),stun:pv(s,'stun')});
  G.fx.push({k:'ring',x:P.x,y:P.y,r0:12,r1:r,t:0,dur:.4,c:s.def.c,w:12,follow:true,dead:false});
  const fx=s.def.fx;
  if(fx==='slam'){ addDecal(crackTex(),P.x,P.y+8,r*.75,5,.75); burst(P.x,P.y+6,qLv()?14:6,'#8a7a5a',r*2.2,.6,4,'rock'); for(let i=0;i<(qLv()?8:3);i++){ const a=i/8*TAU; part({x:P.x+Math.cos(a)*r*.5,y:P.y+Math.sin(a)*r*.35,vx:Math.cos(a)*90,vy:Math.sin(a)*60-20,life:.7,s:r*.12,grow:r*.25,c:'#6a6050',g:0,drag:2,k:'puff',add:false,a:.45}); } }
  else if(fx==='frost'){ addDecal(frostTex(),P.x,P.y+6,r*.9,4,.8); burst(P.x,P.y-6,qLv()?18:8,'#dff6ff',r*3,.5,5,'shard'); }
  else if(fx==='smoke'){ for(let i=0;i<(qLv()?14:6);i++){ const a=rand(0,TAU),v=rand(.3,1)*r*1.6; part({x:P.x,y:P.y-4,vx:Math.cos(a)*v,vy:Math.sin(a)*v*.7,life:rand(.8,1.3),s:14,grow:40,c:'#8a84a0',g:0,drag:3,k:'puff',add:false,a:.55}); } }
  else burst(P.x,P.y,14,s.def.c,r*2.4,.45,3);
  G.shake=Math.max(G.shake,5); P.atkT=.12; sfx('boom');
};
BEH.orbit=(s,dt)=>{
  const st=s.st,n=countOf(s),R0=pv(s,'r')*P.area,size=pv(s,'size')*(1+(P.area-1)*.5),dmg=pv(s,'dmg'),kn=pv(s,'knock')||100;
  const X=s.def.ox?orbX(s,R0):null, R=X?X.R:R0, rt=X?X.rate:.5;          // character-only orbits (25a): wave radius · hit rate · slow
  st.a=(st.a||0)+pv(s,'spin')*dt;
  if(!st.hits) st.hits=new Map();
  if(!st.pos) st.pos=[];
  st.pos.length=n;
  for(let i=0;i<n;i++){
    const a=st.a+i*TAU/n,bx=P.x+Math.cos(a)*R,by=P.y-4+Math.sin(a)*R;
    let p=st.pos[i]; if(!p) p=st.pos[i]=[0,0,0]; p[0]=bx; p[1]=by; p[2]=a;
    for(const e of query(bx,by,size+60)){
      if(e.dead) continue; const rr=e.r+size,dx=e.x-bx,dy=e.y-by; if(dx*dx+dy*dy>rr*rr) continue;
      const nt=st.hits.get(e.id)||0; if(G.t<nt) continue; st.hits.set(e.id,G.t+rt);
      const ex=e.x-P.x,ey=e.y-P.y,l=Math.hypot(ex,ey)||1;
      damageEnemy(e,dmg,s,X?{knock:kn,nx:ex/l,ny:ey/l,slow:X.slow,slowDur:1}:{knock:kn,nx:ex/l,ny:ey/l});
    }
  }
  if(st.hits.size>600){ for(const [k,v] of st.hits) if(v<G.t) st.hits.delete(k); }
};
BEH.aura=(s,dt)=>{
  s.st.tk=(s.st.tk||0)-dt; if(s.st.tk>0) return; s.st.tk=pv(s,'tick')||.4;
  const r=pv(s,'r')*P.area,sl=pv(s,'slow')||0;
  for(const e of query(P.x,P.y,r+60)){ if(e.dead) continue; const dx=e.x-P.x,dy=e.y-P.y,rr=r+e.r*.5; if(dx*dx+dy*dy>rr*rr) continue; damageEnemy(e,pv(s,'dmg'),s,{slow:sl,slowDur:.6,quiet:true}); }
};
BEH.shield=(s,dt)=>{
  if(P.shield>0) return;
  s.st.t=(s.st.t===undefined?.5:s.st.t)-dt;
  if(s.st.t<=0){ P.shield=P.shieldMax=pv(s,'absorb'); P.shieldSrc=s; s.st.t=cdOf(s); sfx('shield'); G.fx.push({k:'ring',x:P.x,y:P.y,r0:40,r1:22,t:0,dur:.3,c:s.def.c,w:4,follow:true,dead:false}); }
};
BEH.passive=()=>{};
// character runs (docs/PROPOSAL-mastery.md §2): how far an aimed strike/zone reaches (never past the screen) and where the
// i-th of a cast lands: the first on the target, the rest round it on a golden-angle spiral inside 0.5–0.9 of the skill's radius
function aimReach(){ return Math.hypot(VW||1280,VH||800)/2*.92; }
function aimCluster(t,i,r){ if(!i) return [t.x,t.y]; const a=i*2.39996+t.x*.01, d=r*(.5+.4*((i*7)%5)/4); return [t.x+Math.cos(a)*d, t.y+Math.sin(a)*d*.85]; }
function mkStrike(x,y,r,delay,dmg,src,kind,o){ o=o||{}; return {x,y,r,delay,dmg,src,kind,t:0,done:0,hits:o.hits||1,hitInt:o.hitInt||.15,knock:o.knock||0,stun:o.stun||0,dead:false}; }
BEH.strike=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return;
  if(P.sx){ const R=Math.min(560*(P.rangeMul||1),aimReach()), t=G.near&&G.nearD<R?G.near:null; if(!t){ s.cdT=.2; return; }   // aimed: on the nearest, the rest round it
    s.cdT=cdOf(s); const n=countOf(s), r=pv(s,'r')*P.area;
    for(let i=0;i<n;i++){ const q=aimCluster(t,i,r), x=q[0], y=q[1];
      const go=()=>G.strikes.push(mkStrike(x,y,r,pv(s,'delay')||.5,pv(s,'dmg'),s,s.def.fx,{hits:pv(s,'hits'),hitInt:pv(s,'hitInt'),knock:pv(s,'knock'),stun:pv(s,'stun')}));
      if(i===0) go(); else later(i*.11,go); }
    return; }
  const first=randomInView(); if(!first){ s.cdT=.2; return; }
  s.cdT=cdOf(s);
  const n=countOf(s);
  for(let i=0;i<n;i++){ const e=i===0?first:randomInView(); if(!e) break; const x=e.x+rand(-12,12),y=e.y+rand(-12,12);
    const go=()=>G.strikes.push(mkStrike(x,y,pv(s,'r')*P.area,pv(s,'delay')||.5,pv(s,'dmg'),s,s.def.fx,{hits:pv(s,'hits'),hitInt:pv(s,'hitInt'),knock:pv(s,'knock'),stun:pv(s,'stun')}));
    if(i===0) go(); else later(i*.11,go); }
};
BEH.zone=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return;
  if(s.def.zx){ zxCast(s); return; }                                     // character-only zones (25a): own placement + effects
  if(P.sx){ const R=Math.min(520*(P.rangeMul||1),aimReach()), t=G.near&&G.nearD<R?G.near:null, trap=s.def.fx==='trap'; if(!t&&!trap){ s.cdT=.2; return; }   // aimed (docs §2)
    if(trap&&!(G.near&&G.nearD<500)){ s.cdT=.2; return; }
    s.cdT=cdOf(s); const n=countOf(s), a=t?Math.atan2(t.y-P.y,t.x-P.x):0, r=pv(s,'r')*P.area, mv=Math.hypot(P.vx,P.vy), ba=mv>20?Math.atan2(-P.vy,-P.vx):rand(0,TAU);
    for(let i=0;i<n;i++){ let x,y,o={};
      if(trap){ x=P.x+Math.cos(ba)*(10+i*r*.9); y=P.y+Math.sin(ba)*(10+i*r*.9); }   // traps: under the feet, a line along the way walked
      else if(s.def.place==='enemy'){ const q=aimCluster(t,i,r); x=q[0]; y=q[1]; }
      else { const aa=a+(i-(n-1)/2)*.35; x=P.x+Math.cos(aa)*50; y=P.y+Math.sin(aa)*50; o.aim={vx:Math.cos(aa)*230, vy:Math.sin(aa)*230}; }   // vortex: straight down the aim
      addZone(Object.assign({x,y,r,dur:(pv(s,'dur')||4)*P.durMul,tick:pv(s,'tick')||.4,dmg:pv(s,'dmg')||0,slow:pv(s,'slow')||0,kind:s.def.fx,src:s,drift:pv(s,'drift')||0,pull:pv(s,'pull')||0,trap:pv(s,'trap')||0,knock:pv(s,'knock')||0},o)); }
    return; }
  const place=s.def.place;
  if(place==='enemy'&&!randomInView()){ s.cdT=.2; return; }
  if(place!=='enemy'&&(!G.near||G.nearD>500)){ s.cdT=.2; return; }
  s.cdT=cdOf(s);
  const n=countOf(s);
  for(let i=0;i<n;i++){ let x,y;
    if(place==='enemy'){ const e=randomInView(); if(!e) break; x=e.x; y=e.y; }
    else { const a=rand(0,TAU),d=rand(50,170); x=P.x+Math.cos(a)*d; y=P.y+Math.sin(a)*d; }
    addZone({x,y,r:pv(s,'r')*P.area,dur:(pv(s,'dur')||4)*P.durMul,tick:pv(s,'tick')||.4,dmg:pv(s,'dmg')||0,slow:pv(s,'slow')||0,kind:s.def.fx,src:s,drift:pv(s,'drift')||0,pull:pv(s,'pull')||0,trap:pv(s,'trap')||0,knock:pv(s,'knock')||0}); }
};
BEH.chain=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return;
  if(!G.near||G.nearD>420){ s.cdT=.15; return; }
  s.cdT=cdOf(s);
  const n=countOf(s);
  for(let c=0;c<n;c++){ const go=()=>{ let cur=c===0?G.near:randomNear(P.x,P.y,420); if(!cur||cur.dead) cur=nearestTo(P.x,P.y,420); if(!cur) return;
      const pts=[[P.x,P.y-10]],hit=[],jump=pv(s,'jump')*P.area,B=pv(s,'bounces'),dmg=pv(s,'dmg');
      for(let b=0;b<B&&cur;b++){ hit.push(cur.id); pts.push([cur.x,cur.y-cur.r*.4]); damageEnemy(cur,dmg,s,{knock:60,stun:.08});
        if(s.fx&&s.fx.fork&&b===s.fx.fork.at-1) tfFork(s,cur,hit,dmg,jump);
        let nx=null,bd=jump*jump; for(const e of query(cur.x,cur.y,jump+60)){ if(e.dead||hit.indexOf(e.id)>=0) continue; const d=(e.x-cur.x)**2+(e.y-cur.y)**2; if(d<bd){ bd=d; nx=e; } } cur=nx; }
      G.fx.push({k:'chain',pts,t:0,dur:.24,c:s.def.c,paths:null,jt:-1,dead:false}); sfx('zap');
      if(s.mxLook&&s.mxLook.twin) G.fx.push({k:'chain',pts:pts.map(q=>[q[0]+3,q[1]-4]),t:0,dur:.24,c:'#ffffff',paths:null,jt:-1,dead:false}); };   // mastery 6 (26a)
    if(c===0) go(); else later(c*.09,go); }
  P.atkT=.12;
};
BEH.heal=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return; s.cdT=cdOf(s);
  healP(pv(s,'heal')+P.maxHp*(pv(s,'healPct')||0));
  const r=pv(s,'r')*P.area; aoe(P.x,P.y,r,pv(s,'dmg'),s,{knock:pv(s,'knock')});
  G.fx.push({k:'ring',x:P.x,y:P.y,r0:10,r1:r,t:0,dur:.45,c:s.def.c,w:8,follow:true,dead:false});
  G.fx.push({k:'pillar',x:P.x,y:P.y,r:26,t:0,dur:.5,c:'#b8ffd0',follow:true,dead:false});
  for(let i=0;i<10;i++) part({x:P.x+rand(-14,14),y:P.y+rand(-8,10),vx:rand(-10,10),vy:rand(-90,-40),life:rand(.5,.9),s:3,c:'#9dffb8',g:0,drag:1,k:'plus',add:true});
  sfx('heal');
};
BEH.multi=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return;
  const R=pv(s,'range')*P.area,n=pv(s,'targets'),R2=R*R,list=[];
  for(const e of G.enemies){ if(!e.dead&&(e.x-P.x)**2+(e.y-P.y)**2<R2) list.push(e); }
  if(!list.length){ s.cdT=.15; return; }
  s.cdT=cdOf(s);
  list.sort((a,b)=>b.hp-a.hp);
  const tg=list.slice(0,n);
  G.fx.push({k:'dash',pts:[[P.x,P.y-6]].concat(tg.map(e=>[e.x,e.y-e.r*.3])),t:0,dur:.35,c:s.def.c,dead:false});
  tg.forEach((e,i)=>{ const go=()=>{ if(e.dead) return; damageEnemy(e,pv(s,'dmg'),s,{crit:pv(s,'crit'),knock:140}); G.fx.push({k:'xcut',x:e.x,y:e.y-e.r*.3,r:e.r+12,t:0,dur:.26,c:s.def.c,dead:false}); sfx('slice'); }; if(i===0) go(); else later(i*.06,go); });
  G.fx.push({k:'after',x:P.x,y:P.y,t:0,dur:.3,dead:false});
};
BEH.spikes=(s,dt)=>{
  s.cdT-=dt; if(s.cdT>0) return;
  if(!G.near||G.nearD>460){ s.cdT=.15; return; }
  s.cdT=cdOf(s);
  const a=Math.atan2(G.near.y-P.y,G.near.x-P.x),ca=Math.cos(a),sa=Math.sin(a),n=pv(s,'count'),r=pv(s,'r')*P.area,ox=P.x,oy=P.y,dmg=pv(s,'dmg'),kn=pv(s,'knock');
  for(let i=0;i<n;i++){ const go=()=>{ const d=28+i*r*1.05; G.strikes.push(mkStrike(ox+ca*d,oy+sa*d,r,.03,dmg,s,'spike',{knock:kn})); }; if(i===0) go(); else later(i*.045,go); }
  P.atkT=.12;
};
BEH.summon=(s,dt)=>{
  const n=countOf(s),U=s.st.units||(s.st.units=[]);
  while(U.length<n) U.push({x:P.x,y:P.y,state:0,cd:rand(.2,.8),tg:null,a:rand(0,TAU),ang:0,face:1,aim:0});
  for(let i=0;i<U.length;i++){ if(s.def.mode==='hawk') hawkUpdate(s,U[i],dt,G.t*1.4+i*TAU/U.length); else cloneUpdate(s,U[i],dt,i,U.length); }
};
function hawkUpdate(s,u,dt,fa){
  const fx=P.x+Math.cos(fa)*46,fy=P.y-26+Math.sin(fa)*22,px=u.x,py=u.y;
  if(u.state===0){ const k=Math.min(1,dt*6); u.x+=(fx-u.x)*k; u.y+=(fy-u.y)*k; u.cd-=dt; if(u.cd<=0){ u.tg=randomNear(P.x,P.y,420); if(u.tg) u.state=1; else u.cd=.2; } }
  else if(u.state===1){ if(!u.tg||u.tg.dead){ u.tg=nearestTo(u.x,u.y,300); if(!u.tg){ u.state=2; return; } }
    const dx=u.tg.x-u.x,dy=u.tg.y-u.y,d=Math.hypot(dx,dy)||1,sp=760;
    if(d<sp*dt+10){ u.x=u.tg.x; u.y=u.tg.y; const r=pv(s,'r')*P.area; aoe(u.x,u.y,r,pv(s,'dmg'),s,{knock:180}); G.fx.push({k:'ring',x:u.x,y:u.y,r0:6,r1:r,t:0,dur:.3,c:'#ffd9a0',w:6,dead:false}); burst(u.x,u.y,8,'#d9a066',180,.5,3,'shard'); sfx('slice'); u.state=2; }
    else { u.x+=dx/d*sp*dt; u.y+=dy/d*sp*dt; } }
  else { const dx=fx-u.x,dy=fy-u.y,d=Math.hypot(dx,dy); if(d<14){ u.state=0; u.cd=cdOf(s); } else { u.x+=dx/d*540*dt; u.y+=dy/d*540*dt; } }
  const mx=u.x-px,my=u.y-py; if(mx*mx+my*my>.5) u.ang=Math.atan2(my,mx);
}
function cloneUpdate(s,u,dt,i,n){
  const fa=G.t*.8+i*TAU/n,fx=P.x+Math.cos(fa)*42,fy=P.y+Math.sin(fa)*28,k=Math.min(1,dt*5);
  u.x+=(fx-u.x)*k; u.y+=(fy-u.y)*k; u.cd-=dt;
  if(u.cd<=0){ const t=nearestTo(u.x,u.y,420); if(t){ u.cd=cdOf(s); const a=Math.atan2(t.y-u.y,t.x-u.x); u.aim=a; u.face=Math.cos(a)<0?-1:1;
      G.projs.push({x:u.x,y:u.y-6,vx:Math.cos(a)*620,vy:Math.sin(a)*620,r:5,dmg:pv(s,'dmg'),pierce:1,life:.6,max:.6,knock:40,explode:0,homing:0,crit:.05,shape:'dagger',c:'#c3b0ff',src:s,burn:0,hit:null,tg:null,dead:false,t:0}); }
    else u.cd=.2; }
}

