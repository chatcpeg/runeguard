/* ================= 68-ui-boss.js · lane H · scrBoss (ล่าบอส): difficulty, boss list, rush, help (?) ================= */
// The fort's "ล่าบอส" button → scrBoss: 3 difficulties (ปกติ · ยาก · ฝันร้าย · the next one opens with a win on the one before),
// every boss of BOSS_LIST with its level, best time + medal and today's full rewards, or why it is still locked · the rush below.
// Names come from data (textContent only) · after a fight the router comes back here (SH_RET.boss, 67).
const BSU={di:0, wired:false};
regScreen('scrBoss');
UIKEY.scrBoss=bsuKey;
BUS.on('screen',id=>{ if(id==='scrBoss') bsuRender(); });
HUB.push({id:'boss', n:'ล่าบอส', i:'👑', order:25, badge:bsuBadge, open(){ if(!curChar()){ toast('สร้างตัวละครก่อน','info'); UI.go('scrNew'); return; } UI.go('scrBoss'); }});
function bsuBadge(){ const ch=curChar(); if(!ch) return 'ต้องมีตัวละครก่อน'; const open=bsUnlocked(ch); let full=0; for(const id of open) full+=bsFullLeft(id);
  return 'ปลดแล้ว '+open.length+'/'+BOSS_LIST.length+' ตัว'+(open.length?' · รางวัลเต็มวันนี้ '+full:''); }
function bsuKey(e){ if(!G&&!SH.sheet&&!SH.conf&&(e.code==='ArrowLeft'||e.code==='ArrowRight')){ const n=BAL.BOSS.diff.length, d=clamp(BSU.di+(e.code==='ArrowLeft'?-1:1),0,n-1);
    if(d!==BSU.di){ BSU.di=d; bsuRender(); } e.preventDefault(); return true; }
  return shKey(e); }
function bsuWire(){ if(BSU.wired) return; BSU.wired=true;
  const h=shEl('bsHelp'); if(h) h.addEventListener('click',()=>tfHelp('boss'));
  const d=shEl('bsDiff'); if(d) d.addEventListener('click',e=>{ const b=e.target.closest('[data-d]'); if(!b) return; BSU.di=+b.dataset.d|0; bsuRender(); });
  const l=shEl('bsList'); if(l) l.addEventListener('click',e=>{ const b=e.target.closest('[data-go]'); if(!b||b.disabled) return; bossStart(b.dataset.go,BSU.di); });
  const r=shEl('bsRush'); if(r) r.addEventListener('click',e=>{ const b=e.target.closest('[data-rush]'); if(!b||b.disabled) return;
    Promise.resolve(confirmBox('เริ่มฝ่าด่านบอส '+bsUnlocked(curChar()).length+' ตัวต่อเนื่อง (ระดับปกติ)?',{okText:'เริ่ม'})).then(ok=>{ if(ok) bossRushStart(); }).catch(er=>console.error(er)); }); }
function bsuRender(){ bsuWire(); const ch=curChar(), A=SAVE&&SAVE.acct, who=shEl('bsWho'), dv=shEl('bsDiff'), list=shEl('bsList'), rush=shEl('bsRush'); if(!list||!dv) return;
  const mk=shEl('bsMarks'); if(mk) mk.textContent='🏅 '+((A&&A.marks)|0).toLocaleString('en-US');
  if(who){ who.textContent=''; if(ch){ const t=shMk('span',''); t.append(shMk('b','',ch.name),shMk('small','',shJobName(ch)+' · Lv '+ch.lv+' · Job '+ch.jlv));
    who.append(shPortrait(ch,40),t,shBtn('เปลี่ยน','btn ghost',()=>UI.go('scrChars'))); } }
  const D=BAL.BOSS.diff; BSU.di=clamp(BSU.di|0,0,D.length-1);
  if(dv.childElementCount!==D.length){ dv.textContent=''; D.forEach((q,i)=>{ const b=shBtn('','bs-d'); b.dataset.d=String(i); b.append(shMk('b','',q.n),shMk('small','')); dv.append(b); }); }
  D.forEach((q,i)=>{ const b=dv.children[i]; b.setAttribute('aria-pressed',String(i===BSU.di)); b.children[1].textContent=(q.lv?'Lv +'+q.lv+' · ':'')+'ตรา '+BAL.BOSS.marks[i]; });
  list.textContent='';
  for(const B of BOSS_LIST){ const lock=bsLockWhy(B.id,ch), dw=lock?'':bsDiffWhy(B.id,BSU.di), why=!ch?'ต้องมีตัวละครก่อน':lock||dw, row=shMk('div','bs-it'+(lock?' lk':'')), t=shMk('div','bs-t');
    row.setAttribute('role','listitem');
    row.append(shMk('span','bs-ic',lock?'🔒':B.i));
    t.append(shMk('b','',B.n+' · Lv '+bsLv(B.id,BSU.di)));
    if(lock) t.append(shMk('small','bs-lock',lock));
    else { const rec=bsRec(B.id,BSU.di), s=shMk('small','');
      if(rec){ s.append(shMk('span','bs-md '+rec.medal,rec.medal),document.createTextNode(' ดีสุด '+fmtClock(rec.sec)+' · S ≤ '+fmtClock(B.par[BSU.di]))); }
      else s.textContent=dw||'ยังไม่เคยชนะระดับนี้ · S ≤ '+fmtClock(B.par[BSU.di]);
      t.append(s); const left=bsFullLeft(B.id); t.append(shMk('small','bs-full'+(left?'':' none'),left?'✦ รางวัลเต็มวันนี้ '+left+'/'+BS.FULL:'วันนี้รางวัลเต็มครบแล้ว · ต่อจากนี้ได้ '+Math.round(BS.CUT*100)+'%')); }
    row.append(t);
    const b=shBtn('สู้','btn primary bs-go'); b.dataset.go=B.id; if(why){ b.disabled=true; b.title=why; b.className='btn ghost bs-go'; }
    b.setAttribute('aria-label','สู้กับ'+B.n+(why?' · '+why:'')); row.append(b); list.append(row); }
  if(rush){ const n=ch?bsUnlocked(ch).length:0, ok=!!ch&&n>=BS.rushMin; rush.textContent='';
    rush.append(shMk('h3','','⚔ ฝ่าด่านบอส'+(n?' · '+n+' ตัว':'')),
      shMk('p','','สู้ทุกตัวที่ปลดแล้วต่อเนื่อง เรียงตามเลเวล (ระดับปกติ) · ระหว่างตัวฟื้น HP 25% + การ์ด 1 ใบ · แต่ละตัวได้รางวัลตามปกติ (นับสิทธิ์รางวัลเต็มด้วย) · ครบทุกตัวได้ตรา +'+BAL.BOSS.rush.marks+(bsRushFree()?' (สัปดาห์นี้ยังไม่ได้รับ)':' (สัปดาห์นี้รับแล้ว)')));
    const b=shBtn(ok?'เริ่มฝ่าด่าน':'ปลดบอสอย่างน้อย '+BS.rushMin+' ตัวก่อน',ok?'btn primary sh-wide':'btn ghost sh-wide'); b.dataset.rush='1'; b.disabled=!ok; rush.append(b); }
  shChrome('scrBoss'); }

if(typeof TF_HELP!=='undefined'){                                      // help pages (59) · absent in pure test loads
TF_HELP.boss=['ล่าบอส',()=>`<p>สู้กับบอสตัวเดียวในลานประลองวงกลม (ขอบคือแนวเสา ออกนอกวงไม่ได้) · บอสโผล่หลังเข้าลาน ${BS.spawn} วิ · ลูกน้องมาจากท่าของบอสเท่านั้น ·
  สกิลในช่องติดตัวเริ่มที่ ★ ที่ฝึกไว้ · เก็บ EXP จากบอส/ลูกน้องได้การ์ดความชำนาญ (การ์ดสถานะไม่มีเพดาน) · ตายก็แค่แพ้ ไม่เสียอะไร</p>
  <h4>ความยาก</h4><table>${BAL.BOSS.diff.map((q,i)=>tfRow(q.n,'Lv บอส +'+q.lv+' · HP ×'+(Math.round(q.hp*BS.HPD[i]*10)/10)+' · ดาเมจ ×'+q.dmg+' · ตรา '+BAL.BOSS.marks[i]+(i?' · เปิดเมื่อชนะระดับ'+BAL.BOSS.diff[i-1].n:''))).join('')}</table>
  <h4>รางวัล</h4><p>ชนะแล้วได้ทอง Base/Job EXP ตราผู้พิชิต และกล่องของ (อุปกรณ์ตามเลเวลบอส ผงรูน ผลึก รูนบอส/เศษรูน) ·
  <b>รางวัลเต็มวันละ ${BS.FULL} ครั้งต่อบอส</b> (นับทุกความยาก · รีเซ็ตเที่ยงคืนตามเวลาเครื่อง) · ครั้งต่อไปของวันได้ทองและ EXP ${Math.round(BS.CUT*100)}% ไม่มีตรา และกล่องมีแค่ผงรูนบางครั้ง ·
  บอสที่ต่ำกว่าตัวละครเกิน 5 เลเวลให้รางวัลลดลงเหมือนเอาชีวิตรอด</p><p>${SV_DAY_NOTE}</p>
  <h4>เหรียญเวลา</h4><table>${tfRow('S','ไม่เกินเวลาเป้า (แสดงใต้ชื่อบอส)')}${tfRow('A','ไม่เกิน '+BAL.BOSS.medalA+' เท่าของเวลาเป้า')}${tfRow('B','ชนะ')}</table><p>เก็บเวลาที่ดีที่สุดของแต่ละบอสแต่ละความยาก</p>
  <h4>ปลดบอส</h4><table>${tfRow('💀🧙☠️ บอสอันเดด','ถึงคลื่น 5 / 10 / 20 ในเอาชีวิตรอด')}${tfRow('👑🫧🪓 จ้าวถิ่น','ล้มได้ในแผนที่ของมันสักครั้ง (ท่องแดนรูน)')}${tfRow('🐏🌿🐢 จ้าวถิ่นรุ่นเก่า','เลเวลตัวละคร 8 / 15 / 22')}</table>
  <h4>ฝ่าด่านบอส</h4><p>สู้ทุกตัวที่ปลดแล้วต่อกันที่ระดับปกติ · ระหว่างตัวฟื้น HP ${Math.round(BAL.BOSS.rush.heal*100)}% และเลือกการ์ด 1 ใบ · ถอยทัพจากเมนูพักได้พร้อมรางวัลของตัวที่ปราบแล้ว · ครบทุกตัวได้ตรา +${BAL.BOSS.rush.marks} สัปดาห์ละครั้ง (สัปดาห์ก็นับเดินหน้าอย่างเดียวเหมือนวัน)</p>
  <h4>ออกกลางรอบ</h4><p>เมนูพัก → กลับป้อม / เริ่มใหม่: ถ้าปราบบอสไปแล้วอย่างน้อย 1 ตัว ได้รางวัลของตัวที่ปราบแล้วก่อนออก (ปุ่มบอกไว้) · ยังไม่ได้ปราบสักตัว = ไม่มีรางวัล</p>
  <h4>ดาเมจ</h4><p>ระดับปกติและยาก โดนครั้งเดียวเสีย HP ไม่เกิน ${Math.round(BS.HITCAP*100)}% ของ HP สูงสุด (แพ้ธาตุอาจเกินได้เล็กน้อย) · ฝันร้ายไม่จำกัด</p>
  <p><button type="button" class="btn ghost" data-help="elements">ดูวงล้อธาตุ</button></p>`]; }
