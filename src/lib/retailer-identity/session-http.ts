import { RetailerAssertionError } from "./assertion";
import { RetailerIdentityEnvironmentError } from "./env";
import { RetailerSessionExchangeUnavailableError } from "./exchange-service";
import { APP_SESSION_COOKIE_NAME, type AppSessionCookie } from "./session";

const CLEARED_SESSION_COOKIE = [
  `${APP_SESSION_COOKIE_NAME}=`,
  "Path=/",
  "Max-Age=0",
  "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  "HttpOnly",
  "Secure",
  "SameSite=Lax",
].join("; ");

export interface RetailerSessionExchanger {
  exchange(assertion: string): Promise<AppSessionCookie>;
}

function jsonError(status: 401 | 503, message: string): Response {
  return Response.json(
    { error: message },
    {
      status,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function bearerAssertion(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([^\s,]+)$/i.exec(authorization);
  return match?.[1] ?? null;
}

function hasCallerSuppliedIdentity(request: Request): boolean {
  return (
    new URL(request.url).search.length > 0 ||
    request.headers.has("x-retailer-id") ||
    request.headers.has("x-retailer-subject") ||
    request.headers.has("retailer-id") ||
    request.headers.has("retailer-subject")
  );
}

export function createRetailerSessionHttpHandlers(exchanger: RetailerSessionExchanger) {
  return {
    async POST(request: Request): Promise<Response> {
      const assertion = bearerAssertion(request);
      if (!assertion || hasCallerSuppliedIdentity(request)) {
        return jsonError(401, "Unauthorized.");
      }

      try {
        if ((await request.text()).length > 0) {
          return jsonError(401, "Unauthorized.");
        }
        const session = await exchanger.exchange(assertion);
        return new Response(null, {
          status: 204,
          headers: {
            "Cache-Control": "no-store",
            "Set-Cookie": session.setCookieHeader,
          },
        });
      } catch (error) {
        if (error instanceof RetailerAssertionError) {
          return jsonError(401, "Unauthorized.");
        }
        if (
          error instanceof RetailerIdentityEnvironmentError ||
          error instanceof RetailerSessionExchangeUnavailableError
        ) {
          return jsonError(503, "Service unavailable.");
        }
        return jsonError(503, "Service unavailable.");
      }
    },

    async DELETE(): Promise<Response> {
      return new Response(null, {
        status: 204,
        headers: {
          "Cache-Control": "no-store",
          "Set-Cookie": CLEARED_SESSION_COOKIE,
        },
      });
    },
  };
}
