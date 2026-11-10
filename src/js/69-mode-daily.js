/* ================= 69-mode-daily.js · lane D · daily dungeons (docs/PROPOSAL-maps-daily.md §6 · phase A) ================= */
// Three short runs from the fort, counted per local day in acct.daily.dg (taken when the run STARTS, saved at once):
//   dexp  ลานวิญญาณประสบการณ์ · 2/day · chase fleeing wisps 3 min → Base/Job EXP ×10 of the dungeon's own EXP
//   dgold คลังทองก็อบลิน · 2/day · break the goblins' gold bags + open gold chests 3 min → gold ×10
//   drare ห้องสมบัติหายาก · 1/day (2 on weekends) · 3 waves of elemental rune constructs + the vault guardian → the day's chest
// Monsters here have elements (29) and colour ranks · the fields have terrain (29a) · rewards via onRunEnd → mode.rewards.
const DG={
  kinds:{
    exp:{id:'exp', n:'ลานวิญญาณประสบการณ์', i:'✨', per:2, sec:180, biome:'meadow', d:'ภูตแสงเรืองวิ่งหนีเป็นฝูง ไล่ฆ่าให้ได้มากที่สุดใน 3 นาที · ภูตทองคำได้แต้ม ×5 · ระวังเงาไล่ภูต', rw:'Base/Job EXP ×10 ของ EXP ที่ได้ในด่าน'},
    gold:{id:'gold', n:'คลังทองก็อบลิน', i:'💰', per:2, sec:180, biome:'forest', d:'ก็อบลินแบกถุงทองวิ่งหนี ตีให้ถุงแตกแล้วเก็บทอง · ยืนเปิดหีบทอง 2 วิ · ระวังก็อบลินถือกระบองกับนักปาหิน', rw:'ทอง ×10 ของทองที่เก็บได้'},
    rare:{id:'rare', n:'ห้องสมบัติหายาก', i:'🎁', per:1, sec:300, biome:'ruins', d:'ล้มร่างรูนธาตุครบ 3 คลื่น แล้วล้มผู้เฝ้าคลัง (5 นาที) · ธาตุของมอนเปลี่ยนตามวัน', rw:'หีบของหายากประจำวัน'}},
  diff:[{n:'ง่าย', lv:1, hp:1, dmg:1, rw:1}, {n:'กลาง', lv:10, hp:1.8, dmg:1.4, rw:1.5}, {n:'ยาก', lv:25, hp:3, dmg:2, rw:2.2}],
  expUnit:.00025, mul:10,
  // ห้องสมบัติ by weekday (Date.getDay: 0 = Sunday) · el = the construct elements of that day (guardian takes the first)
  rare:[
    {n:'สุ่มทุกแบบ', el:['light','dark','fire','water','wind','earth'], t:[{id:'m_dust', n:[3,6]}, {id:'m_crystal', p:.6}, {shard:'surv', n:[1,3]}, {gear:'T'}, {id:'m_seal', p:.4}, {id:'u_potion_l'}]},
    {n:'วัสดุตีบวก', el:['fire','earth'], t:[{id:'m_dust', n:[6,10]}, {id:'m_crystal', n:[1,2]}]},
    {n:'เศษรูน', el:['water','wind'], t:[{shard:'surv', n:[3,5]}, {shard:'survBoss', p:.6}]},
    {n:'ยาและผงรูน', el:['light','dark'], t:[{id:'u_potion_s', n:[3,5]}, {id:'u_potion_l', n:[1,2]}, {id:'m_dust', n:[3,5]}]},
    {n:'อุปกรณ์หายาก', el:['fire','water'], t:[{gear:'T+1', n:2}, {gear:'T', p:.6}]},
    {n:'ยันต์ผนึก', el:['wind','earth'], t:[{id:'m_seal', n:[1,2]}, {id:'m_crystal'}]},
    {n:'สุ่มทุกแบบ', el:['light','dark','fire','water','wind','earth'], t:[{id:'m_dust', n:[3,6]}, {id:'m_crystal', p:.6}, {shard:'surv', n:[1,3]}, {gear:'T'}, {id:'m_seal', p:.4}, {id:'u_potion_l'}]}],
  elMob:{fire:'dg_ember', water:'dg_tide', wind:'dg_gale', earth:'dg_stone', light:'dg_halo', dark:'dg_gloom'}};
function dgWeekend(t){ const d=new Date(t==null?Date.now():t).getDay(); return d===0||d===6; }
function dgPer(kind){ const K=DG.kinds[kind]; return kind==='rare'&&dgWeekend()?2:K.per; }
function dgUsed(kind,A){ A=A||pgAcct(); if(!A||!A.daily||A.daily.day!==svDay()) return 0; return (A.daily.dg&&A.daily.dg[kind])|0; }
function dgLeft(kind){ return Math.max(0,dgPer(kind)-dgUsed(kind)); }
function dgLeftAll(){ return dgLeft('exp')+dgLeft('gold')+dgLeft('rare'); }
function dgWhy(kind,di,ch){ if(!ch) return 'ต้องมีตัวละครก่อน'; if(pgRO()) return 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้';
  const D=DG.diff[di]; if(!D||!DG.kinds[kind]) return 'ไม่พบด่าน'; if((ch.lv|0)<D.lv) return 'ต้องเลเวล '+D.lv+' ขึ้นไป';
  if(dgLeft(kind)<=0) return 'วันนี้ใช้สิทธิ์ครบแล้ว · รีเซ็ตเที่ยงคืน'; return ''; }
// take one entry (saved before the run starts, so closing the app never gives it back) → start the run
function dgEnter(kind,di){
  if(typeof svlFresh==='function') try{ svlFresh(); }catch(e){}
  const ch=pgFresh(curChar()); if(dgWhy(kind,di,ch)) return false; const A=pgAcct(); if(!A) return false;
  const today=svDay(); if(A.daily.day!==today){ A.daily.day=today; A.daily.surv={}; A.daily.boss={}; A.daily.dg={}; }
  if(!A.daily.dg) A.daily.dg={}; A.daily.dg[kind]=(A.daily.dg[kind]|0)+1; pgSave(ch,'daily',true);
  if(typeof closeSheet==='function') closeSheet(); if(typeof shChrome==='function') shChrome(null);
  startRun(ch.cls,'d'+kind,{char:ch, diff:di}); return true; }

/* ---- shared run logic ---- */
function dgCfg(){ const c=waveCfg(G.dgW), T=G.tier||0, D=G.diff; c.hpMul*=BAL.SURV.hpMul(T)*D.hp; c.dmgMul*=BAL.SURV.dmgMul(T)*D.dmg; c.W={}; return c; }
function dgSpawn(type,boost,x,y){ if(G.enemies.length>=CAP) return null; let q=[x,y]; if(x==null) q=ringPos();
  const e=spawnEnemy(type,q[0],q[1]); rankApply(e,e.d.boss?0:rankRoll(boost||1)); if(e.d.el) e.el=e.d.el;
  if(e.d.flee) e.ai.home=1; if(!e.d.dmg) e.atkCd=1e9; return e; }
function dgCount(f){ let n=0; for(const e of G.enemies) if(!e.dead&&f(e)) n++; return n; }
// fleeing monsters (wisps, gold couriers): run from the player inside 340, wander outside · core 20 hands them over (e.ai.home + steer)
function dgSteer(e,dt,d,dx,dy){ if(!e.d.flee) return false;
  let sp=e.speed*e.slowF*(e.tSlow||1); if(e.freezeT>0||e.stunT>0) sp=0;
  let tx,ty; if(d<340){ const w=Math.sin(G.t*1.7+e.id)*.7, c=Math.cos(w), s=Math.sin(w); tx=-dx*c+dy*s; ty=-dx*s-dy*c; }
  else { const a=G.t*.5+e.id*1.3; tx=Math.cos(a); ty=Math.sin(a); sp*=.55; }
  const acc=1-Math.exp(-dt*5), kd=Math.exp(-dt*6.5); e.vx+=(tx*sp-e.vx)*acc; e.vy+=(ty*sp-e.vy)*acc; e.kx*=kd; e.ky*=kd;
  e.x+=(e.vx+e.kx)*dt; e.y+=(e.vy+e.ky)*dt; if(Math.abs(e.vx)>3) e.face=e.vx<0?-1:1;
  e.walk+=e.d.fly?dt*14:Math.hypot(e.vx,e.vy)*dt/(e.d.r*.9);
  if(G.obstacles&&!e.d.fly){ e.tSlow=1; pushOutObstacles(e); } return true; }
function dgCoin(x,y){ const v=Math.max(1,Math.round(1+.15*((G.char&&G.char.lv)|0))); ltGem(x,y,'gold',{gold:v}); }
// rank + element tags over heads, the strong/resist flash, rank rings · only visible monsters, at most 50
function dgLabels(L,T,R,B){ let n=0; ctx.textAlign='center'; ctx.textBaseline='middle';
  for(const e of G.enemies){ if(e.dead||e.x<L-40||e.x>R+40||e.y<T-40||e.y>B+40) continue; if(++n>50) break;
    const Rk=e.rank?RANK[e.rank]:null, E=e.el&&EL[e.el], y=e.y-e.r*(e.boss?2.3:1.95)-(e.d.fly?12:0);
    if(Rk){ ctx.strokeStyle=Rk.c; ctx.lineWidth=2.5; ctx.globalAlpha=.85; ctx.beginPath(); ctx.ellipse(e.x,e.y+e.r*.85,e.r*1.05,e.r*.38,0,0,TAU); ctx.stroke(); ctx.globalAlpha=1; }
    if(Rk||E&&(e.boss||e.maxHp>=60)){ const t=(E?E.i:'')+(Rk?' '+Rk.n:''); ctx.font='bold 11px Mali, Tahoma, sans-serif'; ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.75)'; ctx.strokeText(t,e.x,y); ctx.fillStyle=Rk?Rk.c:'#ffffff'; ctx.fillText(t,e.x,y); }
    else if(E){ ctx.font='10px sans-serif'; ctx.fillText(E.i,e.x,y); }
    if(e.elT!=null&&G.t-e.elT<.6){ const s=e.elM>1, t=s?'แรง!':'ต้าน'; ctx.font='bold '+(s?14:11)+'px Mali, Tahoma, sans-serif'; ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.8)';
      ctx.strokeText(t,e.x,y-14); ctx.fillStyle=s?'#ffe14a':'#a0a6b0'; ctx.fillText(t,e.x,y-14); } } }
function dgMode(kind,o){ const K=DG.kinds[kind];
  return Object.assign({id:'d'+kind, n:K.n, cards:'auto', relocate:true,
    init(opts){ const ch=G.char; G.dk=kind; G.diff=DG.diff[(opts&&opts.diff)|0]||DG.diff[0]; G.tier=Math.max(0,Math.min(10,Math.floor(((ch&&ch.lv)|0)/6)));
      G.defK=BAL.SURV.defK(G.tier); G.dgT=K.sec; G.dgW=3; G.dgRamp=30; G.dgPts=0; G.wave=1; G.cfg=dgCfg(); terInit(K.biome); if(o.init) o.init(); },
    update(dt){ terTick(dt); G.dgT-=dt; G.dgRamp-=dt; if(G.dgRamp<=0){ G.dgRamp=30; G.dgW=Math.min(14,G.dgW+1); G.wave++; G.cfg=dgCfg(); }
      o.update(dt); if(!G.over&&G.dgT<=0) endRun(o.timeWin!==false); },
    steer:dgSteer, onKill(e){ if(o.onKill) o.onKill(e); },
    hud(){ return {lv:'ชำนาญ Lv '+P.lv+' · '+(P.adv?P.adv.n:P.cls.n), wave:K.i+' '+o.score()+' · '+G.diff.n, time:'เหลือ '+fmtTime(Math.max(0,G.dgT))}; },
    pauseTitle(){ return K.n+' · '+G.diff.n+' · '+o.score()+' · เหลือ '+fmtClock(Math.max(0,G.dgT)); },
    end(won){ return {eyebrow:K.n+' · '+G.diff.n, title:o.title(won), rows:()=>[['ผลงาน',o.score()],['เวลา',fmtClock(G.t)],['สังหาร',fmtNum(G.kills)],['ชำนาญ',P.lv],['ความยาก',G.diff.n+' (รางวัล ×'+G.diff.rw+')']]}; },
    rewards(r,won){ r.daily=true; o.rewards(r,won); },
    drawGround(L,T,R,B){ ctx.fillStyle=groundPat; ctx.fillRect(L,T,R-L,B-T); ctx.fillStyle=o.tint; ctx.fillRect(L,T,R-L,B-T); },
    drawWorld(L,T,R,B){ terDrawGround(L,T,R,B); if(o.drawWorld) o.drawWorld(L,T,R,B); },
    drawOver(L,T,R,B){ terDrawOver(L,T,R,B); dgLabels(L,T,R,B); }}, o.extra||{}); }

/* ---- ลานวิญญาณประสบการณ์ ---- */
MODES.dexp=dgMode('exp',{tint:'rgba(120,200,90,.10)',
  init(){ for(let i=0;i<16;i++) dgSpawn(Math.random()<.06?'dg_gwisp':'dg_wisp',1); G.dgAcc=0; },
  update(dt){ G.dgAcc+=dt*(2.4+G.dgW*.12);
    while(G.dgAcc>=1){ G.dgAcc-=1; if(dgCount(e=>e.d.flee)<26) dgSpawn(Math.random()<.06?'dg_gwisp':'dg_wisp',1);
      if(dgCount(e=>!e.d.flee)<3+G.dgW) dgSpawn('dg_shade',1); } },
  onKill(e){ if(!e.d.flee) return; const p=(e.d.pts||1)*(e.rank?RANK[e.rank].xp:1); G.dgPts+=p; addText(e.x,e.y-e.r-10,'+'+p,'#fff2a0'); },
  score(){ return 'แต้มภูต '+fmtNum(G.dgPts); }, title(){ return 'จบด่าน'; },
  rewards(r){ const ch=G.char; r.dgPts=G.dgPts; r.baseXp=Math.round(BAL.bxpNeed(Math.max(1,(ch&&ch.lv)|0))*DG.expUnit*G.dgPts*DG.mul*G.diff.rw); }});

/* ---- คลังทองก็อบลิน ---- */
MODES.dgold=dgMode('gold',{tint:'rgba(30,60,20,.18)',
  init(){ for(let i=0;i<8;i++) dgSpawn('dg_courier',1); G.dgAcc=0; G.dgChests=[]; G.dgChestT=8; },
  update(dt){ G.dgAcc+=dt*(1.6+G.dgW*.14);
    while(G.dgAcc>=1){ G.dgAcc-=1; if(dgCount(e=>e.d.flee)<12) dgSpawn('dg_courier',1);
      if(dgCount(e=>!e.d.flee)<4+G.dgW*1.4) dgSpawn(Math.random()<.3?'dg_slinger':'dg_raider',1); }
    G.dgChestT-=dt; if(G.dgChestT<=0&&G.dgChests.length<2){ G.dgChestT=22; const a=Math.random()*TAU, d=300+Math.random()*180; let x=P.x+Math.cos(a)*d, y=P.y+Math.sin(a)*d;
      for(let k=0;k<6&&G.obstacles&&terBlocks(x,y,30);k++){ x+=60; y+=30; }
      G.dgChests.push({x,y,t:0,hold:0}); addText(P.x,P.y-54,'หีบทองโผล่!','#f0c75a',true); }
    for(const c of G.dgChests){ c.t+=dt; const inR=Math.hypot(P.x-c.x,P.y-c.y)<52; c.hold=inR?c.hold+dt:Math.max(0,c.hold-dt*2);
      if(c.hold>=2){ c.dead=true; for(let i=0;i<14;i++) dgCoin(c.x,c.y); burst(c.x,c.y,16,'#f0c75a',200,.6,3); sfx('level'); addText(c.x,c.y-30,'หีบทองแตก!','#f0c75a',true); }
      else if(c.t>40) c.dead=true; }
    G.dgChests=G.dgChests.filter(c=>!c.dead); },
  onKill(e){ if(e.d.bag){ const n=6+(e.rank|0)*4; for(let i=0;i<n;i++) dgCoin(e.x,e.y); burst(e.x,e.y,10,'#f0c75a',160,.5,3); }
    else if(Math.random()<.35) dgCoin(e.x,e.y); },
  score(){ return 'ทอง '+fmtNum(G.goldRun|0); }, title(){ return 'จบด่าน'; },
  rewards(r){ r.dgGold=G.goldRun|0; r.gold=Math.round((G.goldRun|0)*DG.mul*G.diff.rw); },
  drawWorld(){ for(const c of G.dgChests||[]){ const x=c.x, y=c.y; ctx.fillStyle='rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x,y+14,26,8,0,0,TAU); ctx.fill();
    ctx.fillStyle='#8a5a2a'; ctx.strokeStyle='#120c10'; ctx.lineWidth=3; ctx.fillRect(x-22,y-14,44,28); ctx.strokeRect(x-22,y-14,44,28);
    ctx.fillStyle='#f0c75a'; ctx.fillRect(x-22,y-4,44,5); ctx.fillRect(x-4,y-8,8,12); glow(x,y-6,40,'#f0c75a',.25+.15*Math.sin(G.t*5));
    ctx.strokeStyle='rgba(255,255,255,.25)'; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(x,y,52,0,TAU); ctx.stroke();
    if(c.hold>0){ ctx.strokeStyle='#f0c75a'; ctx.lineWidth=5; ctx.beginPath(); ctx.arc(x,y,52,-PI/2,-PI/2+TAU*Math.min(1,c.hold/2)); ctx.stroke(); } } }});

/* ---- ห้องสมบัติหายาก ---- */
function dgRareDay(){ return DG.rare[new Date().getDay()]; }
MODES.drare=dgMode('rare',{tint:'rgba(60,70,120,.14)', timeWin:false,
  init(){ G.dgDay=dgRareDay(); G.dgWave=0; G.dgPhase='wait'; G.dgNext=1.5; G.dgQ=0; },
  update(dt){ const Dd=G.dgDay;
    if(G.dgPhase==='wait'){ G.dgNext-=dt; if(G.dgNext>0) return; G.dgWave++;
      if(G.dgWave<=3){ G.dgPhase='wave'; G.dgQ=[10,14,18][G.dgWave-1]; G.dgSp=0; banner('คลื่นที่ '+G.dgWave+'/3','ธาตุวันนี้: '+Dd.el.slice(0,2).map(k=>EL[k].i+EL[k].n).join(' · ')); sfx('wave'); }
      else { G.dgPhase='boss'; const a=-PI/2, R=Math.max(VW,VH)/2*.7; const hp=EN.dg_guard.hp*BAL.SURV.hpMul(G.tier)*G.diff.hp;
        const e=spawnEnemy('dg_guard',P.x+Math.cos(a)*R,P.y+Math.sin(a)*R,{hp}); e.boss=true; e.el=Dd.el[0]; G.boss=true; G.bosses=[e];
        banner('ผู้เฝ้าคลังรูน',EL[e.el].i+' ธาตุ'+EL[e.el].n+' · ใช้ธาตุที่ชนะ'); sfx('boss'); }
      return; }
    if(G.dgPhase==='wave'){ G.dgSp-=dt; while(G.dgQ>0&&G.dgSp<=0){ G.dgSp=.12; G.dgQ--; const el=Dd.el[(G.dgQ+G.dgWave)%Dd.el.length]; dgSpawn(DG.elMob[el],1+(G.dgWave-1)*.6); }
      if(G.dgQ<=0&&dgCount(()=>true)===0){ G.dgPhase='wait'; G.dgNext=2; healP(P.maxHp*.15); } return; }
    if(G.dgPhase==='boss'&&G.bosses.length&&G.bosses.every(b=>b.dead)){ G.dgPhase='loot'; G.boss=false; const b=G.bosses[0], list=[];
      const rolls=Math.floor(G.diff.rw)+(Math.random()<G.diff.rw%1?1:0); for(let k=0;k<rolls;k++) list.push(...rollDrops(Dd.t,1+(P.drop||0),{T:G.tier}));
      ltGem(b.x,b.y,'bosschest',{list, gold:Math.round(30*(1+G.tier)*G.diff.rw)}); G.dgEnd=8; addText(P.x,P.y-60,'หีบสมบัติ!','#f0c75a',true); return; }
    if(G.dgPhase==='loot'){ G.dgEnd-=dt; if(G.chest||G.dgEnd<=0){                // picked up (or 8 s: collected for you) → done
        if(!G.chest) for(const g of G.gems) if(!g.dead&&g.kind==='bosschest'){ ITEMKIND.bosschest.collect(g); g.dead=true; }
        G.dgPhase='done'; later(1.5,()=>{ if(G&&!G.over) endRun(true); }); } } },
  score(){ return G.dgPhase==='loot'||G.dgPhase==='done'?'ล้มผู้เฝ้าคลังแล้ว':G.dgPhase==='boss'?'ผู้เฝ้าคลัง':'คลื่น '+Math.max(1,Math.min(3,G.dgWave))+'/3'; },
  title(won){ return won?'เปิดคลังสำเร็จ':'ยังเปิดคลังไม่ได้'; },
  rewards(r){ r.dgDay=G.dgDay&&G.dgDay.n; }});

/* ---- fort entry (HUB button + sheet) ---- */
let DGW={box:null};
function dgOpen(){ const box=shMk('div','dg-win'); DGW.box=box; box.addEventListener('click',dgClick);
  sheet(box,{title:'📅 ด่านรายวัน', onClose:()=>{ if(DGW.box===box) DGW.box=null; }}); dgRender(); }
function dgRender(){ const box=DGW.box; if(!box) return; const ch=curChar();
  let h=`<div class="sp-stat"><div><b>รีเซ็ตเที่ยงคืน</b><small>วันนี้: ห้องสมบัติ = ${tfE(dgRareDay().n)}${dgWeekend()?' · เสาร์อาทิตย์เข้าห้องสมบัติได้ 2 ครั้ง':''}</small></div><button type="button" class="tf-q" data-help="daily" aria-label="อธิบายด่านรายวัน">?</button></div>`;
  if(!ch) h+='<p class="sp-why">ต้องมีตัวละครก่อน</p>';
  h+='<ul class="sp-list">';
  for(const k of ['exp','gold','rare']){ const K=DG.kinds[k], left=dgLeft(k), per=dgPer(k);
    h+=`<li class="dg-item"><div class="dg-h"><span class="sp-ic" aria-hidden="true">${K.i}</span><div class="sp-m"><b>${tfE(K.n)}</b><small>${tfE(K.d)}</small><small class="dg-rw">รางวัล: ${tfE(K.rw)}</small></div><span class="dg-left${left?'':' none'}">เหลือ ${left}/${per}</span></div><div class="dg-diff">`;
    DG.diff.forEach((D,i)=>{ const why=dgWhy(k,i,ch); h+=`<button type="button" class="btn${why?' ghost':''}" data-k="${k}" data-d="${i}"${why?' disabled title="'+tfE(why)+'"':''}>${D.n}<small>${(ch&&(ch.lv|0)<D.lv)?'Lv '+D.lv+'+':'×'+D.rw}</small></button>`; });
    h+='</div></li>'; }
  box.innerHTML=h+'</ul><p class="sp-note">สิทธิ์ถูกใช้ทันทีที่กดเข้า · ตายหรือหมดเวลาได้รางวัลตามที่ทำได้ · ยากขึ้น = มอนแรงขึ้นและรางวัลคูณมากขึ้น</p>'; }
function dgClick(e){ const q=e.target.closest('[data-help]'); if(q){ tfHelp(q.dataset.help); return; }
  const b=e.target.closest('[data-k]'); if(!b||b.disabled) return; const k=b.dataset.k, di=+b.dataset.d, K=DG.kinds[k], D=DG.diff[di];
  Promise.resolve(confirmBox('เข้า'+K.n+' ระดับ'+D.n+'? ใช้สิทธิ์ 1 ครั้ง (เหลือ '+dgLeft(k)+')',{okText:'เข้าด่าน'})).then(ok=>{ if(ok&&!dgEnter(k,di)){ toast(dgWhy(k,di,curChar())||'เข้าด่านไม่ได้','bad'); dgRender(); } }).catch(er=>console.error(er)); }
HUB.push({id:'daily', n:'ด่านรายวัน', i:'📅', order:22, badge(){ return curChar()?'เหลือ '+dgLeftAll():'ต้องมีตัวละครก่อน'; }, open(){ dgOpen(); }});
if(typeof TF_HELP!=='undefined'){                                      // help pages (59) · absent in pure test loads
TF_HELP.daily=['ด่านรายวัน',()=>`<p>ด่านสั้น ๆ ที่ให้รางวัลก้อนใหญ่ · นับสิทธิ์ตามวันในเครื่อง รีเซ็ตเที่ยงคืน · สิทธิ์ถูกใช้ทันทีที่กดเข้า (ปิดแอปหนีก็ไม่คืน)</p>
  <table>${tfRow('✨ ลานวิญญาณ','2 ครั้ง/วัน · 3 นาที · ไล่ฆ่าภูตที่วิ่งหนี (ภูตทอง ×5 แต้ม) → EXP ×10')}${tfRow('💰 คลังทอง','2 ครั้ง/วัน · 3 นาที · ฆ่าก็อบลินแบกถุงทอง ยืนเปิดหีบ 2 วิ → ทอง ×10')}${tfRow('🎁 ห้องสมบัติ','1 ครั้ง/วัน (เสาร์อาทิตย์ 2) · 3 คลื่น + ผู้เฝ้าคลัง → หีบของประจำวัน')}</table>
  <h4>ความยาก</h4><table>${DG.diff.map(D=>tfRow(D.n,'Lv '+D.lv+'+ · มอน HP ×'+D.hp+' ดาเมจ ×'+D.dmg+' · รางวัล ×'+D.rw)).join('')}</table>
  <h4>ห้องสมบัติแต่ละวัน</h4><table>${['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์'].map((n,i)=>tfRow(n,DG.rare[i].n+' · ธาตุ '+DG.rare[i].el.slice(0,2).map(k=>EL[k].i).join(''))).join('')}</table>
  <h4>ในด่าน</h4><p>ทุกสกิลในช่องติดตัวเริ่มที่ Lv 1 (หรือระดับเริ่มต้นที่ซื้อไว้) แล้วอัปด้วยการ์ด · มอนมีธาตุและสีชั้น (ฟ้า ชำนาญ · ม่วง หัวหน้า · ทอง ยอดฝีมือ) · พื้นมีหิน ต้นไม้ พุ่มไม้ และน้ำ</p>`];
TF_HELP.elements=['ธาตุ',()=>`<p>สกิลที่มีธาตุตีมอนที่มีธาตุ จะแรงหรือเบาลงตามวงล้อ · มอนในเอาชีวิตรอดและคลาสสิก (อันเดด) ไม่มีธาตุ</p>
  <p>🔥 ไฟ → 🌪️ ลม → 🪨 ดิน → 💧 น้ำ → 🔥 ไฟ (ลูกศร = ชนะ) · ✨ แสง ⇄ 🌑 มืด ชนะกันและกัน</p>
  <table>${tfRow('ชนะธาตุ','ดาเมจ ×1.5 · ขึ้นคำว่า แรง!')}${tfRow('แพ้ธาตุ','ดาเมจ ×0.6 · ขึ้นคำว่า ต้าน')}${tfRow('ธาตุเดียวกัน','ดาเมจ ×0.75')}${tfRow('อื่น ๆ','×1')}</table>
  <h4>สกิลแต่ละธาตุ</h4><table>${Object.keys(EL).map(k=>tfRow(EL[k].i+' '+EL[k].n,Object.keys(SK).filter(id=>SK[id].el===k).map(id=>SK[id].n).join(' · ')||'-')).join('')}${tfRow('⚪ ไม่มี','สกิลที่เหลือ (×1 กับทุกธาตุ)')}</table>`]; }
// dev (§7.9): RG.daily.go('exp'|'gold'|'rare', 0–2) starts without using an entry · RG.daily.left()
DEV.daily={ go(k,d){ const ch=curChar(); if(!ch) return 'no char'; startRun(ch.cls,'d'+k,{char:ch, diff:d|0}); return G&&G.modeId; }, left(){ return {exp:dgLeft('exp'), gold:dgLeft('gold'), rare:dgLeft('rare')}; } };
