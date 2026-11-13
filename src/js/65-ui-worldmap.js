/* ================= 65-ui-worldmap.js · lane F · scrWorld (แผนที่โลก) + field HUD buttons, pause sheet, help pages (?) ================= */
// The fort's "ท่องแดนรูน" button → scrWorld: the 3 maps on one path (ป้อม → ป่า → บึง → ค่าย), each with its level range, main
// elements, field boss + timer, rampage, monsters and drops · locked maps say how they open (level, or the boss of the map before).
// In a map: [?] help and [🏰 กลับป้อม] (5-s cast, a hit cancels · key B) sit with the card / potion buttons (55 #hdBox).
const WM={sel:'g1', timer:0, nodes:null};
regScreen('scrWorld');
UIKEY.scrWorld=wmKey;
if(typeof HB_ENTER!=='undefined') HB_ENTER.scrWorld=()=>wmGo();
BUS.on('screen',id=>{ if(id==='scrWorld') wmRender(); else wmStop(); });
HUB.push({id:'field', n:'ท่องแดนรูน', i:'🗺️', order:10, badge:wmBadge, open(){ if(!curChar()){ toast('สร้างตัวละครก่อน','info'); UI.go('scrNew'); return; } WM.sel=wmDefault(); UI.go('scrWorld'); }});
MODES.field.pauseExtra=fdPauseExtra; MODES.field.hudTick=fdHudTick;
function wmE(s){ return esc(String(s==null?'':s)); }
function wmDefault(){ const ch=curChar(); let best='g1'; for(const z of FD_ORDER) if(!fdLockWhy(ch,z)) best=z; return ch&&svHas(ZONES,ch.zone)&&!fdLockWhy(ch,ch.zone)?ch.zone:best; }
function wmBossText(z){ const s=fieldBossState(z); if(!s.name) return ''; if(!s.seen) return '👑 ยังไม่พบ';
  return s.ready?'👑 พร้อมแล้ว!':'👑 '+fmtClock(s.inSec); }
function wmBadge(){ const ch=curChar(); if(!ch) return 'ต้องมีตัวละครก่อน'; let open=0, ready=0;
  for(const z of FD_ORDER){ if(!fdLockWhy(ch,z)) open++; const s=fieldBossState(z); if(s.seen&&s.ready) ready++; }
  return 'เปิดแล้ว '+open+'/'+FD_ORDER.length+' แผนที่'+(ready?' · 👑 พร้อม '+ready:''); }
function wmKey(e){ if(!G&&!SH.sheet&&!SH.conf&&(e.code==='ArrowUp'||e.code==='ArrowDown')){ const i=FD_ORDER.indexOf(WM.sel), j=clamp(i+(e.code==='ArrowUp'?-1:1),0,FD_ORDER.length-1); if(j!==i){ WM.sel=FD_ORDER[j]; wmRender(); } e.preventDefault(); return true; }
  return shKey(e); }
function wmStop(){ if(WM.timer){ clearInterval(WM.timer); WM.timer=0; } }
function wmRender(){ const ch=curChar(), who=shEl('wmWho'), map=shEl('wmMap'), body=shEl('wmBody'), go=shEl('wmGo'); if(!map||!body) return;
  if(!svHas(ZONES,WM.sel)) WM.sel='g1';
  who.textContent=''; if(ch){ const t=shMk('span',''); t.append(shMk('b','',ch.name),shMk('small','',shJobName(ch)+' · Lv '+ch.lv+' · Job '+ch.jlv));
    who.append(shPortrait(ch,40),t,shBtn('เปลี่ยน','btn ghost',()=>UI.go('scrChars'))); }
  map.textContent=''; const fort=shMk('div','wm-fort','🏰 ป้อมรูนทอง'); map.append(fort); WM.nodes={};
  for(const id of FD_ORDER){ const z=ZONES[id], lock=fdLockWhy(ch,id), b=shBtn('','wm-node'+(lock?' lk':'')+(id===WM.sel?' on':''),()=>{ WM.sel=id; wmRender(); });
    b.setAttribute('role','option'); b.setAttribute('aria-selected',String(id===WM.sel));
    const t=shMk('span','wm-nt'); t.append(shMk('b','',z.n),shMk('small','','Lv '+z.lv[0]+'–'+z.lv[1]+' · '+z.el.map(k=>EL[k].i).join('')));
    const st=shMk('span','wm-st',lock?'🔒':wmBossText(id)); WM.nodes[id]=st;
    b.append(shMk('span','wm-ni',z.i),t,st); map.append(shMk('i','wm-link'),b); }
  const z=ZONES[WM.sel], lock=fdLockWhy(ch,WM.sel), fz=ch&&svObj(ch.fz)&&svHas(ch.fz,WM.sel)?ch.fz[WM.sel]:null, B=z.boss&&EN[z.boss.id], bs=fieldBossState(WM.sel);
  body.textContent='';
  if(lock) body.append(shMk('p','sv-lock','🔒 '+lock));
  body.append(shMk('p','wm-d',z.d));
  const rows=[['ช่วงเลเวล','Lv '+z.lv[0]+'–'+z.lv[1]+(ch&&(ch.lv|0)<z.lv[0]?' · ตัวนี้ Lv '+ch.lv+' (ต่ำกว่า)':'')],
    ['ธาตุเด่น',z.el.map(k=>EL[k].i+' '+EL[k].n).join(' · ')+' · ใช้ธาตุที่ชนะทาง'],
    ['👑 จ้าวถิ่น',B?B.n+' · Lv '+B.lv+' · ทุก '+Math.round(z.boss.every/60)+' นาที':'-'],
    ['สถานะจ้าวถิ่น',bs.seen?(bs.ready?'พร้อมแล้ว · ปรากฏหลังเข้าแผนที่ 10 วิ':'อีก '+fmtClock(bs.inSec)):'ยังไม่เคยล้ม · ปรากฏหลังเข้าแผนที่ 2 นาที'],
    ['ฝูงอาละวาด',z.rampage?z.rampage.n+' (ทุก ~2.5 นาที)':'-'],
    ['ของที่ดรอป','อุปกรณ์ขั้น '+z.gearT.join('–')+' · ผงรูน · ยา'+(z.zn>=2?' · ผลึกรูน':'')+' · กล่องจ้าวถิ่น (รูน)'],
    ['สถิติตัวนี้',fz?'สังหาร '+fmtNum(fz.k|0)+' · ล้มจ้าวถิ่น '+(fz.b|0)+' · เวลา '+Math.round((fz.t|0)/60)+' นาที':'ยังไม่เคยมา']];
  const tbl=shMk('div','sv-tbl'); for(const [k,v] of rows){ const r=shMk('div','sv-row'); r.append(shMk('span','',k),shMk('b','',v)); tbl.append(r); } body.append(tbl);
  const mobs=shMk('div','wm-mobs'); mobs.append(shMk('h3','','มอนในแผนที่'));
  for(const id of wmMobs(WM.sel)){ const d=EN[id], c=shBtn('','wm-mob'+(d.aggro===0?' calm':''),()=>tfHelp('fz_'+WM.sel)); c.append(shMk('span','',(d.el?EL[d.el].i+' ':'')+d.n),shMk('small','','Lv '+d.lv+(d.aggro===0?' · ไม่ตีก่อน':''))); mobs.append(c); }
  body.append(mobs);
  body.append(shMk('p','hint','ตายหรือกลับป้อม = จบรอบ ได้ EXP ทอง ของที่เก็บไว้ทั้งหมด (ตาย: EXP −1% ของเลเวล) · ประตูรูนพาไปแผนที่ข้างเคียงได้โดยไม่จบรอบ'));
  go.disabled=!ch||!!lock; go.textContent=!ch?'สร้างตัวละครก่อน':lock?'🔒 ยังเข้าไม่ได้':'เข้า'+z.n;
  if(!WM.timer) WM.timer=setInterval(()=>{ if(curScreen()!=='scrWorld'){ wmStop(); return; } const c2=curChar(); for(const zid in WM.nodes) WM.nodes[zid].textContent=fdLockWhy(c2,zid)?'🔒':wmBossText(zid); },1000); }
function wmMobs(zid){ const z=ZONES[zid], s=new Set(); for(const r of z.regions||[]) for(const m of r.mix) s.add(m[0]); for(const c of z.camps||[]) for(const g of c.guards) s.add(g[0]);
  if(z.fort) s.add('o_archer').add('o_tower'); for(const t of [...s]){ const K=EN[t].kit; if(K&&K.summon) s.add(K.summon.type); if(K&&K.split) s.add(K.split.into); if(K&&K.dismount) s.add(K.dismount.mount); }
  return [...s].filter(t=>EN[t]).sort((a,b)=>(EN[a].lv-EN[b].lv)||(a<b?-1:1)); }
function wmGo(){ const ch=typeof pgFresh==='function'?pgFresh(curChar()):curChar(); if(!ch){ UI.go('scrNew'); return; }
  const why=fdLockWhy(ch,WM.sel); if(why){ toast(why,'bad'); return; } wmStop(); if(!fieldEnter(WM.sel)) toast('เข้าแผนที่ไม่ได้ในตอนนี้','bad'); }

/* ---- in a map: [?] + [🏰 กลับป้อม] next to the card / potion buttons ---- */
const FDH={box:null, rc:null, q:null, wired:false, lv:0, jl:0};
function fdHudOn(){ const host=shEl('hdBox'); if(!host) return;
  if(!FDH.box){ FDH.box=shMk('div','fd-btns'); FDH.q=shBtn('?','fd-q',()=>fdHelpNow()); FDH.q.setAttribute('aria-label','วิธีเล่นในแผนที่ (H)');
    FDH.rc=shBtn('🏰 กลับป้อม','fd-rc',()=>{ fdRecall(); fdHudTick(); }); FDH.rc.setAttribute('aria-label','กลับป้อม ร่าย 5 วินาที โดนตีจะยกเลิก (B)'); FDH.box.append(FDH.q,FDH.rc); }
  if(FDH.box.parentNode!==host) host.prepend(FDH.box); FDH.box.hidden=false; host.hidden=false; FDH.lv=0; FDH.jl=0;
  if(!FDH.wired){ FDH.wired=true; addEventListener('keydown',e=>{ if(!G||G.modeId!=='field'||G.ui||G.over||e.repeat) return;
    if(e.code==='KeyB'){ e.preventDefault(); fdRecall(); fdHudTick(); } else if(e.code==='KeyH'){ e.preventDefault(); fdHelpNow(); } }); } }
function fdHudOff(){ if(FDH.box) FDH.box.hidden=true; }
function fdHelpNow(){ if(!G||G.over) return; if(!G.ui) pauseGame(); if(typeof tfHelp==='function') tfHelp('field'); }
function fdHudTick(){ if(!G||G.modeId!=='field'||!G.fd||!FDH.box) return; if(FDH.box.hidden) FDH.box.hidden=false;
  const rc=G.fd.rc, t=rc?'🏰 '+Math.max(0,5-rc.t).toFixed(1)+' · ยกเลิก':'🏰 กลับป้อม'; if(FDH.rc.textContent!==t){ FDH.rc.textContent=t; FDH.rc.classList.toggle('on',!!rc); }
  const v=fdExpView(); if(!v||G.auto) return; if(!FDH.lv){ FDH.lv=v.lv; FDH.jl=v.jl; return; }
  if(v.lv>FDH.lv){ FDH.lv=v.lv; banner('เลเวลอัป! Lv '+v.lv,'บันทึกเข้าตัวละครเมื่อกลับป้อม · แต้มสถานะรออยู่'); sfx('level'); if(typeof shLogLine==='function') shLogLine('EXP ถึง Lv '+v.lv+' แล้ว (ได้จริงตอนจบรอบ)','good'); }
  if(v.jl>FDH.jl){ FDH.jl=v.jl; if(typeof shLogLine==='function') shLogLine('Job ถึง Lv '+v.jl+' แล้ว (ได้จริงตอนจบรอบ)','good'); } }
// pause sheet extras: what this trip has earned so far + go home (cast) + help
function fdPauseExtra(box){ if(!G||!G.fd||!box) return; const R=G.fdRun, F=G.fd, B=F.boss, w=shMk('div','fd-pz');
  const rows=[['EXP สะสม','+'+fmtNum(Math.round(R.exp))+' (Job +'+fmtNum(Math.round(R.exp*BAL.JOB_EXP))+')'],['ทองในรอบ',fmtNum(G.goldRun|0)],['ของที่เก็บ',(G.loot||[]).length+' ชิ้น'],
    ['จ้าวถิ่น',B?(B.alive?'กำลังต่อสู้':'อีก '+fmtClock(Math.max(0,B.at-G.t))):'-'],['ฝูงอาละวาด',F.ramp.on?'กำลังบุก!':'อีก ~'+fmtClock(Math.max(0,F.ramp.at-G.t))]];
  const g=shMk('div','hd-sheet-grid'); for(const [k,v] of rows) g.append(shMk('span','hd-k',k),shMk('span','hd-v',v)); w.append(shMk('div','dmg-title','รอบนี้ (ได้จริงเมื่อจบรอบ)'),g);
  w.append(shBtn('🏰 กลับป้อม · ร่าย 5 วิ (รับรางวัล)','btn primary sh-wide',()=>{ if(!G||G.over||G.ui!=='pause') return; resumeGame(); fdRecall(); fdHudTick(); }));
  w.append(shBtn('? วิธีเล่นในแผนที่','btn ghost sh-wide',()=>{ if(typeof tfHelp==='function') tfHelp('field'); }));
  box.prepend(w); }

/* ---- help pages (59 tfHelp) ---- */
if(typeof TF_HELP!=='undefined'){
TF_HELP.world=['ท่องแดนรูน',()=>`<p>ออกจากป้อมไปสำรวจแผนที่ที่มีขอบเขต · มอนมีบ้านของตัวเอง เดินเล่นรอบบ้าน เห็นเราแล้วไล่ตาม ไกลบ้านเกิน ${Math.round(BAL.FIELD.leash/10)} เมตรจะกลับบ้านและฟื้นเต็ม · ฆ่าแล้วจุดนั้นเกิดใหม่ใน 8–15 วิ (นอกจอเท่านั้น)</p>
  <table>${FD_ORDER.map(id=>{ const z=ZONES[id]; return tfRow(z.i+' '+tfE(z.n),'Lv '+z.lv[0]+'–'+z.lv[1]+' · ธาตุ '+z.el.map(k=>EL[k].i).join('')+' · 👑 '+tfE(EN[z.boss.id].n)+(z.prev?' · เปิดที่ Lv '+z.open+' หรือล้มจ้าวถิ่นแผนที่ก่อน':' · เปิดตั้งแต่แรก')); }).join('')}</table>
  <h4>จบรอบ</h4><p>กด 🏰 กลับป้อม (ร่าย 5 วิ · โดนตีจะยกเลิก) หรือเดินเข้าประตูป้อมในป่าหนามก็อบลิน = ได้ทุกอย่างที่สะสมไว้ · ตายก็ได้เหมือนกันแต่ EXP หาย 1% ของเลเวล · EXP/Job EXP ทอง ของ บันทึกตอนจบรอบ</p>
  <h4>จ้าวถิ่น</h4><p>แต่ละแผนที่มีจ้าวถิ่น 1 ตัว เกิดที่รังตามเวลาจริง (นับแม้ปิดเกม) · ยังไม่เคยล้ม = ปรากฏหลังเข้าแผนที่ 2 นาที · ล้มแล้วได้กล่องจ้าวถิ่น (ผงรูน ผลึก อุปกรณ์ รูน) · ครั้งแรกของบัญชีได้รูนแน่นอน</p>
  <h4>ชั้นสีของมอน</h4><table>${RANK.slice(1).map(R=>tfRow(`<b style="color:${R.c}">${R.n}</b>`,'HP ×'+R.hp+' · ดาเมจ ×'+R.dmg+' · EXP ×'+R.xp)).join('')}${tfRow('หัวหน้า','มีลูกน้องชนิดเดียวกันเดินตาม 2–3 ตัว')}${tfRow('ยอดฝีมือ','ดรอปหีบเล็กแน่นอน · มีท่ากระแทกพื้น')}</table>
  <p><button type="button" class="btn ghost" data-help="elements">ดูวงล้อธาตุ</button> <button type="button" class="btn ghost" data-help="field">ในแผนที่</button></p>`];
TF_HELP.field=['ในแผนที่',()=>`<table>${tfRow('เดิน','WASD / ลูกศร / ลากบนจอ · สกิลโจมตีเอง')}${tfRow('🏰 กลับป้อม (B)','ร่าย 5 วิ · โดนตีจะยกเลิก · ได้รางวัลทั้งหมด')}${tfRow('⬆ เลือกการ์ด','ความชำนาญสะสมไว้ กดเปิดเมื่อพร้อม (ตั้งค่า: เปิดทันที)')}${tfRow('🧪 ยา (Q / E)','คูลดาวน์ 8 วิ · ตั้งค่าใช้ยาอัตโนมัติได้')}${tfRow('? (H)','หน้านี้')}</table>
  <h4>ของในแผนที่</h4><table>${tfRow('ประตูรูน','ยืน 0.6 วิ → ไปแผนที่ข้างเคียง (ไม่จบรอบ ความชำนาญคงอยู่) · 🔒 = ยังไม่ปลด')}${tfRow('ประตูป้อม','ในป่าหนามก็อบลิน ยืนแล้วกลับป้อมทันที')}${tfRow('หีบค่าย','ยืนข้างหีบ 2 วิ → ทอง + ของ · เกิดใหม่ 4 นาที')}${tfRow('มินิแมป','มุมขวาบน · จุดขาว = เรา · แดง = จ้าวถิ่น · ฟ้า = ประตู · ทอง = หีบ')}${tfRow('หอธนู (ค่ายออร์ค)','ทำลายได้ · นักธนูบนหอตกลงมามึน')}${tfRow('ขอบแผนที่','ภูเขาล้อมรอบ ออกไม่ได้')}</table>
  <h4>มอน</h4><p>ป้ายบนหัว: ธาตุ · Lv · ชั้นสี · มอนสัตว์ป่า/บางชนิด "ไม่ตีก่อน" จนกว่าจะโดนตี · ฝูงเดียวกันช่วยกันไล่ · เส้นแดงบนพื้น = จะพุ่ง · วงทอง = จะกระแทก · เงาบนพื้น = หินกำลังตก</p>
  <h4>ฝูงอาละวาด</h4><p>ทุก ~2.5 นาที เตือนก่อน 5 วิ (ลูกศรขอบจอ) ฝูงใหญ่บุกจากทิศเดียว · ฆ่าหมดใน 30 วิ ได้กล่องรางวัล</p>
  <p>${FD_ORDER.map(id=>`<button type="button" class="btn ghost" data-help="fz_${id}">มอน${tfE(ZONES[id].n)}</button>`).join(' ')} <button type="button" class="btn ghost" data-help="elements">วงล้อธาตุ</button></p>`];
for(const id of FD_ORDER){ const z=ZONES[id];
  TF_HELP['fz_'+id]=[z.i+' '+z.n,()=>`<p>${tfE(z.d)}</p><table>${wmMobs(id).map(t=>{ const d=EN[t]; return tfRow((d.el?EL[d.el].i+' ':'')+tfE(d.n)+'<br><small>Lv '+d.lv+'</small>',tfE(d.d||'')); }).join('')}</table>
    <h4>👑 ${tfE(EN[z.boss.id].n)} · Lv ${EN[z.boss.id].lv}</h4><p>${tfE(EN[z.boss.id].d)} · รัง: ${tfE(z.boss.place)} · เกิดทุก ${Math.round(z.boss.every/60)} นาที</p>
    ${id==='s1'?`<p>ร่างแยก: ${tfE(EN.sb_shard.d)}</p>`:''}<h4>⚠ ${tfE(z.rampage.n)}</h4><p>${tfE(z.rampage.sub)}</p>`]; } }
// own markup (60-field.html) · wired once at load (§7.4)
if(typeof document!=='undefined'&&document.getElementById){ const g=document.getElementById('wmGo'), q=document.getElementById('wmHelp');
  if(g&&g.addEventListener) g.addEventListener('click',wmGo); if(q&&q.addEventListener) q.addEventListener('click',()=>{ if(typeof tfHelp==='function') tfHelp('world'); }); }
