import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSyntheticCatalog,
  buildBaseFitProfiles,
  buildProfilePreferenceCases,
  evaluateM1,
  recommendFit,
  validateFitCatalog,
  type MeasurementInput,
  type MeasurementRegion,
} from "../../src/lib/fit";

function measurement(region: MeasurementRegion, value: number, unit: "cm" | "in" = "cm"): MeasurementInput {
  const lengthRegions: MeasurementRegion[] = ["shoulder_cross_back", "body_length", "sleeve_length", "rise", "inseam", "outseam"];
  return {
    region,
    value,
    unit,
    kind: lengthRegions.includes(region) ? "body_length" : "body_circumference",
    methodId: "body-self-reported-v1",
    source: "shopper_entered",
  };
}

test("builds the approved 10-brand fit catalog from all 200 products", () => {
  const catalog = buildSyntheticCatalog();

  assert.equal(catalog.brands.length, 10);
  assert.deepEqual(catalog.brands.map((brand) => brand.displayName), [
    "Avenoir", "Velmora", "Cendra Lane", "Solenne & Rue", "Orivelle",
    "Norellin", "Caelune", "Marrow & Vale", "Virelle", "Tern & Thread",
  ]);
  assert.equal(catalog.styles.length, 200);
  assert.ok(catalog.variants.length >= 1_200);
  assert.deepEqual(
    catalog.brands.map((brand) => catalog.styles.filter((style) => style.brandId === brand.id).length),
    [20, 20, 20, 20, 20, 20, 20, 20, 20, 20],
  );
  assert.equal(new Set(catalog.styles.map((style) => `${style.department}|${style.merchandisingCategory}`)).size, 17);
  assert.equal(new Set(catalog.styles.map((style) => style.merchandisingCategory)).size, 11);
  const womenProductIds = new Set(catalog.styles.filter((style) => style.department === "Women").map((style) => style.productId));
  const womenFormats = new Set(catalog.variants.filter((variant) => womenProductIds.has(variant.productId)).map((variant) => variant.size.format));
  assert.deepEqual([...womenFormats].sort(), [
    "alpha", "denim_waist", "eu_numeric", "grouped_numeric", "petite_numeric",
    "tall_numeric", "us_numeric", "us_plus", "waist_inseam",
  ]);
  assert.ok(catalog.variants.some((variant) => variant.size.systemId.startsWith("women-junior-odd-01:")));
});

test("returns a safe state when the profile has no fit evidence", () => {
  const catalog = buildSyntheticCatalog();
  const result = recommendFit(catalog, {
    targetProductId: "mo-women-001",
    preference: "regular",
    profile: { measurements: [] },
  });

  assert.equal(result.state, "INSUFFICIENT_PROFILE_EVIDENCE");
  assert.equal(result.recommendedVariantId, undefined);
  assert.ok(result.nextSteps.length > 0);
});

test("keeps women's 0 and 2 distinct while mapping both to XS", () => {
  const catalog = buildSyntheticCatalog();
  const variants = catalog.variants.filter((variant) => variant.productId === "mo-women-065");
  const zero = variants.find((variant) => variant.size.label === "0");
  const two = variants.find((variant) => variant.size.label === "2");

  assert.ok(zero);
  assert.ok(two);
  assert.notEqual(zero.id, two.id);
  assert.equal(zero.size.alphaEquivalent, "XS");
  assert.equal(two.size.alphaEquivalent, "XS");
  assert.notDeepEqual(zero.measurements, two.measurements);

  const lower = recommendFit(catalog, {
    targetProductId: "mo-women-065",
    preference: "regular",
    profile: { measurements: [measurement("chest_bust", 78.5)] },
  });
  const upper = recommendFit(catalog, {
    targetProductId: "mo-women-065",
    preference: "regular",
    profile: { measurements: [measurement("chest_bust", 83.5)] },
  });

  assert.equal(lower.state, "RECOMMENDED");
  assert.equal(lower.recommendedSizeLabel, "0");
  assert.equal(upper.state, "RECOMMENDED");
  assert.equal(upper.recommendedSizeLabel, "2");
});

test("treats equivalent centimetre and inch evidence identically", () => {
  const catalog = buildSyntheticCatalog();
  const cm = recommendFit(catalog, {
    targetProductId: "mo-women-065",
    preference: "regular",
    profile: { measurements: [measurement("chest_bust", 83.5)] },
  });
  const inches = recommendFit(catalog, {
    targetProductId: "mo-women-065",
    preference: "regular",
    profile: { measurements: [measurement("chest_bust", 83.5 / 2.54, "in")] },
  });

  assert.equal(inches.state, cm.state);
  assert.equal(inches.recommendedVariantId, cm.recommendedVariantId);
  assert.deepEqual(inches.findings, cm.findings);
  assert.equal(cm.evidence.normalizedMeasurements[0]?.originalUnit, "cm");
  assert.equal(inches.evidence.normalizedMeasurements[0]?.originalUnit, "in");
  assert.equal(inches.evidence.normalizedMeasurements[0]?.valueCm, 83.5);
});

test("rejects a measurement whose kind or method does not match the region", () => {
  const catalog = buildSyntheticCatalog();
  const wrongKind = measurement("chest_bust", 83.5);
  wrongKind.kind = "body_length";
  const wrongMethod = measurement("chest_bust", 83.5);
  wrongMethod.methodId = "unknown-method";
  const wrongSyntheticRegion = measurement("chest_bust", 83.5);
  wrongSyntheticRegion.source = "synthetic_fixture";
  wrongSyntheticRegion.methodId = "synthetic-profile-1.0.0:waist";
  const wrongSavedSource = measurement("chest_bust", 83.5);
  wrongSavedSource.source = "saved_profile";
  const wrongShopperSource = measurement("chest_bust", 83.5);
  wrongShopperSource.methodId = "synthetic-profile-1.0.0:chest_bust";

  for (const input of [wrongKind, wrongMethod, wrongSyntheticRegion, wrongSavedSource, wrongShopperSource]) {
    const result = recommendFit(catalog, {
      targetProductId: "mo-women-065",
      preference: "regular",
      profile: { measurements: [input] },
    });
    assert.equal(result.state, "UNSUPPORTED");
    assert.equal(result.recommendedVariantId, undefined);
  }
});

test("covers decimals, fractional-inch values, mixed units, boundaries, and invalid numbers", () => {
  const catalog = buildSyntheticCatalog();
  const fractional = recommendFit(catalog, {
    targetProductId: "mo-women-065",
    preference: "regular",
    profile: { measurements: [measurement("chest_bust", 32.875, "in")] },
  });
  assert.equal(fractional.recommendedSizeLabel, "2");

  const allCm = recommendFit(catalog, {
    targetProductId: "mo-men-006",
    preference: "regular",
    profile: { measurements: [measurement("waist", 78), measurement("hip_seat", 97), measurement("inseam", 73)] },
  });
  const mixed = recommendFit(catalog, {
    targetProductId: "mo-men-006",
    preference: "regular",
    profile: { measurements: [measurement("waist", 78 / 2.54, "in"), measurement("hip_seat", 97), measurement("inseam", 73 / 2.54, "in")] },
  });
  assert.deepEqual(mixed.options?.map((option) => option.sizeLabel), allCm.options?.map((option) => option.sizeLabel));

  const firstVariant = catalog.variants.find((variant) => variant.productId === "mo-women-065" && variant.size.label === "0");
  assert.ok(firstVariant?.compatibleBodyRanges.regular.chest_bust);
  const boundary = firstVariant.compatibleBodyRanges.regular.chest_bust.maxCm;
  assert.equal(recommendFit(catalog, {
    targetProductId: "mo-women-065", preference: "regular", profile: { measurements: [measurement("chest_bust", boundary)] },
  }).recommendedSizeLabel, "0");

  for (const invalid of [-1, Number.NaN]) {
    assert.equal(recommendFit(catalog, {
      targetProductId: "mo-women-065", preference: "regular", profile: { measurements: [measurement("chest_bust", invalid)] },
    }).state, "INSUFFICIENT_PROFILE_EVIDENCE");
  }

  let toggled = 83.5;
  for (let index = 0; index < 20; index += 1) toggled = (toggled / 2.54) * 2.54;
  assert.equal(recommendFit(catalog, {
    targetProductId: "mo-women-065", preference: "regular", profile: { measurements: [measurement("chest_bust", toggled)] },
  }).recommendedSizeLabel, "2");
});

test("returns a two-size tradeoff only when adjacent sizes win different regions", () => {
  const catalog = buildSyntheticCatalog();
  const result = recommendFit(catalog, {
    targetProductId: "mo-men-006",
    preference: "regular",
    profile: { measurements: [
      measurement("waist", 74),
      measurement("hip_seat", 90),
      measurement("inseam", 72.75),
    ] },
  });

  assert.equal(result.state, "TRADEOFF");
  assert.equal(result.optionPriority, "equal");
  assert.deepEqual(result.options?.map((option) => option.sizeLabel), ["30×30", "28×30"]);
  assert.match(result.nextSteps.join(" "), /equally ranked/i);
  assert.equal(result.options?.[0].findings.find((finding) => finding.region === "inseam")?.assessment, "FIT");
  assert.equal(result.options?.[1].findings.find((finding) => finding.region === "hip_seat")?.assessment, "FIT");
});

test("uses stored geometry from an exact cross-brand known garment", () => {
  const catalog = buildSyntheticCatalog();
  const request = {
    targetProductId: "mo-women-065",
    preference: "regular" as const,
    profile: {
      measurements: [],
      referenceGarment: {
        variantId: "mo-women-016:brand_05:02",
        observations: { chest_bust: "just_right" as const },
      },
    },
  };
  const result = recommendFit(catalog, request);

  assert.equal(result.state, "RECOMMENDED");
  assert.equal(result.recommendedSizeLabel, "2");
  assert.deepEqual(result.evidence.used, ["reference_garment"]);
  assert.equal(result.evidence.referenceVariantId, "mo-women-016:brand_05:02");
  assert.equal(result.findings.find((finding) => finding.region === "chest_bust")?.assessment, "FIT");

  const changedGeometry = structuredClone(catalog);
  const anchor = changedGeometry.variants.find((variant) => variant.id === "mo-women-016:brand_05:02");
  assert.ok(anchor);
  const chest = anchor.measurements.find((entry) => entry.region === "chest_bust");
  assert.ok(chest);
  chest.valueCm += chest.kind === "garment_flat_width" ? 2.5 : 5;
  assert.equal(recommendFit(changedGeometry, request).recommendedSizeLabel, "4");
});

test("exercises every approved safe state without returning numeric confidence", () => {
  const catalog = buildSyntheticCatalog();
  const brokenCatalog = structuredClone(catalog);
  const broken = brokenCatalog.variants.find((variant) => variant.productId === "mo-women-065");
  assert.ok(broken);
  broken.measurements = broken.measurements.filter((measurement) => measurement.region !== "chest_bust");

  const cases = [
    recommendFit(catalog, {
      targetProductId: "mo-women-065", preference: "regular",
      profile: { measurements: [measurement("chest_bust", 78.5)] },
    }),
    recommendFit(catalog, {
      targetProductId: "mo-men-006", preference: "regular",
      profile: { measurements: [measurement("waist", 74), measurement("hip_seat", 90), measurement("inseam", 72.75)] },
    }),
    recommendFit(catalog, {
      targetProductId: "mo-women-065", preference: "regular", profile: { measurements: [] },
    }),
    recommendFit(brokenCatalog, {
      targetProductId: "mo-women-065", preference: "regular",
      profile: { measurements: [measurement("chest_bust", 78.5)] },
    }),
    recommendFit(catalog, {
      targetProductId: "mo-women-065", preference: "regular",
      profile: { measurements: [measurement("chest_bust", 78.5), measurement("chest_bust", 40, "in")] },
    }),
    recommendFit(catalog, {
      targetProductId: "mo-women-065", preference: "regular",
      profile: { measurements: [measurement("chest_bust", 150)] },
    }),
    recommendFit(catalog, {
      targetProductId: "missing-product", preference: "regular", profile: { measurements: [] },
    }),
  ];

  assert.deepEqual(cases.map((result) => result.state), [
    "RECOMMENDED",
    "TRADEOFF",
    "INSUFFICIENT_PROFILE_EVIDENCE",
    "INSUFFICIENT_GARMENT_EVIDENCE",
    "CONFLICTING_EVIDENCE",
    "NO_SUITABLE_SIZE",
    "UNSUPPORTED",
  ]);
  for (const result of cases) {
    assert.equal("confidence" in result, false);
  }
});

test("routes denim overshirts through upper-body evidence", () => {
  const catalog = buildSyntheticCatalog();
  for (const id of ["mo-women-065", "mo-men-070", "mo-men-095"]) {
    const style = catalog.styles.find((candidate) => candidate.productId === id);
    assert.equal(style?.merchandisingCategory, "Denim");
    assert.equal(style?.garmentType, "overshirt");
    assert.equal(style?.fitFamily, "upper_body");
    assert.deepEqual(style?.criticalRegions, ["chest_bust"]);
  }
});

test("routes a waistcoat without sleeve evidence and rejects unknown denim construction", () => {
  const catalog = buildSyntheticCatalog();
  const waistcoat = catalog.styles.find((style) => style.productId === "mo-women-010");
  assert.equal(waistcoat?.garmentType, "waistcoat");
  assert.deepEqual(waistcoat?.criticalRegions, ["chest_bust", "waist"]);
  assert.equal(waistcoat?.secondaryRegions.includes("sleeve_length"), false);

  const unknownDenim = buildSyntheticCatalog([{
    id: "unknown-denim",
    gender: "Women",
    category: "Denim",
    name: "Experimental Denim Piece",
    material: "Denim",
    fit: "Balanced",
    stretch: "Low",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
  }]);
  assert.equal(unknownDenim.styles[0]?.supported, false);
  assert.equal(recommendFit(unknownDenim, {
    targetProductId: "unknown-denim",
    preference: "regular",
    profile: { measurements: [measurement("waist", 70)] },
  }).state, "UNSUPPORTED");
});

test("keeps composite size axes independent and scopes bottoms-only formats", () => {
  const catalog = buildSyntheticCatalog();
  const womenComposite = catalog.styles.find((style) => style.department === "Women" && style.fitFamily === "bottoms" && style.brandId === "brand_10");
  assert.ok(womenComposite);
  const compositeVariants = catalog.variants.filter((variant) => variant.productId === womenComposite.productId);
  assert.equal(compositeVariants.length, 18);
  assert.deepEqual(
    compositeVariants.filter((variant) => variant.size.axes?.waist === "24").map((variant) => variant.size.axes?.inseam),
    ["28", "30", "32"],
  );
  assert.equal(new Set(compositeVariants.filter((variant) => variant.size.axes?.waist === "24").map((variant) => variant.measurements.find((entry) => entry.region === "inseam")?.valueCm)).size, 3);

  const prtStyle = catalog.styles.find((style) => style.department === "Women" && style.brandId === "brand_06");
  assert.ok(prtStyle);
  const prtVariants = catalog.variants.filter((variant) => variant.productId === prtStyle.productId);
  assert.equal(prtVariants.length, 18);
  assert.deepEqual(prtVariants.filter((variant) => variant.size.ordinal === 0).map((variant) => variant.size.axes?.length), ["P", "R", "T"]);

  const invalidBottomFormat = catalog.styles.some((style) => style.fitFamily !== "bottoms" && catalog.variants.some((variant) =>
    variant.productId === style.productId && (variant.size.format === "denim_waist" || variant.size.format === "waist_inseam"),
  ));
  assert.equal(invalidBottomFormat, false);
});

test("requires evidence for every axis in an exact composite label", () => {
  const catalog = buildSyntheticCatalog();
  const cases = [
    {
      targetProductId: "mo-men-006",
      measurements: [measurement("waist", 80.32), measurement("hip_seat", 98.84)],
      missing: "inseam",
    },
    {
      targetProductId: "mo-men-001",
      measurements: [measurement("chest_bust", 97.66), measurement("shoulder_cross_back", 44.58)],
      missing: "body_length",
    },
    {
      targetProductId: "mo-women-032",
      measurements: [measurement("waist", 71.22), measurement("hip_seat", 95.34)],
      missing: "inseam",
    },
  ] as const;

  for (const fixture of cases) {
    const result = recommendFit(catalog, {
      targetProductId: fixture.targetProductId,
      preference: "regular",
      profile: { measurements: [...fixture.measurements] },
    });
    assert.equal(result.state, "INSUFFICIENT_PROFILE_EVIDENCE");
    assert.ok(result.evidence.missingRegions.includes(fixture.missing));
    assert.equal(result.recommendedSizeLabel, undefined);
  }
});

test("normalizes laid-flat garment widths before known-garment inference", () => {
  const catalog = buildSyntheticCatalog();
  const anchor = catalog.variants.find((variant) =>
    variant.measurements.some((entry) => entry.region === "chest_bust" && entry.kind === "garment_flat_width"),
  );
  assert.ok(anchor);
  const anchorStyle = catalog.styles.find((style) => style.productId === anchor.productId);
  assert.ok(anchorStyle);
  const target = catalog.styles.find((style) => style.fitFamily === anchorStyle.fitFamily && style.productId !== anchorStyle.productId);
  assert.ok(target);
  const request = {
    targetProductId: target.productId,
    preference: "regular" as const,
    profile: { measurements: [], referenceGarment: { variantId: anchor.id, observations: { chest_bust: "just_right" as const } } },
  };
  const fromFlat = recommendFit(catalog, request);

  const circumferenceCatalog = structuredClone(catalog);
  const convertedAnchor = circumferenceCatalog.variants.find((variant) => variant.id === anchor.id);
  const converted = convertedAnchor?.measurements.find((entry) => entry.region === "chest_bust");
  assert.ok(converted);
  converted.valueCm *= 2;
  converted.kind = "garment_circumference";
  converted.methodId = `${circumferenceCatalog.measurementMethodVersion}:circumference:chest_bust`;
  const fromCircumference = recommendFit(circumferenceCatalog, request);

  assert.equal(fromFlat.state, fromCircumference.state);
  assert.equal(fromFlat.recommendedSizeLabel, fromCircumference.recommendedSizeLabel);
});

test("rejects undeclared evidence sources and invalid composite records", () => {
  const catalog = buildSyntheticCatalog();
  const bogus = measurement("chest_bust", 83.5);
  bogus.source = "bogus" as MeasurementInput["source"];
  assert.equal(recommendFit(catalog, {
    targetProductId: "mo-women-065",
    preference: "regular",
    profile: { measurements: [bogus] },
  }).state, "UNSUPPORTED");
  assert.equal(recommendFit(catalog, {
    targetProductId: "mo-women-065",
    preference: "regular",
    profile: {
      measurements: [],
      referenceGarment: {
        variantId: "mo-women-016:brand_05:02",
        observations: { chest_bust: "right_length" },
      },
    },
  }).state, "UNSUPPORTED");
  assert.equal(recommendFit(catalog, {
    targetProductId: "mo-women-065",
    preference: "unknown" as "regular",
    profile: { measurements: [measurement("chest_bust", 83.5)] },
  }).state, "UNSUPPORTED");

  const invalid = structuredClone(catalog);
  const composite = invalid.variants.find((variant) => variant.size.format === "waist_inseam");
  assert.ok(composite?.size.axes);
  delete composite.size.axes.inseam;
  assert.match(validateFitCatalog(invalid).join("\n"), /lacks waist\/inseam axes/);
});

test("traces every visible source size and stores executable comparison fixtures", () => {
  const catalog = buildSyntheticCatalog();
  for (const style of catalog.styles) {
    const linked = catalog.variants.filter((variant) => variant.productId === style.productId);
    assert.deepEqual(
      [...new Set(linked.map((variant) => variant.sourceSizeIndex))],
      [0, 1, 2, 3, 4, 5],
    );
    for (const variant of linked) {
      assert.equal(variant.sourceSizeLabel, style.sourceSizeLabels[variant.sourceSizeIndex]);
    }
  }
  assert.equal(catalog.comparisonFixtures.length, 6);
  assert.ok(catalog.comparisonFixtures.every((fixture) =>
    fixture.style.productId === fixture.id
    && fixture.variants.length >= 6
    && fixture.style.variantIds.length === fixture.variants.length),
  );
});

test("validates relationships, measurement semantics, and sparse-category fixtures", () => {
  const catalog = buildSyntheticCatalog();
  assert.deepEqual(validateFitCatalog(catalog), []);
  assert.equal(catalog.comparisonFixtures.length, 6);

  const corrupt = structuredClone(catalog);
  corrupt.brands[1].id = corrupt.brands[0].id;
  corrupt.styles[0].variantIds.push("missing-variant");
  corrupt.variants[0].measurements[0].kind = "garment_length";
  const errors = validateFitCatalog(corrupt).join("\n");
  assert.match(errors, /Brand IDs must be unique/);
  assert.match(errors, /dangling variant ID/);
  assert.match(errors, /wrong kind/);
});

test("checks target garment integrity before asking for more profile evidence", () => {
  const catalog = buildSyntheticCatalog();
  const broken = structuredClone(catalog);
  const target = broken.variants.find((variant) => variant.productId === "mo-women-065");
  assert.ok(target);
  target.measurements = target.measurements.filter((entry) => entry.region !== "chest_bust");

  const result = recommendFit(broken, {
    targetProductId: "mo-women-065",
    preference: "regular",
    profile: { measurements: [] },
  });
  assert.equal(result.state, "INSUFFICIENT_GARMENT_EVIDENCE");
});

test("applies declared stretch at a literal boundary", () => {
  const catalog = buildSyntheticCatalog();
  const moderate = catalog.variants.find((variant) => variant.productId === "mo-women-008" && variant.size.label === "5");
  const low = catalog.variants.find((variant) => variant.productId === "mo-women-065" && variant.size.label === "4");
  assert.ok(moderate);
  assert.ok(low);
  const moderateRange = moderate.compatibleBodyRanges.regular.chest_bust;
  const lowRange = low.compatibleBodyRanges.regular.chest_bust;
  assert.ok(moderateRange);
  assert.ok(lowRange);
  assert.ok((moderateRange.maxCm - moderateRange.minCm) > (lowRange.maxCm - lowRange.minCm));
  assert.equal(recommendFit(catalog, {
    targetProductId: "mo-women-008",
    preference: "regular",
    profile: { measurements: [measurement("chest_bust", 90.8)] },
  }).recommendedSizeLabel, "5");
});

test("builds 24 reusable profiles and 72 profile/preference cases", () => {
  const profiles = buildBaseFitProfiles();
  const cases = buildProfilePreferenceCases();

  assert.equal(profiles.length, 24);
  assert.equal(new Set(profiles.map((profile) => profile.id)).size, 24);
  assert.equal(cases.length, 72);
  assert.equal(cases.filter(({ preference }) => preference === "closer").length, 24);
  assert.equal(cases.filter(({ preference }) => preference === "regular").length, 24);
  assert.equal(cases.filter(({ preference }) => preference === "relaxed").length, 24);
});

test("runs the approved profile matrix, comparison fixtures, and 44 reviewed contract cases", () => {
  const report = evaluateM1(buildSyntheticCatalog());

  assert.equal(report.validation.passed, true, report.validation.errors.join("\n"));
  assert.equal(report.generatedCoverage.profileMatrixExecutions, 612);
  assert.equal(report.generatedCoverage.comparisonFixtureExecutions, 6);
  assert.equal(report.generatedCoverage.total, 618);
  assert.equal(report.reviewedCases.total, 44);
  assert.equal(report.reviewedCases.passed, 44, JSON.stringify(report.reviewedCases.failed));
  const denimBody = report.reviewedCases.cases.find((testCase) => testCase.id === "Men|Denim-body");
  const denimReference = report.reviewedCases.cases.find((testCase) => testCase.id === "Men|Denim-reference");
  assert.ok(denimBody);
  assert.ok(denimReference?.referenceEvidence);
  assert.equal(denimBody.targetEvidence.brandName, "Avenoir");
  assert.equal(denimBody.targetEvidence.sizeChart.find((size) => size.variantId === denimBody.recommendedVariantId)?.label, "32×30");
  assert.equal(denimBody.comparisonEvidence.find((item) => item.region === "waist")?.evidenceValueCm, 80.32);
  assert.equal(denimReference.referenceEvidence.brandName, "Solenne & Rue");
  assert.equal(denimReference.referenceEvidence.size.label, "28");
  assert.deepEqual(report.dataset, {
    brands: 10,
    styles: 200,
    variants: 2_028,
    comparisonFixtures: 6,
    navigationCategories: 11,
    departmentCategoryPairs: 17,
    baseProfiles: 24,
    profilePreferenceCases: 72,
    sourceSizePositionsCovered: 1_200,
  });
});

test("binds collaborator signoff to the exact reviewed case fingerprints", () => {
  const catalog = buildSyntheticCatalog();
  const unsigned = evaluateM1(catalog);
  const approvedCases = unsigned.reviewedCases.cases.map((testCase) => ({
    caseId: testCase.id,
    fingerprint: testCase.fingerprint,
  }));
  assert.equal(new Set(approvedCases.map((entry) => entry.fingerprint)).size, approvedCases.length);

  const signed = evaluateM1(catalog, {
    approvedCases,
    reviewerName: "Independent reviewer",
    reviewedAt: "2026-09-17",
  });
  assert.equal(signed.reviewedCases.reviewStatus, "signed_off");

  approvedCases[0].fingerprint = "stale-fingerprint";
  const stale = evaluateM1(catalog, {
    approvedCases,
    reviewerName: "Independent reviewer",
    reviewedAt: "2026-09-17",
  });
  assert.equal(stale.reviewedCases.reviewStatus, "awaiting_collaborator_signoff");

  const changedAnchorCatalog = structuredClone(catalog);
  const anchorStyle = changedAnchorCatalog.styles.find((style) => style.productId === "mo-women-016");
  assert.ok(anchorStyle);
  anchorStyle.fitFamily = "bottoms";
  const changedAnchorReport = evaluateM1(changedAnchorCatalog, {
    approvedCases: unsigned.reviewedCases.cases.map((testCase) => ({
      caseId: testCase.id,
      fingerprint: testCase.fingerprint,
    })),
    reviewerName: "Independent reviewer",
    reviewedAt: "2026-09-17",
  });
  const originalConflict = unsigned.reviewedCases.cases.find((testCase) => testCase.id === "body-reference-conflict");
  const changedConflict = changedAnchorReport.reviewedCases.cases.find((testCase) => testCase.id === "body-reference-conflict");
  assert.ok(originalConflict);
  assert.ok(changedConflict);
  assert.notEqual(changedConflict.fingerprint, originalConflict.fingerprint);
  assert.equal(changedAnchorReport.reviewedCases.reviewStatus, "awaiting_collaborator_signoff");
});
