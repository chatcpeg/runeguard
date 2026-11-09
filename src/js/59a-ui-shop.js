/* ================= 59a-ui-shop.js · lane P · shop sheet + starting-Lv sheet (docs/PROPOSAL-shop.md) ================= */
// shopOpen(reason): the shop (supporter pack + rune packs) · from a locked level-up card, the 🔒 reroll, the skills page and the fort.
// Real payment = step ค. (Stripe through a Vercel function) · until then "ซื้อ" says so; #dev has a test grant (RG.shop).
// slOpen(): starting Lv of every loadout skill, bought with rune points (28 slBuy).
const SHOP_WHY={cards:'การ์ดใบที่ 4–5 เลือกได้เฉพาะผู้สนับสนุน', reroll:'สุ่มใหม่ครบ 2 ครั้งแล้วในรอบนี้ · ผู้สนับสนุนสุ่มได้ไม่จำกัด', rune:'รูนไม่พอ · เติมรูนเพื่ออัปได้เร็วขึ้น'};
const SHOP_PAY_ON=false;                                                   // step ค. turns this on (checkout through /api/checkout)
let SHW={box:null, reason:''};
function shopBaht(n){ return n.toLocaleString('en-US')+' บาท'; }
function shopOpen(reason){ SHW.reason=reason||''; const box=shMk('div','sp-win'); SHW.box=box;
  box.addEventListener('click',shopClick); sheet(box,{title:'💎 ร้านรูน', onClose:()=>{ if(SHW.box===box) SHW.box=null; }}); shopRender(); }
function shopRender(){
  const box=SHW.box; if(!box) return; const sup=isSupporter(), w=shopWallet(), dev=entGet().src==='dev'||location.hash==='#dev';
  let h=SHW.reason&&SHOP_WHY[SHW.reason]?`<p class="sp-why">${tfE(SHOP_WHY[SHW.reason])}</p>`:'';
  h+=`<div class="sp-stat"><div><b>${sup?'💎 ผู้สนับสนุน':'ยังไม่เป็นผู้สนับสนุน'}</b><small>${sup?'เหลือ '+supDaysLeft()+' วัน':'การ์ด 3 จาก 5 ใบ · สุ่มใหม่ 2 ครั้งต่อรอบ'}</small></div>`
    +`<div><b>🔷 ${w.toLocaleString('en-US')}</b><small>รูนในกระเป๋าบัญชี</small></div><button type="button" class="tf-q" data-help="shop" aria-label="อธิบายร้านรูน">?</button></div>`;
  h+='<ul class="sp-list">'+RSHOP.products.map(p=>`<li class="sp-item${p.days?' sup':''}"><span class="sp-ic" aria-hidden="true">${p.i}</span><div class="sp-m"><b>${tfE(p.n)}</b><small>${tfE(p.d)}</small></div>`
    +`<button type="button" class="btn${p.days?'':' ghost'}" data-buy="${p.id}">${shopBaht(p.thb)}</button></li>`).join('')+'</ul>';
  h+=`<p class="sp-note">${SHOP_PAY_ON?'จ่ายผ่าน Stripe (บัตร / พร้อมเพย์) · ต้องล็อกอินก่อนเพื่อให้สิทธิ์ติดบัญชี':'ระบบชำระเงินกำลังเปิดเร็ว ๆ นี้ (ต้องล็อกอินเพื่อให้สิทธิ์ติดบัญชี)'}</p>`;
  if(dev) h+='<p class="sp-dev">#dev: ปุ่มซื้อ = มอบสิทธิ์ทดสอบในเครื่องนี้ · <button type="button" class="btn ghost" data-a="devclear">ล้างสิทธิ์ทดสอบ</button></p>';
  box.innerHTML=h; }
function shopClick(e){
  const q=e.target.closest('[data-help]'); if(q){ tfHelp(q.dataset.help); return; }
  const b=e.target.closest('[data-buy],[data-a]'); if(!b) return;
  if(b.dataset.a==='devclear'){ DEV.shop.clear(); toast('ล้างสิทธิ์ทดสอบแล้ว','info'); shopAfter(); return; }
  const p=RSHOP.products.find(x=>x.id===b.dataset.buy); if(!p) return;
  if(location.hash==='#dev'){ DEV.shop.grant(p.id); toast('ทดสอบ: ได้ '+p.n,'good'); shopAfter(); return; }
  if(!SHOP_PAY_ON){ toast('ระบบชำระเงินยังไม่เปิด · เร็ว ๆ นี้','info'); return; }
  if(typeof shopCheckout==='function') shopCheckout(p.id); }
// after a purchase: the sheet, the level-up cards (locks / reroll button) and the open tree all redraw
function shopAfter(){ shopRender(); try{ if(G&&G.ui==='level'){ if(G.char&&G.rerolls<=RSHOP.freeRerolls&&isSupporter()) G.rerolls=1e9; renderCards(); HD.info=null; } }catch(e){ console.error(e); }
  if(typeof tfRender==='function'&&TFW.box) tfRender(); if(typeof pksRender==='function'&&prgVis('scrSkills')) pksRender(); }

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
  <h4>การจ่ายเงิน</h4><p>ผ่าน Stripe (บัตร / พร้อมเพย์) · ต้องล็อกอินก่อน สิทธิ์จึงติดบัญชีและใช้ได้ทุกเครื่อง</p>`];
TF_HELP.startlv=['ระดับเริ่มต้นของสกิล',()=>`<p>ตั้งว่าสกิลจะเริ่มที่ Lv เท่าไรตอนได้มาในรอบ (รวมสกิลที่ถือเริ่มรอบ) · ไม่เกิน ★ ที่ฝึกไว้ · ใช้ทุกโหมดยกเว้นคลาสสิก</p>
  <table>${[2,3,4,5,6,7,8].map(l=>tfRow('Lv '+l,RSHOP.slCost[l]+' รูน (รวม '+slSpentTo(l)+')')).join('')}</table>
  <p>ใช้แต้มรูนเดียวกับต้นไม้สกิล · ราคาสูงตั้งใจให้เป็นที่ใช้รูนก้อนใหญ่ ผู้ที่เติมรูนจะไปได้เร็วกว่า · รีเซ็ตต้นไม้ของสกิลไหน ระดับเริ่มต้นของสกิลนั้นรีเซ็ตด้วย (ได้รูนคืนครบ)</p>`];

SERVICES.push({id:'shop', npc:'แม่ค้ารูน', n:'แม่ค้ารูน · ร้านรูน', i:'💎', order:16, open(){ shopOpen(''); }});
// dev (§7.9): RG.shop.grant('sup30'|'rune200'…) adds a test entitlement on this browser · RG.shop.clear() · RG.shop.info()
DEV.shop={ grant(id){ const p=RSHOP.products.find(x=>x.id===id); if(!p) return 'no product'; const e=entGet(), now=Date.now();
    const o={sup:p.days?Math.max(e.sup,now)+p.days*864e5:e.sup, runes:(e.runes|0)+(p.runes|0)};
    try{ localStorage.setItem('runeguard.devEnt',JSON.stringify(o)); }catch(_){} entOk=false; return entGet(); },
  clear(){ try{ localStorage.removeItem('runeguard.devEnt'); }catch(_){} entOk=false; return entGet(); },
  info(){ return {ent:entGet(), sup:isSupporter(), wallet:shopWallet()}; }, open(r){ shopOpen(r); return !!SHW.box; }, start(){ slOpen(); return !!SLW.box; } };
