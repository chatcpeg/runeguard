/* ================= modes: classic (the original game, unchanged) + survival (with a character) ================= */
// classic = the old code path moved here verbatim: opening, wave loop, HUD/pause/end texts and the score formula
MODES.classic={
  id:'classic', n:'คลาสสิก', cards:'auto', relocate:true,
  init(opts){ nextWave(); for(let i=0;i<8;i++){ const q=ringPos(); spawnEnemy('shambler',q[0],q[1]); } },
  update:updateWave,
  hud(){ return {lv:'Lv '+P.lv+' · '+(P.adv?P.adv.n:P.cls.n), wave:'คลื่น '+G.wave+'/'+WAVES, time:G.boss?'บอส!':fmtTime(G.waveT)}; },
  pauseTitle(){ return `${P.adv?P.adv.n:P.cls.n} · Lv ${P.lv} · คลื่น ${G.wave}/${WAVES} · เวลา ${fmtClock(G.t)}`; },
  end(won){
    G.score+=G.kills+G.wave*150+(won?5000:0);
    return {eyebrow:won?'ปกป้องแผ่นดินจากคลื่นอันเดดได้สำเร็จ':'ล้มลงกลางสนามรบ', title:won?'ชัยชนะ!':'พ่ายแพ้',
      rows:isBest=>[['คะแนน',fmtNum(G.score)+(isBest?' ★':'')],['คลื่น',G.wave+'/'+WAVES],['เวลา',fmtClock(G.t)],['เลเวล',P.lv],['สังหาร',fmtNum(G.kills)],['อาชีพ',P.adv?P.adv.n:P.cls.n]]};
  }
};
// survival = classic waves scaled by hell tier T (opts.tier) · numbers come from BAL.SURV (30-balance.js),
// loot from rollDrops (34-items-logic.js), rewards from onRunEnd (42-progression.js) — this file stays thin
MODES.survival=Object.assign({},MODES.classic,{
  id:'survival', n:'เอาชีวิตรอด',
  init(opts){ const T=G.tier=(opts&&opts.tier)||0; G.defK=BAL.SURV.defK(T); G.bossHpMul=BAL.SURV.hpMul(T); MODES.classic.init(opts); },
  cfgFor(w){ const c=waveCfg(w),T=G.tier||0; c.hpMul*=BAL.SURV.hpMul(T); c.dmgMul*=BAL.SURV.dmgMul(T); return c; },
  onKill(e){ if(!e.elite&&!e.boss) return; const t=BAL.DROP.surv&&BAL.DROP.surv[e.boss?'boss'+G.wave:'elite'];
    if(t) for(const it of rollDrops(t,1+(P.drop||0))) G.loot.push(it);
    if(e.elite&&!e.boss&&rngUnit()<BAL.BOX.elite&&Array.isArray(G.gems)&&G.gems.filter(g=>!g.dead&&g.kind==='lootbox'&&g.small).length<BAL.BOX.maxSmall) svBoxDrop(e.x,e.y,true); },
  update(dt){ updateWave(dt); if(!G.over) svBoxTick(dt); },
  hud(){ const h=MODES.classic.hud(); h.lv='ชำนาญ Lv '+P.lv+' · '+(P.adv?P.adv.n:P.cls.n); h.wave+=' · มอน Lv '+svWaveLv(); return h; },
  end(won){ const r=MODES.classic.end(won), T='ระดับนรก T'+(G.tier||0);   // G.retreat = pause → ถอยทัพ (55-ui-hud.js)
    if(G.retreat){ r.eyebrow=T+' · ถอยทัพกลับป้อมพร้อมรางวัล'; r.title='ถอยทัพ'; } else r.eyebrow=T+' · '+r.eyebrow; return r; }
});


/* ---- loot boxes (survival only · BAL.BOX): a box every 45–60 s near the player, elites sometimes leave a small one ----
   A box is a ground item (ITEMKIND.lootbox) · walking into its pickup range opens it · items go to G.loot and gold to G.goldRun,
   which onRunEnd → grantRewards pays once per runId (nothing here writes the save) · rngUnit (crypto): a seeded sim keeps its stream */
function svBoxDrop(x,y,small){ return typeof ltGem!=='function'?null:ltGem(x,y,'lootbox',{small:!!small, vx:0, vy:0}); }
function svBoxTick(dt){
  const B=BAL.BOX; if(G.boxT==null) G.boxT=B.every[0]+rngUnit()*(B.every[1]-B.every[0]);
  G.boxT-=dt; if(G.boxT>0) return;
  for(const g of G.gems) if(!g.dead&&g.kind==='lootbox'&&g.t>B.life) g.dead=true;   // unopened for 2 min → gone, so far-away boxes never block new ones
  G.boxT=B.every[0]+rngUnit()*(B.every[1]-B.every[0]);
  let n=0; for(const g of G.gems) if(!g.dead&&g.kind==='lootbox'&&!g.small) n++; if(n>=B.max) return;
  const a=rngUnit()*TAU, d=B.dist[0]+rngUnit()*(B.dist[1]-B.dist[0]);
  if(svBoxDrop(P.x+Math.cos(a)*d,P.y+Math.sin(a)*d,false)) addText(P.x,P.y-56,'กล่องสุ่มปรากฏ!','#c9a7ff',true); }
function svBoxPick(T){ const w=Object.assign({},BAL.BOX.w); w.gear+=BAL.BOX.gearPerT*T; let r=rngUnit()*Object.values(w).reduce((a,b)=>a+b,0);
  for(const k in w){ r-=w[k]; if(r<0) return k; } return 'gold'; }
function svBoxOpen(g){
  const B=BAL.BOX, T=G.tier|0, k=svBoxPick(T), x=P.x, y=P.y-50, sm=g.small?B.small:1, L=G.loot||(G.loot=[]);
  burst(g.x,g.y,12,'#c9a7ff',150,.5,3); sfx('level');
  if(k==='gold'){ const n=Math.max(1,Math.round(BAL.SURV.goldPerWave(T)*(B.gold[0]+rngUnit()*(B.gold[1]-B.gold[0]))*sm));
    G.goldRun=(G.goldRun|0)+n; addText(x,y,'+'+n+' ทอง','#f0c75a',true); return; }
  if(k==='potion'){ L.push({id:T>=4?'u_potion_l':'u_potion_s', n:1}); addText(x,y,'ได้ยา!','#ff6a7a',true); return; }
  if(k==='dust'){ const n=1+(rngUnit()<.35+.04*T?1:0); L.push({id:'m_dust', n}); addText(x,y,'ผงรูน ×'+n,'#ffd36a',true); return; }
  if(k==='gear'){ const got=rollDrops([{gear:'T'}],1+(P.drop||0)); if(got.length){ for(const it of got) L.push(it);
      addText(x,y,typeof ltName==='function'?ltName(got[0]):'ได้อุปกรณ์!',typeof ltColor==='function'?ltColor(got[0]):'#8fb8ff',true); return; }
    G.goldRun=(G.goldRun|0)+BAL.SURV.goldPerWave(T)*2; addText(x,y,'+'+BAL.SURV.goldPerWave(T)*2+' ทอง','#f0c75a',true); return; }
  // magnet / bomb / heart: the core pickups' own effect, right where the player stands
  addText(x,y,k==='magnet'?'แม่เหล็ก!':k==='bomb'?'ระเบิด!':'ฟื้น HP!','#c9a7ff',true); collect({kind:k, dead:false}); }
function svPaintBox(c){ const k=1.15;
  c.fillStyle='#1a1028'; rrect(c,-10*k,-9*k,20*k,18*k,3.5); c.fill(); c.fillStyle='#7a4fd0'; rrect(c,-9*k,-8*k,18*k,16*k,3); c.fill();
  c.fillStyle='#b58cff'; c.fillRect(-9*k,-3*k,18*k,2.4*k); c.fillStyle='#f3ead2'; c.font='bold '+Math.round(12*k)+'px sans-serif'; c.textAlign='center'; c.textBaseline='middle'; c.fillText('?',0,2.5*k); }
ITEMKIND.lootbox={
  collect(g){ try{ svBoxOpen(g); }catch(e){ console.error(e); } },
  draw(c,g){ const s=g.spr||(g.spr=ltSpr('lootbox',svPaintBox)), b=Math.sin(G.t*4+g.x*.05)*2; if(g.small){ c.save(); c.translate(g.x,g.y+b); c.scale(.75,.75); ltBlit(c,s,0,0); c.restore(); } else ltBlit(c,s,g.x,g.y+b); }};

/* ---- monster level tags (survival · display only: the wave/tier scaling of HP and damage already is "the level") ----
   Lv = recLv(T) + wave/2 · elite +2 · boss +5, stored on the enemy the first time it is drawn · one cached canvas per tag,
   blitted (cheap even with 300 enemies) · white = normal · gold = elite · red = boss */
const SV_LVT=new Map();
function svLvTag(lv,rank){ const key=lv+'|'+rank; let c=SV_LVT.get(key); if(c) return c;
  const t='Lv '+lv, S=2, w=Math.max(32,9+t.length*6.8), h=14; c=mkCanvas(w*S,h*S); const g=c.getContext('2d'); g.scale(S,S);
  const col=rank==='boss'?['#5a1018','#ff6a6a']:rank==='elite'?['#4a3408','#f0c75a']:['rgba(10,12,18,.72)','#e8e2cf'];
  g.fillStyle=col[0]; rrect(g,.5,.5,w-1,h-1,6); g.fill(); g.strokeStyle=rank==='normal'?'rgba(255,255,255,.18)':col[1]; g.lineWidth=1; g.stroke();
  g.fillStyle=col[1]; g.font='bold 10px sans-serif'; g.textAlign='center'; g.textBaseline='middle'; g.fillText(t,w/2,h/2+.5);
  c.__w=w; c.__h=h; if(SV_LVT.size<200) SV_LVT.set(key,c); return c; }
function svLvOf(e){ if(e.lv==null){ e.lv=svWaveLv()+(e.boss?5:e.elite?2:0); } return e.lv; }
const SV_LV_NEAR=10, SV_LV_R2=280*280, SV_LV_PICK=[];
function svWaveLv(){ return BAL.SURV.recLv(G.tier|0)+Math.floor(Math.max(0,(G.wave|0)-1)/2); }
// elites and bosses always · normal ones only the SV_LV_NEAR nearest (a swarm of 200 tags is noise; the HUD wave chip says the wave's level)
MODES.survival.drawOver=function(L,T,R,B){
  const near=SV_LV_PICK; near.length=0;
  for(const e of G.enemies){ if(e.dead||e.x<L||e.x>R||e.y<T||e.y>B) continue;
    if(e.boss||e.elite){ svLvDraw(e); continue; }
    const dx=e.x-P.x, dy=e.y-P.y, d=dx*dx+dy*dy; if(d>SV_LV_R2) continue;
    if(near.length<SV_LV_NEAR){ near.push([d,e]); continue; }
    let w=0; for(let i=1;i<near.length;i++) if(near[i][0]>near[w][0]) w=i; if(d<near[w][0]) near[w]=[d,e]; }
  if(near.length){ const a=ctx.globalAlpha; ctx.globalAlpha=.8; for(const [,e] of near) svLvDraw(e); ctx.globalAlpha=a; } };
function svLvDraw(e){ const c=svLvTag(svLvOf(e),e.boss?'boss':e.elite?'elite':'normal'), k=e.boss?1.4:e.elite?1.15:1, w=c.__w*k, h=c.__h*k;
  ctx.drawImage(c,e.x-w/2,e.y-(e.r||12)*(e.boss?1.25:1.15)-h-8,w,h); }
