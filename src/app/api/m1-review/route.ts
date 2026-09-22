import { NextResponse } from "next/server";

import { currentReviews, readEvaluationReport, saveReview } from "@/lib/fit/signoff-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function responsePayload() {
  const report = readEvaluationReport();
  const reviews = currentReviews(report);
  const approved = reviews.filter((review) => review.decision === "approved").length;
  const rejected = reviews.filter((review) => review.decision === "rejected").length;
  return {
    generatedAt: report.generatedAt,
    mechanicalPassed: report.validation.passed && report.reviewedCases.failed.length === 0,
    cases: report.reviewedCases.cases,
    reviews,
    status: approved === reviews.length ? "signed_off" : approved + rejected === reviews.length ? "reviewed_with_rejections" : "awaiting_review",
  };
}

export async function GET() {
  try {
    return NextResponse.json(responsePayload(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load the M1 review." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const input = await request.json() as Parameters<typeof saveReview>[0];
    saveReview(input);
    return NextResponse.json(responsePayload(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save the review." }, { status: 400 });
  }
}

