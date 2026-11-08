/* ================= 31-jobs-data.js · lane C · pure · passives, skill requirements, stat order/names, presets ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane C writes the real body. */
const PASSIVES={};       // id → {own, n, i, per:{…}} (§3.5)
const SKILL_REQ={};      // skill id → {need, r}
const STAT_ORDER=['STR','VIT','AGI','DEX','INT','LUK'];
const STAT_TH={STR:'ATK · พลังโจมตี', VIT:'ความอึด', AGI:'ความว่องไว', DEX:'ความแม่นยำ', INT:'สติปัญญา', LUK:'โชค'};
const PRESETS={swordsman:{STR:3,VIT:2}, mage:{INT:3,DEX:2}, archer:{DEX:3,AGI:2}, cleric:{VIT:2,INT:2,LUK:1}, thief:{AGI:3,LUK:2}};

