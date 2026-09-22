import { SignJWT, jwtVerify } from "jose";

const SESSION_ALGORITHM = "HS256";
const OPAQUE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._~-]{7,199}$/;
const SESSION_CLAIMS = ["exp", "principal_id", "retailer_id", "session_id"];
const MINIMUM_SECRET_BYTES = 32;
const MAXIMUM_SESSION_SECONDS = 3_600;

export const APP_SESSION_COOKIE_NAME = "__Host-measureonce_session";

export interface AppSessionConfig {
  secret: Uint8Array;
  ttlSeconds: number;
  expectedRetailerId?: string;
  now?: () => Date;
}

export interface AppSessionIdentity {
  retailerId: string;
  principalId: string;
  sessionId: string;
}

export interface VerifiedAppSession extends AppSessionIdentity {
  expiresAt: number;
}

export interface AppSessionCookie {
  name: typeof APP_SESSION_COOKIE_NAME;
  value: string;
  options: {
    httpOnly: true;
    secure: true;
    sameSite: "lax";
    path: "/";
    maxAge: number;
    expires: Date;
  };
  setCookieHeader: string;
}

export class AppSessionError extends Error {
  constructor() {
    super("Application session rejected.");
    this.name = "AppSessionError";
  }
}

function requiredOpaqueIdentifier(value: unknown): string {
  if (typeof value !== "string" || !OPAQUE_IDENTIFIER.test(value)) {
    throw new AppSessionError();
  }
  return value;
}

function assertValidConfig(config: AppSessionConfig): void {
  if (
    !(config.secret instanceof Uint8Array) ||
    config.secret.byteLength < MINIMUM_SECRET_BYTES ||
    !Number.isSafeInteger(config.ttlSeconds) ||
    config.ttlSeconds <= 0 ||
    config.ttlSeconds > MAXIMUM_SESSION_SECONDS
  ) {
    throw new AppSessionError();
  }
  if (config.expectedRetailerId !== undefined) {
    requiredOpaqueIdentifier(config.expectedRetailerId);
  }
}

function nowInSeconds(config: AppSessionConfig): number {
  return Math.floor((config.now?.() ?? new Date()).getTime() / 1000);
}

export async function createAppSessionCookie(
  identity: AppSessionIdentity,
  config: AppSessionConfig,
): Promise<AppSessionCookie> {
  try {
    assertValidConfig(config);
    const retailerId = requiredOpaqueIdentifier(identity.retailerId);
    const principalId = requiredOpaqueIdentifier(identity.principalId);
    const sessionId = requiredOpaqueIdentifier(identity.sessionId);
    const expiresAt = nowInSeconds(config) + config.ttlSeconds;
    const expires = new Date(expiresAt * 1000);

    const value = await new SignJWT({
      retailer_id: retailerId,
      principal_id: principalId,
      session_id: sessionId,
      exp: expiresAt,
    })
      .setProtectedHeader({ alg: SESSION_ALGORITHM, typ: "JWT" })
      .sign(config.secret);

    const options = {
      httpOnly: true as const,
      secure: true as const,
      sameSite: "lax" as const,
      path: "/" as const,
      maxAge: config.ttlSeconds,
      expires,
    };

    return {
      name: APP_SESSION_COOKIE_NAME,
      value,
      options,
      setCookieHeader: [
        `${APP_SESSION_COOKIE_NAME}=${value}`,
        "Path=/",
        `Max-Age=${config.ttlSeconds}`,
        `Expires=${expires.toUTCString()}`,
        "HttpOnly",
        "Secure",
        "SameSite=Lax",
      ].join("; "),
    };
  } catch {
    throw new AppSessionError();
  }
}

export async function verifyAppSession(
  value: string,
  config: AppSessionConfig,
): Promise<VerifiedAppSession> {
  try {
    assertValidConfig(config);
    if (!value || value.length > 8_192) throw new AppSessionError();

    const now = nowInSeconds(config);
    const { payload, protectedHeader } = await jwtVerify(value, config.secret, {
      algorithms: [SESSION_ALGORITHM],
      currentDate: new Date(now * 1000),
      requiredClaims: ["exp"],
    });

    if (protectedHeader.typ !== "JWT") throw new AppSessionError();
    if (Object.keys(payload).sort().join(",") !== SESSION_CLAIMS.join(",")) {
      throw new AppSessionError();
    }

    const retailerId = requiredOpaqueIdentifier(payload.retailer_id);
    const principalId = requiredOpaqueIdentifier(payload.principal_id);
    const sessionId = requiredOpaqueIdentifier(payload.session_id);
    if (typeof payload.exp !== "number" || !Number.isSafeInteger(payload.exp)) {
      throw new AppSessionError();
    }
    if (payload.exp > now + config.ttlSeconds) throw new AppSessionError();
    if (config.expectedRetailerId && retailerId !== config.expectedRetailerId) {
      throw new AppSessionError();
    }

    return { retailerId, principalId, sessionId, expiresAt: payload.exp };
  } catch {
    throw new AppSessionError();
  }
}
