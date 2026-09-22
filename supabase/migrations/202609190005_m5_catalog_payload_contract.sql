-- Corrective M5 migration: align the service RPC with the validated camel-case payload contract.

create or replace function private.replace_retailer_catalog_snapshot(
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