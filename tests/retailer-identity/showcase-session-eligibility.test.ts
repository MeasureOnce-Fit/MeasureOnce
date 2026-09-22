import assert from "node:assert/strict";
import test from "node:test";

import { isEligibleShowcaseSessionUser } from "../../src/lib/retailer-identity/showcase-session-eligibility";

test("accepts a non-anonymous prototype signup without an email-confirmation timestamp", () => {
  assert.equal(
    isEligibleShowcaseSessionUser({ id: "shopper-001", is_anonymous: false, email_confirmed_at: null }),
    true,
  );
});

test("continues to reject anonymous and missing sessions", () => {
  assert.equal(isEligibleShowcaseSessionUser(null), false);
  assert.equal(isEligibleShowcaseSessionUser({ id: "anonymous-001", is_anonymous: true, email_confirmed_at: null }), false);
});
