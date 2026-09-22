# M3 Fit Passport questionnaire research

**Research date:** 18 September 2026  
**Scope:** adult apparel in MeasureOnce's 11 current categories  
**Evidence rule:** first-party competitor material, retailer/brand guidance, and official accessibility/privacy guidance only

## Decision summary

Use a contextual, optional flow launched from an eligible product page. Let the shopper choose either **a known garment that fits** or **body measurements**; recommend the known-garment path because it avoids self-measurement and matches MeasureOnce's inspectable comparison model. Ask only for evidence relevant to the target garment. Save only after an explicit action, and keep manual size selection available throughout.

This is a MeasureOnce proposal, not a copied competitor flow. The reviewed competitors publish the kinds of inputs they use, but none publishes a universal question count and order suitable for all apparel categories. M3 must validate the proposed burden with shoppers rather than presenting it as an industry benchmark.

## Verified facts

### Competitor patterns

- True Fit says shoppers can receive basic, aggregate guidance without creating a profile. Its personalized service uses profile data, prior purchases and size history across brands; the PDP is a documented delivery point. Its shopper material also describes best-fitting brands/styles and fit preferences as signals. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec), [True Fit product overview](https://www.truefit.com/resources/fashion-magic))
- Fit Analytics describes a short series of questions that can include height, weight, age, body shape and fit preferences. Its shopper guide says the tool is opened from a retailer experience, requires no Fit Analytics account, saves anonymous answers in a browser cookie, permits later editing under `My Info`, and supports tops, bottoms, dresses, outerwear and shoes. ([Fit Analytics shopper guide](https://fitanalytics.com/resources/how-to-use-fit-finder), [Fit Analytics product explanation](https://fitanalytics.com/resources/increase-conversion-rate-ecommerce-retail))
- Fit Analytics' privacy notice lists gender, height, weight, age, bra size, body shape, fit preference, and reference brands or items among possible user inputs. This establishes available fields, not that every field appears for every shopper or in a fixed order. ([Fit Finder privacy policy](https://media.fitanalytics.com/widget/documents/privacy_en.pdf))
- Bold Metrics says its shopper flow asks four to six details drawn from age, height, weight, pant waist, or bra band/cup, uses no photo or measuring tape, and combines those inputs with garment data. Its public material does not document a known-garment-first path. ([Bold Metrics for shoppers](https://boldmetrics.com/for-shoppers))
- True Fit says survey-only systems generally use height, weight, age, body type and preferences, while outcome-based systems also learn from purchases and returns. This is True Fit's description of the market, not independent comparative proof. ([True Fit fit-finder explanation](https://www.truefit.com/post/how-fit-finder-tools-work))
- Snap's Shopping Suite notice described Fit Finder as optional assistance embedded in partner shops and documented the use of shopper-supplied fit/size information, purchase/return data, event data and a shop user ID where available. This supports a retailer-context integration and optional use; it does not prescribe MeasureOnce's questionnaire. ([Snap Shopping Suite privacy notice](https://www.snap.com/en-GB/privacy/shopping-suite-privacy-notice))

### Garment and measurement evidence

- Levi's publishes separate waist, seat/hip, thigh and inseam definitions for bottoms, and neck, chest, waist and seat for men's tops. Its size tables also demonstrate that a labeled waist size maps to brand-specific body ranges. ([Levi's size guide](https://www.levi.com/US/en_US/info/sizeguide))
- Levi's known-jeans guide explicitly says a well-fitting pair can be measured as a guide. It instructs shoppers to measure a flat waistband and double it, measure inseam from crotch seam to hem, and record rise separately. This supports a known-garment measurement path for jeans, while also showing that method metadata matters. ([Levi's jeans measurement guide](https://www.levi.com/GB/en_GB/blog/article/how-to-measure-jeans))
- Nordstrom's fit guidance distinguishes body measurements from garment measurements and defines bust, natural waist, hip, trouser inseam, skirt length, and top/coat/dress length. ([Nordstrom measurement guide](https://www.nordstrom.com/sizeguides/248_sizeguide.pdf))
- Ralph Lauren publishes distinct fields for shirts and tailoring, including chest, neck, sleeve, waist, shoulder and body length, and separate waist/inseam systems for bottoms. ([Ralph Lauren size guide](https://www.ralphlauren.com/size-guide/size-guide.html))

### Accessibility and privacy

- W3C says forms should ask only what is required, divide longer forms into logical stages, inform users of progress, visibly label controls and required formats, and identify errors in text. WCAG 2.2 also requires previously entered information in the same process to be auto-populated or selectable unless re-entry is essential. ([W3C forms tutorial](https://www.w3.org/WAI/tutorials/forms/), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [W3C labels and instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html))
- FTC business guidance says not to collect sensitive personal information without a legitimate business need and to retain it only as long as necessary. ([FTC business data-security guidance](https://www.ftc.gov/business-guidance/resources/protecting-personal-information-guide-business))
- COPPA does not generally apply to information about a child supplied online by a parent or another adult, but it does apply when a covered operator collects personal information online from a child under 13. That legal distinction does not resolve the broader consent, accuracy or control questions for an additional-member profile. ([FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions))

## What the evidence does not establish

- No reviewed first-party source publishes a single, current competitor question order for every category.
- No reviewed source proves that two screens, 45 seconds, or any particular completion rate is an industry standard.
- No reviewed source proves that height and weight alone can support MeasureOnce's required regional explanations.
- No reviewed source establishes that a retailer-account owner has permission to store another adult's measurements merely because they share a household.
- Public competitor claims do not validate recommendation accuracy for MeasureOnce's synthetic catalog.

## Proposed M3 interaction

### Entry and progress

1. Show `Find my size` on eligible product pages. Do not interrupt sign-in, browsing, manual size selection, bag, or checkout.
2. Open with `Who is this for?` only when the account has more than one profile. Reuse the currently selected profile instead of asking again.
3. Ask `How would you like to find the size?` with:
   - `Use clothing that fits` — recommended;
   - `Enter body measurements`;
   - `Use the size chart instead` — exits personalization without penalty.
4. Show progress as named stages, allow Back, `Save and finish later` for signed-in shoppers, and `Skip for now` at every stage before the result.

### Path A — known garment

**Stage 1: Choose the garment**

1. `Which item already fits this person well?` — offer compatible retained purchases first, then searchable brand/item records.
2. `What size is on its label?` — show only exact sizes valid for that brand, market and item.
3. If an exact catalog variant cannot be identified, explain that a label alone is weak evidence and offer `Enter its measurements`, `Use body measurements`, or the size chart. Do not silently treat free-text `M` as comparable across brands.

**Stage 2: Describe its fit**

1. `How does it fit?` — `Fits well in all the areas shown` or `Adjust individual areas`.
2. When adjusted, show only target-relevant regions. Circumference controls use `Too tight / Just right / Too loose`; length controls use `Too short / Just right / Too long`. Nothing is preselected.
3. `How do you want this type of clothing to feel?` — `As designed / Closer / More relaxed`; store this by category or fit family, not as a universal preference.

If the exact known variant has usable garment geometry, the shopper should not have to type its dimensions. An optional advanced control may accept measurements from a non-catalog garment, but must explain flat width versus circumference and measurement points.

### Path B — body measurements

Start with `Inches / Centimetres`, remember the choice, and show a short illustrated definition beside every measurement. Store one normalized value plus the original value/unit; never make shoppers convert values themselves.

The table below is the proposed minimum evidence policy for M3. It is derived from the project's M1 fit-family contract and the official measurement guides above; it is not a competitor standard.

| Current category | Ask first | Ask only when construction or size axis requires it |
| --- | --- | --- |
| Dresses | Bust/chest, waist, hip/seat, preferred garment length | Shoulder/cross-back, sleeve, upper arm |
| Tops | Bust/chest, shoulder/cross-back, preferred body length | Waist, sleeve, upper arm |
| Shirts & Tees | Chest/bust, shoulder/cross-back, preferred body length | Neck for collared sizing; sleeve/upper arm |
| Knitwear | Chest/bust, shoulder/cross-back, preferred body length | Sleeve/upper arm; never ask the shopper to estimate fabric stretch |
| Sweatshirts | Chest/bust, shoulder/cross-back, preferred body length | Sleeve/upper arm; oversized intent comes from product data plus preference |
| Outerwear | Chest/bust, shoulder/cross-back, sleeve, preferred body length | Waist, hip/seat, upper arm; `Light layers / Heavy layers` when relevant |
| Tailoring | Jacket: chest/bust and shoulder/cross-back. Waistcoat: chest/bust and waist | Jacket sleeve/body length. A coordinated trouser uses the Trousers path separately |
| Trousers | Waist at stated wear position, hip/seat, rise, inseam | Thigh, outseam, leg opening |
| Denim | Route by garment type: jeans use Trousers; denim tops use Shirts & Tees | Same conditional fields as the routed garment type |
| Shorts | Waist at stated wear position, hip/seat, rise, inseam | Thigh, leg opening |
| Skirts | Waist at stated wear position, hip/seat when fitted, preferred garment length | Sweep/hem for close silhouettes |

`Ask first` means required only when the engine cannot safely derive equivalent evidence from another approved source. If the set is long, split it into logical groups; do not hide the actual burden behind a false “two-question” label.

### Result and progressive disclosure

- Return a recommendation only when the category's minimum evidence and garment data are present. Otherwise ask one targeted missing question, return an honest trade-off, abstain, or show `Personalized fit unavailable` with the retailer's size chart.
- Explain the size in the same regions the shopper supplied, such as `Waist aligns; length may run long`.
- On a later category, reuse compatible evidence and ask only for missing category-specific fields. Do not restart the full flow or reuse an incompatible anchor.
- The recommendation is optional guidance. A shopper can inspect or select every sellable size regardless of the outcome.

## Additional-member privacy proposal

For M3, allow **adult additional-member profiles** only:

- collect a nickname and the minimum fit evidence; do not collect relationship, email, phone, birth date, gender identity, photo, or address;
- require the account owner to confirm: `I have this person's permission to save their fit information`;
- offer a session-only path when permission is absent or saving is unnecessary;
- keep the profile, anchors, preferences, export and deletion separate from the account owner's self profile;
- never copy outcomes between people or silently merge profiles;
- show who is active beside every questionnaire and result;
- exclude child profiles until a separate legal/privacy design and age policy are approved.

The owner-confirmation model is a product-risk control, not proof of valid consent in every jurisdiction. A retailer pilot still requires counsel to define controller/processor roles, notices, retention, access, correction, deletion and dispute handling.

## Questions not to ask by default

- exact age or date of birth;
- weight;
- body-shape labels;
- sex or gender identity;
- bra size unless an explicitly supported garment requires it and the model has evidence for using it;
- photos, scans or inferred body geometry;
- relationship to an additional member;
- contact details for the additional member;
- target product/category/available sizes already known from the product page;
- product stretch, cut or intended silhouette that belongs in retailer garment data;
- the same value twice in one flow.

These exclusions are MeasureOnce's data-minimization choice. Competitors may collect some of these fields, but competitor collection does not establish necessity for this product's inspectable dimensional model.

## Proposed usability gates before implementation sign-off

These are test targets, not researched benchmarks:

- At least 8 of 10 representative adults complete each path without moderator help.
- Every participant can find Skip, switch inches/centimetres, identify the active person, correct one answer, and explain what will be saved.
- Record median time and drop-off separately for known-garment and body-measurement paths; do not impose a pass threshold until a first formative round provides a baseline.
- Test all 11 categories, mobile and desktop, keyboard-only use, screen-reader labels, invalid values, interruption/resume, no exact anchor match, contradictory region answers, and insufficient evidence.
- Verify that changing a relevant answer can change the engine result and that irrelevant category fields are never requested.

## M3 decisions still requiring product-owner approval

1. Whether additional-member profiles remain adult-only for the first release.
2. Whether non-catalog known garments may be entered with measurements or are session-only evidence.
3. Whether `Save and finish later` stores incomplete measurement values, and for how long.
4. The exact copy and illustrations for every measurement point after formative comprehension testing.
5. The evidence threshold for each category's recommend, trade-off and abstain states; this must come from evaluation, not questionnaire design alone.

