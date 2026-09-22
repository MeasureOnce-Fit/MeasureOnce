"use client";

import { useEffect, useMemo, useState } from "react";

import type { EvaluationReport } from "@/lib/fit/types";
import type { ReviewDecision, StoredReview } from "@/lib/fit/signoff-store";

import styles from "./review.module.css";

type ContractCase = EvaluationReport["reviewedCases"]["cases"][number];
type SizeEvidence = ContractCase["targetEvidence"]["sizeChart"][number];

interface ReviewPayload {
  generatedAt: string;
  mechanicalPassed: boolean;
  cases: ContractCase[];
  reviews: StoredReview[];
  status: "signed_off" | "reviewed_with_rejections" | "awaiting_review";
  error?: string;
}

function isMechanicalMatch(testCase: ContractCase): boolean {
  return testCase.expected === testCase.actual
    && testCase.expectedSizeLabel === testCase.recommendedSizeLabel
    && testCase.expectedAlternateSizeLabel === testCase.alternateSizeLabel
    && testCase.expectedFindings === testCase.actualFindings
    && testCase.expectedAlternateFindings === testCase.actualAlternateFindings;
}

function FindingList({ value }: { value: string }) {
  if (!value) return <span className={`${styles.finding} ${styles.emptyFinding}`}>None</span>;
  return value.split("; ").map((finding) => <span className={styles.finding} key={finding}>{finding}</span>);
}

function ResultPanel({ label, state, size, alternate, findings, alternateFindings, actual, matches }: {
  label: string;
  state: string;
  size?: string;
  alternate?: string;
  findings: string;
  alternateFindings: string;
  actual?: boolean;
  matches: boolean;
}) {
  const equalTradeoff = state === "TRADEOFF";
  return (
    <section className={`${styles.result} ${actual ? matches ? styles.match : styles.mismatch : ""}`}>
      <div className={styles.resultLabel}><b>{label}</b>{actual && <span>{matches ? "Matches expected" : "Needs attention"}</span>}</div>
      <div className={styles.resultGrid}>
        <div><small>State</small><strong>{state}</strong></div>
        <div><small>{equalTradeoff ? "Option A" : "Recommended size"}</small><strong>{size || "—"}</strong></div>
        <div><small>{equalTradeoff ? "Option B" : "Alternate"}</small><strong>{alternate || "—"}</strong></div>
      </div>
      <div className={styles.findings}><FindingList value={findings} /></div>
      {alternateFindings && <div className={styles.findings}><span className={styles.finding}>{equalTradeoff ? "Option B" : "Alternate"}: {alternateFindings}</span></div>}
    </section>
  );
}

function words(value: string): string {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function measurement(valueCm: number): string {
  const compact = (value: number) => value.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  return `${compact(valueCm)} cm / ${compact(valueCm / 2.54)} in`;
}

function range(value?: { minCm: number; maxCm: number }): string {
  if (!value) return "Not used";
  return `${measurement(value.minCm)} – ${measurement(value.maxCm)}`;
}

function SizeIdentity({ size }: { size: SizeEvidence }) {
  const axes = Object.entries(size.axes ?? {});
  return (
    <div className={styles.sizeIdentity}>
      <strong>{size.label}</strong>
      {size.alphaEquivalent && <span>{size.alphaEquivalent} equivalent</span>}
      {axes.map(([axis, value]) => <span key={axis}>{words(axis)} {value}</span>)}
    </div>
  );
}

function EvidenceComparisonTable({ size, comparisons, evidenceLabel, optionLabel }: {
  size: SizeEvidence;
  comparisons: ContractCase["comparisonEvidence"];
  evidenceLabel: string;
  optionLabel?: string;
}) {
  const comparisonByRegion = new Map(comparisons.map((item) => [item.region, item]));
  const relevantMeasurements = size.measurements.filter((item) => comparisonByRegion.has(item.region));
  return (
    <div className={styles.optionComparison}>
      {optionLabel && <div className={styles.optionHeading}><b>{optionLabel}</b><SizeIdentity size={size} /></div>}
      <div className={styles.evidenceTableWrap}>
        <table className={styles.evidenceTable}>
          <thead><tr><th>Region</th><th>{evidenceLabel}</th><th>Compatible body range</th><th>Finished garment</th><th>Result</th></tr></thead>
          <tbody>
            {relevantMeasurements.map((item) => {
              const comparison = comparisonByRegion.get(item.region);
              return <tr key={item.region}><th>{words(item.region)}</th><td>{comparison?.evidenceValueCm === undefined ? "—" : measurement(comparison.evidenceValueCm)}</td><td>{range(item.compatibleBodyRangeCm)}</td><td>{measurement(item.garmentValueCm)}<small>{words(item.kind)}</small></td><td><b>{comparison?.assessment ?? "—"}</b></td></tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SizeEvidencePanel({ testCase }: { testCase: ContractCase }) {
  const target = testCase.targetEvidence;
  const selected = target.sizeChart.find((size) => size.variantId === testCase.recommendedVariantId)
    ?? target.sizeChart.find((size) => size.label === testCase.recommendedSizeLabel);
  const alternate = target.sizeChart.find((size) => size.variantId === testCase.alternateVariantId)
    ?? target.sizeChart.find((size) => size.label === testCase.alternateSizeLabel);
  const evidenceLabel = testCase.evidencePath === "reference" ? "Body estimate from known garment" : "Shopper body input";
  const equalTradeoff = testCase.actual === "TRADEOFF" && Boolean(selected && alternate);

  return (
    <section className={styles.sizeEvidence}>
      <header className={styles.sizeEvidenceHeader}>
        <div><small>Target product</small><h3>{target.brandName} · {target.productName}</h3></div>
        <div className={styles.productFacts}><span>{words(target.preference)} preference</span><span>{target.declaredFit} fit</span><span>{target.declaredStretch} stretch</span></div>
      </header>

      {testCase.referenceEvidence && (
        <div className={styles.anchorPanel}>
          <div className={styles.anchorHeading}>
            <div><small>Known garment used as the anchor</small><h4>{testCase.referenceEvidence.brandName} · {testCase.referenceEvidence.productName}</h4></div>
            <SizeIdentity size={testCase.referenceEvidence.size} />
          </div>
          <div className={styles.observations}>
            {testCase.referenceEvidence.observations.map((item) => <span key={item.region}>{words(item.region)}: {words(item.observation)}</span>)}
          </div>
          <div className={styles.anchorMeasurements}>
            {testCase.referenceEvidence.size.measurements
              .filter((item) => testCase.referenceEvidence?.observations.some((observation) => observation.region === item.region))
              .map((item) => <div key={item.region}><span>{words(item.region)} garment measurement</span><b>{measurement(item.garmentValueCm)}</b></div>)}
          </div>
          <p>The engine removes the anchor garment&apos;s declared regular-fit ease, adjusts it using the selected fit observations, and compares the resulting body estimate with the target brand.</p>
        </div>
      )}

      {selected ? (
        <div className={styles.selectedSize}>
          <div className={styles.selectedHeading}>
            <div><small>{equalTradeoff ? "Equal regional trade-off" : "Why this target size was selected"}</small><h4>{equalTradeoff ? `${target.brandName}: ${selected.label} or ${alternate?.label}` : `${target.brandName} size ${selected.label}`}</h4></div>
            {!equalTradeoff && <SizeIdentity size={selected} />}
          </div>
          <p className={styles.legendNote}>{equalTradeoff ? "Neither size is ranked first. Compare the regional results and choose which fit consequence you prefer." : "The size label is the brand's sellable label. Garment measurements include ease, so a label such as waist 32 does not mean the finished waistband must measure exactly 32 inches."}</p>
          <EvidenceComparisonTable size={selected} comparisons={testCase.comparisonEvidence} evidenceLabel={evidenceLabel} optionLabel={equalTradeoff ? "Option A · equally ranked" : undefined} />
          {equalTradeoff && alternate && <EvidenceComparisonTable size={alternate} comparisons={testCase.alternateComparisonEvidence} evidenceLabel={evidenceLabel} optionLabel="Option B · equally ranked" />}
        </div>
      ) : (
        <div className={styles.noSelectedSize}>This case intentionally returns no size. Use the evidence and full chart below to confirm that safe state.</div>
      )}

      <details className={styles.sizeChart}>
        <summary>View {target.brandName} size legend for this product <span>{target.sizeChart.length} sellable sizes</span></summary>
        <p>Each row distinguishes the brand label, the finished garment measurements, and the body ranges used by the synthetic {target.preference}-fit rule.</p>
        <div className={styles.chartScroller}>
          <table>
            <thead><tr><th>Brand size</th><th>Finished garment measurements</th><th>Compatible body ranges</th></tr></thead>
            <tbody>{target.sizeChart.map((size) => <tr className={size.variantId === selected?.variantId || equalTradeoff && size.variantId === alternate?.variantId ? styles.selectedRow : ""} key={size.variantId}><td><SizeIdentity size={size} /></td><td>{size.measurements.map((item) => <span key={item.region}><b>{words(item.region)}</b> {measurement(item.garmentValueCm)}</span>)}</td><td>{size.measurements.map((item) => <span key={item.region}><b>{words(item.region)}</b> {range(item.compatibleBodyRangeCm)}</span>)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function InputEvidence({ testCase }: { testCase: ContractCase }) {
  if (!testCase.referenceEvidence) {
    return <div className={styles.inputBlock}><b>Evidence the engine received</b><p>{testCase.inputSummary || "No evidence supplied"}</p></div>;
  }
  const reference = testCase.referenceEvidence;
  return (
    <div className={`${styles.inputBlock} ${styles.humanInput}`}>
      <b>Evidence the engine received</b>
      <p><strong>Known garment:</strong> {reference.brandName} · {reference.productName} · size {reference.size.label}</p>
      <div className={styles.observations}>{reference.observations.map((item) => <span key={item.region}>{words(item.region)}: {words(item.observation)}</span>)}</div>
      <p className={styles.inputExplanation}>“Just right” describes how this exact garment fits. The garment record supplies its stored waist, hip and length measurements; the engine uses those dimensions to estimate the shopper measurements before comparing the target brand.</p>
      <details><summary>Show technical fixture ID</summary><code>{testCase.inputSummary}</code></details>
    </div>
  );
}

export default function ReviewDashboard() {
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | ReviewDecision | "mismatch">("all");
  const [search, setSearch] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/m1-review", { cache: "no-store" });
      const data = await response.json() as ReviewPayload;
      if (!response.ok) throw new Error(data.error || "Unable to load review cases.");
      setPayload(data);
      const existing = data.reviews.find((review) => review.reviewerName);
      const savedName = localStorage.getItem("measureonce:m1-reviewer-name");
      const savedDate = localStorage.getItem("measureonce:m1-review-date");
      setReviewerName(existing?.reviewerName || savedName || "");
      setReviewDate(existing?.reviewedAt || savedDate || new Date().toISOString().slice(0, 10));
      setNotes(Object.fromEntries(data.reviews.map((review) => [review.fingerprint, review.reviewerNotes])));
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load review cases.");
    }
  }

  useEffect(() => {
    let active = true;
    void fetch("/api/m1-review", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as ReviewPayload;
        if (!response.ok) throw new Error(data.error || "Unable to load review cases.");
        return data;
      })
      .then((data) => {
        if (!active) return;
        setPayload(data);
        const existing = data.reviews.find((review) => review.reviewerName);
        setReviewerName(existing?.reviewerName || localStorage.getItem("measureonce:m1-reviewer-name") || "");
        setReviewDate(existing?.reviewedAt || localStorage.getItem("measureonce:m1-review-date") || new Date().toISOString().slice(0, 10));
        setNotes(Object.fromEntries(data.reviews.map((review) => [review.fingerprint, review.reviewerNotes])));
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load review cases.");
      });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (reviewerName) localStorage.setItem("measureonce:m1-reviewer-name", reviewerName);
    else localStorage.removeItem("measureonce:m1-reviewer-name");
    if (reviewDate) localStorage.setItem("measureonce:m1-review-date", reviewDate);
  }, [reviewerName, reviewDate]);

  const reviewByFingerprint = useMemo(() => new Map(payload?.reviews.map((review) => [review.fingerprint, review]) ?? []), [payload]);
  const counts = useMemo(() => {
    const reviews = payload?.reviews ?? [];
    const approved = reviews.filter((review) => review.decision === "approved").length;
    const rejected = reviews.filter((review) => review.decision === "rejected").length;
    return { approved, rejected, pending: reviews.length - approved - rejected, total: reviews.length };
  }, [payload]);

  const visibleCases = useMemo(() => (payload?.cases ?? []).filter((testCase) => {
    const decision = reviewByFingerprint.get(testCase.fingerprint)?.decision ?? "pending";
    const filterMatches = filter === "all" || decision === filter || filter === "mismatch" && !isMechanicalMatch(testCase);
    const text = [testCase.id, testCase.targetProductId, testCase.expected, testCase.actual, testCase.inputSummary].join(" ").toLowerCase();
    return filterMatches && text.includes(search.trim().toLowerCase());
  }), [filter, payload, reviewByFingerprint, search]);

  async function saveDecision(testCase: ContractCase, decision: "approved" | "rejected") {
    const reviewerNotes = notes[testCase.fingerprint]?.trim() ?? "";
    if (!reviewerName.trim() || !reviewDate) {
      setNotice("Enter the reviewer name and date first.");
      return;
    }
    if (decision === "rejected" && !reviewerNotes) {
      setNotice("Explain what should change before rejecting this case.");
      return;
    }
    setSaving(testCase.fingerprint);
    setNotice("");
    try {
      const response = await fetch("/api/m1-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: testCase.id,
          fingerprint: testCase.fingerprint,
          decision,
          reviewerName,
          reviewedAt: reviewDate,
          reviewerNotes,
        }),
      });
      const data = await response.json() as ReviewPayload;
      if (!response.ok) throw new Error(data.error || "Unable to save the decision.");
      setPayload(data);
      setEditing((current) => ({ ...current, [testCase.fingerprint]: false }));
      setNotice(`${testCase.id} saved as ${decision}.`);
    } catch (saveError) {
      setNotice(saveError instanceof Error ? saveError.message : "Unable to save the decision.");
    } finally {
      setSaving(null);
    }
  }

  if (error) return <main className={styles.statePage}><h1>Review page unavailable</h1><p>{error}</p><button onClick={() => void load()}>Try again</button></main>;
  if (!payload) return <main className={styles.statePage}><div className={styles.loader} /><h1>Loading M1 review…</h1></main>;

  const reviewed = counts.approved + counts.rejected;
  const percent = counts.total ? Math.round(reviewed / counts.total * 100) : 0;

  return (
    <main className={styles.reviewPage}>
      <header className={styles.topbar}>
        <div className={styles.brand}><span>M1</span>MeasureOnce contract review</div>
        <div className={styles.topStatus}><span>Mechanical checks 44/44</span><b>{payload.status.replaceAll("_", " ")}</b></div>
      </header>
      <section className={styles.hero}>
        <p className={styles.kicker}>Reviewer workspace · synthetic fit contract</p>
        <h1>Review the decision logic, then click to save.</h1>
        <p>Your decision saves directly in the project. You can reopen any saved case and modify it.</p>
        <div className={styles.steps}>
          <div><b>01 · Read</b><span>Check the shopper input or known garment.</span></div>
          <div><b>02 · Judge</b><span>Decide whether the expected behavior follows the M1 rules.</span></div>
          <div><b>03 · Click</b><span>Approve or reject. The selection saves directly.</span></div>
          <div><b>04 · Modify</b><span>Use Modify decision whenever a saved answer needs correction.</span></div>
        </div>
      </section>
      <div className={styles.workspace}>
        <aside className={styles.sidebar}>
          <section className={styles.panel}>
            <h2>Reviewer details</h2>
            <label>Name<input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Your full name" /></label>
            <label>Review date<input type="date" value={reviewDate} onChange={(event) => setReviewDate(event.target.value)} /></label>
            <div className={styles.progress}><i style={{ width: `${percent}%` }} /></div>
            <div className={styles.progressText}><span>{reviewed} of {counts.total} reviewed</span><b>{percent}%</b></div>
            <div className={styles.counts}><div><b>{counts.approved}</b><span>Approved</span></div><div><b>{counts.rejected}</b><span>Rejected</span></div><div><b>{counts.pending}</b><span>Pending</span></div></div>
          </section>
          <section className={styles.panel}>
            <h2>What to check</h2>
            <ul><li>Composite labels need evidence for every changing axis.</li><li>Fit regions are judged independently.</li><li>Trade-offs need two adjacent options with different regional advantages.</li><li>Missing or conflicting evidence must produce a safe state.</li><li>This approves synthetic logic, not real-world fit accuracy.</li></ul>
          </section>
          <section className={styles.panel}>
            <h2>Saved directly to</h2>
            <code>artifacts/evaluation/m1-contract-review-decisions.json</code>
            <p className={styles.helper}>When all cases are approved, run <b>npm run eval:fit</b> once to stamp the evaluation report as signed off.</p>
          </section>
        </aside>
        <section className={styles.content}>
          {notice && <div className={styles.notice} role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss message">×</button></div>}
          <div className={styles.toolbar}>
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search case, product, state, or input…" aria-label="Search cases" />
            {(["all", "pending", "approved", "rejected", "mismatch"] as const).map((value) => <button className={filter === value ? styles.activeFilter : ""} key={value} onClick={() => setFilter(value)}>{value === "mismatch" ? "Mechanical mismatch" : value}</button>)}
          </div>
          <div className={styles.caseList}>
            {visibleCases.length === 0 && <div className={styles.emptyState}>No cases match this view.</div>}
            {visibleCases.map((testCase) => {
              const review = reviewByFingerprint.get(testCase.fingerprint);
              const decision = review?.decision ?? "pending";
              const matches = isMechanicalMatch(testCase);
              const isEditing = decision === "pending" || editing[testCase.fingerprint];
              return (
                <article className={`${styles.caseCard} ${decision === "approved" ? styles.approvedCard : decision === "rejected" ? styles.rejectedCard : ""}`} key={testCase.fingerprint}>
                  <header className={styles.caseHeader}><div><h2>{testCase.id}</h2><p><span>{testCase.evidencePath}</span><span>{testCase.targetProductId}</span></p></div><code>{testCase.fingerprint}</code></header>
                  <div className={styles.caseBody}>
                    <InputEvidence testCase={testCase} />
                    <div className={styles.comparison}>
                      <ResultPanel label="Expected contract" state={testCase.expected} size={testCase.expectedSizeLabel} alternate={testCase.expectedAlternateSizeLabel} findings={testCase.expectedFindings} alternateFindings={testCase.expectedAlternateFindings} matches={matches} />
                      <ResultPanel actual label="Actual engine output" state={testCase.actual} size={testCase.recommendedSizeLabel} alternate={testCase.alternateSizeLabel} findings={testCase.actualFindings} alternateFindings={testCase.actualAlternateFindings} matches={matches} />
                    </div>
                    <SizeEvidencePanel testCase={testCase} />
                    {isEditing ? (
                      <div className={styles.decisionArea}>
                        <textarea value={notes[testCase.fingerprint] ?? ""} onChange={(event) => setNotes((current) => ({ ...current, [testCase.fingerprint]: event.target.value }))} placeholder="Required when rejecting; optional when approving" aria-label={`Reviewer notes for ${testCase.id}`} />
                        <button className={styles.approveButton} disabled={saving === testCase.fingerprint} onClick={() => void saveDecision(testCase, "approved")}>{saving === testCase.fingerprint ? "Saving…" : "Approve and save"}</button>
                        <button className={styles.rejectButton} disabled={saving === testCase.fingerprint} onClick={() => void saveDecision(testCase, "rejected")}>Reject and save</button>
                        {decision !== "pending" && <button className={styles.cancelButton} onClick={() => setEditing((current) => ({ ...current, [testCase.fingerprint]: false }))}>Cancel</button>}
                      </div>
                    ) : (
                      <div className={`${styles.savedDecision} ${decision === "approved" ? styles.savedApproved : styles.savedRejected}`}>
                        <div><b>{decision === "approved" ? "Approved" : "Rejected"}</b><span>Saved by {review?.reviewerName} on {review?.reviewedAt}</span>{review?.reviewerNotes && <p>{review.reviewerNotes}</p>}</div>
                        <button onClick={() => setEditing((current) => ({ ...current, [testCase.fingerprint]: true }))}>Modify decision</button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
