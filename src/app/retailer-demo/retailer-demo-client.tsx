"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import type { RetailerDemoItem } from "@/lib/retailer-demo/catalog";

import styles from "./retailer-demo.module.css";

type Unit = "cm" | "in";
type EvidenceMode = "body" | "saved";
type Profile = { id: string; nickname: string; kind: "self" | "additional_member" };
type Result = {
  state: string;
  recommendedSizeLabel?: string;
  alternateSizeLabel?: string;
  findings: Array<{ region: string; assessment: string; reason: string }>;
  evidence: { missingRegions: string[] };
  nextSteps: string[];
};
type FitResponse = { item: Pick<RetailerDemoItem, "id" | "name" | "category" | "image" | "availableSizeLabels">; result: Result; profile?: Profile };

const fieldsFor = (category: string) => category === "Outerwear" || category === "Tailoring"
  ? [{ region: "chest_bust", label: "Chest / bust" }, { region: "shoulder_cross_back", label: "Shoulder width" }]
  : category === "Dresses"
    ? [{ region: "chest_bust", label: "Chest / bust" }, { region: "waist", label: "Waist" }, { region: "hip_seat", label: "Hip / seat" }]
    : [{ region: "chest_bust", label: "Chest / bust" }];

const garmentNoun = (category: string) => ({
  Outerwear: "jacket",
  Tailoring: "jacket",
  Dresses: "dress",
  Knitwear: "knitwear piece",
}[category] ?? category.toLowerCase());

function Arrow() { return <span aria-hidden="true">→</span>; }

function toNumber(value: string) {
  const number = Number(value.trim());
  return Number.isFinite(number) && number > 0 ? number : null;
}

export default function RetailerDemoClient({ items }: { items: readonly RetailerDemoItem[] }) {
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const item = items.find((candidate) => candidate.id === itemId) ?? items[0];
  const [size, setSize] = useState(item?.availableSizeLabels[0] ?? "");
  const [mode, setMode] = useState<EvidenceMode>("body");
  const [unit, setUnit] = useState<Unit>("cm");
  const [preference, setPreference] = useState("regular");
  const [values, setValues] = useState<Record<string, string>>({ chest_bust: "88.34", shoulder_cross_back: "38.08" });
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileId, setProfileId] = useState("");
  const [profileState, setProfileState] = useState<"loading" | "ready" | "signed-out" | "unavailable">("loading");
  const [requestState, setRequestState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [response, setResponse] = useState<FitResponse | null>(null);
  const [message, setMessage] = useState("");
  const [bagCount, setBagCount] = useState(0);

  const fields = useMemo(() => fieldsFor(item.category), [item.category]);
  const hasFitCoverage = item.coverage.status === "ready";
  const bodyValuesComplete = fields.every((field) => toNumber(values[field.region] ?? "") !== null);
  const canRunFit = hasFitCoverage && (mode === "body" ? bodyValuesComplete : profileState === "ready" && Boolean(profileId));

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/profiles", { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) { setProfileState("signed-out"); return []; }
        if (!res.ok) throw new Error("Profile service unavailable");
        return res.json() as Promise<{ profiles?: Profile[] }>;
      })
      .then((data) => {
        const ownedProfiles = Array.isArray(data) ? data : data.profiles ?? [];
        setProfiles(ownedProfiles);
        setProfileId(ownedProfiles[0]?.id ?? "");
        setProfileState("ready");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setProfileState("unavailable");
      });
    return () => controller.abort();
  }, []);

  const selectItem = (nextItem: RetailerDemoItem) => {
    setItemId(nextItem.id);
    setSize(nextItem.availableSizeLabels[0] ?? "");
    setResponse(null);
    setMessage("");
    setRequestState("idle");
    setValues((current) => Object.fromEntries(fieldsFor(nextItem.category).map((field) => [field.region, current[field.region] ?? ""])));
  };

  const runFit = async () => {
    if (!hasFitCoverage) {
      setRequestState("idle");
      setMessage("Fit coverage for this item is under review. Select a retailer size manually.");
      return;
    }
    setRequestState("loading");
    setMessage("");
    setResponse(null);
    try {
      const body = mode === "saved"
        ? { itemId: item.id, preference, profileId }
        : { itemId: item.id, preference, measurements: fields.map((field) => ({ region: field.region, value: toNumber(values[field.region] ?? ""), unit })) };
      if (mode === "saved" && !profileId) throw new Error("Choose a saved Fit Passport profile or use body measurements.");
      if (mode === "body" && (body.measurements ?? []).some((measurement) => measurement.value === null)) throw new Error("Enter a positive value for every measurement shown.");
      const endpoint = mode === "saved" ? "/api/retailer-demo/saved-fit" : "/api/retailer-demo/fit";
      const res = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const payload = await res.json() as FitResponse & { error?: string };
      if (!res.ok || !payload.result || !payload.item) throw new Error(payload.error ?? "Fit check unavailable. Select a retailer size manually.");
      setResponse(payload);
      if (payload.result.recommendedSizeLabel && payload.item.availableSizeLabels.includes(payload.result.recommendedSizeLabel)) {
        setSize(payload.result.recommendedSizeLabel);
        setMessage(`Retailer size updated to ${payload.result.recommendedSizeLabel}. You can still change it.`);
      } else if (payload.result.recommendedSizeLabel) {
        setMessage(`MeasureOnce returned ${payload.result.recommendedSizeLabel}, which is not currently available in this retailer catalog. Your selected size was kept.`);
      } else {
        setMessage("No retailer size was changed. Select a label manually if you wish to continue.");
      }
      setRequestState("ready");
    } catch (error) {
      setRequestState("error");
      setMessage(error instanceof Error ? error.message : "Fit check unavailable. Select a retailer size manually.");
    }
  };

  if (!item) return null;

  return <main className={styles.page}>
    <a className={styles.skip} href="#retailer-product">Skip to product</a>
    <header className={styles.header}><Link className={styles.retailerMark} href="/retailer-demo"><i aria-hidden="true" /> ASTER <span>DEPARTMENT STORE</span></Link><nav aria-label="Retailer navigation"><a href="#retailer-product">New arrivals</a><a href="#coverage">Fit coverage</a><Link href="/">MeasureOnce showcase</Link></nav><div className={styles.headerActions}><button type="button" className={styles.bag} aria-label={`Shopping bag with ${bagCount} ${bagCount === 1 ? "item" : "items"}`}>Bag {bagCount}</button><Link className={styles.passportLink} href="/fit-passport">Fit Passport <Arrow /></Link></div></header>
    <section className={styles.notice}><b>WORKING SYNTHETIC RETAILER DEMO</b><span>Only item keys, preference, and chosen evidence reach the local fit endpoint. No checkout or purchase is created.</span></section>
    <section className={styles.shelf} aria-label="Available fictional retailer products">{items.map((candidate) => <button type="button" key={candidate.id} aria-pressed={candidate.id === item.id} onClick={() => selectItem(candidate)}><span>{candidate.category}</span><b>{candidate.name}</b><small>{candidate.coverage.status === "ready" ? "Fit-ready" : "Coverage review"}</small></button>)}</section>
    <section className={styles.product} id="retailer-product">
      <div className={styles.productImage}><Image src={item.image} alt={`${item.name}, fictional synthetic retailer garment`} fill priority sizes="(max-width: 840px) 92vw, 48vw" /></div>
      <article className={styles.productDetails}><p className={styles.eyebrow}>ASTER EDITION · {item.category}</p><h1>{item.name}</h1><p className={styles.price}>$ {item.price}</p><p className={styles.productNote}>Fictional product and synthetic measurements. The retailer chooses available labels; MeasureOnce explains the fit decision.</p><label className={styles.sizeSelect}>Retailer size<select value={size} onChange={(event) => setSize(event.target.value)}>{item.availableSizeLabels.map((label) => <option key={label}>{label}</option>)}</select></label><p className={styles.selectedSize}>Selected size: <b>{size}</b></p><button type="button" className={styles.bagButton} onClick={() => setBagCount((count) => count + 1)}>Add {size} to bag <Arrow /></button><p className={styles.checkoutNote} role="status">{bagCount ? `${bagCount} item${bagCount === 1 ? "" : "s"} in this local retailer bag. Checkout is outside the MeasureOnce integration.` : "This local test retailer does not process checkout or payment."}</p></article>
      <aside className={styles.widget} aria-label="MeasureOnce embedded fit widget">
        <div className={styles.widgetHeader}><b>MEASURE<span>ONCE</span></b><small>Fit for Aster</small></div>
        <div className={styles.widgetBridge}><span>Retailer item</span><i aria-hidden="true" /><span>Fit evidence</span></div>
        <div className={styles.widgetBody}>
          <p className={styles.eyebrow}>FIT CHECK FOR {item.category}</p><h2>Find your size in this {garmentNoun(item.category)}.</h2><div className={styles.modeTabs}><button type="button" aria-pressed={mode === "body"} onClick={() => setMode("body")}>Body measurements</button><button type="button" aria-pressed={mode === "saved"} onClick={() => setMode("saved")}>Saved Fit Passport</button></div>
          {mode === "body" ? <><div className={styles.unitToggle} aria-label="Measurement unit"><button type="button" aria-pressed={unit === "cm"} onClick={() => setUnit("cm")}>CM</button><button type="button" aria-pressed={unit === "in"} onClick={() => setUnit("in")}>IN</button></div><div className={styles.fieldGrid}>{fields.map((field) => <label key={field.region}>{field.label}<input inputMode="decimal" aria-label={`${field.label} in ${unit === "cm" ? "centimetres" : "inches"}`} value={values[field.region] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [field.region]: event.target.value }))} /></label>)}</div></> : <div className={styles.savedPath}>{profileState === "loading" ? <p>Checking your retailer Fit Passport…</p> : profileState === "ready" && profiles.length > 0 ? <label>Fit Passport profile<select value={profileId} onChange={(event) => setProfileId(event.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.nickname}</option>)}</select></label> : <><p>{profileState === "unavailable" ? "Saved profiles are unavailable right now." : "Sign in through this retailer to use a saved Fit Passport."}</p><Link href="/fit-passport">Open Fit Passport <Arrow /></Link></>}</div>}
          <label className={styles.preference}>Fit preference<select value={preference} onChange={(event) => setPreference(event.target.value)}><option value="closer">Closer</option><option value="regular">Balanced</option><option value="relaxed">Relaxed</option></select></label><button type="button" className={styles.fitButton} onClick={runFit} disabled={requestState === "loading" || !canRunFit}>{requestState === "loading" ? "Checking fit…" : !hasFitCoverage ? "Fit coverage under review" : mode === "saved" && !canRunFit ? "Sign in to use saved fit" : "Check my fit"}<Arrow /></button>
          <div className={styles.result} aria-live="polite" aria-busy={requestState === "loading"}>{!hasFitCoverage ? <><span>FIT COVERAGE UNDER REVIEW</span><h3>Use the retailer size selector.</h3><p>{item.coverage.note} MeasureOnce will not suggest a size until coverage is ready.</p></> : requestState === "ready" && response ? <><span>{response.result.state.replaceAll("_", " ")}</span><h3>{response.result.recommendedSizeLabel ? `Try ${response.result.recommendedSizeLabel}` : "Choose your retailer size"}</h3><p>{response.result.findings[0]?.reason ?? response.result.nextSteps[0]}</p></> : requestState === "error" ? <><span>FIT CHECK UNAVAILABLE</span><h3>Use the retailer size selector.</h3></> : <><span>YOUR CHOICE STAYS IN CONTROL</span><p>MeasureOnce never adds a product or completes a purchase for you.</p></>} {message && <p className={styles.message} role={requestState === "error" ? "alert" : "status"}>{message}</p>}</div>
        </div>
      </aside>
    </section>
    <section className={styles.coverage} id="coverage"><div><p className={styles.eyebrow}>CATALOG READINESS · SERVER-OWNED FIXTURES</p><h2>Only fit-ready items receive a fit check.</h2></div><div className={styles.coverageList}>{items.map((candidate) => <article key={candidate.id}><span className={candidate.coverage.status === "ready" ? styles.ready : styles.review}>{candidate.coverage.status}</span><b>{candidate.name}</b><small>{candidate.coverage.measuredVariants} measured variants</small><p>{candidate.coverage.note}</p></article>)}</div></section>
  </main>;
}
