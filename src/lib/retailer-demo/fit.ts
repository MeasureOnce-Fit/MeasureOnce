import { getProductFitRecommendation } from "../fit/product-fit";
import type { FitPreference, MeasurementRegion, MeasurementUnit } from "../fit/types";
import { getRetailerDemoItem, type RetailerDemoItem } from "./catalog";

const preferences = new Set<FitPreference>(["closer", "regular", "relaxed"]);
const regions = new Set<MeasurementRegion>([
  "chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length", "sleeve_length", "neck",
  "upper_arm", "rise", "thigh", "inseam", "outseam", "leg_opening", "hem_sweep",
]);

type GuestMeasurement = { region: MeasurementRegion; value: number; unit: MeasurementUnit };
type GuestInput = { itemId: string; preference: FitPreference; measurements: GuestMeasurement[] };
type SavedInput = { itemId: string; preference: FitPreference; profileId: string };

export class RetailerDemoInputError extends Error {
  constructor(message = "Invalid retailer fit request.") {
    super(message);
    this.name = "RetailerDemoInputError";
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function itemFor(itemId: unknown): RetailerDemoItem {
  if (typeof itemId !== "string") throw new RetailerDemoInputError();
  const item = getRetailerDemoItem(itemId);
  if (!item) throw new RetailerDemoInputError("Retailer item is unavailable for fit checks.");
  if (item.coverage.status !== "ready") {
    throw new RetailerDemoInputError(
      item.coverage.status === "review"
        ? "Fit coverage for this item is under review. Select a retailer size manually."
        : "Retailer item is unavailable for fit checks.",
    );
  }
  return item;
}

function preferenceFor(value: unknown): FitPreference {
  if (typeof value !== "string" || !preferences.has(value as FitPreference)) throw new RetailerDemoInputError();
  return value as FitPreference;
}

function parseMeasurements(value: unknown): GuestMeasurement[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > regions.size) throw new RetailerDemoInputError();
  const seen = new Set<MeasurementRegion>();
  return value.map((measurement) => {
    if (!record(measurement) || !exactKeys(measurement, ["region", "value", "unit"])
      || typeof measurement.region !== "string" || !regions.has(measurement.region as MeasurementRegion)
      || typeof measurement.value !== "number" || !Number.isFinite(measurement.value) || measurement.value <= 0
      || (measurement.unit !== "cm" && measurement.unit !== "in")) throw new RetailerDemoInputError();
    const region = measurement.region as MeasurementRegion;
    if (seen.has(region)) throw new RetailerDemoInputError();
    seen.add(region);
    return { region, value: measurement.value, unit: measurement.unit };
  });
}

function publicItem(item: RetailerDemoItem) {
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    image: item.image,
    availableSizeLabels: item.availableSizeLabels,
  };
}

export function parseGuestRetailerFit(value: unknown): GuestInput {
  if (!record(value) || !exactKeys(value, ["itemId", "preference", "measurements"])) throw new RetailerDemoInputError();
  return { itemId: itemFor(value.itemId).id, preference: preferenceFor(value.preference), measurements: parseMeasurements(value.measurements) };
}

export function parseSavedRetailerFit(value: unknown): SavedInput {
  if (!record(value) || !exactKeys(value, ["itemId", "preference", "profileId"])) throw new RetailerDemoInputError();
  if (typeof value.profileId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._~-]{0,199}$/.test(value.profileId)) throw new RetailerDemoInputError();
  return { itemId: itemFor(value.itemId).id, preference: preferenceFor(value.preference), profileId: value.profileId };
}

export function getRetailerGuestFit(value: unknown) {
  const input = parseGuestRetailerFit(value);
  const item = itemFor(input.itemId);
  const recommendation = getProductFitRecommendation({
    targetProductId: item.productId,
    preference: input.preference,
    measurements: input.measurements,
  });
  return { synthetic: true as const, item: publicItem(item), result: recommendation.result };
}

export function toSavedProfileFitInput(value: unknown) {
  const input = parseSavedRetailerFit(value);
  const item = itemFor(input.itemId);
  return {
    item: publicItem(item),
    body: { targetProductId: item.productId, preference: input.preference, profileId: input.profileId },
  };
}
