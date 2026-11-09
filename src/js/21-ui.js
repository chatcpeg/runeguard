/* ================= UI ================= */
const el={hud:$('#hud'),xpFill:$('#xpFill'),lv:$('#lvTxt'),wave:$('#waveTxt'),time:$('#timeTxt'),kills:$('#killTxt'),boss:$('#bossBar'),bossName:$('#bossName'),bossFill:$('#bossFill'),skills:$('#skillBar'),stats:$('#statLine')};
const SCREENS=['scrTitle','scrLevel','scrAdv','scrPause','scrEnd'];
function show(id){ for(const s of SCREENS) $('#'+s).hidden=s!==id; $('#banner').classList.toggle('under',!!id); }
let bannerTimer=0;
function banner(main,sub){ if(G&&G.auto) return; const b=$('#banner'); b.querySelector('.b-main').textContent=main; b.querySelector('.b-sub').textContent=sub||''; b.hidden=false; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); clearTimeout(bannerTimer); bannerTimer=setTimeout(()=>{ b.hidden=true; },2400); }
const HC={};
function setText(node,key,v){ if(HC[key]!==v){ HC[key]=v; node.textContent=v; } }
function updateHUD(){
  const xr=clamp(P.xp/P.need,0,1); if(HC.xr===undefined||Math.abs(HC.xr-xr)>.002){ HC.xr=xr; el.xpFill.style.transform=`scaleX(${xr})`; }
  const h=G.mode.hud(); setText(el.lv,'lv',h.lv); setText(el.wave,'wave',h.wave); setText(el.time,'time',h.time);
  if(HC.bt!==G.boss){ HC.bt=G.boss; el.time.classList.toggle('boss-t',G.boss); }
  setText(el.kills,'kills',fmtNum(G.kills)+' ศพ');
  let alive=0,hp=0,mx=0; const names=[]; for(const b of G.bosses){ mx+=b.maxHp; if(!b.dead){ alive++; hp+=Math.max(0,b.hp); names.push(b.d.n); } }
  const sb=G.boss&&alive>0; if(el.boss.hidden===sb) el.boss.hidden=!sb;
  if(sb){ setText(el.bossName,'bn',names.join(' · ')); const r=(hp/mx).toFixed(3); if(HC.bf!==r){ HC.bf=r; el.bossFill.style.transform=`scaleX(${r})`; } }
  if(UIX.hud) UIX.hud();
}
function refreshSkillBar(){
  if(!P) return;
  el.skills.innerHTML=P.skills.map(s=>`<div class="sk${s.evolved?' evo':''}" title="${s.evolved?s.def.evo.n:s.def.n}"><span aria-hidden="true">${s.def.i}</span><b>${s.evolved?'★':s.lv}</b></div>`).join('');
  el.stats.textContent=Object.keys(STATS).filter(k=>P.stats[k]>0).map(k=>SNAME(k)+' '+P.stats[k]).join(' · ');
}
const PL={cd:'คูลดาวน์',dmg:'ดาเมจ',count:'จำนวน',range:'ระยะ',r:'รัศมี',pierce:'ทะลุ',spin:'ความเร็วหมุน',absorb:'โล่',nova:'ดาเมจระเบิด',explode:'รัศมีระเบิด',slow:'ชะลอ',freeze:'แช่แข็ง',stun:'สตัน',bounces:'กระโดด',hits:'ระลอก',heal:'ฟื้นฟู',targets:'เป้าหมาย',trap:'ดาเมจกับดัก',rage:'โบนัสคลั่งสูงสุด',steal:'ฟื้น HP ต่อศพ',dodge:'หลบหลีก'};
const PCT={slow:1,rage:1,dodge:1},SEC={cd:1,freeze:1,stun:1};
function fmtP(k,v){ if(PCT[k]) return Math.round(v*100)+'%'; if(SEC[k]) return (+v.toFixed(2))+' วิ'; return String(+(+v).toFixed(2)); }
// base numbers (no stat / tree mods) of skill s at Lv lv · Lv 6–8 come from tfTierUp
function pvAt(s,k,lv){ return pv({def:s.def,lv,evolved:s.evolved,cx:s.cx},k); }
function diffText(s){ const out=[]; for(const k in s.def.p){ const a=pvAt(s,k,s.lv),b=pvAt(s,k,s.lv+1); if(typeof a!=='number'||typeof b!=='number'||Math.abs(a-b)<1e-9) continue; out.push(`${PL[k]||k} ${fmtP(k,a)} → ${fmtP(k,b)}`); } return out.join(' · '); }
const SNAME=k=>STATS[k].ab||k;
function dexText(){ const nx=P.stats.DEX+1, names=P.skills.filter(s=>s.def.type==='proj'||s.def.type==='orbit').map(s=>s.def.n);
  const now=(nx===3||nx===5)?' (ได้ทันทีที่เลือก)':'';
  return 'คูลดาวน์ −6% · ถึง Lv3 และ Lv5: '+(names.length?names.map(n=>n+' +1 ชิ้น').join(' · ')+now:'สกิลแบบยิงหรือหมุนรอบตัวได้เพิ่ม 1 ชิ้น (ตอนนี้ยังไม่มีสกิลแบบนี้)'); }
function evoUses(stat){ const names=[]; for(const s of P.skills) if(s.def.evo&&s.def.evo.s===stat&&!s.evolved) names.push(s.def.n); return names.length?'ใช้วิวัฒนาการ: '+names.join(', '):''; }
function buildChoices(){
  const pool=[],owned=new Set(P.skills.map(s=>s.id));
  const cap=P.rank?(id=>P.rank[id]||0):(()=>5);   // P.rank / P.loadout come from a character (prepareRun); classic: cap 5, all class skills
  for(const s of P.skills){
    if(s.def.evo&&s.lv>=5&&!s.evolved&&P.stats[s.def.evo.s]>=1) pool.push({k:'evo',s,w:1000});
    else if(s.lv<cap(s.id)) pool.push({k:'up',s,w:s.id===P.cls.skills[0]?1.3:1.1});
  }
  const avail=P.loadout||P.cls.skills.concat(P.adv?P.adv.skills:[]);
  for(const id of avail) if(!owned.has(id)&&cap(id)>0) pool.push({k:'new',id,w:P.adv&&P.adv.skills.indexOf(id)>=0?3:1.4});
  for(const k in STATS) if(P.sx||P.stats[k]<5) pool.push({k:'stat',stat:k,w:.85});   // character runs: stat cards never run out (26)
  const out=[], N=typeof cardCount==='function'?cardCount():3;          // character runs: 5 cards (28 · free players pick from 3)
  while(out.length<N&&pool.length){ let tot=0; for(const o of pool) tot+=o.w; let r=Math.random()*tot,idx=0; for(;idx<pool.length-1;idx++){ r-=pool[idx].w; if(r<=0) break; } out.push(pool[idx]); pool.splice(idx,1); }
  const fill=[{k:'potion'},{k:'gold'},{k:'gold'},{k:'potion'},{k:'gold'}]; let fi=0; while(out.length<N) out.push(fill[fi++]);
  return out;
}
function cardHTML(o,i){
  let ic,tag,nm,ds,df='';
  switch(o.k){
    case 'new':{ const d=SK[o.id]; ic=d.i; tag='สกิลใหม่'; nm=d.n; ds=d.d; if(d.evo) df=`วิวัฒนาการเมื่อ Lv5 + ${SNAME(d.evo.s)}`; break; }
    case 'up':{ const d=o.s.def; ic=d.i; tag=`Lv ${o.s.lv} → ${o.s.lv+1}`; nm=d.n; ds=d.d; df=diffText(o.s); break; }
    case 'evo':{ const d=o.s.def; ic=d.i; tag='วิวัฒนาการ'; nm=d.evo.n; ds=d.evo.d; df=`${d.n} Lv5 + ${SNAME(d.evo.s)}`; break; }
    case 'stat':{ const st=STATS[o.stat]; ic=st.i; tag=`ค่าสถานะ Lv ${P.stats[o.stat]} → ${P.stats[o.stat]+1}`; nm=`${SNAME(o.stat)} · ${st.n}`; ds=typeof st.d==='function'?st.d():st.d; df=evoUses(o.stat); break; }
    case 'potion': ic='🧪'; tag='ไอเทม'; nm='ยาฟื้นฟู'; ds='ฟื้นฟู HP 40% ทันที'; break;
    default: ic='💰'; tag='ไอเทม'; nm='ถุงทอง'; ds='คะแนน +250'; break;
  }
  return `<span class="ic" aria-hidden="true">${ic}</span><span class="tag">${tag}</span><span class="nm">${nm}</span><span class="ds">${ds}</span>${df?`<span class="df">${df}</span>`:''}<kbd>${i+1}</kbd>`;
}
function renderCards(){ const box=$('#lvCards'); box.innerHTML=''; G.choices.forEach((o,i)=>{ const b=document.createElement('button'); b.type='button'; b.className='card '+o.k; b.innerHTML=cardHTML(o,i);
    if(typeof cardLocked==='function'&&cardLocked(i)){ b.classList.add('locked'); b.setAttribute('aria-label','ล็อก · เฉพาะผู้สนับสนุน'); }
    b.addEventListener('click',()=>choose(i)); box.appendChild(b); });
  box.classList.toggle('five',G.choices.length>3);
  const rr=$('#btnReroll'), sh=!!G.char&&typeof shopOpen==='function';   // character runs: out of rerolls → 🔒 opens the shop
  rr.textContent=G.rerolls>99?'สุ่มใหม่ (ไม่จำกัด)':G.rerolls<=0&&sh?'🔒 สุ่มใหม่ · ผู้สนับสนุน':`สุ่มใหม่ (${G.rerolls})`; rr.disabled=G.rerolls<=0&&!sh; }
function openLevel(kind){
  G.ui='level'; G.choiceKind=kind; G.choices=buildChoices();
  $('#lvEyebrow').textContent=kind==='chest'?'หีบสมบัติจากศัตรูชั้นยอด':'เลเวลอัพ';
  $('#lvTitle').textContent=kind==='chest'?'เลือกของรางวัล':'Lv '+(P.lv-G.pendingLv+1);
  renderCards(); show('scrLevel'); G.uiReadyAt=performance.now()+260; sfx('level');
}
function choose(i){ if(!G||G.ui!=='level'||performance.now()<G.uiReadyAt) return; const o=G.choices[i]; if(!o) return;
  if(typeof SH!=='undefined'&&(SH.sheet||SH.conf)) return;              // never pick a card from under the shop sheet
  if(typeof cardLocked==='function'&&cardLocked(i)){ if(typeof shopOpen==='function') shopOpen('cards'); return; } applyChoice(o); if(G.choiceKind==='chest') G.pendingChest--; else G.pendingLv--; if(G.pendingLv<=0&&G.pendingChest<=0) G.cardReq=false; show(null); G.ui=null; refreshSkillBar(); keepAwake(); }
function reroll(){ if(!G||G.ui!=='level'||typeof SH!=='undefined'&&(SH.sheet||SH.conf)) return; if(G.rerolls<=0){ if(G.char&&typeof shopOpen==='function') shopOpen('reroll'); return; } G.rerolls--; G.choices=buildChoices(); renderCards(); }
function applyChoice(o){
  switch(o.k){
    case 'new':{ const s=makeSkill(o.id); if(P.sl&&P.sl[o.id]>1) s.lv=P.sl[o.id]; P.skills.push(s); break; }   // starting Lv (28) · character runs
    case 'up': o.s.lv++; break;
    case 'evo': o.s.evolved=true; banner('วิวัฒนาการ!',o.s.def.evo.n); G.fx.push({k:'ring',x:P.x,y:P.y,r0:10,r1:160,t:0,dur:.6,c:'#f0b545',w:12,follow:true,dead:false}); G.fx.push({k:'lvup',x:P.x,y:P.y,t:0,dur:1,follow:true,dead:false}); break;
    case 'stat': P.stats[o.stat]++; break;
    case 'potion': healP(P.maxHp*.4); break;
    default: G.score+=250; if(G.char) G.goldRun=(G.goldRun||0)+5*P.lv;
  }
  recalc(P);
}
function openAdv(){
  P.advOffered=true; G.ui='adv'; const box=$('#advCards'); box.innerHTML='';
  P.cls.adv.forEach((a,i)=>{ const b=document.createElement('button'); b.type='button'; b.className='adv'; const cvs=document.createElement('canvas'); portrait(cvs,Object.assign({},P.cls.look,a.look),96);
    const info=document.createElement('div'); info.className='adv-info';
    info.innerHTML=`<div class="adv-n">${a.n}<span>${a.e}</span></div><p>${a.d}</p><span class="adv-b">${a.bt}</span><ul class="adv-sk">${a.skills.map(id=>`<li><i>${SK[id].i}</i><b>${SK[id].n}</b> · ${SK[id].d}</li>`).join('')}</ul><span class="adv-key">กด ${i+1}</span>`;
    b.append(cvs,info); b.addEventListener('click',()=>pickAdv(i)); box.appendChild(b); });
  show('scrAdv'); G.uiReadyAt=performance.now()+300; sfx('level');
}
function pickAdv(i){ if(!G||G.ui!=='adv'||performance.now()<G.uiReadyAt) return; applyAdv(P.cls.adv[i]); show(null); G.ui=null; keepAwake(); }
function applyAdv(a){
  P.adv=a; P.look=Object.assign({},P.cls.look,a.look); recalc(P); P.skills.push(makeSkill(a.skills[0])); refreshSkillBar();
  banner('เปลี่ยนอาชีพ!',P.cls.n+' → '+a.n);
  G.fx.push({k:'ring',x:P.x,y:P.y,r0:10,r1:220,t:0,dur:.7,c:'#f0b545',w:14,follow:true,dead:false}); G.fx.push({k:'pillar',x:P.x,y:P.y,r:40,t:0,dur:.8,c:'#fff3c4',follow:true,dead:false}); G.fx.push({k:'lvup',x:P.x,y:P.y,t:0,dur:1.1,follow:true,dead:false});
  burst(P.x,P.y-10,24,'#f0b545',320,.7,3); sfx('win');
}
function checkUI(){ if(G.ui||G.over) return; if(G.mode.cards===false) return; if(G.mode.cards==='manual'&&!G.cardReq) return;
  if(!G.char&&P.lv-G.pendingLv+1>=ADV_LV&&!P.adv&&!P.advOffered){ openAdv(); return; } if(G.pendingChest>0){ openLevel('chest'); return; } if(G.pendingLv>0) openLevel('lv'); }
function autoUI(){ if(G.over) return; if(!G.char&&P.lv>=ADV_LV&&!P.adv&&!P.advOffered){ P.advOffered=true; applyAdv(pick(P.cls.adv)); }
  if(G.mode.cards===false) return;   // 'manual' modes still let the bot pick
  let guard=0; while((G.pendingChest>0||G.pendingLv>0)&&guard++<60){ const ch=buildChoices().filter((c,i)=>!(typeof cardLocked==='function'&&cardLocked(i))); const o=ch.find(c=>c.k==='evo')||ch.find(c=>c.k==='new')||ch.find(c=>c.k==='up')||ch[(Math.random()*ch.length)|0]; applyChoice(o); if(G.pendingChest>0) G.pendingChest--; else G.pendingLv--; } }
function pauseGame(){ if(!G||G.ui) return; G.ui='pause'; for(const k in keys) keys[k]=false; joy.on=false; releaseWake();
  const rows=P.skills.map(s=>`<div class="dmg-row"><span class="dmg-n">${s.def.i} ${s.evolved?s.def.evo.n:s.def.n} <em>${s.evolved?'★':'Lv'+s.lv}</em></span><span class="dmg-bar"><span style="width:${Math.min(100,s.dealt/Math.max(1,G.totalDmg)*100)}%"></span></span><span class="dmg-v">${fmtNum(s.dealt)}</span></div>`).join('');
  $('#pauseBox').innerHTML=`<div class="dmg-title">${G.mode.pauseTitle()}</div>${rows}`;
  if(UIX.pauseExtra) UIX.pauseExtra($('#pauseBox'));
  renderQualityButtons(); show('scrPause'); }
function resumeGame(){ if(!G||G.ui!=='pause') return; G.ui=null; show(null); last=performance.now(); keepAwake(); }
function loadBest(){ try{ return JSON.parse(localStorage.getItem('runeguard.best')||'{}')||{}; }catch(e){ return {}; } }
function saveBest(id,rec){ try{ const b=loadBest(); const o=b[id]; if(!o||rec.score>o.score){ b[id]=rec; localStorage.setItem('runeguard.best',JSON.stringify(b)); return true; } }catch(e){} return false; }
function endRun(won){
  if(G.over) return; G.over=true; G.won=won; G.ui='end'; joy.on=false;
  G.endInfo=G.mode.end(won);   // the mode adds its own score here
  G.rewards=G.char?onRunEnd(G,won,{commit:!G.auto||!!DEV.commit}):null;
  if(G.auto) return;
  sfx(won?'win':'lose'); releaseWake();
  const isBest=G.modeId==='classic'&&saveBest(G.cls.id,{score:G.score,wave:G.wave,kills:G.kills,won});
  BUS.emit('runEnd',G,won);
  setTimeout(()=>showEnd(isBest),won?700:1000);
}
function showEnd(isBest){
  if(!G) return; const E=G.endInfo;
  $('#endEyebrow').textContent=E.eyebrow;
  const t=$('#endTitle'); t.textContent=E.title; t.classList.toggle('lose',!G.won);
  const st=E.rows(isBest);
  $('#endStats').innerHTML=st.map(q=>`<div><dt>${q[0]}</dt><dd>${q[1]}</dd></div>`).join('');
  if(UIX.endExtra) UIX.endExtra($('#endStats'),G);
  const rows=P.skills.slice().sort((a,b)=>b.dealt-a.dealt),max=Math.max(1,rows[0]?rows[0].dealt:1);
  $('#endDmg').innerHTML=`<div class="dmg-title">ดาเมจแยกตามสกิล</div>`+rows.map(s=>`<div class="dmg-row"><span class="dmg-n">${s.def.i} ${s.evolved?s.def.evo.n:s.def.n} <em>${s.evolved?'★':'Lv'+s.lv}</em></span><span class="dmg-bar"><span style="width:${s.dealt/max*100}%"></span></span><span class="dmg-v">${fmtNum(s.dealt)}</span></div>`).join('');
  show('scrEnd');
}
function renderTitle(){
  const grid2=$('#classGrid');
  if(!grid2.childElementCount){ CLASSES.forEach(c=>{ const b=document.createElement('button'); b.type='button'; b.className='cls'; b.dataset.id=c.id; const cvs=document.createElement('canvas'); cvs.dataset.cls=c.id;
      const nm=document.createElement('span'); nm.className='nm'; nm.textContent=c.n; const en=document.createElement('span'); en.className='en'; en.textContent=c.e; b.append(cvs,nm,en); b.addEventListener('click',()=>selectClass(c.id)); b.addEventListener('dblclick',()=>startRun(c.id)); grid2.appendChild(b); }); }
  for(const cvs of grid2.querySelectorAll('canvas')) portrait(cvs,CLS[cvs.dataset.cls].look,72);
  selectClass(selected);
}
function selectClass(id){
  selected=id; const c=CLS[id];
  for(const b of document.querySelectorAll('.cls')) b.setAttribute('aria-pressed',b.dataset.id===id?'true':'false');
  const pips=n=>Array.from({length:5},(_,i)=>`<span class="pip${i<n?' on':''}"></span>`).join('');
  const all=loadBest(), best=all&&typeof all==='object'&&Object.prototype.hasOwnProperty.call(all,id)&&all[id]&&typeof all[id]==='object'?all[id]:null;
  $('#clsDetail').innerHTML=`<div class="cd-main"><h2 class="cd-name">${c.n}<span>${c.e}</span></h2><p>${c.d}</p>
    <dl class="cd-stats"><dt>พลังชีวิต</dt><dd>${pips(c.rating.hp)}</dd><dt>พลังโจมตี</dt><dd>${pips(c.rating.atk)}</dd><dt>ความเร็ว</dt><dd>${pips(c.rating.spd)}</dd><dt>ระยะโจมตี</dt><dd>${pips(c.rating.rng)}</dd></dl></div>
    <div class="cd-side"><h3>สกิลประจำอาชีพ</h3><ul class="cd-skills">${c.skills.map(k=>`<li><i>${SK[k].i}</i><span><b>${SK[k].n}</b> · ${SK[k].d}</span></li>`).join('')}</ul>
    <h3>อาชีพขั้นสอง (Lv 15)</h3><p class="cd-adv"><b>${c.adv[0].n}</b> ${c.adv[0].d}<br><b>${c.adv[1].n}</b> ${c.adv[1].d}</p>
    <p class="cd-best">${best?`สถิติดีที่สุด: ${fmtNum(Math.max(0,+best.score||0))} คะแนน · คลื่น ${Math.max(0,best.wave|0)} · สังหาร ${fmtNum(Math.max(0,+best.kills||0))}${best.won===true?' · ชนะ':''}`:'ยังไม่มีสถิติของอาชีพนี้'}</p></div>`;
}
let wakeLock=null;
function keepAwake(){ try{ if(!('wakeLock' in navigator)||wakeLock||document.visibilityState!=='visible') return; navigator.wakeLock.request('screen').then(l=>{ wakeLock=l; l.addEventListener('release',()=>{ wakeLock=null; }); }).catch(()=>{ wakeLock=null; }); }catch(e){ wakeLock=null; } }
function releaseWake(){ try{ if(wakeLock) wakeLock.release().catch(()=>{}); }catch(e){} wakeLock=null; }

