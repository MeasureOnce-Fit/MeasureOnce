import assert from "node:assert/strict";
import test from "node:test";

import {
  CategorySizeReferenceInputError,
  getCategorySizeReferenceById,
  handleCategorySizeReferenceRequest,
  listCategorySizeBrands,
  listCategorySizeOptions,
  recommendFromCategorySizeReference,
  resolveProfileCategorySizeReference,
} from "../../src/lib/fit/category-size-reference";
import { categoryNoun, categorySizeLabel, categorySizeObservations } from "../../src/lib/fit/category-size-reference-ui";
import { buildSyntheticCatalog } from "../../src/lib/fit/catalog";
import { categorySizeReferenceFixtures } from "../../src/lib/fit/category-size-reference-fixtures";

function firstVerifiedReference(targetProductId: string) {
  for (const brand of listCategorySizeBrands(targetProductId)) {
    const reference = listCategorySizeOptions(targetProductId, brand.brandId)[0];
    if (reference) return reference;
  }
  throw new Error(`No verified reference available for ${targetProductId}.`);
}

function justRightObservations(reference: { supportedRegions: string[] }) {
  return Object.fromEntries(reference.supportedRegions.map((region) => [
    region,
    ["shoulder_cross_back", "body_length", "sleeve_length", "rise", "inseam", "outseam"].includes(region)
      ? "right_length"
      : "just_right",
  ]));
}

test("category-size API lists brands then sizes without raw geometry", async () => {
  const brands = await handleCategorySizeReferenceRequest(new Request(
    "http://localhost/api/fit/category-size-reference?targetProductId=mo-women-081&view=brands",
  ));

  assert.equal(brands.status, 200);
  assert.equal(brands.headers.get("Cache-Control"), "no-store");
  assert.doesNotMatch(await brands.clone().text(), /valueCm|measurements|wearerEase|methodId|variantId/i);

  const brandPayload = await brands.json() as { brands: Array<{ brandId: string }> };
  const sizes = await handleCategorySizeReferenceRequest(new Request(
    `http://localhost/api/fit/category-size-reference?targetProductId=mo-women-081&view=sizes&brandId=${brandPayload.brands[0].brandId}`,
  ));

  assert.equal(sizes.status, 200);
  assert.doesNotMatch(await sizes.text(), /valueCm|measurements|wearerEase|methodId|variantId/i);
});

test("resolves a legacy Velmora dress size 0 to its verified profile reference", () => {
  const reference = resolveProfileCategorySizeReference({
    department: "Women",
    brandName: "Velmora",
    category: "Dresses",
    sizeLabel: "0",
  });

  assert.ok(reference);
  assert.equal(reference.id, "csr:measureonce:brand_02:women:dresses:0");
  assert.equal(reference.sizeLabel, "0");
});

test("keeps a persisted legacy reference executable without listing it as a new choice", () => {
  const legacyId = "csr:formline:outerwear:8";
  const activeReference = listCategorySizeOptions("mo-women-081", "brand_05")[0];

  assert.ok(getCategorySizeReferenceById(legacyId));
  assert.ok(activeReference);
  assert.notEqual(activeReference.id, legacyId);
  const result = recommendFromCategorySizeReference({
    targetProductId: "mo-women-081",
    preference: "regular",
    referenceId: legacyId,
    observations: justRightObservations(activeReference),
  }).result;
  assert.deepEqual(result.evidence.used, ["reference_garment"]);
  assert.deepEqual(result.evidence.missingRegions, []);
});

test("category-size API rejects malformed input and never accepts client geometry", async () => {
  const missingTarget = await handleCategorySizeReferenceRequest(new Request(
    "http://localhost/api/fit/category-size-reference?view=brands",
  ));
  assert.equal(missingTarget.status, 400);

  const unknownView = await handleCategorySizeReferenceRequest(new Request(
    "http://localhost/api/fit/category-size-reference?targetProductId=mo-women-081&view=variants",
  ));
  assert.equal(unknownView.status, 400);

  const unknownBrand = await handleCategorySizeReferenceRequest(new Request(
    "http://localhost/api/fit/category-size-reference?targetProductId=mo-women-081&view=sizes&brandId=unknown",
  ));
  assert.equal(unknownBrand.status, 400);

  const malformedJson = await handleCategorySizeReferenceRequest(new Request(
    "http://localhost/api/fit/category-size-reference",
    { method: "POST", body: "{" },
  ));
  assert.equal(malformedJson.status, 400);

  const geometry = await handleCategorySizeReferenceRequest(new Request(
    "http://localhost/api/fit/category-size-reference",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetProductId: "mo-women-081",
        preference: "regular",
        referenceId: "csr:formline:outerwear:8",
        observations: { chest_bust: "just_right", shoulder_cross_back: "right_length" },
        measurements: [{ region: "chest_bust", valueCm: 100 }],
      }),
    },
  ));
  assert.equal(geometry.status, 400);
  assert.doesNotMatch(await geometry.text(), /valueCm|measurements|wearerEase|methodId|variantId/i);
});

test("category-size API returns a sanitized recommendation", async () => {
  const reference = firstVerifiedReference("mo-women-081");
  const response = await handleCategorySizeReferenceRequest(new Request(
    "http://localhost/api/fit/category-size-reference",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetProductId: "mo-women-081",
        preference: "regular",
        referenceId: reference.id,
        observations: justRightObservations(reference),
      }),
    },
  ));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.doesNotMatch(await response.text(), /valueCm|measurements|wearerEase|methodId|variantId|geometry/i);
});

test("a verified Solenne & Rue jacket size that fits just right produces a usable target size", () => {
  const reference = listCategorySizeOptions("mo-men-013", "brand_04")[0];
  assert.ok(reference);
  const result = recommendFromCategorySizeReference({
    targetProductId: "mo-men-013",
    preference: "regular",
    referenceId: reference.id,
    observations: {
      chest_bust: "just_right",
      shoulder_cross_back: "right_length",
      body_length: "right_length",
    },
  });

  assert.ok(
    ["RECOMMENDED", "TRADEOFF"].includes(result.result.state),
    `A verified, just-right known jacket size must not end in an unusable result: ${result.result.state}`,
  );
});

test("resolves persisted reference metadata without exposing chart geometry", () => {
  const reference = firstVerifiedReference("mo-women-081");
  assert.deepEqual(getCategorySizeReferenceById(reference.id), {
    id: reference.id,
    version: reference.version,
    brandName: reference.brandName,
    category: reference.category,
    sizeLabel: reference.sizeLabel,
  });
  assert.equal(getCategorySizeReferenceById("unknown"), undefined);
});

test("lists verified references for every catalog brand that makes the jacket target", () => {
  const brands = listCategorySizeBrands("mo-women-081");

  assert.equal(brands.length, 10);
  assert.ok(brands.every((brand) => brand.category === "Outerwear"));
  assert.deepEqual(brands.map((brand) => brand.brandName), [
    "Avenoir",
    "Caelune",
    "Cendra Lane",
    "Marrow & Vale",
    "Norellin",
    "Orivelle",
    "Solenne & Rue",
    "Tern & Thread",
    "Velmora",
    "Virelle",
  ]);
  assert.equal(brands.filter((brand) => brand.hasVerifiedReference).length, 10);
  assert.equal(brands.find((brand) => brand.brandName === "Orivelle")?.hasVerifiedReference, true);
  assert.equal(brands.find((brand) => brand.brandName === "Cendra Lane")?.hasVerifiedReference, true);

  const orivelle = brands.find((brand) => brand.brandName === "Orivelle");
  assert.ok(orivelle);
  const sizes = listCategorySizeOptions("mo-women-081", orivelle.brandId);

  assert.ok(sizes.length > 0);
  assert.ok(sizes.every((size) => size.supportedRegions.includes("chest_bust")));
  assert.ok(sizes.every((size) => size.supportedRegions.includes("shoulder_cross_back")));
  assert.doesNotMatch(JSON.stringify({ brands, sizes }), /valueCm|wearerEaseCm|methodId|measurements/i);
});

test("lists the catalog's complete Caelune men's jacket size range", () => {
  const sizes = listCategorySizeOptions("mo-men-013", "brand_07");

  assert.equal(sizes.length, 18);
  assert.deepEqual(new Set(sizes.map((size) => size.sizeLabel)), new Set([
    "36S", "36R", "36L", "38S", "38R", "38L", "40S", "40R", "40L",
    "42S", "42R", "42L", "44S", "44R", "44L", "46S", "46R", "46L",
  ]));
});

test("a just-right Caelune men's jacket size produces a usable target size", () => {
  const reference = listCategorySizeOptions("mo-men-013", "brand_07")[0];
  assert.ok(reference);
  const result = recommendFromCategorySizeReference({
    targetProductId: "mo-men-013",
    preference: "regular",
    referenceId: reference.id,
    observations: {
      chest_bust: "just_right",
      shoulder_cross_back: "right_length",
      body_length: "right_length",
    },
  });

  assert.ok(
    ["RECOMMENDED", "TRADEOFF"].includes(result.result.state),
    `A verified, just-right Caelune jacket size must not end in ${result.result.state}`,
  );
});

test("every exposed men's jacket brand and size produces a usable just-right result", () => {
  const brands = listCategorySizeBrands("mo-men-013");

  assert.deepEqual(brands.map((brand) => brand.brandName), [
    "Avenoir",
    "Caelune",
    "Cendra Lane",
    "Marrow & Vale",
    "Norellin",
    "Orivelle",
    "Solenne & Rue",
    "Tern & Thread",
    "Velmora",
    "Virelle",
  ]);

  for (const brand of brands) {
    const sizes = listCategorySizeOptions("mo-men-013", brand.brandId);
    assert.ok(sizes.length > 0, `${brand.brandName} must expose its declared jacket sizes`);
    for (const size of sizes) {
      const result = recommendFromCategorySizeReference({
        targetProductId: "mo-men-013",
        preference: "regular",
        referenceId: size.id,
        observations: {
          chest_bust: "just_right",
          shoulder_cross_back: "right_length",
          body_length: "right_length",
        },
      });
      assert.ok(
        ["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(result.result.state),
        `${brand.brandName} ${size.sizeLabel} must return a truthful evaluated state`,
      );
    }
  }
});

test("lists every catalog dress brand and at least one verified reference", () => {
  const brands = listCategorySizeBrands("mo-women-004");

  assert.equal(brands.length, 10);
  assert.ok(brands.every((brand) => brand.category === "Dresses"));
  assert.ok(brands.some((brand) => brand.hasVerifiedReference));
  assert.ok(brands.some((brand) => listCategorySizeOptions("mo-women-004", brand.brandId).length > 0));
});

test("never leaves a women's dress or outerwear target without its catalog brands", () => {
  const catalog = buildSyntheticCatalog();
  const targets = catalog.styles.filter((style) => style.department === "Women"
    && ["Dresses", "Outerwear"].includes(style.merchandisingCategory));

  assert.ok(targets.length > 0);
  for (const target of targets) {
    assert.equal(
      listCategorySizeBrands(target.productId).length,
      10,
      `${target.productId} must list all ten category brands`,
    );
  }
});

test("gives every active MeasureOnce brand/category pair a declared size chart", () => {
  const catalog = buildSyntheticCatalog();
  const activePairs = new Set(
    catalog.styles
      .filter((style) => style.supported && style.variantIds.some((variantId) => (
        catalog.variants.find((variant) => variant.id === variantId)?.available
      )))
      .map((style) => `${style.department}\u0000${style.merchandisingCategory}`),
  );

  for (const pair of activePairs) {
    const [department, category] = pair.split("\u0000");
    const activeBrandIds = new Set(catalog.styles
      .filter((style) => style.department === department && style.merchandisingCategory === category)
      .map((style) => style.brandId));
    const chartBrandIds = new Set(categorySizeReferenceFixtures
      .filter((reference) => reference.department === department && reference.category === category)
      .map((reference) => reference.brandId));
    assert.deepEqual([...activeBrandIds].filter((brandId) => !chartBrandIds.has(brandId)), [], `${pair} lacks a declared chart`);
  }
});

test("declares every sellable catalog size label in its matching brand/category chart", () => {
  const catalog = buildSyntheticCatalog();
  const stylesByPair = new Map<string, typeof catalog.styles>();
  const variantsById = new Map(catalog.variants.map((variant) => [variant.id, variant]));
  for (const style of catalog.styles.filter((candidate) => candidate.supported)) {
    const key = `${style.department}\u0000${style.brandId}\u0000${style.merchandisingCategory}`;
    stylesByPair.set(key, [...(stylesByPair.get(key) ?? []), style]);
  }

  for (const [key, styles] of stylesByPair) {
    const [department, brandId, category] = key.split("\u0000");
    const expectedLabels = [...new Set(styles.flatMap((style) => style.variantIds)
      .map((variantId) => variantsById.get(variantId))
      .filter((variant): variant is NonNullable<typeof variant> => Boolean(variant?.available))
      .map((variant) => variant.size.label))]
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    const actualLabels = categorySizeReferenceFixtures
      .filter((reference) => reference.department === department && reference.brandId === brandId && reference.category === category)
      .map((reference) => reference.size.label)
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    assert.deepEqual(actualLabels, expectedLabels, `${key} chart must expose every sellable size`);
  }
});

test("category-size API returns verified sizes for every catalog brand", async () => {
  const brand = listCategorySizeBrands("mo-women-081").find((candidate) => listCategorySizeOptions("mo-women-081", candidate.brandId).length > 0);
  assert.ok(brand);
  const response = await handleCategorySizeReferenceRequest(new Request(
    `http://localhost/api/fit/category-size-reference?targetProductId=mo-women-081&view=sizes&brandId=${brand.brandId}`,
  ));

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const payload = await response.json() as { synthetic: boolean; targetProductId: string; sizes: unknown[] };
  assert.equal(payload.synthetic, true);
  assert.equal(payload.targetProductId, "mo-women-081");
  assert.ok(payload.sizes.length > 0);
});

test("keeps independent jeans axes in explicit category-size labels", () => {
  const brand = listCategorySizeBrands("mo-men-006").find((candidate) => candidate.hasVerifiedReference);
  assert.ok(brand);

  const sizes = listCategorySizeOptions("mo-men-006", brand.brandId);

  assert.ok(sizes.some((size) => size.axes?.waist && size.axes?.inseam));
});

test("lists only target-required Top regions and accepts that exact payload", () => {
  const brands = listCategorySizeBrands("mo-women-007");
  const avenoir = brands.find((brand) => brand.brandName === "Avenoir");
  assert.ok(avenoir);
  const reference = listCategorySizeOptions("mo-women-007", avenoir.brandId)[0];
  assert.ok(reference);
  assert.deepEqual(reference.supportedRegions, ["chest_bust"]);

  const result = recommendFromCategorySizeReference({
    targetProductId: "mo-women-007",
    preference: "regular",
    referenceId: reference.id,
    observations: { chest_bust: "just_right" },
  });
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(result.result.state));
});

test("uses an explicit category reference through the recommendation engine", () => {
  const reference = firstVerifiedReference("mo-women-081");
  const result = recommendFromCategorySizeReference({
    targetProductId: "mo-women-081",
    preference: "regular",
    referenceId: reference.id,
    observations: justRightObservations(reference),
  });

  assert.equal(result.synthetic, true);
  assert.equal(result.targetProductId, "mo-women-081");
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(result.result.state));
  assert.deepEqual(result.result.evidence.used, ["reference_garment"]);
  assert.deepEqual(result.result.evidence.missingRegions, []);
  assert.doesNotMatch(JSON.stringify(result), /variantId|valueCm|measurements|wearerEaseCm|geometry/i);
});

test("requires both independent jeans axes before consuming a category-size reference", () => {
  const reference = listCategorySizeOptions("mo-men-006", "brand_01")
    .find((candidate) => candidate.axes?.waist && candidate.axes?.inseam);
  assert.ok(reference);
  const input = {
    targetProductId: "mo-men-006",
    preference: "regular",
    referenceId: reference.id,
    observations: {
      waist: "just_right",
      hip_seat: "just_right",
      inseam: "right_length",
    },
  };

  const result = recommendFromCategorySizeReference(input);
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(result.result.state));
  assert.deepEqual(result.result.evidence.requiredRegions, ["waist", "hip_seat", "inseam"]);
  assert.deepEqual(result.result.evidence.supportedRegions, ["waist", "hip_seat", "inseam"]);

  assert.throws(() => recommendFromCategorySizeReference({
    ...input,
    observations: { waist: "just_right", hip_seat: "just_right" },
  }), /invalid category size reference/i);
});

test("rejects client geometry, category mismatches, and incomplete observations", () => {
  const reference = firstVerifiedReference("mo-women-081");
  const base = {
    targetProductId: "mo-women-081",
    preference: "regular",
    referenceId: reference.id,
    observations: justRightObservations(reference),
  };

  assert.throws(() => recommendFromCategorySizeReference({
    ...base,
    measurements: [{ region: "chest_bust", valueCm: 90 }],
  }), CategorySizeReferenceInputError);
  assert.throws(() => recommendFromCategorySizeReference({
    ...base,
    targetProductId: "mo-men-006",
  }), /invalid category size reference/i);
  assert.throws(() => recommendFromCategorySizeReference({
    ...base,
    observations: { chest_bust: "just_right" },
  }), /invalid category size reference/i);
  assert.throws(() => recommendFromCategorySizeReference({
    ...base,
    referenceId: "csr:unknown:outerwear:8",
  }), /invalid category size reference/i);
  assert.throws(() => recommendFromCategorySizeReference({
    ...base,
    observations: { ...base.observations, body_length: "right_length" },
  }), /invalid category size reference/i);
});

test("shapes only verified jacket regions into category-size observations", () => {
  const feedback = {
    waist: "Too loose",
    hip: "Just right",
    chest: "Just right",
    shoulder: "Just right",
    length: "Perfect",
    sleeve: "Perfect",
    neck: "Too tight",
    inseam: "Perfect",
  };

  assert.equal(categoryNoun("Outerwear"), "jacket");
  assert.equal(categoryNoun("Denim"), "jeans");
  assert.deepEqual(
    categorySizeObservations(feedback, ["chest_bust", "shoulder_cross_back"]),
    { chest_bust: "just_right", shoulder_cross_back: "right_length" },
  );
});

test("keeps an alpha shirt label visible even when the verified chart also carries technical axes", () => {
  assert.equal(categorySizeLabel("Shirts & Tees", {
    sizeLabel: "M",
    axes: { waist: "30", inseam: "32", neck: "15", sleeve: "34", length: "regular" },
  }), "M");
  assert.equal(categorySizeLabel("Denim", {
    sizeLabel: "M",
    axes: { waist: "30", inseam: "32" },
  }), "Waist 30 · inseam 32");
});
