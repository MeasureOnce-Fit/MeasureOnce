import assert from "node:assert/strict";
import test from "node:test";

import {
  getProductFitRecommendation,
  handleProductFitRecommendationPost,
} from "../../src/lib/fit/product-fit";

const dressMeasurements = [
  { region: "chest_bust", value: 87.4, unit: "cm" },
  { region: "waist", value: 70.82, unit: "cm" },
  { region: "hip_seat", value: 96.04, unit: "cm" },
] as const;

test("runs a selected storefront product through the engine with shopper-entered body evidence", () => {
  const payload = getProductFitRecommendation({
    targetProductId: "mo-women-001",
    preference: "regular",
    measurements: dressMeasurements,
  });

  assert.equal(payload.synthetic, true);
  assert.equal(payload.product.id, "mo-women-001");
  assert.equal(payload.product.category, "Dresses");
  assert.equal(payload.result.state, "RECOMMENDED");
  assert.equal(payload.result.recommendedSizeLabel, "8/10");
  assert.deepEqual(payload.result.findings.map(({ region, assessment }) => [region, assessment]), [
    ["chest_bust", "FIT"],
    ["waist", "FIT"],
    ["hip_seat", "FIT"],
  ]);
});

test("keeps equivalent inch and centimetre product-fit requests physically equivalent", () => {
  const centimetres = getProductFitRecommendation({
    targetProductId: "mo-women-001",
    preference: "regular",
    measurements: dressMeasurements,
  });
  const inches = getProductFitRecommendation({
    targetProductId: "mo-women-001",
    preference: "regular",
    measurements: dressMeasurements.map((measurement) => ({
      ...measurement,
      value: measurement.value / 2.54,
      unit: "in" as const,
    })),
  });

  assert.equal(inches.result.state, centimetres.result.state);
  assert.equal(inches.result.recommendedSizeLabel, centimetres.result.recommendedSizeLabel);
});

test("preserves both labelled options for a body-measurement tradeoff", () => {
  const payload = getProductFitRecommendation({
    targetProductId: "mo-men-006",
    preference: "regular",
    measurements: [
      { region: "waist", value: 74, unit: "cm" },
      { region: "hip_seat", value: 90, unit: "cm" },
      { region: "inseam", value: 72.75, unit: "cm" },
    ],
  });

  assert.equal(payload.result.state, "TRADEOFF");
  assert.deepEqual(payload.result.options?.map((option) => option.sizeLabel), ["30×30", "28×30"]);
  assert.ok(payload.result.options?.every((option) => option.findings.length > 0));
});

test("rejects unknown, malformed, duplicated, and catalog-shaping inputs", () => {
  const invalid = [
    {},
    { targetProductId: "unknown", preference: "regular", measurements: dressMeasurements },
    { targetProductId: "mo-women-001", preference: "unknown", measurements: dressMeasurements },
    { targetProductId: "mo-women-001", preference: "regular", measurements: [{ region: "waist", value: 70, unit: "cm" }, { region: "waist", value: 71, unit: "cm" }] },
    { targetProductId: "mo-women-001", preference: "regular", measurements: [...dressMeasurements, { region: "variantId", value: 1, unit: "cm" }] },
    { targetProductId: "mo-women-001", preference: "regular", measurements: dressMeasurements, catalog: {} },
  ];

  for (const input of invalid) {
    assert.throws(() => getProductFitRecommendation(input), /invalid product fit recommendation request/i);
  }
});

test("returns a no-store, sanitized response from the product-fit endpoint", async () => {
  const response = await handleProductFitRecommendationPost(new Request("http://localhost/api/fit/recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-women-001", preference: "regular", measurements: dressMeasurements }),
  }));
  const payload = await response.json() as Record<string, unknown>;
  const serialized = JSON.stringify(payload);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Object.keys(payload).sort(), ["product", "result", "synthetic", "targetProductId"]);
  assert.doesNotMatch(serialized, /normalizedMeasurements|compatibleBodyRanges|wearerEaseCm|variantId|confidence/);
});
