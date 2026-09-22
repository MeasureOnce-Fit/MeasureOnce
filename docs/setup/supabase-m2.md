# M2 hosted Supabase setup

This runbook creates the free development backend used for MeasureOnce Fit Passport persistence. It is for synthetic portfolio data only.

## Hosted project

1. Create one Supabase Free project named `measureonce-dev` in a United States region.
2. Keep the generated database password in the account password manager. Do not commit it.
3. From the project Connect dialog, copy the project URL and publishable key.
4. From Settings → API Keys, use a server-only secret key. Do not expose it to browser code, chat, screenshots or source control.
5. In Integrations → Data API → Settings, expose the `private` schema and only these server functions: `consume_retailer_assertion_replay`, `create_fit_profile_snapshot`, `delete_retailer_fit_passport`, `replace_fit_profile_snapshot`, and `resolve_or_create_retailer_principal`. Keep private tables unexposed.

Supabase currently recommends publishable keys for public clients and secret keys for controlled server code. The older `anon` and `service_role` values are accepted by the migration scripts only as temporary compatibility aliases.

## Local private environment

Create `.env.local` with these values. The file is already excluded by `.gitignore`.

```text
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME
SUPABASE_URL=https://PROJECT_REF.supabase.co
SUPABASE_SECRET_KEY=sb_secret_REPLACE_ME
SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME

RETAILER_IDENTITY_RETAILER_ID=20000000-0000-4000-8000-000000000001
RETAILER_IDENTITY_ISSUER=https://identity.measureonce.local
RETAILER_IDENTITY_AUDIENCE=measureonce-fit-passport
RETAILER_IDENTITY_ALGORITHM=RS256
RETAILER_IDENTITY_PUBLIC_KEY_PEM="REPLACE_WITH_PUBLIC_KEY"
RETAILER_IDENTITY_SUBJECT_HMAC_SECRET=REPLACE_WITH_AT_LEAST_32_RANDOM_BYTES
RETAILER_IDENTITY_SESSION_SECRET=REPLACE_WITH_AT_LEAST_32_RANDOM_BYTES
RETAILER_IDENTITY_ASSERTION_MAX_AGE_SECONDS=300
RETAILER_IDENTITY_SESSION_TTL_SECONDS=900

M2_SEED_PASSWORD=REPLACE_WITH_A_STRONG_SYNTHETIC_TEST_PASSWORD
```

The showcase sign-in uses Supabase Auth for the retailer shopping account and then exchanges that verified account session for the same protected MeasureOnce application session used by external retailer assertions. Fit Passport never receives or stores the password.

## Prototype immediate signup

For this synthetic prototype only, go to **Authentication → General Configuration** and turn **Confirm email** off. The shopper account page then creates a session immediately; it does not use confirmation-email redirects or a mail sender. Keep **Allow new users to sign up** on.

This is intentionally not production authentication. Before using a real customer environment, turn **Confirm email** back on, configure a production Site URL and allowed redirect URLs, and configure a transactional SMTP provider.

## Migrations and verification

```powershell
npx supabase login
npx supabase link --project-ref PROJECT_REF
npx supabase db push --dry-run
npx supabase db push
npm run seed:m2
npm run verify:m2-live
npm run dev
npm run verify:m2-journey
```

Run `supabase test db` only when Docker is available. Until that passes, the repository's migration contract is static verification and the hosted tenant-isolation script is the live behavioral check.

`verify:m2-journey` signs into two reserved synthetic retailer accounts without printing their password, exchanges each account session for a protected MeasureOnce session, verifies isolated profile lists, and exercises create, rename, export and delete for a temporary additional-member profile.

## Free-plan boundary

The portfolio dataset fits well inside the free allowance. Free projects can pause after one week of inactivity and do not include automatic database backups, so this environment is a development demonstration rather than the startup's production service.

Official references:

- https://supabase.com/docs/guides/getting-started/api-keys
- https://supabase.com/docs/guides/deployment/database-migrations
- https://supabase.com/docs/guides/local-development/cli-workflows
- https://supabase.com/pricing
