/* ================= 33-items-data.js · lane E · pure · items, runes, drop tables, shop ================= */
// DESIGN §4.1–4.12 (M2: tier 1–4 gear = 73 pieces + the pioneer cloak, consumables, materials, 10 survival runes + shards).
// Templates are fixed (no random affixes) · economy numbers live in BAL (30-balance.js): BAL.REFINE, BAL.PRICE, BAL.CAP.
// ITEMS[id] = {n, i, slot, cls?, lv, tier, rar, st, sock?, sockRoll?, look?, refine?, stack?, kind?, use?, dye?, makes?, rune?, noSell?, unique?}
// Never read ITEMS[id] / RUNES[id] with an id from a save or the UI directly: use itemDef() / itHas() (34-items-logic.js).
const IT_SLOTS=['weapon','off','head','face','body','cloak','hands','feet','neck','ring'];
const IT_SLOT_TH={weapon:'อาวุธ', off:'มือรอง', head:'หมวก', face:'หน้า', body:'เสื้อเกราะ', cloak:'ผ้าคลุม', hands:'ถุงมือ', feet:'รองเท้า', neck:'สร้อยคอ', ring:'แหวน'};
const IT_SLOT_I={weapon:'⚔️', off:'🛡️', head:'🎩', face:'🥽', body:'🥋', cloak:'🧣', hands:'🧤', feet:'👢', neck:'📿', ring:'💍'};
const IT_RAR=[{n:'ธรรมดา', c:'#e8e4da'}, {n:'ดี', c:'#7fe07a'}, {n:'หายาก', c:'#6fb8ff'}, {n:'ตำนาน', c:'#f0c75a'}];
// §4.2 tier: material word · level needed · rune sockets (tier 4: 1, or 2 with 35% when it drops)
const IT_TIER=[null, {m:'ฝึกหัด', lv:1, sock:0}, {m:'เหล็ก', lv:12, sock:1}, {m:'เหล็กกล้า', lv:24, sock:1},
  {m:'เงินจันทร์', lv:36, sock:1, roll:[1,2,.35]}, {m:'อัคนีรูน', lv:48, sock:2}];
const IT_MAXT=4;                                          // highest tier shipped now (tier 5 = M4)
const IT_MIGHT=[0,.05,.15,.28,.42,.58];                   // §4.3 weapon might by tier
const IT_SHIELD=['swordsman','cleric'], IT_HEAVY=['swordsman','cleric'];
// §4.3 weapons: id w_<type>_<tier> · name <type><material> · secondary stat per tier T · look colour per tier (tier 1 keeps the class colour)
const IT_WEAP={
  sword: {cls:'swordsman', n:'ดาบ',      i:'⚔️', per:T=>({hp:10*T}),                 wc:[0,0,'#d5dde6','#a9c1dc','#eef3ff']},
  staff: {cls:'mage',      n:'ไม้เท้า',   i:'🪄', per:T=>({area:.02*T}),              wc:[0,0,'#8fb3ff','#5fd0ff','#e3ebff']},
  bow:   {cls:'archer',    n:'ธนู',      i:'🏹', per:T=>({crit:.01*T}),              wc:[0,0,'#8d939c','#5d7690','#c7d2ee']},
  rod:   {cls:'cleric',    n:'คทา',      i:'🔱', per:T=>({regen:.12*T}),             wc:[0,0,'#c9cfd8','#9fb8d6','#eef2ff']},
  dagger:{cls:'thief',     n:'มีดสั้น',   i:'🗡️', per:T=>({crit:.008*T, speed:.008*T}), wc:[0,0,'#d2d8e0','#a6bfd9','#f0f4ff']}};
// §4.4–4.5 off-hand, armour, accessories: [id, slot, name, tier, stats, look, extra]
// accessory tiers (level / price / sockets) are a lane E decision: §4.5 gives none
const IT_GEAR=[
  ['o_shield_1','off','โล่ไม้ฝึกหัด',1,{armor:1},null,{cls:IT_SHIELD, i:'🛡️'}],
  ['o_shield_2','off','โล่เหล็ก',2,{armor:3, hp:15},null,{cls:IT_SHIELD, i:'🛡️'}],
  ['o_shield_3','off','โล่เหล็กกล้า',3,{armor:5, hp:25},null,{cls:IT_SHIELD, i:'🛡️'}],
  ['o_shield_4','off','โล่เงินจันทร์',4,{armor:7, hp:40},null,{cls:IT_SHIELD, i:'🛡️'}],
  ['o_orb_2','off','ลูกแก้วรูนหม่น',2,{area:.04, cd:.98},null,{cls:['mage'], i:'🔮'}],
  ['o_orb_4','off','ลูกแก้วรูนจันทร์',4,{area:.08, cd:.96},null,{cls:['mage'], i:'🔮'}],
  ['o_quiver_2','off','กระบอกธนูหนังวัว',2,{crit:.02, might:.03},null,{cls:['archer'], i:'🎯'}],
  ['o_quiver_4','off','กระบอกธนูเงินจันทร์',4,{crit:.04, might:.06},null,{cls:['archer'], i:'🎯'}],
  ['o_offblade_2','off','ใบมีดรองเหล็ก',2,{crit:.02, speed:.02},null,{cls:['thief'], i:'🔪'}],
  ['o_offblade_4','off','ใบมีดรองเงินจันทร์',4,{crit:.04, speed:.04},null,{cls:['thief'], i:'🔪'}],
  ['h_straw','head','หมวกฟาง',1,{armor:1, drop:.03},{hat:'cap', hatC:'#e2c46a', orn:''},{i:'👒'}],
  ['h_leather','head','หมวกหนัง',1,{armor:1, hp:10},{hat:'cap', hatC:'#8a5a34', orn:''},{i:'🧢'}],
  ['h_iron','head','หมวกเหล็ก',2,{armor:2},{hat:'helm', hatC:'#9aa5b1', orn:''},{i:'⛑️'}],
  ['h_bluewizard','head','หมวกจอมเวทคราม',2,{area:.03},{hat:'wizard', hatC:'#2f4f9e', orn:''},{cls:['mage'], i:'🎩'}],
  ['h_travelhood','head','ผ้าคลุมหัวนักเดินทาง',2,{speed:.02},{hat:'hood', hatC:'#6b5a3e', orn:''},{i:'🧕'}],
  ['h_steel','head','หมวกเหล็กกล้า',3,{armor:3, hp:15},{hat:'helm', hatC:'#7f93ab', orn:''},{i:'⛑️'}],
  ['h_silverleaf','head','มงกุฎใบเงิน',4,{armor:4, hp:30},{hat:'leafcrown', hatC:'#dfe6ee', orn:''},{i:'👑'}],
  ['h_moonfeather','head','หมวกขนนกจันทร์',4,{crit:.03},{hat:'cap', hatC:'#3b4a7a', orn:'feather', ornC:'#e8eeff'},{i:'🪶'}],
  ['f_bluelens','face','แว่นเลนส์คราม',2,{crit:.015},null,{i:'🥽'}],
  ['f_blackcloth','face','หน้ากากผ้าดำ',2,{dodge:.02},null,{i:'🎭'}],
  ['f_hawkband','face','ผ้าคาดตาเหยี่ยว',3,{critMult:.08},null,{i:'🦅'}],
  ['f_fossilmask','face','หน้ากากกระดูกฟอสซิล',3,{armor:1, hp:20},null,{i:'💀'}],
  ['b_cotton','body','เสื้อผ้าฝ้าย',1,{armor:1, hp:10},{body:'#c9b99a', trim:'#8a7a5a'},{i:'👕'}],
  ['b_novrobe','body','ชุดคลุมนักเวทฝึกหัด',1,{area:.02},{body:'#6a5a9a', trim:'#d9c27a'},{i:'👘'}],
  ['b_leather','body','เกราะหนัง',2,{armor:3},{body:'#8a5a34', trim:'#5a3a20'},{i:'🥋'}],
  ['b_bluesilk','body','ชุดคลุมไหมคราม',2,{armor:1, area:.04},{body:'#2f5fae', trim:'#d9e2ef'},{i:'👘'}],
  ['b_chain','body','เกราะโซ่เหล็ก',3,{armor:6, speed:-.02},{body:'#8f99a6', trim:'#4a525e'},{cls:IT_HEAVY, i:'🥋', heavy:1}],
  ['b_runerobe','body','ชุดคลุมผนึกรูน',3,{armor:3, cd:.97},{body:'#3a2f5e', trim:'#7fe0ff'},{i:'👘'}],
  ['b_moonplate','body','เกราะแผ่นเงินจันทร์',4,{armor:10, speed:-.03},{body:'#cdd6ea', trim:'#7a8cc0'},{cls:IT_HEAVY, i:'🥋', heavy:1}],
  ['b_shadowhide','body','เสื้อหนังเงา',4,{armor:6, dodge:.03},{body:'#2a2433', trim:'#6a4a8a'},{i:'🥋'}],
  ['c_old','cloak','ผ้าคลุมเก่า',1,{hp:10},{cape:'#7a6a58'},{i:'🧣'}],
  ['c_windbreak','cloak','ผ้าคลุมกันลม',2,{speed:.02},{cape:'#5f8a9a'},{i:'🧣'}],
  ['c_crowfeather','cloak','ผ้าคลุมขนกา',2,{dodge:.02},{cape:'#2b2833'},{i:'🧣'}],
  ['c_redsilk','cloak','ผ้าคลุมไหมแดง',3,{hp:30, regen:.2},{cape:'#b02a3a'},{i:'🧣'}],
  ['c_meteor','cloak','ผ้าคลุมดาวตก',4,{area:.04, hp:40},{cape:'#3a2a6a'},{i:'🧣'}],
  ['c_pioneer','cloak','ผ้าคลุมผู้บุกเบิก',1,{hp:15},{cape:'#d9a93a'},{i:'🧣', rar:3, noSell:1, unique:1, d:'ของที่ระลึกของผู้เล่นรุ่นแรก · ขายไม่ได้'}],
  ['g_cloth','hands','ถุงมือผ้า',1,{might:.02},null,{i:'🧤'}],
  ['g_leather','hands','ถุงมือหนัง',2,{crit:.015},null,{i:'🧤'}],
  ['g_iron','hands','ถุงมือเหล็ก',2,{armor:1, might:.03},null,{i:'🧤'}],
  ['g_archer','hands','ถุงมือนักยิง',3,{cd:.97},null,{i:'🧤'}],
  ['g_moon','hands','ถุงมือเงินจันทร์',4,{might:.06, crit:.02},null,{i:'🧤'}],
  ['s_sandal','feet','รองเท้าแตะ',1,{speed:.02},{pants:'#7a5a3a'},{i:'🩴'}],
  ['s_boots','feet','รองเท้าบู๊ตหนัง',2,{speed:.03, armor:1},{pants:'#5a3a22'},{i:'👢'}],
  ['s_iron','feet','รองเท้าเหล็ก',3,{armor:2, speed:.02},{pants:'#6f7884'},{i:'🥾'}],
  ['s_gust','feet','รองเท้าลมพัด',3,{speed:.06},{pants:'#4f8f86'},{i:'🥾'}],
  ['s_moon','feet','รองเท้าเงินจันทร์',4,{speed:.05, dodge:.02},{pants:'#9aa6c8'},{i:'👢'}],
  ['n_fang','neck','สร้อยเขี้ยวสัตว์',1,{might:.03},null,{i:'📿'}],
  ['n_bluebead','neck','สร้อยลูกปัดคราม',2,{area:.04},null,{i:'📿'}],
  ['n_travelfeather','neck','จี้ขนนกนักเดินทาง',2,{speed:.03, magnet:1.1},null,{i:'📿'}],
  ['n_dimrune','neck','จี้หินรูนจาง',3,{cd:.97},null,{i:'📿'}],
  ['r_traveler','ring','แหวนนักเดินทาง',1,{xp:.03, drop:.05},null,{i:'💍'}],
  ['r_mountain','ring','แหวนหินภูเขา',2,{hp:25, armor:1},null,{i:'💍'}],
  ['r_hawkeye','ring','แหวนตาเหยี่ยว',2,{crit:.02},null,{i:'💍'}],
  ['r_silverleaf','ring','แหวนใบเงิน',3,{regen:.3},null,{i:'💍'}]];
// §4.10 runes from survival enemies (M2) · group = which slots take it · the shard item makes it (4 + fee at แม่หมอศิลา)
const RUNE_GROUP={
  weapon:{n:'อาวุธ', slots:['weapon']}, armor:{n:'เกราะ', slots:['body','off']}, head:{n:'ศีรษะ', slots:['head','face']},
  cloak:{n:'ผ้าคลุม', slots:['cloak']}, limb:{n:'เท้ามือ', slots:['feet','hands']}, acc:{n:'เครื่องประดับ', slots:['neck','ring']}};
const RUNES={
  rn_shambler:{n:'รูนซอมบี้', g:'armor', st:{hp:20}, mob:'shambler', sn:'เศษรูนซอมบี้'},
  rn_runner:{n:'รูนซอมบี้วิ่ง', g:'limb', st:{speed:.03}, mob:'runner', sn:'เศษรูนซอมบี้วิ่ง'},
  rn_bat:{n:'รูนค้างคาว', g:'acc', st:{magnet:1.2, xp:.03}, mob:'bat', sn:'เศษรูนค้างคาว'},
  rn_spitter:{n:'รูนโครงกระดูกนักธนู', g:'weapon', st:{crit:.03}, mob:'spitter', sn:'เศษรูนโครงกระดูกนักธนู'},
  rn_bloater:{n:'รูนศพพอง', g:'weapon', st:{area:.05}, mob:'bloater', sn:'เศษรูนศพพอง'},
  rn_brute:{n:'รูนยักษ์ศพ', g:'armor', st:{armor:2}, mob:'brute', sn:'เศษรูนยักษ์ศพ'},
  rn_wraith:{n:'รูนวิญญาณ', g:'cloak', st:{dodge:.03}, mob:'wraith', sn:'เศษรูนวิญญาณ'},
  rn_colossus:{n:'รูนยักษ์กระดูกทมิฬ', g:'weapon', st:{might:.06, boss:.05}, mob:'colossus', sn:'เศษรูนยักษ์กระดูกทมิฬ', boss:1},
  rn_lich:{n:'รูนลิชไร้วิญญาณ', g:'head', st:{cd:.95}, mob:'lich', sn:'เศษรูนลิชไร้วิญญาณ', boss:1},
  rn_king:{n:'รูนจักรพรรดิแห่งความตาย', g:'acc', st:{might:.04, hp:30, crit:.02}, mob:'king', sn:'เศษรูนจักรพรรดิแห่งความตาย', boss:1},
  // ท่องแดนรูน (docs/PROPOSAL-maps-daily.md §3–5): the runes of the three field bosses · shards only from their own box (60 FD_BOSSDROP)
  rn_gbking:{n:'รูนราชาก็อบลิน', g:'acc', st:{hp:20, gold:.06}, mob:'gb_king', sn:'เศษรูนราชาก็อบลิน', boss:1},
  rn_sbqueen:{n:'รูนราชินีวุ้น', g:'weapon', st:{area:.04, might:.03}, mob:'sb_queen', sn:'เศษรูนราชินีวุ้น', boss:1},
  rn_obwarlord:{n:'รูนแม่ทัพออร์ค', g:'armor', st:{armor:2, hp:25}, mob:'ob_warlord', sn:'เศษรูนแม่ทัพออร์ค', boss:1}};
// §1.2 "ธาตุชุดเกราะ": 6 element runes, body only (group elem) · one per piece (34 socketRune) · the body's rune = the character's
// armour element (34 gearElement → 42 P.armorEl → 18 hurtPlayer × elMul(monster el, armour el)) · shards from monsters of that
// element in the maps (62 fdDropTable: the slimes of บึงวุ้นหกสี 1.5% · other elemental field monsters 0.5%)
RUNE_GROUP.elem={n:'ธาตุเสื้อ', slots:['body']};
const IT_EL_RUNE={fire:['ไฟ','🔥'], water:['น้ำ','💧'], wind:['ลม','🌪️'], earth:['ดิน','🪨'], light:['แสง','✨'], dark:['มืด','🌑']};   // = 29 EL (pure: 29 may not be loaded)
for(const k in IT_EL_RUNE) RUNES['rn_el_'+k]={n:'รูนธาตุ'+IT_EL_RUNE[k][0], g:'elem', st:{hp:10}, el:k, mob:'el_'+k, sn:'เศษรูนธาตุ'+IT_EL_RUNE[k][0]};
for(const id in RUNES) RUNES[id].shard='m_shard_'+RUNES[id].mob;
// §4.6 consumables and materials: [id, name, icon, kind, stack, extra]
const IT_DYES=[['red','แดง','#c8343c'],['orange','ส้ม','#e07a2a'],['yellow','เหลือง','#e8c23a'],['green','เขียว','#3f9a4a'],
  ['sky','ฟ้า','#4aa3e0'],['indigo','คราม','#2f3f9e'],['purple','ม่วง','#7a3fa8'],['black','ดำ','#26232b']];
const IT_STACK=[
  ['u_potion_s','ยาฟื้นพลังเล็ก','🧪','use',99,{use:{heal:.2}, d:'ฟื้น HP 20% · คูลดาวน์ 8 วิ · ใช้ในสนาม'}],
  ['u_potion_l','ยาฟื้นพลังใหญ่','🧪','use',99,{use:{heal:.4}, d:'ฟื้น HP 40% · คูลดาวน์ 8 วิ · ใช้ในสนาม'}],
  ['m_dust','ผงรูน','✨','mat',999,{d:'วัสดุตีบวก +1 ถึง +6'}],
  ['m_crystal','ผลึกรูน','💎','mat',999,{d:'วัสดุตีบวก +7 ถึง +10'}],
  ['m_seal','ยันต์ผนึก','🧿','mat',99,{d:'ติ๊กก่อนตีบวก: ล้มเหลวแล้วระดับไม่ลด (ใช้ 1 ชิ้นต่อครั้ง)'}],
  ['u_forget','ม้วนลืมเลือน','📜','use',9,{d:'รีเซ็ตแต้มสถานะหรือแต้มสกิล 1 ครั้ง'}],
  ['u_bag10','ถุงขยายกระเป๋า','👝','use',9,{use:{bag:10}, d:'กระเป๋า +10 ช่อง (สูงสุด 120)'}]];

// ท่องแดนรูน named pieces (PROPOSAL-maps-daily §3–5 "ของดี" · DESIGN §4.2 / §4.7): [id, slot, name, lv, tier, rar, stats, look, extra]
// rar 1 (ดี) = the map's own goods: zone = the map (62 field drops 0.15% · camp chests 5% · its boss box 15%) · rar 3 (ตำนาน) = the
// field boss's piece: from = its boss (25% of its box, BAL.DROP.fboss.uniq) · fixed sockets (no roll) · never in IT_POOL or a shop
const IT_NAMED=[
  ['w_gobsling','weapon','หนังสติ๊กก็อบลิน',8,2,1,{might:.16, crit:.03},{weapon:'bow', wc:'#9a6a3a'},{cls:['archer'], i:'🏹', zone:'g1', d:'ของดีประจำป่าหนามก็อบลิน · ยางเหนียวจากเถาวัลย์ป่า ดีดไวกว่าธนูเหล็ก'}],
  ['h_thiefwrap','head','ผ้าโพกหัวโจร',5,1,1,{armor:1, gold:.1},{hat:'bandana', hatC:'#8a2a2a', orn:''},{i:'🧣', zone:'g1', d:'ของดีประจำป่าหนามก็อบลิน · ทองจากมอนในแผนที่ +10%'}],
  ['h_rustcrown','head','มงกุฎสนิมราชา',12,2,3,{armor:3, hp:35, might:.03},{hat:'crown', hatC:'#b0703a', orn:'', ornC:'#7fd06a'},{i:'👑', zone:'g1', from:'gb_king', sock:1, d:'ของดีของราชาก็อบลินมงกุฎสนิม · สนิมเกาะแต่ยังแข็ง'}],
  ['w_jellystaff','weapon','ไม้เท้าแกนวุ้น',16,2,1,{might:.18, area:.06},{weapon:'staff', wc:'#7fe0d0'},{cls:['mage'], i:'🪄', zone:'s1', d:'ของดีประจำบึงวุ้นหกสี · แกนรูนจากวุ้นยักษ์ฝังที่หัวไม้เท้า'}],
  ['h_jellycrown','head','มงกุฎวุ้นหกสี',22,3,3,{armor:3, hp:30, area:.03},{hat:'crown', hatC:'#c8a0ff', orn:'', ornC:'#7fe0ff'},{i:'👑', zone:'s1', from:'sb_queen', sock:1, elCycle:1, d:'ของดีของราชินีวุ้นหกสี · ถ้าเสื้อไม่มีรูนธาตุ ธาตุเกราะจะสลับทุก 12 วิ ไฟ → ลม → ดิน → น้ำ → แสง → มืด เหมือนราชินี'}],
  ['b_orchide','body','เกราะหนังออร์ค',26,3,1,{hp:60, armor:2},{body:'#6a4a2a', trim:'#4a5a2a'},{i:'🥋', zone:'o1', d:'ของดีประจำค่ายออร์คผาเหล็ก · หนังหนาเย็บด้วยเอ็น'}],
  ['r_shamanbone','ring','กำไลกระดูกหมอผี',26,3,1,{crit:.02, hp:15},null,{i:'📿', zone:'o1', d:'ของดีประจำค่ายออร์คผาเหล็ก · กระดูกสลักลายสาปของหมอผีออร์ค'}],
  ['w_ironfang','weapon','ขวานเขี้ยวเหล็ก',34,4,3,{might:.48, hp:30, crit:.02},{weapon:'axe', wc:'#c8d0d8'},{cls:['swordsman','cleric'], i:'🪓', zone:'o1', from:'ob_warlord', sock:2, d:'ของดีของแม่ทัพออร์คเขี้ยวเหล็ก · ใบขวานตีจากเขี้ยวเหล็กของแม่ทัพ (นักดาบ / นักบวช)'}]];
const ITEMS=itdBuild();
function itdR6(v){ return Math.round(v*1e6)/1e6; }
function itdSt(o){ const r={}; for(const k in o) r[k]=itdR6(o[k]); return r; }
function itdBuild(){
  const o={}, P=BAL.PRICE.stack;
  for(const type in IT_WEAP){ const w=IT_WEAP[type];
    for(let T=1;T<=IT_MAXT;T++){ const t=IT_TIER[T];
      o['w_'+type+'_'+T]={n:w.n+t.m, i:w.i, slot:'weapon', cls:[w.cls], lv:t.lv, tier:T, rar:0,
        st:itdSt(Object.assign({might:IT_MIGHT[T]},w.per(T))), sock:t.sock, sockRoll:t.roll||null,
        look:w.wc[T]?{weapon:type, wc:w.wc[T]}:{weapon:type}, refine:true}; } }
  for(const [id,slot,n,T,st,look,x] of IT_GEAR){ const t=IT_TIER[T], acc=slot==='neck'||slot==='ring';
    o[id]=Object.assign({n, i:x&&x.i||IT_SLOT_I[slot], slot, lv:t.lv, tier:T, rar:0, st:itdSt(st), sock:t.sock, sockRoll:t.roll||null,
      look:look||null, refine:!acc}, x||{}); }
  for(const [id,n,i,kind,stack,x] of IT_STACK) o[id]=Object.assign({n, i, kind, stack:Math.min(stack,kind==='mat'?P.mat:P.use)},x||{});
  for(const [id,slot,n,lv,T,rar,st,look,x] of IT_NAMED){ const t=IT_TIER[T], acc=slot==='neck'||slot==='ring';
    o[id]=Object.assign({n, i:IT_SLOT_I[slot], slot, lv, tier:T, rar, st:itdSt(st), sock:t.sock, sockRoll:null, look:look||null, refine:!acc}, x||{}); }
  for(const [c,th,hex] of IT_DYES) o['u_dye_'+c]={n:'สีย้อม'+th, i:'🎨', kind:'dye', stack:9, dye:hex, d:'ย้อมสีเสื้อ ขอบเสื้อ ผ้าคลุม หรือหมวก'};
  for(const id in RUNES){ const r=RUNES[id];
    o[r.shard]={n:r.sn, i:'🔹', kind:'mat', stack:P.mat, makes:id, d:'รวม '+BAL.PRICE.shardsPerRune+' ชิ้นเป็น'+r.n+' ที่แม่หมอศิลา'};
    o[id]={n:r.n, i:r.el?IT_EL_RUNE[r.el][1]:'🔷', kind:'rune', stack:P.use, rune:id, d:r.el?'ฝังที่เสื้อเกราะ → ธาตุเกราะ'+IT_EL_RUNE[r.el][0]+' '+IT_EL_RUNE[r.el][1]+' (มอนธาตุต่าง ๆ ตีเราแรงหรือเบาลงตามวงล้อธาตุ) · เสื้อ 1 ตัวใส่รูนธาตุได้ 1 อัน · มีผลเฉพาะโหมดที่ใช้ตัวละคร':'ฝังในช่องรูนกลุ่ม'+RUNE_GROUP[r.g].n}; }
  return o; }
// gear by tier (drop pools) · unique / legendary pieces never drop
const IT_POOL={}; for(const id in ITEMS){ const d=ITEMS[id]; if(!d.slot||d.unique||d.rar) continue; (IT_POOL[d.tier]||(IT_POOL[d.tier]=[])).push(id); }

// §4.12 / §2.2 drop tables in rollDrops() format: [{id|pick|shard|gear, p?, n?, noLuck?}]
//   id: one item · pick: one of the listed ids · shard: one shard of a set (DROPS.shardSets) · gear: tier number, 'T' or 'T+1'
//   ('T' = BAL.SURV.gearTier of the hell tier: rollDrops opts.T, else the running survival tier G.tier) · p = chance (× luck, ≤ 1)
//   n = count or [min, max]. Lane C points BAL.DROP.surv at these by name: {elite:'surv.elite', boss5:'surv.boss5', …}.
// Wave 15 has two bosses and each kill rolls boss15, so one boss15 roll is half of §2.2's wave total (2 gear · 2 crystals).
const DROPS={
  surv:{
    elite:[{id:'m_dust', n:[1,2]}, {shard:'surv', p:.25}, {gear:'T', p:.12}],
    boss5:[{gear:'T'}, {id:'m_shard_colossus', p:.5}],
    boss10:[{gear:'T'}, {id:'m_crystal'}],
    boss15:[{gear:'T'}, {id:'m_crystal'}],
    boss20:[{gear:'T+1'}, {id:'m_crystal', n:2}, {id:'rn_king', p:.10}]},
  shardSets:{surv:['m_shard_shambler','m_shard_runner','m_shard_bat','m_shard_spitter','m_shard_bloater','m_shard_brute','m_shard_wraith'],
    survBoss:['m_shard_colossus','m_shard_lich','m_shard_king']}};
// §5.1 / §4.11 shops · gold: ร้านป้านวล (potions, dust, scroll, dyes 1,500 · §4.6, tier 1–2 gear) · marks: ร้านตราผู้พิชิต (lane H, M5)
// gear buy price = BAL.PRICE.gear(tier, rar, 0) × buyMul (§4.11 gives only the sell formula · lane E decision)
const SHOP={npc:'ป้านวล', buyMul:5,
  gold:['u_potion_s','u_potion_l','m_dust','u_forget'].concat(IT_DYES.map(d=>'u_dye_'+d[0])),
  marks:['m_seal','m_crystal','u_forget','u_bag10'].concat(IT_DYES.map(d=>'u_dye_'+d[0]))};
for(const s of IT_SLOTS) for(const id in ITEMS){ const d=ITEMS[id]; if(d.slot===s&&d.tier<=2&&!d.unique&&!d.rar) SHOP.gold.push(id); }
