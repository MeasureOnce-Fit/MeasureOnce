import { pathToFileURL } from "node:url";

const FIXTURE_TIMESTAMP = "2026-09-18T12:00:00.000Z";

const RETAILERS = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    slug: "northstar-department-store",
    displayName: "Northstar Department Store",
    tenantKind: "showcase",
    publicSignup: true,
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    slug: "harbor-and-main",
    displayName: "Harbor & Main",
    tenantKind: "partner",
    publicSignup: false,
  },
];

const IDENTITIES = [
  {
    fixtureId: "shopper-a1",
    principalId: "30000000-0000-4000-8000-000000000001",
    retailerId: RETAILERS[0].id,
    actorKind: "shopper",
    externalSubject: "synthetic-shared-shopper-001",
    email: "shopper.a1@measureonce.example",
    profiles: [
      {
        id: "40000000-0000-4000-8000-000000000001",
        kind: "self",
        nickname: "My fit",
        permissionConfirmedAt: null,
      },
      {
        id: "40000000-0000-4000-8000-000000000002",
        kind: "additional_member",
        nickname: "Alex",
        permissionConfirmedAt: FIXTURE_TIMESTAMP,
      },
      {
        id: "40000000-0000-4000-8000-000000000003",
        kind: "additional_member",
        nickname: "Morgan",
        permissionConfirmedAt: FIXTURE_TIMESTAMP,
      },
    ],
  },
  {
    fixtureId: "shopper-a2",
    principalId: "30000000-0000-4000-8000-000000000002",
    retailerId: RETAILERS[0].id,
    actorKind: "shopper",
    externalSubject: "synthetic-northstar-shopper-002",
    email: "shopper.a2@measureonce.example",
    profiles: [
      {
        id: "40000000-0000-4000-8000-000000000004",
        kind: "self",
        nickname: "My fit",
        permissionConfirmedAt: null,
      },
    ],
  },
  {
    fixtureId: "operator-a",
    principalId: "30000000-0000-4000-8000-000000000005",
    membershipId: "50000000-0000-4000-8000-000000000001",
    retailerId: RETAILERS[0].id,
    actorKind: "operator",
    externalSubject: "synthetic-northstar-operator-001",
    email: "operator.a@measureonce.example",
    profiles: [],
  },
  {
    fixtureId: "shopper-b1",
    principalId: "30000000-0000-4000-8000-000000000003",
    retailerId: RETAILERS[1].id,
    actorKind: "shopper",
    externalSubject: "synthetic-shared-shopper-001",
    email: "shopper.b1@measureonce.example",
    profiles: [
      {
        id: "40000000-0000-4000-8000-000000000005",
        kind: "self",
        nickname: "My fit",
        permissionConfirmedAt: null,
      },
    ],
  },
  {
    fixtureId: "shopper-b2",
    principalId: "30000000-0000-4000-8000-000000000004",
    retailerId: RETAILERS[1].id,
    actorKind: "shopper",
    externalSubject: "synthetic-harbor-shopper-002",
    email: "shopper.b2@measureonce.example",
    profiles: [
      {
        id: "40000000-0000-4000-8000-000000000006",
        kind: "self",
        nickname: "My fit",
        permissionConfirmedAt: null,
      },
    ],
  },
  {
    fixtureId: "operator-b",
    principalId: "30000000-0000-4000-8000-000000000006",
    membershipId: "50000000-0000-4000-8000-000000000002",
    retailerId: RETAILERS[1].id,
    actorKind: "operator",
    externalSubject: "synthetic-harbor-operator-001",
    email: "operator.b@measureonce.example",
    profiles: [],
  },
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function buildSeedPlan() {
  return clone({
    fixtureVersion: "m2-identity-1.0.0",
    generatedDataOnly: true,
    retailers: RETAILERS,
    identities: IDENTITIES,
  });
}

export function validateLiveSeedEnvironment(environment = process.env) {
  if (environment.NODE_ENV === "production") {
    throw new Error("Synthetic M2 identity seeding is blocked in production.");
  }

  const supabaseUrl = environment.SUPABASE_URL?.trim();
  const secretKey = (
    environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();
  const seedPassword = environment.M2_SEED_PASSWORD?.trim();
  const missing = [supabaseUrl, secretKey, seedPassword].filter((value) => !value);
  if (missing.length > 0) {
    throw new Error(
      "Live seeding requires SUPABASE_URL, SUPABASE_SECRET_KEY, and M2_SEED_PASSWORD in the private environment. The legacy SUPABASE_SERVICE_ROLE_KEY is accepted during migration.",
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey: secretKey,
    seedPassword,
  };
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const user = data.users.find((candidate) => candidate.email === email);
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  throw new Error(`Could not finish scanning synthetic users for ${email}.`);
}

async function ensureAuthUser(admin, identity, seedPassword) {
  const existing = await findUserByEmail(admin, identity.email);
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password: seedPassword,
      email_confirm: true,
      app_metadata: {
        ...existing.app_metadata,
        synthetic_fixture: true,
        fixture_id: identity.fixtureId,
      },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: identity.email,
    password: seedPassword,
    email_confirm: true,
    app_metadata: {
      synthetic_fixture: true,
      fixture_id: identity.fixtureId,
    },
  });
  if (error) throw error;
  return data.user;
}

async function assertSuccess(operation, result) {
  if (result.error) {
    throw new Error(`${operation}: ${result.error.message}`);
  }
  return result.data;
}

export async function provisionSeedPlan(environment = process.env) {
  const { createClient } = await import("@supabase/supabase-js");
  const { supabaseUrl, serviceRoleKey, seedPassword } =
    validateLiveSeedEnvironment(environment);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const plan = buildSeedPlan();

  await assertSuccess(
    "upsert retailers",
    await admin.from("retailers").upsert(
      plan.retailers.map((retailer) => ({
        id: retailer.id,
        slug: retailer.slug,
        display_name: retailer.displayName,
        tenant_kind: retailer.tenantKind,
        public_signup: retailer.publicSignup,
      })),
      { onConflict: "id" },
    ),
  );

  for (const identity of plan.identities) {
    const authUser = await ensureAuthUser(admin, identity, seedPassword);
    await assertSuccess(
      `upsert principal ${identity.fixtureId}`,
      await admin.from("principals").upsert(
        {
          id: identity.principalId,
          retailer_id: identity.retailerId,
          auth_user_id: authUser.id,
          actor_kind: identity.actorKind,
        },
        { onConflict: "id" },
      ),
    );

    if (identity.actorKind === "operator") {
      await assertSuccess(
        `upsert membership ${identity.fixtureId}`,
        await admin.from("retailer_memberships").upsert(
          {
            id: identity.membershipId,
            retailer_id: identity.retailerId,
            principal_id: identity.principalId,
            role: "retailer_admin",
            active: true,
          },
          { onConflict: "id" },
        ),
      );
      continue;
    }

    const { data: existingConsent, error: consentReadError } = await admin
      .from("consent_events")
      .select("id")
      .eq("retailer_id", identity.retailerId)
      .eq("owner_principal_id", identity.principalId)
      .eq("purpose", "fit_profile_storage")
      .eq("action", "granted")
      .eq("policy_version", plan.fixtureVersion)
      .limit(1);
    if (consentReadError) throw consentReadError;
    if (existingConsent.length === 0) {
      await assertSuccess(
        `grant fixture consent ${identity.fixtureId}`,
        await admin.from("consent_events").insert({
          retailer_id: identity.retailerId,
          owner_principal_id: identity.principalId,
          purpose: "fit_profile_storage",
          action: "granted",
          policy_version: plan.fixtureVersion,
          occurred_at: FIXTURE_TIMESTAMP,
        }),
      );
    }

    const profileIds = identity.profiles.map((profile) => profile.id);
    const { data: existingProfiles, error: profileReadError } = await admin
      .from("fit_profiles")
      .select("id")
      .in("id", profileIds);
    if (profileReadError) throw profileReadError;
    const existingProfileIds = new Set(existingProfiles.map((profile) => profile.id));
    const missingProfiles = identity.profiles.filter(
      (profile) => !existingProfileIds.has(profile.id),
    );
    if (missingProfiles.length > 0) {
      await assertSuccess(
        `insert profiles ${identity.fixtureId}`,
        await admin.from("fit_profiles").insert(
          missingProfiles.map((profile) => ({
            id: profile.id,
            retailer_id: identity.retailerId,
            owner_principal_id: identity.principalId,
            profile_kind: profile.kind,
            nickname: profile.nickname,
            permission_confirmed_at: profile.permissionConfirmedAt,
            status: "active",
          })),
        ),
      );
    }
  }

  return {
    fixtureVersion: plan.fixtureVersion,
    retailerCount: plan.retailers.length,
    identityCount: plan.identities.length,
    profileCount: plan.identities.flatMap((identity) => identity.profiles).length,
  };
}

async function runCli() {
  const live = process.argv.includes("--live");
  if (!live) {
    console.log(JSON.stringify(buildSeedPlan(), null, 2));
    return;
  }

  const result = await provisionSeedPlan();
  console.log(JSON.stringify({ mode: "live", ...result }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
