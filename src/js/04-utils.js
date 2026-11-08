/* ================= utils ================= */
const TAU=Math.PI*2, PI=Math.PI;
const rand=(a,b)=>a+Math.random()*(b-a);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const pick=a=>a[(Math.random()*a.length)|0];
const ease=t=>1-(1-t)*(1-t);
const $=s=>document.querySelector(s);
const W4=[0,1,0,-1];
const OFF8=[[1,0],[-1,0],[0,1],[0,-1],[.7,.7],[-.7,.7],[.7,-.7],[-.7,-.7]];
function angDiff(a,b){let d=(a-b)%TAU;if(d>PI)d-=TAU;else if(d<-PI)d+=TAU;return d;}
function segD2(px,py,ax,ay,bx,by){const dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy;let t=l?((px-ax)*dx+(py-ay)*dy)/l:0;t=t<0?0:t>1?1:t;const x=ax+dx*t-px,y=ay+dy*t-py;return x*x+y*y;}
function compact(a){let j=0;for(let i=0;i<a.length;i++){const o=a[i];if(!o.dead)a[j++]=o;}a.length=j;}
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)').matches;
const TOUCH=matchMedia('(pointer: coarse)').matches;
const fmtTime=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const fmtClock=s=>{s=Math.max(0,Math.floor(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
const fmtNum=n=>n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e4?(n/1e3).toFixed(1)+'k':Math.round(n).toLocaleString('en-US');
function hexA(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16&255},${n>>8&255},${n&255},${a})`;}
function shade(hex,amt){const n=parseInt(hex.slice(1),16);let r=n>>16&255,g=n>>8&255,b=n&255;if(amt<0){r*=1+amt;g*=1+amt;b*=1+amt;}else{r+=(255-r)*amt;g+=(255-g)*amt;b+=(255-b)*amt;}return '#'+((1<<24)|((r|0)<<16)|((g|0)<<8)|(b|0)).toString(16).slice(1);}
function rrect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}
function circ(c,col,x,y,r){c.fillStyle=col;c.beginPath();c.arc(x,y,Math.max(0,r),0,TAU);c.fill();}
function limb(c,col,w,x1,y1,x2,y2){c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke();}
function star(c,x,y,r,col){c.fillStyle=col;c.beginPath();for(let i=0;i<10;i++){const rr=i%2?r*.45:r,a=-PI/2+i*PI/5;c.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}c.closePath();c.fill();}
function hash2(x,y){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296;}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=Math.max(1,w|0);c.height=Math.max(1,h|0);return c;}

