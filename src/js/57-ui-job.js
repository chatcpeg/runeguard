/* ================= 57-ui-job.js · lane P · scrJob ================= */
// §3.4 · §8.10: the 4 requirements come from jobReqs (lane C) · [ไปบททดสอบ] opens at Base 20 + Job 20 (§2.5) ·
// pick one of the two advanced paths, then hold the button 1 s (mouse, touch or keyboard) → advanceJob, which is
// once only and permanent (the page then shows the chosen job and no button at all).
let pjbSel=null;                                     // advanced job id picked on the page (null = none yet)
function pjbOpen(){ pjbSel=null; pjbRender(); prgGo('scrJob'); }
// state of the page for ch: {done (already advanced), reqs, all (every requirement met), trial (trial button open), can (hold enabled)}
function pjbState(ch,sel){
  const c=pgCls(ch); if(!c) return null; const R=BAL.ADV, a=pgAdvOf(ch);
  const reqs=a?[]:jobReqs(ch,sel||c.adv[0].id), all=!a&&reqs.length===4&&reqs.every(q=>q.ok);
  const trial=!a&&!(ch.trial&&ch.trial.t2===1)&&(ch.lv|0)>=R.base&&(ch.jlv|0)>=R.job;
  return {c, a, reqs, all, trial, can:all&&!!sel&&c.adv.some(x=>x.id===sel)&&!saveReadOnly()}; }
function pjbCard(c,a,pick){
  const pas=Object.keys(PASSIVES).filter(id=>PASSIVES[id].own===a.id), on=pjbSel===a.id, tag=pick?'button':'div';
  return `<${tag}${pick?` type="button" data-a="pick" data-id="${a.id}" aria-pressed="${on}"`:''} class="pjb-card${on?' sel':''}">`
    +`<canvas data-adv="${a.id}" width="80" height="80" aria-hidden="true"></canvas><span class="pjb-n">${esc(a.n)}<small>${esc(a.e)}</small></span>`
    +`<span class="pjb-b">${esc(a.bt)}</span><span class="pjb-d">${esc(a.d)}</span>`
    +`<span class="pjb-sk">${a.skills.map(id=>'<span>'+SK[id].i+' '+esc(SK[id].n)+'</span>').join('')}</span>`
    +`<span class="pjb-ps">${pas.map(id=>'<span>'+PASSIVES[id].i+' '+esc(PASSIVES[id].n)+'</span>').join('')}</span></${tag}>`; }
function pjbRender(){
  const root=$('#pjbRoot'); if(!root) return; prgWire(root,pjbClick);
  const ch=prgCh(), S=ch&&pjbState(ch,pjbSel);
  if(!S){ root.innerHTML=prgTop('อาชีพ','')+'<p class="prg-empty">ยังไม่มีตัวละคร · สร้างตัวละครที่เมนูหลักก่อน</p>'; return; }
  const c=S.c, R=BAL.ADV; let h;
  if(S.a){
    h=prgTop('อาชีพ',esc(S.a.n)+'<br>Job '+(ch.jlv|0)+'/'+BAL.CAP.job2)+'<p class="pjb-done">✔ เลื่อนอาชีพแล้ว · ถาวร เปลี่ยนไม่ได้</p>'
      +`<div class="pjb-cards one">${pjbCard(c,S.a,false)}</div><div class="btn-row"><button class="btn ghost" type="button" data-a="skills">ไปหน้าสกิล ›</button></div>`;
  } else {
    h=prgTop('อาชีพ',esc(c.n)+'<br>Job '+(ch.jlv|0)+'/'+BAL.CAP.job1)+(saveReadOnly()?prgRO():'')+'<div class="box pjb-req"><h3>เงื่อนไขเลื่อนอาชีพ</h3><ul>';
    S.reqs.forEach((q,i)=>{ h+=`<li class="${q.ok?'ok':'no'}"><span class="pjb-mk" aria-hidden="true">${q.ok?'✔':'✘'}</span><span class="pjb-t">${esc(q.t)}</span>`
      +(i===2&&!q.ok?`<button class="btn ghost pjb-trial" type="button" data-a="trial"${S.trial?'':' disabled'}>ไปบททดสอบ ›</button>`:'')+'</li>'; });
    h+='</ul>'+(S.trial||S.reqs[2].ok?'':`<p class="hint">บททดสอบเปิดเมื่อถึง Base ${R.base} + Job ${R.job} · รอดให้ครบ 60 วิ แล้วล้มผู้คุม · แพ้ได้ ลองใหม่ฟรี</p>`)+'</div>';
    h+='<div class="pjb-cards" role="group" aria-label="เลือกสายอาชีพขั้นสูง">'+c.adv.map(x=>pjbCard(c,x,true)).join('')+'</div>';
    h+=`<p class="pjb-warn">⚠ เลือกแล้วเปลี่ยนไม่ได้</p><button class="btn primary pjb-hold" type="button" data-a="hold"${S.can?'':' disabled'}><span>กดค้างเพื่อเลื่อนอาชีพ</span></button>`
      +`<p class="hint">${!pjbSel?'แตะเลือกสายอาชีพก่อน':!S.all?'ยังไม่ครบเงื่อนไข':'กดค้าง 1 วินาทีเพื่อเลื่อนเป็น '+esc(c.adv.find(x=>x.id===pjbSel).n)}</p>`;
  }
  root.innerHTML=h;
  for(const cv of root.querySelectorAll('canvas[data-adv]')){ const x=c.adv.find(y=>y.id===cv.dataset.adv); try{ portrait(cv,Object.assign({},c.look,x.look),80); }catch(e){ console.error(e); } }
  const hb=root.querySelector('.pjb-hold'); if(hb) prgHold(hb,PRG.hold,pjbAdvance); }
function pjbClick(e){
  const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; const a=b.dataset.a;
  if(a==='back'){ prgBackNav(); return; }
  if(a==='skills'){ pksOpen(); return; }
  const ch=prgCh(); if(!ch) return;
  if(a==='pick'){ pjbSel=b.dataset.id; pjbRender(); }
  else if(a==='trial') trialStart(ch); }
function pjbAdvance(){
  const ch=prgCh(), S=ch&&pjbState(ch,pjbSel); if(!S||!S.can) return; const x=S.c.adv.find(y=>y.id===pjbSel);
  if(advanceJob(ch,pjbSel)){ pjbSel=null; toast('เลื่อนอาชีพเป็น '+x.n+' แล้ว! ปลดสกิลขั้นสูง 2 ตัว','good'); try{ initAudio(); sfx('win'); }catch(e){} }
  else toast('เลื่อนอาชีพไม่ได้ · ตรวจเงื่อนไขอีกครั้ง','bad');
  pjbRender(); }
