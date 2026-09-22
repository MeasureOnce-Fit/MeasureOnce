import { jwtVerify, type KeyLike } from "jose";

const OPAQUE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._~-]{7,199}$/;
const ASYMMETRIC_ALGORITHMS = new Set(["RS256", "PS256", "ES256", "EdDSA"]);

export interface ReplayIdentifier {
  issuer: string;
  retailerId: string;
  assertionId: string;
  expiresAt: number;
}

export interface ReplayProtection {
  /** Must atomically return false when the identifier was already consumed. */
  consume(identifier: ReplayIdentifier): Promise<boolean>;
}

export interface RetailerAssertionVerifierConfig {
  publicKey: KeyLike;
  algorithm: string;
  issuer: string;
  audience: string;
  retailerId: string;
  maximumLifetimeSeconds: number;
  replayProtection: ReplayProtection;
  now?: () => Date;
}

export interface VerifiedRetailerIdentity {
  issuer: string;
  subject: string;
  retailerId: string;
  assertionId: string;
  expiresAt: number;
}

export class RetailerAssertionError extends Error {
  constructor() {
    super("Retailer assertion rejected.");
    this.name = "RetailerAssertionError";
  }
}

function requiredOpaqueIdentifier(value: unknown): string {
  if (typeof value !== "string" || !OPAQUE_IDENTIFIER.test(value)) {
    throw new RetailerAssertionError();
  }
  return value;
}

function requiredNumericDate(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new RetailerAssertionError();
  }
  return value;
}

function assertValidConfig(config: RetailerAssertionVerifierConfig): void {
  if (
    !config.publicKey ||
    !ASYMMETRIC_ALGORITHMS.has(config.algorithm) ||
    !config.issuer ||
    !config.audience ||
    !config.retailerId ||
    !Number.isSafeInteger(config.maximumLifetimeSeconds) ||
    config.maximumLifetimeSeconds <= 0 ||
    !config.replayProtection
  ) {
    throw new RetailerAssertionError();
  }
}

export async function verifyRetailerAssertion(
  assertion: string,
  config: RetailerAssertionVerifierConfig,
): Promise<VerifiedRetailerIdentity> {
  try {
    assertValidConfig(config);
    if (!assertion || assertion.length > 16_384) throw new RetailerAssertionError();

    const { payload, protectedHeader } = await jwtVerify(assertion, config.publicKey, {
      algorithms: [config.algorithm],
      issuer: config.issuer,
      audience: config.audience,
      currentDate: config.now?.() ?? new Date(),
      requiredClaims: ["sub", "exp", "nbf", "jti"],
    });

    if (protectedHeader.typ !== "JWT") throw new RetailerAssertionError();

    const subject = requiredOpaqueIdentifier(payload.sub);
    const assertionId = requiredOpaqueIdentifier(payload.jti);
    const expiresAt = requiredNumericDate(payload.exp);
    const notBefore = requiredNumericDate(payload.nbf);

    if (payload.iss !== config.issuer || payload.retailer_id !== config.retailerId) {
      throw new RetailerAssertionError();
    }
    if (expiresAt - notBefore > config.maximumLifetimeSeconds) {
      throw new RetailerAssertionError();
    }

    const accepted = await config.replayProtection.consume({
      issuer: config.issuer,
      retailerId: config.retailerId,
      assertionId,
      expiresAt,
    });
    if (!accepted) throw new RetailerAssertionError();

    return {
      issuer: config.issuer,
      subject,
      retailerId: config.retailerId,
      assertionId,
      expiresAt,
    };
  } catch {
    throw new RetailerAssertionError();
  }
}
