import { buildSyntheticCatalog } from "./catalog";
import {
  CategorySizeReferenceInputError,
  recommendFromSavedCategorySizeReference,
  resolveProfileCategorySizeReference,
} from "./category-size-reference";
import { recommendFit } from "./engine";
import type {
  FitPreference,
  MeasurementInput,
  MeasurementRegion,
  RecommendationResult,
} from "./types";
import {
  ProtectedSessionUnauthorizedError,
  ProtectedSessionUnavailableError,
} from "../identity/session-context";
import type { ProtectedIdentityHttpDependencies } from "../identity/protected-http";
import type { FitProfile, PrincipalContext } from "../identity/types";

const catalog = buildSyntheticCatalog();
const preferences = new Set<FitPreference>(["closer", "regular", "relaxed"]);
const regions = new Set<MeasurementRegion>([
  "chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length",
  "sleeve_length", "neck", "upper_arm", "rise", "thigh", "inseam",
  "outseam", "leg_opening", "hem_sweep",
]);
const lengthRegions = new Set<MeasurementRegion>([
  "shoulder_cross_back", "body_length", "sleeve_length", "rise", "inseam", "outseam",
]);

export class SavedProfileFitInputError extends Error {
  constructor(message = "Invalid saved Fit Passport request.") {
    super(message);
    this.name = "SavedProfileFitInputError";
  }
}

type SavedProfileInput = {
  targetProductId: string;
  preference: FitPreference;
  profileId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parseInput(value: unknown): SavedProfileInput {
  if (
    !isRecord(value) || !hasExactKeys(value, ["targetProductId", "preference", "profileId"])
    || typeof value.targetProductId !== "string" || !value.targetProductId
    || typeof value.profileId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._~-]{0,199}$/.test(value.profileId)
    || !preferences.has(value.preference as FitPreference)
  ) {
    throw new SavedProfileFitInputError();
  }
  return {
    targetProductId: value.targetProductId,
    preference: value.preference as FitPreference,
    profileId: value.profileId,
  };
}

function toMeasurementInputs(profile: FitProfile): MeasurementInput[] {
  const seen = new Set<MeasurementRegion>();
  const inputs: MeasurementInput[] = [];

  for (const measurement of profile.measurements) {
    if (
      measurement.method !== "body" || !regions.has(measurement.region as MeasurementRegion)
      || seen.has(measurement.region as MeasurementRegion)
    ) continue;

    const region = measurement.region as MeasurementRegion;
    seen.add(region);
    inputs.push({
      region,
      value: measurement.value,
      unit: measurement.unit,
      kind: lengthRegions.has(region) ? "body_length" : "body_circumference",
      methodId: "saved-profile-v1",
      source: "saved_profile",
    });
  }
  return inputs;
}

function sanitizeResult(result: RecommendationResult) {
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

function profileFromOwnedAccount(
  context: PrincipalContext,
  profileId: string,
  profiles: FitProfile[],
): FitProfile {
  const profile = profiles.find((candidate) => candidate.id === profileId);
  if (!profile || profile.ownerId !== context.principalId || profile.retailerId !== context.retailerId) {
    throw new SavedProfileFitInputError("Fit Passport profile not found.");
  }
  return profile;
}

function runSavedProfileFit(input: SavedProfileInput, profile: FitProfile) {
  const style = catalog.styles.find((candidate) => candidate.productId === input.targetProductId);
  const brand = style && catalog.brands.find((candidate) => candidate.id === style.brandId);
  if (!style || !brand || !style.supported) throw new SavedProfileFitInputError();

  let savedReferenceResult: ReturnType<typeof recommendFromSavedCategorySizeReference>["result"] | null = null;
  const legacyReferenceDepartment = profile.catalogCollection === "women"
    ? "Women"
    : profile.catalogCollection === "men"
      ? "Men"
      : undefined;
  for (const anchor of profile.anchors) {
    const referenceId = anchor.evidenceKind === "category_size_reference"
      ? anchor.referenceId
      : anchor.evidenceKind === "remembered_size_context" && legacyReferenceDepartment === style.department
        ? resolveProfileCategorySizeReference({
            department: legacyReferenceDepartment,
            brandName: anchor.brandName,
            category: anchor.category === "Jackets" ? "Outerwear" : anchor.category === "Jeans" ? "Denim" : anchor.category,
            sizeLabel: anchor.sizeLabel,
          })?.id
        : undefined;
    if (!referenceId) continue;
    try {
      savedReferenceResult = recommendFromSavedCategorySizeReference({
        targetProductId: style.productId,
        preference: input.preference,
        referenceId,
        observations: anchor.observations,
      }).result;
      break;
    } catch (error) {
      if (!(error instanceof CategorySizeReferenceInputError)) throw error;
    }
  }

  const bodyMeasurementResult = recommendFit(catalog, {
    targetProductId: style.productId,
    preference: input.preference,
    profile: { measurements: toMeasurementInputs(profile) },
  });

  return {
    synthetic: true as const,
    targetProductId: style.productId,
    profile: { id: profile.id, nickname: profile.nickname, kind: profile.kind },
    product: {
      id: style.productId,
      name: style.name,
      category: style.merchandisingCategory,
      brandName: brand.displayName,
      image: style.sourceImage,
    },
    result: savedReferenceResult ?? sanitizeResult(bodyMeasurementResult),
  };
}

function json(payload: unknown, status: number) {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export function createSavedProfileRecommendationHandler(dependencies: ProtectedIdentityHttpDependencies) {
  return async function handleSavedProfileRecommendationPost(request: Request): Promise<Response> {
    try {
      const input = parseInput(await request.json().catch(() => { throw new SavedProfileFitInputError(); }));
      const context = await dependencies.authenticate(request);
      const account = await dependencies.createService().exportAccount(context);
      const profile = profileFromOwnedAccount(context, input.profileId, account.profiles);
      return json(runSavedProfileFit(input, profile), 200);
    } catch (error) {
      if (error instanceof ProtectedSessionUnauthorizedError) return json({ error: "Unauthorized." }, 401);
      if (error instanceof ProtectedSessionUnavailableError) return json({ error: "Service unavailable." }, 503);
      if (error instanceof SavedProfileFitInputError) {
        return json({ error: error.message }, error.message === "Fit Passport profile not found." ? 404 : 400);
      }
      return json({ error: "Unable to run the saved Fit Passport recommendation." }, 503);
    }
  };
}
