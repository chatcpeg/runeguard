/* ================= 34-items-logic.js · lane E · pure per ch/acct · bag, equip, refine, runes, drops, shop ================= */
// Bag model (§4.8): ch.inv = gear instances {u,id,r,f,s,lk} + stacks {id,n}. Worn gear stays in ch.inv (ch.eq[slot] = uid) and does
// not count toward the bag: bag used = entries that are not worn (≤ ch.bagMax). inst.f = consecutive refine failures (pity count).
// Account-wide (Q7): gold, marks and the stash live in SAVE.acct. Ids from a save or the UI are own-property checked (itemDef / itHas).
// Player actions refuse on a read-only save, call svlFresh() first (another tab saved → the character is re-found by id) and save
// at once — equip / lock / sort too: a debounced write that meets another tab's save is dropped by the reload (fix-r2). Write-ahead: refineTry / socketRune / unsocketRune / combineShards / buyItem / sellItem / stashMove have written their
// result (saveNow) before they return, so a UI animates only what is already stored (§4.9 · §9.4).
// Randomness: refine = itRefineRng (null → rngUnit, crypto) · drops and sockets = itDropRng (null → rngUnit; DEV.loot.seed sets a
// seeded one). Math.random is never used here, and classic never calls this file.
let itRefineRng=null, itDropRng=null;
const IT_RO='ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้';
const IT_PITY_N=Math.round(BAL.REFINE.pityMax/BAL.REFINE.pity);   // 5 failures in a row = the +20% cap
const IT_RUNE_SELL=80;                                             // a rune sells for less than 4 shards + the combine fee (lane E decision)
const IT_STAT_TH={might:'พลังโจมตี', hp:'HP', armor:'เกราะ', crit:'คริติคอล', critMult:'แรงคริ', speed:'ความเร็ว', area:'พื้นที่สกิล',
  cd:'คูลดาวน์', regen:'ฟื้น HP/วิ', dodge:'หลบหลีก', xp:'EXP', drop:'ดรอป', magnet:'ระยะดูดของ', boss:'ดาเมจต่อบอส', dur:'ระยะเวลาสกิล', proj:'กระสุน'};
const IT_FAM_TH={beast:'สัตว์', plant:'พืช', insect:'แมลง', spirit:'ภูต', ore:'แร่', undead:'อันเดด'};
const IT_DYE_PARTS=['body','trim','cape','hatC'];
function itRngR(){ return itRefineRng?itRefineRng():rngUnit(); }
function itRngD(){ return itDropRng?itDropRng():rngUnit(); }
function itHas(o,k){ return !!o&&typeof k==='string'&&Object.prototype.hasOwnProperty.call(o,k); }
function itR6(v){ return Math.round(v*1e6)/1e6; }
function itN(n){ if(n==null) return 1; return Number.isInteger(n)&&n>=1&&n<=1e6?n:0; }   // a count: 1 … 1e6, else 0 (= refuse)
function itFmt(n){ return Math.floor(+n||0).toLocaleString('en-US'); }
function itAcct(){ return typeof SAVE!=='undefined'&&SAVE&&SAVE.acct||null; }
function itRO(){ return typeof saveReadOnly==='function'&&saveReadOnly(); }
function itInRun(){ return typeof G!=='undefined'&&!!G&&!!G.char&&!G.over; }
// player action entry: reload when another tab saved (never mid-run), then follow the character by id (null = deleted elsewhere)
function itLive(ch){
  let re=false; if(typeof svlFresh==='function'&&!itInRun()) try{ re=svlFresh(); }catch(e){ console.error(e); }
  if(!ch||!SAVE||!Array.isArray(SAVE.chars)) return ch;
  if(!re&&(SAVE.chars.indexOf(ch)>=0||!(typeof svlWasSaved==='function'&&svlWasSaved(ch)))) return ch;   // live, or never saved (tests)
  return SAVE.chars.find(c=>c&&c.id===ch.id)||null; }                 // reloaded now, or left over from an earlier reload
const IT_FORT='ใช้ได้เฉพาะในป้อม · กลับป้อมก่อน';                     // §4.9 / §5.1: services are in the fort, never mid-run
function itOwned(ch){ return !!(SAVE&&Array.isArray(SAVE.chars)&&SAVE.chars.indexOf(ch)>=0); }
function itSave(ch,reason){ return itOwned(ch)&&typeof saveNow==='function'?!!saveNow(reason):false; }   // write now (write-ahead)
const IT_RACE='ข้อมูลถูกแก้จากอีกแท็บ · โหลดล่าสุดแล้ว ลองอีกครั้ง';
// write now → '' = done · IT_RACE = another tab's write showed up between itLive and this write (tabs in other processes see writes
// a few ms late): svlWrite reloaded instead of writing, so the action is in neither memory nor storage and must not be reported as
// done · a failed write that keeps this character (quota, sandbox, a character never in SAVE) stays '': it plays on from memory
function itCommit(ch,reason){ const own=itOwned(ch); return itSave(ch,reason)||!own||itOwned(ch)?'':IT_RACE; }

/* ---- lookups ---- */
function itemDef(id){ return itHas(ITEMS,id)?ITEMS[id]:null; }
function itGear(d){ return !!(d&&d.slot); }
function itStackCap(d){ return d&&d.stack|0||1; }
function itMaxSock(d){ return d?(d.sockRoll?d.sockRoll[1]:d.sock|0):0; }
function itEqSet(ch){ const s=new Set(), eq=ch&&ch.eq; if(eq) for(const k of IT_SLOTS) if(typeof eq[k]==='string') s.add(eq[k]); return s; }
function itFind(ch,uid){ if(!ch||typeof uid!=='string'||!Array.isArray(ch.inv)) return null; for(const x of ch.inv) if(x&&x.u===uid) return x; return null; }
function itSlotOf(ch,uid){ if(ch&&ch.eq&&typeof uid==='string') for(const k of IT_SLOTS) if(ch.eq[k]===uid) return k; return ''; }
function itEquipped(ch,slot){ return IT_SLOTS.indexOf(slot)>=0&&ch&&ch.eq?itFind(ch,ch.eq[slot]):null; }
function itBagUsed(ch){ if(!ch||!Array.isArray(ch.inv)) return 0; const eq=itEqSet(ch); let n=0; for(const x of ch.inv) if(!(x&&x.u&&eq.has(x.u))) n++; return n; }
function itBagMax(ch){ return Math.min(BAL.CAP.bag,ch&&ch.bagMax|0||BAL.PRICE.bagStart); }
function itBagFree(ch){ return Math.max(0,itBagMax(ch)-itBagUsed(ch)); }
function itStashFree(A){ return A&&Array.isArray(A.stash)?Math.max(0,Math.min(BAL.CAP.stash,A.stashMax|0)-A.stash.length):0; }

/* ---- stacks inside a list (bag or stash) ---- */
function itIsStack(x,id){ return !!x&&typeof x.u!=='string'&&x.id===id&&!x.unk; }
function itStackCount(list,id){ let n=0; for(const x of list) if(itIsStack(x,id)) n+=x.n|0; return n; }
function itStackRoom(list,id,cap,free){ let room=0; for(const x of list) if(itIsStack(x,id)) room+=Math.max(0,cap-(x.n|0)); return room+Math.max(0,free)*cap; }
function itStackPut(list,id,cap,n,free){   // fill the open stacks, then new ones while free entries remain → number added
  let left=n;
  for(const x of list){ if(!left) break; if(itIsStack(x,id)&&(x.n|0)<cap){ const k=Math.min(cap-(x.n|0),left); x.n=(x.n|0)+k; left-=k; } }
  while(left>0&&free>0){ const k=Math.min(cap,left); list.push({id, n:k}); left-=k; free--; }
  return n-left; }
function itStackTake(list,id,n){   // remove n from the last stacks first (caller checked the count) → number removed
  let left=n;
  for(let i=list.length-1;i>=0&&left>0;i--){ const x=list[i]; if(!itIsStack(x,id)) continue; const k=Math.min(x.n|0,left); x.n=(x.n|0)-k; left-=k; if(x.n<=0) list.splice(i,1); }
  return n-left; }
function itStackFrees(list,id,n){   // how many entries itStackTake(list,id,n) would empty
  let left=n, f=0; for(let i=list.length-1;i>=0&&left>0;i--){ const x=list[i]; if(!itIsStack(x,id)) continue; const k=Math.min(x.n|0,left); left-=k; if((x.n|0)-k<=0) f++; } return f; }
function itRoom(ch,id,n,extraFree){   // can the bag take n of id (all of it)?
  const d=itemDef(id); if(!d) return false; const free=itBagFree(ch)+(extraFree|0);
  return itGear(d)?free>=n:itStackRoom(ch.inv,id,itStackCap(d),free)>=n; }
function itCleanInst(x,d){   // tidies an instance in place (the caller keeps the same object) → x
  const k=Math.min(itMaxSock(d),Array.isArray(x.s)?x.s.length:0), s=[];
  for(let i=0;i<k;i++){ const v=x.s[i]; s.push(itHas(RUNES,v)?v:null); }
  if(!/^i_[a-z0-9]{1,24}$/.test(x.u)) x.u=uid('i_');
  x.r=Math.max(0,Math.min(BAL.REFINE.max,x.r|0)); x.f=itPityN(x); x.s=s; x.lk=x.lk?1:0; if(x.b) x.b=1; else delete x.b; delete x.n; return x; }
// a uid already held anywhere in this save (any character's bag or the stash), or in ch's bag → adding it again would duplicate it
function itUidTaken(ch,u){
  if(itFind(ch,u)) return true; if(!SAVE) return false; const A=SAVE.acct;
  if(A&&Array.isArray(A.stash)&&A.stash.some(x=>x&&x.u===u)) return true;
  return Array.isArray(SAVE.chars)&&SAVE.chars.some(c=>c&&c!==ch&&!!itFind(c,u)); }

/* ---- items ---- */
function makeInst(id,o){
  const d=itemDef(id); if(!itGear(d)) return null; o=o||{};
  let k=Number.isInteger(o.sockets)?o.sockets:d.sockRoll?((typeof o.rng==='function'?o.rng:itRngD)()<d.sockRoll[2]?d.sockRoll[1]:d.sockRoll[0]):d.sock|0;
  k=Math.max(0,Math.min(2,k)); const s=[]; for(let i=0;i<k;i++) s.push(null);
  return {u:uid('i_'), id, r:0, f:0, s, lk:0}; }
// 'ดาบเหล็กกล้า +7 ◆◇' (◆ = rune in · ◇ = empty socket) · a stack → its name · unknown → ''
function itemName(inst){
  const d=inst&&itemDef(inst.id); if(!d) return ''; let s=d.n;
  if(typeof inst.u==='string'){ const r=inst.r|0; if(r>0) s+=' +'+r; const ss=Array.isArray(inst.s)?inst.s:[]; if(ss.length) s+=' '+ss.map(x=>x?'◆':'◇').join(''); }
  return s; }
function itRarity(x){ const d=itemDef(x&&typeof x==='object'?x.id:x); return IT_RAR[d&&d.rar|0]||IT_RAR[0]; }

/* ---- bag ---- */
// invAdd(ch, id | inst | {id,n}, n) → {ok, overflow}: adds what fits (stacks of 99/999 first, then new entries) · ok = all of it
function invAdd(ch,idOrInst,n){
  if(!ch||!Array.isArray(ch.inv)) return {ok:false, overflow:itN(n)};
  let id=idOrInst, cnt=n;
  if(idOrInst&&typeof idOrInst==='object'){
    const d=itemDef(idOrInst.id); if(!d) return {ok:false, overflow:1};
    if(typeof idOrInst.u==='string'){                                     // one gear instance (loot, starter, reward): stored as itself
      if(!itGear(d)||itUidTaken(ch,idOrInst.u)||ch.inv.indexOf(idOrInst)>=0||itBagFree(ch)<1) return {ok:false, overflow:1};   // never twice
      ch.inv.push(itCleanInst(idOrInst,d)); return {ok:true, overflow:0}; }
    id=idOrInst.id; if(cnt==null) cnt=idOrInst.n; }
  cnt=itN(cnt); const d=itemDef(id); if(!cnt) return {ok:false, overflow:0}; if(!d) return {ok:false, overflow:cnt};
  if(itGear(d)){ let k=0; while(k<cnt&&itBagFree(ch)>0){ ch.inv.push(makeInst(id,{})); k++; } return {ok:k===cnt, overflow:cnt-k}; }
  const got=itStackPut(ch.inv,id,itStackCap(d),cnt,itBagFree(ch)); return {ok:got===cnt, overflow:cnt-got}; }
// invRemove(ch, uid | id, n) → bool: all or nothing · a worn instance is refused (unequip first) · gear by id skips worn / locked ones
function invRemove(ch,idOrUid,n){
  if(!ch||!Array.isArray(ch.inv)||typeof idOrUid!=='string') return false;
  const inst=itFind(ch,idOrUid);
  if(inst){ if((n!=null&&n!==1)||itSlotOf(ch,inst.u)) return false; ch.inv.splice(ch.inv.indexOf(inst),1); return true; }
  const d=itemDef(idOrUid), cnt=itN(n); if(!d||!cnt) return false;
  if(itGear(d)){ const eq=itEqSet(ch), list=ch.inv.filter(x=>x&&x.u&&x.id===idOrUid&&!eq.has(x.u)&&!x.lk); if(list.length<cnt) return false;
    for(let i=0;i<cnt;i++) ch.inv.splice(ch.inv.indexOf(list[i]),1); return true; }
  if(itStackCount(ch.inv,idOrUid)<cnt) return false; itStackTake(ch.inv,idOrUid,cnt); return true; }
function invCount(ch,id){ if(!ch||!Array.isArray(ch.inv)) return 0; const d=itemDef(id); if(!d) return 0;
  return itGear(d)?ch.inv.filter(x=>x&&x.u&&x.id===id).length:itStackCount(ch.inv,id); }

/* ---- equip ---- */
function canEquip(ch,inst){
  if(!ch) return 'ไม่มีตัวละคร';
  if(!inst||typeof inst!=='object'||typeof inst.u!=='string') return 'ไม่พบไอเทมนี้';
  const d=itemDef(inst.id); if(!d||inst.unk) return 'ไม่รู้จักไอเทมนี้ (อาจมาจากเกมเวอร์ชันใหม่กว่า)';
  if(!itGear(d)) return 'ไอเทมนี้สวมใส่ไม่ได้';
  if(d.cls&&d.cls.indexOf(ch.cls)<0) return 'สวมได้เฉพาะ'+d.cls.map(c=>itHas(CLS,c)?CLS[c].n:c).join(' / ');
  if((ch.lv|0)<(d.lv|0)) return 'ต้องเลเวล '+d.lv+' ขึ้นไป (ตอนนี้ '+(ch.lv|0)+')';
  return ''; }
function equip(ch,uid){
  ch=itLive(ch); if(!ch||!ch.eq) return 'ไม่พบตัวละคร'; if(itRO()) return IT_RO;
  const inst=itFind(ch,uid); if(!inst) return 'ไม่พบไอเทมนี้ในกระเป๋า';
  const why=canEquip(ch,inst); if(why) return why;
  const slot=itemDef(inst.id).slot; if(ch.eq[slot]===inst.u) return '';
  ch.eq[slot]=inst.u; return itCommit(ch,'equip'); }                   // the old piece goes back to the bag (net 0 slots)
function unequip(ch,slot){
  ch=itLive(ch); if(!ch||!ch.eq) return 'ไม่พบตัวละคร'; if(itRO()) return IT_RO;
  if(IT_SLOTS.indexOf(slot)<0) return 'ไม่มีช่องนี้';
  const u=ch.eq[slot]; if(typeof u!=='string') return 'ช่องนี้ว่างอยู่';
  if(itFind(ch,u)&&itBagFree(ch)<1) return 'กระเป๋าเต็ม · ขายหรือย้ายของเข้าคลังก่อน';
  ch.eq[slot]=null; return itCommit(ch,'unequip'); }

/* ---- bonus and look (§3.7: cd / magnet multiply, fam per family, the rest adds) ---- */
function itRound(b){ for(const k in b){ if(typeof b[k]==='number') b[k]=itR6(b[k]); else if(k==='fam'&&b.fam) for(const f in b.fam) b.fam[f]=itR6(b.fam[f]); } return b; }
function itRuneFits(runeId,d){ if(!itHas(RUNES,runeId)||!d||!d.slot) return false; const g=RUNE_GROUP[RUNES[runeId].g]; return !!g&&g.slots.indexOf(d.slot)>=0; }
// one piece: template + refine (weapon might · others armor/hp per level) + runes in its sockets
function itInstBonus(inst,d){
  d=d||itemDef(inst&&inst.id); if(!itGear(d)) return {};
  const parts=[d.st], r=Math.max(0,Math.min(BAL.REFINE.max,inst.r|0));
  if(r&&d.refine) parts.push(d.slot==='weapon'?BAL.REFINE.weapon(r):BAL.REFINE.armor(r));
  const s=Array.isArray(inst.s)?inst.s.slice(0,itMaxSock(d)):[];
  for(const rid of s) if(itRuneFits(rid,d)) parts.push(RUNES[rid].st);
  return itRound(mergeBonus(...parts)); }
function itWorn(ch){   // [[slot, inst, def]] of every piece that really counts (right slot, class, level)
  const out=[]; if(!ch||!ch.eq||!Array.isArray(ch.inv)) return out;
  for(const k of IT_SLOTS){ const inst=itFind(ch,ch.eq[k]); if(!inst) continue; const d=itemDef(inst.id); if(!d||d.slot!==k||canEquip(ch,inst)) continue; out.push([k,inst,d]); }
  return out; }
function gearBonus(ch){ return itRound(mergeBonus(...itWorn(ch).map(([,inst,d])=>itInstBonus(inst,d)))); }
// look patch merged after the class + job look (prepareRun · portrait): weapon (+7 glow 1 · +10 aura 2), hat, body, cape, pants
function gearLook(ch){
  const o={};
  for(const [k,inst,d] of itWorn(ch)){ if(d.look) Object.assign(o,d.look);
    if(k==='weapon'){ const r=inst.r|0; if(r>=10) o.glow=2; else if(r>=7) o.glow=1; } }
  const dy=ch&&ch.dye;                                                   // dyes need ch.dye from the save schema (CR lane C)
  if(dy&&typeof dy==='object'){ const c=itHas(CLS,ch.cls)?CLS[ch.cls]:null, a=c&&ch.job?c.adv.find(x=>x.id===ch.job):null, cape=o.cape||a&&a.look.cape||c&&c.look.cape;
    for(const p of IT_DYE_PARTS){ const dd=itemDef(dy[p]); if(dd&&dd.kind==='dye'&&(p!=='cape'||cape)) o[p]=dd.dye; } }
  return o; }
// display: [[label, text]] in a fixed key order · itFmtStat('cd', .97) → '−3%'
function itPct(v){ const x=Math.round(v*1000)/10; return (Number.isInteger(x)?x:x.toFixed(1))+'%'; }
function itFmtStat(k,v){ const s=v<0?'−':'+', a=Math.abs(v);
  if(k==='cd') return (v<=1?'−':'+')+itPct(Math.abs(1-v));
  if(k==='magnet') return (v>=1?'+':'−')+itPct(Math.abs(v-1));
  if(k==='critMult') return s+(+a.toFixed(2))+'×';                    // as jdBonusText (31): the stats / skills pages use the same units
  if(k==='hp'||k==='armor'||k==='proj') return s+(Math.round(a*10)/10);
  if(k==='regen') return s+(Math.round(a*100)/100);
  return s+itPct(a); }
function itStatLines(b){ const out=[]; if(!b) return out;
  for(const k in IT_STAT_TH) if(typeof b[k]==='number'&&b[k]!==(k==='cd'||k==='magnet'?1:0)) out.push([IT_STAT_TH[k],itFmtStat(k,b[k])]);
  if(b.fam) for(const f in b.fam) if(itHas(IT_FAM_TH,f)&&b.fam[f]) out.push(['ดาเมจต่อ'+IT_FAM_TH[f],itFmtStat('fam',b.fam[f])]);
  return out; }
// additive view of a bonus key (cd ×0.97 → 0.03 · magnet ×1.1 → 0.1) · itCompare → {key: new − worn} for the ▲▼ arrows
function itStatVal(k,v){ return k==='cd'?1-(v==null?1:v):k==='magnet'?(v==null?1:v)-1:(v||0); }
function itCompare(ch,inst){
  const d=itemDef(inst&&inst.id); if(!itGear(d)) return {};
  const a=itInstBonus(inst,d), w=itEquipped(ch,d.slot), b=w&&w!==inst?itInstBonus(w):{}, o={};
  for(const k in IT_STAT_TH){ const x=itR6(itStatVal(k,a[k])-itStatVal(k,b[k])); if(x) o[k]=x; }
  return o; }
function itLock(ch,uid,on){ ch=itLive(ch); if(!ch) return 'ไม่พบตัวละคร'; if(itRO()) return IT_RO;
  const inst=itFind(ch,uid); if(!inst) return 'ไม่พบไอเทมนี้ในกระเป๋า'; inst.lk=(on===undefined?!inst.lk:!!on)?1:0; return itCommit(ch,'lock'); }   // at once: a lock guards against selling
// [เรียงตามช่อง / tier]: gear (by slot or tier) → potions → materials → runes → dyes · worn pieces stay in the list
function itSortBag(ch,by){ ch=itLive(ch); if(!ch||!Array.isArray(ch.inv)) return 'ไม่พบตัวละคร'; if(itRO()) return IT_RO;
  const K={use:1, mat:2, rune:3, dye:4}, key=x=>{ const d=itemDef(x&&x.id); if(!d) return [9,0,0,'']; if(itGear(d)){ const s=IT_SLOTS.indexOf(d.slot), t=-(d.tier|0);
    return by==='tier'?[0,t,s,x.id,-(x.r|0)]:[0,s,t,x.id,-(x.r|0)]; } return [K[d.kind]||5,0,0,x.id,0]; };
  const cmp=(a,b)=>{ const p=key(a), q=key(b); for(let i=0;i<p.length;i++){ if(p[i]<q[i]) return -1; if(p[i]>q[i]) return 1; } return 0; };
  ch.inv.sort(cmp); return itCommit(ch,'sort'); }

/* ---- refine (§4.9) ---- */
function itPityN(inst){ const f=+(inst&&inst.f); return Number.isFinite(f)&&f>0?Math.min(IT_PITY_N,Math.floor(f)):0; }
// {from, to, p, base, bonus, mat, matN, fee, onFail:''|'keep'|'down', down, seal} · null = not refinable or already +10
function refineInfo(inst){
  const d=inst&&typeof inst.u==='string'?itemDef(inst.id):null; if(!itGear(d)||!d.refine||inst.unk) return null;
  const R=BAL.REFINE, from=Math.max(0,Math.min(R.max,inst.r|0)); if(from>=R.max) return null;
  const to=from+1, base=R.p[to], bonus=Math.min(R.pityMax,itR6(R.pity*itPityN(inst))), onFail=R.fail[to]||'';
  return {from, to, p:Math.min(1,itR6(base+bonus)), base, bonus, mat:R.mat(to), matN:1, fee:R.fee(d.tier|0||1,to), onFail, down:Math.max(0,from-1), seal:onFail==='down'}; }
// '' = [ตีเลย] can be pressed now (o.seal = the seal box is ticked)
function itRefineCheck(ch,uid,o){
  if(!ch) return 'ไม่มีตัวละคร'; if(itRO()) return IT_RO; if(itInRun()) return IT_FORT;
  const inst=itFind(ch,uid); if(!inst) return 'ไม่พบไอเทมนี้ในกระเป๋า';
  const d=itemDef(inst.id); if(!d||inst.unk) return 'ไม่รู้จักไอเทมนี้'; if(!d.refine) return 'ไอเทมนี้ตีบวกไม่ได้';
  const ri=refineInfo(inst); if(!ri) return 'ตีบวกถึง +'+BAL.REFINE.max+' แล้ว';
  if(invCount(ch,ri.mat)<ri.matN) return 'ต้องใช้'+itemDef(ri.mat).n+' ×'+ri.matN+' (มี '+invCount(ch,ri.mat)+')';
  const A=itAcct(); if(!A||(A.gold|0)<ri.fee) return 'ทองไม่พอ (ต้องใช้ '+itFmt(ri.fee)+')';
  if(o&&o.seal&&ri.seal&&invCount(ch,'m_seal')<1) return 'ไม่มียันต์ผนึก';
  return ''; }
// press [ตีเลย]: 1 pay material + seal + fee (every press) · 2 roll now (crypto) · 3 write the result (saveNow) · then return
// → {res:'ok'|'keep'|'down', from, to (level now), target, p, base, bonus, seal, fee, mat, f, saved} · refused → {res:'', why, from, to:from, p:0}
function refineTry(ch,uid,o){
  ch=itLive(ch); const inst=ch&&itFind(ch,uid), from=inst?Math.max(0,inst.r|0):0;
  const why=itRefineCheck(ch,uid,o); if(why) return {res:'', why, from, to:from, p:0};
  const ri=refineInfo(inst), A=itAcct(), seal=!!(o&&o.seal&&ri.seal), own=itOwned(ch);
  const undo={inv:ch.inv.slice(), n:ch.inv.map(x=>x&&x.n), gold:A.gold, r:inst.r, f:inst.f};   // put back if the write fails
  const back=()=>{ ch.inv.length=0; undo.inv.forEach((x,i)=>{ if(x&&undo.n[i]!==undefined) x.n=undo.n[i]; ch.inv.push(x); });
    A.gold=undo.gold; inst.r=undo.r; inst.f=undo.f; };
  invRemove(ch,ri.mat,ri.matN); if(seal) invRemove(ch,'m_seal',1); A.gold=(A.gold|0)-ri.fee;
  const ok=itRngR()<ri.p; let res;
  if(ok){ inst.r=ri.to; inst.f=0; res='ok'; }
  else { inst.f=Math.min(IT_PITY_N,itPityN(inst)+1);
    if(ri.onFail==='down'&&!seal){ inst.r=ri.down; res='down'; } else res='keep'; }
  const saved=itSave(ch,'refine');
  // another tab's write showed up only now (itLive's check saw none · tabs in other processes see writes a few ms late): svlWrite
  // reloaded instead of writing, so this roll is in neither memory nor storage · refused, so the UI never plays a roll that is gone
  if(!saved&&own&&!itOwned(ch)){ back(); return {res:'', why:'ข้อมูลถูกแก้จากอีกแท็บ · ยังไม่ได้ตีบวก ลองใหม่อีกครั้ง', from, to:from, p:0}; }
  // storage refused the write (quota) while it holds an older save: a result that only lives in memory could be rolled again after
  // a reload (§9.4), so the press is undone (material, seal, fee, level, pity) and refused · sandbox / a character not in SAVE are not
  // storage errors · storage that never kept anything this session (blocked, artifact: persist false) plays from memory (§6.10)
  if(!saved&&itOwned(ch)&&typeof svlState==='function'&&(()=>{ const s=svlState(); return !s.sandbox&&!s.readonly&&s.stored===false&&s.persist!==false; })()){
    back(); return {res:'', why:'บันทึกลงเครื่องไม่ได้ · ยังไม่ได้ตีบวก ลองใหม่อีกครั้ง', from, to:from, p:0}; }
  if(ok&&inst.r>=7&&typeof cloudPush==='function') try{ Promise.resolve(cloudPush('refine')).catch(()=>{}); }catch(e){}
  return {res, from, to:inst.r, target:ri.to, p:ri.p, base:ri.base, bonus:ri.bonus, seal, fee:ri.fee, mat:ri.mat, f:inst.f, saved}; }

/* ---- runes (§4.10) ---- */
function itSockets(inst){ const d=itemDef(inst&&inst.id), s=Array.isArray(inst&&inst.s)?inst.s:[], out=[];
  for(let i=0;i<Math.min(s.length,itMaxSock(d));i++) out.push(itHas(RUNES,s[i])?s[i]:null); return out; }
function itSocketCheck(ch,inst,i){
  if(!ch) return 'ไม่มีตัวละคร'; if(itRO()) return IT_RO; if(itInRun()) return IT_FORT;
  if(!inst) return 'ไม่พบไอเทมนี้ในกระเป๋า'; const d=itemDef(inst.id); if(!d||inst.unk) return 'ไม่รู้จักไอเทมนี้';
  const n=Math.min(Array.isArray(inst.s)?inst.s.length:0,itMaxSock(d)); if(!n) return 'ไอเทมนี้ไม่มีช่องรูน';
  if(!Number.isInteger(i)||i<0||i>=n) return 'ไม่มีช่องรูนนี้';
  return ''; }
function socketRune(ch,uid,runeId,i){
  ch=itLive(ch); const inst=itFind(ch,uid), why=itSocketCheck(ch,inst,i); if(why) return why;
  if(!itHas(RUNES,runeId)) return 'ไม่พบรูนนี้';
  if(inst.s[i]) return 'ช่องนี้มีรูนอยู่แล้ว · ถอดออกก่อน';
  const R=RUNES[runeId]; if(!itRuneFits(runeId,itemDef(inst.id))) return R.n+'ใส่ได้เฉพาะช่องกลุ่ม'+RUNE_GROUP[R.g].n;
  if(invCount(ch,runeId)<1) return 'ไม่มี'+R.n+'ในกระเป๋า';
  invRemove(ch,runeId,1); inst.s[i]=runeId; return itCommit(ch,'socket'); }
function itUnsocketFee(inst){ const d=itemDef(inst&&inst.id); return BAL.PRICE.unsocket(d&&d.tier|0||1); }
// take a rune out: fee 100·tier gold · the rune comes back to the bag (refused when the bag cannot take it)
function unsocketRune(ch,uid,i){
  ch=itLive(ch); const inst=itFind(ch,uid), why=itSocketCheck(ch,inst,i); if(why) return why;
  const rid=inst.s[i]; if(!rid) return 'ช่องนี้ว่างอยู่';
  if(!itHas(RUNES,rid)||!itemDef(rid)) return 'ไม่รู้จักรูนนี้ (อาจมาจากเกมเวอร์ชันใหม่กว่า)';
  const fee=itUnsocketFee(inst), A=itAcct(); if(!A||(A.gold|0)<fee) return 'ทองไม่พอ (ต้องใช้ '+itFmt(fee)+')';
  if(!itRoom(ch,rid,1)) return 'กระเป๋าเต็ม · ถอดรูนไม่ได้';
  A.gold=(A.gold|0)-fee; inst.s[i]=null; invAdd(ch,rid,1); return itCommit(ch,'unsocket'); }
function itCombineCheck(ch,shardId){
  if(!ch) return 'ไม่มีตัวละคร'; if(itRO()) return IT_RO; if(itInRun()) return IT_FORT;
  const d=itemDef(shardId); if(!d||!itHas(RUNES,d.makes)) return 'ไม่ใช่เศษรูน';
  const need=BAL.PRICE.shardsPerRune, fee=BAL.PRICE.combine, A=itAcct(), have=invCount(ch,shardId);
  if(have<need) return 'ต้องมี'+d.n+' '+need+' ชิ้น (มี '+have+')';
  if(!A||(A.gold|0)<fee) return 'ทองไม่พอ (ต้องใช้ '+itFmt(fee)+')';
  if(!itRoom(ch,d.makes,1,itStackFrees(ch.inv,shardId,need))) return 'กระเป๋าเต็ม';
  return ''; }
function combineShards(ch,shardId){   // 4 shards + 300 gold → the rune (id) · '' = refused (itCombineCheck says why)
  ch=itLive(ch); if(itCombineCheck(ch,shardId)) return '';
  const rid=ITEMS[shardId].makes, A=itAcct();
  itStackTake(ch.inv,shardId,BAL.PRICE.shardsPerRune); A.gold=(A.gold|0)-BAL.PRICE.combine; invAdd(ch,rid,1);
  return itCommit(ch,'combine')?'':rid; }

/* ---- drops (§4.12) ---- */
function itTable(t){
  if(Array.isArray(t)) return t; if(typeof t!=='string'||!t) return null;
  let o=DROPS; for(const k of t.split('.')){ if(!itHas(o,k)) return null; o=o[k]; } return Array.isArray(o)?o:null; }
function itRollN(n,rng){ if(Array.isArray(n)){ const a=n[0]|0, b=Math.max(a,n[1]|0); return a+Math.min(b-a,Math.floor(rng()*(b-a+1))); } return Number.isInteger(n)&&n>0?n:1; }
function itRunT(){ return typeof G!=='undefined'&&G&&Number.isInteger(G.tier)?G.tier:0; }
function itGearTier(g,o){ let t=g;
  if(g==='T'||g==='T+1'){ const T=o&&Number.isInteger(o.T)?o.T:itRunT(); t=BAL.SURV.gearTier(Math.max(0,Math.min(BAL.SURV.maxT,T)))+(g==='T+1'?1:0); }
  t=Math.floor(+t||1); return Math.max(1,Math.min(IT_MAXT,t)); }
// rollDrops(table | 'surv.elite', luckMul, {T, rng}) → [{id,n} | inst] · luckMul (1 + P.drop) scales every chance (≤ 1)
function rollDrops(table,luckMul,o){
  const t=itTable(table); if(!t) return [];
  o=o||{}; const rng=typeof o.rng==='function'?o.rng:itRngD, L=+luckMul, luck=Number.isFinite(L)&&L>0?Math.min(10,L):1;
  const out=[], stacks=new Map();
  const give=id=>{ const d=itemDef(id); if(!d) return;
    if(itGear(d)){ const x=makeInst(id,{rng}); if(x) out.push(x); return; }
    const s=stacks.get(id); if(s) s.n++; else { const x={id, n:1}; stacks.set(id,x); out.push(x); } };
  const one=a=>a[Math.min(a.length-1,Math.floor(rng()*a.length))];
  for(const e of t){ if(!e||typeof e!=='object') continue;
    const p=e.p==null?1:+e.p; if(!(p>0)) continue; const pe=e.noLuck?Math.min(1,p):Math.min(1,p*luck);
    if(pe<1&&rng()>=pe) continue;
    const n=itRollN(e.n,rng);
    for(let k=0;k<n;k++){
      if(typeof e.id==='string') give(e.id);
      else if(Array.isArray(e.pick)&&e.pick.length) give(one(e.pick));
      else if(typeof e.shard==='string'&&itHas(DROPS.shardSets,e.shard)) give(one(DROPS.shardSets[e.shard]));
      else if(e.gear!=null){ const pool=IT_POOL[itGearTier(e.gear,o)]; if(pool&&pool.length) give(one(pool)); } } }
  return out; }
// §4.12 field mob table (lane F, M4): dust 3% · crystal (zone ≥ 2: 0.3%, ≥ 4: 0.6%) · own shard 1% · zone gear 0.6% · small potion 2%
function itFieldTable(mobId,zoneN,gearIds){ const F=BAL.DROP.field, t=[{id:'m_dust', p:F.dust}, {id:'u_potion_s', p:F.potion}];
  const cr=zoneN>=4?F.crystal4:zoneN>=2?F.crystal2:0; if(cr) t.push({id:'m_crystal', p:cr});
  if(itemDef('m_shard_'+mobId)) t.push({id:'m_shard_'+mobId, p:F.shard});
  if(Array.isArray(gearIds)&&gearIds.length) t.push({pick:gearIds.filter(id=>itGear(itemDef(id))), p:F.gear});
  return t; }

/* ---- shop, stash, consumables (§4.6 · §4.8 · §4.11) ---- */
// buy price of one (0 = not sold for that currency) · cur 'gold' (ร้านป้านวล) | 'marks' (ร้านตราผู้พิชิต)
function itBuyPrice(id,cur){
  const d=itemDef(id); if(!d) return 0; cur=cur==='marks'?'marks':'gold'; if(SHOP[cur].indexOf(id)<0) return 0;
  const P=BAL.PRICE; if(itGear(d)) return cur==='gold'?P.gear(d.tier|0||1,d.rar|0,0)*SHOP.buyMul:0;
  const k=d.kind==='dye'?'u_dye':id, e=itHas(P,k)?P[k]:null; return e?(cur==='gold'?e.buy:e.marks)|0:0; }
// sell price of one (inst | {id} | id) · 0 = cannot be sold
function itSellPrice(x){
  const id=typeof x==='string'?x:x&&x.id, d=itemDef(id); if(!d||d.noSell||(x&&typeof x==='object'&&x.b)) return 0; const P=BAL.PRICE;   // b = bound starter weapon
  if(itGear(d)) return P.gear(d.tier|0||1,d.rar|0,x&&typeof x==='object'?Math.max(0,Math.min(BAL.REFINE.max,x.r|0)):0);
  if(d.kind==='rune') return IT_RUNE_SELL;
  const k=d.makes?'m_shard':d.kind==='dye'?'u_dye':id, e=itHas(P,k)?P[k]:null; return e&&e.sell|0||0; }
function buyItem(ch,id,n,o){
  ch=itLive(ch); if(!ch||!Array.isArray(ch.inv)) return 'ไม่พบตัวละคร'; if(itRO()) return IT_RO; if(itInRun()) return IT_FORT;
  const cur=o&&o.cur==='marks'?'marks':'gold', d=itemDef(id); if(!d) return 'ไม่พบสินค้านี้';
  const price=itBuyPrice(id,cur); if(!price) return cur==='gold'?'ร้านนี้ไม่ได้ขายของชิ้นนี้':'ร้านนี้ไม่ได้ขายของชิ้นนี้ด้วยตรา';
  const cnt=n==null?1:itN(n); if(!cnt||cnt>999) return 'จำนวนไม่ถูกต้อง';
  const A=itAcct(); if(!A) return 'ไม่มีข้อมูลบัญชี';
  const cost=price*cnt; if((A[cur]|0)<cost) return (cur==='gold'?'ทองไม่พอ':'ตราผู้พิชิตไม่พอ')+' (ต้องใช้ '+itFmt(cost)+')';
  if(!itRoom(ch,id,cnt)) return 'กระเป๋าเต็ม';
  A[cur]=(A[cur]|0)-cost; const r=invAdd(ch,id,cnt);
  if(r.overflow) A[cur]+=r.overflow*price;                               // never charged for what did not fit
  return itCommit(ch,'buy'); }
function itSellCheck(ch,idOrUid,n){
  if(!ch||!Array.isArray(ch.inv)) return 'ไม่พบตัวละคร'; if(itRO()) return IT_RO; if(itInRun()) return IT_FORT; if(!itAcct()) return 'ไม่มีข้อมูลบัญชี';
  const inst=itFind(ch,idOrUid);
  if(inst){ if(inst.unk||!itemDef(inst.id)) return 'ไม่รู้จักไอเทมนี้'; if(itSlotOf(ch,inst.u)) return 'ถอดออกก่อนจึงขายได้';
    if(inst.lk) return 'ไอเทมนี้ล็อกไว้'; if(inst.b) return 'ของติดตัวเริ่มต้น ขายไม่ได้'; if(itemDef(inst.id).noSell) return 'ไอเทมนี้ขายไม่ได้';
    if(Array.isArray(inst.s)&&inst.s.some(x=>x)) return 'ถอดรูนออกก่อนจึงขายได้'; return itSellPrice(inst)>0?'':'ไอเทมนี้ขายไม่ได้'; }
  const d=itemDef(idOrUid); if(!d||itGear(d)) return 'ไม่พบไอเทมนี้ในกระเป๋า';
  if(!itSellPrice(idOrUid)) return 'ไอเทมนี้ขายไม่ได้';
  const cnt=itN(n); if(!cnt) return 'จำนวนไม่ถูกต้อง'; if(itStackCount(ch.inv,idOrUid)<cnt) return 'มีไม่พอขาย';
  return ''; }
function sellItem(ch,idOrUid,n){   // → gold received (0 = refused · itSellCheck says why)
  ch=itLive(ch); if(itSellCheck(ch,idOrUid,n)) return 0;
  const A=itAcct(), inst=itFind(ch,idOrUid); let g;
  if(inst){ g=itSellPrice(inst); ch.inv.splice(ch.inv.indexOf(inst),1); }
  else { const c=itN(n); g=itSellPrice(idOrUid)*c; itStackTake(ch.inv,idOrUid,c); }
  A.gold=Math.min(BAL.CAP.gold,(A.gold|0)+g); return itCommit(ch,'sell')?0:g; }
function sellAllCommon(ch){   // [ขายของธรรมดาทั้งหมด]: common gear not worn, not locked, no runes → gold received
  ch=itLive(ch); if(!ch||!Array.isArray(ch.inv)||itRO()||itInRun()) return 0; const A=itAcct(); if(!A) return 0;
  let g=0; const eq=itEqSet(ch);
  for(let i=ch.inv.length-1;i>=0;i--){ const x=ch.inv[i], d=x&&typeof x.u==='string'&&!x.unk?itemDef(x.id):null;
    if(!d||(d.rar|0)||d.noSell||x.lk||eq.has(x.u)||(Array.isArray(x.s)&&x.s.some(v=>v))) continue;
    const p=itSellPrice(x); if(p<=0) continue; g+=p; ch.inv.splice(i,1); }
  if(g){ A.gold=Math.min(BAL.CAP.gold,(A.gold|0)+g); if(itCommit(ch,'sellAll')) return 0; } return g; }
// bag ⇄ stash (acct.stash, shared): an instance moves as itself (never copied) · a stack moves n (default all) · all or nothing
function stashMove(ch,idOrUid,toStash,n){
  ch=itLive(ch); if(!ch||!Array.isArray(ch.inv)) return 'ไม่พบตัวละคร'; if(itRO()) return IT_RO; if(itInRun()) return IT_FORT;
  const A=itAcct(); if(!A||!Array.isArray(A.stash)) return 'คลังยังไม่พร้อม'; if(typeof idOrUid!=='string') return 'ไม่พบไอเทมนี้';
  const from=toStash?ch.inv:A.stash, to=toStash?A.stash:ch.inv, freeTo=toStash?itStashFree(A):itBagFree(ch), full=toStash?'คลังเต็ม':'กระเป๋าเต็ม';
  const inst=from.find(x=>x&&x.u===idOrUid);
  if(inst){ if(toStash&&itSlotOf(ch,inst.u)) return 'ถอดออกก่อนจึงย้ายเข้าคลังได้';
    if(to.some(x=>x&&x.u===inst.u)) return 'ไอเทมนี้อยู่ปลายทางแล้ว'; if(freeTo<1) return full;
    from.splice(from.indexOf(inst),1); to.push(inst); return itCommit(ch,'stash'); }
  const d=itemDef(idOrUid); if(!d||itGear(d)) return 'ไม่พบไอเทมนี้';
  const have=itStackCount(from,idOrUid); if(!have) return 'ไม่พบไอเทมนี้';
  const cnt=n==null?have:itN(n); if(!cnt||cnt>have) return 'จำนวนไม่ถูกต้อง';
  const cap=itStackCap(d); if(itStackRoom(to,idOrUid,cap,freeTo)<cnt) return full;
  itStackTake(from,idOrUid,cnt); itStackPut(to,idOrUid,cap,cnt,freeTo); return itCommit(ch,'stash'); }
// bag +10 for gold (2k / 6k / 15k / 40k · §4.8) · stash +20 for 80 marks (§2.4)
function itBagPrice(ch){ const P=BAL.PRICE, k=Math.floor(((ch&&ch.bagMax|0)-P.bagStart)/P.bagStep); return ch&&ch.bagMax<BAL.CAP.bag&&k>=0&&k<P.bag.length?P.bag[k]:0; }
function itBuyBag(ch){ ch=itLive(ch); if(!ch) return 'ไม่พบตัวละคร'; if(itRO()) return IT_RO; if(itInRun()) return IT_FORT;
  const price=itBagPrice(ch), A=itAcct(); if(!price) return 'กระเป๋าขยายเต็มแล้ว'; if(!A||(A.gold|0)<price) return 'ทองไม่พอ (ต้องใช้ '+itFmt(price)+')';
  A.gold-=price; ch.bagMax=Math.min(BAL.CAP.bag,ch.bagMax+BAL.PRICE.bagStep); return itCommit(ch,'bag'); }
function itBuyStash(ch){ ch=itLive(ch); if(itRO()) return IT_RO; if(itInRun()) return IT_FORT; const A=itAcct(), S=BAL.PRICE.stash; if(!A) return 'ไม่มีข้อมูลบัญชี';
  if((A.stashMax|0)>=BAL.CAP.stash) return 'คลังขยายเต็มแล้ว'; if((A.marks|0)<S.marks) return 'ตราผู้พิชิตไม่พอ (ต้องใช้ '+S.marks+')';
  A.marks-=S.marks; A.stashMax=Math.min(BAL.CAP.stash,(A.stashMax|0)+S.step);
  if(ch&&itOwned(ch)) return itCommit(ch,'stashMax');
  const S0=SAVE; if(SAVE&&typeof saveNow==='function') saveNow('stashMax'); return SAVE===S0?'':IT_RACE; }
// '' = usable now · potions only in a character run (35-loot-runtime.js ltPotion) · dyes need ch.dye (schema CR) and o.part
function itCanUse(ch,id,o){
  const d=itemDef(id); if(!ch||!d||itGear(d)) return 'ไม่พบไอเทมนี้'; if(invCount(ch,id)<1) return 'ไม่มี'+d.n+'ในกระเป๋า';
  if(d.use&&d.use.heal) return itInRun()?'':'ใช้ได้ระหว่างอยู่ในสนาม';
  if(itRO()) return IT_RO;
  if(d.use&&d.use.bag) return itInRun()?IT_FORT:(ch.bagMax|0)>=BAL.CAP.bag?'กระเป๋าขยายเต็มแล้ว ('+BAL.CAP.bag+' ช่อง)':'';
  if(d.kind==='dye'){ if(!ch.dye||typeof ch.dye!=='object') return 'ระบบย้อมสียังไม่เปิด'; return o&&IT_DYE_PARTS.indexOf(o.part)>=0?'':'เลือกส่วนที่จะย้อมก่อน'; }
  if(id==='u_forget') return 'ใช้ที่หน้าสถานะหรือหน้าสกิล (ปุ่มรีเซ็ต)';
  return 'ไอเทมนี้ใช้โดยตรงไม่ได้'; }
function useConsumable(ch,id,o){
  const d=itemDef(id); if(!ch||!d||itGear(d)) return false;
  if(d.use&&d.use.heal) return typeof ltPotion==='function'&&ltPotion(ch,id,d.use.heal);
  ch=itLive(ch); if(!ch||itCanUse(ch,id,o)) return false;
  if(d.use&&d.use.bag){ invRemove(ch,id,1); ch.bagMax=Math.min(BAL.CAP.bag,(ch.bagMax|0)+d.use.bag); return !itCommit(ch,'use'); }
  if(d.kind==='dye'){ invRemove(ch,id,1); ch.dye[o.part]=id; return !itCommit(ch,'dye'); }
  return false; }

// dev hooks (§7.9 · window.RG only with #dev): RG.refine.dist(tier, target, n) · RG.items.* = this file's API on the active character
DEV.refine={ dist(tier,target,n){ tier=Math.max(1,Math.min(5,tier|0||1)); target=Math.max(1,Math.min(BAL.REFINE.max,target|0||1)); n=Math.max(1,Math.min(1e7,n|0||1e5));
  const inst={u:'i_dev', id:'w_sword_1', r:target-1, f:0, s:[], lk:0}, ri=refineInfo(inst); let ok=0;
  for(let i=0;i<n;i++) if(itRngR()<ri.p) ok++;
  return {tier, target, n, p:ri.p, measured:ok/n, diff:Math.round((ok/n-ri.p)*1e5)/1e5, fee:BAL.REFINE.fee(tier,target), mat:ri.mat, onFail:ri.onFail}; }};
DEV.items={
  ch(){ return typeof curChar==='function'?curChar():null; }, def:itemDef, name:itemName, bag(){ const c=this.ch(); return c?c.inv:null; },
  equip(uid){ return equip(this.ch(),uid); }, unequip(slot){ return unequip(this.ch(),slot); },
  refine(uid,seal){ return refineTry(this.ch(),uid,{seal:!!seal}); }, info(uid){ return refineInfo(itFind(this.ch(),uid)); },
  socket(uid,rune,i){ return socketRune(this.ch(),uid,rune,i|0); }, unsocket(uid,i){ return unsocketRune(this.ch(),uid,i|0); },
  combine(shard){ return combineShards(this.ch(),shard); }, buy(id,n,cur){ return buyItem(this.ch(),id,n,{cur}); },
  sell(x,n){ return sellItem(this.ch(),x,n); }, stash(x,to,n){ return stashMove(this.ch(),x,to!==false,n); },
  bonus(){ return gearBonus(this.ch()); }, look(){ return gearLook(this.ch()); } };
