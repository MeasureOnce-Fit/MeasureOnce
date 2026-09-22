# MeasureOnce M1 Fit Evaluation

Generated: 2026-09-18T14:10:40.043Z

## Dataset and validation

| Check | Result |
| --- | ---: |
| Synthetic brands | 10 |
| Source styles | 200 |
| Size variants | 2028 |
| Data-only comparison fixtures | 6 |
| Navigation categories | 11 |
| Department/category pairs | 17 |
| Base profiles | 24 |
| Profile/preference cases | 72 |
| Source size positions traced | 1200 |
| Catalog validation | Passed |

## Generated coverage

612 profile/preference/category executions and 6 executable sparse-category comparisons completed (618 total).

| Result state | Count |
| --- | ---: |
| RECOMMENDED | 218 |
| TRADEOFF | 71 |
| INSUFFICIENT_PROFILE_EVIDENCE | 0 |
| INSUFFICIENT_GARMENT_EVIDENCE | 0 |
| CONFLICTING_EVIDENCE | 0 |
| NO_SUITABLE_SIZE | 329 |
| UNSUPPORTED | 0 |

## Contract fixtures

44 of 44 contract fixtures passed.

Review status: **awaiting collaborator signoff**. Each approval is bound to the reviewed case fingerprint. Decisions saved in the M1 review dashboard are stored directly in the project and read by this evaluation; a collaborator must approve every current fingerprint with their name and review date.

## Interpretation boundary

- All garment geometry, shopper profiles and expected outcomes are synthetic.
- The report verifies deterministic software behavior against declared rules; it does not measure real-world fit accuracy or commercial impact.
- The 44 contract fixtures require collaborator sign-off before they can be called an independently reviewed benchmark.
