# M2 Decision Brief: Identity and Durable Fit Profiles

**Status:** Approved for implementation on 18 September 2026. External Supabase and Google projects are not configured yet.

## Decision to make

M2 replaces the current simulated sign-in and browser-only profile storage with real authentication, server-side profiles, consent controls and retailer isolation. It gives later milestones a trustworthy identity boundary. It does not yet connect to a real retailer identity system; that verified retailer bridge belongs in M5.

## What a shopper can do when M2 is complete

- Continue as a guest without saving fit data.
- Sign into the MeasureOnce showcase with Google and retrieve the same profiles on another browser.
- Keep one self profile and optional additional member profiles, each selected explicitly by nickname.
- Save, edit and remove measurements, preferences and known-garment anchors only after agreeing to save them.
- Withdraw saving permission, export account data as JSON, delete one profile or delete the whole showcase account.
- Sign out and return without another shopper's data appearing.

A guest can still use fit recommendations. Account creation is optional. M2 therefore avoids blocking shopping while still making persistence useful.

## Recommended stack

Use **Supabase Auth and Postgres** with the existing Next.js application.

Why this is the recommended $0 option:

- One service provides Google authentication, Postgres, migrations and row-level security.
- Its free limits are more than enough for the six synthetic identities and portfolio traffic.
- Database-enforced ownership rules provide stronger evidence than hiding records in the interface.
- Both collaborators can work in the same Supabase project.

The free plan is appropriate for a portfolio and controlled pilot demonstration. It does not provide the SLA, resilient backups, enterprise SSO, advanced audit logs or support expected for a Macy's or Nordstrom production deployment. We will describe the result accurately as a secure pilot foundation.

## Identity model

| Actor | M2 behavior |
| --- | --- |
| Guest shopper | No Auth account and no durable Fit Passport. Recommendation inputs stay in the session. |
| Showcase shopper | Google OAuth through Supabase. May save profiles after explicit consent. |
| Synthetic shopper | Private seeded test identity used only in local/test and the controlled demo. Credentials never enter the public repository. |
| Retailer operator | Authenticated operator with an active membership in one fictional retailer. |
| Future embedded shopper | Reserved data boundary only. M5 will accept a verified, short-lived retailer assertion; MeasureOnce will never collect the retailer password. |

Public email/password login is excluded from M2. Supabase's default email service is restricted and unsuitable for a public launch without custom SMTP and a sending domain. Google OAuth plus guest use is the smallest honest free implementation.

## Retailer and profile boundaries

The showcase and each fictional retailer are separate tenants. A retailer ID, role or external customer ID supplied by the browser is never trusted as authorization.

Core records:

- `retailers`: one row per tenant, including the showcase.
- `principals`: the authenticated account linked to Supabase Auth.
- `retailer_memberships`: operator role and active status for one tenant.
- `fit_profiles`: self or additional member profile, owner, tenant, nickname, status and version.
- `profile_measurements`: original value/unit, normalized centimetres, region, method and source.
- `profile_preferences`: category-specific fit preferences.
- `fit_anchors`: exact known garment and size references.
- `consent_events`: append-only purpose, action, policy version and timestamp.
- `export_requests` and `deletion_requests`: idempotent rights-operation records.

Every private table receives least-privilege grants and row-level security. Shopper access requires both the authenticated owner and matching retailer. Operator access requires an active membership. Database constraints prevent a profile in retailer A from referencing records in retailer B.

## Additional member profiles

Use the neutral term **additional member profile**. The account owner supplies a nickname and confirms they have permission to store that person's fit details.

M2 will not collect the person's relationship, birth date, gender identity, photograph or contact information. Child profiles, invitations, shared ownership and another person's independent access remain outside M2 because they require separate privacy and control decisions.

## Consent, export and deletion

- The shopper must actively choose to save fit information. There are no preselected consent controls.
- Declining or withdrawing consent keeps recommendations usable but prevents future durable writes.
- Export produces deterministic JSON containing the owner's allowed profiles, measurements, preferences, anchors, consent history and request history.
- Profile deletion removes that profile's measurements, preferences and anchors.
- Account deletion removes every owned profile and related application data, then removes the Auth user.
- Proposed public promise: active profile data is removed immediately after a successful request and account deletion completes within 24 hours. We will not make a backup-deletion promise until a real backup policy exists.

## Synthetic test identities

M2 needs **six identities**, not dozens of accounts:

- Retailer A: shopper A1, shopper A2 and operator A.
- Retailer B: shopper B1, shopper B2 and operator B.

Shopper A1 owns a self profile plus two additional member profiles. Other shoppers cover isolation, incomplete data, edit, export, consent withdrawal and deletion. A1 and B1 intentionally use the same fictional external subject string to prove that tenant scoping prevents account merging.

Measurement diversity remains in reusable fit profiles and evaluation cases. More login accounts would add maintenance without improving fit coverage.

## Delivery sequence after approval

1. **Local Supabase foundation:** add pinned dependencies, configuration, migrations and deterministic seed/reset safeguards.
2. **Database authorization:** implement tables, composite tenant constraints, grants and row-level policies before building profile screens.
3. **Server sessions:** add Google PKCE callback, cookie-backed session refresh, safe redirects, sign-out and live-session checks for sensitive operations.
4. **Profile lifecycle:** connect the existing profile experience to authenticated server data; add explicit self/additional-member selection, save consent and optimistic-concurrency version checks.
5. **Rights operations:** implement JSON export, profile deletion, consent withdrawal and complete account deletion.
6. **Operator boundary:** add the minimum operator sign-in and retailer membership guard needed to prove isolation; the catalog console remains M5.
7. **Verification:** run clean reset, policy/API tests, route tests and browser journeys for all six identities, then record failures and evidence.

Before profile UI implementation, I will show the proposed account and profile-selector screens for review. The current storefront will not be silently redesigned as part of M2.

## Completion evidence

M2 is complete only when:

- A new shopper, returning shopper, cancelled OAuth flow and callback failure behave predictably.
- A returning shopper sees the same data in another browser.
- Guest activity and declined saving create no durable fit rows.
- Shopper A1 cannot read or modify A2, even through direct API calls or changed IDs.
- Retailer A and retailer B remain isolated, including the intentionally colliding external subject.
- Operators cannot cross retailer boundaries and shoppers cannot call operator actions.
- Self and additional member profiles never merge or copy evidence implicitly.
- Consent withdrawal blocks later saves until the shopper agrees again.
- Export includes only the owner's permitted data.
- Profile and account deletion remove dependent application data and cannot be partially undone by retries.
- A forged, expired or deleted-user session cannot read, export, delete or write profile data.
- A clean reset always creates exactly four shoppers, two operators and two retailers without duplicates.
- Typecheck, lint, production build, migration checks, row-policy tests, route tests and browser journeys pass.

## Risks and limits

- Supabase's SSR package is documented as beta, so the dependency must be pinned and session refresh/callback behavior tested.
- Free Supabase projects can pause after inactivity and do not provide an enterprise SLA or automatic recovery features.
- Google OAuth requires an external Google Cloud project, exact callback configuration and secrets management.
- Synthetic identities verify software behavior and security boundaries. They do not prove customer demand, real-world fit accuracy or enterprise readiness.

## Approval decisions

Approve or change these together before M2 coding begins:

1. **Provider:** Supabase Auth + Postgres.
2. **Public login:** Google OAuth; guest remains session-only; seeded credentials remain private.
3. **Retailer scope:** strict retailer isolation; cross-retailer profile sharing is deferred.
4. **Additional members:** adult additional member profiles with nickname and owner permission confirmation; no relationship field.
5. **Deletion promise:** active profile removal immediately; account deletion within 24 hours; no backup claim yet.
6. **Export:** JSON in M2.
7. **Operators:** one retailer-admin fixture per fictional retailer.
8. **Environment owner:** identify which collaborator will own the Supabase and Google Cloud projects and invite the other collaborator.

Research and source details are in `docs/research/m2-identity-and-profile-plan.md`.
