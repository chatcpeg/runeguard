# Runeguard · ศึกคลื่นอันเดด

เกมเอาชีวิตรอดจากฝูงซอมบี้แนว survivor-like (โจมตีอัตโนมัติ เดินหลบฝูง เลือกการ์ดสกิลทุกเลเวล) 20 คลื่น
บอสที่คลื่น 5 / 10 / 15 / 20 · 5 อาชีพ × อาชีพขั้นสอง 2 ทาง · 40 สกิล · วิวัฒนาการ 20 แบบ
ทั้งเกมอยู่ในไฟล์เดียว เขียนด้วย Canvas 2D + JS ล้วน ไม่มีไลบรารีภายนอก (นอกจากฟอนต์ Google Fonts)

- artifact (ส่วนตัว): https://claude.ai/artifact/4AqpfLcBm7h7yffbCXVSjX
- สร้าง 2026-11-08 · v1.1 = อัปเกรดกราฟิก/เอฟเฟกต์ + PWA

## ไฟล์

| ไฟล์ | หน้าที่ |
|---|---|
| `src/` | **ต้นฉบับ** (ตั้งแต่ v2 M0) — `head.html` · `css/NN-*.css` · `markup/NN-*.html` · `js/NN-*.js` ต่อกันตามลำดับชื่อไฟล์ ผังไฟล์และเจ้าของแต่ละไฟล์อยู่ใน `docs/DESIGN.md` §7.1 |
| `runeguard.html` | **ไฟล์ที่ build สร้าง ห้ามแก้ด้วยมือ** — ตัวที่ publish เป็น artifact และเป็นที่มาของ PWA (จงใจไม่มี `<!doctype>`/`<head>` เพราะ artifact ห่อให้เอง) commit ไว้เพราะเป็นตัว publish |
| `build.mjs` | ประกอบ `src/` → `runeguard.html`, ตรวจกฎ L1–L11 (§7.3), สร้าง PWA: `index.html` (+ CSP), `manifest.webmanifest`, `sw.js`, ไอคอน PNG (วาดด้วยโค้ด) |
| `test/` | `build.test.mjs` ทดสอบกฎตรวจทุกข้อ · `_vm.mjs` โหลดไฟล์ใน `src/js` มาทดสอบใน node · `golden/` ผล golden run ของโหมดคลาสสิก + วิธีวัด |
| `vercel.json` | ให้ Vercel รัน `node build.mjs` แล้วเสิร์ฟโฟลเดอร์ `dist/` + security header + header ของ service worker |
| `package.json` | สคริปต์ `build` `lint` `check` `test` ไม่มี dependency |

repo นี้เก็บแค่โค้ด — ไอคอนและไฟล์ build ทั้งหมดสร้างตอน build ไม่ commit (`dist/` อยู่ใน `.gitignore`) · ไฟล์ทุกตัวเป็น LF (`.gitattributes`)

## build / ตรวจ / เล่นในเครื่อง

```
node build.mjs                    # ประกอบ src/ + ตรวจ L1–L11 + เขียน runeguard.html + dist
node build.mjs --lint             # ตรวจอย่างเดียว
node build.mjs --check            # fail ถ้า runeguard.html ไม่ตรงกับ src/ (ลืม build)
node build.mjs --verify-split=F   # เทียบ sha256 ผลประกอบกับไฟล์ F (ไม่เขียนอะไร)
npm test                          # test/build.test.mjs + --check
```
แก้เกม = แก้ไฟล์ใน `src/` แล้วรัน `node build.mjs` ทุกครั้ง · แก้ core (`04–25`, `90`) ต้องรัน golden ใหม่ (`test/golden/README.md`)
ผลลัพธ์ไปที่ `D:/Comfy-Desktop/ComfyUI-Shared/output/Runeguard/dist` (ตามกติกา repo: ห้ามเก็บไฟล์ภาพใน `D:\AntigravityRepo`)
ตั้ง `OUT_DIR=...` ถ้าอยาก build ไปที่อื่น · บน Vercel (`VERCEL=1`) จะออกที่ `./dist`

```
py -m http.server 8793 --bind 127.0.0.1 --directory D:/Comfy-Desktop/ComfyUI-Shared/output/Runeguard/dist
```
แล้วเปิด `http://localhost:8793/` — service worker ทำงานบน localhost และ https เท่านั้น

## PWA ช่วยอะไร (และไม่ช่วยอะไร)

- **ช่วย:** ติดตั้งลงหน้าจอเหมือนแอป, เปิดเต็มจอไม่มีแถบเบราว์เซอร์, เปิดครั้งถัดไปทันทีจากแคช, เล่นออฟไลน์ได้, จอไม่ดับระหว่างเล่น (wake lock)
- **ไม่ได้เพิ่ม FPS เอง** — ความลื่นมาจากตัวเกม: sprite วาดล่วงหน้า, texture แสงเก็บแคช, ตัวเลขดาเมจจาก atlas, pool ของผล query, canvas แบบ `alpha:false`
  และ **คุณภาพกราฟิกอัตโนมัติ** (ลด/เพิ่มความละเอียดจอ จำนวนอนุภาค รอยบนพื้น ตามเวลาต่อเฟรม) — เลือกเองได้ในเมนูพักเกม
- อัปเดตเกม: เปิดครั้งแรกหลัง deploy ใหม่จะยังเห็นเวอร์ชันเก่าจากแคช เมื่อ service worker ตัวใหม่พร้อมจะขึ้นปุ่ม
  "อัปเดตพร้อม · แตะเพื่อโหลดใหม่" (หรือได้เวอร์ชันใหม่เองตอนเปิดครั้งถัดไป)

## deploy

- GitHub: push ขึ้น `main` · Vercel: ถ้าเชื่อม repo ไว้จะ deploy อัตโนมัติทุก push,
  หรือสั่งเองด้วย `npx vercel --prod` ในโฟลเดอร์นี้ (ต้อง `npx vercel login` ก่อน)
- artifact: publish ไฟล์ `runeguard.html` ไปที่ URL artifact เดิม (artifact ใช้ service worker ไม่ได้ จึงเป็นแค่ตัวเล่นบนเว็บ)

## Hook สำหรับทดสอบ (`#dev`)

เปิดด้วย `...#dev` จะมี `window.RG` ใน console (ไม่มี `#dev` = ไม่มี hook ผู้เล่นทั่วไปโกงคะแนนไม่ได้)

| คำสั่ง | ทำอะไร |
|---|---|
| `RG.start('mage')` | เริ่มเกม (`swordsman` `mage` `archer` `cleric` `thief`) |
| `RG.sim(60)` | เร่งเวลา 60 วินาทีด้วยบอท (ข้ามป้าย/เสียง/อนุภาค/รอยพื้น — ใช้วัดสมดุล ไม่ได้ทดสอบกราฟิก) |
| `RG.renderMs(40)` | รัน update+render จริง 40 เฟรม คืนค่ามิลลิวินาทีต่อเฟรม (ทดสอบกราฟิกจริง) |
| `RG.info()` / `RG.state()` | สรุปสถานะ / object เกมทั้งหมด (`RG.state().player` = ผู้เล่น) |
| `RG.god(true)` · `RG.ui()` · `RG.quality('low')` | อมตะ · เปิดหน้าเลเวลอัพ/เปลี่ยนอาชีพที่ค้าง · ตั้งคุณภาพกราฟิก |
| `RG.seed(42)` | ทำให้สุ่มซ้ำได้ (ใช้กับ golden run: `RG.seed(42); RG.start(c); RG.sim(600)`) |
| `RG.run(mode, opts)` | เริ่มโหมดอื่น (`MODES` ใน `src/js/25-mode-survival.js` และไฟล์ของแต่ละ lane) · lane เติม `DEV.<ns>` แล้วจะโผล่เป็น `RG.<ns>` |

## ปรับสมดุลตรงไหน (ค้นหาใน `src/js/`)

- `waveCfg(w)` อัตราเกิด/HP/ดาเมจศัตรู · `BOSS_WAVES` บอส · `bossAI()` ท่าบอส
- `const SK=` สกิลทั้ง 40 (array 5 ช่อง = Lv1–5, `evo.set` = ค่าหลังวิวัฒนาการ) · `const CLASSES=` อาชีพ · `const EN=` ศัตรู
- `xpNeed` EXP ต่อเลเวล · `ADV_LV` เลเวลเปลี่ยนอาชีพ · `CAP` ศัตรูพร้อมกันสูงสุด
- กราฟิก: `QDPR` `QPART` `QDECAL` `QCORPSE` `QSS` = ค่าต่อระดับคุณภาพ (ต่ำ/กลาง/สูง)

## หมายเหตุลิขสิทธิ์

ชื่อ ตัวละคร อาชีพ สกิล และภาพทั้งหมดเป็นของเกมนี้เอง ไม่ได้ใช้ทรัพย์สินจาก Ragnarok หรือ Zombie Waves
(ได้แค่แนวเกมและบรรยากาศคล้ายกัน) ถ้าจะเพิ่มเนื้อหาให้คงหลักนี้ไว้
