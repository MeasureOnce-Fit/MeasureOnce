export const FIT_RULE_VERSION = "m1-rules-1.0.0";
export const SYNTHETIC_CATALOG_VERSION = "m1-synthetic-catalog-1.0.0";
export const MEASUREMENT_METHOD_VERSION = "m1-methods-1.0.0";

export type Department = "Women" | "Men";
export type MeasurementUnit = "cm" | "in";
export type FitPreference = "closer" | "regular" | "relaxed";
export type MeasurementKind =
  | "body_circumference"
  | "body_length"
  | "garment_circumference"
  | "garment_flat_width"
  | "garment_length";

export type MeasurementRegion =
  | "chest_bust"
  | "waist"
  | "hip_seat"
  | "shoulder_cross_back"
  | "body_length"
  | "sleeve_length"
  | "neck"
  | "upper_arm"
  | "rise"
  | "thigh"
  | "inseam"
  | "outseam"
  | "leg_opening"
  | "hem_sweep";

export type GarmentType =
  | "dress"
  | "top"
  | "shirt"
  | "tee"
  | "overshirt"
  | "knit_top"
  | "sweatshirt"
  | "outerwear"
  | "tailored_jacket"
  | "waistcoat"
  | "trousers"
  | "jeans"
  | "shorts"
  | "skirt"
  | "unsupported";

export type FitFamily =
  | "dress"
  | "upper_body"
  | "structured_upper"
  | "bottoms"
  | "skirt";

export type SizeFormat =
  | "alpha"
  | "us_numeric"
  | "us_plus"
  | "denim_waist"
  | "waist_inseam"
  | "petite_numeric"
  | "tall_numeric"
  | "grouped_numeric"
  | "eu_numeric"
  | "neck_sleeve"
  | "jacket_chest_length";

export type RecommendationState =
  | "RECOMMENDED"
  | "TRADEOFF"
  | "INSUFFICIENT_PROFILE_EVIDENCE"
  | "INSUFFICIENT_GARMENT_EVIDENCE"
  | "CONFLICTING_EVIDENCE"
  | "NO_SUITABLE_SIZE"
  | "UNSUPPORTED";

export interface Brand {
  id: string;
  displayName: string;
  synthetic: true;
  regionOffsetsCm: Partial<Record<MeasurementRegion, number>>;
}

export interface SizeDesignation {
  label: string;
  format: SizeFormat;
  systemId: string;
  ordinal: number;
  alphaEquivalent?: string;
  axes?: Partial<Record<"waist" | "inseam" | "neck" | "sleeve" | "length", string>>;
  marketEquivalents?: Partial<Record<"US" | "UK" | "EU", string>>;
  modifiers?: Array<"petite" | "regular" | "tall" | "short" | "long" | "plus">;
}

export interface CompatibleRange {
  minCm: number;
  maxCm: number;
}

export interface GarmentMeasurement {
  region: MeasurementRegion;
  kind: "garment_circumference" | "garment_flat_width" | "garment_length";
  valueCm: number;
  methodId: string;
}

export interface GarmentVariant {
  id: string;
  productId: string;
  brandId: string;
  size: SizeDesignation;
  sourceSizeIndex: number;
  sourceSizeLabel: string;
  measurements: GarmentMeasurement[];
  wearerEaseCm: Record<FitPreference, Partial<Record<MeasurementRegion, number>>>;
  compatibleBodyRanges: Record<FitPreference, Partial<Record<MeasurementRegion, CompatibleRange>>>;
  available: boolean;
  provenance: {
    type: "synthetic";
    generatorVersion: string;
    assumptions: string[];
  };
}

export interface FitStyle {
  productId: string;
  name: string;
  sourceImage?: string;
  sourceImages?: string[];
  sourceSizeLabels: string[];
  department: Department;
  merchandisingCategory: string;
  garmentType: GarmentType;
  fitFamily: FitFamily;
  brandId: string;
  material: string;
  declaredFit: string;
  declaredStretch: string;
  criticalRegions: MeasurementRegion[];
  secondaryRegions: MeasurementRegion[];
  variantIds: string[];
  supported: boolean;
}

export interface FitCatalog {
  version: string;
  ruleVersion: string;
  measurementMethodVersion: string;
  brands: Brand[];
  styles: FitStyle[];
  variants: GarmentVariant[];
  comparisonFixtures: ComparisonFixture[];
}

export interface ComparisonFixture {
  id: string;
  department: Department;
  merchandisingCategory: string;
  fitFamily: FitFamily;
  brandId: string;
  dataOnly: true;
  style: FitStyle;
  variants: GarmentVariant[];
}

export interface MeasurementInput {
  region: MeasurementRegion;
  value: number;
  unit: MeasurementUnit;
  kind: "body_circumference" | "body_length";
  methodId: string;
  source: "shopper_entered" | "saved_profile" | "synthetic_fixture";
}

export type ReferenceObservation =
  | "too_tight"
  | "slightly_tight"
  | "just_right"
  | "slightly_loose"
  | "too_loose"
  | "too_short"
  | "slightly_short"
  | "right_length"
  | "slightly_long"
  | "too_long";

export interface ReferenceGarmentEvidence {
  variantId: string;
  observations: Partial<Record<MeasurementRegion, ReferenceObservation>>;
}

/**
 * A versioned, method-tagged size-chart record. Unlike a remembered label,
 * this is explicit geometry from one declared brand/category chart.
 */
export interface CategorySizeReference {
  id: string;
  version: string;
  synthetic: true;
  brandId: string;
  brandName: string;
  department: Department;
  category: string;
  size: SizeDesignation;
  measurements: GarmentMeasurement[];
  wearerEaseCm: Record<FitPreference, Partial<Record<MeasurementRegion, number>>>;
}

export interface CategorySizeReferenceSummary {
  id: string;
  version: string;
  brandId: string;
  brandName: string;
  category: string;
  sizeLabel: string;
  axes?: SizeDesignation["axes"];
  supportedRegions: MeasurementRegion[];
}

export interface ManualReferenceGarmentRequest {
  targetProductId: string;
  preference: FitPreference;
  reference: {
    brandText?: string;
    productText?: string;
    labelSize?: string;
    measurements: Array<{
      region: MeasurementRegion;
      value: number;
      unit: MeasurementUnit;
      kind: "garment_flat_width" | "garment_circumference" | "garment_length";
      methodId: string;
    }>;
    observations: Partial<Record<MeasurementRegion, ReferenceObservation>>;
  };
}

export interface FitProfileEvidence {
  measurements: MeasurementInput[];
  referenceGarment?: ReferenceGarmentEvidence;
}

export interface RecommendationRequest {
  targetProductId: string;
  preference: FitPreference;
  profile: FitProfileEvidence;
  availableVariantIds?: string[];
}

export type RegionalAssessment = "FIT" | "TIGHT" | "LOOSE" | "SHORT" | "LONG" | "UNKNOWN";

export interface RegionalFinding {
  region: MeasurementRegion;
  assessment: RegionalAssessment;
  evidenceValueCm?: number;
  compatibleRangeCm?: CompatibleRange;
  reason: string;
}

export interface RecommendationResult {
  state: RecommendationState;
  targetProductId: string;
  optionPriority?: "equal";
  recommendedVariantId?: string;
  recommendedSizeLabel?: string;
  alternateVariantId?: string;
  alternateSizeLabel?: string;
  options?: Array<{
    variantId: string;
    sizeLabel: string;
    findings: RegionalFinding[];
  }>;
  findings: RegionalFinding[];
  evidence: {
    used: Array<"body_measurement" | "reference_garment" | "manual_reference_garment">;
    requiredRegions: MeasurementRegion[];
    supportedRegions: MeasurementRegion[];
    missingRegions: MeasurementRegion[];
    completeness: number;
    normalizedMeasurements: Array<{
      region: MeasurementRegion;
      originalValue: number;
      originalUnit: MeasurementUnit;
      valueCm: number;
      kind: "body_circumference" | "body_length";
      methodId: string;
      source: MeasurementInput["source"];
    }>;
    referenceVariantId?: string;
  };
  nextSteps: string[];
  versions: {
    catalog: string;
    rules: string;
    methods: string;
  };
}

export interface RawCatalogProduct {
  id: string;
  gender: Department;
  category: string;
  name: string;
  material: string;
  fit: string;
  stretch: string;
  sizes: string[];
  image?: string;
  images?: string[];
}

export interface BaseFitProfile {
  id: string;
  department: Department;
  band: "lower" | "middle" | "upper";
  proportionPattern: "reference" | "waist_hip" | "chest_shoulder" | "longer";
  measurements: MeasurementInput[];
}

export interface EvaluationSizeEvidence {
  variantId: string;
  label: string;
  alphaEquivalent?: string;
  axes?: Partial<Record<"waist" | "inseam" | "neck" | "sleeve" | "length", string>>;
  available: boolean;
  measurements: Array<{
    region: MeasurementRegion;
    kind: GarmentMeasurement["kind"];
    garmentValueCm: number;
    compatibleBodyRangeCm?: CompatibleRange;
  }>;
}

export interface EvaluationProductEvidence {
  brandName: string;
  productName: string;
  preference: FitPreference;
  declaredFit: string;
  declaredStretch: string;
  sizeChart: EvaluationSizeEvidence[];
}

export interface EvaluationReferenceEvidence {
  brandName: string;
  productName: string;
  size: EvaluationSizeEvidence;
  observations: Array<{ region: MeasurementRegion; observation: ReferenceObservation }>;
}

export interface EvaluationComparisonEvidence {
  region: MeasurementRegion;
  assessment: RegionalAssessment;
  evidenceValueCm?: number;
  compatibleBodyRangeCm?: CompatibleRange;
}

export interface EvaluationReport {
  generatedAt: string;
  catalogVersion: string;
  dataset: {
    brands: number;
    styles: number;
    variants: number;
    comparisonFixtures: number;
    navigationCategories: number;
    departmentCategoryPairs: number;
    baseProfiles: number;
    profilePreferenceCases: number;
    sourceSizePositionsCovered: number;
  };
  validation: {
    passed: boolean;
    errors: string[];
  };
  generatedCoverage: {
    total: number;
    profileMatrixExecutions: number;
    comparisonFixtureExecutions: number;
    byState: Record<RecommendationState, number>;
  };
  reviewedCases: {
    total: number;
    passed: number;
    reviewStatus: "awaiting_collaborator_signoff" | "signed_off";
    cases: Array<{
      id: string;
      fingerprint: string;
      targetProductId: string;
      evidencePath: "body" | "reference" | "edge_case";
      expected: RecommendationState;
      actual: RecommendationState;
      inputSummary: string;
      expectedSizeLabel?: string;
      recommendedSizeLabel?: string;
      recommendedVariantId?: string;
      expectedAlternateSizeLabel?: string;
      alternateSizeLabel?: string;
      alternateVariantId?: string;
      expectedFindings: string;
      actualFindings: string;
      expectedAlternateFindings: string;
      actualAlternateFindings: string;
      targetEvidence: EvaluationProductEvidence;
      referenceEvidence?: EvaluationReferenceEvidence;
      comparisonEvidence: EvaluationComparisonEvidence[];
      alternateComparisonEvidence: EvaluationComparisonEvidence[];
    }>;
    failed: Array<{ id: string; expected: RecommendationState; actual: RecommendationState; reason: string }>;
  };
  limitations: string[];
}
