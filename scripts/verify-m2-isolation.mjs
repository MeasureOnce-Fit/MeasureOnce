import { pathToFileURL } from "node:url";

import { buildSeedPlan } from "./seed-m2-identities.mjs";

export function inspectIsolationPlan(plan) {
  const retailerIds = new Set(plan.retailers.map((retailer) => retailer.id));
  const scenarios = plan.identities.map((identity) => ({
    fixtureId: identity.fixtureId,
    actorKind: identity.actorKind,
    email: identity.email,
    retailerId: identity.retailerId,
    expectedVisibleProfileCount:
      identity.actorKind === "shopper" ? identity.profiles.length : 0,
    expectedVisibleMembershipCount: identity.actorKind === "operator" ? 1 : 0,
    forbiddenRetailerIds: [...retailerIds].filter((id) => id !== identity.retailerId),
  }));
  const sharedSubjects = plan.identities.reduce((counts, identity) => {
    counts.set(identity.externalSubject, (counts.get(identity.externalSubject) ?? 0) + 1);
    return counts;
  }, new Map());

  return {
    valid:
      retailerIds.size === 2 &&
      scenarios.length === 6 &&
      [...sharedSubjects.values()].some((count) => count === 2),
    fixtureVersion: plan.fixtureVersion,
    scenarios,
  };
}

export function validateLiveVerificationEnvironment(environment = process.env) {
  if (environment.NODE_ENV === "production") {
    throw new Error("Synthetic M2 isolation verification is blocked in production.");
  }
  const supabaseUrl = environment.SUPABASE_URL?.trim();
  const publishableKey = (
    environment.SUPABASE_PUBLISHABLE_KEY ?? environment.SUPABASE_ANON_KEY
  )?.trim();
  const seedPassword = environment.M2_SEED_PASSWORD?.trim();
  if (!supabaseUrl || !publishableKey || !seedPassword) {
    throw new Error(
      "Live verification requires SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and M2_SEED_PASSWORD in the private environment. The legacy SUPABASE_ANON_KEY is accepted during migration.",
    );
  }
  return {
    supabaseUrl,
    publishableKey,
    seedPassword,
  };
}

export async function verifyLiveIsolation(environment = process.env) {
  const { createClient } = await import("@supabase/supabase-js");
  const { supabaseUrl, publishableKey, seedPassword } =
    validateLiveVerificationEnvironment(environment);
  const inspection = inspectIsolationPlan(buildSeedPlan());
  const results = [];

  for (const scenario of inspection.scenarios) {
    const client = createClient(supabaseUrl, publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email: scenario.email,
      password: seedPassword,
    });
    if (signInError) throw new Error(`${scenario.fixtureId} sign-in: ${signInError.message}`);

    const [profiles, principals, memberships] = await Promise.all([
      client.from("fit_profiles").select("id,retailer_id,owner_principal_id"),
      client.from("principals").select("id,retailer_id,actor_kind"),
      client.from("retailer_memberships").select("id,retailer_id,principal_id,role"),
    ]);
    for (const [label, response] of [
      ["profiles", profiles],
      ["principals", principals],
      ["memberships", memberships],
    ]) {
      if (response.error) {
        throw new Error(`${scenario.fixtureId} ${label}: ${response.error.message}`);
      }
    }

    const profileRows = profiles.data ?? [];
    const principalRows = principals.data ?? [];
    const membershipRows = memberships.data ?? [];
    const forbiddenTenantVisible = [...profileRows, ...principalRows, ...membershipRows].some(
      (row) => scenario.forbiddenRetailerIds.includes(row.retailer_id),
    );
    const passed =
      profileRows.length === scenario.expectedVisibleProfileCount &&
      principalRows.length === 1 &&
      membershipRows.length === scenario.expectedVisibleMembershipCount &&
      !forbiddenTenantVisible;

    results.push({
      fixtureId: scenario.fixtureId,
      passed,
      visibleProfileCount: profileRows.length,
      visiblePrincipalCount: principalRows.length,
      visibleMembershipCount: membershipRows.length,
      forbiddenTenantVisible,
    });
    await client.auth.signOut();
  }

  return {
    fixtureVersion: inspection.fixtureVersion,
    passed: results.every((result) => result.passed),
    results,
  };
}

async function runCli() {
  const live = process.argv.includes("--live");
  if (!live) {
    console.log(JSON.stringify(inspectIsolationPlan(buildSeedPlan()), null, 2));
    return;
  }

  const result = await verifyLiveIsolation();
  console.log(JSON.stringify({ mode: "live", ...result }, null, 2));
  if (!result.passed) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
