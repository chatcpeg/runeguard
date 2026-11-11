/* ================= 44-cloud-sync.js · lane N · PostgREST CAS · sync decisions (pure) ================= */
/* Gate: all requests go through authFetch (43, throws 'off' when !CLOUD_OK); public entries return first when !CLOUD_OK or signed
   out; listeners/timers only from cloudInit (athInit, CLOUD_OK). Pure: syncDecide linkDecide synSafeSummary synReq (test/43-sync).
   CRs of DESIGN §6.6: F1 boot plays the account save · F2 a row that is an older copy of our own lineage (wb, wc ≤ ours) = our write
   landed unseen → fast-forward · F3 409 23505 row exists / 23503 account gone · F4 failures shown, bounded retry · F6 a synced row
   now gone = deleted elsewhere, never re-created alone · F7 restore keeps unpushed progress · F8 empty never-synced ≠ dirty ·
   F12 cloud copies enter through svlFromCloud (41). */
const SYN_BASE='/rest/v1/rg_saves';
const SYN_HEAD='select=slot,schema_v,rev,device,summary,updated_at,wb:data->>wb,wc:data->wc';   // + device: the conflict card names it · wb/wc: F2
const SYN_BACKOFF=[5000,15000,60000,300000], SYN_ERR_TRIES=3;
const SYN_MAX=256*1024, SYN_KEEPALIVE=60*1024, SYN_TICK=300000, SYN_AWAY=300000;
const SYN_NAME=/^[\p{L}\p{M}\p{N} ]{2,16}$/u, SYN_ID=/^[a-z][a-z0-9_]{0,23}$/, SYN_VER=/^[\w.+-]{0,24}$/;
const SYN_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SYN_ERR_TH={big:'⚠ เซฟใหญ่เกิน 256 KB · ซิงก์ไม่ได้', private:'⚠ ไม่ซิงก์: เซฟมีข้อมูลส่วนตัว', server:'⚠ ซิงก์ไม่สำเร็จ · แตะเพื่อลองใหม่'};
const SYN={inited:false, busy:0, net:'', gen:0, q:Promise.resolve(), pushQ:null, retryI:0, retryT:0, errN:0, err:'', dead:false,
           hiddenAt:0, conflict:null, link:null, readOnly:false, pendingLink:false, hubAt:0};

/* ---------- pure ---------- */
function synHasProgress(s){ return !!(s&&Array.isArray(s.chars)&&s.chars.some(c=>c&&(+c.lv||0)>=3)); }   // §6.9: a character Lv ≥ 3
// l = {dirty, baseRev, progress, wb, wc} · h = server head of slot 0 {rev, schema_v, wb, wc} | null
// → adopt push conflict create noop · ff (F2: baseRev = h.rev, push if ours is newer) · gone (F6)
function syncDecide(l,h){
  l=l||{};
  if(h&&(+h.schema_v||0)>SCHEMA_V) return 'noop';          // server written by a newer app: never push or adopt (read-only, §6.3)
  const base=+l.baseRev||0;
  if(!h) return base?'gone':l.progress?'create':'noop';     // a row this device had synced is gone: deleted on another device
  const rev=+h.rev||0;
  if(rev===base) return l.dirty?'push':'noop';
  if(synSameLine(l,h)) return 'ff';                         // an older (or the same) copy of this very save: our write landed
  return l.dirty?'conflict':'adopt';                         // rev > base: someone else pushed · rev < base: row replaced (wipe/restore elsewhere)
}
function synSameLine(l,h){ const wc=Number(h&&h.wc); return typeof l.wb==='string'&&/^w_[a-z0-9_]{1,24}$/.test(l.wb)&&h.wb===l.wb&&Number.isInteger(wc)&&wc>=0&&wc<=(+l.wc||0); }
function linkDecide(g,h){   // first sign-in on a device that has a guest save · g = guest save · h = server head of slot 0 | null
  if(h&&(+h.schema_v||0)>SCHEMA_V) return 'noop';
  if(!synHasProgress(g)) return h?'adopt':'noop';
  return h?'choose':'askMove';
}
function synInt(v,a,b){ v=Math.round(+v); return Number.isFinite(v)?Math.min(b,Math.max(a,v)):a; }
function synId(v){ return typeof v==='string'&&SYN_ID.test(v)?v:null; }
function synSafeSummary(o){   // whitelist {chars:[{n,cls,job,lv}], play, mt, appVer} · names must pass the save's name rule → no email
  o=o&&typeof o==='object'?o:{};
  const chars=(Array.isArray(o.chars)?o.chars:[]).slice(0,3).map(c=>{
    c=c&&typeof c==='object'?c:{};
    return {n:typeof c.n==='string'&&SYN_NAME.test(c.n)?c.n:'?', cls:synId(c.cls), job:synId(c.job), lv:synInt(c.lv,1,60)}; });
  return {chars, play:synInt(o.play,0,1e10), mt:synInt(o.mt,0,1e14), appVer:typeof o.appVer==='string'&&SYN_VER.test(o.appVer)?o.appVer:''};
}
function synSummary(s){   // lane C's saveSummary when it gives a summary, else built from the save · always through the whitelist
  let o=null; try{ o=saveSummary(s); }catch(e){}
  if(!o||!Array.isArray(o.chars)||(!o.chars.length&&s&&Array.isArray(s.chars)&&s.chars.length))
    o={chars:(s&&Array.isArray(s.chars)?s.chars:[]).map(c=>({n:c&&c.name, cls:c&&c.cls, job:c&&c.job, lv:c&&c.lv})), play:s&&s.play, mt:s&&s.mt, appVer:o&&o.appVer};
  return synSafeSummary(o);
}
function synReq(op,a){   // PostgREST request for op → {path, opts} (§6.8) · a.uid is checked by the caller (synUid)
  const u='user_id=eq.'+a.uid, json={'Content-Type':'application/json'};
  switch(op){
    case 'head':   return {path:SYN_BASE+'?'+SYN_HEAD+'&'+u, opts:{method:'GET'}};
    case 'pull':   return {path:SYN_BASE+'?select=slot,schema_v,rev,data,updated_at&'+u+'&slot=eq.'+(a.slot===1?1:0), opts:{method:'GET'}};
    case 'create': return {path:SYN_BASE+'?select=rev,updated_at', opts:{method:'POST', headers:Object.assign({Prefer:'return=representation'},json), body:synBody(0,a.body)}};
    case 'cas':    return {path:SYN_BASE+'?'+u+'&slot=eq.0&rev=eq.'+synInt(a.rev,0,9e15)+'&select=rev,updated_at',
                           opts:{method:'PATCH', headers:Object.assign({Prefer:'return=representation'},json), body:a.body, keepalive:!!a.keepalive}};
    case 'backup': return {path:SYN_BASE+'?on_conflict=user_id,slot', opts:{method:'POST', headers:Object.assign({Prefer:'resolution=merge-duplicates,return=minimal'},json), body:synBody(1,a.body)}};
    case 'wipe':   return {path:SYN_BASE+'?'+u, opts:{method:'DELETE'}};   // slot 0 and 1 · never the auth user (shared with BAZI)
  }
  return null;
}
function synBody(slot,body){ return '{"slot":'+slot+','+body.slice(1); }   // body = JSON text of {schema_v, device, summary, data}

/* ---------- local state: runeguard.cloud.u.<uid> = {baseRev, dirty, lastPushAt, lastPullAt, srvSchema, mt, wiped} ---------- */
function synUid(){ const id=AUTH.s&&AUTH.s.user&&AUTH.s.user.id; return typeof id==='string'&&SYN_UUID.test(id)?id:''; }
function synGet(uid){
  let o=null; if(uid) try{ o=JSON.parse(STORE.get('runeguard.cloud.u.'+uid)||'null'); }catch(e){}
  o=o&&typeof o==='object'?o:{};
  return {baseRev:+o.baseRev||0, dirty:!!o.dirty, lastPushAt:+o.lastPushAt||0, lastPullAt:+o.lastPullAt||0, srvSchema:+o.srvSchema||0, mt:+o.mt||0, wiped:!!o.wiped};
}
function synPut(uid,patch){ const o=Object.assign(synGet(uid),patch); if(uid) STORE.set('runeguard.cloud.u.'+uid,JSON.stringify(o)); return o; }
function synMine(uid){ return !!(uid&&SAVE&&SAVE.owner===uid&&!SAVE.ro); }
function synEmpty(st){ return !st.baseRev&&typeof isTrivialSave==='function'&&isTrivialSave(SAVE); }   // F8: nothing to keep, never synced
function synDirty(uid){ if(!synMine(uid)) return false; const st=synGet(uid); return !synEmpty(st)&&(st.dirty||(+SAVE.mt||0)>st.mt); }
function synLocal(uid){ const m=synMine(uid); return {dirty:synDirty(uid), baseRev:synGet(uid).baseRev, progress:synHasProgress(SAVE), wb:m?SAVE.wb:'', wc:m?+SAVE.wc||0:0}; }
function synCalm(){ return typeof G==='undefined'||!G||!!G.over||!!G.ui||G.modeId==='field'; }   // no push in a survival/boss fight frame
function synDevice(){   // 'd_xxxxxx iPhone' (≤ 40 chars) · id made once in runeguard.device
  let id=STORE.get('runeguard.device');
  if(!/^d_[a-z0-9]{6}$/.test(id||'')){ const a=new Uint8Array(6); crypto.getRandomValues(a); id='d_'+Array.from(a,b=>'abcdefghijklmnopqrstuvwxyz0123456789'[b%36]).join(''); STORE.set('runeguard.device',id); }
  const ua=(typeof navigator!=='undefined'&&navigator.userAgent)||'';
  const p=/iPhone/.test(ua)?'iPhone':/iPad/.test(ua)?'iPad':/Android/.test(ua)?'Android':/Windows/.test(ua)?'Windows':/Mac OS X|Macintosh/.test(ua)?'Mac':/CrOS|Linux/.test(ua)?'Linux':'';
  return (id+(p?' '+p:'')).slice(0,40);
}
function synPayload(s){   // → {ok, body, size, why} · data = the whole save without owner · refuses > 256 KB and any email / token
  if(!s||typeof s!=='object') return {ok:false, why:'nosave'};
  const data=Object.assign({},s); delete data.owner;
  let body; try{ body=JSON.stringify({schema_v:synInt(s.v||SCHEMA_V,1,1000), device:synDevice(), summary:synSummary(s), data}); }catch(e){ return {ok:false, why:'json'}; }
  const size=new TextEncoder().encode(body).length;
  if(size>SYN_MAX) return {ok:false, why:'big', size};
  if(synLeaks(body)) return {ok:false, why:'private', size};
  return {ok:true, body, size};
}
function synLeaks(body){
  const s=AUTH.s; if(!s) return false; const low=body.toLowerCase();
  return [s.user&&s.user.email, s.access_token, s.refresh_token].some(x=>typeof x==='string'&&x.length>=6&&low.includes(x.toLowerCase()));
}
function synSide(sum,at,dev){ return {sum:synSafeSummary(sum), at:synInt(typeof at==='string'?Date.parse(at):at,0,1e14), dev:typeof dev==='string'?dev.slice(0,40):''}; }
function synFail(why){ SYN.err=SYN_ERR_TH[why]?why:'server'; if(why==='big'||why==='private') SYN.errN=SYN_ERR_TRIES; BUS.emit('sync','status'); return 'error'; }
function synOk(r){ if(r==='ok'||r==='none'){ SYN.err=''; SYN.errN=0; } return r; }

/* ---------- transport ---------- */
async function synCall(op,a){   // → {st:'ok'|'offline'|'auth'|'conflict'|'nouser'|'error', status, data}
  let r; const q=synReq(op,a);
  try{ r=await authFetch(q.path,q.opts); }
  catch(e){ const c=e&&e.code; if(c==='timeout'||c==='network') SYN.net='offline'; return {st:c==='noauth'||c==='off'?'auth':'offline', status:0, data:null}; }
  SYN.net='';
  const data=await athJson(r), code=data&&typeof data==='object'&&typeof data.code==='string'?data.code:'';
  if(r.ok) return {st:'ok', status:r.status, data};
  if(r.status===401) return {st:'auth', status:401, data};
  if(r.status===409) return {st:code==='23505'?'conflict':code==='23503'?'nouser':'error', status:409, data};   // F3
  if(r.status>=500||r.status===429) return {st:'server', status:r.status, data};                             // shown, tried again later
  return {st:'error', status:r.status, data};                                                               // 400 / 403 / PGRST…: F4
}
// a failed step → the flow result · F4: a failure other than "no network" shows in cloudStatus until a sync works
function synRes(st){ if(st==='nouser') return synGone(); if(st==='error') return synFail('server');
  if(st==='server'){ SYN.err='server'; BUS.emit('sync','status'); } return 'offline'; }
function synGone(){ SYN.dead=true; clearTimeout(SYN.retryT); BUS.emit('sync','status'); return 'error'; }   // F3: the account was deleted
async function synHeads(uid){ const r=await synCall('head',{uid}); return {st:r.st, rows:r.st==='ok'&&Array.isArray(r.data)?r.data:[]}; }
function synQueue(kind,fn){   // one sync request chain at a time · pushes asked while one is waiting share it
  if(kind==='push'&&SYN.pushQ) return SYN.pushQ;
  const p=SYN.q.then(()=>{ if(kind==='push') SYN.pushQ=null; SYN.busy++; BUS.emit('sync','status');
      return Promise.resolve().then(fn).finally(()=>{ SYN.busy--; }); })
    .catch(e=>{ console.error('sync',e&&e.message); return 'error'; })
    .then(r=>{ BUS.emit('sync','status'); return synOk(r); });
  SYN.q=p.then(()=>{},()=>{});
  if(kind==='push') SYN.pushQ=p;
  return p;
}
function synRetry(res){   // offline: 5 s → 15 s → 60 s → 5 min (until it works) · error: 3 tries, then only on the next event (F4)
  clearTimeout(SYN.retryT); SYN.retryT=0;
  if(res!=='offline'&&res!=='error'||SYN.dead||!CLOUD_OK){ SYN.retryI=0; return; }
  if(res==='error'&&++SYN.errN>SYN_ERR_TRIES) return;
  const ms=SYN_BACKOFF[Math.min(SYN.retryI++,SYN_BACKOFF.length-1)];
  SYN.retryT=setTimeout(()=>{ SYN.retryT=0; if(synDirty(synUid())) cloudPush('retry'); },ms);
}

/* ---------- flows ---------- */
async function synAdopt(uid){   // server slot 0 → this account's save (never mixed with the local one) · F12: through svlFromCloud
  const p=await synCall('pull',{uid, slot:0}); if(p.st!=='ok') return synRes(p.st);
  const row=Array.isArray(p.data)&&p.data[0];
  if(!row||!row.data||typeof row.data!=='object'||Array.isArray(row.data)) return 'none';
  if((+row.schema_v||0)>SCHEMA_V){ synPut(uid,{srvSchema:+row.schema_v}); SYN.readOnly=true; BUS.emit('sync','newer'); return 'ok'; }
  if(!svlFromCloud(uid,row.data)) return synFail('server');   // not stored on this device: baseRev stays, the next pull adopts again
  synPut(uid,{baseRev:+row.rev||0, dirty:false, mt:+SAVE.mt||0, lastPullAt:Date.now(), srvSchema:+row.schema_v||0, wiped:false});
  BUS.emit('sync','adopt'); return 'ok';
}
async function synCreate(uid,depth){
  if(!synMine(uid)) return 'error';
  const pl=synPayload(SAVE); if(!pl.ok) return synFail(pl.why);
  const gen=SYN.gen, r=await synCall('create',{uid, body:pl.body});
  if(r.st==='ok'&&Array.isArray(r.data)&&r.data[0]){ synPut(uid,{baseRev:+r.data[0].rev||1, dirty:SYN.gen!==gen, mt:+SAVE.mt||0, lastPushAt:Date.now(), wiped:false}); return 'ok'; }
  if(r.st==='conflict') return synConflict(uid,depth);   // 409 23505: slot 0 exists
  return synRes(r.st);
}
// CAS [] / 409: fast-forward our own copy (F2), else ask · depth 1 = no second try
async function synConflict(uid,depth){
  const h=await synHeads(uid); if(h.st!=='ok') return synRes(h.st);
  const row=h.rows.find(x=>+x.slot===0), st=synGet(uid);
  if(!row){ if(st.baseRev){ synPut(uid,{baseRev:0, wiped:true}); BUS.emit('sync','status'); return 'none'; } return depth?synFail('server'):synCreate(uid,1); }   // F6
  if(!depth&&synSameLine(synLocal(uid),row)){ synPut(uid,{baseRev:+row.rev||0, dirty:true}); return synPush(uid,1); }
  SYN.conflict={kind:'conflict', local:synSide(synSummary(SAVE),SAVE&&SAVE.mt,synDevice()), srv:synSide(row.summary,row.updated_at,row.device)};
  BUS.emit('sync','conflict'); return 'conflict';
}
async function synPull(uid){
  if(SYN.pendingLink) return synLink(uid);
  const h=await synHeads(uid); if(h.st!=='ok') return synRes(h.st);
  const row=h.rows.find(x=>+x.slot===0)||null, st=synPut(uid,{srvSchema:row?+row.schema_v||0:0, lastPullAt:Date.now()});
  if(row&&(+row.schema_v||0)>SCHEMA_V){ SYN.readOnly=true; BUS.emit('sync','newer'); return 'ok'; }
  if(!synMine(uid)) return 'none';
  const l=synLocal(uid); let d=syncDecide(l,row);
  if(d==='create'&&st.wiped) d='noop';   // after "delete cloud data" only a manual sync uploads again
  if(d==='gone'){ synPut(uid,{baseRev:0, wiped:true}); BUS.emit('sync','status'); return 'none'; }   // F6: deleted on another device
  if(d==='ff'){ synPut(uid,{baseRev:+row.rev||0}); return l.dirty||Number(row.wc)<l.wc?((await synPush(uid,1))==='ok'?'ok':'offline'):'ok'; }
  if(d==='adopt') return synAdopt(uid);
  if(d==='push') return (await synPush(uid))==='ok'?'ok':'offline';
  if(d==='conflict') return synConflict(uid,1);
  if(d==='create'){ const r=await synCreate(uid); return r==='error'?'offline':r; }
  return row?'ok':'none';
}
async function synPush(uid,depth){
  if(cloudNewerSchema()||saveReadOnly()) return 'readonly';
  if(!synMine(uid)) return 'error';
  const st=synGet(uid);
  if(!st.baseRev){ if(depth) return 'error'; const r=await synPull(uid); return r==='none'?'ok':r==='conflict'?'conflict':r==='ok'?'ok':'offline'; }   // never synced: pull decides
  const pl=synPayload(SAVE); if(!pl.ok){ console.warn('sync: ไม่ส่งเซฟ ('+pl.why+')'); return synFail(pl.why); }
  const gen=SYN.gen, mt=+SAVE.mt||0, r=await synCall('cas',{uid, rev:st.baseRev, body:pl.body});
  if(r.st==='ok'){
    if(Array.isArray(r.data)&&r.data[0]&&+r.data[0].rev){ synPut(uid,{baseRev:+r.data[0].rev, dirty:SYN.gen!==gen, mt, lastPushAt:Date.now(), wiped:false}); return 'ok'; }
    return synConflict(uid,depth);   // [] = the CAS lost (F2 checks)
  }
  return r.st==='auth'?'offline':synRes(r.st);
}
async function synLink(uid){   // §6.9 first sign-in on this device (no account cache yet)
  const guest=SAVE&&SAVE.owner==null?SAVE:null;
  const h=await synHeads(uid); if(h.st!=='ok'){ SYN.pendingLink=true; return synRes(h.st); }
  SYN.pendingLink=false;
  const row=h.rows.find(x=>+x.slot===0)||null, d=linkDecide(guest,row);
  synPut(uid,{srvSchema:row?+row.schema_v||0:0, lastPullAt:Date.now()});
  if(d==='adopt') return synAdopt(uid);
  if(d==='noop'){ if(row&&(+row.schema_v||0)>SCHEMA_V){ SYN.readOnly=true; BUS.emit('sync','newer'); } else loadSaveFor(uid); return row?'ok':'none'; }
  SYN.link={kind:d, guest, local:synSide(synSummary(guest),guest&&guest.mt,synDevice()), srv:row?synSide(row.summary,row.updated_at,row.device):null};
  BUS.emit('sync',d); return d==='choose'?'conflict':'none';
}
async function synBackup(uid,saveObj){   // whole save → slot 1 (upsert)
  const pl=synPayload(saveObj); if(!pl.ok) return synFail(pl.why);
  const r=await synCall('backup',{uid, body:pl.body}); return r.st==='ok'?'ok':synRes(r.st);
}
async function synKeepLocal(uid){   // "this device" wins: server copy → slot 1, then CAS slot 0 on the server's current rev
  const p=await synCall('pull',{uid, slot:0}); if(p.st!=='ok') return synRes(p.st);
  const row=Array.isArray(p.data)&&p.data[0];
  if(!row){ synPut(uid,{baseRev:0, wiped:false}); return synCreate(uid); }
  if((+row.schema_v||0)>SCHEMA_V){ SYN.readOnly=true; return 'readonly'; }
  const b=await synBackup(uid,row.data); if(b!=='ok') return b;
  synPut(uid,{baseRev:+row.rev||0, dirty:true});
  return synPush(uid,1);
}

/* ---------- public (§7.8) ---------- */
function cloudInit(){   // called by athInit() only (CLOUD_OK): listeners + 5 min timer + UI hooks
  if(!CLOUD_OK||SYN.inited) return; SYN.inited=true;
  BUS.on('save',()=>{ SYN.gen++; const uid=synUid(); if(!synMine(uid)) return; const st=synGet(uid);   // every write = a change (mt may not move: same ms / clock set back)
    if(!st.dirty&&!synEmpty(st)) synPut(uid,{dirty:true}); });
  BUS.on('auth',ev=>{ if(ev==='out'){ SYN.conflict=null; SYN.link=null; SYN.readOnly=false; SYN.pendingLink=false; SYN.dead=false; SYN.err=''; SYN.errN=0; clearTimeout(SYN.retryT); } });
  // §6.8 push at the end of a run (after its reward) and back at the fort
  BUS.on('runEnd',()=>setTimeout(()=>{ if(synDirty(synUid())) cloudPush('runEnd'); },1500));
  BUS.on('screen',id=>{ if(id==='scrHub'&&Date.now()-SYN.hubAt>20000&&synDirty(synUid())){ SYN.hubAt=Date.now(); cloudPush('hub'); } });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){ SYN.hiddenAt=Date.now(); synKeepalive(); }
    else if(SYN.hiddenAt&&Date.now()-SYN.hiddenAt>SYN_AWAY){ SYN.hiddenAt=0; cloudPull(); } else SYN.hiddenAt=0; });
  addEventListener('online',()=>{ SYN.net=''; if(synDirty(synUid())) cloudPush('online'); BUS.emit('sync','status'); });
  addEventListener('offline',()=>{ SYN.net='offline'; BUS.emit('sync','status'); });
  setInterval(()=>{ if(AUTH.state==='in'&&!SYN.dead&&synDirty(synUid())&&synCalm()) cloudPush('timer'); },SYN_TICK);
  if(typeof uiaInit==='function') uiaInit();
}
function synKeepalive(){   // page hidden: one keepalive CAS when the body is < 60 KB, else it waits for the next push
  const uid=synUid(); if(!CLOUD_OK||!uid||AUTH.state!=='in'||SYN.dead||!synDirty(uid)||cloudNewerSchema()||saveReadOnly()) return false;
  const st=synGet(uid); if(!st.baseRev) return false;
  const pl=synPayload(SAVE); if(!pl.ok||pl.size>=SYN_KEEPALIVE) return false;
  const gen=SYN.gen, mt=+SAVE.mt||0;
  synCall('cas',{uid, rev:st.baseRev, body:pl.body, keepalive:true}).then(r=>{   // a lost answer here is F2: the next push fast-forwards
    if(r.st==='ok'&&Array.isArray(r.data)&&r.data[0]&&+r.data[0].rev) synPut(uid,{baseRev:+r.data[0].rev, dirty:SYN.gen!==gen, mt, lastPushAt:Date.now()}); });
  return true;
}
function cloudStatus(){   // §6.11
  if(!AUTH_ON) return {k:'off', text:'เล่นในเครื่องเท่านั้น'};
  if(!CLOUD_OK) return {k:'artifact', text:'บัญชีออนไลน์ใช้ได้ที่ runeguard-lac.vercel.app'};
  if(cloudNewerSchema()) return {k:'newer', text:'⛔ ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป · แตะเพื่ออัปเดต'};
  if(AUTH.state==='expired') return {k:'expired', text:'⚠ เซสชันหมดอายุ · แตะเพื่อเข้าสู่ระบบ'};
  if(AUTH.state!=='in'||!synUid()) return {k:'guest', text:'👤 ผู้เยี่ยมชม · แตะเพื่อสร้างบัญชี'};
  if(SYN.dead) return {k:'dead', text:'⚠ บัญชีนี้ซิงก์ไม่ได้แล้ว · ออกจากระบบแล้วเข้าใหม่'};
  if(SYN.conflict||(SYN.link&&SYN.link.kind==='choose')) return {k:'conflict', text:'⚠ พบความคืบหน้าสองชุด · แตะเพื่อเลือก'};
  if(SYN.busy) return {k:'busy', text:'⟳ กำลังซิงก์…'};
  if(SYN.net==='offline'||(typeof navigator!=='undefined'&&navigator.onLine===false)) return {k:'offline', text:'⚠ ออฟไลน์ · บันทึกในเครื่อง'};
  if(SYN.err) return {k:'err', text:SYN_ERR_TH[SYN.err]||SYN_ERR_TH.server};
  const st=synGet(synUid()), t=Math.max(st.lastPushAt,st.lastPullAt);
  if(st.wiped&&!st.baseRev) return {k:'wiped', text:'☁ ไม่มีข้อมูลบนคลาวด์ · แตะเพื่ออัปโหลด'};
  if(!t) return {k:'busy', text:'⟳ กำลังซิงก์…'};
  return {k:'ok', text:'☁ ซิงก์แล้ว '+new Date(t).toLocaleTimeString('th-TH',{hour:'2-digit', minute:'2-digit', hour12:false})};
}
function cloudNewerSchema(){ if(!CLOUD_OK) return false; const uid=synUid(); return SYN.readOnly||(!!uid&&synGet(uid).srvSchema>SCHEMA_V); }
function cloudPull(){
  if(!CLOUD_OK) return Promise.resolve('none');
  const uid=synUid(); if(!uid||AUTH.state!=='in'||SYN.dead) return Promise.resolve('none');
  return synQueue('pull',()=>synPull(uid));
}
function cloudPush(reason){
  if(!CLOUD_OK) return Promise.resolve('offline');
  const uid=synUid(); if(!uid||AUTH.state!=='in'||SYN.dead) return Promise.resolve('offline');
  if(!synCalm()){ synRetry('offline'); return Promise.resolve('offline'); }   // mid-fight: keep it dirty, retry later
  return synQueue('push',()=>synPush(uid)).then(r=>{ synRetry(r); return r; });
}
function cloudSyncNow(){   // account page: also lifts the "deleted" hold and a stopped retry
  if(!CLOUD_OK) return Promise.resolve('offline');
  const uid=synUid(); if(!uid||AUTH.state!=='in') return Promise.resolve('offline');
  if(SYN.dead) return Promise.resolve('error');
  SYN.err=''; SYN.errN=0;
  if(synGet(uid).wiped) synPut(uid,{wiped:false, dirty:true});
  return cloudPull().then(r=>r==='ok'&&synDirty(uid)?cloudPush('manual'):r);
}
function cloudOnLogin(){   // sign-in / boot with a session: own cache → pull · first time here → link (§6.9)
  if(!CLOUD_OK) return Promise.resolve('none');
  const uid=synUid(); if(!uid) return Promise.resolve('none');
  SYN.conflict=null; SYN.link=null; SYN.readOnly=false; SYN.dead=false; SYN.err=''; SYN.errN=0;
  if(STORE.get('runeguard.save.u.'+uid)!==null){ if(!synMine(uid)) loadSaveFor(uid); return AUTH.state==='in'?cloudPull():Promise.resolve('none'); }
  SYN.pendingLink=true;
  return AUTH.state==='in'?synQueue('pull',()=>synLink(uid)):Promise.resolve('none');
}
function cloudResolve(choice){   // 'local' | 'cloud' · the side not chosen goes to slot 1 · never mixes the two saves
  if(!CLOUD_OK) return Promise.resolve('offline');
  const uid=synUid(), c=SYN.conflict||SYN.link; if(!uid||!c||(choice!=='local'&&choice!=='cloud')) return Promise.resolve('none');
  return synQueue('pull',async()=>{
    let r;
    if(c.kind==='askMove'){   // 'local' = [ย้าย] guest progress up · 'cloud' = [เริ่มใหม่] with an empty account save
      if(choice==='local'){ if(!svlFromCloud(uid,c.guest)) return synFail('server'); synPut(uid,{baseRev:0, wiped:false}); r=await synCreate(uid); }
      else { loadSaveFor(uid); r='ok'; }
    } else if(c.kind==='choose'){   // [ใช้ของในเครื่อง] / [ใช้ของบัญชี] · the guest save itself is never deleted
      if(choice==='local'){ if(!svlFromCloud(uid,c.guest)) return synFail('server'); r=await synKeepLocal(uid); }
      else { r=await synBackup(uid,c.guest); if(r==='ok') r=await synAdopt(uid); }
    } else {
      if(choice==='local') r=await synKeepLocal(uid);
      else { r=await synBackup(uid,SAVE); if(r==='ok') r=await synAdopt(uid); }
    }
    if(r==='ok'||r==='none'){ if(SYN.conflict===c) SYN.conflict=null; if(SYN.link===c) SYN.link=null; }
    return r;
  });
}
function cloudRestoreBackup(){   // swap slot 0 ⇄ slot 1 (two writes), then play the restored save
  if(!CLOUD_OK) return Promise.resolve('offline');
  const uid=synUid(); if(!uid||AUTH.state!=='in') return Promise.resolve('offline');
  return synQueue('pull',async()=>{
    const b=await synCall('pull',{uid, slot:1}); if(b.st!=='ok') return synRes(b.st);
    const bak=Array.isArray(b.data)&&b.data[0]; if(!bak||!bak.data) return 'none';
    if((+bak.schema_v||0)>SCHEMA_V) return 'readonly';
    const a=await synCall('pull',{uid, slot:0}); if(a.st!=='ok') return synRes(a.st);
    const cur=Array.isArray(a.data)&&a.data[0];
    const keep=synDirty(uid)?JSON.parse(JSON.stringify(SAVE)):cur&&cur.data;   // F7: progress not pushed yet is the newest: it goes to slot 1
    const pl=synPayload(bak.data); if(!pl.ok) return synFail(pl.why);
    let rev=0, res='ok';
    if(cur){
      const w=await synCall('cas',{uid, rev:+cur.rev, body:pl.body});
      if(w.st!=='ok'||!Array.isArray(w.data)||!w.data[0]) return w.st==='ok'?'conflict':synRes(w.st);
      rev=+w.data[0].rev;
    } else {
      const w=await synCall('create',{uid, body:pl.body}); if(w.st!=='ok'||!Array.isArray(w.data)||!w.data[0]) return synRes(w.st);
      rev=+w.data[0].rev;
    }
    if(keep&&await synBackup(uid,keep)!=='ok'&&await synBackup(uid,keep)!=='ok') res='error';   // slot 0 is restored either way; the local copy goes to .bak below
    if(!svlFromCloud(uid,bak.data)) return synFail('server');
    synPut(uid,{baseRev:rev, dirty:false, mt:+SAVE.mt||0, lastPushAt:Date.now(), wiped:false});
    BUS.emit('sync','adopt'); return res;
  });
}
function cloudWipe(){   // DELETE both slots of this user · the account itself stays (shared with BAZI)
  if(!CLOUD_OK) return Promise.resolve('offline');
  const uid=synUid(); if(!uid||AUTH.state!=='in') return Promise.resolve('offline');
  return synQueue('pull',async()=>{
    const r=await synCall('wipe',{uid}); if(r.st!=='ok') return synRes(r.st);
    synPut(uid,{baseRev:0, dirty:false, wiped:true, srvSchema:0}); SYN.conflict=null; SYN.readOnly=false; return 'ok';
  });
}
function cloudBackupInfo(){   // account page: summary of slot 1 → {sum, at, dev} | null
  if(!CLOUD_OK) return Promise.resolve(null);
  const uid=synUid(); if(!uid||AUTH.state!=='in') return Promise.resolve(null);
  return synHeads(uid).then(h=>{ const b=h.rows.find(x=>+x.slot===1); return b?synSide(b.summary,b.updated_at,b.device):null; });
}
function cloudConflictInfo(){   // for the sheets in 51 · {kind, local, srv} | null (no save data, no email)
  if(!CLOUD_OK) return null;
  const c=SYN.conflict||SYN.link; return c?{kind:c.kind, local:c.local, srv:c.srv}:null;
}

DEV.sync={
  peek(){ const uid=synUid(); return {status:cloudStatus(), state:uid?synGet(uid):null, busy:SYN.busy, conflict:cloudConflictInfo(), readOnly:cloudNewerSchema(), err:SYN.err, dead:SYN.dead}; },
  push(){ return cloudPush('dev'); },
  pull(){ return cloudPull(); },
  decide(l,s){ return syncDecide(l,s); }
};
