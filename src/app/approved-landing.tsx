"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, LockKeyhole, Search, ShoppingBag, SlidersHorizontal, Shirt, UserRound } from "lucide-react";
import styles from "./approved-landing.module.css";

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "ME";
}

export function StorefrontHeader({ onFit, onCart, onSearch, bagCount, activePage, accountName }: {
  activePage: "home" | "Women" | "Men" | "about";
  onFit: () => void;
  onCart: () => void;
  onSearch: () => void;
  bagCount: number;
  accountName?: string;
}) {
  return <header className={styles.header}>
    <Link href="/" className={styles.wordmark} aria-label="MeasureOnce home">MEASURE<span>ONCE</span></Link>
    <nav aria-label="Main navigation" className={styles.nav}>
      <Link href="/shop/women" aria-current={activePage === "Women" ? "page" : undefined}>Shop Women</Link>
      <Link href="/shop/men" aria-current={activePage === "Men" ? "page" : undefined}>Shop Men</Link>
      <button onClick={onFit} className={styles.myFit} aria-label={accountName ? `Open ${accountName}'s Fit Passport` : "Login"}>
        {accountName ? <span className={styles.accountInitials} aria-hidden="true">{initials(accountName)}</span> : <><UserRound aria-hidden="true" /><span>Login</span></>}
      </button>
      <button onClick={onSearch} aria-label="Search products"><Search aria-hidden="true" /><span>Search</span></button>
      <button onClick={onCart} aria-label={`Shopping cart with ${bagCount} items`} className={styles.cart}><ShoppingBag aria-hidden="true" /><span>Bag</span>{bagCount > 0 && <b>{bagCount}</b>}</button>
      <Link href="/about" className={styles.aboutLink} aria-current={activePage === "about" ? "page" : undefined}>About</Link>
    </nav>
  </header>;
}

export function ApprovedWelcome({ onSetup, onBrowse, shopperName }: {
  onSetup: () => void;
  onBrowse: () => void;
  shopperName?: string;
}) {
  return <div className={styles.welcome}>
    <section className={styles.hero} aria-labelledby="welcome-heading">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{shopperName ? `Welcome back, ${shopperName}` : "Welcome to MeasureOnce"}</p>
        <h1 id="welcome-heading">Make every size<br />feel familiar.</h1>
        <p className={styles.deck}>Fit Passport saves your fit preferences to your MeasureOnce account, so shopping across designers feels more you — every time.</p>
        <p className={styles.saved}>Saved securely to your account.</p>
        <div className={styles.actions}>
          <button className={styles.setup} onClick={onSetup}>Set up my Fit Passport <ArrowRight aria-hidden="true" /></button>
          <button className={styles.skip} onClick={onBrowse}>Maybe later</button>
        </div>
        <p className={styles.privacy}><LockKeyhole aria-hidden="true" /><span>Your account password stays with the retailer identity service. Fit data is stored separately and securely.</span></p>
      </div>
      <figure className={styles.artwork}>
        {/* Show only the original collage area (670, 77, 916, 713).
            The original file stays untouched; all UI is real HTML. */}
        <Image src="/landing-approved-reference.png" alt="The approved torn-paper collage: a rust dress, cream skirt, brown knit and blue jacket" width={1586} height={992} preload unoptimized />
      </figure>
    </section>
    <section className={styles.benefits} aria-label="Your Fit Passport benefits">
      <article><span className={styles.benefitIcon}><Shirt aria-hidden="true" /></span><div><h2>Your preferences, everywhere</h2><p>One profile. A more consistent fit across MeasureOnce’s designers.</p></div></article>
      <article><span className={styles.benefitIcon}><SlidersHorizontal aria-hidden="true" /></span><div><h2>Less guessing, more getting dressed</h2><p>Save your measurements and fit preferences with MeasureOnce.</p></div></article>
      <article><span className={styles.benefitIcon}><Heart aria-hidden="true" /></span><div><h2>A more personal shopping experience</h2><p>Fit recommendations based on your saved preferences.</p></div></article>
    </section>
    <div className={styles.signature}>Style a brighter tomorrow<span>A more thoughtful wardrobe</span></div>
  </div>;
}
