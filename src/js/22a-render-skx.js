/* ================= 22a-render-skx.js · lane B · how the 30 character-only skills look (25a · CLASSES skx) ================= */
// Called from the shared draw passes only for what these skills create (projectile shapes in SKX_SHAPE, zones with x2, the
// summon modes / orbit styles they add) → classic frames draw exactly as before. Canvas only, no RNG, no game state changes.
const SKX_SHAPE={gsword:1, axe:1, comet:1, leaf:1, star:1};
// drawProjs (22, 'lighter' pass) → true = drawn here
function sk2DrawProj(p,sp,a){ if(!SKX_SHAPE[p.shape]) return false; const r=p.r;
  switch(p.shape){
    case 'comet':{ streak(p.x,p.y,a,Math.min(120,60+sp*.08),r*3.2,'#ff6a1a',.8); streak(p.x,p.y,a,40,r*1.6,'#fff2c0',.7); glow(p.x,p.y,r*3,p.c,.9);   // long burning tail
      ctx.globalCompositeOperation='source-over'; circ(ctx,'#fff6d8',p.x,p.y,r*.75); circ(ctx,p.c,p.x+Math.cos(a)*r*.2,p.y+Math.sin(a)*r*.2,r*.45); ctx.globalCompositeOperation='lighter'; return true; }
    case 'star':{ glow(p.x,p.y,r*2.6,p.c,.8); ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.t*9); ctx.fillStyle='#ffffff'; ctx.beginPath();
      for(let i=0;i<8;i++){ const rr=i%2?r*.35:r*1.4, b=i*PI/4; ctx.lineTo(Math.cos(b)*rr,Math.sin(b)*rr); } ctx.closePath(); ctx.fill(); ctx.restore(); return true; }
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
  } }
// drawOrbits (22) → orbit styles of these skills (s.st.pos = [x, y, angle] per ball · size = its radius)
function sk2DrawOrbit(s,size){ const P2=s.st.pos||[];
  if(s.def.os==='drop'){ ctx.globalCompositeOperation='lighter'; for(const p of P2) if(p) glow(p[0],p[1],size*2.4,s.def.c,.6); ctx.globalCompositeOperation='source-over';
    for(const p of P2){ if(!p) continue; ctx.save(); ctx.translate(p[0],p[1]); ctx.rotate(p[2]+PI/2); ctx.fillStyle='#2a7fd8'; ctx.beginPath(); ctx.moveTo(-size*1.5,0); ctx.quadraticCurveTo(0,-size*1.05,size*.9,0); ctx.quadraticCurveTo(0,size*1.05,-size*1.5,0); ctx.fill();
      ctx.fillStyle='#bfe6ff'; ctx.beginPath(); ctx.ellipse(size*.2,-size*.25,size*.35,size*.2,0,0,TAU); ctx.fill(); ctx.restore(); } } }
// drawStrikesOver (22) → a lava bomb arcing from the volcano to where it lands
function sk2Lava(s){ if(s.t>=s.delay||s.ox==null) return; const k=s.t/s.delay, x=s.ox+(s.x-s.ox)*k, y=s.oy+(s.y-s.oy)*k-Math.sin(k*PI)*90, rr=Math.max(5,s.r*.22);
  glow(x,y,rr*3,'#ff6a1a',.9); circ(ctx,'#ffb050',x,y,rr); circ(ctx,'#fff2c0',x-rr*.3,y-rr*.3,rr*.45); }
