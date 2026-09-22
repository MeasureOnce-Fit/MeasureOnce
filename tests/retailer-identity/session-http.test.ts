import assert from "node:assert/strict";
import test from "node:test";

import { RetailerAssertionError } from "../../src/lib/retailer-identity/assertion";
import { RetailerIdentityEnvironmentError } from "../../src/lib/retailer-identity/env";
import { createRetailerSessionHttpHandlers } from "../../src/lib/retailer-identity/session-http";
import { APP_SESSION_COOKIE_NAME, type AppSessionCookie } from "../../src/lib/retailer-identity/session";

const ASSERTION = "header.payload.signature";
const SESSION_COOKIE: AppSessionCookie = {
  name: APP_SESSION_COOKIE_NAME,
  value: "signed.session.value",
  options: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 900,
    expires: new Date("2033-05-18T03:48:20.000Z"),
  },
  setCookieHeader:
    "__Host-measureonce_session=signed.session.value; Path=/; Max-Age=900; Expires=Wed, 18 May 2033 03:48:20 GMT; HttpOnly; Secure; SameSite=Lax",
};

test("exchanges only an Authorization bearer assertion and sets the host-only session cookie", async () => {
  const received: string[] = [];
  const handlers = createRetailerSessionHttpHandlers({
    async exchange(assertion) {
      received.push(assertion);
      return SESSION_COOKIE;
    },
  });

  const response = await handlers.POST(
    new Request("https://shop.example/api/retailer/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${ASSERTION}` },
    }),
  );

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("set-cookie"), SESSION_COOKIE.setCookieHeader);
  assert.deepEqual(received, [ASSERTION]);
});

for (const badRequest of [
  {
    name: "missing Authorization header",
    request: () => new Request("https://shop.example/api/retailer/session", { method: "POST" }),
  },
  {
    name: "non-Bearer Authorization header",
    request: () =>
      new Request("https://shop.example/api/retailer/session", {
        method: "POST",
        headers: { Authorization: `Basic ${ASSERTION}` },
      }),
  },
  {
    name: "assertion supplied in the URL",
    request: () =>
      new Request(`https://shop.example/api/retailer/session?assertion=${ASSERTION}`, {
        method: "POST",
      }),
  },
  {
    name: "caller-supplied retailer and subject",
    request: () =>
      new Request("https://shop.example/api/retailer/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ASSERTION}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ retailerId: "attacker-retailer", subject: "attacker-subject" }),
      }),
  },
  {
    name: "caller-supplied retailer and subject query parameters",
    request: () =>
      new Request(
        "https://shop.example/api/retailer/session?retailer_id=attacker-retailer&subject=attacker-subject",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${ASSERTION}` },
        },
      ),
  },
  {
    name: "caller-supplied retailer and subject headers",
    request: () =>
      new Request("https://shop.example/api/retailer/session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ASSERTION}`,
          "X-Retailer-Id": "attacker-retailer",
          "X-Retailer-Subject": "attacker-subject",
        },
      }),
  },
] as const) {
  test(`returns a generic 401 for ${badRequest.name}`, async () => {
    let exchangeCalls = 0;
    const handlers = createRetailerSessionHttpHandlers({
      async exchange() {
        exchangeCalls += 1;
        return SESSION_COOKIE;
      },
    });

    const response = await handlers.POST(badRequest.request());

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: "Unauthorized." });
    assert.equal(exchangeCalls, 0);
  });
}

test("returns a generic 401 without assertion or subject details when verification fails", async () => {
  const handlers = createRetailerSessionHttpHandlers({
    async exchange() {
      throw new RetailerAssertionError();
    },
  });

  const response = await handlers.POST(
    new Request("https://shop.example/api/retailer/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${ASSERTION}` },
    }),
  );
  const body = await response.text();

  assert.equal(response.status, 401);
  assert.equal(body, JSON.stringify({ error: "Unauthorized." }));
  assert.equal(body.includes(ASSERTION), false);
  assert.equal(body.includes("retailer"), false);
  assert.equal(body.includes("subject"), false);
});

test("returns a generic 503 when retailer identity is unconfigured", async () => {
  const handlers = createRetailerSessionHttpHandlers({
    async exchange() {
      throw new RetailerIdentityEnvironmentError();
    },
  });

  const response = await handlers.POST(
    new Request("https://shop.example/api/retailer/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${ASSERTION}` },
    }),
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Service unavailable." });
});

test("logout clears the host-only application session cookie", async () => {
  const handlers = createRetailerSessionHttpHandlers({
    async exchange() {
      return SESSION_COOKIE;
    },
  });

  const response = await handlers.DELETE();

  assert.equal(response.status, 204);
  assert.equal(
    response.headers.get("set-cookie"),
    "__Host-measureonce_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax",
  );
});
