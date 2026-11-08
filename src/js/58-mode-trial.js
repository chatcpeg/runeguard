/* ================= 58-mode-trial.js · lane P · MODES.trial + EN.trial_warden ================= */
// §2.5 · §2.1: a circle arena r 650 · survive 60 s while 3 foes a second come in (shambler / runner / bat / spitter,
// HP × hpByLv(Lv) and damage × dmgByLv(Lv) of the character) · then the warden "ผู้คุมบททดสอบรูน": the colossus painter
// tinted rune green, colossus AI through d.ai, HP 700 · hpByLv(Lv) · win → onRunEnd (lane C) unlocks 'trial:t2' and the
// committed reward sets ch.trial.t2 = 1 · loss = free retry (no cost) · no proficiency cards, no EXP, no drops ·
// skills start at their ★ (prepareRun 'rank') · defK = 22 + 0.8·Lv.
const PTR={R:650, SURVIVE:60, RATE:3, BOSS_RATE:1, HP:700, W:{shambler:4, runner:3, bat:2, spitter:1.5}};
// boss:1 → never pre-built at boot · lazy:1 says the same for the §7.7 boot rule · the sprite is built when the trial starts
Object.assign(EN,{trial_warden:{boss:1, lazy:1, base:'colossus', ai:'colossus', tint:'#2fe08a', n:'ผู้คุมบททดสอบรูน',
  hp:PTR.HP, speed:62, r:44, dmg:22, mass:80, xp:150, goo:'#8ff0c0', bones:1}});
function ptrLv(){ return Math.max(1,(G&&G.char&&G.char.lv)|0); }
// a foe on a ring around the player but inside the arena (else on the far side of the circle)
function ptrSpawn(){
  const B=G.bounds, t=pickType(G.cfg.W), R=Math.min(Math.hypot(VW,VH)/2+rand(30,110),B.r*.92);
  for(let k=0;k<6;k++){ const a=rand(0,TAU), x=P.x+Math.cos(a)*R, y=P.y+Math.sin(a)*R; if(Math.hypot(x-B.x,y-B.y)<B.r-24) return spawnEnemy(t,x,y); }
  const a=Math.atan2(B.y-P.y,B.x-P.x)+rand(-.9,.9); return spawnEnemy(t,B.x+Math.cos(a)*(B.r-30),B.y+Math.sin(a)*(B.r-30)); }
function ptrWarden(){
  const e=spawnBoss('trial_warden',PTR.HP*BAL.FIELD.hpByLv(ptrLv())); G.trial.warden=e; G.boss=true; G.bosses=[e];
  banner(EN.trial_warden.n,'ล้มผู้คุมเพื่อผ่านบททดสอบ'); sfx('boss'); return e; }
MODES.trial={
  id:'trial', n:'บททดสอบเลื่อนขั้น', cards:false, relocate:false,
  init(opts){ const lv=ptrLv(), F=BAL.FIELD;
    G.defK=22+.8*lv; G.bounds={k:'circle', x:0, y:0, r:PTR.R};
    G.cfg={W:PTR.W, rate:PTR.RATE, hpMul:F.hpByLv(lv), dmgMul:F.dmgByLv(lv), spdMul:1};
    G.wave=1; G.spawnAcc=0; G.trial={phase:1, warden:null};
    try{ getSpr('trial_warden'); }catch(e){ console.error(e); }
    banner('บททดสอบเลื่อนขั้น','รอดให้ครบ '+PTR.SURVIVE+' วิ แล้วล้ม'+EN.trial_warden.n);
    for(let i=0;i<6;i++) ptrSpawn(); },
  update(dt){ const T=G.trial;
    if(T.phase===1&&G.t>=PTR.SURVIVE){ T.phase=2; G.wave=2; ptrWarden(); }
    else if(T.phase===2&&T.warden&&T.warden.dead&&!G.waveEnding){ T.phase=3; G.waveEnding=true; healP(P.maxHp*.25); later(1.4,()=>endRun(true)); }
    if(G.waveEnding||G.over) return;
    G.spawnAcc+=(T.phase===1?G.cfg.rate:PTR.BOSS_RATE)*dt;
    while(G.spawnAcc>=1){ G.spawnAcc-=1; if(G.enemies.length<CAP) ptrSpawn(); } },
  // the warden is down and the win is 1.4 s away: a last hit cannot turn it into a loss
  onDeath(){ if(G.trial&&G.trial.phase===3){ P.hp=1; return true; } return false; },
  // the arena edge: darken outside the circle + a dashed rune-green ring (world coordinates, before the actors)
  drawWorld(L,T,R,B){ const A=G.bounds; ctx.save(); ctx.beginPath(); ctx.rect(L,T,R-L,B-T); ctx.arc(A.x,A.y,A.r,0,TAU); ctx.fillStyle='rgba(4,8,6,.5)'; ctx.fill('evenodd');
    ctx.beginPath(); ctx.arc(A.x,A.y,A.r,0,TAU); ctx.setLineDash([18,12]); ctx.lineWidth=5; ctx.strokeStyle='rgba(47,224,138,.6)'; ctx.stroke(); ctx.restore(); },
  hud(){ const T=G.trial;
    return {lv:'บททดสอบ · Lv '+ptrLv()+' · '+P.cls.n, wave:T.phase===1?'ช่วง 1/2 · เอาตัวรอด':'ช่วง 2/2 · ผู้คุม',
      time:T.phase===1?'เหลือ '+fmtTime(PTR.SURVIVE-G.t):T.phase===2?'บอส!':'ผ่าน!'}; },
  pauseTitle(){ return `บททดสอบเลื่อนขั้น · ${P.cls.n} Lv ${ptrLv()} · เวลา ${fmtClock(G.t)}`; },
  end(won){
    return {eyebrow:'บททดสอบเลื่อนขั้น · '+P.cls.n, title:won?'ผ่านบททดสอบ!':'ยังไม่ผ่าน',
      rows:()=>{ const ch=G.char, ok=!!(ch&&ch.trial&&ch.trial.t2===1);
        return [['ผล',won?(ok?'ปลดการเลื่อนอาชีพแล้ว':'ชนะ (ไม่ได้บันทึก)'):'ลองใหม่ได้ฟรี ไม่เสียอะไร'],['เวลา',fmtClock(G.t)],['สังหาร',fmtNum(G.kills)],
          ['ผู้คุม',won?'ล้มแล้ว':G.trial.phase>=2?'ยังไม่ล้ม':'ยังไม่ปรากฏ']]; }}; }
};   // after the run lane B's router lands on scrJob (SH_RET.trial in 50-ui-shell.js)
// start the trial of ch (from the job page) · refuses (toast) before Base 20 + Job 20 or after advancing
function trialStart(ch){
  ch=ch||prgCh(); if(!ch||!pgCls(ch)) return false; const R=BAL.ADV;
  if(ch.job||(ch.lv|0)<R.base||(ch.jlv|0)<R.job){ toast(ch.job?'เลื่อนอาชีพแล้ว ไม่ต้องทดสอบอีก':'บททดสอบเปิดเมื่อถึง Base '+R.base+' + Job '+R.job,'bad'); return false; }
  startRun(ch.cls,'trial',{char:ch}); return true; }
