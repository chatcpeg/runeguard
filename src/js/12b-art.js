/* ================= 12b-art.js · painted art: characters, monsters, ground and scenery (drawing only) ================= */
// The chibi art (tools/art/*.py · Qwen-Image 2.1 + BiRefNet through ComfyQ · original designs) lives on the `art` branch of the
// game's GitHub repo and is served by jsDelivr under a fixed commit (12a-art-data.js). Each image replaces its vector painter
// once it has loaded and the player has not switched the art off (pause → ภาพตัวละคร). Until then — or offline on a first
// visit — the vector look stays. Nothing here is read by the simulation, so classic/golden runs are the same either way.
const ART={on:true, img:{}, cb:{}, base:'https://cdn.jsdelivr.net/gh/chatcpeg/runeguard@'+ART_REV+'/'+ART_VER+'/'};
try{ if(localStorage.getItem('runeguard.art')==='off') ART.on=false; }catch(e){}
// the painted images face left unless listed here · sprites are made facing right (like the vector painters) and mirrored per frame
const ART_FACE_R={c_cleric:1, c_mage:1, c_highcleric:1, m_amberbee:1};
// enemy type (or its painter base) → art · a type's own d.art wins
const ART_EN={shambler:'e_shambler', runner:'e_runner', bat:'e_bat', spitter:'e_spitter', bloater:'e_bloater', brute:'e_brute', wraith:'e_wraith',
  colossus:'b_colossus', lich:'b_lich', king:'b_king', goblin:'g_grunt', goblinbag:'g_thief',
  dg_wisp:'m_mistwisp', dg_gwisp:'m_mistwisp', dg_courier:'g_thief', dg_raider:'g_grunt', dg_slinger:'g_thrower'};
// class / job looks carry their art key (portraits, the hero in battle, the thief's clones)
for(const c of CLASSES){ c.look.art='c_'+c.id; for(const a of c.adv||[]) if(a.look) a.look.art='c_'+a.id; }

function artHas(k){ return !!(k&&ART_DIM[k]); }
// the loaded image or null · the first ask starts the download; artLoaded(k) then lets every cache that drew the vector look rebuild
function artImg(k){ if(!ART.on||!artHas(k)) return null; const im=ART.img[k];
  if(im) return im.complete&&im.naturalWidth?im:null;
  if(typeof Image==='undefined') return null;
  const n=new Image(); n.crossOrigin='anonymous'; n.decoding='async'; ART.img[k]=n;
  n.onload=()=>artLoaded(k); n.onerror=()=>{ delete ART.cb[k]; }; n.src=ART.base+k+'.webp'; return null; }
function artWhen(k,f){ if(!artHas(k)) return; (ART.cb[k]||(ART.cb[k]=[])).push(f); artImg(k); }
function artLoaded(k){
  for(const t in SPR) if(SPR[t].ak===k&&!SPR[t].art) delete SPR[t];
  delete ART_HERO[k]; delete ART_PAT[k];
  const L=ART.cb[k]; if(L){ delete ART.cb[k]; for(const f of L){ try{ f(); }catch(e){ console.error(e); } } } }
function artPreload(keys){ for(const k of keys) artImg(k); }
function artBoot(){ const ks=[]; for(const c of CLASSES){ ks.push('c_'+c.id); for(const a of c.adv||[]) ks.push('c_'+a.id); }
  for(const t in ART_EN) ks.push(ART_EN[t]); ks.push('gr_grave'); artPreload([...new Set(ks)]); }
function artSet(on){ ART.on=!!on; try{ localStorage.setItem('runeguard.art',on?'on':'off'); }catch(e){}
  for(const k in SPR) delete SPR[k]; for(const k in ART_HERO) delete ART_HERO[k]; for(const k in ART_PAT) delete ART_PAT[k];
  if(on) artBoot(); renderArtButtons(); }
function renderArtButtons(){ if(typeof document==='undefined') return; for(const b of document.querySelectorAll('#artSeg button')) b.setAttribute('aria-pressed',(b.dataset.art==='on')===ART.on?'true':'false'); }

// a dark outline around whatever is drawn on src (same look as the vector sprites' OFF8 ring)
function artOutline(src,o,col){ const W=src.width,H=src.height,sil=mkCanvas(W,H),sg=sil.getContext('2d'),out=mkCanvas(W,H),oc=out.getContext('2d');
  sg.drawImage(src,0,0); sg.globalCompositeOperation='source-in'; sg.fillStyle=col||'#120c10'; sg.fillRect(0,0,W,H);
  for(const q of OFF8) oc.drawImage(sil,q[0]*o,q[1]*o); oc.drawImage(src,0,0); return out; }

/* ---- monsters: getSpr (13) asks artKeyEN + artPaint and keeps its frames, outline, tint and hit-flash ---- */
function artKeyEN(type){ const d=EN[type]; if(!d) return null; const k=d.art||ART_EN[type]||ART_EN[d.base]; return artHas(k)?k:null; }
// painter for one walk frame: feet on the vector shadow (y = r·0.85), a little waddle (tilt + bob + squash) on frames 1 and 3
function artPaint(im,k,d){ const r=d.r, boss=!!d.boss, fly=!!d.fly, iw=im.naturalWidth, ih=im.naturalHeight;
  const s=Math.min(r*(boss?3.1:fly?3:3.8)/ih, r*(boss?3.5:fly?4:3.5)/iw), w=iw*s, h=ih*s, foot=r*.85, mir=!ART_FACE_R[k];
  return (c,f)=>{ const q=W4[f]; c.save(); c.translate(0,foot-Math.abs(q)*r*.07); c.rotate(q*.07); c.scale(mir?-1:1,1-Math.abs(q)*.035);
    c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high'; c.drawImage(im,-w/2,-h,w,h); c.restore(); }; }

/* ---- the hero: one outlined frame per facing (+ a red one for the hurt blink) at the current sprite scale ---- */
const ART_HERO={}, ART_HERO_H=70;
function artHeroSpr(k){ let S=ART_HERO[k]; if(S&&S.ss===SPR_SS) return S; const im=artImg(k); if(!im) return null;
  const ss=SPR_SS, H=ART_HERO_H, w=im.naturalWidth*H/im.naturalHeight, pad=3, PW=Math.ceil((w+pad*2)*ss), PH=Math.ceil((H+pad*2)*ss), mir=!ART_FACE_R[k];
  const mk=(left,red)=>{ const c=mkCanvas(PW,PH), g=c.getContext('2d'); g.setTransform(ss,0,0,ss,PW/2,pad*ss); if(mir!==left) g.scale(-1,1);
    g.imageSmoothingEnabled=true; g.imageSmoothingQuality='high'; g.drawImage(im,-w/2,0,w,H);
    if(red){ g.setTransform(1,0,0,1,0,0); g.globalCompositeOperation='source-atop'; g.globalAlpha=.45; g.fillStyle='#ff3030'; g.fillRect(0,0,PW,PH); }
    return artOutline(c,Math.max(1,1.2*ss)); };
  S={ss, w:PW/ss, h:PH/ss, pad, f:[mk(false),mk(true)], red:[mk(false,1),mk(true,1)]}; return ART_HERO[k]=S; }
function artHeroKey(L){ const k=L&&L.art; return k&&ART.on&&artHas(k)?k:null; }
// draws the hero (or a clone) standing on (x, y+16) · false = no art yet (the caller draws the vector hero)
function artDrawHero(c,L,x,y,face,t,moving,o){ const k=artHeroKey(L), S=k&&artHeroSpr(k); if(!S) return false; o=o||{};
  const img=(o.tint?S.red:S.f)[face<0?1:0], bob=moving?Math.abs(Math.sin(t*11))*2.4:Math.sin(t*2.6)*.5, sq=o.squash||0;
  c.save(); c.translate(x,y+16);
  if(!o.noShadow){ c.fillStyle='rgba(0,0,0,.32)'; c.beginPath(); c.ellipse(0,0,15,5,0,0,TAU); c.fill(); }
  c.rotate((moving?Math.sin(t*11)*.05:0)+(o.lean||0)); c.scale(1+sq*.6,1-sq-(moving?0:Math.sin(t*2.6)*.01)); c.translate(0,-bob);
  if(o.alpha!=null) c.globalAlpha*=o.alpha;
  c.drawImage(img,-S.w/2,-S.h+S.pad,S.w,S.h); c.restore(); return true; }
// the aim line of character runs (skills fly straight to the aimed point): a soft chevron on the ground ahead of the feet
function artAimMark(c,x,y,a){ c.save(); c.translate(x,y+16); c.scale(1,.55); c.rotate(a); c.strokeStyle='rgba(255,244,214,.38)'; c.lineWidth=3; c.lineCap='round';
  c.beginPath(); c.moveTo(30,-7); c.lineTo(38,0); c.lineTo(30,7); c.stroke(); c.restore(); }
// UI portrait (14: portrait) · false = vector now; the canvas is drawn again once its image arrives (if it is still on screen)
function artPortrait(c,look,sz,cvs){ const k=artHeroKey(look); if(!k) return false; const im=artImg(k);
  if(!im){ artWhen(k,()=>{ if(cvs&&cvs.isConnected) portrait(cvs,look,sz); }); return false; }
  let h=sz*.94, w=im.naturalWidth*h/im.naturalHeight; if(w>sz*.94){ h*=sz*.94/w; w=sz*.94; }
  c.save(); c.translate(sz/2,sz*.97); if(!ART_FACE_R[k]) c.scale(-1,1); c.imageSmoothingEnabled=true; c.imageSmoothingQuality='high';
  c.drawImage(im,-w/2,-h,w,h); c.restore(); return true; }

/* ---- ground: the biome's painted tile as a world-anchored pattern ---- */
const ART_PAT={}, ART_GS=.78;
function artPat(k){ if(!ART.on) return null; const p=ART_PAT[k]; if(p) return p; const im=artImg(k); if(!im) return null;
  const pat=ctx.createPattern(im,'repeat'); if(!pat) return null; try{ pat.setTransform(new DOMMatrix().scale(ART_GS)); }catch(e){} return ART_PAT[k]=pat; }
function artGroundKey(){ const g=typeof G!=='undefined'&&G&&G.terrain; return g&&typeof TER_BIOME!=='undefined'&&TER_BIOME[g.b]&&TER_BIOME[g.b].gr||'gr_grave'; }
// fills the view with the painted ground (or the old procedural pattern) · a light shade keeps the actors in front of it
function artGround(L,T,R,B,key){ const p=artPat(key||artGroundKey());
  if(!p){ ctx.fillStyle=groundPat; ctx.fillRect(L,T,R-L,B-T); return false; }
  ctx.fillStyle=p; ctx.fillRect(L,T,R-L,B-T); ctx.fillStyle='rgba(10,14,8,.22)'; ctx.fillRect(L,T,R-L,B-T); return true; }
