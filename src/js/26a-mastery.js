/* ================= 26a-mastery.js · lane B · stat cards = mastery (docs/PROPOSAL-mastery.md) · character runs only ================= */
// Every stat card: (a) a small general effect (sxStats in 26) · (b) mastery +1 for every skill whose main stat it is (SX.main).
// Mastery L of a skill = cards of its main stat + floor(permanent stat / 5) + the account upgrade 🧬 (start mastery).
// Each level: power +4 % (to 35, then +1 %) and a little size · tiers (MX_T) add tricks through the same s.mod / s.fx paths
// the skill tree uses (27), so every hook (burst, ignite, trail, echo …) is shared. Mage first; the other classes keep their
// old 5-card milestones (SX.ms) until their ladders land. Classic never sets P.sx → none of this runs there (golden).
const MX={pow:.04, powOver:.01, cap:35};
// general effect of one card, shown on the cards (character runs)
const MX_CARD={
  STR:'HP +2% · DEF +1 · สกิลที่ใช้ STR ชำนาญขึ้น (แรง ขนาด ลูกเล่น)',
  VIT:'HP +4% · ฟื้น +0.25/วิ · DEF +0.5 · สกิลที่ใช้ VIT ชำนาญขึ้น',
  AGI:'เดิน +3% · หลบ +0.8% · โจมตีเร็ว +1% · สกิลที่ใช้ AGI ชำนาญขึ้น',
  DEX:'โจมตีเร็ว +3% · ระยะโจมตี +4% · เดิน +1% · สกิลที่ใช้ DEX ชำนาญขึ้น',
  INT:'พื้นที่ +2% · ระยะเวลา +2% · เวทที่ใช้ INT ชำนาญขึ้น (แรง ขนาด ลูกเล่น)',
  LUK:'คริ +1.5% · แรงคริ +3% · ดูดของ +4% · ดรอป +1% · สกิลที่ใช้ LUK ชำนาญขึ้น'};
function mxStart(p){ return Math.max(0,(p.bonus&&p.bonus.mxStart)|0); }
function mxLvStat(p,k){ return k?(p.stats[k]|0)+Math.floor(((p.permSt&&p.permSt[k])|0)/5)+mxStart(p):0; }
function mxLv(p,s){ return mxLvStat(p,SX.main[s.id]); }
function mxPow(L){ return 1+MX.pow*Math.min(L,MX.cap)+MX.powOver*Math.max(0,L-MX.cap); }
function mxGrow(L,a,b){ return 1+a*Math.min(L,5)+b*Math.max(0,Math.min(L,MX.cap)-5); }   // fast for 1–5 (you see it grow), slower after
// tiers: [level, text, {add, mul, fx, look}] · look = how the skill is drawn (mxDrawProj) and per-projectile tricks (mxProj)
const MX_T={
flame:[
  [6,'ไอร้อนแผ่รอบลูกไฟ (ลวก 10%)',{look:{haze:2.4, hazePct:.1}}],
  [10,'เปลวไฟหยดลงพื้น',{look:{drip:1.5}}],
  [12,'สะเก็ดไฟ 3 ชิ้นตอนระเบิด',{fx:{shards:{on:'hit', ch:1, n:3, pct:.25}}}],
  [15,'แกนลูกไฟสีขาว · ทะลุ 1 ตัวก่อนระเบิด',{look:{white:1, pass:1, passBoom:1}}],
  [18,'ระเบิดสองระลอก',{look:{boom2:1}}],
  [20,'ไฟสีน้ำเงิน · แรง +25% · ติดไฟ',{mul:{dmg:1.25}, fx:{ignite:{ch:1, pct:.2, t:3}}, look:{blue:1}}],
  [22,'อากาศรอบลูกไฟบิดเบี้ยว · ช้าลง 15%',{look:{hazeSlow:.15, warp:1}}],
  [25,'สุดระยะแตกเป็น 3 ลูก',{look:{split:3}}],
  [28,'ทางไฟลามเป็นเส้นยาว',{look:{drip:3, dripDense:1}}],
  [30,'ระเบิดวงแหวนสุริยะ ×1.5 · ดูดศัตรูเข้ากลาง',{mul:{explode:1.5}, fx:{pull:{r:120}}, look:{sun:1}}],
  [32,'ลูกไฟคู่หมุนเกลียว',{add:{count:1}, look:{twin:1}}],
  [35,'ร่างสุดท้าย หงส์เพลิง · ทะลุทุกตัว ระเบิดใหญ่ปลายทาง',{mul:{explode:1.3, dmg:1.2}, look:{pass:999, passBoom:0, wings:1}}]],
mbolt:[
  [6,'ประกายเวทวนรอบลูก',{look:{sparkle:1}}],
  [10,'ลูกเวทเร็วขึ้น 15%',{mul:{speed:1.15}}],
  [15,'ทะลุ +1',{add:{pierce:1}}],
  [20,'โดนแล้วแยก 2 ลูก',{fx:{shards:{on:'hit', ch:1, n:2, pct:.3}}}],
  [25,'ยิงเป็นพัด +2 ลูก',{add:{count:2}}],
  [30,'แรง +20%',{mul:{dmg:1.2}}],
  [35,'ร่างสุดท้าย ศรรุ้งเจ็ดสี · ทะลุทุกตัว',{add:{pierce:98}, look:{rainbow:1}}]],
frost:[
  [6,'เกล็ดน้ำแข็งลอยรอบตัว',{look:{crystals:1}}],
  [10,'ชะลอ +5%',{add:{slow:.05}}],
  [15,'แช่แข็ง 0.5 วิ',{add:{freeze:.5}}],
  [20,'วงที่สองตามมา',{fx:{echo:{every:1}}}],
  [25,'ตัวที่ตายแตกเป็นเศษน้ำแข็ง',{fx:{shards:{on:'kill', ch:1, n:4, pct:.35}}}],
  [30,'วงกว้าง +20%',{mul:{r:1.2}}],
  [35,'ร่างสุดท้าย ยุคน้ำแข็ง · ทุ่งน้ำแข็ง 5 วิ',{fx:{trail:{kind:'ice', r:90, pct:.12, dur:5, slow:.5}}}]],
thunder:[
  [6,'สายฟ้าสองเส้นพันกัน',{look:{twin:1}}],
  [10,'ระยะกระโดด +20%',{mul:{jump:1.2}}],
  [15,'ชิ่ง +2',{add:{bounces:2}}],
  [20,'ชิ่งครั้งที่ 3 แตกสาย',{fx:{fork:{at:3, n:2, b:2}}}],
  [25,'สตันทุกตัวที่โดน 0.3 วิ',{fx:{shock:{ch:1, t:.3}}}],
  [30,'+1 สาย',{add:{count:1}}],
  [35,'ร่างสุดท้าย สายฟ้าเทพ · ฟ้าผ่าลงทุกจุดที่ชิ่ง',{fx:{hitboom:{r:45, pct:.5}}}]],
meteor:[
  [6,'หางไฟลากยาว',{look:{tail:1}}],
  [10,'วงตก +15%',{mul:{r:1.15}}],
  [15,'+1 ลูก',{add:{count:1}}],
  [20,'หลุมลาวา',{fx:{trail:{kind:'fire', r:55, pct:.25, dur:3}}}],
  [25,'อุกกาบาตตกซ้ำ',{fx:{echo:{every:2}}}],
  [30,'ติดไฟทุกตัวที่โดน',{fx:{ignite:{ch:1, pct:.2, t:3}}}],
  [35,'ร่างสุดท้าย ดาวหางยักษ์',{mul:{r:1.6, dmg:1.3}, fx:{burst:{r:80, pct:.6}}}]],
blizzard:[
  [6,'เกล็ดหิมะใหญ่ขึ้น',{look:{flakes:1}}],
  [10,'นานขึ้น 20%',{mul:{dur:1.2}}],
  [15,'ลูกเห็บ (แช่แข็ง)',{fx:{chill:{ch:.06, t:1}}}],
  [20,'+1 พายุ',{add:{count:1}}],
  [25,'แช่แข็งบ่อยขึ้น',{fx:{chill:{ch:.15, t:1.2}}}],
  [30,'วงกว้าง +30%',{mul:{r:1.3}}],
  [35,'ร่างสุดท้าย พายุหิมะใหญ่',{mul:{r:2, dmg:1.3}}]],
vortex:[
  [6,'ใบไม้หมุนในวังวน',{look:{leaves:1}}],
  [10,'ดูดแรง +40%',{mul:{pull:1.4}}],
  [15,'แรง +20%',{mul:{dmg:1.2}}],
  [20,'ใบมีดลมกระเด็น',{fx:{shards:{on:'hit', ch:.08, n:2, pct:.5}}}],
  [25,'+1 วังวน',{add:{count:1}}],
  [30,'นานขึ้น 30%',{mul:{dur:1.3}}],
  [35,'ร่างสุดท้าย ทอร์นาโดยักษ์',{mul:{r:1.8, dmg:1.3}}]],
spikes:[
  [6,'ฝุ่นหินพุ่ง',{look:{dust:1}}],
  [10,'กระแทก +30%',{mul:{knock:1.3}}],
  [15,'หนามสองแถว (+4)',{add:{count:4}}],
  [20,'หนามระเบิดหิน',{fx:{burst:{r:45, pct:.35}}}],
  [25,'สตัน 0.5 วิ',{fx:{shock:{ch:.2, t:.5}}}],
  [30,'หนามใหญ่ +20%',{mul:{r:1.2}}],
  [35,'ร่างสุดท้าย ภูเขาหนาม · หนามผุดเป็นวง',{fx:{radial:{every:2, n:12, pct:.5}}}]]};
// called from sxMods after the tree (27) → power + growth + the tiers reached
function mxApply(p,s,add,mul){
  const L=mxLv(p,s); delete s.mxLook; if(!L){ delete s.mxL; return; } s.mxL=L;
  const pk=SX.pk[s.id]||'dmg', ev=s.evolved&&s.def.evo&&s.def.evo.set, has=k=>s.def.p[k]!=null||!!(ev&&ev[k]!=null);
  if(has(pk)) mul[pk]=(mul[pk]||1)*mxPow(L);
  if(has('size')) mul.size=(mul.size||1)*mxGrow(L,.08,.01);
  if(has('r')&&s.def.type!=='orbit') mul.r=(mul.r||1)*mxGrow(L,.03,.006);
  if(has('explode')) mul.explode=(mul.explode||1)*mxGrow(L,.03,.006);
  const T=MX_T[s.id]; if(!T) return; const look={};
  for(const [lv,,o] of T){ if(lv>L) break;
    for(const k in o.add||{}) add[k]=(add[k]||0)+o.add[k];
    for(const k in o.mul||{}) mul[k]=(mul[k]||1)*o.mul[k];
    if(o.fx){ s.fx=s.fx||{}; for(const f in o.fx) tfMerge(s.fx,f,o.fx[f]); }
    if(o.look) Object.assign(look,o.look); }
  look.lv=L; s.mxLook=look; }
// next tiers a card of stat k reaches · [{n: cards left, s, t}] nearest first (cards / pause sheet)
function mxNext(p,k){ const out=[];
  for(const s of p.skills){ if(SX.main[s.id]!==k) continue; const L=mxLv(p,s), T=MX_T[s.id];
    if(T){ const nx=T.find(x=>x[0]>L); if(nx) out.push({n:nx[0]-L, s, t:nx[1], lv:nx[0]}); continue; }
    for(const m of SX.ms[s.id]||[]){ if(m[0]!==k) continue; const e=m[5]||5, have=p.stats[k]|0; if(m[2]==='='&&have>=e) continue; out.push({n:e-have%e, s, t:m[4]}); } }
  return out.sort((a,b)=>a.n-b.n); }
function mxReached(s){ const T=MX_T[s.id], L=s.mxL|0; return T?T.filter(x=>x[0]<=L).map(x=>x[1]):[]; }

/* ---- per projectile tricks (fireProj → mxProj · updateProjs → mxProjTick / life end mxSplit · projHit → pass / boom2) ---- */
function mxProj(s,p){ const k=s.mxLook; if(!k||!k.lv) return; const m=p.mx={lv:k.lv, look:k};
  if(k.haze) m.haze=p.r*k.haze*(1+Math.min(4,Math.max(0,k.lv-6))*.1); if(k.pass) m.pass=k.pass;
  if(k.drip) m.drip=k.drip; if(k.split) m.split=k.split; if(k.boom2) m.boom2=1; m.ht=0; m.dd=0; m.ph=(G.projs.length&1)*PI; }
function mxProjTick(p,dt){ const m=p.mx; if(!m) return;
  if(m.haze){ m.ht-=dt; if(m.ht<=0){ m.ht=.2; const R=m.haze, pct=(m.look.hazePct||.1);
      for(const e of query(p.x,p.y,R+40)){ if(e.dead) continue; if((e.x-p.x)**2+(e.y-p.y)**2>(R+e.r)**2) continue;
        damageEnemy(e,p.dmg*pct,p.src,{fxd:true,quiet:true,slow:m.look.hazeSlow||0,slowDur:.4}); } } }
  if(m.drip){ m.dd+=Math.hypot(p.vx,p.vy)*dt; const step=m.look.dripDense?26:48;
    if(m.dd>=step){ m.dd=0; let n=0; for(const z of G.zones) if(z.fxd) n++;
      if(n<24) addZone({x:p.x,y:p.y+p.r*.5,r:14+p.r*.8,dur:m.drip,tick:.5,dmg:p.dmg*.06,kind:'fire',src:p.src,fxd:true}); } } }
function mxSplit(p){ const m=p.mx, n=m.split, a0=Math.atan2(p.vy,p.vx);
  for(let i=0;i<n;i++){ const a=a0+(i-(n-1)/2)*.55, q={x:p.x,y:p.y,vx:Math.cos(a)*380,vy:Math.sin(a)*380,r:p.r*.55,dmg:p.dmg*.4,pierce:1,life:.4,max:.4,knock:60,
    explode:p.explode*.5,homing:0,crit:0,shape:p.shape,c:p.c,src:p.src,burn:0,hit:null,tg:null,dead:false,t:0,fxd:true};
    q.mx={lv:Math.min(m.lv,24),look:m.look,ht:0,dd:0}; G.projs.push(q); } }
// projHit with an exploding projectile: pass through (with a small blast) while pass > 0 · or a second wave after 0.3 s
function mxPassHit(p){ const m=p.mx; if(!m||!(m.pass>0)) return false; m.pass--;
  if(m.look.passBoom) explode(p.x,p.y,p.explode*.6,p.dmg*.5,p.src,{c:p.c}); return true; }
function mxBoom2(p){ const m=p.mx; if(!m||!m.boom2) return; const x=p.x, y=p.y, r=p.explode*.85, d=p.dmg*.5, s=p.src, c=p.c;
  later(.3,()=>{ if(G&&!G.over) explode(x,y,r,d,s,{c}); }); }

/* ---- drawing (13 drawProjs asks first: true = drawn here) ---- */
function mxDrawProj(p,sp,a){ const m=p.mx; if(!m||!m.look) return false; const k=m.look, L=m.lv;
  if(p.shape==='fire'){ const blue=k.blue, c1=blue?'#2a6bff':'#ff5a1a', c2=blue?'#7fc4ff':'#ffb347', c3=blue?'#e8f6ff':'#fff3c4', r=p.r;
    let x=p.x, y=p.y; if(k.twin){ const o=Math.sin(p.t*9+(m.ph||0))*r*1.4; x+=-Math.sin(a)*o; y+=Math.cos(a)*o; }   // two shots spiral around each other
    ctx.globalCompositeOperation='lighter';
    if(m.haze){ const R=m.haze, w=k.warp?1.8:1; ctx.strokeStyle=hexA(c2,.16); ctx.lineWidth=2; ctx.beginPath();
      for(let t=0;t<=TAU+.01;t+=.22){ const rr=R+Math.sin(t*6+G.t*12)*3*w, px=x+Math.cos(t)*rr, py=y+Math.sin(t)*rr; t?ctx.lineTo(px,py):ctx.moveTo(px,py); } ctx.stroke(); }
    if(k.wings){ const f=Math.sin(G.t*16)*.35; ctx.fillStyle=hexA(c2,.7); for(const sg of [-1,1]){ ctx.beginPath();
        const bx=x-Math.cos(a)*r*.4, by=y-Math.sin(a)*r*.4, nx=-Math.sin(a)*sg, ny=Math.cos(a)*sg;
        ctx.moveTo(bx,by); ctx.quadraticCurveTo(bx-Math.cos(a)*r*2.2+nx*r*(2.6+f*2),by-Math.sin(a)*r*2.2+ny*r*(2.6+f*2),bx-Math.cos(a)*r*4.2+nx*r*(1.4+f),by-Math.sin(a)*r*4.2+ny*r*(1.4+f));
        ctx.quadraticCurveTo(bx-Math.cos(a)*r*2.4+nx*r*.9,by-Math.sin(a)*r*2.4+ny*r*.9,bx,by); ctx.fill(); } }
    streak(x,y,a,Math.min(90,40+L*1.4),r*3,c1,.75); glow(x,y,r*(3.2+(k.sun?1:0)),c2,.85);
    ctx.globalCompositeOperation='source-over'; circ(ctx,c2,x,y,r*.95); circ(ctx,k.white?'#ffffff':c3,x-r*.2,y-r*.2,r*(k.white?.62:.45));
    return true; }
  if(p.shape==='bolt'&&(k.sparkle||k.rainbow)){ const c=k.rainbow?`hsl(${(G.t*360+p.t*600)%360},90%,65%)`:p.c;
    ctx.globalCompositeOperation='lighter'; streak(p.x,p.y,a,sp*.06,p.r*3,k.rainbow?'#ffffff':p.c,.7); glow(p.x,p.y,p.r*2.8,k.rainbow?'#ffffff':p.c,.85);
    for(let i=0;i<3;i++){ const t=G.t*8+i*TAU/3; ctx.fillStyle=k.rainbow?`hsl(${(i*120+G.t*300)%360},90%,70%)`:'#e8dcff'; ctx.fillRect(p.x+Math.cos(t)*p.r*2-1.5,p.y+Math.sin(t)*p.r*2-1.5,3,3); }
    ctx.globalCompositeOperation='source-over'; circ(ctx,k.rainbow?c:'#ffffff',p.x,p.y,p.r*.7); return true; }
  return false; }
