-- M5 verification boundary. Private catalog tables remain unreadable to direct
-- clients; trusted server jobs use this restricted RPC for a single retailer
-- product's reviewed coverage state.

create function private.inspect_retailer_catalog_product(
  p_retailer_id uuid,
  p_external_product_id text
)
returns table (
  retailer_id uuid,
  external_product_id text,
  coverage_status text,
  fit_product_reference text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.retailer_id, p.external_product_id, p.coverage_status, p.fit_product_reference
  from private.retailer_catalog_products p
  where p.retailer_id = p_retailer_id
    and p.external_product_id = p_external_product_id
$$;

revoke all on function private.inspect_retailer_catalog_product(uuid, text) from public;
revoke all on function private.inspect_retailer_catalog_product(uuid, text) from anon;
revoke all on function private.inspect_retailer_catalog_product(uuid, text) from authenticated;
grant execute on function private.inspect_retailer_catalog_product(uuid, text) to service_role;
