/* ================= boot (lane I from M1) ================= */
// Order: canvas + sprites (as before) → settings (mute) → local save (load → .bak → migrate runeguard.best → validate)
// → lane B shell → hub (scrHub). The classic title (scrTitle) is still rendered here and stays one tap away in the hub;
// it is also the fallback when the shell is missing or throws, so the original game always starts.
// Artifact (claude.ai): no service worker is registered by this page (only dist/index.html adds one), history is left to
// the host page (lane B), and a blocked localStorage plays from memory (STORE). No network here (AUTH_ON=false, M3).
function boot(data){
  resize(); groundPat=ctx.createPattern(makeGround(),'repeat'); buildNum();
  if(typeof artBoot==='function'&&ART.on) artBoot();                   // painted art (12b) · the vector look until it arrives
  for(const t in EN) if(!EN[t].boss&&!EN[t].lazy) getSpr(t);   // zone mobs set lazy:1 and are built on entry
  if(data&&data.cls&&CLS[data.cls]) selected=data.cls;
  renderTitle(); setMuteLabels(); renderQualityButtons(); if(typeof renderArtButtons==='function') renderArtButtons();
  let hub=false;
  try{
    if(loadSettings().mute&&AU.on) toggleMute();               // runeguard.settings · lane B keeps it in sync afterwards
    loadSaveFor(null);                                         // guest save (accounts come in M3) · emits BUS 'char'
    if(data&&typeof data.char==='string'&&SAVE&&SAVE.active!==data.char) setActiveChar(data.char);   // hot reload keeps the pick
    if(typeof shBoot==='function'){ shBoot(); hub=!!curScreen(); }
  }catch(e){ console.error(e); }
  if(!hub) show('scrTitle');                                   // the original boot screen
  if(document.fonts&&document.fonts.load){ document.fonts.load('700 16px Mali').then(()=>{ buildNum(); TXT.clear(); renderTitle(); }).catch(()=>{}); }
  requestAnimationFrame(frame);
}
try{ window.claude?.hot?.snapshot?.(()=>({cls:selected, char:SAVE?.active??null})); }catch(e){}
if(window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data??{});
