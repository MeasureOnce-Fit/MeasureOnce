import { listProfileCategorySizeReferences } from "@/lib/fit/category-size-reference";

const departments = { women: "Women", men: "Men" } as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const collection = url.searchParams.get("collection");
  const category = url.searchParams.get("category");
  if ((collection !== "women" && collection !== "men") || !category) {
    return Response.json({ error: "Invalid category-size reference request." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  return Response.json(
    { synthetic: true, references: listProfileCategorySizeReferences(departments[collection], category) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
