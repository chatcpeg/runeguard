/* ================= 28-shop.js · lane B · shop rules (docs/PROPOSAL-shop.md) · pure: no DOM ================= */
// Supporter pack (30 days) + rune packs. What the player owns (ENT) comes from the server later (rg_purchases, step ค.);
// until then only the #dev test switch (RG.shop.grant) fills it · never stored in the save, so a save can't grant it.
// Bought runes sit in the account wallet: ENT.runes bought − acct.ru moved to characters (ch.rb, part of tfTotal in 27).
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
function entGet(){ if(!entOk){ entOk=true; try{ entLoad(); }catch(e){} } return ENT; }
// test entitlements only on a local dev server (never on the live site, even with #dev typed in: tester r2 F2)
function shopDevHost(){ return typeof location!=='undefined'&&location.hash==='#dev'&&/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname); }
function entLoad(){ ENT={sup:0, runes:0, src:'none'};
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
