import assert from "node:assert/strict";
import test from "node:test";

import {
  SupabaseEnvironmentError,
  readPublicSupabaseConfig,
} from "../../src/lib/supabase/env";

test("readPublicSupabaseConfig returns trimmed public configuration", () => {
  const config = readPublicSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: "  https://measureonce.supabase.co  ",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "  sb_publishable_example  ",
  });

  assert.deepEqual(config, {
    url: "https://measureonce.supabase.co",
    publishableKey: "sb_publishable_example",
  });
});

test("readPublicSupabaseConfig returns null when public configuration is absent", () => {
  assert.equal(readPublicSupabaseConfig({}), null);
  assert.equal(
    readPublicSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: "   ",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "\t",
    }),
    null,
  );
});

test("readPublicSupabaseConfig rejects a partially configured environment", () => {
  for (const environment of [
    { NEXT_PUBLIC_SUPABASE_URL: "https://measureonce.supabase.co" },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example" },
  ]) {
    assert.throws(
      () => readPublicSupabaseConfig(environment),
      (error: unknown) =>
        error instanceof SupabaseEnvironmentError && error.code === "PARTIAL_PUBLIC_CONFIG",
    );
  }
});

test("readPublicSupabaseConfig rejects a malformed project URL", () => {
  assert.throws(
    () =>
      readPublicSupabaseConfig({
        NEXT_PUBLIC_SUPABASE_URL: "not-a-url",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      }),
    (error: unknown) =>
      error instanceof SupabaseEnvironmentError && error.code === "INVALID_PUBLIC_URL",
  );
});
