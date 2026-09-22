import type {
  AccountExport,
  ConsentState,
  FitProfile,
  IdentityRepository,
  PrincipalContext,
  ProfileDraft,
  ProfilePatch,
} from "./types";
import { getCategorySizeReferenceById } from "../fit/category-size-reference";
import { parseProfileDraft, parseProfilePatch } from "./validation";

export type IdentityErrorCode =
  | "CONSENT_REQUIRED"
  | "PROFILE_NOT_FOUND"
  | "VERSION_CONFLICT"
  | "REPOSITORY_BOUNDARY_VIOLATION";

export class IdentityDomainError extends Error {
  constructor(
    public readonly code: IdentityErrorCode,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConsentRequiredError extends IdentityDomainError {
  constructor() {
    super("CONSENT_REQUIRED", "Saving a Fit Profile requires active consent.");
  }
}

export class ProfileNotFoundError extends IdentityDomainError {
  constructor() {
    super("PROFILE_NOT_FOUND", "The Fit Profile was not found.");
  }
}

export class VersionConflictError extends IdentityDomainError {
  constructor() {
    super("VERSION_CONFLICT", "The Fit Profile changed after it was loaded.");
  }
}

export class RepositoryBoundaryError extends IdentityDomainError {
  constructor() {
    super(
      "REPOSITORY_BOUNDARY_VIOLATION",
      "The identity repository returned data outside the active security boundary.",
    );
  }
}

function belongsTo(context: PrincipalContext, profile: FitProfile): boolean {
  return profile.ownerId === context.principalId && profile.retailerId === context.retailerId;
}

function assertStoredProfile(context: PrincipalContext, profile: FitProfile): FitProfile {
  if (!belongsTo(context, profile)) throw new RepositoryBoundaryError();
  return profile;
}

function byId<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right);
}

function anchorSortKey(anchor: FitProfile["anchors"][number]): string {
  switch (anchor.evidenceKind) {
    case "exact_garment":
      return `${anchor.evidenceKind}\u0000${anchor.brandId}\u0000${anchor.productId}\u0000${anchor.sizeLabel}`;
    case "category_size_reference":
      return `${anchor.evidenceKind}\u0000${anchor.brandName}\u0000${anchor.referenceId}\u0000${anchor.sizeLabel}`;
    case "remembered_size_context":
      return `${anchor.evidenceKind}\u0000${anchor.brandName}\u0000${anchor.category}\u0000${anchor.sizeLabel}`;
  }
}

function assertVerifiedAnchorProvenance(anchor: FitProfile["anchors"][number]): void {
  if (anchor.evidenceKind !== "category_size_reference") return;
  const reference = getCategorySizeReferenceById(anchor.referenceId);
  if (
    !reference
    || reference.version !== anchor.referenceVersion
    || reference.brandName !== anchor.brandName
    || reference.category !== anchor.category
    || reference.sizeLabel !== anchor.sizeLabel
  ) {
    throw new TypeError("The category size reference does not match verified server data.");
  }
}

function assertVerifiedAnchorProvenanceForProfile(profile: ProfileDraft): void {
  profile.anchors.forEach(assertVerifiedAnchorProvenance);
}

function canonicalProfile(profile: FitProfile): FitProfile {
  return {
    ...profile,
    measurements: profile.measurements.slice().sort((left, right) =>
      compareText(
        `${left.region}\u0000${left.method}\u0000${left.unit}\u0000${left.value}\u0000${left.source}`,
        `${right.region}\u0000${right.method}\u0000${right.unit}\u0000${right.value}\u0000${right.source}`,
      ),
    ),
    preferences: profile.preferences.slice().sort((left, right) =>
      compareText(
        `${left.category}\u0000${left.dimension}\u0000${left.preference}`,
        `${right.category}\u0000${right.dimension}\u0000${right.preference}`,
      ),
    ),
    anchors: profile.anchors
      .map((anchor) => ({
        ...anchor,
        observations: Object.fromEntries(
          Object.entries(anchor.observations).sort(([left], [right]) => compareText(left, right)),
        ),
      }))
      .sort((left, right) =>
        compareText(anchorSortKey(left), anchorSortKey(right)),
      ),
  };
}

export function createIdentityService(repository: IdentityRepository) {
  async function requireConsent(activeContext: PrincipalContext): Promise<void> {
    const consent = await repository.getConsentState(activeContext);
    if (
      !consent ||
      !consent.granted ||
      consent.principalId !== activeContext.principalId ||
      consent.retailerId !== activeContext.retailerId
    ) {
      throw new ConsentRequiredError();
    }
  }

  return {
    async grantConsent(
      activeContext: PrincipalContext,
      policyVersion: string,
    ): Promise<ConsentState> {
      return repository.recordConsent(activeContext, { granted: true, policyVersion });
    },

    async withdrawConsent(
      activeContext: PrincipalContext,
      policyVersion: string,
    ): Promise<ConsentState> {
      return repository.recordConsent(activeContext, { granted: false, policyVersion });
    },

    async createProfile(
      activeContext: PrincipalContext,
      input: ProfileDraft,
    ): Promise<FitProfile> {
      await requireConsent(activeContext);
      const draft = parseProfileDraft(input);
      assertVerifiedAnchorProvenanceForProfile(draft);
      const created = await repository.createProfile(activeContext, draft);
      return assertStoredProfile(activeContext, created);
    },

    async updateProfile(
      activeContext: PrincipalContext,
      profileId: string,
      expectedVersion: number,
      input: ProfilePatch,
    ): Promise<FitProfile> {
      await requireConsent(activeContext);
      const patch = parseProfilePatch(input);
      const current = await repository.getProfile(activeContext, profileId);
      if (!current || !belongsTo(activeContext, current)) throw new ProfileNotFoundError();
      if (current.version !== expectedVersion) throw new VersionConflictError();

      const nextProfile = parseProfileDraft({
        kind: current.kind,
        nickname: patch.nickname ?? current.nickname,
        catalogCollection: patch.catalogCollection ?? current.catalogCollection,
        ownerPermissionConfirmed:
          patch.ownerPermissionConfirmed ?? current.ownerPermissionConfirmed,
        measurements: patch.measurements ?? current.measurements,
        preferences: patch.preferences ?? current.preferences,
        anchors: patch.anchors ?? current.anchors,
      });
      assertVerifiedAnchorProvenanceForProfile(nextProfile);

      const updated = await repository.updateProfile(
        activeContext,
        profileId,
        expectedVersion,
        patch,
      );
      if (!updated) throw new VersionConflictError();
      return assertStoredProfile(activeContext, updated);
    },

    async deleteProfile(activeContext: PrincipalContext, profileId: string): Promise<boolean> {
      const current = await repository.getProfile(activeContext, profileId);
      if (!current || !belongsTo(activeContext, current)) return false;
      return repository.deleteProfile(activeContext, profileId);
    },

    async exportAccount(activeContext: PrincipalContext): Promise<AccountExport> {
      const snapshot = await repository.readAccountData(activeContext);
      return {
        schemaVersion: "1.0",
        principalId: activeContext.principalId,
        retailerId: activeContext.retailerId,
        profiles: snapshot.profiles
          .filter((item) => belongsTo(activeContext, item))
          .map(canonicalProfile)
          .sort(byId),
        consentEvents: snapshot.consentEvents
          .filter(
            (event) =>
              event.principalId === activeContext.principalId &&
              event.retailerId === activeContext.retailerId,
          )
          .slice()
          .sort(byId),
        rightsRequests: snapshot.rightsRequests
          .filter(
            (request) =>
              request.principalId === activeContext.principalId &&
              request.retailerId === activeContext.retailerId,
          )
          .slice()
          .sort(byId),
      };
    },

    async deleteFitPassport(activeContext: PrincipalContext, idempotencyKey: string): Promise<void> {
      await repository.deleteOwnedApplicationData(activeContext, idempotencyKey);
    },
  };
}

export type IdentityService = ReturnType<typeof createIdentityService>;
