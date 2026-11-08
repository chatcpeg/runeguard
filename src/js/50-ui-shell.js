/* ================= 50-ui-shell.js · lane B · UI router, sheet, toast, confirmBox, sysLog, character window frame ================= */
// UI.go(id,args) pushes a screen and shows it (core show) · every change emits BUS 'screen' (id, args): the owner lane renders then.
// Back: confirm → sheet → screen · in a run pause (again = resume) · end screen → home. Android back (§8.0): history entries {rg,d}
// mirror the stack (+1 per sheet / confirm / run); Chrome skips entries added without a gesture, so shSync adds ≤ 1 per tap / key.
// At the stack bottom the first back only warns. User text → textContent / esc() only.
const SH={stack:[], booted:false, hd:0, ign:0, ignK:0, tok:0, noHist:true, sheet:null, onClose:null, conf:null, menuAt:0,
  lastMode:null, tab:null, txt:{}, cwCh:null};
const SH_META=['scrChar','scrSkills','scrJob','scrAccount'];       // pages with the shared tab bar (§8.0)
const SH_RET={classic:'scrTitle', trial:'scrJob'};                  // after toTitle: hub + this screen
regScreen('scrChar');
const UI={
  go(id,args){ return shGo(id,args); },
  back(){ shBack(); },
  home(){ shHome(); },
  stack(){ return SH.stack.slice(); }
};
UIX.home=shAfterRun;
UIX.enter=function(){ const a=document.activeElement; if(SH.sheet||SH.conf||(a&&/^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(a.tagName))) return;
  const f=HB_ENTER[shTop()]; if(f) f(); };
// RG.ui() keeps the body of 90-dev-hook (DEV is merged over it) + RG.ui.go(id) / .stack() (§7.9)
DEV.ui=Object.assign(function(){ if(G){ G.ui=null; checkUI(); updateHUD(); render(); return G.ui; } },
  {go(id,a){ UI.go(id,a); return UI.stack(); }, back(){ UI.back(); return UI.stack(); }, home(){ UI.home(); return UI.stack(); }, stack(){ return UI.stack(); }});

function shEl(id){ return document.getElementById(id); }
function shMk(tag,cls,text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=String(text); return n; }
function shBtn(text,cls,fn){ const b=shMk('button',cls,text); b.type='button'; if(fn) b.addEventListener('click',fn); return b; }
function shTop(){ return SH.stack[SH.stack.length-1]||null; }

/* ---------- router ---------- */
function shGo(id,a){
  if(typeof id!=='string'||!shEl(id)){ toast('หน้านี้ยังไม่เปิดให้ใช้','info'); return false; }
  if(G){ if(G.over) toTitle(); else if(G.ui!=='menu') return false; else if(!SH.menuAt) SH.menuAt=SH.stack.length; }
  if(SH.conf) shConfDone(false); shSheetOff();
  if(shTop()!==id) SH.stack.push(id);
  shShow(id,a); return true; }
function shShow(id,a){ regScreen(id); show(id); shChrome(id); BUS.emit('screen',id,a===undefined?null:a); shSync(); }
function shBack(){
  if(SH.conf){ shConfDone(false); return; }
  if(SH.sheet){ closeSheet(); return; }
  if(G&&!SH.menuAt){
    if(G.over){ if(curScreen()==='scrEnd') toTitle(); }
    else if(!G.ui) pauseGame(); else if(G.ui==='pause') resumeGame();   // level / job cards: a pick is required
    shSync(); return; }
  if(G&&SH.stack.length<=SH.menuAt+1){ SH.stack.length=SH.menuAt; SH.menuAt=0; G.ui=null; show(null); shChrome(null); shSync(); return; }
  if(SH.stack.length>1){ SH.stack.pop(); shShow(shTop()); return; }
  if(shTop()!=='scrHub') shHome(); }
function shHome(){
  if(G){ SH.lastMode=null; toTitle(); return; }                     // toTitle → UIX.home → here again with G = null
  if(SH.conf) shConfDone(false); shSheetOff(); SH.menuAt=0; SH.stack=['scrHub']; shShow('scrHub'); }
function shAfterRun(){ const r=SH_RET[SH.lastMode]; SH.lastMode=null; shHome(); if(r&&shEl(r)) shGo(r); }
function shChrome(id){
  const nav=shEl('shNav'), fab=shEl('shFab'); if(!nav||!fab) return;
  const hub=id==='scrHub', meta=hub||SH_META.includes(id);
  nav.hidden=!meta; document.body.classList.toggle('sh-navon',meta);
  fab.hidden=!(id==='scrTitle'&&SH.stack.length>1); document.body.classList.toggle('sh-fabon',!fab.hidden);
  if(!meta) return;
  const ch=curChar(), rq=ch&&!ch.job?jobReqs(ch,''):null;
  for(const b of nav.children){ const g=b.dataset.go;
    b.hidden=g==='scrHub'?hub:g==='scrSettings'?!hub:!shEl(g);
    b.setAttribute('aria-current',g===id?'page':'false');
    const n=!ch?'':g==='scrChar'?(ch.pts>0?String(ch.pts):''):g==='scrSkills'?(ch.sp>0?String(ch.sp):''):g==='scrJob'&&rq&&rq[0].ok&&rq[1].ok?'!':'';
    if(n) b.dataset.n=n; else delete b.dataset.n; } }
function shNavGo(id){
  if(id==='scrHub'){ UI.home(); return; }
  if(!shEl(id)){ toast('หน้านี้ยังไม่เปิดให้ใช้','info'); return; }
  if(id!=='scrSettings'&&!curChar()){ toast('สร้างตัวละครก่อน','info'); UI.go('scrNew'); return; }
  if(shTop()===id) return;
  if(SH_META.includes(shTop())) SH.stack.pop();                     // tab switch: back still goes to the hub
  if(id==='scrChar') openCharWindow(); else UI.go(id); }
function shKey(e){ if(e.code==='Escape'){ UI.back(); return true; } const t=e.target; return !!t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName); }   // typing: keep core shortcuts (M = mute) off

function shWant(){ return SH.stack.length+(SH.sheet?1:0)+(SH.conf?1:0)+(G&&!G.over&&!SH.menuAt?1:0); }
function shSync(){
  if(SH.noHist||!SH.booted||SH.ign) return;
  const w=shWant();
  try{
    if(SH.hd>w){ const n=SH.hd-w, k=++SH.ignK; SH.ign=1; SH.hd=w; history.go(-n); setTimeout(()=>{ if(SH.ignK===k) SH.ign=0; },1500); }
    else if(SH.hd<w&&SH.tok&&performance.now()-SH.tok<1500){ SH.tok=0; SH.hd++; history.pushState({rg:shTop()||'scrHub', d:SH.hd},''); }
  }catch(e){ SH.ign=0; } }
function shGest(e){   // user activation: mouse press, touch / pen release, key (not Escape)
  if(e.type==='keydown'){ if(e.repeat||e.key==='Escape') return; } else if((e.pointerType==='mouse')!==(e.type==='pointerdown')) return;
  SH.tok=performance.now(); setTimeout(shSync,0); }
function shOnPop(e){
  const s=e.state; SH.hd=s&&s.rg?s.d|0:0;
  if(SH.ign){ SH.ign--; shSync(); return; }
  if(!G&&!SH.sheet&&!SH.conf&&SH.stack.length<=1){ if(!SH.hd) toast('กดย้อนกลับอีกครั้งเพื่อออกจากเกม','info'); return; }
  if(G&&!G.over&&!SH.menuAt&&!SH.hd&&!SH.sheet&&!SH.conf){            // run on the last entry: the next back leaves the page
    if(!G.ui) pauseGame(); toast('กดย้อนกลับอีกครั้งเพื่อออกจากเกม','info'); return; }   // so pause (never resume) and warn
  shBack(); }

/* ---------- sheet (bottom, ≤ 80vh, swipe down or ✕) ---------- */
function sheet(nodeOrHtml,o){
  o=o||{}; const r=shEl('shSheet'), b=shEl('shSheetB'); if(!r||!b) return null;
  if(SH.conf) shConfDone(false); shSheetOff();
  if(typeof nodeOrHtml==='string') b.innerHTML=nodeOrHtml; else if(nodeOrHtml) b.append(nodeOrHtml);
  shEl('shSheetT').textContent=o.title||''; shEl('shCard').style.transform=''; r.hidden=false;
  SH.sheet=b; SH.onClose=typeof o.onClose==='function'?o.onClose:null; shSync(); return b; }
function shSheetOff(){ if(!SH.sheet) return; const f=SH.onClose; SH.sheet=null; SH.onClose=null; shEl('shSheet').hidden=true; shEl('shSheetB').textContent='';
  if(f) try{ f(); }catch(e){ console.error(e); } }
function closeSheet(){ if(!SH.sheet) return; shSheetOff(); shSync(); }

/* ---------- toast (top, 2.5 s) · sysLog (bottom left, 4 lines) ---------- */
function toast(text,kind){
  const box=shEl('shToasts'); if(!box) return; const s=String(text==null?'':text), tap=/แตะเพื่ออัปเดต/.test(s);
  for(const o of Array.from(box.children)) if(o.textContent===s) o.remove();
  const t=shMk('div','sh-toast '+(kind==='good'||kind==='bad'?kind:'info'),s); t.setAttribute('role',kind==='bad'?'alert':'status');
  if(tap){ t.classList.add('tap'); t.addEventListener('click',shUpdateApp); }
  box.append(t); while(box.children.length>3) box.firstElementChild.remove();
  setTimeout(()=>{ t.classList.add('out'); setTimeout(()=>t.remove(),320); },tap?6000:2500); }
function sysLog(text,kind){
  if(G&&G.auto) return; const box=shEl('shLog'); if(!box) return;
  const l=shMk('div','sh-ll'+(kind==='good'||kind==='bad'?' '+kind:''),text==null?'':text); box.append(l);
  while(box.children.length>4) box.firstElementChild.remove();
  setTimeout(()=>{ l.classList.add('out'); setTimeout(()=>l.remove(),420); },4000); }
function shUpdateApp(){   // §6.3: newer save → new worker, skipWaiting, reload
  const sw=navigator.serviceWorker, go=()=>setTimeout(()=>location.reload(),600);
  if(!sw||!sw.getRegistration){ go(); return; }
  sw.getRegistration().then(r=>r&&r.update().then(()=>{ if(r.waiting) r.waiting.postMessage({t:'skipWaiting'}); })).catch(()=>{}).then(go); }
function shBuzz(){ try{ if(loadSettings().haptics&&navigator.vibrate) navigator.vibrate(30); }catch(e){} }

/* ---------- confirmBox (hold = press and hold for that many ms) ---------- */
function confirmBox(text,o){
  o=o||{}; const r=shEl('shConf'), ok=shEl('shConfOk'); if(!r||!ok) return Promise.resolve(false);
  if(SH.conf) shConfDone(false);
  const hold=Math.max(0,+o.hold||0);
  shEl('shConfT').textContent=String(text==null?'':text);
  ok.textContent=o.okText||(hold?'กดค้างเพื่อยืนยัน':'ยืนยัน'); ok.classList.toggle('hold',hold>0); ok.classList.remove('on'); ok.style.setProperty('--hold',hold+'ms');
  r.hidden=false;
  return new Promise(res=>{ SH.conf={res, hold, timer:0}; shSync(); setTimeout(()=>{ try{ shEl('shConfNo').focus({preventScroll:true}); }catch(e){} },0); }); }
function shConfDone(v){ const c=SH.conf; if(!c) return; SH.conf=null; clearTimeout(c.timer);
  shEl('shConf').hidden=true; shEl('shConfOk').classList.remove('on'); if(v) shBuzz(); c.res(!!v); shSync(); }
function shHoldOn(){ const c=SH.conf; if(!c||!c.hold||c.timer) return; shEl('shConfOk').classList.add('on'); c.timer=setTimeout(()=>shConfDone(true),c.hold); }
function shHoldOff(){ const c=SH.conf; if(!c||!c.hold||!c.timer) return; clearTimeout(c.timer); c.timer=0; shEl('shConfOk').classList.remove('on'); }

/* ---------- character window frame: header + tabs from CHARTABS (§8.8) ---------- */
function shTabs(){ return Object.keys(CHARTABS).filter(k=>CHARTABS[k]&&typeof CHARTABS[k].render==='function').sort((a,b)=>(CHARTABS[a].order||0)-(CHARTABS[b].order||0)); }
function openCharWindow(tab){
  if(!curChar()){ toast('ยังไม่มีตัวละคร · สร้างตัวละครก่อน','info'); UI.go('scrNew'); return; }
  const ids=shTabs(); SH.tab=ids.includes(tab)?tab:ids.includes(SH.tab)?SH.tab:(ids[0]||null);
  if(shTop()==='scrChar'&&!shEl('scrChar').hidden) shCharRender(); else UI.go('scrChar',{tab:SH.tab}); }
function shCharRender(a){
  const ch=SH.cwCh=curChar(); if(!ch) return;
  const ids=shTabs(); if(a&&ids.includes(a.tab)) SH.tab=a.tab; if(!ids.includes(SH.tab)) SH.tab=ids[0]||null;
  shCharHead(ch);
  const bar=shEl('cwTabs'), root=shEl('cwBody'); bar.textContent=''; root.textContent=''; bar.hidden=ids.length<2;
  for(const id of ids){ const b=shBtn(CHARTABS[id].n||id,'',()=>{ if(SH.tab!==id){ SH.tab=id; shCharRender(); } });
    b.setAttribute('role','tab'); b.setAttribute('aria-selected',String(id===SH.tab)); bar.append(b); }
  if(!SH.tab){ root.append(shMk('p','hint','ยังไม่มีแท็บให้แสดง')); return; }
  try{ CHARTABS[SH.tab].render(root,ch); }catch(e){ console.error(e); root.append(shMk('p','hint','แสดงแท็บนี้ไม่ได้')); } }
function shCharHead(ch){
  const h=shEl('cwHead'); if(!h||!ch) return; h.textContent='';
  const n=shMk('div','cw-n'); n.append(shMk('b','',ch.name),shMk('small','',shJobName(ch)+(ch.pts>0?' · แต้มสถานะเหลือ '+ch.pts:'')+(ch.sp>0?' · แต้มสกิล '+ch.sp:'')));
  const der=shMk('div','cw-der'), p=shDerived(ch);
  if(p){ const red=Math.round(100*p.armor/(p.armor+22+.8*ch.lv));
    for(const [k,v] of [['พลังโจมตี',Math.round(100*p.might)],['ป้องกัน',Math.round(p.armor*10)/10+' (−'+red+'%)'],['HP',Math.round(p.maxHp)],['คริ',Math.round(p.crit*100)+'%'],['คูลดาวน์','−'+Math.round((1-p.cdMul)*100)+'%']]){
      const s=shMk('span','',k+' '); s.append(shMk('b','',v)); der.append(s); } }
  h.append(shPortrait(ch,64),n,shBars(ch),der); }
function shDerived(ch){   // §3.7 display numbers from a throw-away player (no run state touched)
  const c=CLS[ch.cls]; if(!c) return null;
  try{ const p=makePlayer(c); p.adv=c.adv.find(a=>a.id===ch.job)||null; p.bonus=buildRunBonus(ch); recalc(p); return p; }catch(e){ return null; } }

/* ---------- shared bits (hub, character list, window header) ---------- */
function shJobName(ch){ const c=CLS[ch&&ch.cls]; if(!c) return ''; const a=ch.job&&c.adv.find(x=>x.id===ch.job); return a?a.n:c.n; }
function shLook(ch){ const c=CLS[ch.cls]||CLASSES[0], a=c.adv.find(x=>x.id===ch.job);
  return Object.assign({},c.look,a?a.look:null,typeof gearLook==='function'?gearLook(ch):null); }
function shPortrait(ch,sz){ const c=document.createElement('canvas'); c.className='sh-pt'; c.style.width=c.style.height=sz+'px'; c.setAttribute('aria-hidden','true');
  try{ portrait(c,shLook(ch),sz); }catch(e){} return c; }
function shBar(lbl,r,txt,cls){ const b=shMk('div','sh-bar'+(cls?' '+cls:'')), t=shMk('span','sh-bt'), f=shMk('i');
  f.style.transform='scaleX('+clamp(+r||0,0,1).toFixed(3)+')'; t.append(f); b.append(shMk('span','sh-bl',lbl),t,shMk('span','sh-bv',txt||'')); return b; }
function shBars(ch){ const w=shMk('div','sh-bars'), t2=!!ch.job, jc=t2?BAL.CAP.job2:BAL.CAP.job1, top=ch.lv>=BAL.CAP.base, jtop=ch.jlv>=jc;
  w.append(shBar('Lv '+ch.lv,top?1:ch.xp/BAL.bxpNeed(ch.lv),top?'สูงสุด':fmtNum(ch.xp)+'/'+fmtNum(BAL.bxpNeed(ch.lv))),
    shBar('Job '+ch.jlv,jtop?1:ch.jxp/BAL.jxpNeed(ch.jlv,t2?2:1),jtop?'เต็ม':fmtNum(ch.jxp)+'/'+fmtNum(BAL.jxpNeed(ch.jlv,t2?2:1)),'job'));
  return w; }

/* ---------- boot: 99-boot.js boot() calls shBoot() at runtime (nothing here runs at load, §7.4) ---------- */
function shBoot(){
  if(SH.booted) return; SH.booted=true;
  try{ SH.noHist=window.parent!==window; }catch(e){ SH.noHist=true; }   // artifact iframe: back belongs to the host page
  if(!SH.noHist){ const s=history.state; SH.hd=s&&s.rg?s.d|0:0; if(!SH.hd) try{ history.replaceState({rg:'root', d:0},''); }catch(e){}
    addEventListener('popstate',shOnPop); for(const ev of ['pointerdown','pointerup','keydown']) addEventListener(ev,shGest,true); }
  shWire(); for(const id of SH_META) if(!UIKEY[id]) UIKEY[id]=shKey;
  hbBoot();
  if(!(typeof authWantsScreen==='function'&&typeof uiaOpenAuth==='function'&&authWantsScreen()&&uiaOpenAuth('in'))) UI.home(); }
function shWire(){
  document.addEventListener('click',e=>{ const t=e.target&&e.target.closest&&e.target.closest('[data-back],[data-x]'); if(!t) return; if(t.hasAttribute('data-x')) closeSheet(); else UI.back(); });
  for(const b of shEl('shNav').children) b.addEventListener('click',()=>shNavGo(b.dataset.go));
  shEl('shFab').addEventListener('click',()=>UI.back());
  const g=shEl('shGrip'), card=shEl('shCard'); let y0=null, dy=0;
  g.addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; y0=e.clientY; dy=0; card.style.transition='none'; try{ g.setPointerCapture(e.pointerId); }catch(_){} });
  g.addEventListener('pointermove',e=>{ if(y0==null) return; dy=Math.max(0,e.clientY-y0); card.style.transform='translateY('+dy+'px)'; });
  const up=()=>{ if(y0==null) return; y0=null; card.style.transition=''; if(dy>70) closeSheet(); else card.style.transform=''; };
  g.addEventListener('pointerup',up); g.addEventListener('pointercancel',up);
  const c=shEl('shConf'), ok=shEl('shConfOk');
  shEl('shConfNo').addEventListener('click',()=>shConfDone(false));
  c.addEventListener('click',e=>{ if(e.target===c) shConfDone(false); });
  ok.addEventListener('click',()=>{ if(SH.conf&&!SH.conf.hold) shConfDone(true); });
  ok.addEventListener('pointerdown',e=>{ if(!SH.conf||!SH.conf.hold) return; e.preventDefault(); try{ ok.setPointerCapture(e.pointerId); }catch(_){} shHoldOn(); });
  for(const ev of ['pointerup','pointercancel','lostpointercapture']) ok.addEventListener(ev,shHoldOff);
  ok.addEventListener('keydown',e=>{ if((e.key==='Enter'||e.key===' ')&&SH.conf&&SH.conf.hold){ e.preventDefault(); if(!e.repeat) shHoldOn(); } });
  ok.addEventListener('keyup',e=>{ if(e.key==='Enter'||e.key===' ') shHoldOff(); });
  ok.addEventListener('contextmenu',e=>e.preventDefault()); }
