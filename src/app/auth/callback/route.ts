import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get("next") === "/fit-passport" ? "/fit-passport" : "/";
  const code = url.searchParams.get("code");
  if (code) {
    try {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(`/account?verified=1&next=${encodeURIComponent(next)}`, url.origin), { headers: { "Cache-Control": "no-store" } });
    } catch { /* Return a recoverable confirmation state without exposing auth errors. */ }
  }
  return NextResponse.redirect(new URL(`/account/signup?confirmation=expired&next=${encodeURIComponent(next)}`, url.origin), { headers: { "Cache-Control": "no-store" } });
}
