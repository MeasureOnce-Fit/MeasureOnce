# M2 Synthetic Identity Matrix

This fixture set tests MeasureOnce's tenant and ownership boundaries without customer data. All names, retailers, subjects, and email addresses are fictional. The email domain is reserved for examples and does not receive mail.

## Fixture scope

| Fixture | Retailer | Role | External subject | Expected visible profiles | Purpose |
| --- | --- | --- | --- | ---: | --- |
| `shopper-a1` | Northstar Department Store | Shopper | `synthetic-shared-shopper-001` | 3 | Self profile plus two permitted additional-member profiles |
| `shopper-a2` | Northstar Department Store | Shopper | `synthetic-northstar-shopper-002` | 1 | Same-retailer shopper isolation |
| `operator-a` | Northstar Department Store | Retailer admin | `synthetic-northstar-operator-001` | 0 | Operator membership without shopper fit-data access |
| `shopper-b1` | Harbor & Main | Shopper | `synthetic-shared-shopper-001` | 1 | Cross-retailer subject collision |
| `shopper-b2` | Harbor & Main | Shopper | `synthetic-harbor-shopper-002` | 1 | Second-tenant shopper isolation |
| `operator-b` | Harbor & Main | Retailer admin | `synthetic-harbor-operator-001` | 0 | Second-tenant operator boundary |

`shopper-a1` has `My fit`, `Alex`, and `Morgan`. The latter two are `additional_member` profiles with owner permission recorded. The fixture intentionally stores no relationship label.

The repeated external subject is deliberate. It proves that the same retailer-supplied identifier can exist in two tenant namespaces without joining the shoppers or exposing either retailer's data.

## Automated scenarios

| Scenario | Identity | Expected result |
| --- | --- | --- |
| Owner profile visibility | Each shopper | Only profiles owned by that principal are returned |
| Same-retailer isolation | `shopper-a1` versus `shopper-a2` | Neither shopper sees the other's profiles |
| Cross-retailer collision | `shopper-a1` versus `shopper-b1` | The shared external subject does not merge data |
| Tenant boundary | Every identity | No row with the other retailer ID is returned |
| Operator boundary | `operator-a`, `operator-b` | Own admin membership is visible; shopper profiles remain hidden |
| Principal boundary | Every identity | Exactly one principal row, belonging to the authenticated user, is visible |

The live verifier signs in through the anonymous client with each private test credential. It never uses the service-role key for reads, so results exercise the authenticated database policies. The service-role key is limited to the explicit seed command.

## Commands

Dry runs are the default and need no network or secrets:

```powershell
node scripts/seed-m2-identities.mjs
node scripts/verify-m2-isolation.mjs
node --test --test-isolation=none tests/identity/seed-plan.test.mjs
```

Live mode is only for a local or dedicated non-production Supabase project after the M2 migration is applied. Supply secrets through a private environment; do not put them in command history, source files, screenshots, or issue comments.

Required for seeding:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `M2_SEED_PASSWORD`

Required for verification:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `M2_SEED_PASSWORD`

Then run:

```powershell
node scripts/seed-m2-identities.mjs --live
node scripts/verify-m2-isolation.mjs --live
```

Both live commands stop when `NODE_ENV=production`. The seed is idempotent for deterministic retailer, principal, membership, and profile IDs. Consent insertion is also de-duplicated by fixture version. Authentication users are reused by email.

## Interpretation and limits

- A passing unit test proves fixture cardinality, collision coverage, additional-member structure, and absence of embedded credentials in the dry-run payload.
- A passing dry-run verifier proves the planned expectations are internally consistent. It does not execute authentication or row-level security.
- A passing live verifier proves the six synthetic authenticated sessions saw the expected rows through the current Supabase policies.
- These fixtures do not measure fit accuracy, user preference, conversion, return reduction, production load, or hosted OAuth behavior.
- No external accounts are created by running the tests or either dry-run command.
