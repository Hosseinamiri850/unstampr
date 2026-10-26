# ADR 0001 — v1 launches free, with a daily quota instead of credits

- **Status:** accepted (v1)
- **Date:** 2026-09 (v1 launch decision), reviewed 2026-10

## Context

The product was built with a full credit/subscription stack (plans, credit ledger, ZarinPal and Bale
providers). Launching globally with paid plans would have meant regional payment rails, tax and
refund handling, and pricing decisions before the product had any traffic — all of which slow the
launch and complicate support for an audience that is mostly new.

## Decision

1. **v1 is free.** `PAYMENTS_ENABLED=false` is the default and the launch posture.
2. **The daily quota replaces credit deduction.** Each signed-in account may enqueue
   `FREE_DAILY_JOBS` (default **5**) jobs per UTC day. The counter is a Redis key per user per day,
   checked in `POST /api/jobs` before the job is queued; over-limit requests get
   `DAILY_QUOTA_EXCEEDED` (HTTP 429) with `used`/`limit`/`resetAt`.
3. **Payment code is preserved, not deleted.** Providers, plans, ledger and settlement logic stay
   in the tree, documented as dormant, so v2 is a switch rather than a rebuild.
4. **Donations are the only money path.** Buy Me a Coffee / Ko-fi / GitHub Sponsors links come from
   env vars and never gate a feature.
5. **No hourly limit.** A single daily cap keeps the UX simple and predictable.

## Consequences

- Positive: no payment provider, tax or refund surface at launch; a clear, honest free promise; one
  integer to tune abuse (`FREE_DAILY_JOBS`); the paid stack keeps its tests and stays ready.
- Negative: no revenue in v1; the quota is per account (not per IP), so multi-account abuse is
  bounded only by registration rate limits; `/pricing` is a 404 while payments are off (the navbar
  and footer hide it, and the sitemap excludes it).
- Neutral: `jobs.credits_used` remains `0` in v1 — dashboards read the quota instead.

## Activation path (v2)

1. Set `NEXT_PUBLIC_PAYMENTS_ENABLED=true` and rebuild (the flag is inlined at build time).
2. Configure a provider (`ZARINPAL_MERCHANT_ID` or the `BALE_*` block).
3. `POST /api/jobs` automatically switches from quota to credit deduction; `/pricing` and the
   purchase UI reappear; the sitemap picks the route up again.
4. Consider keeping a small free quota alongside paid plans to preserve the current entry
   experience.

See [../billing.md](../billing.md) for the credit/settlement mechanics and
[../ROADMAP.md](../ROADMAP.md) for phase status.
