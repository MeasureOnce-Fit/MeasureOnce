import assert from "node:assert/strict";
import test from "node:test";

import {
  getShowcaseRecommendation,
  handleShowcaseRecommendationPost,
} from "../../src/lib/fit/showcase-preview";

const TARGETS = ["mo-women-001", "mo-women-004", "mo-women-021"] as const;

test("runs the server-owned body fixture through the fit engine for all showcase brands", () => {
  const expected = [
    ["Orivelle", "RECOMMENDED", "8/10"],
    ["Norellin", "INSUFFICIENT_PROFILE_EVIDENCE", undefined],
    ["Caelune", "INSUFFICIENT_PROFILE_EVIDENCE", undefined],
  ] as const;

  TARGETS.forEach((targetProductId, index) => {
    const payload = getShowcaseRecommendation({
      scenarioId: "alex-body-dresses",
      targetProductId,
      unit: "cm",
    });

    assert.equal(payload.synthetic, true);
    assert.equal(payload.product.brandName, expected[index][0]);
    assert.equal(payload.result.state, expected[index][1]);
    assert.equal(payload.result.recommendedSizeLabel, expected[index][2]);
    if (payload.result.state === "RECOMMENDED") assert.deepEqual(payload.result.findings.map(({ assessment }) => assessment), ["FIT", "FIT", "FIT"]);
    assert.deepEqual(payload.result.versions, {
      catalog: "m1-synthetic-catalog-1.0.0",
      rules: "m1-rules-1.0.0",
      methods: "m1-methods-1.0.0",
    });
  });
});

test("keeps centimetre and inch requests physically equivalent", () => {
  const centimetres = getShowcaseRecommendation({
    scenarioId: "alex-body-dresses",
    targetProductId: "mo-women-001",
    unit: "cm",
  });
  const inches = getShowcaseRecommendation({
    scenarioId: "alex-body-dresses",
    targetProductId: "mo-women-001",
    unit: "in",
  });

  assert.equal(inches.result.state, centimetres.result.state);
  assert.equal(inches.result.recommendedSizeLabel, centimetres.result.recommendedSizeLabel);
  assert.equal(centimetres.result.findings[0]?.evidence?.unit, "cm");
  assert.equal(inches.result.findings[0]?.evidence?.unit, "in");
  assert.equal(centimetres.result.findings[0]?.evidence?.value, 87.4);
  assert.equal(inches.result.findings[0]?.evidence?.value, 34.41);
});

test("runs the exact known-garment fixture without accepting client-owned evidence", () => {
  const expected = [
    ["RECOMMENDED", "0/2", "FIT"],
    ["INSUFFICIENT_PROFILE_EVIDENCE", undefined, undefined],
    ["INSUFFICIENT_PROFILE_EVIDENCE", undefined, undefined],
  ] as const;

  TARGETS.forEach((targetProductId, index) => {
    const payload = getShowcaseRecommendation({
      scenarioId: "alex-known-garment-dresses",
      targetProductId,
      unit: "in",
    });

    assert.equal(payload.result.state, expected[index][0]);
    assert.equal(payload.result.recommendedSizeLabel, expected[index][1]);
    assert.equal(payload.result.findings.find(({ region }) => region === "chest_bust")?.assessment, expected[index][2]);
  });
});

test("rejects unknown or expanded public preview inputs", () => {
  const invalid = [
    {},
    { scenarioId: "unknown", targetProductId: "mo-women-001", unit: "cm" },
    { scenarioId: "alex-body-dresses", targetProductId: "mo-men-002", unit: "cm" },
    { scenarioId: "alex-body-dresses", targetProductId: "mo-women-001", unit: "feet" },
    { scenarioId: "alex-body-dresses", targetProductId: "mo-women-001", unit: "cm", profile: {} },
  ];

  for (const input of invalid) {
    assert.throws(() => getShowcaseRecommendation(input), /invalid showcase recommendation request/i);
  }
});

test("returns a no-store JSON response containing only the sanitized showcase contract", async () => {
  const response = await handleShowcaseRecommendationPost(new Request("http://localhost/api/showcase/recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      scenarioId: "alex-body-dresses",
      targetProductId: "mo-women-001",
      unit: "cm",
    }),
  }));
  const payload = await response.json() as Record<string, unknown>;
  const serialized = JSON.stringify(payload);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Object.keys(payload).sort(), ["product", "result", "scenarioId", "synthetic", "targetProductId", "unit"]);
  assert.doesNotMatch(serialized, /normalizedMeasurements|compatibleBodyRanges|wearerEaseCm|variantId|confidence/);
});

test("returns a no-store 400 response for malformed JSON", async () => {
  const response = await handleShowcaseRecommendationPost(new Request("http://localhost/api/showcase/recommendation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  }));
  const payload = await response.json() as { error?: string };

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.match(payload.error ?? "", /invalid showcase recommendation request/i);
});
