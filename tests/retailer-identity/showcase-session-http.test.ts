import assert from "node:assert/strict";
import test from "node:test";

import { createShowcaseSessionPostHandler } from "../../src/lib/retailer-identity/showcase-session-http";
import type { AppSessionCookie } from "../../src/lib/retailer-identity/session";

const RETAILER_ID = "20000000-0000-4000-8000-000000000001";
const PRINCIPAL_ID = "30000000-0000-4000-8000-000000000001";
const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_COOKIE: AppSessionCookie = {
  name: "__Host-measureonce_session",
  value: "signed-session",
  options: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 900,
    expires: new Date("2026-09-18T12:15:00Z"),
  },
  setCookieHeader: "__Host-measureonce_session=signed-session; Path=/; HttpOnly; Secure; SameSite=Lax",
};

function dependencies(overrides: Record<string, unknown> = {}) {
  return {
    async authenticate() { return USER_ID; },
    async loadConfig() {
      return {
        retailerId: RETAILER_ID,
        sessionSecret: new TextEncoder().encode("session-secret-with-at-least-32-bytes"),
        sessionTtlSeconds: 900,
      };
    },
    async resolvePrincipal() { return PRINCIPAL_ID; },
    async createSession() { return SESSION_COOKIE; },
    createSessionId: () => "session-showcase-0001",
    ...overrides,
  };
}

test("exchanges an authenticated showcase shopper for the protected application session", async () => {
  let resolved: unknown;
  let issued: unknown;
  const handler = createShowcaseSessionPostHandler(dependencies({
    async resolvePrincipal(input: unknown) {
      resolved = input;
      return PRINCIPAL_ID;
    },
    async createSession(identity: unknown, config: unknown) {
      issued = { identity, config };
      return SESSION_COOKIE;
    },
  }));

  const response = await handler(new Request("https://measureonce.example/api/showcase/session", { method: "POST" }));

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), SESSION_COOKIE.setCookieHeader);
  assert.deepEqual(resolved, { retailerId: RETAILER_ID, authUserId: USER_ID });
  assert.deepEqual(issued, {
    identity: { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: "session-showcase-0001" },
    config: {
      secret: new TextEncoder().encode("session-secret-with-at-least-32-bytes"),
      ttlSeconds: 900,
    },
  });
});

test("rejects a missing account session or missing shopper mapping", async () => {
  for (const override of [
    { authenticate: async () => null },
    { resolvePrincipal: async () => null },
  ]) {
    const response = await createShowcaseSessionPostHandler(dependencies(override))(
      new Request("https://measureonce.example/api/showcase/session", { method: "POST" }),
    );
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized." });
  }
});

test("rejects caller-supplied identity and request bodies", async () => {
  for (const request of [
    new Request("https://measureonce.example/api/showcase/session?principal=attacker", { method: "POST" }),
    new Request("https://measureonce.example/api/showcase/session", { method: "POST", headers: { "x-principal-id": PRINCIPAL_ID } }),
    new Request("https://measureonce.example/api/showcase/session", { method: "POST", body: "{}" }),
  ]) {
    const response = await createShowcaseSessionPostHandler(dependencies())(request);
    assert.equal(response.status, 401);
  }
});

test("maps configuration and persistence failures to a generic unavailable response", async () => {
  const response = await createShowcaseSessionPostHandler(dependencies({
    loadConfig: async () => { throw new Error("do not leak"); },
  }))(new Request("https://measureonce.example/api/showcase/session", { method: "POST" }));

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Service unavailable." });
});
