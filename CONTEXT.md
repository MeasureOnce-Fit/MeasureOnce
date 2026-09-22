# MeasureOnce Fit Context

MeasureOnce represents the evidence needed to compare a shopper's fit needs with the measured characteristics of a specific garment variant across brands.

## Language

**Shopper Account**:
The authenticated security boundary through which a shopper owns and controls zero or more fit profiles.
_Avoid_: Customer profile, body profile

**Fit Profile**:
Measurements, garment references, regional observations and category-specific preferences for one person.
_Avoid_: Account, body type

**Owner Profile**:
The fit profile the account owner uses for themself.
_Avoid_: Primary body

**Additional Member Profile**:
A fit profile the account owner selects when shopping for another person; it does not require or infer a relationship type.
_Avoid_: Partner profile, husband profile, dependent

**Fit Evidence**:
Versioned information used for a recommendation, including measurements, garment references, observations, preferences and relevant garment data.
_Avoid_: User data, AI knowledge

**Body Measurement**:
A measurement taken on the profile subject using a named method and unit.
_Avoid_: Garment measurement, size

**Garment Measurement**:
A measurement taken from a specific garment variant using a named method and unit; laid-flat width and circumference are distinct measurement kinds.
_Avoid_: Body measurement, size-chart value

**Size Designation**:
A brand-facing label such as S, M, 8 or W32 associated with a garment variant. It is an identifier, not a measurement.
_Avoid_: Measurement, universal size

**Size System**:
The brand-, market- and category-specific structure that defines valid size labels, their order, optional axes and modifiers.
_Avoid_: Gender size, universal chart

**Size Axis**:
One independently selectable dimension of a size designation, such as waist and inseam in `W28 × L30` or base size and length in `8 Petite`.
_Avoid_: Garment measurement

**Size Equivalence Group**:
An optional brand-, market- and category-specific display mapping that relates distinct sellable sizes to a broader label, such as women's `0` and `2` both mapping to `XS`. It can also record market-specific equivalents. The underlying variants and measurements remain separate.
_Avoid_: Universal size conversion, merged size

**Garment Variant**:
One product style in a specific size and relevant construction configuration, carrying the garment evidence used for comparison.
_Avoid_: Product, size label

**Category Size Reference**:
A verified brand- and clothing-category-specific size designation whose published size-chart evidence has been normalized using declared measurement methods. It may support a recommendation without requiring the shopper to identify an exact product style.
_Avoid_: Universal brand size, exact garment, remembered size

**Remembered Size Context**:
A shopper-reported brand, clothing category, size designation and regional fit description that is not linked to verified measurements. It may be saved as fit history but cannot independently produce a recommendation.
_Avoid_: Garment measurement, verified size reference, recommendation evidence

**Fit Preference**:
The profile subject's desired feel or silhouette for a garment category or fit region.
_Avoid_: Body shape, recommended size

**Regional Observation**:
An independent description of how a known garment fits at one region, such as waist tight while length is right.
_Avoid_: Overall fit score

**Recommendation**:
A versioned decision for a specific fit profile and garment style that returns one size, an adjacent-size trade-off, or a safe state, together with the evidence and regional reasons used.
_Avoid_: Prediction without evidence, universal size

**Safe State**:
A non-size result used when evidence is insufficient, inconsistent, unsupported or no available size satisfies the defined constraints.
_Avoid_: Error, failed recommendation

**Synthetic Fixture**:
A clearly fictional, versioned profile or garment record created to test controlled behavior.
_Avoid_: Customer data, validated fit result

**Evaluation Case**:
A reproducible combination of fit profile, garment variant, preference and expected result used to assess defined product behavior.
_Avoid_: Account, real-world trial
