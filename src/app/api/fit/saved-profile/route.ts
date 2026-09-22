import { createSavedProfileRecommendationHandler } from "@/lib/fit/saved-profile";
import { createIdentityRouteDependencies } from "@/lib/identity/route-dependencies";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handle = createSavedProfileRecommendationHandler(createIdentityRouteDependencies());

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
