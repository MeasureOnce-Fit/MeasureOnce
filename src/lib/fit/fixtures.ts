import {
  type BaseFitProfile,
  type Department,
  type FitPreference,
  type MeasurementInput,
  type MeasurementRegion,
} from "./types";

const REGIONS: MeasurementRegion[] = [
  "chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length",
  "sleeve_length", "neck", "upper_arm", "rise", "thigh", "inseam",
  "outseam", "leg_opening", "hem_sweep",
];

const BASES: Record<Department, Record<BaseFitProfile["band"], Record<MeasurementRegion, number>>> = {
  Women: {
    lower: { chest_bust: 82, waist: 65, hip_seat: 90, shoulder_cross_back: 37, body_length: 56, sleeve_length: 58, neck: 32, upper_arm: 27, rise: 25, thigh: 52, inseam: 75, outseam: 99, leg_opening: 31, hem_sweep: 100 },
    middle: { chest_bust: 92, waist: 75, hip_seat: 100, shoulder_cross_back: 39.5, body_length: 58, sleeve_length: 59.5, neck: 33.5, upper_arm: 30, rise: 27, thigh: 57, inseam: 77, outseam: 103, leg_opening: 34, hem_sweep: 108 },
    upper: { chest_bust: 102, waist: 85, hip_seat: 110, shoulder_cross_back: 42, body_length: 60, sleeve_length: 61, neck: 35, upper_arm: 34, rise: 29, thigh: 62, inseam: 79, outseam: 107, leg_opening: 37, hem_sweep: 116 },
  },
  Men: {
    lower: { chest_bust: 90, waist: 76, hip_seat: 92, shoulder_cross_back: 43, body_length: 68, sleeve_length: 62, neck: 36, upper_arm: 31, rise: 26, thigh: 54, inseam: 76, outseam: 101, leg_opening: 34, hem_sweep: 104 },
    middle: { chest_bust: 102, waist: 88, hip_seat: 102, shoulder_cross_back: 46, body_length: 70, sleeve_length: 64, neck: 38, upper_arm: 34, rise: 28, thigh: 59, inseam: 79, outseam: 105, leg_opening: 37, hem_sweep: 112 },
    upper: { chest_bust: 114, waist: 100, hip_seat: 112, shoulder_cross_back: 49, body_length: 72, sleeve_length: 66, neck: 40, upper_arm: 38, rise: 30, thigh: 64, inseam: 82, outseam: 109, leg_opening: 40, hem_sweep: 120 },
  },
};

function patternOffset(pattern: BaseFitProfile["proportionPattern"], region: MeasurementRegion): number {
  if (pattern === "waist_hip") {
    if (region === "waist") return 3;
    if (region === "hip_seat") return 4;
    if (region === "thigh") return 2;
  }
  if (pattern === "chest_shoulder") {
    if (region === "chest_bust") return 4;
    if (region === "shoulder_cross_back") return 1.5;
    if (region === "upper_arm") return 1;
  }
  if (pattern === "longer") {
    if (region === "body_length" || region === "sleeve_length") return 3;
    if (region === "inseam" || region === "outseam") return 4;
  }
  return 0;
}

export function buildBaseFitProfiles(): BaseFitProfile[] {
  const departments: Department[] = ["Women", "Men"];
  const bands: BaseFitProfile["band"][] = ["lower", "middle", "upper"];
  const patterns: BaseFitProfile["proportionPattern"][] = ["reference", "waist_hip", "chest_shoulder", "longer"];
  const profiles: BaseFitProfile[] = [];

  for (const department of departments) {
    for (const band of bands) {
      for (const pattern of patterns) {
        const measurements: MeasurementInput[] = REGIONS.map((region) => ({
          region,
          value: BASES[department][band][region] + patternOffset(pattern, region),
          unit: "cm",
          kind: LENGTH_KIND_REGIONS.has(region) ? "body_length" : "body_circumference",
          methodId: `synthetic-profile-1.0.0:${region}`,
          source: "synthetic_fixture",
        }));
        profiles.push({
          id: `${department.toLowerCase()}-${band}-${pattern}`,
          department,
          band,
          proportionPattern: pattern,
          measurements,
        });
      }
    }
  }
  return profiles;
}

const LENGTH_KIND_REGIONS = new Set<MeasurementRegion>([
  "shoulder_cross_back", "body_length", "sleeve_length", "rise", "inseam", "outseam",
]);

export function buildProfilePreferenceCases(): Array<{ profile: BaseFitProfile; preference: FitPreference }> {
  const preferences: FitPreference[] = ["closer", "regular", "relaxed"];
  return buildBaseFitProfiles().flatMap((profile) => preferences.map((preference) => ({ profile, preference })));
}
