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
