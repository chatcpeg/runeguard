/* ================= 29-elements.js · lane B · elements + monster rank colours (docs/PROPOSAL-maps-daily.md §1–2 · phase A) ================= */
// Elements: a skill hits a monster that HAS an element (e.el) → ×1.5 strong · ×0.6 resisted · ×0.75 same · ×1 otherwise.
// Undead of classic / survival have no element → ×1 → the golden runs and the survival balance never change.
// Ranks: monsters of the new modes (daily dungeons, later the maps) get a colour rank with its own HP / damage / size / EXP.
const EL={
  fire:{n:'ไฟ', i:'🔥', c:'#ff7a3d'}, water:{n:'น้ำ', i:'💧', c:'#5fb8ff'}, wind:{n:'ลม', i:'🌪️', c:'#7fe0b0'},
  earth:{n:'ดิน', i:'🪨', c:'#c89a5a'}, light:{n:'แสง', i:'✨', c:'#ffe27a'}, dark:{n:'มืด', i:'🌑', c:'#b48cff'}};
const EL_BEATS={fire:'wind', wind:'earth', earth:'water', water:'fire', light:'dark', dark:'light'};   // wheel fire → wind → earth → water → fire · light ⇄ dark
const EL_MUL={strong:1.5, weak:.6, same:.75};
function elMul(atk,def){ if(!atk||!def) return 1; if(atk===def) return EL_MUL.same; if(EL_BEATS[atk]===def) return EL_MUL.strong; if(EL_BEATS[def]===atk) return EL_MUL.weak; return 1; }
// skill elements (§1.3) · skills that deal no damage and the plain weapon skills have none
const SK_EL={flame:'fire', meteor:'fire', trap:'fire', blast:'fire', spheres:'fire',
  frost:'water', blizzard:'water',
  thunder:'wind', vortex:'wind', cyclone:'wind', spread:'wind', hawk:'wind',
  slam:'earth', spikes:'earth', bulwark:'earth',
  holy:'light', sacred:'light', cross:'light', judgment:'light', fists:'light', blades:'light',
  venom:'dark', shadow:'dark', phantom:'dark', clones:'dark', deadeye:'dark'};
const SK_EVO_EL={mbolt:'light'};                                         // ศรดวงดาว: the evolution turns light (§1.3)
for(const id in SK_EL) if(SK[id]) SK[id].el=SK_EL[id];
function skEl(s){ if(!s||!s.def) return null; if(s.evolved&&SK_EVO_EL[s.id]) return SK_EVO_EL[s.id]; return s.def.el||null; }
function elChip(el){ const E=el&&EL[el]; return E?E.i:''; }
// damageEnemy calls this only when the monster has an element · remembers the last result for the label over its head
function elHit(e,s){ const m=elMul(skEl(s),e.el); if(m!==1){ e.elM=m; e.elT=G.t; } return m; }

/* ---- rank colours (§2) ---- */
const RANK=[
  {n:'', c:'', hp:1, dmg:1, r:1, xp:1, sp:1},
  {n:'ชำนาญ', c:'#5fb8ff', hp:1.8, dmg:1.25, r:1.1, xp:2, sp:1.1},
  {n:'หัวหน้า', c:'#c07aff', hp:3.5, dmg:1.5, r:1.25, xp:4, sp:1},
  {n:'ยอดฝีมือ', c:'#f0b545', hp:7, dmg:1.8, r:1.4, xp:10, sp:1}];
const RANK_W=[80,14,5,1];                                                // chance weights of ranks 0–3 (§2)
function rankRoll(boost){ let w=RANK_W.slice(); if(boost){ w[1]*=boost; w[2]*=boost; w[3]*=boost; } const t=w[0]+w[1]+w[2]+w[3]; let r=Math.random()*t;
  for(let i=0;i<4;i++){ r-=w[i]; if(r<=0) return i; } return 0; }
function rankApply(e,k){ const R=RANK[k|0]; if(!R||!k) return e; e.rank=k; e.hp*=R.hp; e.maxHp*=R.hp; e.dmg*=R.dmg; e.r*=R.r; e.speed*=R.sp; e.xp=Math.max(1,Math.round(e.xp*R.xp)); e.mass*=R.r*R.r; return e; }

/* ---- monsters of the new modes (painters reused + tint · goblin has its own painter) ---- */
Object.assign(EN,{
  dg_wisp:{n:'ภูตแสงเรือง', base:'wraith', tint:'#fff2a0', hp:9, speed:96, r:11, dmg:0, mass:.4, xp:2, goo:'#fff2a0', phase:1, el:'light', flee:1},
  dg_gwisp:{n:'ภูตทองคำ', base:'wraith', tint:'#f0b545', hp:22, speed:112, r:13, dmg:0, mass:.5, xp:6, goo:'#f0b545', phase:1, el:'light', flee:1, pts:5},
  dg_shade:{n:'เงาไล่ภูต', base:'bat', tint:'#6a4a9a', hp:10, speed:128, r:9, dmg:5, mass:.4, xp:1, goo:'#8a5aaa', erratic:1, fly:1, accel:8, el:'dark'},
  dg_courier:{n:'ก็อบลินแบกถุงทอง', base:'goblin', hp:26, speed:104, r:12, dmg:0, mass:.8, xp:3, goo:'#7fae5a', el:'earth', flee:1, bag:1},
  dg_raider:{n:'ก็อบลินถือกระบอง', base:'goblin', tint:'#7a4a2a', hp:18, speed:84, r:12, dmg:7, mass:1, xp:2, goo:'#7fae5a', el:'earth'},
  dg_slinger:{n:'ก็อบลินปาหิน', base:'goblin', tint:'#5a6a3a', hp:16, speed:70, r:11, dmg:5, mass:.8, xp:2, goo:'#7fae5a', ranged:1, keep:220, shotCd:2.4, shotSp:200, shotDmg:6, el:'earth'},
  dg_ember:{n:'ร่างรูนเพลิง', base:'shambler', tint:'#ff6a2a', hp:22, speed:56, r:13, dmg:8, mass:1, xp:2, goo:'#ff8a3a', el:'fire'},
  dg_tide:{n:'ร่างรูนธารา', base:'shambler', tint:'#3a8aff', hp:22, speed:56, r:13, dmg:8, mass:1, xp:2, goo:'#5fb8ff', el:'water'},
  dg_gale:{n:'ร่างรูนวายุ', base:'runner', tint:'#5fe0a0', hp:14, speed:104, r:11, dmg:6, mass:.8, xp:2, goo:'#7fe0b0', accel:7, el:'wind'},
  dg_stone:{n:'ร่างรูนศิลา', base:'brute', tint:'#a8824a', hp:70, speed:40, r:20, dmg:14, mass:4, xp:4, goo:'#c89a5a', el:'earth'},
  dg_halo:{n:'ร่างรูนอรุณ', base:'wraith', tint:'#ffe27a', hp:26, speed:70, r:13, dmg:8, mass:.6, xp:3, goo:'#ffe27a', phase:1, el:'light'},
  dg_gloom:{n:'ร่างรูนราตรี', base:'spitter', tint:'#6a3aaa', hp:24, speed:52, r:12, dmg:6, mass:.9, xp:3, goo:'#b48cff', ranged:1, keep:240, shotCd:2.6, shotSp:210, shotDmg:7, el:'dark'},
  dg_guard:{boss:1, n:'ผู้เฝ้าคลังรูน', base:'colossus', ai:'colossus', tint:'#4a7ab8', hp:2400, speed:58, r:40, dmg:22, mass:70, xp:120, goo:'#8fb8ff'}});

// goblin painter: small green body, big ears, leather vest · a sack on the back for couriers (d.bag)
if(typeof EDRAW!=='undefined'){                                         // painters (13) · absent in pure test loads
EDRAW.goblin=function(c,f){ const s=W4[f]*1.8, b=Math.abs(W4[f])*.6; c.translate(0,-b);
  c.fillStyle='#3a2a1a'; c.fillRect(-5,4,4,8+s*.5+b); c.fillRect(1.5,4,4,8-s*.5+b);
  c.fillStyle='#2a1c10'; c.fillRect(-5.5,10.5+s*.5+b,5,2.4); c.fillRect(1,10.5-s*.5+b,5,2.4);
  limb(c,'#6fa04e',3.4,-1,-2,10,-4+s); circ(c,'#6fa04e',10.5,-4+s,2.2);
  c.fillStyle='#5a3a22'; rrect(c,-7,-6,14,12,4); c.fill(); c.fillStyle='#7a5230'; c.fillRect(-7,-1,14,2.4);
  circ(c,'#7fb85a',0,-11,7.5);
  c.fillStyle='#6fa04e'; c.beginPath(); c.moveTo(-6,-13); c.lineTo(-15,-17); c.lineTo(-6,-9); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(6,-13); c.lineTo(15,-17); c.lineTo(6,-9); c.closePath(); c.fill();
  c.fillStyle='#fff6c0'; c.fillRect(-4,-12,2.6,2.6); c.fillRect(1.6,-12,2.6,2.6); c.fillStyle='#1a1008'; c.fillRect(-3.2,-11.4,1.3,1.4); c.fillRect(2.4,-11.4,1.3,1.4);
  c.fillStyle='#3a5a2a'; c.fillRect(-2,-7.5,4,1.2); };
EDRAW.goblinbag=function(c,f){ c.save(); c.fillStyle='#c8a050'; c.beginPath(); c.ellipse(-7,-4,7,8,-.3,0,TAU); c.fill(); c.fillStyle='#a8823a'; c.fillRect(-9,-12,4,3);
  c.fillStyle='#ffe28a'; c.font='bold 8px sans-serif'; c.textAlign='center'; c.fillText('$',-7,-1); c.restore(); EDRAW.goblin(c,f); }; }
EN.dg_courier.base='goblinbag';
