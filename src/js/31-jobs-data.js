/* ================= 31-jobs-data.js · lane C · pure · passives, skill requirements, stat order/names, presets ================= */
// PASSIVES[id] = {own, n, i, per} · own = class id (first job) or adv id (advanced job) · per = bonus per ★ (§3.5)
// additive keys scale linearly (★5 = ×5) · multiplier keys (cd, magnet) are raised to the ★ (cd ×0.99 at ★5 = ×0.99⁵)
const PASSIVES={
  p_heavyarms:{own:'swordsman', n:'วิชาอาวุธหนัก', i:'🛡️', per:{might:.02, hp:8}},
  p_runefocus:{own:'mage', n:'สมาธิแห่งรูน', i:'🔮', per:{area:.02, cd:.99}},
  p_huntereye:{own:'archer', n:'สายตานักล่า', i:'👁️', per:{crit:.01, might:.01}},
  p_steadyfaith:{own:'cleric', n:'ศรัทธาแน่วแน่', i:'🙏', per:{regen:.15, hp:6}},
  p_catstep:{own:'thief', n:'ฝีเท้าแมว', i:'🐾', per:{speed:.015, dodge:.01}},
  p_ironwall:{own:'knight', n:'กำแพงเหล็กไหล', i:'🧱', per:{armor:.6}},
  p_steadylance:{own:'knight', n:'ปลายหอกแน่วแน่', i:'🔱', per:{might:.025}},
  p_endlessrage:{own:'berserker', n:'โทสะไม่ดับ', i:'🔥', per:{might:.02, rage:.04}},
  p_stonehide:{own:'berserker', n:'หนังหนาดั่งหิน', i:'🪨', per:{hp:12, regen:.1}},
  p_manasea:{own:'archmage', n:'ทะเลมานา', i:'🌊', per:{area:.03}},
  p_starcalm:{own:'archmage', n:'ใจเย็นดั่งดารา', i:'✨', per:{cd:.985}},
  p_elemweave:{own:'elementalist', n:'ประสานธาตุ', i:'🌀', per:{cd:.98}},
  p_earthpull:{own:'elementalist', n:'แรงดึงพสุธา', i:'🌍', per:{dur:.04}},
  p_hawkbond:{own:'ranger', n:'ผูกพันเหยี่ยวลม', i:'🦅', per:{might:.015, speed:.01}},
  p_underwing:{own:'ranger', n:'ลมใต้ปีก', i:'🪶', per:{speed:.02}},
  p_stillbreath:{own:'sharpshooter', n:'ลมหายใจนิ่ง', i:'🎯', per:{critMult:.06}},
  p_pierceshot:{own:'sharpshooter', n:'ศรเจาะเกราะ', i:'🏹', per:{boss:.03}},
  p_dawnblessing:{own:'highcleric', n:'พรแห่งอรุณ', i:'🌅', per:{regen:.25}},
  p_lightward:{own:'highcleric', n:'ผนึกแสงคุ้มกาย', i:'🔆', per:{armor:.5, hp:6}},
  p_faithfist:{own:'templar', n:'หมัดศรัทธา', i:'👊', per:{might:.02, armor:.3}},
  p_sunfocus:{own:'templar', n:'สมาธิสุริยะ', i:'☀️', per:{cd:.985}},
  p_vitalpoint:{own:'assassin', n:'จุดตาย', i:'🗡️', per:{crit:.015}},
  p_bighunt:{own:'assassin', n:'ล่าเหยื่อใหญ่', i:'🐗', per:{boss:.03}},
  p_thinsmoke:{own:'nightblade', n:'ม่านควันจาง', i:'🍃', per:{xp:.03, magnet:1.04}},
  p_shadowstep:{own:'nightblade', n:'ย่างก้าวเงา', i:'👣', per:{dodge:.012}},
};
for(const k in PASSIVES) PASSIVES[k].id=k;
// SKILL_REQ[skill] = {need, r, lv, jlv}: learning `skill` needs `need` at ★r (adv skill 1 ← base skill ★3 · adv skill 2 ← adv skill 1 ★2)
// · lv = Base Lv · jlv = Job Lv of the current job. Character-only skills (CLASSES skx): first job 5th ← Base 8 · 6th ← Base 15 ·
// advanced 3rd ← adv skill 1 ★3 + Job 5 · 4th ← adv skill 2 ★3 + Job 10 (an old character unlocks them by playing on)
const SKILL_REQ={
  flyblade:{lv:8}, riposte:{lv:15}, palisade:{need:'lance', r:3, jlv:5}, thrust:{need:'valor', r:3, jlv:10},
  bloodrite:{need:'cyclone', r:3, jlv:5}, chainaxe:{need:'frenzy', r:3, jlv:10},
  gravorb:{lv:8}, aquaring:{lv:15}, comet:{need:'meteor', r:3, jlv:5}, rift:{need:'blizzard', r:3, jlv:10},
  volcano:{need:'vortex', r:3, jlv:5}, leafblade:{need:'spikes', r:3, jlv:10},
  lance:{need:'slash', r:3}, valor:{need:'lance', r:2},
  cyclone:{need:'blades', r:3}, frenzy:{need:'cyclone', r:2},
  meteor:{need:'flame', r:3}, blizzard:{need:'meteor', r:2},
  vortex:{need:'frost', r:3}, spikes:{need:'vortex', r:2},
  hawk:{need:'arrow', r:3}, arrownova:{need:'hawk', r:2},
  deadeye:{need:'arrow', r:3}, blast:{need:'deadeye', r:2},
  judgment:{need:'holy', r:3}, aegis:{need:'judgment', r:2},
  fists:{need:'sacred', r:3}, spheres:{need:'fists', r:2},
  phantom:{need:'dagger', r:3}, whirl:{need:'phantom', r:2},
  clones:{need:'shadow', r:3}, smoke:{need:'clones', r:2},
};
const STAT_ORDER=['STR','VIT','AGI','DEX','INT','LUK'];
const STAT_TH={STR:'ATK · พลังโจมตี', VIT:'ความอึด', AGI:'ความว่องไว', DEX:'ความแม่นยำ', INT:'สติปัญญา', LUK:'โชค'};
// PRESETS = the 5 starting points of each class; the same ratio drives [แจกอัตโนมัติ] (pgAutoStats in 42)
const PRESETS={swordsman:{STR:3,VIT:2}, mage:{INT:3,DEX:2}, archer:{DEX:3,AGI:2}, cleric:{VIT:2,INT:2,LUK:1}, thief:{AGI:3,LUK:2}};
// Thai labels of bonus keys (P.bonus / adv.bonus / passives / gear) and a formatter for the UI lanes
const JD_BONUS_TH={might:'พลังโจมตี', hp:'HP', armor:'เกราะ', regen:'ฟื้น HP/วิ', speed:'ความเร็ว', crit:'คริติคอล', critMult:'แรงคริ',
  area:'พื้นที่สกิล', dur:'ระยะเวลาสกิล', cd:'คูลดาวน์', proj:'กระสุน', magnet:'ระยะดูดของ', xp:'EXP', drop:'ดรอป', dodge:'หลบหลีก',
  rage:'โทสะ', steal:'ดูดเลือด', boss:'ดาเมจต่อบอส'};
const JD_PCT={might:1, speed:1, crit:1, area:1, dur:1, xp:1, drop:1, dodge:1, rage:1, boss:1};
// jdBonusText({might:.1, cd:.95, hp:40}) → 'พลังโจมตี +10% · คูลดาวน์ −5% · HP +40' (fam = per-family damage)
function jdBonusText(b){
  const out=[], r2=v=>String(+(+v).toFixed(2)), pc=v=>String(+(v*100).toFixed(1));
  for(const k in b||{}){ const v=b[k];
    if(k==='fam'){ for(const f in v) if(v[f]) out.push('ดาเมจต่อเผ่า '+f+' +'+pc(v[f])+'%'); continue; }
    if(typeof v!=='number'||!isFinite(v)) continue;
    const n=JD_BONUS_TH[k]||k;
    if(k==='cd'||k==='magnet'){ if(v===1) continue; const d=v-1; out.push(n+' '+(d<0?'−':'+')+pc(Math.abs(d))+'%'); continue; }
    if(!v) continue;
    if(k==='critMult'){ out.push(n+' '+(v<0?'−':'+')+r2(Math.abs(v))+'×'); continue; }
    out.push(n+' '+(v<0?'−':'+')+(JD_PCT[k]?pc(Math.abs(v))+'%':r2(Math.abs(v))));
  }
  return out.join(' · ');
}
// value of one passive at ★r (additive × r · multiplier ^ r), the unit used by passiveBonus() and the skills page
function jdPassiveAt(id,r){ const d=PASSIVES[id], o={}; if(!d||!(r>0)) return o;
  for(const k in d.per){ const v=d.per[k]; o[k]=(k==='cd'||k==='magnet')?Math.pow(v,r):v*r; } return o; }
