import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test from "node:test";

import { SignJWT, decodeJwt } from "jose";

import {
  APP_SESSION_COOKIE_NAME,
  AppSessionError,
  createAppSessionCookie,
  verifyAppSession,
  type AppSessionConfig,
} from "../../src/lib/retailer-identity/session";

const NOW_SECONDS = 2_000_000_000;
const RETAILER_ID = "northstar-outfitters";
const PRINCIPAL_ID = "principal_01HV7M3X9Z";
const SESSION_ID = "session_01HV7M4F2Q";
const RAW_RETAILER_SUBJECT = "cust_7f82a91d";
const sessionSecret = randomBytes(32);

function config(overrides: Partial<AppSessionConfig> = {}): AppSessionConfig {
  return {
    secret: sessionSecret,
    ttlSeconds: 900,
    now: () => new Date(NOW_SECONDS * 1000),
    ...overrides,
  };
}

test("creates a signed host-only application session cookie with secure attributes", async () => {
  const session = await createAppSessionCookie(
    { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: SESSION_ID },
    config(),
  );

  assert.equal(session.name, APP_SESSION_COOKIE_NAME);
  assert.deepEqual(session.options, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 900,
    expires: new Date((NOW_SECONDS + 900) * 1000),
  });
  assert.match(
    session.setCookieHeader,
    /^__Host-measureonce_session=[A-Za-z0-9_.-]+; Path=\/; Max-Age=900; Expires=.+ GMT; HttpOnly; Secure; SameSite=Lax$/,
  );
  assert.equal(session.setCookieHeader.includes("Domain="), false);
});

test("verifies the application session and derives the principal context", async () => {
  const issued = await createAppSessionCookie(
    { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: SESSION_ID },
    config(),
  );

  const verified = await verifyAppSession(issued.value, {
    ...config(),
    expectedRetailerId: RETAILER_ID,
  });

  assert.deepEqual(verified, {
    retailerId: RETAILER_ID,
    principalId: PRINCIPAL_ID,
    sessionId: SESSION_ID,
    expiresAt: NOW_SECONDS + 900,
  });
});

test("the application session payload contains no raw retailer subject or extra identity claims", async () => {
  const issued = await createAppSessionCookie(
    { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: SESSION_ID },
    config(),
  );

  const payload = decodeJwt(issued.value);

  assert.deepEqual(Object.keys(payload).sort(), ["exp", "principal_id", "retailer_id", "session_id"]);
  assert.equal(JSON.stringify(payload).includes(RAW_RETAILER_SUBJECT), false);
  assert.equal("sub" in payload, false);
  assert.equal("assertion" in payload, false);
});

test("rejects a tampered application session", async () => {
  const issued = await createAppSessionCookie(
    { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: SESSION_ID },
    config(),
  );
  const segments = issued.value.split(".");
  segments[1] = `${segments[1].slice(0, -1)}${segments[1].endsWith("A") ? "B" : "A"}`;

  await assert.rejects(
    verifyAppSession(segments.join("."), config()),
    AppSessionError,
  );
});

test("rejects an expired application session", async () => {
  const issued = await createAppSessionCookie(
    { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: SESSION_ID },
    config({ ttlSeconds: 1 }),
  );

  await assert.rejects(
    verifyAppSession(issued.value, config({ now: () => new Date((NOW_SECONDS + 2) * 1000) })),
    AppSessionError,
  );
});

test("rejects an application session for a different retailer", async () => {
  const issued = await createAppSessionCookie(
    { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: SESSION_ID },
    config(),
  );

  await assert.rejects(
    verifyAppSession(issued.value, { ...config(), expectedRetailerId: "other-retailer" }),
    AppSessionError,
  );
});

test("rejects a validly signed session containing an unapproved claim", async () => {
  const token = await new SignJWT({
    retailer_id: RETAILER_ID,
    principal_id: PRINCIPAL_ID,
    session_id: SESSION_ID,
    retailer_subject: RAW_RETAILER_SUBJECT,
    exp: NOW_SECONDS + 900,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .sign(sessionSecret);

  await assert.rejects(verifyAppSession(token, config()), AppSessionError);
});

test("rejects weak secrets and application-session lifetimes over one hour", async () => {
  await assert.rejects(
    createAppSessionCookie(
      { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: SESSION_ID },
      config({ secret: randomBytes(16) }),
    ),
    AppSessionError,
  );
  await assert.rejects(
    createAppSessionCookie(
      { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID, sessionId: SESSION_ID },
      config({ ttlSeconds: 3_601 }),
    ),
    AppSessionError,
  );
});
