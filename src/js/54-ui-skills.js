/* ================= 54-ui-skills.js · lane P · scrSkills (+ helpers shared by 56 · 57 · 58) ================= */
// §3.5 · §8.9: ★ ranks cost RANK_COST (★1–3: 1 · ★4–5: 2) · passives 1 per ★ · SKILL_REQ gates the advanced skills ·
// loadout 4 (first job) / 5 (advanced) slots, slot 1 = the skill a survival run starts with · reset = the §3.3 rules.
// All rules live in 42-progression.js (lane C): this file only draws them and calls learnSkill / setLoadout / resetSkills.
// Opened by pksOpen() or by the router (BUS 'screen' with id 'scrSkills'). Nothing here runs at load except registration.

/* ---- helpers of lane P ---- */
const PRG={hold:1000, rep:450, repEvery:280};
function prgCh(){ try{ return curChar(); }catch(e){ console.error(e); return null; } }
function prgStars(r){ r=Math.max(0,Math.min(BAL.CAP.rank,r|0)); return '★'.repeat(r)+'☆'.repeat(BAL.CAP.rank-r); }
function prgVis(id){ const n=$('#'+id); return !!n&&!n.hidden; }
function prgTop(t,sub){ return `<header class="prg-top"><button class="prg-back" type="button" data-a="back" aria-label="ย้อนกลับ">←</button><h2 class="prg-h">${esc(t)}</h2><span class="prg-sub">${sub||''}</span></header>`; }
function prgRO(){ return '<p class="prg-ro">ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้ · อัปเดตเกมก่อน</p>'; }
function prgWire(root,fn){ if(root&&!root.dataset.prg){ root.dataset.prg='1'; root.addEventListener('click',fn); } }
// navigation goes through lane B's router (it emits BUS 'screen' → render) · a router that shows nothing (M0 stub) → show() here
function prgGo(id){ let r; try{ r=UI.go(id); }catch(e){ console.error(e); } if(r!==false&&curScreen()!==id) show(id); }
function prgBackNav(){ try{ UI.back(); }catch(e){ console.error(e); } }
// reset rules (§3.3, also used for skills §3.5): Base < 20 free · then one free reset · then a ม้วนลืมเลือน from the bag
function prgResetInfo(ch,kind){
  const way=pgResetWay(ch,kind), have=typeof invCount==='function'?invCount(ch,'u_forget')|0:0, spent=kind==='sk'?pgSpSpent(ch):pgStSpent(ch);
  const label=way==='free'?'ฟรี (ก่อน Lv '+BAL.RESET.freeBelow+')':way==='freeOnce'?'ฟรี (เหลือ 1 ครั้ง)':'ใช้ม้วนลืมเลือน 1 ม้วน (มี '+have+')';
  return {way, have, spent, label, can:!saveReadOnly()&&spent>0&&(way!=='scroll'||have>0)}; }
function prgReset(ch,kind,after){
  const R=prgResetInfo(ch,kind); if(!R.can) return; const w=kind==='sk'?'สกิล':'สถานะ';
  Promise.resolve(confirmBox('รีเซ็ตแต้ม'+w+'ทั้งหมด? ได้แต้มคืน '+R.spent+' แต้ม · '+R.label,{okText:'รีเซ็ต'})).then(ok=>{
    if(!ok) return; const done=(kind==='sk'?resetSkills:resetStats)(ch,{scroll:R.way==='scroll'});
    toast(done?'รีเซ็ตแต้ม'+w+'แล้ว':'รีเซ็ตไม่ได้',done?'good':'bad'); if(after) after(); }).catch(e=>console.error(e)); }
// press and hold `ms` (mouse, touch, pen, or Space / Enter) → done() · releasing early cancels · progress drawn by CSS (.holding)
function prgHold(btn,ms,done){
  let t=0; btn.style.setProperty('--hold',ms+'ms');
  const stop=()=>{ if(t){ clearTimeout(t); t=0; } btn.classList.remove('holding'); };
  const start=()=>{ if(btn.disabled||t) return; btn.classList.add('holding'); t=setTimeout(()=>{ t=0; btn.classList.remove('holding'); if(!btn.disabled) done(); },ms); };
  btn.addEventListener('pointerdown',e=>{ if(e.button>0) return; try{ btn.setPointerCapture(e.pointerId); }catch(_){} start(); });
  for(const k of ['pointerup','pointercancel','lostpointercapture','blur']) btn.addEventListener(k,stop);
  btn.addEventListener('pointerleave',e=>{ let cap=false; try{ cap=btn.hasPointerCapture(e.pointerId); }catch(_){} if(!cap) stop(); });
  btn.addEventListener('keydown',e=>{ if(e.code!=='Space'&&e.code!=='Enter') return; e.preventDefault(); e.stopPropagation(); if(!e.repeat) start(); });
  btn.addEventListener('keyup',e=>{ if(e.code==='Space'||e.code==='Enter'){ e.preventDefault(); stop(); } });
  btn.addEventListener('contextmenu',e=>e.preventDefault()); }
// tap → step(1) · hold → step(5) at once, then every PRG.repEvery ms while step() still changes something
function prgRepeat(btn,step){
  let t=0, held=false; const stop=()=>{ clearTimeout(t); clearInterval(t); t=0; };
  btn.addEventListener('pointerdown',e=>{ if(e.button>0) return; held=false; stop();
    t=setTimeout(()=>{ held=true; t=0; if(step(5)) t=setInterval(()=>{ if(!step(5)) stop(); },PRG.repEvery); },PRG.rep); });
  for(const k of ['pointerup','pointercancel','pointerleave']) btn.addEventListener(k,stop);
  btn.addEventListener('click',()=>{ if(held){ held=false; return; } step(1); });
  btn.addEventListener('contextmenu',e=>e.preventDefault()); }

/* ---- skills page ---- */
let pksTab=0, pksSel=-1;                             // tab 1 = first job · 2 = advanced · pksSel = picked loadout slot (−1 none)
// one row per skill / passive: {id, pas, r, max, cost, lock (requirement or job missing → reason), can, inLoad}
function pksRow(ch,id,pas){
  const r=((pas?ch.pas:ch.sk)||{})[id]|0, max=r>=BAL.CAP.rank, cost=max?0:pas?BAL.PAS_COST:BAL.RANK_COST[r+1];
  const own=pas&&PASSIVES[id].own, avail=pas?(own===ch.cls||own===ch.job):pgSkillPool(ch).indexOf(id)>=0, q=!pas&&SKILL_REQ[id];
  const why=max?'':canLearn(ch,id), lock=!max&&(!avail||(q&&((ch.sk||{})[q.need]|0)<q.r))?why:'';
  return {id, pas, r, max, cost, lock, can:!max&&why==='', inLoad:!pas&&(ch.load||[]).indexOf(id)>=0}; }
// tab 1: class skills + class passive · tab 2: the chosen advanced path, or both paths (locked) before advancing
function pksModel(ch,tab){
  const c=pgCls(ch); if(!c) return [];
  const paths=tab===1?[{a:null, own:c.id, sk:c.skills}]:(ch.job?c.adv.filter(x=>x.id===ch.job):c.adv).map(x=>({a:x, own:x.id, sk:x.skills}));
  return paths.map(p=>({a:p.a, sk:p.sk.map(id=>pksRow(ch,id,false)),
    pas:Object.keys(PASSIVES).filter(id=>PASSIVES[id].own===p.own).map(id=>pksRow(ch,id,true))})); }
// loadout edits → setLoadout (lane C validates: learned, in the pool, no duplicates, 1…4/5 slots)
function pksLoadAdd(ch,id,slot){ const L=ch.load.slice(), n=BAL.LOADOUT[pgTier(ch)]; if(L.indexOf(id)>=0) return false;
  if(L.length<n) L.push(id); else if(slot>=0&&slot<L.length) L[slot]=id; else return false; return setLoadout(ch,L); }
function pksLoadDel(ch,id){ const L=ch.load.filter(x=>x!==id); return L.length>0&&L.length<ch.load.length&&setLoadout(ch,L); }
function pksLoadSwap(ch,i,j){ const L=ch.load.slice(); if(i===j||!(i>=0&&j>=0&&i<L.length&&j<L.length)) return false;
  const t=L[i]; L[i]=L[j]; L[j]=t; return setLoadout(ch,L); }
// skill numbers at ★lv and the change to the next ★ (labels and units from the level-up cards: PL / fmtP in 21-ui.js)
function pksLv(d,lv){ const o=[]; for(const k in d.p){ const v=d.p[k]; if(Array.isArray(v)) o.push((PL[k]||k)+' '+fmtP(k,v[lv-1])); } return o.slice(0,4).join(' · '); }
function pksNext(d,r){ if(r<1) return pksLv(d,1); const o=[];
  for(const k in d.p){ const v=d.p[k]; if(Array.isArray(v)&&v[r-1]!==v[r]) o.push((PL[k]||k)+' '+fmtP(k,v[r-1])+' → '+fmtP(k,v[r])); }
  return o.join(' · ')||'แรงขึ้น'; }
function pksRowHtml(r){
  const d=r.pas?PASSIVES[r.id]:SK[r.id];
  let h=`<li class="pks-row${r.r?' got':''}${r.lock?' lock':''}"><span class="pks-ic" aria-hidden="true">${d.i}</span><div class="pks-m">`
    +`<div class="pks-n">${esc(d.n)} <span class="pks-st" aria-label="ระดับ ${r.r} จาก ${BAL.CAP.rank}">${prgStars(r.r)}</span>${r.inLoad?'<em class="pks-in">ติดตัว</em>':''}</div>`;
  if(r.pas){ if(r.r) h+=`<div class="pks-i">ตอนนี้: ${jdBonusText(jdPassiveAt(r.id,r.r))}</div>`;
    if(!r.max) h+=`<div class="pks-x">→ ★${r.r+1}: ${jdBonusText(jdPassiveAt(r.id,r.r+1))}</div>`; }
  else { if(r.r) h+=`<div class="pks-i">★${r.r}: ${pksLv(d,r.r)}</div>`;
    if(!r.max) h+=`<div class="pks-x">→ ★${r.r+1}: ${pksNext(d,r.r)}</div>`;
    if(d.evo) h+=`<div class="pks-e">วิวัฒนาการ: ★5 + การ์ด${STATS[d.evo.s].n}ในรอบ → ${esc(d.evo.n)}</div>`; }
  if(r.lock) h+=`<div class="pks-lock">🔒 ${esc(r.lock)}</div>`;
  h+='</div><div class="pks-side">'+(r.max?'<span class="pks-max">ตัน</span>'
    :`<button type="button" class="pks-up" data-a="learn" data-id="${r.id}"${r.can?'':' disabled'} aria-label="ฝึก ${esc(d.n)} ใช้ ${r.cost} แต้ม">+<small>${r.cost} แต้ม</small></button>`);
  if(!r.pas&&r.r>0) h+=`<button type="button" class="pks-lo${r.inLoad?' on':''}" data-a="load" data-id="${r.id}" aria-pressed="${r.inLoad}">${r.inLoad?'ถอด':'ใส่'}</button>`;
  return h+'</div></li>'; }
function pksOpen(){ pksSel=-1; pksTab=0; pksRender(); prgGo('scrSkills'); }
function pksRender(){
  const root=$('#pksRoot'); if(!root) return; prgWire(root,pksClick);
  const ch=prgCh(), c=ch&&pgCls(ch);
  if(!c){ root.innerHTML=prgTop('สกิล','')+'<p class="prg-empty">ยังไม่มีตัวละคร · สร้างตัวละครที่เมนูหลักก่อน</p>'; return; }
  const tier=pgTier(ch), n=BAL.LOADOUT[tier], a=pgAdvOf(ch), load=ch.load||[];
  if(pksTab!==1&&pksTab!==2) pksTab=tier; if(pksSel>=load.length) pksSel=-1;
  let h=prgTop('สกิล','แต้มสกิล <b>'+(ch.sp|0)+'</b><br>Job '+(ch.jlv|0)+'/'+pgJobCap(ch))+(saveReadOnly()?prgRO():'');
  h+=`<div class="box pks-load"><div class="pks-lh"><b>ช่องติดตัว (${load.length}/${n})</b><small>แตะสองช่องเพื่อสลับ · ช่องแรกคือสกิลเริ่มรอบเอาชีวิตรอด</small></div><div class="pks-slots">`;
  for(let i=0;i<n;i++){ const id=load[i], d=id&&SK[id];
    h+=d?`<button type="button" class="pks-sl${i===pksSel?' sel':''}" data-a="slot" data-i="${i}" aria-pressed="${i===pksSel}" aria-label="ช่อง ${i+1} ${esc(d.n)}"><span aria-hidden="true">${d.i}</span>${i?'':'<em>เริ่ม</em>'}<b>★${(ch.sk||{})[id]|0}</b></button>`
       :'<span class="pks-sl empty" aria-hidden="true">+</span>'; }
  h+=`</div>${pksSel>=0?'<p class="pks-tip">เลือกช่อง '+(pksSel+1)+' แล้ว · แตะช่องอื่นเพื่อสลับ หรือกด [ใส่] ที่สกิลเพื่อแทนช่องนี้</p>':''}</div>`;
  const f1=c.skills[0], f1r=(ch.sk||{})[f1]|0;   // balance (§9.4 gate): a new character evolves its first skill in its first run only at ★5
  if(tier===1&&SK[f1]&&f1r<BAL.CAP.rank) h+=`<p class="pks-tip pks-rec">แนะนำ: ฝึก ${esc(SK[f1].n)} ถึง ★${BAL.CAP.rank} ก่อน · ★${BAL.CAP.rank} + การ์ดสถานะในรอบ = วิวัฒนาการ</p>`;
  h+=`<div class="seg prg-seg" role="group" aria-label="ขั้นอาชีพ"><button type="button" data-a="tab" data-t="1" aria-pressed="${pksTab===1}">ขั้นต้น · ${esc(c.n)}</button>`
    +`<button type="button" data-a="tab" data-t="2" aria-pressed="${pksTab===2}">ขั้นสูง · ${a?esc(a.n):'ยังไม่เลื่อน'}</button></div>`;
  for(const g of pksModel(ch,pksTab)){
    h+='<section class="pks-grp">'+(g.a?`<h3 class="pks-path">${esc(g.a.n)} <small>${esc(g.a.e)}</small></h3>`:'')
      +'<ul class="pks-list">'+g.sk.map(pksRowHtml).join('')+'</ul><p class="pks-sep">ความสามารถติดตัว (passive)</p><ul class="pks-list">'+g.pas.map(pksRowHtml).join('')+'</ul></section>'; }
  const R=prgResetInfo(ch,'sk');
  h+=`<div class="prg-reset"><span>รีเซ็ตสกิล: ${R.label} · ★1 ฟรีของสกิลแรกยังอยู่</span><button class="btn ghost" type="button" data-a="reset"${R.can?'':' disabled'}>รีเซ็ตสกิล</button></div>`;
  root.innerHTML=h; }
function pksClick(e){
  const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; const a=b.dataset.a, id=b.dataset.id;
  if(a==='back'){ prgBackNav(); return; }
  const ch=prgCh(); if(!ch) return;
  if(a==='tab'){ pksTab=+b.dataset.t; }
  else if(a==='learn'){ const pas=svHas(PASSIVES,id), d=pas?PASSIVES[id]:SK[id];
    if(learnSkill(ch,id)) toast(d.n+' ★'+((pas?ch.pas:ch.sk)[id]|0),'good'); else toast(canLearn(ch,id)||'ฝึกไม่ได้','bad'); }
  else if(a==='slot'){ const i=+b.dataset.i; if(pksSel<0) pksSel=i; else if(pksSel===i) pksSel=-1; else { pksLoadSwap(ch,pksSel,i); pksSel=-1; } }
  else if(a==='load'){
    if(ch.load.indexOf(id)>=0){ if(!pksLoadDel(ch,id)) toast('ต้องมีสกิลติดตัวอย่างน้อย 1 ช่อง','bad'); }
    else if(pksLoadAdd(ch,id,pksSel)) pksSel=-1;
    else toast(saveReadOnly()?'แก้ไขไม่ได้':'ช่องเต็ม · แตะช่องที่จะแทนก่อน','info'); }
  else if(a==='reset'){ prgReset(ch,'sk',pksRender); return; }
  else return;
  pksRender(); }

regScreen('scrSkills'); regScreen('scrJob');
// keys (Escape = back) come from lane B's shared UIKEY handler of its tab-bar pages
BUS.on('screen',x=>{ const id=typeof x==='string'?x:x&&x.id; if(id==='scrSkills') pksRender(); else if(id==='scrJob') pjbRender(); });
BUS.on('char',()=>{ if(prgVis('scrSkills')) pksRender(); if(prgVis('scrJob')) pjbRender(); });
// dev (§7.9): RG.prog.open('skills'|'job'|'stats') → the screen that is showing
DEV.prog={ open(w){ if(w==='job') pjbOpen(); else if(w==='stats') openCharWindow('stats'); else pksOpen(); return curScreen(); } };
