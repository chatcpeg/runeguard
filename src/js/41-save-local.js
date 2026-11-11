/* ================= 41-save-local.js · lane C · local save (the only file that assigns SAVE) · curChar ================= */
// Keys (§6.2): runeguard.save.guest / runeguard.save.u.<uid> (+ .bak) · runeguard.settings. runeguard.best is read only.
// Every access goes through STORE (try/catch inside), so a blocked localStorage (artifact, private mode) plays from memory.
// Write-ahead: the previous value that still parses is copied to .bak, then the new one is written. A main text that does not
// parse (and no usable .bak) is copied to .bak raw first; a no-progress save never replaces a .bak that has progress or raw text.
// Load: main → .bak → new save. Usable = an object with an integer v ≥ 1; a v1 save also needs acct {} + chars [] (else → .bak).
// A save from a newer app (v > SCHEMA_V) is read only: never written, never pushed · export gives its stored text unchanged.
// Two tabs (or tab + installed PWA) share the keys: svlLast = the main text this tab last read or wrote. A write that finds anything
// else there (another tab saved) never overwrites it: reload + toast instead. The 'storage' event reloads an idle tab at once;
// mid-run the reload waits for onRunEnd (svlFresh), so the reward lands on top of the other tab's progress.
// Wipe (key removed / cleared elsewhere, or the main text no longer parses): the tab that sees it writes its copy back (svlRestore).
// If that copy is older than another open tab's (same sid and lineage wb, smaller write counter wc), that tab writes its newer copy
// back over it (svlStaleP), mid-run or not. wc = +1 on every write that changes the save; it never depends on the clock. wb changes
// when a copy comes from an older build (no wc) or from an import: copies of different lineages are never ordered, only reloaded.
// Sandbox (RG.profile.sandbox): the save lives in memory only and nothing is written to localStorage at all.
const SVL_KEY={guest:'runeguard.save.guest', user:'runeguard.save.u.', settings:'runeguard.settings', best:'runeguard.best'};
const SVL_SET_DEF={mute:false, autoPot:.35, cardAuto:false, haptics:true};
let svlOwner=null, svlSandbox=false, svlTimer=0, svlStored=true, svlFrom='none', svlSet=null, svlHooked=false, svlLast=null, svlRaw=null, svlBusy=0;
// svlPersist: localStorage holds a save of this key that a reload would bring back (read at load, or written this session).
// false = storage never kept anything (blocked, artifact, zero quota): the session plays from memory and a reload starts empty.
let svlPersist=false;
// svlSeen: mid-run, the newest main text another tab wrote that this tab could not adopt yet (the reload waits for onRunEnd). On a
// wipe this text goes back, not this tab's own (older, or another lineage) copy · svlMine: 'wb:wc' of this tab's last stamped write
let svlSeen=null, svlMine='';
const svlKnown=new WeakSet();                                          // every character object that has been in SAVE
function svlMark(){ if(SAVE&&Array.isArray(SAVE.chars)) for(const c of SAVE.chars) if(c&&typeof c==='object') svlKnown.add(c); }
// ch was part of this tab's save at some point (still true for an object a reload left behind) → mutators follow it by id
function svlWasSaved(ch){ return !!ch&&typeof ch==='object'&&svlKnown.has(ch); }
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
  owner=svOwner(owner); if(svlTimer&&SAVE&&owner!==svlOwner) saveNow('switch');   // M3 sign-in / out: a pending write goes to its own key first
  clearTimeout(svlTimer); svlTimer=0; svlOwner=owner;
  if(svlSandbox){ if(!SAVE){ SAVE=migrateSave(null,null); SAVE.owner=owner; } svlMark(); return SAVE; }
  svlHook();
  const key=svlKeyFor(owner), best=svlBest(), raw=STORE.get(key);
  let r=svlParse(raw), from='main';
  svlLast=raw; svlSeen=null; svlMine='';                                 // what this tab saw in the main key
  if(r.k!=='ok'){ const b=svlRead(key+'.bak'); if(b.k==='ok'){ r=b; from='bak'; } else from=r.k==='none'&&b.k==='none'?'new':'lost'; }
  let s;
  try{ s=migrateSave(r.k==='ok'?r.o:null,best); }catch(e){ console.error(e); s=migrateSave(null,best); from='lost'; }
  if(!s.ro){ if(r.k==='ok') svlMergeBest(s,best); s.owner=owner; }
  const gift=!s.ro&&svPioneerGift(s,null);                                // M1 pioneers who already made a character
  SAVE=s; svlFrom=from; svlRaw=s.ro&&r.k==='ok'?r.raw:null; svlPersist=from==='main'||from==='bak';
  if(from==='bak') svlNote('เซฟในเครื่องเสีย ใช้สำรองแทน','bad');
  else if(from==='lost') svlNote('เซฟในเครื่องเสีย เริ่มเซฟใหม่','bad');
  if(s.ro) svlNote('มีเวอร์ชันใหม่ แตะเพื่ออัปเดต','info');
  else if(from!=='main'||gift) svlWrite('load',!gift);                    // keep the new / migrated / restored save (a gift is a change: mt stamped)
  if(gift) svlNote('ยินดีต้อนรับกลับ! ได้รับผ้าคลุมผู้บุกเบิก','good');
  if(SAVE&&SAVE.owner==null&&!SAVE.ro&&typeof shopClamp==='function'&&!(typeof shopDevHost==='function'&&shopDevHost())){ const r=shopClamp(SAVE,0); if(r.ru||r.rb) saveNow('ent'); }   // a guest save cannot hold bought runes (buying needs an account)
  svlMark(); BUS.emit('char',curChar());
  return SAVE; }
function svlEnsure(){ if(!SAVE) loadSaveFor(svlOwner); return SAVE; }
function svlWrite(reason,keepMt){
  if(!SAVE||SAVE.ro||svlSandbox) return false;
  const key=svlKeyFor(svlOwner), prev=STORE.get(key), pp=svlParse(prev);
  // another tab saved since this tab read: keep its progress (reload, svlJudge) · prev null = the key was removed elsewhere: write this
  // one back · an older copy of this save (svlStaleP), a wipe, a broken text, or the same content in other text → written over
  let over='';
  // the key is gone (or its text no longer parses and .bak is not newer) while this tab holds a newer text from another tab (svlSeen,
  // mid-run): that text goes back (a broken text goes to .bak raw first when .bak is unusable) and this tab reloads it
  // (the action that wanted to write is not stored · its caller reports the race) — this tab's older memory never goes out over it
  // (if storage refuses even that, memory and svlSeen stay as they are: plays from memory, the next event or write tries again)
  if((prev===null||(pp.k==='bad'&&!svlBakNewer()))&&svlSeenP()){ if(!svlPut(prev,svlSeen)){ svlStored=false; BUS.emit('save',reason||''); return false; }
    svlPersist=true; if(!svlBusy) svlReload(false); return false; }
  if(prev!==svlLast&&prev!==null){ const j=svlJudge(prev); if(j.act==='reload'){ if(!svlBusy) svlReload(j.tie); return false; }
    if(j.act==='same'&&pp.k==='ok') try{ svlMergeBest(SAVE,svRecsToBest(pp.o)); }catch(e){}   // its classic records are kept (svlAdopt)
    over=j.kind||''; }
  // wc (write counter) orders copies of one save: +1 past both this save's own and the copy this write replaces, so the newest write
  // always carries the highest wc whatever the clock does (NTP, a date changed by hand) · mt stays the wall clock (shown to people)
  // · a write that reaches nothing puts both back (undo), so a failed write never makes this tab's copy look newer than it is
  const mt0=SAVE.mt, wc0=SAVE.wc, undo=()=>{ SAVE.mt=mt0; SAVE.wc=wc0; };
  if(!keepMt){ SAVE.mt=Date.now(); SAVE.wc=Math.min(SV_WCMAX,Math.max(svlWcOf(SAVE),pp.k==='ok'?svlWcOf(pp.o):0)+1); }
  SAVE.app=SV_APP;
  let json; try{ json=JSON.stringify(SAVE); }catch(e){ console.error(e); undo(); return false; }
  if(json.length>200*1024) console.warn('Runeguard: เซฟมีขนาด '+Math.round(json.length/1024)+' KB (เกิน 200 KB)');
  if(prev&&prev!==json){ const p=pp;
    if(p.k==='ok'){ if(svlBakOk(p,key)) STORE.set(key+'.bak',prev); }
    // the main text does not parse and there is no usable .bak: its raw text goes to .bak first, so it can still be repaired by
    // hand · if even that write fails, the main key is left as it is (this session plays from memory)
    else if(svlRead(key+'.bak').k!=='ok'&&!STORE.set(key+'.bak',prev)){ svlStored=false; undo(); BUS.emit('save',reason||''); return false; } }
  svlStored=STORE.set(key,json);
  if(svlStored){ svlLast=json; svlSeen=null; svlPersist=true; if(!keepMt) svlMine=SAVE.wb+':'+SAVE.wc; if(over) svlNote(SVL_RESTORE_TH[over],'info'); } else undo();
  BUS.emit('save',reason||'');
  return svlStored; }
// write-ahead copy (p = parsed main): only of a usable save · never a save with no progress over a .bak that has progress,
// nor over a .bak that does not parse (that may be the raw text of a broken save, kept until there is real progress again)
function svlBakOk(p,key){ if(!p||p.k!=='ok') return false; const b=svlRead(key+'.bak'); if(b.k==='none') return true;
  try{ const triv=isTrivialSave(validateSave(p.o)); if(b.k!=='ok') return !triv; return !(triv&&!isTrivialSave(validateSave(b.o))); }catch(e){ return true; } }
function svlReload(tie){ svlBusy=1; try{ loadSaveFor(svlOwner); }finally{ svlBusy=0; }
  try{ if(typeof G!=='undefined'&&G&&G.char&&typeof pgLive==='function') pgLive(G,G.char); }catch(e){}   // a held run follows the reloaded character
  // tie = the other tab's copy has this tab's own wc: both wrote on the same base at once (a busy tab in another process reads a
  // stale cache), so this tab's last action was overwritten · cannot be merged, only said
  if(tie) svlNote('อีกแท็บบันทึกทับพร้อมกัน · การกระทำล่าสุดในแท็บนี้อาจหายไป ตรวจของอีกครั้ง','bad');
  else svlNote('ข้อมูลถูกแก้จากอีกแท็บ · โหลดล่าสุดแล้ว','info'); }
// another tab saved since this tab last read/wrote → reload now (true). Callers holding a character re-find it by id.
// Not a reload (false, objects kept): the main key is gone (localStorage.clear() in another tab, site data cleared), or it now
// holds a different save with no progress while this one has progress (a tab that started over after the clear) → this tab's
// save is written back + toast, instead of reloading into an empty save.
function svlFresh(){ if(!SAVE||svlSandbox||SAVE.ro||svlBusy) return false;
  const cur=STORE.get(svlKeyFor(svlOwner));
  if(cur===svlLast){ if(!(svlSeenP()&&cur!==svlSeen&&svlStaleP(svlParse(cur)))) return false;
    const tie=svlSeenTie(); if(svlRestore(cur,'stale')!=='seen') return false;   // own older text back while svlSeen is newer: put it back, then reload it
    svlReload(tie); return true; }
  const j=svlJudge(cur);
  if(j.act==='restore'){ const tie=svlSeenTie(); if(svlRestore(cur,j.kind)!=='seen') return false; svlReload(tie); return true; }   // svlSeen went back: adopt it now
  if(j.act==='same'){ svlAdopt(cur); return false; }
  svlReload(j.tie); return true; }
// what to do with a main text cur that differs from svlLast (another tab wrote, or it was wiped / broken):
// {act:'restore', kind} = write this tab's copy back (wipe · bad = does not parse and .bak is not a newer copy · stale) ·
// {act:'same'} = the same save content in other text (a restore of what this tab has: other key order, app, merged records) ·
// {act:'reload', tie} = another tab's save wins · tie = it carries the wc of this tab's own last write in this lineage with other
// content: both wrote on one base at once (a busy tab in another process read a stale cache), this tab's last action is overwritten
// → said in red (a tab that only read that copy lost nothing of its own: the plain reload note)
function svlJudge(cur){
  const w=svlWiped(cur); if(w==='bad'&&svlBakNewer()) return {act:'reload', tie:false};
  if(w) return {act:'restore', kind:w};
  const c=svlParse(cur); if(svlStaleP(c)) return {act:'restore', kind:'stale'};
  const eq=c.k==='ok'&&c.o.v<=SCHEMA_V&&c.o.sid===SAVE.sid&&c.o.wb===SAVE.wb&&Number.isInteger(c.o.wc)&&c.o.wc===svlWcOf(SAVE);
  if(eq&&svlSame(c.o)) return {act:'same'};
  return {act:'reload', tie:eq&&svlMine===SAVE.wb+':'+svlWcOf(SAVE)}; }
// o has the save content of this tab's memory or of the text it last read/wrote (mt, app and classic records aside: classic records
// only ever come from svlMergeBest at load, which each tab does on its own), in validated form
function svlSame(o){ try{ const f=x=>{ const v=validateSave(JSON.parse(JSON.stringify(x))); v.app=''; v.mt=0; v.acct.records.classic={}; return JSON.stringify(v); }, a=f(o);
  return a===f(SAVE)||(svlLast!=null&&a===f(JSON.parse(svlLast))); }catch(e){ return false; } }
// a 'same' copy: take its text as this tab's last read (no reload) and keep its better classic records, so the next write has them
function svlAdopt(cur){ svlLast=cur; const c=svlParse(cur); if(c.k==='ok') try{ svlMergeBest(SAVE,svRecsToBest(c.o)); }catch(e){} }
function svRecsToBest(o){ const r=o&&o.acct&&o.acct.records&&o.acct.records.classic, b={}; if(r&&typeof r==='object') for(const k in r) if(svHas(CLS,k)) b[k]=r[k]; return b; }
// a broken main with a .bak that is a newer copy than the best one this tab knows (its own, or svlSeen): load .bak, do not write
// the older copy back
function svlBakNewer(){ const b=svlRead(svlKeyFor(svlOwner)+'.bak'), sn=svlSeenP(), base=sn?sn.o:SAVE;
  return b.k==='ok'&&b.o.v<=SCHEMA_V&&b.o.sid===base.sid&&b.o.wb===base.wb&&Number.isInteger(b.o.wc)&&b.o.wc>svlWcOf(base); }
// mid-run: keep the newest text another tab wrote · an older copy of svlSeen's own save and lineage (a lagging tab put it back) does
// not replace it
function svlSeeAdd(cur){ const c=svlParse(cur); if(c.k!=='ok') return; const sn=svlSeenP();
  if(sn&&c.o.sid===sn.o.sid&&c.o.wb===sn.o.wb&&Number.isInteger(c.o.wc)&&c.o.wc<svlWcOf(sn.o)) return;
  svlSeen=cur; }
// svlSeen carries this tab's own last stamped wc in this lineage with other content: another tab wrote on the same base at once (a
// stale cache), so reloading svlSeen drops this tab's last write → the red note, as svlJudge's tie (checked before it goes back)
function svlSeenTie(){ const sn=svlSeenP(); return !!sn&&sn.o.sid===SAVE.sid&&sn.o.wb===SAVE.wb&&svlWcOf(sn.o)===svlWcOf(SAVE)&&svlMine===SAVE.wb+':'+svlWcOf(SAVE)&&!svlSame(sn.o); }
function svlSeenP(){ if(typeof svlSeen!=='string') return null; const c=svlParse(svlSeen); return c.k==='ok'&&c.o.v<=SCHEMA_V?c:null; }
// storage was wiped elsewhere → 'wipe' (the main key is gone, or holds another save (other sid) with no progress while this one has
// progress) · 'bad' (the main text no longer parses: this tab's copy is newer than .bak, which is one write behind) · '' = no
// Judged against svlBase(), the copy this tab would write back (svlSeen mid-run, else its own) · a save with no progress that lists
// that copy's lineage in wp (wc ≥ its wc) is an import the player made on purpose, not a wipe: reloaded, never fought over
function svlBase(){ const sn=svlSeenP(); return sn?sn.o:SAVE; }
function svlWiped(cur){ if(cur===null) return 'wipe';
  const c=svlParse(cur); if(c.k==='bad') return 'bad'; const B=svlBase();
  if(!(c.k==='ok'&&c.o.v<=SCHEMA_V&&c.o.sid!==B.sid&&!isTrivialSave(B))) return '';
  if(Array.isArray(c.o.wp)&&c.o.wp.some(p=>p&&p.wb===B.wb&&Number.isInteger(p.wc)&&p.wc>=svlWcOf(B))) return '';
  try{ return isTrivialSave(validateSave(c.o))?'wipe':''; }catch(e){ return ''; } }
// the main key holds this same save (same sid) but an older copy than this tab's (smaller write counter wc): after a wipe, a tab
// that had not seen this tab's later writes put its copy back (svlRestore keeps wc). Reloading it would undo this tab's purchases
// and refine results, so this tab's newer copy is written back instead. Every write that changes the save sets wc above both its
// own and the stored copy's (import too), svlRestore keeps it (stamps it when memory has unsaved changes) and a failed write puts it
// back, so a fresher save never carries a smaller wc within one lineage wb. A copy of another lineage (an older build rebuilt it
// without wc/wb, or an import) is never stale: it is reloaded as before · except a copy of a lineage that an import replaced
// (SAVE.wp, any sid) with wc ≤ the wc it had then: the import is newer than it.
// Rule for later code (M3 cloud adopt / restore / resolve): replacing SAVE must go through a stamping svlWrite the same way.
function svlStaleP(c){ if(!(c&&c.k==='ok'&&SAVE&&!SAVE.ro&&c.o.v<=SCHEMA_V&&typeof c.o.wb==='string'&&Number.isInteger(c.o.wc))) return false;
  const B=svlBase(); if(c.o.sid===B.sid&&c.o.wb===B.wb&&c.o.wc<svlWcOf(B)) return true;   // older than the copy this tab would write back
  return Array.isArray(B.wp)&&B.wp.some(p=>p&&p.wb===c.o.wb&&c.o.wc<=p.wc); }
function svlWcOf(o){ return o&&Number.isInteger(o.wc)&&o.wc>0?o.wc:0; }
const SVL_RESTORE_TH={wipe:'ข้อมูลเซฟในเครื่องถูกล้างจากที่อื่น · บันทึกคืนจากเกมที่เปิดอยู่แล้ว', bad:'เซฟในเครื่องเสีย · บันทึกคืนจากเกมที่เปิดอยู่แล้ว',
  stale:'อีกแท็บเขียนข้อมูลที่เก่ากว่าทับ · บันทึกคืนจากแท็บนี้แล้ว'};
// memory with unsaved changes (a debounced write pending, or a write storage refused): the exact text this tab last read/wrote goes
// back (wc as it was), and the unsaved change follows as a normal stamped write (the pending timer, or a new one). Writing the
// changed memory under the old wc would look like another copy with that wc to tabs in step (a false red 'tie'); stamping it would
// let a tab that is behind tie with, and undo, a newer tab's last action (a refine could be rolled again)
// mid-run with a newer text seen from another tab (svlSeen): that text goes back instead (svlLast kept, so onRunEnd reloads it and
// pays the reward on top) · a restore whose write fails puts svlLast back (it must never point at another tab's text this tab did
// not adopt: the next restore would write that text back as its own, and two tabs would rewrite each other)
function svlRestore(cur,kind){
  const was=svlLast, dirty=!!svlTimer||!svlStored, note=()=>svlNote(SVL_RESTORE_TH[kind]||SVL_RESTORE_TH.wipe,'info');
  if(svlSeenP()&&svlSeen!==cur){
    if(svlPut(cur,svlSeen)){ svlPersist=true; BUS.emit('save','restore'); note(); return 'seen'; } return ''; }
  const w=typeof was==='string'&&was!==cur?svlParse(was):null;
  if(dirty&&w&&w.k==='ok'&&w.o.sid===SAVE.sid&&w.o.wb===SAVE.wb&&svlWcOf(w.o)===svlWcOf(SAVE)){
    if(svlPut(cur,was)){ svlPersist=true; BUS.emit('save','restore'); note(); if(!svlTimer) saveLocal('restore'); return 'own'; }
    return ''; }
  clearTimeout(svlTimer); svlTimer=0; svlLast=cur;
  if(svlWrite('restore',true)){ note(); return 'own'; } svlLast=was; return ''; }
// write text over the main text cur with the same write-ahead rules as svlWrite (a usable cur → .bak when svlBakOk · a cur that does
// not parse → .bak raw first when .bak is unusable, else main is left alone)
function svlPut(cur,text){ const key=svlKeyFor(svlOwner), cp=svlParse(cur);
  if(cp.k==='ok'){ if(svlBakOk(cp,key)) STORE.set(key+'.bak',cur); }
  else if(cp.k==='bad'&&svlRead(key+'.bak').k!=='ok'&&!STORE.set(key+'.bak',cur)) return false;
  return STORE.set(key,text); }
function svlOnStorage(e){
  if(!e||svlSandbox||!SAVE) return;
  if(e.key===null||e.key===SVL_KEY.settings) svlSet=null;
  if(e.key!==null&&e.key!==svlKeyFor(svlOwner)) return;
  // mid-run: a reload waits (onRunEnd calls svlFresh before the reward) · a wipe is written back at once (the run keeps G.char), else
  // another tab that makes progress before this run ends would win at onRunEnd and this tab's save, held only in memory, is gone
  // (svlStaleP too: a tab that is behind wrote its copy back over this tab's newer one → this one goes back at once, so neither the
  // stale tab's later writes nor a reload in a third tab can build on the older copy)
  if(typeof G!=='undefined'&&G&&G.char&&!G.over){ if(!SAVE.ro&&!svlBusy){ const cur=STORE.get(svlKeyFor(svlOwner));
    // storage came back to this tab's own text while it holds a newer one from another tab (svlSeen): that one goes back
    if(cur===svlLast){ if(svlSeenP()&&cur!==svlSeen&&svlStaleP(svlParse(cur))) svlRestore(cur,'stale'); return; }
    { const j=svlJudge(cur); if(j.act==='restore') svlRestore(cur,j.kind); else if(j.act==='same') svlAdopt(cur); else svlSeeAdd(cur); } } return; }
  svlFresh(); }
function svlHook(){ if(svlHooked) return; svlHooked=true;            // flush a pending debounced save when the page goes away
  try{ const f=()=>{ if(svlTimer) saveNow('hide'); }; document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='hidden') f(); }); window.addEventListener('pagehide',f); }catch(e){}
  try{ window.addEventListener('storage',svlOnStorage); }catch(e){} }
function saveLocal(reason){ if(!SAVE||SAVE.ro||svlSandbox) return; svlHook(); clearTimeout(svlTimer); svlTimer=setTimeout(()=>{ svlTimer=0; svlWrite(reason,false); },800); }
function saveNow(reason){ clearTimeout(svlTimer); svlTimer=0; return svlWrite(reason,false); }
function curChar(){ const s=svlEnsure(); return s&&s.chars.find(c=>c.id===s.active)||null; }
// a write that found another tab's save reloads instead (svlWrite): then the action is in neither memory nor storage → not success
const SVL_RACE='ข้อมูลถูกแก้จากอีกแท็บ · โหลดล่าสุดแล้ว ลองอีกครั้ง';
function setActiveChar(id){ svlFresh(); const s=svlEnsure(), ch=s.chars.find(c=>c.id===id); if(!ch) return false;
  if(s.active!==id){ s.active=id; saveNow('active'); if(SAVE!==s) return false; BUS.emit('char',ch); } return true; }
function createChar(name,clsId){
  svlFresh(); const s=svlEnsure();
  if(s.ro) return 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้';
  if(s.chars.length>=BAL.CAP.chars) return 'สร้างตัวละครได้สูงสุด '+BAL.CAP.chars+' ตัว';
  if(!svHas(CLS,clsId)) return 'ไม่พบอาชีพนี้';
  const nm=typeof name==='string'?name.normalize('NFC').replace(/\s+/g,' ').trim():'';
  if(!svNameOk(nm)) return 'ชื่อต้องยาว 2–16 ตัวอักษร ใช้ได้เฉพาะไทย อังกฤษ ตัวเลข และเว้นวรรค';
  if(s.chars.some(c=>c.name===nm)) return 'มีตัวละครชื่อนี้แล้ว';
  const ch=newChar(nm,clsId);                                            // §3.8 starter kit: training weapon worn + small potion ×3
  const A=s.acct;                                                        // potions only for the first BAL.KIT_POTS characters ever made
  if((A.kits|0)>=BAL.KIT_POTS){ ch.inv=ch.inv.filter(x=>!(x&&typeof x.u!=='string'&&x.id==='u_potion_s')); if(ch.quick[0]==='u_potion_s') ch.quick[0]=null; }
  A.kits=Math.min(999,(A.kits|0)+1);
  const gift=svPioneerGift(s,ch);                                       // §6.3 the first character of a pioneer: ผ้าคลุมผู้บุกเบิก, once
  s.chars.push(ch); s.active=ch.id; svlKnown.add(ch); saveNow('create'); if(SAVE!==s) return SVL_RACE; BUS.emit('char',ch);
  if(gift) svlNote('ยินดีต้อนรับกลับ! ได้รับผ้าคลุมผู้บุกเบิก','good');
  return ch; }
function deleteChar(id){
  svlFresh(); const s=svlEnsure(); if(s.ro) return false; const i=s.chars.findIndex(c=>c.id===id); if(i<0) return false;
  const rb=Math.max(0,Math.min(1e9,Math.trunc(+s.chars[i].rb||0))); if(rb) s.acct.ru=Math.max(0,Math.trunc(+s.acct.ru||0)-rb);   // its bought runes go back to the wallet (tester pay F8)
  s.chars.splice(i,1); delete s.acct.records.survival[id];
  if(s.active===id) s.active=s.chars[0]?s.chars[0].id:null;
  saveNow('delete'); if(SAVE!==s) return false; BUS.emit('char',curChar()); return true; }
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
  // replaces whatever is stored (even another tab's): it goes to .bak first · a new lineage wb, so no open tab ever takes the import
  // for an older copy of its own save (svlStaleP) · the file's wc is ignored (a hand-edited 9e15 would pin it): svlWrite stamps wc
  // above this tab's and the stored copy's
  const key=svlKeyFor(svlOwner), sc=svlParse(STORE.get(key)), par=sc.k==='ok'&&typeof sc.o.wb==='string'&&Number.isInteger(sc.o.wc)?sc.o:s;
  const okWp=p=>svObj(p)&&typeof p.wb==='string'&&/^w_[a-z0-9_]{1,24}$/.test(p.wb)&&Number.isInteger(p.wc)&&p.wc>=0;   // as validateSave keeps them
  n.wp=[{wb:par.wb, wc:Math.max(svlWcOf(par),par.wb===s.wb?svlWcOf(s):0)}].concat(Array.isArray(par.wp)?par.wp:[]).filter(okWp).slice(0,4).map(p=>({wb:p.wb, wc:Math.min(SV_WCMAX,p.wc)}));
  n.wb=uid('w_'); n.wc=svlWcOf(s);                                       // a new lineage, ordered after the ones it replaced (wp)
  SAVE=n; svlLast=STORE.get(svlKeyFor(svlOwner)); const stored=svlWrite('import',false);
  if(SAVE!==n) return {ok:false, err:SVL_RACE};                            // the write found another tab's save and reloaded instead
  svlMark(); BUS.emit('char',curChar());
  return {ok:true, err:'', warn:stored||svlSandbox?'':'บันทึกลงเครื่องไม่ได้ · เซฟที่นำเข้าอยู่ในหน่วยความจำเท่านั้น ปิดหน้านี้แล้วจะหาย'}; }
// M3 F12: a cloud copy (adopt / restore / conflict pick) or a guest save moved up becomes owner's save by the import rules: new
// lineage wb after the one it replaces (wp), one stamped svlWrite → no tab takes it for a stale copy (svlStaleP) · true = stored
function svlFromCloud(owner,obj){
  owner=svOwner(owner); if(!owner||svlSandbox||!svObj(obj)||!Number.isInteger(obj.v)||obj.v<1||obj.v>SCHEMA_V) return false;
  let n; try{ n=migrateSave(JSON.parse(JSON.stringify(obj)),null); }catch(e){ console.error(e); return false; }
  if(svlTimer&&SAVE&&svlOwner!==owner) saveNow('switch');
  clearTimeout(svlTimer); svlTimer=0; svlHook();
  const key=svlKeyFor(owner), cur=STORE.get(key), sc=svlParse(cur), mine=svlOwner===owner&&SAVE&&!SAVE.ro?SAVE:null;
  const par=sc.k==='ok'&&sc.o.v<=SCHEMA_V&&typeof sc.o.wb==='string'&&Number.isInteger(sc.o.wc)?sc.o:mine;
  const okWp=p=>svObj(p)&&typeof p.wb==='string'&&/^w_[a-z0-9_]{1,24}$/.test(p.wb)&&Number.isInteger(p.wc)&&p.wc>=0;
  n.wp=par?[{wb:par.wb, wc:Math.max(svlWcOf(par),mine&&par.wb===mine.wb?svlWcOf(mine):0)}].concat(Array.isArray(par.wp)?par.wp:[]).filter(okWp).slice(0,4).map(p=>({wb:p.wb, wc:Math.min(SV_WCMAX,p.wc)})):[];
  n.wb=uid('w_'); n.wc=Math.max(svlWcOf(mine),par?svlWcOf(par):0); n.owner=owner;
  svlOwner=owner; SAVE=n; svlLast=cur; svlSeen=null; svlMine=''; svlFrom='cloud'; svlRaw=null;
  const stored=svlWrite('cloud',false);
  if(SAVE!==n) return false;
  svlMark(); BUS.emit('char',curChar()); return stored; }
function saveReadOnly(){ return !!(SAVE&&SAVE.ro); }
// what the shell can show: owner, sandbox, read only, whether the last write reached localStorage, where the save came from,
// persist = storage holds a save a reload would bring back (false: blocked storage, memory only — nothing to roll back to)
function svlState(){ return {owner:svlOwner, sandbox:svlSandbox, readonly:saveReadOnly(), stored:svlStored, from:svlFrom, persist:svlPersist}; }
function svlCleanSet(o){ o=svObj(o)?o:{};
  return {mute:o.mute===true, autoPot:o.autoPot===0||o.autoPot===false?0:svNum(o.autoPot,0,.9,SVL_SET_DEF.autoPot), cardAuto:o.cardAuto===true, haptics:o.haptics!==false}; }
function loadSettings(){ if(!svlSet){ let o=null; try{ o=JSON.parse(STORE.get(SVL_KEY.settings)||'null'); }catch(e){} svlSet=svlCleanSet(o); } return Object.assign({},svlSet); }
function saveSettings(patch){ svlSet=svlCleanSet(Object.assign(loadSettings(),svObj(patch)?patch:{}));
  if(!svlSandbox) STORE.set(SVL_KEY.settings,JSON.stringify(svlSet)); return loadSettings(); }

// dev hook (§7.9) · window.RG.profile when the address ends with #dev
DEV.profile={
  // on: true = fresh empty save in memory · 'copy' = a copy of the current save · false = back to the stored save
  // a real write still waiting in the debounce is flushed first (never dropped) · sandbox writes nothing, so it has no timer
  sandbox(on){ if(svlTimer&&!svlSandbox) saveNow('sandbox'); clearTimeout(svlTimer); svlTimer=0;
    if(on){ const base=on==='copy'&&SAVE?JSON.parse(JSON.stringify(SAVE)):null; svlSandbox=true;
      SAVE=base?migrateSave(base,null):migrateSave(null,null); SAVE.owner=svlOwner; svlMark(); BUS.emit('char',curChar()); return 'sandbox'; }
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
