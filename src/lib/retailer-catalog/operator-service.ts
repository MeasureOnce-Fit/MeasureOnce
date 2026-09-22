import "server-only";

export type CoverageStatus = "review" | "ready" | "unavailable";

export type OperatorCatalogRow = {
  externalProductId: string;
  name: string;
  category: string;
  coverageStatus: CoverageStatus;
  fitProductReference: string | null;
  variantCount: number;
  measuredVariantCount: number;
};

export type OperatorCatalogContext = { retailerId: string; retailerName: string };

export class OperatorCatalogUnauthorizedError extends Error {
  constructor() { super("Operator access is required."); this.name = "OperatorCatalogUnauthorizedError"; }
}

export class OperatorCatalogUnavailableError extends Error {
  constructor() { super("Catalog operations are unavailable."); this.name = "OperatorCatalogUnavailableError"; }
}

type RpcResult = { data: unknown; error: { message?: string } | null };

export interface OperatorCatalogDependencies {
  authenticatedUserId(): Promise<string | null>;
  resolveMembership(authUserId: string): Promise<OperatorCatalogContext | null>;
  call(functionName: string, args: Record<string, unknown>): Promise<RpcResult>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXTERNAL_PRODUCT = /^[a-z0-9][a-z0-9._-]{1,119}$/;
const FIT_REFERENCES = new Set(["mo-women-001", "mo-women-002"]);

function asRows(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) throw new OperatorCatalogUnavailableError();
  return value.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row));
}

function asRow(value: Record<string, unknown>): OperatorCatalogRow {
  const status = value.coverage_status;
  const variantCount = value.variant_count;
  const measuredVariantCount = value.measured_variant_count;
  if (typeof value.external_product_id !== "string" || typeof value.name !== "string" || typeof value.category !== "string" || (status !== "review" && status !== "ready" && status !== "unavailable") || (value.fit_product_reference !== null && typeof value.fit_product_reference !== "string") || typeof variantCount !== "number" || !Number.isInteger(variantCount) || typeof measuredVariantCount !== "number" || !Number.isInteger(measuredVariantCount)) {
    throw new OperatorCatalogUnavailableError();
  }
  return {
    externalProductId: value.external_product_id,
    name: value.name,
    category: value.category,
    coverageStatus: status,
    fitProductReference: value.fit_product_reference,
    variantCount,
    measuredVariantCount,
  };
}

export async function requireOperatorContext(dependencies: OperatorCatalogDependencies): Promise<OperatorCatalogContext> {
  const authUserId = await dependencies.authenticatedUserId();
  if (!authUserId) throw new OperatorCatalogUnauthorizedError();
  const membership = await dependencies.resolveMembership(authUserId);
  if (!membership || !UUID.test(membership.retailerId)) throw new OperatorCatalogUnauthorizedError();
  return membership;
}

export async function loadOperatorCatalog(dependencies: OperatorCatalogDependencies) {
  const context = await requireOperatorContext(dependencies);
  const result = await dependencies.call("list_retailer_catalog_coverage", { p_retailer_id: context.retailerId });
  if (result.error) throw new OperatorCatalogUnavailableError();
  return { context, products: asRows(result.data).map(asRow) };
}

export async function reviewOperatorCatalogProduct(
  dependencies: OperatorCatalogDependencies,
  input: { externalProductId: string; coverageStatus: CoverageStatus; fitProductReference?: string | null },
) {
  const context = await requireOperatorContext(dependencies);
  if (!EXTERNAL_PRODUCT.test(input.externalProductId)) throw new OperatorCatalogUnavailableError();
  const reference = input.fitProductReference?.trim() || null;
  if ((input.coverageStatus === "ready" && (!reference || !FIT_REFERENCES.has(reference))) || (input.coverageStatus !== "ready" && reference)) {
    throw new OperatorCatalogUnavailableError();
  }
  const result = await dependencies.call("review_retailer_catalog_product", {
    p_retailer_id: context.retailerId,
    p_external_product_id: input.externalProductId,
    p_coverage_status: input.coverageStatus,
    p_fit_product_reference: reference,
  });
  if (result.error) throw new OperatorCatalogUnavailableError();
  return context;
}
