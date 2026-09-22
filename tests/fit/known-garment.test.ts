import assert from "node:assert/strict";
import test from "node:test";

import { getKnownGarmentRecommendation, handleKnownGarmentRequest, listKnownGarmentBrands, listKnownGarmentOptions } from "../../src/lib/fit/known-garment";
import { buildKnownGarmentObservations, formatFitFindingReason, formatFitRegion, knownGarmentAreaKeys } from "../../src/lib/fit/known-garment-ui";

test("offers exact synthetic anchors and runs the known-garment path without exposing geometry", () => {
  const anchors = listKnownGarmentOptions("mo-women-001", "wrap dress");
  assert.ok(anchors.length > 0);
  assert.ok(anchors.every((anchor) => anchor.productName.toLowerCase().includes("wrap dress")));
  assert.equal(new Set(anchors.map((anchor) => anchor.id)).size, anchors.length);
  const payload = getKnownGarmentRecommendation({
    targetProductId: "mo-women-001",
    preference: "regular",
    anchorVariantId: anchors[0].id,
    observations: { chest_bust: "just_right" },
  });
  assert.equal(payload.synthetic, true);
  assert.equal(payload.targetProductId, "mo-women-001");
  assert.ok(payload.result.evidence.used.includes("reference_garment"));
  assert.doesNotMatch(JSON.stringify(payload), /compatibleBodyRanges|wearerEaseCm|measurements/);
});

test("rejects malformed known-garment requests and returns a no-store public response", async () => {
  assert.throws(() => getKnownGarmentRecommendation({ targetProductId: "mo-women-001", preference: "regular", anchorVariantId: "unknown", observations: { chest_bust: "just_right" } }), /invalid known garment/i);
  const response = await handleKnownGarmentRequest(new Request("http://localhost/api/fit/known-garment?targetProductId=mo-women-001"));
  const payload = await response.json() as Record<string, unknown>;
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Object.keys(payload).sort(), ["anchors", "synthetic", "targetProductId"]);
});

test("requires a shopper search and returns only reference garments that cover the target regions", () => {
  assert.deepEqual(listKnownGarmentOptions("mo-women-001"), []);

  const anchors = listKnownGarmentOptions("mo-women-001", "norellin");
  assert.ok(anchors.length > 0);
  assert.ok(anchors.every((anchor) => anchor.brandName.toLowerCase().includes("norellin")));
  assert.ok(anchors.every((anchor) => (["chest_bust", "waist", "hip_seat"] as const).every((region) => anchor.regions.includes(region))));
  assert.deepEqual(anchors[0].regions, ["chest_bust", "waist", "hip_seat"]);

  const first = anchors[0];
  const payload = getKnownGarmentRecommendation({
    targetProductId: "mo-women-001",
    preference: "regular",
    anchorVariantId: first.id,
    observations: Object.fromEntries(first.regions.map((region) => [region, new Set<string>(["shoulder_cross_back", "body_length", "sleeve_length"]).has(region) ? "right_length" : "just_right"])),
  });
  assert.notEqual(payload.result.state, "INSUFFICIENT_GARMENT_EVIDENCE");
});

test("lists compatible measured brands before the shopper searches", async () => {
  const brands = listKnownGarmentBrands("mo-women-001");
  assert.ok(brands.length > 1);
  assert.deepEqual(brands, [...brands].sort((left, right) => left.localeCompare(right)));
  assert.ok(brands.includes("Norellin"));

  const response = await handleKnownGarmentRequest(new Request("http://localhost/api/fit/known-garment?targetProductId=mo-women-001&view=brands"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), { synthetic: true, targetProductId: "mo-women-001", brands });
});

test("submits only regions supported by the shopper's selected reference garment", () => {
  const regions = ["chest_bust", "waist", "hip_seat", "body_length", "neck", "inseam"] as const;
  assert.deepEqual(knownGarmentAreaKeys([...regions]), ["chest", "waist", "hip", "length", "neck", "inseam"]);
  assert.deepEqual(buildKnownGarmentObservations({
    waist: "Just right",
    hip: "Just right",
    chest: "Just right",
    shoulder: "Just right",
    length: "Perfect",
    sleeve: "Perfect",
    neck: "Just right",
    inseam: "Perfect",
  }, [...regions]), {
    chest_bust: "just_right",
    waist: "just_right",
    hip_seat: "just_right",
    body_length: "right_length",
    neck: "just_right",
    inseam: "right_length",
  });
  assert.equal(formatFitRegion("sleeve_length"), "Sleeve length");
  assert.equal(formatFitFindingReason("sleeve_length is not available.", "sleeve_length"), "Sleeve length is not available.");
});

test("includes every region required by composite size axes", () => {
  const cases = [
    { targetProductId: "mo-men-006", query: "Velmora", requiredRegions: ["waist", "hip_seat", "inseam"] },
    { targetProductId: "mo-men-095", query: "Avenoir", requiredRegions: ["chest_bust", "neck", "sleeve_length"] },
    { targetProductId: "mo-men-001", query: "Virelle", requiredRegions: ["chest_bust", "shoulder_cross_back", "body_length"] },
  ] as const;

  for (const testCase of cases) {
    const anchors = listKnownGarmentOptions(testCase.targetProductId, testCase.query);
    assert.ok(anchors.length > 0, `expected a measured ${testCase.query} anchor`);
    assert.deepEqual(anchors[0].regions, testCase.requiredRegions);
    const observations = buildKnownGarmentObservations({
      waist: "Just right",
      hip: "Just right",
      chest: "Just right",
      shoulder: "Just right",
      length: "Perfect",
      sleeve: "Perfect",
      neck: "Just right",
      inseam: "Perfect",
    }, anchors[0].regions);
    const payload = getKnownGarmentRecommendation({
      targetProductId: testCase.targetProductId,
      preference: "regular",
      anchorVariantId: anchors[0].id,
      observations,
    });
    assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(payload.result.state), `${testCase.targetProductId} returned ${payload.result.state}`);
    assert.deepEqual(payload.result.evidence.missingRegions, []);
  }
});

test("preserves both labelled options in an equal two-size tradeoff", () => {
  const payload = getKnownGarmentRecommendation({
    targetProductId: "mo-men-029",
    preference: "regular",
    anchorVariantId: "mo-men-019:brand_03:04",
    observations: { waist: "just_right", hip_seat: "just_right" },
  });

  assert.equal(payload.result.state, "TRADEOFF");
  assert.deepEqual(payload.result.options?.map((option) => option.sizeLabel), ["30", "28"]);
  assert.ok(payload.result.options?.every((option) => option.findings.length > 0));
  assert.doesNotMatch(JSON.stringify(payload), /variantId|compatibleBodyRanges|wearerEaseCm|measurements/);
});
