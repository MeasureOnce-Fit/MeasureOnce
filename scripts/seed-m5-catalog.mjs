import { createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const RETAILERS = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    key: "northstar",
    payload: {
      source: "measureonce-synthetic-northstar-v1",
      products: [{ externalProductId: "northstar-lumen-jacket", name: "Lumen Field Jacket", category: "Outerwear" }],
      variants: [
        { externalVariantId: "northstar-lumen-eu34", externalProductId: "northstar-lumen-jacket", sizeLabel: "EU 34", available: true },
        { externalVariantId: "northstar-lumen-eu36", externalProductId: "northstar-lumen-jacket", sizeLabel: "EU 36", available: true },
      ],
      measurements: [
        { externalVariantId: "northstar-lumen-eu34", region: "chest_bust", kind: "garment_circumference", valueCm: 91.2, methodId: "synthetic-v1:circumference:chest_bust" },
        { externalVariantId: "northstar-lumen-eu36", region: "chest_bust", kind: "garment_circumference", valueCm: 96.4, methodId: "synthetic-v1:circumference:chest_bust" },
      ],
    },
    review: { externalProductId: "northstar-lumen-jacket", fitProductReference: "mo-women-002" },
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    key: "harbor",
    payload: {
      source: "measureonce-synthetic-harbor-v1",
      products: [{ externalProductId: "harbor-fold-dress", name: "Fold Taffeta Midi Dress", category: "Dresses" }],
      variants: [
        { externalVariantId: "harbor-fold-4-6", externalProductId: "harbor-fold-dress", sizeLabel: "4/6", available: true },
        { externalVariantId: "harbor-fold-8-10", externalProductId: "harbor-fold-dress", sizeLabel: "8/10", available: true },
      ],
      measurements: [
        { externalVariantId: "harbor-fold-4-6", region: "chest_bust", kind: "garment_circumference", valueCm: 86.4, methodId: "synthetic-v1:circumference:chest_bust" },
        { externalVariantId: "harbor-fold-8-10", region: "chest_bust", kind: "garment_circumference", valueCm: 94.8, methodId: "synthetic-v1:circumference:chest_bust" },
      ],
    },
    review: { externalProductId: "harbor-fold-dress", fitProductReference: "mo-women-001" },
  },
];

function fingerprint(payload) {
  const ordered = {
    schemaVersion: "1",
    source: payload.source,
    products: [...payload.products].sort((a, b) => a.externalProductId.localeCompare(b.externalProductId)),
    variants: [...payload.variants].sort((a, b) => a.externalVariantId.localeCompare(b.externalVariantId)),
    measurements: [...payload.measurements].sort((a, b) => `${a.externalVariantId}:${a.region}:${a.kind}`.localeCompare(`${b.externalVariantId}:${b.region}:${b.kind}`)),
  };
  return createHash("sha256").update(JSON.stringify(ordered)).digest("hex");
}

function environment(source = process.env) {
  if (source.NODE_ENV === "production") throw new Error("Synthetic M5 catalog seeding is blocked in production.");
  const url = source.SUPABASE_URL?.trim();
  const key = source.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) throw new Error("Live M5 catalog seeding requires SUPABASE_URL and SUPABASE_SECRET_KEY.");
  return { url, key };
}

function record(data, label) {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== "object") throw new Error(`${label} returned no usable result.`);
  return row;
}

async function seedOne(admin, retailer) {
  const digest = `\\x${fingerprint(retailer.payload)}`;
  const { data: started, error: startError } = await admin.schema("private").rpc("start_retailer_catalog_import", {
    p_retailer_id: retailer.id,
    p_idempotency_key: `m5-${retailer.key}-20260919`,
    p_source: retailer.payload.source,
    p_payload_digest: digest,
  });
  if (startError) throw new Error(`${retailer.key} import start: ${startError.message}`);
  const start = record(started, `${retailer.key} import start`);
  if (start.import_status === "rejected") throw new Error(`${retailer.key} import was previously rejected.`);
  if (start.import_status !== "accepted") {
    const { error: replaceError } = await admin.schema("private").rpc("replace_retailer_catalog_snapshot", {
      p_retailer_id: retailer.id,
      p_catalog_import_id: start.catalog_import_id,
      p_products: retailer.payload.products,
      p_variants: retailer.payload.variants,
      p_measurements: retailer.payload.measurements,
    });
    if (replaceError) throw new Error(`${retailer.key} import apply: ${replaceError.message}`);
    const { error: reviewError } = await admin.schema("private").rpc("review_retailer_catalog_product", {
      p_retailer_id: retailer.id,
      p_external_product_id: retailer.review.externalProductId,
      p_coverage_status: "ready",
      p_fit_product_reference: retailer.review.fitProductReference,
    });
    if (reviewError) throw new Error(`${retailer.key} catalog review: ${reviewError.message}`);
  }
  return { retailer: retailer.key, outcome: start.import_status === "accepted" ? "duplicate" : start.already_applied ? "resumed" : "seeded" };
}

async function verify(admin) {
  const results = [];
  for (const retailer of RETAILERS) {
    const { data, error } = await admin.schema("private").rpc("inspect_retailer_catalog_product", {
      p_retailer_id: retailer.id,
      p_external_product_id: retailer.review.externalProductId,
    });
    if (error) throw new Error(`${retailer.key} catalog read: ${error.message}`);
    const row = data?.[0];
    const expected = retailer.review;
    results.push({
      retailer: retailer.key,
      isolated: data?.length === 1 && row?.retailer_id === retailer.id && row?.external_product_id === expected.externalProductId,
      ready: row?.coverage_status === "ready" && row?.fit_product_reference === expected.fitProductReference,
    });
  }
  return { passed: results.every((result) => result.isolated && result.ready), results };
}

async function run() {
  if (!process.argv.includes("--live")) {
    console.log(JSON.stringify({ mode: "plan", retailers: RETAILERS.map(({ id, key, payload }) => ({ id, key, productCount: payload.products.length, variantCount: payload.variants.length, measurementCount: payload.measurements.length })) }, null, 2));
    return;
  }
  const config = environment();
  const admin = createClient(config.url, config.key, { auth: { autoRefreshToken: false, persistSession: false } });
  const seeded = [];
  for (const retailer of RETAILERS) seeded.push(await seedOne(admin, retailer));
  const inspection = await verify(admin);
  console.log(JSON.stringify({ mode: "live", seeded, inspection }, null, 2));
  if (!inspection.passed) process.exitCode = 1;
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
