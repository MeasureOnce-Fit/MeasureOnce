import assert from "node:assert/strict";
import { createRequire } from "node:module";
import Module from "node:module";
import test from "node:test";

import {
  CatalogImportInputError,
  decideCatalogImport,
  type CatalogImportPayload,
  validateCatalogImport,
} from "../../src/lib/retailer-catalog/import-contract";

type AdapterModule = typeof import("../../src/lib/retailer-catalog/supabase-adapter");
type OperatorModule = typeof import("../../src/lib/retailer-catalog/operator-service");
const nodeModule = Module as unknown as { _load(request: string, parent: unknown, isMain: boolean): unknown };
const originalLoad = nodeModule._load;
nodeModule._load = function loadForServerOnlyTest(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
const { SupabaseRetailerCatalogAdapter } = createRequire(__filename)(
  "../../src/lib/retailer-catalog/supabase-adapter",
) as AdapterModule;
nodeModule._load = originalLoad;

nodeModule._load = function loadForOperatorServerOnlyTest(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
const { loadOperatorCatalog, OperatorCatalogUnauthorizedError, reviewOperatorCatalogProduct } = createRequire(__filename)(
  "../../src/lib/retailer-catalog/operator-service",
) as OperatorModule;
nodeModule._load = originalLoad;

const payload: CatalogImportPayload = {
  source: "aster-synthetic-feed",
  products: [{ externalProductId: "aster-jacket-01", name: "Lumen Field Jacket", category: "Outerwear" }],
  variants: [
    { externalVariantId: "aster-jacket-01-eu34", externalProductId: "aster-jacket-01", sizeLabel: "EU 34", available: true },
    { externalVariantId: "aster-jacket-01-eu36", externalProductId: "aster-jacket-01", sizeLabel: "EU 36", available: true },
  ],
  measurements: [
    { externalVariantId: "aster-jacket-01-eu34", region: "chest_bust", kind: "garment_circumference", valueCm: 91.2, methodId: "synthetic-v1:circumference:chest_bust" },
    { externalVariantId: "aster-jacket-01-eu36", region: "chest_bust", kind: "garment_circumference", valueCm: 96.4, methodId: "synthetic-v1:circumference:chest_bust" },
  ],
};

test("normalizes an ordered-independent import and gives it a stable fingerprint", () => {
  const first = validateCatalogImport(payload);
  const reordered = validateCatalogImport({
    ...payload,
    variants: [...payload.variants].reverse(),
    measurements: [...payload.measurements].reverse(),
  });
  assert.equal(first.fingerprint, reordered.fingerprint);
  assert.equal(first.measurements[0].valueCm, 91.2);
});

test("rejects a cross-product variant, ambiguous size label, and raw fit-product field", () => {
  assert.throws(() => validateCatalogImport({ ...payload, variants: [{ ...payload.variants[0], externalProductId: "missing-product" }] }), CatalogImportInputError);
  assert.throws(() => validateCatalogImport({ ...payload, variants: [payload.variants[0], { ...payload.variants[0], externalVariantId: "a-different-variant" }] }), CatalogImportInputError);
  assert.throws(() => validateCatalogImport({ ...payload, products: [{ ...payload.products[0], targetProductId: "mo-women-002" }] }), CatalogImportInputError);
});

test("makes a same-content retry safe and refuses idempotency-key reuse for changed data", () => {
  const created = decideCatalogImport(payload, null);
  assert.equal(created.outcome, "create");
  if (created.outcome !== "create") throw new Error("Expected an import to be created.");
  assert.deepEqual(decideCatalogImport(payload, { id: "import-1", fingerprint: created.import.fingerprint }), { outcome: "duplicate", importId: "import-1" });
  assert.deepEqual(decideCatalogImport({ ...payload, products: [{ ...payload.products[0], name: "Changed name" }] }, { id: "import-1", fingerprint: created.import.fingerprint }), { outcome: "idempotency_conflict" });
});

test("passes only normalized catalog data through the service-role import boundary", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const replies = [
    { data: [{ catalog_import_id: "3cbf7b5c-822f-4f8a-b957-b28198c24a22", already_applied: false, import_status: "pending" }], error: null },
    { data: [{ product_count: 1, variant_count: 2, measurement_count: 2 }], error: null },
  ];
  const adapter = new SupabaseRetailerCatalogAdapter({
    schema: () => ({ rpc: async (name, args) => {
      calls.push({ name, args });
      return replies.shift() ?? { data: null, error: new Error("No reply") };
    } }),
  });
  const receipt = await adapter.importSnapshot({
    retailerId: "3cbf7b5c-822f-4f8a-b957-b28198c24a22",
    idempotencyKey: "catalog-run-20260919",
    payload,
  });
  assert.deepEqual(receipt, {
    outcome: "accepted",
    importId: "3cbf7b5c-822f-4f8a-b957-b28198c24a22",
    counts: { products: 1, variants: 2, measurements: 2 },
  });
  assert.deepEqual(calls.map((call) => call.name), ["start_retailer_catalog_import", "replace_retailer_catalog_snapshot"]);
  assert.equal("targetProductId" in calls[1].args, false);
  assert.equal((calls[1].args.p_measurements as Array<{ kind: string }>)[0].kind, "garment_circumference");
});

test("derives retailer catalog reads from the active operator rather than browser input", async () => {
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const result = await loadOperatorCatalog({
    authenticatedUserId: async () => "operator-auth-id",
    resolveMembership: async () => ({ retailerId: "20000000-0000-4000-8000-000000000001", retailerName: "Northstar" }),
    call: async (name, args) => {
      calls.push({ name, args });
      return { error: null, data: [{ external_product_id: "northstar-lumen-jacket", name: "Lumen Field Jacket", category: "Outerwear", coverage_status: "ready", fit_product_reference: "mo-women-002", variant_count: 2, measured_variant_count: 2 }] };
    },
  });
  assert.equal(result.context.retailerName, "Northstar");
  assert.equal(result.products[0].externalProductId, "northstar-lumen-jacket");
  assert.deepEqual(calls, [{ name: "list_retailer_catalog_coverage", args: { p_retailer_id: "20000000-0000-4000-8000-000000000001" } }]);
});

test("rejects non-operator access and unapproved ready mappings", async () => {
  const denied = { authenticatedUserId: async () => null, resolveMembership: async () => null, call: async () => ({ error: null, data: [] }) };
  await assert.rejects(() => loadOperatorCatalog(denied), OperatorCatalogUnauthorizedError);
  let called = false;
  await assert.rejects(() => reviewOperatorCatalogProduct({
    authenticatedUserId: async () => "operator-auth-id",
    resolveMembership: async () => ({ retailerId: "20000000-0000-4000-8000-000000000001", retailerName: "Northstar" }),
    call: async () => { called = true; return { error: null, data: null }; },
  }, { externalProductId: "northstar-lumen-jacket", coverageStatus: "ready", fitProductReference: "unapproved-target" }));
  assert.equal(called, false);
});
