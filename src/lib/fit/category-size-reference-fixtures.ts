import {
  MEASUREMENT_METHOD_VERSION,
  type CategorySizeReference,
} from "./types";
import { buildSyntheticCatalog, SYNTHETIC_BRANDS } from "./catalog";

export const CATEGORY_SIZE_REFERENCE_VERSION = "synthetic-category-chart-v1";

const measurements = {
  chest: (valueCm: number) => ({ region: "chest_bust" as const, kind: "garment_circumference" as const, valueCm, methodId: `${MEASUREMENT_METHOD_VERSION}:circumference:chest_bust` }),
  waist: (valueCm: number) => ({ region: "waist" as const, kind: "garment_circumference" as const, valueCm, methodId: `${MEASUREMENT_METHOD_VERSION}:circumference:waist` }),
  hip: (valueCm: number) => ({ region: "hip_seat" as const, kind: "garment_circumference" as const, valueCm, methodId: `${MEASUREMENT_METHOD_VERSION}:circumference:hip_seat` }),
  shoulder: (valueCm: number) => ({ region: "shoulder_cross_back" as const, kind: "garment_length" as const, valueCm, methodId: `${MEASUREMENT_METHOD_VERSION}:length:shoulder_cross_back` }),
  body: (valueCm: number) => ({ region: "body_length" as const, kind: "garment_length" as const, valueCm, methodId: `${MEASUREMENT_METHOD_VERSION}:length:body_length` }),
  sleeve: (valueCm: number) => ({ region: "sleeve_length" as const, kind: "garment_length" as const, valueCm, methodId: `${MEASUREMENT_METHOD_VERSION}:length:sleeve_length` }),
  inseam: (valueCm: number) => ({ region: "inseam" as const, kind: "garment_length" as const, valueCm, methodId: `${MEASUREMENT_METHOD_VERSION}:length:inseam` }),
};

/**
 * Explicit fictional charts used only for deterministic application behavior.
 * These records deliberately do not read from, average, or derive from catalog
 * variants; each is its own declared brand/category reference.
 */
export const legacyCategorySizeReferenceFixtures: CategorySizeReference[] = [
  {
    id: "csr:formline:outerwear:8",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_05",
    brandName: "Orivelle",
    department: "Women",
    category: "Outerwear",
    size: { label: "8", format: "us_numeric", systemId: "formline-outerwear", ordinal: 3 },
    measurements: [measurements.chest(101), measurements.shoulder(40.5), measurements.body(69), measurements.sleeve(60.5)],
    wearerEaseCm: {
      closer: { chest_bust: 7, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      regular: { chest_bust: 10, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      relaxed: { chest_bust: 13, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
    },
  },
  {
    id: "csr:formline:outerwear:10",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_05",
    brandName: "Orivelle",
    department: "Women",
    category: "Outerwear",
    size: { label: "10", format: "us_numeric", systemId: "formline-outerwear", ordinal: 4 },
    measurements: [measurements.chest(106), measurements.shoulder(41.5), measurements.body(70), measurements.sleeve(61)],
    wearerEaseCm: {
      closer: { chest_bust: 7, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      regular: { chest_bust: 10, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      relaxed: { chest_bust: 13, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
    },
  },
  {
    id: "csr:bluehour:dresses:6",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_06",
    brandName: "Norellin",
    department: "Women",
    category: "Dresses",
    size: { label: "6", format: "us_numeric", systemId: "bluehour-dresses", ordinal: 2 },
    measurements: [measurements.chest(92), measurements.waist(74), measurements.hip(98), measurements.body(102)],
    wearerEaseCm: {
      closer: { chest_bust: 6, waist: 5, hip_seat: 7, body_length: 0 },
      regular: { chest_bust: 9, waist: 8, hip_seat: 10, body_length: 0 },
      relaxed: { chest_bust: 12, waist: 11, hip_seat: 13, body_length: 0 },
    },
  },
  {
    id: "csr:bluehour:dresses:8",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_06",
    brandName: "Norellin",
    department: "Women",
    category: "Dresses",
    size: { label: "8", format: "us_numeric", systemId: "bluehour-dresses", ordinal: 3 },
    measurements: [measurements.chest(97), measurements.waist(79), measurements.hip(103), measurements.body(103)],
    wearerEaseCm: {
      closer: { chest_bust: 6, waist: 5, hip_seat: 7, body_length: 0 },
      regular: { chest_bust: 9, waist: 8, hip_seat: 10, body_length: 0 },
      relaxed: { chest_bust: 12, waist: 11, hip_seat: 13, body_length: 0 },
    },
  },
  {
    id: "csr:metric-loom:tops:s",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_01",
    brandName: "Avenoir",
    department: "Women",
    category: "Tops",
    size: { label: "S", format: "alpha", systemId: "metric-loom-tops", ordinal: 2, alphaEquivalent: "S" },
    measurements: [measurements.chest(91), measurements.shoulder(38), measurements.body(58), measurements.sleeve(58)],
    wearerEaseCm: {
      closer: { chest_bust: 4, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      regular: { chest_bust: 7, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      relaxed: { chest_bust: 10, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
    },
  },
  {
    id: "csr:metric-loom:tops:m",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_01",
    brandName: "Avenoir",
    department: "Women",
    category: "Tops",
    size: { label: "M", format: "alpha", systemId: "metric-loom-tops", ordinal: 3, alphaEquivalent: "M" },
    measurements: [measurements.chest(96), measurements.shoulder(39), measurements.body(60), measurements.sleeve(59)],
    wearerEaseCm: {
      closer: { chest_bust: 4, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      regular: { chest_bust: 7, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      relaxed: { chest_bust: 10, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
    },
  },
  {
    id: "csr:north-arc:denim:30x30",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_02",
    brandName: "Velmora",
    department: "Men",
    category: "Denim",
    size: { label: "30×30", format: "waist_inseam", systemId: "north-arc-denim", ordinal: 1, axes: { waist: "30", inseam: "30" } },
    measurements: [measurements.waist(82), measurements.hip(101), measurements.inseam(76)],
    wearerEaseCm: {
      closer: { waist: 4, hip_seat: 6, inseam: 0 },
      regular: { waist: 7, hip_seat: 9, inseam: 0 },
      relaxed: { waist: 10, hip_seat: 12, inseam: 0 },
    },
  },
  {
    id: "csr:north-arc:denim:32x32",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_02",
    brandName: "Velmora",
    department: "Men",
    category: "Denim",
    size: { label: "32×32", format: "waist_inseam", systemId: "north-arc-denim", ordinal: 2, axes: { waist: "32", inseam: "32" } },
    measurements: [measurements.waist(87), measurements.hip(106), measurements.inseam(81)],
    wearerEaseCm: {
      closer: { waist: 4, hip_seat: 6, inseam: 0 },
      regular: { waist: 7, hip_seat: 9, inseam: 0 },
      relaxed: { waist: 10, hip_seat: 12, inseam: 0 },
    },
  },
];

const catalog = buildSyntheticCatalog();
const catalogVariantsById = new Map(catalog.variants.map((variant) => [variant.id, variant]));

const categoryRegions: Record<string, string[]> = {
  Dresses: ["chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length"],
  Outerwear: ["chest_bust", "shoulder_cross_back", "body_length", "sleeve_length", "upper_arm", "neck"],
  Tailoring: ["chest_bust", "waist", "shoulder_cross_back", "body_length", "sleeve_length", "upper_arm", "neck"],
  Tops: ["chest_bust", "shoulder_cross_back", "body_length", "sleeve_length", "neck"],
  Trousers: ["waist", "hip_seat", "inseam", "rise", "thigh", "outseam", "leg_opening"],
  Skirts: ["waist", "hip_seat", "body_length", "hem_sweep"],
  Denim: ["chest_bust", "waist", "hip_seat", "shoulder_cross_back", "body_length", "sleeve_length", "inseam", "rise", "thigh", "outseam", "leg_opening"],
  Knitwear: ["chest_bust", "shoulder_cross_back", "body_length", "sleeve_length", "neck"],
  Shorts: ["waist", "hip_seat", "inseam", "rise", "thigh", "outseam", "leg_opening"],
  "Shirts & Tees": ["chest_bust", "shoulder_cross_back", "body_length", "sleeve_length", "neck"],
  Sweatshirts: ["chest_bust", "shoulder_cross_back", "body_length", "sleeve_length", "neck"],
};

/**
 * MeasureOnce owns these fictional catalog brands, so every active category
 * has a declared synthetic size chart. The chart geometry is declared here;
 * its labels and independent axes mirror the current sellable catalog so the
 * known-size UI can never offer a placeholder label such as only "M".
 */
const baselineCatalogReferences: CategorySizeReference[] = (() => {
  const seen = new Set<string>();

  return catalog.styles.flatMap((style) => {
    const regions = categoryRegions[style.merchandisingCategory];
    if (!style.supported || !regions) return [];
    const brandIndex = SYNTHETIC_BRANDS.findIndex((brand) => brand.id === style.brandId);
    if (brandIndex < 0) return [];

    return style.variantIds.flatMap((variantId) => {
      const variant = catalogVariantsById.get(variantId);
      if (!variant?.available) return [];
      const size = variant.size;
      const key = `${style.department}\u0000${style.brandId}\u0000${style.merchandisingCategory}\u0000${size.label}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{
      id: `csr:measureonce:${style.brandId}:${style.department.toLowerCase()}:${style.merchandisingCategory.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}:${size.label.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`,
      version: CATEGORY_SIZE_REFERENCE_VERSION,
      synthetic: true as const,
      brandId: style.brandId,
      brandName: catalog.brands[brandIndex].displayName,
      department: style.department,
      category: style.merchandisingCategory,
      size: { ...size, axes: size.axes ? { ...size.axes } : undefined, modifiers: size.modifiers ? [...size.modifiers] : undefined },
      measurements: variant.measurements.map((measurement) => ({ ...measurement })),
      wearerEaseCm: {
        closer: { ...variant.wearerEaseCm.closer },
        regular: { ...variant.wearerEaseCm.regular },
        relaxed: { ...variant.wearerEaseCm.relaxed },
      },
    }];
    });
  });
})();

export const categorySizeReferenceFixtures: CategorySizeReference[] = [
  ...baselineCatalogReferences,
];
