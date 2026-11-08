/* ================= 30-balance.js · lane C · pure · every number of §2–§5 (single source) ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane C writes the real body. */
const BAL={ CAP:{base:60, job1:20, job2:25, stat:50, chars:3, bag:120, stash:120},
  mobExp(m){ return 0; }, minPerLv(L){ return 0; }, bxpNeed(L){ return 0; }, diffMul(d){ return 1; }, jxpNeed(J,tier){ return 0; },
  statCost(x){ return 0; }, statPtsFor(L){ return 0; }, START_PTS:5,
  META_K:{STR:{might:.008}, VIT:{hp:4,regen:.015,armor:.06}, AGI:{speed:.003,cd:.996}, DEX:{cd:.997,proj40:1},
          INT:{area:.006,dur:.006}, LUK:{crit:.003,critMult:.006,drop:.012,xp:.004}, LV:{hp:4,might:.004}},
  RANK_COST:[0,1,1,1,2,2], ADV:{base:20, job:20, fee:500}, LOADOUT:{1:4, 2:5},
  SURV:{recLv(T){ return 1; }, hpMul(T){ return 1; }, dmgMul(T){ return 1; }, defK(T){ return 22; }, goldPerWave(T){ return 0; }, gearTier(T){ return 1; }, expMul(waves,won){ return 0; }, overLv(L,rec){ return 1; }},
  FIELD:{hpByLv(m){ return 1; }, dmgByLv(m){ return 1; }, gold(m){ return 0; }, cap:{touch:45, desk:70}, deathExp:.01, respawn:[8,15], rampage:{every:150, jitter:20, n:{touch:14, desk:18}}},
  BOSS:{diff:[{n:'ปกติ',hp:1,dmg:1,lv:0},{n:'ยาก',hp:2.2,dmg:1.4,lv:10},{n:'ฝันร้าย',hp:4.5,dmg:2,lv:20}], hp(lv,d){ return 1; }, exp(lv,d){ return 0; }, gold(lv,d){ return 0; }, marks:[4,8,15], rune:[.08,.15,.25], uniq:[.10,.18,.30]},
  REFINE:{p:[1,1,1,1,1,.80,.65,.50,.38,.26,.15], fail:['','','','','','keep','keep','down','down','down','down'],
          mat(t){ return null; }, pity:.04, pityMax:.20, fee(tier,t){ return 0; }, weapon(r){ return 0; }, armor(r){ return 0; }},
  PRICE:{}, DROP:{field:{}, fboss:{}, surv:{}}, RESET:{gold:2000, marks:40, freeBelow:20} };

