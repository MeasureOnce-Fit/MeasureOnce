import type { MeasurementRegion, ReferenceObservation } from "./types";

export type KnownGarmentAreaKey = "waist" | "hip" | "chest" | "shoulder" | "length" | "sleeve" | "neck" | "inseam";
export type KnownGarmentFeedback = Record<KnownGarmentAreaKey, string>;

const REGION_TO_AREA: Partial<Record<MeasurementRegion, KnownGarmentAreaKey>> = {
  chest_bust: "chest",
  waist: "waist",
  hip_seat: "hip",
  shoulder_cross_back: "shoulder",
  body_length: "length",
  sleeve_length: "sleeve",
  neck: "neck",
  inseam: "inseam",
};

const REGION_LABELS: Partial<Record<MeasurementRegion, string>> = {
  chest_bust: "Chest / bust",
  waist: "Waist",
  hip_seat: "Hip / seat",
  shoulder_cross_back: "Shoulders",
  body_length: "Body length",
  sleeve_length: "Sleeve length",
  inseam: "Inseam",
  outseam: "Outseam",
};

export function knownGarmentAreaKeys(regions: MeasurementRegion[]): KnownGarmentAreaKey[] {
  return regions.flatMap((region) => REGION_TO_AREA[region] ? [REGION_TO_AREA[region]] : []);
}

export function buildKnownGarmentObservations(
  feedback: KnownGarmentFeedback,
  regions: MeasurementRegion[],
): Partial<Record<MeasurementRegion, ReferenceObservation>> {
  return Object.fromEntries(regions.flatMap((region) => {
    const area = REGION_TO_AREA[region];
    const value = area ? feedback[area] : "";
    if (!value || value === "Not applicable") return [];
    const observation: ReferenceObservation = value === "Too tight" ? "too_tight"
      : value === "Too narrow" || value === "Too short" ? "too_short"
      : value === "Too loose" ? "too_loose"
      : value === "Too wide" || value === "Too long" ? "too_long"
      : area === "shoulder" || area === "length" || area === "sleeve" || area === "inseam" ? "right_length"
      : "just_right";
    return [[region, observation]];
  }));
}

export function formatFitRegion(region: MeasurementRegion): string {
  return REGION_LABELS[region] ?? region.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

export function formatFitFindingReason(reason: string, region: MeasurementRegion): string {
  return reason.replaceAll(region, formatFitRegion(region).toLowerCase()).replace(/^./, (letter) => letter.toUpperCase());
}
