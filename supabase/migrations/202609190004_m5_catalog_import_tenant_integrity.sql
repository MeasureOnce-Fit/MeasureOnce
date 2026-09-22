-- Corrective M5 migration for databases that received 202609190003 before
-- the import-to-retailer composite foreign key was added to the source file.

alter table private.retailer_catalog_imports
  add constraint retailer_catalog_imports_id_retailer_id_key
  unique (id, retailer_id);

alter table private.retailer_catalog_products
  drop constraint retailer_catalog_products_import_id_fkey;

alter table private.retailer_catalog_products
  add constraint retailer_catalog_products_import_retailer_fkey
  foreign key (import_id, retailer_id)
  references private.retailer_catalog_imports(id, retailer_id)
  on delete restrict;
