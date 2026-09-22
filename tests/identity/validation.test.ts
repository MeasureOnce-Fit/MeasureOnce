import assert from "node:assert/strict";
import test from "node:test";

import { parseProfileDraft, parseProfilePatch } from "../../src/lib/identity/validation";

const validSelfProfile = {
  kind: "self",
  nickname: "My fit",
  catalogCollection: "both",
  ownerPermissionConfirmed: false,
  measurements: [
    {
      region: "waist",
      value: 31.5,
      unit: "in",
      method: "body",
      source: "shopper_entered",
    },
  ],
  preferences: [],
  anchors: [],
};

test("parseProfileDraft accepts centimetres and inches", () => {
  const inches = parseProfileDraft(validSelfProfile);
  const centimetres = parseProfileDraft({
    ...validSelfProfile,
    measurements: [{ ...validSelfProfile.measurements[0], value: 80, unit: "cm" }],
  });

  assert.equal(inches.measurements[0]?.unit, "in");
  assert.equal(centimetres.measurements[0]?.unit, "cm");
});

test("profile drafts require a valid catalog collection", () => {
  for (const catalogCollection of ["women", "men", "both"]) {
    assert.equal(
      parseProfileDraft({ ...validSelfProfile, catalogCollection }).catalogCollection,
      catalogCollection,
    );
  }

  const missingCollection = Object.fromEntries(
    Object.entries(validSelfProfile).filter(([key]) => key !== "catalogCollection"),
  );
  assert.throws(() => parseProfileDraft(missingCollection));
  assert.throws(() => parseProfileDraft({ ...validSelfProfile, catalogCollection: "unisex" }));
});

test("profile patches accept only a valid catalog collection", () => {
  assert.equal(parseProfilePatch({ catalogCollection: "men" }).catalogCollection, "men");
  assert.throws(() => parseProfilePatch({ catalogCollection: "unisex" }));
});

test("parseProfileDraft rejects a blank nickname", () => {
  assert.throws(() => parseProfileDraft({ ...validSelfProfile, nickname: "   " }));
});

test("parseProfileDraft rejects a nickname longer than 40 characters", () => {
  assert.throws(() => parseProfileDraft({ ...validSelfProfile, nickname: "x".repeat(41) }));
});

test("parseProfileDraft requires owner permission for an additional member", () => {
  assert.throws(() =>
    parseProfileDraft({
      ...validSelfProfile,
      kind: "additional_member",
      nickname: "Alex",
      ownerPermissionConfirmed: false,
    }),
  );
});

test("parseProfileDraft rejects an unknown measurement unit", () => {
  assert.throws(() =>
    parseProfileDraft({
      ...validSelfProfile,
      measurements: [{ ...validSelfProfile.measurements[0], unit: "mm" }],
    }),
  );
});

test("parseProfileDraft rejects non-positive measurements", () => {
  for (const value of [0, -1]) {
    assert.throws(() =>
      parseProfileDraft({
        ...validSelfProfile,
        measurements: [{ ...validSelfProfile.measurements[0], value }],
      }),
    );
  }
});

test("profile parsers reject unrecognized fields", () => {
  assert.throws(() => parseProfileDraft({ ...validSelfProfile, relationship: "partner" }));
  assert.throws(() => parseProfilePatch({ nickname: "Updated", mystery: true }));
});

test("parseProfilePatch rejects an empty patch", () => {
  assert.throws(() => parseProfilePatch({}));
});

test("parseProfileDraft requires a category for every fit anchor", () => {
  const categorizedAnchor = {
    evidenceKind: "exact_garment",
    brandId: "brand-a",
    productId: "product-a",
    category: "trousers",
    sizeLabel: "M",
    observations: { waist: "just_right" },
  };
  const uncategorizedAnchor = {
    evidenceKind: "exact_garment",
    brandId: "brand-b",
    productId: "product-b",
    sizeLabel: "L",
    observations: { waist: "slightly_loose" },
  };

  assert.throws(() =>
    parseProfileDraft({
      ...validSelfProfile,
      anchors: [categorizedAnchor, uncategorizedAnchor],
    }),
  );
});

test("parseProfilePatch requires a non-blank category for every fit anchor", () => {
  const anchor = {
    evidenceKind: "exact_garment",
    brandId: "brand-a",
    productId: "product-a",
    sizeLabel: "M",
    observations: { waist: "just_right" },
  };

  assert.throws(() => parseProfilePatch({ anchors: [anchor] }));
  assert.throws(() => parseProfilePatch({ anchors: [{ ...anchor, category: "   " }] }));
});

test("parseProfilePatch accepts remembered size context without identifiers that imply verified geometry", () => {
  const remembered = {
    evidenceKind: "remembered_size_context",
    brandName: "Outside Label",
    category: "Jackets",
    sizeLabel: "M",
    observations: { chest_bust: "just_right" },
  };

  assert.deepEqual(parseProfilePatch({ anchors: [remembered] }).anchors, [remembered]);
});

test("parseProfilePatch requires reference provenance for a category size reference", () => {
  assert.throws(() =>
    parseProfilePatch({
      anchors: [
        {
          evidenceKind: "category_size_reference",
          brandName: "Orivelle",
          category: "Jackets",
          sizeLabel: "8",
          observations: { chest_bust: "just_right" },
        },
      ],
    }),
  );
});

test("parseProfilePatch rejects identifiers on remembered size context", () => {
  assert.throws(() =>
    parseProfilePatch({
      anchors: [
        {
          evidenceKind: "remembered_size_context",
          brandName: "Outside Label",
          category: "Jackets",
          sizeLabel: "M",
          observations: {},
          referenceId: "ref-jackets-8",
        },
      ],
    }),
  );
});
