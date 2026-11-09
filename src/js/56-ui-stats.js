/* ================= 56-ui-stats.js · lane P · stats tab (CHARTABS.stats) ================= */
// §3.3 · §8.8: every change waits as "pending" until [ยืนยัน] (commitStats) or [ยกเลิก] · [+] tap = 1 point, hold = 5 at a time ·
// (n) = cost of the next point (statCost) · [แจกอัตโนมัติ] spends what is left by the class preset (pgAutoStats) ·
// the preview runs the real recalc() on a scratch player with the would-be bonus (buildRunBonus) · reset = prgReset (54).
let pstPend=null;                                    // {id, d:{STR:n,…}} pending points of one character (kept while tabs switch)
let pstUI=null;                                      // {root, ch} of the tab that is drawn
function pstD(ch){ if(!pstPend||pstPend.id!==ch.id) pstPend={id:ch.id, d:{}}; return pstPend.d; }
function pstLeft(ch){ return (ch.pts|0)-pgStatCost(ch,pstD(ch)); }
function pstSum(ch){ const d=pstD(ch), s={}; for(const k of STAT_ORDER) s[k]=((ch.st||{})[k]|0)+(d[k]|0); return s; }
// +n / −n pending points on stat k (stops at the cap, at the points left, at 0 pending) → how many changed
function pstStep(ch,k,n){ const d=pstD(ch); let done=0;
  if(n>0){ for(;done<n;done++){ const x=((ch.st||{})[k]|0)+(d[k]|0); if(x>=BAL.CAP.stat||BAL.statCost(x)>pstLeft(ch)) break; d[k]=(d[k]|0)+1; } }
  else { for(;done<-n&&(d[k]|0)>0;done++) d[k]--; if(!d[k]) delete d[k]; }
  return done; }
// [แจกอัตโนมัติ]: the points still left go by the class preset on top of what is pending
function pstAuto(ch){ const add=pgAutoStats(Object.assign({},ch,{st:pstSum(ch)}),pstLeft(ch)), d=pstD(ch); let n=0;
  for(const k in add){ d[k]=(d[k]|0)+add[k]; n+=add[k]; } return n; }
// what one point of each stat gives (from BAL.META_K, so the text follows the balance file)
function pstHint(k){ const K=BAL.META_K[k], o=[];
  for(const q in K){ const v=K[q]; if(q==='speedMax'||q==='proj40') continue;
    if(q==='cd'){ o.push('คูลดาวน์ −'+(+((1-v)*100).toFixed(2))+'%'); continue; }
    o.push((JD_BONUS_TH[q]||q)+' +'+(JD_PCT[q]?(+(v*100).toFixed(2))+'%':+v.toFixed(3))+(q==='speed'&&K.speedMax?' (สูงสุด '+Math.round(K.speedMax*100)+'%)':'')); }
  return o.join(' · ')+' ต่อแต้ม'+(K.proj40?' · ครบ 40 แต้ม: กระสุน +'+K.proj40:''); }
// derived numbers of §3.7 for ch with stats st: a scratch player (no run, no G) through the real recalc
function pstCalc(ch,st){
  const c=pgCls(ch); if(!c) return []; const p=makePlayer(c); p.adv=pgAdvOf(ch); p.bonus=buildRunBonus(Object.assign({},ch,{st})); recalc(p);
  const K=22+.8*(ch.lv|0), pc=v=>Math.round(v*100);
  return [['พลังโจมตี',Math.round(100*p.might)],['HP',Math.round(p.maxHp)],['ป้องกัน',(+p.armor.toFixed(1))+' (−'+pc(p.armor/(p.armor+K))+'%)'],
    ['ฟื้นฟู/วิ',+p.regen.toFixed(2)],['คริ',pc(p.crit)+'%'],['แรงคริ','×'+(+p.critMult.toFixed(2))],['คูลดาวน์',pc(1-p.cdMul)>0?'−'+pc(1-p.cdMul)+'%':'0%'],
    ['ความเร็ว',Math.round(p.speed)],['พื้นที่สกิล','+'+pc(p.area-1)+'%'],['ระยะเวลาสกิล','+'+pc(p.durMul-1)+'%'],['กระสุน','+'+p.extraProj],
    ['ดรอป','+'+pc(p.drop)+'%'],['EXP','+'+pc(p.xpMul-1)+'%']]; }
function pstDraw(root,ch){
  pstUI={root, ch:ch||null}; if(!root) return;
  if(!ch||!pgCls(ch)){ root.innerHTML='<p class="prg-empty">ยังไม่มีตัวละคร</p>'; return; }
  let h='<div class="pst">'+(saveReadOnly()?prgRO():'')+'<div class="pst-head"><span>แต้มเหลือ <b data-r="left"></b></span>'
    +'<button class="btn ghost pst-auto" type="button" data-a="auto">แจกอัตโนมัติ</button></div><ul class="pst-list">';
  for(const k of STAT_ORDER) h+=`<li class="pst-row" data-k="${k}"><div class="pst-n"><b>${STAT_TH[k]}</b><small>${pstHint(k)}</small></div>`
    +`<span class="pst-v" data-r="v"></span><button class="pst-b" type="button" data-p="-1" aria-label="ลด ${STAT_TH[k]}">−</button>`
    +`<button class="pst-b" type="button" data-p="1" aria-label="เพิ่ม ${STAT_TH[k]}">+</button><span class="pst-c" data-r="c"></span></li>`;
  h+='</ul><p class="pst-tip">แตะ [+] เพิ่มทีละแต้ม · กดค้างเพิ่มทีละ 5 · (ตัวเลข) = แต้มที่ใช้สำหรับแต้มถัดไป</p>'
    +'<div class="box pst-prev"><h3 class="pst-ph" data-r="ph"></h3><dl class="pst-dl" data-r="calc"></dl></div>'
    +'<div class="btn-row pst-act"><button class="btn ghost" type="button" data-a="cancel">ยกเลิก</button><button class="btn primary" type="button" data-a="ok">ยืนยัน</button></div>'
    +'<div class="prg-reset"><span data-r="rs"></span><button class="btn ghost" type="button" data-a="reset">รีเซ็ตแต้ม</button></div></div>';
  root.innerHTML=h;
  const box=root.querySelector('.pst'); box.addEventListener('click',pstClick);
  for(const b of box.querySelectorAll('[data-p]')){ const k=b.closest('[data-k]').dataset.k, s=+b.dataset.p;
    prgRepeat(b,n=>{ const U=pstUI; if(!U||!U.ch||saveReadOnly()) return 0; const m=pstStep(U.ch,k,s*n); if(m) pstPaint(); return m; }); }
  pstPaint(); }
function pstPaint(){
  const U=pstUI; if(!U||!U.ch||!U.root) return; const R=U.root, ch=U.ch, box=R.querySelector('.pst'); if(!box) return;
  const ro=saveReadOnly(), d=pstD(ch), left=pstLeft(ch), any=Object.keys(d).length>0, q=s=>box.querySelector(s);
  q('[data-r="left"]').textContent=String(left);
  for(const li of box.querySelectorAll('.pst-row')){ const k=li.dataset.k, x=(ch.st||{})[k]|0, p=d[k]|0, y=x+p, cap=y>=BAL.CAP.stat, cost=cap?0:BAL.statCost(y);
    li.classList.toggle('pend',p>0); li.querySelector('[data-r="v"]').textContent=p?x+'→'+y:String(x);
    li.querySelector('[data-r="c"]').textContent=cap?'ตัน':'('+cost+')';
    li.querySelector('[data-p="1"]').disabled=ro||cap||cost>left; li.querySelector('[data-p="-1"]').disabled=ro||!p; }
  q('[data-a="auto"]').disabled=ro||!STAT_ORDER.some(k=>{ const y=pstSum(ch)[k]; return y<BAL.CAP.stat&&BAL.statCost(y)<=left; });
  q('[data-a="ok"]').disabled=ro||!any; q('[data-a="cancel"]').disabled=!any;
  const A=pstCalc(ch,ch.st||{}), B=any?pstCalc(ch,pstSum(ch)):A;
  q('[data-r="ph"]').textContent=any?'ผลถ้ายืนยัน':'ค่าปัจจุบัน';
  q('[data-r="calc"]').innerHTML=A.map((r,i)=>{ const b=B[i][1], ch2=String(b)!==String(r[1]);
    return `<div${ch2?' class="up"':''}><dt>${r[0]}</dt><dd>${ch2?r[1]+' → '+b:r[1]}</dd></div>`; }).join('');
  const S=prgResetInfo(ch,'st'); q('[data-r="rs"]').textContent='รีเซ็ต: '+S.label; q('[data-a="reset"]').disabled=!S.can; }
function pstClick(e){
  const b=e.target.closest('[data-a]'); if(!b||b.disabled) return; const U=pstUI; if(!U||!U.ch) return; const ch=U.ch, a=b.dataset.a;
  if(a==='auto'){ if(!pstAuto(ch)) toast('แต้มไม่พอสำหรับแต้มถัดไป','info'); }
  else if(a==='cancel') pstPend=null;
  else if(a==='ok'){ const d=Object.assign({},pstD(ch));
    if(commitStats(ch,d)){ pstPend=null; toast('บันทึกแต้มสถานะแล้ว','good'); } else toast(saveReadOnly()?'แก้ไขไม่ได้':'ยืนยันไม่ได้ · ลองใหม่','bad'); }
  else if(a==='reset'){ prgReset(ch,'st',()=>{ pstPend=null; pstPaint(); }); return; }
  else return;
  pstPaint(); }
CHARTABS.stats={n:'สถานะ', order:30, render(root,ch){ pstDraw(root,ch); }};
