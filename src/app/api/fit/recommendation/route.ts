import { handleProductFitRecommendationPost } from "@/lib/fit/product-fit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  return handleProductFitRecommendationPost(request);
}
