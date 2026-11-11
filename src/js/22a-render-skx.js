/* ================= 22a-render-skx.js · lane B · how the 30 character-only skills look (25a · CLASSES skx) ================= */
// Called from the shared draw passes only for what these skills create (projectile shapes in SKX_SHAPE, zones with x2, the
// summon modes / orbit styles they add) → classic frames draw exactly as before. Canvas only, no RNG, no game state changes.
const SKX_SHAPE={gsword:1, axe:1};
// drawProjs (22, 'lighter' pass) → true = drawn here
function sk2DrawProj(p,sp,a){ if(!SKX_SHAPE[p.shape]) return false; const r=p.r;
  ctx.globalCompositeOperation='source-over'; ctx.save(); ctx.translate(p.x,p.y);
  if(p.shape==='gsword'){ ctx.rotate(p.t*15); const L=r*1.9;            // a spinning greatsword: dark edge, bright blade, gold guard
    ctx.fillStyle='#14202c'; ctx.beginPath(); ctx.moveTo(-L*.45,-4.2); ctx.lineTo(L*.85,-4.2); ctx.lineTo(L*1.12,0); ctx.lineTo(L*.85,4.2); ctx.lineTo(-L*.45,4.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(-L*.42,-2.8); ctx.lineTo(L*.84,-2.8); ctx.lineTo(L*1.04,0); ctx.lineTo(L*.84,2.8); ctx.lineTo(-L*.42,2.8); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.75)'; ctx.fillRect(-L*.3,-1.6,L*1,1); ctx.fillStyle='#c9a24a'; ctx.fillRect(-L*.48,-6,4,12); ctx.fillStyle='#5a3a1e'; ctx.fillRect(-L*.78,-1.8,L*.3,3.6); }
  else if(p.shape==='axe'){ ctx.restore(); ctx.strokeStyle='rgba(150,140,130,.75)'; ctx.lineWidth=2; ctx.setLineDash([5,4]); ctx.beginPath(); ctx.moveTo(P.x,P.y-8); ctx.lineTo(p.x,p.y); ctx.stroke(); ctx.setLineDash([]);   // the chain back to the hand
    ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.t*18); ctx.fillStyle='#5a3a1e'; ctx.fillRect(-r*1.3,-1.6,r*2.2,3.2);
    ctx.fillStyle='#2a2622'; ctx.beginPath(); ctx.moveTo(r*.5,-1); ctx.quadraticCurveTo(r*1.6,-r*1.4,r*1.2,-r*.2); ctx.lineTo(r*1.2,r*.2); ctx.quadraticCurveTo(r*1.6,r*1.4,r*.5,1); ctx.closePath(); ctx.fill();
    ctx.fillStyle=p.c; ctx.beginPath(); ctx.moveTo(r*.6,-1); ctx.quadraticCurveTo(r*1.45,-r*1.15,r*1.1,-r*.15); ctx.lineTo(r*1.1,r*.15); ctx.quadraticCurveTo(r*1.45,r*1.15,r*.6,1); ctx.closePath(); ctx.fill(); }
  ctx.restore(); ctx.globalCompositeOperation='lighter';
  glow(p.x,p.y,r*(p.shape==='gsword'?2.6:1.8),p.c,.35); return true; }
// drawZones (22) → zones with x2
function sk2DrawZone(z,fade){
  if(z.kind==='palisade'){ const n=12, up=Math.min(1,z.t*6), R=z.r;          // a ring of spear tips pointing out, popping up at the start
    ctx.strokeStyle=`rgba(232,217,168,${.35*fade})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(z.x,z.y,R,R*.8,0,0,TAU); ctx.stroke();
    for(let i=0;i<n;i++){ const a=i*TAU/n+z.seed, cx=z.x+Math.cos(a)*R, cy=z.y+Math.sin(a)*R*.8, h=(10+6*up)*fade;
      ctx.save(); ctx.translate(cx,cy); ctx.rotate(a); ctx.globalAlpha=fade; ctx.fillStyle='#6b4a2a'; ctx.fillRect(-8,-1.6,10,3.2);
      ctx.fillStyle='#e8e2d0'; ctx.beginPath(); ctx.moveTo(2,-4); ctx.lineTo(2+h,0); ctx.lineTo(2,4); ctx.closePath(); ctx.fill(); ctx.restore(); }
    ctx.globalAlpha=1; } }
