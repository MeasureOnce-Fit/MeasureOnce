-- Corrective M5 migration: report the retained import state so safe retries can resume a pending snapshot.

-- PostgreSQL considers OUT columns part of a function's return type. The earlier
-- deployed function returned only two fields, so it must be replaced as a whole
-- before the third state field can be added. No dependent database object calls
-- this service-role RPC.
drop function private.start_retailer_catalog_import(uuid, text, text, bytea);

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

revoke all on function private.start_retailer_catalog_import(uuid, text, text, bytea) from public;
revoke all on function private.start_retailer_catalog_import(uuid, text, text, bytea) from anon;
revoke all on function private.start_retailer_catalog_import(uuid, text, text, bytea) from authenticated;
grant execute on function private.start_retailer_catalog_import(uuid, text, text, bytea) to service_role;
