/* ================= 61-mob-sprites.js · lane F · vector painters of the field monsters → EDRAW ================= */
// The painted chibi art (12b · d.art) replaces these once it has loaded. Until then — or with the art switched off — each
// monster gets its own vector look: one painter family (goblin / orc / slime / beast …) + the item it carries, drawn at a
// unit size and scaled to the monster's radius. getSpr (13) adds the outline, 4 walk frames and the hit flash as for undead.
const FD_PAINT={};
// ---- goblins (body as the daily-dungeon goblin, recoloured; items on top) ----
function fdGobBody(c,f,skin,vest){ const s=W4[f]*1.8, b=Math.abs(W4[f])*.6, dk=shade(skin,-.14); c.translate(0,-b);
  c.fillStyle='#3a2a1a'; c.fillRect(-5,4,4,8+s*.5+b); c.fillRect(1.5,4,4,8-s*.5+b);
  c.fillStyle='#2a1c10'; c.fillRect(-5.5,10.5+s*.5+b,5,2.4); c.fillRect(1,10.5-s*.5+b,5,2.4);
  c.fillStyle=vest; rrect(c,-7,-6,14,12,4); c.fill(); c.fillStyle=shade(vest,.18); c.fillRect(-7,-1,14,2.4);
  circ(c,skin,0,-11,7.5); c.fillStyle=dk;
  c.beginPath(); c.moveTo(-6,-13); c.lineTo(-15,-17); c.lineTo(-6,-9); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(6,-13); c.lineTo(15,-17); c.lineTo(6,-9); c.closePath(); c.fill();
  c.fillStyle='#fff6c0'; c.fillRect(-4,-12,2.6,2.6); c.fillRect(1.6,-12,2.6,2.6); c.fillStyle='#1a1008'; c.fillRect(-3.2,-11.4,1.3,1.4); c.fillRect(2.4,-11.4,1.3,1.4);
  c.fillStyle=shade(skin,-.4); c.fillRect(-2,-7.5,4,1.2); return s; }
function fdArm(c,skin,s,x,y){ limb(c,shade(skin,-.14),3.4,-1,-2,x,y+s); circ(c,shade(skin,-.14),x+.5,y+s,2.2); }
FD_PAINT.gob=function(c,f,it){
  const hob=it==='hob', king=it==='king', skin=hob?'#5a8a3a':king?'#7fb85a':it==='staff'?'#8ab860':'#7fb85a';
  const vest=it==='sack'?'#2e2a36':it==='staff'?'#4a6a2a':it==='drum'?'#6a3a22':king?'#8a2a2a':'#5a3a22';
  if(king){ c.fillStyle='#a8282e'; c.beginPath(); c.moveTo(-8,-6); c.quadraticCurveTo(-16,6,-12,13); c.lineTo(4,12); c.lineTo(6,-6); c.closePath(); c.fill(); }
  if(it==='sack'){ c.fillStyle='#c8a050'; c.beginPath(); c.ellipse(-7,-3,7,8,-.3,0,TAU); c.fill(); c.fillStyle='#ffe28a'; c.font='bold 8px sans-serif'; c.textAlign='center'; c.fillText('$',-7,0); }
  const s=fdGobBody(c,f,skin,vest);
  switch(it){
    case 'leaf': c.fillStyle='#4aa83a'; c.beginPath(); c.ellipse(1,-19,4,2,-.5,0,TAU); c.fill(); limb(c,'#6a4a2a',1.4,9,-2+s,15,-9+s); fdArm(c,skin,s,10,-4); break;
    case 'club': limb(c,'#7a4a24',3.6,9,-3+s,17,-14+s); circ(c,'#8a5a2a',17.5,-15+s,3.6); fdArm(c,skin,s,10,-4); break;
    case 'sling': limb(c,'#6a4a2a',1.2,10,-4+s,14,-14); circ(c,'#8a8070',14,-15,2.4); fdArm(c,skin,s,10,-4); c.fillStyle='#6a5030'; c.fillRect(-7,2,5,4); break;
    case 'spear': limb(c,'#8a6a3a',1.8,-8,6,22,-12+s); c.fillStyle='#d8dde4'; c.beginPath(); c.moveTo(25,-14+s); c.lineTo(19,-14+s); c.lineTo(21,-8+s); c.closePath(); c.fill(); fdArm(c,skin,s,9,-5);
      c.fillStyle='#8a8a90'; c.beginPath(); c.arc(0,-14,7.6,PI,TAU); c.fill(); break;
    case 'sack': c.fillStyle='#22202a'; c.fillRect(-7.5,-13.5,15,3.6); c.fillStyle='#fff6c0'; c.fillRect(-4,-12.6,2.4,1.8); c.fillRect(1.8,-12.6,2.4,1.8); fdArm(c,skin,s,10,-3); break;
    case 'staff': limb(c,'#6a4a2a',2,11,10,13,-18); glowDot(c,13,-21,'#ff8a3a'); circ(c,'#ffd27a',13,-21,2); fdArm(c,skin,s,11,-6);
      c.fillStyle='#e8e0c8'; for(let i=-2;i<=2;i++){ c.beginPath(); c.ellipse(i*2.6,-19-Math.abs(i)*-1,1.2,4,i*.3,0,TAU); c.fill(); } break;
    case 'drum': c.fillStyle='#a8603a'; c.beginPath(); c.ellipse(0,2,8,6,0,0,TAU); c.fill(); c.fillStyle='#f0e0c0'; c.beginPath(); c.ellipse(0,-1,7,3,0,0,TAU); c.fill();
      const k=((f&1)?-3:2); limb(c,'#7a5a3a',1.4,8,-6+k,3,-2); limb(c,'#7a5a3a',1.4,-8,-6-k,-3,-2); break;
    case 'trap': c.fillStyle='#3a3a40'; c.fillRect(-6,-14,12,3.2); c.fillStyle='#8fd0ff'; circ(c,'#8fd0ff',-2.7,-12.4,1.8); circ(c,'#8fd0ff',2.9,-12.4,1.8);
      c.fillStyle='#5a4a3a'; c.fillRect(6,-2+s,6,6); c.fillStyle='#c8c8d0'; c.fillRect(8,-4+s,2,2); fdArm(c,skin,s,10,-4); break;
    case 'hob': c.fillStyle='#8a5a2a'; c.beginPath(); c.arc(4,0,8.5,0,TAU); c.fill(); c.strokeStyle='#5a3a1a'; c.lineWidth=1.6; c.stroke(); circ(c,'#c8a050',4,0,2.4);
      limb(c,'#c8ccd4',2.2,-6,-1+s,-14,-11+s); fdArm(c,skin,-s,-7,-3); break;
    case 'king': c.fillStyle='#a8662a'; c.beginPath(); c.moveTo(-6,-17); c.lineTo(-5,-23); c.lineTo(-2,-19); c.lineTo(0,-24); c.lineTo(2,-19); c.lineTo(5,-23); c.lineTo(6,-17); c.closePath(); c.fill();
      circ(c,'#ff4a3a',0,-19,1.2); limb(c,'#6a3a1a',4.4,9,-2+s,20,-18+s); circ(c,'#7a4a24',21,-20+s,5);
      c.fillStyle='#c8c8c8'; for(const q of [[17,-22],[24,-21],[21,-25]]) c.fillRect(q[0]-1+0,q[1]+s-1,2.4,2.4); fdArm(c,skin,s,10,-4); break;
    default: fdArm(c,skin,s,10,-4); } };
function glowDot(c,x,y,col){ const a=c.globalAlpha; c.globalAlpha=a*.45; circ(c,col,x,y,5); c.globalAlpha=a; }
// ---- beasts ----
FD_PAINT.boar=function(c,f){ const s=W4[f]*1.4;
  c.fillStyle='#3a2416'; c.fillRect(-9,4,3.6,7+s); c.fillRect(-3,5,3.6,6-s); c.fillRect(3,5,3.6,6+s); c.fillRect(8,4,3.6,7-s);
  c.fillStyle='#7a4a2a'; c.beginPath(); c.ellipse(0,0,14,8.5,0,0,TAU); c.fill(); c.fillStyle='#5a3418'; c.beginPath(); c.ellipse(-2,-6,11,3.4,0,0,PI,true); c.fill();
  c.fillStyle='#8a5a34'; c.beginPath(); c.ellipse(12,1,5.5,5,0,0,TAU); c.fill(); c.fillStyle='#c88a6a'; c.beginPath(); c.ellipse(16.5,2,2.4,2.8,0,0,TAU); c.fill();
  c.fillStyle='#f0ead8'; c.beginPath(); c.moveTo(14,4.5); c.lineTo(17,7.6); c.lineTo(15,4); c.closePath(); c.fill();
  c.fillStyle='#ff4a36'; c.fillRect(12.5,-2.4,1.8,1.8); c.fillStyle='#5a3418'; c.beginPath(); c.moveTo(9,-4); c.lineTo(10,-9); c.lineTo(12,-4); c.closePath(); c.fill(); };
FD_PAINT.rider=function(c,f){ FD_PAINT.boar(c,f); c.save(); c.translate(-1,-9); c.scale(.8,.8); FD_PAINT.gob(c,f,'spear'); c.restore(); };
FD_PAINT.beetle=function(c,f){ const s=W4[f]*1.2; c.strokeStyle='#3a2a10'; c.lineWidth=1.4;
  for(let i=-1;i<=1;i++){ c.beginPath(); c.moveTo(i*5,2); c.lineTo(i*6-3,9+s*(i&1?1:-1)); c.moveTo(i*5,2); c.lineTo(i*6+3,9-s*(i&1?1:-1)); c.stroke(); }
  c.fillStyle='#c8a848'; c.beginPath(); c.ellipse(-1,0,11,8,0,0,TAU); c.fill(); c.strokeStyle='#8a7028'; c.lineWidth=1.2; c.beginPath(); c.moveTo(-1,-8); c.lineTo(-1,8); c.stroke();
  c.fillStyle='#e8d070'; c.beginPath(); c.ellipse(-5,-3,3,2,0,0,TAU); c.fill(); circ(c,'#5a4a20',10,1,4.4); c.fillStyle='#fff'; c.fillRect(11,-.4,1.6,1.6); };
FD_PAINT.crow=function(c,f){ const w=[5,-1,-6,-1][f];
  c.fillStyle='#22222c'; c.beginPath(); c.moveTo(-2,-2); c.lineTo(-17,w-4); c.lineTo(-10,w+2); c.lineTo(-2,3); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(2,-2); c.lineTo(15,w-5); c.lineTo(10,w+2); c.lineTo(2,3); c.closePath(); c.fill();
  c.fillStyle='#34344a'; c.beginPath(); c.ellipse(0,0,6,5,0,0,TAU); c.fill(); circ(c,'#34344a',5,-3,3.6);
  c.fillStyle='#f0b545'; c.beginPath(); c.moveTo(8,-3.6); c.lineTo(12,-2.4); c.lineTo(8,-1.4); c.closePath(); c.fill(); c.fillStyle='#ffe14a'; c.fillRect(5.4,-4.4,1.4,1.4); };
FD_PAINT.critter=function(c,f,col){ const s=W4[f]*1.3; col=col||'#c8582a';
  c.fillStyle=shade(col,.15); c.beginPath(); c.moveTo(-6,0); c.quadraticCurveTo(-18,-4,-14,-15); c.quadraticCurveTo(-8,-8,-4,-2); c.closePath(); c.fill();
  c.fillStyle=shade(col,-.3); c.fillRect(-4,4,2.6,5+s); c.fillRect(3,4,2.6,5-s);
  c.fillStyle=col; c.beginPath(); c.ellipse(0,0,8,6.5,0,0,TAU); c.fill(); circ(c,col,6,-4,4.6);
  c.fillStyle=shade(col,-.2); c.beginPath(); c.moveTo(4,-8); c.lineTo(5,-12); c.lineTo(7,-8); c.closePath(); c.fill(); c.fillStyle='#1a1008'; c.fillRect(7,-5.4,1.6,1.6); circ(c,'#3a2010',10.4,-3.4,1); };
FD_PAINT.lamp=function(c,f){ const p=[1,1.03,1,0.97][f];
  c.fillStyle='#4a3a1a'; c.fillRect(-1.5,-19,3,5); c.save(); c.scale(p,1/p);
  circ(c,'#e88a2a',0,2,10); circ(c,'#f0a040',0,-8,6.4); c.fillStyle='rgba(255,240,170,.85)'; c.beginPath(); c.arc(0,2,6,0,PI); c.fill();
  c.fillStyle='#5a2a08'; c.fillRect(-4,-1,2.2,2.6); c.fillRect(2,-1,2.2,2.6); c.restore(); };
FD_PAINT.crab=function(c,f){ const s=W4[f]*1.2; c.strokeStyle='#4a5a7a'; c.lineWidth=1.6;
  for(let i=0;i<3;i++){ c.beginPath(); c.moveTo(-6,2+i*2); c.lineTo(-13,6+i*2+s); c.moveTo(6,2+i*2); c.lineTo(13,6+i*2-s); c.stroke(); }
  c.fillStyle='#8aa0c8'; c.beginPath(); c.ellipse(0,0,11,7.5,0,0,TAU); c.fill(); c.fillStyle='#b8c8e0'; c.beginPath(); c.ellipse(-2,-3,6,3,0,0,TAU); c.fill();
  circ(c,'#8aa0c8',-12,-5+s,4); circ(c,'#8aa0c8',12,-5-s,4); c.fillStyle='#1a2030'; c.fillRect(-3.4,-8.6,1.8,2.6); c.fillRect(2,-8.6,1.8,2.6); };
FD_PAINT.eel=function(c,f){ const ph=f*1.5; c.lineCap='round';
  for(const [w,col] of [[7.5,'#3a3f6a'],[5,'#c8d0ff']]){ c.strokeStyle=col; c.lineWidth=w; c.beginPath(); for(let i=0;i<=8;i++){ const x=-14+i*3.4, y=Math.sin(ph+i*.9)*3; i?c.lineTo(x,y):c.moveTo(x,y); } c.stroke(); }
  circ(c,'#d8e0ff',13,Math.sin(ph+8*.9)*3,4.2); c.fillStyle='#ffe14a'; c.fillRect(14,Math.sin(ph+7.2)*3-2,1.6,1.6); };
FD_PAINT.bee=function(c,f){ const w=[4,-2,-5,-2][f]; c.fillStyle='rgba(230,240,255,.8)'; c.beginPath(); c.ellipse(-3,-6+w*.3,5,3,-.6,0,TAU); c.fill(); c.beginPath(); c.ellipse(3,-6-w*.3,5,3,.6,0,TAU); c.fill();
  c.fillStyle='#f0c040'; c.beginPath(); c.ellipse(0,0,8,6,0,0,TAU); c.fill(); c.fillStyle='#3a2a10'; c.fillRect(-3,-5.6,2.2,11.2); c.fillRect(2,-5.4,2.2,10.8);
  circ(c,'#3a2a10',7,-1,3); c.fillStyle='#fff'; c.fillRect(7.6,-2,1.2,1.2); c.fillStyle='#3a2a10'; c.beginPath(); c.moveTo(-8,0); c.lineTo(-11,1); c.lineTo(-8,2); c.closePath(); c.fill(); };
FD_PAINT.wolf=function(c,f){ const s=W4[f]*1.6; c.strokeStyle='#d8d0c0'; c.lineWidth=2.2; c.lineCap='round';
  c.beginPath(); c.moveTo(-8,2); c.lineTo(-10,10+s); c.moveTo(-3,2); c.lineTo(-2,10-s); c.moveTo(4,2); c.lineTo(5,10+s); c.moveTo(8,2); c.lineTo(10,10-s); c.stroke();
  c.fillStyle='#e8e2d2'; c.fillRect(-10,-2,19,3.2); c.lineWidth=1.4; for(let i=0;i<4;i++){ c.beginPath(); c.arc(-6+i*4,0,3.4,PI*1.1,PI*1.9); c.stroke(); }
  c.beginPath(); c.moveTo(-10,-1); c.quadraticCurveTo(-16,-6,-18,-2); c.stroke();
  c.fillStyle='#ece6d4'; c.beginPath(); c.moveTo(8,-6); c.lineTo(17,-3); c.lineTo(16,1); c.lineTo(8,1); c.closePath(); c.fill(); c.beginPath(); c.moveTo(9,-6); c.lineTo(10,-11); c.lineTo(12,-6); c.closePath(); c.fill();
  circ(c,'#a46bff',12,-3.6,1.6); c.fillStyle='rgba(164,107,255,.35)'; c.beginPath(); c.arc(12,-3.6,4,0,TAU); c.fill(); };
// ---- slimes: a clear jelly with a rune core floating inside (colour = element) ----
FD_PAINT.slime=function(c,f,col,x){ const q=[1,1.05,1,.95][f], big=x==='big'||x==='queen'; col=col||'#5fb8ff';
  c.fillStyle='rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(0,9,12,3,0,0,TAU); c.fill();
  if(x==='twin'){ c.save(); c.beginPath(); c.rect(-20,-30,20,50); c.clip(); fdJelly(c,q,'#ff6a3a'); c.restore(); c.save(); c.beginPath(); c.rect(0,-30,20,50); c.clip(); fdJelly(c,q,'#3a9aff'); c.restore(); }
  else fdJelly(c,q,col);
  const cores=x==='big'?[[-4,-1],[4,1],[0,-5]]:x==='three'?[[-5,0],[0,-4],[5,0]]:[[0,-1]];
  for(const p of cores){ c.fillStyle=shade(col,.55); c.beginPath(); c.moveTo(p[0],p[1]-4); c.lineTo(p[0]+3,p[1]); c.lineTo(p[0],p[1]+4); c.lineTo(p[0]-3,p[1]); c.closePath(); c.fill(); c.strokeStyle=shade(col,-.45); c.lineWidth=.8; c.stroke(); }
  const ey=big?-6:-5; c.fillStyle='#1a1424'; c.beginPath(); c.ellipse(-3.4,ey,1.6,2.2,0,0,TAU); c.ellipse(3.4,ey,1.6,2.2,0,0,TAU); c.fill(); c.fillStyle='#fff'; c.fillRect(-3.8,ey-1.6,1,1); c.fillRect(3,ey-1.6,1,1);
  switch(x){
    case 'drip': c.fillStyle=col; c.beginPath(); c.moveTo(0,-15*q); c.quadraticCurveTo(3,-11,0,-9); c.quadraticCurveTo(-3,-11,0,-15*q); c.fill(); break;
    case 'flame': for(const [px,h] of [[-5,6],[0,9],[5,6]]){ c.fillStyle=px?'#ffb050':'#ffe28a'; c.beginPath(); c.moveTo(px-2.6,-9); c.quadraticCurveTo(px,-9-h*1.6,px+2.6,-9); c.closePath(); c.fill(); } break;
    case 'bubble': c.strokeStyle='rgba(255,255,255,.75)'; c.lineWidth=1.2; c.beginPath(); c.arc(7,-11,2.6,0,TAU); c.moveTo(-6,-13); c.arc(-7,-13,1.6,0,TAU); c.stroke(); break;
    case 'shell': c.fillStyle='#8a6a40'; c.beginPath(); c.ellipse(0,-6,10,6,0,PI,TAU); c.fill(); c.strokeStyle='#5a4428'; c.lineWidth=1.2; c.beginPath(); c.moveTo(-6,-8); c.lineTo(-3,-11); c.moveTo(2,-11.6); c.lineTo(5,-8); c.stroke(); break;
    case 'moss': c.fillStyle='#3a7a2a'; c.beginPath(); c.ellipse(0,-8,9,3.6,0,PI,TAU); c.fill(); c.fillStyle='#6ac04a'; for(const p of [-5,0,5]){ c.beginPath(); c.ellipse(p,-11,1.6,3,p*.1,0,TAU); c.fill(); } break;
    case 'halo': c.strokeStyle='#fff2a0'; c.lineWidth=1.6; c.beginPath(); c.ellipse(0,-15,6,1.8,0,0,TAU); c.stroke(); break;
    case 'smoke': c.fillStyle='rgba(60,30,90,.5)'; for(const p of [[-7,-10],[6,-12],[0,-14]]){ c.beginPath(); c.arc(p[0],p[1]-f*.6,2.6,0,TAU); c.fill(); } break;
    case 'queen': case 'crown': { const R=['#ff6a3a','#7fe0b0','#c89a5a','#5fb8ff','#ffe27a','#b48cff'];
      c.fillStyle='#e8c060'; c.fillRect(-7,-15,14,3); for(let i=0;i<6;i++){ c.beginPath(); c.moveTo(-7+i*2.8,-15); c.lineTo(-5.6+i*2.8,-19); c.lineTo(-4.2+i*2.8,-15); c.closePath(); c.fill(); circ(c,R[i],-5.6+i*2.8,-15.6,.9); } break; } } };
function fdJelly(c,q,col){ c.fillStyle=hexA(col,.78); c.beginPath(); c.moveTo(-11*q,8); c.quadraticCurveTo(-13*q,-10/q,0,-11/q); c.quadraticCurveTo(13*q,-10/q,11*q,8); c.closePath(); c.fill();
  c.fillStyle=hexA(shade(col,.5),.55); c.beginPath(); c.ellipse(-5,-5/q,3,4.4,-.5,0,TAU); c.fill(); }
// ---- orcs (stocky grey-green, tusks, rusty red iron) ----
function fdOrcBody(c,f,skin,arm){ const s=W4[f]*1.5, b=Math.abs(W4[f])*.7; c.translate(0,-b);
  c.fillStyle='#2e2620'; c.fillRect(-7,6,5,8+s*.5+b); c.fillRect(2,6,5,8-s*.5+b);
  c.fillStyle=arm; rrect(c,-10,-7,20,15,5); c.fill(); c.fillStyle=shade(arm,-.25); c.fillRect(-10,2,20,3); c.fillStyle='#5a3a24'; c.fillRect(-10,5,20,2.4);
  circ(c,skin,1,-13,8.5); c.fillStyle=shade(skin,-.25); c.fillRect(-5,-17,13,2.6);
  c.fillStyle='#ffe14a'; c.fillRect(1,-15,2.4,2); c.fillRect(5.4,-15,2.2,2); c.fillStyle='#f0ead8';
  c.beginPath(); c.moveTo(0,-9); c.lineTo(1,-13); c.lineTo(2,-9); c.closePath(); c.moveTo(6,-9); c.lineTo(7,-13); c.lineTo(8,-9); c.closePath(); c.fill(); return s; }
function fdOrcArm(c,skin,s,x,y){ limb(c,shade(skin,-.12),5,0,-3,x,y+s); circ(c,shade(skin,-.12),x,y+s,3); }
FD_PAINT.orc=function(c,f,it){
  const skin=it==='berserkR'?'#c86a5a':it==='bonestaff'?'#9aa08a':'#8a9a6a', arm=it==='cook'?'#e8e0d0':it==='warlord'?'#9a3a24':it==='bow'?'#6a5a3a':'#8a4a2a';
  if(it==='warlord'){ c.fillStyle='#a8282e'; c.beginPath(); c.moveTo(-10,-8); c.quadraticCurveTo(-20,6,-15,15); c.lineTo(6,14); c.lineTo(8,-8); c.closePath(); c.fill(); }
  if(it==='barrel'){ c.fillStyle='#3a2a1a'; c.beginPath(); c.ellipse(-8,-4,8,10,0,0,TAU); c.fill(); c.fillStyle='#5a4a3a'; c.fillRect(-16,-6,16,2.4); c.fillRect(-16,2,16,2.4);
    limb(c,'#c8a050',1.2,-8,-14,-10,-19); circ(c,(f&1)?'#ffd34d':'#ff7a3d',-10.4,-19.6,1.8); }
  if(it==='bow'){ c.fillStyle='#5a3a24'; c.fillRect(-12,-8,4,14); }
  const s=fdOrcBody(c,f,skin,arm);
  switch(it){
    case 'cleaver': limb(c,'#5a3a1a',2.6,10,-2+s,14,-10+s); c.fillStyle='#c8ccd4'; c.fillRect(12,-20+s,7,10); fdOrcArm(c,skin,s,11,-3); break;
    case 'bow': c.strokeStyle='#7a5432'; c.lineWidth=2.4; c.beginPath(); c.arc(9,-3,10,-1.25,1.25); c.stroke(); limb(c,'#e9e2cf',1,9+10*Math.cos(-1.25),-3+10*Math.sin(-1.25),9+10*Math.cos(1.25),-3+10*Math.sin(1.25)); fdOrcArm(c,skin,0,10,-3);
      c.fillStyle='#6a5a3a'; c.beginPath(); c.arc(1,-15,9,PI*1.05,PI*1.95); c.fill(); break;
    case 'tshield': c.fillStyle='#7a3a22'; rrect(c,3,-14,12,26,3); c.fill(); c.strokeStyle='#4a2414'; c.lineWidth=1.6; c.stroke(); c.fillStyle='#b8b0a0'; c.fillRect(3,-4,12,2.6); circ(c,'#c8c0b0',9,-8,1.6); circ(c,'#c8c0b0',9,4,1.6); break;
    case 'axes': case 'berserkR': for(const sg of [1,-1]){ limb(c,'#5a3a1a',2.4,sg*8,-2+s*sg,sg*15,-12+s*sg); c.fillStyle='#d0d4dc'; c.beginPath(); c.moveTo(sg*13,-15+s*sg); c.lineTo(sg*20,-13+s*sg); c.lineTo(sg*16,-8+s*sg); c.closePath(); c.fill(); }
      c.fillStyle='#c8282e'; c.fillRect(-3,-23,8,4); break;
    case 'bonestaff': limb(c,'#d8d0c0',2,12,12,13,-20); circ(c,'#e8e0d0',13,-22,4); circ(c,'#a46bff',13,-22,1.8); fdOrcArm(c,skin,s,12,-4);
      c.fillStyle='#e8e2d2'; c.beginPath(); c.moveTo(-6,-19); c.lineTo(1,-25); c.lineTo(8,-19); c.closePath(); c.fill(); break;
    case 'horn': c.strokeStyle='#e8d8b0'; c.lineWidth=4; c.lineCap='round'; c.beginPath(); c.moveTo(8,-11); c.quadraticCurveTo(18,-14,19,-24); c.stroke(); circ(c,'#c8b890',19.5,-25,3.4); fdOrcArm(c,skin,0,9,-8); break;
    case 'hammer': limb(c,'#5a3a1a',3,10,4+s,16,-16+s); c.fillStyle='#6a6e78'; c.fillRect(10,-24+s,13,9); c.fillStyle='#8a8e98'; c.fillRect(10,-24+s,13,2.4); fdOrcArm(c,skin,s,12,-2);
      c.fillStyle='#5a5e68'; c.fillRect(-9,-6,18,7); break;
    case 'cook': c.fillStyle='#ffffff'; c.beginPath(); c.arc(1,-22,6,PI,TAU); c.fill(); c.fillRect(-4,-23,10,4); limb(c,'#8a6a4a',2,10,-2+s,15,-10+s); circ(c,'#a85a2a',16,-12+s,3.6); fdOrcArm(c,skin,s,11,-3); break;
    case 'warlord': c.fillStyle='#6a5a50'; c.beginPath(); c.arc(1,-15,9.4,PI,TAU); c.fill(); c.fillStyle='#e8e0c8';
      c.beginPath(); c.moveTo(-8,-17); c.quadraticCurveTo(-14,-22,-12,-28); c.quadraticCurveTo(-9,-22,-5,-19); c.closePath(); c.fill(); c.beginPath(); c.moveTo(10,-17); c.quadraticCurveTo(16,-22,14,-28); c.quadraticCurveTo(11,-22,7,-19); c.closePath(); c.fill();
      limb(c,'#5a3a1a',3.4,10,6+s,18,-22+s); c.fillStyle='#d8dce4'; c.beginPath(); c.moveTo(14,-26+s); c.quadraticCurveTo(27,-25+s,24,-14+s); c.lineTo(17,-18+s); c.closePath(); c.fill(); fdOrcArm(c,skin,s,12,-2); break;
    default: fdOrcArm(c,skin,s,11,-3); } };
FD_PAINT.rhino=function(c,f){ const s=W4[f]*1.4;
  c.fillStyle='#4a4a44'; for(const x of [-10,-4,4,10]) c.fillRect(x-2,5,4.4,7+(x>0?s:-s));
  c.fillStyle='#8a8a80'; c.beginPath(); c.ellipse(0,0,16,9.5,0,0,TAU); c.fill(); c.fillStyle='#a0a096'; c.fillRect(-12,-7,20,3);
  c.fillStyle='#8a8a80'; c.beginPath(); c.ellipse(14,1,6.4,6,0,0,TAU); c.fill(); c.fillStyle='#e8e0c8'; c.beginPath(); c.moveTo(17,-2); c.lineTo(24,-8); c.lineTo(20,1); c.closePath(); c.fill();
  c.fillStyle='#ff5a3a'; c.fillRect(15,-2,1.8,1.8);
  c.save(); c.translate(-3,-11); c.scale(.72,.72); FD_PAINT.orc(c,f,'cleaver'); c.restore(); };
FD_PAINT.tower=function(c,f){ const flap=(f&1)?2:-1;
  c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0,26,24,7,0,0,TAU); c.fill();
  c.strokeStyle='#5a3a20'; c.lineWidth=4; c.beginPath(); c.moveTo(-17,26); c.lineTo(-12,-24); c.moveTo(17,26); c.lineTo(12,-24); c.moveTo(-6,26); c.lineTo(-5,-24); c.moveTo(6,26); c.lineTo(5,-24); c.stroke();
  c.lineWidth=2; c.beginPath(); c.moveTo(-15,8); c.lineTo(15,-10); c.moveTo(15,8); c.lineTo(-15,-10); c.stroke();
  c.fillStyle='#7a4a2a'; c.fillRect(-20,-30,40,8); c.fillStyle='#8a5a30'; for(let i=-18;i<18;i+=6) c.fillRect(i,-38,4,9);
  limb(c,'#4a3020',2,14,-38,14,-58); c.fillStyle='#a82a22'; c.beginPath(); c.moveTo(14,-58); c.lineTo(26+flap,-54); c.lineTo(14,-49); c.closePath(); c.fill(); };
// ---- bind: one painter per monster, scaled from the family's unit radius ----
const FD_UNIT={gob:12, orc:16, slime:12, boar:13, rider:15, beetle:11, crow:9, critter:9, lamp:13, crab:15, eel:10, bee:8, wolf:12, rhino:20, tower:30};
for(const id in MOBS){ const d=MOBS[id], pv=d.pv||['gob'], fam=FD_PAINT[pv[0]]?pv[0]:'gob', k=d.r/(FD_UNIT[fam]||12);
  d.base='fd_'+id; EDRAW[d.base]=(c,f)=>{ c.save(); c.scale(k,k); FD_PAINT[fam](c,f,pv[1],pv[2]); c.restore(); }; }
