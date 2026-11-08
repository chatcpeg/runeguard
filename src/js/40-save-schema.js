/* ================= 40-save-schema.js · lane C · pure · save schema, migrate, validate, summary ================= */
// Save data model v1 = DESIGN §6.3. validateSave rebuilds a clean save from whitelisted fields only (never trusts input):
// numbers clamped, ids/keys matched against known data or a strict pattern, names stripped to ^[\p{L}\p{M}\p{N} ]{2,16}$.
// Newer schema (v > SCHEMA_V) → a validated copy marked read-only (non-enumerable .ro); the original is never overwritten.
const SCHEMA_V=1;
const SV_APP='2.0.0-m1';                                 // app version stamped into every local write (saveSummary.appVer)
const SV_NAME_RE=/^[\p{L}\p{M}\p{N} ]{2,16}$/u;
const SV_SLOTS=['weapon','off','head','face','body','cloak','hands','feet','neck','ring'];
const SV_WEAPON={swordsman:'w_sword_1', mage:'w_staff_1', archer:'w_bow_1', cleric:'w_rod_1', thief:'w_dagger_1'};   // §3.8 starter (M2)
const SV_ID=/^[a-z][a-z0-9_]{0,39}$/;                   // item / skill / zone / boss / mob ids
const SV_TMAX=4102444800000;                             // year 2100 (ms epoch)
const SV_MAXB=256*1024;                                  // biggest save the cloud table accepts
const SV_RUNIDS=30;
function svObj(x){ return !!x&&typeof x==='object'&&!Array.isArray(x); }
function svHas(o,k){ return typeof k==='string'&&Object.prototype.hasOwnProperty.call(o,k); }
function svKeys(x,max){ return svObj(x)?Object.keys(x).filter(k=>!(k in Object.prototype)).slice(0,max||64):[]; }   // no __proto__ / constructor / toString …
function svInt(v,lo,hi,def){ const n=typeof v==='number'?v:typeof v==='string'&&v.trim()!==''?Number(v):NaN; if(!isFinite(n)) return def; const i=Math.floor(n); return i<lo?lo:i>hi?hi:i; }
function svNum(v,lo,hi,def){ const n=typeof v==='number'?v:NaN; if(!isFinite(n)) return def; return n<lo?lo:n>hi?hi:n; }
function svStr(v,re,def){ return typeof v==='string'&&re.test(v)?v:def; }
function uid(prefix){
  let p=String(prefix||'x'); if(!p.endsWith('_')) p+='_';
  const a=new Uint8Array(8); try{ crypto.getRandomValues(a); }catch(e){ for(let i=0;i<8;i++) a[i]=(Math.random()*256)|0; }
  let s=''; for(let i=0;i<8;i++) s+='0123456789abcdefghijklmnopqrstuvwxyz'[a[i]%36]; return p+s; }
// local calendar day / ISO week (daily bonus · weekly rush)
function svDay(t){ const d=new Date(t==null?Date.now():t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function svWeek(t){ const d=new Date(t==null?Date.now():t); const u=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); const dn=u.getUTCDay()||7;
  u.setUTCDate(u.getUTCDate()+4-dn); const y=u.getUTCFullYear(), w=Math.ceil(((u-Date.UTC(y,0,1))/864e5+1)/7); return y+'-W'+String(w).padStart(2,'0'); }
// a name the player typed: Unicode letters/marks/digits/space only, ≤ 16 characters ('' = unusable)
// + at least 2 letters/digits, a mark only right after a letter/digit/mark, ≤ 3 marks in a row (Thai vowel + tone fits; no invisible / Zalgo names)
function svNameOk(t){ return typeof t==='string'&&SV_NAME_RE.test(t)&&!/\p{M}{4}/u.test(t)&&!/(^|[^\p{L}\p{N}\p{M}])\p{M}/u.test(t)&&(t.match(/[\p{L}\p{N}]/gu)||[]).length>=2; }
function svCleanName(s){ if(typeof s!=='string') return '';
  let t=s.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ]/gu,'').replace(/(^|[^\p{L}\p{N}\p{M}])\p{M}+/gu,'$1').replace(/(\p{M}{3})\p{M}+/gu,'$1').replace(/ +/g,' ').trim();
  t=Array.from(t).slice(0,16).join('').trim(); return svNameOk(t)?t:''; }
function svOwner(o){ return typeof o==='string'&&/^[A-Za-z0-9_-]{1,64}$/.test(o)?o:null; }   // auth uid, never an email
function svEmptyEq(){ const o={}; for(const k of SV_SLOTS) o[k]=null; return o; }
function svNewAcct(){ return {gold:0, marks:0, stash:[], stashMax:BAL.PRICE.stash.start, survTier:0,
  records:{classic:{}, survival:{}, boss:{}}, fboss:{}, bossUnlock:{colossus:0, lich:0, king:0},
  daily:{day:'', surv:{}, boss:{}, rushWeek:''}, flags:{pioneer:false, migratedBest:false, pioneerCloak:false, tips:{}}, runIds:[]}; }

function newSave(owner){ const t=Date.now();
  return {v:SCHEMA_V, sid:uid('s_'), owner:svOwner(owner), created:t, mt:t, play:0, app:SV_APP, acct:svNewAcct(), chars:[], active:null}; }
function newChar(name,clsId){
  if(!svHas(CLS,clsId)) return null; const c=CLS[clsId], first=c.skills[0], t=Date.now();
  const ch={id:uid('c_'), name:svCleanName(name)||c.n, cls:c.id, job:null, created:t, play:0, kills:0, deaths:0,
    lv:1, xp:0, pts:BAL.START_PTS, st:{STR:0,VIT:0,AGI:0,DEX:0,INT:0,LUK:0}, jlv:1, jxp:0, sp:0,
    sk:{[first]:1}, pas:{}, load:[first], eq:svEmptyEq(), inv:[], bagMax:BAL.PRICE.bagStart, quick:[null,null],
    trial:{t2:0}, zone:'z1', visited:['z1'], bestiary:{}, resets:{free:1, skFree:1}};
  // §3.8 starter kit: shows up once lane E's ITEMS has these ids (M2) — training weapon worn + small potion ×3
  const items=typeof ITEMS!=='undefined'?ITEMS:{}, wid=SV_WEAPON[c.id];
  if(svHas(items,wid)){ const w=(typeof makeInst==='function'&&makeInst(wid,{}))||{u:uid('i_'), id:wid, r:0, f:0, s:[], lk:0}; ch.inv.push(w); ch.eq.weapon=w.u; }
  if(svHas(items,'u_potion_s')){ ch.inv.push({id:'u_potion_s', n:3}); ch.quick[0]='u_potion_s'; }
  return ch;
}

// ---- migration ----
function svImportBest(best){   // runeguard.best = {clsId:{score,wave,kills,won}} (read only, never written back)
  if(typeof best==='string'){ try{ best=JSON.parse(best); }catch(e){ return null; } }
  if(!svObj(best)) return null; const o={}; let n=0;
  for(const k of svKeys(best)) if(svHas(CLS,k)){ const r=svRecClassic(best[k]); if(r){ o[k]=r; n++; } }
  return n?o:null; }
function svMig0(o,best){   // v0 = the old single-file game: nothing but runeguard.best
  const s=newSave(o&&o.owner), imp=svImportBest(best);
  if(imp){ s.acct.records.classic=imp; s.acct.flags.pioneer=true; s.acct.flags.migratedBest=true; }
  return s; }
const SV_MIG={0:svMig0};      // SV_MIG[v](o) → save of version v+1 (add 1→2 here when SCHEMA_V becomes 2)
function migrateSave(o,legacyBest){
  if(!svObj(o)) o=null;
  const v=o?o.v:undefined;
  if(o&&Number.isInteger(v)&&v>SCHEMA_V){   // written by a newer app: read-only view, never written or pushed (1.5 / 1e999 = garbage)
    const s=validateSave(o); s.v=v; Object.defineProperty(s,'ro',{value:true, enumerable:false}); return s; }
  if(!o||v===undefined||v===0) o=svMig0(o,legacyBest);
  else if(!(Number.isInteger(v)&&v>=1)) o=svMig0(null,legacyBest);   // garbage version → start clean
  while(o.v<SCHEMA_V) o=SV_MIG[o.v](o,legacyBest);
  return validateSave(o);
}

// ---- validation (pure · idempotent: validateSave(validateSave(x)) deep-equals validateSave(x)) ----
function svRecClassic(x){ if(!svObj(x)) return null;
  return {score:svInt(x.score,0,1e12,0), wave:svInt(x.wave,0,BAL.SURV.WAVES,0), kills:svInt(x.kills,0,1e9,0), won:x.won===true}; }
function svRecSurv(x){ x=svObj(x)?x:{}; return {wave:svInt(x.wave,0,BAL.SURV.WAVES,0), kills:svInt(x.kills,0,1e9,0), won:x.won===true}; }
function svFlagMap(x,re,max){ const o={}; for(const k of svKeys(x,max)) if(re.test(k)&&x[k]) o[k]=1; return o; }
function svItem(x){
  if(!svObj(x)||!svStr(x.id,SV_ID,'')) return null;
  const items=typeof ITEMS!=='undefined'?ITEMS:{}, def=svHas(items,x.id)?items[x.id]:null;
  const stack=def?!!def.stack:x.u===undefined;
  let o;
  if(stack) o={id:x.id, n:svInt(x.n,1,def&&def.stack||999,1)};
  else o={u:svStr(x.u,/^i_[a-z0-9]{1,24}$/,'')||uid('i_'), id:x.id, r:svInt(x.r,0,BAL.REFINE.max,0), f:svNum(x.f,0,20,0),
    s:Array.isArray(x.s)?x.s.slice(0,2).map(v=>svStr(v,SV_ID,null)):[], lk:x.lk?1:0};
  if(!def) o.unk=1;                      // unknown id (maybe from a newer client): keep it, flagged
  return o; }
function svItems(arr,max,keepU){   // → clean list ≤ max · equipped uids (keepU) are kept first when trimming
  const out=[], seen=new Set();
  for(const x of Array.isArray(arr)?arr.slice(0,400):[]){ const it=svItem(x); if(!it) continue;
    if(it.u){ if(seen.has(it.u)) it.u=uid('i_'); seen.add(it.u); } out.push(it); }
  if(out.length<=max) return out;
  let room=max-out.filter(it=>it.u&&keepU&&keepU.has(it.u)).length;
  return out.filter(it=>{ if(it.u&&keepU&&keepU.has(it.u)) return true; if(room>0){ room--; return true; } return false; }).slice(0,max); }
function svAcct(a){
  a=svObj(a)?a:{}; const o=svNewAcct(), cap=BAL.CAP;
  o.gold=svInt(a.gold,0,cap.gold,0); o.marks=svInt(a.marks,0,cap.marks,0);
  o.stashMax=svInt(a.stashMax,BAL.PRICE.stash.start,cap.stash,BAL.PRICE.stash.start);
  o.stash=svItems(a.stash,o.stashMax,null);
  o.survTier=svInt(a.survTier,0,BAL.SURV.maxT,0);
  const r=svObj(a.records)?a.records:{};
  for(const k of svKeys(r.classic)) if(svHas(CLS,k)){ const x=svRecClassic(r.classic[k]); if(x) o.records.classic[k]=x; }
  for(const cid of svKeys(r.survival)){ if(!/^c_[a-z0-9]{1,24}$/.test(cid)) continue; const m={}, src=r.survival[cid];
    for(const tk of svKeys(src)){ if(!/^(10|[0-9])$/.test(tk)) continue; m[tk]=svRecSurv(src[tk]); } o.records.survival[cid]=m; }
  for(const b of svKeys(r.boss)){ if(!SV_ID.test(b)) continue; const m={}, src=r.boss[b];
    for(const dk of svKeys(src)){ if(!/^[012]$/.test(dk)) continue; const x=svObj(src[dk])?src[dk]:{};
      m[dk]={sec:svNum(x.sec,0,1e6,0), medal:x.medal==='S'||x.medal==='A'?x.medal:'B'}; } o.records.boss[b]=m; }
  for(const z of svKeys(a.fboss)){ if(!SV_ID.test(z)) continue; const x=svObj(a.fboss[z])?a.fboss[z]:{};
    o.fboss[z]={next:svInt(x.next,0,SV_TMAX,0), kills:svInt(x.kills,0,1e9,0)}; }
  for(const b of svKeys(a.bossUnlock)) if(SV_ID.test(b)) o.bossUnlock[b]=a.bossUnlock[b]?1:0;
  const d=svObj(a.daily)?a.daily:{};
  o.daily={day:svStr(d.day,/^\d{4}-\d{2}-\d{2}$/,''), surv:svFlagMap(d.surv,/^(10|[0-9])$/,16), boss:svFlagMap(d.boss,/^[a-z0-9_:-]{1,40}$/,64),
    rushWeek:svStr(d.rushWeek,/^\d{4}-W\d{2}$/,'')};
  const f=svObj(a.flags)?a.flags:{};
  o.flags={pioneer:f.pioneer===true, migratedBest:f.migratedBest===true, pioneerCloak:f.pioneerCloak===true, tips:svFlagMap(f.tips,/^[A-Za-z0-9_:-]{1,40}$/,64)};
  const ids=[]; for(const x of Array.isArray(a.runIds)?a.runIds:[]) if(svStr(x,/^r_[a-z0-9_]{1,24}$/,'')&&ids.indexOf(x)<0) ids.push(x);
  o.runIds=ids.slice(-SV_RUNIDS);
  return o; }
function svChar(c){
  if(!svObj(c)||!svHas(CLS,c.cls)) return null;
  const cls=CLS[c.cls], first=cls.skills[0], cap=BAL.CAP, t=Date.now(), o={};
  o.id=svStr(c.id,/^c_[a-z0-9]{1,24}$/,'')||uid('c_');
  o.name=svCleanName(c.name)||cls.n;
  o.cls=cls.id;
  const adv=cls.adv.find(a=>a.id===c.job)||null; o.job=adv?adv.id:null;
  o.created=svInt(c.created,0,SV_TMAX,t); o.play=svNum(c.play,0,1e9,0); o.kills=svInt(c.kills,0,1e12,0); o.deaths=svInt(c.deaths,0,1e9,0);
  o.lv=svInt(c.lv,1,cap.base,1); o.xp=o.lv>=cap.base?0:svInt(c.xp,0,BAL.bxpNeed(o.lv)-1,0);
  const st=svObj(c.st)?c.st:{}; o.st={}; for(const k of STAT_ORDER) o.st[k]=svInt(st[k],0,cap.stat,0);
  const spentSt=STAT_ORDER.reduce((n,k)=>n+BAL.statSpent(o.st[k]),0);
  o.pts=svInt(c.pts,0,Math.max(0,BAL.ptsAt(o.lv)-spentSt),0);
  const tier=adv?2:1, jcap=adv?cap.job2:cap.job1;
  o.jlv=svInt(c.jlv,1,jcap,1); o.jxp=o.jlv>=jcap?0:svInt(c.jxp,0,BAL.jxpNeed(o.jlv,tier)-1,0);
  const sk=svObj(c.sk)?c.sk:{}; o.sk={};
  for(const id of cls.skills.concat(adv?adv.skills:[])){ const r=svInt(sk[id],0,cap.rank,0); if(r) o.sk[id]=r; }
  if(!o.sk[first]) o.sk[first]=1;                                   // the free ★1 of the first skill never goes away
  const pas=svObj(c.pas)?c.pas:{}; o.pas={};
  for(const id in PASSIVES){ const w=PASSIVES[id].own; if(w!==cls.id&&w!==o.job) continue; const r=svInt(pas[id],0,cap.rank,0); if(r) o.pas[id]=r; }
  o.sp=svInt(c.sp,0,Math.max(0,BAL.spAt(tier,o.jlv)-pgSpSpent(o)),0);
  const slots=BAL.LOADOUT[tier], load=[];
  for(const id of Array.isArray(c.load)?c.load:[]) if(typeof id==='string'&&o.sk[id]>0&&load.indexOf(id)<0&&load.length<slots) load.push(id);
  o.load=load.length?load:[first];
  o.bagMax=svInt(c.bagMax,BAL.PRICE.bagStart,cap.bag,BAL.PRICE.bagStart);
  const eqIn=svObj(c.eq)?c.eq:{}, want=new Set(); for(const k of SV_SLOTS) if(typeof eqIn[k]==='string') want.add(eqIn[k]);
  o.eq=svEmptyEq(); o.inv=svItems(c.inv,o.bagMax,want);
  const used=new Set(), items=typeof ITEMS!=='undefined'?ITEMS:{};
  for(const k of SV_SLOTS){ const u=eqIn[k]; if(typeof u!=='string'||used.has(u)) continue;
    const it=o.inv.find(x=>x.u===u); if(!it) continue;                  // must point at an instance in this bag
    const d=svHas(items,it.id)?items[it.id]:null; if(d&&d.slot&&d.slot!==k) continue;   // a known item only in its own slot
    o.eq[k]=u; used.add(u); }
  const q=Array.isArray(c.quick)?c.quick:[]; o.quick=[svStr(q[0],SV_ID,null), svStr(q[1],SV_ID,null)];
  o.trial={t2:svObj(c.trial)&&c.trial.t2===1?1:0};
  o.zone=svStr(c.zone,SV_ID,'z1');
  const vis=[]; for(const z of Array.isArray(c.visited)?c.visited.slice(0,64):[]) if(svStr(z,SV_ID,'')&&vis.indexOf(z)<0&&vis.length<32) vis.push(z);
  o.visited=vis.length?vis:['z1'];
  o.bestiary={}; for(const m of svKeys(c.bestiary,200)) if(SV_ID.test(m)) o.bestiary[m]=svInt(c.bestiary[m],0,1e9,0);
  const rs=svObj(c.resets)?c.resets:{}; o.resets={free:rs.free===0?0:1, skFree:rs.skFree===0?0:1};
  return o; }
function validateSave(s){
  if(!svObj(s)) s={};
  const t=Date.now(), o={v:SCHEMA_V};
  o.sid=svStr(s.sid,/^s_[a-z0-9]{1,24}$/,'')||uid('s_');
  o.owner=svOwner(s.owner);
  o.created=svInt(s.created,0,SV_TMAX,t); o.mt=svInt(s.mt,0,SV_TMAX,t); o.play=svNum(s.play,0,1e10,0);
  o.app=svStr(s.app,/^[A-Za-z0-9._-]{1,24}$/,SV_APP);
  o.acct=svAcct(s.acct);
  o.chars=[]; const ids=new Set();
  for(const c of Array.isArray(s.chars)?s.chars.slice(0,16):[]){ if(o.chars.length>=BAL.CAP.chars) break;
    const ch=svChar(c); if(!ch) continue; if(ids.has(ch.id)) ch.id=uid('c_'); ids.add(ch.id); o.chars.push(ch); }
  o.active=typeof s.active==='string'&&ids.has(s.active)?s.active:(o.chars[0]?o.chars[0].id:null);
  return o; }

function saveSummary(s){ s=svObj(s)?s:{};
  return {chars:(Array.isArray(s.chars)?s.chars:[]).map(c=>({n:c.name, cls:c.cls, job:c.job||null, lv:c.lv})), play:+s.play||0, mt:+s.mt||0, appVer:typeof s.app==='string'?s.app:''}; }
// nothing worth keeping (used when a guest save meets an account save): no progress, no gold/marks/stash, no records
function isTrivialSave(s){
  if(!svObj(s)) return true; const a=svObj(s.acct)?s.acct:{}, r=svObj(a.records)?a.records:{};
  if((a.gold|0)>0||(a.marks|0)>0||(Array.isArray(a.stash)&&a.stash.length)) return false;
  if(svKeys(r.survival).length||svKeys(r.boss).length) return false;
  for(const c of Array.isArray(s.chars)?s.chars:[]) if((c.lv|0)>1||(c.xp|0)>0||(c.jlv|0)>1||(c.jxp|0)>0||(c.kills|0)>0||(c.job)) return false;
  return true; }
