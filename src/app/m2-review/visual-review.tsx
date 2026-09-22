"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./visual-review.module.css";

const screens = [
  {
    id: "invitation",
    number: "01",
    label: "First visit",
    title: "MeasureOnce account invitation",
    description: "The shopper is already signed into MeasureOnce. Fit Passport is offered as an optional account benefit without another login.",
    image: "/mockups/m2-hybrid/01-retailer-invitation-torn-seam.png",
  },
  {
    id: "recommendation",
    number: "02",
    label: "Product page",
    title: "Saved profile recommendation",
    description: "The product page automatically loads the active profile and explains the recommendation by waist, hip and length.",
    image: "/mockups/m2-hybrid/02-product-recommendation.png",
  },
  {
    id: "management",
    number: "03",
    label: "MeasureOnce account",
    title: "Fit Passport management",
    description: "Profiles, known garments and privacy controls live inside the shopper’s MeasureOnce account.",
    image: "/mockups/m2-hybrid/03-fit-passport-management.png",
  },
] as const;

export default function VisualReview() {
  const [activeId, setActiveId] = useState<(typeof screens)[number]["id"]>("invitation");
  const active = screens.find((screen) => screen.id === activeId) ?? screens[0];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/">MEASURE<span>ONCE</span></Link>
        <p>M2 account and Fit Passport · visual review</p>
        <Link className={styles.storeLink} href="/">Return to storefront</Link>
      </header>

      <section className={styles.intro}>
        <p className={styles.eyebrow}>SAME STOREFRONT. NEW ACCOUNT JOURNEY.</p>
        <h1>Fit should feel built<br />into the store.</h1>
        <p>These are three connected screens in one direction. They preserve the original prototype’s editorial typography, warm paper, terracotta accents and product-first layout.</p>
      </section>

      <nav className={styles.screenNav} aria-label="Choose a screen to review">
        {screens.map((screen) => (
          <button
            key={screen.id}
            type="button"
            className={active.id === screen.id ? styles.active : undefined}
            aria-pressed={active.id === screen.id}
            onClick={() => setActiveId(screen.id)}
          >
            <span>{screen.number}</span>
            <div><small>{screen.label}</small><strong>{screen.title}</strong></div>
          </button>
        ))}
      </nav>

      <section className={styles.canvas} aria-live="polite">
        <div className={styles.canvasHead}>
          <div><p className={styles.eyebrow}>{active.label}</p><h2>{active.title}</h2></div>
          <p>{active.description}</p>
        </div>
        <figure>
          <Image
            src={active.image}
            alt={`${active.title} desktop mockup`}
            width={1536}
            height={1024}
            sizes="(max-width: 800px) 100vw, 94vw"
            priority={active.id === "invitation"}
          />
          <figcaption>Fictional products. Visual direction only; production behavior is being verified separately.</figcaption>
        </figure>
      </section>

      <section className={styles.contract}>
        <p className={styles.eyebrow}>IDENTITY CONTRACT SHOWN IN THESE SCREENS</p>
        <div>
          <article><span>01</span><strong>One account login</strong><p>The account service authenticates the shopper. Fit Passport never receives the password.</p></article>
          <article><span>02</span><strong>Automatic retrieval</strong><p>A verified account reference loads the same saved Fit Passport.</p></article>
          <article><span>03</span><strong>Separate fit controls</strong><p>Removing Fit Passport data does not delete or alter the shopping account.</p></article>
        </div>
      </section>
    </main>
  );
}
