/* ================= 27-skill-trees.js · lane B · skill trees (docs/PROPOSAL-skill-trees.md §2) + ★6–8 tier 2 (§4) ================= */
// Every skill: 3 branches × 3 tiers + a crown. Tier 1–2 = numbers (into s.mod, the same path as the stat milestones of 26),
// tier 3 + crown = special effects (s.fx) run by the hooks below. Bought with rune points (1 per Base Lv) on the character
// (ch.tr[skill][node] = level) · only character runs (P.sx) read them → classic and the golden runs never change.
// ★6–8 ("ขั้นสอง"): first-job skills after the job advance · in-run Lv 6–8 grow by TF_GROW (or SK[id].p2) on top of Lv 5.

/* ---- ★ caps and tier 2 ---- */
const TF_GROW={dmg:.12, heal:.12, absorb:.12, nova:.12, trap:.12, r:.03, range:.03, explode:.04};
function tfRankCap(cls,job,id){ const c=CLS[cls]; return job&&c&&c.skills.indexOf(id)>=0?8:BAL.CAP.rank; }
function rankCap(ch,id){ return ch?tfRankCap(ch.cls,ch.job,id):BAL.CAP.rank; }
// Lv 6–8 value from the Lv 5 value v (g = lv − 5) · p2 = explicit steps (never over an evolution's own number)
function tfTierUp(k,v,g,s){
  const x=s.def.p2&&s.def.p2[k]; if(x&&!(s.evolved&&s.def.evo&&k in s.def.evo.set)) return x[Math.min(g,x.length)-1];
  if(typeof v!=='number') return v; if(k==='cd') return v*Math.pow(.95,g); const f=TF_GROW[k]; return f?v*(1+f*g):v; }
// character runs: the first skill of a class shoots at most 2 at ★5 (owner 2026-11-09: ศรเวท Lv5 made the game too easy) · more at ★6–8
Object.assign(SK.mbolt,{pc:{count:[1,1,2,2,2], dmg:[11,14,16,19,22]}, p2:{count:[3,3,4], pierce:[1,2,2]}});
Object.assign(SK.holy,{pc:{count:[1,1,2,2,2], dmg:[12,15,18,21,24]}, p2:{count:[3,3,4]}});
Object.assign(SK.dagger,{pc:{count:[1,1,2,2,2]}, p2:{count:[3,3,4]}});
Object.assign(SK.arrow,{p2:{count:[2,3,3]}});
Object.assign(SK.slash,{p2:{count:[2,3,3]}});

/* ---- labels ---- */
const TF_KN={dmg:'ดาเมจ', cd:'คูลดาวน์', count:'จำนวน', pierce:'ทะลุ', speed:'ความเร็วกระสุน', size:'ขนาด', explode:'วงระเบิด', homing:'การเลี้ยวตามเป้า',
  crit:'คริติคอล', knock:'แรงกระแทก', range:'ระยะฟัน', r:'รัศมี', stun:'สตัน', slow:'ชะลอ', freeze:'แช่แข็ง', spin:'ความเร็วหมุน', absorb:'โล่ดูดซับ',
  nova:'ดาเมจระเบิด', tick:'ช่วงห่างแต่ละครั้ง', bounces:'ชิ่ง', jump:'ระยะกระโดด', hits:'จำนวนครั้งที่โดน', dur:'ระยะเวลา', pull:'แรงดูด', trap:'ระเบิดกับดัก',
  heal:'ฟื้น HP', healPct:'ฟื้น HP ตาม % HP สูงสุด', targets:'เป้าต่อครั้ง', rage:'โทสะ', steal:'ฟื้นต่อการสังหาร', dodge:'หลบหลีก'};
const TF_PCTK={slow:1, dodge:1, crit:1, healPct:1}, TF_SECK={stun:1, freeze:1}, TF_REL={rage:1, steal:1};
const tfPc=v=>(Math.round(v*1000)/10)+'%', tfM=r=>(Math.round(r)/10)+' ม.', tfN=v=>String(+(+v).toFixed(2));
const TF_ZK={fire:'เปลวไฟ', ice:'น้ำแข็ง', poison:'พิษ', wind:'ลมคม'};
// special effects: n = node name when used as a proc node · d(p) = text · glob = also allowed on passive skills (hit by any skill)
const TFX={
  burst:{n:'ระเบิดเมื่อสังหาร', d:p=>'ศัตรูที่ตายระเบิดวง '+tfM(p.r)+' ดาเมจ '+tfPc(p.pct)+' ของครั้งที่ฆ่า'},
  shock:{n:'สะท้าน', t:.4, d:p=>'โอกาส '+tfPc(p.ch)+' ทำให้ศัตรูสตัน '+tfN(p.t)+' วิ (บอสไม่ติด)'},
  chill:{n:'เยือกแข็ง', t:.8, d:p=>'โอกาส '+tfPc(p.ch)+' แช่แข็งศัตรู '+tfN(p.t)+' วิ (บอสไม่ติด)'},
  ignite:{n:'ติดไฟ', pct:.25, t:3, d:p=>'โอกาส '+tfPc(p.ch)+' ติดไฟ เสียดาเมจ '+tfPc(p.pct)+' ของครั้งที่โดน ทุก 0.5 วิ นาน '+tfN(p.t)+' วิ'},
  trail:{d:p=>'จุดที่โดนทิ้งพื้น'+(TF_ZK[p.kind]||'พลังเวท')+' วง '+tfM(p.r)+' นาน '+tfN(p.dur)+' วิ ดาเมจ '+tfPc(p.pct)+' ทุก 0.5 วิ'+(p.slow?' ชะลอ '+tfPc(p.slow):'')+' (เกิดได้ทุก 0.35 วิ)'},
  pull:{d:p=>'ดูดศัตรูรอบจุดที่โดนวง '+tfM(p.r)+' เข้ามารวมกัน (ทุก 0.25 วิ)'},
  leech:{n:'ดูดเลือด', pk:'pct', d:p=>'ฟื้น HP '+tfPc(p.pct)+' ของดาเมจที่ทำ'},
  feast:{d:p=>'ทุกครั้งที่สังหาร ฟื้น HP '+tfN(p.amt)},
  mend:{d:p=>'ทุกครั้งที่ร่าย ฟื้น HP '+tfPc(p.pct)+' ของ HP สูงสุด'},
  execute:{d:p=>'ศัตรูที่ HP ต่ำกว่า '+tfPc(p.hp)+' โดนดาเมจ ×'+tfN(p.m)},
  vsStun:{d:p=>'ศัตรูที่ติดสตันหรือแช่แข็งโดนดาเมจ ×'+tfN(p.m)},
  shards:{d:p=>(p.on==='kill'?'ศัตรูที่ตาย':'โอกาส '+tfPc(p.ch)+' ตอนโดน')+' แตกเป็นสะเก็ด '+p.n+' ชิ้นรอบทิศ ดาเมจ '+tfPc(p.pct)},
  echo:{d:p=>'ทุกการร่ายครั้งที่ '+p.every+' ร่ายซ้ำอีกครั้งทันที (ไม่เสียคูลดาวน์)'},
  radial:{d:p=>'ทุกการร่ายครั้งที่ '+p.every+' ปล่อยกระสุนรอบทิศ '+p.n+' ลูก ดาเมจ '+tfPc(p.pct)},
  fork:{d:p=>'การชิ่งครั้งที่ '+p.at+' แตกสายย่อย '+p.n+' สาย (สายย่อยชิ่งได้ '+p.b+' ครั้ง ดาเมจ 70%)'},
  mod:{d:p=>Object.keys(p.add||{}).map(k=>tfNumText(k,'+',p.add[k],1)).concat(Object.keys(p.mul||{}).map(k=>tfNumText(k,'*',p.mul[k],1))).join(' · ')}};
const TF_GLOB={burst:1, shock:1, chill:1, leech:1, feast:1, execute:1, vsStun:1};   // fx a passive skill may carry (no casts of its own)

/* ---- the trees ---- */
// branch = [name, icon, n1, n2, special]  ·  n = [key, op, per level, max] (op '+' add · '*' ×(1+per·lv) · 'c' cooldown −per·lv)
// or ['@fx', chance per level, max, {params}]  ·  special = {fx, n (name), i (icon), …params}  ·  tree = [A, B, C, crown]
// requirements (same for every tree): tier 1 ★2 · tier 2 ★4 + tier 1 full · tier 3 tier 2 full · B2 also A1 ≥ 2 · B3 also A2 ≥ 1 ·
// crown: advanced job + ★5 + 2 of the 3 specials
const TFD={
/* swordsman */
slash:[['คมดาบ','🗡️',['dmg','*',.08,3],['@shock',.08,2],{fx:'echo',nm:'ฟันซ้ำ',i:'⚔️',every:4}],
  ['ระยะดาบ','📏',['range','*',.06,3],['knock','*',.15,2],{fx:'shards',nm:'คลื่นดาบแตก',i:'🌙',on:'kill',n:3,pct:.35}],
  ['ความไว','💨',['cd','c',.05,3],['count','+',1,1],{fx:'execute',nm:'ปลิดชีพ',i:'💀',hp:.3,m:1.6}],
  {fx:'radial',nm:'พายุคมดาบ',i:'🌪️',every:6,n:6,pct:.5}],
slam:[['แรงทุบ','🔨',['dmg','*',.08,3],['stun','+',.1,2],{fx:'vsStun',nm:'ทุบซ้ำแผล',i:'💢',m:1.5}],
  ['คลื่นกระแทก','🌊',['r','*',.06,3],['knock','*',.15,2],{fx:'echo',nm:'อาฟเตอร์ช็อก',i:'〰️',every:3}],
  ['จังหวะทุบ','⏱️',['cd','c',.05,3],['slow','+',.1,2],{fx:'burst',nm:'หินแตก',i:'🪨',r:55,pct:.5}],
  {fx:'trail',nm:'ธรณีลุกไหม้',i:'🌋',kind:'fire',r:60,pct:.2,dur:3}],
blades:[['คมวิญญาณ','👻',['dmg','*',.08,3],['size','*',.1,2],{fx:'ignite',nm:'แผลลึก',i:'🩸',ch:.3,pct:.3,t:3}],
  ['ดาบเพิ่ม','➕',['count','+',1,2],['spin','*',.1,2],{fx:'burst',nm:'ดาบระเบิดวิญญาณ',i:'💥',r:40,pct:.35}],
  ['วงโคจร','⭕',['r','*',.06,3],['knock','*',.2,2],{fx:'pull',nm:'ดาบดึงวิญญาณ',i:'🧲',r:90}],
  {fx:'shards',nm:'ใบดาบแยกร่าง',i:'✨',on:'hit',ch:.12,n:2,pct:.5}],
bulwark:[['เกราะหนา','🛡️',['absorb','*',.1,3],['cd','c',.06,2],{fx:'mend',nm:'เกราะฟื้นกาย',i:'💚',pct:.05}],
  ['ระเบิดโล่','💥',['nova','*',.1,3],['r','*',.06,2],{fx:'shock',nm:'ระเบิดสะท้าน',i:'⚡',ch:1,t:.6}],
  ['เปลวโล่','🔥',['@ignite',.2,3],['r','*',.04,2],{fx:'burst',nm:'เศษโล่ระเบิด',i:'🎆',r:60,pct:.5}],
  {fx:'radial',nm:'โล่หนามพันเล่ม',i:'🌟',every:1,n:10,pct:.6}],
lance:[['ปลายหอก','🔱',['dmg','*',.08,3],['knock','*',.15,2],{fx:'execute',nm:'แทงทะลวงหัวใจ',i:'💀',hp:.3,m:1.6}],
  ['หอกคู่','➕',['count','+',1,2],['speed','*',.1,2],{fx:'trail',nm:'ทางหอกไฟ',i:'🔥',kind:'fire',r:40,pct:.25,dur:2.5}],
  ['จังหวะพุ่ง','⏱️',['cd','c',.05,3],['size','*',.15,2],{fx:'echo',nm:'พุ่งซ้ำ',i:'↩️',every:4}],
  {fx:'shards',nm:'หอกแตกสะเก็ด',i:'✨',on:'kill',ch:.5,n:2,pct:.4}],
valor:[['แสงแผดเผา','☀️',['dmg','*',.1,3],['tick','*',-.08,2],{fx:'ignite',nm:'ไฟศักดิ์สิทธิ์',i:'🔥',ch:.1,pct:.4,t:3}],
  ['ออร่ากว้าง','⭕',['r','*',.06,3],['slow','+',.04,2],{fx:'chill',nm:'ออร่าตรึง',i:'❄️',ch:.04,t:1}],
  ['พรผู้พิทักษ์','💚',['@leech',.005,3],['@shock',.02,2],{fx:'execute',nm:'ตัดสินผู้อ่อนแอ',i:'⚖️',hp:.25,m:2}],
  {fx:'burst',nm:'ออร่าระเบิดแสง',i:'💥',r:50,pct:1}],
cyclone:[['แรงเหวี่ยง','🪓',['dmg','*',.08,3],['range','*',.06,2],{fx:'echo',nm:'หมุนซ้ำ',i:'🔁',every:3}],
  ['รอบหมุน','⏱️',['cd','c',.05,3],['knock','*',.15,2],{fx:'pull',nm:'ดูดพายุ',i:'🌀',r:110}],
  ['เลือดนักรบ','🩸',['@leech',.01,3],['@shock',.08,2],{fx:'shards',nm:'เศษขวานแตก',i:'✨',on:'kill',n:3,pct:.35}],
  {fx:'radial',nm:'พายุใบขวาน',i:'🌪️',every:4,n:8,pct:.5}],
frenzy:[['โทสะ','😡',['rage','*',.1,3],['rage','*',.1,2],{fx:'execute',nm:'ฆ่าไม่เลี้ยง',i:'💀',hp:.3,m:1.3}],
  ['กระหายเลือด','🩸',['steal','*',.1,3],['steal','*',.1,2],{fx:'feast',nm:'กินเลือดศัตรู',i:'🍖',amt:2}],
  ['คลั่งสุดขีด','🔥',['@leech',.004,3],['@shock',.03,2],{fx:'burst',nm:'ศพระเบิด',i:'💥',r:45,pct:.3}],
  {fx:'vsStun',nm:'ไล่ล่าผู้หมดแรง',i:'👑',m:1.4}],
/* mage */
mbolt:[['พลังเวท','💥',['dmg','*',.08,3],['pierce','+',1,2],{fx:'shards',nm:'ลูกเวทแตกสาม',i:'✨',on:'hit',ch:.25,n:3,pct:.3}],
  ['ทะลวง','🎯',['pierce','+',1,2],['size','*',.12,2],{fx:'execute',nm:'ปลิดลมหายใจ',i:'💀',hp:.35,m:1.5}],
  ['ความไว','💨',['cd','c',.05,3],['speed','*',.1,2],{fx:'echo',nm:'ร่ายซ้อน',i:'🔁',every:6}],
  {fx:'radial',nm:'ฝนดารา',i:'🌠',every:4,n:8,pct:.5}],
flame:[['ไฟแรง','🔥',['dmg','*',.08,3],['explode','*',.08,2],{fx:'burst',nm:'ระเบิดซ้อน',i:'💥',r:50,pct:.4}],
  ['วงระเบิด','⭕',['explode','*',.06,3],['knock','*',.15,2],{fx:'pull',nm:'วงดูดเพลิง',i:'🌀',r:90}],
  ['เผาไหม้','♨️',['@ignite',.15,3],['cd','c',.06,2],{fx:'trail',nm:'พื้นไฟลาม',i:'🔥',kind:'fire',r:45,pct:.25,dur:3}],
  {fx:'shards',nm:'หอกเล็กสี่ทิศ',i:'✨',on:'kill',ch:1,n:4,pct:.4}],
frost:[['ความเย็น','❄️',['dmg','*',.08,3],['@chill',.08,2],{fx:'shards',nm:'เศษน้ำแข็ง',i:'🧊',on:'kill',ch:1,n:4,pct:.35}],
  ['ตรึงร่าง','🥶',['slow','+',.04,3],['freeze','+',.15,2],{fx:'vsStun',nm:'แตกเป็นผุยผง',i:'💎',m:1.6}],
  ['วงกว้าง','⭕',['r','*',.06,3],['cd','c',.06,2],{fx:'echo',nm:'วงที่สอง',i:'🔁',every:2}],
  {fx:'trail',nm:'ทุ่งน้ำแข็ง',i:'🏔️',kind:'ice',r:70,pct:.15,dur:4,slow:.4}],
thunder:[['พลังสายฟ้า','💥',['dmg','*',.08,3],['@shock',.1,2,{t:.3}],{fx:'burst',nm:'ฟ้าผ่าระเบิด',i:'🎆',r:50,pct:.4}],
  ['ชิ่งไกล','↪️',['bounces','+',1,3],['jump','*',.12,2],{fx:'fork',nm:'ชิ่งของชิ่ง',i:'🕸️',at:3,n:2,b:2}],
  ['แยกสาย','🔱',['count','+',1,2],['cd','c',.06,2],{fx:'radial',nm:'พายุอสุนี',i:'🌩️',every:5,n:8,pct:.6}],
  {fx:'trail',nm:'เทพอสุนี',i:'👑',kind:'wind',r:35,pct:.15,dur:2}],
meteor:[['มวลดาว','☄️',['dmg','*',.08,3],['r','*',.06,2],{fx:'echo',nm:'ตกซ้ำ',i:'🔁',every:3}],
  ['ฝนดาว','🌠',['count','+',1,2],['cd','c',.05,2],{fx:'radial',nm:'สะเก็ดดาวกระจาย',i:'✨',every:3,n:6,pct:.4}],
  ['ไฟนรก','🔥',['@ignite',.2,3],['knock','*',.15,2],{fx:'trail',nm:'หลุมลาวา',i:'🌋',kind:'fire',r:60,pct:.3,dur:4}],
  {fx:'burst',nm:'ดาวตกยักษ์',i:'👑',r:70,pct:.6}],
blizzard:[['หิมะคม','🌨️',['dmg','*',.1,3],['tick','*',-.08,2],{fx:'chill',nm:'ลูกเห็บ',i:'🧊',ch:.06,t:1.2}],
  ['พายุกว้าง','⭕',['r','*',.06,3],['dur','*',.1,2],{fx:'echo',nm:'พายุซ้อน',i:'🔁',every:2}],
  ['ลมหนาว','🥶',['slow','+',.04,3],['@shock',.03,2],{fx:'vsStun',nm:'แข็งแล้วแตก',i:'💎',m:1.5}],
  {fx:'mod',nm:'พายุคู่',i:'👑',add:{count:1}}],
vortex:[['แรงดูด','🧲',['pull','*',.1,3],['dur','*',.1,2],{fx:'burst',nm:'ดูดแล้วบด',i:'💥',r:50,pct:.4}],
  ['ใบมีดลม','🍃',['dmg','*',.1,3],['tick','*',-.08,2],{fx:'shards',nm:'ลมคมกระจาย',i:'✨',on:'hit',ch:.05,n:2,pct:.5}],
  ['วังวนใหญ่','🌀',['r','*',.06,3],['count','+',1,1],{fx:'echo',nm:'วังวนแยกตัว',i:'🔁',every:2}],
  {fx:'chill',nm:'วังวนน้ำแข็ง',i:'👑',ch:.05,t:1}],
spikes:[['หนามคม','🪨',['dmg','*',.08,3],['knock','*',.15,2],{fx:'burst',nm:'หนามระเบิดหิน',i:'💥',r:45,pct:.35}],
  ['แนวหนาม','📏',['count','+',2,2],['r','*',.06,2],{fx:'echo',nm:'กำแพงหนาม',i:'🧱',every:3}],
  ['ตรึงพื้น','⛓️',['cd','c',.05,3],['@shock',.1,2],{fx:'vsStun',nm:'แทงซ้ำแผล',i:'💢',m:1.5}],
  {fx:'radial',nm:'ป่าหนามศิลา',i:'👑',every:3,n:10,pct:.5}],
/* archer */
arrow:[['ลูกธนูหนัก','🏹',['dmg','*',.08,3],['pierce','+',1,2],{fx:'execute',nm:'ยิงปลิดชีพ',i:'💀',hp:.3,m:1.6}],
  ['ศรคู่','➕',['count','+',1,1],['speed','*',.1,2],{fx:'shards',nm:'ศรแตกกิ่ง',i:'✨',on:'hit',ch:.2,n:2,pct:.4}],
  ['มือไว','💨',['cd','c',.05,3],['crit','+',.04,2],{fx:'echo',nm:'ยิงรัวซ้ำ',i:'🔁',every:5}],
  {fx:'radial',nm:'ศรรอบทิศ',i:'👑',every:5,n:8,pct:.5}],
spread:[['หัวศรคม','🏹',['dmg','*',.08,3],['pierce','+',1,2],{fx:'burst',nm:'ศรระเบิด',i:'💥',r:40,pct:.3}],
  ['ศรเพิ่ม','➕',['count','+',1,3],['knock','*',.15,2],{fx:'shards',nm:'ศรแตกสะเก็ด',i:'✨',on:'kill',ch:1,n:3,pct:.35}],
  ['สายธนูตึง','⏱️',['cd','c',.05,3],['speed','*',.1,2],{fx:'echo',nm:'ยิงสองชุด',i:'🔁',every:3}],
  {fx:'radial',nm:'พัดศรพันดอก',i:'👑',every:4,n:12,pct:.4}],
rain:[['ศรหนัก','🌧️',['dmg','*',.08,3],['hits','+',1,2],{fx:'shock',nm:'ศรตรึง',i:'📌',ch:.1,t:.5}],
  ['ห่ากว้าง','⭕',['count','+',1,2],['r','*',.06,2],{fx:'echo',nm:'ห่าระลอกสอง',i:'🔁',every:3}],
  ['ศรไฟ','🔥',['cd','c',.05,3],['@ignite',.1,2],{fx:'trail',nm:'ทุ่งศรไฟ',i:'🔥',kind:'fire',r:50,pct:.2,dur:3}],
  {fx:'execute',nm:'ห่าธนูพิพากษา',i:'👑',hp:.3,m:2}],
trap:[['ดินปืน','💣',['trap','*',.1,3],['knock','*',.15,2],{fx:'burst',nm:'ระเบิดลูกโซ่',i:'💥',r:60,pct:.5}],
  ['ดักเพิ่ม','➕',['count','+',1,2],['r','*',.06,2],{fx:'chill',nm:'กับดักน้ำแข็ง',i:'❄️',ch:1,t:.8}],
  ['วางไว','⏱️',['cd','c',.05,3],['dur','*',.15,2],{fx:'trail',nm:'พื้นไฟหลังระเบิด',i:'🔥',kind:'fire',r:55,pct:.25,dur:3}],
  {fx:'echo',nm:'วางคู่',i:'👑',every:3}],
hawk:[['กรงเล็บ','🦅',['dmg','*',.08,3],['r','*',.1,2],{fx:'burst',nm:'โฉบระเบิด',i:'💥',r:45,pct:.4}],
  ['ฝูงเหยี่ยว','➕',['count','+',1,1],['cd','c',.06,2],{fx:'shock',nm:'จิกตาบอด',i:'⚡',ch:.25,t:.6}],
  ['ล่าเหยื่อ','🎯',['@ignite',.15,3],['@chill',.05,2],{fx:'execute',nm:'ล่าตัวอ่อนแอ',i:'💀',hp:.35,m:1.6}],
  {fx:'shards',nm:'ขนเหยี่ยวคม',i:'👑',on:'kill',ch:1,n:3,pct:.4}],
arrownova:[['หัวศร','🏹',['dmg','*',.08,3],['pierce','+',1,2],{fx:'burst',nm:'วงศรระเบิด',i:'💥',r:40,pct:.3}],
  ['วงศรหนา','➕',['count','+',2,3],['speed','*',.1,2],{fx:'shards',nm:'ศรแตกกิ่ง',i:'✨',on:'kill',ch:1,n:2,pct:.4}],
  ['จังหวะวง','⏱️',['cd','c',.05,3],['knock','*',.15,2],{fx:'echo',nm:'วงซ้อน',i:'🔁',every:2}],
  {fx:'execute',nm:'วงศรประหาร',i:'👑',hp:.3,m:1.8}],
deadeye:[['เจาะเกราะ','🎯',['dmg','*',.08,3],['crit','+',.04,2],{fx:'execute',nm:'นัดปิดบัญชี',i:'💀',hp:.4,m:1.8}],
  ['เล็งไว','⏱️',['cd','c',.05,3],['speed','*',.1,2],{fx:'echo',nm:'นัดที่สอง',i:'🔁',every:3}],
  ['ศรใหญ่','📏',['size','*',.15,3],['knock','*',.15,2],{fx:'shards',nm:'ศรแตกดาว',i:'✨',on:'hit',ch:.3,n:3,pct:.3}],
  {fx:'burst',nm:'ดาวแตก',i:'👑',r:60,pct:.5}],
blast:[['ดินระเบิด','💥',['dmg','*',.08,3],['explode','*',.08,2],{fx:'burst',nm:'ระเบิดต่อเนื่อง',i:'🎆',r:50,pct:.4}],
  ['ศรเพิ่ม','➕',['count','+',1,2],['cd','c',.05,2],{fx:'echo',nm:'ยิงซ้ำ',i:'🔁',every:4}],
  ['ไฟและแรงสั่น','🔥',['@ignite',.15,3],['@shock',.08,2],{fx:'trail',nm:'หลุมเพลิง',i:'🔥',kind:'fire',r:45,pct:.25,dur:3}],
  {fx:'shards',nm:'สะเก็ดระเบิด',i:'👑',on:'kill',ch:1,n:4,pct:.4}],
/* cleric */
holy:[['แสงจ้า','✨',['dmg','*',.08,3],['pierce','+',1,2],{fx:'feast',nm:'แสงชุบชีวิต',i:'💚',amt:3}],
  ['แสงไว','⏱️',['cd','c',.05,3],['size','*',.12,2],{fx:'echo',nm:'ลูกแสงซ้อน',i:'🔁',every:5}],
  ['ลูกแสงใหญ่','⭕',['size','*',.1,3],['speed','*',.1,2],{fx:'shards',nm:'แสงแตกกระจาย',i:'🌟',on:'hit',ch:.2,n:3,pct:.3}],
  {fx:'radial',nm:'ดวงอาทิตย์น้อย',i:'👑',every:4,n:8,pct:.5}],
heal:[['พรฟื้นฟู','💚',['heal','*',.1,3],['healPct','+',.01,2],{fx:'chill',nm:'แสงตรึง',i:'❄️',ch:1,t:.6}],
  ['แสงลงทัณฑ์','💥',['dmg','*',.1,3],['r','*',.06,2],{fx:'burst',nm:'แสงระเบิดวิญญาณ',i:'🎆',r:50,pct:.5}],
  ['ภาวนาไว','⏱️',['cd','c',.06,3],['knock','*',.15,2],{fx:'echo',nm:'ภาวนาซ้ำ',i:'🔁',every:2}],
  {fx:'radial',nm:'ดอกไม้แห่งแสง',i:'👑',every:1,n:8,pct:.8}],
sacred:[['แสงร้อน','☀️',['dmg','*',.1,3],['tick','*',-.08,2],{fx:'feast',nm:'ผืนดินชุบชีวิต',i:'💚',amt:1}],
  ['เขตกว้าง','⭕',['r','*',.06,3],['slow','+',.04,2],{fx:'chill',nm:'เขตตรึงวิญญาณ',i:'❄️',ch:.04,t:1}],
  ['พรคุ้มครอง','🙏',['@shock',.03,3],['@leech',.005,2],{fx:'execute',nm:'พิพากษาผู้อ่อนแอ',i:'⚖️',hp:.2,m:2}],
  {fx:'burst',nm:'วิญญาณระเบิดแสง',i:'👑',r:45,pct:.8}],
cross:[['กางเขนหนัก','✝️',['dmg','*',.08,3],['r','*',.06,2],{fx:'shock',nm:'กางเขนตรึง',i:'⚡',ch:1,t:.5}],
  ['กางเขนเพิ่ม','➕',['count','+',1,2],['cd','c',.05,2],{fx:'echo',nm:'กางเขนซ้อน',i:'🔁',every:3}],
  ['แสงเผา','🔥',['knock','*',.15,3],['@ignite',.1,2],{fx:'burst',nm:'กางเขนระเบิด',i:'💥',r:50,pct:.4}],
  {fx:'radial',nm:'กางเขนแปดทิศ',i:'👑',every:3,n:8,pct:.5}],
judgment:[['คำพิพากษา','⚖️',['dmg','*',.08,3],['r','*',.06,2],{fx:'execute',nm:'ประหาร',i:'💀',hp:.3,m:1.7}],
  ['เสาเพิ่ม','➕',['count','+',1,3],['cd','c',.05,2],{fx:'echo',nm:'พิพากษาซ้ำ',i:'🔁',every:4}],
  ['แสงสะท้าน','⚡',['@shock',.08,3],['knock','*',.15,2],{fx:'burst',nm:'เสาแสงระเบิด',i:'💥',r:45,pct:.4}],
  {fx:'radial',nm:'วันพิพากษา',i:'👑',every:2,n:6,pct:.5}],
aegis:[['เกราะเทวา','🛡️',['absorb','*',.1,3],['cd','c',.06,2],{fx:'mend',nm:'พรคืนชีพ',i:'💚',pct:.06}],
  ['ระเบิดเทวา','💥',['nova','*',.1,3],['r','*',.06,2],{fx:'chill',nm:'ระเบิดตรึง',i:'❄️',ch:1,t:.8}],
  ['แสงสะท้อน','⚡',['@shock',.2,3],['r','*',.04,2],{fx:'burst',nm:'เศษเกราะแสง',i:'🎆',r:55,pct:.5}],
  {fx:'radial',nm:'ปีกเทวา',i:'👑',every:1,n:12,pct:.6}],
fists:[['หมัดหนัก','👊',['dmg','*',.08,3],['range','*',.06,2],{fx:'vsStun',nm:'หมัดซ้ำแผล',i:'💢',m:1.5}],
  ['หมัดไว','⏱️',['cd','c',.05,3],['count','+',1,1],{fx:'echo',nm:'หมัดเงา',i:'🔁',every:6}],
  ['ลมปราณ','🌬️',['@leech',.005,3],['knock','*',.15,2],{fx:'feast',nm:'ปราณคืนกาย',i:'💚',amt:1}],
  {fx:'shards',nm:'หมัดแตกแสง',i:'👑',on:'hit',ch:.1,n:2,pct:.5}],
spheres:[['ไฟสุริยะ','☀️',['dmg','*',.08,3],['size','*',.1,2],{fx:'ignite',nm:'เผาวิญญาณ',i:'🔥',ch:.3,pct:.3,t:3}],
  ['ดวงเพิ่ม','➕',['count','+',1,2],['spin','*',.1,2],{fx:'burst',nm:'ดวงไฟระเบิด',i:'💥',r:45,pct:.4}],
  ['วงโคจร','⭕',['r','*',.06,3],['knock','*',.15,2],{fx:'chill',nm:'แสงตรึง',i:'❄️',ch:.05,t:.8}],
  {fx:'shards',nm:'สะเก็ดสุริยะ',i:'👑',on:'hit',ch:.12,n:2,pct:.5}],
/* thief */
dagger:[['มีดคม','🗡️',['dmg','*',.08,3],['crit','+',.04,2],{fx:'execute',nm:'แทงจุดตาย',i:'💀',hp:.3,m:1.6}],
  ['มีดทะลุ','🎯',['pierce','+',1,2],['speed','*',.1,2],{fx:'shards',nm:'มีดแตกคู่',i:'✨',on:'hit',ch:.2,n:2,pct:.4}],
  ['มือไว','💨',['cd','c',.05,3],['@ignite',.1,2,{pct:.3}],{fx:'echo',nm:'ปาซ้ำ',i:'🔁',every:5}],
  {fx:'radial',nm:'พายุมีดเงา',i:'👑',every:5,n:8,pct:.5}],
fan:[['ใบมีดคม','🪭',['dmg','*',.08,3],['pierce','+',1,2],{fx:'burst',nm:'ใบมีดระเบิด',i:'💥',r:40,pct:.3}],
  ['พัดหนา','➕',['count','+',2,3],['speed','*',.1,2],{fx:'shards',nm:'ใบมีดแตก',i:'✨',on:'kill',ch:1,n:2,pct:.4}],
  ['พัดไว','⏱️',['cd','c',.05,3],['crit','+',.04,2],{fx:'echo',nm:'พัดซ้อน',i:'🔁',every:2}],
  {fx:'execute',nm:'พัดประหาร',i:'👑',hp:.3,m:1.8}],
venom:[['พิษแรง','☠️',['dmg','*',.1,3],['tick','*',-.08,2],{fx:'burst',nm:'ศพพิษระเบิด',i:'💥',r:45,pct:.5}],
  ['หมอกกว้าง','⭕',['r','*',.06,3],['dur','*',.1,2],{fx:'echo',nm:'หมอกซ้อน',i:'🔁',every:2}],
  ['หมอกหนา','➕',['count','+',1,2],['slow','+',.04,2],{fx:'execute',nm:'พิษกัดกิน',i:'💀',hp:.3,m:1.8}],
  {fx:'ignite',nm:'พิษกัดกร่อน',i:'👑',ch:.3,pct:.5,t:4}],
shadow:[['เงาพลิ้ว','🌫️',['dodge','+',.02,3],['dodge','+',.02,2],{fx:'chill',nm:'เงาตรึง',i:'❄️',ch:.03,t:.6}],
  ['ระเบิดเงา','💥',['nova','*',.1,3],['r','*',.06,2],{fx:'execute',nm:'เงาประหาร',i:'💀',hp:.25,m:1.4}],
  ['เงาดูดชีวิต','🩸',['@leech',.003,3],['@shock',.03,2],{fx:'feast',nm:'เงากลืนวิญญาณ',i:'🍖',amt:1}],
  {fx:'vsStun',nm:'เงาไล่ล่า',i:'👑',m:1.4}],
phantom:[['ฟันเงา','🗡️',['dmg','*',.08,3],['crit','+',.04,2],{fx:'execute',nm:'ฟันประหาร',i:'💀',hp:.35,m:1.7}],
  ['เป้าเพิ่ม','➕',['targets','+',1,3],['range','*',.08,2],{fx:'echo',nm:'ฟันซ้ำ',i:'🔁',every:3}],
  ['ย่างเงา','⏱️',['cd','c',.05,3],['@shock',.1,2],{fx:'burst',nm:'เงาแตก',i:'💥',r:45,pct:.4}],
  {fx:'shards',nm:'เศษเงาคม',i:'👑',on:'kill',ch:1,n:3,pct:.4}],
whirl:[['ใบมีดหนัก','🌀',['dmg','*',.08,3],['range','*',.06,2],{fx:'ignite',nm:'แผลเลือดไหล',i:'🩸',ch:.3,pct:.3,t:3}],
  ['หมุนไว','⏱️',['cd','c',.05,3],['count','+',1,1],{fx:'pull',nm:'ดูดเข้าวง',i:'🧲',r:100}],
  ['เลือดนักฆ่า','🩸',['@leech',.006,3],['knock','*',.15,2],{fx:'shards',nm:'ใบมีดแตก',i:'✨',on:'kill',ch:1,n:3,pct:.35}],
  {fx:'radial',nm:'พายุใบมีด',i:'👑',every:4,n:8,pct:.5}],
clones:[['เงาคม','👥',['dmg','*',.08,3],['@ignite',.1,2],{fx:'execute',nm:'เงาปลิดชีพ',i:'💀',hp:.3,m:1.6}],
  ['เงาเพิ่ม','➕',['count','+',1,2],['cd','c',.05,2],{fx:'shards',nm:'มีดเงาแตก',i:'✨',on:'hit',ch:.15,n:2,pct:.4}],
  ['เงามืด','🌑',['@shock',.05,3],['@chill',.03,2],{fx:'burst',nm:'เงาระเบิด',i:'💥',r:40,pct:.35}],
  {fx:'vsStun',nm:'เงาไล่ล่า',i:'👑',m:1.5}],
smoke:[['ควันพิษ','💨',['dmg','*',.08,3],['stun','+',.1,2],{fx:'vsStun',nm:'ซ้ำในควัน',i:'💢',m:1.6}],
  ['ควันกว้าง','⭕',['r','*',.06,3],['slow','+',.04,2],{fx:'echo',nm:'ควันระลอกสอง',i:'🔁',every:2}],
  ['ควันไว','⏱️',['cd','c',.05,3],['@ignite',.15,2],{fx:'chill',nm:'ควันเยือกแข็ง',i:'❄️',ch:.3,t:.8}],
  {fx:'trail',nm:'ทุ่งควันพิษ',i:'👑',kind:'poison',r:70,pct:.2,dur:4}]};
const TF_COST=[0,1,2,4], TF_CROWN=6;

/* ---- node list of a tree (cached) ---- */
const TF_CACHE=Object.create(null);
function tfNumText(k,op,per,l){ const n=TF_KN[k]||k, v=per*l;
  if(op==='c') return n+' −'+tfPc(v);
  if(op==='*') return TF_REL[k]?n+' ×'+tfN(1+v)+' (คูณค่าเดิม)':n+' '+(v<0?'−':'+')+tfPc(Math.abs(v));
  return n+' '+(v<0?'−':'+')+(TF_PCTK[k]?tfPc(Math.abs(v)):TF_SECK[k]?tfN(Math.abs(v))+' วิ':tfN(Math.abs(v))); }
function tfNodes(id){
  if(typeof id!=='string') return []; if(TF_CACHE[id]) return TF_CACHE[id]; const T=svHas(TFD,id)?TFD[id]:null; if(!T) return (TF_CACHE[id]=[]);
  const out=[];
  T.slice(0,3).forEach((br,b)=>{ const L='ABC'[b];
    [br[2],br[3]].forEach((x,j)=>{ const t=j+1, proc=typeof x[0]==='string'&&x[0][0]==='@';
      const nd={id:L+t, b, t, bn:br[0], bi:br[1], cost:TF_COST[t], max:proc?x[2]:x[3]};
      if(proc){ const fx=x[0].slice(1), D=TFX[fx]; nd.kind='proc'; nd.fx=fx; nd.pk=D.pk||'ch'; nd.per=x[1]; nd.p=Object.assign({},D,x[3]||{}); nd.n=D.n||fx; nd.i=br[1]; }
      else { nd.kind='num'; nd.k=x[0]; nd.op=x[1]; nd.per=x[2]; nd.n=(TF_KN[x[0]]||x[0]); nd.i=br[1]; }
      out.push(nd); });
    const sp=br[4]; out.push({id:L+'3', b, t:3, bn:br[0], kind:'fx', fx:sp.fx, p:sp, n:sp.nm, i:sp.i, cost:TF_COST[3], max:1}); });
  const k=T[3]; out.push({id:'K', b:-1, t:4, kind:'fx', fx:k.fx, p:k, n:k.nm, i:k.i||'👑', cost:TF_CROWN, max:1, crown:true});
  return (TF_CACHE[id]=out); }
function tfNode(id,nid){ return tfNodes(id).find(n=>n.id===nid)||null; }
// effect text of node nd at level l (l ≥ 1)
function tfText(nd,l){
  if(nd.kind==='num') return tfNumText(nd.k,nd.op,nd.per,l);
  if(nd.kind==='proc') return TFX[nd.fx].d(Object.assign({},nd.p,{[nd.pk]:nd.per*l}));
  return TFX[nd.fx].d(nd.p); }

/* ---- rune points + rules (character side) ---- */
function tfOf(ch,id){ return ch&&ch.tr&&svHas(ch.tr,id)&&ch.tr[id]||{}; }
function tfLv(ch,id,nid){ return tfOf(ch,id)[nid]|0; }
function tfSpentOne(ch,id){ let n=0; const t=tfOf(ch,id); for(const nd of tfNodes(id)) n+=(t[nd.id]|0)*nd.cost; return n; }
function tfResetGain(ch,id){ return tfSpentOne(ch,id)+(typeof slSpentTo==='function'&&ch&&ch.sl&&svHas(ch.sl,id)?slSpentTo(ch.sl[id]|0):0); }
function tfSpent(ch){ let n=0; for(const id in (ch&&ch.tr)||{}) n+=tfSpentOne(ch,id); return n+(typeof slSpent==='function'?slSpent(ch):0); }   // + starting Lv (28)
function tfTotal(ch){ return ch?Math.max(0,ch.lv|0)+Math.max(0,ch.rb|0):0; }   // 1 rune point per Base Lv + bought runes moved here (28)
function tfFree(ch){ return Math.max(0,tfTotal(ch)-tfSpent(ch)); }
function tfSpecials(ch,id){ return ['A3','B3','C3'].filter(n=>tfLv(ch,id,n)>0).length; }
// requirements of node nd of skill id → [{t, ok}]
function tfReqs(ch,id,nd){
  const r=(ch&&ch.sk||{})[id]|0, out=[], L=n=>tfLv(ch,id,n), name=n=>{ const x=tfNode(id,n); return x?x.n:n; };
  if(nd.crown){ out.push({t:'เลื่อนอาชีพแล้ว', ok:!!(ch&&ch.job)}); out.push({t:'ลำต้น ★5', ok:r>=5});
    out.push({t:'ความพิเศษชั้น 3 อย่างน้อย 2 อย่าง (มี '+tfSpecials(ch,id)+')', ok:tfSpecials(ch,id)>=2}); return out; }
  const L0='ABC'[nd.b];
  if(nd.t===1) out.push({t:'ลำต้น ★2', ok:r>=2});
  if(nd.t===2){ out.push({t:'ลำต้น ★4', ok:r>=4}); const p=tfNode(id,L0+'1'); out.push({t:name(L0+'1')+' เต็ม ('+p.max+' ขั้น)', ok:L(L0+'1')>=p.max});
    if(nd.b===1) out.push({t:name('A1')+' ขั้น 2 (ข้ามสาย)', ok:L('A1')>=2}); }
  if(nd.t===3){ const p=tfNode(id,L0+'2'); out.push({t:name(L0+'2')+' เต็ม ('+p.max+' ขั้น)', ok:L(L0+'2')>=p.max});
    if(nd.b===1) out.push({t:name('A2')+' ขั้น 1 (ข้ามสาย)', ok:L('A2')>=1}); }
  return out; }
function tfWhy(ch,id,nid){
  if(!ch) return 'ไม่มีตัวละคร'; if(typeof pgRO==='function'&&pgRO()) return 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้';
  const nd=tfNode(id,nid); if(!nd) return 'ไม่พบโหนดนี้';
  if(typeof pgSkillPool==='function'&&pgSkillPool(ch).indexOf(id)<0) return 'สกิลนี้ยังใช้ไม่ได้';
  if(tfLv(ch,id,nid)>=nd.max) return 'เต็มแล้ว';
  const miss=tfReqs(ch,id,nd).find(q=>!q.ok); if(miss) return 'ต้อง: '+miss.t;
  const w=typeof shopWallet==='function'?shopWallet():0;
  if(tfFree(ch)+w<nd.cost) return 'แต้มรูนไม่พอ (ต้องใช้ '+nd.cost+' มี '+tfFree(ch)+(w?' + กระเป๋า '+w:'')+')';
  return ''; }
function tfBuy(ch,id,nid){
  ch=typeof pgFresh==='function'?pgFresh(ch):ch; if(!ch||tfWhy(ch,id,nid)!=='') return false;
  const nd=tfNode(id,nid); if(tfFree(ch)<nd.cost&&!(typeof shopFund==='function'&&shopFund(ch,nd.cost-tfFree(ch)))) return false;   // bought runes from the wallet
  if(!ch.tr) ch.tr={}; const t=ch.tr[id]||(ch.tr[id]={}); t[nid]=(t[nid]|0)+1;
  if(typeof pgSave==='function') pgSave(ch,'tree',true); return true; }
// reset one tree: same rules as the skill reset (free below Lv 20 · one free reset per character · then a ม้วนลืมเลือน)
function tfResetWay(ch){ if((ch.lv|0)<BAL.RESET.freeBelow) return 'free'; return ch.resets&&ch.resets.trFree?'freeOnce':'scroll'; }
function tfReset(ch,id,o){
  ch=typeof pgFresh==='function'?pgFresh(ch):ch; if(!ch||(typeof pgRO==='function'&&pgRO())||!tfResetGain(ch,id)) return false;
  const way=tfResetWay(ch);
  if(way==='scroll'){ if(!(o&&o.scroll)||!(typeof invRemove==='function'&&invRemove(ch,'u_forget',1))) return false; }
  if(way==='freeOnce') ch.resets.trFree=0;
  if(ch.tr) delete ch.tr[id]; if(ch.sl) delete ch.sl[id]; if(typeof pgSave==='function') pgSave(ch,'resetTree',true); return true; }   // the tree and its starting Lv
// keep only what the rules allow (save load · after resetSkills · prepareRun): nodes in tree order whose requirements hold with
// the nodes kept so far · then whole trees dropped from the last until the spend fits the rune points (tester r1 F1/F2)
function tfSanitize(ch){ if(!ch) return ch;
  if(ch.sl){ const sl={}; for(const id of Object.keys(ch.sl)){ const v=ch.sl[id]|0, r=(ch.sk||{})[id]|0; if(svHas(SK,id)&&v>=2&&r>=2) sl[id]=Math.min(v,r); } ch.sl=sl; }
  if(!ch.tr) ch.tr={}; const tmp={sk:ch.sk||{}, job:ch.job, lv:ch.lv, tr:{}}, out={};
  for(const id of Object.keys(ch.tr)){ const t=ch.tr[id]; if(!t||!TFD[id]||!svHas(TFD,id)) continue; tmp.tr[id]={};
    for(const nd of tfNodes(id)){ const want=Math.min(nd.max,t[nd.id]|0); for(let l=0;l<want;l++){ if(!tfReqs(tmp,id,nd).every(q=>q.ok)) break; tmp.tr[id][nd.id]=l+1; } }
    if(Object.keys(tmp.tr[id]).length) out[id]=tmp.tr[id]; else delete tmp.tr[id]; }
  const ids=Object.keys(out), sls=Object.keys(ch.sl||{}), over=()=>tfSpent({tr:out, sl:ch.sl})>tfTotal(ch);
  while(sls.length&&over()) delete ch.sl[sls.pop()];                   // starting Lv first (the dearer, simpler loss) · then whole trees
  while(ids.length&&over()) delete out[ids.pop()];
  ch.tr=out; return ch; }
// run copy (prepareRun): only skills of the character's pool
function tfRunTree(ch){ const o={}; ch=tfSanitize(JSON.parse(JSON.stringify({sk:ch.sk, job:ch.job, lv:ch.lv, rb:ch.rb|0, sl:ch.sl||{}, tr:ch.tr||{}, cls:ch.cls}))); const pool=typeof pgSkillPool==='function'?pgSkillPool(ch):Object.keys(ch.tr||{});
  for(const id of pool){ const t=tfOf(ch,id); if(Object.keys(t).length) o[id]=Object.assign({},t); } return o; }

/* ---- in-run: numbers + effects of one skill (called from sxMods) ---- */
function tfMerge(F,fx,p){ const o=F[fx]||(F[fx]={});
  for(const k in p){ if(typeof p[k]==='function'||k==='pk'||k==='fx'||k==='nm'||k==='i'||k==='d'||(k==='n'&&typeof p[k]!=='number')) continue; const v=p[k];
    if(k==='ch') o.ch=Math.min(1,(o.ch||0)+v); else if(fx==='leech'&&k==='pct') o.pct=(o.pct||0)+v; else if(typeof v==='number') o[k]=Math.max(o[k]||0,v); else o[k]=v; } }
function tfApply(p,s,add,mul){
  const t=p.tree&&p.tree[s.id]; delete s.fx; if(!t) return;
  const F={};
  for(const nd of tfNodes(s.id)){ const l=t[nd.id]|0; if(!l) continue;
    if(nd.kind==='num'){ const k=nd.op==='c'?'cd':nd.k;
      if(nd.op==='+') add[k]=(add[k]||0)+nd.per*l; else mul[k]=(mul[k]||1)*(1+(nd.op==='c'?-1:1)*nd.per*l); }
    else if(nd.kind==='proc') tfMerge(F,nd.fx,Object.assign({},nd.p,{[nd.pk]:nd.per*l}));
    else if(nd.fx==='mod'){ for(const k in nd.p.add||{}) add[k]=(add[k]||0)+nd.p.add[k]; for(const k in nd.p.mul||{}) mul[k]=(mul[k]||1)*(1+nd.p.mul[k]); }
    else tfMerge(F,nd.fx,nd.p); }
  if(s.def.type==='passive'){ for(const k in F) if(TF_GLOB[k]){ p.tfg=p.tfg||{}; tfMerge(p.tfg,k,F[k]); } return; }   // passives: their effects ride every hit
  if(Object.keys(F).length) s.fx=F; }
function tfFinish(p){ if(p.tfg&&!Object.keys(p.tfg).length) delete p.tfg; p.tf=!!(p.tfg||p.skills.some(s=>s.fx)); if(!p.tf) delete p.tf; }

/* ---- in-run hooks (core calls them only when P.tf) ---- */
const TF_CAP=14;                                                        // effect spawns per frame (bursts, shards, zones)
function tfBase(s){ return pv(s,'dmg')||pv(s,'nova')||pv(s,'trap')||pv(s,'heal')||20; }
function tfICD(s,k,t){ const m=s.tfI||(s.tfI={}); if((m[k]||-1)>G.t) return false; m[k]=G.t+t; return true; }
function tfRoom(){ if((G.tfN|0)>=TF_CAP) return false; G.tfN=(G.tfN|0)+1; return true; }
function tfSets(s){ return s&&s.fx?(P.tfg?[s.fx,P.tfg]:[s.fx]):(P.tfg?[P.tfg]:[]); }
// damage multiplier before the hit (execute · vsStun)
function tfPre(e,s){ let m=1;
  for(const F of tfSets(s)){
    if(F.execute&&e.hp<e.maxHp*F.execute.hp) m*=F.execute.m;
    if(F.vsStun&&(e.stunT>0||e.freezeT>0)) m*=F.vsStun.m; }
  return m; }
function tfBolt(x,y,a,dmg,s,shape,life){ G.projs.push({x,y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,r:6,dmg,pierce:1,life:life||.6,max:life||.6,knock:60,explode:0,homing:0,crit:0,
  shape:shape||'bolt',c:s.def.c,src:s,burn:0,hit:null,tg:null,dead:false,t:0,fxd:true}); }
// after the hit: base = the hit's number before might (fx damage goes through damageEnemy again, so might counts once)
function tfHit(e,s,base,dealt){
  const dead=e.dead;
  for(const F of tfSets(s)){
    if(dead){
      if(F.burst&&tfRoom()){ const r=F.burst.r*P.area, d=base*F.burst.pct;
        for(const q of query(e.x,e.y,r+60)){ if(q.dead||q===e) continue; if((q.x-e.x)**2+(q.y-e.y)**2>(r+q.r)**2) continue; damageEnemy(q,d,s,{fxd:true,quiet:true,knock:80,ox:e.x,oy:e.y}); }
        G.fx.push({k:'ring',x:e.x,y:e.y,r0:r*.3,r1:r,t:0,dur:.28,c:s?s.def.c:'#ffd08a',w:6,dead:false}); }
      if(F.feast) healP(F.feast.amt);
      if(F.shards&&F.shards.on==='kill'&&Math.random()<(F.shards.ch||1)&&tfRoom()){ const n=F.shards.n, a0=Math.random()*TAU;
        for(let i=0;i<n;i++) tfBolt(e.x,e.y,a0+i*TAU/n,base*F.shards.pct,s,'dagger',.45); } }
    else {
      if(F.shock&&!e.boss&&Math.random()<F.shock.ch) e.stunT=Math.max(e.stunT,F.shock.t||.4);
      if(F.chill&&!e.boss&&Math.random()<F.chill.ch) e.freezeT=Math.max(e.freezeT,F.chill.t||.8);
      if(F.ignite&&Math.random()<F.ignite.ch){ const B=G.tfBurn||(G.tfBurn=[]), d=base*(F.ignite.pct||.25), t=F.ignite.t||3;
        const o=B.find(x=>x.e===e); if(o){ o.d=Math.max(o.d,d); o.t=Math.max(o.t,t); } else if(B.length<160) B.push({e,s,d,t,nt:.5}); }
      if(F.pull&&tfICD(s||P,'pull',.25)){ const r=F.pull.r*P.area;
        for(const q of query(e.x,e.y,r+60)){ if(q.dead||q.boss||q===e) continue; const dx=e.x-q.x, dy=e.y-q.y, d=Math.hypot(dx,dy); if(d>r||d<1) continue; const f=220/Math.max(.5,q.mass); q.kx+=dx/d*f; q.ky+=dy/d*f; } } }
    if(F.hitboom&&s&&tfICD(s,'hitboom',.05)&&tfRoom()){ const r=F.hitboom.r*P.area, d=base*F.hitboom.pct;
      for(const q of query(e.x,e.y,r+60)){ if(q.dead||q===e) continue; if((q.x-e.x)**2+(q.y-e.y)**2>(r+q.r)**2) continue; damageEnemy(q,d,s,{fxd:true,quiet:true,stun:.15}); }
      G.fx.push({k:'ring',x:e.x,y:e.y,r0:6,r1:r,t:0,dur:.22,c:'#fff27a',w:5,dead:false}); }
    if(F.leech&&dealt>0) healP(dealt*F.leech.pct);
    if(F.trail&&s&&tfICD(s,'trail',.35)&&G.zones.reduce((n,z)=>n+(z.fxd&&!z.drip?1:0),0)<12&&tfRoom()) addZone({x:e.x,y:e.y,r:F.trail.r*P.area,dur:F.trail.dur,tick:.5,dmg:base*F.trail.pct,slow:F.trail.slow||0,kind:F.trail.kind||'fire',src:s,fxd:true});
    if(F.shards&&F.shards.on!=='kill'&&s&&Math.random()<F.shards.ch&&tfICD(s,'shards',.1)&&tfRoom()){ const n=F.shards.n, a0=Math.random()*TAU;
      for(let i=0;i<n;i++) tfBolt(e.x,e.y,a0+i*TAU/n,base*F.shards.pct,s,'dagger',.45); } } }
// a skill cast (detected by tfRun) → echo / radial / mend
function tfCast(s){ const F=s.fx; if(!F) return; s.tfC=(s.tfC|0)+1;
  if(F.mend) healP(P.maxHp*F.mend.pct);
  if(F.radial&&s.tfC%F.radial.every===0){ const n=F.radial.n, a0=Math.random()*TAU, d=tfBase(s)*F.radial.pct;
    for(let i=0;i<n;i++) tfBolt(P.x,P.y-6,a0+i*TAU/n,d,s,'bolt',.7);
    G.fx.push({k:'ring',x:P.x,y:P.y,r0:10,r1:70,t:0,dur:.25,c:s.def.c,w:5,follow:true,dead:false}); }
  if(F.echo&&s.tfC%F.echo.every===0&&TF_ECHO[s.def.type]) later(.3,()=>{ if(!P||!G||G.over||P.skills.indexOf(s)<0) return;
    const c=s.cdT; s.cdT=0; try{ BEH[s.def.type](s,0); } finally{ s.cdT=c; } }); }
const TF_ECHO={proj:1, swing:1, nova:1, strike:1, zone:1, chain:1, heal:1, multi:1, spikes:1};
// the skill loop of world update when the run has tree effects: casts are seen as a cooldown restart · burns tick here
function tfRun(dt){
  G.tfN=0;
  for(const s of P.skills){
    if(!s.fx){ BEH[s.def.type](s,dt); continue; }
    s.tfW=true; s.tfK=false; try{ BEH[s.def.type](s,dt); } finally{ s.tfW=false; }   // a real cast asks cdOf for its cooldown (15 cdOf sets s.tfK)
    if(s.tfK) tfCast(s); }
  const B=G.tfBurn; if(B&&B.length){ for(const b of B){ b.t-=dt; b.nt-=dt; if(b.e.dead||b.t<=0){ b.dead=true; continue; }
      if(b.nt<=0){ b.nt=.5; damageEnemy(b.e,b.d,b.s,{fxd:true,quiet:true});
        if(!G.auto) part({x:b.e.x+rand(-5,5),y:b.e.y-b.e.r*.6,vx:rand(-8,8),vy:rand(-50,-25),life:.45,s:2.5,c:'#ff9a3a',g:-10,drag:1,k:'sq',add:true}); } }
    G.tfBurn=B.filter(b=>!b.dead); } }
// chain fork (BEH.chain calls it after bounce `at`): n sub-chains of b bounces at 70 % from the enemy just hit
function tfFork(s,from,hit,dmg,jump){ const F=s.fx.fork;
  for(let k=0;k<F.n;k++){ let cur=from; const pts=[[from.x,from.y-from.r*.4]];
    for(let b=0;b<F.b;b++){ let nx=null, bd=jump*jump;
      for(const e of query(cur.x,cur.y,jump+60)){ if(e.dead||hit.indexOf(e.id)>=0) continue; const d=(e.x-cur.x)**2+(e.y-cur.y)**2; if(d<bd){ bd=d; nx=e; } }
      if(!nx) break; hit.push(nx.id); pts.push([nx.x,nx.y-nx.r*.4]); damageEnemy(nx,dmg*.7,s,{knock:40,stun:.05}); cur=nx; }
    if(pts.length>1) G.fx.push({k:'chain',pts,t:0,dur:.22,c:s.def.c,paths:null,jt:-1,dead:false}); } }
