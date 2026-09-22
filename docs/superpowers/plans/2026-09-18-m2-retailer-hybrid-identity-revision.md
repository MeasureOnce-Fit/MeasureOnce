# M2 Retailer-Owned Identity Revision

**Status:** Approved product direction; implementation and verification in progress.

**Goal:** A shopper signs into one fictional multi-brand retailer. MeasureOnce receives a short-lived signed retailer assertion, maps the opaque retailer customer subject to retailer-isolated fit data, and loads the same profiles without a second shopper login.

This revision supersedes every M2 instruction that requires Google OAuth, a public MeasureOnce shopper account, retailer-password collection, or deletion of a retailer authentication account.

## Product boundary

- The retailer owns authentication, customer identity, account recovery, and the customer relationship.
- MeasureOnce never receives the shopper's retailer password or treats a browser-supplied retailer/customer ID as identity.
- MeasureOnce stores fit-specific data as the retailer's processor, isolated by retailer and opaque subject.
- The same retailer account on another device resolves to the same self and additional-member profiles.
- A different retailer account cannot see or infer those profiles.
- Guest recommendations are ephemeral and create no durable identity or fit records.
- Removing a Fit Passport deletes only retailer-scoped MeasureOnce data and the identity link; it never deletes the retailer account.
- One retailer is visible in the product. A second fictional tenant may exist only as an adversarial isolation fixture.

## Implementation sequence

1. **Correct the domain contract.** Require category on fit anchors and keep body versus known-garment measurement methods explicit.
2. **Add the retailer identity bridge.** Verify signature, issuer, audience, retailer, expiry, not-before, replay identifier, and opaque subject on the server. Assertions never appear in URLs, logs, browser storage, or exports.
3. **Add an external identity mapping.** Resolve `(retailer, issuer, subject digest)` to one MeasureOnce principal. Store a keyed digest rather than the raw subject.
4. **Create a short-lived MeasureOnce application session.** Use an HttpOnly, Secure, SameSite cookie and derive every protected request's `PrincipalContext` from the verified server session.
5. **Make writes atomic.** Replace profile plus measurement/preference/anchor children in one database transaction with optimistic version checking.
6. **Correct rights handling.** Export retailer-scoped fit data. Fit Passport deletion removes the mapping and application data but leaves the retailer session/account intact; preserve only a non-identifying operation receipt.
7. **Replace the UI contract.** Preserve the original storefront visual system. Show retailer sign-in state, first-time setup, returning auto-load, additional-member selection, consent, loading, expired session, service failure, export, and Fit Passport deletion. Label the module `Powered by MeasureOnce`.
8. **Verify the journey.** Run unit, service, schema, direct-API, browser, accessibility, mobile, and build checks. Hosted retailer/Supabase behavior stays explicitly unverified until real non-production credentials exist.

## Completion criteria

- Valid signed retailer assertion establishes a session without MeasureOnce shopper credentials.
- Invalid signature, issuer, audience, retailer, expiry, not-before, replay, and caller-supplied subject are rejected.
- Same retailer and subject reload the same profiles in a fresh browser; a different subject or tenant cannot access them.
- Consent begins unselected; refusal or withdrawal prevents durable writes while guest recommendations remain available.
- Categorized anchors and body/garment evidence round-trip; failed multi-table writes roll back completely.
- Export includes original values, units, methods, sources, and normalized values where applicable.
- Fit Passport deletion is idempotent, leaves the retailer account untouched, and cannot cascade into another tenant.
- No sensitive fit data, raw retailer subject, assertion, password, or service secret appears in localStorage, URLs, logs, source, or export.
- Desktop, phone, keyboard, reduced-motion, empty, loading, expired-session, conflict, and service-unavailable journeys are checked.

## Current evidence and blockers

- Identity domain/service, Supabase schema foundation, adapter, and synthetic fixtures exist but are not connected to product routes.
- The categorized-anchor domain mismatch is fixed and locally tested.
- The old standalone Google/email-password mock and localStorage profile remain invalid and must not be described as authentication.
- Live Supabase RLS execution is blocked because Docker and a configured non-production Supabase project are unavailable.
- A real retailer integration requires the retailer's issuer, public keys, assertion contract, allowed origins, and commercial/privacy agreement. The showcase will use a fictional signed issuer with test-only keys.
