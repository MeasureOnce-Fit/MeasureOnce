import "server-only";

import {
  CatalogImportInputError,
  type CatalogImportPayload,
  validateCatalogImport,
} from "./import-contract";

type RpcResult = { data: unknown; error: unknown };

export interface RetailerCatalogServiceRoleClient {
  schema(name: "private"): {
    rpc(functionName: string, args: Record<string, unknown>): PromiseLike<RpcResult>;
  };
}

export type CatalogImportReceipt = {
  outcome: "accepted" | "duplicate";
  importId: string;
  counts?: { products: number; variants: number; measurements: number };
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IDEMPOTENCY_KEY = /^[A-Za-z0-9][A-Za-z0-9._~-]{7,119}$/;

function asDigest(fingerprint: string) {
  return `\\x${fingerprint}`;
}

function oneRecord(data: unknown, label: string): Record<string, unknown> {
  const value = Array.isArray(data) ? data[0] : data;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} failed.`);
  return value as Record<string, unknown>;
}

function requireRpc(result: RpcResult, label: string): unknown {
  if (result.error) throw new Error(`${label} failed.`);
  return result.data;
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

export class SupabaseRetailerCatalogAdapter {
  constructor(private readonly serviceRoleClient: RetailerCatalogServiceRoleClient) {}

  async importSnapshot(input: {
    retailerId: string;
    idempotencyKey: string;
    payload: CatalogImportPayload;
  }): Promise<CatalogImportReceipt> {
    if (!UUID.test(input.retailerId)) throw new CatalogImportInputError("Retailer identifier is invalid.");
    if (!IDEMPOTENCY_KEY.test(input.idempotencyKey)) throw new CatalogImportInputError("Catalog import idempotency key is invalid.");
    const payload = validateCatalogImport(input.payload);
    const started = oneRecord(requireRpc(await this.serviceRoleClient.schema("private").rpc(
      "start_retailer_catalog_import",
      {
        p_retailer_id: input.retailerId,
        p_idempotency_key: input.idempotencyKey,
        p_source: payload.source,
        p_payload_digest: asDigest(payload.fingerprint),
      },
    ), "Catalog import start"), "Catalog import start");

    const importId = started.catalog_import_id;
    if (typeof importId !== "string" || !UUID.test(importId) || typeof started.already_applied !== "boolean" || (started.import_status !== "pending" && started.import_status !== "accepted" && started.import_status !== "rejected")) {
      throw new Error("Catalog import start failed.");
    }
    if (started.import_status === "rejected") throw new Error("Catalog import was previously rejected.");
    if (started.already_applied && started.import_status === "accepted") return { outcome: "duplicate", importId };

    const completed = oneRecord(requireRpc(await this.serviceRoleClient.schema("private").rpc(
      "replace_retailer_catalog_snapshot",
      {
        p_retailer_id: input.retailerId,
        p_catalog_import_id: importId,
        p_products: payload.products,
        p_variants: payload.variants,
        p_measurements: payload.measurements,
      },
    ), "Catalog import apply"), "Catalog import apply");
    const products = completed.product_count;
    const variants = completed.variant_count;
    const measurements = completed.measurement_count;
    if (!isCount(products) || !isCount(variants) || !isCount(measurements)) {
      throw new Error("Catalog import apply failed.");
    }
    return { outcome: "accepted", importId, counts: { products, variants, measurements } };
  }
}
