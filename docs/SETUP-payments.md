# ขั้นตอนที่เจ้าของทำเอง: Stripe · Supabase · Vercel · ที่เก็บภาพ

> เขียน 2026-11-10 · ปรับตามของจริง 2026-11-12 (โค้ดรับเงินเสร็จแล้ว) · ใช้คู่กับ `PROPOSAL-shop.md` ข้อ 5–6
> **ห้ามส่งคีย์ลับในแชต อีเมล หรือไฟล์ใด ๆ** กรอกที่ Vercel เท่านั้น · ถ้าคีย์หลุด ให้กด Roll/Revoke ที่ต้นทางแล้วกรอกใหม่

## สถานะตอนนี้
- ✅ `rg_001_init.sql` (cloud save) อยู่ในฐานข้อมูลแล้ว (migration 2026-11-09 08:07 UTC) · ตรงกับฉบับ v2 · ทดสอบ RLS สองผู้ใช้ผ่านครบ (2026-11-10)
- ⏳ `sql/rg_002_purchases.sql` (ตารางรายการซื้อ) **รออนุมัติ แล้ว orchestrator รัน** → `get_advisors` → `sql/test_rls_rg_002.sql` ต้องได้ `ALL_PASS`
  (ย้อนกลับ: `sql/rg_002_down.sql` · ⚠ ลบประวัติการซื้อทั้งหมด ต้อง export ก่อน)
- ⏳ โค้ดล็อกอิน (M3 · `AUTH_ON=true`) + โค้ดรับเงิน (`api/checkout.js` · `api/stripe-webhook.js`) อยู่ใน branch รอ tester / เจ้าของตรวจ ยังไม่ขึ้นเว็บ

## ระบบทำงานอย่างไร (ย่อ)
1. ผู้เล่นล็อกอินในเกม → แตะราคาในร้านรูน → ยืนยัน
2. เกมส่ง `POST /api/checkout` พร้อม token ของผู้เล่นและ **รหัสสินค้าอย่างเดียว** → function ถาม Supabase ว่า token เป็นของใคร
   → ตั้งราคา/รูน/วันจากตารางใน `api/_shop.js` → สร้าง Checkout Session (บาท · บัตร + พร้อมเพย์) → ส่งผู้เล่นไปหน้า Stripe
3. จ่ายเสร็จ Stripe ส่ง event มาที่ `/api/stripe-webhook` → ตรวจลายเซ็น (`STRIPE_WEBHOOK_SECRET`) → ตรวจสินค้า/ยอดเงินกับตาราง
   → บันทึกลง `public.rg_purchases` หนึ่งแถวต่อหนึ่งการจ่าย (ส่งซ้ำ = ไม่บันทึกซ้ำ)
4. Stripe ส่งผู้เล่นกลับ `https://runeguard-lac.vercel.app/?paid=1` → เกมโหลดรายการซื้อของตัวเอง (อ่านได้เฉพาะของตัวเอง) → สิทธิ์ขึ้น
   - ผู้สนับสนุน: ซื้อซ้ำระหว่างยังไม่หมด = ต่อจากวันหมดเดิม
   - รูน: รวมทุกรายการ · ถ้าเซฟถูกแก้ให้มีรูนที่ซื้อเกินจริง เกมปรับลดให้ตรงกับรายการซื้อ

ราคา (แก้ที่ `api/_shop.js` และ `src/js/28-shop.js` พร้อมกัน · เทสต์ `test/45-pay.test.mjs` ฟ้องถ้าไม่ตรงกัน):
`sup30` 35 บาท 30 วัน · `rune60` 35 บาท · `rune200` 99 บาท · `rune700` 299 บาท · `rune2500` 899 บาท

## ก. Stripe — บัญชีแยกของ Runeguard (เริ่มด้วยโหมดทดสอบ)
1. เข้า https://dashboard.stripe.com ด้วยล็อกอินเดียวกับ BAZI
2. แตะชื่อบัญชีมุมซ้ายบน → **New account / สร้างบัญชีใหม่** → ชื่อ `Runeguard` · ประเทศ **Thailand**
   (บัญชีใหม่มีคีย์ webhook และเงินโอนเข้าของตัวเอง ไม่ปนกับ BAZI · webhook ของ BAZI จะไม่เห็นรายการของ Runeguard)
3. เปิด **Test mode** (หรือ **Sandbox** ในหน้าตาใหม่) ไว้ก่อน — ยังไม่ต้องกรอกข้อมูลธุรกิจหรือบัญชีธนาคาร
4. **Settings → Payment methods** → เปิด **Cards** และ **PromptPay**
   - ถ้า PromptPay ยังไม่เปิด การกดซื้อในเกมจะขึ้น "สร้างรายการชำระเงินไม่ได้ · ยังไม่มีการตัดเงิน" (Stripe ปฏิเสธทั้งรายการ)
5. **Developers → API keys** → คัดลอก **Secret key** (ขึ้นต้น `sk_test_`) ไว้กรอกใน Vercel ข้อ ค.
   (ใช้ Restricted key `rk_test_` ได้ ถ้าให้สิทธิ์ Checkout Sessions: Write)
6. **Developers → Webhooks → Add destination** (หรือ Add endpoint)
   - Endpoint URL: `https://runeguard-lac.vercel.app/api/stripe-webhook`
   - Events ที่ต้องเลือก: **`checkout.session.completed`**
   - แนะนำเพิ่ม: `checkout.session.async_payment_succeeded` (เผื่อพร้อมเพย์ยืนยันทีหลัง · โค้ดรับไว้แล้ว บันทึกซ้ำไม่ได้)
   - ไม่ต้องเลือก `charge.refunded` — ตอนนี้โค้ดยังไม่ถอนสิทธิ์อัตโนมัติเมื่อคืนเงิน (ตอบ 200 แล้วไม่ทำอะไร · ดูข้อ ช.)
   - API version: ใช้ค่าเริ่มต้นของบัญชีได้
   - สร้างเสร็จ → แตะ **Reveal signing secret** → คัดลอก (ขึ้นต้น `whsec_`) ไว้กรอกใน Vercel
7. **ตอนจะรับเงินจริง (ทีหลัง)**: กด **Activate payments** กรอกข้อมูลผู้ขายและบัญชีธนาคารไทย → ทำข้อ 4–6 ซ้ำในโหมด Live
   (ได้ `sk_live_` กับ `whsec_` ชุดใหม่) → เปลี่ยนค่าใน Vercel → Redeploy

## ข. Supabase — คีย์ลับเฉพาะ Runeguard
1. https://supabase.com/dashboard → โปรเจกต์ **BAZI** → **Project Settings → API Keys**
2. ส่วน **Secret keys** → **+ New secret key** → ชื่อ `runeguard-webhook`
3. คัดลอกคีย์ (ขึ้นต้น `sb_secret_`) ไว้กรอกใน Vercel
   - ใช้คีย์แยกแทน service_role เดิม เพื่อให้ลบทิ้งได้ทุกเมื่อโดยไม่กระทบ BAZI
   - คีย์นี้อยู่เฉพาะฝั่งเซิร์ฟเวอร์ (`api/stripe-webhook.js`) ไม่เข้าไปในตัวเกม · ใช้ทำอย่างเดียวคือเพิ่มแถวใน `rg_purchases`
     (ตาราง rg_002 ให้สิทธิ์ service role แค่ select + insert แก้/ลบรายการซื้อไม่ได้)
4. Auth → URL Configuration → Redirect URLs: มี `https://runeguard-lac.vercel.app/**` แล้ว (ใช้กับล็อกอินและลิงก์ในอีเมล) — ไม่ต้องแก้

## ค. Vercel — Environment Variables
1. https://vercel.com → โปรเจกต์ **runeguard** → **Settings → Environment Variables**
2. เพิ่ม 3 ตัว (ชื่อต้องตรงตัวอักษร) · Environments ติ๊ก **Production** และ **Preview** · เปิด **Sensitive**

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` จากข้อ ก.5 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` จากข้อ ก.6 |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` จากข้อ ข.3 |

3. กด Save · ค่าจะมีผลกับการ deploy ครั้งถัดไป (ถ้ากรอกหลัง push ให้กด **Redeploy** ที่ deployment ล่าสุด)
4. บอกผมแค่ว่า "กรอกแล้ว" — ไม่ต้องส่งค่า
5. ตรวจเองได้: เปิด `https://runeguard-lac.vercel.app/api/checkout` ต้องเห็น `{"configured":true}`
   - `false` = ยังขาดตัวใดตัวหนึ่ง หรือรูปแบบผิด (ต้องขึ้นต้น `sk_`/`rk_` · `whsec_`) · ระหว่างนั้นปุ่มซื้อในเกมจะบอกว่า "ระบบชำระเงินยังไม่เปิด"
   - ต้องครบทั้ง 3 ตัวถึงเปิด เพราะถ้าขาด webhook หรือคีย์ Supabase ผู้เล่นจะจ่ายเงินแล้วไม่ได้สิทธิ์

> ⚠ Vercel แพ็กเกจฟรี (Hobby) ระบุว่าใช้ได้เฉพาะงานส่วนตัวที่ไม่ใช่เชิงพาณิชย์ · เมื่อเปิดรับเงินจริง ควรดูว่าต้องย้ายเป็น Pro หรือไม่

## ง. ทดลองซื้อในโหมดทดสอบ (หลัง rg_002 อยู่ในฐานข้อมูล + env ครบ + deploy แล้ว)
1. เปิดเกม → ล็อกอินบัญชีของเจ้าของเอง → ร้านรูน → แตะ 35 บาท (แพคสนับสนุน) → ไปหน้าชำระเงิน
2. หน้า Stripe โหมดทดสอบ: บัตร `4242 4242 4242 4242` · วันหมดอายุอนาคตใดก็ได้ · CVC 3 หลักใดก็ได้
   (พร้อมเพย์ในโหมดทดสอบมีปุ่มจำลองการจ่ายสำเร็จ/ไม่สำเร็จ)
3. กลับมาที่เกม → ขึ้น "ได้รับสิทธิ์แล้ว" ภายในไม่กี่วินาที · หน้าบัญชีแสดง "ซื้อแล้ว 1 รายการ · ผู้สนับสนุนถึง …"
4. ถ้าไม่ขึ้น: Stripe → Developers → Webhooks → endpoint → ดู Event deliveries
   - 400 `bad_signature` = `STRIPE_WEBHOOK_SECRET` ไม่ตรงกับ endpoint นี้ · 503 = env ยังไม่ครบ
   - 500 = บันทึกลง Supabase ไม่ได้ (ยังไม่มีตาราง rg_purchases หรือคีย์ Supabase ผิด) · Stripe ส่งซ้ำเองนาน 3 วัน แก้แล้วสิทธิ์จะขึ้นเอง
   - 400 `mismatch` = ราคา/สินค้าไม่ตรงกับตาราง (เช่น แก้ราคาระหว่างที่มีคนกำลังจ่าย) · ไม่บันทึก · ให้ดูรายการนั้นแล้วคืนเงินหรือเพิ่มแถวเอง
   - Vercel → Logs ของ function ช่วยดูได้ (ไม่มีคีย์หรือ token อยู่ใน log)
5. รายการทดสอบมี `livemode = false` ในตาราง · ก่อนเปิดจริงลบแถวทดสอบได้ (ข้อ ช.)

## จ. เปิดรับเงินจริง
1. Stripe: Activate payments → ทำ ก.4–6 ในโหมด Live
2. Vercel: เปลี่ยน `STRIPE_SECRET_KEY` และ `STRIPE_WEBHOOK_SECRET` เป็นชุด Live → Redeploy
3. ซื้อจริงหนึ่งครั้ง (35 บาท) เพื่อตรวจ แล้วคืนเงินผ่าน Stripe ได้ถ้าต้องการ

## ช. คืนเงิน / ถอนสิทธิ์ (ทำเองใน dashboard)
- คืนเงินที่ Stripe → Payments → เลือกรายการ → Refund (Stripe คืนเงินให้ผู้ซื้อ)
- สิทธิ์ในเกม **ไม่ถอนอัตโนมัติ** · ถ้าต้องการถอน: Supabase → SQL Editor (สิทธิ์เจ้าของตาราง):
  `delete from public.rg_purchases where session_id = 'cs_…';` (ดู session id ได้จากหน้ารายการใน Stripe)
  เกมของผู้เล่นจะปรับรูนที่ซื้อลงตามรายการเมื่อโหลดรายการซื้อครั้งถัดไป

## ฉ. ที่เก็บภาพ — Supabase Storage bucket `rg-art`
**ค่าใช้จ่าย**: องค์กร Supabase ตอนนี้เป็นแพ็กเกจ **Free** → Supabase ไม่เก็บเงินเลย
- โควต้าต่อเดือน (ใช้ร่วมทั้งองค์กร รวม BAZI): Storage 1 GB · Egress 5 GB + Cached egress 5 GB
- ภาพ 40 รูปรวม ~640 KB · ผู้เล่นใหม่ 1 คนโหลดครั้งเดียว ~0.65 MB แล้วเกมเก็บไว้ในเครื่อง → ราว 7,000 คนใหม่ต่อเดือนถึงจะเต็ม 5 GB
- ถ้าเกินโควต้า: ไม่มีบิล แต่จะมีอีเมลเตือน + ระยะผ่อนผัน และถ้ายังเกินซ้ำ Supabase อาจจำกัดการใช้งาน **ทั้งองค์กร (รวม BAZI)**
  → ถ้า Runeguard โตขึ้นมาก ควรย้ายภาพไปที่อื่น (ผมเฝ้าดูให้ได้)

**ขั้นตอน**
1. Supabase → โปรเจกต์ BAZI → **Storage → New bucket** → ชื่อ `rg-art` → เปิด **Public bucket** → Create
2. เปิด bucket `rg-art` → **Upload files** → เลือกทั้ง 40 ไฟล์ใน
   `D:\Comfy-Desktop\ComfyUI-Shared\output\Runeguard\art\web_v1\` (webp 256 px · ตัดพื้นหลังแล้ว)
3. บอกผมว่า "อัปภาพแล้ว" → ผมใส่ภาพในหน้าเลือกอาชีพ/ตัวละคร · เลื่อนอาชีพ · สมุดมอนสเตอร์ · บอส
