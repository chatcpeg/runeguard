/* ================= enemy sprites (outlined, 4-frame walk, built lazily) ================= */
const SPR={};
function shadowE(c,r){ c.fillStyle='rgba(0,0,0,.32)'; c.beginPath(); c.ellipse(0,r*.85,r*.95,r*.34,0,0,TAU); c.fill(); }
const EDRAW={
 shambler(c,f){ const s=W4[f]*1.6,b=Math.abs(W4[f])*.7; c.translate(0,-b);
   c.fillStyle='#38344a'; c.fillRect(-6,5,4.5,8+s*.5+b); c.fillRect(1.5,5,4.5,8-s*.5+b);
   c.fillStyle='#26222f'; c.fillRect(-6.5,11.5+s*.5+b,5.5,2.4); c.fillRect(1,11.5-s*.5+b,5.5,2.4);
   limb(c,'#6f945e',4,-1,-3,12,-5+s); circ(c,'#6f945e',12.5,-5+s,2.4);
   c.fillStyle='#6b5f80'; rrect(c,-9,-7,18,14,4); c.fill(); c.fillStyle='#584d6b'; rrect(c,-9,0,18,7,3); c.fill();
   c.fillStyle='#4e6b42'; c.fillRect(-5,1,5,3); c.fillRect(3,-5,3,3); c.fillStyle='#7d7194'; c.fillRect(-7,-5,3,4);
   circ(c,'#8db37a',1,-13,8.5); c.fillStyle='#78a066'; c.beginPath(); c.arc(1,-13,8.5,PI*.15,PI*.85); c.fill();
   c.fillStyle='#55743f'; c.beginPath(); c.arc(0,-16,8.6,PI*1.05,PI*1.9); c.fill();
   c.fillStyle='#ff4a36'; c.fillRect(3.5,-14.5,2.6,2.6); c.fillRect(7.4,-14,2.2,2.2); c.fillStyle='#ffd8cf'; c.fillRect(3.6,-14.4,.9,.9);
   c.fillStyle='#2e2424'; c.fillRect(4,-9.5,4.5,1.8); c.fillStyle='#e8e2cf'; c.fillRect(4.5,-9.5,1,1); c.fillRect(6.6,-9.5,1,1);
   limb(c,'#8db37a',4,2,-2,15,-2-s); circ(c,'#8db37a',15.5,-2-s,2.6); },
 runner(c,f){ const s=W4[f]*2.4,b=Math.abs(W4[f])*.9; c.save(); c.translate(0,-b); c.rotate(.18);
   c.fillStyle='#2f2b36'; c.fillRect(-5,4,4,8+s*.6+b); c.fillRect(1,4,4,8-s*.6+b);
   limb(c,'#5f7f52',3.5,-1,-3,11,-1+s);
   c.fillStyle='#8a3434'; rrect(c,-7.5,-6,15,12,4); c.fill(); c.fillStyle='#702828'; rrect(c,-7.5,0,15,6,3); c.fill();
   circ(c,'#7a9c68',1.5,-11.5,7.5); c.fillStyle='#5a7a4a'; c.beginPath(); c.arc(1,-14,7.6,PI*1.05,PI*1.95); c.fill();
   c.fillStyle='#ffe14a'; c.fillRect(4,-13,2.4,2.4); c.fillRect(7.3,-12.5,2,2);
   c.fillStyle='#2e2424'; c.fillRect(4,-8.3,4,2); c.fillStyle='#e8e2cf'; c.fillRect(4.4,-8.3,.9,.9); c.fillRect(6.4,-8.3,.9,.9);
   limb(c,'#7a9c68',3.5,2,-2,13,1-s); c.restore(); },
 brute(c,f){ const s=W4[f]*1.5,b=Math.abs(W4[f])*.8; c.translate(0,-b);
   c.fillStyle='#2c2838'; c.fillRect(-10,9,7,10+s*.5+b); c.fillRect(3,9,7,10-s*.5+b);
   limb(c,'#7d6f94',8,-6,-4,16,4+s);
   c.fillStyle='#6d607f'; c.beginPath(); c.ellipse(0,0,17,14,0,0,TAU); c.fill(); c.fillStyle='#5c5070'; c.beginPath(); c.ellipse(0,4,17,10,0,0,PI); c.fill();
   c.fillStyle='#8576a0'; c.beginPath(); c.ellipse(-6,-6,6,4,-.4,0,TAU); c.fill();
   c.strokeStyle='#3c3348'; c.lineWidth=1.5; c.beginPath(); c.moveTo(-8,-6); c.lineTo(6,4); for(let i=0;i<4;i++){ const x=-6+i*4,y=-4.5+i*2.9; c.moveTo(x-2,y+2.5); c.lineTo(x+2,y-2.5);} c.stroke();
   circ(c,'#9a8bb0',3,-15,8); c.fillStyle='#867799'; c.beginPath(); c.arc(3,-15,8,PI*.15,PI*.85); c.fill();
   c.fillStyle='#ff5a3a'; c.fillRect(5,-17,2.6,2.6); c.fillRect(8.6,-16.4,2.2,2.2);
   c.fillStyle='#2a2030'; c.fillRect(5,-11.5,5,2);
   limb(c,'#9a8bb0',8,6,-4,20,2-s); circ(c,'#9a8bb0',21,2-s,5); },
 spitter(c,f){ const s=W4[f]*1.2;
   limb(c,'#d9d2bf',2.5,-3,4,-5,13+s); limb(c,'#d9d2bf',2.5,2,4,4,13-s);
   c.fillStyle='#d9d2bf'; c.fillRect(-1.2,-6,2.4,11);
   c.strokeStyle='#d9d2bf'; c.lineWidth=1.8; for(let i=0;i<3;i++){ c.beginPath(); c.moveTo(-5,-4+i*3); c.lineTo(5,-4+i*3); c.stroke(); }
   c.strokeStyle='#7a5432'; c.lineWidth=2.2; c.beginPath(); c.arc(9,-3,9,-1.3,1.3); c.stroke();
   limb(c,'#e9e2cf',1,9+9*Math.cos(-1.3),-3+9*Math.sin(-1.3),9+9*Math.cos(1.3),-3+9*Math.sin(1.3));
   limb(c,'#d9d2bf',2.2,1,-4,10,-3);
   circ(c,'#ece6d4',1,-12,7.5); c.fillStyle='#d4ccb6'; c.beginPath(); c.arc(1,-12,7.5,PI*.2,PI*.8); c.fill();
   circ(c,'#1c1a22',3.5,-12.5,2.2); circ(c,'#1c1a22',7.5,-12,1.8);
   c.fillStyle='#ff6a3a'; c.fillRect(3,-13,1.3,1.3);
   c.fillStyle='#1c1a22'; c.fillRect(3,-7.5,5,1.2); },
 bat(c,f){ const w=[5,-1,-6,-1][f];
   c.fillStyle='#3a2a4a'; c.beginPath(); c.moveTo(-2,-2); c.lineTo(-17,w-4); c.lineTo(-11,w+2); c.lineTo(-6,w); c.lineTo(-2,3); c.closePath(); c.fill();
   c.beginPath(); c.moveTo(2,-2); c.lineTo(17,w-4); c.lineTo(11,w+2); c.lineTo(6,w); c.lineTo(2,3); c.closePath(); c.fill();
   c.fillStyle='#4b3660'; c.beginPath(); c.ellipse(0,0,6,7,0,0,TAU); c.fill(); c.fillStyle='#5e4678'; c.beginPath(); c.ellipse(-1.5,-2,2.5,3,0,0,TAU); c.fill();
   c.fillStyle='#4b3660'; c.beginPath(); c.moveTo(-4,-5); c.lineTo(-3,-10); c.lineTo(-1,-6); c.closePath(); c.fill(); c.beginPath(); c.moveTo(4,-5); c.lineTo(3,-10); c.lineTo(1,-6); c.closePath(); c.fill();
   c.fillStyle='#ff3b5c'; c.fillRect(1,-3,2,2); c.fillRect(4,-3,2,2); },
 bloater(c,f){ const p=[.97,1.02,1.06,1.02][f]; c.save(); c.scale(p,1/p);
   c.fillStyle='#2f3a28'; c.fillRect(-7,8,5,7); c.fillRect(2,8,5,7);
   circ(c,'#8fae4f',0,0,15); c.fillStyle='#7a9842'; c.beginPath(); c.arc(0,0,15,PI*.1,PI*.9); c.fill(); circ(c,'#b2cf66',-4,-5,7); circ(c,'#d2e88e',-6,-7,2.5);
   for(const q of [[6,3,3],[-7,5,2.5],[2,-8,2],[9,-4,2]]){ circ(c,'#e8d55a',q[0],q[1],q[2]); circ(c,'#fff2a0',q[0]-q[2]*.3,q[1]-q[2]*.3,q[2]*.35); }
   circ(c,'#9cbf63',4,-16,6);
   c.fillStyle='#ff4a36'; c.fillRect(5,-18,2,2); c.fillRect(8,-17.5,1.8,1.8);
   c.restore(); },
 wraith(c,f){ const s=W4[f]*2; c.translate(0,W4[(f+1)&3]*1.2);
   c.fillStyle='rgba(167,199,255,.9)'; c.beginPath(); c.moveTo(-10,-6); c.arc(0,-6,10,PI,TAU); c.lineTo(10,8);
   c.quadraticCurveTo(7.5,12+s,5,8); c.quadraticCurveTo(2.5,12-s,0,8); c.quadraticCurveTo(-2.5,12+s,-5,8); c.quadraticCurveTo(-7.5,12-s,-10,8); c.closePath(); c.fill();
   c.fillStyle='rgba(220,235,255,.7)'; c.beginPath(); c.ellipse(-4,-9,3,4,-.3,0,TAU); c.fill();
   c.fillStyle='#1b2440'; c.beginPath(); c.ellipse(3,-7,2.2,3.2,0,0,TAU); c.fill(); c.beginPath(); c.ellipse(8,-6.5,1.8,2.8,0,0,TAU); c.fill();
   c.beginPath(); c.ellipse(5.5,-1,2,1.4,0,0,TAU); c.fill(); },
 colossus(c,f){ const s=W4[f]*2;
   limb(c,'#d8cfb8',8,-12,18,-14,40+s); limb(c,'#d8cfb8',8,12,18,14,40-s);
   c.fillStyle='#3a3328'; c.beginPath(); c.ellipse(0,4,30,26,0,0,TAU); c.fill();
   c.strokeStyle='#e2d9c2'; c.lineWidth=4; for(let i=0;i<4;i++){ c.beginPath(); c.ellipse(0,-2+i*7,22-i*2,5,0,0,PI); c.stroke(); }
   c.fillStyle='#e2d9c2'; c.fillRect(-2.5,-18,5,36);
   limb(c,'#e2d9c2',8,-24,-12,-38,14+s); limb(c,'#e2d9c2',8,24,-12,40,10-s); circ(c,'#e2d9c2',41,11-s,8);
   circ(c,'#5a4f3f',-24,-14,10); circ(c,'#5a4f3f',24,-14,10); circ(c,'#6e6150',-26,-17,4); circ(c,'#6e6150',22,-17,4);
   circ(c,'#efe7d2',4,-34,17); c.fillStyle='#d6cdb6'; c.beginPath(); c.arc(4,-34,17,PI*.2,PI*.8); c.fill();
   c.fillStyle='#1a1410'; c.beginPath(); c.ellipse(-1,-35,4.5,5.5,0,0,TAU); c.fill(); c.beginPath(); c.ellipse(11,-35,4.5,5.5,0,0,TAU); c.fill();
   circ(c,'#ff5a2a',-1,-35,2); circ(c,'#ff5a2a',11,-35,2);
   c.fillStyle='#1a1410'; c.fillRect(-2,-24,15,3);
   c.fillStyle='#8a7a5a'; c.beginPath(); c.moveTo(-10,-46); c.lineTo(-18,-62); c.lineTo(-4,-49); c.closePath(); c.fill(); c.beginPath(); c.moveTo(16,-46); c.lineTo(26,-62); c.lineTo(10,-49); c.closePath(); c.fill(); },
 lich(c,f){ const s=W4[f]*1.5;
   limb(c,'#5a3a22',3,22,32,24,-24); circ(c,'rgba(164,107,255,.45)',24,-28,9); circ(c,'#c9a2ff',24,-28,5);
   c.fillStyle='#3e2560'; c.beginPath(); c.moveTo(-17,-14); c.lineTo(17,-14); c.lineTo(24,26); c.quadraticCurveTo(12,32+s,0,26); c.quadraticCurveTo(-12,32-s,-24,26); c.closePath(); c.fill();
   c.fillStyle='#2f1b4a'; c.beginPath(); c.moveTo(-20,6); c.lineTo(20,6); c.lineTo(24,26); c.quadraticCurveTo(12,32+s,0,26); c.quadraticCurveTo(-12,32-s,-24,26); c.closePath(); c.fill();
   c.fillStyle='#6a3f9a'; c.fillRect(-3,-12,6,36);
   circ(c,'#2c1846',2,-24,15);
   circ(c,'#e8e0f0',4,-23,9.5);
   c.fillStyle='#120a1c'; c.beginPath(); c.ellipse(1,-24,2.6,3.2,0,0,TAU); c.fill(); c.beginPath(); c.ellipse(8,-24,2.6,3.2,0,0,TAU); c.fill();
   circ(c,'#6ff7ff',1,-24,1.3); circ(c,'#6ff7ff',8,-24,1.3);
   c.fillStyle='#120a1c'; c.fillRect(1,-17.5,8,1.6);
   c.fillStyle='#f0b545'; c.beginPath(); c.moveTo(-7,-35); c.lineTo(-5,-44); c.lineTo(-1,-37); c.lineTo(3,-46); c.lineTo(7,-37); c.lineTo(11,-44); c.lineTo(13,-35); c.closePath(); c.fill();
   limb(c,'#e8e0f0',3,14,-6,22,-4); },
 king(c,f){ const s=W4[f]*2;
   c.fillStyle='#7a1622'; c.beginPath(); c.moveTo(-22,-22); c.quadraticCurveTo(-40,10,-36+s,46); c.lineTo(10,44); c.lineTo(14,-22); c.closePath(); c.fill();
   c.fillStyle='#5a0f18'; c.beginPath(); c.moveTo(-22,-10); c.quadraticCurveTo(-34,14,-32+s,44); c.lineTo(-20,44); c.closePath(); c.fill();
   c.fillStyle='#22222c'; c.fillRect(-16,18,12,24+s); c.fillRect(4,18,12,24-s);
   c.fillStyle='#3a3a4c'; rrect(c,-24,-24,48,46,10); c.fill();
   c.fillStyle='#5a5a70'; c.fillRect(-18,-18,10,30); c.fillStyle='#2c2c3a'; c.fillRect(-24,4,48,18);
   c.fillStyle='#c9a24a'; c.fillRect(-24,12,48,5);
   circ(c,'#4a4a60',-24,-20,11); circ(c,'#4a4a60',24,-20,11); circ(c,'#62627a',-26,-23,4); circ(c,'#62627a',22,-23,4);
   limb(c,'#c9cfd8',7,22,8,58,-44); limb(c,'#ffffff',2,26,2,56,-40); c.fillStyle='#c9a24a'; c.fillRect(16,2,14,5); limb(c,'#4a4a60',8,18,-6,24,6);
   circ(c,'#2f2f3e',4,-38,16);
   c.fillStyle='#ff3a3a'; c.fillRect(2,-40,14,3);
   c.fillStyle='#f0b545'; c.beginPath(); c.moveTo(-10,-50); c.lineTo(-8,-62); c.lineTo(-2,-53); c.lineTo(4,-66); c.lineTo(10,-53); c.lineTo(16,-62); c.lineTo(18,-50); c.closePath(); c.fill(); },
};
function getSpr(type){
  let S=SPR[type]; if(S) return S;
  const d=EN[type],ss=d.boss?Math.min(SPR_SS,1.25):SPR_SS,pad=d.boss?d.r*1.45+30:d.r*1.3+16,w=Math.ceil((d.r+pad)*2),h=w,PW=Math.ceil(w*ss),PH=Math.ceil(h*ss);
  const tmp=mkCanvas(PW,PH),sil=mkCanvas(PW,PH),draw=EDRAW[d.base||type];   // d.base: reuse another painter (zone mobs) · d.r is still this type's own
  const mk=(f,dir,white)=>{
    const tc=tmp.getContext('2d'); tc.setTransform(1,0,0,1,0,0); tc.clearRect(0,0,PW,PH); tc.setTransform(ss,0,0,ss,PW/2,PH/2); if(dir) tc.scale(-1,1); draw(tc,f);
    if(d.tint){ tc.save(); tc.setTransform(1,0,0,1,0,0); tc.globalCompositeOperation='source-atop'; tc.globalAlpha=.35; tc.fillStyle=d.tint; tc.fillRect(0,0,PW,PH); tc.restore(); }
    const out=mkCanvas(PW,PH),oc=out.getContext('2d');
    if(white){ oc.drawImage(tmp,0,0); oc.globalCompositeOperation='source-in'; oc.fillStyle='#ffffff'; oc.fillRect(0,0,PW,PH); return out; }
    const sg=sil.getContext('2d'); sg.globalCompositeOperation='copy'; sg.drawImage(tmp,0,0); sg.globalCompositeOperation='source-in'; sg.fillStyle='#120c10'; sg.fillRect(0,0,PW,PH); sg.globalCompositeOperation='source-over';
    oc.setTransform(ss,0,0,ss,PW/2,PH/2); shadowE(oc,d.r); oc.setTransform(1,0,0,1,0,0);
    const o=Math.max(1,1.3*ss); for(const q of OFF8) oc.drawImage(sil,q[0]*o,q[1]*o);
    oc.drawImage(tmp,0,0); return out; };
  S={w,h,f:[0,1,2,3,0,1,2,3].map((f,i)=>mk(f,i>=4?1:0)),wh:[mk(1,0,1),mk(1,1,1)]};
  return SPR[type]=S;
}

