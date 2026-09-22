-- Preserve exact-garment anchors while adding two explicitly weaker/stronger
-- evidence records. This migration is schema-only; it is not applied to a
-- hosted Supabase project by local verification.
begin;

alter table public.fit_anchors
  add column if not exists evidence_kind text,
  add column if not exists reference_id text,
  add column if not exists reference_version text,
  add column if not exists brand_name text;

update public.fit_anchors
set evidence_kind = 'exact_garment'
where evidence_kind is null;

alter table public.fit_anchors
  alter column brand_id drop not null,
  alter column garment_id drop not null,
  alter column evidence_kind set not null,
  add constraint fit_anchors_evidence_kind_check
    check (evidence_kind in ('exact_garment', 'category_size_reference', 'remembered_size_context')),
  add constraint fit_anchors_reference_id_check
    check (reference_id is null or length(trim(reference_id)) between 1 and 100),
  add constraint fit_anchors_reference_version_check
    check (reference_version is null or length(trim(reference_version)) between 1 and 100),
  add constraint fit_anchors_brand_name_check
    check (brand_name is null or length(trim(brand_name)) between 1 and 100),
  add constraint fit_anchors_evidence_fields_check
    check (
      (
        evidence_kind = 'exact_garment'
        and brand_id is not null
        and garment_id is not null
        and reference_id is null
        and reference_version is null
        and brand_name is null
      )
      or (
        evidence_kind = 'category_size_reference'
        and brand_id is null
        and garment_id is null
        and reference_id is not null
        and reference_version is not null
        and brand_name is not null
      )
      or (
        evidence_kind = 'remembered_size_context'
        and brand_id is null
        and garment_id is null
        and reference_id is null
        and reference_version is null
        and brand_name is not null
      )
    );

create or replace function private.create_fit_profile_snapshot(
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
    evidence_kind,
    brand_id,
    garment_id,
    reference_id,
    reference_version,
    brand_name,
    category,
    size_label,
    observations
  )
  select
    p_retailer_id,
    v_profile_id,
    coalesce(item.evidence_kind, 'exact_garment'),
    item.brand_id,
    item.garment_id,
    item.reference_id,
    item.reference_version,
    item.brand_name,
    item.category,
    item.size_label,
    coalesce(item.observations, '{}'::jsonb)
  from jsonb_to_recordset(p_anchors) as item(
    evidence_kind text,
    brand_id text,
    garment_id text,
    reference_id text,
    reference_version text,
    brand_name text,
    category text,
    size_label text,
    observations jsonb
  );

  return query select v_profile_id, v_version;
end
$$;

create or replace function private.replace_fit_profile_snapshot(
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
    evidence_kind,
    brand_id,
    garment_id,
    reference_id,
    reference_version,
    brand_name,
    category,
    size_label,
    observations
  )
  select
    p_retailer_id,
    p_profile_id,
    coalesce(item.evidence_kind, 'exact_garment'),
    item.brand_id,
    item.garment_id,
    item.reference_id,
    item.reference_version,
    item.brand_name,
    item.category,
    item.size_label,
    coalesce(item.observations, '{}'::jsonb)
  from jsonb_to_recordset(p_anchors) as item(
    evidence_kind text,
    brand_id text,
    garment_id text,
    reference_id text,
    reference_version text,
    brand_name text,
    category text,
    size_label text,
    observations jsonb
  );

  return query select p_profile_id, v_next_version;
end
$$;

commit;

-- ROLLBACK (manual, only after evidence audit):
-- Do not drop the evidence columns or coerce rows while any non-exact
-- category_size_reference or remembered_size_context anchors remain.
-- After proving none remain, drop fit_anchors_evidence_fields_check,
-- fit_anchors_brand_name_check, fit_anchors_reference_version_check,
-- fit_anchors_reference_id_check, fit_anchors_evidence_kind_check, then
-- restore the preceding snapshot functions and only then drop the columns.
