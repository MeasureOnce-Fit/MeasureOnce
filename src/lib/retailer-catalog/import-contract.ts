import { createHash } from "node:crypto";

export const CATALOG_IMPORT_SCHEMA_VERSION = "1";

export type CatalogMeasurementKind =
  | "garment_circumference"
  | "garment_flat_width"
  | "garment_length";

export type CatalogImportMeasurement = {
  externalVariantId: string;
  region: string;
  kind: CatalogMeasurementKind;
  valueCm: number;
  methodId: string;
};

export type CatalogImportVariant = {
  externalVariantId: string;
  externalProductId: string;
  sizeLabel: string;
  available: boolean;
};

export type CatalogImportProduct = {
  externalProductId: string;
  name: string;
  category: string;
};

export type CatalogImportPayload = {
  source: string;
  products: readonly CatalogImportProduct[];
  variants: readonly CatalogImportVariant[];
  measurements: readonly CatalogImportMeasurement[];
};

export type ValidatedCatalogImport = CatalogImportPayload & {
  fingerprint: string;
};

export class CatalogImportInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogImportInputError";
  }
}

const IDENTIFIER = /^[a-z0-9][a-z0-9._-]{1,119}$/;
const REGION = /^[a-z][a-z0-9_]{1,59}$/;
const METHOD = /^[a-z0-9][a-z0-9:._-]{2,159}$/;
const MAX_PRODUCTS = 2_000;
const MAX_VARIANTS = 20_000;
const MAX_MEASUREMENTS = 100_000;

function text(value: unknown, label: string, max: number, pattern?: RegExp): string {
  if (typeof value !== "string") throw new CatalogImportInputError(`${label} must be text.`);
  const normalized = value.trim();
  if (!normalized || normalized.length > max || (pattern && !pattern.test(normalized))) {
    throw new CatalogImportInputError(`${label} is invalid.`);
  }
  return normalized;
}

function wholeArray(value: unknown, label: string, maximum: number): unknown[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > maximum) {
    throw new CatalogImportInputError(`${label} must contain between 1 and ${maximum} records.`);
  }
  return value;
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CatalogImportInputError(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function allowOnly(record: Record<string, unknown>, fields: readonly string[], label: string) {
  if (Object.keys(record).some((field) => !fields.includes(field))) {
    throw new CatalogImportInputError(`${label} contains an unsupported field.`);
  }
}

function unique(values: readonly string[], label: string) {
  if (new Set(values).size !== values.length) throw new CatalogImportInputError(`${label} must be unique.`);
}

function canonicalPayload(payload: Omit<CatalogImportPayload, "source"> & { source: string }) {
  return {
    schemaVersion: CATALOG_IMPORT_SCHEMA_VERSION,
    source: payload.source,
    products: [...payload.products].sort((a, b) => a.externalProductId.localeCompare(b.externalProductId)),
    variants: [...payload.variants].sort((a, b) => a.externalVariantId.localeCompare(b.externalVariantId)),
    measurements: [...payload.measurements].sort((a, b) => `${a.externalVariantId}:${a.region}:${a.kind}`.localeCompare(`${b.externalVariantId}:${b.region}:${b.kind}`)),
  };
}

export function fingerprintCatalogImport(payload: CatalogImportPayload): string {
  return createHash("sha256").update(JSON.stringify(canonicalPayload(payload))).digest("hex");
}

export function validateCatalogImport(value: unknown): ValidatedCatalogImport {
  const record = requireRecord(value, "Catalog import");
  allowOnly(record, ["source", "products", "variants", "measurements"], "Catalog import");
  const source = text(record.source, "Catalog source", 120, IDENTIFIER);
  const products = wholeArray(record.products, "Products", MAX_PRODUCTS).map((raw) => {
    const product = requireRecord(raw, "Product");
    allowOnly(product, ["externalProductId", "name", "category"], "Product");
    return {
      externalProductId: text(product.externalProductId, "Product identifier", 120, IDENTIFIER),
      name: text(product.name, "Product name", 240),
      category: text(product.category, "Product category", 80),
    };
  });
  const variants = wholeArray(record.variants, "Variants", MAX_VARIANTS).map((raw) => {
    const variant = requireRecord(raw, "Variant");
    allowOnly(variant, ["externalVariantId", "externalProductId", "sizeLabel", "available"], "Variant");
    if (typeof variant.available !== "boolean") throw new CatalogImportInputError("Variant availability must be true or false.");
    return {
      externalVariantId: text(variant.externalVariantId, "Variant identifier", 120, IDENTIFIER),
      externalProductId: text(variant.externalProductId, "Variant product identifier", 120, IDENTIFIER),
      sizeLabel: text(variant.sizeLabel, "Variant size label", 40),
      available: variant.available,
    };
  });
  const measurements = wholeArray(record.measurements, "Measurements", MAX_MEASUREMENTS).map((raw) => {
    const measurement = requireRecord(raw, "Measurement");
    allowOnly(measurement, ["externalVariantId", "region", "kind", "valueCm", "methodId"], "Measurement");
    if (measurement.kind !== "garment_circumference" && measurement.kind !== "garment_flat_width" && measurement.kind !== "garment_length") {
      throw new CatalogImportInputError("Measurement kind is invalid.");
    }
    if (typeof measurement.valueCm !== "number" || !Number.isFinite(measurement.valueCm) || measurement.valueCm <= 0 || measurement.valueCm > 500) {
      throw new CatalogImportInputError("Measurement value must be a positive centimetre value up to 500.");
    }
    return {
      externalVariantId: text(measurement.externalVariantId, "Measurement variant identifier", 120, IDENTIFIER),
      region: text(measurement.region, "Measurement region", 60, REGION),
      kind: measurement.kind,
      valueCm: Math.round(measurement.valueCm * 100) / 100,
      methodId: text(measurement.methodId, "Measurement method", 160, METHOD),
    } satisfies CatalogImportMeasurement;
  });

  unique(products.map((product) => product.externalProductId), "Product identifiers");
  unique(variants.map((variant) => variant.externalVariantId), "Variant identifiers");
  unique(variants.map((variant) => `${variant.externalProductId}:${variant.sizeLabel}`), "Product size labels");
  unique(measurements.map((measurement) => `${measurement.externalVariantId}:${measurement.region}:${measurement.kind}`), "Variant measurements");
  const productIds = new Set(products.map((product) => product.externalProductId));
  const variantIds = new Set(variants.map((variant) => variant.externalVariantId));
  if (variants.some((variant) => !productIds.has(variant.externalProductId))) {
    throw new CatalogImportInputError("Every variant must belong to an imported product.");
  }
  if (measurements.some((measurement) => !variantIds.has(measurement.externalVariantId))) {
    throw new CatalogImportInputError("Every measurement must belong to an imported variant.");
  }

  const payload = { source, products, variants, measurements };
  return { ...payload, fingerprint: fingerprintCatalogImport(payload) };
}

export type ExistingCatalogImport = { id: string; fingerprint: string };
export type CatalogImportDecision =
  | { outcome: "create"; import: ValidatedCatalogImport }
  | { outcome: "duplicate"; importId: string }
  | { outcome: "idempotency_conflict" };

export function decideCatalogImport(
  input: unknown,
  existing: ExistingCatalogImport | null,
): CatalogImportDecision {
  const imported = validateCatalogImport(input);
  if (!existing) return { outcome: "create", import: imported };
  return existing.fingerprint === imported.fingerprint
    ? { outcome: "duplicate", importId: existing.id }
    : { outcome: "idempotency_conflict" };
}
