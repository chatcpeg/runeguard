/* test hook (only with #dev in the address): lets a script fast-forward a run without the screen
   lanes add DEV.<ns> in their own files; it is merged in here. Lanes never assign window.RG themselves. */
if(location.hash==='#dev'){ const RG=Object.assign({
  start(id){ startRun(id||'swordsman'); return this.info(); },
  sim(sec){ if(!G) return 'no run'; G.auto=true; const steps=Math.round(sec*60); for(let i=0;i<steps&&!G.over;i++){ update(1/60); autoUI(); } G.auto=false; refreshSkillBar(); return this.info(); },
  info(){ return G&&{t:+G.t.toFixed(1),wave:G.wave,boss:G.boss,lv:P.lv,hp:Math.round(P.hp)+'/'+Math.round(P.maxHp),kills:G.kills,enemies:G.enemies.length,projs:G.projs.length,gems:G.gems.length,zones:G.zones.length,parts:G.parts.length,decals:G.decals.length,corpses:G.corpses.length,adv:P.adv&&P.adv.id,over:G.over,won:G.won,
    skills:P.skills.map(s=>s.id+':'+(s.evolved?'EVO':s.lv)+':'+Math.round(s.dealt)).join(' '),stats:JSON.stringify(P.stats),quality:qLv()}; },
  god(v){ if(G) G.god=v!==false; },
  botR(v){ BOT_R=v||0; },
  ui(){ if(G){ G.ui=null; checkUI(); updateHUD(); render(); return G.ui; } },
  renderMs(n){ n=n||30; const t0=performance.now(); for(let i=0;i<n;i++){ if(G&&!G.over){ update(1/60); } render(); } if(G) updateHUD(); return (performance.now()-t0)/n; },
  quality(m){ setQuality(m); return qLv(); },
  state(){ return G; },
  // initAudio first: its noise buffer draws sampleRate/2 numbers from Math.random on the first startRun,
  // which would shift the seeded stream (and differ between 44.1/48 kHz devices). Seed → start → sim is then exact.
  seed(n){ initAudio(); Math.random=mulberry(n>>>0); },
  run(mode,opts){ opts=Object.assign({char:mode==='classic'?null:curChar()},opts); startRun((opts.char&&opts.char.cls)||opts.cls||selected,mode,opts); return this.info(); }
},DEV);
  // RG.commit = true lets sim() keep rewards (endRun reads DEV.commit), so route the property to DEV
  Object.defineProperty(RG,'commit',{get(){ return !!DEV.commit; },set(v){ DEV.commit=!!v; },enumerable:true,configurable:true});
  window.RG=RG; }

