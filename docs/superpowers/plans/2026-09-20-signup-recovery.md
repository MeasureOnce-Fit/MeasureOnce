# Signup recovery plan (superseded)

> Execute inline: the user asked to make the necessary changes.

**Status:** Superseded by `2026-09-20-prototype-immediate-signup.md` after the product owner chose immediate prototype signup without email confirmation.

**Cause established:** the hosted auth project permits signup but has neither a Site URL nor an allowlisted callback URL. The local project has no Supabase management access token, so that remote setting cannot be safely mutated from this workspace.

## Steps

1. Add a focused, pure error classifier and a failing unit test for an auth redirect rejection.
2. Use it in the signup and resend paths, with an honest message that identifies the required configuration without exposing secrets.
3. Add the local callback URL to the documented Supabase setup instructions and retain the current confirmation behavior.
4. Run the focused identity tests, lint, typecheck, sequential production build, and browser UI check.

## Completion criteria

- A rejected confirmation redirect never produces the generic “try again” message.
- The message tells the operator exactly which redirect URL must be allowlisted.
- Existing weak-password, rate-limit, and normal signup behavior remain intact.
- The documented setting and a relevant automated test are present.
