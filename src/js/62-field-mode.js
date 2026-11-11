/* ================= 62-field-mode.js · lane F · MODES.field (ท่องแดนรูน): maps, spawn points, field boss, rampage, portals, rewards ================= */
// DESIGN §2.3 / §5 + docs/PROPOSAL-maps-daily.md §3–5. One run = one trip out of the fort: walk the bounded maps (ZONES, 60),
// portals lead to the next map without ending the run, the run ends by dying or going home (🏰 a 5-s cast that a hit cancels,
// or the fort gate of map 1). Everything earned is paid at the end through onRunEnd → mode.rewards (42): Base/Job EXP of every
// kill (fieldKillExp · a death costs 1% of a level), gold on the ground (G.goldRun), items picked up (G.loot), boss / rampage chests.
// The boss timers (acct.fboss) and per-map records (ch.fz, ch.bestiary) are written once, by grantRewards → fdCommit.
// Monsters: spawn points ("recs") near the player become awake enemies (≤ 70 desktop / 45 touch), far calm ones fall asleep
// and remember their HP; a killed point respawns 8–15 s later, only out of view. AI + kits: 62a · map + drawing: 63 · bosses: 64.
const FD_K1={hp:1, dmg:1};
function fdRact(){ return Math.hypot(VW,VH)/2+520; }
function fdCap(){ return TOUCH?BAL.FIELD.cap.touch:BAL.FIELD.cap.desk; }
function fdMid(z){ return (z.lv[0]+z.lv[1])/2; }
MODES.field={
  id:'field', n:'ท่องแดนรูน', cards:'manual', relocate:false,
  init(opts){ const id=opts&&svHas(ZONES,opts.zone)?opts.zone:'g1';
    G.cfg={W:{}, rate:0, hpMul:1, dmgMul:1, spdMul:1}; G.wave=1;
    G.fdRun={exp:0, kills:{}, zones:{}, boss:{}, ramp:0, recall:false, died:false, how:'', last:id, lvSeen:0};
    fdZone(id,opts&&opts.portal||null,true); },
  update(dt){ fdUpdate(dt); },
  steer:fdSteer, bot(){ return fdBot(); },
  onKill(e){ fdOnKill(e); },
  onDeath(){ return false; },                                            // core endRun(false) · rewards of the trip are kept (mode.rewards)
  hud(){ const F=G.fd, z=F.z; return {lv:'ชำนาญ Lv '+P.lv+' · '+(P.adv?P.adv.n:P.cls.n), wave:z.i+' '+z.n+' · Lv '+z.lv[0]+'–'+z.lv[1], time:fdHudTime()}; },
  pauseTitle(){ const z=G.fd.z; return z.n+' · ชำนาญ Lv '+P.lv+' · เวลา '+fmtClock(G.t)+' · EXP สะสม +'+fmtNum(Math.round(G.fdRun.exp)); },
  end(won){ const R=G.fdRun, F=G.fd; fdCollectGround(false); R.died=!won; if(F){ fdZoneTime(); F.rc=null; }
    const zs=Object.keys(R.zones).filter(k=>svHas(ZONES,k)).map(k=>ZONES[k].n).join(' → ')||(F?F.z.n:'');
    let bk=0; for(const k in R.boss) bk+=R.boss[k].n|0;
    return {eyebrow:(won?(R.how==='fort'?'เดินผ่านประตูป้อม':'กลับถึงป้อม')+' · ได้รับทุกอย่างที่สะสมไว้':'ล้มลงกลางแดน · ได้รับของที่สะสมไว้ (EXP −1% ของเลเวล)'),
      title:won?'กลับป้อม':'ล้มลง',
      rows:()=>[['แผนที่',zs],['เวลา',fmtClock(G.t)],['สังหาร',fmtNum(G.kills)],['จ้าวถิ่นที่ล้ม',bk?bk+' ตัว':'-'],['ฝูงอาละวาดที่ปราบ',R.ramp?R.ramp+' ครั้ง':'-'],['ชำนาญสูงสุด','Lv '+P.lv]]}; },
  rewards(r,won){ const R=G.fdRun, ch=G.char, F=G.fd; let base=Math.max(0,Math.round(R.exp));
    if(R.died&&ch){ const loss=Math.min(base,Math.round(BAL.bxpNeed(Math.max(1,ch.lv|0))*BAL.FIELD.deathExp)); base-=loss; r.fdLoss=loss; }
    r.baseXp=base; r.field={last:F?F.id:R.last, kills:Object.assign({},R.kills), zones:JSON.parse(JSON.stringify(R.zones)), boss:{}, ramp:R.ramp|0, how:R.how||''};
    for(const k in R.boss){ const b=R.boss[k]; if(!(b.n>0)) continue; const cur=F&&F.id===k&&F.boss; r.field.boss[k]={n:b.n|0, rem:cur?(F.boss.alive?0:Math.max(0,F.boss.at-G.t)):Math.max(0,+b.rem||0)}; } },
  expView(){ return fdExpView(); },
  menuText:{btnMenuP:'ออกจากแผนที่ (ไม่รับรางวัล)', btnRestartP:'เลือกแผนที่ใหม่ (ไม่รับรางวัล)', btnMenuE:'กลับป้อม', btnAgain:'ออกสำรวจอีกครั้ง'},
  again(){ fdAgain(); },
  drawGround(L,T,R,B){ if(typeof artGround==='function') artGround(L,T,R,B); else { ctx.fillStyle=groundPat; ctx.fillRect(L,T,R-L,B-T); } ctx.fillStyle=G.fd.z.tone; ctx.fillRect(L,T,R-L,B-T); },
  drawWorld(L,T,R,B){ fdDrawWorld(L,T,R,B); }, drawOver(L,T,R,B){ fdDrawOver(L,T,R,B); }, drawScreen(){ fdDrawScreen(); },
  dispose(){ if(typeof fdHudOff==='function') fdHudOff(); }};

/* ---- entering a map (from the fort, or through a portal inside the same run) ---- */
function fdZone(id,via,first){
  const z=ZONES[id], R=G.fdRun;
  if(G.fd) fdLeaveZone();
  G.enemies.length=0; G.eprojs.length=0; G.projs.length=0; G.zones.length=0; G.strikes.length=0; G.corpses.length=0; G.decals.length=0;
  G.bosses=[]; G.boss=false; G.hordeWarn=null;
  const L=fdBuild(z); fdTerrain(z,L); const N=fdNests(z,L);
  G.bounds={k:'rect', x0:0, y0:0, x1:z.w, y1:z.h};
  const mid=fdMid(z); G.defK=22+.8*mid; G.cfg.dmgMul=BAL.FIELD.dmgByLv(mid);       // dmgMul: the core death blast (โคมน้ำเต้า) at the map's level
  let ax=z.entry.x, ay=z.entry.y; const pv=via&&z.portals.find(q=>q.id===via);
  if(pv){ const cx=z.w/2-pv.x, cy=z.h/2-pv.y, l=Math.hypot(cx,cy)||1; ax=pv.x+cx/l*140; ay=pv.y+cy/l*140; }
  P.x=ax; P.y=ay; P.vx=P.vy=P.kx=P.ky=0; cam.x=P.x; cam.y=P.y;
  let ap=0; try{ ap=loadSettings().autoPot||0; }catch(e){}
  const F=G.fd={z, id, t0:G.t, recs:N.recs, nests:N.nests, tick:0, maxAwake:0, oob:0, haz:[], shots:[], layout:L,
    portals:z.portals.map(p=>Object.assign({},p,{hold:0, msgT:0, lock:p.to!=='fort'&&!!fdLockWhy(G.char,p.to)})),
    chests:L.chests.map(c=>({x:c.x, y:c.y, hold:0, cd:0})), boss:null, ramp:{at:G.t+rand(100,130), warn:0, on:null, a:0},
    mini:fdMiniBuild(z,L), fade:first?null:{t:0, dur:.35, in:1}, rc:null, curseT:0, curseV:0, autoPot:ap, spr:fdSprList(N.recs,z), stuck:{x:P.x, y:P.y, t:0, d:null}};
  if(z.boss) F.boss=fdBossInit(z);
  R.zones[id]=R.zones[id]||{k:0, t:0, b:0}; R.last=id;
  fdSpawnTick(true);
  banner(z.i+' '+z.n,'Lv '+z.lv[0]+'–'+z.lv[1]+(F.boss&&F.boss.at-G.t<=BAL.FIELD.boss.appear+1?' · 👑 '+EN[z.boss.id].n+' กำลังจะปรากฏ!':''));
  if(typeof fdHudOn==='function') fdHudOn(); }
function fdZoneTime(){ const F=G.fd, R=G.fdRun; if(!F) return; R.zones[F.id].t+=Math.max(0,G.t-F.t0); F.t0=G.t; }
function fdLeaveZone(){ const F=G.fd, R=G.fdRun; fdCollectGround(true); fdZoneTime();
  if(F.boss){ const rb=R.boss[F.id]||(R.boss[F.id]={n:0, rem:null}); rb.rem=F.boss.alive?0:Math.max(0,F.boss.at-G.t); } }
// the monster types of a map (spawn points + what they turn into / call) → built one per frame (§5.2 fade)
function fdSprList(recs,z){ const s=new Set(recs.map(r=>r.type));
  if(z.boss) s.add(z.boss.id); if(z.id==='s1') s.add('sb_shard');
  for(const t of [...s]){ const K=EN[t]&&EN[t].kit; if(!K) continue; if(K.split) s.add(K.split.into); if(K.summon) s.add(K.summon.type); if(K.dismount){ s.add(K.dismount.mount); s.add(K.dismount.foot); } }
  for(const t of [...s]){ const K=EN[t]&&EN[t].kit; if(K&&K.split) s.add(K.split.into); }
  return [...s].filter(t=>EN[t]); }
// what this character may enter: map 1 always · later maps at their level, or once the boss of the map before is down
function fdLockWhy(ch,zid){ const z=ZONES[zid]; if(!z) return 'ไม่พบแผนที่'; if(!z.prev) return '';
  if(ch&&(ch.lv|0)>=z.open) return '';
  const fz=ch&&svObj(ch.fz)&&svHas(ch.fz,z.prev)?ch.fz[z.prev]:null; if(fz&&(fz.b|0)>0) return '';
  if(typeof G!=='undefined'&&G&&G.fdRun&&G.char===ch&&G.fdRun.zones[z.prev]&&G.fdRun.zones[z.prev].b>0) return '';
  return 'ต้องเลเวล '+z.open+' หรือล้ม'+EN[ZONES[z.prev].boss.id].n+'ก่อน'; }

/* ---- every frame ---- */
function fdUpdate(dt){ const F=G.fd; if(!F) return;
  if(F.fade){ F.fade.t+=dt; if(F.fade.t>=F.fade.dur){ if(F.fade.in) F.fade=null; else { const f=F.fade; fdZone(f.to,f.via,false); return; } } }
  if(F.spr.length&&!G.auto){ const t=F.spr.pop(); try{ getSpr(t); }catch(e){ console.error(e); } }
  if(F.curseT>G.t) P.tSlow=(P.tSlow||1)*(1-F.curseV);                   // before core updatePlayer reads it
  F.tick-=dt; if(F.tick<=0){ F.tick=.25; fdSpawnTick(false); fdAutoPot(); }
  fdBossTick(dt); fdRampTick(dt); fdHazTick(dt); if(G.over) return; fdShotTick(dt); if(G.over) return;
  if(!G.auto){ fdPortalTick(dt); fdRecallTick(dt); } fdChestTick(dt); }
// wake / sleep / respawn the spawn points (every 0.25 s) · counts for RG.field.stats
function fdSpawnTick(){ const F=G.fd, Ra=fdRact(), Ra2=Ra*Ra, Rs2=(Ra+260)**2, cap=fdCap()+(F.ramp.on?BAL.FIELD.rampage.extra:0), hw=VW/2+120, hh=VH/2+120;
  let awake=0; for(const e of G.enemies) if(!e.dead&&e.fm&&!e.d.struct) awake++;
  for(const e of G.enemies){ if(e.dead||!e.fm||e.fm.st===1) continue; if((e.x-P.x)**2+(e.y-P.y)**2>Rs2){ fdVanish(e); if(!e.d.struct) awake--; } }
  for(const r of F.recs){
    if(r.st==='dead'){ if(G.t>=r.t&&(Math.abs(r.x-P.x)>hw||Math.abs(r.y-P.y)>hh)){ r.st='alive'; r.hpF=1; r.rank=null; } continue; }
    if(r.e){ if(r.e.dead&&!r.e.gone) r.e=null; continue; }
    if((r.x-P.x)**2+(r.y-P.y)**2>Ra2) continue; const st=!!EN[r.type].struct; if(!st&&awake>=cap) continue;
    fdWake(r); if(!st) awake++; }
  F.maxAwake=Math.max(F.maxAwake,awake);
  for(const e of G.enemies) if(!e.dead&&(e.x<-1||e.y<-1||e.x>F.z.w+1||e.y>F.z.h+1)) F.oob++; }
function fdWake(r){ const d=EN[r.type];
  if(r.rank==null) r.rank=d.struct?0:rankRoll(FD_RANKBOOST[G.fd.id]||1);
  const e=fdSpawn(r.type,r.x,r.y,{lv:r.lv, rank:r.rank, hpF:r.hpF, el:r.el, rec:r, nest:r.nest, slot:r.slot}); if(!e) return null; r.e=e;
  if(r.towerRec){ const T=r.towerRec.e; if(T&&!T.dead){ e.fm.tower=T; e.x=T.x; e.y=T.y+3; } }
  if(r.rank===2&&!d.struct&&!r.towerRec){ const n=2+(Math.random()<.5?1:0);                            // หัวหน้า: 2–3 of its kind follow it
    for(let i=0;i<n;i++){ const a=i*TAU/n+rand(-.4,.4), f=fdExtra(r.type,r.x+Math.cos(a)*36,r.y+Math.sin(a)*36,e,{lv:r.lv}); if(f) f.fm.nest=r.nest; } }
  return e; }
// one field monster at its level (§5.3): HP × hpByLv · damage × dmgByLv · then the colour rank (29) · gems × 3 (§2.3)
function fdSpawn(type,x,y,o){ o=o||{}; const d=EN[type]; if(!d) return null; const lv=Math.max(1,o.lv||d.lv||1), F=BAL.FIELD;
  const Z=G.fd&&G.fd.z.k||FD_K1, e=spawnEnemy(type,x,y,{hp:Math.max(1,d.hp*F.hpByLv(lv)*Z.hp)});           // Z: the map's tuning (60 ZONES[id].k)
  e.lv=lv; e.dmg=d.dmg*F.dmgByLv(lv)*Z.dmg; e.xp=Math.max(1,Math.round(d.xp*F.gemMul)); e.def=d.def||0; e.fdK=F.dmgByLv(lv)*Z.dmg;
  e.el=o.el||d.el||null; if(d.cornerEl&&!e.el) e.el=['fire','water','wind','earth'][(Math.random()*4)|0];
  const rk=o.rank|0; if(rk&&RANK[rk]){ rankApply(e,rk); e.fdK*=RANK[rk].dmg; }
  if(o.hpF!=null&&o.hpF<1) e.hp=Math.max(1,e.maxHp*o.hpF);
  e.ai.home=1; e.fm={st:o.aggro?1:0, hx:o.hx!=null?o.hx:x, hy:o.hy!=null?o.hy:y, wt:rand(0,1.5), wx:x, wy:y, h0:null, cd0:0, rec:o.rec||null, nest:o.nest||null, slot:o.slot==null?null:o.slot, free:o.free||0, tele:null};
  if(!d.dmg||d.struct) e.atkCd=1e9;
  return e; }
function fdCollectGround(all){ if(!Array.isArray(G.gems)) return; const R2=600*600;
  for(const g of G.gems){ if(g.dead) continue; const k=g.kind; if(!(k==='loot'||k==='gold'||k==='bosschest'||k==='heart'||(all&&k==='xp'))) continue;
    if(all||(g.x-P.x)**2+(g.y-P.y)**2<R2){ if(k==='heart'&&!all){ g.dead=true; continue; } collect(g); } } }

/* ---- kills: the spawn point waits, kit death effects, then EXP / gold / drops ---- */
const FD_DROPT={};
function fdDropTable(type){ const F=G.fd, key=F.id+':'+type; let t=FD_DROPT[key]; if(t) return t;
  const ids=[]; for(const tt of F.z.gearT) for(const id of (typeof IT_POOL!=='undefined'&&IT_POOL[tt])||[]) ids.push(id);
  t=FD_DROPT[key]=typeof itFieldTable==='function'?itFieldTable(type,F.z.zn,ids):[]; return t; }
function fdChestTable(){ const z=G.fd.z; return FD_CHESTDROP.map(e=>e.gear==='Z'?Object.assign({},e,{gear:z.gearT[0]}):e); }
function fdOnKill(e){ if(e.boss) return; const M=e.fm; if(!M) return; const R=G.fdRun, F=G.fd, d=e.d;
  if(M.rec){ const r=M.rec; r.e=null; r.st='dead'; r.t=G.t+(d.struct?240:rand(BAL.FIELD.respawn[0],BAL.FIELD.respawn[1])); r.rank=null; r.hpF=1; }
  const K=d.kit; if(K) for(const k in K){ const f=FK[k]; if(f&&f.death) try{ f.death(e,M,K[k]); }catch(er){ console.error(er); } }
  if(d.struct){ addText(e.x,e.y-e.r*2,d.n+'พัง!','#ffd27a',true); G.shake=Math.max(G.shake,8); burst(e.x,e.y-20,18,'#8a6a4a',220,.6,4,'rock'); }
  if(M.ramp) fdRampKill(e);
  if(e.fdNoLoot) return;
  const ch=G.char, mul=(e.rank?RANK[e.rank].xp:1)*(M.child?.25:M.sum?.5:1), x=fieldKillExp(ch,e);
  R.exp+=Math.round(x.base*mul); R.kills[e.type]=(R.kills[e.type]|0)+1; if(R.zones[F.id]) R.zones[F.id].k++;
  if(e.rank>=1&&!G.auto) addText(e.x,e.y-e.r-26,'+'+fmtNum(Math.round(x.base*mul))+' EXP','#bfe6ff');
  const gl=BAL.FIELD.gold(e.lv), minor=M.child||M.sum;
  if(!minor||Math.random()<.15) dropGold(e.x,e.y,Math.max(1,Math.round(gl*(1+(e.rank|0)*.6))));
  if(!minor){ const list=rollDrops(fdDropTable(e.type),(1+(P.drop||0))*(1+(e.rank|0)*.5)); if(list.length) dropLoot(e.x,e.y,list); }
  if(e.rank===3&&!minor) ltDropChest(e.x,e.y,rollDrops(fdChestTable(),1+(P.drop||0)),Math.round(gl*4));
  if(K&&K.potion&&rngUnit()<K.potion.p) dropLoot(e.x,e.y,[{id:F.z.zn>=2?'u_potion_l':'u_potion_s', n:1}]);
  if(K&&K.gems) for(let i=1;i<K.gems.mul;i++) dropGem(e.x+rand(-14,14),e.y+rand(-14,14),e.xp); }

/* ---- field boss (§5.5): a real-time timer per map (acct.fboss) · appears at its nest · 64 runs it ---- */
function fdBossInit(z){ const R=G.fdRun, b=z.boss, Fb=BAL.FIELD.boss, rb=R.boss[z.id]; let at;
  if(rb&&rb.rem!=null) at=G.t+Math.max(Fb.appear,rb.rem);
  else { const A=pgAcct(), fb=A&&svObj(A.fboss)&&svHas(A.fboss,z.id)?A.fboss[z.id]:null, next=fb?+fb.next||0:0;
    at=next?G.t+Math.max(Fb.appear,Math.min((next-Date.now())/1000,b.every*1.15)):G.t+Fb.first; }       // never killed yet: 2 min after arriving
  return {id:b.id, x:b.x, y:b.y, place:b.place, every:b.every, at, alive:false, warned:at-G.t<=Fb.warn}; }
function fdBossKills(zid){ const A=pgAcct(), fb=A&&svObj(A.fboss)&&svHas(A.fboss,zid)?A.fboss[zid]:null; return fb?fb.kills|0:0; }
function fdBossTick(){ const B=G.fd.boss; if(!B) return;
  if(B.alive){ if(!G.bosses.length||G.bosses.every(b=>b.dead)) fdBossDone(); return; }
  if(!B.warned&&B.at-G.t<=BAL.FIELD.boss.warn){ B.warned=true; banner('พื้นดินสั่นสะเทือน…','👑 '+EN[B.id].n+' จะปรากฏที่'+B.place+' ใน '+Math.max(1,Math.ceil(B.at-G.t))+' วิ'); sfx('wave'); }
  if(G.t>=B.at) fdBossSpawn(B); }
function fdBossMake(type,x,y,hpMul,el){ const d=EN[type], lv=d.lv, Fd=BAL.FIELD;
  const e=spawnEnemy(type,x,y,{hp:Math.max(1,d.hp*Fd.hpByLv(lv)*(hpMul||1))}); e.boss=true; e.lv=lv; e.dmg=d.dmg*Fd.dmgByLv(lv); e.fdK=Fd.dmgByLv(lv);
  e.el=el||d.el||null; e.xp=Math.max(1,Math.round(d.xp*Fd.gemMul/12)); e.fb={hx:x, hy:y}; return e; }
function fdBossSpawn(B){ const e=fdBossMake(B.id,B.x,B.y); G.bosses=[e]; G.boss=true; B.alive=true;
  banner('👑 '+EN[B.id].n,'ปรากฏตัวที่'+B.place+'!'); sfx('boss'); burst(B.x,B.y,30,EN[B.id].goo,300,.7,4); G.shake=Math.max(G.shake,10); return e; }
function fdBossDone(){ const F=G.fd, B=F.boss, z=F.z, R=G.fdRun, list=G.bosses.filter(b=>!b.gone), last=list[list.length-1]||{x:B.x, y:B.y};
  B.alive=false; B.warned=false; G.boss=false; G.bosses=[];
  B.at=G.t+B.every*rand(BAL.FIELD.boss.jitter[0],BAL.FIELD.boss.jitter[1]);
  const rb=R.boss[z.id]||(R.boss[z.id]={n:0, rem:null}); rb.n++; if(R.zones[z.id]) R.zones[z.id].b++;
  const ch=G.char, lv=EN[B.id].lv; R.exp+=Math.round(BAL.BOSS.exp(lv,0)*BAL.diffMul(lv-((ch&&ch.lv)|0)));
  const first=fdBossKills(z.id)===0&&rb.n===1, t=FD_BOSSDROP[z.id].map(e=>e.pick&&first?Object.assign({},e,{p:1}):e);   // first kill on this account: the rune for sure
  ltDropChest(last.x,last.y,rollDrops(t,1+(P.drop||0)),BAL.DROP.fboss.gold(lv));
  for(const p of F.portals) if(p.to!=='fort') p.lock=!!fdLockWhy(G.char,p.to);                           // the next map may have opened
  banner('ล้ม'+EN[B.id].n+'แล้ว!','กล่องจ้าวถิ่นหล่นอยู่ · จะเกิดใหม่ในราว '+Math.round(B.every/60)+' นาที'); sfx('win'); }
function fieldBossState(zoneId){ const z=ZONES[zoneId]; if(!z||!z.boss) return {ready:false, inSec:0, name:''};
  const name=EN[z.boss.id].n;
  if(typeof G!=='undefined'&&G&&G.fd&&G.fd.id===zoneId&&G.fd.boss){ const B=G.fd.boss; return {ready:B.alive||B.at<=G.t, inSec:Math.max(0,Math.ceil(B.at-G.t)), name, alive:B.alive, seen:true}; }
  const A=typeof pgAcct==='function'?pgAcct():null, fb=A&&svObj(A.fboss)&&svHas(A.fboss,zoneId)?A.fboss[zoneId]:null;
  if(!fb||!fb.next) return {ready:false, inSec:BAL.FIELD.boss.first, name, seen:false, kills:fb?fb.kills|0:0};
  const s=Math.ceil((fb.next-Date.now())/1000); return {ready:s<=0, inSec:Math.max(0,Math.min(s,z.boss.every*2)), name, seen:true, kills:fb.kills|0}; }

/* ---- rampage (§5.6): every 150 ± 20 s, a 5-s warning, a pack from one side · all down in 30 s = a small chest ---- */
const FD_RAMP_EL={fire:'s_ember', water:'s_drop', wind:'s_breeze', earth:'s_pebble'};
function fdRampTick(){ const F=G.fd, RP=F.ramp, z=F.z; if(!z.rampage||F.fade) return;
  if(RP.on){ let live=0; for(const e of RP.on.list) if(!e.dead) live++;
    if(!live) fdRampWin(); else if(G.t>RP.on.end){ RP.on=null; addText(P.x,P.y-60,'ฝูงอาละวาดสงบลง','#c8c0b0',true); } return; }
  if(F.boss&&(F.boss.alive||F.boss.at-G.t<40&&RP.at-G.t<6)){ if(RP.at-G.t<6) RP.at=G.t+(F.boss.alive?20:Math.max(20,F.boss.at-G.t+25)); return; }   // never with the field boss (nor just before it)
  if(!RP.warn&&G.t>=RP.at-5){ RP.warn=1; RP.a=fdRampDir(); G.hordeWarn={a:RP.a, t:5}; banner('⚠ '+z.rampage.n,z.rampage.sub+' · อีก 5 วิ'); sfx('wave'); }
  if(RP.warn&&G.t>=RP.at){ RP.warn=0; fdRampSpawn(RP); const Rm=BAL.FIELD.rampage; RP.at=G.t+Rm.every+rand(-Rm.jitter,Rm.jitter); } }
function fdRampDir(){ const z=G.fd.z, R=Math.hypot(VW,VH)/2+80;
  for(let k=0;k<14;k++){ const a=rand(0,TAU), x=P.x+Math.cos(a)*R, y=P.y+Math.sin(a)*R; if(x>80&&y>80&&x<z.w-80&&y<z.h-80) return a; }
  return Math.atan2(z.h/2-P.y,z.w/2-P.x); }
function fdRampSpawn(RP){ const F=G.fd, z=F.z, Rr=z.rampage, n=TOUCH?BAL.FIELD.rampage.n.touch:BAL.FIELD.rampage.n.desk, a=RP.a, c=Math.cos(a), s=Math.sin(a), R0=Math.hypot(VW,VH)/2+60, list=[];
  const at=(back,side)=>{ const x=P.x+c*(R0+back)-s*side, y=P.y+s*(R0+back)+c*side; return [clamp(x,40,z.w-40),clamp(y,40,z.h-40)]; };
  const mk=(type,back,side,o)=>{ const q=at(back,side), e=fdExtra(type,q[0],q[1],null,Object.assign({aggro:1, free:G.t+BAL.FIELD.rampage.sec, ramp:1},o||{})); if(e){ list.push(e); e.fm.hx=q[0]; e.fm.hy=q[1]; } return e; };
  let lead=null;
  if(Rr.list){ let tot=0; for(const q of Rr.list) tot+=q[1]; const m=n-(Rr.lead?1:0);
    for(const q of Rr.list){ const k=Math.max(1,Math.round(m*q[1]/tot)); for(let i=0;i<k;i++) mk(q[0],rand(0,130),rand(-170,170)); }
    if(Rr.lead) lead=mk(Rr.lead,170,0); }
  else if(Rr.slimes){ const el=pick(['fire','water','wind','earth']), k=Math.min(Rr.slimes,n+2); for(let i=0;i<k;i++) mk(FD_RAMP_EL[el],rand(0,140),rand(-180,180),{el});
    banner('⚠ '+Rr.n,'วุ้นธาตุ'+EL[el].n+' '+EL[el].i+' ล้วน · ใช้ธาตุ'+EL[Object.keys(EL_BEATS).find(k2=>EL_BEATS[k2]===el)].n+'ชนะทาง'); }
  else if(Rr.rows){ const per=TOUCH?3:4; for(let r=0;r<Rr.rows;r++) for(let i=0;i<per;i++){ const sl=i-(per-1)/2, e=mk('o_shield',r*56,sl*50); if(e) e.fm.slot=sl; }
    for(let i=0;i<per;i++) mk('o_archer',Rr.rows*56+120,(i-(per-1)/2)*70); }
  RP.on={list, end:G.t+BAL.FIELD.rampage.sec, lead}; }
function fdRampKill(e){ const on=G.fd.ramp.on; if(!on||on.lead!==e) return; on.lead=null;
  for(const o of on.list) if(!o.dead&&o.fm) o.fm.spdMul=(o.fm.spdMul||1)*.72; addText(e.x,e.y-e.r-20,'มือกลองล้ม! ฝูงช้าลง','#ffe14a',true); }
function fdRampWin(){ const F=G.fd, z=F.z; F.ramp.on=null; G.fdRun.ramp++; const R=BAL.DROP.rampage;
  ltDropChest(P.x+36,P.y-12,[{id:'m_dust', n:R.dust}],R.gold(Math.round(fdMid(z)))); banner('ปราบฝูงอาละวาดสำเร็จ!','ได้กล่องรางวัล (ผงรูน + ทอง)'); sfx('level'); }

/* ---- portals, camp chests, going home (5-s cast), auto potion, curse ---- */
function fdPortalTick(dt){ const F=G.fd; if(F.fade||G.ui) return;
  for(const p of F.portals){ const near=(P.x-p.x)**2+(P.y-p.y)**2<54*54; if(!near){ p.hold=0; continue; }
    if(p.lock){ if(G.t>p.msgT){ p.msgT=G.t+3; banner('🔒 '+ZONES[p.to].n,fdLockWhy(G.char,p.to)); } continue; }
    p.hold+=dt; if(p.hold<.6) continue; p.hold=0;
    if(p.to==='fort'){ fdRecallDone('fort'); return; }
    F.fade={t:0, dur:.28, to:p.to, via:p.via}; sfx('level'); return; } }
function fdChestTick(dt){ const F=G.fd;
  for(const c of F.chests){ if(c.cd>G.t) continue; const inR=(P.x-c.x)**2+(P.y-c.y)**2<58*58; c.hold=inR?c.hold+dt:Math.max(0,c.hold-dt*2);
    if(c.hold<2) continue; c.hold=0; c.cd=G.t+240; const gl=BAL.FIELD.gold(fdMid(F.z));
    for(let i=0;i<6;i++) dropGold(c.x,c.y,Math.max(1,Math.round(gl*1.5))); const list=rollDrops(fdChestTable(),1+(P.drop||0)); if(list.length) dropLoot(c.x,c.y,list);
    burst(c.x,c.y,16,'#f0c75a',200,.6,3); sfx('level'); addText(c.x,c.y-34,'หีบค่ายเปิดแล้ว!','#f0c75a',true); } }
function fdRecall(){ if(!G||G.over||G.modeId!=='field'||G.ui) return false; const F=G.fd;
  if(F.rc){ F.rc=null; addText(P.x,P.y-60,'ยกเลิกการกลับป้อม','#c8c0b0'); return false; }
  F.rc={t:0, hp:P.hp}; addText(P.x,P.y-60,'กำลังกลับป้อม… (โดนตีจะยกเลิก)','#f0c75a',true); sfx('level'); return true; }
function fdRecallTick(dt){ const F=G.fd, rc=F.rc; if(!rc) return;
  if(P.hp<rc.hp-.5){ F.rc=null; addText(P.x,P.y-60,'โดนโจมตี · ยกเลิกการกลับป้อม','#ff9aa0',true); return; }
  rc.hp=Math.max(rc.hp,P.hp); rc.t+=dt; if(rc.t>=5) fdRecallDone('recall'); }
function fdRecallDone(how){ if(G.over) return; G.fdRun.recall=true; G.fdRun.how=how||'recall'; if(G.fd) G.fd.rc=null; endRun(true); }
function fdAutoPot(){ const F=G.fd; if(G.auto||!G.char||!F.autoPot||G.ui||G.over) return; if(P.hp>=P.maxHp*F.autoPot||(G.potT||0)>G.t) return;
  if(typeof HD==='undefined'||typeof hdPotUse!=='function') return; for(let i=0;i<2;i++) if(HD.pot[i]&&(HD.potN[i]|0)>0){ hdPotUse(i); return; } }
function fdHudTime(){ const F=G.fd, B=F.boss, RP=F.ramp; if(RP.on) return '⚔ ฝูง '+fmtTime(RP.on.end-G.t);
  if(!B) return fmtClock(G.t); if(B.alive) return '👑 ต่อสู้!'; const s=B.at-G.t; return s<=0?'👑 กำลังมา':'👑 '+fmtTime(s); }
// HUD bars: the character's Base / Job EXP as it will be after this trip (paid at the end)
function fdExpView(){ const ch=G.char; if(!ch||!G.fdRun) return null; const gain=Math.max(0,Math.round(G.fdRun.exp)), cap=BAL.CAP.base;
  let L=ch.lv|0, x=(ch.xp|0)+gain; while(L<cap&&x>=BAL.bxpNeed(L)){ x-=BAL.bxpNeed(L); L++; }
  const t2=!!ch.job, jc=t2?BAL.CAP.job2:BAL.CAP.job1, tier=t2?2:1; let J=ch.jlv|0, jx=(ch.jxp|0)+Math.round(gain*BAL.JOB_EXP); while(J<jc&&jx>=BAL.jxpNeed(J,tier)){ jx-=BAL.jxpNeed(J,tier); J++; }
  return {lv:L, xr:L>=cap?1:x/BAL.bxpNeed(L), jl:J, jr:J>=jc?1:jx/BAL.jxpNeed(J,tier), up:L-(ch.lv|0), jup:J-(ch.jlv|0), gain}; }
function fdAgain(){ try{ toTitle(); }catch(e){ console.error(e); } setTimeout(()=>{ try{ if(typeof UI!=='undefined') UI.go('scrWorld'); }catch(e){ console.error(e); } },60); }
// RG.sim bot: the core bot near monsters · otherwise walk to the closest awake monster or living spawn point · unstick from rocks
function fdBot(){ const F=G.fd, S=F.stuck; let b=botInput();
  if(!(b[0]||b[1])){ let best=null, bd=1e18;
    for(const e of G.enemies){ if(e.dead||e.d.struct) continue; const d2=(e.x-P.x)**2+(e.y-P.y)**2; if(d2<bd){ bd=d2; best=e; } }
    if(!best) for(const r of F.recs){ if(r.st!=='alive'||r.e) continue; const d2=(r.x-P.x)**2+(r.y-P.y)**2; if(d2<bd){ bd=d2; best=r; } }
    if(best){ const dx=best.x-P.x, dy=best.y-P.y, l=Math.hypot(dx,dy)||1; b=l<50?[0,0]:[dx/l*.85,dy/l*.85]; } }
  S.t+=1/60; if(S.t>=2.5){ const moved=Math.hypot(P.x-S.x,P.y-S.y); S.d=moved<30&&(b[0]||b[1])?{a:rand(0,TAU), t:1.1}:S.d; S.x=P.x; S.y=P.y; S.t=0; }
  if(S.d&&S.d.t>0){ S.d.t-=1/60; return [Math.cos(S.d.a),Math.sin(S.d.a)]; }
  return b; }

/* ---- the run's reward lands (grantRewards in 42 calls this once per runId): per-map records + bestiary + boss timers ---- */
function fdCommit(ch,r,A){ const f=r&&r.field; if(!f||!ch||typeof f!=='object') return; const now=Date.now(), zk=o=>svObj(o)?Object.keys(o).filter(k=>svHas(ZONES,k)):[];
  if(!svObj(ch.fz)) ch.fz={};
  for(const z of zk(f.zones)){ const s=svObj(f.zones[z])?f.zones[z]:{}, o=svObj(ch.fz[z])?ch.fz[z]:(ch.fz[z]={k:0, b:0, t:0});
    o.k=svInt((o.k|0)+svInt(s.k,0,1e9,0),0,1e9,0); o.b=svInt((o.b|0)+svInt(s.b,0,1e6,0),0,1e6,0); o.t=svInt((o.t|0)+svInt(s.t,0,1e9,0),0,1e9,0); }
  if(!svObj(ch.bestiary)) ch.bestiary={}; let nb=Object.keys(ch.bestiary).length;
  for(const t of svObj(f.kills)?Object.keys(f.kills):[]){ if(!SV_ID.test(t)||!svHas(EN,t)) continue; if(!svHas(ch.bestiary,t)){ if(nb>=200) continue; nb++; } ch.bestiary[t]=svInt((ch.bestiary[t]|0)+svInt(f.kills[t],0,1e9,0),0,1e9,0); }
  if(svHas(ZONES,f.last)){ ch.zone=f.last; if(!Array.isArray(ch.visited)) ch.visited=[]; for(const z of zk(f.zones)) if(ch.visited.indexOf(z)<0&&ch.visited.length<32) ch.visited.push(z); }
  if(A){ if(!svObj(A.fboss)) A.fboss={};
    for(const z of zk(f.boss)){ const b=svObj(f.boss[z])?f.boss[z]:{}, n=svInt(b.n,0,1e6,0); if(!n) continue; const o=svObj(A.fboss[z])?A.fboss[z]:(A.fboss[z]={next:0, kills:0});
      o.kills=svInt((o.kills|0)+n,0,1e9,0); o.next=Math.min(SV_TMAX,Math.round(now+Math.max(0,Math.min(ZONES[z].boss.every*1.2,+b.rem||0))*1000)); } } }

/* ---- API (§7.8) ---- */
function fieldEnter(zoneId,portalId){ if(!svHas(ZONES,zoneId)) return false;
  if(typeof G!=='undefined'&&G&&G.modeId==='field'&&!G.over){ fdZone(zoneId,portalId||null,false); return true; }
  const ch=typeof pgFresh==='function'?pgFresh(curChar()):curChar(); if(!ch||fdLockWhy(ch,zoneId)) return false;
  if(typeof closeSheet==='function') closeSheet(); if(typeof shChrome==='function') shChrome(null);
  startRun(ch.cls,'field',{char:ch, zone:zoneId}); return true; }
function fieldLeave(toHub){ if(!G||G.modeId!=='field'||G.over) return false; if(toHub) fdRecallDone('menu'); else toTitle(); return true; }

/* ---- dev (§7.9): RG.field.* ---- */
DEV.field={
  go(z,o){ const ch=curChar(); if(!ch) return 'no char'; startRun(ch.cls,'field',Object.assign({char:ch, zone:svHas(ZONES,z)?z:'g1'},o||{})); return this.stats(); },
  tp(z,x,y){ if(!G||G.modeId!=='field') return 'not in field'; if(z&&z!==G.fd.id&&svHas(ZONES,z)) fdZone(z,null,true); if(x!=null){ P.x=+x; P.y=+y; cam.x=P.x; cam.y=P.y; } return this.stats(); },
  boss(){ const B=G&&G.fd&&G.fd.boss; if(!B) return 'no boss'; if(!B.alive){ B.at=G.t; fdBossSpawn(B); } return G.bosses.length; },
  bossIn(s){ const B=G&&G.fd&&G.fd.boss; if(!B) return 'no boss'; B.at=G.t+Math.max(0,+s||0); B.warned=false; return +B.at.toFixed(1); },
  rampage(){ if(!G||!G.fd) return 'not in field'; const RP=G.fd.ramp; RP.at=G.t+5; RP.warn=0; return +RP.at.toFixed(1); },
  spawn(type,n,rank){ if(!G||!G.fd||!EN[type]) return 0; let k=0; for(let i=0;i<(n|0||1);i++){ const a=rand(0,TAU); if(fdExtra(type,P.x+Math.cos(a)*180,P.y+Math.sin(a)*180,null,{aggro:1, rank:rank|0})) k++; } return k; },
  kill(){ if(!G) return 0; let n=0; for(const e of G.enemies) if(!e.dead&&!e.boss){ killEnemy(e); n++; } return n; },
  recall(){ return fdRecall(); },
  reach(z){ const Z=ZONES[z]; if(!Z) return 'no zone'; return fdReach(Z,fdBuild(Z)); },
  stats(){ const F=G&&G.fd; if(!F) return null; let awake=0, asleep=0, dead=0; for(const r of F.recs){ if(r.st==='dead') dead++; else if(r.e&&!r.e.dead) awake++; else asleep++; }
    const B=F.boss; return {zone:F.id, awake, asleep, dead, enemies:G.enemies.filter(e=>!e.dead).length, maxAwake:F.maxAwake, relocates:0, oob:F.oob, points:F.recs.length,
      boss:B?{alive:B.alive, in:+Math.max(0,B.at-G.t).toFixed(1), n:G.bosses.filter(b=>!b.dead).length}:null, ramp:F.ramp.on?F.ramp.on.list.filter(e=>!e.dead).length:+(F.ramp.at-G.t).toFixed(1),
      exp:Math.round(G.fdRun.exp), gold:G.goldRun|0, loot:(G.loot||[]).length, haz:F.haz.length, shots:F.shots.length, t:+G.t.toFixed(1), hp:Math.round(P.hp)+'/'+Math.round(P.maxHp), over:G.over}; } };
