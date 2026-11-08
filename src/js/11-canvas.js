/* ================= canvas setup ================= */
const cv=$('#game'), ctx=cv.getContext('2d',{alpha:false});
let W=0,H=0,DPR=1,ZOOM=1,VW=0,VH=0, vig=null, groundPat=null, SPR_SS=1.5;
function resize(){
  DPR=Math.min(window.devicePixelRatio||1,QDPR[qLv()]); W=Math.max(1,innerWidth); H=Math.max(1,innerHeight); cv.width=W*DPR|0; cv.height=H*DPR|0;
  ZOOM=clamp(Math.min(W,H)/650,.62,1.4); VW=W/ZOOM; VH=H/ZOOM; vig=makeVignette();
  const ss=QSS[qLv()]; if(ss!==SPR_SS){ SPR_SS=ss; for(const k in SPR) delete SPR[k]; }
}
function makeVignette(){ const c=mkCanvas(W/2,H/2),g=c.getContext('2d'),w=c.width,h=c.height,r=Math.hypot(w,h)/2,grd=g.createRadialGradient(w/2,h/2,r*.32,w/2,h/2,r); grd.addColorStop(0,'rgba(5,8,4,0)'); grd.addColorStop(1,'rgba(5,8,4,.8)'); g.fillStyle=grd; g.fillRect(0,0,w,h); return c; }
function makeGround(){ const s=512,c=mkCanvas(s,s),g=c.getContext('2d'); g.fillStyle='#1b2316'; g.fillRect(0,0,s,s);
  const blot=(x,y,r,col)=>{ g.fillStyle=col; for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++){ g.beginPath(); g.ellipse(x+dx*s,y+dy*s,r,r*.7,0,0,TAU); g.fill(); } };
  for(let i=0;i<70;i++) blot(rand(0,s),rand(0,s),rand(30,80),`rgba(${rand(26,44)|0},${rand(38,58)|0},${rand(20,32)|0},.35)`);
  for(let i=0;i<34;i++) blot(rand(0,s),rand(0,s),rand(16,44),`rgba(${rand(46,60)|0},${rand(38,48)|0},${rand(28,36)|0},.3)`);
  for(let i=0;i<520;i++){ g.fillStyle=`rgba(${rand(50,80)|0},${rand(72,104)|0},${rand(40,60)|0},${rand(.22,.5)})`; g.fillRect(rand(2,s-4),rand(2,s-6),1.5,rand(2,5)); }
  for(let i=0;i<60;i++){ g.fillStyle=`rgba(${rand(70,100)|0},${rand(70,90)|0},${rand(60,75)|0},${rand(.25,.45)})`; g.beginPath(); g.ellipse(rand(4,s-4),rand(4,s-4),rand(1.2,2.6),rand(.8,1.6),0,0,TAU); g.fill(); }
  for(let i=0;i<120;i++){ g.fillStyle=`rgba(0,0,0,${rand(.08,.18)})`; g.fillRect(rand(0,s-4),rand(0,s-4),rand(2,4),rand(2,4)); }
  return c; }

