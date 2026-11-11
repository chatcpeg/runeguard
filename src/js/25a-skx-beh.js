/* ================= 25a-skx-beh.js · lane B · behaviours of the 30 character-only skills (CLASSES skx · docs/PROPOSAL-skill-trees.md §3) ================= */
// These skills sit only in CLASSES[].skx / adv.skx, which classic never reads → nothing here runs in classic (golden unchanged).
// Every cast aims once at the target and goes straight (docs/PROPOSAL-mastery.md §2) · reach grows with DEX (P.rangeMul) like the old
// skills. Hooks into the shared loops are one guarded line each: fireProj → pxFire · updateProjs → pxRet / pxEnd · projHit → pxHit ·
// BEH.zone → zxCast · updateZones → zxTick / zxEnd (zones with x2).

/* ---- new skill types ---- */
// counter (ดาบสวนกลับ): HP + shield dropped since last frame = we were hit → a 360° slash round the hero (on its cooldown)
BEH.counter=(s,dt)=>{ const st=s.st, cur=P.hp+P.shield; s.cdT-=dt;
  const hit=st.last!=null&&cur<st.last-.01; st.last=cur;
  if(!hit||s.cdT>0) return;
  s.cdT=cdOf(s); const r=pv(s,'range')*P.area*(1+((P.rangeMul||1)-1)*.5);
  aoe(P.x,P.y,r,pv(s,'dmg'),s,{knock:pv(s,'knock'),stun:pv(s,'stun')});
  G.fx.push({k:'slash',a:P.aim,arc:TAU,r,t:0,dur:.28,c:s.def.c,flip:false,follow:true,x:P.x,y:P.y,dead:false});
  G.fx.push({k:'ring',x:P.x,y:P.y,r0:r*.4,r1:r*1.05,t:0,dur:.25,c:'#ffffff',w:4,follow:true,dead:false});
  burst(P.x,P.y-6,qLv()?10:4,s.def.c,r*2.2,.35,3,'shard'); P.atkT=.12; sfx('swing'); };
// thrust (ทวนสามแทง): `count` straight thrusts along the aim, each hits everything on the line (width = size)
BEH.thrust=(s,dt)=>{ s.cdT-=dt; if(s.cdT>0) return;
  const range=pv(s,'range')*P.area*(1+((P.rangeMul||1)-1)*.5);
  if(!G.near||G.nearD>range+G.near.r){ s.cdT=.1; return; }
  s.cdT=cdOf(s); const a=Math.atan2(G.near.y-P.y,G.near.x-P.x), n=pv(s,'count')||1;
  for(let i=0;i<n;i++){ const go=()=>thrustOnce(s,a,range,i); if(i===0) go(); else later(i*.12,go); } };
function thrustOnce(s,a,range,i){ if(!P||G.over) return;
  const w=(pv(s,'size')||14)*(1+(P.area-1)*.5), ca=Math.cos(a), sa=Math.sin(a), x0=P.x, y0=P.y-4, x1=x0+ca*range, y1=y0+sa*range, dmg=pv(s,'dmg'), kn=pv(s,'knock');
  for(const e of query((x0+x1)/2,(y0+y1)/2,range/2+w+60)){ if(e.dead) continue; const rr=w+e.r; if(segD2(e.x,e.y,x0,y0,x1,y1)>rr*rr) continue;
    damageEnemy(e,dmg,s,{knock:kn,nx:ca,ny:sa}); }
  const o=(i%3-1)*.035; G.fx.push({k:'beamline',x:x0,y:y0,a:a+o,len:range,t:0,dur:.16,c:s.def.c,dead:false});
  if(!G.auto) for(let k=0;k<(qLv()?4:2);k++) part({x:x1,y:y1,vx:ca*rand(60,160)+rand(-40,40),vy:sa*rand(60,160)+rand(-40,40),life:.25,s:2.4,c:'#ffffff',g:0,drag:4,k:'streak',add:true});
  P.swing={t:0,dur:.12,a0:a-.15,a1:a+.15}; P.atkT=.12; sfx('swing'); }
// rite (สังเวยโลหิต): pay `cost` of the current HP (never below 1), blast round the hero, heal `drain` of the damage it just did
BEH.rite=(s,dt)=>{ s.cdT-=dt; if(s.cdT>0) return; const r=pv(s,'r')*P.area;
  if(!G.near||G.nearD>r*1.1){ s.cdT=.15; return; }
  s.cdT=cdOf(s); const pay=Math.min(Math.max(0,P.hp-1),P.hp*(pv(s,'cost')||0)); if(pay>0){ P.hp-=pay; if(pay>=2) addNum(P.x+rand(-6,6),P.y-30,Math.round(pay),'h'); }
  const d0=s.dealt; aoe(P.x,P.y,r,pv(s,'dmg'),s,{knock:pv(s,'knock')});
  const got=(s.dealt-d0)*(pv(s,'drain')||0); if(got>0) healP(got);
  G.fx.push({k:'ring',x:P.x,y:P.y,r0:14,r1:r,t:0,dur:.42,c:s.def.c,w:14,follow:true,dead:false}); G.fx.push({k:'boom',x:P.x,y:P.y,r:r*.7,t:0,dur:.35,c:'#ff2a2a',dead:false});
  burst(P.x,P.y-4,qLv()?16:6,'#c41a1a',r*2.4,.5,3.5); if(!G.auto&&qLv()>=1) addDecal(splatTex('#6a0d0d',1),P.x,P.y+6,r*.55,4,.5);
  G.shake=Math.max(G.shake,5); P.atkT=.12; sfx('boom'); };

/* ---- projectiles (fireProj → pxFire when SK[id].px) ---- */
// ret: boomerang (out to its range, then back to the hand, hitting everything again) · hook: knock < 0 = pulled to the hero
function pxFire(s,p){ const v=k=>pv(s,k);
  if(v('ret')) p.ret=1;
  const hk=v('hook'); if(hk) p.knock=-hk; }
// boomerang flight: when the outward life runs out it turns, hits can repeat, and it homes on the hero until caught (true = gone)
function pxRet(p,dt){
  if(!p.back){ if(p.life>0) return false; p.back=true; p.hit=null; p.life=p.max=2; }
  const dx=P.x-p.x, dy=(P.y-6)-p.y, d=Math.hypot(dx,dy)||1, sp=Math.hypot(p.vx,p.vy)||400;
  if(d<P.r+14){ p.dead=true; return true; }
  const k=Math.min(1,dt*7); p.vx+=(dx/d*sp-p.vx)*k; p.vy+=(dy/d*sp-p.vy)*k; return false; }

/* ---- zones (BEH.zone → zxCast when SK[id].zx · updateZones → zxTick every frame, zxEnd when the time is up) ---- */
// place: 'self' = on the hero (follow: stays on the hero) · more places come with the skills that need them
function zxCast(s){
  const v=k=>pv(s,k), pl=s.def.place, wake=(s.def.wake||300)*(P.rangeMul||1);
  if(!G.near||G.nearD>wake){ s.cdT=.2; return; }
  s.cdT=cdOf(s); const n=countOf(s), r=v('r')*P.area;
  for(let i=0;i<n;i++){ let x=P.x, y=P.y; const o={};
    if(pl==='self'){ if(i){ const a=i*TAU/n; x+=Math.cos(a)*r*.6; y+=Math.sin(a)*r*.45; } if(s.def.follow||v('follow')) o.follow=1; }
    addZone(Object.assign({x,y,r,dur:(v('dur')||4)*P.durMul,tick:v('tick')||.4,dmg:v('dmg')||0,slow:v('slow')||0,kind:s.def.fx,src:s,x2:1,
      rep:v('rep')||0,stun:v('stun')||0},o)); }
  if(s.def.fx==='palisade'){ G.fx.push({k:'ring',x:P.x,y:P.y,r0:r*.3,r1:r,t:0,dur:.3,c:s.def.c,w:6,follow:true,dead:false}); sfx('shield'); } }
// one frame of an x2 zone: movement, push / pull, its own ticks → always true (the classic zone code never sees it)
function zxTick(z,dt){
  if(z.follow){ z.x=P.x; z.y=P.y; }
  if(z.rep){ const R=z.r; for(const e of query(z.x,z.y,R+60)){ if(e.dead||e.boss) continue; const dx=e.x-z.x, dy=e.y-z.y, d=Math.hypot(dx,dy)||1, rr=R+e.r*.3;
      if(d<rr){ const f=Math.min(rr-d,z.rep*dt/Math.max(.6,e.mass)); e.x+=dx/d*f; e.y+=dy/d*f; } } }
  z.tt-=dt; if(z.tt<=0){ z.tt=z.tick;
    if(z.dmg) for(const e of query(z.x,z.y,z.r+60)){ if(e.dead) continue; const rr=z.r+e.r*.5; if((e.x-z.x)**2+(e.y-z.y)**2>rr*rr) continue;
      damageEnemy(e,z.dmg,z.src,{slow:z.slow,slowDur:.5,stun:z.stun,quiet:true,fxd:z.fxd}); } }
  return true; }
function zxEnd(z){}

/* ---- dev (#dev only, through RG.skx) · balance runs: skills at ★lv, mastery L on each one's main stat, a 10M-HP hero (being hit
   still counts, nothing dies), no level-up cards, from wave `wave` · solo = one skill for `sec` s → the damage it did ---- */
DEV.skx={
  setup(ids,o){ o=Object.assign({lv:5, L:0, wave:6, seed:42, tier:0},o); const ch=typeof curChar==='function'?curChar():null; if(!ch) return 'no char';
    if(typeof RG!=='undefined'&&RG.seed) RG.seed(o.seed); startRun(ch.cls,'survival',{char:ch, tier:o.tier});
    P.skills=ids.filter(id=>SK[id]).map(id=>{ const s=makeSkill(id); s.lv=o.lv; return s; }); for(const k of STAT_ORDER) P.stats[k]=0;
    for(const s of P.skills){ const m=SX.main[s.id]; if(m) P.stats[m]=o.L; } if(o.st) Object.assign(P.stats,o.st);
    P.need=1e12; recalc(P); P.hp=P.maxHp=1e7; G.god=false; G.wave=o.wave-1; G.waveT=.01; refreshSkillBar(); return P.skills.map(s=>s.id).join(); },
  solo(id,o){ o=Object.assign({sec:60},o); if(!SK[id]) return 'no skill'; const w=this.setup([id],o); if(w==='no char') return w; const s=P.skills[0]; G.auto=true;
    const steps=Math.round(o.sec*60); for(let i=0;i<steps&&!G.over;i++){ update(1/60); autoUI(); } G.auto=false;
    const r={id, L:o.L|0, lv:s.lv, dmg:Math.round(s.dealt), dps:Math.round(s.dealt/o.sec), kills:G.kills, hp:Math.round(P.hp), wave:G.wave}; G.ui='pause'; return r; } };
