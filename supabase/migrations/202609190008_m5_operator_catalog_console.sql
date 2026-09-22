-- M5 operator console: expose only retailer-scoped catalog coverage summaries
-- to trusted application servers. Raw dimensions stay in private tables.

create function private.list_retailer_catalog_coverage(p_retailer_id uuid)
returns table (
  external_product_id text,
  name text,
  category text,
  coverage_status text,
  fit_product_reference text,
  variant_count integer,
  measured_variant_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.external_product_id,
    p.name,
    p.category,
    p.coverage_status,
    p.fit_product_reference,
    count(v.id)::integer as variant_count,
    count(distinct m.variant_id)::integer as measured_variant_count
  from private.retailer_catalog_products p
  left join private.retailer_catalog_variants v
    on v.retailer_id = p.retailer_id and v.product_id = p.id
  left join private.retailer_catalog_measurements m
    on m.retailer_id = v.retailer_id and m.variant_id = v.id
  where p.retailer_id = p_retailer_id
  group by p.id
  order by p.external_product_id
$$;

revoke all on function private.list_retailer_catalog_coverage(uuid) from public;
revoke all on function private.list_retailer_catalog_coverage(uuid) from anon;
revoke all on function private.list_retailer_catalog_coverage(uuid) from authenticated;
grant execute on function private.list_retailer_catalog_coverage(uuid) to service_role;
