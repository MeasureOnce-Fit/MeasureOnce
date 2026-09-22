import assert from "node:assert/strict";
import test from "node:test";

import {
  getManualGarmentRecommendation,
  handleManualGarmentRequest,
  listManualGarmentRequirements,
} from "../../src/lib/fit/manual-garment";
import { buildManualGarmentRequest, manualGarmentFields } from "../../src/lib/fit/manual-garment-ui";

const method = (kind: "circumference" | "flat_width" | "length", region: string) =>
  `m1-methods-1.0.0:${kind}:${region}`;

function dressRequest(overrides: Record<string, unknown> = {}) {
  return {
    targetProductId: "mo-women-001",
    preference: "regular",
    reference: {
      brandText: "Unknown brand",
      productText: "A dress that fits",
      labelSize: "M",
      measurements: [
        { region: "chest_bust", value: 92, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "chest_bust") },
        { region: "waist", value: 76, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "waist") },
        { region: "hip_seat", value: 98, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "hip_seat") },
      ],
      observations: {
        chest_bust: "just_right",
        waist: "just_right",
        hip_seat: "just_right",
      },
    },
    ...overrides,
  };
}

type ManualPayload = ReturnType<typeof getManualGarmentRecommendation>;

function recommendedSizeLabel(payload: ManualPayload): string | undefined {
  return "recommendedSizeLabel" in payload.result ? payload.result.recommendedSizeLabel : undefined;
}

function alternateSizeLabel(payload: ManualPayload): string | undefined {
  return "alternateSizeLabel" in payload.result ? payload.result.alternateSizeLabel : undefined;
}

function optionLabels(payload: ManualPayload): string[] | undefined {
  return "options" in payload.result ? payload.result.options.map((option) => option.sizeLabel) : undefined;
}

function optionPriority(payload: ManualPayload): string | undefined {
  return "optionPriority" in payload.result ? payload.result.optionPriority : undefined;
}

test("manual requirements include every region implied by composite size axes", () => {
  const cases = [
    { targetProductId: "mo-men-006", regions: ["waist", "hip_seat", "inseam"] },
    { targetProductId: "mo-men-095", regions: ["chest_bust", "neck", "sleeve_length"] },
    { targetProductId: "mo-men-001", regions: ["chest_bust", "shoulder_cross_back", "body_length"] },
  ];

  for (const testCase of cases) {
    const requirements = listManualGarmentRequirements(testCase.targetProductId);
    assert.deepEqual(requirements.map((requirement) => requirement.region), testCase.regions);
    assert.ok(requirements.every((requirement) => requirement.label.length > 0));
    assert.ok(requirements.every((requirement) => requirement.acceptedKinds.length > 0));
    assert.ok(requirements.every((requirement) => requirement.methodIds.length === requirement.acceptedKinds.length));
    assert.doesNotMatch(JSON.stringify(requirements), /variantId|valueCm|measurements|geometry/i);
  }
});

test("manual garment labels do not affect scoring and descriptive text is bounded", () => {
  const baseline = getManualGarmentRecommendation(dressRequest());
  const changedLabels = getManualGarmentRecommendation(dressRequest({
    reference: {
      ...(dressRequest().reference as Record<string, unknown>),
      brandText: `  ${"Brand".repeat(30)}  `,
      productText: "Different product text",
      labelSize: "999 ULTRA TALL",
    },
  }));

  assert.deepEqual(changedLabels, baseline);
});

test("manual garment centimetres, inches, flat widths and circumferences are physically equivalent", () => {
  const circumference = getManualGarmentRecommendation(dressRequest());
  const inches = getManualGarmentRecommendation(dressRequest({
    reference: {
      ...(dressRequest().reference as Record<string, unknown>),
      measurements: [
        { region: "chest_bust", value: 92 / 2.54, unit: "in", kind: "garment_circumference", methodId: method("circumference", "chest_bust") },
        { region: "waist", value: 76 / 2.54, unit: "in", kind: "garment_circumference", methodId: method("circumference", "waist") },
        { region: "hip_seat", value: 98 / 2.54, unit: "in", kind: "garment_circumference", methodId: method("circumference", "hip_seat") },
      ],
    },
  }));
  const flat = getManualGarmentRecommendation(dressRequest({
    reference: {
      ...(dressRequest().reference as Record<string, unknown>),
      measurements: [
        { region: "chest_bust", value: 46, unit: "cm", kind: "garment_flat_width", methodId: method("flat_width", "chest_bust") },
        { region: "waist", value: 38, unit: "cm", kind: "garment_flat_width", methodId: method("flat_width", "waist") },
        { region: "hip_seat", value: 49, unit: "cm", kind: "garment_flat_width", methodId: method("flat_width", "hip_seat") },
      ],
    },
  }));

  assert.deepEqual(inches, circumference);
  assert.deepEqual(flat, circumference);
});

test("manual garment comparison rejects incomplete, duplicated, irrelevant and mismatched measurements", () => {
  const base = dressRequest();
  const reference = base.reference as Record<string, unknown>;
  const measurements = reference.measurements as Array<Record<string, unknown>>;

  assert.throws(() => getManualGarmentRecommendation(dressRequest({
    reference: { ...reference, measurements: measurements.slice(0, 2) },
  })), /missing.*measurement/i);
  assert.throws(() => getManualGarmentRecommendation(dressRequest({
    reference: { ...reference, measurements: [...measurements, measurements[0]] },
  })), /duplicate.*measurement/i);
  assert.throws(() => getManualGarmentRecommendation(dressRequest({
    reference: { ...reference, measurements: [...measurements, { region: "inseam", value: 75, unit: "cm", kind: "garment_length", methodId: method("length", "inseam") }] },
  })), /irrelevant.*measurement/i);
  assert.throws(() => getManualGarmentRecommendation(dressRequest({
    reference: { ...reference, measurements: [{ ...measurements[0], kind: "garment_length" }, ...measurements.slice(1)] },
  })), /kind.*chest_bust/i);
  assert.throws(() => getManualGarmentRecommendation(dressRequest({
    reference: { ...reference, measurements: [{ ...measurements[0], methodId: "unknown" }, ...measurements.slice(1)] },
  })), /method.*chest_bust/i);
  assert.throws(() => getManualGarmentRecommendation(dressRequest({
    reference: { ...reference, measurements: [{ ...measurements[0], value: 500 }, ...measurements.slice(1)] },
  })), /implausible.*chest_bust/i);
});

test("tight observations select the smallest size with a positive difference in every required region", () => {
  const reference = dressRequest().reference as Record<string, unknown>;
  const tooTight = getManualGarmentRecommendation(dressRequest({
    reference: {
      ...reference,
      measurements: [
        { region: "chest_bust", value: 85, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "chest_bust") },
        { region: "waist", value: 69, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "waist") },
        { region: "hip_seat", value: 94, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "hip_seat") },
      ],
      observations: { chest_bust: "too_tight", waist: "too_tight", hip_seat: "too_tight" },
    },
  }));

  assert.equal(tooTight.result.state, "RECOMMENDED");
  assert.equal(recommendedSizeLabel(tooTight), "8/10");
  assert.deepEqual(tooTight.result.findings.map((finding) => finding.assessment), ["LOOSE", "LOOSE", "LOOSE"]);
});

test("directional observations return no suitable size when every target is on the wrong side", () => {
  const reference = dressRequest().reference as Record<string, unknown>;
  const measurements = (reference.measurements as Array<Record<string, unknown>>).map((measurement) => ({ ...measurement, value: 50 }));
  const tooLoose = getManualGarmentRecommendation(dressRequest({
    reference: { ...reference, measurements, observations: { chest_bust: "too_loose", waist: "too_loose", hip_seat: "too_loose" } },
  }));

  assert.equal(tooLoose.result.state, "NO_SUITABLE_SIZE");
});

test("regional winner count precedes total difference for an adjacent opposing-region tradeoff", () => {
  const reference = dressRequest().reference as Record<string, unknown>;
  const payload = getManualGarmentRecommendation(dressRequest({
    reference: {
      ...reference,
      measurements: [
        { region: "chest_bust", value: 92.39, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "chest_bust") },
        { region: "waist", value: 75.81, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "waist") },
        { region: "hip_seat", value: 103.54, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "hip_seat") },
      ],
    },
  }));

  // 8/10 wins chest and waist; 12/14 wins hip and has the lower total distance.
  assert.equal(payload.result.state, "TRADEOFF");
  assert.equal(optionPriority(payload), "equal");
  assert.equal(recommendedSizeLabel(payload), "8/10");
  assert.equal(alternateSizeLabel(payload), "12/14");
  assert.deepEqual(optionLabels(payload), ["8/10", "12/14"]);
});

test("total difference orders tied regional winners and tradeoff requires adjacency", () => {
  const adjacent = getManualGarmentRecommendation({
    targetProductId: "mo-men-029",
    preference: "regular",
    reference: {
      measurements: [
        { region: "waist", value: 79.84, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "waist") },
        { region: "hip_seat", value: 101, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "hip_seat") },
      ],
      observations: { waist: "just_right", hip_seat: "just_right" },
    },
  });
  const nonAdjacent = getManualGarmentRecommendation({
    targetProductId: "mo-men-029",
    preference: "regular",
    reference: {
      measurements: [
        { region: "waist", value: 79.84, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "waist") },
        { region: "hip_seat", value: 107.78, unit: "cm", kind: "garment_circumference", methodId: method("circumference", "hip_seat") },
      ],
      observations: { waist: "just_right", hip_seat: "just_right" },
    },
  });

  assert.equal(adjacent.result.state, "TRADEOFF");
  assert.deepEqual(optionLabels(adjacent), ["30", "32"]);
  assert.equal(recommendedSizeLabel(adjacent), "30");
  assert.equal(alternateSizeLabel(adjacent), "32");
  assert.equal(nonAdjacent.result.state, "RECOMMENDED");
  assert.equal(recommendedSizeLabel(nonAdjacent), "30");
});

test("fit preference is validated but excluded from direct garment geometry scoring", () => {
  const closer = getManualGarmentRecommendation(dressRequest({ preference: "closer" }));
  const regular = getManualGarmentRecommendation(dressRequest({ preference: "regular" }));
  const relaxed = getManualGarmentRecommendation(dressRequest({ preference: "relaxed" }));

  assert.deepEqual(closer, regular);
  assert.deepEqual(relaxed, regular);
  assert.throws(
    () => getManualGarmentRecommendation(dressRequest({ preference: "athletic" })),
    /invalid manual garment fit request/i,
  );
});

test("manual garment recommendations expose labels and qualitative findings without raw geometry or internal IDs", () => {
  const payload = getManualGarmentRecommendation(dressRequest());
  const serialized = JSON.stringify(payload);

  assert.equal(payload.synthetic, true);
  assert.equal(payload.targetProductId, "mo-women-001");
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(payload.result.state));
  assert.deepEqual(payload.result.evidence.used, ["manual_reference_garment"]);
  assert.deepEqual(payload.result.evidence.missingRegions, []);
  assert.ok(payload.result.findings.every((finding) => /larger|similar|smaller/i.test(finding.reason)));
  assert.doesNotMatch(serialized, /variantId|valueCm|measurements|geometry|compatibleBodyRanges|wearerEaseCm/i);
});

test("manual garment GET returns target-owned requirements with no-store caching", async () => {
  const response = await handleManualGarmentRequest(new Request("http://localhost/api/fit/manual-garment?targetProductId=mo-men-006"));
  const payload = await response.json() as Record<string, unknown>;
  const requirements = payload.requirements as Array<Record<string, unknown>>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Object.keys(payload), ["requirements"]);
  assert.deepEqual(requirements.map((requirement) => requirement.region), ["waist", "hip_seat", "inseam"]);
  assert.doesNotMatch(JSON.stringify(payload), /variantId|valueCm|measurements|geometry/i);
});

test("manual garment POST returns a no-store sanitized recommendation", async () => {
  const response = await handleManualGarmentRequest(new Request("http://localhost/api/fit/manual-garment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dressRequest()),
  }));
  const payload = await response.json() as Record<string, unknown>;

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(Object.keys(payload).sort(), ["result", "synthetic", "targetProductId"]);
  assert.doesNotMatch(JSON.stringify(payload), /variantId|valueCm|measurements|geometry|compatibleBodyRanges|wearerEaseCm/i);
});

test("manual garment handler rejects malformed JSON, unknown targets, unknown keys and missing evidence", async () => {
  const malformed = await handleManualGarmentRequest(new Request("http://localhost/api/fit/manual-garment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{",
  }));
  const unknownTarget = await handleManualGarmentRequest(new Request("http://localhost/api/fit/manual-garment?targetProductId=unknown"));
  const unknownKeys = await handleManualGarmentRequest(new Request("http://localhost/api/fit/manual-garment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...dressRequest(), availableVariantIds: [] }),
  }));
  const request = dressRequest();
  const missingEvidence = await handleManualGarmentRequest(new Request("http://localhost/api/fit/manual-garment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...request,
      reference: { ...(request.reference as Record<string, unknown>), measurements: [] },
    }),
  }));

  for (const response of [malformed, unknownTarget, unknownKeys, missingEvidence]) {
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    const payload = await response.json() as Record<string, unknown>;
    assert.equal(typeof payload.error, "string");
  }
});

test("manual garment UI fields are derived only from target requirements", () => {
  const fields = manualGarmentFields(listManualGarmentRequirements("mo-men-006"));

  assert.deepEqual(fields.map(({ region, inputLabel, observationType }) => ({ region, inputLabel, observationType })), [
    { region: "waist", inputLabel: "Flat waist", observationType: "circumference" },
    { region: "hip_seat", inputLabel: "Flat hip / seat", observationType: "circumference" },
    { region: "inseam", inputLabel: "Inseam", observationType: "length" },
  ]);
  assert.deepEqual(fields.map((field) => field.kind), ["garment_flat_width", "garment_flat_width", "garment_length"]);
  assert.ok(fields.every((field) => field.help.length > 0 && field.methodId.includes(field.region)));
});

test("manual garment request shaping keeps labels descriptive and rejects incomplete evidence", () => {
  const requirements = listManualGarmentRequirements("mo-women-001");
  const base = {
    targetProductId: "mo-women-001",
    preference: "regular" as const,
    unit: "cm" as const,
    brandText: "Outside Label",
    productText: "Favorite dress",
    labelSize: "M",
    values: { chest_bust: "45", waist: "36", hip_seat: "49" },
    observations: { chest_bust: "Just right", waist: "Just right", hip_seat: "Just right" },
    requirements,
  };

  assert.equal(buildManualGarmentRequest({ ...base, values: { ...base.values, waist: "" } }), null);
  const request = buildManualGarmentRequest(base);
  assert.ok(request);
  assert.deepEqual(request.reference.measurements.map((measurement) => [measurement.region, measurement.value, measurement.kind]), [
    ["chest_bust", 45, "garment_flat_width"],
    ["waist", 36, "garment_flat_width"],
    ["hip_seat", 49, "garment_flat_width"],
  ]);
  assert.deepEqual(request.reference.observations, {
    chest_bust: "just_right",
    waist: "just_right",
    hip_seat: "just_right",
  });
  assert.equal(request.reference.labelSize, "M");
});
