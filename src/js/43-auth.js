/* ================= 43-auth.js · lane N · GoTrue raw fetch + PKCE (§6.7) · the only file with the Supabase URL/key ================= */
/* Gate: CLOUD_OK (AUTH_ON + a CLOUD_HOSTS host · false in the claude.ai artifact). athRaw() = the only fetch( (28 / 59a use
   authFetch / authApi) and rejects when !CLOUD_OK. athInit() (session, listeners, refresh timer, cloudInit) returns first when
   !CLOUD_OK. Signed out nothing is sent except the sign-in / sign-up forms. At load: declarations + DEV.auth only. */
const SUPA={ url:'https://edmwctmnasggdtdbcxkb.supabase.co', key:'sb_publishable_uSbGPoK1lGd6PMUUGpu4uw_N_HfOIbF' };
const AUTH_ON=true;                                    // M3 เปิดแล้ว (rg_001 อยู่ในฐานข้อมูล · ทดสอบ RLS ผ่าน 2026-11-10)
const CLOUD_HOSTS=['runeguard-lac.vercel.app','localhost','127.0.0.1'];
const CLOUD_OK=AUTH_ON&&CLOUD_HOSTS.includes(location.hostname)
  &&(location.protocol==='https:'||location.hostname!=='runeguard-lac.vercel.app')
  &&!!(self.crypto&&crypto.subtle)&&typeof fetch==='function';
const RURL=location.origin+'/';                        // ห้ามอ่าน redirect จาก query (กัน open redirect)
const AUTH={state:'off', s:null};                      // state: 'off'|'guest'|'busy'|'in'|'expired' · s = session

const ATH_TIMEOUT=4000, ATH_REDIRECT_MS=3000, ATH_SKEW=60000, ATH_LOCK_MS=5000, ATH_RESEND_MS=60000, ATH_PW_MIN=8;
// PKCE: a slot per flow (F10) · e-mail links 24 h (GoTrue ends the flow in ~5 min; the kind still picks the message)
const ATH_PKCE_TTL={google:600000, signup:864e5, recovery:864e5}, ATH_KINDS=['google','signup','recovery'];
const ATH_K={s:'runeguard.auth', pkce:'runeguard.auth.pkce', guest:'runeguard.guestOK'};   // keys of §6.2
const ATH_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ATH_B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
// one text for sign-up, recover and resend, whatever GoTrue answers (no guessing which email has an account)
const ATH_NEUTRAL='ถ้าอีเมลนี้ใช้ได้ เราส่งลิงก์ไปแล้ว ตรวจกล่องจดหมาย (รวมถึงสแปม) · ถ้ามีบัญชีอยู่แล้ว ลองเข้าสู่ระบบ';
const ATH_LINK_BAD='ลิงก์หมดอายุหรือใช้ไปแล้ว ขอลิงก์ใหม่', ATH_OFFLINE='เชื่อมต่อไม่ได้ · เล่นต่อแบบออฟไลน์ได้',
      ATH_EXPIRED='เซสชันหมดอายุ · เข้าสู่ระบบใหม่', ATH_BAD_EMAIL='รูปแบบอีเมลไม่ถูกต้อง', ATH_SHORT_PW='รหัสผ่านสั้นเกินไป (อย่างน้อย 8 ตัว)';
const ATH_MSG={   // GoTrue error_code (and our own client codes) → Thai · shown with textContent only
  invalid_credentials:'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
  email_not_confirmed:'ยังไม่ได้ยืนยันอีเมล',
  over_email_send_rate_limit:'ส่งอีเมลถี่เกินไป รอสักครู่ หรือเข้าด้วย Google',
  over_request_rate_limit:'ลองใหม่อีกครั้งในอีกสักครู่',
  weak_password:ATH_SHORT_PW,
  email_address_invalid:ATH_BAD_EMAIL, validation_failed:ATH_BAD_EMAIL,
  flow_state_expired:ATH_LINK_BAD, flow_state_not_found:ATH_LINK_BAD, bad_code_verifier:ATH_LINK_BAD, otp_expired:ATH_LINK_BAD,
  timeout:ATH_OFFLINE, network:ATH_OFFLINE,
  server:'ระบบบัญชีขัดข้องชั่วคราว',
  same_password:'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม',
  session_expired:ATH_EXPIRED, session_not_found:ATH_EXPIRED, refresh_token_not_found:ATH_EXPIRED,
  refresh_token_already_used:ATH_EXPIRED, bad_jwt:ATH_EXPIRED, noauth:ATH_EXPIRED,
  access_denied:'ยกเลิกการเข้าสู่ระบบแล้ว',
  email_bad:ATH_BAD_EMAIL, pw_short:ATH_SHORT_PW, pw_mismatch:'รหัสผ่านสองช่องไม่ตรงกัน',
  resend_wait:'รอสักครู่ก่อนขอลิงก์อีกครั้ง (ทุก 60 วิ)',
  off:'ระบบบัญชียังไม่เปิดใช้',
  unknown:'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง'
};
const ATH_NOVER={   // ?code= arrived but this browser has no (fresh) verifier: other device, other browser, iOS PWA → Safari
  signup:'ยืนยันอีเมลสำเร็จ · เข้าสู่ระบบด้วยรหัสผ่านได้เลย',
  google:'เข้าสู่ระบบในหน้าต่างนี้ไม่สำเร็จ ลองอีกครั้ง หรือใช้อีเมล',
  recovery:'ลิงก์ตั้งรหัสผ่านใหม่หมดอายุ หรือเปิดคนละเบราว์เซอร์กับที่ขอ · ขอลิงก์ใหม่ได้ที่ "ลืมรหัสผ่าน?"',
  any:'ถ้าเพิ่งยืนยันอีเมล เข้าสู่ระบบด้วยรหัสผ่านได้เลย · ถ้าเข้าด้วย Google ไม่สำเร็จ ลองอีกครั้ง หรือใช้อีเมล · ลิงก์ตั้งรหัสผ่านใหม่ขอใหม่ได้ที่ "ลืมรหัสผ่าน?"'
};
const ATH={inited:false, refreshP:null, timer:0, resendAt:0, outLater:false};

/* ---------- PKCE (RFC 7636 S256) ---------- */
function athB64url(bytes){   // bytes → base64url without padding (no btoa: works the same in node tests)
  let s='', i=0; const b=bytes, n=b.length;
  for(;i+2<n;i+=3){ const v=b[i]<<16|b[i+1]<<8|b[i+2]; s+=ATH_B64[v>>18&63]+ATH_B64[v>>12&63]+ATH_B64[v>>6&63]+ATH_B64[v&63]; }
  if(n-i===1){ const v=b[i]<<16; s+=ATH_B64[v>>18&63]+ATH_B64[v>>12&63]; }
  else if(n-i===2){ const v=b[i]<<16|b[i+1]<<8; s+=ATH_B64[v>>18&63]+ATH_B64[v>>12&63]+ATH_B64[v>>6&63]; }
  return s;
}
function athVerifier(){ const a=new Uint8Array(32); crypto.getRandomValues(a); return athB64url(a); }   // 43 chars
function athChallenge(v){ return crypto.subtle.digest('SHA-256',new TextEncoder().encode(v)).then(d=>athB64url(new Uint8Array(d))); }
// runeguard.auth.pkce = {google:{v,ts}, signup:{v,ts}, recovery:{v,ts}} · one pending flow per kind (F10)
function athPkceAll(){ let o=null; try{ o=JSON.parse(STORE.get(ATH_K.pkce)||'null'); }catch(e){}
  const out={}; if(!o||typeof o!=='object'||Array.isArray(o)) return out;
  for(const k of ATH_KINDS){ const s=o[k]; if(s&&typeof s==='object'&&typeof s.v==='string'&&/^[A-Za-z0-9_-]{43,128}$/.test(s.v)) out[k]={v:s.v, ts:+s.ts||0}; }
  return out; }
function athPkcePut(all){ if(Object.keys(all).length) STORE.set(ATH_K.pkce,JSON.stringify(all)); else STORE.del(ATH_K.pkce); }
function athPkceNew(kind){   // store {v, ts} in this kind's slot (the other kinds stay) and give the S256 challenge
  const v=athVerifier(), all=athPkceAll(); all[kind]={v, ts:Date.now()}; athPkcePut(all); return athChallenge(v);
}
// for a ?code= → {kinds (newest first), live:[{kind, v} within TTL]} · expired slots go · a used one goes in athPkceDrop
function athPkceTake(now){
  const t=now||Date.now(), all=athPkceAll(), kinds=Object.keys(all).sort((a,b)=>all[b].ts-all[a].ts), live=[];
  for(const k of kinds){ const s=all[k]; if(t-s.ts<=ATH_PKCE_TTL[k]&&s.ts<=t+ATH_SKEW) live.push({kind:k, v:s.v}); else delete all[k]; }
  athPkcePut(all); return {kinds, live};
}
function athPkceDrop(kind){ const all=athPkceAll(); delete all[kind]; athPkcePut(all); }

/* ---------- request builders (pure) · authFetch adds apikey, Bearer and the 4 s timeout ---------- */
function athQ(p){ return Object.keys(p).map(k=>k+'='+encodeURIComponent(p[k])).join('&'); }
function athReq(op,a){   // → {path, opts} · emails and passwords only ever go in the JSON body, never in the URL
  a=a||{}; const rt=athQ({redirect_to:RURL}), J=json=>({method:'POST', auth:false, json});
  switch(op){
    case 'signup':   return {path:'/auth/v1/signup?'+rt, opts:J({email:a.email, password:a.pw, code_challenge:a.ch, code_challenge_method:'s256'})};
    case 'resend':   return {path:'/auth/v1/resend?'+rt, opts:J({type:'signup', email:a.email})};
    case 'password': return {path:'/auth/v1/token?grant_type=password', opts:J({email:a.email, password:a.pw})};
    case 'pkce':     return {path:'/auth/v1/token?grant_type=pkce', opts:J({auth_code:a.code, code_verifier:a.v})};
    case 'refresh':  return {path:'/auth/v1/token?grant_type=refresh_token', opts:J({refresh_token:a.rt})};
    case 'recover':  return {path:'/auth/v1/recover?'+rt, opts:J({email:a.email, code_challenge:a.ch, code_challenge_method:'s256'})};
    case 'setpw':    return {path:'/auth/v1/user', opts:{method:'PUT', json:{password:a.pw}}};
    case 'user':     return {path:'/auth/v1/user', opts:{method:'GET', token:a.token}};   // token: check an implicit-flow token first
    case 'logout':   return {path:'/auth/v1/logout?scope=local', opts:{method:'POST'}};   // never the default global scope (all BAZI apps)
  }
  return null;
}
function athGoogleUrl(ch){ return SUPA.url+'/auth/v1/authorize?'+athQ({provider:'google', redirect_to:RURL, code_challenge:ch, code_challenge_method:'s256'}); }

/* ---------- transport ---------- */
function athErr(code){ const e=new Error(code); e.code=code; return e; }
function athRaw(url,init){   // the only fetch( of lane N · one AbortController covers headers + body · 4 s
  if(!CLOUD_OK) return Promise.reject(athErr('off'));
  const ac=new AbortController(), t=setTimeout(()=>ac.abort(),ATH_TIMEOUT);
  return fetch(url,Object.assign({},init,{signal:ac.signal, cache:'no-store', credentials:'omit', referrerPolicy:'no-referrer'}))
    .then(r=>r.text().then(tx=>new Response([101,204,205,304].includes(r.status)?null:tx,{status:r.status, headers:r.headers})))
    .catch(()=>{ throw athErr(ac.signal.aborted?'timeout':'network'); })
    .finally(()=>clearTimeout(t));
}
async function authFetch(path,opts){   // path = '/auth/v1/…' | '/rest/v1/rg_…' · opts {method, headers, json|body, auth:false, token, keepalive}
  if(!CLOUD_OK) throw athErr('off');
  if(typeof path!=='string'||!/^\/(auth\/v1\/|rest\/v1\/rg_)/.test(path)) throw athErr('path');
  const o=opts||{}, jwt=o.auth!==false;
  for(let tries=0;;tries++){
    const h=Object.assign({},o.headers||{}); delete h.Authorization; delete h.authorization; h.apikey=SUPA.key;   // publishable key never in Authorization
    if(jwt){ const tk=o.token||await authToken(); if(!tk) throw athErr(AUTH.state==='in'?'network':'noauth'); h.Authorization='Bearer '+tk; }
    const body=o.json!==undefined?JSON.stringify(o.json):o.body, m=o.method||'GET';
    if(body!==undefined) h['Content-Type']='application/json';
    if(path.startsWith('/rest/')) h[m==='GET'||m==='HEAD'?'Accept-Profile':'Content-Profile']='public';   // F11: never another schema of the shared project
    const r=await athRaw(SUPA.url+path,{method:m, headers:h, body, keepalive:!!o.keepalive});
    if(r.status===401&&jwt&&!o.token&&tries===0&&await athRefresh(true)==='ok') continue;   // 401 → refresh → retry once
    return r;
  }
}
// this site's own Vercel functions (/api/checkout) with the user's access token · never another origin (location.origin only)
async function authApi(path,opts){
  if(!CLOUD_OK) throw athErr('off');
  if(typeof path!=='string'||!/^\/api\/[a-z][a-z-]{0,30}$/.test(path)) throw athErr('path');
  const o=opts||{}, h={};
  if(o.auth!==false){ const tk=await authToken(); if(!tk) throw athErr(AUTH.state==='in'?'network':'noauth'); h.Authorization='Bearer '+tk; }
  const body=o.json!==undefined?JSON.stringify(o.json):undefined; if(body!==undefined) h['Content-Type']='application/json';
  return athRaw(location.origin+path,{method:o.method||'GET', headers:h, body});
}
function athJson(r){ return r.text().then(t=>{ try{ return t?JSON.parse(t):null; }catch(e){ return null; } },()=>null); }
async function athCall(op,a){   // → {ok, status, data, code}
  const q=athReq(op,a);
  try{ const r=await authFetch(q.path,q.opts), data=await athJson(r); return {ok:r.ok, status:r.status, data, code:r.ok?'':athCode(r.status,data)}; }
  catch(e){ return {ok:false, status:0, data:null, code:(e&&e.code)||'network'}; }
}
function athCode(status,d){   // GoTrue body → error code (new API: error_code · old API: error + description)
  d=d&&typeof d==='object'?d:{};
  let c=typeof d.error_code==='string'?d.error_code:typeof d.code==='string'?d.code:typeof d.error==='string'?d.error:'';
  if(c==='invalid_grant'){ const t=String(d.error_description||d.msg||'').toLowerCase();
    c=t.includes('not confirmed')?'email_not_confirmed':t.includes('invalid login')?'invalid_credentials'
      :(t.includes('verifier')||t.includes('flow state'))?'flow_state_not_found':t.includes('refresh token')?'refresh_token_not_found':''; }
  if(!c) c=status===429?'over_request_rate_limit':status>=500?'server':status===401?'bad_jwt':status===0?'network':'unknown';
  return c;
}
function athErrTh(code,status){   // never shows server text (error_description in a URL is attacker-controlled)
  if(code&&code!=='unknown'&&Object.prototype.hasOwnProperty.call(ATH_MSG,code)) return ATH_MSG[code];
  if(status>=500) return ATH_MSG.server;
  if(status===429) return ATH_MSG.over_request_rate_limit;
  return ATH_MSG.unknown;
}
function athEmailOk(e){ return typeof e==='string'&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e); }
function athCheck(email,pw){ return !athEmailOk(email)?'email_bad':(pw!==undefined&&String(pw).length<ATH_PW_MIN)?'pw_short':''; }

/* ---------- session ---------- */
function athSessionFrom(d,prevUser){   // GoTrue token answer → {access_token, refresh_token, expires_at(ms), user:{id,email}} | null
  if(!d||typeof d!=='object'||typeof d.access_token!=='string'||!d.access_token||typeof d.refresh_token!=='string') return null;
  const u=d.user&&typeof d.user==='object'?d.user:prevUser;
  if(!u||!ATH_UUID.test(String(u.id||''))) return null;
  const exp=+d.expires_in>0?Date.now()+d.expires_in*1000:+d.expires_at>0?d.expires_at*1000:Date.now()+3600000;
  return {access_token:d.access_token, refresh_token:d.refresh_token, expires_at:Math.round(exp),
          user:{id:String(u.id).toLowerCase(), email:typeof u.email==='string'?u.email:''}};
}
function athStoreRead(){
  let o=null; try{ o=JSON.parse(STORE.get(ATH_K.s)||'null'); }catch(e){}
  return o&&typeof o==='object'&&typeof o.access_token==='string'&&typeof o.refresh_token==='string'&&o.user&&ATH_UUID.test(String(o.user.id||''))?o:null;
}
function athAccept(s,ev){ AUTH.s=s; STORE.set(ATH_K.s,JSON.stringify(s)); AUTH.state='in'; athSchedule(); BUS.emit('auth',ev||'in'); }
function athSchedule(){
  clearTimeout(ATH.timer); ATH.timer=0;
  if(!CLOUD_OK||!AUTH.s||AUTH.state!=='in') return;
  const ms=Math.min(2147483000,Math.max(1000,AUTH.s.expires_at-ATH_SKEW-Date.now()));
  ATH.timer=setTimeout(()=>athRefresh(false),ms);
}
function athRefresh(force){   // single flight: one per tab (refreshP) and one across tabs (navigator.locks, else a 5 s lock in runeguard.auth)
  if(!CLOUD_OK||!AUTH.s) return Promise.resolve('none');
  if(ATH.refreshP) return ATH.refreshP;
  const run=()=>athRefreshLocked(force);
  const p=(typeof navigator!=='undefined'&&navigator.locks&&navigator.locks.request)?navigator.locks.request('runeguard-auth',run):athLockFallback(run);
  ATH.refreshP=Promise.resolve(p).catch(()=>'offline').finally(()=>{ ATH.refreshP=null; });
  return ATH.refreshP;
}
async function athRefreshLocked(force){
  const mine=AUTH.s; if(!mine) return 'none';
  const st=athStoreRead();
  if(st&&st.user.id!==mine.user.id){ AUTH.state='expired'; clearTimeout(ATH.timer); BUS.emit('auth','expired'); return 'expired'; }   // other tab = other user: never overwrite it
  if(st&&st.refresh_token!==mine.refresh_token&&st.expires_at-ATH_SKEW>Date.now()){ AUTH.s=st; AUTH.state='in'; athSchedule(); return 'ok'; }   // other tab rotated already
  if(!force&&mine.expires_at-ATH_SKEW>Date.now()) return 'ok';
  const r=await athCall('refresh',{rt:mine.refresh_token});
  if(r.ok){ const s=athSessionFrom(r.data,mine.user); if(s){ athAccept(s,'refresh'); return 'ok'; } }
  if(r.status===400||r.status===401){ AUTH.state='expired'; clearTimeout(ATH.timer); BUS.emit('auth','expired'); return 'expired'; }   // owner stays the same uid
  return 'offline';
}
async function athLockFallback(run){   // no navigator.locks: field lk (ms) inside runeguard.auth, held at most 5 s
  const t0=Date.now();
  for(;;){ const o=athStoreRead(); if(!o||!o.lk||Date.now()-o.lk>ATH_LOCK_MS||Date.now()-t0>ATH_LOCK_MS) break; await new Promise(r=>setTimeout(r,250)); }
  athLockSet(Date.now());
  try{ return await run(); } finally{ athLockSet(0); }
}
function athLockSet(ms){ const o=athStoreRead(); if(!o) return; if(ms) o.lk=ms; else delete o.lk; STORE.set(ATH_K.s,JSON.stringify(o)); }
function athOnStorage(){   // another tab refreshed, signed in or signed out
  const st=athStoreRead();
  if(!st){ if(AUTH.s){ AUTH.s=null; clearTimeout(ATH.timer); AUTH.state='guest'; BUS.emit('auth','out'); athGuestSave(); } return; }
  if(AUTH.s&&st.user.id===AUTH.s.user.id){ const was=AUTH.state; AUTH.s=st; if(st.expires_at>Date.now()) AUTH.state='in'; athSchedule(); BUS.emit('auth',was==='in'?'refresh':'in'); }
  else if(AUTH.s){ AUTH.state='expired'; clearTimeout(ATH.timer); BUS.emit('auth','expired'); }
}
// signed out (here / another tab) → guest save · mid-run after the run's end (its reward lands on the account save first)
function athGuestSave(){
  if(typeof G!=='undefined'&&G&&G.char&&!G.over){ ATH.outLater=true; return; }
  ATH.outLater=false; if(SAVE&&SAVE.owner!=null) loadSaveFor(null);
}
function athInit(){   // once, and only when CLOUD_OK: restore the session, listen, start cloud sync
  if(!CLOUD_OK) return false;
  if(ATH.inited) return true; ATH.inited=true;
  const s=athStoreRead();
  if(s){ AUTH.s=s; AUTH.state='in'; athSchedule(); } else AUTH.state='guest';
  BUS.on('runEnd',()=>{ if(ATH.outLater&&!AUTH.s) setTimeout(athGuestSave,1200); });   // after onRunEnd + its save
  addEventListener('storage',e=>{ if(e.key===ATH_K.s||e.key===null) athOnStorage(); });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible'&&AUTH.s&&AUTH.state==='in'&&AUTH.s.expires_at-ATH_SKEW<=Date.now()) athRefresh(false); });
  cloudInit();
  return true;
}

/* ---------- boot: ?code= / #access_token= / ?error= (§6.7) ---------- */
function authHandleRedirect(){   // never blocks the first frame: boot gets a result within 3 s (the exchange may finish later)
  if(!athInit()) return Promise.resolve(null);
  const job=athRedirect().then(r=>{ if(r) BUS.emit('auth','redirect',r); return r; },e=>{ console.error('auth redirect',e&&e.code); return null; });
  return new Promise(res=>{ const t=setTimeout(()=>res({kind:'slow', msg:'กำลังเข้าสู่ระบบ…'}),ATH_REDIRECT_MS); job.then(r=>{ clearTimeout(t); res(r); }); });
}
function athUrlAuth(){   // what the address carries for auth: ?code= / ?error= / #access_token= / #error=
  const q=new URLSearchParams(location.search), hs=location.hash.slice(1), h=new URLSearchParams(hs.includes('=')?hs:'');
  return {q, h, code:q.get('code')||'', err:q.get('error_code')||q.get('error')||h.get('error_code')||h.get('error')||'', at:h.get('access_token')||''};
}
async function athRedirect(){
  const {q, h, code, err, at}=athUrlAuth();
  if(!code&&!err&&!at){ if(AUTH.s) cloudOnLogin(); return null; }   // F1: a kept session plays (and syncs) its account save
  const tokenHash=['access_token','refresh_token','expires_in','type','error','error_code','error_description'].some(k=>h.has(k));
  q.delete('code'); q.delete('error'); q.delete('error_code'); q.delete('error_description');   // other query keys (?paid=) stay for 59a
  history.replaceState(history.state,'',location.pathname+(q.toString()?'?'+q:'')+(tokenHash?'':location.hash));   // code / tokens leave the address bar first (#dev stays)
  if(err) return {kind:'error', msg:athErrTh(err,0)};
  if(code){
    const pk=athPkceTake(), one=pk.kinds.length===1?pk.kinds[0]:'';
    if(!pk.live.length) return {kind:'nover', msg:ATH_NOVER[one||'any']};
    let r=null, kind='';
    for(const c of pk.live){   // newest first · a wrong verifier (another pending flow) leaves the code usable: try the next one
      r=await athCall('pkce',{code, v:c.v}); kind=c.kind;
      if(r.ok||r.code!=='bad_code_verifier') break; }
    if(!r.ok){   // sign-up / reset links are verified by GoTrue before ?code= comes back: the e-mail IS confirmed (F10)
      const k1=pk.live.length===1?kind:'';
      if(!['flow_state_expired','flow_state_not_found','bad_code_verifier'].includes(r.code)) return {kind:'error', msg:athErrTh(r.code,r.status)};
      if(k1) athPkceDrop(k1);
      return {kind:'nover', msg:ATH_NOVER[k1||'any']}; }
    athPkceDrop(kind);
    const s=athSessionFrom(r.data); if(!s) return {kind:'error', msg:ATH_MSG.unknown};
    athAccept(s,'in'); cloudOnLogin();
    return {kind, msg:kind==='signup'?'ยืนยันอีเมลสำเร็จ':kind==='recovery'?'ตั้งรหัสผ่านใหม่ได้เลย':'เข้าสู่ระบบเรียบร้อย'};
  }
  const u=await athCall('user',{token:at});   // implicit link (resend): ask GoTrue whose token this is before keeping it
  if(!u.ok) return {kind:'error', msg:athErrTh(u.code,u.status)};
  const s=athSessionFrom({access_token:at, refresh_token:h.get('refresh_token')||'', expires_in:+h.get('expires_in')||3600, user:u.data});
  if(!s) return {kind:'error', msg:ATH_MSG.unknown};
  athAccept(s,'in'); cloudOnLogin();
  const ty=h.get('type'), kind=ty==='recovery'?'recovery':ty==='signup'?'signup':'implicit';
  return {kind, msg:kind==='signup'?'ยืนยันอีเมลสำเร็จ':kind==='recovery'?'ตั้งรหัสผ่านใหม่ได้เลย':'เข้าสู่ระบบเรียบร้อย'};
}
function authWantsScreen(){   // boot (§8.1): show scrAuth? (CLOUD_OK, not signed in, guest not chosen, no sign-in coming back in the URL)
  if(!athInit()||AUTH.state==='in'||AUTH.state==='expired'||STORE.get(ATH_K.guest)==='1') return false;
  const u=athUrlAuth(); return !u.code&&!u.at&&!u.err;
}
// boot (99): a kept session (in / expired) plays its account cache at once (F1) · no cache yet → guest, then the link flow
function authBootOwner(){
  if(!athInit()||!AUTH.s) return null;
  const id=AUTH.s.user.id; return STORE.get('runeguard.save.u.'+id)!==null?id:null;
}
function authChooseGuest(){ if(!athInit()) return false; STORE.set(ATH_K.guest,'1'); if(!AUTH.s) AUTH.state='guest'; BUS.emit('auth','guest'); return true; }

/* ---------- actions (§6.7 table) ---------- */
async function authSignUp(email,pw){
  if(!athInit()) return {ok:false, msg:ATH_MSG.off};
  const bad=athCheck(email,pw); if(bad) return {ok:false, msg:athErrTh(bad)};
  const ch=await athPkceNew('signup');
  const r=await athCall('signup',{email, pw, ch});
  if(r.ok){ const s=athSessionFrom(r.data); if(s){ athAccept(s,'in'); cloudOnLogin(); return {ok:true, msg:'สมัครและเข้าสู่ระบบแล้ว', in:true}; } return {ok:true, msg:ATH_NEUTRAL}; }
  if(r.code==='user_already_exists'||r.code==='email_exists') return {ok:true, msg:ATH_NEUTRAL};
  return {ok:false, msg:athErrTh(r.code,r.status)};
}
async function authSignIn(email,pw){
  if(!athInit()) return {ok:false, msg:ATH_MSG.off, code:'off'};
  const bad=athCheck(email); if(bad) return {ok:false, msg:athErrTh(bad), code:bad};
  if(!pw) return {ok:false, msg:ATH_MSG.invalid_credentials, code:'invalid_credentials'};
  AUTH.state='busy';
  const r=await athCall('password',{email, pw});
  const s=r.ok&&athSessionFrom(r.data);
  if(s){ athAccept(s,'in'); cloudOnLogin(); return {ok:true, msg:'', code:''}; }
  AUTH.state=AUTH.s?'expired':'guest';
  const code=r.ok?'unknown':r.code; return {ok:false, msg:athErrTh(code,r.status), code};
}
async function authGoogle(){
  if(!athInit()) return false;
  const ch=await athPkceNew('google');
  location.assign(athGoogleUrl(ch)); return true;
}
async function authResend(email){
  if(!athInit()) return {ok:false, msg:ATH_MSG.off};
  if(!athEmailOk(email)) return {ok:false, msg:ATH_BAD_EMAIL};
  if(Date.now()-ATH.resendAt<ATH_RESEND_MS) return {ok:false, msg:ATH_MSG.resend_wait};
  ATH.resendAt=Date.now();
  return athNeutral(await athCall('resend',{email}));
}
async function authRecover(email){
  if(!athInit()) return {ok:false, msg:ATH_MSG.off};
  if(!athEmailOk(email)) return {ok:false, msg:ATH_BAD_EMAIL};
  const ch=await athPkceNew('recovery');
  return athNeutral(await athCall('recover',{email, ch}));
}
function athNeutral(r){   // resend / recover: only errors that say nothing about the account are shown, the rest = neutral text
  const shown=['over_email_send_rate_limit','over_request_rate_limit','timeout','network','server','email_address_invalid','validation_failed'];
  return r.ok||(!shown.includes(r.code)&&r.status<500)?{ok:true, msg:ATH_NEUTRAL}:{ok:false, msg:athErrTh(r.code,r.status)};
}
async function authSetPassword(pw){
  if(!athInit()) return {ok:false, msg:ATH_MSG.off};
  if(typeof pw!=='string'||pw.length<ATH_PW_MIN) return {ok:false, msg:ATH_SHORT_PW};
  if(!AUTH.s) return {ok:false, msg:ATH_EXPIRED};
  const r=await athCall('setpw',{pw});
  return r.ok?{ok:true, msg:'ตั้งรหัสผ่านใหม่แล้ว'}:{ok:false, msg:athErrTh(r.code,r.status)};
}
async function authSignOut(){   // this device only: logout?scope=local, then local sign-out even when offline
  if(!athInit()||!AUTH.s) return {ok:false};
  if(AUTH.state==='in') await athCall('logout');
  AUTH.s=null; STORE.del(ATH_K.s); clearTimeout(ATH.timer); AUTH.state='guest'; STORE.set(ATH_K.guest,'1');
  BUS.emit('auth','out');
  athGuestSave();   // back to the guest save · runeguard.save.u.<uid> stays as this account's offline cache
  return {ok:true};
}
async function authToken(){
  if(!CLOUD_OK||!AUTH.s||AUTH.state==='expired') return null;
  if(AUTH.s.expires_at-ATH_SKEW<=Date.now()){
    const r=await athRefresh(false);
    if(r!=='ok') return r==='offline'&&AUTH.s&&AUTH.s.expires_at>Date.now()?AUTH.s.access_token:null;
  }
  return AUTH.s?AUTH.s.access_token:null;
}
function authEmailMasked(){   // 'lu***@gmail.com' · account page only
  const e=AUTH.s&&AUTH.s.user&&AUTH.s.user.email;
  if(typeof e!=='string'||e.lastIndexOf('@')<1) return '';
  const at=e.lastIndexOf('@'), loc=Array.from(e.slice(0,at));
  return loc.slice(0,loc.length>2?2:1).join('')+'***@'+e.slice(at+1);
}

DEV.auth={
  state(){ return AUTH.state; },
  useSession(o){   // localhost + a test token only (§7.9)
    if(!CLOUD_OK||!['localhost','127.0.0.1'].includes(location.hostname)||!athInit()) return false;
    const s=athSessionFrom(o); if(!s) return false; athAccept(s,'in'); return true;
  }
};
