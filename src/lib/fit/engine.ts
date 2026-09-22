import {
  type CompatibleRange,
  type FitCatalog,
  type FitProfileEvidence,
  type FitStyle,
  type GarmentVariant,
  type MeasurementInput,
  type MeasurementRegion,
  type RecommendationRequest,
  type RecommendationResult,
  type RecommendationState,
  type ReferenceObservation,
  type RegionalAssessment,
  type RegionalFinding,
} from "./types";

const LENGTH_REGIONS = new Set<MeasurementRegion>([
  "body_length",
  "sleeve_length",
  "rise",
  "inseam",
  "outseam",
]);

const BODY_LENGTH_KIND_REGIONS = new Set<MeasurementRegion>([
  "shoulder_cross_back",
  "body_length",
  "sleeve_length",
  "rise",
  "inseam",
  "outseam",
]);

const MEASUREMENT_REGIONS = new Set<MeasurementRegion>([
  "chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length",
  "sleeve_length", "neck", "upper_arm", "rise", "thigh", "inseam",
  "outseam", "leg_opening", "hem_sweep",
]);

const LENGTH_OBSERVATIONS = new Set<ReferenceObservation>([
  "too_short", "slightly_short", "right_length", "slightly_long", "too_long",
]);
const CIRCUMFERENCE_OBSERVATIONS = new Set<ReferenceObservation>([
  "too_tight", "slightly_tight", "just_right", "slightly_loose", "too_loose",
]);

function isSupportedBodyMethod(input: MeasurementInput): boolean {
  if (input.source === "shopper_entered") return input.methodId === "body-self-reported-v1";
  if (input.source === "saved_profile") return input.methodId === "saved-profile-v1";
  if (input.source === "synthetic_fixture") return input.methodId === `synthetic-profile-1.0.0:${input.region}`;
  return false;
}

interface EvidenceResolution {
  values: Map<MeasurementRegion, number>;
  used: Array<"body_measurement" | "reference_garment">;
  normalizedMeasurements: RecommendationResult["evidence"]["normalizedMeasurements"];
  referenceVariantId?: string;
  invalid?: string;
  conflict?: string;
  garmentFailure?: string;
  unsupported?: string;
}

interface ScoredVariant {
  variant: GarmentVariant;
  findings: RegionalFinding[];
  criticalMisses: number;
  secondaryMisses: number;
  totalOutsideCm: number;
  centerDistance: number;
}

function toCm(input: MeasurementInput): number {
  return input.unit === "in" ? input.value * 2.54 : input.value;
}

function garmentMeasurementValueCm(measurement: GarmentVariant["measurements"][number]): number {
  return measurement.kind === "garment_flat_width" ? measurement.valueCm * 2 : measurement.valueCm;
}

function isExpectedGarmentMeasurement(
  measurement: GarmentVariant["measurements"][number],
  region: MeasurementRegion,
  methodVersion: string,
): boolean {
  const isLength = BODY_LENGTH_KIND_REGIONS.has(region);
  const expectedKind = isLength
    ? measurement.kind === "garment_length"
    : measurement.kind === "garment_circumference" || measurement.kind === "garment_flat_width";
  const methodKind = measurement.kind === "garment_flat_width" ? "flat_width" : isLength ? "length" : "circumference";
  return expectedKind && measurement.methodId === `${methodVersion}:${methodKind}:${region}`;
}

function axisRequiredRegions(
  fitFamily: string,
  variants: GarmentVariant[],
): MeasurementRegion[] {
  const required = new Set<MeasurementRegion>();
  for (const variant of variants) {
    const axes = variant.size.axes;
    if (!axes) continue;
    if (axes.waist) required.add("waist");
    if (axes.inseam) required.add("inseam");
    if (axes.neck) required.add("neck");
    if (axes.sleeve) required.add("sleeve_length");
    if (axes.length) required.add(fitFamily === "bottoms" ? "inseam" : "body_length");
  }
  return [...required];
}

export function requiredRegionsForStyle(style: FitStyle, variants: GarmentVariant[]): MeasurementRegion[] {
  return [...new Set([...style.criticalRegions, ...axisRequiredRegions(style.fitFamily, variants)])];
}

function resultShell(
  catalog: FitCatalog,
  request: RecommendationRequest,
  state: RecommendationState,
  requiredRegions: MeasurementRegion[],
  values: Map<MeasurementRegion, number>,
  used: Array<"body_measurement" | "reference_garment">,
  nextSteps: string[],
  normalizedMeasurements: RecommendationResult["evidence"]["normalizedMeasurements"] = [],
  referenceVariantId?: string,
): RecommendationResult {
  const supportedRegions = requiredRegions.filter((region) => values.has(region));
  return {
    state,
    targetProductId: request.targetProductId,
    findings: [],
    evidence: {
      used,
      requiredRegions,
      supportedRegions,
      missingRegions: requiredRegions.filter((region) => !values.has(region)),
      completeness: requiredRegions.length === 0 ? 0 : supportedRegions.length / requiredRegions.length,
      normalizedMeasurements,
      referenceVariantId,
    },
    nextSteps,
    versions: {
      catalog: catalog.version,
      rules: catalog.ruleVersion,
      methods: catalog.measurementMethodVersion,
    },
  };
}

function observationEstimate(baseEstimateCm: number, observation: ReferenceObservation): number {
  switch (observation) {
    case "too_tight": return baseEstimateCm + 2;
    case "slightly_tight": return baseEstimateCm + 0.8;
    case "too_loose": return baseEstimateCm - 2;
    case "slightly_loose": return baseEstimateCm - 0.8;
    case "too_short": return baseEstimateCm + 2.5;
    case "slightly_short": return baseEstimateCm + 1;
    case "too_long": return baseEstimateCm - 2.5;
    case "slightly_long": return baseEstimateCm - 1;
    case "right_length":
    case "just_right":
      return baseEstimateCm;
  }
}

function resolveEvidence(
  catalog: FitCatalog,
  targetFamily: string,
  profile: FitProfileEvidence,
): EvidenceResolution {
  const values = new Map<MeasurementRegion, number>();
  const used: EvidenceResolution["used"] = [];
  const normalizedMeasurements: EvidenceResolution["normalizedMeasurements"] = [];

  if (profile.measurements.length > 0) {
    used.push("body_measurement");
  }
  for (const input of profile.measurements) {
    if (!MEASUREMENT_REGIONS.has(input.region)) {
      return { values, used, normalizedMeasurements, unsupported: `Unknown measurement region: ${String(input.region)}.` };
    }
    if (!Number.isFinite(input.value) || input.value <= 0 || (input.unit !== "cm" && input.unit !== "in")) {
      return { values, used, normalizedMeasurements, invalid: `Invalid ${input.region} measurement; enter a positive number with cm or in.` };
    }
    const expectedKind = BODY_LENGTH_KIND_REGIONS.has(input.region) ? "body_length" : "body_circumference";
    if (input.kind !== expectedKind) {
      return { values, used, normalizedMeasurements, unsupported: `${input.region} requires ${expectedKind}; received ${input.kind}.` };
    }
    if (!isSupportedBodyMethod(input)
      || !["shopper_entered", "saved_profile", "synthetic_fixture"].includes(input.source)) {
      return { values, used, normalizedMeasurements, unsupported: `${input.region} uses an unsupported or incomplete measurement method.` };
    }
    const normalized = Math.round(toCm(input) * 1000) / 1000;
    const previous = values.get(input.region);
    if (previous !== undefined && Math.abs(previous - normalized) > 0.05) {
      return { values, used, normalizedMeasurements, conflict: `Two ${input.region} measurements disagree.` };
    }
    values.set(input.region, normalized);
    normalizedMeasurements.push({
      region: input.region,
      originalValue: input.value,
      originalUnit: input.unit,
      valueCm: normalized,
      kind: input.kind,
      methodId: input.methodId,
      source: input.source,
    });
  }

  const reference = profile.referenceGarment;
  if (!reference) return { values, used, normalizedMeasurements };

  const anchor = catalog.variants.find((variant) => variant.id === reference.variantId);
  if (!anchor) {
    return { values, used, normalizedMeasurements, garmentFailure: "The known garment must reference an exact catalog variant." };
  }
  const anchorStyle = catalog.styles.find((style) => style.productId === anchor.productId);
  if (!anchorStyle || anchorStyle.fitFamily !== targetFamily) {
    return { values, used, normalizedMeasurements, garmentFailure: "The known garment is not compatible with the target fit family." };
  }

  used.push("reference_garment");
  for (const [regionName, observation] of Object.entries(reference.observations)) {
    if (!observation) continue;
    const region = regionName as MeasurementRegion;
    const allowedObservations = BODY_LENGTH_KIND_REGIONS.has(region) ? LENGTH_OBSERVATIONS : CIRCUMFERENCE_OBSERVATIONS;
    if (!MEASUREMENT_REGIONS.has(region) || !allowedObservations.has(observation)) {
      return { values, used, normalizedMeasurements, referenceVariantId: anchor.id, unsupported: `The ${String(observation)} observation is invalid for ${region}.` };
    }
    const storedMeasurement = anchor.measurements.find((measurement) => measurement.region === region);
    const wearerEase = anchor.wearerEaseCm.regular[region];
    if (!storedMeasurement
      || !isExpectedGarmentMeasurement(storedMeasurement, region, catalog.measurementMethodVersion)
      || wearerEase === undefined) {
      return { values, used, normalizedMeasurements, referenceVariantId: anchor.id, garmentFailure: `The known garment lacks ${region} geometry or wearer-ease evidence.` };
    }
    const estimate = observationEstimate(garmentMeasurementValueCm(storedMeasurement) - wearerEase, observation);
    const previous = values.get(region);
    const tolerance = LENGTH_REGIONS.has(region) ? 2 : 3;
    if (previous !== undefined && Math.abs(previous - estimate) > tolerance) {
      return { values, used, normalizedMeasurements, referenceVariantId: anchor.id, conflict: `Body and known-garment evidence disagree for ${region}.` };
    }
    if (previous === undefined) values.set(region, Math.round(estimate * 1000) / 1000);
  }

  return { values, used, normalizedMeasurements, referenceVariantId: anchor.id };
}

function assess(value: number, range: CompatibleRange, region: MeasurementRegion): RegionalAssessment {
  if (value >= range.minCm && value <= range.maxCm) return "FIT";
  if (LENGTH_REGIONS.has(region)) return value < range.minCm ? "LONG" : "SHORT";
  return value < range.minCm ? "LOOSE" : "TIGHT";
}

function outsideDistance(value: number, range: CompatibleRange): number {
  if (value < range.minCm) return range.minCm - value;
  if (value > range.maxCm) return value - range.maxCm;
  return 0;
}

function findingReason(
  region: MeasurementRegion,
  assessment: RegionalAssessment,
  value: number,
  range: CompatibleRange,
): string {
  if (assessment === "FIT") return `${region} is within this size's synthetic compatible interval.`;
  if (assessment === "TIGHT") return `${region} exceeds this size's synthetic compatible interval.`;
  if (assessment === "LOOSE") return `${region} is below this size's synthetic compatible interval.`;
  if (assessment === "SHORT") return `${region} is longer than this size's supported interval.`;
  if (assessment === "LONG") return `${region} is shorter than this size's supported interval.`;
  return `${region} could not be compared (${value} cm versus ${range.minCm}-${range.maxCm} cm).`;
}

function scoreVariant(
  variant: GarmentVariant,
  request: RecommendationRequest,
  values: Map<MeasurementRegion, number>,
  criticalRegions: MeasurementRegion[],
  secondaryRegions: MeasurementRegion[],
): ScoredVariant | undefined {
  const ranges = variant.compatibleBodyRanges[request.preference];
  const comparedRegions = [...criticalRegions, ...secondaryRegions].filter((region) => values.has(region));
  const findings: RegionalFinding[] = [];
  let criticalMisses = 0;
  let secondaryMisses = 0;
  let totalOutsideCm = 0;
  let centerDistance = 0;

  for (const region of comparedRegions) {
    const value = values.get(region);
    const range = ranges[region];
    if (value === undefined || !range) return undefined;
    const assessment = assess(value, range, region);
    const distance = outsideDistance(value, range);
    totalOutsideCm += distance;
    centerDistance += Math.abs(value - ((range.minCm + range.maxCm) / 2));
    if (assessment !== "FIT") {
      if (criticalRegions.includes(region)) criticalMisses += 1;
      else secondaryMisses += 1;
    }
    findings.push({
      region,
      assessment,
      evidenceValueCm: Math.round(value * 100) / 100,
      compatibleRangeCm: range,
      reason: findingReason(region, assessment, value, range),
    });
  }

  return { variant, findings, criticalMisses, secondaryMisses, totalOutsideCm, centerDistance };
}

function sortScores(left: ScoredVariant, right: ScoredVariant): number {
  return left.criticalMisses - right.criticalMisses
    || left.secondaryMisses - right.secondaryMisses
    || left.totalOutsideCm - right.totalOutsideCm
    || left.centerDistance - right.centerDistance
    || left.variant.size.ordinal - right.variant.size.ordinal;
}

function findingDistance(finding: RegionalFinding): number {
  if (finding.evidenceValueCm === undefined || !finding.compatibleRangeCm) return Number.POSITIVE_INFINITY;
  return outsideDistance(finding.evidenceValueCm, finding.compatibleRangeCm);
}

function findRegionalTradeoff(scores: ScoredVariant[]): [ScoredVariant, ScoredVariant] | undefined {
  const plausible = scores.filter((score) => score.totalOutsideCm <= 6).slice(0, 4);
  for (let leftIndex = 0; leftIndex < plausible.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < plausible.length; rightIndex += 1) {
      const left = plausible[leftIndex];
      const right = plausible[rightIndex];
      if (!areAdjacentSizes(left.variant, right.variant)) continue;
      let leftWins = false;
      let rightWins = false;
      for (const leftFinding of left.findings) {
        const rightFinding = right.findings.find((finding) => finding.region === leftFinding.region);
        if (!rightFinding) continue;
        const leftDistance = findingDistance(leftFinding);
        const rightDistance = findingDistance(rightFinding);
        if (rightDistance - leftDistance >= 0.5) leftWins = true;
        if (leftDistance - rightDistance >= 0.5) rightWins = true;
      }
      if (leftWins && rightWins) return [left, right];
    }
  }
  return undefined;
}

function areAdjacentSizes(left: GarmentVariant, right: GarmentVariant): boolean {
  if (left.size.systemId !== right.size.systemId) return false;
  const leftAxes = left.size.axes ?? {};
  const rightAxes = right.size.axes ?? {};
  const keys = [...new Set([...Object.keys(leftAxes), ...Object.keys(rightAxes)])] as Array<keyof typeof leftAxes>;
  if (keys.length === 0) return Math.abs(left.size.ordinal - right.size.ordinal) === 1;
  const changed = keys.filter((key) => leftAxes[key] !== rightAxes[key]);
  if (changed.length !== 1) return false;
  const axis = changed[0];
  if (axis === "waist") return Math.abs(left.size.ordinal - right.size.ordinal) === 1;
  if (left.size.ordinal !== right.size.ordinal) return false;
  const leftValue = leftAxes[axis];
  const rightValue = rightAxes[axis];
  const numericDelta = Math.abs(Number(leftValue) - Number(rightValue));
  if (Number.isFinite(numericDelta)) return numericDelta > 0 && numericDelta <= 2;
  const pair = [String(leftValue), String(rightValue)];
  const ordered = pair.every((value) => ["P", "R", "T"].includes(value))
    ? ["P", "R", "T"]
    : ["S", "R", "L"];
  const leftIndex = ordered.indexOf(String(leftValue));
  const rightIndex = ordered.indexOf(String(rightValue));
  return leftIndex >= 0 && rightIndex >= 0 && Math.abs(leftIndex - rightIndex) === 1;
}

export function recommendFit(catalog: FitCatalog, request: RecommendationRequest): RecommendationResult {
  if (!["closer", "regular", "relaxed"].includes(request.preference)) {
    return resultShell(catalog, request, "UNSUPPORTED", [], new Map(), [], [
      `Unknown fit preference: ${String(request.preference)}.`,
    ]);
  }
  const style = catalog.styles.find((candidate) => candidate.productId === request.targetProductId);
  if (!style || !style.supported) {
    return resultShell(catalog, request, "UNSUPPORTED", [], new Map(), [], [
      "Choose a product with a supported garment type and measurement method.",
    ]);
  }

  const targetVariants = style.variantIds
    .map((id) => catalog.variants.find((variant) => variant.id === id))
    .filter((variant): variant is GarmentVariant => Boolean(variant));
  const requiredRegions = requiredRegionsForStyle(style, targetVariants);
  const secondaryRegions = style.secondaryRegions.filter((region) => !requiredRegions.includes(region));
  const broken = targetVariants.length !== style.variantIds.length || targetVariants.some((variant) => requiredRegions.some((region) => {
    return !variant.compatibleBodyRanges[request.preference][region]
      || variant.wearerEaseCm[request.preference][region] === undefined
      || !variant.measurements.some((measurement) => measurement.region === region
        && isExpectedGarmentMeasurement(measurement, region, catalog.measurementMethodVersion));
  }));
  if (broken) {
    return resultShell(catalog, request, "INSUFFICIENT_GARMENT_EVIDENCE", requiredRegions, new Map(), [], [
      "The target product is missing required, method-tagged garment geometry or wearer-ease evidence.",
    ]);
  }

  const evidence = resolveEvidence(catalog, style.fitFamily, request.profile);
  if (evidence.unsupported) {
    return resultShell(catalog, request, "UNSUPPORTED", requiredRegions, evidence.values, evidence.used, [evidence.unsupported], evidence.normalizedMeasurements, evidence.referenceVariantId);
  }
  if (evidence.invalid) {
    return resultShell(catalog, request, "INSUFFICIENT_PROFILE_EVIDENCE", requiredRegions, evidence.values, evidence.used, [evidence.invalid], evidence.normalizedMeasurements, evidence.referenceVariantId);
  }
  if (evidence.conflict) {
    const result = resultShell(catalog, request, "CONFLICTING_EVIDENCE", requiredRegions, evidence.values, evidence.used, [evidence.conflict, "Review the conflicting value before requesting another recommendation."], evidence.normalizedMeasurements, evidence.referenceVariantId);
    return result;
  }
  if (evidence.garmentFailure) {
    return resultShell(catalog, request, "INSUFFICIENT_GARMENT_EVIDENCE", requiredRegions, evidence.values, evidence.used, [evidence.garmentFailure], evidence.normalizedMeasurements, evidence.referenceVariantId);
  }
  if (evidence.used.length === 0) {
    return resultShell(catalog, request, "INSUFFICIENT_PROFILE_EVIDENCE", requiredRegions, evidence.values, evidence.used, [
      `Add ${requiredRegions.join(" and ")} measurements, or select an exact known garment and size.`,
    ], evidence.normalizedMeasurements, evidence.referenceVariantId);
  }

  const missingCritical = requiredRegions.filter((region) => !evidence.values.has(region));
  if (missingCritical.length > 0) {
    return resultShell(catalog, request, "INSUFFICIENT_PROFILE_EVIDENCE", requiredRegions, evidence.values, evidence.used, [
      `Add ${missingCritical.join(" and ")} evidence for this ${style.garmentType}.`,
    ], evidence.normalizedMeasurements, evidence.referenceVariantId);
  }

  const allowed = request.availableVariantIds ? new Set(request.availableVariantIds) : undefined;
  const candidates = targetVariants
    .filter((variant): variant is GarmentVariant => Boolean(variant?.available && (!allowed || allowed.has(variant.id))));

  if (candidates.length === 0) {
    return resultShell(catalog, request, "NO_SUITABLE_SIZE", requiredRegions, evidence.values, evidence.used, [
      "No available size can be evaluated for this product.",
    ], evidence.normalizedMeasurements, evidence.referenceVariantId);
  }

  const scores = candidates
    .map((variant) => scoreVariant(variant, request, evidence.values, requiredRegions, secondaryRegions))
    .filter((score): score is ScoredVariant => Boolean(score))
    .sort(sortScores);
  const best = scores[0];
  if (!best) {
    return resultShell(catalog, request, "INSUFFICIENT_GARMENT_EVIDENCE", requiredRegions, evidence.values, evidence.used, [
      "The target product does not contain comparable measurement regions.",
    ], evidence.normalizedMeasurements, evidence.referenceVariantId);
  }

  const complete = resultShell(catalog, request, "RECOMMENDED", requiredRegions, evidence.values, evidence.used, [], evidence.normalizedMeasurements, evidence.referenceVariantId);
  complete.findings = best.findings;

  if (best.criticalMisses === 0 && best.secondaryMisses === 0) {
    return {
      ...complete,
      state: "RECOMMENDED",
      recommendedVariantId: best.variant.id,
      recommendedSizeLabel: best.variant.size.label,
      nextSteps: [],
    };
  }

  const tradeoff = findRegionalTradeoff(scores);
  if (tradeoff) {
    const [primary, alternate] = tradeoff.sort(sortScores);
    return {
      ...complete,
      state: "TRADEOFF",
      optionPriority: "equal",
      findings: primary.findings,
      recommendedVariantId: primary.variant.id,
      recommendedSizeLabel: primary.variant.size.label,
      alternateVariantId: alternate.variant.id,
      alternateSizeLabel: alternate.variant.size.label,
      options: [primary, alternate].map((option) => ({
        variantId: option.variant.id,
        sizeLabel: option.variant.size.label,
        findings: option.findings,
      })),
      nextSteps: ["These adjacent sizes are equally ranked. Choose based on which regional fit you prefer."],
    };
  }

  if (best.criticalMisses === 0) {
    return {
      ...complete,
      state: "RECOMMENDED",
      recommendedVariantId: best.variant.id,
      recommendedSizeLabel: best.variant.size.label,
      nextSteps: best.secondaryMisses > 0 ? ["Review the secondary regional finding before choosing."] : [],
    };
  }

  return {
    ...complete,
    state: "NO_SUITABLE_SIZE",
    nextSteps: ["Use the retailer's size chart or choose another style with a compatible range."],
  };
}
