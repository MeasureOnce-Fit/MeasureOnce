import "server-only";

import { NextResponse } from "next/server";

import {
  loadOperatorCatalog,
  OperatorCatalogUnauthorizedError,
  OperatorCatalogUnavailableError,
  reviewOperatorCatalogProduct,
  type CoverageStatus,
  type OperatorCatalogDependencies,
} from "@/lib/retailer-catalog/operator-service";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function responseFor(error: unknown) {
  if (error instanceof OperatorCatalogUnauthorizedError) return NextResponse.json({ error: "Operator access is required." }, { status: 401 });
  return NextResponse.json({ error: "Catalog operations are unavailable." }, { status: error instanceof OperatorCatalogUnavailableError ? 503 : 500 });
}

function isStatus(value: unknown): value is CoverageStatus {
  return value === "review" || value === "ready" || value === "unavailable";
}

async function dependencies(): Promise<OperatorCatalogDependencies> {
  const sessionClient = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();
  return {
    async authenticatedUserId() {
      const { data, error } = await sessionClient.auth.getUser();
      return error || !data.user ? null : data.user.id;
    },
    async resolveMembership(authUserId) {
      const { data: principals, error: principalError } = await admin
        .from("principals")
        .select("id")
        .eq("auth_user_id", authUserId)
        .eq("actor_kind", "operator");
      if (principalError || !principals || principals.length !== 1) return null;
      const { data: memberships, error: membershipError } = await admin
        .from("retailer_memberships")
        .select("retailer_id")
        .eq("principal_id", principals[0].id)
        .eq("role", "retailer_admin")
        .eq("active", true);
      if (membershipError || !memberships || memberships.length !== 1) return null;
      const { data: retailer, error: retailerError } = await admin
        .from("retailers")
        .select("display_name")
        .eq("id", memberships[0].retailer_id)
        .maybeSingle();
      if (retailerError || typeof retailer?.display_name !== "string") return null;
      return { retailerId: memberships[0].retailer_id, retailerName: retailer.display_name };
    },
    async call(functionName, args) {
      const { data, error } = await admin.schema("private").rpc(functionName, args);
      return { data, error: error ? { message: error.message } : null };
    },
  };
}

export async function GET() {
  try {
    return NextResponse.json(await loadOperatorCatalog(await dependencies()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseFor(error);
  }
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Review request is invalid." }, { status: 400 });
    const record = body as Record<string, unknown>;
    if (Object.keys(record).some((key) => !["externalProductId", "coverageStatus", "fitProductReference"].includes(key)) || typeof record.externalProductId !== "string" || !isStatus(record.coverageStatus) || (record.fitProductReference !== undefined && record.fitProductReference !== null && typeof record.fitProductReference !== "string")) {
      return NextResponse.json({ error: "Review request is invalid." }, { status: 400 });
    }
    await reviewOperatorCatalogProduct(await dependencies(), {
      externalProductId: record.externalProductId,
      coverageStatus: record.coverageStatus,
      fitProductReference: record.fitProductReference,
    });
    return NextResponse.json(await loadOperatorCatalog(await dependencies()), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return responseFor(error);
  }
}
