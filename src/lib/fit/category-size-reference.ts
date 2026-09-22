import { buildSyntheticCatalog } from "./catalog";
import {
  categorySizeReferenceFixtures,
  legacyCategorySizeReferenceFixtures,
} from "./category-size-reference-fixtures";
import { recommendFit, requiredRegionsForStyle } from "./engine";
import {
  MEASUREMENT_METHOD_VERSION,
  type CategorySizeReference,
  type CategorySizeReferenceSummary,
  type FitCatalog,
  type FitPreference,
  type FitStyle,
  type GarmentVariant,
  type MeasurementRegion,
  type RecommendationResult,
  type ReferenceObservation,
} from "./types";

const catalog = buildSyntheticCatalog();
const persistedCategorySizeReferenceFixtures = [
  ...categorySizeReferenceFixtures,
  ...legacyCategorySizeReferenceFixtures,
];
const preferences = new Set<FitPreference>(["closer", "regular", "relaxed"]);
const regions = new Set<MeasurementRegion>([
  "chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length",
  "sleeve_length", "neck", "upper_arm", "rise", "thigh", "inseam",
  "outseam", "leg_opening", "hem_sweep",
]);
const lengthRegions = new Set<MeasurementRegion>([
  "shoulder_cross_back", "body_length", "sleeve_length", "rise", "inseam", "outseam",
]);
const circumferenceObservations = new Set<ReferenceObservation>([
  "too_tight", "slightly_tight", "just_right", "slightly_loose", "too_loose",
]);
const lengthObservations = new Set<ReferenceObservation>([
  "too_short", "slightly_short", "right_length", "slightly_long", "too_long",
]);

export interface CategorySizeBrandSummary {
  brandId: string;
  brandName: string;
  category: string;
  hasVerifiedReference: boolean;
}

export interface ProfileCategorySizeReferenceSummary {
  id: string;
  version: string;
  brandId: string;
  brandName: string;
  category: string;
  sizeLabel: string;
  supportedRegions: MeasurementRegion[];
}

export class CategorySizeReferenceInputError extends Error {
  constructor() {
    super("Invalid category size reference fit request.");
    this.name = "CategorySizeReferenceInputError";
  }
}

interface TargetContext {
  style: FitStyle;
  variants: GarmentVariant[];
  requiredRegions: MeasurementRegion[];
  requiredAxes: Array<keyof NonNullable<CategorySizeReference["size"]["axes"]>>;
}

interface CategorySizeRecommendationInput {
  targetProductId: string;
  preference: FitPreference;
  referenceId: string;
  observations: Partial<Record<MeasurementRegion, ReferenceObservation>>;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function target(targetProductId: string): TargetContext {
  const style = catalog.styles.find((candidate) => candidate.productId === targetProductId);
  if (!style || !style.supported) throw new CategorySizeReferenceInputError();
  const variants = style.variantIds
    .map((id) => catalog.variants.find((variant) => variant.id === id))
    .filter((variant): variant is GarmentVariant => Boolean(variant));
  if (variants.length !== style.variantIds.length) throw new CategorySizeReferenceInputError();
  const requiredAxes = [...new Set(variants.flatMap((variant) => Object.keys(variant.size.axes ?? {})))] as TargetContext["requiredAxes"];
  return { style, variants, requiredRegions: requiredRegionsForStyle(style, variants), requiredAxes };
}

function expectedMethod(region: MeasurementRegion, kind: CategorySizeReference["measurements"][number]["kind"]): string {
  const methodKind = kind === "garment_flat_width" ? "flat_width" : kind === "garment_length" ? "length" : "circumference";
  return `${MEASUREMENT_METHOD_VERSION}:${methodKind}:${region}`;
}

function measurementIsUsable(reference: CategorySizeReference, region: MeasurementRegion): boolean {
  const measurement = reference.measurements.find((candidate) => candidate.region === region);
  if (!measurement || reference.wearerEaseCm.regular[region] === undefined) return false;
  const isLength = lengthRegions.has(region);
  if (isLength ? measurement.kind !== "garment_length" : measurement.kind === "garment_length") return false;
  return measurement.methodId === expectedMethod(region, measurement.kind);
}

function referenceCoversTarget(reference: CategorySizeReference, context: TargetContext): boolean {
  if (reference.department !== context.style.department) return false;
  if (reference.category !== context.style.merchandisingCategory) return false;
  if (!context.requiredRegions.every((region) => measurementIsUsable(reference, region))) return false;
  return context.requiredAxes.every((axis) => Boolean(reference.size.axes?.[axis]));
}

function summary(reference: CategorySizeReference, context: TargetContext): CategorySizeReferenceSummary {
  return {
    id: reference.id,
    version: reference.version,
    brandId: reference.brandId,
    brandName: reference.brandName,
    category: reference.category,
    sizeLabel: reference.size.label,
    axes: reference.size.axes ? { ...reference.size.axes } : undefined,
    supportedRegions: context.requiredRegions.filter((region) => measurementIsUsable(reference, region)),
  };
}

export function listCategorySizeBrands(targetProductId: string): CategorySizeBrandSummary[] {
  const context = target(targetProductId);
  const availableVariantIds = new Set(catalog.variants
    .filter((variant) => variant.available)
    .map((variant) => variant.id));
  const catalogBrandIds = new Set(catalog.styles
    .filter((style) => style.supported
      && style.department === context.style.department
      && style.merchandisingCategory === context.style.merchandisingCategory
      && style.variantIds.some((variantId) => availableVariantIds.has(variantId)))
    .map((style) => style.brandId));

  return catalog.brands
    .filter((brand) => catalogBrandIds.has(brand.id))
    .map((brand) => ({
      brandId: brand.id,
      brandName: brand.displayName,
      category: context.style.merchandisingCategory,
      hasVerifiedReference: categorySizeReferenceFixtures.some((reference) => (
        reference.brandId === brand.id && referenceCoversTarget(reference, context)
      )),
    }))
    .sort((left, right) => left.brandName.localeCompare(right.brandName));
}

export function listCategorySizeOptions(targetProductId: string, brandId: string): CategorySizeReferenceSummary[] {
  if (typeof brandId !== "string" || brandId.length === 0) throw new CategorySizeReferenceInputError();
  const context = target(targetProductId);
  return categorySizeReferenceFixtures
    .filter((reference) => reference.brandId === brandId && referenceCoversTarget(reference, context))
    .sort((left, right) => left.size.ordinal - right.size.ordinal
      || left.size.label.localeCompare(right.size.label, undefined, { numeric: true }))
    .map((reference) => summary(reference, context));
}

/** Safe known-size picker data for Fit Passport before a target product exists. */
export function listProfileCategorySizeReferences(
  department: "Women" | "Men",
  category: string,
): ProfileCategorySizeReferenceSummary[] {
  return categorySizeReferenceFixtures
    .filter((reference) => reference.department === department && reference.category === category)
    .sort((left, right) => left.brandName.localeCompare(right.brandName)
      || left.size.ordinal - right.size.ordinal
      || left.size.label.localeCompare(right.size.label, undefined, { numeric: true }))
    .map((reference) => ({
      id: reference.id,
      version: reference.version,
      brandId: reference.brandId,
      brandName: reference.brandName,
      category: reference.category,
      sizeLabel: reference.size.label,
      supportedRegions: reference.measurements.map((measurement) => measurement.region),
    }));
}

export function resolveProfileCategorySizeReference(input: {
  department: "Women" | "Men";
  brandName: string;
  category: string;
  sizeLabel: string;
}): ProfileCategorySizeReferenceSummary | undefined {
  const brandName = input.brandName.trim().toLocaleLowerCase();
  const sizeLabel = input.sizeLabel.trim().toLocaleLowerCase();
  return listProfileCategorySizeReferences(input.department, input.category).find((reference) => (
    reference.brandName.toLocaleLowerCase() === brandName
    && reference.sizeLabel.toLocaleLowerCase() === sizeLabel
  ));
}

/** Server-side persistence may validate provenance without receiving chart geometry. */
export function getCategorySizeReferenceById(
  referenceId: string,
): Pick<CategorySizeReference, "id" | "version" | "brandName" | "category"> & { sizeLabel: string } | undefined {
  if (typeof referenceId !== "string" || referenceId.length === 0) return undefined;
  const reference = persistedCategorySizeReferenceFixtures.find((candidate) => candidate.id === referenceId);
  if (!reference) return undefined;
  return {
    id: reference.id,
    version: reference.version,
    brandName: reference.brandName,
    category: reference.category,
    sizeLabel: reference.size.label,
  };
}

function parseInput(value: unknown): CategorySizeRecommendationInput {
  if (!record(value)
    || !exactKeys(value, ["targetProductId", "preference", "referenceId", "observations"])
    || typeof value.targetProductId !== "string"
    || typeof value.referenceId !== "string"
    || !preferences.has(value.preference as FitPreference)
    || !record(value.observations)) {
    throw new CategorySizeReferenceInputError();
  }
  const observations: Partial<Record<MeasurementRegion, ReferenceObservation>> = {};
  for (const [name, observation] of Object.entries(value.observations)) {
    const region = name as MeasurementRegion;
    const valid = lengthRegions.has(region) ? lengthObservations : circumferenceObservations;
    if (!regions.has(region) || typeof observation !== "string" || !valid.has(observation as ReferenceObservation)) {
      throw new CategorySizeReferenceInputError();
    }
    observations[region] = observation as ReferenceObservation;
  }
  return {
    targetProductId: value.targetProductId,
    preference: value.preference as FitPreference,
    referenceId: value.referenceId,
    observations,
  };
}

function referenceVariant(reference: CategorySizeReference, targetStyle: FitStyle): { style: FitStyle; variant: GarmentVariant } {
  const productId = `category-size-reference:${reference.id}`;
  const variantId = `${productId}:reference`;
  const variant: GarmentVariant = {
    id: variantId,
    productId,
    brandId: reference.brandId,
    size: { ...reference.size, axes: reference.size.axes ? { ...reference.size.axes } : undefined },
    sourceSizeIndex: reference.size.ordinal,
    sourceSizeLabel: reference.size.label,
    measurements: reference.measurements.map((measurement) => ({ ...measurement })),
    wearerEaseCm: {
      closer: { ...reference.wearerEaseCm.closer },
      regular: { ...reference.wearerEaseCm.regular },
      relaxed: { ...reference.wearerEaseCm.relaxed },
    },
    compatibleBodyRanges: { closer: {}, regular: {}, relaxed: {} },
    available: true,
    provenance: {
      type: "synthetic",
      generatorVersion: reference.version,
      assumptions: ["Explicit synthetic category-size reference; not derived from catalog variants."],
    },
  };
  const style: FitStyle = {
    productId,
    name: `${reference.brandName} ${reference.category} size reference`,
    sourceSizeLabels: [reference.size.label],
    department: targetStyle.department,
    merchandisingCategory: reference.category,
    garmentType: targetStyle.garmentType,
    fitFamily: targetStyle.fitFamily,
    brandId: reference.brandId,
    material: "Synthetic category-size reference",
    declaredFit: "Reference chart",
    declaredStretch: "Not applicable",
    criticalRegions: [...targetStyle.criticalRegions],
    secondaryRegions: [],
    variantIds: [variantId],
    supported: true,
  };
  return { style, variant };
}

function withReference(catalogue: FitCatalog, reference: CategorySizeReference, targetStyle: FitStyle): FitCatalog {
  const adapter = referenceVariant(reference, targetStyle);
  return {
    ...catalogue,
    styles: [...catalogue.styles, adapter.style],
    variants: [...catalogue.variants, adapter.variant],
  };
}

function sanitize(result: RecommendationResult) {
  return {
    state: result.state,
    recommendedSizeLabel: result.recommendedSizeLabel,
    alternateSizeLabel: result.alternateSizeLabel,
    optionPriority: result.optionPriority,
    findings: result.findings.map(({ region, assessment, reason }) => ({ region, assessment, reason })),
    options: result.options?.map((option) => ({
      sizeLabel: option.sizeLabel,
      findings: option.findings.map(({ region, assessment, reason }) => ({ region, assessment, reason })),
    })),
    evidence: {
      used: result.evidence.used,
      requiredRegions: result.evidence.requiredRegions,
      supportedRegions: result.evidence.supportedRegions,
      missingRegions: result.evidence.missingRegions,
      completeness: result.evidence.completeness,
    },
    nextSteps: result.nextSteps,
    versions: result.versions,
  };
}

export function recommendFromCategorySizeReference(value: unknown) {
  const input = parseInput(value);
  const context = target(input.targetProductId);
  const reference = persistedCategorySizeReferenceFixtures.find((candidate) => candidate.id === input.referenceId);
  if (!reference || !referenceCoversTarget(reference, context)) throw new CategorySizeReferenceInputError();
  if (!context.requiredRegions.every((region) => Object.hasOwn(input.observations, region))) {
    throw new CategorySizeReferenceInputError();
  }
  if (Object.keys(input.observations).some((region) => !context.requiredRegions.includes(region as MeasurementRegion))) {
    throw new CategorySizeReferenceInputError();
  }
  const adapter = referenceVariant(reference, context.style);
  const result = recommendFit(withReference(catalog, reference, context.style), {
    targetProductId: input.targetProductId,
    preference: input.preference,
    profile: { measurements: [], referenceGarment: { variantId: adapter.variant.id, observations: input.observations } },
  });
  return { synthetic: true as const, targetProductId: input.targetProductId, result: sanitize(result) };
}

/**
 * Replays a verified reference stored in Fit Passport. A saved reference can
 * contain notes for more regions than a particular target requires (for
 * example, sleeve feedback for a sleeveless jacket), so retain only the
 * target's required regions before applying the public request contract.
 */
export function recommendFromSavedCategorySizeReference(input: {
  targetProductId: string;
  preference: FitPreference;
  referenceId: string;
  observations: Record<string, string>;
}) {
  const context = target(input.targetProductId);
  const observations = Object.fromEntries(
    context.requiredRegions.flatMap((region) => {
      const observation = input.observations[region];
      return typeof observation === "string" ? [[region, observation]] : [];
    }),
  );
  return recommendFromCategorySizeReference({
    targetProductId: input.targetProductId,
    preference: input.preference,
    referenceId: input.referenceId,
    observations,
  });
}

function json(payload: unknown, status: number): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

function getParams(request: Request): { targetProductId: string; view: "brands" | "sizes"; brandId?: string } {
  const url = new URL(request.url);
  const targetProductId = url.searchParams.get("targetProductId");
  const view = url.searchParams.get("view");
  const brandId = url.searchParams.get("brandId");
  const allowedKeys = view === "sizes"
    ? ["targetProductId", "view", "brandId"]
    : ["targetProductId", "view"];

  if (!targetProductId || (view !== "brands" && view !== "sizes")
    || [...url.searchParams.keys()].some((key) => !allowedKeys.includes(key))
    || (view === "brands" && brandId !== null)
    || (view === "sizes" && (!brandId || !listCategorySizeBrands(targetProductId).some((brand) => brand.brandId === brandId)))) {
    throw new CategorySizeReferenceInputError();
  }
  return { targetProductId, view, brandId: brandId ?? undefined };
}

/** HTTP boundary for the verified category-size reference flow. */
export async function handleCategorySizeReferenceRequest(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") {
      const { targetProductId, view, brandId } = getParams(request);
      if (view === "brands") {
        return json({ synthetic: true, targetProductId, brands: listCategorySizeBrands(targetProductId) }, 200);
      }
      return json({
        synthetic: true,
        targetProductId,
        sizes: listCategorySizeOptions(targetProductId, brandId!),
      }, 200);
    }
    if (request.method !== "POST") throw new CategorySizeReferenceInputError();
    const input = await request.json().catch(() => { throw new CategorySizeReferenceInputError(); });
    return json(recommendFromCategorySizeReference(input), 200);
  } catch (error) {
    if (error instanceof CategorySizeReferenceInputError) {
      return json({ error: error.message }, 400);
    }
    return json({ error: "Unable to run the category size reference recommendation." }, 500);
  }
}
