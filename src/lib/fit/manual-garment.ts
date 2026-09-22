import { buildSyntheticCatalog } from "./catalog";
import { requiredRegionsForStyle } from "./engine";
import {
  MEASUREMENT_METHOD_VERSION,
  type FitPreference,
  type GarmentVariant,
  type ManualReferenceGarmentRequest,
  type MeasurementRegion,
  type MeasurementUnit,
  type RecommendationState,
  type ReferenceObservation,
  type RegionalAssessment,
} from "./types";

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
const circumferenceObservations = new Set<ReferenceObservation>([
  "too_tight", "slightly_tight", "just_right", "slightly_loose", "too_loose",
]);
const lengthObservations = new Set<ReferenceObservation>([
  "too_short", "slightly_short", "right_length", "slightly_long", "too_long",
]);
const labels: Record<MeasurementRegion, string> = {
  chest_bust: "Chest / bust",
  waist: "Waist",
  hip_seat: "Hip / seat",
  shoulder_cross_back: "Shoulder across back",
  body_length: "Garment length",
  sleeve_length: "Sleeve length",
  neck: "Neck",
  upper_arm: "Upper arm",
  rise: "Rise",
  thigh: "Thigh",
  inseam: "Inseam",
  outseam: "Outseam",
  leg_opening: "Leg opening",
  hem_sweep: "Hem sweep",
};

type ManualMeasurementKind = ManualReferenceGarmentRequest["reference"]["measurements"][number]["kind"];

export interface ManualGarmentRequirement {
  region: MeasurementRegion;
  label: string;
  acceptedKinds: ManualMeasurementKind[];
  methodIds: string[];
}

interface NormalizedManualInput {
  request: ManualReferenceGarmentRequest;
  values: Map<MeasurementRegion, number>;
  requiredRegions: MeasurementRegion[];
  variants: GarmentVariant[];
}

interface PublicFinding {
  region: MeasurementRegion;
  assessment: RegionalAssessment;
  reason: string;
}

interface ScoredVariant {
  variant: GarmentVariant;
  findings: PublicFinding[];
  differences: Map<MeasurementRegion, number>;
  violations: number;
  regionalWins: number;
  totalDifference: number;
  index: number;
}

export class ManualGarmentInputError extends Error {
  constructor(message = "Invalid manual garment fit request.") {
    super(message);
    this.name = "ManualGarmentInputError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function methodId(kind: ManualMeasurementKind, region: MeasurementRegion): string {
  const methodKind = kind === "garment_flat_width"
    ? "flat_width"
    : kind === "garment_length" ? "length" : "circumference";
  return `${MEASUREMENT_METHOD_VERSION}:${methodKind}:${region}`;
}

function kindsFor(region: MeasurementRegion): ManualMeasurementKind[] {
  return lengthRegions.has(region)
    ? ["garment_length"]
    : ["garment_flat_width", "garment_circumference"];
}

function target(targetProductId: string) {
  const style = catalog.styles.find((candidate) => candidate.productId === targetProductId);
  if (!style || !style.supported) {
    throw new ManualGarmentInputError("Choose a supported target product.");
  }
  const variants = style.variantIds
    .map((id) => catalog.variants.find((variant) => variant.id === id))
    .filter((variant): variant is GarmentVariant => Boolean(variant));
  if (variants.length !== style.variantIds.length) {
    throw new ManualGarmentInputError("The target product is missing measured size evidence.");
  }
  return { style, variants, requiredRegions: requiredRegionsForStyle(style, variants) };
}

export function listManualGarmentRequirements(targetProductId: string): ManualGarmentRequirement[] {
  if (typeof targetProductId !== "string" || targetProductId.length === 0) {
    throw new ManualGarmentInputError("Choose a supported target product.");
  }
  const { requiredRegions } = target(targetProductId);
  return requiredRegions.map((region) => {
    const acceptedKinds = kindsFor(region);
    return {
      region,
      label: labels[region],
      acceptedKinds,
      methodIds: acceptedKinds.map((kind) => methodId(kind, region)),
    };
  });
}

function descriptiveText(reference: Record<string, unknown>, key: "brandText" | "productText" | "labelSize"): string | undefined {
  if (!Object.hasOwn(reference, key)) return undefined;
  if (typeof reference[key] !== "string") {
    throw new ManualGarmentInputError(`${key} must be text.`);
  }
  return reference[key].trim().slice(0, 80);
}

function normalize(value: number, unit: MeasurementUnit, kind: ManualMeasurementKind): number {
  const centimetres = unit === "in" ? value * 2.54 : value;
  return Math.round((kind === "garment_flat_width" ? centimetres * 2 : centimetres) * 1000) / 1000;
}

function parseInput(value: unknown): NormalizedManualInput {
  if (!record(value)
    || !hasOnlyKeys(value, ["targetProductId", "preference", "reference"])
    || Object.keys(value).length !== 3
    || typeof value.targetProductId !== "string"
    || !preferences.has(value.preference as FitPreference)
    || !record(value.reference)) {
    throw new ManualGarmentInputError();
  }
  const targetEvidence = target(value.targetProductId);
  const reference = value.reference;
  if (!hasOnlyKeys(reference, ["brandText", "productText", "labelSize", "measurements", "observations"])
    || !Object.hasOwn(reference, "measurements")
    || !Object.hasOwn(reference, "observations")
    || !Array.isArray(reference.measurements)
    || !record(reference.observations)) {
    throw new ManualGarmentInputError("Reference evidence has unknown or missing fields.");
  }
  const required = new Set(targetEvidence.requiredRegions);
  const values = new Map<MeasurementRegion, number>();
  const parsedMeasurements: ManualReferenceGarmentRequest["reference"]["measurements"] = [];

  for (const candidate of reference.measurements) {
    if (!record(candidate)
      || Object.keys(candidate).length !== 5
      || !hasOnlyKeys(candidate, ["region", "value", "unit", "kind", "methodId"])
      || typeof candidate.region !== "string"
      || !regions.has(candidate.region as MeasurementRegion)) {
      throw new ManualGarmentInputError("A manual garment measurement is malformed.");
    }
    const region = candidate.region as MeasurementRegion;
    if (values.has(region)) throw new ManualGarmentInputError(`Duplicate ${region} measurement.`);
    if (!required.has(region)) throw new ManualGarmentInputError(`Irrelevant ${region} measurement.`);
    if (typeof candidate.value !== "number" || !Number.isFinite(candidate.value) || candidate.value <= 0
      || (candidate.unit !== "cm" && candidate.unit !== "in")
      || typeof candidate.kind !== "string"
      || typeof candidate.methodId !== "string") {
      throw new ManualGarmentInputError(`Invalid ${region} measurement.`);
    }
    const kind = candidate.kind as ManualMeasurementKind;
    if (!kindsFor(region).includes(kind)) {
      throw new ManualGarmentInputError(`Measurement kind is invalid for ${region}.`);
    }
    if (candidate.methodId !== methodId(kind, region)) {
      throw new ManualGarmentInputError(`Measurement method is invalid for ${region}.`);
    }
    const normalized = normalize(candidate.value, candidate.unit, kind);
    const [minimum, maximum] = lengthRegions.has(region) ? [5, 250] : [20, 350];
    if (normalized < minimum || normalized > maximum) {
      throw new ManualGarmentInputError(`Implausible ${region} measurement.`);
    }
    values.set(region, normalized);
    parsedMeasurements.push({
      region,
      value: candidate.value,
      unit: candidate.unit,
      kind,
      methodId: candidate.methodId,
    });
  }
  const missing = targetEvidence.requiredRegions.filter((region) => !values.has(region));
  if (missing.length > 0) {
    throw new ManualGarmentInputError(`Missing ${missing.join(" and ")} measurement evidence.`);
  }

  const parsedObservations: Partial<Record<MeasurementRegion, ReferenceObservation>> = {};
  for (const [regionName, observation] of Object.entries(reference.observations)) {
    if (!regions.has(regionName as MeasurementRegion) || !required.has(regionName as MeasurementRegion)) {
      throw new ManualGarmentInputError(`Observation for irrelevant region ${regionName}.`);
    }
    const region = regionName as MeasurementRegion;
    const allowed = lengthRegions.has(region) ? lengthObservations : circumferenceObservations;
    if (typeof observation !== "string" || !allowed.has(observation as ReferenceObservation)) {
      throw new ManualGarmentInputError(`Invalid observation for ${region}.`);
    }
    parsedObservations[region] = observation as ReferenceObservation;
  }

  return {
    request: {
      targetProductId: value.targetProductId,
      preference: value.preference as FitPreference,
      reference: {
        brandText: descriptiveText(reference, "brandText"),
        productText: descriptiveText(reference, "productText"),
        labelSize: descriptiveText(reference, "labelSize"),
        measurements: parsedMeasurements,
        observations: parsedObservations,
      },
    },
    values,
    requiredRegions: targetEvidence.requiredRegions,
    variants: targetEvidence.variants,
  };
}

function comparableTargetMeasurement(variant: GarmentVariant, region: MeasurementRegion): number | undefined {
  const measurement = variant.measurements.find((candidate) => candidate.region === region);
  if (!measurement || !kindsFor(region).includes(measurement.kind)) return undefined;
  if (measurement.methodId !== methodId(measurement.kind, region)) return undefined;
  return measurement.kind === "garment_flat_width" ? measurement.valueCm * 2 : measurement.valueCm;
}

function observationFor(
  observations: Partial<Record<MeasurementRegion, ReferenceObservation>>,
  region: MeasurementRegion,
): ReferenceObservation {
  return observations[region] ?? (lengthRegions.has(region) ? "right_length" : "just_right");
}

function directionViolated(difference: number, observation: ReferenceObservation): boolean {
  if (["too_tight", "slightly_tight", "too_short", "slightly_short"].includes(observation)) return difference <= 0;
  if (["too_loose", "slightly_loose", "too_long", "slightly_long"].includes(observation)) return difference >= 0;
  return false;
}

function publicFinding(region: MeasurementRegion, difference: number): PublicFinding {
  const similar = Math.abs(difference) <= 0.5;
  const relation = similar ? "similar to" : difference > 0 ? "larger than" : "smaller than";
  const assessment: RegionalAssessment = similar
    ? "FIT"
    : lengthRegions.has(region)
      ? difference > 0 ? "LONG" : "SHORT"
      : difference > 0 ? "LOOSE" : "TIGHT";
  return { region, assessment, reason: `${labels[region]} is ${relation} the measured reference garment.` };
}

function scoreVariants(input: NormalizedManualInput): ScoredVariant[] {
  const scores = input.variants.filter((variant) => variant.available).map((variant, index) => {
    const findings: PublicFinding[] = [];
    const differences = new Map<MeasurementRegion, number>();
    let violations = 0;
    let totalDifference = 0;
    for (const region of input.requiredRegions) {
      const referenceValue = input.values.get(region);
      const targetValue = comparableTargetMeasurement(variant, region);
      if (referenceValue === undefined || targetValue === undefined) {
        violations += 1;
        continue;
      }
      const difference = Math.round((targetValue - referenceValue) * 1000) / 1000;
      differences.set(region, difference);
      totalDifference += Math.abs(difference);
      if (directionViolated(difference, observationFor(input.request.reference.observations, region))) violations += 1;
      findings.push(publicFinding(region, difference));
    }
    return { variant, findings, differences, violations, regionalWins: 0, totalDifference, index };
  });
  const eligible = scores.filter((score) => score.violations === 0 && score.findings.length === input.requiredRegions.length);
  for (const region of input.requiredRegions) {
    const minimum = Math.min(...eligible.map((score) => Math.abs(score.differences.get(region) ?? Number.POSITIVE_INFINITY)));
    for (const score of eligible) {
      if (Math.abs(Math.abs(score.differences.get(region) ?? Number.POSITIVE_INFINITY) - minimum) < 0.001) {
        score.regionalWins += 1;
      }
    }
  }
  return eligible.sort((left, right) =>
    left.violations - right.violations
    || right.regionalWins - left.regionalWins
    || left.totalDifference - right.totalDifference
    || left.index - right.index);
}

function adjacent(left: GarmentVariant, right: GarmentVariant): boolean {
  if (left.size.systemId !== right.size.systemId) return false;
  const leftAxes = left.size.axes ?? {};
  const rightAxes = right.size.axes ?? {};
  const axes = [...new Set([...Object.keys(leftAxes), ...Object.keys(rightAxes)])] as Array<keyof typeof leftAxes>;
  if (axes.length === 0) return Math.abs(left.size.ordinal - right.size.ordinal) === 1;
  const changed = axes.filter((axis) => leftAxes[axis] !== rightAxes[axis]);
  if (changed.length !== 1) return false;
  const axis = changed[0];
  if (axis === "waist") return Math.abs(left.size.ordinal - right.size.ordinal) === 1;
  if (left.size.ordinal !== right.size.ordinal) return false;
  const leftValue = String(leftAxes[axis]);
  const rightValue = String(rightAxes[axis]);
  const delta = Math.abs(Number(leftValue) - Number(rightValue));
  if (Number.isFinite(delta)) return delta > 0 && delta <= 2;
  const order = [leftValue, rightValue].every((value) => ["P", "R", "T"].includes(value))
    ? ["P", "R", "T"] : ["S", "R", "L"];
  return Math.abs(order.indexOf(leftValue) - order.indexOf(rightValue)) === 1;
}

function regionWinners(scores: ScoredVariant[], region: MeasurementRegion): ScoredVariant[] {
  const minimum = Math.min(...scores.map((score) => Math.abs(score.differences.get(region) ?? Number.POSITIVE_INFINITY)));
  return scores.filter((score) => Math.abs(Math.abs(score.differences.get(region) ?? Number.POSITIVE_INFINITY) - minimum) < 0.001);
}

function tradeoff(scores: ScoredVariant[], requiredRegions: MeasurementRegion[]): [ScoredVariant, ScoredVariant] | undefined {
  for (let leftIndex = 0; leftIndex < scores.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < scores.length; rightIndex += 1) {
      const left = scores[leftIndex];
      const right = scores[rightIndex];
      if (left.violations !== right.violations || !adjacent(left.variant, right.variant)) continue;
      const leftWins = requiredRegions.some((region) => regionWinners(scores, region).includes(left) && !regionWinners(scores, region).includes(right));
      const rightWins = requiredRegions.some((region) => regionWinners(scores, region).includes(right) && !regionWinners(scores, region).includes(left));
      if (leftWins && rightWins) return [left, right];
    }
  }
  return undefined;
}

function resultShell(targetProductId: string, state: RecommendationState, requiredRegions: MeasurementRegion[]) {
  return {
    synthetic: true as const,
    targetProductId,
    result: {
      state,
      findings: [] as PublicFinding[],
      evidence: {
        used: ["manual_reference_garment"] as const,
        requiredRegions,
        supportedRegions: requiredRegions,
        missingRegions: [] as MeasurementRegion[],
        completeness: 1,
      },
      nextSteps: [] as string[],
      versions: {
        catalog: catalog.version,
        rules: catalog.ruleVersion,
        methods: catalog.measurementMethodVersion,
      },
    },
  };
}

export function getManualGarmentRecommendation(value: unknown) {
  const input = parseInput(value);
  const scores = scoreVariants(input);
  if (scores.length === 0) {
    const payload = resultShell(input.request.targetProductId, "NO_SUITABLE_SIZE", input.requiredRegions);
    payload.result.nextSteps = ["Use the retailer's size chart or choose a size manually."];
    return payload;
  }
  const options = tradeoff(scores, input.requiredRegions);
  if (options) {
    const payload = resultShell(input.request.targetProductId, "TRADEOFF", input.requiredRegions);
    const [primary, alternate] = options;
    return {
      ...payload,
      result: {
        ...payload.result,
        optionPriority: "equal" as const,
        recommendedSizeLabel: primary.variant.size.label,
        alternateSizeLabel: alternate.variant.size.label,
        findings: primary.findings,
        options: options.map((option) => ({ sizeLabel: option.variant.size.label, findings: option.findings })),
        nextSteps: ["These adjacent sizes favor different measured regions. Choose the regional trade-off you prefer."],
      },
    };
  }
  const payload = resultShell(input.request.targetProductId, "RECOMMENDED", input.requiredRegions);
  return {
    ...payload,
    result: {
      ...payload.result,
      recommendedSizeLabel: scores[0].variant.size.label,
      findings: scores[0].findings,
      nextSteps: ["Closest measured match to your garment."],
    },
  };
}

function json(payload: unknown, status: number): Response {
  return Response.json(payload, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleManualGarmentRequest(request: Request): Promise<Response> {
  try {
    if (request.method === "GET") {
      const searchParams = new URL(request.url).searchParams;
      const targetProductId = searchParams.get("targetProductId");
      if (!targetProductId || [...searchParams.keys()].some((key) => key !== "targetProductId")) {
        throw new ManualGarmentInputError("Choose a supported target product.");
      }
      return json({ requirements: listManualGarmentRequirements(targetProductId) }, 200);
    }
    if (request.method !== "POST") throw new ManualGarmentInputError("Use GET or POST for manual garment evidence.");
    const input = await request.json().catch(() => {
      throw new ManualGarmentInputError("Enter valid manual garment evidence.");
    });
    return json(getManualGarmentRecommendation(input), 200);
  } catch (error) {
    if (error instanceof ManualGarmentInputError) return json({ error: error.message }, 400);
    return json({ error: "Unable to compare the measured garment right now." }, 500);
  }
}
