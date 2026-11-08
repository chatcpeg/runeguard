function boot(data){
  resize(); groundPat=ctx.createPattern(makeGround(),'repeat'); buildNum();
  for(const t in EN) if(!EN[t].boss&&!EN[t].lazy) getSpr(t);   // zone mobs set lazy:1 and are built on entry
  if(data&&data.cls&&CLS[data.cls]) selected=data.cls;
  renderTitle(); setMuteLabels(); renderQualityButtons(); show('scrTitle');
  if(document.fonts&&document.fonts.load){ document.fonts.load('700 16px Mali').then(()=>{ buildNum(); TXT.clear(); renderTitle(); }).catch(()=>{}); }
  requestAnimationFrame(frame);
}
try{ window.claude?.hot?.snapshot?.(()=>({cls:selected})); }catch(e){}
if(window.claude?.hot?.ready) window.claude.hot.ready(boot); else boot(window.claude?.hot?.data??{});
