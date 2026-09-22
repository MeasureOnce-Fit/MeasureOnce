import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AccountDataSnapshot,
  ConsentEvent,
  ConsentState,
  FitAnchorDraft,
  FitProfile,
  IdentityRepository,
  PrincipalContext,
  ProfileDraft,
  ProfileMeasurementDraft,
  ProfilePatch,
  ProfilePreferenceDraft,
  RightsRequest,
} from "./types";

const PROFILE_COLUMNS =
  "id,retailer_id,owner_principal_id,profile_kind,nickname,catalog_collection,permission_confirmed_at,status,version,created_at,updated_at";
const MEASUREMENT_COLUMNS =
  "region,original_value,original_unit,normalized_cm,method,source";
const PREFERENCE_COLUMNS = "category,region,preference";
const ANCHOR_COLUMNS =
  "evidence_kind,brand_id,garment_id,reference_id,reference_version,brand_name,category,size_label,observations";
const CONSENT_COLUMNS =
  "id,retailer_id,owner_principal_id,purpose,action,policy_version,occurred_at";
const EXPORT_REQUEST_COLUMNS =
  "id,retailer_id,owner_principal_id,idempotency_key,status,requested_at,completed_at";
const DELETION_REQUEST_COLUMNS =
  "id,retailer_id,owner_principal_id,idempotency_key,target_kind,status,requested_at,completed_at";

type Row = Record<string, unknown>;

function text(row: Row, column: string): string {
  const value = row[column];
  if (typeof value !== "string") throw new Error(`Expected ${column} to be text.`);
  return value;
}

function optionalText(row: Row, column: string): string | undefined {
  const value = row[column];
  if (value === null || value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`Expected ${column} to be nullable text.`);
  return value;
}

function number(row: Row, column: string): number {
  const value = row[column];
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Expected ${column} to be numeric.`);
  return parsed;
}

function rows(value: unknown): Row[] {
  if (!Array.isArray(value)) throw new Error("Expected a row collection from Supabase.");
  return value as Row[];
}

function row(value: unknown): Row {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected one row from Supabase.");
  }
  return value as Row;
}

function observations(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}

function databaseMethod(method: ProfileMeasurementDraft["method"]): string {
  return method === "body" ? "body_measurement" : "known_garment";
}

function domainMethod(method: string): ProfileMeasurementDraft["method"] {
  if (method === "body_measurement") return "body";
  if (method === "known_garment") return "known_garment";
  throw new Error(`Unsupported measurement method: ${method}`);
}

function mapMeasurement(
  databaseRow: Row,
): ProfileMeasurementDraft & { normalizedCm: number } {
  const unit = text(databaseRow, "original_unit");
  if (unit !== "cm" && unit !== "in") throw new Error(`Unsupported measurement unit: ${unit}`);
  return {
    region: text(databaseRow, "region"),
    value: number(databaseRow, "original_value"),
    unit,
    normalizedCm: number(databaseRow, "normalized_cm"),
    method: domainMethod(text(databaseRow, "method")),
    source: text(databaseRow, "source"),
  };
}

function mapPreference(databaseRow: Row): ProfilePreferenceDraft {
  return {
    category: text(databaseRow, "category"),
    // The database calls the fitted body/garment dimension `region`; the
    // domain contract calls the same value `dimension`.
    dimension: text(databaseRow, "region"),
    preference: text(databaseRow, "preference"),
  };
}

function mapAnchor(databaseRow: Row): FitAnchorDraft {
  const evidenceKind = optionalText(databaseRow, "evidence_kind") ?? "exact_garment";
  const shared = {
    category: text(databaseRow, "category"),
    sizeLabel: text(databaseRow, "size_label"),
    observations: observations(databaseRow.observations),
  };

  switch (evidenceKind) {
    case "exact_garment":
      return {
        evidenceKind,
        brandId: text(databaseRow, "brand_id"),
        productId: text(databaseRow, "garment_id"),
        ...shared,
      };
    case "category_size_reference":
      return {
        evidenceKind,
        referenceId: text(databaseRow, "reference_id"),
        referenceVersion: text(databaseRow, "reference_version"),
        brandName: text(databaseRow, "brand_name"),
        ...shared,
      };
    case "remembered_size_context":
      return {
        evidenceKind,
        brandName: text(databaseRow, "brand_name"),
        ...shared,
      };
    default:
      throw new Error(`Unsupported anchor evidence kind: ${evidenceKind}`);
  }
}

function mapConsent(databaseRow: Row): ConsentEvent {
  const action = text(databaseRow, "action");
  if (action !== "granted" && action !== "withdrawn") {
    throw new Error(`Unsupported consent action: ${action}`);
  }
  return {
    id: text(databaseRow, "id"),
    principalId: text(databaseRow, "owner_principal_id"),
    retailerId: text(databaseRow, "retailer_id"),
    purpose: "fit_profile_storage",
    granted: action === "granted",
    action,
    policyVersion: text(databaseRow, "policy_version"),
    updatedAt: text(databaseRow, "occurred_at"),
  };
}

function consentState(event: ConsentEvent): ConsentState {
  return {
    principalId: event.principalId,
    retailerId: event.retailerId,
    purpose: event.purpose,
    granted: event.granted,
    policyVersion: event.policyVersion,
    updatedAt: event.updatedAt,
  };
}

function requestStatus(value: string): RightsRequest["status"] {
  if (value === "completed" || value === "failed") return value;
  return "requested";
}

function mapRightsRequest(databaseRow: Row, type: RightsRequest["type"]): RightsRequest {
  return {
    id: text(databaseRow, "id"),
    principalId: text(databaseRow, "owner_principal_id"),
    retailerId: text(databaseRow, "retailer_id"),
    type,
    idempotencyKey: text(databaseRow, "idempotency_key"),
    status: requestStatus(text(databaseRow, "status")),
    requestedAt: text(databaseRow, "requested_at"),
    completedAt: optionalText(databaseRow, "completed_at"),
  };
}

function measurementSnapshot(item: ProfileMeasurementDraft) {
  return {
    region: item.region,
    original_value: item.value,
    original_unit: item.unit,
    method: databaseMethod(item.method),
    source: item.source,
  };
}

function preferenceSnapshot(item: ProfilePreferenceDraft) {
  return {
    category: item.category,
    // See mapPreference: database `region` is domain `dimension`.
    region: item.dimension,
    preference: item.preference,
  };
}

function anchorSnapshot(item: FitAnchorDraft) {
  const shared = {
    evidence_kind: item.evidenceKind,
    category: item.category,
    size_label: item.sizeLabel,
    observations: item.observations,
  };

  switch (item.evidenceKind) {
    case "exact_garment":
      return { ...shared, brand_id: item.brandId, garment_id: item.productId };
    case "category_size_reference":
      return {
        ...shared,
        reference_id: item.referenceId,
        reference_version: item.referenceVersion,
        brand_name: item.brandName,
      };
    case "remembered_size_context":
      return { ...shared, brand_name: item.brandName };
  }
}

function permissionConfirmedAt(
  kind: ProfileDraft["kind"],
  confirmed: boolean,
): string | null {
  return kind === "additional_member" && confirmed ? new Date().toISOString() : null;
}

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  return typeof error.code === "string" ? error.code : undefined;
}

function rpcTableRow(value: unknown, operation: string): Row {
  const resultRows = rows(value);
  if (resultRows.length !== 1) {
    throw new Error(`Expected one result row from ${operation}.`);
  }
  return resultRows[0];
}

export class SupabaseIdentityRepository implements IdentityRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly adminClient?: SupabaseClient,
  ) {}

  private async requireAdmin(): Promise<SupabaseClient> {
    if (!this.adminClient) throw new Error("A server-only Supabase admin client is required.");
    return this.adminClient;
  }

  private async hydrateProfile(profileRow: Row): Promise<FitProfile> {
    const id = text(profileRow, "id");
    const retailerId = text(profileRow, "retailer_id");
    const [measurementResult, preferenceResult, anchorResult] = await Promise.all([
      this.client
        .from("profile_measurements")
        .select(MEASUREMENT_COLUMNS)
        .eq("retailer_id", retailerId)
        .eq("profile_id", id),
      this.client
        .from("profile_preferences")
        .select(PREFERENCE_COLUMNS)
        .eq("retailer_id", retailerId)
        .eq("profile_id", id),
      this.client
        .from("fit_anchors")
        .select(ANCHOR_COLUMNS)
        .eq("retailer_id", retailerId)
        .eq("profile_id", id),
    ]);
    if (measurementResult.error) throw measurementResult.error;
    if (preferenceResult.error) throw preferenceResult.error;
    if (anchorResult.error) throw anchorResult.error;

    const kind = text(profileRow, "profile_kind");
    if (kind !== "self" && kind !== "additional_member") {
      throw new Error(`Unsupported profile kind: ${kind}`);
    }
    const catalogCollection = text(profileRow, "catalog_collection");
    if (catalogCollection !== "women" && catalogCollection !== "men" && catalogCollection !== "both") {
      throw new Error(`Unsupported catalog collection: ${catalogCollection}`);
    }

    return {
      id,
      retailerId,
      ownerId: text(profileRow, "owner_principal_id"),
      kind,
      nickname: text(profileRow, "nickname"),
      catalogCollection,
      ownerPermissionConfirmed: profileRow.permission_confirmed_at !== null,
      status: "active",
      version: number(profileRow, "version"),
      createdAt: text(profileRow, "created_at"),
      updatedAt: text(profileRow, "updated_at"),
      measurements: rows(measurementResult.data).map(mapMeasurement),
      preferences: rows(preferenceResult.data).map(mapPreference),
      anchors: rows(anchorResult.data).map(mapAnchor),
    };
  }

  async getConsentState(context: PrincipalContext): Promise<ConsentState | null> {
    const result = await this.client
      .from("consent_events")
      .select(CONSENT_COLUMNS)
      .eq("retailer_id", context.retailerId)
      .eq("owner_principal_id", context.principalId)
      .eq("purpose", "fit_profile_storage")
      .order("occurred_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return null;
    return consentState(mapConsent(row(result.data)));
  }

  async recordConsent(
    context: PrincipalContext,
    input: { granted: boolean; policyVersion: string },
  ): Promise<ConsentState> {
    const result = await this.client
      .from("consent_events")
      .insert({
        retailer_id: context.retailerId,
        owner_principal_id: context.principalId,
        profile_id: null,
        purpose: "fit_profile_storage",
        action: input.granted ? "granted" : "withdrawn",
        policy_version: input.policyVersion,
      })
      .select(CONSENT_COLUMNS)
      .single();
    if (result.error) throw result.error;
    return consentState(mapConsent(row(result.data)));
  }

  async createProfile(context: PrincipalContext, draft: ProfileDraft): Promise<FitProfile> {
    const admin = await this.requireAdmin();
    const result = await admin.schema("private").rpc("create_fit_profile_snapshot", {
      p_retailer_id: context.retailerId,
      p_owner_principal_id: context.principalId,
      p_profile_kind: draft.kind,
      p_nickname: draft.nickname,
      p_catalog_collection: draft.catalogCollection,
      p_permission_confirmed_at: permissionConfirmedAt(
        draft.kind,
        draft.ownerPermissionConfirmed,
      ),
      p_status: "active",
      p_measurements: draft.measurements.map(measurementSnapshot),
      p_preferences: draft.preferences.map(preferenceSnapshot),
      p_anchors: draft.anchors.map(anchorSnapshot),
    });
    if (result.error) throw result.error;
    const rpcRow = rpcTableRow(result.data, "create_fit_profile_snapshot");
    const profileId = text(rpcRow, "created_profile_id");
    number(rpcRow, "new_version");

    const created = await this.getProfile(context, profileId);
    if (!created) throw new Error("The created Fit Profile could not be loaded.");
    return created;
  }

  async getProfile(context: PrincipalContext, profileId: string): Promise<FitProfile | null> {
    const result = await this.client
      .from("fit_profiles")
      .select(PROFILE_COLUMNS)
      .eq("retailer_id", context.retailerId)
      .eq("owner_principal_id", context.principalId)
      .eq("status", "active")
      .eq("id", profileId)
      .maybeSingle();
    if (result.error) throw result.error;
    return result.data ? this.hydrateProfile(row(result.data)) : null;
  }

  async updateProfile(
    context: PrincipalContext,
    profileId: string,
    expectedVersion: number,
    patch: ProfilePatch,
  ): Promise<FitProfile | null> {
    const current = await this.getProfile(context, profileId);
    if (!current || current.version !== expectedVersion) return null;
    const ownerPermissionConfirmed =
      patch.ownerPermissionConfirmed ?? current.ownerPermissionConfirmed;
    const admin = await this.requireAdmin();
    const result = await admin.schema("private").rpc("replace_fit_profile_snapshot", {
      p_retailer_id: context.retailerId,
      p_owner_principal_id: context.principalId,
      p_profile_id: profileId,
      p_expected_version: expectedVersion,
      p_nickname: patch.nickname ?? current.nickname,
      p_catalog_collection: patch.catalogCollection ?? current.catalogCollection,
      p_permission_confirmed_at: permissionConfirmedAt(
        current.kind,
        ownerPermissionConfirmed,
      ),
      p_status: current.status,
      p_measurements: (patch.measurements ?? current.measurements).map(measurementSnapshot),
      p_preferences: (patch.preferences ?? current.preferences).map(preferenceSnapshot),
      p_anchors: (patch.anchors ?? current.anchors).map(anchorSnapshot),
    });
    if (result.error) {
      const code = databaseErrorCode(result.error);
      if (code === "40001" || code === "P0002") return null;
      throw result.error;
    }
    const rpcRow = rpcTableRow(result.data, "replace_fit_profile_snapshot");
    if (text(rpcRow, "replaced_profile_id") !== profileId) {
      throw new Error("The replaced Fit Profile identifier did not match the request.");
    }
    number(rpcRow, "new_version");
    return this.getProfile(context, profileId);
  }

  async deleteProfile(context: PrincipalContext, profileId: string): Promise<boolean> {
    const result = await this.client
      .from("fit_profiles")
      .delete()
      .eq("retailer_id", context.retailerId)
      .eq("owner_principal_id", context.principalId)
      .eq("id", profileId)
      .select("id");
    if (result.error) throw result.error;
    return rows(result.data).length > 0;
  }

  async readAccountData(context: PrincipalContext): Promise<AccountDataSnapshot> {
    const [profilesResult, consentResult, exportResult, deletionResult] = await Promise.all([
      this.client
        .from("fit_profiles")
        .select(PROFILE_COLUMNS)
        .eq("retailer_id", context.retailerId)
        .eq("owner_principal_id", context.principalId)
        .eq("status", "active"),
      this.client
        .from("consent_events")
        .select(CONSENT_COLUMNS)
        .eq("retailer_id", context.retailerId)
        .eq("owner_principal_id", context.principalId),
      this.client
        .from("export_requests")
        .select(EXPORT_REQUEST_COLUMNS)
        .eq("retailer_id", context.retailerId)
        .eq("owner_principal_id", context.principalId),
      this.client
        .from("deletion_requests")
        .select(DELETION_REQUEST_COLUMNS)
        .eq("retailer_id", context.retailerId)
        .eq("owner_principal_id", context.principalId)
        .eq("target_kind", "account"),
    ]);
    if (profilesResult.error) throw profilesResult.error;
    if (consentResult.error) throw consentResult.error;
    if (exportResult.error) throw exportResult.error;
    if (deletionResult.error) throw deletionResult.error;

    return {
      profiles: await Promise.all(rows(profilesResult.data).map((item) => this.hydrateProfile(item))),
      consentEvents: rows(consentResult.data).map(mapConsent),
      rightsRequests: [
        ...rows(exportResult.data).map((item) => mapRightsRequest(item, "export")),
        ...rows(deletionResult.data).map((item) => mapRightsRequest(item, "account_deletion")),
      ],
    };
  }

  async deleteOwnedApplicationData(
    context: PrincipalContext,
    idempotencyKey: string,
  ): Promise<void> {
    const admin = await this.requireAdmin();
    const result = await admin.schema("private").rpc("delete_retailer_fit_passport", {
      p_retailer_id: context.retailerId,
      p_owner_principal_id: context.principalId,
      p_receipt_id: idempotencyKey,
    });
    if (result.error) throw result.error;
    if (result.data !== idempotencyKey) {
      throw new Error("The Fit Passport deletion receipt did not match the request.");
    }
  }

}

export function createSupabaseIdentityRepository(
  client: SupabaseClient,
  adminClient?: SupabaseClient,
): IdentityRepository {
  return new SupabaseIdentityRepository(client, adminClient);
}
