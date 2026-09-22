# M5 operator catalog console

## Goal

Turn the approved catalog-coverage mock into a protected, working console for a fictional retailer operator. It must show only that operator's tenant catalog, let the server perform the existing reviewed-coverage update, and retain the private-table boundary.

## Plan

1. Add a service-role-only, retailer-scoped coverage RPC. It returns product summary and measurement counts, never raw catalog table access to a browser.
2. Add a server-only operator authorization helper. It authenticates the Supabase user, resolves an active `retailer_admin` membership through the admin client, and derives the retailer ID server-side. No route accepts a retailer ID from the browser.
3. Add protected read/review routes. The review route validates a product ID, coverage status and allowlisted synthetic fit reference before invoking the existing service-role review RPC.
4. Add `/retailer-console` with the approved warm editorial console direction, Supabase operator sign-in, loading/error/empty states, coverage summary and clear separation from shopper checkout.
5. Add focused authorization/request validation tests; run catalog, identity, lint, typecheck, build, and browser checks for the existing retailer shopper surface.

## Completion evidence

- A non-authenticated request cannot read the catalog; an operator resolves only their active retailer membership.
- The server never trusts a browser retailer ID or raw table access.
- The console uses the applied `private` RPCs only, and shopper browsing remains functional if the console is unavailable.
- The route renders at desktop and mobile sizes, preserves MeasureOnce tokens, and passes the project checks.
