-- ย้อน rg_002 · ⚠ ลบประวัติการซื้อของผู้เล่นทุกคนถาวร → สิทธิ์ที่ซื้อแล้ว (ผู้สนับสนุน / รูน) หายจากเกมทันที
-- ก่อนรัน: เจ้าของ export public.rg_purchases เก็บไว้เอง (เป็นหลักฐานการรับเงินคู่กับ Stripe) · รันตอนคนใช้น้อย
-- DROP TABLE ถอด FK ออกจาก auth.users จึงล็อก auth.users แบบ ACCESS EXCLUSIVE ชั่วครู่ (ล็อกอินของทุกแอปรอ)
-- ล็อกไม่ได้ใน 2 วิ → error 55P03 ไม่มีอะไรเปลี่ยน รันใหม่ทีหลังได้ · drop table ลบ index / policy / sequence ของมันไปด้วย
begin;
set local lock_timeout = '2s';
drop table if exists public.rg_purchases;
commit;
