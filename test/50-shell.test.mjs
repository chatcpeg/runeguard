// test/50-shell.test.mjs (lane B) — router / back stack, history sync, sheet, confirmBox, hub status, survival tier info,
// reward rows, HUD hooks (classic untouched) and textContent-only names. Runs the real src/js files in node:vm with a tiny DOM.
//   node test/50-shell.test.mjs
import { loadSrc } from './_vm.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['04', '05', '06', '07', '08', '15', '24', '25', '26', '27', '30', '31', '33', '34', '35', '40', '41', '42', '50', '52', '55'];
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + JSON.stringify(info) : '')); } };
const tick = ms => new Promise(r => setTimeout(r, ms));

// ---- a very small DOM: only what lane B touches -------------------------------------------------------------
const MARK_IDS = [...readFileSync(join(ROOT, 'src/markup/50-shell.html'), 'utf8').matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const CORE_IDS = ['scrTitle', 'scrLevel', 'scrAdv', 'scrPause', 'scrEnd', 'lvCards', 'btnMenuP', 'btnRestartP', 'btnMenuE', 'pauseBox', 'endStats', 'btnMuteT', 'lvEyebrow', 'lvTitle'];
function makeDom() {
  const html = [];
  class CL { constructor() { this.s = new Set(); } add(...c) { c.forEach(x => this.s.add(x)); } remove(...c) { c.forEach(x => this.s.delete(x)); }
    toggle(c, on) { if (on === undefined) on = !this.s.has(c); on ? this.s.add(c) : this.s.delete(c); return on; } contains(c) { return this.s.has(c); } }
  class El {
    constructor(tag, id) { this.tagName = tag.toUpperCase(); this.id = id || ''; this.children = []; this.parentNode = null; this._t = ''; this.hidden = false;
      this.dataset = {}; this.attrs = {}; this.style = { setProperty() {} }; this.className = ''; this.classList = new CL(); this.on = {}; this.value = ''; this.disabled = false; }
    get textContent() { return this._t + this.children.map(c => c.textContent).join(''); }
    set textContent(v) { this.children = []; this._t = String(v); }
    set innerHTML(v) { html.push(String(v)); this.children = []; this._t = String(v); }
    append(...n) { for (const x of n) { if (typeof x === 'string') { this._t += x; continue; } if (x.parentNode) x.remove(); x.parentNode = this; this.children.push(x); } }
    after(n) { const p = this.parentNode; if (!p) return; if (n.parentNode) n.remove(); n.parentNode = p; p.children.splice(p.children.indexOf(this) + 1, 0, n); }
    remove() { const p = this.parentNode; if (p) { p.children = p.children.filter(c => c !== this); this.parentNode = null; } }
    get previousElementSibling() { const p = this.parentNode; if (!p) return null; const i = p.children.indexOf(this); return i > 0 ? p.children[i - 1] : null; }
    get firstElementChild() { return this.children[0] || null; }
    get lastElementChild() { return this.children[this.children.length - 1] || null; }
    get childElementCount() { return this.children.length; }
    setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; } hasAttribute(k) { return k in this.attrs; }
    addEventListener(t, f) { (this.on[t] || (this.on[t] = [])).push(f); }
    fire(t, e) { for (const f of this.on[t] || []) f(Object.assign({ target: this, preventDefault() {}, stopPropagation() {} }, e)); }
    click() { this.fire('click'); }
    querySelector() { return null; } querySelectorAll() { return []; } closest() { return null; } focus() {} setPointerCapture() {}
  }
  const ids = new Map(); for (const id of MARK_IDS.concat(CORE_IDS)) ids.set(id, new El('div', id));
  for (const s of ['scrHub', 'scrChars', 'scrNew', 'scrSurv', 'scrSettings', 'scrChar', 'scrTitle', 'scrLevel', 'scrAdv', 'scrPause', 'scrEnd', 'shSheet', 'shConf']) ids.get(s).hidden = true;
  { const panel = new El('div'), box = new El('div'); panel.append(box); box.append(ids.get('endStats')); }   // scrEnd: panel > .box > #endStats
  const document = { readyState: 'loading', body: new El('body'), activeElement: null, listeners: {},
    getElementById: id => ids.get(id) || null, querySelector: s => (s[0] === '#' ? ids.get(s.slice(1)) || null : null), querySelectorAll: () => [],
    createElement: t => new El(t), addEventListener(t, f) { (this.listeners[t] || (this.listeners[t] = [])).push(f); } };
  return { document, html, ids, El };
}
function fresh() {
  const dom = makeDom(), calls = [], winOn = {};
  const hist = { stack: [null], i: 0, log: [], get state() { return this.stack[this.i]; },
    pushState(s) { this.stack.length = this.i + 1; this.stack.push(s); this.i++; this.log.push(['push', s.d]); },
    replaceState(s) { this.stack[this.i] = s; this.log.push(['replace', s.d]); },
    go(n) { this.log.push(['go', n]); this.i = Math.max(0, this.i + n); } };
  const rec = name => (...a) => { calls.push([name, ...a]); };
  const stubs = {
    document: dom.document, history: hist, navigator: {}, location: { hash: '', reload: rec('reload') },
    addEventListener: (t, f) => { (winOn[t] || (winOn[t] = [])).push(f); },
    SCREENS: ['scrTitle', 'scrLevel', 'scrAdv', 'scrPause', 'scrEnd'],
    show: id => { calls.push(['show', id]); for (const s of stubs.SCREENS) { const n = dom.ids.get(s); if (n) n.hidden = s !== id; } },
    toTitle: rec('toTitle'), pauseGame: rec('pauseGame'), resumeGame: rec('resumeGame'), renderTitle: rec('renderTitle'), endRun: rec('endRun'),
    updateWave: () => {}, startRun: rec('startRun'), checkUI: rec('checkUI'), updateHUD: rec('updateHUD'), render: rec('render'), portrait: () => {}, loadBest: () => ({}),
    AU: { on: true }, toggleMute: () => { stubs.AU.on = !stubs.AU.on; }, setQuality: rec('setQuality'), QUAL: { mode: 'auto', level: 1 },
  };
  stubs.window = stubs; stubs.parent = stubs;
  const ctx = loadSrc(FILES, stubs);
  return { ctx, X: e => ctx.__eval(e), dom, calls, hist, winOn, ls: ctx.localStorage };
}

// ------------------------------------------------------------------------------------------------
console.log('ตอนโหลดไฟล์ (§7.4)');
{
  const { X, ls, hist, calls, dom } = fresh();
  ok('ไม่เขียน localStorage ตอนโหลด', ls.length === 0, ls.length);
  ok('ไม่แตะ history / show ตอนโหลด', hist.log.length === 0 && !calls.some(c => c[0] === 'show'), [hist.log, calls]);
  ok('regScreen ครบ 6 หน้า', ['scrHub', 'scrChars', 'scrNew', 'scrSurv', 'scrSettings', 'scrChar'].every(s => X('SCREENS').includes(s)));
  ok('HUB มีเอาชีวิตรอด (order 20)', X("HUB.some(h=>h.id==='survival'&&h.order===20&&typeof h.open==='function')"));
  ok('UIX.home/enter/hud/endExtra/pauseExtra เป็นฟังก์ชัน', X("['home','enter','hud','endExtra','pauseExtra'].every(k=>typeof UIX[k]==='function')"));
  ok('DEV.ui ยังเป็นฟังก์ชัน (RG.ui() เดิม) และมี .go / .stack', X("typeof DEV.ui==='function'&&typeof DEV.ui.go==='function'&&typeof DEV.ui.stack==='function'"));
  ok('ไม่ลงทะเบียน DOMContentLoaded ตอนโหลด (99-boot เรียก shBoot เอง)', !dom.document.listeners.DOMContentLoaded && X('typeof shAuto') === 'undefined');
  ok('UIKEY ของหน้าจอ lane B + scrTitle', X("['scrHub','scrChars','scrNew','scrSurv','scrSettings','scrChar','scrTitle'].every(k=>typeof UIKEY[k]==='function')"));
}

console.log('boot · router · ปุ่มย้อนกลับ');
{
  const { X, ls, hist, calls, dom } = fresh();
  X('shBoot()');
  ok('boot → เมนูหลัก (stack = [scrHub])', JSON.stringify(X('UI.stack()')) === '["scrHub"]' && !dom.ids.get('scrHub').hidden);
  ok('boot สร้างเซฟผู้เยี่ยมชม (runeguard.save.guest)', ls.getItem('runeguard.save.guest') !== null);
  ok('boot ตั้ง history root {rg:"root", d:0} โดยไม่ push', hist.log[0] && hist.log[0][0] === 'replace' && hist.log[0][1] === 0 && !hist.log.some(l => l[0] === 'push'), hist.log);
  const seen = []; X('BUS').on('screen', id => seen.push(id));
  ok('UI.go(scrSurv) → stack 2 ชั้น + BUS screen', X("UI.go('scrSurv')") === true && JSON.stringify(X('UI.stack()')) === '["scrHub","scrSurv"]' && seen.includes('scrSurv'));
  ok('ไม่มีการแตะ/กดปุ่ม → ไม่ push history (Chrome ข้ามอยู่แล้ว)', !hist.log.some(l => l[0] === 'push'), hist.log);
  ok('UI.go หน้าที่ไม่มีอยู่ → false และ stack เดิม', X("UI.go('scrNope')") === false && X('UI.stack().length') === 2);
  X('UI.back()');
  ok('UI.back() → กลับเมนูหลัก', JSON.stringify(X('UI.stack()')) === '["scrHub"]' && !dom.ids.get('scrHub').hidden && dom.ids.get('scrSurv').hidden);
  X('UI.back()');
  ok('UI.back() ที่ล่างสุด → ยังอยู่เมนูหลัก', JSON.stringify(X('UI.stack()')) === '["scrHub"]');
  // gesture → one entry per tap
  X('SH.tok=performance.now(); UI.go("scrSettings")');
  ok('มีการแตะ → push 1 entry {d:1}… (stack 2 = ต้องการ 2)', hist.log.filter(l => l[0] === 'push').length === 1, hist.log);
  X('SH.tok=performance.now(); shSync()');
  ok('แตะซ้ำ → push ครบ 2 entry', hist.log.filter(l => l[0] === 'push').length === 2 && X('SH.hd') === 2, hist.log);
  X('SH.tok=0; UI.back()');
  ok('ปุ่ม ← ในแอป → history.go(-1) และ ignore popstate ถัดไป', hist.log.some(l => l[0] === 'go' && l[1] === -1) && X('SH.ign') === 1);
  X('shOnPop({state:{rg:"scrHub",d:1}})');
  ok('popstate ที่ถูก ignore ไม่ย้อนซ้ำ', X('SH.ign') === 0 && JSON.stringify(X('UI.stack()')) === '["scrHub"]');
  X('SH.tok=performance.now(); UI.go("scrChars")'); X('shOnPop({state:{rg:"scrHub",d:1}})');
  ok('popstate (ปุ่ม back ของ Android) → ย้อนหน้า', JSON.stringify(X('UI.stack()')) === '["scrHub"]');
  X('shOnPop({state:{rg:"root",d:0}})');
  ok('back ที่เมนูหลัก → เตือน ไม่ออกจากเกม', dom.ids.get('shToasts').textContent.includes('กดย้อนกลับอีกครั้งเพื่อออกจากเกม') && JSON.stringify(X('UI.stack()')) === '["scrHub"]');
  // in a run
  calls.length = 0;
  X('G={ui:null,over:false}; UI.back()'); ok('ในรอบ: back → pauseGame', calls.some(c => c[0] === 'pauseGame'));
  X('G.ui="pause"; UI.back()'); ok('หยุดอยู่: back → resumeGame', calls.some(c => c[0] === 'resumeGame'));
  calls.length = 0; dom.ids.get('shToasts').textContent = '';
  X('G={ui:null,over:false}; shOnPop({state:{rg:"root",d:0}})');
  ok('ในรอบ + back ถึง entry สุดท้าย → หยุดเกม + เตือน (ครั้งถัดไปจึงออก)', calls.some(c => c[0] === 'pauseGame') && dom.ids.get('shToasts').textContent.includes('กดย้อนกลับอีกครั้งเพื่อออกจากเกม'), calls);
  calls.length = 0; X('G.ui="pause"; shOnPop({state:{rg:"root",d:0}})');
  ok('หยุดอยู่ + entry สุดท้าย → ไม่ resume (back ซ้ำไม่ปล่อยให้เกมเดินแล้วหลุด)', !calls.some(c => /Game$/.test(c[0])), calls);
  X('shOnPop({state:{rg:"scrSurv",d:1}})'); ok('ยังมี entry เหลือ: หยุดอยู่ + back → resume', calls.some(c => c[0] === 'resumeGame'));
  calls.length = 0; calls.push(['pauseGame'], ['resumeGame']);          // the count the next check expects (two Game calls so far)
  X('G.ui="level"; UI.back()'); ok('การ์ดเลเวลอัป: back ไม่ทำอะไร', calls.filter(c => /Game$|toTitle/.test(c[0])).length === 2);
  X('G.over=true; G.ui="end"; show("scrEnd"); UI.back()'); ok('จอสรุป: back → toTitle', calls.some(c => c[0] === 'toTitle'));
  X('G=null');
  X('SH.lastMode="classic"; UIX.home()');
  ok('UIX.home หลังคลาสสิก → [scrHub, scrTitle] + renderTitle', JSON.stringify(X('UI.stack()')) === '["scrHub","scrTitle"]' && calls.some(c => c[0] === 'renderTitle'));
  X('UIX.home()'); ok('UIX.home หลังโหมดตัวละคร → เมนูหลัก', JSON.stringify(X('UI.stack()')) === '["scrHub"]');
  calls.length = 0; X('G={ui:null,over:false}; SH.lastMode="survival"; UI.home(); G=null');
  ok('UI.home() ระหว่างรอบ → toTitle (ล้าง lastMode)', calls.some(c => c[0] === 'toTitle') && X('SH.lastMode') === null);
}

console.log('sheet · confirmBox');
{
  const { X, dom } = fresh(); X('shBoot()');
  X('globalThis.closed=0; sheet("<p>x</p>",{title:"หัว",onClose(){ closed++; }})');
  ok('sheet เปิด + หัวเรื่องด้วย textContent', !dom.ids.get('shSheet').hidden && dom.ids.get('shSheetT').textContent === 'หัว');
  X('UI.back()');
  ok('back ปิด sheet ก่อน (onClose ครั้งเดียว) และ stack เดิม', dom.ids.get('shSheet').hidden && X('closed') === 1 && X('UI.stack().length') === 1);
  X('closeSheet()'); ok('closeSheet ซ้ำไม่เรียก onClose อีก', X('closed') === 1);
  X('globalThis.r1=null; confirmBox("ลบ?",{}).then(v=>r1=v)'); X('UI.back()'); await tick(5);
  ok('confirmBox: back = ยกเลิก (false)', X('r1') === false && dom.ids.get('shConf').hidden);
  X('globalThis.r2=null; confirmBox("ลบ?",{hold:20, okText:"กดค้าง"}).then(v=>r2=v)');
  ok('hold: ปุ่มบอกให้กดค้าง', dom.ids.get('shConfOk').textContent === 'กดค้าง');
  X('shEl("shConfOk").click()'); await tick(40);
  ok('hold: คลิกเฉย ๆ ไม่ยืนยัน', X('r2') === null);
  X('shHoldOn(); shHoldOff()'); await tick(40); ok('hold: ปล่อยก่อนครบเวลา = ไม่ยืนยัน', X('r2') === null);
  X('shHoldOn()'); await tick(40); ok('hold: กดค้างครบเวลา = true', X('r2') === true);
}

console.log('เมนูหลัก · ตัวละคร (ชื่อผ่าน textContent เท่านั้น)');
{
  const { X, dom } = fresh(); X('shBoot()');
  ok('ไม่มีตัวละคร: ปุ่ม "สร้างตัวละครแรก"', dom.ids.get('hbModes').textContent.includes('สร้างตัวละครแรก'));
  ok('สถานะ AUTH_ON=false = ผู้เยี่ยมชม · บันทึกในเครื่อง', dom.ids.get('hbTop').textContent.includes('👤 ผู้เยี่ยมชม · บันทึกในเครื่อง'));
  const nm = 'ลูน่า Mm';
  X(`createChar(${JSON.stringify(nm)},'mage')`); X('UI.home()');
  ok('เมนูหลักแสดงชื่อ/อาชีพ/ทอง', dom.ids.get('hbTop').textContent.includes(nm) && dom.ids.get('hbTop').textContent.includes('จอมเวท') && dom.ids.get('hbTop').textContent.includes('💰 0 ทอง'));
  X('UI.go("scrChars")');
  ok('หน้าตัวละคร (1/3) แสดงการ์ด', dom.ids.get('chTitle').textContent === 'ตัวละคร (1/3)' && dom.ids.get('chList').textContent.includes(nm));
  ok('ชื่อไม่เคยผ่าน innerHTML', !dom.html.some(h => h.includes(nm)), dom.html.filter(h => h.includes(nm)));
  X('UI.go("scrNew")'); X('shEl("nwName").value="ก"'); X('hbCreate()');
  ok('สร้างชื่อสั้นเกิน → ข้อความไทยจาก createChar', dom.ids.get('nwErr').textContent.startsWith('ชื่อต้องยาว'));
  X('shEl("nwName").value="ภูผา"; HB.cls="swordsman"; shEl("nwAuto").checked=true; hbCreate()');
  ok('สร้างแบบแจกแนะนำ → ATK 3 · ความอึด 2 · แต้มเหลือ 0 · กลับเมนูหลัก', X('JSON.stringify(curChar().st)') === '{"STR":3,"VIT":2,"AGI":0,"DEX":0,"INT":0,"LUK":0}' && X('curChar().pts') === 0 && JSON.stringify(X('UI.stack()')) === '["scrHub"]');
}

console.log('สถานะเมนูหลัก (§6.11) · ระดับนรก (§2.2)');
{
  const { X } = fresh();
  const S = (st, cs) => X(`hbStatusOf(${JSON.stringify(st)},${JSON.stringify(cs)})`);
  ok('AUTH_ON=false → ผู้เยี่ยมชม แตะไม่ได้', S({}, { k: 'off' }).k === 'guest' && !S({}, { k: 'off' }).tap);
  ok('เซฟใหม่กว่าแอป → ⛔ แตะเพื่ออัปเดต', S({ readonly: true }, { k: 'off' }).text === '⛔ ข้อมูลเป็นเวอร์ชันใหม่กว่าแอป · แตะเพื่ออัปเดต' && S({ readonly: true }, null).tap);
  ok('sandbox / บันทึกไม่ได้ มาก่อนสถานะคลาวด์', S({ sandbox: true }, { k: 'ok', text: 'x' }).k === 'sandbox' && S({ stored: false }, { k: 'ok', text: 'x' }).k === 'nostore');
  ok('คลาวด์ (M3) ส่งต่อข้อความ · artifact แตะไม่ได้', S({}, { k: 'ok', text: '☁ ซิงก์แล้ว 12:04' }).text === '☁ ซิงก์แล้ว 12:04' && S({}, { k: 'ok', text: 'a' }).tap && !S({}, { k: 'artifact', text: 'a' }).tap);
  X('globalThis.ch=newChar("ทดสอบ","mage"); globalThis.A=svNewAcct()');
  const t0 = X('hbSurvInfo(ch,0,A,"2026-11-08")');
  ok('T0: Lv แนะนำ 1 · HP ×1 · ดาเมจ ×1 · ทอง 15/คลื่น · ชนะครบ EXP 319 ทอง 450', t0.rec === 1 && t0.hp === 1 && t0.dmg === 1 && t0.gpw === 15 && t0.exp === 319 && t0.gold === 450, t0);
  ok('T0: ≈ 1.05 เลเวลจริงสำหรับ Lv1 (290 + 29/530) · เล่นได้ใน M1', Math.abs(t0.lvs - (1 + 29 / 530)) < 1e-9 && t0.open && t0.unlocked, t0);
  const t3 = X('hbSurvInfo(ch,3,A,"2026-11-08")');
  ok('T3: Lv 18 · HP ×1.9 · ดาเมจ ×1.36 · ทอง 30 · M2 เปิดแล้ว แต่ยังล็อกจากเซฟ (survTier 0)', t3.rec === 18 && Math.abs(t3.hp - 1.9) < 1e-9 && Math.abs(t3.dmg - 1.36) < 1e-9 && t3.gpw === 30 && t3.open && !t3.unlocked, t3);
  X('A.daily={day:"2026-11-08",surv:{0:1},boss:{},rushWeek:""}');
  ok('โบนัส ×2 ใช้แล้ววันนี้ → daily=false · วันใหม่ → true', X('hbSurvInfo(ch,0,A,"2026-11-08").daily') === false && X('hbSurvInfo(ch,0,A,"2026-11-09").daily') === true);
}

console.log('รางวัลจบรอบ · HUD (คลาสสิกไม่เปลี่ยน)');
{
  const { X, dom, calls } = fresh(); X('shBoot()');
  X('globalThis.ch=createChar("ลูน่า","mage")');
  const mk = (wave, won) => `onRunEnd({char:ch,modeId:'survival',mode:MODES.survival,tier:0,wave:${wave},runId:'r_t${wave}',loot:[],t:600,kills:900,player:{hp:${won ? 50 : 0}},goldRun:0},${won},{commit:true})`;
  X(`globalThis.rw=${mk(20, true)}`);
  const rows = X('hdRewardRows(rw,ch)').map(r => r.join('|'));
  ok('ชนะครบ 20 คลื่น + โบนัสวันแรก: EXP +638 (×2) · Job +510 · ทอง +900 (×2)', rows.includes('Base EXP|+638 (×2 วันนี้)') && rows.includes('Job EXP|+510') && rows.includes('ทอง|+900 (×2)'), rows);
  ok('เลเวลอัป Lv 2 แต้มสถานะ +2 · Job 2 แต้มสกิล +1', rows.includes('เลเวลอัป!|Lv 2 · แต้มสถานะ +2|good') && rows.includes('เลเวลอาชีพอัป!|Job 2 · แต้มสกิล +1|good'), rows);
  ok('M2: ถึงคลื่น 10 ใน T0 → แถว "ปลดล็อก ระดับนรก T1"', rows.includes('ปลดล็อก|ระดับนรก T1|good'), rows);
  X(`globalThis.rw2=onRunEnd({char:ch,modeId:'survival',mode:MODES.survival,tier:0,wave:3,runId:'r_t20',loot:[],t:30,kills:10,player:{hp:0},goldRun:0},false,{commit:true})`);
  ok('runId ซ้ำ → แถว "ไม่ได้บันทึก"', X('hdRewardRows(rw2,ch)')[0].join('|') === 'บันทึก|ไม่ได้บันทึก|bad');
  dom.ids.get('btnMenuE').textContent = 'เปลี่ยนอาชีพ'; dom.ids.get('btnMenuP').textContent = 'เปลี่ยนอาชีพ'; dom.ids.get('btnRestartP').textContent = 'เริ่มใหม่';
  X('hdEnd(shEl("endStats"),{rewards:null,char:null,modeId:"classic"})');
  ok('จอสรุปคลาสสิก: ไม่สร้างบล็อกรางวัล ปุ่มข้อความเดิม', X('HD.rew') === null && dom.ids.get('btnMenuE').textContent === 'เปลี่ยนอาชีพ');
  X('hdEnd(shEl("endStats"),{rewards:rw,char:ch,modeId:"survival"})');
  ok('จอสรุปโหมดตัวละคร: บล็อกรางวัลต่อจากกล่องสถิติ + ปุ่ม "กลับป้อม"', X('HD.rew.hidden') === false && X('HD.rew.previousElementSibling===shEl("endStats").parentNode') && dom.ids.get('btnMenuE').textContent === 'กลับป้อม');
  X('hdEnd(shEl("endStats"),{rewards:null,char:null,modeId:"classic"})');
  ok('คลาสสิกรอบถัดไป: บล็อกซ่อน + ปุ่มกลับเป็นข้อความเดิม', X('HD.rew.hidden') === true && dom.ids.get('btnMenuE').textContent === 'เปลี่ยนอาชีพ');
  X('hdPause(shEl("pauseBox"))');
  ok('พักเกมคลาสสิก: ไม่เพิ่มปุ่ม ปุ่มเดิม', dom.ids.get('pauseBox').children.length === 0 && dom.ids.get('btnMenuP').textContent === 'เปลี่ยนอาชีพ' && dom.ids.get('btnRestartP').textContent === 'เริ่มใหม่');
  X('G={char:null,modeId:"classic",mode:MODES.classic,loot:[],ui:null,over:false}; UIX.hud(); UIX.hud()');
  ok('UIX.hud คลาสสิก: จำโหมด ไม่แตะ HUD/การ์ด', X('SH.lastMode') === 'classic' && X('HD.g===G') && dom.ids.get('hdBox').hidden === true && !dom.ids.get('lvCards').children.length);
  const L = dom.ids.get('lvCards'); for (let i = 0; i < 4; i++) L.append(new dom.El('button'));
  dom.ids.get('lvEyebrow').textContent = 'เลเวลอัพ'; dom.ids.get('lvTitle').textContent = 'Lv 4';
  X('UIX.hud()'); ok('คลาสสิก: หัวการ์ด "เลเวลอัพ / Lv 4" ไม่เปลี่ยน', dom.ids.get('lvEyebrow').textContent === 'เลเวลอัพ' && dom.ids.get('lvTitle').textContent === 'Lv 4');
  X('P={rank:{mbolt:3,flame:2},lv:4}; G={char:ch,modeId:"survival",mode:MODES.survival,loot:[],ui:"level",over:false,charTip:"",choices:[{k:"up",s:{id:"mbolt",lv:1}},{k:"up",s:{id:"mbolt",lv:2}},{k:"new",id:"flame"},{k:"stat",stat:"STR"}]}; UIX.hud()');
  const caps = L.children.map(c => c.children.map(x => x.textContent).join(''));
  ok('การ์ดในโหมดตัวละครบอกเพดาน ★', caps[0] === 'เพดาน ★3' && caps[1].startsWith('ถึงเพดาน ★3') && caps[2].startsWith('ฝึกไว้ ★2') && caps[3].includes('ชั่วคราว'), caps);
  ok('§2.2 การ์ดโหมดตัวละคร: "ความชำนาญเพิ่มขึ้น" · "ชำนาญ Lv …"', dom.ids.get('lvEyebrow').textContent === 'ความชำนาญเพิ่มขึ้น' && dom.ids.get('lvTitle').textContent === 'ชำนาญ Lv 4');
  X('UIX.hud()'); ok('เฟรมถัดไปไม่เติมซ้ำ', L.children[0].children.length === 1);
  X('G.ui=null; G.loot.push({id:"m_dust",n:2}); UIX.hud()');
  ok('ของใน G.loot → log ระบบ (ชื่อไทยจาก ITEMS)', dom.ids.get('shLog').textContent.includes('ได้รับ ผงรูน ×2'), dom.ids.get('shLog').textContent);
  X('hdPause(shEl("pauseBox"))');
  ok('พักเกมเอาชีวิตรอด: ปุ่ม "ถอยทัพ · รับรางวัล" → endRun(false)', dom.ids.get('pauseBox').children.length === 1 && dom.ids.get('btnMenuP').textContent === 'กลับป้อม (ไม่รับรางวัล)');
  ok('fix-r3 พักเกมเอาชีวิตรอด: "เริ่มใหม่ (ไม่รับรางวัล)" (core เริ่มรอบใหม่โดยไม่เรียก endRun · ของ ทอง EXP ของรอบนี้หาย)', dom.ids.get('btnRestartP').textContent === 'เริ่มใหม่ (ไม่รับรางวัล)', dom.ids.get('btnRestartP').textContent);
  X('G.ui="pause"; shEl("pauseBox").children[0].click()');
  ok('กดถอยทัพแล้วเรียก endRun(false)', calls.some(c => c[0] === 'endRun' && c[1] === false));
  ok('กดถอยทัพ: ตั้ง G.retreat', X('G.retreat') === true);
  const se = X('(()=>{ const g0=G; G={tier:0, retreat:true, wave:3, t:10, kills:1, score:0}; const r=MODES.survival.end(false); G.retreat=false; const d=MODES.survival.end(false); G=g0; return {e:r.eyebrow, t:r.title, d:d.eyebrow}; })()');
  ok('จอสรุปเอาชีวิตรอด: ถอยทัพ = "ถอยทัพ" (ไม่ใช่พ่ายแพ้) · ตาย = "ระดับนรก T0 · ล้มลงกลางสนามรบ" (สั้นลง)', se.e === 'ระดับนรก T0 · ถอยทัพกลับป้อมพร้อมรางวัล' && se.t === 'ถอยทัพ' && se.d === 'ระดับนรก T0 · ล้มลงกลางสนามรบ', se);
  L.children.splice(0); for (let i = 0; i < 2; i++) L.append(new dom.El('button'));
  X('G.over=false; G.ui="level"; P={rank:{mbolt:1,flame:2},lv:4,skills:[{id:"mbolt",lv:1,evolved:false,def:{n:"ศรเวท"}}]}; G.choices=[{k:"stat",stat:"STR"},{k:"gold"}]; UIX.hud()');
  const cap2 = L.children.map(c => c.children.map(x => x.textContent).join('|'));
  ok('§3.6 สกิลใน loadout ที่ตัน ★ แล้ว: การ์ดใบอื่นบอก "ตันที่ … · ฝึกเพิ่มที่หน้าสกิล" (ใบเดียว)', cap2[0].includes('ตันที่ ศรเวท ★1 · ฝึกเพิ่มที่หน้าสกิล') && !cap2[1].includes('ตันที่'), cap2);
  const tr = X('[hdRewardRows({mode:"trial",committed:true,unlocks:["trial:t2"]},ch).map(r=>r[0]), hdRewardRows({mode:"trial",committed:true,unlocks:[]},ch).length]');
  ok('บททดสอบ: ไม่มีแถว EXP/ทอง +0 · ชนะเหลือแถว "บททดสอบ" · แพ้ไม่มีบล็อก', JSON.stringify(tr[0]) === '["บททดสอบ"]' && tr[1] === 0, tr);
  X('G=null');
}

console.log('M2 · ตัวเลือกระดับนรก T0–T10 (§8.5 · ล็อกจากเซฟ)');
{
  const { X, dom, calls } = fresh(); X('shBoot()');
  X('createChar("ทดสอบ","mage")'); X('UI.go("scrSurv")');
  const g = dom.ids.get('svGrid'), go = dom.ids.get('svGo'), body = dom.ids.get('svBody');
  const chip = i => g.children[i], lk = i => chip(i).classList.contains('lk');
  ok('HB_TIER_OPEN = 10', X('HB_TIER_OPEN') === 10);
  ok('ตาราง 11 ช่อง T0–T10', g.children.length === 11 && g.children.map(c => c.children[0].textContent).join(',') === 'T0,T1,T2,T3,T4,T5,T6,T7,T8,T9,T10', g.children.length);
  ok('เซฟใหม่: T0 เปิด (Lv 1) · T1–T10 ล็อก 🔒', !lk(0) && chip(0).children[1].textContent === 'Lv 1' && [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].every(lk) && chip(5).children[1].textContent === '🔒');
  ok('T0 ถูกเลือก · ปุ่ม "เริ่ม · ระดับนรก T0" กดได้', chip(0).getAttribute('aria-pressed') === 'true' && !go.disabled && go.textContent === 'เริ่ม · ระดับนรก T0');
  chip(3).click();
  ok('แตะ T3 (ล็อก) → เลือกได้ ดูข้อมูลได้ · ปุ่มเริ่มปิด', X('HB.tier') === 3 && X('HB.picked') === true && chip(3).getAttribute('aria-pressed') === 'true' && chip(0).getAttribute('aria-pressed') === 'false' && go.disabled && go.textContent === '🔒 ยังไม่ปลดล็อก T3');
  ok('T3 ข้ามขั้น: "ปลดทีละระดับ · ตอนนี้ไปให้ถึงคลื่น 10 ในระดับ T0 ก่อน"', body.textContent.includes('ปลดทีละระดับ · ตอนนี้ไปให้ถึงคลื่น 10 ในระดับ T0 ก่อน'), body.textContent);
  ok('T3 ตัว Lv 1: "Lv 18 · ตัวนี้ Lv 1 (ต่ำกว่ามาก)"', body.textContent.includes('Lv 18 · ตัวนี้ Lv 1 (ต่ำกว่ามาก)'));
  chip(1).click();
  ok('T1: "ไปให้ถึงคลื่น 10 ในระดับ T0 เพื่อปลดล็อก"', body.textContent.includes('🔒 ไปให้ถึงคลื่น 10 ในระดับ T0 เพื่อปลด\u2060ล็อก'));
  calls.length = 0; X('hbSurvGo()'); ok('ระดับที่ล็อก: hbSurvGo ไม่เริ่มรอบ', !calls.some(c => c[0] === 'startRun'));
  X('SAVE.acct.survTier=4; hbSurv()');
  ok('survTier 4 → T0–T4 เปิด · T5–T10 ล็อก', [0, 1, 2, 3, 4].every(i => !lk(i)) && [5, 6, 7, 8, 9, 10].every(lk) && chip(4).children[1].textContent === 'Lv 24' && dom.ids.get('svOpen').textContent === 'ปลดแล้วถึง T4');
  chip(4).click(); calls.length = 0; X('hbSurvGo()');
  const st = calls.find(c => c[0] === 'startRun');
  ok('เริ่ม T4 → startRun(cls, "survival", {char, tier:4})', st && st[1] === 'mage' && st[2] === 'survival' && st[3].tier === 4 && st[3].char === X('curChar()'), st && st.slice(1, 3));
  X('HB.tier=2'); ok('ปุ่ม → (เดสก์ท็อป) เลื่อนระดับ', X('UIKEY.scrSurv({code:"ArrowRight",preventDefault(){}})') === true && X('HB.tier') === 3);
  X('HB.tier=0; UIKEY.scrSurv({code:"ArrowLeft",preventDefault(){}})'); ok('← ที่ T0 ไม่ต่ำกว่า 0', X('HB.tier') === 0);
  X('HB.picked=false; HB.tier=0; SAVE.acct.survTier=4; HUB.find(h=>h.id==="survival").open()');
  ok('เปิดจากเมนูหลัก (ยังไม่เคยเลือก) → ระดับสูงสุดที่ปลดแล้ว T4', X('HB.tier') === 4);
  X('UI.home(); HB.picked=true; HB.tier=1; HUB.find(h=>h.id==="survival").open()');
  ok('เลือกเองแล้ว → เปิดซ้ำยังอยู่ระดับที่เลือก (T1)', X('HB.tier') === 1);
  // fix-r3: the card used to say the highest tier (T4) while the screen opened on the session pick (T1)
  ok('HUB badge = ระดับที่หน้าจอจะเปิดจริง (เลือกเอง T1 → "ระดับนรก T1")', X('hbSurvBadge()').startsWith('ระดับนรก T1 ') || X('hbSurvBadge()') === 'ระดับนรก T1', X('hbSurvBadge()'));
  X('SAVE.acct.survTier=5');
  ok('ปลดระดับใหม่ (T5) → ล้างตัวเลือกของรอบนี้ · การ์ดและหน้าจอเปิดที่ T5', X('hbSurvBadge()').startsWith('ระดับนรก T5') && X('(HUB.find(h=>h.id==="survival").open(), HB.tier)') === 5 && X('HB.picked') === false, X('hbSurvBadge()'));
  X('UI.home(); HB.picked=true; HB.tier=7');
  ok('เลือกดูระดับที่ยังล็อก (T7) → การ์ดบอก 🔒 ไม่บอกโบนัส', X('hbSurvBadge()') === 'ระดับนรก T7 🔒', X('hbSurvBadge()'));
  X('UI.home(); SAVE.acct.survTier=4; HB.top=4; HB.picked=true; HB.tier=1; HUB.find(h=>h.id==="survival").open()');   // back to the state above
  const free0 = X('itBagFree(curChar())');   // a new character may start with items (lane C starter kit)
  ok('กระเป๋า: "ว่าง ' + free0 + '/80 ช่อง" (ของที่สวมไม่นับ)', free0 >= 70 && body.textContent.includes('ว่าง ' + free0 + '/80 ช่อง'), body.textContent);
  X('for(let i=itBagFree(curChar());i>5;i--) curChar().inv.push(makeInst("w_sword_1",{sockets:0})); hbSurv()');
  const tbl = body.children.find(c => c.className === 'sv-tbl'), bag = tbl && tbl.children.find(r => r.textContent.startsWith('กระเป๋า'));
  ok('กระเป๋าเหลือ 5 · คลังว่าง 60 → "ที่เกินเข้าคลัง (ว่าง 60)" (ไม่แดง)', bag && !bag.className.includes('bad') && bag.textContent.includes('ว่าง 5/80 ช่อง · ที่เกินเข้าคลัง (ว่าง 60)'), bag && bag.textContent);
  X('SAVE.acct.stashMax=0; hbSurv()');
  const bag2 = body.children.find(c => c.className === 'sv-tbl').children.find(r => r.textContent.startsWith('กระเป๋า'));
  ok('คลังเต็มด้วย → "คลังก็เต็ม ที่เกินจะหล่นหาย" (สีแดง)', bag2 && bag2.className.includes('bad') && bag2.textContent.includes('ว่าง 5/80 ช่อง · คลังก็เต็ม ที่เกินจะหล่นหาย'), bag2 && bag2.textContent);
  X('SAVE.acct.stashMax=60');
  X('curChar().lv=12; HB.tier=0; hbSurv()');
  ok('Lv 12 ที่ T0 → แถว "EXP ลดลง ×0.52"', body.textContent.includes('EXP ลดลง×0.52 เพราะเลเวลเกินแนะนำ +5'), body.textContent);
  const drop = X('Object.keys(BAL.DROP.surv||{}).length') > 0;
  ok('แถวของที่ดรอปแสดงเมื่อ BAL.DROP.surv มีตาราง (lane C) · ไม่มีก็ไม่แสดง', drop === body.textContent.includes('อุปกรณ์ขั้น 1'), drop);
  X('globalThis.A=SAVE.acct');
  ok('tier ของที่ดรอปไม่เกิน IT_MAXT (4): T2 → 2 (บอส 20: 3) · T10 → 4 (บอส 20: 4)', X('[hbSurvInfo(curChar(),2,A,"d").gear,hbSurvInfo(curChar(),2,A,"d").gear20,hbSurvInfo(curChar(),10,A,"d").gear,hbSurvInfo(curChar(),10,A,"d").gear20].join()') === '2,3,4,4');
  X('UIKEY.scrSurv({code:"Escape",preventDefault(){}})'); ok('Escape ที่ scrSurv = ย้อนกลับ', X('shTop()') === 'scrHub');
}

console.log('M2 · บริการในป้อม (§8.3 · §5.1)');
{
  const { X, dom } = fresh();
  X('globalThis.opened=[]; globalThis.openShop=()=>{ opened.push("shop"); sheet("<p>x</p>",{title:"ร้าน"}); }; globalThis.openStash=()=>{}; globalThis.openRefine=u=>{ opened.push("smith:"+u); toast("ยังไม่มีอุปกรณ์ที่ตีบวกได้","info"); }; globalThis.openRuneScribe=()=>{ opened.push("mine-runes"); sheet("<p>y</p>",{}); }');
  X('SERVICES.push({id:"scribe", npc:"แม่หมอศิลา", n:"ผู้จารึกรูน", i:"✦", order:20, open(){ opened.push("lane-runes"); }})');
  X('shBoot()');
  const sv = dom.ids.get('hbSvc'), btn = t => sv.children.find(b => b.tagName === 'BUTTON' && b.textContent.includes(t));
  const names = () => sv.children.filter(b => b.tagName === 'BUTTON').map(b => b.children[0].textContent);
  ok('ปุ่มบริการ: ช่างตีเหล็ก · ผู้จารึกรูน (ของ lane) · ร้านป้านวล · คลัง · ไม่มีหน้าอาชีพในเทสต์นี้', JSON.stringify(names()) === JSON.stringify(['⚒ ช่างตีเหล็ก', '🌟 อัปเกรดถาวร', '✦ ผู้จารึกรูน', '🛒 ร้านป้านวล', '📦 คลัง']) && !sv.hidden, names());
  ok('ชื่อ NPC เป็นบรรทัดเล็ก (ร้านป้านวลไม่ซ้ำชื่อ)', btn('ช่างตีเหล็ก').textContent === '⚒ ช่างตีเหล็กลุงบัณฑ์' && btn('ร้านป้านวล').children.length === 1);
  X('SERVICES.push({id:"x", npc:"ผู้เฝ้าประตู", n:"ผู้เฝ้าประตู · ประตูรูน", i:"🌀", order:60, open(){}}); hbHub()');
  ok('n = "NPC · บริการ" → หัวปุ่มเป็นบริการ + NPC บรรทัดเล็ก', btn('ประตูรูน') && btn('ประตูรูน').children[0].textContent === '🌀 ประตูรูน' && btn('ประตูรูน').children[1].textContent === 'ผู้เฝ้าประตู');
  btn('ร้านป้านวล').click();
  ok('ยังไม่มีตัวละคร → "สร้างตัวละครก่อน" + ไปหน้าสร้าง', X('opened.length') === 0 && X('shTop()') === 'scrNew' && dom.ids.get('shToasts').textContent.includes('สร้างตัวละครก่อน'));
  X('createChar("ภูผา","swordsman"); UI.home()');
  btn('ร้านป้านวล').click(); ok('ร้าน → openShop() เปิด sheet · ไม่มีข้อความ "ยังไม่เปิด"', X('opened.join()') === 'shop' && !dom.ids.get('shSheet').hidden && !dom.ids.get('shToasts').textContent.includes('ยังไม่เปิดให้บริการ'));
  X('closeSheet()');
  btn('ช่างตีเหล็ก').click(); ok('ช่างตีเหล็ก → openRefine() (ไม่มี uid) · toast ของ lane เองพอ ไม่ซ้อน', X('opened.join()') === 'shop,smith:undefined' && !dom.ids.get('shToasts').textContent.includes('ยังไม่เปิดให้บริการ'));
  btn('คลัง').click(); ok('คลัง (ยังเป็น stub ว่าง) → "คลัง ยังไม่เปิดให้บริการ"', dom.ids.get('shToasts').textContent.includes('คลัง ยังไม่เปิดให้บริการ'));
  btn('ผู้จารึกรูน').click(); ok('SERVICES ของ lane ชนะค่าเริ่มต้น (npc เดียวกัน) · ปุ่มเดียว', X('opened.includes("lane-runes")') && !X('opened.includes("mine-runes")') && names().filter(n => n.includes('ผู้จารึกรูน')).length === 1);
}

console.log('M2 · ของในรอบ (HUD) · รายการของบนจอสรุป');
{
  const { X, dom } = fresh(); X('shBoot()');
  X('globalThis.ch=createChar("ลูน่า","mage")');
  const log = dom.ids.get('shLog'), bag = dom.ids.get('hdBag');
  X('G={char:ch,modeId:"survival",mode:MODES.survival,loot:[],ui:null,over:false,charTip:""}; UIX.hud()');
  ok('เริ่มรอบ: 🎒 ซ่อน (กล่อง HUD มีแค่ปุ่มยาด่วนของชุดเริ่มต้น)', bag.hidden === true && dom.ids.get('hdPots').hidden === false && dom.ids.get('hdPots').children.length === 1);
  X('G.loot.push({id:"m_dust",n:2}); UIX.hud(); G.loot.push({id:"m_dust",n:3}); UIX.hud()');
  ok('ผงรูนติดกัน 2 ครั้ง → บรรทัดเดียว "ได้รับ ผงรูน ×5"', log.children.length === 1 && log.children[0].textContent === 'ได้รับ ผงรูน ×5', log.children.map(c => c.textContent));
  ok('🎒 5 แสดง (ชั้น fixed · ไม่ดัน layout)', bag.hidden === false && bag.textContent === '🎒 5' && dom.ids.get('hdBox').hidden === false);
  X('G.loot.push(makeInst("c_pioneer",{sockets:0}), makeInst("w_staff_2",{sockets:1})); UIX.hud()');
  ok('อุปกรณ์ทีละบรรทัด · ชื่อจาก itemName (◇ = ช่องว่าง) · ตำนานใช้สีทอง', log.children.length === 3 && log.children[1].textContent === 'ได้รับ ผ้าคลุมผู้บุกเบิก' && log.children[1].style.color === X('IT_RAR[3].c') && log.children[2].textContent === 'ได้รับ ไม้เท้าเหล็ก ◇' && !log.children[2].style.color, log.children.map(c => c.textContent));
  ok('🎒 7 · ยังไม่เต็ม', bag.textContent === '🎒 7' && !bag.classList.contains('bad'));
  X('G.loot.push({id:"m_dust",n:1}); UIX.hud()');
  ok('ผงรูนหลังบรรทัดอื่น → บรรทัดใหม่ ×1', log.lastElementChild.textContent === 'ได้รับ ผงรูน', log.lastElementChild.textContent);
  // a nearly full bag: 1 free entry → the 2nd gear piece warns once
  X('for(let i=itBagFree(ch);i>1;i--) ch.inv.push(makeInst("w_sword_1",{sockets:0})); SAVE.acct.stashMax=SAVE.acct.stash.length+1; G={char:ch,modeId:"survival",mode:MODES.survival,loot:[],ui:null,over:false,charTip:""}; UIX.hud()');
  ok('รอบใหม่: 🎒 ซ่อนอีกครั้ง · กระเป๋าเหลือ 1 ช่อง · คลัง 1 ช่อง', bag.hidden === true && X('HD.free') === 1 && X('HD.sfree') === 1, [X('HD.free'), X('HD.sfree')]);
  X('G.loot.push(makeInst("w_sword_2",{sockets:0})); UIX.hud()'); ok('ชิ้นแรกยังพอ', !bag.classList.contains('bad') && !bag.classList.contains('warn'));
  X('G.loot.push(makeInst("w_sword_3",{sockets:0})); UIX.hud()');
  ok('เกินกระเป๋า → "กระเป๋าเต็ม · ของที่เกินจะเข้าคลัง" · 🎒 2 · เข้าคลัง (สีทอง)', log.lastElementChild.textContent === 'กระเป๋าเต็ม · ของที่เกินจะเข้าคลัง' && !log.lastElementChild.className.includes('bad') && bag.textContent === '🎒 2 · เข้าคลัง' && bag.classList.contains('warn'), log.children.map(c => c.textContent));
  X('G.loot.push(makeInst("w_sword_3",{sockets:0}), makeInst("w_sword_4",{sockets:0})); UIX.hud()');
  const warn = log.children.filter(c => c.textContent === 'กระเป๋าและคลังเต็ม · ของที่เกินจะหล่นหาย');
  ok('เกินคลังด้วย → "กระเป๋าและคลังเต็ม" ครั้งเดียว (สีแดง) · 🎒 4 · เต็ม', warn.length === 1 && warn[0].className.includes('bad') && bag.textContent === '🎒 4 · เต็ม' && bag.classList.contains('bad') && !bag.classList.contains('warn'), log.children.map(c => c.textContent));
  X('G.auto=true; G.loot.push({id:"m_crystal",n:1}); UIX.hud(); G.auto=false');
  ok('RG.sim (G.auto): ไม่เขียน log', !log.textContent.includes('ผลึกรูน'));
  // reward rows: kept / dropped lists (pure)
  X('globalThis.sw=makeInst("w_sword_2",{sockets:1}); globalThis.leg=makeInst("c_pioneer",{sockets:0}); globalThis.ax=makeInst("w_sword_3",{sockets:0})');
  X('globalThis.R={runId:"r_x",mode:"survival",committed:true,waves:6,tier:0,baseXp:10,jobXp:8,gold:90,items:[sw,{id:"m_dust",n:2},leg,{id:"m_dust",n:3},ax,{id:"m_crystal",n:1},{id:"m_crystal",n:2}],lost:[ax,{id:"m_dust",n:1}],stashed:[{id:"m_crystal",n:2}],unlocks:[]}');
  const gi = X('hdItemGroups(R.items,R.lost,R.stashed)');
  ok('hdItemGroups: ของที่ได้ = ตำนานก่อน · ดาบ · ผงรูน ×4 (5 − 1 ที่หล่น) · ผลึกรูน (3 − 2 เข้าคลัง)', gi.got.map(o => o.t).join('|') === 'ผ้าคลุมผู้บุกเบิก|ดาบเหล็ก ◇|ผงรูน ×4|ผลึกรูน' && gi.got[0].c === X('IT_RAR[3].c'), gi.got);
  ok('hdItemGroups: เข้าคลัง = ผลึกรูน ×2 · หล่นหาย = ดาบเหล็กกล้า · ผงรูน', gi.stashed.map(o => o.t).join('|') === 'ผลึกรูน ×2' && gi.lost.map(o => o.t).join('|') === 'ดาบเหล็กกล้า|ผงรูน', [gi.stashed, gi.lost]);
  ok('hdItemGroups: ชิ้นที่ lane C สร้างใหม่ (uid อื่น) หักตาม id', X('hdItemGroups([{id:"w_sword_1",n:2}],[],[makeInst("w_sword_1",{sockets:0})]).got.map(o=>o.t).join()') === 'ดาบฝึกหัด');
  const rr = X('hdRewardRows(R,ch)');
  const gotRow = rr.find(r => r[0] === 'ของเข้ากระเป๋า'), stRow = rr.find(r => r[0] === 'กระเป๋าเต็ม'), lostRow = rr.find(r => r[0] === 'กระเป๋าและคลังเต็ม');
  ok('แถว "ของเข้ากระเป๋า 7 ชิ้น" · "กระเป๋าเต็ม เข้าคลังแล้ว 2 ชิ้น" · "กระเป๋าและคลังเต็ม หล่นหาย 2 ชิ้น" + คำแนะนำ', gotRow && gotRow[1] === '7 ชิ้น' && stRow && stRow[1] === 'เข้าคลังแล้ว 2 ชิ้น' && !stRow[2] && lostRow && lostRow[1] === 'หล่นหาย 2 ชิ้น' && lostRow[2] === 'bad' && /ร้านป้านวล/.test(lostRow[4]), [gotRow && gotRow[1], stRow && stRow[1], lostRow && lostRow[1]]);
  ok('ไม่ได้บันทึก → "ของที่เก็บได้" (ทั้งหมด 11 ชิ้น)', X('hdRewardRows(Object.assign({},R,{committed:false,lost:undefined,stashed:undefined}),ch)').some(r => r[0] === 'ของที่เก็บได้' && r[1] === '11 ชิ้น'));
  ok('ไม่มีของ → ไม่มีแถวของ', !X('hdRewardRows(Object.assign({},R,{items:[],lost:[],stashed:[]}),ch)').some(r => /ของ|กระเป๋า/.test(r[0])));
  dom.html.length = 0;
  X('hdEnd(shEl("endStats"),{rewards:R,char:ch,modeId:"survival"})');
  ok('จอสรุป: ซ่อน 🎒 / HUD ของโหมดตัวละคร', dom.ids.get('hdBox').hidden === true);
  const box = X('HD.rew'), its = box.children.filter(c => c.className.startsWith('hd-its'));
  ok('จอสรุป: chip ของ 4 · เข้าคลัง 1 · หล่นหาย 2 (ขีดฆ่า) + คำแนะนำ', its.length === 3 && its[0].children.length === 4 && its[1].className === 'hd-its' && its[1].children.length === 1 && its[2].className === 'hd-its lost' && its[2].children.length === 2 && box.textContent.includes('ขยายกระเป๋า/คลัง หรือขายของที่ร้านป้านวลก่อนออกรอบหน้า'), its.map(w => w.children.length));
  ok('chip ตำนานสีทอง · ชื่อของไม่ผ่าน innerHTML', its[0].children[0].style.color === X('IT_RAR[3].c') && !dom.html.some(h => /ผ้าคลุม|ผงรูน|ดาบ/.test(h)), dom.html);
  X('globalThis.many=[]; for(let i=0;i<34;i++) many.push(makeInst("w_sword_1",{sockets:0})); hdEnd(shEl("endStats"),{rewards:Object.assign({},R,{items:many,lost:[]}),char:ch,modeId:"survival"})');
  const w2 = X('HD.rew').children.find(c => c.className === 'hd-its');
  ok('ของ 34 ชิ้น: chip 30 + "+ อีก 4 อย่าง"', w2 && w2.children.length === 31 && w2.children[30].textContent === '+ อีก 4 อย่าง');
  X('G={char:null,modeId:"classic",mode:MODES.classic,loot:[{id:"m_dust",n:1}],ui:null,over:false}; UIX.hud()');
  ok('คลาสสิก: 🎒 ซ่อน · ไม่มี log ของ', bag.hidden === true && dom.ids.get('hdBox').hidden === true);
  X('G=null; shEl("hdBox").hidden=false; UIX.home()');
  ok('กลับป้อม (UIX.home): HUD ของรอบซ่อน', dom.ids.get('hdBox').hidden === true && X('UI.stack()')[0] === 'scrHub');
}

console.log('M2 · ยาด่วนในรอบ (§8.13 · ช่องด่วน 2 ช่อง · cooldown ร่วม 8 วิ)');
{
  const { X, dom, winOn } = fresh(); X('shBoot()');
  X('globalThis.ch=createChar("ยาดี","cleric"); globalThis.healed=0; globalThis.healP=a=>{ healed+=a; P.hp=Math.min(P.maxHp,P.hp+a); }; globalThis.sfx=()=>{}');
  X('P={hp:50,maxHp:200}; G={char:ch,modeId:"survival",mode:MODES.survival,loot:[],ui:null,over:false,charTip:"",t:10}; UIX.hud()');
  const pots = dom.ids.get('hdPots'), b0 = () => pots.children[0], cnt = () => X('invCount(ch,"u_potion_s")');
  ok('เริ่มรอบ: ปุ่มเดียวจากช่องด่วน 1 = "🧪 3" (ชุดเริ่มต้น) · กล่อง HUD แสดง · 🎒 ยังซ่อน', !pots.hidden && pots.children.length === 1 && b0().textContent === '🧪 3' && !b0().disabled && !dom.ids.get('hdBox').hidden && dom.ids.get('hdBag').hidden, pots.children.map(c => c.textContent));
  X('hdPotUse(0); UIX.hud()');
  ok('ใช้: ฮีล 20% ของ HP สูงสุด (40) · เหลือ 2 · ปุ่มบอก cooldown "🧪 2" + บรรทัดสอง "8 วิ" (data-cd · ปุ่มไม่กว้างขึ้น)', X('healed') === 40 && cnt() === 2 && b0().textContent === '🧪 2' && b0().dataset.cd === '8 วิ' && b0().classList.contains('cd'), [X('healed'), cnt(), b0().textContent, b0().dataset.cd]);
  X('hdPotUse(0)'); ok('ระหว่าง cooldown กดซ้ำไม่ใช้ยา', cnt() === 2 && X('healed') === 40);
  X('G.t=18.5; UIX.hud()'); ok('พ้น cooldown: ป้ายกลับเป็น "🧪 2" ไม่มีบรรทัดสอง', b0().textContent === '🧪 2' && b0().dataset.cd === '' && !b0().classList.contains('cd'), b0().textContent);
  X('P.hp=P.maxHp; hdPotUse(0)'); ok('HP เต็ม: ไม่ใช้ยา · log "HP เต็มอยู่แล้ว"', cnt() === 2 && dom.ids.get('shLog').textContent.includes('HP เต็มอยู่แล้ว'));
  X('P.hp=10'); for (const f of winOn.keydown || []) f({ code: 'KeyQ', repeat: false, preventDefault() {} });
  ok('ปุ่ม Q = ช่องด่วน 1 · ยาออกจากตัวละครในเซฟ (SAVE.chars)', cnt() === 1 && X('SAVE.chars.find(c=>c.id===ch.id).inv.find(x=>x.id==="u_potion_s").n') === 1);
  X('G.t=40; G.ui="pause"'); for (const f of winOn.keydown || []) f({ code: 'KeyQ', repeat: false, preventDefault() {} });
  ok('พักเกมอยู่: Q ไม่ใช้ยา', cnt() === 1);
  X('G.ui=null; hdPotUse(0); UIX.hud()'); ok('ยาหมด: "🧪 0" · ปุ่มกดไม่ได้', cnt() === 0 && b0().textContent === '🧪 0' && b0().disabled === true, b0().textContent);
  X('ch.quick=["u_potion_s","u_potion_l"]; invAdd(ch,"u_potion_l",2); G={char:ch,modeId:"survival",mode:MODES.survival,loot:[],ui:null,over:false,charTip:"",t:0}; UIX.hud()');
  ok('สองช่องด่วน: 🧪 0 กับ 🧪 2 · ปุ่ม E = ช่อง 2', pots.children.length === 2 && pots.children[1].textContent === '🧪 2' && /ปุ่ม E/.test(pots.children[1].getAttribute('aria-label')), pots.children.map(c => c.textContent));
  const bc = () => [X('document.body.classList.contains("hd-pot1")'), X('document.body.classList.contains("hd-pot2")')];
  ok('จอแคบ: body.hd-pot2 (เว้นที่ขวาให้ปุ่มยา 2 ปุ่ม ไม่ทับแถบสถานะ)', bc().join() === "false,true", bc());
  X('ch.quick=["m_dust","constructor"]; ch.inv=ch.inv.filter(x=>x.id!=="u_potion_s"); G={char:ch,modeId:"survival",mode:MODES.survival,loot:[],ui:null,over:false,charTip:"",t:0}; UIX.hud()');
  ok('ช่องด่วนที่ไม่ใช่ยา / id แปลก ("constructor") → ไม่มีปุ่ม', pots.hidden === true && X('HD.pot.join()') === ',');
  X('G={char:null,modeId:"classic",mode:MODES.classic,loot:[],ui:null,over:false,t:0}; UIX.hud()');
  ok('คลาสสิก: ไม่มีปุ่มยา · กล่อง HUD ซ่อน · ไม่เว้นที่ขวา (ไม่มี hd-pot1/2)', pots.hidden === true && dom.ids.get('hdBox').hidden === true && bc().join() === "false,false", bc());
  const n0 = X('healed'); for (const f of winOn.keydown || []) f({ code: 'KeyQ', repeat: false, preventDefault() {} });
  ok('คลาสสิก: Q ไม่ทำอะไร', X('healed') === n0);
}

console.log('M2 fix · ยาด่วน + สองแท็บ: อีกแท็บเซฟระหว่างรอบ → ยาที่ดื่มแล้วไม่กลับมา');
{
  const { X } = fresh(); X('shBoot()');
  X('globalThis.ch=createChar("สองแท็บ","cleric"); globalThis.healP=a=>{ P.hp=Math.min(P.maxHp,P.hp+a); }; globalThis.sfx=()=>{}');
  X('P={hp:50,maxHp:200}; G={char:ch,modeId:"survival",mode:MODES.survival,loot:[],ui:null,over:false,charTip:"",t:10}; UIX.hud()');
  // the other tab (same origin) saves while this one is mid-run: it bought dust and has a different gold total
  X('(()=>{ const k="runeguard.save.guest", o=JSON.parse(localStorage.getItem(k)); o.acct.gold=777; o.chars[0].inv.push({id:"m_dust",n:4}); o.mt++; localStorage.setItem(k,JSON.stringify(o)); })()');
  X('hdPotUse(0)');
  await tick(900);                                                   // past the old 800 ms debounce
  const r = X(`(()=>{ const o=JSON.parse(localStorage.getItem("runeguard.save.guest")), c=o.chars[0];
    return {stored:c.inv.find(x=>x.id==="u_potion_s").n, dust:(c.inv.find(x=>x.id==="m_dust")||{}).n, gold:o.acct.gold, mem:invCount(G.char,"u_potion_s"),
      live:SAVE.chars.indexOf(G.char)>=0, hp:P.hp, n:HD.potN[0]}; })()`);
  ok('ดื่มยาหลังอีกแท็บเซฟ: โหลดล่าสุดก่อน แล้วหักยาและเขียนทันที → ที่เก็บเหลือ 2 (ไม่กลับเป็น 3) · ของ/ทองของอีกแท็บยังอยู่ · G.char = ตัวในเซฟ · ปุ่มนับ 2',
    r.stored === 2 && r.mem === 2 && r.dust === 4 && r.gold === 777 && r.live && r.hp === 90 && r.n === 2, r);
  X('G.t=30; (()=>{ const k="runeguard.save.guest", o=JSON.parse(localStorage.getItem(k)); o.chars[0].inv.find(x=>x.id==="u_potion_s").n=9; o.mt++; localStorage.setItem(k,JSON.stringify(o)); })(); P.hp=20; hdPotUse(0)');
  const r2 = X('[JSON.parse(localStorage.getItem("runeguard.save.guest")).chars[0].inv.find(x=>x.id==="u_potion_s").n, HD.potN[0]]');
  ok('อีกแท็บซื้อยาเพิ่ม (9): กดครั้งถัดไปนับจากของล่าสุด → เหลือ 8 ทั้งในที่เก็บและบนปุ่ม', JSON.stringify(r2) === '[8,8]', r2);
}

console.log('M2 fix · scrSurv ระดับที่ล็อก: เหตุผลอยู่เหนือตาราง · ปุ่มเริ่มที่ปิดอยู่ทึบ (ไม่ทับข้อความจนอ่านไม่ออก)');
{
  const { X, dom } = fresh(); X('shBoot()');
  X('createChar("ล็อกไว้","archer")'); X('UI.go("scrSurv")'); dom.ids.get('svGrid').children[1].click();
  const body = dom.ids.get('svBody'), kids = body.children.map(c => c.className);
  const iLock = kids.indexOf('sv-lock'), iTbl = kids.indexOf('sv-tbl');
  ok('T1 ล็อก: "🔒 ไปให้ถึงคลื่น 10 …" มาก่อนตารางตัวเลข (เห็นได้โดยไม่ต้องเลื่อนลงไปใต้ปุ่ม)', iLock >= 0 && iTbl > iLock && dom.ids.get('svGo').disabled, kids);
  const css = readFileSync(join(ROOT, 'src/css/50-shell.css'), 'utf8');
  ok('CSS: .sh-foot .btn:disabled ทึบ (opacity:1 + พื้นหลัง) ไม่ใช่โปร่ง .45', /\.sh-foot \.btn:disabled\{[^}]*opacity:1[^}]*background:/.test(css));
  ok('หัวหน้าตัวละคร: คูลดาวน์ 0 = "0%" (ไม่ใช่ "−0%") · 3% = "−3%"', X('[shCdPct(1), shCdPct(.97), shCdPct(.9999)].join()') === '0%,−3%,0%', X('[shCdPct(1), shCdPct(.97)]'));
}

console.log('M2 · แผ่นส่งออกเซฟ (ปุ่มมีระยะห่าง)');
{
  const { X, dom } = fresh(); X('shBoot()');
  X('hbExport()'); const b = dom.ids.get('shSheetB').children[0];
  ok('ส่งออก: กล่อง .sh-col (flex · gap) ห่อปุ่มสองปุ่ม', b && b.className === 'sh-col' && b.children.filter(c => c.tagName === 'BUTTON').length === 2);
  X('closeSheet(); hbImport()'); ok('นำเข้า: กล่อง .sh-col', dom.ids.get('shSheetB').children[0].className === 'sh-col');
  const css = readFileSync(join(ROOT, 'src/css/50-shell.css'), 'utf8');
  ok('CSS: .sh-col มี gap', /\.sh-col\{[^}]*gap:\s*\d/.test(css));
}

console.log('m2-orch · สถิติคลาสสิกบนหน้าหลัก: runeguard.best ที่ถูกแก้ ไม่ขึ้น ∞');
{
  const { X } = fresh();
  X(`loadBest=()=>({mage:{score:'9e999'}, swordsman:{score:'<img src=x>'}, thief:{score:-5}})`);
  const a = X(`(()=>{ loadSaveFor(null); return hbClassicBest(); })()`);
  X(`loadBest=()=>({mage:{score:'9e999'}, archer:{score:1500, wave:12}})`);
  const b = X(`hbClassicBest()`);
  ok('สถิติที่ถูกแก้ (9e999 / ข้อความ / ติดลบ) ถูกล้างเหมือนตอนนำเข้า → ไม่แสดง · สถิติปกติยังแสดง', a === '' && /^1,500 คะแนน \(/.test(b) && !/∞|Infinity/.test(a + b), [a, b]);
}

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
