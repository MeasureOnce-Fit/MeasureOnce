import { buildSyntheticCatalog } from "./catalog";
import { recommendFit, requiredRegionsForStyle } from "./engine";
import type { FitPreference, MeasurementRegion, RecommendationResult, ReferenceObservation } from "./types";

const catalog = buildSyntheticCatalog();
const preferences = new Set<FitPreference>(["closer", "regular", "relaxed"]);
const observations = new Set<ReferenceObservation>([
  "too_tight", "slightly_tight", "just_right", "slightly_loose", "too_loose",
  "too_short", "slightly_short", "right_length", "slightly_long", "too_long",
]);
const regions = new Set<MeasurementRegion>([
  "chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length", "sleeve_length", "neck", "upper_arm", "rise", "thigh", "inseam", "outseam", "leg_opening", "hem_sweep",
]);

export class KnownGarmentInputError extends Error {
  constructor() {
    super("Invalid known garment fit request.");
    this.name = "KnownGarmentInputError";
  }
}

type KnownGarmentInput = {
  targetProductId: string;
  preference: FitPreference;
  anchorVariantId: string;
  observations: Partial<Record<MeasurementRegion, ReferenceObservation>>;
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parseInput(value: unknown): KnownGarmentInput {
  if (!record(value) || !exactKeys(value, ["targetProductId", "preference", "anchorVariantId", "observations"])
    || typeof value.targetProductId !== "string" || typeof value.anchorVariantId !== "string"
    || !preferences.has(value.preference as FitPreference) || !record(value.observations)) {
    throw new KnownGarmentInputError();
  }
  const entries = Object.entries(value.observations);
  if (!entries.length || entries.some(([region, observation]) => !regions.has(region as MeasurementRegion) || typeof observation !== "string" || !observations.has(observation as ReferenceObservation))) {
    throw new KnownGarmentInputError();
  }
  return {
    targetProductId: value.targetProductId,
    preference: value.preference as FitPreference,
    anchorVariantId: value.anchorVariantId,
    observations: Object.fromEntries(entries) as KnownGarmentInput["observations"],
  };
}

function result(result: RecommendationResult) {
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

function compatibleKnownGarmentOptions(targetProductId: string) {
  const target = catalog.styles.find((style) => style.productId === targetProductId);
  if (!target) throw new KnownGarmentInputError();
  const targetVariants = target.variantIds
    .map((id) => catalog.variants.find((variant) => variant.id === id))
    .filter((variant): variant is (typeof catalog.variants)[number] => Boolean(variant));
  const relevantRegions = requiredRegionsForStyle(target, targetVariants);
  return catalog.variants
    .filter((variant) => {
      if (variant.productId === target.productId) return false;
      const style = catalog.styles.find((candidate) => candidate.productId === variant.productId);
      const brand = catalog.brands.find((candidate) => candidate.id === variant.brandId);
      if (!style || !brand || style.fitFamily !== target.fitFamily) return false;
      const supported = new Set(variant.measurements
        .filter((measurement) => variant.wearerEaseCm.regular[measurement.region] !== undefined)
        .map((measurement) => measurement.region));
      if (!relevantRegions.every((region) => supported.has(region))) return false;
      return true;
    })
    .map((variant) => {
      const style = catalog.styles.find((candidate) => candidate.productId === variant.productId)!;
      const brand = catalog.brands.find((candidate) => candidate.id === variant.brandId)!;
      const supported = new Set(variant.measurements
        .filter((measurement) => variant.wearerEaseCm.regular[measurement.region] !== undefined)
        .map((measurement) => measurement.region));
      return { id: variant.id, label: variant.size.label, productName: style.name, brandName: brand.displayName, category: style.merchandisingCategory, regions: relevantRegions.filter((region) => supported.has(region)) };
    });
}

export function listKnownGarmentBrands(targetProductId: string) {
  return [...new Set(compatibleKnownGarmentOptions(targetProductId).map((option) => option.brandName))]
    .sort((left, right) => left.localeCompare(right));
}

export function listKnownGarmentOptions(targetProductId: string, query = "") {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 2) return [];
  return compatibleKnownGarmentOptions(targetProductId)
    .filter((option) => `${option.brandName} ${option.productName} ${option.category} ${option.label}`.toLowerCase().includes(normalizedQuery))
    .slice(0, 24);
}

export function getKnownGarmentRecommendation(value: unknown) {
  const input = parseInput(value);
  const target = catalog.styles.find((style) => style.productId === input.targetProductId);
  const anchor = catalog.variants.find((variant) => variant.id === input.anchorVariantId);
  if (!target || !target.supported || !anchor || anchor.productId === target.productId) throw new KnownGarmentInputError();
  const payload = recommendFit(catalog, {
    targetProductId: target.productId,
    preference: input.preference,
    profile: { measurements: [], referenceGarment: { variantId: anchor.id, observations: input.observations } },
  });
  return { synthetic: true, targetProductId: target.productId, result: result(payload) };
}

function json(payload: unknown, status: number) {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleKnownGarmentRequest(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") {
      const targetProductId = new URL(request.url).searchParams.get("targetProductId");
      if (!targetProductId) throw new KnownGarmentInputError();
      const url = new URL(request.url);
      if (url.searchParams.get("view") === "brands") {
        return json({ synthetic: true, targetProductId, brands: listKnownGarmentBrands(targetProductId) }, 200);
      }
      const query = url.searchParams.get("query") ?? "";
      return json({ synthetic: true, targetProductId, anchors: listKnownGarmentOptions(targetProductId, query) }, 200);
    }
    const input = await request.json().catch(() => { throw new KnownGarmentInputError(); });
    return json(getKnownGarmentRecommendation(input), 200);
  } catch (error) {
    if (error instanceof KnownGarmentInputError) return json({ error: error.message }, 400);
    return json({ error: "Unable to run the known garment fit recommendation." }, 500);
  }
}
