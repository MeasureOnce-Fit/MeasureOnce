# MeasureOnce M6 baseline evaluation

Generated: 2026-09-19T22:25:09.320Z

Status: **baseline only · synthetic**

This report measures deterministic software behaviour. It does not measure physical fit accuracy or business impact.

## Dataset

| Field | Value |
| --- | ---: |
| Synthetic brands | 10 |
| Styles | 200 |
| Variants | 2028 |
| Base profiles | 24 |
| Profile/preference cases | 72 |
| Generated executions | 618 |

## Mechanical evidence

- Catalog validation: **passed**
- Contract cases: **44/44 passed**
- Contract review status: **awaiting collaborator signoff**
- Learned model: **not evaluated**
- Probability calibration: **not evaluated**

## State-level comparator slice

These comparators score expected result states only. They do not score the exact sellable size or physical fit.

| System | State agreement | Recommendation coverage | Conditional state agreement |
| --- | ---: | ---: | ---: |
| MeasureOnce deterministic engine | 100.0% | 86.4% | 100.0% |
| Always-answer RECOMMENDED baseline | 84.1% | 100.0% | 84.1% |

Exact sellable-label agreement on 38 reviewed cases: **100.0%** for MeasureOnce versus **0.0%** for the middle-label prior. This is synthetic contract evidence, not physical-fit accuracy.

Held-out split manifest: 20 styles in brand holdout; 20 styles in style holdout. Reviewed-case slice: **11 cases**, state agreement **100.0%**. This slice is small because the current literal review set was not designed as a power-calculated held-out sample.

Category slices (state agreement): Men · Denim 3 cases/100.0% · Men · Knitwear 2 cases/100.0% · Men · Outerwear 2 cases/100.0% · Men · Shirts & Tees 2 cases/100.0% · Men · Shorts 2 cases/100.0% · Men · Sweatshirts 2 cases/100.0% · Men · Tailoring 2 cases/100.0% · Men · Trousers 2 cases/100.0% · Women · Denim 10 cases/100.0% · Women · Dresses 2 cases/100.0% · Women · Knitwear 2 cases/100.0% · Women · Outerwear 2 cases/100.0% · Women · Shorts 2 cases/100.0% · Women · Skirts 2 cases/100.0% · Women · Tailoring 2 cases/100.0% · Women · Tops 3 cases/100.0% · Women · Trousers 2 cases/100.0%

## Interpretation boundary

All values are synthetic. This artifact does not support claims about physical fit, return reduction, conversion, margin, or production readiness.
