// test/_vm.mjs (lane A) — run chosen src/js files back to back in ONE node:vm context, without the IIFE,
// so a test can reach their top-level names. No dependencies.
//
//   import { loadSrc } from './_vm.mjs';
//   const ctx = loadSrc(['24-hooks', '30-balance', '42-progression'], { location: {hostname: 'localhost'} });
//   ctx.__eval('metaBonus({})')            // any expression, evaluated inside the context
//   ctx.localStorage / ctx.STORE           // in-memory storage (STORE comes from 24-hooks.js when it is loaded)
//
// Files: full names ('30-balance.js') or just the number prefix ('30'). They run in the order given, as one strict script.
// Default globals: console, crypto (webcrypto), localStorage + sessionStorage (in memory), STORE (in memory, only when
// 24-hooks.js is not loaded), matchMedia (never matches), structuredClone, TextEncoder/Decoder, URL, timers, performance.
// `stubs` adds or overrides globals (e.g. document, location, fetch).
import vm from 'node:vm';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';

export const JS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js');

export function memStorage() {
  const m = new Map();
  return {
    getItem: k => (m.has(String(k)) ? m.get(String(k)) : null),
    setItem: (k, v) => { m.set(String(k), String(v)); },
    removeItem: k => { m.delete(String(k)); },
    clear: () => m.clear(),
    key: i => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  };
}

export function resolveFiles(files) {
  const all = readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
  return files.map(f => {
    const hit = all.find(a => a === f || a === f + '.js' || a.startsWith(f + '-'));
    if (!hit) throw new Error('ไม่พบไฟล์ใน src/js: ' + f);
    return hit;
  });
}

export function loadSrc(files, stubs = {}) {
  const names = resolveFiles(files);
  const ls = memStorage();
  const g = {
    console, crypto: webcrypto, localStorage: ls, sessionStorage: memStorage(),
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    structuredClone, TextEncoder, TextDecoder, URL, setTimeout, clearTimeout, queueMicrotask, performance,
  };
  if (!names.some(n => n.startsWith('24-'))) {
    g.STORE = { get: k => ls.getItem(k), set: (k, v) => { ls.setItem(k, v); return true; }, del: k => ls.removeItem(k) };
  }
  Object.assign(g, stubs);
  const ctx = vm.createContext(g);
  ctx.self = ctx;
  const code = "'use strict';\n" + names.map(n => readFileSync(join(JS_DIR, n), 'utf8')).join('');
  vm.runInContext(code, ctx, { filename: 'src/js/{' + names.join(',') + '}' });
  Object.defineProperty(ctx, '__eval', { value: expr => vm.runInContext(expr, ctx), enumerable: false, configurable: true });
  Object.defineProperty(ctx, '__files', { value: names, enumerable: false, configurable: true });
  return ctx;
}
