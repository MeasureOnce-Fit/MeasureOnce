import { randomUUID } from "node:crypto";

import {
  verifyRetailerAssertion,
  type ReplayProtection,
} from "./assertion";
import type { RetailerIdentityConfig } from "./env";
import { createAppSessionCookie, type AppSessionCookie } from "./session";
import { digestRetailerSubject } from "./subject-digest";

export interface RetailerPrincipalResolver {
  resolveOrCreate(input: {
    retailerId: string;
    issuer: string;
    subjectDigest: Uint8Array;
  }): Promise<string>;
}

export interface RetailerSessionExchangeDependencies {
  config: RetailerIdentityConfig;
  replayProtection: ReplayProtection;
  principals: RetailerPrincipalResolver;
  now?: () => Date;
  newSessionId?: () => string;
}

export class RetailerSessionExchangeUnavailableError extends Error {
  constructor() {
    super("Retailer identity is unavailable.");
    this.name = "RetailerSessionExchangeUnavailableError";
  }
}

export async function exchangeRetailerAssertion(
  assertion: string,
  dependencies: RetailerSessionExchangeDependencies,
): Promise<AppSessionCookie> {
  const { config } = dependencies;
  const identity = await verifyRetailerAssertion(assertion, {
    publicKey: config.publicKey,
    algorithm: config.algorithm,
    issuer: config.issuer,
    audience: config.audience,
    retailerId: config.retailerId,
    maximumLifetimeSeconds: config.maximumAssertionLifetimeSeconds,
    replayProtection: dependencies.replayProtection,
    now: dependencies.now,
  });

  try {
    const principalId = await dependencies.principals.resolveOrCreate({
      retailerId: identity.retailerId,
      issuer: identity.issuer,
      subjectDigest: digestRetailerSubject(identity.subject, config.subjectDigestSecret),
    });

    return await createAppSessionCookie(
      {
        retailerId: identity.retailerId,
        principalId,
        sessionId: dependencies.newSessionId?.() ?? randomUUID(),
      },
      {
        secret: config.sessionSecret,
        ttlSeconds: config.sessionTtlSeconds,
        expectedRetailerId: config.retailerId,
        now: dependencies.now,
      },
    );
  } catch {
    throw new RetailerSessionExchangeUnavailableError();
  }
}
