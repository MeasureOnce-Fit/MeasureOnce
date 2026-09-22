import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "202609180001_m2_identity_profiles.sql",
);
const hybridMigrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "202609180002_m2_retailer_hybrid_identity.sql",
);
const categorySizeReferenceMigrationPath = path.join(
  root,
  "supabase",
  "migrations",
  "202609200009_category_size_reference_context.sql",
);
const testPath = path.join(root, "supabase", "tests", "m2_identity_rls.test.sql");
const configPath = path.join(root, "supabase", "config.toml");

const failures = [];

async function requiredFile(filePath, label) {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    failures.push(`${label} is missing: ${path.relative(root, filePath)}`);
    return "";
  }
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}

const [migration, hybridMigration, categorySizeReferenceMigration, tests, config] = await Promise.all([
  requiredFile(migrationPath, "M2 migration"),
  requiredFile(hybridMigrationPath, "M2 retailer hybrid identity migration"),
  requiredFile(categorySizeReferenceMigrationPath, "category size reference context migration"),
  requiredFile(testPath, "M2 pgTAP test"),
  requiredFile(configPath, "Supabase config"),
]);

const tables = [
  "retailers",
  "principals",
  "retailer_memberships",
  "fit_profiles",
  "profile_measurements",
  "profile_preferences",
  "fit_anchors",
  "consent_events",
  "export_requests",
  "deletion_requests",
];

for (const table of tables) {
  requireMatch(
    migration,
    new RegExp(`create\\s+table\\s+public\\.${table}\\b`, "i"),
    `public.${table} must be created`,
  );
  requireMatch(
    migration,
    new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"),
    `public.${table} must enable RLS`,
  );
  requireMatch(
    migration,
    new RegExp(`revoke\\s+all\\s+on\\s+table\\s+public\\.${table}\\s+from\\s+anon`, "i"),
    `public.${table} must revoke anon privileges`,
  );
}

requireMatch(
  migration,
  /(?:auth\.uid\(\)|\(select\s+auth\.uid\(\)\))\s+is\s+not\s+null/i,
  "policies must explicitly reject a null auth.uid()",
);
requireMatch(
  migration,
  /foreign\s+key\s*\(\s*owner_principal_id\s*,\s*retailer_id\s*\)/i,
  "fit_profiles must use a composite owner/tenant foreign key",
);
requireMatch(
  migration,
  /foreign\s+key\s*\(\s*profile_id\s*,\s*retailer_id\s*\)/gi,
  "profile children must use composite profile/tenant foreign keys",
);
requireMatch(
  migration,
  /create\s+policy[\s\S]+?for\s+select/gi,
  "separate SELECT policies are required",
);
requireMatch(
  migration,
  /create\s+policy[\s\S]+?for\s+insert/gi,
  "separate INSERT policies are required",
);
requireMatch(
  migration,
  /create\s+policy[\s\S]+?for\s+update/gi,
  "separate UPDATE policies are required",
);
requireMatch(
  migration,
  /create\s+policy[\s\S]+?for\s+delete/gi,
  "separate DELETE policies are required",
);
requireMatch(
  migration,
  /revoke\s+all\s+on\s+function\s+private\.[^(]+\([^;]+from\s+public/gi,
  "private authorization helpers must revoke PUBLIC execute",
);
requireMatch(
  migration,
  /grant\s+select\s+on\s+table\s+public\.consent_events\s+to\s+authenticated/i,
  "consent_events must expose a SELECT grant",
);
requireMatch(
  migration,
  /grant\s+insert\s*\([^)]*\)\s+on\s+table\s+public\.consent_events\s+to\s+authenticated/i,
  "consent_events must expose a column-scoped INSERT grant",
);
if (/grant[^;]*(update|delete)[^;]*consent_events/i.test(migration)) {
  failures.push("consent_events must never grant UPDATE or DELETE to authenticated");
}
if (/(password|secret|service_role_key)\s*=\s*['\"][^'\"]+['\"]/i.test(`${migration}\n${hybridMigration}\n${tests}\n${config}`)) {
  failures.push("Supabase files must not contain credentials or secrets");
}

requireMatch(
  hybridMigration,
  /create\s+table\s+private\.external_identities\b/i,
  "private.external_identities must be created",
);
requireMatch(
  hybridMigration,
  /unique\s*\(\s*retailer_id\s*,\s*issuer\s*,\s*subject_digest\s*\)/i,
  "external identities must be unique by retailer, issuer, and subject digest",
);
requireMatch(
  hybridMigration,
  /subject_digest\s+bytea\s+not\s+null[\s\S]*octet_length\s*\(\s*subject_digest\s*\)\s*=\s*32/i,
  "external identities must store a 32-byte keyed digest",
);
const externalIdentityDefinition = hybridMigration.match(
  /create\s+table\s+private\.external_identities\s*\(([\s\S]*?)\);/i,
)?.[1] ?? "";
if (/\b(?:external_)?subject\s+(?:text|varchar|character\s+varying)\b/i.test(externalIdentityDefinition)) {
  failures.push("external identities must never store a raw subject");
}
requireMatch(
  hybridMigration,
  /drop\s+column\s+external_subject/i,
  "the legacy raw external_subject column must be removed",
);
requireMatch(
  hybridMigration,
  /alter\s+column\s+auth_user_id\s+drop\s+not\s+null/i,
  "retailer-authenticated shopper principals must not require auth.users",
);
requireMatch(
  hybridMigration,
  /normalized_cm[^;]+generated\s+always\s+as\s*\([\s\S]*?original_unit[\s\S]*?original_value\s*\*\s*2\.54[\s\S]*?stored/i,
  "normalized_cm must be generated from original value and unit",
);
requireMatch(
  hybridMigration,
  /drop\s+constraint\s+profile_measurements_profile_id_region_key[\s\S]*unique\s*\(\s*profile_id\s*,\s*region\s*,\s*method\s*,\s*source\s*\)/i,
  "measurement uniqueness must allow method/source-specific evidence for one region",
);
requireMatch(
  hybridMigration,
  /foreign\s+key\s*\(\s*auth_user_id\s*\)[\s\S]*?references\s+auth\.users\s*\(\s*id\s*\)\s+on\s+delete\s+set\s+null/i,
  "deleting an auth user must not cascade-delete a principal",
);
requireMatch(
  hybridMigration,
  /create\s+table\s+private\.deletion_receipts\b/i,
  "private.deletion_receipts must be created",
);
requireMatch(
  hybridMigration,
  /create\s+table\s+private\.retailer_assertion_replays\b/i,
  "private.retailer_assertion_replays must be created",
);
requireMatch(
  hybridMigration,
  /unique\s*\(\s*retailer_id\s*,\s*issuer\s*,\s*assertion_id\s*\)/i,
  "assertion replays must be unique by retailer, issuer, and assertion ID",
);
requireMatch(
  hybridMigration,
  /retailer_assertion_replays[\s\S]*expires_at\s+timestamptz\s+not\s+null/i,
  "assertion replays must retain their expiry",
);
requireMatch(
  hybridMigration,
  /create\s+index\s+retailer_assertion_replays_expiry_idx[\s\S]*expires_at/i,
  "assertion replay expiry purges must use an expiry index",
);
const deletionReceiptDefinition = hybridMigration.match(
  /create\s+table\s+private\.deletion_receipts\s*\(([\s\S]*?)\);/i,
)?.[1] ?? "";
if (/principal|retailer|subject|idempotency/i.test(deletionReceiptDefinition)) {
  failures.push("deletion receipts must not retain principal, retailer, subject, or idempotency identifiers");
}
for (const table of ["external_identities", "deletion_receipts", "retailer_assertion_replays"]) {
  requireMatch(
    hybridMigration,
    new RegExp(`alter\\s+table\\s+private\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i"),
    `private.${table} must enable RLS`,
  );
  for (const role of ["public", "anon", "authenticated"]) {
    requireMatch(
      hybridMigration,
      new RegExp(`revoke\\s+all\\s+on\\s+table\\s+private\\.${table}\\s+from\\s+${role}`, "i"),
      `private.${table} must revoke ${role} privileges`,
    );
  }
}

for (const fn of [
  "resolve_or_create_retailer_principal",
  "replace_fit_profile_snapshot",
  "delete_retailer_fit_passport",
  "consume_retailer_assertion_replay",
  "create_fit_profile_snapshot",
]) {
  requireMatch(
    hybridMigration,
    new RegExp(`create\\s+(?:or\\s+replace\\s+)?function\\s+private\\.${fn}\\b[\\s\\S]*?security\\s+definer`, "i"),
    `private.${fn} must be a SECURITY DEFINER server function`,
  );
  for (const role of ["public", "anon", "authenticated"]) {
    requireMatch(
      hybridMigration,
      new RegExp(`revoke\\s+all\\s+on\\s+function\\s+private\\.${fn}\\([^;]+?from\\s+${role}`, "i"),
      `private.${fn} must revoke execute from ${role}`,
    );
  }
  requireMatch(
    hybridMigration,
    new RegExp(`grant\\s+execute\\s+on\\s+function\\s+private\\.${fn}\\([^;]+?to\\s+service_role`, "i"),
    `private.${fn} must grant execute only to service_role`,
  );
}
requireMatch(
  hybridMigration,
  /replace_fit_profile_snapshot[\s\S]*for\s+update[\s\S]*p_expected_version[\s\S]*delete\s+from\s+public\.profile_measurements[\s\S]*delete\s+from\s+public\.profile_preferences[\s\S]*delete\s+from\s+public\.fit_anchors/i,
  "profile snapshot replacement must lock, version-check, and replace all child collections",
);
requireMatch(
  hybridMigration,
  /create_fit_profile_snapshot[\s\S]*insert\s+into\s+public\.fit_profiles[\s\S]*returning\s+id[\s\S]*insert\s+into\s+public\.profile_measurements[\s\S]*insert\s+into\s+public\.profile_preferences[\s\S]*insert\s+into\s+public\.fit_anchors/i,
  "profile snapshot creation must insert parent and all child collections in one function",
);
if (/item\.normalized_cm/i.test(hybridMigration)) {
  failures.push("snapshot functions must not accept caller-controlled normalized centimetres");
}
requireMatch(
  hybridMigration,
  /consume_retailer_assertion_replay[\s\S]*delete\s+from\s+private\.retailer_assertion_replays[\s\S]*expires_at\s*<=\s*now\s*\(\s*\)[\s\S]*insert\s+into\s+private\.retailer_assertion_replays[\s\S]*on\s+conflict[\s\S]*do\s+nothing[\s\S]*return\s+v_inserted/i,
  "assertion replay consumption must atomically purge expiry, insert once, and report replays",
);
requireMatch(
  config,
  /schemas\s*=\s*\[[^\]]*"private"[^\]]*\]/i,
  "Supabase Data API must expose private for service-role-only RPC calls",
);
requireMatch(
  config,
  /hosted\s+supabase[\s\S]*exposed\s+schemas[\s\S]*private/i,
  "Supabase config must document the hosted private-schema exposure step",
);
if (/delete\s+from\s+auth\.users/i.test(hybridMigration)) {
  failures.push("Fit Passport deletion must never delete a retailer authentication account");
}
if (/grant\s+execute[\s\S]*?to\s+(?:anon|authenticated)/i.test(hybridMigration)) {
  failures.push("retailer identity and write functions must not be executable by browser roles");
}

for (const column of ["evidence_kind", "reference_id", "reference_version", "brand_name"]) {
  requireMatch(
    categorySizeReferenceMigration,
    new RegExp(`alter\\s+table\\s+public\\.fit_anchors[\\s\\S]*?add\\s+column[\\s\\S]*?\\b${column}\\b`, "i"),
    `fit_anchors must add ${column} for evidence provenance`,
  );
}
requireMatch(
  categorySizeReferenceMigration,
  /update\s+public\.fit_anchors[\s\S]*?set\s+evidence_kind\s*=\s*'exact_garment'/i,
  "existing fit anchors must be backfilled as exact garments",
);
requireMatch(
  categorySizeReferenceMigration,
  /alter\s+column\s+evidence_kind\s+set\s+not\s+null/i,
  "fit anchor evidence kind must be required after backfill",
);
requireMatch(
  categorySizeReferenceMigration,
  /check\s*\([\s\S]*?exact_garment[\s\S]*?category_size_reference[\s\S]*?remembered_size_context/i,
  "fit anchors must constrain fields by evidence kind",
);
for (const fn of ["create_fit_profile_snapshot", "replace_fit_profile_snapshot"]) {
  requireMatch(
    categorySizeReferenceMigration,
    new RegExp(`create\\s+or\\s+replace\\s+function\\s+private\\.${fn}[\\s\\S]*?evidence_kind[\\s\\S]*?reference_id[\\s\\S]*?brand_name`, "i"),
    `${fn} must accept category-size evidence payloads`,
  );
}
requireMatch(
  categorySizeReferenceMigration,
  /rollback[\s\S]*?do not drop.*non-exact/i,
  "migration must document a non-destructive rollback gate",
);

for (const marker of [
  "anon cannot read private data",
  "shopper cannot read another shopper profile",
  "tenant collision stays isolated",
  "operator cannot read shopper fit profiles",
  "consent events are append-only",
  "external identity mapping is retailer scoped",
  "retailer shopper principal has no auth user",
  "raw external subject is removed",
  "atomic profile replacement commits",
  "stale profile version is rejected",
  "failed replacement rolls back",
  "deletion receipt survives principal cascade",
  "retailer auth user survives fit passport deletion",
  "server functions are hidden from browser roles",
  "first assertion consumption succeeds",
  "replayed assertion is rejected atomically",
  "replay keys stay retailer and issuer scoped",
  "expired replay rows are purged",
  "expired assertion cannot be consumed",
  "browser roles cannot read assertion replays",
  "create profile snapshot commits atomically",
  "failed create profile snapshot rolls back",
  "normalized centimeters are database derived",
  "body and known garment evidence can coexist",
]) {
  if (!tests.toLowerCase().includes(marker)) {
    failures.push(`pgTAP coverage marker is missing: ${marker}`);
  }
}

if (failures.length > 0) {
  console.error(`M2 migration contract failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`M2 migration contract passed for ${tables.length + 3} RLS-protected tables.`);
  console.log("Static verification only; run `supabase test db` with Docker for policy execution.");
}
