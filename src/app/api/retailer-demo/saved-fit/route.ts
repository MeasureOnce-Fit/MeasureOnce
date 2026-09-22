import { createSavedProfileRecommendationHandler } from "@/lib/fit/saved-profile";
import { createIdentityRouteDependencies } from "@/lib/identity/route-dependencies";
import { RetailerDemoInputError, toSavedProfileFitInput } from "@/lib/retailer-demo/fit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handleSavedFit = createSavedProfileRecommendationHandler(createIdentityRouteDependencies());

export async function POST(request: Request): Promise<Response> {
  try {
    const mapped = toSavedProfileFitInput(await request.json().catch(() => { throw new RetailerDemoInputError(); }));
    const headers = new Headers(request.headers);
    headers.set("content-type", "application/json");
    headers.delete("content-length");
    const response = await handleSavedFit(new Request(request.url, { method: "POST", headers, body: JSON.stringify(mapped.body) }));
    if (!response.ok) return response;
    const payload = await response.json() as { synthetic: true; profile: unknown; result: unknown };
    return Response.json({ synthetic: true, item: mapped.item, profile: payload.profile, result: payload.result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof RetailerDemoInputError ? error.message : "Unable to run the retailer saved-profile fit check.";
    return Response.json({ error: message }, { status: error instanceof RetailerDemoInputError ? 400 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
