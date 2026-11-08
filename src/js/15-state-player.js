/* ================= state ================= */
let G=null, P=null, titleT=0, selected='swordsman';
const cam={x:0,y:0};
const keys={};
const joy={on:false,id:null,ox:0,oy:0,dx:0,dy:0};
const BEH={};

function makeSkill(id){ return {id,def:SK[id],lv:1,evolved:false,cdT:.35,dealt:0,st:{}}; }
function pv(s,k){ if(s.evolved){ const st=s.def.evo.set; if(k in st) return st[k]; } const v=s.def.p[k]; return Array.isArray(v)?v[s.lv-1]:v; }
function cdOf(s){ return Math.max(.08,pv(s,'cd')*P.cdMul); }
function countOf(s){ let n=pv(s,'count')||1; const t=s.def.type; if(t==='proj') n+=pv(s,'radial')?P.extraProj*2:P.extraProj; else if(t==='orbit') n+=P.extraProj; return n; }
function makePlayer(cls){
  const p={cls,adv:null,x:0,y:0,vx:0,vy:0,kx:0,ky:0,r:15,hp:cls.hp,maxHp:0,lv:1,xp:0,need:xpNeed(1),skills:[],stats:{STR:0,AGI:0,VIT:0,INT:0,DEX:0,LUK:0},
    face:1,aim:0,moveA:0,moving:false,t:0,hurtT:0,atkT:0,stepT:0,shield:0,shieldMax:1,shieldSrc:null,dodgeCd:0,swing:null,advOffered:false,look:Object.assign({},cls.look)};
  p.skills.push(makeSkill(cls.skills[0]));
  return p;
}
function recalc(p){
  const c=p.cls,b=p.bonus||(p.adv&&p.adv.bonus)||{},s=p.stats,oldMax=p.maxHp;   // p.bonus: run bonus from a character (prepareRun)
  p.maxHp=c.hp+(b.hp||0)+20*s.VIT;
  p.speed=c.speed*(1+(b.speed||0))*(1+.07*s.AGI);
  p.armor=c.armor+(b.armor||0);
  p.crit=c.crit+(b.crit||0)+.05*s.LUK; p.critMult=1.75+(b.critMult||0);
  p.regen=c.regen+(b.regen||0)+.4*s.VIT;
  p.might=1+(b.might||0)+.12*s.STR;
  p.area=1+(b.area||0)+.1*s.INT; p.durMul=1+.1*s.INT+(b.dur||0);
  p.cdMul=(b.cd||1)*Math.pow(.96,s.AGI)*Math.pow(.94,s.DEX);
  p.magnet=125*(b.magnet||1)*(1+.2*s.LUK); p.xpMul=1+(b.xp||0)+.06*s.LUK;
  p.extraProj=(b.proj||0)+(s.DEX>=3?1:0)+(s.DEX>=5?1:0);
  p.dodge=0; p.rage=0; p.steal=0;
  for(const k of p.skills){ if(k.def.type!=='passive') continue; const d=pv(k,'dodge'); if(d) p.dodge=Math.max(p.dodge,d); const r=pv(k,'rage'); if(r) p.rage=r; const st=pv(k,'steal'); if(st) p.steal=st; }
  if(b.dodge) p.dodge=Math.min(.6,p.dodge+b.dodge); if(b.rage) p.rage+=b.rage; if(b.steal) p.steal+=b.steal;
  p.drop=b.drop||0; p.bossDmg=b.boss||0; p.fam=b.fam||null;
  if(oldMax&&p.maxHp>oldMax) p.hp+=p.maxHp-oldMax;
  p.hp=Math.min(p.hp,p.maxHp);
}

