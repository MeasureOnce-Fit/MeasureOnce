import { z, ZodError } from "zod";

import {
  ConsentRequiredError,
  ProfileNotFoundError,
  VersionConflictError,
  type IdentityService,
} from "./service";
import {
  ProtectedSessionUnauthorizedError,
  ProtectedSessionUnavailableError,
} from "./session-context";
import type { PrincipalContext } from "./types";
import { parseIdempotencyKey } from "./http";
import { parseProfileDraft, parseProfilePatch } from "./validation";

export interface ProtectedIdentityHttpDependencies {
  authenticate(request: Request): Promise<PrincipalContext>;
  createService(): IdentityService;
  policyVersion: string;
}

export interface ProfileRouteContext {
  params: Promise<{ profileId: string }>;
}

const profilePatchRequestSchema = z.strictObject({
  expectedVersion: z.number().int().positive(),
  patch: z.unknown(),
});

const PROFILE_ID = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,199}$/;

function json(body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}

function error(status: number, message: string): Response {
  return json({ error: message }, { status });
}

function profileId(value: unknown): string {
  if (typeof value !== "string" || !PROFILE_ID.test(value)) {
    throw new ProfileNotFoundError();
  }
  return value;
}

async function requireEmptyBody(request: Request): Promise<void> {
  if ((await request.text()).length > 0) throw new TypeError("A request body is not allowed.");
}

async function protectedOperation(
  request: Request,
  dependencies: ProtectedIdentityHttpDependencies,
  operation: (context: PrincipalContext, service: IdentityService) => Promise<Response>,
): Promise<Response> {
  try {
    const context = await dependencies.authenticate(request);
    const response = await operation(context, dependencies.createService());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (failure) {
    if (failure instanceof ProtectedSessionUnauthorizedError) {
      return error(401, "Unauthorized.");
    }
    if (failure instanceof ProtectedSessionUnavailableError) {
      return error(503, "Service unavailable.");
    }
    if (failure instanceof ConsentRequiredError) {
      return error(403, "Consent required.");
    }
    if (failure instanceof ProfileNotFoundError) {
      return error(404, "Not found.");
    }
    if (failure instanceof VersionConflictError) {
      return error(409, "Conflict.");
    }
    if (failure instanceof SyntaxError || failure instanceof TypeError || failure instanceof ZodError) {
      return error(400, "Invalid request.");
    }
    return error(503, "Service unavailable.");
  }
}

export function createProfilesHttpHandlers(dependencies: ProtectedIdentityHttpDependencies) {
  return {
    async GET(request: Request): Promise<Response> {
      return protectedOperation(request, dependencies, async (context, service) => {
        const account = await service.exportAccount(context);
        return json({ profiles: account.profiles });
      });
    },

    async POST(request: Request): Promise<Response> {
      return protectedOperation(request, dependencies, async (context, service) => {
        const draft = parseProfileDraft(await request.json());
        const profile = await service.createProfile(context, draft);
        return json({ profile }, { status: 201 });
      });
    },
  };
}

export function createProfileHttpHandlers(dependencies: ProtectedIdentityHttpDependencies) {
  return {
    async GET(request: Request, routeContext: ProfileRouteContext): Promise<Response> {
      return protectedOperation(request, dependencies, async (context, service) => {
        const requestedId = profileId((await routeContext.params).profileId);
        const account = await service.exportAccount(context);
        const profile = account.profiles.find((item) => item.id === requestedId);
        if (!profile) throw new ProfileNotFoundError();
        return json({ profile });
      });
    },

    async PATCH(request: Request, routeContext: ProfileRouteContext): Promise<Response> {
      return protectedOperation(request, dependencies, async (context, service) => {
        const requestedId = profileId((await routeContext.params).profileId);
        const parsed = profilePatchRequestSchema.parse(await request.json());
        const patch = parseProfilePatch(parsed.patch);
        const profile = await service.updateProfile(
          context,
          requestedId,
          parsed.expectedVersion,
          patch,
        );
        return json({ profile });
      });
    },

    async DELETE(request: Request, routeContext: ProfileRouteContext): Promise<Response> {
      return protectedOperation(request, dependencies, async (context, service) => {
        const requestedId = profileId((await routeContext.params).profileId);
        parseIdempotencyKey(request.headers.get("idempotency-key"));
        await requireEmptyBody(request);
        await service.deleteProfile(context, requestedId);
        return new Response(null, {
          status: 204,
          headers: { "Cache-Control": "no-store" },
        });
      });
    },
  };
}

export function createConsentHttpHandlers(dependencies: ProtectedIdentityHttpDependencies) {
  return {
    async PUT(request: Request): Promise<Response> {
      return protectedOperation(request, dependencies, async (context, service) => {
        const input = z
          .strictObject({
            granted: z.boolean(),
            policyVersion: z.literal(dependencies.policyVersion),
          })
          .parse(await request.json());
        const consent = input.granted
          ? await service.grantConsent(context, input.policyVersion)
          : await service.withdrawConsent(context, input.policyVersion);
        return json({ consent });
      });
    },
  };
}

export function createAccountExportHttpHandlers(dependencies: ProtectedIdentityHttpDependencies) {
  return {
    async GET(request: Request): Promise<Response> {
      return protectedOperation(request, dependencies, async (context, service) => {
        const account = await service.exportAccount(context);
        return json(account, {
          headers: {
            "Content-Disposition": 'attachment; filename="measureonce-fit-passport.json"',
          },
        });
      });
    },
  };
}

export function createAccountHttpHandlers(dependencies: ProtectedIdentityHttpDependencies) {
  return {
    async DELETE(request: Request): Promise<Response> {
      return protectedOperation(request, dependencies, async (context, service) => {
        const idempotencyKey = parseIdempotencyKey(request.headers.get("idempotency-key"));
        await requireEmptyBody(request);
        await service.deleteFitPassport(context, idempotencyKey);
        return json({
          deleted: true,
          message: "Fit Passport deleted. Your shopping account remains active.",
        });
      });
    },
  };
}
