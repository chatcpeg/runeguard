/* ================= 63-field-render.js · lane F · map layout (terrain, landmarks, monster nests) + everything drawn in a map ================= */
// fdBuild(z): the whole map once from its seed — edge cliffs, landmarks (camps, stream + bridges, altar, hot springs, palisade),
// then the biome scatter of 29a (rocks, trees, bushes, water) — into G.terrain / G.obstacles in the same shape 29a draws and core 20
// collides (chunks of 640 px, a CELL grid). fdNests(z) places the monster nests on free ground. Drawing: painted art first (12b ·
// ak0 keys), vector fallbacks here. Minimap = one canvas per map + a few dots per frame (§5.2).
const FD_EDGE={step:210, r:[98,122]};
function fdBuild(z){
  const R=terRng(z.seed>>>0), B=TER_BIOME[z.biome]||TER_BIOME.forest, feats=[], keep=[], W=z.w, H=z.h;
  const add=o=>{ if(o.v==null) o.v=Math.floor(R()*3); feats.push(o); return o; };
  const blocks=f=>!f.soft&&f.k!=='flat';
  const free=(x,y,r,m)=>{ if(x<r+50||y<r+50||x>W-r-50||y>H-r-50) return false;
    for(const k of keep) if((k[0]-x)**2+(k[1]-y)**2<(k[2]+r)**2) return false;
    for(const f of feats){ if(f.k==='flat') continue; const q=f.r+r+(m==null?18:m); if((f.x-x)**2+(f.y-y)**2<q*q) return false; } return true; };
  const pts=[[z.entry.x,z.entry.y,220]].concat(z.portals.map(p=>[p.x,p.y,190])); if(z.boss) pts.push([z.boss.x,z.boss.y,210]);
  for(const p of pts) keep.push(p);
  for(const p of z.portals) add({k:'prop', ak0:'t_portal', pk:'portal', x:p.x, y:p.y-4, r:30, aw:112, fy:.15, soft:1, ng:1, to:p.to});
  // edge cliffs (outside the walkable rect, half in view) · gaps for the portals on that edge
  const mk=B.mk&&B.mk.length?B.mk:['t_mount_rock0'];
  const edge=(x,y)=>{ if(z.portals.some(p=>(p.x-x)**2+(p.y-y)**2<240*240)) return; add({k:'mount', x, y, r:FD_EDGE.r[0]+R()*(FD_EDGE.r[1]-FD_EDGE.r[0]), hard:1, mk:mk[Math.floor(R()*mk.length)], edge:1}); };
  for(let x=-40;x<=W+40;x+=FD_EDGE.step){ edge(x+R()*40-20,-58-R()*20); edge(x+R()*40-20,H+58+R()*20); }
  for(let y=FD_EDGE.step*.5;y<=H;y+=FD_EDGE.step){ edge(-58-R()*20,y+R()*40-20); edge(W+58+R()*20,y+R()*40-20); }
  const out={chests:[], camps:[], towers:[], fort:null};
  // g1: a stream cut through the forest (two plank bridges) + fenced goblin camps
  if(z.stream){ const S=z.stream, sx=y=>S.x+S.amp*Math.sin(y/S.per);
    for(let y=-30;y<=H+30;y+=68){ if(S.bridges.some(b=>Math.abs(y-b)<118)) continue; add({k:'water', x:sx(y)+R()*14-7, y, r:58+R()*12, soft:TER.slowWater}); }
    for(const b of S.bridges){ const a=Math.atan2(1,(S.amp/S.per)*Math.cos(b/S.per)); add({k:'flat', fk:'bridge', x:sx(b), y:b, r:96, ang:a+PI/2}); keep.push([sx(b),b,150]); } }
  for(const c of z.camps||[]){ keep.push([c.x,c.y,c.r+36]); out.camps.push(c);
    const n=Math.round(TAU*c.r/46); for(let i=0;i<n;i++){ const a=i*TAU/n; if(Math.abs(angDiff(a,c.gate))<.44) continue;
      add({k:'prop', ak0:'t_fence0', pk:'fence', x:c.x+Math.cos(a)*c.r, y:c.y+Math.sin(a)*c.r*.82, r:19, aw:62, fy:.45, ang:a, brk:1}); }   // brk: a field boss breaks it (64)
    const tp=[]; for(let i=0;i<c.tents;i++){ const a=c.gate+PI+(i-(c.tents-1)/2)*.95, x=c.x+Math.cos(a)*c.r*.58, y=c.y+Math.sin(a)*c.r*.5; tp.push([x,y]); add({k:'prop', ak0:'t_tent_goblin', pk:'tent', x, y, r:30, aw:104, fy:.42}); }
    const fx=c.big?c.x-c.r*.42:c.x, fy=c.big?c.y+c.r*.3:c.y; add({k:'prop', ak0:'t_campfire0', pk:'fire', x:fx, y:fy, r:14, aw:60, fy:.35, glow:1});
    // the camp chest: the spot (between the gate and the tents) furthest from every tent picture (104 px wide) and the fire
    let cb=null, cd=-1; for(const o of [2,-2,1.7,-1.7,1.4,-1.4]){ const a=c.gate+PI+o, x=c.x+Math.cos(a)*c.r*.62, y=c.y+Math.sin(a)*c.r*.5;
      let m=Math.hypot(x-fx,y-fy)+30; for(const q of tp) m=Math.min(m,Math.hypot(x-q[0],y-q[1])); if(m>cd){ cd=m; cb={x, y}; } }
    out.chests.push(cb); }
  // s1: the rune altar in the middle + the four element corners
  if(z.altar){ const A=z.altar; keep.push([A.x,A.y,A.r+70]); add({k:'flat', ak0:'t_altar_rune', fk:'altar', x:A.x, y:A.y, r:A.r, aw:A.r*2.1});
    for(let i=0;i<4;i++){ const a=PI/4+i*PI/2; add({k:'rock', rk:'pillar', x:A.x+Math.cos(a)*(A.r+44), y:A.y+Math.sin(a)*(A.r+30), r:24, hard:1}); } }
  for(const C of z.corners||[]){ const rx=()=>C.x0+R()*(C.x1-C.x0), ry=()=>C.y0+R()*(C.y1-C.y0);
    const put=(n,mkf)=>{ for(let i=0,k=0;i<n&&k<n*14;k++){ const x=rx(), y=ry(), o=mkf(); if(free(x,y,o.r,o.m)){ o.x=x; o.y=y; delete o.m; add(o); i++; } } };
    if(C.deco==='grass') put(24,()=>({k:'bush', bk:'flower', r:26+R()*16, soft:TER.slowBush, m:4}));
    if(C.deco==='bog') put(14,()=>({k:'water', r:60+R()*40, soft:TER.slowWater, m:6}));
    if(C.deco==='crystal') put(8,()=>({k:'mount', mk:'t_mount_crystal0', r:55+R()*22, hard:1, m:60}));
    if(C.deco==='spring') put(4,()=>({k:'flat', ak0:'t_hotspring', fk:'spring', r:70+R()*18, aw:190, m:40}));
    if(C.deco==='spring'||C.deco==='crystal'){ for(let k=0;k<40;k++){ const x=rx(), y=ry(); if(free(x,y,30,40)){ out.chests.push({x,y}); keep.push([x,y,60]); break; } } } }
  // o1: the palisade (two gates) + tents + the canyon cliffs leading up to it
  if(z.fort){ const Fo=z.fort; out.fort=Fo;
    const gap=(side,v)=>Fo.gates.some(g=>g.side===side&&Math.abs(v-g.at)<g.w/2);
    const wall=(x,y,a)=>add({k:'prop', ak0:'t_wall_log', pk:'wall', x, y, r:30, aw:84, fy:.42, ang:a, brk:1});
    for(let x=Fo.x0;x<=Fo.x1;x+=62){ wall(x,Fo.y0,0); if(!gap('s',x)) wall(x,Fo.y1,0); }
    for(let y=Fo.y0+62;y<Fo.y1;y+=62){ if(!gap('w',y)) wall(Fo.x0,y,PI/2); wall(Fo.x1,y,PI/2); }
    for(const t of Fo.tents) add({k:'prop', ak0:'t_tent_orc', pk:'otent', x:t[0], y:t[1], r:38, aw:124, fy:.42});
    add({k:'prop', ak0:'t_campfire0', pk:'fire', x:1820, y:1160, r:14, aw:60, fy:.35, glow:1});
    out.chests.push({x:Fo.x0+170, y:Fo.y0+250}, {x:Fo.x1-170, y:Fo.y1-170}); out.towers=Fo.towers; }
  for(const L of z.canyon||[]){ const [x,y0,y1]=L, n=Math.floor((y1-y0)/170), skip=Math.floor(n/2);
    for(let i=0;i<=n;i++){ if(i===skip) continue; add({k:'mount', mk:'t_mount_red0', x:x+R()*30-15, y:y0+i*170, r:96+R()*16, hard:1}); } }
  const inFort=(x,y,m)=>out.fort&&x>out.fort.x0-m&&x<out.fort.x1+m&&y>out.fort.y0-m&&y<out.fort.y1+m;
  // biome scatter per 640-px chunk (densities of 29a TER_BIOME)
  const n=a=>a[0]+Math.floor(R()*(a[1]-a[0]+1));
  for(let cx=0;cx*TER.CH<W;cx++) for(let cy=0;cy*TER.CH<H;cy++){ const ox=cx*TER.CH, oy=cy*TER.CH;
    const place=(r,o,m)=>{ for(let t=0;t<10;t++){ const x=ox+R()*TER.CH, y=oy+R()*TER.CH; if(inFort(x,y,r+40)||!free(x,y,r,m)) continue; o.x=x; o.y=y; o.r=r; return add(o); } return null; };
    if(B.mount&&R()<B.mount*.6) place(80+R()*30,{k:'mount', hard:1, mk:mk[Math.floor(R()*mk.length)]},70);
    for(let i=n(B.water);i>0;i--) place(56+R()*44,{k:B.wet, soft:TER.slowWater},10);
    for(let i=n(B.rock);i>0;i--){ const rk=B.rk[Math.floor(R()*B.rk.length)]; place(rk==='pillar'?24+R()*10:30+R()*26,{k:'rock', hard:1, rk},24); }
    for(let i=n(B.tree);i>0;i--) place(15+R()*5,{k:'tree', tk:B.tk, cr:46+R()*22},40);
    for(let i=n(B.bush);i>0;i--) place(26+R()*16,{k:'bush', soft:TER.slowBush, bk:B.bk},6); }
  out.feats=feats; out.keep=keep; out.R=R; return out; }
// put a built map into G (terrain chunks for 29a drawing + the obstacle grid core 20 collides with)
function fdTerrain(z,L){ G.obstacles={list:null, grid:new Map()}; G.terrain={b:z.biome, seed:z.seed>>>0, chunks:new Map(), t:0, fixed:1};
  for(const f of L.feats){ const cx=Math.floor(f.x/TER.CH), cy=Math.floor(f.y/TER.CH), key=cx+','+cy; let C=G.terrain.chunks.get(key);
    if(!C){ C={cx, cy, list:[]}; G.terrain.chunks.set(key,C); } C.list.push(f); f.ch=key;
    if(f.k==='flat'||f.ng) continue; terCellsOf(f,g=>{ const a=G.obstacles.grid.get(g); if(a) a.push(f); else G.obstacles.grid.set(g,[f]); }); }
  if(typeof artPreload==='function'){ const ks=terArtKeys(z.biome); for(const f of L.feats){ const k=f.ak0||f.mk; if(k&&ks.indexOf(k)<0) ks.push(k); }
    ks.push('t_portal','t_chest_gold','t_tower_orc'); artPreload(ks); } }
// a field boss walked into a fence / log wall (f.brk · 64 BOSS_PAT.smash): it breaks — out of the collision grid and the drawing
// until the map is entered again (fdBuild makes it anew) · the minimap keeps it
function fdBreak(f){ if(f.gone) return; f.gone=1; const ob=G.obstacles;
  if(ob&&ob.grid) terCellsOf(f,g=>{ const a=ob.grid.get(g); if(!a) return; const i=a.indexOf(f); if(i>=0) a.splice(i,1); if(!a.length) ob.grid.delete(g); });
  const C=G.terrain&&G.terrain.chunks.get(f.ch); if(C){ const i=C.list.indexOf(f); if(i>=0) C.list.splice(i,1); }
  burst(f.x,f.y-16,14,'#8a6a4a',240,.6,4,'rock'); G.shake=Math.max(G.shake,6); if(!G.auto) sfx('hit'); }
// monster nests: regions (weighted mix, pack sizes), camp guards (one nest per camp: they wake together), towers + their archers
function fdNests(z,L){ const R=L.R, nests=[], recs=[], W=z.w, H=z.h;
  const ok=(x,y,r)=>{ if(x<r+40||y<r+40||x>W-r-40||y>H-r-40) return false; for(const f of L.feats){ if(f.soft||f.k==='flat') continue; const q=f.r+r+6; if((f.x-x)**2+(f.y-y)**2<q*q) return false; } return true; };
  const far=(x,y)=>{ if((x-z.entry.x)**2+(y-z.entry.y)**2<340*340) return false; for(const p of z.portals) if((x-p.x)**2+(y-p.y)**2<300*300) return false; return true; };
  const rec=(type,x,y,nest,o)=>{ const d=EN[type]; if(!d) return null; let px=x, py=y;
    for(let t=0;t<12&&!ok(px,py,d.r);t++){ const a=R()*TAU, r=12+R()*60; px=x+Math.cos(a)*r; py=y+Math.sin(a)*r; }
    if(!ok(px,py,d.r)) return null;
    const q=Object.assign({type, x:px, y:py, lv:d.lv|0||1, st:'alive', t:0, e:null, rank:null, hpF:1, nest, el:null},o||{}); recs.push(q); nest.recs.push(q); return q; };
  const pickW=mix=>{ let s=0; for(const m of mix) s+=m[1]; let u=R()*s; for(const m of mix){ u-=m[1]; if(u<=0) return m[0]; } return mix[0][0]; };
  const inFort=(x,y)=>L.fort&&x>L.fort.x0&&x<L.fort.x1&&y>L.fort.y0&&y<L.fort.y1;
  for(const G0 of z.regions||[]) for(let i=0;i<G0.n;i++){
    for(let t=0;t<30;t++){ const x=G0.x0+R()*(G0.x1-G0.x0), y=G0.y0+R()*(G0.y1-G0.y0);
      if(!far(x,y)||!ok(x,y,26)||(!G0.inner&&inFort(x,y))||nests.some(n=>(n.x-x)**2+(n.y-y)**2<230*230)) continue;
      const type=pickW(G0.mix), d=EN[type], pk=d.pack||[1,1], cnt=pk[0]+Math.floor(R()*(pk[1]-pk[0]+1)), nest={x, y, r:110, alert:-9, recs:[]};
      const el=d.cornerEl?(G0.el||['fire','water','wind','earth'][Math.floor(R()*4)]):null;
      for(let k=0;k<cnt;k++){ const a=k*TAU/cnt+R(), rr=cnt>1?28+R()*26:0; rec(type,x+Math.cos(a)*rr,y+Math.sin(a)*rr,nest,{el, slot:d.kit&&d.kit.row?k-(cnt-1)/2:null}); }
      if(nest.recs.length) nests.push(nest); break; } }
  for(const c of L.camps){ const nest={x:c.x, y:c.y, r:c.r, alert:-9, recs:[], camp:1};
    for(const [type,cnt] of c.guards) for(let k=0;k<cnt;k++){ const a=R()*TAU, rr=R()*c.r*.55; rec(type,c.x+Math.cos(a)*rr,c.y+Math.sin(a)*rr*.8,nest); }
    nests.push(nest); }
  for(const t of L.towers||[]){ const nest={x:t[0], y:t[1], r:80, alert:-9, recs:[]}; const tw={type:'o_tower', x:t[0], y:t[1], lv:EN.o_tower.lv, st:'alive', t:0, e:null, rank:0, hpF:1, nest, el:null};
    recs.push(tw); nest.recs.push(tw); const ar={type:'o_archer', x:t[0], y:t[1]+3, lv:EN.o_archer.lv, st:'alive', t:0, e:null, rank:null, hpF:1, nest, el:null, towerRec:tw}; recs.push(ar); nest.recs.push(ar); nests.push(nest); }
  return {nests, recs}; }
// every portal / chest / the boss nest can be walked to from the entry (40-px grid · blocked = inside a solid feature + hero radius)
function fdReach(z,L){ const S=40, nx=Math.ceil(z.w/S), ny=Math.ceil(z.h/S), bl=new Uint8Array(nx*ny), seen=new Uint8Array(nx*ny);
  for(const f of L.feats){ if(f.soft||f.k==='flat') continue; const r=f.r+15, x0=Math.max(0,Math.floor((f.x-r)/S)), x1=Math.min(nx-1,Math.floor((f.x+r)/S)), y0=Math.max(0,Math.floor((f.y-r)/S)), y1=Math.min(ny-1,Math.floor((f.y+r)/S));
    for(let i=x0;i<=x1;i++) for(let j=y0;j<=y1;j++){ const cx=i*S+S/2, cy=j*S+S/2; if((cx-f.x)**2+(cy-f.y)**2<r*r) bl[j*nx+i]=1; } }
  for(let i=0;i<nx;i++){ bl[i]=1; bl[(ny-1)*nx+i]=1; } for(let j=0;j<ny;j++){ bl[j*nx]=1; bl[j*nx+nx-1]=1; }
  const cell=(x,y)=>Math.min(ny-1,Math.max(0,Math.floor(y/S)))*nx+Math.min(nx-1,Math.max(0,Math.floor(x/S)));
  const q=[cell(z.entry.x,z.entry.y)]; seen[q[0]]=1;
  for(let h=0;h<q.length;h++){ const c=q[h], i=c%nx, j=(c/nx)|0; for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){ const a=i+di, b=j+dj; if(a<0||b<0||a>=nx||b>=ny) continue; const k=b*nx+a; if(seen[k]||bl[k]) continue; seen[k]=1; q.push(k); } }
  const near=(x,y)=>{ for(let dj=-2;dj<=2;dj++) for(let di=-2;di<=2;di++){ const i=Math.floor(x/S)+di, j=Math.floor(y/S)+dj; if(i>=0&&j>=0&&i<nx&&j<ny&&seen[j*nx+i]) return true; } return false; };
  const bad=[]; for(const p of z.portals) if(!near(p.x,p.y)) bad.push('portal:'+p.id); for(const c of L.chests) if(!near(c.x,c.y)) bad.push('chest:'+Math.round(c.x)+','+Math.round(c.y));
  if(z.boss&&!near(z.boss.x,z.boss.y)) bad.push('boss'); return {bad, cells:q.length}; }

/* ---- vector looks of the landmarks (painted art 12b replaces them once loaded) ---- */
// static looks (fence, wall, tents) are painted once into a cached sprite · fire and portals move, so they are drawn live
const FD_PSPR={}, FD_PDIM={fence:[64,56], wall:[84,66], tent:[104,92], otent:[120,104]};
function fdVecProp(o){ const D=FD_PDIM[o.pk];
  if(D){ let im=FD_PSPR[o.pk]; if(!im||im.ss!==SPR_SS){ im=mkCanvas(D[0]*SPR_SS,D[1]*SPR_SS); const g=im.getContext('2d'); g.scale(SPR_SS,SPR_SS); g.translate(D[0]/2,D[1]*.8); fdVecPropDraw(g,o); im.ss=SPR_SS; FD_PSPR[o.pk]=im; }
    ctx.drawImage(im,o.x-D[0]/2,o.y-D[1]*.8,D[0],D[1]); return; }
  ctx.save(); ctx.translate(o.x,o.y); fdVecPropDraw(ctx,o); ctx.restore(); }
function fdVecPropDraw(c,o){
  switch(o.pk){
    case 'fence': c.fillStyle='rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(0,6,22,6,0,0,TAU); c.fill(); c.fillStyle='#7a5432'; c.strokeStyle=TER_OL; c.lineWidth=2;
      for(const dx of [-12,0,12]){ c.beginPath(); c.moveTo(dx-4,6); c.lineTo(dx-4,-22); c.lineTo(dx,-30); c.lineTo(dx+4,-22); c.lineTo(dx+4,6); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle='#9a7a4a'; c.fillRect(-18,-12,36,4); break;
    case 'wall': c.fillStyle='rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(0,8,34,8,0,0,TAU); c.fill(); c.fillStyle='#6a4426'; c.strokeStyle=TER_OL; c.lineWidth=2;
      for(let i=-3;i<=3;i++){ const dx=i*10; c.beginPath(); c.moveTo(dx-5,8); c.lineTo(dx-5,-34); c.lineTo(dx,-42); c.lineTo(dx+5,-34); c.lineTo(dx+5,8); c.closePath(); c.fill(); c.stroke(); }
      c.fillStyle='#7a7a80'; c.fillRect(-34,-26,68,4); c.fillRect(-34,-6,68,4); break;
    case 'tent': case 'otent': { const cl=o.pk==='tent'?['#8a6a40','#6a4a2a']:['#9a3a24','#6a2414'], w=o.pk==='tent'?34:42;
      c.fillStyle='rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0,8,w+6,9,0,0,TAU); c.fill(); c.fillStyle=cl[0]; c.strokeStyle=TER_OL; c.lineWidth=3;
      c.beginPath(); c.moveTo(-w,8); c.lineTo(0,-w*1.2); c.lineTo(w,8); c.closePath(); c.fill(); c.stroke(); c.fillStyle=cl[1]; c.beginPath(); c.moveTo(-8,8); c.lineTo(0,-14); c.lineTo(8,8); c.closePath(); c.fill();
      limb(c,'#4a3020',2,0,-w*1.2,0,-w*1.2-14); c.fillStyle=o.pk==='tent'?'#c8a050':'#c8282e'; c.fillRect(0,-w*1.2-14,10,6); break; }
    case 'fire': { c.fillStyle='#6a6a6a'; for(let i=0;i<7;i++){ const a=i*TAU/7; c.beginPath(); c.arc(Math.cos(a)*13,Math.sin(a)*6+2,4,0,TAU); c.fill(); }
      limb(c,'#5a3a1a',4,-10,4,10,-2); limb(c,'#5a3a1a',4,-10,-2,10,4); const t=G?G.t:0, fl=1+.12*Math.sin(t*14+o.x);
      c.globalCompositeOperation='lighter'; glow(0,-6,30*fl,'#ff7a2a',.55); c.globalCompositeOperation='source-over';
      c.fillStyle='#ff8a2a'; c.beginPath(); c.moveTo(-8,2); c.quadraticCurveTo(-2,-24*fl,0,-20*fl); c.quadraticCurveTo(4,-14,8,2); c.closePath(); c.fill(); c.fillStyle='#ffe28a'; c.beginPath(); c.moveTo(-4,2); c.quadraticCurveTo(0,-12*fl,4,2); c.closePath(); c.fill(); break; }
    case 'portal': { const t=G?G.t:0; c.fillStyle='rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(0,10,44,11,0,0,TAU); c.fill();
      c.fillStyle='#6a7068'; c.strokeStyle=TER_OL; c.lineWidth=3; for(const s of [-1,1]){ c.beginPath(); c.rect(s*30-8,-64,16,74); c.fill(); c.stroke(); }
      c.beginPath(); c.arc(0,-62,38,PI,TAU); c.lineWidth=14; c.strokeStyle='#5a605a'; c.stroke();
      c.globalCompositeOperation='lighter'; c.globalAlpha=.75; c.fillStyle=o.to==='fort'?'#f0c75a':'#6fc8ff'; c.beginPath(); c.ellipse(0,-28,22,34,0,0,TAU); c.fill();
      c.globalAlpha=1; c.strokeStyle='#e8f6ff'; c.lineWidth=2; c.beginPath(); c.ellipse(0,-28,14*(.7+.3*Math.sin(t*3)),24,t*.8,0,TAU); c.stroke(); c.globalCompositeOperation='source-over'; break; } } }
function fdVecFlat(o){ const c=ctx; c.save(); c.translate(o.x,o.y);
  switch(o.fk){
    case 'bridge': c.rotate(o.ang||0); c.fillStyle='rgba(0,0,0,.3)'; c.fillRect(-o.r,-26,o.r*2,56); c.fillStyle='#8a6440'; c.strokeStyle='#3a2414'; c.lineWidth=2;
      for(let x=-o.r;x<o.r;x+=16){ c.fillRect(x,-24,14,48); c.strokeRect(x,-24,14,48); } c.fillStyle='#6a4628'; c.fillRect(-o.r,-28,o.r*2,5); c.fillRect(-o.r,24,o.r*2,5); break;
    case 'altar': { const t=G?G.t:0; c.scale(1,.62); c.fillStyle='#6e6a64'; c.beginPath(); c.arc(0,0,o.r,0,TAU); c.fill(); c.fillStyle='#8a867e'; c.beginPath(); c.arc(0,0,o.r*.86,0,TAU); c.fill();
      c.strokeStyle=`rgba(127,232,255,${.45+.2*Math.sin(t*2)})`; c.lineWidth=5; c.beginPath(); c.arc(0,0,o.r*.62,0,TAU); c.stroke();
      c.lineWidth=3; for(let i=0;i<6;i++){ const a=i*TAU/6+t*.1; c.beginPath(); c.moveTo(Math.cos(a)*o.r*.3,Math.sin(a)*o.r*.3); c.lineTo(Math.cos(a)*o.r*.58,Math.sin(a)*o.r*.58); c.stroke(); } break; }
    case 'spring': { const t=G?G.t:0; c.scale(1,.66); c.fillStyle='#7a7a72'; c.beginPath(); c.arc(0,0,o.r,0,TAU); c.fill(); c.fillStyle='#4ac0b8'; c.beginPath(); c.arc(0,0,o.r*.82,0,TAU); c.fill();
      c.fillStyle='rgba(220,255,250,.35)'; c.beginPath(); c.arc(-o.r*.2,-o.r*.2,o.r*.4,0,TAU); c.fill();
      c.globalAlpha=.35; c.fillStyle='#ffffff'; for(let i=0;i<3;i++){ const k=(t*.4+i/3)%1; c.beginPath(); c.arc(Math.sin(i*2.1)*o.r*.4,-k*o.r*1.2,o.r*.22*(1-k*.4),0,TAU); c.fill(); } c.globalAlpha=1; break; } }
  c.restore(); }

/* ---- per-frame drawing ---- */
function fdDrawWorld(L,T,R,B){ const F=G.fd; if(!F) return; const z=F.z;
  if(L<0||T<0||R>z.w||B>z.h){ ctx.save(); ctx.beginPath(); ctx.rect(L,T,R-L,B-T); ctx.rect(0,0,z.w,z.h); ctx.fillStyle='rgba(10,8,6,.66)'; ctx.fill('evenodd'); ctx.restore(); }   // outside the map (only when the view reaches it)
  terDrawGround(L,T,R,B);
  const vis=(x,y,m)=>x>L-m&&x<R+m&&y>T-m&&y<B+m;
  for(const p of F.portals){ if(!vis(p.x,p.y,120)) continue; const col=p.to==='fort'?'#f0c75a':p.lock?'#8a8a90':'#6fc8ff';
    ctx.globalCompositeOperation='lighter'; glow(p.x,p.y,70,col,.32+.1*Math.sin(G.t*3)); ctx.globalCompositeOperation='source-over';
    ctx.strokeStyle=hexA(col,.7); ctx.lineWidth=3; ctx.setLineDash([10,8]); ctx.lineDashOffset=-G.t*24; ctx.beginPath(); ctx.ellipse(p.x,p.y,52,22,0,0,TAU); ctx.stroke(); ctx.setLineDash([]);
    if(p.hold>0){ ctx.strokeStyle=col; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(p.x,p.y,52,22,0,-PI/2,-PI/2+TAU*Math.min(1,p.hold/.6)); ctx.stroke(); } }
  for(const c of F.chests){ if(!vis(c.x,c.y,60)) continue; fdDrawChest(c); }
  for(const h of F.haz){ if(!vis(h.x,h.y,h.k==='quake'?h.len+60:80)) continue;
    switch(h.k){
      case 'lob': { const k=Math.min(1,h.t/h.dur); ctx.fillStyle=`rgba(0,0,0,${.18+.3*k})`; ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r*(.4+.6*k),h.r*(.4+.6*k)*.55,0,0,TAU); ctx.fill();
        ctx.strokeStyle=`rgba(255,120,100,${.25+.4*k})`; ctx.lineWidth=2; ctx.beginPath(); ctx.ellipse(h.x,h.y,h.r,h.r*.55,0,0,TAU); ctx.stroke(); break; }
      case 'trap': { const on=h.t>h.arm; ctx.fillStyle='#3a2a1a'; ctx.beginPath(); ctx.arc(h.x,h.y,h.r*.75,0,TAU); ctx.fill(); ctx.fillStyle=on?'#c9c3b4':'#8a8478';
        for(let i=0;i<6;i++){ const a=i*TAU/6; ctx.beginPath(); ctx.moveTo(h.x+Math.cos(a)*5,h.y+Math.sin(a)*4); ctx.lineTo(h.x+Math.cos(a+.25)*h.r,h.y+Math.sin(a+.25)*h.r*.8-6); ctx.lineTo(h.x+Math.cos(a+.5)*5,h.y+Math.sin(a+.5)*4); ctx.closePath(); ctx.fill(); }
        if(on&&((G.t*3)|0)%2){ ctx.strokeStyle='rgba(255,90,60,.5)'; ctx.lineWidth=1.5; ctx.beginPath(); ctx.arc(h.x,h.y,h.r+3,0,TAU); ctx.stroke(); } break; }
      case 'fire': { const a=Math.min(1,(h.life-h.t)*2,h.t*5); ctx.globalCompositeOperation='lighter'; glow(h.x,h.y,h.r*1.5,'#ff6a1a',.5*a); glow(h.x,h.y,h.r*.7,'#ffd27a',.4*a); ctx.globalCompositeOperation='source-over'; break; }
      case 'quake': { const c=Math.cos(h.ang), s=Math.sin(h.ang), f=Math.min(h.len,h.t*h.sp); ctx.save(); ctx.translate(h.x,h.y); ctx.rotate(h.ang);
        ctx.fillStyle='rgba(90,60,30,.45)'; ctx.fillRect(0,-h.w*.5,f,h.w); ctx.fillStyle='rgba(255,200,140,.55)'; ctx.fillRect(Math.max(0,f-30),-h.w*.7,30,h.w*1.4); ctx.restore(); break; } } }
  // monster tells (charge line, slam ring) + drummer beats
  for(const e of G.enemies){ const M=e.fm; if(e.dead||!M||!vis(e.x,e.y,300)) continue;
    if(M.tele){ const Tt=M.tele, k=Math.min(1,Tt.t/Tt.dur);
      if(Tt.k==='line'){ ctx.save(); ctx.translate(e.x,e.y); ctx.rotate(Tt.ang); ctx.fillStyle=`rgba(216,68,76,${.12+.22*k})`; ctx.fillRect(0,-Tt.w*.8,Tt.len,Tt.w*1.6); ctx.fillStyle='rgba(255,140,120,.7)'; ctx.fillRect(0,-Tt.w*.8,Tt.len*k,3); ctx.fillRect(0,Tt.w*.8-3,Tt.len*k,3); ctx.restore(); }
      else { ctx.fillStyle=`rgba(240,181,69,${.1+.22*k})`; ctx.beginPath(); ctx.arc(e.x,e.y,Tt.r,0,TAU); ctx.fill(); ctx.strokeStyle='rgba(255,210,120,.8)'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(e.x,e.y,Tt.r*k,0,TAU); ctx.stroke(); } }
    if(M.drum&&G.t-M.drum<.5){ const k=(G.t-M.drum)/.5; ctx.strokeStyle=`rgba(255,200,120,${.5*(1-k)})`; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(e.x,e.y,40+k*210,0,TAU); ctx.stroke(); }
    if(M.fuse!=null){ ctx.strokeStyle=`rgba(255,80,40,${((G.t*10)|0)%2?.8:.3})`; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(e.x,e.y,e.d.kit.boom.r,0,TAU); ctx.stroke(); } }
  // the boss is coming: a pulsing ring on its nest
  const Bs=F.boss; if(Bs&&!Bs.alive&&Bs.at-G.t<60&&vis(Bs.x,Bs.y,200)){ const k=.5+.5*Math.sin(G.t*4); ctx.strokeStyle=`rgba(216,68,76,${.35+.35*k})`; ctx.lineWidth=5; ctx.beginPath(); ctx.ellipse(Bs.x,Bs.y,120,50,0,0,TAU); ctx.stroke(); }
  if(F.rc){ const k=Math.min(1,F.rc.t/5); ctx.strokeStyle='rgba(240,199,90,.85)'; ctx.lineWidth=4; ctx.beginPath(); ctx.ellipse(P.x,P.y+16,30,12,0,-PI/2,-PI/2+TAU*k); ctx.stroke();
    ctx.globalCompositeOperation='lighter'; glow(P.x,P.y,46,'#f0c75a',.25+.2*k); ctx.globalCompositeOperation='source-over'; } }
function fdDrawChest(c){ const ready=c.cd<=G.t, im=typeof artImg==='function'&&ready?artImg('t_chest_gold'):null, x=c.x, y=c.y;
  if(im){ const w=60, h=w*im.naturalHeight/im.naturalWidth; ctx.drawImage(im,x-w/2,y+12-h,w,h); }
  else { ctx.globalAlpha=ready?1:.35; ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x,y+14,26,8,0,0,TAU); ctx.fill();
    ctx.fillStyle='#8a5a2a'; ctx.strokeStyle='#120c10'; ctx.lineWidth=3; ctx.fillRect(x-22,y-14,44,28); ctx.strokeRect(x-22,y-14,44,28); ctx.fillStyle='#f0c75a'; ctx.fillRect(x-22,y-4,44,5); ctx.fillRect(x-4,y-8,8,12); ctx.globalAlpha=1; }
  if(!ready) return; ctx.globalCompositeOperation='lighter'; glow(x,y-6,42,'#f0c75a',.22+.12*Math.sin(G.t*5)); ctx.globalCompositeOperation='source-over';
  ctx.strokeStyle='rgba(255,255,255,.22)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,56,0,TAU); ctx.stroke();
  if(c.hold>0){ ctx.strokeStyle='#f0c75a'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(x,y,56,-PI/2,-PI/2+TAU*Math.min(1,c.hold/2)); ctx.stroke(); } }
function fdDrawOver(L,T,R,B){ const F=G.fd; if(!F) return; terDrawOver(L,T,R,B); fdLabels(L,T,R,B);
  const vis=(x,y,m)=>x>L-m&&x<R+m&&y>T-m&&y<B+m;
  for(const h of F.haz){ if(h.k==='lob'&&vis(h.x,h.y,200)){ const k=Math.min(1,h.t/h.dur), x=h.x0+(h.x-h.x0)*k, y=h.y0+(h.y-h.y0)*k-Math.sin(k*PI)*110;
      circ(ctx,'#2a2620',x,y,6.5); circ(ctx,'#a49a86',x,y,5); circ(ctx,'#c8bea6',x-1.5,y-1.5,2); }
    else if(h.k==='meat'&&vis(h.x,h.y,200)){ const k=Math.min(1,h.t/h.dur), x=h.x0+(h.x-h.x0)*k, y=h.y0+(h.y-h.y0)*k-Math.sin(k*PI)*80; circ(ctx,'#6a3a1a',x,y,6); circ(ctx,'#c8743a',x-1,y-1,4.4); limb(ctx,'#f0e8d8',2,x+3,y-3,x+8,y-8); } }
  for(const s of F.shots){ if(!vis(s.x,s.y,40)) continue; const c=s.el&&s.kind==='orb'&&typeof EL!=='undefined'&&EL[s.el]?EL[s.el].c:FD_SHOT_C[s.kind]||'#c39cff';
    if(s.kind==='arrow'){ const a=Math.atan2(s.vy,s.vx); ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(a); ctx.strokeStyle='#3a2a1a'; ctx.lineWidth=2.4; ctx.beginPath(); ctx.moveTo(-14,0); ctx.lineTo(6,0); ctx.stroke();
      ctx.fillStyle='#c8ccd4'; ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(4,-3.4); ctx.lineTo(4,3.4); ctx.closePath(); ctx.fill(); ctx.fillStyle='#e8e0c8'; ctx.fillRect(-15,-3,4,2); ctx.fillRect(-15,1,4,2); ctx.restore(); continue; }
    if(s.kind==='crown'){ ctx.save(); ctx.translate(s.x,s.y); ctx.rotate(s.rot||0); ctx.fillStyle='#c8862a'; ctx.strokeStyle='#3a2408'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-12,6); ctx.lineTo(-12,-4); ctx.lineTo(-6,2); ctx.lineTo(0,-8); ctx.lineTo(6,2); ctx.lineTo(12,-4); ctx.lineTo(12,6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); continue; }
    ctx.globalCompositeOperation='lighter'; glow(s.x,s.y,s.r*2.6,c,.75); ctx.globalCompositeOperation='source-over'; circ(ctx,c,s.x,s.y,s.r); circ(ctx,'#ffffff',s.x,s.y,s.r*.4); }
  for(const p of F.portals){ if(!vis(p.x,p.y,80)) continue; const t=fdTag(p.n+(p.lock?' 🔒':''),p.to==='fort'?'#f0c75a':p.lock?'#b8b8c0':'#9fe0ff'); ctx.drawImage(t,p.x-t.__w/2,p.y-118,t.__w,t.__h); }
  for(const c of F.chests){ if(c.cd>G.t||!vis(c.x,c.y,80)) continue; const t=fdTag('หีบค่าย · ยืน 2 วิ','#f0c75a'); ctx.drawImage(t,c.x-t.__w/2,c.y-52,t.__w,t.__h); }
  if(F.rc){ const t=fdTag('กลับป้อม '+Math.max(0,5-F.rc.t).toFixed(1)+' วิ','#f0c75a',true); ctx.drawImage(t,P.x-t.__w/2,P.y-74,t.__w,t.__h); } }
// over the heads: colour-rank ring, Lv + element tag (ranked ones get their name), shields, rage, merge progress, stolen gold
function fdLabels(L,T,R,B){ let n=0;
  for(const e of G.enemies){ if(e.dead||e.x<L-40||e.x>R+40||e.y<T-40||e.y>B+40) continue; if(++n>70) break;
    const M=e.fm, Rk=e.rank?RANK[e.rank]:null, E=e.el&&EL[e.el], lift=(e.d.fly?12:0)+(e.lift||0), y=e.y-e.r*(e.boss?2.25:1.95)-lift;
    if(Rk){ ctx.strokeStyle=Rk.c; ctx.lineWidth=2.5; ctx.globalAlpha=.85; ctx.beginPath(); ctx.ellipse(e.x,e.y+e.r*.85,e.r*1.05,e.r*.38,0,0,TAU); ctx.stroke(); ctx.globalAlpha=1;
      if(e.rank===3){ ctx.globalCompositeOperation='lighter'; glow(e.x,e.y-e.r*.3,e.r*2.1,'#f0b545',.22+.1*Math.sin(G.t*5)); ctx.globalCompositeOperation='source-over'; } }
    if(e.boss){ if(E){ ctx.globalCompositeOperation='lighter'; glow(e.x,e.y,e.r*2.4,E.c,.22); ctx.globalCompositeOperation='source-over'; const t=fdTag(E.i+' ธาตุ'+E.n,E.c,true); ctx.drawImage(t,e.x-t.__w/2,y-10,t.__w,t.__h); }
      const A=e.ai; if(A&&A.nextEl&&EL[A.nextEl]&&((G.t*4)|0)%2){ const t=fdTag('ถัดไป '+EL[A.nextEl].i+' '+EL[A.nextEl].n,EL[A.nextEl].c); ctx.drawImage(t,e.x-t.__w/2,y-30,t.__w,t.__h); }
      if(A&&A.rage){ ctx.globalCompositeOperation='lighter'; glow(e.x,e.y,e.r*2.2,'#ff3a2a',.28+.12*Math.sin(G.t*9)); ctx.globalCompositeOperation='source-over'; } continue; }
    if(!M) continue;
    if(M.rage){ ctx.globalCompositeOperation='lighter'; glow(e.x,e.y-e.r*.3,e.r*1.9,'#ff3a2a',.3+.12*Math.sin(G.t*9)); ctx.globalCompositeOperation='source-over'; }
    if(e.shArc&&M.ang!=null){ ctx.strokeStyle=e.def>0?'rgba(200,190,170,.75)':'rgba(200,190,170,.25)'; ctx.lineWidth=4; ctx.beginPath(); ctx.arc(e.x,e.y-e.r*.2,e.r*1.25,M.ang-.85,M.ang+.85); ctx.stroke(); }
    if(M.mt>0&&!M.merged){ ctx.strokeStyle='#c07aff'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(e.x,e.y-e.r*.2,e.r*1.3,-PI/2,-PI/2+TAU*Math.min(1,M.mt/4)); ctx.stroke(); }
    if(M.hid){ ctx.fillStyle='#f8ffe0'; ctx.fillRect(e.x-4.5,e.y-e.r*.55,2.6,2.6); ctx.fillRect(e.x+2,e.y-e.r*.55,2.6,2.6); continue; }
    if(e.d.struct){ const t=fdTag(e.d.n,'#e8d8b0'); ctx.drawImage(t,e.x-t.__w/2,e.y-e.r*3.1,t.__w,t.__h); continue; }
    const tag=(E?E.i+' ':'')+(Rk?e.d.n+' '+Rk.n+' · ':'')+'Lv '+e.lv, t=fdTag(tag,Rk?Rk.c:'#e8e2cf');
    ctx.globalAlpha=Rk||M.st===1?1:.75; ctx.drawImage(t,e.x-t.__w/2,y-t.__h/2,t.__w,t.__h); ctx.globalAlpha=1;
    if(M.loot){ ctx.font='14px sans-serif'; ctx.textAlign='center'; ctx.fillText('💰',e.x+e.r,y-12); }
    if(M.swT!=null&&G.t-M.swT<.8&&E){ const t2=fdTag('→ '+E.i+' '+E.n,E.c,true); ctx.drawImage(t2,e.x-t2.__w/2,y-26,t2.__w,t2.__h); }
    if(e.elT!=null&&G.t-e.elT<.6){ const s=e.elM>1, t3=fdTag(s?'แรง!':'ต้าน',s?'#ffe14a':'#a0a6b0',s); ctx.drawImage(t3,e.x-t3.__w/2,y-26,t3.__w,t3.__h); } } }
// a cached text tag (canvas) · 2× resolution · at most 400 kept
const FD_TAG=new Map(); let FD_TAGM=null;
function fdTag(text,col,big){ const key=text+'|'+col+'|'+(big?1:0); let c=FD_TAG.get(key); if(c) return c;
  const S=2, fs=big?13:11, font='bold '+fs+'px Mali, Tahoma, sans-serif'; if(!FD_TAGM) FD_TAGM=mkCanvas(4,4).getContext('2d'); FD_TAGM.font=font;
  const w=Math.ceil(Math.max(20,(+FD_TAGM.measureText(text).width||text.length*fs*.6)+10)), h=fs+7; c=mkCanvas(w*S,h*S); const g=c.getContext('2d'); g.scale(S,S);
  g.font=font; g.textAlign='center'; g.textBaseline='middle'; g.lineWidth=3; g.strokeStyle='rgba(0,0,0,.78)'; g.strokeText(text,w/2,h/2+.5); g.fillStyle=col; g.fillText(text,w/2,h/2+.5);
  c.__w=w; c.__h=h; if(FD_TAG.size>400) FD_TAG.clear(); FD_TAG.set(key,c); return c; }

/* ---- minimap (one canvas per map, built on entry) + screen overlays ---- */
function fdMiniBuild(z,L){ const s=Math.min(124/z.w,124/z.h), w=Math.round(z.w*s), h=Math.round(z.h*s), S=2, c=mkCanvas(w*S,h*S), g=c.getContext('2d'); g.scale(S*s,S*s);
  g.fillStyle=z.mini; g.fillRect(0,0,z.w,z.h);
  for(const f of L.feats){ if(f.edge) continue; let col=null, r=f.r;
    switch(f.k){ case 'water': col='rgba(80,160,220,.75)'; break; case 'mud': col='rgba(110,80,50,.8)'; break; case 'mount': col='rgba(30,22,18,.85)'; break; case 'rock': col='rgba(60,56,52,.8)'; break;
      case 'tree': col='rgba(20,50,20,.8)'; r=f.cr*.7; break; case 'bush': col='rgba(40,70,40,.5)'; break; case 'prop': col=f.pk==='wall'?'rgba(120,80,40,.95)':f.pk==='fence'?'rgba(150,110,60,.9)':'rgba(160,120,70,.9)'; break;
      case 'flat': col=f.fk==='altar'?'rgba(127,232,255,.8)':f.fk==='spring'?'rgba(80,220,200,.8)':'rgba(140,100,60,.9)'; break; }
    if(col){ g.fillStyle=col; g.beginPath(); g.arc(f.x,f.y,Math.max(r,18),0,TAU); g.fill(); } }
  g.setTransform(1,0,0,1,0,0); g.strokeStyle='rgba(239,228,204,.55)'; g.lineWidth=2; g.strokeRect(1,1,w*S-2,h*S-2);
  return {c, w, h, s}; }
const FD_MINI={top:90, at:0};
function fdDrawScreen(){ const F=G.fd; if(!F) return;
  if(F.mini&&!G.auto){ const m=F.mini, now=performance.now();
    if(now-FD_MINI.at>1000){ FD_MINI.at=now; try{ const t=document.querySelector('.hud-top'), r=t&&t.getBoundingClientRect(); if(r&&r.height>0) FD_MINI.top=r.bottom+8; }catch(e){} }
    const k=Math.min(1,W*.25/m.w), mw=m.w*k, mh=m.h*k, x0=W-mw-12, y0=FD_MINI.top, s=m.s*k; ctx.globalAlpha=.88; ctx.drawImage(m.c,x0,y0,mw,mh); ctx.globalAlpha=1;   // narrow screens: a quarter of the width
    const dot=(x,y,c,r)=>{ ctx.fillStyle=c; ctx.fillRect(x0+x*s-r,y0+y*s-r,r*2,r*2); };
    for(const p of F.portals) dot(p.x,p.y,p.to==='fort'?'#f0c75a':'#6fc8ff',3);
    for(const c of F.chests) if(c.cd<=G.t) dot(c.x,c.y,'#f0c75a',2);
    const Bs=F.boss; if(Bs){ if(Bs.alive){ for(const b of G.bosses) if(!b.dead) dot(b.x,b.y,'#ff4a4a',3.5); } else if(Bs.at-G.t<60){ ctx.font='11px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('👑',x0+Bs.x*s,y0+Bs.y*s); } }
    if(F.ramp&&F.ramp.on) for(const e of F.ramp.on.list) if(!e.dead) dot(e.x,e.y,'#ff8a7a',1.2);
    ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1; ctx.strokeRect(x0+(cam.x-VW/2)*s,y0+(cam.y-VH/2)*s,VW*s,VH*s);
    dot(P.x,P.y,'#ffffff',2.5); }
  if(F.fade){ const k=F.fade.in?1-Math.min(1,F.fade.t/F.fade.dur):Math.min(1,F.fade.t/F.fade.dur); ctx.fillStyle=`rgba(4,6,8,${k})`; ctx.fillRect(0,0,W,H); } }
