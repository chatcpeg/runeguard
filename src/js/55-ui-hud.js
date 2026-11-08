/* ================= 55-ui-hud.js · lane B · HUD of character modes (EXP bar, card button, log), rewards on scrEnd, pause extras ================= */
// UIX.hud = end of core updateHUD, every frame: classic (no G.char) costs two compares and changes nothing. Character runs (§8.13):
// first-run tip, ★ cap line on level-up cards, loot in the log, field EXP/Job bars, card button (cards:'manual'). Rewards: endExtra.
const HD={g:null, cards:null, bars:false, manual:false, auto:false, n:-1, xr:-1, jr:-1, lv:0, jl:0, loot:0, rew:null, wired:false};
UIX.hud=hdTick; UIX.endExtra=hdEnd; UIX.pauseExtra=hdPause;

function hdTick(){
  if(HD.g!==G) hdStart();
  if(!G.char) return;
  if(G.ui==='level'&&G.choices!==HD.cards) hdCards();
  if(G.loot&&G.loot.length>HD.loot){ for(let i=HD.loot;i<G.loot.length;i++) sysLog('ได้รับ '+hdItemName(G.loot[i]),'good'); HD.loot=G.loot.length; }
  if(HD.bars) hdBars();
  if(HD.manual) hdCardBtn(); }
function hdStart(){   // first HUD frame of a run
  HD.g=G; HD.cards=null; HD.n=-1; HD.xr=HD.jr=-1; HD.loot=G.loot?G.loot.length:0; SH.lastMode=G.modeId; shChrome(null);
  const ch=G.char, box=shEl('hdBox'); HD.bars=!!ch&&G.modeId==='field'; HD.manual=!!ch&&G.mode.cards==='manual';
  HD.auto=HD.manual&&!!loadSettings().cardAuto;
  if(box){ box.hidden=!(HD.bars||HD.manual); shEl('hdBars').hidden=!HD.bars; shEl('hdCard').hidden=true;
    if(!HD.wired){ HD.wired=true; shEl('hdCard').addEventListener('click',()=>{ if(G&&!G.ui&&!G.over) G.cardReq=true; }); } }
  if(ch&&G.charTip&&!G.auto) toast(G.charTip,'info'); }
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

function hdEnd(dl,g){
  hdMenuText(g); const r=g&&g.rewards, ch=g&&g.char, rows=r&&ch?hdRewardRows(r,ch):[], se=$('#scrEnd'), et=$('#endTitle');
  if(se) se.classList.toggle('hd-on',!!ch);                           // character runs: solid backdrop (tall end screen over the HUD)
  if(et&&g&&g.retreat) et.classList.remove('lose');
  if(!HD.rew&&rows.length){ HD.rew=shMk('div','box hd-rew'); HD.rew.id='hdRew'; }
  const box=HD.rew; if(!box) return;                                 // classic never creates it
  box.hidden=!rows.length; if(box.hidden) return;
  const host=dl&&dl.parentNode; if(host&&box.previousElementSibling!==host) host.after(box);
  box.textContent=''; box.append(shMk('div','dmg-title','รางวัล'));
  for(const [k,v,c] of rows){ const d=shMk('div','hd-rr'+(c?' '+c:'')); d.append(shMk('span','',k),shMk('b','',v)); box.append(d); } }
function hdRewardRows(r,ch){   // pure: Reward (§7.8) → [label, value, class?]
  const out=[], n=v=>Math.floor(+v||0).toLocaleString('en-US'), lost=r.lost||[];
  if(!r.committed) out.push(['บันทึก',saveReadOnly()?'ไม่ได้บันทึก · ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป':'ไม่ได้บันทึก','bad']);
  if(r.mode==='survival') out.push(['คลื่นที่ผ่าน',(r.waves|0)+'/'+BAL.SURV.WAVES+' · ระดับนรก T'+(r.tier|0)]);
  if(r.mode!=='trial') out.push(['Base EXP','+'+n(r.baseXp)+(r.daily?' (×2 วันนี้)':'')],['Job EXP','+'+n(r.jobXp)],['ทอง','+'+n((+r.gold||0)+(+r.overGold||0))+(r.daily?' (×2)':'')]);
  if(r.marks) out.push(['ตราผู้พิชิต','+'+n(r.marks)]);
  if(r.lvUp&&ch){ let p=0; for(let L=ch.lv-r.lvUp+1;L<=ch.lv;L++) p+=BAL.statPtsFor(L); out.push(['เลเวลอัป!','Lv '+ch.lv+' · แต้มสถานะ +'+p,'good']); }
  if(r.jobUp&&ch) out.push(['เลเวลอาชีพอัป!','Job '+ch.jlv+' · แต้มสกิล +'+r.jobUp,'good']);
  const got=(r.items||[]).filter(it=>lost.indexOf(it)<0); if(got.length) out.push(['ของ',got.map(hdItemName).join(' · ')]);
  if(lost.length) out.push(['กระเป๋าเต็ม','ตกหล่น '+lost.length+' ชิ้น','bad']);
  for(const u of r.unlocks||[]){ const [k,v]=String(u).split(':');
    if(k==='survTier'&&(v|0)<=HB_TIER_OPEN) out.push(['ปลดล็อก','ระดับนรก T'+(v|0),'good']);
    else if(k==='trial') out.push(['บททดสอบ','ผ่านแล้ว · เลื่อนอาชีพได้','good']);
    else if(k==='boss'&&MODES.boss&&EN[v]) out.push(['ปลดล็อกบอส',EN[v].n,'good']); }
  return out; }
function hdItemName(it){ let s=''; try{ s=it&&it.u?itemName(it):((itemDef(it&&it.id)||{}).n||''); }catch(e){} return (s||String(it&&it.id||'?'))+(it&&it.n>1?' ×'+it.n:''); }
// pause / end buttons say "กลับป้อม" in character runs; classic gets its own words back
function hdMenuText(g){ const c=!!(g&&g.char);
  for(const [id,t] of [['btnMenuP',g&&g.modeId==='survival'?'กลับป้อม (ไม่รับรางวัล)':'กลับป้อม'],['btnMenuE','กลับป้อม']]){ const b=$('#'+id); if(!b) continue;
    if(!(id in SH.txt)) SH.txt[id]=b.textContent; const want=c?t:SH.txt[id]; if(b.textContent!==want) b.textContent=want; } }
function hdPause(box){
  hdMenuText(G); if(!G||!G.char||G.modeId!=='survival'||!box) return;
  box.append(shBtn('🏳 ถอยทัพ · รับรางวัล','btn ghost sh-wide',()=>{ if(!G||G.over||G.ui!=='pause') return; G.retreat=true; G.ui=null; show(null); endRun(false); })); }
