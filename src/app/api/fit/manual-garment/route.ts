import { handleManualGarmentRequest } from "@/lib/fit/manual-garment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return handleManualGarmentRequest(request);
}

export async function POST(request: Request): Promise<Response> {
  return handleManualGarmentRequest(request);
}
