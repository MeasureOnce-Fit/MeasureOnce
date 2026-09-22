# Category Size Reference Flow

## Purpose

Simplify known-size entry without treating a brand and size label as garment geometry. The shopper should not have to identify an exact product style when the target clothing category is already known.

## Evidence model

Two records must remain distinct:

1. A **Category Size Reference** is backed by a verified brand/category size chart and normalized measurement methods. It may support a recommendation.
2. **Remembered Size Context** contains a shopper-reported brand, category, size label and regional observations without verified geometry. It may be stored for future reference but cannot independently generate a recommendation.

An exact catalog garment remains stronger evidence and may be offered as an optional advanced path. It is no longer required in the primary known-size workflow.

## Contextual product-fit workflow

When the shopper starts from a product, MeasureOnce derives and displays its clothing category. For example, a jacket target uses the jacket category automatically.

The primary flow is:

1. Select a brand with category-size coverage, or choose `Brand not listed` and enter its name.
2. Select a valid size for that brand and derived category.
3. Describe how that size fits in category-relevant regions.
4. Continue to fit preference and the result.

The UI must not ask for "Garment you own" or ask the shopper to select the category again. The API returns only brands and sizes whose category reference covers every target region and independent size axis required for the target. `Brand not listed` is a separate unverified route and is never presented as catalog coverage.

If the shopper chooses `Brand not listed`, or a formerly covered reference is unavailable, the UI explains that the entered size can be retained as context but cannot produce a measured recommendation. It offers body measurements, measuring a garment, or manual size selection.

## Fit Passport workflow

When adding fit history without a target product, the flow is:

1. Select or enter the brand.
2. Select the clothing category.
3. Select or enter the size designation.
4. Describe the category-relevant regional fit.

If the brand/category/size maps to a verified Category Size Reference, the saved record retains that reference and its version. Otherwise it is saved explicitly as Remembered Size Context. The UI communicates which state applies before saving.

This work adds the entry and storage contract; it does not imply that every brand has verified chart coverage.

## API and validation

The known-size API exposes target-derived category coverage as a cascade:

- target product → compatible brands;
- selected brand → valid category sizes;
- selected size → supported regions and reference version.

The browser submits target product, category-size reference identifier, fit preference and regional observations. It cannot submit chart measurements, target geometry or an arbitrary claim that a remembered label is verified.

Server validation must reject category mismatches, unknown references, missing independent size axes, unsupported observations and client-provided geometry. Responses remain `no-store` and expose labels and qualitative findings without raw catalog geometry.

## Recommendation behavior

- Verified Category Size Reference: may produce a recommendation, adjacent-size trade-off or another existing safe state.
- Remembered Size Context: always abstains from recommending by itself.
- Exact measured garment: remains available as a separate higher-specificity option.
- Body or manual garment measurements: remain unchanged.

No aggregation across unrelated products may be used to invent a generic brand size. A category reference exists only when its measurement source and method are explicitly verified.

## User-interface copy

For a product-context jacket example:

- `Brand with jacket size data`
- `Jacket size you wear`
- `How does that jacket size fit?`

For Fit Passport:

- `Brand`
- `Clothing type`
- `Size on the label`
- `How does this size fit?`

When coverage is absent:

> We can remember this size and how it fits, but this brand/category does not yet have verified measurement data. We will not use the label alone to recommend a size.

## Verification

Acceptance requires named tests for:

- jacket target: brand → jacket size, with no garment/product dropdown;
- `Brand not listed` keeps the derived target category, accepts a label as context and abstains;
- jeans target with independent waist/inseam axes;
- product context never asks category again;
- Fit Passport entry asks brand → category → size;
- verified references can reach recommendation and trade-off states;
- unverified remembered sizes always abstain;
- category mismatch, missing axes and client geometry are rejected;
- desktop, keyboard and compact viewport journeys;
- existing exact-garment, body-measurement and manual-garment paths remain functional.

## Non-goals

- Inferring measurements from a brand name or size label.
- Treating all products from one brand as geometrically identical.
- Claiming physical fit accuracy from synthetic fixtures.
- Importing external brand size charts in this change.
