/* ================= 52-ui-hub.js · lane B · scrHub, scrChars, scrNew (create), scrSurv, scrSettings ================= */
// Screens render on BUS 'screen'. Data: SAVE via lane C's API (gold is account-wide: Q7). Player names → textContent only.
const HB={tier:0, picked:false, top:-1, cls:'swordsman', t:0, sig:'', csig:''};
const HB_TIER_OPEN=10;                                  // M2: hell tiers T0–T10 (each one still unlocks from the save: wave 10 in the tier below)
const HB_SCR=['scrHub','scrChars','scrNew','scrSurv','scrSettings'];
for(const id of HB_SCR) regScreen(id);
for(const id of HB_SCR.concat(['scrChar','scrTitle'])) UIKEY[id]=shKey;
UIKEY.scrSurv=hbSurvKey;
HUB.push({id:'survival', n:'เอาชีวิตรอด', i:'🛡', order:20, badge:hbSurvBadge, open(){ HB.tier=hbSurvSel(); UI.go('scrSurv'); }});
// §8.3 / §5.1 fort services. A lane may push its own SERVICES entry (same id, npc or name wins); otherwise these call the §7.8
// openers of lane E (53) / the job page of lane P. A tap that opens nothing (an M0 stub) says so instead of doing nothing.
const HB_SVC=[{id:'smith', npc:'ลุงบัณฑ์', n:'ช่างตีเหล็ก', i:'⚒', order:10}, {id:'runes', npc:'แม่หมอศิลา', n:'ผู้จารึกรูน', i:'✦', order:20},
  {id:'shop', npc:'ป้านวล', n:'ร้านป้านวล', i:'🛒', order:30}, {id:'stash', npc:'ผู้เฝ้าคลัง', n:'คลัง', i:'📦', order:40},
  {id:'job', npc:'อาจารย์วาริน', n:'ปรมาจารย์อาชีพ', i:'⚜', order:50}];
const HB_R={scrHub:hbHub, scrChars:hbChars, scrNew:hbNew, scrSurv:hbSurv, scrSettings:hbSet, scrChar:shCharRender, scrTitle:()=>renderTitle()};
const HB_ENTER={scrHub:()=>UI.go(curChar()?'scrSurv':'scrNew'), scrSurv:()=>hbSurvGo(), scrNew:()=>hbCreate()};
BUS.on('screen',(id,a)=>{ const f=HB_R[id]; if(f) f(a); });
BUS.on('char',hbLater); BUS.on('save',hbLater);

// a save rebuilds the hub / list only when what they show changed (a rebuild under a finger loses the tap)
function hbLater(){ if(HB.t) return; HB.t=setTimeout(()=>{ HB.t=0; const c=curScreen();
  if(c==='scrHub'){ if(hbHubSig()!==HB.sig) hbHub(); } else if(c==='scrChars'){ if(hbCharsSig()!==HB.csig) hbChars(); }
  else if(c==='scrChar'){ if(curChar()!==SH.cwCh) shCharRender(); else shCharHead(curChar()); }   // another character object (reload from another tab): whole window
  if(c==='scrHub'||SH_META.includes(c)) shChrome(c); },30); }   // tab-bar badges (points left) follow learn / commit (CR-B1)
function hbOrd(a,b){ return (a.order||0)-(b.order||0); }
function hbRun(d){
  if(d.mine&&d.id!=='job'&&!curChar()){ toast('สร้างตัวละครก่อน','info'); UI.go('scrNew'); return; }
  const was=hbUiSig(); try{ d.open(); }catch(e){ console.error(e); }
  if(d.mine&&hbUiSig()===was) toast(d.n+' ยังไม่เปิดให้บริการ','info'); }
function hbUiSig(){ return [SH.stack.join(','),!!SH.sheet,!!SH.conf,SH.nt,curScreen()].join('|'); }   // did a tap open anything?
function hbSvcFn(id){   // §7.8 openers (typeof: a lane file may be missing in a test build)
  switch(id){
    case 'smith': return typeof openRefine==='function'?()=>openRefine():null;          // no uid → lane E opens its gear picker
    case 'runes': return typeof openRuneScribe==='function'?()=>openRuneScribe():null;
    case 'shop': return typeof openShop==='function'?()=>openShop():null;
    case 'stash': return typeof openStash==='function'?()=>openStash():null;
    case 'job': return shEl('scrJob')?()=>shNavGo('scrJob'):null; }
  return null; }
function hbSvcList(){ const own=SERVICES.filter(d=>d&&typeof d.open==='function'), out=own.slice();
  for(const s of HB_SVC){ if(own.some(d=>d.id===s.id||d.npc===s.npc||d.n===s.n)) continue; const f=hbSvcFn(s.id); if(f) out.push(Object.assign({mine:true, open:f},s)); }
  return out.sort(hbOrd); }
function hbDay(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }   // = svDay()
function hbN(v){ return Math.floor(+v||0).toLocaleString('en-US'); }
function hbPlay(sec){ sec=+sec||0; return sec<3600?Math.round(sec/60)+' นาที':(sec/3600).toFixed(1)+' ชม.'; }
// §6.11 status line · st = svlState() · cs = cloudStatus() (AUTH_ON=false → guest / local)
function hbStatusOf(st,cs){
  st=st||{}; cs=cs||{k:'off'};
  if(st.readonly) return {k:'newer', text:'⛔ ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป · แตะเพื่ออัปเดต', tap:true};
  if(st.sandbox) return {k:'sandbox', text:'🧪 โหมดทดสอบ · ไม่บันทึกลงเครื่อง', tap:false};
  if(st.stored===false) return {k:'nostore', text:'⚠ บันทึกลงเครื่องไม่ได้ · ปิดหน้านี้แล้วความคืบหน้าหาย', tap:false};
  if(cs.k==='off') return {k:'guest', text:'👤 ผู้เยี่ยมชม · บันทึกในเครื่อง', tap:false};
  return {k:cs.k, text:String(cs.text||''), tap:cs.k!=='artifact'}; }
// classic best: runeguard.best (read only, core loadBest) + records imported into the save
function hbClassicBest(){
  const all=Object.assign({},SAVE&&SAVE.acct.records.classic); let live={}; try{ live=loadBest()||{}; }catch(e){}
  for(const k in live){ const o=svHas(CLS,k)?svRecClassic(live[k]):null;   // cleaned like an imported record (a tampered '9e999' → 0)
    if(o&&(!all[k]||o.score>(+all[k].score||0))) all[k]=o; }
  let best=null, id=''; for(const k in all) if(svHas(CLS,k)&&all[k]&&(!best||(+all[k].score||0)>(+best.score||0))){ best=all[k]; id=k; }
  return best&&+best.score>0?hbN(best.score)+' คะแนน ('+CLS[id].n+')':''; }

/* ---------- scrHub ---------- */
function hbHubSig(){ const ch=curChar(), S=SAVE, A=S&&S.acct; if(!A) return ''; let bd='';
  for(const d of HUB) try{ bd+=(d.badge?d.badge():'')+'|'; }catch(e){}
  const st=hbStatusOf(typeof svlState==='function'?svlState():null,typeof cloudStatus==='function'?cloudStatus():null);
  return JSON.stringify([ch&&[ch.id,ch.name,ch.cls,ch.job,ch.lv,ch.xp,ch.jlv,ch.jxp,ch.eq],!!S.ro,A.gold,A.marks,st.text,A.flags.pioneer,A.flags.tips.pioneer,bd,HUB.length,SERVICES.length,hbClassicBest()]); }
function hbClsLine(ch){ const c=CLS[ch&&ch.cls]; if(!c) return ''; return ch.job?shJobName(ch)+' · ขั้นสูงของ'+c.n:c.n+' · ขั้นต้น'; }   // Thai only (no class.e)
function hbHub(){
  const ch=curChar(), S=SAVE, A=S&&S.acct; if(!A) return; HB.sig=hbHubSig();
  hbSyncMute();
  const top=shEl('hbTop'); top.textContent='';
  if(ch){ const me=shBtn('','hb-me',()=>UI.go('scrChars')), t=shMk('span','hb-mt');
    me.setAttribute('aria-label','ตัวละคร '+ch.name+' · แตะเพื่อเปลี่ยน');
    t.append(shMk('b','',ch.name),shMk('small','',hbClsLine(ch)));
    me.append(shPortrait(ch,52),t,shMk('span','hb-dd','▾')); top.append(me,shBars(ch)); }
  else top.append(shMk('p','hb-none',S.ro?'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป':'ยังไม่มีตัวละคร · สร้างได้ '+BAL.CAP.chars+' ตัว'));
  const w=shMk('div','hb-wal'); w.append(shMk('span','','💰 '+hbN(A.gold)+' ทอง'));
  if(A.marks>0||MODES.boss) w.append(shMk('span','','🏅 '+hbN(A.marks)));
  const st=hbStatusOf(typeof svlState==='function'?svlState():null,typeof cloudStatus==='function'?cloudStatus():null);
  const tap=st.k==='newer'?shUpdateApp:st.tap&&typeof uiaStatusTap==='function'?()=>uiaStatusTap():null;
  w.append(tap?shBtn(st.text,'hb-st',tap):shMk('span','hb-st',st.text)); top.append(w);
  const note=shEl('hbNote'), F=A.flags, showP=F.pioneer&&!(F.tips&&F.tips.pioneer); note.textContent=''; note.hidden=!showP;
  if(showP){ const best=hbClassicBest(), x=shBtn('✕','hb-nx',()=>{ F.tips.pioneer=1; saveLocal('tip'); note.hidden=true; }); x.setAttribute('aria-label','ปิด');
    note.append(shMk('b','','ยินดีต้อนรับกลับ!'),shMk('span','','สถิติเดิมอยู่ในโหมดคลาสสิก'+(best?' · สูงสุด '+best:'')),x); }
  const m=shEl('hbModes'); m.textContent='';
  if(!ch&&!S.ro) m.append(shBtn('✦ สร้างตัวละครแรก','btn primary sh-wide',()=>UI.go('scrNew')));
  for(const d of HUB.slice().sort(hbOrd)){ const b=shBtn('','hb-mode',()=>hbRun(d)), t=shMk('span','hb-mt'); let bd='';
    try{ bd=d.badge?d.badge():''; }catch(e){}
    t.append(shMk('b','',d.n)); if(bd) t.append(shMk('small','',bd));
    b.append(shMk('span','hb-mi',d.i||'▶'),t,shMk('span','hb-go','▶')); m.append(b); }
  const sv=shEl('hbSvc'), svc=hbSvcList(); sv.textContent=''; sv.hidden=!svc.length;
  if(svc.length){ sv.append(shMk('h3','','ป้อมรูนทอง'));
    for(const d of svc){ const b=shBtn('','',()=>hbRun(d)), n=String(d.n||''), np=d.npc?String(d.npc):'';
      const pre=np&&n.indexOf(np+' · ')===0, t=pre?n.slice(np.length+3):n;   // 'ลุงบัณฑ์ · ช่างตีเหล็ก' → title + NPC line (§8.3)
      b.append(shMk('b','',(d.i?d.i+' ':'')+t)); if(np&&t.indexOf(np)<0) b.append(shMk('small','',np)); sv.append(b); } }
  const best=hbClassicBest(); shEl('hbClassicSub').textContent='ไม่ใช้ตัวละคร · เกมเดิมทุกอย่าง'+(best?' · สถิติ '+best:'');
  shChrome('scrHub'); }
function hbSyncMute(){ try{ if(loadSettings().mute!==!AU.on) saveSettings({mute:!AU.on}); }catch(e){} }   // keeps M key / pause toggles

/* ---------- scrChars: pick (tap) · delete (hold or 🗑 + hold to confirm) ---------- */
function hbCharsSig(){ const S=SAVE; return S?JSON.stringify([S.active,!!S.ro,S.chars.map(c=>[c.id,c.name,c.cls,c.job,c.lv,c.jlv,hbPlay(c.play),c.kills,c.eq])]):''; }
function hbChars(){
  if(!SAVE) curChar(); const S=SAVE, list=shEl('chList'); if(!S||!list) return; list.textContent=''; HB.csig=hbCharsSig();
  shEl('chTitle').textContent='ตัวละคร ('+S.chars.length+'/'+BAL.CAP.chars+')';
  for(const ch of S.chars){ const on=ch.id===S.active, row=shMk('div','ch-row'), card=shBtn('','ch-card'+(on?' on':'')), t=shMk('span','ch-t');
    t.append(shMk('b','',ch.name),shMk('span','',shJobName(ch)+' · Lv '+ch.lv+' · Job '+ch.jlv),shMk('span','','เล่น '+hbPlay(ch.play)+' · สังหาร '+hbN(ch.kills)));
    card.append(shPortrait(ch,56),t); if(on) card.append(shMk('span','ch-ok','✓')); card.setAttribute('aria-pressed',String(on));
    hbHold(card,()=>{ setActiveChar(ch.id); UI.back(); },()=>hbDel(ch));
    const del=shBtn('🗑','ch-del',()=>hbDel(ch)); del.setAttribute('aria-label','ลบตัวละคร '+ch.name);
    row.append(card,del); list.append(row); }
  if(!S.chars.length) list.append(shMk('p','hint','ยังไม่มีตัวละคร'));
  const n=shEl('chNew'), full=S.chars.length>=BAL.CAP.chars; n.disabled=full||!!S.ro;
  n.textContent=S.ro?'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป':full?'ครบ '+BAL.CAP.chars+' ตัวแล้ว':'+ สร้างตัวละครใหม่'; }
function hbHold(el,tap,hold){ let t=0, held=false;
  const off=()=>{ clearTimeout(t); t=0; el.classList.remove('hold'); };
  el.addEventListener('pointerdown',e=>{ if(e.button>0) return; held=false; off(); el.classList.add('hold'); t=setTimeout(()=>{ t=0; held=true; el.classList.remove('hold'); hold(); },650); });
  for(const ev of ['pointerup','pointerleave','pointercancel']) el.addEventListener(ev,off);
  el.addEventListener('contextmenu',e=>e.preventDefault());
  el.addEventListener('click',()=>{ if(held){ held=false; return; } tap(); }); }
async function hbDel(ch){
  if(!await confirmBox('ลบตัวละคร "'+ch.name+'" ('+shJobName(ch)+' Lv '+ch.lv+')? ลบแล้วกู้คืนไม่ได้'+((ch.rb|0)>0?' · รูนที่ซื้อและย้ายเข้าตัวนี้ '+(ch.rb|0)+' รูนจะหายไปด้วย':''),{hold:1000, okText:'กดค้างเพื่อลบ'})) return;
  if(deleteChar(ch.id)){ toast('ลบ '+ch.name+' แล้ว','good'); hbChars(); } else toast('ลบไม่ได้ในตอนนี้','bad'); }

/* ---------- scrNew: name + class + starting points ---------- */
function hbNew(){
  if(!SAVE) curChar(); const S=SAVE, grid=shEl('nwCls'), inp=shEl('nwName');
  if(!grid.childElementCount) for(const c of CLASSES){ const b=shBtn('','',()=>{ HB.cls=c.id; hbNewCls(); }), cv=document.createElement('canvas');
    b.dataset.id=c.id; b.setAttribute('role','radio'); try{ portrait(cv,c.look,48); }catch(e){} b.append(cv,shMk('span','',c.n)); grid.append(b); }
  inp.value=''; hbNewCount(); hbNewCls();
  const ro=!!(S&&S.ro), full=!!S&&S.chars.length>=BAL.CAP.chars; shEl('nwGo').disabled=ro||full;
  shEl('nwErr').textContent=ro?'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป สร้างตัวละครไม่ได้':full?'สร้างได้สูงสุด '+BAL.CAP.chars+' ตัว':''; }
function hbNewCount(){ shEl('nwCount').textContent=Array.from(shEl('nwName').value).length+'/16'; }
function hbPreset(id){ const p=PRESETS[id]||{}; return STAT_ORDER.filter(k=>p[k]).map(k=>STATS[k].n+' '+p[k]).join(' · '); }
function hbNewCls(){ const c=CLS[HB.cls]||CLASSES[0], r=c.rating, sk=SK[c.skills[0]], pips=n=>'●'.repeat(n)+'○'.repeat(5-n);
  for(const b of shEl('nwCls').children) b.setAttribute('aria-checked',String(b.dataset.id===c.id));
  shEl('nwInfo').innerHTML=`<h3>${esc(c.n)} <small>${esc(c.e)}</small></h3><p>${esc(c.d)}</p>`
    +`<p class="nw-rt">พลังชีวิต ${pips(r.hp)} · พลังโจมตี ${pips(r.atk)}<br>ความเร็ว ${pips(r.spd)} · ระยะโจมตี ${pips(r.rng)}</p>`
    +`<p>สกิลแรก ${esc(sk.i+' '+sk.n)} ★1 · แต้มสกิลเริ่มต้น ${BAL.START_SP|0}</p><p>แต้มสถานะแนะนำ: ${esc(hbPreset(c.id))}</p><p>เลื่อนอาชีพที่ Base 20: ${esc(c.adv.map(a=>a.n).join(' หรือ '))}</p>`; }
function hbCreate(){
  const err=shEl('nwErr'), r=createChar(shEl('nwName').value,HB.cls);
  if(typeof r==='string'||!r){ err.textContent=r||'สร้างตัวละครไม่ได้'; return; }
  if(shEl('nwAuto').checked&&PRESETS[r.cls]) commitStats(r,Object.assign({},PRESETS[r.cls]));
  toast('สร้าง '+r.name+' แล้ว · ยินดีต้อนรับสู่ป้อมรูนทอง','good'); UI.home(); }

/* ---------- scrSurv: hell tier T0–T10 · ◀ ▶ + a tier grid (lock state from the save: acct.survTier) ---------- */
const HB_BAG_LOW=10;                                    // fewer free bag entries than this → say where the overflow goes before a run
function hbSurvInfo(ch,T,A,day){   // pure: §2.2 tier row + this character's full-clear estimate
  const S=BAL.SURV, rec=S.recLv(T), gpw=S.goldPerWave(T), L=ch?ch.lv|0:1, over=S.overLv(L,rec);
  const exp=Math.round(BAL.bxpNeed(rec)*S.expMul(S.WAVES,true)*over), r=ch&&A&&A.records.survival[ch.id];
  const top=typeof IT_MAXT==='number'?IT_MAXT:5, gear=Math.min(S.gearTier(T),top);   // tiers above the shipped ones drop the highest shipped
  return {T, rec, hp:S.hpMul(T), dmg:S.dmgMul(T), gpw, gear, gear20:Math.min(S.gearTier(T)+1,top), over, exp, lvs:hbLvGain(ch,exp), gold:gpw*(S.WAVES+S.winGoldWaves),
    daily:!(A&&A.daily.day===day&&A.daily.surv[T]), open:T<=HB_TIER_OPEN, unlocked:!!A&&T<=(A.survTier|0), record:r&&r[String(T)]||null}; }
function hbLvGain(ch,exp){ let L=ch?ch.lv|0:1, x=(ch?ch.xp|0:0); const p=L+x/BAL.bxpNeed(L); x+=exp;   // levels gained (fraction)
  while(L<BAL.CAP.base&&x>=BAL.bxpNeed(L)){ x-=BAL.bxpNeed(L); L++; } return L>=BAL.CAP.base?BAL.CAP.base-p:L+x/BAL.bxpNeed(L)-p; }
function hbTier0(){ const A=SAVE&&SAVE.acct; return Math.max(0,Math.min(A?A.survTier|0:0,HB_TIER_OPEN,BAL.SURV.maxT)); }
function hbLockWhy(T,top){ const w=BAL.SURV.unlockWave;   // §2.2: the next tier opens at wave 10 of the tier below
  return T===top+1?'🔒 ไปให้ถึงคลื่น '+w+' ในระดับ T'+(T-1)+' เพื่อปลด\u2060ล็อก':'🔒 ปลดทีละระดับ · ตอนนี้ไปให้ถึงคลื่น '+w+' ในระดับ T'+top+' ก่อน'; }
// the tier the survival screen opens on (= what the hub card says): the session pick, until a new tier unlocks → the highest one
function hbSurvSel(){ const top=hbTier0(); if(top!==HB.top){ HB.top=top; HB.picked=false; } return HB.picked?clamp(HB.tier|0,0,BAL.SURV.maxT):top; }
function hbSurvBadge(){ const ch=curChar(); if(!ch) return 'ต้องมีตัวละครก่อน'; const T=hbSurvSel();
  return 'ระดับนรก T'+T+(T>HB.top?' 🔒':hbSurvInfo(ch,T,SAVE.acct,hbDay()).daily?' · ✦ โบนัสวันนี้ ×2':''); }
function hbSurvPick(T){ T=T|0; if(T<0||T>BAL.SURV.maxT) return; HB.tier=T; HB.picked=true; hbSurv(); }
function hbSurvKey(e){   // ← → change the tier (desktop) · Escape = back
  if(!G&&!SH.sheet&&!SH.conf&&(e.code==='ArrowLeft'||e.code==='ArrowRight')){ hbSurvPick((HB.tier|0)+(e.code==='ArrowLeft'?-1:1)); e.preventDefault(); return true; }
  return shKey(e); }
function hbSurvGrid(A,T){
  const g=shEl('svGrid'), S=BAL.SURV; if(!g) return;
  if(g.childElementCount!==S.maxT+1){ g.textContent='';
    for(let t=0;t<=S.maxT;t++){ const b=shBtn('','sv-c',()=>hbSurvPick(t)); b.append(shMk('b','','T'+t),shMk('small','')); g.append(b); } }
  for(let t=0;t<=S.maxT;t++){ const b=g.children[t], open=t<=HB_TIER_OPEN&&t<=(A.survTier|0), rec=S.recLv(t);
    b.classList.toggle('lk',!open); b.setAttribute('aria-pressed',String(t===T));
    b.children[1].textContent=open?'Lv '+rec:'🔒';
    b.setAttribute('aria-label','ระดับนรก T'+t+' · แนะนำ Lv '+rec+(open?'':' · ยังล็อก')); } }
function hbSurv(){
  const ch=curChar(), A=SAVE&&SAVE.acct, body=shEl('svBody'), go=shEl('svGo'); if(!A) return;
  const S=BAL.SURV, T=HB.tier=clamp(HB.tier|0,0,S.maxT), I=hbSurvInfo(ch,T,A,hbDay()), top=hbTier0();
  shEl('svT').textContent='T'+T; shEl('svOpen').textContent='ปลดแล้วถึง T'+top;
  shEl('svPrev').disabled=T<=0; shEl('svNext').disabled=T>=S.maxT; hbSurvGrid(A,T); body.textContent='';
  if(ch){ const who=shMk('div','sv-who'), t=shMk('span','');
    t.append(shMk('b','',ch.name),shMk('small','',shJobName(ch)+' · Lv '+ch.lv)); who.append(shPortrait(ch,40),t,shBtn('เปลี่ยน','btn ghost',()=>UI.go('scrChars'))); body.append(who); }
  const low=!!ch&&ch.lv<I.rec-5;
  const rows=[['เลเวลแนะนำ','Lv '+I.rec+(low?' · ตัวนี้ Lv '+ch.lv+' (ต่ำกว่ามาก)':''),low?'bad':''],
    ['ศัตรู','HP ×'+I.hp.toFixed(1)+' · ดาเมจ ×'+I.dmg.toFixed(2)],['ทอง',I.gpw+' ต่อคลื่น'],
    ['ชนะครบ 20 คลื่น','EXP '+hbN(I.exp)+(I.lvs>=.05?' (≈ '+I.lvs.toFixed(1)+' เลเวล)':'')+' · ทอง '+hbN(I.gold)],
    ['โบนัสวันนี้',I.daily?'✦ ×2 เมื่อถึงคลื่น 10 (ยังไม่ใช้)':'ใช้แล้ววันนี้'],
    ['สถิติ',I.record?'คลื่น '+I.record.wave+' · '+hbN(I.record.kills)+' ตัว'+(I.record.won?' · ชนะ':''):'ยังไม่มี']];
  if(I.over<1) rows.splice(4,0,['EXP ลดลง','×'+I.over.toFixed(2)+' เพราะเลเวลเกินแนะนำ +5','bad']);
  if(Object.keys(BAL.DROP.surv||{}).length) rows.splice(3,0,['ของที่ดรอป','อุปกรณ์ขั้น '+I.gear+' · ผงรูน · เศษรูน'],['บอสคลื่น 5–20','อุปกรณ์ · ผลึกรูน · คลื่น 20: ขั้น '+I.gear20]);
  if(ch&&typeof itBagFree==='function'){ const f=itBagFree(ch), m=itBagMax(ch), sf=typeof itStashFree==='function'?itStashFree(A):0;   // overflow: bag → stash → lost (lane C)
    rows.push(['กระเป๋า','ว่าง '+f+'/'+m+' ช่อง'+(f>=HB_BAG_LOW?'':sf>0?' · ที่เกินเข้าคลัง (ว่าง '+sf+')':' · คลังก็เต็ม ที่เกินจะหล่นหาย'),f<HB_BAG_LOW&&!sf?'bad':'']); }
  // the lock reason goes above the table: at the end of the list the sticky Start button would cover it until scrolled down
  if(!I.open) body.append(shMk('p','sv-lock','🔒 ระดับนรกนี้จะเปิดในอัปเดตถัดไป'));
  else if(!I.unlocked) body.append(shMk('p','sv-lock',hbLockWhy(T,top)));
  const tbl=shMk('div','sv-tbl'); for(const [k,v,c] of rows){ const r=shMk('div','sv-row'+(c?' '+c:'')); r.append(shMk('span','',k),shMk('b','',v)); tbl.append(r); } body.append(tbl);
  body.append(shMk('p','hint','ตายก่อนจบก็ยังได้ EXP ทอง และของที่เก็บได้ · ความชำนาญเริ่ม Lv 1 ทุกรอบ'));
  const can=I.open&&I.unlocked; go.disabled=!!ch&&!can; go.textContent=!ch?'สร้างตัวละครก่อน':can?'เริ่ม · ระดับนรก T'+T:'🔒 ยังไม่ปลดล็อก T'+T; }
function hbSurvGo(){
  const ch=curChar(); if(!ch){ UI.go('scrNew'); return; }
  const I=hbSurvInfo(ch,HB.tier,SAVE.acct,hbDay()); if(!I.open||!I.unlocked) return;
  closeSheet(); shChrome(null); startRun(ch.cls,'survival',{char:ch, tier:HB.tier}); }

/* ---------- scrSettings (the account part is lane N's scrAccount, only while AUTH_ON) ---------- */
function hbSet(){
  const L=shEl('stList'), s=loadSettings(); L.textContent='';
  const row=(label,...ctl)=>{ const r=shMk('div','st-row'); r.append(shMk('span','',label),...ctl); L.append(r); return r; };
  const seg=shMk('div','seg st-seg'); seg.setAttribute('role','group'); seg.setAttribute('aria-label','คุณภาพภาพ');
  for(const [q,n] of [['auto','อัตโนมัติ'],['low','ต่ำ'],['mid','กลาง'],['high','สูง']]){ const b=shBtn(n,'',()=>{ setQuality(q); hbSet(); }); b.setAttribute('aria-pressed',String(QUAL.mode===q)); seg.append(b); }
  row('คุณภาพภาพ'+(QUAL.mode==='auto'?' (ตอนนี้: '+['ต่ำ','กลาง','สูง'][QUAL.level]+')':''),seg);
  row('เสียง',hbTog(AU.on,()=>{ toggleMute(); saveSettings({mute:!AU.on}); hbSet(); }));
  row('สั่นเมื่อยืนยัน',hbTog(s.haptics,()=>{ saveSettings({haptics:!s.haptics}); hbSet(); }));
  if(MODES.field){   // field options appear with the mode (M4)
    const p=shMk('div','seg st-seg'); for(const v of [0,.25,.35,.5]){ const b=shBtn(v?Math.round(v*100)+'%':'ปิด','',()=>{ saveSettings({autoPot:v}); hbSet(); }); b.setAttribute('aria-pressed',String(Math.abs(s.autoPot-v)<.001)); p.append(b); }
    row('ใช้ยาอัตโนมัติเมื่อ HP ต่ำกว่า',p);
    row('เปิดการ์ดทันทีในทุ่ง',hbTog(s.cardAuto,()=>{ saveSettings({cardAuto:!s.cardAuto}); hbSet(); })); }
  row('เซฟในเครื่อง',shBtn('ส่งออก','btn ghost',hbExport),shBtn('นำเข้า','btn ghost',hbImport));
  if(typeof AUTH_ON!=='undefined'&&AUTH_ON&&typeof uiaOpenAccount==='function') row('บัญชีออนไลน์',shBtn('เปิด ›','btn ghost',()=>uiaOpenAccount()));
  L.append(shMk('p','st-ver','Runeguard '+(typeof SV_APP==='string'?SV_APP:'')+' · ข้อมูลเก็บในเครื่องนี้')); }
function hbTog(on,fn){ const b=shBtn(on?'เปิด':'ปิด','st-tg',fn); b.setAttribute('aria-pressed',String(!!on)); return b; }
function hbExport(){
  const j=exportSave(), box=shMk('div','sh-col'), ta=shMk('textarea','sh-ta'); ta.readOnly=true; ta.name='rgExport'; ta.value=j; ta.setAttribute('aria-label','ข้อความเซฟ');
  box.append(shMk('p','hint','เก็บไฟล์นี้ไว้ แล้วใช้ [นำเข้า] บนเครื่องอื่นหรือหลังล้างเครื่องได้'),ta,
    shBtn('ดาวน์โหลดไฟล์ .json','btn primary sh-wide',()=>hbDownload(j)),
    shBtn('คัดลอกข้อความ','btn ghost sh-wide',()=>{ const ok=()=>toast('คัดลอกแล้ว','good'), no=()=>{ ta.focus(); ta.select(); toast('เลือกข้อความไว้แล้ว กดคัดลอกเอง','info'); };
      try{ navigator.clipboard.writeText(j).then(ok,no); }catch(e){ no(); } }));
  sheet(box,{title:'ส่งออกเซฟ'}); }
function hbDownload(j){ try{ const u=URL.createObjectURL(new Blob([j],{type:'application/json'})), a=document.createElement('a');
  a.href=u; a.download='runeguard-save-'+hbDay()+'.json'; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),2000); }
  catch(e){ toast('ดาวน์โหลดไม่ได้ ใช้ปุ่มคัดลอกแทน','bad'); } }
function hbImport(){
  const box=shMk('div','sh-col'), ta=shMk('textarea','sh-ta'), out=shMk('p','nw-err'), f=document.createElement('input');
  ta.name='rgImport'; f.name='rgImportFile'; ta.placeholder='วางข้อความเซฟที่นี่ หรือเลือกไฟล์ .json'; ta.setAttribute('aria-label','ข้อความเซฟ'); f.type='file'; f.accept='.json,application/json'; f.hidden=true;
  f.addEventListener('change',()=>{ const x=f.files&&f.files[0]; if(!x) return; if(x.size>256*1024){ out.textContent='ไฟล์ใหญ่เกิน 256 KB'; return; }
    const rd=new FileReader(); rd.onload=()=>{ ta.value=String(rd.result||''); out.textContent=''; }; rd.onerror=()=>{ out.textContent='อ่านไฟล์ไม่ได้'; }; rd.readAsText(x); });
  box.append(shMk('p','hint','นำเข้าแล้วเซฟในเครื่องตอนนี้จะถูกแทนที่ · ถ้าอยากเก็บไว้ ให้ [ส่งออก] ก่อน (สำรองอัตโนมัติจะถูกแทนเมื่อบันทึกครั้งถัดไป)'),ta,out,f,shBtn('เลือกไฟล์ .json','btn ghost sh-wide',()=>f.click()),
    shBtn('นำเข้า','btn primary sh-wide',async()=>{ const j=ta.value; if(!j.trim()){ out.textContent='ยังไม่มีข้อมูลเซฟ'; return; }
      if(!await confirmBox('แทนที่เซฟในเครื่องด้วยข้อมูลนี้? เซฟเดิมจะหายไป ถ้ายังไม่ได้ส่งออกเก็บไว้',{okText:'นำเข้า'})) return;
      const r=importSave(j); if(r.ok){ closeSheet(); if(r.warn) toast(r.warn,'bad'); else toast('นำเข้าเซฟแล้ว','good'); UI.home(); } else out.textContent=r.err||'นำเข้าไม่ได้'; }));
  sheet(box,{title:'นำเข้าเซฟ'}); }

/* ---------- once, from shBoot (runtime) ---------- */
function hbBoot(){
  if(loadSettings().mute&&AU.on) toggleMute();
  curChar(); HB.tier=hbTier0();
  shEl('hbClassic').addEventListener('click',()=>UI.go('scrTitle'));
  shEl('chNew').addEventListener('click',()=>UI.go('scrNew'));
  const inp=shEl('nwName'); inp.addEventListener('input',()=>{ hbNewCount(); shEl('nwErr').textContent=''; });
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); hbCreate(); } });
  shEl('nwGo').addEventListener('click',hbCreate);
  shEl('svPrev').addEventListener('click',()=>hbSurvPick((HB.tier|0)-1));
  shEl('svNext').addEventListener('click',()=>hbSurvPick((HB.tier|0)+1));
  shEl('svGo').addEventListener('click',hbSurvGo); }

/* ---------- account upgrades (gold · BAL.UP · buyUpgrade in 42) — a fort service, every character shares them ---------- */
SERVICES.push({id:'upgrade', npc:'ปู่ทองดี', n:'ปู่ทองดี · อัปเกรดถาวร', i:'🌟', order:15, open(){ hbUpOpen(); }});
function hbUpOpen(){ const box=shMk('div','hb-up'); hbUpFill(box); sheet(box,{title:'🌟 อัปเกรดถาวร (ทุกตัวละคร)'}); }
function hbUpFill(box){
  box.textContent=''; const A=SAVE&&SAVE.acct, U=BAL.UP, fmt=n=>Math.floor(+n||0).toLocaleString('en-US');
  box.append(shMk('p','hb-up-gold','ทองของบัญชี: '+fmt(A?A.gold:0)+' · ใช้ได้ทุกโหมดยกเว้นคลาสสิก'));
  for(const k of U.order){ const d=U.def[k], lv=pgUpLv(k), cost=upCost(k), row=shMk('div','hb-up-row');
    const pct=v=>(Math.round(v*1000)/10)+'%', now=(d.base||0)+lv*d.per, nx=(d.base||0)+(lv+1)*d.per;   // base: a rate that starts above 0 (stat power 0.5%)
    row.append(shMk('span','hb-up-i',d.i));
    const mid=shMk('div','hb-up-m'); mid.append(shMk('b',null,d.n+' · ขั้น '+lv+'/'+U.max));
    const pre=d.base?'ต่อแต้ม ':'+', fm=d.m?(v=>(Math.round(v/d.per*d.m*10)/10)+' ม.'):pct;   // d.m: shown in metres (pickup range)
    mid.append(shMk('span','hb-up-v',lv>=U.max?pre+fm(now)+' (เต็มแล้ว)':pre+fm(now)+' → '+(d.base?'':'+')+fm(nx)));
    const bar=shMk('i','hb-up-bar'); bar.style.setProperty('--p',String(lv/U.max)); mid.append(bar); row.append(mid);
    const b=shBtn(cost?fmt(cost)+' ทอง':'เต็ม','uc-b pri',()=>{ const r=buyUpgrade(k);
      if(r) toast(r,'bad'); else { toast(d.n+' ขั้น '+pgUpLv(k)+' แล้ว','good'); try{ initAudio(); tone(880,.12,'triangle',.08); tone(1320,.2,'sine',.06,0,.08); }catch(e){} }
      hbUpFill(box); });
    b.disabled=!cost||!A||(A.gold|0)<cost; row.append(b); box.append(row); }
  box.append(shMk('p','hb-up-note','ซื้อได้เฉพาะตอนอยู่ในป้อม · ค่าที่ได้รวมในหน้าพักเกมแล้ว')); }
