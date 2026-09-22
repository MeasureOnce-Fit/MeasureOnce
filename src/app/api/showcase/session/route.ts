import "server-only";

import { loadRetailerIdentityConfig } from "@/lib/retailer-identity/env";
import { createShowcaseSessionPostHandler } from "@/lib/retailer-identity/showcase-session-http";
import { APP_SESSION_COOKIE_NAME, createAppSessionCookie } from "@/lib/retailer-identity/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resolveShowcaseShopper } from "@/lib/retailer-identity/showcase-registration";
import { isEligibleShowcaseSessionUser } from "@/lib/retailer-identity/showcase-session-eligibility";

const CLEARED_SESSION_COOKIE = [
  `${APP_SESSION_COOKIE_NAME}=`,
  "Path=/",
  "Max-Age=0",
  "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  "HttpOnly",
  "Secure",
  "SameSite=Lax",
].join("; ");

export const POST = createShowcaseSessionPostHandler({
  async authenticate() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !isEligibleShowcaseSessionUser(data.user)) return null;
    return data.user.id;
  },
  loadConfig: loadRetailerIdentityConfig,
  async resolvePrincipal({ retailerId, authUserId }) {
    const admin = createSupabaseAdminClient();
    return resolveShowcaseShopper({
      async findPrincipal() {
        const { data, error } = await admin.from("principals").select("id, actor_kind")
          .eq("retailer_id", retailerId).eq("auth_user_id", authUserId).maybeSingle();
        if (error) throw new Error("Showcase principal lookup failed.");
        return data ? { id: data.id, actorKind: data.actor_kind } : null;
      },
      async publicShowcaseSignupAllowed() {
        const { data, error } = await admin.from("retailers").select("tenant_kind, public_signup").eq("id", retailerId).maybeSingle();
        if (error) throw new Error("Showcase signup configuration unavailable.");
        return data?.tenant_kind === "showcase" && data.public_signup === true;
      },
      async insertShopperIfAbsent() {
        const { error } = await admin.from("principals").upsert(
          { retailer_id: retailerId, auth_user_id: authUserId, actor_kind: "shopper" },
          { onConflict: "retailer_id,auth_user_id", ignoreDuplicates: true },
        );
        if (error) throw new Error("Showcase account creation failed.");
      },
    });
  },
  createSession: createAppSessionCookie,
});

export async function DELETE(): Promise<Response> {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Clear the application session even when the upstream auth service is unavailable.
  }

  return new Response(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
      "Set-Cookie": CLEARED_SESSION_COOKIE,
    },
  });
}
