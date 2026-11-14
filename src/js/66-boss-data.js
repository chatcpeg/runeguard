/* ================= 66-boss-data.js · lane H · pure · arena bosses (BOSS_LIST, EN of the old field bosses, vector painters) ================= */
// DESIGN §2.4 · §7.8. One row per boss of the arena (ล่าบอส):
//   classic  colossus / lich / king           core AI (20 bossAI)       unlocked by acct.bossUnlock (survival waves 5 / 10 / 20)
//   field    gb_king / sb_queen / ob_warlord  BOSS_PAT moves (64)        unlocked once killed on its map (acct.fboss[zone].kills / ch.fz[zone].b)
//   old      fb_ramking / fb_vinemother / fb_isleback · art only so far · new BOSS_PAT moves in 67 · unlocked by the character's level
// lv = base level (difficulty adds BAL.BOSS.diff[d].lv) · k = HP weight on BAL.BOSS.hp · par = medal S time per difficulty (s)
// biome = the arena floor (29a TER_BIOME look) · drop = what its chest holds on a full reward (rollDrops format, 34) · nothing here touches the DOM.
const BOSS_LIST=[
  {id:'fb_ramking', en:'fb_ramking', n:'ราชาแพะเขาหิน', i:'🐏', lv:10, k:.7, src:'old', unlock:{lv:8}, biome:'meadow', par:[50,65,100]},
  {id:'gb_king', en:'gb_king', n:'ราชาก็อบลินมงกุฎสนิม', i:'👑', lv:12, k:.75, src:'field', unlock:{zone:'g1'}, biome:'forest', par:[55,70,110]},
  {id:'fb_vinemother', en:'fb_vinemother', n:'แม่เถาวัลย์พันปี', i:'🌿', lv:18, k:.9, src:'old', unlock:{lv:15}, biome:'ruins', par:[55,70,110]},
  {id:'colossus', en:'colossus', n:'ยักษ์กระดูกทมิฬ', i:'💀', lv:20, k:1.1, src:'classic', unlock:{bu:'colossus', wave:5}, biome:'haunted', par:[60,75,120]},
  {id:'sb_queen', en:'sb_queen', n:'ราชินีวุ้นหกสี', i:'🫧', lv:22, k:1.05, src:'field', unlock:{zone:'s1'}, biome:'swamp', par:[60,75,120]},
  {id:'fb_isleback', en:'fb_isleback', n:'เต่ายักษ์หลังเกาะ', i:'🐢', lv:26, k:.8, src:'old', unlock:{lv:22}, biome:'swamp', par:[65,80,125]},
  {id:'lich', en:'lich', n:'ลิชไร้วิญญาณ', i:'🧙', lv:30, k:1.1, src:'classic', unlock:{bu:'lich', wave:10}, biome:'haunted', par:[60,75,120]},
  {id:'ob_warlord', en:'ob_warlord', n:'แม่ทัพออร์คเขี้ยวเหล็ก', i:'🪓', lv:34, k:1.05, src:'field', unlock:{zone:'o1'}, biome:'canyon', par:[70,85,130]},
  {id:'king', en:'king', n:'จักรพรรดิแห่งความตาย', i:'☠️', lv:45, k:1.15, src:'classic', unlock:{bu:'king', wave:20}, biome:'haunted', par:[80,95,140]}];
// tuning of the arena (measured with the RG.sim bot: rewards per minute vs survival, docs report of lane H)
//   R arena radius · spawn s after entering · HP × BAL.BOSS.hp (§2.4's 900 dies in 3–10 s to a character with ★5 skills) · HPD per difficulty · FULL full rewards per boss per local day (acct.daily.boss '<id>:<n>') · CUT what a fight
//   pays after that (gold / EXP ×CUT, no marks, a small dust chance) · GOLD / EXP on top of BAL.BOSS.gold / exp · MIN = minion level
//   floor below the boss · rushGap s between bosses of the rush (25 % heal + one card)
const BS={R:700, CX:3000, CY:3000, spawn:2, HP:8, HPD:[1,.7,.55], FULL:3, CUT:.15, GOLD:.22, EXP:.55, MIN:6, rushGap:3, rushMin:2, HITCAP:.3, MINSEC:typeof SV_BSMIN==='number'?SV_BSMIN:3,   // MINSEC: a faster time is no record (an edited save)
  diffWin:[0,0,1],                                                       // ยาก opens after a win on ปกติ · ฝันร้าย after a win on ยาก
  tier(lv){ return Math.max(1,Math.min(5,1+Math.floor(lv/10))); }};
const BOSS_BY={}; for(const b of BOSS_LIST) BOSS_BY[b.id]=b;
function bsDef(id){ return typeof id==='string'&&Object.prototype.hasOwnProperty.call(BOSS_BY,id)?BOSS_BY[id]:null; }
function bsDiff(d){ const D=BAL.BOSS.diff, i=Math.floor(+d||0); return D[i<0?0:i>=D.length?D.length-1:i]; }
function bsDi(d){ const n=BAL.BOSS.diff.length, i=Math.floor(+d||0); return i<0?0:i>=n?n-1:i; }
function bsLv(id,d){ const B=bsDef(id); return B?B.lv+bsDiff(d).lv:1; }
// the chest of one kill (rollDrops table) · full = one of today's full rewards · d = difficulty index
function bsDropTable(id,d,full){ const B=bsDef(id); if(!B) return []; if(!full) return [{id:'m_dust', p:.35}];
  const di=bsDi(d), t=BS.tier(bsLv(id,di)), R=BAL.BOSS;
  const out=[{id:'m_dust', n:[2+di,4+2*di]}, {gear:t}, {gear:t, p:R.uniq[di]}, {id:'m_crystal', p:.35+.25*di}, {id:'m_seal', p:R.uniq[di]*.5}, {id:'u_potion_l', p:.5}];
  if(B.src==='classic') out.push({id:'rn_'+B.id, p:R.rune[di]}, {id:'m_shard_'+B.id, n:[1,1+di]});
  else out.push({shard:'survBoss', p:R.rune[di]*2}, {shard:'surv', n:[1,1+di]});
  return out; }
// medal of a time (s) on difficulty d: S ≤ par · A ≤ 1.5 par · B = a win
function bsMedal(id,d,sec){ const B=bsDef(id); if(!B) return 'B'; const par=B.par[bsDi(d)]||BAL.BOSS.par[bsDi(d)]; return sec<=par?'S':sec<=par*BAL.BOSS.medalA?'A':'B'; }

/* ---- the three old field bosses: painted art (12a fb_*) + a vector look until it loads (61 FD_PAINT, looked up at draw time) ---- */
// vector look per type: [FD_PAINT family, its unit radius, colour, extra] scaled to the type's own r
function bsVec(fam,unit,r,col,x){ return (c,f)=>{ const P2=typeof FD_PAINT!=='undefined'?FD_PAINT[fam]:null; if(!P2) return; c.save(); c.scale(r/unit,r/unit); P2(c,f,col,x); c.restore(); }; }
if(typeof EDRAW!=='undefined'){ EDRAW.bs_ramking=bsVec('rhino',20,42); EDRAW.bs_vinemother=bsVec('slime',12,46,'#5a9a48','crown'); EDRAW.bs_isleback=bsVec('crab',15,48); }
const BS_EN={
  fb_ramking:{boss:1, lazy:1, n:'ราชาแพะเขาหิน', lv:10, el:'earth', ai:'bs_ramking', base:'bs_ramking', art:'fb_ramking', hp:1000, speed:70, r:42, dmg:19, mass:70, xp:110, goo:'#b0a890', fam:'beast',
    d:'พุ่งชนเป็นเส้นตรง (เตือน 0.9 วิ) แล้วกระทืบพื้น r 160 · HP ต่ำกว่า 50% เรียกกระรอกหางถ่าน'},
  fb_vinemother:{boss:1, lazy:1, n:'แม่เถาวัลย์พันปี', lv:18, el:'wind', ai:'bs_vinemother', base:'bs_vinemother', art:'fb_vinemother', hp:1050, speed:46, r:46, dmg:20, mass:80, xp:150, goo:'#7fbf5a',
    d:'ยิงหนามรอบตัว 12 ลูกทุก 3 วิ · เรียกผึ้งอำพันทุก 10 วิ · รากพันธนาการ r 150 โดนแล้วเดินช้า'},
  fb_isleback:{boss:1, lazy:1, n:'เต่ายักษ์หลังเกาะ', lv:26, el:'water', ai:'bs_isleback', base:'bs_isleback', art:'fb_isleback', hp:1150, speed:40, r:48, dmg:23, mass:120, xp:200, goo:'#7ab8d8', fam:'beast', def:.2,
    d:'กระดองแข็ง (ลดดาเมจ 20%) · กระแทกพื้น r 200 ถี่ · พ่นลูกน้ำ 18 ลูก · เรียกปูที่ HP 66% และ 33%'}};
if(typeof EN!=='undefined') Object.assign(EN,BS_EN);   // EN absent: a pure test load without 08
