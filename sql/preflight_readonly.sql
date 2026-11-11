-- 1) ต้องยังไม่มี rg_*
select n.nspname, c.relname, c.relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where c.relname like 'rg\_%';
select proname from pg_proc where proname like 'rg\_%';
-- 2) trigger ทั้งหมดบน auth.users และ source ของฟังก์ชัน
select t.tgname, t.tgenabled, p.proname, p.prosecdef, pg_get_triggerdef(t.oid) as def,
       pg_get_functiondef(p.oid) as src
  from pg_trigger t join pg_proc p on p.oid = t.tgfoid
 where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
-- 3) default privileges ใน public (ตารางใหม่จะได้สิทธิ์อะไรมาโดยอัตโนมัติ)
select defaclrole::regrole, defaclnamespace::regnamespace, defaclobjtype, defaclacl from pg_default_acl;
