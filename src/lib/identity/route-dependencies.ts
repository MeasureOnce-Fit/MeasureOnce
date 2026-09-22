import "server-only";

import { createIdentityService } from "./service";
import { derivePrincipalContext } from "./session-context";
import { createSupabaseIdentityRepository } from "./supabase-repository";
import type { ProtectedIdentityHttpDependencies } from "./protected-http";
import { createSupabaseAdminClient } from "../supabase/admin";

export const FIT_PASSPORT_POLICY_VERSION = "2026-09-18";

export function createIdentityRouteDependencies(): ProtectedIdentityHttpDependencies {
  return {
    authenticate: derivePrincipalContext,
    createService() {
      const admin = createSupabaseAdminClient();
      return createIdentityService(createSupabaseIdentityRepository(admin, admin));
    },
    policyVersion: FIT_PASSPORT_POLICY_VERSION,
  };
}
