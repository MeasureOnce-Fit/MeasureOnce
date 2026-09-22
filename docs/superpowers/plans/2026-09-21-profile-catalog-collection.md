# Profile Catalog Collection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every Fit Passport profile a catalog collection preference that controls its known-size choices without storing gender identity.

**Architecture:** Persist `catalogCollection` on `fit_profiles` as `women`, `men`, or `both`. The identity boundary validates and returns it; the Fit Passport uses it to constrain the known-size category and brand controls. Existing profiles become `both`, preserving their saved evidence and requiring a collection choice only for new known-size entries.

**Tech Stack:** Next.js, TypeScript, Zod, Supabase/PostgreSQL, Node test runner.

**Spec:** `docs/research/profile-collection-research.md`

## Global Constraints

- Store a catalog-routing preference, not gender identity.
- Preserve existing profiles, anchors, consent, owner isolation, and optimistic versions.
- Keep the unknown-brand path context-only; never infer measurements from a label.
- Use a forward-only, versioned Supabase migration; do not alter the remote database through the SQL editor.

---

### Task 1: Profile collection contract and migration

**Files:** `src/lib/identity/types.ts`, `src/lib/identity/validation.ts`, `supabase/migrations/202609210010_profile_catalog_collection.sql`, `tests/identity/validation.test.ts`.

- [ ] Write failing tests for valid `women`, `men`, `both`, and invalid/missing values.
- [ ] Add `CatalogCollection` and make it required in new profile drafts and optional in profile patches.
- [ ] Add a migration that appends nullable `catalog_collection`, backfills `both`, adds the check constraint, makes it non-null, and replaces snapshot RPCs with the extra parameter.
- [ ] Run identity tests and the migration structure check.

### Task 2: Repository and service propagation

**Files:** `src/lib/identity/service.ts`, `src/lib/identity/supabase-repository.ts`, `tests/identity/service.test.ts`, `tests/identity/supabase-repository.test.ts`.

- [ ] Write failing repository/service tests proving create, update, read, and export retain the collection; unknown values are rejected before persistence.
- [ ] Add the selected column and RPC parameters, hydrate it, and preserve it when a patch omits it.
- [ ] Run identity and repository tests.

### Task 3: Fit Passport profile and known-size UI

**Files:** `src/app/fit-passport/fit-passport-client.tsx`, `tests/identity/*`.

- [ ] Add labelled collection controls to profile creation and editing.
- [ ] Constrain clothing types and catalog brands by the selected profile collection; `both` requires a per-entry collection choice before clothing type.
- [ ] Reset dependent form fields on a collection change and retain existing saved evidence unchanged.
- [ ] Run typecheck and browser journey for a shared account with differently configured profiles.

### Task 4: Regression gate

- [ ] Run identity, repository, fit, lint, typecheck and production build checks.
- [ ] Rebuild/restart the local server and confirm the UI shows the filtered known-size path.
