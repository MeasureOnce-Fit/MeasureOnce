# Unknown-brand Evidence Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let shoppers use a measured unknown-brand garment, direct body measurements, or an honest no-measurement fallback without ever deriving geometry from a size label.

**Architecture:** Add a strict manual-reference comparator and API beside the existing exact-known-garment and body endpoints. Keep UI-only preference evidence outside the engine, and derive every measurement question from the target's server-owned required regions.

**Tech Stack:** Next.js 16 route handlers, React 19 client UI, TypeScript, Node test runner, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-20-unknown-brand-evidence-ladder-design.md`

## Global Constraints

- Brand/product/category/label text contributes zero numeric geometry.
- Manual reference measurements use a separate direct comparator; never invent wearer ease or body dimensions.
- Ask only target-required regions and preserve units/method provenance.
- No new dependency, photo scan, chart scraping, persistence or numeric confidence.
- Manual size choice and return to product remain available in every failure state.

---

### Task 1: Manual reference contract and comparator

**Files:**
- Create: `src/lib/fit/manual-garment.ts`
- Modify: `src/lib/fit/types.ts`
- Test: `tests/fit/manual-garment.test.ts`

**Interfaces:**
- Consumes: `buildSyntheticCatalog()`, `requiredRegionsForStyle()`, `MeasurementRegion`, `ReferenceObservation`.
- Produces: `listManualGarmentRequirements(targetProductId)` and `getManualGarmentRecommendation(value)`.

- [ ] Write failing tests proving requirements include composite axes; labels do not affect results; cm/in and flat-width/circumference inputs are equivalent; missing/duplicate/irrelevant/method-mismatched evidence is rejected; directional observations filter candidates; sanitized results contain no raw geometry or variant IDs.
- [ ] Run `npm run test:fit` and confirm failures are caused by the missing module/API.
- [ ] Implement exact parsing, method allowlists, normalization and the direct comparator described in the spec. Descriptive strings are trimmed to 80 characters and excluded from scoring.
- [ ] Return the existing shopper-safe result shape with evidence source `manual_reference_garment`, qualitative regional findings and `RECOMMENDED`, `TRADEOFF`, or `NO_SUITABLE_SIZE` only.
- [ ] Run `npm run test:fit` and confirm the new tests and existing suite pass.

### Task 2: Strict manual-garment route

**Files:**
- Create: `src/app/api/fit/manual-garment/route.ts`
- Modify: `src/lib/fit/manual-garment.ts`
- Test: `tests/fit/manual-garment.test.ts`

**Interfaces:**
- GET: `/api/fit/manual-garment?targetProductId=...` returns `{ requirements }` with region, shopper label, accepted kinds and method IDs.
- POST: `/api/fit/manual-garment` consumes `ManualReferenceGarmentRequest` and returns a sanitized recommendation.

- [ ] Add failing handler tests for GET/POST, `Cache-Control: no-store`, malformed JSON, unknown target, unknown keys, missing evidence and absence of geometry/internal identifiers in responses.
- [ ] Run `npm run test:fit` and observe the expected handler failures.
- [ ] Implement the route handler by delegating all parsing and comparison to `src/lib/fit/manual-garment.ts`; do not duplicate business rules in the route.
- [ ] Run `npm run test:fit` and confirm green.

### Task 3: Evidence-ladder state and request shaping

**Files:**
- Create: `src/lib/fit/manual-garment-ui.ts`
- Modify: `src/app/storefront.tsx`
- Test: `tests/fit/manual-garment.test.ts`

**Interfaces:**
- Produces `manualGarmentFields(requirements)`, `buildManualGarmentRequest(...)`, unit conversion labels and human-readable method help.
- Adds evidence paths `known`, `manual`, `body`, `unmeasured`, and existing `saved`.

- [ ] Write failing pure-helper tests showing a dress, shirt/coat and trouser requirement set produces only the required fields; flat-width methods remain distinct from body circumference; label text is descriptive; incomplete forms cannot shape a request.
- [ ] Run `npm run test:fit` and confirm the missing helper behavior fails.
- [ ] Implement the helper and update storefront state without rendering new controls yet. Keep each evidence path's state independent when switching.
- [ ] Run `npm run test:fit` and `npm run typecheck` and confirm green.

### Task 4: Shopper interface and result states

**Files:**
- Modify: `src/app/storefront.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/lib/fit/known-garment-ui.ts` only if shared region labels are moved to a neutral helper.
- Test: `scripts/verify-known-garment-ui.mjs`

**Interfaces:**
- Renders four entry choices and posts the manual path to `/api/fit/manual-garment`.
- Renders preference-only completion locally without calling any fit endpoint.

- [ ] Extend the browser script first with failing journeys for `Another brand / not listed`, target-derived manual fields, unit controls, manual recommendation, no-measurement abstention, path switching, result focus and compact overflow.
- [ ] Run the browser script against the current production build and observe the expected missing-control failure.
- [ ] Implement the evidence cards, optional descriptive fields, progressive measurement fields, method help, regional observations, preference-only copy and manual-result explanation using existing design tokens.
- [ ] Ensure the unmeasured path has no request call and actions lead to body/manual input or close the overlay for manual product sizing.
- [ ] Run lint, typecheck and focused browser verification until all journeys pass.

### Task 5: Full regression and evidence record

**Files:**
- Modify: `tasks/todo.md`
- Modify: `tasks/lessons.md`
- Modify: `scripts/verify-known-perfect.mjs` if representative manual API coverage belongs there; otherwise add `scripts/verify-manual-garment.mjs`.

**Interfaces:**
- Produces reproducible verification output and screenshot artifacts under `.tmp/known-garment-ui/`.

- [ ] Add a production API journey covering dress, upper-body and bottoms manual requirements, unit equivalence, label independence and no internal geometry exposure.
- [ ] Run `npm run test:fit`, `npm run lint`, `npm run typecheck`, then `npm run build` sequentially.
- [ ] Start the production server and run both API and Playwright journeys on desktop and compact viewports; visually inspect normal, tradeoff, manual and abstention screenshots.
- [ ] Review all changed files for unrelated edits, raw region names, accidental geometry exposure and claims stronger than the synthetic evidence.
- [ ] Record completion evidence in `tasks/todo.md` and the prevention rule in `tasks/lessons.md`.

## Self-review

- Spec coverage: every evidence rung, direct-comparison boundary, validation rule, result state and accessibility requirement maps to a task.
- Placeholder scan: no implementation placeholder or deferred acceptance item remains in this plan.
- Type consistency: `ManualReferenceGarmentRequest`, `listManualGarmentRequirements`, `getManualGarmentRecommendation`, and the GET/POST route names are stable across tasks.
