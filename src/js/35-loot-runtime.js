/* ================= 35-loot-runtime.js · lane E · loot on the ground (ITEMKIND.loot / .gold / .bosschest) · gear painters ================= */
// In-run drops are gems in G.gems with new kinds (core collect / drawItem hand unknown kinds to ITEMKIND). A pickup only adds to
// G.loot (items) or G.goldRun (gold): lane C's onRunEnd → grantRewards commits them once per runId. Nothing here writes the save.
// Scatter uses rngUnit() (crypto), never Math.random, so a seeded RG.sim keeps its stream. Classic never creates these kinds.
const LT_KIND_C={use:'#ff6a7a', mat:'#ffd36a', rune:'#b58cff', dye:'#ff9ad5'};
const LT_ID_C={m_crystal:'#7fe8ff', m_seal:'#fff1b0'};
function ltGem(x,y,kind,o){
  if(typeof G==='undefined'||!G||!Array.isArray(G.gems)) return null;
  const a=rngUnit()*TAU, s=30+rngUnit()*50;
  const g=Object.assign({x:+x||0, y:+y||0, vx:Math.cos(a)*s, vy:Math.sin(a)*s-50, v:0, kind, mag:false, sp:0, t:0, dead:false},o);
  G.gems.push(g); return g; }
function dropLoot(x,y,list){ if(!Array.isArray(list)) return; for(const it of list) if(it&&typeof it==='object'&&itemDef(it.id)) ltGem(x,y,'loot',{it}); }
function dropGold(x,y,n){ n=Math.floor(+n||0); if(n>0) ltGem(x,y,'gold',{gold:n}); }
// a box that holds several items (field boss / wave boss · §8.12 "เปิดกล่อง"): G.chest = {list, gold, t} after pickup
function ltDropChest(x,y,list,gold){ if(Array.isArray(list)&&(list.length||gold>0)) ltGem(x,y,'bosschest',{list:list.slice(), gold:Math.max(0,Math.floor(+gold||0))}); }
function ltName(it){ const d=itemDef(it&&it.id); return (it&&it.u?itemName(it):d?d.n:'?')+(it&&it.n>1?' ×'+it.n:''); }
function ltColor(it){ const d=itemDef(it&&it.id); if(!d) return '#d8e8ff'; if(itGear(d)) return IT_RAR[d.rar|0].c;
  return itHas(LT_ID_C,it.id)?LT_ID_C[it.id]:d.makes?'#8fb8ff':itHas(LT_KIND_C,d.kind)?LT_KIND_C[d.kind]:'#d8e8ff'; }

ITEMKIND.loot={
  collect(g){ if(!g.it) return; (G.loot||(G.loot=[])).push(g.it); addText(P.x,P.y-46,ltName(g.it),ltColor(g.it)); sfx('pickup'); },
  draw(c,g){ ltDrawLoot(c,g); }};
ITEMKIND.gold={
  collect(g){ G.goldRun=(G.goldRun|0)+(g.gold|0); addText(P.x,P.y-40,'+'+(g.gold|0)+' ทอง','#f0c75a'); sfx('pickup'); },
  draw(c,g){ ltDrawCoin(c,g); }};
ITEMKIND.bosschest={
  collect(g){ const L=G.loot||(G.loot=[]), list=Array.isArray(g.list)?g.list:[]; for(const it of list) L.push(it);
    if(g.gold) G.goldRun=(G.goldRun|0)+(g.gold|0);
    G.chest={list:list.slice(), gold:g.gold|0, t:G.t};
    addText(P.x,P.y-52,'กล่องสมบัติ!','#f0c75a',true); burst(g.x,g.y,14,'#f0c75a',160,.6,3); sfx('level'); },
  glow(c,g){ ltChestGlow(c,g); }, draw(c,g){ ltDrawChest(c,g); }};

function ltBob(g){ return Math.sin(G.t*4+g.x*.05)*2; }
function ltDiamond(c,x,y,s,col){
  c.fillStyle=shade(col,-.55); c.beginPath(); c.moveTo(x,y-s-1.3); c.lineTo(x+(s+1.3)*.75,y); c.lineTo(x,y+s+1.3); c.lineTo(x-(s+1.3)*.75,y); c.closePath(); c.fill();
  c.fillStyle=col; c.beginPath(); c.moveTo(x,y-s); c.lineTo(x+s*.72,y); c.lineTo(x,y+s); c.lineTo(x-s*.72,y); c.closePath(); c.fill();
  c.fillStyle='rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(x,y-s); c.lineTo(x+s*.36,y-s*.2); c.lineTo(x,y); c.closePath(); c.fill(); }
// ground items are painted once per look into one shared atlas (2× · 32×32 cells) and then blitted: vector paths every frame cost
// ~25–50 µs per item on the GPU canvas, and blits from many small canvases break batching (20 items on screen at wave 15 was
// +40% renderMs · §7.10); sub-rects of one texture batch like the xp gems do · a full atlas (more than 32 looks) falls back to own canvases
const LT_SS=2, LT_CELL=32, LT_COLS=8, LT_ROWS=4, LT_ATL={c:null, g:null, n:0, map:new Map()};
function ltSpr(key,paint){ const A=LT_ATL; let s=A.map.get(key); if(s) return s;
  const S=LT_CELL*LT_SS; let src, sx=0, sy=0, g;
  if(A.n<LT_COLS*LT_ROWS){ if(!A.c){ A.c=mkCanvas(S*LT_COLS,S*LT_ROWS); A.g=A.c.getContext('2d'); }
    const i=A.n++; sx=(i%LT_COLS)*S; sy=(i/LT_COLS|0)*S; src=A.c; g=A.g; }
  else { src=mkCanvas(S,S); g=src.getContext('2d'); }
  g.save(); g.setTransform(LT_SS,0,0,LT_SS,sx+S/2,sy+S/2); g.beginPath(); g.rect(-LT_CELL/2,-LT_CELL/2,LT_CELL,LT_CELL); g.clip(); paint(g); g.restore();
  s={c:src, sx, sy}; A.map.set(key,s); return s; }
function ltBlit(c,s,x,y){ const S=LT_CELL*LT_SS; c.drawImage(s.c,s.sx,s.sy,S,S,x-LT_CELL/2,y-LT_CELL/2,LT_CELL,LT_CELL); }
// the sprite is looked up once per ground item (g.spr) · per frame only the bob and one blit remain
function ltDrawLoot(c,g){ const s=g.spr||(g.spr=ltLootSpr(g.it)); if(s) ltBlit(c,s,g.x,g.y+ltBob(g)); }
function ltLootSpr(it){
  const d=itemDef(it&&it.id); if(!d) return null;
  if(itGear(d)){ const col=IT_RAR[d.rar|0].c; return ltSpr('p'+col,q=>ltPaintPouch(q,col)); }
  if(d.use&&d.use.heal){ const r=d.use.heal>.3?6.2:5; return ltSpr('h'+r,q=>ltPaintFlask(q,r)); }
  const sz=d.kind==='rune'?7:5.5, col=ltColor(it); return ltSpr('d'+sz+col,q=>ltDiamond(q,0,0,sz,col)); }
function ltPaintPouch(c,col){ const x=0, y=0;                            // a little tied pouch in the rarity colour
  c.fillStyle='#21170f'; rrect(c,x-7.5,y-6.5,15,14,4.5); c.fill(); c.fillStyle=col; rrect(c,x-6,y-5,12,11,3.5); c.fill();
  c.fillStyle=shade(col,-.45); c.fillRect(x-6,y-1.2,12,2.2); c.fillStyle='rgba(255,255,255,.6)'; c.fillRect(x-4.2,y-3.6,3,1.6);
  c.strokeStyle='#21170f'; c.lineWidth=1.6; c.lineCap='round'; c.beginPath(); c.moveTo(x-3.5,y-6); c.lineTo(x,y-9.5); c.lineTo(x+3.5,y-6); c.stroke(); }
function ltPaintFlask(c,r){ const x=0, y=0;                              // potion flask
  c.fillStyle='#2a1018'; c.beginPath(); c.arc(x,y+1.5,r+1.4,0,TAU); c.fill(); c.fillRect(x-2.6,y-r-3.5,5.2,6);
  circ(c,'#ff5a6a',x,y+1.5,r); c.fillStyle='#e9e2cf'; c.fillRect(x-1.8,y-r-2.6,3.6,4.2); circ(c,'#ffd0d6',x-1.8,y,1.4); }
function ltDrawCoin(c,g){ ltBlit(c,g.spr||(g.spr=ltSpr('coin',ltPaintCoin)),g.x,g.y+ltBob(g)); }
function ltPaintCoin(c){ const x=0, y=0;
  circ(c,'#6a4a12',x,y,6.2); circ(c,'#f0c75a',x,y,5); circ(c,'#ffe79a',x-1.4,y-1.4,2); c.fillStyle='#b8902a'; c.fillRect(x-.8,y-2.6,1.6,5.2); }
// the chest's own gold glow: core draws it in its 'lighter' pass (ITEMKIND.glow · 22-render drawItemsExt), before every body
function ltChestGlow(c,g){ const x=g.x, y=g.y+ltBob(g)*1.5, a=c.globalAlpha; c.globalAlpha=.5+.25*Math.sin(G.t*5); c.drawImage(glowTex('#f0c75a'),x-30,y-30,60,60); c.globalAlpha=a; }
function ltDrawChest(c,g){ ltBlit(c,g.spr||(g.spr=ltSpr('chest',ltPaintChest)),g.x,g.y+ltBob(g)*1.5); }
function ltPaintChest(c){ const x=0, y=0, k=1.25;
  c.fillStyle='#120c1e'; rrect(c,x-10*k,y-7*k,20*k,15*k,3); c.fill(); c.fillStyle='#3a4fa0'; rrect(c,x-9*k,y-6*k,18*k,13*k,2.5); c.fill();
  c.fillStyle='#f0c75a'; c.fillRect(x-9*k,y-1.5*k,18*k,2.6*k); c.fillRect(x-1.5*k,y-6*k,3*k,13*k); circ(c,'#fff2c0',x,y,1.9); }

// §4.4 มงกุฎใบเงิน (look hat 'leafcrown'): a silver leaf circlet drawn over the hair (hero local space, like drawHat)
HAT_EXT.leafcrown=function(c,L,t){
  const C=L.hatC||'#dfe6ee', D=shade(C,-.42); c.lineCap='round';
  c.strokeStyle=D; c.lineWidth=3.4; c.beginPath(); c.ellipse(1,-20,10.6,3.2,0,PI*.92,PI*2.08); c.stroke();
  c.strokeStyle=C; c.lineWidth=2; c.beginPath(); c.ellipse(1,-20,10.6,3.2,0,PI*.92,PI*2.08); c.stroke();
  for(let i=0;i<5;i++){ const a=PI*1.1+i*PI*.2, x=1+Math.cos(a)*10.6, y=-20+Math.sin(a)*3.2, sw=Math.sin(t*2+i)*.05;
    c.save(); c.translate(x,y); c.rotate((a-PI*1.5)*.8+sw); c.fillStyle=D; c.beginPath(); c.ellipse(0,-3.2,2.3,4.1,0,0,TAU); c.fill();
    c.fillStyle=C; c.beginPath(); c.ellipse(0,-3.3,1.4,3.2,0,0,TAU); c.fill(); c.restore(); }
  circ(c,'#9fd8ff',8.5,-21,1.9); circ(c,'#ffffff',8,-21.6,.7); };

// ท่องแดนรูน boss crowns (look hat 'crown': มงกุฎสนิมราชา · มงกุฎวุ้นหกสี): a band with 5 points over the hair · hatC metal · ornC gems
HAT_EXT.crown=function(c,L,t){
  const C=L.hatC||'#d9a93a', D=shade(C,-.45), G2=L.ornC||'#ff5a6a';
  c.fillStyle=D; c.beginPath(); c.moveTo(-9.5,-17); c.lineTo(11.5,-17); c.lineTo(11,-21); c.lineTo(-9,-21); c.closePath(); c.fill();
  c.fillStyle=C; c.beginPath(); c.moveTo(-9,-17.6);
  for(let i=0;i<5;i++){ const x=-9+i*5, h=i===2?9:i===1||i===3?7:5.5; c.lineTo(x+1.2,-20.5); c.lineTo(x+2.5,-20.5-h); c.lineTo(x+3.8,-20.5); }
  c.lineTo(11,-20.5); c.lineTo(11,-17.6); c.closePath(); c.fill();
  c.fillStyle=shade(C,.25); c.fillRect(-9,-19.6,20,1.2);
  const tw=.75+.25*Math.sin(t*3);
  for(const [x,y,r] of [[1,-19,1.9],[-5,-18.8,1.3],[7,-18.8,1.3]]){ circ(c,G2,x,y,r); c.globalAlpha*=tw; circ(c,'#ffffff',x-.5,y-.6,r*.4); c.globalAlpha/=tw; } };

// potion in a character run (useConsumable → here): heal % of max HP · shared cooldown BAL.FIELD.potCd (G.potT) · 1 from the bag
function ltPotion(ch,id,pct){
  if(typeof G==='undefined'||!G||!P||G.over||!G.char||!ch||G.char.id!==ch.id) return false;
  if((G.potT||0)>G.t||P.hp>=P.maxHp) return false;
  if(!invRemove(G.char,id,1)) return false;
  G.potT=G.t+BAL.FIELD.potCd; healP(P.maxHp*pct); sfx('heal'); return true; }

// dev hooks (§7.9): RG.loot.roll(table, n, luck) = average count per roll of each id · seed(n) = seeded drops (null = crypto)
DEV.loot={
  roll(table,n,luck){ n=Math.max(1,Math.min(1e6,n|0||1000)); const h=new Map();
    for(let i=0;i<n;i++) for(const it of rollDrops(table,luck||1)) h.set(it.id,(h.get(it.id)||0)+(it.n||1));
    const o={}; for(const k of [...h.keys()].sort()) o[k]=Math.round(h.get(k)/n*1e4)/1e4; return o; },
  seed(s){ itDropRng=s==null?null:mulberry(s>>>0); return s==null?'crypto':'seeded'; },
  drop(list){ if(!G||!P) return 'no run'; dropLoot(P.x+40,P.y,list||rollDrops('surv.boss20',1)); return G.gems.length; },
  gold(n){ if(!G||!P) return 'no run'; dropGold(P.x+40,P.y,n||25); return G.gems.length; },
  chest(){ if(!G||!P) return 'no run'; ltDropChest(P.x+60,P.y,rollDrops('surv.boss20',1),50); return G.gems.length; } };
