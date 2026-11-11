// test/_headless.mjs (lane F) — the whole game (src/js, no boot) in one node:vm context with a fake DOM, so a test can run
// real runs: startRun → update() / render() frames → endRun, with the real core, modes, kits and drawing code paths.
//   import { loadGame } from './_headless.mjs';  const { X } = loadGame();  X('startRun(…); update(1/60); …')
// Fake DOM: every element / canvas context is a Proxy that accepts any property, call or `new` (numbers read as 0).
// Not loaded: 99-boot (the requestAnimationFrame loop). Image is left undefined, so painted art (12b) stays off (vector looks).
// The viewport is 1280×800 at DPR 1 and there is no AudioContext — the same as the golden recipe (test/golden/README.md),
// so a seeded classic run here can be compared with test/golden/*.json. loadGame({dir}) loads another src/js folder (A/B).
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { webcrypto } from 'node:crypto';
import { JS_DIR, memStorage } from './_vm.mjs';

export function fake() {
  const store = new Map();
  return new Proxy(function () {}, {
    get(t, k) {
      if (k === Symbol.toPrimitive) return h => (h === 'number' ? 0 : '');
      if (k === 'toString' || k === 'valueOf') return () => '';
      if (k === Symbol.iterator) return function* () {};
      if (k === 'then') return undefined;
      if (k === 'length') return 0;
      if (store.has(k)) return store.get(k);
      const v = fake(); store.set(k, v); return v;
    },
    set(t, k, v) { store.set(k, v); return true; },
    has() { return true; },
    apply() { return fake(); },
    construct() { return fake(); },
  });
}

export function gameFiles(dir = JS_DIR) {
  return readdirSync(dir).filter(f => f.endsWith('.js') && !f.startsWith('99-')).sort();
}

export function loadGame(o = {}) {
  const dir = o.dir || JS_DIR, ls = memStorage();
  const g = {
    console, crypto: webcrypto, localStorage: ls, sessionStorage: memStorage(), structuredClone, TextEncoder, TextDecoder, URL,
    setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask, performance,
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    document: fake(), navigator: {}, history: fake(), window: { devicePixelRatio: 1 },
    location: { hash: '', hostname: 'localhost', href: 'http://localhost/', origin: 'http://localhost' },
    innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
    addEventListener() {}, removeEventListener() {}, requestAnimationFrame() { return 0; }, cancelAnimationFrame() {},
    fetch: () => Promise.reject(new Error('no network in tests')),
  };
  Object.assign(g, o.stubs || {});
  const ctx = vm.createContext(g); ctx.self = ctx;
  const names = gameFiles(dir);
  vm.runInContext("'use strict';\n" + names.map(n => readFileSync(join(dir, n), 'utf8')).join(''), ctx, { filename: 'game.js' });
  const X = e => vm.runInContext(e, ctx);
  X(`resize(); groundPat=null; if(typeof ART!=='undefined') ART.on=false;`);
  return { ctx, X, files: names };
}

// classic golden recipe (README): seed 42 → start → 600 s of sim → JSON of the dev hook's info()
export const GOLDEN_INFO = `JSON.stringify({t:+G.t.toFixed(1),wave:G.wave,boss:G.boss,lv:P.lv,hp:Math.round(P.hp)+'/'+Math.round(P.maxHp),kills:G.kills,enemies:G.enemies.length,projs:G.projs.length,gems:G.gems.length,zones:G.zones.length,parts:G.parts.length,decals:G.decals.length,corpses:G.corpses.length,adv:P.adv&&P.adv.id,over:G.over,won:G.won,
  skills:P.skills.map(s=>s.id+':'+(s.evolved?'EVO':s.lv)+':'+Math.round(s.dealt)).join(' '),stats:JSON.stringify(P.stats),quality:qLv()})`;
export function goldenRun(X, cls, sec = 600) {
  return X(`(()=>{ initAudio(); Math.random=mulberry(42>>>0); startRun('${cls}'); G.auto=true; for(let i=0;i<${Math.round(sec * 60)}&&!G.over;i++){ update(1/60); autoUI(); } G.auto=false; return ${GOLDEN_INFO}; })()`);
}
