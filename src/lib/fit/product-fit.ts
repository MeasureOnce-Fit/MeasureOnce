import { buildSyntheticCatalog } from "./catalog";
import { recommendFit } from "./engine";
import {
  type FitPreference,
  type MeasurementInput,
  type MeasurementRegion,
  type MeasurementUnit,
  type RecommendationResult,
} from "./types";

const catalog = buildSyntheticCatalog();
const validPreferences = new Set<FitPreference>(["closer", "regular", "relaxed"]);
const validRegions = new Set<MeasurementRegion>([
  "chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length",
  "sleeve_length", "neck", "upper_arm", "rise", "thigh", "inseam",
  "outseam", "leg_opening", "hem_sweep",
]);
const lengthRegions = new Set<MeasurementRegion>([
  "shoulder_cross_back", "body_length", "sleeve_length", "rise", "inseam", "outseam",
]);

export interface ProductFitRecommendationInput {
  targetProductId: string;
  preference: FitPreference;
  measurements: Array<{
    region: MeasurementRegion;
    value: number;
    unit: MeasurementUnit;
  }>;
}

export interface ProductFitRecommendationPayload {
  synthetic: true;
  targetProductId: string;
  product: {
    id: string;
    name: string;
    category: string;
    brandName: string;
    image?: string;
  };
  result: {
    state: RecommendationResult["state"];
    recommendedSizeLabel?: string;
    alternateSizeLabel?: string;
    optionPriority?: RecommendationResult["optionPriority"];
    findings: Array<{
      region: MeasurementRegion;
      assessment: RecommendationResult["findings"][number]["assessment"];
      reason: string;
    }>;
    options?: Array<{
      sizeLabel: string;
      findings: Array<{
        region: MeasurementRegion;
        assessment: RecommendationResult["findings"][number]["assessment"];
        reason: string;
      }>;
    }>;
    evidence: Pick<
      RecommendationResult["evidence"],
      "used" | "requiredRegions" | "supportedRegions" | "missingRegions" | "completeness"
    >;
    nextSteps: string[];
    versions: RecommendationResult["versions"];
  };
}

export class ProductFitRecommendationInputError extends Error {
  constructor() {
    super("Invalid product fit recommendation request.");
    this.name = "ProductFitRecommendationInputError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parseInput(value: unknown): ProductFitRecommendationInput {
  if (!isRecord(value) || !hasExactKeys(value, ["targetProductId", "preference", "measurements"])
    || typeof value.targetProductId !== "string" || !validPreferences.has(value.preference as FitPreference)
    || !Array.isArray(value.measurements) || value.measurements.length === 0 || value.measurements.length > validRegions.size) {
    throw new ProductFitRecommendationInputError();
  }

  const seen = new Set<MeasurementRegion>();
  const measurements = value.measurements.map((measurement): ProductFitRecommendationInput["measurements"][number] => {
    if (!isRecord(measurement) || !hasExactKeys(measurement, ["region", "value", "unit"])
      || typeof measurement.region !== "string" || !validRegions.has(measurement.region as MeasurementRegion)
      || typeof measurement.value !== "number" || !Number.isFinite(measurement.value) || measurement.value <= 0
      || (measurement.unit !== "cm" && measurement.unit !== "in")) {
      throw new ProductFitRecommendationInputError();
    }
    const region = measurement.region as MeasurementRegion;
    if (seen.has(region)) throw new ProductFitRecommendationInputError();
    seen.add(region);
    return { region, value: measurement.value, unit: measurement.unit };
  });

  return {
    targetProductId: value.targetProductId,
    preference: value.preference as FitPreference,
    measurements,
  };
}

function shopperMeasurement(input: ProductFitRecommendationInput["measurements"][number]): MeasurementInput {
  return {
    ...input,
    kind: lengthRegions.has(input.region) ? "body_length" : "body_circumference",
    methodId: "body-self-reported-v1",
    source: "shopper_entered",
  };
}

function sanitizeResult(result: RecommendationResult): ProductFitRecommendationPayload["result"] {
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

export function getProductFitRecommendation(value: unknown): ProductFitRecommendationPayload {
  const input = parseInput(value);
  const style = catalog.styles.find((candidate) => candidate.productId === input.targetProductId);
  const brand = style && catalog.brands.find((candidate) => candidate.id === style.brandId);
  if (!style || !brand || !style.supported) throw new ProductFitRecommendationInputError();

  const result = recommendFit(catalog, {
    targetProductId: style.productId,
    preference: input.preference,
    profile: { measurements: input.measurements.map(shopperMeasurement) },
  });

  return {
    synthetic: true,
    targetProductId: style.productId,
    product: {
      id: style.productId,
      name: style.name,
      category: style.merchandisingCategory,
      brandName: brand.displayName,
      image: style.sourceImage,
    },
    result: sanitizeResult(result),
  };
}

function jsonResponse(payload: unknown, status: number): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleProductFitRecommendationPost(request: Request): Promise<Response> {
  try {
    const input = await request.json().catch(() => {
      throw new ProductFitRecommendationInputError();
    });
    return jsonResponse(getProductFitRecommendation(input), 200);
  } catch (error) {
    if (error instanceof ProductFitRecommendationInputError) {
      return jsonResponse({ error: error.message }, 400);
    }
    return jsonResponse({ error: "Unable to run the product fit recommendation." }, 500);
  }
}
