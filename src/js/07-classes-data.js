const CLASSES=[
{id:'swordsman',n:'นักดาบ',e:'Swordsman',d:'นักสู้แนวหน้า HP หนา ฟันฝูงซอมบี้ให้กระเด็นกระจาย',hp:150,speed:172,armor:4,crit:.05,regen:.3,
 rating:{hp:5,atk:3,spd:3,rng:1},skills:['slash','slam','blades','bulwark'],skx:['flyblade','riposte'],
 look:{body:'#3d6db3',trim:'#d9e2ef',pants:'#2d3442',hair:'#7a4a26',hat:'helm',hatC:'#aeb9c7',weapon:'sword',wc:'#e6edf7'},
 adv:[{id:'knight',n:'พลหอกพิทักษ์',e:'Lancewarden',d:'ผู้พิทักษ์หุ้มเกราะ พุ่งหอกทะลวงแนวศัตรู',bonus:{hp:40,armor:3},bt:'HP +40 · เกราะ +3',skills:['lance','valor'],skx:['palisade','thrust'],
   look:{body:'#2c4a8f',trim:'#f0c75a',hatC:'#d5dde8',orn:'plume',ornC:'#d8444c',weapon:'lance',wc:'#f3d27a',cape:'#7a1f2b'}},
  {id:'berserker',n:'เบอร์เซิร์กเกอร์',e:'Berserker',d:'นักรบคลั่ง ยิ่งบาดเจ็บยิ่งอันตราย',bonus:{might:.15,speed:.08},bt:'ดาเมจ +15% · ความเร็ว +8%',skills:['cyclone','frenzy'],skx:['bloodrite','chainaxe'],
   look:{body:'#8a2f2a',trim:'#2a1a18',hatC:'#6d5c4f',orn:'horns',ornC:'#efe4cc',weapon:'axe',wc:'#cfd3d8'}}]},
{id:'mage',n:'จอมเวท',e:'Mage',d:'ปล่อยเวทธาตุถล่มฝูงศัตรูจากระยะไกล แต่ตัวบาง',hp:90,speed:165,armor:0,crit:.05,regen:.2,
 rating:{hp:1,atk:5,spd:2,rng:4},skills:['mbolt','flame','frost','thunder'],skx:['gravorb','aquaring'],
 look:{body:'#5b3a8e',trim:'#f0b545',pants:'#2a2240',hair:'#e8dcc0',hat:'wizard',hatC:'#45296f',weapon:'staff',wc:'#c09cff'},
 adv:[{id:'archmage',n:'จอมเวทดาราตก',e:'Starfall Magus',d:'ผู้เรียกอุกกาบาตและพายุหิมะ',bonus:{area:.15,might:.1},bt:'พื้นที่สกิล +15% · ดาเมจ +10%',skills:['meteor','blizzard'],skx:['comet','rift'],
   look:{body:'#7a2d4f',trim:'#ffd76a',hatC:'#5a1f3a',orn:'star',ornC:'#ffd76a',wc:'#ff8a4a',cape:'#2a1030'}},
  {id:'elementalist',n:'นักเวทธาตุ',e:'Elementalist',d:'ควบคุมลมและหิน ดูดศัตรูมารวมแล้วบดขยี้',bonus:{cd:.88},bt:'คูลดาวน์ −12%',skills:['vortex','spikes'],skx:['volcano','leafblade'],
   look:{body:'#2f6f68',trim:'#b9ffcf',hatC:'#1f4f4a',orn:'gem',ornC:'#8fffd0',wc:'#8fffd0'}}]},
{id:'archer',n:'นักธนู',e:'Archer',d:'ยิงไวเดินไว เก่งการวิ่งวนยิงรอบฝูง',hp:100,speed:190,armor:1,crit:.08,regen:.2,
 rating:{hp:2,atk:4,spd:4,rng:5},skills:['arrow','spread','rain','trap'],
 look:{body:'#4f7a3a',trim:'#c9a66b',pants:'#3b2f22',hair:'#d9a441',hat:'cap',hatC:'#3d6a2c',orn:'feather',ornC:'#e84a4a',weapon:'bow',wc:'#b07a40'},
 adv:[{id:'ranger',n:'พรานเหยี่ยวลม',e:'Windhawk Tracker',d:'นักล่ากับเหยี่ยวคู่ใจ ยิงธนูรอบทิศ',bonus:{speed:.08,proj:1},bt:'ความเร็ว +8% · กระสุน +1',skills:['hawk','arrownova'],
   look:{body:'#3f5f2c',hat:'hood',hatC:'#2f4a22',orn:'',weapon:'bow',wc:'#8a5a30',cape:'#2f4a22'}},
  {id:'sharpshooter',n:'มือธนูเจาะดาว',e:'Starpiercer',d:'ยิงนัดเดียวจอด เน้นคริติคอลและลูกระเบิด',bonus:{crit:.15,critMult:.5},bt:'คริติคอล +15% · แรงคริ +50%',skills:['deadeye','blast'],
   look:{body:'#5a4a3a',trim:'#ff5d73',hatC:'#2b2b33',orn:'feather',ornC:'#ff5d73',weapon:'longbow',wc:'#4a4a56'}}]},
{id:'cleric',n:'นักบวช',e:'Cleric',d:'ผู้ใช้แสงศักดิ์สิทธิ์ ฟื้นฟูตัวเองและแผดเผาอันเดด',hp:115,speed:168,armor:2,crit:.05,regen:.8,
 rating:{hp:4,atk:3,spd:2,rng:3},skills:['holy','heal','sacred','cross'],
 look:{body:'#ece4d2',trim:'#c99a2e',pants:'#6b5e4a',hair:'#a35a2a',hat:'hood',hatC:'#f6f1e6',weapon:'rod',wc:'#f0c75a'},
 adv:[{id:'highcleric',n:'ผู้เฝ้าแสงอรุณ',e:'Dawnkeeper',d:'เรียกเสาแสงพิพากษาและเกราะเทวา',bonus:{hp:30,regen:1},bt:'HP +30 · ฟื้น HP +1 ต่อวินาที',skills:['judgment','aegis'],
   look:{body:'#f7f2e6',trim:'#3a6fd8',hatC:'#ffffff',orn:'mitre',ornC:'#f0c75a',wc:'#fff1a8',cape:'#3a6fd8'}},
  {id:'templar',n:'นักพรตหมัดสุริยะ',e:'Sunfist Ascetic',d:'นักรบศักดิ์สิทธิ์ ชกรัวพร้อมดวงไฟสุริยะ',bonus:{speed:.12,armor:2},bt:'ความเร็ว +12% · เกราะ +2',skills:['fists','spheres'],
   look:{body:'#c9b48a',trim:'#8a2b2b',hat:'helm',hatC:'#d8c9a3',orn:'cross',ornC:'#8a2b2b',weapon:'fist',wc:'#ffd27a'}}]},
{id:'thief',n:'โจร',e:'Thief',d:'เร็วที่สุด คริติคอลสูง และหลบหลีกได้',hp:92,speed:205,armor:0,crit:.12,regen:.2,
 rating:{hp:1,atk:4,spd:5,rng:3},skills:['dagger','fan','venom','shadow'],
 look:{body:'#3b3346',trim:'#9b3b4a',pants:'#262230',hair:'#2a2a33',hat:'bandana',hatC:'#9b3b4a',orn:'mask',ornC:'#262230',weapon:'dagger',wc:'#e6e6f0'},
 adv:[{id:'assassin',n:'มือมีดจันทร์ดับ',e:'Eclipseblade',d:'พุ่งฟันเป้าหมายแข็งแกร่งในพริบตา',bonus:{crit:.12,speed:.1},bt:'คริติคอล +12% · ความเร็ว +10%',skills:['phantom','whirl'],
   look:{body:'#232028',trim:'#c23048',hat:'hood',hatC:'#1c1a22',orn:'mask',ornC:'#c23048',weapon:'twinblade',wc:'#e9e9f5',cape:'#c23048'}},
  {id:'nightblade',n:'ใบมีดราตรี',e:'Nightblade',d:'ใช้ร่างเงาและระเบิดควันคุมฝูง',bonus:{xp:.2,magnet:1.4},bt:'EXP +20% · ระยะดูดของ +40%',skills:['clones','smoke'],
   look:{body:'#3a2d5e',trim:'#9a7dff',hat:'hood',hatC:'#2c2248',orn:'mask',ornC:'#9a7dff',weapon:'dagger',wc:'#c3b0ff'}}]},
];
const CLS={}; for(const c of CLASSES) CLS[c.id]=c;
// skx = the skills only character modes have (docs/PROPOSAL-skill-trees.md §3: 4 → 6 first-job · 2 → 4 per advanced path).
// Classic reads `skills` alone (level-up pool, job pick, class card) → its runs and the golden files never see them.
function clsSkills(c){ return c?c.skills.concat(c.skx||[]):[]; }
function advSkills(a){ return a?a.skills.concat(a.skx||[]):[]; }
const CLONE_LOOK={body:'#4b3a86',trim:'#9a7dff',pants:'#2a2248',hair:'#1a1430',hat:'hood',hatC:'#2c2248',orn:'mask',ornC:'#9a7dff',weapon:'dagger',wc:'#c3b0ff',skin:'#9d8fd0'};

