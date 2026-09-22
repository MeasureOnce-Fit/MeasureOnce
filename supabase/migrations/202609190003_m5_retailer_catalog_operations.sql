-- M5 retailer catalog operations.
--
-- The browser never writes catalog records. A trusted application server
-- validates an import, fingerprints the normalized payload, and calls these
-- service-role-only functions. Fit-product mappings remain a separate
-- operator review decision rather than an import field.

create table private.retailer_catalog_imports (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  idempotency_key text not null check (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._~-]{7,119}$'
  ),
  source text not null check (length(trim(source)) between 1 and 120),
  payload_digest bytea not null check (octet_length(payload_digest) = 32),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  product_count integer not null default 0 check (product_count >= 0),
  variant_count integer not null default 0 check (variant_count >= 0),
  measurement_count integer not null default 0 check (measurement_count >= 0),
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (id, retailer_id),
  unique (retailer_id, idempotency_key),
  check (
    (status = 'pending' and completed_at is null and failure_reason is null)
    or (status = 'accepted' and completed_at is not null and failure_reason is null)
    or (status = 'rejected' and completed_at is not null and failure_reason is not null)
  )
);

create table private.retailer_catalog_products (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null references public.retailers(id) on delete cascade,
  import_id uuid not null,
  external_product_id text not null check (length(trim(external_product_id)) between 2 and 120),
  name text not null check (length(trim(name)) between 1 and 240),
  category text not null check (length(trim(category)) between 1 and 80),
  coverage_status text not null default 'review' check (coverage_status in ('review', 'ready', 'unavailable')),
  fit_product_reference text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (import_id, retailer_id)
    references private.retailer_catalog_imports(id, retailer_id) on delete restrict,
  unique (id, retailer_id),
  unique (retailer_id, external_product_id),
  check (
    (coverage_status = 'ready' and fit_product_reference is not null and reviewed_at is not null)
    or (coverage_status <> 'ready' and fit_product_reference is null)
  )
);

create table private.retailer_catalog_variants (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  product_id uuid not null,
  external_variant_id text not null check (length(trim(external_variant_id)) between 2 and 120),
  size_label text not null check (length(trim(size_label)) between 1 and 40),
  available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (product_id, retailer_id)
    references private.retailer_catalog_products(id, retailer_id) on delete cascade,
  unique (id, retailer_id),
  unique (retailer_id, external_variant_id),
  unique (product_id, size_label)
);

create table private.retailer_catalog_measurements (
  id uuid primary key default extensions.gen_random_uuid(),
  retailer_id uuid not null,
  variant_id uuid not null,
  region text not null check (region ~ '^[a-z][a-z0-9_]{1,59}$'),
  measurement_kind text not null check (
    measurement_kind in ('garment_circumference', 'garment_flat_width', 'garment_length')
  ),
  value_cm numeric(8, 2) not null check (value_cm > 0 and value_cm <= 500),
  method_id text not null check (length(trim(method_id)) between 3 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (variant_id, retailer_id)
    references private.retailer_catalog_variants(id, retailer_id) on delete cascade,
  unique (variant_id, region, measurement_kind)
);

create index retailer_catalog_imports_retailer_created_idx
  on private.retailer_catalog_imports (retailer_id, created_at desc, id desc);
create index retailer_catalog_products_retailer_coverage_idx
  on private.retailer_catalog_products (retailer_id, coverage_status, external_product_id);
create index retailer_catalog_variants_product_idx
  on private.retailer_catalog_variants (retailer_id, product_id);

alter table private.retailer_catalog_imports enable row level security;
alter table private.retailer_catalog_products enable row level security;
alter table private.retailer_catalog_variants enable row level security;
alter table private.retailer_catalog_measurements enable row level security;

revoke all on table private.retailer_catalog_imports from public;
revoke all on table private.retailer_catalog_products from public;
revoke all on table private.retailer_catalog_variants from public;
revoke all on table private.retailer_catalog_measurements from public;
revoke all on table private.retailer_catalog_imports from anon;
revoke all on table private.retailer_catalog_products from anon;
revoke all on table private.retailer_catalog_variants from anon;
revoke all on table private.retailer_catalog_measurements from anon;
revoke all on table private.retailer_catalog_imports from authenticated;
revoke all on table private.retailer_catalog_products from authenticated;
revoke all on table private.retailer_catalog_variants from authenticated;
revoke all on table private.retailer_catalog_measurements from authenticated;

create function private.start_retailer_catalog_import(
  p_retailer_id uuid,
  p_idempotency_key text,
  p_source text,
  p_payload_digest bytea
)
returns table (catalog_import_id uuid, already_applied boolean, import_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing private.retailer_catalog_imports%rowtype;
  v_created_id uuid;
begin
  if p_idempotency_key is null or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._~-]{7,119}$' then
    raise exception 'catalog import idempotency key is invalid' using errcode = '22023';
  end if;
  if p_source is null or length(trim(p_source)) not between 1 and 120 then
    raise exception 'catalog import source is invalid' using errcode = '22023';
  end if;
  if p_payload_digest is null or octet_length(p_payload_digest) <> 32 then
    raise exception 'catalog import digest must be 32 bytes' using errcode = '22023';
  end if;

  select * into v_existing
  from private.retailer_catalog_imports
  where retailer_id = p_retailer_id and idempotency_key = p_idempotency_key
  for update;

  if found then
    if v_existing.payload_digest <> p_payload_digest then
      raise exception 'catalog import idempotency key was reused with different content' using errcode = '23505';
    end if;
    return query select v_existing.id, true, v_existing.status;
    return;
  end if;

  insert into private.retailer_catalog_imports (
    retailer_id, idempotency_key, source, payload_digest
  ) values (
    p_retailer_id, p_idempotency_key, trim(p_source), p_payload_digest
  ) returning id into v_created_id;

  return query select v_created_id, false, 'pending'::text;
end
$$;

create function private.replace_retailer_catalog_snapshot(
  p_retailer_id uuid,
  p_catalog_import_id uuid,
  p_products jsonb,
  p_variants jsonb,
  p_measurements jsonb
)
returns table (product_count integer, variant_count integer, measurement_count integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_product_count integer;
  v_variant_count integer;
  v_measurement_count integer;
begin
  if jsonb_typeof(p_products) <> 'array'
    or jsonb_typeof(p_variants) <> 'array'
    or jsonb_typeof(p_measurements) <> 'array'
    or jsonb_array_length(p_products) = 0
    or jsonb_array_length(p_variants) = 0
    or jsonb_array_length(p_measurements) = 0 then
    raise exception 'catalog snapshot collections must be non-empty JSON arrays' using errcode = '22023';
  end if;

  select status into v_status
  from private.retailer_catalog_imports
  where id = p_catalog_import_id and retailer_id = p_retailer_id
  for update;
  if v_status is null then
    raise exception 'catalog import was not found' using errcode = 'P0002';
  end if;
  if v_status <> 'pending' then
    raise exception 'catalog import has already been completed' using errcode = '40001';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_variants) as v(
      "externalVariantId" text, "externalProductId" text, "sizeLabel" text, available boolean
    )
    left join jsonb_to_recordset(p_products) as p(
      "externalProductId" text, name text, category text
    ) on p."externalProductId" = v."externalProductId"
    where p."externalProductId" is null
  ) then
    raise exception 'catalog variant refers to an unknown product' using errcode = '22023';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_measurements) as m(
      "externalVariantId" text, region text, kind text, "valueCm" numeric, "methodId" text
    )
    left join jsonb_to_recordset(p_variants) as v(
      "externalVariantId" text, "externalProductId" text, "sizeLabel" text, available boolean
    ) on v."externalVariantId" = m."externalVariantId"
    where v."externalVariantId" is null
  ) then
    raise exception 'catalog measurement refers to an unknown variant' using errcode = '22023';
  end if;

  delete from private.retailer_catalog_products where retailer_id = p_retailer_id;

  insert into private.retailer_catalog_products (
    retailer_id, import_id, external_product_id, name, category
  )
  select p_retailer_id, p_catalog_import_id, p."externalProductId", p.name, p.category
  from jsonb_to_recordset(p_products) as p(
    "externalProductId" text, name text, category text
  );
  get diagnostics v_product_count = row_count;

  insert into private.retailer_catalog_variants (
    retailer_id, product_id, external_variant_id, size_label, available
  )
  select p_retailer_id, cp.id, v."externalVariantId", v."sizeLabel", v.available
  from jsonb_to_recordset(p_variants) as v(
    "externalVariantId" text, "externalProductId" text, "sizeLabel" text, available boolean
  )
  join private.retailer_catalog_products cp
    on cp.retailer_id = p_retailer_id and cp.external_product_id = v."externalProductId";
  get diagnostics v_variant_count = row_count;

  insert into private.retailer_catalog_measurements (
    retailer_id, variant_id, region, measurement_kind, value_cm, method_id
  )
  select p_retailer_id, cv.id, m.region, m.kind, m."valueCm", m."methodId"
  from jsonb_to_recordset(p_measurements) as m(
    "externalVariantId" text, region text, kind text, "valueCm" numeric, "methodId" text
  )
  join private.retailer_catalog_variants cv
    on cv.retailer_id = p_retailer_id and cv.external_variant_id = m."externalVariantId";
  get diagnostics v_measurement_count = row_count;

  update private.retailer_catalog_imports
  set status = 'accepted',
      product_count = v_product_count,
      variant_count = v_variant_count,
      measurement_count = v_measurement_count,
      completed_at = now()
  where id = p_catalog_import_id and retailer_id = p_retailer_id;

  return query select v_product_count, v_variant_count, v_measurement_count;
end
$$;

create function private.review_retailer_catalog_product(
  p_retailer_id uuid,
  p_external_product_id text,
  p_coverage_status text,
  p_fit_product_reference text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_coverage_status not in ('review', 'ready', 'unavailable') then
    raise exception 'catalog coverage status is invalid' using errcode = '22023';
  end if;
  if (p_coverage_status = 'ready') <> (p_fit_product_reference is not null and length(trim(p_fit_product_reference)) > 0) then
    raise exception 'ready catalog products require exactly one reviewed fit-product reference' using errcode = '22023';
  end if;

  update private.retailer_catalog_products
  set coverage_status = p_coverage_status,
      fit_product_reference = case when p_coverage_status = 'ready' then trim(p_fit_product_reference) else null end,
      reviewed_at = now(),
      updated_at = now()
  where retailer_id = p_retailer_id and external_product_id = p_external_product_id;
  if not found then
    raise exception 'catalog product was not found' using errcode = 'P0002';
  end if;
end
$$;

create function private.touch_catalog_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger retailer_catalog_products_touch_updated_at
before update on private.retailer_catalog_products
for each row execute function private.touch_catalog_updated_at();
create trigger retailer_catalog_variants_touch_updated_at
before update on private.retailer_catalog_variants
for each row execute function private.touch_catalog_updated_at();
create trigger retailer_catalog_measurements_touch_updated_at
before update on private.retailer_catalog_measurements
for each row execute function private.touch_catalog_updated_at();

revoke all on function private.start_retailer_catalog_import(uuid, text, text, bytea) from public;
revoke all on function private.start_retailer_catalog_import(uuid, text, text, bytea) from anon;
revoke all on function private.start_retailer_catalog_import(uuid, text, text, bytea) from authenticated;
grant execute on function private.start_retailer_catalog_import(uuid, text, text, bytea) to service_role;
revoke all on function private.replace_retailer_catalog_snapshot(uuid, uuid, jsonb, jsonb, jsonb) from public;
revoke all on function private.replace_retailer_catalog_snapshot(uuid, uuid, jsonb, jsonb, jsonb) from anon;
revoke all on function private.replace_retailer_catalog_snapshot(uuid, uuid, jsonb, jsonb, jsonb) from authenticated;
grant execute on function private.replace_retailer_catalog_snapshot(uuid, uuid, jsonb, jsonb, jsonb) to service_role;
revoke all on function private.review_retailer_catalog_product(uuid, text, text, text) from public;
revoke all on function private.review_retailer_catalog_product(uuid, text, text, text) from anon;
revoke all on function private.review_retailer_catalog_product(uuid, text, text, text) from authenticated;
grant execute on function private.review_retailer_catalog_product(uuid, text, text, text) to service_role;
revoke all on function private.touch_catalog_updated_at() from public;
revoke all on function private.touch_catalog_updated_at() from anon;
revoke all on function private.touch_catalog_updated_at() from authenticated;
