import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { SignJWT, generateKeyPair, type JWTPayload, type KeyLike } from "jose";

import {
  RetailerAssertionError,
  verifyRetailerAssertion,
  type ReplayProtection,
  type RetailerAssertionVerifierConfig,
} from "../../src/lib/retailer-identity/assertion";

const NOW_SECONDS = 2_000_000_000;
const ISSUER = "https://identity.northstar.example";
const AUDIENCE = "measureonce-fit-passport";
const RETAILER_ID = "northstar-outfitters";
const SUBJECT = "cust_7f82a91d";
const ASSERTION_ID = "assertion-0001";

const keys = generateKeyPair("RS256");

class MemoryReplayProtection implements ReplayProtection {
  private readonly consumed = new Set<string>();

  async consume(input: { issuer: string; retailerId: string; assertionId: string; expiresAt: number }): Promise<boolean> {
    const key = `${input.issuer}:${input.retailerId}:${input.assertionId}`;
    if (this.consumed.has(key)) return false;
    this.consumed.add(key);
    return true;
  }
}

function validPayload(overrides: Partial<JWTPayload & { retailer_id: unknown }> = {}) {
  return {
    iss: ISSUER,
    aud: AUDIENCE,
    sub: SUBJECT,
    exp: NOW_SECONDS + 120,
    nbf: NOW_SECONDS - 5,
    jti: ASSERTION_ID,
    retailer_id: RETAILER_ID,
    ...overrides,
  };
}

async function sign(
  payload: Record<string, unknown>,
  privateKey?: KeyLike,
): Promise<string> {
  const signingKey = privateKey ?? (await keys).privateKey;
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .sign(signingKey);
}

async function config(
  overrides: Partial<RetailerAssertionVerifierConfig> = {},
): Promise<RetailerAssertionVerifierConfig> {
  return {
    publicKey: (await keys).publicKey,
    algorithm: "RS256",
    issuer: ISSUER,
    audience: AUDIENCE,
    retailerId: RETAILER_ID,
    maximumLifetimeSeconds: 300,
    now: () => new Date(NOW_SECONDS * 1000),
    replayProtection: new MemoryReplayProtection(),
    ...overrides,
  };
}

test("a valid retailer assertion returns only verified identity claims", async () => {
  const assertion = await sign(validPayload());

  const identity = await verifyRetailerAssertion(assertion, await config());

  assert.deepEqual(identity, {
    issuer: ISSUER,
    subject: SUBJECT,
    retailerId: RETAILER_ID,
    assertionId: ASSERTION_ID,
    expiresAt: NOW_SECONDS + 120,
  });
  assert.equal(JSON.stringify(identity).includes(assertion), false);
});

test("an assertion signed by an untrusted key is rejected without echoing it", async () => {
  const attackerKeys = await generateKeyPair("RS256");
  const assertion = await sign(validPayload(), attackerKeys.privateKey);

  await assert.rejects(
    verifyRetailerAssertion(assertion, await config()),
    (error: unknown) => {
      assert.ok(error instanceof RetailerAssertionError);
      const assertionError = error as RetailerAssertionError;
      assert.equal(assertionError.message, "Retailer assertion rejected.");
      assert.equal(String(error).includes(assertion), false);
      assert.equal(String(error).includes(SUBJECT), false);
      return true;
    },
  );
});

test("a tampered retailer assertion is rejected", async () => {
  const assertion = await sign(validPayload());
  const segments = assertion.split(".");
  segments[1] = `${segments[1].slice(0, -1)}${segments[1].endsWith("A") ? "B" : "A"}`;

  await assert.rejects(
    verifyRetailerAssertion(segments.join("."), await config()),
    RetailerAssertionError,
  );
});

test("a symmetric JWT is rejected even when the configured key could verify it", async () => {
  const sharedSecret = randomBytes(32);
  const assertion = await new SignJWT(validPayload())
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(sharedSecret);

  await assert.rejects(
    verifyRetailerAssertion(
      assertion,
      await config({
        algorithm: "HS256",
        publicKey: sharedSecret as unknown as KeyLike,
      }),
    ),
    RetailerAssertionError,
  );
});

for (const invalidCase of [
  { name: "missing issuer", claims: { iss: undefined } },
  { name: "wrong issuer", claims: { iss: "https://attacker.example" } },
  { name: "missing audience", claims: { aud: undefined } },
  { name: "wrong audience", claims: { aud: "another-service" } },
  { name: "missing expiry", claims: { exp: undefined } },
  { name: "expired", claims: { exp: NOW_SECONDS - 1 } },
  { name: "missing not-before", claims: { nbf: undefined } },
  { name: "not active yet", claims: { nbf: NOW_SECONDS + 1 } },
  { name: "missing replay identifier", claims: { jti: undefined } },
  { name: "blank replay identifier", claims: { jti: "" } },
  { name: "missing retailer", claims: { retailer_id: undefined } },
  { name: "wrong retailer", claims: { retailer_id: "other-retailer" } },
  { name: "missing subject", claims: { sub: undefined } },
  { name: "blank subject", claims: { sub: "" } },
  { name: "non-opaque email subject", claims: { sub: "shopper@example.com" } },
  { name: "excessive assertion lifetime", claims: { exp: NOW_SECONDS + 301 } },
] as const) {
  test(`rejects an assertion with ${invalidCase.name}`, async () => {
    const assertion = await sign(validPayload(invalidCase.claims));

    await assert.rejects(
      verifyRetailerAssertion(assertion, await config()),
      RetailerAssertionError,
    );
  });
}

test("the replay protector atomically rejects a reused assertion identifier", async () => {
  const replayProtection = new MemoryReplayProtection();
  const verifierConfig = await config({ replayProtection });
  const assertion = await sign(validPayload());

  await verifyRetailerAssertion(assertion, verifierConfig);

  await assert.rejects(
    verifyRetailerAssertion(assertion, verifierConfig),
    RetailerAssertionError,
  );
});

test("a replay-protection failure rejects the assertion", async () => {
  const replayProtection: ReplayProtection = {
    async consume() {
      throw new Error("replay store unavailable");
    },
  };
  const assertion = await sign(validPayload());

  await assert.rejects(
    verifyRetailerAssertion(assertion, await config({ replayProtection })),
    RetailerAssertionError,
  );
});
