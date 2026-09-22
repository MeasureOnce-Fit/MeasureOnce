-- Store the catalog collection a Fit Passport profile shops from. This is a
-- catalog-routing preference, not gender identity. Existing profiles retain
-- all evidence and default to both collections.
begin;

alter table public.fit_profiles
  add column if not exists catalog_collection text;

update public.fit_profiles
set catalog_collection = 'both'
where catalog_collection is null;

alter table public.fit_profiles
  alter column catalog_collection set not null,
  alter column catalog_collection set default 'both',
  add constraint fit_profiles_catalog_collection_check
    check (catalog_collection in ('women', 'men', 'both'));

-- Keep the existing snapshot function signatures available for an in-flight
-- deployment while adding collection-aware overloads. Suppress the otherwise
-- redundant version bump when the wrapper persists the new column.
create or replace function private.bump_fit_profile_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('measureonce.skip_profile_version', true) = 'on' then
    new.updated_at := now();
    return new;
  end if;
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
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
  p_anchors jsonb,
  p_catalog_collection text
)
returns table (created_profile_id uuid, new_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_version integer;
begin
  if p_catalog_collection not in ('women', 'men', 'both') then
    raise exception 'invalid catalog collection' using errcode = '22023';
  end if;

  select snapshot.created_profile_id, snapshot.new_version
    into v_profile_id, v_version
  from private.create_fit_profile_snapshot(
    p_retailer_id, p_owner_principal_id, p_profile_kind, p_nickname,
    p_permission_confirmed_at, p_status, p_measurements, p_preferences, p_anchors
  ) as snapshot;

  perform set_config('measureonce.skip_profile_version', 'on', true);
  update public.fit_profiles
  set catalog_collection = p_catalog_collection
  where id = v_profile_id
    and retailer_id = p_retailer_id
    and owner_principal_id = p_owner_principal_id;

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
  p_anchors jsonb,
  p_catalog_collection text
)
returns table (replaced_profile_id uuid, new_version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
  v_version integer;
begin
  if p_catalog_collection not in ('women', 'men', 'both') then
    raise exception 'invalid catalog collection' using errcode = '22023';
  end if;

  select snapshot.replaced_profile_id, snapshot.new_version
    into v_profile_id, v_version
  from private.replace_fit_profile_snapshot(
    p_retailer_id, p_owner_principal_id, p_profile_id, p_expected_version,
    p_nickname, p_permission_confirmed_at, p_status, p_measurements,
    p_preferences, p_anchors
  ) as snapshot;

  perform set_config('measureonce.skip_profile_version', 'on', true);
  update public.fit_profiles
  set catalog_collection = p_catalog_collection
  where id = v_profile_id
    and retailer_id = p_retailer_id
    and owner_principal_id = p_owner_principal_id;

  return query select v_profile_id, v_version;
end
$$;

revoke all on function private.create_fit_profile_snapshot(
  uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, jsonb, text
) from public;
revoke all on function private.replace_fit_profile_snapshot(
  uuid, uuid, uuid, integer, text, timestamptz, text, jsonb, jsonb, jsonb, text
) from public;

grant execute on function private.create_fit_profile_snapshot(
  uuid, uuid, text, text, timestamptz, text, jsonb, jsonb, jsonb, text
) to service_role;
grant execute on function private.replace_fit_profile_snapshot(
  uuid, uuid, uuid, integer, text, timestamptz, text, jsonb, jsonb, jsonb, text
) to service_role;

-- Supabase's REST API caches table columns and RPC signatures. Refresh it in
-- the same deployment so profile reads and the collection-aware RPCs are
-- immediately available to the application.
notify pgrst, 'reload schema';

commit;
