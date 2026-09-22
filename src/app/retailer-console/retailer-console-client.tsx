"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import type { CoverageStatus, OperatorCatalogRow } from "@/lib/retailer-catalog/operator-service";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

import styles from "./retailer-console.module.css";

type ConsoleState = "loading" | "signed-out" | "ready" | "unavailable";
type CatalogPayload = { context: { retailerId: string; retailerName: string }; products: OperatorCatalogRow[] };

function label(status: CoverageStatus) {
  return status === "ready" ? "Fit ready" : status === "review" ? "Needs review" : "Unavailable";
}

export default function RetailerConsoleClient() {
  const [state, setState] = useState<ConsoleState>("loading");
  const [catalog, setCatalog] = useState<CatalogPayload | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setNotice(null);
    const response = await fetch("/api/operator/catalog", { cache: "no-store" });
    if (response.status === 401) { setCatalog(null); setState("signed-out"); return; }
    if (!response.ok) { setCatalog(null); setState("unavailable"); return; }
    setCatalog(await response.json() as CatalogPayload);
    setState("ready");
  }, []);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const metrics = useMemo(() => ({
    ready: catalog?.products.filter((product) => product.coverageStatus === "ready").length ?? 0,
    review: catalog?.products.filter((product) => product.coverageStatus === "review").length ?? 0,
    unavailable: catalog?.products.filter((product) => product.coverageStatus === "unavailable").length ?? 0,
  }), [catalog]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy("sign-in"); setNotice(null);
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithPassword({ email: email.trim(), password });
      if (error) { setNotice("The email or password did not match an operator account."); return; }
      setPassword("");
      await load();
    } catch { setNotice("We could not sign in. Try again."); } finally { setBusy(null); }
  }

  async function update(product: OperatorCatalogRow, coverageStatus: CoverageStatus) {
    setBusy(product.externalProductId); setNotice(null);
    try {
      const response = await fetch("/api/operator/catalog", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ externalProductId: product.externalProductId, coverageStatus, fitProductReference: coverageStatus === "ready" ? product.fitProductReference : null }),
      });
      if (!response.ok) throw new Error();
      setCatalog(await response.json() as CatalogPayload);
      setNotice(`${product.name} is now ${label(coverageStatus).toLowerCase()}.`);
    } catch { setNotice("That review could not be saved. No catalog data was changed."); } finally { setBusy(null); }
  }

  return <main className={styles.page}>
    <header className={styles.header}><Link href="/">MEASURE<span>ONCE</span></Link><nav><Link href="/retailer-demo">Shopper demo</Link><Link href="/m5-review">Review mock</Link></nav></header>
    {state === "loading" && <section className={styles.state}><p>RETAILER OPERATIONS</p><h1>Opening catalog coverage.</h1></section>}
    {state === "signed-out" && <section className={styles.state}><p>RETAILER OPERATIONS</p><h1>Sign in to your<br /><em>catalog workspace.</em></h1><span>Use a fictional operator account. Shopper accounts cannot access this page.</span><form onSubmit={signIn}><label>Email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Password<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label><button disabled={busy === "sign-in"}>{busy === "sign-in" ? "Signing in…" : "Sign in"}</button></form>{process.env.NODE_ENV === "development" && <small>Local demo operator: operator.a@measureonce.example · password: MeasureOnceDemo!2026</small>}{notice && <small>{notice}</small>}</section>}
    {state === "unavailable" && <section className={styles.state}><p>CATALOG OPERATIONS</p><h1>Coverage is temporarily unavailable.</h1><span>Shopping and retailer size selection continue without this console.</span><button onClick={() => { setState("loading"); void load(); }}>Try again</button></section>}
    {state === "ready" && catalog && <section className={styles.console}>
      <div className={styles.intro}><div><p>RETAILER CATALOG · SYNTHETIC DEMO</p><h1>{catalog.context.retailerName}<br /><em>coverage console.</em></h1></div><span>Only this operator’s retailer catalog is shown. Garment dimensions remain server-side.</span></div>
      <div className={styles.metrics}><article><small>FIT READY</small><b>{metrics.ready}</b><span>Reviewed product mappings</span></article><article><small>NEEDS REVIEW</small><b>{metrics.review}</b><span>Do not show fit until reviewed</span></article><article><small>UNAVAILABLE</small><b>{metrics.unavailable}</b><span>Normal retailer sizing stays available</span></article></div>
      {notice && <p className={styles.notice}>{notice}</p>}
      <div className={styles.tableWrap}><table><caption>Catalog coverage</caption><thead><tr><th>Product</th><th>Category</th><th>Measured variants</th><th>Widget status</th><th>Operator action</th></tr></thead><tbody>{catalog.products.map((product) => <tr key={product.externalProductId}><td><b>{product.name}</b><small>{product.externalProductId}</small></td><td>{product.category}</td><td>{product.measuredVariantCount} / {product.variantCount}</td><td><span className={styles[product.coverageStatus]}>{label(product.coverageStatus)}</span></td><td><button disabled={busy === product.externalProductId || product.coverageStatus === "unavailable"} onClick={() => void update(product, "unavailable")}>{busy === product.externalProductId ? "Saving…" : "Mark unavailable"}</button></td></tr>)}</tbody></table></div>
      <p className={styles.boundary}>This console reviews synthetic catalog coverage only. It never processes a shopper, order, payment, or checkout action.</p>
    </section>}
  </main>;
}
