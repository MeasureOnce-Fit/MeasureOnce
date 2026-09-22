# M2 verification report

Verification date: 18 September 2026

## Implemented

- MeasureOnce three-screen visual review, including the revised torn-paper hero collage with separate women’s and men’s garments.
- Retailer-signed assertion exchange and short-lived host-only application session.
- Retailer-scoped Fit Passport schema, private identity mapping, consent history and durable replay protection.
- Atomic profile creation and replacement, database-derived centimetre normalization, and Fit Passport-only deletion.
- Protected profile collection/detail, consent, account export and Fit Passport deletion HTTP routes.
- Working `/fit-passport` client connected to the protected routes, with create, view, rename, remove, consent, export and Fit Passport deletion controls.
- Showcase account bridge: a verified Supabase retailer login can be exchanged for the same host-only application session used by protected Fit Passport APIs; caller-supplied retailer and principal identifiers are rejected.
- A development-only `/fit-passport?preview=ready` state with visibly labelled fictional in-memory data for portfolio review; it does not simulate persistence.

## Local evidence

- Fit engine: 22/22 tests passed.
- Identity service and protected HTTP layer: 66/66 tests passed.
- Atomic Supabase repository contract: 4/4 tests passed.
- Retailer assertion/session contract: 60/60 tests passed, including four showcase-account bridge cases.
- Synthetic seed/environment contract: 9/9 tests passed with current publishable/secret key names and temporary legacy aliases.
- Static database migration contract passed for 13 RLS-protected tables.
- ESLint, TypeScript typecheck and the Next.js production build passed.
- The production build includes dynamic profile, consent, export, deletion and retailer-session routes.
- The working Fit Passport was visually inspected at desktop and mobile sizes. The add-person dialog opened and closed through accessible controls and the browser console reported no errors or warnings.
- A hosted Supabase Free project was configured with the two M2 migrations. The private schema and only the five required server functions were enabled through the Data API; no private tables were exposed.
- The live synthetic seed created 2 retailers, 6 identities and 6 profiles. The hosted isolation verifier passed for all six accounts, including a same-subject cross-retailer collision case.
- The repeatable `npm run verify:m2-journey` check passed against the running application and hosted database. Shopper A1 saw three profiles, shopper A2 saw one, and A2 completed create, rename, export and delete for a temporary additional-member profile without changing A1.
- The normal `/fit-passport` route was visually inspected after hosted configuration and displayed the retailer-account sign-in form without a separate Fit Passport password.
- Approved mock, final captures and side-by-side evidence are recorded in `design-qa.md` and `artifacts/design-qa/`.

## Not yet verified

- PostgreSQL policy execution and pgTAP against a running Supabase project. Docker and the Supabase CLI are unavailable in this workspace.
- Real retailer assertion exchange with externally managed keys.
- Cross-browser UI persistence, expired-session behavior and provider-outage behavior.
- External retailer assertion exchange with a real retailer identity provider. The hosted showcase account bridge is verified with synthetic Supabase accounts.
- Real-world fit accuracy. Current product, garment and shopper data are synthetic.

M2 now has a hosted, repeatable persistence and account-isolation proof for the synthetic showcase environment. It is not yet production-ready because executable pgTAP policy coverage, external retailer identity integration, cross-browser UI coverage, expired-session handling and provider-outage behavior remain unverified.
