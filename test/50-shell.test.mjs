// test/50-shell.test.mjs (lane B) — router / back stack, history sync, sheet, confirmBox, hub status, survival tier info,
// reward rows, HUD hooks (classic untouched) and textContent-only names. Runs the real src/js files in node:vm with a tiny DOM.
//   node test/50-shell.test.mjs
import { loadSrc } from './_vm.mjs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['04', '05', '06', '07', '08', '15', '24', '25', '30', '31', '33', '34', '40', '41', '42', '50', '52', '55'];
let pass = 0, fail = 0;
const ok = (name, cond, info) => { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name + (info !== undefined ? '\n      ' + JSON.stringify(info) : '')); } };
const tick = ms => new Promise(r => setTimeout(r, ms));

// ---- a very small DOM: only what lane B touches -------------------------------------------------------------
const MARK_IDS = [...readFileSync(join(ROOT, 'src/markup/50-shell.html'), 'utf8').matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const CORE_IDS = ['scrTitle', 'scrLevel', 'scrAdv', 'scrPause', 'scrEnd', 'lvCards', 'btnMenuP', 'btnMenuE', 'pauseBox', 'endStats', 'btnMuteT', 'lvEyebrow', 'lvTitle'];
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
  ok('T3: Lv 18 · HP ×1.9 · ดาเมจ ×1.36 · ทอง 30 · ล็อกใน M1', t3.rec === 18 && Math.abs(t3.hp - 1.9) < 1e-9 && Math.abs(t3.dmg - 1.36) < 1e-9 && t3.gpw === 30 && !t3.open && !t3.unlocked, t3);
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
  ok('ปลด T1 ไม่แสดงใน M1 (T1 ยังไม่เปิด)', !rows.some(r => r.startsWith('ปลดล็อก|')), rows);
  X(`globalThis.rw2=onRunEnd({char:ch,modeId:'survival',mode:MODES.survival,tier:0,wave:3,runId:'r_t20',loot:[],t:30,kills:10,player:{hp:0},goldRun:0},false,{commit:true})`);
  ok('runId ซ้ำ → แถว "ไม่ได้บันทึก"', X('hdRewardRows(rw2,ch)')[0].join('|') === 'บันทึก|ไม่ได้บันทึก|bad');
  dom.ids.get('btnMenuE').textContent = 'เปลี่ยนอาชีพ'; dom.ids.get('btnMenuP').textContent = 'เปลี่ยนอาชีพ';
  X('hdEnd(shEl("endStats"),{rewards:null,char:null,modeId:"classic"})');
  ok('จอสรุปคลาสสิก: ไม่สร้างบล็อกรางวัล ปุ่มข้อความเดิม', X('HD.rew') === null && dom.ids.get('btnMenuE').textContent === 'เปลี่ยนอาชีพ');
  X('hdEnd(shEl("endStats"),{rewards:rw,char:ch,modeId:"survival"})');
  ok('จอสรุปโหมดตัวละคร: บล็อกรางวัลต่อจากกล่องสถิติ + ปุ่ม "กลับป้อม"', X('HD.rew.hidden') === false && X('HD.rew.previousElementSibling===shEl("endStats").parentNode') && dom.ids.get('btnMenuE').textContent === 'กลับป้อม');
  X('hdEnd(shEl("endStats"),{rewards:null,char:null,modeId:"classic"})');
  ok('คลาสสิกรอบถัดไป: บล็อกซ่อน + ปุ่มกลับเป็นข้อความเดิม', X('HD.rew.hidden') === true && dom.ids.get('btnMenuE').textContent === 'เปลี่ยนอาชีพ');
  X('hdPause(shEl("pauseBox"))');
  ok('พักเกมคลาสสิก: ไม่เพิ่มปุ่ม ปุ่มเดิม', dom.ids.get('pauseBox').children.length === 0 && dom.ids.get('btnMenuP').textContent === 'เปลี่ยนอาชีพ');
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
  ok('ของใน G.loot → log ระบบ', dom.ids.get('shLog').textContent.includes('ได้รับ m_dust ×2'));
  X('hdPause(shEl("pauseBox"))');
  ok('พักเกมเอาชีวิตรอด: ปุ่ม "ถอยทัพ · รับรางวัล" → endRun(false)', dom.ids.get('pauseBox').children.length === 1 && dom.ids.get('btnMenuP').textContent === 'กลับป้อม (ไม่รับรางวัล)');
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

console.log(`\nสรุป: ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
