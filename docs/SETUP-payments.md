# ขั้นตอนที่เจ้าของทำเอง: Stripe · Supabase · Vercel · ที่เก็บภาพ

> เขียน 2026-11-10 · ใช้คู่กับ `PROPOSAL-shop.md` ข้อ 5–6
> **ห้ามส่งคีย์ลับในแชต อีเมล หรือไฟล์ใด ๆ** กรอกที่ Vercel เท่านั้น · ถ้าคีย์หลุด ให้กด Roll/Revoke ที่ต้นทางแล้วกรอกใหม่

## สถานะตอนนี้
- ✅ `rg_001_init.sql` (cloud save) อยู่ในฐานข้อมูลแล้ว (migration 2026-11-09 08:07 UTC) · ตรงกับฉบับ v2 · ทดสอบ RLS สองผู้ใช้ผ่านครบ (2026-11-10)
- ⏳ `rg_002_purchases.sql` (ตารางรายการซื้อ) รออนุมัติ
- ⏳ โค้ดล็อกอิน (M3) และโค้ดรับเงิน (Vercel Function) ยังไม่ขึ้นเว็บ

## ก. Stripe — บัญชีแยกของ Runeguard (เริ่มด้วยโหมดทดสอบ)
1. เข้า https://dashboard.stripe.com ด้วยล็อกอินเดียวกับ BAZI
2. แตะชื่อบัญชีมุมซ้ายบน → **New account / สร้างบัญชีใหม่** → ชื่อ `Runeguard` · ประเทศ **Thailand**
   (บัญชีใหม่มีคีย์ webhook และเงินโอนเข้าของตัวเอง ไม่ปนกับ BAZI)
3. เปิด **Test mode** (หรือ **Sandbox** ในหน้าตาใหม่) ไว้ก่อน — ยังไม่ต้องกรอกข้อมูลธุรกิจหรือบัญชีธนาคาร
4. **Settings → Payment methods** → เปิด **Cards** และ **PromptPay**
5. **Developers → API keys** → คัดลอก **Secret key** (ขึ้นต้น `sk_test_`) ไว้กรอกใน Vercel ข้อ ค.
6. **Developers → Webhooks → Add destination** (หรือ Add endpoint)
   - Endpoint URL: `https://runeguard-lac.vercel.app/api/stripe-webhook`
   - Events ที่เลือก 3 ตัว: `checkout.session.completed` · `checkout.session.async_payment_succeeded` · `charge.refunded`
   - สร้างเสร็จ → แตะ **Reveal signing secret** → คัดลอก (ขึ้นต้น `whsec_`) ไว้กรอกใน Vercel
   - endpoint นี้จะยังตอบผิดพลาดจนกว่าโค้ดรับเงินจะขึ้นเว็บ ไม่เป็นไร (ยังไม่มีใครซื้อ)
7. **ตอนจะรับเงินจริง (ทีหลัง)**: กด **Activate payments** กรอกข้อมูลผู้ขายและบัญชีธนาคารไทย → ทำข้อ 5–6 ซ้ำในโหมด Live
   (ได้ `sk_live_` กับ `whsec_` ชุดใหม่) → เปลี่ยนค่าใน Vercel

## ข. Supabase — คีย์ลับเฉพาะ Runeguard
1. https://supabase.com/dashboard → โปรเจกต์ **BAZI** → **Project Settings → API Keys**
2. ส่วน **Secret keys** → **+ New secret key** → ชื่อ `runeguard-webhook`
3. คัดลอกคีย์ (ขึ้นต้น `sb_secret_`) ไว้กรอกใน Vercel
   - ใช้คีย์แยกแทน service_role เดิม เพื่อให้ลบทิ้งได้ทุกเมื่อโดยไม่กระทบ BAZI
   - คีย์นี้อยู่เฉพาะฝั่งเซิร์ฟเวอร์ (Vercel Function) ไม่เข้าไปในตัวเกม

## ค. Vercel — Environment Variables
1. https://vercel.com → โปรเจกต์ **runeguard** → **Settings → Environment Variables**
2. เพิ่ม 3 ตัว (ชื่อต้องตรงตัวอักษร) · Environments ติ๊ก **Production** และ **Preview** · เปิด **Sensitive**

| Key | Value |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_test_…` จากข้อ ก.5 |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` จากข้อ ก.6 |
| `SUPABASE_SECRET_KEY` | `sb_secret_…` จากข้อ ข.3 |

3. กด Save · ไม่ต้อง redeploy เอง — ค่าจะมีผลกับการ deploy ครั้งถัดไป (ตอนผม push โค้ดรับเงิน)
4. บอกผมแค่ว่า "กรอกแล้ว" — ไม่ต้องส่งค่า

> ⚠ Vercel แพ็กเกจฟรี (Hobby) ระบุว่าใช้ได้เฉพาะงานส่วนตัวที่ไม่ใช่เชิงพาณิชย์ · เมื่อเปิดรับเงินจริง ควรดูว่าต้องย้ายเป็น Pro หรือไม่

## ง. ที่เก็บภาพ — Supabase Storage bucket `rg-art`
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
