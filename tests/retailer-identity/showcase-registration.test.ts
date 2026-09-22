import assert from "node:assert/strict";
import test from "node:test";
import { resolveShowcaseShopper, type ShowcaseRegistrationStore } from "../../src/lib/retailer-identity/showcase-registration";

function fixture(actorKind?: string, allowed = true) {
  let principal = actorKind ? { id: "existing", actorKind } : null;
  let inserts = 0;
  const store: ShowcaseRegistrationStore = {
    async findPrincipal() { return principal; },
    async publicShowcaseSignupAllowed() { return allowed; },
    async insertShopperIfAbsent() { inserts++; principal ??= { id: "new", actorKind: "shopper" }; },
  };
  return { store, inserts: () => inserts };
}

test("new showcase shoppers receive one stable mapping across retries", async () => {
  const f = fixture();
  assert.equal(await resolveShowcaseShopper(f.store), "new");
  assert.equal(await resolveShowcaseShopper(f.store), "new");
  assert.equal(f.inserts(), 1);
});

test("existing shoppers can still sign in when public signup is disabled", async () => {
  const f = fixture("shopper", false);
  assert.equal(await resolveShowcaseShopper(f.store), "existing");
  assert.equal(f.inserts(), 0);
});

test("operators cannot acquire shopper access or be overwritten", async () => {
  const f = fixture("operator");
  assert.equal(await resolveShowcaseShopper(f.store), null);
  assert.equal(f.inserts(), 0);
});

test("closed or non-showcase tenants cannot provision new shoppers", async () => {
  const f = fixture(undefined, false);
  assert.equal(await resolveShowcaseShopper(f.store), null);
  assert.equal(f.inserts(), 0);
});

test("a conflicting mapping remains unauthorized after an insert race", async () => {
  let reads = 0;
  const f = fixture();
  f.store.findPrincipal = async () => ++reads === 1 ? null : { id: "operator", actorKind: "operator" };
  assert.equal(await resolveShowcaseShopper(f.store), null);
});

test("database failures do not silently authorize a user", async () => {
  const f = fixture();
  f.store.insertShopperIfAbsent = async () => { throw new Error("unavailable"); };
  await assert.rejects(resolveShowcaseShopper(f.store), /unavailable/);
});
