import type { CategorySizeReferenceSummary, MeasurementRegion, ReferenceObservation } from "./types";

type CategoryFitFeedback = Record<
  "waist" | "hip" | "chest" | "shoulder" | "length" | "sleeve" | "neck" | "inseam",
  string
>;

const regionFeedbackKey: Partial<Record<MeasurementRegion, keyof CategoryFitFeedback>> = {
  chest_bust: "chest",
  waist: "waist",
  hip_seat: "hip",
  shoulder_cross_back: "shoulder",
  body_length: "length",
  sleeve_length: "sleeve",
  neck: "neck",
  inseam: "inseam",
};

const lengthRegions = new Set<MeasurementRegion>([
  "shoulder_cross_back",
  "body_length",
  "sleeve_length",
  "inseam",
]);

/** Converts the server-owned merchandising category into short shopper-facing copy. */
export function categoryNoun(category: string): string {
  const nouns: Record<string, string> = {
    Outerwear: "jacket",
    Denim: "jeans",
    Dresses: "dress",
    Tops: "top",
    Trousers: "trousers",
    Skirts: "skirt",
    Shorts: "shorts",
    Knitwear: "knitwear",
  };
  return nouns[category] ?? category.toLowerCase().replace(/s$/, "");
}

/**
 * Numeric waist/inseam labels are meaningful only for lower-body garments.
 * Other categories keep the shopper-facing label supplied by their chart.
 */
export function categorySizeLabel(
  category: string,
  size: Pick<CategorySizeReferenceSummary, "sizeLabel" | "axes">,
): string {
  const usesWaistAndInseam = ["Denim", "Trousers", "Shorts"].includes(category);
  return usesWaistAndInseam && size.axes?.waist && size.axes?.inseam
    ? `Waist ${size.axes.waist} · inseam ${size.axes.inseam}`
    : size.sizeLabel;
}

/**
 * Keeps the browser payload constrained to the regions advertised by the
 * selected verified reference. The API remains the final validator.
 */
export function categorySizeObservations(
  feedback: CategoryFitFeedback,
  supportedRegions: MeasurementRegion[],
): Partial<Record<MeasurementRegion, ReferenceObservation>> {
  return Object.fromEntries(supportedRegions.flatMap((region) => {
    const key = regionFeedbackKey[region];
    const answer = key ? feedback[key] : "";
    if (!answer || answer === "Not applicable") return [];
    const observation: ReferenceObservation = answer === "Too tight" ? "too_tight"
      : answer === "Slightly tight" ? "slightly_tight"
      : answer === "Too loose" ? "too_loose"
      : answer === "Slightly loose" ? "slightly_loose"
      : answer === "Too short" ? "too_short"
      : answer === "Slightly short" ? "slightly_short"
      : answer === "Too long" ? "too_long"
      : answer === "Slightly long" ? "slightly_long"
      : lengthRegions.has(region) ? "right_length"
      : "just_right";
    return [[region, observation]];
  }));
}
