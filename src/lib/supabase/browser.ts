"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requirePublicSupabaseConfig } from "./env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function createSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  // Next.js replaces explicitly named NEXT_PUBLIC_ variables in browser bundles.
  // Passing the runtime `process.env` object to the shared helper leaves both
  // values absent in the browser, even though the development server has them.
  const config = requirePublicSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  browserClient = createBrowserClient(config.url, config.publishableKey);
  return browserClient;
}
