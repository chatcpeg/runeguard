// Build Runeguard as an installable PWA (static files only, no dependencies).
//
//   node build.mjs                 → local build to D:/Comfy-Desktop/ComfyUI-Shared/output/Runeguard/dist
//   OUT_DIR=some/dir node build.mjs → build anywhere else
//   on Vercel (VERCEL=1)            → ./dist  (vercel.json points outputDirectory at it)
//
// Output: index.html, manifest.webmanifest, sw.js, icons/*.png
// The icons are drawn in code below, so the repo itself holds no image files.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.env.OUT_DIR
  || (process.env.VERCEL ? join(HERE, 'dist') : 'D:/Comfy-Desktop/ComfyUI-Shared/output/Runeguard/dist');

const src = readFileSync(join(HERE, 'runeguard.html'), 'utf8');

// 1) syntax-check the game script without running it
const script = src.match(/<script>([\s\S]*)<\/script>/);
if (!script) throw new Error('runeguard.html has no <script> block');
try { new Function(script[1]); } catch (e) { console.error('ไวยากรณ์ JS ผิด:', e.message); process.exit(1); }

const version = createHash('sha256').update(src).digest('hex').slice(0, 10);

// 2) index.html — the artifact body split into <head> (title, fonts, styles) and <body>
const cut = src.indexOf('</style>') + '</style>'.length;
const headPart = src.slice(0, cut).replace(/<meta name="claude:viewport-fit-sides"[^>]*>\n?/, '');
const bodyPart = src.slice(cut);
const index = `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#10140e">
<meta name="description" content="เกมเอาชีวิตรอดจากฝูงซอมบี้ 20 คลื่น เลือก 5 อาชีพแฟนตาซี เก็บสกิล วิวัฒนาการ และเปลี่ยนอาชีพขั้นสอง">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Runeguard">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
${headPart}
</head>
<body>
${bodyPart}
<script>
/* PWA: cache the game so it opens instantly and works offline (build ${version}) */
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
</script>
</body>
</html>
`;

// 3) manifest
const manifest = {
  name: 'Runeguard · ศึกคลื่นอันเดด',
  short_name: 'Runeguard',
  description: 'เกมเอาชีวิตรอดจากฝูงซอมบี้ 20 คลื่น',
  lang: 'th',
  start_url: './',
  scope: './',
  display: 'fullscreen',
  display_override: ['fullscreen', 'standalone'],
  orientation: 'any',
  background_color: '#10140e',
  theme_color: '#10140e',
  categories: ['games'],
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

// 4) service worker: open from cache instantly, refresh the cache in the background
const CORE = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const sw = `// Runeguard service worker — build ${version}
const VERSION = 'runeguard-${version}';
const FONTS = 'runeguard-fonts';
const CORE = ${JSON.stringify(CORE)};
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    const key = req.mode === 'navigate' ? './index.html' : req;
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(key);
      const net = fetch(req).then(r => { if (r.ok) c.put(key, r.clone()); return r; }).catch(() => hit);
      if (hit) { e.waitUntil(net); return hit; }
      return net;
    }));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const r = await fetch(req);
      if (r.ok || r.type === 'opaque') c.put(req, r.clone());
      return r;
    }));
  }
});
`;

// 5) icons — tiny software rasteriser (4x4 supersampling) + PNG encoder
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) { raw[y * (size * 4 + 1)] = 0; rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4); }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const inPoly = (x, y, pts) => { let inside = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } return inside; };
// unit coordinates: 0..1 across the icon; `s` shrinks the emblem for maskable icons
function drawIcon(size, { rounded, s }) {
  const c = (v) => 0.5 + (v - 0.5) * s;
  const gold = hex('#f0b545'), goldDeep = hex('#9a6a1c'), steel = hex('#e6edf7'), steelDark = hex('#9fb0c4'), grip = hex('#5a3a22'), rune = hex('#5fd3c3');
  const layers = [
    // runes ring
    { col: gold, hit: (x, y) => { const d = Math.hypot(x - .5, y - .5); return d > .355 * s && d < .395 * s; } },
    { col: goldDeep, hit: (x, y) => { const d = Math.hypot(x - .5, y - .5); return d > .315 * s && d < .33 * s; } },
    { col: rune, hit: (x, y) => { const a = Math.atan2(y - .5, x - .5), d = Math.hypot(x - .5, y - .5); const k = ((a / (Math.PI * 2)) * 12 + 12) % 1; return d > .415 * s && d < .445 * s && Math.abs(k - .5) < .12; } },
    // sword blade (two tones), guard, grip, pommel
    { col: steelDark, hit: (x, y) => inPoly(x, y, [[c(.5), c(.17)], [c(.545), c(.27)], [c(.545), c(.66)], [c(.455), c(.66)], [c(.455), c(.27)]]) },
    { col: steel, hit: (x, y) => inPoly(x, y, [[c(.5), c(.17)], [c(.545), c(.27)], [c(.545), c(.66)], [c(.5), c(.66)]]) },
    { col: gold, hit: (x, y) => x > c(.355) && x < c(.645) && y > c(.645) && y < c(.69) },
    { col: grip, hit: (x, y) => x > c(.474) && x < c(.526) && y > c(.69) && y < c(.79) },
    { col: gold, hit: (x, y) => Math.hypot(x - c(.5), y - c(.81)) < .035 * s },
  ];
  const buf = Buffer.alloc(size * size * 4), SS = 4, r0 = .2;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let R = 0, Gc = 0, B = 0, A = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const x = (px + (sx + .5) / SS) / size, y = (py + (sy + .5) / SS) / size;
      if (rounded) { const qx = Math.max(Math.abs(x - .5) - (.5 - r0), 0), qy = Math.max(Math.abs(y - .5) - (.5 - r0), 0); if (Math.hypot(qx, qy) > r0) continue; }
      const d = Math.hypot(x - .5, y - .45);
      let col = [16 + 22 * Math.max(0, 1 - d * 1.8), 20 + 26 * Math.max(0, 1 - d * 1.8), 14 + 16 * Math.max(0, 1 - d * 1.8)];
      for (const l of layers) if (l.hit(x, y)) col = l.col;
      R += col[0]; Gc += col[1]; B += col[2]; A += 255;
    }
    const i = (py * size + px) * 4;
    if (A > 0) { const k = 255 / A; buf[i] = Math.round(R * k); buf[i + 1] = Math.round(Gc * k); buf[i + 2] = Math.round(B * k); }
    buf[i + 3] = Math.round(A / (SS * SS));
  }
  return png(size, buf);
}

// 6) write everything
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'icons'), { recursive: true });
writeFileSync(join(OUT, 'index.html'), index);
writeFileSync(join(OUT, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
writeFileSync(join(OUT, 'sw.js'), sw);
writeFileSync(join(OUT, 'icons/icon-192.png'), drawIcon(192, { rounded: true, s: 1 }));
writeFileSync(join(OUT, 'icons/icon-512.png'), drawIcon(512, { rounded: true, s: 1 }));
writeFileSync(join(OUT, 'icons/maskable-512.png'), drawIcon(512, { rounded: false, s: .78 }));
writeFileSync(join(OUT, 'icons/apple-touch-icon.png'), drawIcon(180, { rounded: false, s: .9 }));
console.log(`build ${version} → ${OUT}`);
