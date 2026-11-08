/* ================= audio ================= */
const AU={ctx:null,master:null,on:true,last:{},noise:null};
function initAudio(){
  if(AU.ctx){ if(AU.ctx.state==='suspended') AU.ctx.resume().catch(()=>{}); return; }
  try{ const C=window.AudioContext||window.webkitAudioContext; if(!C) return; AU.ctx=new C(); AU.master=AU.ctx.createGain(); AU.master.gain.value=AU.on?.32:0; AU.master.connect(AU.ctx.destination);
    const b=AU.ctx.createBuffer(1,AU.ctx.sampleRate*.5|0,AU.ctx.sampleRate); const d=b.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; AU.noise=b; }catch(e){ AU.ctx=null; }
}
function tone(f,dur,type,vol,f2,delay){const c=AU.ctx,t=c.currentTime+(delay||0);const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(vol,t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(AU.master);o.start(t);o.stop(t+dur+.03);}
function noise(dur,vol,freq,delay){const c=AU.ctx,t=c.currentTime+(delay||0);const s=c.createBufferSource();s.buffer=AU.noise;const f=c.createBiquadFilter();f.type='lowpass';f.frequency.setValueAtTime(freq,t);f.frequency.exponentialRampToValueAtTime(Math.max(60,freq*.2),t+dur);const g=c.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.0001,t+dur);s.connect(f);f.connect(g);g.connect(AU.master);s.start(t);s.stop(t+dur+.02);}
const SFX={
  shoot:()=>tone(640+Math.random()*80,.06,'triangle',.04,420),
  swing:()=>noise(.09,.12,2600),
  hit:()=>tone(170,.05,'square',.025,90),
  kill:()=>tone(300+Math.random()*60,.07,'triangle',.045,150),
  boom:()=>{noise(.35,.28,900);tone(90,.3,'sine',.22,40);},
  zap:()=>{noise(.12,.1,5000);tone(1200,.08,'sawtooth',.035,300);},
  slice:()=>noise(.06,.12,4200),
  hurt:()=>tone(140,.15,'sawtooth',.1,70),
  pickup:()=>tone(980+Math.random()*240,.05,'sine',.04,1400),
  level:()=>[523,659,784,1046].forEach((f,i)=>tone(f,.18,'triangle',.08,0,i*.07)),
  heal:()=>[660,880].forEach((f,i)=>tone(f,.2,'sine',.06,0,i*.08)),
  wave:()=>[392,523].forEach((f,i)=>tone(f,.25,'triangle',.07,0,i*.12)),
  boss:()=>{tone(110,.9,'sawtooth',.1,82);tone(55,1,'sine',.18,50);},
  win:()=>[523,659,784,1046,1318].forEach((f,i)=>tone(f,.3,'triangle',.09,0,i*.1)),
  lose:()=>[392,330,262,196].forEach((f,i)=>tone(f,.35,'triangle',.09,0,i*.16)),
  shield:()=>tone(520,.25,'sine',.07,780),
};
const SFX_GAP={hit:.045,kill:.035,pickup:.03,shoot:.05,swing:.05,boom:.07,zap:.05,slice:.04};
function sfx(n){ if(!AU.ctx||!AU.on||(G&&G.auto)) return; const now=AU.ctx.currentTime; const gap=SFX_GAP[n]??.02; if((AU.last[n]||-1)>now-gap) return; AU.last[n]=now; try{ SFX[n]&&SFX[n](); }catch(e){} }
function setMuteLabels(){ const t='เสียง: '+(AU.on?'เปิด':'ปิด'); $('#btnMuteT').textContent=t; $('#btnMuteP').textContent=t; $('#btnMute').textContent=AU.on?'เสียง':'ปิดเสียง'; }
function toggleMute(){ AU.on=!AU.on; if(AU.master) AU.master.gain.value=AU.on?.32:0; setMuteLabels(); }

