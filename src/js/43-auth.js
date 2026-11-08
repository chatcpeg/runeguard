/* ================= 43-auth.js · lane N · GoTrue raw fetch + PKCE (§6.7) · the only file with the Supabase URL/key ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane N writes the real body. */
const SUPA={ url:'https://edmwctmnasggdtdbcxkb.supabase.co', key:'sb_publishable_uSbGPoK1lGd6PMUUGpu4uw_N_HfOIbF' };
const AUTH_ON=false;                                   // เปิดหลังเจ้าของอนุมัติ (M3)
const CLOUD_HOSTS=['runeguard-lac.vercel.app','localhost','127.0.0.1'];
const CLOUD_OK=AUTH_ON&&CLOUD_HOSTS.includes(location.hostname)
  &&(location.protocol==='https:'||location.hostname!=='runeguard-lac.vercel.app')
  &&!!(self.crypto&&crypto.subtle)&&typeof fetch==='function';
const RURL=location.origin+'/';                        // ห้ามอ่าน redirect จาก query (กัน open redirect)
const AUTH={state:'off', s:null};                      // state: 'off'|'guest'|'busy'|'in'|'expired' · s = session
function authSignUp(email,pw){ return Promise.resolve({ok:false, msg:'ระบบบัญชียังไม่เปิดใช้'}); }
function authSignIn(email,pw){ return Promise.resolve({ok:false, msg:'ระบบบัญชียังไม่เปิดใช้', code:'off'}); }
function authGoogle(){}
function authHandleRedirect(){ return Promise.resolve(null); }
function authResend(email){}
function authRecover(email){}
function authSetPassword(pw){}
function authSignOut(){}
function authToken(){ return Promise.resolve(null); }
function authFetch(path,opts){ return Promise.reject(new Error('AUTH_ON=false')); }
function authEmailMasked(){ return ''; }

