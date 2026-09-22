import assert from "node:assert/strict";
import test from "node:test";

import { postAuthenticationDestination } from "../../src/lib/identity/account-destination";

test("returns Home after authentication regardless of a fit passport return query", () => {
  assert.equal(postAuthenticationDestination(null), "/");
  assert.equal(postAuthenticationDestination("/fit-passport"), "/");
  assert.equal(postAuthenticationDestination("https://attacker.example"), "/");
});
