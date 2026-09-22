import assert from "node:assert/strict";
const base = process.env.TEST_BASE_URL || "https://measureonce-prototype.vercel.app";
const cases = ["mo-women-001", "mo-men-006", "mo-men-095", "mo-men-001"];
for (const targetProductId of cases) {
  const list = await (await fetch(`${base}/api/fit/known-garment?targetProductId=${targetProductId}&query=${encodeURIComponent("Avenoir")}`)).json();
  const anchor = list.anchors?.[0];
  assert.ok(anchor, `${targetProductId} should expose a reference garment`);
  const observations = Object.fromEntries(anchor.regions.map(region => [region, ["shoulder_cross_back", "body_length", "sleeve_length", "inseam", "outseam"].includes(region) ? "right_length" : "just_right"]));
  const response = await fetch(`${base}/api/fit/known-garment`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetProductId, preference: "regular", anchorVariantId: anchor.id, observations }) });
  const payload = await response.json();
  assert.equal(response.status, 200, targetProductId);
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(payload.result.state), `${targetProductId}: ${JSON.stringify(payload.result)}`);
  assert.deepEqual(payload.result.evidence.missingRegions, [], `${targetProductId} should have complete reference evidence`);
}
console.log(`PASS: all-perfect reference evidence completes for ${cases.length} representative simple and composite size systems.`);
