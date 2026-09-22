# M2 Identity and Durable Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the simulated browser-only account with tenant-scoped Supabase authentication, durable Fit Profiles, consent controls, export/deletion, and a production-quality account workspace.

**Architecture:** Next.js route handlers and server utilities validate the live Supabase user on every protected operation. Postgres grants, composite tenant keys, and row-level security provide the final authorization boundary. A dependency-injected identity service keeps lifecycle rules testable without a live provider; the Supabase repository implements that contract for deployed environments.

**Tech Stack:** Node.js 24, Next.js 16 App Router, React 19, TypeScript 5, Supabase Auth/Postgres, `@supabase/ssr`, Zod, Node test runner, CSS Modules.

**Spec:** `docs/milestones/M2-identity-and-durable-profiles-decision-brief.md`

## Global Constraints

- Public authentication is Google OAuth; guest use remains session-only.
- Public email/password UI is excluded. Synthetic password identities are test-only and require private environment variables.
- Every durable record is tenant-scoped and owner-authorized; browser-supplied tenant or role values never grant access.
- Additional member profiles collect nickname and owner permission confirmation, without relationship, birth date, gender identity, photograph, or contact details.
- Saving requires explicit consent. Withdrawal blocks subsequent durable fit writes.
- JSON export contains only the authenticated owner's allowed data.
- Active profile deletion is immediate. Account deletion is requested and completed by the server; the public promise is within 24 hours.
- The account workspace meets WCAG 2.2 AA, supports reduced motion, and extends the existing editorial storefront with a subdued warm off-white, oatmeal, dusty-rose, cognac, and deep-plum palette; no blue, green, black-heavy surface, or bright coral is used.
- Three.js is reserved for M4's interactive garment-region visual; M2 account controls stay semantic and lightweight.
- Hosted Supabase and Google OAuth verification remains blocked until collaborators configure external projects and secrets.

---

### Task 1: Identity Domain Contract

**Files:**
- Create: `src/lib/identity/types.ts`
- Create: `src/lib/identity/validation.ts`
- Create: `tests/identity/validation.test.ts`
- Create: `tsconfig.identity-tests.json`
- Modify: `package.json`

**Interfaces:**
- Produces `FitProfile`, `ProfileDraft`, `ConsentState`, `IdentityRepository`, and Zod parsers `parseProfileDraft`, `parseProfilePatch`.

- [ ] Write tests that reject blank/overlong nicknames, an additional member without owner permission, unknown units, non-positive measurements, and unrecognized fields.
- [ ] Run `npm run test:identity` and confirm failure because the identity modules do not exist.
- [ ] Implement the minimum types and Zod schemas needed for the tests.
- [ ] Run `npm run test:identity` and confirm the validation tests pass.

### Task 2: Profile Lifecycle Service

**Files:**
- Create: `src/lib/identity/service.ts`
- Create: `tests/identity/service.test.ts`

**Interfaces:**
- Consumes `IdentityRepository`, `ProfileDraft`, and authenticated `PrincipalContext`.
- Produces `createProfile`, `updateProfile`, `withdrawConsent`, `deleteProfile`, `exportAccount`, and `deleteAccount`.

- [ ] Write failing tests for explicit consent, owner/tenant isolation, optimistic version conflicts, withdrawal blocking writes, deterministic owner-only export, idempotent profile deletion, and account deletion ordering.
- [ ] Run the focused identity suite and confirm the expected missing-service failures.
- [ ] Implement the lifecycle service using repository operations and typed domain errors.
- [ ] Run the focused suite and the existing fit tests.

### Task 3: Supabase Schema and Authorization

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/migrations/202609180001_m2_identity_profiles.sql`
- Create: `supabase/tests/m2_identity_rls.test.sql`
- Create: `scripts/check-m2-migration.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces tenant, principal, shopper-link, operator-membership, profile, evidence, consent, export-request, and deletion-request tables with least-privilege grants and RLS.

- [ ] Write a static migration-contract test that expects RLS, explicit grants, composite tenant foreign keys, owner checks, and separate policies by operation.
- [ ] Run it and confirm failure because the migration does not exist.
- [ ] Add the migration and pgTAP policy tests.
- [ ] Run the static contract test. Record `supabase test db` as unavailable until Docker exists; do not represent it as passing.

### Task 4: Supabase Session and Repository Adapters

**Files:**
- Create: `src/lib/supabase/env.ts`
- Create: `src/lib/supabase/browser.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`
- Create: `src/lib/supabase/proxy.ts`
- Create: `src/lib/identity/supabase-repository.ts`
- Create: `src/proxy.ts`
- Create: `tests/identity/env.test.ts`

**Interfaces:**
- Produces cookie-backed browser/server clients, a server-only admin client, safe session refresh, and an `IdentityRepository` adapter.

- [ ] Write failing environment tests for configured, partially configured, and absent public variables.
- [ ] Run the focused tests and confirm failure.
- [ ] Implement pinned Supabase clients following Next.js 16 proxy and cookie APIs.
- [ ] Implement the repository adapter with explicit column lists and no service-role use for shopper reads/writes.
- [ ] Run identity tests and typecheck.

### Task 5: Authentication and Rights APIs

**Files:**
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/auth/signout/route.ts`
- Create: `src/app/api/account/route.ts`
- Create: `src/app/api/account/export/route.ts`
- Create: `src/app/api/profiles/route.ts`
- Create: `src/app/api/profiles/[profileId]/route.ts`
- Create: `src/app/api/profiles/[profileId]/consent/route.ts`
- Create: `src/lib/identity/http.ts`
- Create: `tests/identity/http.test.ts`

**Interfaces:**
- Produces safe callback redirects and JSON endpoints that derive identity from the verified session.

- [ ] Write failing tests for unsafe redirects, unauthenticated responses, malformed JSON, conflict mapping, owner-only export, and idempotency keys on destructive requests.
- [ ] Run the tests and confirm the expected failures.
- [ ] Implement thin route handlers over the lifecycle service and Supabase repository.
- [ ] Run tests, lint, and typecheck.

### Task 6: Synthetic Identity Provisioning and Verification Matrix

**Files:**
- Create: `scripts/seed-m2-identities.mjs`
- Create: `scripts/verify-m2-isolation.mjs`
- Create: `docs/testing/m2-synthetic-identity-matrix.md`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Produces an idempotent private seed path for four shoppers and two operators across two fictional retailers, plus direct-API isolation checks.

- [ ] Write a dry-run test that asserts six unique identities, two retailers, a colliding external subject across tenants, and no embedded password.
- [ ] Run it and confirm failure because the seed planner does not exist.
- [ ] Implement dry-run planning and live provisioning guarded by `NODE_ENV !== "production"`, `M2_SEED_PASSWORD`, and the service-role key.
- [ ] Add the documented scenario matrix and run the dry-run checks.

### Task 7: Account Workspace and Profile Selector

**Files:**
- Create: `DESIGN.md`
- Create: `UX-CONTRACT.md`
- Create: `premium-ui.json`
- Create: `src/app/account/page.tsx`
- Create: `src/app/account/account-workspace.tsx`
- Create: `src/app/account/account.module.css`
- Create: `src/components/auth/google-sign-in-button.tsx`
- Create: `src/components/ui/confirm-dialog.tsx`
- Create: `src/components/ui/status-message.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces Google sign-in, guest continuation, explicit profile switching, self/additional-member creation, consent status, edit, JSON export, profile deletion, account deletion, and sign-out UI.

- [ ] Write component/browser assertions for accessible names, no password fields, explicit consent, profile switching, unconfigured-provider state, destructive confirmation, reduced motion, and mobile layout.
- [ ] Run the assertions and confirm the missing UI failures.
- [ ] Implement the account workspace using the existing MeasureOnce design system. Use native controls and an app-owned dialog; do not add Three.js to this task.
- [ ] Connect the storefront account action to `/account` and remove simulated credential/password behavior.
- [ ] Run browser journeys at desktop and phone widths, including keyboard, failure, empty, loading, and configured/unconfigured states.

### Task 8: Completion Audit and Evidence

**Files:**
- Create: `artifacts/evaluation/m2-verification-report.md`
- Modify: `tasks/todo.md`
- Modify: `docs/milestones/M2-identity-and-durable-profiles-decision-brief.md`

**Interfaces:**
- Produces an evidence report separating implemented, locally tested, hosted-unverified, and blocked behavior.

- [ ] Run `npm run test:identity`, `npm run test:fit`, `npm run verify:m2-schema`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Run the premium UI static audit and browser accessibility checks.
- [ ] Record the exact results, including Docker and hosted OAuth limits.
- [ ] Update milestone tracking only for evidence actually obtained.

## Self-review

- Every decision in the M2 brief maps to a task above.
- No hosted-auth or database-policy result may be called verified without a configured Supabase project or local Docker stack.
- The next-generation UI request is represented by durable design/UX contracts; Three.js remains attached to the M4 garment visualization where it serves comprehension.
- Account/profile privacy, consent, tenant isolation, and irreversible deletion have explicit server and database enforcement tasks.
