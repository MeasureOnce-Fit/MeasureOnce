begin;

create extension if not exists pgtap with schema extensions;
select plan(50);

select ok((select relrowsecurity from pg_class where oid = 'public.retailers'::regclass), 'retailers has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.principals'::regclass), 'principals has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.retailer_memberships'::regclass), 'retailer_memberships has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.fit_profiles'::regclass), 'fit_profiles has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.profile_measurements'::regclass), 'profile_measurements has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.profile_preferences'::regclass), 'profile_preferences has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.fit_anchors'::regclass), 'fit_anchors has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.consent_events'::regclass), 'consent_events has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.export_requests'::regclass), 'export_requests has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.deletion_requests'::regclass), 'deletion_requests has RLS');
select ok((select relrowsecurity from pg_class where oid = 'private.external_identities'::regclass), 'external identities has RLS');
select ok((select relrowsecurity from pg_class where oid = 'private.deletion_receipts'::regclass), 'deletion receipts has RLS');
select ok((select relrowsecurity from pg_class where oid = 'private.retailer_assertion_replays'::regclass), 'retailer assertion replays has RLS');
select hasnt_column('public', 'principals', 'external_subject', 'raw external subject is removed');

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'shopper-a1@example.invalid'),
  ('10000000-0000-4000-8000-000000000002', 'shopper-a2@example.invalid'),
  ('10000000-0000-4000-8000-000000000003', 'shopper-b1@example.invalid'),
  ('10000000-0000-4000-8000-000000000004', 'shopper-b2@example.invalid'),
  ('10000000-0000-4000-8000-000000000005', 'operator-a@example.invalid'),
  ('10000000-0000-4000-8000-000000000006', 'operator-b@example.invalid');

insert into public.retailers (id, slug, display_name, tenant_kind, public_signup) values
  ('20000000-0000-4000-8000-000000000001', 'retailer-a', 'Retailer A', 'partner', false),
  ('20000000-0000-4000-8000-000000000002', 'retailer-b', 'Retailer B', 'partner', false);

select is(
  private.consume_retailer_assertion_replay(
    '20000000-0000-4000-8000-000000000001',
    'https://identity.retailer.example',
    'assertion-0001',
    now() + interval '5 minutes'
  ),
  true,
  'first assertion consumption succeeds'
);
select is(
  private.consume_retailer_assertion_replay(
    '20000000-0000-4000-8000-000000000001',
    'https://identity.retailer.example',
    'assertion-0001',
    now() + interval '5 minutes'
  ),
  false,
  'replayed assertion is rejected atomically'
);
select ok(
  private.consume_retailer_assertion_replay(
    '20000000-0000-4000-8000-000000000001',
    'https://second-issuer.retailer.example',
    'assertion-0001',
    now() + interval '5 minutes'
  )
  and private.consume_retailer_assertion_replay(
    '20000000-0000-4000-8000-000000000002',
    'https://identity.retailer.example',
    'assertion-0001',
    now() + interval '5 minutes'
  ),
  'replay keys stay retailer and issuer scoped'
);

insert into private.retailer_assertion_replays (
  retailer_id,
  issuer,
  assertion_id,
  expires_at
) values (
  '20000000-0000-4000-8000-000000000001',
  'https://identity.retailer.example',
  'assertion-expired-01',
  now() - interval '1 minute'
);
select private.consume_retailer_assertion_replay(
  '20000000-0000-4000-8000-000000000001',
  'https://identity.retailer.example',
  'assertion-purge-01',
  now() + interval '5 minutes'
);
select ok(
  not exists (
    select 1 from private.retailer_assertion_replays
    where assertion_id = 'assertion-expired-01'
  )
  and exists (
    select 1 from private.retailer_assertion_replays
    where retailer_id = '20000000-0000-4000-8000-000000000001'
      and issuer = 'https://identity.retailer.example'
      and assertion_id = 'assertion-0001'
  ),
  'expired replay rows are purged'
);
select throws_ok(
  $$ select private.consume_retailer_assertion_replay(
       '20000000-0000-4000-8000-000000000001',
       'https://identity.retailer.example',
       'assertion-expired-02',
       now() - interval '1 second'
     ) $$,
  '22023',
  'retailer assertion is already expired',
  'expired assertion cannot be consumed'
);

insert into public.principals (id, retailer_id, auth_user_id, actor_kind) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'shopper'),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', 'shopper'),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000003', 'shopper'),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000004', 'shopper'),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000005', 'operator'),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000006', 'operator');

select isnt(
  private.resolve_or_create_retailer_principal(
    '20000000-0000-4000-8000-000000000001',
    'https://identity.retailer.example',
    decode(repeat('11', 32), 'hex')
  ),
  private.resolve_or_create_retailer_principal(
    '20000000-0000-4000-8000-000000000002',
    'https://identity.retailer.example',
    decode(repeat('11', 32), 'hex')
  ),
  'external identity mapping is retailer scoped'
);
select is(
  private.resolve_or_create_retailer_principal(
    '20000000-0000-4000-8000-000000000001',
    'https://identity.retailer.example',
    decode(repeat('11', 32), 'hex')
  ),
  (
    select principal_id
    from private.external_identities
    where retailer_id = '20000000-0000-4000-8000-000000000001'
      and issuer = 'https://identity.retailer.example'
      and subject_digest = decode(repeat('11', 32), 'hex')
  ),
  'repeated retailer identity mapping resolves the same principal'
);
select is(
  (
    select p.auth_user_id
    from public.principals p
    join private.external_identities ei
      on ei.principal_id = p.id and ei.retailer_id = p.retailer_id
    where ei.retailer_id = '20000000-0000-4000-8000-000000000001'
      and ei.issuer = 'https://identity.retailer.example'
      and ei.subject_digest = decode(repeat('11', 32), 'hex')
  ),
  null::uuid,
  'retailer shopper principal has no auth user'
);

select ok(
  not has_function_privilege('anon', 'private.resolve_or_create_retailer_principal(uuid,text,bytea)', 'execute')
  and not has_function_privilege('authenticated', 'private.resolve_or_create_retailer_principal(uuid,text,bytea)', 'execute')
  and not has_function_privilege('anon', 'private.create_fit_profile_snapshot(uuid,uuid,text,text,timestamptz,text,jsonb,jsonb,jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'private.create_fit_profile_snapshot(uuid,uuid,text,text,timestamptz,text,jsonb,jsonb,jsonb)', 'execute')
  and not has_function_privilege('anon', 'private.replace_fit_profile_snapshot(uuid,uuid,uuid,integer,text,timestamptz,text,jsonb,jsonb,jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'private.replace_fit_profile_snapshot(uuid,uuid,uuid,integer,text,timestamptz,text,jsonb,jsonb,jsonb)', 'execute')
  and not has_function_privilege('anon', 'private.delete_retailer_fit_passport(uuid,uuid,uuid)', 'execute')
  and not has_function_privilege('authenticated', 'private.delete_retailer_fit_passport(uuid,uuid,uuid)', 'execute')
  and not has_function_privilege('anon', 'private.consume_retailer_assertion_replay(uuid,text,text,timestamptz)', 'execute')
  and not has_function_privilege('authenticated', 'private.consume_retailer_assertion_replay(uuid,text,text,timestamptz)', 'execute'),
  'server functions are hidden from browser roles'
);

insert into public.retailer_memberships (retailer_id, principal_id, role) values
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', 'retailer_admin'),
  ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000006', 'retailer_admin');

insert into public.consent_events (retailer_id, owner_principal_id, purpose, action, policy_version, occurred_at) values
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'fit_profile_storage', 'granted', 'm2-v1', '2026-09-18 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'fit_profile_storage', 'granted', 'm2-v1', '2026-09-18 12:00:00+00'),
  ('20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'fit_profile_storage', 'granted', 'm2-v1', '2026-09-18 12:00:00+00');

insert into public.fit_profiles (id, retailer_id, owner_principal_id, profile_kind, nickname) values
  ('40000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'self', 'Shopper A1'),
  ('40000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'self', 'Shopper A2'),
  ('40000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'self', 'Shopper B1');

create temporary table created_profile_fixture (id uuid primary key);
insert into created_profile_fixture (id)
select created_profile_id
from private.create_fit_profile_snapshot(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'additional_member',
  'Atomic member',
  now(),
  'active',
  '[
    {"region":"waist","original_value":32,"original_unit":"in","normalized_cm":9999,"method":"body_measurement","source":"shopper_entry"},
    {"region":"waist","original_value":16,"original_unit":"in","normalized_cm":9999,"method":"known_garment","source":"favorite_jeans"}
  ]'::jsonb,
  '[{"category":"denim","region":"waist","preference":"regular"}]'::jsonb,
  '[{"brand_id":"brand-02","garment_id":"jean-02","category":"denim","size_label":"32","observations":{"waist":"right"}}]'::jsonb
);
select is(
  (
    select concat(
      count(distinct fp.id), ':',
      count(distinct pm.id), ':',
      count(distinct pp.id), ':',
      count(distinct fa.id)
    )
    from created_profile_fixture fixture
    join public.fit_profiles fp on fp.id = fixture.id
    left join public.profile_measurements pm on pm.profile_id = fixture.id
    left join public.profile_preferences pp on pp.profile_id = fixture.id
    left join public.fit_anchors fa on fa.profile_id = fixture.id
  ),
  '1:2:1:1',
  'create profile snapshot commits atomically'
);
select is(
  (
    select string_agg(
      concat(pm.method, ':', pm.original_value, ':', pm.original_unit, ':', pm.normalized_cm),
      ',' order by pm.method
    )
    from public.profile_measurements pm
    where pm.profile_id = (select id from created_profile_fixture)
  ),
  'body_measurement:32.00:in:81.28,known_garment:16.00:in:40.64',
  'normalized centimeters are database derived'
);
select is(
  (
    select count(*)
    from public.profile_measurements pm
    where pm.profile_id = (select id from created_profile_fixture)
      and pm.region = 'waist'
  ),
  2::bigint,
  'body and known garment evidence can coexist'
);
select throws_ok(
  $$ select * from private.create_fit_profile_snapshot(
       '20000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000001',
       'additional_member',
       'Rollback member',
       now(),
       'active',
       '[{"region":"chest","original_value":40,"original_unit":"in","method":"body_measurement","source":"shopper_entry"}]'::jsonb,
       '[{"category":"tops","region":"chest","preference":"invalid"}]'::jsonb,
       '[]'::jsonb
     ) $$,
  '23514',
  'new row for relation "profile_preferences" violates check constraint "profile_preferences_preference_check"',
  'invalid child rejects profile snapshot creation'
);
select is(
  (select count(*) from public.fit_profiles where nickname = 'Rollback member'),
  0::bigint,
  'failed create profile snapshot rolls back'
);

set local role anon;
select throws_ok(
  $$ select * from public.fit_profiles $$,
  '42501',
  'permission denied for table fit_profiles',
  'anon cannot read private data'
);
reset role;

set local role authenticated;
select throws_ok(
  $$ select * from private.retailer_assertion_replays $$,
  '42501',
  'permission denied for table retailer_assertion_replays',
  'browser roles cannot read assertion replays'
);
reset role;

select * from private.replace_fit_profile_snapshot(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000001',
  1,
  'Shopper A1',
  null,
  'active',
  '[{"region":"hip","original_value":40,"original_unit":"in","normalized_cm":101.6,"method":"body_measurement","source":"shopper_entry"}]'::jsonb,
  '[{"category":"denim","region":"waist","preference":"regular"}]'::jsonb,
  '[{"brand_id":"brand-01","garment_id":"jean-01","category":"denim","size_label":"32","observations":{"waist":"right"}}]'::jsonb
);
select is(
  (
    select concat(
      fp.version, ':',
      (select count(*) from public.profile_measurements pm where pm.profile_id = fp.id), ':',
      (select count(*) from public.profile_preferences pp where pp.profile_id = fp.id), ':',
      (select count(*) from public.fit_anchors fa where fa.profile_id = fp.id)
    )
    from public.fit_profiles fp
    where fp.id = '40000000-0000-4000-8000-000000000001'
  ),
  '2:1:1:1',
  'atomic profile replacement commits'
);
select throws_ok(
  $$ select * from private.replace_fit_profile_snapshot(
       '20000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000001',
       '40000000-0000-4000-8000-000000000001',
       1,
       'Stale update',
       null,
       'active',
       '[]'::jsonb,
       '[]'::jsonb,
       '[]'::jsonb
     ) $$,
  '40001',
  'fit profile version conflict',
  'stale profile version is rejected'
);
select throws_ok(
  $$ select * from private.replace_fit_profile_snapshot(
       '20000000-0000-4000-8000-000000000001',
       '30000000-0000-4000-8000-000000000001',
       '40000000-0000-4000-8000-000000000001',
       2,
       'Must roll back',
       null,
       'active',
       '[{"region":"waist","original_value":-1,"original_unit":"in","normalized_cm":2.54,"method":"body_measurement","source":"shopper_entry"}]'::jsonb,
       '[]'::jsonb,
       '[]'::jsonb
     ) $$,
  '23514',
  'new row for relation "profile_measurements" violates check constraint "profile_measurements_original_value_check"',
  'invalid child rejects the entire replacement'
);
select is(
  (
    select concat(
      fp.version, ':', fp.nickname, ':',
      (select string_agg(pm.region, ',' order by pm.region) from public.profile_measurements pm where pm.profile_id = fp.id)
    )
    from public.fit_profiles fp
    where fp.id = '40000000-0000-4000-8000-000000000001'
  ),
  '2:Shopper A1:hip',
  'failed replacement rolls back'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select is(
  (select count(*) from public.fit_profiles),
  1::bigint,
  'shopper sees only their own profile'
);
select is(
  (select count(*) from public.fit_profiles where id = '40000000-0000-4000-8000-000000000002'),
  0::bigint,
  'shopper cannot read another shopper profile'
);
select throws_ok(
  $$ select * from private.external_identities $$,
  '42501',
  'permission denied for table external_identities',
  'tenant collision stays isolated'
);
select lives_ok(
  $$ insert into public.profile_measurements (
       retailer_id, profile_id, region, original_value, original_unit, method, source
     ) values (
       '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
       'waist', 32, 'in', 'body_measurement', 'shopper_entry'
     ) $$,
  'consented shopper can save an owned measurement'
);
select throws_ok(
  $$ insert into public.fit_profiles (
       retailer_id, owner_principal_id, profile_kind, nickname
     ) values (
       '20000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'self', 'Forged'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "fit_profiles"',
  'shopper cannot insert a cross-tenant profile'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000005';
select is(
  (select count(*) from public.fit_profiles),
  0::bigint,
  'operator cannot read shopper fit profiles'
);
select is(
  (select count(*) from public.retailer_memberships),
  1::bigint,
  'operator can read their own active membership'
);
select is(
  (select count(*) from public.retailer_memberships where retailer_id = '20000000-0000-4000-8000-000000000002'),
  0::bigint,
  'operator cannot read a different retailer membership'
);
reset role;

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select throws_ok(
  $$ update public.consent_events set action = 'withdrawn' $$,
  '42501',
  'permission denied for table consent_events',
  'consent events are append-only on update'
);
select throws_ok(
  $$ delete from public.consent_events $$,
  '42501',
  'permission denied for table consent_events',
  'consent events are append-only on delete'
);
reset role;

insert into public.consent_events (
  retailer_id, owner_principal_id, purpose, action, policy_version, occurred_at
) values (
  '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
  'fit_profile_storage', 'withdrawn', 'm2-v1', '2026-09-18 12:01:00+00'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';
select throws_ok(
  $$ insert into public.fit_anchors (
       retailer_id, profile_id, brand_id, garment_id, category, size_label
     ) values (
       '20000000-0000-4000-8000-000000000001', '40000000-0000-4000-8000-000000000001',
       'brand-01', 'garment-01', 'denim', '32'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "fit_anchors"',
  'withdrawn consent blocks later fit-data writes'
);
select lives_ok(
  $$ insert into public.export_requests (
       retailer_id, owner_principal_id, idempotency_key
     ) values (
       '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001',
       'export-a1-0001'
     ) $$,
  'shopper can request their own JSON export'
);
select throws_ok(
  $$ insert into public.export_requests (
       retailer_id, owner_principal_id, idempotency_key
     ) values (
       '20000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002',
       'export-forged-0001'
     ) $$,
  '42501',
  'new row violates row-level security policy for table "export_requests"',
  'shopper cannot request another shopper export'
);
reset role;

select private.delete_retailer_fit_passport(
  '20000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000002',
  '90000000-0000-4000-8000-000000000001'
);
select ok(
  exists (
    select 1 from private.deletion_receipts
    where receipt_id = '90000000-0000-4000-8000-000000000001'
  )
  and not exists (
    select 1 from public.principals
    where id = '30000000-0000-4000-8000-000000000002'
  ),
  'deletion receipt survives principal cascade'
);
select ok(
  exists (
    select 1 from auth.users
    where id = '10000000-0000-4000-8000-000000000002'
  ),
  'retailer auth user survives fit passport deletion'
);

insert into auth.users (id, email)
values ('10000000-0000-4000-8000-000000000008', 'detached-auth@example.invalid');
insert into public.principals (id, retailer_id, auth_user_id, actor_kind)
values (
  '30000000-0000-4000-8000-000000000008',
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000008',
  'shopper'
);
delete from auth.users where id = '10000000-0000-4000-8000-000000000008';
select ok(
  exists (
    select 1 from public.principals
    where id = '30000000-0000-4000-8000-000000000008'
      and auth_user_id is null
  ),
  'auth user deletion detaches instead of cascading a shopper principal'
);

select * from finish();
rollback;

