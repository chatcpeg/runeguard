/* ================= 55-ui-hud.js · lane B · HUD of character modes (EXP bar, card button, log), rewards on scrEnd, pause extras ================= */
// UIX.hud = end of core updateHUD, every frame: classic (no G.char) costs two compares and changes nothing. Character runs (§8.13):
// first-run tip, ★ cap line on level-up cards, loot in the log + a 🎒 count (fixed layer: no layout shift), field EXP/Job bars,
// card button (cards:'manual'). Rewards + items gained / dropped for a full bag: endExtra. Item names → textContent only.
const HD={g:null, cards:null, bars:false, manual:false, auto:false, n:-1, xr:-1, jr:-1, lv:0, jl:0, loot:0, rew:null, wired:false,
  got:0, free:0, sfree:0, need:0, full:0, seen:null, pot:[null,null], potN:[0,0], potCd:-1, potSig:'', potWired:false};
UIX.hud=hdTick; UIX.endExtra=hdEnd; UIX.pauseExtra=hdPause;

/* ---------- skill bar cooldown clock (every mode) · card details: concrete numbers (every mode) ---------- */
const HD_NOCD={passive:1, orbit:1, aura:1};
function hdCdBar(){
  const bar=document.getElementById('skillBar'); if(!bar||!P||!Array.isArray(P.skills)||typeof cdOf!=='function') return;
  P.skills.forEach((s,i)=>{ const n=bar.children[i]; if(!n||!s||!s.def) return;
    const cd=HD_NOCD[s.def.type]||pv(s,'cd')==null?0:cdOf(s), f=cd>0?Math.max(0,Math.min(1,(s.cdT||0)/cd)):0, q=Math.round(f*40)/40;
    if(n.__cdq!==q){ n.__cdq=q; n.style.setProperty('--cd',String(q)); n.classList.toggle('cd',q>0); }
    const left=f>0?s.cdT:0, lt=left>=1?String(Math.ceil(left)):left>0&&cd>=1?(Math.ceil(left*10)/10).toFixed(1):'';   // seconds left on long cooldowns
    if(n.__cdt!==lt){ n.__cdt=lt; if(lt) n.dataset.cd=lt; else delete n.dataset.cd; } }); }
// stat card: what +1 of this stat does to THIS character right now. It really adds the card (recalc), reads every number,
// and puts everything back (HP too) — so card 6+ (half), the caps, main-stat power and milestones are always exactly the game's
function hdSnap(){ return {mi:P.might, ar:P.area, du:P.durMul, cd:P.cdMul, ep:P.extraProj, hp:P.maxHp, rg:P.regen, sp:P.speed, cr:P.crit, cm:P.critMult, mg:P.magnet, xp:P.xpMul, sk:P.skills.map(s=>new Map(hdSkillLines(s)))}; }
function hdTry(k,f){ const hp=P.hp; P.stats[k]=(P.stats[k]|0)+1; try{ recalc(P); return f(); } finally{ P.stats[k]--; recalc(P); P.hp=hp; } }
function hdStatEffect(k){
  const a=hdSnap(), b=hdTry(k,hdSnap), L=[], cut=v=>String(v).split(' (')[0], pc=v=>Math.round(v*1000)/10+'%';
  // milestones (character runs): reached by this very card, else the nearest ones
  if(P.sx&&typeof SX!=='undefined'){ const have=P.stats[k]|0, now=[];
    const nx=sxNext(P,k); for(const x of nx) if(x.n===1) now.push(x.s.def.n+': '+x.t);               // mastery tiers (26a) + old milestones
    for(const t of now) L.push({t:'★ ใบนี้: '+t, c:'ms'});
    if(!now.length) for(const x of nx.slice(0,2)) L.push({t:'อีก '+x.n+' ใบ: '+x.s.def.n+' '+x.t, c:'soon'});
    const us=P.skills.filter(s=>SX.main[s.id]===k); if(us.length&&typeof mxLv==='function') L.push({t:'ความชำนาญ '+us.map(s=>s.def.n+' Lv '+mxLv(P,s)+' → '+(mxLv(P,s)+1)).join(' · ')+' (แรง +4%/ระดับ)', c:'note'}); }
  const g=[];
  if(b.mi!==a.mi) g.push('ดาเมจรวม ×'+HD_N(a.mi)+' → ×'+HD_N(b.mi)); if(b.ar!==a.ar) g.push('พื้นที่ ×'+HD_N(a.ar)+' → ×'+HD_N(b.ar));
  if(b.du!==a.du) g.push('ระยะเวลา ×'+HD_N(a.du)+' → ×'+HD_N(b.du)); if(b.cd!==a.cd) g.push('คูลดาวน์ ×'+HD_N(a.cd)+' → ×'+HD_N(b.cd));
  if(b.ep!==a.ep) g.push('กระสุนเพิ่ม +'+a.ep+' → +'+b.ep);
  if(b.hp!==a.hp) g.push('HP '+Math.ceil(a.hp)+' → '+Math.ceil(b.hp)); if(b.rg!==a.rg) g.push('ฟื้น '+HD_N(a.rg)+' → '+HD_N(b.rg)+'/วิ');
  if(b.sp!==a.sp) g.push('เดิน '+Math.round(a.sp)+' → '+Math.round(b.sp)); if(b.cr!==a.cr) g.push('คริ '+pc(a.cr)+' → '+pc(b.cr));
  if(b.cm!==a.cm) g.push('แรงคริ ×'+HD_N(a.cm)+' → ×'+HD_N(b.cm)); if(b.mg!==a.mg) g.push('ดูดของ '+Math.round(a.mg)+' → '+Math.round(b.mg));
  if(b.xp!==a.xp) g.push('EXP ×'+HD_N(a.xp)+' → ×'+HD_N(b.xp));
  if(g.length) L.push(g.join(' · '));
  P.skills.forEach((s,i)=>{ const x=a.sk[i], y=b.sk[i], ch=[];
    for(const [key,v] of y){ const o=x.get(key); if(o!=null&&cut(o)!==cut(v)) ch.push(key+' '+cut(o)+' → '+cut(v)); else if(o==null) ch.push(key+' '+cut(v)); }
    if(ch.length) L.push(s.def.n+': '+ch.slice(0,3).join(' · ')); });
  if(!L.length) L.push({t:'ถึงเพดานของค่านี้แล้ว · ไม่มีผลเพิ่ม', c:'note'});
  return L; }
function hdCardInfo(){
  const box=$('#lvCards'); if(!box||!G.choices) return; HD.info=G.choices;
  G.choices.forEach((o,i)=>{ const c=box.children[i]; if(!c||c.querySelector('.hd-ci')) return; let lines=[];
    if(typeof tfCardQ==='function') tfCardQ(c,o);                        // ? → full details of this card (59)
    if(o.k==='new') lines=hdSkillLines(makeSkill(o.id)).map(([k,v])=>k+' '+String(v).split(' (')[0]);
    else if(o.k==='up'||o.k==='evo'){ const t=hdNextText(o.s,o.k), cd=hdSkillLines(o.s).find(x=>x[0]==='คูลดาวน์');
      if(t) lines.push(...t.replace(/^[^:]*: /,'').split(' · '));
      if(cd&&!(t&&t.indexOf('คูลดาวน์')>=0)) lines.push('คูลดาวน์ '+String(cd[1]).split(' (')[0]+' (ไม่เปลี่ยน)'); }
    else if(o.k==='stat'){ lines=hdStatEffect(o.stat); const ds=c.querySelector('.ds');
      if(P.sx&&ds&&typeof MX_CARD!=='undefined'&&MX_CARD[o.stat]) ds.textContent=MX_CARD[o.stat]; }   // character runs: mastery card text (26a)
    if(o.k==='up'){ const df=c.querySelector('.df'), have=df?df.textContent:'', mod=P.might!==1||P.area!==1||P.durMul!==1||P.cdMul!==1||P.extraProj>0;
      lines=lines.filter(t=>have.indexOf(t)<0&&(mod||/^คูลดาวน์/.test(t)&&have.indexOf('คูลดาวน์')<0)); }   // core diffText already says it (no stat bonus yet) → don't repeat
    if(!lines.length) return; const d=document.createElement('span'); d.className='hd-ci';
    if(o.k==='up'&&!/^คูลดาวน์.*ไม่เปลี่ยน/.test(lines[0]||'')) d.append(Object.assign(document.createElement('em'),{textContent:'ค่าจริงรวมสถานะ'}));
    for(const t of lines.slice(0,7)){ const r=document.createElement('span'); if(typeof t==='object'){ r.textContent=t.t; r.className='hd-ci-'+t.c; } else r.textContent=t; d.append(r); }
    const kb=c.querySelector('kbd'); if(kb) c.insertBefore(d,kb); else c.append(d); }); }
// special drops outside the view → an arrow on the screen edge pointing at them (every mode · DOM only, no RNG, no sim state)
const HD_EDGE_I={chest:'🎁', bosschest:'🎁', lootbox:'🎲', heart:'❤️', magnet:'🧲', bomb:'💣'}, HD_EDGE_MAX=8;
function hdEdgeIcon(g){ if(HD_EDGE_I[g.kind]) return HD_EDGE_I[g.kind]; if(g.kind==='loot'){ const d=typeof itemDef==='function'&&g.it&&itemDef(g.it.id); return d&&d.i||'💎'; } return ''; }
function hdEdge(){
  let box=HD.edge; if(!box||!box.isConnected){ box=HD.edge=document.createElement('div'); box.id='hdEdge'; box.setAttribute('aria-hidden','true'); document.body.append(box); HD.edgeN=[]; }
  const live=G&&P&&!G.ui&&!G.over&&typeof cam!=='undefined'&&typeof H!=='undefined'&&Array.isArray(G.gems), pick=[];
  if(live){ const now=performance.now();
    if(!HD.edgeR||now-HD.edgeRT>1000){ const t=$('.hud-top'), b=$('.hud-bot'), rt=t&&t.getBoundingClientRect(), rb=b&&b.getBoundingClientRect(), ok=rt&&rt.height>0&&rb&&rb.height>0;
      HD.edgeRT=ok?now:0; HD.edgeR=[ok?rt.bottom:90, ok?rb.top:H-50]; }   // HUD not laid out yet → safe guess, measure again next frame
    const m=26, x0=m, y0=Math.min(H/2,HD.edgeR[0]+m), x1=W-m, y1=Math.max(H/2,HD.edgeR[1]-m-12);
    for(const g of G.gems){ if(g.dead) continue; const ic=hdEdgeIcon(g); if(!ic) continue;
      const sx=(g.x-cam.x)*ZOOM+W/2, sy=(g.y-cam.y)*ZOOM+H/2; if(sx>=0&&sx<=W&&sy>=0&&sy<=H) continue;
      const dx=g.x-P.x, dy=g.y-P.y; pick.push({ic, d:dx*dx+dy*dy, sx, sy, big:g.kind==='bosschest'||g.kind==='chest'||g.kind==='lootbox'&&!g.small}); }
    pick.sort((a,b)=>(b.big-a.big)||(a.d-b.d)); pick.length=Math.min(pick.length,HD_EDGE_MAX);
    for(const p of pick){ const cx=W/2, cy=H/2, vx=p.sx-cx, vy=p.sy-cy, k=Math.min(vx?Math.abs((vx>0?x1-cx:cx-x0)/vx):1e9, vy?Math.abs((vy>0?y1-cy:cy-y0)/vy):1e9);
      p.x=cx+vx*k; p.y=cy+vy*k; p.a=Math.atan2(vy,vx); p.m=Math.round(Math.sqrt(p.d)/10); } }
  const N=HD.edgeN;
  while(N.length<pick.length){ const n=document.createElement('div'); n.className='hd-edge'; n.innerHTML='<i></i><span></span><b></b>'; box.append(n); N.push(n); }
  N.forEach((n,i)=>{ const p=pick[i]; if(!p){ if(!n.hidden) n.hidden=true; return; } n.hidden=false;
    n.style.transform='translate('+Math.round(p.x)+'px,'+Math.round(p.y)+'px)'; n.firstChild.style.transform='rotate('+p.a.toFixed(2)+'rad)';
    if(n.__ic!==p.ic){ n.__ic=p.ic; n.children[1].textContent=p.ic; } const t=p.m+' ม.'; if(n.__t!==t){ n.__t=t; n.children[2].textContent=t; }
    n.classList.toggle('big',p.big); }); }
function hdTick(){
  if(HD.g!==G) hdStart();
  try{ hdEdge(); }catch(e){ console.error(e); }
  try{ hdCdBar(); if(G.ui==='level'&&G.choices!==HD.info) hdCardInfo(); }catch(e){ console.error(e); }
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
    else if(o.k==='new') t='ฝึกไว้ ★'+(P.rank[o.id]||0)+' · อัปในรอบนี้ได้ถึง Lv '+(P.rank[o.id]||0)+(P.sl&&P.sl[o.id]>1?' · เริ่มที่ Lv '+P.sl[o.id]:'');
    else if(o.k==='stat') t='เร่งชั่วคราวในรอบนี้ · ไม่ใช่สถานะถาวร';
    else if(o.k==='gold') t='ได้ทองจริง +'+5*P.lv;
    if(t) c.append(shMk('span','hd-cap',t)); });
  // §3.6: a loadout skill already at its ★ is never offered → say so on one other card
  const top=(P.skills||[]).filter(s=>{ const rc=rankCap(G.char,s.id); return !(s.evolved&&rc<=5)&&(P.rank[s.id]||0)<rc&&s.lv>=(P.rank[s.id]||0); });
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
function hdMenuText(g){ const c=!!(g&&g.char), sv=!!(g&&(g.modeId==='survival'||g.mode&&g.mode.daily));
  const dl=!!(g&&g.mode&&g.mode.daily);                                    // daily dungeons: restart / again lead to the daily sheet (69)
  for(const [id,t] of [['btnMenuP',sv?'กลับป้อม (ไม่รับรางวัล)':'กลับป้อม'],['btnRestartP',dl?'เลือกด่านใหม่ (ไม่รับรางวัล)':sv?'เริ่มใหม่ (ไม่รับรางวัล)':null],['btnMenuE','กลับป้อม'],['btnAgain',dl?'เลือกด่านใหม่':null]]){ const b=$('#'+id); if(!b) continue;
    if(!(id in SH.txt)) SH.txt[id]=b.textContent; const want=c&&t?t:SH.txt[id]; if(b.textContent!==want) b.textContent=want; } }
/* ---------- pause: full stat sheet + per-skill numbers (what every card picked so far added up to) ---------- */
const HD_PCT=v=>(v>=0?'+':'')+Math.round(v*100)+'%';
const HD_N=v=>Math.abs(v-Math.round(v))<.005?String(Math.round(v)):(Math.round(v*100)/100).toFixed(Math.abs(v)<10?2:1).replace(/\.?0+$/,'');
// one skill → [[label, value text], …] · effective values: dmg × ATK/bonus, cd × AGI/DEX/gear, count + DEX, radius × INT, duration × INT
function hdSkillLines(s){
  const v=k=>pv(s,k), has=k=>v(k)!=null, out=[], might=P.might||1, rage=P.rage?1+P.rage*(1-P.hp/Math.max(1,P.maxHp)):1;
  if(has('dmg')&&v('dmg')){ const base=v('dmg'), eff=base*might*rage; out.push(['ดาเมจ',HD_N(eff)+(Math.abs(eff-base)>.05?' (ฐาน '+HD_N(base)+' · '+HD_PCT(eff/base-1)+')':'')]); }
  if(has('cd')&&s.def.type!=='passive'){ const b=v('cd'), e=cdOf(s); out.push(['คูลดาวน์',HD_N(e)+' วิ'+(Math.abs(e-b)>.005?' (ฐาน '+HD_N(b)+' · '+HD_PCT(e/b-1)+')':'')]); }
  const t=s.def.type, cnt=countOf(s), cb=v('count')||1;
  if(['proj','orbit','swing','chain','strike'].indexOf(t)>=0||has('count')) out.push([t==='orbit'?'จำนวนรอบตัว':t==='chain'?'จำนวนสาย':'จำนวน',cnt+(cnt!==cb?' (ฐาน '+cb+' · +'+(cnt-cb)+' จาก DEX)':'')]);
  if(has('bounces')) out.push(['กระโดดต่อสาย',v('bounces')+' ครั้ง']);
  if(has('jump')) out.push(['ระยะกระโดด',HD_N(v('jump')*P.area)]);
  for(const [k,n] of [['r','รัศมี'],['range','ระยะฟัน'],['explode','วงระเบิด']]) if(has(k)&&v(k)) out.push([n,HD_N(v(k)*P.area)+(P.area!==1?' (ฐาน '+HD_N(v(k))+' · '+HD_PCT(P.area-1)+')':'')]);
  if(has('dur')) out.push(['ระยะเวลา',HD_N(v('dur')*P.durMul)+' วิ']);
  if(has('pierce')&&v('pierce')>1) out.push(['ทะลุ',v('pierce')>=99?'ทุกตัว':v('pierce')+' ตัว']);
  if(has('slow')&&v('slow')) out.push(['ชะลอ',HD_PCT(v('slow')).replace('+','')]);
  if(has('stun')&&v('stun')) out.push(['สตัน',HD_N(v('stun'))+' วิ']);
  if(has('freeze')&&v('freeze')) out.push(['แช่แข็ง',HD_N(v('freeze'))+' วิ']);
  if(has('crit')&&v('crit')) out.push(['คริติคอลเพิ่ม',HD_PCT(v('crit'))]);
  if(has('absorb')) out.push(['โล่ดูดซับ',HD_N(v('absorb'))]);
  if(has('nova')) out.push(['ระเบิดโล่',HD_N(v('nova')*might)]);
  if(has('heal')) out.push(['ฟื้น HP',HD_N(v('heal'))+(v('healPct')?' + '+HD_PCT(v('healPct')).replace('+','')+' ของ HP สูงสุด':'')]);
  if(has('dodge')&&v('dodge')) out.push(['หลบ',HD_PCT(v('dodge')).replace('+','')]);
  if(has('rage')&&v('rage')) out.push(['ดาเมจเมื่อ HP ต่ำ','สูงสุด '+HD_PCT(v('rage'))]);
  if(has('steal')&&v('steal')) out.push(['ฟื้นต่อการสังหาร',HD_N(v('steal'))+' HP']);
  if(has('targets')) out.push(['เป้าต่อครั้ง',String(v('targets'))]);
  if(has('hits')) out.push(['จำนวนครั้งที่โดน',String(v('hits'))]);
  if(v('burn')) out.push(['ทิ้งทะเลเพลิง','มี']);
  return out; }
// what the next card of this skill would change (★+1, or the evolution) · same effective numbers as hdSkillLines
function hdNextText(s,kind){   // kind 'up' / 'evo' = the card asking (★6–8 up cards of an unevolved skill are not its evolution)
  const cap=P.rank?(P.rank[s.id]||5):5;                                 // ★6–8 (27): Lv past 5 up to the trained ★
  if(s.def.type==='passive'&&s.lv>=Math.max(5,cap)) return ''; const now=new Map(hdSkillLines(s)); let label;
  if(kind!=='evo'&&(s.lv<5||s.lv<cap&&(kind==='up'||s.evolved||!s.def.evo))){ s.lv++; try{ label='การ์ดถัดไป ★'+s.lv; var nxt=hdSkillLines(s); } finally{ s.lv--; } }
  else if(s.def.evo&&!s.evolved){ s.evolved=true; try{ label='เมื่อวิวัฒนาการเป็น '+s.def.evo.n; var nxt=hdSkillLines(s); } finally{ s.evolved=false; } }
  else return '';
  const ch=nxt.filter(([k,v])=>now.get(k)!==v).map(([k,v])=>k+' '+(now.has(k)?String(now.get(k)).split(' (')[0]+' → ':'')+String(v).split(' (')[0]);
  return ch.length?label+': '+ch.join(' · '):''; }
function hdStatSheet(box){
  if(!P||!box) return; const el=(tag,cls,txt)=>{ const n=document.createElement(tag); if(cls) n.className=cls; if(txt!=null) n.textContent=txt; return n; };
  const wrap=el('div','hd-sheet'), st=P.stats||{};
  wrap.append(el('div','dmg-title','ค่าสถานะตอนนี้'));
  const lv=['STR','AGI','VIT','INT','DEX','LUK'].map(k=>SNAME(k)+' '+(st[k]|0)+(P.sx?'':'/5')).join(' · ');
  wrap.append(el('div','hd-sheet-lv','การ์ดค่าสถานะในรอบนี้: '+lv));
  const rows=[
    ['HP',Math.ceil(P.hp)+' / '+Math.ceil(P.maxHp)+' · ฟื้น '+HD_N(P.regen)+'/วิ'],
    ['ดาเมจรวม','×'+HD_N(P.might)+' ('+HD_PCT(P.might-1)+')'+(P.rage?' · HP ต่ำตีแรงขึ้นอีกถึง '+HD_PCT(P.rage):'')],
    ['คริติคอล',Math.round(P.crit*100)+'% · แรง ×'+HD_N(P.critMult)],
    ['คูลดาวน์','×'+HD_N(P.cdMul)+' ('+HD_PCT(P.cdMul-1)+')'],
    ['พื้นที่สกิล','×'+HD_N(P.area)+' ('+HD_PCT(P.area-1)+')'],
    ['ระยะเวลาสกิล','×'+HD_N(P.durMul)+' ('+HD_PCT(P.durMul-1)+')'],
    ['กระสุนเพิ่ม','+'+(P.extraProj|0)+' ลูก'],
    ['ความเร็วเดิน',Math.round(P.speed)],
    ['เกราะ',HD_N(P.armor)+(P.dodge?' · หลบ '+Math.round(P.dodge*100)+'%':'')],
    ['EXP','×'+HD_N(P.xpMul)+' ('+HD_PCT(P.xpMul-1)+')'],
    ['ระยะดูดของ',Math.round(P.magnet)],
  ];
  if(P.steal) rows.push(['ฟื้นต่อการสังหาร',HD_N(P.steal)+' HP']);
  if(P.drop) rows.push(['โอกาสดรอป',HD_PCT(P.drop)]);
  if(P.bossDmg) rows.push(['ดาเมจใส่บอส',HD_PCT(P.bossDmg)]);
  const grid=el('div','hd-sheet-grid'); for(const [k,v] of rows){ grid.append(el('span','hd-k',k),el('span','hd-v',String(v))); } wrap.append(grid);
  wrap.append(el('div','dmg-title','สกิลที่มี'));
  for(const s of P.skills){
    const card=el('div','hd-sk'); const nm=(s.def.i||'')+' '+(s.evolved?s.def.evo.n+' (วิวัฒนาการแล้ว)':s.def.n+' ★'+s.lv+'/5');
    card.append(el('div','hd-sk-n',nm));
    const ev=s.def.evo; if(ev&&!s.evolved) card.append(el('div','hd-sk-e','วิวัฒนาการ: ★5 + '+(STATS[ev.s].ab||ev.s)+' อย่างน้อย 1 ('+(s.lv>=5?'สกิลครบ ★5 แล้ว':'ยังขาด '+(5-s.lv)+' ขั้น')+' · '+(STATS[ev.s].ab||ev.s)+' ตอนนี้ '+(st[ev.s]|0)+')'));
    const g=el('div','hd-sheet-grid'); for(const [k,v] of hdSkillLines(s)) g.append(el('span','hd-k',k),el('span','hd-v',v)); card.append(g);
    if(P.sx&&typeof sxHave==='function'){ const h=sxHave(P,s);
      if(h.main) card.append(el('div','hd-sk-m','ความชำนาญ '+SNAME(h.main)+' Lv '+h.lv+(h.pk?' · '+({nova:'ระเบิดโล่',trap:'ดาเมจกับดัก'}[h.pk]||'ความแรง')+' +'+(Math.round(h.pct*1000)/10)+'%':'')));
      if(h.ms.length) card.append(el('div','hd-sk-ms','ลูกเล่นที่ได้แล้ว: '+h.ms.slice(-4).join(' · ')));
      const soon=h.main?sxNext(P,h.main).filter(x=>x.s===s):[];
      if(soon.length) card.append(el('div','hd-sk-soon','ถัดไป: '+soon.map(x=>SNAME(h.main)+' อีก '+x.n+' ใบ: '+x.t).join(' · '))); }
    const nx=hdNextText(s); if(nx) card.append(el('div','hd-sk-x',nx));
    if(s.dealt) card.append(el('div','hd-sk-e','ดาเมจที่ทำไปแล้วรอบนี้: '+fmtNum(s.dealt)));
    wrap.append(card); }
  box.append(wrap); }
function hdPause(box){
  hdMenuText(G); try{ hdStatSheet(box); }catch(e){ console.error(e); }
  if(!G||!G.char||(G.modeId!=='survival'&&!(G.mode&&G.mode.daily))||!box) return;   // survival + daily dungeons (69)
  box.append(shBtn('🏳\uFE0F ถอยทัพ · รับรางวัล','btn ghost sh-wide',()=>{ if(!G||G.over||G.ui!=='pause') return; G.retreat=true; G.ui=null; show(null); endRun(false); })); }
function hdEdgeOff(){ if(HD.edgeN) for(const n of HD.edgeN) n.hidden=true; }
BUS.on('runEnd',hdEdgeOff); BUS.on('screen',hdEdgeOff);
