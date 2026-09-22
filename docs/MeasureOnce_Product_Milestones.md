# MeasureOnce: production product delivery roadmap

Research checked: 17 September 2026. Status: proposed delivery plan, not an implementation claim or PRD.

## Confirmed scope

- Build a fit recommendation service inside a retailer's existing shopping system, plus a multi-brand showcase website.
- Target the US; Macy's and Nordstrom are customer archetypes, not confirmed customers or integration partners.
- Two collaborators; free resources only. Team skills, weekly availability, target date, and service accounts are not yet confirmed.
- No real garment dataset or fit-test participants are available yet.
- Support all 11 current catalog categories: Dresses, Tops, Shirts & Tees, Knitwear, Sweatshirts, Outerwear, Tailoring, Trousers, Denim, Shorts, and Skirts. No footwear, children, intimates, or body scanning is added by this plan.
- Retain the existing 200 products and 600 generated images as clearly identified showcase assets. Generated pictures cannot establish physical measurements or real fit outcomes.
- The retailer owns checkout, payments, stock, shipment, and returns operations. MeasureOnce reads permitted availability and outcome events; it does not become a clothing merchant.
- Use three controlled test identities plus independent guest sessions for application testing. Synthetic identity records are not evidence of physical fit.

## Recommended product

The retailer signs a shopper in normally. Its server provides MeasureOnce with a verified, short-lived identity scoped to that retailer. The shopper receives an optional fit invitation or opens Find my size beside the product's size selector. They identify a familiar garment and describe relevant fit areas. MeasureOnce saves permitted information, evaluates the selected product, explains the recommendation or why it cannot give one, and returns the chosen size to the retailer. Future visits reuse the profile. Permitted feedback, purchase, exchange, and return events feed the evaluation process.

The delivered product has four working surfaces:

1. A multi-brand showcase site using the real service, with synthetic merchandise clearly identified.
2. An embeddable fit widget and documented API that can run on a second independently hosted retailer test site.
3. Retailer operations screens for catalog import, measurement review, coverage, failures, and decision inspection.
4. A reproducible evaluation and release pipeline, including real fit validation when data and testers become available.

Shoppers do not create a second MeasureOnce account inside an integrated retailer. The showcase needs its own real authentication to demonstrate that lifecycle. Raw retailer passwords never enter MeasureOnce. Browser-supplied customer IDs alone are not trusted authentication.

## What research changes

Cross-brand recommendations, persistent profiles, confidence indicators, and widgets are established competitor capabilities. True Fit also documents catalog and outcome inputs. These are expected capabilities, not a unique pitch. [True Fit specification](https://www.truefit.com/fit-intelligence-spec)

Fit Analytics documents product, identity, sizing-system, consent, availability, and order integration. Its feed/PDP/order identifiers must align. That makes adapter contracts and reliable outcome joins core product work. [Fit Finder integration](https://developers.fitanalytics.com/about-fit-finder/)

Regional fit descriptions and no-good-match results also already exist in Bold Metrics. MeasureOnce cannot claim competitors never explain fit or abstain. [Bold Metrics API](https://docs.boldmetrics.io/virtual-sizer)

Our proposed wedge is an inspectable reference-garment workflow: independently describe waist and length, see the evidence used, correct errors, and avoid unsupported recommendations. Whether retailers will buy this, or whether shoppers prefer it, remains a hypothesis to test with buyers and users.

A size label is not a garment specification. Body dimensions, flat garment widths, and garment circumferences must remain distinct. UNIQLO explicitly distinguishes body and product measurements and warns that fit/design matter. [UNIQLO measurement guidance](https://faq-uk.uniqlo.com/articles/en_US/Knowledge/How-to-choose-your-size)

## Current starting point

The existing Next.js application supplies the browse/search/filter experience, product gallery, 200 products, 600 image files, regional questionnaire controls, and bag/checkout demonstration. Recent typecheck, lint, and build checks passed.

Real authentication, database ownership, retailer integration, scoring, calibration, account rights, and model evaluation are absent. The current recommendation comes from the product seed rather than shopper answers; confidence percentages are hardcoded. All products belong to one fictional brand, and measurements come from catalog-index formulas. These must be replaced or explicitly kept in a sandbox.

## Milestones and completion evidence

Each milestone produces working software or decision evidence. Completion requires the stated checks. Dates will be estimated after team capacity is known; a two-person team is not a delivery-duration estimate.

### M0. Establish the data and customer path

**Deliver:** Map the shopper and retailer journeys; define all-category evidence requirements, baseline comparison, expected failure states, data rights, and partner integration needs. Start a source register and recruitment plan. Prepare a buyer interview guide around current workflow, missing data, integration burden, and willingness to pilot. Confirm the showcase identity provider and platform accounts.

**Data acquisition:** Seek permissioned brand/retailer exports first. Public official charts can be reviewed individually as ingestion examples, with source/market/date recorded, but public access is not automatic permission to redistribute. Recruit volunteers using garments they actually own or can try; adopt repeatable garment measurement and fit-rating instructions. No purchases or external outreach occur without the user's authorization.

**Complete when:** Every category has a named evidence requirement and a documented acquisition route or explicit blocker. The team chooses the integration contract and test protocol. Buyer research reports what was actually learned; it does not invent demand when access is missing.

**Outcome:** An executable build plan and a visible data/recruitment dependency. Infrastructure work can proceed while outreach is pending.

### M1. Real accounts, storage, and release foundation

**Deliver:** Source control, reproducible local setup, environment separation, real authentication in the showcase, server-validated sessions, database migrations, retailer-scoped profiles, permission policies, explicit consent, logout, edit/export/delete, and automated checks. Remove unsupported confidence and privacy promises from the existing interface. Create the three controlled test identities.

**Complete when:** A shopper signs in and sees the same saved profile in a second browser; another shopper cannot access it through UI or direct API calls. Expired/forged sessions fail. Withdrawing consent prevents future persistence as specified. Profile deletion clears active data and documents backup retention. No credentials are committed.

**Outcome:** A working account-backed product foundation, replacing localStorage as the source of truth.

### M2. Multi-brand catalog and evidence operations

**Deliver:** Versioned CSV/JSON import, stable retailer/brand/product/variant identifiers, size-system mapping, category-specific garment fields, source records, a reviewer queue, corrections, rollback, and a catalog eligibility dashboard. Seed multiple fictional brands for integration tests, clearly marked synthetic. Preserve separate real-data records when obtained.

**Complete when:** All 11 categories have validated schemas and fixtures. Duplicate/replayed imports are safe. Unknown units, body-versus-garment confusion, flat width-versus-circumference errors, impossible values, missing sizes, stale sources, and ID mismatches are rejected or quarantined. Every accepted measurement has provenance and a version.

**Outcome:** The team can operate the catalog without changing source code. Real-data coverage remains explicitly tracked.

### M3. Short, contextual Fit Passport

**Deliver:** Optional post-sign-in invitation and a persistent product-page entry point. Core setup selects a known item/size and asks relevant regional fit questions, with intended fit preference. Product context supplies the target category and sizes. Save and reuse compatible anchors; support a session-only path for someone else's shopping. No preselected fit answers or prechecked saving permission.

**Reference identification:** Prefer a known purchased SKU or a searchable catalog item. If only a brand and label are known, do not silently invent its dimensions. Ask one useful clarification, offer a voluntary garment measurement where appropriate, or give an explicit fallback.

**Complete when:** New, returning, guest, skip, resume, edit, and gift paths work. Waist-too-loose and length-right can coexist. Irrelevant regions are hidden. Switching category does not reuse an incompatible anchor. Account and consent changes do not leak or silently merge another person's profile.

**Outcome:** A complete reusable fit journey. A two-screen design is a hypothesis; the usability study determines whether it is clear and short enough.

### M4. Working fit decision service

**Deliver:** A server-side dimensional baseline using compatible anchor and target records, category rules, fit observations, intended silhouette, and explicitly modeled material information. Return a recommendation, an ambiguous/no-reliable-match response, or unavailable-data response. Provide region tradeoffs and replayable input/data/rule versions. Cache keys include retailer, shopper profile version, product, and evidence version.

**Complete when:** Controlled changes to relevant inputs change the decision where the specification says they should. Missing evidence, uncertain transfer, incompatible categories, out-of-stock sizes, and adjacent-size ties follow defined paths. The system never substitutes a worse-fitting in-stock size without explanation. All categories have implemented rules and tests, not a generic size-index formula.

**Outcome:** Recommendations are computed from supplied evidence. This does not by itself establish real-world accuracy. A dimensional distance or quality score is not a calibrated probability.

### M5. Repeatable evaluation and real fit validation

**Deliver:** Versioned datasets, evaluation commands, baseline comparisons, failure reports, category/brand/size slices, confidence intervals, and an inspection dashboard. Start synthetic stress tests during M2-M4. Add real garment/fit outcomes when available. Compare the dimensional baseline with a learned correction or ranking model only when labeled data can support training and an independent test set.

**Protocol:** Define acceptable-size sets and regional satisfaction, allowing multiple acceptable sizes. Use an anchor-based dimensional baseline with the same available inputs; use a body-size-chart baseline only where the required body data actually exists. Separate training, validation/calibration, and final testing; report distinct unseen-shopper, unseen-product, and unseen-brand tests. Avoid using the same rule to generate labels and then presenting agreement with it as independent model accuracy.

**Measures:** Acceptable-size hit rate, regional error, accuracy at matched recommendation coverage, abstention and reason correctness, calibration/reliability where probabilities exist, worst-slice performance, sample counts, latency, and unit cost. Report synthetic, physical-test, and historical-event results separately. A kept order is only a weak fit label; return reasons and actual wear feedback need reconciliation.

**Complete when:** Runs reproduce from a recorded version. Release thresholds are agreed before inspecting the final test set. Real fit results cover every category claimed as validated. Unsupported categories remain visibly unvalidated. Numerical confidence is shown only when justified by independent calibration evidence.

**Outcome:** Measured product quality and an evidence-based model selection decision. Synthetic-only completion supports engineering validation, not a real-fit launch claim.

### M6. Retailer widget, identity bridge, and outcome loop

**Deliver:** An embeddable, accessible widget; signed retailer identity handoff; documented API; product/size selection callbacks; tenant isolation; availability refresh; and authenticated purchase/shipment/return/exchange event ingestion. Add replay protection, event deduplication, retries, reconciliation, and traceable outcomes. Keep raw fit answers out of general analytics.

**Complete when:** The same service works on the showcase and a separate retailer test origin without copying its business logic. Forged tenant/identity assertions and unauthorized origins cannot access profiles. Widget delay, blocked cookies, API timeout, invalid feeds, or analytics failure never disable retailer checkout or manual size selection. Duplicate and out-of-order events do not double-count outcomes or corrupt history.

**Outcome:** An end-to-end retailer fit integration that can be demonstrated independently. A test adapter is not claimed to be a certified Macy's or Nordstrom integration.

### M7. Production engineering and operating readiness

**Deliver:** Deployed environments, automated release gates, security and permission tests, accessibility checks, performance/load tests, quota monitoring, alerting, backup/export and restore procedure, rollback, incident response, named support ownership, and user-data retention rules. Review dependencies, secret handling, privileged admin access, and audit logs.

**Complete when:** A documented backup restores successfully; a deployment and model/data rollback is rehearsed; request limits and dependency outages fail safely; critical account and widget journeys pass at supported mobile/desktop sizes; response-time/error budgets are measured against a stated load. Free-tier exhaustion is tested rather than hidden. No unresolved release-blocking security defects remain.

**Outcome:** Operable software with documented capacity and reliability limits. Enterprise availability cannot be promised merely because deployment succeeds.

### M8. Real retailer pilot and commercial release

**Deliver:** Partner data mapping, identity integration, a catalog audit, a shadow run, a controlled shopper pilot, and a release decision report. A shadow run computes recommendations without displaying them; it checks integration and outcome joins before exposure. Pilot requirements include partner data permission, real eligible garments, fit evidence, support ownership, and agreed service limits.

**Evaluation:** Use stable shopper-level randomized assignment where feasible, a preregistered analysis, exposure logging, sample-ratio checks, and the full relevant return window. Report outcomes by assignment, not just people who chose to use the widget. Track fit-related returned units among eligible shipped units alongside kept units and margin per assigned shopper, conversion, bracketing, support load, and site performance. Return rate alone can improve because fewer people buy, so it cannot be the sole success criterion.

**Complete when:** The agreed launch metrics and operational gates pass, or the result explicitly says extend/stop. Claims about return reduction or revenue use measured results with uncertainty. Commercial rollout covers only validated scope; all 11 categories remain required for a claim of full current-category support.

**Outcome:** A retailer-deployed product and defensible commercial evidence. If partner access or validation is unavailable, this milestone remains blocked rather than being marked complete from synthetic accounts.

## Brand, size, and category coverage

Measurements belong to a retailer, brand, style, garment department/fit block, market, size system, labeled size, applicable variant, and evidence version. A universal M record or a fixed per-brand size offset is insufficient. Brand differences are represented by evidence; records are never changed simply to make every brand different.

Each measured value includes the measurement point, unit, method (flat width or circumference), body-versus-garment type, source, date, and uncertainty/tolerance when available. Width-to-circumference conversion is explicit and only used where the source method supports it. Measurements must be comparable before scoring.

| Category | Candidate measurement and construction fields to validate with garment evidence |
|---|---|
| Dresses | Chest/bust, waist, hip, body length; sleeve/shoulder where relevant; fitted vs loose construction |
| Tops | Chest/bust, shoulder or cross-back where relevant, body length; waist/sleeve where relevant |
| Shirts & Tees | Chest, shoulder, body/sleeve length; neck for collared shirts; cut and stretch |
| Knitwear | Chest/bust, body/sleeve length, relevant shoulder construction; stretch and intended ease |
| Sweatshirts | Chest, body/sleeve length, hem; dropped-shoulder or raglan construction where relevant |
| Outerwear | Chest/bust, shoulder or cross-back, sleeve and body length; hip and layering allowance where relevant |
| Tailoring | Jacket/blazer and trouser subtypes use separate schemas; coordinated sets retain both component sizes |
| Trousers | Waist, hip/seat, rise, thigh, inseam; cut and stretch |
| Denim | Waist, hip/seat, rise, thigh, inseam; cut, stretch, and source-stated wash/fit characteristics |
| Shorts | Waist, hip/seat, rise, thigh/leg opening, inseam; cut and stretch |
| Skirts | Waist, hip where relevant, length; silhouette, closure, and stretch |

These are candidate evidence fields, not a requirement that shoppers enter all of them. Garment data supplies measurements; the shopper supplies observations for relevant areas. Men's and women's garment departments maintain separate product records, size systems, and evaluation slices. Unisex items use their actual published records. The model does not infer body dimensions from a gender selection.

Test every category present in each department. Record unsupported combinations explicitly rather than creating nonexistent products merely to fill a men-by-women matrix. If adding categories to a department is desired, that is a catalog expansion decision.

Synthetic brand fixtures may have distinct size labels, starting measurements, grading increments, cuts, and stretch. Variation should exist within a brand as well as between brands; uniform grading and identical shape must not be assumed. Label these as invented test data. Real records replace them only when sourced and reviewed; generated pictures cannot validate the numbers.

Required checks: same label with different dimensions; different labels with comparable dimensions; different styles within one brand; separate men's/women's/unisex systems; petite/tall where represented; waist-by-inseam combinations; incompatible anchors; unavailable sizes; missing regional evidence; and brand renaming that must not change a purely dimensional result. A model may use a learned brand effect only if training data and held-out evidence justify it. If relevant dimensions match, matching recommendations are allowed. Do not require a different label for every brand.

Report tests and real fit evidence by department, category, brand, style, and available size range, including sample counts and failures. A single pooled accuracy number cannot establish all-category performance. The existing sparse categories need additional real evidence before validation can be claimed.

## Testing with three accounts

| Identity | Purpose | Main scenarios |
|---|---|---|
| Shopper A | First-time then returning shopper | Signup, skip/invite, independent regional answers, save, refresh, second device, profile correction, consent withdrawal, deletion |
| Shopper B | Different shopper and preferences | Different anchors, opposing fit needs, inaccessible A data, guest-to-account boundary, session expiry, unsupported item, cross-account cache checks |
| Retailer operator C | Restricted catalog/operations role | Import and correct data, inspect permitted decision records, reject malformed feeds, no unrestricted shopper-profile access, tenant-scoped administration |

Use at least two synthetic retailer tenants, with separate scoped identities and integration credentials. Test that even the same customer ID in two retailers does not join their data. Role-denial fixtures and guest sessions do not require buying more accounts.

Automated scenarios reset the accounts to known fixtures rather than manually clicking only three happy paths. Use isolated browser contexts. Generate load identities and tokens locally in disposable test infrastructure, not by mass-creating public accounts or bypassing provider limits. Seed local credentials in a test-only environment; never publish production passwords or administrator credentials. External OAuth requires at least a real manual smoke test in addition to mocked-provider automation.

| Test group | Required edge cases and evidence |
|---|---|
| Identity and privacy | Wrong/expired/replayed identity, logout, shared device, forged user/retailer IDs, direct database/API access, export ownership, deletion, consent off, no automatic guest/gift merge |
| Catalog | All categories and available size systems, missing or stale measurements, reversed units, flat width/circumference, duplicate variant, unavailable size, revised chart, partial import and rollback |
| Shopper interaction | Empty/invalid answers, skipped regions, contradictory observations, unknown anchor, long names, interrupted setup, new category, stale profile, multiple tabs and concurrent edits |
| Fit decisions | No candidate, one candidate, adjacent ties, conflicting regions, stretch uncertainty, unsupported transfer, outliers, every response state, deterministic replay, explanation agrees with calculation |
| Integration | Product/color/size-system changes, navigation without reload, blocked third-party storage, origin restrictions, token expiry, timeout, retries, duplicate or delayed events, order-return-exchange joins |
| Resilience and accessibility | Offline/slow network, database outage, free quota exhausted, rate limits, keyboard/focus/Escape, screen-reader labels, zoom/reflow, narrow screens, Chromium/Firefox/WebKit automation |
| Model and product evaluation | Data leakage, unseen shopper/product/brand, low-count slices, calibration, confidence intervals, unsafe recommendations, onboarding comprehension, completion, abandonment and correction |
| Deployment and operations | Clean clone/setup, migrations, secrets scan, backup restore, release/model/data rollback, synthetic monitoring, alerts, retention and recovery documentation |

Use unit/property tests for calculations and conversions; database-policy tests for ownership; API contract tests; Playwright for real journeys; and fault injection for failures. CI stores pass/fail reports and useful failure traces with sensitive fields removed. High-risk invariants need explicit tests; pairwise scenario combinations reduce redundant testing. This is a risk-based test plan, not a promise to enumerate every possible edge case.

## Free-resource implementation proposal

Reuse Next.js/TypeScript. Use Postgres and authentication through Supabase, a hosted function/API layer, local open-source evaluation tools, and Playwright. Prefer a supported managed deployment over Kubernetes or multiple microservices. Put only public showcase assets and reproducible synthetic fixtures in the public repository.

Netlify is a candidate because it supports Next.js and its Free plan permits commercial projects. It has finite credits and can pause service at exhaustion. Confirm the exact existing Next.js version and free account quota through a deployment spike before locking this choice. [Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/), [Free plan](https://www.netlify.com/blog/introducing-netlify-free-plan/), [Credit limits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/)

Supabase Free is suitable for initial engineering and controlled testing, but inactivity pausing and backup/availability limits matter. Establish exports and a tested restore process. Its default SMTP is restricted; use a supported OAuth flow for the hosted showcase unless a usable sending setup is available. Test email flows locally without pretending that a local email sink is production delivery. [Pricing](https://supabase.com/pricing), [Production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

Do not build this commercial service on the assumption that Vercel Hobby permits it: that plan restricts commercial use. [Vercel terms](https://vercel.com/legal/terms)

No paid LLM is necessary on the recommendation path. A trained model is introduced only if it improves the measured decision. Optional chart extraction should be evaluated separately and require source-backed human review; an LLM does not create missing garment measurements.

The free constraint can support a working hosted service at limited scale. If a retailer requires guaranteed availability, larger capacity, independent security work, or paid infrastructure, the partner must supply resources or the constraint must be revisited. Neither existing free accounts nor partner funding is assumed.

## Delivery dependencies and collaboration

M0 starts first. M1 and data acquisition can progress together. M2 supplies evidence to M3-M4. Synthetic evaluation starts early; real-data M5 depends on data and participant access. M6 begins with the API contract and is finalized against the working engine. M7 runs throughout development and closes before real shopper exposure. M8 requires a participating retailer and sufficient real evidence.

Suggested two-person split, subject to skills: one owner coordinates product decisions, buyer/data access, scenarios, and evaluation; the other coordinates engineering, integration, deployment, and operations. Both review failure cases and launch evidence. Do not assign these roles to named people without confirming capacity.

Maintain a milestone board with owner, dependency, acceptance check, evidence link, status, and blocker. "Done" means the evidence is attached. A feature demonstration, automated test result, and physical-fit validation are recorded separately.

## Self-critique and decisions still required

- Reference-garment discovery could become more frustrating than the questionnaire. Test identification success and time before claiming low friction.
- All-category coverage multiplies data and fit-validation effort. A fallback everywhere is safe software behavior, but it does not complete all-category recommendation validation.
- Explanations, abstention, and profiles are not inherently unique. Interview retailer buyers before asserting demand or a competitive advantage.
- Synthetic data generated by our own rules can flatter our model. It is for stress tests and regression, while independent real outcomes establish fit quality.
- Three accounts can exercise many software states but cannot estimate population accuracy, fairness, or return reduction.
- A ten-person usability study can reveal usability problems; it cannot establish reliable accuracy for every category or business impact. Study size follows the claim and required precision.
- Free infrastructure has real ceilings. Availability and security are ongoing operating responsibilities, not a final checkbox or a percentage-complete claim.
- Historical purchases omit unpurchased alternatives and carry selection bias. Retrospective fit evidence and causal business evidence must remain separate.
- Deadline, weekly team availability, technical responsibilities, existing provider accounts, retailer/data outreach access, and real participant recruitment are unresolved. No promised launch date or commercial accuracy target is assigned yet.

Further methods: [scikit-learn leakage guidance](https://scikit-learn.org/stable/common_pitfalls.html), [probability calibration](https://scikit-learn.org/stable/modules/calibration.html), [Microsoft experimentation analysis](https://www.microsoft.com/en-us/research/articles/patterns-of-trustworthy-experimentation-post-experiment-stage/).
