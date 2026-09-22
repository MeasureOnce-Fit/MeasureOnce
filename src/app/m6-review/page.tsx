import type { Metadata } from "next";
import Link from "next/link";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import styles from "./m6-review.module.css";

export const metadata: Metadata = {
  title: "M6 Evaluation Review · MeasureOnce",
  description: "Synthetic baseline evaluation evidence for MeasureOnce.",
};
export const dynamic = "force-dynamic";

type BaselineReport = {
  generatedAt: string;
  dataset: { brands: number; styles: number; variants: number; baseProfiles: number; profilePreferenceCases: number };
  generatedCoverage: { total: number; byState: Record<string, number> };
  catalogValidation: { passed: boolean };
  contractReview: { total: number; passed: number; reviewStatus: string };
  comparatorReport: { note: string; systems: Array<{ name: string; stateAgreement: number; recommendationCoverage: number; conditionalStateAgreement: number }>; exactSize: { cases: number; candidate: { agreement: number }; middleLabelPrior: { agreement: number } } };
  heldOutPartition: { brandHoldout: { styleCount: number }; styleHoldout: { styleCount: number } };
  heldOutEvaluation: { cases: number; stateAgreement: number };
  slices: Array<{ slice: string; cases: number; stateAgreement: number }>;
};

function readReport(): BaselineReport {
  const path = join(process.cwd(), "artifacts", "evaluation", "m6-baseline-evaluation.json");
  return JSON.parse(readFileSync(path, "utf8")) as BaselineReport;
}

export default function M6ReviewPage() {
  const report = readReport();
  const slices = report.slices ?? [];
  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.wordmark}>MEASURE<span>ONCE</span></Link><nav><Link href="/m5-review">M5 review</Link><Link href="/retailer-demo">Working retailer</Link></nav></header>
    <section className={styles.intro}><p className={styles.eyebrow}>M6 · SYNTHETIC EVALUATION</p><h1>Evidence before<br /><em>model claims.</em></h1><p className={styles.lede}>This page reads the latest baseline artifact. It measures deterministic software behaviour against versioned synthetic fixtures; it is not a physical fit study.</p></section>
    <section className={styles.banner}><b>BASELINE ONLY · SYNTHETIC</b><span>Generated {new Date(report.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span></section>
    <section className={styles.metrics} aria-label="Evaluation dataset summary">
      <article><small>BRANDS</small><strong>{report.dataset.brands}</strong><span>fictional</span></article>
      <article><small>STYLES</small><strong>{report.dataset.styles}</strong><span>catalog records</span></article>
      <article><small>VARIANTS</small><strong>{report.dataset.variants}</strong><span>sellable sizes</span></article>
      <article><small>EXECUTIONS</small><strong>{report.generatedCoverage.total}</strong><span>synthetic cases</span></article>
    </section>
    <section className={styles.evidence}><div><p className={styles.eyebrow}>MECHANICAL EVIDENCE</p><h2>What the run can prove.</h2></div><div className={styles.list}><p><b>{report.catalogValidation.passed ? "Passed" : "Failed"}</b> catalog validation</p><p><b>{report.contractReview.passed}/{report.contractReview.total}</b> contract cases passed</p><p><b>{report.dataset.baseProfiles}</b> base profiles across <b>{report.dataset.profilePreferenceCases}</b> preference cases</p><p><b>{report.contractReview.reviewStatus.replaceAll("_", " ")}</b> collaborator review status</p></div></section>
    <section className={styles.states}><p className={styles.eyebrow}>RESULT STATES</p><div>{Object.entries(report.generatedCoverage.byState).map(([state, count]) => <article key={state}><span>{state.replaceAll("_", " ")}</span><b>{count}</b></article>)}</div></section>
    <section className={styles.evidence}><div><p className={styles.eyebrow}>COMPARATOR SLICE · STATE LEVEL ONLY</p><h2>Does the engine handle safe states better than always answering?</h2><p className={styles.lede}>{report.comparatorReport.note}</p></div><div className={styles.list}>{report.comparatorReport.systems.map((system) => <p key={system.name}><b>{system.name}</b><br />Agreement {(system.stateAgreement * 100).toFixed(1)}% · Coverage {(system.recommendationCoverage * 100).toFixed(1)}% · Conditional agreement {(system.conditionalStateAgreement * 100).toFixed(1)}%</p>)}<p><b>Exact sellable-label agreement</b><br />MeasureOnce {(report.comparatorReport.exactSize.candidate.agreement * 100).toFixed(1)}% · middle-label prior {(report.comparatorReport.exactSize.middleLabelPrior.agreement * 100).toFixed(1)}% across {report.comparatorReport.exactSize.cases} reviewed cases.</p><p><b>Held-out execution</b><br />{report.heldOutPartition.brandHoldout.styleCount} brand-holdout styles · {report.heldOutPartition.styleHoldout.styleCount} style-holdout styles · {report.heldOutEvaluation.cases} reviewed cases · {(report.heldOutEvaluation.stateAgreement * 100).toFixed(1)}% state agreement.</p></div></section>
    <section className={styles.states}><p className={styles.eyebrow}>CATEGORY SLICES · STATE AGREEMENT</p><div>{slices.length > 0 ? slices.map((slice) => <article key={slice.slice}><span>{slice.slice}</span><b>{(slice.stateAgreement * 100).toFixed(1)}%</b><small>{slice.cases} reviewed cases</small></article>) : <article><span>Awaiting refreshed artifact</span><b>—</b><small>Run npm run eval:m6</small></article>}</div></section>
    <section className={styles.boundary}><p className={styles.eyebrow}>INTERPRETATION BOUNDARY</p><h2>No physical-fit or business-impact claim is made here.</h2><p>The report does not measure return reduction, conversion, margin, production calibration, or how clothing fits real people. A learned model remains out of scope until independent outcome labels exist.</p><Link href="/m5-review">Review the retailer safety states →</Link></section>
  </main>;
}
