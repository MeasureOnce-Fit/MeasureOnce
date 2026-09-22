# Category Size Reference Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the product-context brand → exact garment → size workflow with brand → category-specific size → regional fit, while storing unverified remembered sizes as non-recommending Fit Passport context.

**Architecture:** Add a server-owned category-size-reference module backed by explicit synthetic verified chart fixtures, never by aggregating unrelated products. A strict no-store API exposes target-derived brands/sizes and accepts only opaque verified reference IDs for recommendations. Fit Passport anchors gain an evidence-kind discriminator so verified category references and unverified remembered context remain distinct through validation and persistence.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node test runner, Zod, Supabase PostgreSQL, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-20-category-size-reference-flow-design.md`

## Global Constraints

- A size designation is an identifier, not a measurement.
- Do not aggregate unrelated catalog products into a generic brand size.
- Only an explicit versioned Category Size Reference may support a recommendation.
- Remembered Size Context always abstains when used by itself.
- Product context derives category from the target and never asks the shopper to classify it again.
- The primary product flow contains no garment/product dropdown.
- Exact measured garment, body-measurement and manual-garment paths remain available and unchanged.
- API responses use `Cache-Control: no-store` and never expose raw geometry.
- This directory has no `.git`; replace commit steps with checked task milestones in `tasks/todo.md`.

---

### Task 1: Verified category-size reference domain and fixtures

**Files:**
- Create: `src/lib/fit/category-size-reference.ts`
- Create: `src/lib/fit/category-size-reference-fixtures.ts`
- Modify: `src/lib/fit/types.ts`
- Test: `tests/fit/category-size-reference.test.ts`
- Modify: `tasks/todo.md`

**Interfaces:**
- Produces: `CategorySizeReference`, `CategorySizeReferenceSummary`, `listCategorySizeBrands(targetProductId)`, `listCategorySizeOptions(targetProductId, brandId)`, and `recommendFromCategorySizeReference(input)`.
- Consumes: `FitCatalog`, `MeasurementRegion`, `ReferenceObservation`, `requiredRegionsForStyle`, and the existing recommendation result sanitizer conventions.

- [ ] **Step 1: Write the failing fixture and listing tests**

```ts
test("lists only verified brand/category references that cover the jacket target", () => {
  const brands = listCategorySizeBrands("mo-women-081");
  assert.ok(brands.length > 0);
  assert.ok(brands.every((brand) => brand.category === "Outerwear"));
  const sizes = listCategorySizeOptions("mo-women-081", brands[0].brandId);
  assert.ok(sizes.length > 0);
  assert.ok(sizes.every((size) => size.supportedRegions.includes("chest_bust")));
  assert.ok(sizes.every((size) => !Object.hasOwn(size, "measurements")));
});

test("keeps independent jeans axes in category-size labels", () => {
  const brand = listCategorySizeBrands("mo-men-006")[0];
  const sizes = listCategorySizeOptions("mo-men-006", brand.brandId);
  assert.ok(sizes.some((size) => size.axes?.waist && size.axes?.inseam));
});
```

- [ ] **Step 2: Run the fit suite and confirm RED**

Run: `npm run test:fit`

Expected: compilation fails because `category-size-reference` and its exports do not exist.

- [ ] **Step 3: Define the public and internal types**

```ts
export interface CategorySizeReference {
  id: string;
  version: string;
  synthetic: true;
  brandId: string;
  brandName: string;
  category: string;
  size: SizeDesignation;
  measurements: GarmentMeasurement[];
  wearerEaseCm: Record<FitPreference, Partial<Record<MeasurementRegion, number>>>;
}

export interface CategorySizeReferenceSummary {
  id: string;
  version: string;
  brandId: string;
  brandName: string;
  category: string;
  sizeLabel: string;
  axes?: SizeDesignation["axes"];
  supportedRegions: MeasurementRegion[];
}
```

- [ ] **Step 4: Add explicit verified synthetic chart fixtures**

Create immutable fixtures for at least dresses, tops, jeans/trousers, and jackets. Each fixture declares `category`, size designation, method-tagged measurements, wearer ease, and version. Do not calculate a fixture by averaging catalog variants.

```ts
export const CATEGORY_SIZE_REFERENCE_VERSION = "synthetic-category-chart-v1";

export const categorySizeReferenceFixtures: CategorySizeReference[] = [
  {
    id: "csr:formline:outerwear:8",
    version: CATEGORY_SIZE_REFERENCE_VERSION,
    synthetic: true,
    brandId: "brand_05",
    brandName: "Orivelle",
    category: "Outerwear",
    size: { label: "8", format: "numeric", systemId: "formline-outerwear", ordinal: 3 },
    measurements: [
      { region: "chest_bust", kind: "garment_circumference", valueCm: 101, methodId: "m1:circumference:chest_bust" },
      { region: "shoulder_cross_back", kind: "garment_length", valueCm: 40.5, methodId: "m1:length:shoulder_cross_back" },
      { region: "body_length", kind: "garment_length", valueCm: 69, methodId: "m1:length:body_length" },
      { region: "sleeve_length", kind: "garment_length", valueCm: 60.5, methodId: "m1:length:sleeve_length" },
    ],
    wearerEaseCm: {
      closer: { chest_bust: 7, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      regular: { chest_bust: 10, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
      relaxed: { chest_bust: 13, shoulder_cross_back: 0, body_length: 0, sleeve_length: 0 },
    },
  },
];
```

Use the repository’s current measurement-method constant rather than hard-coding `m1` if its value differs.

- [ ] **Step 5: Implement target-category filtering and strict recommendation parsing**

`listCategorySizeBrands` derives target category and required regions, returning a brand only when at least one fixture in that category covers every required region and size axis. `recommendFromCategorySizeReference` accepts exactly:

```ts
type CategorySizeRecommendationInput = {
  targetProductId: string;
  preference: FitPreference;
  referenceId: string;
  observations: Partial<Record<MeasurementRegion, ReferenceObservation>>;
};
```

Reject unknown keys, unknown references, target/category mismatch, missing required observations and unsupported regions. Convert the verified fixture into the existing reference-garment engine input internally; sanitize the result using the existing public result shape.

- [ ] **Step 6: Add negative and recommendation tests**

```ts
test("rejects client geometry and category mismatches", () => {
  assert.throws(() => recommendFromCategorySizeReference({
    targetProductId: "mo-women-081",
    preference: "regular",
    referenceId: "csr:formline:dresses:8",
    observations: { chest_bust: "just_right" },
    measurements: [{ region: "chest_bust", valueCm: 90 }],
  }), /invalid category size reference/i);
});
```

- [ ] **Step 7: Run the fit suite and record the milestone**

Run: `npm run test:fit`

Expected: all tests pass. Mark Task 1 complete in `tasks/todo.md` with the test count.

---

### Task 2: Strict category-size reference API

**Files:**
- Create: `src/app/api/fit/category-size-reference/route.ts`
- Modify: `src/lib/fit/category-size-reference.ts`
- Test: `tests/fit/category-size-reference.test.ts`
- Modify: `tasks/todo.md`

**Interfaces:**
- Consumes: Task 1 listing and recommendation functions.
- Produces: `GET /api/fit/category-size-reference` views `brands` and `sizes`; `POST /api/fit/category-size-reference` recommendation response.

- [ ] **Step 1: Write failing handler tests**

```ts
test("category-size API lists brands then sizes without raw geometry", async () => {
  const brands = await handleCategorySizeReferenceRequest(new Request(
    "http://localhost/api/fit/category-size-reference?targetProductId=mo-women-081&view=brands",
  ));
  assert.equal(brands.status, 200);
  assert.equal(brands.headers.get("Cache-Control"), "no-store");
  assert.doesNotMatch(await brands.clone().text(), /valueCm|measurements|wearerEase/);
});
```

- [ ] **Step 2: Run the focused suite and confirm RED**

Run: `npm run test:fit`

Expected: compilation fails because `handleCategorySizeReferenceRequest` does not exist.

- [ ] **Step 3: Implement GET and POST routing**

```ts
export async function GET(request: Request) {
  return handleCategorySizeReferenceRequest(request);
}

export async function POST(request: Request) {
  return handleCategorySizeReferenceRequest(request);
}
```

GET `view=brands` requires `targetProductId`. GET `view=sizes` requires `targetProductId` and `brandId`. POST accepts only the Task 1 input contract. All responses set `Cache-Control: no-store`; validation errors return 400 and unexpected errors return a generic 500.

- [ ] **Step 4: Add malformed-input and exposure tests**

Cover missing target, unknown view, unknown brand, malformed JSON, unexpected keys, client geometry, reference/category mismatch, and a response scan excluding variant IDs and raw measurements.

- [ ] **Step 5: Run the fit suite and record the milestone**

Run: `npm run test:fit`

Expected: all tests pass. Mark Task 2 complete in `tasks/todo.md`.

---

### Task 3: Product-context brand → size storefront flow

**Files:**
- Modify: `src/app/storefront.tsx`
- Modify: `src/app/globals.css`
- Create: `src/lib/fit/category-size-reference-ui.ts`
- Modify: `scripts/verify-known-garment-ui.mjs`
- Test: `tests/fit/category-size-reference.test.ts`
- Modify: `tasks/todo.md`

**Interfaces:**
- Consumes: Task 2 API summaries and recommendation endpoint.
- Produces: target-derived `Brand with {category} size data` → `{Category} size you wear` → regional observations UI.

- [ ] **Step 1: Rewrite the browser acceptance test before the UI**

For the jacket journey assert:

```js
await page.getByRole("button", { name: /Find a size I know/ }).click();
await page.getByLabel("Brand with jacket size data").selectOption({ label: "Orivelle" });
assert.equal(await page.getByLabel("Garment you own").count(), 0);
assert.equal(await page.getByLabel("Clothing type").count(), 0);
await page.getByLabel("Jacket size you wear").selectOption({ label: "8" });
await page.getByRole("group", { name: "Chest / bust fit" }).getByText("Just right", { exact: true }).click();
```

Add a jeans journey that selects independent waist/inseam label axes, and a `Brand not listed` journey that reaches the abstention state without POSTing to a recommendation endpoint.

- [ ] **Step 2: Run against the current production build and confirm RED**

Run:

```powershell
$env:PLAYWRIGHT_MODULE='C:\Users\saipr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:TEST_BASE_URL='http://localhost:3200'
node scripts\verify-known-garment-ui.mjs
```

Expected: failure because the current UI still exposes `Garment you own` and lacks the category-size controls.

- [ ] **Step 3: Add request shaping helpers**

In `category-size-reference-ui.ts`, export:

```ts
export function categoryNoun(category: string): string;
export function categorySizeObservations(
  feedback: FitFeedback,
  supportedRegions: MeasurementRegion[],
): Partial<Record<MeasurementRegion, ReferenceObservation>>;
```

Test that jacket copy uses `jacket`, the target category is not client-selectable, and only supported regions are submitted.

- [ ] **Step 4: Replace the primary known path UI**

Rename the choice to `Find a size I know`. On entry, fetch compatible brands for the selected target. Render:

1. `Brand with {category} size data`, including `Brand not listed`.
2. `{Category} size you wear` after a covered brand is chosen.
3. Category-relevant regional observations after size selection.

Do not render `Garment you own`, a product-style selector, or a category selector. Keep `Measure a garment that fits` as the separate exact-geometry path.

- [ ] **Step 5: Implement `Brand not listed` abstention**

Collect optional brand text, size label and regional observations. Continue directly to the existing preference-only result with copy that this is remembered context, not verified geometry. Assert no request is sent to `/api/fit/category-size-reference` POST.

- [ ] **Step 6: Connect verified references to POST**

Submit only:

```ts
{
  targetProductId: selected.id,
  preference,
  referenceId: selectedCategorySizeReference.id,
  observations: categorySizeObservations(fitFeedback, selectedCategorySizeReference.supportedRegions),
}
```

Remove product-name state and the primary exact-garment selector from this path. Preserve the manual measured-garment route and its API.

- [ ] **Step 7: Run browser, fit, type and lint checks**

Run:

```powershell
npm run test:fit
npm run typecheck
npm run lint
$env:PLAYWRIGHT_MODULE='C:\Users\saipr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:TEST_BASE_URL='http://localhost:3200'
node scripts\verify-known-garment-ui.mjs
```

Expected: all commands pass; desktop and compact screenshots show no garment dropdown and no horizontal overflow. Record Task 3 evidence in `tasks/todo.md`.

---

### Task 4: Fit Profile evidence-kind contract and reversible persistence migration

**Files:**
- Modify: `src/lib/identity/types.ts`
- Modify: `src/lib/identity/validation.ts`
- Modify: `src/lib/identity/service.ts`
- Modify: `src/lib/identity/supabase-repository.ts`
- Create: `supabase/migrations/202609200009_category_size_reference_context.sql`
- Modify: `scripts/check-m2-migration.mjs`
- Test: `tests/identity/validation.test.ts`
- Test: `tests/identity/service.test.ts`
- Test: `tests/identity/supabase-repository.test.ts`
- Modify: `tasks/todo.md`

**Interfaces:**
- Produces a discriminated `FitAnchorDraft` union.
- Preserves legacy exact-garment rows as `evidenceKind: "exact_garment"`.

- [ ] **Step 1: Write failing identity contract tests**

```ts
const remembered = {
  evidenceKind: "remembered_size_context",
  brandName: "Outside Label",
  category: "Jackets",
  sizeLabel: "M",
  observations: { chest_bust: "just_right" },
};
assert.deepEqual(parseProfilePatch({ anchors: [remembered] }).anchors, [remembered]);
assert.throws(() => parseProfilePatch({ anchors: [{
  ...remembered,
  evidenceKind: "category_size_reference",
  referenceId: undefined,
}] }));
```

- [ ] **Step 2: Run identity suites and confirm RED**

Run: `npm run test:identity; npm run test:identity-repository`

Expected: type/validation failures because evidence-kind fields do not exist.

- [ ] **Step 3: Define the discriminated union**

```ts
export type FitAnchorDraft =
  | {
      evidenceKind: "exact_garment";
      brandId: string;
      productId: string;
      category: string;
      sizeLabel: string;
      observations: Record<string, string>;
    }
  | {
      evidenceKind: "category_size_reference";
      referenceId: string;
      referenceVersion: string;
      brandName: string;
      category: string;
      sizeLabel: string;
      observations: Record<string, string>;
    }
  | {
      evidenceKind: "remembered_size_context";
      brandName: string;
      category: string;
      sizeLabel: string;
      observations: Record<string, string>;
    };
```

Use a Zod discriminated union with strict objects and existing label bounds. Do not allow reference IDs or versions on remembered context.

- [ ] **Step 4: Add the reversible database migration**

Add `evidence_kind`, `reference_id`, `reference_version`, and `brand_name` to `fit_anchors`. Backfill existing rows as `exact_garment`, make `evidence_kind` non-null, and add a check constraint enforcing fields per kind. Replace the create/replace profile RPCs so their `jsonb_to_recordset` definitions accept the new fields and preserve legacy exact-garment payloads during the transition.

The down section is documented as explicit reverse SQL comments: drop the new constraint and columns only after proving no non-exact rows remain. Do not delete or coerce remembered context automatically.

- [ ] **Step 5: Update repository mapping and snapshots**

Map database rows into the union by `evidence_kind`. Serialize only fields belonging to the selected variant. Add repository tests for all three kinds and for a legacy exact-garment row.

- [ ] **Step 6: Run identity/schema verification and record the milestone**

Run:

```powershell
npm run test:identity
npm run test:identity-repository
npm run verify:m2-schema
```

Expected: all pass. Record Task 4 evidence in `tasks/todo.md`. Do not apply the migration to hosted Supabase without a separate deployment request.

---

### Task 5: Fit Passport brand → clothing type → size editor

**Files:**
- Modify: `src/app/fit-passport/fit-passport-client.tsx`
- Modify: `src/app/fit-passport/fit-passport.module.css`
- Create: `scripts/verify-fit-passport-known-size.mjs`
- Modify: `tests/identity/protected-http.test.ts`
- Modify: `tasks/todo.md`

**Interfaces:**
- Consumes: Task 4 `FitAnchorDraft` union and the protected profile PATCH contract.
- Produces: a Fit Passport known-size editor that saves verified references or remembered context with honest evidence status.

- [ ] **Step 1: Write the failing browser journey**

In preview mode, open Jane’s profile, choose `Add a known size`, then assert the sequence:

```js
await page.getByLabel("Brand").selectOption({ label: "Orivelle" });
await page.getByLabel("Clothing type").selectOption("Jackets");
await page.getByLabel("Size on the label").selectOption({ label: "8" });
await page.getByRole("group", { name: "Chest / bust fit" }).getByText("Just right", { exact: true }).click();
await page.getByRole("button", { name: "Save known size" }).click();
await page.getByText(/verified category size reference/i).waitFor();
```

Add an outside-brand journey that enters brand/category/label and asserts `Saved as context — not used alone for recommendations`.

- [ ] **Step 2: Run the new journey and confirm RED**

Run:

```powershell
$env:PLAYWRIGHT_MODULE='C:\Users\saipr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:TEST_BASE_URL='http://localhost:3200'
node scripts\verify-fit-passport-known-size.mjs
```

Expected: failure because the editor does not exist.

- [ ] **Step 3: Add the editor state and progressive fields**

Render brand first, clothing type second, and valid size third. Derive regional observation fields from the selected category. Display the evidence status before save:

- `Verified category size data` for a known reference.
- `Saved as context — not used alone for recommendations` for an unverified brand/category/label.

- [ ] **Step 4: Save through the existing protected profile update**

Append the discriminated anchor to `selected.anchors` and PATCH through the existing protected API. Preview mode updates only in-memory fictional data and remains visibly marked as preview. Prevent duplicate records with the same evidence kind, brand/reference, category and size label.

- [ ] **Step 5: Render and edit saved evidence honestly**

Known-size cards show brand, category, label, regional observations and either `Verified reference` or `Context only`. Exact-garment legacy cards continue to render. Removing a known-size card updates the complete anchors array through the protected PATCH.

- [ ] **Step 6: Run browser and identity regression checks**

Run:

```powershell
npm run test:identity
npm run test:identity-repository
npm run test:retailer-identity
npm run typecheck
npm run lint
$env:PLAYWRIGHT_MODULE='C:\Users\saipr\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
$env:TEST_BASE_URL='http://localhost:3200'
node scripts\verify-fit-passport-known-size.mjs
```

Expected: all pass, including verified and context-only save paths. Record Task 5 evidence in `tasks/todo.md`.

---

### Task 6: Full regression, visual review and requirement traceability

**Files:**
- Modify: `tasks/todo.md`
- Modify: `tasks/lessons.md`
- Inspect: `.tmp/known-garment-ui/*.png`
- Inspect: `.tmp/fit-passport-known-size/*.png`

**Interfaces:**
- Consumes all prior tasks.
- Produces completion evidence mapped line-by-line to the approved spec.

- [ ] **Step 1: Run all relevant automated gates sequentially**

```powershell
npm run test:fit
npm run test:identity
npm run test:identity-repository
npm run test:retailer-identity
npm run verify:m2-schema
npm run typecheck
npm run lint
npm run build
```

Expected: every command exits 0. Run `typecheck` and `build` sequentially because this project shares generated Next.js type artifacts.

- [ ] **Step 2: Run the actual shopper journeys against the production build**

Start `npm run start -- --port 3200`, then run both Playwright scripts with the bundled runtime. Confirm:

- jacket: brand → jacket size → fit, no garment/category selector;
- jeans: composite waist/inseam label remains complete;
- outside brand: remembered context, no recommendation POST;
- Fit Passport: brand → clothing type → size for verified and context-only entries;
- exact measured garment, body measurement and manual garment regressions still pass;
- desktop and 390px layouts have no horizontal overflow;
- result headings receive focus.

- [ ] **Step 3: Inspect screenshots**

Open every screenshot with the image viewer. Reject clipped labels, ambiguous evidence status, hidden controls, overflow, or any reappearance of `Garment you own` in the primary category-size path.

- [ ] **Step 4: Trace the approved spec to evidence**

Add a checklist to `tasks/todo.md` mapping every Verification bullet in the spec to its named unit/API/browser test and result. Do not mark the feature complete if any requirement lacks a test.

- [ ] **Step 5: Record the prevention rule**

Ensure `tasks/lessons.md` states that a simplified label flow must preserve evidence provenance: verified category references may recommend; remembered labels must abstain; and every explicit UI sequence requires a browser assertion.

- [ ] **Step 6: Report limitations precisely**

The final handoff states that category references are synthetic verified fixtures, no external brand charts were imported, hosted database migration was not applied, and physical fit accuracy remains unvalidated.
