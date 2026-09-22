import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  buildSeedPlan,
  validateLiveSeedEnvironment,
} from "../../scripts/seed-m2-identities.mjs";
import {
  inspectIsolationPlan,
  validateLiveVerificationEnvironment,
} from "../../scripts/verify-m2-isolation.mjs";

test("M2 seed plan contains exactly four shoppers and two operators across two retailers", () => {
  const plan = buildSeedPlan();

  assert.equal(plan.retailers.length, 2);
  assert.equal(plan.identities.length, 6);
  assert.equal(plan.identities.filter((identity) => identity.actorKind === "shopper").length, 4);
  assert.equal(plan.identities.filter((identity) => identity.actorKind === "operator").length, 2);
  assert.equal(new Set(plan.identities.map((identity) => identity.email)).size, 6);

  for (const retailer of plan.retailers) {
    const identities = plan.identities.filter(
      (identity) => identity.retailerId === retailer.id,
    );
    assert.equal(identities.filter((identity) => identity.actorKind === "shopper").length, 2);
    assert.equal(identities.filter((identity) => identity.actorKind === "operator").length, 1);
  }
});

test("the same fictional external subject remains a deliberate cross-retailer collision", () => {
  const plan = buildSeedPlan();
  const collisions = plan.identities.filter(
    (identity) => identity.externalSubject === "synthetic-shared-shopper-001",
  );

  assert.equal(collisions.length, 2);
  assert.deepEqual(
    new Set(collisions.map((identity) => identity.retailerId)).size,
    2,
  );
});

test("shopper A1 owns one self profile and two additional member profiles", () => {
  const plan = buildSeedPlan();
  const shopper = plan.identities.find((identity) => identity.fixtureId === "shopper-a1");

  assert.ok(shopper);
  assert.deepEqual(
    shopper.profiles.map(({ kind, nickname }) => ({ kind, nickname })),
    [
      { kind: "self", nickname: "My fit" },
      { kind: "additional_member", nickname: "Alex" },
      { kind: "additional_member", nickname: "Morgan" },
    ],
  );
  assert.equal(shopper.profiles[0].permissionConfirmedAt, null);
  assert.ok(shopper.profiles[1].permissionConfirmedAt);
  assert.ok(shopper.profiles[2].permissionConfirmedAt);
  assert.equal("relationship" in shopper.profiles[1], false);
});

test("dry-run plan never embeds credentials or secrets", () => {
  const serialized = JSON.stringify(buildSeedPlan()).toLowerCase();

  for (const forbidden of [
    "password",
    "service_role",
    "service-role",
    "secret",
    "supabase_service_role_key",
  ]) {
    assert.equal(serialized.includes(forbidden), false, `found forbidden token: ${forbidden}`);
  }
});

test("live seed is blocked in production and requires private environment values", () => {
  assert.throws(
    () => validateLiveSeedEnvironment({ NODE_ENV: "production" }),
    /production/i,
  );
  assert.throws(
    () => validateLiveSeedEnvironment({ NODE_ENV: "test" }),
    /SUPABASE_URL, SUPABASE_SECRET_KEY, and M2_SEED_PASSWORD/,
  );

  assert.deepEqual(
    validateLiveSeedEnvironment({
      NODE_ENV: "test",
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_SECRET_KEY: "fixture-key-from-private-env",
      M2_SEED_PASSWORD: "fixture-password-from-private-env",
    }),
    {
      supabaseUrl: "http://127.0.0.1:54321",
      serviceRoleKey: "fixture-key-from-private-env",
      seedPassword: "fixture-password-from-private-env",
    },
  );
});

test("live verification accepts the current publishable-key environment names", () => {
  assert.throws(
    () => validateLiveVerificationEnvironment({ NODE_ENV: "test" }),
    /SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and M2_SEED_PASSWORD/,
  );

  assert.deepEqual(
    validateLiveVerificationEnvironment({
      NODE_ENV: "test",
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
      M2_SEED_PASSWORD: "fixture-password-from-private-env",
    }),
    {
      supabaseUrl: "http://127.0.0.1:54321",
      publishableKey: "sb_publishable_fixture",
      seedPassword: "fixture-password-from-private-env",
    },
  );
});

test("isolation inspection defines owner, tenant-collision, and operator checks", () => {
  const inspection = inspectIsolationPlan(buildSeedPlan());

  assert.equal(inspection.valid, true);
  assert.equal(inspection.scenarios.length, 6);
  assert.deepEqual(
    new Set(inspection.scenarios.map((scenario) => scenario.expectedVisibleProfileCount)),
    new Set([0, 1, 3]),
  );
  assert.ok(inspection.scenarios.every((scenario) => scenario.forbiddenRetailerIds.length === 1));
});

test("repeat seeding does not upsert versioned fit profiles", async () => {
  const source = await readFile(
    new URL("../../scripts/seed-m2-identities.mjs", import.meta.url),
    "utf8",
  );

  assert.equal(
    source.includes('await admin.from("fit_profiles").upsert'),
    false,
    "updating an existing profile would increment its version trigger on every seed run",
  );
});

test("live fixtures never write or query the removed raw external-subject column", async () => {
  const [seedSource, verificationSource] = await Promise.all([
    readFile(new URL("../../scripts/seed-m2-identities.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../scripts/verify-m2-isolation.mjs", import.meta.url), "utf8"),
  ]);

  assert.equal(seedSource.includes("external_subject: identity.externalSubject"), false);
  assert.equal(
    verificationSource.includes('select("id,retailer_id,actor_kind,external_subject")'),
    false,
  );
});
