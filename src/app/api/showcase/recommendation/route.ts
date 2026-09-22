import { handleShowcaseRecommendationPost } from "@/lib/fit/showcase-preview";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleShowcaseRecommendationPost(request);
}
