import assert from "node:assert/strict";
import test from "node:test";

import { getRetailerGuestFit, RetailerDemoInputError, toSavedProfileFitInput } from "../../src/lib/retailer-demo/fit";

test("maps a retailer item key to a sanitized synthetic fit result", () => {
  const result = getRetailerGuestFit({
    itemId: "aster-lumen-field-jacket",
    preference: "regular",
    measurements: [
      { region: "chest_bust", value: 88.34, unit: "cm" },
      { region: "shoulder_cross_back", value: 38.08, unit: "cm" },
    ],
  });

  assert.equal(result.item.id, "aster-lumen-field-jacket");
  assert.equal(result.item.availableSizeLabels.includes("EU 36"), true);
  assert.equal("productId" in result.item, false);
  assert.equal(result.result.state, "RECOMMENDED");
  assert.equal(result.result.recommendedSizeLabel, "EU 36");
});

test("rejects client product identifiers, unknown items, and duplicate measurements", () => {
  assert.throws(() => getRetailerGuestFit({
    itemId: "aster-lumen-field-jacket",
    targetProductId: "mo-men-023",
    preference: "regular",
    measurements: [{ region: "chest_bust", value: 34.4, unit: "in" }],
  }), RetailerDemoInputError);
  assert.throws(() => getRetailerGuestFit({
    itemId: "unknown-item",
    preference: "regular",
    measurements: [{ region: "chest_bust", value: 34.4, unit: "in" }],
  }), RetailerDemoInputError);
  assert.throws(() => getRetailerGuestFit({
    itemId: "aster-lumen-field-jacket",
    preference: "regular",
    measurements: [
      { region: "chest_bust", value: 34.4, unit: "in" },
      { region: "chest_bust", value: 34.4, unit: "in" },
    ],
  }), RetailerDemoInputError);
});

test("does not create a fit recommendation while a retailer item is under coverage review", () => {
  const request = {
    itemId: "aster-oriel-crew-sweater",
    preference: "regular",
    measurements: [{ region: "chest_bust", value: 88.34, unit: "cm" }],
  };

  assert.throws(() => getRetailerGuestFit(request), /under review/i);
  assert.throws(() => toSavedProfileFitInput({
    itemId: "aster-oriel-crew-sweater",
    preference: "regular",
    profileId: "demo-profile_1",
  }), /under review/i);
});

test("maps a saved profile item key before the protected handler runs", () => {
  const mapped = toSavedProfileFitInput({ itemId: "aster-lumen-field-jacket", preference: "relaxed", profileId: "demo-profile_1" });
  assert.deepEqual(mapped.body, { targetProductId: "mo-women-002", preference: "relaxed", profileId: "demo-profile_1" });
  assert.equal("productId" in mapped.item, false);
});
