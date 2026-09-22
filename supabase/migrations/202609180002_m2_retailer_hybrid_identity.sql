-- Retailer-owned shopper identity bridge.
--
-- The application server verifies the retailer assertion and computes an
-- HMAC-SHA-256 digest of its opaque subject before calling this database.
-- Raw retailer subjects and retailer credentials are never persisted here.

drop index if exists public.principals_retailer_external_subject_unique;

alter table public.principals
  drop column external_subject;

alter table public.principals
  alter column auth_user_id drop not null;

alter table public.principals
  drop constraint principals_auth_user_id_fkey;

alter table public.principals
  add constraint principals_auth_user_id_fkey
  foreign key (auth_user_id)
  references auth.users(id)
  on delete set null;

alter table public.principals
  add constraint principals_operator_requires_auth_user
  check (actor_kind <> 'operator' or auth_user_id is not null);

alter table public.profile_measurements
  drop constraint profile_measurements_profile_id_region_key;

alter table public.profile_measurements
  drop column normalized_cm;

alter table public.profile_measurements
  add column normalized_cm numeric(8, 2)
  generated always as (
    round(
      case
        when original_unit = 'in' then original_value * 2.54
        else original_value
      end,
      2
    )
  ) stored;

alter table public.profile_measurements
  add constraint profile_measurements_profile_region_method_source_key
  unique (profile_id, region, method, source);

create table private.external_identities (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  principal_id uuid not null,
  issuer text not null check (length(trim(issuer)) between 1 and 500),
  subject_digest bytea not null check (octet_length(subject_digest) = 32),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  foreign key (principal_id, retailer_id)
    references public.principals(id, retailer_id) on delete cascade,
  unique (retailer_id, issuer, subject_digest)
);

create index external_identities_principal_idx
  on private.external_identities (principal_id, retailer_id);

comment on column private.external_identities.subject_digest is
  'HMAC-SHA-256 of the opaque retailer subject, computed by the trusted application server.';

create table private.deletion_receipts (
  receipt_id uuid primary key,
  target_kind text not null default 'fit_passport' check (target_kind = 'fit_passport'),
  completed_at timestamptz not null default now(),
  schema_version smallint not null default 1 check (schema_version = 1)
);

comment on table private.deletion_receipts is
  'Non-identifying proof that a Fit Passport deletion operation completed.';

create table private.retailer_assertion_replays (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  issuer text not null check (length(trim(issuer)) between 1 and 500),
  assertion_id text not null check (
    assertion_id ~ '^[A-Za-z0-9][A-Za-z0-9._~-]{7,199}$'
  ),
  expires_at timestamptz not null,
  consumed_at timestamptz not null default now(),
  unique (retailer_id, issuer, assertion_id)
);

create index retailer_assertion_replays_expiry_idx
  on private.retailer_assertion_replays (expires_at);

comment on table private.retailer_assertion_replays is
  'Short-lived, server-only identifiers consumed to reject retailer assertion replay.';

alter table private.external_identities enable row level security;
alter table private.deletion_receipts enable row level security;
alter table private.retailer_assertion_replays enable row level security;

revoke all on table private.external_identities from public;
revoke all on table private.external_identities from anon;
revoke all on table private.external_identities from authenticated;
revoke all on table private.deletion_receipts from public;
revoke all on table private.deletion_receipts from anon;
revoke all on table private.deletion_receipts from authenticated;
revoke all on table private.retailer_assertion_replays from public;
revoke all on table private.retailer_assertion_replays from anon;
revoke all on table private.retailer_assertion_replays from authenticated;

create function private.resolve_or_create_retailer_principal(
  p_retailer_id uuid,
  p_issuer text,
  p_subject_digest bytea
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_candidate_principal_id uuid;
  v_principal_id uuid;
begin
  if p_issuer is null or length(trim(p_issuer)) not between 1 and 500 then
    raise exception 'retailer identity issuer is invalid' using errcode = '22023';
  end if;
  if p_subject_digest is null or octet_length(p_subject_digest) <> 32 then
    raise exception 'retailer subject digest must be 32 bytes' using errcode = '22023';
  end if;

  select ei.principal_id
    into v_principal_id
  from private.external_identities ei
  where ei.retailer_id = p_retailer_id
    and ei.issuer = trim(p_issuer)
    and ei.subject_digest = p_subject_digest;

  if v_principal_id is not null then
    update private.external_identities
    set last_seen_at = now()
    where retailer_id = p_retailer_id
      and issuer = trim(p_issuer)
      and subject_digest = p_subject_digest;
    return v_principal_id;
  end if;

  insert into public.principals (retailer_id, auth_user_id, actor_kind)
  values (p_retailer_id, null, 'shopper')
  returning id into v_candidate_principal_id;

  insert into private.external_identities (
    retailer_id,
    principal_id,
    issuer,
    subject_digest
  ) values (
    p_retailer_id,
    v_candidate_principal_id,
    trim(p_issuer),
    p_subject_digest
  )
  on conflict (retailer_id, issuer, subject_digest)
  do update set last_seen_at = now()
  returning principal_id into v_principal_id;

  if v_principal_id <> v_candidate_principal_id then
    delete from public.principals
    where id = v_candidate_principal_id
      and retailer_id = p_retailer_id;
  end if;

  return v_principal_id;
end
$$;

create function private.create_fit_profile_snapshot(
  p_retailer_id uuid,
  p_owner_principal_id uuid,
  p_profile_kind text,
  p_nickname text,
  p_permission_confirmed_at timestamptz,
  p_status text,
  p_measurements jsonb,
  p_preferences jsonb,
  p_anchors jsonb
)
returns table (created_profile_id uuid, new_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_version integer;
  v_latest_consent_action text;
begin
  if p_measurements is null
    or p_preferences is null
    or p_anchors is null
    or jsonb_typeof(p_measurements) <> 'array'
    or jsonb_typeof(p_preferences) <> 'array'
    or jsonb_typeof(p_anchors) <> 'array' then
    raise exception 'profile child collections must be JSON arrays' using errcode = '22023';
  end if;

  select ce.action
    into v_latest_consent_action
  from public.consent_events ce
  where ce.owner_principal_id = p_owner_principal_id
    and ce.retailer_id = p_retailer_id
    and ce.purpose = 'fit_profile_storage'
  order by ce.occurred_at desc, ce.id desc
  limit 1;

  if v_latest_consent_action is distinct from 'granted' then
    raise exception 'active fit profile storage consent is required' using errcode = '42501';
  end if;

  insert into public.fit_profiles (
    retailer_id,
    owner_principal_id,
    profile_kind,
    nickname,
    permission_confirmed_at,
    status
  ) values (
    p_retailer_id,
    p_owner_principal_id,
    p_profile_kind,
    p_nickname,
    p_permission_confirmed_at,
    p_status
  )
  returning id, version into v_profile_id, v_version;

  insert into public.profile_measurements (
    retailer_id,
    profile_id,
    region,
    original_value,
    original_unit,
    method,
    source
  )
  select
    p_retailer_id,
    v_profile_id,
    item.region,
    item.original_value,
    item.original_unit,
    item.method,
    item.source
  from jsonb_to_recordset(p_measurements) as item(
    region text,
    original_value numeric,
    original_unit text,
    method text,
    source text
  );

  insert into public.profile_preferences (
    retailer_id,
    profile_id,
    category,
    region,
    preference
  )
  select
    p_retailer_id,
    v_profile_id,
    item.category,
    item.region,
    item.preference
  from jsonb_to_recordset(p_preferences) as item(
    category text,
    region text,
    preference text
  );

  insert into public.fit_anchors (
    retailer_id,
    profile_id,
    brand_id,
    garment_id,
    category,
    size_label,
    observations
  )
  select
    p_retailer_id,
    v_profile_id,
    item.brand_id,
    item.garment_id,
    item.category,
    item.size_label,
    coalesce(item.observations, '{}'::jsonb)
  from jsonb_to_recordset(p_anchors) as item(
    brand_id text,
    garment_id text,
    category text,
    size_label text,
    observations jsonb
  );

  return query select v_profile_id, v_version;
end
$$;

create function private.replace_fit_profile_snapshot(
  p_retailer_id uuid,
  p_owner_principal_id uuid,
  p_profile_id uuid,
  p_expected_version integer,
  p_nickname text,
  p_permission_confirmed_at timestamptz,
  p_status text,
  p_measurements jsonb,
  p_preferences jsonb,
  p_anchors jsonb
)
returns table (replaced_profile_id uuid, new_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_version integer;
  v_next_version integer;
  v_latest_consent_action text;
begin
  if p_measurements is null
    or p_preferences is null
    or p_anchors is null
    or jsonb_typeof(p_measurements) <> 'array'
    or jsonb_typeof(p_preferences) <> 'array'
    or jsonb_typeof(p_anchors) <> 'array' then
    raise exception 'profile child collections must be JSON arrays' using errcode = '22023';
  end if;

  select fp.version
    into v_current_version
  from public.fit_profiles fp
  where fp.id = p_profile_id
    and fp.retailer_id = p_retailer_id
    and fp.owner_principal_id = p_owner_principal_id
  for update;

  if v_current_version is null then
    raise exception 'fit profile was not found' using errcode = 'P0002';
  end if;
  if v_current_version <> p_expected_version then
    raise exception 'fit profile version conflict' using errcode = '40001';
  end if;

  select ce.action
    into v_latest_consent_action
  from public.consent_events ce
  where ce.owner_principal_id = p_owner_principal_id
    and ce.retailer_id = p_retailer_id
    and ce.purpose = 'fit_profile_storage'
  order by ce.occurred_at desc, ce.id desc
  limit 1;

  if v_latest_consent_action is distinct from 'granted' then
    raise exception 'active fit profile storage consent is required' using errcode = '42501';
  end if;

  update public.fit_profiles
  set nickname = p_nickname,
      permission_confirmed_at = p_permission_confirmed_at,
      status = p_status
  where id = p_profile_id
    and retailer_id = p_retailer_id
    and owner_principal_id = p_owner_principal_id
  returning version into v_next_version;

  delete from public.profile_measurements
  where profile_id = p_profile_id and retailer_id = p_retailer_id;
  delete from public.profile_preferences
  where profile_id = p_profile_id and retailer_id = p_retailer_id;
  delete from public.fit_anchors
  where profile_id = p_profile_id and retailer_id = p_retailer_id;

  insert into public.profile_measurements (
    retailer_id,
    profile_id,
    region,
    original_value,
    original_unit,
    method,
    source
  )
  select
    p_retailer_id,
    p_profile_id,
    item.region,
    item.original_value,
    item.original_unit,
    item.method,
    item.source
  from jsonb_to_recordset(p_measurements) as item(
    region text,
    original_value numeric,
    original_unit text,
    method text,
    source text
  );

  insert into public.profile_preferences (
    retailer_id,
    profile_id,
    category,
    region,
    preference
  )
  select
    p_retailer_id,
    p_profile_id,
    item.category,
    item.region,
    item.preference
  from jsonb_to_recordset(p_preferences) as item(
    category text,
    region text,
    preference text
  );

  insert into public.fit_anchors (
    retailer_id,
    profile_id,
    brand_id,
    garment_id,
    category,
    size_label,
    observations
  )
  select
    p_retailer_id,
    p_profile_id,
    item.brand_id,
    item.garment_id,
    item.category,
    item.size_label,
    coalesce(item.observations, '{}'::jsonb)
  from jsonb_to_recordset(p_anchors) as item(
    brand_id text,
    garment_id text,
    category text,
    size_label text,
    observations jsonb
  );

  return query select p_profile_id, v_next_version;
end
$$;

create function private.delete_retailer_fit_passport(
  p_retailer_id uuid,
  p_owner_principal_id uuid,
  p_receipt_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor_kind text;
begin
  if exists (
    select 1 from private.deletion_receipts dr where dr.receipt_id = p_receipt_id
  ) then
    return p_receipt_id;
  end if;

  select p.actor_kind
    into v_actor_kind
  from public.principals p
  where p.id = p_owner_principal_id
    and p.retailer_id = p_retailer_id
  for update;

  if v_actor_kind is null then
    raise exception 'retailer shopper principal was not found' using errcode = 'P0002';
  end if;
  if v_actor_kind <> 'shopper' then
    raise exception 'only a shopper Fit Passport can be deleted' using errcode = '42501';
  end if;

  insert into private.deletion_receipts (receipt_id)
  values (p_receipt_id);

  delete from public.principals
  where id = p_owner_principal_id
    and retailer_id = p_retailer_id;

  return p_receipt_id;
end
$$;

create function private.consume_retailer_assertion_replay(
  p_retailer_id uuid,
  p_issuer text,
  p_assertion_id text,
  p_expires_at timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted boolean;
  v_inserted_count integer;
begin
  if p_issuer is null or length(trim(p_issuer)) not between 1 and 500 then
    raise exception 'retailer assertion issuer is invalid' using errcode = '22023';
  end if;
  if p_assertion_id is null
    or p_assertion_id !~ '^[A-Za-z0-9][A-Za-z0-9._~-]{7,199}$' then
    raise exception 'retailer assertion identifier is invalid' using errcode = '22023';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'retailer assertion is already expired' using errcode = '22023';
  end if;

  delete from private.retailer_assertion_replays
  where id in (
    select replay.id
    from private.retailer_assertion_replays replay
    where replay.expires_at <= now()
    order by replay.expires_at
    limit 1000
    for update skip locked
  );

  insert into private.retailer_assertion_replays (
    retailer_id,
    issuer,
    assertion_id,
    expires_at
  ) values (
    p_retailer_id,
    trim(p_issuer),
    p_assertion_id,
    p_expires_at
  )
  on conflict (retailer_id, issuer, assertion_id) do nothing;

  get diagnostics v_inserted_count = row_count;
  v_inserted := v_inserted_count = 1;
  return v_inserted;
end
$$;

revoke all on function private.resolve_or_create_retailer_principal(uuid, text, bytea) from public;
revoke all on function private.resolve_or_create_retailer_principal(uuid, text, bytea) from anon;
revoke all on function private.resolve_or_create_retailer_principal(uuid, text, bytea) from authenticated;
revoke all on function private.create_fit_profile_snapshot(uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, jsonb) from public;
revoke all on function private.create_fit_profile_snapshot(uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, jsonb) from anon;
revoke all on function private.create_fit_profile_snapshot(uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, jsonb) from authenticated;
revoke all on function private.replace_fit_profile_snapshot(uuid, uuid, uuid, integer, text, timestamptz, text, jsonb, jsonb, jsonb) from public;
revoke all on function private.replace_fit_profile_snapshot(uuid, uuid, uuid, integer, text, timestamptz, text, jsonb, jsonb, jsonb) from anon;
revoke all on function private.replace_fit_profile_snapshot(uuid, uuid, uuid, integer, text, timestamptz, text, jsonb, jsonb, jsonb) from authenticated;
revoke all on function private.delete_retailer_fit_passport(uuid, uuid, uuid) from public;
revoke all on function private.delete_retailer_fit_passport(uuid, uuid, uuid) from anon;
revoke all on function private.delete_retailer_fit_passport(uuid, uuid, uuid) from authenticated;
revoke all on function private.consume_retailer_assertion_replay(uuid, text, text, timestamptz) from public;
revoke all on function private.consume_retailer_assertion_replay(uuid, text, text, timestamptz) from anon;
revoke all on function private.consume_retailer_assertion_replay(uuid, text, text, timestamptz) from authenticated;

grant usage on schema private to service_role;
grant execute on function private.resolve_or_create_retailer_principal(uuid, text, bytea) to service_role;
grant execute on function private.create_fit_profile_snapshot(uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function private.replace_fit_profile_snapshot(uuid, uuid, uuid, integer, text, timestamptz, text, jsonb, jsonb, jsonb) to service_role;
grant execute on function private.delete_retailer_fit_passport(uuid, uuid, uuid) to service_role;
grant execute on function private.consume_retailer_assertion_replay(uuid, text, text, timestamptz) to service_role;
