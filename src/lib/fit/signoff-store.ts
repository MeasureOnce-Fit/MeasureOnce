import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { EvaluationReport } from "./types";

export type ReviewDecision = "pending" | "approved" | "rejected";

export interface StoredReview {
  caseId: string;
  fingerprint: string;
  decision: ReviewDecision;
  reviewerName: string;
  reviewedAt: string;
  reviewerNotes: string;
}

const evaluationDirectory = join(process.cwd(), "artifacts", "evaluation");
const reportPath = join(evaluationDirectory, "m1-fit-evaluation.json");
const signoffPath = join(evaluationDirectory, "m1-contract-case-signoff.csv");
const decisionStorePath = join(evaluationDirectory, "m1-contract-review-decisions.json");

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && quoted && line[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      fields.push(field);
      field = "";
    } else {
      field += character;
    }
  }
  fields.push(field);
  return fields;
}

export function readEvaluationReport(): EvaluationReport {
  return JSON.parse(readFileSync(reportPath, "utf8")) as EvaluationReport;
}

function readStoredRows(): Map<string, StoredReview> {
  if (existsSync(decisionStorePath)) {
    const reviews = JSON.parse(readFileSync(decisionStorePath, "utf8")) as StoredReview[];
    return new Map(reviews.map((review) => [review.caseId, review]));
  }
  const lines = readFileSync(signoffPath, "utf8").split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0] ?? "");
  if (header[1] !== "case_fingerprint") return new Map();
  return new Map(lines.slice(1).map(parseCsvLine).map((row) => {
    const decision = row[2] === "approved" || row[2] === "rejected" ? row[2] : "pending";
    const review: StoredReview = {
      caseId: row[0] ?? "",
      fingerprint: row[1] ?? "",
      decision,
      reviewerName: row[3] ?? "",
      reviewedAt: row[4] ?? "",
      reviewerNotes: row[5] ?? "",
    };
    return [review.caseId, review];
  }));
}

export function currentReviews(report = readEvaluationReport()): StoredReview[] {
  const stored = readStoredRows();
  return report.reviewedCases.cases.map((testCase) => {
    const existing = stored.get(testCase.id);
    if (!existing || existing.fingerprint !== testCase.fingerprint) {
      return {
        caseId: testCase.id,
        fingerprint: testCase.fingerprint,
        decision: "pending",
        reviewerName: "",
        reviewedAt: "",
        reviewerNotes: "",
      };
    }
    return existing;
  });
}

export function saveReview(input: {
  caseId: string;
  fingerprint: string;
  decision: Exclude<ReviewDecision, "pending">;
  reviewerName: string;
  reviewedAt: string;
  reviewerNotes: string;
}): StoredReview[] {
  const report = readEvaluationReport();
  const currentCase = report.reviewedCases.cases.find((testCase) => testCase.id === input.caseId);
  if (!currentCase || currentCase.fingerprint !== input.fingerprint) {
    throw new Error("This case changed after the page was opened. Refresh before reviewing it.");
  }
  const reviewerName = input.reviewerName.trim();
  const reviewedAt = input.reviewedAt.trim();
  const reviewerNotes = input.reviewerNotes.trim();
  if (!reviewerName || !/^\d{4}-\d{2}-\d{2}$/.test(reviewedAt)) {
    throw new Error("Enter the reviewer name and review date before saving a decision.");
  }
  if (input.decision === "rejected" && !reviewerNotes) {
    throw new Error("Explain what should change before rejecting this case.");
  }

  const reviews = currentReviews(report).map((review) => {
    if (review.caseId === input.caseId) {
      return { ...review, decision: input.decision, reviewerName, reviewedAt, reviewerNotes };
    }
    if (review.decision !== "pending") return { ...review, reviewerName, reviewedAt };
    return review;
  });
  writeFileSync(decisionStorePath, `${JSON.stringify(reviews, null, 2)}\n`, "utf8");
  return reviews;
}
