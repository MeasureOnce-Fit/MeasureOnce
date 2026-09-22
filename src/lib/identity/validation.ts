import { z } from "zod";

import type { ProfileDraft, ProfilePatch } from "./types";

const nicknameSchema = z.string().trim().min(1).max(40);
const labelSchema = z.string().trim().min(1).max(100);

const measurementSchema = z.strictObject({
  region: labelSchema,
  value: z.number().finite().positive(),
  unit: z.enum(["cm", "in"]),
  method: z.enum(["body", "known_garment"]),
  source: labelSchema,
});

const preferenceSchema = z.strictObject({
  category: labelSchema,
  dimension: labelSchema,
  preference: labelSchema,
});

const anchorFields = {
  category: labelSchema,
  sizeLabel: labelSchema,
  observations: z.record(z.string(), z.string()),
};

const anchorSchema = z.discriminatedUnion("evidenceKind", [
  z.strictObject({
    evidenceKind: z.literal("exact_garment"),
    brandId: labelSchema,
    productId: labelSchema,
    ...anchorFields,
  }),
  z.strictObject({
    evidenceKind: z.literal("category_size_reference"),
    referenceId: labelSchema,
    referenceVersion: labelSchema,
    brandName: labelSchema,
    ...anchorFields,
  }),
  z.strictObject({
    evidenceKind: z.literal("remembered_size_context"),
    brandName: labelSchema,
    ...anchorFields,
  }),
]);

const profileFields = {
  nickname: nicknameSchema,
  catalogCollection: z.enum(["women", "men", "both"]),
  ownerPermissionConfirmed: z.boolean(),
  measurements: z.array(measurementSchema).max(100),
  preferences: z.array(preferenceSchema).max(100),
  anchors: z.array(anchorSchema).max(50),
};

const profileDraftSchema = z
  .strictObject({
    kind: z.enum(["self", "additional_member"]),
    ...profileFields,
  })
  .superRefine((profile, context) => {
    if (profile.kind === "additional_member" && !profile.ownerPermissionConfirmed) {
      context.addIssue({
        code: "custom",
        path: ["ownerPermissionConfirmed"],
        message: "Permission is required for an additional member profile.",
      });
    }
  });

const profilePatchSchema = z
  .strictObject({
    nickname: profileFields.nickname.optional(),
    catalogCollection: profileFields.catalogCollection.optional(),
    ownerPermissionConfirmed: profileFields.ownerPermissionConfirmed.optional(),
    measurements: profileFields.measurements.optional(),
    preferences: profileFields.preferences.optional(),
    anchors: profileFields.anchors.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, {
    message: "At least one profile field must be provided.",
  });

export function parseProfileDraft(input: unknown): ProfileDraft {
  return profileDraftSchema.parse(input) as ProfileDraft;
}

export function parseProfilePatch(input: unknown): ProfilePatch {
  return profilePatchSchema.parse(input) as ProfilePatch;
}
