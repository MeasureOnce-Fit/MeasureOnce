# MeasureOnce market and competitive landscape

**Research date:** 17 September 2026  
**Scope:** Apparel and footwear size-and-fit technology for multi-brand ecommerce. Sources are first-party vendor documentation, retailer documentation, corporate reports, and the National Retail Federation. Performance figures are labeled as vendor-reported unless they come from a retailer's own publication. They should not be treated as independently verified causal results.

## Executive conclusion

MeasureOnce is entering an established market. True Fit, Fit Analytics, Bold Metrics, and Sizebay already provide product-page recommendations, persistent or cookie-based shopper state, catalog ingestion, order and return feedback, retailer reporting, and multiple integration patterns. Large retailers such as Amazon and Zalando have built similar capabilities internally at a scale a portfolio product cannot reproduce.

The credible opportunity is therefore not to claim that MeasureOnce invented cross-brand fit or personalized sizing. The strongest position is a transparent, reference-garment-first fit system for multi-brand retailers: a shopper signs in once, describes how a garment they already own fits at specific body regions, and receives product-specific guidance that exposes the garment evidence, explains the tradeoff, and explicitly declines to recommend when the data is inadequate. This combination is narrower than the incumbents' platform claims and can be demonstrated without pretending to have their data network.

The current PRD is directionally sound in treating the storefront as an experience shell and the evidence layer as the next milestone. It should now make retailer identity, one-time onboarding, a real database, catalog/order/return contracts, consent controls, operational reporting, and a phased pilot part of the product definition. Synthetic evaluation can validate software and model behavior; only live retailer data and a controlled pilot can support business claims about returns, conversion, or margin.

## Market and customer evidence

- Returns are a material ecommerce operating problem. The National Retail Federation and Happy Returns project that **19.3% of online sales will be returned in 2025**, within $849.9 billion of total U.S. retail returns. This is a cross-retail figure, not an apparel-specific rate. ([NRF 2025 Retail Returns Landscape](https://nrf.com/media-center/press-releases/consumers-expected-to-return-nearly-850-billion-in-merchandise-in-2025))
- The scale of retailer-native fit systems shows that size guidance is a core commerce capability rather than a novelty. Amazon says its size-recommendation system analyzes millions of data points daily and produces billions of recommendations monthly across 20 locations. Its recommendation uses brand relationships, size systems, reviews, product details, customer preferences, and anonymized purchase-and-keep patterns. ([Amazon Fashion fit technology](https://www.aboutamazon.com/news/retail/how-amazon-is-using-ai-to-help-customers-shop), [Amazon 2024 Sustainability Report](https://sustainability.aboutamazon.com/content/dam/sustainability-marketing-site/pdfs/reports-docs/2024-amazon-sustainability-report.pdf))
- Zalando says its foundational size-and-fit guidance covers about **70% of its assortment**. It combines brand data, purchases and returns, shopper feedback, fitting-model observations, body measurements, and reference products, including items bought outside Zalando. Zalando reports that size advice avoids more than 8% of size-related returns; this is retailer-reported, not an independent experiment reviewed here. ([Zalando size-and-fit overview](https://corporate.zalando.com/en/technology/how-zalando-uses-technology-help-customers-find-right-size), [Zalando 2025 results](https://corporate.zalando.com/en/investor-relations/zalando-full-year-2025-results))
- ASOS exposes a simpler version of the expected shopper experience: a signed-in shopper enters height, weight, and fit preferences, and subsequent product pages show recommendations automatically. ASOS identifies Fit Analytics as the third-party provider. ([ASOS fit guidance](https://www.asos.com/au/customer-care/product-stock/can-you-help-me-find-the-right-size/))

These sources support the customer problem and the strategic importance of fit guidance. They do not prove that any new implementation will reduce returns.

## Competitive map

| Product | Primary approach | Shopper state | Garment and outcome data | Delivery and retailer tools | Evidence and caveats |
|---|---|---|---|---|---|
| **True Fit** | Behavioral and cross-brand fit graph built from purchase and return outcomes, catalog normalization, shopper attributes, and preferences | Anonymous aggregate fallback plus a persistent True Fit Profile; profiles can span devices and supported retailer experiences | Catalog, sizing, order, return, shopper profile, and cross-market outcome data | PDP widget, Shopify app, API, Fit Agent, MCP, PLP/search use cases, retailer reporting and shopper-level True 360 feeds | Strongest network claim. All scale and performance figures are vendor-reported; current official pages use inconsistent definitions for shoppers and brands. |
| **Fit Analytics** | Machine learning from user inputs, similar shoppers, purchases, and returns | No required account; returning-user answers are generally stored in a cookie, with retailer user and session IDs supported | Product feed, PDP/OCP data objects, purchases, returns, return reasons | Asynchronous PDP widget, immediate recommendations, order-confirmation script, reporting | Official technical docs are unusually specific. Fit Analytics is independent again; it is no longer a Snap business. |
| **Bold Metrics** | Predicts 50+ body measurements from a short questionnaire, then matches the predicted body to product-specific garment data | Anonymous ID/cookie; no photo or named profile required for the shopper flow | Size charts or tech packs, product feed, recommendation events, purchases, returns | Smart Size Chart, stateless Virtual Sizer API, Virtual Tailor API, Shopify and custom PDP integration, Apparel Insights | Measurement-oriented and close to MeasureOnce's proposed dimensional path. Outcome and accuracy figures are vendor-reported. |
| **Sizebay** | Anthropometric estimation from height, weight, age, and body profile, matched to managed size charts; optional visual try-on | Cookie-based session ID and an active profile; no named account required | Catalog, charts, measurements, inventory, events, orders, and returns | Widget/iFrame, API, XML/on-page feeds, dynamic size chart, My.Sizebay back office, Intelligence dashboards, Fashion Hub | Broader commerce suite includes product discovery and visual try-on. Performance figures are first-party aggregated claims. |
| **Retailer-native systems** | Proprietary combinations of purchase/return data, profile history, reviews, charts, measurements, computer vision, and fitting specialists | Retailer account and shopping history | Deep first-party catalog and transaction data | Integrated across PDP, search, reviews, profiles, brand tools, and merchandising | Amazon and Zalando set the experience bar but their scale and data are not reproducible with free resources. |

## True Fit deep dive

### Product and buyer proposition

True Fit positions itself as an AI fit-and-sizing intelligence layer for DTC brands, multi-brand retailers, marketplaces, Shopify merchants, platforms, and AI agents. The system returns a product-specific size, fit confidence, and a persistent shopper fit profile. It also sells retailer intelligence, including fit discrepancies, brand affinities, category interests, demographics, and return behavior. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec), [True Fit Reporting Center](https://www.truefit.com/reporting-center))

This is a B2B2C proposition: improve the shopper's decision while creating first-party profile and merchandising data for the retailer. The pitch is broader than a size widget. Current pages extend the same intelligence into PDPs, PLPs, search, homepage experiences, chat, support, returns, and external agents. ([True Fit Fit Agent](https://www.truefit.com/conversation-fit-agent), [True Fit MCP](https://www.truefit.com/mcp-fit-intelligence))

### Shopper profile and one-time setup

True Fit's privacy policy says profile setup may collect age, gender, size, brand preferences, body shape, and fit preferences; email is recommended but not required. Cookies associate a browser with the profile, remember prior answers, and provide personalized recommendations. A profile is usable across devices, and True Fit's newer agent product describes consented shopper information as a persistent profile that can be activated through retailer experiences and supported Shopify integrations. ([True Fit privacy policy](https://www.truefit.com/privacy-policy-and-choices), [True Fit Fit Agent](https://www.truefit.com/conversation-fit-agent))

True 360 shows that the commercial system can expose stable True Fit IDs, retailer user IDs, profile origin, consent and masked-email fields, body attributes, affinities, and likely sizes through APIs or encrypted files. That makes identity design and retailer governance core product requirements, not optional enhancements. ([True 360 sample view](https://help.truefit.com/true-360-sample-view))

### Data network and integrations

True Fit calls its proprietary outcome graph the Fashion Genome. Its July 2026 technical specification reports 100 million-plus registered shoppers, 60 million unique products, 91,000-plus covered brands, $616 billion of analyzed transaction value, and nearly 20 years of purchase and return outcomes. It lists profile and size history, product catalogs, historical purchases and returns, and a real-time platform connection as key inputs. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec))

These counts require caution. Other current True Fit pages cite roughly 80-82 million active users and 29,000 brands. The figures may use different definitions, but the official pages do not reconcile them. A MeasureOnce pitch should not repeat the numbers without preserving the label and source, and should never combine them into a single market fact. ([True Fit Shopify](https://www.truefit.com/shopify), [True Fit demo page](https://www.truefit.com/get-started))

Documented integration routes include a PDP JavaScript experience, a native Shopify app, custom APIs, MCP, and an out-of-the-box Fit Agent. Shopify integration uses product catalog data and a checkout pixel; returns are optional but encouraged for reporting and recommendation improvement. Loop webhooks and Matrixify/SFTP are documented return-integration paths. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec), [True Fit app data requirements](https://help.truefit.com/app-data-requirements), [True Fit returns integrations](https://help.truefit.com/app-returns-integration-partners))

### Privacy and claims discipline

True Fit says personally identifiable information is not used to generate recommendations and external AI agents receive outputs rather than raw shopper data. This is a narrow computation claim, not a claim that True Fit stores no personal information. Its privacy policy confirms collection of profile data, possible receipt of purchase information from retailers, and possible sharing of a profile, including email when supplied, with retailers, service providers, manufacturers, and configured partners. Profile data sent back to a retailer is then governed by that retailer's policy. ([True Fit technical specification](https://www.truefit.com/fit-intelligence-spec), [True Fit privacy policy](https://www.truefit.com/privacy-policy-and-choices))

True Fit provides access, correction, deletion, portability, and some advertising/profiling choices, while noting that archived data may sometimes not be permanently removable. Its U.S. notice says it does not sell data for money but may “share” it for cross-context behavioral advertising under applicable state-law definitions. ([True Fit privacy policy](https://www.truefit.com/privacy-policy-and-choices), [True Fit U.S. state disclosures](https://www.truefit.com/us-state-privacy-disclosures))

True Fit reports conversion, revenue, bracketing, and return improvements across customer stories. For example, it reports a 15% return reduction among APL shoppers using True Fit and a 4.71% sitewide incremental revenue lift for PacSun. These are vendor-published case studies. Engaged-user conversion comparisons are especially vulnerable to selection effects unless a randomized design is specified. ([APL case study](https://www.truefit.com/customer-stories/apl), [PacSun case study](https://info.truefit.com/pacsun-case-study))

## Adjacent competitors

### Fit Analytics

Fit Analytics' Fit Finder asks for inputs such as height, weight, age, body shape, fit preference, and reference brands/items, then compares the shopper with similar users and learns from purchases and returns. Its shopper guide says an account is neither required nor offered; answers are stored in a browser cookie for reuse. ([Fit Finder shopper guide](https://fitanalytics.com/resources/how-to-use-fit-finder))

The implementation is a lightweight asynchronous PDP script plus an order-confirmation script. Fit Analytics requires a structured product feed and, for the complete learning loop, a returns feed. Its public docs support PDP, PLP, checkout, multiple size systems, A/B-test identifiers, signed-in user IDs, anonymous shop session IDs, and immediate recommendations for returning users. ([Fit Finder integration docs](https://developers.fitanalytics.com/about-fit-finder/), [product and returns feed docs](https://developers.fitanalytics.com/))

The privacy policy is more expansive than the simplified “anonymous” marketing language: it lists questionnaire answers, device and technical data, usage, purchases and returns, order IDs, shop session IDs, and shop user IDs. This reinforces the need to document specific data flows instead of making a blanket anonymous-data promise. ([Fit Finder privacy policy](https://media.fitanalytics.com/widget/documents/privacy_en.pdf))

Snap acquired Fit Analytics in 2021, but Fit Analytics says its management reacquired the business effective January 2024 after Snap dissolved its ARES unit. It now operates independently as Fit Analytics Innovation GmbH. ([Snap Q1 2021 results](https://investor.snap.com/files/doc_financials/2021/q1/Q1%2721-Earnings-Slides-Final-4.22.21.pdf), [Fit Analytics 2024 announcement](https://media.fitanalytics.com/website/Press_Release-Fit_Analytics_Sizing_Solution_Company_Fit_Analytics_Thrives_as_Independent_Entity_after_Decoupling_from_Snap_Inc.pdf))

Fit Analytics reports an average 4-6% conversion increase and 2-4% return-rate decrease. These are vendor averages and must be labeled that way. ([Fit Finder product page](https://fitanalytics.com/fit-finder))

### Bold Metrics

Bold Metrics takes an anthropometric path. Its platform asks four to six questions and says it predicts more than 50 body measurements without a scan, photo, or measuring tape. It then matches that “digital twin” to style-specific garment specifications and fit preferences. ([Bold Metrics platform](https://boldmetrics.com/platform), [Virtual Sizer](https://boldmetrics.com/solutions/virtual-sizer))

The public developer portal exposes a stateless Virtual Sizer API that returns predicted dimensions, candidate sizes, per-region fit descriptions and scores, outlier warnings, and an empty match list when no size fits well. Garment dimensions can come from size charts or tech packs. Smart Size Chart provides a hosted PDP experience and accepts product, variant, availability, fit, and size-chart metadata. ([Virtual Sizer API](https://docs.boldmetrics.io/virtual-sizer), [Smart Size Chart docs](https://docs.boldmetrics.io/smart-size-chart))

Bold Metrics also documents analytics, purchase, and return connections. Its purchase endpoint joins recommendations to transactions with an anonymous ID and includes product, price, geography, and order data; return data can arrive through SFTP or Loop. ([Bold Metrics analytics](https://docs.boldmetrics.io/analytics-script), [purchase integration](https://docs.boldmetrics.io/purchase-script), [returns integration](https://docs.boldmetrics.io/returns))

Vendor pages report 250 million-plus digital twins, 12 billion-plus body data points, 750 million-plus fit simulations, and average improvements in conversion, order value, and fit-related returns. These metrics are Bold Metrics' claims, not independent findings. ([Bold Metrics Virtual Sizer](https://boldmetrics.com/solutions/virtual-sizer))

### Sizebay

Sizebay's Size & Fit product estimates body measurements from height, weight, age, and a shopper-confirmed body profile, then cross-references those estimates with product-specific size charts. It supports apparel, footwear, lingerie, children's sizing, preferred-fit visualization, and optional visual try-on. ([Sizebay Virtual Try-On](https://sizebay.com/en/virtual-try-on/))

Implementation options include an iFrame/widget, API, Google Shopping-style XML feeds, on-page product extraction, order tracking, and a cookie-based Sizebay Session ID. Sizebay says its team validates or creates charts, while My.Sizebay and Intelligence provide catalog administration and reporting. ([Sizebay implementation docs](https://docs.sizebay.com/size-and-fit-implementation/service-implementation-api), [Sizebay product feed](https://docs.sizebay.com/size-and-fit-data-integration/product-integration-xml-feed), [Sizebay legal product overview](https://sizebay.com/en/legal/))

The privacy policy lists profile data, catalog and chart data, device identifiers, behavioral events, carts, recommendations, purchases, and returns. It states that images used for visual search are not stored after processing, while anonymized or aggregated data may support reporting and model improvement. ([Sizebay privacy policy](https://sizebay.com/en/legal/privacy-policy/))

Sizebay explicitly labels its current outcome numbers as first-party aggregated performance data rather than industry benchmarks. It reports results “up to” 5x conversion, 50% fewer returns, 12% higher average order value, and 40% higher repurchase. These remain vendor-reported upper-bound claims. ([Sizebay first-party performance note](https://sizebay.com/en/blog/consumer-buying-behavior/))

## Retailer-native reference products

### Amazon

Amazon's system combines brand-size relationships, product attributes, charts, reviews, preferences, and anonymized purchases and keeps from similar customers. The customer experience includes a real-time size recommendation and Personalized Fit Insights that explain the recommendation and summarize fit feedback from reviews for the same size. Amazon also standardizes and repairs size-chart data and provides sellers with a Fit Insights Tool that combines returns, charts, and feedback to identify product and chart issues. ([Amazon Fashion fit technology](https://www.aboutamazon.com/news/retail/how-amazon-is-using-ai-to-help-customers-shop))

This shows the full product loop expected by the market: shopper guidance, explanation, continuously updated catalog intelligence, and a supplier-facing correction workflow.

### Zalando

Zalando combines item-level flags, personalized size recommendations, a Size Profile, phone-based body measurement, and a virtual fitting room. The Size Profile can include brands and products that fit well even if bought elsewhere, plus feedback on previous orders. Recommendations combine brand information, purchases and return reasons, shopper feedback, and physical fitting-model observations. ([Zalando size-and-fit overview](https://corporate.zalando.com/en/technology/how-zalando-uses-technology-help-customers-find-right-size))

Zalando is the clearest evidence that a known-good reference item is not unique by itself. MeasureOnce must differentiate through the granularity and inspectability of the reference signal, not merely through the existence of a reference garment.

## Credible positioning for MeasureOnce

### Claims the product can support after a reproducible portfolio evaluation

1. **Reference-garment-first onboarding.** The primary input is a garment the shopper already understands, with independent feedback for waist, hip or seat, rise, thigh, inseam, chest, shoulder, sleeve, or body length as applicable. Public competitor materials document reference brands/items and fit preferences, but not this exact region-by-region anchor-to-target evidence path.
2. **Inspectable recommendations.** The system can show which anchor, target measurements, corrections, category weights, missing fields, model version, and thresholds produced the answer. This is a demonstrable product characteristic, not an accuracy claim.
3. **Explicit evidence policy.** `RECOMMEND`, `ABSTAIN`, and `UNAVAILABLE` are separate responses. Bold Metrics documents outlier and no-match behavior, so abstention should be positioned as a trust policy and a tested implementation strength, not as a category invention.
4. **Retailer-owned identity by default.** A signed-in retailer account stores the Fit Passport. Cross-retailer portability can remain an optional, separately consented future capability. This gives a prospective retailer a simpler governance story than a shared-network identity.
5. **No photo or body-scan requirement.** This reduces onboarding sensitivity, but it is not unique: Bold Metrics also explicitly avoids photos and scans.
6. **Open evaluation evidence.** A portfolio reviewer can rerun the synthetic benchmark, inspect slice metrics, and replay individual decisions. This is a credible differentiation in sales engineering and product trust even though synthetic results do not demonstrate production impact.

### Claims to avoid

- “The first” or “the only” cross-brand fit platform.
- “More accurate than True Fit,” “reduces returns,” or a numeric confidence claim without a matched evaluation or retailer experiment.
- “Anonymous” or “no personal data” when a Fit Passport, account identifier, order, return, or fit preference is stored.
- “Works across every category” before category-specific garment schemas and labeled data exist.
- “One-time questionnaire forever” without freshness rules, edit controls, category transfer rules, and re-prompt logic.
- Network-scale claims based on synthetic shoppers, generated products, or catalog breadth alone.

### Recommended pitch

> MeasureOnce is an explainable fit layer for multi-brand retailers. A shopper completes a Fit Passport once using clothing they already know. MeasureOnce translates that regional fit evidence to each product, shows why a size is recommended, and says when the retailer's garment data is not strong enough to answer. Retailers receive the decision trace and product-level fit evidence needed to improve sizing over time.

This pitch is specific, demonstrable, and compatible with the requested Nordstrom- or Macy's-like account experience. It does not depend on an unsupported outcome claim.

## PRD implications

### Product definition

- Define the application as a **fictional multi-brand retailer with an embedded MeasureOnce fit layer**, not a MeasureOnce clothing brand or a standalone fit form.
- Use the retailer's sign-in as the primary identity. Store `fit_profile_status`, consent version, onboarding completion, profile freshness, and household/member context separately from basic account data.
- After the first successful sign-in, offer a one-time Fit Passport prompt with clear benefits, `Not now`, and `Don't ask again` controls. Once completed, recommendations should appear automatically on eligible product pages. Re-prompt only for a documented reason such as a missing category anchor, stale profile, or conflicting evidence.
- Retain an anonymous item-level fallback so shoppers can browse and buy without creating a fit profile.

### Shopper and recommendation requirements

- Store multiple known-good and known-bad garments, category-specific regional feedback, desired ease, freshness, confidence, and outcomes.
- Add per-SKU recommendation, explanation, qualitative confidence, available sizes, and explicit `ABSTAIN`/`UNAVAILABLE` states. A failure must never block size selection or add to bag.
- Show the active anchor and allow the shopper to edit it. “Completed once” must mean reusable and editable, not immutable.
- Start with trousers and jeans for the evidence milestone, while the retail catalog can remain broad for storytelling. Expand only after each category has a measurement schema and evaluation set.

### Retail data platform

- Specify product, brand, variant, size-system, availability, size-chart, garment-measurement, fabric/stretch, and intended-fit contracts. Version every normalized garment record and retain provenance.
- Add order, shipment, exchange, return, and structured fit-reason events. Preserve the recommendation, model version, garment version, and experiment assignment at decision time.
- Add a review workflow for chart extraction, suspect measurements, learned corrections, and brand disputes. Corrections must be reversible and must not silently overwrite a brand's published chart.
- Build an internal portal for adoption, coverage, abstention, calibration, fit-return reasons, brand/category slices, product data quality, and recommendation replay. Apply role-based access and cohort-size thresholds to shopper-level and demographic reports.

### Privacy and security

- Separate consent for fit recommendation, profile persistence, analytics/model improvement, and marketing activation. Avoid bundling them into account creation.
- Document which data the retailer controls, which MeasureOnce processes, how IDs are pseudonymized, retention periods, export and deletion behavior, and how downstream caches and analytics are updated.
- Treat body shape, measurements, fit preferences, and inferred attributes as sensitive product data even when a jurisdiction does not assign all of them a special statutory category.
- Do not claim the system is anonymous once it is attached to a signed-in account. Use precise language such as “pseudonymous for model computation” where accurate.

### Evaluation and commercialization

- Use synthetic evaluation to test cross-brand transfer, top-one and top-two accuracy, coverage, abstention precision, calibration, traceability, and worst-slice performance. Publish the generator assumptions and separate synthetic metrics from business outcomes.
- Compare at least: raw chart, size-label, anchor-only dimensional, corrected-dimensional, and always-answer baselines. Include missing-data, conflicting-profile, new-brand, and out-of-distribution cases.
- Do not set a public accuracy, conversion, or return-reduction promise before results exist. Qualitative confidence labels should map to observed correctness bands.
- A real retailer pitch should propose a low-risk path: catalog and chart audit, offline historical replay, shadow recommendations, then a shopper-level randomized pilot with stable assignment and a full return window. Measure fit-related return rate, conversion, gross margin per order, bracketing, coverage, abstention, latency, and subgroup performance.

### Commercial implication

The incumbents' moat is data and integration history. A free-resource portfolio build cannot match it and should not imply that it does. The product can still be pitch-ready if it proves the full operating loop on a bounded category: real authentication and persistence, multi-brand product data, a traceable recommendation service, abstention, outcome capture, an internal evidence portal, documented privacy controls, and reproducible evaluation. That is sufficient to demonstrate product judgment and technical readiness while presenting live-retailer results as the next contractual milestone.

## Source quality notes

- Vendor product pages, documentation, privacy policies, and case studies are primary sources for what a vendor offers and claims. They are not independent evidence that the claimed commercial effect will occur elsewhere.
- Retailer-owned sources from Amazon, ASOS, and Zalando are primary descriptions of their systems. Their reported impact figures still lack the experimental detail needed to generalize them to MeasureOnce.
- No public source reviewed here establishes a universal fit-tech conversion or return-reduction benchmark. The PRD should treat every such number as a hypothesis until the specific retailer's baseline, eligibility rules, sample, and experiment design are known.
