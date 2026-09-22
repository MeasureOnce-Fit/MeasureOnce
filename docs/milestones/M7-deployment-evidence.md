# M7 deployment evidence

## Hosted demo

- Production URL: `https://measureonce-prototype.vercel.app`
- Hosting: Vercel free project
- Data: existing hosted Supabase project, synthetic fixture data only
- Environment: Supabase public/server configuration and retailer identity session configuration are stored in Vercel environment variables; no secret values are recorded here.

## Completed checks

| Check | Evidence | Result |
| --- | --- | --- |
| Public route smoke | `/`, `/fit-passport`, `/retailer-demo`, `/retailer-console`, `/m6-review` | HTTP 200 |
| Signed-out protected routes | `/api/profiles`, `/api/operator/catalog` | HTTP 401 |
| Invalid application session | Production `/api/profiles` with a malformed `__Host-measureonce_session` cookie | HTTP 401 |
| Expired application session | Production `/api/profiles` with a correctly signed but already-expired session cookie | HTTP 401 |
| Fit Passport journey | Hosted browser-cookie session plus profile data flow | Passed through `npm run verify:m2-journey` with `M2_APP_URL` set to the production URL |
| Independent shopper sessions | Separate production cookie jars for Shopper A1 and Shopper A2 | Passed; profiles remain isolated |
| Tenant isolation | All 4 synthetic shoppers and 2 synthetic operators | Passed through `npm run verify:m2-live` |
| Synthetic lifecycle | Consent, temporary additional-member create/update/export/delete, saved recommendation | Passed; cleanup completed |
| Core regression | Lint, typecheck, fit, identity, retailer identity/repository/catalog suites | Passed before deployment |
| Evaluation artifact | `npm run eval:m6` | Refreshed; `baseline_only`, synthetic |

## Synthetic-fixture repair

The live isolation check exposed an older operator account with a stale test password. The M2 seed routine now resets existing fictional fixture accounts to the configured synthetic seed password as part of idempotent provisioning. Re-seeding returned 2 retailers, 6 identities, and 6 profiles; all six isolation scenarios then passed.

## Not yet evidenced

- A third-party-auth outage simulation in production. The application has local coverage for its unavailable state, but production configuration was not intentionally broken.
- Visual persistence across two separate browser applications. Independent production cookie-jar sessions passed, which verifies server-side session isolation but is not a substitute for that UI check.
- A restore rehearsal in a disposable Supabase project.
- A Vercel rollback rehearsal.
- Load, quota, observability, and availability evidence beyond this synthetic portfolio demo.

These remain release-readiness gaps, not evidence of physical-fit accuracy or retailer-scale production readiness.
