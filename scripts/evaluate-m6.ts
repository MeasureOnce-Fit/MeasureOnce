import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildSyntheticCatalog, evaluateM1 } from "../src/lib/fit";

const outputDirectory = join(process.cwd(), "artifacts", "evaluation");
mkdirSync(outputDirectory, { recursive: true });

const catalog = buildSyntheticCatalog();
const report = evaluateM1(catalog);
const cases = report.reviewedCases.cases;
const recommendable = (state: string) => state === "RECOMMENDED" || state === "TRADEOFF";
function stateComparator(name: string, states: string[]) {
  const correct = states.filter((state, index) => state === cases[index]?.expected).length;
  const covered = states.filter(recommendable).length;
  const coveredCorrect = states.filter((state, index) => recommendable(state) && state === cases[index]?.expected).length;
  return {
    name,
    metricScope: "state_level_only",
    cases: states.length,
    stateAgreement: correct / Math.max(states.length, 1),
    recommendationCoverage: covered / Math.max(states.length, 1),
    conditionalStateAgreement: coveredCorrect / Math.max(covered, 1),
  };
}
const comparatorReport = {
  note: "These comparators score expected result states only. They do not score the exact sellable size or physical fit.",
  systems: [
    stateComparator("MeasureOnce deterministic engine", cases.map((testCase) => testCase.actual)),
    stateComparator("Always-answer RECOMMENDED baseline", cases.map(() => "RECOMMENDED")),
  ],
  exactSize: (() => {
    const sizeCases = cases.filter((testCase) => testCase.expectedSizeLabel && testCase.recommendedSizeLabel);
    const candidateCorrect = sizeCases.filter((testCase) => testCase.recommendedSizeLabel === testCase.expectedSizeLabel).length;
    const middleLabel = (testCase: typeof cases[number]) => {
      const available = testCase.targetEvidence.sizeChart.filter((size) => size.available);
      return available[Math.floor(available.length / 2)]?.label;
    };
    const priorCorrect = sizeCases.filter((testCase) => middleLabel(testCase) === testCase.expectedSizeLabel).length;
    return {
      metricScope: "exact_sellable_label_on_reviewed_cases",
      cases: sizeCases.length,
      candidate: { correct: candidateCorrect, agreement: candidateCorrect / Math.max(sizeCases.length, 1) },
      middleLabelPrior: { correct: priorCorrect, agreement: priorCorrect / Math.max(sizeCases.length, 1) },
    };
  })(),
};
const heldOutStyleIds = catalog.styles.filter((_, index) => index % 10 === 0).map((style) => style.productId);
const heldOutBrandId = "brand_10";
const heldOutStyleSet = new Set(heldOutStyleIds);
const styleById = new Map(catalog.styles.map((style) => [style.productId, style]));
const heldOutCases = cases.filter((testCase) => {
  const style = styleById.get(testCase.targetProductId);
  return style && (style.brandId === heldOutBrandId || heldOutStyleSet.has(style.productId));
});
const heldOutCorrect = heldOutCases.filter((testCase) => testCase.actual === testCase.expected).length;
const sliceGroups = new Map<string, typeof cases>();
for (const testCase of cases) {
  const style = styleById.get(testCase.targetProductId);
  if (!style) continue;
  const key = `${style.department} · ${style.merchandisingCategory}`;
  sliceGroups.set(key, [...(sliceGroups.get(key) ?? []), testCase]);
}
const slices = [...sliceGroups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([slice, sliceCases]) => ({
  slice,
  cases: sliceCases.length,
  stateAgreement: sliceCases.filter((testCase) => testCase.actual === testCase.expected).length / sliceCases.length,
}));
const output = {
  protocolVersion: "m6-baseline-0.1",
  generatedAt: new Date().toISOString(),
  status: "baseline_only",
  synthetic: true,
  learnedModel: { evaluated: false, reason: "No independent garment-fit outcome labels are available." },
  calibration: { evaluated: false, reason: "The product does not expose a probability and no observed outcomes exist." },
  dataset: report.dataset,
  catalogValidation: report.validation,
  generatedCoverage: report.generatedCoverage,
  contractReview: {
    total: report.reviewedCases.total,
    passed: report.reviewedCases.passed,
    failed: report.reviewedCases.failed.length,
    reviewStatus: report.reviewedCases.reviewStatus,
  },
  comparatorReport,
  heldOutPartition: {
    status: "partition_manifest_only",
    brandHoldout: { brandId: heldOutBrandId, styleCount: catalog.styles.filter((style) => style.brandId === heldOutBrandId).length },
    styleHoldout: { rule: "catalog style index modulo 10 equals zero", styleCount: heldOutStyleIds.length },
    note: "This run records the grouped split manifest; held-out comparator execution is the next evaluation slice.",
  },
  heldOutEvaluation: {
    status: "executed_on_reviewed_contract_cases",
    cases: heldOutCases.length,
    stateAgreement: heldOutCorrect / Math.max(heldOutCases.length, 1),
    note: "This slice is small because the current literal review set was not designed as a power-calculated held-out sample.",
  },
  slices,
  claims: [
    "Synthetic deterministic replay is measured by the existing contract and generated coverage checks.",
    "Physical fit accuracy, returns, conversion, margin, and production calibration are not measured.",
  ],
};

const jsonPath = join(outputDirectory, "m6-baseline-evaluation.json");
const markdownPath = join(outputDirectory, "m6-baseline-evaluation.md");
writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`, "utf8");
writeFileSync(markdownPath, `# MeasureOnce M6 baseline evaluation\n\nGenerated: ${output.generatedAt}\n\n` +
  `Status: **baseline only · synthetic**\n\n` +
  `This report measures deterministic software behaviour. It does not measure physical fit accuracy or business impact.\n\n` +
  `## Dataset\n\n| Field | Value |\n| --- | ---: |\n` +
  `| Synthetic brands | ${output.dataset.brands} |\n` +
  `| Styles | ${output.dataset.styles} |\n` +
  `| Variants | ${output.dataset.variants} |\n` +
  `| Base profiles | ${output.dataset.baseProfiles} |\n` +
  `| Profile/preference cases | ${output.dataset.profilePreferenceCases} |\n` +
  `| Generated executions | ${output.generatedCoverage.total} |\n\n` +
  `## Mechanical evidence\n\n` +
  `- Catalog validation: **${output.catalogValidation.passed ? "passed" : "failed"}**\n` +
  `- Contract cases: **${output.contractReview.passed}/${output.contractReview.total} passed**\n` +
  `- Contract review status: **${output.contractReview.reviewStatus.replaceAll("_", " ")}**\n` +
  `- Learned model: **not evaluated**\n` +
  `- Probability calibration: **not evaluated**\n\n` +
  `## State-level comparator slice\n\n` +
  `${output.comparatorReport.note}\n\n` +
  `| System | State agreement | Recommendation coverage | Conditional state agreement |\n| --- | ---: | ---: | ---: |\n` +
  output.comparatorReport.systems.map((system) => `| ${system.name} | ${(system.stateAgreement * 100).toFixed(1)}% | ${(system.recommendationCoverage * 100).toFixed(1)}% | ${(system.conditionalStateAgreement * 100).toFixed(1)}% |`).join("\n") +
  `\n\n` +
  `Exact sellable-label agreement on ${output.comparatorReport.exactSize.cases} reviewed cases: **${(output.comparatorReport.exactSize.candidate.agreement * 100).toFixed(1)}%** for MeasureOnce versus **${(output.comparatorReport.exactSize.middleLabelPrior.agreement * 100).toFixed(1)}%** for the middle-label prior. This is synthetic contract evidence, not physical-fit accuracy.\n\n` +
  `Held-out split manifest: ${output.heldOutPartition.brandHoldout.styleCount} styles in brand holdout; ${output.heldOutPartition.styleHoldout.styleCount} styles in style holdout. Reviewed-case slice: **${output.heldOutEvaluation.cases} cases**, state agreement **${(output.heldOutEvaluation.stateAgreement * 100).toFixed(1)}%**. ${output.heldOutEvaluation.note}\n\n` +
  `Category slices (state agreement): ${output.slices.map((slice) => `${slice.slice} ${slice.cases} cases/${(slice.stateAgreement * 100).toFixed(1)}%`).join(" · ")}\n\n` +
  `## Interpretation boundary\n\n` +
  `All values are synthetic. This artifact does not support claims about physical fit, return reduction, conversion, margin, or production readiness.\n`, "utf8");

console.log(JSON.stringify({ jsonPath, markdownPath, status: output.status, synthetic: output.synthetic }, null, 2));
