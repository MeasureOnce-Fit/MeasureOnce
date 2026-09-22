import { buildSyntheticCatalog } from "./catalog";
import { recommendFit } from "./engine";
import {
  type FitProfileEvidence,
  type MeasurementInput,
  type MeasurementRegion,
  type MeasurementUnit,
  type RecommendationRequest,
  type RecommendationResult,
} from "./types";

export const SHOWCASE_SCENARIO_IDS = [
  "alex-body-dresses",
  "alex-known-garment-dresses",
] as const;

export const SHOWCASE_TARGET_PRODUCT_IDS = [
  "mo-women-001",
  "mo-women-004",
  "mo-women-021",
] as const;

export type ShowcaseScenarioId = (typeof SHOWCASE_SCENARIO_IDS)[number];
export type ShowcaseTargetProductId = (typeof SHOWCASE_TARGET_PRODUCT_IDS)[number];

export interface ShowcaseRecommendationInput {
  scenarioId: ShowcaseScenarioId;
  targetProductId: ShowcaseTargetProductId;
  unit: MeasurementUnit;
}

export interface ShowcaseRecommendationPayload {
  synthetic: true;
  scenarioId: ShowcaseScenarioId;
  targetProductId: ShowcaseTargetProductId;
  unit: MeasurementUnit;
  product: {
    id: ShowcaseTargetProductId;
    name: string;
    brandId: string;
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
      evidence?: { value: number; unit: MeasurementUnit };
      compatibleRange?: { min: number; max: number; unit: MeasurementUnit };
      reason: string;
    }>;
    evidence: Pick<
      RecommendationResult["evidence"],
      "used" | "requiredRegions" | "supportedRegions" | "missingRegions" | "completeness"
    >;
    nextSteps: string[];
    versions: RecommendationResult["versions"];
  };
}

export class ShowcasePreviewInputError extends Error {
  constructor() {
    super("Invalid showcase recommendation request.");
    this.name = "ShowcasePreviewInputError";
  }
}

const catalog = buildSyntheticCatalog();
const scenarioIds = new Set<string>(SHOWCASE_SCENARIO_IDS);
const targetProductIds = new Set<string>(SHOWCASE_TARGET_PRODUCT_IDS);
const inputKeys = ["scenarioId", "targetProductId", "unit"];

const BODY_VALUES_CM: Record<"chest_bust" | "waist" | "hip_seat", number> = {
  chest_bust: 87.4,
  waist: 70.82,
  hip_seat: 96.04,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseInput(value: unknown): ShowcaseRecommendationInput {
  if (!isRecord(value) || Object.keys(value).length !== inputKeys.length
    || !inputKeys.every((key) => Object.hasOwn(value, key))
    || typeof value.scenarioId !== "string" || !scenarioIds.has(value.scenarioId)
    || typeof value.targetProductId !== "string" || !targetProductIds.has(value.targetProductId)
    || (value.unit !== "cm" && value.unit !== "in")) {
    throw new ShowcasePreviewInputError();
  }
  return value as unknown as ShowcaseRecommendationInput;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function convertFromCm(valueCm: number, unit: MeasurementUnit): number {
  return round(unit === "cm" ? valueCm : valueCm / 2.54);
}

function bodyMeasurement(region: keyof typeof BODY_VALUES_CM, unit: MeasurementUnit): MeasurementInput {
  return {
    region,
    value: unit === "cm" ? BODY_VALUES_CM[region] : BODY_VALUES_CM[region] / 2.54,
    unit,
    kind: "body_circumference",
    methodId: "body-self-reported-v1",
    source: "shopper_entered",
  };
}

function scenarioProfile(scenarioId: ShowcaseScenarioId, unit: MeasurementUnit): FitProfileEvidence {
  if (scenarioId === "alex-body-dresses") {
    return {
      measurements: (["chest_bust", "waist", "hip_seat"] as const)
        .map((region) => bodyMeasurement(region, unit)),
    };
  }
  return {
    measurements: [],
    referenceGarment: {
      variantId: "mo-women-004:brand_06:01",
      observations: {
        chest_bust: "just_right",
        waist: "just_right",
        hip_seat: "just_right",
      },
    },
  };
}

function sanitizeResult(result: RecommendationResult, unit: MeasurementUnit): ShowcaseRecommendationPayload["result"] {
  return {
    state: result.state,
    recommendedSizeLabel: result.recommendedSizeLabel,
    alternateSizeLabel: result.alternateSizeLabel,
    optionPriority: result.optionPriority,
    findings: result.findings.map((finding) => ({
      region: finding.region,
      assessment: finding.assessment,
      evidence: finding.evidenceValueCm === undefined
        ? undefined
        : { value: convertFromCm(finding.evidenceValueCm, unit), unit },
      compatibleRange: finding.compatibleRangeCm
        ? {
            min: convertFromCm(finding.compatibleRangeCm.minCm, unit),
            max: convertFromCm(finding.compatibleRangeCm.maxCm, unit),
            unit,
          }
        : undefined,
      reason: finding.reason,
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

export function getShowcaseRecommendation(value: unknown): ShowcaseRecommendationPayload {
  const input = parseInput(value);
  const style = catalog.styles.find((candidate) => candidate.productId === input.targetProductId);
  const brand = style && catalog.brands.find((candidate) => candidate.id === style.brandId);
  if (!style || !brand || style.department !== "Women" || style.fitFamily !== "dress") {
    throw new Error("The configured showcase target is missing or incompatible.");
  }
  const request: RecommendationRequest = {
    targetProductId: input.targetProductId,
    preference: "regular",
    profile: scenarioProfile(input.scenarioId, input.unit),
  };
  const result = recommendFit(catalog, request);

  return {
    synthetic: true,
    scenarioId: input.scenarioId,
    targetProductId: input.targetProductId,
    unit: input.unit,
    product: {
      id: input.targetProductId,
      name: style.name,
      brandId: brand.id,
      brandName: brand.displayName,
      image: style.sourceImage,
    },
    result: sanitizeResult(result, input.unit),
  };
}

function jsonResponse(payload: unknown, status: number): Response {
  return Response.json(payload, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function handleShowcaseRecommendationPost(request: Request): Promise<Response> {
  try {
    const input = await request.json().catch(() => {
      throw new ShowcasePreviewInputError();
    });
    return jsonResponse(getShowcaseRecommendation(input), 200);
  } catch (error) {
    if (error instanceof ShowcasePreviewInputError) {
      return jsonResponse({ error: error.message }, 400);
    }
    return jsonResponse({ error: "Unable to run the showcase recommendation." }, 500);
  }
}
