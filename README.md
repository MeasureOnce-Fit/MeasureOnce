# MeasureOnce

A Next.js multi-brand showcase plus a versioned, deterministic fit-engine foundation. The storefront is still a prototype; real authentication, durable profiles and retailer integration belong to later approved milestones.

## What is included

- 100 distinct women’s garments and 100 distinct men’s garments across a broad range of contemporary categories.
- 600 locally stored, original AI-generated product photographs: front, side, and back views for every garment, with no human models or third-party logos.
- Original fictional product names, descriptions, colors, and portfolio pricing.
- The product drawer includes controls for all three garment angles.
- Search, gender and category filtering, progressive catalog loading, product details, and garment measurement records.
- Existing-shopper, new-shopper, and guest entry paths.
- A five-step Fit Passport flow: entry, shopper context, known-good garment, fit preferences, and recommendation result.
- A product-level `Find my best fit` prototype. Its current UI is not yet connected to the M1 engine.

## M1 fit engine

- The 200 source products are deterministically assigned across 10 clearly synthetic brands with 20 products per brand.
- Every product retains its six source size labels, and all 1,200 source-label positions trace to one or more generated variants. Independent petite/regular/tall, waist/inseam, neck/sleeve and jacket-length axes expand the fit catalog to 2,028 exact variants with method-tagged synthetic measurements.
- Women’s schemas cover alpha, even and declared odd numeric, denim-waist, waist/inseam, petite, tall, plus, grouped and market-equivalent labels. Men’s schemas include alpha, waist/inseam, waist, neck/sleeve and jacket chest/length formats.
- Exact labels stay distinct from equivalence groups: for example, `0` and `2` can both map to `XS` while retaining different measurements and recommendations.
- The public recommendation boundary accepts body measurements in centimetres or inches, an exact known-garment variant with independent regional observations, or both.
- Results use seven explicit states and regional evidence. The engine does not output a numerical confidence score.
- Exact composite labels require the matching axis evidence; the engine will not choose an inseam or garment length from unrelated measurements.
- Finished circumference and laid-flat garment width are stored as distinct measurement kinds and normalized explicitly before reference-garment inference.
- All catalog geometry and shopper fixtures are synthetic and versioned. Product photographs are never used as measurement evidence.

## Fit questionnaire

The current prototype illustrates a short known-garment onboarding flow:

1. Who the shopper is buying for, so gifts and shared accounts do not contaminate their profile.
2. The collection being shopped and an optional height range for garment length.
3. One known-good garment: brand, type, label size, and regional fit feedback.
4. Optional garment measurements if the shopper already knows them.
5. Desired ease and any fit problem to avoid.
6. Explicit consent before saving the garment to the Fit Passport.

The final M3 questionnaire and interface have not been approved or implemented. M1 supports both a body-measurement path and a known-garment path at the engine boundary.

## Run locally

```powershell
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Validation

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:fit
npm run eval:fit
```

`npm run eval:fit` runs 612 profile-matrix scenarios, six executable sparse-category comparisons and 44 literal contract cases. It writes machine-readable and human-readable results under `artifacts/evaluation/`. The separate `m1-contract-case-signoff.csv` binds each approval to a case fingerprint and preserves human-entered review work across reruns.

The garment photography is original AI-generated concept imagery created for this portfolio. The brands and products are fictional. Prices, size charts, fit measurements, shopper profiles and evaluation cases are synthetic. Passing the evaluation demonstrates software behavior against declared synthetic rules; it does not demonstrate physical fit accuracy, return reduction or commercial impact. Account actions are local UI simulations and do not create real accounts.
