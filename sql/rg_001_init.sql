-- Runeguard cloud save · โปรเจกต์ใช้ร่วม (BAZI) · แตะเฉพาะ object ชื่อ rg_*
-- ไม่สร้าง trigger บน auth.users · ไม่แก้ auth settings · ไม่แตะตารางแอปอื่น
begin;
set local lock_timeout = '5s';                -- v2: FK ล็อก auth.users (ShareRowExclusive) · ห้ามต่อคิวขวางการสมัคร/ล็อกอินของทุกแอป

create table public.rg_saves (
  user_id    uuid not null default auth.uid()
             references auth.users(id) on delete cascade
             deferrable initially immediate,                -- deferrable: ให้เทสต์ RLS ใช้ uuid ปลอมได้
  slot       smallint not null default 0 check (slot in (0, 1)),   -- 0 = ใช้จริง · 1 = สำรอง
  schema_v   smallint not null check (schema_v between 1 and 1000),
  rev        bigint   not null default 1,
  device     text     check (device is null or char_length(device) <= 40),
  summary    jsonb    not null default '{}'::jsonb
             check (jsonb_typeof(summary) = 'object' and pg_column_size(summary) <= 4096),
  data       jsonb    not null
             check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 524288),   -- v2: วัดข้อความที่ไม่บีบอัด (client จำกัด 256 KiB · jsonb::text ใหญ่กว่าได้ ~1.5 เท่า)
  updated_at timestamptz not null default now(),
  primary key (user_id, slot)
);

alter table public.rg_saves enable row level security;

revoke all on table public.rg_saves from public, anon, authenticated;
grant select, insert, update, delete on table public.rg_saves to authenticated;

create policy rg_saves_select on public.rg_saves for select to authenticated
  using (user_id = (select auth.uid()));
create policy rg_saves_insert on public.rg_saves for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy rg_saves_update on public.rg_saves for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy rg_saves_delete on public.rg_saves for delete to authenticated
  using (user_id = (select auth.uid()));

-- server เป็นเจ้าของ rev / updated_at / user_id / slot (client กำหนดเองไม่ได้)
-- ไม่ใช้ security definer · search_path ว่าง
create function public.rg_saves_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    new.user_id := old.user_id;
    new.slot    := old.slot;
    new.rev     := old.rev + 1;
  else
    new.rev := (extract(epoch from clock_timestamp()) * 1000)::bigint;   -- v2: ไม่ซ้ำหลังลบแล้วสร้างใหม่ (กัน ABA ของ CAS)
  end if;
  return new;
end $$;
revoke all on function public.rg_saves_touch() from public, anon, authenticated, service_role;

create trigger rg_saves_touch before insert or update on public.rg_saves
  for each row execute function public.rg_saves_touch();

commit;
