/* ================= rendering ================= */
function drawProp(t,x,y,v){
  ctx.save(); ctx.translate(x,y);
  switch(t){
    case 0: ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(2,12,14,4,0,0,TAU); ctx.fill(); ctx.fillStyle='#596055'; ctx.beginPath(); ctx.moveTo(-10,12); ctx.lineTo(-10,-6); ctx.arc(0,-6,10,PI,TAU); ctx.lineTo(10,12); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#2a2e27'; ctx.lineWidth=1.5; ctx.stroke(); ctx.fillStyle='#6b7366'; ctx.fillRect(-8,-6,3,16); ctx.fillStyle='#454b42'; ctx.fillRect(-6,-4,12,2); ctx.fillRect(-5,0,10,2); ctx.fillStyle='#3a5530'; ctx.fillRect(-11,9,22,4); break;
    case 1: ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(1,12,9,3,0,0,TAU); ctx.fill(); ctx.fillStyle='#64553f'; ctx.fillRect(-2.5,-16,5,28); ctx.fillRect(-9,-9,18,4.5); ctx.fillStyle='#7a6a50'; ctx.fillRect(-2.5,-16,1.5,28); break;
    case 2: circ(ctx,'#2a2e27',-6,6,7.8); circ(ctx,'#2a2e27',4,3,9.8); circ(ctx,'#363c33',-6,5,7); circ(ctx,'#454c41',4,2,9); circ(ctx,'#596152',2,-1,4.5); break;
    case 3: ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(0,10,13,4,0,0,TAU); ctx.fill(); ctx.fillStyle='#3d2f22'; rrect(ctx,-9,-6,18,16,4); ctx.fill(); ctx.fillStyle='#5a4532'; ctx.beginPath(); ctx.ellipse(0,-6,9,3.5,0,0,TAU); ctx.fill(); ctx.strokeStyle='#3d2f22'; ctx.lineWidth=1; ctx.beginPath(); ctx.ellipse(0,-6,5,2,0,0,TAU); ctx.stroke(); limb(ctx,'#3d2f22',3,5,-2,16,-14); break;
    case 4: ctx.save(); ctx.rotate(v*3); ctx.fillStyle='#cfc8b4'; ctx.fillRect(-9,-1.2,18,2.4); ctx.restore(); circ(ctx,'#ddd6c4',4,-3,4.5); ctx.fillStyle='#2a2620'; ctx.fillRect(2.4,-4,1.6,1.6); ctx.fillRect(5.2,-4,1.6,1.6); break;
    default: { ctx.strokeStyle='#4f6a3a'; ctx.lineWidth=1.6; ctx.lineCap='round'; ctx.beginPath(); const tt=(G?G.t:titleT); for(let i=-3;i<=3;i++){ ctx.moveTo(i*2.4,4); ctx.lineTo(i*3.2+Math.sin(tt*1.5+i+v*9)*1.2,-6-(Math.abs(i)%3)*2); } ctx.stroke(); }
  }
  ctx.restore();
}
function drawProps(L,T,R,B){ const S=180,x0=Math.floor(L/S),x1=Math.floor(R/S),y0=Math.floor(T/S),y1=Math.floor(B/S);
  for(let cx=x0;cx<=x1;cx++) for(let cy=y0;cy<=y1;cy++){ const h=hash2(cx,cy); if(h>.3) continue; drawProp((h/.3*6)|0,cx*S+hash2(cx+71,cy-13)*S,cy*S+hash2(cx-29,cy+57)*S,hash2(cx*3,cy*7)); } }
function drawDecals(L,T,R,B){
  for(const d of G.decals){ if(d.x<L-d.r||d.x>R+d.r||d.y<T-d.r||d.y>B+d.r) continue; const k=d.t/d.life,a=d.a*(k<.7?1:1-(k-.7)/.3); if(a<=0) continue;
    ctx.globalAlpha=a; if(d.flat){ const w=d.tex.width/2,h=d.tex.height/2; ctx.drawImage(d.tex,d.x-w/2,d.y-h/2,w,h); }
    else { ctx.save(); ctx.translate(d.x,d.y); ctx.scale(1,.72); ctx.rotate(d.rot); ctx.drawImage(d.tex,-d.r,-d.r,d.r*2,d.r*2); ctx.restore(); } }
  ctx.globalAlpha=1;
}
function drawZones(){
  for(const z of G.zones){
    const fade=Math.min(1,(z.dur-z.t)*3,z.t*6);
    switch(z.kind){
      case 'fire':{ ctx.globalCompositeOperation='lighter'; const fl=1+.06*Math.sin(G.t*22+z.seed); glow(z.x,z.y,z.r*1.15*fl,'#ff6a1a',.55*fade); glow(z.x,z.y,z.r*.55*fl,'#ffd27a',.45*fade); ctx.globalCompositeOperation='source-over'; break; }
      case 'ice':{ ctx.globalAlpha=.85*fade; ctx.save(); ctx.translate(z.x,z.y); ctx.scale(1,.8); ctx.rotate(z.seed); ctx.drawImage(frostTex(),-z.r,-z.r,z.r*2,z.r*2); ctx.restore(); ctx.globalAlpha=1;
        ctx.strokeStyle=`rgba(220,245,255,${.5*fade})`; ctx.lineWidth=2; ctx.setLineDash([8,7]); ctx.lineDashOffset=-G.t*20; ctx.beginPath(); ctx.arc(z.x,z.y,z.r,0,TAU); ctx.stroke(); ctx.setLineDash([]); break; }
      case 'poison':{ const tex=cloudTex('#7ee05a'); ctx.globalAlpha=.75*fade; for(let i=0;i<3;i++){ const a=G.t*(.25+i*.12)+z.seed+i*2,ox=Math.cos(a)*z.r*.18,oy=Math.sin(a)*z.r*.12,s=z.r*(1.05+i*.12); ctx.save(); ctx.translate(z.x+ox,z.y+oy); ctx.rotate(a); ctx.drawImage(tex,-s,-s*.8,s*2,s*1.6); ctx.restore(); }
        ctx.globalAlpha=1; ctx.fillStyle=`rgba(190,255,140,${.4*fade})`; for(let i=0;i<6;i++){ const a=z.seed+i*2.1+G.t*.6,d=z.r*(.2+.6*((i*37%10)/10)),b=(G.t*1.5+i*.37)%1; ctx.beginPath(); ctx.arc(z.x+Math.cos(a)*d,z.y+Math.sin(a)*d-b*10,1.5+b*3.5,0,TAU); ctx.fill(); } break; }
      case 'wind':{ ctx.globalAlpha=.5*fade; const tex=cloudTex('#e6fff0'); ctx.save(); ctx.translate(z.x,z.y); ctx.rotate(G.t*6); ctx.drawImage(tex,-z.r,-z.r,z.r*2,z.r*2); ctx.restore(); ctx.globalAlpha=1;
        ctx.strokeStyle=`rgba(220,255,232,${.6*fade})`; ctx.lineWidth=3; ctx.lineCap='round'; for(let i=0;i<3;i++){ const a=G.t*7+i*TAU/3; ctx.beginPath(); ctx.arc(z.x,z.y-i*6,z.r*(.42+i*.2),a,a+2.2); ctx.stroke(); } break; }
      case 'trap':{ const armed=z.t>.4; ctx.strokeStyle=`rgba(255,179,92,${armed?.28:.1})`; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(z.x,z.y,z.r*.5,0,TAU); ctx.stroke(); circ(ctx,'#1e1610',z.x,z.y,8.5); circ(ctx,'#4a3a2a',z.x,z.y,7); circ(ctx,(armed&&((G.t*4)|0)%2)?'#ff4a3a':'#7a2a20',z.x,z.y,2.6);
        ctx.strokeStyle='#c9a57a'; ctx.lineWidth=2; ctx.beginPath(); for(let i=0;i<6;i++){ const a=i*TAU/6; ctx.moveTo(z.x+Math.cos(a)*7,z.y+Math.sin(a)*7); ctx.lineTo(z.x+Math.cos(a)*11,z.y+Math.sin(a)*11); } ctx.stroke();
        if(armed&&((G.t*4)|0)%2){ ctx.globalCompositeOperation='lighter'; glow(z.x,z.y,10,'#ff4a3a',.6); ctx.globalCompositeOperation='source-over'; } break; }
    }
    if(z.x2) sk2DrawZone(z,fade);                                           // zones of the character-only skills (22a)
    if(z.src&&z.src.mxLook&&typeof mxDrawZone==='function') mxDrawZone(z);   // mastery looks (26a)
  }
}
function drawStrikesUnder(){
  for(const s of G.strikes){ if(s.t>=s.delay||s.kind==='spike') continue; const k=s.t/s.delay;
    if(s.kind==='meteor'){ ctx.fillStyle=`rgba(0,0,0,${.15+.35*k})`; ctx.beginPath(); ctx.ellipse(s.x,s.y,s.r*(.3+.7*k),s.r*(.3+.7*k)*.6,0,0,TAU); ctx.fill(); }
    const col=s.kind==='meteor'||s.kind==='lava'?'255,110,50':s.kind==='arrows'?'220,240,170':'255,240,190';
    ctx.fillStyle=`rgba(${col},${.06+.14*k})`; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,TAU); ctx.fill(); ctx.strokeStyle=`rgba(${col},${.35+.4*k})`; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(s.x,s.y,s.r*k,0,TAU); ctx.stroke(); }
}
function drawStrikesOver(){
  for(const s of G.strikes){
    if(s.src&&s.src.mxLook&&typeof mxDrawStrike==='function') mxDrawStrike(s);   // mastery looks (26a)
    if(s.kind==='meteor'&&s.t<s.delay){ const k=s.t/s.delay,mx=s.x+(1-k)*220,my=s.y-(1-k)*420,rr=Math.max(6,s.r*.32),a=Math.atan2(420,-220);
      streak(mx,my,a,rr*7,rr*2.4,'#ff7a2a',.8); glow(mx,my,rr*2.6,'#ff8a3a',.9); circ(ctx,'#ffb050',mx,my,rr); circ(ctx,'#fff2c0',mx,my,rr*.5); }
    else if(s.kind==='arrows'&&s.t>=s.delay-.15&&s.done<s.hits){ ctx.strokeStyle='rgba(232,245,192,.85)'; ctx.lineWidth=1.6; ctx.beginPath(); for(let i=0;i<7;i++){ const a=(i*2.4+s.t*7)%TAU,d=s.r*((i*.37+s.t*1.3)%1),x=s.x+Math.cos(a)*d,y=s.y+Math.sin(a)*d,fall=(s.t*5+i*.3)%1; ctx.moveTo(x-3,y-44+fall*30); ctx.lineTo(x,y-30+fall*30); } ctx.stroke(); }
    else if(s.kind==='lava') sk2Lava(s);                                     // volcano bombs (22a)
  }
}
function drawItem(g){
  const b=Math.sin(G.t*4+g.x*.05)*2,x=g.x,y=g.y+b;
  ctx.globalCompositeOperation='lighter'; glow(x,y,18,g.kind==='chest'?'#f0b545':g.kind==='heart'?'#ff5a6a':'#d8e8ff',.45+.2*Math.sin(G.t*6)); ctx.globalCompositeOperation='source-over';
  switch(g.kind){
    case 'heart': ctx.fillStyle='#e04a5a'; ctx.beginPath(); ctx.moveTo(x,y+7); ctx.bezierCurveTo(x-11,y-1,x-6,y-10,x,y-4); ctx.bezierCurveTo(x+6,y-10,x+11,y-1,x,y+7); ctx.fill(); ctx.strokeStyle='#4a1018'; ctx.lineWidth=1.5; ctx.stroke(); circ(ctx,'#ffb0b8',x-3.5,y-3,1.6); break;
    case 'magnet': ctx.strokeStyle='#d8444c'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(x,y-1,6,PI,TAU,true); ctx.stroke(); ctx.fillStyle='#d9e2ef'; ctx.fillRect(x-8.5,y-3,5,4); ctx.fillRect(x+3.5,y-3,5,4); break;
    case 'bomb': circ(ctx,'#120e14',x,y+1,8.5); circ(ctx,'#2a2630',x,y+1,7.5); circ(ctx,'#4a4650',x-2.5,y-1.5,2.5); limb(ctx,'#a08a60',2,x+4,y-5,x+7,y-9); circ(ctx,(G.t*10|0)%2?'#ffd34d':'#ff7a3d',x+7.5,y-9.5,2.4); break;
    case 'chest': ctx.fillStyle='#2a160a'; rrect(ctx,x-10,y-7,20,15,3); ctx.fill(); ctx.fillStyle='#7a4a24'; rrect(ctx,x-9,y-6,18,13,2.5); ctx.fill(); ctx.fillStyle='#f0b545'; ctx.fillRect(x-9,y-1.5,18,2.6); ctx.fillRect(x-1.5,y-6,3,13); circ(ctx,'#fff2c0',x,y,1.6); break;
    default: if(ITEMKIND[g.kind]) ITEMKIND[g.kind].draw(ctx,g);
  }
}
// lane item kinds (ITEMKIND · never in classic) are drawn after the loop in two passes: all glows (+ the kind's own glow(c,g) in the
// same 'lighter' pass), then all bodies · keeps the GPU canvas batching (one blend mode, one texture per pass)
const GEM_EXT=[];
function drawItemsExt(list){   // = glow(x,y,18,'#d8e8ff',a) per item, with the texture and alpha set once for the pass
  const tex=glowTex('#d8e8ff'), t4=G.t*4; ctx.globalCompositeOperation='lighter'; ctx.globalAlpha=Math.min(1,.45+.2*Math.sin(G.t*6));
  for(const g of list) ctx.drawImage(tex,g.x-18,g.y+Math.sin(t4+g.x*.05)*2-18,36,36);
  ctx.globalAlpha=1; for(const g of list){ const k=ITEMKIND[g.kind]; if(k.glow) k.glow(ctx,g); } ctx.globalCompositeOperation='source-over';
  for(const g of list) ITEMKIND[g.kind].draw(ctx,g); }
function drawGems(L,T,R,B){
  const tiers=[[],[],[],[]],cols=['#5fd3c3','#7fe07a','#ff6a5a','#c38bff'],sz=[4,5.5,7,9],q=qLv(); GEM_EXT.length=0;
  for(const g of G.gems){ if(g.x<L||g.x>R||g.y<T||g.y>B) continue; if(g.kind==='xp') tiers[g.v<5?0:g.v<20?1:g.v<100?2:3].push(g); else if(ITEMKIND[g.kind]) GEM_EXT.push(g); else drawItem(g); }
  if(GEM_EXT.length) drawItemsExt(GEM_EXT);
  if(q>=1){ ctx.globalCompositeOperation='lighter'; for(let i=(q>=2?0:1);i<4;i++){ const tex=glowTex(cols[i]),s=sz[i]*2.4; ctx.globalAlpha=.35; for(const g of tiers[i]) ctx.drawImage(tex,g.x-s,g.y-s,s*2,s*2); } ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
  for(let i=0;i<4;i++){ const arr=tiers[i]; if(!arr.length) continue; const s=sz[i];
    ctx.fillStyle=shade(cols[i],-.55); ctx.beginPath(); for(const g of arr){ const y=g.y+Math.sin(G.t*4+g.x*.05)*1.5,o=s+1.2; ctx.moveTo(g.x,y-o); ctx.lineTo(g.x+o*.72,y); ctx.lineTo(g.x,y+o); ctx.lineTo(g.x-o*.72,y); ctx.closePath(); } ctx.fill();
    ctx.fillStyle=cols[i]; ctx.beginPath(); for(const g of arr){ const y=g.y+Math.sin(G.t*4+g.x*.05)*1.5; ctx.moveTo(g.x,y-s); ctx.lineTo(g.x+s*.7,y); ctx.lineTo(g.x,y+s); ctx.lineTo(g.x-s*.7,y); ctx.closePath(); } ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.6)'; ctx.beginPath(); for(const g of arr){ const y=g.y+Math.sin(G.t*4+g.x*.05)*1.5; ctx.moveTo(g.x,y-s); ctx.lineTo(g.x+s*.35,y-s*.2); ctx.lineTo(g.x,y); ctx.closePath(); } ctx.fill(); }
}
function drawAuras(){
  if(P.sx&&typeof mxDrawAround==='function') mxDrawAround();
  for(const s of P.skills){ if(s.def.type!=='aura') continue; const r=pv(s,'r')*P.area;
    ctx.globalCompositeOperation='lighter'; glow(P.x,P.y,r*1.05,s.def.c,.18);
    ctx.save(); ctx.translate(P.x,P.y); ctx.scale(1,.78); ctx.rotate(G.t*.6); ctx.globalAlpha=.6; ctx.drawImage(runeTex(s.def.c),-r,-r,r*2,r*2); ctx.restore(); ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over'; }
}
function drawBossTele(){
  for(const b of G.bosses){ if(b.dead||!b.ai.tele) continue; const T=b.ai.tele,k=T.t/T.dur;
    if(T.k==='circle'){ ctx.fillStyle=`rgba(216,68,76,${.1+.25*k})`; ctx.beginPath(); ctx.arc(b.x,b.y,T.r,0,TAU); ctx.fill(); ctx.strokeStyle='rgba(255,120,110,.85)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(b.x,b.y,T.r*k,0,TAU); ctx.stroke(); }
    else { ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(T.ang); ctx.fillStyle=`rgba(216,68,76,${.12+.25*k})`; ctx.fillRect(0,-b.r*.8,T.len,b.r*1.6); ctx.fillStyle='rgba(255,140,120,.75)'; ctx.fillRect(0,-b.r*.8,T.len*k,3); ctx.fillRect(0,b.r*.8-3,T.len*k,3); ctx.restore(); } }
}
function drawEnemy(e){
  const S=getSpr(e.type),dir=e.face<0?1:0,fr=(e.walk|0)&3;
  const img=e.flash>0?S.wh[dir]:S.f[dir*4+fr],sc=e.r/e.d.r,w=S.w*sc,h=S.h*sc,lift=e.d.fly?10+Math.sin(G.t*5+e.anim)*3:0,foot=e.d.r*sc*.85;
  let sx=1,sy=1; if(e.hitT>0){ const k=e.hitT/.12; sx=1+.16*k; sy=1-.12*k; } if(e.boss) sy*=1+Math.sin(G.t*2.4)*.015;
  if(e.boss){ ctx.globalCompositeOperation='lighter'; glow(e.x,e.y+foot*.6,e.r*2.1,'#d8444c',.35); ctx.globalCompositeOperation='source-over'; }
  if(e.elite){ ctx.globalCompositeOperation='lighter'; glow(e.x,e.y-e.r*.2,e.r*2.3,'#f0b545',.32+.14*Math.sin(G.t*6)); ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle=`rgba(240,181,69,${.55+.3*Math.sin(G.t*6)})`; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(e.x,e.y+foot,e.r*1.05,e.r*.4,0,0,TAU); ctx.stroke(); }
  if(e.d.phase) ctx.globalAlpha=.78;
  const dw=w*sx,dh=h*sy; ctx.drawImage(img,e.x-dw/2,e.y+foot-(h/2+foot)*sy-lift,dw,dh);
  ctx.globalAlpha=1;
  if(e.freezeT>0){ ctx.globalAlpha=.9; ctx.drawImage(iceTex(),e.x-e.r*1.3,e.y-e.r*1.55,e.r*2.6,e.r*2.6); ctx.globalAlpha=1; }
  else if(e.slowF<.95){ ctx.fillStyle='rgba(140,200,255,.16)'; ctx.beginPath(); ctx.arc(e.x,e.y-e.r*.3,e.r*.95,0,TAU); ctx.fill(); }
  if(e.stunT>0){ ctx.fillStyle='#ffe14a'; for(let i=0;i<3;i++){ const a=G.t*6+i*TAU/3; ctx.fillRect(e.x+Math.cos(a)*e.r*.7-1.5,e.y-e.r*1.7+Math.sin(a)*3-1.5,3,3); } }
  if(e.elite){ const cx=e.x,cy=e.y-e.r*1.75; ctx.fillStyle='#f0b545'; ctx.strokeStyle='#3a2408'; ctx.lineWidth=1.2; ctx.beginPath(); ctx.moveTo(cx-6,cy+3); ctx.lineTo(cx-6,cy-3); ctx.lineTo(cx-3,cy); ctx.lineTo(cx,cy-5); ctx.lineTo(cx+3,cy); ctx.lineTo(cx+6,cy-3); ctx.lineTo(cx+6,cy+3); ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if(!e.boss&&(e.elite||e.maxHp>=80)&&e.hp<e.maxHp){ const bw=e.r*1.6,by=e.y-e.r*(e.elite?2.15:1.8); ctx.fillStyle='rgba(0,0,0,.6)'; ctx.fillRect(e.x-bw/2,by,bw,3.5); ctx.fillStyle=e.elite?'#f0b545':'#d8444c'; ctx.fillRect(e.x-bw/2,by,bw*Math.max(0,e.hp/e.maxHp),3.5); }
}
function drawCorpses(){
  for(const c of G.corpses){ const S=getSpr(c.type),d=EN[c.type],img=S.f[c.face<0?4:0],k=c.t/c.dur,w=S.w*c.sc,h=S.h*c.sc,foot=d.r*c.sc*.85;
    ctx.save(); ctx.globalAlpha=k<.55?1:Math.max(0,1-(k-.55)/.45);
    if(c.mode==='fall'){ ctx.translate(c.x,c.y+foot); ctx.rotate(c.rot*Math.min(1,k*2.6)*PI/2*.95); ctx.drawImage(img,-w/2,-(h/2+foot),w,h); }
    else if(c.mode==='drop'){ ctx.translate(c.x,c.y-10+k*22); ctx.rotate(c.rot*k*2.5); ctx.drawImage(img,-w/2,-h/2,w,h); }
    else { ctx.translate(c.x,c.y-k*34); ctx.scale(1-k*.3,1+k*.3); ctx.globalAlpha*=.75; ctx.drawImage(img,-w/2,-h/2,w,h); }
    ctx.restore(); }
}
function drawPlayer(){
  let aim=P.aim; if(P.swing) aim=P.swing.a0+(P.swing.a1-P.swing.a0)*ease(Math.min(1,P.swing.t/P.swing.dur));
  const sp=Math.hypot(P.vx,P.vy);
  ctx.save(); if(P.hurtT>0&&((P.hurtT*30)|0)%2===0) ctx.globalAlpha=.65;
  const ho={lean:clamp(P.vx/Math.max(1,P.speed),-1,1)*.12,squash:P.atkT>0?P.atkT/.12*.1:0,cape:clamp(sp/Math.max(1,P.speed),0,1),tint:P.hurtT>0?'#ff3030':null,tintA:.45};
  if(P.sx&&typeof artAimMark==='function') artAimMark(ctx,P.x,P.y,P.aim);   // character runs: skills go where this points
  if(!(typeof artDrawHero==='function'&&artDrawHero(ctx,P.look,P.x,P.y,P.face,P.t,P.moving,ho))) heroOutlined(ctx,P.look,P.x,P.y,1.15,P.t,P.face,P.moving,aim,ho);
  ctx.restore();
  if(P.shield>0){ ctx.globalCompositeOperation='lighter'; glow(P.x,P.y-6,34,'#bfe6ff',.28+.1*Math.sin(G.t*6)); ctx.globalCompositeOperation='source-over'; ctx.strokeStyle='rgba(228,244,255,.85)'; ctx.lineWidth=1.6; ctx.beginPath(); ctx.arc(P.x,P.y-6,27,0,TAU); ctx.stroke(); ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=2.4; const a=G.t*3; ctx.beginPath(); ctx.arc(P.x,P.y-6,27,a,a+.7); ctx.stroke(); }
  const w=40,x=P.x-w/2,y=P.y+24; ctx.fillStyle='rgba(0,0,0,.65)'; ctx.fillRect(x-1,y-1,w+2,6); ctx.fillStyle=P.hp/P.maxHp<.3?'#ff5a5a':'#d8444c'; ctx.fillRect(x,y,w*P.hp/P.maxHp,4);
  if(P.shield>0){ ctx.fillStyle='#bfe6ff'; ctx.fillRect(x,y-4,w*Math.min(1,P.shield/P.shieldMax),2.5); }
}
// actors in depth order (by feet) · with terrain, the painted trees/rocks/mountains (29a terYList) join the same order
function drawActors(L,T,R,B){
  G.enemies.sort((a,b)=>a.y-b.y);
  const yp=G.obstacles&&typeof terYList==='function'?terYList(L,T,R,B):null; let pi=0, drawn=false;
  const upTo=y=>{ if(!yp) return; while(pi<yp.length&&yp[pi].fy<=y){ const q=yp[pi++]; if(!drawn&&P.y<q.fy){ drawPlayer(); drawn=true; } terYDraw(q); } };
  for(const e of G.enemies){ if(e.dead) continue; upTo(e.y); if(!drawn&&e.y>P.y){ drawPlayer(); drawn=true; } if(e.x<L-60||e.x>R+60||e.y<T-60||e.y>B+60) continue; drawEnemy(e); }
  upTo(Infinity); if(!drawn) drawPlayer();
}
function drawOrbits(){
  for(const s of P.skills){ if(s.def.type!=='orbit'||!s.st.pos) continue; const size=pv(s,'size')*(1+(P.area-1)*.5),R=s.st.R||pv(s,'r')*P.area;   // st.R: breathing radius (25a orbX)
    ctx.globalCompositeOperation='lighter'; ctx.lineCap='round';
    for(const p of s.st.pos){ if(!p) continue; ctx.strokeStyle=hexA(s.def.c,.16); ctx.lineWidth=size*1.1; ctx.beginPath(); ctx.arc(P.x,P.y-4,R,p[2]-.75,p[2]-.3); ctx.stroke(); ctx.strokeStyle=hexA(s.def.c,.34); ctx.lineWidth=size*.9; ctx.beginPath(); ctx.arc(P.x,P.y-4,R,p[2]-.32,p[2]); ctx.stroke(); }
    if(s.def.os==='orb') for(const p of s.st.pos){ if(!p) continue; glow(p[0],p[1],size*2.4,s.def.c,.75); circ(ctx,s.def.c,p[0],p[1],size); circ(ctx,'#ffffff',p[0]-size*.25,p[1]-size*.25,size*.38); }
    ctx.globalCompositeOperation='source-over';
    if(s.def.os==='blade') for(const p of s.st.pos){ if(!p) continue; ctx.save(); ctx.translate(p[0],p[1]); ctx.rotate(p[2]);
      ctx.fillStyle='#16202c'; ctx.beginPath(); ctx.moveTo(-size-1.5,-3.6); ctx.lineTo(size*.8,-3.6); ctx.lineTo(size*1.4,0); ctx.lineTo(size*.8,3.6); ctx.lineTo(-size-1.5,3.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle=s.evolved?'#fff2c0':s.def.c; ctx.beginPath(); ctx.moveTo(-size,-2.2); ctx.lineTo(size*.8,-2.2); ctx.lineTo(size*1.25,0); ctx.lineTo(size*.8,2.2); ctx.lineTo(-size,2.2); ctx.closePath(); ctx.fill(); ctx.fillStyle='rgba(255,255,255,.7)'; ctx.fillRect(-size*.6,-1.4,size*1.2,.9); ctx.fillStyle='#c9a24a'; ctx.fillRect(-size-1,-4.5,3,9); ctx.restore(); }
    if(s.def.ox) sk2DrawOrbit(s,size); }                                     // orbit styles of the character-only skills (22a)
}
function drawHawk(u){ const flap=Math.sin(G.t*18+u.a)*.6; ctx.fillStyle='rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(u.x,u.y+22,7,2.5,0,0,TAU); ctx.fill();
  if(u.state===1){ ctx.globalCompositeOperation='lighter'; streak(u.x,u.y,u.ang,40,10,'#ffd9a0',.6); ctx.globalCompositeOperation='source-over'; }
  ctx.save(); ctx.translate(u.x,u.y); ctx.rotate(u.ang||0); ctx.lineJoin='round'; ctx.strokeStyle='#2a1a0e'; ctx.lineWidth=2;
  ctx.fillStyle='#b07a40'; ctx.beginPath(); ctx.moveTo(-1,0); ctx.lineTo(-6,-13-flap*6); ctx.lineTo(5,-2); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-1,0); ctx.lineTo(-6,13+flap*6); ctx.lineTo(5,2); ctx.closePath(); ctx.stroke(); ctx.fill();
  ctx.fillStyle='#8a5a30'; ctx.beginPath(); ctx.ellipse(0,0,9,4,0,0,TAU); ctx.stroke(); ctx.fill(); ctx.beginPath(); ctx.moveTo(-8,0); ctx.lineTo(-13,-3); ctx.lineTo(-13,3); ctx.closePath(); ctx.fill(); circ(ctx,'#efe4cc',8,0,3.4); circ(ctx,'#1a1410',9,-1,.9); ctx.fillStyle='#f0b545'; ctx.beginPath(); ctx.moveTo(11,-1); ctx.lineTo(14.5,0); ctx.lineTo(11,1.5); ctx.closePath(); ctx.fill(); ctx.restore(); }
function drawUnits(){ for(const s of P.skills){ if(s.def.type!=='summon'||!s.st.units) continue; for(const u of s.st.units){ if(s.def.mode==='hawk') drawHawk(u); else { ctx.save(); ctx.globalAlpha=.6; if(!(typeof artDrawHero==='function'&&artDrawHero(ctx,P.look,u.x,u.y,u.face||1,G.t+(u.a||0),true,{}))) heroOutlined(ctx,CLONE_LOOK,u.x,u.y,1,G.t,u.face||1,true,u.aim||0,{outline:'#9a7dff',seed:u.a}); ctx.restore(); } } } }
function drawProjs(){
  for(const p of G.projs){
    const sp=Math.hypot(p.vx,p.vy),a=Math.atan2(p.vy,p.vx);
    if(p.mx&&mxDrawProj(p,sp,a)) continue;                                  // mastery look (26a)
    if(sk2DrawProj(p,sp,a)) continue;                                       // shapes of the character-only skills (22a)
    switch(p.shape){
      case 'arrow': streak(p.x,p.y,a,Math.min(55,sp*.05),5,p.c,.45); break;
      case 'dagger': streak(p.x,p.y,a,30,5,p.c,.35); break;
      case 'spear': streak(p.x,p.y,a,80,p.r*1.8,p.c,.6); break;
      case 'fire': streak(p.x,p.y,a,46,p.r*3,'#ff6a2a',.75); glow(p.x,p.y,p.r*3.2,'#ff8a3a',.85); break;
      case 'holy': glow(p.x,p.y,p.r*2.8,p.c,.8); streak(p.x,p.y,a,30,p.r*2,p.c,.35); break;
      case 'beam': streak(p.x,p.y,a,150,12,p.c,.9); break;
      case 'crescent': glow(p.x,p.y,p.r*1.4,p.c,.4*Math.min(1,p.life/p.max*2)); break;
      default: streak(p.x,p.y,a,sp*.06,p.r*3,p.c,.7); glow(p.x,p.y,p.r*2.8,p.c,.85);
    }
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(a);
    switch(p.shape){
      case 'arrow': ctx.strokeStyle=p.c; ctx.lineWidth=2.2; ctx.beginPath(); ctx.moveTo(-15,0); ctx.lineTo(5,0); ctx.stroke(); ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(9,0); ctx.lineTo(3,-3.6); ctx.lineTo(3,3.6); ctx.closePath(); ctx.fill(); ctx.fillRect(-16,-3.2,4,2); ctx.fillRect(-16,1.2,4,2); break;
      case 'dagger': ctx.rotate(p.t*30); ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(9,0); ctx.lineTo(-1,-2.8); ctx.lineTo(-1,2.8); ctx.closePath(); ctx.fill(); ctx.fillStyle='#8a7a6a'; ctx.fillRect(-6,-1.4,5,2.8); break;
      case 'spear': ctx.fillStyle='#b08a5a'; ctx.fillRect(-30,-1.8,30,3.6); ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(15,0); ctx.lineTo(0,-5.5); ctx.lineTo(0,5.5); ctx.closePath(); ctx.fill(); break;
      case 'fire':{ const f=1+.15*Math.sin(p.t*40); circ(ctx,p.c,0,0,p.r*f); circ(ctx,'#ffe28a',1,0,p.r*.55); break; }
      case 'holy':{ ctx.rotate(p.t*5); ctx.fillStyle=p.c; ctx.beginPath(); for(let i=0;i<8;i++){ const rr=i%2?p.r*.4:p.r*1.3,aa=i*PI/4; ctx.lineTo(Math.cos(aa)*rr,Math.sin(aa)*rr); } ctx.closePath(); ctx.fill(); circ(ctx,'#ffffff',0,0,p.r*.35); break; }
      case 'beam': ctx.fillStyle='#ffffff'; ctx.fillRect(-70,-1.3,82,2.6); break;
      case 'crescent': ctx.globalAlpha=Math.min(1,p.life/p.max*2); ctx.strokeStyle=p.c; ctx.lineWidth=7; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(-p.r*.4,0,p.r,-1.1,1.1); ctx.stroke(); ctx.lineWidth=2; ctx.strokeStyle='#ffffff'; ctx.stroke(); break;
      default: circ(ctx,p.c,0,0,p.r); circ(ctx,'#ffffff',0,0,p.r*.45);
    }
    ctx.restore();
  }
}
function drawEProjs(){ for(const b of G.eprojs){ if(b.kind==='bone'){ ctx.save(); ctx.translate(b.x,b.y); ctx.rotate(b.rot); ctx.fillStyle='#2a2620'; ctx.fillRect(-7,-2.5,14,5); circ(ctx,'#2a2620',-6,0,3.4); circ(ctx,'#2a2620',6,0,3.4); ctx.fillStyle='#ece6d4'; ctx.fillRect(-6,-1.5,12,3); circ(ctx,'#ece6d4',-6,0,2.4); circ(ctx,'#ece6d4',6,0,2.4); ctx.restore(); }
  else { ctx.globalCompositeOperation='lighter'; glow(b.x,b.y,b.r*2.6,'#a46bff',.75); ctx.globalCompositeOperation='source-over'; circ(ctx,'#c39cff',b.x,b.y,b.r); circ(ctx,'#2a1440',b.x,b.y,b.r*.45); } } }
function boltPaths(f){ const out=[]; for(let i=0;i<f.pts.length-1;i++){ const A=f.pts[i],B=f.pts[i+1],path=[A]; for(let j=1;j<5;j++){ const t=j/5; path.push([A[0]+(B[0]-A[0])*t+rand(-9,9),A[1]+(B[1]-A[1])*t+rand(-9,9)]); } path.push(B); out.push(path);
    if(Math.random()<.6){ const m=path[2],ang=Math.atan2(B[1]-A[1],B[0]-A[0])+rand(-1.2,1.2),len=rand(18,40),fork=[m]; for(let j=1;j<=3;j++) fork.push([m[0]+Math.cos(ang)*len*j/3+rand(-5,5),m[1]+Math.sin(ang)*len*j/3+rand(-5,5)]); out.push(fork); } } return out; }
const SOLID_FX={spike:1,after:1};
function drawFx(solid){
  for(const f of G.fx){
    if(!!SOLID_FX[f.k]!==solid) continue;
    const k=f.t/f.dur,x=f.follow?P.x:f.x,y=f.follow?P.y-4:f.y;
    switch(f.k){
      case 'slash':{ const fade=Math.max(0,1-k);
        if(f.arc>=6){ ctx.globalAlpha=fade; ctx.fillStyle=hexA(f.c,.55); ctx.beginPath(); ctx.arc(x,y,f.r,0,TAU); ctx.arc(x,y,f.r*.66,0,TAU,true); ctx.fill('evenodd'); ctx.strokeStyle='#ffffff'; ctx.lineWidth=2.5; ctx.lineCap='round'; const st=f.t*30; for(let i=0;i<3;i++){ ctx.beginPath(); ctx.arc(x,y,f.r*.86,st+i*TAU/3,st+i*TAU/3+1); ctx.stroke(); } ctx.globalAlpha=1; }
        else { const dir=f.flip?-1:1,sw=ease(Math.min(1,k*2.4)),aS=f.a-dir*f.arc/2,lead=aS+dir*f.arc*sw,tail=aS+dir*f.arc*Math.max(0,sw-.65),lo=Math.min(lead,tail),hi=Math.max(lead,tail);
          if(hi-lo>.01){ ctx.globalAlpha=fade; ctx.fillStyle=hexA(f.c,.6); ctx.beginPath(); ctx.arc(x,y,f.r,lo,hi); ctx.arc(x,y,f.r*.5,hi,lo,true); ctx.closePath(); ctx.fill(); ctx.strokeStyle='#ffffff'; ctx.lineWidth=3; ctx.lineCap='round'; ctx.beginPath(); ctx.arc(x,y,f.r*.94,lo,hi); ctx.stroke(); ctx.globalAlpha=1; }
          glow(x+Math.cos(lead)*f.r*.9,y+Math.sin(lead)*f.r*.9,14,'#ffffff',fade*.8); }
        break; }
      case 'ring':{ const r=f.r0+(f.r1-f.r0)*ease(k); ctx.globalAlpha=1-k; ctx.strokeStyle=f.c; ctx.lineWidth=Math.max(1,f.w*(1-k)); ctx.beginPath(); ctx.arc(x,y,Math.max(0,r),0,TAU); ctx.stroke(); ctx.globalAlpha=1; break; }
      case 'boom':{ const r=f.r*(.45+.75*ease(k)); glow(x,y,r*1.5,f.c,(1-k)*.95); if(k<.3) glow(x,y,r*.8,'#ffffff',(1-k/.3)*.9); break; }
      case 'chain':{ if(!f.paths||G.t-f.jt>.05){ f.paths=boltPaths(f); f.jt=G.t; } ctx.lineCap='round'; ctx.lineJoin='round';
        for(const q of [[9,.22],[2.6,1]]){ ctx.strokeStyle=q[0]>5?f.c:'#ffffff'; ctx.lineWidth=q[0]; ctx.globalAlpha=(1-k)*q[1]; ctx.beginPath(); for(const path of f.paths){ ctx.moveTo(path[0][0],path[0][1]); for(let j=1;j<path.length;j++) ctx.lineTo(path[j][0],path[j][1]); } ctx.stroke(); }
        ctx.globalAlpha=1; for(let i=1;i<f.pts.length;i++) glow(f.pts[i][0],f.pts[i][1],20,f.c,(1-k)*.8); break; }
      case 'xcut':{ ctx.globalAlpha=1-k; ctx.strokeStyle=f.c; ctx.lineWidth=4*(1-k)+1; ctx.lineCap='round'; const r=f.r; ctx.beginPath(); ctx.moveTo(x-r,y-r); ctx.lineTo(x+r,y+r); ctx.moveTo(x+r,y-r); ctx.lineTo(x-r,y+r); ctx.stroke(); ctx.globalAlpha=1; glow(x,y,r*1.2,f.c,(1-k)*.6); break; }
      case 'dash':{ ctx.globalAlpha=(1-k)*.8; ctx.strokeStyle=f.c; ctx.lineWidth=3; ctx.lineCap='round'; ctx.lineJoin='round'; ctx.beginPath(); ctx.moveTo(f.pts[0][0],f.pts[0][1]); for(let i=1;i<f.pts.length;i++) ctx.lineTo(f.pts[i][0],f.pts[i][1]); ctx.stroke(); ctx.globalAlpha=1; break; }
      case 'pillar':{ const w=f.r*(1-k*.4); ctx.globalAlpha=1-k; ctx.drawImage(glowTex(f.c),x-w,y-300,w*2,320); ctx.drawImage(glowTex('#ffffff'),x-w*.35,y-260,w*.7,270); ctx.globalAlpha=1; glow(x,y,f.r*1.6,f.c,(1-k)*.8); break; }
      case 'cross':{ ctx.globalAlpha=1-k; ctx.fillStyle=f.c; const L2=f.r*1.3,w=Math.max(2,f.r*.3*(1-k*.4)); ctx.fillRect(x-w/2,y-L2,w,L2*2); ctx.fillRect(x-L2*.8,y-L2*.35-w/2,L2*1.6,w); ctx.globalAlpha=1; glow(x,y,f.r*1.4,f.c,(1-k)*.7); ctx.globalAlpha=(1-k)*.6; ctx.drawImage(glowTex(f.c),x-w*1.4,y-220,w*2.8,230); ctx.globalAlpha=1; break; }
      case 'arrowhit':{ ctx.globalAlpha=1-k; ctx.strokeStyle=f.c; ctx.lineWidth=1.5; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x-2,y-12); ctx.stroke(); ctx.globalAlpha=1; break; }
      case 'beamline':{ ctx.save(); ctx.translate(x,y); ctx.rotate(f.a); ctx.globalAlpha=1-k; ctx.drawImage(glowTex(f.c),0,-8*(1-k)-2,f.len,16*(1-k)+4); ctx.fillStyle='#ffffff'; ctx.fillRect(0,-1,f.len,2); ctx.restore(); ctx.globalAlpha=1; break; }
      case 'lvup':{ const a=1-k; ctx.globalAlpha=a*.7; ctx.drawImage(glowTex('#f0b545'),x-24,y-220+k*40,48,240); ctx.globalAlpha=1; ctx.strokeStyle=`rgba(240,181,69,${a})`; ctx.lineWidth=3; ctx.beginPath(); ctx.ellipse(x,y+14-k*40,20+k*16,7+k*6,0,0,TAU); ctx.stroke(); break; }
      case 'spike':{ const h=f.r*1.5*(k<.2?k/.2:1-(k-.2)/.8*.9); ctx.fillStyle='#2a2016'; ctx.beginPath(); ctx.moveTo(x-f.r*.65,y+5); ctx.lineTo(x-f.r*.1,y-h-2); ctx.lineTo(x+f.r*.65,y+5); ctx.closePath(); ctx.fill(); ctx.fillStyle='#8a6e4e'; ctx.beginPath(); ctx.moveTo(x-f.r*.55,y+4); ctx.lineTo(x-f.r*.1,y-h); ctx.lineTo(x+f.r*.55,y+4); ctx.closePath(); ctx.fill(); ctx.fillStyle='#c9a57a'; ctx.beginPath(); ctx.moveTo(x-f.r*.1,y-h); ctx.lineTo(x+f.r*.55,y+4); ctx.lineTo(x+f.r*.1,y+4); ctx.closePath(); ctx.fill(); break; }
      case 'after':{ ctx.save(); ctx.globalAlpha=(1-k)*.45; heroOutlined(ctx,P.look,f.x,f.y,1.15,P.t,P.face,false,P.aim,{outline:'#a58bff',noShadow:true}); ctx.restore(); break; }
    }
  }
}
function drawParts(add){
  ctx.lineCap='round';
  for(const p of G.parts){ if(!!p.add!==add) continue; const a=(p.a||1)*(1-p.t/p.life); if(a<=0) continue; ctx.globalAlpha=a; ctx.fillStyle=p.c;
    switch(p.k){
      case 'streak':{ const sp=Math.hypot(p.vx,p.vy)||1,l=Math.min(16,sp*.04)+2; ctx.strokeStyle=p.c; ctx.lineWidth=p.s; ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x-p.vx/sp*l,p.y-p.vy/sp*l); ctx.stroke(); break; }
      case 'puff': ctx.beginPath(); ctx.arc(p.x,p.y,Math.max(0,p.s),0,TAU); ctx.fill(); break;
      case 'rock': ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot||0); ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s); ctx.restore(); break;
      case 'shard': ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot||0); ctx.beginPath(); ctx.moveTo(p.s,0); ctx.lineTo(-p.s*.6,-p.s*.4); ctx.lineTo(-p.s*.6,p.s*.4); ctx.closePath(); ctx.fill(); ctx.restore(); break;
      case 'plus': ctx.fillRect(p.x-p.s,p.y-p.s*.3,p.s*2,p.s*.6); ctx.fillRect(p.x-p.s*.3,p.y-p.s,p.s*.6,p.s*2); break;
      default: ctx.fillRect(p.x-p.s/2,p.y-p.s/2,p.s,p.s);
    } }
  ctx.globalAlpha=1;
}
function drawTexts(){
  for(const t of G.texts){ const k=t.t/.8; ctx.globalAlpha=k<.7?1:1-(k-.7)/.3; const pop=t.big?1+Math.max(0,.18-t.t)*3:1+Math.max(0,.1-t.t)*3;
    if(t.k) drawNum(t.s,t.x,t.y,t.k,pop); else { const tt=textTex(t.s,t.c,t.big); ctx.drawImage(tt.c,t.x-tt.w*pop/2,t.y-tt.h*pop/2,tt.w*pop,tt.h*pop); } }
  ctx.globalAlpha=1;
}
function drawFog(){ if(qLv()<2) return; const tex=fogTex(),S=Math.max(W,H)*.9,tt=G?G.t:titleT; ctx.globalAlpha=.55;
  for(let i=0;i<4;i++){ const span=W+S,px=((i*0.37*span-cam.x*ZOOM*.35+tt*(10+i*4))%span+span)%span-S/2,py=H*(.15+.25*i)+Math.sin(tt*.2+i)*30-((cam.y*ZOOM*.35)%H); ctx.drawImage(tex,px-S/2,(py%(H+S))-S/2,S,S*.6); } ctx.globalAlpha=1; }
function drawScreenFx(){
  const hpR=P.hp/P.maxHp; let a=G.hurtFlash*1.4; if(hpR<.3&&!G.over) a=Math.max(a,(.25+.15*Math.sin(G.t*6))*(1-hpR/.3));
  if(a>0){ const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.hypot(W,H)*.55); g.addColorStop(0,'rgba(216,68,76,0)'); g.addColorStop(1,`rgba(216,68,76,${Math.min(.7,a)})`); ctx.fillStyle=g; ctx.fillRect(0,0,W,H); }
  if(G.flash>0){ ctx.fillStyle=`rgba(255,250,230,${Math.min(.8,G.flash*2)})`; ctx.fillRect(0,0,W,H); }
  for(const b of G.bosses){ if(b.dead) continue; const sx=(b.x-cam.x)*ZOOM+W/2,sy=(b.y-cam.y)*ZOOM+H/2; if(sx>-10&&sx<W+10&&sy>-10&&sy<H+10) continue; const cx=clamp(sx,36,W-36),cy=clamp(sy,120,H-90),an=Math.atan2(sy-H/2,sx-W/2);
    ctx.save(); ctx.translate(cx,cy); ctx.rotate(an); ctx.fillStyle='#d8444c'; ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(-8,-12); ctx.lineTo(-8,12); ctx.closePath(); ctx.fill(); ctx.restore(); }
  if(G.hordeWarn){ const h=G.hordeWarn,cx=W/2+Math.cos(h.a)*(W/2-40),cy=H/2+Math.sin(h.a)*(H/2-60),ex=clamp(cx,40,W-40),ey=clamp(cy,120,H-90); ctx.save(); ctx.globalAlpha=.5+.5*Math.sin(G.t*14); ctx.translate(ex,ey); ctx.rotate(h.a); ctx.strokeStyle='#ff6a5a'; ctx.lineWidth=5; ctx.lineCap='round'; ctx.lineJoin='round';
    for(let i=0;i<3;i++){ ctx.beginPath(); ctx.moveTo(-6-i*12,-12); ctx.lineTo(6-i*12,0); ctx.lineTo(-6-i*12,12); ctx.stroke(); } ctx.restore(); }
  if(joy.on){ ctx.strokeStyle='rgba(239,228,204,.35)'; ctx.lineWidth=2; ctx.fillStyle='rgba(239,228,204,.07)'; ctx.beginPath(); ctx.arc(joy.ox,joy.oy,56,0,TAU); ctx.fill(); ctx.stroke(); circ(ctx,'rgba(239,228,204,.32)',joy.ox+joy.dx*56,joy.oy+joy.dy*56,24); }
}
function renderTitleBg(){
  ctx.fillStyle='#151b12'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.translate(W/2,H/2); ctx.scale(ZOOM,ZOOM); const cx=titleT*18,cy=titleT*9; ctx.translate(-cx,-cy);
  if(typeof artGround==='function') artGround(cx-VW/2-60,cy-VH/2-60,cx+VW/2+60,cy+VH/2+60,'gr_grave'); else { ctx.fillStyle=groundPat; ctx.fillRect(cx-VW/2-60,cy-VH/2-60,VW+120,VH+120); }
  drawProps(cx-VW/2-60,cy-VH/2-60,cx+VW/2+60,cy+VH/2+60); ctx.restore();
  drawFog(); ctx.drawImage(vig,0,0,W,H);
}
function render(){
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.globalCompositeOperation='source-over'; ctx.globalAlpha=1;
  if(!G){ renderTitleBg(); return; }
  let sx=0,sy=0; if(G.shake>0&&!REDUCED){ sx=rand(-1,1)*G.shake; sy=rand(-1,1)*G.shake; }
  ctx.fillStyle='#151b12'; ctx.fillRect(0,0,W,H);
  ctx.save(); ctx.translate(W/2,H/2); ctx.scale(ZOOM,ZOOM); ctx.translate(-cam.x+sx,-cam.y+sy);
  const L=cam.x-VW/2-80,T=cam.y-VH/2-80,R=cam.x+VW/2+80,B=cam.y+VH/2+80,M=G.mode;   // M.draw*: optional mode layers (none in classic)
  if(M.drawGround) M.drawGround(L,T,R,B); else { if(typeof artGround==='function') artGround(L,T,R,B); else { ctx.fillStyle=groundPat; ctx.fillRect(L,T,R-L,B-T); } drawProps(L,T,R,B); }
  drawDecals(L,T,R,B); if(M.drawWorld) M.drawWorld(L,T,R,B);
  drawZones(); drawStrikesUnder(); drawAuras(); drawGems(L,T,R,B); drawBossTele();
  drawFx(true); drawCorpses();
  drawActors(L,T,R,B); if(M.drawOver) M.drawOver(L,T,R,B);
  drawOrbits(); drawUnits();
  drawParts(false);
  ctx.globalCompositeOperation='lighter';
  drawProjs(); drawFx(false); drawParts(true); drawStrikesOver();
  ctx.globalCompositeOperation='source-over';
  drawEProjs(); drawTexts();
  ctx.restore();
  drawFog(); ctx.drawImage(vig,0,0,W,H);
  drawScreenFx(); if(M.drawScreen) M.drawScreen();
}

