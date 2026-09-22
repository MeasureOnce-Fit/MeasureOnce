import { importSPKI, type KeyLike } from "jose";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ASYMMETRIC_ALGORITHMS = new Set(["RS256", "PS256", "ES256", "EdDSA"]);
const MINIMUM_SECRET_BYTES = 32;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export interface RetailerIdentityConfig {
  retailerId: string;
  issuer: string;
  audience: string;
  algorithm: string;
  publicKey: KeyLike;
  subjectDigestSecret: Uint8Array;
  sessionSecret: Uint8Array;
  maximumAssertionLifetimeSeconds: number;
  sessionTtlSeconds: number;
}

export interface ShowcaseSessionConfig {
  retailerId: string;
  sessionSecret: Uint8Array;
  sessionTtlSeconds: number;
}

export class RetailerIdentityEnvironmentError extends Error {
  constructor() {
    super("Retailer identity is unavailable.");
    this.name = "RetailerIdentityEnvironmentError";
  }
}

function required(environment: EnvironmentSource, name: string): string {
  const value = environment[name]?.trim();
  if (!value) throw new RetailerIdentityEnvironmentError();
  return value;
}

function secret(environment: EnvironmentSource, name: string): Uint8Array {
  const value = environment[name];
  if (!value) throw new RetailerIdentityEnvironmentError();
  const bytes = new TextEncoder().encode(value);
  if (bytes.byteLength < MINIMUM_SECRET_BYTES) {
    throw new RetailerIdentityEnvironmentError();
  }
  return bytes;
}

function positiveInteger(value: string, maximum: number): number {
  if (!/^[1-9][0-9]*$/.test(value)) throw new RetailerIdentityEnvironmentError();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new RetailerIdentityEnvironmentError();
  }
  return parsed;
}

export function loadShowcaseSessionConfig(
  environment: EnvironmentSource = process.env,
): ShowcaseSessionConfig {
  try {
    const retailerId = required(environment, "RETAILER_IDENTITY_RETAILER_ID");
    if (!UUID.test(retailerId)) throw new RetailerIdentityEnvironmentError();

    return {
      retailerId,
      sessionSecret: secret(environment, "RETAILER_IDENTITY_SESSION_SECRET"),
      sessionTtlSeconds: positiveInteger(
        required(environment, "RETAILER_IDENTITY_SESSION_TTL_SECONDS"),
        3_600,
      ),
    };
  } catch {
    throw new RetailerIdentityEnvironmentError();
  }
}

export async function loadRetailerIdentityConfig(
  environment: EnvironmentSource = process.env,
): Promise<RetailerIdentityConfig> {
  try {
    const retailerId = required(environment, "RETAILER_IDENTITY_RETAILER_ID");
    const issuer = required(environment, "RETAILER_IDENTITY_ISSUER");
    const audience = required(environment, "RETAILER_IDENTITY_AUDIENCE");
    const algorithm = required(environment, "RETAILER_IDENTITY_ALGORITHM");
    const publicKeyPem = required(environment, "RETAILER_IDENTITY_PUBLIC_KEY_PEM");

    if (!UUID.test(retailerId) || !ASYMMETRIC_ALGORITHMS.has(algorithm)) {
      throw new RetailerIdentityEnvironmentError();
    }

    return {
      retailerId,
      issuer,
      audience,
      algorithm,
      publicKey: await importSPKI(publicKeyPem, algorithm),
      subjectDigestSecret: secret(environment, "RETAILER_IDENTITY_SUBJECT_HMAC_SECRET"),
      sessionSecret: secret(environment, "RETAILER_IDENTITY_SESSION_SECRET"),
      maximumAssertionLifetimeSeconds: positiveInteger(
        required(environment, "RETAILER_IDENTITY_ASSERTION_MAX_AGE_SECONDS"),
        3_600,
      ),
      sessionTtlSeconds: positiveInteger(
        required(environment, "RETAILER_IDENTITY_SESSION_TTL_SECONDS"),
        3_600,
      ),
    };
  } catch {
    throw new RetailerIdentityEnvironmentError();
  }
}
