-- ย้อน rg_001 · ⚠ ลบเซฟบนคลาวด์ของผู้เล่นทุกคนถาวร (กู้ได้ทางเดียวคือ restore ทั้งโปรเจกต์ ซึ่งย้อนแอปอื่นด้วย)
-- ก่อนรัน: เจ้าของ export public.rg_saves เก็บไว้เอง · รันตอนคนใช้น้อย
-- DROP TABLE ถอด FK ออกจาก auth.users จึงล็อก auth.users แบบ ACCESS EXCLUSIVE ชั่วครู่ (ล็อกอินของทุกแอปรอ)
-- ล็อกไม่ได้ใน 2 วิ → error 55P03 ไม่มีอะไรเปลี่ยน รันใหม่ทีหลังได้ · drop table ลบ trigger rg_saves_touch ไปด้วย
begin;
set local lock_timeout = '2s';
drop table if exists public.rg_saves;
drop function if exists public.rg_saves_touch();
commit;
