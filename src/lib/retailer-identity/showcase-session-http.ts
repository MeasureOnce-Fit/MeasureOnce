import type { AppSessionCookie, AppSessionIdentity } from "./session";

interface ShowcaseSessionConfig {
  retailerId: string;
  sessionSecret: Uint8Array;
  sessionTtlSeconds: number;
}

export interface ShowcaseSessionDependencies {
  authenticate(request: Request): Promise<string | null>;
  loadConfig(): Promise<ShowcaseSessionConfig>;
  resolvePrincipal(input: { retailerId: string; authUserId: string }): Promise<string | null>;
  createSession(
    identity: AppSessionIdentity,
    config: { secret: Uint8Array; ttlSeconds: number },
  ): Promise<AppSessionCookie>;
  createSessionId?: () => string;
}

function jsonError(status: 401 | 503, message: string): Response {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function hasCallerSuppliedIdentity(request: Request): boolean {
  return (
    new URL(request.url).search.length > 0 ||
    request.headers.has("x-retailer-id") ||
    request.headers.has("x-retailer-subject") ||
    request.headers.has("x-principal-id") ||
    request.headers.has("retailer-id") ||
    request.headers.has("principal-id")
  );
}

export function createShowcaseSessionPostHandler(
  dependencies: ShowcaseSessionDependencies,
) {
  return async function POST(request: Request): Promise<Response> {
    if (hasCallerSuppliedIdentity(request) || (await request.text()).length > 0) {
      return jsonError(401, "Unauthorized.");
    }

    try {
      const authUserId = await dependencies.authenticate(request);
      if (!authUserId) return jsonError(401, "Unauthorized.");

      const config = await dependencies.loadConfig();
      const principalId = await dependencies.resolvePrincipal({
        retailerId: config.retailerId,
        authUserId,
      });
      if (!principalId) return jsonError(401, "Unauthorized.");

      const session = await dependencies.createSession(
        {
          retailerId: config.retailerId,
          principalId,
          sessionId: dependencies.createSessionId?.() ?? crypto.randomUUID(),
        },
        { secret: config.sessionSecret, ttlSeconds: config.sessionTtlSeconds },
      );

      return new Response(null, {
        status: 204,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": session.setCookieHeader,
        },
      });
    } catch {
      return jsonError(503, "Service unavailable.");
    }
  };
}
