/* ================= 26-stat-scaling.js · lane B · in-run stat cards without a cap (character modes only) ================= */
// docs/PROPOSAL-stat-scaling.md. Classic never sets P.sx, so nothing here runs there (golden unchanged).
// - Cards 1–5 of a stat keep the old numbers; card 6+ gives SX.over (half) of them, with caps (SX.cap).
// - Every skill has a main stat: its damage × (1 + rate · points) · rate = SX.base + account upgrade 'stat' (BAL.UP)
//   · points = cards of that stat in this run + floor(permanent stat / 5).
// - Milestones: every `e` (default 5) cards of a stat change a skill parameter (SX.ms). They act through pv() (core 15 reads
//   s.mod), so the cards, the pause sheet and the skill code all see the same numbers.
const SX={ base:.005, over:.5, cap:{speed:.6, area:2, dur:2, crit:.75, cdMin:.45, proj:6, slow:.8, dodge:.5},
  // the param the main-stat power multiplies (default 'dmg') · frenzy (passive) has no damage → no power line
  pk:{bulwark:'nova', aegis:'nova', shadow:'nova', trap:'trap'},
  // card 6+ text (core STATS.d describes cards 1–5)
  half:{STR:'ใบที่ 6+: ดาเมจทุกสกิล +6% · แรงกระแทก +5%', AGI:'ใบที่ 6+: เดิน +3% · คูลดาวน์ ×0.98 · กระสุนเร็ว +4%',
    VIT:'ใบที่ 6+: HP +10 · ฟื้น +0.2/วิ · โล่ดูดซับ +4%', INT:'ใบที่ 6+: พื้นที่ +5% · ระยะเวลา +5%',
    DEX:'ใบที่ 6+: คูลดาวน์ ×0.97 · +1 ลูกทุก 5 ใบ', LUK:'ใบที่ 6+: คริ +2.5% · แรงคริ +5% · ดูดของ +10% · EXP +3%'},
  // skill → main stat (ATK = STR)
  main:{ slash:'STR', slam:'VIT', blades:'AGI', bulwark:'VIT', lance:'DEX', valor:'VIT', cyclone:'STR', frenzy:'STR',
    mbolt:'INT', flame:'INT', frost:'INT', thunder:'INT', meteor:'INT', blizzard:'INT', vortex:'INT', spikes:'INT',
    arrow:'DEX', spread:'AGI', rain:'LUK', trap:'INT', hawk:'AGI', arrownova:'DEX', deadeye:'LUK', blast:'DEX',
    holy:'INT', heal:'VIT', sacred:'VIT', cross:'DEX', judgment:'INT', aegis:'VIT', fists:'STR', spheres:'INT',
    dagger:'LUK', fan:'AGI', venom:'INT', shadow:'AGI', phantom:'LUK', whirl:'AGI', clones:'DEX', smoke:'AGI' },
  // milestones: [stat, param, op ('+' add per step · '*' multiply per step · '=' set once reached), value, Thai text, every]
  ms:{
    slash:[['STR','arc','+',.26,'มุมฟันกว้าง +15°'], ['AGI','count','+',1,'ฟันเพิ่ม 1 ครั้ง',10]],
    slam:[['VIT','stun','+',.1,'สตัน +0.1 วิ'], ['INT','knock','*',1.25,'แรงกระแทก +25%',10]],
    blades:[['AGI','spin','*',1.15,'หมุนเร็ว +15%'], ['DEX','count','+',1,'+1 ดาบ']],
    bulwark:[['VIT','absorb','*',1.1,'ดูดซับ +10%'], ['INT','nova','*',1.15,'ระเบิดโล่ +15%']],
    lance:[['DEX','knock','*',1.2,'แรงกระแทก +20%'], ['STR','size','*',1.1,'หอกใหญ่ +10%']],
    valor:[['VIT','slow','+',.03,'ชะลอ +3%']],
    cyclone:[['STR','knock','*',1.2,'แรงกระแทก +20%'], ['AGI','count','+',1,'หมุนเพิ่ม 1 รอบ',10]],
    frenzy:[['STR','rage','+',.05,'ดาเมจตอน HP ต่ำ +5%'], ['VIT','steal','+',1,'ฟื้นต่อการสังหาร +1']],
    mbolt:[['INT','pierce','+',1,'ทะลุ +1']],
    flame:[['INT','explode','*',1.1,'วงระเบิด +10%'], ['INT','burn','=',1,'ทิ้งไฟบนพื้น',10]],
    frost:[['INT','freeze','+',.15,'แช่แข็ง +0.15 วิ'], ['AGI','slow','+',.05,'ชะลอ +5%']],
    thunder:[['INT','bounces','+',1,'กระโดดต่อสาย +1'], ['DEX','count','+',1,'+1 สาย']],
    meteor:[['DEX','count','+',1,'+1 ลูก'], ['STR','knock','*',1.2,'แรงกระแทก +20%']],
    blizzard:[['INT','slow','+',.05,'ชะลอ +5%'], ['DEX','count','+',1,'+1 พายุ']],
    vortex:[['INT','pull','*',1.15,'แรงดูด +15%'], ['DEX','count','+',1,'+1 วังวน']],
    spikes:[['DEX','count','+',2,'+2 หนาม'], ['STR','knock','*',1.2,'แรงกระแทก +20%']],
    arrow:[['DEX','volley','+',1,'+1 ดอกต่อชุด'], ['AGI','speed','*',1.1,'ลูกเร็ว +10%']],
    spread:[['DEX','count','+',2,'+2 ดอก'], ['INT','spread','*',1.12,'มุมกว้าง +12%']],
    rain:[['DEX','hits','+',1,'ตกเพิ่ม 1 ระลอก'], ['LUK','dmg','*',1.05,'ดาเมจ +5%']],
    trap:[['DEX','count','+',1,'+1 กับดัก']],
    hawk:[['DEX','count','+',1,'+1 เหยี่ยว'], ['AGI','cd','*',.92,'โฉบถี่ขึ้น 8%']],
    arrownova:[['DEX','count','+',4,'+4 ดอกรอบตัว']],
    deadeye:[['LUK','crit','+',.05,'คริ +5%'], ['DEX','size','*',1.15,'ลำศรกว้าง +15%']],
    blast:[['INT','explode','*',1.1,'วงระเบิด +10%'], ['DEX','count','+',1,'+1 ลูก',10]],
    holy:[['INT','homing','*',1.2,'ติดตามแรงขึ้น +20%']],
    heal:[['VIT','heal','*',1.1,'ฮีล +10%']],
    sacred:[['VIT','slow','+',.04,'ชะลอ +4%']],
    cross:[['DEX','count','+',1,'+1 กางเขน']],
    judgment:[['LUK','count','+',1,'ลำแสงเพิ่ม 1 ลำ',10], ['INT','knock','*',1.2,'แรงกระแทก +20%']],
    aegis:[['VIT','absorb','*',1.1,'ดูดซับ +10%'], ['INT','nova','*',1.15,'ระเบิดโล่ +15%']],
    fists:[['AGI','count','+',1,'ต่อยเพิ่ม 1 หมัด',10], ['STR','knock','*',1.2,'แรงกระแทก +20%']],
    spheres:[['INT','spin','*',1.1,'หมุนเร็ว +10%']],
    dagger:[['LUK','crit','+',.05,'คริ +5%']],
    fan:[['DEX','count','+',2,'+2 ใบมีด'], ['AGI','speed','*',1.1,'ลูกเร็ว +10%']],
    venom:[['INT','slow','+',.04,'ชะลอ +4%'], ['DEX','count','+',1,'+1 หมอก']],
    shadow:[['AGI','dodge','+',.01,'หลบ +1%']],
    phantom:[['DEX','targets','+',1,'+1 เป้า'], ['LUK','crit','+',.05,'คริ +5%']],
    whirl:[['AGI','count','+',1,'หมุนเพิ่ม 1 รอบ',10], ['STR','knock','*',1.2,'แรงกระแทก +20%']],
    clones:[['DEX','count','+',1,'+1 ร่าง']],
    smoke:[['AGI','stun','+',.1,'สตัน +0.1 วิ']] } };

function sxOver(p,k){ return Math.max(0,(p.stats[k]|0)-5); }
function sxLow(p,k){ return Math.min(5,p.stats[k]|0); }
function sxRate(p){ return SX.base+((p.bonus&&p.bonus.statPow)||0); }
function sxPoints(p,k){ return (p.stats[k]|0)+Math.floor(((p.permSt&&p.permSt[k])|0)/5); }
// the steps of one milestone this run: floor(cards / every)
function sxSteps(p,m){ return Math.floor((p.stats[m[0]]|0)/(m[5]||5)); }
// s.mod for every owned skill (called first in recalc, before anything reads pv)
function sxMods(p){
  delete p.tfg;
  for(const s of p.skills){ const add={}, mul={}, set={}, id=s.id, main=SX.main[id];
    const pk=SX.pk[id]||'dmg', ev=s.evolved&&s.def.evo&&s.def.evo.set;
    if(main&&(s.def.p[pk]!=null||ev&&ev[pk]!=null)){ const f=1+sxRate(p)*sxPoints(p,main); if(f!==1) mul[pk]=f; }
    for(const m of SX.ms[id]||[]){ const n=sxSteps(p,m); if(!n) continue; const [ ,k,op,v]=m;
      if(op==='+') add[k]=(add[k]||0)+v*n; else if(op==='*') mul[k]=(mul[k]||1)*(1+(v-1)*n); else set[k]=v; }   // '*' grows linearly (×1.1 per step = +10% each), never compounds
    const t=s.def.type, ag=sxOver(p,'AGI'), vi=sxOver(p,'VIT'), st=sxOver(p,'STR');
    if(ag&&t==='proj') mul.speed=(mul.speed||1)*(1+.04*ag);              // AGI card 6+: projectiles +4% faster each
    if(vi&&t==='shield') mul.absorb=(mul.absorb||1)*(1+.04*vi);          // VIT card 6+: shields +4% each
    if(st&&s.def.p.knock!=null) mul.knock=(mul.knock||1)*(1+.05*st);     // STR card 6+: knockback +5% each
    s.cx=true; if(typeof tfApply==='function') tfApply(p,s,add,mul);        // skill tree numbers + effects (27)
    if(Object.keys(add).length||Object.keys(mul).length||Object.keys(set).length) s.mod={add, mul, set}; else delete s.mod; }
  if(typeof tfFinish==='function') tfFinish(p); }   // nothing yet → plain pv (a fresh character = classic numbers)
// the stat part of recalc again, with card 6+ at SX.over and the caps (identical to core for stats ≤ 5)
function sxStats(p,b){
  const c=p.cls, L=k=>sxLow(p,k), O=k=>sxOver(p,k), C=SX.cap;
  p.maxHp=c.hp+(b.hp||0)+20*L('VIT')+10*O('VIT');
  p.regen=c.regen+(b.regen||0)+.4*L('VIT')+.2*O('VIT');
  p.speed=c.speed*(1+(b.speed||0))*(1+Math.min(C.speed,.07*L('AGI')+.03*O('AGI')));
  const cr=c.crit+(b.crit||0)+.05*L('LUK'); p.crit=cr+Math.min(.025*O('LUK'),Math.max(0,C.crit-cr));   // cards 1–5 + gear as before · only card 6+ stops at 75%
  p.critMult=1.75+(b.critMult||0)+.05*O('LUK');
  p.might=1+(b.might||0)+.12*L('STR')+.06*O('STR');
  p.area=1+(b.area||0)+Math.min(C.area,.1*L('INT')+.05*O('INT')); p.durMul=1+(b.dur||0)+Math.min(C.dur,.1*L('INT')+.05*O('INT'));
  p.cdMul=(b.cd||1)*Math.max(C.cdMin,Math.pow(.96,L('AGI'))*Math.pow(.98,O('AGI'))*Math.pow(.94,L('DEX'))*Math.pow(.97,O('DEX')));
  p.magnet=125*(b.magnet||1)*(1+.2*L('LUK')+.1*O('LUK')); p.xpMul=1+(b.xp||0)+.06*L('LUK')+.03*O('LUK');
  const d=p.stats.DEX|0; p.extraProj=(b.proj||0)+Math.min(C.proj,(d>=3?1:0)+(d>=5?1:0)+Math.floor(O('DEX')/5)); }
// cards / pause sheet: the milestone that the next card(s) of stat k reach → [{n: cards left, s: skill, t: text}] nearest first
function sxNext(p,k){ const out=[];
  for(const s of p.skills) for(const m of SX.ms[s.id]||[]){ if(m[0]!==k) continue; const e=m[5]||5, have=p.stats[k]|0;
    if(m[2]==='='&&have>=e) continue; out.push({n:e-have%e, s, t:m[4]}); }
  return out.sort((a,b)=>a.n-b.n); }
// pause sheet: what a skill already has from its main stat and milestones
function sxHave(p,s){ const id=s.id, pk=SX.pk[id]||'dmg', has=s.def.p[pk]!=null||!!(s.evolved&&s.def.evo&&s.def.evo.set[pk]!=null), main=has?SX.main[id]:null;
  const out={main, pk, pct:main?sxRate(p)*sxPoints(p,main):0, ms:[]};
  for(const m of SX.ms[s.id]||[]){ const n=sxSteps(p,m); if(n) out.ms.push(m[4]+(m[2]==='='||n===1?'':' ×'+n)); }
  return out; }
