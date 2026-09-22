import assert from "node:assert/strict";
import test from "node:test";

import {
  createAccountExportHttpHandlers,
  createAccountHttpHandlers,
  createConsentHttpHandlers,
  createProfileHttpHandlers,
  createProfilesHttpHandlers,
} from "../../src/lib/identity/protected-http";
import {
  VersionConflictError,
  type IdentityService,
} from "../../src/lib/identity/service";
import {
  ProtectedSessionUnauthorizedError,
  ProtectedSessionUnavailableError,
} from "../../src/lib/identity/session-context";
import type {
  AccountExport,
  FitProfile,
  PrincipalContext,
  ProfileDraft,
} from "../../src/lib/identity/types";

const context: PrincipalContext = {
  principalId: "principal-0001",
  retailerId: "retailer-0001",
};

const emptyExport: AccountExport = {
  schemaVersion: "1.0",
  principalId: context.principalId,
  retailerId: context.retailerId,
  profiles: [],
  consentEvents: [],
  rightsRequests: [],
};

const draft: ProfileDraft = {
  kind: "self",
  nickname: "My fit",
  catalogCollection: "both",
  ownerPermissionConfirmed: false,
  measurements: [],
  preferences: [],
  anchors: [],
};

const ownProfile: FitProfile = {
  ...draft,
  id: "profile-0001",
  ownerId: context.principalId,
  retailerId: context.retailerId,
  status: "active",
  version: 1,
  createdAt: "2026-09-18T12:00:00.000Z",
  updatedAt: "2026-09-18T12:00:00.000Z",
};

function service(overrides: Partial<IdentityService> = {}): IdentityService {
  return {
    async grantConsent() {
      throw new Error("Unexpected grantConsent call.");
    },
    async withdrawConsent() {
      throw new Error("Unexpected withdrawConsent call.");
    },
    async createProfile() {
      throw new Error("Unexpected createProfile call.");
    },
    async updateProfile() {
      throw new Error("Unexpected updateProfile call.");
    },
    async deleteProfile() {
      throw new Error("Unexpected deleteProfile call.");
    },
    async exportAccount() {
      return emptyExport;
    },
    async deleteFitPassport() {
      throw new Error("Unexpected deleteFitPassport call.");
    },
    ...overrides,
  };
}

function dependencies(identityService: IdentityService) {
  return {
    authenticate: async () => context,
    createService: () => identityService,
    policyVersion: "2026-09-18",
  };
}

test("lists only profiles from the authenticated account export without caching", async () => {
  const handlers = createProfilesHttpHandlers(dependencies(service()));

  const response = await handlers.GET(
    new Request("https://shop.example/api/profiles?principalId=attacker", {
      headers: { "X-Retailer-Id": "attacker" },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.deepEqual(await response.json(), { profiles: [] });
});

test("creates a validated profile in the session-derived security boundary", async () => {
  const received: Array<{ context: PrincipalContext; draft: ProfileDraft }> = [];
  const handlers = createProfilesHttpHandlers(
    dependencies(
      service({
        async createProfile(activeContext, input) {
          received.push({ context: activeContext, draft: input });
          return ownProfile;
        },
      }),
    ),
  );

  const response = await handlers.POST(
    new Request("https://shop.example/api/profiles?retailerId=attacker", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Principal-Id": "attacker" },
      body: JSON.stringify(draft),
    }),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { profile: ownProfile });
  assert.deepEqual(received, [{ context, draft }]);
});

test("rejects malformed JSON and caller-supplied identity fields", async (t) => {
  let createCalls = 0;
  const handlers = createProfilesHttpHandlers(
    dependencies(
      service({
        async createProfile() {
          createCalls += 1;
          return ownProfile;
        },
      }),
    ),
  );
  const cases = [
    ["malformed JSON", "{"],
    ["extra principal field", JSON.stringify({ ...draft, principalId: "attacker" })],
    ["extra retailer field", JSON.stringify({ ...draft, retailerId: "attacker" })],
  ] as const;

  for (const [name, body] of cases) {
    await t.test(name, async () => {
      const response = await handlers.POST(
        new Request("https://shop.example/api/profiles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }),
      );
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "Invalid request." });
    });
  }
  assert.equal(createCalls, 0);
});

test("maps missing sessions and unavailable verification to generic no-store errors", async (t) => {
  for (const [name, failure, status, body] of [
    ["unauthenticated", new ProtectedSessionUnauthorizedError(), 401, { error: "Unauthorized." }],
    ["unavailable", new ProtectedSessionUnavailableError(), 503, { error: "Service unavailable." }],
  ] as const) {
    await t.test(name, async () => {
      const handlers = createProfilesHttpHandlers({
        ...dependencies(service()),
        authenticate: async () => {
          throw failure;
        },
      });
      const response = await handlers.GET(new Request("https://shop.example/api/profiles"));
      assert.equal(response.status, status);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.deepEqual(await response.json(), body);
    });
  }
});

test("maps unexpected service failures to a generic service-unavailable response", async () => {
  const handlers = createProfilesHttpHandlers(
    dependencies(
      service({
        async exportAccount() {
          throw new Error("database password leaked");
        },
      }),
    ),
  );

  const response = await handlers.GET(new Request("https://shop.example/api/profiles"));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Service unavailable." });
});

test("returns one owned profile and conceals every profile outside the account export", async (t) => {
  for (const [name, account, status] of [
    ["owned", { ...emptyExport, profiles: [ownProfile] } as AccountExport, 200],
    ["absent or foreign", emptyExport, 404],
  ] as const) {
    await t.test(name, async () => {
      const handlers = createProfileHttpHandlers(
        dependencies(
          service({
            async exportAccount() {
              return account;
            },
          }),
        ),
      );
      const response = await handlers.GET(
        new Request("https://shop.example/api/profiles/profile-0001"),
        { params: Promise.resolve({ profileId: "profile-0001" }) },
      );
      assert.equal(response.status, status);
      assert.deepEqual(
        await response.json(),
        status === 200 ? { profile: ownProfile } : { error: "Not found." },
      );
    });
  }
});

test("patches a validated profile using an optimistic version", async () => {
  const updated = { ...ownProfile, nickname: "Updated fit", version: 2 };
  const received: unknown[] = [];
  const handlers = createProfileHttpHandlers(
    dependencies(
      service({
        async updateProfile(activeContext, profileId, expectedVersion, patch) {
          received.push({ activeContext, profileId, expectedVersion, patch });
          return updated;
        },
      }),
    ),
  );
  const response = await handlers.PATCH(
    new Request("https://shop.example/api/profiles/profile-0001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: 1, patch: { nickname: "Updated fit" } }),
    }),
    { params: Promise.resolve({ profileId: "profile-0001" }) },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { profile: updated });
  assert.deepEqual(received, [
    {
      activeContext: context,
      profileId: "profile-0001",
      expectedVersion: 1,
      patch: { nickname: "Updated fit" },
    },
  ]);
});

test("accepts verified references and remembered size context in a protected profile patch", async () => {
  const anchors = [
    {
      evidenceKind: "category_size_reference" as const,
      referenceId: "csr:formline:outerwear:8",
      referenceVersion: "synthetic-category-chart-v1",
      brandName: "Orivelle",
      category: "Outerwear",
      sizeLabel: "8",
      observations: { chest_bust: "just_right" },
    },
    {
      evidenceKind: "remembered_size_context" as const,
      brandName: "Orivelle",
      category: "Jackets",
      sizeLabel: "12",
      observations: { chest_bust: "just_right" },
    },
    {
      evidenceKind: "remembered_size_context" as const,
      brandName: "Outside Label",
      category: "Jackets",
      sizeLabel: "M",
      observations: { chest_bust: "just_right" },
    },
  ];
  const received: unknown[] = [];
  const handlers = createProfileHttpHandlers(
    dependencies(service({
      async updateProfile(_context, _profileId, _expectedVersion, patch) {
        received.push(patch);
        return { ...ownProfile, anchors, version: 2 };
      },
    })),
  );
  const response = await handlers.PATCH(
    new Request("https://shop.example/api/profiles/profile-0001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: 1, patch: { anchors } }),
    }),
    { params: Promise.resolve({ profileId: "profile-0001" }) },
  );

  assert.equal(response.status, 200);
  assert.deepEqual(received, [{ anchors }]);
});

test("rejects malformed and extra patch fields before the service call", async (t) => {
  let updateCalls = 0;
  const handlers = createProfileHttpHandlers(
    dependencies(
      service({
        async updateProfile() {
          updateCalls += 1;
          return ownProfile;
        },
      }),
    ),
  );
  const cases = [
    "{",
    JSON.stringify({ expectedVersion: 1, patch: { retailerId: "attacker" } }),
    JSON.stringify({ expectedVersion: 1, patch: { nickname: "Changed" }, principalId: "attacker" }),
    JSON.stringify({ expectedVersion: 0, patch: { nickname: "Changed" } }),
  ];

  for (const body of cases) {
    await t.test(body, async () => {
      const response = await handlers.PATCH(
        new Request("https://shop.example/api/profiles/profile-0001", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body,
        }),
        { params: Promise.resolve({ profileId: "profile-0001" }) },
      );
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "Invalid request." });
    });
  }
  assert.equal(updateCalls, 0);
});

test("maps a stale profile version to a generic conflict", async () => {
  const handlers = createProfileHttpHandlers(
    dependencies(
      service({
        async updateProfile() {
          throw new VersionConflictError();
        },
      }),
    ),
  );
  const response = await handlers.PATCH(
    new Request("https://shop.example/api/profiles/profile-0001", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expectedVersion: 1, patch: { nickname: "Updated fit" } }),
    }),
    { params: Promise.resolve({ profileId: "profile-0001" }) },
  );
  assert.equal(response.status, 409);
  assert.deepEqual(await response.json(), { error: "Conflict." });
});

test("requires an idempotency key and empty body for idempotent profile deletion", async () => {
  const deleted: unknown[] = [];
  const handlers = createProfileHttpHandlers(
    dependencies(
      service({
        async deleteProfile(activeContext, profileId) {
          deleted.push({ activeContext, profileId });
          return false;
        },
      }),
    ),
  );
  const missingKey = await handlers.DELETE(
    new Request("https://shop.example/api/profiles/profile-0001", { method: "DELETE" }),
    { params: Promise.resolve({ profileId: "profile-0001" }) },
  );
  const injectedBody = await handlers.DELETE(
    new Request("https://shop.example/api/profiles/profile-0001", {
      method: "DELETE",
      headers: { "Idempotency-Key": "delete-profile-0001" },
      body: JSON.stringify({ principalId: "attacker" }),
    }),
    { params: Promise.resolve({ profileId: "profile-0001" }) },
  );
  const deletedResponse = await handlers.DELETE(
    new Request("https://shop.example/api/profiles/profile-0001", {
      method: "DELETE",
      headers: { "Idempotency-Key": "delete-profile-0001" },
    }),
    { params: Promise.resolve({ profileId: "profile-0001" }) },
  );

  assert.equal(missingKey.status, 400);
  assert.equal(injectedBody.status, 400);
  assert.equal(deletedResponse.status, 204);
  assert.equal(deletedResponse.headers.get("cache-control"), "no-store");
  assert.deepEqual(deleted, [{ activeContext: context, profileId: "profile-0001" }]);
});

test("grants and withdraws consent only for the server-approved policy version", async (t) => {
  const choices: unknown[] = [];
  const consent = {
    ...context,
    purpose: "fit_profile_storage" as const,
    granted: true,
    policyVersion: "2026-09-18",
    updatedAt: "2026-09-18T12:00:00.000Z",
  };
  const handlers = createConsentHttpHandlers(
    dependencies(
      service({
        async grantConsent(activeContext, policyVersion) {
          choices.push({ activeContext, granted: true, policyVersion });
          return consent;
        },
        async withdrawConsent(activeContext, policyVersion) {
          choices.push({ activeContext, granted: false, policyVersion });
          return { ...consent, granted: false };
        },
      }),
    ),
  );

  for (const granted of [true, false]) {
    await t.test(granted ? "grant" : "withdraw", async () => {
      const response = await handlers.PUT(
        new Request("https://shop.example/api/consent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ granted, policyVersion: "2026-09-18" }),
        }),
      );
      assert.equal(response.status, 200);
      assert.equal((await response.json()).consent.granted, granted);
    });
  }

  for (const body of [
    { granted: true, policyVersion: "old-policy" },
    { granted: true, policyVersion: "2026-09-18", principalId: "attacker" },
    { granted: true, policyVersion: "2026-09-18", retailerId: "attacker" },
  ]) {
    await t.test(`reject ${JSON.stringify(body)}`, async () => {
      const response = await handlers.PUT(
        new Request("https://shop.example/api/consent", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: "Invalid request." });
    });
  }

  assert.deepEqual(choices, [
    { activeContext: context, granted: true, policyVersion: "2026-09-18" },
    { activeContext: context, granted: false, policyVersion: "2026-09-18" },
  ]);
});

test("exports exactly the authenticated account snapshot as downloadable JSON", async () => {
  const handlers = createAccountExportHttpHandlers(dependencies(service()));
  const response = await handlers.GET(
    new Request("https://shop.example/api/account/export?principalId=attacker", {
      headers: { "X-Retailer-Id": "attacker" },
    }),
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(
    response.headers.get("content-disposition"),
    'attachment; filename="measureonce-fit-passport.json"',
  );
  assert.deepEqual(await response.json(), emptyExport);
});

test("deletes only the Fit Passport with a required idempotency key", async () => {
  const keys: string[] = [];
  const handlers = createAccountHttpHandlers(
    dependencies(
      service({
        async deleteFitPassport(activeContext, idempotencyKey) {
          assert.deepEqual(activeContext, context);
          keys.push(idempotencyKey);
        },
      }),
    ),
  );
  const missingKey = await handlers.DELETE(
    new Request("https://shop.example/api/account", { method: "DELETE" }),
  );
  const response = await handlers.DELETE(
    new Request("https://shop.example/api/account", {
      method: "DELETE",
      headers: { "Idempotency-Key": "delete-passport-0001" },
    }),
  );

  assert.equal(missingKey.status, 400);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    deleted: true,
    message: "Fit Passport deleted. Your shopping account remains active.",
  });
  assert.deepEqual(keys, ["delete-passport-0001"]);
});
