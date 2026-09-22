import "server-only";

import { exchangeRetailerAssertion } from "@/lib/retailer-identity/exchange-service";
import { loadRetailerIdentityConfig } from "@/lib/retailer-identity/env";
import { createRetailerSessionHttpHandlers } from "@/lib/retailer-identity/session-http";
import { SupabaseRetailerIdentityAdapter } from "@/lib/retailer-identity/supabase-adapter";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const handlers = createRetailerSessionHttpHandlers({
  async exchange(assertion) {
    const config = await loadRetailerIdentityConfig();
    const adapter = new SupabaseRetailerIdentityAdapter(createSupabaseAdminClient());
    return exchangeRetailerAssertion(assertion, {
      config,
      principals: adapter,
      replayProtection: adapter,
    });
  },
});

export const POST = handlers.POST;
export const DELETE = handlers.DELETE;
