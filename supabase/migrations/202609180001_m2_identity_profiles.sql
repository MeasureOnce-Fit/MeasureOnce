create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.retailers (
  id uuid primary key default extensions.gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  display_name text not null check (length(trim(display_name)) between 1 and 120),
  tenant_kind text not null check (tenant_kind in ('showcase', 'partner')),
  public_signup boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.principals (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  actor_kind text not null default 'shopper' check (actor_kind in ('shopper', 'operator')),
  external_subject text,
  created_at timestamptz not null default now(),
  unique (id, retailer_id),
  unique (retailer_id, auth_user_id)
);

create unique index principals_retailer_external_subject_unique
  on public.principals (retailer_id, external_subject)
  where external_subject is not null;

create table public.retailer_memberships (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  principal_id uuid not null,
  role text not null check (role in ('retailer_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  foreign key (principal_id, retailer_id)
    references public.principals(id, retailer_id) on delete cascade,
  unique (principal_id, retailer_id)
);

create table public.fit_profiles (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  owner_principal_id uuid not null,
  profile_kind text not null check (profile_kind in ('self', 'additional_member')),
  nickname text not null check (length(trim(nickname)) between 1 and 40),
  permission_confirmed_at timestamptz,
  status text not null default 'active' check (status in ('active', 'archived')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (owner_principal_id, retailer_id)
    references public.principals(id, retailer_id) on delete cascade,
  unique (id, retailer_id),
  check (
    (profile_kind = 'self' and permission_confirmed_at is null)
    or (profile_kind = 'additional_member' and permission_confirmed_at is not null)
  )
);

create unique index fit_profiles_one_self_per_owner
  on public.fit_profiles (owner_principal_id, retailer_id)
  where profile_kind = 'self';

create table public.profile_measurements (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  profile_id uuid not null,
  region text not null check (length(trim(region)) between 1 and 60),
  original_value numeric(8, 2) not null check (original_value > 0),
  original_unit text not null check (original_unit in ('in', 'cm')),
  normalized_cm numeric(8, 2) not null check (normalized_cm > 0),
  method text not null check (method in ('body_measurement', 'known_garment')),
  source text not null check (length(trim(source)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, retailer_id)
    references public.fit_profiles(id, retailer_id) on delete cascade,
  unique (profile_id, region)
);

create table public.profile_preferences (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  profile_id uuid not null,
  category text not null check (length(trim(category)) between 1 and 80),
  region text not null check (length(trim(region)) between 1 and 60),
  preference text not null check (preference in ('closer', 'regular', 'relaxed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, retailer_id)
    references public.fit_profiles(id, retailer_id) on delete cascade,
  unique (profile_id, category, region)
);

create table public.fit_anchors (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  profile_id uuid not null,
  brand_id text not null check (length(trim(brand_id)) between 1 and 80),
  garment_id text not null check (length(trim(garment_id)) between 1 and 120),
  category text not null check (length(trim(category)) between 1 and 80),
  size_label text not null check (length(trim(size_label)) between 1 and 40),
  observations jsonb not null default '{}'::jsonb check (jsonb_typeof(observations) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (profile_id, retailer_id)
    references public.fit_profiles(id, retailer_id) on delete cascade,
  unique (profile_id, brand_id, garment_id, size_label)
);

create table public.consent_events (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  owner_principal_id uuid not null,
  profile_id uuid,
  purpose text not null check (purpose in ('fit_profile_storage')),
  action text not null check (action in ('granted', 'withdrawn')),
  policy_version text not null check (length(trim(policy_version)) between 1 and 40),
  occurred_at timestamptz not null default now(),
  foreign key (owner_principal_id, retailer_id)
    references public.principals(id, retailer_id) on delete cascade,
  foreign key (profile_id, retailer_id)
    references public.fit_profiles(id, retailer_id) on delete cascade
);

create index consent_events_latest_idx
  on public.consent_events (owner_principal_id, retailer_id, purpose, occurred_at desc, id desc);

create table public.export_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  owner_principal_id uuid not null,
  idempotency_key text not null check (length(trim(idempotency_key)) between 8 and 120),
  format text not null default 'json' check (format = 'json'),
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (owner_principal_id, retailer_id)
    references public.principals(id, retailer_id) on delete cascade,
  unique (owner_principal_id, retailer_id, idempotency_key)
);

create table public.deletion_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  owner_principal_id uuid not null,
  idempotency_key text not null check (length(trim(idempotency_key)) between 8 and 120),
  target_kind text not null check (target_kind in ('profile', 'account')),
  target_profile_id uuid,
  target_profile_retailer_id uuid,
  status text not null default 'requested' check (status in ('requested', 'processing', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  foreign key (owner_principal_id, retailer_id)
    references public.principals(id, retailer_id) on delete cascade,
  foreign key (target_profile_id, target_profile_retailer_id)
    references public.fit_profiles(id, retailer_id) on delete set null,
  unique (owner_principal_id, retailer_id, idempotency_key),
  check (
    (target_kind = 'account' and target_profile_id is null and target_profile_retailer_id is null)
    or (
      target_kind = 'profile'
      and (
        (target_profile_id is not null and target_profile_retailer_id = retailer_id)
        or (target_profile_id is null and target_profile_retailer_id is null and status = 'completed')
      )
    )
  )
);

create function private.current_principal_id(p_retailer_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.principals p
  where (select auth.uid()) is not null
    and p.auth_user_id = (select auth.uid())
    and p.retailer_id = p_retailer_id
  limit 1
$$;

create function private.owns_profile(p_profile_id uuid, p_retailer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.fit_profiles fp
    where fp.id = p_profile_id
      and fp.retailer_id = p_retailer_id
      and fp.owner_principal_id = private.current_principal_id(p_retailer_id)
  )
$$;

create function private.has_active_fit_consent(p_owner_principal_id uuid, p_retailer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and p_owner_principal_id = private.current_principal_id(p_retailer_id)
    and coalesce((
      select ce.action = 'granted'
      from public.consent_events ce
      where ce.owner_principal_id = p_owner_principal_id
        and ce.retailer_id = p_retailer_id
        and ce.purpose = 'fit_profile_storage'
      order by ce.occurred_at desc, ce.id desc
      limit 1
    ), false)
$$;

create function private.is_active_operator(p_retailer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1
    from public.retailer_memberships rm
    join public.principals p
      on p.id = rm.principal_id and p.retailer_id = rm.retailer_id
    where rm.retailer_id = p_retailer_id
      and rm.active
      and rm.role = 'retailer_admin'
      and p.auth_user_id = (select auth.uid())
      and p.actor_kind = 'operator'
  )
$$;

create function private.bump_fit_profile_version()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.version := old.version + 1;
  new.updated_at := now();
  return new;
end
$$;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

revoke all on function private.current_principal_id(uuid) from public;
revoke all on function private.owns_profile(uuid, uuid) from public;
revoke all on function private.has_active_fit_consent(uuid, uuid) from public;
revoke all on function private.is_active_operator(uuid) from public;
revoke all on function private.bump_fit_profile_version() from public;
revoke all on function private.touch_updated_at() from public;
grant execute on function private.current_principal_id(uuid) to authenticated;
grant execute on function private.owns_profile(uuid, uuid) to authenticated;
grant execute on function private.has_active_fit_consent(uuid, uuid) to authenticated;
grant execute on function private.is_active_operator(uuid) to authenticated;

create trigger fit_profiles_bump_version
before update on public.fit_profiles
for each row execute function private.bump_fit_profile_version();

create trigger profile_measurements_touch_updated_at
before update on public.profile_measurements
for each row execute function private.touch_updated_at();

create trigger profile_preferences_touch_updated_at
before update on public.profile_preferences
for each row execute function private.touch_updated_at();

create trigger fit_anchors_touch_updated_at
before update on public.fit_anchors
for each row execute function private.touch_updated_at();

alter table public.retailers enable row level security;
alter table public.principals enable row level security;
alter table public.retailer_memberships enable row level security;
alter table public.fit_profiles enable row level security;
alter table public.profile_measurements enable row level security;
alter table public.profile_preferences enable row level security;
alter table public.fit_anchors enable row level security;
alter table public.consent_events enable row level security;
alter table public.export_requests enable row level security;
alter table public.deletion_requests enable row level security;

revoke all on table public.retailers from public;
revoke all on table public.principals from public;
revoke all on table public.retailer_memberships from public;
revoke all on table public.fit_profiles from public;
revoke all on table public.profile_measurements from public;
revoke all on table public.profile_preferences from public;
revoke all on table public.fit_anchors from public;
revoke all on table public.consent_events from public;
revoke all on table public.export_requests from public;
revoke all on table public.deletion_requests from public;

revoke all on table public.retailers from anon;
revoke all on table public.principals from anon;
revoke all on table public.retailer_memberships from anon;
revoke all on table public.fit_profiles from anon;
revoke all on table public.profile_measurements from anon;
revoke all on table public.profile_preferences from anon;
revoke all on table public.fit_anchors from anon;
revoke all on table public.consent_events from anon;
revoke all on table public.export_requests from anon;
revoke all on table public.deletion_requests from anon;

revoke all on table public.retailers from authenticated;
revoke all on table public.principals from authenticated;
revoke all on table public.retailer_memberships from authenticated;
revoke all on table public.fit_profiles from authenticated;
revoke all on table public.profile_measurements from authenticated;
revoke all on table public.profile_preferences from authenticated;
revoke all on table public.fit_anchors from authenticated;
revoke all on table public.consent_events from authenticated;
revoke all on table public.export_requests from authenticated;
revoke all on table public.deletion_requests from authenticated;

grant select on table public.retailers to authenticated;
grant select on table public.principals to authenticated;
grant insert (retailer_id, auth_user_id, actor_kind, external_subject)
  on table public.principals to authenticated;
grant select on table public.retailer_memberships to authenticated;
grant select, delete on table public.fit_profiles to authenticated;
grant insert (retailer_id, owner_principal_id, profile_kind, nickname, permission_confirmed_at, status)
  on table public.fit_profiles to authenticated;
grant update (nickname, permission_confirmed_at, status) on table public.fit_profiles to authenticated;
grant select, delete on table public.profile_measurements to authenticated;
grant insert (retailer_id, profile_id, region, original_value, original_unit, normalized_cm, method, source)
  on table public.profile_measurements to authenticated;
grant update (region, original_value, original_unit, normalized_cm, method, source)
  on table public.profile_measurements to authenticated;
grant select, delete on table public.profile_preferences to authenticated;
grant insert (retailer_id, profile_id, category, region, preference)
  on table public.profile_preferences to authenticated;
grant update (category, region, preference) on table public.profile_preferences to authenticated;
grant select, delete on table public.fit_anchors to authenticated;
grant insert (retailer_id, profile_id, brand_id, garment_id, category, size_label, observations)
  on table public.fit_anchors to authenticated;
grant update (brand_id, garment_id, category, size_label, observations)
  on table public.fit_anchors to authenticated;
grant select on table public.consent_events to authenticated;
grant insert (retailer_id, owner_principal_id, profile_id, purpose, action, policy_version)
  on table public.consent_events to authenticated;
grant select on table public.export_requests to authenticated;
grant insert (retailer_id, owner_principal_id, idempotency_key, format)
  on table public.export_requests to authenticated;
grant select on table public.deletion_requests to authenticated;
grant insert (
  retailer_id,
  owner_principal_id,
  idempotency_key,
  target_kind,
  target_profile_id,
  target_profile_retailer_id
) on table public.deletion_requests to authenticated;

create policy retailers_select_member
on public.retailers for select to authenticated
using (
  (select auth.uid()) is not null
  and (public_signup or private.current_principal_id(id) is not null)
);

create policy principals_select_self
on public.principals for select to authenticated
using (
  (select auth.uid()) is not null
  and auth_user_id = (select auth.uid())
);

create policy principals_insert_showcase_shopper
on public.principals for insert to authenticated
with check (
  (select auth.uid()) is not null
  and auth_user_id = (select auth.uid())
  and actor_kind = 'shopper'
  and exists (
    select 1 from public.retailers r
    where r.id = retailer_id and r.tenant_kind = 'showcase' and r.public_signup
  )
);

create policy retailer_memberships_select_self
on public.retailer_memberships for select to authenticated
using (
  (select auth.uid()) is not null
  and principal_id = private.current_principal_id(retailer_id)
);

create policy fit_profiles_select_owner
on public.fit_profiles for select to authenticated
using (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
);

create policy fit_profiles_insert_owner_with_consent
on public.fit_profiles for insert to authenticated
with check (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
  and private.has_active_fit_consent(owner_principal_id, retailer_id)
);

create policy fit_profiles_update_owner_with_consent
on public.fit_profiles for update to authenticated
using (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
)
with check (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
  and private.has_active_fit_consent(owner_principal_id, retailer_id)
);

create policy fit_profiles_delete_owner
on public.fit_profiles for delete to authenticated
using (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
);

create policy profile_measurements_select_owner
on public.profile_measurements for select to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id));
create policy profile_measurements_insert_owner_with_consent
on public.profile_measurements for insert to authenticated
with check (
  (select auth.uid()) is not null
  and private.owns_profile(profile_id, retailer_id)
  and private.has_active_fit_consent(private.current_principal_id(retailer_id), retailer_id)
);
create policy profile_measurements_update_owner_with_consent
on public.profile_measurements for update to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id))
with check (
  (select auth.uid()) is not null
  and private.owns_profile(profile_id, retailer_id)
  and private.has_active_fit_consent(private.current_principal_id(retailer_id), retailer_id)
);
create policy profile_measurements_delete_owner
on public.profile_measurements for delete to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id));

create policy profile_preferences_select_owner
on public.profile_preferences for select to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id));
create policy profile_preferences_insert_owner_with_consent
on public.profile_preferences for insert to authenticated
with check (
  (select auth.uid()) is not null
  and private.owns_profile(profile_id, retailer_id)
  and private.has_active_fit_consent(private.current_principal_id(retailer_id), retailer_id)
);
create policy profile_preferences_update_owner_with_consent
on public.profile_preferences for update to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id))
with check (
  (select auth.uid()) is not null
  and private.owns_profile(profile_id, retailer_id)
  and private.has_active_fit_consent(private.current_principal_id(retailer_id), retailer_id)
);
create policy profile_preferences_delete_owner
on public.profile_preferences for delete to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id));

create policy fit_anchors_select_owner
on public.fit_anchors for select to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id));
create policy fit_anchors_insert_owner_with_consent
on public.fit_anchors for insert to authenticated
with check (
  (select auth.uid()) is not null
  and private.owns_profile(profile_id, retailer_id)
  and private.has_active_fit_consent(private.current_principal_id(retailer_id), retailer_id)
);
create policy fit_anchors_update_owner_with_consent
on public.fit_anchors for update to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id))
with check (
  (select auth.uid()) is not null
  and private.owns_profile(profile_id, retailer_id)
  and private.has_active_fit_consent(private.current_principal_id(retailer_id), retailer_id)
);
create policy fit_anchors_delete_owner
on public.fit_anchors for delete to authenticated
using ((select auth.uid()) is not null and private.owns_profile(profile_id, retailer_id));

create policy consent_events_select_owner
on public.consent_events for select to authenticated
using (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
);
create policy consent_events_insert_owner
on public.consent_events for insert to authenticated
with check (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
  and (profile_id is null or private.owns_profile(profile_id, retailer_id))
);

create policy export_requests_select_owner
on public.export_requests for select to authenticated
using (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
);
create policy export_requests_insert_owner
on public.export_requests for insert to authenticated
with check (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
  and status = 'requested'
);

create policy deletion_requests_select_owner
on public.deletion_requests for select to authenticated
using (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
);
create policy deletion_requests_insert_owner
on public.deletion_requests for insert to authenticated
with check (
  (select auth.uid()) is not null
  and owner_principal_id = private.current_principal_id(retailer_id)
  and status = 'requested'
  and (target_profile_id is null or private.owns_profile(target_profile_id, retailer_id))
);
