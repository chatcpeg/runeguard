-- เทสต์ rg_002 ด้วยผู้ใช้สองคน + webhook (service_role) + anon · รันหลัง apply rg_002_purchases.sql
-- ทั้งหมดอยู่ใน transaction เดียว จบด้วย raise exception 'ALL_PASS' เพื่อบังคับ rollback: ไม่มีข้อมูลค้าง และไม่แตะ auth.users
-- ผลที่ถูกต้อง: error ข้อความ ALL_PASS เท่านั้น · ข้อความที่ขึ้นต้นด้วย FAIL = ไม่ผ่าน
begin;
set constraints all deferred;
-- ===== webhook (service_role) บันทึกของ A หนึ่งรายการ ของ B หนึ่งรายการ =====
set local role service_role;
insert into public.rg_purchases(user_id, session_id, product, runes, days, amount)
  values ('00000000-0000-4000-8000-00000000000a', 'cs_test_A1', 'rune200', 200, 0, 9900);
insert into public.rg_purchases(user_id, session_id, product, runes, days, amount, livemode)
  values ('00000000-0000-4000-8000-00000000000b', 'cs_test_B1', 'sup30', 0, 30, 3500, false);
do $$ declare n int; begin
  insert into public.rg_purchases(user_id, session_id, product, runes, days, amount)              -- Stripe ส่ง event เดิมซ้ำ
    values ('00000000-0000-4000-8000-00000000000a', 'cs_test_A1', 'rune200', 200, 0, 9900) on conflict (session_id) do nothing;
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL same session recorded twice'; end if;
  begin
    insert into public.rg_purchases(user_id, session_id, product, runes, days, amount)
      values ('00000000-0000-4000-8000-00000000000b', 'cs_test_A1', 'rune60', 60, 0, 3500);
    raise exception 'FAIL duplicate session_id accepted';
  exception when unique_violation then null; end;                                                -- 23505
  begin
    insert into public.rg_purchases(user_id, session_id, product, runes, days, amount)
      values ('00000000-0000-4000-8000-00000000000a', 'cs_test_A2', 'rune9999', 9999, 0, 100);
    raise exception 'FAIL unknown product accepted';
  exception when check_violation then null; end;                                                 -- 23514
  begin
    insert into public.rg_purchases(user_id, session_id, product, runes, days, amount)
      values ('00000000-0000-4000-8000-00000000000a', 'cs_test_A3', 'rune60', 60, 0, -1);
    raise exception 'FAIL negative amount accepted';
  exception when check_violation then null; end;
  begin
    insert into public.rg_purchases(id, user_id, session_id, product, runes, days, amount)
      values (987654321, '00000000-0000-4000-8000-00000000000a', 'cs_test_A4', 'rune60', 60, 0, 3500);
    raise exception 'FAIL id chosen by the writer';
  exception when generated_always then null; end;                                                -- 428C9
  begin update public.rg_purchases set runes = 99999 where true; raise exception 'FAIL service_role can update';
  exception when insufficient_privilege then null; end;                                          -- 42501
  begin delete from public.rg_purchases where true; raise exception 'FAIL service_role can delete';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.rg_purchases) <> 2 then raise exception 'FAIL service_role sees % rows', (select count(*) from public.rg_purchases); end if;
end $$;
-- ===== ผู้เล่น A =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
do $$ begin
  if (select count(*) from public.rg_purchases) <> 1 then raise exception 'FAIL A sees % rows', (select count(*) from public.rg_purchases); end if;
  if (select session_id from public.rg_purchases) <> 'cs_test_A1' then raise exception 'FAIL A sees another row'; end if;
  if (select count(*) from public.rg_purchases where user_id = '00000000-0000-4000-8000-00000000000b') <> 0 then raise exception 'FAIL A reads B'; end if;
  begin
    insert into public.rg_purchases(user_id, session_id, product, runes, days, amount)
      values ('00000000-0000-4000-8000-00000000000a', 'cs_test_free', 'rune2500', 2500, 0, 0);
    raise exception 'FAIL player can grant themselves runes';
  exception when insufficient_privilege then null; end;
  begin update public.rg_purchases set runes = 99999 where true; raise exception 'FAIL player can update';
  exception when insufficient_privilege then null; end;
  begin delete from public.rg_purchases where true; raise exception 'FAIL player can delete';
  exception when insufficient_privilege then null; end;
  begin perform nextval('public.rg_purchases_id_seq'); raise exception 'FAIL player can use the id sequence';
  exception when insufficient_privilege then null; end;
end $$;
-- ===== ผู้เล่น B =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';
do $$ begin
  if (select count(*) from public.rg_purchases) <> 1 or (select product from public.rg_purchases) <> 'sup30'
     then raise exception 'FAIL B does not see exactly its own row'; end if;
end $$;
-- ===== anon =====
set local role anon;
do $$ begin
  begin perform count(*) from public.rg_purchases; raise exception 'FAIL anon can read';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.rg_purchases(user_id, session_id, product, runes, days, amount)
      values ('00000000-0000-4000-8000-00000000000a', 'cs_test_anon', 'rune60', 60, 0, 0);
    raise exception 'FAIL anon can insert';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin raise exception 'ALL_PASS'; end $$;
rollback;
