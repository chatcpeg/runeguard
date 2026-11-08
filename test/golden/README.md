# Golden run (คลาสสิก) — lane A

ไฟล์ `<cls>.json` ห้าไฟล์คือผล `JSON.stringify(RG.info())` ของรอบคลาสสิกที่จำลอง 600 วินาทีด้วย seed 42
บันทึกจาก**โค้ดตรรกะเดิม** (M0 ขั้น S2 = `runeguard.html` ของ main + `RG.seed` ใน `90-dev-hook.js` เท่านั้น)
หลังแก้ core ทุกครั้ง (M0 S3 และทุก CR) ต้องได้ผล**ตรงทุกตัวอักษร**ทั้ง 5 อาชีพ

## วิธีรัน
1. `node build.mjs` แล้วเปิดหน้าเกมผ่าน http (เช่น `py -m http.server 8793 --bind 127.0.0.1 --directory <dir>`)
   ต่อท้าย URL ด้วย `#dev` · ถ้าเปิด `dist/` ให้ใช้ browser context ใหม่ทุกครั้ง (service worker เสิร์ฟของเก่าก่อน)
2. viewport **1280×800** เดสก์ท็อป (ไม่ใช่ touch: `matchMedia('(pointer: coarse)')` ต้องเป็น false) · ไม่มี
   `runeguard.quality` ใน localStorage (ระดับคุณภาพจึงเป็น 2) · `ringPos` ขึ้นกับ `VW/VH` จึงต้องใช้ขนาดเดิมทุกครั้ง
3. รันใน**สคริปต์เดียวแบบ synchronous** (ห้ามแยกเป็นหลายคำสั่ง เพราะระหว่างนั้นเฟรมจริงจะเดินเกมและ `drawActors` จะเรียงศัตรูใหม่):
   ```js
   const C = ['swordsman','mage','archer','cleric','thief'], out = {};
   for (const c of C) { RG.seed(42); RG.start(c); RG.sim(600); out[c] = JSON.stringify(RG.info()); }
   ```
4. เทียบ `out[c]` กับเนื้อไฟล์ `<c>.json` (ตัดบรรทัดใหม่ท้ายไฟล์) ต้องเท่ากันทุกตัวอักษร

ผลที่บันทึก (Chrome 156 · Windows 11 · DPR 1 · innerWidth×innerHeight = 1280×800):

| อาชีพ | t | คลื่น | Lv | ศพ | อาชีพขั้นสอง | จบ |
|---|---|---|---|---|---|---|
| swordsman | 557.1 | 20 | 42 | 5006 | knight | ชนะ |
| mage | 537.3 | 20 | 42 | 4824 | elementalist | ชนะ |
| archer | 551.1 | 20 | 41 | 5035 | ranger | ชนะ |
| cleric | 600 | 19 | 40 | 4664 | highcleric | ยังไม่จบ |
| thief | 600 | 18 | 39 | 3961 | nightblade | ยังไม่จบ |

## ความ deterministic (ตรวจแล้ว)
- รันซ้ำในหน้าเดียวกัน 3 รอบ และใน browser context ใหม่อีกหน้า ได้ผลเท่ากันทุกไบต์ทั้ง 5 อาชีพ
  (หลัง S3 รันอีกครั้งในหน้าใหม่ และใน `dist/` ที่มี CSP ก็ได้ผลเท่าเดิม)
- **ต้นเหตุที่เจอและแก้แล้ว:** `startRun` ครั้งแรกของหน้าเรียก `initAudio()` ซึ่งเติม noise buffer ยาว 0.5 วิด้วย
  `Math.random` (48 kHz = 24,000 ค่า · 44.1 kHz = 22,050 ค่า) ทำให้รอบแรกของหน้าต่างจากรอบถัดไป และต่างตามการ์ดเสียงของเครื่อง
  แก้ที่ dev hook อย่างเดียว: `RG.seed(n)` เรียก `initAudio()` ก่อนแทน `Math.random` → การเล่นจริงไม่เปลี่ยน
- แหล่งอื่นที่ตรวจแล้วไม่กระทบ `sim`: `performance.now` (ใช้แค่ `uiReadyAt` / ตัววัดเวลา) · `Date.now` (แค่ `G.runId`) ·
  `setTimeout` ของ banner / endRun (ข้ามเมื่อ `G.auto`) · คุณภาพกราฟิก (sim ใช้ `qLv()` ได้ แต่ auto quality เดินเฉพาะใน `frame()`)

## renderMs (งบ ±5% ของ baseline · §7.10)
วิธีวัด (สคริปต์เดียว · หน้าอยู่ด้านหน้า · viewport 1280×800 · DPR 1):
```js
const med = a => a.slice().sort((x, y) => x - y)[a.length >> 1];
RG.quality('high');                       // ล็อกระดับ 2 กัน auto quality ลดระดับระหว่างคำสั่ง
const prep = c => { RG.seed(42); RG.start(c); RG.god(true); let g = RG.state(); while (g.wave < 15 && !g.over) { RG.sim(5); g = RG.state(); } };
const one = c => { prep(c); RG.renderMs(300); const ms = []; for (let i = 0; i < 5; i++) { prep(c); ms.push(RG.renderMs(300)); } return med(ms); };
const r = { mage: one('mage'), swordsman: one('swordsman') }; RG.state().ui = 'pause';   // หยุดเกมไว้ไม่ให้เดินต่อระหว่างรอบวัด
```
ทุกรอบเริ่มจากสถานะเดียวกัน (seed 42 + god mode จนถึงคลื่น 15: mage t=405 s ศัตรู 47 ตัว · swordsman t=395 s ศัตรู 183 ตัว)
แล้ววัด 300 เฟรมชุดเดียวกัน จึงเทียบกันได้ตรง ๆ · median ของ 5 รอบ (ทิ้งรอบอุ่นเครื่องหนึ่งรอบ)

**Baseline (S2 = ตรรกะเดิม):** หน้าใหม่ครั้งแรก mage **4.18 ms** · swordsman **3.64 ms** (ระดับ 2, 2026-11-08 ระหว่างเครื่องมีงานอื่นรัน)

เครื่องนี้มีงาน GPU/CPU อื่นรันร่วม ค่าสัมบูรณ์จึงขยับได้ ±30% ระหว่างช่วงเวลา ให้เทียบแบบสลับ A/B ในช่วงเดียวกันเท่านั้น
ผลสลับ S2 ↔ S3 (ล็อกคุณภาพ, median ms):

| รอบ | S2 mage | S3 mage | S2 swordsman | S3 swordsman |
|---|---|---|---|---|
| 1 | 3.115 | 3.117 | 2.824 | 2.649 |
| 2 | 3.032 | 3.114 | 2.775 | 2.699 |
| 3 | – | 2.850 | – | 2.696 |
| เฉลี่ย | 3.073 | 3.027 (−1.5%) | 2.800 | 2.681 (−4.2%) |

S3 (hooks + seams + stubs) อยู่ในงบ ±5% และไม่ช้ากว่าเดิม
