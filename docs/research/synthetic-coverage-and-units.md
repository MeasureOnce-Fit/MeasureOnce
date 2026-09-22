# Synthetic shopper coverage and measurement units

Research date: 17 September 2026. Proposal only; no accounts, application changes, or evaluation results have been created by this research.

## Recommendation and calculation

Use **4 seedable shopper accounts** plus **2 retailer operator identities** across two fictional test retailers. The two human collaborators' development accounts are separate. Do not publish account passwords or create fictional third-party OAuth/email identities. Application test identities can be provisioned through the chosen authentication provider's supported test/admin process after authentication is selected.

Use **24 base measurement profiles**: 2 catalog departments × 3 measurement bands × 4 proportion patterns. Exercising each with 3 fit preferences produces **72 baseline evaluation cases**, not 72 logins or 72 people:

- Departments: the existing men's and women's catalog partitions. These are merchandising routes, not gender identity or access restrictions; any shopper can browse either.
- Measurement bands: lower, middle, and upper portions of the deliberately defined synthetic measurement range. These are not population percentiles or universal size labels.
- Proportion patterns: reference proportions; relatively greater waist/hip requirements; relatively greater chest/shoulder requirements; and relatively longer torso/limbs. These are numerical stress fixtures, not claims about real body-type distributions. Additional opposing/combined proportions belong in generated boundary cases.
- Preferences: closer, regular, and roomier fit. Their dimensional allowances must be category/material-specific simulation assumptions; one universal allowance would be inappropriate.

Each factor exercises a different path: catalog schemas, size-range position, dimensional conflicts, and preference trade-offs. This is a practical starting regression grid. It is **not a uniquely correct sample size, a power calculation, or evidence of representative shoppers**. More identities alone do not improve coverage; add cases when the risk matrix reveals gaps.

Current source `src/lib/product-photos.json` contains 11 unique category names but **17 applicable department/category pairs**: men 8 (Denim, Knitwear, Outerwear, Shirts & Tees, Shorts, Sweatshirts, Tailoring, Trousers); women 9 (Denim, Dresses, Knitwear, Outerwear, Shorts, Skirts, Tailoring, Tops, Trousers). Twelve base profiles per department, evaluated across three preference modes and all applicable categories, produce **12 × 3 × (8 + 9) = 612 profile/preference/category cases**, before brand, product, entry-path, and unit variations. This does not fabricate 22 combinations or add unrequested categories. Cases should also exercise cross-department browsing without identity-based exclusion.

Accounts, profiles, test cases, and load requests are different quantities. A single account can exercise numerous independent scenarios, with state reset between tests. Unit variants need not create duplicate authentication identities. Automated profile cases can run without browser login for every record; targeted browser journeys verify all states and account isolation. Load testing concurrency is determined separately from an agreed operating target.

## Measurement contract to approve before coding

- Accept cm and inches with an explicit unit for every stored measurement; allow mixed units across fields. A bulk display toggle must not reinterpret an existing value.
- Preserve original decimal input, original unit, measurement kind, and source. Compute using one canonical unit without repeatedly converting rounded display values. Decimal/fixed-point arithmetic and declared precision prevent conversion drift.
- NIST defines one inch as exactly 25.4 mm, hence exactly 2.54 cm. Example equivalence: 32 in = 81.28 cm. [NIST SI units: length](https://www.nist.gov/pml/owm/si-units-length)
- Keep body circumference, garment circumference, and laid-flat garment width distinct. Doubling width is permitted only where the measurement definition explicitly supports it. A labelled waist size such as W32 is not automatically an actual 32-inch garment measurement.
- Both intake paths are included: relevant body measurements and a known garment. A reference needs an exact style/size with known measurements or supplied measured dimensions; brand plus size alone does not determine garment geometry. When both paths disagree, explain the conflict and ask for correction rather than silently overwriting.
- Test decimal and fractional inch entry, whitespace/pasted unit suffixes, decimal-comma ambiguity, missing units, zero/negative/non-numeric values, plausible-but-unusual values, inconsistent duplicates, and out-of-fixture-range records. Distinguish a technical parsing error from a valid measurement outside supported evidence.
- Test equivalent physical measurements entered all-cm, all-inch, and mixed-unit; repeated display toggles; edits after toggles; and values exactly at and just above/below every declared size boundary. Equivalent unrounded values should yield the same decision; do not require identical decisions for independently rounded inputs that represent different measurements.
- Test unknown preference, missing reference garment, no suitable available size, stretch changes, regional conflicts, stale records, and invalid catalog sizes. Failure states are expected outputs, not accounts to delete from evaluation.

## Evaluation safeguards

Use three layers: deterministic unit/property tests; category/brand/profile scenarios; browser/API identity and lifecycle journeys. Supplement the fixture grid with pairwise interactions and targeted higher-order/ordered sequences for risky flows. NIST describes combinatorial testing as a systematic way to cover parameter interactions; it does not prescribe an account count or guarantee exhaustive correctness. [NIST SP 800-142](https://csrc.nist.gov/pubs/sp/800/142/final), [NIST ordered state-based combinations](https://csrc.nist.gov/pubs/cswp/26/ordered-t-way-combinations-for-testing-state-based/final)

Independently review expected outputs, including acceptable sets of sizes and no-recommendation cases. The same scoring function must not generate its own truth labels. Version the synthetic assumptions, profiles, garments, expected decisions, and result reports. If training a model, keep related shopper/product variants together when splitting data and reserve independently reviewed held-out cases. Report synthetic agreement, coverage, constraint violations, and software reliability separately from real-world fit accuracy, which remains unmeasured.

Success for the first approved implementation milestone: a reproducible fixture manifest, per-size garment schema, unit contract, and independently checked representative expected outcomes across all 17 pairs. This precedes account seeding and visual redesign because those surfaces need a trustworthy data and decision foundation.
