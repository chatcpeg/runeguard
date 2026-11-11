/* ================= 28-shop.js · lane B · shop rules (docs/PROPOSAL-shop.md) · no DOM ================= */
// What the player owns (ENT) = their own rows of public.rg_purchases (RLS · written only by api/stripe-webhook.js), held for this
// session only (never in the save / localStorage) · none (guest, offline, artifact) = empty · #dev grant: local dev server only.
// Wallet = ENT.runes − acct.ru (moved onto characters as ch.rb) · loaded list → shopClamp: Σ ch.rb ≤ acct.ru ≤ runes bought.
// RSHOP must equal api/_shop.js PRODUCTS (the server's table is the one that counts · test/45-pay checks).
const RSHOP={
  products:[
    {id:'sup30', n:'แพคสนับสนุน 30 วัน', i:'💎', thb:35, days:30, d:'สุ่มการ์ดใหม่ไม่จำกัด · เลือกการ์ดเลเวลอัปได้ทั้ง 5 ใบ · ซื้อซ้ำ = ต่อเวลาอีก 30 วัน (ไม่ต่ออัตโนมัติ)'},
    {id:'rune60', n:'รูน 60', i:'🔷', thb:35, runes:60, d:'ใช้ในต้นไม้สกิลและระดับเริ่มต้นของสกิล'},
    {id:'rune200', n:'รูน 200', i:'🔷', thb:99, runes:200, d:'คุ้มขึ้นราว 18%'},
    {id:'rune700', n:'รูน 700', i:'💠', thb:299, runes:700, d:'คุ้มขึ้นราว 37%'},
    {id:'rune2500', n:'รูน 2500', i:'💠', thb:899, runes:2500, d:'คุ้มขึ้นราว 49%'}],
  cards:5, freeCards:3, freeRerolls:2,
  slCost:[0,0,10,15,20,25,30,35,40]};       // rune cost to raise a skill's starting Lv to n (from n−1)
let ENT={sup:0, runes:0, src:'none'}, entOk=false;   // sup = supporter until (ms) · runes = bought in total · read lazily (nothing at load)
// the list last loaded: owner uid · n rows · sids = Checkout Session ids (59a: "has my purchase landed?")
const ENTS_NONE={uid:'', sup:0, runes:0, n:0, sids:[], at:0};
let ENTS=Object.assign({},ENTS_NONE), entBusy=null;
function entGet(){ if(!entOk){ entOk=true; try{ entLoad(); }catch(e){} } return ENT; }
// test entitlements only on a local dev server (never on the live site, even with #dev typed in: tester r2 F2)
function shopDevHost(){ return typeof location!=='undefined'&&location.hash==='#dev'&&/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }
function entUid(){ return typeof AUTH!=='undefined'&&AUTH.s&&AUTH.s.user&&typeof AUTH.s.user.id==='string'?AUTH.s.user.id:''; }
function entSigned(){ return typeof CLOUD_OK!=='undefined'&&CLOUD_OK&&typeof AUTH!=='undefined'&&AUTH.state==='in'&&!!entUid(); }
function entLoad(){ ENT={sup:0, runes:0, src:'none'};
  const u=entUid(); if(u&&ENTS.uid===u){ ENT={sup:ENTS.sup, runes:ENTS.runes, src:'server'}; return ENT; }   // the server's list wins
  if(!shopDevHost()||typeof localStorage==='undefined') return ENT;
  try{ const o=JSON.parse(localStorage.getItem('runeguard.devEnt')||'null'); if(o&&typeof o==='object'){
    ENT={sup:Math.max(0,+o.sup||0), runes:Math.max(0,Math.min(1e7,o.runes|0)), src:'dev'}; } }catch(e){}
  return ENT; }
function isSupporter(){ return entGet().sup>Date.now(); }
function supDaysLeft(){ return isSupporter()?Math.ceil((entGet().sup-Date.now())/864e5):0; }
function shopWallet(){ const A=SAVE&&SAVE.acct; return Math.max(0,(entGet().runes|0)-((A&&A.ru)|0)); }
// move `need` bought runes from the account wallet onto character ch (only when the wallet has them all)
function shopFund(ch,need){ need=Math.ceil(need); if(!(need>0)) return true; const A=SAVE&&SAVE.acct; if(!A||shopWallet()<need) return false;
  A.ru=(A.ru|0)+need; ch.rb=(ch.rb|0)+need; return true; }
/* ---- step ค.: rg_purchases → ENT ---- */
// rows → {sup, runes, n, sids} · supporter days chain from the current end (ต่อจากวันหมดเดิม) or the purchase time if lapsed ·
// created_at = server clock · runes / days as the webhook stored them · unknown product skipped
function entFromRows(rows){
  const ok=(Array.isArray(rows)?rows:[]).filter(r=>r&&typeof r==='object'&&RSHOP.products.some(p=>p.id===r.product)&&Number.isFinite(Date.parse(r.created_at)))
    .map(r=>({t:Date.parse(r.created_at), runes:Math.max(0,Math.min(1e5,r.runes|0)), days:Math.max(0,Math.min(366,r.days|0)), sid:typeof r.session_id==='string'?r.session_id.slice(0,200):''}))
    .sort((a,b)=>a.t-b.t);
  let sup=0, runes=0;
  for(const r of ok){ runes+=r.runes; if(r.days) sup=Math.max(sup,r.t)+r.days*864e5; }
  return {sup, runes:Math.min(1e7,runes), n:ok.length, sids:ok.map(r=>r.sid).filter(Boolean)}; }
// Σ ch.rb ≤ acct.ru ≤ bought → {ru, rb} taken back (last character first; tfSanitize drops what it can no longer pay)
function shopClamp(S,bought){
  const out={ru:0, rb:0}; if(!S||!S.acct||!Array.isArray(S.chars)) return out; const A=S.acct; bought=Math.max(0,bought|0);
  if((A.ru|0)>bought){ out.ru=(A.ru|0)-bought; A.ru=bought; }
  let sum=S.chars.reduce((n,c)=>n+Math.max(0,(c&&c.rb)|0),0);
  for(let i=S.chars.length-1;i>=0&&sum>(A.ru|0);i--){ const c=S.chars[i], take=Math.min(Math.max(0,c.rb|0),sum-(A.ru|0));
    if(take>0){ c.rb=(c.rb|0)-take; sum-=take; out.rb+=take; if(typeof tfSanitize==='function') tfSanitize(c); } }
  return out; }
// GET own rows (signed in only · one at a time)
function entRefresh(){
  if(!entSigned()||typeof authFetch!=='function') return Promise.resolve(false);
  if(entBusy) return entBusy; const u=entUid();
  entBusy=authFetch('/rest/v1/rg_purchases?select=session_id,product,runes,days,created_at&user_id=eq.'+u+'&order=created_at.asc,id.asc&limit=5000',{method:'GET'})
    .then(r=>r.ok?r.json():Promise.reject(new Error('http '+r.status)))
    .then(rows=>{ if(entUid()!==u||!Array.isArray(rows)) return false;
      const e=entFromRows(rows); ENTS={uid:u, sup:e.sup, runes:e.runes, n:e.n, sids:e.sids, at:Date.now()}; entOk=false;
      shopClampLater(); BUS.emit('ent',ENTS); return true; })
    .catch(e=>{ console.warn('rg_purchases',e&&e.message); return false; })
    .finally(()=>{ entBusy=null; });
  return entBusy; }
// clamp the owner's save (not mid-run: runEnd runs it again) · saved + said only when it changed
function shopClampLater(){ setTimeout(()=>{ try{
  const u=entUid(); if(!u||ENTS.uid!==u||!SAVE||SAVE.owner!==u||SAVE.ro) return;
  if(typeof G!=='undefined'&&G&&G.char&&!G.over) return;
  const r=shopClamp(SAVE,ENTS.runes); if(!r.ru&&!r.rb) return;
  saveNow('ent');
  if(r.rb&&typeof toast==='function') toast('ปรับรูนที่ซื้อให้ตรงกับรายการซื้อของบัญชี (−'+r.rb+' รูน)','info');
}catch(e){ console.error(e); } },0); }
function entSummaryTh(){   // account page line
  const u=entUid(); if(!u) return ''; if(ENTS.uid!==u) return 'สิทธิ์ที่ซื้อ: ยังโหลดไม่ได้ (ต้องออนไลน์)';
  if(!ENTS.n) return 'สิทธิ์ที่ซื้อ: ยังไม่มีรายการซื้อ';
  const d=new Date(ENTS.sup), sup=ENTS.sup>Date.now()?'ผู้สนับสนุนถึง '+d.toLocaleDateString('th-TH',{day:'numeric', month:'short', year:'numeric'}):ENTS.sup?'แพคสนับสนุนหมดอายุแล้ว':'';
  return 'ซื้อแล้ว '+ENTS.n+' รายการ · รูนที่ซื้อรวม '+ENTS.runes.toLocaleString('en-US')+(sup?' · '+sup:''); }
BUS.on('auth',ev=>{ if(ev==='out'){ ENTS=Object.assign({},ENTS_NONE); entOk=false; BUS.emit('ent',ENTS); } else if(ev==='in') entRefresh(); });
BUS.on('char',()=>{ if(ENTS.uid) shopClampLater(); });
BUS.on('runEnd',()=>{ if(ENTS.uid) setTimeout(shopClampLater,1600); });
// level-up cards of a character run: 5 shown · free players pick from the first 3 (classic keeps its 3 cards)
function cardCount(){ return G&&G.char&&G.mode&&G.mode.cards!==false?RSHOP.cards:3; }
function cardLocked(i){ return !!(G&&G.char)&&i>=RSHOP.freeCards&&!isSupporter(); }
function runRerolls(){ return isSupporter()?1e9:RSHOP.freeRerolls; }

/* ---- starting Lv of a skill (ch.sl[id] = Lv 2…★) ---- */
function slOf(ch,id){ return Math.max(1,(ch&&ch.sl&&svHas(ch.sl,id)?ch.sl[id]|0:1)); }
function slSpentTo(lv){ let n=0; for(let i=2;i<=lv;i++) n+=RSHOP.slCost[i]|0; return n; }
function slSpent(ch){ let n=0; for(const id in (ch&&ch.sl)||{}) n+=slSpentTo(ch.sl[id]|0); return n; }
function slWhy(ch,id){ if(!ch) return 'ไม่มีตัวละคร'; if(typeof pgRO==='function'&&pgRO()) return 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้';
  const cur=slOf(ch,id), nx=cur+1, r=(ch.sk||{})[id]|0;
  if(!r) return 'ยังไม่ได้ฝึกสกิลนี้'; if(nx>r) return 'ต้องฝึกลำต้นถึง ★'+nx+' ก่อน (ตอนนี้ ★'+r+')';
  const c=RSHOP.slCost[nx]|0, free=tfFree(ch); if(free+shopWallet()<c) return 'รูนไม่พอ (ต้องใช้ '+c+' มี '+free+(shopWallet()?' + กระเป๋า '+shopWallet():'')+')';
  return ''; }
function slBuy(ch,id){ ch=typeof pgFresh==='function'?pgFresh(ch):ch; if(!ch||slWhy(ch,id)!=='') return false;
  const nx=slOf(ch,id)+1, c=RSHOP.slCost[nx]; if(tfFree(ch)<c&&!shopFund(ch,c-tfFree(ch))) return false;
  if(!ch.sl) ch.sl={}; ch.sl[id]=nx; if(typeof pgSave==='function') pgSave(ch,'startLv',true); return true; }
