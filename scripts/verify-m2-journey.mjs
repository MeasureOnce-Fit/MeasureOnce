import assert from "node:assert/strict";

import { createServerClient } from "@supabase/ssr";

const baseUrl = process.env.M2_APP_URL?.trim() || "http://127.0.0.1:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const password = process.env.M2_SEED_PASSWORD?.trim();

assert.ok(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL is required.");
assert.ok(publishableKey, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required.");
assert.ok(password, "M2_SEED_PASSWORD is required.");

function cookieHeader(cookies) {
  return [...cookies.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function retailerSession(email) {
  const cookies = new Map();
  const supabase = createServerClient(supabaseUrl, publishableKey, {
    cookies: {
      getAll: () => [...cookies.entries()].map(([name, value]) => ({ name, value })),
      setAll: (nextCookies) => {
        for (const { name, value } of nextCookies) cookies.set(name, value);
      },
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  assert.equal(error, null, `Synthetic retailer login failed for ${email}.`);

  const response = await fetch(`${baseUrl}/api/showcase/session`, {
    method: "POST",
    headers: { Cookie: cookieHeader(cookies) },
  });
  assert.equal(response.status, 204, `Session exchange returned ${response.status}.`);

  const appCookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(
    appCookie?.startsWith("__Host-measureonce_session="),
    "Application session cookie missing.",
  );
  return appCookie;
}

async function jsonRequest(cookie, path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Cookie: cookie,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

async function profileNames(cookie) {
  const { response, body } = await jsonRequest(cookie, "/api/profiles");
  assert.equal(response.status, 200, `Profile list returned ${response.status}.`);
  return body.profiles.map((profile) => profile.nickname).sort();
}

const shopperA1 = await retailerSession("shopper.a1@measureonce.example");
assert.deepEqual(await profileNames(shopperA1), ["Alex", "Morgan", "My fit"]);

const shopperA2 = await retailerSession("shopper.a2@measureonce.example");
assert.deepEqual(await profileNames(shopperA2), ["My fit"]);

const consent = await jsonRequest(shopperA2, "/api/consent", {
  method: "PUT",
  body: JSON.stringify({ granted: true, policyVersion: "2026-09-18" }),
});
assert.equal(consent.response.status, 200, `Consent grant returned ${consent.response.status}.`);

const created = await jsonRequest(shopperA2, "/api/profiles", {
  method: "POST",
  body: JSON.stringify({
    kind: "additional_member",
    nickname: "Journey check",
    ownerPermissionConfirmed: true,
    measurements: [],
    preferences: [],
    anchors: [],
  }),
});
assert.equal(created.response.status, 201, `Profile create returned ${created.response.status}.`);
const temporary = created.body.profile;

const updated = await jsonRequest(shopperA2, `/api/profiles/${temporary.id}`, {
  method: "PATCH",
  body: JSON.stringify({
    expectedVersion: temporary.version,
    patch: { nickname: "Journey verified" },
  }),
});
assert.equal(updated.response.status, 200, `Profile update returned ${updated.response.status}.`);
assert.equal(updated.body.profile.nickname, "Journey verified");

const measured = await jsonRequest(shopperA2, `/api/profiles/${temporary.id}`, {
  method: "PATCH",
  body: JSON.stringify({
    expectedVersion: updated.body.profile.version,
    patch: {
      measurements: [
        { region: "chest_bust", value: 87.4, unit: "cm", method: "body", source: "Synthetic journey fixture" },
        { region: "waist", value: 70.82, unit: "cm", method: "body", source: "Synthetic journey fixture" },
        { region: "hip_seat", value: 96.04, unit: "cm", method: "body", source: "Synthetic journey fixture" },
      ],
    },
  }),
});
assert.equal(measured.response.status, 200, `Measurement update returned ${measured.response.status}.`);

const savedRecommendation = await jsonRequest(shopperA2, "/api/fit/saved-profile", {
  method: "POST",
  body: JSON.stringify({
    targetProductId: "mo-women-001",
    preference: "regular",
    profileId: temporary.id,
  }),
});
assert.equal(savedRecommendation.response.status, 200, `Saved-profile recommendation returned ${savedRecommendation.response.status}.`);
assert.equal(savedRecommendation.body.result.state, "RECOMMENDED");
assert.equal(savedRecommendation.body.result.recommendedSizeLabel, "8/10");

const exported = await jsonRequest(shopperA2, "/api/account/export");
assert.equal(exported.response.status, 200, `Account export returned ${exported.response.status}.`);
assert.deepEqual(
  exported.body.profiles.map((profile) => profile.nickname).sort(),
  ["Journey verified", "My fit"],
);

const removed = await jsonRequest(shopperA2, `/api/profiles/${temporary.id}`, {
  method: "DELETE",
  headers: { "Idempotency-Key": `journey-${temporary.id}` },
});
assert.equal(removed.response.status, 204, `Profile delete returned ${removed.response.status}.`);
assert.deepEqual(await profileNames(shopperA2), ["My fit"]);
assert.deepEqual(await profileNames(shopperA1), ["Alex", "Morgan", "My fit"]);

console.log(
  JSON.stringify(
    {
      passed: true,
      journeys: {
        shopperA1Profiles: 3,
        shopperA2ProfilesBefore: 1,
        temporaryProfileLifecycle: ["created", "updated", "exported", "deleted"],
        savedProfileRecommendation: savedRecommendation.body.result.recommendedSizeLabel,
        crossAccountIsolation: true,
      },
    },
    null,
    2,
  ),
);
