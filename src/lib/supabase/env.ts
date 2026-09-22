export type SupabaseEnvironmentErrorCode =
  | "MISSING_PUBLIC_CONFIG"
  | "PARTIAL_PUBLIC_CONFIG"
  | "INVALID_PUBLIC_URL"
  | "MISSING_SECRET_KEY";

export class SupabaseEnvironmentError extends Error {
  constructor(
    public readonly code: SupabaseEnvironmentErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SupabaseEnvironmentError";
  }
}

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export interface PublicSupabaseConfig {
  url: string;
  publishableKey: string;
}

export interface AdminSupabaseConfig extends PublicSupabaseConfig {
  secretKey: string;
}

function trimmed(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function assertProjectUrl(value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
      throw new Error("Supabase project URLs must use HTTPS outside local development.");
    }
  } catch {
    throw new SupabaseEnvironmentError(
      "INVALID_PUBLIC_URL",
      "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS or local development URL.",
    );
  }
}

export function readPublicSupabaseConfig(
  environment: EnvironmentSource = process.env,
): PublicSupabaseConfig | null {
  const url = trimmed(environment.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = trimmed(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!url && !publishableKey) return null;
  if (!url || !publishableKey) {
    throw new SupabaseEnvironmentError(
      "PARTIAL_PUBLIC_CONFIG",
      "Set both NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  assertProjectUrl(url);
  return { url, publishableKey };
}

export function requirePublicSupabaseConfig(
  environment: EnvironmentSource = process.env,
): PublicSupabaseConfig {
  const config = readPublicSupabaseConfig(environment);
  if (!config) {
    throw new SupabaseEnvironmentError(
      "MISSING_PUBLIC_CONFIG",
      "Supabase is not configured. Set the public project URL and publishable key.",
    );
  }
  return config;
}

export function requireAdminSupabaseConfig(
  environment: EnvironmentSource = process.env,
): AdminSupabaseConfig {
  const publicConfig = requirePublicSupabaseConfig(environment);
  const secretKey = trimmed(environment.SUPABASE_SECRET_KEY);
  if (!secretKey) {
    throw new SupabaseEnvironmentError(
      "MISSING_SECRET_KEY",
      "SUPABASE_SECRET_KEY is required for privileged server operations.",
    );
  }
  return { ...publicConfig, secretKey };
}
