import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { SignJWT, generateKeyPair, type KeyLike } from "jose";

import { RetailerAssertionError, type ReplayIdentifier, type ReplayProtection } from "../../src/lib/retailer-identity/assertion";
import {
  RetailerSessionExchangeUnavailableError,
  exchangeRetailerAssertion,
  type RetailerPrincipalResolver,
} from "../../src/lib/retailer-identity/exchange-service";
import { verifyAppSession } from "../../src/lib/retailer-identity/session";

const NOW_SECONDS = 2_000_000_000;
const ISSUER = "https://identity.northstar.example";
const AUDIENCE = "measureonce-fit-passport";
const RETAILER_A = "3cbf7b5c-822f-4f8a-b957-b28198c24a22";
const RETAILER_B = "900c77b3-f20c-43cc-90bf-03168f6069f8";
const sessionSecret = randomBytes(32);
const digestSecret = randomBytes(32);

class MemoryReplayProtection implements ReplayProtection {
  private readonly consumed = new Set<string>();

  async consume(input: ReplayIdentifier): Promise<boolean> {
    const key = `${input.retailerId}:${input.issuer}:${input.assertionId}`;
    if (this.consumed.has(key)) return false;
    this.consumed.add(key);
    return true;
  }
}

class MemoryPrincipalResolver implements RetailerPrincipalResolver {
  readonly calls: Array<{ retailerId: string; issuer: string; subjectDigest: Uint8Array }> = [];
  private readonly principals = new Map<string, string>();
  private nextPrincipal = 1;

  async resolveOrCreate(input: { retailerId: string; issuer: string; subjectDigest: Uint8Array }): Promise<string> {
    this.calls.push(input);
    const key = `${input.retailerId}:${input.issuer}:${Buffer.from(input.subjectDigest).toString("hex")}`;
    const existing = this.principals.get(key);
    if (existing) return existing;
    const created = `principal_${String(this.nextPrincipal++).padStart(8, "0")}`;
    this.principals.set(key, created);
    return created;
  }
}

const keys = generateKeyPair("RS256");

async function signAssertion(input: {
  retailerId?: string;
  subject?: string;
  assertionId?: string;
  privateKey?: KeyLike;
}) {
  return new SignJWT({
    retailer_id: input.retailerId ?? RETAILER_A,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setSubject(input.subject ?? "cust_7f82a91d")
    .setJti(input.assertionId ?? "assertion-0001")
    .setNotBefore(NOW_SECONDS - 5)
    .setExpirationTime(NOW_SECONDS + 120)
    .sign(input.privateKey ?? (await keys).privateKey);
}

async function dependencies(
  principals: RetailerPrincipalResolver,
  overrides: { retailerId?: string; replayProtection?: ReplayProtection } = {},
) {
  return {
    config: {
      retailerId: overrides.retailerId ?? RETAILER_A,
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithm: "RS256",
      publicKey: (await keys).publicKey,
      subjectDigestSecret: digestSecret,
      sessionSecret,
      maximumAssertionLifetimeSeconds: 300,
      sessionTtlSeconds: 900,
    },
    replayProtection: overrides.replayProtection ?? new MemoryReplayProtection(),
    principals,
    now: () => new Date(NOW_SECONDS * 1000),
    newSessionId: () => "session_00000001",
  };
}

test("the same verified retailer subject resolves to the same principal on a fresh assertion", async () => {
  const principals = new MemoryPrincipalResolver();
  const serviceDependencies = await dependencies(principals);

  const first = await exchangeRetailerAssertion(
    await signAssertion({ assertionId: "assertion-0001" }),
    serviceDependencies,
  );
  const second = await exchangeRetailerAssertion(
    await signAssertion({ assertionId: "assertion-0002" }),
    serviceDependencies,
  );

  const firstSession = await verifyAppSession(first.value, {
    secret: sessionSecret,
    ttlSeconds: 900,
    expectedRetailerId: RETAILER_A,
    now: () => new Date(NOW_SECONDS * 1000),
  });
  const secondSession = await verifyAppSession(second.value, {
    secret: sessionSecret,
    ttlSeconds: 900,
    expectedRetailerId: RETAILER_A,
    now: () => new Date(NOW_SECONDS * 1000),
  });

  assert.equal(firstSession.principalId, secondSession.principalId);
  assert.equal(principals.calls.length, 2);
  assert.equal(Buffer.from(principals.calls[0].subjectDigest).toString("utf8").includes("cust_7f82a91d"), false);
});

test("different subjects and retailer tenants resolve to separate principals", async () => {
  const principals = new MemoryPrincipalResolver();
  const tenantA = await dependencies(principals, { retailerId: RETAILER_A });
  const tenantB = await dependencies(principals, { retailerId: RETAILER_B });

  const shopperA = await exchangeRetailerAssertion(
    await signAssertion({ subject: "cust_7f82a91d", assertionId: "assertion-0001" }),
    tenantA,
  );
  const shopperB = await exchangeRetailerAssertion(
    await signAssertion({ subject: "cust_6e11b20c", assertionId: "assertion-0002" }),
    tenantA,
  );
  const otherTenant = await exchangeRetailerAssertion(
    await signAssertion({ retailerId: RETAILER_B, subject: "cust_7f82a91d", assertionId: "assertion-0003" }),
    tenantB,
  );

  const principalIds = await Promise.all([
    verifyAppSession(shopperA.value, { secret: sessionSecret, ttlSeconds: 900, now: () => new Date(NOW_SECONDS * 1000) }),
    verifyAppSession(shopperB.value, { secret: sessionSecret, ttlSeconds: 900, now: () => new Date(NOW_SECONDS * 1000) }),
    verifyAppSession(otherTenant.value, { secret: sessionSecret, ttlSeconds: 900, now: () => new Date(NOW_SECONDS * 1000) }),
  ]);

  assert.equal(new Set(principalIds.map((item) => item.principalId)).size, 3);
});

test("a replayed assertion is rejected before a second identity mapping", async () => {
  const principals = new MemoryPrincipalResolver();
  const serviceDependencies = await dependencies(principals);
  const assertion = await signAssertion({ assertionId: "assertion-replayed" });

  await exchangeRetailerAssertion(assertion, serviceDependencies);

  await assert.rejects(
    exchangeRetailerAssertion(assertion, serviceDependencies),
    RetailerAssertionError,
  );
  assert.equal(principals.calls.length, 1);
});

test("an invalid signature is rejected before identity mapping", async () => {
  const principals = new MemoryPrincipalResolver();
  const attackerKeys = await generateKeyPair("RS256");

  await assert.rejects(
    exchangeRetailerAssertion(
      await signAssertion({ privateKey: attackerKeys.privateKey }),
      await dependencies(principals),
    ),
    RetailerAssertionError,
  );
  assert.equal(principals.calls.length, 0);
});

test("an identity mapping failure becomes a generic unavailable error", async () => {
  const principals: RetailerPrincipalResolver = {
    async resolveOrCreate() {
      throw new Error("database detail containing cust_7f82a91d");
    },
  };

  await assert.rejects(
    exchangeRetailerAssertion(await signAssertion({}), await dependencies(principals)),
    (error: unknown) => {
      assert.ok(error instanceof RetailerSessionExchangeUnavailableError);
      assert.equal(String(error).includes("cust_7f82a91d"), false);
      return true;
    },
  );
});
