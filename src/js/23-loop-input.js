/* ================= loop + input ================= */
let last=performance.now();
function frame(now){
  requestAnimationFrame(frame);
  const raw=now-last; let dt=raw/1000; last=now; if(dt>.05) dt=.05; if(dt<0) dt=0;
  titleT+=dt;
  const w0=performance.now(), playing=G&&!G.ui&&!G.over;
  if(G){
    if(playing){ if(G.hitStop>0) G.hitStop-=dt; else update(dt); }
    else { G.shake=0; G.flash=Math.max(0,G.flash-dt); G.hurtFlash=Math.max(0,G.hurtFlash-dt); }
  }
  try{ render(); }catch(err){ console.error(err); }
  if(playing) autoQuality(performance.now()-w0,raw);
  if(G&&P){ updateHUD(); if(!G.ui&&!G.over) checkUI(); }
}
addEventListener('keydown',e=>{
  const uk=UIKEY[(G&&G.ui)||curScreen()]; if(uk&&uk(e)) return;   // lane screens / G.ui states handle their own keys first
  keys[e.code]=true;
  if(G&&!G.ui&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if(e.code==='KeyM'){ toggleMute(); return; }
  if(!G){ if(e.code==='Enter'){ if(!$('#scrTitle').hidden){ if(!(document.activeElement&&document.activeElement.tagName==='BUTTON')) startRun(selected); } else if(UIX.enter) UIX.enter(); } return; }
  const n={Digit1:0,Digit2:1,Digit3:2,Digit4:3,Digit5:4,Numpad1:0,Numpad2:1,Numpad3:2,Numpad4:3,Numpad5:4}[e.code];
  if(G.ui==='level'){ if(typeof SH!=='undefined'&&(SH.sheet||SH.conf)) return;   // a sheet (shop) over the cards owns the keys
    if(n!==undefined) choose(n); else if(e.code==='KeyR') reroll(); }
  else if(G.ui==='adv'){ if(n!==undefined&&n<2) pickAdv(n); }
  else if(G.ui==='pause'){ if(e.code==='KeyP'||e.code==='Escape') resumeGame(); }
  else if(!G.ui){ if(e.code==='KeyP'||e.code==='Escape') pauseGame(); }
});
addEventListener('keyup',e=>{ keys[e.code]=false; });
addEventListener('blur',()=>{ for(const k in keys) keys[k]=false; joy.on=false; if(G&&!G.ui&&!G.over) pauseGame(); });
document.addEventListener('visibilitychange',()=>{ if(document.hidden&&G&&!G.ui&&!G.over) pauseGame(); });
cv.addEventListener('pointerdown',e=>{ initAudio(); if(!G||G.ui) return; if(joy.on&&e.pointerId!==joy.id) return; joy.on=true; joy.id=e.pointerId; joy.ox=e.clientX; joy.oy=e.clientY; joy.dx=joy.dy=0; try{ cv.setPointerCapture(e.pointerId); }catch(_){} });
cv.addEventListener('pointermove',e=>{ if(!joy.on||e.pointerId!==joy.id) return; let dx=e.clientX-joy.ox,dy=e.clientY-joy.oy; const R=56,d=Math.hypot(dx,dy); if(d>R){ joy.ox=e.clientX-dx/d*R; joy.oy=e.clientY-dy/d*R; dx=dx/d*R; dy=dy/d*R; } joy.dx=dx/R; joy.dy=dy/R; if(Math.hypot(joy.dx,joy.dy)<.12){ joy.dx=0; joy.dy=0; } });
const endJoy=e=>{ if(e.pointerId===joy.id){ joy.on=false; joy.dx=joy.dy=0; } };
cv.addEventListener('pointerup',endJoy); cv.addEventListener('pointercancel',endJoy);
addEventListener('resize',resize);
$('#btnStart').addEventListener('click',()=>startRun(selected));
$('#btnMuteT').addEventListener('click',toggleMute); $('#btnMuteP').addEventListener('click',toggleMute); $('#btnMute').addEventListener('click',()=>{ initAudio(); toggleMute(); });
$('#btnPause').addEventListener('click',pauseGame);
$('#btnResume').addEventListener('click',resumeGame);
$('#btnRestartP').addEventListener('click',()=>startRun(G.cls.id,G.modeId,G.opts));
$('#btnMenuP').addEventListener('click',toTitle);
$('#btnAgain').addEventListener('click',()=>G?startRun(G.cls.id,G.modeId,G.opts):startRun(selected));
$('#btnMenuE').addEventListener('click',toTitle);
$('#btnReroll').addEventListener('click',reroll);
for(const b of document.querySelectorAll('#qSeg button')) b.addEventListener('click',()=>setQuality(b.dataset.q));

