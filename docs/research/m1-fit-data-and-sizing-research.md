# M1 fit data and sizing research

Research date: 2026-09-17  
Scope: evidence for the MeasureOnce M1 measurement contract, synthetic garment records, deterministic baseline and software evaluation. This note does not claim real-world fit accuracy.

## Conclusions for the M1 decision

1. **Keep body measurements and garment measurements as different data types.** ISO 8559-1 defines anthropometric measurements for apparel work, while ISO 8559-2:2025 defines clothing size designations from body measurements. UNIQLO separately exposes body dimensions and actual finished-product measurements and warns that finished measurements vary by design. A size label is therefore not a garment dimension. ([ISO 8559-1:2017](https://www.iso.org/standard/61686.html), [ISO 8559-2:2025](https://www.iso.org/standard/85590.html), [UNIQLO size help](https://faq-us.uniqlo.com/articles/en_US/Knowledge/How-can-I-figure-out-my-size/), [UNIQLO measurement guide](https://faq-us.uniqlo.com/articles/en_US/FAQ/How-to-Measure))
2. **Store source values and units, then normalize for calculation.** NIST states that one international inch is exactly 25.4 mm, so `cm = in × 2.54`. M1 should preserve the submitted value/unit, normalize to one internal unit without early rounding, and round only for display. ([NIST SI length](https://www.nist.gov/pml/owm/si-units-length))
3. **Do not create a universal ease table.** The public abstract for the superseded ISO 8559-2:2017 explicitly said garment allowances are chosen by designers/manufacturers for position of wear, style, cut and fashion. The current 2025 edition is paywalled, so its detailed tables were not inspected. UNIQLO likewise says actual product dimensions and fit can vary for products carrying the same size. MeasureOnce must version synthetic fit rules by category and style rather than present them as an industry standard. ([ISO 8559-2:2017 abstract](https://www.iso.org/standard/64075.html), [UNIQLO size help](https://faq-us.uniqlo.com/articles/en_US/Knowledge/How-can-I-figure-out-my-size/))
4. **Length and circumference need independent evidence.** Levi's separates waist/hip/thigh from inseam for bottoms and chest/waist/hip for tops and dresses. The recommendation result should therefore be able to say “waist tight, length suitable” rather than collapse every region into one size score. ([Levi's size guide](https://www.levi.com/US/en_US/info/sizeguide))
5. **A production-like contract needs identity, availability and provenance as well as dimensions.** Fit Analytics requires consistent product/color/size identifiers, available sizes, size system, country/language and matching values across product and order data. True Fit says its Shopify recommendation input includes catalog and order data, with returns optional but encouraged for improvement and reporting. M1 can simulate these fields, but they should be present and versioned. ([Fit Analytics integration documentation](https://developers.fitanalytics.com/about-fit-finder/), [True Fit Shopify data requirements](https://help.truefit.com/app-data-requirements))

## What the sources establish

### Body versus garment measurements

- ISO 8559-1:2017, confirmed current in 2026, supplies anthropometric definitions and measurement principles for apparel-oriented body datasets. The full 80-page standard is paid; only the official abstract was reviewed.
- ISO 8559-2:2025 is the current size-designation standard and bases size designation on body measurements defined through ISO 8559-1. Its full 41-page text is paid; only the official abstract was reviewed.
- An ISO-published case-study PDF reproduces an extract from the older 2017 edition. In that extract, a men's jacket uses chest girth as the primary dimension with height, waist girth and shoulder width as secondary dimensions; a women's jacket uses bust girth with height, waist and hip girths. It also shows suit examples combining upper-body dimensions with height and inside-leg length. This is useful evidence for separating regions, but it is not a substitute for the current paid standard. ([ISO case-study extract](https://www.iso.org/files/live/sites/isoorg/files/store/en/PUB100491.pdf))
- UNIQLO calls product-size values measurements of the actual product, distinguishes them from body dimensions, offers centimetres and inches, and notes that fit can vary even when label size is the same.

### Category-relevant measurement points

The following is a **MeasureOnce M1 field proposal**, not a claim that these are the only valid measurements or universal sizing rules. It combines the accessible ISO evidence with current first-party retailer measurement guides. “Body evidence” and “garment evidence” must remain separate in the schema.

| Current catalog category | Proposed body evidence | Proposed synthetic garment evidence | Source basis and caution |
|---|---|---|---|
| Dresses | bust/chest girth, waist girth, hip/seat girth; height when length matters | chest/bust, waist and hip circumferences or documented flat widths; shoulder, body length; sleeve length when present | Levi's uses chest, waist and hip for dresses. Style determines which regions constrain fit. |
| Tops | chest/bust; waist and hip when the silhouette crosses those regions | chest/bust width or circumference, shoulder width, body length, sleeve length when present | Levi's tops use chest, waist and hip; ISO jacket evidence also includes shoulder/height. |
| Shirts & Tees | chest/bust; neck for collared shirts; waist/hip as style requires | chest width/circumference, neck, shoulder, body length, sleeve length | Levi's men's tops expose neck, chest, waist and seat. A tee should not require a collar measurement merely because a shirt does. |
| Knitwear | chest/bust; waist/hip as silhouette requires; sleeve/height where length matters | chest width/circumference, shoulder, body and sleeve length, plus explicit material/stretch attributes | Source evidence supports the measurement regions; no sourced universal knit stretch allowance was found. |
| Sweatshirts | chest/bust; waist/hip as silhouette requires; sleeve/height where length matters | chest width/circumference, shoulder, body and sleeve length, plus fit/cut and stretch attributes | Treat intended oversized, regular or close cut as product metadata, not as a size-label inference. |
| Outerwear | chest/bust, waist, hip/seat, shoulder width, height; layering preference | chest/bust, waist, hip, shoulder, body length, sleeve length; intended layering/cut | ISO's accessible jacket example uses chest/bust plus height, waist, hip and/or shoulder by sector. Layering allowance is brand/style data, not universal. |
| Tailoring | chest/bust, waist, hip/seat, shoulder, height; inside leg for trouser components | jacket chest/waist/shoulder/body/sleeve; trouser waist/hip/rise/inseam | ISO's accessible suit examples combine upper-body dimensions with height and inside leg. Split-piece sizing must stay possible. |
| Trousers | waist, hip/seat, thigh, inseam or desired length | waist, hip/seat, thigh, rise, inseam, leg opening; stretch/cut | Levi's defines body waist, seat/hip, thigh and inseam independently. Rise/leg opening describe product shape and need product measurement conventions. |
| Denim | waist, hip/seat, thigh, inseam or desired length | waist, hip/seat, thigh, rise, inseam, leg opening; stretch/cut | Levi's identifies distinct skinny, slim, regular, relaxed and other fits and calls out stretch denim; these are style attributes, not interchangeable label sizes. |
| Shorts | waist, hip/seat, thigh; desired length | waist, hip/seat, thigh, rise and inseam/outseam; leg opening | Derived from bottom-region evidence; length is independently evaluated. No universal shorts ease was found. |
| Skirts | waist, hip/seat; desired garment length | waist and hip/seat, garment length; sweep/opening and stretch when relevant | ISO identifies skirts as a garment type with primary/secondary body dimensions, but the current table is paywalled. The exact silhouette controls which dimensions matter. |

Measurement names alone are insufficient. Each field needs a method identifier or definition, because “waist,” flat garment width and garment circumference are not interchangeable. M1 should reject or quarantine records whose measurement basis is unknown.

## Brand, style, material and size-label variation

- ISO notes that different company sizing systems can assign different size designations to people with identical or very similar body measurements. ([ISO case-study PDF](https://www.iso.org/files/live/sites/isoorg/files/store/en/PUB100491.pdf))
- UNIQLO states that product measurements are actual-product measurements, that products with the same label size can fit differently, and that fabric characteristics can introduce measurement variation. It also changed women's body-measurement charts for its Fall/Winter 2025 lineup without changing finished product dimensions, illustrating why size-chart versions and garment records need independent histories. ([UNIQLO size help](https://faq-us.uniqlo.com/articles/en_US/Knowledge/How-can-I-figure-out-my-size/), [UNIQLO measurement guide](https://faq-us.uniqlo.com/articles/en_US/FAQ/How-to-Measure))
- Patagonia describes its size-chart values as body measurements, says product inseam can vary, and treats named fit types as the intended relationship between garment and body. ([Patagonia men's size and fit guide](https://www.patagonia.com/guides/size-fit/mens/))
- Levi's distinguishes skinny, slim, regular and relaxed fits and lists stretch denim as a comfort/flexibility consideration. These first-party examples support explicit `brand`, `style`, `cut`, `material/stretch`, `size_system` and `measurement_version` fields. They do not establish general numerical tolerances. ([Levi's product size guide](https://help.levi.com/hc/en-us/articles/360025097092-Levi-s-Product-Size-Guide))

## M1 data-contract implications

The synthetic garment record should include, at minimum:

- fictional retailer, brand, style, color and size-level identifiers;
- catalog category and more specific garment subtype;
- label size and size system, stored separately from dimensions;
- availability for every size;
- each dimension's name, value, unit, basis (`body_target`, `garment_circumference`, or `garment_flat_width`), measurement method/version and provenance;
- cut/fit descriptor, composition or stretch class, and which regions the style is intended to constrain;
- effective dates or version identifiers so a recommendation can be replayed;
- a validity state for incomplete, ambiguous or conflicting garment evidence.

The shopper-side measurement record should likewise preserve profile ownership, input path, original value/unit, normalized value, measurement method, timestamp and any category-specific preference. A saved additional-member profile should be generic; spouse/partner labels are optional user-provided relationship labels rather than a separate profile type.

Fit Analytics' public contract demonstrates why size labels must match across the product page, product feed and order record, why two-dimensional sizes such as width/length combinations must be represented explicitly, and why availability and size-system changes are first-class inputs. M1 need not implement the retailer widget, but its underlying records should not block that later contract.

## Synthetic evaluation boundaries

- Use reproducible generators with recorded seeds and schema versions.
- Keep the synthetic garment generator, synthetic shopper generator and expected-answer fixtures logically separate. A small set of worked examples should have expected regional outcomes reviewed independently from the implementation.
- Exercise category, brand, style, unit, missing-data and boundary interactions. NIST SP 800-142 supports combinatorial testing for faults caused by interactions among a small number of parameters; it does not turn a synthetic test matrix into evidence of population coverage or real garment fit. ([NIST SP 800-142](https://csrc.nist.gov/pubs/sp/800/142/final))
- If a learned model is later compared with the deterministic baseline, split the data before preprocessing or tuning and keep the held-out set out of model decisions. Scikit-learn's official guidance explains that test-data leakage produces overly optimistic estimates. ([scikit-learn common pitfalls](https://scikit-learn.org/stable/common_pitfalls.html))
- Report software metrics with precise names: unit-equivalence pass rate, rule/constraint agreement on reviewed fixtures, recommendation coverage, abstention rate, deterministic replay and latency. Do not label any of these “real-world fit accuracy.”
- Synthetic purchase/return events can verify event flow and reporting calculations. They cannot establish conversion lift, return reduction, user preference or willingness to pay.

## Evidence gaps M1 must expose rather than hide

- The current ISO category-specific tables and detailed measurement procedures are paid; this research did not inspect their protected full text.
- No primary source found establishes a single universal ease allowance, stretch adjustment, or correct score threshold across these categories.
- Retail size guides describe their own products. They are examples of production measurement practice, not neutral universal standards.
- A fictional brand matrix can demonstrate cross-brand logic only when its generation rules, versions and provenance are visible. It cannot be presented as measurements of real brands.
- Physical fit, comfort, drape, movement, wash change and consumer outcomes remain unvalidated until real garments and participants are available.

## Primary sources

- ISO 8559-1:2017: https://www.iso.org/standard/61686.html
- ISO 8559-2:2025: https://www.iso.org/standard/85590.html
- ISO public case-study extract from ISO 8559-2:2017: https://www.iso.org/files/live/sites/isoorg/files/store/en/PUB100491.pdf
- NIST SI length: https://www.nist.gov/pml/owm/si-units-length
- UNIQLO, How can I figure out my size?: https://faq-us.uniqlo.com/articles/en_US/Knowledge/How-can-I-figure-out-my-size/
- UNIQLO, How to Measure: https://faq-us.uniqlo.com/articles/en_US/FAQ/How-to-Measure
- Levi's size chart and guide: https://www.levi.com/US/en_US/info/sizeguide
- Levi's product size guide: https://help.levi.com/hc/en-us/articles/360025097092-Levi-s-Product-Size-Guide
- Patagonia men's size and fit guide: https://www.patagonia.com/guides/size-fit/mens/
- True Fit Shopify data requirements: https://help.truefit.com/app-data-requirements
- Fit Analytics integration documentation: https://developers.fitanalytics.com/about-fit-finder/
- NIST SP 800-142, Practical Combinatorial Testing: https://csrc.nist.gov/pubs/sp/800/142/final
- scikit-learn, Common pitfalls: https://scikit-learn.org/stable/common_pitfalls.html
