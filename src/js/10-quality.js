/* ================= quality ================= */
const QUAL={mode:'auto',level:TOUCH?1:2};
try{ const q=localStorage.getItem('runeguard.quality'); if(q&&['auto','low','mid','high'].indexOf(q)>=0) QUAL.mode=q; }catch(e){}
const qLv=()=>QUAL.mode==='auto'?QUAL.level:({low:0,mid:1,high:2})[QUAL.mode];
const QDPR=[1,1.5,2],QPART=[200,450,800],QDECAL=[20,60,110],QCORPSE=[12,35,65],QSS=[1,1.25,1.5];
/* auto quality watches two things, each clamped so one hitch can't move it:
   workEMA = ms spent in update+render (CPU side), rawEMA = ms between frames (catches GPU-bound slowdowns) */
let workEMA=6,rawEMA=16.7,qTimer=0;
function autoQuality(workMs,rawMs){ if(QUAL.mode!=='auto'||!G||G.ui||G.over) return;
  workEMA+=(Math.min(50,workMs)-workEMA)*.04; rawEMA+=(Math.min(50,rawMs)-rawEMA)*.04; qTimer+=Math.min(.05,rawMs/1000);
  if((workEMA>11||rawEMA>24)&&QUAL.level>0&&qTimer>2.5){ QUAL.level--; qTimer=0; workEMA=6; rawEMA=16.7; resize(); }
  else if(workEMA<4.5&&rawEMA<18.5&&QUAL.level<2&&qTimer>8){ QUAL.level++; qTimer=0; workEMA=6; rawEMA=16.7; resize(); } }
function setQuality(m){ QUAL.mode=m; if(m==='auto'){ QUAL.level=TOUCH?1:2; workEMA=6; rawEMA=16.7; qTimer=0; } try{ localStorage.setItem('runeguard.quality',m); }catch(e){} resize(); renderQualityButtons(); }
function renderQualityButtons(){ for(const b of document.querySelectorAll('#qSeg button')) b.setAttribute('aria-pressed',b.dataset.q===QUAL.mode?'true':'false');
  $('#qNow').textContent=QUAL.mode==='auto'?'ตอนนี้: '+['ต่ำ','กลาง','สูง'][QUAL.level]:''; }

