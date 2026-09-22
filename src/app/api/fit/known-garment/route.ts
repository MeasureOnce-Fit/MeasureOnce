import { handleKnownGarmentRequest } from "@/lib/fit/known-garment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleKnownGarmentRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleKnownGarmentRequest(request);
}
