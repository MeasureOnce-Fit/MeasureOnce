import type { ManualGarmentRequirement } from "./manual-garment";
import type {
  FitPreference,
  ManualReferenceGarmentRequest,
  MeasurementRegion,
  MeasurementUnit,
  ReferenceObservation,
} from "./types";

export interface ManualGarmentField {
  region: MeasurementRegion;
  inputLabel: string;
  kind: ManualReferenceGarmentRequest["reference"]["measurements"][number]["kind"];
  methodId: string;
  help: string;
  observationType: "circumference" | "length";
}

type BuildManualGarmentRequestInput = {
  targetProductId: string;
  preference: FitPreference;
  unit: MeasurementUnit;
  brandText?: string;
  productText?: string;
  labelSize?: string;
  values: Partial<Record<MeasurementRegion, string>>;
  observations: Partial<Record<MeasurementRegion, string>>;
  requirements: ManualGarmentRequirement[];
};

const OBSERVATIONS: Record<string, ReferenceObservation> = {
  "Too tight": "too_tight",
  "Slightly tight": "slightly_tight",
  "Just right": "just_right",
  "Slightly loose": "slightly_loose",
  "Too loose": "too_loose",
  "Too short": "too_short",
  "Slightly short": "slightly_short",
  Right: "right_length",
  Perfect: "right_length",
  "Slightly long": "slightly_long",
  "Too long": "too_long",
};

function lowerFirst(value: string): string {
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

export function manualGarmentFields(requirements: ManualGarmentRequirement[]): ManualGarmentField[] {
  return requirements.map((requirement) => {
    const flatIndex = requirement.acceptedKinds.indexOf("garment_flat_width");
    const kindIndex = flatIndex >= 0 ? flatIndex : 0;
    const kind = requirement.acceptedKinds[kindIndex];
    const isLength = kind === "garment_length";
    return {
      region: requirement.region,
      inputLabel: isLength ? requirement.label : `Flat ${lowerFirst(requirement.label)}`,
      kind,
      methodId: requirement.methodIds[kindIndex],
      help: isLength
        ? "Lay the garment flat and measure this length along the seam shown."
        : "Lay the garment flat, smooth it without stretching, and measure straight across.",
      observationType: isLength ? "length" : "circumference",
    };
  });
}

export function buildManualGarmentRequest(
  input: BuildManualGarmentRequestInput,
): ManualReferenceGarmentRequest | null {
  const fields = manualGarmentFields(input.requirements);
  if (fields.length === 0) return null;
  const measurements: ManualReferenceGarmentRequest["reference"]["measurements"] = [];
  const observations: Partial<Record<MeasurementRegion, ReferenceObservation>> = {};

  for (const field of fields) {
    const value = Number(input.values[field.region]);
    const observation = OBSERVATIONS[input.observations[field.region] ?? ""];
    if (!Number.isFinite(value) || value <= 0 || !observation) return null;
    measurements.push({
      region: field.region,
      value,
      unit: input.unit,
      kind: field.kind,
      methodId: field.methodId,
    });
    observations[field.region] = observation;
  }

  return {
    targetProductId: input.targetProductId,
    preference: input.preference,
    reference: {
      brandText: input.brandText,
      productText: input.productText,
      labelSize: input.labelSize,
      measurements,
      observations,
    },
  };
}
