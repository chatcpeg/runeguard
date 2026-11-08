/* ================= hooks: registry กลางที่ทุก lane ใช้ ================= */
const DEV = {};                       // lane: DEV.field = {...} · 90-dev-hook รวมเข้า window.RG เมื่อ #dev
const MODES = {};                     // id → ModeDef (§7.6)
const BOSSAI = {};                    // ชื่อ AI → (e,dt,d,dx,dy)=>void · core เรียก BOSSAI[e.d.ai||e.type]
const ITEMKIND = {};                  // gem kind ใหม่ → {collect(g), draw(c,g)}
const HAT_EXT = {}, WEAPON_EXT = {};  // look id ใหม่ → painter
const UIKEY = {};                     // G.ui หรือ id หน้าจอ → (e)=>bool (true = จัดการแล้ว)
const HUB = [];                       // ปุ่มเมนูหลัก {id,n,i,order,badge?()→string,open()}
const SERVICES = [];                  // บริการในป้อม {id,npc,n,i,order,open()}
const CHARTABS = {};                  // แท็บหน้าตัวละคร id → {n,order,render(root,ch)}
const UIX = {home:null, enter:null, hud:null, endExtra:null, pauseExtra:null};   // null = พฤติกรรมเดิม
const BUS = { h:{}, on(n,f){ (this.h[n]||(this.h[n]=[])).push(f); },
  emit(n,...a){ for(const f of this.h[n]||[]) try{ f(...a); }catch(e){ console.error(e); } } };
  // event: 'save' 'sync' 'auth' 'char' 'runEnd' 'screen' · ห้ามใช้ทุกเฟรมหรือทุกศัตรู
const STORE = {
  get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k,v); return true; }catch(e){ return false; } },
  del(k){ try{ localStorage.removeItem(k); }catch(e){} } };
let SAVE = null;                      // เซฟปัจจุบัน · กำหนดค่าได้เฉพาะ 41-save-local.js
function esc(s){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
function regScreen(id){ if(!SCREENS.includes(id)) SCREENS.push(id); }
function curScreen(){ for(const s of SCREENS){ const n=$('#'+s); if(n&&!n.hidden) return s; } return null; }
function mergeBonus(...bs){ const o={}; for(const b of bs){ if(!b) continue; for(const k in b){ const v=b[k];
  if(k==='cd'||k==='magnet') o[k]=(o[k]||1)*v;
  else if(k==='fam'){ o.fam=o.fam||{}; for(const f in v) o.fam[f]=(o.fam[f]||0)+v[f]; }
  else o[k]=(o[k]||0)+v; } } return o; }
function rngUnit(){ const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]/4294967296; }   // ใช้กับตีบวก

