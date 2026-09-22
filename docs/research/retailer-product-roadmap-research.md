# MeasureOnce retailer product roadmap research

**Scope note after user clarification:** The operative delivery proposal is [MeasureOnce_Product_Milestones.md](../MeasureOnce_Product_Milestones.md). This research note includes alternatives, not approved scope. The user requires a retailer-integrated fit service, a multi-brand showcase, free resources, and all 11 existing apparel categories. A trousers-first release, footwear/children/intimates expansion, and preselected "Nothing" answers are not adopted. There is no real garment dataset or tester cohort yet. Synthetic tests cannot establish real fit accuracy.

**Research date:** 17 September 2026  
**Audience:** Product and engineering teams preparing a B2B fit product for a US multi-brand department retailer  
**Method:** Current first-party vendor documentation, retailer documentation, privacy policies, and retailer corporate publications. Vendor case-study outcomes are identified as vendor-reported and are not treated as independent proof.

## Research conclusion

A real MeasureOnce product is not a standalone questionnaire or a fashion brand. It is a retailer-integrated fit service with five connected parts: a short shopper profile, multi-brand product normalization, a recommendation service, an order-and-return learning loop, and retailer operations/reporting.

The market already provides persistent profiles, cross-brand recommendations, short anthropometric questionnaires, product-page widgets, APIs, catalog feeds, purchase/return ingestion, and retailer dashboards. MeasureOnce cannot credibly differentiate by claiming “one profile,” “cross-brand sizing,” “no photos,” or “AI recommendations.” The defensible product direction is narrower: a retailer-owned Fit Passport centered on garments the shopper already trusts, category-specific regional feedback, an inspectable measurement and provenance trail, and a first-class decision to abstain when the evidence is inadequate.

For a Macy's- or Nordstrom-like assortment, the storefront can merchandise every department, but fit recommendations need an explicit eligibility registry. True Fit itself covers apparel and footwear while excluding accessories, maternity, and custom garment construction. “All catalog categories” should mean the retail application can represent all categories; it should not mean the fit engine invents recommendations for unsupported products. ([True Fit category coverage](https://help.truefit.com/category-coverage))

For the stated B2B goal, “end to end” should cover the full fit-service lifecycle: retailer integration, identity, shopper profile, catalog ingestion, recommendations, fallback, events, outcome joins, operations, privacy controls, evaluation, and deployment. Owning live inventory, tax, payment settlement, fraud, fulfillment, and customer returns would create a separate retail business and does not strengthen the fit product evidence. A representative commerce shell remains useful for integration testing; production commerce should be treated as an external retailer dependency unless the product strategy explicitly changes.

## What the current market establishes

### True Fit

True Fit's current product is a fit-intelligence layer, not just a PDP widget. It describes item-specific recommendations built from shopper body and preference signals, product cut/material/sizing data, and purchase-and-return outcomes. It also supports persistent profiles, household subprofiles, retailer reporting, APIs, Shopify, a conversational Fit Agent, and MCP delivery. ([How True Fit works](https://www.truefit.com/how-it-works), [True Fit technical specification](https://www.truefit.com/fit-intelligence-spec), [True Fit Fit Agent](https://www.truefit.com/conversation-fit-agent), [True Fit MCP](https://www.truefit.com/mcp-fit-intelligence))

True Fit's network is its primary competitive asset. The July 2026 specification reports 100 million-plus registered shoppers, 60 million unique products, 91,000-plus brands, $616 billion in analyzed transactions, and nearly 20 years of outcomes. Other current True Fit pages cite roughly 80-82 million active users and 29,000 brands. These appear to be different definitions and should not be merged or repeated without qualification. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec), [True Fit Shopify](https://www.truefit.com/shopify), [True Fit demo](https://www.truefit.com/get-started))

True Fit can provide general guidance without a profile and personalized guidance after profile creation. Its public materials describe a specific recommended size, confidence, plain-language explanation, preferences such as tailored or loose fit, and optional “Fit Needs” for body areas that cause difficulty. Returning registered shoppers can receive guidance without repeating setup. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec), [True Fit platform overview](https://www.truefit.com/resources/calling-all-merchants))

The profile is broader than a retailer account. True Fit documents “traveling profiles” that can be recognized across participating retailer sites, while its newer materials describe persistent cross-session profiles and household members. MeasureOnce should treat cross-retailer identity as a later, separately consented product decision rather than silently copying this model. ([True Fit traveling profiles](https://www.truefit.com/post/decoding-the-data-collective-traveling-profiles), [How True Fit works](https://www.truefit.com/how-it-works))

The minimum Shopify prerequisites are product catalog data and order data; returns are optional but encouraged. Catalog data comes through Shopify's Product API, orders through a checkout pixel, and returns improve recommendations and reporting. For an enterprise department retailer, equivalent contracts will be required for product/variant data, orders, and returns even if Shopify is not used. ([True Fit Shopify data requirements](https://help.truefit.com/app-data-requirements), [True Fit returns integrations](https://help.truefit.com/app-returns-integration-partners))

### Fit Analytics

Fit Analytics' Fit Finder is a PDP-triggered advisor. The shopper completes one flow; later supported PDPs show an immediate recommendation without repeating it. The service does not require or offer a Fit Analytics account. With consent, a shop-scoped cookie can maintain the profile for 13 months after activity, and implementations can pass a stable retailer user ID and a pseudonymous shop session ID. ([Fit Finder shopper guide](https://fitanalytics.com/resources/how-to-use-fit-finder), [Fit Finder integration documentation](https://developers.fitanalytics.com/about-fit-finder/), [Fit Finder privacy policy](https://media.fitanalytics.com/widget/documents/privacy_en.pdf))

Inputs may include gender, height, weight, age, bra size, body shape, fit preference, and reference brands or products; age is explicitly required. The flow and recommendation logic vary by gender, age group, and category. Fit Finder supports adult tops, bottoms, dresses, outerwear, footwear, and children's upper-body apparel, but not accessories. ([Fit Finder shopper guide](https://fitanalytics.com/resources/how-to-use-fit-finder), [Fit Analytics feed documentation](https://developers.fitanalytics.com/))

The integration requires product data on the PDP, order data on the confirmation page, and product feeds whose IDs and size strings match those surfaces. A returns feed is required for the complete machine-learning loop. Explicit analytics consent, session continuity, locale, sizing system, inventory, logged-in state, and experiment identifiers are documented parts of the contract. ([Fit Finder integration documentation](https://developers.fitanalytics.com/about-fit-finder/), [Fit Analytics product and returns feeds](https://developers.fitanalytics.com/))

Fit Analytics is no longer a Snap business. Snap acquired it in 2021; Fit Analytics says management regained ownership effective January 2024 after Snap dissolved ARES. ([Snap Q1 2021 results](https://investor.snap.com/files/doc_financials/2021/q1/Q1%2721-Earnings-Slides-Final-4.22.21.pdf), [Fit Analytics independence announcement](https://media.fitanalytics.com/website/Press_Release-Fit_Analytics_Sizing_Solution_Company_Fit_Analytics_Thrives_as_Independent_Entity_after_Decoupling_from_Snap_Inc.pdf))

### Bold Metrics

Bold Metrics represents the anthropometric alternative. It asks four to six inputs, such as age, height, weight, trouser waist, or bra band/cup, and says it predicts more than 50 body measurements without a scan, photo, tape measure, named profile, or PII. It matches that result to garment specifications and displays how a candidate size should fit at critical measurement points. ([Bold Metrics shopper experience](https://boldmetrics.com/for-shoppers), [Bold Metrics platform](https://boldmetrics.com/platform))

Its public API returns body dimensions, candidate garments, fit descriptions and scores by region, outlier warnings, and an empty `good_matches` list when no size fits well. Garment dimensions come from size charts or tech packs. This means measurement-level explanation and no-match behavior already exist in the category; MeasureOnce must prove a more inspectable anchor-to-target decision, not claim these features as inventions. ([Bold Metrics Virtual Sizer API](https://docs.boldmetrics.io/virtual-sizer))

Bold Metrics documents product feeds, PDP metadata, recommendation events, anonymous identifiers, purchases, and returns through SFTP or Loop. Its analytics connect recommendations to add-to-cart and transaction outcomes. ([Smart Size Chart documentation](https://docs.boldmetrics.io/smart-size-chart), [Bold Metrics analytics](https://docs.boldmetrics.io/analytics-script), [purchase integration](https://docs.boldmetrics.io/purchase-script), [returns integration](https://docs.boldmetrics.io/returns))

### Sizebay

Sizebay asks a few product-page questions such as height, weight, and age, then combines anthropometric estimation, body-profile confirmation, fit preference, and managed product size charts. It supports separate footwear and apparel flows, lingerie, children's sizing, adjacent-size comparison, optional visual try-on, and a retailer back office. ([Sizebay Virtual Fitting Room](https://contents.sizebay.com/virtual-fitting-room-2026), [Sizebay Virtual Try-On](https://sizebay.com/en/virtual-try-on/), [Sizebay legal product overview](https://sizebay.com/en/legal/))

Its integration uses a cookie-based session ID, product IDs, inventory and locale data, product feeds or on-page data, and order tracking. The privacy policy lists profile, catalog, interaction, cart, order, recommendation, and return data. ([Sizebay API implementation](https://docs.sizebay.com/size-and-fit-implementation/service-implementation-api), [Sizebay product feed](https://docs.sizebay.com/size-and-fit-data-integration/product-integration-xml-feed), [Sizebay privacy policy](https://sizebay.com/en/legal/privacy-policy/))

### Retailer-native reference experiences

Amazon automatically shows personalized size guidance on eligible apparel and footwear PDPs. Its system uses brand relationships, size systems, product information, charts, reviews, customer preferences, and anonymized purchase-and-keep behavior. Personalized Fit Insights explain the recommendation and summarize relevant same-size review evidence; a seller-facing Fit Insights Tool connects returns, size charts, and customer feedback. ([Amazon Fashion fit technology](https://www.aboutamazon.com/news/retail/how-amazon-is-using-ai-to-help-customers-shop))

Zalando combines item-level size flags, personalized recommendations, account-level Size Profiles, outside reference products, order and return history, phone-derived body measurements, and a virtual fitting room. Its Size Profile can reuse trusted garments across brands and categories. This is direct evidence that “use a garment that fits” is not unique on its own. ([Zalando size-and-fit system](https://corporate.zalando.com/en/technology/how-zalando-uses-technology-help-customers-find-right-size))

ASOS provides a useful US-facing interaction pattern. A signed-in shopper invokes Fit Assistant beside the size selector on an eligible product, enters height, weight, and fit preferences, and then sees recommendations automatically on later supported PDPs. Shoppers can ignore it and continue using the normal selector, size guide, product details, and reviews. Fit Analytics powers the experience. ([ASOS US sizing help](https://www.asos.com/us/customer-care/product-stock/can-you-help-me-find-the-right-size/), [ASOS profile editing](https://www.asos.com/au/customer-care/product-stock/how-do-i-change-my-information-on-fit-assistant/))

## Onboarding and reuse patterns

| Product | Trigger and optionality | Minimum published inputs | Reuse | Category handling |
|---|---|---|---|---|
| **True Fit** | PDP or cart fit prompt; general guidance can appear before registration; profile and Fit Needs are optional refinements | No fixed public minimum. Published profile fields include age, gender, size, trusted brands, body shape, and fit preference | Persistent across sessions/devices; household members; optional network-wide traveling profile | Apparel and footwear categories; some measurements are optional or gathered only where relevant |
| **Fit Analytics** | Shopper opens a PDP CTA; later PDPs show immediate guidance; no account required | No fixed count; age is required and examples include gender, height, weight, shape, bra size, preference, and reference items | Shop-scoped cookie for 13 months after activity; retailer IDs can link logged-in use | Flow differs by gender, age group, apparel region, and footwear; no accessories |
| **Bold Metrics** | Shopper opens Find My Size/Smart Size Chart on the PDP; cart prompts can address size bracketing | Four to six inputs such as age, height, weight, waist, or bra size | Anonymous ID and retailer analytics; public shopper docs do not establish cross-retailer portability | Inputs and fit points vary by garment; region-level fit descriptions are returned |
| **Sizebay** | Shopper opens the Virtual Fitting Room on an eligible PDP | Usually height, weight, and age, followed by body-profile validation and preference | Browser/device session profile reused within the retailer implementation | Separate shoe and apparel paths; lingerie and kids have relevant inputs |
| **Amazon** | Automatic guidance on eligible PDPs | No public questionnaire minimum | Account behavior and fit preferences update continuously | Uses category/body-area, fabric, chart, review, and seller data |
| **Zalando** | Size flags and recommendations on eligible PDPs; optional account profile and body measurement | Exact profile minimum not public; trusted items, order feedback, sizes, preferences, and optional photos/video | Account-level reuse across brands and categories | Category-specific size profiles; jeans emphasize waist, hip, leg shape, and length |
| **ASOS** | Optional CTA beside the size selector; sign-in required for personalized use | Height, weight, fit preference, and account order history; some locales mention age | Automatic reuse on later supported PDPs; editable | Only supported products receive the control; normal guides and reviews remain available |

No reviewed company documents a mandatory questionnaire that interrupts every sign-in. The supported pattern is contextual, dismissible, and progressive.

## Practical MeasureOnce product direction

### Short Fit Passport

Use the retailer account as the identity and show a dismissible invitation after the first signed-in apparel or footwear interaction. Keep permanent entry points beside the PDP size selector and in Account. Do not block browsing, size selection, add to bag, checkout, or returns.

The first saved profile should require only evidence that can change a recommendation:

1. **Who is this for?** Self or a named household member.
2. **Choose one item that fits.** Prefer a kept retailer purchase; otherwise search brand, product/category, and labeled size.
3. **What would you change?** Show only the relevant regions for that item's category and default to “Nothing.” Examples: trousers use waist, seat/hip, rise, thigh, and length; shirts use chest, shoulders, sleeve, and body length; footwear uses length and width.
4. **Preferred feel.** Close, balanced, or relaxed.

This four-part design is a product recommendation to validate, not a market-proven optimum. It intentionally avoids asking age, height, weight, body shape, photos, and manual measurements at first setup because MeasureOnce's thesis is garment-relative fit. Ask one of those only if an evaluation shows it materially improves the current category decision.

After setup, reuse the passport across the retailer's brands and devices. When the target category lacks a relevant anchor, either provide general item guidance, ask one targeted category question, or abstain. “Complete once” should mean the shopper avoids a repeated generic survey; it cannot mean the profile never needs correction, another household member, or category-specific evidence.

### Category eligibility

Maintain a versioned registry with `SUPPORTED_PERSONALIZED`, `GENERAL_GUIDANCE_ONLY`, and `NOT_APPLICABLE` states. Apparel and footwear can be divided into fit families with their own inputs, garment measurements, model, thresholds, and evaluation set. Accessories, beauty, and home should not display a fit recommendation. New categories should not inherit another category's questionnaire or weights merely to create apparent coverage.

### Shopper result

Return one of three explicit states:

- `RECOMMEND`: size, qualitative confidence, active anchor, decisive regions, fit tradeoff, and available inventory.
- `ABSTAIN`: no size, a reason such as weak garment data or ambiguous adjacent sizes, and one useful next action.
- `UNAVAILABLE`: service or unsupported-category fallback to the retailer's normal size guide.

Every response should retain the shopper-profile version, normalized garment record, source and correction versions, model version, thresholds, and timestamp so support and retail teams can reproduce it.

## Data access required from a retailer

| Data | Minimum fields | Why it is required | Portfolio substitute | Pilot gate |
|---|---|---|---|---|
| **Identity and consent** | Stable customer ID, session ID, household profile, consent purpose/version, locale | Cross-device profile reuse, deletion, experiments, and governance | Local test accounts and explicit demo consent | Real identity provider, session security, export/deletion workflow |
| **Catalog and variants** | Brand, style/SKU, category, fit family, size system, variant, inventory, price, locale | Product eligibility and exact size mapping | Fictional multi-brand catalog | Stable IDs and daily or event-driven updates |
| **Size and garment evidence** | Published chart, measurement type, units, garment/body distinction, stretch/material, silhouette, intended fit, provenance | Dimensional recommendation and explanation | Synthetic records clearly labeled | Retailer/brand charts plus reviewed measurements or tech-pack fields |
| **Orders and fulfillment** | Customer/session, order, item/variant/size, recommendation exposure, shipment, quantity | Link advice to a real purchase and calculate coverage/adoption | Simulated orders | Reconciled events with documented completeness |
| **Returns and exchanges** | Original order/item, returned size, reason, body region/direction when offered, kept/exchanged size, timestamp | Learn outcomes and measure fit-related returns | Synthetic outcomes | Full return-window feed and reason mapping |
| **Experiments** | Persistent assignment, eligibility, exposures, selected size, cart/order/return outcomes | Causal retailer evaluation | Deterministic test assignments | Sample-ratio checks and shopper-level randomization |

Public size charts and generated catalog data are sufficient for a disclosed portfolio demonstration. They are not sufficient to claim retailer-grade accuracy. A real pilot requires partner product, order, and return data under an agreed processing and governance model.

### Current data constraint and acquisition path

MeasureOnce currently has no verified garment measurements, normalized brand charts, historical retailer outcomes, or fit-test participants. That blocks a production claim about physical fit. It does not block building production-grade identity, permissions, ingestion, profile, recommendation contracts, observability, and retailer operations, but the live shopper response must remain `GENERAL_GUIDANCE_ONLY` or clearly labeled sandbox output until the evidence gates are met.

Data acquisition should proceed in this order:

1. **Source registry:** record every chart or specification with owner, URL or file, effective market/date, body-versus-garment meaning, units, extraction method, and rights/terms review. Public charts can seed ingestion work, but cannot be assumed to describe shipped garments.
2. **Retailer catalog agreement:** obtain stable product, variant, category, size-system, availability, order, shipment, return, and consent fields from a design partner. This is the minimum integration dataset reflected in True Fit, Fit Analytics, Bold Metrics, and Sizebay documentation.
3. **Brand evidence:** request approved size charts, product measurements, tech-pack fields, stretch/material classifications, intended fit, and change notifications. Preserve brand data and learned corrections as separate versioned layers.
4. **Physical measurement sample:** establish a repeatable protocol, measurement-point definitions, operator training, duplicate measurements, tolerances, and provenance. Returned garments alone are a biased sample; include inbound or retained control garments where possible.
5. **Outcome data:** ingest historical and prospective kept, exchanged, and fit-returned units with structured reason and body-region direction when the shopper supplies it.
6. **Fit validation cohort:** recruit consented participants across relevant size ranges and fit needs, test blinded candidate sizes, and record region-level outcomes. Set sample and slice thresholds with a statistician after the category and expected error rate are known rather than inventing a universal count now.

With a free-only budget, the software can be built on local or free-tier infrastructure, and an early validation cohort can use volunteers and garments they already own. Those choices constrain representativeness and operational reliability. A retailer production launch still requires partner data, privacy/legal review, security work, and enough physical and outcome evidence to calibrate the model. Free synthetic data cannot substitute for those requirements.

### Honest launch gates

- **Engineering alpha:** production-shaped authentication, persistence, APIs, consent, ingestion, recommendation states, logs, and dashboard work with synthetic data; every recommendation is labeled synthetic.
- **Data alpha:** real chart/specification records pass provenance, unit, identity, and body-versus-garment checks; unsupported products return `UNAVAILABLE` or general guidance.
- **Fit beta:** a category-specific gold set and consented fit cohort exist; raw-chart and anchor baselines are measured; confidence and abstention thresholds are calibrated; predefined size and body-profile slices meet agreed safety floors.
- **Retailer shadow:** partner catalog, identity, order, and return feeds reconcile; recommendations run invisibly; missing-data, latency, and subgroup failures are within agreed limits.
- **Shopper pilot:** privacy, accessibility, support, security, deletion, rollback, and experiment reviews pass; the pilot runs through the full return window.
- **Commercial claim:** only randomized or otherwise defensible retailer evidence supports claims about return reduction, conversion, bracketing, margin, or retention.

The exact numeric gates cannot be selected responsibly before the first real dataset reveals eligible volume, class balance, error cost, and subgroup sizes. They should be preregistered before evaluation results are examined.

## Evidence-gated product roadmap

This is a research-derived implementation sequence rather than a PRD commitment.

### Milestone 0: Evidence contract

Define supported categories, the garment schema, Fit Passport schema, recommendation/abstention response, event taxonomy, consent purposes, evaluation protocol, and prohibited claims. Exit when one recommendation can be replayed from versioned inputs and synthetic values are visibly disclosed.

### Milestone 1: Retailer foundation

Implement real sign-in, secure sessions, account-linked Fit Passports, household profiles, edit/export/delete, consent recording, and device reuse. Build the eligibility registry so unsupported departments keep the retailer's normal experience. Exit when authentication and data-rights flows work end to end without relying on browser-only state.

### Milestone 2: Multi-brand data operations

Ingest a versioned product feed, normalize brand/category/size systems, preserve chart provenance, flag body-versus-garment measurement ambiguity, and create a review queue for missing or suspect data. Exit when every eligible variant maps consistently across catalog, PDP, order, and return records.

### Milestone 3: Focused recommendation evidence

Implement the short Fit Passport, category-specific trouser/jean questions, transparent dimensional matching, inventory-aware output, qualitative confidence, abstention, and decision replay. Compare raw-chart, size-label, anchor-only, corrected-dimensional, and always-answer baselines on synthetic ground truth. Exit on preregistered accuracy, coverage, calibration, traceability, abstention, and worst-slice thresholds.

### Milestone 4: Retailer operating product

Add PDP integration, automatic returning-user guidance, graceful failure, event collection, order/return joins, a product-data review queue, and a retailer dashboard for coverage, adoption, recommendation acceptance, calibration, abstention, returns, and data quality. Exit after resilience, privacy, accessibility, latency, and reconciliation checks pass.

### Milestone 5: Historical replay and shadow mode

With a retailer partner, normalize historical catalog/order/return data, estimate eligible volume and baseline fit-return reasons, test recommendations without showing them to shoppers, and quantify missing-data and subgroup failure modes. Synthetic evaluation remains regression evidence; historical replay becomes the first retailer-specific evidence.

### Milestone 6: Randomized pilot

Run a shopper-level experiment with stable assignment and the retailer's full return window. The primary business metric should be fit-related returned units among eligible shipped units. Guardrails should include gross margin per order, PDP-to-cart conversion, bracketing, support contacts, latency, coverage, abstention, and preregistered subgroup performance. Promote, extend, or stop using rules written before results are seen.

After the first category passes the gates, add shirts, dresses, outerwear, intimates, footwear, kids, and other fit families one at a time. Each expansion needs its own signals, garment evidence, evaluation set, and thresholds.

## Defensible opportunities and unvalidated hypotheses

### Defensible product choices

- **Retailer-owned Fit Passport.** The retailer account is the default identity boundary; cross-retailer portability remains optional and separately consented.
- **Reference-garment evidence by region.** The shopper can say the waist is loose while the length is right, and the recommendation preserves both signals.
- **Inspectability.** Retail and support teams can see which anchor, garment values, corrections, missing data, and thresholds created the decision.
- **Explicit abstention.** The product refuses a size when adjacent candidates cannot be separated or required garment evidence is missing.
- **Reproducible evaluation.** Portfolio metrics, assumptions, slice results, and failures can be rerun and inspected.

These are features MeasureOnce can build and demonstrate. Public competitor sources do not prove that their absence is a universal buyer pain, so they should be pitched as design choices and evaluated with retailer stakeholders.

### Hypotheses requiring evidence

- A trusted-garment flow is more accurate or easier than height/weight onboarding.
- Four short Fit Passport steps achieve better completion than incumbent questionnaires.
- Regional anchor feedback improves cross-brand size choice.
- Explanations and abstention increase trust or conversion.
- Retailer-owned profiles are commercially preferred to network profiles.
- Measurement corrections materially outperform raw brand charts.
- MeasureOnce reduces returns, increases conversion, improves margin, or costs less than competitors.

Synthetic tests can answer whether the implementation behaves correctly under declared assumptions. Usability research can measure comprehension and completion. Historical retailer data can test retrospective accuracy. Only a live controlled pilot can support causal commercial claims.

## Vendor-reported outcomes are context, not proof

- True Fit publishes retailer case studies and benchmark ranges for conversion, bracketing, revenue, and returns. Its own technical specification says results vary by retailer, category, catalog, adoption, and integration. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec))
- Fit Analytics publishes average 4-6% conversion improvement and 2-4% return reduction, plus retailer case studies. These are Fit Analytics' figures. ([Fit Finder product page](https://fitanalytics.com/fit-finder))
- Bold Metrics publishes average results tied to solution engagement, including conversion, order value, and fit-related returns. Engagement cohorts can differ from non-users, so these are not a neutral benchmark for a new product. ([Bold Metrics Virtual Sizer](https://boldmetrics.com/solutions/virtual-sizer))
- Sizebay explicitly says its current performance figures are aggregated first-party results rather than industry-wide benchmarks. ([Sizebay performance note](https://sizebay.com/en/blog/consumer-buying-behavior/))
- Amazon states that customers are more likely to buy and keep an item when a size is recommended but does not publish a causal percentage in the cited product explanation. ([Amazon Fashion fit technology](https://www.aboutamazon.com/news/retail/how-amazon-is-using-ai-to-help-customers-shop))
- Zalando reports fewer size-related returns where advice is available. This retailer-reported result demonstrates materiality but does not establish MeasureOnce's expected effect. ([Zalando size-and-fit system](https://corporate.zalando.com/en/technology/how-zalando-uses-technology-help-customers-find-right-size))

The pitch should therefore promise an auditable pilot and defined decision gates, not a preselected return-reduction percentage.
