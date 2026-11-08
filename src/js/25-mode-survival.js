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
  onKill(e){ if(!e.elite&&!e.boss) return; const t=BAL.DROP.surv&&BAL.DROP.surv[e.boss?'boss'+G.wave:'elite']; if(!t) return;
    for(const it of rollDrops(t,1+(P.drop||0))) G.loot.push(it); },
  hud(){ const h=MODES.classic.hud(); h.lv='ชำนาญ Lv '+P.lv+' · '+(P.adv?P.adv.n:P.cls.n); return h; },
  end(won){ const r=MODES.classic.end(won); r.eyebrow='เอาชีวิตรอด · ระดับนรก T'+(G.tier||0)+' · '+r.eyebrow; return r; }
});

