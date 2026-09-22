# Brand coverage and size-recommendation eligibility

Research date: 2026-09-20  
Scope: a fit recommender embedded beside a retailer catalog such as Nordstrom. This answers a product-design question; it does not claim that Nordstrom exposes a public API for every brand's size chart.

## Answer

**Yes: the picker labelled “Brand” should show every brand that currently has sellable products in the selected target category.** A shopper selecting a known brand is describing their owned garment, so hiding a catalog brand because the recommender has not ingested its chart is misleading and makes the feature look broken.

**No: selecting a catalog brand must not itself make that brand eligible for a size recommendation.** Catalog coverage, official/validated size-chart coverage, and recommendation eligibility are three separate states:

| State | Source of truth | What the UI should do |
|---|---|---|
| **Catalog brand** | Current retailer assortment filtered to the target category | List it in the brand picker/search. |
| **Verified reference available** | Versioned official brand/category chart or measured product/size data, with a compatible sizing system | Show its available sizes and permit a recommendation. |
| **No verified reference** | The brand exists, but there is no usable chart/size or it does not cover the target category/region | Let the shopper enter the label size and how it fits; save it as context only. Do **not** return a recommended target size from that label alone. Offer exact-garment lookup, a tape-measure path, or body measurements. |

The existing screen conflates the first two rows. That is why only one synthetic/reference brand appears for jackets and none appears for dresses: it is a **reference-data list incorrectly presented as a brand list**. The requested behavior is the right correction.

## Primary evidence

### 1. Nordstrom treats brand availability as a catalog-filter concern

Nordstrom’s public [Women’s Dresses browse page](https://www.nordstrom.com/browse/women/clothing/dresses) exposes a `Brand` filter with “Find a brand” and a long catalog-derived list (for example, A.L.C., Adidas, ASTR the Label, Balenciaga, and many more). It separately exposes a `Size` filter. The page does not label the brand filter as a size-chart or recommendation-data filter. This is direct evidence that the retailer’s category brand universe is an assortment concern, not a chart-coverage subset.

The same pattern is public on Nordstrom’s [Coats & Jackets category](https://www.nordstrom.com/browse/women/clothing/coats-jackets?filterByBrand=nordstrom): category, product-type, size, and brand are independent filters, and the brand list contains many manufacturers. Category state also matters: a filtered category can legitimately have fewer brands, as shown by Nordstrom’s [petite wrap coats & jackets view](https://www.nordstrom.com/browse/women/clothing/petite-size/coats-jackets?filterByStyle=wrap), which lists only brands with matching currently indexed items.

### 2. Nordstrom’s own size material is brand- and chart-specific

Nordstrom’s public [Evans Women’s Apparel Plus size guide](https://www.nordstrom.com/sizeguides/1738_sizeguide.pdf) is explicitly a named-brand chart and maps that brand’s labels to bust, waist, and hip values. Other public Nordstrom guide PDFs are likewise named-brand pages (for example [Tory Burch](https://www.nordstrom.com/sizeguides/1437_sizeguide.pdf) and [Leith](https://www.nordstrom.com/sizeguides/1415_sizeguide.pdf)). This supports storing chart provenance at least as `brand + category + size system + chart version/source`, rather than treating a retailer-wide `M` or `8` as universal.

Nordstrom’s public [fit guide](https://www.nordstrom.com/sizeguides/12_fitguide.pdf) also says dress-shirt chest and waist measurements vary by brand. Its [measurement guide](https://www.nordstrom.com/sizeguides/1738_sizeguide.pdf) tells shoppers to use body measurements and consult the Size Chart and Fit Tips on the product page. Those are official reminders that brand labels and finished fit are not interchangeable.

### 3. Fit-tech providers require product/size data for recommendations

Fit Analytics’ official [Fit Finder integration documentation](https://developers.fitanalytics.com/about-fit-finder/) says the recommendation integration needs shop data objects, requires them to update as the shopper changes product or color, and says size values must match the product and return feeds. Its official [technology overview](https://fitanalytics.com/our-technologies) describes recommendations as based on garment, size, and fit information, purchase/return data, shopper body information, and preferences—not merely a comparison of brand names.

That is consistent with the safety boundary above: an unknown chart is not a harmless empty dropdown; it is missing recommendation evidence.

## Recommended UX and data contract

### Product-context flow (a shopper is finding fit for a specific dress or jacket)

1. Derive the target category from the product (for example, *dress* or *jacket*).
2. Populate **“Brand of a garment you own”** from the retailer’s current category-brand index, with searchable typeahead. Include **“My brand is not listed”** for external brands.
3. After selection, look up a separate `referenceCoverage` record:
   - **Available:** show the matching supported size labels, ask how that known size fits, and calculate a recommendation only if the target and reference both have the required validated data.
   - **Unavailable:** still accept `brand`, `garment category`, `label size`, and regional fit note. State plainly: “We don’t have a verified size chart for this brand and category yet, so we won’t guess a target size from this label.” Offer **Measure the garment**, **Use body measurements**, or **Save for later**.
4. Keep the optional exact-catalog-garment route for cases where the shopper can identify the actual product and size.

The brand selection must therefore use `catalogBrands(targetCategory)`; the recommendation action must use `verifiedReferences(brand, ownedGarmentCategory, sizeSystem)`. These are intentionally different queries.

### Fit Passport / future-reference flow

The user may be adding a garment before they choose any target product. Use **brand → garment type → labelled size → how it fits**. Brand search is global/current-catalog plus “not listed”; type makes chart lookup precise. Persist one of two explicitly distinct records:

- `verified_category_size_reference`: only after a server validates the chart/reference ID, version, brand, category, size label, and compatible sizing system.
- `remembered_size_context`: shopper-reported brand/type/label/fit notes only. It helps prefill and choose the next question, but cannot by itself produce a recommendation.

## Non-negotiable guardrails

- Never construct generic “brand measurements” by averaging unrelated products or categories.
- Never replace an unavailable chart with a quiet cross-brand conversion from `M`, `8`, or `32`.
- Treat unavailable, stale, region-mismatched, category-mismatched, or incomplete chart data as **not verified** for recommendation purposes.
- Show all relevant catalog brands even when none is recommendation-eligible; the empty result should be a clear coverage message and a measurement path, not an empty brand picker.
- Version the original source/chart and only expose recommendation eligibility after server-side validation.

## Product acceptance criteria

1. For a live catalog jacket/dress target, the brand picker contains every active brand indexed for that target category, not just brands with reference data.
2. Selecting an unverified catalog brand is possible and leads to a truthful context-only state rather than a blank form or a guessed recommendation.
3. Selecting a verified brand and compatible labelled size allows the existing validated reference path.
4. An unknown external brand can be entered and stored as context; it cannot invoke the recommendation endpoint without an independently valid reference or measurements.
5. Tests exercise all three states: verified available, catalog-only unavailable, and external/not-listed.

## Limitation

Public Nordstrom pages establish the visible catalog/filter and size-guide patterns, but they do not publish a complete machine-readable mapping of every category brand to every current chart. The application must obtain its actual all-brand picker from its catalog index/feed and track chart ingestion/validation separately. Until such an ingestion exists, the accurate UI label is **“Brands in this category”**, not **“Brands with verified size data.”**
