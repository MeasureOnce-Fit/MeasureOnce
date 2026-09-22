"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "./retailer-review.module.css";

type ReviewView = "product" | "console";
type WidgetState = "start" | "recommended" | "needs-evidence" | "unavailable" | "manual";

const states: Array<{ id: WidgetState; label: string; note: string }> = [
  { id: "start", label: "Start", note: "First visit" },
  { id: "recommended", label: "Recommended", note: "Evidence ready" },
  { id: "needs-evidence", label: "Need evidence", note: "Incomplete profile" },
  { id: "unavailable", label: "Unavailable", note: "Safe fallback" },
  { id: "manual", label: "Manual size", note: "Retailer control" },
];

const coverageRows = [
  { sku: "ADS-OW-021", item: "Lumen Field Jacket", category: "Outerwear", variants: "6 / 6", status: "Ready", note: "Chest · shoulder · body · sleeve" },
  { sku: "ADS-DR-104", item: "Aster Fold Midi Dress", category: "Dresses", variants: "5 / 5", status: "Ready", note: "Bust · waist · hip" },
  { sku: "ADS-DN-207", item: "Tide Taper Jean", category: "Denim", variants: "8 / 8", status: "Ready", note: "Waist · seat · inseam" },
  { sku: "ADS-KN-033", item: "Oriel Crew Sweater", category: "Knitwear", variants: "4 / 6", status: "Review", note: "Two sleeve values missing" },
  { sku: "ADS-TP-088", item: "Fable Draped Top", category: "Tops", variants: "0 / 5", status: "Blocked", note: "No finished garment measurements" },
];

function Arrow() {
  return <span aria-hidden="true">→</span>;
}

function WidgetMessage({ state }: { state: WidgetState }) {
  if (state === "recommended") {
    return <><p className={styles.widgetEyebrow}>FIT PASSPORT READY</p><h3>Choose M</h3><p className={styles.widgetLead}>Chest and shoulders align with the evidence saved for Alex. The sleeve is expected to sit at the wrist.</p><div className={styles.findings}><span><b>Chest</b> aligned</span><span><b>Shoulder</b> aligned</span><span><b>Sleeve</b> right length</span></div></>;
  }
  if (state === "needs-evidence") {
    return <><p className={styles.widgetEyebrow}>ONE DETAIL MISSING</p><h3>We need sleeve length.</h3><p className={styles.widgetLead}>Add a quick body measurement or choose a garment that already fits. We will not infer it from a size label.</p><button type="button" className={styles.widgetAction}>Add fit evidence <Arrow /></button></>;
  }
  if (state === "unavailable") {
    return <><p className={styles.widgetEyebrow}>FIT CHECK UNAVAILABLE</p><h3>Use the size chart for now.</h3><p className={styles.widgetLead}>The fit service could not check this item. The retailer product page and size selector continue as normal.</p><button type="button" className={styles.quietAction}>Open retailer size chart <Arrow /></button></>;
  }
  if (state === "manual") {
    return <><p className={styles.widgetEyebrow}>RETAILER SIZE SELECTION</p><h3>You choose the label.</h3><p className={styles.widgetLead}>MeasureOnce does not replace a shopper’s final choice. The retailer’s size selector stays available at every step.</p><span className={styles.manualNote}>No recommendation shown in this review state.</span></>;
  }
  return <><p className={styles.widgetEyebrow}>MEASUREONCE FOR ASTER</p><h3>Find your fit in this jacket.</h3><p className={styles.widgetLead}>Use a saved Fit Passport, body measurements, or one garment you already know fits.</p><button type="button" className={styles.widgetAction}>Check my fit <Arrow /></button><p className={styles.widgetFootnote}>Review-only UI · no account or measurement is sent.</p></>;
}

export default function RetailerReview() {
  const [view, setView] = useState<ReviewView>("product");
  const [widgetState, setWidgetState] = useState<WidgetState>("start");
  const [size, setSize] = useState("M");
  const activeState = states.find((item) => item.id === widgetState) ?? states[0];

  return <main className={styles.page}>
    <div className={styles.reviewBanner}><b>M5 INTERACTIVE REVIEW</b><span>Fictional retailer · synthetic catalog values · no integration request is sent</span></div>
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/">MEASURE<span>ONCE</span></Link>
      <div className={styles.retailerMark}><i aria-hidden="true" /> ASTER <span>DEPARTMENT STORE</span></div>
      <Link className={styles.backLink} href="/retailer-demo">Open working retailer <Arrow /></Link>
    </header>

    <section className={styles.intro}>
      <div><p className={styles.eyebrow}>M5 · RETAILER INTEGRATION REVIEW</p><h1>One shopper surface.<br /><em>Two retailer decisions.</em></h1></div>
      <p>This review separates the shopper&apos;s embedded fit experience from the retailer&apos;s catalog readiness work. Both are fictitious and use local review state only.</p>
    </section>

    <nav className={styles.viewTabs} aria-label="M5 review sections">
      <button type="button" aria-pressed={view === "product"} onClick={() => setView("product")}><span>01</span> Product-page widget</button>
      <button type="button" aria-pressed={view === "console"} onClick={() => setView("console")}><span>02</span> Catalog coverage console</button>
    </nav>

    {view === "product" ? <section className={styles.productReview} aria-label="Fictional retailer product page">
      <div className={styles.stateRail}>
        <div><p className={styles.eyebrow}>REVIEW THE WIDGET STATES</p><span>These controls change only this mockup.</span></div>
        <div className={styles.stateButtons}>{states.map((state) => <button key={state.id} type="button" aria-pressed={state.id === widgetState} onClick={() => setWidgetState(state.id)}><b>{state.label}</b><small>{state.note}</small></button>)}</div>
      </div>
      <div className={styles.productGrid}>
        <article className={styles.retailerPage}>
          <div className={styles.breadcrumbs}>WOMEN / OUTERWEAR / JACKETS</div>
          <div className={styles.productImage}><Image src="/products/original/mo-women-020-front.jpg" alt="Lumen Field Jacket, a fictional retailer product" fill sizes="(max-width: 820px) 90vw, 48vw" priority /></div>
          <div className={styles.productCopy}><p>ASTER EDITION · FICTIONAL PRODUCT</p><h2>Lumen Field Jacket</h2><span className={styles.price}>$ 330</span><p className={styles.description}>Relaxed outerwear in a clean field-jacket cut. Product, price, and measurements are fictional demo data.</p><div className={styles.sizeControl}><label htmlFor="retailer-size">Retailer size</label><select id="retailer-size" value={size} onChange={(event) => setSize(event.target.value)}><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option></select><span>Selected: {size}</span></div><button type="button" className={styles.addButton}>Add to bag <Arrow /></button></div>
        </article>
        <aside className={styles.widget} aria-label="MeasureOnce fit widget">
          <div className={styles.widgetTop}><span>MEASURE<span>ONCE</span></span><b>Embedded fit module</b></div>
          <div className={styles.handoff}><span>ASTER PRODUCT</span><i aria-hidden="true" /><span>FIT DECISION</span></div>
          <div className={styles.widgetBody}><WidgetMessage state={widgetState} /></div>
          <div className={styles.widgetBottom}><span>Current mock state</span><b>{activeState.label}</b><span>Manual retailer size: {size}</span></div>
        </aside>
      </div>
      <div className={styles.boundary}><b>What this review decides</b><p>Where the widget lives, how it behaves when evidence is missing, and how catalog readiness becomes visible. It does not decide a live identity exchange, retailer API contract, or commercial claim.</p></div>
    </section> : <section className={styles.console} aria-label="Fictional catalog coverage console">
      <div className={styles.consoleHead}><div><p className={styles.eyebrow}>ASTER DEPARTMENT STORE · CATALOG READINESS</p><h2>Make coverage visible<br />before the widget ships.</h2></div><aside><span>LAST REVIEWED</span><b>Fictional import · 09:42 CT</b><p>No live source connection in this mockup.</p></aside></div>
      <div className={styles.consoleMetrics}><article><span>FIT-READY STYLES</span><b>3</b><p>All sellable variants have required synthetic garment evidence.</p></article><article><span>NEEDS REVIEW</span><b>1</b><p>Some variants are missing a category-relevant field.</p></article><article><span>BLOCKED</span><b>1</b><p>Do not show the fit widget until measurement records arrive.</p></article><article><span>IMPORT SAFETY</span><b>Draft</b><p>Future duplicate detection must preserve the earlier valid record.</p></article></div>
      <div className={styles.tableWrap}><table><caption>Fictional catalog coverage</caption><thead><tr><th scope="col">SKU</th><th scope="col">Product</th><th scope="col">Category</th><th scope="col">Measured variants</th><th scope="col">Widget status</th><th scope="col">Evidence note</th></tr></thead><tbody>{coverageRows.map((row) => <tr key={row.sku}><td>{row.sku}</td><td><b>{row.item}</b></td><td>{row.category}</td><td>{row.variants}</td><td><span className={`${styles.status} ${styles[`status${row.status}`]}`}>{row.status}</span></td><td>{row.note}</td></tr>)}</tbody></table></div>
      <div className={styles.consoleFooter}><article><span>Validation example</span><h3>Reject a flat-width value when the field requires a finished circumference.</h3><p>The future importer must explain the expected measurement kind, preserve the source record, and not overwrite fit-ready catalog data.</p></article><article><span>Shopper safety</span><h3>A blocked style shows the retailer&apos;s normal size selector, not a guessed recommendation.</h3><p>The widget stays optional and cannot interrupt browsing, size selection, bag, checkout, or return flows.</p></article></div>
    </section>}
  </main>;
}
