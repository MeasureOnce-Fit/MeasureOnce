# MeasureOnce Fit Passport onboarding plan

**Research date:** 17 September 2026  
**Audience:** U.S. multi-brand department-store retailer, using Macy's or Nordstrom as the customer archetype  
**Product scope:** Adult men's and women's apparel across every category in the current 200-product mock  
**Research question:** How should MeasureOnce collect enough shopper information for credible fit guidance without turning account creation or shopping into a long questionnaire?

## Executive decision

The Fit Passport should be **optional and skippable**. It should never block account creation, browsing, size selection, adding to bag, or checkout. After a shopper's first successful sign-in, show one dismissible account card—not a full-screen modal—with the benefit, estimated effort, `Set up my fit`, `Not now`, and `Don't ask again`. The primary completion point should be the first time the shopper selects **Find my size** on a product detail page, because the product supplies the category context and the shopper has expressed fit intent.

The questionnaire should use **one short core setup plus progressive category anchors**. A single trouser cannot provide defensible high-confidence sizing for a blazer, knit, skirt, or dress. The account owns one Fit Passport, but that passport can contain several garment anchors organized into compatible category families. After the first anchor, the system should ask at most one targeted follow-up when the shopper enters a family that the passport does not yet cover. It should never repeat the whole flow.

The minimum core input is a garment the shopper already understands: brand, garment type, labeled size, and how it fits in the relevant body regions. The target product, department, category, and available sizes already come from page context and must not be asked again. Age, weight, body shape, sex/gender, bra size, photos, scans, and tape measurements should not be part of the default flow for the categories in this mock. Height or a garment measurement may be requested later only when it is the single missing signal that can materially change a recommendation.

This recommendation is a product decision based on the evidence below. It must still be evaluated with usability testing and a controlled retailer pilot; no public source establishes a universal completion or conversion benchmark for this exact flow.

## What the evidence establishes

1. **A forced profile is not required to provide some useful guidance.** True Fit documents a zero-profile fallback using aggregate signals and says no profile creation is required for basic guidance. Its personalized output then adds a product-specific size, confidence, and a profile that improves over time. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec))
2. **Persistent fit state and cross-brand history are normal market expectations.** True Fit describes profile and size history across brands; Zalando's Size Profile accepts brands and products that fit well, including products purchased outside Zalando, and adds feedback on previous orders. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec), [Zalando size-and-fit overview](https://corporate.zalando.com/en/technology/how-zalando-uses-technology-help-customers-find-right-size))
3. **Competitor questionnaires can be materially longer than MeasureOnce needs.** True Fit's policy lists age, gender, size, brand preferences, body shape, and fit preferences. Fit Analytics describes inputs including height, weight, and age. Bold Metrics documents a minimum viable API call using height, weight, age, and either waist or bra size, with more measurements requested when confidence is low. ([True Fit privacy policy](https://www.truefit.com/privacy-policy-and-choices), [Fit Analytics shopper guide](https://fitanalytics.com/resources/how-to-use-fit-finder), [Bold Metrics Virtual Sizer API](https://docs.boldmetrics.io/virtual-sizer))
4. **A lighter, editable experience is viable.** Fit Analytics says it does not require an account, stores answers in a browser cookie, supports tops, bottoms, dresses, outerwear, and footwear, and lets shoppers edit inputs through `My Info`. This supports the principle that authentication and fit help need not be one forced step. ([Fit Analytics shopper guide](https://fitanalytics.com/resources/how-to-use-fit-finder))
5. **Reference items are useful but not unique.** Zalando explicitly supports products bought outside Zalando as Size Profile evidence. MeasureOnce's differentiation must be the independent region-level feedback, visible decision trace, and willingness to decline an unsupported answer—not merely the fact that it uses a known garment. ([Zalando size-and-fit overview](https://corporate.zalando.com/en/technology/how-zalando-uses-technology-help-customers-find-right-size))
6. **Abstention has a commercial precedent.** Bold Metrics' API can return no good match, an outlier warning, or a message that the available inputs are too weak. True Fit exposes confidence tied to shopper-product data density. MeasureOnce should treat `ABSTAIN` as a normal, tested state. ([Bold Metrics Virtual Sizer API](https://docs.boldmetrics.io/virtual-sizer), [True Fit technical specification](https://www.truefit.com/fit-intelligence-spec))
7. **Data minimization and account controls are product requirements.** The California Privacy Protection Agency describes rights to know, correct, delete, limit, and opt out, and says covered businesses must keep collection, use, and retention reasonably necessary and proportionate. The FTC similarly recommends limiting personal-data collection and retention. These sources do not determine MeasureOnce's exact legal obligations; counsel would still need to review a real launch. ([CPPA CCPA FAQ](https://cppa.ca.gov/faq), [FTC data-minimization guidance](https://www.ftc.gov/business-guidance/resources/careful-connections-keeping-internet-things-secure))
8. **Interrupting a shopper's primary commerce task creates avoidable friction.** Baymard's ecommerce testing found that introducing account decisions before or during checkout distracts users and that optional fields can attract attention even when unnecessary. This research is about account and checkout forms rather than fit questionnaires, so the MeasureOnce inference is limited: keep Fit Passport enrollment out of checkout and make optionality unmistakable. ([Baymard delayed account creation research](https://baymard.com/research-articles/delayed-account-creation), [Baymard required/optional field research](https://baymard.com/research-articles/required-optional-form-fields))

## Current prototype assessment

The mock currently uses a five-stage flow—Entry, Basics, Fit anchor, Preferences, Match—and asks every shopper about waist, hip/seat, chest/bust, shoulders, body length, and sleeve length. It also asks who the shopper is buying for, collection, optional height range, anchor brand, garment type, size, global fit preference, an avoidance preference, and save consent. The implementation preselects every fit area as `Just right`/`Perfect`. ([current flow](../../src/app/page.tsx))

That flow communicates the idea well, but it is too long and too generic for a market pilot:

- Showing every body region makes a skirt shopper handle sleeve and shoulder questions and makes a shirt shopper handle hip questions.
- Preselecting `Just right` can silently create false evidence if the shopper continues without reviewing each row.
- `Who are we fitting?`, collection, and target garment type can usually be derived from account/session/PDP context or handled as a compact `Shopping for: Me` control.
- Asking preference and avoidance as separate stages duplicates information that region-level fit feedback can already express.
- A profile saved only in local storage cannot support the promised retailer-account reuse, correction, deletion, or multi-device continuity.
- The result displays a numerical confidence percentage even though the current recommendation and confidence are not calibrated model outputs.

The current catalog contains Denim, Dresses, Knitwear, Outerwear, Shirts & Tees, Shorts, Skirts, Sweatshirts, Tailoring, Tops, and Trousers. The present mock generates the same demo chest, waist, hip, and length fields for every item, regardless of category. ([catalog dataset](../../src/lib/product-photos.json), [catalog adapter](../../src/lib/catalog.ts)) A real all-category release therefore requires category-specific garment schemas in addition to a shorter questionnaire.

## Recommended journey

### 1. Authentication stays separate

Account creation asks only for the retailer's normal account fields. Completing sign-in never launches a blocking Fit Passport modal.

After the first successful sign-in, show a small dismissible account card:

> **Find your size across brands**  
> Start with one item you already own. About 45 seconds. No photo or tape measure.  
> `Set up my fit` &nbsp; `Not now` &nbsp; `Don't ask again`

`About 45 seconds` is a proposed design target to validate, not a researched market benchmark. `Not now` suppresses further automatic prompts for 30 days; the shopper can still open Fit Passport or choose `Find my size`. `Don't ask again` suppresses all automatic invitations until the shopper changes that preference in account settings.

### 2. The high-intent PDP is the main entry point

Every eligible product page shows:

> **Find my size**  
> Use a garment you already own · about 45 seconds

If the shopper is not signed in, offer both `Continue for this visit` and `Sign in to save`. A session-only shopper receives the same recommendation but no cross-device persistence. At the end, invite the shopper to save the completed inputs to an account rather than making account creation a prerequisite.

If the shopper is signed in with no useful anchor for the current category family, open the two-screen core flow below. If a relevant anchor exists, go directly to the recommendation. If the anchor is only partly transferable, ask one targeted refinement inline.

### 3. One account, several compatible anchors

The UI calls the feature one Fit Passport. Internally, the passport stores a list of evidence records, each scoped to a category family, product/brand, size system, fit regions, timestamp, and shopper. Shared signals can transfer between families only with an explicit, evaluated rule and lower confidence.

Recommended family model for the current mock:

| Fit family | Current catalog categories | Core fit regions | Conditional regions |
|---|---|---|---|
| Bottoms | Denim, Trousers, Shorts | Waist, hip/seat, rise, thigh | Inseam or overall length; leg opening for highly shaped styles |
| Skirts | Skirts | Waist, hip/seat, overall length | Hem ease for close silhouettes |
| Upper body | Tops, Shirts & Tees, Knitwear, Sweatshirts | Chest/bust, shoulders, body length | Sleeve length; upper arm for fitted or non-stretch styles |
| Dresses / one-piece | Dresses | Chest/bust, waist, hip/seat, overall length | Shoulders and sleeve length when present |
| Outerwear / tailoring | Outerwear, Tailoring | Shoulders, chest/bust, sleeve length, body length | Waist, hip/seat, and intended layering amount |

This family structure supports every clothing category in the mock while avoiding an unsupported claim that one anchor can size all categories equally well.

## Exact minimum questionnaire

### Persistent context control, not a questionnaire step

At the top of the flow show `Shopping for: Me ▾`. `Me` is the default only when the signed-in user has selected it previously. Choosing `Someone else` creates a session-only recommendation or a separately named household profile. Gift purchases and another person's feedback must never update the primary shopper's passport.

### Screen 1 — “Choose something that already fits”

Prefer one-tap choices from eligible kept purchases when the retailer has consent and order history. Otherwise show:

1. **Brand** — searchable retailer brand list plus `Another brand`.
2. **Item type** — prefilled from the target's fit family; editable only within compatible types.
3. **Size on the label** — choices normalized to the selected brand/item when available; free text only as a fallback.

The target product, target category, department, available sizes, and locale come from the PDP/session and are never re-asked. Style/model name is optional and appears only when it can be matched to a known catalog record.

### Screen 2 — “How does that item fit?”

Start with two choices:

- `Fits well overall`
- `I want to adjust some areas`

If `Fits well overall` is selected, record an explicit confirmation for the relevant regions. Do not create fit evidence from untouched default selections.

If the shopper chooses adjustments, show only the fit regions for that family. Circumference regions use `Too tight`, `Just right`, and `Too loose`. Length regions use `Too short`, `Just right`, and `Too long`. The shopper can set several independent answers—for example, `Waist: too loose` and `Length: just right`—which directly addresses the user's requested behavior.

End with one preference line:

> **For this item, keep the intended fit?**  
> `As designed` · `Closer` · `More relaxed`

`As designed` is the default and requires no extra step. A category-specific value such as outerwear layering appears only when it can affect the decision.

### Save action

For a signed-in shopper, the primary button is:

> `Save to my Fit Passport and show my size`

The adjacent plain-language notice names the retailer as controller, MeasureOnce's role, the fit data saved, its purpose, and a link to controls. This explicit action covers persistence for the requested fit service. Secondary uses are separate and off by default:

- `Allow de-identified fit outcomes to improve recommendations` — optional.
- Marketing or audience activation — a separate retailer-controlled permission, never part of Fit Passport setup.

For a session-only shopper, use `Show my size for this visit`; do not persist the garment anchor beyond the disclosed session period.

## Progressive questions after setup

The system may ask **one** micro-question only when the expected answer could materially change the recommendation. It should show why the question is needed and always offer `Use current guidance` or `View size chart`.

| Situation | One allowed prompt | Result if skipped |
|---|---|---|
| First product in a new fit family | “Do you own a [shirt/skirt/dress/coat] that fits well?” with recent purchases and `Add another item` | Give lower-confidence item guidance or abstain; never pretend the existing anchor is equivalent |
| Length-sensitive target and no length signal | “How is the length of your reference item?” | Use a wider uncertainty band or avoid a length claim |
| Fitted outerwear/tailoring | “Will you wear this over light layers or heavier layers?” | Default to the product's intended layering and disclose it |
| Conflicting anchors | “Which of these feels closer to your preferred fit?” | Abstain or surface both plausible sizes with trade-offs |
| Stale profile or body/fit change disclosed by shopper | “Has your preferred fit or usual size changed?” | Keep the old profile labeled with its last update; do not silently overwrite it |

Do not automatically ask height, weight, age, body shape, sex/gender, or measurements as a “confidence booster.” Any optional measurement entry belongs under `Add more detail` in account settings or appears as the single targeted question after the model identifies a specific missing signal.

## Recommendation and abstention behavior

The service should return one of four internal states:

1. **RECOMMEND_HIGH** — one size, qualitative `High confidence`, region explanation, active anchor, and product-data source.
2. **RECOMMEND_MEDIUM** — one leading size plus the meaningful trade-off, such as “M aligns at the waist; length may run long.” Allow the shopper to inspect the adjacent size.
3. **ABSTAIN** — evidence is too sparse, conflicting, out of distribution, or no available size clears the fit threshold. Shopper copy: “We need one more detail to recommend responsibly” or “We can't confidently choose between M and L.” Offer one targeted question, the brand chart, and manual size selection.
4. **UNAVAILABLE** — the retailer has no usable garment data for this SKU/category. Shopper copy: “Personalized fit isn't available for this item yet.” Show the published size chart and allow shopping to continue.

Never expose a percentage such as `92%` until probability calibration has been evaluated on held-out outcomes for that category and the number maps to observed correctness. Until then, use `High`, `Medium`, and `Not enough evidence` with documented thresholds. Recommendation failure must never disable size selection or add-to-bag.

## Consent, edit, export, and deletion

The account area should provide a visible `Fit Passport` section with:

- all anchors grouped by fit family, including brand, item, label size, regional feedback, source, and last updated date;
- `Edit`, `Replace`, and `Remove` on every anchor;
- global fit preferences and household profiles kept separate;
- `Download my Fit Passport` in a readable structured format;
- `Delete Fit Passport` without deleting the retail account;
- separate controls for recommendation persistence, improvement/analytics use, and marketing use;
- a record of consent version, timestamp, surface, and withdrawal;
- a plain explanation of what deletion removes immediately, what must be retained for legal/fraud reasons, and when derived caches or model features age out.

Profile edits should take effect on the next recommendation. Deletion should immediately disable personalization and initiate deletion across the primary store and processors. A portfolio implementation can demonstrate the workflow and audit log, but should not claim legal compliance until the real retailer's counsel, contracts, retention policy, and infrastructure are reviewed.

## Acceptance criteria

### Experience

- Fit Passport setup never blocks sign-up, sign-in, browsing, manual size selection, add-to-bag, or checkout.
- The post-sign-in invitation is a dismissible card and appears automatically no more than once per account under the documented suppression rules.
- The first useful profile can be completed in two question screens plus a result.
- The default path requires only one anchor garment, its brand/type/label size, and explicit overall or region-level fit feedback.
- A shopper can express multiple simultaneous fit observations, including `length just right` plus `waist too tight/loose`.
- Irrelevant body regions are omitted instead of displayed as `Not applicable`.
- The product/category/department already known from the PDP is not asked again.
- Returning shoppers with a valid family anchor receive guidance without replaying onboarding.
- Entering a new family triggers at most one optional micro-question; it never restarts the full questionnaire.
- `Shopping for someone else` cannot contaminate the primary shopper's profile.
- `Not now`, `Don't ask again`, close, and manual size selection are visible and keyboard accessible.

### Category coverage

- Every current catalog category maps to one documented garment schema and fit family.
- Each schema defines required garment measurements, regional weights, size-label normalization, stretch/intended-fit inputs, missing-data rules, and abstention thresholds.
- Category support is enabled only after that category has a held-out evaluation set and calibrated confidence thresholds.
- “All categories” means the system has an eligible response path for every mock category; it does not mean the system always returns a personalized size.

### Data and privacy

- Fit Passport data is stored against the retailer account, not only browser local storage.
- Core fit use, model-improvement use, and marketing use have distinct purposes and controls.
- No data field is collected without a named recommendation or operational purpose.
- Shoppers can view, correct, export, and delete fit data from the account UI without contacting support.
- Consent and deletion events are auditable, and a gift/session profile has a separate identifier and retention policy.

### Model trust

- Every answer records the target SKU/variant, available sizes, anchor used, garment-data version/provenance, model/rules version, output state, confidence band, and reason codes.
- Missing, conflicting, or outlier evidence produces `ABSTAIN` or `UNAVAILABLE` according to tested thresholds.
- No numerical confidence appears in the UI until category-specific calibration is measured and documented.
- A recommendation can always be bypassed; a failure never blocks commerce.

### Usability and experiment gate

The following are proposed launch gates, not external benchmarks:

- In moderated testing across mobile and desktop, at least 8 of 10 target shoppers complete the core task without moderator assistance.
- Median completion time for the default manual-anchor path is 60 seconds or less; recent-purchase selection is faster.
- Every participant can find the skip control, explain what will be saved, edit one fit region, and delete the passport.
- No participant interprets `Medium` or `Not enough evidence` as a guarantee.
- Instrument invitation view, start, step completion, skip reason, completion time, recommendation state, manual override, add-to-bag, purchase, exchange/return, and structured fit reason.
- Compare the default contextual card/PDP flow against any auto-modal variant through randomized assignment. Primary experience metrics are setup completion among starters, time to recommendation, and recommendation follow rate; guardrails are PDP exit, add-to-bag, checkout completion, deletion/withdrawal, and support contact. Business impact requires a full return window and cannot be inferred from engaged-user correlations.

## Recommended product copy

Use specific, non-promissory language:

- **Invitation:** “Find your size across brands. Start with one item you already own.”
- **Benefit:** “We compare how that item fits with this garment's measurements and intended fit.”
- **Control:** “Skip this and choose a size yourself.”
- **High confidence:** “We recommend M. Your reference item and this garment align at the chest and shoulder.”
- **Trade-off:** “M should align at the waist; this style may feel longer than your reference.”
- **Abstention:** “We can't choose confidently between M and L from the information available.”
- **Unavailable:** “Personalized fit isn't available for this item yet. You can still use the brand's size chart.”
- **Persistence:** “Save this fit to your retailer account so you don't have to enter it again.”

Avoid `perfect fit`, `guaranteed`, `universal size`, and uncalibrated percentage confidence. The promise is a transparent recommendation with a safe fallback, not certainty.

## What this plan changes in the prototype

1. Replace the five-stage questionnaire with the two-screen contextual anchor flow.
2. Replace the automatic new-user modal with a dismissible post-sign-in card; retain `Find my size` as the main trigger.
3. Convert one flat profile into a Fit Passport containing category-family anchors.
4. Replace universal waist/hip/chest/shoulder/length/sleeve rows with conditional region schemas.
5. Remove preselected per-region answers; require explicit `Fits well overall` or explicit adjustments.
6. Remove default age, weight, body shape, gender, and height questions. Add one targeted follow-up only when evidence policy requires it.
7. Replace the mock `92%` result with qualitative confidence and explicit `ABSTAIN`/`UNAVAILABLE` states until calibration exists.
8. Add retailer-account persistence, consent history, edit/export/delete controls, and household/gift separation.

## Source-quality note

Competitor product pages, technical documentation, and privacy policies are primary sources for what those companies say their products do. They are not independent proof of recommendation accuracy or business impact. Baymard's findings are primary usability research but address adjacent ecommerce account/form contexts, so this report labels the application to Fit Passport as an inference. Government sources describe privacy principles and rights; they are not a substitute for launch-specific legal advice.
