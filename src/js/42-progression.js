/* ================= 42-progression.js · lane C · pure per ch · levels, points, jobs, skills, prepareRun, onRunEnd ================= */
/* M0 stub: frozen signatures from DESIGN §7.8, neutral values — classic never calls these. Lane C writes the real body. */
function metaBonus(ch){ return {}; }
function passiveBonus(ch){ return {}; }
function buildRunBonus(ch){ return {}; }
function commitStats(ch,delta){ return false; }
function resetStats(ch,o){ return false; }                 // o = {scroll}
function grantExp(ch,base,job){ return {lvUp:0, jobUp:0}; }
function canLearn(ch,id){ return 'ยังไม่เปิดระบบสกิล'; }
function learnSkill(ch,id){ return false; }
function learnPassive(ch,id){ return false; }
function resetSkills(ch,o){ return false; }                // o = {scroll}
function setLoadout(ch,ids){ return false; }
function jobReqs(ch,advId){ return []; }                   // → [{t, ok}]
function advanceJob(ch,advId){ return false; }
function prepareRun(G,P,ch,modeId){}
function onRunEnd(G,won,o){ return null; }                 // o = {commit} → Reward {runId, baseXp, jobXp, gold, marks, items, lvUp, jobUp, unlocks}
function grantRewards(ch,r){ return false; }               // idempotent by r.runId
function fieldKillExp(ch,e){ return {base:0, job:0}; }

