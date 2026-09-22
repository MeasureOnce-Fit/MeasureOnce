"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { describeSignupError } from "@/lib/identity/signup-error";
import { postAuthenticationDestination } from "@/lib/identity/account-destination";

import styles from "./retailer-account.module.css";

export default function RetailerAccountClient({ mode = "signin" }: { mode?: "signin" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const destination = postAuthenticationDestination(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";
  const nextQuery = `?next=${encodeURIComponent(destination)}`;

  async function finishSignIn() {
    const response = await fetch("/api/showcase/session", { method: "POST" });
    if (!response.ok) {
      setMessage(response.status === 401 ? "We could not enable this shopping account. Please sign in again." : "The secure fit service is temporarily unavailable. Please try signing in again.");
      return;
    }
    setPassword("");
    setConfirmation("");
    router.replace(destination);
    router.refresh();
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signup && password !== confirmation) { setMessage("The passwords do not match."); return; }
    setBusy(true);
    setMessage("");
    try {
      const supabase = createSupabaseBrowserClient();
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
        if (error) {
          setMessage(describeSignupError(error));
          return;
        }
        if (data.session) { await finishSignIn(); return; }
        setMessage(describeSignupError({ code: "email_not_confirmed" }));
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        setMessage(error.code === "email_not_confirmed" ? describeSignupError(error) : "The email or password did not match a MeasureOnce shopping account.");
        return;
      }
      await finishSignIn();
    } catch {
      setMessage("We could not reach the account service. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <main className={styles.page}>
    <header className={styles.header}><Link href="/" className={styles.wordmark}>MEASURE<span>ONCE</span></Link><Link href="/" className={styles.back}>Continue shopping</Link></header>
    <section className={styles.panel}>
      <p className={styles.eyebrow}>ONE SHOPPING ACCOUNT</p>
      <h1>{signup ? "Make it yours." : "Welcome back."}</h1>
      <p>{signup ? "Create a prototype shopping account with any email and password. Save your fit preferences and pick up where you left off, across brands." : "Sign in to shop, save your Fit Passport, and reuse your fit details with one MeasureOnce shopping account."}</p>
      <form onSubmit={signIn}>
        <label>Email<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></label>
        <label>Password<input required type="password" autoComplete={signup ? "new-password" : "current-password"} aria-describedby={signup ? "password-hint" : undefined} minLength={signup ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></label>{signup && <small id="password-hint" className={styles.passwordHint}>Use at least 8 characters.</small>}
        {signup && <label>Confirm password<input required type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} /></label>}
        <button disabled={busy}>{busy ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in to MeasureOnce"}</button>
      </form>
      {message && <p className={styles.message} role="status">{message}</p>}
      <div className={styles.accountSwitch}>{signup ? <>Already have an account? <Link href={`/account${nextQuery}`}>Sign in</Link></> : <>New to MeasureOnce? <Link href={`/account/signup${nextQuery}`}>Create account</Link></>}</div>
      <small>Fit Passport uses this same shopping account.</small>
    </section>
  </main>;
}
