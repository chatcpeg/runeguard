/* ================= 59-ui-tree.js · lane P · skill-tree window + ? help popups (docs/PROPOSAL-skill-trees.md §2.6) ================= */
// tfOpen(id): the tree of one skill in the shared sheet (lane B sheet()) · tfHelp(key): a help popup above everything (sheets,
// level-up cards) · tfCardQ(card, choice): the ? on every level-up card (called by 55 hdCardInfo). Rules live in 27-skill-trees.

/* ---- help popup (own layer: it must sit above the sheet and the level-up screen) ---- */
function tfHelpBox(title,html){
  let r=document.getElementById('tfHelp');
  if(!r){ r=document.createElement('div'); r.id='tfHelp'; r.className='tf-help'; r.hidden=true;
    r.innerHTML='<div class="tf-hcard" role="dialog" aria-modal="true" aria-labelledby="tfHelpT"><h3 id="tfHelpT"></h3><div class="tf-hbody"></div><button type="button" class="btn" data-x="1">เข้าใจแล้ว</button></div>';
    r.addEventListener('click',e=>{ if(e.target===r||e.target.closest('[data-x]')) tfHelpOff(); });
    addEventListener('keydown',e=>{ if(r.hidden) return; e.stopPropagation(); if(e.key==='Escape'||e.key==='Enter'||e.key===' '){ e.preventDefault(); tfHelpOff(); } },true);   // keys never reach the cards under it
    document.body.append(r); }
  r.querySelector('#tfHelpT').textContent=title; r.querySelector('.tf-hbody').innerHTML=html; r.hidden=false;
  const b=r.querySelector('[data-x]'); try{ b.focus(); }catch(e){} }
function tfHelpOff(){ const r=document.getElementById('tfHelp'); if(r) r.hidden=true; }
const tfE=s=>esc(String(s==null?'':s));
const tfRow=(a,b)=>`<tr><td>${a}</td><td>${b}</td></tr>`;
const TF_HELP={
  tree:['ต้นไม้สกิลคืออะไร',()=>`<p>ทุกสกิลมีต้นไม้ของตัวเอง ฝึกแล้วติดตัวถาวร และทำงานทุกรอบที่ใช้สกิลนั้นตั้งแต่ Lv 1 (ทุกโหมดยกเว้นคลาสสิก)</p>
  <h4>ลำต้น ★</h4><p>ฝึกที่หน้าสกิลด้วย<b>แต้มสกิล</b> (ได้จาก Job Lv) · ★ คือ Lv สูงสุดที่การ์ดในรอบอัปสกิลนี้ได้ · ★1–5 ขั้นต้น · ✦★6–8 ขั้นสอง เปิดให้สกิลขั้นต้นหลังเลื่อนอาชีพ</p>
  <h4>3 สาย × 3 ชั้น</h4><p>แต่ละสายทำให้สกิลเก่งคนละทาง · ชั้น 1–2 (สี่เหลี่ยม) เพิ่มตัวเลขหรือโอกาสติดผล · ชั้น 3 (วงกลม) คือ<b>ความพิเศษ</b>ที่เปลี่ยนวิธีทำงานของสกิล</p>
  <h4>เงื่อนไข</h4><table>${tfRow('ชั้น 1','ลำต้น ★2')}${tfRow('ชั้น 2','ลำต้น ★4 + ชั้น 1 ของสายเดียวกันเต็ม')}${tfRow('ชั้น 3','ชั้น 2 ของสายเดียวกันเต็ม')}${tfRow('สายกลาง','ชั้น 2 ต้องมีชั้น 1 ของสายซ้ายขั้น 2 · ชั้น 3 ต้องมีชั้น 2 ของสายซ้ายขั้น 1 (เส้นประ = ข้ามสาย)')}${tfRow('👑 มงกุฎ','เลื่อนอาชีพแล้ว + ลำต้น ★5 + ความพิเศษ 2 ใน 3 สาย')}</table>
  <h4>แต้มรูน</h4><table>${tfRow('ได้','1 แต้มต่อ Base Lv (ตัวละคร Lv 60 = 60 แต้ม) ใช้ร่วมกันทุกต้น')}${tfRow('ชั้น 1','1 แต้มต่อขั้น')}${tfRow('ชั้น 2','2 แต้มต่อขั้น')}${tfRow('ชั้น 3','4 แต้ม')}${tfRow('มงกุฎ','6 แต้ม')}${tfRow('เต็มต้น','37–39 แต้ม · ต้องเลือกว่าจะลงลึกสกิลไหน')}</table>
  <h4>รีเซ็ต</h4><p>รีเซ็ตทีละต้น ได้แต้มรูนคืนครบ · ฟรีก่อน Lv ${BAL.RESET.freeBelow} · หลังจากนั้นฟรี 1 ครั้งต่อตัวละคร · ครั้งต่อไปใช้ม้วนลืมเลือน 1 ม้วน</p>
  <h4>ผลพิเศษทำงานอย่างไร</h4><p>"ร่ายครั้งที่ N" นับเฉพาะตอนสกิลทำงานจริง · ผลที่เกิดจากความพิเศษ (ระเบิด สะเก็ด พื้นไฟ) ไม่ทำให้เกิดผลพิเศษซ้อนอีก · ความพิเศษของสกิลติดตัว (passive) ทำงานกับการโจมตีของทุกสกิล</p>`],
  skills:['หน้าสกิล',()=>`<p>ที่นี่ใช้แต้ม 2 แบบ</p><table>${tfRow('แต้มสกิล','ได้ 1 แต้มต่อ Job Lv · ใช้ฝึก ★ ของสกิลและความสามารถติดตัว')}${tfRow('แต้มรูน','ได้ 1 แต้มต่อ Base Lv · ใช้ในต้นไม้สกิล 🌳')}</table>
  <h4>★ ของสกิล</h4><p>★ = Lv สูงสุดที่สกิลนี้อัปได้ในรอบ · ราคา ★1–3: 1 แต้ม · ★4–5: 2 แต้ม · ✦★6–8 (สกิลขั้นต้นหลังเลื่อนอาชีพ): 2, 2, 3 แต้ม · Lv 6–8 ในรอบ ดาเมจ +12% ต่อขั้น คูลดาวน์ −5% ต่อขั้น และสกิลแรกของอาชีพได้ลูกเพิ่ม</p>
  <h4>ช่องติดตัว</h4><p>สกิลที่ใส่ช่องเท่านั้นที่สุ่มมาในรอบได้ · ช่องแรกคือสกิลที่ถือเริ่มรอบ · แตะสองช่องเพื่อสลับ</p>
  <h4>วิวัฒนาการ</h4><p>สกิล Lv 5 + ค่าสถานะถาวรถึงเกณฑ์ + ได้การ์ดค่านั้นในรอบ → เปลี่ยนร่าง แรงขึ้นมาก</p>
  <h4>🌳 ต้นไม้</h4><p>แตะปุ่ม 🌳 ที่สกิลเพื่อเปิดต้นไม้ (ในต้นไม้มีปุ่ม ? อธิบายละเอียดอีกชั้น)</p>`],
  level:['การเลือกการ์ด',()=>`<p>ทุกครั้งที่ความชำนาญเพิ่มขึ้นในรอบ เกมหยุดให้เลือกการ์ด 1 ใบ · แตะ <b>?</b> ที่มุมการ์ดเพื่อดูตัวเลขเต็มของใบนั้น</p>
  <h4>ชนิดการ์ด</h4><table>${tfRow('สกิลใหม่','ได้สกิลในช่องติดตัว เริ่ม Lv 1')}${tfRow('อัปเลเวล','สกิลที่มีอยู่ +1 Lv ไม่เกิน ★ ที่ฝึกไว้')}${tfRow('วิวัฒนาการ','สกิล Lv 5 + ค่าสถานะถึงเกณฑ์ → ร่างใหม่')}${tfRow('ค่าสถานะ','สุ่มมาตลอดไม่มีหมด · เพิ่มพลังสกิลที่ใช้ค่านั้นเป็นค่าหลัก 0.5% ต่อใบ · ครบทุก 5 ใบได้จุดเปลี่ยน · ใบที่ 6 ขึ้นไปผลทั่วไปครึ่งหนึ่ง')}${tfRow('ไอเทม','ยาหรือทอง ขึ้นเมื่อการ์ดอื่นหมด')}</table>
  <h4>สุ่มใหม่</h4><p>ปุ่มสุ่มใหม่เปลี่ยนการ์ดทั้งชุด · จำนวนครั้งแสดงบนปุ่ม</p>
  <h4>ธาตุ</h4><p>ป้ายสีบนการ์ดบอกธาตุของสกิล · ตีมอนที่แพ้ธาตุ ดาเมจ ×1.5 · ตีมอนที่ต้านธาตุ ×0.6 (มอนอันเดดไม่มีธาตุ) · แตะ ? บนหน้าด่านรายวันเพื่อดูวงล้อธาตุ</p>
  <h4>ปุ่มลัด</h4><p>กด 1–${G&&G.choices?G.choices.length:3} เลือกการ์ด</p>`]};
function tfHelp(key){ const h=TF_HELP[key]; if(h) tfHelpBox(h[0],h[1]()); }

/* ---- tree window ---- */
let TFW={id:null, sel:'A1', box:null};
function tfCh(){ try{ return curChar(); }catch(e){ return null; } }
function tfOpen(id){ if(!svHas(SK,id)||!svHas(TFD,id)) return; TFW.id=id; TFW.sel='A1'; const box=shMk('div','tf-win'); TFW.box=box;
  box.addEventListener('click',tfClick); sheet(box,{title:'🌳 ต้นไม้สกิล · '+SK[id].n, onClose:()=>{ if(TFW.box===box) TFW.box=null; }}); tfRender(); }
function tfState(ch,id,nd){ const l=tfLv(ch,id,nd.id), ok=tfReqs(ch,id,nd).every(q=>q.ok); return l>=nd.max?'full':l>0?'got':ok?'ready':'lock'; }
function tfRender(){
  const box=TFW.box, id=TFW.id, ch=tfCh(); if(!box||!id) return; if(!ch){ box.textContent='ไม่มีตัวละคร'; return; }
  const d=SK[id], r=(ch.sk||{})[id]|0, rc=rankCap(ch,id), N=tfNodes(id), main=typeof SX!=='undefined'&&SX.main[id];
  let h=`<div class="tf-head"><span class="tf-ic" aria-hidden="true">${d.i}</span><div class="tf-hn"><b>${tfE(d.n)}</b><small>${d.el&&EL[d.el]?EL[d.el].i+' ธาตุ'+EL[d.el].n+' · ':''}${main?'ค่าหลัก '+main+' · ':''}ลำต้น ${prgStars(r,rc)}</small></div>`
    +`<div class="tf-pts"><b>${tfFree(ch)}</b><small>แต้มรูนเหลือ (${tfSpentOne(ch,id)} ในต้นนี้)</small></div><button type="button" class="tf-q" data-help="tree" aria-label="อธิบายต้นไม้สกิล">?</button></div>`;
  if(saveReadOnly()) h+=prgRO();
  { const sl=slOf(ch,id), sw=slWhy(ch,id), sc=RSHOP.slCost[sl+1]|0;                 // starting Lv of this skill (28)
    h+=`<div class="tf-sl"><span>🚀 เริ่มรอบที่ <b>Lv ${sl}</b></span>`+(sl>=r?'':`<button type="button" class="btn ghost" data-a="sl"${sw?' disabled':''} title="${tfE(sw)}">Lv ${sl+1} · ${sc} รูน</button>`)
      +`<button type="button" class="tf-q" data-help="startlv" aria-label="อธิบายระดับเริ่มต้น">?</button></div>`; }
  h+='<div class="tf-grid"><svg class="tf-links" aria-hidden="true"></svg>';
  for(let b=0;b<3;b++){ const n=N.find(x=>x.b===b); h+=`<div class="tf-colh" style="grid-column:${b+1};grid-row:1"><span aria-hidden="true">${n.bi}</span> ${tfE(n.bn)}</div>`; }
  for(const nd of N){ const st=tfState(ch,id,nd), l=tfLv(ch,id,nd.id);
    h+=`<button type="button" class="tf-node ${st}${nd.kind==='fx'?' sp':''}${nd.crown?' crown':''}${TFW.sel===nd.id?' on':''}" data-n="${nd.id}"`
      +` style="grid-row:${nd.t+1};${nd.crown?'grid-column:1/-1':'grid-column:'+(nd.b+1)}" aria-pressed="${TFW.sel===nd.id}" aria-label="${tfE(nd.n)} ขั้น ${l} จาก ${nd.max}">`
      +`<span class="tf-ni" aria-hidden="true">${nd.i}</span><span class="tf-nn">${tfE(nd.n)}</span><span class="tf-nl">${l}/${nd.max}</span></button>`; }
  h+='</div>';
  const nd=N.find(x=>x.id===TFW.sel)||N[0], l=tfLv(ch,id,nd.id), why=tfWhy(ch,id,nd.id);
  h+=`<div class="tf-det" aria-live="polite"><div class="tf-dh"><b>${nd.i} ${tfE(nd.n)}</b><small>${nd.crown?'มงกุฎ':nd.kind==='fx'?'ความพิเศษ · สาย'+tfE(nd.bn):'สาย'+tfE(nd.bn)+' · ชั้น '+nd.t}</small></div>`
    +`<p>${l?'ตอนนี้: '+tfE(tfText(nd,l)):'ยังไม่ได้ฝึก'}</p>`+(l<nd.max?`<p class="tf-nx">${l?'ขั้นถัดไป':'เมื่อฝึก'}: ${tfE(tfText(nd,l+1))}</p>`:'')
    +'<ul class="tf-req">'+tfReqs(ch,id,nd).map(q=>`<li class="${q.ok?'ok':''}">${tfE(q.t)}</li>`).join('')+'</ul>'
    +`<div class="tf-act"><button type="button" class="btn${why?' ghost':''}" data-a="buy"${why?' disabled':''}>${l>=nd.max?'เต็มแล้ว':'ฝึก · '+nd.cost+' แต้มรูน'+(tfFree(ch)<nd.cost?' (ใช้รูนที่ซื้อ '+(nd.cost-tfFree(ch))+')':'')}</button>`
    +`<button type="button" class="tf-q" data-help="node" aria-label="อธิบาย ${tfE(nd.n)} ละเอียด">?</button>`
    +`<button type="button" class="btn ghost" data-a="reset"${tfResetGain(ch,id)&&!saveReadOnly()?'':' disabled'}>รีเซ็ตต้นนี้</button></div>`
    +(why&&l<nd.max?`<p class="tf-why">${tfE(why)}</p>`:'')+(/รูนไม่พอ/.test(why)?'<button type="button" class="btn ghost" data-a="shop">💎 เติมรูน</button>':'')+'</div>';
  box.innerHTML=h; requestAnimationFrame(tfLinks); }
// connector lines: solid = same branch (and specials → crown) · dashed = cross-branch requirements (A1 → B2 · A2 → B3)
function tfLinks(){
  const box=TFW.box, ch=tfCh(); if(!box||!box.isConnected||!ch) return; const g=box.querySelector('.tf-grid'), svg=box.querySelector('.tf-links'); if(!g||!svg) return;
  const R=g.getBoundingClientRect(), id=TFW.id, P0=n=>{ const e=g.querySelector('[data-n="'+n+'"]'); if(!e) return null; const r=e.getBoundingClientRect();
    return {x:r.left-R.left+r.width/2, t:r.top-R.top, b:r.bottom-R.top, m:r.top-R.top+r.height/2, l:r.left-R.left, r:r.right-R.left}; };
  const on=(a,b)=>tfLv(ch,id,a)>0&&tfLv(ch,id,b)>0; let h='';
  for(const [a,b] of [['A1','A2'],['A2','A3'],['B1','B2'],['B2','B3'],['C1','C2'],['C2','C3'],['A3','K'],['B3','K'],['C3','K']]){ const p=P0(a), q=P0(b); if(!p||!q) continue; const y=(p.b+q.t)/2;
    h+=`<path d="M${p.x} ${p.b} C${p.x} ${y} ${q.x} ${y} ${q.x} ${q.t}" class="tf-ln${on(a,b)?' on':''}"/>`; }
  for(const [a,b] of [['A1','B2'],['A2','B3']]){ const p=P0(a), q=P0(b); if(!p||!q) continue; const x=(p.r+q.l)/2;
    h+=`<path d="M${p.r} ${p.m} C${x} ${p.m} ${x} ${q.m} ${q.l} ${q.m}" class="tf-ln x${tfLv(ch,id,a)>0?' on':''}"/>`; }
  svg.setAttribute('width',R.width); svg.setAttribute('height',R.height); svg.innerHTML=h; }
addEventListener('resize',()=>{ if(TFW.box) tfLinks(); });
function tfNodeHelp(){ const ch=tfCh(), id=TFW.id, nd=tfNode(id,TFW.sel); if(!ch||!nd) return; const l=tfLv(ch,id,nd.id);
  let rows=''; for(let k=1;k<=nd.max;k++) rows+=tfRow('ขั้น '+k+(k===l?' (ตอนนี้)':''),tfE(tfText(nd,k)));
  const kind=nd.crown?'มงกุฎ: ผลพิเศษสุดท้ายของต้นนี้':nd.kind==='fx'?'ความพิเศษชั้น 3: เปลี่ยนวิธีทำงานของสกิล':nd.kind==='proc'?'โอกาสติดผลทุกครั้งที่สกิลนี้โดนศัตรู':'ตัวเลขของสกิล (รวมกับค่าสถานะ อุปกรณ์ และอื่น ๆ)';
  tfHelpBox(nd.i+' '+nd.n,`<p>${kind}</p><table>${rows}</table><h4>ต้องมีก่อน</h4><p>${tfReqs(ch,id,nd).map(q=>(q.ok?'✓ ':'✗ ')+tfE(q.t)).join('<br>')}</p>`
    +`<h4>ราคา</h4><p>${nd.cost} แต้มรูนต่อขั้น · รวมทั้งโหนด ${nd.cost*nd.max} แต้ม · มีอยู่ ${tfFree(ch)} แต้ม</p>`
    +(SK[id].type==='passive'&&nd.kind!=='num'?'<p>สกิลติดตัว: ผลนี้ทำงานกับการโจมตีของทุกสกิล</p>':'')); }
function tfClick(e){
  const q=e.target.closest('[data-help]'); if(q){ if(q.dataset.help==='node') tfNodeHelp(); else tfHelp(q.dataset.help); return; }
  const n=e.target.closest('[data-n]'); if(n){ TFW.sel=n.dataset.n; tfRender(); const d=TFW.box&&TFW.box.querySelector('.tf-det'); if(d&&d.scrollIntoView) try{ d.scrollIntoView({block:'nearest'}); }catch(_){} return; }
  const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; const ch=tfCh(), id=TFW.id; if(!ch) return;
  if(b.dataset.a==='shop'){ shopOpen('rune'); return; }
  if(b.dataset.a==='sl'){ if(slBuy(ch,id)) toast(SK[id].n+' เริ่มที่ Lv '+slOf(tfCh(),id),'good'); else toast(slWhy(ch,id)||'ซื้อไม่ได้','bad'); }
  else if(b.dataset.a==='buy'){ const nd=tfNode(id,TFW.sel);
    if(tfBuy(ch,id,TFW.sel)){ toast(nd.n+' ขั้น '+tfLv(tfCh(),id,TFW.sel),'good'); try{ initAudio(); tone(660,.1,'triangle',.07); tone(990,.16,'sine',.05,0,.07); }catch(_){} }
    else toast(tfWhy(ch,id,TFW.sel)||'ฝึกไม่ได้','bad'); }
  else if(b.dataset.a==='reset'){ const way=tfResetWay(ch), have=typeof invCount==='function'?invCount(ch,'u_forget')|0:0;
    const label=way==='free'?'ฟรี (ก่อน Lv '+BAL.RESET.freeBelow+')':way==='freeOnce'?'ฟรี (เหลือ 1 ครั้ง)':'ใช้ม้วนลืมเลือน 1 ม้วน (มี '+have+')';
    Promise.resolve(confirmBox('รีเซ็ตต้นไม้ '+SK[id].n+'? ได้แต้มรูนคืน '+tfResetGain(ch,id)+' แต้ม (รวมระดับเริ่มต้น) · '+label,{okText:'รีเซ็ต'})).then(ok=>{
      if(!ok) return; const done=tfReset(tfCh(),id,{scroll:way==='scroll'}); toast(done?'รีเซ็ตต้นไม้แล้ว':'รีเซ็ตไม่ได้',done?'good':'bad'); tfRender(); if(prgVis('scrSkills')) pksRender(); }).catch(er=>console.error(er));
    return; }
  tfRender(); if(prgVis('scrSkills')) pksRender(); }

/* ---- ? on the level-up cards ---- */
function tfTreeLines(id){ const t=P&&P.tree&&P.tree[id]; if(!t) return [];
  return tfNodes(id).filter(n=>t[n.id]>0).map(n=>n.i+' '+(n.kind==='num'?'':n.n+' · ')+tfText(n,t[n.id])); }
function tfLines(L){ return L.map(x=>typeof x==='object'?x.t:x).filter(Boolean); }
function tfCardDetail(o){
  const T=[], P2=s=>tfLines(hdSkillLines(s).map(([k,v])=>k+' '+v)), cap=id=>P.rank?(P.rank[id]||0):5;
  const skill=(d,id)=>{ const main=typeof SX!=='undefined'&&P.sx&&SX.main[id];
    if(main) T.push('<h4>ค่าหลัก</h4><p>'+tfE(main+' · '+STATS[main].n)+' · การ์ด '+tfE(main)+' 1 ใบ = สกิลนี้แรงขึ้น '+tfPc(sxRate(P))+'</p>');
    const tr=tfTreeLines(id); if(tr.length) T.push('<h4>🌳 จากต้นไม้</h4><p>'+tr.map(tfE).join('<br>')+'</p>');
    if(d.evo) T.push('<h4>วิวัฒนาการ</h4><p>'+tfE(d.evo.n+': '+d.evo.d)+' · ต้อง Lv 5 + การ์ด '+d.evo.s+(P.sx?' + '+d.evo.s+' ถาวร 25':'')+'</p>'); };
  if(o.k==='new'){ const d=SK[o.id], s=makeSkill(o.id); if(P.sx){ s.cx=true; s.mod=null; }
    T.push('<p>'+tfE(d.d)+'</p><h4>ตัวเลข Lv 1</h4><p>'+P2(s).map(tfE).join('<br>')+'</p>');
    if(P.rank) T.push('<h4>เพดาน</h4><p>ฝึกไว้ ★'+cap(o.id)+' → รอบนี้อัปได้ถึง Lv '+cap(o.id)+'</p>'); skill(d,o.id); return [d.i+' สกิลใหม่: '+d.n,T.join('')]; }
  if(o.k==='up'||o.k==='evo'){ const s=o.s, d=s.def, nx=hdNextText(s,o.k);
    T.push('<p>'+tfE(o.k==='evo'?d.evo.d:d.d)+'</p><h4>ตอนนี้ (Lv '+s.lv+(s.evolved?' · วิวัฒนาการแล้ว':'')+')</h4><p>'+P2(s).map(tfE).join('<br>')+'</p>');
    if(nx) T.push('<h4>หลังเลือก</h4><p>'+tfE(nx).replace(/ · /g,'<br>')+'</p>');
    if(P.rank) T.push('<h4>เพดาน</h4><p>ฝึกไว้ ★'+cap(s.id)+(rankCap(G.char,s.id)>cap(s.id)?' · ฝึกเพิ่มได้ถึง ★'+rankCap(G.char,s.id)+' ที่หน้าสกิล':'')+'</p>');
    skill(d,s.id); return [d.i+' '+(o.k==='evo'?'วิวัฒนาการ: '+d.evo.n:d.n+' Lv '+s.lv+' → '+(s.lv+1)),T.join('')]; }
  if(o.k==='stat'){ const st=STATS[o.stat], have=P.stats[o.stat]|0, ds=typeof st.d==='function'?st.d():st.d;
    T.push('<p>'+tfE(P.sx&&have>=5&&typeof SX!=='undefined'&&SX.half[o.stat]?SX.half[o.stat]:ds)+'</p><h4>ใบนี้ทำให้ (ใบที่ '+(have+1)+')</h4><p>'+tfLines(hdStatEffect(o.stat)).map(tfE).join('<br>')+'</p>');
    if(P.sx){ const uses=P.skills.filter(s=>SX.main[s.id]===o.stat).map(s=>s.def.n);
      T.push('<h4>ค่าหลักของ</h4><p>'+(uses.length?tfE(uses.join(', '))+' · ใบละ +'+tfPc(sxRate(P)):'ยังไม่มีสกิลในรอบนี้ที่ใช้ค่านี้เป็นค่าหลัก')+'</p>');
      const nx=sxNext(P,o.stat).slice(0,4); if(nx.length) T.push('<h4>จุดเปลี่ยนถัดไป</h4><p>'+nx.map(x=>'อีก '+x.n+' ใบ: '+tfE(x.s.def.n+' '+x.t)).join('<br>')+'</p>');
      T.push('<p class="tf-note">การ์ดค่าสถานะเป็นของในรอบนี้เท่านั้น ไม่ใช่ค่าสถานะถาวร</p>'); }
    return [st.i+' '+SNAME(o.stat)+' · '+st.n,T.join('')]; }
  if(o.k==='potion') return ['🧪 ยาฟื้นฟู','<p>ฟื้นฟู HP 40% ของ HP สูงสุดทันที · ขึ้นเมื่อไม่มีการ์ดอื่นให้สุ่มพอ</p>'];
  return ['💰 ถุงทอง','<p>คะแนน +250'+(G.char?' และทองจริง +'+5*P.lv+' (5 × Lv ความชำนาญตอนนี้)':'')+' · ขึ้นเมื่อไม่มีการ์ดอื่นให้สุ่มพอ</p>']; }
function tfCardQ(c,o){
  if(c.querySelector('.tf-cq')) return;
  { const el=o.k==='new'?SK[o.id]&&SK[o.id].el:o.k==='up'?skEl(o.s):o.k==='evo'?(SK_EVO_EL[o.s.id]||o.s.def.el):null, t=c.querySelector('.tag');   // element chip (29)
    if(el&&t&&EL[el]) t.insertAdjacentHTML('beforeend',` <span class="el-chip" style="--elc:${EL[el].c}">${EL[el].i} ${EL[el].n}</span>`); } const q=document.createElement('span'); q.className='tf-cq'; q.textContent='?'; q.setAttribute('role','button');
  q.setAttribute('aria-label','อธิบายการ์ดนี้ละเอียด'); q.title='อธิบายละเอียด';
  const go=e=>{ e.preventDefault(); e.stopPropagation(); try{ const [t,h]=tfCardDetail(o); tfHelpBox(t,h); }catch(er){ console.error(er); } };
  q.tabIndex=0; q.addEventListener('click',go); q.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') go(e); }); q.addEventListener('pointerdown',e=>e.stopPropagation()); c.append(q);
  const head=document.getElementById('lvTitle'); if(head&&!document.getElementById('tfLvQ')){ const b=document.createElement('button'); b.type='button'; b.id='tfLvQ'; b.className='tf-q tf-lvq';
    b.textContent='?'; b.setAttribute('aria-label','อธิบายการเลือกการ์ด'); b.addEventListener('click',e=>{ e.stopPropagation(); tfHelp('level'); }); head.after(b); } }
// dev (§7.9): RG.tree.buy('thunder','A1') on the active character · RG.tree.info() = rune points + trees · RG.tree.open(id) · RG.tree.fx() = effects of the running skills
DEV.tree={ buy(id,n){ const ch=curChar(); return tfBuy(ch,id,n)||tfWhy(ch,id,n); }, info(){ const ch=curChar(); return ch&&{free:tfFree(ch), spent:tfSpent(ch), tr:ch.tr}; },
  open(id){ tfOpen(id); return !!TFW.box; }, fx(){ return P?{tf:!!P.tf, tfg:P.tfg||null, skills:P.skills.map(s=>({id:s.id, lv:s.lv, fx:s.fx||null, mod:s.mod||null}))}:null; } };
