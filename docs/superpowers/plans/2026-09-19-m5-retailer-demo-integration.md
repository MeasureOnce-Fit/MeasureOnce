# M5 Retailer Demo Integration Plan

**Goal:** Turn the approved M5 widget mock into a working synthetic retailer demo without exposing catalog geometry or introducing a second shopper password.

**Architecture:** `/retailer-demo` is a separate fictional retailer surface backed by a server-owned item catalog. Its widget submits a retailer item key, preference, and either guest body evidence or a protected Fit Passport profile ID. Server routes map the item key to the internal synthetic product ID before calling the existing recommendation services. The browser receives only the existing sanitized contract and a permitted retailer size handoff.

**Constraints:** No real retailer data, external identity provider, catalog upload, checkout, payment, or persistent retailer order. The existing app session remains the only authenticated fit-profile boundary. The explicit test retailer is single-tenant; a second-retailer adapter is a later M5 increment.

### Task 1: Server-owned retailer catalog and contract

**Files:** Create `src/lib/retailer-demo/catalog.ts`, `src/lib/retailer-demo/fit.ts`, `src/app/api/retailer-demo/fit/route.ts`, and `src/app/api/retailer-demo/saved-fit/route.ts`; add `tests/fit/retailer-demo.test.ts`.

1. Define fictional retailer items with public item IDs, approved product mappings, available labels, and coverage states.
2. Strictly validate guest requests; reject client target product IDs, foreign item IDs, duplicate/invalid measurements, and non-supported preferences.
3. Map a signed-in saved-profile request to the approved product ID before delegating to the existing protected handler.
4. Test valid mapped recommendation, unknown/extra fields, and mapped saved-profile request shape.

### Task 2: Working retailer storefront

**Files:** Create `src/app/retailer-demo/page.tsx`, `src/app/retailer-demo/retailer-demo-client.tsx`, and `src/app/retailer-demo/retailer-demo.module.css`.

1. Render a fictional retailer product view from the server-owned item record.
2. Let a guest enter category-relevant body evidence in inches or centimetres and call the mapped fit endpoint.
3. If an existing protected session exposes owned profiles, offer profile selection and call the mapped saved-profile endpoint.
4. On a recommended label that is available for the retailer item, preselect it in the retailer size control. Otherwise preserve manual size selection and show the returned safe state.
5. Include a local coverage drawer driven by the same server-owned catalog records.

### Task 3: Verification and tracking

1. Run the new fit contract test, all existing fit/identity suites, lint, typecheck, and build.
2. Browser-check guest recommendation, missing-evidence state, retailer size handoff, unavailable signed-profile state, and mobile layout.
3. Update `tasks/todo.md` with implemented versus unimplemented M5 behavior.

### Task 4: Durable catalog-operation boundary

**Files:** Create `src/lib/retailer-catalog/import-contract.ts`, `supabase/migrations/202609190003_m5_retailer_catalog_operations.sql`, `scripts/check-m5-catalog-migration.mjs`, and focused import-contract tests.

1. Validate a bounded, tenant-scoped synthetic catalog payload and create an order-independent SHA-256 content fingerprint.
2. Accept a same-content retry for an existing retailer/idempotency-key pair; reject a changed payload with that same key.
3. Store imports, products, variants, and measurements only in the private schema. The browser receives neither raw garment geometry nor an operator-set fit mapping.
4. Keep an imported item in `review` until a service-role operator explicitly records a reviewed fit-product reference. A `ready` item requires that reference.
5. Run the contract test and static migration structural checks. Do not apply the database migration until the reviewable migration is verified and the user authorizes the external Supabase change.
