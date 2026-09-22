export type ProfileKind = "self" | "additional_member";
/** Catalog routing preference for this profile; intentionally not a gender identity field. */
export type CatalogCollection = "women" | "men" | "both";
export type MeasurementUnit = "cm" | "in";
export type MeasurementMethod = "body" | "known_garment";

export interface ProfileMeasurementDraft {
  region: string;
  value: number;
  unit: MeasurementUnit;
  method: MeasurementMethod;
  source: string;
}

export interface ProfilePreferenceDraft {
  category: string;
  dimension: string;
  preference: string;
}

export type FitAnchorDraft =
  | {
      evidenceKind: "exact_garment";
      brandId: string;
      productId: string;
      category: string;
      sizeLabel: string;
      observations: Record<string, string>;
    }
  | {
      evidenceKind: "category_size_reference";
      referenceId: string;
      referenceVersion: string;
      brandName: string;
      category: string;
      sizeLabel: string;
      observations: Record<string, string>;
    }
  | {
      evidenceKind: "remembered_size_context";
      brandName: string;
      category: string;
      sizeLabel: string;
      observations: Record<string, string>;
    };

export interface ProfileDraft {
  kind: ProfileKind;
  nickname: string;
  catalogCollection: CatalogCollection;
  ownerPermissionConfirmed: boolean;
  measurements: ProfileMeasurementDraft[];
  preferences: ProfilePreferenceDraft[];
  anchors: FitAnchorDraft[];
}

export interface ProfilePatch {
  nickname?: string;
  catalogCollection?: CatalogCollection;
  ownerPermissionConfirmed?: boolean;
  measurements?: ProfileMeasurementDraft[];
  preferences?: ProfilePreferenceDraft[];
  anchors?: FitAnchorDraft[];
}

export interface FitProfile extends ProfileDraft {
  id: string;
  retailerId: string;
  ownerId: string;
  status: "active";
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface PrincipalContext {
  principalId: string;
  retailerId: string;
}

export interface ConsentState {
  principalId: string;
  retailerId: string;
  purpose: "fit_profile_storage";
  granted: boolean;
  policyVersion: string;
  updatedAt: string;
}

export interface ConsentEvent extends ConsentState {
  id: string;
  action: "granted" | "withdrawn";
}

export interface RightsRequest {
  id: string;
  principalId: string;
  retailerId: string;
  type: "export" | "account_deletion";
  idempotencyKey: string;
  status: "requested" | "completed" | "failed";
  requestedAt: string;
  completedAt?: string;
}

export interface AccountDataSnapshot {
  profiles: FitProfile[];
  consentEvents: ConsentEvent[];
  rightsRequests: RightsRequest[];
}

export interface AccountExport {
  schemaVersion: "1.0";
  principalId: string;
  retailerId: string;
  profiles: FitProfile[];
  consentEvents: ConsentEvent[];
  rightsRequests: RightsRequest[];
}

export interface IdentityRepository {
  getConsentState(context: PrincipalContext): Promise<ConsentState | null>;
  recordConsent(
    context: PrincipalContext,
    input: { granted: boolean; policyVersion: string },
  ): Promise<ConsentState>;
  createProfile(context: PrincipalContext, draft: ProfileDraft): Promise<FitProfile>;
  getProfile(context: PrincipalContext, profileId: string): Promise<FitProfile | null>;
  updateProfile(
    context: PrincipalContext,
    profileId: string,
    expectedVersion: number,
    patch: ProfilePatch,
  ): Promise<FitProfile | null>;
  deleteProfile(context: PrincipalContext, profileId: string): Promise<boolean>;
  readAccountData(context: PrincipalContext): Promise<AccountDataSnapshot>;
  deleteOwnedApplicationData(
    context: PrincipalContext,
    idempotencyKey: string,
  ): Promise<void>;
}
