import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildSyntheticCatalog, evaluateM1 } from "../src/lib/fit";

const outputDirectory = join(process.cwd(), "artifacts", "evaluation");
mkdirSync(outputDirectory, { recursive: true });

const jsonPath = join(outputDirectory, "m1-fit-evaluation.json");
const markdownPath = join(outputDirectory, "m1-fit-evaluation.md");
const reviewPath = join(outputDirectory, "m1-contract-case-review.csv");
const signoffPath = join(outputDirectory, "m1-contract-case-signoff.csv");
const decisionStorePath = join(outputDirectory, "m1-contract-review-decisions.json");

function writeFileIfChanged(path: string, content: string): void {
  if (existsSync(path) && readFileSync(path, "utf8") === content) return;
  writeFileSync(path, content, "utf8");
}

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

function readSignoff(): { approvedCases: Array<{ caseId: string; fingerprint: string }>; reviewerName?: string; reviewedAt?: string } | undefined {
  if (existsSync(decisionStorePath)) {
    const reviews = JSON.parse(readFileSync(decisionStorePath, "utf8")) as Array<{
      caseId: string;
      fingerprint: string;
      decision: string;
      reviewerName: string;
      reviewedAt: string;
    }>;
    const approved = reviews.filter((review) => review.decision === "approved");
    const completeAttribution = approved.length > 0 && approved.every((review) => review.reviewerName.trim() && review.reviewedAt.trim());
    return {
      approvedCases: approved.map((review) => ({ caseId: review.caseId, fingerprint: review.fingerprint })),
      reviewerName: completeAttribution ? [...new Set(approved.map((review) => review.reviewerName.trim()))].join("; ") : undefined,
      reviewedAt: completeAttribution ? [...new Set(approved.map((review) => review.reviewedAt.trim()))].join("; ") : undefined,
    };
  }
  if (!existsSync(signoffPath)) return undefined;
  const lines = readFileSync(signoffPath, "utf8").split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0] ?? "");
  if (header[1] !== "case_fingerprint") return { approvedCases: [] };
  const rows = lines.slice(1).map(parseCsvLine);
  const approved = rows.filter((row) => row[2]?.trim().toLowerCase() === "approved");
  const completeAttribution = approved.length > 0 && approved.every((row) => row[3]?.trim() && row[4]?.trim());
  return {
    approvedCases: approved.map((row) => ({ caseId: row[0], fingerprint: row[1] })),
    reviewerName: completeAttribution ? [...new Set(approved.map((row) => row[3].trim()))].join("; ") : undefined,
    reviewedAt: completeAttribution ? [...new Set(approved.map((row) => row[4].trim()))].join("; ") : undefined,
  };
}

const report = evaluateM1(buildSyntheticCatalog(), readSignoff());
writeFileIfChanged(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

const stateRows = Object.entries(report.generatedCoverage.byState)
  .map(([state, count]) => `| ${state} | ${count} |`)
  .join("\n");
const limitations = report.limitations.map((limitation) => `- ${limitation}`).join("\n");
const validation = report.validation.passed
  ? "Passed"
  : `Failed\n\n${report.validation.errors.map((error) => `- ${error}`).join("\n")}`;
const reviewRows = report.reviewedCases.cases.map((testCase) => [
  testCase.id,
  testCase.fingerprint,
  testCase.targetProductId,
  testCase.evidencePath,
  testCase.inputSummary,
  testCase.expected,
  testCase.actual,
  testCase.expectedSizeLabel ?? "",
  testCase.recommendedSizeLabel ?? "",
  testCase.expectedAlternateSizeLabel ?? "",
  testCase.alternateSizeLabel ?? "",
  testCase.expectedFindings,
  testCase.actualFindings,
  testCase.expectedAlternateFindings,
  testCase.actualAlternateFindings,
].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","));
writeFileIfChanged(reviewPath, [
  "case_id,case_fingerprint,target_product_id,evidence_path,input_summary,expected_state,actual_state,expected_size,actual_size,expected_alternate_size,actual_alternate_size,expected_findings,actual_findings,expected_alternate_findings,actual_alternate_findings",
  ...reviewRows,
  "",
].join("\n"));

if (!existsSync(signoffPath)) {
  const signoffRows = report.reviewedCases.cases.map((testCase) =>
    `"${testCase.id.replaceAll('"', '""')}","${testCase.fingerprint}","","","",""`,
  );
  writeFileSync(signoffPath, [
    "case_id,case_fingerprint,reviewer_decision,reviewer_name,reviewed_at,reviewer_notes",
    ...signoffRows,
    "",
  ].join("\n"), "utf8");
}

const markdown = `# MeasureOnce M1 Fit Evaluation

Generated: ${report.generatedAt}

## Dataset and validation

| Check | Result |
| --- | ---: |
| Synthetic brands | ${report.dataset.brands} |
| Source styles | ${report.dataset.styles} |
| Size variants | ${report.dataset.variants} |
| Data-only comparison fixtures | ${report.dataset.comparisonFixtures} |
| Navigation categories | ${report.dataset.navigationCategories} |
| Department/category pairs | ${report.dataset.departmentCategoryPairs} |
| Base profiles | ${report.dataset.baseProfiles} |
| Profile/preference cases | ${report.dataset.profilePreferenceCases} |
| Source size positions traced | ${report.dataset.sourceSizePositionsCovered} |
| Catalog validation | ${validation} |

## Generated coverage

${report.generatedCoverage.profileMatrixExecutions} profile/preference/category executions and ${report.generatedCoverage.comparisonFixtureExecutions} executable sparse-category comparisons completed (${report.generatedCoverage.total} total).

| Result state | Count |
| --- | ---: |
${stateRows}

## Contract fixtures

${report.reviewedCases.passed} of ${report.reviewedCases.total} contract fixtures passed.

Review status: **${report.reviewedCases.reviewStatus.replaceAll("_", " ")}**. Each approval is bound to the reviewed case fingerprint. Decisions saved in the M1 review dashboard are stored directly in the project and read by this evaluation; a collaborator must approve every current fingerprint with their name and review date.

## Interpretation boundary

${limitations}
`;

writeFileIfChanged(markdownPath, markdown);

console.log(JSON.stringify({
  mechanicalPassed: report.validation.passed && report.reviewedCases.failed.length === 0,
  reviewStatus: report.reviewedCases.reviewStatus,
  generatedCoverage: report.generatedCoverage.total,
  contractCases: `${report.reviewedCases.passed}/${report.reviewedCases.total}`,
  outputs: [jsonPath, markdownPath, reviewPath, signoffPath],
}, null, 2));

if (!report.validation.passed || report.reviewedCases.failed.length > 0) {
  process.exitCode = 1;
}
