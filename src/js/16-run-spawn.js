/* ================= run lifecycle ================= */
/* modeId → MODES[modeId] (25-mode-survival.js and lane files) · classic: no opts.char, MODES.classic.init = the old opening */
function newRun(cls,modeId='classic',opts={}){
  G={cls,t:0,wave:0,waveT:WAVE_LEN,boss:false,bosses:[],waveEnding:false,spawnAcc:0,hordeT:9,hordeWarn:null,eliteDone:false,kills:0,eid:0,
     enemies:[],projs:[],eprojs:[],gems:[],zones:[],strikes:[],fx:[],parts:[],texts:[],timers:[],corpses:[],decals:[],
     pendingLv:0,pendingChest:0,rerolls:3,ui:null,over:false,won:false,shake:0,flash:0,hurtFlash:0,hitStop:0,hitSfxT:0,cfg:null,score:0,totalDmg:0,auto:false,god:false,near:null,nearD:1e9,choices:null,uiReadyAt:0,
     mode:MODES[modeId],modeId,opts,char:opts.char||null,bounds:null,obstacles:null,loot:[],rewards:null,runId:'r_'+Date.now().toString(36)};
  P=makePlayer(cls); recalc(P); P.hp=P.maxHp;
  if(G.char) prepareRun(G,P,G.char,modeId);
  G.player=P;
  cam.x=P.x; cam.y=P.y;
  G.mode.init(opts);
}
function startRun(id,modeId='classic',opts={}){
  if(G&&G.mode.dispose) G.mode.dispose();
  initAudio(); selected=id; newRun(CLS[id]||CLASSES[0],modeId,opts);
  show(null); el.hud.hidden=false; for(const k in HC) delete HC[k];
  refreshSkillBar(); last=performance.now(); keepAwake();
}
function toTitle(){ if(G&&G.mode.dispose) G.mode.dispose(); G=null; P=null; el.hud.hidden=true; $('#banner').hidden=true; releaseWake(); if(UIX.home) UIX.home(); else { renderTitle(); show('scrTitle'); } }
function nextWave(){
  if(G.wave>=WAVES){ endRun(true); return; }
  G.wave++; const w=G.wave; G.cfg=G.mode.cfgFor?G.mode.cfgFor(w):waveCfg(w); G.eliteDone=false;
  const bl=BOSS_WAVES[w];
  if(bl){ G.boss=true; G.bosses=bl.map(q=>spawnBoss(q[0],q[1]*(G.bossHpMul||1))); banner('คลื่นที่ '+w+' · บอส',G.bosses.map(b=>b.d.n).join(' + ')); sfx('boss'); }
  else { G.boss=false; G.bosses=[]; G.waveT=WAVE_LEN; banner('คลื่นที่ '+w,HINT[w]||'ฝูงหนาแน่นขึ้น'); sfx('wave'); }
}
function updateWave(dt){
  if(G.boss){ if(!G.waveEnding && G.bosses.every(b=>b.dead)){ G.waveEnding=true; healP(P.maxHp*.25); later(1.6,()=>{ G.waveEnding=false; nextWave(); }); } }
  else { G.waveT-=dt; if(G.waveT<=0){ nextWave(); return; } }
  if(G.waveEnding||G.over) return;
  const cfg=G.cfg;
  G.spawnAcc+=cfg.rate*(G.boss?.45:1)*dt;
  while(G.spawnAcc>=1){ G.spawnAcc-=1; if(G.enemies.length<CAP){ const q=ringPos(); spawnEnemy(pickType(cfg.W),q[0],q[1]); } }
  if(G.wave>=3){ G.hordeT-=dt; if(G.hordeT<=0){ G.hordeT=rand(11,15); horde(); } }
  if(!G.boss && G.wave>=3 && !G.eliteDone && G.waveT<WAVE_LEN*.5){ G.eliteDone=true; spawnElite(); }
}
function pickType(Wt){ let tot=0; for(const k in Wt) tot+=Wt[k]; let r=Math.random()*tot; for(const k in Wt){ r-=Wt[k]; if(r<=0) return k; } return 'shambler'; }
function ringPos(bias){ let a; if(bias!==undefined) a=bias; else if(P.moving&&Math.random()<.5) a=Math.atan2(P.vy,P.vx)+rand(-.9,.9); else a=rand(0,TAU); const R=Math.hypot(VW,VH)/2+rand(30,110); return [P.x+Math.cos(a)*R,P.y+Math.sin(a)*R]; }
function spawnEnemy(type,x,y,o){ o=o||{}; const d=EN[type],cfg=G.cfg,el2=!!o.elite; const hp=o.hp||d.hp*cfg.hpMul*(el2?6:1);
  const e={id:++G.eid,type,d,x,y,vx:0,vy:0,kx:0,ky:0,r:d.r*(el2?1.4:1),hp,maxHp:hp,speed:d.speed*rand(.9,1.1)*cfg.spdMul*(el2?.92:1),dmg:d.dmg*cfg.dmgMul*(el2?1.5:1),mass:d.mass*(el2?4:1),
    xp:Math.max(1,Math.round(d.xp*(el2?12:1))),atkCd:0,flash:0,hitT:0,walk:Math.random()*4,slowT:0,slowF:1,freezeT:0,stunT:0,face:1,anim:Math.random()*10,shotCd:rand(1,3),elite:el2,boss:!!d.boss,dead:false,ai:{}};
  G.enemies.push(e); return e; }
function horde(){ const n=Math.min(CAP+40-G.enemies.length,6+Math.round(G.wave*1.6)); if(n<=0) return; const a0=rand(0,TAU),R=Math.hypot(VW,VH)/2+40; const type=G.wave>=4&&Math.random()<.4?'runner':'shambler';
  for(let i=0;i<n;i++){ const a=a0+rand(-.35,.35),r=R+rand(0,140); spawnEnemy(type,P.x+Math.cos(a)*r,P.y+Math.sin(a)*r); }
  G.hordeWarn={a:a0,t:1.8}; addText(P.x,P.y-52,'ฝูงซอมบี้!','#ff8a7a',true); }
function spawnElite(){ const pool=['brute','shambler','runner']; if(G.wave>=6) pool.push('bloater'); const q=ringPos(); return spawnEnemy(pick(pool),q[0],q[1],{elite:true}); }
function spawnBoss(type,hp){ const a=-PI/2+rand(-.6,.6),R=Math.max(VW,VH)/2*.8+60; const e=spawnEnemy(type,P.x+Math.cos(a)*R,P.y+Math.sin(a)*R,{hp}); e.boss=true; return e; }
function relocate(e){ const q=ringPos(); e.x=q[0]; e.y=q[1]; e.kx=e.ky=0; e.vx=e.vy=0; }

