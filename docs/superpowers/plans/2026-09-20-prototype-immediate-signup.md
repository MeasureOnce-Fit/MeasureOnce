# Prototype Immediate Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let prototype shoppers create and use accounts immediately without email confirmation, while preserving server-owned shopper/operator roles.

**Architecture:** Supabase Auth is configured by the project owner with Confirm email disabled. The browser stops requesting a confirmation redirect and treats a signup session as immediately usable. The protected session exchange continues to resolve the database principal server-side, where public signup can create only shopper principals and an existing operator remains rejected.

**Tech Stack:** Next.js App Router, React, Supabase Auth, TypeScript, Node test runner.

**Spec:** `docs/superpowers/specs/2026-09-20-prototype-immediate-signup-design.md`

## Global Constraints

- This is prototype-only; do not describe the policy as production-grade verification.
- Public signup creates only shoppers; no browser-supplied role is accepted.
- Keep the operator console and its development-only fixture separate from shopper flows.
- Do not add a shared account or expose credentials in shopper UI.

---

### Task 1: Accept immediate Supabase password sessions

**Files:**
- Modify: `src/app/api/showcase/session/route.ts`
- Test: `tests/retailer-identity/showcase-session.test.ts`

**Interfaces:**
- Consumes: Supabase `auth.getUser()` result with `user.id`, `user.is_anonymous`, and optional `user.email_confirmed_at`.
- Produces: the existing protected shopper session only when `resolveShowcaseShopper` returns a shopper principal.

- [x] **Step 1: Write the failing test**

Add a route test whose authenticated Supabase user has `email_confirmed_at: null`, a public showcase retailer, and no existing principal. Assert the route returns `200` and the resolved principal is created as a shopper.

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:retailer-identity`

Expected: the immediate-session test fails because the route rejects a missing `email_confirmed_at`.

- [x] **Step 3: Write minimal implementation**

Remove the `email_confirmed_at` rejection from the server-side session eligibility check. Keep rejection of missing users and anonymous users, and keep the existing server-side `resolveShowcaseShopper` call unchanged.

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test:retailer-identity`

Expected: all retailer-identity tests pass, including operator rejection.

### Task 2: Remove confirmation-only shopper UI

**Files:**
- Modify: `src/app/account/retailer-account-client.tsx`
- Modify: `src/lib/identity/signup-error.ts`
- Test: `tests/identity/signup-error.test.ts`

**Interfaces:**
- Consumes: `supabase.auth.signUp({ email, password })` and its immediate `data.session`.
- Produces: `finishSignIn()` on an immediate session and the existing safe account-error messages otherwise.

- [x] **Step 1: Write the failing test**

Add a classifier test for `email_not_confirmed` asserting the prototype configuration message: `Immediate prototype signup is not enabled yet. Turn off Confirm email in Supabase Authentication settings.`

- [x] **Step 2: Run test to verify it fails**

Run: `npm run test:identity`

Expected: the new test fails because the classifier has no immediate-signup configuration message.

- [x] **Step 3: Write minimal implementation**

Remove confirmation URL generation, resend behavior, pending-email state, and confirmation-only copy from the shopper account component. Submit signups without `emailRedirectTo`; route any immediate session through `finishSignIn()`. Add the configuration-specific `email_not_confirmed` message to the classifier.

- [x] **Step 4: Run test to verify it passes**

Run: `npm run test:identity`

Expected: all identity tests pass.

### Task 3: Document and verify the prototype setting

**Files:**
- Modify: `docs/setup/supabase-m2.md`
- Modify: `tasks/todo.md`

- [x] **Step 1: Document the exact dashboard action**

Replace the local confirmation redirect setup with the prototype instruction: Authentication → General Configuration → Confirm email off. State that this is only for the synthetic prototype and that production must restore verification.

- [x] **Step 2: Record the external verification boundary**

Record that actual signup can be tested only after the project owner saves the Supabase setting; never claim an unperformed remote configuration change.

- [x] **Step 3: Run full local verification**

Run sequentially: `npm run test:identity`, `npm run test:retailer-identity`, `npm run lint`, `npm run typecheck`, `npm run build`.

- [ ] **Step 4: Run the browser journey after the project setting changes**

Create a disposable synthetic shopper with an unused email and password, verify immediate arrival at `/fit-passport`, sign out, and sign in again. Verify the existing operator console continues to reject shopper credentials.
