# M1 Decision Brief: Measurement Foundation and Baseline Fit Engine

Status: approved and implemented as the M1 internal fit-engine foundation. Independent contract-case sign-off remains open; the shopper UI remains disconnected until its later milestone is reviewed.

## Outcome

M1 will create the trustworthy data and decision layer beneath MeasureOnce. Given a selected fit profile, a specific garment style and its available sizes, it will return one of three useful outcomes: a recommended size, a clearly explained trade-off, or a safe state explaining why a size cannot be recommended.

M1 does not add authentication, persistent accounts, the final Fit Passport questionnaire, landing-page visuals, the retailer widget, a learned model or production deployment. Those remain later milestones with their own review gates.

## Why M1 must precede the interface work

The current prototype has 200 products and six size labels per product, but every product belongs to one fictional brand, product measurements are generated from the catalog index rather than a size variant, and the displayed recommendation is selected from a product seed rather than shopper evidence. The current catalog therefore represents 1,200 labelled size variants without 1,200 usable size-measurement records.

The catalog also mixes navigation category and garment construction. For example, `Denim` includes jeans and denim overshirts. An overshirt needs an upper-body measurement schema, while jeans need a bottoms schema. M1 must separate those concepts before generating any fit data.

## Proposed domain decisions

### 1. Keep these concepts separate

| Concept | Meaning in MeasureOnce |
| --- | --- |
| Merchandising category | The storefront navigation label, such as Denim or Tailoring. |
| Garment type | The physical construction, such as jeans, overshirt, blazer, waistcoat, dress or skirt. |
| Fit family | The measurement and comparison contract used by the engine. |
| Size system | The ordered labels used by one brand/market/department, such as XXS–XL, US 0–18 or W32 × L30. |
| Style | One designed garment whose silhouette and construction remain consistent across its sizes. |
| Garment variant | One style in one labelled size, with its own measurements and availability. |
| Fit profile | Evidence for one person: body measurements, exact garment references, regional observations and preferences. |
| Additional member profile | A fit profile selected when the account owner shops for another person; no relationship is required or inferred. |

The profile will not contain a mandatory gender or body-shape label. A shopper can use any product size system. Product department is catalog information, not an identity rule.

### 2. Accept two evidence paths

**Body-measurement path:** compare relevant body measurements with a garment variant's versioned compatible ranges and regional fit rules.

**Known-garment path:** compare the target garment with an exact reference style/size whose product measurements are known, then apply the shopper's independent regional observations. Brand plus a label such as `M` is insufficient if the exact garment cannot be identified and has no measurements.

When both paths exist, they reinforce or contradict one another. A material contradiction produces a correction request; the engine does not silently choose one source.

UNIQLO distinguishes body measurements from finished product measurements and warns that finished dimensions should not be compared directly with the body without an appropriate sizing interpretation. It also notes variation by design, fit and fabric. This supports storing measurement kind and method rather than treating every `waist` value as interchangeable. [UNIQLO body/product measurement guide](https://faq-ph.uniqlo.com/pkb_Home_UQ_PH?fs=RelatedArticle&id=kA0Ie000000TOzk&l=en_US)

### 3. Support both units without changing the physical value

Every submitted measurement retains its original value, unit, measurement kind, method and source. Computation uses an exact decimal conversion to a canonical centimetre value; display rounding is separate. One inch is exactly 2.54 centimetres. [NIST SI length guidance](https://www.nist.gov/pml/owm/si-units-length)

`32 in` and `81.28 cm` must produce the same normalized evidence. Switching display units converts the value; it never relabels `32` as `32 cm`. Body circumference, garment circumference and laid-flat width remain different measurement kinds. A `W32` size designation is not automatically a measured 32-inch waistband.

## Measurement coverage for the current 11 categories

The table identifies evidence the engine must be able to represent. M3 will later decide which questions are necessary in each shopper journey.

| Catalog category | Fit-family routing | Primary size-affecting regions | Conditional evidence |
| --- | --- | --- | --- |
| Dresses | Dress / one-piece | Chest or bust, waist, hip or seat, garment length | Shoulder, sleeve, upper arm, stretch; only when construction makes them relevant |
| Tops | Upper body | Chest or bust, shoulder or cross-back, body length | Sleeve, upper arm, waist, stretch |
| Shirts & Tees | Upper body | Chest, shoulder or cross-back, body length | Neck for collared styles; sleeve and upper arm |
| Knitwear | Upper body with knit behavior | Chest or bust, shoulder or cross-back, body length | Sleeve, upper arm, documented stretch/recovery |
| Sweatshirts | Upper body | Chest, shoulder or cross-back, body length | Sleeve, upper arm, intended oversized construction |
| Outerwear | Structured/layered upper body | Chest or bust, shoulder or cross-back, body length, sleeve | Waist, hip or seat, upper arm, intended layering |
| Tailoring | Garment-type specific | Blazer/jacket: chest or bust and shoulder; waistcoat: chest or bust and waist | Sleeve/body length for jackets; coordinated bottoms require a separate bottoms variant |
| Trousers | Bottoms | Waist at defined wear position, hip or seat, rise, inseam | Thigh, outseam, leg opening, stretch |
| Denim | Route by garment type | Jeans: bottoms regions; denim overshirt: upper-body regions | Construction-specific stretch, rise or sleeve evidence |
| Shorts | Bottoms | Waist at defined wear position, hip or seat, rise, inseam | Thigh, leg opening, stretch |
| Skirts | Skirt | Waist at defined wear position, hip where fitted, garment length | Sweep/hem, closure, stretch |

Definitions must include exactly where and how a value is measured. Levi's, for example, separately defines waist, seat, thigh and inseam for bottoms and publishes different body ranges for labelled sizes; its garment-measurement guidance also notes that waistband measurements depend on rise. These are examples of why measurement method and style construction matter, not templates to copy into fictional brands. [Levi's size guide](https://www.levi.com/US/en_US/info/sizeguide), [Levi's garment measurement guide](https://www.levi.com/GB/en_GB/blog/article/how-to-measure-jeans)

## Synthetic multi-brand catalog proposal

M1 will use **10 fictional brands**, as confirmed by the product owner. This gives the showcase a department-store level of brand variety while keeping every measurement and sizing rule explicitly synthetic. Brand names and visual identities will be confirmed with the M4 mockup; M1 uses stable internal identifiers so names can change safely.

All 200 visible products will be assigned across the 10 brands and classified by garment type. Distribution will be balanced where the available categories permit, without forcing an equal product count or relabelling unsuitable garments. Each product's six current labelled sizes receives a separate synthetic variant record, producing 1,200 size-measurement records before any approved numeric or composite-size expansion. The generated records are clearly marked synthetic and versioned.

Size systems support arbitrary retailer labels, multiple axes, modifiers and many-to-one display equivalence without collapsing sellable variants. Women's `0` and `2` mapping to `XS` is one example, not the whole women's model. The recommendation always returns the exact sellable label; broader or international equivalents are comparison aids. Every mapping is scoped to brand, market and category and is never treated as a universal conversion.

The M1 schema will support these women's configurations where a fictional brand uses them:

- alpha labels such as `XXS` through extended sizes;
- US even numeric labels such as `00`, `0`, `2`, `4` and upward;
- junior/odd numeric labels when explicitly declared by a brand;
- denim waist labels such as `24`, `25`, `26` and upward;
- two-axis waist/inseam labels such as `W28 × L30`;
- petite, regular and tall or short/regular/long variants such as `8P`, `8`, `8T`;
- plus-size labels such as `14W`, `16W` and alpha-plus labels when explicitly used;
- grouped or dual labels such as `0/2` or `XS/S`;
- market-facing equivalents such as US, UK and EU labels, without assuming the conversion is identical for every brand.

These formats are capabilities of the data model, not a requirement that every fictional brand sell every format. Each brand declares its own valid labels, order, axes, aliases and market equivalents. Sizes with similar display mappings remain separate garment variants with separate measurements. The same extensible structure also handles men's alpha, neck/sleeve, waist/inseam and jacket-length configurations without building a second engine.

Sizing will not be created by shifting every brand up or down by one label. For every brand, size system and garment type, the generator defines:

- a base measurement block;
- the region-specific increment between sizes;
- style-level silhouette adjustments;
- the intended fit and compatible body ranges;
- construction properties such as stretch, lining and layering;
- the measurement method, tolerance and generator version.

The final variant measurement is conceptually:

`brand/type base + size grade + style adjustment + construction rule`

Each region varies independently. A brand can have a longer body but a regular chest in one shirt, and a shorter rise but a roomier hip in one trouser. Brand behavior is category-specific and style-specific; MeasureOnce will not label an entire brand as universally “runs small” or “runs large.”

Validation rules reject or quarantine duplicate identifiers, unknown units, missing critical measurements, unsupported measurement methods, flat-width/circumference confusion, impossible size order and unexplained non-monotonic grading. Length is allowed to remain constant or grade differently where the style contract says so.

The visible catalog has only one men's Shorts product and one men's Tailoring product. Those pairs cannot visibly demonstrate three brands without adding distinct products and imagery. M1 will add measurement-only fixtures for cross-brand engine coverage and report the visual gap. The M4 catalog/mockup review will decide whether additional visible garments are needed; M1 will not duplicate images and call them different products.

## Baseline recommendation logic

M1 uses a transparent deterministic baseline. A learned model is considered only in M6 if a valid learning target and non-circular labels exist.

For each candidate size:

1. Select the fit-family schema from garment type, not the navigation category.
2. Load the candidate's versioned garment measurements and style-specific compatibility rules.
3. Resolve the selected profile and current category preference.
4. Build regional evidence from body measurements, a known garment, or both.
5. Evaluate each relevant region independently. Missing evidence remains missing; it is never filled from a body-shape label.
6. Reject a candidate that violates a critical regional constraint beyond the style's declared allowance.
7. Rank remaining candidates by weighted distance from the preferred regional ranges.
8. Return one recommendation only when it meaningfully leads. Otherwise return the relevant trade-off or safe state.

Style rules carry the compatibility bands. There is no universal ease allowance for all shirts, trousers or bodies. Stretch may alter a declared compatibility range, but it never licenses an undocumented guess.

### Proposed result states

| State | Meaning |
| --- | --- |
| `RECOMMENDED` | One available size satisfies critical regions and leads the alternatives. |
| `TRADEOFF` | Two equally ranked adjacent candidates satisfy different regions, such as better waist versus better length; show both differences and do not label either option as primary. |
| `INSUFFICIENT_PROFILE_EVIDENCE` | Required shopper or reference information is missing. |
| `INSUFFICIENT_GARMENT_EVIDENCE` | The target or anchor lacks usable measurements. |
| `CONFLICTING_EVIDENCE` | Body and reference evidence disagree materially and need correction. |
| `NO_SUITABLE_SIZE` | Evidence is complete but no available size satisfies critical constraints. |
| `UNSUPPORTED` | The garment type or measurement method is outside the current contract. |

M1 will not return a percentage confidence. It may report evidence completeness and the actual supported/unsupported regions, because those are inspectable facts.

### Illustrative cross-brand example

The following values are deliberately synthetic and only demonstrate the planned mechanics. Assume one trouser profile has waist `81.3 cm`, hip `99.1 cm`, and a regular preference.

| Fictional brand/size | Finished garment waist | Finished garment hip | Synthetic compatible body interval | Result |
| --- | ---: | ---: | --- | --- |
| Brand A, M | 84.0 cm | 104.0 cm | Waist 80–83; hip 97–101 | Candidate passes |
| Brand B, M | 82.0 cm | 101.0 cm | Waist 78–80.5; hip 95–98 | Hip/waist outside the declared band |
| Brand B, L | 86.0 cm | 105.0 cm | Waist 80.5–84; hip 98–102 | Candidate passes |
| Brand C, 32 | 83.5 cm | 103.0 cm | Waist 80–82; hip 98–100.5 | Candidate passes |

The same profile can therefore receive `M`, `L` and `32`. The compatible intervals come from each synthetic style's versioned rules; they are not external apparel standards. Regional details decide whether Brand A M or Brand C 32 is the closer match.

## M1 evaluation plan

M1 evaluates controlled behavior, not real-world physical accuracy.

### Dataset checks

- All 200 products have a brand, garment type, fit family, size system and synthetic-data provenance.
- All 1,200 base size positions are represented. Independent composite axes expand them to 2,028 exact sellable variants with versioned measurements.
- Every one of the 11 navigation categories and all 17 current department/category pairs appear in the coverage report.
- Every fit family has at least three fictional brands in the engine fixture dataset, even when the visible image catalog is sparse.

### Behavior checks

- 24 base measurement profiles: 2 catalog departments × 3 measurement bands × 4 numerical proportion patterns.
- Three preference modes applied to those profiles produce 72 profile/preference combinations.
- Applying the 12 relevant profiles per department and three preferences across the current 8 men's and 9 women's category pairs produces 612 baseline profile/preference/category executions before brand and unit permutations.
- 34 manually reviewed core cases: 17 department/category pairs × 2 evidence paths.
- 10 cross-cutting reviewed cases for unit equivalence, between-size trade-off, independent waist/length feedback, missing profile evidence, missing garment evidence, conflicting evidence, no suitable size, unsupported subtype, stretch-boundary behavior and unavailable size handling.
- This produces 44 reviewed “golden” cases. One collaborator specifies expected outcomes from the approved contract; the other implements or independently reviews them. Generated coverage cases are not presented as independent truth.

Each applicable physical input is repeated in centimetres and inches. Property tests cover repeated unit switching, decimals/fractions, boundary rounding, missing units, negative/non-numeric values and mixed-unit inputs. The evaluator reports result state, recommended label when applicable, per-region findings, evidence used, rule/data versions and failures.

Passing all contract tests demonstrates that the software follows the approved synthetic rules. It does not establish that garments fit real people or that MeasureOnce reduces returns.

## Proposed implementation packages after approval

1. **Taxonomy and measurement registry:** classify all products and define versioned measurement methods.
2. **Synthetic catalog generator:** create the 10 brands, size systems, size-equivalence mappings, style rules and at least 1,200 variant records.
3. **Profile fixtures:** create 24 reusable measurement profiles and additional boundary mutations without creating more login accounts.
4. **Baseline engine:** implement body, known-garment and combined-evidence evaluation with the seven result states.
5. **Validation and evaluation runner:** run catalog validation, unit/property tests, generated coverage and 44 reviewed cases; produce machine-readable and human-readable reports.
6. **Handoff contract:** expose one internal recommendation interface for M3 to use. M1 does not yet redesign or connect the shopper flow.

## Completion criteria

M1 is complete only when:

- the taxonomy audit covers all 200 current products;
- all accepted variant records pass schema and measurement-method validation;
- every configured size system preserves exact sellable labels, axes, modifiers and brand/market-scoped equivalents;
- cm/in equivalents produce the same physical comparison;
- the body and exact-garment paths both return reproducible evidence;
- distinct numeric sizes can share an alpha equivalence group without merging their measurements or recommendations;
- regional observations remain independent;
- every safe state has a passing reviewed example;
- the generated coverage and 44 reviewed cases run from one documented command;
- the report identifies failures and unsupported coverage rather than hiding them;
- no M1 result relies on product seed, hardcoded confidence percentages or real-customer claims.

## Approved decisions

1. **Confirmed:** use 10 fictional brands, with final names and visual identities confirmed during M4.
2. **Confirmed:** support brand-specific size systems rather than one women's chart. This includes alpha, even and declared odd numeric, denim-waist, waist/inseam, petite/regular/tall, plus, grouped/dual and market-equivalent labels. Women's `0` and `2` grouped under `XS` is one tested example; both remain distinct variants.
3. **Confirmed:** use the seven result states above and omit numerical confidence.
4. **Confirmed:** assign the existing 200 products across the fictional brands while preserving their original imagery and names unless a later catalog review changes them.
5. **Confirmed:** use 24 reusable base measurement profiles, 72 preference combinations and 44 contract cases; none of these create additional login accounts.

## Implementation evidence

- `npm run test:fit` exercises the public catalog and recommendation boundaries.
- `npm run eval:fit` validates all 200 styles, 2,028 exact size variants, all 1,200 source-label positions and six executable sparse-category comparison fixtures; it runs 612 generated profile/preference/category scenarios plus six fixture recommendations.
- The 44 contract cases pass mechanically, including exact composite-axis evidence, both options in a trade-off, body/reference conflict handling and flat-width normalization. Generated results and durable collaborator signoff are stored separately. Each approval is bound to a fingerprint of the case input, expected contract, target/anchor data and engine versions, so changed content cannot retain stale approval.
- The signoff CSV remains awaiting a second collaborator. M1 therefore proves deterministic software behavior over synthetic contracts; it does not claim independent physical-fit accuracy.
