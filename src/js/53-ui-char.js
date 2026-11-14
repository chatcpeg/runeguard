/* ================= 53-ui-char.js · lane E · equipment / bag tabs, item / refine / rune / shop / stash sheets ================= */
// DESIGN §8.8 · §4.8–4.11 · §5.1. Rules and saving live in 34-items-logic.js (write-ahead: refineTry has stored its result before it
// returns); this file only draws and calls it. Item / player text reaches the DOM through textContent only (never as HTML).
// Redraw: the character window through openCharWindow(tab) (lane B · §7.8) · a sheet rebuilds its own box in place, so a tap never
// reopens the sheet. The fort services (smith, rune scribe, shop, stash) are SERVICES entries; mid-run the logic refuses (IT_FORT).
// Load time: registrations only (§7.4). New top-level names use the prefix uc / UC.
const UC={tab:'', root:null, filter:'all', sellN:1, ref:null, rs:null, shop:null, st:null};
const UC_FILT=[['all','ทั้งหมด'],['weapon','อาวุธ'],['gear','ชุด'],['use','ใช้'],['mat','วัสดุ'],['rune','รูน']];
const UC_KIND={use:'ของใช้', mat:'วัสดุ', rune:'รูน', dye:'สีย้อม'};
const UC_HOLD=1000;                                    // §8.0: refine to +8 or higher = press and hold 1 s
const UC_ANIM=600;                                     // §4.9: 0.6 s bar, played after the result is saved
const UC_DYE_TH={body:'เสื้อ', trim:'ขอบเสื้อ', cape:'ผ้าคลุม', hatC:'หมวก'};

CHARTABS.equip={n:'อุปกรณ์', order:10, render(root,ch){ ucEquipTab(root,ch); }};
CHARTABS.bag={n:'กระเป๋า', order:20, render(root,ch){ ucBagTab(root,ch); }};
SERVICES.push(
  {id:'smith', npc:'ลุงบัณฑ์', n:'ลุงบัณฑ์ · ช่างตีเหล็ก', i:'⚒️', order:20, open(){ ucSvc(()=>openRefine()); }},
  {id:'scribe', npc:'แม่หมอศิลา', n:'แม่หมอศิลา · ผู้จารึกรูน', i:'🔮', order:30, open(){ ucSvc(()=>openRuneScribe()); }},
  {id:'shop', npc:'ป้านวล', n:'ร้านป้านวล', i:'🧺', order:40, open(){ ucSvc(()=>openShop()); }},
  {id:'stash', npc:'ผู้เฝ้าคลัง', n:'ผู้เฝ้าคลัง · คลังเก็บของ', i:'📦', order:50, open(){ ucSvc(()=>openStash()); }});

/* ---------- small helpers ---------- */
function ucMk(tag,cls,text){ const n=document.createElement(tag); if(cls) n.className=cls; if(text!=null) n.textContent=String(text); return n; }
function ucBtn(text,cls,fn,dis){ const b=ucMk('button',cls||'uc-b',text); b.type='button'; if(dis) b.disabled=true;
  if(fn) b.addEventListener('click',e=>{ if(!b.disabled) fn(e); }); return b; }
function ucN(n){ return Math.floor(+n||0).toLocaleString('en-US'); }
function ucPc(v){ return Math.round((+v||0)*100)+'%'; }
function ucCh(){ try{ return curChar(); }catch(e){ return null; } }
function ucAcct(){ return SAVE&&SAVE.acct||null; }
function ucRun(){ return typeof G!=='undefined'&&!!G&&!!G.char&&!G.over; }
function ucRO(){ try{ return saveReadOnly(); }catch(e){ return false; } }
function ucSvc(f){ if(!ucCh()){ toast('สร้างตัวละครก่อน','info'); UI.go('scrNew'); return; } f(); }
function ucSnd(k){ try{ initAudio(); if(!AU.ctx||!AU.on) return;
  if(k==='hit'){ noise(.07,.22,4200); tone(1250,.09,'square',.05,880); }
  else if(k==='ok'){ tone(660,.14,'triangle',.09); tone(990,.22,'triangle',.08,0,.1); tone(1320,.32,'sine',.06,0,.2); }
  else if(k==='fail'){ noise(.26,.2,1600); tone(196,.34,'sawtooth',.05,98); } }catch(e){} }
function ucBuzz(){ try{ if(loadSettings().haptics&&navigator.vibrate) navigator.vibrate(30); }catch(e){} }
// the character window shows one of this file's tabs right now → draw it again (header portrait / numbers follow)
function ucAfter(){ const r=UC.root, b=r&&r.firstElementChild;
  if(b&&b.dataset.uc===UC.tab&&curScreen()==='scrChar') openCharWindow(UC.tab); }
function ucDef(x){ return itemDef(typeof x==='string'?x:x&&x.id); }
function ucIsInst(x){ return !!x&&typeof x==='object'&&typeof x.u==='string'; }
function ucName(x){ if(ucIsInst(x)) return x.unk?'ไอเทมที่ไม่รู้จัก':itemName(x)||'ไอเทมที่ไม่รู้จัก'; const d=ucDef(x); return d?d.n:'ไอเทมที่ไม่รู้จัก'; }
function ucColor(d){ return d&&d.slot?IT_RAR[d.rar|0].c:''; }
function ucNameEl(tag,x,extra){ const d=ucIsInst(x)&&x.unk?null:ucDef(x), e=ucMk(tag,'uc-nm',ucName(x)+(extra||'')); const c=ucColor(d); if(c) e.style.color=c; return e; }
function ucClsTh(ids){ return ids.map(c=>itHas(CLS,c)?CLS[c].n:c).join(' / '); }
function ucReq(d){ return 'Lv '+(d.lv|0)+(d.cls?' · '+ucClsTh(d.cls):''); }
function ucStatText(b){ return itStatLines(b).map(([k,v])=>k+' '+v).join(' · '); }
function ucDiff(k,a){ if(k==='critMult') return (+a.toFixed(2))+'×'; if(k==='hp'||k==='armor'||k==='proj') return String(Math.round(a*10)/10);
  if(k==='regen') return String(Math.round(a*100)/100); return itPct(a); }
function ucCmpText(ch,inst){ if(!inst||itSlotOf(ch,inst.u)) return ''; const c=itCompare(ch,inst), o=[]; for(const k in c) o.push((c[k]>0?'▲':'▼')+IT_STAT_TH[k]+' '+ucDiff(k,Math.abs(c[k]))); return o.slice(0,3).join(' '); }
function ucLook(ch){ const c=itHas(CLS,ch.cls)?CLS[ch.cls]:CLASSES[0], a=ch.job?c.adv.find(x=>x.id===ch.job):null;
  return Object.assign({},c.look,a?a.look:null,gearLook(ch)); }
function ucPortrait(ch,sz){ const c=document.createElement('canvas'); c.className='uc-pt'; c.style.width=c.style.height=sz+'px'; c.setAttribute('aria-hidden','true');
  try{ portrait(c,ucLook(ch),sz); }catch(e){} return c; }
// bag filter group of an item: weapon · gear (other slots) · use (potions, scrolls, bags, dyes) · mat (dust, crystals, seals, shards) · rune
function ucCat(d){ if(!d) return 'mat'; if(d.slot) return d.slot==='weapon'?'weapon':'gear'; if(d.kind==='rune') return 'rune'; if(d.kind==='mat') return 'mat'; return 'use'; }
// a bag / stash list as rows: gear one by one (worn pieces skipped when eq is given), stacks of the same id summed, unknown ids apart
function ucGroup(list,eq){ const out=[], seen=new Map(); if(!Array.isArray(list)) return out;
  for(const x of list){ if(!x||typeof x!=='object') continue;
    if(typeof x.u==='string'){ if(eq&&eq.has(x.u)) continue; out.push({k:x.u, inst:x, id:x.id, n:1, unk:!!x.unk||!itemDef(x.id)}); continue; }
    if(x.unk||!itemDef(x.id)){ out.push({k:'', inst:null, id:x.id, n:x.n|0, unk:true}); continue; }
    const g=seen.get(x.id); if(g){ g.n+=x.n|0; continue; } const e={k:x.id, inst:null, id:x.id, n:x.n|0, unk:false}; seen.set(x.id,e); out.push(e); }
  return out; }
// what [ขายของธรรมดาทั้งหมด] would sell (the same filter as sellAllCommon in 34) → {n, g, ref}
function ucCommon(ch){ const o={n:0, g:0, ref:0}; if(!ch||!Array.isArray(ch.inv)) return o; const eq=itEqSet(ch);
  for(const x of ch.inv){ const d=x&&typeof x.u==='string'&&!x.unk?itemDef(x.id):null;
    if(!d||(d.rar|0)||d.noSell||x.lk||eq.has(x.u)||(Array.isArray(x.s)&&x.s.some(v=>v))) continue;
    const p=itSellPrice(x); if(p>0){ o.n++; o.g+=p; if((x.r|0)>0) o.ref++; } }
  return o; }
// gold shop rows for a category (use · weapon · armor · acc) · gear other classes cannot wear is hidden unless all
function ucShopList(ch,cat,all){ const out=[];
  for(const id of SHOP.gold){ const d=itemDef(id); if(!d) continue;
    const c=!d.slot?'use':d.slot==='weapon'?'weapon':d.slot==='neck'||d.slot==='ring'?'acc':'armor'; if(c!==cat) continue;
    if(d.slot&&!all&&ch&&d.cls&&d.cls.indexOf(ch.cls)<0) continue;
    out.push({id, d, price:itBuyPrice(id,'gold'), sell:itSellPrice(id)}); }
  return out; }
// §4.9 failure line of a refine
function ucFailText(ri){ if(!ri) return ''; if(!ri.onFail) return 'โอกาส 100% · ไม่มีทางล้มเหลว';
  return ri.onFail==='keep'?'ล้มเหลว: คงระดับ +'+ri.from:'ล้มเหลว: ลดเหลือ +'+ri.down+' (ของไม่พังและไม่หาย)'; }
function ucRefGain(d,from,to){ const f=d.slot==='weapon'?BAL.REFINE.weapon:BAL.REFINE.armor, a=from>0?f(from):{}, b=f(to);
  return Object.keys(b).map(k=>IT_STAT_TH[k]+' '+itFmtStat(k,a[k]||0)+' → '+itFmtStat(k,b[k])).join(' · '); }
function ucSeg(items,cur,fn,label){ const s=ucMk('div','uc-seg'); s.setAttribute('role','group'); if(label) s.setAttribute('aria-label',label);
  for(const [v,t] of items){ const b=ucBtn(t,'',()=>fn(v)); b.setAttribute('aria-pressed',String(v===cur)); s.append(b); } return s; }
function ucWallet(ch){ const A=ucAcct(), w=ucMk('p','uc-wal'); w.append(ucMk('span','','💰 '+ucN(A&&A.gold)+' ทอง'));
  if(A&&(A.marks|0)>0) w.append(ucMk('span','','🏅 '+ucN(A.marks)+' ตรา'));
  if(ch) w.append(ucMk('span','','🎒 '+itBagUsed(ch)+'/'+itBagMax(ch))); return w; }
function ucNote(box){ if(ucRO()) box.append(ucMk('p','uc-warn',IT_RO)); else if(ucRun()) box.append(ucMk('p','uc-warn','อยู่ระหว่างรอบ · ตีบวก รูน ร้าน และคลังใช้ได้เฉพาะในป้อม')); }
// one list row: [icon · name · sub] (a button when on) + buttons on the right
function ucRow(x,o){ o=o||{}; const d=ucIsInst(x)&&x.unk?null:ucDef(x), row=ucMk('div','uc-row'+(o.cls?' '+o.cls:''));
  const main=o.on?ucBtn('','uc-rm',o.on):ucMk('div','uc-rm'), t=ucMk('span','uc-rt');
  t.append(ucNameEl('b',x,o.n>1?' ×'+ucN(o.n):'')); if(o.sub) t.append(ucMk('small','',o.sub));
  if(o.cmp) t.append(ucMk('small','uc-cmp',o.cmp)); if(o.warn) t.append(ucMk('small','uc-bad',o.warn));
  main.append(ucMk('span','uc-ic',d?d.i:'❔'),t); row.append(main); for(const r of o.right||[]) row.append(r); return row; }
function ucInfoBtn(k){ const b=ucBtn('ⓘ','uc-b uc-sq',()=>openItemSheet(k)); b.setAttribute('aria-label','ดูรายละเอียด'); return b; }

/* ---------- tab: equipment (§8.8 · list of the 10 slots, not a ring around the hero) ---------- */
function ucEquipTab(root,ch){
  UC.tab='equip'; UC.root=root; root.textContent=''; if(!ch) return;
  const box=ucMk('div','uc'); box.dataset.uc='equip'; ucNote(box);
  const top=ucMk('div','uc-top'), sum=ucMk('div','uc-sum'), lines=itStatLines(gearBonus(ch));
  sum.append(ucMk('b','','ค่าจากอุปกรณ์'),ucMk('span','',lines.length?lines.map(([k,v])=>k+' '+v).join(' · '):'ยังไม่ได้สวมอะไรที่มีค่าเสริม'),ucElLine(ch));
  top.append(ucPortrait(ch,96),sum); box.append(top);
  const list=ucMk('div','uc-slots');
  for(const s of IT_SLOTS){ const inst=itEquipped(ch,s), b=ucBtn('','uc-slot'), t=ucMk('span','uc-st2'); b.dataset.s=s;
    t.append(inst?ucNameEl('b',inst):ucMk('b','uc-nm uc-empty','–'));
    const why=inst?canEquip(ch,inst):''; if(why) t.append(ucMk('small','uc-bad','ไม่มีผล: '+why));
    b.append(ucMk('span','uc-ic',IT_SLOT_I[s]),ucMk('span','uc-sl',IT_SLOT_TH[s]),t,ucMk('span','uc-go','›'));
    b.setAttribute('aria-label',IT_SLOT_TH[s]+': '+(inst?ucName(inst):'ว่าง')); list.append(b); }
  list.addEventListener('click',e=>{ const b=e.target.closest('[data-s]'); if(b) ucSlotTap(b.dataset.s); });
  box.append(list,ucMk('p','uc-hint','แตะช่องเพื่อดู ถอด หรือเปลี่ยนของ · ของในกระเป๋าดูที่แท็บกระเป๋า')); root.append(box); }
// ธาตุเกราะ (34 gearElement · 29 elArmorVs) + ? → the help page (65 TF_HELP.armorEl)
function ucElLine(ch){ const w=ucMk('span','uc-el'), g=gearElement(ch), E=g.el&&EL[g.el];
  let t; if(E){ const v=elArmorVs(g.el); t='🛡 ธาตุเกราะ '+E.i+' '+E.n+' · ต้าน '+v.res.concat(v.same).map(k=>EL[k].i).join('')+' · แพ้ '+(v.weak.map(k=>EL[k].i).join('')||'-'); }
  else if(g.cyc) t='🛡 ธาตุเกราะสลับทุก '+EL_CYC_T+' วิ (มงกุฎวุ้นหกสี) '+EL_CYC.map(k=>EL[k].i).join('');
  else t='🛡 ธาตุเกราะ: ไม่มี (×1 ทุกธาตุ) · ฝังรูนธาตุที่เสื้อเกราะ';
  const q=ucBtn('?','uc-b uc-sq',()=>{ if(typeof tfHelp==='function') tfHelp('armorEl'); }); q.setAttribute('aria-label','ธาตุเกราะคืออะไร');
  w.append(ucMk('span','',t),q); return w; }
function ucSlotTap(s){ const ch=ucCh(); if(!ch) return; const inst=itEquipped(ch,s); if(inst) openItemSheet(inst.u); else ucPickSlot(s); }
// choose a piece from the bag for one slot: tap = wear · ⓘ = details
function ucPickSlot(s){ const ch=ucCh(); if(!ch||IT_SLOTS.indexOf(s)<0) return;
  const box=ucMk('div','uc'); ucPickFill(box,s); sheet(box,{title:'เลือก'+IT_SLOT_TH[s]}); }
function ucPickFill(box,s){ box.textContent=''; const ch=ucCh(); if(!ch) return; const eq=itEqSet(ch), cur=itEquipped(ch,s);
  const list=ch.inv.filter(x=>ucIsInst(x)&&!x.unk&&!eq.has(x.u)&&ucDef(x)&&ucDef(x).slot===s)
    .map(x=>({x, d:ucDef(x), why:canEquip(ch,x)})).sort((a,b)=>(!!a.why-!!b.why)||(b.d.tier-a.d.tier)||((b.x.r|0)-(a.x.r|0)));
  if(cur) box.append(ucMk('p','uc-hint','สวมอยู่: '+ucName(cur)));
  if(!list.length){ box.append(ucMk('p','uc-hint','ยังไม่มี'+IT_SLOT_TH[s]+'ในกระเป๋า · หาได้จากโหมดเอาชีวิตรอด หรือซื้อที่ร้านป้านวล'));
    if(!ucRun()) box.append(ucBtn('🧺 ไปร้านป้านวล','uc-b sh-wide',()=>openShop())); return; }
  for(const {x,d,why} of list) box.append(ucRow(x,{sub:ucReq(d)+' · '+(ucStatText(itInstBonus(x,d))||'ไม่มีค่าเสริม'), warn:why, cmp:cur&&!why?ucCmpText(ch,x):'',
    on:why||ucRO()?null:()=>ucDoEquip(x.u), right:[ucInfoBtn(x.u)]})); }
function ucDoEquip(uid){ const ch=ucCh(), inst=itFind(ch,uid); const r=equip(ch,uid);
  if(r){ toast(r,'bad'); return; } closeSheet(); toast('สวม '+ucName(inst)+' แล้ว','good'); ucAfter(); }
function ucDoUnequip(slot){ const ch=ucCh(), inst=itEquipped(ch,slot), r=unequip(ch,slot);
  if(r){ toast(r,'bad'); return; } closeSheet(); toast('ถอด '+ucName(inst)+' แล้ว','info'); ucAfter(); }

/* ---------- tab: bag (§8.8 · 5-column grid, filters, sort, sell all common) ---------- */
function ucBagTab(root,ch){
  UC.tab='bag'; UC.root=root; root.textContent=''; if(!ch) return;
  const box=ucMk('div','uc'); box.dataset.uc='bag'; ucNote(box);
  box.append(ucSeg(UC_FILT,UC.filter,v=>{ UC.filter=v; ucAfter(); },'กรองกระเป๋า'));
  const eq=itEqSet(ch), grid=ucMk('div','uc-grid'), frag=document.createDocumentFragment(); let n=0;
  for(const x of ch.inv){ if(!x||typeof x!=='object'||(typeof x.u==='string'&&eq.has(x.u))) continue;
    const inst=ucIsInst(x), d=inst&&x.unk?null:ucDef(x); if(UC.filter!=='all'&&(!d||ucCat(d)!==UC.filter)) continue;
    const b=document.createElement('button'); b.type='button'; b.className='uc-cell'; n++;
    if(d&&(inst||!x.unk)) b.dataset.k=inst?x.u:x.id; else b.disabled=true;
    const c=ucColor(d); if(c) b.style.borderColor=c;
    b.append(ucMk('span','uc-ci',d?d.i:'❔'));
    const bd=inst?((x.r|0)>0?'+'+(x.r|0):''):(x.n|0)>1?'×'+ucN(x.n):''; if(bd) b.append(ucMk('span','uc-bd',bd));
    const fl=(x.lk?'🔒':'')+(inst&&Array.isArray(x.s)&&x.s.length?x.s.map(v=>v?'◆':'◇').join(''):''); if(fl) b.append(ucMk('span','uc-fl',fl));
    b.setAttribute('aria-label',ucName(x)+(!inst&&(x.n|0)>1?' ×'+(x.n|0):'')); frag.append(b); }
  const free=itBagFree(ch); if(UC.filter==='all'&&free>0){ let pad=(5-n%5)%5; if(!pad) pad=5; pad=Math.min(pad,free);
    for(let i=0;i<pad;i++){ const e=ucMk('span','uc-cell uc-free'); e.setAttribute('aria-hidden','true'); frag.append(e); } }
  grid.append(frag); if(!n&&UC.filter!=='all') grid.append(ucMk('p','uc-hint uc-span','ไม่มีของในหมวดนี้'));
  grid.addEventListener('click',e=>{ const b=e.target.closest('[data-k]'); if(b&&!b.disabled) openItemSheet(b.dataset.k); });
  box.append(grid);
  const foot=ucMk('div','uc-foot'), fort=!ucRun()&&!ucRO(), com=ucCommon(ch), bp=itBagPrice(ch);
  foot.append(ucMk('span','uc-cnt','กระเป๋า '+itBagUsed(ch)+'/'+itBagMax(ch)),
    ucBtn('เรียงตามช่อง','uc-b',()=>ucSort('slot'),ucRO()), ucBtn('เรียงตามขั้น','uc-b',()=>ucSort('tier'),ucRO()));
  box.append(foot);
  const foot2=ucMk('div','uc-foot');
  foot2.append(ucBtn('ขายของธรรมดาทั้งหมด'+(com.n?' ('+com.n+' ชิ้น · '+ucN(com.g)+' ทอง)':''),'uc-b',()=>ucSellCommon(),!fort||!com.n));
  if(bp) foot2.append(ucBtn('ขยาย +'+BAL.PRICE.bagStep+' ช่อง · '+ucN(bp)+' ทอง','uc-b',()=>ucBuyBag(),!fort||(ucAcct().gold|0)<bp));
  box.append(foot2,ucMk('p','uc-hint','ของที่สวมอยู่ไม่นับในกระเป๋า (ดูที่แท็บอุปกรณ์) · ขายของธรรมดาทั้งหมดไม่รวมของล็อก 🔒 ของที่สวมอยู่ และของที่มีรูน'));
  root.append(box); }
// an action that returns only 0 / '' / false: when the save was reloaded during it (another tab wrote), say so (IT_RACE), not a generic refusal
function ucRace(S0,msg){ return SAVE!==S0&&typeof IT_RACE==='string'?IT_RACE:msg; }
function ucSort(by){ const r=itSortBag(ucCh(),by); if(r) toast(r,'bad'); ucAfter(); }
async function ucSellCommon(){ const ch=ucCh(), c=ucCommon(ch); if(!c.n){ toast('ไม่มีของธรรมดาที่ขายได้','info'); return; }
  if(!await confirmBox('ขายของธรรมดา '+c.n+' ชิ้น ได้ '+ucN(c.g)+' ทอง?'+(c.ref?' (ในนี้มีของที่ตีบวกแล้ว '+c.ref+' ชิ้น · ล็อก 🔒 ไว้ถ้าไม่อยากขาย)':'')+' ขายแล้วเอาคืนไม่ได้',{okText:'ขายทั้งหมด'})) return;
  const S0=SAVE, g=sellAllCommon(ucCh()); if(g) toast('ขายแล้ว ได้ '+ucN(g)+' ทอง','good'); else toast(ucRace(S0,'ขายไม่ได้ในตอนนี้'),'bad'); ucAfter(); ucRefreshSheet(); }
function ucBuyBag(){ const r=itBuyBag(ucCh()); if(r) toast(r,'bad'); else toast('กระเป๋าขยายเป็น '+itBagMax(ucCh())+' ช่อง','good'); ucAfter(); ucRefreshSheet(); }

/* ---------- item sheet (§8.8): gear (stats ▲▼, sockets, wear / refine / runes / lock / sell) or a stack (use / sell) ---------- */
function openItemSheet(uid){
  const ch=ucCh(); if(!ch){ toast('ยังไม่มีตัวละคร','info'); return; }
  const inst=itFind(ch,uid), d=!inst&&itemDef(uid);
  if(!inst&&!(d&&!d.slot&&invCount(ch,uid)>0)){ toast('ไม่พบไอเทมนี้ในกระเป๋า','bad'); return; }
  const box=ucMk('div','uc uc-item'); box.dataset.k=uid; UC.sellN=1; ucItemFill(box);
  sheet(box,{title:inst?ucName(inst):d.n}); }
function ucItemFill(box){ box.textContent=''; const ch=ucCh(), k=box.dataset.k; if(!ch) return; const inst=itFind(ch,k);
  if(inst) ucGearFill(box,ch,inst); else ucStackFill(box,ch,k); }
function ucStats(b,cmp){ const ul=ucMk('ul','uc-stl');
  for(const k in IT_STAT_TH){ const v=b[k], has=typeof v==='number'&&v!==(k==='cd'||k==='magnet'?1:0), c=cmp&&cmp[k]; if(!has&&!c) continue;
    const li=ucMk('li',''); li.append(ucMk('span','',IT_STAT_TH[k]),ucMk('b','',has?itFmtStat(k,v):'–'));
    if(c) li.append(ucMk('i',c>0?'uc-up':'uc-dn',(c>0?'▲':'▼')+ucDiff(k,Math.abs(c)))); ul.append(li); }
  if(b.fam) for(const f in b.fam) if(itHas(IT_FAM_TH,f)&&b.fam[f]){ const li=ucMk('li',''); li.append(ucMk('span','','ดาเมจต่อ'+IT_FAM_TH[f]),ucMk('b','',itFmtStat('fam',b.fam[f]))); ul.append(li); }
  if(!ul.childElementCount) ul.append(ucMk('li','uc-hint','ไม่มีค่าเสริม'));
  return ul; }
function ucGearFill(box,ch,inst){
  const d=inst.unk?null:itemDef(inst.id); ucNote(box);
  if(!d){ box.append(ucMk('p','uc-warn','ไอเทมที่ไม่รู้จัก (อาจมาจากเกมเวอร์ชันใหม่กว่า) · เก็บไว้ให้ก่อน ใช้งานไม่ได้')); return; }
  const slot=itSlotOf(ch,inst.u), rar=IT_RAR[d.rar|0], why=canEquip(ch,inst), head=ucMk('div','uc-ih'), t=ucMk('div','uc-rt');
  const r1=ucMk('b','uc-rar',rar.n); r1.style.color=rar.c;
  t.append(r1,ucMk('small','',IT_SLOT_TH[d.slot]+' · ขั้น '+d.tier+(slot?' · สวมอยู่':'')),ucMk('small',why?'uc-bad':'','ต้อง '+ucReq(d)+(why?' · '+why:'')));
  head.append(ucMk('span','uc-ic uc-big',d.i),t); box.append(head);
  box.append(ucStats(itInstBonus(inst,d),slot?null:itCompare(ch,inst)));
  if(!slot&&!itEquipped(ch,d.slot)) box.append(ucMk('p','uc-hint','ช่อง'+IT_SLOT_TH[d.slot]+'ยังว่าง'));
  const info=[]; if(d.refine) info.push('ตีบวก +'+(inst.r|0)+' / +'+BAL.REFINE.max+(itPityN(inst)?' · ความเพียร +'+ucPc(itPityN(inst)*BAL.REFINE.pity):'')); else info.push('ตีบวกไม่ได้');
  const ps=itSellPrice(inst); info.push(ps?'ขายได้ '+ucN(ps)+' ทอง':inst.b?'ของติดตัวเริ่มต้น · ขายไม่ได้':'ขายไม่ได้'); box.append(ucMk('p','uc-hint uc-left',info.join(' · ')));
  const sk=itSockets(inst); if(sk.length){ const s=ucMk('div','uc-socks'); s.append(ucMk('span','','ช่องรูน'));
    sk.forEach(rid=>s.append(ucMk('span',rid?'uc-sock on':'uc-sock',rid?RUNES[rid].n+' ('+itRuneText(rid)+')':'ว่าง'))); box.append(s); }
  if(d.d) box.append(ucMk('p','uc-hint uc-left',d.d));
  const acts=ucMk('div','uc-acts'), ro=ucRO();
  if(slot){ acts.append(ucBtn('ถอด','uc-b',()=>ucDoUnequip(slot),ro),ucBtn('เปลี่ยน','uc-b',()=>ucPickSlot(slot),ro)); }
  else acts.append(ucBtn('สวมใส่','uc-b pri',()=>ucDoEquip(inst.u),ro||!!why));
  if(d.refine) acts.append(ucBtn('ตีบวก','uc-b',()=>openRefine(inst.u),ro||ucRun()));
  if(sk.length) acts.append(ucBtn('ฝัง / ถอดรูน','uc-b',()=>openRuneScribe({tab:sk.some(v=>!v)?'socket':'unsocket', uid:inst.u}),ro||ucRun()));
  acts.append(ucBtn(inst.lk?'🔓 ปลดล็อก':'🔒 ล็อก','uc-b',()=>{ const r=itLock(ucCh(),inst.u); if(r) toast(r,'bad'); ucItemFill(box); ucAfter(); },ro));
  const sw=slot?'':itSellCheck(ch,inst.u); if(!slot) acts.append(ucBtn('ขาย'+(ps?' · '+ucN(ps):''),'uc-b',()=>ucSellInst(inst.u),!!sw));
  box.append(acts); if(sw&&!slot&&sw!==IT_FORT&&sw!==IT_RO) box.append(ucMk('p','uc-hint','ขาย: '+sw)); }
async function ucSellInst(uid){ const ch=ucCh(), inst=itFind(ch,uid);
  if(!inst){ toast('ไม่พบไอเทมนี้ในกระเป๋า · อาจถูกขายหรือย้ายจากอีกแท็บ','bad'); if(UC.shop) ucRefreshSheet(); else closeSheet(); ucAfter(); return; } const p=itSellPrice(inst), nm=ucName(inst);
  if(!await confirmBox('ขาย '+nm+' ได้ '+ucN(p)+' ทอง? ขายแล้วเอาคืนไม่ได้',{okText:'ขาย'})) return;
  const S0=SAVE, g=sellItem(ucCh(),uid); if(g){ toast('ขาย '+nm+' ได้ '+ucN(g)+' ทอง','good'); if(UC.shop) ucRefreshSheet(); else closeSheet(); }
  else { toast(ucRace(S0,itSellCheck(ucCh(),uid)||'ขายไม่ได้'),'bad'); if(UC.shop) ucRefreshSheet(); } ucAfter(); }
function ucStackFill(box,ch,id){
  const d=itemDef(id), n=invCount(ch,id); ucNote(box);
  if(!d||d.slot){ box.append(ucMk('p','uc-warn','ไม่พบไอเทมนี้ในกระเป๋า')); return; }
  const head=ucMk('div','uc-ih'), t=ucMk('div','uc-rt'); t.append(ucMk('b','uc-nm',d.n+' ×'+ucN(n)),ucMk('small','',(UC_KIND[d.kind]||'ของ')+' · ซ้อนได้ '+ucN(d.stack)+' ต่อช่อง'));
  head.append(ucMk('span','uc-ic uc-big',d.i),t); box.append(head);
  if(d.d) box.append(ucMk('p','uc-hint uc-left',d.d));
  if(d.kind==='rune'&&itHas(RUNES,d.rune)){ const R=RUNES[d.rune], g=RUNE_GROUP[R.g];
    box.append(ucStats(R.st,null),ucMk('p','uc-hint uc-left','ใส่ได้ในช่องกลุ่ม'+g.n+' ('+g.slots.map(s=>IT_SLOT_TH[s]).join(' / ')+') · ฝังฟรี · ถอดได้และได้รูนคืน')); }
  if(d.makes&&itHas(RUNES,d.makes)) box.append(ucMk('p','uc-hint uc-left','มี '+n+'/'+BAL.PRICE.shardsPerRune+' → '+RUNES[d.makes].n+' ('+itRuneText(d.makes)+')'));
  const acts=ucMk('div','uc-acts'), ro=ucRO();
  if(d.use||d.kind==='dye'||id==='u_forget'){
    const part=box.dataset.part||'', who=ucRun()?G.char:ch, why=itCanUse(who,id,{part});
    if(d.kind==='dye'&&ch.dye&&typeof ch.dye==='object') box.append(ucSeg(IT_DYE_PARTS.map(p=>[p,UC_DYE_TH[p]]),part,v=>{ box.dataset.part=v; ucItemFill(box); },'ส่วนที่จะย้อม'));
    acts.append(ucBtn('ใช้','uc-b pri',()=>ucUse(box,id),!!why)); if(why) box.append(ucMk('p','uc-hint',why)); }
  if(d.makes) acts.append(ucBtn('รวมเป็นรูน','uc-b',()=>openRuneScribe({tab:'combine'}),ro||ucRun()));
  if(d.kind==='rune') acts.append(ucBtn('ฝังรูน','uc-b',()=>openRuneScribe({tab:'socket'}),ro||ucRun()));
  const p=itSellPrice(id);
  if(p){ const q=UC.sellN?Math.min(UC.sellN,n):n, why=itSellCheck(ch,id,q);
    box.append(ucSeg([[1,'×1'],[10,'×10'],[0,'ทั้งหมด']],UC.sellN,v=>{ UC.sellN=v; ucItemFill(box); },'จำนวนที่จะขาย'));
    acts.append(ucBtn('ขาย ×'+ucN(q)+' · '+ucN(p*q)+' ทอง','uc-b',()=>ucSellStack(id,q),!!why)); }
  else box.append(ucMk('p','uc-hint','ขายไม่ได้'));
  box.append(acts); }
function ucUse(box,id){ const ch=ucCh(), who=ucRun()?G.char:ch, d=itemDef(id), why=itCanUse(who,id,{part:box.dataset.part||''});
  if(why){ toast(why,'bad'); return; }
  const S0=SAVE; if(!useConsumable(who,id,{part:box.dataset.part||''})){ toast(ucRace(S0,'ใช้ไม่ได้ในตอนนี้'),'bad'); return; }
  toast(d.use&&d.use.bag?'กระเป๋าขยายเป็น '+itBagMax(ucCh())+' ช่อง':'ใช้ '+d.n+' แล้ว','good');
  if(invCount(ucCh(),id)>0) ucItemFill(box); else closeSheet(); ucAfter(); }
async function ucSellStack(id,q){ const d=itemDef(id), p=itSellPrice(id);
  if(q>1&&!await confirmBox('ขาย '+d.n+' ×'+ucN(q)+' ได้ '+ucN(p*q)+' ทอง?',{okText:'ขาย'})) return;
  const S0=SAVE, g=sellItem(ucCh(),id,q); if(!g){ toast(ucRace(S0,itSellCheck(ucCh(),id,q)||'ขายไม่ได้'),'bad'); ucAfter(); ucRefreshSheet(); return; }
  toast('ขาย '+d.n+' ×'+ucN(q)+' ได้ '+ucN(g)+' ทอง','good'); ucAfter();
  const box=document.querySelector('.uc-item'); if(!box) ucRefreshSheet(); else if(invCount(ucCh(),id)>0) ucItemFill(box); else closeSheet(); }

/* ---------- smith ลุงบัณฑ์ (§4.9 · §8.8): pay → roll → save, then the 0.6 s bar · +8 and higher = hold 1 s ---------- */
function openRefine(uid){
  const ch=ucCh(); if(!ch){ toast('ยังไม่มีตัวละคร','info'); return; }
  UC.ref={uid:typeof uid==='string'&&itFind(ch,uid)?uid:'', seal:false, busy:0, last:null};
  const box=ucMk('div','uc uc-ref'); ucRefFill(box); sheet(box,{title:'⚒️ ลุงบัณฑ์ · ช่างตีเหล็ก'}); }
function ucRefList(ch){ const eq=itEqSet(ch);
  return ch.inv.filter(x=>ucIsInst(x)&&!x.unk&&ucDef(x)&&ucDef(x).refine).map(x=>({x, d:ucDef(x), w:eq.has(x.u)}))
    .sort((a,b)=>(b.w-a.w)||(IT_SLOTS.indexOf(a.d.slot)-IT_SLOTS.indexOf(b.d.slot))||((b.x.r|0)-(a.x.r|0))||(b.d.tier-a.d.tier)); }
function ucMats(ch){ return ['m_dust','m_crystal','m_seal'].map(id=>itemDef(id).n+' '+ucN(invCount(ch,id))).join(' · '); }
function ucRefFill(box){
  box.textContent=''; const ch=ucCh(), R=UC.ref; if(!ch||!R) return; delete box.dataset.busy;
  box.append(ucWallet(null)); ucNote(box);
  const inst=R.uid&&itFind(ch,R.uid);
  if(!inst){ box.append(ucMk('p','uc-hint uc-left','เลือกของที่จะตีบวก · มี '+ucMats(ch)));
    const L=ucRefList(ch); if(!L.length) box.append(ucMk('p','uc-hint','ยังไม่มีของที่ตีบวกได้ (เครื่องประดับตีบวกไม่ได้)'));
    for(const {x,d,w} of L) box.append(ucRow(x,{sub:(w?'สวมอยู่ · ':'')+IT_SLOT_TH[d.slot]+((x.r|0)>=BAL.REFINE.max?' · ตันแล้ว':''), on:()=>{ R.uid=x.u; R.last=null; R.seal=false; ucRefFill(box); }}));
    return; }
  const d=itemDef(inst.id), ri=refineInfo(inst), sel=ucMk('div','uc-row');
  sel.append(ucRow(inst,{sub:itSlotOf(ch,inst.u)?'สวมอยู่':'ในกระเป๋า'}).firstElementChild,ucBtn('เปลี่ยนชิ้น','uc-b',()=>{ R.uid=''; R.last=null; ucRefFill(box); },R.busy));
  box.append(sel);
  if(R.last) box.append(ucRefResult(R.last,d));
  if(!ri){ box.append(ucMk('p','uc-res ok','ตีบวกถึง +'+BAL.REFINE.max+' แล้ว · สูงสุด')); return; }
  const big=ucMk('p','uc-to'); big.append(ucMk('span','','+'+ri.from),ucMk('i','','→'),ucMk('b','','+'+ri.to)); box.append(big);
  const dl=ucMk('dl','uc-dl'), add=(k,v,bad)=>{ const w=ucMk('div',bad?'uc-bad':''); w.append(ucMk('dt','',k),ucMk('dd','',v)); dl.append(w); };
  add('โอกาส',ucPc(ri.base)+(ri.bonus?' (+'+ucPc(ri.bonus)+' ความเพียร) = '+ucPc(ri.p):''));
  const mat=itemDef(ri.mat), have=invCount(ch,ri.mat), gold=ucAcct().gold|0;
  add('ใช้',mat.n+' ×'+ri.matN+' (มี '+ucN(have)+')',have<ri.matN); add('ค่าแรง',ucN(ri.fee)+' ทอง (มี '+ucN(gold)+')',gold<ri.fee);
  add('ถ้าสำเร็จ',ucRefGain(d,ri.from,ri.to)+(d.slot==='weapon'&&ri.to===7?' · อาวุธเริ่มเรืองแสง':d.slot==='weapon'&&ri.to===10?' · ออร่า':''));
  add('ถ้าล้มเหลว',ri.onFail?ucFailText(ri).replace(/^ล้มเหลว: /,'')+(ri.onFail==='down'&&R.seal?' → ยันต์ผนึกกันไว้':''):'ไม่มี (โอกาส 100%)');
  box.append(dl);
  if(ri.seal){ const ns=invCount(ch,'m_seal'), lab=ucMk('label','uc-chk'), cb=document.createElement('input'); cb.type='checkbox'; cb.name='ucSeal';
    if(ns<1) R.seal=false; cb.checked=R.seal; cb.disabled=ns<1||!!R.busy; cb.addEventListener('change',()=>{ R.seal=cb.checked; ucRefFill(box); });
    lab.append(cb,ucMk('span','','ใช้ยันต์ผนึก (มี '+ns+') · ล้มเหลวแล้วระดับไม่ลด')); box.append(lab); }
  const why=itRefineCheck(ch,inst.u,{seal:R.seal}), hold=ri.to>=8;
  const go=ucBtn(hold?'🔨 กดค้างเพื่อตี +'+ri.to:'🔨 ตีเลย!','uc-b pri uc-go2',hold?null:()=>ucRefGo(box),!!why||!!R.busy);
  if(hold) ucHold(go,UC_HOLD,()=>ucRefGo(box)); box.append(go);
  if(why) box.append(ucMk('p','uc-hint uc-bad',why));
  box.append(ucMk('p','uc-hint','ไม่มีวันพังหรือหาย · วัสดุและค่าแรงเสียทุกครั้งที่ตี · ผลบันทึกทันทีก่อนแอนิเมชัน (ปิดแอปก็สุ่มใหม่ไม่ได้)')); }
function ucRefResult(r,d){ const ok=r.res==='ok', e=ucMk('p','uc-res '+(ok?'ok':'fail'));
  e.textContent=ok?'✨ สำเร็จ! ตอนนี้ +'+r.to+(d.slot==='weapon'&&r.to>=7?(r.to>=10?' · อาวุธมีออร่าแล้ว':' · อาวุธเรืองแสงแล้ว'):'')
    :'💥 ล้มเหลว… '+(r.res==='down'?'ลดเหลือ +'+r.to:'คงระดับ +'+r.to+(r.seal?' (ยันต์ผนึกกันไว้)':''))+' · ความเพียร +'+ucPc(r.f*BAL.REFINE.pity)+' ครั้งถัดไป';
  e.setAttribute('role','status'); return e; }
// press [ตีเลย]: refineTry pays, rolls (crypto) and saves before it returns → only then the bar plays (closing the app cannot reroll)
function ucRefGo(box){
  const R=UC.ref; if(!R||R.busy||!box.isConnected) return; const ch=ucCh();
  const res=refineTry(ch,R.uid,{seal:R.seal});
  if(!res.res){ toast(res.why||'ตีบวกไม่ได้','bad'); ucRefFill(box); return; }
  R.busy=1; R.last=res; if(!res.saved) toast('บันทึกลงเครื่องไม่ได้ · ผลนี้อาจหายเมื่อปิดหน้า','bad');
  box.dataset.busy='1'; for(const b of box.querySelectorAll('button,input')) b.disabled=true;
  const old=box.querySelector('.uc-res'); if(old) old.remove();
  const bar=ucMk('div','uc-rbar'), fill=ucMk('i'); fill.style.animationDuration=(REDUCED?120:UC_ANIM)+'ms'; bar.append(fill);
  const lbl=ucMk('p','uc-res','กำลังตี…'); lbl.setAttribute('role','status'); box.querySelector('.uc-to').after(bar,lbl);
  ucSnd('hit');
  setTimeout(()=>{ R.busy=0; if(!box.isConnected) return; ucSnd(res.res==='ok'?'ok':'fail'); if(res.res==='ok') ucBuzz(); ucRefFill(box);
    const e=box.querySelector('.uc-res'); if(e) e.classList.add('pop'); ucAfter(); },REDUCED?120:UC_ANIM); }
// press-and-hold button (§8.0): the fill runs for ms, release early = nothing · Enter / Space hold works too
function ucHold(b,ms,fn){ let t=0, fired=false; b.classList.add('uc-hold'); b.style.setProperty('--hold',ms+'ms');
  const off=()=>{ if(t){ clearTimeout(t); t=0; } b.classList.remove('on'); };
  const on=()=>{ if(b.disabled||t) return; fired=false; b.classList.add('on'); t=setTimeout(()=>{ t=0; fired=true; b.classList.remove('on'); ucBuzz(); fn(); },ms); };
  b.addEventListener('pointerdown',e=>{ if(e.button>0) return; e.preventDefault(); try{ b.setPointerCapture(e.pointerId); }catch(_){} on(); });
  for(const ev of ['pointerup','pointercancel','lostpointercapture']) b.addEventListener(ev,off);
  b.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){ e.preventDefault(); if(!e.repeat) on(); } });
  b.addEventListener('keyup',e=>{ if(e.key==='Enter'||e.key===' ') off(); });
  b.addEventListener('click',()=>{ if(!fired&&!b.disabled) toast('กดค้างไว้ '+(ms/1000)+' วินาทีเพื่อตี','info'); fired=false; });
  b.addEventListener('contextmenu',e=>e.preventDefault()); }

/* ---------- rune scribe แม่หมอศิลา (§4.10): [รวมเศษ] 4 + 300 ทอง · [ฝัง] free · [ถอด] 100·tier ทอง, the rune comes back ---------- */
function openRuneScribe(o){
  const ch=ucCh(); if(!ch){ toast('ยังไม่มีตัวละคร','info'); return; } o=o&&typeof o==='object'?o:{};
  UC.rs={tab:['combine','socket','unsocket'].indexOf(o.tab)>=0?o.tab:'combine', uid:typeof o.uid==='string'?o.uid:''};
  const box=ucMk('div','uc uc-rs'); ucRsFill(box); sheet(box,{title:'🔮 แม่หมอศิลา · ผู้จารึกรูน'}); }
function ucSockList(ch,any){ const eq=itEqSet(ch);   // items with sockets (any) or with a rune in them, worn first
  return ch.inv.filter(x=>ucIsInst(x)&&!x.unk&&ucDef(x)&&itSockets(x).length&&(any||itSockets(x).some(v=>v)))
    .sort((a,b)=>(eq.has(b.u)-eq.has(a.u))||(IT_SLOTS.indexOf(ucDef(a).slot)-IT_SLOTS.indexOf(ucDef(b).slot))); }
function ucSockSub(ch,x){ return (itSlotOf(ch,x.u)?'สวมอยู่ · ':'')+itSockets(x).map(v=>v?RUNES[v].n:'ว่าง').join(' · '); }
function ucRsFill(box){
  box.textContent=''; const ch=ucCh(), S=UC.rs; if(!ch||!S) return; const fort=!ucRun()&&!ucRO();
  box.append(ucWallet(ch)); ucNote(box);
  box.append(ucSeg([['combine','รวมเศษ'],['socket','ฝัง'],['unsocket','ถอด']],S.tab,v=>{ S.tab=v; ucRsFill(box); },'บริการผู้จารึกรูน'));
  const eq=itEqSet(ch), groups=ucGroup(ch.inv,eq);
  if(S.tab==='combine'){
    const sh=groups.filter(g=>!g.unk&&!g.inst&&itemDef(g.id).makes);
    box.append(ucMk('p','uc-hint uc-left','เศษรูน '+BAL.PRICE.shardsPerRune+' ชิ้น + '+ucN(BAL.PRICE.combine)+' ทอง → รูน 1 ชิ้น'));
    if(!sh.length) box.append(ucMk('p','uc-hint','ยังไม่มีเศษรูน · ศัตรูโหมดเอาชีวิตรอดระดับ elite และบอสดรอปเศษรูน'));
    for(const g of sh){ const d=itemDef(g.id), R=RUNES[d.makes], why=itCombineCheck(ch,g.id);
      box.append(ucRow(g.id,{n:g.n, sub:'→ '+R.n+' · '+RUNE_GROUP[R.g].n+' · '+ucStatText(R.st), warn:why&&why!==IT_FORT&&why!==IT_RO?why:'',
        right:[ucBtn('รวม','uc-b pri',()=>{ const S0=SAVE, rid=combineShards(ucCh(),g.id); if(rid){ toast('ได้ '+RUNES[rid].n+' แล้ว','good'); ucSnd('ok'); } else toast(ucRace(S0,itCombineCheck(ucCh(),g.id)||'รวมไม่ได้'),'bad'); ucRsFill(box); ucAfter(); },!!why)]})); }
    const runes=groups.filter(g=>!g.unk&&!g.inst&&itemDef(g.id).kind==='rune');
    if(runes.length) box.append(ucMk('p','uc-hint uc-left','รูนในกระเป๋า: '+runes.map(g=>itemDef(g.id).n+' ×'+g.n).join(' · ')));
    return; }
  if(S.tab==='socket'){
    const inst=S.uid&&itFind(ch,S.uid);
    if(!inst||!itSockets(inst).length){ S.uid='';
      const L=ucSockList(ch,true); box.append(ucMk('p','uc-hint uc-left','เลือกของที่มีช่องรูน (ขั้น 2 ขึ้นไป) · ฝังฟรี'));
      if(!L.length) box.append(ucMk('p','uc-hint','ยังไม่มีของที่มีช่องรูน'));
      for(const x of L) box.append(ucRow(x,{sub:ucSockSub(ch,x), on:()=>{ S.uid=x.u; ucRsFill(box); }}));
      return; }
    const d=itemDef(inst.id), sk=itSockets(inst), e=sk.indexOf(null), sel=ucMk('div','uc-row');
    sel.append(ucRow(inst,{sub:ucSockSub(ch,inst)}).firstElementChild,ucBtn('เปลี่ยนชิ้น','uc-b',()=>{ S.uid=''; ucRsFill(box); })); box.append(sel);
    if(e<0){ box.append(ucMk('p','uc-hint','ช่องรูนเต็มแล้ว · ถอดรูนเดิมที่แท็บ [ถอด] ก่อน')); return; }
    box.append(ucMk('p','uc-hint uc-left','ฝังในช่องที่ '+(e+1)+' · รูนที่ใส่ช่อง'+IT_SLOT_TH[d.slot]+'ได้ (กลุ่ม '+Object.keys(RUNE_GROUP).filter(k=>RUNE_GROUP[k].slots.indexOf(d.slot)>=0).map(k=>RUNE_GROUP[k].n).join(' / ')+')'));
    const runes=groups.filter(g=>!g.unk&&!g.inst&&itemDef(g.id).kind==='rune'), fit=runes.filter(g=>itRuneFits(g.id,d));
    if(!fit.length) box.append(ucMk('p','uc-hint',runes.length?'รูนที่มีอยู่ใส่ช่องนี้ไม่ได้':'ยังไม่มีรูน · รวมจากเศษที่แท็บ [รวมเศษ]'));
    for(const g of fit){ const R=RUNES[g.id];
      box.append(ucRow(g.id,{n:g.n, sub:itRuneText(g.id), right:[ucBtn('ฝัง','uc-b pri',()=>{ const r=socketRune(ucCh(),S.uid,g.id,e); if(r) toast(r,'bad'); else { toast('ฝัง '+R.n+' แล้ว','good'); ucSnd('ok'); } ucRsFill(box); ucAfter(); },!fort)]})); }
    for(const g of runes) if(!itRuneFits(g.id,d)) box.append(ucRow(g.id,{n:g.n, cls:'uc-off', sub:'ใส่ได้เฉพาะกลุ่ม'+RUNE_GROUP[RUNES[g.id].g].n}));
    return; }
  const L=ucSockList(ch,false);
  box.append(ucMk('p','uc-hint uc-left','ถอดรูน: ค่าบริการ 100 × ขั้นของอุปกรณ์ ทอง · ได้รูนคืนเข้ากระเป๋า'));
  if(!L.length) box.append(ucMk('p','uc-hint','ยังไม่มีของที่ฝังรูนไว้'));
  for(const x of L){ const fee=itUnsocketFee(x), gold=ucAcct().gold|0;
    itSockets(x).forEach((rid,i)=>{ if(!rid) return;
      box.append(ucRow(x,{sub:'ช่อง '+(i+1)+': '+RUNES[rid].n+(itSlotOf(ch,x.u)?' · สวมอยู่':''), warn:gold<fee?'ทองไม่พอ':'',
        right:[ucBtn('ถอด · '+ucN(fee),'uc-b',()=>{ const r=unsocketRune(ucCh(),x.u,i); if(r) toast(r,'bad'); else toast('ถอด '+RUNES[rid].n+' แล้ว · รูนกลับเข้ากระเป๋า','good'); ucRsFill(box); ucAfter(); },!fort||gold<fee)]})); }); } }

/* ---------- shop ร้านป้านวล (§4.6 · §4.11): [ซื้อ | ขาย] · sell price is always below the buy price ---------- */
function openShop(){
  const ch=ucCh(); if(!ch){ toast('ยังไม่มีตัวละคร','info'); return; }
  UC.shop={tab:'buy', cat:'use', all:false}; const box=ucMk('div','uc uc-shop'); box.dataset.sheet='shop'; ucShopFill(box);
  sheet(box,{title:'🧺 ร้านป้านวล', onClose(){ UC.shop=null; }}); }
function ucRefreshSheet(){ const b=document.querySelector('.uc-shop'); if(b&&b.isConnected) ucShopFill(b); const s=document.querySelector('.uc-stash'); if(s&&s.isConnected) ucStashFill(s); }
function ucShopFill(box){
  box.textContent=''; const ch=ucCh(), S=UC.shop; if(!ch||!S) return; const fort=!ucRun()&&!ucRO(), gold=ucAcct().gold|0;
  box.append(ucWallet(ch)); ucNote(box);
  box.append(ucSeg([['buy','ซื้อ'],['sell','ขาย']],S.tab,v=>{ S.tab=v; ucShopFill(box); },'ร้านป้านวล'));
  if(S.tab==='buy'){
    box.append(ucSeg([['use','ของใช้'],['weapon','อาวุธ'],['armor','ชุด'],['acc','เครื่องประดับ']],S.cat,v=>{ S.cat=v; ucShopFill(box); },'หมวดสินค้า'));
    const L=ucShopList(ch,S.cat,S.all);
    for(const e of L){ const d=e.d, right=[];
      if(d.slot){ const fake={u:'i_shop', id:e.id, r:0, f:0, s:[], lk:0}, why=canEquip(ch,fake);
        right.push(ucBtn(ucN(e.price),'uc-b pri uc-pr',()=>ucBuy(box,e.id,1),!fort||gold<e.price||!itRoom(ch,e.id,1)));
        box.append(ucRow(e.id,{sub:ucReq(d)+' · '+(ucStatText(itInstBonus(fake,d))||'ไม่มีค่าเสริม'), cmp:itEquipped(ch,d.slot)?ucCmpText(ch,fake):'', warn:why, right}));
        continue; }
      for(const q of d.stack>=10?[1,10]:[1]) right.push(ucBtn('×'+q+' · '+ucN(e.price*q),'uc-b pri uc-pr',()=>ucBuy(box,e.id,q),!fort||gold<e.price*q||!itRoom(ch,e.id,q)));
      box.append(ucRow(e.id,{sub:[d.d,'มี '+ucN(invCount(ch,e.id)),e.sell>0?'ขายคืน '+ucN(e.sell):''].filter(Boolean).join(' · '), right, cls:right.length>1?'uc-wrap':''})); }
    if(S.cat!=='use') box.append(ucBtn(S.all?'แสดงเฉพาะที่อาชีพนี้ใส่ได้':'แสดงของทุกอาชีพ','uc-b sh-wide',()=>{ S.all=!S.all; ucShopFill(box); }));
    const bp=itBagPrice(ch);
    if(S.cat==='use') box.append(ucRow('u_bag10',{sub:bp?'กระเป๋า +'+BAL.PRICE.bagStep+' ช่อง ('+itBagMax(ch)+' → '+(itBagMax(ch)+BAL.PRICE.bagStep)+')':'กระเป๋าขยายเต็ม '+BAL.CAP.bag+' ช่องแล้ว',
      right:bp?[ucBtn(ucN(bp),'uc-b pri uc-pr',()=>ucBuyBag(),!fort||gold<bp)]:[]}));
    box.append(ucMk('p','uc-hint','ราคาเป็นทอง · ของบอสและผลึกรูนหาได้จากการล่าบอสและตราผู้พิชิต'));
    return; }
  const com=ucCommon(ch);
  box.append(ucBtn('ขายของธรรมดาทั้งหมด'+(com.n?' ('+com.n+' ชิ้น · '+ucN(com.g)+' ทอง)':''),'uc-b sh-wide',()=>ucSellCommon(),!fort||!com.n));
  const G2=ucGroup(ch.inv,itEqSet(ch)).filter(g=>!g.unk); if(!G2.length) box.append(ucMk('p','uc-hint','กระเป๋าว่าง'));
  for(const g of G2){ const p=itSellPrice(g.inst||g.id);
    if(g.inst){ const why=itSellCheck(ch,g.k); box.append(ucRow(g.inst,{sub:p?'ขายได้ '+ucN(p)+' ทอง':'', warn:why&&why!==IT_FORT&&why!==IT_RO?why:'',
      right:[ucBtn('ขาย','uc-b',()=>ucSellInst(g.k),!!why), ucInfoBtn(g.k)]})); continue; }
    const right=p?[ucBtn('×1','uc-b',()=>ucSellStack(g.id,1),!fort)]:[]; if(p&&g.n>1) right.push(ucBtn('ทั้งหมด','uc-b',()=>ucSellStack(g.id,g.n),!fort));
    box.append(ucRow(g.id,{n:g.n, sub:p?'ชิ้นละ '+ucN(p)+' ทอง':'ขายไม่ได้', right, cls:right.length>1?'uc-wrap':''})); } }
function ucBuy(box,id,q){ const d=itemDef(id), price=itBuyPrice(id,'gold')*q, r=buyItem(ucCh(),id,q,{cur:'gold'});
  if(r){ toast(r,'bad'); ucShopFill(box); ucAfter(); return; }          // refused: the sheet still shows fresh gold / counts (a reload may have happened)
  toast('ซื้อ '+d.n+(q>1?' ×'+q:'')+' แล้ว (−'+ucN(price)+' ทอง)','good'); ucShopFill(box); ucAfter(); }

/* ---------- stash ผู้เฝ้าคลัง (§4.8): two columns bag ⇄ stash (shared by every character) ---------- */
function openStash(){
  const ch=ucCh(); if(!ch){ toast('ยังไม่มีตัวละคร','info'); return; }
  UC.st={n:0}; const box=ucMk('div','uc uc-stash'); ucStashFill(box); sheet(box,{title:'📦 ผู้เฝ้าคลัง · คลังเก็บของ'}); }
function ucStashFill(box){
  box.textContent=''; const ch=ucCh(), A=ucAcct(), S=UC.st; if(!ch||!A||!S) return; const fort=!ucRun()&&!ucRO();
  const sm=Math.min(BAL.CAP.stash,A.stashMax|0), used=Array.isArray(A.stash)?A.stash.length:0;
  box.append(ucMk('p','uc-wal','🎒 กระเป๋า '+itBagUsed(ch)+'/'+itBagMax(ch)+' · 📦 คลัง '+used+'/'+sm+' (ใช้ร่วมทุกตัว\u2060ละคร)')); ucNote(box);
  box.append(ucSeg([[1,'×1'],[10,'×10'],[0,'ทั้งหมด']],S.n,v=>{ S.n=v; ucStashFill(box); },'จำนวนของซ้อนที่ย้ายต่อการแตะ'));
  const two=ucMk('div','uc-two'), col=(title,list,toStash)=>{ const c=ucMk('div','uc-col'); c.append(ucMk('h3','',title));
    const G2=ucGroup(list,toStash?itEqSet(ch):null); if(!G2.length) c.append(ucMk('p','uc-hint','ว่าง'));
    for(const g of G2){ const d=g.unk?null:itemDef(g.id), b=ucBtn('','uc-mv',()=>ucMove(box,g,toStash),!fort||g.unk);
      const t=ucMk('span','uc-rt'); t.append(g.inst?ucNameEl('b',g.inst):ucNameEl('b',g.id,g.n>1?' ×'+ucN(g.n):''));
      b.append(ucMk('span','uc-ic',d?d.i:'❔'),t,ucMk('span','uc-ar',toStash?'→':'←'));
      b.setAttribute('aria-label',(toStash?'ย้ายเข้าคลัง: ':'ย้ายเข้ากระเป๋า: ')+ucName(g.inst||g.id)); c.append(b); }
    return c; };
  two.append(col('กระเป๋า → คลัง',ch.inv,true),col('คลัง → กระเป๋า',A.stash,false)); box.append(two);
  if(sm<BAL.CAP.stash){ const P=BAL.PRICE.stash;
    box.append(ucBtn('ขยายคลัง +'+P.step+' ช่อง · '+P.marks+' ตราผู้พิชิต (มี '+ucN(A.marks)+')','uc-b sh-wide',()=>{ const r=itBuyStash(ucCh()); if(r) toast(r,'bad'); else toast('คลังขยายเป็น '+Math.min(BAL.CAP.stash,ucAcct().stashMax|0)+' ช่อง','good'); ucStashFill(box); },ucRO()||(A.marks|0)<P.marks)); }
  box.append(ucMk('p','uc-hint','แตะของเพื่อย้ายฝั่ง · ของที่สวมอยู่ต้องถอดก่อน · ของซ้อนย้ายตามจำนวนที่เลือก')); }
function ucMove(box,g,toStash){ const S=UC.st, n=g.inst?undefined:(S.n?Math.min(S.n,g.n):g.n);
  const r=stashMove(ucCh(),g.k,toStash,n); if(r) toast(r,'bad'); ucStashFill(box); ucAfter(); }

// dev hooks (§7.9 · #dev only): RG.charui.* opens this file's screens · state() = what the refine sheet holds
DEV.charui={
  tab(t){ openCharWindow(t||'equip'); return UC.tab; }, item(k){ openItemSheet(k); }, refine(uid){ openRefine(uid); return UC.ref&&UC.ref.uid; },
  scribe(o){ openRuneScribe(o); }, shop(){ openShop(); }, stash(){ openStash(); },
  state(){ const R=UC.ref; return {tab:UC.tab, filter:UC.filter, ref:R?{uid:R.uid, seal:R.seal, busy:R.busy, last:R.last}:null}; } };
