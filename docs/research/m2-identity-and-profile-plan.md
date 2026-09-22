# M2 identity and durable-profile decision plan

Research checked: 18 September 2026. Status: proposal for approval; no M2 implementation is claimed.

## Starting facts

- The current Next.js interface only simulates sign-in and saves profile state in the browser. M2 must replace that behavior with server-validated identity and durable storage.
- MeasureOnce is a fit service embedded in a retailer's shopping system, plus a standalone multi-brand showcase. A shopper already signed into a retailer should not create a second MeasureOnce password.
- The US is the first market. All people, retailers and fit data used in M2 are fictional. The test set is four shopper identities and two retailer-operator identities across two fictional retailers. A shopper account can own more than one explicitly selected fit profile.
- Two collaborators and a $0 service budget are confirmed. A free stack can support a public portfolio and controlled pilot demonstration; it cannot support an honest enterprise-production claim.

## Provider decision

| Option | Relevant verified facts | Assessment |
|---|---|---|
| **Supabase Auth + Postgres** | Free currently includes two active projects, 50,000 MAU, 500 MB database per project, social OAuth, anonymous sign-in, and unlimited dashboard team members. Free projects can pause after one week of inactivity; automatic backups, point-in-time recovery, SAML SSO, configurable session timeouts, platform audit logs, an SLA and email support are absent. | **Recommend for M2.** One provider supplies identity, Postgres, migrations and database-enforced row security, which is the smallest credible stack for two builders. |
| Clerk + a separate database | Clerk Hobby currently includes three dashboard seats, 50,000 retained users per app and basic organizations, but a separate database and authorization mapping would still be required. | Feasible, but adds a second identity/tenant source and webhook reconciliation without solving the database requirement. |
| Auth.js + hosted Postgres | Avoids an identity SaaS dependency but leaves more session, account-linking, invitation, recovery and security work with the two-person team. | Reasonable later if portability outweighs delivery speed; not the smallest M2 solution. |

Official references: [Supabase pricing and Free limits](https://supabase.com/pricing), [Supabase billing](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Clerk pricing](https://clerk.com/pricing).

### Recommended identity paths

1. **Showcase shopper:** Google OAuth through Supabase for a persistent real account. The Google configuration requires a Google Cloud project, OAuth client, exact authorized origin/callback configuration and a client secret. Use only `openid`, email and basic profile scopes. [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
2. **Guest:** no saved Fit Passport. Guest recommendations remain session-only. Do not create anonymous Auth users in M2; Supabase notes that anonymous users occupy database records, require abuse protection and have no automatic cleanup. [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
3. **Synthetic test identities:** create four shoppers and two retailer operators only in local/test and the controlled demo environment through a server-side admin seed command. Supabase's admin user creation must remain server-side and must never expose the secret key. These credentials are fixtures, not public demo passwords. [Supabase admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
4. **Retailer-integrated shopper:** defer the real identity bridge to M5, but reserve the M2 data boundary. The retailer authenticates the shopper and later sends MeasureOnce a verified short-lived assertion containing a retailer-scoped opaque subject. MeasureOnce stores no retailer password.
5. **Retailer operator:** signs into the MeasureOnce operator surface and must also have an active membership in exactly one seeded retailer for M2. Application roles live in database membership records, rather than editable user metadata.

Do not use email/password as the public launch path under the strict $0 constraint. Supabase's default SMTP only delivers to pre-authorized project-team addresses, is limited to two messages per hour and has no delivery SLA; a real email flow requires custom SMTP and a sending domain. [Supabase SMTP limits](https://supabase.com/docs/guides/auth/auth-smtp)

## Tenant and ownership model

Use internal UUIDs. A browser-provided `retailer_id`, role or external customer ID is never authority.

| Boundary | Proposed record and rule |
|---|---|
| Retailer | `retailers`; the showcase is its own tenant. The two fictional retailer tenants remain isolated even if their external subject strings collide. |
| Authenticated actor | `principals` references `auth.users`. It identifies the authenticated account, not the person whose measurements are stored. |
| Operator authorization | `retailer_memberships(retailer_id, principal_id, role, status)`. RLS checks the active membership row for every operator access. |
| Future retailer identity | `external_identities(retailer_id, issuer, subject_digest, principal_id)`, unique on retailer + issuer + digest. Raw retailer passwords and emails are outside the contract. |
| Fit subject | `fit_profiles(id, retailer_id, owner_principal_id, profile_type, nickname, status, version)`. `profile_type` is `self` or `additional_member`; no relationship label such as spouse is required. |
| Fit evidence | `profile_measurements`, `profile_preferences`, and `fit_anchors` reference `profile_id` and repeat `retailer_id` for enforceable tenant checks. Preserve entered value/unit separately from normalized centimetres. |
| Permission | Append-only `consent_events` record purpose, action, policy version and timestamp. Current permission is derived or transactionally materialized. No save occurs before an affirmative action. |
| Rights operations | `export_requests` and `deletion_requests` are server-created workflow records. Completed deletion retains only a non-identifying operation receipt; it must not retain measurements. |

Every exposed table gets least-privilege grants and RLS. Shopper policies require both the authenticated owner and matching retailer. Operator policies require an active retailer membership and the required role. The secret key stays in server-only code because it bypasses RLS. Supabase explicitly requires both grants and policies and warns never to expose the secret key. [RLS and grants](https://supabase.com/docs/guides/database/postgres/row-level-security), [API key safety](https://supabase.com/docs/guides/getting-started/api-keys)

The service must test isolation at the database/API layer, not only hide buttons. Policies must cover `select`, `insert`, `update` and `delete`, plus every callable database function. Foreign keys and composite constraints must prevent a profile in retailer A from referencing an anchor or owner in retailer B.

## Profile, consent, export and deletion behavior

- The account owner gets one `self` profile and may add explicitly named **additional member profiles**. Use a nickname only; do not collect relationship, birth date, gender identity, photos or contact information in M2.
- Selecting a profile is explicit on every fit flow. Never infer a member from the product department or silently merge two profiles.
- Saving an additional member profile requires the owner to confirm they have permission to store that person's fit details. This is a product safeguard, not legal proof of consent. Child profiles and member-owned/shared access remain out of M2 pending a separate policy decision.
- A user can correct or remove any measurement, anchor or preference and can revoke future persistence. Revocation changes future writes immediately; it does not misrepresent historical recommendations as never having occurred.
- Account export is a server-generated JSON file containing the owner's profiles, original and normalized measurements, preferences, anchors, consent history and rights-request history. It excludes other tenants' data, operator-only data, secrets and proprietary garment measurements.
- Profile deletion hard-deletes that profile's measurements, preferences and anchors. Showcase-account deletion deletes all owned profiles, related application data, then the Auth user. Supabase documents that deleting an Auth user invalidates refresh tokens but an already issued stateless access token can remain valid until expiry; sensitive delete/export/profile-write routes must therefore verify that the JWT `session_id` still exists. [Supabase user deletion](https://supabase.com/docs/guides/auth/managing-user-data)
- M2 must publish a concrete retention promise only after the team chooses it. The free plan has no automatic backups, so “deleted from backups within N days” cannot be asserted until the actual backup/export process is defined.

## Synthetic seed and reset

Seed exactly six Auth identities and deterministic app records:

- Retailer A: shopper A1 (self plus two additional-member profiles), shopper A2 (isolation/consent-deletion), operator A.
- Retailer B: shopper B1 using the same fictional external subject string as A1 to test tenant scoping, shopper B2 (incomplete/edit/export), operator B.

One account can exercise many measurement and category scenarios; do not create more logins to simulate more body profiles. Use reserved fictional addresses under a non-deliverable example domain locally; for a hosted controlled test, keep the login values in a private secret store and never commit or publish them.

Migrations and a deterministic seed are versioned. `supabase db reset` recreates local state from migrations and the seed. A remote reset is permitted only for an explicitly disposable test project and never for a production project; Supabase documents that `db reset --linked` drops the linked remote schema. [Supabase local workflow](https://supabase.com/docs/guides/local-development/cli-workflows)

Seed requirements: fixed IDs where tests require them, idempotent app-data upserts, no generated real-looking PII, clear `synthetic=true` tagging, an environment allow-list, and a confirmation guard before any destructive remote reset.

## Authentication journeys in M2

1. New showcase shopper chooses Google, completes the PKCE callback, sees the consent invitation, and can create or skip a saved profile.
2. Returning shopper signs in on another browser and retrieves the same server-stored profiles.
3. Guest completes a session-only recommendation and is told that it will not persist.
4. Shopper switches explicitly between self and additional-member profiles, edits a profile, exports it, deletes a profile, withdraws saving permission, signs out and deletes the account.
5. Retailer operator signs in and reaches only the operator surface for the retailer in their active membership.
6. Invalid, forged, expired, deleted-user and wrong-tenant sessions are rejected server-side.

For Next.js, use cookie-backed Supabase SSR with PKCE. Supabase's `@supabase/ssr` package is officially recommended but documented as beta, so pin the dependency and cover callback/refresh behavior with tests. [Supabase server-side Auth](https://supabase.com/docs/guides/auth/server-side)

## M2 acceptance tests

M2 is complete only when all of these pass locally and against the hosted test project:

### Identity and session

- Google OAuth new, returning, cancelled and callback-error flows behave predictably; `next` accepts only a safe relative path.
- Sign-out removes the active session. A forged token and an expired token receive `401`.
- A deleted user's still-unexpired JWT cannot export, delete or write a profile because the live `session_id` check fails.
- Four shopper and two operator fixtures can authenticate through the supported test path; no credentials appear in Git, logs or browser bundles.

### Ownership and retailer isolation

- Shopper A1 can CRUD their own profiles and sees the same saved version in a separate browser.
- Shopper A1 cannot read or mutate A2 through the UI, a direct Data API request, changed IDs or a crafted retailer ID.
- No shopper can reach operator records or actions.
- Operator A can access authorized Retailer A records and cannot access Retailer B; Operator B has the inverse result.
- The deliberately colliding external subjects in Retailers A and B resolve to different principals and never merge.
- Cross-retailer profile, anchor and measurement foreign keys fail.
- A policy test matrix covers every operation on every private table and each exposed function.

### Profile and consent lifecycle

- Self and additional-member profiles stay separate; switching profiles changes the selected data and never copies evidence.
- A session-only guest or a shopper who declines saving leaves no durable fit profile or measurement rows.
- Saving records the consent purpose/policy version; withdrawal blocks subsequent persistence until new affirmative consent.
- Edit increments the profile version and preserves original measurement units correctly.
- Export contains only the authenticated owner's permitted data and is deterministic enough to test.
- Profile deletion removes its dependent evidence. Account deletion removes all owned application data and prevents another login.
- Retrying export/deletion is idempotent; concurrent requests cannot partially re-create deleted data.

### Seed, recovery and quality

- A clean local reset applies every migration and produces exactly 4 shoppers, 2 operators, 2 retailers and the documented profile distribution.
- Re-running the seed does not duplicate identities, profiles, consents or memberships.
- The reset command refuses an unapproved/unknown remote project.
- Typecheck, lint, production build, migration checks, RLS tests, route tests and browser journeys pass.
- Accessibility checks cover keyboard focus, validation/error announcements and profile-switcher labels.

## External setup required after approval

1. Create one Supabase organization owned by the project lead and invite the second collaborator with the least dashboard role needed.
2. Create a hosted demo project in a US region and optionally reserve the second free project for disposable staging. Local Docker/Supabase remains the normal development database.
3. Create a Google Cloud project and OAuth web client; configure local and hosted origins/callbacks and the OAuth consent screen.
4. Add public Supabase URL/publishable key and server-only Supabase secret, Google client secret and seed/reset guard values to local and hosting secret stores.
5. Configure exact site URL/redirect allow-list. No custom SMTP, email domain or SAML connection is included in M2.

None of these accounts should be provisioned until the M2 choices are approved. Secrets and fixture passwords must never enter the public repository.

## Feasibility and limits

This M2 is feasible at $0 for six synthetic identities and two developers. Supabase's listed quotas are far above the expected data volume. Capacity is not the main risk; security and truthful product positioning are.

The free plan has no SLA, automatic backups, point-in-time recovery, configurable session timeout, SAML SSO, platform audit logs or advanced support, and it can pause after inactivity. Therefore M2 can produce a durable, tenant-isolated **portfolio/pilot account foundation**, not enterprise production readiness. A Macy's/Nordstrom deployment would still require the retailer's security review, funded resilient infrastructure, backup/restore, operational ownership, identity integration and real privacy/legal review.

## Decisions requiring user confirmation

1. **Provider:** approve Supabase Auth + Postgres for M2.
2. **Public showcase login:** approve Google OAuth as the only persistent public login in M2; guest use stays session-only and seeded credentials stay private.
3. **Retailer boundary:** approve strict retailer isolation. Cross-retailer profile sharing is deferred; “across brands” means brands available within the current retailer/showcase.
4. **Additional members:** approve adult additional-member profiles with a nickname and owner permission confirmation; child profiles, invitations and shared ownership are deferred.
5. **Deletion:** choose the public timing promise. Recommendation: remove active profile data immediately after a successful request and complete account deletion within 24 hours, without claiming backup deletion until backups exist.
6. **Export:** approve JSON export in M2. A formatted PDF/CSV is not necessary for data portability and can be added later.
7. **Operators:** approve one `retailer_admin` fixture for each fictional retailer in M2; finer roles are designed/tested when the catalog console is built.
8. **Environment ownership:** name which collaborator owns the Supabase and Google projects and which collaborator receives the second dashboard invitation.

