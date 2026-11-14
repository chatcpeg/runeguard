/* ================= 30-balance.js · lane C · pure · every number of §2–§5 (single source) ================= */
// Tune here, then measure with RG.sim. Formulas are DESIGN §2.2 · §2.4 · §3.2–3.5 · §4.6–4.12 · §5.3–5.6.
// Rule for every multiplier at its neutral input (T0, Lv1, +0): it returns exactly 1 / 22 / 0, so classic-equal paths stay bit-equal.
const BAL={ CAP:{base:60, job1:20, job2:25, stat:50, chars:3, bag:120, stash:120, rank:5, gold:999999999, marks:999999},
  // §3.2 levels and EXP
  mobExp(m){ return Math.round(4+1.5*Math.pow(m,1.25)); },                       // Base EXP per mob of Lv m
  minPerLv(L){ return 1+.6*L; },                                                // minutes per level at 30 same-level kills/min
  bxpNeed(L){ return Math.round(BAL.mobExp(L)*30*BAL.minPerLv(L)/10)*10; },     // EXP to go from L to L+1
  diffMul(d){ return d>=0 ? 1+.04*Math.min(d,8) : Math.max(.15,1+.07*d); },     // d = mob Lv − character Lv
  jxpNeed(J,tier){ return tier===2 ? Math.round(.8*BAL.bxpNeed(Math.min(59,Math.round(20+1.6*J)))/10)*10
                                   : Math.round(.72*BAL.bxpNeed(J)/10)*10; },   // tier 1 = first job, 2 = advanced job
  JOB_EXP:.8,                                                                   // Job EXP = 0.8 × Base EXP (every source)
  OVER_GOLD:.02,                                                                // at Base 60 excess EXP → 2% gold
  // §3.3 stat points
  statCost(x){ return 1+Math.floor(x*x/600); },                                 // cost to raise a stat from x to x+1
  statPtsFor(L){ return 2+Math.floor(L/20); },                                  // points gained on reaching Lv L (L ≥ 2)
  START_PTS:5,
  META_K:{STR:{might:.008}, VIT:{hp:4,regen:.015,armor:.06}, AGI:{speed:.003,cd:.996,speedMax:.15}, DEX:{cd:.997,proj40:1},
          INT:{area:.006,dur:.006}, LUK:{crit:.003,critMult:.006,drop:.012,xp:.004}, LV:{hp:4,might:.004}},
  ptsAt(L){ let n=BAL.START_PTS; for(let l=2;l<=L;l++) n+=BAL.statPtsFor(l); return n; },   // stat points earned by Lv L (incl. start)
  statSpent(x){ let n=0; for(let i=0;i<x;i++) n+=BAL.statCost(i); return n; },             // points to raise one stat 0 → x
  // §3.5 skill ranks (index r = cost of ★(r−1) → ★r) · passives cost 1 per ★ · loadout slots per job tier
  RANK_COST:[0,1,1,1,2,2,2,2,3],   // ★6–8 = tier 2 of a first-job skill after the advance (27 rankCap)
  PAS_COST:1, ADV:{base:20, job:20, fee:500}, LOADOUT:{1:5, 2:6},
  rankSpent(r){ let n=0; for(let i=1;i<=r;i++) n+=BAL.RANK_COST[i]; return n; },            // skill points for ★0 → ★r
  // START_SP: a new character (Job Lv1) starts with 6 skill points = exactly the first skill's free ★1 → ★5 (1+1+2+2).
  // Why (M2 gate §9.4, measured with RG.sim): in-run cards stop at the trained ★ and a skill only evolves at Lv5, so a character
  // without one ★5 skill stalls at the wave-10 boss (T0 bot: ★1 → wave 5.4, ★4 → ~12, ★5 → 19.5, classic 16.1).
  START_SP:6,
  // §3.8 starter kit vs create → sell → delete loops: the training weapon is bound (inst.b · never sells) and the 3 small potions
  // come with the first KIT_POTS characters an account ever creates (acct.kits counts them · deleting does not give one back)
  KIT_POTS:6,
  spAt(tier,jlv){ return BAL.START_SP+(tier===2 ? BAL.CAP.job1-1+jlv-1 : jlv-1); },        // skill points earned at that job level (incl. start)
  // §2.2 survival hell tiers T0–T10 · T = integer 0–10 (anything else is clamped: tier('x') = 0, tier(99) = 10)
  // hpMul / dmgMul are integer ÷ power of ten, so every row is the exact double of the §2.2 table (T3 = 1.9, not 1.8999…)
  // and T0 is strictly classic: hpMul 1 · dmgMul 1 · defK 22
  SURV:{ maxT:10, WAVES:20, unlockWave:10, dailyWave:10, dailyMul:2,
    tier(T){ const t=Math.floor(+T||0); return t<0?0:t>10?10:t; },
    recLv(T){ return Math.max(1,6*BAL.SURV.tier(T)); }, hpMul(T){ return (10+3*BAL.SURV.tier(T))/10; },
    dmgMul(T){ return (100+12*BAL.SURV.tier(T))/100; }, defK(T){ return 22+3*BAL.SURV.tier(T); },
    goldPerWave(T){ return 15+5*BAL.SURV.tier(T); }, gearTier(T){ return Math.min(5,1+Math.floor(BAL.SURV.tier(T)/2)); },
    expMul(waves,won){ return .04*waves+(won?.3:0); },                          // × bxpNeed(recLv)
    overLv(L,rec){ return L>rec+5 ? Math.max(.2,1-.08*(L-rec-5)) : 1; },
    winGoldWaves:10 },                                                          // a win adds goldPerWave × 10
  // §5.3–5.6 field
  FIELD:{ hpByLv(m){ return 1+.12*(m-1)+.0015*(m-1)*(m-1); }, dmgByLv(m){ return 1+.06*(m-1); },
    // gold of one field kill: goldF = the value before rounding (u ∈ [0,1) → U(0.7, 1.3), u = .5 → the average) · gold = rounded
    // goldMul 0.3 + exp 0.5 + diffCap 1.1 (+ per-map 60 ZONES.k): the maps paid 2–11× the gold and up to 5.4× the EXP of survival per
    // minute (no daily ×2) · now 1.6–2.0× gold · EXP g1 1.4–1.9× · s1 1.2–2.8× · o1 0.6–0.8× (docs/PROPOSAL-maps-daily.md §8, the RG.sim bot)
    goldF(m,u){ if(u===undefined) u=Math.random(); return (2+.35*m)*(.7+.6*u)*BAL.FIELD.goldMul; },
    gold(m,u){ return Math.round(BAL.FIELD.goldF(m,u)); }, goldMul:.3,
    exp:.5, diffCap:1.1,                                                        // field kill EXP × 0.5 · a higher-level mob pays at most diffMul 1.1
    steal:{cap:8, back:2},                                                      // ก็อบลินโจร: steals ≤ 8 kills' gold · killed in time = the stolen gold + 2 kills' gold
    cap:{touch:45, desk:70}, deathExp:.01, respawn:[8,15], rampage:{every:150, jitter:20, n:{touch:14, desk:18}, extra:20, sec:30},
    gemMul:3, size:{w:3200, h:2400}, points:[24,36], wander:120, aggro:260, packR:200, leash:900,
    boss:{first:120, warn:60, appear:10, leash:800, jitter:[.9,1.1], stuck:3}, potCd:8, autoPot:.35, chestCd:240 },
  // §2.4 boss hunt (lv = the boss's effective level: base Lv + diff.lv)
  BOSS:{diff:[{n:'ปกติ',hp:1,dmg:1,lv:0},{n:'ยาก',hp:2.2,dmg:1.4,lv:10},{n:'ฝันร้าย',hp:4.5,dmg:2,lv:20}],
    hp(lv,d){ return 900*BAL.FIELD.hpByLv(lv)*BAL.BOSS.diff[d].hp; },
    exp(lv,d){ return Math.round(BAL.bxpNeed(lv)*.12*[1,1.5,2.2][d]); },
    gold(lv,d){ return Math.round((100+10*lv)*[1,1.6,2.5][d]); },
    marks:[4,8,15], rune:[.08,.15,.25], uniq:[.10,.18,.30], par:[60,75,120], medalA:1.5, dailyMul:2, rush:{n:5, heal:.25, marks:30} },
  // §4.9 refine (+0 → +10). p[t] = base chance to reach +t · fail[t]: '' | 'keep' | 'down'
  REFINE:{p:[1,1,1,1,1,.80,.65,.50,.38,.26,.15], fail:['','','','','','keep','keep','down','down','down','down'],
    mat(t){ return t<=6 ? 'm_dust' : 'm_crystal'; }, pity:.04, pityMax:.20,
    fee(tier,t){ return 20*tier*t; },
    weapon(r){ return {might:Math.round((r<=6 ? .02*r : .12+.03*(r-6))*1000)/1000}; },   // +10 → might +0.24
    armor(r){ return {armor:.5*r, hp:5*r}; }, max:10 },
  // §4.6 / §4.8 / §4.10 / §4.11 prices (gold unless "marks")
  PRICE:{ u_potion_s:{buy:30, sell:8}, u_potion_l:{buy:120, sell:30}, m_dust:{buy:80, sell:20},
    m_crystal:{marks:12, sell:150}, m_seal:{marks:50, sell:300}, u_forget:{buy:2000, marks:40}, m_shard:{sell:10},
    u_dye:{buy:1500, marks:20}, u_bag10:{marks:60},
    gear(tier,rar,r){ return Math.round(15*tier*tier*(1+rar)*(1+.1*(r||0))); },
    bag:[2000,6000,15000,40000], bagStep:10, bagStart:80, stash:{marks:80, step:20, start:60},
    combine:300, shardsPerRune:4, unsocket(tier){ return 100*tier; }, stack:{use:99, mat:999} },
  // §4.12 drop rates. surv: MODES.survival.onKill looks up surv.elite / surv['boss'+wave] and passes it to rollDrops, which
  // resolves the name in DROPS (33-items-data.js: §2.2 item table, gear tier = SURV.gearTier). No key = nothing drops.
  // ท่องแดนรูน (PROPOSAL-maps-daily §1/§3–5): elShard = the element rune's shard from the slimes of บึงวุ้นหกสี · elShardX = from the
  // other elemental field monsters · named = the map's goods (rar 1) per kill · chestNamed = per camp chest / gold-rank chest
  // fboss: uniq = the boss's ★ piece · rune = its own rune (sure on the account's first kill) · shard = 1 of its rune shards · named = goods
  DROP:{ field:{gold:1, gem:1, dust:.03, crystal2:.003, crystal4:.006, shard:.01, gear:.006, potion:.02, elShard:.015, elShardX:.005, named:.0015, chestNamed:.05},
    fboss:{gold(L){ return 150+15*L; }, dust:[4,8], crystal:[1,3], gear:[1,2], uniq:.25, rune:.12, seal:.10, shard:.5, named:.15, elShard:.5},
    rampage:{dust:2, gold(L){ return 8*L; }},
    surv:{elite:'surv.elite', boss5:'surv.boss5', boss10:'surv.boss10', boss15:'surv.boss15', boss20:'surv.boss20'} },
  RESET:{gold:2000, marks:40, freeBelow:20},
  // account upgrades bought with gold (every character, every mode except classic) · acct.up[k] = 0–max
  // per: what one level adds · cost(lv) = gold to go from lv to lv+1 (500 · 750 · 1,125 … 19,222 · total ≈ 56k per line)
  UP:{ max:10, order:['xp','mag','gold','hp','dmg','drop','stat'],
    def:{ xp:{n:'EXP ที่ได้', i:'📘', per:.03}, mag:{n:'ระยะดูดของ', i:'🧲', per:.04, m:.5}, gold:{n:'ทองที่ได้จากรอบ', i:'💰', per:.01},   // mag: +5 units (0.5 m · 10 units = 1 m on the edge arrows) = ×0.04 of the base 125
      hp:{n:'HP สูงสุด', i:'❤️', per:.02}, dmg:{n:'ดาเมจ', i:'⚔️', per:.015}, drop:{n:'โอกาสดรอปของ', i:'🎁', per:.01},
      stat:{n:'ความชำนาญเริ่มรอบ', i:'🧬', per:1, unit:'ระดับ'} },   // every run starts with mastery +level on every skill (26a mxStart)
    cost(lv){ return Math.round(500*Math.pow(1.5,lv)/5)*5; } },
  // survival loot boxes (25-mode-survival.js): one appears every every[0]–every[1] s near the player · elites leave a small one
  BOX:{ every:[45,60], dist:[380,600], max:3, maxSmall:4, life:120, elite:.15,
    w:{gold:30, potion:15, dust:15, gear:10, magnet:15, bomb:10, heart:5}, gearPerT:1.5, gold:[2,4], small:.5 } };
