# ร่าง: ร้านรูน · แพคสนับสนุน · ระดับเริ่มต้นของสกิล · การ์ด 5 ใบ · ชำระเงิน Stripe · ภาพ 40 รูป

> สถานะ: เจ้าของตอบ 2026-11-10 — ใช้ Stripe แบบ BAZI · ใช้แผ่นภาพ 40 รูปเดิม · เพิ่ม "แพครูน" + "หน้าระดับเริ่มต้นของสกิล"
> ทำเป็น 3 ขั้น: **ก. ฝั่งเกม** (ทำได้เลย) → **ข. ล็อกอิน M3** → **ค. รับเงินจริง** (ต้องรอเจ้าของทำบางอย่างเอง ดูข้อ 5)

## 1. สินค้า (ราคาเป็นบาท ผ่าน Stripe Checkout · บัตร + พร้อมเพย์ เหมือน BAZI)

| รหัส | สินค้า | ราคา | ได้ |
|---|---|---|---|
| `sup30` | 💎 แพคสนับสนุน 30 วัน | 35 บาท (≈ $0.99) | สุ่มการ์ดใหม่ไม่จำกัด · เลือกการ์ดได้ทั้ง 5 ใบ · ซื้อซ้ำต่อเวลา |
| `rune60` | 🔷 รูน 60 | 35 บาท | 60 รูน |
| `rune200` | 🔷 รูน 200 | 99 บาท | 200 รูน (คุ้มขึ้น ~18%) |
| `rune700` | 🔷 รูน 700 | 299 บาท | 700 รูน (~37%) |
| `rune2500` | 🔷 รูน 2500 | 899 บาท | 2500 รูน (~49%) |

## 2. รูนที่ซื้อ
- รูนที่ซื้อเป็นของ**บัญชี** (กระเป๋ารูน) ใช้กับตัวละครไหนก็ได้
- ตอนฝึกโหนดแล้วรูนของตัวละครไม่พอ เกมดึงจากกระเป๋าบัญชีให้ (บอกในปุ่มว่า "ใช้รูนที่ซื้อ n") แล้วรูนนั้นกลายเป็นของตัวละครนั้น
  (รีเซ็ตต้นไม้ = คืนเข้าตัวละครเดิม ไม่คืนกระเป๋าบัญชี)
- รูนของตัวละคร = Base Lv + รูนที่ย้ายเข้ามา (`ch.rb`)

## 3. ระดับเริ่มต้นของสกิล (หน้า "🚀 เริ่มรอบ")
- ตั้งได้ทีละสกิล: สกิลนี้เริ่มที่ Lv กี่ ตอนได้มาในรอบ (รวมสกิลที่ถือเริ่มรอบ) · ไม่เกิน ★ ที่ฝึกไว้
- ราคาแพงตั้งใจให้เป็นที่ใช้รูนก้อนใหญ่: Lv2 = 10 · Lv3 = 15 · Lv4 = 20 · Lv5 = 25 · Lv6 = 30 · Lv7 = 35 · Lv8 = 40
  (เริ่มที่ Lv5 = 70 รูน · Lv8 = 175 รูน ต่อสกิล)
- ใช้ได้ทุกโหมดยกเว้นคลาสสิก · รีเซ็ตพร้อมต้นไม้ของสกิลนั้น

## 4. การ์ด 5 ใบ + สุ่มใหม่ (โหมดตัวละคร · คลาสสิกคงเดิม 3 ใบ)
- ทุกคนเห็น 5 ใบ · คนทั่วไปเลือกได้ใบ 1–3 · ใบ 4–5 จาง + 🔒 แตะแล้วเปิดร้าน
- สุ่มใหม่: คนทั่วไป 2 ครั้งต่อรอบ · หมดแล้วปุ่มเป็น 🔒 แตะแล้วเปิดร้าน · ผู้สนับสนุนไม่จำกัด
- บอทเลือกการ์ดอัตโนมัติเลือกเฉพาะใบที่กดได้

## 5. รับเงินจริง (ขั้น ค.)
**วิธี (เหมือน BAZI)**: Vercel Function ในโปรเจกต์ Runeguard
- `api/checkout` รับ access token ของ Supabase → ตรวจผู้ใช้ → สร้าง Checkout Session (metadata `app:'runeguard'`, user, product)
- `api/stripe-webhook` ตรวจลายเซ็น → บันทึกลง `public.rg_purchases` ด้วย service role (ซ้ำ session เดิม = ไม่บันทึกซ้ำ)
- เกมอ่านรายการซื้อของตัวเอง (RLS) → คำนวณวันหมดอายุผู้สนับสนุน + รูนที่ซื้อทั้งหมด

**⚠ เรื่องต้องตัดสิน — ใช้บัญชี Stripe เดียวกับ BAZI หรือไม่**
webhook ของ BAZI รับ `checkout.session.completed` ทุกรายการในบัญชี → รายการของ Runeguard จะเข้า BAZI ด้วย
BAZI จะตอบ 400 (ไม่มี `credits`) → Stripe ส่งซ้ำหลายวัน และถ้าล้มเหลวต่อเนื่องอาจปิด endpoint ของ BAZI
ทางเลือก: (1) **สร้างบัญชี Stripe แยกสำหรับ Runeguard** (ล็อกอินเดียวกันได้ · แนะนำ) หรือ (2) แก้ webhook ของ BAZI ให้ตอบ 200 กับรายการที่ `metadata.app==='runeguard'` (แตะแอปอื่น ต้องได้ OK)

**สิ่งที่ขั้น ค. ต้องปิด (tester รอบ 2)** — ✅ ทำแล้ว 2026-11-12 (`shopClamp` ใน 28 · `test/45-pay`, `test/43-sync` ส่วน จ.)
- รูนที่ซื้อตอนนี้นับจากเซฟ (`ch.rb` / `acct.ru`) ซึ่งแก้เองได้ → ขั้น ค. ต้องให้ยอดรูนที่ซื้อจริง (rg_purchases) เป็นเพดาน: ตอนโหลด clamp Σ`ch.rb` ≤ `acct.ru` ≤ รูนที่ซื้อจริง
- สิทธิ์ทดสอบ (`#dev`) ใช้ได้เฉพาะ localhost แล้ว (เว็บจริงพิมพ์ `#dev` ก็ไม่ได้ของฟรี) · ปุ่มซื้อจะไป Stripe ก่อนทางทดสอบเสมอเมื่อเปิดรับเงิน

**เจ้าของต้องทำเอง** (ผมใส่คีย์หรือสมัครแทนไม่ได้)
1. ~~อนุมัติ `rg_001_init.sql`~~ (อยู่ในฐานข้อมูลแล้ว) · อนุมัติ `rg_002_purchases.sql` (ข้างล่าง · orchestrator รัน)
2. ใน Stripe (บัญชี Runeguard): สร้าง webhook endpoint `https://runeguard-lac.vercel.app/api/stripe-webhook` (event `checkout.session.completed` + แนะนำ `checkout.session.async_payment_succeeded`) · เปิด Cards + PromptPay
3. ใน Vercel โปรเจกต์ runeguard → Environment Variables: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SECRET_KEY` (คีย์ลับแยกของ Runeguard · เริ่มด้วย test mode ก่อน) — ขั้นตอนละเอียดใน `SETUP-payments.md`

**SQL `sql/rg_002_purchases.sql`** (ฉบับส่งอนุมัติ 2026-11-12 · แตะแค่ rg_* · ไม่มี trigger บน auth.users · ผู้เล่นอ่านได้อย่างเดียว · webhook เขียนได้อย่างเดียว · ย้อน: `sql/rg_002_down.sql` · เทสต์: `sql/test_rls_rg_002.sql` ต้องได้ `ALL_PASS`)
```sql
-- Runeguard purchases (Stripe) · โปรเจกต์ใช้ร่วม (BAZI) · แตะเฉพาะ object ชื่อ rg_*
-- ไม่สร้าง trigger บน auth.users · ไม่แก้ auth settings · ไม่แตะตารางแอปอื่น
-- เขียนได้เฉพาะ service role (api/stripe-webhook.js ด้วย SUPABASE_SECRET_KEY) · ผู้เล่นอ่านได้เฉพาะแถวของตัวเอง (RLS)
begin;
set local lock_timeout = '5s';                -- FK ล็อก auth.users ชั่วครู่ · ห้ามต่อคิวขวางการสมัคร/ล็อกอินของทุกแอป

create table public.rg_purchases (
  id             bigint generated always as identity primary key,
  user_id        uuid not null
                 references auth.users(id) on delete cascade
                 deferrable initially immediate,              -- deferrable: ให้เทสต์ RLS ใช้ uuid ปลอมได้ (เหมือน rg_saves)
  session_id     text not null unique check (char_length(session_id) between 1 and 200),   -- Stripe Checkout Session id · ซ้ำ = ไม่บันทึกซ้ำ
  product        text not null check (product in ('sup30','rune60','rune200','rune700','rune2500')),
  runes          int  not null default 0 check (runes between 0 and 100000),
  days           smallint not null default 0 check (days between 0 and 366),
  amount         int  not null check (amount >= 0),          -- สตางค์ (35 บาท = 3500)
  currency       text not null default 'thb' check (char_length(currency) <= 8),
  livemode       boolean not null default false,             -- false = รายการจากโหมดทดสอบของ Stripe
  payment_intent text check (payment_intent is null or char_length(payment_intent) <= 200),   -- ใช้ค้นตอนคืนเงิน
  created_at     timestamptz not null default now()
);
create index rg_purchases_user on public.rg_purchases(user_id, created_at);

alter table public.rg_purchases enable row level security;

-- default privileges ของ public ให้ anon / authenticated / service_role ได้ทุกสิทธิ์บนตารางและ sequence ใหม่ → ถอนก่อน แล้วให้เท่าที่ใช้
revoke all on table public.rg_purchases from public, anon, authenticated, service_role;
revoke all on sequence public.rg_purchases_id_seq from public, anon, authenticated;
grant select on table public.rg_purchases to authenticated;            -- เกมอ่านรายการซื้อของตัวเอง
grant select, insert on table public.rg_purchases to service_role;     -- webhook บันทึกได้อย่างเดียว (แก้/ลบไม่ได้)

create policy rg_purchases_select on public.rg_purchases for select to authenticated
  using (user_id = (select auth.uid()));

commit;
```

## 6. ภาพ 40 รูป (แผ่นเดิม `output\Runeguard\art\prod_v1`)
- ใช้ก่อนใน UI: หน้าเลือกอาชีพ/ตัวละคร · หน้าเลื่อนอาชีพ · สมุดมอนสเตอร์ · หน้าบอส (ตัวในฉากต่อสู้ยังวาดด้วยโค้ดเหมือนเดิม)
- ทำ: ตัดพื้นหลัง → ย่อ 256 px webp (ราว 15–25 KB/รูป) · เจน `fb_isleback` ใหม่ (ComfyQ lane `runeguard-art`)
- **⚠ เรื่องต้องตัดสิน — เก็บไฟล์ภาพไว้ที่ไหน**: กติกา repo ห้ามเก็บภาพ แต่ Vercel deploy จาก git จึงต้องมีที่ให้เว็บโหลดได้
  (1) Supabase Storage bucket `rg-art` แบบ public (แนะนำ · ไม่ปน repo · ต้องอนุมัติการสร้าง bucket)
  (2) ยกเว้นให้โฟลเดอร์ `assets/` ใน repo (~1 MB)
  (3) ฝังในไฟล์เกม (ไฟล์โตเกินงบ 800 KB)

## 7. ลำดับ
| ขั้น | งาน | รอ |
|---|---|---|
| ก | การ์ด 5 ใบ · สุ่มใหม่ 2 · ล็อก · หน้าร้าน · กระเป๋ารูน · ระดับเริ่มต้นของสกิล · เซฟ v5 · โหมดทดสอบ `#dev` | — |
| ข | ล็อกอิน (M3) + cloud save | อนุมัติ `rg_001` |
| ค | Stripe + `rg_purchases` + Vercel Function | บัญชี Stripe แยก/แก้ BAZI · อนุมัติ `rg_002` · env |
| ภาพ | ตัดพื้นหลัง + ใส่ UI | ที่เก็บภาพ |
| ต่อ | เฟส A + ภูมิประเทศ | — |
