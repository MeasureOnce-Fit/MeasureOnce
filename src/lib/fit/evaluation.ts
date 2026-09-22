import { buildSyntheticCatalog } from "./catalog";
import { recommendFit } from "./engine";
import { buildBaseFitProfiles, buildProfilePreferenceCases } from "./fixtures";
import { GOLDEN_CASES } from "./golden-cases";
import {
  type EvaluationComparisonEvidence,
  type EvaluationProductEvidence,
  type EvaluationReferenceEvidence,
  type EvaluationReport,
  type EvaluationSizeEvidence,
  type FitCatalog,
  type FitStyle,
  type GarmentVariant,
  type MeasurementInput,
  type MeasurementRegion,
  type RecommendationRequest,
  type RecommendationState,
} from "./types";

const ALL_STATES: RecommendationState[] = [
  "RECOMMENDED",
  "TRADEOFF",
  "INSUFFICIENT_PROFILE_EVIDENCE",
  "INSUFFICIENT_GARMENT_EVIDENCE",
  "CONFLICTING_EVIDENCE",
  "NO_SUITABLE_SIZE",
  "UNSUPPORTED",
];

const LENGTH_REGIONS = new Set<MeasurementRegion>([
  "shoulder_cross_back", "body_length", "sleeve_length", "rise", "inseam", "outseam",
]);

function axisRegions(style: FitStyle, variant: GarmentVariant): MeasurementRegion[] {
  const regions = new Set<MeasurementRegion>();
  if (variant.size.axes?.waist) regions.add("waist");
  if (variant.size.axes?.inseam) regions.add("inseam");
  if (variant.size.axes?.neck) regions.add("neck");
  if (variant.size.axes?.sleeve) regions.add("sleeve_length");
  if (variant.size.axes?.length) regions.add(style.fitFamily === "bottoms" ? "inseam" : "body_length");
  return [...regions];
}

function validMeasurementMethod(
  catalog: FitCatalog,
  measurement: GarmentVariant["measurements"][number],
): boolean {
  const methodKind = measurement.kind === "garment_flat_width"
    ? "flat_width"
    : measurement.kind === "garment_length" ? "length" : "circumference";
  return measurement.methodId === `${catalog.measurementMethodVersion}:${methodKind}:${measurement.region}`;
}

export function validateFitCatalog(catalog: FitCatalog): string[] {
  const errors: string[] = [];
  const brandIds = new Set(catalog.brands.map((brand) => brand.id));
  const styleIds = new Set<string>();
  const variantIds = new Set<string>();

  if (catalog.brands.length !== 10) errors.push(`Expected 10 brands; found ${catalog.brands.length}.`);
  if (brandIds.size !== catalog.brands.length) errors.push("Brand IDs must be unique.");
  if (catalog.styles.length !== 200) errors.push(`Expected 200 styles; found ${catalog.styles.length}.`);
  if (catalog.variants.length < 1_200) errors.push(`Expected at least 1,200 variants; found ${catalog.variants.length}.`);

  for (const style of catalog.styles) {
    if (styleIds.has(style.productId)) errors.push(`Duplicate style ID: ${style.productId}.`);
    styleIds.add(style.productId);
    if (!brandIds.has(style.brandId)) errors.push(`Unknown brand ${style.brandId} on ${style.productId}.`);
    if (style.variantIds.length < 6) errors.push(`${style.productId} must retain at least six variants.`);
    if (style.sourceSizeLabels.length !== 6) errors.push(`${style.productId} must preserve its six source size labels.`);
    if (!style.sourceImage || style.sourceImages?.length !== 3) errors.push(`${style.productId} lost its source photo references.`);
    const linked = style.variantIds.map((id) => catalog.variants.find((variant) => variant.id === id));
    if (linked.some((variant) => !variant)) errors.push(`${style.productId} has a dangling variant ID.`);
    if (linked.some((variant) => variant && variant.brandId !== style.brandId)) errors.push(`${style.productId} has a variant/brand mismatch.`);
    const labels = linked.flatMap((variant) => variant ? [variant.size.label] : []);
    if (new Set(labels).size !== labels.length) errors.push(`${style.productId} has duplicate sellable size labels.`);
    for (let sourceSizeIndex = 0; sourceSizeIndex < style.sourceSizeLabels.length; sourceSizeIndex += 1) {
      const sourceSizeLabel = style.sourceSizeLabels[sourceSizeIndex];
      if (!linked.some((variant) => variant?.sourceSizeIndex === sourceSizeIndex && variant.sourceSizeLabel === sourceSizeLabel)) {
        errors.push(`${style.productId} source size ${sourceSizeIndex}:${sourceSizeLabel} has no generated variant.`);
      }
    }
    const ordinals = linked.flatMap((variant) => variant ? [variant.size.ordinal] : []);
    if (ordinals.some((ordinal, index) => index > 0 && ordinal < ordinals[index - 1])) errors.push(`${style.productId} has unordered size ordinals.`);
    const axisGroups = new Map<string, GarmentVariant[]>();
    for (const variant of linked.flatMap((candidate) => candidate ? [candidate] : [])) {
      const axisKey = `${variant.size.axes?.length ?? ""}|${variant.size.axes?.inseam ?? ""}|${variant.size.axes?.sleeve ?? ""}`;
      const group = axisGroups.get(axisKey) ?? [];
      group.push(variant);
      axisGroups.set(axisKey, group);
      if (!variant.size.systemId.includes(style.brandId) || !variant.size.systemId.includes(style.garmentType) || !variant.size.systemId.endsWith(":US")) {
        errors.push(`Variant ${variant.id} lacks brand, garment-type, or market size-system scope.`);
      }
    }
    for (const [axisKey, group] of axisGroups.entries()) {
      const ordered = [...group].sort((left, right) => left.size.ordinal - right.size.ordinal);
      for (const region of style.criticalRegions) {
        let previous = Number.NEGATIVE_INFINITY;
        for (const variant of ordered) {
          const range = variant.compatibleBodyRanges.regular[region];
          if (!range) continue;
          const center = (range.minCm + range.maxCm) / 2;
          if (variant.size.ordinal > ordered[0].size.ordinal && center <= previous) {
            errors.push(`${style.productId} has non-monotonic ${region} grading for axis ${axisKey}.`);
            break;
          }
          previous = center;
        }
      }
    }
  }

  for (const variant of catalog.variants) {
    if (variantIds.has(variant.id)) errors.push(`Duplicate variant ID: ${variant.id}.`);
    variantIds.add(variant.id);
    const style = catalog.styles.find((candidate) => candidate.productId === variant.productId);
    if (!style) {
      errors.push(`Variant ${variant.id} has no style.`);
      continue;
    }
    if (variant.provenance.type !== "synthetic" || !variant.provenance.generatorVersion) {
      errors.push(`Variant ${variant.id} lacks synthetic provenance.`);
    }
    if (variant.sourceSizeIndex < 0
      || variant.sourceSizeIndex >= style.sourceSizeLabels.length
      || variant.sourceSizeLabel !== style.sourceSizeLabels[variant.sourceSizeIndex]) {
      errors.push(`Variant ${variant.id} has invalid source-size traceability.`);
    }
    for (const measurement of variant.measurements) {
      if (!Number.isFinite(measurement.valueCm) || measurement.valueCm <= 0) errors.push(`Variant ${variant.id} has an invalid ${measurement.region} value.`);
      if (!validMeasurementMethod(catalog, measurement)) errors.push(`Variant ${variant.id} uses an invalid measurement method for ${measurement.region}.`);
      const isLength = LENGTH_REGIONS.has(measurement.region);
      const correctKind = isLength
        ? measurement.kind === "garment_length"
        : measurement.kind === "garment_circumference" || measurement.kind === "garment_flat_width";
      if (!correctKind) errors.push(`Variant ${variant.id} has the wrong kind for ${measurement.region}.`);
    }
    for (const region of [...new Set([...style.criticalRegions, ...axisRegions(style, variant)])]) {
      if (!variant.measurements.some((measurement) => measurement.region === region && measurement.methodId)) {
        errors.push(`Variant ${variant.id} lacks method-tagged ${region}.`);
      }
      for (const preference of ["closer", "regular", "relaxed"] as const) {
        const range = variant.compatibleBodyRanges[preference][region];
        if (!range || !Number.isFinite(range.minCm) || !Number.isFinite(range.maxCm) || range.minCm >= range.maxCm) {
          errors.push(`Variant ${variant.id} has invalid ${preference} ${region} range.`);
        }
        if (!Number.isFinite(variant.wearerEaseCm[preference][region])) {
          errors.push(`Variant ${variant.id} has invalid ${preference} wearer ease for ${region}.`);
        }
      }
    }
    if ((variant.size.format === "denim_waist" || variant.size.format === "waist_inseam") && style.fitFamily !== "bottoms") {
      errors.push(`Variant ${variant.id} uses a bottoms-only size format on ${style.fitFamily}.`);
    }
    if (variant.size.format === "waist_inseam" && (!variant.size.axes?.waist || !variant.size.axes?.inseam)) {
      errors.push(`Variant ${variant.id} lacks waist/inseam axes.`);
    }
    if (variant.size.format === "neck_sleeve" && (!variant.size.axes?.neck || !variant.size.axes?.sleeve)) {
      errors.push(`Variant ${variant.id} lacks neck/sleeve axes.`);
    }
    if (variant.size.format === "jacket_chest_length" && !variant.size.axes?.length) {
      errors.push(`Variant ${variant.id} lacks a jacket length axis.`);
    }
  }

  for (const fixture of catalog.comparisonFixtures) {
    if (fixture.style.productId !== fixture.id || fixture.style.brandId !== fixture.brandId) {
      errors.push(`Comparison fixture ${fixture.id} has inconsistent style identity.`);
    }
    if (fixture.variants.length < 6 || fixture.style.variantIds.length !== fixture.variants.length) {
      errors.push(`Comparison fixture ${fixture.id} lacks executable size variants.`);
    }
    if (fixture.variants.some((variant) => variant.productId !== fixture.id || variant.brandId !== fixture.brandId)) {
      errors.push(`Comparison fixture ${fixture.id} has inconsistent variant identity.`);
    }
    for (const variant of fixture.variants) {
      for (const region of [...new Set([...fixture.style.criticalRegions, ...axisRegions(fixture.style, variant)])]) {
        const measurement = variant.measurements.find((entry) => entry.region === region);
        if (!measurement || !validMeasurementMethod(catalog, measurement)
          || !variant.compatibleBodyRanges.regular[region]) {
          errors.push(`Comparison fixture ${fixture.id} cannot evaluate ${region}.`);
        }
      }
    }
  }

  const brandCounts = catalog.brands.map((brand) => catalog.styles.filter((style) => style.brandId === brand.id).length);
  if (brandCounts.some((count) => count !== 20)) errors.push(`Brand distribution is not balanced: ${brandCounts.join(", ")}.`);

  const pairs = new Set(catalog.styles.map((style) => `${style.department}|${style.merchandisingCategory}`));
  const categories = new Set(catalog.styles.map((style) => style.merchandisingCategory));
  if (pairs.size !== 17) errors.push(`Expected 17 department/category pairs; found ${pairs.size}.`);
  if (categories.size !== 11) errors.push(`Expected 11 navigation categories; found ${categories.size}.`);
  for (const pair of pairs) {
    const represented = new Set([
      ...catalog.styles.filter((style) => `${style.department}|${style.merchandisingCategory}` === pair).map((style) => style.brandId),
      ...catalog.comparisonFixtures.filter((fixture) => `${fixture.department}|${fixture.merchandisingCategory}` === pair).map((fixture) => fixture.brandId),
    ]);
    if (represented.size < 3) errors.push(`${pair} has fewer than three brands across visible and data-only fixtures.`);
  }

  const families = new Set(catalog.styles.map((style) => style.fitFamily));
  for (const family of families) {
    const familyBrands = new Set(catalog.styles.filter((style) => style.fitFamily === family).map((style) => style.brandId));
    if (familyBrands.size < 3) errors.push(`Fit family ${family} has fewer than three brands.`);
  }

  const womenFormats = new Set(catalog.styles.filter((style) => style.department === "Women").flatMap((style) =>
    catalog.variants.filter((variant) => variant.productId === style.productId).map((variant) => variant.size.format),
  ));
  for (const format of ["alpha", "us_numeric", "us_plus", "denim_waist", "waist_inseam", "petite_numeric", "tall_numeric", "grouped_numeric", "eu_numeric"]) {
    if (!womenFormats.has(format as never)) errors.push(`Women's catalog lacks ${format}.`);
  }
  if (!catalog.variants.some((variant) => variant.size.systemId.startsWith("women-junior-odd-01:"))) {
    errors.push("Women's catalog lacks the declared odd-number size system.");
  }

  const zeroTwoStyle = catalog.styles.find((style) => {
    const sizes = catalog.variants.filter((variant) => variant.productId === style.productId).map((variant) => variant.size);
    return sizes.some((size) => size.label === "0" && size.alphaEquivalent === "XS")
      && sizes.some((size) => size.label === "2" && size.alphaEquivalent === "XS");
  });
  if (!zeroTwoStyle) errors.push("No women's style preserves separate 0 and 2 variants in the XS equivalence group.");

  return errors;
}

function measurement(region: MeasurementRegion, value: number, unit: "cm" | "in"): MeasurementInput {
  const lengthRegions: MeasurementRegion[] = ["shoulder_cross_back", "body_length", "sleeve_length", "rise", "inseam", "outseam"];
  return {
    region,
    value,
    unit,
    kind: lengthRegions.includes(region) ? "body_length" : "body_circumference",
    methodId: `synthetic-profile-1.0.0:${region}`,
    source: "synthetic_fixture",
  };
}

interface ReviewedCase {
  id: string;
  expected: RecommendationState;
  expectedSizeLabel?: string;
  expectedAlternateSizeLabel?: string;
  expectedFindings: Array<[MeasurementRegion, string]>;
  expectedAlternateFindings?: Array<[MeasurementRegion, string]>;
  evidencePath: "body" | "reference" | "edge_case";
  catalog: FitCatalog;
  request: RecommendationRequest;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]));
  }
  return value;
}

function sizeEvidence(variant: GarmentVariant, preference: RecommendationRequest["preference"]): EvaluationSizeEvidence {
  const ranges = variant.compatibleBodyRanges[preference];
  return {
    variantId: variant.id,
    label: variant.size.label,
    alphaEquivalent: variant.size.alphaEquivalent,
    axes: variant.size.axes,
    available: variant.available,
    measurements: variant.measurements.map((measurement) => ({
      region: measurement.region,
      kind: measurement.kind,
      garmentValueCm: measurement.valueCm,
      compatibleBodyRangeCm: ranges[measurement.region],
    })),
  };
}

function productEvidence(testCase: ReviewedCase): EvaluationProductEvidence {
  const style = testCase.catalog.styles.find((candidate) => candidate.productId === testCase.request.targetProductId);
  if (!style) throw new Error(`Missing target style ${testCase.request.targetProductId}.`);
  const brand = testCase.catalog.brands.find((candidate) => candidate.id === style.brandId);
  if (!brand) throw new Error(`Missing target brand ${style.brandId}.`);
  return {
    brandName: brand.displayName,
    productName: style.name,
    preference: testCase.request.preference,
    declaredFit: style.declaredFit,
    declaredStretch: style.declaredStretch,
    sizeChart: style.variantIds.flatMap((variantId) => {
      const variant = testCase.catalog.variants.find((candidate) => candidate.id === variantId);
      return variant ? [sizeEvidence(variant, testCase.request.preference)] : [];
    }),
  };
}

function referenceEvidence(testCase: ReviewedCase): EvaluationReferenceEvidence | undefined {
  const reference = testCase.request.profile.referenceGarment;
  if (!reference) return undefined;
  const variant = testCase.catalog.variants.find((candidate) => candidate.id === reference.variantId);
  if (!variant) return undefined;
  const style = testCase.catalog.styles.find((candidate) => candidate.productId === variant.productId);
  const brand = testCase.catalog.brands.find((candidate) => candidate.id === variant.brandId);
  if (!style || !brand) return undefined;
  return {
    brandName: brand.displayName,
    productName: style.name,
    size: sizeEvidence(variant, "regular"),
    observations: Object.entries(reference.observations).flatMap(([region, observation]) =>
      observation ? [{ region: region as MeasurementRegion, observation }] : []),
  };
}

function comparisonEvidence(findings: ReturnType<typeof recommendFit>["findings"]): EvaluationComparisonEvidence[] {
  return findings.map((finding) => ({
    region: finding.region,
    assessment: finding.assessment,
    evidenceValueCm: finding.evidenceValueCm,
    compatibleBodyRangeCm: finding.compatibleRangeCm,
  }));
}

function contractFingerprint(testCase: ReviewedCase): string {
  const targetStyle = testCase.catalog.styles.find((style) => style.productId === testCase.request.targetProductId);
  const targetVariants = targetStyle?.variantIds.map((variantId) =>
    testCase.catalog.variants.find((variant) => variant.id === variantId)) ?? [];
  const anchorVariantId = testCase.request.profile.referenceGarment?.variantId;
  const anchorVariant = anchorVariantId
    ? testCase.catalog.variants.find((variant) => variant.id === anchorVariantId)
    : undefined;
  const anchorStyle = anchorVariant
    ? testCase.catalog.styles.find((style) => style.productId === anchorVariant.productId)
    : undefined;
  const serialized = JSON.stringify(canonicalize({
    catalogVersion: testCase.catalog.version,
    ruleVersion: testCase.catalog.ruleVersion,
    measurementMethodVersion: testCase.catalog.measurementMethodVersion,
    id: testCase.id,
    expected: testCase.expected,
    optionPriority: testCase.expected === "TRADEOFF" ? "equal" : undefined,
    expectedSizeLabel: testCase.expectedSizeLabel,
    expectedAlternateSizeLabel: testCase.expectedAlternateSizeLabel,
    expectedFindings: testCase.expectedFindings,
    expectedAlternateFindings: testCase.expectedAlternateFindings ?? [],
    evidencePath: testCase.evidencePath,
    request: testCase.request,
    targetStyle,
    targetVariants,
    anchorVariant,
    anchorStyle,
  }));
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 16777619);
  }
  return `m1case-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function representativeStyles(catalog: FitCatalog): FitStyle[] {
  const found = new Map<string, FitStyle>();
  for (const style of catalog.styles) {
    const key = `${style.department}|${style.merchandisingCategory}`;
    if (!found.has(key)) found.set(key, style);
  }
  return [...found.values()];
}

function buildReviewedCases(catalog: FitCatalog): ReviewedCase[] {
  const cases: ReviewedCase[] = GOLDEN_CASES.map((golden) => ({
    id: golden.id,
    expected: golden.expectedState,
    expectedSizeLabel: golden.expectedSizeLabel,
    expectedFindings: golden.expectedFindings,
    evidencePath: golden.evidencePath,
    catalog,
    request: {
      targetProductId: golden.targetProductId,
      preference: golden.preference,
      profile: {
        measurements: (golden.measurements ?? []).map(([region, value, kind]) => ({
          ...measurement(region, value, "cm"),
          kind,
        })),
        referenceGarment: golden.reference ? {
          variantId: golden.reference.variantId,
          observations: Object.fromEntries(golden.reference.observations),
        } : undefined,
      },
    },
  }));

  const baseProduct = "mo-women-065";
  const brokenCatalog = structuredClone(catalog);
  const broken = brokenCatalog.variants.find((variant) => variant.productId === baseProduct);
  if (!broken) throw new Error("Missing broken-data fixture target.");
  broken.measurements = broken.measurements.filter((measurement) => measurement.region !== "chest_bust");

  const crossCutting: ReviewedCase[] = [
    { id: "unit-cm", expected: "RECOMMENDED", expectedSizeLabel: "2", expectedFindings: [["chest_bust", "FIT"]], evidencePath: "edge_case", catalog, request: { targetProductId: baseProduct, preference: "regular", profile: { measurements: [measurement("chest_bust", 83.5, "cm")] } } },
    { id: "unit-in", expected: "RECOMMENDED", expectedSizeLabel: "2", expectedFindings: [["chest_bust", "FIT"]], evidencePath: "edge_case", catalog, request: { targetProductId: baseProduct, preference: "regular", profile: { measurements: [measurement("chest_bust", 83.5 / 2.54, "in")] } } },
    { id: "waist-length-tradeoff", expected: "TRADEOFF", expectedSizeLabel: "30×30", expectedAlternateSizeLabel: "28×30", expectedFindings: [["waist", "FIT"], ["hip_seat", "LOOSE"], ["inseam", "FIT"]], expectedAlternateFindings: [["waist", "TIGHT"], ["hip_seat", "FIT"], ["inseam", "FIT"]], evidencePath: "edge_case", catalog, request: { targetProductId: "mo-men-006", preference: "regular", profile: { measurements: [measurement("waist", 74, "cm"), measurement("hip_seat", 90, "cm"), measurement("inseam", 72.75, "cm")] } } },
    { id: "missing-profile", expected: "INSUFFICIENT_PROFILE_EVIDENCE", expectedFindings: [], evidencePath: "edge_case", catalog, request: { targetProductId: baseProduct, preference: "regular", profile: { measurements: [] } } },
    { id: "missing-garment-data", expected: "INSUFFICIENT_GARMENT_EVIDENCE", expectedFindings: [], evidencePath: "edge_case", catalog: brokenCatalog, request: { targetProductId: baseProduct, preference: "regular", profile: { measurements: [measurement("chest_bust", 78.5, "cm")] } } },
    { id: "body-reference-conflict", expected: "CONFLICTING_EVIDENCE", expectedFindings: [], evidencePath: "edge_case", catalog, request: { targetProductId: baseProduct, preference: "regular", profile: { measurements: [measurement("chest_bust", 100, "cm")], referenceGarment: { variantId: "mo-women-016:brand_05:02", observations: { chest_bust: "just_right" } } } } },
    { id: "no-size", expected: "NO_SUITABLE_SIZE", expectedFindings: [["chest_bust", "TIGHT"]], evidencePath: "edge_case", catalog, request: { targetProductId: baseProduct, preference: "regular", profile: { measurements: [measurement("chest_bust", 150, "cm")] } } },
    { id: "unsupported-method", expected: "UNSUPPORTED", expectedFindings: [], evidencePath: "edge_case", catalog, request: { targetProductId: baseProduct, preference: "regular", profile: { measurements: [{ ...measurement("chest_bust", 83.5, "cm"), methodId: "unknown-method" }] } } },
    { id: "stretch-boundary", expected: "RECOMMENDED", expectedSizeLabel: "5", expectedFindings: [["chest_bust", "FIT"]], evidencePath: "edge_case", catalog, request: { targetProductId: "mo-women-008", preference: "regular", profile: { measurements: [measurement("chest_bust", 90.8, "cm")] } } },
    { id: "unavailable-sizes", expected: "NO_SUITABLE_SIZE", expectedFindings: [], evidencePath: "edge_case", catalog, request: { targetProductId: baseProduct, preference: "regular", availableVariantIds: [], profile: { measurements: [measurement("chest_bust", 83.5, "cm")] } } },
  ];
  return [...cases, ...crossCutting];
}

export interface EvaluationSignoff {
  approvedCases: Array<{ caseId: string; fingerprint: string }>;
  reviewerName?: string;
  reviewedAt?: string;
}

export function evaluateM1(
  catalog: FitCatalog = buildSyntheticCatalog(),
  signoff?: EvaluationSignoff,
): EvaluationReport {
  const validationErrors = validateFitCatalog(catalog);
  const preferences = buildProfilePreferenceCases();
  const representatives = representativeStyles(catalog);
  const byState = Object.fromEntries(ALL_STATES.map((state) => [state, 0])) as Record<RecommendationState, number>;
  let profileMatrixExecutions = 0;

  for (const { profile, preference } of preferences) {
    for (const style of representatives.filter((candidate) => candidate.department === profile.department)) {
      const result = recommendFit(catalog, {
        targetProductId: style.productId,
        preference,
        profile: { measurements: profile.measurements },
      });
      byState[result.state] += 1;
      profileMatrixExecutions += 1;
    }
  }

  let comparisonFixtureExecutions = 0;
  for (const fixture of catalog.comparisonFixtures) {
    const fixtureCatalog: FitCatalog = {
      ...catalog,
      styles: [...catalog.styles, fixture.style],
      variants: [...catalog.variants, ...fixture.variants],
    };
    const first = fixture.variants[0];
    const regions = [...new Set([...fixture.style.criticalRegions, ...axisRegions(fixture.style, first)])];
    const inputs = regions.flatMap((region) => {
      const range = first.compatibleBodyRanges.regular[region];
      return range ? [measurement(region, (range.minCm + range.maxCm) / 2, "cm")] : [];
    });
    const result = recommendFit(fixtureCatalog, {
      targetProductId: fixture.id,
      preference: "regular",
      profile: { measurements: inputs },
    });
    byState[result.state] += 1;
    comparisonFixtureExecutions += 1;
    if (["UNSUPPORTED", "INSUFFICIENT_GARMENT_EVIDENCE", "INSUFFICIENT_PROFILE_EVIDENCE"].includes(result.state)) {
      validationErrors.push(`Comparison fixture ${fixture.id} did not execute: ${result.state}.`);
    }
  }

  const reviewedCases = buildReviewedCases(catalog);
  const caseResults = reviewedCases.map((testCase) => {
    const result = recommendFit(testCase.catalog, testCase.request);
    const actualFindings = result.findings.map((finding) => [finding.region, finding.assessment] as const);
    const expectedFindings = testCase.expectedFindings;
    const actualAlternateFindings = result.options?.[1]?.findings.map((finding) => [finding.region, finding.assessment] as const) ?? [];
    const expectedAlternateFindings = testCase.expectedAlternateFindings ?? [];
    const stateMatches = result.state === testCase.expected;
    const sizeMatches = result.recommendedSizeLabel === testCase.expectedSizeLabel;
    const alternateMatches = result.alternateSizeLabel === testCase.expectedAlternateSizeLabel;
    const findingsMatch = JSON.stringify(actualFindings) === JSON.stringify(expectedFindings);
    const alternateFindingsMatch = JSON.stringify(actualAlternateFindings) === JSON.stringify(expectedAlternateFindings);
    const measurementSummary = testCase.request.profile.measurements
      .map((input) => `${input.region}=${input.value}${input.unit} (${input.kind}; ${input.methodId}; ${input.source})`)
      .join("; ");
    const referenceSummary = testCase.request.profile.referenceGarment
      ? `anchor=${testCase.request.profile.referenceGarment.variantId}; observations=${JSON.stringify(testCase.request.profile.referenceGarment.observations)}`
      : "";
    const inputSummary = [measurementSummary, referenceSummary].filter(Boolean).join("; ");
    return {
      id: testCase.id,
      fingerprint: contractFingerprint(testCase),
      targetProductId: testCase.request.targetProductId,
      evidencePath: testCase.evidencePath,
      expected: testCase.expected,
      actual: result.state,
      inputSummary,
      expectedSizeLabel: testCase.expectedSizeLabel,
      recommendedSizeLabel: result.recommendedSizeLabel,
      recommendedVariantId: result.recommendedVariantId,
      expectedAlternateSizeLabel: testCase.expectedAlternateSizeLabel,
      alternateSizeLabel: result.alternateSizeLabel,
      alternateVariantId: result.alternateVariantId,
      expectedFindings: expectedFindings.map(([region, assessment]) => `${region}:${assessment}`).join("; "),
      actualFindings: actualFindings.map(([region, assessment]) => `${region}:${assessment}`).join("; "),
      expectedAlternateFindings: expectedAlternateFindings.map(([region, assessment]) => `${region}:${assessment}`).join("; "),
      actualAlternateFindings: actualAlternateFindings.map(([region, assessment]) => `${region}:${assessment}`).join("; "),
      targetEvidence: productEvidence(testCase),
      referenceEvidence: referenceEvidence(testCase),
      comparisonEvidence: comparisonEvidence(result.findings),
      alternateComparisonEvidence: comparisonEvidence(result.options?.[1]?.findings ?? []),
      passed: stateMatches && sizeMatches && alternateMatches && findingsMatch && alternateFindingsMatch,
      failureReason: [
        stateMatches ? "" : `state expected ${testCase.expected}, got ${result.state}`,
        sizeMatches ? "" : `size expected ${testCase.expectedSizeLabel ?? "none"}, got ${result.recommendedSizeLabel ?? "none"}`,
        alternateMatches ? "" : `alternate expected ${testCase.expectedAlternateSizeLabel ?? "none"}, got ${result.alternateSizeLabel ?? "none"}`,
        findingsMatch ? "" : `findings expected ${JSON.stringify(expectedFindings)}, got ${JSON.stringify(actualFindings)}`,
        alternateFindingsMatch ? "" : `alternate findings expected ${JSON.stringify(expectedAlternateFindings)}, got ${JSON.stringify(actualAlternateFindings)}`,
      ].filter(Boolean).join("; "),
    };
  });
  const failed = caseResults.flatMap((caseResult) => caseResult.passed
    ? []
    : [{ id: caseResult.id, expected: caseResult.expected, actual: caseResult.actual, reason: caseResult.failureReason }]);

  return {
    generatedAt: new Date().toISOString(),
    catalogVersion: catalog.version,
    dataset: {
      brands: catalog.brands.length,
      styles: catalog.styles.length,
      variants: catalog.variants.length,
      comparisonFixtures: catalog.comparisonFixtures.length,
      navigationCategories: new Set(catalog.styles.map((style) => style.merchandisingCategory)).size,
      departmentCategoryPairs: new Set(catalog.styles.map((style) => `${style.department}|${style.merchandisingCategory}`)).size,
      baseProfiles: buildBaseFitProfiles().length,
      profilePreferenceCases: preferences.length,
      sourceSizePositionsCovered: catalog.styles.reduce((total, style) => total + style.sourceSizeLabels.length, 0),
    },
    validation: { passed: validationErrors.length === 0, errors: validationErrors },
    generatedCoverage: {
      total: profileMatrixExecutions + comparisonFixtureExecutions,
      profileMatrixExecutions,
      comparisonFixtureExecutions,
      byState,
    },
    reviewedCases: {
      total: reviewedCases.length,
      passed: reviewedCases.length - failed.length,
      reviewStatus: signoff?.reviewerName
        && signoff.reviewedAt
        && caseResults.every((testCase) => signoff.approvedCases.some((approved) =>
          approved.caseId === testCase.id && approved.fingerprint === testCase.fingerprint))
        ? "signed_off"
        : "awaiting_collaborator_signoff",
      cases: caseResults.map((caseResult) => ({
        id: caseResult.id,
        fingerprint: caseResult.fingerprint,
        targetProductId: caseResult.targetProductId,
        evidencePath: caseResult.evidencePath,
        expected: caseResult.expected,
        actual: caseResult.actual,
        inputSummary: caseResult.inputSummary,
        expectedSizeLabel: caseResult.expectedSizeLabel,
        recommendedSizeLabel: caseResult.recommendedSizeLabel,
        recommendedVariantId: caseResult.recommendedVariantId,
        expectedAlternateSizeLabel: caseResult.expectedAlternateSizeLabel,
        alternateSizeLabel: caseResult.alternateSizeLabel,
        alternateVariantId: caseResult.alternateVariantId,
        expectedFindings: caseResult.expectedFindings,
        actualFindings: caseResult.actualFindings,
        expectedAlternateFindings: caseResult.expectedAlternateFindings,
        actualAlternateFindings: caseResult.actualAlternateFindings,
        targetEvidence: caseResult.targetEvidence,
        referenceEvidence: caseResult.referenceEvidence,
        comparisonEvidence: caseResult.comparisonEvidence,
        alternateComparisonEvidence: caseResult.alternateComparisonEvidence,
      })),
      failed,
    },
    limitations: [
      "All garment geometry, shopper profiles and expected outcomes are synthetic.",
      "The report verifies deterministic software behavior against declared rules; it does not measure real-world fit accuracy or commercial impact.",
      "The 44 contract fixtures require collaborator sign-off before they can be called an independently reviewed benchmark.",
    ],
  };
}
