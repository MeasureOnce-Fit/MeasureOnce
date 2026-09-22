import { getRetailerGuestFit, RetailerDemoInputError } from "@/lib/retailer-demo/fit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = await request.json().catch(() => { throw new RetailerDemoInputError(); });
    return Response.json(getRetailerGuestFit(body), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof RetailerDemoInputError ? error.message : "Unable to run the retailer fit check.";
    return Response.json({ error: message }, { status: error instanceof RetailerDemoInputError ? 400 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
