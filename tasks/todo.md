# MeasureOnce execution plan

## Active correction: complete declared category-size coverage

- [ ] Replace the M-only baseline chart fixtures with declared synthetic ranges for every active brand, collection, category and sellable label.
- [ ] Add a frozen regression for women’s saved dress size `0` producing a recommendation for a different women’s dress.
- [ ] Verify every catalog brand/category/size option is exposed, uses a compatible declared reference, and never recommends a non-sellable label.
- [ ] Run the authenticated browser journey after rebuilding the local server; record exact pass/fail evidence rather than claiming broad regression coverage.

## New shoppers, account wordmark and collection copy, 19 September 2026

- [x] Add `/account/signup`, sign-in/create-account navigation, password confirmation, pending-email and resend states, and PKCE confirmation callback with an allowlisted return destination.
- [x] Provision only verified shoppers for the configured public showcase; preserve existing shopper identities and reject operator conversion. Existing database signup gate verified enabled; no partner signup or schema changes.
- [x] Restore equal font sizing for MEASURE and ONCE, including mobile. Replace both collection-count descriptions with original short copy.
- [x] 66 retailer-identity tests, lint, typecheck and build passed. Browser signup UI exercised with a mocked email response; real Supabase session mapping exercised with a temporary pre-verified shopper and cleaned up.
- [x] Published `dpl_AriQcG2Gn3yN9fAw5Frmg2dkEiYn`. Signup UI/browser assertions passed on the public alias; a new pre-verified synthetic shopper reached Fit Passport with one stable principal and an empty protected profile list. Test account removed. Screenshot evidence: `.tmp/signup-production/`.
- [x] Enable and verify prototype immediate signup in Supabase. In Authentication → Sign In / Providers, Confirm email is off while Allow new users to sign up remains on. The app no longer requests confirmation redirects. Production must restore confirmation, URL allowlisting, and SMTP before real-customer use.

## Active correction: approved landing artwork and working navigation

- [x] Restore live MeasureOnce navigation, search, My Fit and cart; preserve the approved collage as artwork only.
- [x] Replace the fixed-width screenshot hero with responsive text, real CTAs and benefit cards. No invented signed-in shopper.
- [x] Separate Home, About, Shop Women and Shop Men. Move the fit demonstration, explanations, evaluation boundary and FAQs to About; use page navigation rather than home-page shopping anchors.
- [x] Local Chromium: 24 route/viewport checks (4 pages × 6 widths), plus 4 journey groups covering department selection, cart persistence, About/FAQs, search, setup, skip and signed-out account destination. Desktop and narrow screenshots inspected. Build passed.
- [x] Final lint/typecheck passed. Published deployment `dpl_9Es4xd8RWne6VpUimigg1z41T5xf` to the existing public alias. All 28 browser checks passed on production with no runtime exceptions; hosted desktop/mobile screenshots inspected. Evidence: `.tmp/navigation-production/results.json`; reusable runner: `scripts/verify-storefront-navigation.mjs`. This verifies navigation and responsive UI, not payment processing or real-world fit accuracy.

Status: M1 engineering implementation is complete and reproducible. The collaborator approved 43 contract cases and resolved the remaining product decision: trade-off sizes are equal options rather than primary/alternate recommendations. The corrected trade-off case now awaits one final review click. Every later implementation milestone follows the same discussion and approval gate.
Planning date: 17 September 2026.

## Confirmed scope and starting point

- A working retailer-integrated fit service and multi-brand showcase, developed as a serious portfolio product with a possible future startup path.
- Two collaborators; free resources only; fictional brands, synthetic garment measurements and synthetic shoppers. No real customer dataset or physical fit-validation cohort is available.
- Both input paths are confirmed: relevant body measurements OR a known garment with independent regional fit feedback. Support centimetres and inches in both.
- All 11 current categories remain in scope. The current catalog has 17 department/category combinations, 200 products, 1,200 size variants and one fictional brand.
- Existing code inspection: sign-in is a UI state change, profiles use localStorage, and recommendations depend on a product seed rather than shopper measurements. This is the baseline to replace, not evidence of completed authentication or fit prediction.
- This proposal supersedes the older roadmap's three-test-identity plan and immediate reliance on obtaining real customer data. The PRD is unchanged.
- M1 implementation was authorized after its decisions were reviewed. Account provisioning, deployment and application UI changes remain outside M1 and require their later milestone reviews.

## Accounts, profiles, preferences and evaluation cases

The earlier proposal of 72 login accounts was incorrect. It combined four separate concepts:

- **Account:** the authenticated owner and security boundary.
- **Fit profile:** measurements, garment references and preferences for one person. It may represent the account owner or an additional member selected by name; the data model does not encode a required relationship type.
- **Preference:** category/region-specific fit choices belonging to a fit profile; one profile can hold many preferences.
- **Evaluation case:** a temporary combination of profile, category, brand, product, unit and preference used by automated tests.

The provisional end-to-end identity set is **4 shopper accounts plus 2 retailer-operator accounts across 2 fictional retailers = 6 application identities**. Guest shopping is an unauthenticated state, not another account. The four shoppers cover same-retailer shopper isolation, an account with additional member profiles, a second retailer with colliding external identifiers, and account/consent lifecycle scenarios. Test resets let the same identities exercise new, returning, incomplete and deletion states.

Synthetic recommendation coverage uses **24 base measurement profiles**, not 72 accounts: 2 catalog departments × 3 measurement bands × 4 proportion patterns. Each profile is exercised with 3 fit preferences, producing **72 baseline preference cases**.

- Departments: the existing men's/women's catalog fit specifications; these do not define gender identity or restrict what a shopper can browse.
- Bands: lower, middle and upper portions of the synthetic measurement range. These are not universal S/M/L sizes.
- Patterns: reference proportions; relatively greater waist/hip requirements; relatively greater chest/shoulder requirements; and relatively longer torso/limbs. Opposing and combined patterns, including shorter lengths, belong in additional boundary scenarios. These are numeric fixtures rather than population body-type labels.
- Preferences: closer, regular and relaxed, expressed as category-dependent synthetic fit rules, not universal physical standards. They multiply test cases, not people or accounts.
- The 12 base profiles for each department exercise its supported category pairs across all three preferences: 12 × 3 × (8 men's categories + 9 women's categories) = **612 baseline profile/preference/category cases** before brands, products, input paths and unit representations.
- Body input, known-garment input, cm, inches, mixed units, lifecycle states and malformed inputs multiply scenarios, not the number of people. One shopper can exercise many scenarios.
- This is an engineering coverage budget, not a statistically calculated customer sample or proof of real fit accuracy. The count increases when the coverage matrix reveals missing cases.
- Seed the small identity set through the supported test/admin mechanism using reserved synthetic addresses; do not create external email identities, publish credentials or generate fake production traffic. Test real email/OAuth delivery separately if configured.
- Account count is unrelated to concurrency capacity. Load testing is a separate bounded workload.

One account may contain several explicitly selected fit profiles and each profile may hold independent category preferences and garment anchors. The canonical term is **additional member profile**, without assuming partner, spouse, child or another relationship. For a real product, saving measurements for another person raises consent and control questions. M3 research will compare a session-only shopping path, account-owned additional member profiles, and recipient-invited profiles before this behavior is approved. The synthetic demo may use clearly fictional additional member profiles meanwhile.

## Measurement and recommendation contract

- Every measurement carries value, unit, anatomical/garment region, measurement method and source. Body circumference, finished garment circumference and flat garment width are separate quantities.
- Normalize to canonical centimetres at a declared precision; preserve the original value/unit. One inch equals exactly 2.54 cm. Calculations must not use rounded display strings.
- Support decimals and clearly parsed common fractional inches. Ambiguous punctuation or conflicting inline/selected units must prompt correction rather than silently reinterpret input.
- Switching units converts existing values; it does not relabel numbers. Persist the preferred display unit. Mixed-unit fields/import rows retain individual units.
- Example acceptance: 32 in and 81.28 cm produce the same normalized evidence and recommendation. Repeated display toggles do not accumulate conversion drift. Near-threshold tests use the declared precision.
- Validate required fields, missing versus zero, negatives, impossible representations, non-finite values, malformed ranges, unexpected units and inconsistent measurement methods. Flag unusual body values for confirmation rather than silently changing them.
- Collect only category-relevant information. Do not infer a complete body from height, weight, a body-shape label or a photograph.
- A known reference garment requires an identifiable product/size with stored dimensions, or user-supplied garment measurements. Brand plus size label alone does not establish its geometry.
- Keep feedback independent: waist tight and length right can coexist. Fit preference, fabric stretch and cut are explicit synthetic assumptions, with versioned rules.
- Recommendations return a size and regional explanation, a meaningful adjacent-size trade-off, or a clear insufficient-evidence/no-suitable-size result. No random size selection or invented confidence percentages.
- Unit tests, malformed inputs, missing-data scenarios and independently reviewed answer fixtures form separate evaluation layers. Generator rules cannot be the sole answer key for the engine.

## Coding milestones and completion evidence

Each milestone uses the same gate: research/current-state analysis → decision brief → user confirmation → mockup when the milestone has a user interface → implementation → verification report. Approval of one milestone does not silently approve later milestones.

Current review artifacts: `docs/milestones/M1-measurement-engine-decision-brief.md` and `docs/research/m2-identity-and-profile-plan.md`.

- [ ] **M1: measurement foundation and working baseline engine.** The internal engine has typed category/variant/profile schemas, exact cm/in normalization, 10 balanced fictional brands, 200 styles, 2,028 synthetic variants after independent size-axis expansion, 24 base profiles, 72 preference combinations and seven result states. Exact composite labels require their axis evidence: waist/inseam, neck/sleeve, jacket length and petite/regular/tall choices cannot be guessed. All 1,200 source size positions trace to generated variants. Six sparse-category fixtures contain recommendable styles, variants and method-tagged measurements. The reproducible evaluation runs 612 profile/preference/category cases plus six sparse-category executions. `npm run test:fit` and `npm run eval:fit` are the completion commands. All 44 literal contract cases mechanically pass exact state, size options and per-option regional findings. The `TRADEOFF` contract now marks both choices as equally ranked and the dashboard presents separate Option A/Option B evidence without calling either primary. Forty-three prior approvals remain valid; only the revised `waist-length-tradeoff` fingerprint is pending re-review. The evaluation JSON refreshed, while regeneration of the CSV/Markdown companion files is temporarily blocked by a Windows lock on `m1-contract-case-review.csv`.

- [ ] **M2: retailer-owned identity and durable profiles.** The user approved one account login with retailer-scoped MeasureOnce fit storage; the MeasureOnce showcase remains the visible site and future retailer integrations use the same signed-assertion contract. Implemented foundations include the typed identity service, consent and lifecycle rules, categorized anchors, Supabase schema/RLS, private external-identity mapping, atomic create/replace/delete profile snapshots, database-derived centimetre normalization, non-identifying deletion receipts, durable replay storage, asymmetric retailer-assertion verification, short-lived secure application sessions, synthetic tenant fixtures, protected profile/consent/export/deletion routes and Fit Passport-only account deletion. A verified showcase retailer login now exchanges for the same protected application session without creating a separate Fit Passport password. The approved warm editorial UI is implemented at `/fit-passport` and connected to those routes, with sign-in/sign-out, profile creation/view/rename/removal, consent controls, export, and Fit Passport deletion. The development-only `?preview=ready` state uses visibly labelled fictional in-memory data and never pretends that changes persist. Sensitive Fit Passport data is not written to localStorage. Local regression passes 22 fit tests, 66 identity tests, 4 repository tests, 60 retailer-identity tests, 9 seed/environment tests, static schema verification, lint, typecheck and a production build. The free hosted Supabase project now has both migrations, 2 retailers, 6 identities and 6 profiles. Hosted isolation passed for all six accounts, and the repeatable live journey verified account switching plus create, rename, export and delete without cross-account leakage. Remaining work: executable pgTAP when Docker is available, cross-browser UI persistence, expired-session and provider-outage journeys, and a real external retailer identity provider. Do not claim production readiness until those checks pass.

- [ ] **M3: both Fit Passport journeys.** Before mockup or code, research short-question onboarding, category-specific minimum evidence, measurement comprehension, additional-member privacy, progressive disclosure and skip behavior. Present the exact proposed questions, why each is required, which appear by category, and the expected completion burden for confirmation. Then mock and approve both body-measurement and known-garment paths. Implementation includes contextual questions, unit conversion, independent regional feedback, profile switching, incomplete-profile recovery and engine-backed recommendations. Remove preselected fit answers and seed-derived recommendations from the connected flow. Completion: new/returning/guest shoppers and owner/additional-member profiles can complete, skip, resume and edit; recommendations change when relevant evidence changes; category switches request missing relevant evidence; charts/manual size choice remain usable.

  **Current status:** Production implementation is in progress. The interactive review mock was approved. The selected-product body-measurement and exact-known-garment paths call strict server-owned adapters and display returned states and regional findings. The body route asks only category-relevant measurements and supports cm/in. The garment route requires a specific synthetic catalog garment and labelled size, then records each regional observation independently. Neither route creates a recommendation from a brand and label alone. The storefront now loads the protected retailer-scoped profile list, lets the shopper select the owner or an additional member, and sends only that profile ID, the target and preference to a protected saved-profile route. That route loads the owned profile server-side and returns the same sanitized contract; body measurements can now be added or edited in the Fit Passport profile screen in inches or centimetres. Browser checks covered the guest body fixture result (`8/10`) and its evidence recap, the Fit Passport preview’s inch-to-centimetre conversion and local save, and a mobile jacket flow with no horizontal overflow. Keyboard activation reaches the guest and known-garment evidence paths. The known-garment picker now prioritizes distinct jacket references, while a jacket presets waist and hip/seat to editable “Not applicable” and asks for chest/bust, shoulders, body length and sleeve length. The live synthetic retailer journey also created a temporary profile, stored three body measurements, received the protected `8/10` saved-profile recommendation, exported it, removed it, and confirmed account isolation. Manual retailer size selection remains separate because the storefront catalog’s display labels have not yet been reconciled with the engine’s expanded variant labels. Remaining M3 work is returning/incomplete-profile and accessible-name regression coverage. This work does not claim physical fit accuracy because the catalog and measurements remain synthetic.

  - [x] Add the server-owned product-fit adapter, with strict request validation and no client-provided catalog geometry.
  - [x] Replace the storefront’s seed-derived result with the adapter result for selected products, including safe states and manual-size fallback.
  - [x] Connect approved Fit Passport profile evidence and additional-member selection for authenticated retailer sessions. The browser sends only a selected owned profile ID; the server reloads and normalizes its stored body measurements under the retailer session. Profiles can edit optional body measurements in cm or inches. Live authenticated browser verification remains part of the final M3 verification row.
  - [ ] Verify returning/incomplete-profile and accessible-name regression coverage. Guest body and known-garment flows, selected-product category routing, cm/in conversion, protected saved-profile recommendation, keyboard activation, storefront loading and mobile overflow have browser or live-journey evidence.

- [x] **M4: distinctive landing page and live preview.** Produce desktop and mobile mockups first, including the fictional-brand rail, interactive comparison, regional measurement visual, capability cards, FAQ and footer. Review and revise the mockup before implementation. The approved live preview calls the same recommendation service as the product flow. Completion: no fake customer logos or outcome statistics; preview supports both paths, unit toggling and fallback states; keyboard, mobile, zoom and reduced-motion checks pass; existing full garment galleries remain usable. Design research may continue alongside M1; the working preview depends on M1/M3 contracts.

  **Current status:** Complete. The approved responsive experience is embedded on the public homepage without removing the storefront or commerce overlays. Its allowlisted public showcase adapter calls the real M1 engine for verified Avenoir, Velmora and Solenne & Rue denim targets, and the browser renders the returned state, size options, regional findings and fallback instructions. Final verification passed the fit/API, Fit Passport identity and retailer-identity suites, lint, typecheck, production build, desktop interaction, mobile overflow, anatomical fit-map, product gallery and Fit Passport navigation checks.

  - [x] Add a strict, server-owned synthetic showcase adapter and API route with no catalog or raw method inputs exposed to the browser.
  - [x] Embed the approved M4 sections in the public homepage while preserving `#shop`, `#fit`, `#passport`, account, cart, product drawer and checkout behavior.
  - [x] Render loading, API failure, recommendation, trade-off and no-suitable-size states without invented confidence or hard-coded labels.
  - [x] Run fit/API tests, identity regressions, lint, typecheck, production build and desktop/mobile browser journeys before marking M4 complete.

- [ ] **M5: retailer integration and catalog operations.** First decide the integration boundary and produce two mockups: the retailer product-page widget and retailer catalog/coverage console, including loading, insufficient-data, error and unavailable states. Review these before coding. Implementation then embeds the service on a separate test retailer surface; connects scoped identity, item/variant identifiers, availability and selected-size handoff; and adds catalog import/review and decision inspection. Completion: two retailers' data stays isolated; duplicate imports are safe; invalid measurements are rejected with actionable errors; widget failure does not block shopping. No additional MeasureOnce shopper password is required inside a real retailer integration. Checkout, payment and fulfilment remain retailer responsibilities.

  **Current status:** The approved visual review remains at `/m5-review`, and the working single-retailer test surface is now available at `/retailer-demo`. The Aster Department Store demo uses server-owned item keys to map the retailer item to an internal synthetic catalog product. Guest body evidence goes to a strict mapped fit endpoint; the browser cannot submit a target product ID or garment geometry. The saved-profile path maps the same item key before it delegates to the existing protected retailer-session handler. The widget preselects a recommendation only when that exact label is in the retailer item’s available labels, keeps the selector editable, and preserves manual selection for safe outcomes. A local bag count demonstrates that fit checks do not block retailer shopping; no payment or checkout is processed. The catalog readiness section is driven by the same server-owned fixture records. Browser evidence covers a guest outerwear recommendation and size handoff (`EU 32` to `EU 36`), editable manual selection, local bag update, signed-out saved-profile fallback, category-specific dress inputs, no browser errors, and a 390px layout without horizontal page overflow. The Supabase project now has private tenant-scoped catalog import, product, variant and measurement tables plus service-role-only import/review/inspection functions. Two fictional tenants, Northstar and Harbor, now have isolated, reviewed catalog records. The applied corrective migrations align the JSON payload casing and allow a pending same-content import to resume. The live seed inspection passed for both tenants; replaying both accepted payloads returned `duplicate`, proving the idempotency boundary. The import contract rejects client fit-product mappings, validates products, variants and measurements, uses an order-independent SHA-256 fingerprint, and rejects a changed payload under the same idempotency key. Local contract/schema checks pass. Still unimplemented: a real external retailer identity provider, a connected operator-only import/review UI, external inventory/availability, checkout/payment, and physical-fit validation.

- [ ] **M6: evaluation and AI decision.** Before running an evaluation, approve a written protocol: claims being tested; deterministic baseline; independently reviewed expected outcomes; train/tune/held-out grouping; unseen-brand and unseen-style splits; unit-equivalence, missingness, noise, boundary and abstention tests; slice metrics; and release thresholds. Compare a small learned candidate only if a clearly specified learning task and non-circular labels exist. Report coverage and conditional correctness together, plus constraint violations, calibration if probabilities are offered, latency and failure examples. Run browser/auth/security/accessibility/integration regressions separately. Completion: reproducible versioned reports distinguish software correctness, simulated fit performance and unmeasured real-world outcomes. A model ships only if it adds measured value; synthetic learning is not represented as real-user learning.

- [ ] **M7: free-tier deployment and operational evidence.** First review a deployment/operations plan covering provider limits and commercial terms, environments, secrets, logging, error monitoring, data retention, migration, backup/restore, rollback, seed/reset, abuse protection and collaborator access. Deployment requires separate confirmation. After approval, deploy within verified free limits and execute smoke, restoration and rollback checks. Completion: the hosted journey passes, secrets stay server-side, and documented load/availability limits match measured evidence. No enterprise-scale or return-reduction claim follows from deployment alone.

  **Current status:** The hosted Vercel demo at `https://measureonce-prototype.vercel.app` is connected to the synthetic Supabase project. Production public routes pass their smoke checks; unauthenticated private endpoints return `401`; malformed and correctly signed expired application-session cookies return `401`; and the repeatable hosted journey passes separate shopper sessions, account isolation, and a temporary profile create/update/export/delete lifecycle. The precise evidence is recorded in `docs/milestones/M7-deployment-evidence.md`. Still required to complete M7: a deliberately provisioned disposable Supabase restore rehearsal, a Vercel rollback rehearsal, visual verification across two browser applications, a deliberately induced provider-outage check, and measured free-tier load/availability evidence. These are not complete and this deployment is not described as retailer-scale production readiness.

## Landing-page proposal

Design register: a marketing homepage with a functional product preview; shared identity with the shopper application. Preserve the approved storefront palette and typography: warm paper, ink, terracotta, dusty rose, Instrument Serif, Manrope and DM Mono. Do not introduce blue, green, or a trend palette that replaces the existing visual identity.

1. Hero: "Your fit, across brands." Primary action opens the live comparison; secondary action opens the showcase shop.
2. Signature comparison rail: fictional brand marks paired with the same shopper's resulting size. Clicking a brand opens its garment comparison. Label the collection as fictional demo brands. Use a static scrollable alternative and pause controls for any automatic movement.
3. Interactive preview: select a category and fictional product, enter measurements or use a known garment, switch cm/in, and inspect the resulting size and regional reasons. Presets are explicitly examples; personal inputs are not silently persisted.
4. Regional fit visual: an accessible garment outline with selectable waist, chest, shoulder and relevant length regions, plus equivalent text. Show why one region can fit while another does not. This is a measurement diagram, not a simulated image of a shopper's body or physical drape.
5. Capability cards: saved Fit Passport, brand-specific comparisons, regional explanations, and retailer integration. Link to the working capability. Business benefits remain hypotheses, not result counters.
6. FAQ: setup, inches/cm, saved information, reference garments, category coverage, missing evidence, synthetic-data limitations and data deletion. Use semantic disclosure controls.
7. Footer: product/how-it-works, showcase, evaluation methodology, documentation and actual privacy/support destinations. No invented customers, case studies, team members, careers or inactive social links.

## Risks and choices

- Synthetic measurements can prove controlled behaviour but not physical fit. This limitation belongs in the evaluation methodology and demo context, without burying the useful product experience in warnings.
- Accounts are a test mechanism, not user research or demand validation. More accounts with duplicated measurements do not increase meaningful coverage.
- A decorative preview disconnected from the engine would repeat the current placeholder problem; build the shared engine first.
- No timetable is committed without the collaborators' availability. No spending is authorized.
- The M3 questionnaire mock is approved, and M4 is implemented. M5 has a working retailer widget, durable synthetic two-tenant catalog operations, a verified operator-only catalog console, and a coverage-review fallback that preserves manual size selection. M6 now has an approved-direction protocol proposal, baseline/comparator/slice artifacts, and a reviewer page; collaborator signoff remains pending before learned-model work. M7 is deployed and has production smoke, session and synthetic journey evidence; its restore, rollback, provider-outage, visual multi-browser and measured-capacity rehearsals remain open.

## Planning evidence

- Current catalog and page source inspected; no application code changed during planning.
- Both input paths confirmed by the user in this conversation.
- Parallel research notes: `docs/research/synthetic-coverage-and-units.md` and `docs/research/landing-design-direction.md`.

## Known-garment search repair, 19 September 2026

- [x] Require the shopper to search by brand or garment before showing catalog-backed references.
- [x] Return only exact garment/size references that cover every critical and composite-size-axis region required by the target product.
- [x] Ask and submit only the selected reference garment's supported regions, including neck, sleeve, inseam and body-length axes when required.
- [x] Replace the broken insufficient-evidence result layout with actionable recommendation, no-match and labelled two-size tradeoff states.
- [x] Verify 47 fit regressions, lint, typecheck, production build, four-category API journey, stale-search ordering, live status announcements, inseam-axis completion, labelled tradeoffs, and desktop/compact flows with result focus and no horizontal overflow.
- [x] Expose compatible measured brands before search, then require an explicit brand → garment → labelled-size selection. Keep text search as an optional filter rather than the primary entry path; verify the cascade on desktop and compact viewports.

## Unknown-brand evidence ladder, 20 September 2026

- [x] Add a strict manual-reference garment contract and direct geometry comparator that never derives dimensions from brand or label text.
- [x] Add no-store GET requirements and POST recommendation handlers with sanitized public responses.
- [x] Add four evidence choices: verified garment, measured garment, body measurements, and can't-measure-now.
- [x] Render target-derived manual measurement questions and an honest preference-only no-recommendation state.
- [x] Verify unit equivalence, composite axes, invalid evidence, label independence, desktop/compact journeys, lint, typecheck and production build. Evidence: 62/62 fit tests, clean lint/typecheck/build, and `scripts/verify-unknown-brand-ui.mjs` passing the measured-garment and abstention journeys at desktop and 390px without horizontal overflow.

## Category-size reference flow, 20 September 2026

- [x] Task 1 — explicit synthetic category-size references and strict recommendation contract. The explicit adapter presents only a declared category reference to the existing reference-garment engine; no unrelated catalog variant is used. Evidence: `tests/fit/category-size-reference.test.ts` passed 4/4 from an isolated compile output; source no-emit typecheck and focused lint passed. The shared `npm run test:fit` output directory is temporarily locked by concurrent work and remains a final regression gate.
- [x] Task 2 — no-store category-size API for compatible brands and sizes. Evidence: `tests/fit/category-size-reference.test.ts` exercises brand and size listings, malformed query/body validation, client-geometry rejection, and sanitized recommendation responses; `npm run test:fit` passed 72/72 on 20 September 2026.
- [x] Task 3 — product flow: target-derived category → brand → size → regional fit, including a context-only unknown-brand path. Fresh production browser checks cover jacket, jeans, tops, exact garment, and editable abstention.
- [x] Task 4 — Fit Profile evidence-kind migration and validation for verified references and remembered size context. `npm run test:identity` (75/75), `npm run test:identity-repository` (6/6), and `npm run verify:m2-schema` passed. Hosted migration remains unapplied.
- [x] Task 5 — Fit Passport flow: brand → clothing type → size → regional fit. Evidence: `scripts/verify-fit-passport-known-size.mjs` passes the Orivelle/Jackets/8 verified-reference and outside-brand context-only preview journeys at desktop and 390px, including keyboard selection, duplicate prevention and removal; `npm run test:identity` passes 75 tests including protected PATCH acceptance and the real service's canonical `Outerwear` fixture provenance check; source `npm run typecheck` passes.
- [x] Task 6 — final review and regression: feature review/re-reviews approved; fit 74/74, identity 75/75, repository 6/6, retailer identity 66/66, schema, typecheck, lint, build, and production browser checks passed.

## Category brand coverage correction, 20 September 2026

- [x] Separate catalog category membership from verified reference eligibility in the category-size API.
- [x] Replace the ten shopper-facing synthetic brand names while preserving stable internal IDs and reference IDs.
- [x] Route catalog-only and external brands to remembered context without recommendation API calls.
- [x] Rebuild and verify all-brand jacket/dress, verified, catalog-only and external-brand browser journeys. Evidence: production build passed; `npm run test:fit` passed 77/77; lint and typecheck passed; the production browser suite verified all-category brand enumeration, verified recommendations, catalog-only abstention, external-brand abstention, and zero recommendation POSTs for unverified paths; adjacent unknown-brand, all-perfect, and Fit Passport preview browser regressions passed.

## Collection-specific verified charts, 21 September 2026

- [x] Scope synthetic verified size references by department so men’s and women’s charts cannot be mixed for the same brand/category label.
- [x] Add a regression for Solenne & Rue men’s jacket `M` with just-right chest, shoulders, and body length.
- [x] Verify the full fit suite (80/80), production build, and the live Cairn Modern Harrington browser journey returning `FIT — Try 40R`.
- [x] Replace the single-size men’s outerwear fixture with ordered `XS, S, M, L, XL, XXL` references for all ten brands, including size-graded geometry.
- [x] Verify all 60 men’s jacket brand/size combinations through both the engine matrix and complete browser journeys; the fit suite now passes 83/83 and the browser matrix passes 60/60.
`n## Centered header refinement, 19 September 2026`n- [x] Centered editorial wordmark with terracotta ONCE; shopping and account controls share the navigation row, About last. Mobile uses the same reading order in a three-column grid.`n- [x] Lint, typecheck and build passed. Desktop/mobile local screenshots inspected; 28 browser checks passed locally and against the public alias, including logo centering and accent assertions. Deployment: dpl_8QssTL9yAdNYstkg9t3PGQaGVUbo. Evidence: .tmp/header-production/results.json.

## Saved known-size recovery, 21 September 2026

- [x] Reorder Fit Passport known-size entry to clothing type → brand → complete verified size list (collection first when needed).
- [x] Upgrade exact collection-scoped legacy contexts to verified category references and consume matching legacy references safely at recommendation time.
- [x] Reject ambiguous both-collection legacy reinterpretation.
- [x] Verify Velmora Dresses `0` persistence, all `0, 2, 4, 6, 8, 10` picker values, and the signed-in Lek → Balanced storefront journey.
