/* ================= 26a-mastery.js · lane B · stat cards = mastery (docs/PROPOSAL-mastery.md) · character runs only ================= */
// Every stat card: (a) a small general effect (sxStats in 26) · (b) mastery +1 for every skill whose main stat it is (SX.main).
// Mastery L of a skill = cards of its main stat + floor(permanent stat / 5) + the account upgrade 🧬 (start mastery).
// Each level: power +4 % (to 35, then +1 %) and a little size · tiers (MX_T) add tricks through the same s.mod / s.fx paths
// the skill tree uses (27), so every hook (burst, ignite, trail, echo …) is shared. Every class skill has a ladder now (the
// old 5-card milestones SX.ms only serve skills without one). Classic never sets P.sx → none of this runs there (golden).
const MX={pow:.04, powOver:.01, cap:35};
// general effect of one card, shown on the cards (character runs)
const MX_CARD={
  STR:'HP +2% · DEF +1 · สกิลที่ใช้ STR ชำนาญขึ้น (แรง ขนาด ลูกเล่น)',
  VIT:'HP +4% · ฟื้น +0.25/วิ · DEF +0.5 · สกิลที่ใช้ VIT ชำนาญขึ้น',
  AGI:'เดิน +3% · หลบ +0.8% · โจมตีเร็ว +1% · สกิลที่ใช้ AGI ชำนาญขึ้น',
  DEX:'โจมตีเร็ว +3% · ระยะโจมตี +4% · เดิน +1% · สกิลที่ใช้ DEX ชำนาญขึ้น',
  INT:'พื้นที่ +2% · ระยะเวลา +2% · เวทที่ใช้ INT ชำนาญขึ้น (แรง ขนาด ลูกเล่น)',
  LUK:'คริ +1.5% · แรงคริ +3% · ดูดของ +4% · ดรอป +1% (สูงสุด +30%) · สกิลที่ใช้ LUK ชำนาญขึ้น'};
// card names in character runs (STR no longer adds damage there, so it is not "attack")
const MX_SN={STR:'พลังกาย'};
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
// ---- round 2–3: swordsman · archer · cleric · thief (every tier uses only the skill's own numbers + the 27 effect library) ----
Object.assign(MX_T,{
slash:[
  [6,'คมดาบเรืองแสง · ระยะ +10%',{mul:{range:1.1}}],
  [10,'มุมฟันกว้าง +25%',{mul:{arc:1.25}}],
  [15,'แผลลึก (เลือดไหล 3 วิ)',{fx:{ignite:{ch:.3, pct:.15, t:3}}}],
  [20,'คลื่นดาบพุ่งจากปลายดาบ',{fx:{shards:{on:'hit', ch:.35, n:2, pct:.4}}}],
  [25,'+1 ครั้งฟัน',{add:{count:1}}],
  [30,'เป้าเลือดต่ำกว่า 25% แรง ×1.5',{fx:{execute:{hp:.25, m:1.5}}}],
  [35,'ร่างสุดท้าย ดาบพิฆาต · ฟันซ้ำทุก 2 ครั้ง',{mul:{range:1.15}, fx:{echo:{every:2}}}]],
slam:[
  [6,'แรงกระแทก +20%',{mul:{knock:1.2}}],
  [10,'วงกว้าง +10%',{mul:{r:1.1}}],
  [15,'มึน +0.3 วิ',{add:{stun:.3}}],
  [20,'ศัตรูที่ตายระเบิดเศษหิน',{fx:{burst:{r:50, pct:.3}}}],
  [25,'ทุบซ้ำทุก 3 ครั้ง',{fx:{echo:{every:3}}}],
  [30,'เป้าที่มึนโดนแรง ×1.4',{fx:{vsStun:{m:1.4}}}],
  [35,'ร่างสุดท้าย แผ่นดินไหว · วง ×1.3',{mul:{r:1.3, dmg:1.1}}]],
blades:[
  [6,'ดาบวนเร็ว +10%',{mul:{spin:1.1}}],
  [10,'ดาบใหญ่ +15%',{mul:{size:1.15}}],
  [15,'+1 เล่ม',{add:{count:1}}],
  [20,'โดนแล้วมึนบางครั้ง',{fx:{shock:{ch:.15, t:.2}}}],
  [25,'วงกว้าง +15%',{mul:{r:1.15}}],
  [30,'+1 เล่ม',{add:{count:1}}],
  [35,'ร่างสุดท้าย พายุดาบวิญญาณ · ดูดเลือด 3%',{mul:{dmg:1.2}, fx:{leech:{pct:.03}}}]],
bulwark:[
  [6,'โล่หนา +15%',{mul:{absorb:1.15}}],
  [10,'ระเบิดโล่กว้าง +15%',{mul:{r:1.15}}],
  [15,'ตั้งโล่แล้วฟื้น HP 3%',{fx:{mend:{pct:.03}}}],
  [20,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [25,'โล่หนา +25%',{mul:{absorb:1.25}}],
  [30,'ระเบิดโล่ทำให้มึน',{fx:{shock:{ch:.5, t:.5}}}],
  [35,'ร่างสุดท้าย ป้อมปราการ · ระเบิด ×1.5',{mul:{nova:1.5, absorb:1.3}}]],
lance:[
  [6,'หอกพุ่งเร็ว +15%',{mul:{speed:1.15}}],
  [10,'ระยะพุ่ง +15%',{mul:{life:1.15}}],
  [15,'หอกใหญ่ +20%',{mul:{size:1.2}}],
  [20,'+1 หอก',{add:{count:1}}],
  [25,'แทงตายแล้วระเบิดเป็นวง',{fx:{burst:{r:60, pct:.4}}}],
  [30,'กระแทก +30% · มึนบางครั้ง',{mul:{knock:1.3}, fx:{shock:{ch:.2, t:.3}}}],
  [35,'ร่างสุดท้าย หอกสวรรค์ · พุ่งซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
valor:[
  [6,'รัศมี +10%',{mul:{r:1.1}}],
  [10,'ชะลอ +5%',{add:{slow:.05}}],
  [15,'ถี่ขึ้น 15%',{mul:{tick:.87}}],
  [20,'ศัตรูในวงติดไฟศักดิ์สิทธิ์',{fx:{ignite:{ch:.1, pct:.3, t:3}}}],
  [25,'รัศมี +15%',{mul:{r:1.15}}],
  [30,'ดูดเลือด 2%',{fx:{leech:{pct:.02}}}],
  [35,'ร่างสุดท้าย ธงผู้พิทักษ์ · แรง ×1.4',{mul:{dmg:1.4, r:1.1}}]],
cyclone:[
  [6,'ระยะเหวี่ยง +10%',{mul:{range:1.1}}],
  [10,'แรงกระแทก +25%',{mul:{knock:1.25}}],
  [15,'ดูดศัตรูเข้าหา',{fx:{pull:{r:110}}}],
  [20,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [25,'หมุนซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}],
  [30,'ศัตรูที่ตายระเบิด',{fx:{burst:{r:55, pct:.35}}}],
  [35,'ร่างสุดท้าย ทอร์นาโดเหล็ก · ระยะ ×1.3',{mul:{range:1.3, dmg:1.2}}]],
frenzy:[
  [6,'โทสะ +10%',{mul:{rage:1.1}}],
  [10,'ดูดเลือด +15%',{mul:{steal:1.15}}],
  [15,'โทสะ +15%',{mul:{rage:1.15}}],
  [20,'ดูดเลือด +20%',{mul:{steal:1.2}}],
  [25,'โทสะ +15%',{mul:{rage:1.15}}],
  [30,'ดูดเลือด +25%',{mul:{steal:1.25}}],
  [35,'ร่างสุดท้าย เลือดเดือด · โทสะ ×1.3',{mul:{rage:1.3}}]],
arrow:[
  [6,'ลูกศรเร็ว +15%',{mul:{speed:1.15}}],
  [10,'ทะลุ +1',{add:{pierce:1}}],
  [15,'ระยะ +15%',{mul:{life:1.15}}],
  [20,'+1 ลูก',{add:{count:1}}],
  [25,'ศัตรูที่ตายแตกเป็นเศษศร',{fx:{shards:{on:'kill', ch:1, n:3, pct:.3}}}],
  [30,'หัวศรเหล็กกล้า แรง +20%',{mul:{dmg:1.2}}],
  [35,'ร่างสุดท้าย ศรพายุ · ยิงซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
spread:[
  [6,'+1 ลูกในพัด',{add:{count:1}}],
  [10,'ระยะ +15%',{mul:{life:1.15}}],
  [15,'ทะลุ +1',{add:{pierce:1}}],
  [20,'+2 ลูก',{add:{count:2}}],
  [25,'โดนแล้วมึนบางครั้ง',{fx:{shock:{ch:.1, t:.25}}}],
  [30,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [35,'ร่างสุดท้าย ฝนศรพัด · ยิงซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
rain:[
  [6,'ลูกศรตกเพิ่ม 1 ดอก',{add:{hits:1}}],
  [10,'วงกว้าง +15%',{mul:{r:1.15}}],
  [15,'+1 จุด',{add:{count:1}}],
  [20,'ศรไฟ ติดไฟ',{fx:{ignite:{ch:.25, pct:.2, t:3}}}],
  [25,'+2 ดอก',{add:{hits:2}}],
  [30,'ตกซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}],
  [35,'ร่างสุดท้าย ห่าศรมรณะ · แรง ×1.3 วง ×1.3',{mul:{dmg:1.3, r:1.3}}]],
trap:[
  [6,'กับดักใหญ่ +15%',{mul:{r:1.15}}],
  [10,'อยู่นาน +25%',{mul:{dur:1.25}}],
  [15,'+1 กับดัก',{add:{count:1}}],
  [20,'ระเบิดแล้วทิ้งไฟ',{fx:{trail:{kind:'fire', r:50, pct:.2, dur:3}}}],
  [25,'แรงระเบิดทำให้มึน',{fx:{shock:{ch:.5, t:.5}}}],
  [30,'+1 กับดัก',{add:{count:1}}],
  [35,'ร่างสุดท้าย ทุ่งระเบิด · แรง ×1.4',{mul:{trap:1.4, r:1.2}}]],
hawk:[
  [6,'เหยี่ยวโฉบถี่ขึ้น 10%',{mul:{cd:.9}}],
  [10,'กรงเล็บกว้าง +15%',{mul:{r:1.15}}],
  [15,'โฉบแล้วมึนบางครั้ง',{fx:{shock:{ch:.25, t:.3}}}],
  [20,'+1 เหยี่ยว',{add:{count:1}}],
  [25,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [30,'กรงเล็บฉีก (เลือดไหล)',{fx:{ignite:{ch:.3, pct:.25, t:3}}}],
  [35,'ร่างสุดท้าย พญาเหยี่ยวลม · +1 เหยี่ยว แรง ×1.3',{add:{count:1}, mul:{dmg:1.3}}]],
arrownova:[
  [6,'+2 ลูก',{add:{count:2}}],
  [10,'ระยะ +15%',{mul:{life:1.15}}],
  [15,'ทะลุ +1',{add:{pierce:1}}],
  [20,'+4 ลูก',{add:{count:4}}],
  [25,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [30,'ยิงซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}],
  [35,'ร่างสุดท้าย วงศรสุริยา · แรง ×1.3 ทะลุ +2',{add:{pierce:2}, mul:{dmg:1.3}}]],
deadeye:[
  [6,'คริ +5%',{add:{crit:.05}}],
  [10,'ลำแสงใหญ่ +20%',{mul:{size:1.2}}],
  [15,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [20,'เป้าเลือดต่ำกว่า 30% แรง ×1.6',{fx:{execute:{hp:.3, m:1.6}}}],
  [25,'คริ +10%',{add:{crit:.1}}],
  [30,'+1 ลำแสง',{add:{count:1}}],
  [35,'ร่างสุดท้าย ศรมรณะ · ฆ่าแล้วระเบิด',{fx:{burst:{r:80, pct:.5}}}]],
blast:[
  [6,'ระเบิดกว้าง +10%',{mul:{explode:1.1}}],
  [10,'ระเบิดสองระลอก',{look:{boom2:1}}],
  [15,'+1 ลูก',{add:{count:1}}],
  [20,'ทะลุ 1 ตัวก่อนระเบิด',{look:{pass:1, passBoom:1}}],
  [25,'ระเบิดแล้วทิ้งไฟ',{fx:{trail:{kind:'fire', r:45, pct:.2, dur:2.5}}}],
  [30,'สุดระยะแตกเป็น 3 ลูก',{look:{split:3}}],
  [35,'ร่างสุดท้าย ศรถล่มฟ้า · ระเบิด ×1.4',{mul:{explode:1.4, dmg:1.2}}]],
holy:[
  [6,'ลูกแสงใหญ่ +15%',{mul:{size:1.15}}],
  [10,'ทะลุ +1',{add:{pierce:1}}],
  [15,'+1 ลูก',{add:{count:1}}],
  [20,'โดนแล้วแตกเป็นแสง 2 ลูก',{fx:{shards:{on:'hit', ch:.5, n:2, pct:.3}}}],
  [25,'ดูดเลือด 2%',{fx:{leech:{pct:.02}}}],
  [30,'แรง +20%',{mul:{dmg:1.2}}],
  [35,'ร่างสุดท้าย แสงสวรรค์ · ทะลุทุกตัว',{add:{pierce:98}}]],
heal:[
  [6,'ฟื้น +15%',{mul:{heal:1.15}}],
  [10,'วงแสงกว้าง +15%',{mul:{r:1.15}}],
  [15,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [20,'ฟื้นตาม HP สูงสุด +2%',{add:{healPct:.02}}],
  [25,'แสงทำให้ศัตรูมึน',{fx:{shock:{ch:.4, t:.4}}}],
  [30,'ร่ายซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}],
  [35,'ร่างสุดท้าย พรแห่งชีวิต · ฟื้น ×1.4',{mul:{heal:1.4, dmg:1.3}}]],
sacred:[
  [6,'รัศมี +10%',{mul:{r:1.1}}],
  [10,'ชะลอ 10%',{add:{slow:.1}}],
  [15,'ถี่ขึ้น 15%',{mul:{tick:.87}}],
  [20,'ศัตรูตายในวง ฟื้น HP 1',{fx:{feast:{amt:1}}}],
  [25,'รัศมี +15%',{mul:{r:1.15}}],
  [30,'ติดไฟศักดิ์สิทธิ์',{fx:{ignite:{ch:.1, pct:.3, t:3}}}],
  [35,'ร่างสุดท้าย วิหารแสง · แรง ×1.5',{mul:{dmg:1.5}}]],
cross:[
  [6,'วงกางเขน +10%',{mul:{r:1.1}}],
  [10,'ตกเร็วขึ้น 20%',{mul:{delay:.8}}],
  [15,'+1 กางเขน',{add:{count:1}}],
  [20,'มึนบางครั้ง',{fx:{shock:{ch:.3, t:.4}}}],
  [25,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [30,'ตกซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}],
  [35,'ร่างสุดท้าย กางเขนสวรรค์ · ฆ่าแล้วระเบิดแสง',{mul:{r:1.2}, fx:{burst:{r:70, pct:.5}}}]],
judgment:[
  [6,'+1 ลำแสง',{add:{count:1}}],
  [10,'วงกว้าง +10%',{mul:{r:1.1}}],
  [15,'ตกเร็วขึ้น 20%',{mul:{delay:.8}}],
  [20,'+2 ลำแสง',{add:{count:2}}],
  [25,'เป้าที่มึนโดนแรง ×1.4',{fx:{vsStun:{m:1.4}}}],
  [30,'ติดไฟศักดิ์สิทธิ์',{fx:{ignite:{ch:.3, pct:.25, t:3}}}],
  [35,'ร่างสุดท้าย วันพิพากษา · ตกซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
aegis:[
  [6,'เกราะหนา +15%',{mul:{absorb:1.15}}],
  [10,'คลื่นเกราะกว้าง +15%',{mul:{r:1.15}}],
  [15,'ตั้งเกราะแล้วฟื้น HP 4%',{fx:{mend:{pct:.04}}}],
  [20,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [25,'คลื่นเกราะทำให้มึน',{fx:{shock:{ch:.5, t:.5}}}],
  [30,'เกราะหนา +25%',{mul:{absorb:1.25}}],
  [35,'ร่างสุดท้าย ปีกเทวา · คลื่น ×1.5',{mul:{nova:1.5, absorb:1.3}}]],
fists:[
  [6,'หมัดไกล +10%',{mul:{range:1.1}}],
  [10,'มุมกว้าง +20%',{mul:{arc:1.2}}],
  [15,'หมัดเพลิง ติดไฟ',{fx:{ignite:{ch:.2, pct:.2, t:2.5}}}],
  [20,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [25,'คลื่นหมัดพุ่ง',{fx:{shards:{on:'hit', ch:.25, n:2, pct:.35}}}],
  [30,'ดูดเลือด 2%',{fx:{leech:{pct:.02}}}],
  [35,'ร่างสุดท้าย หมัดสุริยะ · +1 หมัด',{add:{count:1}, mul:{dmg:1.2}}]],
spheres:[
  [6,'ดวงไฟใหญ่ +15%',{mul:{size:1.15}}],
  [10,'หมุนเร็ว +10%',{mul:{spin:1.1}}],
  [15,'+1 ดวง',{add:{count:1}}],
  [20,'ติดไฟ',{fx:{ignite:{ch:.2, pct:.25, t:3}}}],
  [25,'วงกว้าง +15%',{mul:{r:1.15}}],
  [30,'+1 ดวง',{add:{count:1}}],
  [35,'ร่างสุดท้าย สุริยะจักร · ระเบิดเมื่อโดน',{fx:{hitboom:{r:40, pct:.3}}}]],
dagger:[
  [6,'มีดเร็ว +15%',{mul:{speed:1.15}}],
  [10,'คริ +5%',{add:{crit:.05}}],
  [15,'+1 มีด',{add:{count:1}}],
  [20,'ทะลุ +1',{add:{pierce:1}}],
  [25,'มีดอาบพิษ',{fx:{ignite:{ch:.3, pct:.2, t:3}}}],
  [30,'คริ +10%',{add:{crit:.1}}],
  [35,'ร่างสุดท้าย มีดเงาพันเล่ม · ปาซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
fan:[
  [6,'+2 ใบ',{add:{count:2}}],
  [10,'ระยะ +15%',{mul:{life:1.15}}],
  [15,'ทะลุ +1',{add:{pierce:1}}],
  [20,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [25,'+4 ใบ',{add:{count:4}}],
  [30,'ปาซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}],
  [35,'ร่างสุดท้าย พายุใบมีด · แรง ×1.3 ทะลุ +1',{add:{pierce:1}, mul:{dmg:1.3}}]],
venom:[
  [6,'หมอกกว้าง +10%',{mul:{r:1.1}}],
  [10,'อยู่นาน +25%',{mul:{dur:1.25}}],
  [15,'ชะลอ +10%',{add:{slow:.1}}],
  [20,'+1 หมอก',{add:{count:1}}],
  [25,'ศัตรูตายในหมอก ระเบิดพิษ',{fx:{burst:{r:60, pct:.4}}}],
  [30,'ถี่ขึ้น 20%',{mul:{tick:.83}}],
  [35,'ร่างสุดท้าย หมอกมรณะ · แรง ×1.25 วง ×1.2',{mul:{dmg:1.25, r:1.2}}]],
shadow:[
  [6,'หลบ +2%',{add:{dodge:.02}}],
  [10,'ระเบิดเงากว้าง +15%',{mul:{r:1.15}}],
  [15,'หลบ +3%',{add:{dodge:.03}}],
  [20,'ระเบิดเงา ×1.25',{mul:{nova:1.25}}],
  [25,'หลบ +3%',{add:{dodge:.03}}],
  [30,'ระเบิดเงากว้าง +20%',{mul:{r:1.2}}],
  [35,'ร่างสุดท้าย เงาไร้ตัวตน · หลบ +5% ระเบิด ×1.3',{add:{dodge:.05}, mul:{nova:1.3}}]],
phantom:[
  [6,'+1 เป้า',{add:{targets:1}}],
  [10,'คริ +5%',{add:{crit:.05}}],
  [15,'ระยะ +15%',{mul:{range:1.15}}],
  [20,'เป้าเลือดต่ำกว่า 30% แรง ×1.5',{fx:{execute:{hp:.3, m:1.5}}}],
  [25,'+2 เป้า',{add:{targets:2}}],
  [30,'ฟันซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}],
  [35,'ร่างสุดท้าย เงามรณะ · ฆ่าแล้วแตกเป็นมีด',{fx:{shards:{on:'kill', ch:1, n:4, pct:.4}}}]],
whirl:[
  [6,'ระยะ +10%',{mul:{range:1.1}}],
  [10,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [15,'ดูดเลือด 2%',{fx:{leech:{pct:.02}}}],
  [20,'+1 รอบ',{add:{count:1}}],
  [25,'ใบมีดพุ่งออก',{fx:{shards:{on:'hit', ch:.2, n:2, pct:.35}}}],
  [30,'ระยะ +15%',{mul:{range:1.15}}],
  [35,'ร่างสุดท้าย พายุมีดเงา · หมุนซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
clones:[
  [6,'ร่างเงาโจมตีถี่ +10%',{mul:{cd:.9}}],
  [10,'แรง +15%',{mul:{dmg:1.15}}],
  [15,'+1 ร่าง',{add:{count:1}}],
  [20,'ร่างเงาอาบพิษ',{fx:{ignite:{ch:.2, pct:.2, t:3}}}],
  [25,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [30,'+1 ร่าง',{add:{count:1}}],
  [35,'ร่างสุดท้าย กองทัพเงา · แรง ×1.3',{mul:{dmg:1.3}}]],
smoke:[
  [6,'ควันกว้าง +10%',{mul:{r:1.1}}],
  [10,'มึนนาน +0.2 วิ',{add:{stun:.2}}],
  [15,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [20,'ชะลอนานขึ้น 40%',{mul:{slowDur:1.4}}],
  [25,'ระเบิดควันซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}],
  [30,'เป้าที่มึนโดนแรง ×1.4',{fx:{vsStun:{m:1.4}}}],
  [35,'ร่างสุดท้าย ม่านควันมรณะ · วง ×1.4',{mul:{r:1.4, dmg:1.3}}]]});
// ---- the 30 character-only skills (CLASSES skx · docs/PROPOSAL-skill-trees.md §3): same 7 tiers, same rules ----
Object.assign(MX_T,{
flyblade:[
  [6,'ดาบใหญ่ขึ้น 15%',{mul:{size:1.15}}],
  [10,'บินไกลขึ้น 15%',{mul:{life:1.15}}],
  [15,'ดาบบินแรง +20%',{mul:{dmg:1.2}}],
  [20,'+1 เล่ม',{add:{count:1}}],
  [25,'คมดาบเฉือนเลือดไหล',{fx:{ignite:{ch:.3, pct:.2, t:3}}}],
  [30,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [35,'ร่างสุดท้าย ดาบพายุคืนรัง · ฆ่าแล้วแตกคลื่นดาบ',{mul:{dmg:1.15}, fx:{shards:{on:'kill', ch:1, n:3, pct:.35}}}]],
riposte:[
  [6,'วงสวนกว้าง +10%',{mul:{range:1.1}}],
  [10,'มึนนาน +0.15 วิ',{add:{stun:.15}}],
  [15,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [20,'สวนแล้วดูดเลือด 3%',{fx:{leech:{pct:.03}}}],
  [25,'แรงกระแทก +30%',{mul:{knock:1.3}}],
  [30,'เป้าที่มึนโดนแรง ×1.5',{fx:{vsStun:{m:1.5}}}],
  [35,'ร่างสุดท้าย สวนพันคม · คลื่นดาบรอบทิศทุกครั้งที่สวน',{fx:{radial:{every:1, n:8, pct:.5}}}]],
palisade:[
  [6,'วงหอกกว้าง +10%',{mul:{r:1.1}}],
  [10,'แทงถี่ขึ้น 15%',{mul:{tick:.87}}],
  [15,'ตั้งได้นานขึ้น 20%',{mul:{dur:1.2}}],
  [20,'แรงผลัก +40%',{mul:{rep:1.4}}],
  [25,'ปลายหอกมึนบางครั้ง',{fx:{shock:{ch:.15, t:.3}}}],
  [30,'แทงแรง +30%',{mul:{dmg:1.3}}],
  [35,'ร่างสุดท้าย ป้อมหอกเทวา · ศัตรูที่ตายระเบิด',{mul:{r:1.15}, fx:{burst:{r:55, pct:.5}}}]],
thrust:[
  [6,'แทงไกล +10%',{mul:{range:1.1}}],
  [10,'ปลายทวนกว้าง +20%',{mul:{size:1.2}}],
  [15,'แทงทะลวงเกราะ แรง +20%',{mul:{dmg:1.2}}],
  [20,'+1 จังหวะ',{add:{count:1}}],
  [25,'มึนบางครั้ง',{fx:{shock:{ch:.2, t:.3}}}],
  [30,'เป้าเลือดต่ำกว่า 30% แรง ×1.5',{fx:{execute:{hp:.3, m:1.5}}}],
  [35,'ร่างสุดท้าย ทวนสวรรค์ · แทงซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
bloodrite:[
  [6,'วงเลือดกว้าง +10%',{mul:{r:1.1}}],
  [10,'ดูดเลือดกลับ +20%',{mul:{drain:1.2}}],
  [15,'แรง +20%',{mul:{dmg:1.2}}],
  [20,'ศัตรูที่ตายระเบิดเลือด',{fx:{burst:{r:55, pct:.4}}}],
  [25,'สละ HP น้อยลง 25%',{mul:{cost:.75}}],
  [30,'เลือดเดือดติดเป้า (เลือดไหล)',{fx:{ignite:{ch:.3, pct:.25, t:3}}}],
  [35,'ร่างสุดท้าย พิธีโลหิต · ร่ายซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
chainaxe:[
  [6,'โซ่ยาวขึ้น 15%',{mul:{life:1.15}}],
  [10,'กระชากแรง +25%',{mul:{hook:1.25}}],
  [15,'ทะลุ +1',{add:{pierce:1}}],
  [20,'ขวานคมเลือดไหล',{fx:{ignite:{ch:.3, pct:.2, t:3}}}],
  [25,'+1 ขวาน',{add:{count:1}}],
  [30,'กระชากจนมึน',{fx:{shock:{ch:.2, t:.4}}}],
  [35,'ร่างสุดท้าย โซ่นรก · แรง ×1.3 ขว้างซ้ำทุก 2 ครั้ง',{mul:{dmg:1.3}, fx:{echo:{every:2}}}]],
gravorb:[
  [6,'แกนมืดหมุนวน · ดูดแรง +15%',{mul:{pull:1.15}}],
  [10,'ลอยนานขึ้น 20%',{mul:{dur:1.2}}],
  [15,'ยุบตัวแรง +25%',{mul:{boom:1.25}}],
  [20,'+1 ลูก',{add:{count:1}}],
  [25,'ยุบตัวแล้วแช่แข็งบางครั้ง',{fx:{chill:{ch:.15, t:.8}}}],
  [30,'วงระเบิดกว้าง +25%',{mul:{explode:1.25}}],
  [35,'ร่างสุดท้าย ดาวยุบ · แรง ×1.3 ศัตรูที่ตายระเบิด',{mul:{dmg:1.3}, fx:{burst:{r:60, pct:.4}}}]],
aquaring:[
  [6,'หยดน้ำใหญ่ +15%',{mul:{size:1.15}}],
  [10,'ชะลอ +5%',{add:{slow:.05}}],
  [15,'+1 หยด',{add:{count:1}}],
  [20,'คลื่นกว้างขึ้น 30%',{mul:{wave:1.3}}],
  [25,'น้ำเย็นจัด แช่แข็งบางครั้ง',{fx:{chill:{ch:.08, t:.8}}}],
  [30,'+1 หยด',{add:{count:1}}],
  [35,'ร่างสุดท้าย วงทะเลคลั่ง · แรง ×1.3 น้ำระเบิดเมื่อโดน',{mul:{dmg:1.3}, fx:{hitboom:{r:40, pct:.3}}}]],
comet:[
  [6,'หางไฟยาวขึ้น 25%',{mul:{drip:1.25}}],
  [10,'พุ่งเร็ว +15%',{mul:{speed:1.15}}],
  [15,'วงระเบิด +20%',{mul:{explode:1.2}}],
  [20,'+1 ดาวหาง',{add:{count:1}}],
  [25,'ติดไฟทุกตัวที่ชน',{fx:{ignite:{ch:.5, pct:.2, t:3}}}],
  [30,'แรง +25%',{mul:{dmg:1.25}}],
  [35,'ร่างสุดท้าย ดาวหางนิรันดร์ · ทิ้งหลุมลาวาตามทาง',{fx:{trail:{kind:'fire', r:50, pct:.25, dur:3}}}]],
rift:[
  [6,'ประตูเปิดนานขึ้น 15%',{mul:{dur:1.15}}],
  [10,'ยิงถี่ขึ้น 12%',{mul:{tick:.88}}],
  [15,'+1 ศรต่อชุด',{add:{shots:1}}],
  [20,'ศรดาวแตกกระจาย',{fx:{shards:{on:'hit', ch:.2, n:2, pct:.35}}}],
  [25,'แรง +25%',{mul:{dmg:1.25}}],
  [30,'+1 ประตู',{add:{count:1}}],
  [35,'ร่างสุดท้าย ประตูดารา · ศรดาวระเบิดเมื่อโดน',{fx:{hitboom:{r:40, pct:.35}}}]],
volcano:[
  [6,'พ่นลาวาถี่ขึ้น 12%',{mul:{tick:.88}}],
  [10,'ปะทุกว้าง +20%',{mul:{explode:1.2}}],
  [15,'ลาวาติดไฟ',{fx:{ignite:{ch:.4, pct:.2, t:3}}}],
  [20,'ปะทุนานขึ้น 25%',{mul:{dur:1.25}}],
  [25,'ปะทุแรง +30%',{mul:{boom:1.3}}],
  [30,'+1 ภูเขาไฟ',{add:{count:1}}],
  [35,'ร่างสุดท้าย ภูเขาไฟคลั่ง · ทิ้งหลุมลาวาที่ก้อนตก',{fx:{trail:{kind:'fire', r:45, pct:.25, dur:3}}}]],
leafblade:[
  [6,'+1 ใบ',{add:{count:1}}],
  [10,'บินไกลขึ้น 15%',{mul:{life:1.15}}],
  [15,'ชะลอ +6%',{add:{slow:.06}}],
  [20,'ใบมีดคมเลือดไหล',{fx:{ignite:{ch:.25, pct:.2, t:3}}}],
  [25,'+2 ใบ',{add:{count:2}}],
  [30,'แรง +25%',{mul:{dmg:1.25}}],
  [35,'ร่างสุดท้าย พายุใบไม้ · ใบที่โดนแตกเป็นใบเล็ก',{fx:{shards:{on:'hit', ch:.25, n:2, pct:.4}}}]],
ballista:[
  [6,'ยิงถี่ขึ้น 10%',{mul:{tick:.9}}],
  [10,'ทะลุ +1',{add:{pierce:1}}],
  [15,'ตั้งได้นานขึ้น 20%',{mul:{dur:1.2}}],
  [20,'+1 ลูกต่อชุด',{add:{shots:1}}],
  [25,'ลูกดอกตรึงมึนบางครั้ง',{fx:{shock:{ch:.12, t:.3}}}],
  [30,'แรง +25%',{mul:{dmg:1.25}}],
  [35,'ร่างสุดท้าย ป้อมปืนใหญ่ศร · ลูกระเบิดเมื่อโดน',{fx:{hitboom:{r:40, pct:.35}}}]],
netshot:[
  [6,'ตาข่ายกว้าง +10%',{mul:{explode:1.1}}],
  [10,'ตรึงนาน +20%',{mul:{hold:1.2}}],
  [15,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [20,'+1 ศร',{add:{count:1}}],
  [25,'ตัวที่ติดตาข่ายโดนแรง ×1.5',{fx:{vsStun:{m:1.5}}}],
  [30,'ตาข่ายกว้าง +20%',{mul:{explode:1.2}}],
  [35,'ร่างสุดท้าย ตาข่ายสายฟ้า · แรง ×1.5 ช็อตตัวข้าง ๆ',{mul:{dmg:1.5}, fx:{hitboom:{r:35, pct:.3}}}]],
wolf:[
  [6,'วิ่งกัดถี่ขึ้น 10%',{mul:{cd:.9}}],
  [10,'เขี้ยวแรง +15%',{mul:{dmg:1.15}}],
  [15,'+1 ตัว',{add:{count:1}}],
  [20,'กัดแล้วมึนบางครั้ง',{fx:{shock:{ch:.15, t:.3}}}],
  [25,'ชะลอ +10%',{add:{slow:.1}}],
  [30,'ดูดเลือด 2%',{fx:{leech:{pct:.02}}}],
  [35,'ร่างสุดท้าย ฝูงหมาป่าจันทรา · +1 ตัว แรง ×1.3',{add:{count:1}, mul:{dmg:1.3}}]],
gale:[
  [6,'คลื่นลมกว้าง +15%',{mul:{size:1.15}}],
  [10,'พัดแรง +20%',{mul:{knock:1.2}}],
  [15,'ชะลอ +8%',{add:{slow:.08}}],
  [20,'ไกลขึ้น 15%',{mul:{life:1.15}}],
  [25,'ลมคมกระจาย',{fx:{shards:{on:'hit', ch:.08, n:2, pct:.4}}}],
  [30,'+1 คลื่น',{add:{count:1}}],
  [35,'ร่างสุดท้าย พายุศรสวรรค์ · แรง ×1.4 ยิงซ้ำทุก 2 ครั้ง',{mul:{dmg:1.4}, fx:{echo:{every:2}}}]],
mark:[
  [6,'ศรเร็ว +15%',{mul:{speed:1.15}}],
  [10,'หมายนานขึ้น 20%',{mul:{dur:1.2}}],
  [15,'ศรหมายแรง +25%',{mul:{dmg:1.25}}],
  [20,'ตัวที่ถูกหมายรับดาเมจ +5%',{add:{amp:.05}}],
  [25,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [30,'+1 ศร',{add:{count:1}}],
  [35,'ร่างสุดท้าย ตราล่าสังหาร · ตัวที่ถูกหมาย +10% ฆ่าแล้วระเบิด',{add:{amp:.1}, fx:{burst:{r:60, pct:.5}}}]],
starshard:[
  [6,'สะเก็ด +1',{add:{split:1}}],
  [10,'ศรเร็ว +15%',{mul:{speed:1.15}}],
  [15,'สะเก็ดแรง +20%',{mul:{shard:1.2}}],
  [20,'+1 ศร',{add:{count:1}}],
  [25,'ทะลุ +1 ก่อนแตก',{add:{pierce:1}}],
  [30,'แรง +25%',{mul:{dmg:1.25}}],
  [35,'ร่างสุดท้าย ฝนดาวแตก · สะเก็ด +3 ฆ่าแล้วแตกซ้ำ',{add:{split:3}, fx:{shards:{on:'kill', ch:1, n:3, pct:.3}}}]],
prayer:[
  [6,'ลานกว้าง +10%',{mul:{r:1.1}}],
  [10,'ฟื้น +20%',{mul:{heal:1.2}}],
  [15,'ลานอยู่นานขึ้น 20%',{mul:{dur:1.2}}],
  [20,'ศัตรูในลานติดไฟศักดิ์สิทธิ์',{fx:{ignite:{ch:.15, pct:.3, t:3}}}],
  [25,'ชะลอ +10%',{add:{slow:.1}}],
  [30,'ฟื้น +30%',{mul:{heal:1.3}}],
  [35,'ร่างสุดท้าย ลานสวรรค์ · แรง ×1.4 ศัตรูตายในลาน ฟื้น HP 2',{mul:{dmg:1.4}, fx:{feast:{amt:2}}}]],
lantern:[
  [6,'ลำแสงไกล +15%',{mul:{life:1.15}}],
  [10,'ยิงถี่ +10%',{mul:{cd:.9}}],
  [15,'ทะลุ +1',{add:{pierce:1}}],
  [20,'+1 โคม',{add:{count:1}}],
  [25,'แสงทำให้มึนบางครั้ง',{fx:{shock:{ch:.12, t:.3}}}],
  [30,'แรง +25%',{mul:{dmg:1.25}}],
  [35,'ร่างสุดท้าย โคมสุริยา · แสงระเบิดเมื่อโดน',{fx:{hitboom:{r:36, pct:.3}}}]],
seal:[
  [6,'+1 ตรา',{add:{targets:1}}],
  [10,'ระเบิดเร็วขึ้น 15%',{mul:{delay:.85}}],
  [15,'วงระเบิด +15%',{mul:{r:1.15}}],
  [20,'+2 ตรา',{add:{targets:2}}],
  [25,'ตรามึนศัตรูข้าง ๆ',{fx:{shock:{ch:.3, t:.4}}}],
  [30,'แรง +25%',{mul:{dmg:1.25}}],
  [35,'ร่างสุดท้าย ตราสวรรค์ · ประทับซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
veil:[
  [6,'ม่านกว้าง +10%',{mul:{r:1.1}}],
  [10,'ฟื้นต่อกระสุน +25%',{mul:{heal:1.25}}],
  [15,'คูลดาวน์ -10%',{mul:{cd:.9}}],
  [20,'ม่านทำให้มึน',{fx:{shock:{ch:.35, t:.4}}}],
  [25,'ชะลอ +10%',{add:{slow:.1}}],
  [30,'ตั้งม่านแล้วฟื้น HP 3%',{fx:{mend:{pct:.03}}}],
  [35,'ร่างสุดท้าย ม่านรุ่งอรุณ · แรง ×1.5 วง ×1.15',{mul:{dmg:1.5, r:1.15}}]],
palm:[
  [6,'คลื่นกว้าง +15%',{mul:{size:1.15}}],
  [10,'ไกลขึ้น 15%',{mul:{life:1.15}}],
  [15,'แรง +20%',{mul:{dmg:1.2}}],
  [20,'ฝ่ามือไฟ ติดไฟ',{fx:{ignite:{ch:.25, pct:.2, t:3}}}],
  [25,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [30,'+1 คลื่น',{add:{count:1}}],
  [35,'ร่างสุดท้าย ฝ่ามือพระอาทิตย์ · ผลักซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
combo:[
  [6,'หมัดไกล +10%',{mul:{range:1.1}}],
  [10,'ระเบิดปิดท้ายกว้าง +15%',{mul:{r:1.15}}],
  [15,'ต่อยเร็วขึ้น 10%',{mul:{cd:.9}}],
  [20,'หมัดปิดท้ายแรง +25%',{mul:{boom:1.25}}],
  [25,'หมัดไฟ ติดไฟ',{fx:{ignite:{ch:.2, pct:.2, t:2.5}}}],
  [30,'เป้าที่มึนโดนแรง ×1.4',{fx:{vsStun:{m:1.4}}}],
  [35,'ร่างสุดท้าย สี่หมัดสุริยเทพ · ปิดท้ายทุก 4 หมัด',{add:{fin:-1}}]],
coin:[
  [6,'กระดอน +1',{add:{bounce:1}}],
  [10,'คริ +5%',{add:{crit:.05}}],
  [15,'ระยะกระดอน +20%',{mul:{jump:1.2}}],
  [20,'+1 เหรียญ',{add:{count:1}}],
  [25,'คริ +10%',{add:{crit:.1}}],
  [30,'กระดอน +2',{add:{bounce:2}}],
  [35,'ร่างสุดท้าย เหรียญโชคชะตา · แรง ×1.2 ฆ่าแล้วแตกเป็นเหรียญ',{mul:{dmg:1.2}, fx:{shards:{on:'kill', ch:1, n:3, pct:.4}}}]],
caltrops:[
  [6,'เหล็กแหลมกว้าง +10%',{mul:{r:1.1}}],
  [10,'+1 กอง',{add:{count:1}}],
  [15,'ชะลอ +8%',{add:{slow:.08}}],
  [20,'อาบพิษ',{fx:{ignite:{ch:.2, pct:.3, t:3}}}],
  [25,'อยู่นานขึ้น 25%',{mul:{dur:1.25}}],
  [30,'แทงแรง +30%',{mul:{dmg:1.3}}],
  [35,'ร่างสุดท้าย ทุ่งเหล็กมรณะ · +1 กอง ตายแล้วระเบิดเศษเหล็ก',{add:{count:1}, fx:{shards:{on:'kill', ch:1, n:4, pct:.4}}}]],
curtain:[
  [6,'+1 ใบมีด',{add:{count:1}}],
  [10,'วงกว้าง +10%',{mul:{r:1.1}}],
  [15,'เฉือนถี่ขึ้น 15%',{mul:{rate:.85}}],
  [20,'+2 ใบมีด',{add:{count:2}}],
  [25,'เป้าเลือดต่ำกว่า 30% แรง ×1.5',{fx:{execute:{hp:.3, m:1.5}}}],
  [30,'แรง +25%',{mul:{dmg:1.25}}],
  [35,'ร่างสุดท้าย ม่านใบมีดจันทร์ดับ · วง ×1.2 ดูดเลือด 2%',{mul:{r:1.2}, fx:{leech:{pct:.02}}}]],
reap:[
  [6,'+1 เป้า',{add:{targets:1}}],
  [10,'คริ +5%',{add:{crit:.05}}],
  [15,'ระยะ +15%',{mul:{range:1.15}}],
  [20,'ปลิดแล้วแตกเป็นมีดเงา',{fx:{shards:{on:'kill', ch:1, n:3, pct:.35}}}],
  [25,'+2 เป้า',{add:{targets:2}}],
  [30,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [35,'ร่างสุดท้าย เคียวจันทร์ดับ · ปลิดซ้ำทุก 2 ครั้ง',{fx:{echo:{every:2}}}]],
bind:[
  [6,'โซ่กว้าง +10%',{mul:{r:1.1}}],
  [10,'ตรึงนานขึ้น 20%',{mul:{dur:1.2}}],
  [15,'บีบแรง +25%',{mul:{dmg:1.25}}],
  [20,'+1 วงโซ่',{add:{count:1}}],
  [25,'ตัวที่ถูกตรึงโดนแรง ×1.4',{fx:{vsStun:{m:1.4}}}],
  [30,'ตายในโซ่ระเบิดเงา',{fx:{burst:{r:55, pct:.4}}}],
  [35,'ร่างสุดท้าย คุกเงานิรันดร์ · วง ×1.3 นาน ×1.3',{mul:{r:1.3, dur:1.3}}]],
decoy:[
  [6,'ร่างล่ออยู่นาน +15%',{mul:{dur:1.15}}],
  [10,'ล่อไกลขึ้น 15%',{mul:{lure:1.15}}],
  [15,'ระเบิดกว้าง +20%',{mul:{explode:1.2}}],
  [20,'ระเบิดแรง +30%',{mul:{dmg:1.3}}],
  [25,'ระเบิดแล้วศัตรูมึน',{fx:{shock:{ch:.6, t:.6}}}],
  [30,'คูลดาวน์ -15%',{mul:{cd:.85}}],
  [35,'ร่างสุดท้าย ร่างล่อเงานรก · แรง ×1.3 ศัตรูที่ตายระเบิด',{mul:{dmg:1.3}, fx:{burst:{r:50, pct:.4}}}]]});
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
    if(m.dd>=step){ m.dd=0; let n=0; for(const z of G.zones) if(z.drip) n++;
      if(n<16) addZone({x:p.x,y:p.y+p.r*.5,r:14+p.r*.8,dur:m.drip,tick:.5,dmg:p.dmg*.06,kind:'fire',src:p.src,fxd:true,drip:1}); } } }
function mxSplit(p){ const m=p.mx, n=m.split, a0=Math.atan2(p.vy,p.vx);
  for(let i=0;i<n;i++){ const a=a0+(i-(n-1)/2)*.55, q={x:p.x,y:p.y,vx:Math.cos(a)*380,vy:Math.sin(a)*380,r:p.r*.55,dmg:p.dmg*.4,pierce:1,life:.4,max:.4,knock:60,
    explode:p.explode*.5,homing:0,crit:0,shape:p.shape,c:p.c,src:p.src,burn:0,hit:null,tg:null,dead:false,t:0,fxd:true};
    q.mx={lv:Math.min(m.lv,24),look:m.look,ht:0,dd:0}; G.projs.push(q); } }
// projHit with an exploding projectile: pass through (with a small blast) while pass > 0 · or a second wave after 0.3 s
function mxPassHit(p){ const m=p.mx; if(!m||!(m.pass>0)) return false; m.pass--;
  if(m.look.passBoom) explode(p.x,p.y,p.explode*.6,p.dmg*.5,p.src,{c:p.c}); return true; }
function mxBoom2(p){ const m=p.mx; if(!m||!m.boom2) return; const x=p.x, y=p.y, r=p.explode*.85, d=p.dmg*.5, s=p.src, c=p.c;
  later(.3,()=>{ if(G&&!G.over) explode(x,y,r,d,s,{c}); }); }

/* ---- the Lv6 looks of the other mage skills (22 calls these only for skills with a mastery look) ---- */
// strikes (drawStrikesOver, 'lighter' pass): meteor tail · spikes dust
function mxDrawStrike(s){ const k=s.src.mxLook;
  if(k.tail&&s.kind==='meteor'&&s.t<s.delay){ const q=s.t/s.delay, rr=Math.max(6,s.r*.32), a=Math.atan2(420,-220);
    streak(s.x+(1-q)*220,s.y-(1-q)*420,a,rr*15,rr*1.5,'#ffd27a',.5); }
  if(k.dust&&s.kind==='spike'&&s.t>=s.delay&&s.t<s.delay+.4){ const q=(s.t-s.delay)/.4;
    ctx.fillStyle=`rgba(200,170,120,${.22*(1-q)})`; ctx.beginPath(); ctx.ellipse(s.x,s.y,s.r*(1+q*1.4),s.r*(.6+q*.8),0,0,TAU); ctx.fill(); } }
// zones (drawZones): blizzard flakes · vortex leaves
function mxDrawZone(z){ const k=z.src.mxLook, fade=Math.max(0,Math.min(1,(z.dur-z.t)*3,z.t*6)), sd=z.seed||0;
  if(k.flakes){ ctx.fillStyle=`rgba(240,250,255,${.85*fade})`; for(let i=0;i<10;i++){ const a=sd*7+i*2.4+G.t*.8, d=z.r*((i*.37+G.t*.15)%1);
      ctx.beginPath(); ctx.arc(z.x+Math.cos(a)*d,z.y+Math.sin(a)*d*.8,2.4+(i%3),0,TAU); ctx.fill(); } }
  if(k.leaves){ for(let i=0;i<6;i++){ const a=G.t*5+i*TAU/6+sd, d=z.r*(.35+.2*(i%3)); ctx.fillStyle=i%2?`rgba(120,200,90,${.9*fade})`:`rgba(210,226,110,${.9*fade})`;
      ctx.save(); ctx.translate(z.x+Math.cos(a)*d,z.y+Math.sin(a)*d*.7); ctx.rotate(a*2); ctx.beginPath(); ctx.ellipse(0,0,5,2.4,0,0,TAU); ctx.fill(); ctx.restore(); } } }
// around the hero (drawAuras): frost crystals
function mxDrawAround(){ if(!P.skills.some(x=>x.mxLook&&x.mxLook.crystals)) return;
  ctx.fillStyle='rgba(205,242,255,.85)';
  for(let i=0;i<3;i++){ const a=G.t*1.6+i*TAU/3, x=P.x+Math.cos(a)*34, y=P.y-8+Math.sin(a)*14;
    ctx.save(); ctx.translate(x,y); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(0,-6); ctx.lineTo(3,0); ctx.lineTo(0,6); ctx.lineTo(-3,0); ctx.closePath(); ctx.fill(); ctx.restore(); } }

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
    ctx.globalCompositeOperation='lighter'; return true; }
  if(p.shape==='bolt'&&(k.sparkle||k.rainbow)){ const c=k.rainbow?`hsl(${(G.t*360+p.t*600)%360},90%,65%)`:p.c;
    ctx.globalCompositeOperation='lighter'; streak(p.x,p.y,a,sp*.06,p.r*3,k.rainbow?'#ffffff':p.c,.7); glow(p.x,p.y,p.r*2.8,k.rainbow?'#ffffff':p.c,.85);
    for(let i=0;i<3;i++){ const t=G.t*8+i*TAU/3; ctx.fillStyle=k.rainbow?`hsl(${(i*120+G.t*300)%360},90%,70%)`:'#e8dcff'; ctx.fillRect(p.x+Math.cos(t)*p.r*2-1.5,p.y+Math.sin(t)*p.r*2-1.5,3,3); }
    ctx.globalCompositeOperation='source-over'; circ(ctx,k.rainbow?c:'#ffffff',p.x,p.y,p.r*.7); ctx.globalCompositeOperation='lighter'; return true; }
  return false; }
