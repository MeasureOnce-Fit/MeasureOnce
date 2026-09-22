import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "supabase", "migrations", "202609190003_m5_retailer_catalog_operations.sql");
const correctiveMigrationPath = path.join(root, "supabase", "migrations", "202609190004_m5_catalog_import_tenant_integrity.sql");
const inspectionMigrationPath = path.join(root, "supabase", "migrations", "202609190007_m5_catalog_review_inspection.sql");
const consoleMigrationPath = path.join(root, "supabase", "migrations", "202609190008_m5_operator_catalog_console.sql");
const failures = [];

const source = await readFile(migrationPath, "utf8").catch(() => {
  failures.push("M5 retailer catalog migration is missing.");
  return "";
});
const corrective = await readFile(correctiveMigrationPath, "utf8").catch(() => {
  failures.push("M5 catalog tenant-integrity migration is missing.");
  return "";
});
const inspection = await readFile(inspectionMigrationPath, "utf8").catch(() => {
  failures.push("M5 catalog inspection migration is missing.");
  return "";
});
const consoleMigration = await readFile(consoleMigrationPath, "utf8").catch(() => {
  failures.push("M5 operator-console migration is missing.");
  return "";
});

function requireMatch(pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

for (const table of ["retailer_catalog_imports", "retailer_catalog_products", "retailer_catalog_variants", "retailer_catalog_measurements"]) {
  requireMatch(new RegExp(`create\\s+table\\s+private\\.${table}\\b`, "i"), `private.${table} must be created`);
  requireMatch(new RegExp(`alter\\s+table\\s+private\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"), `private.${table} must enable RLS`);
  for (const role of ["public", "anon", "authenticated"]) {
    requireMatch(new RegExp(`revoke\\s+all\\s+on\\s+table\\s+private\\.${table}\\s+from\\s+${role}`, "i"), `private.${table} must revoke ${role}`);
  }
}

requireMatch(/unique\s*\(\s*retailer_id\s*,\s*idempotency_key\s*\)/i, "catalog imports must be retailer-scoped and idempotent");
requireMatch(/payload_digest\s+bytea\s+not\s+null[\s\S]*octet_length\s*\(\s*payload_digest\s*\)\s*=\s*32/i, "catalog imports must retain a 32-byte content fingerprint");
requireMatch(/foreign\s+key\s*\(\s*product_id\s*,\s*retailer_id\s*\)/i, "variants must use a composite product/retailer foreign key");
requireMatch(/foreign\s+key\s*\(\s*variant_id\s*,\s*retailer_id\s*\)/i, "measurements must use a composite variant/retailer foreign key");
requireMatch(/foreign\s+key\s*\(\s*import_id\s*,\s*retailer_id\s*\)/i, "products must use a composite import/retailer foreign key");
requireMatch(/coverage_status\s*=\s*'ready'[\s\S]*fit_product_reference\s+is\s+not\s+null/i, "ready catalog products must have reviewed mapping evidence");

for (const fn of ["start_retailer_catalog_import", "replace_retailer_catalog_snapshot", "review_retailer_catalog_product"]) {
  requireMatch(new RegExp(`create\\s+function\\s+private\\.${fn}\\b[\\s\\S]*?security\\s+definer`, "i"), `${fn} must be a service-side function`);
  for (const role of ["public", "anon", "authenticated"]) {
    requireMatch(new RegExp(`revoke\\s+all\\s+on\\s+function\\s+private\\.${fn}\\([^;]+?from\\s+${role}`, "i"), `${fn} must reject ${role}`);
  }
  requireMatch(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+private\\.${fn}\\([^;]+?to\\s+service_role`, "i"), `${fn} must be callable only by service_role`);
}
requireMatch(/start_retailer_catalog_import[\s\S]*?payload_digest\s*<>\s*p_payload_digest[\s\S]*?idempotency key was reused/i, "idempotency collisions must fail when content changes");
requireMatch(/replace_retailer_catalog_snapshot[\s\S]*?delete\s+from\s+private\.retailer_catalog_products[\s\S]*?insert\s+into\s+private\.retailer_catalog_products[\s\S]*?insert\s+into\s+private\.retailer_catalog_variants[\s\S]*?insert\s+into\s+private\.retailer_catalog_measurements/i, "catalog snapshots must atomically replace products, variants, and measurements");

if (/targetProductId/i.test(source)) failures.push("M5 import SQL must not accept a browser-supplied target product ID.");
if (!/add\s+constraint\s+retailer_catalog_products_import_retailer_fkey[\s\S]*foreign\s+key\s*\(\s*import_id\s*,\s*retailer_id\s*\)/i.test(corrective)) {
  failures.push("the corrective migration must add the import/retailer composite foreign key");
}
if (!/inspect_retailer_catalog_product[\s\S]*?where\s+p\.retailer_id\s*=\s*p_retailer_id[\s\S]*?and\s+p\.external_product_id\s*=\s*p_external_product_id/i.test(inspection)) {
  failures.push("M5 catalog inspection must be constrained to one retailer product");
}
if (!/revoke\s+all\s+on\s+function\s+private\.inspect_retailer_catalog_product[\s\S]*?grant\s+execute\s+on\s+function\s+private\.inspect_retailer_catalog_product[\s\S]*?to\s+service_role/i.test(inspection)) {
  failures.push("M5 catalog inspection must be service-role-only");
}
if (!/list_retailer_catalog_coverage[\s\S]*?where\s+p\.retailer_id\s*=\s*p_retailer_id/i.test(consoleMigration)) {
  failures.push("M5 operator coverage must be retailer-scoped");
}
if (!/revoke\s+all\s+on\s+function\s+private\.list_retailer_catalog_coverage[\s\S]*?grant\s+execute\s+on\s+function\s+private\.list_retailer_catalog_coverage[\s\S]*?to\s+service_role/i.test(consoleMigration)) {
  failures.push("M5 operator coverage must be service-role-only");
}
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("M5 catalog migration structure checks passed.");
}
