/* ================= hero drawing ================= */
function drawHat(c,L,t){
  if(HAT_EXT[L.hat]) return HAT_EXT[L.hat](c,L,t);
  const C=L.hatC;
  if(L.hat==='helm'){
    c.fillStyle=C; c.beginPath(); c.arc(1,-15,11.6,PI,TAU); c.lineTo(12.6,-12); c.lineTo(-10.6,-12); c.closePath(); c.fill();
    c.fillStyle=shade(C,.3); c.beginPath(); c.arc(-2,-19,4,PI*1.1,PI*1.6); c.lineTo(-2,-19); c.fill();
    c.fillStyle=shade(C,-.3); c.fillRect(-10.6,-13.4,23.2,2.4);
    c.fillStyle=C; c.fillRect(-10.6,-12,4.5,8);
    if(L.orn==='plume'){ c.strokeStyle=L.ornC; c.lineWidth=4.5; c.lineCap='round'; c.beginPath(); c.moveTo(1,-26); c.quadraticCurveTo(-7,-35-Math.sin(t*6)*1.2,-17,-27); c.stroke(); }
    else if(L.orn==='horns'){ c.fillStyle=L.ornC; c.beginPath(); c.moveTo(-7,-23); c.quadraticCurveTo(-16,-28,-15,-38); c.quadraticCurveTo(-11,-29,-3,-25); c.closePath(); c.fill(); c.beginPath(); c.moveTo(7,-24); c.quadraticCurveTo(15,-30,17,-39); c.quadraticCurveTo(15,-29,10,-21); c.closePath(); c.fill(); }
    else if(L.orn==='cross'){ c.fillStyle=L.ornC; c.fillRect(5.5,-23,2.6,10); c.fillRect(2.5,-19.5,8.6,2.6); }
  } else if(L.hat==='wizard'){
    c.fillStyle=shade(C,-.25); c.beginPath(); c.ellipse(1,-20,15.5,4.2,0,0,TAU); c.fill();
    const sw=Math.sin(t*2)*1.5; c.fillStyle=C; c.beginPath(); c.moveTo(-9,-21); c.quadraticCurveTo(-3,-34,-13+sw,-45); c.quadraticCurveTo(4,-36,11,-21); c.closePath(); c.fill();
    c.fillStyle=shade(C,.18); c.beginPath(); c.moveTo(-6,-22); c.quadraticCurveTo(-3,-31,-11+sw,-42); c.quadraticCurveTo(-2,-32,-2,-22); c.closePath(); c.fill();
    c.fillStyle=L.trim; c.fillRect(-8.6,-24.5,19,3);
    if(L.orn==='star') star(c,-1,-32,4.5,L.ornC); else if(L.orn==='gem') circ(c,L.ornC,0,-30,3.2);
  } else if(L.hat==='cap'){
    c.fillStyle=C; c.beginPath(); c.ellipse(0,-19,11.6,7.5,0,PI,TAU); c.closePath(); c.fill(); c.fillRect(1,-20.5,13.5,2.6);
    c.fillStyle=shade(C,.2); c.fillRect(-6,-25,6,2);
    if(L.orn==='feather'){ c.strokeStyle=L.ornC; c.lineWidth=2.6; c.lineCap='round'; c.beginPath(); c.moveTo(-5,-24); c.quadraticCurveTo(-13,-35-Math.sin(t*5),-21,-31); c.stroke(); }
  } else if(L.hat==='hood'){
    c.fillStyle=C; c.beginPath(); c.arc(0,-15,12.2,PI*1.03,PI*1.97); c.lineTo(10,-18); c.quadraticCurveTo(2,-21,-10,-17); c.closePath(); c.fill();
    if(L.orn==='mitre'){ c.fillStyle=C; c.beginPath(); c.moveTo(-6,-24); c.lineTo(-6,-33); c.quadraticCurveTo(1,-43,8,-33); c.lineTo(8,-24); c.closePath(); c.fill(); c.fillStyle=L.ornC; c.fillRect(0,-37,2.4,10); c.fillRect(-2.4,-33.5,7.2,2.4); }
  } else if(L.hat==='bandana'){
    c.fillStyle=C; c.fillRect(-10,-22,21,5); const fl=Math.sin(t*9)*2; c.beginPath(); c.moveTo(-9,-21); c.lineTo(-19,-24+fl); c.lineTo(-17,-17+fl); c.closePath(); c.fill();
  }
  if(L.orn==='mask'){ c.fillStyle=L.ornC; c.beginPath(); c.moveTo(1,-11.5); c.lineTo(11,-11.5); c.lineTo(10,-6); c.lineTo(2,-5); c.closePath(); c.fill(); }
}
function drawWeapon(c,L,a,face){
  if(WEAPON_EXT[L.weapon]) return WEAPON_EXT[L.weapon](c,L,a,face);
  c.save(); c.translate(face*3,-2); c.rotate(a); const C=L.wc||'#dddddd',sk=L.skin||'#ffdcbc';
  // refined gear: L.glow 1 = soft glow, 2 = aura (drawn on c — glow() itself only paints the main ctx) · heroOutlined adds it itself
  if(L.glow&&!HERO_GLOW.on) heroGlow(c,L,'lighter');
  switch(L.weapon){
    case 'sword': c.fillStyle='#6b4a2b'; c.fillRect(3,-1.6,7,3.2); c.fillStyle='#d4a940'; c.fillRect(9.5,-5,2.6,10); c.fillStyle=C; c.beginPath(); c.moveTo(12,-2.3); c.lineTo(29,-1.5); c.lineTo(32.5,0); c.lineTo(29,1.5); c.lineTo(12,2.3); c.closePath(); c.fill(); c.fillStyle='rgba(255,255,255,.6)'; c.fillRect(13,-1.2,15,.9); break;
    case 'lance': c.fillStyle='#7a5434'; c.fillRect(-8,-1.7,38,3.4); c.fillStyle=C; c.beginPath(); c.moveTo(29,-4.5); c.lineTo(44,0); c.lineTo(29,4.5); c.closePath(); c.fill(); c.fillStyle='#d9e2ef'; c.beginPath(); c.moveTo(4,-6); c.lineTo(12,-2); c.lineTo(12,2); c.lineTo(4,6); c.closePath(); c.fill(); break;
    case 'axe': c.fillStyle='#5a3a22'; c.fillRect(2,-1.7,27,3.4); c.fillStyle=C; c.beginPath(); c.moveTo(20,-2); c.quadraticCurveTo(25,-15,33,-11); c.lineTo(29,0); c.lineTo(33,11); c.quadraticCurveTo(25,15,20,2); c.closePath(); c.fill(); c.fillStyle='rgba(255,255,255,.5)'; c.fillRect(29,-8,1.4,6); break;
    case 'staff': c.fillStyle='#6b4a2b'; c.fillRect(-4,-1.6,30,3.2); c.save(); c.globalAlpha*=.35; circ(c,C,30,0,8); c.restore(); circ(c,C,30,0,4.2); circ(c,'#ffffff',31,-1,1.4); break;
    case 'rod': c.fillStyle='#8a6a3a'; c.fillRect(-2,-1.5,24,3); c.fillStyle=C; c.fillRect(22,-6.5,3,13); c.fillRect(19,-1.5,11,3); break;
    case 'bow': case 'longbow': { const R=L.weapon==='bow'?13:17; c.strokeStyle=C; c.lineWidth=2.6; c.beginPath(); c.arc(6,0,R,-1.2,1.2); c.stroke(); c.strokeStyle='rgba(240,236,220,.8)'; c.lineWidth=1; c.beginPath(); c.moveTo(6+R*Math.cos(-1.2),R*Math.sin(-1.2)); c.lineTo(6+R*Math.cos(1.2),R*Math.sin(1.2)); c.stroke(); break; }
    case 'dagger': c.fillStyle='#4a3a30'; c.fillRect(4,-1.4,5,2.8); c.fillStyle='#c9a24a'; c.fillRect(8.5,-3.2,1.8,6.4); c.fillStyle=C; c.beginPath(); c.moveTo(10.3,-2); c.lineTo(21,0); c.lineTo(10.3,2); c.closePath(); c.fill(); break;
    case 'twinblade': c.fillStyle=C; for(const o of [-3.2,3.2]){ c.beginPath(); c.moveTo(8,o-1.6); c.lineTo(24,o); c.lineTo(8,o+1.6); c.closePath(); c.fill(); } c.fillStyle='#4a3a30'; c.fillRect(5,-5,3,10); break;
    case 'fist': circ(c,C,12,0,5); circ(c,'#ffffff',13.5,-1.5,1.4); break;
  }
  if(L.weapon!=='fist') circ(c,sk,5.5,0,2.6);
  c.restore();
}
function drawHero(c,L,x,y,sc,t,face,moving,aim,o){
  o=o||{};
  c.save(); c.translate(x,y); c.scale(sc,sc);
  if(!o.noShadow){ c.fillStyle='rgba(0,0,0,.32)'; c.beginPath(); c.ellipse(0,15,13,4.5,0,0,TAU); c.fill(); }
  const ph=t*13, step=moving?Math.sin(ph):0, bob=moving?-Math.abs(Math.cos(ph))*2.2:Math.sin(t*2.5)*.7;
  c.translate(0,14); if(o.lean) c.rotate(o.lean); const sq=o.squash||0; c.scale(1+sq*.5,1-sq); c.translate(0,-14);
  c.translate(0,bob);
  const back=Math.sin(aim)<-.35, sk=L.skin||'#ffdcbc';
  if(o.wAt){ o.wAt.m=c.getTransform(); o.wAt.back=back; }             // heroOutlined + refined glow only (never in classic)
  if(back) drawWeapon(c,L,aim,face);
  c.save(); c.scale(face,1);
  const cs=o.cape||0;
  if(L.cape){ c.fillStyle=L.cape; c.beginPath(); c.moveTo(-6,-6); c.quadraticCurveTo(-16-step*1.5-cs*6,4,-13-cs*5,13); c.lineTo(4,12); c.lineTo(4,-6); c.closePath(); c.fill(); c.fillStyle=shade(L.cape,-.3); c.beginPath(); c.moveTo(-6,-6); c.quadraticCurveTo(-12-cs*4,4,-11-cs*4,12); c.lineTo(-6,12); c.closePath(); c.fill(); }
  c.fillStyle=shade(L.body,-.3); c.beginPath(); c.ellipse(-7,1+step*1.5,3,4.5,0,0,TAU); c.fill(); circ(c,sk,-7.5,4.8+step*1.5,2.4);
  const lp=L.pants||'#3a2f2a',l1=Math.max(0,step)*2.5,l2=Math.max(0,-step)*2.5;
  c.fillStyle=lp; c.fillRect(-6,6,4.6,8-l1); c.fillRect(1.4,6,4.6,8-l2);
  c.fillStyle=shade(lp,-.4); c.fillRect(-6.4,11.4-l1,5.4,2.6); c.fillRect(1,11.4-l2,5.4,2.6);
  if(L.hat==='hood') circ(c,L.hatC,-1,-14,13.4);
  c.fillStyle=L.body; rrect(c,-9,-6,18,15,6); c.fill();
  c.fillStyle=shade(L.body,-.22); rrect(c,-9,2,18,7,4); c.fill();
  c.fillStyle=shade(L.body,.2); c.fillRect(-6.5,-4.5,2.6,6);
  const tr=L.trim||'#cccccc'; c.fillStyle=tr; c.fillRect(-9,2.5,18,2.6); c.fillStyle=shade(tr,-.35); c.fillRect(-1.6,2.1,3.2,3.4);
  circ(c,sk,1,-14,10); c.fillStyle=shade(sk,-.1); c.beginPath(); c.arc(1,-14,10,PI*.15,PI*.85); c.fill();
  if(L.hat!=='hood'&&L.hat!=='helm'){ c.fillStyle=L.hair; c.beginPath(); c.arc(0,-16,10.4,PI*.95,PI*2.05); c.fill(); c.fillRect(-10,-17,5,8); c.fillStyle=shade(L.hair,.25); c.fillRect(-4,-25,7,1.6); }
  const blink=((t*.7+(o.seed||0))%3.2)<.1;
  if(blink){ c.fillStyle='#2a1d18'; c.fillRect(3,-13.4,2.6,1.2); c.fillRect(7.2,-13.4,2.6,1.2); }
  else { c.fillStyle='#2a1d18'; c.fillRect(3.2,-15.5,2.2,3.6); c.fillRect(7.4,-15.5,2.2,3.6); c.fillStyle='#ffffff'; c.fillRect(3.5,-15.2,.9,.9); c.fillRect(7.7,-15.2,.9,.9); }
  c.fillStyle='rgba(255,130,130,.4)'; c.fillRect(2.2,-10.8,3,1.6); c.fillRect(8,-10.8,2.4,1.6);
  c.fillStyle='#8a4a3a'; c.fillRect(5.4,-9.4,2,1);
  drawHat(c,L,t);
  c.restore();
  if(!back&&!o.wAt) drawWeapon(c,L,aim,face);                         // wAt: heroOutlined draws the front weapon after its glow
  c.restore();
}
/* outlined hero: draw once to an offscreen canvas, stamp a dark silhouette around it, then the hero */
const HERO_SZ=104, heroCv=mkCanvas(2,2), heroSil=mkCanvas(2,2);
// refined-weapon glow (L.glow · never in classic): the outline is cut from the hero without the glow (else the glow disc gets a dark
// rim) in ONE drawHero (it used to be drawn twice a frame). drawHero reports where the weapon goes (o.wAt) and leaves out its glow;
// the layers stay as drawWeapon paints them: weapon behind the body → glow under everything (destination-over) · in front → body,
// then the glow ('lighter'), then the weapon, which drawHero leaves to us for that (it is cut into the outline first)
const HERO_GLOW={on:false};
function heroGlow(c,L,op){ const r=L.glow>1?30:23; c.save(); c.globalCompositeOperation=op; c.globalAlpha*=L.glow>1?.8:.65;
  c.drawImage(glowTex(L.glowC||L.wc||'#dddddd'),16-r,-r,r*2,r*2); c.restore(); }
function heroOutlined(target,L,x,y,sc,t,face,moving,aim,o){
  o=o||{}; const k=2,S=HERO_SZ,WW=S*k;
  if(heroCv.width!==WW){ heroCv.width=heroCv.height=WW; heroSil.width=heroSil.height=WW; }
  const hc=heroCv.getContext('2d'); hc.setTransform(1,0,0,1,0,0); hc.clearRect(0,0,WW,WW); hc.setTransform(k,0,0,k,0,0);
  const W=L.glow&&!WEAPON_EXT[L.weapon]?{m:null, back:false}:null; HERO_GLOW.on=!!W;
  drawHero(hc,L,S/2,S*.62,1,t,face,moving,aim,Object.assign({},o,{noShadow:true, wAt:W}));
  const sg=heroSil.getContext('2d'); sg.globalCompositeOperation='copy'; sg.drawImage(heroCv,0,0);
  if(W&&W.m&&!W.back){ sg.globalCompositeOperation='source-over'; sg.save(); sg.setTransform(W.m); drawWeapon(sg,L,aim,face); sg.restore(); }
  sg.globalCompositeOperation='source-in'; sg.fillStyle=o.outline||'#120d0a'; sg.fillRect(0,0,WW,WW); sg.globalCompositeOperation='source-over';
  if(W&&W.m){ hc.save(); hc.setTransform(W.m); hc.translate(face*3,-2); hc.rotate(aim); heroGlow(hc,L,W.back?'destination-over':'lighter'); hc.restore();
    if(!W.back){ hc.save(); hc.setTransform(W.m); drawWeapon(hc,L,aim,face); hc.restore(); } }
  HERO_GLOW.on=false;
  const dw=S*sc,dx=x-dw/2,dy=y-S*.62*sc,ow=1.25*sc;
  if(!o.noShadow){ target.fillStyle='rgba(0,0,0,.32)'; target.beginPath(); target.ellipse(x,y+15*sc,13*sc,4.5*sc,0,0,TAU); target.fill(); }
  for(const q of OFF8) target.drawImage(heroSil,dx+q[0]*ow,dy+q[1]*ow,dw,dw);
  target.drawImage(heroCv,dx,dy,dw,dw);
  if(o.tint){ sg.globalCompositeOperation='copy'; sg.drawImage(heroCv,0,0); sg.globalCompositeOperation='source-in'; sg.fillStyle=o.tint; sg.fillRect(0,0,WW,WW); sg.globalCompositeOperation='source-over';
    target.save(); target.globalAlpha*=o.tintA||.5; target.drawImage(heroSil,dx,dy,dw,dw); target.restore(); }
}
function portrait(cvs,look,sz){ sz=sz||72; const d=Math.min(2,window.devicePixelRatio||1); cvs.width=sz*d; cvs.height=sz*d; const c=cvs.getContext('2d'); c.setTransform(d,0,0,d,0,0); c.clearRect(0,0,sz,sz); heroOutlined(c,look,sz*.42,sz*.68,sz/70,.3,1,false,-.55,{}); }

