import type { PrincipalContext } from "./types";
import {
  loadShowcaseSessionConfig,
  RetailerIdentityEnvironmentError,
} from "../retailer-identity/env";
import {
  APP_SESSION_COOKIE_NAME,
  type AppSessionConfig,
  type VerifiedAppSession,
  verifyAppSession,
} from "../retailer-identity/session";

interface SessionContextConfig {
  retailerId: string;
  sessionSecret: Uint8Array;
  sessionTtlSeconds: number;
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export async function loadProtectedSessionConfig(
  environment?: EnvironmentSource,
): Promise<SessionContextConfig> {
  return loadShowcaseSessionConfig(environment);
}

export interface SessionContextDependencies {
  loadConfig(): Promise<SessionContextConfig>;
  verifySession(value: string, config: AppSessionConfig): Promise<VerifiedAppSession>;
  now?: () => Date;
}

export class ProtectedSessionUnauthorizedError extends Error {
  constructor() {
    super("Protected session rejected.");
    this.name = "ProtectedSessionUnauthorizedError";
  }
}

export class ProtectedSessionUnavailableError extends Error {
  constructor() {
    super("Protected session verification is unavailable.");
    this.name = "ProtectedSessionUnavailableError";
  }
}

const defaultDependencies: SessionContextDependencies = {
  loadConfig: loadProtectedSessionConfig,
  verifySession: verifyAppSession,
};

function applicationSessionCookie(request: Request): string {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) throw new ProtectedSessionUnauthorizedError();

  const matches = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.startsWith(`${APP_SESSION_COOKIE_NAME}=`))
    .map((part) => part.slice(APP_SESSION_COOKIE_NAME.length + 1));

  if (matches.length !== 1 || !matches[0]) {
    throw new ProtectedSessionUnauthorizedError();
  }
  return matches[0];
}

export async function derivePrincipalContext(
  request: Request,
  dependencies: SessionContextDependencies = defaultDependencies,
): Promise<PrincipalContext> {
  let config: SessionContextConfig;
  try {
    config = await dependencies.loadConfig();
  } catch (error) {
    if (error instanceof RetailerIdentityEnvironmentError) {
      throw new ProtectedSessionUnavailableError();
    }
    throw new ProtectedSessionUnavailableError();
  }

  try {
    const session = await dependencies.verifySession(applicationSessionCookie(request), {
      secret: config.sessionSecret,
      ttlSeconds: config.sessionTtlSeconds,
      expectedRetailerId: config.retailerId,
      now: dependencies.now,
    });
    return { principalId: session.principalId, retailerId: session.retailerId };
  } catch {
    throw new ProtectedSessionUnauthorizedError();
  }
}
