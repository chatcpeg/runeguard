/* ================= 41-save-local.js · lane C · local save (the only file that assigns SAVE) · curChar ================= */
// Keys (§6.2): runeguard.save.guest / runeguard.save.u.<uid> (+ .bak) · runeguard.settings. runeguard.best is read only.
// Every access goes through STORE (try/catch inside), so a blocked localStorage (artifact, private mode) plays from memory.
// Write-ahead: the previous value that still parses is copied to .bak, then the new one is written.
// Load: main → .bak → new save. Usable = an object with an integer v ≥ 1; a v1 save also needs acct {} + chars [] (else → .bak).
// A save from a newer app (v > SCHEMA_V) is read only: never written, never pushed · export gives its stored text unchanged.
// Two tabs (or tab + installed PWA) share the keys: svlLast = the main text this tab last read or wrote. A write that finds anything
// else there (another tab saved) never overwrites it: reload + toast instead. The 'storage' event reloads an idle tab at once;
// mid-run the reload waits for onRunEnd (svlFresh), so the reward lands on top of the other tab's progress.
// Sandbox (RG.profile.sandbox): the save lives in memory only and nothing is written to localStorage at all.
const SVL_KEY={guest:'runeguard.save.guest', user:'runeguard.save.u.', settings:'runeguard.settings', best:'runeguard.best'};
const SVL_SET_DEF={mute:false, autoPot:.35, cardAuto:false, haptics:true};
let svlOwner=null, svlSandbox=false, svlTimer=0, svlStored=true, svlFrom='none', svlSet=null, svlHooked=false, svlLast=null, svlRaw=null, svlBusy=0;
function svlKeyFor(owner){ return owner?SVL_KEY.user+owner:SVL_KEY.guest; }
function svlParse(raw){ if(raw==null) return {k:'none'};
  try{ const o=JSON.parse(raw); if(svObj(o)&&Number.isInteger(o.v)&&o.v>=1&&(o.v>SCHEMA_V||(svObj(o.acct)&&Array.isArray(o.chars)))) return {k:'ok', o, raw}; }catch(e){} return {k:'bad'}; }
function svlRead(key){ return svlParse(STORE.get(key)); }
function svlBest(){ const raw=STORE.get(SVL_KEY.best); if(!raw) return null; try{ return JSON.parse(raw); }catch(e){ return null; } }
function svlNote(text,kind){ try{ if(typeof toast==='function') toast(text,kind); }catch(e){} }
// later classic records (classic keeps writing runeguard.best) are folded in on every load — the key itself is never touched
function svlMergeBest(s,best){ const imp=svImportBest(best); if(!imp) return; const c=s.acct.records.classic;
  for(const k in imp) if(!c[k]||imp[k].score>c[k].score) c[k]=imp[k]; }
function loadSaveFor(owner){
  owner=svOwner(owner); clearTimeout(svlTimer); svlTimer=0; svlOwner=owner;
  if(svlSandbox){ if(!SAVE){ SAVE=migrateSave(null,null); SAVE.owner=owner; } return SAVE; }
  svlHook();
  const key=svlKeyFor(owner), best=svlBest(), raw=STORE.get(key);
  let r=svlParse(raw), from='main';
  svlLast=raw;                                                           // what this tab saw in the main key
  if(r.k!=='ok'){ const b=svlRead(key+'.bak'); if(b.k==='ok'){ r=b; from='bak'; } else from=r.k==='none'&&b.k==='none'?'new':'lost'; }
  let s;
  try{ s=migrateSave(r.k==='ok'?r.o:null,best); }catch(e){ console.error(e); s=migrateSave(null,best); from='lost'; }
  if(!s.ro){ if(r.k==='ok') svlMergeBest(s,best); s.owner=owner; }
  SAVE=s; svlFrom=from; svlRaw=s.ro&&r.k==='ok'?r.raw:null;
  if(from==='bak') svlNote('เซฟในเครื่องเสีย ใช้สำรองแทน','bad');
  else if(from==='lost') svlNote('เซฟในเครื่องเสีย เริ่มเซฟใหม่','bad');
  if(s.ro) svlNote('มีเวอร์ชันใหม่ แตะเพื่ออัปเดต','info');
  else if(from!=='main') svlWrite('load',true);                           // keep the new / migrated / restored save
  BUS.emit('char',curChar());
  return SAVE; }
function svlEnsure(){ if(!SAVE) loadSaveFor(svlOwner); return SAVE; }
function svlWrite(reason,keepMt){
  if(!SAVE||SAVE.ro||svlSandbox) return false;
  const key=svlKeyFor(svlOwner), prev=STORE.get(key);
  if(prev!==svlLast){ if(!svlBusy) svlReload(); return false; }       // another tab saved since this tab read: keep its progress
  if(!keepMt) SAVE.mt=Date.now(); SAVE.app=SV_APP;
  let json; try{ json=JSON.stringify(SAVE); }catch(e){ console.error(e); return false; }
  if(json.length>200*1024) console.warn('Runeguard: เซฟมีขนาด '+Math.round(json.length/1024)+' KB (เกิน 200 KB)');
  if(prev&&prev!==json&&svlBakOk(prev,key)) STORE.set(key+'.bak',prev);
  svlStored=STORE.set(key,json); if(svlStored) svlLast=json;
  BUS.emit('save',reason||'');
  return svlStored; }
// write-ahead copy only of a usable save, and never a save with no progress over a .bak that has some
function svlBakOk(prev,key){ const p=svlParse(prev); if(p.k!=='ok') return false; const b=svlRead(key+'.bak'); if(b.k!=='ok') return true;
  try{ return !(isTrivialSave(validateSave(p.o))&&!isTrivialSave(validateSave(b.o))); }catch(e){ return true; } }
function svlReload(){ svlBusy=1; try{ loadSaveFor(svlOwner); }finally{ svlBusy=0; }
  try{ if(typeof G!=='undefined'&&G&&G.char&&typeof pgLive==='function') pgLive(G,G.char); }catch(e){}   // a held run follows the reloaded character
  svlNote('ข้อมูลถูกแก้จากอีกแท็บ · โหลดล่าสุดแล้ว','info'); }
// another tab saved since this tab last read/wrote → reload now (true). Callers holding a character re-find it by id.
function svlFresh(){ if(!SAVE||svlSandbox||SAVE.ro||svlBusy||STORE.get(svlKeyFor(svlOwner))===svlLast) return false; svlReload(); return true; }
function svlOnStorage(e){
  if(!e||svlSandbox||!SAVE) return;
  if(e.key===null||e.key===SVL_KEY.settings) svlSet=null;
  if(e.key!==null&&e.key!==svlKeyFor(svlOwner)) return;
  if(typeof G!=='undefined'&&G&&G.char&&!G.over) return;               // mid-run: onRunEnd calls svlFresh before the reward
  svlFresh(); }
function svlHook(){ if(svlHooked) return; svlHooked=true;            // flush a pending debounced save when the page goes away
  try{ const f=()=>{ if(svlTimer) saveNow('hide'); }; document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') f(); }); window.addEventListener('pagehide',f); }catch(e){}
  try{ window.addEventListener('storage',svlOnStorage); }catch(e){} }
function saveLocal(reason){ if(!SAVE||SAVE.ro||svlSandbox) return; svlHook(); clearTimeout(svlTimer); svlTimer=setTimeout(()=>{ svlTimer=0; svlWrite(reason,false); },800); }
function saveNow(reason){ clearTimeout(svlTimer); svlTimer=0; return svlWrite(reason,false); }
function curChar(){ const s=svlEnsure(); return s&&s.chars.find(c=>c.id===s.active)||null; }
function setActiveChar(id){ svlFresh(); const s=svlEnsure(), ch=s.chars.find(c=>c.id===id); if(!ch) return false;
  if(s.active!==id){ s.active=id; saveLocal('active'); BUS.emit('char',ch); } return true; }
function createChar(name,clsId){
  svlFresh(); const s=svlEnsure();
  if(s.ro) return 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้';
  if(s.chars.length>=BAL.CAP.chars) return 'สร้างตัวละครได้สูงสุด '+BAL.CAP.chars+' ตัว';
  if(!svHas(CLS,clsId)) return 'ไม่พบอาชีพนี้';
  const nm=typeof name==='string'?name.normalize('NFC').replace(/\s+/g,' ').trim():'';
  if(!svNameOk(nm)) return 'ชื่อต้องยาว 2–16 ตัวอักษร ใช้ได้เฉพาะไทย อังกฤษ ตัวเลข และเว้นวรรค';
  if(s.chars.some(c=>c.name===nm)) return 'มีตัวละครชื่อนี้แล้ว';
  const ch=newChar(nm,clsId);
  const items=typeof ITEMS!=='undefined'?ITEMS:{};                        // §6.3 pioneer cloak, once, when lane E ships it (M2)
  if(s.acct.flags.pioneer&&!s.acct.flags.pioneerCloak&&svHas(items,'c_pioneer')&&typeof makeInst==='function'){
    const it=makeInst('c_pioneer',{}); if(it){ ch.inv.push(it); s.acct.flags.pioneerCloak=true; } }
  s.chars.push(ch); s.active=ch.id; saveNow('create'); BUS.emit('char',ch);
  return ch; }
function deleteChar(id){
  svlFresh(); const s=svlEnsure(); if(s.ro) return false; const i=s.chars.findIndex(c=>c.id===id); if(i<0) return false;
  s.chars.splice(i,1); delete s.acct.records.survival[id];
  if(s.active===id) s.active=s.chars[0]?s.chars[0].id:null;
  saveNow('delete'); BUS.emit('char',curChar()); return true; }
function exportSave(){ const s=svlEnsure(); return s&&s.ro&&!svlSandbox&&svlRaw?svlRaw:JSON.stringify(s); }   // read only: the stored text, newer fields kept
function importSave(json){
  const s=svlEnsure();
  if(s.ro) return {ok:false, err:'ข้อมูลในเครื่องเป็นเวอร์ชันใหม่กว่าแอป กรุณาอัปเดตเกมก่อน'};
  if(typeof json!=='string'||!json.trim()) return {ok:false, err:'ไม่มีข้อมูลเซฟ'};
  if(json.length>SV_MAXB) return {ok:false, err:'ไฟล์เซฟใหญ่เกิน 256 KB'};
  let o; try{ o=JSON.parse(json); }catch(e){ return {ok:false, err:'อ่านไฟล์เซฟไม่ได้ (ไม่ใช่ JSON)'}; }
  if(!svObj(o)||!Number.isInteger(o.v)||o.v<1||!Array.isArray(o.chars)||!svObj(o.acct)) return {ok:false, err:'ไฟล์นี้ไม่ใช่เซฟของ Runeguard'};
  if(o.v>SCHEMA_V) return {ok:false, err:'ไฟล์เซฟมาจากเกมเวอร์ชันใหม่กว่า กรุณาอัปเดตเกมก่อน'};
  let n; try{ n=migrateSave(o,null); }catch(e){ console.error(e); return {ok:false, err:'ไฟล์เซฟเสีย'}; }
  n.owner=svlOwner; clearTimeout(svlTimer); svlTimer=0;
  SAVE=n; svlLast=STORE.get(svlKeyFor(svlOwner)); svlWrite('import',true);   // replaces whatever is stored (even another tab's): it goes to .bak first
  BUS.emit('char',curChar());
  return {ok:true, err:''}; }
function saveReadOnly(){ return !!(SAVE&&SAVE.ro); }
// what the shell can show: owner, sandbox, read only, whether the last write reached localStorage, where the save came from
function svlState(){ return {owner:svlOwner, sandbox:svlSandbox, readonly:saveReadOnly(), stored:svlStored, from:svlFrom}; }
function svlCleanSet(o){ o=svObj(o)?o:{};
  return {mute:o.mute===true, autoPot:o.autoPot===0||o.autoPot===false?0:svNum(o.autoPot,0,.9,SVL_SET_DEF.autoPot), cardAuto:o.cardAuto===true, haptics:o.haptics!==false}; }
function loadSettings(){ if(!svlSet){ let o=null; try{ o=JSON.parse(STORE.get(SVL_KEY.settings)||'null'); }catch(e){} svlSet=svlCleanSet(o); } return Object.assign({},svlSet); }
function saveSettings(patch){ svlSet=svlCleanSet(Object.assign(loadSettings(),svObj(patch)?patch:{}));
  if(!svlSandbox) STORE.set(SVL_KEY.settings,JSON.stringify(svlSet)); return loadSettings(); }

// dev hook (§7.9) · window.RG.profile when the address ends with #dev
DEV.profile={
  // on: true = fresh empty save in memory · 'copy' = a copy of the current save · false = back to the stored save
  sandbox(on){ clearTimeout(svlTimer); svlTimer=0;
    if(on){ const base=on==='copy'&&SAVE?JSON.parse(JSON.stringify(SAVE)):null; svlSandbox=true;
      SAVE=base?migrateSave(base,null):migrateSave(null,null); SAVE.owner=svlOwner; BUS.emit('char',curChar()); return 'sandbox'; }
    svlSandbox=false; SAVE=null; loadSaveFor(svlOwner); return 'local'; },
  get(){ return svlEnsure(); },
  json(){ return exportSave(); },
  state(){ return svlState(); },
  reset(){ if(saveReadOnly()&&!svlSandbox) return 'read only';            // never overwrite a save from a newer app
    clearTimeout(svlTimer); svlTimer=0;
    SAVE=migrateSave(null,svlSandbox?null:svlBest()); SAVE.owner=svlOwner; svlLast=STORE.get(svlKeyFor(svlOwner)); svlWrite('reset',false);
    BUS.emit('char',null); return SAVE; },
  // char({cls, name, lv, xp, jlv, jxp, job, st, sk, pas, load, pts, sp, trial}) → the active character, edited (created if needed)
  char(o){ o=o||{}; const s=svlEnsure(); if(s.ro) return 'read only';
    let ch=curChar();
    if(!ch||(o.cls&&o.cls!==ch.cls)){ const r=createChar(o.name||('นักทดสอบ '+(s.chars.length+1)),o.cls||(ch&&ch.cls)||'swordsman'); if(typeof r==='string') return r; ch=r; }
    const raw=JSON.parse(JSON.stringify(ch));
    for(const k of ['name','lv','xp','jlv','jxp','job']) if(o[k]!==undefined) raw[k]=o[k];
    if(o.st) raw.st=Object.assign({},raw.st,o.st);
    if(o.sk) raw.sk=Object.assign({},raw.sk,o.sk);
    if(o.pas) raw.pas=Object.assign({},raw.pas,o.pas);
    if(o.trial!==undefined){ const t=svObj(o.trial)?o.trial.t2:o.trial; raw.trial={t2:t?1:0}; }
    const v0=svChar(raw);                                                // job/levels clamped first, then the derived fields
    if(o.load) v0.load=o.load.slice();
    else if(o.sk){ v0.load=[]; for(const id of pgSkillPool(v0)) if(v0.sk[id]>0&&v0.load.length<BAL.LOADOUT[pgTier(v0)]) v0.load.push(id); }
    v0.pts=o.pts!==undefined?o.pts:BAL.ptsAt(v0.lv)-pgStSpent(v0);
    v0.sp=o.sp!==undefined?o.sp:BAL.spAt(pgTier(v0),v0.jlv)-pgSpSpent(v0);
    const v=svChar(v0); v.id=ch.id;
    for(const k in ch) delete ch[k]; Object.assign(ch,v);
    saveNow('dev'); BUS.emit('char',ch); return ch; },
  give(id,n,o){ const ch=curChar(); if(!ch) return 'no character';
    let res;
    if(o&&o.r!=null&&typeof makeInst==='function'){ const it=makeInst(id,{}); if(!it) return 'unknown item'; it.r=Math.max(0,Math.min(BAL.REFINE.max,o.r|0)); res=invAdd(ch,it,1); }
    else res=invAdd(ch,id,n||1);
    saveLocal('dev'); return res; },
  gold(n){ const s=svlEnsure(); if(n!==undefined){ s.acct.gold=svInt(n,0,BAL.CAP.gold,0); saveNow('dev'); } return s.acct.gold; },
  exp(base,job){ const ch=curChar(); if(!ch) return 'no character'; const r=grantExp(ch,base,job===undefined?Math.round((+base||0)*BAL.JOB_EXP):job); saveNow('dev'); return r; }
};
