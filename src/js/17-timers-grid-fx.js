/* ================= timers ================= */
function later(t,f){ G.timers.push({t,f,dead:false}); }
function updateTimers(dt){ const T=G.timers; if(!T.length) return; const run=[]; for(const o of T){ o.t-=dt; if(o.t<=0){ o.dead=true; run.push(o.f); } } compact(T); for(const f of run){ if(G.over) break; f(); } }

/* ================= spatial grid ================= */
const grid=new Map(), QPOOL=[]; let qi=0;
const gkey=(cx,cy)=>((cx+32768)<<16)|((cy+32768)&0xffff);
function buildGrid(){ if(grid.size>3000) grid.clear(); for(const a of grid.values()) a.length=0;
  for(const e of G.enemies){ if(e.dead) continue; const k=gkey(Math.floor(e.x/CELL),Math.floor(e.y/CELL)); let a=grid.get(k); if(!a){ a=[]; grid.set(k,a); } a.push(e); } }
/* results come from a per-frame pool (reset at the top of update) so hot loops don't allocate */
function query(x,y,r){ let out=QPOOL[qi]; if(!out) out=QPOOL[qi]=[]; qi++; out.length=0; const x0=Math.floor((x-r)/CELL),x1=Math.floor((x+r)/CELL),y0=Math.floor((y-r)/CELL),y1=Math.floor((y+r)/CELL);
  for(let cx=x0;cx<=x1;cx++) for(let cy=y0;cy<=y1;cy++){ const a=grid.get(gkey(cx,cy)); if(a) for(let i=0;i<a.length;i++) out.push(a[i]); } return out; }
function nearestTo(x,y,R,ex){ let best=null,bd=R*R; for(const e of G.enemies){ if(e.dead) continue; if(ex&&ex.indexOf(e.id)>=0) continue; const dx=e.x-x,dy=e.y-y,d=dx*dx+dy*dy; if(d<bd){ bd=d; best=e; } } return best; }
function randomNear(x,y,R){ let pe=null,k=0; const R2=R*R; for(const e of G.enemies){ if(e.dead) continue; const dx=e.x-x,dy=e.y-y; if(dx*dx+dy*dy<R2){ k++; if(Math.random()*k<1) pe=e; } } return pe; }
function randomInView(){ return randomNear(P.x,P.y,Math.min(VW,VH)*.55+60); }
function strongest(R){ let best=null,bh=-1; const R2=R*R; for(const e of G.enemies){ if(e.dead) continue; const dx=e.x-P.x,dy=e.y-P.y; if(dx*dx+dy*dy>R2) continue; const h=e.hp+(e.boss?1e6:0); if(h>bh){ bh=h; best=e; } } return best; }
function findNearest(){ let best=null,bd=1e12; for(const e of G.enemies){ if(e.dead) continue; const dx=e.x-P.x,dy=e.y-P.y,d=dx*dx+dy*dy; if(d<bd){ bd=d; best=e; } }
  G.near=best; G.nearD=best?Math.sqrt(bd):1e9; if(best) P.aim=Math.atan2(best.y-P.y,best.x-P.x); else if(P.moving) P.aim=Math.atan2(P.vy,P.vx); }

/* ================= particles, decals, text ================= */
function part(o){ if(G.auto||G.parts.length>=QPART[qLv()]) return; o.t=0; o.dead=false; G.parts.push(o); }
function burst(x,y,n,c,sp,life,size,kind){ if(G.auto) return; life=life||.45; size=size||3; kind=kind||'sq'; const add=kind!=='rock'&&kind!=='puff';
  for(let i=0;i<n;i++){ const a=rand(0,TAU),v=rand(.25,1)*sp; part({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(kind==='rock'?120:0),life:life*rand(.6,1.2),s:size*rand(.6,1.3),c,g:kind==='rock'?520:0,drag:kind==='rock'?1.2:4,k:kind,add,rot:rand(0,TAU),vr:rand(-12,12)}); } }
function sparks(x,y,nx,ny,n,c){ if(G.auto) return; const base=Math.atan2(ny,nx); for(let i=0;i<n;i++){ const a=base+rand(-.7,.7),v=rand(170,330); part({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:rand(.1,.2),s:1.8,c,g:0,drag:5,k:'streak',add:true}); } }
function addDecal(tex,x,y,r,life,a,flat){ if(G.auto) return; const cap=QDECAL[qLv()]; while(G.decals.length>=cap) G.decals.shift(); G.decals.push({tex,x,y,r,rot:flat?0:rand(0,TAU),flat:!!flat,t:0,life,a,dead:false}); }
function addText(x,y,s,c,big){ if(G.auto||G.texts.length>140) return; G.texts.push({x,y,s:String(s),k:null,c,big:!!big,t:0,dead:false}); }
function addNum(x,y,s,k){ if(G.auto||G.texts.length>140) return; G.texts.push({x,y,s:String(s),k,c:null,big:k==='c',t:0,dead:false}); }

