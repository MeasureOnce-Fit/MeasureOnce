"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import styles from "./questionnaire-review.module.css";

type Screen = "entry" | "garment" | "body" | "result" | "missing";
type FitAnswer = "Too tight" | "Just right" | "Too loose";
type LengthAnswer = "Too short" | "Just right" | "Too long";

const screenLabels: Array<{ id: Screen; number: string; label: string }> = [
  { id: "entry", number: "01", label: "Choose a path" },
  { id: "garment", number: "02A", label: "Known garment" },
  { id: "body", number: "02B", label: "Body measurements" },
  { id: "result", number: "03", label: "Recommendation" },
  { id: "missing", number: "04", label: "Safe follow-up" },
];

const fitOptions: FitAnswer[] = ["Too tight", "Just right", "Too loose"];
const lengthOptions: LengthAnswer[] = ["Too short", "Just right", "Too long"];

function ChoiceRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className={styles.choiceRow}>
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option} className={value === option ? styles.selectedChoice : undefined}>
            <input
              type="radio"
              name={label}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default function M3QuestionnaireReview() {
  const [screen, setScreen] = useState<Screen>("entry");
  const [waist, setWaist] = useState<FitAnswer>("Just right");
  const [hip, setHip] = useState<FitAnswer>("Just right");
  const [length, setLength] = useState<LengthAnswer>("Just right");
  const [unit, setUnit] = useState<"in" | "cm">("in");
  const [saveDraft, setSaveDraft] = useState(true);

  const progress = screen === "entry" ? 1 : screen === "result" || screen === "missing" ? 3 : 2;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.wordmark} href="/">MEASURE<span>ONCE</span></Link>
        <p>M3 Fit Passport questionnaire · interactive review</p>
        <Link className={styles.storeLink} href="/fit-passport">Fit Passport</Link>
      </header>

      <section className={styles.reviewBar} aria-label="Review screens">
        <div>
          <span className={styles.reviewDot} />
          <b>DESIGN REVIEW</b>
          <small>Fictional data · nothing is saved</small>
        </div>
        <nav>
          {screenLabels.map((item) => (
            <button
              key={item.id}
              type="button"
              className={screen === item.id ? styles.activeScreen : undefined}
              aria-pressed={screen === item.id}
              onClick={() => setScreen(item.id)}
            >
              <span>{item.number}</span>{item.label}
            </button>
          ))}
        </nav>
      </section>

      <section className={styles.stage}>
        <aside className={styles.productPane}>
          <div className={styles.productCopy}>
            <p className={styles.eyebrow}>VELMORA · TROUSERS</p>
            <h1>Atlas Single-Pleat Trouser</h1>
            <p>Charcoal wool blend · Regular fit</p>
          </div>
          <div className={styles.productImage}>
            <Image
              src="/products/original/mo-men-002-front.jpg"
              alt="Charcoal single-pleat trousers shown without a model"
              fill
              sizes="(max-width: 860px) 100vw, 42vw"
              priority
            />
            <span>Target garment</span>
          </div>
          <div className={styles.evidenceTrail} aria-label="Fit evidence trail">
            <span className={progress >= 1 ? styles.complete : undefined}><i />Profile<b>Alex</b></span>
            <em />
            <span className={progress >= 2 ? styles.complete : undefined}><i />Evidence<b>{screen === "body" ? "Body" : "Garment"}</b></span>
            <em />
            <span className={progress >= 3 ? styles.complete : undefined}><i />Target<b>Velmora</b></span>
          </div>
        </aside>

        <section className={styles.formPane} aria-live="polite">
          <div className={styles.formTopline}>
            <span>Alex’s Fit Passport</span>
            <span>Stage {progress} of 3</span>
          </div>

          {screen === "entry" && (
            <div className={styles.panel}>
              <p className={styles.eyebrow}>FIND MY SIZE</p>
              <h2>Start with what<br />you already know.</h2>
              <p className={styles.intro}>Choose either route. We will ask only for evidence this trouser can use.</p>
              <div className={styles.pathChoices}>
                <button type="button" onClick={() => setScreen("garment")}>
                  <span className={styles.recommended}>RECOMMENDED</span>
                  <b>Use clothing that fits</b>
                  <small>Choose an exact item and tell us how it fits by area.</small>
                  <i>→</i>
                </button>
                <button type="button" onClick={() => setScreen("body")}>
                  <b>Enter body measurements</b>
                  <small>Use inches or centimetres with illustrated instructions.</small>
                  <i>→</i>
                </button>
              </div>
              <button className={styles.sizeChart} type="button">Use the size chart instead</button>
              <p className={styles.assurance}>Optional guidance. Manual size selection always remains available.</p>
            </div>
          )}

          {screen === "garment" && (
            <div className={`${styles.panel} ${styles.widePanel}`}>
              <p className={styles.eyebrow}>KNOWN GARMENT · STAGE 2</p>
              <h2>How does your<br />trusted trouser fit?</h2>
              <p className={styles.intro}>This exact item has stored garment measurements, so the label becomes usable evidence.</p>
              <div className={styles.anchorCard}>
                <div className={styles.anchorThumb}>
                  <Image src="/products/original/mo-men-023-front.jpg" alt="Rinse indigo jeans" fill sizes="72px" />
                </div>
                <div><small>MARROW &amp; VALE · VERIFIED ITEM</small><b>Kellan Relaxed Selvedge Jean</b><span>Size 32 × 30</span></div>
                <button type="button">Change</button>
              </div>
              <div className={styles.answerMatrix}>
                <ChoiceRow label="Waist" options={fitOptions} value={waist} onChange={(value) => setWaist(value as FitAnswer)} />
                <ChoiceRow label="Hip / seat" options={fitOptions} value={hip} onChange={(value) => setHip(value as FitAnswer)} />
                <ChoiceRow label="Length" options={lengthOptions} value={length} onChange={(value) => setLength(value as LengthAnswer)} />
              </div>
              <div className={styles.preferenceBlock}>
                <span>HOW SHOULD THIS TROUSER FEEL?</span>
                <div><button type="button">Closer</button><button type="button" className={styles.preferenceActive}>As designed</button><button type="button">More relaxed</button></div>
              </div>
              <div className={styles.actions}>
                <button type="button" className={styles.back} onClick={() => setScreen("entry")}>Back</button>
                <button type="button" className={styles.secondaryAction}>Save and finish later</button>
                <button type="button" className={styles.primaryAction} onClick={() => setScreen("result")}>See my size <span>→</span></button>
              </div>
            </div>
          )}

          {screen === "body" && (
            <div className={`${styles.panel} ${styles.widePanel}`}>
              <p className={styles.eyebrow}>BODY MEASUREMENTS · STAGE 2</p>
              <div className={styles.titleRow}>
                <h2>Three measurements<br />for this trouser.</h2>
                <div className={styles.unitToggle} aria-label="Measurement unit">
                  <button type="button" className={unit === "in" ? styles.unitActive : undefined} onClick={() => setUnit("in")}>IN</button>
                  <button type="button" className={unit === "cm" ? styles.unitActive : undefined} onClick={() => setUnit("cm")}>CM</button>
                </div>
              </div>
              <p className={styles.intro}>Measure the body, not a garment. Each value keeps its original unit and method.</p>
              <div className={styles.measurements}>
                <label><span>01</span><b>Waist at trouser position</b><small>Where you expect this waistband to sit.</small><div><input inputMode="decimal" defaultValue={unit === "in" ? "32" : "81.3"} key={`waist-${unit}`} /><em>{unit}</em></div><button type="button">How to measure</button></label>
                <label><span>02</span><b>Hip / seat</b><small>Around the fullest point, tape level.</small><div><input inputMode="decimal" defaultValue={unit === "in" ? "39" : "99.1"} key={`hip-${unit}`} /><em>{unit}</em></div><button type="button">How to measure</button></label>
                <label><span>03</span><b>Inseam</b><small>Needed because this item has length sizes.</small><div><input inputMode="decimal" defaultValue={unit === "in" ? "30" : "76.2"} key={`inseam-${unit}`} /><em>{unit}</em></div><button type="button">How to measure</button></label>
              </div>
              <label className={styles.saveDraft}><input type="checkbox" checked={saveDraft} onChange={(event) => setSaveDraft(event.target.checked)} /><span><b>Save progress for 30 days</b><small>Resume from Alex’s Fit Passport. Unfinished values delete automatically.</small></span></label>
              <div className={styles.actions}>
                <button type="button" className={styles.back} onClick={() => setScreen("entry")}>Back</button>
                <button type="button" className={styles.secondaryAction}>Skip for now</button>
                <button type="button" className={styles.primaryAction} onClick={() => setScreen("result")}>See my size <span>→</span></button>
              </div>
            </div>
          )}

          {screen === "result" && (
            <div className={`${styles.panel} ${styles.resultPanel}`}>
              <p className={styles.eyebrow}>YOUR SIZE · EVIDENCE READY</p>
              <div className={styles.sizeResult}><span>WE RECOMMEND</span><b>32 × 30</b><small>for Alex in Velmora</small></div>
              <h2>Waist aligned.<br />Length preserved.</h2>
              <div className={styles.regionResults}>
                <div><span>WAIST</span><b>Fits as designed</b><small>Compared with the verified Marrow & Vale 32 × 30.</small><i className={styles.fitLine} /></div>
                <div><span>HIP / SEAT</span><b>Fits as designed</b><small>Target range supports the reported “just right” anchor.</small><i className={styles.fitLine} /></div>
                <div><span>INSEAM</span><b>Right length</b><small>Exact 30-inch length axis is available.</small><i className={styles.fitLine} /></div>
              </div>
              <div className={styles.resultActions}><button type="button" className={styles.primaryAction}>Use size 32 × 30 <span>→</span></button><button type="button" onClick={() => setScreen("garment")}>Edit my answers</button></div>
              <p className={styles.versionNote}>Synthetic catalog · rules m1-rules-1.0.0 · no percentage confidence</p>
            </div>
          )}

          {screen === "missing" && (
            <div className={`${styles.panel} ${styles.missingPanel}`}>
              <p className={styles.eyebrow}>ONE DETAIL NEEDED</p>
              <h2>What inseam usually<br />works for Alex?</h2>
              <p className={styles.intro}>The waist and hip evidence is sufficient, but this trouser is sold by waist and length. We will not guess the second axis.</p>
              <div className={styles.inseamChoices}><button type="button">28 in</button><button type="button">30 in</button><button type="button">32 in</button><button type="button">34 in</button><button type="button">I’m not sure</button></div>
              <div className={styles.safeState}><span>WHY WE ASKED</span><p>Without inseam evidence, MeasureOnce can compare the waist but cannot recommend an exact 32 × length variant.</p></div>
              <div className={styles.actions}>
                <button type="button" className={styles.back} onClick={() => setScreen("entry")}>Start over</button>
                <button type="button" className={styles.secondaryAction}>Use size chart</button>
                <button type="button" className={styles.primaryAction} onClick={() => setScreen("result")}>Continue <span>→</span></button>
              </div>
            </div>
          )}
        </section>
      </section>

      <footer className={styles.footer}>
        <span>11 catalog categories route through five fit families.</span>
        <span>Adult additional-member profiles only · explicit saving · manual choice preserved.</span>
      </footer>
    </main>
  );
}
