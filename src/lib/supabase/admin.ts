import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requireAdminSupabaseConfig } from "./env";

export function createSupabaseAdminClient() {
  const config = requireAdminSupabaseConfig();

  return createClient(config.url, config.secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
