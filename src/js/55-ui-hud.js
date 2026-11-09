/* ================= 55-ui-hud.js · lane B · HUD of character modes (EXP bar, card button, log), rewards on scrEnd, pause extras ================= */
// UIX.hud = end of core updateHUD, every frame: classic (no G.char) costs two compares and changes nothing. Character runs (§8.13):
// first-run tip, ★ cap line on level-up cards, loot in the log + a 🎒 count (fixed layer: no layout shift), field EXP/Job bars,
// card button (cards:'manual'). Rewards + items gained / dropped for a full bag: endExtra. Item names → textContent only.
const HD={g:null, cards:null, bars:false, manual:false, auto:false, n:-1, xr:-1, jr:-1, lv:0, jl:0, loot:0, rew:null, wired:false,
  got:0, free:0, sfree:0, need:0, full:0, seen:null, pot:[null,null], potN:[0,0], potCd:-1, potSig:'', potWired:false};
UIX.hud=hdTick; UIX.endExtra=hdEnd; UIX.pauseExtra=hdPause;

function hdTick(){
  if(HD.g!==G) hdStart();
  if(!G.char) return;
  if(G.ui==='level'&&G.choices!==HD.cards) hdCards();
  if(G.loot&&G.loot.length>HD.loot){ for(let i=HD.loot;i<G.loot.length;i++) hdGot(G.loot[i]); HD.loot=G.loot.length; hdBag(); }
  if(HD.bars) hdBars();
  if(HD.manual) hdCardBtn();
  if(HD.pot[0]||HD.pot[1]) hdPots(false); }
function hdStart(){   // first HUD frame of a run
  HD.g=G; HD.cards=null; HD.n=-1; HD.xr=HD.jr=-1; HD.loot=G.loot?G.loot.length:0; SH.lastMode=G.modeId; shChrome(null);
  HD.got=0; HD.need=0; HD.full=0; HD.seen=new Set(); HD.free=G.char&&typeof itBagFree==='function'?itBagFree(G.char):1e9;
  HD.sfree=G.char&&typeof itStashFree==='function'&&SAVE?itStashFree(SAVE.acct):0;
  const bag=shEl('hdBag'); if(bag&&!bag.hidden){ bag.hidden=true; bag.textContent=''; bag.classList.remove('bad','warn'); }
  const ch=G.char, box=shEl('hdBox'); HD.bars=!!ch&&G.modeId==='field'; HD.manual=!!ch&&G.mode.cards==='manual';
  HD.auto=HD.manual&&!!loadSettings().cardAuto;
  if(box){ box.hidden=!(HD.bars||HD.manual); shEl('hdBars').hidden=!HD.bars; shEl('hdCard').hidden=true;
    if(!HD.wired){ HD.wired=true; shEl('hdCard').addEventListener('click',()=>{ if(G&&!G.ui&&!G.over) G.cardReq=true; }); } }
  hdPotStart(ch);
  if(ch&&G.charTip&&!G.auto) toast(G.charTip,'info'); }
// one loot entry → a log line (a stack of the same id within 4 s grows ×n on the same line) + the bag estimate:
// gear needs an entry, a stack only when neither the bag nor this run has that id yet. Past the bag's free entries at the start
// → one line "goes to the stash"; past the stash too → one line "will be dropped" (lane C pgCommitItems: bag → stash → lost).
function hdGot(it){
  if(!it||typeof it!=='object') return;
  const d=typeof itemDef==='function'?itemDef(it.id):null, n=Math.max(1,it.n|0), gear=typeof it.u==='string';
  HD.got+=gear?1:n;
  if(d&&HD.full<2){ if(gear) HD.need++; else if(!HD.seen.has(it.id)&&!(typeof invCount==='function'&&invCount(G.char,it.id)>0)) HD.need++; }
  HD.seen.add(it.id);
  const key=gear?'':'lt:'+it.id, box=shEl('shLog'), last=box&&box.lastElementChild;
  const cnt=(key&&last&&last.dataset.k===key&&!last.classList.contains('out')?(+last.dataset.n||0):0)+(gear?1:n);
  const l=shLogLine('ได้รับ '+hdItemName(gear?it:{id:it.id, n:cnt}),'good',{key, color:hdRarC(d)}); if(l) l.dataset.n=String(cnt);
  const st=HD.need>HD.free+HD.sfree?2:HD.need>HD.free?1:0;
  if(st>HD.full){ HD.full=st; shLogLine(st>1?'กระเป๋าและคลังเต็ม · ของที่เกินจะหล่นหาย':'กระเป๋าเต็ม · ของที่เกินจะเข้าคลัง',st>1?'bad':''); } }
function hdRarC(d){ const R=typeof IT_RAR!=='undefined'?IT_RAR:null, r=d&&d.slot?d.rar|0:0; return r>0&&R&&R[r]?R[r].c:''; }   // gear above common only
function hdBag(){ const b=shEl('hdBag'), box=shEl('hdBox'); if(!b||!box||!HD.got) return;
  b.hidden=false; box.hidden=false; b.textContent='🎒 '+HD.got+(HD.full>1?' · เต็ม':HD.full?' · เข้าคลัง':''); b.classList.toggle('bad',HD.full>1); b.classList.toggle('warn',HD.full===1);
  try{ if(b.animate&&!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)) b.animate([{transform:'scale(1)'},{transform:'scale(1.2)'},{transform:'scale(1)'}],{duration:280}); }catch(e){} }
// ★ caps (§3.6): one line per card after core renderCards (a reroll = new choices → added again)
function hdCards(){
  HD.cards=G.choices; const box=$('#lvCards'); if(!box||!P.rank) return;
  const eb=$('#lvEyebrow'), lt=$('#lvTitle');                          // §2.2: proficiency, not the character's level
  if(eb&&eb.textContent==='เลเวลอัพ'){ eb.textContent='ความชำนาญเพิ่มขึ้น'; if(lt&&/^Lv /.test(lt.textContent)) lt.textContent='ชำนาญ '+lt.textContent; }
  G.choices.forEach((o,i)=>{ const c=box.children[i]; if(!c) return; let t='';
    if(o.k==='up'){ const cap=P.rank[o.s.id]||0; t=o.s.lv+1>=cap?'ถึงเพดาน ★'+cap+' หลังเลือก · ฝึกเพิ่มที่หน้าสกิล':'เพดาน ★'+cap; }
    else if(o.k==='new') t='ฝึกไว้ ★'+(P.rank[o.id]||0)+' · อัปในรอบนี้ได้ถึง Lv '+(P.rank[o.id]||0);
    else if(o.k==='stat') t='เร่งชั่วคราวในรอบนี้ · ไม่ใช่สถานะถาวร';
    else if(o.k==='gold') t='ได้ทองจริง +'+5*P.lv;
    if(t) c.append(shMk('span','hd-cap',t)); });
  // §3.6: a loadout skill already at its ★ is never offered → say so on one other card
  const top=(P.skills||[]).filter(s=>!s.evolved&&(P.rank[s.id]||0)<BAL.CAP.rank&&s.lv>=(P.rank[s.id]||0));
  if(top.length){ let i=G.choices.findIndex(o=>o.k!=='up'&&o.k!=='new'&&o.k!=='evo'); if(i<0) i=G.choices.length-1; const c=box.children[i];
    if(c) c.append(shMk('span','hd-cap','ตันที่ '+top.map(s=>s.def.n+' ★'+(P.rank[s.id]||0)).join(', ')+' · ฝึกเพิ่มที่หน้าสกิล')); } }
function hdBars(){
  const ch=G.char, t2=!!ch.job, jc=t2?BAL.CAP.job2:BAL.CAP.job1;
  const xr=ch.lv>=BAL.CAP.base?1:ch.xp/BAL.bxpNeed(ch.lv), jr=ch.jlv>=jc?1:ch.jxp/BAL.jxpNeed(ch.jlv,t2?2:1);
  if(Math.abs(xr-HD.xr)<.002&&Math.abs(jr-HD.jr)<.002&&HD.lv===ch.lv&&HD.jl===ch.jlv) return;
  HD.xr=xr; HD.jr=jr; HD.lv=ch.lv; HD.jl=ch.jlv; const b=shEl('hdBars'); b.textContent=''; b.append(shBar('Lv '+ch.lv,xr,''),shBar('Job '+ch.jlv,jr,'','job')); }
function hdCardBtn(){
  const n=(G.pendingLv|0)+(G.pendingChest|0), on=n>0&&!G.ui&&!G.over;
  if(on&&HD.auto) G.cardReq=true;
  const v=on?n:0; if(HD.n===v) return; HD.n=v; const b=shEl('hdCard'); b.hidden=!on; b.textContent='⬆ เลือกการ์ด ('+n+')'; }

// §8.13 quick potions: one button per quick slot (ch.quick · 2 slots) that holds a healing item; tap or Q / E → useConsumable
// (lane E ltPotion: heal % + shared cooldown BAL.FIELD.potCd · takes 1 from the bag) · the count is cached (only a use changes it
// mid-run) and the label is rebuilt only when count or cooldown second changes · classic never gets here (no G.char)
function hdPotIds(ch){ const q=ch&&Array.isArray(ch.quick)?ch.quick:[], out=[null,null], heal=id=>{ const d=typeof id==='string'&&typeof itemDef==='function'?itemDef(id):null; return !!(d&&d.use&&d.use.heal); };
  for(let i=0;i<2;i++) if(heal(q[i])&&q.indexOf(q[i])===i) out[i]=q[i];
  if(!out[0]&&!out[1]&&heal('u_potion_s')&&typeof invCount==='function'&&invCount(ch,'u_potion_s')>0) out[0]='u_potion_s';
  return out; }
function hdPotStart(ch){
  const w=shEl('hdPots'); HD.pot=ch&&!G.auto?hdPotIds(ch):[null,null]; HD.potSig=''; HD.potCd=-1;
  if(!w) return; const on=!!(HD.pot[0]||HD.pot[1]); w.hidden=!on; hdPotRoom(on?(HD.pot[0]?1:0)+(HD.pot[1]?1:0):0); if(!on) return;
  if(!HD.potWired){ HD.potWired=true;
    w.addEventListener('click',e=>{ const b=e.target&&e.target.closest&&e.target.closest('button[data-i]'); if(b) hdPotUse(+b.dataset.i); });
    addEventListener('keydown',e=>{ if(!G||!G.char||G.ui||G.over||e.repeat) return; const i=e.code==='KeyQ'?0:e.code==='KeyE'?1:-1; if(i>=0&&HD.pot[i]){ e.preventDefault(); hdPotUse(i); } }); }
  w.textContent='';
  for(let i=0;i<2;i++) if(HD.pot[i]){ const b=shMk('button','hd-pot'); b.type='button'; b.dataset.i=String(i); w.append(b); }
  const box=shEl('hdBox'); if(box) box.hidden=false;
  hdPots(true); }
function hdPots(recount){
  const ch=G.char, cd=Math.max(0,Math.ceil((G.potT||0)-G.t));
  if(recount) for(let i=0;i<2;i++) HD.potN[i]=HD.pot[i]&&typeof invCount==='function'?invCount(ch,HD.pot[i]):0;
  if(!recount&&cd===HD.potCd) return; HD.potCd=cd;
  const w=shEl('hdPots'); if(!w) return;
  for(const b of w.children){ const i=+b.dataset.i, id=HD.pot[i], d=id?itemDef(id):null, n=HD.potN[i]|0; if(!d) continue;
    const t=(d.i||'🧪')+' '+n, c=cd>0&&n>0?cd+' วิ':'';      // cooldown on a second line (::after): the button keeps its width
    if(b.textContent!==t) b.textContent=t; if(b.dataset.cd!==c) b.dataset.cd=c; b.disabled=n<=0; b.classList.toggle('cd',cd>0);
    b.setAttribute('aria-label','ใช้'+d.n+' · เหลือ '+n+(cd>0?' · รออีก '+cd+' วิ':'')+' (ปุ่ม '+(i?'E':'Q')+')'); } }
// two tabs: another tab may have saved since this one read → reload first (lane C svlFresh · svlReload moves G.char to the reloaded
// character through pgLive), take the potion from that, then write at once — a debounced write would meet the other tab's newer
// text, reload instead of writing and hand the drunk potion back
function hdPotUse(i){
  if(!G||!G.char||G.ui||G.over) return; const id=HD.pot[i]; if(!id) return;
  if((G.potT||0)>G.t) return;
  if(P&&P.hp>=P.maxHp){ shLogLine('HP เต็มอยู่แล้ว','',{key:'pot:full'}); return; }
  if(typeof svlFresh==='function') try{ if(svlFresh()) hdPots(true); }catch(e){ console.error(e); }
  if((HD.potN[i]|0)<=0) return;
  if(typeof useConsumable==='function'&&useConsumable(G.char,id)){ if(typeof saveNow==='function') try{ saveNow('potion'); }catch(e){ console.error(e); } hdPots(true); } }

// narrow screens: the core stat line / skill bar keep clear of the potion buttons (body.hd-pot1 / hd-pot2 → padding in 50-shell.css)
function hdPotRoom(n){ try{ const c=document.body.classList; c.toggle('hd-pot1',n===1); c.toggle('hd-pot2',n>=2); }catch(e){} }
function hdHide(){ const b=shEl('hdBox'); if(b) b.hidden=true; hdPotRoom(0); }   // run over (end screen / back in the fort): the 🎒 count and field bars go
function hdEnd(dl,g){
  hdHide(); hdMenuText(g); const r=g&&g.rewards, ch=g&&g.char, rows=r&&ch?hdRewardRows(r,ch):[], se=$('#scrEnd'), et=$('#endTitle');
  if(se) se.classList.toggle('hd-on',!!ch);                           // character runs: solid backdrop (tall end screen over the HUD)
  if(et&&g&&g.retreat) et.classList.remove('lose');
  if(!HD.rew&&rows.length){ HD.rew=shMk('div','box hd-rew'); HD.rew.id='hdRew'; }
  const box=HD.rew; if(!box) return;                                 // classic never creates it
  box.hidden=!rows.length; if(box.hidden) return;
  const host=dl&&dl.parentNode; if(host&&box.previousElementSibling!==host) host.after(box);
  box.textContent=''; box.append(shMk('div','dmg-title','รางวัล'));
  for(const [k,v,c,its,note] of rows){ const d=shMk('div','hd-rr'+(c?' '+c:'')); d.append(shMk('span','',k),shMk('b','',v)); box.append(d);
    if(its&&its.length){ const w=shMk('div','hd-its'+(c==='bad'?' lost':'')), more=its.length-HD_ITS;
      for(const o of its.slice(0,HD_ITS)){ const x=shMk('span','hd-it',o.t); if(o.c) x.style.color=o.c; w.append(x); }
      if(more>0) w.append(shMk('span','hd-it','+ อีก '+more+' อย่าง')); box.append(w); }
    if(note) box.append(shMk('p','hd-note',note)); } }
const HD_ITS=30;                                                      // item chips shown per list (the rest is counted)
function hdRewardRows(r,ch){   // pure: Reward (§7.8) → [label, value, class?, items?, note?]
  const out=[], n=v=>Math.floor(+v||0).toLocaleString('en-US');
  if(!r.committed) out.push(['บันทึก',saveReadOnly()?'ไม่ได้บันทึก · ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป':'ไม่ได้บันทึก','bad']);
  if(r.mode==='survival') out.push(['คลื่นที่ผ่าน',(r.waves|0)+'/'+BAL.SURV.WAVES+' · ระดับนรก T'+(r.tier|0)]);
  if(r.mode!=='trial') out.push(['Base EXP','+'+n(r.baseXp)+(r.daily?' (×2 วันนี้)':'')],['Job EXP','+'+n(r.jobXp)],['ทอง','+'+n((+r.gold||0)+(+r.overGold||0))+(r.daily?' (×2)':'')]);
  if(r.marks) out.push(['ตราผู้พิชิต','+'+n(r.marks)]);
  if(r.lvUp&&ch){ let p=0; for(let L=ch.lv-r.lvUp+1;L<=ch.lv;L++) p+=BAL.statPtsFor(L); out.push(['เลเวลอัป!','Lv '+ch.lv+' · แต้มสถานะ +'+p,'good']); }
  if(r.jobUp&&ch) out.push(['เลเวลอาชีพอัป!','Job '+ch.jlv+' · แต้มสกิล +'+r.jobUp,'good']);
  const I=hdItemGroups(r.items,r.lost,r.stashed), sum=a=>a.reduce((t,o)=>t+o.n,0);
  if(I.got.length) out.push([r.committed?'ของเข้ากระเป๋า':'ของที่เก็บได้',sum(I.got)+' ชิ้น','',I.got]);
  if(I.stashed.length) out.push(['กระเป๋าเต็ม','เข้าคลังแล้ว '+sum(I.stashed)+' ชิ้น','',I.stashed]);
  if(I.lost.length) out.push(['กระเป๋าและคลังเต็ม','หล่นหาย '+sum(I.lost)+' ชิ้น','bad',I.lost,'ขยายกระเป๋า/คลัง หรือขายของที่ร้านป้านวลก่อนออกรอบหน้า']);
  for(const u of r.unlocks||[]){ const [k,v]=String(u).split(':');
    if(k==='survTier'&&(v|0)<=HB_TIER_OPEN) out.push(['ปลดล็อก','ระดับนรก T'+(v|0),'good']);
    else if(k==='trial') out.push(['บททดสอบ','ผ่านแล้ว · เลื่อนอาชีพได้','good']);
    else if(k==='boss'&&MODES.boss&&EN[v]) out.push(['ปลดล็อกบอส',EN[v].n,'good']); }
  return out; }
// pure: Reward items + where lane C put what did not fit (r.stashed: shared stash · r.lost: nowhere) → {got, stashed, lost}:
// [{t, c, n}] · got = items − stashed − lost (instances by uid, stacks / unknown uids by count of that id) · a stack of one id is
// merged · gear is one entry each, rarest first · c = rarity colour or ''
function hdItemGroups(items,lost,stashed){
  const list=(Array.isArray(items)?items:[]).filter(x=>x&&typeof x==='object'), us=new Set(), off=new Map(), offU=new Set(), keep=[];
  for(const it of list) if(typeof it.u==='string') us.add(it.u);
  for(const L of [lost,stashed]) for(const x of Array.isArray(L)?L:[]) if(x&&typeof x==='object'){
    if(typeof x.u==='string'&&us.has(x.u)) offU.add(x.u); else off.set(x.id,(off.get(x.id)||0)+(typeof x.u==='string'?1:Math.max(1,x.n|0))); }
  for(const it of list) if(typeof it.u!=='string'){ let k=Math.max(1,it.n|0); const o=off.get(it.id)||0, d=Math.min(o,k);
    if(d){ off.set(it.id,o-d); k-=d; } if(k>0) keep.push({id:it.id, n:k}); }
  for(const it of list) if(typeof it.u==='string'&&!offU.has(it.u)){ const o=off.get(it.id)||0; if(o>0) off.set(it.id,o-1); else keep.push(it); }
  return {got:hdGroup(keep), stashed:hdGroup(stashed), lost:hdGroup(lost)}; }
function hdGroup(list){ const out=[], st=new Map();
  for(const it of Array.isArray(list)?list:[]){ if(!it||typeof it!=='object') continue; const d=typeof itemDef==='function'?itemDef(it.id):null;
    if(typeof it.u==='string'){ out.push({t:hdItemName(it), c:hdRarC(d), n:1, r:d&&d.slot?d.rar|0:0}); continue; }
    const n=Math.max(1,it.n|0), g=st.get(it.id); if(g){ g.n+=n; continue; } const o={id:it.id, c:'', n, r:-1}; st.set(it.id,o); out.push(o); }
  for(const o of st.values()) o.t=hdItemName({id:o.id, n:o.n});
  return out.sort((a,b)=>b.r-a.r); }
function hdItemName(it){ let s=''; try{ s=it&&it.u?itemName(it):((itemDef(it&&it.id)||{}).n||''); }catch(e){} return (s||String(it&&it.id||'?'))+(it&&it.n>1?' ×'+it.n:''); }
// pause / end buttons say "กลับป้อม" in character runs; classic gets its own words back
// survival: restart (core: startRun, no endRun) drops this run's loot / gold / EXP like กลับป้อม does, so both say so
function hdMenuText(g){ const c=!!(g&&g.char), sv=!!(g&&g.modeId==='survival');
  for(const [id,t] of [['btnMenuP',sv?'กลับป้อม (ไม่รับรางวัล)':'กลับป้อม'],['btnRestartP',sv?'เริ่มใหม่ (ไม่รับรางวัล)':null],['btnMenuE','กลับป้อม']]){ const b=$('#'+id); if(!b) continue;
    if(!(id in SH.txt)) SH.txt[id]=b.textContent; const want=c&&t?t:SH.txt[id]; if(b.textContent!==want) b.textContent=want; } }
function hdPause(box){
  hdMenuText(G); if(!G||!G.char||G.modeId!=='survival'||!box) return;
  box.append(shBtn('🏳\uFE0F ถอยทัพ · รับรางวัล','btn ghost sh-wide',()=>{ if(!G||G.over||G.ui!=='pause') return; G.retreat=true; G.ui=null; show(null); endRun(false); })); }
