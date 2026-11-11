/* ================= 51-ui-auth.js · lane N · scrAuth, scrAccount, conflict / link sheets ================= */
/* Unreachable when CLOUD_OK is false (claude.ai artifact): the screens are registered only when AUTH_ON, every entry point
   returns false before it touches the DOM when CLOUD_OK is false, buttons are wired on first open (uiaWire) and the BUS
   listeners come from uiaInit(), which only cloudInit() calls. User text (names from a save, server summaries) goes in with
   textContent only. uiaOpenAuth(view, msg, after): after = what to do once signed in (59a: back to the shop) instead of home. */
if(AUTH_ON){ regScreen('scrAuth'); regScreen('scrAccount'); }
const UIA={inited:false, wired:false, mode:'in', email:'', sentKind:'signup', resendAt:0, tick:0, bak:null, after:null};
const UIA_HOLD=1000;

function uiaInit(){   // cloudInit() → here (CLOUD_OK only)
  if(!CLOUD_OK||UIA.inited) return; UIA.inited=true;
  BUS.on('sync',ev=>{ if((ev==='conflict'||ev==='choose'||ev==='askMove')&&uiaCalm()) uiaChoiceSheet(); uiaAcctRender(); });
  BUS.on('auth',(ev,r)=>{ if(ev==='redirect') uiaRedirectResult(r); uiaAcctRender(); });
}
function uiaCalm(){ return typeof G==='undefined'||!G||!!G.over; }   // sheets wait while a run is on (the hub chip says "แตะเพื่อเลือก")
function uiaEl(id){ return $('#'+id); }
function uiaOn(id,ev,f){ const n=uiaEl(id); if(n) n.addEventListener(ev,f); }
function uiaMk(tag,cls,text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!==undefined) n.textContent=text; return n; }
function uiaBtn(text,cls,fn){ const b=uiaMk('button','btn ua-wide '+(cls||'ghost'),text); b.type='button'; b.addEventListener('click',fn); return b; }
function uiaErr(msg){ const n=uiaEl('uaErr'); if(n) n.textContent=msg||''; }
function uiaBusy(on,root){
  const r=uiaEl(root||'scrAuth'); if(!r) return;
  r.setAttribute('aria-busy',String(!!on));
  for(const n of r.querySelectorAll('button,input')) n.disabled=!!on;
  uiaEl(root==='scrAccount'?'uaAcctBusy':'uaBusy').hidden=!on;
  if(!on){ uiaTick(); uiaWipeArm(); uiaAcctRender(); }
}

/* ---------- scrAuth ---------- */
function uiaOpenAuth(view,msg,after){   // view: 'in' | 'up' | 'sent' | 'reset'
  if(!CLOUD_OK) return false;
  UIA.after=typeof after==='function'?after:null;
  uiaWire(); uiaView(view||'in'); uiaErr(msg||''); UI.go('scrAuth'); return true;
}
function uiaDone(){ const f=UIA.after; UIA.after=null; UI.home(); if(f) try{ f(); }catch(e){ console.error(e); } }   // signed in
function uiaView(v){
  if(v==='in'||v==='up') UIA.mode=v;
  const main=v==='in'||v==='up';
  uiaEl('uaMain').hidden=!main; uiaEl('uaSent').hidden=v!=='sent'; uiaEl('uaReset').hidden=v!=='reset';
  uiaEl('uaTabIn').setAttribute('aria-pressed',String(UIA.mode==='in'));
  uiaEl('uaTabUp').setAttribute('aria-pressed',String(UIA.mode==='up'));
  uiaEl('uaPw2Row').hidden=UIA.mode!=='up'; uiaEl('uaForgot').hidden=UIA.mode==='up'; uiaEl('uaNC').hidden=true;
  uiaEl('uaPw').setAttribute('autocomplete',UIA.mode==='up'?'new-password':'current-password');
  clearInterval(UIA.tick); UIA.tick=0;
  if(v==='sent'){ UIA.tick=setInterval(uiaTick,1000); uiaTick(); }
}
function uiaTick(){   // [ส่งอีกครั้ง (60 วิ)] countdown while the "sent" view is open
  const b=uiaEl('uaSentAgain'); if(!b) return;
  const left=Math.ceil((UIA.resendAt+ATH_RESEND_MS-Date.now())/1000);
  b.disabled=left>0; b.textContent=left>0?'ส่งอีกครั้ง ('+left+' วิ)':'ส่งอีกครั้ง';
  if(left<=0&&UIA.tick){ clearInterval(UIA.tick); UIA.tick=0; }
}
function uiaSent(kind,msg){ UIA.sentKind=kind; UIA.resendAt=Date.now(); uiaEl('uaSentMsg').textContent=msg; uiaErr(''); uiaView('sent'); }
async function uiaSubmit(){
  const email=uiaEl('uaEmail').value.trim(), pw=uiaEl('uaPw').value;
  if(!athEmailOk(email)) return uiaErr(ATH_MSG.email_bad);
  if(UIA.mode==='up'){
    if(pw.length<ATH_PW_MIN) return uiaErr(ATH_MSG.pw_short);
    if(pw!==uiaEl('uaPw2').value) return uiaErr(ATH_MSG.pw_mismatch);
  } else if(!pw) return uiaErr(ATH_MSG.invalid_credentials);
  uiaErr(''); uiaBusy(true);
  const r=UIA.mode==='up'?await authSignUp(email,pw):await authSignIn(email,pw);
  uiaBusy(false);
  if(r.ok) uiaEl('uaPw').value=uiaEl('uaPw2').value='';
  UIA.email=email;
  if(UIA.mode==='up'){ if(!r.ok) return uiaErr(r.msg); if(r.in){ toast(r.msg,'good'); uiaDone(); return; } return uiaSent('signup',r.msg); }
  if(r.ok){ toast('เข้าสู่ระบบแล้ว','good'); uiaDone(); return; }
  uiaErr(r.msg); uiaEl('uaNC').hidden=r.code!=='email_not_confirmed';
}
async function uiaForgot(){
  const email=uiaEl('uaEmail').value.trim();
  if(!athEmailOk(email)) return uiaErr('ใส่อีเมลก่อน แล้วกด "ลืมรหัสผ่าน?" อีกครั้ง');
  uiaBusy(true); const r=await authRecover(email); uiaBusy(false);
  UIA.email=email; if(r.ok) uiaSent('recovery',r.msg); else uiaErr(r.msg);
}
async function uiaResend(){
  if(!UIA.email) return uiaView('in');
  uiaBusy(true);
  const r=UIA.sentKind==='recovery'?await authRecover(UIA.email):await authResend(UIA.email);
  uiaBusy(false);
  if(r.ok) uiaSent(UIA.sentKind,r.msg); else uiaErr(r.msg);
}
async function uiaSetPw(){
  const a=uiaEl('uaNewPw').value, b=uiaEl('uaNewPw2').value;
  if(a.length<ATH_PW_MIN) return uiaErr(ATH_MSG.pw_short);
  if(a!==b) return uiaErr(ATH_MSG.pw_mismatch);
  uiaBusy(true); const r=await authSetPassword(a); uiaBusy(false);
  if(!r.ok) return uiaErr(r.msg);
  uiaEl('uaNewPw').value=uiaEl('uaNewPw2').value=''; toast(r.msg,'good'); UI.home();
}
function uiaRedirectResult(r){   // authHandleRedirect() → BUS 'auth' 'redirect'
  if(!r||!CLOUD_OK) return;
  if(r.kind==='recovery') uiaOpenAuth('reset');
  else if(r.kind==='signup'||r.kind==='google'||r.kind==='implicit'){ if(r.msg) toast(r.msg,'good'); if(curScreen()==='scrAuth') UI.home(); }
  else if(r.kind==='nover'||r.kind==='error') uiaOpenAuth('in',r.msg);
}

/* ---------- scrAccount ---------- */
function uiaOpenAccount(){
  if(!CLOUD_OK) return false;
  if(AUTH.state!=='in'&&AUTH.state!=='expired') return uiaOpenAuth('in');
  uiaWire(); UIA.bak=null; uiaEl('uaWipeTxt').value=''; uiaWipeArm(); uiaAcctRender(); UI.go('scrAccount');
  cloudBackupInfo().then(b=>{ UIA.bak=b; uiaAcctRender(); });
  return true;
}
function uiaAcctRender(){
  if(!CLOUD_OK) return;
  const m=uiaEl('uaAcctMail'); if(!m||uiaEl('scrAccount').hidden) return;
  m.textContent=authEmailMasked()||'—';
  uiaEl('uaAcctStatus').textContent=cloudStatus().text;
  const en=uiaEl('uaEnt'); if(en) en.textContent=typeof entSummaryTh==='function'?entSummaryTh():'';   // purchases (28 · rg_purchases)
  uiaEl('uaBakSum').textContent=UIA.bak?uiaSumLine(UIA.bak):'ยังไม่มีข้อมูลสำรอง';
  uiaEl('uaRestore').disabled=!UIA.bak||AUTH.state!=='in';
  uiaEl('uaSyncNow').disabled=AUTH.state!=='in';
  uiaEl('uaSyncNow').textContent=AUTH.state==='expired'?'เข้าสู่ระบบอีกครั้ง':'ซิงก์ตอนนี้';
  if(AUTH.state==='expired') uiaEl('uaSyncNow').disabled=false;
}
function uiaWipeArm(){ const t=uiaEl('uaWipeTxt'), b=uiaEl('uaWipe'); if(t&&b) b.disabled=t.value.trim()!=='ลบ'||AUTH.state!=='in'; }
const UIA_RES={ok:'ซิงก์แล้ว', none:'ซิงก์แล้ว', offline:ATH_OFFLINE, conflict:'พบความคืบหน้าสองชุด · เลือกชุดที่จะใช้', readonly:'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป · อัปเดตแอปก่อน', error:'ซิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง'};
async function uiaAcctRun(fn,okText){
  uiaBusy(true,'scrAccount'); let r='error';
  try{ r=await fn(); }catch(e){ console.error('account',e&&e.message); }
  uiaBusy(false,'scrAccount');
  toast(r==='ok'&&okText?okText:(UIA_RES[r]||UIA_RES.error),r==='ok'||r==='none'?'good':r==='conflict'?'info':'bad');
  if(r==='conflict'&&uiaCalm()) uiaChoiceSheet();
  UIA.bak=await cloudBackupInfo(); uiaAcctRender(); return r;
}

/* ---------- sheets: conflict (§6.9 / §8.12) and first sign-in link ---------- */
function uiaSumLine(side){   // "2 ตัวละคร · Lv สูงสุด 23 · 6 ชม. · แก้ 6 พ.ย. 12:01 · iPhone"
  const s=side.sum||{chars:[]}, n=s.chars.length, top=n?Math.max(...s.chars.map(c=>c.lv)):0, h=(s.play||0)/3600;
  const parts=[n+' ตัวละคร'];
  if(n) parts.push('Lv สูงสุด '+top);
  parts.push(h>=1?Math.round(h)+' ชม.':Math.round(h*60)+' นาที');
  if(side.at){ const d=new Date(side.at); parts.push('แก้ '+d.toLocaleDateString('th-TH',{day:'numeric', month:'short'})+' '+d.toLocaleTimeString('th-TH',{hour:'2-digit', minute:'2-digit', hour12:false})); }
  const dev=String(side.dev||'').split(' ')[1]; if(dev) parts.push(dev);
  return parts.join(' · ');
}
function uiaCard(title,side,btnText,fn){
  const c=uiaMk('div','ua-card');
  c.append(uiaMk('h3','',title), uiaMk('p','',side?uiaSumLine(side):'ยังไม่มีความคืบหน้า'));
  if(side&&side.sum&&side.sum.chars.length){
    const ul=uiaMk('ul');
    for(const ch of side.sum.chars){ const cls=ch.cls&&Object.prototype.hasOwnProperty.call(CLS,ch.cls)?CLS[ch.cls].n:''; ul.append(uiaMk('li','',ch.n+' · Lv '+ch.lv+(cls?' · '+cls:''))); }
    c.append(ul);
  }
  if(btnText) c.append(uiaBtn(btnText,'primary',fn));
  return c;
}
function uiaChoiceSheet(){
  if(!CLOUD_OK) return false;
  const c=cloudConflictInfo(); if(!c) return false;
  const box=uiaMk('div','ua-sheet');
  if(c.kind==='askMove'){
    box.append(uiaCard('ความคืบหน้าในเครื่องนี้',c.local),
      uiaBtn('ย้าย','primary',()=>uiaResolve('local')), uiaBtn('เริ่มใหม่','ghost',()=>uiaResolve('cloud')),
      uiaMk('p','hint','เซฟผู้เยี่ยมชมในเครื่องยังอยู่เหมือนเดิม ลบเองได้ที่หน้าบัญชี'));
    const who=typeof authEmailMasked==='function'?authEmailMasked():''; if(who) box.prepend(uiaMk('p','hint','บัญชี: '+who));
    sheet(box,{title:'ย้ายความคืบหน้าในเครื่องขึ้นบัญชีนี้?'});
  } else {
    const link=c.kind==='choose';
    box.append(uiaCard(link?'ในเครื่อง (ผู้เยี่ยมชม)':'เครื่องนี้',c.local,link?'ใช้ของในเครื่อง':'ใช้ชุดนี้',()=>uiaResolve('local')),
      uiaCard(link?'ของบัญชี':'บนคลาวด์',c.srv,link?'ใช้ของบัญชี':'ใช้ชุดนี้',()=>uiaResolve('cloud')),
      uiaMk('p','hint','ชุดที่ไม่ได้เลือกจะเก็บเป็นข้อมูลสำรอง 1 ชุด กู้คืนได้ที่หน้าบัญชี'));
    sheet(box,{title:'พบความคืบหน้าสองชุด'});
  }
  return true;
}
async function uiaResolve(choice){
  closeSheet(); toast('⟳ กำลังซิงก์…','info');
  const r=await cloudResolve(choice);
  toast(r==='ok'||r==='none'?'เรียบร้อย':UIA_RES[r]||UIA_RES.error,r==='ok'||r==='none'?'good':'bad');
  if(r==='conflict'&&uiaCalm()) uiaChoiceSheet();
}
function uiaStatusTap(){   // hub chip (lane B): what a tap on cloudStatus() does
  if(!CLOUD_OK) return false;
  const k=cloudStatus().k;
  if(k==='guest'||k==='expired') return uiaOpenAuth('in');
  if(k==='conflict') return uiaChoiceSheet();
  if(k==='newer'){ if(typeof shUpdateApp==='function') shUpdateApp(); return true; }   // 50: new worker → skipWaiting → reload
  return uiaOpenAccount();
}

/* ---------- wiring (first open only) ---------- */
function uiaWire(){
  if(UIA.wired||!CLOUD_OK) return; UIA.wired=true;
  uiaOn('uaGoogle','click',async()=>{ uiaBusy(true); try{ await authGoogle(); }catch(e){ uiaBusy(false); uiaErr(ATH_OFFLINE); } setTimeout(()=>uiaBusy(false),6000); });
  uiaOn('uaTabIn','click',()=>{ uiaErr(''); uiaView('in'); });
  uiaOn('uaTabUp','click',()=>{ uiaErr(''); uiaView('up'); });
  uiaOn('uaEye','click',()=>{ const p=uiaEl('uaPw'), show=p.type==='password'; p.type=show?'text':'password';
    uiaEl('uaEye').setAttribute('aria-pressed',String(show)); uiaEl('uaEye').setAttribute('aria-label',show?'ซ่อนรหัสผ่าน':'แสดงรหัสผ่าน'); });
  uiaOn('uaMain','submit',e=>{ e.preventDefault(); uiaSubmit(); });   // button or Enter · method="dialog" never navigates anyway
  uiaOn('uaNC','click',async()=>{ UIA.sentKind='signup'; await uiaResend(); });
  uiaOn('uaForgot','click',uiaForgot);
  uiaOn('uaGuest','click',()=>{ UIA.after=null; authChooseGuest(); UI.home(); });
  uiaOn('uaSentAgain','click',uiaResend);
  uiaOn('uaSentBack','click',()=>{ uiaErr(''); uiaView('in'); });
  uiaOn('uaReset','submit',e=>{ e.preventDefault(); uiaSetPw(); });
  uiaOn('uaResetSkip','click',()=>UI.home());
  uiaOn('uaSyncNow','click',()=>AUTH.state==='expired'?uiaOpenAuth('in'):uiaAcctRun(cloudSyncNow));
  uiaOn('uaRestore','click',async()=>{
    if(!UIA.bak) return;
    const ok=await confirmBox('กู้คืนข้อมูลสำรอง ('+uiaSumLine(UIA.bak)+')? ข้อมูลบนคลาวด์ตอนนี้จะสลับไปเป็นข้อมูลสำรองแทน',{hold:UIA_HOLD, okText:'กดค้างเพื่อกู้คืน'});
    if(ok) uiaAcctRun(cloudRestoreBackup,'กู้คืนแล้ว'); });
  uiaOn('uaExport','click',()=>{ const j=exportSave(); if(!j) return toast('ยังไม่มีเซฟให้ส่งออก','bad'); if(typeof hbDownload==='function') hbDownload(j); });   // 52
  uiaOn('uaSignOut','click',async()=>{ uiaBusy(true,'scrAccount'); await authSignOut(); uiaBusy(false,'scrAccount'); toast('ออกจากระบบแล้ว (เครื่องนี้)','info'); UI.home(); });
  uiaOn('uaDelGuest','click',async()=>{
    if(!SAVE||SAVE.owner==null) return toast('ตอนนี้กำลังเล่นเซฟผู้เยี่ยมชมอยู่ จึงลบไม่ได้','bad');
    if(STORE.get('runeguard.save.guest')===null) return toast('ไม่มีเซฟผู้เยี่ยมชมในเครื่องนี้','info');
    if(!await confirmBox('ลบเซฟผู้เยี่ยมชมในเครื่องนี้? ย้อนกลับไม่ได้',{hold:UIA_HOLD, okText:'กดค้างเพื่อลบ'})) return;
    STORE.del('runeguard.save.guest'); STORE.del('runeguard.save.guest.bak'); toast('ลบเซฟผู้เยี่ยมชมแล้ว','good'); });
  uiaOn('uaWipeTxt','input',uiaWipeArm);
  uiaOn('uaWipe','click',async()=>{
    if(uiaEl('uaWipeTxt').value.trim()!=='ลบ') return;
    if(!await confirmBox('ลบข้อมูล Runeguard บนคลาวด์ทั้งหมด (รวมข้อมูลสำรอง)? บัญชีผู้ใช้จะไม่ถูกลบ เพราะใช้ร่วมกับแอปอื่น',{hold:UIA_HOLD, okText:'กดค้างเพื่อลบ'})) return;
    uiaEl('uaWipeTxt').value=''; uiaAcctRun(cloudWipe,'ลบข้อมูลบนคลาวด์แล้ว · เซฟในเครื่องยังอยู่'); });
  uiaOn('uaAcctBack','click',()=>UI.back());
}
