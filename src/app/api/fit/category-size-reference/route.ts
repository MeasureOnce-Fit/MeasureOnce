import { handleCategorySizeReferenceRequest } from "@/lib/fit/category-size-reference";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleCategorySizeReferenceRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleCategorySizeReferenceRequest(request);
}
