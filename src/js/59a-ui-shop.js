/* ================= 59a-ui-shop.js · lane P · shop sheet + starting-Lv sheet (docs/PROPOSAL-shop.md) ================= */
// shopOpen(reason): the shop · from a locked card, the 🔒 reroll, the skills page and the fort. Buy: signed in (else sign-in, then
// back here) → confirm → POST /api/checkout {product} (token) → Stripe (card / PromptPay) → /?paid=1&sid= → shopReturn reloads
// rg_purchases (28) until that session is there. Prices / grants are the server's (api/). SHOP_PAY = GET /api/checkout
// {configured}, asked only when signed in · #dev grant (local dev server) while payment is off. slOpen(): starting Lv (28 slBuy).
const SHOP_WHY={cards:'การ์ดใบที่ 4–5 เลือกได้เฉพาะผู้สนับสนุน', reroll:'สุ่มใหม่ครบ 2 ครั้งแล้วในรอบนี้ · ผู้สนับสนุนสุ่มได้ไม่จำกัด', rune:'รูนไม่พอ · เติมรูนเพื่ออัปได้เร็วขึ้น'};
const SHOP_ERR={off:'ระบบชำระเงินยังไม่เปิด · เร็ว ๆ นี้', auth:'เซสชันหมดอายุ · เข้าสู่ระบบใหม่แล้วลองอีกครั้ง', net:'เชื่อมต่อไม่ได้ · ลองใหม่เมื่อออนไลน์',
  fail:'สร้างรายการชำระเงินไม่ได้ · ยังไม่มีการตัดเงิน ลองใหม่อีกครั้ง', site:'ซื้อได้ที่ runeguard-lac.vercel.app (หน้านี้เล่นได้แต่ซื้อไม่ได้)'};
const SHOP_WAIT=[1500,2500,4000,6000,10000,15000];                        // ms between rg_purchases reloads after ?paid=1 (≈ 40 s)
let SHOP_PAY=null, SHW={box:null, reason:'', busy:false, probe:null};
function shopCanPay(){ return SHOP_PAY===true; }
function shopBaht(n){ return n.toLocaleString('en-US')+' บาท'; }
function shopOpen(reason){ SHW.reason=reason||''; const box=shMk('div','sp-win'); SHW.box=box;
  box.addEventListener('click',shopClick); sheet(box,{title:'💎 ร้านรูน', onClose:()=>{ if(SHW.box===box) SHW.box=null; }}); shopRender();
  if(entSigned()){ shopProbe(); if(Date.now()-ENTS.at>120000) entRefresh().then(ok=>{ if(ok) shopAfter(); }); } }
function shopNote(){   // the line under the products: how buying works from here
  if(typeof CLOUD_OK==='undefined'||!CLOUD_OK) return SHOP_ERR.site;
  if(!entSigned()) return 'ต้องเข้าสู่ระบบก่อนซื้อ · สิทธิ์จะติดบัญชีและใช้ได้ทุกเครื่อง';
  if(SHOP_PAY===null) return 'กำลังตรวจระบบชำระเงิน…';
  if(!shopCanPay()) return SHOP_ERR.off;
  return 'จ่ายผ่าน Stripe (บัตร / พร้อมเพย์) · สิทธิ์ติดบัญชี '+(typeof authEmailMasked==='function'?authEmailMasked():'')+(ENTS.uid===entUid()?'':' · กำลังโหลดรายการซื้อ…'); }
function shopRender(){
  const box=SHW.box; if(!box) return; const sup=isSupporter(), w=shopWallet(), dev=shopDevHost()&&!shopCanPay();
  let h=SHW.reason&&SHOP_WHY[SHW.reason]?`<p class="sp-why">${tfE(SHOP_WHY[SHW.reason])}</p>`:'';
  h+=`<div class="sp-stat"><div><b>${sup?'💎 ผู้สนับสนุน':'ยังไม่เป็นผู้สนับสนุน'}</b><small>${sup?'เหลือ '+supDaysLeft()+' วัน':'การ์ด 3 จาก 5 ใบ · สุ่มใหม่ 2 ครั้งต่อรอบ'}</small></div>`
    +`<div><b>🔷 ${w.toLocaleString('en-US')}</b><small>รูนในกระเป๋าบัญชี</small></div><button type="button" class="tf-q" data-help="shop" aria-label="อธิบายร้านรูน">?</button></div>`;
  h+='<ul class="sp-list">'+RSHOP.products.map(p=>`<li class="sp-item${p.days?' sup':''}"><span class="sp-ic" aria-hidden="true">${p.i}</span><div class="sp-m"><b>${tfE(p.n)}</b><small>${tfE(p.d)}</small></div>`
    +`<button type="button" class="btn${p.days?'':' ghost'}" data-buy="${p.id}"${SHW.busy?' disabled':''}>${shopBaht(p.thb)}</button></li>`).join('')+'</ul>';
  h+=`<p class="sp-note">${tfE(SHW.busy?'กำลังเปิดหน้าชำระเงิน…':shopNote())} <button type="button" class="tf-q" data-help="pay" aria-label="อธิบายการชำระเงิน">?</button></p>`;
  if(dev) h+='<p class="sp-dev">#dev: ปุ่มซื้อ = มอบสิทธิ์ทดสอบในเครื่องนี้ · <button type="button" class="btn ghost" data-a="devclear">ล้างสิทธิ์ทดสอบ</button></p>';
  box.innerHTML=h; const f=box.querySelector('[data-buy]'); if(f) try{ f.focus({preventScroll:true}); }catch(_){} }   // focus into the sheet (tester r2 F8)
function shopClick(e){
  const q=e.target.closest('[data-help]'); if(q){ tfHelp(q.dataset.help); return; }
  const b=e.target.closest('[data-buy],[data-a]'); if(!b||b.disabled) return;
  if(b.dataset.a==='devclear'){ DEV.shop.clear(); toast('ล้างสิทธิ์ทดสอบแล้ว','info'); shopAfter(); return; }
  const p=RSHOP.products.find(x=>x.id===b.dataset.buy); if(!p) return;
  if(shopCanPay()){ shopBuy(p); return; }                                   // real payment first, always
  if(shopDevHost()){ DEV.shop.grant(p.id); toast('ทดสอบ: ได้ '+p.n,'good'); shopAfter(); return; }
  if(typeof CLOUD_OK==='undefined'||!CLOUD_OK){ toast(SHOP_ERR.site,'info'); return; }
  if(!entSigned()){ const r=SHW.reason; closeSheet();
    if(typeof uiaOpenAuth!=='function'||!uiaOpenAuth('in','เข้าสู่ระบบก่อนซื้อ · สิทธิ์จะติดบัญชีและใช้ได้ทุกเครื่อง',()=>shopOpen(r))) toast(SHOP_ERR.site,'info');
    return; }
  if(SHOP_PAY===null){ toast('กำลังตรวจระบบชำระเงิน…','info'); shopProbe().then(()=>{ if(shopCanPay()) shopBuy(p); else toast(SHOP_ERR.off,'info'); }); return; }
  toast(SHOP_ERR.off,'info'); }
// GET /api/checkout → {configured} · signed in only (a guest sends nothing) · a failure leaves it unknown (asked again next time)
function shopProbe(){ if(!entSigned()||SHOP_PAY!==null) return Promise.resolve(SHOP_PAY); if(SHW.probe) return SHW.probe;
  SHW.probe=authApi('/api/checkout',{auth:false}).then(r=>r.json()).then(o=>{ SHOP_PAY=!!(o&&o.configured===true); },()=>{})
    .then(()=>{ SHW.probe=null; shopRender(); return SHOP_PAY; });
  return SHW.probe; }
async function shopBuy(p){
  if(SHW.busy) return; if(!entSigned()){ toast(SHOP_ERR.auth,'bad'); return; }
  const mid=typeof G!=='undefined'&&G&&!G.over;
  if(!await confirmBox('ซื้อ '+p.n+' ราคา '+shopBaht(p.thb)+'? ระบบจะพาไปหน้าชำระเงินของ Stripe (บัตร / พร้อมเพย์) แล้วกลับมาที่เกม'
    +(mid?' · ⚠ รอบที่เล่นอยู่จะจบลงโดยไม่ได้รางวัล (แนะนำให้ซื้อหลังจบรอบ)':''),{okText:'ไปหน้าชำระเงิน'})) return;
  SHW.busy=true; shopRender(); let url='', err='fail';
  try{ const r=await authApi('/api/checkout',{method:'POST', json:{product:p.id}}), o=await r.json().catch(()=>null);
    if(r.ok&&o&&typeof o.url==='string'&&/^https:\/\/checkout\.stripe\.com\/[\w\-./#%?=&]+$/.test(o.url)) url=o.url;
    else err=r.status===503?'off':r.status===401?'auth':'fail'; }
  catch(e){ err=e&&e.code==='noauth'?'auth':'net'; }
  if(url){ try{ saveNow('pay'); }catch(e){} location.assign(url); return; }   // the page goes away: busy stays on
  SHW.busy=false; if(err==='off') SHOP_PAY=false; toast(SHOP_ERR[err],'bad'); shopRender(); }
// boot (99): a kept session loads its purchases · ?paid=1&sid=cs_… (Stripe success) / ?paid=0 (cancel) leave the address at once
function shopReturn(){
  if(entSigned()) entRefresh();                                            // (a sign-in coming back in the URL loads them on 'auth' 'in')
  let q; try{ q=new URLSearchParams(location.search); }catch(e){ return; } const paid=q.get('paid'); if(paid!=='1'&&paid!=='0') return;
  const sid=q.get('sid')||''; q.delete('paid'); q.delete('sid');
  try{ history.replaceState(history.state,'',location.pathname+(q.toString()?'?'+q:'')+location.hash); }catch(e){}
  if(paid==='0'){ toast('ยกเลิกการชำระเงินแล้ว · ไม่มีการตัดเงิน','info'); return; }
  shopWait(/^cs_(test|live)_[A-Za-z0-9]{1,200}$/.test(sid)?sid:'',0); }
// the webhook writes rg_purchases a moment after Stripe sends the player back: reload until this session's row is there
function shopWait(sid,i){
  if(!entSigned()){ if(i<SHOP_WAIT.length) setTimeout(()=>shopWait(sid,i+1),SHOP_WAIT[i]); else toast('เข้าสู่ระบบบัญชีที่ใช้ซื้อเพื่อรับสิทธิ์','info'); return; }
  if(!i) toast('ชำระเงินแล้ว · กำลังรับสิทธิ์…','info');
  entRefresh().then(()=>{ const got=sid?ENTS.sids.includes(sid):ENTS.n>0;
    if(got){ toast('ได้รับสิทธิ์แล้ว · ขอบคุณที่สนับสนุน 💎','good'); shopAfter(); return; }
    if(i<SHOP_WAIT.length) setTimeout(()=>shopWait(sid,i+1),SHOP_WAIT[i]);
    else toast('ยังไม่พบรายการซื้อ · ถ้าตัดเงินแล้ว สิทธิ์จะขึ้นภายในไม่กี่นาที เปิดร้านอีกครั้งเพื่อตรวจ','info'); }); }
// after a purchase: the sheet, the level-up cards (locks / reroll button) and the open tree all redraw
function shopAfter(){ shopRender(); try{ if(G&&G.ui==='level'){ if(G.char&&G.rerolls<=RSHOP.freeRerolls&&isSupporter()) G.rerolls=1e9; renderCards(); HD.info=null; } }catch(e){ console.error(e); }
  if(typeof tfRender==='function'&&TFW.box) tfRender(); if(typeof pksRender==='function'&&prgVis('scrSkills')) pksRender(); }
BUS.on('ent',()=>{ if(SHW.box) shopRender(); });

/* ---- starting Lv ---- */
let SLW={box:null};
function slOpen(){ const box=shMk('div','sl-win'); SLW.box=box; box.addEventListener('click',slClick);
  sheet(box,{title:'🚀 ระดับเริ่มต้นของสกิล', onClose:()=>{ if(SLW.box===box) SLW.box=null; }}); slRender(); }
function slRender(){ const box=SLW.box, ch=tfCh(); if(!box) return; if(!ch){ box.textContent='ไม่มีตัวละคร'; return; }
  const ids=pgSkillPool(ch).filter(id=>((ch.sk||{})[id]|0)>0);
  let h=`<div class="sp-stat"><div><b>🔷 ${tfFree(ch)}</b><small>แต้มรูนของตัวละคร</small></div><div><b>${shopWallet()}</b><small>กระเป๋าบัญชี</small></div>`
    +`<button type="button" class="tf-q" data-help="startlv" aria-label="อธิบายระดับเริ่มต้น">?</button></div><ul class="sp-list">`;
  for(const id of ids){ const d=SK[id], cur=slOf(ch,id), r=ch.sk[id]|0, why=slWhy(ch,id), c=RSHOP.slCost[cur+1]|0;
    h+=`<li class="sp-item"><span class="sp-ic" aria-hidden="true">${d.i}</span><div class="sp-m"><b>${tfE(d.n)} · เริ่มที่ Lv ${cur}</b><small>ฝึกไว้ ★${r}${(ch.load||[]).indexOf(id)>=0?' · ติดตัว':''}${why&&cur<r?' · '+tfE(why):''}</small></div>`
      +(cur>=r?'<span class="pks-max">เต็ม ★</span>':`<button type="button" class="btn${why?' ghost':''}" data-up="${id}"${why?' disabled':''}>Lv ${cur+1} · ${c} รูน</button>`)+'</li>'; }
  h+='</ul><p class="sp-note">ซื้อแล้วถาวร · รีเซ็ตพร้อมต้นไม้ของสกิลนั้น · ใช้ทุกโหมดยกเว้นคลาสสิก</p>';
  if(!isSupporter()||shopWallet()<40) h+='<button type="button" class="btn ghost" data-a="shop">💎 เติมรูน</button>';
  box.innerHTML=h; }
function slClick(e){ const q=e.target.closest('[data-help]'); if(q){ tfHelp(q.dataset.help); return; }
  const b=e.target.closest('[data-up],[data-a]'); if(!b||b.disabled) return;
  if(b.dataset.a==='shop'){ shopOpen('rune'); return; }
  const ch=tfCh(), id=b.dataset.up; if(slBuy(ch,id)) toast(SK[id].n+' เริ่มที่ Lv '+slOf(tfCh(),id),'good'); else toast(slWhy(ch,id)||'ซื้อไม่ได้','bad');
  slRender(); if(prgVis('scrSkills')) pksRender(); }

TF_HELP.shop=['ร้านรูน',()=>`<h4>💎 แพคสนับสนุน 30 วัน · 35 บาท</h4><p>ระหว่างที่เป็นผู้สนับสนุน: สุ่มการ์ดใหม่ได้ไม่จำกัดทุกรอบ · เลือกการ์ดเลเวลอัปได้ทั้ง 5 ใบ (คนทั่วไปเลือกได้ใบ 1–3 และสุ่มใหม่ 2 ครั้งต่อรอบ) · จ่ายครั้งเดียว ไม่ต่ออัตโนมัติ · ซื้อซ้ำ = ต่อเวลาอีก 30 วัน</p>
  <h4>🔷 รูน</h4><p>รูนที่ซื้อเข้ากระเป๋าบัญชี ใช้กับตัวละครไหนก็ได้ · ตอนฝึกโหนดหรือซื้อระดับเริ่มต้นแล้วรูนของตัวละครไม่พอ เกมหยิบจากกระเป๋าให้ แล้วรูนนั้นเป็นของตัวละครนั้น (รีเซ็ตต้นไม้ = คืนเข้าตัวละครเดิม)</p>
  <table>${tfRow('รูน 60','35 บาท')}${tfRow('รูน 200','99 บาท')}${tfRow('รูน 700','299 บาท')}${tfRow('รูน 2500','899 บาท')}</table>
  <h4>การจ่ายเงิน</h4><p>ผ่าน Stripe (บัตร / พร้อมเพย์) · ต้องล็อกอินก่อน สิทธิ์จึงติดบัญชีและใช้ได้ทุกเครื่อง · <button type="button" class="btn ghost" data-help="pay">ขั้นตอนการซื้อ</button></p>`];
TF_HELP.pay=['การชำระเงิน',()=>`<h4>ขั้นตอน</h4><table>${tfRow('1','เข้าสู่ระบบ (อีเมล หรือ Google) · สิทธิ์ผูกกับบัญชี ไม่ใช่เครื่อง')}${tfRow('2','แตะราคา → ยืนยัน → เกมพาไปหน้าชำระเงินของ Stripe')}${tfRow('3','จ่ายด้วยบัตร หรือสแกน QR พร้อมเพย์ด้วยแอปธนาคาร')}${tfRow('4','Stripe ส่งกลับมาที่เกม · สิทธิ์ขึ้นเองภายในไม่กี่วินาที')}</table>
  <h4>ปลอดภัยอย่างไร</h4><p>เกมไม่เห็นและไม่เก็บเลขบัตร · ราคาและสิทธิ์ที่ได้กำหนดที่เซิร์ฟเวอร์ เกมส่งแค่ว่าเลือกสินค้าไหน · สิทธิ์นับจากรายการที่ Stripe ยืนยันว่าจ่ายแล้วเท่านั้น (แก้เซฟเองก็ไม่ได้รูนเพิ่ม)</p>
  <h4>ถ้าจ่ายแล้วสิทธิ์ยังไม่ขึ้น</h4><p>รอสักครู่แล้วเปิดร้านอีกครั้ง (เกมโหลดรายการซื้อใหม่) · ตรวจว่าเข้าสู่ระบบบัญชีเดียวกับตอนซื้อ · พร้อมเพย์บางธนาคารยืนยันช้ากว่าบัตร</p>
  <h4>ยกเลิก</h4><p>กดย้อนกลับในหน้า Stripe = ยกเลิก ไม่มีการตัดเงิน · แพคสนับสนุนจ่ายครั้งเดียว ไม่ต่ออายุอัตโนมัติ</p>`];
TF_HELP.startlv=['ระดับเริ่มต้นของสกิล',()=>`<p>ตั้งว่าสกิลจะเริ่มที่ Lv เท่าไรตอนได้มาในรอบ (รวมสกิลที่ถือเริ่มรอบ) · ไม่เกิน ★ ที่ฝึกไว้ · ใช้ทุกโหมดยกเว้นคลาสสิก</p>
  <table>${[2,3,4,5,6,7,8].map(l=>tfRow('Lv '+l,RSHOP.slCost[l]+' รูน (รวม '+slSpentTo(l)+')')).join('')}</table>
  <p>ใช้แต้มรูนเดียวกับต้นไม้สกิล · ราคาสูงตั้งใจให้เป็นที่ใช้รูนก้อนใหญ่ ผู้ที่เติมรูนจะไปได้เร็วกว่า · รีเซ็ตต้นไม้ของสกิลไหน ระดับเริ่มต้นของสกิลนั้นรีเซ็ตด้วย (ได้รูนคืนครบ)</p>`];

SERVICES.push({id:'shop', npc:'แม่ค้ารูน', n:'แม่ค้ารูน · ร้านรูน', i:'💎', order:16, open(){ shopOpen(''); }});
// dev (§7.9): RG.shop.grant('sup30'|'rune200'…) adds a test entitlement on this browser · RG.shop.clear() · RG.shop.info()
DEV.shop={ grant(id){ if(!shopDevHost()) return 'local dev only'; const p=RSHOP.products.find(x=>x.id===id); if(!p) return 'no product'; const e=entGet(), now=Date.now();
    const o={sup:p.days?Math.max(e.sup,now)+p.days*864e5:e.sup, runes:(e.runes|0)+(p.runes|0)};
    try{ localStorage.setItem('runeguard.devEnt',JSON.stringify(o)); }catch(_){} entOk=false; return entGet(); },
  clear(){ try{ localStorage.removeItem('runeguard.devEnt'); }catch(_){} entOk=false; return entGet(); },
  info(){ return {ent:entGet(), sup:isSupporter(), wallet:shopWallet(), server:ENTS.uid?{n:ENTS.n, runes:ENTS.runes, sup:ENTS.sup}:null, pay:SHOP_PAY}; }, open(r){ shopOpen(r); return !!SHW.box; }, start(){ slOpen(); return !!SLW.box; } };
