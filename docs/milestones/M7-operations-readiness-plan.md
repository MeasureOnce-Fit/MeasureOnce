# M7 Operations Readiness Plan

## Release boundary

M7 covers a hosted portfolio demo with synthetic data. It does not promise retailer-level availability, security certification, scale, or business outcomes. Deployment remains a separate approval decision.

## Checks before deployment

| Area | Evidence required | Current status |
| --- | --- | --- |
| Environments | Local and hosted environment variable inventory; no secrets in client bundles | Local checks pass; hosted environment not verified here |
| Authentication | Sign-in, sign-out, expired session, account switching, and operator-role checks | Local operator sign-in verified; expiry and cross-browser checks pending |
| Tenant isolation | Northstar and Harbor reads/writes cannot cross tenant boundaries | Hosted synthetic isolation already verified; rerun as release smoke test |
| Data lifecycle | Export, correction, deletion, consent withdrawal, and non-identifying receipts | Existing M2 journeys cover the core flows; hosted rerun required |
| Catalog safety | Duplicate import, changed idempotency key, pending resume, under-review fallback | Contract and hosted seed checks pass |
| Failure behavior | Auth outage, database outage, timeout, malformed catalog, and unavailable fit coverage preserve manual shopping | Coverage-review fallback verified; injected outage checks pending |
| Accessibility | Keyboard flow, focus order, labels, zoom/reflow, and narrow viewport | Static UI checks exist; full hosted browser matrix pending |
| Operations | Error logs, request IDs, retention, quota monitoring, backup/export, restore, rollback | Plan only; no hosted evidence yet |

## Free-tier operating rules

- Keep all credentials and service-role keys server-side.
- Use synthetic accounts and fictional retailer/catalog data in the public demo.
- Set conservative request limits and document that the demo is not sized for production traffic.
- Do not enable paid upgrades, billing, external email, payment, or retailer production integrations as part of this milestone.
- Treat provider quota exhaustion as a safe failure: preserve browsing and manual size selection.

## Recovery rehearsal

Before a hosted release, record a database export or seed version, restore it into a disposable environment, run the catalog and identity smoke tests, and document the rollback command. The rehearsal must include a failed migration and an application version rollback. A file existing in the repository is not evidence that restore works.

## Release gates

1. Approve the hosting provider, environment ownership, retention, and free-tier limits.
2. Verify secrets are absent from client bundles and logs.
3. Run browser/auth/security/accessibility/integration smoke tests against the hosted URL.
4. Run restore and rollback rehearsals and retain their outputs.
5. Publish the demo with synthetic-data and capability limitations visible.

No deployment is authorized by this plan alone.
