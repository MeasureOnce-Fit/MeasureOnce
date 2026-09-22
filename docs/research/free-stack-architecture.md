# MeasureOnce free-only technical architecture

**Research date:** September 17, 2026  
**Scope:** A US-facing, multi-brand fashion-fit portfolio product built with the existing Next.js application. This is a credible public pilot and evaluation environment, not an enterprise production architecture for Macy's or Nordstrom.

## Decision

Use this smallest credible stack:

| Need | Choice | Why it is the minimum credible choice |
|---|---|---|
| Web application and server rendering | **Netlify Free** | It supports current Next.js App Router, SSR, ISR, React Server Components, Server Actions, route handlers, middleware, streaming, and image optimization through its OpenNext adapter without a platform migration. [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/) |
| Database, authentication, user-owned fit data, and optional object storage | **Supabase Free**, in `us-east-1` | One service supplies managed Postgres, Auth, Row Level Security, Storage, and Edge Functions. Supabase exposes exact US regions, including North Virginia and Ohio. [Available regions](https://supabase.com/docs/guides/platform/regions) |
| Authentication at $0 | **Google OAuth through Supabase**, plus an anonymous/demo path | Social login avoids the production-email limitation of Supabase's shared SMTP. Supabase supports social login and ties JWTs to Postgres RLS. [Supabase Auth](https://supabase.com/docs/guides/auth) |
| Product analytics, feature flags, experiments, session replay, and initial error monitoring | **PostHog Cloud Free** | One SDK covers the AI Product Manager evidence layer and replaces several overlapping vendors during the pilot. The free account is cardless and stops at its free limits. [PostHog pricing](https://posthog.com/pricing) |
| CI/CD and evaluation gates | **GitHub Actions in the public repository** | Standard GitHub-hosted runners are free for public repositories, which matches the requested public portfolio repository. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions) |
| Fit-model development and evaluation | **Local Python pipeline** using `uv`, NumPy, pandas, scikit-learn, SciPy, pytest, and Matplotlib/Seaborn | Training and evaluation run locally or in GitHub Actions. No hosted-model or inference API is needed. `uv.lock` gives a reproducible environment. [uv project guide](https://docs.astral.sh/uv/guides/projects/) |
| Transactional email, only after a domain exists | **Resend Free via Supabase custom SMTP** | It is optional for the first $0 release. Its free allowance is sufficient for a small pilot, but sending to arbitrary shoppers requires control of a real domain. [Resend pricing](https://resend.com/pricing), [Supabase SMTP requirements](https://supabase.com/docs/guides/auth/auth-smtp) |

This architecture keeps the online recommendation path deterministic and lightweight. The expensive work—synthetic-data generation, model comparison, calibration, and slice analysis—runs offline. The deployed app reads versioned parameters and catalog measurements from Postgres and produces a recommendation through a small server function or database RPC.

## Why Netlify Free is the hosting choice

Vercel Hobby is technically convenient, but it is the wrong plan for a product intended to be pitched commercially. Vercel's current Terms of Service say Hobby may only be used for personal or non-commercial use, and its fair-use guidance says commercial deployments require Pro or Enterprise. [Vercel Terms of Service, updated June 1, 2026](https://vercel.com/legal/terms), [Vercel fair-use guidance](https://vercel.com/docs/limits/fair-use-guidelines)

Netlify's official Free-plan announcement explicitly permits commercial projects, and the current pricing page describes the Free plan as a hard-limited $0 plan. [Netlify Free announcement](https://www.netlify.com/blog/introducing-netlify-free-plan/), [Netlify pricing](https://www.netlify.com/pricing/)

For a new credit-based Netlify account, the current Free limit is **300 credits per month**. The current rates are:

- **15 credits** for each production deploy; deploy previews and branch deploys are free.
- **10 credits per GB-hour** of compute.
- **20 credits per GB** of bandwidth.
- **2 credits per 10,000 web requests**.
- Form submissions are free.

These rates mean that 20 production deploys alone consume the full 300-credit allowance. The practical policy is to deploy production only from tagged or approved main-branch releases, use free deploy previews during development, statically render catalog pages where possible, and keep product images compressed. The Free plan has a hard monthly limit: it does not incur overage charges, and all projects on the account pause when the account runs out of credits. [How Netlify credits work](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/), [Netlify pricing FAQ](https://www.netlify.com/pricing/)

Netlify Functions on the credit plans default to **1 GB memory**. The standard limits are **60 seconds synchronous**, **30 seconds scheduled**, **15 minutes background**, **6 MB buffered payload**, and **20 MB streamed response**. Heavy model training and bulk image processing therefore do not belong in a request-time function. [Function configuration](https://docs.netlify.com/build/functions/configuration/), [Functions usage and billing](https://docs.netlify.com/build/functions/usage-and-billing/)

### Netlify constraints that must appear in the PRD

- Free is suitable for a portfolio and small pilot, not an uptime commitment. The Free Usage Tier has no service-level commitment and Netlify may suspend a free project. [Netlify Self-Serve Subscription Agreement](https://www.netlify.com/legal/self-serve-subscription-agreement/)
- The credit pool is account-wide. One traffic spike or a large-image catalog can pause every site on that account until the next cycle.
- Free/Personal allows one team owner. Reviewers can be invited, but operational collaboration and stronger role controls are paid-plan concerns. [Netlify pricing](https://www.netlify.com/pricing/)
- A custom domain is supported, but buying the domain is not free. Use the generated `*.netlify.app` URL for a strict $0 portfolio release.

## Supabase Free limits and design

As of the research date, Supabase Free includes:

- **Two active free projects**.
- **500 MB Postgres database size per project**, shared CPU, and 500 MB RAM.
- **50,000 monthly active Auth users** and 50,000 monthly active third-party users.
- **5 GB uncached egress** and **5 GB cached egress**.
- **1 GB object storage**, a 50 MB maximum file upload, and basic CDN; image transformations are unavailable.
- **500,000 Edge Function invocations**.
- **2 million Realtime messages** and **200 peak Realtime connections**.
- One day of API/database log retention.
- No downloadable automatic backups, point-in-time recovery, uptime SLA, custom domains, log drains, or metrics endpoint.
- Free projects may pause after one week of low activity and can be restored from the dashboard.

[Supabase pricing](https://supabase.com/pricing), [Supabase billing documentation](https://supabase.com/docs/guides/platform/billing-on-supabase), [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

Edge Functions have **256 MB memory**, a **150-second wall-clock limit** on Free, a **2-second CPU-time limit per request**, a **150-second idle timeout**, and a maximum of **100 functions per free project**. This is enough for webhooks, account export/delete orchestration, and privileged recommendation writes, but not model training. [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)

Choose the specific **East US (North Virginia), `us-east-1`** region for the US pilot, and state that region choice controls primary data location but is not proof of regulatory compliance. [Supabase regions](https://supabase.com/docs/guides/platform/regions)

### Database boundary

The browser may read public catalog data and the signed-in shopper's own profile through Supabase's Data API. Every exposed table must use explicit grants and Row Level Security. Supabase warns that a table in an exposed schema without RLS is accessible to any role that holds a grant, and recommends using both grants and RLS for every exposed object. [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Securing the Data API](https://supabase.com/docs/guides/api/securing-your-api)

Recommended tables:

- `retailers`, `brands`, `products`, `product_variants`
- `garment_measurements`, `measurement_sources`, `size_chart_versions`
- `profiles`, `fit_passports`, `fit_anchors`, `region_fit_feedback`
- `recommendations`, `recommendation_explanations`, `model_versions`
- `orders`, `returns`, `return_reasons` for synthetic evaluation and future pilot events
- `consent_events`, `data_export_requests`, `deletion_requests`
- `experiment_assignments`, while PostHog stores behavioral events rather than canonical transactional state

Public catalog tables get read-only `anon` access. Fit profiles, fit anchors, recommendation history, and consent records use owner-only policies keyed by `auth.uid()`. The Supabase secret/service key stays only in Netlify Functions or Supabase Edge Functions because it bypasses RLS. [Supabase user-management guidance](https://supabase.com/docs/guides/auth/managing-user-data)

### Object storage

Keep the 600 portfolio catalog images in the public Git repository and serve them through Netlify's CDN, as requested. Do not duplicate them in Supabase Storage. Reserve the 1 GB Supabase allowance for future shopper-owned uploads, and do not add reference-garment image upload to the initial Fit Passport; selecting a known catalog item is simpler, safer, and cheaper.

If uploads are later enabled, restrict file type and size, strip metadata, use a private bucket, and create owner-only Storage policies. The current 50 MB Supabase per-file ceiling is far above the product need, so set an application limit such as 5 MB.

## Authentication without a paid domain

The strict $0 route is:

1. Offer **Continue with Google** through Supabase social Auth for persistent shoppers.
2. Offer **Try the fit demo** using a seeded demo identity or Supabase anonymous sign-in for recruiters who do not want to create an account. Supabase specifically lists e-commerce carts and full-feature demos as anonymous-user use cases. [Supabase users and anonymous users](https://supabase.com/docs/guides/auth/users)
3. Persist the Fit Passport only for a permanent signed-in identity; make anonymous/demo persistence explicitly temporary.
4. Add email/password and password-reset email only after a sending domain is available.

Supabase's default SMTP is not a production email service. It only sends to pre-authorized organization addresses, is currently limited to two messages per hour, and has no delivery SLA. New free-tier projects using the shared provider also cannot customize the default email templates. [Supabase custom SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp), [June 2026 email-template change](https://supabase.com/changelog/46599-changes-to-email-template-customisation-on-free-tier)

If the team already owns a domain, Resend Free can be connected through Supabase custom SMTP. The current Resend allowance is **3,000 emails per month**, **100 per day**, **three domains**, one webhook endpoint, and 30-day data retention. Overage is available only to paid subscriptions. [Resend pricing](https://resend.com/pricing), [Resend SMTP](https://resend.com/changelog/smtp-service)

The hidden non-free dependency is the domain itself. Sending branded mail to arbitrary users requires DNS control and domain verification. Therefore, a strict $0 PRD must use social login and a demo path; it must not promise production email signup.

## Analytics, feature flags, experiments, and monitoring

Use one PostHog Cloud Free project in the US region. The current cardless free tier includes, per month:

- **1 million product-analytics events**
- **5,000 session recordings**
- **1 million feature-flag requests**; experiments consume the feature-flag allowance
- **100,000 error exceptions**
- **1,500 survey responses**
- **10 GB logs ingested**
- **One project**, unlimited team members, and one-year data retention

When no card is attached, usage stops at the free-tier limits, preventing surprise charges. [PostHog pricing](https://posthog.com/pricing)

This single service should capture the evidence an AI Product Manager portfolio needs:

- `fit_passport_prompt_viewed`, `fit_passport_started`, `fit_passport_completed`, `fit_passport_skipped`
- question-level drop-off and completion time
- `recommendation_requested`, `recommendation_served`, `recommendation_abstained`
- recommended size, confidence band, category, brand, model version, and evidence availability
- `size_selected`, `add_to_bag`, `checkout_demo_completed`
- explicit feedback such as waist/length/sleeve/chest/hip outcomes
- experiment assignment for onboarding timing and copy

Do not send raw measurements, free-text notes, email addresses, names, or reference-garment images to analytics. Use an opaque application user ID and coarse, pre-approved properties.

For initial operations, combine PostHog error tracking with Netlify's built-in short-retention function observability. This is enough for a portfolio pilot and keeps the stack small. If separate error tooling becomes necessary, Sentry Developer is $0 for one user and currently includes 5,000 errors, 5 GB logs, 5 million spans, 50 replays, one uptime monitor, one cron monitor, 1 GB attachments, and a 30-day lookback. [Sentry pricing](https://sentry.io/pricing/)

## CI/CD and public-repository constraints

Use GitHub Actions for pull-request checks and deploy only after a merge or release tag. Standard GitHub-hosted runners are free for public repositories. For private repositories on GitHub Free, the allowance is **2,000 minutes per month**, **500 MB artifact storage**, and **10 GB cache per repository**; without a valid payment method, usage is blocked after the quota. [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

The public-repository pipeline should run:

1. TypeScript type checking, lint, and unit tests.
2. Next.js production build.
3. Database migration and RLS-policy tests against local Supabase.
4. Python evaluation smoke test on a fixed seed.
5. Full offline evaluation when catalog measurements, model logic, thresholds, or synthetic-data configuration change.
6. Upload only compact JSON/CSV/HTML evaluation summaries as artifacts; keep generated raw datasets reproducible from a seed rather than committing large copies.
7. Block the merge when a protected metric regresses beyond an explicitly versioned threshold.

Secrets must stay in GitHub/Netlify/Supabase secret stores. The repository can be public; environment files, service keys, OAuth secrets, and raw user data cannot be committed.

## Local and offline evaluation pipeline

Keep evaluation out of request-time infrastructure. A small `evaluation/` Python package should use a committed `pyproject.toml`, `.python-version`, and `uv.lock`. The uv documentation describes the lockfile as cross-platform, human-readable, and intended for version control so installations stay reproducible. [uv projects](https://docs.astral.sh/uv/guides/projects/)

Recommended command surface:

```text
uv run python -m measureonce_eval.generate --seed 20260917
uv run python -m measureonce_eval.evaluate --config evaluation/config/baseline.yaml
uv run python -m measureonce_eval.report --run-id <id>
uv run pytest
```

Run three systems against the same versioned synthetic test set:

1. **Retailer baseline:** select the brand's nominal size chart result.
2. **Corrected dimensional model:** apply measured garment dimensions and learned brand/category offsets.
3. **Combined model:** dimensional score plus eligible keep/return feedback, calibrated confidence, and an explicit abstention threshold.

Evaluate every mock category, with results stratified by category family, gender presentation, brand, body-region issue, available evidence, and cold-start state. Minimum output:

- exact-size accuracy and within-one-size accuracy
- top-2 accuracy where a ranked alternative is shown
- coverage and abstention rate
- selective risk/accuracy at confidence thresholds
- calibration curve, expected calibration error, Brier score, and log loss
- per-slice sample count and confidence intervals
- offset recovery mean absolute error for injected brand/category measurement noise
- counterfactual tests that change one body-region preference while holding all other inputs fixed
- latency for online scoring and deterministic replay against the saved model version

Scikit-learn supplies top-k accuracy and other classification metrics. Its calibration guide explains that a calibrated confidence near 0.8 should be correct about 80% of the time and recommends reliability diagrams plus proper scores such as Brier loss and log loss. [scikit-learn metrics](https://scikit-learn.org/stable/api/sklearn.metrics.html), [scikit-learn probability calibration](https://scikit-learn.org/stable/modules/calibration.html)

Store each run's configuration, Git commit, random seed, input-data hash, model version, thresholds, aggregate metrics, slice metrics, and plots under `evaluation/results/<run-id>/`. Publish the latest compact report inside the application as an Evaluation page. Label all offline outcomes **synthetic**. Do not translate them into a claim about real-world return reduction; a retailer pilot and controlled experiment are required for that claim.

## Runtime request flow

```text
Browser
  -> Netlify Next.js application
     -> Supabase Auth (Google OAuth / anonymous demo)
     -> Supabase Data API with RLS (catalog + shopper-owned profile)
     -> recommendation route/RPC
        -> reads versioned garment measurements + model parameters
        -> returns size, confidence band, explanation, or ABSTAIN
     -> PostHog (consented behavioral events, flags, experiment assignment, errors)

Offline Python evaluation
  -> synthetic shoppers, garments, orders, returns, and injected offsets
  -> baseline/corrected/combined comparisons
  -> versioned JSON/CSV/plots
  -> GitHub Actions quality gate
  -> approved model parameters copied to Supabase
```

The live path performs scoring only. It never trains. A recommendation response should include `model_version`, `size`, `confidence_band`, `reason_codes`, `evidence_used`, and `abstain_reason` when applicable. This makes the result inspectable in the demo and traceable in evaluation.

## Zero-dollar operating budget

| Service | Monthly cash cost for the portfolio release | Card or billing risk | Limit that matters first |
|---|---:|---|---|
| Netlify Free | $0 | Hard limit; Free cannot auto-recharge | 300 credits; image bandwidth and production deploys will dominate |
| Supabase Free | $0 | Paid plans require a card; remain on Free | 500 MB database, 1 GB storage, 5 GB egress, one-week inactivity pause |
| PostHog Cloud Free | $0 | No card required; usage stops at limit | One project; 1M events and 5K replays/month |
| GitHub public repo + Actions | $0 | Standard public runners are free | Artifact retention/size discipline; avoid larger runners |
| Python evaluation | $0 | Runs locally or on public-repo Actions | CI time and artifact size |
| Resend Free | $0 service fee | Optional; a usable sending domain has a separate real-world cost | 3,000/month and 100/day |
| Custom domain | Not $0 unless already owned | Separate registrar purchase/renewal | Use `*.netlify.app` for strict $0 |

## What “market ready” means at this stage

The stack is credible for a public portfolio, user testing, a recruiter walkthrough, and a small invited retailer discovery pilot. It demonstrates real authentication, persisted Fit Passports, multi-brand data, a working recommendation API, instrumentation, controlled experiments, offline evaluation, confidence calibration, and abstention.

It is not enough for a Macy's or Nordstrom production deployment. Before enterprise traffic or real customer data, the plan must fund and add:

- hosting and database SLAs, backups, point-in-time recovery, longer logs, incident response, and support
- enterprise identity, access reviews, audit logs, and secret rotation
- privacy/legal review, data-retention enforcement, verified export/deletion workflows, and vendor DPAs
- penetration testing, load testing, disaster-recovery testing, and a retailer security assessment
- production email/domain infrastructure
- real catalog, inventory, order, return, and identity integrations
- an online experiment with pre-registered success and guardrail metrics

The portfolio should call the current result a **pilot-ready, end-to-end product demonstration**. Calling a free-tier system “enterprise production ready” would overstate the evidence and the infrastructure.

## Recommended implementation order

1. **Foundation:** Deploy the existing Next.js app to Netlify Free, create one Supabase Free project in `us-east-1`, add migrations, RLS tests, Google OAuth, and anonymous demo mode.
2. **Multi-brand catalog:** Keep public product images in the repository; move structured catalog, variants, size charts, garment measurements, and provenance into Postgres.
3. **Fit Passport:** Persist a short, optional, progressive profile tied to the retailer account. Store category-family anchors and region-level fit feedback.
4. **Recommendation API:** Implement the deterministic dimensional baseline, versioned parameters, confidence bands, explanations, and ABSTAIN.
5. **Evaluation:** Build the local seeded Python benchmark for every catalog category; compare baseline, corrected, and combined systems; publish the synthetic evaluation report.
6. **AI PM evidence:** Add PostHog events, flags, onboarding experiments, a funnel dashboard, and a model/evaluation dashboard.
7. **Pilot hardening:** Add consent history, data export/delete, error monitoring, abuse controls, rate limits, and documented free-tier failure behavior.

## Decisions to carry into the PRD

- **Target geography:** United States; Supabase primary region `us-east-1`.
- **Customer archetype:** a Macy's/Nordstrom-style multi-brand department-store retailer; no partnership claim.
- **Deployment claim:** pilot-ready portfolio product, not enterprise production.
- **Hosting:** Netlify Free, because Vercel Hobby's non-commercial restriction conflicts with the pitch goal.
- **Authentication:** Google OAuth plus anonymous/demo at strict $0; branded email auth waits for a domain and custom SMTP.
- **Storage:** catalog images stay in the public repository; Supabase Storage is reserved for future private shopper uploads.
- **Model operations:** offline/local Python evaluation; lightweight versioned online scoring; no paid hosted LLM dependency.
- **Measurement:** every clothing category in the mock is supported and evaluated, with per-category minimum sample counts and explicit abstention when evidence is insufficient.
- **Analytics:** PostHog is the event, flag, experiment, replay, and initial error platform. Do not send fit measurements or direct identifiers to it.
- **Truthfulness:** synthetic evaluation can prove algorithm behavior under controlled assumptions; it cannot prove real return-rate reduction or retailer revenue lift.

