# Unknown-brand evidence ladder design

**Approved direction:** 20 September 2026  
**Research:** `docs/research/unknown-brand-fit-fallback.md`

## Outcome

When a shopper's reference garment is absent from the measured catalog, MeasureOnce offers four explicit evidence paths: search a verified item, measure a similar garment, enter body measurements, or continue without measuring. A brand, category, label size and subjective fit may be retained as session-only preference context, but they contribute no numeric geometry and cannot produce a personalized size.

## Shopper flow

The fit-evidence screen presents four choices in this order:

1. **Find a garment I own** — existing search of exact, measured catalog variants.
2. **Measure a garment that fits** — guided flat-garment measurements for the selected target's required regions.
3. **Use body measurements** — existing guided body path.
4. **I can't measure right now** — optional brand, category, label and regional-fit notes followed by an explicit no-measured-match state, retailer size chart/manual size selection, and no engine recommendation.

The selected target already determines the category. The manual-garment path asks only `requiredRegionsForStyle(target, targetVariants)`. Circumference regions accept a documented flat width or finished circumference; length regions accept a documented garment length. Every field has an illustrated/text method definition and inches/centimetres. Label size remains descriptive.

## Manual garment comparison

Manual measurements use a new endpoint and comparison module; they never enter the existing `ReferenceGarmentEvidence.variantId` path. The comparison is direct garment geometry to target garment geometry:

- normalize inches to centimetres and flat widths to finished circumferences;
- compare only like regions with allowlisted method identifiers;
- `just_right`/`right_length` ranks target variants by absolute regional difference;
- tight/short observations require a larger target dimension and rank the smallest positive difference first;
- loose/long observations require a smaller target dimension and rank the smallest negative difference first;
- a variant violating any requested direction is ineligible;
- aggregate eligible variants lexicographically by direction violations, number of regional winners, then total absolute difference;
- return `NO_SUITABLE_SIZE` when no available variant satisfies every requested direction;
- return `TRADEOFF` only when adjacent variants are tied on violations and win different required regions; otherwise return the unique best `RECOMMENDED` variant.

The result copy says **Closest measured match to your garment**, not body-fit certainty. Findings state whether each target size is larger, similar, or smaller than the measured reference at that region. No generic wearer-ease value, inferred body dimension, or numeric confidence is created.

## Contract

```ts
type ManualReferenceGarmentRequest = {
  targetProductId: string;
  preference: "closer" | "regular" | "relaxed";
  reference: {
    brandText?: string;
    productText?: string;
    labelSize?: string;
    measurements: Array<{
      region: MeasurementRegion;
      value: number;
      unit: "cm" | "in";
      kind: "garment_flat_width" | "garment_circumference" | "garment_length";
      methodId: string;
    }>;
    observations: Partial<Record<MeasurementRegion, ReferenceObservation>>;
  };
};
```

The server derives required regions and rejects missing, duplicate, irrelevant, implausible, mismatched-kind or unknown-method measurements. Optional descriptive strings are trimmed, length-limited and never used in scoring. The public response contains labels, regional findings, required/supported/missing regions, next steps and versions; it exposes no internal variant IDs or garment geometry.

## Preference-only state

The no-measurement path records optional brand, target-derived category, label size and region-level fit feedback in React session state only. Submitting it does not call a recommendation endpoint. The result reads: **Preference saved for this visit. We don't have enough measured evidence to recommend a size.** It offers `Use body measurements`, `Measure a garment`, and `Choose a size manually`. It must never be called low confidence.

## Accessibility and failure behavior

Every path is a real button with a short consequence description. Measurement controls use associated labels, method help, units and fieldsets. Search and recommendation results use live status text, completed-result headings receive focus, and Back preserves already entered values. API validation failures return actionable field-level copy; service failure never blocks manual size selection or returning to the product.

## Non-goals

- No photo/body scan.
- No inferred geometry from `M`, `0`, `32`, brand text or category.
- No universal brand chart lookup or web scraping.
- No persistence of unknown-brand free text in the MVP.
- No numerical confidence or real-world accuracy claim.

## Acceptance

- Label-only input cannot call or receive a recommendation.
- Manual garment and body paths cover every target required region before submission.
- Dress, upper-body and bottoms manual journeys render the correct fields.
- Unit-equivalent manual inputs return the same state and labels.
- Missing/invalid manual inputs are rejected; raw geometry and internal IDs never leave the endpoint.
- Desktop and compact journeys cover verified search, unknown-item manual measurement, body fallback and can't-measure abstention without overflow.
