import assert from "node:assert/strict";
import test from "node:test";

import {
  errorResponse,
  parseIdempotencyKey,
  safeRelativeRedirect,
} from "../../src/lib/identity/http";
import {
  ConsentRequiredError,
  ProfileNotFoundError,
  VersionConflictError,
} from "../../src/lib/identity/service";

test("safeRelativeRedirect accepts local paths and rejects external or protocol-relative URLs", () => {
  assert.equal(safeRelativeRedirect("/account?tab=profiles"), "/account?tab=profiles");
  assert.equal(safeRelativeRedirect("https://attacker.example"), "/account");
  assert.equal(safeRelativeRedirect("//attacker.example"), "/account");
  assert.equal(safeRelativeRedirect("account"), "/account");
  assert.equal(safeRelativeRedirect(null), "/account");
});

test("parseIdempotencyKey accepts bounded opaque keys", () => {
  assert.equal(parseIdempotencyKey("delete-profile-0001"), "delete-profile-0001");
  assert.throws(() => parseIdempotencyKey(null));
  assert.throws(() => parseIdempotencyKey("short"));
  assert.throws(() => parseIdempotencyKey("x".repeat(121)));
  assert.throws(() => parseIdempotencyKey("spaces are rejected"));
});

test("errorResponse maps domain failures without leaking internal details", async () => {
  const consent = errorResponse(new ConsentRequiredError());
  const missing = errorResponse(new ProfileNotFoundError());
  const conflict = errorResponse(new VersionConflictError());
  const unknown = errorResponse(new Error("database password leaked"));

  assert.equal(consent.status, 403);
  assert.equal(missing.status, 404);
  assert.equal(conflict.status, 409);
  assert.equal(unknown.status, 500);
  assert.deepEqual(await unknown.json(), {
    error: { code: "INTERNAL_ERROR", message: "The request could not be completed." },
  });
});
