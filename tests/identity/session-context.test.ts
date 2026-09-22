import assert from "node:assert/strict";
import test from "node:test";

import {
  ProtectedSessionUnauthorizedError,
  derivePrincipalContext,
  loadProtectedSessionConfig,
} from "../../src/lib/identity/session-context";
import { createAppSessionCookie, verifyAppSession } from "../../src/lib/retailer-identity/session";

const SECRET = new TextEncoder().encode("session-secret-longer-than-thirty-two-bytes");
const RETAILER_ID = "retailer-0001";
const NOW = new Date("2033-05-18T03:33:20.000Z");

async function sessionCookie(
  overrides: Partial<{ retailerId: string; principalId: string; now: Date }> = {},
): Promise<string> {
  const session = await createAppSessionCookie(
    {
      retailerId: overrides.retailerId ?? RETAILER_ID,
      principalId: overrides.principalId ?? "principal-0001",
      sessionId: "session-0001",
    },
    {
      secret: SECRET,
      ttlSeconds: 900,
      now: () => overrides.now ?? NOW,
    },
  );
  return `${session.name}=${session.value}`;
}

function dependencies(now = NOW) {
  return {
    async loadConfig() {
      return {
        sessionSecret: SECRET,
        sessionTtlSeconds: 900,
        retailerId: RETAILER_ID,
      };
    },
    verifySession: verifyAppSession,
    now: () => now,
  };
}

test("derives the principal context only from a verified host-only application session", async () => {
  const request = new Request(
    "https://shop.example/api/profiles?principalId=attacker&retailerId=attacker",
    {
      headers: {
        Cookie: await sessionCookie(),
        "X-Principal-Id": "attacker-principal",
        "X-Retailer-Id": "attacker-retailer",
      },
    },
  );

  assert.deepEqual(await derivePrincipalContext(request, dependencies()), {
    principalId: "principal-0001",
    retailerId: RETAILER_ID,
  });
});

test("loads Fit Passport session verification without an assertion public key", async () => {
  const config = await loadProtectedSessionConfig({
    RETAILER_IDENTITY_RETAILER_ID: "20000000-0000-4000-8000-000000000001",
    RETAILER_IDENTITY_SESSION_SECRET: "session-secret-longer-than-thirty-two-bytes",
    RETAILER_IDENTITY_SESSION_TTL_SECONDS: "900",
    RETAILER_IDENTITY_PUBLIC_KEY_PEM: "not a PEM public key",
  });

  assert.equal(config.retailerId, "20000000-0000-4000-8000-000000000001");
  assert.equal(config.sessionTtlSeconds, 900);
  assert.equal(config.sessionSecret.byteLength >= 32, true);
});

test("rejects absent, tampered, expired, wrong-tenant, and duplicate session cookies", async (t) => {
  const validCookie = await sessionCookie();
  const expiredCookie = await sessionCookie({ now: new Date(NOW.getTime() - 1_800_000) });
  const wrongTenantCookie = await sessionCookie({ retailerId: "retailer-0002" });
  const cases = [
    ["absent", undefined],
    ["tampered", `${validCookie}x`],
    ["expired", expiredCookie],
    ["wrong tenant", wrongTenantCookie],
    ["duplicate", `${validCookie}; ${validCookie}`],
  ] as const;

  for (const [name, cookie] of cases) {
    await t.test(name, async () => {
      const headers = cookie ? { Cookie: cookie } : undefined;
      await assert.rejects(
        derivePrincipalContext(
          new Request("https://shop.example/api/profiles", { headers }),
          dependencies(),
        ),
        ProtectedSessionUnauthorizedError,
      );
    });
  }
});
