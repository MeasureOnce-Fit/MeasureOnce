import assert from "node:assert/strict";
import test from "node:test";

import { describeSignupError } from "../../src/lib/identity/signup-error";

test("retains the specific password and rate-limit guidance", () => {
  assert.equal(describeSignupError({ code: "weak_password" }), "Choose a stronger password with at least 8 characters.");
  assert.equal(describeSignupError({ status: 429 }), "Too many attempts. Please wait a minute before trying again.");
});

test("explains when immediate prototype signup has not been enabled", () => {
  assert.equal(
    describeSignupError({ code: "email_not_confirmed" }),
    "Immediate prototype signup is not enabled yet. Turn off Confirm email in Supabase Authentication settings.",
  );
});
