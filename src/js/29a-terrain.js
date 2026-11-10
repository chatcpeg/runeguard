/* ================= 29a-terrain.js · lane B · battle terrain: rocks, trees, bushes, water (docs/PROPOSAL-skill-trees.md §6.1) ================= */
// Endless fields: features are made per 640-px chunk from a seeded hash (same chunk = same layout for the whole run) around the
// player and dropped again far away. They live in G.obstacles (core 20: pushOutObstacles) — hard ones stop walkers and
// projectiles (rocks) or only walkers (tree trunks); soft ones slow whoever stands in them (bush 15 %, water/mud 30 %).
// Survival and the daily dungeons use it · classic and the trial never call terInit, so G.obstacles stays null there (golden).
const TER={CH:640, clear:230, keep:3, slowBush:.85, slowWater:.7, cap:12};
const TER_BIOME={
  haunted:{n:'ป่าหลอน', rock:[1,2], tree:[2,4], bush:[1,2], water:[0,1], wet:'mud', rk:['tomb','boulder'], tk:'dead', bk:'thorn'},
  meadow:{n:'ทุ่งดอกไม้', rock:[0,1], tree:[1,3], bush:[2,4], water:[0,1], wet:'water', rk:['boulder'], tk:'round', bk:'flower'},
  forest:{n:'ป่าหนามก็อบลิน', rock:[1,2], tree:[3,5], bush:[1,2], water:[0,1], wet:'water', rk:['boulder'], tk:'pine', bk:'thorn'},
  ruins:{n:'ซากวิหารรูน', rock:[2,3], tree:[0,1], bush:[1,2], water:[0,1], wet:'water', rk:['pillar','boulder'], tk:'round', bk:'thorn'}};
// tiny seeded PRNG (mulberry32) · chunk seed = hash(run seed, cx, cy)
function terRng(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }
function terHash(s,x,y){ let h=s^Math.imul(x,374761393)^Math.imul(y,668265263); h=Math.imul(h^h>>>13,1274126177); return h^h>>>16; }
function terInit(biome){
  G.obstacles={list:null, grid:new Map()};
  G.terrain={b:TER_BIOME[biome]?biome:'haunted', seed:(Math.random()*4294967296)>>>0, chunks:new Map(), t:0};
  terTick(0,true); }
function terCellsOf(o,f){ const x0=Math.floor((o.x-o.r)/CELL), x1=Math.floor((o.x+o.r)/CELL), y0=Math.floor((o.y-o.r)/CELL), y1=Math.floor((o.y+o.r)/CELL);
  for(let cx=x0;cx<=x1;cx++) for(let cy=y0;cy<=y1;cy++) f(gkey(cx,cy)); }
function terMake(cx,cy){
  const T=G.terrain, B=TER_BIOME[T.b], R=terRng(terHash(T.seed,cx,cy)), list=[], ox=cx*TER.CH, oy=cy*TER.CH;
  const n=a=>a[0]+Math.floor(R()*(a[1]-a[0]+1));
  const place=(k,r,o)=>{ for(let tries=0;tries<8;tries++){ const x=ox+r+12+R()*(TER.CH-2*r-24), y=oy+r+12+R()*(TER.CH-2*r-24);
      if(Math.hypot(x,y)<TER.clear+r) continue;                         // the start stays open
      if(list.some(q=>Math.hypot(q.x-x,q.y-y)<q.r+r+26)) continue;
      const f=Object.assign({x,y,r,k,v:Math.floor(R()*3)},o); list.push(f); return f; } return null; };
  for(let i=n(B.water);i>0;i--) place(B.wet,60+R()*50,{soft:TER.slowWater});
  for(let i=n(B.rock);i>0;i--){ const rk=B.rk[Math.floor(R()*B.rk.length)]; place('rock',rk==='pillar'?24+R()*10:rk==='tomb'?20+R()*8:34+R()*30,{hard:1, rk}); }
  for(let i=n(B.tree);i>0;i--) place('tree',15+R()*5,{tk:B.tk, cr:46+R()*22});
  for(let i=n(B.bush);i>0;i--) place('bush',26+R()*16,{soft:TER.slowBush, bk:B.bk});
  const key=cx+','+cy; for(const f of list){ f.ch=key; terCellsOf(f,g=>{ const a=G.obstacles.grid.get(g); if(a) a.push(f); else G.obstacles.grid.set(g,[f]); }); }
  T.chunks.set(key,{cx,cy,list}); }
function terDrop(key){ const T=G.terrain, C=T.chunks.get(key); if(!C) return;
  for(const f of C.list) terCellsOf(f,g=>{ const a=G.obstacles.grid.get(g); if(!a) return; const i=a.indexOf(f); if(i>=0) a.splice(i,1); if(!a.length) G.obstacles.grid.delete(g); });
  T.chunks.delete(key); }
// keep the chunks around the view made (every 0.25 s) and forget the far ones
function terTick(dt,now){ const T=G&&G.terrain; if(!T) return; T.t-=dt; if(T.t>0&&!now) return; T.t=.25;
  const CH=TER.CH, x0=Math.floor((P.x-VW/2-260)/CH), x1=Math.floor((P.x+VW/2+260)/CH), y0=Math.floor((P.y-VH/2-260)/CH), y1=Math.floor((P.y+VH/2+260)/CH);
  for(let cx=x0;cx<=x1;cx++) for(let cy=y0;cy<=y1;cy++) if(!T.chunks.has(cx+','+cy)) terMake(cx,cy);
  const pcx=Math.floor(P.x/CH), pcy=Math.floor(P.y/CH);
  for(const [k,C] of T.chunks) if(Math.abs(C.cx-pcx)>TER.keep||Math.abs(C.cy-pcy)>TER.keep) terDrop(k); }
// projectiles (player and enemy): a rock stops them (core 20 asks only when G.obstacles)
function terBlocks(x,y,r){ const a=G.obstacles.grid.get(gkey(Math.floor(x/CELL),Math.floor(y/CELL))); if(!a) return false;
  for(const f of a) if(f.hard&&(f.x-x)**2+(f.y-y)**2<(f.r+(r||0)*.5)**2) return true; return false; }

/* ---- drawing (sprites cached per kind/variant, scaled per feature) ---- */
const TER_SPR={};
function terSpr(key,w,h,paint){ let c=TER_SPR[key]; if(c) return c; c=mkCanvas(w*SPR_SS,h*SPR_SS); const g=c.getContext('2d'); g.scale(SPR_SS,SPR_SS); g.translate(w/2,h/2); paint(g); return TER_SPR[key]=c; }
const TER_OL='#120c10';
function terBlob(g,pts,fill,ol){ g.beginPath(); pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1])); g.closePath(); g.fillStyle=fill; g.fill(); if(ol){ g.lineWidth=3; g.strokeStyle=TER_OL; g.stroke(); } }
function terRockSpr(rk,v){ return terSpr('rock_'+rk+v,120,120,g=>{
  if(rk==='tomb'){ g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0,30,34,10,0,0,TAU); g.fill();
    g.fillStyle='#6d6a78'; g.strokeStyle=TER_OL; g.lineWidth=3; g.beginPath(); g.moveTo(-24,30); g.lineTo(-24,-14); g.arc(0,-14,24,PI,0); g.lineTo(24,30); g.closePath(); g.fill(); g.stroke();
    g.fillStyle='#858294'; g.fillRect(-18,-12,8,38); g.fillStyle='#4a4756'; g.fillRect(-3,-18,6,26); g.fillRect(-11,-10,22,6);
    if(v===1){ g.fillStyle='#5a7a4a'; g.beginPath(); g.ellipse(-12,26,14,6,0,0,TAU); g.fill(); } return; }
  if(rk==='pillar'){ g.fillStyle='rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0,34,30,10,0,0,TAU); g.fill();
    g.fillStyle='#a49a86'; g.strokeStyle=TER_OL; g.lineWidth=3; g.fillRect(-20,-30+v*8,40,62-v*8); g.strokeRect(-20,-30+v*8,40,62-v*8);
    g.fillStyle='#c8bea6'; g.fillRect(-26,-36+v*8,52,10); g.strokeRect(-26,-36+v*8,52,10); g.fillRect(-26,26,52,10); g.strokeRect(-26,26,52,10);
    g.fillStyle='#8a806c'; for(let i=-12;i<=12;i+=8) g.fillRect(i-1.5,-24+v*8,3,48-v*8); return; }
  const P0=[[-44,14],[-38,-14],[-16,-34],[14,-30],[40,-12],[46,14],[24,32],[-22,32]].map((p,i)=>[p[0]*(1+((v*7+i)%3-1)*.06),p[1]*(1+((v*5+i)%3-1)*.07)]);
  g.fillStyle='rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(0,30,48,13,0,0,TAU); g.fill();
  terBlob(g,P0,'#77736e',true); terBlob(g,[[-34,-6],[-14,-28],[12,-24],[30,-8],[6,-2]],'#9a958c',false); terBlob(g,[[-20,22],[10,18],[36,10],[24,30],[-14,30]],'#5b5853',false);
  g.strokeStyle='#4a4743'; g.lineWidth=2; g.beginPath(); g.moveTo(-8,-16); g.lineTo(2,4); g.lineTo(-4,18); g.stroke(); }); }
function terTrunkSpr(tk,v){ return terSpr('trunk_'+tk+v,60,70,g=>{ g.fillStyle='rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0,24,20,7,0,0,TAU); g.fill();
  const c=tk==='dead'?'#4a3e3a':tk==='pine'?'#5a3a24':'#6a4a2c'; g.fillStyle=c; g.strokeStyle=TER_OL; g.lineWidth=3; g.beginPath(); g.moveTo(-9,26); g.lineTo(-7,-26); g.lineTo(7,-26); g.lineTo(9,26); g.closePath(); g.fill(); g.stroke();
  g.fillStyle=shade(c,.18); g.fillRect(-5,-22,3,44); g.strokeStyle=shade(c,-.3); g.lineWidth=2; g.beginPath(); g.moveTo(-12,26); g.lineTo(-4,18); g.moveTo(12,26); g.lineTo(4,18); g.stroke(); }); }
function terCanopySpr(tk,v){ return terSpr('can_'+tk+v,160,160,g=>{
  if(tk==='dead'){ g.strokeStyle='#2e2628'; g.lineCap='round'; const br=(x,y,a,l,w)=>{ if(l<8) return; const x2=x+Math.cos(a)*l, y2=y+Math.sin(a)*l; g.lineWidth=w; g.beginPath(); g.moveTo(x,y); g.lineTo(x2,y2); g.stroke(); br(x2,y2,a-.5-v*.05,l*.66,w*.7); br(x2,y2,a+.45+v*.04,l*.6,w*.7); };
    br(0,40,-PI/2,40,8); g.strokeStyle='#4a3e3a'; br(0,40,-PI/2,40,4); return; }
  const base=tk==='pine'?['#1f4a2a','#2a5e34','#3a7a44']:['#2f6a2e','#3e8a3a','#5aa84a'];
  if(tk==='pine'){ for(let i=0;i<3;i++){ const y=26-i*26, w=58-i*14; g.fillStyle=base[i]; g.strokeStyle=TER_OL; g.lineWidth=3; g.beginPath(); g.moveTo(-w,y+16); g.lineTo(0,y-30); g.lineTo(w,y+16); g.closePath(); g.fill(); g.stroke(); } return; }
  const blobs=[[-30,6,34],[28,4,34],[0,-22,38],[-12,20,30],[16,22,30]];
  g.fillStyle=TER_OL; for(const b of blobs){ g.beginPath(); g.arc(b[0],b[1],b[2]+3,0,TAU); g.fill(); }
  blobs.forEach((b,i)=>{ g.fillStyle=base[i%2]; g.beginPath(); g.arc(b[0],b[1],b[2],0,TAU); g.fill(); });
  g.fillStyle=base[2]; for(const b of blobs){ g.beginPath(); g.arc(b[0]-b[2]*.3,b[1]-b[2]*.35,b[2]*.45,0,TAU); g.fill(); }
  if(v===2){ g.fillStyle='#d84a4a'; for(const p of [[-20,-4],[18,-12],[4,14],[-30,18]]){ g.beginPath(); g.arc(p[0],p[1],4,0,TAU); g.fill(); } } }); }
function terBushSpr(bk,v){ return terSpr('bush_'+bk+v,110,90,g=>{ const c=bk==='flower'?['#3e7a3a','#5a9a48']:['#3a4a2e','#4e5e3a'];
  const bl=[[-26,8,20],[24,8,20],[0,-6,24],[-8,14,18],[12,14,18]]; g.fillStyle='rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(0,26,44,10,0,0,TAU); g.fill();
  g.fillStyle=TER_OL; for(const b of bl){ g.beginPath(); g.arc(b[0],b[1],b[2]+2.5,0,TAU); g.fill(); }
  bl.forEach((b,i)=>{ g.fillStyle=c[i%2]; g.beginPath(); g.arc(b[0],b[1],b[2],0,TAU); g.fill(); });
  if(bk==='flower'){ const fc=['#ffd84a','#ff8ab0','#ffffff'][v]; g.fillStyle=fc; for(const p of [[-24,0],[-4,-14],[18,-2],[6,10],[-14,14],[28,12]]){ g.beginPath(); g.arc(p[0],p[1],3.4,0,TAU); g.fill(); } }
  else { g.strokeStyle='#22301c'; g.lineWidth=2; for(const p of [[-30,-2],[-6,-22],[22,-6],[30,10]]){ g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(p[0]+(p[0]>0?6:-6),p[1]-6); g.stroke(); } } }); }
function terWetSpr(k,v){ return terSpr('wet_'+k+v,220,140,g=>{ const water=k==='water';
  g.fillStyle=water?'#2a5a7a':'#4a3a26'; g.beginPath(); g.ellipse(0,0,104,62,v*.2,0,TAU); g.fill();
  g.fillStyle=water?'#3a7aa0':'#5e4a30'; g.beginPath(); g.ellipse(-6,-4,88,48,v*.2,0,TAU); g.fill();
  g.strokeStyle=water?'rgba(200,236,255,.45)':'rgba(120,96,64,.6)'; g.lineWidth=2.5; for(let i=0;i<3;i++){ g.beginPath(); g.ellipse(-20+i*22,-10+i*8,22-i*4,6,0,0,PI); g.stroke(); }
  g.strokeStyle=water?'#1a3a50':'#2e2416'; g.lineWidth=3; g.beginPath(); g.ellipse(0,0,104,62,v*.2,0,TAU); g.stroke(); }); }
function terVisible(L,T,R,B,f){ const g=G.terrain; if(!g) return; for(const C of g.chunks.values()) for(const o of C.list){ const m=(o.cr||o.r)+70; if(o.x<L-m||o.x>R+m||o.y<T-m||o.y>B+m) continue; f(o); } }
// ground pass (core 22: mode.drawWorld, before the actors): water/mud → bushes → rocks → tree trunks
function terDrawGround(L,T,R,B){ if(!G.terrain) return; const S=SPR_SS, dr=(img,x,y,sc)=>{ const w=img.width/S*sc, h=img.height/S*sc; ctx.drawImage(img,x-w/2,y-h/2,w,h); };
  terVisible(L,T,R,B,o=>{ if(o.k==='water'||o.k==='mud') dr(terWetSpr(o.k,o.v),o.x,o.y,o.r/96); });
  terVisible(L,T,R,B,o=>{ if(o.k==='bush') dr(terBushSpr(o.bk,o.v),o.x,o.y,o.r/40); });
  terVisible(L,T,R,B,o=>{ if(o.k==='rock') dr(terRockSpr(o.rk,o.v),o.x,o.y-(o.rk==='boulder'?0:o.r*.4),o.rk==='boulder'?o.r/44:o.r/24); else if(o.k==='tree') dr(terTrunkSpr(o.tk,o.v),o.x,o.y-o.r*.9,o.r/14); }); }
// canopy pass (mode.drawOver, after the actors): a canopy over the player fades so the hero stays visible
function terDrawOver(L,T,R,B){ if(!G.terrain) return; const S=SPR_SS;
  terVisible(L,T,R,B,o=>{ if(o.k!=='tree') return; const img=terCanopySpr(o.tk,o.v), sc=o.cr/58, w=img.width/S*sc, h=img.height/S*sc, cy=o.y-o.r*2.2-o.cr*.55;
    const near=Math.hypot(P.x-o.x,P.y-cy)<o.cr*1.05; ctx.globalAlpha=near?.42:.96; ctx.drawImage(img,o.x-w/2,cy-h/2,w,h); ctx.globalAlpha=1; }); }

/* ---- survival gets the haunted forest ---- */
{ const S=MODES.survival, i0=S.init, u0=S.update, o0=S.drawOver;
  S.init=function(opts){ i0.call(this,opts); terInit('haunted'); };
  S.update=function(dt){ terTick(dt); u0.call(this,dt); };
  S.drawWorld=function(L,T,R,B){ terDrawGround(L,T,R,B); };
  S.drawOver=function(L,T,R,B){ terDrawOver(L,T,R,B); if(o0) o0.call(this,L,T,R,B); }; }
