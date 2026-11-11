begin;
set constraints all deferred;
-- ===== ผู้ใช้ A =====
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}';
insert into public.rg_saves(slot, schema_v, data) values (0, 1, '{"who":"A"}');
insert into public.rg_saves(slot, schema_v, data) values (1, 1, '{"who":"A-bak"}');
-- ===== ผู้ใช้ B =====
set local request.jwt.claims = '{"sub":"00000000-0000-4000-8000-00000000000b","role":"authenticated"}';
insert into public.rg_saves(slot, schema_v, data, rev) values (0, 1, '{"who":"B"}', 99);
do $$ declare n int; r0 bigint; begin
  if (select count(*) from public.rg_saves) <> 1 then raise exception 'FAIL B sees % rows', (select count(*) from public.rg_saves); end if;
  r0 := (select rev from public.rg_saves);
  if r0 = 99 or r0 < (extract(epoch from now()) * 1000)::bigint - 1 then raise exception 'FAIL client chose rev on insert (%)', r0; end if;
  update public.rg_saves set data = '{"x":1}' where user_id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL B updated A'; end if;
  delete from public.rg_saves where user_id = '00000000-0000-4000-8000-00000000000a';
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL B deleted A'; end if;
  begin
    insert into public.rg_saves(user_id, slot, schema_v, data) values ('00000000-0000-4000-8000-00000000000c', 0, 1, '{}');
    raise exception 'FAIL B inserted as C';
  exception when insufficient_privilege then null; end;                 -- 42501
  update public.rg_saves set user_id = '00000000-0000-4000-8000-00000000000a', rev = 50 where slot = 0;
  if (select user_id from public.rg_saves where slot = 0) <> '00000000-0000-4000-8000-00000000000b'
     then raise exception 'FAIL row moved to A'; end if;
  if (select rev from public.rg_saves where slot = 0) <> r0 + 1 then raise exception 'FAIL rev not server-owned'; end if;
  update public.rg_saves set data = '{"y":1}' where slot = 0 and rev = 999;       -- CAS ค้าง
  get diagnostics n = row_count; if n <> 0 then raise exception 'FAIL stale CAS wrote'; end if;
  begin                                                                    -- v2: ไม่อ่านคอลัมน์ = มีแค่ policy UPDATE คุม
    update public.rg_saves set device = 'b' where true;
    get diagnostics n = row_count; if n <> 1 then raise exception 'FAIL B updated % rows', n; end if;
  exception when insufficient_privilege then raise exception 'FAIL update policy lets B reach A'; end;
  begin
    update public.rg_saves set data = jsonb_build_object('pad',
      (select string_agg(md5(i::text), '') from generate_series(1, 17000) i)) where slot = 0;
    raise exception 'FAIL 544KB accepted';
  exception when check_violation then null; end;                        -- 23514
  delete from public.rg_saves where true;                                  -- v2: ไม่อ่านคอลัมน์ = มีแค่ policy DELETE คุม
  get diagnostics n = row_count; if n <> 1 then raise exception 'FAIL B deleted % rows (delete policy)', n; end if;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-00000000000a","role":"authenticated"}', true);
  if (select count(*) from public.rg_saves) <> 2 then raise exception 'FAIL A lost rows'; end if;
end $$;
-- ===== anon =====
set local role anon;
do $$ begin
  begin perform count(*) from public.rg_saves; raise exception 'FAIL anon can read';
  exception when insufficient_privilege then null; end;
  begin insert into public.rg_saves(slot, schema_v, data) values (0, 1, '{}'); raise exception 'FAIL anon can insert';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin raise exception 'ALL_PASS'; end $$;
rollback;
