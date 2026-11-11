/* ================= 22a-render-skx.js · lane B · how the 30 character-only skills look (25a · CLASSES skx) ================= */
// Called from the shared draw passes only for what these skills create (projectile shapes in SKX_SHAPE, zones with x2, the
// summon modes / orbit styles they add) → classic frames draw exactly as before. Canvas only, no RNG, no game state changes.
const SKX_SHAPE={gsword:1, axe:1, comet:1, leaf:1, star:1, net:1, gale:1, palm:1};
// drawProjs (22, 'lighter' pass) → true = drawn here
function sk2DrawProj(p,sp,a){ if(!SKX_SHAPE[p.shape]) return false; const r=p.r;
  switch(p.shape){
    case 'comet':{ streak(p.x,p.y,a,Math.min(120,60+sp*.08),r*3.2,'#ff6a1a',.8); streak(p.x,p.y,a,40,r*1.6,'#fff2c0',.7); glow(p.x,p.y,r*3,p.c,.9);   // long burning tail
      ctx.globalCompositeOperation='source-over'; circ(ctx,'#fff6d8',p.x,p.y,r*.75); circ(ctx,p.c,p.x+Math.cos(a)*r*.2,p.y+Math.sin(a)*r*.2,r*.45); ctx.globalCompositeOperation='lighter'; return true; }
    case 'star':{ glow(p.x,p.y,r*2.6,p.c,.8); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.t*9); ctx.fillStyle='#ffffff'; ctx.beginPath();
      for(let i=0;i<8;i++){ const rr=i%2?r*.35:r*1.4, b=i*PI/4; ctx.lineTo(Math.cos(b)*rr,Math.sin(b)*rr); } ctx.closePath(); ctx.fill(); ctx.restore(); return true; }
    case 'palm':{ const f=Math.min(1,p.life/p.max*2.5), R=r*1.5;                 // a golden palm wave: bright crescent, sun glow, finger streaks
      glow(p.x,p.y,R*1.6,'#ffb347',.45*f); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.globalAlpha=f; ctx.lineCap='round';
      ctx.strokeStyle=p.c; ctx.lineWidth=11; ctx.beginPath(); ctx.arc(-R*.55,0,R,-.95,.95); ctx.stroke(); ctx.strokeStyle='#fff6d8'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(-R*.5,0,R,-.8,.8); ctx.stroke();
      ctx.strokeStyle='rgba(255,215,140,.55)'; ctx.lineWidth=3; for(let i=-2;i<=2;i++){ const y=i*R*.28; ctx.beginPath(); ctx.moveTo(-R*.3,y); ctx.lineTo(-R*.95,y*1.1); ctx.stroke(); } ctx.restore(); ctx.globalAlpha=1; return true; }
    case 'gale':{ const f=Math.min(1,p.life/p.max*2.5), R=r*1.6;                // a wide wind crescent with streaks behind it
      streak(p.x,p.y,a,70,R*1.6,p.c,.35*f); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a); ctx.globalAlpha=f; ctx.lineCap='round';
      ctx.strokeStyle=p.c; ctx.lineWidth=9; ctx.beginPath(); ctx.arc(-R*.5,0,R,-1.05,1.05); ctx.stroke(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(-R*.45,0,R,-.9,.9); ctx.stroke();
      ctx.strokeStyle='rgba(220,255,232,.6)'; ctx.lineWidth=1.5; for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(-R*.2,i*R*.45); ctx.lineTo(-R*1.3-(p.t*300%20),i*R*.45); ctx.stroke(); } ctx.restore(); ctx.globalAlpha=1; return true; }
  }
  ctx.globalCompositeOperation='source-over'; ctx.save(); ctx.translate(p.x,p.y);
  if(p.shape==='gsword'){ ctx.rotate(p.t*15); const L=r*1.9;            // a spinning greatsword: dark edge, bright blade, gold guard
    ctx.fillStyle='#14202c'; ctx.beginPath(); ctx.moveTo(-L*.45,-4.2); ctx.lineTo(L*.85,-4.2); ctx.lineTo(L*1.12,0); ctx.lineTo(L*.85,4.2); ctx.lineTo(-L*.45,4.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(-L*.42,-2.8); ctx.lineTo(L*.84,-2.8); ctx.lineTo(L*1.04,0); ctx.lineTo(L*.84,2.8); ctx.lineTo(-L*.42,2.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillRect(-L*.3,-1.6,L*1,1); ctx.fillStyle='#c9a24a'; ctx.fillRect(-L*.48,-6,4,12); ctx.fillStyle='#5a3a1e'; ctx.fillRect(-L*.78,-1.8,L*.3,3.6); }
  else if(p.shape==='axe'){ ctx.restore(); ctx.strokeStyle='rgba(150,140,130,.75)'; ctx.lineWidth=2; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(P.x,P.y-8); ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.setLineDash([]);   // the chain back to the hand
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.t*18); ctx.fillStyle='#5a3a1e'; ctx.fillRect(-r*1.3,-1.6,r*2.2,3.2);
    ctx.fillStyle='#2a2622'; ctx.beginPath(); ctx.moveTo(r*.5,-1); ctx.quadraticCurveTo(r*1.6,-r*1.4,r*1.2,-r*.2); ctx.lineTo(r*1.2,r*.2); ctx.quadraticCurveTo(r*1.6,r*1.4,r*.5,1); ctx.closePath(); ctx.fill();
    ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(r*.6,-1); ctx.quadraticCurveTo(r*1.45,-r*1.15,r*1.1,-r*.15); ctx.lineTo(r*1.1,r*.15); ctx.quadraticCurveTo(r*1.45,r*1.15,r*.6,1); ctx.closePath(); ctx.fill(); }
  else if(p.shape==='leaf'){ ctx.rotate(p.t*12); ctx.fillStyle='#2f6b2a'; ctx.beginPath(); ctx.ellipse(0,0,r*1.5,r*.7,0,0,TAU); ctx.fill();   // a spinning blade leaf
    ctx.fillStyle=p.c; ctx.beginPath(); ctx.ellipse(0,0,r*1.3,r*.5,0,0,TAU); ctx.fill(); ctx.strokeStyle='#e8ffd8'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(-r*1.2,0); ctx.lineTo(r*1.2,0); ctx.stroke(); }
  else if(p.shape==='net'){ ctx.rotate(a); ctx.strokeStyle='#8a7a5a'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-16,0); ctx.lineTo(-2,0); ctx.stroke();   // an arrow carrying a folded net
    ctx.rotate(p.t*8); ctx.fillStyle='#5a4a30'; ctx.beginPath(); ctx.arc(0,0,r*1.2,0,TAU); ctx.fill(); ctx.strokeStyle=p.c; ctx.lineWidth=1.2;
    for(let i=-1;i<=1;i++){ ctx.beginPath(); ctx.moveTo(i*r*.5,-r*1.1); ctx.lineTo(i*r*.5,r*1.1); ctx.moveTo(-r*1.1,i*r*.5); ctx.lineTo(r*1.1,i*r*.5); ctx.stroke(); } }
  ctx.restore(); ctx.globalCompositeOperation='lighter';
  glow(p.x,p.y,r*(p.shape==='gsword'?2.6:1.8),p.c,p.shape==='leaf'?.25:.35); return true; }
// drawZones (22) → zones with x2
function sk2DrawZone(z,fade){ const t=G.t, sd=z.seed||0;
  switch(z.kind){
    case 'palisade':{ const n=12, up=Math.min(1,z.t*6), R=z.r;          // a ring of spear tips pointing out, popping up at the start
      ctx.strokeStyle=`rgba(232,217,168,${.35*fade})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(z.x,z.y,R,R*.8,0,0,TAU); ctx.stroke();
      for(let i=0;i<n;i++){ const a=i*TAU/n+sd, cx=z.x+Math.cos(a)*R, cy=z.y+Math.sin(a)*R*.8, h=(10+6*up)*fade;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(a); ctx.globalAlpha=fade; ctx.fillStyle='#6b4a2a'; ctx.fillRect(-8,-1.6,10,3.2);
        ctx.fillStyle='#e8e2d0'; ctx.beginPath(); ctx.moveTo(2,-4); ctx.lineTo(2+h,0); ctx.lineTo(2,4); ctx.closePath(); ctx.fill(); ctx.restore(); }
      ctx.globalAlpha=1; break; }
    case 'grav':{ const R=Math.min(z.r,90), k=Math.min(1,z.t/Math.max(.1,z.dur));       // a dark core with rings spiralling in · tightens near the end
      ctx.globalCompositeOperation='lighter'; glow(z.x,z.y,R*1.9,'#6a4ad8',.35*fade);
      ctx.strokeStyle=`rgba(200,180,255,${.55*fade})`; ctx.lineWidth=2;
      for(let i=0;i<3;i++){ const q=(t*.9+i/3)%1, rr=R*2*(1-q); ctx.globalAlpha=q*fade; ctx.beginPath(); ctx.ellipse(z.x,z.y,rr,rr*.75,0,0,TAU); ctx.stroke(); }
      ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
      circ(ctx,`rgba(12,6,24,${.9*fade})`,z.x,z.y,R*(.42-.12*k)); ctx.strokeStyle=`rgba(180,150,255,${.9*fade})`; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(z.x,z.y,R*(.42-.12*k),t*4,t*4+4.4); ctx.stroke(); break; }
    case 'rift':{ const R=z.r, op=Math.min(1,z.t*5,(z.dur-z.t)*5), h=Math.min(90,R*1.1)*op, w=Math.min(36,R*.45)*op, fl=z.fl>0?z.fl/.15:0;   // an upright portal, flashes when it shoots
      ctx.globalCompositeOperation='lighter'; glow(z.x,z.y-h*.5,h*.9,'#9a7dff',.4*fade+fl*.3);
      ctx.globalCompositeOperation='source-over'; ctx.fillStyle=`rgba(20,10,40,${.85*fade})`; ctx.beginPath(); ctx.ellipse(z.x,z.y-h*.5,w,h*.5,0,0,TAU); ctx.fill();
      ctx.strokeStyle=`rgba(232,220,255,${fade})`; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(z.x,z.y-h*.5,w,h*.5,0,0,TAU); ctx.stroke();
      ctx.fillStyle=`rgba(255,255,255,${.8*fade})`; for(let i=0;i<4;i++){ const b=t*2+i*1.7+sd; ctx.fillRect(z.x+Math.cos(b)*w*.5-1,z.y-h*.5+Math.sin(b*1.3)*h*.35-1,2,2); } break; }
    case 'lava':{ const R=z.r, up=Math.min(1,z.t*4), fl=z.fl>0?z.fl/.2:0;   // a small volcano: glowing pool, a cone, a crater that flares on each bomb
      ctx.globalCompositeOperation='lighter'; glow(z.x,z.y,R*1.3,'#ff5a1a',.4*fade); ctx.globalCompositeOperation='source-over';
      const H=Math.min(48,R*.5)*up, B=Math.min(50,R*.55); ctx.globalAlpha=fade; ctx.fillStyle='#3a2418'; ctx.beginPath(); ctx.moveTo(z.x-B,z.y+4); ctx.lineTo(z.x-B*.3,z.y-H); ctx.lineTo(z.x+B*.3,z.y-H); ctx.lineTo(z.x+B,z.y+4); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#5a3a24'; ctx.beginPath(); ctx.moveTo(z.x-B*.55,z.y+2); ctx.lineTo(z.x-B*.22,z.y-H); ctx.lineTo(z.x,z.y-H); ctx.lineTo(z.x-B*.1,z.y+2); ctx.closePath(); ctx.fill();
      ctx.fillStyle=fl>0?'#fff0a0':'#ff8a2a'; ctx.beginPath(); ctx.ellipse(z.x,z.y-H,B*.3,B*.1,0,0,TAU); ctx.fill(); ctx.globalAlpha=1;
      if(fl>0){ ctx.globalCompositeOperation='lighter'; glow(z.x,z.y-H,R*.9,'#ffb050',fl*fade); ctx.globalCompositeOperation='source-over'; } break; }
    case 'prayer':{ const R=z.r;                                              // a slowly turning circle of runes on the ground
      ctx.globalCompositeOperation='lighter'; glow(z.x,z.y,R*1.1,'#ffe9a0',.22*fade);
      ctx.save(); ctx.translate(z.x,z.y); ctx.scale(1,.78); ctx.rotate(G.t*.5+sd); ctx.globalAlpha=.55*fade; ctx.drawImage(runeTex(z.src.def.c),-R,-R,R*2,R*2); ctx.restore(); ctx.globalAlpha=1;
      ctx.globalCompositeOperation='source-over'; ctx.strokeStyle=`rgba(255,240,190,${.6*fade})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(z.x,z.y,R,R*.78,0,0,TAU); ctx.stroke(); break; }
    case 'turret':{ const a=z.aa||0, fl=z.fl>0?z.fl/.15:0;                 // a little crossbow on a tripod, turned at its last target
      ctx.globalAlpha=fade; ctx.strokeStyle='#4a3424'; ctx.lineWidth=3; ctx.beginPath(); for(const k of [-1,0,1]){ ctx.moveTo(z.x,z.y-12); ctx.lineTo(z.x+k*10,z.y+6-(k?0:2)); } ctx.stroke();
      ctx.save(); ctx.translate(z.x,z.y-14); ctx.rotate(a); ctx.fillStyle='#7a5432'; ctx.fillRect(-10,-3,22,6); ctx.strokeStyle='#c9a66b'; ctx.lineWidth=2.5; ctx.beginPath(); ctx.arc(4,0,11,-1.25,1.25); ctx.stroke();
      ctx.strokeStyle='#efe6c8'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(4+11*Math.cos(1.25)-(fl?0:6),-11*Math.sin(1.25)); ctx.lineTo(-6+(fl?10:0),0); ctx.lineTo(4+11*Math.cos(1.25)-(fl?0:6),11*Math.sin(1.25)); ctx.stroke(); ctx.restore();
      const k2=Math.max(0,(z.dur-z.t)/z.dur); ctx.fillStyle='rgba(0,0,0,.45)'; ctx.fillRect(z.x-12,z.y+10,24,3); ctx.fillStyle='#c9a66b'; ctx.fillRect(z.x-12,z.y+10,24*k2,3); ctx.globalAlpha=1; break; }   // time left
  } }
// drawOrbits (22) → orbit styles of these skills (s.st.pos = [x, y, angle] per ball · size = its radius)
function sk2DrawOrbit(s,size){ const P2=s.st.pos||[];
  if(s.def.os==='drop'){ ctx.globalCompositeOperation='lighter'; for(const p of P2) if(p) glow(p[0],p[1],size*2.4,s.def.c,.6); ctx.globalCompositeOperation='source-over';
    for(const p of P2){ if(!p) continue; ctx.save(); ctx.translate(p[0],p[1]); ctx.rotate(p[2]+PI/2); ctx.fillStyle='#2a7fd8'; ctx.beginPath(); ctx.moveTo(-size*1.5,0); ctx.quadraticCurveTo(0,-size*1.05,size*.9,0); ctx.quadraticCurveTo(0,size*1.05,-size*1.5,0); ctx.fill();
      ctx.fillStyle='#bfe6ff'; ctx.beginPath(); ctx.ellipse(size*.2,-size*.25,size*.35,size*.2,0,0,TAU); ctx.fill(); ctx.restore(); } } }
// drawStrikesOver (22) → a lava bomb arcing from the volcano to where it lands
function sk2Lava(s){ if(s.t>=s.delay||s.ox==null) return; const k=s.t/s.delay, x=s.ox+(s.x-s.ox)*k, y=s.oy+(s.y-s.oy)*k-Math.sin(k*PI)*90, rr=Math.max(5,s.r*.22);
  glow(x,y,rr*3,'#ff6a1a',.9); circ(ctx,'#ffb050',x,y,rr); circ(ctx,'#fff2c0',x-rr*.3,y-rr*.3,rr*.45); }
// drawUnits (22) → summon modes of these skills
function sk2DrawUnit(s,u){
  if(s.def.mode==='wolf'){ const f=u.face||1, run=u.run?Math.sin(G.t*22+u.a)*3:0, bt=u.bite>0?u.bite/.18:0;   // a pale spirit wolf
    ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(u.x,u.y+10,13,3.5,0,0,TAU); ctx.fill();
    ctx.globalCompositeOperation='lighter'; glow(u.x,u.y-4,22,s.def.c,.35); ctx.globalCompositeOperation='source-over';
    ctx.save(); ctx.translate(u.x,u.y); ctx.scale(f,1); ctx.globalAlpha=.9; ctx.strokeStyle='#8fa6d8'; ctx.lineWidth=3; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(-9+run,9); ctx.moveTo(-3,0); ctx.lineTo(-3-run,9); ctx.moveTo(5,0); ctx.lineTo(5+run,9); ctx.moveTo(9,-1); ctx.lineTo(10-run,8); ctx.stroke();
    ctx.fillStyle='#cfdcff'; ctx.beginPath(); ctx.ellipse(0,-3,12,6,0,0,TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-11,-5); ctx.quadraticCurveTo(-20,-9-run,-22,-2); ctx.lineTo(-11,-2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(13+bt*3,-7,6,5,-.2,0,TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(15+bt*3,-9); ctx.lineTo(22+bt*4,-7+bt*2); ctx.lineTo(15+bt*3,-4); ctx.fill();
    ctx.beginPath(); ctx.moveTo(10,-10); ctx.lineTo(11,-16); ctx.lineTo(14,-11); ctx.fill(); circ(ctx,'#2a3a6a',15+bt*3,-8,1.3); ctx.restore(); ctx.globalAlpha=1; }
  else if(s.def.mode==='lantern'){ const fl=u.fl>0?u.fl/.15:0, sw=Math.sin(G.t*3+(u.a||0))*.12;   // a paper lantern bobbing over the shoulder
    ctx.globalCompositeOperation='lighter'; glow(u.x,u.y,18+fl*10,s.def.c,.55+fl*.4); ctx.globalCompositeOperation='source-over';
    ctx.save(); ctx.translate(u.x,u.y); ctx.rotate(sw); ctx.strokeStyle='#6a4a2a'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(0,-14); ctx.lineTo(0,-9); ctx.stroke();
    ctx.fillStyle='#c0392b'; ctx.beginPath(); ctx.ellipse(0,0,7,9,0,0,TAU); ctx.fill(); ctx.fillStyle=fl?'#fffbe0':'#ffd27a'; ctx.beginPath(); ctx.ellipse(0,0,4.5,7,0,0,TAU); ctx.fill();
    ctx.fillStyle='#3a2a1a'; ctx.fillRect(-4,-10,8,2); ctx.fillRect(-4,8,8,2); ctx.restore(); } }
// after the units (22 render, character runs only): marks on enemies (ศรหมายหัว) · nets (ศรตาข่าย)
function sk2DrawOver(){
  if(G.mk){ let any=false; ctx.lineWidth=2;
    for(const e of G.enemies){ if(e.dead||!(e.markT>G.t)) continue; any=true; const r=e.r+9, y=e.y-e.r*.4, a=G.t*2.5, k=Math.min(1,(e.markT-G.t)*2);
      ctx.strokeStyle=`rgba(255,110,60,${.85*k})`; ctx.beginPath(); ctx.arc(e.x,y,r,a,a+1.1); ctx.stroke(); ctx.beginPath(); ctx.arc(e.x,y,r,a+PI,a+PI+1.1); ctx.stroke();
      ctx.beginPath(); for(const q of [0,PI/2,PI,PI*1.5]){ ctx.moveTo(e.x+Math.cos(q)*(r-5),y+Math.sin(q)*(r-5)); ctx.lineTo(e.x+Math.cos(q)*(r+5),y+Math.sin(q)*(r+5)); } ctx.stroke(); }
    if(!any) G.mk=0; }
  for(const f of G.fx){ if(f.k!=='netx') continue; const k=f.t/f.dur, a=k<.8?1:(1-k)/.2, r=f.r*(k<.12?k/.12:1);   // a net spread over the caught ones
    ctx.save(); ctx.translate(f.x,f.y); ctx.scale(1,.8); ctx.globalAlpha=.75*a; ctx.strokeStyle=f.c; ctx.lineWidth=1.4; ctx.beginPath(); ctx.arc(0,0,r,0,TAU);
    for(let i=-3;i<=3;i++){ const d=i*r/3.5, h=Math.sqrt(Math.max(0,r*r-d*d)); ctx.moveTo(d,-h); ctx.lineTo(d,h); ctx.moveTo(-h,d); ctx.lineTo(h,d); } ctx.stroke(); ctx.restore(); }
  for(const s of P.skills){ if(s.def.type!=='seal'||!s.st.q||!s.st.q.length) continue;   // seals: a turning hexagram that closes before it bursts
    for(const m of s.st.q){ const k=Math.min(1,(G.t-m.t0)/Math.max(.05,m.at-m.t0)), y=m.y-(m.e.dead?0:m.e.r*.4), R=16-6*k, a=G.t*3;
      ctx.strokeStyle=hexA(s.def.c,.5+.5*k); ctx.lineWidth=2; for(const o of [0,PI]){ ctx.beginPath(); for(let i=0;i<3;i++){ const b=a+o+i*TAU/3; ctx.lineTo(m.x+Math.cos(b)*R,y+Math.sin(b)*R); } ctx.closePath(); ctx.stroke(); }
      ctx.strokeStyle=`rgba(255,246,200,${.8*k})`; ctx.beginPath(); ctx.arc(m.x,y,R+5,-PI/2,-PI/2+TAU*k); ctx.stroke(); } }
  ctx.globalAlpha=1; }
