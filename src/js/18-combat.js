/* ================= combat core ================= */
function damageEnemy(e,base,s,o){
  if(e.dead) return 0; o=o||{};
  const crit=Math.random()<P.crit+(o.crit||0);
  let dmg=base*P.might*(crit?P.critMult:1);
  if(P.rage) dmg*=1+P.rage*(1-P.hp/P.maxHp);
  dmg*=rand(.92,1.08);
  if(e.def) dmg*=1-e.def; if(e.boss&&P.bossDmg) dmg*=1+P.bossDmg; if(P.fam&&e.d.fam){ const f=P.fam[e.d.fam]; if(f) dmg*=1+f; }
  e.hp-=dmg; e.flash=.09; e.hitT=.12; e.ai.hurtT=G.t; if(s) s.dealt+=dmg; G.totalDmg+=dmg;
  if((!o.quiet||crit)&&(G.texts.length<110||crit)) addNum(e.x+rand(-6,6),e.y-e.r-6,Math.round(dmg),crit?'c':'w');
  let nx=o.nx,ny=o.ny;
  if(nx===undefined){ nx=e.x-(o.ox??P.x); ny=e.y-(o.oy??P.y); const l=Math.hypot(nx,ny)||1; nx/=l; ny/=l; }
  if(o.knock&&!e.boss){ const imp=o.knock/Math.max(.5,e.mass); e.kx+=nx*imp; e.ky+=ny*imp; const km=Math.hypot(e.kx,e.ky); if(km>720){ e.kx*=720/km; e.ky*=720/km; } }
  if(!o.quiet&&Math.random()<(qLv()?.7:.3)) sparks(e.x-nx*e.r*.5,e.y-e.r*.4-ny*e.r*.5,nx,ny,crit?4:2,crit?'#ffe28a':'#ffffff');
  if(o.slow){ const f=1-o.slow*(e.boss?.5:1); if(f<e.slowF) e.slowF=f; e.slowT=Math.max(e.slowT,o.slowDur||1); }
  if(o.freeze&&!e.boss) e.freezeT=Math.max(e.freezeT,o.freeze);
  if(o.stun&&!e.boss) e.stunT=Math.max(e.stunT,o.stun);
  if(e.hp<=0) killEnemy(e,nx);
  else if(G.hitSfxT<=0){ G.hitSfxT=.045; sfx('hit'); }
  return dmg;
}
function aoe(x,y,r,dmg,s,o){ o=o||{}; for(const e of query(x,y,r+60)){ if(e.dead) continue; const dx=e.x-x,dy=e.y-y,d=Math.hypot(dx,dy); if(d-e.r>r) continue; const l=d||1;
  damageEnemy(e,dmg,s,{knock:o.knock||0,nx:d?dx/l:1,ny:d?dy/l:0,slow:o.slow,slowDur:o.slowDur,freeze:o.freeze,stun:o.stun,crit:o.crit,quiet:o.quiet}); } }
function explode(x,y,r,dmg,s,o){ o=o||{}; const c=o.c||'#ffae4a'; aoe(x,y,r,dmg,s,{knock:o.knock??180});
  G.fx.push({k:'boom',x,y,r,t:0,dur:.42,c,dead:false}); G.fx.push({k:'ring',x,y,r0:r*.3,r1:r*1.15,t:0,dur:.3,c:'#fff2d0',w:5,dead:false});
  if(!G.auto){ const q=qLv();
    for(let i=0;i<(q?5:2);i++) part({x:x+rand(-r*.3,r*.3),y:y+rand(-r*.3,r*.3),vx:rand(-30,30),vy:rand(-50,-10),life:rand(.6,1),s:r*.22,grow:r*.5,c:'#3a3530',g:0,drag:2,k:'puff',add:false,a:.5});
    for(let i=0;i<(q?10:4);i++){ const a=rand(0,TAU),v=rand(120,r*5); part({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-60,life:rand(.35,.7),s:rand(2,3.5),c,g:380,drag:2.5,k:'sq',add:true}); }
    if(q>=1) addDecal(scorchTex(),x,y,r*.85,6,.6); }
  G.shake=Math.max(G.shake,Math.min(7,r/16)); sfx('boom'); }
function addZone(o){ if(G.zones.length>70){ const i=G.zones.findIndex(z=>z.trap); if(i>=0) G.zones.splice(i,1); else G.zones.shift(); }
  G.zones.push(Object.assign({t:0,tt:0,tick:.4,dmg:0,slow:0,drift:0,pull:0,trap:0,knock:0,vx:0,vy:0,retarget:0,tg:null,wa:rand(0,TAU),seed:Math.random()*100,dead:false},o)); }
function dropGem(x,y,v){ if(G.gems.length>450){ const g=G.gems[(Math.random()*G.gems.length)|0]; if(g&&g.kind==='xp'){ g.v+=v; return; } }
  G.gems.push({x,y,vx:rand(-50,50),vy:rand(-50,50),v,kind:'xp',mag:false,sp:0,t:0,dead:false}); }
function dropItem(x,y,kind){ G.gems.push({x,y,vx:rand(-30,30),vy:-90,v:0,kind,mag:false,sp:0,t:0,dead:false}); }
function killEnemy(e,dirX){
  if(e.dead) return; e.dead=true; G.kills++;
  const q=qLv();
  if(!G.auto){
    burst(e.x,e.y-e.r*.3,e.boss?40:e.elite?16:5,e.d.goo,e.boss?320:150,.5,e.boss?5:3);
    if(e.d.bones) burst(e.x,e.y-e.r*.4,e.boss?14:4,'#e9e2cf',140,.7,e.boss?6:3,'rock');
    if(!e.d.fly&&!e.d.phase&&Math.random()<[.25,.6,1][q]) addDecal(splatTex(shade(e.d.goo,-.35),(Math.random()*3)|0),e.x,e.y+e.r*.6,e.r*(e.boss?2.4:1.5),8,.55);
    if(!e.d.blast&&G.corpses.length<QCORPSE[q]) G.corpses.push({type:e.type,x:e.x,y:e.y,face:e.face,sc:e.r/e.d.r,t:0,dur:e.boss?1.4:.6,mode:e.d.fly?'drop':e.d.phase?'rise':'fall',rot:(dirX!==undefined?(dirX<0?-1:1):(Math.random()<.5?-1:1)),dead:false});
  }
  if(e.boss){ for(let i=0;i<12;i++) dropGem(e.x+rand(-60,60),e.y+rand(-60,60),Math.ceil(e.d.xp/12)); dropItem(e.x,e.y,'heart'); dropItem(e.x+30,e.y,'magnet');
    G.shake=Math.max(G.shake,14); G.fx.push({k:'boom',x:e.x,y:e.y,r:e.r*3,t:0,dur:.7,c:'#ffe7a8',dead:false}); sfx('boom'); G.score+=1000; if(!G.auto) G.hitStop=.28; }
  else { dropGem(e.x,e.y,e.xp); if(e.elite){ dropItem(e.x,e.y,'chest'); if(!G.auto) G.hitStop=Math.max(G.hitStop,.07); } else { const r=Math.random(); if(r<.0045) dropItem(e.x,e.y,'heart'); else if(r<.006) dropItem(e.x,e.y,'magnet'); else if(r<.0075) dropItem(e.x,e.y,'bomb'); } }
  if(e.d.blast){ const b=e.d.blast; G.fx.push({k:'boom',x:e.x,y:e.y,r:b.r,t:0,dur:.4,c:'#a8d14f',dead:false}); burst(e.x,e.y,12,'#c8e86a',240,.5,4); addDecal(splatTex('#5f7a2a',1),e.x,e.y,b.r*.9,8,.6); sfx('boom');
    const dx=P.x-e.x,dy=P.y-e.y; if(dx*dx+dy*dy<(b.r+P.r)*(b.r+P.r)) hurtPlayer(b.dmg*G.cfg.dmgMul);
    for(const o of query(e.x,e.y,b.r+60)){ if(o.dead||o===e) continue; const ex=o.x-e.x,ey=o.y-e.y,d=Math.hypot(ex,ey); if(d-o.r>b.r) continue; damageEnemy(o,b.dmg*3,null,{knock:300,nx:d?ex/d:1,ny:d?ey/d:0,quiet:true}); } }
  if(P.steal) healP(P.steal,true);
  if(G.mode.onKill) G.mode.onKill(e);
  sfx('kill');
}
function healP(a,quiet){ if(G.over) return; const before=P.hp; P.hp=Math.min(P.maxHp,P.hp+a); const got=P.hp-before; if(!quiet&&got>=3){ addNum(P.x,P.y-40,'+'+Math.round(got),'g'); for(let i=0;i<5;i++) part({x:P.x+rand(-12,12),y:P.y+rand(-10,6),vx:rand(-8,8),vy:rand(-70,-40),life:rand(.5,.8),s:3,c:'#7dffa8',g:0,drag:1,k:'plus',add:true}); } }
function hurtPlayer(dmg){
  if(G.over||G.god) return;
  if(P.dodge>0&&Math.random()<P.dodge){ addText(P.x,P.y-34,'หลบ!','#c9b6ff'); if(P.dodgeCd<=0){ P.dodgeCd=.6; shadowBurst(); } return; }
  dmg*=1-P.armor/(P.armor+(G.defK||22));
  if(P.shield>0){ const a=Math.min(P.shield,dmg); P.shield-=a; dmg-=a; if(P.shield<=.01){ P.shield=0; shieldBreak(); } }
  if(dmg<=0) return;
  P.hp-=dmg; P.hurtT=.3; G.hurtFlash=.28; G.shake=Math.max(G.shake,4);
  if(dmg>P.maxHp*.12&&!G.auto&&G.t>=(G.hurtStopAt||0)){ G.hitStop=Math.max(G.hitStop,.05); G.hurtStopAt=G.t+1; }
  addNum(P.x+rand(-8,8),P.y-30,Math.round(dmg),'h');
  sfx('hurt');
  if(P.hp<=0){ P.hp=0; if(G.mode.onDeath&&G.mode.onDeath()) return; endRun(false); }
}
function shieldBreak(){ const s=P.shieldSrc; if(!s) return; const r=pv(s,'r')*P.area; aoe(P.x,P.y,r,pv(s,'nova'),s,{knock:380}); G.fx.push({k:'ring',x:P.x,y:P.y,r0:20,r1:r,t:0,dur:.4,c:s.def.c,w:10,follow:true,dead:false}); burst(P.x,P.y-6,12,'#dff2ff',260,.4,3,'shard'); G.shake=Math.max(G.shake,6); sfx('boom'); s.st.t=cdOf(s); }
function shadowBurst(){ const s=P.skills.find(k=>k.id==='shadow'); if(!s) return; const r=pv(s,'r')*P.area; aoe(P.x,P.y,r,pv(s,'nova'),s,{knock:260}); G.fx.push({k:'ring',x:P.x,y:P.y,r0:10,r1:r,t:0,dur:.35,c:'#a58bff',w:8,follow:true,dead:false}); G.fx.push({k:'after',x:P.x,y:P.y,t:0,dur:.4,dead:false}); sfx('slice'); }
function enemyShoot(e,a,sp,dmg,kind){ G.eprojs.push({x:e.x,y:e.y-(e.boss?10:6),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:kind==='orb'?7:5,dmg,life:4.5,kind,rot:0,dead:false}); }

