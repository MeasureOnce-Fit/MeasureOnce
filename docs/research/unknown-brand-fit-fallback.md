# Unknown-brand fit fallback: evidence and product recommendation

Research date: 2026-09-20  
Scope: the shopper owns a garment that fits, but its brand or exact product is absent from the retailer/MeasureOnce catalog and the shopper may not know body measurements. This note recommends a product and evidence strategy; it does not claim real-world fit accuracy.

## Recommendation

Use an **evidence ladder**, not a universal brand-and-size dropdown:

1. Search retailer and MeasureOnce records for the exact brand, product and labelled size.
2. If the product is not found, offer **Measure a garment that fits** as the primary fallback. Ask for only the dimensions required by the target product, show a diagram, accept inches or centimetres, and pair each dimension with the shopper's regional fit observation.
3. Offer **Measure my body instead** as an equal alternative, again asking only for target-required dimensions with illustrated instructions.
4. If the shopper has no tape or does not want to measure, collect category, label size and regional fit only as an **uncalibrated preference record**. Do not produce a MeasureOnce size recommendation from it. Let the shopper choose a size manually, save the answers for a later calibrated session, or return after measuring.

The core rule is: **a size label identifies an item; it does not establish its geometry**. UNIQLO distinguishes actual finished-product measurements from the body dimensions on a tag, warns that same-size garments can fit differently, and notes some products lack measurement data ([UNIQLO size help](https://faq-us.uniqlo.com/articles/en_US/Knowledge/How-can-I-figure-out-my-size/)). ISO 8559-1 defines standardized anthropometric measurement concepts, while ISO 8559-2 bases clothing size designation on body dimensions; neither makes `M`, `0`, or `32` a universal cross-brand garment measurement ([ISO 8559-1:2017](https://www.iso.org/standard/61686.html), [ISO 8559-2:2025](https://www.iso.org/standard/85590.html)).

## Why this is the best compromise

### Options compared

| Approach | Shopper effort | Evidence quality | Recommendation behavior | Decision |
|---|---:|---:|---|---|
| Unknown brand + category + label size + “fits well” | Lowest | Uncalibrated: no dimensions or brand/style size chart | Any exact-size result would be an unsupported inference | Keep only as preference/history; abstain |
| Brand-level size chart lookup | Low | Medium only when the chart, market, category and effective version are verified | Can translate a label to a body range, but not necessarily the owned garment's finished dimensions | Useful enrichment; never silently substitute for exact-product evidence |
| Guided body self-measurement | Medium | Direct but method-sensitive | Works with the current MeasureOnce body-evidence engine | Keep as a primary path; use diagrams, duplicate checks and plausibility validation |
| Guided flat measurement of a well-fitting garment | Medium, often less intrusive | Direct garment geometry when the method is explicit | Supports comparison with target garment geometry without pretending the label is geometry | Recommended unknown-product fallback |
| Photo/scan-derived measurements | Potentially low | Depends on device, pose, clothing, calibration and model validation | Promising future path, but needs consent, uncertainty and device-specific validation | Do not make this the MVP |

Retailer and brand guidance supports category-specific evidence rather than one global size label. Levi's treats waist, hip/seat, thigh and inseam as separate dimensions for bottoms, and chest, waist and hip as separate dimensions for tops and dresses ([Levi's size guide](https://www.levi.com/US/en_US/info/sizeguide)). Patagonia likewise says its charts contain body measurements, uses different predictors for tops and bottoms, and states product inseam may vary ([Patagonia size and fit guide](https://www.patagonia.com/guides/size-fit/)).

Subjective fit answers are still valuable, but only when anchored to geometry. In a controlled pants study, participants perceived changes as small as 0.5 cm at the waist and 1.5 cm at the hip or crotch, while tolerance varied by person ([Ashdown & DeLong, 1995](https://pubmed.ncbi.nlm.nih.gov/15677000/)). That supports regional answers such as tight/right/loose and short/right/long; it does not support converting an unknown `M` into centimetres.

## Proposed shopper flow

### 1. Choose what the shopper has

Present four plain-language choices:

- **Find a garment I own** — search measured products by brand/product, then exact labelled size.
- **Measure a garment that fits** — recommended when the exact item is missing.
- **Use my body measurements** — direct measurement path.
- **I can't measure right now** — preference-only path with transparent manual-size fallback.

The brand selector should list verified brands and include **Another brand / not listed**. Selecting an unknown brand must not open an identical-looking recommendation path based only on label size.

### 2. Unknown product: ask progressively, not as a long form

Ask category first, then intersect that category with the target style's actual `requiredRegions`. Ask one dimension at a time and explain where to measure. Suggested default order:

| Reference category | First measurements | Ask only when the target needs them |
|---|---|---|
| Dress | flat chest/bust, flat waist, flat hip | shoulder-to-hem/body length, sleeve |
| Top/shirt/jacket | pit-to-pit chest, shoulder width | body length, sleeve, neck |
| Jeans/trousers | waistband, flat hip, inseam | rise, thigh, outseam |
| Skirt | waistband, flat hip | length, hem sweep |

For flat widths, store the value as `garment_flat_width`; do not overwrite it as body circumference. Use a method ID for each illustrated procedure and record whether MeasureOnce multiplied a width for a circumference comparison. UNIQLO's official guidance tells shoppers to lay a garment flat, smooth wrinkles, and follow product-specific measurement points; it also warns that fabric and placement can create variation ([UNIQLO measurement guide](https://faq-us.uniqlo.com/articles/en_US/FAQ/How-to-Measure)).

Then ask the fit observation for that same region:

- circumference regions: too tight / slightly tight / just right / slightly loose / too loose;
- length regions: too short / slightly short / right / slightly long / too long.

Do not ask irrelevant questions. If a sleeveless dress has no sleeve constraint, do not ask about sleeves.

### 3. Make measuring forgiving

- Show a small diagram or animation beside each field.
- Accept inches and centimetres and preserve the entered value/unit.
- Ask for two readings when practical; warn when the pair differs beyond a configurable method tolerance.
- Offer “someone can help me” wording for difficult dimensions.
- Validate plausible ranges but never silently correct a value.

This assistance matters: in a study of 103 women taking apparel-oriented measurements, average error varied substantially by dimension; self-measurements had more absolute error than partner measurements, and hip circumference was undermeasured on average ([Yoon & Radwin, 1994](https://doi.org/10.1177/001872089403600311)). The product should therefore expose uncertainty and avoid false precision.

### 4. Result and abstention language

Use three evidence statuses:

- **Measured match** — all required regions have compatible, method-tagged evidence.
- **Partial match** — enough evidence to narrow options, but at least one result-affecting region is missing; show what is known and request the single most useful next measurement. Do not present one size as final.
- **Preference saved; no measured match yet** — label/category/fit answers only. Explain that the app will not guess across brands and offer manual size selection.

Never label the last state “low-confidence recommendation.” That still sounds like a recommendation and hides the absence of geometry.

## Data model and decision rules

Add a distinct manual reference record rather than forcing an unknown garment into the catalog-variant model:

```ts
type ManualReferenceGarmentEvidence = {
  brandText?: string;                 // descriptive only
  productText?: string;               // descriptive only
  category: GarmentType;
  labelSize?: string;                 // descriptive only
  measurements: Array<{
    region: MeasurementRegion;
    value: number;
    unit: "in" | "cm";
    kind: "garment_flat_width" | "garment_circumference" | "garment_length";
    methodId: string;
    repetitions?: number[];
  }>;
  observations: Partial<Record<MeasurementRegion, ReferenceObservation>>;
  measuredAt: string;
};
```

Decision rules:

1. `labelSize`, `brandText` and `category` contribute **zero numeric geometry** unless resolved to a versioned chart or exact measured variant.
2. Require target `requiredRegions` (critical regions plus size-axis regions) before returning one recommended size.
3. Compare only like-for-like measurement bases and methods. Flat width, garment circumference and body circumference are not interchangeable without an explicit, versioned conversion.
4. Use subjective observations to adjust or bound an observed regional relationship, not to invent a missing measurement.
5. Keep length and circumference independent; a garment may be right at the waist and too long.
6. If verified body and garment evidence disagree beyond a method-specific tolerance, return `CONFLICTING_EVIDENCE` and ask the shopper to review that region.
7. Persist provenance, method version, timestamp and unit. Recompute when a chart or method version changes.
8. Return structured missing regions and the next best action; never expose raw internal region names to shoppers.

For the manual-garment path, prefer a new direct garment-to-garment comparison mode. The current reference engine subtracts stored wearer ease from catalog garment geometry to estimate the shopper's body. A manually measured garment has no verified wearer-ease record, so applying a generic ease table would recreate the unsupported inference this design is meant to avoid.

## Fit with the current MeasureOnce implementation

The present code already has strong foundations:

- `MeasurementInput` separates body circumferences/lengths and preserves value, unit, method and source.
- `GarmentMeasurement` distinguishes circumference, flat width and length.
- `requiredRegionsForStyle()` combines critical regions with size-axis regions.
- the engine abstains with `INSUFFICIENT_PROFILE_EVIDENCE`, reports `missingRegions`, and detects conflicts between body and known-garment evidence.
- the storefront already offers direct body measurements or an exact catalog garment and asks regional fit questions.

The important boundary is that `ReferenceGarmentEvidence` currently requires a catalog `variantId`. `resolveEvidence()` then requires stored garment geometry and stored regular wearer ease. Therefore an unknown-brand label and subjective fit cannot safely enter the current recommendation calculation. The generic brand/category/label fields visible elsewhere in the storefront are not a substitute for a product-level fit contract.

### Implementation recommendation

Stage the work:

1. **MVP:** add the evidence-ladder UI, category-specific guided body measurement, and the preference-only abstention state. Reuse the current product recommendation endpoint and `missingRegions` behavior.
2. **Next:** add `ManualReferenceGarmentEvidence`, illustrated flat-garment methods, and a separately tested garment-to-garment comparator. Preserve measurement provenance and prohibit label-derived dimensions.
3. **Enrichment:** ingest versioned official brand/category charts and exact-product measurement feeds. Mark chart-level evidence separately from exact-product geometry.
4. **Later validation:** consider photo measurement only after device/pose accuracy, privacy, failure modes and real-garment outcomes are evaluated.

Success criteria for the MVP are behavioral, not predictive-accuracy claims: no recommendation from label-only evidence; every recommendation covers the target's required regions; missing evidence produces an actionable shopper-facing prompt; inches and centimetres are equivalent after normalization; and the flow is tested across dresses, upper-body garments and bottoms.

## Assumptions and limitations

- The recommendation assumes the target product has method-tagged, size-level garment geometry. If it does not, MeasureOnce must abstain regardless of shopper evidence.
- Official retailer guides describe their own systems; they do not establish universal ease allowances or cross-brand conversions.
- The accessible ISO pages provide abstracts and status information; the full standards are paid and were not inspected.
- Self-measurement can be useful but is not error-free. The UX should record method and uncertainty rather than imply laboratory precision.
- “Fits well” is personal and region-specific. A later production model needs validation with real garments and shoppers before any claim about recommendation accuracy or return reduction.

## Primary sources

- [ISO 8559-1:2017, anthropometric definitions](https://www.iso.org/standard/61686.html)
- [ISO 8559-2:2025, primary and secondary dimension indicators](https://www.iso.org/standard/85590.html)
- [Nordstrom women's measurement guide](https://www.nordstrom.com/sizeguides/456_sizeguide.pdf)
- [UNIQLO, How can I figure out my size?](https://faq-us.uniqlo.com/articles/en_US/Knowledge/How-can-I-figure-out-my-size/)
- [UNIQLO, How to Measure](https://faq-us.uniqlo.com/articles/en_US/FAQ/How-to-Measure)
- [Levi's size chart and guide](https://www.levi.com/US/en_US/info/sizeguide)
- [Patagonia size and fit guide](https://www.patagonia.com/guides/size-fit/)
- [Yoon & Radwin (1994), consumer-made body-measurement accuracy](https://doi.org/10.1177/001872089403600311)
- [Ashdown & DeLong (1995), perception testing of apparel ease variation](https://pubmed.ncbi.nlm.nih.gov/15677000/)
