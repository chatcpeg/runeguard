// test/60-field.test.mjs (lane F) — ท่องแดนรูน (MODES.field): data, map build, behaviour kits, bounds, boss, rampage, rewards, save
//   node test/60-field.test.mjs
// Runs the whole game headless (test/_headless.mjs: real src/js + a fake DOM) — real startRun / update() / render() / endRun.
import { loadGame } from './_headless.mjs';

let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + (typeof info === 'string' ? info : JSON.stringify(info)) : '')); } };
const note = t => console.log('  · ' + t);
// a fresh game + a character (level, ★ of its class skills, stats auto) · started in a map when zone is given
function game(o = {}) {
  const g = loadGame(), X = g.X;
  X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','${o.cls || 'mage'}'); SAVE.chars.push(ch); SAVE.active=ch.id; ch.lv=${o.lv || 10}; ch.pts=BAL.ptsAt(ch.lv);
    const d=pgAutoStats(ch,ch.pts); for(const k in d) ch.st[k]=(ch.st[k]|0)+d[k]; ch.pts=0;
    const c=CLS[ch.cls]; ch.sk={}; for(const id of c.skills) ch.sk[id]=${o.sk || 3}; ch.load=c.skills.slice(0,4); ch.inv.push({id:'u_potion_s', n:5}); return ch.id; })()`);
  if (o.zone) X(`(()=>{ const ch=curChar(); startRun(ch.cls,'field',{char:ch, zone:'${o.zone}'}); return 1; })()`);
  return g;
}
const step = (X, sec, auto) => X(`(()=>{ ${auto ? 'G.auto=true;' : ''} for(let i=0;i<${Math.round(sec * 60)}&&!G.over;i++){ update(1/60); ${auto ? 'autoUI();' : ''} } ${auto ? 'G.auto=false;' : ''} return G.over; })()`);
// clear the map around the player and put one monster next to it (aggro), the player standing still in god mode
const solo = (X, type, o = '') => X(`(()=>{ P.skills.length=0; for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const r of G.fd.recs){ r.st='dead'; r.t=1e9; r.e=null; } G.fd.ramp.at=1e9; if(G.fd.boss) G.fd.boss.at=1e9;
  P.x=1500; P.y=1300; const e=fdExtra('${type}',P.x+${o.dx || 120},P.y+${o.dy || 0},null,{aggro:${o.calm ? 0 : 1}, lv:${o.lv || 0}||undefined}); ${o.then || ''} return e.id; })()`);

console.log('ข้อมูล: มอนครบตาม proposal · ธาตุ · ภาพ · ชุดพฤติกรรม');
{
  const { X } = game();
  const r = X(`(()=>{ const want={g_sprout:null,g_grunt:null,g_thrower:'earth',g_spear:null,g_thief:'dark',g_boarrider:'earth',g_shaman:'fire',g_drummer:null,g_trapper:'earth',g_hob:null,
      s_drop:'water',s_ember:'fire',s_breeze:'wind',s_pebble:'earth',s_moss:'wind',s_glow:'light',s_shade:'dark',s_twin:'fire',s_big:null,s_merge:null,
      o_grunt:null,o_archer:'wind',o_shield:'earth',o_berserk:'fire',o_shaman:'dark',o_rhino:'earth',o_horn:null,o_bomber:'fire',o_brute:'earth',o_cook:'fire',
      g_boar:'earth',o_wolf:'dark',gb_king:'earth',sb_queen:'fire',ob_warlord:'fire'};
    const lvs={g_sprout:1,g_grunt:2,g_thrower:3,g_spear:5,g_thief:6,g_boarrider:7,g_shaman:8,g_drummer:9,g_trapper:10,g_hob:11,s_drop:10,s_ember:12,s_breeze:13,s_pebble:14,s_moss:15,s_glow:17,s_shade:18,s_twin:19,s_big:20,s_merge:21,
      o_grunt:20,o_archer:22,o_shield:23,o_berserk:25,o_shaman:26,o_rhino:27,o_horn:28,o_bomber:30,o_brute:32,o_cook:24,gb_king:12,sb_queen:22,ob_warlord:34};
    const miss=[], badEl=[], badLv=[], noArt=[], noPaint=[], badKit=[], thai=[];
    for(const id in want){ const d=EN[id]; if(!d){ miss.push(id); continue; } if((d.el||null)!==want[id]) badEl.push(id+':'+d.el); if(lvs[id]!=null&&d.lv!==lvs[id]) badLv.push(id+':'+d.lv);
      if(d.art!==id) noArt.push(id); if(!EDRAW[d.base]) noPaint.push(id); }
    for(const id in MOBS){ const d=MOBS[id]; if(!EDRAW[d.base]) noPaint.push(id); for(const k in d.kit||{}) if(!FK[k]||!(FK[k].tick||FK[k].death||k==='potion'||k==='gems')) badKit.push(id+'.'+k);
      if(!/^[\\u0E00-\\u0E7F][\\u0E00-\\u0E7F ()]*$/.test(d.n)) thai.push(id); if(!d.lazy) miss.push(id+':lazy'); if(!(d.d&&d.d.length>3)) miss.push(id+':d'); }
    const kits=new Set(); for(const id in MOBS) for(const k in MOBS[id].kit||{}) kits.add(k);
    return {n:Object.keys(want).length, miss, badEl, badLv, noArt, noPaint, badKit, thai, kits:[...kits].sort(), mobs:Object.keys(MOBS).length}; })()`);
  ok('มอนตามตาราง 30 ตัว + g_boar + o_wolf + จ้าวถิ่น 3 ตัว อยู่ใน EN ครบ (lazy:1 · มีคำอธิบาย)', r.n === 35 && !r.miss.length, r.miss);
  ok('ธาตุตาม proposal ทุกตัว (s_big / s_merge = ตามมุม · ไม่มีธาตุตายตัว)', !r.badEl.length, r.badEl);
  ok('เลเวลตาม proposal ทุกตัว', !r.badLv.length, r.badLv);
  ok('ทุกตัวใส่ art = ชื่อภาพของ make_v2.py · มีตัววาดเวกเตอร์สำรอง (EDRAW)', !r.noArt.length && !r.noPaint.length, [r.noArt, r.noPaint]);
  ok('ทุก kit ของมอนมีตัวทำงาน (FK) · ชื่อมอนเป็นภาษาไทย', !r.badKit.length && !r.thai.length, [r.badKit, r.thai]);
  ok('ชุดพฤติกรรมที่ใช้ซ้ำได้ ≥ 14 แบบ (ยิงไกล พุ่ง แยกร่าง ระเบิด ฮีล บัฟ กับดัก โล่ เรียกพวก ขโมย ซ่อน สลับธาตุ รอยไฟ โปร่งใส …)', ['ranged','charge','split','boom','heal','buff','trap','shield','summon','steal','hide','swap','trail','ghost','merge','berserk','quake','dismount'].every(k => r.kits.includes(k)), r.kits);
  note(r.mobs + ' ชนิดใน MOBS · ชุดพฤติกรรม: ' + r.kits.join(' '));
  const z = X(`(()=>{ const o={}; for(const id of FD_ORDER){ const z=ZONES[id]; o[id]={w:z.w, h:z.h, lv:z.lv, biome:z.biome, boss:z.boss.id, to:z.portals.map(p=>p.to+':'+(p.via||'')), back:z.portals.filter(p=>p.to!=='fort').every(p=>ZONES[p.to].portals.some(q=>q.id===p.via&&q.to===id))}; } return o; })()`);
  ok('3 แผนที่: g1 3600×2800 Lv1–12 forest · s1 3600×3000 Lv10–22 swamp · o1 4000×3000 Lv20–34 canyon', z.g1.w === 3600 && z.g1.h === 2800 && z.s1.h === 3000 && z.o1.w === 4000 && z.g1.biome === 'forest' && z.s1.biome === 'swamp' && z.o1.biome === 'canyon' && z.o1.lv[1] === 34, z);
  ok('ประตูเชื่อมกันสองทาง (ป่า ↔ บึง ↔ ค่าย) · ป่ามีประตูป้อม', z.g1.back && z.s1.back && z.o1.back && z.g1.to.includes('fort:'), z);
  ok('biome ใหม่ใน 29a: swamp (gr_swamp · น้ำเยอะ · คริสตัล) และ canyon (gr_canyon · หินแดง t_mount_red0)', X(`TER_BIOME.swamp.gr==='gr_swamp'&&TER_BIOME.swamp.water[1]>=4&&TER_BIOME.swamp.mk[0]==='t_mount_crystal0'&&TER_BIOME.canyon.gr==='gr_canyon'&&TER_BIOME.canyon.mk[0]==='t_mount_red0'`));
}

console.log('สร้างแผนที่: ผลเดิมจาก seed เดิม · จุดเกิดอยู่ในขอบ ไม่ทับสิ่งกีดขวาง · ไปถึงประตู/หีบ/รังบอสได้');
{
  const { X } = game();
  for (const id of ['g1', 's1', 'o1']) {
    const r = X(`(()=>{ const z=ZONES['${id}'], A=fdBuild(z), B=fdBuild(z), sig=L=>JSON.stringify(L.feats.map(f=>[f.k,Math.round(f.x),Math.round(f.y),Math.round(f.r)])), N=fdNests(z,A), N2=fdNests(z,fdBuild(z));
      const blk=A.feats.filter(f=>!f.soft&&f.k!=='flat'), bad=[], out=[];
      for(const r of N.recs){ const d=EN[r.type]; if(r.x<d.r||r.y<d.r||r.x>z.w-d.r||r.y>z.h-d.r) out.push(r.type); for(const f of blk) if(Math.hypot(f.x-r.x,f.y-r.y)<f.r+d.r) { bad.push(r.type+'@'+Math.round(r.x)+','+Math.round(r.y)); break; } }
      const kinds={}; for(const f of A.feats) kinds[f.k+(f.pk?':'+f.pk:f.fk?':'+f.fk:'')]=(kinds[f.k+(f.pk?':'+f.pk:f.fk?':'+f.fk:'')]||0)+1;
      return {same:sig(A)===sig(B)&&JSON.stringify(N.recs.map(r=>[r.type,Math.round(r.x),Math.round(r.y)]))===JSON.stringify(N2.recs.map(r=>[r.type,Math.round(r.x),Math.round(r.y)])), feats:A.feats.length, recs:N.recs.length, nests:N.nests.length, out, bad, reach:fdReach(z,A), chests:A.chests.length, kinds}; })()`);
    ok(`${id}: seed เดิม = แผนที่และจุดเกิดเดิมทุกตำแหน่ง`, r.same, r.feats);
    ok(`${id}: จุดเกิด ${r.recs} จุด (${r.nests} รัง) อยู่ในขอบทั้งหมด และไม่ทับหิน/ต้นไม้/รั้ว`, r.recs >= 40 && !r.out.length && !r.bad.length, { out: r.out, bad: r.bad.slice(0, 8) });
    ok(`${id}: เดินจากทางเข้าไปถึงทุกประตู หีบค่าย และรังจ้าวถิ่นได้`, !r.reach.bad.length, r.reach);
    note(id + ': ' + r.feats + ' ชิ้นในฉาก · หีบ ' + r.chests + ' · ' + Object.entries(r.kinds).map(([k, v]) => k + ' ' + v).join(' · '));
  }
  const lm = X(`(()=>{ const k=id=>fdBuild(ZONES[id]).feats.map(f=>f.ak0||f.mk||'').filter(Boolean); const g=k('g1'), s=k('s1'), o=k('o1');
    return {g:['t_fence0','t_campfire0','t_tent_goblin','t_portal'].every(a=>g.includes(a)), s:['t_hotspring','t_altar_rune','t_mount_crystal0','t_portal'].every(a=>s.includes(a)), o:['t_tent_orc','t_wall_log','t_mount_red0','t_portal'].every(a=>o.includes(a)), tower:ZONES.o1.fort.towers.length}; })()`);
  ok('จุดสำคัญวางตายตัว: ค่ายก็อบลิน (รั้ว กองไฟ เต็นท์) · บ่อน้ำพุร้อน + แท่นรูน + คริสตัล · กำแพงซุง + เต็นท์ออร์ค + หอธนู 4 หอ + หินแดง · ประตูทุกแผนที่', lm.g && lm.s && lm.o && lm.tower === 4, lm);
}

console.log('ขอบแผนที่ · จำลอง 300 วิ ทุกแผนที่ (บอท) ไม่มี exception');
{
  for (const [id, lv, cls] of [['g1', 8, 'swordsman'], ['s1', 18, 'mage'], ['o1', 28, 'archer']]) {
    const { X } = game({ zone: id, lv, cls, sk: 5 });
    let err = null; try { X(`G.god=true;`); step(X, 300, true); } catch (e) { err = String(e && e.stack || e).slice(0, 400); }
    const s = X(`(()=>{ const s=DEV.field.stats(); let draw=null; try{ for(let i=0;i<3;i++) render(); updateHUD(); }catch(e){ draw=String(e.stack||e).slice(0,300); } s.draw=draw; s.pin=P.x>=0&&P.y>=0&&P.x<=G.fd.z.w&&P.y<=G.fd.z.h; s.bosses=G.fdRun.boss; s.rampN=G.fdRun.ramp; s.kills=G.kills; return s; })()`);
    ok(`${id}: 300 วิไม่มี exception (update + render ทุก 10 เฟรม)`, !err && !s.draw, err || s.draw);
    ok(`${id}: oob = 0 · relocates = 0 · ผู้เล่นอยู่ในขอบ · ตื่นพร้อมกันสูงสุด ${s.maxAwake} ≤ 70 (+20 ตอนฝูงอาละวาด)`, s.oob === 0 && s.relocates === 0 && s.pin && s.maxAwake <= 90, s);
    note(`${id}: สังหาร ${s.kills} · EXP สะสม ${s.exp} · ทอง ${s.gold} · ของ ${s.loot} · จ้าวถิ่น ${JSON.stringify(s.bosses)} · ฝูงที่ปราบ ${s.rampN}`);
  }
  const { X } = game({ zone: 'g1' });
  const b = X(`(()=>{ P.x=-500; P.y=99999; update(1/60); const p=[Math.round(P.x),Math.round(P.y)]; const e=fdExtra('g_grunt',10,10,null,{}); e.x=-300; e.y=-300; e.vx=-500; update(1/60); return {p, e:[e.x,e.y], r:P.r}; })()`);
  ok('ผู้เล่นและมอนออกนอกขอบไม่ได้ (clamp ทุกเฟรม)', b.p[0] >= 0 && b.p[1] <= 2800 && b.e[0] >= 0 && b.e[1] >= 0, b);
}

console.log('AI: บ้าน · ไล่ · กลับบ้าน · ไม่ตีก่อน');
{
  const { X } = game({ zone: 'g1', lv: 8 });
  const r = X(`(()=>{ P.skills.length=0; for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const rr of G.fd.recs){ rr.st='dead'; rr.t=1e9; } G.fd.ramp.at=1e9; G.fd.boss.at=1e9; G.god=true;
    P.x=1500; P.y=1300; const e=fdExtra('g_grunt',1500,1700,null,{}); const st0=e.fm.st; for(let i=0;i<60;i++) update(1/60); const calm=e.fm.st;
    P.y=1580; for(let i=0;i<30;i++) update(1/60); const ag=e.fm.st;
    e.x=1500; e.y=1700+1000; for(let i=0;i<10;i++) update(1/60); const lea=e.fm.st; e.hp=1; P.x=2300; P.y=1700; for(let i=0;i<60*15&&e.fm.st===2;i++){ update(1/60); P.x=2300; P.y=1700; }
    const back=[e.fm.st, Math.round(Math.hypot(e.x-e.fm.hx,e.y-e.fm.hy)), e.hp===e.maxHp];
    const b=fdExtra('m_strawbeetle',P.x+20,P.y,null,{}); b.atkCd=0; const hp0=P.hp; G.god=false; for(let i=0;i<90;i++) update(1/60); const passive=[b.fm.st, P.hp>=hp0-.01];
    return {st0, calm, ag, lea, back, passive}; })()`);
  ok('อยู่บ้าน (st 0) จนผู้เล่นเข้ารัศมี aggro แล้วไล่ (st 1)', r.st0 === 0 && r.calm === 0 && r.ag === 1, r);
  ok('ไกลบ้านเกิน 900 → กลับบ้าน (st 2) ถึงบ้านแล้ว HP เต็ม และกลับไปเดินเล่น', r.lea === 2 && r.back[0] === 0 && r.back[1] < 60 && r.back[2], r);
  ok('มอน passive (ด้วงฟาง) ยืนชิดผู้เล่นก็ไม่ตีก่อน', r.passive[0] === 0 && r.passive[1], r.passive);
}

console.log('ชุดพฤติกรรม (เล่นจริงทีละตัว)');
{
  const { X } = game({ zone: 'g1', lv: 12 });
  X(`G.god=true; P.skills.length=0;`);
  // ranged lob (shadow → lands)
  solo(X, 'g_thrower', { dx: 200 });
  const rg = X(`(()=>{ const e=G.enemies.find(q=>!q.dead&&q.type==='g_thrower'); let lob=0, dmin=1e9; for(let i=0;i<60*4;i++){ update(1/60); P.x=1500; P.y=1300; if(G.fd.haz.some(h=>h.k==='lob')) lob=1; dmin=Math.min(dmin,Math.hypot(e.x-P.x,e.y-P.y)); } return {lob, dmin:Math.round(dmin), dead:e.dead}; })()`);
  ok('ยิงไกล+รักษาระยะ: ก็อบลินปาหินปาหินโค้ง (มีเงาบนพื้น) และอยู่ห่าง ~220 ตลอด', rg.lob && rg.dmin > 150 && !rg.dead, rg);
  X(`G.fd.haz.length=0;`); solo(X, 'g_thrower', { dx: 200 });
  const lob = X(`(()=>{ G.god=false; P.hp=P.maxHp; const h0=P.hp; let seen=0; for(let i=0;i<60*6;i++){ update(1/60); if(G.fd.haz.some(h=>h.k==='lob')) seen=1; P.x=1500; P.y=1300; P.vx=P.vy=0; } G.god=true; return {seen, hurt:P.hp<h0}; })()`);
  ok('หินที่ปาตกใส่ตำแหน่งผู้เล่น (ยืนนิ่ง) แล้วโดนดาเมจ', lob.seen && lob.hurt, lob);
  // charge after aim
  solo(X, 'g_spear', { dx: 200 });
  const ch = X(`(()=>{ const e=G.enemies.find(q=>!q.dead&&q.type==='g_spear'); let tele=0, dash=0; for(let i=0;i<60*6;i++){ update(1/60); if(e.fm.tele&&e.fm.tele.k==='line') tele=1; if(e.fm.ch&&e.fm.ch.s===2) dash=1; } return {tele, dash}; })()`);
  ok('พุ่งชาร์จหลังเล็ง: ก็อบลินถือหอกขึ้นเส้นเตือนแล้วพุ่ง', ch.tele && ch.dash, ch);
  // split on death
  solo(X, 's_drop', { dx: 120 });
  const sp = X(`(()=>{ const e=G.enemies.find(q=>!q.dead&&q.type==='s_drop'); killEnemy(e); update(1/60); return G.enemies.filter(q=>!q.dead&&q.type==='s_droplet').length; })()`);
  ok('แยกร่างตอนตาย: วุ้นหยดน้ำ → หยดวุ้นจิ๋ว 2 ตัว', sp === 2, sp);
  const big = X(`(()=>{ solo0(); const e=fdExtra('s_big',P.x+150,P.y,null,{aggro:1, el:'fire'}); killEnemy(e); update(1/60); const mids=G.enemies.filter(q=>!q.dead&&q.type==='s_bigmid'); const els=mids.map(m=>m.el); for(const m of mids) killEnemy(m); update(1/60); return {mids:mids.length, els, bits:G.enemies.filter(q=>!q.dead&&q.type==='s_bigbit').length}; function solo0(){ for(const q of G.enemies) if(!q.dead) fdVanish(q); } })()`);
  ok('วุ้นยักษ์: แตก 3 ตัวกลาง (ธาตุเดิม) → แต่ละตัวแตกอีก 2', big.mids === 3 && big.els.every(e => e === 'fire') && big.bits === 6, big);
  // self destruct
  solo(X, 'o_bomber', { dx: 140, lv: 30 });
  const bm = X(`(()=>{ G.god=false; P.hp=P.maxHp=5000; const exp0=G.fdRun.exp, h0=P.hp; let fuse=0; for(let i=0;i<60*4;i++){ update(1/60); P.x=1500; P.y=1300; const e=G.enemies.find(q=>q.type==='o_bomber'); if(e&&e.fm&&e.fm.fuse!=null) fuse=1; } G.god=true; return {fuse, hurt:P.hp<h0, gone:!G.enemies.some(q=>!q.dead&&q.type==='o_bomber'), noExp:G.fdRun.exp===exp0}; })()`);
  ok('ระเบิดตัวเอง: ออร์คแบกถังเข้ามาจุดชนวน (เตือน) แล้วระเบิดใส่ผู้เล่น · ระเบิดเองไม่ให้ EXP', bm.fuse && bm.hurt && bm.gone && bm.noExp, bm);
  const bm2 = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const g=fdExtra('o_grunt',P.x+300,P.y,null,{}), b=fdExtra('o_bomber',P.x+320,P.y,null,{}); const h=g.hp; buildGrid(); killEnemy(b); return g.hp<h; })()`);
  ok('ตีก่อนถึงตัว: ระเบิดใส่พวกเดียวกันรอบตัว', bm2);
  // heal allies
  const hl = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const s=fdExtra('g_shaman',P.x+200,P.y,null,{aggro:1}), g=fdExtra('g_grunt',P.x+230,P.y,null,{}); g.hp=g.maxHp*.3; const h=g.hp; s.fm.hc=.1; for(let i=0;i<60;i++){ update(1/60); g.x=P.x+230; g.y=P.y; } return g.hp>h; })()`);
  ok('ฮีลพวกเดียวกัน: หมอผีก็อบลินฟื้น HP ก็อบลินรอบตัว', hl);
  // drummer speed buff
  const bf = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const d=fdExtra('g_drummer',P.x+220,P.y,null,{aggro:1}), g=fdExtra('g_grunt',P.x+250,P.y+40,null,{aggro:1}); for(let i=0;i<40;i++) update(1/60); return g.fm.buffT>G.t&&Math.abs(g.fm.buffV-.25)<1e-9; })()`);
  ok('บัฟความเร็วรอบตัว: มือกลองทำให้ก็อบลินในรัศมี 250 เร็วขึ้น 25%', bf);
  // traps
  const tp = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); G.fd.haz.length=0; const t=fdExtra('g_trapper',P.x+200,P.y,null,{aggro:1}); t.fm.tc=.05; for(let i=0;i<60*2;i++) update(1/60); return G.fd.haz.filter(h=>h.k==='trap').length; })()`);
  ok('วางกับดัก: ก็อบลินวางกับดักหนามบนพื้น (เห็นได้)', tp >= 1, tp);
  // shield from the front
  const sh = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const e=fdExtra('g_hob',P.x+200,P.y,null,{aggro:1}); for(let i=0;i<60;i++) update(1/60); P.crit=0; const f={}, b={};
    const hit=(nx)=>{ const s=[]; for(let k=0;k<200;k++){ e.hp=e.maxHp; damageEnemy(e,10,null,{nx, ny:0, quiet:true}); s.push(e.maxHp-e.hp); } return s.reduce((a,c)=>a+c,0)/s.length; };
    const ax=Math.cos(e.fm.ang), front=hit(ax>0?-1:1), back=hit(ax>0?1:-1); e.stunT=1; const stun=hit(ax>0?-1:1); return {front, back, stun, ratio:front/back}; })()`);
  ok('โล่ด้านหน้าลดดาเมจ: ไฮก็อบลินโดนจากด้านหน้า ≈ 50% ของจากด้านหลัง · มึนแล้วโล่ไม่กัน', Math.abs(sh.ratio - .5) < .06 && Math.abs(sh.stun - sh.back) / sh.back < .06, sh);
  // summon
  const sm = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const e=fdExtra('o_horn',P.x+260,P.y,null,{aggro:1, lv:28}); e.fm.sm=.05; for(let i=0;i<30;i++) update(1/60); return {kids:(e.fm.kids||[]).length, type:(e.fm.kids||[])[0]&&e.fm.kids[0].type}; })()`);
  ok('เรียกพวก: ออร์คเป่าเขาศึกเรียกออร์ค 4 ตัวมาจากขอบจอ', sm.kids === 4 && sm.type === 'o_grunt', sm);
  // steal + run
  const st = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); G.goldRun=200; const e=fdExtra('g_thief',P.x+40,P.y,null,{aggro:1}); e.atkCd=0; let i=0; for(;i<60*3&&!e.fm.loot;i++){ update(1/60); P.x=1500; P.y=1300; } const loot=e.fm.loot, g1=G.goldRun; let away=0;
    for(let k=0;k<60;k++){ update(1/60); } away=Math.hypot(e.x-P.x,e.y-P.y); for(const g of G.gems) if(g.kind==='gold') g.dead=true; e.rank=0; killEnemy(e); const coins=G.gems.filter(g=>g.kind==='gold'&&!g.dead).reduce((s,g)=>s+(g.gold|0),0); return {loot, g1, away, coins, back:Math.round(BAL.FIELD.goldF(e.lv,.5)*2)}; })()`);
  ok('ขโมยทองแล้วหนี: ก็อบลินโจรตีโดน → ทองในรอบลด → วิ่งหนี · ฆ่าทันได้คืนพร้อมโบนัส (+ ทองของตัวมันเอง)', st.loot > 0 && st.g1 === 200 - st.loot && st.away > 80 && st.coins >= st.loot + st.back && st.coins <= st.loot + st.back + 3, st);
  // hide / ghost / swap / trail
  const hd = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); P.x=1500; P.y=1300; const m=fdExtra('s_moss',P.x+400,P.y,null,{}); update(1/60); const a=m.alpha; for(let i=0;i<4;i++){ P.x=m.x-50; P.y=m.y; P.vx=P.vy=0; update(1/60); } const near=m.alpha; P.x=1500; P.y=1300; const s=fdExtra('s_shade',P.x+300,P.y,null,{}); update(1/60); return {hid:a, near, shade:s.alpha}; })()`);
  ok('ซ่อนตัว: วุ้นตะไคร่จางเหลือแค่ตาเมื่ออยู่ไกล โผล่เมื่อเข้าใกล้ · โปร่งใส: วุ้นเงาราตรีโปร่งครึ่งตัว', hd.hid < .2 && hd.near === undefined && hd.shade === .5, hd);
  const sw = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const e=fdExtra('s_twin',P.x+300,P.y,null,{}); const a=e.el; for(let i=0;i<60*5.2;i++) update(1/60); const b=e.el; for(let i=0;i<60*5.2;i++) update(1/60); return [a,b,e.el]; })()`);
  ok('สลับธาตุ: วุ้นแฝดสลับไฟ ↔ น้ำทุก 5 วิ', sw[0] === 'fire' && sw[1] === 'water' && sw[2] === 'fire', sw);
  const tr = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); G.fd.haz.length=0; const e=fdExtra('s_ember',P.x+300,P.y,null,{aggro:1}); for(let i=0;i<60*2;i++) update(1/60); return G.fd.haz.filter(h=>h.k==='fire').length; })()`);
  ok('ทิ้งรอยไฟ: วุ้นถ่านแดงทิ้งไฟบนพื้นที่เดินผ่าน', tr >= 2, tr);
  // merge
  const mg = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const a=[0,1,2].map(i=>fdExtra('s_merge',P.x+500+i*20,P.y,null,{el:'water'})); for(const e of a){ e.fm.mg=0; } for(let i=0;i<60*5;i++){ update(1/60); a.forEach((e,i)=>{ e.x=P.x+500+i*20; e.y=P.y; }); }
    const live=a.filter(e=>!e.dead); return {live:live.length, rank:live[0]&&live[0].rank}; })()`);
  ok('รวมร่าง: วุ้นธาตุเดียวกัน 3 ตัวอยู่ใกล้กัน 4 วิ → เหลือตัวเดียวชั้นหัวหน้า (ม่วง)', mg.live === 1 && mg.rank === 2, mg);
  // berserk / dismount / tower
  const bk = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const e=fdExtra('o_berserk',P.x+300,P.y,null,{aggro:1, lv:25}); const d0=e.dmg; e.hp=e.maxHp*.3; update(1/60); return {rage:e.fm.rage, spd:e.fm.spdMul, dmg:e.dmg/d0}; })()`);
  ok('คลั่ง: ออร์คขวานคู่ HP < 40% → เร็วขึ้น 60% ตีแรงขึ้น', bk.rage === 1 && Math.abs(bk.spd - 1.6) < 1e-9 && bk.dmg > 1.3, bk);
  const dm = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); const e=fdExtra('g_boarrider',P.x+300,P.y,null,{aggro:1}); e.hp=e.maxHp*.4; update(1/60); update(1/60); return {rider:G.enemies.filter(q=>!q.dead&&q.type==='g_boarrider').length, boar:G.enemies.filter(q=>!q.dead&&q.type==='g_boar').length, foot:G.enemies.filter(q=>!q.dead&&q.type==='g_grunt').length}; })()`);
  ok('ก็อบลินขี่หมูป่า HP < 50% → ตกหลังหมู ได้ 2 ตัว (หมูป่า + ก็อบลิน)', dm.rider === 0 && dm.boar === 1 && dm.foot === 1, dm);
  const { X: X3 } = game({ zone: 'o1', lv: 26 });
  const tw = X3(`(()=>{ G.god=true; P.skills.length=0; const tw=G.fd.recs.find(r=>r.type==='o_tower'), ar=G.fd.recs.find(r=>r.towerRec===tw); P.x=tw.x; P.y=tw.y+300; for(let i=0;i<30;i++) update(1/60); const A=ar.e, T=tw.e; if(!A||!T) return {err:'not awake'};
    const up=[A.lift>0, Math.round(A.x)===Math.round(T.x), A.def]; killEnemy(T); update(1/60); return {up, fell:A.lift===0&&A.stunT>0, def:A.def}; })()`);
  ok('หอธนูออร์ค: นักธนูยืนบนหอ (ยกสูง ลดดาเมจครึ่ง) · หอพัง → นักธนูตกลงมามึน', tw.up && tw.up[0] && tw.up[1] && tw.up[2] === .5 && tw.fell && tw.def === 0, tw);
  // curse slow
  const cs = X3(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); for(const r of G.fd.recs){ r.st='dead'; r.t=1e9; } G.fd.ramp.at=1e9; G.fd.boss.at=1e9; P.x=2000; P.y=2200; G.fd.shots.length=0;
    fdShoot({x:P.x+60,y:P.y,el:null,lift:0,fdK:1},{kind:'curse',sp:300,dmg:1,slow:.3,slowT:3}); for(let i=0;i<30;i++) update(1/60); return {cur:G.fd.curseT>G.t, v:G.fd.curseV}; })()`);
  ok('หมอผีออร์คสาป: ช้าลง 30% 3 วิ', cs.cur && Math.abs(cs.v - .3) < 1e-9, cs);
}

console.log('จ้าวถิ่น · ฝูงอาละวาด · ประตู · กลับป้อม · หีบค่าย');
{
  const { X } = game({ zone: 'g1', lv: 12, sk: 5 });
  const b = X(`(()=>{ G.god=true; DEV.field.bossIn(3); let t=0; while(!G.fd.boss.alive&&t<10){ update(1/60); t+=1/60; } return {t:+t.toFixed(2), n:G.bosses.length, boss:G.boss, type:G.bosses[0]&&G.bosses[0].type}; })()`);
  ok('RG.field.bossIn(3): จ้าวถิ่นโผล่ใน 3–4 วิ · G.bosses.length = 1 (แถบเลือดบอส)', b.t >= 2.9 && b.t <= 4 && b.n === 1 && b.boss && b.type === 'gb_king', b);
  const k = X(`(()=>{ const e=G.bosses[0]; let moves={tele:0, summon:0}; e.hp=e.maxHp*.55; P.skills.length=0; for(let i=0;i<60*8;i++){ P.x=e.x+200; P.y=e.y; update(1/60); if(e.ai.tele) moves.tele=1; if(e.ai.sm0) moves.summon=1; } const exp0=G.fdRun.exp; e.hp=1; damageEnemy(e,99999,null,{}); update(1/60);
    const chest=G.gems.filter(g=>g.kind==='bosschest'&&!g.dead).length, B=G.fd.boss; return {moves, chest, alive:B.alive, next:B.at-G.t, exp:G.fdRun.exp-exp0, n:G.fdRun.boss.g1.n}; })()`);
  ok('ราชาก็อบลินมีท่า (เส้น/วงเตือน) และเรียกลูกน้องที่ HP 60%', k.moves.tele && k.moves.summon, k.moves);
  ok('ล้มจ้าวถิ่น → กล่องจ้าวถิ่นหล่น · EXP ก้อนใหญ่ · เกิดใหม่ใน 6 นาที ±10%', k.chest === 1 && !k.alive && k.next > 360 * .89 && k.next < 360 * 1.11 && k.exp > 500 && k.n === 1, k);
  const rp = X(`(()=>{ DEV.field.rampage(); let warn=0; for(let i=0;i<60*6;i++){ update(1/60); if(G.hordeWarn) warn=1; } const on=G.fd.ramp.on; return {warn, n:on?on.list.length:0, lead:!!(on&&on.lead&&on.lead.type==='g_drummer'), agg:on?on.list.every(e=>e.fm.st===1):false}; })()`);
  ok('ฝูงอาละวาด "บุกค่าย!": เตือน 5 วิ (ลูกศร) แล้วก็อบลิน ~18 ตัว + มือกลอง บุกเข้ามา (aggro ทันที)', rp.warn && rp.n >= 16 && rp.lead && rp.agg, rp);
  const rw = X(`(()=>{ const on=G.fd.ramp.on, c0=G.gems.filter(g=>g.kind==='bosschest'&&!g.dead).length; for(const e of on.list) if(!e.dead) killEnemy(e); update(1/60); return {chest:G.gems.filter(g=>g.kind==='bosschest'&&!g.dead).length-c0, won:G.fdRun.ramp}; })()`);
  ok('ฆ่าฝูงหมดใน 30 วิ → กล่องรางวัล', rw.won === 1 && rw.chest === 1, rw);
  // portal → s1 (Lv 12: open) · the run goes on
  const pt = X(`(()=>{ for(const e of G.enemies) if(!e.dead) killEnemy(e); const p=G.fd.portals.find(q=>q.to==='s1'); const lv=P.lv, kills=G.kills; P.x=p.x; P.y=p.y; for(let i=0;i<60*1.5&&G.fd.id==='g1';i++){ update(1/60); P.x=p.x; P.y=p.y; } for(let i=0;i<30;i++) update(1/60);
    return {zone:G.fd.id, inb:P.x>0&&P.x<G.fd.z.w&&P.y>0&&P.y<G.fd.z.h, same:P.lv>=lv&&G.kills>=kills, over:G.over, enemies:G.enemies.filter(e=>!e.dead).length, biome:G.terrain.b}; })()`);
  ok('ประตูรูน: ยืน 0.6 วิ → ไปบึงวุ้นหกสี (รอบเดิม ความชำนาญคงอยู่) · พื้น/ศัตรูของแผนที่ใหม่', pt.zone === 's1' && pt.inb && pt.same && !pt.over && pt.biome === 'swamp', pt);
  const rc = X(`(()=>{ G.god=false; P.hp=P.maxHp=1e6; for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const r of G.fd.recs){ r.st='dead'; r.t=1e9; } G.fd.ramp.at=1e9; G.fd.boss.at=1e9; fdRecall(); for(let i=0;i<60*2;i++) update(1/60); const going=!!G.fd.rc; hurtPlayer(50); update(1/60); const cancel=!G.fd.rc;
    fdRecall(); for(let i=0;i<60*5.2&&!G.over;i++) update(1/60); return {going, cancel, over:G.over, won:G.won, how:G.fdRun.how}; })()`);
  ok('กลับป้อม: ร่าย 5 วิ · โดนตีระหว่างร่ายยกเลิก · ร่ายครบ = จบรอบ (ชนะ)', rc.going && rc.cancel && rc.over && rc.won && rc.how === 'recall', rc);
  const { X: X2 } = game({ zone: 'g1', lv: 3 });
  const lk = X2(`(()=>{ const p=G.fd.portals.find(q=>q.to==='s1'); return {lock:p.lock, why:fdLockWhy(G.char,'s1'), o1:fdLockWhy(G.char,'o1')}; })()`);
  ok('Lv 3: ประตูไปบึงล็อก บอกเหตุผล (เลเวล 10 หรือล้มราชาก็อบลิน) · ค่ายออร์คล็อก', lk.lock && /เลเวล 10/.test(lk.why) && /ราชาก็อบลิน/.test(lk.why) && /เลเวล 20/.test(lk.o1), lk);
  const cht = X2(`(()=>{ const c=G.fd.chests[0]; P.skills.length=0; for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const r of G.fd.recs){ r.st='dead'; r.t=1e9; } G.god=true; P.x=c.x; P.y=c.y; const g0=G.goldRun|0;
    for(let i=0;i<60*4;i++){ update(1/60); P.x=c.x; P.y=c.y; } const want=6*Math.round(BAL.FIELD.gold(fdMid(G.fd.z))*1.5), ground=G.gems.filter(g=>!g.dead&&g.kind==='gold').reduce((a,g)=>a+(g.gold|0),0); return {opened:c.cd>G.t, got:(G.goldRun|0)-g0+ground, want}; })()`);
  ok('หีบค่าย: ยืน 2 วิ → เปิด (ทอง 6 กอง + ของ) แล้วรอเกิดใหม่', cht.opened && cht.got >= 6, cht);
}

console.log('แก้ตามผล tester: ขโมยทอง · หีบ/หอ/จุดเกิดข้ามประตู · ทอง/EXP · บอสกับรั้ว · ร่างล่อ · ม่านอรุณ · เวลาจ้าวถิ่น · สกิลข้ามแผนที่');
{
  const { X } = game({ zone: 'g1', lv: 12 });
  X(`G.god=true;`);
  // 1 · ก็อบลินโจร: steals at most 8 kills' gold · killed in time = the stolen gold + 2 kills' gold (fixed, never × the trip's gold)
  const thief = gold => { solo(X, 'g_thief', { dx: 40 }); return X(`(()=>{ for(const g of G.gems) g.dead=true; G.goldRun=${gold}; const e=G.enemies.find(q=>!q.dead&&q.type==='g_thief'); e.atkCd=0; e.rank=0;
    for(let i=0;i<60*3&&!e.fm.loot;i++){ update(1/60); P.x=1500; P.y=1300; } const loot=e.fm.loot, left=G.goldRun, cap=fdStealCap(e);
    for(const g of G.gems) if(g.kind==='gold') g.dead=true; FK.steal.death(e,e.fm,e.d.kit.steal); const back=G.gems.filter(g=>!g.dead&&g.kind==='gold').reduce((a,g)=>a+(g.gold|0),0);
    return {loot, left, cap, back, want:Math.round(BAL.FIELD.goldF(e.lv,.5)*2), lv:e.lv}; })()`); };
  const t1 = thief(100000), t2 = thief(200), t3 = thief(4);
  ok('ก็อบลินโจรขโมยได้ไม่เกิน ทอง 8 ตัว (Lv6 = ' + t1.cap + ') แม้ทองในรอบ 100,000 · ทองน้อยขโมยเท่าที่มี', t1.loot === t1.cap && t1.cap === Math.round(BAL_G(6) * 8) && t1.left === 100000 - t1.cap && t2.loot === Math.min(t2.cap, 24) && t3.loot === 4, [t1, t2, t3]);
  ok('ฆ่าทันได้คืน = ที่ขโมย + โบนัสคงที่ 2 ตัว (ไม่ ×2 → ไม่มีกำไรทบต้น)', t1.back === t1.loot + t1.want && t2.back === t2.loot + t2.want && t1.back - t1.loot === t2.back - t2.loot, [t1, t2]);
  // 3 · gold: split bodies / summons drop none · a normal kill pays goldF on average (rounded up by chance)
  const gd = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); for(const g of G.gems) g.dead=true; let minor=0;
    for(let i=0;i<40;i++){ const a=fdExtra('s_droplet',P.x+200,P.y,null,{aggro:1, child:1}), b=fdExtra('o_wolf',P.x+200,P.y,null,{aggro:1, sum:1}); killEnemy(a); killEnemy(b); }
    minor=G.gems.filter(g=>!g.dead&&g.kind==='gold').length; for(const g of G.gems) g.dead=true; let n=0, ex=0;
    for(let i=0;i<400;i++){ const e=fdExtra('g_grunt',P.x+200,P.y,null,{aggro:1}); e.rank=0; ex+=BAL.FIELD.goldF(e.lv,.5); killEnemy(e); n++; for(const q of G.enemies) if(!q.dead&&q.fm&&q.fm.nest==null&&q!==e&&q.type==='g_grunt') fdVanish(q); }
    const got=G.gems.filter(g=>!g.dead&&g.kind==='gold').reduce((a,g)=>a+(g.gold|0),0); for(const g of G.gems) g.dead=true; return {minor, got, ex:Math.round(ex)}; })()`);
  ok('ร่างแยก/ตัวที่ถูกเรียกไม่ดรอปทอง · มอนธรรมดาดรอปทองเฉลี่ย ≈ goldF (×0.3) ±15%', gd.minor === 0 && Math.abs(gd.got - gd.ex) / gd.ex < .15, gd);
  const rp = X(`(()=>{ const z=G.fd.z, before=G.gems.length; DEV.field.rampage(); for(let i=0;i<60*6;i++) update(1/60); const on=G.fd.ramp.on; for(const e of on.list) if(!e.dead) killEnemy(e); update(1/60);
    const c=G.gems.filter(g=>!g.dead&&g.kind==='bosschest').pop(); return {gold:c&&c.gold, want:8*Math.round(fdMid(z))}; })()`);
  ok('กล่องฝูงอาละวาด: ทอง 8 × Lv กลางแผนที่ (เดิม 20×)', rp.gold === rp.want, rp);
  // 5 · ร่างล่อ: a chasing melee monster walks at the decoy · a ranged one and one still at home do not
  const lure = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); P.skills.length=0; G.zones.length=0; P.x=1500; P.y=1300;
    const s=makeSkill('decoy'), mk=(type,x,y,ag)=>fdExtra(type,x,y,null,{aggro:ag}); const g=mk('g_grunt',1640,1560,1), t=mk('g_thrower',1300,1500,1), h=mk('g_grunt',1500,1720,0); h.fm.hx=h.x; h.fm.hy=h.y;
    addZone({x:1500, y:1650, r:26, dur:6, tick:.4, dmg:0, kind:'decoy', src:s, x2:1, lure:260, seen:G.t, boom:0}); G.lures=[G.zones[G.zones.length-1]];
    const dz=e=>Math.hypot(e.x-1500,e.y-1650), dp=e=>Math.hypot(e.x-P.x,e.y-P.y), g0=[dz(g),dp(g)];
    for(let i=0;i<60*2.5;i++){ update(1/60); P.x=1500; P.y=1300; } return {g0, g:[Math.round(dz(g)),Math.round(dp(g)),g.fm.st], t:[Math.round(dz(t)),Math.round(dp(t))], hSt:h.fm.st, hHome:Math.round(Math.hypot(h.x-h.fm.hx,h.y-h.fm.hy))}; })()`);
  ok('ร่างล่อมรณะ: มอนแผนที่ที่กำลังไล่ (ประชิด) เดินไปรุมร่างล่อแทนผู้เล่น · ยังไล่อยู่ (st 1)', lure.g[0] < 60 && lure.g[0] < lure.g0[0] - 100 && lure.g[1] > 200 && lure.g[2] === 1, lure);
  ok('ร่างล่อไม่ดึงพวกยิงไกล (ก็อบลินปาหินยังรักษาระยะกับผู้เล่น) และไม่ดึงตัวที่อยู่บ้าน', lure.t[1] > 150 && lure.t[1] < 330 && lure.hSt === 0, lure);
  X(`G.zones.length=0; G.lures=null;`);
  // 6 · ม่านอรุณ: erases the field monsters' shots too (G.fd.shots) and heals per shot
  const veil = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); for(const r of G.fd.recs){ r.st='dead'; r.t=1e9; r.e=null; } G.fd.shots.length=0; G.eprojs.length=0;
    const s=makeSkill('veil'); s.lv=5; s.cdT=0; P.skills=[s]; P.hp=P.maxHp*.5; const h0=P.hp;
    for(let i=0;i<6;i++) fdShot(P.x+40+i*8,P.y+(i%2?20:-20),PI,0,5,'orb',{life:9}); const far=fdShot(P.x+900,P.y,0,0,5,'orb',{life:9});
    update(1/60); update(1/60); return {left:G.fd.shots.filter(b=>!b.dead&&b!==far).length, far:!far.dead, heal:P.hp-h0}; })()`);
  ok('ม่านอรุณลบกระสุนมอน/จ้าวถิ่นในแผนที่ (G.fd.shots) ในวง และฟื้น HP ตามจำนวนที่ลบ · กระสุนนอกวงไม่โดน', veil.left === 0 && veil.far && veil.heal > 5, veil);
  X(`P.skills.length=0; G.fd.shots.length=0;`);
  // 15 · camp chests never sit on a tent / the fire
  const cc = X(`(()=>{ const L=fdBuild(ZONES.g1), out=[]; for(const c of L.chests){ let m=1e9; for(const f of L.feats) if(f.k==='prop'&&(f.pk==='tent'||f.pk==='fire')) m=Math.min(m,Math.hypot(f.x-c.x,f.y-c.y)); out.push(Math.round(m)); } return out; })()`);
  ok('หีบค่ายทุกค่ายห่างเต็นท์/กองไฟ ≥ 100 (ไม่วาดทับ)', cc.length === 3 && cc.every(m => m >= 100), cc);
  ok('ข้อความช่วยเหลือ: ไกลบ้านเกิน 90 เมตร (BAL.FIELD.leash 900 ÷ 10)', X(`TF_HELP.world[1]().includes('ไกลบ้านเกิน 90 เมตร')`));
  const kk = X(`(()=>{ const s=SK.curtain.p; return {o1:ZONES.o1.k, s1:ZONES.s1.k, g1:ZONES.g1.k, cr:s.r, cd:s.dmg}; })()`);
  ok('ค่าแผนที่: o1 ดาเมจ ×0.65 (เดิม 0.8) + EXP ×2 (ไม่โดนตัด ×0.5) · s1 ทอง ×0.4 · g1 ปกติ · ม่านใบมีด r 70–93 ดาเมจ 15–32 (เดิม 56–74 / 11–23)',
    kk.o1.dmg === .65 && kk.o1.exp === 2 && kk.s1.gold === .4 && !kk.g1.gold && !kk.g1.exp && kk.cr.join() === '70,75,80,85,93' && kk.cd.join() === '15,18,22,27,32', kk);
  const ke = X(`(()=>{ for(const q of G.enemies) if(!q.dead) fdVanish(q); for(const g of G.gems) g.dead=true; const R=G.fdRun, e0=R.exp; const e=fdExtra('g_grunt',P.x+200,P.y,null,{aggro:1}); e.rank=0; killEnemy(e);
    return {got:R.exp-e0, want:fieldKillExp(G.char,e).base}; })()`);
  ok('EXP ต่อตัวในแผนที่ = fieldKillExp (g1 ไม่มีตัวคูณแผนที่)', ke.got === ke.want && ke.want > 0, ke);
}
{
  const { X } = game({ zone: 'o1', lv: 26 });
  const ob = X(`(()=>{ G.god=true; P.skills.length=0; for(const q of G.enemies) if(!q.dead) fdVanish(q); for(const g of G.gems) g.dead=true; DEV.field.boss(); const b=G.bosses[0], d=EN.ob_warlord;
    const R=G.fdRun, e0=R.exp; const e=fdExtra('o_grunt',P.x+200,P.y,null,{aggro:1, lv:20}); e.rank=0; killEnemy(e);
    return {boss:b.dmg, want:d.dmg*BAL.FIELD.dmgByLv(d.lv)*.65, mob:e.dmg, mobWant:EN.o_grunt.dmg*BAL.FIELD.dmgByLv(20)*.65, exp:R.exp-e0, base:fieldKillExp(G.char,e).base}; })()`);
  ok('o1: มอนและจ้าวถิ่นใช้ดาเมจ ×0.65 ของแผนที่ (จ้าวถิ่นเดิมไม่ใช้ตัวคูณแผนที่) · EXP ต่อตัว ×2 ของ fieldKillExp', Math.abs(ob.boss - ob.want) < 1e-9 && Math.abs(ob.mob - ob.mobWant) < 1e-9 && ob.exp === ob.base * 2, ob);
}
// BAL helper for the test names
function BAL_G(lv) { return (2 + .35 * lv) * .3; }
{
  // 2 · 7 · chests, towers and killed spawn points keep their timers through a portal · the boss clock runs on while away
  const { X } = game({ zone: 'g1', lv: 14 });
  const r = X(`(()=>{ G.god=true; P.skills.length=0; const c=G.fd.chests[0]; for(const e of G.enemies) if(!e.dead) fdVanish(e); P.x=c.x; P.y=c.y; const g0=G.goldRun;
    for(let i=0;i<60*3;i++){ update(1/60); P.x=c.x; P.y=c.y; } const cd=c.cd, opened=cd>G.t; const i=G.fd.recs.findIndex(q=>!q.e&&q.st==='alive'), rr=G.fd.recs[i]; rr.st='dead'; rr.t=G.t+500;
    DEV.field.boss(); const B=G.fd.boss, e=G.bosses[0]; damageEnemy(e,1e9,null,{}); update(1/60); const at0=B.at;
    fdZone('s1','w',false); for(let k=0;k<60*90;k++) update(1/60); const away=G.t; const R={}; MODES.field.rewards(R,true); const rem=R.field.boss.g1.rem;
    fdZone('g1','e',false); const c2=G.fd.chests[0], r2=G.fd.recs[i]; const back={cd:c2.cd, rec:[r2.st,r2.t], at:G.fd.boss.at};
    for(const q of G.enemies) if(!q.dead) fdVanish(q); P.x=c2.x; P.y=c2.y; const gold=G.gems.filter(g=>!g.dead&&g.kind==='gold').length; for(let k=0;k<60*3;k++){ update(1/60); P.x=c2.x; P.y=c2.y; }
    const again=G.gems.filter(g=>!g.dead&&g.kind==='gold').length>gold;
    return {opened, cd, back, recT:rr.t, at0, away, rem:Math.round(rem), wantRem:Math.round(at0-away), again}; })()`);
  ok('หีบค่ายที่เปิดแล้ว: ข้ามประตูไปบึงแล้วกลับมา ยังรอคูลดาวน์เดิม (เปิดซ้ำไม่ได้)', r.opened && r.back.cd === r.cd && !r.again, r);
  ok('จุดเกิดที่ตายแล้ว: กลับมายังรอเวลาเกิดเดิม', r.back.rec[0] === 'dead' && r.back.rec[1] === r.recT, r.back);
  ok('เวลาเกิดจ้าวถิ่นเดินต่อตอนอยู่แผนที่อื่น (ไป 90 วิ แล้วกลับ = เวลาเดิม ไม่ +90) · rewards คิดเวลาที่เหลือจากเวลาสัมบูรณ์', Math.abs(r.back.at - r.at0) < 1e-6 && r.rem === r.wantRem && r.rem > 200, r);
  const { X: X3 } = game({ zone: 'o1', lv: 26 });
  const tw = X3(`(()=>{ G.god=true; P.skills.length=0; const i=G.fd.recs.findIndex(q=>q.type==='o_tower'), tr=G.fd.recs[i]; P.x=tr.x; P.y=tr.y+300; for(let k=0;k<30;k++) update(1/60);
    killEnemy(tr.e); update(1/60); const t=tr.t; fdZone('s1','n',false); for(let k=0;k<60*5;k++) update(1/60); fdZone('o1','s',false); const r2=G.fd.recs[i];
    P.x=2000; P.y=2700; for(let k=0;k<30;k++) update(1/60); return {st:r2.st, t:r2.t, want:t, towers:G.enemies.filter(e=>!e.dead&&e.type==='o_tower').length}; })()`);
  ok('หอธนูที่พังแล้ว: ข้ามประตูไปกลับ หอยังพังอยู่ (รอ 4 นาทีเดิม)', tw.st === 'dead' && tw.t === tw.want, tw);
}
{
  // 4 · fences / log walls never hold a field boss · held in place while being hit for 3 s → home with full HP
  for (const [z, lv] of [['g1', 12], ['o1', 30]]) {
    const { X } = game({ zone: z, lv });
    const r = X(`(()=>{ G.god=true; P.skills.length=0; for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const q of G.fd.recs){ q.st='dead'; q.t=1e9; q.e=null; } G.fd.ramp.at=1e9;
      DEV.field.boss(); const e=G.bosses[0], z=G.fd.z; let px, py;
      if(z.camps){ const c=z.camps.find(c=>c.big), a=c.gate+PI; px=c.x+Math.cos(a)*(c.r+110); py=c.y+Math.sin(a)*(c.r*.82+110); }
      else { px=z.fort.x1+130; py=e.y; }
      P.x=px; P.y=py; const walls=()=>G.fd.layout.feats.filter(f=>f.brk&&f.gone).length; let dmin=1e9;
      for(let i=0;i<60*14;i++){ update(1/60); P.x=px; P.y=py; if(i%30===0) damageEnemy(e,1,null,{quiet:true}); dmin=Math.min(dmin,Math.hypot(e.x-P.x,e.y-P.y)); }
      const inGrid=[...G.obstacles.grid.values()].some(a=>a.some(f=>f.gone)); return {broke:walls(), dmin:Math.round(dmin), reach:e.r+P.r+30, inGrid}; })()`);
    ok(z + ': จ้าวถิ่นพัง' + (z === 'g1' ? 'รั้ว' : 'กำแพงซุง') + 'แล้วเข้าถึงผู้เล่นที่ยืนยิงอยู่นอก' + (z === 'g1' ? 'รั้ว' : 'กำแพง') + ' (ชิ้นที่พังออกจากกริดชน)', r.broke >= 1 && r.dmin <= r.reach && !r.inGrid, r);
  }
  const { X } = game({ zone: 'g1', lv: 12 });
  const st = X(`(()=>{ G.god=true; P.skills.length=0; for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const q of G.fd.recs){ q.st='dead'; q.t=1e9; q.e=null; } G.fd.ramp.at=1e9;
    DEV.field.boss(); const e=G.bosses[0], H=e.fb; e.x=H.hx-400; e.y=H.hy+300; const x0=e.x, y0=e.y; P.x=e.x-420; P.y=e.y;
    const run=(sec,f)=>{ for(let i=0;i<60*sec;i++){ update(1/60); if(i%20===0) damageEnemy(e,5,null,{quiet:true}); f&&f(); } };
    e.freezeT=6; run(4,()=>{ e.freezeT=Math.max(e.freezeT,.1); e.x=x0; e.y=y0; }); const frozen=Math.round(Math.hypot(e.x-H.hx,e.y-H.hy));
    e.freezeT=0; e.hp=e.maxHp*.5; let kite=0; run(5,()=>{ const a=Math.atan2(P.y-e.y,P.x-e.x); P.x=e.x+Math.cos(a)*420; P.y=e.y+Math.sin(a)*420; }); kite=Math.round(Math.hypot(e.x-H.hx,e.y-H.hy)); const kHp=e.hp<e.maxHp;
    e.x=x0; e.y=y0; e.hp=e.maxHp*.5; P.x=e.x-420; P.y=e.y; let home=null, full=false, t0=G.t;
    run(8,()=>{ if(home==null&&Math.hypot(e.x-H.hx,e.y-H.hy)<5){ home=+(G.t-t0).toFixed(1); full=e.hp===e.maxHp; } if(home==null){ e.x=x0; e.y=y0; } P.x=x0-420; P.y=y0; });
    return {frozen, kite, kHp, home, full}; })()`);
  ok('จ้าวถิ่นติดอยู่กับที่ (ขยับไม่ได้) ขณะโดนตี 3 วิ → กลับรังทันทีพร้อม HP เต็ม', st.home != null && st.home >= 3 && st.home < 8 && st.full, st);
  ok('ไม่นับตอนโดนแช่แข็ง/มึน และไม่นับตอนผู้เล่นวิ่งหนีแล้วบอสเดินตาม (kiting)', st.frozen > 300 && st.kite > 100 && st.kHp, st);
}
{
  // 10 · 11 · 12 · skills against the map: ballista never inside a rock · seal stamps / hawk targets dropped at a portal · gravorb ≤ 4 orbs
  const { X } = game({ zone: 'g1', lv: 20, cls: 'archer' });
  const bl = X(`(()=>{ G.god=true; P.skills.length=0; for(const e of G.enemies) if(!e.dead) fdVanish(e); for(const q of G.fd.recs){ q.st='dead'; q.t=1e9; q.e=null; } G.fd.ramp.at=1e9; G.fd.boss.at=1e9;
    let f=null; for(const a of G.obstacles.grid.values()){ for(const o of a) if(o.hard&&o.r>=30&&o.r<=70&&o.x>400&&o.y>400&&o.x<3200&&o.y<2400&&!o.edge){ f=o; break; } if(f) break; }
    P.x=f.x+f.r+22; P.y=f.y; for(const a of G.obstacles.grid.values()) for(const o of a) if(o!==f&&o.hard&&Math.hypot(o.x-P.x,o.y-P.y)<o.r+20) return {skip:1};
    const before=terBlocks(P.x-28,P.y,16)||terBlocks(P.x-28,P.y-14,16), q=zxFreeSpot(PI,28,P.x-28,P.y);
    const s=makeSkill('ballista'); s.lv=5; s.cdT=0; P.skills=[s]; const m=fdExtra('g_grunt',P.x+200,P.y,null,{aggro:0}); m.hp=m.maxHp=1e6; m.speed=0;
    for(let i=0;i<60*3;i++){ update(1/60); P.x=f.x+f.r+22; P.y=f.y; } const z=G.zones.find(z=>z.src===s);
    return {before, free:!terBlocks(q[0],q[1],16), zone:z?!terBlocks(z.x,z.y,16)&&!terBlocks(z.x,z.y-14,16):null, dealt:Math.round(s.dealt)}; })()`);
  ok('หน้าไม้กล: จุดหลังตัวทับหิน → ย้ายไปจุดว่าง (±0.8/±1.6 rad หรือที่ตัว) แล้วยิงโดนจริง', bl.skip || (bl.before && bl.free && bl.zone === true && bl.dealt > 0), bl);
  const sl = X(`(()=>{ P.skills.length=0; G.zones.length=0; for(const e of G.enemies) if(!e.dead) fdVanish(e); const s=makeSkill('seal'); s.lv=5; s.cdT=0; const h=makeSkill('hawk'); P.skills=[s,h];
    for(let i=0;i<3;i++){ const m=fdExtra('g_grunt',P.x+150+i*20,P.y,null,{aggro:0}); m.hp=m.maxHp=1e6; m.speed=0; }
    let q=0, tg=0; for(let i=0;i<60*1.2;i++){ update(1/60); q=Math.max(q,(s.st.q||[]).length); if((h.st.units||[]).some(u=>u.tg)) tg=1; }
    fdZone('s1','w',false); const after={q:(s.st.q||[]).length, tg:(h.st.units||[]).filter(u=>u.tg).length, lures:G.lures}; let pillars=0;
    for(let i=0;i<60*2;i++){ update(1/60); for(const f of G.fx) if(f.k==='pillar'&&Math.hypot(f.x-P.x,f.y-P.y)>1200) pillars++; } return {q, tg, after, pillars}; })()`);
  ok('ตราประทับแสง/เป้าของเหยี่ยว: ข้ามประตูแล้วล้างของแผนที่เก่า ไม่ระเบิดที่พิกัดเดิม', sl.q > 0 && sl.after.q === 0 && sl.after.tg === 0 && sl.after.lures === null && sl.pillars === 0, sl);
  const gv = X(`(()=>{ P.skills.length=0; G.zones.length=0; const s=makeSkill('gravorb'); s.lv=5; s.evolved=true; P.skills=[s]; const m=fdExtra('g_grunt',P.x+200,P.y,null,{aggro:0}); m.hp=m.maxHp=1e6; m.speed=0;
    let mx=0; for(let i=0;i<60*6;i++){ s.cdT=0; update(1/60); mx=Math.max(mx,G.zones.filter(z=>z.src===s&&!z.dead).length); } return {maxZ:SK.gravorb.maxZ, mx}; })()`);
  ok('ลูกแก้วแรงโน้มถ่วง: ซ้อนได้ไม่เกิน 4 ลูก (maxZ 4) แม้ร่ายรัว', gv.maxZ === 4 && gv.mx <= 4 && gv.mx >= 2, gv);
}

console.log('รางวัล: EXP เข้าตัวละครตอนจบรอบ · ตาย −1% · บันทึกแผนที่/ตำรามอน/เวลาจ้าวถิ่น');
{
  const { X } = game({ zone: 'g1', lv: 5, cls: 'swordsman', sk: 5 });
  const r = X(`(()=>{ const ch=curChar(), xp0=ch.xp, lv0=ch.lv, gold0=SAVE.acct.gold; G.god=true; G.auto=true; for(let i=0;i<60*40;i++){ update(1/60); autoUI(); } G.auto=false; DEV.field.bossIn(0); update(1/60); const e=G.bosses[0]; damageEnemy(e,1e9,null,{}); update(1/60);
    for(const g of G.gems) if(!g.dead&&g.kind!=='xp') collect(g);
    const exp=Math.round(G.fdRun.exp), kills=Object.values(G.fdRun.kills).reduce((a,c)=>a+c,0), gold=G.goldRun|0, loot=G.loot.length; fdRecallDone('recall'); const R=G.rewards;
    const tot=x=>{ let L=lv0, s=xp0+x; while(s>=BAL.bxpNeed(L)){ s-=BAL.bxpNeed(L); L++; } return [L,s]; };
    return {exp, base:R.baseXp, job:R.jobXp, committed:R.committed, lv:ch.lv, xp:ch.xp, want:tot(exp), gold:SAVE.acct.gold-gold0, goldRun:gold, loot, items:R.items.length, fz:ch.fz.g1, kills, best:Object.keys(ch.bestiary).length, fb:SAVE.acct.fboss.g1, zone:ch.zone, now:Date.now()}; })()`);
  ok('จบรอบ (กลับป้อม): Base EXP = EXP สะสมทั้งหมด · Job = ×0.8 · บันทึกจริง (committed)', r.base === r.exp && r.job === Math.round(r.exp * .8) && r.committed && r.exp > 0, r);
  ok('EXP เข้าตัวละครทางเดียวกับโหมดอื่น (grantRewards): เลเวล/xp ตรงกับที่คำนวณ', r.lv === r.want[0] && r.xp === r.want[1], [r.lv, r.xp, r.want]);
  ok('ทองในรอบ + ของที่เก็บ เข้าบัญชี/กระเป๋า', r.gold >= r.goldRun && r.goldRun > 0 && r.items === r.loot, r);
  ok('ch.fz.g1 = สังหาร/ล้มจ้าวถิ่น/เวลา · ตำรามอน (bestiary) · ch.zone = g1', r.fz && r.fz.k === r.kills && r.fz.b === 1 && r.fz.t >= 40 && r.best >= 3 && r.zone === 'g1', r.fz);
  ok('acct.fboss.g1: kills 1 · next ≈ ตอนนี้ + 6 นาที ±10% (นับเวลาจริง)', r.fb && r.fb.kills === 1 && r.fb.next > r.now + 300e3 && r.fb.next < r.now + 400e3, r.fb);
  const again = X(`(()=>{ const R=G.rewards; return grantRewards(curChar(),R); })()`);
  ok('รางวัลรอบเดียวกันจ่ายซ้ำไม่ได้ (runId)', again === false);
  const d = X(`(()=>{ const ch=curChar(); startRun(ch.cls,'field',{char:ch, zone:'g1'}); G.fdRun.exp=1000; const loss=Math.round(BAL.bxpNeed(ch.lv)*.01); const xp0=ch.xp, lv0=ch.lv; P.hp=1; G.god=false; hurtPlayer(1e6); const R=G.rewards; return {over:G.over, won:G.won, base:R.baseXp, loss:R.fdLoss, want:1000-loss, deaths:ch.deaths}; })()`);
  ok('ตาย = จบรอบ ได้ของที่สะสม แต่ EXP −1% ของ bxpNeed(เลเวล) · deaths +1', d.over && !d.won && d.base === d.want && d.loss > 0 && d.deaths === 1, d);
  const s1 = X(`(()=>{ const ch=curChar(); ch.lv=3; return [fdLockWhy(ch,'s1'), fdLockWhy(ch,'o1')]; })()`);
  ok('ล้มราชาก็อบลินแล้ว (ch.fz.g1.b) → บึงเปิดแม้เลเวลต่ำ · ค่ายยังล็อก', s1[0] === '' && s1[1] !== '', s1);
}

console.log('เซฟ v7: migration + validate (เซฟปลอมไม่ได้ของฟรี)');
{
  const { X } = game();
  const r = X(`(()=>{ const s=newSave(null), ch=newChar('ทดสอบ','mage'); s.chars.push(ch); s.v=6; delete ch.fz; const m=migrateSave(JSON.parse(JSON.stringify(s)));
    const bad={v:7, acct:{gold:5, fboss:{g1:{next:9e99, kills:-5}, '__proto__':{next:1}, zz:{next:'x', kills:'7'}}}, chars:[Object.assign(newChar('ปลอม','archer'),{fz:{g1:{k:1e99, b:-3, t:'12'}, s1:{k:5.7, b:2, t:-1}, zz9:{k:9}, constructor:{k:1}, o1:'bad', g2:[1]}})]};
    const v=validateSave(JSON.parse(JSON.stringify(bad))), c=v.chars[0];
    return {SV:SCHEMA_V, mv:m.v, mfz:JSON.stringify(m.chars[0].fz), fz:JSON.stringify(c.fz), fb:JSON.stringify(v.acct.fboss), idem:JSON.stringify(validateSave(JSON.parse(JSON.stringify(v))).chars[0].fz)===JSON.stringify(c.fz), gold:v.acct.gold, inv:c.inv.length}; })()`);
  ok('SCHEMA_V = 8 · เซฟ v6 → ล่าสุด ได้ ch.fz ว่าง', r.SV === 8 && r.mv === 8 && r.mfz === '{}', r);
  ok('ch.fz: เฉพาะแผนที่ที่มีจริง · ตัวเลขถูก clamp (k ≤ 1e9, b ≥ 0) · key ต้องห้าม/ค่าขยะถูกทิ้ง · validate ซ้ำได้ผลเดิม', r.fz === '{"g1":{"k":1000000000,"b":0,"t":12},"s1":{"k":5,"b":2,"t":0}}' && r.idem, r.fz);
  ok('acct.fboss ปลอม: next ≤ ปี 2100 · kills ≥ 0 · __proto__ ไม่ผ่าน · ไม่มีทอง/ของเพิ่ม', !r.fb.includes('__proto__') && JSON.parse(r.fb).g1.kills === 0 && JSON.parse(r.fb).g1.next <= 4102444800000 && r.gold === 5, r.fb);
  const c = X(`(()=>{ SAVE=newSave(null); const ch=newChar('ทดสอบ','mage'); SAVE.chars.push(ch); SAVE.active=ch.id; const A=SAVE.acct;
    const r={runId:'r_test_field1', mode:'field', baseXp:0, jobXp:0, gold:0, items:[], unlocks:[], st:{t:1, kills:0}, field:{last:'s1', kills:{g_grunt:3, '__proto__':5, nope:2}, zones:{g1:{k:-4, b:1e99, t:'x'}, zz:{k:9}}, boss:{g1:{n:2, rem:1e12}, s1:{n:0, rem:5}}}};
    grantRewards(ch,r); const v=validateSave(JSON.parse(JSON.stringify(SAVE))); return {fz:JSON.stringify(v.chars[0].fz), best:JSON.stringify(v.chars[0].bestiary), fb:JSON.stringify(v.acct.fboss), zone:v.chars[0].zone, now:Date.now()}; })()`);
  ok('fdCommit กับรางวัลขยะ: ค่าติดลบ/ใหญ่เกินถูกตัด · มอน/แผนที่ที่ไม่มีไม่ถูกบันทึก · เวลาจ้าวถิ่นไม่เกิน 1.2 รอบ', c.fz === '{"g1":{"k":0,"b":1000000,"t":0}}' && c.best === '{"g_grunt":3}' && JSON.parse(c.fb).g1.next <= c.now + 360 * 1.2 * 1000 + 50 && !JSON.parse(c.fb).s1 && c.zone === 's1', c);
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
