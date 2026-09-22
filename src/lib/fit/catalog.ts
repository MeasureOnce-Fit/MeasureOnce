import productPhotos from "../product-photos.json";

import {
  FIT_RULE_VERSION,
  MEASUREMENT_METHOD_VERSION,
  SYNTHETIC_CATALOG_VERSION,
  type Brand,
  type Department,
  type FitCatalog,
  type FitFamily,
  type FitPreference,
  type FitStyle,
  type GarmentMeasurement,
  type GarmentType,
  type GarmentVariant,
  type MeasurementRegion,
  type RawCatalogProduct,
  type SizeDesignation,
  type SizeFormat,
} from "./types";

const LENGTH_REGIONS = new Set<MeasurementRegion>([
  "shoulder_cross_back",
  "body_length",
  "sleeve_length",
  "rise",
  "inseam",
  "outseam",
]);

const SIZE_LENGTH_ADJUSTMENT_REGIONS = new Set<MeasurementRegion>([
  "body_length",
  "sleeve_length",
  "inseam",
  "outseam",
]);

export const SYNTHETIC_BRANDS: Brand[] = [
  { id: "brand_01", displayName: "Avenoir", synthetic: true, regionOffsetsCm: { waist: -0.8, hip_seat: 0.4 } },
  { id: "brand_02", displayName: "Velmora", synthetic: true, regionOffsetsCm: { chest_bust: 0.7, shoulder_cross_back: 0.4 } },
  { id: "brand_03", displayName: "Cendra Lane", synthetic: true, regionOffsetsCm: { waist: 0.8, hip_seat: -0.5 } },
  { id: "brand_04", displayName: "Solenne & Rue", synthetic: true, regionOffsetsCm: { body_length: -1.2, inseam: -1.4 } },
  { id: "brand_05", displayName: "Orivelle", synthetic: true, regionOffsetsCm: { chest_bust: -0.6, waist: -0.4, hip_seat: -0.4 } },
  { id: "brand_06", displayName: "Norellin", synthetic: true, regionOffsetsCm: { body_length: 1.4, sleeve_length: 1.2 } },
  { id: "brand_07", displayName: "Caelune", synthetic: true, regionOffsetsCm: { hip_seat: 1.1, thigh: 0.7 } },
  { id: "brand_08", displayName: "Marrow & Vale", synthetic: true, regionOffsetsCm: { chest_bust: 1.0, waist: 0.4 } },
  { id: "brand_09", displayName: "Virelle", synthetic: true, regionOffsetsCm: { shoulder_cross_back: -0.5, sleeve_length: -0.8 } },
  { id: "brand_10", displayName: "Tern & Thread", synthetic: true, regionOffsetsCm: { waist: 0.3, hip_seat: 0.8, inseam: 0.6 } },
];

interface Taxonomy {
  garmentType: GarmentType;
  fitFamily: FitFamily;
  criticalRegions: MeasurementRegion[];
  secondaryRegions: MeasurementRegion[];
}

const FAMILY_REGIONS: Record<FitFamily, Pick<Taxonomy, "criticalRegions" | "secondaryRegions">> = {
  dress: {
    criticalRegions: ["chest_bust", "waist", "hip_seat"],
    secondaryRegions: ["body_length", "shoulder_cross_back"],
  },
  upper_body: {
    criticalRegions: ["chest_bust"],
    secondaryRegions: ["shoulder_cross_back", "body_length", "sleeve_length", "neck"],
  },
  structured_upper: {
    criticalRegions: ["chest_bust", "shoulder_cross_back"],
    secondaryRegions: ["body_length", "sleeve_length", "upper_arm"],
  },
  bottoms: {
    criticalRegions: ["waist", "hip_seat"],
    secondaryRegions: ["inseam", "rise", "thigh", "outseam", "leg_opening"],
  },
  skirt: {
    criticalRegions: ["waist", "hip_seat"],
    secondaryRegions: ["body_length", "hem_sweep"],
  },
};

const withRegions = (garmentType: GarmentType, fitFamily: FitFamily): Taxonomy => ({
  garmentType,
  fitFamily,
  ...FAMILY_REGIONS[fitFamily],
});

export function classifyProduct(product: RawCatalogProduct): Taxonomy {
  const name = product.name.toLowerCase();
  const category = product.category;

  if (category === "Dresses") return withRegions("dress", "dress");
  if (category === "Skirts") return withRegions("skirt", "skirt");
  if (category === "Trousers") return withRegions("trousers", "bottoms");
  if (category === "Shorts") return withRegions("shorts", "bottoms");
  if (category === "Denim") {
    if (name.includes("overshirt")) return withRegions("overshirt", "upper_body");
    if (name.includes("trouser")) return withRegions("trousers", "bottoms");
    if (name.includes("jean")) return withRegions("jeans", "bottoms");
    return { garmentType: "unsupported", fitFamily: "bottoms", criticalRegions: [], secondaryRegions: [] };
  }
  if (category === "Knitwear") return withRegions("knit_top", "upper_body");
  if (category === "Sweatshirts") return withRegions("sweatshirt", "upper_body");
  if (category === "Outerwear") return withRegions("outerwear", "structured_upper");
  if (category === "Tailoring") {
    if (name.includes("waistcoat")) {
      return {
        garmentType: "waistcoat",
        fitFamily: "structured_upper",
        criticalRegions: ["chest_bust", "waist"],
        secondaryRegions: ["shoulder_cross_back", "body_length"],
      };
    }
    return withRegions("tailored_jacket", "structured_upper");
  }
  if (category === "Shirts & Tees") {
    if (name.includes("tee") || name.includes("t-shirt")) return withRegions("tee", "upper_body");
    if (name.includes("overshirt")) return withRegions("overshirt", "upper_body");
    return withRegions("shirt", "upper_body");
  }
  if (category === "Tops") return withRegions("top", "upper_body");

  return {
    garmentType: "unsupported",
    fitFamily: "upper_body",
    criticalRegions: [],
    secondaryRegions: [],
  };
}

interface SizeSlot {
  label: string;
  ordinal: number;
  alpha?: string;
  axes?: SizeDesignation["axes"];
  equivalents?: SizeDesignation["marketEquivalents"];
  modifiers?: SizeDesignation["modifiers"];
}

function makeSystem(
  id: string,
  format: SizeFormat,
  slots: SizeSlot[],
): SizeDesignation[] {
  return slots.map((slot) => ({
    label: slot.label,
    format,
    systemId: id,
    ordinal: slot.ordinal,
    alphaEquivalent: slot.alpha,
    axes: slot.axes,
    marketEquivalents: slot.equivalents,
    modifiers: slot.modifiers,
  }));
}

const WOMEN_SYSTEMS: SizeDesignation[][] = [
  makeSystem("women-alpha-01", "alpha", ["XXS", "XS", "S", "M", "L", "XL"].map((label, ordinal) => ({ label, ordinal, alpha: label }))),
  makeSystem("women-us-even-01", "us_numeric", [
    { label: "0", ordinal: 0, alpha: "XS", equivalents: { US: "0", UK: "4", EU: "32" }, modifiers: ["regular"] },
    { label: "2", ordinal: 1, alpha: "XS", equivalents: { US: "2", UK: "6", EU: "34" }, modifiers: ["regular"] },
    { label: "4", ordinal: 2, alpha: "S", equivalents: { US: "4", UK: "8", EU: "36" }, modifiers: ["regular"] },
    { label: "6", ordinal: 3, alpha: "S", equivalents: { US: "6", UK: "10", EU: "38" }, modifiers: ["regular"] },
    { label: "8", ordinal: 4, alpha: "M", equivalents: { US: "8", UK: "12", EU: "40" }, modifiers: ["regular"] },
    { label: "10", ordinal: 5, alpha: "L", equivalents: { US: "10", UK: "14", EU: "42" }, modifiers: ["regular"] },
  ]),
  makeSystem("women-denim-waist-01", "denim_waist", ["24", "25", "26", "27", "28", "29"].map((label, ordinal) => ({ label, ordinal, alpha: ["XXS", "XS", "XS", "S", "M", "L"][ordinal], axes: { waist: label } }))),
  makeSystem("women-plus-01", "us_plus", ["14W", "16W", "18W", "20W", "22W", "24W"].map((label, index) => ({ label, ordinal: index + 5, alpha: ["L", "XL", "1X", "2X", "3X", "4X"][index], modifiers: ["plus"] as SizeDesignation["modifiers"] }))),
  makeSystem("women-grouped-01", "grouped_numeric", ["0/2", "4/6", "8/10", "12/14", "16/18", "20/22"].map((label, ordinal) => ({ label, ordinal, alpha: ["XS", "S", "M", "L", "XL", "2X"][ordinal] }))),
  makeSystem("women-petite-01", "petite_numeric", ["0P", "2P", "4P", "6P", "8P", "10P"].map((label, ordinal) => ({ label, ordinal, alpha: ["XS", "XS", "S", "S", "M", "L"][ordinal], modifiers: ["petite"] as SizeDesignation["modifiers"], axes: { length: "P" } }))),
  makeSystem("women-tall-01", "tall_numeric", ["0T", "2T", "4T", "6T", "8T", "10T"].map((label, ordinal) => ({ label, ordinal, alpha: ["XS", "XS", "S", "S", "M", "L"][ordinal], modifiers: ["tall"] as SizeDesignation["modifiers"], axes: { length: "T" } }))),
  makeSystem("women-eu-01", "eu_numeric", ["32", "34", "36", "38", "40", "42"].map((label, ordinal) => ({ label: `EU ${label}`, ordinal, alpha: ["XXS", "XS", "S", "M", "L", "XL"][ordinal], equivalents: { EU: label, US: ["0", "2", "4", "6", "8", "10"][ordinal], UK: ["4", "6", "8", "10", "12", "14"][ordinal] } }))),
  makeSystem("women-junior-odd-01", "us_numeric", ["1", "3", "5", "7", "9", "11"].map((label, ordinal) => ({ label, ordinal, alpha: ["XS", "S", "S", "M", "L", "XL"][ordinal] }))),
  makeSystem("women-alpha-02", "alpha", ["XS", "S", "M", "L", "XL", "XXL"].map((label, ordinal) => ({ label, ordinal: ordinal + 1, alpha: label }))),
];

const MEN_ALPHA = makeSystem("men-alpha-01", "alpha", ["XS", "S", "M", "L", "XL", "XXL"].map((label, ordinal) => ({ label, ordinal, alpha: label })));

function cartesianWaistInseam(
  systemId: string,
  waists: string[],
  inseams: string[],
  alpha: string[],
): SizeDesignation[] {
  return makeSystem(systemId, "waist_inseam", waists.flatMap((waist, ordinal) => inseams.map((inseam) => ({
    label: `${waist}×${inseam}`,
    ordinal,
    axes: { waist, inseam },
    alpha: alpha[ordinal],
  }))));
}

function womenPrtSystem(brandIndex: number): SizeDesignation[] {
  const labels = ["0", "2", "4", "6", "8", "10"];
  const alphas = ["XS", "XS", "S", "S", "M", "L"];
  return labels.flatMap((baseLabel, ordinal) => ([
    ...makeSystem(`women-prt-${brandIndex + 1}`, "petite_numeric", [{ label: `${baseLabel}P`, ordinal, alpha: alphas[ordinal], axes: { length: "P" }, modifiers: ["petite"] }]),
    ...makeSystem(`women-prt-${brandIndex + 1}`, "us_numeric", [{ label: baseLabel, ordinal, alpha: alphas[ordinal], axes: { length: "R" }, modifiers: ["regular"] }]),
    ...makeSystem(`women-prt-${brandIndex + 1}`, "tall_numeric", [{ label: `${baseLabel}T`, ordinal, alpha: alphas[ordinal], axes: { length: "T" }, modifiers: ["tall"] }]),
  ]));
}

function menSystem(brandIndex: number, family: FitFamily, garmentType: GarmentType): SizeDesignation[] {
  if (family === "bottoms") {
    if (brandIndex % 2 === 0) {
      return cartesianWaistInseam(`men-waist-inseam-${brandIndex + 1}`, ["28", "30", "32", "34", "36", "38"], ["30", "32", "34"], ["XS", "S", "M", "L", "XL", "XXL"]);
    }
    return makeSystem(`men-denim-waist-${brandIndex + 1}`, "denim_waist", ["28", "30", "32", "34", "36", "38"].map((label, ordinal) => ({ label, ordinal, axes: { waist: label }, alpha: ["XS", "S", "M", "L", "XL", "XXL"][ordinal] })));
  }
  if (family === "structured_upper") {
    const chests = ["36", "38", "40", "42", "44", "46"];
    return makeSystem(`men-jacket-${brandIndex + 1}`, "jacket_chest_length", chests.flatMap((chest, ordinal) => ["S", "R", "L"].map((length) => ({
      label: `${chest}${length}`,
      ordinal,
      alpha: ["XS", "S", "M", "L", "XL", "XXL"][ordinal],
      axes: { length },
      modifiers: [length === "S" ? "short" : length === "L" ? "long" : "regular"] as SizeDesignation["modifiers"],
    }))));
  }
  if (brandIndex % 3 === 1 && (garmentType === "shirt" || garmentType === "overshirt")) {
    const necks = ["14", "15", "16", "17", "18", "19"];
    return makeSystem(`men-neck-sleeve-${brandIndex + 1}`, "neck_sleeve", necks.flatMap((neck, ordinal) => ["32", "34", "36"].map((sleeve) => ({
      label: `${neck}/${sleeve}`,
      ordinal,
      axes: { neck, sleeve },
      alpha: ["XS", "S", "M", "L", "XL", "XXL"][ordinal],
    }))));
  }
  return MEN_ALPHA.map((size) => ({ ...size, systemId: `men-alpha-${String(brandIndex + 1).padStart(2, "0")}` }));
}

function womenWaistInseamSystem(): SizeDesignation[] {
  return cartesianWaistInseam("women-waist-inseam-01", ["24", "26", "28", "30", "32", "34"], ["28", "30", "32"], ["XXS", "XS", "S", "M", "L", "XL"]);
}

function sizeSystemFor(department: Department, brandIndex: number, family: FitFamily, garmentType: GarmentType): SizeDesignation[] {
  let system: SizeDesignation[];
  if (department === "Women") {
    if (family === "bottoms" && brandIndex === 9) system = womenWaistInseamSystem();
    else if (brandIndex === 5 || brandIndex === 6) system = womenPrtSystem(brandIndex);
    else if (brandIndex === 2 && garmentType !== "jeans") system = WOMEN_SYSTEMS[1];
    else system = WOMEN_SYSTEMS[brandIndex];
  } else {
    system = menSystem(brandIndex, family, garmentType);
  }
  const scope = `${department.toLowerCase()}:${SYNTHETIC_BRANDS[brandIndex].id}:${garmentType}:US`;
  return system.map((size) => ({ ...size, systemId: `${size.systemId}:${scope}` }));
}

function baseBodyCenter(department: Department, region: MeasurementRegion, ordinal: number): number {
  const women: Record<MeasurementRegion, [number, number]> = {
    chest_bust: [78, 5], waist: [61, 5], hip_seat: [86, 5], shoulder_cross_back: [36, 1.15],
    body_length: [55, 0.8], sleeve_length: [57, 0.55], neck: [31, 0.55], upper_arm: [25, 1.1],
    rise: [24, 0.65], thigh: [49, 2.2], inseam: [76, 0.2], outseam: [100, 0.7], leg_opening: [29, 1.2], hem_sweep: [96, 4],
  };
  const men: Record<MeasurementRegion, [number, number]> = {
    chest_bust: [84, 6], waist: [70, 6], hip_seat: [88, 5], shoulder_cross_back: [41, 1.35],
    body_length: [66, 0.9], sleeve_length: [61, 0.65], neck: [35, 1], upper_arm: [29, 1.2],
    rise: [25, 0.7], thigh: [51, 2.4], inseam: [76, 0.4], outseam: [101, 0.8], leg_opening: [32, 1.3], hem_sweep: [102, 4],
  };
  const [base, grade] = department === "Women" ? women[region] : men[region];
  return base + grade * ordinal;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function preferenceShift(preference: FitPreference, region: MeasurementRegion): number {
  if (LENGTH_REGIONS.has(region)) return 0;
  if (preference === "closer") return 1.1;
  if (preference === "relaxed") return -1.4;
  return 0;
}

function stretchAllowance(stretch: string): number {
  const normalized = stretch.toLowerCase();
  if (normalized.includes("high")) return 1.2;
  if (normalized.includes("medium") || normalized.includes("moderate")) return 0.6;
  return 0;
}

function fitEase(fit: string): number {
  const normalized = fit.toLowerCase();
  if (normalized.includes("oversized")) return 8;
  if (normalized.includes("relaxed")) return 5.5;
  if (normalized.includes("close")) return 2.5;
  return 4;
}

function stylePerturbation(productId: string, regionIndex: number, brandIndex: number): number {
  const numeric = Number(productId.match(/(\d+)$/)?.[1] ?? 1);
  return (((numeric * (regionIndex + 3) + brandIndex * 7) % 9) - 4) * 0.22;
}

function modifierLengthOffset(size: SizeDesignation, department: Department, region: MeasurementRegion): number {
  if ((region === "inseam" || region === "outseam") && size.axes?.inseam) {
    return Number(size.axes.inseam) - (department === "Women" ? 30 : 32);
  }
  if (region === "sleeve_length" && size.axes?.sleeve) {
    return Number(size.axes.sleeve) - 34;
  }
  if (size.modifiers?.includes("petite") || size.modifiers?.includes("short")) return -4;
  if (size.modifiers?.includes("tall") || size.modifiers?.includes("long")) return 4;
  return 0;
}

function makeVariant(
  product: RawCatalogProduct,
  brand: Brand,
  brandIndex: number,
  taxonomy: Taxonomy,
  size: SizeDesignation,
  slotIndex: number,
  sourceSizeIndex: number,
): GarmentVariant {
  const regions = [...taxonomy.criticalRegions, ...taxonomy.secondaryRegions];
  const stretch = stretchAllowance(product.stretch);
  const centers = new Map<MeasurementRegion, number>();

  regions.forEach((region, regionIndex) => {
    const lengthAdjustment = SIZE_LENGTH_ADJUSTMENT_REGIONS.has(region) ? modifierLengthOffset(size, product.gender, region) : 0;
    centers.set(region, round(
      baseBodyCenter(product.gender, region, size.ordinal)
      + (brand.regionOffsetsCm[region] ?? 0)
      + stylePerturbation(product.id, regionIndex, brandIndex)
      + lengthAdjustment,
    ));
  });

  const productNumber = Number(product.id.match(/(\d+)$/)?.[1] ?? 1);
  const measurements: GarmentMeasurement[] = regions.map((region, regionIndex) => {
    const isLength = LENGTH_REGIONS.has(region);
    const center = centers.get(region) ?? 0;
    const ease = isLength ? 0 : fitEase(product.fit) + stretch;
    const circumference = round(center + ease);
    const storesFlatWidth = !isLength && (productNumber + brandIndex + regionIndex) % 4 === 0;
    return {
      region,
      kind: isLength ? "garment_length" : storesFlatWidth ? "garment_flat_width" : "garment_circumference",
      valueCm: storesFlatWidth ? round(circumference / 2) : circumference,
      methodId: `${MEASUREMENT_METHOD_VERSION}:${isLength ? "length" : storesFlatWidth ? "flat_width" : "circumference"}:${region}`,
    };
  });

  const comparableGarmentValue = (measurement: GarmentMeasurement): number =>
    measurement.kind === "garment_flat_width" ? measurement.valueCm * 2 : measurement.valueCm;

  const preferences: FitPreference[] = ["closer", "regular", "relaxed"];
  const wearerEaseCm = Object.fromEntries(preferences.map((preference) => [
    preference,
    Object.fromEntries(regions.map((region) => {
      const measurement = measurements.find((entry) => entry.region === region);
      const garmentValue = measurement ? comparableGarmentValue(measurement) : 0;
      const preferredBodyCenter = (centers.get(region) ?? 0) + preferenceShift(preference, region);
      return [region, round(garmentValue - preferredBodyCenter)];
    })),
  ])) as GarmentVariant["wearerEaseCm"];
  const compatibleBodyRanges = Object.fromEntries(preferences.map((preference) => {
    const ranges = Object.fromEntries(regions.map((region) => {
      const measurement = measurements.find((entry) => entry.region === region);
      const garmentValue = measurement ? comparableGarmentValue(measurement) : 0;
      const center = garmentValue - (wearerEaseCm[preference][region] ?? 0);
      const halfWidth = LENGTH_REGIONS.has(region) ? 1.6 : 1.5 + stretch;
      return [region, { minCm: round(center - halfWidth), maxCm: round(center + halfWidth) }];
    }));
    return [preference, ranges];
  })) as GarmentVariant["compatibleBodyRanges"];

  return {
    id: `${product.id}:${brand.id}:${String(slotIndex + 1).padStart(2, "0")}`,
    productId: product.id,
    brandId: brand.id,
    size,
    sourceSizeIndex,
    sourceSizeLabel: product.sizes[sourceSizeIndex],
    measurements,
    wearerEaseCm,
    compatibleBodyRanges,
    available: true,
    provenance: {
      type: "synthetic",
      generatorVersion: SYNTHETIC_CATALOG_VERSION,
      assumptions: [
        "Generated for deterministic software evaluation; not measured from the product image.",
        `Declared fit=${product.fit}; declared stretch=${product.stretch}.`,
      ],
    },
  };
}

function orderedProducts(source: readonly RawCatalogProduct[]): RawCatalogProduct[] {
  const departmentOrder: Record<Department, number> = { Men: 0, Women: 1 };
  return [...source].sort((left, right) =>
    departmentOrder[left.gender] - departmentOrder[right.gender]
    || left.category.localeCompare(right.category)
    || left.id.localeCompare(right.id),
  );
}

export function buildSyntheticCatalog(
  source: readonly RawCatalogProduct[] = productPhotos as RawCatalogProduct[],
): FitCatalog {
  const styles: FitStyle[] = [];
  const variants: GarmentVariant[] = [];

  orderedProducts(source).forEach((product, globalIndex) => {
    const brandIndex = globalIndex % SYNTHETIC_BRANDS.length;
    const brand = SYNTHETIC_BRANDS[brandIndex];
    const taxonomy = classifyProduct(product);
    const sizes = sizeSystemFor(product.gender, brandIndex, taxonomy.fitFamily, taxonomy.garmentType);
    const variantsPerSourceSize = sizes.length / product.sizes.length;
    const generated = sizes.map((size, slotIndex) => makeVariant(
      product,
      brand,
      brandIndex,
      taxonomy,
      size,
      slotIndex,
      Math.min(product.sizes.length - 1, Math.floor(slotIndex / variantsPerSourceSize)),
    ));
    variants.push(...generated);
    styles.push({
      productId: product.id,
      name: product.name,
      sourceImage: product.image,
      sourceImages: product.images ? [...product.images] : undefined,
      sourceSizeLabels: [...product.sizes],
      department: product.gender,
      merchandisingCategory: product.category,
      garmentType: taxonomy.garmentType,
      fitFamily: taxonomy.fitFamily,
      brandId: brand.id,
      material: product.material,
      declaredFit: product.fit,
      declaredStretch: product.stretch,
      criticalRegions: taxonomy.criticalRegions,
      secondaryRegions: taxonomy.secondaryRegions,
      variantIds: generated.map((variant) => variant.id),
      supported: taxonomy.criticalRegions.length > 0,
    });
  });

  return {
    version: SYNTHETIC_CATALOG_VERSION,
    ruleVersion: FIT_RULE_VERSION,
    measurementMethodVersion: MEASUREMENT_METHOD_VERSION,
    brands: SYNTHETIC_BRANDS.map((brand) => ({ ...brand, regionOffsetsCm: { ...brand.regionOffsetsCm } })),
    styles,
    variants,
    comparisonFixtures: buildComparisonFixtures(styles),
  };
}

function buildComparisonFixtures(styles: FitStyle[]): FitCatalog["comparisonFixtures"] {
  const fixtures: FitCatalog["comparisonFixtures"] = [];
  const pairs = new Map<string, FitStyle[]>();
  for (const style of styles) {
    const key = `${style.department}|${style.merchandisingCategory}`;
    const group = pairs.get(key) ?? [];
    group.push(style);
    pairs.set(key, group);
  }
  for (const [pair, group] of pairs) {
    const represented = new Set(group.map((style) => style.brandId));
    const [department, merchandisingCategory] = pair.split("|") as [Department, string];
    const fitFamily = group[0].fitFamily;
    for (const brand of SYNTHETIC_BRANDS) {
      if (represented.size >= 3) break;
      if (represented.has(brand.id)) continue;
      const exemplar = group[0];
      const brandIndex = SYNTHETIC_BRANDS.findIndex((candidate) => candidate.id === brand.id);
      const fixtureId = `comparison:${department}:${merchandisingCategory}:${brand.id}`;
      const rawProduct: RawCatalogProduct = {
        id: fixtureId,
        gender: department,
        category: merchandisingCategory,
        name: `${brand.displayName} ${merchandisingCategory} comparison fixture`,
        material: exemplar.material,
        fit: exemplar.declaredFit,
        stretch: exemplar.declaredStretch,
        sizes: [...exemplar.sourceSizeLabels],
      };
      const taxonomy: Taxonomy = {
        garmentType: exemplar.garmentType,
        fitFamily: exemplar.fitFamily,
        criticalRegions: [...exemplar.criticalRegions],
        secondaryRegions: [...exemplar.secondaryRegions],
      };
      const sizes = sizeSystemFor(department, brandIndex, taxonomy.fitFamily, taxonomy.garmentType);
      const variantsPerSourceSize = sizes.length / rawProduct.sizes.length;
      const fixtureVariants = sizes.map((size, slotIndex) => makeVariant(
        rawProduct,
        brand,
        brandIndex,
        taxonomy,
        size,
        slotIndex,
        Math.min(rawProduct.sizes.length - 1, Math.floor(slotIndex / variantsPerSourceSize)),
      ));
      const fixtureStyle: FitStyle = {
        productId: fixtureId,
        name: rawProduct.name,
        sourceSizeLabels: [...rawProduct.sizes],
        department,
        merchandisingCategory,
        garmentType: taxonomy.garmentType,
        fitFamily: taxonomy.fitFamily,
        brandId: brand.id,
        material: rawProduct.material,
        declaredFit: rawProduct.fit,
        declaredStretch: rawProduct.stretch,
        criticalRegions: [...taxonomy.criticalRegions],
        secondaryRegions: [...taxonomy.secondaryRegions],
        variantIds: fixtureVariants.map((variant) => variant.id),
        supported: true,
      };
      fixtures.push({
        id: fixtureId,
        department,
        merchandisingCategory,
        fitFamily,
        brandId: brand.id,
        dataOnly: true,
        style: fixtureStyle,
        variants: fixtureVariants,
      });
      represented.add(brand.id);
    }
  }
  return fixtures;
}
