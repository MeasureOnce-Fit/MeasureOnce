import assert from "node:assert/strict";
import test from "node:test";

import {
  ConsentRequiredError,
  ProfileNotFoundError,
  VersionConflictError,
  createIdentityService,
} from "../../src/lib/identity/service";
import type {
  AccountDataSnapshot,
  ConsentState,
  FitProfile,
  IdentityRepository,
  PrincipalContext,
  ProfileDraft,
  ProfilePatch,
} from "../../src/lib/identity/types";

const context: PrincipalContext = { principalId: "shopper-a1", retailerId: "retailer-a" };

const draft: ProfileDraft = {
  kind: "self",
  nickname: "My fit",
  catalogCollection: "both",
  ownerPermissionConfirmed: false,
  measurements: [
    { region: "waist", value: 80, unit: "cm", method: "body", source: "shopper_entered" },
  ],
  preferences: [],
  anchors: [],
};

function profile(overrides: Partial<FitProfile> = {}): FitProfile {
  return {
    ...draft,
    id: "profile-a",
    retailerId: context.retailerId,
    ownerId: context.principalId,
    status: "active",
    version: 1,
    createdAt: "2026-09-18T12:00:00.000Z",
    updatedAt: "2026-09-18T12:00:00.000Z",
    ...overrides,
  };
}

class MemoryRepository implements IdentityRepository {
  consent: ConsentState | null = null;
  profiles = new Map<string, FitProfile>();
  snapshot: AccountDataSnapshot = { profiles: [], consentEvents: [], rightsRequests: [] };
  calls: string[] = [];
  updateCalls = 0;

  async getConsentState(): Promise<ConsentState | null> {
    return this.consent;
  }

  async recordConsent(
    activeContext: PrincipalContext,
    input: { granted: boolean; policyVersion: string },
  ): Promise<ConsentState> {
    this.calls.push(`consent:${input.granted}`);
    this.consent = {
      ...activeContext,
      purpose: "fit_profile_storage",
      granted: input.granted,
      policyVersion: input.policyVersion,
      updatedAt: "2026-09-18T12:00:00.000Z",
    };
    return this.consent;
  }

  async createProfile(activeContext: PrincipalContext, input: ProfileDraft): Promise<FitProfile> {
    this.calls.push("create-profile");
    const created = profile({ ...input, ownerId: activeContext.principalId, retailerId: activeContext.retailerId });
    this.profiles.set(created.id, created);
    return created;
  }

  async getProfile(_activeContext: PrincipalContext, profileId: string): Promise<FitProfile | null> {
    return this.profiles.get(profileId) ?? null;
  }

  async updateProfile(
    _activeContext: PrincipalContext,
    profileId: string,
    expectedVersion: number,
    patch: ProfilePatch,
  ): Promise<FitProfile | null> {
    this.updateCalls += 1;
    const current = this.profiles.get(profileId);
    if (!current || current.version !== expectedVersion) return null;
    const updated = { ...current, ...patch, version: current.version + 1 };
    this.profiles.set(profileId, updated);
    return updated;
  }

  async deleteProfile(_activeContext: PrincipalContext, profileId: string): Promise<boolean> {
    return this.profiles.delete(profileId);
  }

  async readAccountData(): Promise<AccountDataSnapshot> {
    return this.snapshot;
  }

  async deleteOwnedApplicationData(_activeContext: PrincipalContext, idempotencyKey: string) {
    this.calls.push(`delete-data:${idempotencyKey}`);
  }

}

function grantedConsent(): ConsentState {
  return {
    ...context,
    purpose: "fit_profile_storage",
    granted: true,
    policyVersion: "2026-09-18",
    updatedAt: "2026-09-18T12:00:00.000Z",
  };
}

test("grantConsent records an explicit policy-versioned choice", async () => {
  const repository = new MemoryRepository();
  const service = createIdentityService(repository);

  const consent = await service.grantConsent(context, "2026-09-18");

  assert.equal(consent.granted, true);
  assert.equal(consent.policyVersion, "2026-09-18");
  assert.deepEqual(repository.calls, ["consent:true"]);
});

test("createProfile requires explicit active consent", async () => {
  const repository = new MemoryRepository();
  const service = createIdentityService(repository);

  await assert.rejects(service.createProfile(context, draft), ConsentRequiredError);
  assert.deepEqual(repository.calls, []);
});

test("createProfile validates and stores a profile after consent", async () => {
  const repository = new MemoryRepository();
  repository.consent = grantedConsent();
  const service = createIdentityService(repository);

  const created = await service.createProfile(context, { ...draft, nickname: "  My fit  " });

  assert.equal(created.nickname, "My fit");
  assert.equal(created.ownerId, context.principalId);
  assert.equal(created.retailerId, context.retailerId);
});

test("updateProfile conceals a profile from another owner or retailer", async () => {
  const repository = new MemoryRepository();
  repository.consent = grantedConsent();
  repository.profiles.set(
    "foreign",
    profile({ id: "foreign", ownerId: "shopper-a2", retailerId: "retailer-b" }),
  );
  const service = createIdentityService(repository);

  await assert.rejects(
    service.updateProfile(context, "foreign", 1, { nickname: "Changed" }),
    ProfileNotFoundError,
  );
  assert.equal(repository.updateCalls, 0);
});

test("updateProfile rejects a stale version", async () => {
  const repository = new MemoryRepository();
  repository.consent = grantedConsent();
  repository.profiles.set("profile-a", profile({ version: 3 }));
  const service = createIdentityService(repository);

  await assert.rejects(
    service.updateProfile(context, "profile-a", 2, { nickname: "Changed" }),
    VersionConflictError,
  );
  assert.equal(repository.updateCalls, 0);
});

test("updateProfile rejects category reference provenance that does not exactly resolve server-side", async () => {
  const repository = new MemoryRepository();
  repository.consent = grantedConsent();
  repository.profiles.set("profile-a", profile());
  const service = createIdentityService(repository);
  const verified = {
    evidenceKind: "category_size_reference" as const,
    referenceId: "csr:formline:outerwear:8",
    referenceVersion: "synthetic-category-chart-v1",
    brandName: "Orivelle",
    category: "Outerwear",
    sizeLabel: "8",
    observations: { chest_bust: "just_right" },
  };

  for (const forged of [
    { ...verified, referenceVersion: "forged-version" },
    { ...verified, brandName: "Forged Brand" },
    { ...verified, category: "Dresses" },
    { ...verified, sizeLabel: "10" },
  ]) {
    await assert.rejects(
      service.updateProfile(context, "profile-a", 1, { anchors: [forged] }),
      TypeError,
    );
  }
  assert.equal(repository.updateCalls, 0);
});

test("updateProfile accepts Orivelle jacket evidence with the fixture's canonical Outerwear category", async () => {
  const repository = new MemoryRepository();
  repository.consent = grantedConsent();
  repository.profiles.set("profile-a", profile());
  const service = createIdentityService(repository);
  const anchor = {
    evidenceKind: "category_size_reference" as const,
    referenceId: "csr:formline:outerwear:8",
    referenceVersion: "synthetic-category-chart-v1",
    brandName: "Orivelle",
    category: "Outerwear",
    sizeLabel: "8",
    observations: { chest_bust: "just_right" },
  };

  const updated = await service.updateProfile(context, "profile-a", 1, { anchors: [anchor] });

  assert.deepEqual(updated.anchors, [anchor]);
  assert.equal(repository.updateCalls, 1);
});

test("withdrawConsent blocks later profile writes", async () => {
  const repository = new MemoryRepository();
  repository.consent = grantedConsent();
  repository.profiles.set("profile-a", profile());
  const service = createIdentityService(repository);

  const consent = await service.withdrawConsent(context, "2026-09-18");

  assert.equal(consent.granted, false);
  await assert.rejects(
    service.updateProfile(context, "profile-a", 1, { nickname: "Changed" }),
    ConsentRequiredError,
  );
  assert.equal(repository.updateCalls, 0);
});

test("exportAccount filters to the active owner and returns deterministic ordering", async () => {
  const repository = new MemoryRepository();
  const ownB = profile({ id: "b" });
  const ownA = profile({
    id: "a",
    measurements: [
      { region: "waist", value: 80, unit: "cm", method: "body", source: "shopper_entered" },
      { region: "chest", value: 95, unit: "cm", method: "body", source: "shopper_entered" },
    ],
    preferences: [
      { category: "tops", dimension: "chest", preference: "relaxed" },
      { category: "bottoms", dimension: "waist", preference: "balanced" },
    ],
    anchors: [
      {
        evidenceKind: "exact_garment",
        brandId: "brand-z",
        productId: "product-z",
        category: "trousers",
        sizeLabel: "M",
        observations: { waist: "just_right" },
      },
      {
        evidenceKind: "exact_garment",
        brandId: "brand-a",
        productId: "product-a",
        category: "tops",
        sizeLabel: "S",
        observations: { shoulder: "just_right" },
      },
    ],
  });
  const foreign = profile({ id: "foreign", ownerId: "shopper-a2" });
  repository.snapshot = {
    profiles: [ownB, foreign, ownA],
    consentEvents: [
      { ...grantedConsent(), id: "z", action: "granted" },
      { ...grantedConsent(), id: "a", action: "granted" },
      { ...grantedConsent(), id: "foreign", principalId: "shopper-a2", action: "granted" },
    ],
    rightsRequests: [
      {
        id: "z",
        principalId: context.principalId,
        retailerId: context.retailerId,
        type: "export",
        idempotencyKey: "key-z",
        status: "completed",
        requestedAt: "2026-09-18T12:00:00.000Z",
      },
      {
        id: "foreign",
        principalId: "shopper-a2",
        retailerId: context.retailerId,
        type: "export",
        idempotencyKey: "foreign",
        status: "completed",
        requestedAt: "2026-09-18T12:00:00.000Z",
      },
      {
        id: "a",
        principalId: context.principalId,
        retailerId: context.retailerId,
        type: "export",
        idempotencyKey: "key-a",
        status: "completed",
        requestedAt: "2026-09-18T12:00:00.000Z",
      },
    ],
  };
  const service = createIdentityService(repository);

  const first = await service.exportAccount(context);
  const second = await service.exportAccount(context);

  assert.deepEqual(first.profiles.map(({ id }) => id), ["a", "b"]);
  assert.deepEqual(first.profiles[0]?.measurements.map(({ region }) => region), ["chest", "waist"]);
  assert.deepEqual(first.profiles[0]?.preferences.map(({ category }) => category), ["bottoms", "tops"]);
  assert.deepEqual(
    first.profiles[0]?.anchors.map((anchor) =>
      anchor.evidenceKind === "exact_garment" ? anchor.brandId : "",
    ),
    ["brand-a", "brand-z"],
  );
  assert.deepEqual(first.consentEvents.map(({ id }) => id), ["a", "z"]);
  assert.deepEqual(first.rightsRequests.map(({ id }) => id), ["a", "z"]);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
});

test("exportAccount preserves evidence kind while canonically ordering mixed anchor evidence", async () => {
  const repository = new MemoryRepository();
  repository.snapshot = {
    profiles: [
      profile({
        anchors: [
          {
            evidenceKind: "remembered_size_context",
            brandName: "Outside Label",
            category: "Jackets",
            sizeLabel: "M",
            observations: { chest_bust: "just_right" },
          },
          {
            evidenceKind: "category_size_reference",
            brandName: "Orivelle",
            referenceId: "formline-jackets-8",
            referenceVersion: "2026-09-20",
            category: "Jackets",
            sizeLabel: "8",
            observations: { chest_bust: "just_right" },
          },
          {
            evidenceKind: "exact_garment",
            brandId: "brand-a",
            productId: "jacket-a",
            category: "Jackets",
            sizeLabel: "8",
            observations: { chest_bust: "just_right" },
          },
        ],
      }),
    ],
    consentEvents: [],
    rightsRequests: [],
  };
  const service = createIdentityService(repository);

  const exported = await service.exportAccount(context);

  assert.deepEqual(
    exported.profiles[0]?.anchors.map((anchor) => anchor.evidenceKind),
    ["category_size_reference", "exact_garment", "remembered_size_context"],
  );
});

test("deleteProfile is idempotent for an already absent owned profile", async () => {
  const repository = new MemoryRepository();
  repository.profiles.set("profile-a", profile());
  const service = createIdentityService(repository);

  assert.equal(await service.deleteProfile(context, "profile-a"), true);
  assert.equal(await service.deleteProfile(context, "profile-a"), false);
});

test("deleteFitPassport removes only retailer-scoped application data", async () => {
  const repository = new MemoryRepository();
  const service = createIdentityService(repository);

  await service.deleteFitPassport(context, "delete-passport-001");

  assert.deepEqual(repository.calls, ["delete-data:delete-passport-001"]);
});
