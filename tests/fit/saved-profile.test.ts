import assert from "node:assert/strict";
import test from "node:test";

import { createSavedProfileRecommendationHandler } from "../../src/lib/fit/saved-profile";
import { listCategorySizeOptions } from "../../src/lib/fit/category-size-reference";
import type { IdentityService } from "../../src/lib/identity/service";
import type { AccountExport, FitProfile, PrincipalContext } from "../../src/lib/identity/types";

const context: PrincipalContext = { principalId: "principal-0001", retailerId: "retailer-0001" };
const profile: FitProfile = {
  id: "profile-0001", retailerId: context.retailerId, ownerId: context.principalId,
  kind: "self", nickname: "Alex", ownerPermissionConfirmed: false, status: "active", version: 1,
  catalogCollection: "both",
  createdAt: "2026-09-18T00:00:00.000Z", updatedAt: "2026-09-18T00:00:00.000Z",
  measurements: [
    { region: "chest_bust", value: 87.4, unit: "cm", method: "body", source: "Fit Passport" },
    { region: "waist", value: 70.82, unit: "cm", method: "body", source: "Fit Passport" },
    { region: "hip_seat", value: 96.04, unit: "cm", method: "body", source: "Fit Passport" },
  ], preferences: [], anchors: [],
};

function service(profiles: FitProfile[]): IdentityService {
  return {
    async grantConsent() { throw new Error("Unexpected."); },
    async withdrawConsent() { throw new Error("Unexpected."); },
    async createProfile() { throw new Error("Unexpected."); },
    async updateProfile() { throw new Error("Unexpected."); },
    async deleteProfile() { throw new Error("Unexpected."); },
    async deleteFitPassport() { throw new Error("Unexpected."); },
    async exportAccount(): Promise<AccountExport> {
      return { schemaVersion: "1.0", principalId: context.principalId, retailerId: context.retailerId, profiles, consentEvents: [], rightsRequests: [] };
    },
  };
}

function handler(profiles: FitProfile[] = [profile]) {
  return createSavedProfileRecommendationHandler({
    authenticate: async () => context,
    createService: () => service(profiles),
    policyVersion: "2026-09-18",
  });
}

test("runs a saved, retailer-owned Fit Passport profile without accepting client measurements", async () => {
  const response = await handler()(new Request("http://localhost/api/fit/saved-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-women-001", preference: "regular", profileId: profile.id }),
  }));
  const payload = await response.json() as Record<string, unknown>;
  const serialized = JSON.stringify(payload);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(Object.keys(payload).sort(), ["product", "profile", "result", "synthetic", "targetProductId"]);
  assert.match(serialized, /"recommendedSizeLabel":"8\/10"/);
  assert.doesNotMatch(serialized, /70\.82|normalizedMeasurements|compatibleBodyRanges|methodId|source/);
});

test("returns a safe incomplete result for a saved profile without category evidence", async () => {
  const response = await handler([{ ...profile, measurements: [] }])(new Request("http://localhost/api/fit/saved-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-women-001", preference: "regular", profileId: profile.id }),
  }));
  const payload = await response.json() as { result: { state: string } };
  assert.equal(response.status, 200);
  assert.equal(payload.result.state, "INSUFFICIENT_PROFILE_EVIDENCE");
});

test("uses a matching verified saved category size while ignoring observations irrelevant to the target", async () => {
  const reference = listCategorySizeOptions("mo-men-013", "brand_04")[0];
  assert.ok(reference);
  const profileWithKnownJacketSize: FitProfile = {
    ...profile,
    measurements: [],
    anchors: [{
      evidenceKind: "category_size_reference",
      referenceId: reference.id,
      referenceVersion: reference.version,
      brandName: "Solenne & Rue",
      category: "Outerwear",
      sizeLabel: reference.sizeLabel,
      observations: {
        chest_bust: "just_right",
        shoulder_cross_back: "right_length",
        body_length: "right_length",
        sleeve_length: "right_length",
      },
    }],
  };

  const response = await handler([profileWithKnownJacketSize])(new Request("http://localhost/api/fit/saved-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-men-013", preference: "regular", profileId: profile.id }),
  }));
  const payload = await response.json() as { result: { state: string; evidence: { used: string[]; missingRegions: string[] } } };

  assert.equal(response.status, 200);
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(payload.result.state));
  assert.deepEqual(payload.result.evidence.used, ["reference_garment"]);
  assert.deepEqual(payload.result.evidence.missingRegions, []);
});

test("upgrades a legacy Velmora dress size 0 context when running saved fit", async () => {
  const legacyProfile: FitProfile = {
    ...profile,
    catalogCollection: "women",
    measurements: [],
    anchors: [{
      evidenceKind: "remembered_size_context",
      brandName: "Velmora",
      category: "Dresses",
      sizeLabel: "0",
      observations: {
        chest_bust: "just_right",
        waist: "just_right",
        hip_seat: "just_right",
        body_length: "right_length",
      },
    }],
  };
  const response = await handler([legacyProfile])(new Request("http://localhost/api/fit/saved-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-women-001", preference: "regular", profileId: profile.id }),
  }));
  const payload = await response.json() as { result: { state: string; evidence: { used: string[]; missingRegions: string[] } } };

  assert.equal(response.status, 200);
  assert.ok(["RECOMMENDED", "TRADEOFF", "NO_SUITABLE_SIZE"].includes(payload.result.state));
  assert.deepEqual(payload.result.evidence.used, ["reference_garment"]);
  assert.deepEqual(payload.result.evidence.missingRegions, []);
});

test("does not reinterpret an ambiguous legacy size for a both-collections profile", async () => {
  const ambiguousProfile: FitProfile = {
    ...profile,
    catalogCollection: "both",
    measurements: [],
    anchors: [{
      evidenceKind: "remembered_size_context",
      brandName: "Velmora",
      category: "Dresses",
      sizeLabel: "0",
      observations: {
        chest_bust: "just_right",
        waist: "just_right",
        hip_seat: "just_right",
        body_length: "right_length",
      },
    }],
  };
  const response = await handler([ambiguousProfile])(new Request("http://localhost/api/fit/saved-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-women-001", preference: "regular", profileId: profile.id }),
  }));
  const payload = await response.json() as { result: { state: string; evidence: { used: string[] } } };

  assert.equal(response.status, 200);
  assert.equal(payload.result.state, "INSUFFICIENT_PROFILE_EVIDENCE");
  assert.deepEqual(payload.result.evidence.used, []);
});

test("preserves both labelled options for a saved-profile tradeoff", async () => {
  const tradeoffProfile: FitProfile = {
    ...profile,
    measurements: [
      { region: "waist", value: 74, unit: "cm", method: "body", source: "Fit Passport" },
      { region: "hip_seat", value: 90, unit: "cm", method: "body", source: "Fit Passport" },
      { region: "inseam", value: 72.75, unit: "cm", method: "body", source: "Fit Passport" },
    ],
  };
  const response = await handler([tradeoffProfile])(new Request("http://localhost/api/fit/saved-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-men-006", preference: "regular", profileId: profile.id }),
  }));
  const payload = await response.json() as { result: { state: string; options?: Array<{ sizeLabel: string; findings: unknown[] }> } };

  assert.equal(response.status, 200);
  assert.equal(payload.result.state, "TRADEOFF");
  assert.deepEqual(payload.result.options?.map((option) => option.sizeLabel), ["30×30", "28×30"]);
  assert.ok(payload.result.options?.every((option) => option.findings.length > 0));
});

test("rejects client-owned measurements and profiles outside the active retailer session", async () => {
  const invalid = await handler()(new Request("http://localhost/api/fit/saved-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-women-001", preference: "regular", profileId: profile.id, measurements: [] }),
  }));
  const missing = await handler([])(new Request("http://localhost/api/fit/saved-profile", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ targetProductId: "mo-women-001", preference: "regular", profileId: profile.id }),
  }));
  assert.equal(invalid.status, 400);
  assert.equal(missing.status, 404);
});
