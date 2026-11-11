/* ================= 42-progression.js · lane C · pure per ch · levels, points, jobs, skills, prepareRun, onRunEnd ================= */
// Rules: DESIGN §3 (levels, stat/skill points, job tree, ★ ranks, loadout, passives, derived stats) · §2.2 survival rewards.
// Account-wide data (gold, marks, runIds, records, daily — Q7) lives in SAVE.acct. Mutators return false on a read-only save,
// and save themselves when ch belongs to SAVE: player actions (stats, skills, passives, loadout, resets, job change, rewards) at once
// (saveNow) — a debounced write that meets another tab's save is dropped by the reload · EXP / field death are debounced (saveLocal).
// Every player action starts with pgFresh(ch): a stale tab reloads the other tab's save first and acts on that (never loses it).
const PG_START={survival:'first', field:'all1', boss:'rank', trial:'rank', dexp:'all1', dgold:'all1', drare:'all1'};   // skills at run start (§3.6) · other modes: 'first'
const PG_TIP='ความชำนาญเริ่มที่ 1 ทุกครั้ง · สกิลอัปได้ถึง ★ ที่ฝึกไว้';
const PG_RUNIDS=[];                                                            // fallback when there is no SAVE (never in the game)
function pgAcct(){ return SAVE&&SAVE.acct||null; }
function pgCls(ch){ return ch&&typeof CLS!=='undefined'&&svHas(CLS,ch.cls)?CLS[ch.cls]:null; }
function pgAdvOf(ch){ const c=pgCls(ch); return c&&ch.job&&c.adv.find(a=>a.id===ch.job)||null; }
function pgTier(ch){ return pgAdvOf(ch)?2:1; }
function pgJobCap(ch){ return pgAdvOf(ch)?BAL.CAP.job2:BAL.CAP.job1; }
function pgSkillPool(ch){ const c=pgCls(ch), a=pgAdvOf(ch); return c?clsSkills(c).concat(advSkills(a)):[]; }   // skills ch may train now (+ character-only skx)
// SKILL_REQ of skill id still missing for ch → its reason ('' = met · no entry = met)
function pgReqWhy(ch,id){ const q=svHas(SKILL_REQ,id)?SKILL_REQ[id]:null; if(!q||!ch) return '';
  if(q.lv&&(ch.lv|0)<q.lv) return 'ต้องมีเลเวลตัวละคร '+q.lv+' ก่อน (ตอนนี้ '+(ch.lv|0)+')';
  if(q.need&&((ch.sk||{})[q.need]|0)<q.r) return 'ต้องฝึก '+SK[q.need].n+' ถึง ★'+q.r+' ก่อน';
  if(q.jlv&&(ch.jlv|0)<q.jlv) return 'ต้องมีเลเวลอาชีพ '+q.jlv+' ก่อน (ตอนนี้ '+(ch.jlv|0)+')';
  return ''; }
function pgPasPool(ch){ const out=[]; if(!ch) return out; for(const id in PASSIVES){ const w=PASSIVES[id].own; if(w===ch.cls||(ch.job&&w===ch.job)) out.push(id); } return out; }
function pgRO(){ return typeof saveReadOnly==='function'&&saveReadOnly(); }
function pgSave(ch,reason,now){ if(!SAVE||!Array.isArray(SAVE.chars)) return;
  if(SAVE.chars.indexOf(ch)<0){ if(ch&&SAVE.chars.some(c=>c&&c.id===ch.id)) console.warn('Runeguard: ไม่ได้บันทึก · ตัวละครถูกโหลดใหม่จากอีกแท็บแล้ว'); return; }
  if(now) saveNow(reason); else saveLocal(reason); }
// a held character re-found by id in the current SAVE (a reload from another tab leaves the old object behind) → G.char and
// G.opts.char follow it · null = SAVE has no such character any more (deleted in another tab)
function pgLive(G,ch){
  if(!ch||!SAVE||!Array.isArray(SAVE.chars)||SAVE.chars.indexOf(ch)>=0) return ch;
  const f=SAVE.chars.find(c=>c&&c.id===ch.id)||null;
  if(f&&G){ if(G.char===ch) G.char=f; if(G.opts&&G.opts.char===ch) G.opts.char=f; }
  return f; }
// entry of every player action (stale tab): another tab saved → reload BEFORE changing anything, then act on the reloaded character
// (found by id; an object left over from an earlier reload is followed the same way). Deleted in the other tab → null = refused.
// A character that has never been in SAVE (pure use: tests, previews) is returned as it is.
function pgFresh(ch){
  if(!ch||typeof ch!=='object') return null;
  const inSave=()=>!!(SAVE&&Array.isArray(SAVE.chars));
  const had=inSave()&&SAVE.chars.some(c=>c&&c.id===ch.id)||typeof svlWasSaved==='function'&&svlWasSaved(ch);
  if(typeof svlFresh==='function') try{ svlFresh(); }catch(e){ console.error(e); }
  if(!inSave()||SAVE.chars.indexOf(ch)>=0) return ch;
  return SAVE.chars.find(c=>c&&c.id===ch.id)||(had?null:ch); }
function pgR6(v){ return Math.round(v*1e6)/1e6; }
// points bookkeeping (also used by validateSave)
function pgSpSpent(ch){ const c=pgCls(ch); let n=0; if(!c) return 0;
  for(const id in ch.sk||{}) n+=BAL.rankSpent(ch.sk[id]|0);
  if((ch.sk||{})[c.skills[0]]>0) n-=BAL.RANK_COST[1];                   // ★1 of the first skill is free (§3.5)
  for(const id in ch.pas||{}) n+=(ch.pas[id]|0)*BAL.PAS_COST; return n; }
function pgStSpent(ch){ return STAT_ORDER.reduce((n,k)=>n+BAL.statSpent((ch.st||{})[k]|0),0); }
function pgStatCost(ch,delta){ let n=0; for(const k in delta||{}){ const x=(ch.st||{})[k]|0, d=delta[k]|0; for(let i=x;i<x+d&&i<BAL.CAP.stat;i++) n+=BAL.statCost(i); } return n; }

/* ---- derived stats: P.bonus = mergeBonus(adv.bonus, metaBonus, passiveBonus, gearBonus) (§3.7) ---- */
function metaBonus(ch){
  const b={}; if(!ch) return b; const K=BAL.META_K, s=ch.st||{}, L=Math.max(0,(ch.lv|0)-1);
  const add=(k,v)=>{ v=pgR6(v); if(v) b[k]=pgR6((b[k]||0)+v); };
  add('might',K.STR.might*(s.STR|0)+K.LV.might*L);
  add('hp',K.VIT.hp*(s.VIT|0)+K.LV.hp*L); add('regen',K.VIT.regen*(s.VIT|0)); add('armor',K.VIT.armor*(s.VIT|0));
  add('speed',Math.min(K.AGI.speedMax,K.AGI.speed*(s.AGI|0)));
  const cd=pgR6(Math.pow(K.AGI.cd,s.AGI|0)*Math.pow(K.DEX.cd,s.DEX|0)); if(cd!==1) b.cd=cd;
  if((s.DEX|0)>=40) b.proj=K.DEX.proj40;
  add('area',K.INT.area*(s.INT|0)); add('dur',K.INT.dur*(s.INT|0));
  add('crit',K.LUK.crit*(s.LUK|0)); add('critMult',K.LUK.critMult*(s.LUK|0)); add('drop',K.LUK.drop*(s.LUK|0)); add('xp',K.LUK.xp*(s.LUK|0));
  return b; }
function passiveBonus(ch){
  if(!ch) return {}; const b=mergeBonus(...pgPasPool(ch).map(id=>jdPassiveAt(id,Math.min(BAL.CAP.rank,(ch.pas||{})[id]|0))));
  for(const k in b) if(typeof b[k]==='number') b[k]=pgR6(b[k]); return b; }
// the complete permanent bonus of a run — exactly what prepareRun puts in P.bonus (a fresh character with no gear → {})
function buildRunBonus(ch){
  if(!ch) return {}; const a=pgAdvOf(ch), g=typeof gearBonus==='function'?gearBonus(ch):null;
  const b=mergeBonus(a&&a.bonus, metaBonus(ch), passiveBonus(ch), g, upBonus(ch,null));
  const hp=pgUpLv('hp'); if(hp){ const c=pgCls(ch); b.hp=(b.hp||0)+Math.round(BAL.UP.def.hp.per*hp*((c?c.hp:0)+(b.hp||0))); }   // HP % of class base + every flat HP above
  for(const k in b) if(typeof b[k]==='number') b[k]=pgR6(b[k]); return b; }
/* ---- account upgrades (gold · BAL.UP · acct.up) ---- */
function pgUpLv(k){ const A=pgAcct(), u=A&&A.up; return u&&svHas(u,k)?Math.max(0,Math.min(BAL.UP.max,u[k]|0)):0; }
// the run bonus part of the upgrades (hp is added by buildRunBonus as a % of the rest · gold is paid in onRunEnd)
function upBonus(){ const U=BAL.UP.def, b={}, v=k=>pgUpLv(k)*U[k].per;
  if(v('xp')) b.xp=pgR6(v('xp')); if(pgUpLv('stat')) b.mxStart=pgUpLv('stat'); if(v('mag')) b.magnet=pgR6(1+v('mag')); if(v('dmg')) b.might=pgR6(v('dmg')); if(v('drop')) b.drop=pgR6(v('drop'));
  return b; }
function upCost(k){ const lv=pgUpLv(k); return svHas(BAL.UP.def,k)&&lv<BAL.UP.max?BAL.UP.cost(lv):0; }
// buy one level of upgrade k → '' = done (saved) · otherwise the reason, nothing changed
function buyUpgrade(k){
  if(!svHas(BAL.UP.def,k)) return 'ไม่มีหัวข้อนี้'; if(pgRO()) return 'เซฟนี้อ่านอย่างเดียว';
  if(typeof G!=='undefined'&&G&&G.char&&!G.over) return 'อัปเกรดได้ที่ป้อมเท่านั้น';
  if(typeof svlFresh==='function') svlFresh();                         // another tab's write first: pay from its gold, not ours
  if(pgRO()) return 'เซฟนี้อ่านอย่างเดียว';                            // svlFresh may have loaded a newer app's (read-only) save
  const A=pgAcct(); if(!A) return 'ไม่มีข้อมูลบัญชี'; if(!svObj(A.up)) A.up={};
  const lv=pgUpLv(k), price=upCost(k); if(!price) return 'อัปเกรดเต็มแล้ว';
  if((A.gold|0)<price) return 'ทองไม่พอ (ต้องใช้ '+price.toLocaleString('en-US')+')';
  A.gold-=price; A.up[k]=lv+1;
  const S0=SAVE; if(typeof saveNow==='function') saveNow('upgrade');
  return SAVE===S0?'':typeof SVL_RACE==='string'?SVL_RACE:'ข้อมูลถูกแก้จากอีกแท็บ'; }   // a reload in svlWrite = the purchase is in neither copy

/* ---- stat points (§3.3) ---- */
function commitStats(ch,delta){
  ch=pgFresh(ch); if(!ch||!svObj(delta)||pgRO()) return false; let cost=0, any=false; const nx={};
  for(const k in delta){ if(STAT_ORDER.indexOf(k)<0) return false; const n=delta[k];
    if(!Number.isInteger(n)||n<0) return false; if(!n) continue;
    const x=ch.st[k]|0; if(x+n>BAL.CAP.stat) return false;
    for(let i=x;i<x+n;i++) cost+=BAL.statCost(i); nx[k]=x+n; any=true; }
  if(!any||cost>ch.pts) return false;
  Object.assign(ch.st,nx); ch.pts-=cost; pgSave(ch,'stats',true); return true; }
// [แจกอัตโนมัติ]: spend up to `pts` (default all) by the class preset ratio → delta for commitStats (pure, no change)
function pgAutoStats(ch,pts){
  const w=PRESETS[ch.cls]||{STR:1}, d={}; let left=pts==null?ch.pts|0:pts|0;
  for(let guard=0;guard<400;guard++){ let best=null, bv=1e9;
    for(const k of STAT_ORDER){ if(!w[k]) continue; const x=(ch.st[k]|0)+(d[k]|0); if(x>=BAL.CAP.stat||BAL.statCost(x)>left) continue;
      const v=x/w[k]; if(v<bv){ bv=v; best=k; } }
    if(!best) break; left-=BAL.statCost((ch.st[best]|0)+(d[best]|0)); d[best]=(d[best]|0)+1; }
  return d; }
// how a reset is paid now: 'free' (Base < 20) · 'freeOnce' (the one free reset) · 'scroll' (ม้วนลืมเลือน)
function pgResetWay(ch,kind){ if((ch.lv|0)<BAL.RESET.freeBelow) return 'free'; const f=kind==='sk'?ch.resets.skFree:ch.resets.free; return f?'freeOnce':'scroll'; }
function pgPayReset(ch,kind,o){ const way=pgResetWay(ch,kind);
  if(way==='scroll'){ if(!(o&&o.scroll)) return false; if(!(typeof invRemove==='function'&&invRemove(ch,'u_forget',1))) return false; }
  if(way==='freeOnce'){ if(kind==='sk') ch.resets.skFree=0; else ch.resets.free=0; }
  return true; }
function resetStats(ch,o){
  ch=pgFresh(ch); if(!ch||pgRO()) return false; const spent=pgStSpent(ch); if(!spent) return false;
  if(!pgPayReset(ch,'st',o)) return false;
  for(const k of STAT_ORDER) ch.st[k]=0; ch.pts+=spent; pgSave(ch,'resetStats',true); return true; }

/* ---- EXP (§3.2) ---- */
// grantExp keeps the frozen shape {lvUp, jobUp}; Base-60 overflow gold goes straight to acct.gold (pgGrantExp also reports it)
function grantExp(ch,base,job){ const r=pgGrantExp(ch,base,job); return {lvUp:r.lvUp, jobUp:r.jobUp}; }
function pgGrantExp(ch,base,job){
  const out={lvUp:0, jobUp:0, gold:0}; if(!pgCls(ch)||typeof ch.lv!=='number'||pgRO()) return out;
  base=Math.max(0,Math.floor(+base||0)); job=Math.max(0,Math.floor(+job||0)); const cap=BAL.CAP;
  if(ch.lv>=cap.base) out.gold+=Math.floor(base*BAL.OVER_GOLD);
  else { ch.xp+=base;
    while(ch.lv<cap.base&&ch.xp>=BAL.bxpNeed(ch.lv)){ ch.xp-=BAL.bxpNeed(ch.lv); ch.lv++; ch.pts+=BAL.statPtsFor(ch.lv); out.lvUp++; }
    if(ch.lv>=cap.base){ out.gold+=Math.floor(ch.xp*BAL.OVER_GOLD); ch.xp=0; } }
  const tier=pgTier(ch), jcap=pgJobCap(ch);
  if(ch.jlv<jcap){ ch.jxp+=job;
    while(ch.jlv<jcap&&ch.jxp>=BAL.jxpNeed(ch.jlv,tier)){ ch.jxp-=BAL.jxpNeed(ch.jlv,tier); ch.jlv++; ch.sp++; out.jobUp++; } }
  if(ch.jlv>=jcap) ch.jxp=0;                                             // job EXP past the cap is not kept
  const A=pgAcct(); if(out.gold&&A) A.gold=Math.min(cap.gold,A.gold+out.gold);
  if(base||job) pgSave(ch,'exp');
  return out; }
// field kill (§3.2): mobExp(e.lv) · diffMul(e.lv − ch.lv) · P.xpMul → {base, job}
function fieldKillExp(ch,e){
  if(!ch||!e) return {base:0, job:0}; const m=Math.max(1,e.lv|0||(e.d&&e.d.lv)|0||1);
  const xm=(typeof P!=='undefined'&&P&&P.xpMul)||1;
  const base=Math.round(BAL.mobExp(m)*BAL.diffMul(m-(ch.lv|0))*xm);
  return {base, job:Math.round(base*BAL.JOB_EXP)}; }
// field death (§2.3): lose 1% of bxpNeed(lv) inside the current level (never below 0, never a level down)
function pgFieldDeath(ch){ if(!ch||pgRO()) return 0; const loss=Math.min(ch.xp|0,Math.round(BAL.bxpNeed(ch.lv)*BAL.FIELD.deathExp));
  ch.xp-=loss; ch.deaths=(ch.deaths|0)+1; pgSave(ch,'death'); return loss; }

/* ---- skills, passives, loadout (§3.5) ---- */
function canLearn(ch,id){
  if(!ch) return 'ไม่มีตัวละคร';
  if(pgRO()) return 'ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป แก้ไขไม่ได้';
  const c=pgCls(ch); if(!c) return 'ไม่พบอาชีพ';
  if(svHas(PASSIVES,id)){ const d=PASSIVES[id], r=(ch.pas||{})[id]|0;
    if(d.own!==ch.cls&&d.own!==ch.job){ const a=c.adv.find(x=>x.id===d.own); return a?'ต้องเลื่อนเป็น'+a.n+'ก่อน':'ไม่ใช่ความสามารถติดตัวของอาชีพนี้'; }
    if(r>=BAL.CAP.rank) return 'ฝึกถึง ★'+BAL.CAP.rank+' แล้ว';
    if(ch.sp<BAL.PAS_COST) return 'แต้มสกิลไม่พอ (ต้องใช้ '+BAL.PAS_COST+')';
    return ''; }
  if(!svHas(SK,id)) return 'ไม่พบสกิลนี้';
  if(pgSkillPool(ch).indexOf(id)<0){ const a=c.adv.find(x=>advSkills(x).indexOf(id)>=0); return a&&!ch.job?'ต้องเลื่อนเป็น'+a.n+'ก่อน':'สกิลนี้ไม่ใช่ของอาชีพนี้'; }
  const r=(ch.sk||{})[id]|0, rc=rankCap(ch,id); if(r>=rc) return rc<8&&clsSkills(c).indexOf(id)>=0?'ฝึกถึง ★'+rc+' แล้ว · เลื่อนอาชีพเพื่อเปิด ★6–8':'ฝึกถึง ★'+rc+' แล้ว';
  const why=pgReqWhy(ch,id); if(why) return why;
  const cost=BAL.RANK_COST[r+1]; if(ch.sp<cost) return 'แต้มสกิลไม่พอ (ต้องใช้ '+cost+')';
  return ''; }
function learnSkill(ch,id){
  ch=pgFresh(ch); if(!ch) return false;
  if(svHas(PASSIVES,id)) return learnPassive(ch,id);
  if(canLearn(ch,id)!=='') return false;
  const r=ch.sk[id]|0; ch.sp-=BAL.RANK_COST[r+1]; ch.sk[id]=r+1;
  if(r===0&&ch.load.indexOf(id)<0&&ch.load.length<BAL.LOADOUT[pgTier(ch)]) ch.load.push(id);   // a newly learned skill takes a free slot
  pgSave(ch,'skill',true); return true; }
function learnPassive(ch,id){
  ch=pgFresh(ch); if(!ch||!svHas(PASSIVES,id)||canLearn(ch,id)!=='') return false;
  ch.sp-=BAL.PAS_COST; ch.pas[id]=(ch.pas[id]|0)+1; pgSave(ch,'passive',true); return true; }
function resetSkills(ch,o){
  ch=pgFresh(ch); if(!ch||pgRO()) return false; const c=pgCls(ch); if(!c) return false;
  const spent=pgSpSpent(ch); if(!spent) return false;
  if(!pgPayReset(ch,'sk',o)) return false;
  const first=c.skills[0]; ch.sk={[first]:1}; ch.pas={}; ch.sp+=spent; tfSanitize(ch);   // trees whose ★ requirement is gone go too (rune points back)
  ch.load=ch.load.filter(id=>ch.sk[id]>0); if(!ch.load.length) ch.load=[first];
  pgSave(ch,'resetSkills',true); return true; }
function setLoadout(ch,ids){
  ch=pgFresh(ch); if(!ch||pgRO()||!Array.isArray(ids)) return false; const pool=pgSkillPool(ch), max=BAL.LOADOUT[pgTier(ch)];
  if(!ids.length||ids.length>max) return false;
  for(let i=0;i<ids.length;i++){ const id=ids[i]; if(pool.indexOf(id)<0||!((ch.sk[id]|0)>0)||ids.indexOf(id)!==i) return false; }
  ch.load=ids.slice(); pgSave(ch,'loadout',true); return true; }

/* ---- job advancement (§3.4) ---- */
function jobReqs(ch,advId){
  const A=pgAcct(), gold=A?A.gold:0, R=BAL.ADV;
  return [
    {t:'เลเวลตัวละคร '+R.base+' ขึ้นไป (ตอนนี้ '+(ch.lv|0)+')', ok:(ch.lv|0)>=R.base},
    {t:'เลเวลอาชีพ '+R.job+' (เต็มขั้นต้น · ตอนนี้ '+(ch.job?'เลื่อนแล้ว':ch.jlv|0)+')', ok:!ch.job&&(ch.jlv|0)>=R.job},
    {t:'ผ่านบททดสอบเลื่อนขั้น', ok:!!(ch.trial&&ch.trial.t2===1)},
    {t:'ค่าพิธี '+R.fee.toLocaleString('en-US')+' ทอง (มี '+gold.toLocaleString('en-US')+')', ok:gold>=R.fee}]; }
function advanceJob(ch,advId){
  ch=pgFresh(ch); if(!ch||pgRO()||ch.job) return false;                 // once only, permanent
  const c=pgCls(ch), a=c&&c.adv.find(x=>x.id===advId); if(!a) return false;
  if(!jobReqs(ch,advId).every(q=>q.ok)) return false;
  const A=pgAcct(); if(!A||A.gold<BAL.ADV.fee) return false;
  A.gold-=BAL.ADV.fee; ch.job=a.id; ch.jlv=1; ch.jxp=0;
  pgSave(ch,'advance',true); BUS.emit('char',ch); return true; }

/* ---- runs ---- */
// newRun → recalc → prepareRun: the run's player becomes the character (job, ★ caps, loadout, permanent bonus)
function prepareRun(G,P,ch,modeId){
  ch=pgLive(G,ch)||ch;                                                  // [เล่นอีกครั้ง] restarts with G.opts.char: maybe a reloaded-away object
  const a=pgAdvOf(ch);
  P.adv=a; P.advOffered=true;                                           // never the Lv15 job pick (G.ui never 'adv')
  P.look=Object.assign({},P.cls.look,a?a.look:null,typeof gearLook==='function'?gearLook(ch):null);
  P.bonus=buildRunBonus(ch);
  P.sx=true; P.permSt=Object.assign({},ch.st||{});                     // uncapped stat cards + main-stat power (26-stat-scaling)
  P.rank={}; for(const id of pgSkillPool(ch)){ const r=(ch.sk||{})[id]|0; if(r>0) P.rank[id]=Math.min(rankCap(ch,id),r); }
  P.tree=tfRunTree(ch);                                                  // skill trees (27): numbers + effects through sxMods
  P.loadout=(ch.load||[]).filter(id=>P.rank[id]>0&&svHas(SK,id));
  if(!P.loadout.length){ const f=P.cls.skills[0]; P.loadout=[f]; P.rank[f]=Math.max(1,P.rank[f]|0); }
  P.lv=1; P.xp=0; P.need=xpNeed(1);                                     // proficiency restarts every run
  const how=PG_START[modeId]||'first';
  P.sl={}; for(const id of P.loadout){ const v=Math.min(slOf(ch,id),P.rank[id]||1); if(v>1) P.sl[id]=v; }   // starting Lv (28)
  G.rerolls=runRerolls();                                               // 2 · supporter: unlimited (28)
  if(how==='first'){ const s=makeSkill(P.loadout[0]); if(P.sl[s.id]) s.lv=P.sl[s.id]; P.skills=[s]; }
  else P.skills=P.loadout.map(id=>{ const s=makeSkill(id); if(P.sl[id]) s.lv=P.sl[id];   // 'all1' (field) also starts at the starting Lv
    if(how==='rank'){ s.lv=P.rank[id]; const e=s.def.evo; if(s.lv>=5&&e&&((ch.st||{})[e.s]|0)>=25) s.evolved=true; }
    return s; });
  recalc(P); P.hp=P.maxHp;
  G.goldRun=0; G.charTip=!ch.play&&!ch.kills&&how!=='rank'?PG_TIP:'';  // the tip is about cards: not for modes that start at ★ (CR-C1)
}
// endRun → onRunEnd: compute the Reward; keep it only when o.commit (core passes !G.auto || DEV.commit)
function onRunEnd(G,won,o){
  let ch=G&&G.char; if(!ch) return null;
  if(typeof svlFresh==='function') svlFresh();                         // another tab saved during the run: reload, pay onto its data
  const live=pgLive(G,ch); if(live) ch=live; else o={commit:false};    // always by id (SAVE may have been reloaded earlier) · deleted → keep nothing
  const r={runId:G.runId, baseXp:0, jobXp:0, gold:0, marks:0, items:Array.isArray(G.loot)?G.loot.slice():[], lvUp:0, jobUp:0, unlocks:[],
    mode:G.modeId, daily:false, committed:false, st:{t:+G.t||0, kills:G.kills|0, died:!won&&!!(G.player&&G.player.hp<=0), wave:G.wave|0, won:!!won}};
  try{
    const A=pgAcct(), today=svDay();
    if(G.modeId==='survival'){
      // §2.2 hell tier T: EXP from recLv(T) · gold goldPerWave(T) · items = G.loot (elite/boss drops, gear tier gearTier(T))
      const S=BAL.SURV, T=S.tier(G.tier), waves=won?S.WAVES:Math.max(0,(G.wave|0)-1), rec=S.recLv(T), gpw=S.goldPerWave(T);
      r.tier=T; r.waves=waves;
      r.baseXp=Math.round(BAL.bxpNeed(rec)*S.expMul(waves,won)*S.overLv(ch.lv|0,rec));
      r.gold=gpw*waves+(won?gpw*S.winGoldWaves:0)+(G.goldRun|0);
      const used=A&&svDayCur(A.daily.day)&&A.daily.surv[T];
      if((G.wave|0)>=S.dailyWave&&!used){ r.daily=true; r.baseXp*=S.dailyMul; r.gold*=S.dailyMul; }
      // next tier: reach wave 10 in the highest tier unlocked so far (never skips: a lower tier, or a locked one, unlocks nothing)
      if((G.wave|0)>=S.unlockWave&&T<S.maxT&&A&&(A.survTier|0)===T) r.unlocks.push('survTier:'+(T+1));
      for(const [w,b] of [[5,'colossus'],[10,'lich'],[20,'king']]) if((G.wave|0)>=w&&A&&!A.bossUnlock[b]) r.unlocks.push('boss:'+b);
    } else if(G.modeId==='trial'){
      if(won&&!(ch.trial&&ch.trial.t2===1)) r.unlocks.push('trial:t2');
    } else {
      r.gold=G.goldRun|0;                                               // field EXP is granted per kill; boss/field fill the rest
      if(G.mode&&typeof G.mode.rewards==='function') G.mode.rewards(r,won);
    }
    const gu=pgUpLv('gold'); if(gu&&r.gold>0) r.gold=Math.round(r.gold*(1+BAL.UP.def.gold.per*gu));   // upgrade: gold +1%/level (every mode)
    r.jobXp=Math.round(r.baseXp*BAL.JOB_EXP);
  }catch(e){ console.error(e); }
  if(o&&o.commit) grantRewards(ch,r);
  return r; }
// apply a Reward once: a runId already in acct.runIds (last 30) is refused · so is one validateSave would drop (SV_RUNID_RE): it would
// be forgotten on the next load and the same reward could be paid again
function grantRewards(ch,r,again){
  ch=pgFresh(ch);
  if(!ch||!r||typeof r.runId!=='string'||!SV_RUNID_RE.test(r.runId)||pgRO()) return false;
  const A=pgAcct(), ids=A?A.runIds:PG_RUNIDS; if(ids.indexOf(r.runId)>=0) return false;
  ids.push(r.runId); while(ids.length>SV_RUNIDS) ids.shift();
  const g=pgGrantExp(ch,r.baseXp,r.jobXp); r.lvUp=g.lvUp; r.jobUp=g.jobUp; r.overGold=g.gold;
  if(A){ A.gold=Math.min(BAL.CAP.gold,A.gold+Math.max(0,Math.floor(+r.gold||0))); A.marks=Math.min(BAL.CAP.marks,A.marks+Math.max(0,Math.floor(+r.marks||0))); }
  try{ pgCommitItems(ch,r); }catch(e){ console.error(e); }               // its toasts wait until the write sticks (pgItemsNote)
  const st=r.st||{}, t=Number.isFinite(+st.t)?Math.max(0,+st.t):0, kills=Math.max(0,st.kills|0), wave=Math.max(0,Math.min(BAL.SURV.WAVES,st.wave|0));   // never lowers totals · wave as validateSave keeps it
  ch.play=(+ch.play||0)+t; ch.kills=(ch.kills|0)+kills; if(st.died) ch.deaths=(ch.deaths|0)+1;
  if(SAVE) SAVE.play=(+SAVE.play||0)+t;
  if(A){
    const today=svDay(); if(!svDayCur(A.daily.day)){ A.daily.day=today; A.daily.surv={}; A.daily.boss={}; A.daily.dg={}; }   // svDayCur: a clock set back a day keeps today's counts
    if(r.mode==='survival'){ const T=String(r.tier|0), m=A.records.survival[ch.id]||(A.records.survival[ch.id]={}), old=m[T];
      if(!old||wave>old.wave||(wave===old.wave&&kills>old.kills)||(st.won&&!old.won)) m[T]={wave, kills, won:!!st.won||!!(old&&old.won)};
      if(r.daily) A.daily.surv[T]=1; }
  }
  for(const u of r.unlocks||[]){ const [k,v]=String(u).split(':');
    if(k==='trial'&&v==='t2') ch.trial.t2=1;                            // trial won → the job page opens advancement
    else if(!A) continue;
    else if(k==='survTier') A.survTier=Math.max(A.survTier,Math.min(BAL.SURV.maxT,v|0));
    else if(k==='boss'&&SV_ID.test(v||'')) A.bossUnlock[v]=1; }
  r.committed=true; const S0=SAVE; pgSave(ch,'reward',true); if(SAVE===S0) pgItemsNote(r);
  // the write found another tab's save and reloaded instead (svlWrite): the reward is in neither memory nor storage. Paid once more
  // onto the reloaded save (its runIds do not hold this runId, so it is not a second payment) · a second race in a row → not paid
  if(SAVE!==S0){ r.committed=false; const live=!again&&SAVE&&Array.isArray(SAVE.chars)?SAVE.chars.find(c=>c&&c.id===ch.id):null;
    if(live) return grantRewards(live,r,true);
    if(typeof svlNote==='function') svlNote('บันทึกรางวัลรอบนี้ไม่ได้ · ข้อมูลถูกแก้จากอีกแท็บ','bad'); return false; }
  return true; }
// Reward items (G.loot: kept even after a death · §2.1) → the save. Bag first (stacks fill up, then new entries); what does not fit
// goes to the shared stash (r.stashed); what fits neither is r.lost — never silently: the end screen (55) and a toast say so.
// Instances are copied (G.loot is left as it was) and a uid already held anywhere in the save is never added a second time.
function pgCommitItems(ch,r){
  const A=pgAcct(), st=r.stashed=[], lost=r.lost=[]; let full=0;   // full = how many of lost had no room (the rest: unknown / already held)
  for(const it of Array.isArray(r.items)?r.items:[]){
    if(!it||typeof it!=='object') continue;
    const d=typeof itemDef==='function'?itemDef(it.id):null; if(!d){ lost.push(it); continue; }
    if(typeof it.u==='string'&&d.slot){                                  // one gear instance (a stack id with a u falls through as a stack)
      if(pgUidHeld(it.u)){ lost.push(it); continue; }                    // already held: never twice (no new uid = no copy) · never silently
      const x=svItem(JSON.parse(JSON.stringify(it))); if(!x){ lost.push(it); continue; }   // clean shape (r, f, sockets clamped)
      if(invAdd(ch,x,1).ok) continue;
      if(A&&pgStashFree(A)>0){ A.stash.push(x); st.push(it); } else { lost.push(it); full++; }
      continue; }
    const n=Math.max(1,Math.min(1e6,Math.floor(+it.n||1)));             // a stack {id, n}
    let left=d.slot?n:invAdd(ch,it.id,n).overflow|0;
    if(d.slot) for(let k=0;k<n;k++){ const x=makeInst(it.id,{}); if(x&&invAdd(ch,x,1).ok) left--; else if(x&&A&&pgStashFree(A)>0){ A.stash.push(x); st.push(x); left--; } }
    else if(left>0&&A){ const k=pgStashPut(A,it.id,left,d); if(k) st.push({id:it.id, n:k}); left-=k; }
    if(left>0){ lost.push(left===n?it:{id:it.id, n:left}); full+=left; } }
  r.lostFull=full; }
// the toasts for r.stashed / r.lost · once, after the reward's write stuck (a retried grantRewards recomputes both)
function pgItemsNote(r){ if(typeof svlNote!=='function'||!r) return; const st=r.stashed||[], lost=r.lost||[], full=r.lostFull|0;
  const cnt=a=>a.reduce((s,x)=>s+(typeof x.u==='string'?1:Math.max(1,Math.min(1e6,x.n|0))),0);
  if(st.length) svlNote('กระเป๋าเต็ม · ของ '+cnt(st)+' ชิ้นเก็บเข้าคลังแล้ว','info');
  const other=cnt(lost)-full;
  if(full) svlNote('กระเป๋าและคลังเต็ม · ของ '+full+' ชิ้นเก็บไม่ได้','bad');
  if(other>0) svlNote('เก็บของไม่ได้ '+other+' ชิ้น','bad'); }
function pgStashFree(A){ return A&&Array.isArray(A.stash)?Math.max(0,Math.min(BAL.CAP.stash,A.stashMax|0)-A.stash.length):0; }
function pgStashPut(A,id,n,d){   // stack n of id into the stash (open stacks first, then new entries) → number put
  const cap=Math.max(1,d.stack|0||1); let left=n;
  for(const x of A.stash){ if(!left) break; if(x&&typeof x.u!=='string'&&!x.unk&&x.id===id&&(x.n|0)<cap){ const k=Math.min(cap-(x.n|0),left); x.n=(x.n|0)+k; left-=k; } }
  while(left>0&&pgStashFree(A)>0){ const k=Math.min(cap,left); A.stash.push({id, n:k}); left-=k; }
  return n-left; }
function pgUidHeld(u){ if(!SAVE) return false; const has=l=>Array.isArray(l)&&l.some(x=>x&&x.u===u);
  return has(SAVE.acct&&SAVE.acct.stash)||(Array.isArray(SAVE.chars)&&SAVE.chars.some(c=>c&&has(c.inv))); }
