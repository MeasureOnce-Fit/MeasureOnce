import assert from "node:assert/strict";
import Module, { createRequire } from "node:module";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PrincipalContext, ProfileDraft } from "../../src/lib/identity/types";

type DatabaseResult = { data: unknown; error: unknown };

type RepositoryModule = typeof import("../../src/lib/identity/supabase-repository");

const nodeModule = Module as unknown as {
  _load(request: string, parent: unknown, isMain: boolean): unknown;
};
const originalLoad = nodeModule._load;
nodeModule._load = function loadForServerOnlyTest(request, parent, isMain) {
  if (request === "server-only") return {};
  return originalLoad.call(this, request, parent, isMain);
};
const { SupabaseIdentityRepository } = createRequire(__filename)(
  "../../src/lib/identity/supabase-repository",
) as RepositoryModule;
nodeModule._load = originalLoad;

const RETAILER_ID = "3cbf7b5c-822f-4f8a-b957-b28198c24a22";
const PRINCIPAL_ID = "1904694d-491e-42d5-b2e6-1948ec2b1da6";
const PROFILE_ID = "f28721b2-213d-4dc0-bb94-ac89b6ea3d65";
const RECEIPT_ID = "84adf281-0a7d-4e20-a015-e4a9364b511e";
const context: PrincipalContext = { retailerId: RETAILER_ID, principalId: PRINCIPAL_ID };

interface RecordedRpc {
  schema: string;
  functionName: string;
  arguments: Record<string, unknown>;
}

class RecordingQuery {
  constructor(
    private readonly client: RecordingSupabaseClient,
    private readonly table: string,
  ) {}

  select(columns: string) {
    this.client.operations.push({ table: this.table, operation: "select", value: columns });
    return this;
  }

  eq(column: string, value: unknown) {
    this.client.operations.push({ table: this.table, operation: "eq", value: { column, value } });
    return this;
  }

  order(column: string, options: unknown) {
    this.client.operations.push({ table: this.table, operation: "order", value: { column, options } });
    return this;
  }

  limit(value: number) {
    this.client.operations.push({ table: this.table, operation: "limit", value });
    return this;
  }

  insert(value: unknown) {
    this.client.operations.push({ table: this.table, operation: "insert", value });
    return this;
  }

  update(value: unknown) {
    this.client.operations.push({ table: this.table, operation: "update", value });
    return this;
  }

  delete() {
    this.client.operations.push({ table: this.table, operation: "delete" });
    return this;
  }

  upsert(value: unknown, options: unknown) {
    this.client.operations.push({ table: this.table, operation: "upsert", value: { value, options } });
    return this;
  }

  maybeSingle(): Promise<DatabaseResult> {
    return Promise.resolve(this.client.takeTableResult(this.table));
  }

  single(): Promise<DatabaseResult> {
    return Promise.resolve(this.client.takeTableResult(this.table));
  }

  then<TResult1 = DatabaseResult, TResult2 = never>(
    onfulfilled?: ((value: DatabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.client.takeTableResult(this.table)).then(onfulfilled, onrejected);
  }
}

class RecordingSupabaseClient {
  readonly operations: Array<{ table: string; operation: string; value?: unknown }> = [];
  readonly rpcCalls: RecordedRpc[] = [];
  deleteUserCalls = 0;
  readonly auth = {
    admin: {
      deleteUser: async () => {
        this.deleteUserCalls += 1;
        return { data: null, error: null };
      },
    },
  };

  private readonly tableResults = new Map<string, DatabaseResult[]>();
  private readonly rpcResults: DatabaseResult[] = [];

  enqueueTable(table: string, ...results: DatabaseResult[]) {
    this.tableResults.set(table, [...(this.tableResults.get(table) ?? []), ...results]);
  }

  enqueueRpc(...results: DatabaseResult[]) {
    this.rpcResults.push(...results);
  }

  takeTableResult(table: string): DatabaseResult {
    return this.tableResults.get(table)?.shift() ?? {
      data: null,
      error: new Error(`Missing fake result for ${table}.`),
    };
  }

  from(table: string) {
    return new RecordingQuery(this, table);
  }

  schema(schema: string) {
    return {
      rpc: async (functionName: string, args: Record<string, unknown>) => {
        this.rpcCalls.push({ schema, functionName, arguments: args });
        return this.rpcResults.shift() ?? {
          data: null,
          error: new Error(`Missing fake result for ${schema}.${functionName}.`),
        };
      },
    };
  }
}

const initialDraft: ProfileDraft = {
  kind: "self",
  nickname: "My fit",
  catalogCollection: "both",
  ownerPermissionConfirmed: false,
  measurements: [
    {
      region: "chest_bust",
      value: 31.5,
      unit: "in",
      method: "known_garment",
      source: "shopper_entered",
    },
  ],
  preferences: [{ category: "tops", dimension: "chest_bust", preference: "relaxed" }],
  anchors: [
    {
      evidenceKind: "exact_garment",
      brandId: "brand-a",
      productId: "shirt-a",
      category: "tops",
      sizeLabel: "S",
      observations: { chest_bust: "just_right" },
    },
  ],
};

function profileRow(version: number, nickname = "My fit") {
  return {
    id: PROFILE_ID,
    retailer_id: RETAILER_ID,
    owner_principal_id: PRINCIPAL_ID,
    profile_kind: "self",
    nickname,
    catalog_collection: "both",
    permission_confirmed_at: null,
    status: "active",
    version,
    created_at: "2026-09-18T12:00:00.000Z",
    updated_at: version === 1 ? "2026-09-18T12:00:00.000Z" : "2026-09-18T12:05:00.000Z",
  };
}

function measurementRow(value = 31.5) {
  return {
    region: "chest_bust",
    original_value: value,
    original_unit: "in",
    normalized_cm: value === 31.5 ? 80.01 : 83.82,
    method: "known_garment",
    source: "shopper_entered",
  };
}

function preferenceRow(preference = "relaxed") {
  return { category: "tops", region: "chest_bust", preference };
}

function anchorRow(sizeLabel = "S") {
  return {
    brand_id: "brand-a",
    garment_id: "shirt-a",
    category: "tops",
    size_label: sizeLabel,
    observations: { chest_bust: "just_right" },
  };
}

function enqueueProfileSnapshot(
  client: RecordingSupabaseClient,
  input: { version: number; nickname?: string; measurement?: number; preference?: string; sizeLabel?: string },
) {
  client.enqueueTable("fit_profiles", { data: profileRow(input.version, input.nickname), error: null });
  client.enqueueTable("profile_measurements", {
    data: [measurementRow(input.measurement)],
    error: null,
  });
  client.enqueueTable("profile_preferences", {
    data: [preferenceRow(input.preference)],
    error: null,
  });
  client.enqueueTable("fit_anchors", { data: [anchorRow(input.sizeLabel)], error: null });
}

function asSupabase(client: RecordingSupabaseClient): SupabaseClient {
  return client as unknown as SupabaseClient;
}

function mutationOperations(client: RecordingSupabaseClient) {
  return client.operations.filter(({ operation }) =>
    ["insert", "update", "delete", "upsert"].includes(operation),
  );
}

test("createProfile creates the complete snapshot with one private service-role RPC", async () => {
  const publicClient = new RecordingSupabaseClient();
  const serviceRoleClient = new RecordingSupabaseClient();
  serviceRoleClient.enqueueRpc({
    data: [{ created_profile_id: PROFILE_ID, new_version: 1 }],
    error: null,
  });
  enqueueProfileSnapshot(publicClient, { version: 1 });
  const repository = new SupabaseIdentityRepository(
    asSupabase(publicClient),
    asSupabase(serviceRoleClient),
  );

  const created = await repository.createProfile(context, initialDraft);

  assert.equal(created.id, PROFILE_ID);
  assert.equal(
    (created.measurements[0] as typeof created.measurements[number] & { normalizedCm: number })
      .normalizedCm,
    80.01,
  );
  assert.deepEqual(serviceRoleClient.rpcCalls, [
    {
      schema: "private",
      functionName: "create_fit_profile_snapshot",
      arguments: {
        p_retailer_id: RETAILER_ID,
        p_owner_principal_id: PRINCIPAL_ID,
        p_profile_kind: "self",
        p_nickname: "My fit",
        p_catalog_collection: "both",
        p_permission_confirmed_at: null,
        p_status: "active",
        p_measurements: [
          {
            region: "chest_bust",
            original_value: 31.5,
            original_unit: "in",
            method: "known_garment",
            source: "shopper_entered",
          },
        ],
        p_preferences: [{ category: "tops", region: "chest_bust", preference: "relaxed" }],
        p_anchors: [
          {
            evidence_kind: "exact_garment",
            brand_id: "brand-a",
            garment_id: "shirt-a",
            category: "tops",
            size_label: "S",
            observations: { chest_bust: "just_right" },
          },
        ],
      },
    },
  ]);
  assert.deepEqual(mutationOperations(publicClient), []);
  assert.deepEqual(mutationOperations(serviceRoleClient), []);
});

test("getProfile maps legacy rows and every evidence kind without inventing provenance", async () => {
  const publicClient = new RecordingSupabaseClient();
  publicClient.enqueueTable("fit_profiles", { data: profileRow(1), error: null });
  publicClient.enqueueTable("profile_measurements", { data: [], error: null });
  publicClient.enqueueTable("profile_preferences", { data: [], error: null });
  publicClient.enqueueTable("fit_anchors", {
    data: [
      anchorRow(),
      {
        evidence_kind: "category_size_reference",
        brand_id: null,
        garment_id: null,
        reference_id: "formline-jackets-8",
        reference_version: "2026-09-20",
        brand_name: "Orivelle",
        category: "Jackets",
        size_label: "8",
        observations: { chest_bust: "just_right" },
      },
      {
        evidence_kind: "remembered_size_context",
        brand_id: null,
        garment_id: null,
        reference_id: null,
        reference_version: null,
        brand_name: "Outside Label",
        category: "Jackets",
        size_label: "M",
        observations: { chest_bust: "just_right" },
      },
    ],
    error: null,
  });
  const repository = new SupabaseIdentityRepository(asSupabase(publicClient));

  const loaded = await repository.getProfile(context, PROFILE_ID);

  assert.deepEqual(loaded?.anchors, [
    {
      evidenceKind: "exact_garment",
      brandId: "brand-a",
      productId: "shirt-a",
      category: "tops",
      sizeLabel: "S",
      observations: { chest_bust: "just_right" },
    },
    {
      evidenceKind: "category_size_reference",
      referenceId: "formline-jackets-8",
      referenceVersion: "2026-09-20",
      brandName: "Orivelle",
      category: "Jackets",
      sizeLabel: "8",
      observations: { chest_bust: "just_right" },
    },
    {
      evidenceKind: "remembered_size_context",
      brandName: "Outside Label",
      category: "Jackets",
      sizeLabel: "M",
      observations: { chest_bust: "just_right" },
    },
  ]);
});

test("createProfile serializes only the selected anchor provenance fields", async () => {
  const publicClient = new RecordingSupabaseClient();
  const serviceRoleClient = new RecordingSupabaseClient();
  serviceRoleClient.enqueueRpc({
    data: [{ created_profile_id: PROFILE_ID, new_version: 1 }],
    error: null,
  });
  enqueueProfileSnapshot(publicClient, { version: 1 });
  const repository = new SupabaseIdentityRepository(
    asSupabase(publicClient),
    asSupabase(serviceRoleClient),
  );

  await repository.createProfile(context, {
    ...initialDraft,
    anchors: [
      {
        evidenceKind: "category_size_reference",
        referenceId: "formline-jackets-8",
        referenceVersion: "2026-09-20",
        brandName: "Orivelle",
        category: "Jackets",
        sizeLabel: "8",
        observations: {},
      },
      {
        evidenceKind: "remembered_size_context",
        brandName: "Outside Label",
        category: "Jackets",
        sizeLabel: "M",
        observations: {},
      },
    ],
  });

  assert.deepEqual(serviceRoleClient.rpcCalls[0]?.arguments.p_anchors, [
    {
      evidence_kind: "category_size_reference",
      reference_id: "formline-jackets-8",
      reference_version: "2026-09-20",
      brand_name: "Orivelle",
      category: "Jackets",
      size_label: "8",
      observations: {},
    },
    {
      evidence_kind: "remembered_size_context",
      brand_name: "Outside Label",
      category: "Jackets",
      size_label: "M",
      observations: {},
    },
  ]);
});

test("updateProfile replaces the complete snapshot atomically and preserves categorized anchors", async () => {
  const publicClient = new RecordingSupabaseClient();
  const serviceRoleClient = new RecordingSupabaseClient();
  enqueueProfileSnapshot(publicClient, { version: 1 });
  enqueueProfileSnapshot(publicClient, {
    version: 2,
    nickname: "Updated fit",
    measurement: 33,
    preference: "balanced",
    sizeLabel: "M",
  });
  serviceRoleClient.enqueueRpc({
    data: [{ replaced_profile_id: PROFILE_ID, new_version: 2 }],
    error: null,
  });
  const repository = new SupabaseIdentityRepository(
    asSupabase(publicClient),
    asSupabase(serviceRoleClient),
  );

  const updated = await repository.updateProfile(context, PROFILE_ID, 1, {
    nickname: "Updated fit",
    measurements: [
      {
        region: "chest_bust",
        value: 33,
        unit: "in",
        method: "known_garment",
        source: "shopper_entered",
      },
    ],
    preferences: [{ category: "tops", dimension: "chest_bust", preference: "balanced" }],
    anchors: [
      {
        evidenceKind: "exact_garment",
        brandId: "brand-a",
        productId: "shirt-a",
        category: "tops",
        sizeLabel: "M",
        observations: { chest_bust: "just_right" },
      },
    ],
  });

  assert.equal(updated?.version, 2);
  assert.deepEqual(serviceRoleClient.rpcCalls, [
    {
      schema: "private",
      functionName: "replace_fit_profile_snapshot",
      arguments: {
        p_retailer_id: RETAILER_ID,
        p_owner_principal_id: PRINCIPAL_ID,
        p_profile_id: PROFILE_ID,
        p_expected_version: 1,
        p_nickname: "Updated fit",
        p_catalog_collection: "both",
        p_permission_confirmed_at: null,
        p_status: "active",
        p_measurements: [
          {
            region: "chest_bust",
            original_value: 33,
            original_unit: "in",
            method: "known_garment",
            source: "shopper_entered",
          },
        ],
        p_preferences: [{ category: "tops", region: "chest_bust", preference: "balanced" }],
        p_anchors: [
          {
            evidence_kind: "exact_garment",
            brand_id: "brand-a",
            garment_id: "shirt-a",
            category: "tops",
            size_label: "M",
            observations: { chest_bust: "just_right" },
          },
        ],
      },
    },
  ]);
  assert.deepEqual(mutationOperations(publicClient), []);
  assert.deepEqual(mutationOperations(serviceRoleClient), []);
});

test("updateProfile returns null when the atomic RPC detects a stale version", async () => {
  const publicClient = new RecordingSupabaseClient();
  const serviceRoleClient = new RecordingSupabaseClient();
  enqueueProfileSnapshot(publicClient, { version: 1 });
  serviceRoleClient.enqueueRpc({
    data: null,
    error: { code: "40001", message: "fit profile version conflict" },
  });
  const repository = new SupabaseIdentityRepository(
    asSupabase(publicClient),
    asSupabase(serviceRoleClient),
  );

  const updated = await repository.updateProfile(context, PROFILE_ID, 1, {
    nickname: "Changed concurrently",
  });

  assert.equal(updated, null);
  assert.equal(serviceRoleClient.rpcCalls.length, 1);
  assert.deepEqual(mutationOperations(publicClient), []);
});

test("deleteOwnedApplicationData deletes only the retailer Fit Passport through the private RPC", async () => {
  const publicClient = new RecordingSupabaseClient();
  const serviceRoleClient = new RecordingSupabaseClient();
  serviceRoleClient.enqueueRpc({ data: RECEIPT_ID, error: null });
  const repository = new SupabaseIdentityRepository(
    asSupabase(publicClient),
    asSupabase(serviceRoleClient),
  );

  await repository.deleteOwnedApplicationData(context, RECEIPT_ID);

  assert.deepEqual(serviceRoleClient.rpcCalls, [
    {
      schema: "private",
      functionName: "delete_retailer_fit_passport",
      arguments: {
        p_retailer_id: RETAILER_ID,
        p_owner_principal_id: PRINCIPAL_ID,
        p_receipt_id: RECEIPT_ID,
      },
    },
  ]);
  assert.equal(publicClient.deleteUserCalls, 0);
  assert.equal(serviceRoleClient.deleteUserCalls, 0);
  assert.deepEqual(mutationOperations(publicClient), []);
  assert.deepEqual(mutationOperations(serviceRoleClient), []);
});
