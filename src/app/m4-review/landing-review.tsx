"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApprovedWelcome } from "../approved-landing";

import styles from "./landing-review.module.css";

type BrandId = "metric" | "north" | "alder";
type RegionId = "chest" | "waist" | "hip";
type EvidencePath = "garment" | "body";
type Unit = "in" | "cm";
type ResultState = "RECOMMENDED" | "TRADEOFF" | "INSUFFICIENT_PROFILE_EVIDENCE" | "INSUFFICIENT_GARMENT_EVIDENCE" | "CONFLICTING_EVIDENCE" | "NO_SUITABLE_SIZE" | "UNSUPPORTED";

type RecommendationResponse = {
  product: { id: string; name: string; brandId: string; brandName: string; image: string };
  result: {
    state: ResultState;
    recommendedSizeLabel?: string;
    alternateSizeLabel?: string;
    optionPriority?: "equal";
    findings: Array<{ region: string; assessment: string; reason: string }>;
    evidence: { used: string[]; requiredRegions: string[]; supportedRegions: string[]; missingRegions: string[]; completeness: number; referenceVariantId?: string };
    nextSteps: string[];
    versions: Record<string, string>;
  };
};

type LandingProps = {
  mode?: "review" | "production";
  onBrowseShop?: () => void;
  onOpenFitPassport?: () => void;
  shopperName?: string;
  showWelcome?: boolean;
};

const brands: Array<{ id: BrandId; name: string; note: string; targetProductId: string; image: string }> = [
  { id: "metric", name: "Orivelle", note: "Defined waist", targetProductId: "mo-women-001", image: "/products/original/mo-women-001-front.jpg" },
  { id: "north", name: "Norellin", note: "Soft structure", targetProductId: "mo-women-004", image: "/products/original/mo-women-004-front.jpg" },
  { id: "alder", name: "Caelune", note: "Column silhouette", targetProductId: "mo-women-021", image: "/products/original/mo-women-021-front.jpg" },
];

const regions: Record<RegionId, { label: string; value: string; explanation: string; position: string }> = {
  chest: { label: "Chest / bust", value: "Fits as designed", explanation: "The bodice range contains Alex’s normalized chest evidence.", position: "chestPin" },
  waist: { label: "Waist", value: "Comfort allowance", explanation: "The target keeps the regular-fit ease Alex selected at the waist.", position: "waistPin" },
  hip: { label: "Hip", value: "Room to move", explanation: "The skirt shape preserves the hip allowance in Alex’s selected fit.", position: "hipPin" },
};

const faqs = [
  ["Do I need a separate MeasureOnce account?", "No. In the first retailer integration, you sign in with the retailer. MeasureOnce stores the fit profile under that retailer’s verified account identifier."],
  ["Can I use inches or centimetres?", "Yes. MeasureOnce preserves the unit you entered and normalizes values for comparison without repeatedly rounding them."],
  ["What if I do not know my measurements?", "Use a garment that already fits and describe waist, hip or seat, and length independently. You can always use the retailer’s size chart instead."],
  ["Why can the recommended label change by brand?", "Size labels are brand-specific. The comparison uses each item’s synthetic garment measurements and the same saved fit evidence."],
  ["Is the demo proof of real-world fit accuracy?", "No. It proves the software contract with synthetic fixtures. Physical fit accuracy still requires real garment data and shopper validation."],
  ["Can I remove my fit information?", "Yes. The Fit Passport includes profile export, consent controls, and deletion inside the retailer-scoped account."],
];

const stateLabels: Record<ResultState, string> = {
  RECOMMENDED: "Recommended for Alex",
  TRADEOFF: "Two equal fit options",
  INSUFFICIENT_PROFILE_EVIDENCE: "More fit information needed",
  INSUFFICIENT_GARMENT_EVIDENCE: "Garment evidence unavailable",
  CONFLICTING_EVIDENCE: "Fit information needs review",
  NO_SUITABLE_SIZE: "No suitable size found",
  UNSUPPORTED: "Comparison unavailable",
};

function Arrow() { return <span aria-hidden="true">→</span>; }

function LandingSections({ mode = "review", onBrowseShop, onOpenFitPassport, shopperName, showWelcome = true }: LandingProps) {
  const router = useRouter();
  const [brandId, setBrandId] = useState<BrandId>("metric");
  const [unit, setUnit] = useState<Unit>("in");
  const [path, setPath] = useState<EvidencePath>("garment");
  const [region, setRegion] = useState<RegionId>("waist");
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [requestState, setRequestState] = useState<"loading" | "ready" | "error">("loading");
  const [retryCount, setRetryCount] = useState(0);
  const brand = brands.find((item) => item.id === brandId) ?? brands[1];
  const activeRegion = regions[region];
  const isReview = mode === "review";

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/showcase/recommendation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: path === "body" ? "alex-body-dresses" : "alex-known-garment-dresses", targetProductId: brand.targetProductId, unit }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Recommendation request failed (${response.status}).`);
        return response.json() as Promise<RecommendationResponse>;
      })
      .then((payload) => {
        if (!payload?.result?.state || !payload.product) throw new Error("Recommendation response was incomplete.");
        setRecommendation(payload);
        setRequestState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setRecommendation(null);
        setRequestState("error");
      });
    return () => controller.abort();
  }, [brand.targetProductId, path, retryCount, unit]);

  const result = recommendation?.result;
  const resultSize = result?.recommendedSizeLabel ? result.alternateSizeLabel ? `${result.recommendedSizeLabel} / ${result.alternateSizeLabel}` : result.recommendedSizeLabel : "—";
  const resultMessage = result ? result.nextSteps[0] ?? result.findings.map((finding) => finding.reason).filter(Boolean).join(" ") : "The fit service could not return a recommendation. Manual size selection remains available.";
  const findingFor = (id: RegionId) => result?.findings.find((finding) => finding.region === (id === "chest" ? "chest_bust" : id === "hip" ? "hip_seat" : id));
  const findingLabel = (id: RegionId) => findingFor(id)?.assessment.toLowerCase().replaceAll("_", " ") ?? regions[id].value;
  const browseShop = () => onBrowseShop ? onBrowseShop() : window.location.hash = "shop";
  const openPassport = () => onOpenFitPassport ? onOpenFitPassport() : router.push("/fit-passport");
  const selectBrand = (next: BrandId) => { if (next !== brandId) { setRequestState("loading"); setBrandId(next); } };
  const selectPath = (next: EvidencePath) => { if (next !== path) { setRequestState("loading"); setPath(next); } };
  const selectUnit = (next: Unit) => { if (next !== unit) { setRequestState("loading"); setUnit(next); } };
  const retry = () => { setRequestState("loading"); setRetryCount((count) => count + 1); };

  return <>
    {showWelcome && <ApprovedWelcome onSetup={openPassport} onBrowse={browseShop} shopperName={shopperName} />}

    <section className={styles.brandRail} id="designers" aria-label="Fictional demo brands"><div><span>FICTIONAL DEMO CATALOG</span><small>Select a brand to update the comparison</small></div>{brands.map((item) => <button type="button" key={item.id} onClick={() => selectBrand(item.id)} aria-pressed={brandId === item.id} className={brandId === item.id ? styles.brandActive : undefined}><b>{item.name}</b><span>{item.note}</span></button>)}</section>

    <section className={styles.preview} id="preview">
      <div className={styles.sectionHead}><div><p className={styles.eyebrow}>LIVE CONTRACT PREVIEW</p><h2>Same evidence.<br />Brand-specific answer.</h2></div><p>This interactive example calls the same deterministic recommendation engine used by the evaluated fit contract. The inputs and catalog are synthetic.</p></div>
      <div className={styles.previewFrame}>
        <aside className={styles.previewControls}><span className={styles.fixture}>EXAMPLE PROFILE · ALEX</span><h3>How should we compare this dress?</h3><div className={styles.pathTabs}><button type="button" onClick={() => selectPath("garment")} aria-pressed={path === "garment"} className={path === "garment" ? styles.activeTab : undefined}>Known garment</button><button type="button" onClick={() => selectPath("body")} aria-pressed={path === "body"} className={path === "body" ? styles.activeTab : undefined}>Body measurements</button></div>{path === "garment" ? <div className={styles.anchor}><Image src="/products/original/mo-women-004-front.jpg" alt="Reference women’s dress" width={64} height={80} /><div><small>VERIFIED SYNTHETIC CATALOG ITEM</small><b>Aster Wrap Dress</b><span>0 / 2 · chest, waist, and hip fit just right</span></div></div> : <div className={styles.bodyValues}><div><small>CHEST / BUST</small><b>{unit === "in" ? "34.41 in" : "87.40 cm"}</b></div><div><small>WAIST</small><b>{unit === "in" ? "27.88 in" : "70.82 cm"}</b></div><div><small>HIP</small><b>{unit === "in" ? "37.81 in" : "96.04 cm"}</b></div></div>}<div className={styles.controlFooter}><div className={styles.unitToggle} aria-label="Measurement unit"><button type="button" aria-pressed={unit === "in"} className={unit === "in" ? styles.unitActive : undefined} onClick={() => selectUnit("in")}>IN</button><button type="button" aria-pressed={unit === "cm"} className={unit === "cm" ? styles.unitActive : undefined} onClick={() => selectUnit("cm")}>CM</button></div><button type="button" className={styles.edit} onClick={openPassport}>Edit evidence</button></div></aside>
        <article className={styles.previewResult} aria-live="polite" aria-busy={requestState === "loading"}><div className={styles.resultProduct}><Image src={recommendation?.product.image ?? brand.image} alt={`${recommendation?.product.brandName ?? brand.name} dress`} fill sizes="(max-width: 760px) 80vw, 30vw" /></div><div className={styles.resultCopy}><p className={styles.eyebrow}>{(recommendation?.product.brandName ?? brand.name).toUpperCase()} · DRESS</p>{requestState === "loading" ? <><h3 className={styles.loadingMark}>···</h3><b>Checking the fit contract</b><p>Comparing the selected evidence with this garment’s synthetic measurements.</p></> : requestState === "error" ? <><h3>—</h3><b>Recommendation unavailable</b><p>{resultMessage}</p><button type="button" onClick={retry}>Retry comparison <Arrow /></button></> : <><h3>{resultSize}</h3><b>{result ? stateLabels[result.state] : "Recommendation unavailable"}</b><p>{resultMessage || "The selected evidence supports this result."}</p><button type="button" onClick={() => document.getElementById("fit-map")?.scrollIntoView({ behavior: "smooth" })}>Inspect the evidence <Arrow /></button></>}</div></article>
      </div>
    </section>

    <section className={styles.fitMap} id="fit-map"><div className={styles.fitVisual}><div className={styles.fitImageCanvas}><Image src="/products/original/mo-women-001-front.jpg" alt="Dress with selectable fit regions" fill sizes="(max-width: 760px) 78vw, 34vw" />{(Object.keys(regions) as RegionId[]).map((id) => <button key={id} type="button" aria-label={`Inspect ${regions[id].label}`} onClick={() => setRegion(id)} className={`${styles.regionPin} ${styles[regions[id].position]} ${region === id ? styles.pinActive : ""}`}><span>{regions[id].label}</span></button>)}</div></div><div className={styles.fitCopy}><p className={styles.eyebrow}>REGIONAL FIT, NOT ONE SCORE</p><h2>See what fits.<br />See what changes.</h2><p>A size can work at the chest and still need a different waist or hip allowance. MeasureOnce keeps those observations separate.</p><div className={styles.regionDetail}><span>{activeRegion.label}</span><b>{findingLabel(region)}</b><p>{findingFor(region)?.reason ?? activeRegion.explanation}</p></div><ul>{(Object.keys(regions) as RegionId[]).map((id) => <li key={id}><button type="button" onClick={() => setRegion(id)} aria-pressed={region === id}><span>{regions[id].label}</span><b>{findingLabel(id)}</b></button></li>)}</ul></div></section>

    <section className={styles.capabilities} id={isReview ? "how" : "fit"}><div className={styles.sectionHead}><div><p className={styles.eyebrow}>WHAT THE PRODUCT DELIVERS</p><h2>A fit decision you can inspect.</h2></div><p>Each capability links back to evidence or shopper control. Business impact remains a hypothesis until a retailer pilot measures it.</p></div><div className={styles.cardGrid}><article><span>01</span><h3>Saved Fit Passport</h3><p>Reuse category-relevant evidence inside the same retailer account.</p><button type="button" onClick={openPassport}>Open Fit Passport <Arrow /></button></article><article><span>02</span><h3>Cross-brand comparison</h3><p>Translate the same fit needs into each brand’s actual sellable labels.</p><a href="#preview">Try the comparison <Arrow /></a></article><article><span>03</span><h3>Regional explanation</h3><p>Inspect chest, waist, and hip evidence instead of one opaque score.</p><a href="#fit-map">Inspect regions <Arrow /></a></article><article><span>04</span><h3>Safe fallback</h3><p>Ask for missing evidence or return the size chart without blocking shopping.</p>{isReview ? <Link href="/m3-review">Review the questionnaire <Arrow /></Link> : <button type="button" onClick={openPassport}>Complete fit evidence <Arrow /></button>}</article></div></section>

    <section className={styles.evidence} id="evidence"><div><p className={styles.eyebrow}>EVALUATION BOUNDARY</p><h2>What this demo proves and what it does not.</h2></div><div className={styles.evidenceColumns}><article><span>TESTED NOW</span><p>Unit conversion, retailer isolation, category routing, recommendation states, regional findings, and deterministic synthetic fixtures.</p></article><article><span>REQUIRES A PILOT</span><p>Physical fit accuracy, shopper completion, retailer adoption, return reduction, conversion impact, and commercial value.</p></article></div></section>

    <section className={styles.faqSection} id="faqs"><p className={styles.eyebrow}>COMMON QUESTIONS</p><div className={styles.faqLayout}><h2>Before you<br />measure once.</h2><div className={styles.faqs}>{faqs.map(([question, answer], index) => <details key={question} open={index === 0}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></div></section>
  </>;
}

export function M4LandingSections(props: Omit<LandingProps, "mode">) { return <div className={styles.productionSections}><LandingSections {...props} mode="production" /></div>; }

export default function M4LandingReview() {
  return <main className={styles.page}><div className={styles.reviewNote}><b>M4 DESIGN REVIEW</b><span>Responsive landing page · fictional brands and synthetic fit evidence</span></div><header className={styles.header}><Link className={styles.wordmark} href="/">MEASURE<span>ONCE</span></Link><nav aria-label="Landing navigation"><a href="#how">How it works</a><a href="#preview">Try the demo</a><a href="#evidence">Evaluation</a></nav><Link className={styles.account} href="/fit-passport"><i />Fit Passport</Link></header><LandingSections mode="review" /><footer className={styles.footer}><div><Link className={styles.wordmark} href="/">MEASURE<span>ONCE</span></Link><p>Fit recommendations inside a retailer’s existing shopping system.</p></div><nav><div><b>Product</b><a href="#how">How it works</a><a href="#preview">Live preview</a><Link href="/fit-passport">Fit Passport</Link></div><div><b>Evidence</b><a href="#evidence">Evaluation boundary</a><Link href="/m1-review">Contract review</Link><Link href="/m3-review">Questionnaire review</Link></div><div><b>Demo</b><Link href="/shop/women">Showcase catalog</Link><span>Fictional brands</span><span>Synthetic measurements</span></div></nav><div className={styles.footerBase}><span>Portfolio product · not a retailer claim</span><span>Manual size selection always available</span></div></footer></main>;
}
