import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import test from "node:test";

import { exportSPKI, generateKeyPair } from "jose";

import {
  RetailerIdentityEnvironmentError,
  loadRetailerIdentityConfig,
} from "../../src/lib/retailer-identity/env";
import { digestRetailerSubject } from "../../src/lib/retailer-identity/subject-digest";

const RETAILER_ID = "3cbf7b5c-822f-4f8a-b957-b28198c24a22";

async function validEnvironment() {
  const { publicKey } = await generateKeyPair("RS256");
  return {
    RETAILER_IDENTITY_RETAILER_ID: RETAILER_ID,
    RETAILER_IDENTITY_ISSUER: "https://identity.northstar.example",
    RETAILER_IDENTITY_AUDIENCE: "measureonce-fit-passport",
    RETAILER_IDENTITY_ALGORITHM: "RS256",
    RETAILER_IDENTITY_PUBLIC_KEY_PEM: await exportSPKI(publicKey),
    RETAILER_IDENTITY_SUBJECT_HMAC_SECRET: "digest-secret-with-at-least-32-bytes",
    RETAILER_IDENTITY_SESSION_SECRET: "session-secret-with-at-least-32-bytes",
    RETAILER_IDENTITY_ASSERTION_MAX_AGE_SECONDS: "300",
    RETAILER_IDENTITY_SESSION_TTL_SECONDS: "900",
  };
}

test("loads a complete retailer identity environment with an asymmetric public key", async () => {
  const config = await loadRetailerIdentityConfig(await validEnvironment());

  assert.equal(config.retailerId, RETAILER_ID);
  assert.equal(config.algorithm, "RS256");
  assert.equal(config.maximumAssertionLifetimeSeconds, 300);
  assert.equal(config.sessionTtlSeconds, 900);
  assert.equal(config.subjectDigestSecret.byteLength >= 32, true);
  assert.equal(config.sessionSecret.byteLength >= 32, true);
});

for (const invalidCase of [
  {
    name: "non-UUID retailer id",
    override: { RETAILER_IDENTITY_RETAILER_ID: "northstar-outfitters" },
  },
  {
    name: "symmetric signing algorithm",
    override: { RETAILER_IDENTITY_ALGORITHM: "HS256" },
  },
  {
    name: "malformed public key",
    override: { RETAILER_IDENTITY_PUBLIC_KEY_PEM: "not a PEM public key" },
  },
  {
    name: "short subject digest secret",
    override: { RETAILER_IDENTITY_SUBJECT_HMAC_SECRET: "too-short" },
  },
  {
    name: "short session secret",
    override: { RETAILER_IDENTITY_SESSION_SECRET: "too-short" },
  },
] as const) {
  test(`rejects ${invalidCase.name} as an unavailable configuration`, async () => {
    await assert.rejects(
      loadRetailerIdentityConfig({ ...(await validEnvironment()), ...invalidCase.override }),
      RetailerIdentityEnvironmentError,
    );
  });
}

test("rejects an unconfigured retailer identity environment", async () => {
  await assert.rejects(loadRetailerIdentityConfig({}), RetailerIdentityEnvironmentError);
});

test("computes the subject digest as HMAC-SHA-256 without retaining the subject", () => {
  const secret = randomBytes(32);
  const subject = "cust_7f82a91d";
  const expected = createHmac("sha256", secret).update(subject, "utf8").digest("hex");

  const digest = digestRetailerSubject(subject, secret);

  assert.equal(Buffer.from(digest).toString("hex"), expected);
  assert.equal(digest.byteLength, 32);
  assert.equal(Buffer.from(digest).includes(Buffer.from(subject)), false);
});
