import { IdentityDomainError } from "./service";

const IDEMPOTENCY_KEY = /^[A-Za-z0-9._:-]{8,120}$/;

export function safeRelativeRedirect(value: string | null, fallback = "/account"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://measureonce.invalid");
    if (parsed.origin !== "https://measureonce.invalid") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function parseIdempotencyKey(value: string | null): string {
  if (!value || !IDEMPOTENCY_KEY.test(value)) {
    throw new TypeError("A valid Idempotency-Key header is required.");
  }
  return value;
}

export function errorResponse(error: unknown): Response {
  if (error instanceof IdentityDomainError) {
    const status = error.code === "CONSENT_REQUIRED"
      ? 403
      : error.code === "PROFILE_NOT_FOUND"
        ? 404
        : error.code === "VERSION_CONFLICT"
          ? 409
          : 500;
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status },
    );
  }

  if (error instanceof SyntaxError || error instanceof TypeError) {
    return Response.json(
      { error: { code: "INVALID_REQUEST", message: error.message } },
      { status: 400 },
    );
  }

  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "The request could not be completed." } },
    { status: 500 },
  );
}
