# Prototype immediate-signup design

## Purpose

Let prototype visitors create a shopper account with any email and password, then sign in immediately without confirming an email. This is a demo-only convenience, not a production authentication policy.

## Scope

- Hosted Supabase Auth has **Confirm email** disabled by the project owner in the dashboard.
- Shopper signup no longer sends `emailRedirectTo`, shows an email-confirmation state, or offers resend confirmation.
- The server accepts a valid Supabase password session without requiring `email_confirmed_at`.
- A public signup can resolve only to a `shopper` principal. Existing operators remain operators and public signup cannot promote them.
- The existing synthetic operator console remains separate. Its local demo operator fixture stays development-only and is not displayed to shoppers.

## Explicit non-goals

- No shared shopper account, exposed password, auto-generated credentials, or public admin account.
- No changes to private tables, role assignment, RLS, catalog operations, or payment flows.
- No claim that this is production-grade account verification.

## Flow

1. Visitor submits any syntactically valid email, a password, and its confirmation.
2. Supabase creates an immediately confirmed session because the project-level Confirm email setting is disabled.
3. The browser exchanges that session for the existing protected application session.
4. The server resolves an existing shopper or creates a shopper principal when the public-showcase gate permits it; it rejects any existing operator.
5. The visitor lands on the requested Fit Passport or storefront route.

## Error handling

- Weak-password, duplicate-email, rate-limit, and service failures retain actionable but non-sensitive messages.
- Email-confirmation/redirect guidance is removed from the shopper path because confirmation is intentionally disabled for this prototype.
- If the project setting is not updated, the app reports that immediate prototype signup has not been enabled rather than telling the visitor to check email.

## Verification

- Unit-test immediate-session eligibility and the no-confirmation account-message behavior.
- Run identity tests, lint, typecheck, and sequential production build.
- In the browser: create a new disposable account, reach Fit Passport immediately, sign out, and sign in again. Verify an operator account remains unable to obtain shopper access.

## Security boundary

The Supabase dashboard setting is a project-owner action. The implementation preserves server-owned role resolution and the existing operator guard; it does not trust a browser-provided role.
